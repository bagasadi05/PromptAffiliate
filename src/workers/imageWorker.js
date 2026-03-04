const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.85;

self.onmessage = async (e) => {
    const { id, file, options = {} } = e.data;

    try {
        const maxWidth = options.maxWidth || MAX_WIDTH;
        const maxHeight = options.maxHeight || MAX_HEIGHT;
        const quality = options.quality || QUALITY;

        // Skip compression for small files (< 500KB)
        if (file.size < 500 * 1024) {
            self.postMessage({ id, result: { file, originalSize: file.size, compressedSize: file.size, ratio: 1 } });
            return;
        }

        const imgBitmap = await createImageBitmap(file);

        let width = imgBitmap.width;
        let height = imgBitmap.height;

        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgBitmap, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const outputQuality = file.type === 'image/png' ? undefined : quality;

        const blob = await canvas.convertToBlob({ type: outputType, quality: outputQuality });

        const compressedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
        });

        self.postMessage({
            id,
            result: {
                file: compressedFile,
                originalSize: file.size,
                compressedSize: compressedFile.size,
                ratio: (compressedFile.size / file.size).toFixed(2)
            }
        });

        imgBitmap.close();
    } catch (error) {
        self.postMessage({ id, error: error.message });
    }
};
