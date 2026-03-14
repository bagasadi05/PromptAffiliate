import { z } from 'zod';
import { parseMultipartData } from '../lib/multipart.js';
import { callGemini } from '../services/geminiService.js';
import {
    buildProductAnalysisSystemPrompt,
    buildProductAnalysisUserPrompt,
    parseProductAnalysisOutput,
} from '../services/productAnalysisService.js';
import {
    buildPresetAnalysisSystemPrompt,
    buildPresetAnalysisUserPrompt,
    parsePresetAnalysisOutput,
} from '../services/presetAnalysisService.js';
import {
    buildOptionsAutofillSystemPrompt,
    buildOptionsAutofillUserPrompt,
    parseOptionsAutofillOutput,
} from '../services/optionsAutofillService.js';

const analyzeProductSchema = z.object({
    language: z.enum(['ID', 'EN']).optional(),
    customContext: z.string().optional(),
    creativity: z.coerce.number().min(0).max(100).optional(),
}).passthrough();

export async function handleAnalyzeProduct(request, reply) {
    try {
        const { files, fields } = await parseMultipartData(request);

        if (files.length === 0) {
            return reply.code(400).send({ error: 'Validation Error', details: 'No image provided.' });
        }

        const input = analyzeProductSchema.parse(fields);
        const image = files[0].base64;
        const imageMimeType = files[0].mimetype;

        const systemPrompt = buildProductAnalysisSystemPrompt(input);
        const userPrompt = buildProductAnalysisUserPrompt(input);
        const rawText = await callGemini(systemPrompt, userPrompt, [image], [imageMimeType], input);
        const analysis = parseProductAnalysisOutput(rawText, input);

        return { analysis };
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

const analyzePresetSchema = z.object({
    language: z.enum(['ID', 'EN']).optional(),
}).passthrough();

const autofillOptionsSchema = z.object({
    language: z.enum(['ID', 'EN']).optional(),
    mode: z.enum(['recommended', 'all-safe']).optional(),
    preset: z.record(z.any()).optional(),
    options: z.record(z.any()).optional(),
    preferenceMemory: z.object({
        avoidTerms: z.array(z.string()).optional(),
        steeringNotes: z.array(z.string()).optional(),
    }).passthrough().optional(),
}).passthrough();

function normalizeAutofillFields(fields = {}) {
    const nextFields = { ...fields };

    if (typeof nextFields.preferenceMemory === 'string') {
        try {
            nextFields.preferenceMemory = JSON.parse(nextFields.preferenceMemory);
        } catch {
            nextFields.preferenceMemory = undefined;
        }
    }

    return nextFields;
}

export async function handleAnalyzePreset(request, reply) {
    try {
        const { files, fields } = await parseMultipartData(request);

        if (files.length === 0) {
            return reply.code(400).send({ error: 'Validation Error', details: 'No image provided.' });
        }

        const input = analyzePresetSchema.parse(fields);
        const image = files[0].base64;
        const imageMimeType = files[0].mimetype;

        const systemPrompt = buildPresetAnalysisSystemPrompt(input);
        const userPrompt = buildPresetAnalysisUserPrompt();
        // creativity 40 matches original behavior
        const rawText = await callGemini(systemPrompt, userPrompt, [image], [imageMimeType], { creativity: 40 });
        const analysis = parsePresetAnalysisOutput(rawText);

        return { analysis };
    } catch (error) {
        request.log.error('[analyze-preset] ' + error.message);
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            const statusCode = error.statusCode || 500;
            reply.code(statusCode).send({ error: error.message || 'Server error.' });
        }
    }
}

export async function handleAutofillOptions(request, reply) {
    try {
        const { files, fields } = await parseMultipartData(request);

        if (files.length === 0) {
            return reply.code(400).send({ error: 'Validation Error', details: 'No image provided.' });
        }

        const input = autofillOptionsSchema.parse(normalizeAutofillFields(fields));
        const images = files.slice(0, 3).map((file) => file.base64);
        const imageMimeTypes = files.slice(0, 3).map((file) => file.mimetype);

        const systemPrompt = buildOptionsAutofillSystemPrompt(input);
        const userPrompt = buildOptionsAutofillUserPrompt(input);
        const rawText = await callGemini(systemPrompt, userPrompt, images, imageMimeTypes, { creativity: 45 });
        const suggestions = parseOptionsAutofillOutput(rawText);

        return { suggestions };
    } catch (error) {
        request.log.error('[autofill-options] ' + error.message);
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            const statusCode = error.statusCode || 500;
            reply.code(statusCode).send({ error: error.message || 'Server error.' });
        }
    }
}
