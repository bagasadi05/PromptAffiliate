import { OPENROUTER_FALLBACK_MODEL } from '../config/env.js';

export async function callOpenRouterFallback(systemPrompt, userPrompt, images, mimeTypes) {
    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
        const err = new Error('OPENROUTER_API_KEY is not set for fallback model.');
        err.statusCode = 503;
        throw err;
    }

    const imageContent = images.map((img, i) => ({
        type: 'image_url',
        image_url: {
            url: `data:${mimeTypes[i] || 'image/jpeg'};base64,${img.replace(/^data:image\/[\w.+-]+;base64,/i, '')}`,
        },
    }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: OPENROUTER_FALLBACK_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        ...imageContent,
                    ],
                },
            ],
            reasoning: { enabled: true },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || 'Unknown OpenRouter API error.';
        const err = new Error(`OpenRouter Fallback Error: ${response.status} - ${message}`);
        err.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
        throw err;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        const textPart = content.find((part) => typeof part?.text === 'string');
        if (textPart?.text) return textPart.text;
    }
    return 'No content generated.';
}
