function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`${name} is not set in server environment.`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function getXaiBaseUrl() {
  return (process.env.XAI_BASE_URL || 'https://api.x.ai').replace(/\/+$/, '');
}

function normalizeImageDataUrl(imageBase64, imageMimeType) {
  if (!imageBase64) return undefined;
  if (typeof imageBase64 !== 'string') return undefined;
  if (imageBase64.startsWith('data:')) return imageBase64;
  const mimeType = imageMimeType || 'image/jpeg';
  return `data:${mimeType};base64,${imageBase64}`;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function parseTextSafe(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function callXai(path, { method = 'GET', body } = {}) {
  const apiKey = getRequiredEnv('XAI_API_KEY');
  const url = `${getXaiBaseUrl()}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const json = await parseJsonSafe(response);
    const text = json ? '' : await parseTextSafe(response);
    const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || null;
    const message = json?.error?.message
      || json?.message
      || text
      || response.statusText
      || `xAI API error (${response.status})`;
    const baseMessage = `xAI API Error: ${response.status} - ${String(message).trim()}`;
    const forbiddenHint = response.status === 403
      ? ' Check XAI_API_KEY validity, project billing/credits, and that your xAI account has access to video generation.'
      : '';
    const requestIdHint = requestId ? ` (xAI request id: ${requestId})` : '';
    const error = new Error(`${baseMessage}${requestIdHint}.${forbiddenHint}`.replace(/\.\s*$/, '.'));
    error.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
    error.xai = json;
    error.xaiRequestId = requestId;
    throw error;
  }

  return parseJsonSafe(response);
}

function mapXaiVideoStatus(status) {
  switch (status) {
    case 'pending':
    case 'queued':
    case 'in_progress':
      return 'processing';
    case 'done':
      return 'completed';
    case 'completed':
      return 'completed';
    case 'expired':
      return 'expired';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

function normalizeVideoPayload(data) {
  if (!data || typeof data !== 'object') {
    return {
      xaiStatus: 'unknown',
      status: 'unknown',
      requestId: null,
      video: null,
      error: null,
      raw: data ?? null,
    };
  }

  const requestId = data.id || data.request_id || null;
  const xaiStatus = data.status || 'unknown';
  const videos = Array.isArray(data.videos) ? data.videos : [];
  const firstVideo = data.video && typeof data.video === 'object'
    ? data.video
    : (videos[0] || null);
  const fallbackUrl = data.url || data.video_url || null;
  const video = firstVideo
    ? {
      id: firstVideo.id || null,
      url: firstVideo.url || fallbackUrl || null,
      duration: firstVideo.duration ?? null,
      contentType: firstVideo.content_type || null,
      bytes: firstVideo.bytes ?? null,
      createdAt: firstVideo.created_at || null,
      expiresAt: firstVideo.expires_at || null,
    }
    : (fallbackUrl
      ? {
        id: null,
        url: fallbackUrl,
        duration: data.duration ?? null,
        contentType: null,
        bytes: null,
        createdAt: null,
        expiresAt: null,
      }
      : null);

  const error = data.error
    ? {
      code: data.error.code || null,
      message: data.error.message || String(data.error),
      type: data.error.type || null,
    }
    : null;

  return {
    requestId,
    xaiStatus,
    status: mapXaiVideoStatus(xaiStatus),
    video,
    error,
    raw: data,
  };
}

export async function startXaiVideoGeneration({
  prompt,
  imageBase64,
  imageMimeType,
  duration,
  aspectRatio,
  resolution,
  model,
  videoBase64,
  videoMimeType,
}) {
  const payload = {
    model: model || process.env.XAI_VIDEO_MODEL || 'grok-imagine-video',
    prompt,
  };

  const imageUrl = normalizeImageDataUrl(imageBase64, imageMimeType);
  if (imageUrl) payload.image = { url: imageUrl };

  const videoUrl = normalizeImageDataUrl(videoBase64, videoMimeType);
  if (videoUrl) {
    payload.video = { url: videoUrl.replace(/^data:image\//, 'data:video/') };
  }

  if (Number.isInteger(duration)) payload.duration = duration;
  if (aspectRatio) payload.aspect_ratio = aspectRatio;
  if (resolution) payload.resolution = resolution;

  const endpoint = payload.video ? '/v1/videos/edits' : '/v1/videos/generations';

  const data = await callXai(endpoint, {
    method: 'POST',
    body: payload,
  });

  return normalizeVideoPayload(data);
}

export async function getXaiVideoGenerationStatus(requestId) {
  const data = await callXai(`/v1/videos/${encodeURIComponent(requestId)}`);
  return normalizeVideoPayload(data);
}
