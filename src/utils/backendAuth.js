import { getItem, KEYS } from './localStorage';

export function getOpencodeAuthToken() {
    const storedToken = getItem(KEYS.OPENCODE_AUTH_TOKEN, '');
    if (storedToken) return String(storedToken).trim();
    return String(import.meta.env.VITE_OPENCODE_AUTH_TOKEN || '').trim();
}

export function getBackendAuthHeaders() {
    const headers = {};
    const authToken = getOpencodeAuthToken();
    if (authToken) {
        headers['x-opencode-token'] = authToken;
    }
    return headers;
}
