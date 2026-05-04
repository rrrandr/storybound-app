#!/usr/bin/env node
// Batch-style cine sequence sources via local /api/bfl-kontext + /api/cine-approve.
//
// Usage:
//   node scripts/batch-cine-variants.mjs               # studio_signal × ender/ryo/lora
//   node scripts/batch-cine-variants.mjs ocean_lighthouse  # different seq
//
// Requires `vercel dev` running on localhost:3000 with BFL_API_KEY in env.
// Skips any styled variant that already exists on disk.

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:3000';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONCURRENCY = 3;
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 60;

const SEQUENCE_DIRS = {
  studio_signal:    'public/assets/metaphors/studio_signal',
  ocean_lighthouse: 'public/assets/metaphors/lighthouse_wave'
};

// style_anchors mirrored verbatim from RENDER_STYLE_SYSTEM in app.js
const ARTISTS = {
  ender_bond: 'clean semi-realistic glossy graphic novel illustration. pure black ink lines sit visibly on top of smooth color rendering. thick dry-brush outer contour on figures with slight roughness and pressure variation. sparse intentional crosshatching ONLY in shadow regions — few strokes, not many. smooth gradient skin with no noise or texture in highlights. attractive structured facial anatomy. full color, not 3D render',
  ryo_toro:   'manga-structured illustration with clean confident angular linework and tapered ends. secondary micro-contours reinforce key anatomical edges (jaw, collarbone, fingers). rim light appears as fractured segmented streaks — glow is directional and broken, never smooth gradients. high contrast but controlled. fabric folds resolve into angular faceted shapes, never soft flowing drapery — silhouettes maintain sharp geometry. manga-structured faces with sharp eyelids and defined gaze: slightly lowered upper lids, partially occluded iris, focused intimate emotionally charged expression. controlled expression, not exaggerated. fingertips subtly flatten with rectangular termination, never exaggerated. warm sepia and sunset tones, backlit with dramatic rim lighting. full color illustration',
  lora_venn:  'painterly realism illustration with visible directional brushwork. warm cinematic lighting with luminous skin and colored shadows (reds, violets, ambers). rich layered color in fabric (velvet/silk weight). worn matte metal, never chrome or glossy CGI. soft transitions across form but crisp facial features and readable anatomy. edges intentional and readable — clear separation of forms through value contrast, never blurred into impressionism or dissolved into background. hand-painted texture on skin and fabric, not digitally smooth. painterly but not loose or abstract. full color, not 3D render'
};

const SOFT_FORM_GUARD = ' Soft, fluid, organic subject matter (ocean foam, water, spray, mist, fabric, hair, smoke, cloth, fur, clouds) MUST remain soft and fluid. DO NOT stylize fluid or organic forms into crystalline, faceted, polygonal, angular, geometric, origami, ice-shard, or solid-block shapes. Preserve the softness, flow, and natural curvature of the original input — even when the chosen illustration style favors sharp linework, render flowing matter with fluid, curved, feathered edges.';

function buildPrompt(artistKey) {
  return ARTISTS[artistKey] +
    '. Re-render the input image entirely in this illustration style. Preserve the exact composition, framing, subject placement, perspective, and lighting direction of the input image — do not change what is depicted, only the rendering style.' +
    SOFT_FORM_GUARD +
    ' Output a single full-frame image at the same aspect ratio as the input.';
}

