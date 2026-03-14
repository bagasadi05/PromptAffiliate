/**
 * LocalStorage utility with JSON serialization and error handling
 */

const PREFIX = 'tiktok-prompt-studio_';

export function getItem(key, defaultValue = null) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return defaultValue;
        return JSON.parse(raw);
    } catch {
        return defaultValue;
    }
}

export function setItem(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.warn('localStorage write failed:', err);
        return false;
    }
}

export function removeItem(key) {
    try {
        localStorage.removeItem(PREFIX + key);
    } catch {
        // ignore
    }
}

// Storage keys
export const KEYS = {
    API_KEY: 'gemini_api_key',
    OPENCODE_AUTH_TOKEN: 'opencode_auth_token',
    GROKPI_AUTOMATION_STATE: 'grokpi_automation_state',
    HISTORY: 'prompt_history',
    FAVORITES: 'favorites',
    THEME: 'theme',
    LANGUAGE: 'ui_language',
    CUSTOM_PRESETS: 'custom_presets',
    SYSTEM_PROMPT_TEMPLATE: 'system_prompt_template',
    SETTINGS: 'settings',
    PROMPT_PREFERENCE_MEMORY: 'prompt_preference_memory',
};
