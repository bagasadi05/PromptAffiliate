import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SERVER_DIR, '../..');
const ENV_PATHS = [
    resolve(PROJECT_ROOT, '.env'),
    resolve(process.cwd(), '.env'),
];

export function loadEnvironment() {
    for (const path of ENV_PATHS) {
        loadEnv({ path });
    }
}

loadEnvironment();

export const PORT = Number(process.env.PORT || 8787);
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const OPENROUTER_FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';

export function getGeminiApiKey() {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (key) return key;

    loadEnvironment();
    return process.env.GEMINI_API_KEY?.trim() || '';
}

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://prompt-affiliate.vercel.app',
];
export function parseAllowedOrigins(value) {
    if (!value || typeof value !== 'string') return DEFAULT_ALLOWED_ORIGINS;
    const parsed = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}
export const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

export const GEMINI_RATE_LIMIT_WINDOW_MS = Number(process.env.GEMINI_RATE_LIMIT_WINDOW_MS || 60_000);
export const GEMINI_RATE_LIMIT_MAX_REQUESTS = Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20);
export const GEMINI_RATE_LIMIT_MAX_HEAVY_REQUESTS = Number(process.env.GEMINI_RATE_LIMIT_MAX_HEAVY_REQUESTS || 8);
export const REDIS_URL = process.env.REDIS_URL || '';
export const OPENCODE_AUTH_TOKEN = process.env.OPENCODE_AUTH_TOKEN || '';
