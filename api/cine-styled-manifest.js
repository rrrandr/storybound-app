// CineSequence — list existing styled variants per artist
// GET /api/cine-styled-manifest?seqId=ocean_lighthouse
// Returns: { seqId, manifest: { <artistKey>: { shot: [...], insert: [...] } } }
//
// Read-only. Safe on Vercel production (just returns empty arrays if no
// styled variants are deployed).

import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  maxDuration: 10
};

const SEQUENCE_ASSET_ROOTS = {
  ocean_lighthouse: {
    shot:   'public/assets/metaphors/lighthouse_wave',
    insert: 'public/assets/metaphors/lighthouse_wave/inserts'
  }
};

const ALLOWED_ARTISTS = ['troy_bond', 'doro_veyn', 'olen_droll', 'lora_venn'];
const IMG_RE = /\.(png|jpg|jpeg|webp)$/i;

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const seqId = req.query.seqId;
  if (!seqId || !SEQUENCE_ASSET_ROOTS[seqId]) {
    return res.status(400).json({ error: 'Unknown seqId' });
  }

  const repoRoot = process.cwd();
  const roots = SEQUENCE_ASSET_ROOTS[seqId];
  const manifest = {};

  for (const artistKey of ALLOWED_ARTISTS) {
    manifest[artistKey] = { shot: [], insert: [] };
    for (const assetType of Object.keys(roots)) {
      const dir = path.resolve(repoRoot, roots[assetType], 'styled', artistKey);
      try {
        const entries = await fs.readdir(dir);
        manifest[artistKey][assetType] = entries.filter(f => IMG_RE.test(f));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.warn('[cine-manifest] readdir failed:', dir, err.message);
        }
        // ENOENT → no styled variants for this artist/assetType yet. Empty array is correct.
      }
    }
  }

  // Cache-Control: short max-age. After approve the client patches its own
  // local copy of the manifest, so a fresh fetch isn't critical.
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ seqId, manifest });
}
