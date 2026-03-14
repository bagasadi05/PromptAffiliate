/**
 * Background Job Queue for GrokPI Generation
 * Supports BullMQ/Redis for production and In-Memory Map for development fallback.
 */
import crypto from 'crypto';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { callPromptModel } from './orchestratorService.js';
import {
    buildGrokSystemPrompt,
    buildGrokUserPrompt,
    postProcessGrokOutput,
} from './grokPromptService.js';
import {
    buildTitleSystemPrompt,
    buildTitleUserPrompt,
    postProcessTitles,
} from './titleService.js';
import { grokPiGenerateVideo } from './grokpiService.js';

const REDIS_URL = process.env.REDIS_URL;

let redisClient = null;
let jobQueue = null;
let worker = null;

const jobsMap = new Map(); // Fallback in-memory store
const QUEUE_NAME = 'grokpi-jobs';

if (REDIS_URL) {
    console.log('🔗 [GrokPiQueue] Initializing Redis-backed Job Queue via BullMQ...');
    redisClient = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

    redisClient.on('error', (err) => {
        console.error('🚨 [GrokPiQueue] Redis connection error:', err);
    });

    jobQueue = new Queue(QUEUE_NAME, { connection: redisClient });

    worker = new Worker(QUEUE_NAME, async (bullJob) => {
        const { jobId } = bullJob.data;
        await processJob(jobId, bullJob);
    }, { connection: redisClient, concurrency: 1 });

    worker.on('failed', (job, err) => {
        console.error(`🚨 [GrokPiQueue] Job ${job?.id} failed:`, err);
    });
} else {
    console.warn('⚠️ [GrokPiQueue] REDIS_URL is not set! Falling back to IN-MEMORY queue.');
    console.warn('⚠️ [GrokPiQueue] Jobs will NOT persist across server restarts, and NOT safe for multi-instance.');
}

function createError(code, message, retryable = false) {
    return { code, message, retryable };
}

function normalizeImageBase64(imageStr) {
    if (!imageStr) return '';
    if (Buffer.isBuffer(imageStr)) return imageStr.toString('base64');
    return String(imageStr).replace(/^data:image\/[\w.+-]+;base64,/i, '').trim();
}

async function generateGrokVideoPrompt({
    imageStr,
    mimeType = 'image/jpeg',
    preset = {},
    userOptions = {},
}) {
    const imageBase64 = normalizeImageBase64(imageStr);
    const images = imageBase64 ? [imageBase64] : [];
    const mimeTypes = imageBase64 ? [mimeType] : [];

    const systemPrompt = buildGrokSystemPrompt(userOptions);
    const userPrompt = buildGrokUserPrompt(preset, userOptions);

    const rawText = await callPromptModel(systemPrompt, userPrompt, images, mimeTypes, {
        ...userOptions,
        fallbackOnGeminiLimit: true,
    });

    return { text: postProcessGrokOutput(rawText) };
}

async function generateTitles(input = {}) {
    const systemPrompt = buildTitleSystemPrompt(input);
    const userPrompt = buildTitleUserPrompt(input);

    const rawText = await callPromptModel(systemPrompt, userPrompt, [], [], {
        ...input,
        fallbackOnGeminiLimit: true,
    });

    const titles = postProcessTitles(rawText, input);
    return { text: titles.join('\n'), titles };
}

function buildReferenceImageDataUrl(imageBuffer, mimeType = 'image/jpeg') {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) return '';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

async function generateGrokPiVideo({
    prompt,
    durationSeconds,
    aspectRatio,
    resolution,
    preset = 'normal',
    imageBuffer,
    mimeType = 'image/jpeg',
    strictReference = true,
}) {
    const imageUrl = buildReferenceImageDataUrl(imageBuffer, mimeType);
    const hasReferenceImage = Boolean(imageUrl);

    const safePrompt = hasReferenceImage
        ? [
            'STRICT REFERENCE LOCK: Preserve the exact visible details from reference image.',
            'Do not invent unseen body regions. If face/head is not visible in the reference, keep face/head out of frame.',
            'Keep framing aligned to reference crop unless explicitly requested otherwise.',
            prompt,
        ].join('\n\n')
        : prompt;

    const payload = {
        prompt: safePrompt,
        preset,
        strict_reference: strictReference,
    };

    if (Number.isFinite(Number(durationSeconds))) payload.duration_seconds = Number(durationSeconds);
    if (aspectRatio) payload.aspect_ratio = aspectRatio;
    if (resolution) payload.resolution = resolution;
    if (hasReferenceImage) payload.image_url = imageUrl;

    try {
        const result = await grokPiGenerateVideo(payload);
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
            throw createError(
                'GROKPI_STRICT_REF_REJECTED',
                'Reference image was rejected by Grok upstream. Strict reference mode prevents prompt-only fallback.',
                false,
            );
        }

        const { image_url: _ignoredImage, ...fallbackPayload } = payload;
        const fallbackResult = await grokPiGenerateVideo(fallbackPayload);
        return {
            ...fallbackResult,
            warning: 'Reference image attachment was rejected by Grok upstream. Video generated with prompt-only fallback.',
            referenceMode: 'prompt-only-fallback',
        };
    }
}

