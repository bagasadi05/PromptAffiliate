import { grokPiQueueObj } from '../services/grokpiJobQueue.js';

export async function createGrokPiJob(request, reply) {
    try {
        const bodyPart = await request.file();

        if (!bodyPart) {
            return reply.status(400).send({ error: { code: 'NO_IMAGE_PROVIDED', message: 'Gambar referensi wajib disertakan.' } });
        }

        const imageBuffer = await bodyPart.toBuffer();
        if (imageBuffer.length > 10 * 1024 * 1024) {
            return reply.status(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Gambar terlalu besar (Maks 10MB).' } });
        }

        const fields = bodyPart.fields || {};

        const extractString = (key, defaultVal = '') => (fields[key]?.value ? String(fields[key].value) : defaultVal);
        const extractNum = (key, defaultVal = 0) => (fields[key]?.value ? Number(fields[key].value) : defaultVal);
        const extractBool = (key, defaultVal = false) => (fields[key]?.value ? fields[key].value === 'true' : defaultVal);

        const config = {
            imageBuffer,
            mimeType: bodyPart.mimetype,
            imageName: bodyPart.filename,
            sceneCount: extractNum('sceneCount', 4),
            targetDuration: extractNum('targetDuration', 6),
            titleCount: extractNum('titleCount', 3),
            titleTone: extractString('titleTone', 'viral'),
            renderVideo: extractBool('renderVideo', true),
            aspectRatio: extractString('aspectRatio', 'auto'),
            resolution: extractString('resolution', '720p'),
            motionStyle: extractString('motionStyle', ''),
            customInstructions: extractString('customInstructions', ''),
            subjectDescription: extractString('subjectDescription', ''),
            titleCustomInstructions: extractString('titleCustomInstructions', ''),
            productFocus: extractString('productFocus', 'hijab'),
            allowTextOverlay: extractBool('allowTextOverlay', false),
            stopOnError: extractBool('stopOnError', false),
            maxRetries: extractNum('maxRetries', 2),
            allowPromptOnlyFallback: extractBool('allowPromptOnlyFallback', false),
            presetName: extractString('presetName', 'Standard'),
            presetVibe: extractString('presetVibe', 'UGC'),
            lang: extractString('lang', 'ID')
        };

        const jobId = await grokPiQueueObj.createJob(config);

        return reply.status(202).send({
            jobId,
            message: 'Pipeline Automasi berhasil dimasukkan ke Antrean. Polling for status.',
        });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal membuat antrean.' } });
    }
}

export async function getGrokPiJobStatus(request, reply) {
    const { jobId } = request.params;

    if (!jobId) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Job ID tidak valid.' } });
    }

    const jobStatus = await grokPiQueueObj.getJob(jobId);

    if (!jobStatus) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Job tidak ditemukan atau telah kadaluarsa.' } });
    }

    return reply.status(200).send(jobStatus);
}

export async function cancelGrokPiJob(request, reply) {
    const { jobId } = request.params;

    if (!jobId) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Job ID tidak valid.' } });
    }

    const isCancelled = await grokPiQueueObj.cancelJob(jobId);

    if (!isCancelled) {
        return reply.status(400).send({ error: { code: 'CANNOT_CANCEL', message: 'Job tidak bisa dibatalkan atau sudah selesai.' } });
    }

    return reply.status(200).send({ message: 'Job berhasil dibatalkan.', status: 'cancelled' });
}
