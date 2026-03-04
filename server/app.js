import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { PORT, REDIS_URL, allowedOrigins, getGeminiApiKey } from './config/env.js';
import routes from './routes/index.js';

const fastify = Fastify({
  logger: true,
  bodyLimit: 20 * 1024 * 1024, // 20MB limit for multipart forms
});

// Setup Rate Limiting
const rateLimitConfig = {
  global: false,
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => ({
    code: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Please slow down requests to protect provider account health.`,
    expiresIn: context.ttl
  })
};

// Apply redis adapter if REDIS_URL is provided in environment
if (REDIS_URL) {
  const redis = new Redis(REDIS_URL);
  rateLimitConfig.redis = redis;
}

await fastify.register(rateLimit, rateLimitConfig);

// Register Multipart Plugin
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file max
    files: 4 // Max 4 files
  }
});

// Register CORS
await fastify.register(cors, {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
});

// Register modular routes
await fastify.register(routes);

// Define __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start Server
const start = async () => {
  try {
    if (!getGeminiApiKey()) {
      fastify.log.warn('GEMINI_API_KEY is not set. Gemini-based endpoints will fail until it is configured.');
    }
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`[fastify] listening on http://localhost:${PORT}`);

    // Auto-spawn python grokpi server if available
    const grokpiDir = resolve(__dirname, '../.tmp/grokpi');
    const pythonExec = process.platform === 'win32' ? 'python' : 'python3';

    // Write cookie to key.txt for the python server to read
    const grokpiKeyOrCookie = process.env.GROKPI_API_KEY || '';
    if (grokpiKeyOrCookie.trim() !== '') {
      let finalCookie = grokpiKeyOrCookie.trim();
      finalCookie = finalCookie.replace(/^["']|["']$/g, '');

      const ssoMatch = finalCookie.match(/sso=([^,;\s]+)/);
      if (ssoMatch) {
        finalCookie = ssoMatch[1];
      }

      writeFileSync(resolve(grokpiDir, 'key.txt'), finalCookie, 'utf8');
      fastify.log.info('[grokpi] Wrote SSO cookie to key.txt for Python server');
    }

    fastify.log.info(`[grokpi] Checking for local server at ${grokpiDir}`);
    const grokpiProcess = spawn(pythonExec, ['main.py'], {
      cwd: grokpiDir,
      env: {
        ...process.env,
        API_KEY: 'internal-node-key',
        CF_CLEARANCE: process.env.GROKPI_CF_CLEARANCE || ''
      },
      stdio: 'inherit'
    });

    grokpiProcess.on('error', (err) => {
      fastify.log.error(`[grokpi] Failed to start python server: ${err.message}`);
      fastify.log.warn(`[grokpi] Make sure Python is installed and requirements are met in .tmp/grokpi`);
    });

    grokpiProcess.on('close', (code) => {
      fastify.log.warn(`[grokpi] Python server exited with code ${code}`);
    });

    // Cleanup process when Node.js exits
    process.on('exit', () => {
      if (!grokpiProcess.killed) grokpiProcess.kill();
    });

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
