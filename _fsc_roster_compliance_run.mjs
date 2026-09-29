// SINGLE ROSTER-COMPLIANCE RUN. AUTHORIZED, cap $0.06, ONE call, NO retry.
// Outcome: unm.the_turning_forgotten.  Gated on the zero-cost preflight passing 21/21.
import fs from 'fs';
import path from 'path';
import { preflight } from './_fsc_preflight_control.mjs';
import { guardDispatch, CHARS_PER_TOKEN, REASONING_MULT, SAFETY_MARGIN } from './_fsc_cost_guard.mjs';

// NO AUTHORIZATION IS OUTSTANDING. The $0.25 ceiling is exhausted to $0.041385 and the user has
// explicitly withheld that remainder. REMAINING = 0 makes this runner refuse every dispatch until
// a fresh figure is written here under a new authorization.
const REMAINING = 0;
const CAP = 0.06;
const MODEL = 'grok-4-1-fast-reasoning';
const PROXY = 'http://localhost:3000/api/proxy';
const OUT = '_tempt_fate_fixtures/fsc_roster_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

log('=== ROSTER-COMPLIANCE RUN — cap $' + CAP.toFixed(2) + ', one call, no retry ===\n');
log('PREFLIGHT (zero cost, all network aborted)');
const pre = await preflight({ verbose: false });
pre.checks.filter(c => !c.ok).forEach(c => log('  FAIL ' + c.name + (c.detail ? ' — ' + c.detail : '')));
log('  ' + pre.checks.filter(c => c.ok).length + '/' + pre.checks.length + ' checks, payload '
  + pre.bytes + ' bytes, digest ' + pre.compiled.digest);
if (!pre.ok) { log('\n  PREFLIGHT FAILED — dispatch is not possible. $0 spent.'); process.exit(2); }
log('  PREFLIGHT PASSED — dispatch permitted.\n');

fs.writeFileSync(path.join(OUT, 'preflight.json'), JSON.stringify(
  { checks: pre.checks, bytes: pre.bytes, compiled: pre.compiled, identity: pre.identity }, null, 2));

const body = JSON.parse(pre.body);
body.model = MODEL; body._sbModelOverride = MODEL; body._noFallback = true;

// ── PRE-DISPATCH COST GUARD ───────────────────────────────────────────────────────────────────
// The $0.06 cap was breached once because this runner checked cost AFTER dispatch, when the
// money was already spent. The cap is now a gate, evaluated from prompt size + completion
// budget + published rates, before any socket is opened.
const guard = guardDispatch(body, { model: MODEL, cap: CAP, remainingAuthorization: REMAINING });
log('COST GUARD (pre-dispatch, no network)');
log('  prompt ' + guard.detail.promptChars.toLocaleString() + ' chars → '
  + guard.detail.promptTokens.toLocaleString() + ' est. tokens @ ' + CHARS_PER_TOKEN + ' chars/token');
log('  completion budget ' + (body.max_tokens || '(unset→floor)') + ' × ' + REASONING_MULT
  + ' (reasoning is unbounded by max_tokens) = ' + guard.detail.outTokens.toLocaleString() + ' est. tokens');
log('  raw $' + guard.detail.raw.toFixed(6) + '  × ' + SAFETY_MARGIN + ' margin = ESTIMATE $'
  + guard.estimate.toFixed(6));
log('  cap $' + CAP.toFixed(6) + '   remaining authorization $' + REMAINING.toFixed(6));
if (!guard.allowed) {
  log('\n  REFUSED BEFORE DISPATCH — ' + guard.reason);
  log('  ZERO dispatch. ZERO spend. Nothing was sent upstream.');
  fs.writeFileSync(path.join(OUT, 'cost_guard_refusal.json'), JSON.stringify(guard, null, 2));
  process.exit(3);
}
log('  PERMITTED — estimate is within both the cap and the remaining authorization.\n');

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
  { status, ms, err, model: MODEL, cap: CAP, at: new Date().toISOString() }, null, 2));

let text = '', usage = null;
try { const j = JSON.parse(raw); usage = j.usage || null;
  text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; } catch (_) {}
fs.writeFileSync(path.join(OUT, 'scene.json'), text);
const measured = usage && usage.cost_in_usd_ticks ? usage.cost_in_usd_ticks * 1e-10 : null;
log('  status=' + status + '  ' + ms + 'ms' + (err ? '  ERR=' + err : ''));
log('  measured : ' + (measured != null ? '$' + measured.toFixed(6) : 'not reported')
  + '   cap $' + CAP.toFixed(2) + (measured != null && measured > CAP ? '   ⚠ OVER CAP' : ''));

// Flatten the screenplay JSON to scoreable prose.
let prose = text;
try {
  const d = JSON.parse(text);
  const bits = [];
  JSON.stringify(d, (k, v) => { if (typeof v === 'string' && v.length > 25) bits.push(v); return v; });
  prose = bits.join('\n');
} catch (_) {}
fs.writeFileSync(path.join(OUT, 'prose.txt'), prose);
log('  prose    : ' + prose.split(/\s+/).filter(Boolean).length + ' words\n');

// ── C2 MECHANICALLY FIRST ───────────────────────────────────────────────────────────────────
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
log('  all five present in prose : ' + (roster.every(r => mentioned.indexOf(r) >= 0)));

log('\nC3 — FORBIDDEN-INVENTION SCAN');
const magic = prose.match(/\b(glow\w*|luminous|shimmer\w*|aura|radian\w*|shone with|pulsed with light)\b/gi) || [];
log('  visible wish-energy / magical residue : ' + (magic.length ? 'HIT — ' + [...new Set(magic)].join(', ') : 'clean'));
const verdictWords = prose.match(/\b(proved|proof of|confirmed (?:her )?guilt|the Answer (?:showed|revealed|declared))\b/gi) || [];
log('  Answer-as-verdict                     : ' + (verdictWords.length ? 'HIT — ' + [...new Set(verdictWords)].join(', ') : 'clean'));

log('\nAFTERMATH BEAT — did the reaction land?');
['Seren', 'Julian', 'Dohkar', 'Lirael'].forEach(n => {
  const near = new RegExp(n + '[^.]{0,160}\\b(frown\\w*|puzzl\\w*|unease|uneasy|cannot|could not|can’t|couldn’t|unable|no reason|without knowing|why)\\b', 'i');
  log('  ' + n.padEnd(7) + ' reaction-without-a-reason nearby : ' + near.test(prose));
});

fs.writeFileSync(path.join(OUT, 'verdict_input.json'), JSON.stringify(
  { outcomeId: pre.compiled.outcomeId, roster, mentioned, outside, magic: [...new Set(magic)],
    verdictWords: [...new Set(verdictWords)], measured, words: prose.split(/\s+/).filter(Boolean).length }, null, 2));
log('\n  measured $' + (measured != null ? measured.toFixed(6) : '?') + '   evidence: ' + OUT);
log('  NO VERDICT RENDERED HERE. C1/C3 are human calls against the sealed record.');
