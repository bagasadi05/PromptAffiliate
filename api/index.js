// Vercel Serverless Function entry point — wraps the Fastify app via inject()
import { Buffer } from 'node:buffer';
import { buildApp } from '../server/createApp.js';

let app;

async function getApp() {
  if (!app) {
    app = await buildApp({ logger: false });
  }
  return app;
}

export default async function handler(req, res) {
  try {
    const fastify = await getApp();

    // Collect the raw request body (needed for POST/multipart)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Use Fastify's inject() — designed exactly for serverless / testing use
    const response = await fastify.inject({
      method: req.method,
      url: req.url,
      headers: req.headers,
      payload: body.length > 0 ? body : undefined,
    });

    // Write status + headers
    res.statusCode = response.statusCode;
    const rawHeaders = response.headers;
    for (const key of Object.keys(rawHeaders)) {
      // Skip hop-by-hop headers that mustn't be forwarded
      if (key === 'transfer-encoding' || key === 'connection') continue;
      res.setHeader(key, rawHeaders[key]);
    }
    res.end(response.rawPayload);

  } catch (err) {
    console.error('[serverless] unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
    }
  }
}
