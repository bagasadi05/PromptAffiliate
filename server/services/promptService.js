import { DEFAULT_OPTIONS } from '../../src/constants/defaultOptions.js';

// ==================== CONSTANTS ====================

export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = `You are an expert AI video prompt engineer specializing in IMAGE-TO-VIDEO generation for TikTok affiliate content (Grok Aurora, Kling, Runway Gen-3, Wan2.1). The subject's face and body appearance are already defined by the reference image — DO NOT describe or invent any facial features, skin tone, hair, or body proportions.

YOUR FOCUS IS EXCLUSIVELY:
1. MOVEMENT & ACTION: Describe precise body movements with biomechanical detail — weight transfer, momentum, joint angles, muscle engagement, preparation → execution → recovery phases. Every movement must feel physically grounded and human.
2. OUTFIT: Describe clothing worn in the reference image (or as instructed) with full specificity: garment type, exact color, fabric texture, fit, hem length, sleeve type, every visible accessory. Outfit is FROZEN across all scenes — use "wearing [outfit description]" in every scene.
3. CAMERA CRAFT: Specify lens (24mm/35mm/50mm/85mm), aperture (f/1.4–f/8), camera movement (dolly, steadicam, handheld, static, orbit). Describe framing and composition for each scene.
4. LIGHTING: Color temperature (2700K–6500K), direction, shadow quality, how light interacts with fabric and environment.
5. FABRIC PHYSICS: How clothes, accessories, and hair/hijab respond to movement — inertia, drape, swing, wrinkle, stretch.
6. VOICE/DIALOGUE: If voice is requested, write compelling TikTok-native dialogue in the specified language. For affiliate content: hooks, product highlights, CTA, emotional triggers.
7. CINEMATIC QUALITY: Integrate naturally — "film grain", "motion blur 180° shutter", "shallow DOF", "handheld micro-shake", "lens breathing", "4K RAW 24fps".
8. SCENE TRANSITIONS: End each scene with a natural cut point (beat hit, pose freeze, whip-pan, motivated movement).
9. ANTI-ARTIFACTS: Avoid descriptions that cause: extra fingers, clothing teleportation, background warping, temporal flicker, duplicate limbs, floating body parts.
10. FORMAT: UPPERCASE scene headers. Each scene = ONE rich paragraph minimum 60 words. DO NOT describe the subject's face, eyes, skin color, or facial features.`;

const LANGUAGE_LABELS = {
  EN: 'English',
  ID: 'Indonesian (Bahasa Indonesia)',
};

const CAMERA_VOCAB = {
  'extreme close': { lens: '85mm macro', aperture: 'f/1.4', movement: 'static tripod with subtle rack focus', framing: 'face or hands filling frame, extreme shallow DOF' },
  close: { lens: '85mm', aperture: 'f/1.8', movement: 'gentle handheld with stabilization', framing: 'head-to-chest frame, bokeh background separation' },
  medium: { lens: '50mm', aperture: 'f/2.8', movement: 'steadicam or smooth handheld', framing: 'waist-up framing, subject center-weighted' },
  wide: { lens: '35mm', aperture: 'f/4', movement: 'dolly or slight crane', framing: 'full body with environment context, rule-of-thirds' },
  'full-body': { lens: '24mm', aperture: 'f/5.6', movement: 'wide steadicam orbit or static tripod', framing: 'full body head-to-toe with floor and ceiling visible' },
};

// ── Cinematic Product Hook — Camera Movement Vocabulary ──
const CINEMATIC_CAMERA_MOVEMENTS = {
  auto: { label: 'Auto (AI decides)', desc: 'Let the AI engine choose the best camera movement per scene.' },
  'slow-push-in': { label: 'Slow Push-In', desc: 'Macro/50mm, slow dolly push-in toward subject — builds focus, ideal for 3-second hook.' },
  'slow-orbit': { label: 'Slow Orbit', desc: 'Steadicam 15–30° slow orbit around subject — adds dimensionality and premium feel.' },
  'dynamic-tracking': { label: 'Dynamic Tracking', desc: 'Handheld tracking shot following subject movement — energetic, immersive.' },
  'rack-focus-pull': { label: 'Rack Focus Pull', desc: 'Static with rack focus from product to subject (or vice versa) — directs viewer attention.' },
  'crane-jib': { label: 'Crane / Jib', desc: 'Vertical camera movement revealing scene from above or below — cinematic reveal.' },
};

// ── Cinematic Product Hook — Micro-Expression Library ──
const MICRO_EXPRESSION_VOCAB = {
  auto: 'authentic subtle micro-expressions reacting naturally to the product/environment',
  satisfaction: 'slight widening of the eyes in realization, subtle satisfied nod, lips curving into a genuine micro-smile',
  curiosity: 'eyebrows raised slightly in interest, head tilting 5 degrees, eyes scanning the product with focused attention',
  surprise: 'brief flash of genuine surprise — eyes widening, mouth opening slightly, followed by a pleased expression',
  confidence: 'steady gaze, slight jaw clench of determination, subtle chin lift conveying quiet confidence',
  calm: 'relaxed facial muscles, slow deliberate blinks, serene expression suggesting deep contentment',
};

// ── Cinematic Product Hook — Render Quality Map ──
const RENDER_QUALITY_MAP = {
  '4k': {
    label: '4K Photorealistic',
    specs: '4K resolution, photorealistic, hyper-detailed textures, visible skin pores, realistic fabric physics',
  },
  '8k': {
    label: '8K Ultra-Realistic',
    specs: '8K resolution, hyper-realistic, subsurface scattering on skin, visible pore-level detail, Unreal Engine 5 render quality, physically-based material rendering',
  },
  'cinematic-raw': {
    label: 'Cinematic RAW',
    specs: '4K RAW footage, ARRI Alexa color science, film grain, 180° shutter motion blur, anamorphic lens characteristics, photochemical film look',
  },
};

