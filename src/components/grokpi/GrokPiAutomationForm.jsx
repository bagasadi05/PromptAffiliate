import { useRef } from 'react';
import { useI18n } from '../../hooks/useI18n';

const ALLOWED_DURATIONS = [6, 10];
const PRODUCT_FOCUS_OPTIONS = ['hijab', 'baju', 'celana', 'gamis', 'sepatu', 'tas', 'aksesoris', 'lainnya'];

export default function GrokPiAutomationForm({
    formState,
    presets,
    isRunning,
    runMessage,
    onRunAutomation,
    onCancel,
}) {
    const { t } = useI18n();
    const fileInputRef = useRef(null);

    const {
        form, setField, selectedPresetId, setSelectedPresetId,
        imagePreview, imageName, handleSelectImage, handleClearImage
    } = formState;

    const onImageChange = (event) => {
        const file = event.target.files?.[0];
        if (file) handleSelectImage(file);
        event.target.value = '';
    };

    return (
        <div className="gpi-layout__left">
            {/* Image Upload */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>{t('grokReferenceImageTitle')}</h3>
                    <span className="meta-badge">{t('required')}</span>
                </div>

                {imagePreview ? (
                    <div className="gpi-preview">
                        <img src={imagePreview} alt={t('automationPreviewAlt')} className="gpi-preview__img" />
                        <div className="gpi-preview__overlay">
                            <button type="button" className="btn btn--outline btn--sm" onClick={() => fileInputRef.current?.click()}>{t('titleAnalysisChangeImage')}</button>
                            <button type="button" className="btn btn--danger btn--sm" onClick={handleClearImage}>{t('titleAnalysisRemoveImage')}</button>
                        </div>
                    </div>
                ) : (
                    <button type="button" className="gpi-dropzone" onClick={() => fileInputRef.current?.click()}>
                        <span className="gpi-dropzone__icon">📸</span>
                        <span className="gpi-dropzone__title">{t('automationUploadTitle')}</span>
                        <span className="gpi-dropzone__hint">{t('automationUploadHint')}</span>
                        <span className="gpi-dropzone__formats">
                            <span className="gpi-dropzone__format-tag">JPG</span>
                            <span className="gpi-dropzone__format-tag">PNG</span>
                            <span className="gpi-dropzone__format-tag">WebP</span>
                        </span>
                    </button>
                )}
                {imageName ? <p className="gpi-hint" style={{ marginTop: 10 }}>File: {imageName}</p> : null}
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={onImageChange} />
            </div>

            {/* Controls */}
            <div className="gpi-panel">
                <div className="gpi-panel__title">
                    <h3>{t('presetTitle')}</h3>
                </div>

                <div className="gpi-controls">
                    <div className="gpi-control gpi-control--full">
                        <label className="gpi-control__label">{t('presetTitle')}</label>
                        <select className="option-select" value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
                            {presets.map((preset) => (
                                <option key={preset.id} value={preset.id}>{preset.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="gpi-control">
                        <label className="gpi-control__label">
                            {t('sceneLabel')}
                            <span className="gpi-control__value">{form.sceneCount}</span>
                        </label>
                        <input className="option-range" type="range" min="3" max="8" step="1" value={form.sceneCount} onChange={(e) => setField('sceneCount', Number(e.target.value))} />
                    </div>

                    <div className="gpi-control">
                        <label className="gpi-control__label">
                            {t('titleCount')}
                            <span className="gpi-control__value">{form.titleCount}</span>
                        </label>
                        <input className="option-range" type="range" min="3" max="5" step="1" value={form.titleCount} onChange={(e) => setField('titleCount', Number(e.target.value))} />
                    </div>

                    <div className="gpi-control">
                        <label className="gpi-control__label">
                            {t('durationLabel')}
                            <span className="gpi-control__value">{form.targetDuration}s</span>
                        </label>
                        <select className="option-select" value={form.targetDuration} onChange={(e) => setField('targetDuration', Number(e.target.value))}>
                            {ALLOWED_DURATIONS.map((duration) => (
                                <option key={duration} value={duration}>{duration}s</option>
                            ))}
                        </select>
                    </div>

                    <div className="gpi-control gpi-control--full">
                        <label className="gpi-control__label">Bagian produk yang diiklankan</label>
                        <select className="option-select" value={form.productFocus} onChange={(e) => setField('productFocus', e.target.value)}>
                            {PRODUCT_FOCUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>

                    {form.productFocus === 'lainnya' ? (
                        <div className="gpi-control gpi-control--full">
                            <label className="gpi-control__label">Custom bagian produk</label>
                            <input
                                className="option-input"
                                value={form.productFocusCustom}
                                onChange={(e) => setField('productFocusCustom', e.target.value)}
                                placeholder="Contoh: pashmina crinkle premium"
                            />
                        </div>
                    ) : null}

                    <div className="gpi-control">
                        <label className="gpi-control__label">{t('aspectLabel')}</label>
                        <select className="option-select" value={form.aspectRatio} onChange={(e) => setField('aspectRatio', e.target.value)}>
                            <option value="auto">Auto (ikut gambar)</option>
                            <option value="9:16">9:16</option>
                            <option value="16:9">16:9</option>
                            <option value="1:1">1:1</option>
                            <option value="2:3">2:3</option>
                            <option value="3:2">3:2</option>
                        </select>
                    </div>

                    <div className="gpi-control">
                        <label className="gpi-control__label">{t('automationResolutionLabel')}</label>
                        <select className="option-select" value={form.resolution} onChange={(e) => setField('resolution', e.target.value)}>
                            <option value="720p">720p</option>
                            <option value="480p">480p</option>
                        </select>
                    </div>

                    <div className="gpi-control gpi-control--full">
                        <label className="gpi-control__label">{t('automationMotionStyleLabel')}</label>
                        <textarea className="option-textarea" rows={2} value={form.motionStyle} onChange={(e) => setField('motionStyle', e.target.value)} />
                    </div>

                    <div className="gpi-control gpi-control--full">
                        <label className="gpi-control__label">{t('automationSharedCustomLabel')}</label>
                        <textarea className="option-textarea" rows={2} value={form.customInstructions} onChange={(e) => setField('customInstructions', e.target.value)} />
                    </div>

                    <div className="gpi-control">
                        <label className="gpi-control__label">Stop all on error</label>
                        <select className="option-select" value={form.stopOnError ? 'yes' : 'no'} onChange={(e) => setField('stopOnError', e.target.value === 'yes')}>
                            <option value="no">No (continue queue)</option>
                            <option value="yes">Yes (stop on first failure)</option>
                        </select>
                    </div>

                    <div className="gpi-control">
                        <label className="gpi-control__label">Retry per scene</label>
                        <select className="option-select" value={form.maxRetries} onChange={(e) => setField('maxRetries', Number(e.target.value))}>
                            <option value="0">0x</option>
                            <option value="1">1x</option>
                            <option value="2">2x</option>
                            <option value="3">3x</option>
                        </select>
                    </div>

                    <div className="gpi-control">
                        <label className="gpi-control__label">Teks overlay</label>
                        <select className="option-select" value={form.allowTextOverlay ? 'yes' : 'no'} onChange={(e) => setField('allowTextOverlay', e.target.value === 'yes')}>
                            <option value="no">Off (default)</option>
                            <option value="yes">On</option>
                        </select>
                    </div>

                    <div className="gpi-control gpi-control--full">
                        <label className="gpi-control__label">Allow prompt-only fallback (identity may drift)</label>
                        <select className="option-select" value={form.allowPromptOnlyFallback ? 'yes' : 'no'} onChange={(e) => setField('allowPromptOnlyFallback', e.target.value === 'yes')}>
                            <option value="no">No (strict reference, recommended)</option>
                            <option value="yes">Yes (allow fallback if attachment rejected)</option>
                        </select>
                    </div>
                </div>

                <div className="gpi-actions" style={{ marginTop: 16 }}>
                    <button type="button" className="btn btn--generate" onClick={onRunAutomation} disabled={isRunning || !imagePreview || !selectedPresetId}>
                        {isRunning && <span className="spinner" />}
                        {isRunning ? t('automationRunningButton') : t('automationRunButton')}
                    </button>
                    <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={!isRunning}>
                        {t('cancel')}
                    </button>
                </div>

                {runMessage ? <p className="gpi-status-message" style={{ marginTop: 12 }}>{runMessage}</p> : null}
            </div>
        </div>
    );
}
