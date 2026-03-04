import { z } from 'zod';
import {
    buildTitleSystemPrompt,
    buildTitleUserPrompt,
    postProcessTitles,
} from '../services/titleService.js';
import { callGemini } from '../services/geminiService.js';

const generateTitleSchema = z.object({
    productName: z.string().min(2),
    productCategory: z.string().optional(),
    targetAudience: z.string().optional(),
    keyBenefits: z.array(z.string()).max(12).optional(),
    keywords: z.array(z.string()).max(20).optional(),
    tone: z.string().optional(),
    language: z.enum(['ID', 'EN']).optional(),
    titleCount: z.coerce.number().int().min(3).max(30).optional(),
    includeEmoji: z.boolean().optional(),
    maxLength: z.coerce.number().int().min(30).max(120).optional(),
    customInstructions: z.string().optional(),
    creativity: z.coerce.number().min(0).max(100).optional(),
}).passthrough();

export async function handleGenerateTitle(request, reply) {
    try {
        const input = generateTitleSchema.parse(request.body);

        const systemPrompt = buildTitleSystemPrompt(input);
        const userPrompt = buildTitleUserPrompt(input);
        const rawText = await callGemini(systemPrompt, userPrompt, [], [], input);
        const titles = postProcessTitles(rawText, input);

        return {
            text: titles.join('\n'),
            titles,
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
