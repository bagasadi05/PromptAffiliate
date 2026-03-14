import { enforceOpencodeAuth } from '../lib/auth.js';
import { handleGenerate } from '../controllers/generateController.js';
import { handleGenerateTitle } from '../controllers/titleController.js';
import {
    handleGrokVideoStatus,
    handleGenerateGrokVideoPrompt,
    handleStartGrokVideoGeneration,
} from '../controllers/grokController.js';
import { handleGrokPiImage, handleGrokPiVideo } from '../controllers/grokPiController.js';
import { createGrokPiJob, getGrokPiJobStatus, cancelGrokPiJob } from '../controllers/grokpiJobController.js';
import { handleAnalyzePreset, handleAnalyzeProduct, handleAutofillOptions } from '../controllers/analyzeController.js';
import {
    handleHealth,
    handleCapabilities,
    handleGrokPiHealth,
    handleGrokPiGalleryImages,
    handleGrokPiGalleryVideos,
    handleGrokPiStreamVideo,
    handleGrokPiDeleteMedia
} from '../controllers/healthController.js';

export default async function routes(fastify) {
    const requireAuth = async (request, reply) => {
        if (!enforceOpencodeAuth(request, reply)) return reply;
    };

    // --- Public / Diagnostics ---
    fastify.get('/api/health', handleHealth);
    fastify.get('/api/capabilities', handleCapabilities);
    fastify.get('/api/grokpi/health', handleGrokPiHealth);

    // --- GrokPI Gallery & Storage ---
    fastify.get('/api/grokpi/gallery/images', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } }
    }, handleGrokPiGalleryImages);
    fastify.get('/api/grokpi/gallery/videos', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } }
    }, handleGrokPiGalleryVideos);
    // Video stream remains headerless for <video src> compatibility; keep tight rate limits.
    fastify.get('/api/grokpi/stream/video/:filename', {
        config: { rateLimit: { max: 60, timeWindow: '1 minute' } }
    }, handleGrokPiStreamVideo);
    fastify.delete('/api/grokpi/media/:type/:filename', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } }
    }, handleGrokPiDeleteMedia);

    // --- Authenticated & Rate Limited Endpoints ---

    fastify.post('/api/generate', {
        preHandler: requireAuth,
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_HEAVY_REQUESTS || 8), timeWindow: '1 minute' } }
    }, handleGenerate);

    fastify.post('/api/generate-title', {
        preHandler: requireAuth,
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20), timeWindow: '1 minute' } }
    }, handleGenerateTitle);

    fastify.post('/api/generate-grok-video-prompt', {
        preHandler: requireAuth,
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_HEAVY_REQUESTS || 8), timeWindow: '1 minute' } }
    }, handleGenerateGrokVideoPrompt);

    fastify.post('/api/grok-video/start', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }, handleStartGrokVideoGeneration);

    fastify.get('/api/grok-video/status/:requestId', {
        preHandler: requireAuth
    }, handleGrokVideoStatus);

    fastify.post('/api/grokpi/image', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }, handleGrokPiImage);

    fastify.post('/api/grokpi/video', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
    }, handleGrokPiVideo);

    fastify.post('/api/analyze-product', {
        preHandler: requireAuth,
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20), timeWindow: '1 minute' } }
    }, handleAnalyzeProduct);

    fastify.post('/api/analyze-preset', {
        preHandler: requireAuth,
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20), timeWindow: '1 minute' } }
    }, handleAnalyzePreset);

    fastify.post('/api/autofill-options', {
        preHandler: requireAuth,
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20), timeWindow: '1 minute' } }
    }, handleAutofillOptions);

    // --- GrokPi Automation Queue ---
    fastify.post('/api/grokpi/jobs', {
        preHandler: requireAuth,
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }, createGrokPiJob);

    fastify.get('/api/grokpi/jobs/:jobId', {
        preHandler: requireAuth
    }, getGrokPiJobStatus);

    fastify.post('/api/grokpi/jobs/:jobId/cancel', {
        preHandler: requireAuth
    }, cancelGrokPiJob);
}

