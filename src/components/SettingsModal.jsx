import { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { getItem, setItem, removeItem, KEYS } from '../utils/localStorage';

export default function SettingsModal({ isOpen, onClose }) {
    const { theme, setTheme } = useTheme();
    const { lang, switchLang, t } = useI18n();
    const storedKey = isOpen ? getItem(KEYS.API_KEY, '') : '';
    const [apiKey, setApiKey] = useState(storedKey);
    const [hasKey, setHasKey] = useState(!!storedKey);
    const [showKey, setShowKey] = useState(false);

    const shortcutsList = useMemo(() => ([
        { keys: 'Ctrl + Enter', action: t('shortcutGenerateAction') },
        { keys: 'Ctrl + C', action: t('shortcutCopyAction') },
        { keys: 'Ctrl + S', action: t('shortcutDownloadTxtAction') },
        { keys: 'Ctrl + Shift + S', action: t('shortcutDownloadJsonAction') },
        { keys: 'Escape', action: t('shortcutEscapeAction') },
        { keys: 'Ctrl + K', action: t('shortcutSettingsAction') },
    ]), [t]);

    // Sync key state when modal opens
    const prevIsOpen = useRef(false);
    useEffect(() => {
        if (isOpen && !prevIsOpen.current) {
            const stored = getItem(KEYS.API_KEY, '');
            // Use a microtask to avoid synchronous setState in effect
            queueMicrotask(() => {
                setApiKey(stored);
                setHasKey(!!stored);
            });
        }
        prevIsOpen.current = isOpen;
    }, [isOpen]);

    const handleSaveKey = () => {
        if (apiKey.trim()) {
            setItem(KEYS.API_KEY, apiKey.trim());
            setHasKey(true);
        }
    };

    const handleRemoveKey = () => {
        removeItem(KEYS.API_KEY);
        setApiKey('');
        setHasKey(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal settings-modal">
                <div className="modal-header">
                    <h2>{t('settingsTitle')}</h2>
                    <button className="btn--icon" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {/* API Key */}
                    <div className="settings-section">
                        <label className="settings-label">{t('apiKeyLabel')}</label>
                        <div className="api-key-input-row">
                            <div className="api-key-input-wrapper">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    className="settings-input"
                                    placeholder={t('apiKeyPlaceholder')}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                                <button
                                    className="api-key-toggle"
                                    onClick={() => setShowKey(!showKey)}
                                    title={showKey ? t('hideKey') : t('showKey')}
                                >
                                    {showKey ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <button className="btn btn--primary btn--sm" onClick={handleSaveKey}>{t('apiKeySave')}</button>
                            {hasKey && (
                                <button className="btn btn--danger btn--sm" onClick={handleRemoveKey}>{t('apiKeyRemove')}</button>
                            )}
                        </div>
                        <span className={`settings-hint ${hasKey ? 'settings-hint--success' : ''}`}>
                            {hasKey ? t('apiKeyStatus') : t('apiKeyEmpty')}
                        </span>
                    </div>

                    {/* Theme */}
                    <div className="settings-section">
                        <label className="settings-label">{t('themeLabel')}</label>
                        <div className="option-toggle-group">
                            <button
                                className={`option-toggle ${theme === 'dark' ? 'option-toggle--active' : ''}`}
                                onClick={() => setTheme('dark')}
                            >
                                {t('themeDark')}
                            </button>
                            <button
                                className={`option-toggle ${theme === 'light' ? 'option-toggle--active' : ''}`}
                                onClick={() => setTheme('light')}
                            >
                                {t('themeLight')}
                            </button>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="settings-section">
                        <label className="settings-label">{t('langLabel')}</label>
                        <div className="option-toggle-group">
                            <button
                                className={`option-toggle ${lang === 'ID' ? 'option-toggle--active' : ''}`}
                                onClick={() => switchLang('ID')}
                            >
                                🇮🇩 Indonesia
                            </button>
                            <button
                                className={`option-toggle ${lang === 'EN' ? 'option-toggle--active' : ''}`}
                                onClick={() => switchLang('EN')}
                            >
                                🇬🇧 English
                            </button>
                        </div>
                    </div>

                    {/* Keyboard Shortcuts */}
                    <div className="settings-section">
                        <label className="settings-label">{t('shortcutsTitle')}</label>
                        <div className="shortcuts-list">
                            {shortcutsList.map((s, i) => (
                                <div key={i} className="shortcut-row">
                                    <kbd className="shortcut-keys">{s.keys}</kbd>
                                    <span className="shortcut-action">{s.action}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
