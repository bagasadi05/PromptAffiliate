import { useState, useMemo } from 'react';
import { useI18n } from '../hooks/useI18n';

export default function PresetSelector({
    presets,
    selectedPreset,
    onSelect,
    onCreateCustom,
    onEditCustom,
    onDuplicateCustom,
    onDeleteCustom,
}) {
    const { t } = useI18n();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [showDetail, setShowDetail] = useState(false);

    // Derive unique categories from presets
    const categories = useMemo(() => {
        const cats = [...new Set(presets.map(p => p.category).filter(Boolean))];
        return ['All', ...cats];
    }, [presets]);

    const filteredPresets = useMemo(() => {
        let result = presets;

        // Filter by category
        if (activeCategory !== 'All') {
            result = result.filter(p => p.category === activeCategory);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((preset) => {
                const searchFields = [
                    preset.name,
                    preset.vibe,
                    preset.category,
                    preset.energyLevel,
                    preset.cameraStyle,
                    preset.notes,
                    preset.wardrobe,
                    ...(Array.isArray(preset.signatureMoves) ? preset.signatureMoves : []),
                    ...(Array.isArray(preset.moodKeywords) ? preset.moodKeywords : []),
                ];

                return searchFields
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(q));
            });
        }

        return result;
    }, [presets, searchQuery, activeCategory]);

    const isSelectedVisible = selectedPreset
        ? filteredPresets.some((preset) => preset.id === selectedPreset.id)
        : false;

    return (
        <div className="preset-selector">
            <div className="panel-header">
                <h2>{t('presetTitle')}</h2>
                <span className="panel-badge">{t('step2')}</span>
            </div>

            <div className="preset-search">
                <div className="search-input-wrapper">
                    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder={t('presetSearch')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery('')} title={t('clearSearch')}>✕</button>
                    )}
                </div>
                <span className="preset-count">{filteredPresets.length} {t('presetCount')}</span>
            </div>

            {/* Category Filter Chips */}
            <div className="category-chips">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`category-chip ${activeCategory === cat ? 'category-chip--active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="preset-grid">
                {/* Create Custom Preset button */}
                {onCreateCustom && (
                    <button
                        className="preset-card preset-card--custom-add"
                        onClick={onCreateCustom}
                        style={{ '--preset-color': '#a855f7' }}
                    >
                        <div className="preset-card__emoji">➕</div>
                        <div className="preset-card__info">
                            <h3 className="preset-card__name">{t('presetCustom')}</h3>
                            <p className="preset-card__vibe">{t('presetCustomDesc')}</p>
                        </div>
                    </button>
                )}
                {filteredPresets.map(preset => (
                    <button
                        key={preset.id}
                        className={`preset-card ${selectedPreset?.id === preset.id ? 'preset-card--selected' : ''}`}
                        onClick={() => {
                            onSelect(preset);
                            setShowDetail(true);
                        }}
                        style={{ '--preset-color': preset.color }}
                    >
                        <div className="preset-card__emoji">{preset.emoji}</div>
                        <div className="preset-card__info">
                            <h3 className="preset-card__name">{preset.name}</h3>
                            <p className="preset-card__vibe">{preset.vibe}</p>
                        </div>
                        <div className="preset-card__meta">
                            <span className="meta-badge">{preset.energyLevel}</span>
                            <span className="meta-badge">{preset.bpmRange} BPM</span>
                        </div>
                        {selectedPreset?.id === preset.id && (
                            <div className="preset-card__check">✓</div>
                        )}
                        {preset.isCustom && (
                            <div className="preset-card__actions">
                                {onEditCustom && (
                                    <button
                                        className="preset-card__action-btn preset-card__action-btn--edit"
                                        onClick={(e) => { e.stopPropagation(); onEditCustom(preset.id); }}
                                        title={t('presetActionEdit')}
                                    >
                                        ✏️
                                    </button>
                                )}
                                {onDuplicateCustom && (
                                    <button
                                        className="preset-card__action-btn preset-card__action-btn--duplicate"
                                        onClick={(e) => { e.stopPropagation(); onDuplicateCustom(preset.id); }}
                                        title={t('presetActionDuplicate')}
                                    >
                                        ⧉
                                    </button>
                                )}
                                {onDeleteCustom && (
                                    <button
                                        className="preset-card__action-btn preset-card__action-btn--delete"
                                        onClick={(e) => { e.stopPropagation(); onDeleteCustom(preset.id); }}
                                        title={t('presetActionDelete')}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        )}
                    </button>
                ))}
                {filteredPresets.length === 0 && (
                    <div className="preset-empty">
                        <p>{t('presetEmpty')} "{searchQuery}"</p>
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selectedPreset && showDetail && isSelectedVisible && (
                <div className="preset-detail">
                    <div className="preset-detail__header">
                        <div className="preset-detail__title">
                            <span className="preset-detail__emoji">{selectedPreset.emoji}</span>
                            <h3>{selectedPreset.name}</h3>
                        </div>
                        <button className="btn--icon" onClick={() => setShowDetail(false)}>✕</button>
                    </div>
                    <div className="preset-detail__body">
                        <div className="detail-row">
                            <span className="detail-label">{t('presetDetailVibe')}</span>
                            <span className="detail-value">{selectedPreset.vibe}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{t('presetDetailBpm')}</span>
                            <span className="detail-value">{selectedPreset.bpmRange}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{t('presetDetailEnergy')}</span>
                            <span className="detail-value">
                                <span className={`energy-badge energy-${selectedPreset.energyLevel.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {selectedPreset.energyLevel}
                                </span>
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{t('presetDetailCamera')}</span>
                            <span className="detail-value">{selectedPreset.cameraStyle}</span>
                        </div>
                        {selectedPreset.beatStructure && (
                            <div className="detail-row">
                                <span className="detail-label">{t('presetDetailBeat')}</span>
                                <span className="detail-value">{selectedPreset.beatStructure}</span>
                            </div>
                        )}
                        {selectedPreset.transitionStyle && (
                            <div className="detail-row">
                                <span className="detail-label">{t('presetDetailTransition')}</span>
                                <span className="detail-value">{selectedPreset.transitionStyle}</span>
                            </div>
                        )}
                        {selectedPreset.wardrobe && (
                            <div className="detail-row">
                                <span className="detail-label">{t('presetDetailWardrobe')}</span>
                                <span className="detail-value">{selectedPreset.wardrobe}</span>
                            </div>
                        )}
                        {selectedPreset.moodKeywords?.length > 0 && (
                            <div className="detail-row">
                                <span className="detail-label">{t('presetDetailMood')}</span>
                                <span className="detail-value">
                                    {selectedPreset.moodKeywords.map((kw, i) => (
                                        <span key={i} className="meta-badge" style={{ marginRight: '4px', marginBottom: '4px' }}>{kw}</span>
                                    ))}
                                </span>
                            </div>
                        )}
                        <div className="detail-section">
                            <span className="detail-label">{t('presetDetailMoves')}</span>
                            <ul className="moves-list">
                                {selectedPreset.signatureMoves.map((move, i) => (
                                    <li key={i} className="move-item">
                                        <span className="move-number">{i + 1}</span>
                                        {move}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{t('presetDetailNotes')}</span>
                            <span className="detail-value detail-notes">{selectedPreset.notes}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
