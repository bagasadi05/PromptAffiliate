import { useMemo, useState } from 'react';
import { useI18n } from '../hooks/useI18n';
import { DEFAULT_OPTIONS } from '../constants/defaultOptions';
import { AUTOFILL_MODES } from '../utils/optionAutofill';

const BACKGROUNDS = [
  'keep from reference',
  'clean studio',
  'home lifestyle',
  'minimal luxury',
  'soft retail display',
  'outdoor natural',
];

const LIGHTINGS = [
  'soft daylight',
  'golden hour',
  'beauty softbox',
  'bright retail',
  'dramatic contrast',
  'moody ambient',
];

const CAMERA_MOVEMENTS = [
  'auto',
  'slow push-in',
  'handheld follow',
  'orbit reveal',
  'macro slide',
  'locked tripod',
];

const MICRO_EXPRESSIONS = [
  'auto',
  'subtle smile',
  'curious glance',
  'surprised delight',
  'confident approval',
  'calm focus',
];

const RENDER_QUALITIES = ['1080p', '2k', '4k'];
const OUTPUT_LANGUAGES = ['ID', 'EN'];
const VOICE_LANGUAGES = ['ID', 'EN'];
const ASPECT_RATIOS = ['9:16', '1:1', '16:9'];
const TARGET_DURATIONS = ['auto', '15', '30', '45', '60'];

