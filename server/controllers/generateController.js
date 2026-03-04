import { z } from 'zod';
import { parseMultipartData } from '../lib/multipart.js';
import {
    buildSystemPrompt,
    buildUserPrompt,
    postProcessPromptOutput,
    evaluatePromptQuality,
} from '../services/promptService.js';
import { callPromptModel } from '../services/orchestratorService.js';

const referenceRoles = ['identity', 'outfit', 'pose', 'background', 'style'];

// We no longer validate imageBase64 array here, because it's extracted from multipart files.
const generateSchema = z.object({
    preset: z.object({
        name: z.string(),
        vibe: z.string().optional(),
        bpmRange: z.string().optional(),
        energyLevel: z.string().optional(),
        cameraStyle: z.string().optional(),
        signatureMoves: z.array(z.string()).optional(),
    }).passthrough(),
    options: z.object({
        sceneCount: z.number().or(z.string()).optional(),
        outputLanguage: z.string().optional(),
        realismLevel: z.string().optional(),
        cameraDistance: z.string().optional(),
        background: z.string().optional(),
        lighting: z.string().optional(),
        includeNegativePrompt: z.boolean().optional(),
        voiceStyle: z.string().optional(),
        voiceLanguage: z.string().optional(),
        voiceScript: z.string().optional(),
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

export async function handleGenerate(request, reply) {
    try {
        const { files, fields } = await parseMultipartData(request);

        if (files.length === 0) {
            return reply.code(400).send({ error: 'Validation Error', details: 'No images provided.' });
        }
        if (files.length > 4) {
            return reply.code(400).send({ error: 'Validation Error', details: 'Maximum 4 images allowed.' });
        }

        // Validate extracted fields
        const body = generateSchema.parse(fields);
        const { preset, options, imageReferences } = body;

        const images = files.map(f => f.base64);
        const mimeTypes = files.map(f => f.mimetype);

        const optionsWithImageCount = { ...options, _imageCount: images.length };
        const systemPrompt = buildSystemPrompt(optionsWithImageCount);
        const userPrompt = buildUserPrompt(preset, optionsWithImageCount, imageReferences);

        const rawText = await callPromptModel(systemPrompt, userPrompt, images, mimeTypes, {
            ...options,
            fallbackOnGeminiLimit: true,
        });

        const text = postProcessPromptOutput(rawText, options);
        const quality = evaluatePromptQuality(text, optionsWithImageCount);

        return { text, quality };

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
