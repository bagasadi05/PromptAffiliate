import { renderHook, act } from '@testing-library/react';
import useAnalyzePreset from '../useAnalyzePreset';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as toastBus from '../../lib/toastBus';

vi.mock('../../lib/toastBus', () => ({
    showToast: vi.fn(),
}));

// Mock useI18n hook
vi.mock('../useI18n', () => ({
    useI18n: () => ({ t: (key) => key, lang: 'EN' })
}));

describe('useAnalyzePreset', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
    });

    it('should set isAnalyzingPreset to true and call backend', async () => {
        const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                analysis: {
                    presetId: 'cinematic',
                    lighting: 'Dark',
                    cameraDistance: 'Close',
                    subjectDescription: 'A person'
                }
            })
        });

        const setSelectedPreset = vi.fn();
        const setAdvancedOptions = vi.fn();

        const { result } = renderHook(() => useAnalyzePreset({
            allPresets: [{ id: 'cinematic' }],
            capabilities: { geminiEnabled: true },
            setSelectedPreset,
            setAdvancedOptions,
        }));

        expect(result.current.isAnalyzingPreset).toBe(false);

        await act(async () => {
            await result.current.handleAnalyzePreset([mockFile]);
        });

        expect(fetch).toHaveBeenCalledWith('/api/analyze-preset', expect.objectContaining({
            method: 'POST'
        }));

        expect(toastBus.showToast).toHaveBeenCalledWith('analyzePresetSuccess', 'success');
        expect(setAdvancedOptions).toHaveBeenCalled();
        expect(setSelectedPreset).toHaveBeenCalledWith({ id: 'cinematic' });
    });

    it('should show warning if gemini is not enabled', async () => {
        const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });

        const { result } = renderHook(() => useAnalyzePreset({
            allPresets: [],
            capabilities: { geminiEnabled: false },
            setSelectedPreset: vi.fn(),
            setAdvancedOptions: vi.fn(),
        }));

        await act(async () => {
            await result.current.handleAnalyzePreset([mockFile]);
        });

        expect(toastBus.showToast).toHaveBeenCalledWith('analyzePresetGeminiRequired', 'warning');
        expect(fetch).not.toHaveBeenCalled();
    });
});
