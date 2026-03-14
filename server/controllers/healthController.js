import { grokPiHealth, grokPiListImages, grokPiListVideos, grokPiFetchVideoStream, grokPiDeleteImage, grokPiDeleteVideo } from '../services/grokpiService.js';
import { getGeminiApiKey } from '../config/env.js';
import { z } from 'zod';
import { Readable } from 'node:stream';

export async function handleHealth() {
    return { ok: true };
}

export async function handleCapabilities() {
    let grokPiEnabled = false;
    try {
        await grokPiHealth();
        grokPiEnabled = true;
    } catch {
        grokPiEnabled = false;
    }

    return {
        geminiEnabled: Boolean(getGeminiApiKey()),
        grokPiEnabled,
    };
}

export async function handleGrokPiHealth(request, reply) {
    try {
        return await grokPiHealth();
    } catch (error) {
        request.log.error(error);
        reply.code(error.statusCode || 500).send({ error: error.message || 'Server error.' });
    }
}

function normalizeMediaFilename(input) {
    let value = String(input || '').trim();
    if (!value) return '';

    try {
        value = decodeURIComponent(value);
    } catch {
        // Keep original value when decoding fails.
    }

    if (/^https?:\/\//i.test(value)) {
        try {
            value = new URL(value).pathname;
        } catch {
            // Keep original value when URL parsing fails.
        }
    }

    const normalized = value.replace(/\\/g, '/').split('/').filter(Boolean).pop();
    return String(normalized || '').trim();
}

const grokPiListSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
});

export async function handleGrokPiGalleryImages(request, reply) {
    try {
        const { limit = 24, cursor } = grokPiListSchema.parse(request.query || {});
        return await grokPiListImages(limit, cursor);
    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            reply.code(error.statusCode || 500).send({ error: error.message || 'Server error.' });
        }
    }
}

export async function handleGrokPiGalleryVideos(request, reply) {
    try {
        const { limit = 24, cursor } = grokPiListSchema.parse(request.query || {});
        const data = await grokPiListVideos(limit, cursor);
        const videos = Array.isArray(data?.videos)
            ? data.videos.map((video) => {
                const safeFilename = normalizeMediaFilename(video?.filename || video?.url || '');
                return {
                    ...video,
                    filename: safeFilename || video?.filename,
                    url: safeFilename ? `/api/grokpi/stream/video/${encodeURIComponent(safeFilename)}` : video?.url,
                };
            })
            : [];

        return {
            ...data,
            videos,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            reply.code(error.statusCode || 500).send({ error: error.message || 'Server error.' });
        }
    }
}

export async function handleGrokPiStreamVideo(request, reply) {
    try {
        const filename = normalizeMediaFilename(request.params?.filename);
        if (!filename) {
            reply.code(400).send({ error: 'Filename is required.' });
            return;
        }

        const upstream = await grokPiFetchVideoStream(filename, request.headers.range);
        const statusCode = upstream.status === 206 ? 206 : 200;
        const contentType = upstream.headers.get('content-type') || 'video/mp4';
        const contentLength = upstream.headers.get('content-length');
        const contentRange = upstream.headers.get('content-range');
        const cacheControl = upstream.headers.get('cache-control');

        reply.code(statusCode);
        reply.header('Content-Type', contentType);
        reply.header('Content-Disposition', `inline; filename="${filename}"`);
        reply.header('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
        if (contentLength) reply.header('Content-Length', contentLength);
        if (contentRange) reply.header('Content-Range', contentRange);
        if (cacheControl) reply.header('Cache-Control', cacheControl);

        if (!upstream.body) {
            reply.code(502).send({ error: 'Empty stream response from GrokPI video source.' });
            return;
        }

        return reply.send(Readable.fromWeb(upstream.body));
    } catch (error) {
        request.log.error(error);
        reply.code(error.statusCode || 500).send({ error: error.message || 'Server error.' });
    }
}

const grokPiDeleteParamsSchema = z.object({
    type: z.enum(['image', 'video']),
});

export async function handleGrokPiDeleteMedia(request, reply) {
    try {
        const { type } = grokPiDeleteParamsSchema.parse(request.params);
        const filename = normalizeMediaFilename(request.params?.filename);
        if (!filename) {
            reply.code(400).send({ error: 'Filename is required.' });
            return;
        }

        if (type === 'image') return await grokPiDeleteImage(filename);
        return await grokPiDeleteVideo(filename);
    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            reply.code(error.statusCode || 500).send({ error: error.message || 'Server error.' });
        }
    }
}
