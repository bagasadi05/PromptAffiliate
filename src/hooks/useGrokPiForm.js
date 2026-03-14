import { useState, useEffect, useCallback, useMemo } from 'react';
import { getItem, setItem, KEYS } from '../utils/localStorage';
import { saveBlob, getBlob, deleteBlob } from '../utils/idbStorage';
import { compressImage } from '../utils/imageCompression';
import { showToast } from '../lib/toastBus';
import { useI18n } from '../hooks/useI18n';

const ALLOWED_DURATIONS = [6, 10];
const MAX_VIDEO_RETRIES = 2;
const AUTOMATION_STORAGE_KEY = KEYS.GROKPI_AUTOMATION_STATE;

export const DEFAULT_FORM = {
    sceneCount: 4,
    titleCount: 3,
    titleTone: 'viral',
    renderVideo: true,
    targetDuration: 6,
    aspectRatio: 'auto',
    resolution: '720p',
    motionStyle: 'fluid, natural, cinematic motion with precise physics',
    customInstructions: '',
    subjectDescription: '',
    titleCustomInstructions: '',
    productFocus: 'hijab',
    productFocusCustom: '',
    allowTextOverlay: false,
    stopOnError: false,
    maxRetries: MAX_VIDEO_RETRIES,
    allowPromptOnlyFallback: false,
};

export function useGrokPiForm(presets, initialPreset, initialPromptOptions) {
    const { t } = useI18n();
    const [form, setForm] = useState(() => ({
        ...DEFAULT_FORM,
        sceneCount: Number(initialPromptOptions?.sceneCount) || DEFAULT_FORM.sceneCount,
        targetDuration: ALLOWED_DURATIONS.includes(Number(initialPromptOptions?.targetDuration))
            ? Number(initialPromptOptions?.targetDuration)
            : DEFAULT_FORM.targetDuration,
        customInstructions: initialPromptOptions?.customInstructions || DEFAULT_FORM.customInstructions,
        subjectDescription: initialPromptOptions?.subjectDescription || DEFAULT_FORM.subjectDescription,
        aspectRatio: initialPromptOptions?.aspectRatio || DEFAULT_FORM.aspectRatio,
    }));

    const [selectedPresetId, setSelectedPresetId] = useState(() => initialPreset?.id || presets[0]?.id || '');

    // We keep the File blob in memory for sending via FormData later
    const [referenceImageBlob, setReferenceImageBlob] = useState(null);
    const [referenceImageMimeType, setReferenceImageMimeType] = useState('image/jpeg');
    const [imagePreview, setImagePreview] = useState('');
    const [imageName, setImageName] = useState('');

    const [isReady, setIsReady] = useState(false);

    // Derive preset and product focus.
    const effectiveSelectedPresetId = useMemo(() => {
        if (!presets.length) return '';
        if (presets.some((item) => item.id === selectedPresetId)) {
            return selectedPresetId;
        }
        return initialPreset?.id || presets[0]?.id || '';
    }, [presets, selectedPresetId, initialPreset]);

    const selectedPreset = useMemo(
        () => presets.find((item) => item.id === effectiveSelectedPresetId) || null,
        [presets, effectiveSelectedPresetId]
    );
    const resolvedProductFocus = useMemo(() => {
        if (form.productFocus === 'lainnya') return String(form.productFocusCustom || '').trim();
        return String(form.productFocus || '').trim();
    }, [form.productFocus, form.productFocusCustom]);
    const normalizedAspectRatio = form.aspectRatio === 'auto' ? undefined : form.aspectRatio;

    // Load from Storage
    useEffect(() => {
        let mounted = true;
        const loadSavedState = async () => {
            // 1. Load LocalStorage configs
            const saved = getItem(AUTOMATION_STORAGE_KEY, null);
            if (saved && typeof saved === 'object') {
                if (saved.form && typeof saved.form === 'object') {
                    setForm((prev) => ({ ...prev, ...saved.form }));
                }
                if (typeof saved.selectedPresetId === 'string') setSelectedPresetId(saved.selectedPresetId);
                if (typeof saved.referenceImageMimeType === 'string') setReferenceImageMimeType(saved.referenceImageMimeType);
                if (typeof saved.imageName === 'string') setImageName(saved.imageName);
            }

            // 2. Load Blob from IndexedDB
            try {
                const cachedBlob = await getBlob('referenceImageBlob');
                if (mounted && cachedBlob instanceof Blob) {
                    setReferenceImageBlob(cachedBlob);
                    setImagePreview(URL.createObjectURL(cachedBlob));
                }
            } catch (err) {
                console.warn('Failed to load image blob from IndexedDB', err);
            }

            if (mounted) setIsReady(true);
        };

        loadSavedState();

        return () => {
            mounted = false;
        };
    }, []);

    // Sync to Storage (excluding heavy blobs from localStorage)
    useEffect(() => {
        if (!isReady) return;
        setItem(AUTOMATION_STORAGE_KEY, {
            form,
            selectedPresetId: effectiveSelectedPresetId,
            referenceImageMimeType,
            imageName,
            updatedAt: Date.now(),
        });
    }, [form, effectiveSelectedPresetId, referenceImageMimeType, imageName, isReady]);

    // Cleanup Object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const setField = useCallback((key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSelectImage = async (file) => {
        if (!file) return;
        const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!acceptedTypes.includes(file.type)) {
            showToast(t('uploadFormatError'), 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast(t('uploadSizeError'), 'error');
            return;
        }

        let processed = file;
        try {
            const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.86 });
            processed = compressed.file;
        } catch {
            processed = file;
        }

        if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }

        const objectUrl = URL.createObjectURL(processed);
        setReferenceImageBlob(processed);
        setReferenceImageMimeType(processed.type || 'image/jpeg');
        setImagePreview(objectUrl);
        setImageName(processed.name || 'reference-image');

        // Save to IDB
        await saveBlob('referenceImageBlob', processed);
    };

    const handleClearImage = async () => {
        if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setReferenceImageBlob(null);
        setReferenceImageMimeType('image/jpeg');
        setImagePreview('');
        setImageName('');

        await deleteBlob('referenceImageBlob');
    };

    return {
        form,
        setField,
        selectedPresetId: effectiveSelectedPresetId,
        setSelectedPresetId,
        selectedPreset,
        resolvedProductFocus,
        normalizedAspectRatio,
        referenceImageBlob,
        referenceImageMimeType,
        imagePreview,
        imageName,
        handleSelectImage,
        handleClearImage,
        isReady,
    };
}
