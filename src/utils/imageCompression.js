/**
 * Client-side image compression before sending to API.
 * Resizes large images and compresses quality to reduce bandwidth.
 * Offloads processing to a Web Worker to prevent UI blocking.
 */

let worker;
const promises = new Map();
let msgId = 0;

function initWorker() {
    if (!worker && typeof window !== 'undefined') {
        worker = new Worker(new URL('../workers/imageWorker.js', import.meta.url), { type: 'module' });
        worker.onmessage = (e) => {
            const { id, result, error } = e.data;
            const p = promises.get(id);
            if (!p) return;
            promises.delete(id);
            if (error) p.reject(new Error(error));
            else p.resolve(result);
        };
    }
}

/**
 * Compress an image file, returning a new smaller File via Web Worker.
 * @param {File} file - Original image file
 * @param {Object} opts - Options
 * @param {number} opts.maxWidth - Max width (default 1920)
 * @param {number} opts.maxHeight - Max height (default 1920)
 * @param {number} opts.quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<{file: File, originalSize: number, compressedSize: number, ratio: number}>}
 */
export async function compressImage(file, opts = {}) {
    if (typeof window === 'undefined') {
        return { file, originalSize: file.size, compressedSize: file.size, ratio: 1 };
    }

    // Skip compression for small files (< 500KB)
    if (file.size < 500 * 1024) {
        return { file, originalSize: file.size, compressedSize: file.size, ratio: 1 };
    }

    initWorker();

    return new Promise((resolve, reject) => {
        const id = msgId++;
        promises.set(id, { resolve, reject });
        worker.postMessage({ id, file, options: opts });
    });
}

/**
 * Get image dimensions from a file
 * @param {File} file
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
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
