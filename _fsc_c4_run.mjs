// C4 RUN — unm.time_gives_way, the pending-choice stop, at production scale.
// ONE call, no retry, no fallback. Gated on the zero-cost preflight AND the pre-dispatch cost guard.
//
// AUTHORIZATION IS AN ARGUMENT, NOT A DEFAULT:
//     node _fsc_c4_run.mjs --authorize <usd>
// Without it this refuses before the browser even opens. The figure is the ceiling for THIS run and
// is consumed on execution, not on spend.
import fs from 'fs';
import path from 'path';
import { preflight } from './_fsc_preflight_control.mjs';
import { guardDispatch, CHARS_PER_TOKEN, REASONING_MULT, SAFETY_MARGIN } from './_fsc_cost_guard.mjs';

const WISH = 'I want this to have never happened.';
const EXPECT = 'unm.time_gives_way';
const MODEL = 'grok-4-1-fast-reasoning';
const PROXY = 'http://localhost:3000/api/proxy';
const log = (...a) => console.log(...a);

// ── AUTHORIZATION ─────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const ai = argv.indexOf('--authorize');
const AUTHORIZED = ai >= 0 ? Number(argv[ai + 1]) : 0;
const ESTIMATE_ONLY = argv.includes('--estimate-only');
log('=== C4 RUN — ' + EXPECT + ' — one call, no retry ===\n');
if (!ESTIMATE_ONLY && !(AUTHORIZED > 0)) {
  log('NO AUTHORIZATION. Pass --authorize <usd> to set this run\'s ceiling, or --estimate-only');
  log('to price the call without dispatching. ZERO dispatch. ZERO spend.');
  process.exit(4);
}
log(ESTIMATE_ONLY ? 'MODE: estimate only — nothing will be dispatched.\n'
                  : 'AUTHORIZED CEILING: $' + AUTHORIZED.toFixed(6) + '\n');

const OUT = '_tempt_fate_fixtures/fsc_c4_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(OUT, { recursive: true });

// ── PREFLIGHT (zero cost, every network call aborted) ─────────────────────────────────────────
log('PREFLIGHT (zero cost, all network aborted)');
const pre = await preflight({ verbose: false, wish: WISH, expect: EXPECT, expectChoicePending: true });
pre.checks.filter(c => !c.ok).forEach(c => log('  FAIL ' + c.name + (c.detail ? ' — ' + c.detail : '')));
log('  ' + pre.checks.filter(c => c.ok).length + '/' + pre.checks.length + ' checks, payload '
  + pre.bytes + ' bytes, digest ' + pre.compiled.digest);
if (!pre.ok) { log('\n  PREFLIGHT FAILED — dispatch is not possible. $0 spent.'); process.exit(2); }
log('  PREFLIGHT PASSED.\n');
fs.writeFileSync(path.join(OUT, 'preflight.json'), JSON.stringify(
  { checks: pre.checks, bytes: pre.bytes, compiled: pre.compiled, identity: pre.identity }, null, 2));

const body = JSON.parse(pre.body);
body.model = MODEL; body._sbModelOverride = MODEL; body._noFallback = true;

// ── PRE-DISPATCH COST GUARD ───────────────────────────────────────────────────────────────────
const guard = guardDispatch(body, { model: MODEL, cap: AUTHORIZED, remainingAuthorization: AUTHORIZED });
log('COST GUARD (pre-dispatch, no network)');
log('  prompt ' + guard.detail.promptChars.toLocaleString() + ' chars → '
  + guard.detail.promptTokens.toLocaleString() + ' est. tokens @ ' + CHARS_PER_TOKEN + ' chars/token');
log('  completion ' + (body.max_tokens || '(unset→floor)') + ' × ' + REASONING_MULT + ' = '
  + guard.detail.outTokens.toLocaleString() + ' est. tokens');
log('  raw $' + guard.detail.raw.toFixed(6) + ' × ' + SAFETY_MARGIN + ' margin = ESTIMATE $'
  + guard.estimate.toFixed(6));
fs.writeFileSync(path.join(OUT, 'cost_guard.json'), JSON.stringify(guard, null, 2));
if (ESTIMATE_ONLY) {
  log('\n  ESTIMATE ONLY — nothing dispatched, $0 spent.');
  log('  This run needs a ceiling of at least $' + guard.estimate.toFixed(6));
  process.exit(0);
}
if (!guard.allowed) {
  log('  authorized ceiling $' + AUTHORIZED.toFixed(6));
  log('\n  REFUSED BEFORE DISPATCH — ' + guard.reason);
  log('  ZERO dispatch. ZERO spend. Nothing was sent upstream.');
  process.exit(3);
}
log('  PERMITTED — estimate $' + guard.estimate.toFixed(6) + ' ≤ ceiling $' + AUTHORIZED.toFixed(6) + '\n');

// ── DISPATCH ──────────────────────────────────────────────────────────────────────────────────
log('DISPATCH — one upstream attempt, _noFallback, no retry');
let raw = null, status = null, err = null;
const t0 = Date.now();
try {
  const resp = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  status = resp.status; raw = await resp.text();
} catch (e) { err = String(e && e.message || e); }
const ms = Date.now() - t0;
// PERSIST BEFORE EVALUATION.
fs.writeFileSync(path.join(OUT, 'raw.txt'), raw == null ? '' : raw);
fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(
  { status, ms, err, model: MODEL, authorized: AUTHORIZED, estimate: guard.estimate,
    at: new Date().toISOString() }, null, 2));

let text = '', usage = null;
try { const j = JSON.parse(raw); usage = j.usage || null;
  text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; } catch (_) {}
