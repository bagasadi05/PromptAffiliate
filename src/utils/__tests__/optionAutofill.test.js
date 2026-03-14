import { describe, expect, it } from 'vitest';
import { AUTOFILL_MODES, filterAutofillSuggestions, mergeAutofillSuggestions } from '../optionAutofill.js';

describe('mergeAutofillSuggestions', () => {
  it('fills only empty fields and keeps existing user input intact', () => {
    const currentOptions = {
      productName: 'Produk A',
      targetAudience: '',
      keySellingPoints: 'sudah diisi user',
      mustInclude: '',
      hookFormula: null,
      lighting: 'soft daylight',
      conversionGoal: '',
    };

    const suggestions = {
      targetAudience: 'Ibu sibuk yang cari makeup cepat',
      keySellingPoints: 'ringan\ncepat set',
      mustInclude: 'nama produk persis\nclose-up tekstur',
      hookFormula: 'demo-proof',
      lighting: 'golden hour',
      conversionGoal: 'purchase',
    };

    const { nextOptions, appliedKeys } = mergeAutofillSuggestions(currentOptions, suggestions);

    expect(nextOptions.targetAudience).toBe('Ibu sibuk yang cari makeup cepat');
    expect(nextOptions.keySellingPoints).toBe('sudah diisi user');
    expect(nextOptions.mustInclude).toBe('nama produk persis\nclose-up tekstur');
    expect(nextOptions.hookFormula).toBe('demo-proof');
    expect(nextOptions.lighting).toBe('soft daylight');
    expect(nextOptions.conversionGoal).toBe('purchase');
    expect(appliedKeys).toEqual(['targetAudience', 'mustInclude', 'hookFormula', 'conversionGoal']);
  });

  it('limits recommended mode to recommended fields only', () => {
    const suggestions = {
      targetAudience: 'Mahasiswi aktif',
      mustInclude: 'nama produk persis',
      lighting: 'golden hour',
      hookStrength: 'soft',
    };

    expect(filterAutofillSuggestions(suggestions, AUTOFILL_MODES.RECOMMENDED)).toEqual({
      targetAudience: 'Mahasiswi aktif',
      mustInclude: 'nama produk persis',
    });
  });
});
