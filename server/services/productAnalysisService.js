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
    hookFormulas: [],
    conversionAngles: [],
    affiliatePotential: 50,
    priceAnchor: '',
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
  const hookFormulas = parseStringList(parsed?.hookFormulas, 5);
  const conversionAngles = parseStringList(parsed?.conversionAngles, 5);
  const confidence = Number.isFinite(Number(parsed?.confidence))
    ? clamp(Math.round(Number(parsed.confidence)), 1, 100)
    : 65;
  const affiliatePotential = Number.isFinite(Number(parsed?.affiliatePotential))
    ? clamp(Math.round(Number(parsed.affiliatePotential)), 1, 100)
    : 50;

  return {
    productName: sanitizeInlineText(parsed?.productName, fallbackName),
    productCategory: sanitizeInlineText(parsed?.productCategory, fallbackCategory),
    targetAudience: sanitizeInlineText(parsed?.targetAudience, fallbackAudience),
    keyBenefits,
    keywords,
    summary: sanitizeInlineText(parsed?.summary, fallbackSummary),
    confidence,
    hookFormulas,
    conversionAngles,
    affiliatePotential,
    priceAnchor: sanitizeInlineText(parsed?.priceAnchor, ''),
  };
}

export function buildProductAnalysisSystemPrompt(input = {}) {
  const language = input.language === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';
  return `You are an expert TikTok affiliate marketing analyst and video content strategist.

TASK:
Analyze a product image and generate comprehensive affiliate marketing metadata for TikTok content planning.

OUTPUT RULES (STRICT):
- Return ONLY valid JSON (no markdown, no prose).
- Language for all text values: ${language}.
- JSON schema:
{
  "productName": "string",
  "productCategory": "string",
  "targetAudience": "string — describe the ideal TikTok buyer persona (age, lifestyle, pain points)",
  "keyBenefits": ["string", "... up to 8 — concrete, visual, demonstrable benefits for video"],
  "keywords": ["string", "... up to 12 — search-optimized, hashtag-ready terms"],
  "summary": "string — one paragraph creator brief with hook concept and angle suggestion",
  "confidence": 1-100,
  "hookFormulas": ["string", "... up to 5 — proven TikTok hook formulas for this specific product (e.g. 'Curiosity Gap: I tried this for 7 days and...', 'Pain Amplifier: If you are still struggling with...')"],
  "conversionAngles": ["string", "... up to 5 — specific affiliate content angles: before/after, comparison, tutorial, ASMR unboxing, etc."],
  "affiliatePotential": 1-100,
  "priceAnchor": "string — estimated price range or value positioning (e.g. 'Budget-friendly under 50k', 'Premium 200k-500k range')"
}
- Use practical, non-medical, non-legal claims.
- hookFormulas must be specific to this product — NOT generic.
- conversionAngles must list which TikTok video formats work BEST for this product.
- affiliatePotential: rate how easily this product generates clicks/purchases on TikTok (1=very hard, 100=viral impulse buy).
- If uncertain, keep confidence lower and use safer generic wording.`;
}

export function buildProductAnalysisUserPrompt(input = {}) {
  const context = sanitizeInlineText(input.customContext);
  const languageLabel = input.language === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';

  return `Analyze the uploaded product image for TikTok affiliate marketing planning.

Focus on:
1) Product identification from packaging/visual clues — name, brand, variant if visible.
2) Likely category and detailed TikTok buyer persona (demographics, psychographics, pain points).
3) Main tangible benefits suitable for compelling short video hooks — specific, visible, demonstrable.
4) Search-friendly and hashtag-optimized keywords for TikTok title ideation.
5) One concise creator brief paragraph with hook concept and recommended content angle.
6) Specific hook formulas tailored to this exact product — not generic.
7) Best TikTok affiliate content formats/angles for this product category.
8) Affiliate potential score — how impulse-buyable is this on TikTok?
9) Estimated price anchor to help frame the value proposition.

Constraints:
- Language: ${languageLabel}.
- Do not fabricate precise specs that are not visible.
- Keep claims realistic and safe — no medical/legal claims.
- hookFormulas must start with a recognizable formula name (e.g. "Curiosity Gap:", "Pain Amplifier:", "Before/After:", "Social Proof Anchor:").
${context ? `- Additional context from user: ${context}` : ''}`;
}

export function parseProductAnalysisOutput(rawText, options = {}) {
  const parsed = tryParseJson(rawText) || fallbackParse(rawText);
  return normalizeOutput(parsed, options.language);
}