// ── Cinematic Product Hook — Enhanced Negative Prompt ──
const CINEMATIC_NEGATIVE_PROMPT = 'morphed fingers, extra limbs, distorted text, flat lighting, cartoonish, plastic skin, unnatural movement, jitter, extra fingers, clothing teleportation, outfit color change, background warping, temporal flicker, duplicate limbs, floating body parts, uncanny valley expression, AI watermark, over-smoothed skin, CGI-perfect lighting, frozen static fabric';

const LIGHTING_VOCAB = {
  'soft daylight': { temp: '5600K', direction: 'overhead diffused', shadow: 'soft wrapping shadows, low contrast', mood: 'clean, natural, editorial' },
  'warm indoor': { temp: '2700K–3200K tungsten', direction: 'overhead pendant + side table lamp', shadow: 'warm soft shadows, cozy fill', mood: 'intimate, cozy, homey' },
  'neon night': { temp: 'mixed 2700K–8000K RGB', direction: 'multi-directional neon signage + colored gels', shadow: 'hard geometric shadows with color spill', mood: 'energetic, nightlife, vibrant' },
  'golden hour': { temp: '3200K warm amber', direction: '15° above horizon from camera-left', shadow: 'long warm shadows, rim-lit hair/shoulders', mood: 'romantic, warm, nostalgic' },
  'studio ring light': { temp: '5000K neutral', direction: 'frontal ring light at camera axis', shadow: 'minimal shadow, catch-light ring in eyes', mood: 'beauty, clean, influencer-style' },
  'dramatic shadow': { temp: '4000K', direction: 'single hard key from 45° camera-right', shadow: 'deep contrast, half-face shadow, chiaroscuro', mood: 'intense, moody, cinematic noir' },
  // Cinematic Product Hook — Pro-Level Lighting
  'cinematic rim': { temp: '4500K–5600K', direction: 'strong backlight rimming subject silhouette + subtle fill from front', shadow: 'edge-lit separation, dramatic rim highlight on jawline and shoulders', mood: 'cinematic, premium, high-end product' },
  'rembrandt': { temp: '3800K–4200K warm', direction: '45° key light from camera-left creating triangle highlight under eye', shadow: 'classic Rembrandt triangle on cheek, deep sculpted shadows', mood: 'artistic, dramatic, portrait-grade' },
  'volumetric': { temp: '5000K–5600K neutral', direction: 'side-angled light with visible volumetric rays through haze/dust particles', shadow: 'god-ray shafts, atmospheric depth, particles catching light', mood: 'ethereal, cinematic, atmospheric storytelling' },
  'product spotlight': { temp: '5200K daylight balanced', direction: 'overhead spot + reflector fill, tight beam on product zone', shadow: 'focused light pool with soft falloff, dark surrounding negative space', mood: 'luxury, focused attention, e-commerce hero' },
};

const ASPECT_COMPOSITION = {
  '9:16': 'Vertical frame — subject centered vertically, headroom minimal, negative space on sides eliminated. Optimize for mobile full-screen immersion.',
  '16:9': 'Horizontal widescreen — rule of thirds, subject offset from center, use leading space for movement direction. Cinematic letterbox feel.',
  '1:1': 'Square frame — centered symmetrical composition, tight framing, equal visual weight in all quadrants.',
  '4:5': 'Portrait frame — slight vertical emphasis, subject head-to-hips, clean background separation.',
};

const REALISM_MAP = {
  Low: 'stylized cinematic look',
  Med: 'cinematic realism',
  High: 'raw photorealistic footage',
};

const IMAGE_REFERENCE_ROLE_LABELS = {
  identity: 'identity anchor (face, skin tone, body proportions)',
  outfit: 'outfit and accessories consistency',
  pose: 'pose and body mechanics reference',
  background: 'environment and scene continuity',
  style: 'color mood and cinematic style',
};

// ==================== HELPERS ====================

function normalizeSceneCount(value) {
  const sceneCount = Number.parseInt(value, 10);
  if (Number.isNaN(sceneCount)) return 4;
  return Math.min(8, Math.max(2, sceneCount));
}

function resolveOutputLanguage(value) {
  return value === 'ID' ? 'ID' : 'EN';
}

function resolveVoiceLineLabel(voiceStyle) {
  if (voiceStyle === 'voiceover') return 'Voiceover';
  if (voiceStyle === 'lipsync') return 'Lip-sync';
  if (voiceStyle === 'talking') return 'Dialogue';
  return null;
}

function sanitizeInlineText(value, fallback = '') {
  if (!value) return fallback;
  return String(value).replace(/\s+/g, ' ').trim() || fallback;
}

function parseBpmRange(bpmRange) {
  const numbers = String(bpmRange || '')
    .match(/\d+/g)
    ?.map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0) || [];

  if (numbers.length === 0) {
    return { min: 120, max: 120, avg: 120 };
  }
  if (numbers.length === 1) {
    return { min: numbers[0], max: numbers[0], avg: numbers[0] };
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const avg = Math.round((min + max) / 2);
  return { min, max, avg };
}

function estimateSceneDuration(sceneCount, targetDuration) {
  if (Number.isFinite(targetDuration) && targetDuration > 0) {
    return Math.min(12, Math.max(4, Math.round(targetDuration / sceneCount)));
  }
  return 6;
}

