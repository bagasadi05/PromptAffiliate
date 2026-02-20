import { useState, useRef, useCallback, useMemo } from 'react';
import { showToast } from '../lib/toastBus';
import { compressImage } from '../utils/imageCompression';
import { IMAGE_REFERENCE_ROLES, buildDefaultImageReference } from '../utils/imageReferences';
import { useI18n } from '../hooks/useI18n';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 4;

export default function UploadPanel({ files, previews, imageReferences, onFilesChange, onClear }) {
    const { t } = useI18n();
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    // Support both single & multi
    const fileList = useMemo(() => (
        Array.isArray(files) ? files : (files ? [files] : [])
    ), [files]);
    const previewList = useMemo(() => (
        Array.isArray(previews) ? previews : (previews ? [previews] : [])
    ), [previews]);
    const referenceList = useMemo(() => (
        Array.isArray(imageReferences) ? imageReferences : []
    ), [imageReferences]);

    const validateFile = useCallback((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
            showToast(t('uploadFormatError'), 'error');
            return false;
        }
        if (f.size > MAX_SIZE) {
            showToast(t('uploadSizeError'), 'error');
            return false;
        }
        return true;
    }, [t]);

    const handleNewFiles = useCallback(async (newFiles) => {
        const validFiles = [];
        for (const f of newFiles) {
            if (!validateFile(f)) continue;
            if (fileList.length + validFiles.length >= MAX_IMAGES) {
                showToast(`Maksimum ${MAX_IMAGES} gambar`, 'warning');
                break;
            }
            try {
                const { file: compressed, originalSize, compressedSize } = await compressImage(f);
                validFiles.push(compressed);
                if (compressedSize < originalSize) {
                    const saved = ((1 - compressedSize / originalSize) * 100).toFixed(0);
                    showToast(`Dikompresi ${saved}% lebih kecil`, 'info', 2000);
                }
            } catch {
                validFiles.push(f);
            }
        }

        if (validFiles.length > 0) {
            const mergedFiles = [...fileList, ...validFiles];
            const mergedPreviews = [...previewList, ...validFiles.map((f) => URL.createObjectURL(f))];
            const mergedReferences = [
                ...referenceList,
                ...validFiles.map((file, offset) => buildDefaultImageReference(file, fileList.length + offset)),
            ];
            onFilesChange(mergedFiles, mergedPreviews, mergedReferences);
            showToast(t('uploadSuccess'), 'success');
        }
    }, [fileList, previewList, referenceList, validateFile, onFilesChange, t]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) handleNewFiles(droppedFiles);
    }, [handleNewFiles]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleInputChange = useCallback((e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length > 0) handleNewFiles(newFiles);
        e.target.value = '';
    }, [handleNewFiles]);

    const handleRemoveOne = useCallback((index) => {
        const newFiles = fileList.filter((_, i) => i !== index);
        const newPreviews = previewList.filter((_, i) => i !== index);
        const newReferences = referenceList
            .filter((_, i) => i !== index)
            .map((reference, i) => ({ ...reference, priority: i + 1 }));
        if (newFiles.length === 0) {
            onClear();
        } else {
            onFilesChange(newFiles, newPreviews, newReferences);
        }
    }, [fileList, previewList, referenceList, onFilesChange, onClear]);

    const handleReferenceChange = useCallback((index, updates) => {
        const nextReferences = fileList.map((file, i) => {
            const baseReference = referenceList[i] || buildDefaultImageReference(file, i);
            return {
                ...baseReference,
                ...(i === index ? updates : {}),
                priority: i + 1,
            };
        });
        onFilesChange(fileList, previewList, nextReferences);
    }, [fileList, previewList, referenceList, onFilesChange]);

    const handleMoveImage = useCallback((index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= fileList.length) return;

        const nextFiles = [...fileList];
        const nextPreviews = [...previewList];
        const nextReferences = fileList.map((file, i) => (
            referenceList[i] || buildDefaultImageReference(file, i)
        ));

        [nextFiles[index], nextFiles[targetIndex]] = [nextFiles[targetIndex], nextFiles[index]];
        [nextPreviews[index], nextPreviews[targetIndex]] = [nextPreviews[targetIndex], nextPreviews[index]];
        [nextReferences[index], nextReferences[targetIndex]] = [nextReferences[targetIndex], nextReferences[index]];

        onFilesChange(
            nextFiles,
            nextPreviews,
            nextReferences.map((reference, i) => ({ ...reference, priority: i + 1 })),
        );
    }, [fileList, previewList, referenceList, onFilesChange]);

    const handleClearAll = useCallback(() => {
        onClear();
        showToast(t('uploadRemoved'), 'info');
    }, [onClear, t]);

    return (
        <div className="upload-panel">
            <div className="panel-header">
                <h2>{t('uploadTitle')}</h2>
                <span className="panel-badge">{t('step1')}</span>
            </div>

            {previewList.length === 0 ? (
                <div
                    className={`upload-zone ${isDragging ? 'upload-zone--dragging' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => inputRef.current?.click()}
                >
                    <div className="upload-zone__icon">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                            <rect x="8" y="12" width="48" height="40" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" />
                            <path d="M24 36l8-10 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 44l12-8 8 6 12-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                        </svg>
                    </div>
                    <p className="upload-zone__text">
                        <strong>{t('uploadDrag')}</strong>
                    </p>
                    <p className="upload-zone__subtext">{t('uploadClick')}</p>
                    <p className="upload-zone__subtext" style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                        {t('uploadMultiHint')}
                    </p>
                    <div className="upload-zone__formats">
                        <span className="format-badge">JPG</span>
                        <span className="format-badge">PNG</span>
                        <span className="format-badge">WebP</span>
                        <span className="format-badge">Max 10MB</span>
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        multiple
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                    />
                </div>
            ) : (
                <div className="preview-container">
                    <div className={`preview-grid preview-grid--${Math.min(previewList.length, 4)}`}>
                        {previewList.map((preview, i) => {
                            const reference = referenceList[i] || buildDefaultImageReference(fileList[i], i);
                            const isPrimary = (reference.priority || (i + 1)) === 1;

                            return (
                            <div key={i} className="preview-image-wrapper">
                                <img src={preview} alt={`Preview ${i + 1}`} className="preview-image" />
                                <div className="preview-overlay">
                                    <span className="preview-filename">{fileList[i]?.name}</span>
                                    <span className="preview-size">
                                        {(fileList[i]?.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                                <button
                                    className="preview-remove-btn"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveOne(i); }}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                                <div className="preview-reference-controls" onClick={(e) => e.stopPropagation()}>
                                    <div className="preview-reference-header">
                                        <div className="preview-reference-title-row">
                                            <strong>Ref #{i + 1}</strong>
                                            {isPrimary && <span className="preview-primary-badge">Primary</span>}
                                        </div>
                                        <span>{Math.round(reference.influence)}%</span>
                                    </div>
                                    <select
                                        className="option-select option-select--compact"
                                        value={reference.role}
                                        onChange={(e) => handleReferenceChange(i, { role: e.target.value })}
                                    >
                                        {IMAGE_REFERENCE_ROLES.map((role) => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="range"
                                        min={1}
                                        max={100}
                                        step={1}
                                        value={Math.round(reference.influence)}
                                        onChange={(e) => handleReferenceChange(i, { influence: parseInt(e.target.value, 10) })}
                                    />
                                    <div className="preview-reference-order-actions">
                                        <button
                                            type="button"
                                            className="btn btn--outline btn--sm"
                                            onClick={() => handleMoveImage(i, -1)}
                                            disabled={i === 0}
                                            title="Move up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn--outline btn--sm"
                                            onClick={() => handleMoveImage(i, 1)}
                                            disabled={i === fileList.length - 1}
                                            title="Move down"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                    <div className="preview-actions">
                        {fileList.length < MAX_IMAGES && (
                            <button
                                className="btn btn--outline btn--sm"
                                onClick={() => inputRef.current?.click()}
                            >
                                {t('uploadAddMore')} ({fileList.length}/{MAX_IMAGES})
                            </button>
                        )}
                        <button className="btn btn--danger btn--sm" onClick={handleClearAll}>
                            {t('uploadClearAll')}
                        </button>
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        multiple
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                    />
                </div>
            )}
        </div>
    );
}
