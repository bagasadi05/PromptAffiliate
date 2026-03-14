const EMPTY_STRING_KEYS = new Set([
  'targetAudience',
  'keySellingPoints',
  'mustInclude',
  'avoidElements',
  'sceneMustIncludeMap',
  'subjectDescription',
  'productInteraction',
]);

const ENUM_KEYS = new Set([
  'lighting',
  'cameraDistance',
  'background',
  'platformTarget',
  'conversionGoal',
  'psychologyTrigger',
  'hookStrength',
]);

const NULLABLE_KEYS = new Set(['hookFormula']);
export const AUTOFILL_RECOMMENDED_KEYS = new Set([
  'targetAudience',
  'keySellingPoints',
  'mustInclude',
  'avoidElements',
]);
export const AUTOFILL_MODES = {
  RECOMMENDED: 'recommended',
  ALL_SAFE: 'all-safe',
};

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function normalizeSuggestionValue(key, value) {
  if (NULLABLE_KEYS.has(key)) {
    if (value === null) return null;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  if (EMPTY_STRING_KEYS.has(key) || ENUM_KEYS.has(key)) {
    return typeof value === 'string' ? value.trim() : '';
  }

  return value;
}

export function filterAutofillSuggestions(suggestions = {}, mode = AUTOFILL_MODES.ALL_SAFE) {
  if (mode !== AUTOFILL_MODES.RECOMMENDED) {
    return { ...(suggestions || {}) };
  }

  return Object.fromEntries(
    Object.entries(suggestions || {}).filter(([key]) => AUTOFILL_RECOMMENDED_KEYS.has(key)),
  );
}

export function mergeAutofillSuggestions(currentOptions = {}, suggestions = {}, mode = AUTOFILL_MODES.ALL_SAFE) {
  const nextOptions = { ...currentOptions };
  const appliedKeys = [];
  const filteredSuggestions = filterAutofillSuggestions(suggestions, mode);

  Object.entries(filteredSuggestions).forEach(([key, rawValue]) => {
    const value = normalizeSuggestionValue(key, rawValue);
    if (NULLABLE_KEYS.has(key)) {
      if (!isEmptyValue(currentOptions[key])) return;
      if (value === null) return;
      nextOptions[key] = value;
      appliedKeys.push(key);
      return;
    }

    if (!isEmptyValue(currentOptions[key])) return;
    if (isEmptyValue(value)) return;

    nextOptions[key] = value;
    appliedKeys.push(key);
  });

  return {
    nextOptions,
    appliedKeys,
  };
}
