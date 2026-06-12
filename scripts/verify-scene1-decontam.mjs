// Scene-1 source-contamination regression check (Roman 2026-06-12).
//
// Verifies the picturability / connector / heroine-occupation DE-PRIME holds:
// the calcified literals must never appear in any rotating exemplar POOL, and
// the per-story exemplar windows must actually rotate across fresh storyIds.
//
// This is a SOURCE test, not a prose test — it proves the prompt no longer
// SEEDS the calcified phrases. (Prose-output checks — [PROSE:CANONICAL],
// [FLAVOR-VARIETY] — require a live model run and are not covered here.)
//
// Usage:  node scripts/verify-scene1-decontam.mjs
// Exit 0 = all green; exit 1 = a banned literal leaked back into a pool or
// rotation collapsed. Wire into CI to catch re-priming regressions.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..', 'public', 'app.js');
const src = fs.readFileSync(APP, 'utf8');

// The de-primed literals that must NOT appear in any live prompt pool.
const BANNED = [
  'amber eyes', 'pale amber', 'ringed iris', 'flat and unreadable', 'eyes went flat',
  'hollywood actress', 'rooms recalibrate', 'renaissance statue', 'film star',
  'pulled back into a bun', 'bun tighter than',
];
const scan = (t) => { const lc = String(t).toLowerCase(); return BANNED.filter((b) => lc.includes(b)); };

let failed = false;
const fail = (msg) => { failed = true; console.log('  ✗ ' + msg); };

// ── 1. Extract a pool's array literal from app.js and eval it ──
function extractPool(name) {
  const re = new RegExp('window\\.' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);');
  const m = src.match(re);
  if (!m) throw new Error('pool not found: ' + name);
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}

const POOLS = {
  pic_pc_gestalt: { name: '_PC_GESTALT_POOL', count: 3 },
  pic_li_gestalt: { name: '_LI_GESTALT_POOL', count: 3 },
  pic_li_desire: { name: '_LI_DESIRE_FEATURE_POOL', count: 1 },
  connector_desc: { name: '_CONNECTOR_DESC_POOL', count: 1 },
  heroine_career: { name: '_HEROINE_CAREER_POOL', count: 14 },
};
for (const k in POOLS) POOLS[k].data = extractPool(POOLS[k].name);

// ── 2. Faithful re-implementation of _rotatingExemplars (LS + state shims) ──
const LS = {};
const W = { state: {} };
function phraseLedgerBannedSet() { return new Set(); } // empty = worst case for contamination
function rotatingExemplars(poolKey, pool, count) {
  if (!Array.isArray(pool) || !pool.length) return [];
  const banned = phraseLedgerBannedSet();
  if (banned && banned.size) {
    const fresh = pool.filter((e) => { const s = String(e || '').toLowerCase(); let bad = false; banned.forEach((b) => { if (b && b.length >= 6 && s.indexOf(b) !== -1) bad = true; }); return !bad; });
    if (fresh.length >= Math.min(count || 4, 2)) pool = fresh;
  }
  count = Math.min(count || 4, pool.length);
  if (pool.length <= count) return pool.slice();
  const sid = (W.state && W.state.storyId) || '';
  const stateKey = '_exrot_' + poolKey;
  const windowAt = (off) => { const s = []; for (let i = 0; i < count; i++) s.push(pool[(off + i) % pool.length]); return s; };
  if (W.state && W.state[stateKey] && W.state[stateKey].sid === sid) return windowAt(W.state[stateKey].off);
  const offKey = 'sb_exrot_off_' + poolKey;
  try { const stored = JSON.parse(LS[offKey] || 'null'); if (stored && stored.sid === sid && typeof stored.off === 'number') { W.state[stateKey] = { sid, off: stored.off }; return windowAt(stored.off); } } catch { /* */ }
  const lsKey = 'sb_exrot_' + poolKey;
  const cursor = parseInt(LS[lsKey] || '0', 10) || 0;
  const offset = ((cursor % pool.length) + pool.length) % pool.length;
  LS[lsKey] = String((offset + count) % pool.length);
  LS[offKey] = JSON.stringify({ sid, off: offset });
  W.state[stateKey] = { sid, off: offset };
  return windowAt(offset);
}

// ── 3. Simulate 4 fresh billionaire_modern Scene 1s ──
const STORIES = ['f1cd1b51', 'a7d20e94', '3b8c61fa', 'c0e94d17'].map((s) => 'story_' + s);
const results = STORIES.map((sid) => {
  W.state.storyId = sid;
  const windows = {};
  for (const key in POOLS) windows[key] = rotatingExemplars(key, POOLS[key].data, POOLS[key].count);
  return { sid, windows };
});

// ── 4. CHECK: no banned literal in any of the 5 target pools ──
console.log('=== banned-literal scan: target pools ===');
for (const k in POOLS) POOLS[k].data.forEach((e) => { const h = scan(e); if (h.length) fail(`${POOLS[k].name}: "${e}" → [${h.join(', ')}]`); });

// ── 5. CHECK: no banned literal in ANY window._*_POOL array (catches sibling pools) ──
console.log('=== banned-literal scan: ALL window._*_POOL arrays ===');
{
  const re = /window\.(_[A-Z0-9_]*POOL)\s*=\s*(\[[\s\S]*?\]);/g; let m; let n = 0;
  while ((m = re.exec(src))) { n++; let arr; try { arr = eval(m[2]); } catch { continue; } if (!Array.isArray(arr)) continue; arr.forEach((e) => { const h = scan(e); if (h.length) fail(`${m[1]}: "${e}" → [${h.join(', ')}]`); }); }
  console.log(`  scanned ${n} pools`);
}

// ── 6. CHECK: windows rotate across fresh storyIds ──
console.log('=== rotation: windows differ across storyIds ===');
for (const key in POOLS) {
  const uniq = new Set(results.map((r) => r.windows[key].join('|')));
  if (uniq.size < 2) fail(`${key}: NO rotation (${uniq.size}/4 distinct)`);
  else console.log(`  ✓ ${key} — ${uniq.size}/4 distinct windows`);
}

// ── 7. CHECK: no exemplar over-exposed (≥3/4 windows) ──
console.log('=== over-exposure: any exemplar in ≥3/4 windows ===');
for (const key in POOLS) {
  const freq = {};
  results.forEach((r) => r.windows[key].forEach((e) => { freq[e] = (freq[e] || 0) + 1; }));
  Object.entries(freq).filter(([, c]) => c >= 3).forEach(([e, c]) => fail(`${key}: "${e}" in ${c}/4 windows`));
}

console.log('');
if (failed) { console.log('RESULT: ✗ FAIL — a de-primed literal leaked back or rotation collapsed.'); process.exit(1); }
console.log('RESULT: ✓ PASS — pools clean, windows rotate, no over-exposure.');
