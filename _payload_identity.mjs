// PAYLOAD IDENTITY — which model received which instruction?
//
// Every delivery claim this week rested on one marker, `STORYBOUND ARCHITECTURE LAWS`,
// which BOTH pipelines carry. That is a shared marker being used as an identity, and it
// produced a confident wrong answer in both directions: first "this CG payload is the
// Author", then "this literary payload is CG" (that one from a NEGATIVE heuristic — the
// absence of a region-gated builder, which proves nothing).
//
// Rules here: POSITIVE markers only. A payload matching neither is `unknown`, never
// guessed. A payload matching BOTH is `ambiguous` and reported as a defect in the markers.
//
// usage: node _payload_identity.mjs [dir ...]
import fs from 'fs';

export const IDENTITY = {
  // state.sysPrompt = _narrativeEngineHeader + … (app.js:242896). Literary prose author.
  literary_author: ['=== STORYBOUND NARRATIVE ENGINE ==='],
  // lines.push('SCENE INDEX: ' + sceneIndex …) (app.js:207828) — unconditional, at the top
  // of _buildCGScreenplayUserPrompt, before any branch. Unique in the source.
  cg_author: ['SCENE INDEX:'],
};

// NOT identity markers — shared or conditional. Kept named so nobody reaches for them again.
export const NOT_MARKERS = {
  'STORYBOUND ARCHITECTURE LAWS': 'carried by both pipelines — the original mistake',
  'SHARED HUMAN CONVICTION': 'Thornwild lore, region-gated; absence proves nothing',
  'screenplay': 'not reliably emitted',
  'panel': 'appears in literary payloads too',
};

export function identify(text) {
  const hit = k => IDENTITY[k].some(m => text.includes(m));
  const lit = hit('literary_author'), cg = hit('cg_author');
  if (lit && cg) return 'ambiguous';
  if (lit) return 'literary_author';
  if (cg) return 'cg_author';
  return 'unknown';
}

const PROBES = [
  ['WISH CORE',     'WISH AUTHORING CORE'],
  ['ADJUDICATION',  'WISH ADJUDICATION'],
  ['TWIST PHYSICS', 'THE WISH-TWIST SEQUENCE'],
  ['PRICE PHYSICS', 'TAKES ONLY WHAT WAS OFFERED'],
  ['CHARACTER+',    'ROTATE MECHANISMS, NEVER SURFACES'],
  ['SPINE EVENT',   'SCENE SPINE'],
  ['FORBIDDEN INV', 'FORBIDDEN INVENTIONS'],
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = process.argv.slice(2).length ? process.argv.slice(2)
    : fs.readdirSync('_validate_out').map(d => `_validate_out/${d}`).filter(d => {
        try { return fs.statSync(d).isDirectory(); } catch (_) { return false; }
      });
  console.log(`\n${'═'.repeat(104)}`);
  console.log('PAYLOAD IDENTITY + DIRECTIVE INVENTORY   (positive markers only; never inferred from absence)');
  console.log('═'.repeat(104));
  console.log(`${'payload'.padEnd(42)}${'TYPE'.padEnd(17)}${PROBES.map(p => p[0].padEnd(15)).join('')}`);
  const tally = {};
  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => /payload.*\.txt$|^nonauthor_\d+\.txt$/.test(f)).sort(); } catch (_) { continue; }
    for (const f of files) {
      const t = fs.readFileSync(`${dir}/${f}`, 'utf8');
      const type = identify(t);
      tally[type] = (tally[type] || 0) + 1;
      const cells = PROBES.map(([, probe]) => (t.includes(probe) ? 'YES' : '—').padEnd(15)).join('');
      console.log(`${(dir.replace('_validate_out/', '') + '/' + f).padEnd(42)}${type.padEnd(17)}${cells}`);
    }
  }
  console.log('─'.repeat(104));
  console.log('totals: ' + Object.entries(tally).map(([k, v]) => `${k}=${v}`).join('  '));
  if (!tally.cg_author) console.log('\nNOTE: no CG payload found. Any claim that a capture "was CG" is unsupported.');
  if (tally.unknown) console.log(`\n${tally.unknown} UNKNOWN — markers are incomplete; do not classify these by guessing.`);
}
