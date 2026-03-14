const LIGHTING_VALUES = new Set([
  'soft daylight',
  'golden hour',
  'beauty softbox',
  'bright retail',
  'dramatic contrast',
  'moody ambient',
]);

const CAMERA_DISTANCE_VALUES = new Set(['close', 'medium', 'full']);
const BACKGROUND_VALUES = new Set([
  'keep from reference',
  'clean studio',
  'home lifestyle',
  'minimal luxury',
  'soft retail display',
  'outdoor natural',
]);
const PLATFORM_VALUES = new Set(['tiktok', 'shopee', 'instagram']);
const CONVERSION_GOAL_VALUES = new Set(['purchase', 'click', 'lead', 'awareness']);
const PSYCHOLOGY_TRIGGER_VALUES = new Set(['auto', 'fomo', 'social-proof', 'problem-solution', 'authority', 'aspiration']);
const HOOK_STRENGTH_VALUES = new Set(['soft', 'medium', 'hard']);
const HOOK_FORMULA_VALUES = new Set(['problem-agitate-solve', 'before-after-bridge', 'demo-proof', 'open-loop', 'listicle']);

function sanitizeInlineText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, ' ').trim() || fallback;
}

function sanitizeMultilineText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 8)
    .join('\n');
  return normalized || fallback;
}

function extractJsonCandidate(text) {
  const cleaned = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  if (!cleaned) return '';

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return cleaned.slice(start, end + 1);
  }

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

function normalizeEnum(value, allowedValues, fallback = '') {
  const normalized = sanitizeInlineText(value).toLowerCase();
  return allowedValues.has(normalized) ? normalized : fallback;
}

function normalizeHookFormula(value) {
  const normalized = sanitizeInlineText(value).toLowerCase();
  if (!normalized || normalized === 'auto' || normalized === 'null') return null;
  return HOOK_FORMULA_VALUES.has(normalized) ? normalized : null;
}