function buildNarrativeArc(sceneCount, outputLanguage) {
  const enArc = [
    ['HOOK', 'Stop the scroll with pattern interrupt and immediate curiosity.'],
    ['PAIN POINT', 'Frame the problem or desire in one concrete visual beat.'],
    ['DEMO', 'Show practical product use with believable body mechanics.'],
    ['PROOF', 'Show visible result, side-by-side contrast, or tactile confirmation.'],
    ['TRUST', 'Add specific detail that feels honest and experience-based.'],
    ['VALUE', 'Emphasize benefit, convenience, or savings in plain language.'],
    ['URGENCY', 'Introduce gentle FOMO: limited stock/time/social momentum.'],
    ['CTA', 'End with clear action: click cart / check link now.'],
  ];

  const idArc = [
    ['HOOK', 'Hentikan scroll dengan pattern interrupt dan rasa penasaran instan.'],
    ['PAIN POINT', 'Tunjukkan masalah/keinginan dengan beat visual yang konkret.'],
    ['DEMO', 'Tampilkan pemakaian produk secara praktis dan masuk akal.'],
    ['PROOF', 'Perlihatkan hasil yang terlihat jelas atau bukti taktil.'],
    ['TRUST', 'Tambahkan detail spesifik yang terasa jujur dan real.'],
    ['VALUE', 'Tonjolkan manfaat, kemudahan, atau penghematan dengan bahasa ringan.'],
    ['URGENCY', 'Bangun FOMO halus: stok/waktu/sosial momentum.'],
    ['CTA', 'Tutup dengan aksi jelas: klik keranjang / cek link sekarang.'],
  ];

  const arcSource = outputLanguage === 'ID' ? idArc : enArc;
  const selected = arcSource.slice(0, sceneCount);
  if (selected.length > 0) {
    selected[selected.length - 1] = arcSource[arcSource.length - 1];
  }
  return selected.map((item, index) => `- Scene ${index + 1}: ${item[0]} — ${item[1]}`).join('\n');
}

function buildBackgroundInstruction(background) {
  if (!background || background === 'keep from reference') {
    return 'Preserve the original background from the reference image with realistic perspective continuity.';
  }
  return `Set the environment to "${background}" and keep it coherent with lighting, depth, and motion across scenes.`;
}

function buildNegativePromptInstruction(includeNegativePrompt) {
  if (includeNegativePrompt) {
    return 'Each scene MUST include a scene-specific "Negative Prompt" line.';
  }
  return 'Do NOT output any "Negative Prompt" section in any part of the response.';
}

function normalizeImageReferences(imageReferences, imageCount) {
  const safeCount = Number.isFinite(imageCount) ? Math.max(0, imageCount) : 0;
  if (safeCount === 0) return [];

  const normalized = Array.from({ length: safeCount }, (_, index) => {
    const incoming = imageReferences?.[index] || {};
    const defaultRole = index === 0 ? 'identity' : 'style';
    const role = IMAGE_REFERENCE_ROLE_LABELS[incoming.role] ? incoming.role : defaultRole;
    const influence = Number.isFinite(Number(incoming.influence))
      ? Math.max(1, Number(incoming.influence))
      : index === 0 ? 70 : 40;
    const priority = Number.isFinite(Number(incoming.priority))
      ? Math.max(1, Number(incoming.priority))
      : index + 1;

    return {
      role,
      influence,
      priority,
      label: incoming.label || `Image ${index + 1}`,
      index,
    };
  });

  const total = normalized.reduce((sum, item) => sum + item.influence, 0) || 1;
  const weighted = normalized.map((item) => ({
    ...item,
    influence: Math.max(1, Math.round((item.influence / total) * 100)),
  }));

  const weightedTotal = weighted.reduce((sum, item) => sum + item.influence, 0);
  if (weightedTotal !== 100 && weighted[0]) {
    weighted[0].influence = Math.max(1, weighted[0].influence + (100 - weightedTotal));
  }

  return weighted.sort((a, b) => a.priority - b.priority || a.index - b.index);
}

function buildImageReferenceInstruction(imageReferences, imageCount) {
  if (imageCount <= 1) {
    return 'Use the single reference image as the authoritative source for identity, outfit, pose, and lighting continuity.';
  }

  const normalized = normalizeImageReferences(imageReferences, imageCount);
  const lines = normalized.map((reference, order) => {
    const roleLabel = IMAGE_REFERENCE_ROLE_LABELS[reference.role] || IMAGE_REFERENCE_ROLE_LABELS.style;
    return `- Priority ${order + 1}: ${reference.label} | role=${reference.role} | influence=${reference.influence}% | use for ${roleLabel}.`;
  });

  return `Use the following multi-reference policy:\n${lines.join('\n')}\n- If references conflict, follow the higher-priority item for that role while preserving the same subject identity across scenes.`;
}

// ==================== CINEMATIC PRODUCT HOOK FORMULA ====================

function buildCinematicCameraInstruction(cameraMovement, cameraDistance) {
  if (cameraMovement === 'auto' || !CINEMATIC_CAMERA_MOVEMENTS[cameraMovement]) {
    return null; // Let AI decide based on scene context
  }
  const cam = CINEMATIC_CAMERA_MOVEMENTS[cameraMovement];
  const baseLens = CAMERA_VOCAB[cameraDistance] || CAMERA_VOCAB.medium;
  return `Primary camera movement: ${cam.label} (${cam.desc}). Base lens: ${baseLens.lens} at ${baseLens.aperture}.`;
}

function buildMicroExpressionInstruction(microExpressions) {
  const expr = MICRO_EXPRESSION_VOCAB[microExpressions] || MICRO_EXPRESSION_VOCAB.auto;
  return `Subject micro-expressions: ${expr}. Maintain strict facial consistency from the reference image throughout all expressions.`;
}

function buildProductInteractionInstruction(productInteraction) {
  if (!productInteraction || !productInteraction.trim()) {
    return 'Focus on natural product interaction — fingers gliding over texture, holding with care, demonstrating use. Shallow depth of field blurs the background to isolate the product moment.';
  }
  return `Product interaction focus: ${sanitizeInlineText(productInteraction)}. Shallow depth of field isolating the product-subject interaction from the environment.`;
}

function buildRenderQualityInstruction(renderQuality) {
  const quality = RENDER_QUALITY_MAP[renderQuality] || RENDER_QUALITY_MAP['4k'];
  return `Render specification: ${quality.specs}. Slow-motion physics where appropriate for product emphasis.`;
}

