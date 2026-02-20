import { useState } from 'react';
import { useI18n } from '../hooks/useI18n';

const CATEGORIES = ['Dance', 'Fashion', 'Aesthetic', 'Fitness', 'Retro', 'Alternative', 'Viral', 'Selling', 'Custom'];
const ENERGY_LEVELS = ['Low', 'Low-Medium', 'Medium', 'Medium-High', 'High', 'Very High'];
const DEFAULT_COLORS = ['#FF6B9D', '#7B68EE', '#FF3366', '#FFB6C1', '#FF4500', '#E040FB', '#FF8C00', '#98D8C8', '#00C853', '#FF69B4', '#4A0E4E', '#FFD700', '#1DB954', '#818CF8', '#06B6D4', '#EF4444'];

function createInitialForm(editPreset) {
    return editPreset || {
        name: '',
        vibe: '',
        category: 'Custom',
        bpmRange: '100–120',
        energyLevel: 'Medium',
        cameraStyle: 'Dynamic handheld',
        signatureMoves: ['', '', '', ''],
        notes: '',
        emoji: '🎵',
        color: '#a855f7',
    };
}

export default function CustomPresetModal({ isOpen, onClose, onSave, editPreset }) {
    const { t } = useI18n();
    const [form, setForm] = useState(() => createInitialForm(editPreset));
    const isEditing = Boolean(editPreset);

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleMoveChange = (index, value) => {
        setForm(prev => {
            const moves = [...prev.signatureMoves];
            moves[index] = value;
            return { ...prev, signatureMoves: moves };
        });
    };

    const addMove = () => {
        setForm(prev => ({ ...prev, signatureMoves: [...prev.signatureMoves, ''] }));
    };

    const removeMove = (index) => {
        setForm(prev => ({
            ...prev,
            signatureMoves: prev.signatureMoves.filter((_, i) => i !== index)
        }));
    };

    const handleSave = () => {
        if (!form.name.trim() || !form.vibe.trim()) return;

        const preset = {
            ...form,
            id: editPreset?.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            isCustom: true,
            signatureMoves: form.signatureMoves.filter(m => m.trim()),
        };

        onSave(preset);
        setForm(createInitialForm(editPreset));
        onClose();
    };

    const handleClose = () => {
        setForm(createInitialForm(editPreset));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="modal custom-preset-modal">
                <div className="modal-header">
                    <h2>{isEditing ? t('customPresetTitleEdit') : t('customPresetTitle')}</h2>
                    <button className="btn--icon" onClick={handleClose}>✕</button>
                </div>

                <div className="modal-body">
                    {/* Name + Emoji */}
                    <div className="form-row">
                        <div className="form-group form-group--grow">
                            <label className="form-label">{t('customPresetName')} *</label>
                            <input
                                type="text"
                                className="settings-input"
                                placeholder="e.g. My Dance Style"
                                value={form.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ width: 80 }}>
                            <label className="form-label">{t('customPresetEmoji')}</label>
                            <input
                                type="text"
                                className="settings-input"
                                value={form.emoji}
                                onChange={(e) => handleChange('emoji', e.target.value.slice(0, 2))}
                                style={{ textAlign: 'center', fontSize: '1.3rem' }}
                            />
                        </div>
                    </div>

                    {/* Vibe */}
                    <div className="form-group">
                        <label className="form-label">{t('customPresetVibe')} *</label>
                        <input
                            type="text"
                            className="settings-input"
                            placeholder="e.g. Energetic, fun, party vibes"
                            value={form.vibe}
                            onChange={(e) => handleChange('vibe', e.target.value)}
                        />
                    </div>

                    {/* Category + Energy + BPM */}
                    <div className="form-row form-row--3">
                        <div className="form-group">
                            <label className="form-label">{t('customPresetCategory')}</label>
                            <select
                                className="option-select"
                                value={form.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('customPresetEnergy')}</label>
                            <select
                                className="option-select"
                                value={form.energyLevel}
                                onChange={(e) => handleChange('energyLevel', e.target.value)}
                            >
                                {ENERGY_LEVELS.map(e => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('customPresetBpm')}</label>
                            <input
                                type="text"
                                className="settings-input"
                                placeholder="e.g. 100–120"
                                value={form.bpmRange}
                                onChange={(e) => handleChange('bpmRange', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Color selector */}
                    <div className="form-group">
                        <label className="form-label">{t('customPresetColor')}</label>
                        <div className="color-picker-row">
                            {DEFAULT_COLORS.map(c => (
                                <button
                                    key={c}
                                    className={`color-swatch ${form.color === c ? 'color-swatch--active' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => handleChange('color', c)}
                                />
                            ))}
                            <input
                                type="color"
                                value={form.color}
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="color-input"
                            />
                        </div>
                    </div>

                    {/* Signature Moves */}
                    <div className="form-group">
                        <label className="form-label">{t('customPresetMoves')}</label>
                        {form.signatureMoves.map((move, i) => (
                            <div key={i} className="move-input-row">
                                <span className="move-input-num">{i + 1}</span>
                                <input
                                    type="text"
                                    className="settings-input"
                                    placeholder={`Move ${i + 1}...`}
                                    value={move}
                                    onChange={(e) => handleMoveChange(i, e.target.value)}
                                />
                                {form.signatureMoves.length > 2 && (
                                    <button className="btn--icon btn--icon-sm" onClick={() => removeMove(i)}>✕</button>
                                )}
                            </div>
                        ))}
                        {form.signatureMoves.length < 8 && (
                            <button className="btn btn--outline btn--sm" onClick={addMove} style={{ marginTop: 4 }}>
                                + Add Move
                            </button>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label className="form-label">{t('customPresetNotes')}</label>
                        <textarea
                            className="option-textarea"
                            placeholder="Tips for best results..."
                            value={form.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn--secondary" onClick={handleClose}>{t('customPresetCancel')}</button>
                    <button
                        className="btn btn--primary"
                        onClick={handleSave}
                        disabled={!form.name.trim() || !form.vibe.trim()}
                    >
                        {isEditing ? t('customPresetUpdate') : t('customPresetSave')}
                    </button>
                </div>
            </div>
        </div>
    );
}