function ChoiceGroup({ items, value, onChange, columns = 2 }) {
  return (
    <div className={`option-toggle-group ${columns === 3 ? 'option-toggle-group--3' : ''} ${columns === 4 ? 'option-toggle-group--4' : ''}`}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`option-toggle ${value === item.value ? 'option-toggle--active' : ''}`}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function BooleanSwitch({ checked, onChange, onLabel, offLabel }) {
  return (
    <button
      type="button"
      className={`option-switch ${checked ? 'option-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="switch-thumb" />
      <span className="switch-label">{checked ? onLabel : offLabel}</span>
    </button>
  );
}

function LabelBadge({ children, tone = 'optional' }) {
  return <span className={`option-badge option-badge--${tone}`}>{children}</span>;
}

export default function AdvancedOptions({
  options,
  onChange,
  preferenceMemory = null,
  onClearPreferenceMemory = null,
  onAutofillEmptyFields = null,
  isAutofillingOptions = false,
  canAutofill = false,
  autofillDraft = null,
  onApplyAutofillDraft = null,
  onDiscardAutofillDraft = null,
}) {
  const { lang, t } = useI18n();
  const isEN = lang === 'EN';
  const [isOpen, setIsOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('core');
  const [isTemplateOpen, setIsTemplateOpen] = useState(Boolean(options.systemPromptTemplate));
  const [autofillMode, setAutofillMode] = useState(AUTOFILL_MODES.RECOMMENDED);

  const labels = useMemo(() => ({
    core: isEN ? 'Core' : 'Inti',
    creative: isEN ? 'Creative' : 'Kreatif',
    pro: 'Pro',
    optional: isEN ? 'Optional' : 'Opsional',
    recommended: isEN ? 'Recommended' : 'Disarankan',
    requiredProduct: isEN ? 'Product name is required before generate.' : 'Nama produk wajib diisi sebelum generate.',
    requiredGuide: isEN
      ? 'Only Product Name is mandatory. Everything else here is optional and only sharpens the result.'
      : 'Hanya Nama Produk yang wajib. Field lain di sini opsional dan berfungsi untuk mempertajam hasil.',
    autofillTitle: isEN ? 'AI Fill Empty Fields' : 'AI Isi Field Kosong',
    autofillHint: isEN
      ? 'AI only fills blank fields. Existing values stay untouched.'
      : 'AI hanya mengisi field yang kosong. Nilai yang sudah ada tidak diubah.',
    autofillModeLabel: isEN ? 'Autofill mode' : 'Mode autofill',
    autofillModeRecommended: isEN ? 'Recommended Fields' : 'Field Disarankan',
    autofillModeAllSafe: isEN ? 'All Safe Fields' : 'Semua Field Aman',
    autofillModeRecommendedHint: isEN
      ? 'Only the most useful intent fields.'
      : 'Hanya field intent yang paling penting.',
    autofillModeAllSafeHint: isEN
      ? 'Includes creative and pro fields when safe.'
      : 'Termasuk field kreatif dan pro jika aman.',
    autofillAction: isAutofillingOptions
      ? (isEN ? 'Filling...' : 'Mengisi...')
      : (isEN ? 'Auto-fill Empty Fields' : 'Isi Field Kosong'),
    autofillPreviewTitle: isEN ? 'AI Suggestion Preview' : 'Preview Saran AI',
    autofillPreviewHint: isEN
      ? 'Review the draft before applying it to the form.'
      : 'Review draft ini sebelum diterapkan ke form.',
    autofillApply: isEN ? 'Apply Suggestions' : 'Terapkan Saran',
    autofillDiscard: isEN ? 'Discard' : 'Buang',
    autofillRegenerate: isEN ? 'Refresh Suggestions' : 'Muat Ulang Saran',
    autofillPreviewCount: isEN ? 'fields ready' : 'field siap',
    productName: isEN ? 'Product Name' : 'Nama Produk',
    productPlaceholder: isEN ? 'Example: Matte cushion anti-cakey' : 'Contoh: Cushion matte anti crack',
    productHint: isEN ? 'Use the actual selling name. This steers the conversion angle and hook.' : 'Gunakan nama jual produk yang sebenarnya. Ini menentukan angle conversion dan hook.',
    targetAudience: isEN ? 'Target Audience' : 'Target Audiens',
    targetAudienceHint: isEN ? 'State who should feel spoken to by the prompt.' : 'Jelaskan siapa yang harus merasa paling relate dengan prompt ini.',
    targetAudiencePlaceholder: isEN ? 'Example: busy moms, college girls, first-time buyers' : 'Contoh: ibu sibuk, cewek kuliah, pembeli pertama kali',
    keySellingPoints: isEN ? 'Key Selling Points' : 'Selling Points Utama',
    keySellingPointsHint: isEN ? 'List the strongest product benefits you want emphasized.' : 'Tulis manfaat produk yang paling ingin ditonjolkan.',
    keySellingPointsPlaceholder: isEN ? 'Example: lightweight texture, transfer-proof finish, easy for daily use' : 'Contoh: tekstur ringan, tahan transfer, gampang dipakai harian',
    subjectTitle: isEN ? 'Subject Identity Lock' : 'Identity Lock Subject',
    subjectHint: isEN ? 'Lock wardrobe, face, or persona so the scenes stay consistent.' : 'Kunci wajah, outfit, atau persona agar antar scene tetap konsisten.',
    coreSummary: isEN ? 'Contains the only required field plus key setup.' : 'Berisi satu-satunya field wajib plus setup utama.',
    creativeSummary: isEN ? 'Fully optional visual direction and pacing.' : 'Sepenuhnya opsional untuk arah visual dan pacing.',
    proSummary: isEN ? 'Optional conversion constraints and engine control.' : 'Opsional untuk constraint konversi dan kontrol engine.',
    sceneCount: isEN ? 'Scene Count' : 'Jumlah Scene',
    sceneHint: isEN ? 'Each scene is assumed to be around 6 seconds.' : 'Setiap scene diasumsikan sekitar 6 detik.',
    outputLanguage: isEN ? 'Prompt Language' : 'Bahasa Prompt',
    voiceStyle: isEN ? 'Voice Direction' : 'Arah Voice',
    voiceCharacter: isEN ? 'Voice Character' : 'Karakter Voice',
    voiceCharacterHint: isEN ? 'Choose the persona that should speak or narrate.' : 'Pilih persona yang akan bicara atau mengisi narasi.',
    customVoiceCharacter: isEN ? 'Custom Voice Character' : 'Karakter Voice Kustom',
    customVoicePlaceholder: isEN ? 'Example: calm skincare expert' : 'Contoh: beauty advisor yang tenang',
    voiceScriptMode: isEN ? 'Voice Script Mode' : 'Mode Script Voice',
    manualScript: isEN ? 'Manual Script' : 'Script Manual',
    scriptHintAi: isEN ? 'The model will write the script based on the product and preset.' : 'Model akan menyusun script berdasarkan produk dan preset.',
    scriptHintManual: isEN ? 'Use this when you already know the exact line that must be spoken.' : 'Pakai ini jika kamu sudah tahu kalimat yang harus diucapkan.',
    customInstructions: isEN ? 'Custom Instructions' : 'Instruksi Tambahan',
    creativeLabel: isEN ? 'Creative Range' : 'Rentang Kreativitas',
    creativeHint: isEN ? 'Higher values explore more hooks and scene variations.' : 'Nilai lebih tinggi mendorong hook dan variasi scene yang lebih berani.',
    realism: isEN ? 'Realism Level' : 'Level Realisme',
    cameraDistance: isEN ? 'Camera Distance' : 'Jarak Kamera',
    background: isEN ? 'Background Direction' : 'Arah Background',
    lighting: isEN ? 'Lighting Direction' : 'Arah Lighting',
    negativePrompt: isEN ? 'Include Negative Prompt' : 'Sertakan Negative Prompt',
    aspectRatio: isEN ? 'Aspect Ratio' : 'Rasio Aspect',
    targetDuration: isEN ? 'Target Duration' : 'Target Durasi',
    cinematicMode: isEN ? 'Cinematic Product Hook' : 'Cinematic Product Hook',
    cinematicHint: isEN ? 'Turn this on when the output needs stronger product-reveal choreography.' : 'Nyalakan jika output perlu koreografi reveal produk yang lebih sinematik.',
    cameraMovement: isEN ? 'Camera Movement' : 'Gerakan Kamera',
    microExpressions: isEN ? 'Micro Expressions' : 'Micro Expressions',
    productInteraction: isEN ? 'Product Interaction Notes' : 'Catatan Interaksi Produk',
    productInteractionHint: isEN ? 'State how the talent should touch, hold, or demonstrate the product.' : 'Jelaskan bagaimana talent menyentuh, memegang, atau mendemokan produk.',
    renderQuality: isEN ? 'Render Quality' : 'Kualitas Render',
    platformTarget: isEN ? 'Platform Target' : 'Target Platform',
    conversionGoal: isEN ? 'Conversion Goal' : 'Goal Konversi',
    psychologyTrigger: isEN ? 'Psychology Trigger' : 'Trigger Psikologi',
    hookStrength: isEN ? 'Hook Strength' : 'Kekuatan Hook',
    hookFormula: isEN ? 'Hook Formula' : 'Formula Hook',
    mustInclude: isEN ? 'Must Include' : 'Wajib Ada',
    mustIncludeHint: isEN ? 'Non-negotiable details, beats, or phrases that must appear in the generated prompt.' : 'Detail, beat, atau arahan yang wajib muncul di prompt hasil.',
    mustIncludePlaceholder: isEN ? 'Example: opening close-up of product texture, yellow-cart CTA, before-after contrast' : 'Contoh: opening close-up tekstur produk, CTA keranjang kuning, kontras before-after',
    avoidElements: isEN ? 'Avoid These Elements' : 'Hindari Elemen Ini',
    avoidElementsHint: isEN ? 'List visuals, claims, or tones that the model should avoid.' : 'Tulis visual, klaim, atau tone yang harus dihindari model.',
    avoidElementsPlaceholder: isEN ? 'Example: hard-selling tone, luxury claims, dark background, exaggerated reaction' : 'Contoh: tone hard-selling, klaim mewah, background gelap, reaksi berlebihan',
    scenePins: isEN ? 'Scene Pins' : 'Pin per Scene',
    scenePinsHint: isEN ? 'Pin a must-have beat to an exact scene. Format: "1: soft hook + product name". One line per scene.' : 'Kunci beat wajib ke scene tertentu. Format: "1: hook lembut + nama produk". Satu baris per scene.',
    scenePinsPlaceholder: isEN ? '1: soft hook + exact product name\n2: texture close-up on hand\n4: yellow-cart CTA + social proof' : '1: hook lembut + nama produk persis\n2: close-up tekstur di tangan\n4: CTA keranjang kuning + bukti sosial',
    learnedPreferences: isEN ? 'Learned Preferences' : 'Preferensi yang Dipelajari',
    learnedPreferencesHint: isEN ? 'Frequent corrections are remembered and applied automatically in future generations.' : 'Koreksi yang sering dipakai akan diingat dan diterapkan otomatis pada generate berikutnya.',
    learnedAvoid: isEN ? 'Remembered avoids' : 'Avoid yang diingat',
    learnedSteering: isEN ? 'Remembered steering' : 'Arahan yang diingat',
    clearLearnedPreferences: isEN ? 'Clear memory' : 'Hapus memori',
    noLearnedPreferences: isEN ? 'No learned preferences yet.' : 'Belum ada preferensi yang dipelajari.',
    systemTemplate: isEN ? 'System Prompt Template Override' : 'Override System Prompt Template',
    systemTemplateHint: isEN ? 'Only open this if you deliberately want to override the engine default.' : 'Buka hanya jika memang ingin mengubah template engine bawaan.',
    openTemplate: isEN ? 'Open template' : 'Buka template',
    closeTemplate: isEN ? 'Close template' : 'Tutup template',
    summaryProductMissing: isEN ? 'Product missing' : 'Produk belum diisi',
    summaryScenes: isEN ? 'scenes' : 'scene',
    summaryVoiceOff: isEN ? 'No voice' : 'Tanpa voice',
    summaryVoiceOn: isEN ? 'Voice active' : 'Voice aktif',
    templatePlaceholder: isEN ? 'Paste your custom system prompt template here...' : 'Tempel system prompt template kustom di sini...',
    customPlaceholder: isEN ? 'Examples: emphasize yellow-cart CTA, avoid luxury claims, keep all scenes under 12 words.' : 'Contoh: tekankan CTA keranjang kuning, hindari klaim berlebihan, jaga tiap scene tetap ringkas.',
    subjectPlaceholder: isEN ? 'Example: same female creator, warm smile, beige outfit, modest makeup.' : 'Contoh: creator perempuan yang sama, senyum hangat, outfit beige, makeup natural.',
    interactionPlaceholder: isEN ? 'Example: open the cap slowly, show texture on hand, finish with product beside face.' : 'Contoh: buka tutup perlahan, tunjukkan tekstur di tangan, tutup dengan produk di dekat wajah.',
    voicePlaceholder: isEN ? 'Example: This is the first cushion that stays light on my skin from morning to night.' : 'Contoh: Ini cushion pertama yang tetap ringan di kulit aku dari pagi sampai malam.',
  }), [isAutofillingOptions, isEN]);

  const voiceStyles = useMemo(() => ([
    { value: 'none', label: t('voiceStyleNoneLabel') },
    { value: 'talking', label: t('voiceStyleTalkingLabel') },
    { value: 'voiceover', label: t('voiceStyleVoiceoverLabel') },
    { value: 'lipsync', label: t('voiceStyleLipsyncLabel') },
  ]), [t]);

  const voiceCharacters = useMemo(() => ([
    { value: 'auto', label: isEN ? 'Auto persona' : 'Persona otomatis' },
    { value: 'seller', label: isEN ? 'Seller host' : 'Host seller' },
    { value: 'friend', label: isEN ? 'Trusted friend' : 'Teman rekomendasi' },
    { value: 'expert', label: isEN ? 'Category expert' : 'Ahli kategori' },
    { value: 'custom', label: isEN ? 'Custom' : 'Kustom' },
  ]), [isEN]);

  const sceneLabel = Number(options.sceneCount || DEFAULT_OPTIONS.sceneCount);
  const creativityValue = Number(options.creativity || DEFAULT_OPTIONS.creativity);
  const productName = String(options.productName || '').trim();
  const showVoiceOptions = options.voiceStyle && options.voiceStyle !== 'none';
  const showCinematicControls = Boolean(options.cinematicMode);
  const rememberedAvoids = Array.isArray(preferenceMemory?.avoidTerms) ? preferenceMemory.avoidTerms : [];
  const rememberedSteering = Array.isArray(preferenceMemory?.steeringNotes) ? preferenceMemory.steeringNotes : [];

  const sectionTabs = useMemo(() => ([
    { id: 'core', label: labels.core, description: labels.coreSummary, badge: t('required') },
    { id: 'creative', label: labels.creative, description: labels.creativeSummary, badge: labels.optional },
    { id: 'pro', label: labels.pro, description: labels.proSummary, badge: labels.optional },
  ]), [labels, t]);

  const autofillModeOptions = useMemo(() => ([
    {
      value: AUTOFILL_MODES.RECOMMENDED,
      label: labels.autofillModeRecommended,
      hint: labels.autofillModeRecommendedHint,
    },
    {
      value: AUTOFILL_MODES.ALL_SAFE,
      label: labels.autofillModeAllSafe,
      hint: labels.autofillModeAllSafeHint,
    },
  ]), [labels]);

  const autofillFieldLabels = useMemo(() => ({
    targetAudience: labels.targetAudience,
    keySellingPoints: labels.keySellingPoints,
    mustInclude: labels.mustInclude,
    avoidElements: labels.avoidElements,
    sceneMustIncludeMap: labels.scenePins,
    subjectDescription: labels.subjectTitle,
    lighting: labels.lighting,
    cameraDistance: labels.cameraDistance,
    background: labels.background,
    productInteraction: labels.productInteraction,
    platformTarget: labels.platformTarget,
    conversionGoal: labels.conversionGoal,
    psychologyTrigger: labels.psychologyTrigger,
    hookStrength: labels.hookStrength,
    hookFormula: labels.hookFormula,
  }), [labels]);

  const summaryChips = useMemo(() => ([
    {
      key: 'product',
      label: productName || labels.summaryProductMissing,
      tone: productName ? 'ok' : 'warn',
    },
    {
      key: 'scenes',
      label: `${sceneLabel} ${labels.summaryScenes}`,
      tone: 'neutral',
    },
    {
      key: 'voice',
      label: showVoiceOptions ? labels.summaryVoiceOn : labels.summaryVoiceOff,
      tone: showVoiceOptions ? 'ok' : 'neutral',
    },
    {
      key: 'conversion',
      label: `${String(options.platformTarget || DEFAULT_OPTIONS.platformTarget).toUpperCase()} • ${String(options.conversionGoal || DEFAULT_OPTIONS.conversionGoal).replace(/-/g, ' ')}`,
      tone: 'neutral',
    },
  ]), [
    labels.summaryProductMissing,
    labels.summaryScenes,
    labels.summaryVoiceOff,
    labels.summaryVoiceOn,
    options.conversionGoal,
    options.platformTarget,
    productName,
    sceneLabel,
    showVoiceOptions,
  ]);

  const autofillPreviewItems = useMemo(() => {
    if (!Array.isArray(autofillDraft?.appliedKeys)) return [];

    return autofillDraft.appliedKeys.map((key) => ({
      key,
      label: autofillFieldLabels[key] || key,
      value: autofillDraft?.suggestions?.[key],
    }));
  }, [autofillDraft, autofillFieldLabels]);

  const updateOption = (key, value) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetTemplate = () => {
    updateOption('systemPromptTemplate', DEFAULT_OPTIONS.systemPromptTemplate);
    setIsTemplateOpen(false);
  };

  const renderCore = () => (
    <div className="option-grid">
      <div className="option-card option-card--full">
        <div className="option-group">
          <label className="option-label option-label--split">
            <span>{labels.productName}</span>
            <span className="option-required">{t('required')}</span>
          </label>
          <input
            type="text"
            className={`option-input ${!productName ? 'option-input--danger' : ''}`}
            value={options.productName || ''}
            onChange={(event) => updateOption('productName', event.target.value)}
            placeholder={labels.productPlaceholder}
          />
          <p className="option-hint">{labels.productHint}</p>
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <label className="option-label">{labels.subjectTitle}</label>
          <textarea
            className="option-textarea"
            value={options.subjectDescription || ''}
            onChange={(event) => updateOption('subjectDescription', event.target.value)}
            placeholder={labels.subjectPlaceholder}
            rows={3}
          />
          <p className="option-hint">{labels.subjectHint}</p>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label option-label--split">
            <span>{labels.targetAudience}</span>
            <LabelBadge tone="recommended">{labels.recommended}</LabelBadge>
          </label>
          <input
            type="text"
            className="option-input"
            value={options.targetAudience || ''}
            onChange={(event) => updateOption('targetAudience', event.target.value)}
            placeholder={labels.targetAudiencePlaceholder}
          />
          <p className="option-hint">{labels.targetAudienceHint}</p>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label option-label--split">
            <span>{labels.keySellingPoints}</span>
            <LabelBadge tone="recommended">{labels.recommended}</LabelBadge>
          </label>
          <textarea
            className="option-textarea"
            value={options.keySellingPoints || ''}
            onChange={(event) => updateOption('keySellingPoints', event.target.value)}
            placeholder={labels.keySellingPointsPlaceholder}
            rows={3}
          />
          <p className="option-hint">{labels.keySellingPointsHint}</p>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group scene-count-control">
          <div className="option-label-row">
            <label className="option-label">{labels.sceneCount}</label>
            <span className="option-inline-value">{sceneLabel * 6}s</span>
          </div>
          <input
            type="range"
            min="2"
            max="8"
            step="1"
            className="option-range"
            value={sceneLabel}
            onChange={(event) => updateOption('sceneCount', Number(event.target.value))}
          />
          <div className="range-labels">
            <span>2</span>
            <span>4</span>
            <span>6</span>
            <span>8</span>
          </div>
          <p className="option-hint">{labels.sceneHint}</p>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.outputLanguage}</label>
          <ChoiceGroup
            items={OUTPUT_LANGUAGES.map((value) => ({ value, label: value }))}
            value={options.outputLanguage || DEFAULT_OPTIONS.outputLanguage}
            onChange={(value) => updateOption('outputLanguage', value)}
          />
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <label className="option-label">{labels.voiceStyle}</label>
          <ChoiceGroup
            items={voiceStyles}
            value={options.voiceStyle || DEFAULT_OPTIONS.voiceStyle}
            onChange={(value) => updateOption('voiceStyle', value)}
          />
        </div>
      </div>

      {showVoiceOptions ? (
        <>
          <div className="option-card">
            <div className="option-group">
              <label className="option-label">{labels.voiceCharacter}</label>
              <select
                className="option-select"
                value={options.voiceCharacter || DEFAULT_OPTIONS.voiceCharacter}
                onChange={(event) => updateOption('voiceCharacter', event.target.value)}
              >
                {voiceCharacters.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <p className="option-hint">{labels.voiceCharacterHint}</p>
            </div>
          </div>

          <div className="option-card">
            <div className="option-group">
              <label className="option-label">{t('voiceLangLabel')}</label>
              <ChoiceGroup
                items={VOICE_LANGUAGES.map((value) => ({ value, label: value }))}
                value={options.voiceLanguage || DEFAULT_OPTIONS.voiceLanguage}
                onChange={(value) => updateOption('voiceLanguage', value)}
              />
            </div>
          </div>

          {options.voiceCharacter === 'custom' ? (
            <div className="option-card option-card--full">
              <div className="option-group">
                <label className="option-label">{labels.customVoiceCharacter}</label>
                <input
                  type="text"
                  className="option-input"
                  value={options.customVoiceCharacter || ''}
                  onChange={(event) => updateOption('customVoiceCharacter', event.target.value)}
                  placeholder={labels.customVoicePlaceholder}
                />
              </div>
            </div>
          ) : null}

          <div className="option-card option-card--full">
            <div className="option-group">
              <label className="option-label">{labels.voiceScriptMode}</label>
              <ChoiceGroup
                items={[
                  { value: 'ai', label: t('voiceScriptAi') },
                  { value: 'manual', label: t('voiceScriptManual') },
                ]}
                value={options.voiceScriptMode || DEFAULT_OPTIONS.voiceScriptMode}
                onChange={(value) => updateOption('voiceScriptMode', value)}
              />
              <p className="option-hint">
                {options.voiceScriptMode === 'manual' ? labels.scriptHintManual : labels.scriptHintAi}
              </p>
            </div>
          </div>

          {options.voiceScriptMode === 'manual' ? (
            <div className="option-card option-card--full">
              <div className="option-group">
                <label className="option-label">{labels.manualScript}</label>
                <textarea
                  className="option-textarea"
                  value={options.voiceScript || ''}
                  onChange={(event) => updateOption('voiceScript', event.target.value)}
                  placeholder={labels.voicePlaceholder}
                  rows={4}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  const renderCreative = () => (
    <div className="option-grid">
      <div className="option-card">
        <div className="option-group">
          <div className="option-label-row">
            <label className="option-label">{labels.creativeLabel}</label>
            <span className="option-inline-value">{creativityValue}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            className="option-range"
            value={creativityValue}
            onChange={(event) => updateOption('creativity', Number(event.target.value))}
          />
          <div className="range-labels">
            <span>{t('advancedCreativityPrecise')}</span>
            <span>{t('advancedCreativityBalanced')}</span>
            <span>{t('advancedCreativityCreative')}</span>
          </div>
          <p className="option-hint">{labels.creativeHint}</p>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.realism}</label>
          <ChoiceGroup
            items={[
              { value: 'Low', label: t('realismLow') },
              { value: 'Med', label: t('realismMed') },
              { value: 'High', label: t('realismHigh') },
            ]}
            value={options.realismLevel || DEFAULT_OPTIONS.realismLevel}
            onChange={(value) => updateOption('realismLevel', value)}
            columns={3}
          />
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.cameraDistance}</label>
          <ChoiceGroup
            items={[
              { value: 'close', label: t('cameraClose') },
              { value: 'medium', label: t('cameraMedium') },
              { value: 'full', label: t('cameraFull') },
            ]}
            value={options.cameraDistance || DEFAULT_OPTIONS.cameraDistance}
            onChange={(value) => updateOption('cameraDistance', value)}
            columns={3}
          />
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.aspectRatio}</label>
          <ChoiceGroup
            items={ASPECT_RATIOS.map((value) => ({ value, label: value }))}
            value={options.aspectRatio || DEFAULT_OPTIONS.aspectRatio}
            onChange={(value) => updateOption('aspectRatio', value)}
            columns={3}
          />
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.background}</label>
          <select
            className="option-select"
            value={options.background || DEFAULT_OPTIONS.background}
            onChange={(event) => updateOption('background', event.target.value)}
          >
            {BACKGROUNDS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.lighting}</label>
          <select
            className="option-select"
            value={options.lighting || DEFAULT_OPTIONS.lighting}
            onChange={(event) => updateOption('lighting', event.target.value)}
          >
            {LIGHTINGS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.targetDuration}</label>
          <select
            className="option-select"
            value={options.targetDuration == null ? 'auto' : String(options.targetDuration)}
            onChange={(event) => updateOption('targetDuration', event.target.value === 'auto' ? null : Number(event.target.value))}
          >
            {TARGET_DURATIONS.map((value) => (
              <option key={value} value={value}>
                {value === 'auto' ? 'Auto' : `${value}s`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group option-group--inline">
          <div>
            <label className="option-label">{labels.negativePrompt}</label>
            <p className="option-hint">{t('negativeLabel')}</p>
          </div>
          <BooleanSwitch
            checked={Boolean(options.includeNegativePrompt)}
            onChange={(value) => updateOption('includeNegativePrompt', value)}
            onLabel={t('switchOn')}
            offLabel={t('switchOff')}
          />
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group option-group--inline">
          <div>
            <label className="option-label">{labels.cinematicMode}</label>
            <p className="option-hint">{labels.cinematicHint}</p>
          </div>
          <BooleanSwitch
            checked={Boolean(options.cinematicMode)}
            onChange={(value) => updateOption('cinematicMode', value)}
            onLabel={t('switchOn')}
            offLabel={t('switchOff')}
          />
        </div>
      </div>

      {showCinematicControls ? (
        <>
          <div className="option-card">
            <div className="option-group">
              <label className="option-label">{labels.cameraMovement}</label>
              <select
                className="option-select"
                value={options.cameraMovement || DEFAULT_OPTIONS.cameraMovement}
                onChange={(event) => updateOption('cameraMovement', event.target.value)}
              >
                {CAMERA_MOVEMENTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="option-card">
            <div className="option-group">
              <label className="option-label">{labels.microExpressions}</label>
              <select
                className="option-select"
                value={options.microExpressions || DEFAULT_OPTIONS.microExpressions}
                onChange={(event) => updateOption('microExpressions', event.target.value)}
              >
                {MICRO_EXPRESSIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="option-card">
            <div className="option-group">
              <label className="option-label">{labels.renderQuality}</label>
              <ChoiceGroup
                items={RENDER_QUALITIES.map((value) => ({ value, label: value.toUpperCase() }))}
                value={options.renderQuality || DEFAULT_OPTIONS.renderQuality}
                onChange={(value) => updateOption('renderQuality', value)}
                columns={3}
              />
            </div>
          </div>

          <div className="option-card option-card--full">
            <div className="option-group">
              <label className="option-label">{labels.productInteraction}</label>
              <textarea
                className="option-textarea"
                value={options.productInteraction || ''}
                onChange={(event) => updateOption('productInteraction', event.target.value)}
                placeholder={labels.interactionPlaceholder}
                rows={3}
              />
              <p className="option-hint">{labels.productInteractionHint}</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  const renderPro = () => (
    <div className="option-grid">
      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.platformTarget}</label>
          <ChoiceGroup
            items={[
              { value: 'tiktok', label: 'TikTok' },
              { value: 'shopee', label: 'Shopee' },
              { value: 'instagram', label: 'Instagram' },
            ]}
            value={options.platformTarget || DEFAULT_OPTIONS.platformTarget}
            onChange={(value) => updateOption('platformTarget', value)}
            columns={3}
          />
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.conversionGoal}</label>
          <ChoiceGroup
            items={[
              { value: 'purchase', label: isEN ? 'Purchase' : 'Pembelian' },
              { value: 'click', label: isEN ? 'Click-through' : 'Klik' },
              { value: 'lead', label: 'Lead' },
              { value: 'awareness', label: 'Awareness' },
            ]}
            value={options.conversionGoal || DEFAULT_OPTIONS.conversionGoal}
            onChange={(value) => updateOption('conversionGoal', value)}
            columns={2}
          />
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.psychologyTrigger}</label>
          <select
            className="option-select"
            value={options.psychologyTrigger || DEFAULT_OPTIONS.psychologyTrigger}
            onChange={(event) => updateOption('psychologyTrigger', event.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="fomo">FOMO</option>
            <option value="social-proof">{isEN ? 'Social proof' : 'Bukti sosial'}</option>
            <option value="problem-solution">{isEN ? 'Problem-solution' : 'Masalah-solusi'}</option>
            <option value="authority">Authority</option>
            <option value="aspiration">{isEN ? 'Aspiration' : 'Aspirasi'}</option>
          </select>
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.hookStrength}</label>
          <ChoiceGroup
            items={[
              { value: 'soft', label: isEN ? 'Soft' : 'Halus' },
              { value: 'medium', label: isEN ? 'Medium' : 'Sedang' },
              { value: 'hard', label: isEN ? 'Hard' : 'Kuat' },
            ]}
            value={options.hookStrength || DEFAULT_OPTIONS.hookStrength}
            onChange={(value) => updateOption('hookStrength', value)}
            columns={3}
          />
        </div>
      </div>

      <div className="option-card">
        <div className="option-group">
          <label className="option-label">{labels.hookFormula}</label>
          <select
            className="option-select"
            value={options.hookFormula || 'auto'}
            onChange={(event) => updateOption('hookFormula', event.target.value === 'auto' ? null : event.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="problem-agitate-solve">PAS</option>
            <option value="before-after-bridge">BAB</option>
            <option value="demo-proof">{isEN ? 'Demo + proof' : 'Demo + bukti'}</option>
            <option value="open-loop">{isEN ? 'Open loop' : 'Open loop'}</option>
            <option value="listicle">Listicle</option>
          </select>
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <label className="option-label option-label--split">
            <span>{labels.customInstructions}</span>
            <LabelBadge>{labels.optional}</LabelBadge>
          </label>
          <textarea
            className="option-textarea"
            value={options.customInstructions || ''}
            onChange={(event) => updateOption('customInstructions', event.target.value)}
            placeholder={labels.customPlaceholder}
            rows={4}
          />
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <label className="option-label option-label--split">
            <span>{labels.mustInclude}</span>
            <LabelBadge tone="recommended">{labels.recommended}</LabelBadge>
          </label>
          <textarea
            className="option-textarea"
            value={options.mustInclude || ''}
            onChange={(event) => updateOption('mustInclude', event.target.value)}
            placeholder={labels.mustIncludePlaceholder}
            rows={3}
          />
          <p className="option-hint">{labels.mustIncludeHint}</p>
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <label className="option-label option-label--split">
            <span>{labels.avoidElements}</span>
            <LabelBadge tone="recommended">{labels.recommended}</LabelBadge>
          </label>
          <textarea
            className="option-textarea"
            value={options.avoidElements || ''}
            onChange={(event) => updateOption('avoidElements', event.target.value)}
            placeholder={labels.avoidElementsPlaceholder}
            rows={3}
          />
          <p className="option-hint">{labels.avoidElementsHint}</p>
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <label className="option-label option-label--split">
            <span>{labels.scenePins}</span>
            <LabelBadge>{labels.optional}</LabelBadge>
          </label>
          <textarea
            className="option-textarea"
            value={options.sceneMustIncludeMap || ''}
            onChange={(event) => updateOption('sceneMustIncludeMap', event.target.value)}
            placeholder={labels.scenePinsPlaceholder}
            rows={4}
          />
          <p className="option-hint">{labels.scenePinsHint}</p>
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <div className="option-toolbar">
            <div>
              <label className="option-label">{labels.learnedPreferences}</label>
              <p className="option-hint">{labels.learnedPreferencesHint}</p>
            </div>
            {onClearPreferenceMemory ? (
              <div className="option-toolbar__actions">
                <button type="button" className="btn btn--outline btn--sm" onClick={onClearPreferenceMemory}>
                  {labels.clearLearnedPreferences}
                </button>
              </div>
            ) : null}
          </div>
          {rememberedAvoids.length === 0 && rememberedSteering.length === 0 ? (
            <div className="option-alert">{labels.noLearnedPreferences}</div>
          ) : (
            <div className="memory-grid">
              <div className="memory-card">
                <div className="memory-card__title">{labels.learnedAvoid}</div>
                <div className="memory-chip-list">
                  {rememberedAvoids.length > 0 ? rememberedAvoids.map((item) => (
                    <span key={`avoid-${item}`} className="memory-chip memory-chip--warn">{item}</span>
                  )) : <span className="memory-chip memory-chip--empty">-</span>}
                </div>
              </div>
              <div className="memory-card">
                <div className="memory-card__title">{labels.learnedSteering}</div>
                <div className="memory-chip-list">
                  {rememberedSteering.length > 0 ? rememberedSteering.map((item) => (
                    <span key={`steering-${item}`} className="memory-chip">{item}</span>
                  )) : <span className="memory-chip memory-chip--empty">-</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="option-card option-card--full">
        <div className="option-group">
          <div className="option-toolbar">
            <div>
              <label className="option-label">{labels.systemTemplate}</label>
              <p className="option-hint">{labels.systemTemplateHint}</p>
            </div>
            <div className="option-toolbar__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setIsTemplateOpen((prev) => !prev)}>
                {isTemplateOpen ? labels.closeTemplate : labels.openTemplate}
              </button>
              <button type="button" className="btn btn--outline btn--sm" onClick={handleResetTemplate}>
                {t('templateReset')}
              </button>
            </div>
          </div>
          {isTemplateOpen ? (
            <textarea
              className="option-textarea option-textarea--tall"
              value={options.systemPromptTemplate || ''}
              onChange={(event) => updateOption('systemPromptTemplate', event.target.value || null)}
              placeholder={labels.templatePlaceholder}
              rows={7}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <section className={`advanced-options ${isOpen ? 'advanced-options--open' : ''}`}>
      <button
        type="button"
        className="advanced-options__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="toggle-icon">{isOpen ? '▼' : '▶'}</span>
        <span>{t('advancedTitle')}</span>
        <span className="toggle-hint">{isOpen ? t('advancedClose') : t('advancedOpen')}</span>
      </button>

      {isOpen ? (
        <div className="advanced-options__body">
          <div className="advanced-summary">
            {summaryChips.map((chip) => (
              <span
                key={chip.key}
                className={`advanced-summary__chip advanced-summary__chip--${chip.tone}`}
              >
                {chip.label}
              </span>
            ))}
          </div>

          {!productName ? (
            <div className="option-alert option-alert--danger">
              <strong>{t('required')}.</strong> {labels.requiredProduct}
            </div>
          ) : null}

          <div className="option-alert option-alert--with-actions">
            <div>
              <strong>{labels.productName}.</strong> {labels.requiredGuide}
              <div className="option-alert__subtle">{labels.autofillHint}</div>
              {onAutofillEmptyFields ? (
                <div className="autofill-mode-picker">
                  <span className="autofill-mode-picker__label">{labels.autofillModeLabel}</span>
                  <div className="autofill-mode-picker__options">
                    {autofillModeOptions.map((modeOption) => (
                      <button
                        key={modeOption.value}
                        type="button"
                        className={`autofill-mode-pill ${autofillMode === modeOption.value ? 'autofill-mode-pill--active' : ''}`}
                        onClick={() => setAutofillMode(modeOption.value)}
                      >
                        <span>{modeOption.label}</span>
                        <small>{modeOption.hint}</small>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {onAutofillEmptyFields ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onAutofillEmptyFields(autofillMode)}
                disabled={!canAutofill || isAutofillingOptions}
              >
                {labels.autofillAction}
              </button>
            ) : null}
          </div>

          {autofillPreviewItems.length > 0 ? (
            <div className="autofill-preview">
              <div className="autofill-preview__header">
                <div>
                  <strong>{labels.autofillPreviewTitle}</strong>
                  <div className="option-alert__subtle">{labels.autofillPreviewHint}</div>
                </div>
                <span className="advanced-summary__chip advanced-summary__chip--ok">
                  {autofillPreviewItems.length} {labels.autofillPreviewCount}
                </span>
              </div>

              <div className="autofill-preview__list">
                {autofillPreviewItems.map((item) => (
                  <div key={item.key} className="autofill-preview__item">
                    <div className="autofill-preview__field">{item.label}</div>
                    <div className="autofill-preview__value">{String(item.value || '')}</div>
                  </div>
                ))}
              </div>

              <div className="option-toolbar__actions">
                {onApplyAutofillDraft ? (
                  <button type="button" className="btn btn--secondary btn--sm" onClick={onApplyAutofillDraft}>
                    {labels.autofillApply}
                  </button>
                ) : null}
                {onAutofillEmptyFields ? (
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => onAutofillEmptyFields(autofillMode)}
                    disabled={!canAutofill || isAutofillingOptions}
                  >
                    {labels.autofillRegenerate}
                  </button>
                ) : null}
                {onDiscardAutofillDraft ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={onDiscardAutofillDraft}>
                    {labels.autofillDiscard}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="advanced-section-tabs" role="tablist" aria-label={t('advancedTitle')}>
            {sectionTabs.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`advanced-section-tab ${activeSection === section.id ? 'advanced-section-tab--active' : ''}`}
                onClick={() => setActiveSection(section.id)}
                role="tab"
                aria-selected={activeSection === section.id}
              >
                <span className="advanced-section-tab__label">
                  {section.label}
                  <span className={`advanced-section-tab__badge ${section.badge === t('required') ? 'advanced-section-tab__badge--required' : ''}`}>
                    {section.badge}
                  </span>
                </span>
                <span className="advanced-section-tab__desc">{section.description}</span>
              </button>
            ))}
          </div>

          <div className="advanced-section-panel">
            {activeSection === 'core' ? renderCore() : null}
            {activeSection === 'creative' ? renderCreative() : null}
            {activeSection === 'pro' ? renderPro() : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