function buildCinematicHookBlock(options) {
  if (!options.cinematicMode) return '';

  const cameraMovementInst = buildCinematicCameraInstruction(options.cameraMovement, options.cameraDistance);
  const microExprInst = buildMicroExpressionInstruction(options.microExpressions);
  const productInst = buildProductInteractionInstruction(options.productInteraction);
  const renderInst = buildRenderQualityInstruction(options.renderQuality);

  const lines = [
    '═══ CINEMATIC PRODUCT HOOK (Pro-Level) ═══',
    'Formula: [Camera Movement & Lens] + [Subject Action & Micro-Expressions] + [Product Interaction Focus] + [Cinematic Lighting] + [Render & Texture Physics] + [Motion Parameters]',
    '',
    '▸ CAMERA MOVEMENT (The Visual Hook):',
    cameraMovementInst || '  Let AI choose optimal camera movement per scene (push-in for hook, orbit for showcase, tracking for action).',
    '  Priority: dynamic camera movement that forces viewer focus within 3 seconds.',
    '',
    '▸ MICRO-EXPRESSIONS (The Human Element):',
    `  ${microExprInst}`,
    '  Use mirror-empathy psychology: expressions that trigger emotional resonance in viewers.',
    '',
    '▸ PRODUCT INTERACTION (The Selling Point):',
    `  ${productInst}`,
    '  Product must interact with light and environment — never look like a 2D overlay.',
    '',
    '▸ RENDER & TEXTURE PHYSICS (The Realism Factor):',
    `  ${renderInst}`,
    '  Visible skin texture (pores, fine lines), hyper-realistic fabric physics (thread-level detail), realistic material rendering (metallic reflection, matte absorption, glass refraction).',
    '',
    `▸ ENHANCED NEGATIVE PROMPT BASELINE:`,
    `  ${CINEMATIC_NEGATIVE_PROMPT}`,
    '',
  ];

  return lines.join('\n');
}

// ── Voice Character Personas ──
const VOICE_CHARACTER_VOCAB = {
  auto: { label: 'Auto', tone: '', style: '' },
  'cewek-gen-z': {
    label: 'Cewek Gen-Z',
    tone: 'energetic, casual, playful, relatable young woman',
    style: 'Use slang and informal language (e.g. "gais", "literally", "no debat", "worth it banget"). Short punchy sentences. Excited energy with modern TikTok vocabulary.',
  },
  'cowok-gen-z': {
    label: 'Cowok Gen-Z',
    tone: 'chill, confident, casual young man',
    style: 'Relatable bro-talk style (e.g. "bro", "trust me", "game changer sih ini"). Keep it simple, honest, and effortlessly cool.',
  },
  'ibu-ibu-smart': {
    label: 'Ibu-Ibu Smart',
    tone: 'warm, practical, motherly, experienced, trustworthy',
    style: 'Speak like a savvy mom sharing tips with friends (e.g. "Bun, ini beneran bagus", "anak-anak suka banget"). Practical language, focus on value and family benefit.',
  },
  'profesional': {
    label: 'Profesional',
    tone: 'authoritative, knowledgeable, clean, corporate-friendly',
    style: 'Polished language, data-driven claims, structured delivery. Suitable for tech/gadget/business products. Avoid slang, keep sentences measured and credible.',
  },
  'beauty-guru': {
    label: 'Beauty Guru',
    tone: 'glowing, aspirational, gentle, expert',
    style: 'Skincare/beauty expert persona. Use ingredient names naturally, describe textures and sensations (e.g. "teksturnya lightweight banget", "langsung menyerap"). Reassuring and knowledgeable.',
  },
  'reviewer-jujur': {
    label: 'Reviewer Jujur',
    tone: 'honest, balanced, no-nonsense, trustworthy',
    style: 'Give genuine pros and cons. Speak like a friend who gives real advice (e.g. "jujur ya", "minusnya sih...", "tapi overall worth it"). Builds credibility through honesty.',
  },
  'hype-man': {
    label: 'Hype Man',
    tone: 'high-energy, enthusiastic, urgency-driven, salesman',
    style: 'Maximum energy and FOMO triggers (e.g. "BURUAN!", "stok tinggal dikit!", "gila harganya!"). Fast-paced, persuasive, flash-sale energy. Use exclamation marks heavily.',
  },
  'storyteller': {
    label: 'Storyteller',
    tone: 'warm, narrative, emotional, engaging',
    style: 'Tell a mini-story around the product (e.g. "Awalnya aku skeptis...", "sampai akhirnya aku coba..."). Build emotional arc: problem → discovery → transformation.',
  },
  'asmr-soft': {
    label: 'ASMR / Soft Voice',
    tone: 'whispery, gentle, calming, intimate',
    style: 'Soft-spoken and soothing. Short, breathy sentences. Focus on sensory descriptions (e.g. "dengar suara ini...", "rasain teksturnya..."). Minimal words, maximum vibe.',
  },
  'custom': {
    label: 'Custom',
    tone: '',
    style: '',
  },
};

function buildVoiceConstraints(options, voiceLanguage) {
  const voiceLabel = resolveVoiceLineLabel(options.voiceStyle);
  if (!voiceLabel) {
    return {
      instruction: '- Voice disabled: DO NOT output Dialogue/Voiceover/Lip-sync lines.',
      lineLabel: null,
      example: '',
    };
  }

  const hasManualScript = options.voiceScriptMode === 'manual' && options.voiceScript?.trim();
  const scriptReference = hasManualScript ? sanitizeInlineText(options.voiceScript) : null;

  // Voice Character Persona
  const characterKey = options.voiceCharacter || 'auto';
  const character = VOICE_CHARACTER_VOCAB[characterKey] || VOICE_CHARACTER_VOCAB.auto;
  const isCustomCharacter = characterKey === 'custom';
  const hasCustomCharacterDesc = isCustomCharacter && options.customVoiceCharacter?.trim();

  const characterLines = [];
  if (characterKey !== 'auto') {
    if (isCustomCharacter && hasCustomCharacterDesc) {
      characterLines.push(`- Voice character persona: CUSTOM — ${sanitizeInlineText(options.customVoiceCharacter)}`);
    } else if (!isCustomCharacter && character.tone) {
      characterLines.push(`- Voice character persona: "${character.label}" — tone: ${character.tone}.`);
      characterLines.push(`- Speaking style guide: ${character.style}`);
    }
    characterLines.push('- ALL spoken lines must stay in-character. Maintain consistent persona across every scene.');
  }

  return {
    instruction: [
      `- Include exactly one "${voiceLabel}:" line per scene in ${voiceLanguage}.`,
      '- Keep each spoken line concise (max 16 words), natural, and conversion-oriented.',
      '- No hashtags, no emojis, no translation, no narration outside that line.',
      scriptReference ? `- Manual script anchor: "${scriptReference}" (adapt naturally per scene beat).` : '- If script mode is AI, generate varied hooks/proof/CTA lines per scene.',
      ...characterLines,
    ].join('\n'),
    lineLabel: voiceLabel,
    example: `\n${voiceLabel}: "[Spoken line in ${voiceLanguage}, <=16 words${characterKey !== 'auto' ? `, in ${character.label || 'custom'} persona` : ''}]"`,
  };
}

