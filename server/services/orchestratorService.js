import { callGemini, isGeminiRateLimited } from './geminiService.js';
import { callOpenRouterFallback } from './openRouterService.js';

export async function callPromptModel(systemPrompt, userPrompt, images, mimeTypes, options = {}) {
    const fallbackEnabled = options?.fallbackOnGeminiLimit === true;
    const hasOpenRouterKey = Boolean(String(process.env.OPENROUTER_API_KEY || '').trim());

    try {
        return await callGemini(systemPrompt, userPrompt, images, mimeTypes, options);
    } catch (error) {
        if (!fallbackEnabled || !isGeminiRateLimited(error?.statusCode, error?.message)) {
            throw error;
        }

        if (!hasOpenRouterKey) {
            console.warn('[gemini] Rate limited and OPENROUTER_API_KEY is not configured. Returning original Gemini limit error.');
            throw error;
        }

        console.warn(`[gemini] Rate limited. Falling back to OpenRouter model`);
        return await callOpenRouterFallback(systemPrompt, userPrompt, images, mimeTypes);
    }
}
