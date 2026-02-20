/**
 * Client-side image compression before sending to API.
 * Resizes large images and compresses quality to reduce bandwidth.
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.85;

/**
 * Compress an image file, returning a new smaller File.
 * @param {File} file - Original image file
 * @param {Object} opts - Options
 * @param {number} opts.maxWidth - Max width (default 1920)
 * @param {number} opts.maxHeight - Max height (default 1920)
 * @param {number} opts.quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<{file: File, originalSize: number, compressedSize: number, ratio: number}>}
 */
export async function compressImage(file, opts = {}) {
    const maxWidth = opts.maxWidth || MAX_WIDTH;
    const maxHeight = opts.maxHeight || MAX_HEIGHT;
    const quality = opts.quality || QUALITY;

    const originalSize = file.size;

    // Skip compression for small files (< 500KB)
    if (originalSize < 500 * 1024) {
        return { file, originalSize, compressedSize: originalSize, ratio: 1 };
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Calculate new dimensions
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Preserve original format — PNG keeps transparency
            const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const outputQuality = file.type === 'image/png' ? undefined : quality;

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Compression failed'));
                        return;
                    }
                    const compressedFile = new File([blob], file.name, {
                        type: outputType,
                        lastModified: Date.now(),
                    });
                    resolve({
                        file: compressedFile,
                        originalSize,
                        compressedSize: compressedFile.size,
                        ratio: (compressedFile.size / originalSize).toFixed(2),
                    });
                },
                outputType,
                outputQuality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for compression'));
        };

        img.src = url;
    });
}

/**
 * Get image dimensions from a file
 * @param {File} file
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to read image dimensions'));
        };
        img.src = url;
    });
}

export default compressImage;