export function buildSystemPrompt(options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const customTemplate = mergedOptions.systemPromptTemplate;
  const outputLanguage = LANGUAGE_LABELS[resolveOutputLanguage(mergedOptions.outputLanguage)] || LANGUAGE_LABELS.EN;
  const sceneCount = normalizeSceneCount(mergedOptions.sceneCount);

  const basePrompt = customTemplate || DEFAULT_SYSTEM_PROMPT_TEMPLATE;
  const voiceLabel = resolveVoiceLineLabel(mergedOptions.voiceStyle);

  const cinematicAddendum = mergedOptions.cinematicMode ? `
CINEMATIC PRODUCT HOOK PROTOCOL (Pro-Level):
You must apply the Cinematic Product Hook formula to EVERY scene. This formula is designed to maximize viewer retention and conversion on short-form video platforms (TikTok, Shopee Video). Each scene must contain ALL of these elements woven into one flowing paragraph:
1. CAMERA MOVEMENT & LENS (The Visual Hook): Specify exact lens, aperture, and camera movement. Push-in or slow orbit for the hook scene. Never let camera be static without reason.
2. MICRO-EXPRESSIONS (The Human Element): Describe authentic subtle facial micro-expressions that trigger mirror empathy. NOT just "smiling" — use eye widening, subtle nods, focused gaze, lip micro-curving.
3. PRODUCT INTERACTION (The Selling Point): Show tactile product interaction with texture detail. Fingers on surfaces, light catching materials, shallow DOF isolating the product moment.
4. CINEMATIC LIGHTING (The Pattern Interrupt): Use high-contrast dimensional lighting (rim, Rembrandt, volumetric). NEVER flat lighting. Light must sculpt the subject and product.
5. RENDER & TEXTURE PHYSICS (The Realism Factor): Demand visible skin pores, realistic fabric physics, subsurface scattering, physically-based materials. Force the AI to render at its highest capability.
6. MOTION PARAMETERS: Slow-motion for product emphasis, natural physics for interactions, smooth camera motion with professional damping.` : '';

  return `${basePrompt}${cinematicAddendum}

OUTPUT CONTRACT (STRICT):
- Produce exactly ${sceneCount} scenes labeled as: SCENE 1, SCENE 2, ..., SCENE ${sceneCount}.
- Language for all scene content: ${outputLanguage}.
- No markdown code fences, no intro text, no closing notes, no self-explanation.
- Keep each scene prompt physically plausible and temporally coherent with previous scene.
- ${buildNegativePromptInstruction(mergedOptions.includeNegativePrompt)}
- ${voiceLabel ? `Use "${voiceLabel}:" line in every scene.` : 'No Dialogue/Voiceover/Lip-sync lines anywhere.'}
- Always preserve identity continuity from reference image and never describe face/skin/hair/body features.
- If uncertain, prefer concrete, camera-ready details over abstract adjectives.`;
}

