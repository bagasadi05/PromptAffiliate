import { useCallback, useState } from 'react';
import { showToast } from '../lib/toastBus';
import { useI18n } from './useI18n';
import { autofillEmptyPromptOptions } from '../services/gemini';
import { AUTOFILL_MODES, mergeAutofillSuggestions } from '../utils/optionAutofill';

export default function useAutofillOptions({
  capabilities,
  files,
  selectedPreset,
  advancedOptions,
  preferenceMemory,
  setAdvancedOptions,
}) {
  const [isAutofillingOptions, setIsAutofillingOptions] = useState(false);
  const [autofillDraft, setAutofillDraft] = useState(null);
  const { lang } = useI18n();

  const handleAutofillEmptyFields = useCallback(async (mode = AUTOFILL_MODES.RECOMMENDED) => {
    if (!files || files.length === 0) {
      showToast(lang === 'EN' ? 'Upload at least one reference image first.' : 'Upload minimal satu foto referensi terlebih dahulu.', 'warning');
      return;
    }

    if (!selectedPreset) {
      showToast(lang === 'EN' ? 'Choose a preset before using AI autofill.' : 'Pilih preset sebelum memakai AI autofill.', 'warning');
      return;
    }

    if (!capabilities.geminiEnabled) {
      showToast(lang === 'EN' ? 'Gemini backend is not available for autofill.' : 'Backend Gemini tidak tersedia untuk autofill.', 'warning');
      return;
    }

    setIsAutofillingOptions(true);
    showToast(lang === 'EN' ? 'AI is filling empty fields...' : 'AI sedang mengisi field yang kosong...', 'info');

    try {
      const suggestions = await autofillEmptyPromptOptions({
        files,
        preset: selectedPreset,
        currentOptions: advancedOptions,
        preferenceMemory,
        language: lang,
        mode,
      });

      const { appliedKeys } = mergeAutofillSuggestions(advancedOptions, suggestions, mode);

      if (appliedKeys.length === 0) {
        setAutofillDraft(null);
        showToast(
          lang === 'EN'
            ? 'No safe empty fields were found to autofill.'
            : 'Tidak ada field kosong yang aman untuk diisi otomatis.',
          'info',
        );
        return;
      }

      setAutofillDraft({
        mode,
        suggestions,
        appliedKeys,
      });
      showToast(
        lang === 'EN'
          ? `${appliedKeys.length} autofill suggestions are ready to review.`
          : `${appliedKeys.length} saran autofill siap direview.`,
        'success',
      );
    } catch (error) {
      showToast(
        error?.message || (lang === 'EN' ? 'AI autofill failed.' : 'AI autofill gagal.'),
        'error',
      );
    } finally {
      setIsAutofillingOptions(false);
    }
  }, [
    advancedOptions,
    capabilities.geminiEnabled,
    files,
    lang,
    preferenceMemory,
    selectedPreset,
  ]);

  const applyAutofillDraft = useCallback(() => {
    if (!autofillDraft?.suggestions) return;

    const { nextOptions, appliedKeys } = mergeAutofillSuggestions(
      advancedOptions,
      autofillDraft.suggestions,
      autofillDraft.mode || AUTOFILL_MODES.ALL_SAFE,
    );

    if (appliedKeys.length === 0) {
      setAutofillDraft(null);
      showToast(
        lang === 'EN'
          ? 'Nothing left to apply from the autofill preview.'
          : 'Tidak ada saran autofill yang tersisa untuk diterapkan.',
        'info',
      );
      return;
    }

    setAdvancedOptions(nextOptions);
    setAutofillDraft(null);
    showToast(
      lang === 'EN'
        ? `Applied ${appliedKeys.length} autofill suggestions.`
        : `Menerapkan ${appliedKeys.length} saran autofill.`,
      'success',
    );
  }, [advancedOptions, autofillDraft, lang, setAdvancedOptions]);

  const discardAutofillDraft = useCallback(() => {
    setAutofillDraft(null);
  }, []);

  return {
    isAutofillingOptions,
    handleAutofillEmptyFields,
    autofillDraft,
    applyAutofillDraft,
    discardAutofillDraft,
  };
}
