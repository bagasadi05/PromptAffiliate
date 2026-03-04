import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import * as grokpiJobController from '../controllers/grokpiJobController.js';
import { grokPiQueueObj } from '../services/grokpiJobQueue.js';

vi.mock('../services/grokpiJobQueue.js', () => ({
    grokPiQueueObj: {
        createJob: vi.fn(),
        getJob: vi.fn(),
        cancelJob: vi.fn()
    }
}));

describe('GrokPi Job Controller', () => {
    let fastify;

    beforeEach(async () => {
        fastify = Fastify();
        await fastify.register(multipart, {
            limits: { fileSize: 10 * 1024 * 1024 }
        });

        fastify.post('/api/grokpi/jobs', grokpiJobController.createGrokPiJob);
        fastify.get('/api/grokpi/jobs/:jobId', grokpiJobController.getGrokPiJobStatus);
        fastify.post('/api/grokpi/jobs/:jobId/cancel', grokpiJobController.cancelGrokPiJob);

        vi.clearAllMocks();
    });

    it('should return 400 if no image is provided', async () => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/api/grokpi/jobs',
            // No body file
        });

        expect(response.statusCode).toBe(400);
        // We know it expects multipart
    });

    it('should retrieve job status', async () => {
        grokPiQueueObj.getJob.mockResolvedValue({ status: 'JOB_QUEUED', id: '123' });

        const response = await fastify.inject({
            method: 'GET',
            url: '/api/grokpi/jobs/123'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).status).toBe('JOB_QUEUED');
    });

    it('should return 404 for missing job', async () => {
        grokPiQueueObj.getJob.mockResolvedValue(null);

        const response = await fastify.inject({
            method: 'GET',
            url: '/api/grokpi/jobs/999'
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.payload).error.code).toBe('NOT_FOUND');
    });

    it('should cancel a queue job', async () => {
        grokPiQueueObj.cancelJob.mockResolvedValue(true);

        const response = await fastify.inject({
            method: 'POST',
            url: '/api/grokpi/jobs/123/cancel'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).status).toBe('cancelled');
    });
});
