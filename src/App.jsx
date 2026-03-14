import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import UploadPanel from './components/UploadPanel';
import PresetSelector from './components/PresetSelector';
import AdvancedOptions from './components/AdvancedOptions';
import PromptOutput from './components/PromptOutput';
import TitleGenerator from './components/TitleGenerator';
import SettingsModal from './components/SettingsModal';
import CustomPresetModal from './components/CustomPresetModal';
import Toast from './components/Toast';
import useToast from './hooks/useToast';
import { useI18n } from './hooks/useI18n';
import GrokPiStudio from './components/GrokPiStudio';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useGeneration from './hooks/useGeneration';
import useAnalyzePreset from './hooks/useAnalyzePreset';
import useAutofillOptions from './hooks/useAutofillOptions';
import useCustomPresets from './hooks/useCustomPresets';
import { showToast } from './lib/toastBus';
import { USE_MOCK, getBackendCapabilities } from './services/gemini';
import { getItem, setItem, KEYS } from './utils/localStorage';
import { downloadTxt } from './utils/downloadTxt';
import { downloadJSON } from './utils/exportFormats';
import { copyToClipboard } from './utils/copy';
import { DEFAULT_OPTIONS } from './constants/defaultOptions';
import { buildDefaultImageReference } from './utils/imageReferences';
import { buildPromptInputMeta } from './utils/promptSession';
import builtInPresets from './data/presets';
import './App.css';

