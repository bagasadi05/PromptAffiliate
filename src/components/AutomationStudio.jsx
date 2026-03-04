import { useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeProductByImage,
  generateGrokImagineVideo,
  generateGrokVideoPrompt,
  generatePrompt,
  generateTitles,
} from '../services/gemini';
import { DEFAULT_OPTIONS } from '../constants/defaultOptions';
import { fileToBase64 } from '../utils/fileToBase64';
import { compressImage } from '../utils/imageCompression';
import { showToast } from '../lib/toastBus';
import { useI18n } from '../hooks/useI18n';

const STEP_ORDER = ['prompt', 'grokPrompt', 'video', 'analysis', 'titles'];

function makeSteps(renderVideo, t) {
  return {
    prompt: { label: t('automationStepPrompt'), status: 'idle', message: '' },
    grokPrompt: { label: t('automationStepGrokPrompt'), status: 'idle', message: '' },
    video: { label: t('automationStepVideo'), status: renderVideo ? 'idle' : 'skipped', message: renderVideo ? '' : t('automationSkippedBySettings') },
    analysis: { label: t('automationStepAnalysis'), status: 'idle', message: '' },
    titles: { label: t('automationStepTitles'), status: 'idle', message: '' },
  };
}

const DEFAULT_FORM = {
  sceneCount: 4,
  titleCount: 10,
  titleTone: 'viral',
  renderVideo: true,
  targetDuration: 6,
  aspectRatio: '9:16',
  resolution: '720p',
  motionStyle: 'fluid, natural, cinematic motion with precise physics',
  customInstructions: '',
  subjectDescription: '',
  titleCustomInstructions: '',
};

