import { z } from 'zod';
import { parseMultipartData } from '../lib/multipart.js';
import {
    buildSystemPrompt,
    buildUserPrompt,
    buildStructuredRepairPrompt,
    normalizeStructuredRepairOutput,
    postProcessPromptOutput,
    evaluatePromptQuality,
} from '../services/promptService.js';
import { callPromptModel } from '../services/orchestratorService.js';

const referenceRoles = ['identity', 'outfit', 'pose', 'background', 'style'];
const AUTO_REPAIR_WARNING_CODES = new Set([
    'product_name_missing',
    'avoid_terms_detected',
    'user_intent_missing',
    'scene_pin_missing',
    'scene_avoid_terms_detected',
    'scene_requested_terms_missing',
]);
const AUTO_REPAIR_CHECK_IDS = new Set([
    'product_name_presence',
    'user_intent_alignment',
    'scene_pin_constraints',
]);
const JUDGE_CRITICAL_CHECK_IDS = new Set([
    'scene_count',
    'product_name_presence',
    'user_intent_alignment',
    'scene_pin_constraints',
]);
const JUDGE_HIGH_SEVERITY_CODES = new Set([
    'product_name_missing',
    'avoid_terms_detected',
    'scene_pin_missing',
    'scene_avoid_terms_detected',
]);

function shouldAutoRepair(quality) {
    if (!quality || typeof quality !== 'object') return false;
    if (Number(quality.score) >= 90) return false;

    const failedCriticalCheck = Array.isArray(quality.checks)
        && quality.checks.some((check) => AUTO_REPAIR_CHECK_IDS.has(check.id) && !check.passed);
    const hasCriticalWarning = Array.isArray(quality.warnings)
        && quality.warnings.some((warning) => AUTO_REPAIR_WARNING_CODES.has(warning.code));

    return failedCriticalCheck || hasCriticalWarning;
}

function buildAutoRepairFeedback(quality, options = {}) {
    const lines = [];
    const productName = String(options.productName || '').trim();

    if (Array.isArray(quality?.warnings)) {
        quality.warnings.forEach((warning) => {
            if (warning.code === 'product_name_missing' && productName) {
                lines.push(`Mention the exact product name "${productName}" earlier and keep it visible in the CTA scene.`);
            }
            if (warning.code === 'avoid_terms_detected' || warning.code === 'scene_avoid_terms_detected') {
                lines.push(`Remove banned or discouraged elements flagged by the evaluator: ${warning.message}`);
            }
            if (warning.code === 'user_intent_missing' || warning.code === 'scene_requested_terms_missing') {
                lines.push(`Reflect the missing requested selling points or must-include beats more explicitly: ${warning.message}`);
            }
            if (warning.code === 'scene_pin_missing') {
                lines.push(`Honor the pinned scene requirement exactly as specified: ${warning.message}`);
            }
        });
    }

    if (Array.isArray(quality?.sceneAlignment)) {
        quality.sceneAlignment.forEach((item) => {
            if (Array.isArray(item.missingPinnedTerms) && item.missingPinnedTerms.length > 0 && item.pinnedInstruction) {
                lines.push(`Scene ${item.scene} must include this pinned instruction exactly: ${item.pinnedInstruction}.`);
            } else if (item.status === 'missing') {
                lines.push(`Scene ${item.scene} must carry at least one requested selling point or must-include beat.`);
            } else if (item.status === 'blocked' && Array.isArray(item.violatedAvoidTerms) && item.violatedAvoidTerms.length > 0) {
                lines.push(`Scene ${item.scene} must remove these avoided elements: ${item.violatedAvoidTerms.join(', ')}.`);
            }
        });
    }

    return [...new Set(lines.map((line) => String(line || '').trim()).filter(Boolean))].slice(0, 8).join('\n');
}

async function generatePromptCandidate({ preset, options, imageReferences, images, mimeTypes, structuredRepair = false }) {
    const optionsWithImageCount = { ...options, _imageCount: images.length };
    const systemPrompt = buildSystemPrompt(optionsWithImageCount);
    const userPrompt = structuredRepair
        ? buildStructuredRepairPrompt(preset, optionsWithImageCount, imageReferences)
        : buildUserPrompt(preset, optionsWithImageCount, imageReferences);

    const rawText = await callPromptModel(systemPrompt, userPrompt, images, mimeTypes, {
        ...options,
        fallbackOnGeminiLimit: true,
    });

    const normalizedStructuredText = structuredRepair
        ? normalizeStructuredRepairOutput(rawText, options)
        : '';
    const text = postProcessPromptOutput(normalizedStructuredText || rawText, options);
    const quality = evaluatePromptQuality(text, optionsWithImageCount);

    return { text, quality };
}

