function sanitizeInlineText(value, fallback = '') {
  if (!value) return fallback;
  return String(value).replace(/\s+/g, ' ').trim() || fallback;
}

function parseList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => sanitizeInlineText(value))
    .filter(Boolean);
}

function clampLength(title, maxLength) {
  if (!title || title.length <= maxLength) return title;
  const sliced = title.slice(0, maxLength).trim();
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace <= 16) return sliced;
  return sliced.slice(0, lastSpace).trim();
}

function stripEmoji(title) {
  return title
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function dedupeTitles(titles) {
  const seen = new Set();
  const output = [];
  titles.forEach((title) => {
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(title);
  });
  return output;
}

export function buildTitleSystemPrompt(options = {}) {
  const language = options.language === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';
  const titleCount = Math.max(3, Math.min(30, Number.parseInt(options.titleCount, 10) || 10));
  const maxLength = Math.max(30, Math.min(120, Number.parseInt(options.maxLength, 10) || 60));
  const emojiRule = options.includeEmoji
    ? 'Emoji allowed (max one emoji per title, optional).'
    : 'Do not use any emoji.';

  return `You are an elite TikTok growth copywriter focused on high-CTR short-form video titles.

OUTPUT CONTRACT (STRICT):
- Output exactly ${titleCount} title lines.
- Language: ${language}.
- Each title must be <= ${maxLength} characters.
- No numbering, no bullets, no quotes, no intro text, no closing notes.
- Each line should be a complete ready-to-post title.
- Avoid repetitive phrasing across lines.
- ${emojiRule}
- Keep wording natural, punchy, and conversion-oriented.`;
}

export function buildTitleUserPrompt(input = {}) {
  const titleCount = Math.max(3, Math.min(30, Number.parseInt(input.titleCount, 10) || 10));
  const maxLength = Math.max(30, Math.min(120, Number.parseInt(input.maxLength, 10) || 60));
  const tone = sanitizeInlineText(input.tone, 'viral');
  const productName = sanitizeInlineText(input.productName, 'affiliate product');
  const productCategory = sanitizeInlineText(input.productCategory, '-');
  const targetAudience = sanitizeInlineText(input.targetAudience, '-');
  const keyBenefits = parseList(input.keyBenefits);
  const keywords = parseList(input.keywords);
  const customInstructions = sanitizeInlineText(input.customInstructions);

  return `Generate TikTok video titles for affiliate selling.

PRODUCT:
- Name: ${productName}
- Category: ${productCategory}
- Target Audience: ${targetAudience}
- Tone: ${tone}

KEY BENEFITS:
${keyBenefits.length > 0 ? keyBenefits.map((benefit, index) => `${index + 1}. ${benefit}`).join('\n') : '- Use product-specific practical benefits.'}

SEO/HOOK KEYWORDS:
${keywords.length > 0 ? keywords.join(', ') : '- Use broad TikTok-native keywords only when natural.'}

RULES:
- Build hooks for scroll-stop in first read.
- Mix title styles: curiosity, proof, value, urgency, list-style, direct CTA.
- Avoid clickbait lies.
- Keep each title <= ${maxLength} chars.
- Return exactly ${titleCount} unique lines.
${customInstructions ? `- Extra instruction: ${customInstructions}` : ''}`;
}

export function postProcessTitles(rawText, options = {}) {
  const titleCount = Math.max(3, Math.min(30, Number.parseInt(options.titleCount, 10) || 10));
  const maxLength = Math.max(30, Math.min(120, Number.parseInt(options.maxLength, 10) || 60));
  const includeEmoji = Boolean(options.includeEmoji);
  const productName = sanitizeInlineText(options.productName, 'Produk Viral');
  const isEnglish = options.language === 'EN';

  const cleaned = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```[a-zA-Z]*\s*$/gm, '')
    .replace(/^\s*```\s*$/gm, '')
    .trim();

  const lines = cleaned
    .split('\n')
    .map((line) => line
      .replace(/^\s*(?:\d+\s*[).:-]\s*|[-*•]\s*)/, '')
      .replace(/^\s*title\s*\d*\s*:\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim())
    .filter(Boolean);

  let titles = dedupeTitles(lines).map((title) => {
    let normalized = includeEmoji ? title : stripEmoji(title);
    normalized = clampLength(normalized, maxLength);
    return normalized;
  }).filter(Boolean);

  if (titles.length < titleCount) {
    const fallbackPool = isEnglish
      ? [
        `Is ${productName} actually worth the hype right now?`,
        `Why ${productName} keeps selling out on TikTok Shop`,
        `Honest ${productName} review: hype or real results?`,
        `Watch this before you checkout ${productName}`,
        `${productName} for beginners: easy, fast, practical`,
        `${productName} usage tips for better results`,
        `At this price, is ${productName} still worth buying?`,
        `Why ${productName} is this week's best seller`,
        `${productName} in real life: what to expect`,
        `One product, multiple benefits: ${productName}`,
      ]
      : [
        `${productName} yang lagi viral, worth it gak sih?`,
        `Kenapa ${productName} ini laku terus di TikTok Shop`,
        `${productName} review jujur: hype atau beneran bagus?`,
        `Cek dulu ${productName} ini sebelum checkout`,
        `${productName} cocok buat kamu yang butuh hasil cepat`,
        `${productName}: tips pakai biar hasilnya maksimal`,
        `${productName} dengan harga segini, masih worth it?`,
        `Alasan ${productName} ini jadi best seller minggu ini`,
        `${productName} buat pemula: aman dan gampang dipakai`,
        `Satu produk, banyak manfaat: ${productName}`,
      ];

    for (const candidate of fallbackPool) {
      if (titles.length >= titleCount) break;
      const normalized = clampLength(includeEmoji ? candidate : stripEmoji(candidate), maxLength);
      if (!titles.some((title) => title.toLowerCase() === normalized.toLowerCase())) {
        titles.push(normalized);
      }
    }
  }

  return titles.slice(0, titleCount);
}
