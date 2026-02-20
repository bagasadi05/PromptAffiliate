import { useState, useMemo } from 'react';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE } from '../services/gemini';
import { setItem, KEYS } from '../utils/localStorage';
import { useI18n } from '../hooks/useI18n';

import { DEFAULT_OPTIONS } from '../constants/defaultOptions';

const DEFAULTS = DEFAULT_OPTIONS;

const BACKGROUNDS = [
    'keep from reference',
    'simple indoor wall',
    'mirror bathroom selfie',
    'studio clean',
    'urban street',
    'neon club'
];

const LIGHTINGS = [
    'soft daylight',
    'warm indoor',
    'neon night',
    'golden hour',
    'studio ring light',
    'dramatic shadow',
    'cinematic rim',
    'rembrandt',
    'volumetric',
    'product spotlight'
];

const CAMERA_MOVEMENTS = [
    { value: 'auto', label: '🤖 Auto (AI decides)' },
    { value: 'slow-push-in', label: '🎯 Slow Push-In' },
    { value: 'slow-orbit', label: '🔄 Slow Orbit' },
    { value: 'dynamic-tracking', label: '🏃 Dynamic Tracking' },
    { value: 'rack-focus-pull', label: '🔍 Rack Focus Pull' },
    { value: 'crane-jib', label: '🏗️ Crane / Jib' }
];

const MICRO_EXPRESSIONS = [
    { value: 'auto', label: '🤖 Auto' },
    { value: 'satisfaction', label: '😌 Satisfaction' },
    { value: 'curiosity', label: '🤔 Curiosity' },
    { value: 'surprise', label: '😮 Surprise' },
    { value: 'confidence', label: '😎 Confidence' },
    { value: 'calm', label: '😊 Calm' }
];

const RENDER_QUALITIES = [
    { value: '4k', label: '📺 4K Photorealistic' },
    { value: '8k', label: '🖥️ 8K Ultra-Realistic' },
    { value: 'cinematic-raw', label: '🎬 Cinematic RAW' }
];

const OUTPUT_LANGUAGES = [
    { value: 'EN', label: '🇬🇧 English' },
    { value: 'ID', label: '🇮🇩 Indonesia' }
];

const VOICE_CHARACTERS = [
    { value: 'auto', label: '🤖 Auto (sesuai preset)', desc: 'AI otomatis menyesuaikan karakter suara berdasarkan preset yang dipilih' },
    { value: 'cewek-gen-z', label: '💅 Cewek Gen-Z', desc: 'Energik, kasual, playful — "gais, literally worth it banget!"' },
    { value: 'cowok-gen-z', label: '😎 Cowok Gen-Z', desc: 'Chill, confident, casual — "bro, trust me, game changer sih ini"' },
    { value: 'ibu-ibu-smart', label: '🏠 Ibu-Ibu Smart', desc: 'Hangat, praktis, terpercaya — "Bun, ini beneran bagus lho"' },
    { value: 'profesional', label: '👔 Profesional', desc: 'Authoritative, credible, polished — cocok untuk tech/business' },
    { value: 'beauty-guru', label: '✨ Beauty Guru', desc: 'Expert, glowing, aspirational — "teksturnya lightweight banget"' },
    { value: 'reviewer-jujur', label: '⭐ Reviewer Jujur', desc: 'Honest, balanced — "jujur ya, minusnya sih... tapi overall worth it"' },
    { value: 'hype-man', label: '🔥 Hype Man', desc: 'High-energy, FOMO — "BURUAN! stok tinggal dikit!"' },
    { value: 'storyteller', label: '📖 Storyteller', desc: 'Naratif, emosional — "Awalnya aku skeptis, sampai akhirnya..."' },
    { value: 'asmr-soft', label: '🎧 ASMR / Soft Voice', desc: 'Whispery, gentle, intimate — "dengar suara ini... rasain teksturnya"' },
    { value: 'custom', label: '✍️ Custom', desc: 'Tulis deskripsi karakter suara sendiri' },
];

