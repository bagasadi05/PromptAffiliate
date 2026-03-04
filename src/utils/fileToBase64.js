/**
 * Convert a File object to a base64 data URL string.
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 data URL
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Extract raw base64 string (without data URL prefix).
 * @param {string} dataUrl - Data URL string
 * @returns {string} Raw base64 string
 */
export function extractBase64(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl) return '';
    if (!dataUrl.startsWith('data:')) return dataUrl;
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) return '';
    return dataUrl.slice(commaIndex + 1);
}

export default fileToBase64;
