import { useCallback, useEffect, useRef, useState } from 'react';
import { generateGrokImagineVideo, generateGrokVideoPrompt } from '../services/gemini';
import { copyToClipboard } from '../utils/copy';
import { downloadTxt } from '../utils/downloadTxt';
import { showToast } from '../lib/toastBus';
import { useI18n } from '../hooks/useI18n';
import { fileToBase64 } from '../utils/fileToBase64';
import { compressImage } from '../utils/imageCompression';

const DEFAULT_FORM = {
    vibe: 'Cinematic',
    cameraDistance: 'medium',
    lighting: 'soft daylight',
    targetDuration: 6,
    aspectRatio: 'auto',
    resolution: '720p',
    realismLevel: 'High',
    background: 'keep from reference',
    motionStyle: 'fluid, natural, cinematic motion with precise physics',
    customInstructions: '',
    subjectDescription: '',
};

const VIBE_OPTIONS = ['Cinematic', 'Documentary', 'Action', 'Surreal', 'Editorial', 'Vintage', 'Cyberpunk'];
const CAMERA_OPTIONS = [
    { value: 'extreme close', label: 'Extreme close-up' },
    { value: 'close', label: 'Close-up' },
    { value: 'medium', label: 'Medium' },
    { value: 'full-body', label: 'Full-body' },
    { value: 'wide', label: 'Wide' },
];
const LIGHTING_OPTIONS = [
    { value: 'soft daylight', label: 'Soft daylight' },
    { value: 'cinematic rim', label: 'Cinematic rim' },
    { value: 'volumetric', label: 'Volumetric lighting' },
    { value: 'neon night', label: 'Neon night' },
    { value: 'dramatic shadow', label: 'Dramatic shadow' },
    { value: 'studio ring light', label: 'Studio lighting' },
];
const ASPECT_RATIO_OPTIONS = ['auto', '9:16', '16:9', '1:1', '4:3'];
const RESOLUTION_OPTIONS = ['720p', '480p'];

