import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/multipart.js', () => ({
  parseMultipartData: vi.fn(),
}));

vi.mock('../services/geminiService.js', () => ({
  callGemini: vi.fn(),
}));

import { parseMultipartData } from '../lib/multipart.js';
import { callGemini } from '../services/geminiService.js';
import { handleAutofillOptions } from '../controllers/analyzeController.js';

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

describe('handleAutofillOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns normalized suggestions from Gemini output', async () => {
    parseMultipartData.mockResolvedValue({
      files: [
        { base64: 'abc', mimetype: 'image/png' },
        { base64: 'def', mimetype: 'image/png' },
      ],
      fields: {
        language: 'ID',
        preset: { name: 'Soft Sell', vibe: 'clean demo' },
        options: {
          productName: 'Produk A',
          targetAudience: '',
          hookStrength: '',
        },
        preferenceMemory: {
          avoidTerms: ['background gelap'],
          steeringNotes: ['sebut nama produk lebih awal'],
        },
      },
    });

    callGemini.mockResolvedValue(JSON.stringify({
      targetAudience: 'Ibu sibuk yang mau hasil rapi cepat',
      keySellingPoints: 'tekstur ringan\ncepat set',
      mustInclude: '',
      avoidElements: 'tone hard sell',
      sceneMustIncludeMap: '1: nama produk persis',
      subjectDescription: 'Creator perempuan yang sama, makeup natural, gerak santai.',
      lighting: 'golden hour',
      cameraDistance: 'close',
      background: 'soft retail display',
      productInteraction: 'Buka compact perlahan lalu tunjukkan tekstur di tangan.',
      platformTarget: 'tiktok',
      conversionGoal: 'purchase',
      psychologyTrigger: 'social-proof',
      hookStrength: 'hard',
      hookFormula: 'demo-proof',
    }));

    const request = { log: { error: vi.fn() } };
    const reply = createReplyStub();

    const result = await handleAutofillOptions(request, reply);

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(result.suggestions.targetAudience).toContain('Ibu sibuk');
    expect(result.suggestions.hookStrength).toBe('hard');
    expect(result.suggestions.sceneMustIncludeMap).toBe('1: nama produk persis');
    expect(result.suggestions.background).toBe('soft retail display');
  });

  it('accepts preferenceMemory when multipart parser leaves it as a JSON string', async () => {
    parseMultipartData.mockResolvedValue({
      files: [
        { base64: 'abc', mimetype: 'image/png' },
      ],
      fields: {
        language: 'ID',
        mode: 'recommended',
        preset: { name: 'Soft Sell' },
        options: {
          productName: 'Produk A',
        },
        preferenceMemory: JSON.stringify({
          avoidTerms: ['background gelap'],
          steeringNotes: ['sebut nama produk lebih awal'],
        }),
      },
    });

    callGemini.mockResolvedValue(JSON.stringify({
      targetAudience: 'Ibu sibuk',
      keySellingPoints: 'tekstur ringan',
      mustInclude: 'nama produk persis',
      avoidElements: 'tone hard sell',
    }));

    const request = { log: { error: vi.fn() } };
    const reply = createReplyStub();

    const result = await handleAutofillOptions(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(result.suggestions.targetAudience).toBe('Ibu sibuk');
  });
});
