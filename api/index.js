// Vercel Serverless Function entry point — wraps the Fastify app
import app from '../server/app.js';

let ready = false;

export default async function handler(req, res) {
  try {
    if (!ready) {
      await app.ready();
      ready = true;
    }

    // Wait until Fastify has fully written the response before returning.
    // Without this await, Vercel terminates the connection early → 500.
    await new Promise((resolve, reject) => {
      res.on('finish', resolve);
      res.on('error', reject);
      app.server.emit('request', req, res);
    });
  } catch (err) {
    console.error('[serverless] handler error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
    }
  }
}
