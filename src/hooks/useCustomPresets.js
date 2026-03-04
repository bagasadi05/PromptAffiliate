import { useState, useCallback, useEffect } from 'react';
import { getItem, setItem, KEYS } from '../utils/localStorage';
import { showToast } from '../lib/toastBus';

export default function useCustomPresets({ lang, t, setSelectedPreset }) {
    const [customPresets, setCustomPresets] = useState(() => getItem(KEYS.CUSTOM_PRESETS, []));
    const [isCustomPresetOpen, setIsCustomPresetOpen] = useState(false);
    const [customPresetModalKey, setCustomPresetModalKey] = useState(0);
    const [editingCustomPreset, setEditingCustomPreset] = useState(null);
    const [confirmDeletePresetId, setConfirmDeletePresetId] = useState(null);

    useEffect(() => {
        setItem(KEYS.CUSTOM_PRESETS, customPresets);
    }, [customPresets]);

    const handleSaveCustomPreset = useCallback((presetData) => {
        setCustomPresets(prev => {
            const existingIdx = prev.findIndex(p => p.id === presetData.id);
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = presetData;
                showToast(t('customPresetUpdated'), 'success');
                return updated;
            }
            showToast(t('customPresetSaved'), 'success');
            return [...prev, presetData];
        });
        setIsCustomPresetOpen(false);
        setEditingCustomPreset(null);
    }, [t]);

    const handleCreateCustomPreset = useCallback(() => {
        setEditingCustomPreset(null);
        setCustomPresetModalKey((prev) => prev + 1);
        setIsCustomPresetOpen(true);
    }, []);

    const handleEditCustomPreset = useCallback((presetId) => {
        const preset = customPresets.find((item) => item.id === presetId);
        if (!preset) return;
        setEditingCustomPreset(preset);
        setCustomPresetModalKey((prev) => prev + 1);
        setIsCustomPresetOpen(true);
    }, [customPresets]);

    const handleDuplicateCustomPreset = useCallback((presetId) => {
        const sourcePreset = customPresets.find((item) => item.id === presetId);
        if (!sourcePreset) return;

        const duplicateSuffix = lang === 'ID' ? '(Salinan)' : '(Copy)';
        const duplicatedPreset = {
            ...sourcePreset,
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: `${sourcePreset.name} ${duplicateSuffix}`,
            isCustom: true,
        };

        setCustomPresets((prev) => [duplicatedPreset, ...prev]);
        setSelectedPreset(duplicatedPreset);
        showToast(t('customPresetDuplicated'), 'success');
    }, [customPresets, lang, t, setSelectedPreset]);

    const handleDeleteCustomPreset = useCallback((presetId) => {
        setConfirmDeletePresetId(presetId);
    }, []);

    const handleConfirmDeletePreset = useCallback(() => {
        if (!confirmDeletePresetId) return;
        setCustomPresets(prev => prev.filter(p => p.id !== confirmDeletePresetId));
        setSelectedPreset(prev => prev?.id === confirmDeletePresetId ? null : prev);
        showToast(t('customPresetDeleted'), 'success');
        setConfirmDeletePresetId(null);
    }, [confirmDeletePresetId, setSelectedPreset, t]);

    const handleCancelDeletePreset = useCallback(() => {
        setConfirmDeletePresetId(null);
    }, []);

    return {
        customPresets,
        isCustomPresetOpen, setIsCustomPresetOpen,
        customPresetModalKey,
        editingCustomPreset, setEditingCustomPreset,
        confirmDeletePresetId,
        handleSaveCustomPreset,
        handleCreateCustomPreset,
        handleEditCustomPreset,
        handleDuplicateCustomPreset,
        handleDeleteCustomPreset,
        handleConfirmDeletePreset,
        handleCancelDeletePreset,
    };
}