function judgePromptCandidate(candidate, source = 'primary') {
    const quality = candidate?.quality || {};
    const checks = Array.isArray(quality.checks) ? quality.checks : [];
    const warnings = Array.isArray(quality.warnings) ? quality.warnings : [];
    const failedCriticalChecks = checks
        .filter((check) => JUDGE_CRITICAL_CHECK_IDS.has(check.id) && !check.passed)
        .map((check) => check.id);
    const highSeverityWarnings = warnings
        .filter((warning) => JUDGE_HIGH_SEVERITY_CODES.has(warning.code) || warning.severity === 'high')
        .map((warning) => warning.code);
    const mediumWarnings = warnings.filter((warning) => warning.severity === 'medium').length;
    const baseScore = Number(quality.score) || 0;
    const judgeScore = baseScore
        - (failedCriticalChecks.length * 14)
        - (highSeverityWarnings.length * 8)
        - (mediumWarnings * 3);

    return {
        source,
        judgeScore,
        baseScore,
        failedCriticalChecks,
        highSeverityWarnings,
        mediumWarnings,
    };
}

function chooseBestCandidate(candidates) {
    const judgedCandidates = candidates
        .filter(Boolean)
        .map(({ source, result }) => ({
            source,
            result,
            audit: judgePromptCandidate(result, source),
        }))
        .sort((left, right) => {
            if (right.audit.judgeScore !== left.audit.judgeScore) {
                return right.audit.judgeScore - left.audit.judgeScore;
            }
            if (right.audit.baseScore !== left.audit.baseScore) {
                return right.audit.baseScore - left.audit.baseScore;
            }
            return left.audit.failedCriticalChecks.length - right.audit.failedCriticalChecks.length;
        });

    const winner = judgedCandidates[0];
    if (!winner) return null;

    return {
        result: {
            ...winner.result,
            quality: {
                ...winner.result.quality,
                judge: {
                    selectedSource: winner.source,
                    judgeScore: winner.audit.judgeScore,
                    baseScore: winner.audit.baseScore,
                    failedCriticalChecks: winner.audit.failedCriticalChecks,
                    highSeverityWarnings: winner.audit.highSeverityWarnings,
                    comparedCandidates: judgedCandidates.map((item) => ({
                        source: item.source,
                        judgeScore: item.audit.judgeScore,
                        baseScore: item.audit.baseScore,
                    })),
                },
            },
        },
        source: winner.source,
    };
}

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
        productName: z.string().trim().min(1).max(120),
        targetAudience: z.string().max(240).optional(),
        keySellingPoints: z.string().max(1200).optional(),
        mustInclude: z.string().max(1200).optional(),
        avoidElements: z.string().max(1200).optional(),
        sceneMustIncludeMap: z.string().max(2000).optional(),
        learnedAvoidElements: z.array(z.string().max(240)).max(8).optional(),
        learnedSteeringNotes: z.array(z.string().max(320)).max(8).optional(),
        revisionFeedback: z.string().max(2000).optional(),
        previousPromptSnapshot: z.string().max(12000).optional(),
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

        const primaryResult = await generatePromptCandidate({
            preset,
            options,
            imageReferences,
            images,
            mimeTypes,
        });

        let repairedResult = null;

        if (shouldAutoRepair(primaryResult.quality)) {
            const autoRepairFeedback = buildAutoRepairFeedback(primaryResult.quality, options);
            if (autoRepairFeedback) {
                try {
                    const repairedOptions = {
                        ...options,
                        revisionFeedback: [String(options.revisionFeedback || '').trim(), autoRepairFeedback]
                            .filter(Boolean)
                            .join('\n'),
                        previousPromptSnapshot: primaryResult.text,
                    };
                    repairedResult = await generatePromptCandidate({
                        preset,
                        options: repairedOptions,
                        imageReferences,
                        images,
                        mimeTypes,
                        structuredRepair: true,
                    });
                } catch (repairError) {
                    request.log.warn({ err: repairError }, 'Auto-repair pass failed; returning primary prompt result.');
                }
            }
        }

        const judged = chooseBestCandidate([
            { source: 'primary', result: primaryResult },
            repairedResult ? {
                source: 'repair',
                result: {
                    ...repairedResult,
                    quality: {
                        ...repairedResult.quality,
                        autoRepaired: true,
                    },
                },
            } : null,
        ]);

        return judged?.result || primaryResult;

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
