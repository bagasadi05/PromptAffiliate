import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/multipart.js', () => ({
    parseMultipartData: vi.fn(),
}));

vi.mock('../services/orchestratorService.js', () => ({
    callPromptModel: vi.fn(),
}));

import { parseMultipartData } from '../lib/multipart.js';
import { callPromptModel } from '../services/orchestratorService.js';
import { handleGenerate } from '../controllers/generateController.js';

function createReplyStub() {
    return {
        statusCode: 200,
        payload: null,
        code(code) {
            this.statusCode = code;
            return this;
        },
        send(payload) {
            this.payload = payload;
            return payload;
        },
    };
}

describe('generateController auto-repair', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the primary result without auto-repair when quality is already strong', async () => {
        parseMultipartData.mockResolvedValue({
            files: [{ base64: 'abc', mimetype: 'image/png' }],
            fields: {
                preset: { name: 'Preset A' },
                options: {
                    productName: 'Cushion Glow Pro',
                    sceneCount: 1,
                    voiceStyle: 'talking',
                    includeNegativePrompt: false,
                },
                imageReferences: [],
            },
        });

        callPromptModel.mockResolvedValue(`
SCENE 1: CTA
Duration: 6s | Beats: 12 | Move: snap reveal | Camera: 50mm handheld
Prompt: Cushion Glow Pro is introduced clearly with strong conversion framing, a complete product demo, and a clean CTA scene structure that stays compliant across the whole paragraph for quality evaluation.
Dialogue: "Cushion Glow Pro bikin hasilnya ringan dan langsung siap checkout."
`);

        const request = { log: { error: vi.fn(), warn: vi.fn() } };
        const reply = createReplyStub();

        const result = await handleGenerate(request, reply);

        expect(callPromptModel).toHaveBeenCalledTimes(1);
        expect(result.text).toContain('Cushion Glow Pro');
        expect(result.quality.autoRepaired).toBeUndefined();
        expect(result.quality.judge.selectedSource).toBe('primary');
    });

    it('runs one repair pass and returns the higher-scoring repaired result', async () => {
        parseMultipartData.mockResolvedValue({
            files: [{ base64: 'abc', mimetype: 'image/png' }],
            fields: {
                preset: { name: 'Preset A' },
                options: {
                    productName: 'Cushion Glow Pro',
                    sceneCount: 2,
                    voiceStyle: 'talking',
                    includeNegativePrompt: false,
                    mustInclude: 'CTA keranjang kuning',
                    sceneMustIncludeMap: '1: Cushion Glow Pro\n2: CTA keranjang kuning',
                },
                imageReferences: [],
            },
        });

        callPromptModel
            .mockResolvedValueOnce(`
SCENE 1: OPENING
Duration: 6s | Beats: 12 | Move: snap reveal | Camera: 50mm handheld
Prompt: The creator opens the routine softly but never says the exact product name and does not anchor the pinned instruction well enough in the first scene.
Dialogue: "Ini base makeup favoritku."

SCENE 2: ENDING
Duration: 6s | Beats: 12 | Move: push-in | Camera: 50mm handheld
Prompt: The ending stays generic and skips the requested CTA keranjang kuning despite the product demo.
Dialogue: "Cobain sekarang ya."
`)
            .mockResolvedValueOnce(JSON.stringify({
                scenes: [
                    {
                        scene: 1,
                        title: 'opening',
                        duration: '6s',
                        beats: 12,
                        move: 'snap reveal',
                        camera: '50mm handheld',
                        prompt: 'Cushion Glow Pro is named explicitly in the opening hook, with the creator demonstrating the benefit clearly and grounding the conversion angle in a natural first-scene setup that satisfies the pinned instruction.',
                        voiceLine: 'Cushion Glow Pro ini langsung keliatan ringan dari scene pertama.',
                    },
                    {
                        scene: 2,
                        title: 'ending',
                        duration: '6s',
                        beats: 12,
                        move: 'push-in',
                        camera: '50mm handheld',
                        prompt: 'The creator closes with a clear CTA keranjang kuning, keeps the product front and center, and ties the result back to the user intent in a stronger buying cue.',
                        voiceLine: 'Kalau mau checkout Cushion Glow Pro, langsung klik CTA keranjang kuning sekarang.',
                    },
                ],
            }));

        const request = { log: { error: vi.fn(), warn: vi.fn() } };
        const reply = createReplyStub();

        const result = await handleGenerate(request, reply);

        expect(callPromptModel).toHaveBeenCalledTimes(2);
        expect(callPromptModel.mock.calls[1][1]).toContain('REPAIR OUTPUT MODE (STRICT JSON)');
        expect(result.text).toContain('CTA keranjang kuning');
        expect(result.quality.autoRepaired).toBe(true);
        expect(result.quality.score).toBeGreaterThan(0);
        expect(result.quality.judge.selectedSource).toBe('repair');
        expect(result.quality.judge.comparedCandidates).toHaveLength(2);
    });
});