export function buildUserPrompt(preset, options, imageReferences = []) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const sceneCount = normalizeSceneCount(mergedOptions.sceneCount);
  const outputLanguageCode = resolveOutputLanguage(mergedOptions.outputLanguage);
  const outputLanguage = LANGUAGE_LABELS[outputLanguageCode] || LANGUAGE_LABELS.EN;
  const realism = REALISM_MAP[mergedOptions.realismLevel] || REALISM_MAP.High;
  const presetName = sanitizeInlineText(preset?.name, 'Affiliate Cinematic');
  const presetVibe = sanitizeInlineText(preset?.vibe, 'dynamic affiliate storytelling');
  const presetEnergy = sanitizeInlineText(preset?.energyLevel, 'Medium');
  const presetCameraStyle = sanitizeInlineText(preset?.cameraStyle, 'Handheld/Dynamic');
  const backgroundInstruction = buildBackgroundInstruction(mergedOptions.background);
  const includeNegativePrompt = Boolean(mergedOptions.includeNegativePrompt);

  const declaredImageCount = Number.parseInt(mergedOptions._imageCount, 10);
  const inferredImageCount = Number.isFinite(declaredImageCount) && declaredImageCount > 0
    ? declaredImageCount
    : Math.max(1, Array.isArray(imageReferences) ? imageReferences.length : 0);
  const imageReferenceInstruction = buildImageReferenceInstruction(imageReferences, inferredImageCount);

  const voiceLanguage = mergedOptions.voiceLanguage === 'ID' ? 'Indonesian (Bahasa Indonesia)' : 'English';
  const customInstructions = mergedOptions.customInstructions?.trim() || '';
  const subjectDescription = sanitizeInlineText(mergedOptions.subjectDescription);

  const camVocab = CAMERA_VOCAB[mergedOptions.cameraDistance] || CAMERA_VOCAB.medium;
  const lightVocab = LIGHTING_VOCAB[mergedOptions.lighting] || LIGHTING_VOCAB['soft daylight'];
  const aspectComp = ASPECT_COMPOSITION[mergedOptions.aspectRatio] || ASPECT_COMPOSITION['9:16'];

  const bpm = parseBpmRange(preset?.bpmRange);
  const sceneDuration = estimateSceneDuration(sceneCount, mergedOptions.targetDuration);
  const beatsPerScene = Math.round((bpm.avg / 60) * sceneDuration);

  const moves = Array.isArray(preset?.signatureMoves) && preset.signatureMoves.length > 0
    ? preset.signatureMoves
    : ['controlled movement with natural transition'];
  const moveAssignments = Array.from({ length: sceneCount }, (_, index) => {
    const move = sanitizeInlineText(moves[index % moves.length], 'controlled movement');
    return `- Scene ${index + 1}: "${move}"`;
  }).join('\n');

  const beatStructure = preset?.beatStructure ? `Beat Structure: ${sanitizeInlineText(preset.beatStructure)}` : '';
  const transitionStyle = preset?.transitionStyle ? `Transition Style: ${sanitizeInlineText(preset.transitionStyle)}` : '';
  const moodKeywords = Array.isArray(preset?.moodKeywords) && preset.moodKeywords.length > 0
    ? `Mood Keywords: ${preset.moodKeywords.map((value) => sanitizeInlineText(value)).join(', ')}`
    : '';

  const outfitLock = preset?.wardrobe
    ? sanitizeInlineText(preset.wardrobe)
    : '[as worn in reference image — describe consistent outfit details in every scene]';

  const voiceConstraints = buildVoiceConstraints(mergedOptions, voiceLanguage);
  const noVoiceWarning = !voiceConstraints.lineLabel
    ? '\n⛔ Voice is disabled. Do not output spoken lines.'
    : '';

  const narrativeArc = buildNarrativeArc(sceneCount, outputLanguageCode);
  const voiceExample = voiceConstraints.example || '';

  // Cinematic Product Hook (Pro-Level)
  const cinematicBlock = buildCinematicHookBlock(mergedOptions);
  const isCinematic = Boolean(mergedOptions.cinematicMode);

  const negExample = includeNegativePrompt
    ? `\nNegative Prompt: ${isCinematic ? CINEMATIC_NEGATIVE_PROMPT : 'extra fingers, clothing teleportation, outfit color change, background warping, temporal flicker, duplicate limbs, floating body parts'}`
    : '';

  return `═══════════════════════════════════════
IMAGE-TO-VIDEO — ${presetName}${isCinematic ? ' [CINEMATIC HOOK MODE]' : ''}
Vibe: ${presetVibe} | Energy: ${presetEnergy}
BPM: ${sanitizeInlineText(preset?.bpmRange, `${bpm.avg}`)} | Camera: ${presetCameraStyle}
${preset?.notes ? `Notes: ${sanitizeInlineText(preset.notes)}` : ''}
═══════════════════════════════════════

⚠️ IMAGE-TO-VIDEO MODE:
Subject appearance comes from reference image.
Never describe facial features, skin tone, hair color, eye details, or body proportions.
Focus on: movement mechanics, outfit behavior, camera craft, lighting, scene transitions, conversion intent.

${subjectDescription ? `SUBJECT NOTES (non-facial constraints only): ${subjectDescription}` : 'SUBJECT NOTES: none'}

${cinematicBlock}CONVERSION NARRATIVE ARC:
${narrativeArc}

OUTFIT LOCK (repeat in ALL scenes): ${outfitLock}
${beatStructure}
${transitionStyle}
${moodKeywords}

CAMERA SETTINGS:
- Lens: ${camVocab.lens} at ${camVocab.aperture}
- Movement: ${camVocab.movement}
- Framing: ${camVocab.framing}
- Composition: ${aspectComp}

LIGHTING:
- Temperature: ${lightVocab.temp} | Direction: ${lightVocab.direction}
- Shadows: ${lightVocab.shadow} | Mood: ${lightVocab.mood}

Background: ${backgroundInstruction}
Realism: ${realism} | Output Language: ${outputLanguage}

RHYTHM:
- BPM range: ${bpm.min}-${bpm.max} (avg ${bpm.avg})
- Per scene: ${sceneDuration}s (~${beatsPerScene} beats)
- Total runtime: ${sceneCount * sceneDuration}s

MOVEMENT PER SCENE:
${moveAssignments}

MULTI-REFERENCE CONTROL:
${imageReferenceInstruction}

VOICE POLICY:
${voiceConstraints.instruction}${noVoiceWarning}

${customInstructions ? `CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ''}TASK:
Generate exactly ${sceneCount} scenes. For each scene:
1. Describe one continuous action paragraph (minimum 75 words) with physically grounded movement.
2. Repeat outfit lock and explain garment/accessory physics reacting to motion.
3. Mention concrete camera behavior, lens feel, and lighting interaction in the same paragraph.
4. End paragraph with a transition cue into next scene.
5. Add one scene-specific Negative Prompt line only if enabled.
6. Add one spoken line using the required voice label only if voice is enabled.

FORMAT (STRICT, repeat for all scenes):
SCENE 1: [TITLE IN UPPERCASE]
Duration: ${sceneDuration}s | Beats: ${beatsPerScene} | Move: [assigned move] | Camera: [lens + movement]
Prompt: [single rich paragraph, >=75 words, no bullet list]
${includeNegativePrompt ? 'Negative Prompt: [scene-specific artifact blockers]' : '[Do not output Negative Prompt line]'}${voiceExample}
${negExample}

