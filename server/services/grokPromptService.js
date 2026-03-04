import { DEFAULT_OPTIONS } from '../../src/constants/defaultOptions.js';

// ── Grok Camera Movement Vocabulary ──
const GROK_CAMERA_VOCAB = {
    'extreme close': 'extreme close-up 85mm macro at f/1.4, static tripod, micro rack-focus pull revealing fine detail',
    close: 'close-up 85mm at f/1.8, gentle handheld with stabilization, 3-axis micro-shake',
    medium: 'medium shot 50mm at f/2.8, Ronin-stabilized handheld, smooth floating motion',
    wide: 'wide shot 35mm at f/4, slow tracking dolly forward, environment integration',
    'full-body': 'full-body 24mm at f/5.6, wide steadicam orbit or static locked-off tripod',
    overhead: 'overhead 35mm top-down at f/4, static overhead or slow jib descend',
    macro: '100mm macro at f/2.8, ultra-slow push-in 0.5cm/sec on macro rail',
};

// ── Grok Lighting Templates ──
const GROK_LIGHTING_VOCAB = {
    'soft daylight': '5600K overhead diffused daylight, soft 2:1 ratio, fill from reflector, product colors accurate',
    'warm indoor': '2700K-3200K tungsten pendant with 3:1 shadow ratio, warm amber fill, cozy atmosphere',
    'neon night': 'mixed 2700K-8000K RGB neon gels from multiple angles, 6:1 contrast, colored shadow spill',
    'golden hour': '2700K-3200K warm amber from 15° above horizon, 4:1 ratio, strong rim light on surface edges',
    'studio ring light': '5000K-5500K frontal ring at camera axis, near-zero shadow, perfect catch-light visible',
    'dramatic shadow': '4000K single hard key from 45°, no fill, 8:1 chiaroscuro contrast, deep premium shadows',
    'cinematic rim': '4500K-5600K backlight rimming subject + 10% front fill, edge-lit separation, 6:1 ratio',
    'rembrandt': '3800K-4200K key from 45° camera-left, Rembrandt triangle on cheek, 4:1 ratio',
    'volumetric': '5000K side-angled with volumetric god-ray shafts through haze, atmospheric depth',
    'product spotlight': '5200K overhead spot tight 20° beam on product, dark surrounding negative space',
};

export const GROK_SYSTEM_PROMPT_TEMPLATE = `You are an elite AI video prompt engineer specializing in IMAGE-TO-VIDEO generation for Grok Aurora/Imagine. Your goal is to craft a single, highly detailed, physically grounded cinematic paragraph that produces 100% PHOTOREALISTIC video from the reference image.

⚠️ IMAGE-TO-VIDEO MODE:
The subject's face, skin tone, hair, and physical appearance are defined by the reference image — DO NOT describe or invent any facial features.
Never invent visual regions that are not visible in the reference. If the head/face is not visible in the source image, keep head/face out of frame in the generated video.
Keep framing locked to the visible reference crop by default; do not expand to full body unless explicitly visible in the reference image.

YOUR FOCUS IS EXCLUSIVELY:
1. MOVEMENT & ACTION: Describe exact physical movements with biomechanical precision — weight transfer, joint angles, muscle engagement, momentum. Preparation → execution → recovery phases. Every action must feel physically grounded.
2. OUTFIT CONSISTENCY: Always describe the EXACT outfit seen in the reference image with full technical detail: garment type, exact color, fabric texture (cotton/silk/denim/ribbed knit), fit, hem length, sleeve type, every accessory. Outfit is FROZEN and unchanged in the generated video.
3. CAMERA MOVEMENT: Specify exact camera actions with lens focal length (24mm/35mm/50mm/85mm), aperture (f/1.4-f/8), and movement type (slow dolly push-in, steadicam orbit, handheld tracking, static with rack focus, jib descend).
4. LIGHTING PHYSICS: Describe the lighting environment with color temperature (Kelvin), direction (clock position angle), shadow quality (ratio), and how light interacts with fabric, product, and environment surfaces.
5. FABRIC PHYSICS: How clothing, accessories, and materials respond to movement — inertia delay, drape, swing, wrinkle, stretch, momentum lag.
6. TEMPORAL CONSISTENCY: The video must feel like a single continuous take — no teleportation of subject, lighting, or environment between moments.
7. ANTI-ARTIFACTS: Explicitly prevent morphing, extra limbs, floating objects, temporal flicker, background warping, outfit teleportation, or unnatural joint angles.
8. AFFILIATE CONVERSION: The prompt must serve conversion — product must be clearly visible or referenced, subject body language must communicate recommendation, scene must feel compelling and trustworthy.

OUTPUT RULES (STRICT):
- Return a SINGLE continuous paragraph (minimum 80 words).
- No bullet points, no markdown code blocks, no intro/outro text, no self-explanation.
- Focus heavily on movement mechanics, fabric physics, camera craft, lighting physics, and conversion intent.
- Describe the temporal arc: beginning → climax → natural end state of the motion.`;

