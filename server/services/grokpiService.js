const DEFAULT_GROKPI_BASE_URL = 'http://127.0.0.1:9563';

export function getGrokPiBaseUrl() {
  return String(process.env.GROKPI_BASE_URL || DEFAULT_GROKPI_BASE_URL).trim().replace(/\/$/, '');
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };

  // We use a hardcoded internal key for the python server to ensure security
  headers.Authorization = `Bearer internal-node-key`;

  return headers;
}

async function callGrokPi(path, { method = 'GET', body } = {}) {
  const baseUrl = getGrokPiBaseUrl();
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    const error = new Error(`Cannot connect to GrokPI at ${baseUrl}. Ensure GrokPI server is running and GROKPI_BASE_URL is correct.`);
    error.statusCode = 503;
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData?.detail;
    const message = typeof detail === 'string'
      ? detail
      : (detail?.error || detail?.message || errorData?.error || 'GrokPI request failed');
    const error = new Error(message);
    error.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }

  return response.json();
}

export function grokPiGenerateImage(payload) {
  return callGrokPi('/v1/images/generations', { method: 'POST', body: payload });
}

export function grokPiGenerateVideo(payload) {
  return callGrokPi('/v1/videos/generations', { method: 'POST', body: payload });
}

export function grokPiListImages(limit = 24, cursor = null) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.append('cursor', cursor);
  return callGrokPi(`/admin/images/list?${query.toString()}`);
}

export function grokPiListVideos(limit = 24, cursor = null) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.append('cursor', cursor);
  return callGrokPi(`/admin/videos/list?${query.toString()}`);
}

export function grokPiDeleteImage(filename) {
  return callGrokPi(`/admin/media/image/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}

export function grokPiDeleteVideo(filename) {
  return callGrokPi(`/admin/media/video/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}

export function grokPiHealth() {
  return callGrokPi('/health');
}

export function grokPiReloadSso() {
  return callGrokPi('/admin/sso/reload', { method: 'POST' });
}

export function grokPiAdminStatus() {
  return callGrokPi('/admin/status');
}

export async function grokPiFetchVideoStream(filename, rangeHeader) {
  const baseUrl = getGrokPiBaseUrl();
  const targetUrl = `${baseUrl}/videos/${encodeURIComponent(filename)}`;
  const headers = {};
  if (rangeHeader) headers.Range = rangeHeader;

  let response;
  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });
  } catch (cause) {
    const error = new Error(`Cannot stream GrokPI video from ${targetUrl}.`);
    error.statusCode = 503;
    error.cause = cause;
    throw error;
  }

  if (!response.ok && response.status !== 206) {
    const error = new Error(`GrokPI video stream failed with status ${response.status}.`);
    error.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }

  return response;
}