DO NOT output anything outside the SCENE blocks.`;
}

export function postProcessPromptOutput(rawText, options = {}) {
  if (!rawText) return '';

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const voiceLabel = resolveVoiceLineLabel(mergedOptions.voiceStyle);

  let text = String(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```[a-zA-Z]*\s*$/gm, '')
    .replace(/^\s*```\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Normalize scene headers for reliable parsing downstream.
  text = text.replace(/^\s*(?:SCENE|ADEGAN)\s*(\d+)\s*[:.-]\s*(.+)$/gim, (_, number, title) => {
    return `SCENE ${number}: ${String(title || '').trim().toUpperCase()}`;
  });

  // Normalize voice line labels or remove voice lines when disabled.
  if (!voiceLabel) {
    text = text.replace(/^\s*(Dialogue|Voiceover|Lip-sync):.*$/gim, '').replace(/\n{3,}/g, '\n\n');
  } else {
    text = text.replace(/^\s*(Dialogue|Voiceover|Lip-sync):/gim, `${voiceLabel}:`);
  }

  // Remove negative prompts entirely when disabled.
  if (!mergedOptions.includeNegativePrompt) {
    text = text.replace(/^\s*Negative Prompt:.*$/gim, '').replace(/\n{3,}/g, '\n\n');
  }

  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const QUALITY_SCENE_HEADER_REGEX = /^(?:SCENE|ADEGAN)\s*(\d+)\s*[:.-]\s*([^\n]*)$/gim;
const QUALITY_VOICE_LINE_REGEX = /^\s*(Dialogue|Voiceover|Lip-sync):\s*/gim;
const QUALITY_APPEARANCE_PATTERNS = [
  /\b(face shape|facial features|eye color|skin tone|skin color|hair color)\b/gi,
  /\b(wajah|fitur wajah|warna kulit|warna rambut|hidung|bibir)\b/gi,
];

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeForQuality(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

function countWords(text) {
  const tokens = String(text || '').trim().match(/\S+/g);
  return tokens ? tokens.length : 0;
}

function splitPromptScenes(text) {
  const normalized = normalizeForQuality(text);
  QUALITY_SCENE_HEADER_REGEX.lastIndex = 0;
  const headers = [...normalized.matchAll(QUALITY_SCENE_HEADER_REGEX)];
  if (headers.length === 0) return [];

  return headers.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < headers.length
      ? headers[index + 1].index ?? normalized.length
      : normalized.length;
    return {
      scene: Number.parseInt(match[1], 10) || index + 1,
      title: String(match[2] || '').trim(),
      content: normalized.slice(start, end).trim(),
    };
  });
}

function extractPromptBody(sceneContent) {
  const normalized = normalizeForQuality(sceneContent);
  const promptMatch = normalized.match(/(?:^|\n)\s*Prompt:\s*([\s\S]*?)(?=\n(?:Negative Prompt|Dialogue|Voiceover|Lip-sync|SCENE|ADEGAN)\b|$)/i);
  if (promptMatch?.[1]) return promptMatch[1].trim();
  return normalized;
}

function detectAppearanceHits(text) {
  const normalized = normalizeForQuality(text);
  const hits = [];
  QUALITY_APPEARANCE_PATTERNS.forEach((pattern) => {
    pattern.lastIndex = 0;
    for (const match of normalized.matchAll(pattern)) {
      const hit = String(match[0] || '').toLowerCase();
      if (hit && !hits.includes(hit)) hits.push(hit);
    }
  });
  return hits;
}

function resolveQualityStatus(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'needs_work';
}

function createCheck(id, label, weight, fraction, details) {
  const safeFraction = clampNumber(Number(fraction) || 0, 0, 1);
  const score = Math.round(weight * safeFraction);
  return {
    id,
    label,
    weight,
    score,
    passed: score >= weight,
    details,
  };
}

function pushUniqueWarning(warnings, warning) {
  const exists = warnings.some((item) => item.code === warning.code && item.message === warning.message);
  if (!exists) warnings.push(warning);
}

function buildQualityTips(checks, warnings, mergedOptions) {
  const tips = [];
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.id);

  if (failedChecks.includes('scene_count')) {
    tips.push(`Set scene count to ${normalizeSceneCount(mergedOptions.sceneCount)} and keep headers strictly SCENE 1..N.`);
  }
  if (failedChecks.includes('scene_structure')) {
    tips.push('Use consistent scene fields: Duration, Beats, Move, Camera, and Prompt in every scene.');
  }
  if (failedChecks.includes('prompt_depth')) {
    tips.push('Expand each scene prompt to at least 65 words with concrete movement, camera, and lighting details.');
  }
  if (failedChecks.includes('negative_prompt_rule')) {
    tips.push(mergedOptions.includeNegativePrompt
      ? 'Add one scene-specific Negative Prompt line for each scene.'
      : 'Remove all Negative Prompt lines when the toggle is disabled.');
  }
  if (failedChecks.includes('voice_policy')) {
    const voiceLabel = resolveVoiceLineLabel(mergedOptions.voiceStyle);
    tips.push(voiceLabel
      ? `Use exactly one "${voiceLabel}:" line in each scene.`
      : 'Keep output silent: remove Dialogue/Voiceover/Lip-sync lines.');
  }
  if (failedChecks.includes('identity_lock')) {
    tips.push('Avoid face/skin/hair descriptions and focus on movement, outfit behavior, camera, and lighting.');
  }
  if (warnings.some((warning) => warning.severity === 'high')) {
    tips.push('Fix high-severity issues first before regeneration.');
  }

  return [...new Set(tips)].slice(0, 5);
}

export function evaluatePromptQuality(promptText, options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const normalizedPrompt = normalizeForQuality(promptText);
  const scenes = splitPromptScenes(normalizedPrompt);
  const expectedSceneCount = normalizeSceneCount(mergedOptions.sceneCount);
  const includeNegativePrompt = Boolean(mergedOptions.includeNegativePrompt);
  const voiceLabel = resolveVoiceLineLabel(mergedOptions.voiceStyle);
  const warnings = [];

  const sceneCountDistance = Math.abs(scenes.length - expectedSceneCount);
  const sceneCountFraction = expectedSceneCount > 0
    ? clampNumber(1 - (sceneCountDistance / expectedSceneCount), 0, 1)
    : 0;
  const sceneCountCheck = createCheck(
    'scene_count',
    'Scene Count Compliance',
    25,
    scenes.length === expectedSceneCount ? 1 : sceneCountFraction,
    `${scenes.length}/${expectedSceneCount} scenes detected.`,
  );

  if (scenes.length !== expectedSceneCount) {
    pushUniqueWarning(warnings, {
      code: 'scene_count_mismatch',
      severity: 'high',
      message: `Expected ${expectedSceneCount} scenes but detected ${scenes.length}.`,
    });
  }

  const structureCompliantScenes = scenes.filter((scene) => {
    return /(?:^|\n)\s*Duration:/i.test(scene.content) && /(?:^|\n)\s*Prompt:/i.test(scene.content);
  }).length;
  const structureFraction = expectedSceneCount > 0
    ? structureCompliantScenes / expectedSceneCount
    : 0;
  const structureCheck = createCheck(
    'scene_structure',
    'Scene Format Completeness',
    20,
    structureFraction,
    `${structureCompliantScenes}/${expectedSceneCount} scenes include Duration + Prompt lines.`,
  );

  if (structureCompliantScenes < expectedSceneCount) {
    pushUniqueWarning(warnings, {
      code: 'scene_structure_incomplete',
      severity: 'medium',
      message: 'Some scenes are missing required structure fields (Duration or Prompt).',
    });
  }

  const minPromptWords = 65;
  const perScenePromptAnalysis = scenes.map((scene) => {
    const promptBody = extractPromptBody(scene.content);
    return {
      scene: scene.scene,
      words: countWords(promptBody),
    };
  });
  const richPromptScenes = perScenePromptAnalysis.filter((item) => item.words >= minPromptWords).length;
  const promptDepthFraction = expectedSceneCount > 0
    ? richPromptScenes / expectedSceneCount
    : 0;
  const promptDepthCheck = createCheck(
    'prompt_depth',
    'Prompt Depth',
    20,
    promptDepthFraction,
    `${richPromptScenes}/${expectedSceneCount} scenes reach >=${minPromptWords} words.`,
  );

  perScenePromptAnalysis
    .filter((item) => item.words < minPromptWords)
    .slice(0, 4)
    .forEach((item) => {
      pushUniqueWarning(warnings, {
        code: 'scene_too_short',
        severity: 'medium',
        message: `Scene ${item.scene} is short (${item.words} words).`,
      });
    });

  const negativePromptCount = scenes.filter((scene) => /(?:^|\n)\s*Negative Prompt:/i.test(scene.content)).length;
  const negativePromptFraction = includeNegativePrompt
    ? (expectedSceneCount > 0 ? negativePromptCount / expectedSceneCount : 0)
    : (negativePromptCount === 0 ? 1 : 0);
  const negativePromptCheck = createCheck(
    'negative_prompt_rule',
    includeNegativePrompt ? 'Negative Prompt Presence' : 'Negative Prompt Suppression',
    10,
    negativePromptFraction,
    includeNegativePrompt
      ? `${negativePromptCount}/${expectedSceneCount} scenes include Negative Prompt lines.`
      : `Negative Prompt lines found: ${negativePromptCount}.`,
  );

  if (includeNegativePrompt && negativePromptCount < expectedSceneCount) {
    pushUniqueWarning(warnings, {
      code: 'negative_prompt_missing',
      severity: 'medium',
      message: 'Negative Prompt lines are missing in one or more scenes.',
    });
  }
  if (!includeNegativePrompt && negativePromptCount > 0) {
    pushUniqueWarning(warnings, {
      code: 'negative_prompt_should_be_off',
      severity: 'low',
      message: 'Negative Prompt lines are present even though the option is disabled.',
    });
  }

  const sceneVoiceAnalysis = scenes.map((scene) => {
    QUALITY_VOICE_LINE_REGEX.lastIndex = 0;
    const labels = [...scene.content.matchAll(QUALITY_VOICE_LINE_REGEX)].map((match) => String(match[1] || '').toLowerCase());
    return {
      scene: scene.scene,
      labels,
    };
  });
  const compliantVoiceScenes = sceneVoiceAnalysis.filter((item) => {
    if (!voiceLabel) return item.labels.length === 0;
    return item.labels.length === 1 && item.labels[0] === voiceLabel.toLowerCase();
  }).length;
  const voiceFraction = expectedSceneCount > 0
    ? compliantVoiceScenes / expectedSceneCount
    : 0;
  const voiceCheck = createCheck(
    'voice_policy',
    voiceLabel ? 'Voice Line Compliance' : 'Silent Output Compliance',
    15,
    voiceFraction,
    voiceLabel
      ? `${compliantVoiceScenes}/${expectedSceneCount} scenes include exactly one "${voiceLabel}:" line.`
      : `Scenes without voice lines: ${compliantVoiceScenes}/${expectedSceneCount}.`,
  );

  if (!voiceLabel) {
    const voiceLineCount = sceneVoiceAnalysis.reduce((sum, item) => sum + item.labels.length, 0);
    if (voiceLineCount > 0) {
      pushUniqueWarning(warnings, {
        code: 'voice_line_unexpected',
        severity: 'medium',
        message: `Detected ${voiceLineCount} voice line(s) while voice mode is disabled.`,
      });
    }
  } else if (compliantVoiceScenes < expectedSceneCount) {
    pushUniqueWarning(warnings, {
      code: 'voice_line_incomplete',
      severity: 'medium',
      message: `Voice policy mismatch. Require exactly one "${voiceLabel}:" line per scene.`,
    });
  }

  const appearanceHits = detectAppearanceHits(normalizedPrompt);
  const identityFraction = appearanceHits.length === 0
    ? 1
    : appearanceHits.length <= 2 ? 0.5 : 0;
  const identityCheck = createCheck(
    'identity_lock',
    'Identity Lock Safety',
    10,
    identityFraction,
    appearanceHits.length === 0
      ? 'No forbidden face/skin/hair descriptions detected.'
      : `Potential appearance terms detected: ${appearanceHits.join(', ')}.`,
  );

  if (appearanceHits.length > 0) {
    pushUniqueWarning(warnings, {
      code: 'appearance_description_detected',
      severity: 'high',
      message: `Potential identity-lock violations found: ${appearanceHits.join(', ')}.`,
    });
  }

  const checks = [
    sceneCountCheck,
    structureCheck,
    promptDepthCheck,
    negativePromptCheck,
    voiceCheck,
    identityCheck,
  ];

  const score = checks.reduce((sum, check) => sum + check.score, 0);
  const status = resolveQualityStatus(score);
  const tips = buildQualityTips(checks, warnings, mergedOptions);

  return {
    score,
    status,
    sceneCount: {
      expected: expectedSceneCount,
      actual: scenes.length,
    },
    checks,
    warnings: warnings.slice(0, 8),
    tips,
  };
}