async function fileToB64DataUrl(filepath) {
  const buf = await fs.readFile(filepath);
  const ext = path.extname(filepath).slice(1).toLowerCase();
  const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function generateOne(seqId, srcDir, filename, artistKey) {
  const srcPath = path.join(srcDir, filename);
  const dstDir = path.join(srcDir, 'styled', artistKey);
  const dstPath = path.join(dstDir, filename);

  try { await fs.access(dstPath); return { status: 'skip' }; } catch {}

  const srcB64 = await fileToB64DataUrl(srcPath);
  const prompt = buildPrompt(artistKey);

  const createRes = await fetch(`${BASE}/api/bfl-kontext`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      input_image: srcB64,
      output_format: 'png',
      seed: Math.floor(Math.random() * 2147483647)
    })
  });
  if (!createRes.ok) throw new Error(`bfl create ${createRes.status}: ${(await createRes.text()).slice(0, 200)}`);
  const createData = await createRes.json();
  const taskId = createData.id;
  const pollingUrl = createData.polling_url;
  if (!taskId && !pollingUrl) throw new Error('bfl returned no task id');

  const pollQs = pollingUrl
    ? `${BASE}/api/bfl-kontext?polling_url=${encodeURIComponent(pollingUrl)}`
    : `${BASE}/api/bfl-kontext?id=${encodeURIComponent(taskId)}`;

  for (let attempts = 1; attempts <= POLL_MAX_ATTEMPTS; attempts++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetch(pollQs);
    if (!pollRes.ok) throw new Error(`bfl poll ${pollRes.status}`);
    const pollData = await pollRes.json();
    if (pollData.status === 'failed') throw new Error(pollData.error || 'bfl failed');
    if (pollData.status !== 'succeeded') continue;
    if (!pollData.image) throw new Error('bfl returned no image');

    let imageDataUrl = pollData.image;
    if (!imageDataUrl.startsWith('data:')) {
      const imgRes = await fetch(imageDataUrl);
      if (!imgRes.ok) throw new Error(`fetch result ${imgRes.status}`);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      imageDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    }

    const saveRes = await fetch(`${BASE}/api/cine-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seqId, assetType: 'shot', filename, artistKey, imageDataUrl
      })
    });
    if (!saveRes.ok) throw new Error(`save ${saveRes.status}: ${(await saveRes.text()).slice(0, 200)}`);
    return { status: 'ok' };
  }
  throw new Error('bfl poll timeout');
}

async function runQueue(jobs, worker) {
  const queue = jobs.slice();
  let done = 0;
  const total = jobs.length;
  const results = [];
  async function turn() {
    while (queue.length) {
      const job = queue.shift();
      const start = Date.now();
      try {
        const out = await generateOne(job.seqId, job.srcDir, job.filename, job.artistKey);
        results.push({ ...job, ...out });
        done++;
        const tag = out.status === 'skip' ? '·' : '✓';
        console.log(`[${done}/${total}] ${tag} ${job.artistKey}/${job.filename} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      } catch (err) {
        results.push({ ...job, status: 'error', error: err.message });
        done++;
        console.log(`[${done}/${total}] ✗ ${job.artistKey}/${job.filename} — ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => turn()));
  return results;
}

async function main() {
  const seqId = process.argv[2] || 'studio_signal';
  const relDir = SEQUENCE_DIRS[seqId];
  if (!relDir) { console.error(`Unknown seqId: ${seqId}`); process.exit(1); }
  const srcDir = path.join(REPO, relDir);

  const all = await fs.readdir(srcDir);
  const sources = all
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .filter(f => !f.startsWith('.'))
    .sort();

  const artistKeys = Object.keys(ARTISTS);
  const jobs = [];
  for (const filename of sources) {
    for (const artistKey of artistKeys) {
      jobs.push({ seqId, srcDir, filename, artistKey });
    }
  }

  console.log(`seq=${seqId} sources=${sources.length} artists=${artistKeys.length} jobs=${jobs.length} concurrency=${CONCURRENCY}`);
  console.log(`target=${BASE}`);
  console.log('');

  const t0 = Date.now();
  const results = await runQueue(jobs, generateOne);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const ok = results.filter(r => r.status === 'ok').length;
  const skip = results.filter(r => r.status === 'skip').length;
  const err = results.filter(r => r.status === 'error').length;
  console.log(`\nDone in ${elapsed}s — ok=${ok} skip=${skip} error=${err}`);

  if (err > 0) {
    console.log('\nFailures:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  ${r.artistKey}/${r.filename}: ${r.error}`);
    });
  }
  process.exit(err > 0 ? 2 : 0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
