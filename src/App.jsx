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
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useGeneration from './hooks/useGeneration';
import { showToast } from './lib/toastBus';
import { USE_MOCK } from './services/gemini';
import { getItem, setItem, KEYS } from './utils/localStorage';
import { downloadTxt } from './utils/downloadTxt';
import { downloadJSON } from './utils/exportFormats';
import { copyToClipboard } from './utils/copy';
import { DEFAULT_OPTIONS } from './constants/defaultOptions';
import { buildDefaultImageReference } from './utils/imageReferences';
import builtInPresets from './data/presets';
import './App.css';

function App() {
  // Multi-file state
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [imageReferences, setImageReferences] = useState([]);

  // Preset state
  const [selectedPreset, setSelectedPreset] = useState(null);

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
    isLoading, progress,
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
  });

  // Favorites (persisted)
  const [favorites, setFavorites] = useState(() => getItem(KEYS.FAVORITES, []));

  // Custom presets (persisted)
  const [customPresets, setCustomPresets] = useState(() => getItem(KEYS.CUSTOM_PRESETS, []));

  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomPresetOpen, setIsCustomPresetOpen] = useState(false);
  const [customPresetModalKey, setCustomPresetModalKey] = useState(0);
  const [editingCustomPreset, setEditingCustomPreset] = useState(null);
  const [activeMenu, setActiveMenu] = useState('prompt');

  // Merge built-in + custom presets
  const allPresets = useMemo(() => [...builtInPresets, ...customPresets], [customPresets]);

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

  // Persist custom presets
  useEffect(() => {
    setItem(KEYS.CUSTOM_PRESETS, customPresets);
  }, [customPresets]);

  // Persist advanced options
  useEffect(() => {
    setItem(KEYS.SETTINGS, advancedOptions);
  }, [advancedOptions]);

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

  // Custom preset handlers — handles both create and update
  const handleSaveCustomPreset = useCallback((presetData) => {
    setCustomPresets(prev => {
      const existingIdx = prev.findIndex(p => p.id === presetData.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = presetData;
        showToast(t('customPresetUpdated'), 'success');
        return updated;
      }
      showToast(t('customPresetSaved'), 'success');
      return [...prev, presetData];
    });
    setIsCustomPresetOpen(false);
    setEditingCustomPreset(null);
  }, [t]);

  const [confirmDeletePresetId, setConfirmDeletePresetId] = useState(null);

  const handleCreateCustomPreset = useCallback(() => {
    setEditingCustomPreset(null);
    setCustomPresetModalKey((prev) => prev + 1);
    setIsCustomPresetOpen(true);
  }, []);

  const handleEditCustomPreset = useCallback((presetId) => {
    const preset = customPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setEditingCustomPreset(preset);
    setCustomPresetModalKey((prev) => prev + 1);
    setIsCustomPresetOpen(true);
  }, [customPresets]);

  const handleDuplicateCustomPreset = useCallback((presetId) => {
    const sourcePreset = customPresets.find((item) => item.id === presetId);
    if (!sourcePreset) return;

    const duplicateSuffix = lang === 'ID' ? '(Salinan)' : '(Copy)';
    const duplicatedPreset = {
      ...sourcePreset,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${sourcePreset.name} ${duplicateSuffix}`,
      isCustom: true,
    };

    setCustomPresets((prev) => [duplicatedPreset, ...prev]);
    setSelectedPreset(duplicatedPreset);
    showToast(t('customPresetDuplicated'), 'success');
  }, [customPresets, lang, t]);

  const handleDeleteCustomPreset = useCallback((presetId) => {
    setConfirmDeletePresetId(presetId);
  }, []);

  const handleConfirmDeletePreset = useCallback(() => {
    if (!confirmDeletePresetId) return;
    setCustomPresets(prev => prev.filter(p => p.id !== confirmDeletePresetId));
    if (selectedPreset?.id === confirmDeletePresetId) setSelectedPreset(null);
    showToast(t('customPresetDeleted'), 'success');
    setConfirmDeletePresetId(null);
  }, [confirmDeletePresetId, selectedPreset, t]);

  const handleCancelDeletePreset = useCallback(() => {
    setConfirmDeletePresetId(null);
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

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleSelectHistory = useCallback((index) => {
    const item = history[index];
    if (item) {
      setPrompt(item.prompt);
      setQuality(item.quality || null);
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
    if (item.preset) {
      const restoredPreset = allPresets.find((preset) => preset.id === item.preset.id) || item.preset;
      setSelectedPreset(restoredPreset);
    }
    if (item.options && typeof item.options === 'object') {
      setAdvancedOptions({ ...DEFAULT_OPTIONS, ...item.options });
    }
  }, [allPresets, setPrompt, setQuality]);

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
      handleGenerate();
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
    'escape': () => {
      setIsSettingsOpen(false);
      setIsCustomPresetOpen(false);
      setEditingCustomPreset(null);
    },
  });

  const handlePromptChange = useCallback((nextPrompt) => {
    setPrompt(nextPrompt);
    setQuality(null);
  }, [setPrompt, setQuality]);

  const canGenerate = Boolean(files.length > 0 && selectedPreset);

  return (
    <div className="app">
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
                >
                  {t('menuPromptGenerator')}
                </button>
                <button
                  type="button"
                  className={`header-menu__btn ${activeMenu === 'title' ? 'header-menu__btn--active' : ''}`}
                  onClick={() => setActiveMenu('title')}
                >
                  {t('menuTitleGenerator')}
                </button>
              </div>
            </div>
          </div>
          <div className="header-badges">
            <button
              className="btn btn--icon btn--settings"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings (Ctrl+K)"
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
      <main className="app-main">
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
                />
              </div>
            </div>

            {/* Bottom Section: Output + History */}
            <div className="output-section">
              <PromptOutput
                prompt={prompt}
                isLoading={isLoading}
                progress={progress}
                quality={quality}
                onRegenerate={handleRegenerate}
                history={history}
                onSelectHistory={handleSelectHistory}
                onDeleteHistory={handleDeleteHistory}
                onClearHistory={handleClearHistory}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                onCancelGenerate={() => handleCancelGenerate(true)}
                onPromptChange={handlePromptChange}
                selectedPreset={selectedPreset}
                advancedOptions={advancedOptions}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onSelectFavorite={handleSelectFavorite}
                onClearFavorites={handleClearFavorites}
              />
            </div>
          </>
        ) : (
          <div className="title-generator-page">
            <TitleGenerator />
          </div>
        )}
      </main>

      {/* Keyboard Shortcut Hint */}
      <div className="shortcut-hint">
        <kbd>Ctrl</kbd>+<kbd>1</kbd> Prompt &bull; <kbd>Ctrl</kbd>+<kbd>2</kbd> Title &bull; <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Generate &bull; <kbd>Ctrl</kbd>+<kbd>C</kbd> Copy &bull; <kbd>Ctrl</kbd>+<kbd>S</kbd> TXT &bull; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> JSON &bull; <kbd>Ctrl</kbd>+<kbd>K</kbd> Settings
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
