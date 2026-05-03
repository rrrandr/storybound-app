// CineSequence — Approve & save styled variant
// Writes a generated variant to public/assets/metaphors/<seq>/styled/<artist>/<filename>.
// Source files are NEVER touched. Path validation is strict (no traversal).
//
// NOTE: filesystem is read-only on Vercel production. This works under
// `vercel dev` locally; production deploy of this endpoint will return 503.

import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  maxDuration: 30
};

// Per-sequence asset roots (relative to repo root). Adding a new
// sequence here also defines where its variants land.
const SEQUENCE_ASSET_ROOTS = {
  ocean_lighthouse: {
    shot:   'public/assets/metaphors/lighthouse_wave',
    insert: 'public/assets/metaphors/lighthouse_wave/inserts'
  }
};

// Allowlist — only known artists can have variants written.
const ALLOWED_ARTISTS = new Set([
  'ender_bond', 'doro_veyn', 'olen_droll', 'lora_venn'
]);

const FILENAME_RE = /^[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp)$/;

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { seqId, assetType, filename, artistKey, imageDataUrl } = req.body || {};

  // ── Strict input validation ────────────────────────────────────
  if (!seqId || !SEQUENCE_ASSET_ROOTS[seqId]) {
    return res.status(400).json({ error: 'Unknown seqId' });
  }
  if (!assetType || !SEQUENCE_ASSET_ROOTS[seqId][assetType]) {
    return res.status(400).json({ error: 'Unknown assetType' });
  }
  if (!filename || typeof filename !== 'string' || !FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (!artistKey || !ALLOWED_ARTISTS.has(artistKey)) {
    return res.status(400).json({ error: 'Invalid artistKey' });
  }
  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid imageDataUrl' });
  }

  // Decode base64 payload.
  const m = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/.exec(imageDataUrl);
  if (!m) return res.status(400).json({ error: 'Malformed data URL' });
  let buf;
  try { buf = Buffer.from(m[1], 'base64'); }
  catch (_) { return res.status(400).json({ error: 'Bad base64' }); }
  if (buf.length === 0 || buf.length > 12 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image size out of range (0–12 MB)' });
  }

  // ── Resolve target path with strict containment check ──────────
  const repoRoot = process.cwd();
  const baseDir = path.resolve(repoRoot, SEQUENCE_ASSET_ROOTS[seqId][assetType]);
  const styledDir = path.resolve(baseDir, 'styled', artistKey);
  const targetPath = path.resolve(styledDir, filename);

  // Containment guard — refuse if resolved target escapes styled subdir.
  // (FILENAME_RE already rejects '..', but defense in depth.)
  if (!targetPath.startsWith(styledDir + path.sep)) {
    return res.status(400).json({ error: 'Path escape detected' });
  }

  try {
    await fs.mkdir(styledDir, { recursive: true });
    await fs.writeFile(targetPath, buf);
    const relPath = targetPath.replace(repoRoot, '').replace(/^[/\\]?public[/\\]?/, '/');
    console.log('[cine-approve] saved:', relPath, '(' + buf.length + ' bytes)');
    return res.status(200).json({
      ok: true,
      seqId,
      assetType,
      artistKey,
      filename,
      publicPath: relPath.replace(/\\/g, '/'),
      bytes: buf.length
    });
  } catch (err) {
    console.error('[cine-approve] write failed:', err.message, err.code);
    if (err.code === 'EROFS' || err.code === 'EACCES') {
      return res.status(503).json({
        error: 'Filesystem read-only — run under `vercel dev` locally to use this endpoint.',
        code: err.code
      });
    }
    return res.status(500).json({ error: 'Write failed', detail: err.message });
  }
}