export default function GrokVideoGenerator() {
    const { t, lang } = useI18n();
    const [form, setForm] = useState(() => ({ ...DEFAULT_FORM }));
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [generatedVideo, setGeneratedVideo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRenderingVideo, setIsRenderingVideo] = useState(false);
    const [renderStatusText, setRenderStatusText] = useState('');
    const [lastRenderRequestId, setLastRenderRequestId] = useState('');
    const [history, setHistory] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const promptAbortRef = useRef(null);
    const renderAbortRef = useRef(null);
    const imageInputRef = useRef(null);

    useEffect(() => {
        return () => {
            if (promptAbortRef.current) promptAbortRef.current.abort();
            if (renderAbortRef.current) renderAbortRef.current.abort();
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const handleField = useCallback((key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSelectImage = useCallback(async (file) => {
        if (!file) return;

        const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024;

        if (!acceptedTypes.includes(file.type)) {
            showToast(t('uploadFormatError'), 'error');
            return;
        }
        if (file.size > maxSize) {
            showToast(t('uploadSizeError'), 'error');
            return;
        }

        let processedFile = file;
        try {
            const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.86 });
            processedFile = compressed.file;
        } catch {
            processedFile = file;
        }

        setImageFile(processedFile);
        setImagePreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(processedFile);
        });
    }, [t]);

    const handleImageInputChange = useCallback((event) => {
        const file = event.target.files?.[0];
        if (file) {
            void handleSelectImage(file);
        }
        event.target.value = '';
    }, [handleSelectImage]);

    const handleClearImage = useCallback(() => {
        setImageFile(null);
        setGeneratedVideo(null);
        setLastRenderRequestId('');
        setRenderStatusText('');
        setImagePreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return '';
        });
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!imageFile) {
            showToast(t('grokImageRequired'), 'warning');
            return;
        }

        if (promptAbortRef.current) promptAbortRef.current.abort();
        const controller = new AbortController();
        promptAbortRef.current = controller;

        setIsLoading(true);
        try {
            const imageBase64 = await fileToBase64(imageFile);
            const result = await generateGrokVideoPrompt({
                imageBase64,
                imageMimeType: imageFile.type,
                preset: { name: form.vibe, vibe: form.vibe, grokPromptIdea: form.motionStyle },
                userOptions: {
                    targetDuration: form.targetDuration,
                    cameraDistance: form.cameraDistance,
                    lighting: form.lighting,
                    background: form.background,
                    realismLevel: form.realismLevel,
                    customInstructions: form.customInstructions,
                    subjectDescription: form.subjectDescription,
                    outputLanguage: lang,
                },
                signal: controller.signal,
            });

            if (controller.signal.aborted) return;

            const nextPrompt = result?.text || '';
            setGeneratedPrompt(nextPrompt);
            setGeneratedVideo(null);
            setLastRenderRequestId('');
            setRenderStatusText('');

            if (nextPrompt) {
                setHistory((prev) => [
                    {
                        id: Date.now(),
                        prompt: nextPrompt,
                        timestamp: new Date().toLocaleTimeString(lang === 'ID' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
                        vibe: form.vibe,
                    },
                    ...prev,
                ].slice(0, 10));
                showToast(t('grokPromptGeneratedSuccess'), 'success');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 5000);
        } finally {
            if (promptAbortRef.current === controller) promptAbortRef.current = null;
            setIsLoading(false);
        }
    }, [form, imageFile, lang, t]);

    const handleRenderVideo = useCallback(async () => {
        if (!imageFile) {
            showToast(t('grokImageRequired'), 'warning');
            return;
        }

        if (!generatedPrompt.trim()) {
            showToast(t('grokPromptRequired'), 'warning');
            return;
        }

        if (renderAbortRef.current) renderAbortRef.current.abort();
        const controller = new AbortController();
        renderAbortRef.current = controller;

        setIsRenderingVideo(true);
        setGeneratedVideo(null);
        setRenderStatusText(t('grokRenderStarting'));

        try {
            const imageBase64 = await fileToBase64(imageFile);
            const result = await generateGrokImagineVideo({
                prompt: generatedPrompt,
                imageBase64,
                imageMimeType: imageFile.type,
                duration: form.targetDuration,
                aspectRatio: form.aspectRatio,
                resolution: form.resolution,
                signal: controller.signal,
                onStatus: ({ stage, status, requestId }) => {
                    if (stage === 'starting') {
                        setRenderStatusText(t('grokRenderSubmitting'));
                        return;
                    }

                    if (requestId) {
                        setLastRenderRequestId(requestId);
                    }

                    if (stage === 'polling') {
                        const label = status === 'completed'
                            ? t('grokRenderReady')
                            : status === 'failed'
                                ? t('grokRenderFailed')
                                : status === 'cancelled'
                                    ? t('grokRenderCancelled')
                                    : t('grokRenderProgress').replace('{status}', status || t('grokRenderProcessing'));
                        setRenderStatusText(label);
                    }
                },
            });

            if (controller.signal.aborted) return;

            setGeneratedVideo(result?.video || null);
            setLastRenderRequestId(result?.requestId || '');
            setRenderStatusText(result?.video?.url ? t('grokVideoGeneratedSuccess') : t('grokVideoNoUrl'));

            if (result?.video?.url) {
                showToast(t('grokVideoGeneratedSuccess'), 'success');
            } else {
                showToast(t('grokVideoNoUrl'), 'warning');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                setRenderStatusText(t('grokRenderCancelled'));
                return;
            }
            showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 6000);
            setRenderStatusText(error.requestId ? t('grokRenderStillProcessing').replace('{requestId}', error.requestId) : t('grokRenderFailed'));
            if (error.requestId) {
                setLastRenderRequestId(error.requestId);
            }
        } finally {
            if (renderAbortRef.current === controller) renderAbortRef.current = null;
            setIsRenderingVideo(false);
        }
    }, [form, generatedPrompt, imageFile, t]);

    const handleCancelRender = useCallback(() => {
        if (renderAbortRef.current) {
            renderAbortRef.current.abort();
        }
    }, []);

    const handleCopy = useCallback(async () => {
        if (!generatedPrompt) return;
        const ok = await copyToClipboard(generatedPrompt);
        showToast(ok ? t('copySuccess') : t('copyFail'), ok ? 'success' : 'error');
    }, [generatedPrompt, t]);

    const handleDownload = useCallback(() => {
        if (!generatedPrompt) return;
        downloadTxt(generatedPrompt, `grok-video-prompt-${Date.now()}`);
        showToast(t('downloadSuccess'), 'success');
    }, [generatedPrompt, t]);

    const handleUseHistory = useCallback((item) => {
        setGeneratedPrompt(item.prompt);
    }, []);

    return (
        <div className="title-generator">
            <div className="panel-header">
                <h2>{t('menuGrokVideoGenerator')}</h2>
                <span className="panel-badge">{t('grokBadge')}</span>
            </div>

            <div className="title-generator__card">
                <div className="title-analysis">
                    <div className="title-analysis__header">
                        <h3>{t('grokReferenceImageTitle')}</h3>
                        <span className="meta-badge">{t('required')}</span>
                    </div>
                    {imagePreview ? (
                        <div className="title-analysis__preview-wrap">
                            <img src={imagePreview} alt={t('grokReferencePreviewAlt')} className="title-analysis__preview" />
                            <div className="title-analysis__preview-actions">
                                <button type="button" className="btn btn--outline btn--sm" onClick={() => imageInputRef.current?.click()}>
                                    {t('titleAnalysisChangeImage')}
                                </button>
                                <button type="button" className="btn btn--danger btn--sm" onClick={handleClearImage}>
                                    {t('titleAnalysisRemoveImage')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="title-analysis__dropzone"
                            onClick={() => imageInputRef.current?.click()}
                        >
                            <span className="title-analysis__dropzone-title">{t('grokUploadTitle')}</span>
                            <span className="title-analysis__dropzone-sub">{t('grokUploadHint')}</span>
                        </button>
                    )}

                    <input
                        ref={imageInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        style={{ display: 'none' }}
                        onChange={handleImageInputChange}
                    />
                </div>

                <div className="title-generator__grid">
                    <div className="option-group">
                        <label className="option-label">Vibe / Style</label>
                        <select className="option-select" value={form.vibe} onChange={(e) => handleField('vibe', e.target.value)}>
                            {VIBE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="option-group">
                        <label className="option-label">Camera Distance</label>
                        <select className="option-select" value={form.cameraDistance} onChange={(e) => handleField('cameraDistance', e.target.value)}>
                            {CAMERA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    <div className="option-group">
                        <label className="option-label">Lighting</label>
                        <select className="option-select" value={form.lighting} onChange={(e) => handleField('lighting', e.target.value)}>
                            {LIGHTING_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    <div className="option-group">
                        <label className="option-label">Target Duration (secs)</label>
                        <input
                            className="option-range"
                            type="range"
                            min="2"
                            max="15"
                            step="1"
                            value={form.targetDuration}
                            onChange={(e) => handleField('targetDuration', Number(e.target.value))}
                        />
                        <span className="option-hint">{form.targetDuration}s</span>
                    </div>

                    <div className="option-group">
                        <label className="option-label">Aspect Ratio</label>
                        <select className="option-select" value={form.aspectRatio} onChange={(e) => handleField('aspectRatio', e.target.value)}>
                            {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="option-group">
                        <label className="option-label">Resolution</label>
                        <select className="option-select" value={form.resolution} onChange={(e) => handleField('resolution', e.target.value)}>
                            {RESOLUTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>

                <div className="option-group">
                    <label className="option-label">Motion / Action Description</label>
                    <textarea
                        className="option-textarea"
                        rows={2}
                        value={form.motionStyle}
                        onChange={(e) => handleField('motionStyle', e.target.value)}
                        placeholder="Describe the exact physical movements (e.g. fluid and natural walk cycle)"
                    />
                </div>

                <div className="option-group">
                    <label className="option-label">Specific Subject Details (Optional)</label>
                    <textarea
                        className="option-textarea"
                        rows={2}
                        value={form.subjectDescription}
                        onChange={(e) => handleField('subjectDescription', e.target.value)}
                        placeholder="Any specific traits from the reference image you want to emphasize"
                    />
                </div>

                <div className="option-group">
                    <label className="option-label">{t('customLabel')}</label>
                    <textarea
                        className="option-textarea"
                        rows={2}
                        value={form.customInstructions}
                        onChange={(e) => handleField('customInstructions', e.target.value)}
                        placeholder={t('titleCustomPlaceholder')}
                    />
                </div>

                <div className="title-generator__actions">
                    <button
                        type="button"
                        className="btn btn--generate"
                        onClick={handleGenerate}
                        disabled={isLoading || isRenderingVideo || !imageFile}
                    >
                        {isLoading ? t('generating') : t('grokGeneratePromptBtn')}
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handleRenderVideo}
                        disabled={isLoading || isRenderingVideo || !imageFile || !generatedPrompt.trim()}
                        title={!generatedPrompt.trim() ? t('grokPromptRequired') : t('grokRenderVideoHint')}
                    >
                        {isRenderingVideo ? t('grokRenderingVideo') : t('grokRenderVideoBtn')}
                    </button>
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={handleCancelRender}
                        disabled={!isRenderingVideo}
                    >
                        {t('grokCancelRender')}
                    </button>
                </div>
                {renderStatusText && (
                    <p className="title-generator__empty" style={{ marginTop: 12 }}>
                        {renderStatusText}{lastRenderRequestId ? ` (Request ID: ${lastRenderRequestId})` : ''}
                    </p>
                )}
            </div>

            <div className="title-generator__result">
                <div className="title-generator__result-header">
                    <h3>{t('grokGeneratedPromptTitle')}</h3>
                    <div className="result-actions">
                        <button type="button" className="btn btn--primary btn--sm" onClick={handleCopy} disabled={!generatedPrompt}>
                            {t('copy')}
                        </button>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={handleDownload} disabled={!generatedPrompt}>
                            {t('downloadTxt')}
                        </button>
                    </div>
                </div>

                {!generatedPrompt ? (
                    <p className="title-generator__empty">{t('grokGeneratedPromptEmpty')}</p>
                ) : (
                    <div className="title-generator__list">
                        <div className="title-item">
                            <p className="title-item__text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{generatedPrompt}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="title-generator__result">
                <div className="title-generator__result-header">
                    <h3>{t('grokGeneratedVideoTitle')}</h3>
                    {generatedVideo?.url && (
                        <div className="result-actions">
                            <a
                                className="btn btn--secondary btn--sm"
                                href={generatedVideo.url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t('openUrl')}
                            </a>
                        </div>
                    )}
                </div>

                {!generatedVideo?.url ? (
                    <p className="title-generator__empty">{t('grokGeneratedVideoEmpty')}</p>
                ) : (
                    <div className="title-generator__list">
                        <div className="title-item">
                            <video
                                controls
                                playsInline
                                preload="metadata"
                                src={generatedVideo.url}
                                style={{ width: '100%', borderRadius: 12, background: '#000' }}
                            />
                            <p className="title-item__meta" style={{ marginTop: 10, wordBreak: 'break-all' }}>
                                {t('durationLabel')}: {generatedVideo.duration ?? form.targetDuration ?? '-'}s
                                {' • '}
                                {t('expiresLabel')}: {generatedVideo.expiresAt || 'N/A'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {history.length > 0 && (
                <div className="title-generator__history">
                    <div className="history-header">
                        <h3 className="history-title">{t('titleHistoryTitle')} ({history.length})</h3>
                    </div>
                    <div className="history-list">
                        {history.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="history-item__main title-history-item"
                                onClick={() => handleUseHistory(item)}
                            >
                                <span className="history-item__emoji">🎥</span>
                                <div className="history-item__info">
                                    <span className="history-item__name">{item.vibe}</span>
                                    <span className="history-item__time">{item.timestamp} • {item.prompt.length} {t('titleCharUnit')}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
