import { normalizeImageReferences } from './imageReferences';

function sanitizeName(value) {
    return String(value || '').trim().toLowerCase();
}

export function buildPromptInputMeta(files = [], imageReferences = []) {
    const safeFiles = Array.isArray(files) ? files : [];
    const normalizedReferences = normalizeImageReferences(safeFiles, imageReferences);

    const imageNames = safeFiles.map((file) => String(file?.name || '').trim()).filter(Boolean);
    const signatureParts = safeFiles.map((file, index) => {
        const reference = normalizedReferences[index];
        return [
            sanitizeName(file?.name),
            Number(file?.size || 0),
            Number(file?.lastModified || 0),
            sanitizeName(file?.type),
            sanitizeName(reference?.role),
            Number(reference?.influence || 0),
            Number(reference?.priority || 0),
        ].join(':');
    });

    return {
        signature: signatureParts.join('|'),
        imageCount: safeFiles.length,
        imageNames,
        referenceSummary: normalizedReferences.map((reference) => ({
            role: reference.role,
            influence: reference.influence,
            priority: reference.priority,
            label: reference.label,
        })),
    };
}
