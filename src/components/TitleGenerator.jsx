import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeProductByImage, generateTitles } from '../services/gemini';
import { copyToClipboard } from '../utils/copy';
import { downloadTxt } from '../utils/downloadTxt';
import { showToast } from '../lib/toastBus';
import { useI18n } from '../hooks/useI18n';
import { fileToBase64 } from '../utils/fileToBase64';
import { compressImage } from '../utils/imageCompression';

const DEFAULT_FORM = {
  productName: '',
  productCategory: '',
  targetAudience: '',
  keyBenefitsText: '',
  keywordsText: '',
  tone: 'viral',
  language: 'ID',
  titleCount: 10,
  maxLength: 60,
  includeEmoji: true,
  customInstructions: '',
  creativity: 85,
};

function parseLineList(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCommaList(text) {
  return String(text || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function TitleGenerator() {
  const { t, lang } = useI18n();
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    language: lang === 'EN' ? 'EN' : 'ID',
  }));
  const [titles, setTitles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState([]);
  const [analysisImageFile, setAnalysisImageFile] = useState(null);
  const [analysisPreview, setAnalysisPreview] = useState('');
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const titleAbortRef = useRef(null);
  const analyzeAbortRef = useRef(null);
  const analysisInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (titleAbortRef.current) titleAbortRef.current.abort();
      if (analyzeAbortRef.current) analyzeAbortRef.current.abort();
      if (analysisPreview) URL.revokeObjectURL(analysisPreview);
    };
  }, [analysisPreview]);

  const toneOptions = useMemo(() => ([
    { value: 'viral', label: t('titleToneViral') },
    { value: 'soft-sell', label: t('titleToneSoftSell') },
    { value: 'urgency', label: t('titleToneUrgency') },
    { value: 'educational', label: t('titleToneEducational') },
    { value: 'premium', label: t('titleTonePremium') },
  ]), [t]);

  const handleField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    const productName = form.productName.trim();
    if (!productName) {
      showToast(t('titleProductRequired'), 'warning');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (titleAbortRef.current) titleAbortRef.current.abort();
    const controller = new AbortController();
    titleAbortRef.current = controller;

    setIsLoading(true);
    try {
      const result = await generateTitles({
        productName,
        productCategory: form.productCategory,
        targetAudience: form.targetAudience,
        keyBenefits: parseLineList(form.keyBenefitsText),
        keywords: parseCommaList(form.keywordsText),
        tone: form.tone,
        language: form.language,
        titleCount: Number(form.titleCount),
        includeEmoji: Boolean(form.includeEmoji),
        maxLength: Number(form.maxLength),
        customInstructions: form.customInstructions,
        creativity: Number(form.creativity),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      const nextTitles = Array.isArray(result?.titles) ? result.titles : [];
      setTitles(nextTitles);

      if (nextTitles.length > 0) {
        setHistory((prev) => [
          {
            id: Date.now(),
            productName,
            titles: nextTitles,
            timestamp: new Date().toLocaleTimeString(lang === 'ID' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ].slice(0, 12));
        showToast(t('titleGenerateSuccess'), 'success');
      } else {
        showToast(t('titleGenerateEmpty'), 'warning');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 5000);
    } finally {
      if (titleAbortRef.current === controller) titleAbortRef.current = null;
      setIsLoading(false);
    }
  }, [form, lang, t]);

  const handleSelectAnalysisImage = useCallback(async (file) => {
    if (!file) return;

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;

    if (!acceptedTypes.includes(file.type)) {
      showToast(t('uploadFormatError'), 'error');
      return;
    }
    if (file.size > maxSize) {
      showToast(t('uploadSizeError'), 'error');
      return;
    }

    let processedFile = file;
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.86 });
      processedFile = compressed.file;
    } catch {
      processedFile = file;
    }

    setAnalysisImageFile(processedFile);
    setAnalysisSummary(null);
    setAnalysisPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(processedFile);
    });
  }, [t]);

  const handleAnalysisInputChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleSelectAnalysisImage(file);
    }
    event.target.value = '';
  }, [handleSelectAnalysisImage]);

  const handleAnalyzeProduct = useCallback(async () => {
    if (!analysisImageFile) {
      showToast(t('titleAnalysisImageRequired'), 'warning');
      return;
    }

    if (analyzeAbortRef.current) analyzeAbortRef.current.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    setIsAnalyzing(true);

    try {
      const imageBase64 = await fileToBase64(analysisImageFile);
      const analysis = await analyzeProductByImage({
        imageBase64,
        imageMimeType: analysisImageFile.type,
        language: form.language,
        customContext: form.customInstructions,
        creativity: form.creativity,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      if (!analysis) {
        showToast(t('titleAnalysisNoResult'), 'warning');
        return;
      }

      setForm((prev) => ({
        ...prev,
        productName: analysis.productName || prev.productName,
        productCategory: analysis.productCategory || prev.productCategory,
        targetAudience: analysis.targetAudience || prev.targetAudience,
        keyBenefitsText: Array.isArray(analysis.keyBenefits) && analysis.keyBenefits.length > 0
          ? analysis.keyBenefits.join('\n')
          : prev.keyBenefitsText,
        keywordsText: Array.isArray(analysis.keywords) && analysis.keywords.length > 0
          ? analysis.keywords.join(', ')
          : prev.keywordsText,
      }));

      setAnalysisSummary({
        summary: analysis.summary || '',
        confidence: Number.isFinite(Number(analysis.confidence)) ? Number(analysis.confidence) : null,
      });
      showToast(t('titleAnalysisSuccess'), 'success');
    } catch (error) {
      if (error.name === 'AbortError') return;
      showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 5000);
    } finally {
      if (analyzeAbortRef.current === controller) analyzeAbortRef.current = null;
      setIsAnalyzing(false);
    }
  }, [analysisImageFile, form.language, form.customInstructions, form.creativity, t]);

  const handleClearAnalysisImage = useCallback(() => {
    setAnalysisImageFile(null);
    setAnalysisSummary(null);
    setAnalysisPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (titles.length === 0) return;
    const text = titles.map((title, index) => `${index + 1}. ${title}`).join('\n');
    const ok = await copyToClipboard(text);
    showToast(ok ? t('titleCopiedAll') : t('copyFail'), ok ? 'success' : 'error');
  }, [titles, t]);

  const handleCopyOne = useCallback(async (title) => {
    const ok = await copyToClipboard(title);
    showToast(ok ? t('titleCopied') : t('copyFail'), ok ? 'success' : 'error');
  }, [t]);

  const handleDownload = useCallback(() => {
    if (titles.length === 0) return;
    const text = titles.map((title, index) => `${index + 1}. ${title}`).join('\n');
    downloadTxt(text, `tiktok-title-${Date.now()}`);
    showToast(t('downloadSuccess'), 'success');
  }, [titles, t]);

  const handleUseHistory = useCallback((item) => {
    setTitles(item.titles);
  }, []);

  return (
    <div className="title-generator">
      <div className="panel-header">
        <h2>{t('titleGeneratorTitle')}</h2>
        <span className="panel-badge">{t('titleGeneratorBadge')}</span>
      </div>

      <div className="title-generator__card">
        <div className="title-analysis">
          <div className="title-analysis__header">
            <h3>{t('titleAnalysisTitle')}</h3>
            <span className="meta-badge">{t('titleAnalysisBadge')}</span>
          </div>
          {analysisPreview ? (
            <div className="title-analysis__preview-wrap">
              <img src={analysisPreview} alt={t('titleAnalysisPreviewAlt')} className="title-analysis__preview" />
              <div className="title-analysis__preview-actions">
                <button type="button" className="btn btn--outline btn--sm" onClick={() => analysisInputRef.current?.click()}>
                  {t('titleAnalysisChangeImage')}
                </button>
                <button type="button" className="btn btn--danger btn--sm" onClick={handleClearAnalysisImage}>
                  {t('titleAnalysisRemoveImage')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="title-analysis__dropzone"
              onClick={() => analysisInputRef.current?.click()}
            >
              <span className="title-analysis__dropzone-title">{t('titleAnalysisUploadTitle')}</span>
              <span className="title-analysis__dropzone-sub">{t('titleAnalysisUploadHint')}</span>
            </button>
          )}

          <input
            ref={analysisInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleAnalysisInputChange}
          />

          <div className="title-analysis__actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleAnalyzeProduct}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? t('titleAnalysisLoading') : t('titleAnalysisBtn')}
            </button>
          </div>

          {analysisSummary && (
            <div className="title-analysis__summary">
              {analysisSummary.confidence !== null && (
                <div className="title-analysis__confidence">
                  {t('titleAnalysisConfidence')}: {analysisSummary.confidence}%
                </div>
              )}
              {analysisSummary.summary && (
                <p>{analysisSummary.summary}</p>
              )}
            </div>
          )}
        </div>

        <div className="title-generator__grid">
          <div className="option-group">
            <label className="option-label">{t('titleProductName')}</label>
            <input
              className="option-input"
              value={form.productName}
              onChange={(event) => handleField('productName', event.target.value)}
              placeholder={t('titleProductNamePlaceholder')}
            />
          </div>

          <div className="option-group">
            <label className="option-label">{t('titleCategory')}</label>
            <input
              className="option-input"
              value={form.productCategory}
              onChange={(event) => handleField('productCategory', event.target.value)}
              placeholder={t('titleCategoryPlaceholder')}
            />
          </div>

          <div className="option-group">
            <label className="option-label">{t('titleAudience')}</label>
            <input
              className="option-input"
              value={form.targetAudience}
              onChange={(event) => handleField('targetAudience', event.target.value)}
              placeholder={t('titleAudiencePlaceholder')}
            />
          </div>

          <div className="option-group">
            <label className="option-label">{t('titleKeywords')}</label>
            <input
              className="option-input"
              value={form.keywordsText}
              onChange={(event) => handleField('keywordsText', event.target.value)}
              placeholder={t('titleKeywordsPlaceholder')}
            />
          </div>
        </div>

        <div className="option-group">
          <label className="option-label">{t('titleBenefits')}</label>
          <textarea
            className="option-textarea"
            rows={4}
            value={form.keyBenefitsText}
            onChange={(event) => handleField('keyBenefitsText', event.target.value)}
            placeholder={t('titleBenefitsPlaceholder')}
          />
        </div>

        <div className="title-generator__grid">
          <div className="option-group">
            <label className="option-label">{t('titleTone')}</label>
            <select
              className="option-select"
              value={form.tone}
              onChange={(event) => handleField('tone', event.target.value)}
            >
              {toneOptions.map((tone) => (
                <option key={tone.value} value={tone.value}>{tone.label}</option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label className="option-label">{t('titleLanguage')}</label>
            <select
              className="option-select"
              value={form.language}
              onChange={(event) => handleField('language', event.target.value)}
            >
              <option value="ID">{t('languageIndonesian')}</option>
              <option value="EN">{t('languageEnglish')}</option>
            </select>
          </div>
        </div>

        <div className="title-generator__grid">
          <div className="option-group">
            <label className="option-label">{t('titleCount')}</label>
            <input
              className="option-range"
              type="range"
              min="5"
              max="20"
              step="1"
              value={form.titleCount}
              onChange={(event) => handleField('titleCount', Number(event.target.value))}
            />
            <span className="option-hint">{form.titleCount} {t('titleCountUnit')}</span>
          </div>

          <div className="option-group">
            <label className="option-label">{t('titleMaxLength')}</label>
            <input
              className="option-range"
              type="range"
              min="40"
              max="90"
              step="1"
              value={form.maxLength}
              onChange={(event) => handleField('maxLength', Number(event.target.value))}
            />
            <span className="option-hint">{form.maxLength} {t('titleCharUnit')}</span>
          </div>
        </div>

        <div className="title-generator__grid">
          <div className="option-group">
            <label className="option-label">{t('advancedCreativityLabel')}</label>
            <input
              className="option-range"
              type="range"
              min="0"
              max="100"
              value={form.creativity}
              onChange={(event) => handleField('creativity', Number(event.target.value))}
            />
            <span className="option-hint">{form.creativity}%</span>
          </div>

          <div className="option-group option-group--inline">
            <label className="option-label">{t('titleEmoji')}</label>
            <button
              type="button"
              className={`option-switch ${form.includeEmoji ? 'option-switch--on' : ''}`}
              onClick={() => handleField('includeEmoji', !form.includeEmoji)}
              aria-pressed={form.includeEmoji}
            >
              <span className="switch-thumb" />
              <span className="switch-label">
                {form.includeEmoji ? t('switchOn') : t('switchOff')}
              </span>
            </button>
          </div>
        </div>

        <div className="option-group">
          <label className="option-label">{t('customLabel')}</label>
          <textarea
            className="option-textarea"
            rows={3}
            value={form.customInstructions}
            onChange={(event) => handleField('customInstructions', event.target.value)}
            placeholder={t('titleCustomPlaceholder')}
          />
        </div>

        <div className="title-generator__actions">
          <button
            type="button"
            className="btn btn--generate"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? t('generating') : t('titleGenerateBtn')}
          </button>
        </div>
      </div>

      <div className="title-generator__result">
        <div className="title-generator__result-header">
          <h3>{t('titleResultTitle')}</h3>
          <div className="result-actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={handleCopyAll} disabled={titles.length === 0}>
              {t('copyAll')}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleDownload} disabled={titles.length === 0}>
              {t('downloadTxt')}
            </button>
          </div>
        </div>

        {titles.length === 0 ? (
          <p className="title-generator__empty">{t('titleEmpty')}</p>
        ) : (
          <div className="title-generator__list">
            {titles.map((title, index) => (
              <div key={`${index}-${title}`} className="title-item">
                <div className="title-item__left">
                  <span className="title-item__index">{index + 1}</span>
                  <p className="title-item__text">{title}</p>
                </div>
                <div className="title-item__meta">
                  <span className="title-item__len">{title.length} {t('titleCharUnit')}</span>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => handleCopyOne(title)}>
                    {t('copy')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="title-generator__history">
          <div className="history-header">
            <h3 className="history-title">{t('titleHistoryTitle')} ({history.length})</h3>
          </div>
          <div className="history-list">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className="history-item__main title-history-item"
                onClick={() => handleUseHistory(item)}
              >
                <span className="history-item__emoji">🏷️</span>
                <div className="history-item__info">
                  <span className="history-item__name">{item.productName}</span>
                  <span className="history-item__time">{item.timestamp} • {item.titles.length} {t('titleCountUnit')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
