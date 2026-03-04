/**
 * Factory that builds and returns a fully-initialised Fastify instance.
 * Does NOT start listening – safe to import in serverless environments.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';

import { REDIS_URL, allowedOrigins } from './config/env.js';
import routes from './routes/index.js';

export async function buildApp(opts = {}) {
    const fastify = Fastify({
        logger: opts.logger ?? true,
        bodyLimit: 20 * 1024 * 1024, // 20 MB
    });

    // --- Rate Limiting ---
    const rateLimitConfig = {
        global: false,
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: (_request, context) => ({
            code: 429,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down requests to protect provider account health.',
            expiresIn: context.ttl,
        }),
    };

    if (REDIS_URL) {
        const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
        rateLimitConfig.redis = redis;
    }

    await fastify.register(rateLimit, rateLimitConfig);

    // --- Multipart ---
    await fastify.register(multipart, {
        limits: { fileSize: 10 * 1024 * 1024, files: 4 },
    });

    // --- CORS ---
    await fastify.register(cors, {
        origin(origin, callback) {
            if (!origin) {
                // Same-origin or non-browser (curl, server-to-server) — allow.
                callback(null, true);
                return;
            }
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin '${origin}' not allowed`), false);
            }
        },
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    });

    // --- Routes ---
    await fastify.register(routes);

    return fastify;
}
