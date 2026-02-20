# TikTok Prompt Generator

Generator prompt video TikTok berbasis React + Vite dengan engine Gemini.  
Aplikasi menerima foto referensi + preset + opsi advanced, lalu menghasilkan prompt scene-by-scene.

## Arsitektur

- Frontend: React (`src/`)
- Backend API proxy: Node HTTP server (`server/index.js`)
- Endpoint internal: `POST /api/generate`
- Alur keamanan: API key Gemini hanya dibaca di backend, tidak diekspos ke browser

## Prasyarat

- Node.js 18+ (direkomendasikan 20+)
- NPM
- API key Gemini

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari `.env.example`, lalu isi key:

```env
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
```

## Jalankan

- Development (frontend + backend bersamaan):

```bash
npm run dev
```

- Build frontend:

```bash
npm run build
```

- Preview frontend:

```bash
npm run preview
```

- Jalankan API server saja:

```bash
npm run start:api
```

## Mode Mock

Mode mock diatur dari `src/services/gemini.js`:

```js
export const USE_MOCK = false;
```

Set `true` jika ingin testing UI tanpa memanggil Gemini API.

## Catatan Opsi Advanced

Semua opsi berikut sudah terhubung ke generator:

- `outputLanguage`
- `realismLevel`
- `cameraDistance`
- `background`
- `lighting`
- `includeNegativePrompt`
- `sceneCount`
- `voiceStyle`
- `voiceLanguage`
- `voiceScript`
- `customInstructions`

## Keamanan

- `.env` dan `.env.*` sudah di-ignore oleh Git.
- Gunakan `.env.example` sebagai template.
- Jika key pernah terekspos, lakukan rotate key di Google AI Studio.

## Troubleshooting

- Error `GEMINI_API_KEY is not set`: pastikan `.env` ada dan server API dijalankan.
- Error `Gemini API Error 4xx/5xx`: cek validitas key, kuota, dan model.
- Jika UI sukses build tapi generate gagal, cek log terminal proses `api` saat `npm run dev`.
