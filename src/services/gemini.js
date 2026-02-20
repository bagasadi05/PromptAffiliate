/**
 * Gemini AI Service Layer
 *
 * Toggle USE_MOCK to switch between mock and real API mode.
 * Supports: backend proxy (/api/generate), direct Gemini API, streaming, retry logic.
 * API key can come from localStorage or .env
 */

import { getItem, KEYS } from '../utils/localStorage';
import { DEFAULT_OPTIONS } from '../constants/defaultOptions';

export const USE_MOCK = false;

// ==================== API KEY MANAGEMENT ====================
export function getApiKey() {
  const storedKey = getItem(KEYS.API_KEY, '');
  if (storedKey) return storedKey;
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function hasApiKey() {
  return !!getApiKey();
}

// ==================== DEFAULT SYSTEM PROMPT (for template customization) ====================
export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = `You are an elite cinematographer, motion director, and AI video prompt engineer specializing in IMAGE-TO-VIDEO generation (Grok Aurora, Kling, Runway Gen-3, Wan2.1). Your goal is to craft prompts that produce 100% PHOTOREALISTIC footage indistinguishable from real iPhone 15 Pro / Arri Alexa / Sony A7S III footage.

⚠️ IMAGE-TO-VIDEO MODE: The subject's face, skin, hair, and physical appearance are provided by the reference image. DO NOT describe or invent them. Focus ONLY on: movement mechanics, outfit behavior, camera, and lighting.

CRITICAL RULES:
1. CINEMATIC NARRATIVE: Each scene is ONE continuous flowing paragraph (not bullet points). Weave together movement, outfit behavior, camera motion, lighting interaction, and atmosphere.
2. OUTFIT LOCK — ABSOLUTE RULE: Describe the COMPLETE outfit in EVERY scene prompt with ultra-specific detail: garment type, exact color, fabric texture (cotton, silk, denim, ribbed knit), fit, hem length, sleeve type, every accessory (bag strap, shoe sole, jewelry). The outfit is FROZEN across all scenes — same garments, same colors, zero changes.
3. RAW FOOTAGE KEYWORDS: Integrate naturally: "film grain", "motion blur, shutter angle 180°", "shallow depth of field", "handheld micro-shake", "lens breathing", "subtle chromatic aberration", "4K RAW, 24fps cinematic / 60fps slow-mo".
4. BODY MECHANICS: Describe weight transfer, momentum, muscle engagement, center of gravity. Movements have preparation → execution → recovery phases. Describe how fabric and accessories respond (inertia, drape, swing, wrinkle, stretch).
5. CAMERA CRAFT: Specify lens focal length (24mm/35mm/50mm/85mm), aperture (f/1.4–f/8), camera movement type (dolly, steadicam orbit, handheld, static tripod, jib). Describe rack focus and pull focus transitions.
6. LIGHTING CRAFT: Describe light source direction, color temperature (2700K warm / 5600K daylight / 6500K cool), shadow quality (hard/soft). Note how light interacts with fabric texture and the environment.
7. SCENE TRANSITIONS: Each scene ends with a natural cut point: a beat hit, pose freeze, camera whip-pan, or motivated movement bridging to the next scene.
8. ANTI-AI ARTIFACTS: Never produce: clothing teleportation, outfit color change, background warping, temporal flickering, inconsistent shadows, frozen fabric, floating body parts.
9. DO NOT DESCRIBE FACE OR APPEARANCE: Zero mention of face shape, skin tone, eye color, hair, or body proportions — the reference image handles all of that.
10. BEAT-SYNC: Movements align to BPM. Use phrasing: "on the downbeat", "syncopated off-beat", "double-time on beats 3-4".`;

// ==================== MOCK DATA (Simulated Backend) ====================
// These are kept here for the mock mode only.
// The real logic is now in server/services/promptService.js

const LANGUAGE_LABELS = {
  EN: 'English',
  ID: 'Indonesian (Bahasa Indonesia)',
};

const SCENE_TEMPLATES = [
  {
    title: 'Opening Atmosphere',
    camera: '50mm f/2.8, steadicam push-in',
    bodyTemplate: (move) => `A cinematic medium shot on a 50mm lens at f/2.8 establishes the subject in soft diffused light with visible film grain and subtle lens breathing. The steadicam pushes in slowly as they settle into a confident starting pose, weight shifting to the right hip, then transition into ${move} with fluid organic momentum — fabric responds to the motion with natural inertia, creasing at the waist, while a faint sheen of skin catches the key light at the collarbone.`,
    negativePrompt: 'Stiff T-pose, frozen expression, plastic/poreless skin, extra fingers, AI face artifacts, unnatural joint angles, hair visible outside hijab/headscarf, temporal flickering, background warping.',
    colorGrade: 'Neutral Rec.709, slight warm push +5 on shadows',
  },
  {
    title: 'Main Groove',
    camera: '35mm f/3.2, handheld with stabilization',
    bodyTemplate: (move) => `Handheld 35mm at f/3.2 follows the rhythm with subtle micro-shake and motion blur at 180° shutter angle. The subject executes ${move} with authentic weight transfer — preparation, execution, recovery visible in the hip-knee chain. Fabric dynamics look physically grounded: sleeves swing with arm momentum, hemline follows 200ms behind body direction changes. Shallow depth of field separates the subject from a naturally blurred environment.`,
    negativePrompt: 'Robotic repetitive motion, limb clipping, frozen static hair/fabric, frame stutter, duplicated limbs, hijab slipping off, face morphing between frames.',
    colorGrade: 'Slightly desaturated, crushed blacks, film emulation',
  },
  {
    title: 'Building Energy',
    camera: '50mm f/2, steadicam orbit 15°',
    bodyTemplate: (move) => `The steadicam begins a slow 15° orbit around the subject, the 50mm at f/2 creating a shifting bokeh background that adds dimensionality. Energy builds visibly — breathing quickens, micro-expressions shift from concentration to confidence. The subject executes ${move} with building intensity, center of gravity lowering slightly, muscles engaging visibly through forearm tension and calf definition. Light wraps around the face as the camera angle changes, revealing the texture of skin and the weave of fabric.`,
    negativePrompt: 'Flat 2D appearance, dead/unfocused eyes, waxy skin sheen, floating disconnected feet, CGI-perfect lighting, morphing facial features, inconsistent shadows.',
    colorGrade: 'Warm mid-tones, highlight rolloff, subtle halation on bright edges',
  },
  {
    title: 'Peak Performance',
    camera: '35mm f/4, wide tracking dolly',
    bodyTemplate: (move) => `A wider 35mm frame at f/4 captures full-body execution of ${move}, the tracking dolly matching subject velocity. The performance peaks — movements are precise but unmistakably human, with subtle balance corrections, a momentary weight catch on the lead foot, natural light flare streaking across the lens as the subject crosses the key light axis. Sweat catches the rim light at the temples, jewelry swings with 1-beat delay behind the body motion.`,
    negativePrompt: 'Impossible joint angles, static unmoving clothing, plastic sheen skin texture, cartoon proportions, disappearing/teleporting hijab, duplicate body parts.',
    colorGrade: 'Punchy contrast, vibrant but natural saturation, sharp resolve',
  },
  {
    title: 'Tight Focus',
    camera: '85mm f/1.8, static with rack focus',
    bodyTemplate: (move) => `An 85mm at f/1.8 delivers extreme shallow depth of field, the background dissolving into creamy bokeh with subtle chromatic aberration at highlight edges. The camera captures the intimate detail of ${move} — individual finger articulation, the tension line from wrist to elbow, how the jaw sets before a head snap. A rack focus from hands to eyes reveals the expression shift, while handheld micro-shake maintains the documentary authenticity of every beat.`,
    negativePrompt: 'Malformed hands/fingers, missing digits, over-smoothed plastic skin, uncanny valley expression, pixelated out-of-focus areas, watermark artifacts.',
    colorGrade: 'Soft highlight rolloff, rich skin tones, natural vignette from lens optics',
  },
  {
    title: 'Dynamic Flow',
    camera: '24mm f/5.6, low-angle tracking',
    bodyTemplate: (move) => `A lower-angle 24mm tracking shot at f/5.6 emphasizes vertical momentum and environmental context through ${move}. The wider focal length introduces subtle barrel distortion at frame edges, grounding the shot in real-world optics. Lighting shifts naturally with camera and body movement — shadows slide across the floor, rim light intensity changes as the subject rotates. The environment feels lived-in: wall textures, floor reflections, ambient particles catching backlight.`,
    negativePrompt: 'Teleporting pose changes, warped barrel perspective on subject, inconsistent shadow direction, subject cloning/ghosting, background morphing or sliding.',
    colorGrade: 'Cool shadows, warm highlights, split-toning inspired by Fincher',
  },
  {
    title: 'Vibe Check',
    camera: '50mm f/2, handheld intimate',
    bodyTemplate: (move) => `The handheld 50mm at f/2 mirrors the subject's energy during ${move}, creating an intimate, almost documentary feel. Direct eye contact with the lens creates audience connection — pupils dilate slightly in the warm light, catch-lights dance in the iris. Natural bokeh envelops the environment while the subject's expression shifts between beats, micro-movements of the lips and eyebrows conveying the emotional subtext of the choreography. Breathing is visible in the chest and shoulders.`,
    negativePrompt: 'Cross-eyed gaze direction, over-filtered Instagram look, neon color bleeding across skin, double-exposure glitch artifacts, AI watermarks, inconsistent eye color.',
    colorGrade: 'Warm analog feel, lifted blacks, slight grain intensity increase',
  },
  {
    title: 'The Finale',
    camera: '50mm f/2.8, steadicam with slow pullback',
    bodyTemplate: (move) => `The sequence closes with a steadicam slow pullback on 50mm at f/2.8 as the subject performs ${move} and settles into a controlled final pose — weight centered, chin slightly elevated, the last breath of exertion visible in the shoulders. The shot lingers for 2 beats on the authentic expression of satisfaction before the frame holds. Final light flare caresses the edge of the frame as environmental audio fades, leaving the subject frozen in a decisive, editorial-worthy composition.`,
    negativePrompt: 'Abrupt unnatural cut, frozen mid-motion limbs, dissolving/melting body parts, morphing outfit texture between frames, inconsistent character identity vs Scene 1.',
    colorGrade: 'Lifted shadows, de-sharpened for cinematic softness, warm color wash',
  },
];

function normalizeSceneCount(value) {
  const sceneCount = Number.parseInt(value, 10);
  if (Number.isNaN(sceneCount)) return 4;
  return Math.min(8, Math.max(2, sceneCount));
}

function resolveOutputLanguage(value) {
  return value === 'ID' ? 'ID' : 'EN';
}

function resolveImageMimeType(imageBase64, imageMimeType) {
  if (imageMimeType) return imageMimeType;
  const match = imageBase64.match(/^data:(image\/[\w.+-]+);base64,/i);
  return match?.[1] || 'image/jpeg';
}

function createAbortError() {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function delayWithAbort(duration, signal) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, duration);

    function onAbort() {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(createAbortError());
    }

    if (!signal) return;
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function buildMockDialogue(options, sceneIndex) {
  if (options.voiceStyle === 'none') return '';

  const isID = options.voiceLanguage === 'ID';
  const userScripts = options.voiceScript
    ? options.voiceScript.split('.').map((part) => part.trim()).filter(Boolean)
    : [];

  if (options.voiceStyle === 'talking') {
    const scripts = userScripts.length > 0 ? userScripts : (isID
      ? [
        'Halo guys, cek ini deh!',
        'Jujur hasilnya bikin kaget.',
        'Ini beneran game changer.',
        'Klik keranjang kuning kalau mau coba!',
      ]
      : [
        'Hey guys, check this out!',
        'I honestly did not expect these results.',
        'This is such a game changer.',
        'Hit the link if you want to try it!',
      ]);
    return `Dialogue: "${scripts[sceneIndex % scripts.length]}"`;
  }

  if (options.voiceStyle === 'voiceover') {
    const scripts = userScripts.length > 0 ? userScripts : (isID
      ? [
        'Rasakan detail yang nyata di setiap gerakan.',
        'Visual yang jujur, natural, dan sinematik.',
        'Tunjukkan karakter kamu lewat setiap frame.',
        'Saatnya naik level dengan konten yang autentik.',
      ]
      : [
        'Experience realism in every motion detail.',
        'Natural visuals with cinematic clarity.',
        'Let every frame reflect your character.',
        'Time to level up with authentic content.',
      ]);
    return `Voiceover: "${scripts[sceneIndex % scripts.length]}"`;
  }

  return 'Lip-sync: "[Mouth movement synced to track]"';
}

function generateMockPrompt(preset, options) {
  const sceneCount = normalizeSceneCount(options.sceneCount);
  const outputLanguage = LANGUAGE_LABELS[resolveOutputLanguage(options.outputLanguage)] || LANGUAGE_LABELS.EN;
  const backgroundNote = options.background === 'keep from reference'
    ? 'Background remains consistent with the reference image.'
    : `Background is set to "${options.background}" and stays consistent across scenes.`;

  const scenes = [];
  for (let i = 0; i < sceneCount; i += 1) {
    let template;
    if (i === 0) template = SCENE_TEMPLATES[0];
    else if (i === sceneCount - 1) template = SCENE_TEMPLATES[SCENE_TEMPLATES.length - 1];
    else template = SCENE_TEMPLATES[1 + ((i - 1) % (SCENE_TEMPLATES.length - 2))];

    const move = preset.signatureMoves[i % preset.signatureMoves.length];
    const dialogue = buildMockDialogue(options, i);
    const content = `${template.bodyTemplate(move)} ${backgroundNote}`;

    scenes.push({
      num: i + 1,
      title: template.title,
      camera: template.camera || '',
      colorGrade: template.colorGrade || '',
      duration: '6s',
      content,
      negativePrompt: template.negativePrompt,
      dialogue,
    });
  }

  // Calculate beats per scene for mock output
  const bpmMatch = preset.bpmRange?.match(/(\d+)/);
  const avgBPM = bpmMatch ? parseInt(bpmMatch[1]) : 120;
  const beatsPerScene = Math.round((avgBPM / 60) * 6);

  const sceneText = scenes.map((scene) => {
    const negativePromptLine = options.includeNegativePrompt
      ? `Negative Prompt: ${scene.negativePrompt}\n`
      : '';

    return `
SCENE ${scene.num}: ${scene.title.toUpperCase()}
Duration: ${scene.duration} | Beats: ${beatsPerScene} | Camera: ${scene.camera}
Prompt: ${scene.content}
${scene.colorGrade ? `Color Grade: ${scene.colorGrade}\n` : ''}${negativePromptLine}${scene.dialogue ? `${scene.dialogue}\n` : ''}`;
  }).join('');

  const customSection = options.customInstructions?.trim()
    ? `
CUSTOM NOTES:
${options.customInstructions.trim()}`
    : '';

  return `TIKTOK REALISTIC VIDEO PROMPT
Subject: Photorealistic human with natural skin texture and realistic motion response.
Preset: ${preset.name} (${preset.vibe})
Date: ${new Date().toLocaleDateString('id-ID')}

SCENE PLAN (${sceneCount} clips x 6s = ${sceneCount * 6}s):
${sceneText}

TECHNICAL SPECIFICATIONS:
- Camera: iPhone 15 Pro Max / Sony A7S III
- Style: raw, unedited, authentic, film grain, 4k 60fps
- Output Language: ${outputLanguage}
- Lighting: ${options.lighting}
- Background: ${backgroundNote}
- Include Negative Prompt: ${options.includeNegativePrompt ? 'Yes' : 'No'}
${customSection}
`;
}

// ==================== API CLIENT ====================

async function callBackendAPI({ imageBase64, imageMimeType, imageReferences, preset, options, signal }) {
  // Support multi-image: imageBase64 can be string or array
  const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];
  const mimeTypes = Array.isArray(imageMimeType) ? imageMimeType : [resolveImageMimeType(imageBase64, imageMimeType)];

  const response = await fetchWithRetry('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preset,
      options,
      imageBase64: images,
      imageMimeType: mimeTypes,
      imageReferences,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || errorData?.error || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data?.text || 'No content generated.',
    quality: data?.quality || null,
  };
}