export function buildGrokSystemPrompt(options = {}) {
    const customTemplate = options.systemPromptTemplate || '';
    return customTemplate || GROK_SYSTEM_PROMPT_TEMPLATE;
}

function sanitizeInlineText(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function buildImageReferenceInstruction(imageReferences = []) {
    if (!Array.isArray(imageReferences) || imageReferences.length === 0) return '';

    const rows = imageReferences
        .map((ref, index) => {
            const role = sanitizeInlineText(ref?.role) || `reference-${index + 1}`;
            const influenceRaw = Number(ref?.influence);
            const influence = Number.isFinite(influenceRaw) ? Math.max(1, Math.min(100, Math.round(influenceRaw))) : null;
            const label = sanitizeInlineText(ref?.label);
            const meta = [label ? `label=${label}` : '', influence !== null ? `influence=${influence}%` : ''].filter(Boolean).join(', ');
            return `- REF ${index + 1}: role=${role}${meta ? ` (${meta})` : ''}`;
        })
        .join('\n');

    return `\nIMAGE REFERENCES (IMPORTANT):\n${rows}\nApply each reference by its role and preserve identity continuity from the highest-influence identity reference.`;
}

export function buildGrokUserPrompt(preset, options, imageReferences = []) {
    const language = options.outputLanguage === 'EN' ? 'English' : 'Indonesian (Bahasa Indonesia)';
    const targetDuration = Number.parseInt(options.targetDuration, 10) || 6;
    const productName = options.productName ? String(options.productName).trim() : '';

    const background = options.background === 'keep from reference'
        ? 'Preserve the original background from the reference image with realistic perspective continuity and natural environmental depth.'
        : `Set the environment to "${options.background}" and maintain full coherence with lighting, shadow direction, depth, and motion across the video.`;

    const cameraSpec = GROK_CAMERA_VOCAB[options.cameraDistance] || GROK_CAMERA_VOCAB.medium;
    const lightSpec = GROK_LIGHTING_VOCAB[options.lighting] || GROK_LIGHTING_VOCAB['soft daylight'];
    const realismSpec = options.realismLevel === 'High'
        ? '4K RAW photorealistic footage, visible skin pores, hyper-realistic fabric physics, physically-based material rendering'
        : options.realismLevel === 'Low'
            ? 'cinematic stylized look with artistic color grading'
            : 'cinematic realism, high detail, natural human movement';

    const motionInstruction = preset?.grokPromptIdea
        ? preset.grokPromptIdea
        : preset?.movementPrompts?.[0]
            ? preset.movementPrompts[0]
            : 'fluid, natural, cinematically grounded motion with precise physics and natural weight distribution';

    const presetHookFormula = preset?.hookFormula
        ? `Affiliate Hook: ${preset.hookFormula}`
        : '';

    const subjectNotes = options.subjectDescription
        ? `SUBJECT NOTES (non-facial): ${options.subjectDescription}`
        : 'SUBJECT NOTES: Observe the reference image carefully. Maintain identity continuity throughout.';

    const customInstructions = options.customInstructions?.trim()
        ? `CUSTOM INSTRUCTIONS: ${options.customInstructions}`
        : '';

    // Psychology trigger instruction
    const psychologyTrigger = options.psychologyTrigger;
    const psychMap = {
        fomo: 'AFFILIATE PSYCHOLOGY (FOMO): The scene must convey urgency and scarcity through body language — subject holds product possessively, movement is decisive, energy suggests limited opportunity.',
        'social-proof': 'AFFILIATE PSYCHOLOGY (SOCIAL PROOF): Subject body language conveys satisfied authority — confident hold of product, gestures of endorsement, nodding micro-expression suggesting validation.',
        curiosity: 'AFFILIATE PSYCHOLOGY (CURIOSITY GAP): Scene withholds full product reveal — camera movement or body position partially obscures the product, building visible tension.',
        authority: 'AFFILIATE PSYCHOLOGY (AUTHORITY): Subject interacts with product with deliberate, expert familiarity — confident precise movements that signal deep knowledge.',
        reciprocity: 'AFFILIATE PSYCHOLOGY (RECIPROCITY): Scene opens with subject offering/demonstrating a helpful insight or tip before the product appears as the upgrade.',
        pain: 'AFFILIATE PSYCHOLOGY (PAIN AMPLIFIER): Scene portrays the problem or frustration clearly through body language before product appears as relief.',
    };
    const psychInstruction = psychMap[psychologyTrigger] || '';

    const productInstruction = productName
        ? `🛒 PRODUCT BEING SOLD: "${productName}"
→ The product "${productName}" must be clearly held or interacted with in the generated video.
→ If there is an opportunity for text overlay or CTA gesture, it must relate to this product.`
        : '';

    const imageReferenceInstruction = buildImageReferenceInstruction(imageReferences);

    return `═══════════════════════════════════════
GROK IMAGINE VIDEO PROMPT GENERATOR
Preset: ${preset?.name || 'Cinematic Affiliate'} | Vibe: ${preset?.vibe || 'Cinematic photorealistic'}
Target Duration: ${targetDuration}s | Output Language: ${language}${productName ? ` | Product: "${productName}"` : ''}
═══════════════════════════════════════
${productInstruction ? `\n${productInstruction}\n` : ''}
${subjectNotes}
${imageReferenceInstruction}

CAMERA & LENS SPECIFICATION:
${cameraSpec}

LIGHTING SPECIFICATION:
${lightSpec}

BACKGROUND:
${background}

RENDER QUALITY:
${realismSpec}

MOTION INSTRUCTION:
${motionInstruction}

${presetHookFormula}
${psychInstruction}
${customInstructions}

TASK:
Generate a single, highly detailed, physically grounded scene prompt (1 continuous paragraph, minimum 80 words) that describes:
1. The precise camera movement, lens, and framing
2. The subject's exact body mechanics (joint angles, weight transfer, momentum, recovery)
3. How the outfit responds to the motion (fabric physics, accessory inertia)
4. The lighting environment and how it interacts with surfaces
5. The affiliate conversion intent (product visibility, body language, recommendation energy)${productName ? `\n6. The product "${productName}" must be clearly visible and interacted with in the scene` : ''}
${productName ? '7.' : '6.'} Temporal arc from start to end of the ${targetDuration}s clip
${productName ? '8.' : '7.'} Visibility lock: do not invent unseen body parts; if face/head is not visible in the source image, keep face/head out of frame.

Do NOT include any text, intro, or explanation outside the generated prompt paragraph itself. Output Language: ${language}.`;
}

export function postProcessGrokOutput(rawText) {
    return String(rawText || '')
        .replace(/^\s*```[a-zA-Z]*\s*$/gm, '')
        .replace(/^\s*```\s*$/gm, '')
        .trim();
}