function fallbackParse(rawText) {
  const text = String(rawText || '');
  const getField = (label) => {
    const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+(?:\\n(?!\\w+\\s*:).+)*)`, 'i');
    const match = text.match(pattern);
    return match?.[1] || '';
  };

  return {
    targetAudience: getField('targetAudience'),
    keySellingPoints: getField('keySellingPoints'),
    mustInclude: getField('mustInclude'),
    avoidElements: getField('avoidElements'),
    sceneMustIncludeMap: getField('sceneMustIncludeMap'),
    subjectDescription: getField('subjectDescription'),
    lighting: getField('lighting'),
    cameraDistance: getField('cameraDistance'),
    background: getField('background'),
    productInteraction: getField('productInteraction'),
    platformTarget: getField('platformTarget'),
    conversionGoal: getField('conversionGoal'),
    psychologyTrigger: getField('psychologyTrigger'),
    hookStrength: getField('hookStrength'),
    hookFormula: getField('hookFormula'),
  };
}

function normalizeOutput(parsed = {}) {
  return {
    targetAudience: sanitizeInlineText(parsed.targetAudience),
    keySellingPoints: sanitizeMultilineText(parsed.keySellingPoints),
    mustInclude: sanitizeMultilineText(parsed.mustInclude),
    avoidElements: sanitizeMultilineText(parsed.avoidElements),
    sceneMustIncludeMap: sanitizeMultilineText(parsed.sceneMustIncludeMap),
    subjectDescription: sanitizeMultilineText(parsed.subjectDescription),
    lighting: normalizeEnum(parsed.lighting, LIGHTING_VALUES),
    cameraDistance: normalizeEnum(parsed.cameraDistance, CAMERA_DISTANCE_VALUES),
    background: normalizeEnum(parsed.background, BACKGROUND_VALUES),
    productInteraction: sanitizeMultilineText(parsed.productInteraction),
    platformTarget: normalizeEnum(parsed.platformTarget, PLATFORM_VALUES),
    conversionGoal: normalizeEnum(parsed.conversionGoal, CONVERSION_GOAL_VALUES),
    psychologyTrigger: normalizeEnum(parsed.psychologyTrigger, PSYCHOLOGY_TRIGGER_VALUES),
    hookStrength: normalizeEnum(parsed.hookStrength, HOOK_STRENGTH_VALUES),
    hookFormula: normalizeHookFormula(parsed.hookFormula),
  };
}

function buildEmptyFieldGuidance(options = {}) {
  const entries = Object.entries({
    targetAudience: options.targetAudience,
    keySellingPoints: options.keySellingPoints,
    mustInclude: options.mustInclude,
    avoidElements: options.avoidElements,
    sceneMustIncludeMap: options.sceneMustIncludeMap,
    subjectDescription: options.subjectDescription,
    lighting: options.lighting,
    cameraDistance: options.cameraDistance,
    background: options.background,
    productInteraction: options.productInteraction,
    platformTarget: options.platformTarget,
    conversionGoal: options.conversionGoal,
    psychologyTrigger: options.psychologyTrigger,
    hookStrength: options.hookStrength,
    hookFormula: options.hookFormula,
  });

  return entries.map(([key, value]) => {
    const normalized = value === null || value === undefined ? '' : String(value).trim();
    return `${key}: ${normalized ? `already set -> ${normalized}` : 'EMPTY -> you may suggest this field'}`;
  }).join('\n');
}

export function buildOptionsAutofillSystemPrompt(input = {}) {
  const language = input.language === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';
  const modeRule = input.mode === 'recommended'
    ? 'Focus ONLY on recommended fields: targetAudience, keySellingPoints, mustInclude, avoidElements. Return empty strings for all other fields.'
    : 'You may suggest any safe empty field from the schema if the reference clearly supports it.';

  return `You are an expert TikTok affiliate creative strategist filling ONLY EMPTY prompt-builder fields from reference images.

TASK:
- Analyze the uploaded reference images and the selected preset.
- Suggest only safe autofill values for blank fields.
- Never overwrite fields that the user already filled.
- Keep the output aligned to the current preset, visible product cues, and realistic conversion intent.

STRICT RULES:
- Return ONLY valid JSON. No markdown. No prose outside JSON.
- If a field should stay untouched or you are uncertain, return an empty string for that field. Use null only for hookFormula.
- Do not invent a precise product name or invisible product claims.
- Keep all text practical, concise, and creator-ready.
- Use ${language} for all natural-language text values.
- Prefer conservative suggestions over imaginative ones.
- ${modeRule}

VALID ENUMS:
- lighting: "soft daylight" | "golden hour" | "beauty softbox" | "bright retail" | "dramatic contrast" | "moody ambient"
- cameraDistance: "close" | "medium" | "full"
- background: "keep from reference" | "clean studio" | "home lifestyle" | "minimal luxury" | "soft retail display" | "outdoor natural"
- platformTarget: "tiktok" | "shopee" | "instagram"
- conversionGoal: "purchase" | "click" | "lead" | "awareness"
- psychologyTrigger: "auto" | "fomo" | "social-proof" | "problem-solution" | "authority" | "aspiration"
- hookStrength: "soft" | "medium" | "hard"
- hookFormula: null | "problem-agitate-solve" | "before-after-bridge" | "demo-proof" | "open-loop" | "listicle"

JSON SCHEMA:
{
  "targetAudience": "string",
  "keySellingPoints": "string with short lines separated by \\n",
  "mustInclude": "string with short lines separated by \\n",
  "avoidElements": "string with short lines separated by \\n",
  "sceneMustIncludeMap": "string with one scene pin per line like 1: exact product name in hook",
  "subjectDescription": "string",
  "lighting": "enum or empty string",
  "cameraDistance": "enum or empty string",
  "background": "enum or empty string",
  "productInteraction": "string",
  "platformTarget": "enum or empty string",
  "conversionGoal": "enum or empty string",
  "psychologyTrigger": "enum or empty string",
  "hookStrength": "enum or empty string",
  "hookFormula": "enum or null"
}`;
}

export function buildOptionsAutofillUserPrompt(input = {}) {
  const preset = input.preset && typeof input.preset === 'object' ? input.preset : {};
  const options = input.options && typeof input.options === 'object' ? input.options : {};
  const preferenceMemory = input.preferenceMemory && typeof input.preferenceMemory === 'object' ? input.preferenceMemory : {};
  const modeLabel = input.mode === 'recommended' ? 'recommended fields only' : 'all safe empty fields';
  const rememberedAvoids = Array.isArray(preferenceMemory.avoidTerms)
    ? preferenceMemory.avoidTerms.map((item) => sanitizeInlineText(item)).filter(Boolean).join(', ')
    : '';
  const rememberedSteering = Array.isArray(preferenceMemory.steeringNotes)
    ? preferenceMemory.steeringNotes.map((item) => sanitizeInlineText(item)).filter(Boolean).join(' | ')
    : '';

  return `Selected preset context:
- name: ${sanitizeInlineText(preset.name, 'Unknown preset')}
- vibe: ${sanitizeInlineText(preset.vibe, 'Not provided')}
- description: ${sanitizeInlineText(preset.description, 'Not provided')}
- category: ${sanitizeInlineText(preset.category, 'Not provided')}

Known product context from user:
- productName: ${sanitizeInlineText(options.productName, 'Not provided')}
- outputLanguage: ${sanitizeInlineText(options.outputLanguage, input.language === 'EN' ? 'EN' : 'ID')}
- sceneCount: ${sanitizeInlineText(options.sceneCount, '4')}
- customInstructions: ${sanitizeInlineText(options.customInstructions, 'None')}
- learnedAvoidTerms: ${rememberedAvoids || 'None'}
- learnedSteeringNotes: ${rememberedSteering || 'None'}
- autofillMode: ${modeLabel}

Field status:
${buildEmptyFieldGuidance(options)}

Instructions:
1. Only suggest values for fields marked EMPTY.
2. If a field already has a value, return an empty string for that field so the client keeps the user's value.
3. Keep mustInclude and keySellingPoints concrete and visually demonstrable.
4. Keep avoidElements focused on visuals, tone, or claims that should be avoided.
5. Only create sceneMustIncludeMap if the image and preset make a pinned beat obvious.
6. Use short creator-friendly phrasing, not essays.`;
}

export function parseOptionsAutofillOutput(rawText) {
  const parsed = tryParseJson(rawText) || fallbackParse(rawText);
  return normalizeOutput(parsed);
}
