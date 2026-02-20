const IMAGE_REFERENCE_ROLE_ORDER = ['identity', 'outfit', 'pose', 'background', 'style'];

export const IMAGE_REFERENCE_ROLES = [
  { value: 'identity', label: 'Identity' },
  { value: 'outfit', label: 'Outfit' },
  { value: 'pose', label: 'Pose' },
  { value: 'background', label: 'Background' },
  { value: 'style', label: 'Style' },
];

export function isValidReferenceRole(role) {
  return IMAGE_REFERENCE_ROLE_ORDER.includes(role);
}

export function getDefaultReferenceRole(index) {
  return IMAGE_REFERENCE_ROLE_ORDER[index] || 'style';
}

export function buildDefaultImageReference(file, index) {
  return {
    role: getDefaultReferenceRole(index),
    influence: index === 0 ? 70 : 40,
    priority: index + 1,
    label: file?.name || `Image ${index + 1}`,
  };
}

export function normalizeImageReferences(files, references = []) {
  const safeFiles = Array.isArray(files) ? files : [];
  if (safeFiles.length === 0) return [];

  const rows = safeFiles.map((file, index) => {
    const incoming = references[index] || {};
    const role = isValidReferenceRole(incoming.role)
      ? incoming.role
      : getDefaultReferenceRole(index);
    const influence = Number.isFinite(Number(incoming.influence))
      ? Math.max(1, Number(incoming.influence))
      : buildDefaultImageReference(file, index).influence;

    return {
      role,
      influence,
      priority: index + 1,
      label: incoming.label || file?.name || `Image ${index + 1}`,
    };
  });

  const total = rows.reduce((sum, row) => sum + row.influence, 0) || 1;
  const normalized = rows.map((row) => ({
    ...row,
    influence: Math.max(1, Math.round((row.influence / total) * 100)),
  }));

  const normalizedTotal = normalized.reduce((sum, row) => sum + row.influence, 0);
  if (normalizedTotal !== 100 && normalized[0]) {
    normalized[0].influence = Math.max(1, normalized[0].influence + (100 - normalizedTotal));
  }

  return normalized;
}