// Unified Store Methods
async function saveJobState(jobId, state) {
    if (redisClient) {
        await redisClient.set(`grokpi:job:${jobId}`, JSON.stringify(state), 'EX', 60 * 60 * 24); // 24 hours
    } else {
        jobsMap.set(jobId, state);
    }
}

async function getJobState(jobId) {
    if (redisClient) {
        const data = await redisClient.get(`grokpi:job:${jobId}`);
        return data ? JSON.parse(data) : null;
    }
    return jobsMap.get(jobId) || null;
}

// Keep track of abort controllers for in-memory processing.
const abortControllers = new Map();

class GrokPiJobManager {
    constructor() {
        this.activeProcessor = false;
    }

    async createJob(config) {
        const jobId = crypto.randomUUID();
        const { sceneCount } = config;

        const sceneJobs = Array.from({ length: sceneCount }, (_, i) => ({
            id: `scene-${i + 1}`,
            sceneIndex: i + 1,
            prompt: '',
            status: 'JOB_QUEUED',
            attempts: 0,
            message: 'Queued',
            error: null,
            video: null,
            videoUrl: '',
        }));

        const serializedConfig = { ...config };
        if (Buffer.isBuffer(config.imageBuffer)) {
            serializedConfig.imageBase64 = config.imageBuffer.toString('base64');
            delete serializedConfig.imageBuffer;
        }

        const jobState = {
            id: jobId,
            status: 'JOB_QUEUED',
            config: serializedConfig,
            sceneJobs,
            createdAt: Date.now(),
            steps: {
                prompt: { label: 'Prompt Generator', status: 'idle', message: '' },
                grokPrompt: { label: 'Grok Prompt', status: 'idle', message: '' },
                video: { label: 'Generated Video (xAI)', status: config.renderVideo ? 'idle' : 'skipped', message: config.renderVideo ? '' : 'Skipped by settings' },
                analysis: { label: 'Product Analysis', status: 'idle', message: '' },
                titles: { label: 'Title Generator', status: 'idle', message: '' },
            },
            results: {
                promptText: '',
                grokPromptText: '',
                video: null,
                productAnalysis: null,
                titles: [],
                titlesText: ''
            }
        };

        if (!redisClient) {
            abortControllers.set(jobId, new AbortController());
        }

        await saveJobState(jobId, jobState);

        if (jobQueue) {
            await jobQueue.add(jobId, { jobId }, {
                jobId,
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true,
                removeOnFail: false
            });
        } else {
            // Background start for in memory
            this.processQueue();
        }

        return jobId;
    }

    async getJob(jobId) {
        const state = await getJobState(jobId);
        if (!state) return null;
        if (state.config && state.config.imageBase64) {
            const { imageBase64: _imageBase64, ...safeConfig } = state.config;
            return { ...state, config: safeConfig };
        }
        return state;
    }

    async cancelJob(jobId) {
        const state = await getJobState(jobId);
        if (state && (state.status === 'JOB_QUEUED' || state.status === 'SCENE_RUNNING')) {
            state.status = 'JOB_CANCELLED';
            await saveJobState(jobId, state);

            if (redisClient) {
                const job = await jobQueue.getJob(jobId);
                if (job) await job.remove();
            } else {
                const ac = abortControllers.get(jobId);
                if (ac) {
                    ac.abort();
                    abortControllers.delete(jobId);
                }
            }
            return true;
        }
        return false;
    }

    async processQueue() {
        if (this.activeProcessor) return;
        this.activeProcessor = true;

        try {
            for (const [jobId, job] of jobsMap.entries()) {
                if (job.status === 'JOB_QUEUED') {
                    await processJob(jobId).catch(() => { });
                }
            }
        } finally {
            this.activeProcessor = false;
        }
    }
}

