import { useMemo, useState, useCallback } from 'react';
import { copyToClipboard } from '../utils/copy';
import { downloadTxt } from '../utils/downloadTxt';
import { downloadMarkdown, downloadJSON, promptToJSON } from '../utils/exportFormats';
import { showToast } from '../lib/toastBus';
import { useI18n } from '../hooks/useI18n';

const SCENE_HEADER_REGEX = /^(?:\*\*|#{1,4}\s*)?(?:ADEGAN|SCENE)\s*\d+\s*[:.-][^\n]*/gim;

function parsePromptSections(promptText) {
  if (!promptText) return { header: '', scenes: [] };

  const matches = [...promptText.matchAll(SCENE_HEADER_REGEX)];
  if (matches.length === 0) {
    return { header: promptText, scenes: [] };
  }

  const firstSceneStart = matches[0].index ?? 0;
  const header = promptText.slice(0, firstSceneStart).trim();

  const scenes = matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? promptText.length : promptText.length;
    const raw = promptText.slice(start, end);
    const content = raw.trim();
    const title = match[0].replace(/^[\s#*]+/, '').replace(/[\s*]+$/, '').trim();

    return {
      id: index + 1,
      title: title || `Scene ${index + 1}`,
      content,
      start,
      end,
    };
  });

  return { header, scenes };
}

function SceneCard({ scene, onEditScene }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(scene.content);

  const handleCopy = async () => {
    const contentToCopy = isEditing ? editContent : scene.content;
    const success = await copyToClipboard(contentToCopy);
    if (success) {
      setCopied(true);
      showToast(`Scene ${scene.id} ${t('sceneCopied')}`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast(t('copyFail'), 'error');
    }
  };

  const handleSave = () => {
    if (onEditScene) {
      onEditScene(scene.id, editContent);
    }
    setIsEditing(false);
    showToast(`Scene ${scene.id} ${t('sceneSaved')}`, 'success');
  };

  const handleCancel = () => {
    setEditContent(scene.content);
    setIsEditing(false);
  };

  return (
    <div className={`scene-card ${scene.isFooter ? 'scene-card--footer' : ''}`}>
      <div className="scene-card__header">
        <div className="scene-card__badge">
          {scene.isFooter ? '📋' : `🎬 ${scene.id}`}
        </div>
        <h4 className="scene-card__title">{scene.title}</h4>
        <div className="scene-card__actions">
          {isEditing ? (
            <>
              <button type="button" className="btn btn--save-scene" onClick={handleSave}>✓ {t('save')}</button>
              <button type="button" className="btn btn--cancel-scene" onClick={handleCancel}>{t('cancel')}</button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--edit-scene"
              onClick={() => setIsEditing(true)}
              title={t('presetActionEdit')}
            >
              ✏️ {t('presetActionEdit')}
            </button>
          )}
          <button
            type="button"
            className={`btn btn--copy-scene ${copied ? 'btn--copied' : ''}`}
            onClick={handleCopy}
            title={`${t('copy')} ${t('sceneLabel')} ${scene.id}`}
          >
            {copied ? '✓' : t('copy')}
          </button>
        </div>
      </div>
      {isEditing ? (
        <textarea
          className="scene-card__editor"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={Math.max(6, editContent.split('\n').length)}
        />
      ) : (
        <pre className="scene-card__content">{scene.content}</pre>
      )}
    </div>
  );
}

function buildSmartHints(selectedPreset, advancedOptions, lang) {
  if (!selectedPreset) return [];

  const isID = lang === 'ID';
  const hints = [];
  const firstMove = selectedPreset.signatureMoves?.[0];
  const sceneCount = Number(advancedOptions?.sceneCount || 4);
  const hasHighEnergy = String(selectedPreset.energyLevel || '').toLowerCase().includes('high');

  if (firstMove) {
    hints.push(
      isID
        ? `Mulai hook 3 detik pertama dengan: ${firstMove}.`
        : `Use this as your first 3-second hook: ${firstMove}.`,
    );
  }

  if (hasHighEnergy && sceneCount < 4) {
    hints.push(
      isID
        ? 'Preset ini berenergi tinggi. Naikkan scene ke 4-6 agar pacing tidak terburu-buru.'
        : 'This preset is high-energy. Use 4-6 scenes to avoid rushed pacing.',
    );
  } else if (!hasHighEnergy && sceneCount > 6) {
    hints.push(
      isID
        ? 'Preset ini lebih calm. Turunkan scene ke 3-5 agar flow lebih fokus.'
        : 'This preset is calmer. Keep scenes around 3-5 for a tighter flow.',
    );
  }

  if (selectedPreset.transitionStyle) {
    hints.push(
      isID
        ? `Pakai transisi utama: ${selectedPreset.transitionStyle}.`
        : `Primary transition to emphasize: ${selectedPreset.transitionStyle}.`,
    );
  }

  if (selectedPreset.wardrobe) {
    hints.push(
      isID
        ? `Kunci wardrobe di semua scene: ${selectedPreset.wardrobe}.`
        : `Keep wardrobe locked across all scenes: ${selectedPreset.wardrobe}.`,
    );
  }

  if (Array.isArray(selectedPreset.moodKeywords) && selectedPreset.moodKeywords.length > 0) {
    const keywordText = selectedPreset.moodKeywords.slice(0, 3).join(', ');
    hints.push(
      isID
        ? `Pastikan tone visual konsisten dengan mood: ${keywordText}.`
        : `Keep visual tone aligned with mood keywords: ${keywordText}.`,
    );
  }

  return hints.slice(0, 4);
}

function buildHistoryMetaLine(item, lang) {
  const meta = item?.meta || {};
  const parts = [];

  if (meta.productName) {
    parts.push(meta.productName);
  }
  if (meta.sceneCount) {
    parts.push(lang === 'EN' ? `${meta.sceneCount} scenes` : `${meta.sceneCount} scene`);
  }
  if (meta.imageCount) {
    parts.push(lang === 'EN' ? `${meta.imageCount} refs` : `${meta.imageCount} referensi`);
  }
  if (meta.outputLanguage) {
    parts.push(meta.outputLanguage);
  }
  if (Number.isFinite(Number(item?.quality?.score))) {
    parts.push(`Q ${Math.round(Number(item.quality.score))}`);
  }
  if (meta.edited) {
    parts.push(lang === 'EN' ? 'edited' : 'diedit');
  }
  if (meta.revisionFeedback) {
    parts.push(lang === 'EN' ? 'revised' : 'direvisi');
  }

  return parts.join(' • ');
}

function buildHistorySourceLine(item, currentInputMeta, lang) {
  const signature = item?.meta?.signature;
  if (!signature) {
    return '';
  }

  if (currentInputMeta?.signature && currentInputMeta.signature === signature) {
    return lang === 'EN' ? 'Matches current references' : 'Sesuai dengan referensi aktif';
  }

  return lang === 'EN' ? 'Generated from a previous image session' : 'Dibuat dari sesi gambar sebelumnya';
}

function resolveSceneAlignmentStatus(item, lang) {
  if (item?.missingPinnedTerms?.length > 0) {
    return lang === 'EN' ? 'Pinned beat missing' : 'Pin wajib belum masuk';
  }
  if (item?.status === 'blocked') {
    return lang === 'EN' ? 'Blocked by avoid-list' : 'Melanggar avoid-list';
  }
  if (item?.status === 'missing') {
    return lang === 'EN' ? 'Needs user intent' : 'Intent user belum masuk';
  }
  return lang === 'EN' ? 'Aligned' : 'Selaras';
}

function buildWarningRevisionSuggestion(warning, lang) {
  if (!warning) return '';

  if (warning.code === 'scene_count_mismatch') {
    return lang === 'EN'
      ? 'Match the output to the requested scene count exactly.'
      : 'Samakan jumlah scene output dengan jumlah scene yang diminta.';
  }
  if (warning.code === 'product_name_missing') {
    return lang === 'EN'
      ? 'Mention the exact product name earlier and repeat it in the CTA.'
      : 'Sebut nama produk secara persis lebih awal dan ulangi lagi di CTA.';
  }
  if (warning.code === 'avoid_terms_detected' || warning.code === 'scene_avoid_terms_detected') {
    return lang === 'EN'
      ? `Remove these banned or discouraged elements: ${warning.message.replace(/^.*?:\s*/, '')}`
      : `Hilangkan elemen yang dilarang atau tidak diinginkan ini: ${warning.message.replace(/^.*?:\s*/, '')}`;
  }
  if (warning.code === 'user_intent_missing' || warning.code === 'scene_requested_terms_missing') {
    return lang === 'EN'
      ? `Make the next version explicitly cover this missing intent: ${warning.message.replace(/^.*?:\s*/, '')}`
      : `Pastikan versi berikutnya secara eksplisit memuat intent yang belum masuk ini: ${warning.message.replace(/^.*?:\s*/, '')}`;
  }
  if (warning.code === 'scene_pin_missing') {
    return lang === 'EN'
      ? `Honor this pinned scene requirement exactly: ${warning.message.replace(/^.*?:\s*/, '')}`
      : `Penuhi pin scene ini secara persis: ${warning.message.replace(/^.*?:\s*/, '')}`;
  }

  return lang === 'EN'
    ? `Revise the next prompt to fix this issue: ${warning.message}`
    : `Perbaiki prompt berikutnya untuk mengatasi masalah ini: ${warning.message}`;
}

function buildSceneRevisionSuggestion(item, lang) {
  if (!item) return '';

  if (item.missingPinnedTerms?.length > 0 && item.pinnedInstruction) {
    return lang === 'EN'
      ? `Scene ${item.scene}: enforce this pinned requirement exactly: ${item.pinnedInstruction}.`
      : `Scene ${item.scene}: penuhi pin ini secara persis: ${item.pinnedInstruction}.`;
  }
  if (item.status === 'blocked' && item.violatedAvoidTerms?.length > 0) {
    return lang === 'EN'
      ? `Scene ${item.scene}: remove these avoid-list elements: ${item.violatedAvoidTerms.join(', ')}.`
      : `Scene ${item.scene}: hapus elemen avoid-list ini: ${item.violatedAvoidTerms.join(', ')}.`;
  }
  if (item.status === 'missing') {
    return lang === 'EN'
      ? `Scene ${item.scene}: add the requested selling point or must-include beat more clearly.`
      : `Scene ${item.scene}: masukkan selling point atau beat wajib yang diminta dengan lebih jelas.`;
  }
  if (item.matchedTerms?.length > 0) {
    return lang === 'EN'
      ? `Keep Scene ${item.scene} aligned with: ${item.matchedTerms.join(', ')}.`
      : `Pertahankan Scene ${item.scene} tetap selaras dengan: ${item.matchedTerms.join(', ')}.`;
  }

  return '';
}

export default function PromptOutput({
  prompt,
  isLoading,
  progress,
  generationStage = 'idle',
  quality,
  onRegenerate,
  onRegenerateWithFeedback,
  history,
  onSelectHistory,
  onDeleteHistory,
  onClearHistory,
  canGenerate,
  generateDisabledReason,
  onGenerate,
  onCancelGenerate,
  onPromptChange,
  selectedPreset,
  advancedOptions,
  favorites,
  onToggleFavorite,
  onSelectFavorite,
  onClearFavorites,
  currentInputMeta,
  currentPromptMeta,
  canRegenerate = true,
  regenerateWarning = '',
  preferenceMemory = null,
}) {
  const { t, lang } = useI18n();
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(null);
  const [viewMode, setViewMode] = useState('scenes'); // 'scenes' | 'raw' | 'json'
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [compareHistoryId, setCompareHistoryId] = useState(null);

  const parsed = useMemo(() => parsePromptSections(prompt), [prompt]);
  const hasScenes = parsed.scenes.length > 0;

  const jsonData = useMemo(() => {
    if (!prompt) return null;
    return promptToJSON(prompt, selectedPreset, advancedOptions, { quality });
  }, [prompt, selectedPreset, advancedOptions, quality]);

  const jsonString = useMemo(() => {
    if (!jsonData) return '';
    return JSON.stringify(jsonData, null, 2);
  }, [jsonData]);

  const smartHints = useMemo(
    () => buildSmartHints(selectedPreset, advancedOptions, lang),
    [selectedPreset, advancedOptions, lang],
  );
  const learnedMemoryCount = (
    (Array.isArray(preferenceMemory?.avoidTerms) ? preferenceMemory.avoidTerms.length : 0)
    + (Array.isArray(preferenceMemory?.steeringNotes) ? preferenceMemory.steeringNotes.length : 0)
  );

  const progressSteps = useMemo(() => ([
    { key: 'uploading', label: lang === 'EN' ? 'Preparing references' : 'Menyiapkan referensi' },
    { key: 'generating', label: lang === 'EN' ? 'Generating prompt' : 'Membuat prompt' },
    { key: 'postProcessing', label: lang === 'EN' ? 'Finalizing output' : 'Merapikan output' },
  ]), [lang]);

  const stageLabel = useMemo(() => {
    if (generationStage === 'uploading') {
      return lang === 'EN' ? 'Uploading and normalizing references' : 'Mengunggah dan menormalkan referensi';
    }
    if (generationStage === 'generating') {
      return lang === 'EN' ? 'Prompt model is generating the scene plan' : 'Model prompt sedang menyusun scene plan';
    }
    if (generationStage === 'postProcessing') {
      return lang === 'EN' ? 'Applying final output formatting' : 'Menerapkan formatting output akhir';
    }
    if (generationStage === 'done') {
      return lang === 'EN' ? 'Done' : 'Selesai';
    }
    return '';
  }, [generationStage, lang]);

  const currentStageIndex = progressSteps.findIndex((step) => step.key === generationStage);

  const revisionBaseItem = useMemo(() => {
    const revisionBaseHistoryId = currentPromptMeta?.revisionBaseHistoryId;
    if (!revisionBaseHistoryId || !Array.isArray(history)) return null;

    return history.find((item) => (
      item?.meta?.historyId === revisionBaseHistoryId || item?.id === revisionBaseHistoryId
    )) || null;
  }, [currentPromptMeta?.revisionBaseHistoryId, history]);

  const revisionCompareMeta = useMemo(() => {
    const previousPromptSnapshot = String(currentPromptMeta?.previousPromptSnapshot || '').trim();
    if (!previousPromptSnapshot) return null;

    const originTime = revisionBaseItem?.timestamp;
    const originPreset = revisionBaseItem?.preset?.name;
    const originLabel = originTime
      ? (lang === 'EN' ? `Based on version ${originTime}` : `Berdasarkan versi ${originTime}`)
      : (lang === 'EN' ? 'Based on previous version' : 'Berdasarkan versi sebelumnya');

    return {
      previousPromptSnapshot,
      revisionFeedback: String(currentPromptMeta?.revisionFeedback || '').trim(),
      originLabel,
      originPreset: originPreset || '',
    };
  }, [
    currentPromptMeta?.previousPromptSnapshot,
    currentPromptMeta?.revisionFeedback,
    lang,
    revisionBaseItem?.preset?.name,
    revisionBaseItem?.timestamp,
  ]);

  const showRevisionCompare = Boolean(
    revisionCompareMeta
    && currentPromptMeta?.historyId
    && compareHistoryId === currentPromptMeta.historyId
  );

  const handleCopyAll = async () => {
    const textToCopy = viewMode === 'json' ? jsonString : prompt;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      showToast(viewMode === 'json' ? t('copyJsonSuccess') : t('copySuccess'), 'success');
    } else {
      showToast(t('copyFail'), 'error');
    }
  };

  const handleDownload = () => {
    downloadTxt(prompt, `tiktok-prompt-${Date.now()}`);
    showToast(t('downloadSuccess'), 'success');
  };

  const handleDownloadMd = () => {
    downloadMarkdown(prompt, `tiktok-prompt-${Date.now()}`);
    showToast(t('downloadSuccess'), 'success');
  };

  const handleDownloadJson = () => {
    downloadJSON(prompt, selectedPreset, advancedOptions, `tiktok-prompt-${Date.now()}`, { quality });
    showToast(t('downloadSuccess'), 'success');
  };

  const qualityStatusText = useMemo(() => {
    const status = quality?.status;
    if (status === 'excellent') return t('qualityStatusExcellent');
    if (status === 'good') return t('qualityStatusGood');
    if (status === 'fair') return t('qualityStatusFair');
    if (status === 'needs_work') return t('qualityStatusNeedsWork');
    return t('qualityStatusUnknown');
  }, [quality?.status, t]);

  const handleHistoryClick = (index) => {
    setActiveHistoryIndex(index);
    onSelectHistory(index);
  };

  const handleEditScene = useCallback((sceneId, nextContent) => {
    if (!onPromptChange) return;
    const targetScene = parsed.scenes.find((scene) => scene.id === sceneId);
    if (!targetScene) return;

    const prefix = prompt.slice(0, targetScene.start);
    const suffix = prompt.slice(targetScene.end);
    const content = nextContent.trimEnd();
    const separator = suffix && !content.endsWith('\n') && !suffix.startsWith('\n') ? '\n\n' : '';
    const updatedPrompt = `${prefix}${content}${separator}${suffix}`;

    onPromptChange(updatedPrompt);
  }, [onPromptChange, parsed.scenes, prompt]);

  const appendRevisionFeedback = useCallback((nextSuggestion) => {
    const trimmedSuggestion = String(nextSuggestion || '').trim();
    if (!trimmedSuggestion) return;

    setRevisionFeedback((prev) => {
      const trimmedPrev = String(prev || '').trim();
      if (!trimmedPrev) return trimmedSuggestion;
      if (trimmedPrev.includes(trimmedSuggestion)) return trimmedPrev;
      return `${trimmedPrev}\n- ${trimmedSuggestion}`;
    });
  }, []);

  return (
    <div className="prompt-output">
      <div className="panel-header">
        <h2>{t('outputTitle')}</h2>
        <span className="panel-badge">{t('step3')}</span>
      </div>

      <div className={`smart-hint-card ${selectedPreset ? '' : 'smart-hint-card--muted'}`}>
        <div className="smart-hint-card__title">{t('smartHintTitle')}</div>
        {!selectedPreset ? (
          <p className="smart-hint-card__empty">{t('smartHintEmpty')}</p>
        ) : (
          <ul className="smart-hint-card__list">
            {smartHints.map((hint, index) => (
              <li key={`${selectedPreset.id}-hint-${index}`}>{hint}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="generate-section">
        <div className="generate-actions">
          <button
            type="button"
            className={`btn btn--generate ${!canGenerate ? 'btn--disabled' : ''}`}
            disabled={!canGenerate || isLoading}
            onClick={() => onGenerate?.()}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                <span>{t('generating')}</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>{t('generateBtn')}</span>
              </>
            )}
          </button>
          {isLoading && onCancelGenerate && (
            <button type="button" className="btn btn--outline btn--sm" onClick={onCancelGenerate}>
              {t('cancelGenerate')}
            </button>
          )}
        </div>
        {!canGenerate && (
          <p className="generate-hint">
            {generateDisabledReason || t('generateHint')}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="progress-section">
          <div className="progress-status">
            <span className="progress-status__badge">
              {lang === 'EN' ? 'Live status' : 'Status live'}
            </span>
            <span className="progress-status__text">{stageLabel}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-steps">
            {progressSteps.map((step, index) => (
              <span
                key={step.key}
                className={`progress-step ${index <= currentStageIndex ? 'progress-step--done' : ''} ${index === currentStageIndex ? 'progress-step--active' : ''}`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {quality && prompt && !isLoading && (
        <div className={`quality-card quality-card--${quality.status || 'fair'}`}>
          <div className="quality-card__header">
            <h3 className="quality-card__title">{t('qualityTitle')}</h3>
            <span className={`quality-card__status quality-card__status--${quality.status || 'fair'}`}>
              {qualityStatusText}
            </span>
          </div>
          <div className="quality-card__score-row">
            <span className="quality-card__score">{Math.max(0, Math.min(100, Number(quality.score) || 0))}/100</span>
            <span className="quality-card__scene-count">
              {t('qualitySceneCount')}: {quality?.sceneCount?.actual ?? 0}/{quality?.sceneCount?.expected ?? 0}
            </span>
          </div>
          <div className="quality-card__meter">
            <div
              className="quality-card__meter-fill"
              style={{ width: `${Math.max(0, Math.min(100, Number(quality.score) || 0))}%` }}
            />
          </div>

          {Array.isArray(quality.checks) && quality.checks.length > 0 && (
            <div className="quality-card__checks">
              {quality.checks.map((check) => (
                <span
                  key={check.id}
                  className={`quality-chip ${check.passed ? 'quality-chip--pass' : 'quality-chip--fail'}`}
                >
                  {check.label}: {check.score}/{check.weight}
                </span>
              ))}
            </div>
          )}

          {Array.isArray(quality.warnings) && quality.warnings.length > 0 && (
            <div className="quality-card__section">
              <div className="quality-card__section-title">{t('qualityWarningsTitle')}</div>
              <ul className="quality-card__list">
                {quality.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`}>
                    [{String(warning.severity || 'info').toUpperCase()}] {warning.message}
                    <button
                      type="button"
                      className="quality-inline-action"
                      onClick={() => appendRevisionFeedback(buildWarningRevisionSuggestion(warning, lang))}
                    >
                      {lang === 'EN' ? 'Use for revision' : 'Pakai untuk revisi'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(quality.tips) && quality.tips.length > 0 && (
            <div className="quality-card__section">
              <div className="quality-card__section-title">{t('qualityTipsTitle')}</div>
              <ul className="quality-card__list">
                {quality.tips.map((tip, index) => (
                  <li key={`${index}-${tip}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(quality.sceneAlignment) && quality.sceneAlignment.length > 0 && (
            <div className="quality-card__section">
              <div className="quality-card__section-title">
                {lang === 'EN' ? 'Per-scene alignment' : 'Alignment per scene'}
              </div>
              <div className="quality-scene-list">
                {quality.sceneAlignment.map((item) => (
                  <div
                    key={`scene-alignment-${item.scene}`}
                    className={`quality-scene-item quality-scene-item--${item.missingPinnedTerms?.length > 0 ? 'missing' : (item.status || 'aligned')}`}
                  >
                    <div className="quality-scene-item__header">
                      <span className="quality-scene-item__title">
                        {lang === 'EN' ? `Scene ${item.scene}` : `Scene ${item.scene}`}
                      </span>
                      <span className="quality-scene-item__status">
                        {resolveSceneAlignmentStatus(item, lang)}
                      </span>
                    </div>
                    {Array.isArray(item.matchedTerms) && item.matchedTerms.length > 0 ? (
                      <div className="quality-scene-item__line">
                        <strong>{lang === 'EN' ? 'Matched:' : 'Masuk:'}</strong> {item.matchedTerms.join(', ')}
                      </div>
                    ) : null}
                    {Array.isArray(item.violatedAvoidTerms) && item.violatedAvoidTerms.length > 0 ? (
                      <div className="quality-scene-item__line quality-scene-item__line--warn">
                        <strong>{lang === 'EN' ? 'Avoid violation:' : 'Pelanggaran avoid:'}</strong> {item.violatedAvoidTerms.join(', ')}
                      </div>
                    ) : null}
                    {item.pinnedInstruction ? (
                      <div className="quality-scene-item__line">
                        <strong>{lang === 'EN' ? 'Pinned:' : 'Pin:'}</strong> {item.pinnedInstruction}
                      </div>
                    ) : null}
                    {Array.isArray(item.missingPinnedTerms) && item.missingPinnedTerms.length > 0 ? (
                      <div className="quality-scene-item__line quality-scene-item__line--warn">
                        <strong>{lang === 'EN' ? 'Missing pin:' : 'Pin belum masuk:'}</strong> {item.missingPinnedTerms.join(', ')}
                      </div>
                    ) : null}
                    {item.status === 'missing' ? (
                      <div className="quality-scene-item__line">
                        {lang === 'EN'
                          ? 'No requested selling point or must-include beat detected in this scene yet.'
                          : 'Belum ada selling point atau beat wajib yang terdeteksi di scene ini.'}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="quality-scene-item__action"
                      onClick={() => appendRevisionFeedback(buildSceneRevisionSuggestion(item, lang))}
                    >
                      {lang === 'EN' ? 'Send to revision note' : 'Kirim ke catatan revisi'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {prompt && !isLoading && (
        <div className="result-section">
          <div className="result-toolbar">
            <div className="result-toolbar__left">
              {hasScenes && (
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`view-toggle__btn ${viewMode === 'scenes' ? 'view-toggle__btn--active' : ''}`}
                    onClick={() => setViewMode('scenes')}
                  >
                    {t('viewScenes')}
                  </button>
                  <button
                    type="button"
                    className={`view-toggle__btn ${viewMode === 'raw' ? 'view-toggle__btn--active' : ''}`}
                    onClick={() => setViewMode('raw')}
                  >
                    {t('viewRaw')}
                  </button>
                  <button
                    type="button"
                    className={`view-toggle__btn ${viewMode === 'json' ? 'view-toggle__btn--active' : ''}`}
                    onClick={() => setViewMode('json')}
                  >
                      {t('jsonTab')}
                  </button>
                </div>
              )}
            </div>
            <div className="result-actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={handleCopyAll}>
                {viewMode === 'json' ? t('copyJson') : t('copyAll')}
              </button>
              <div className="export-dropdown">
                <button type="button" className="btn btn--secondary btn--sm" onClick={handleDownload}>
                  📥 .txt
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={handleDownloadMd}>
                  📝 .md
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={handleDownloadJson}>
                  {t('downloadJson')}
                </button>
              </div>
              <button type="button" className="btn btn--outline btn--sm" onClick={onRegenerate} disabled={!canRegenerate}>
                {t('regenerate')}
              </button>
            </div>
          </div>

          {regenerateWarning && (
            <div className="result-warning">
              <strong>{lang === 'EN' ? 'Regenerate locked.' : 'Regenerate dikunci.'}</strong> {regenerateWarning}
            </div>
          )}

          {currentPromptMeta?.signature && (
            <div className="result-meta">
              <span className="result-meta__chip">
                {lang === 'EN' ? `Source refs: ${currentPromptMeta.imageCount || 0}` : `Sumber referensi: ${currentPromptMeta.imageCount || 0}`}
              </span>
              {currentPromptMeta.productName ? (
                <span className="result-meta__chip">
                  {lang === 'EN' ? `Product: ${currentPromptMeta.productName}` : `Produk: ${currentPromptMeta.productName}`}
                </span>
              ) : null}
              {currentPromptMeta.edited ? (
                <span className="result-meta__chip result-meta__chip--warn">
                  {lang === 'EN' ? 'Edited after generation' : 'Diedit setelah generate'}
                </span>
              ) : null}
              {revisionCompareMeta ? (
                <span className="result-meta__chip">
                  {revisionCompareMeta.originLabel}
                </span>
              ) : null}
              {learnedMemoryCount > 0 ? (
                <span className="result-meta__chip">
                  {lang === 'EN' ? `Learned memory: ${learnedMemoryCount}` : `Memori belajar: ${learnedMemoryCount}`}
                </span>
              ) : null}
              {currentInputMeta?.signature && currentPromptMeta.signature === currentInputMeta.signature ? (
                <span className="result-meta__chip result-meta__chip--ok">
                  {lang === 'EN' ? 'Matches current references' : 'Sesuai dengan referensi aktif'}
                </span>
              ) : null}
            </div>
          )}

          <div className="revision-panel">
            <div className="revision-panel__header">
              <strong>{lang === 'EN' ? 'Refine next generation' : 'Perbaiki generate berikutnya'}</strong>
              <span className="revision-panel__hint">
                {lang === 'EN'
                  ? 'Describe what should change in the next prompt.'
                  : 'Tulis apa yang harus diubah pada prompt berikutnya.'}
              </span>
            </div>
            <textarea
              className="option-textarea revision-panel__textarea"
              value={revisionFeedback}
              onChange={(event) => setRevisionFeedback(event.target.value)}
              placeholder={lang === 'EN'
                ? 'Example: make the hook softer, mention the product name earlier, avoid dramatic lighting, focus on office-girl audience.'
                : 'Contoh: buat hook lebih soft, sebut nama produk lebih awal, hindari lighting dramatis, fokus ke audiens cewek kantor.'}
              rows={3}
            />
            <div className="revision-panel__actions">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setRevisionFeedback('')}
                disabled={!revisionFeedback}
              >
                {lang === 'EN' ? 'Clear note' : 'Hapus catatan'}
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  const trimmed = revisionFeedback.trim();
                  if (!trimmed || !onRegenerateWithFeedback) return;
                  onRegenerateWithFeedback(trimmed);
                  setRevisionFeedback('');
                }}
                disabled={!revisionFeedback.trim() || !canRegenerate}
              >
                {lang === 'EN' ? 'Regenerate with feedback' : 'Regenerate dengan feedback'}
              </button>
            </div>
          </div>

          {revisionCompareMeta ? (
            <div className="revision-compare">
              <div className="revision-compare__header">
                <div>
                  <strong>{lang === 'EN' ? 'Revision memory' : 'Memori revisi'}</strong>
                  <div className="revision-compare__subhead">
                    {revisionCompareMeta.originLabel}
                    {revisionCompareMeta.originPreset ? ` • ${revisionCompareMeta.originPreset}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => setCompareHistoryId((prev) => (
                    prev === currentPromptMeta?.historyId ? null : currentPromptMeta?.historyId
                  ))}
                >
                  {showRevisionCompare
                    ? (lang === 'EN' ? 'Hide compare' : 'Sembunyikan compare')
                    : (lang === 'EN' ? 'Compare revision' : 'Bandingkan revisi')}
                </button>
              </div>
              {revisionCompareMeta.revisionFeedback ? (
                <div className="revision-compare__feedback">
                  <strong>{lang === 'EN' ? 'User feedback:' : 'Feedback user:'}</strong> {revisionCompareMeta.revisionFeedback}
                </div>
              ) : null}
              {showRevisionCompare ? (
                <div className="revision-compare__grid">
                  <div className="revision-compare__pane">
                    <div className="revision-compare__label">
                      {lang === 'EN' ? 'Previous version' : 'Versi sebelumnya'}
                    </div>
                    <pre className="revision-compare__content">{revisionCompareMeta.previousPromptSnapshot}</pre>
                  </div>
                  <div className="revision-compare__pane">
                    <div className="revision-compare__label">
                      {lang === 'EN' ? 'Current version' : 'Versi saat ini'}
                    </div>
                    <pre className="revision-compare__content">{prompt}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {viewMode === 'json' ? (
            <div className="json-output">
              <div className="json-output__header">
                <span className="json-output__badge">{t('jsonStructuredLabel')}</span>
                <span className="json-output__info">{jsonData?.sceneCount || 0} {t('qualitySceneCount').toLowerCase()} • {jsonString.length.toLocaleString()} {t('titleCharUnit')}</span>
              </div>
              <pre className="json-output__content">{jsonString}</pre>
            </div>
          ) : viewMode === 'scenes' && hasScenes ? (
            <div className="scenes-container">
              {parsed.header && (
                <div className="scene-card scene-card--header">
                  <div className="scene-card__header">
                    <div className="scene-card__badge">📝</div>
                    <h4 className="scene-card__title">{t('introContextTitle')}</h4>
                    <button
                      type="button"
                      className="btn btn--copy-scene"
                      onClick={async () => {
                        const ok = await copyToClipboard(parsed.header);
                        if (ok) showToast(t('introCopied'), 'success');
                        else showToast(t('copyFail'), 'error');
                      }}
                    >
                      {t('copy')}
                    </button>
                  </div>
                  <pre className="scene-card__content">{parsed.header}</pre>
                </div>
              )}

              {parsed.scenes.map((scene) => (
                <SceneCard
                  key={`${scene.id}-${scene.start}-${scene.end}-${scene.content}`}
                  scene={scene}
                  onEditScene={handleEditScene}
                />
              ))}
            </div>
          ) : (
            <textarea
              className="result-textarea"
              value={prompt}
              onChange={(e) => onPromptChange?.(e.target.value)}
              rows={20}
            />
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h3 className="history-title">{t('historyTitle')} ({history.length}/20)</h3>
            {onClearHistory && (
              confirmClearHistory ? (
                <div className="history-clear-confirm">
                  <span>{t('clearAllConfirm')}</span>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => { onClearHistory(); setConfirmClearHistory(false); }}>{t('yes')}</button>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConfirmClearHistory(false)}>{t('cancel')}</button>
                </div>
              ) : (
                <button type="button" className="btn btn--outline btn--sm" onClick={() => setConfirmClearHistory(true)}>{t('clearAll')}</button>
              )
            )}
          </div>
          <div className="history-list">
            {history.map((item, index) => {
              const isFav = favorites?.some(f => f.id === item.id);
              return (
                <div
                  key={item.id}
                  className={`history-item ${activeHistoryIndex === index ? 'history-item--active' : ''}`}
                >
                  <button
                    type="button"
                    className="history-item__main"
                    onClick={() => handleHistoryClick(index)}
                  >
                    <span className="history-item__emoji">{item.preset.emoji}</span>
                    <div className="history-item__info">
                      <span className="history-item__name">{item.preset.name}</span>
                      <span className="history-item__time">{item.timestamp}</span>
                      <span className="history-item__meta-line">{buildHistoryMetaLine(item, lang)}</span>
                      {buildHistorySourceLine(item, currentInputMeta, lang) ? (
                        <span className={`history-item__source ${currentInputMeta?.signature && currentInputMeta.signature === item?.meta?.signature ? 'history-item__source--ok' : 'history-item__source--warn'}`}>
                          {buildHistorySourceLine(item, currentInputMeta, lang)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  <div className="history-item__actions">
                    {onToggleFavorite && (
                      <button
                        type="button"
                        className={`history-item__fav ${isFav ? 'history-item__fav--active' : ''}`}
                        onClick={() => onToggleFavorite(item)}
                        title={isFav ? t('unfavorite') : t('favorite')}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>
                    )}
                    {onDeleteHistory && (
                      <button
                        type="button"
                        className="history-item__delete"
                        onClick={() => onDeleteHistory(item.id)}
                        title={t('presetActionDelete')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {favorites && favorites.length > 0 && (
        <div className="history-section favorites-section">
          <div className="history-header">
            <h3 className="history-title">{t('favoritesTitle')} ({favorites.length})</h3>
            {onClearFavorites && (
              <button type="button" className="btn btn--outline btn--sm" onClick={onClearFavorites}>
                {t('clearAll')}
              </button>
            )}
          </div>
          <div className="history-list">
            {favorites.map((item) => (
              <div key={item.id} className="history-item">
                <button
                  type="button"
                  className="history-item__main"
                  onClick={() => {
                    if (onSelectFavorite) {
                      onSelectFavorite(item);
                    } else {
                      onPromptChange?.(item.prompt);
                    }
                  }}
                >
                  <span className="history-item__emoji">{item.preset.emoji}</span>
                  <div className="history-item__info">
                    <span className="history-item__name">{item.preset.name}</span>
                    <span className="history-item__time">{item.timestamp}</span>
                    <span className="history-item__meta-line">{buildHistoryMetaLine(item, lang)}</span>
                    {buildHistorySourceLine(item, currentInputMeta, lang) ? (
                      <span className={`history-item__source ${currentInputMeta?.signature && currentInputMeta.signature === item?.meta?.signature ? 'history-item__source--ok' : 'history-item__source--warn'}`}>
                        {buildHistorySourceLine(item, currentInputMeta, lang)}
                      </span>
                    ) : null}
                  </div>
                </button>
                <button
                  type="button"
                  className="history-item__fav history-item__fav--active"
                  onClick={() => onToggleFavorite(item)}
                  title={t('unfavorite')}
                >
                  ⭐
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