async function callTitleBackendAPI({ payload, signal }) {
  const response = await fetchWithRetry('/api/generate-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || errorData?.error || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const titles = Array.isArray(data?.titles) ? data.titles : [];

  return {
    titles,
    text: data?.text || titles.join('\n'),
  };
}

async function callProductAnalysisAPI({ payload, signal }) {
  const response = await fetchWithRetry('/api/analyze-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || errorData?.error || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data?.analysis || null;
}

// ==================== RETRY LOGIC ====================
async function fetchWithRetry(url, fetchOptions, { maxRetries = 1, baseDelay = 1000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw new Error('Rate limited (429). Please wait and try again.');
      }

      if (response.status === 503 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') throw err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Generate a detailed TikTok affiliate video prompt.
 *
 * @param {Object} params
 * @param {string|string[]} params.imageBase64 - Base64 encoded image(s)
 * @param {string|string[]} [params.imageMimeType] - Image MIME type(s)
 * @param {Object} params.preset - Selected affiliate preset
 * @param {Object} params.userOptions - Advanced options
 * @param {AbortSignal} [params.signal] - Optional abort signal
 * @returns {Promise<{ text: string, quality: object | null }>} Generated prompt payload
 */
export async function generatePrompt({ imageBase64, imageMimeType, imageReferences, preset, userOptions, signal }) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
    sceneCount: normalizeSceneCount(userOptions?.sceneCount),
  };

  if (USE_MOCK) {
    await delayWithAbort(1500 + Math.random() * 2000, signal);
    return {
      text: generateMockPrompt(preset, options),
      quality: null,
    };
  }

  return callBackendAPI({
    imageBase64,
    imageMimeType,
    imageReferences,
    preset,
    options,
    signal,
  });
}

/**
 * Generate TikTok-ready video titles for affiliate content.
 *
 * @param {Object} params
 * @param {string} params.productName
 * @param {string} [params.productCategory]
 * @param {string} [params.targetAudience]
 * @param {string[]} [params.keyBenefits]
 * @param {string[]} [params.keywords]
 * @param {string} [params.tone]
 * @param {'ID'|'EN'} [params.language]
 * @param {number} [params.titleCount]
 * @param {boolean} [params.includeEmoji]
 * @param {number} [params.maxLength]
 * @param {string} [params.customInstructions]
 * @param {number} [params.creativity]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ titles: string[], text: string }>}
 */
export async function generateTitles({
  productName,
  productCategory = '',
  targetAudience = '',
  keyBenefits = [],
  keywords = [],
  tone = 'viral',
  language = 'ID',
  titleCount = 10,
  includeEmoji = true,
  maxLength = 60,
  customInstructions = '',
  creativity = 85,
  signal,
}) {
  const payload = {
    productName: String(productName || '').trim(),
    productCategory: String(productCategory || '').trim(),
    targetAudience: String(targetAudience || '').trim(),
    keyBenefits: Array.isArray(keyBenefits) ? keyBenefits : [],
    keywords: Array.isArray(keywords) ? keywords : [],
    tone,
    language: language === 'EN' ? 'EN' : 'ID',
    titleCount: Number.parseInt(titleCount, 10) || 10,
    includeEmoji: Boolean(includeEmoji),
    maxLength: Number.parseInt(maxLength, 10) || 60,
    customInstructions: String(customInstructions || '').trim(),
    creativity: Number.isFinite(Number(creativity)) ? Number(creativity) : 85,
  };

  if (!payload.productName) {
    throw new Error('Product name is required.');
  }

  return callTitleBackendAPI({ payload, signal });
}

/**
 * Analyze product metadata from uploaded image.
 *
 * @param {Object} params
 * @param {string} params.imageBase64 - Data URL image
 * @param {string} [params.imageMimeType]
 * @param {'ID'|'EN'} [params.language]
 * @param {string} [params.customContext]
 * @param {number} [params.creativity]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<object|null>}
 */
export async function analyzeProductByImage({
  imageBase64,
  imageMimeType,
  language = 'ID',
  customContext = '',
  creativity = 70,
  signal,
}) {
  if (!imageBase64) {
    throw new Error('Image is required for analysis.');
  }

  const payload = {
    imageBase64,
    imageMimeType: imageMimeType || undefined,
    language: language === 'EN' ? 'EN' : 'ID',
    customContext: String(customContext || '').trim(),
    creativity: Number.isFinite(Number(creativity)) ? Number(creativity) : 70,
  };

  return callProductAnalysisAPI({ payload, signal });
}

export default generatePrompt;
