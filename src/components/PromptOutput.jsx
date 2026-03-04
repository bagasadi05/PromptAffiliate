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

export default function PromptOutput({
  prompt,
  isLoading,
  progress,
  quality,
  onRegenerate,
  history,
  onSelectHistory,
  onDeleteHistory,
  onClearHistory,
  canGenerate,
  onGenerate,
  onCancelGenerate,
  onPromptChange,
  selectedPreset,
  advancedOptions,
  favorites,
  onToggleFavorite,
  onSelectFavorite,
  onClearFavorites,
}) {
  const { t, lang } = useI18n();
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(null);
  const [viewMode, setViewMode] = useState('scenes'); // 'scenes' | 'raw' | 'json'
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

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
            onClick={onGenerate}
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
            {t('generateHint')}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="progress-section">
          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-steps">
            <span className={`progress-step ${progress >= 20 ? 'progress-step--done' : ''}`}>
              {t('progressAnalyze')}
            </span>
            <span className={`progress-step ${progress >= 50 ? 'progress-step--done' : ''}`}>
              {t('progressMap')}
            </span>
            <span className={`progress-step ${progress >= 75 ? 'progress-step--done' : ''}`}>
              {t('progressBuild')}
            </span>
            <span className={`progress-step ${progress >= 95 ? 'progress-step--done' : ''}`}>
              {t('progressPolish')}
            </span>
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
              <button type="button" className="btn btn--outline btn--sm" onClick={onRegenerate}>
                {t('regenerate')}
              </button>
            </div>
          </div>

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
