import { useState, useCallback, useRef, useEffect } from 'react';
import { generatePrompt } from '../services/gemini';
import { normalizeImageReferences } from '../utils/imageReferences';
import { showToast } from '../lib/toastBus';
import { buildPromptInputMeta } from '../utils/promptSession';

const STAGE_PROGRESS = {
    idle: 0,
    uploading: 20,
    generating: 68,
    postProcessing: 92,
    done: 100,
};

/**
 * Custom hook encapsulating the entire prompt generation lifecycle:
 * - honest generation lifecycle states
 * - streaming API call with abort support
 * - history management
 * - cleanup on unmount
 */
export default function useGeneration({
    files,
    selectedPreset,
    advancedOptions,
    imageReferences,
    initialHistory = [],
    messages = {},
    locale = 'id-ID',
    onGenerationComplete = null,
}) {
    const [prompt, setPrompt] = useState('');
    const [quality, setQuality] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [generationStage, setGenerationStage] = useState('idle');
    const [history, setHistory] = useState(() => (
        Array.isArray(initialHistory) ? initialHistory : []
    ));

    // Refs for async completion & abort controller
    const completeTimeoutRef = useRef(null);
    const requestAbortRef = useRef(null);

    const setStage = useCallback((nextStage) => {
        setGenerationStage(nextStage);
        setProgress(STAGE_PROGRESS[nextStage] ?? 0);
    }, []);

    const clearCompleteTimeout = useCallback(() => {
        if (completeTimeoutRef.current) {
            clearTimeout(completeTimeoutRef.current);
            completeTimeoutRef.current = null;
        }
    }, []);

    const abortActiveRequest = useCallback(() => {
        if (requestAbortRef.current) {
            requestAbortRef.current.abort();
            requestAbortRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearCompleteTimeout();
            abortActiveRequest();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCancelGenerate = useCallback((withToast = true) => {
        const hasActiveTask = Boolean(requestAbortRef.current || completeTimeoutRef.current || isLoading);
        clearCompleteTimeout();
        abortActiveRequest();
        setIsLoading(false);
        setStage('idle');
        setQuality(null);
        if (withToast && hasActiveTask) {
            showToast(messages.generateCanceled || 'Generate dibatalkan', 'info');
        }
    }, [abortActiveRequest, clearCompleteTimeout, isLoading, messages.generateCanceled, setStage]);

    const handleGenerate = useCallback(async (generationOverrides = {}) => {
        if (files.length === 0 || !selectedPreset || !String(advancedOptions?.productName || '').trim()) return;

        clearCompleteTimeout();
        abortActiveRequest();

        const controller = new AbortController();
        requestAbortRef.current = controller;

        setIsLoading(true);
        setQuality(null);
        setStage('uploading');

        try {
            const requestOptions = {
                ...advancedOptions,
                ...generationOverrides,
            };
            const normalizedImageReferences = normalizeImageReferences(files, imageReferences);
            setStage('generating');

            const result = await generatePrompt({
                files,
                preset: selectedPreset,
                userOptions: requestOptions,
                imageReferences: normalizedImageReferences,
                signal: controller.signal,
            });

            const resultText = typeof result === 'string' ? result : (result?.text || '');
            const resultQuality = typeof result === 'string' ? null : (result?.quality || null);

            if (controller.signal.aborted) return;
            setStage('postProcessing');

            completeTimeoutRef.current = setTimeout(() => {
                if (controller.signal.aborted) return;
                setPrompt(resultText);
                setQuality(resultQuality);
                setStage('done');
                setIsLoading(false);
                requestAbortRef.current = null;

                // Add to history (max 20)
                const historyId = Date.now();
                const historyItem = {
                    id: historyId,
                    preset: selectedPreset,
                    prompt: resultText,
                    quality: resultQuality,
                    timestamp: new Date().toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    options: { ...requestOptions },
                    meta: {
                        ...buildPromptInputMeta(files, imageReferences),
                        historyId,
                        productName: String(requestOptions?.productName || '').trim(),
                        outputLanguage: requestOptions?.outputLanguage || 'EN',
                        sceneCount: Number(requestOptions?.sceneCount || 0),
                        revisionFeedback: String(requestOptions?.revisionFeedback || '').trim(),
                        previousPromptSnapshot: String(requestOptions?.previousPromptSnapshot || '').trim(),
                        revisionBaseHistoryId: requestOptions?.revisionBaseHistoryId || null,
                        edited: false,
                    }
                };

                setHistory(prev => [historyItem, ...prev].slice(0, 20));
                if (typeof onGenerationComplete === 'function') {
                    onGenerationComplete(historyItem.meta);
                }
                showToast(messages.generateSuccess || 'Prompt berhasil di-generate! 🎉', 'success');
            }, 500);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Generation error:', error);
            clearCompleteTimeout();
            setIsLoading(false);
            setStage('idle');
            setQuality(null);
            requestAbortRef.current = null;
            showToast(`${messages.generateErrorPrefix || 'Error'}: ${error.message}`, 'error', 5000);
        }
    }, [
        files,
        selectedPreset,
        advancedOptions,
        imageReferences,
        clearCompleteTimeout,
        abortActiveRequest,
        messages.generateSuccess,
        messages.generateErrorPrefix,
        locale,
        onGenerationComplete,
        setStage,
    ]);

    return {
        prompt,
        setPrompt,
        quality,
        setQuality,
        isLoading,
        progress,
        generationStage,
        history,
        setHistory,
        handleGenerate,
        handleCancelGenerate,
    };
}
