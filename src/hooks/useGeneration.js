import { useState, useCallback, useRef, useEffect } from 'react';
import { generatePrompt } from '../services/gemini';
import { fileToBase64 } from '../utils/fileToBase64';
import { normalizeImageReferences } from '../utils/imageReferences';
import { showToast } from '../lib/toastBus';

/**
 * Custom hook encapsulating the entire prompt generation lifecycle:
 * - progress simulation
 * - file-to-base64 conversion
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
}) {
    const [prompt, setPrompt] = useState('');
    const [quality, setQuality] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [history, setHistory] = useState(() => (
        Array.isArray(initialHistory) ? initialHistory : []
    ));

    // Refs for timers & abort controller
    const progressInterval = useRef(null);
    const completeTimeoutRef = useRef(null);
    const requestAbortRef = useRef(null);

    const clearProgressInterval = useCallback(() => {
        if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
        }
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
            clearProgressInterval();
            clearCompleteTimeout();
            abortActiveRequest();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const simulateProgress = useCallback(() => {
        clearProgressInterval();
        setProgress(0);
        let current = 0;
        progressInterval.current = setInterval(() => {
            current += Math.random() * 15 + 3;
            if (current >= 95) {
                current = 95;
                clearProgressInterval();
            }
            setProgress(Math.min(current, 95));
        }, 300);
    }, [clearProgressInterval]);

    const handleCancelGenerate = useCallback((withToast = true) => {
        const hasActiveTask = Boolean(requestAbortRef.current || completeTimeoutRef.current || progressInterval.current);
        clearCompleteTimeout();
        clearProgressInterval();
        abortActiveRequest();
        setIsLoading(false);
        setProgress(0);
        setQuality(null);
        if (withToast && hasActiveTask) {
            showToast(messages.generateCanceled || 'Generate dibatalkan', 'info');
        }
    }, [abortActiveRequest, clearCompleteTimeout, clearProgressInterval, messages.generateCanceled]);

    const handleGenerate = useCallback(async () => {
        if (files.length === 0 || !selectedPreset) return;

        clearCompleteTimeout();
        clearProgressInterval();
        abortActiveRequest();

        const controller = new AbortController();
        requestAbortRef.current = controller;

        setIsLoading(true);
        setQuality(null);
        simulateProgress();

        try {
            // Convert all files to base64
            const imageBase64Array = await Promise.all(files.map(f => fileToBase64(f)));
            const imageMimeTypes = files.map(f => f.type);
            const normalizedImageReferences = normalizeImageReferences(files, imageReferences);

            // Use single value if only one image (backward compat)
            const imageBase64 = imageBase64Array.length === 1 ? imageBase64Array[0] : imageBase64Array;
            const imageMimeType = imageMimeTypes.length === 1 ? imageMimeTypes[0] : imageMimeTypes;

            const result = await generatePrompt({
                imageBase64,
                imageMimeType,
                preset: selectedPreset,
                userOptions: advancedOptions,
                imageReferences: normalizedImageReferences,
                signal: controller.signal,
            });

            const resultText = typeof result === 'string' ? result : (result?.text || '');
            const resultQuality = typeof result === 'string' ? null : (result?.quality || null);

            if (controller.signal.aborted) return;
            clearProgressInterval();
            setProgress(100);

            completeTimeoutRef.current = setTimeout(() => {
                if (controller.signal.aborted) return;
                setPrompt(resultText);
                setQuality(resultQuality);
                setIsLoading(false);
                setProgress(0);
                requestAbortRef.current = null;

                // Add to history (max 20)
                const historyItem = {
                    id: Date.now(),
                    preset: selectedPreset,
                    prompt: resultText,
                    quality: resultQuality,
                    timestamp: new Date().toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    options: { ...advancedOptions }
                };

                setHistory(prev => [historyItem, ...prev].slice(0, 20));
                showToast(messages.generateSuccess || 'Prompt berhasil di-generate! 🎉', 'success');
            }, 500);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Generation error:', error);
            clearCompleteTimeout();
            clearProgressInterval();
            setIsLoading(false);
            setProgress(0);
            setQuality(null);
            requestAbortRef.current = null;
            showToast(`${messages.generateErrorPrefix || 'Error'}: ${error.message}`, 'error', 5000);
        }
    }, [
        files,
        selectedPreset,
        advancedOptions,
        imageReferences,
        simulateProgress,
        clearCompleteTimeout,
        clearProgressInterval,
        abortActiveRequest,
        messages.generateSuccess,
        messages.generateErrorPrefix,
    ]);

    return {
        prompt,
        setPrompt,
        quality,
        setQuality,
        isLoading,
        progress,
        history,
        setHistory,
        handleGenerate,
        handleCancelGenerate,
    };
}