function normalizePreferenceMemory(value) {
  const source = value && typeof value === 'object' ? value : {};
  const avoidTerms = Array.isArray(source.avoidTerms)
    ? [...new Set(source.avoidTerms.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 8)
    : [];
  const steeringNotes = Array.isArray(source.steeringNotes)
    ? [...new Set(source.steeringNotes.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 8)
    : [];

  return { avoidTerms, steeringNotes };
}

function parsePreferenceList(value, max = 8) {
  return [...new Set(
    String(value || '')
      .split(/\n|,|;/)
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  )].slice(0, max);
}

function mergePreferenceMemory(memory, nextSignals = {}) {
  const base = normalizePreferenceMemory(memory);
  const nextAvoidTerms = [
    ...base.avoidTerms,
    ...parsePreferenceList(nextSignals.avoidElements),
  ];
  const nextSteeringNotes = [
    ...base.steeringNotes,
    ...parsePreferenceList(nextSignals.sceneMustIncludeMap),
    ...String(nextSignals.revisionFeedback || '')
      .split(/\n|•|-/)
      .map((item) => String(item || '').trim())
      .filter((item) => item.length >= 12),
  ];

  return normalizePreferenceMemory({
    avoidTerms: nextAvoidTerms,
    steeringNotes: nextSteeringNotes,
  });
}

function App() {
  // Multi-file state
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [imageReferences, setImageReferences] = useState([]);

  // Preset state
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [currentPromptMeta, setCurrentPromptMeta] = useState(null);

  // Advanced options (persisted + backward compatible with old system prompt key)
  const savedAdvancedOptions = useMemo(() => {
    const persistedOptions = getItem(KEYS.SETTINGS, {});
    const savedTemplate = getItem(KEYS.SYSTEM_PROMPT_TEMPLATE, null);
    return {
      ...DEFAULT_OPTIONS,
      ...(persistedOptions && typeof persistedOptions === 'object' ? persistedOptions : {}),
      ...(savedTemplate ? { systemPromptTemplate: savedTemplate } : {}),
    };
  }, []);

  // Advanced options
  const [advancedOptions, setAdvancedOptions] = useState(savedAdvancedOptions);
  const [preferenceMemory, setPreferenceMemory] = useState(() => (
    normalizePreferenceMemory(getItem(KEYS.PROMPT_PREFERENCE_MEMORY, {}))
  ));

  // Restore history from localStorage on first render
  const savedHistory = useMemo(() => getItem(KEYS.HISTORY, []), []);

  // Toast + i18n
  const { toasts } = useToast();
  const { t, lang } = useI18n();

  // Generation hook (manages prompt, loading, progress, history, abort)
  const generationMessages = useMemo(() => ({
    generateSuccess: t('generateSuccess'),
    generateCanceled: t('generateCanceled'),
    generateErrorPrefix: t('generateErrorPrefix'),
  }), [t]);

  const {
    prompt, setPrompt,
    quality, setQuality,
    isLoading, progress, generationStage,
    history, setHistory,
    handleGenerate,
    handleCancelGenerate,
  } = useGeneration({
    files,
    selectedPreset,
    advancedOptions,
    imageReferences,
    initialHistory: savedHistory,
    messages: generationMessages,
    locale: lang === 'EN' ? 'en-US' : 'id-ID',
    onGenerationComplete: setCurrentPromptMeta,
  });

  // Favorites (persisted)
  const [favorites, setFavorites] = useState(() => getItem(KEYS.FAVORITES, []));

  // Custom presets handled by hook

  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    customPresets,
    isCustomPresetOpen, setIsCustomPresetOpen,
    customPresetModalKey,
    editingCustomPreset, setEditingCustomPreset,
    confirmDeletePresetId,
    handleSaveCustomPreset,
    handleCreateCustomPreset,
    handleEditCustomPreset,
    handleDuplicateCustomPreset,
    handleDeleteCustomPreset,
    handleConfirmDeletePreset,
    handleCancelDeletePreset,
  } = useCustomPresets({ lang, t, setSelectedPreset });

  const [activeMenu, setActiveMenu] = useState('prompt');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeMenu]);

  // AI Analyze Preset state handled by custom hook
  const [capabilities, setCapabilities] = useState({ geminiEnabled: true });
  const allPresets = useMemo(() => [...builtInPresets, ...customPresets], [customPresets]);

  const { isAnalyzingPreset, handleAnalyzePreset } = useAnalyzePreset({
    allPresets,
    capabilities,
    setSelectedPreset,
    setAdvancedOptions,
  });
  const {
    isAutofillingOptions,
    handleAutofillEmptyFields,
    autofillDraft,
    applyAutofillDraft,
    discardAutofillDraft,
  } = useAutofillOptions({
    capabilities,
    files,
    selectedPreset,
    advancedOptions,
    preferenceMemory,
    setAdvancedOptions,
  });

  // Cleanup previews on unmount
  const previewsRef = useRef([]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, []);

  // Persist history
  useEffect(() => {
    setItem(KEYS.HISTORY, history);
  }, [history]);

  // Persist favorites
  useEffect(() => {
    setItem(KEYS.FAVORITES, favorites);
  }, [favorites]);

  // Persist advanced options
  useEffect(() => {
    setItem(KEYS.SETTINGS, advancedOptions);
  }, [advancedOptions]);

  useEffect(() => {
    setItem(KEYS.PROMPT_PREFERENCE_MEMORY, preferenceMemory);
  }, [preferenceMemory]);

  useEffect(() => {
    let mounted = true;
    getBackendCapabilities()
      .then((data) => {
        if (!mounted) return;
        setCapabilities({ geminiEnabled: Boolean(data?.geminiEnabled) });
      })
      .catch(() => {
        if (!mounted) return;
        setCapabilities({ geminiEnabled: false });
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Multi-file handlers
  const handleFilesChange = useCallback((newFiles, newPreviews, newReferences) => {
    setFiles(newFiles);
    setImageReferences(
      Array.isArray(newReferences)
        ? newReferences
        : newFiles.map((file, index) => buildDefaultImageReference(file, index)),
    );
    setPreviews((prevPreviews) => {
      const nextPreviewsSet = new Set(newPreviews);
      prevPreviews.forEach((preview) => {
        if (preview && !nextPreviewsSet.has(preview)) {
          URL.revokeObjectURL(preview);
        }
      });
      return newPreviews;
    });
  }, []);

  const handleFileClear = useCallback(() => {
    setFiles([]);
    setImageReferences([]);
    setPreviews((prevPreviews) => {
      prevPreviews.forEach(p => { if (p) URL.revokeObjectURL(p); });
      return [];
    });
  }, []);

  // Favorites handler
  const handleToggleFavorite = useCallback((item) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === item.id);
      if (exists) {
        showToast(t('favoriteRemoved'), 'info');
        return prev.filter(f => f.id !== item.id);
      }
      showToast(t('favoriteAdded'), 'success');
      return [item, ...prev];
    });
  }, [t]);

  const handleClearFavorites = useCallback(() => {
    setFavorites([]);
    showToast(t('favoritesCleared'), 'info');
  }, [t]);

  const handleSelectHistory = useCallback((index) => {
    const item = history[index];
    if (item) {
      setPrompt(item.prompt);
      setQuality(item.quality || null);
      setCurrentPromptMeta(item.meta || null);
      if (item.preset) {
        const restoredPreset = allPresets.find((preset) => preset.id === item.preset.id) || item.preset;
        setSelectedPreset(restoredPreset);
      }
      if (item.options && typeof item.options === 'object') {
        setAdvancedOptions({ ...DEFAULT_OPTIONS, ...item.options });
      }
    }
  }, [allPresets, history, setPrompt, setQuality]);

  const handleSelectFavorite = useCallback((item) => {
    if (!item) return;
    setPrompt(item.prompt);
    setQuality(item.quality || null);
    setCurrentPromptMeta(item.meta || null);
    if (item.preset) {
      const restoredPreset = allPresets.find((preset) => preset.id === item.preset.id) || item.preset;
      setSelectedPreset(restoredPreset);
    }
    if (item.options && typeof item.options === 'object') {
      setAdvancedOptions({ ...DEFAULT_OPTIONS, ...item.options });
    }
  }, [allPresets, setPrompt, setQuality]);

  const handlePromptChange = useCallback((nextPrompt) => {
    setPrompt(nextPrompt);
    setQuality(null);
    setCurrentPromptMeta((prev) => (
      prev ? { ...prev, edited: true } : prev
    ));
  }, [setPrompt, setQuality]);

  const currentInputMeta = useMemo(
    () => buildPromptInputMeta(files, imageReferences),
    [files, imageReferences],
  );
  const buildLearnedOptionOverrides = useCallback(() => {
    const mergedMemory = mergePreferenceMemory(preferenceMemory, {
      avoidElements: advancedOptions.avoidElements,
    });

    return {
      learnedAvoidElements: mergedMemory.avoidTerms,
      learnedSteeringNotes: mergedMemory.steeringNotes,
    };
  }, [advancedOptions.avoidElements, preferenceMemory]);

  const runGenerate = useCallback((generationOverrides = {}) => {
    const safeOverrides = generationOverrides && typeof generationOverrides === 'object' && !('nativeEvent' in generationOverrides)
      && !('target' in generationOverrides)
      ? generationOverrides
      : {};

    const nextSignals = {
      avoidElements: safeOverrides.avoidElements ?? advancedOptions.avoidElements,
      sceneMustIncludeMap: safeOverrides.sceneMustIncludeMap ?? advancedOptions.sceneMustIncludeMap,
      revisionFeedback: safeOverrides.revisionFeedback || '',
    };

    setPreferenceMemory((prev) => mergePreferenceMemory(prev, nextSignals));

    handleGenerate({
      ...buildLearnedOptionOverrides(),
      ...safeOverrides,
    });
  }, [
    advancedOptions.avoidElements,
    advancedOptions.sceneMustIncludeMap,
    buildLearnedOptionOverrides,
    handleGenerate,
  ]);
  const isProductNameValid = Boolean(String(advancedOptions.productName || '').trim());
  const canGenerate = Boolean(files.length > 0 && selectedPreset && isProductNameValid);
  const generateDisabledReason = !files.length
    ? (lang === 'EN' ? 'Upload at least one reference image.' : 'Upload minimal satu foto referensi.')
    : !selectedPreset
      ? (lang === 'EN' ? 'Choose a preset first.' : 'Pilih preset terlebih dahulu.')
      : !isProductNameValid
        ? (lang === 'EN' ? 'Fill in the product name first.' : 'Isi nama produk terlebih dahulu.')
        : '';
  const canRegenerate = Boolean(
    prompt && (
      !currentPromptMeta?.signature
      || currentPromptMeta.signature === currentInputMeta.signature
    )
  );
  const regenerateWarning = !canRegenerate && prompt
    ? (
      lang === 'EN'
        ? 'This prompt was generated from a different image set. Re-attach the original references before regenerating.'
        : 'Prompt ini dibuat dari set gambar yang berbeda. Lampirkan kembali referensi aslinya sebelum regenerate.'
    )
    : '';
  const handleRegenerate = () => {
    if (!currentPromptMeta?.signature || currentPromptMeta.signature === currentInputMeta.signature) {
      runGenerate();
    }
  };
  const handleRegenerateWithFeedback = useCallback((feedback) => {
    if (!feedback || !canRegenerate) return;
    runGenerate({
      revisionFeedback: String(feedback).trim(),
      previousPromptSnapshot: String(prompt || '').trim(),
      revisionBaseHistoryId: currentPromptMeta?.historyId || null,
    });
  }, [canRegenerate, currentPromptMeta?.historyId, prompt, runGenerate]);

  // Delete single history item
  const handleDeleteHistory = useCallback((itemId) => {
    setHistory(prev => prev.filter(item => item.id !== itemId));
    setFavorites(prev => prev.filter(item => item.id !== itemId));
    showToast(t('historyItemDeleted'), 'info');
  }, [setHistory, t]);

  // Clear all history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    showToast(t('historyCleared'), 'info');
  }, [setHistory, t]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+enter': () => {
      if (activeMenu !== 'prompt') return false;
      if (!canGenerate) return false;
      runGenerate();
    },
    'ctrl+s': () => {
      if (activeMenu !== 'prompt') return false;
      if (!prompt) return false;
      downloadTxt(prompt, `tiktok-prompt-${Date.now()}`);
      showToast(t('downloadSuccess'), 'success');
    },
    'ctrl+shift+s': () => {
      if (activeMenu !== 'prompt') return false;
      if (!prompt) return false;
      downloadJSON(prompt, selectedPreset, advancedOptions, `tiktok-prompt-${Date.now()}`, { quality });
      showToast(t('downloadSuccess'), 'success');
    },
    'ctrl+c': (event) => {
      if (activeMenu !== 'prompt') return false;
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      const isEditableTarget = target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
      const hasSelection = Boolean(window.getSelection?.().toString());
      if (!prompt || isEditableTarget || hasSelection) return false;

      void copyToClipboard(prompt).then((ok) => {
        showToast(ok ? t('copySuccess') : t('copyFail'), ok ? 'success' : 'error');
      });
    },
    'ctrl+k': () => setIsSettingsOpen(prev => !prev),
    'ctrl+1': () => setActiveMenu('prompt'),
    'ctrl+2': () => setActiveMenu('title'),
    'ctrl+3': () => setActiveMenu('grokpi'),
    'escape': () => {
      setIsSettingsOpen(false);
      setIsCustomPresetOpen(false);
      setEditingCustomPreset(null);
    },
  });

  return (
    <div className="app">
      <a href="#app-main-content" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="header-logo">
              <span className="logo-icon">💃</span>
              <div className="logo-pulse" />
            </div>
            <div>
              <h1 className="header-title">{t('headerTitle')}</h1>
              <p className="header-subtitle">{t('headerSubtitle')}</p>
              <div className="header-menu">
                <button
                  type="button"
                  className={`header-menu__btn ${activeMenu === 'prompt' ? 'header-menu__btn--active' : ''}`}
                  onClick={() => setActiveMenu('prompt')}
                  aria-label={t('menuPromptGenerator')}
                >
                  {t('menuPromptGenerator')}
                </button>
                <button
                  type="button"
                  className={`header-menu__btn ${activeMenu === 'title' ? 'header-menu__btn--active' : ''}`}
                  onClick={() => setActiveMenu('title')}
                  aria-label={t('menuTitleGenerator')}
                >
                  {t('menuTitleGenerator')}
                </button>
                <button
                  type="button"
                  className={`header-menu__btn ${activeMenu === 'grokpi' ? 'header-menu__btn--active' : ''}`}
                  onClick={() => setActiveMenu('grokpi')}
                  aria-label={t('menuGrokPiStudio')}
                >
                  {t('menuGrokPiStudio')}
                </button>
              </div>
            </div>
          </div>
          <div className="header-badges">
            <button
              className="btn btn--icon btn--settings"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings (Ctrl+K)"
              aria-label="Open settings"
            >
              ⚙️
            </button>
            <span className="version-badge">v2.0</span>
            <span className={`mode-badge ${USE_MOCK ? '' : 'mode-badge--live'}`}>
              {USE_MOCK ? t('mockMode') : t('liveMode')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="app-main-content" className="app-main">
        {activeMenu === 'prompt' ? (
          <>
            <div className="main-grid">
              {/* Left Column: Upload + Preview */}
              <div className="column column--left">
                <UploadPanel
                  files={files}
                  previews={previews}
                  imageReferences={imageReferences}
                  onFilesChange={handleFilesChange}
                  onClear={handleFileClear}
                  onAnalyzePreset={() => handleAnalyzePreset(files)}
                  canAnalyzePreset={capabilities.geminiEnabled}
                  isAnalyzing={isAnalyzingPreset}
                />
              </div>

              {/* Right Column: Preset + Options */}
              <div className="column column--right">
                <PresetSelector
                  presets={allPresets}
                  selectedPreset={selectedPreset}
                  onSelect={setSelectedPreset}
                  onCreateCustom={handleCreateCustomPreset}
                  onEditCustom={handleEditCustomPreset}
                  onDuplicateCustom={handleDuplicateCustomPreset}
                  onDeleteCustom={handleDeleteCustomPreset}
                />
                <AdvancedOptions
                  options={advancedOptions}
                  onChange={setAdvancedOptions}
                  preferenceMemory={preferenceMemory}
                  onClearPreferenceMemory={() => setPreferenceMemory({ avoidTerms: [], steeringNotes: [] })}
                  onAutofillEmptyFields={handleAutofillEmptyFields}
                  isAutofillingOptions={isAutofillingOptions}
                  canAutofill={Boolean(files.length > 0 && selectedPreset && capabilities.geminiEnabled)}
                  autofillDraft={autofillDraft}
                  onApplyAutofillDraft={applyAutofillDraft}
                  onDiscardAutofillDraft={discardAutofillDraft}
                />
              </div>
            </div>

            {/* Bottom Section: Output + History */}
            <div className="output-section">
              <PromptOutput
                prompt={prompt}
                isLoading={isLoading}
                progress={progress}
                generationStage={generationStage}
                quality={quality}
                onRegenerate={handleRegenerate}
                onRegenerateWithFeedback={handleRegenerateWithFeedback}
                history={history}
                onSelectHistory={handleSelectHistory}
                onDeleteHistory={handleDeleteHistory}
                onClearHistory={handleClearHistory}
                canGenerate={canGenerate}
                generateDisabledReason={generateDisabledReason}
                onGenerate={runGenerate}
                onCancelGenerate={() => handleCancelGenerate(true)}
                onPromptChange={handlePromptChange}
                selectedPreset={selectedPreset}
                advancedOptions={advancedOptions}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onSelectFavorite={handleSelectFavorite}
                onClearFavorites={handleClearFavorites}
                currentInputMeta={currentInputMeta}
                currentPromptMeta={currentPromptMeta}
                canRegenerate={canRegenerate}
                regenerateWarning={regenerateWarning}
                preferenceMemory={preferenceMemory}
              />
            </div>
          </>
        ) : activeMenu === 'title' ? (
          <div className="title-generator-page">
            <TitleGenerator />
          </div>
        ) : activeMenu === 'grokpi' ? (
          <div className="title-generator-page">
            <GrokPiStudio
              presets={allPresets}
              initialPreset={selectedPreset}
              initialPromptOptions={advancedOptions}
            />
          </div>
        ) : (
          <div className="title-generator-page">
            <TitleGenerator />
          </div>
        )}
      </main>

      {/* Keyboard Shortcut Hint */}
      <div className="shortcut-hint">
        <kbd>Ctrl</kbd>+<kbd>1</kbd> Prompt &bull; <kbd>Ctrl</kbd>+<kbd>2</kbd> Title &bull; <kbd>Ctrl</kbd>+<kbd>3</kbd> GrokPI &bull; <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Generate &bull; <kbd>Ctrl</kbd>+<kbd>C</kbd> Copy &bull; <kbd>Ctrl</kbd>+<kbd>S</kbd> TXT &bull; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> JSON &bull; <kbd>Ctrl</kbd>+<kbd>K</kbd> Settings
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <p>{t('footerText')}</p>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <CustomPresetModal
        key={customPresetModalKey}
        isOpen={isCustomPresetOpen}
        onClose={() => {
          setIsCustomPresetOpen(false);
          setEditingCustomPreset(null);
        }}
        onSave={handleSaveCustomPreset}
        editPreset={editingCustomPreset}
      />

      {/* Confirm Delete Preset Dialog */}
      {confirmDeletePresetId && (
        <div className="modal-overlay" onClick={handleCancelDeletePreset}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p>{t('confirmDeletePreset')}</p>
            <div className="confirm-dialog__actions">
              <button className="btn btn--danger" onClick={handleConfirmDeletePreset}>{t('presetActionDelete')}</button>
              <button className="btn btn--secondary" onClick={handleCancelDeletePreset}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toast toasts={toasts} />
    </div>
  );
}

export default App;
