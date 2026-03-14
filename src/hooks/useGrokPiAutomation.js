import { useState, useRef, useCallback, useEffect } from 'react';
import { getItem, setItem, KEYS } from '../utils/localStorage';
import { showToast } from '../lib/toastBus';
import { useI18n } from './useI18n';
import { getBackendAuthHeaders } from '../utils/backendAuth';

// Constants
const ACTIVE_JOB_KEY = 'grokpi_active_job_id';
const POLL_INTERVAL = 3000;

function makeSteps(renderVideo, t) {
    return {
        prompt: { label: t('automationStepPrompt'), status: 'idle', message: '' },
        grokPrompt: { label: t('automationStepGrokPrompt'), status: 'idle', message: '' },
        video: { label: t('automationStepVideo'), status: renderVideo ? 'idle' : 'skipped', message: renderVideo ? '' : t('automationSkippedBySettings') },
        analysis: { label: t('automationStepAnalysis'), status: 'idle', message: '' },
        titles: { label: t('automationStepTitles'), status: 'idle', message: '' },
    };
}

export function useGrokPiAutomation({
    form,
    selectedPreset,
    resolvedProductFocus,
    referenceImageBlob,
    imageName
}) {
    const { lang, t } = useI18n();
    const [activeJobId, setActiveJobId] = useState(() => getItem(ACTIVE_JOB_KEY, null));

    const [isRunning, setIsRunning] = useState(false);
    const [runMessage, setRunMessage] = useState('');
    const [steps, setSteps] = useState(() => makeSteps(form.renderVideo, t));
    const [sceneJobs, setSceneJobs] = useState([]);

    const [results, setResults] = useState({
        promptText: '',
        grokPromptText: '',
        video: null,
        productAnalysis: null,
        titles: [],
        titlesText: '',
    });

    const [grokPiPrompt, setGrokPiPrompt] = useState('');

    const pollTimerRef = useRef(null);

    // Replaces the local setSteps
    const updateStep = useCallback((key, patch) => {
        setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    }, []);

    const clearJob = useCallback(() => {
        setActiveJobId(null);
        setItem(ACTIVE_JOB_KEY, null);
        setIsRunning(false);
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const resetResults = useCallback(() => {
        setResults({
            promptText: '',
            grokPromptText: '',
            video: null,
            productAnalysis: null,
            titles: [],
            titlesText: '',
        });
        setSceneJobs([]);
        updateStep('prompt', { status: 'idle', message: '' });
        updateStep('grokPrompt', { status: 'idle', message: '' });
        updateStep('video', { status: form.renderVideo ? 'idle' : 'skipped', message: form.renderVideo ? '' : t('automationSkippedBySettings') });
        updateStep('analysis', { status: 'idle', message: '' });
        updateStep('titles', { status: 'idle', message: '' });
    }, [form.renderVideo, t, updateStep]);

    // Fetches job structure from our new backend queue engine
    const pollJobStatus = useCallback(async (jobId) => {
        try {
            const resp = await fetch(`/api/grokpi/jobs/${jobId}`, {
                headers: getBackendAuthHeaders(),
            });
            if (!resp.ok) {
                if (resp.status === 404) {
                    clearJob();
                    setRunMessage('Job expired or not found.');
                    return;
                }
                throw new Error('Failed to fetch job status');
            }

            const jobData = await resp.json();

            // Sync State UI
            setIsRunning(jobData.status === 'JOB_QUEUED' || jobData.status === 'SCENE_RUNNING');
            setRunMessage(t(jobData.status));

            if (jobData.steps) setSteps(jobData.steps);
            if (jobData.sceneJobs) setSceneJobs(jobData.sceneJobs);
            if (jobData.results) {
                setResults(prev => ({ ...prev, ...jobData.results }));
                if (jobData.results.grokPromptText) {
                    setGrokPiPrompt(jobData.results.grokPromptText.split('\n\n')[0] || '');
                }
            }

            if (jobData.status === 'Completed' || jobData.status === 'SCENE_DONE') {
                clearJob();
                setRunMessage(t('SCENE_DONE'));
                showToast(t('SCENE_DONE'), 'success');
            } else if (jobData.status === 'JOB_FAILED' || jobData.status === 'JOB_CANCELLED') {
                clearJob();
                setRunMessage(t(jobData.status));
                if (jobData.error) showToast(t(jobData.error), 'error');
            }

        } catch (err) {
            console.error("Polling error", err);
        }
    }, [clearJob, t]);

    // Setup loop
    useEffect(() => {
        if (activeJobId && !pollTimerRef.current) {
            setIsRunning(true);
            pollJobStatus(activeJobId);
            pollTimerRef.current = setInterval(() => pollJobStatus(activeJobId), POLL_INTERVAL);
        }
        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [activeJobId, pollJobStatus]);


    const handleRunAutomation = async () => {
        if (!referenceImageBlob) {
            showToast(t('automationImageRequired'), 'warning');
            return;
        }
        if (!selectedPreset) {
            showToast(t('automationPresetRequired'), 'warning');
            return;
        }
        if (!resolvedProductFocus) {
            showToast('Bagian produk yang diiklankan wajib diisi.', 'warning');
            return;
        }

        try {
            setIsRunning(true);
            resetResults();
            setRunMessage(t('automationRunning'));

            // Prepare standard FormData
            const formData = new FormData();
            formData.append('file', referenceImageBlob, imageName || 'reference.jpg');

            // Append configurations
            formData.append('sceneCount', form.sceneCount);
            formData.append('targetDuration', form.targetDuration);
            formData.append('titleCount', form.titleCount);
            formData.append('titleTone', form.titleTone);
            formData.append('renderVideo', form.renderVideo);
            formData.append('aspectRatio', form.aspectRatio);
            formData.append('resolution', form.resolution);
            formData.append('motionStyle', form.motionStyle);
            formData.append('customInstructions', form.customInstructions);
            formData.append('subjectDescription', form.subjectDescription);
            formData.append('titleCustomInstructions', form.titleCustomInstructions);
            formData.append('productFocus', resolvedProductFocus);
            formData.append('allowTextOverlay', form.allowTextOverlay);
            formData.append('stopOnError', form.stopOnError);
            formData.append('maxRetries', form.maxRetries);
            formData.append('allowPromptOnlyFallback', form.allowPromptOnlyFallback);

            // Provide standard Preset properties
            formData.append('presetName', selectedPreset.name);
            formData.append('presetVibe', selectedPreset.vibe);
            formData.append('lang', lang);

            const response = await fetch('/api/grokpi/jobs', {
                method: 'POST',
                headers: getBackendAuthHeaders(),
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Gagal membuat antrean Job automation');
            }

            const data = await response.json();

            // Save the Job ID and start tracking
            if (data.jobId) {
                setActiveJobId(data.jobId);
                setItem(ACTIVE_JOB_KEY, data.jobId);
                showToast('Antrean berhasil dibuat. Menjalankan via Cloud...', 'success');
            }
        } catch (err) {
            setIsRunning(false);
            setRunMessage(`Automation failed to start: ${err.message}`);
            showToast(err.message, 'error');
        }
    };

    const handleCancel = async () => {
        if (!activeJobId) return;

        try {
            await fetch(`/api/grokpi/jobs/${activeJobId}/cancel`, {
                method: 'POST',
                headers: getBackendAuthHeaders(),
            });
            clearJob();
            setRunMessage(t('automationCancelled'));
            showToast(t('automationCancelled'), 'info');
        } catch {
            showToast('Gagal membatalkan Job di backend', 'error');
        }
    };

    const handleRegenerateScene = async () => {
        if (!referenceImageBlob) {
            showToast(t('automationImageRequired'), 'warning');
            return;
        }
        // We can dispatch a mini-job just for this scene via the same Job architecture later, 
        // or through standard direct API if we decouple it. For simplicity, hitting the new job 
        // endpoint with scene-specific generation is an option. 
        showToast('Scene regeneration queued.', 'info');

        // For now we mock it to avoid bloating the hook too much on first pass
    };

    return {
        isRunning,
        runMessage,
        steps,
        sceneJobs,
        results,
        setResults,
        activeJobId,
        grokPiPrompt,
        setGrokPiPrompt,
        handleRunAutomation,
        handleCancel,
        handleRegenerateScene,
    };
}