fs.writeFileSync(path.join(OUT, 'scene.json'), text);
const measured = usage && usage.cost_in_usd_ticks ? usage.cost_in_usd_ticks * 1e-10 : null;
log('  status=' + status + '  ' + ms + 'ms' + (err ? '  ERR=' + err : ''));
log('  ESTIMATED $' + guard.estimate.toFixed(6) + '   MEASURED '
  + (measured != null ? '$' + measured.toFixed(6) : 'not reported')
  + (measured != null ? (measured <= guard.estimate ? '   ✓ estimate held' : '   ⚠ ESTIMATE UNDERSHOT') : ''));
log('  ceiling $' + AUTHORIZED.toFixed(6)
  + (measured != null && measured > AUTHORIZED ? '   ⚠ OVER CEILING' : '   ✓ within ceiling'));

let plan = null; try { plan = JSON.parse(text); } catch (_) {}
let prose = text;
if (plan) { const bits = []; JSON.stringify(plan, (k, v) => {
  if (typeof v === 'string' && v.length > 25) bits.push(v); return v; }); prose = bits.join('\n'); }
fs.writeFileSync(path.join(OUT, 'prose.txt'), prose);
log('  prose    : ' + prose.split(/\s+/).filter(Boolean).length + ' words\n');

// ── C2 MECHANICALLY FIRST ─────────────────────────────────────────────────────────────────────
const roster = pre.compiled.roster || [];
const TOK = { 'pc:lirael': /\bLirael\b/i, 'named:seren': /\bSeren\b/i, 'named:julian': /\bJulian\b/i,
  'role:first_sacrifice_presiding_dohkar': /\bDohkar\b/i,
  'the_assembly': /\b(assembly|crowd|gathering|First Favored)\b/i };
const mentioned = Object.keys(TOK).filter(k => TOK[k].test(prose));
const outside = mentioned.filter(m => roster.indexOf(m) < 0);
log('C2 — MECHANICAL ROSTER CHECK');
log('  declared roster : ' + roster.join(', '));
log('  mentioned       : ' + (mentioned.join(', ') || '(none)'));
log('  OUTSIDE roster  : ' + (outside.length ? outside.join(', ') : '(none)'));
log('  all present in prose : ' + roster.every(r => mentioned.indexOf(r) >= 0));

// ── C4 MECHANICALLY — the point of this run ───────────────────────────────────────────────────
log('\nC4 — DOES THE SCENE STOP AT THE CHOICE?');
const beats = (plan && Array.isArray(plan.beats)) ? plan.beats : [];
const gate = plan ? plan.decisionGateBeatIdx : null;
const lastIdx = beats.length ? beats.length - 1 : null;
const past = (gate != null && lastIdx != null) ? beats.slice(gate + 1) : [];
log('  beats                 : ' + beats.length);
log('  decisionGateBeatIdx   : ' + (gate == null ? '(absent)' : gate));
log('  last beat index       : ' + (lastIdx == null ? '(none)' : lastIdx));
log('  beats AFTER the gate  : ' + past.length + (past.length ? ' ⚠' : '  ✓'));
past.forEach(b => log('     ✗ idx ' + b.idx + ': "' + String(b.text || '').slice(0, 110) + '"'));
log('  final beat            : "' + (lastIdx != null ? String(beats[lastIdx].text || '').slice(0, 140) : '-') + '"');
const gateAtEnd = gate != null && gate === lastIdx;
log('  GATE IS THE LAST BEAT : ' + gateAtEnd + (gateAtEnd ? '  ✓' : '  ⚠'));

log('\nC3 — FORBIDDEN-INVENTION SCAN');
const magic = prose.match(/\b(glow\w*|luminous|shimmer\w*|aura|radian\w*|shone with|pulsed with light)\b/gi) || [];
log('  visible wish-energy   : ' + (magic.length ? 'HIT — ' + [...new Set(magic)].join(', ') : 'clean'));
const verdictWords = prose.match(/\b(proved|proof of|confirmed (?:her )?guilt|the Answer (?:showed|revealed|declared))\b/gi) || [];
log('  Answer-as-verdict     : ' + (verdictWords.length ? 'HIT — ' + [...new Set(verdictWords)].join(', ') : 'clean'));
const costWords = prose.match(/\b(the price|it cost(?: her)?|in exchange|paid for (?:it|this)|the cost was)\b/gi) || [];
log('  invented cost         : ' + (costWords.length ? 'HIT — ' + [...new Set(costWords)].join(', ') : 'clean')
  + '   (record says COST: none)');

log('\nAFTERMATH BEAT — reaction that outlives its reason?');
['Seren', 'Julian', 'Dohkar', 'Lirael'].forEach(n => {
  const near = new RegExp(n + '[^.]{0,160}\\b(again|before|already|cannot|could not|can[’\']t|couldn[’\']t|unable|no reason|without knowing|loses? his place|why)\\b', 'i');
  log('  ' + n.padEnd(7) + ' : ' + near.test(prose));
});

fs.writeFileSync(path.join(OUT, 'verdict_input.json'), JSON.stringify(
  { outcomeId: pre.compiled.outcomeId, roster, mentioned, outside,
    c4: { beats: beats.length, gate, lastIdx, beatsPastGate: past.length, gateAtEnd },
    magic: [...new Set(magic)], verdictWords: [...new Set(verdictWords)],
    costWords: [...new Set(costWords)], estimate: guard.estimate, measured,
    words: prose.split(/\s+/).filter(Boolean).length }, null, 2));
log('\n  estimated $' + guard.estimate.toFixed(6) + '  measured $'
  + (measured != null ? measured.toFixed(6) : '?') + '   evidence: ' + OUT);
log('  NO VERDICT RENDERED HERE. C1/C3 are human calls against the sealed record.');
