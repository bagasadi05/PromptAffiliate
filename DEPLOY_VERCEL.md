# Deploy Pribadi ke Vercel

Target ini paling cocok untuk repo ini jika Anda ingin aplikasi cepat online untuk dipakai sendiri.

## Kenapa Vercel

- Repo ini sudah punya adapter serverless di `api/index.js`
- Routing Vercel sudah disiapkan di `vercel.json`
- Frontend dan `/api` bisa jalan di domain yang sama tanpa ubah arsitektur

## Cocok untuk

- Prompt Generator utama
- Pemakaian pribadi / low traffic
- Deploy cepat tanpa memecah frontend dan backend

## Kurang cocok untuk

- Worker background yang harus selalu hidup
- Queue BullMQ yang berat
- Beban proses lama yang rutin melewati durasi function

## Langkah Deploy

1. Push repo ini ke GitHub.
2. Import repo ke Vercel.
3. Framework preset: `Vite`.
4. Build command: `npm run build`
5. Output directory: `dist`

## Environment Variables

Minimal yang perlu diisi:

- `GEMINI_API_KEY`
- `OPENCODE_AUTH_TOKEN`

Jika Anda memakai fallback / fitur tambahan:

- `OPENROUTER_API_KEY`
- `OPENROUTER_FALLBACK_MODEL`
- `REDIS_URL`
- `GROKPI_BASE_URL`
- `XAI_BASE_URL`
- `XAI_VIDEO_MODEL`

Opsional tapi disarankan:

- `GEMINI_MODEL=gemini-2.5-flash`
- `GEMINI_RATE_LIMIT_WINDOW_MS=60000`
- `GEMINI_RATE_LIMIT_MAX_REQUESTS=20`
- `GEMINI_RATE_LIMIT_MAX_HEAVY_REQUESTS=8`

## CORS

Server sekarang otomatis mengizinkan domain deploy Vercel lewat system environment variables seperti:

- `VERCEL_URL`
- `VERCEL_BRANCH_URL`
- `VERCEL_PROJECT_PRODUCTION_URL`

Kalau Anda ingin membatasi lebih ketat, isi juga:

- `ALLOWED_ORIGINS=https://nama-app-anda.vercel.app`

## Catatan Operasional

- `vercel.json` saat ini menetapkan `maxDuration: 30` untuk `api/index.js`
- Jika request AI Anda sering memakan waktu lebih lama, Anda perlu menyesuaikan strategi atau menaikkan limit sesuai plan Vercel
- Fitur queue BullMQ tetap lebih cocok di Render/Railway jika nanti dipakai serius

## Checklist Setelah Deploy

1. Buka halaman utama deploy
2. Coba `Analyze Preset`
3. Coba `AI Isi Field Kosong`
4. Coba `Generate`
5. Pastikan tidak ada error `CORS` atau `401`
