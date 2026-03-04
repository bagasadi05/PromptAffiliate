import Fastify from 'fastify';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { handleHealth } from '../controllers/healthController.js';

describe('healthController', () => {
    let fastify;

    beforeAll(async () => {
        fastify = Fastify({ logger: false });
        fastify.get('/api/health', handleHealth);
        await fastify.ready();
    });

    afterAll(async () => {
        await fastify.close();
    });

    it('GET /api/health should return status ok', async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/api/health'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.ok).toBe(true);
    });
});
