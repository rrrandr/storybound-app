// ── PRICE THE HAIKU CREATIVE CHAIN FROM REAL ASSEMBLED REQUESTS (provider-free, $0) ──────────
// Not an estimate from a plan — these are the byte counts of requests PRODUCTION actually
// assembled, captured by _causal_foundation_delivery_control.mjs and read off disk here.
//
// DENSITY: Haiku 4.5 was MEASURED on this project at 3.97 chars/token (a 345,504-char prompt
// billed 87,110 input tokens). That is the figure used, not the generic 4.0, and not the 2.6 that
// applies to the Claude 5 family. Rates come from _fsc_cost_guard.mjs, the shipped table.
import fs from 'fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const HAIKU = 'claude-haiku-4-5-20251001';
const CPT = 3.97;                      // measured, this project
const RATE = { in: 0.000001, out: 0.000005 };   // $1/M in, $5/M out
const REASONING_MULT = 1.5;            // _fsc_cost_guard.mjs
const SAFETY = 1.2;                    // _fsc_cost_guard.mjs

const bytes = (p) => { try { return fs.statSync(p).size; } catch (_) { return null; } };
const usd = (n) => '$' + n.toFixed(6);

// THE CHAIN, as the experiment specifies it: Haiku on spine, scaffold, scene proposals and prose,
// for literary Scenes 1-3 with its OWN Scene 1 (no baked opening).
// Output budgets are the CEILINGS production actually sends, not guesses at what will be written.
const STAGES = [
  { label: 'ISSUE SPINE (once per run)',        file: '_audit_out/cf_spine_request.txt',          outTok: 6000, n: 1 },
  { label: 'OPENING PLANNER (scene 1)',         file: '_audit_out/cf_opening_planner_request.txt', outTok: 2000, n: 1 },
  { label: 'OPENING AUTHOR (scene 1 prose)',    file: '_audit_out/cf_author_request.txt',          outTok: 3000, n: 1 },
  { label: 'SCENE SCAFFOLD (scenes 2-3)',       file: '_audit_out/cf_scaffold_request.txt',        outTok: 2000, n: 2 },
  { label: 'SCENE PROPOSAL (scene 2)',          file: '_audit_out/cf_cont_planner_s2.txt',         outTok: 2000, n: 1 },
  { label: 'SCENE PROPOSAL (scene 3)',          file: '_audit_out/cf_cont_planner_s3.txt',         outTok: 2000, n: 1 },
  { label: 'CONTINUATION AUTHOR (scene 2)',     file: '_audit_out/cf_cont_author_s2.txt',          outTok: 3000, n: 1 },
  { label: 'CONTINUATION AUTHOR (scene 3)',     file: '_audit_out/cf_cont_author_s3.txt',          outTok: 3000, n: 1 },
];

console.log('=== HAIKU CREATIVE CHAIN — PRICED FROM REAL ASSEMBLED REQUESTS (provider-free, $0) ===');
console.log('model ' + HAIKU + '  ·  ' + CPT + ' chars/token (measured)  ·  $1/M in, $5/M out\n');
console.log('STAGE                                  CHARS   IN TOK  OUT TOK  ×N        COST');
console.log('─'.repeat(78));

let planning = 0, authoring = 0, missing = [];
for (const s of STAGES) {
  const b = bytes(s.file);
  if (b === null) { missing.push(s.file); continue; }
  const inTok = Math.ceil(b / CPT);
  const cost = (inTok * RATE.in + s.outTok * RATE.out) * s.n;
  const isAuthor = /AUTHOR/.test(s.label);
  if (isAuthor) authoring += cost; else planning += cost;
  console.log(s.label.padEnd(36) + String(b).padStart(8)
    + String(inTok).padStart(9) + String(s.outTok).padStart(9)
    + ('  x' + s.n).padStart(5) + usd(cost).padStart(13));
}
if (missing.length) { console.log('\nMISSING CAPTURES: ' + missing.join(', ')); }

const subtotal = planning + authoring;
console.log('─'.repeat(78));
console.log('PLANNING  (spine · scaffold · proposals) '.padEnd(60) + usd(planning).padStart(18));
console.log('AUTHORING (prose, 3 scenes) '.padEnd(60) + usd(authoring).padStart(18));
console.log('SUBTOTAL (nominal) '.padEnd(60) + usd(subtotal).padStart(18));

// The guard's own margins, applied so the RESERVATION is what the governor would hold.
const reserved = subtotal * SAFETY;
console.log('RESERVATION at the guard\'s 1.2x safety margin '.padEnd(60) + usd(reserved).padStart(18));
console.log('  (reasoning multiplier ' + REASONING_MULT + 'x NOT applied — this chain runs no reasoning budget)');

// ── POST-AUTHOR PASSES: the honest unknown ──────────────────────────────────────────────────
// The captures show the continuation path also firing LINE_EDITOR / SPECIALIST_RENDERER /
// NARRATIVE_AUTHOR calls. Those are supporting roles, they are NOT part of the authorized Haiku
// override, and on the shipped routes they go to their own models. They are listed, not priced
// into the Haiku total, and must be disclosed in the run report.
console.log('\nSUPPORTING ROLES SEEN IN THE SAME CAPTURES (not Haiku, not priced here —');
console.log('disclose separately in the run report): LINE_EDITOR, SPECIALIST_RENDERER,');
console.log('NARRATIVE_AUTHOR, NORMALIZATION, STRATEGY_PASS, BACK_COVER_SYNOPSIS.');

const REMAINING = 1.7325690;
console.log('\n' + '='.repeat(78));
console.log('REMAINING AUTHORIZATION        ' + usd(REMAINING).padStart(16));
console.log('THIS CHAIN, RESERVED           ' + usd(reserved).padStart(16)
  + '   (' + ((reserved / REMAINING) * 100).toFixed(1) + '% of headroom)');
console.log('HEADROOM AFTER                 ' + usd(REMAINING - reserved).padStart(16));
console.log('='.repeat(78));
console.log(reserved < REMAINING
  ? '\nVERDICT: the chain FITS inside the existing authorization.'
  : '\nVERDICT: the chain DOES NOT FIT. Do not run it.');
console.log('\nNOTE ON WHAT DOMINATES: the author requests are ~370-576 KB each because the\n'
  + 'literary payload carries the full bible/style stack. Input is ~'
  + (((bytes('_audit_out/cf_cont_author_s3.txt') || 0) / CPT) / 1000).toFixed(0)
  + 'K tokens on the\nlargest scene, so cost scales with PROMPT SIZE, not with how much prose is written.');
