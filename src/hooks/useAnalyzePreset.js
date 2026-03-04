import { useState, useCallback } from 'react';
import { showToast } from '../lib/toastBus';
import { useI18n } from './useI18n';

export default function useAnalyzePreset(options) {
    const { allPresets, capabilities, setSelectedPreset, setAdvancedOptions } = options;
    const [isAnalyzingPreset, setIsAnalyzingPreset] = useState(false);
    const { t, lang } = useI18n();

    const handleAnalyzePreset = useCallback(async (files) => {
        if (!files || files.length === 0) return;
        if (!capabilities.geminiEnabled) {
            showToast(t('analyzePresetGeminiRequired'), 'warning');
            return;
        }
        setIsAnalyzingPreset(true);
        showToast(t('analyzePresetLoading'), 'info');

        try {
            const file = files[0];

            const formData = new FormData();
            formData.append('files', file);
            formData.append('language', lang);

            const response = await fetch('/api/analyze-preset', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData?.error || errorData?.message || t('analyzePresetError');
                throw new Error(message);
            }

            const { analysis } = await response.json();

            if (analysis) {
                const matchedPreset = allPresets.find(p => p.id === analysis.presetId) || allPresets[0];
                if (matchedPreset) setSelectedPreset(matchedPreset);

                setAdvancedOptions(prev => ({
                    ...prev,
                    lighting: analysis.lighting || prev.lighting,
                    cameraDistance: analysis.cameraDistance || prev.cameraDistance,
                    subjectDescription: analysis.subjectDescription || prev.subjectDescription,
                    ...(analysis.wardrobe ? { presetPromptOverrides: { wardrobe: analysis.wardrobe } } : {})
                }));

                if (analysis.wardrobe) {
                    setAdvancedOptions(prev => ({
                        ...prev,
                        subjectDescription: `Outfit: ${analysis.wardrobe}\nAction: ${analysis.subjectDescription || ''}`.trim()
                    }));
                }

                showToast(t('analyzePresetSuccess'), 'success');
            }
        } catch (error) {
            console.error(error);
            showToast(error.message || t('analyzePresetErrorGeneric'), 'error');
        } finally {
            setIsAnalyzingPreset(false);
        }
    }, [allPresets, capabilities.geminiEnabled, lang, setAdvancedOptions, setSelectedPreset, t]);

    return { isAnalyzingPreset, handleAnalyzePreset };
}
