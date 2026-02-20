/**
 * Frame-to-Prompt Generator
 * 
 * Menganalisis frame-frame dari GIF/video dan menghasilkan
 * TikTok video prompt menggunakan Gemini API.
 * 
 * Usage:
 *   node scripts/frames-to-prompt.mjs <folder> [--preset <preset-id>] [--scenes <n>] [--lang <EN|ID>]
 * 
 * Example:
 *   node scripts/frames-to-prompt.mjs ./ezgif-20da328f852205fb-png-split --preset viral-choreo --scenes 4
 *   node scripts/frames-to-prompt.mjs ./ezgif-20da328f852205fb-png-split --lang ID
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ──────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return {};
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    const env = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
    return env;
}

const envVars = loadEnv();
const API_KEY = envVars.GEMINI_API_KEY || envVars.VITE_GEMINI_API_KEY || '';
const MODEL = envVars.GEMINI_MODEL || 'gemini-2.5-flash';

// ── Parse CLI args ──────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        folder: null,
        presetId: null,
        scenes: 4,
        lang: 'EN',
        maxFrames: 8, // max frames to send (save tokens)
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--preset' && args[i + 1]) { opts.presetId = args[++i]; }
        else if (args[i] === '--scenes' && args[i + 1]) { opts.scenes = parseInt(args[++i], 10); }
        else if (args[i] === '--lang' && args[i + 1]) { opts.lang = args[++i].toUpperCase(); }
        else if (args[i] === '--max-frames' && args[i + 1]) { opts.maxFrames = parseInt(args[++i], 10); }
        else if (!args[i].startsWith('--')) { opts.folder = args[i]; }
    }

    return opts;
}

// ── Load presets ────────────────────────────────────────
async function loadPresets() {
    // Read presets.js as text and extract the array
    const presetsPath = path.join(ROOT, 'src', 'data', 'presets.js');
    const content = fs.readFileSync(presetsPath, 'utf-8');

    // Use a hacky but reliable approach: extract the array literal
    const startIdx = content.indexOf('[');
    const endIdx = content.lastIndexOf(']') + 1;
    const arrayStr = content.slice(startIdx, endIdx);

    // Evaluate it (safe for our own data file)
    const presets = new Function(`return ${arrayStr}`)();
    return presets;
}

// ── Image utils ─────────────────────────────────────────
function readFrames(folder, maxFrames) {
    const absFolder = path.resolve(folder);
    if (!fs.existsSync(absFolder)) {
        throw new Error(`Folder not found: ${absFolder}`);
    }

    const files = fs.readdirSync(absFolder)
        .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
        .sort();

    if (files.length === 0) {
        throw new Error(`No image files found in ${absFolder}`);
    }

    console.log(`📁 Found ${files.length} frames in ${path.basename(absFolder)}`);

    // Sample evenly if too many frames
    let selected = files;
    if (files.length > maxFrames) {
        const step = files.length / maxFrames;
        selected = [];
        for (let i = 0; i < maxFrames; i++) {
            selected.push(files[Math.floor(i * step)]);
        }
        console.log(`📸 Sampled ${selected.length} frames (every ~${Math.round(step)} frames)`);
    }

    return selected.map(f => {
        const filePath = path.join(absFolder, f);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(f).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return {
            name: f,
            base64: buffer.toString('base64'),
            mimeType,
        };
    });
}

// ── Build prompt ────────────────────────────────────────
function buildFrameAnalysisPrompt(preset, options, frameCount) {
    const langLabel = options.lang === 'ID' ? 'Indonesian (Bahasa Indonesia)' : 'English';

    const systemPrompt = `You are an expert cinematographer, AI video prompt engineer, and TikTok content strategist.

You are given ${frameCount} frames extracted from a reference GIF/video. Your task is to:
1. ANALYZE these frames to understand: the subject's appearance, outfit, pose progression, movement style, environment, and overall vibe.
2. Based on this analysis, generate a detailed TikTok video prompt that recreates and enhances the movement seen in the frames.

CRITICAL RULES:
- REALISM OVER PERFECTION: Describe natural skin textures, natural lighting, realistic physics.
- CINEMATIC NARRATIVE: Write each scene as a detailed, flowing paragraph. No bullet points for scene content.
- RAW FOOTAGE LOOK: Use keywords like "film grain", "motion blur", "depth of field", "handheld camera shake".
- CONSISTENCY: Keep subject appearance identical across all scenes.
- FORMAT: Use UPPERCASE headers (e.g., "SCENE 1: [TITLE]").
- HIJAB RULE: If hijab/headscarf visible, preserve accurately in every scene.

Output Language: ${langLabel}`;

    const presetInfo = preset
        ? `\nDANCE PRESET: ${preset.name} (${preset.vibe})\nBPM: ${preset.bpmRange} | Energy: ${preset.energyLevel}\nCamera Style: ${preset.cameraStyle}\nSignature Moves: ${preset.signatureMoves.join(', ')}\n`
        : '';

    const userPrompt = `${presetInfo}
REFERENCE FRAMES: I'm providing ${frameCount} frames extracted from a reference GIF/video. Please analyze:
- Subject appearance (face, body type, skin tone, hair)
- Outfit and accessories
- Movement pattern across frames (what dance/pose progression is happening)
- Environment/background
- Lighting and color palette
- Overall mood/energy

TASK:
1. First, write a brief "REFERENCE ANALYSIS" section summarizing what you see across all frames.
2. Then generate ${options.scenes} cinematic scenes (each ~6 seconds) as a TikTok video prompt:
   - Recreate and enhance the movement/vibe seen in the reference.
   ${preset ? `- Incorporate the ${preset.name} style and signature moves where they naturally fit.` : '- Determine the best dance/content style that matches the reference.'}
   - Each scene: one rich paragraph with action, camera movement, atmosphere, and technical details.
   - Include camera type, resolution, fps specs.
   - Include a Negative Prompt per scene.

FORMAT:
REFERENCE ANALYSIS:
[Your analysis of the frames...]

SCENE 1: [TITLE]
Prompt: [Detailed paragraph...]
Negative Prompt: [Scene-specific things to avoid...]

SCENE 2: [TITLE]
...`;

    return { systemPrompt, userPrompt };
}

// ── Retry with backoff ──────────────────────────────────
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, options);

        if (response.status === 429 || response.status === 503) {
            // Parse retry delay from error or use exponential backoff
            let waitSec = Math.pow(2, attempt + 1) * 5; // 10s, 20s, 40s
            try {
                const errJson = await response.clone().json();
                const retryInfo = errJson.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
                if (retryInfo?.retryDelay) {
                    waitSec = Math.ceil(parseFloat(retryInfo.retryDelay));
                }
            } catch {}

            if (attempt < maxRetries) {
                console.log(`⏳ Rate limited. Waiting ${waitSec}s before retry (${attempt + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, waitSec * 1000));
                continue;
            }
        }

        return response;
    }
}

// ── Call Gemini API ─────────────────────────────────────
async function callGemini(frames, systemPrompt, userPrompt) {
    if (!API_KEY) {
        throw new Error(
            'No Gemini API key found.\n' +
            'Create a .env file in the project root with:\n' +
            '  GEMINI_API_KEY=your_key_here\n' +
            'Get a key at: https://aistudio.google.com/apikey'
        );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    // Build parts: images first, then text
    const imageParts = frames.map(f => ({
        inlineData: {
            mimeType: f.mimeType,
            data: f.base64,
        }
    }));

    const body = {
        system_instruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{
            parts: [
                ...imageParts,
                { text: userPrompt }
            ]
        }],
        generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
    };

    console.log(`\n🤖 Sending ${frames.length} frames to Gemini (${MODEL})...`);
    console.log(`   Total payload: ~${Math.round(JSON.stringify(body).length / 1024)}KB\n`);

    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('Empty response from Gemini API.\n' + JSON.stringify(data, null, 2));
    }

    return text;
}

// ── Main ────────────────────────────────────────────────
async function main() {
    const opts = parseArgs();

    if (!opts.folder) {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║  🎬 Frame-to-Prompt Generator                          ║
║  Analyze video/GIF frames → TikTok video prompt         ║
╠══════════════════════════════════════════════════════════╣
║  Usage:                                                  ║
║    node scripts/frames-to-prompt.mjs <folder> [options]  ║
║                                                          ║
║  Options:                                                ║
║    --preset <id>     Use a specific dance preset         ║
║    --scenes <n>      Number of scenes (default: 4)       ║
║    --lang <EN|ID>    Output language (default: EN)        ║
║    --max-frames <n>  Max frames to send (default: 8)     ║
║                                                          ║
║  Examples:                                               ║
║    node scripts/frames-to-prompt.mjs ./my-frames         ║
║    node scripts/frames-to-prompt.mjs ./my-frames \\      ║
║         --preset viral-choreo --scenes 6 --lang ID       ║
╚══════════════════════════════════════════════════════════╝`);
        process.exit(0);
    }

    console.log('🎬 Frame-to-Prompt Generator');
    console.log('─'.repeat(50));

    // Load frames
    const frames = readFrames(opts.folder, opts.maxFrames);

    // Load preset if specified
    let preset = null;
    if (opts.presetId) {
        const presets = await loadPresets();
        preset = presets.find(p => p.id === opts.presetId);
        if (!preset) {
            console.log(`\n⚠️  Preset "${opts.presetId}" not found. Available presets:`);
            for (const p of presets) {
                console.log(`   • ${p.id.padEnd(20)} ${p.emoji} ${p.name} (${p.category})`);
            }
            process.exit(1);
        }
        console.log(`💃 Preset: ${preset.emoji} ${preset.name} (${preset.vibe})`);
    } else {
        console.log('💃 Preset: Auto-detect (AI will determine best style)');
    }

    console.log(`🌐 Language: ${opts.lang}`);
    console.log(`🎬 Scenes: ${opts.scenes}`);

    // Build prompts
    const { systemPrompt, userPrompt } = buildFrameAnalysisPrompt(preset, opts, frames.length);

    // Call Gemini
    const result = await callGemini(frames, systemPrompt, userPrompt);

    // Output
    console.log('\n' + '═'.repeat(60));
    console.log('✨ GENERATED PROMPT:');
    console.log('═'.repeat(60) + '\n');
    console.log(result);
    console.log('\n' + '═'.repeat(60));

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outDir = path.join(ROOT, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outFile = path.join(outDir, `prompt-${timestamp}.txt`);
    fs.writeFileSync(outFile, result, 'utf-8');
    console.log(`\n💾 Saved to: ${path.relative(ROOT, outFile)}`);
}

main().catch(err => {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
});
