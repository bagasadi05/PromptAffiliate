import { z } from 'zod';
import { parseMultipartData } from '../lib/multipart.js';
import {
    buildGrokSystemPrompt,
    buildGrokUserPrompt,
    postProcessGrokOutput,
} from '../services/grokPromptService.js';
import { callPromptModel } from '../services/orchestratorService.js';
import { startXaiVideoGeneration, getXaiVideoGenerationStatus } from '../services/xaiService.js';

const referenceRoles = ['identity', 'outfit', 'pose', 'background', 'style'];

// We no longer validate imageBase64 array here natively, as we accept multipart
const generateGrokSchema = z.object({
    preset: z.object({
        name: z.string().optional(),
        vibe: z.string().optional(),
        grokPromptIdea: z.string().optional(),
    }).passthrough().optional(),
    options: z.object({
        sceneCount: z.coerce.number().optional(),
        outputLanguage: z.string().optional(),
        realismLevel: z.string().optional(),
        cameraDistance: z.string().optional(),
        background: z.string().optional(),
        lighting: z.string().optional(),
        customInstructions: z.string().optional(),
        subjectDescription: z.string().optional(),
        creativity: z.number().min(0).max(100).optional(),
    }).passthrough(),
    imageReferences: z.array(
        z.object({
            role: z.enum(referenceRoles).optional(),
            influence: z.coerce.number().min(1).max(100).optional(),
            priority: z.coerce.number().int().positive().optional(),
            label: z.string().optional(),
        }).passthrough(),
    ).max(8).optional(),
});

export async function handleGenerateGrokVideoPrompt(request, reply) {
    try {
        const { files, fields } = await parseMultipartData(request);

        if (files.length === 0) {
            return reply.code(400).send({ error: 'Validation Error', details: 'No images provided.' });
        }
        if (files.length > 4) {
            return reply.code(400).send({ error: 'Validation Error', details: 'Maximum 4 images allowed.' });
        }

        const body = generateGrokSchema.parse(fields);
        const { preset, options, imageReferences } = body;

        const images = files.map(f => f.base64);
        const mimeTypes = files.map(f => f.mimetype);

        const systemPrompt = buildGrokSystemPrompt(options);
        const userPrompt = buildGrokUserPrompt(preset, options, imageReferences);

        const rawText = await callPromptModel(systemPrompt, userPrompt, images, mimeTypes, {
            ...options,
            fallbackOnGeminiLimit: true,
        });
        const text = postProcessGrokOutput(rawText);

        return { text };

    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            const statusCode = error.statusCode || 500;
            reply.code(statusCode).send({ error: error.message || 'Server error.' });
        }
    }
}

const startGrokVideoGenerationSchema = z.object({
    prompt: z.string().min(10).max(5000),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
    videoBase64: z.string().optional(),
    videoMimeType: z.string().optional(),
    duration: z.coerce.number().int().min(1).max(15).optional(),
    aspectRatio: z.string().regex(/^\d+:\d+$/).optional(),
    resolution: z.enum(['480p', '720p']).optional(),
    model: z.string().optional(),
}).refine((data) => Boolean(data.imageBase64 || data.videoBase64), {
    message: 'Either imageBase64 or videoBase64 is required.',
    path: ['imageBase64'],
});

export async function handleStartGrokVideoGeneration(request, reply) {
    try {
        const body = startGrokVideoGenerationSchema.parse(request.body);
        const result = await startXaiVideoGeneration(body);

        return {
            requestId: result.requestId,
            status: result.status,
            xaiStatus: result.xaiStatus,
            video: result.video,
            error: result.error,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            const statusCode = error.statusCode || 500;
            reply.code(statusCode).send({ error: error.message || 'Server error.' });
        }
    }
}

const grokVideoStatusParamsSchema = z.object({
    requestId: z.string().min(1),
});

export async function handleGrokVideoStatus(request, reply) {
    try {
        const { requestId } = grokVideoStatusParamsSchema.parse(request.params);
        const result = await getXaiVideoGenerationStatus(requestId);

        return {
            requestId: result.requestId || requestId,
            status: result.status,
            xaiStatus: result.xaiStatus,
            video: result.video,
            error: result.error,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            const statusCode = error.statusCode || 500;
            reply.code(statusCode).send({ error: error.message || 'Server error.' });
        }
    }
}
