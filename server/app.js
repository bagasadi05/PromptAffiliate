import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { config as loadEnv } from 'dotenv';
import {
  buildSystemPrompt,
  buildUserPrompt,
  postProcessPromptOutput,
  evaluatePromptQuality,
} from './services/promptService.js';
import {
  buildTitleSystemPrompt,
  buildTitleUserPrompt,
  postProcessTitles,
} from './services/titleService.js';
import {
  buildProductAnalysisSystemPrompt,
  buildProductAnalysisUserPrompt,
  parseProductAnalysisOutput,
} from './services/productAnalysisService.js';

loadEnv();

const fastify = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024, // 10MB limit
});

const PORT = Number(process.env.PORT || 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const referenceRoles = ['identity', 'outfit', 'pose', 'background', 'style'];

// Register CORS
await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
});

// Zod Schema for Validation
const generateSchema = z.object({
  imageBase64: z.string().or(z.array(z.string())),
  imageMimeType: z.string().or(z.array(z.string())).optional(),
  preset: z.object({
    name: z.string(),
    vibe: z.string().optional(),
    bpmRange: z.string().optional(),
    energyLevel: z.string().optional(),
    cameraStyle: z.string().optional(),
    signatureMoves: z.array(z.string()).optional(),
    // Add other preset fields as flexible passthroughs
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
    // Add other option fields as flexible passthroughs
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

const analyzeProductSchema = z.object({
  imageBase64: z.string(),
  imageMimeType: z.string().optional(),
  language: z.enum(['ID', 'EN']).optional(),
  customContext: z.string().optional(),
  creativity: z.coerce.number().min(0).max(100).optional(),
}).passthrough();

// Helper to call Gemini
async function callGemini(systemPrompt, userPrompt, images, mimeTypes, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in server environment.');
  }

  const cleanBase64 = (b64) => b64.replace(/^data:image\/\w+;base64,/, '');

  const imageParts = images.map((img, i) => ({
    inlineData: {
      mimeType: mimeTypes[i] || 'image/jpeg',
      data: cleanBase64(img),
    },
  }));

  // Map creativity (0-100) to generation config with safer defaults for format fidelity.
  const creativity = Number.isFinite(Number(options.creativity)) ? Number(options.creativity) : 85;
  const temperature = Math.min(0.95, Math.max(0.2, creativity / 100));
  const topP = Math.min(0.98, Math.max(0.72, 0.72 + (creativity / 100) * 0.22));
  const topK = creativity >= 75 ? 40 : creativity >= 45 ? 32 : 24;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: userPrompt },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          temperature,
          topP,
          topK,
          maxOutputTokens: 8192,
          responseMimeType: 'text/plain',
        },
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || 'Unknown Gemini API error.';
    const err = new Error(`Gemini API Error: ${response.status} - ${message}`);
    err.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw err;
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.find((part) => typeof part?.text === 'string')?.text || '';
  return text || 'No content generated.';
}

// Health Check
fastify.get('/api/health', async () => {
  return { ok: true };
});

// Generate Endpoint
fastify.post('/api/generate', async (request, reply) => {
  try {
    // Validate Body
    const body = generateSchema.parse(request.body);

    const { preset, options, imageBase64, imageMimeType, imageReferences } = body;

    // 1. Prepare Images
    const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];
    
    // Resolve mime types
    const resolveMime = (b64, explicitMime) => {
        if (explicitMime) return explicitMime;
        const match = b64.match(/^data:(image\/[\w.+-]+);base64,/i);
        return match?.[1] || 'image/jpeg';
    };

    const mimeTypes = Array.isArray(imageMimeType) 
        ? imageMimeType 
        : images.map((img) => resolveMime(img, imageMimeType));

    // 2. Build Prompts on Backend
    const optionsWithImageCount = { ...options, _imageCount: images.length };
    const systemPrompt = buildSystemPrompt(optionsWithImageCount);
    const userPrompt = buildUserPrompt(preset, optionsWithImageCount, imageReferences);

    // 3. Call Gemini
    const rawText = await callGemini(systemPrompt, userPrompt, images, mimeTypes, options);
    const text = postProcessPromptOutput(rawText, options);
    const quality = evaluatePromptQuality(text, optionsWithImageCount);

    return { text, quality };

  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400).send({ error: 'Validation Error', details: error.errors });
    } else {
      fastify.log.error(error);
      const statusCode = error.statusCode || 500;
      reply.code(statusCode).send({ error: error.message || 'Server error.' });
    }
  }
});

// Generate TikTok title endpoint
fastify.post('/api/generate-title', async (request, reply) => {
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
      fastify.log.error(error);
      const statusCode = error.statusCode || 500;
      reply.code(statusCode).send({ error: error.message || 'Server error.' });
    }
  }
});

// Analyze product from image endpoint
fastify.post('/api/analyze-product', async (request, reply) => {
  try {
    const input = analyzeProductSchema.parse(request.body);
    const image = input.imageBase64;
    const imageMimeType = input.imageMimeType
      || image.match(/^data:(image\/[\w.+-]+);base64,/i)?.[1]
      || 'image/jpeg';

    const systemPrompt = buildProductAnalysisSystemPrompt(input);
    const userPrompt = buildProductAnalysisUserPrompt(input);
    const rawText = await callGemini(systemPrompt, userPrompt, [image], [imageMimeType], input);
    const analysis = parseProductAnalysisOutput(rawText, input);

    return { analysis };
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400).send({ error: 'Validation Error', details: error.errors });
    } else {
      fastify.log.error(error);
      const statusCode = error.statusCode || 500;
      reply.code(statusCode).send({ error: error.message || 'Server error.' });
    }
  }
});

// Start Server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[fastify] listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
