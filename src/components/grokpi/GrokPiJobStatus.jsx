import { useI18n } from '../../hooks/useI18n';
import { showToast } from '../../lib/toastBus';
import { generateGrokPiImage, generateGrokPiVideo } from '../../services/gemini';
import { useState, useRef } from 'react';
import { fileToBase64 } from '../../utils/fileToBase64';

const STEP_ORDER = ['prompt', 'grokPrompt', 'video', 'analysis', 'titles'];

export default function GrokPiJobStatus({
    automationState,
    grokPiEnabled,
    refreshGallery,
    referenceImageBlob,
    formState
}) {
    const { t } = useI18n();
    const {
        steps, sceneJobs, results, isRunning, grokPiPrompt,
        setGrokPiPrompt, handleRegenerateScene
    } = automationState;
    const { normalizedAspectRatio, form } = formState;

    const [isGrokPiImageLoading, setIsGrokPiImageLoading] = useState(false);
    const [isGrokPiVideoLoading, setIsGrokPiVideoLoading] = useState(false);
    const gatewayRef = useRef(null);

    const handleGenerateGrokPiImage = async () => {
        if (!grokPiPrompt.trim()) {
            showToast(t('grokPromptRequired'), 'warning');
            return;
        }
        setIsGrokPiImageLoading(true);
        try {
            await generateGrokPiImage({
                prompt: grokPiPrompt,
                aspectRatio: normalizedAspectRatio,
                n: 1,
            });
            await refreshGallery();
            showToast('GrokPI image queued/generated.', 'success');
        } catch (error) {
            showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 6000);
        } finally {
            setIsGrokPiImageLoading(false);
        }
    };

    const handleGenerateGrokPiVideo = async () => {
        if (!grokPiPrompt.trim()) {
            showToast(t('grokPromptRequired'), 'warning');
            return;
        }
        setIsGrokPiVideoLoading(true);
        try {
            const referenceImageDataUrl = referenceImageBlob
                ? await fileToBase64(referenceImageBlob)
                : undefined;

            // In the new architecture, this could also be sent to the backend job queue or 
            // directly to the gemini service if it's a one-off. For now, we maintain direct call
            // or we can just show warning if direct call is deprecated.
            await generateGrokPiVideo({
                prompt: grokPiPrompt,
                aspectRatio: normalizedAspectRatio,
                durationSeconds: form.targetDuration,
                resolution: form.resolution === '720p' ? '720p' : '480p',
                preset: 'normal',
                imageUrl: referenceImageDataUrl,
                strictReference: !form.allowPromptOnlyFallback,
            });

            await refreshGallery();
            showToast('GrokPI video queued/generated.', 'success');
        } catch (error) {
            showToast(`${t('generateErrorPrefix')}: ${error.message}`, 'error', 6000);
        } finally {
            setIsGrokPiVideoLoading(false);
        }
    };


    return (
        <>
            {/* Automation Progress */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>{t('automationProgressTitle')}</h3>
                </div>
                <div className="gpi-progress">
                    {STEP_ORDER.map((key) => {
                        const step = steps[key];
                        const status = step?.status || 'idle';
                        return (
                            <div key={key} className={`gpi-progress__step gpi-progress__step--${status}`}>
                                <span className="gpi-progress__dot" />
                                <div className="gpi-progress__info">
                                    <span className="gpi-progress__label">{step?.label}</span>
                                    <span className="gpi-progress__message">{step?.message || t('automationWaiting')}</span>
                                </div>
                                <span className="gpi-progress__badge">{status.toUpperCase()}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>{t('sceneQueue')}</h3>
                    <span className="meta-badge">{sceneJobs.length}</span>
                </div>
                {sceneJobs.length === 0 ? (
                    <p className="gpi-empty">{t('sceneQueueEmpty')}</p>
                ) : (
                    <div className="gpi-scene-list">
                        {sceneJobs.map((job) => (
                            <div key={job.id} className={`gpi-scene-card gpi-scene-card--${job.status}`}>
                                <div className="gpi-scene-card__head">
                                    <strong>Scene {job.sceneIndex}</strong>
                                    <span className="gpi-progress__badge">{job.status}</span>
                                </div>

                                <textarea
                                    className="option-textarea"
                                    rows={3}
                                    value={job.prompt || ''}
                                    readOnly
                                    placeholder={t('scenePromptPlaceholder')}
                                />

                                {job.videoUrl ? (
                                    <div className="gpi-scene-card__video">
                                        <video controls playsInline preload="metadata" src={job.videoUrl} />
                                    </div>
                                ) : null}

                                <div className="gpi-scene-card__actions">
                                    <button
                                        type="button"
                                        className="btn btn--secondary btn--sm"
                                        onClick={() => void handleRegenerateScene(job.sceneIndex)}
                                        disabled={isRunning || !job.prompt}
                                    >
                                        {t('btnRegenerateScene')}
                                    </button>
                                    {job.videoUrl ? (
                                        <a className="btn btn--outline btn--sm" href={job.videoUrl} download={`scene-${job.sceneIndex}.mp4`}>
                                            {t('btnSave')}
                                        </a>
                                    ) : null}
                                </div>

                                {job.message ? <p className="gpi-scene-card__message">{job.message}</p> : null}
                                {job.error ? <p className="gpi-scene-card__error">{job.error}</p> : null}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* GrokPI Gateway */}
            <div className="gpi-panel gpi-panel--gateway" ref={gatewayRef}>
                <div className="gpi-panel__title">
                    <h3>{t('grokPiGatewayTitle')}</h3>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={refreshGallery}>{t('regenerate')}</button>
                </div>

                {!grokPiEnabled ? (
                    <p className="gpi-empty">GrokPI backend is unavailable. Start GrokPI at configured GROKPI_BASE_URL to use gallery and generation.</p>
                ) : null}

                <div className="gpi-control gpi-control--full">
                    <label className="gpi-control__label">GrokPI Prompt</label>
                    <div className="gpi-prompt-wrap">
                        <textarea className="option-textarea" rows={3} value={grokPiPrompt} onChange={(e) => setGrokPiPrompt(e.target.value)} placeholder={t('automationGrokPromptOutputEmpty')} />
                        {grokPiPrompt.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setGrokPiPrompt('')}
                                className="gpi-prompt-clear"
                                title="Clear prompt"
                                aria-label="Clear prompt"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                <div className="gpi-gateway-actions">
                    <button type="button" className="btn btn--primary" onClick={handleGenerateGrokPiImage} disabled={!grokPiEnabled || isGrokPiImageLoading || isGrokPiVideoLoading}>
                        {isGrokPiImageLoading && <span className="spinner" />}
                        {isGrokPiImageLoading ? t('generating') : t('grokGenerateImageBtn')}
                    </button>
                    <button type="button" className="btn btn--primary" onClick={handleGenerateGrokPiVideo} disabled={!grokPiEnabled || isGrokPiImageLoading || isGrokPiVideoLoading}>
                        {isGrokPiVideoLoading && <span className="spinner" />}
                        {isGrokPiVideoLoading ? t('generating') : t('grokGenerateVideoBtn')}
                    </button>
                </div>
                <p className="gpi-hint">
                    {referenceImageBlob ? t('imageAttachedForVideo') : t('imageToVideoHint')}
                </p>
            </div>

            {/* Divider */}
            <div className="gpi-divider" />

            {/* GrokPrompt Output */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>{t('automationGrokPromptOutputTitle')}</h3>
                </div>
                {!results.grokPromptText ? (
                    <p className="gpi-empty">{t('automationGrokPromptOutputEmpty')}</p>
                ) : (
                    <p className="gpi-output">{results.grokPromptText}</p>
                )}
            </div>

            {/* Prompt Generator Output */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>{t('menuPromptGenerator')}</h3>
                </div>
                {!results.promptText ? (
                    <p className="gpi-empty">{t('resultPlaceholder')}</p>
                ) : (
                    <p className="gpi-output">{results.promptText}</p>
                )}
            </div>

            {/* Title Generator Output */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>{t('menuTitleGenerator')}</h3>
                </div>
                {!results.titles?.length ? (
                    <p className="gpi-empty">{t('resultPlaceholder')}</p>
                ) : (
                    <div className="gpi-titles-list">
                        {results.titles.map((title, index) => (
                            <div key={`${title}-${index}`} className="gpi-titles-item">
                                <p className="gpi-output">{title}</p>
                                <button
                                    type="button"
                                    className="btn btn--outline btn--sm"
                                    onClick={() => {
                                        void navigator.clipboard.writeText(title).then(() => showToast('Title copied!', 'success'));
                                    }}
                                >
                                    {t('btnCopy')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </>
    );
}
