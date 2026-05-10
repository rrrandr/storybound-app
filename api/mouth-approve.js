// Mouth-batch — Save stylized mouth state for an artist.
// Writes to public/assets/test-mouths/<artist>/<state>.png. Source files
// (the photo-real LoraVenn placeholders at the parent dir) are never
// touched. Path validation is strict (no traversal, allowlisted state
// + artist values).
//
// NOTE: filesystem is read-only on Vercel production. Works under
// `vercel dev` locally; production deploy returns 503.

import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  maxDuration: 30
};

// All 16 mouth states the dev launcher exposes. New states added to
// the placeholder map must be allowlisted here too.
const ALLOWED_STATES = new Set([
  '5oclock-1', 'closed-smile', 'smirk', 'BIGsmirk', 'KNOWINGsmirk',
  'lip-bite', 'lip-bite2', 'whistle',
  'ohno', 'what', 'you',
  'hard-exhale', 'ahh',
  'big-O', 'NO', 'INTENSE', 'tense-bite', 'smile-snarl', 'BLOWINGsmirk'
]);

const ALLOWED_ARTISTS = new Set([
  'ender_bond', 'ryo_toro', 'olen_droll', 'lora_venn'
]);

const STATE_RE = /^[a-zA-Z0-9_-]+$/;
const ARTIST_RE = /^[a-z_]+$/;

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { state, artistKey, imageDataUrl } = req.body || {};

  if (!state || typeof state !== 'string' || !STATE_RE.test(state) || !ALLOWED_STATES.has(state)) {
    return res.status(400).json({ error: 'Invalid or unknown state' });
  }
  if (!artistKey || typeof artistKey !== 'string' || !ARTIST_RE.test(artistKey) || !ALLOWED_ARTISTS.has(artistKey)) {
    return res.status(400).json({ error: 'Invalid or unknown artistKey' });
  }
  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid imageDataUrl' });
  }

  const m = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/.exec(imageDataUrl);
  if (!m) return res.status(400).json({ error: 'Malformed data URL' });
  let buf;
  try { buf = Buffer.from(m[1], 'base64'); }
  catch (_) { return res.status(400).json({ error: 'Bad base64' }); }
  if (buf.length === 0 || buf.length > 12 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image size out of range (0–12 MB)' });
  }

  const repoRoot = process.cwd();
  const baseDir = path.resolve(repoRoot, 'public/assets/test-mouths', artistKey);
  const targetPath = path.resolve(baseDir, 'MM-mouth-' + state + '.png');

  if (!targetPath.startsWith(baseDir + path.sep)) {
    return res.status(400).json({ error: 'Path escape detected' });
  }

  try {
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(targetPath, buf);
    const relPath = targetPath.replace(repoRoot, '').replace(/^[/\\]?public[/\\]?/, '/');
    console.log('[mouth-approve] saved:', relPath, '(' + buf.length + ' bytes)');
    return res.status(200).json({
      ok: true,
      state,
      artistKey,
      publicPath: relPath.replace(/\\/g, '/'),
      bytes: buf.length
    });
  } catch (err) {
    console.error('[mouth-approve] write failed:', err.message, err.code);
    if (err.code === 'EROFS' || err.code === 'EACCES') {
      return res.status(503).json({
        error: 'Filesystem read-only — run under `vercel dev` locally to use this endpoint.',
        code: err.code
      });
    }
    return res.status(500).json({ error: 'Write failed', detail: err.message });
  }
}
