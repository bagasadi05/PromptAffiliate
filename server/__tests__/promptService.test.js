import { describe, expect, it } from 'vitest';
import {
  buildStructuredRepairPrompt,
  buildUserPrompt,
  evaluatePromptQuality,
  normalizeStructuredRepairOutput,
} from '../services/promptService.js';

const preset = {
  name: 'Conversion Hook',
  vibe: 'Sharp and persuasive',
  energyLevel: 'High',
  bpmRange: '120-140',
  cameraStyle: 'Dynamic handheld',
  signatureMoves: ['snap reveal', 'product close-up'],
  notes: 'Keep it conversion-led',
};

describe('promptService user intent alignment', () => {
  it('injects explicit user success criteria into generated user prompt', () => {
    const prompt = buildUserPrompt(preset, {
      productName: 'Cushion Glow Pro',
      targetAudience: 'cewek kantor yang butuh makeup cepat',
      keySellingPoints: 'coverage ringan, tahan transfer, gampang touch-up',
      mustInclude: 'close-up tekstur cushion, CTA keranjang kuning',
      avoidElements: 'tone hard-selling, background gelap',
      sceneMustIncludeMap: '1: soft hook + Cushion Glow Pro\n4: CTA keranjang kuning',
      learnedAvoidElements: ['background gelap'],
      learnedSteeringNotes: ['sebut nama produk lebih awal'],
      hookStrength: 'hard',
      platformTarget: 'tiktok',
      conversionGoal: 'purchase',
      sceneCount: 4,
    });

    expect(prompt).toContain('USER SUCCESS CRITERIA');
    expect(prompt).toContain('TARGET AUDIENCE: cewek kantor yang butuh makeup cepat');
    expect(prompt).toContain('PRIORITIZE THESE SELLING POINTS: coverage ringan | tahan transfer | gampang touch-up');
    expect(prompt).toContain('NON-NEGOTIABLE MUST INCLUDE: close-up tekstur cushion | CTA keranjang kuning');
    expect(prompt).toContain('STRICTLY AVOID: tone hard-selling | background gelap');
    expect(prompt).toContain('LEARNED USER PREFERENCES');
    expect(prompt).toContain('SCENE-SPECIFIC HARD CONSTRAINTS');
    expect(prompt).toContain('Scene 1: soft hook + Cushion Glow Pro');
    expect(prompt).toContain('viewer must act NOW');
  });

  it('flags missing user intent and product name in quality evaluation', () => {
    const quality = evaluatePromptQuality(`
SCENE 1: OPENING HOOK
Duration: 6s | Beats: 12 | Move: snap reveal | Camera: 50mm handheld
Prompt: A creator opens with a broad beauty claim, gestures energetically, and talks about a generic product without naming it while standing in a background gelap setup with a tone hard-selling approach.
Dialogue: "Ini produk yang lagi viral banget."

SCENE 2: DEMO
Duration: 6s | Beats: 12 | Move: product close-up | Camera: 50mm handheld
Prompt: The creator keeps demonstrating the product in a background gelap frame and leans into a tone hard-selling delivery without highlighting the requested texture close-up or yellow cart CTA.
Dialogue: "Pokoknya kalian harus beli sekarang."
`, {
      productName: 'Cushion Glow Pro',
      sceneCount: 2,
      includeNegativePrompt: false,
      voiceStyle: 'talking',
      mustInclude: 'close-up tekstur cushion, CTA keranjang kuning',
      avoidElements: 'tone hard-selling, background gelap',
      keySellingPoints: 'coverage ringan',
    });

    expect(quality.checks.find((check) => check.id === 'product_name_presence')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.id === 'user_intent_alignment')?.passed).toBe(false);
    expect(quality.warnings.some((warning) => warning.code === 'product_name_missing')).toBe(true);
    expect(quality.warnings.some((warning) => warning.code === 'avoid_terms_detected')).toBe(true);
    expect(quality.tips.some((tip) => tip.includes('Cushion Glow Pro'))).toBe(true);
  });

  it('adds revision feedback block when user is refining an earlier prompt', () => {
    const prompt = buildUserPrompt(preset, {
      productName: 'Cushion Glow Pro',
      revisionFeedback: 'Hook harus lebih soft dan nama produk wajib muncul di scene pertama.',
      previousPromptSnapshot: 'SCENE 1: HARD SELL OPENING\nPrompt: Loud CTA and dramatic pitch.',
      sceneCount: 4,
    });

    expect(prompt).toContain('REVISION MODE');
    expect(prompt).toContain('USER FEEDBACK: Hook harus lebih soft dan nama produk wajib muncul di scene pertama.');
    expect(prompt).toContain('PREVIOUS PROMPT SNAPSHOT');
    expect(prompt).toContain('HARD SELL OPENING');
  });

  it('returns per-scene alignment diagnostics for requested terms and avoid-list violations', () => {
    const quality = evaluatePromptQuality(`
SCENE 1: OPENING
Duration: 6s | Beats: 12 | Move: snap reveal | Camera: 50mm handheld
Prompt: Cushion Glow Pro appears with a close-up tekstur cushion, but the frame still uses background gelap and feels too moody.
Dialogue: "Ini hasil teksturnya."

SCENE 2: CTA
Duration: 6s | Beats: 12 | Move: push-in | Camera: 50mm handheld
Prompt: The creator wraps up generically without highlighting transfer proof or the requested yellow cart CTA.
Dialogue: "Cobain sekarang."
`, {
      productName: 'Cushion Glow Pro',
      sceneCount: 2,
      includeNegativePrompt: false,
      voiceStyle: 'talking',
      mustInclude: 'close-up tekstur cushion, CTA keranjang kuning',
      avoidElements: 'background gelap',
      keySellingPoints: 'tahan transfer',
    });

    expect(quality.sceneAlignment).toHaveLength(2);
    expect(quality.sceneAlignment[0].matchedTerms).toContain('close-up tekstur cushion');
    expect(quality.sceneAlignment[0].violatedAvoidTerms).toContain('background gelap');
    expect(quality.sceneAlignment[1].status).toBe('missing');
    expect(quality.warnings.some((warning) => warning.code === 'scene_avoid_terms_detected')).toBe(true);
    expect(quality.warnings.some((warning) => warning.code === 'scene_requested_terms_missing')).toBe(true);
    expect(quality.tips.some((tip) => tip.includes('Distribute the requested selling points'))).toBe(true);
  });

  it('flags missing scene pin constraints in quality evaluation', () => {
    const quality = evaluatePromptQuality(`
SCENE 1: OPENING
Duration: 6s | Beats: 12 | Move: snap reveal | Camera: 50mm handheld
Prompt: The creator opens softly and introduces the routine without naming the product.
Dialogue: "Mulai dari base makeup yang ringan."

SCENE 2: DEMO
Duration: 6s | Beats: 12 | Move: push-in | Camera: 50mm handheld
Prompt: A texture close-up happens on hand with believable demo movement.
Dialogue: "Teksturnya tipis banget."
`, {
      productName: 'Cushion Glow Pro',
      sceneCount: 2,
      includeNegativePrompt: false,
      voiceStyle: 'talking',
      sceneMustIncludeMap: '1: Cushion Glow Pro\n2: texture close-up',
    });

    expect(quality.checks.find((check) => check.id === 'scene_pin_constraints')?.passed).toBe(false);
    expect(quality.warnings.some((warning) => warning.code === 'scene_pin_missing')).toBe(true);
    expect(quality.sceneAlignment[0].missingPinnedTerms).toContain('Cushion Glow Pro');
    expect(quality.sceneAlignment[1].pinnedInstruction).toBe('texture close-up');
  });

  it('builds and normalizes structured repair output for deterministic second-pass repair', () => {
    const repairPrompt = buildStructuredRepairPrompt(preset, {
      productName: 'Cushion Glow Pro',
      sceneCount: 2,
      voiceStyle: 'talking',
      includeNegativePrompt: false,
      sceneMustIncludeMap: '1: Cushion Glow Pro\n2: CTA keranjang kuning',
    });

    const normalized = normalizeStructuredRepairOutput(JSON.stringify({
      scenes: [
        {
          scene: 1,
          title: 'opening hook',
          duration: '6s',
          beats: 12,
          move: 'snap reveal',
          camera: '50mm handheld',
          prompt: 'Cushion Glow Pro appears langsung di opening scene dengan hook yang lebih jelas.',
          voiceLine: 'Cushion Glow Pro langsung keliatan dari scene pertama.',
        },
        {
          scene: 2,
          title: 'cta close',
          duration: '6s',
          beats: 12,
          move: 'push-in',
          camera: '50mm handheld',
          prompt: 'Scene penutup mengarah ke CTA keranjang kuning dengan close yang lebih tegas.',
          voiceLine: 'Klik CTA keranjang kuning untuk checkout Cushion Glow Pro sekarang.',
        },
      ],
    }), {
      sceneCount: 2,
      voiceStyle: 'talking',
      includeNegativePrompt: false,
    });

    expect(repairPrompt).toContain('REPAIR OUTPUT MODE (STRICT JSON)');
    expect(normalized).toContain('SCENE 1: OPENING HOOK');
    expect(normalized).toContain('Dialogue: Cushion Glow Pro langsung keliatan dari scene pertama.');
    expect(normalized).toContain('SCENE 2: CTA CLOSE');
  });
});
