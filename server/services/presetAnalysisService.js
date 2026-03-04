function sanitizeInlineText(value, fallback = '') {
    if (value === null || value === undefined) return fallback;
    return String(value).replace(/\s+/g, ' ').trim() || fallback;
}

function extractJsonCandidate(text) {
    const cleaned = String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();

    if (!cleaned) return '';

    const directObjectMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (directObjectMatch) return directObjectMatch[0];
    return cleaned;
}

function tryParseJson(text) {
    const candidate = extractJsonCandidate(text);
    if (!candidate) return null;

    try {
        return JSON.parse(candidate);
    } catch {
        return null;
    }
}

function fallbackParse(rawText) {
    const text = String(rawText || '');
    const getField = (label) => {
        const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, 'i');
        const match = text.match(pattern);
        return sanitizeInlineText(match?.[1], '');
    };

    return {
        presetId: getField('presetId'),
        wardrobe: getField('wardrobe'),
        subjectDescription: getField('subjectDescription'),
        lighting: getField('lighting'),
        cameraDistance: getField('cameraDistance'),
        summary: getField('summary'),
    };
}

export function buildPresetAnalysisSystemPrompt(input = {}) {
    const language = input.language === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';
    return `You are an expert AI video prompt engineer and cinematographer.

TASK:
Analyze a reference image and suggest the BEST default parameters for generating a cinematic AI video from it.

AVAILABLE PRESET IDs (choose the most fitting vibe):
- affiliate_cinematic: Product showcase, cinematic styling
- fashion_streetwear: Edgy, dynamic fashion
- beauty_closeup: Soft, glowing, cosmetic focus
- lifestyle_cozy: Warm, homey, natural
- fitness_energy: High energy, athletic, sweat
- tech_minimalist: Clean, sharp, modern

AVAILABLE LIGHTING OPTIONS (choose one):
- soft daylight
- warm indoor
- neon night
- golden hour
- studio ring light
- dramatic shadow
- cinematic rim
- rembrandt
- volumetric
- product spotlight

AVAILABLE CAMERA DISTANCE OPTIONS (choose one):
- extreme close
- close
- medium
- wide
- full-body

OUTPUT RULES (STRICT):
- Return ONLY valid JSON.
- Language for 'wardrobe', 'subjectDescription', and 'summary': ${language}.
- JSON schema:
{
  "presetId": "string (from exact IDs above)",
  "lighting": "string (from exact options above)",
  "cameraDistance": "string (from exact options above)",
  "wardrobe": "string (highly detailed description of outfit in image)",
  "subjectDescription": "string (brief non-facial description, e.g., 'person holding phone', 'woman sitting')",
  "summary": "string (1-sentence explanation of why these settings were chosen)"
}`;
}

export function buildPresetAnalysisUserPrompt() {
    return `Analyze this reference image and extract the parameters for video generation.

1. Identify the vibe and select the best 'presetId'.
2. Identify the predominant lighting and select the best 'lighting'.
3. Identify how the subject is framed and select the best 'cameraDistance'.
4. Describe the subject's exact outfit/wardrobe in extreme detail ('wardrobe').
5. Note any key subject props or general physical context ('subjectDescription').
6. Provide a brief 'summary' of your analysis.`;
}

export function parsePresetAnalysisOutput(rawText) {
    const parsed = tryParseJson(rawText) || fallbackParse(rawText);

    const validPresets = ['affiliate_cinematic', 'fashion_streetwear', 'beauty_closeup', 'lifestyle_cozy', 'fitness_energy', 'tech_minimalist'];
    const validLighting = ['soft daylight', 'warm indoor', 'neon night', 'golden hour', 'studio ring light', 'dramatic shadow', 'cinematic rim', 'rembrandt', 'volumetric', 'product spotlight'];
    const validCamera = ['extreme close', 'close', 'medium', 'wide', 'full-body'];

    return {
        presetId: validPresets.includes(parsed?.presetId) ? parsed.presetId : 'affiliate_cinematic',
        lighting: validLighting.includes(parsed?.lighting) ? parsed.lighting : 'soft daylight',
        cameraDistance: validCamera.includes(parsed?.cameraDistance) ? parsed.cameraDistance : 'medium',
        wardrobe: sanitizeInlineText(parsed?.wardrobe),
        subjectDescription: sanitizeInlineText(parsed?.subjectDescription),
        summary: sanitizeInlineText(parsed?.summary, 'Analysis complete.'),
    };
}