export default function AutomationStudio({ presets = [], initialPreset = null, initialPromptOptions = null }) {
  const { lang, t } = useI18n();
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    sceneCount: Number(initialPromptOptions?.sceneCount) || DEFAULT_FORM.sceneCount,
    targetDuration: Number(initialPromptOptions?.targetDuration) || DEFAULT_FORM.targetDuration,
    customInstructions: initialPromptOptions?.customInstructions || DEFAULT_FORM.customInstructions,
    subjectDescription: initialPromptOptions?.subjectDescription || DEFAULT_FORM.subjectDescription,
    aspectRatio: initialPromptOptions?.aspectRatio || DEFAULT_FORM.aspectRatio,
  }));
  const [selectedPresetId, setSelectedPresetId] = useState(() => initialPreset?.id || presets[0]?.id || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');
  const [steps, setSteps] = useState(() => makeSteps(true, t));
  const [results, setResults] = useState({
    promptText: '',
    grokPromptText: '',
    video: null,
    productAnalysis: null,
    titles: [],
    titlesText: '',
  });
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedPreset = useMemo(
    () => presets.find((item) => item.id === selectedPresetId) || null,
    [presets, selectedPresetId],
  );

  useEffect(() => {
    if (!presets.length) return;
    if (!presets.some((p) => p.id === selectedPresetId)) {
      setSelectedPresetId(initialPreset?.id || presets[0]?.id || '');
    }
  }, [presets, selectedPresetId, initialPreset]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const updateStep = (key, patch) => {
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectImage = async (file) => {
    if (!file) return;
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      showToast(t('uploadFormatError'), 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('uploadSizeError'), 'error');
      return;
    }
    let processed = file;
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.86 });
      processed = compressed.file;
    } catch {
      processed = file;
    }
    setImageFile(processed);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(processed);
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) void handleSelectImage(file);
    event.target.value = '';
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  };

  const resetResults = () => {
    setResults({
      promptText: '',
      grokPromptText: '',
      video: null,
      productAnalysis: null,
      titles: [],
      titlesText: '',
    });
  };

  const handleRunAutomation = async () => {
    if (!imageFile) {
      showToast(t('automationImageRequired'), 'warning');
      return;
    }
    if (!selectedPreset) {
      showToast(t('automationPresetRequired'), 'warning');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setRunMessage(t('automationRunning'));
    setSteps(makeSteps(form.renderVideo, t));
    resetResults();

    try {
      const imageBase64 = await fileToBase64(imageFile);
      if (controller.signal.aborted) return;

      const sharedOptions = {
        outputLanguage: lang,
        targetDuration: Number(form.targetDuration) || 6,
        aspectRatio: form.aspectRatio,
        customInstructions: form.customInstructions,
        subjectDescription: form.subjectDescription,
      };

      const promptOptions = {
        ...DEFAULT_OPTIONS,
        ...sharedOptions,
        sceneCount: Number(form.sceneCount) || 4,
      };

      const grokOptions = {
        ...DEFAULT_OPTIONS,
        ...sharedOptions,
      };

      updateStep('prompt', { status: 'running', message: t('automationGeneratingPrompt') });
      updateStep('grokPrompt', { status: 'running', message: t('automationGeneratingGrokPrompt') });
      updateStep('analysis', { status: 'running', message: t('automationAnalyzingProduct') });

      const [promptRes, grokPromptRes, analysisRes] = await Promise.allSettled([
        generatePrompt({
          imageBase64,
          imageMimeType: imageFile.type,
          preset: selectedPreset,
          userOptions: promptOptions,
          signal: controller.signal,
        }),
        generateGrokVideoPrompt({
          imageBase64,
          imageMimeType: imageFile.type,
          preset: {
            name: selectedPreset.name,
            vibe: selectedPreset.vibe,
            grokPromptIdea: form.motionStyle,
          },
          userOptions: grokOptions,
          signal: controller.signal,
        }),
        analyzeProductByImage({
          imageBase64,
          imageMimeType: imageFile.type,
          language: lang,
          signal: controller.signal,
        }),
      ]);

      if (controller.signal.aborted) return;

      let grokPromptText = '';
      let analysis = null;

      if (promptRes.status === 'fulfilled') {
        setResults((prev) => ({ ...prev, promptText: promptRes.value?.text || '' }));
        updateStep('prompt', { status: 'success', message: t('automationPromptGenerated') });
      } else {
        updateStep('prompt', { status: 'error', message: promptRes.reason?.message || t('automationFailed') });
      }

      if (grokPromptRes.status === 'fulfilled') {
        grokPromptText = grokPromptRes.value?.text || '';
        setResults((prev) => ({ ...prev, grokPromptText }));
        updateStep('grokPrompt', { status: 'success', message: t('automationGrokPromptGenerated') });
      } else {
        updateStep('grokPrompt', { status: 'error', message: grokPromptRes.reason?.message || t('automationFailed') });
      }

      if (analysisRes.status === 'fulfilled') {
        analysis = analysisRes.value || null;
        setResults((prev) => ({ ...prev, productAnalysis: analysis }));
        updateStep('analysis', { status: 'success', message: analysis?.productName || t('automationAnalysisReady') });
      } else {
        updateStep('analysis', { status: 'error', message: analysisRes.reason?.message || t('automationFailed') });
      }

      const followUps = [];

      if (analysis?.productName) {
        updateStep('titles', { status: 'running', message: t('automationGeneratingTitles') });
        followUps.push(
          generateTitles({
            productName: analysis.productName,
            productCategory: analysis.productCategory || '',
            targetAudience: analysis.targetAudience || '',
            keyBenefits: analysis.keyBenefits || [],
            keywords: analysis.keywords || [],
            tone: form.titleTone,
            language: lang,
            titleCount: Number(form.titleCount) || 10,
            includeEmoji: true,
            customInstructions: form.titleCustomInstructions,
            signal: controller.signal,
          })
            .then((value) => ({ type: 'titles', ok: true, value }))
            .catch((error) => ({ type: 'titles', ok: false, error })),
        );
      } else {
        updateStep('titles', { status: 'skipped', message: t('automationNoProductAnalysis') });
      }

      if (form.renderVideo && grokPromptText.trim()) {
        updateStep('video', { status: 'running', message: t('automationSubmittingXaiJob') });
        followUps.push(
          generateGrokImagineVideo({
            prompt: grokPromptText,
            imageBase64,
            imageMimeType: imageFile.type,
            duration: Number(form.targetDuration) || 6,
            aspectRatio: form.aspectRatio,
            resolution: form.resolution,
            signal: controller.signal,
            onStatus: ({ status, requestId }) => {
              updateStep('video', {
                status: 'running',
                message: requestId
                  ? t('automationRenderingWithId').replace('{status}', status || t('automationProcessing')).replace('{requestId}', requestId)
                  : t('automationRendering').replace('{status}', status || t('automationProcessing')),
              });
            },
          })
            .then((value) => ({ type: 'video', ok: true, value }))
            .catch((error) => ({ type: 'video', ok: false, error })),
        );
      } else if (form.renderVideo) {
        updateStep('video', { status: 'skipped', message: t('automationGrokPromptUnavailable') });
      }

      if (followUps.length > 0) {
        setRunMessage(t('automationRunningFollowUps'));
        const followUpRes = await Promise.all(followUps);
        if (controller.signal.aborted) return;

        for (const item of followUpRes) {
          if (!item.ok) {
            const msg = item.error?.message || t('automationStepFailed');
            updateStep(item.type, { status: 'error', message: msg });
            continue;
          }

          if (item.type === 'titles') {
            const titles = item.value?.titles || [];
            const text = item.value?.text || titles.join('\n');
            setResults((prev) => ({ ...prev, titles, titlesText: text }));
            updateStep('titles', { status: 'success', message: t('automationTitlesGenerated').replace('{count}', String(titles.length)) });
          }

          if (item.type === 'video') {
            const video = item.value?.video || null;
            setResults((prev) => ({ ...prev, video }));
            updateStep('video', { status: video?.url ? 'success' : 'error', message: video?.url ? t('automationVideoGenerated') : t('automationNoVideoUrl') });
          }
        }
      }

      setRunMessage(t('automationCompleted'));
      showToast(t('automationCompleted'), 'success');
    } catch (error) {
      if (error?.name === 'AbortError') {
        setRunMessage(t('automationCancelled'));
        showToast(t('automationCancelled'), 'info');
      } else {
        setRunMessage(t('automationFailedWithError').replace('{error}', error.message));
        showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 6000);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsRunning(false);
    }
  };

  const handleCancel = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  return (
    <div className="title-generator">
      <div className="panel-header">
        <h2>{t('automationStudioTitle')}</h2>
        <span className="panel-badge">{t('automationStudioBadge')}</span>
      </div>

      <div className="title-generator__card">
        <div className="title-analysis">
          <div className="title-analysis__header">
            <h3>{t('grokReferenceImageTitle')}</h3>
            <span className="meta-badge">{t('required')}</span>
          </div>
          {imagePreview ? (
            <div className="title-analysis__preview-wrap">
              <img src={imagePreview} alt={t('automationPreviewAlt')} className="title-analysis__preview" />
              <div className="title-analysis__preview-actions">
                <button type="button" className="btn btn--outline btn--sm" onClick={() => fileInputRef.current?.click()}>{t('titleAnalysisChangeImage')}</button>
                <button type="button" className="btn btn--danger btn--sm" onClick={handleClearImage}>{t('titleAnalysisRemoveImage')}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="title-analysis__dropzone" onClick={() => fileInputRef.current?.click()}>
              <span className="title-analysis__dropzone-title">{t('automationUploadTitle')}</span>
              <span className="title-analysis__dropzone-sub">{t('automationUploadHint')}</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleImageChange} />
        </div>

        <div className="title-generator__grid">
          <div className="option-group">
            <label className="option-label">{t('presetTitle')}</label>
            <select className="option-select" value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label className="option-label">{t('sceneLabel')}</label>
            <input className="option-range" type="range" min="2" max="8" step="1" value={form.sceneCount} onChange={(e) => setField('sceneCount', Number(e.target.value))} />
            <span className="option-hint">{form.sceneCount} {t('qualitySceneCount').toLowerCase()}</span>
          </div>

          <div className="option-group">
            <label className="option-label">{t('titleCount')}</label>
            <input className="option-range" type="range" min="3" max="20" step="1" value={form.titleCount} onChange={(e) => setField('titleCount', Number(e.target.value))} />
            <span className="option-hint">{form.titleCount} {t('titleCountUnit')}</span>
          </div>

          <div className="option-group">
            <label className="option-label">{t('automationVideoRenderLabel')}</label>
            <label className="toggle-switch" style={{ alignSelf: 'flex-start' }}>
              <input type="checkbox" checked={form.renderVideo} onChange={(e) => setField('renderVideo', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
            <span className="option-hint">{t('automationRequiresXaiKey')}</span>
          </div>

          <div className="option-group">
            <label className="option-label">{t('durationLabel')}</label>
            <input className="option-range" type="range" min="2" max="15" step="1" value={form.targetDuration} onChange={(e) => setField('targetDuration', Number(e.target.value))} disabled={!form.renderVideo} />
            <span className="option-hint">{form.targetDuration}s</span>
          </div>

          <div className="option-group">
            <label className="option-label">{t('aspectLabel')}</label>
            <select className="option-select" value={form.aspectRatio} onChange={(e) => setField('aspectRatio', e.target.value)} disabled={!form.renderVideo}>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
              <option value="1:1">1:1</option>
              <option value="4:3">4:3</option>
            </select>
          </div>

          <div className="option-group">
            <label className="option-label">{t('automationResolutionLabel')}</label>
            <select className="option-select" value={form.resolution} onChange={(e) => setField('resolution', e.target.value)} disabled={!form.renderVideo}>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
        </div>

        <div className="option-group">
          <label className="option-label">{t('automationMotionStyleLabel')}</label>
          <textarea className="option-textarea" rows={2} value={form.motionStyle} onChange={(e) => setField('motionStyle', e.target.value)} />
        </div>

        <div className="option-group">
          <label className="option-label">{t('automationSharedCustomLabel')}</label>
          <textarea className="option-textarea" rows={2} value={form.customInstructions} onChange={(e) => setField('customInstructions', e.target.value)} />
        </div>

        <div className="option-group">
          <label className="option-label">{t('automationTitleCustomLabel')}</label>
          <textarea className="option-textarea" rows={2} value={form.titleCustomInstructions} onChange={(e) => setField('titleCustomInstructions', e.target.value)} />
        </div>

        <div className="title-generator__actions">
          <button type="button" className="btn btn--generate" onClick={handleRunAutomation} disabled={isRunning || !imageFile || !selectedPreset}>
            {isRunning ? t('automationRunningButton') : t('automationRunButton')}
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleCancel} disabled={!isRunning}>
            {t('cancel')}
          </button>
        </div>

        {runMessage ? <p className="title-generator__empty" style={{ marginTop: 12 }}>{runMessage}</p> : null}
      </div>

      <div className="title-generator__result">
        <div className="title-generator__result-header">
          <h3>{t('automationProgressTitle')}</h3>
        </div>
        <div className="title-generator__list">
          {STEP_ORDER.map((key) => (
            <div key={key} className="title-item">
              <p className="title-item__text" style={{ marginBottom: 6 }}>
                <strong>{steps[key]?.label}</strong>
                {' • '}
                <span>{String(steps[key]?.status || 'idle').toUpperCase()}</span>
              </p>
              <p className="title-item__meta">{steps[key]?.message || t('automationWaiting')}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="title-generator__result">
        <div className="title-generator__result-header">
          <h3>{t('automationPromptOutputTitle')}</h3>
        </div>
        {!results.promptText ? (
          <p className="title-generator__empty">{t('automationPromptOutputEmpty')}</p>
        ) : (
          <div className="title-generator__list">
            <div className="title-item">
              <p className="title-item__text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{results.promptText}</p>
            </div>
          </div>
        )}
      </div>

      <div className="title-generator__result">
        <div className="title-generator__result-header">
          <h3>{t('automationGrokPromptOutputTitle')}</h3>
        </div>
        {!results.grokPromptText ? (
          <p className="title-generator__empty">{t('automationGrokPromptOutputEmpty')}</p>
        ) : (
          <div className="title-generator__list">
            <div className="title-item">
              <p className="title-item__text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{results.grokPromptText}</p>
            </div>
          </div>
        )}
      </div>

      <div className="title-generator__result">
        <div className="title-generator__result-header">
          <h3>{t('grokGeneratedVideoTitle')}</h3>
          {results.video?.url ? (
            <div className="result-actions">
              <a className="btn btn--secondary btn--sm" href={results.video.url} target="_blank" rel="noreferrer">{t('openUrl')}</a>
            </div>
          ) : null}
        </div>
        {!results.video?.url ? (
          <p className="title-generator__empty">{t('automationVideoOutputEmpty')}</p>
        ) : (
          <div className="title-generator__list">
            <div className="title-item">
              <video controls playsInline preload="metadata" src={results.video.url} style={{ width: '100%', borderRadius: 12, background: '#000' }} />
              <p className="title-item__meta" style={{ marginTop: 10 }}>
                {t('durationLabel')}: {results.video.duration ?? form.targetDuration ?? '-'}s
                {' • '}
                {t('expiresLabel')}: {results.video.expiresAt || 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="title-generator__result">
        <div className="title-generator__result-header">
          <h3>{t('automationTitleOutputTitle')}</h3>
        </div>
        {!results.titlesText ? (
          <p className="title-generator__empty">{t('automationTitleOutputEmpty')}</p>
        ) : (
          <div className="title-generator__list">
            {(results.titles.length ? results.titles : results.titlesText.split('\n').filter(Boolean)).map((title, index) => (
              <div key={`${index}-${title}`} className="title-item">
                <p className="title-item__text">{index + 1}. {title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="title-generator__result">
        <div className="title-generator__result-header">
          <h3>{t('automationAnalysisOutputTitle')}</h3>
        </div>
        {!results.productAnalysis ? (
          <p className="title-generator__empty">{t('automationAnalysisOutputEmpty')}</p>
        ) : (
          <div className="title-generator__list">
            <div className="title-item">
              <p className="title-item__text">
                <strong>{results.productAnalysis.productName}</strong>
                {' • '}
                {results.productAnalysis.productCategory}
                {' • '}
                {t('titleAnalysisConfidence')} {results.productAnalysis.confidence}%
              </p>
              <p className="title-item__meta" style={{ whiteSpace: 'pre-wrap' }}>
                {t('titleAudience')}: {results.productAnalysis.targetAudience}
                {'\n'}
                {t('titleKeywords')}: {(results.productAnalysis.keywords || []).join(', ') || '-'}
                {'\n'}
                {t('titleBenefits')}: {(results.productAnalysis.keyBenefits || []).join(' | ') || '-'}
                {'\n'}
                {t('summaryLabel')}: {results.productAnalysis.summary || '-'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
