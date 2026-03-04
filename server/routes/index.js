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
import { handleAnalyzePreset, handleAnalyzeProduct } from '../controllers/analyzeController.js';
import {
    handleHealth,
    handleCapabilities,
    handleGrokPiHealth,
    handleGrokPiGalleryImages,
    handleGrokPiGalleryVideos,
    handleGrokPiStreamVideo,
    handleGrokPiDeleteMedia
} from '../controllers/healthController.js';

export default async function routes(fastify, options) {
    // --- Public / Diagnostics ---
    fastify.get('/api/health', handleHealth);
    fastify.get('/api/capabilities', handleCapabilities);
    fastify.get('/api/grokpi/health', handleGrokPiHealth);

    // --- GrokPI Gallery & Storage (No limits currently) ---
    fastify.get('/api/grokpi/gallery/images', handleGrokPiGalleryImages);
    fastify.get('/api/grokpi/gallery/videos', handleGrokPiGalleryVideos);
    fastify.get('/api/grokpi/stream/video/:filename', handleGrokPiStreamVideo);
    fastify.delete('/api/grokpi/media/:type/:filename', handleGrokPiDeleteMedia);

    // --- Authenticated & Rate Limited Endpoints ---
    // Helper to apply middleware inline
    const withAuthAndLimit = (tier) => async (request, reply) => {
        if (!enforceOpencodeAuth(request, reply)) return reply;
        // We will use standard fastify rate-limit plugin instead of custom limit enforcing
        // For now we just check auth. Fastify rate limit handles limits natively per route.
    };

    fastify.post('/api/generate', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_HEAVY_REQUESTS || 8), timeWindow: '1 minute' } }
    }, handleGenerate);

    fastify.post('/api/generate-title', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20), timeWindow: '1 minute' } }
    }, handleGenerateTitle);

    fastify.post('/api/generate-grok-video-prompt', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_HEAVY_REQUESTS || 8), timeWindow: '1 minute' } }
    }, handleGenerateGrokVideoPrompt);

    fastify.post('/api/grok-video/start', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }, handleStartGrokVideoGeneration);

    fastify.get('/api/grok-video/status/:requestId', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply)
    }, handleGrokVideoStatus);

    fastify.post('/api/grokpi/image', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }, handleGrokPiImage);

    fastify.post('/api/grokpi/video', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
    }, handleGrokPiVideo);

    fastify.post('/api/analyze-product', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20), timeWindow: '1 minute' } }
    }, handleAnalyzeProduct);

    fastify.post('/api/analyze-preset', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 20), timeWindow: '1 minute' } }
    }, handleAnalyzePreset);

    // --- GrokPi Automation Queue ---
    fastify.post('/api/grokpi/jobs', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply),
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }, createGrokPiJob);

    fastify.get('/api/grokpi/jobs/:jobId', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply)
    }, getGrokPiJobStatus);

    fastify.post('/api/grokpi/jobs/:jobId/cancel', {
        preHandler: async (req, reply) => await enforceOpencodeAuth(req, reply)
    }, cancelGrokPiJob);
}

