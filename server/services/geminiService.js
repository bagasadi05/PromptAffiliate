import { GEMINI_MODEL, getGeminiApiKey } from '../config/env.js';

export function isGeminiRateLimited(statusCode, message) {
    const status = Number(statusCode);
    if (status === 429) return true;
    const text = String(message || '').toLowerCase();
    return text.includes('quota') || text.includes('rate limit') || text.includes('resource has been exhausted');
}

export async function callGemini(systemPrompt, userPrompt, images, mimeTypes, options = {}) {
    const geminiApiKey = getGeminiApiKey();

    if (!geminiApiKey) {
        const err = new Error('GEMINI_API_KEY is not set in server environment.');
        err.statusCode = 503;
        throw err;
    }

    const cleanBase64 = (b64) => b64.replace(/^data:image\/[\w.+-]+;base64,/i, '');

    const imageParts = images.map((img, i) => ({
        inlineData: {
            mimeType: mimeTypes[i] || 'image/jpeg',
            data: cleanBase64(img),
        },
    }));

    // Map creativity (0-100) to generation config with safer defaults for format fidelity.
    const creativity = Number.isFinite(Number(options.creativity)) ? Number(options.creativity) : 85;
    const temperature = Math.min(0.95, Math.max(0.2, creativity / 100));
    const topP = Math.min(0.98, Math.max(0.72, 0.72 + (creativity / 100) * 0.22));
    const topK = creativity >= 75 ? 40 : creativity >= 45 ? 32 : 24;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemPrompt }],
                },
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: userPrompt },
                            ...imageParts,
                        ],
                    },
                ],
                generationConfig: {
                    temperature,
                    topP,
                    topK,
                    maxOutputTokens: 8192,
                    responseMimeType: 'text/plain',
                },
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || 'Unknown Gemini API error.';
        const err = new Error(`Gemini API Error: ${response.status} - ${message}`);
        err.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
        throw err;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.find((part) => typeof part?.text === 'string')?.text || '';
    return text || 'No content generated.';
}