export default function AdvancedOptions({ options, onChange }) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);

    const VOICE_STYLES = useMemo(() => ([
        { value: 'none', label: t('voiceStyleNoneLabel'), desc: t('voiceStyleNoneDesc') },
        { value: 'talking', label: t('voiceStyleTalkingLabel'), desc: t('voiceStyleTalkingDesc') },
        { value: 'voiceover', label: t('voiceStyleVoiceoverLabel'), desc: t('voiceStyleVoiceoverDesc') },
        { value: 'lipsync', label: t('voiceStyleLipsyncLabel'), desc: t('voiceStyleLipsyncDesc') }
    ]), [t]);

    const currentOptions = { ...DEFAULTS, ...options };

    const handleChange = (key, value) => {
        onChange({ ...currentOptions, [key]: value });
    };

    const handleBatchChange = (updates) => {
        onChange({ ...currentOptions, ...updates });
    };

    return (
        <div className={`advanced-options ${isOpen ? 'advanced-options--open' : ''}`}>
            <button
                type="button"
                className="advanced-options__toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="toggle-icon">{isOpen ? '▾' : '▸'}</span>
                <span>{t('advancedTitle')}</span>
                <span className="toggle-hint">{isOpen ? t('advancedClose') : t('advancedOpen')}</span>
            </button>

            {isOpen && (
                <div className="advanced-options__body">
                    {/* Subject Description (Identity Lock) */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('advancedSubjectLabel')}
                        </label>
                        <textarea
                            className="option-textarea"
                            placeholder={t('advancedSubjectPlaceholder')}
                            value={currentOptions.subjectDescription}
                            onChange={(e) => handleChange('subjectDescription', e.target.value)}
                            rows={2}
                        />
                        <span className="option-hint">
                            {t('advancedSubjectHint')}
                        </span>
                    </div>

                    {/* Creativity (Temperature) */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('advancedCreativityLabel')} ({currentOptions.creativity}%)
                        </label>
                        <div className="scene-count-control">
                            <input
                                type="range"
                                className="option-range"
                                min={0}
                                max={100}
                                step={5}
                                value={currentOptions.creativity}
                                onChange={(e) => handleChange('creativity', parseInt(e.target.value, 10))}
                            />
                            <div className="range-labels">
                                <span>{t('advancedCreativityPrecise')}</span>
                                <span>{t('advancedCreativityBalanced')}</span>
                                <span>{t('advancedCreativityCreative')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Realism Level */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('realismLabel')}
                        </label>
                        <div className="option-toggle-group option-toggle-group--3">
                            {['Low', 'Med', 'High'].map(level => (
                                <button
                                    type="button"
                                    key={level}
                                    className={`option-toggle ${currentOptions.realismLevel === level ? 'option-toggle--active' : ''}`}
                                    onClick={() => handleChange('realismLevel', level)}
                                >
                                    {level === 'Low' && '🎭 Stylized'}
                                    {level === 'Med' && '⚖️ Balanced'}
                                    {level === 'High' && '📷 Realistic'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Camera Distance */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('cameraLabel')}
                        </label>
                        <select
                            className="option-select"
                            value={currentOptions.cameraDistance}
                            onChange={(e) => handleChange('cameraDistance', e.target.value)}
                        >
                            <option value="extreme close">🔬 Extreme Close-up</option>
                            <option value="close">🔍 Close-up</option>
                            <option value="medium">👤 Medium Shot</option>
                            <option value="wide">🏞️ Wide Shot</option>
                            <option value="full-body">🧍 Full Body</option>
                        </select>
                    </div>

                    {/* Background */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('bgLabel')}
                        </label>
                        <select
                            className="option-select"
                            value={currentOptions.background}
                            onChange={(e) => handleChange('background', e.target.value)}
                        >
                            {BACKGROUNDS.map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                            ))}
                        </select>
                    </div>

                    {/* Lighting */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('lightLabel')}
                        </label>
                        <select
                            className="option-select"
                            value={currentOptions.lighting}
                            onChange={(e) => handleChange('lighting', e.target.value)}
                        >
                            {LIGHTINGS.map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                    </div>

                    {/* Scene Count */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('sceneLabel')} ({currentOptions.sceneCount} {t('sceneUnit')} {currentOptions.sceneCount * 6} {t('sceneUnitEnd')})
                        </label>
                        <div className="scene-count-control">
                            <input
                                type="range"
                                className="option-range"
                                min={2}
                                max={8}
                                step={1}
                                value={currentOptions.sceneCount}
                                onChange={(e) => handleChange('sceneCount', parseInt(e.target.value, 10))}
                            />
                            <div className="range-labels">
                                <span>2</span>
                                <span>4</span>
                                <span>6</span>
                                <span>8</span>
                            </div>
                        </div>
                    </div>

                    {/* Output Language */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('outputLanguageLabel')}
                        </label>
                        <div className="option-toggle-group">
                            {OUTPUT_LANGUAGES.map(lang => (
                                <button
                                    type="button"
                                    key={lang.value}
                                    className={`option-toggle ${currentOptions.outputLanguage === lang.value ? 'option-toggle--active' : ''}`}
                                    onClick={() => handleChange('outputLanguage', lang.value)}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Voice Style */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('voiceLabel')}
                        </label>
                        <select
                            className="option-select"
                            value={currentOptions.voiceStyle}
                            onChange={(e) => handleChange('voiceStyle', e.target.value)}
                        >
                            {VOICE_STYLES.map(v => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                        </select>
                        <span className="option-hint">
                            {VOICE_STYLES.find(v => v.value === currentOptions.voiceStyle)?.desc}
                        </span>
                    </div>

                    {/* Voice Character (only if voice is enabled) */}
                    {currentOptions.voiceStyle !== 'none' && (
                        <div className="option-group">
                            <label className="option-label">
                                {t('voiceCharacterLabel')}
                            </label>
                            <select
                                className="option-select"
                                value={currentOptions.voiceCharacter}
                                onChange={(e) => handleChange('voiceCharacter', e.target.value)}
                            >
                                {VOICE_CHARACTERS.map(vc => (
                                    <option key={vc.value} value={vc.value}>{vc.label}</option>
                                ))}
                            </select>
                            <span className="option-hint">
                                {VOICE_CHARACTERS.find(vc => vc.value === currentOptions.voiceCharacter)?.desc || t('voiceCharacterHint')}
                            </span>
                        </div>
                    )}

                    {/* Custom Voice Character Textarea (only if custom is selected) */}
                    {currentOptions.voiceStyle !== 'none' && currentOptions.voiceCharacter === 'custom' && (
                        <div className="option-group">
                            <label className="option-label">
                                ✍️ Deskripsi Karakter Suara
                            </label>
                            <textarea
                                className="option-textarea"
                                placeholder="Contoh: 'Kakak cantik yang lembut dan sabar, bicara pelan tapi meyakinkan, seperti beauty advisor di counter mall'"
                                value={currentOptions.customVoiceCharacter || ''}
                                onChange={(e) => handleChange('customVoiceCharacter', e.target.value)}
                                rows={2}
                            />
                        </div>
                    )}

                    {/* Voice Language (only if voice is enabled) */}
                    {currentOptions.voiceStyle !== 'none' && (
                        <div className="option-group">
                            <label className="option-label">
                                {t('voiceLangLabel')}
                            </label>
                            <div className="option-toggle-group">
                                {['ID', 'EN'].map(lang => (
                                    <button
                                        type="button"
                                        key={lang}
                                        className={`option-toggle ${currentOptions.voiceLanguage === lang ? 'option-toggle--active' : ''}`}
                                        onClick={() => handleChange('voiceLanguage', lang)}
                                    >
                                        {lang === 'ID' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Voice Script Mode (only if voice is enabled) */}
                    {currentOptions.voiceStyle !== 'none' && (
                        <div className="option-group">
                            <label className="option-label">
                                {t('voiceScriptModeLabel')}
                            </label>
                            <div className="option-toggle-group">
                                <button
                                    type="button"
                                    className={`option-toggle ${currentOptions.voiceScriptMode === 'ai' ? 'option-toggle--active' : ''}`}
                                    onClick={() => handleBatchChange({ voiceScriptMode: 'ai', voiceScript: '' })}
                                >
                                    {t('voiceScriptAi')}
                                </button>
                                <button
                                    type="button"
                                    className={`option-toggle ${currentOptions.voiceScriptMode === 'manual' ? 'option-toggle--active' : ''}`}
                                    onClick={() => handleChange('voiceScriptMode', 'manual')}
                                >
                                    {t('voiceScriptManual')}
                                </button>
                            </div>
                            <span className="option-hint">
                                {currentOptions.voiceScriptMode === 'ai'
                                    ? t('voiceScriptAiHint')
                                    : t('voiceScriptManualHint')}
                            </span>
                        </div>
                    )}

                    {/* Voice Script Textarea (only if manual mode) */}
                    {currentOptions.voiceStyle !== 'none' && currentOptions.voiceScriptMode === 'manual' && (
                        <div className="option-group">
                            <label className="option-label">
                                {t('voiceScriptManualLabel')}
                            </label>
                            <textarea
                                className="option-textarea"
                                placeholder={currentOptions.voiceStyle === 'talking'
                                    ? t('voiceScriptTalkingPlaceholder')
                                    : currentOptions.voiceStyle === 'voiceover'
                                        ? t('voiceScriptVoiceoverPlaceholder')
                                        : t('voiceScriptLipsyncPlaceholder')}
                                value={currentOptions.voiceScript}
                                onChange={(e) => handleChange('voiceScript', e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}

                    {/* Negative Prompt Toggle */}
                    <div className="option-group option-group--inline">
                        <label className="option-label">
                            {t('negativeLabel')}
                        </label>
                        <button
                            type="button"
                            className={`option-switch ${currentOptions.includeNegativePrompt ? 'option-switch--on' : ''}`}
                            onClick={() => handleChange('includeNegativePrompt', !currentOptions.includeNegativePrompt)}
                        >
                            <span className="switch-thumb" />
                            <span className="switch-label">
                                {currentOptions.includeNegativePrompt ? t('switchOn') : t('switchOff')}
                            </span>
                        </button>
                    </div>

                    {/* ═══ CINEMATIC PRODUCT HOOK (Pro-Level) ═══ */}
                    <div className="option-group option-group--section">
                        <div className="option-section-header">
                            <span className="option-section-icon">🎬</span>
                            <span className="option-section-title">Cinematic Product Hook</span>
                            <span className="option-section-badge">PRO</span>
                        </div>
                        <p className="option-section-desc">
                            Formula penyutradaraan AI Video untuk konversi tinggi & retensi penonton. Optimized untuk Shopee Video / TikTok.
                        </p>
                    </div>

                    {/* Cinematic Mode Toggle */}
                    <div className="option-group option-group--inline">
                        <label className="option-label">
                            🎬 Cinematic Mode
                        </label>
                        <button
                            type="button"
                            className={`option-switch ${currentOptions.cinematicMode ? 'option-switch--on' : ''}`}
                            onClick={() => handleChange('cinematicMode', !currentOptions.cinematicMode)}
                        >
                            <span className="switch-thumb" />
                            <span className="switch-label">
                                {currentOptions.cinematicMode ? t('switchOn') : t('switchOff')}
                            </span>
                        </button>
                    </div>

                    {/* Cinematic Sub-options (only visible when cinematicMode is on) */}
                    {currentOptions.cinematicMode && (
                        <>
                            {/* Camera Movement */}
                            <div className="option-group">
                                <label className="option-label">
                                    📹 Camera Movement (Visual Hook)
                                </label>
                                <select
                                    className="option-select"
                                    value={currentOptions.cameraMovement}
                                    onChange={(e) => handleChange('cameraMovement', e.target.value)}
                                >
                                    {CAMERA_MOVEMENTS.map(cm => (
                                        <option key={cm.value} value={cm.value}>{cm.label}</option>
                                    ))}
                                </select>
                                <span className="option-hint">
                                    Pergerakan kamera mendekat (push-in) atau berputar lambat (orbit) meningkatkan fokus audiens pada 3 detik pertama.
                                </span>
                            </div>

                            {/* Micro-Expressions */}
                            <div className="option-group">
                                <label className="option-label">
                                    🎭 Micro-Expressions (Human Element)
                                </label>
                                <select
                                    className="option-select"
                                    value={currentOptions.microExpressions}
                                    onChange={(e) => handleChange('microExpressions', e.target.value)}
                                >
                                    {MICRO_EXPRESSIONS.map(me => (
                                        <option key={me.value} value={me.value}>{me.label}</option>
                                    ))}
                                </select>
                                <span className="option-hint">
                                    Ekspresi mikro memicu mirror empathy pada penonton — lebih kuat dari sekadar "tersenyum".
                                </span>
                            </div>

                            {/* Product Interaction */}
                            <div className="option-group">
                                <label className="option-label">
                                    🛍️ Product Interaction (Selling Point)
                                </label>
                                <textarea
                                    className="option-textarea"
                                    placeholder="e.g. Fingers gently gliding over the matte texture of the product, examining the metallic finish under warm light..."
                                    value={currentOptions.productInteraction}
                                    onChange={(e) => handleChange('productInteraction', e.target.value)}
                                    rows={2}
                                />
                                <span className="option-hint">
                                    Fokuskan pada tekstur & cara produk berinteraksi dengan cahaya/lingkungan. Kosongkan untuk auto.
                                </span>
                            </div>

                            {/* Render Quality */}
                            <div className="option-group">
                                <label className="option-label">
                                    ✨ Render Quality (Realism Factor)
                                </label>
                                <div className="option-toggle-group option-toggle-group--3">
                                    {RENDER_QUALITIES.map(rq => (
                                        <button
                                            type="button"
                                            key={rq.value}
                                            className={`option-toggle ${currentOptions.renderQuality === rq.value ? 'option-toggle--active' : ''}`}
                                            onClick={() => handleChange('renderQuality', rq.value)}
                                        >
                                            {rq.label}
                                        </button>
                                    ))}
                                </div>
                                <span className="option-hint">
                                    Paksa AI untuk render detail tertinggi: skin pores, fabric physics, subsurface scattering.
                                </span>
                            </div>
                        </>
                    )}

                    {/* Aspect Ratio */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('aspectLabel')}
                        </label>
                        <div className="option-toggle-group option-toggle-group--3">
                            {[
                                { value: '9:16', label: '📱 9:16 TikTok' },
                                { value: '1:1', label: '⬜ 1:1 Square' },
                                { value: '16:9', label: '🖥️ 16:9 Wide' }
                            ].map(ar => (
                                <button
                                    type="button"
                                    key={ar.value}
                                    className={`option-toggle ${currentOptions.aspectRatio === ar.value ? 'option-toggle--active' : ''}`}
                                    onClick={() => handleChange('aspectRatio', ar.value)}
                                >
                                    {ar.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Duration */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('durationLabel')}
                        </label>
                        <div className="option-toggle-group option-toggle-group--4">
                            {[
                                { value: null, label: 'Auto' },
                                { value: 15, label: '15s' },
                                { value: 30, label: '30s' },
                                { value: 60, label: '60s' }
                            ].map(d => (
                                <button
                                    type="button"
                                    key={String(d.value)}
                                    className={`option-toggle ${currentOptions.targetDuration === d.value ? 'option-toggle--active' : ''}`}
                                    onClick={() => {
                                        if (d.value) {
                                            const autoScenes = Math.min(8, Math.max(2, Math.round(d.value / 6)));
                                            handleBatchChange({ targetDuration: d.value, sceneCount: autoScenes });
                                        } else {
                                            handleChange('targetDuration', d.value);
                                        }
                                    }}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* System Prompt Template */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('templateLabel')}
                        </label>
                        <div className="template-controls">
                            <button
                                type="button"
                                className="btn btn--outline btn--sm"
                                onClick={() => setShowTemplate(!showTemplate)}
                            >
                                {showTemplate ? `🔽 ${t('templateClose')}` : `📝 ${t('templateEdit')}`}
                            </button>
                            {currentOptions.systemPromptTemplate && (
                                <button
                                    type="button"
                                    className="btn btn--danger btn--sm"
                                    onClick={() => {
                                        handleChange('systemPromptTemplate', null);
                                        setItem(KEYS.SYSTEM_PROMPT_TEMPLATE, null);
                                    }}
                                >
                                    🔄 {t('templateReset')}
                                </button>
                            )}
                        </div>
                        {showTemplate && (
                            <textarea
                                className="option-textarea option-textarea--tall"
                                placeholder={t('templatePlaceholder')}
                                value={currentOptions.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT_TEMPLATE}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    handleChange('systemPromptTemplate', val);
                                    setItem(KEYS.SYSTEM_PROMPT_TEMPLATE, val);
                                }}
                                rows={8}
                            />
                        )}
                    </div>

                    {/* Custom Instructions */}
                    <div className="option-group">
                        <label className="option-label">
                            {t('customLabel')}
                        </label>
                        <textarea
                            className="option-textarea"
                            placeholder={t('customPlaceholder')}
                            value={currentOptions.customInstructions}
                            onChange={(e) => handleChange('customInstructions', e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export { DEFAULTS as DEFAULT_OPTIONS };
