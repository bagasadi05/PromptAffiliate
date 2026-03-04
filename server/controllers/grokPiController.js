import { z } from 'zod';
import {
    grokPiGenerateImage,
    grokPiGenerateVideo,
    grokPiReloadSso,
    grokPiAdminStatus,
} from '../services/grokpiService.js';

const grokPiImageSchema = z.object({
    prompt: z.string().min(1).max(5000),
    n: z.coerce.number().int().min(1).max(4).optional(),
    aspect_ratio: z.enum(['1:1', '2:3', '3:2', '9:16', '16:9']).optional(),
    response_format: z.enum(['url', 'b64_json']).optional(),
    stream: z.boolean().optional(),
});

const grokPiVideoSchema = z.object({
    prompt: z.string().min(10).max(5000),
    aspect_ratio: z.enum(['1:1', '2:3', '3:2', '9:16', '16:9']).optional(),
    duration_seconds: z.coerce.number().int().refine((v) => v === 6 || v === 10).optional(),
    resolution: z.enum(['480p', '720p']).optional(),
    preset: z.enum(['fun', 'normal', 'spicy', 'custom']).optional(),
    response_format: z.enum(['url', 'b64_json']).optional(),
    image_url: z.string().max(5_000_000).optional(),
    strict_reference: z.boolean().optional(),
});

export async function handleGrokPiImage(request, reply) {
    try {
        const payload = grokPiImageSchema.parse(request.body);
        return await grokPiGenerateImage(payload);
    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            reply.code(error.statusCode || 500).send({ error: error.message || 'Server error.' });
        }
    }
}

export async function handleGrokPiVideo(request, reply) {
    try {
        const payload = grokPiVideoSchema.parse(request.body);
        const hasReferenceImage = Boolean(String(payload.image_url || '').trim());
        const strictReference = payload.strict_reference !== false;

        const isSsoUnavailable = (error) => {
            const message = String(error?.message || '').toLowerCase();
            return message.includes('tidak ada sso') || message.includes('no sso');
        };

        const safePrompt = hasReferenceImage
            ? [
                'STRICT REFERENCE LOCK: Preserve the exact visible details from reference image.',
                'Do not invent unseen body regions. If face/head is not visible in the reference, keep face/head out of frame.',
                'Keep framing aligned to reference crop unless explicitly requested otherwise.',
                payload.prompt,
            ].join('\n\n')
            : payload.prompt;

        try {
            const runVideoGeneration = async () => grokPiGenerateVideo({
                ...payload,
                prompt: safePrompt,
            });

            let result;
            try {
                result = await runVideoGeneration();
            } catch (firstError) {
                if (!isSsoUnavailable(firstError)) {
                    throw firstError;
                }

                request.log.warn('[grokpi] No SSO available, reloading SSO list and retrying once.');
                try {
                    await grokPiReloadSso();
                    result = await runVideoGeneration();
                } catch (secondError) {
                    if (!isSsoUnavailable(secondError)) {
                        throw secondError;
                    }

                    let status;
                    try {
                        status = await grokPiAdminStatus();
                    } catch {
                        status = null;
                    }

                    const dailyLimit = status?.config?.daily_limit;
                    const nextReset = status?.sso?.next_reset_timestamp;
                    const failedCount = status?.sso?.failed_count;
                    const ssoCount = status?.sso?.total_keys;
                    const availabilityHint = [
                        Number.isFinite(ssoCount) ? `total keys: ${ssoCount}` : null,
                        Number.isFinite(failedCount) ? `failed keys: ${failedCount}` : null,
                        Number.isFinite(dailyLimit) ? `daily limit per key: ${dailyLimit}` : null,
                        Number.isFinite(nextReset) ? `next reset timestamp: ${nextReset}` : null,
                    ].filter(Boolean).join(', ');

                    const ssoError = new Error(
                        `GrokPI SSO unavailable. Please refresh your cookie key in .tmp/grokpi/key.txt or wait for quota reset.${availabilityHint ? ` (${availabilityHint})` : ''}`,
                    );
                    ssoError.statusCode = 429;
                    throw ssoError;
                }
            }

            return {
                ...result,
                referenceMode: hasReferenceImage ? 'attached' : 'none',
            };
        } catch (error) {
            const shouldRetryWithoutImage = hasReferenceImage
                && error?.statusCode === 502
                && String(error?.message || '').includes('app_chat failed (400)');

            if (!shouldRetryWithoutImage) {
                throw error;
            }

            if (strictReference) {
                const strictError = new Error('Reference image was rejected by Grok upstream. Strict reference mode prevents prompt-only fallback.');
                strictError.statusCode = 422;
                throw strictError;
            }

            request.log.warn('[grokpi] image_url attachment rejected by upstream app_chat (400). Retrying without image_url.');
            const fallbackResult = await grokPiGenerateVideo({
                ...payload,
                image_url: undefined,
                prompt: safePrompt,
            });

            return {
                ...fallbackResult,
                warning: 'Reference image attachment was rejected by Grok upstream. Video generated with prompt-only fallback.',
                referenceMode: 'prompt-only-fallback',
            };
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            reply.code(400).send({ error: 'Validation Error', details: error.errors });
        } else {
            request.log.error(error);
            reply.code(error.statusCode || 500).send({ error: error.message || 'Server error.' });
        }
    }
}