async function updateStep(jobId, key, patch) {
    const job = await getJobState(jobId);
    if (!job) return;
    job.steps[key] = { ...job.steps[key], ...patch };
    await saveJobState(jobId, job);
    return job;
}

async function updateScene(jobId, sceneIndex, patch) {
    const job = await getJobState(jobId);
    if (!job) return;
    job.sceneJobs = job.sceneJobs.map(s => s.sceneIndex === sceneIndex ? { ...s, ...patch } : s);
    await saveJobState(jobId, job);
    return job;
}

async function processJob(jobId, bullJob = null) {
    let job = await getJobState(jobId);
    if (!job || job.status === 'JOB_CANCELLED') return;

    job.status = 'SCENE_RUNNING';
    await saveJobState(jobId, job);

    const config = job.config;
    let signal = null;

    if (!redisClient) {
        signal = abortControllers.get(jobId)?.signal;
    }

    const configBuffer = config.imageBase64 ? Buffer.from(config.imageBase64, 'base64') : null;

    try {
        job = await updateStep(jobId, 'prompt', { status: 'running', message: `Generating ${config.sceneCount} scene prompts...` });
        job = await updateStep(jobId, 'grokPrompt', { status: 'running', message: 'Preparing scene-by-scene Grok prompts...' });

        const scenePrompts = [];
        for (let idx = 0; idx < config.sceneCount; idx++) {
            const currentJob = await getJobState(jobId);
            if (currentJob?.status === 'JOB_CANCELLED' || (signal && signal.aborted)) throw new Error('AbortError');

            const sceneIndex = idx + 1;
            job = await updateScene(jobId, sceneIndex, { status: 'SCENE_RUNNING', message: 'Generating scene prompt...' });

            const role = ['hook', 'problem awareness', 'product demo', 'benefit proof', 'social proof'][idx % 5];
            const customInstructions = `
                Generate exactly ONE Grok video prompt for Scene ${sceneIndex}/${config.sceneCount}.
                Scene role: ${role}. Duration must feel natural for ${config.targetDuration}s clip.
                Affiliate style: ${config.presetName} (${config.presetVibe}).
                Product focus: ${config.productFocus}.
                ${config.allowTextOverlay ? 'Text overlay allowed.' : 'No text overlay.'}
                ${config.customInstructions ? 'Extra: ' + config.customInstructions : ''}
            `.trim();

            let promptText = '';
            try {
                const promptResult = await generateGrokVideoPrompt({
                    imageStr: configBuffer,
                    mimeType: config.mimeType,
                    preset: { name: config.presetName, vibe: config.presetVibe, grokPromptIdea: config.motionStyle },
                    userOptions: { sceneCount: 1, customInstructions, subjectDescription: config.subjectDescription },
                    signal
                });
                promptText = promptResult.text;
            } catch (e) {
                promptText = `Scene ${sceneIndex}: Focus on ${config.productFocus}, ${config.presetName} style.`;
                console.error('Prompt fail fallback', e);
            }

            scenePrompts.push(promptText);
            job = await updateScene(jobId, sceneIndex, { prompt: promptText, status: 'JOB_QUEUED', message: 'Queued for video generation' });
        }

        job = await getJobState(jobId);
        job.results.promptText = scenePrompts.map((p, i) => `Scene ${i + 1}: ${p}`).join('\n\n');
        job.results.grokPromptText = scenePrompts.join('\n\n');
        await saveJobState(jobId, job);

        job = await updateStep(jobId, 'prompt', { status: 'success', message: `${config.sceneCount} prompts ready.` });
        job = await updateStep(jobId, 'grokPrompt', { status: 'success', message: 'Ready.' });

        if (config.renderVideo) {
            job = await updateStep(jobId, 'video', { status: 'running', message: 'Generating videos sequentially...' });
            let failedCount = 0;
            let doneCount = 0;
            let globalStop = false;

            for (let idx = 0; idx < scenePrompts.length; idx++) {
                let currentJob = await getJobState(jobId);
                if (currentJob?.status === 'JOB_CANCELLED' || (signal && signal.aborted) || globalStop) break;

                const sceneIndex = idx + 1;

                for (let attempt = 1; attempt <= (config.maxRetries + 1); attempt++) {
                    currentJob = await getJobState(jobId);
                    if (currentJob?.status === 'JOB_CANCELLED' || (signal && signal.aborted)) break;

                    job = await updateScene(jobId, sceneIndex, {
                        status: 'SCENE_RUNNING',
                        attempts: attempt,
                        message: attempt === 1 ? 'Generating video...' : `Retry ${attempt - 1}/${config.maxRetries}`
                    });

                    try {
                        const response = await generateGrokPiVideo({
                            prompt: scenePrompts[idx],
                            durationSeconds: config.targetDuration,
                            aspectRatio: config.aspectRatio === 'auto' ? undefined : config.aspectRatio,
                            resolution: config.resolution,
                            preset: 'normal',
                            imageBuffer: configBuffer,
                            mimeType: config.mimeType,
                            strictReference: !config.allowPromptOnlyFallback,
                            signal
                        });

                        if (response?.referenceMode === 'prompt-only-fallback' && !config.allowPromptOnlyFallback) {
                            throw createError('GROKPI_STRICT_REF_REJECTED', 'Image explicitly rejected.', false);
                        }

                        const video = response?.data?.[0];
                        if (!video?.url) throw createError('GROKPI_NO_DATA', 'No video url', true);

                        job = await updateScene(jobId, sceneIndex, { status: 'SCENE_DONE', video, videoUrl: video.url, message: 'Completed' });

                        let updatedState = await getJobState(jobId);
                        if (!updatedState.results.video) {
                            updatedState.results.video = video;
                            await saveJobState(jobId, updatedState);
                        }

                        doneCount++;
                        break;

                    } catch (error) {
                        const errCode = error?.code || 'UNKNOWN_ERROR';
                        const errMsg = error?.message || 'Failed';
                        const isRetryable = error?.retryable !== false && attempt <= config.maxRetries;

                        if (!isRetryable) {
                            job = await updateScene(jobId, sceneIndex, { status: 'JOB_FAILED', error: errCode, message: errMsg });
                            failedCount++;
                            if (errCode.includes('SSO') || config.stopOnError) {
                                globalStop = true;
                            }
                            break;
                        }
                    }
                }
            }

            job = await updateStep(jobId, 'video', {
                status: failedCount > 0 ? (globalStop ? 'error' : 'warning') : 'success',
                message: `${doneCount} done, ${failedCount} failed.`
            });

            if (globalStop) {
                throw createError('GROKPI_QUEUE_STOPPED', `Queue stopped after errors.`, false);
            }
        }

        job = await updateStep(jobId, 'analysis', { status: 'skipped', message: 'Uses preset fallback.' });
        job = await updateStep(jobId, 'titles', { status: 'running', message: `Generating ${config.titleCount} Titles...` });

        const currentJobForTitle = await getJobState(jobId);
        if (currentJobForTitle?.status !== 'JOB_CANCELLED' && !(signal && signal.aborted)) {
            try {
                const titleResult = await generateTitles({
                    productName: config.productFocus,
                    productCategory: config.presetName,
                    targetAudience: 'TikTok audience',
                    keyBenefits: [config.productFocus],
                    tone: config.titleTone,
                    language: config.lang,
                    titleCount: config.titleCount,
                    includeEmoji: true,
                    customInstructions: config.titleCustomInstructions,
                    signal
                });
                const titles = Array.isArray(titleResult?.titles) ? titleResult.titles.slice(0, 5) : [];

                let finalJob = await getJobState(jobId);
                finalJob.results.titles = titles;
                finalJob.results.titlesText = titles.join('\n');
                await saveJobState(jobId, finalJob);

                job = await updateStep(jobId, 'titles', { status: 'success', message: `${titles.length} titles generated.` });
            } catch {
                job = await updateStep(jobId, 'titles', { status: 'error', message: 'TITLE_GEN_FAILED' });
            }
        }

        const finalCheck = await getJobState(jobId);
        finalCheck.status = (finalCheck.status === 'JOB_CANCELLED' || (signal && signal.aborted)) ? 'JOB_CANCELLED' : 'SCENE_DONE';
        await saveJobState(jobId, finalCheck);

    } catch (error) {
        const finalCheck = await getJobState(jobId);
        if (finalCheck.status !== 'JOB_CANCELLED') {
            finalCheck.status = 'JOB_FAILED';
            finalCheck.error = error.code || 'JOB_FAILED';
            await saveJobState(jobId, finalCheck);
            if (bullJob) throw error;
        }
    } finally {
        if (!redisClient && abortControllers.has(jobId)) {
            abortControllers.delete(jobId);
        }
    }
}

export const grokPiQueueObj = new GrokPiJobManager();
