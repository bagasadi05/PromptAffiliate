import { OPENCODE_AUTH_TOKEN } from '../config/env.js';

export function enforceOpencodeAuth(request, reply) {
    const expectedToken = String(OPENCODE_AUTH_TOKEN).trim();
    if (!expectedToken) return true;

    const headerToken = String(request.headers['x-opencode-token'] || '').trim();
    const authHeader = String(request.headers.authorization || '').trim();
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const providedToken = headerToken || bearerToken;

    if (providedToken !== expectedToken) {
        reply.code(401).send({ error: 'Unauthorized request.' });
        return false;
    }

    return true;
}
