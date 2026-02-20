function sanitizeInlineText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, ' ').trim() || fallback;
}

function parseStringList(value, maxItems = 10) {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeInlineText(item))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,;|]+/)
      .map((item) => sanitizeInlineText(item))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  return [];
}

function extractJsonCandidate(text) {
  const cleaned = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  if (!cleaned) return '';

  const directObjectMatch = cleaned.match(/\{[\s\S]*\}/);
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

  const summary = sanitizeInlineText(getField('summary') || getField('ringkasan'));
  const productName = sanitizeInlineText(getField('productName') || getField('nama produk'));
  const productCategory = sanitizeInlineText(getField('productCategory') || getField('kategori'));
  const targetAudience = sanitizeInlineText(getField('targetAudience') || getField('target audience'));
  const confidenceRaw = getField('confidence');
  const confidence = Number.isFinite(Number(confidenceRaw)) ? Number(confidenceRaw) : 65;

  return {
    productName,
    productCategory,
    targetAudience,
    summary,
    confidence,
    keyBenefits: [],
    keywords: [],
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeOutput(parsed, language = 'ID') {
  const isID = language !== 'EN';
  const fallbackName = isID ? 'Produk Belum Teridentifikasi' : 'Unidentified Product';
  const fallbackCategory = isID ? 'Kategori umum' : 'General category';
  const fallbackAudience = isID ? 'Audiens umum TikTok' : 'General TikTok audience';
  const fallbackSummary = isID
    ? 'Produk terlihat siap dipromosikan. Silakan verifikasi detail sebelum posting.'
    : 'The product appears promotable. Verify details before posting.';

  const keyBenefits = parseStringList(parsed?.keyBenefits, 8);
  const keywords = parseStringList(parsed?.keywords, 12);
  const confidence = Number.isFinite(Number(parsed?.confidence))
    ? clamp(Math.round(Number(parsed.confidence)), 1, 100)
    : 65;

  return {
    productName: sanitizeInlineText(parsed?.productName, fallbackName),
    productCategory: sanitizeInlineText(parsed?.productCategory, fallbackCategory),
    targetAudience: sanitizeInlineText(parsed?.targetAudience, fallbackAudience),
    keyBenefits,
    keywords,
    summary: sanitizeInlineText(parsed?.summary, fallbackSummary),
    confidence,
  };
}

export function buildProductAnalysisSystemPrompt(input = {}) {
  const language = input.language === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';
  return `You are an expert TikTok affiliate analyst.

TASK:
Analyze a product image and infer marketing metadata for TikTok content planning.

OUTPUT RULES (STRICT):
- Return ONLY valid JSON (no markdown, no prose).
- Language for all text values: ${language}.
- JSON schema:
{
  "productName": "string",
  "productCategory": "string",
  "targetAudience": "string",
  "keyBenefits": ["string", "... up to 8"],
  "keywords": ["string", "... up to 12"],
  "summary": "string",
  "confidence": 1-100
}
- Use practical, non-medical, non-legal claims.
- If uncertain, keep confidence lower and use safer generic wording.`;
}

export function buildProductAnalysisUserPrompt(input = {}) {
  const context = sanitizeInlineText(input.customContext);
  const languageLabel = input.language === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';

  return `Analyze the uploaded product image for TikTok affiliate planning.

Focus on:
1) Product identification from packaging/visual clues.
2) Likely category and audience persona.
3) Main tangible benefits suitable for short video hooks.
4) Search-friendly keywords for title ideation.
5) One concise summary for creator brief.

Constraints:
- Language: ${languageLabel}.
- Do not fabricate precise specs that are not visible.
- Keep claims realistic and safe.
${context ? `- Additional context from user: ${context}` : ''}`;
}

export function parseProductAnalysisOutput(rawText, options = {}) {
  const parsed = tryParseJson(rawText) || fallbackParse(rawText);
  return normalizeOutput(parsed, options.language);
}

