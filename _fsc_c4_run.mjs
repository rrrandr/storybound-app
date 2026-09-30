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
import { scoreC1, scoreC2, scoreC3, scoreC4, effectiveGate, CHOICE_ANCHORS, aftermathLanded, loadExternalTimelinePhrases, loadAmbiguousTemporal, ROSTER_TOKENS, ERASED_PROSE_TERMS }
  from './_fsc_scoring.mjs';

const PHRASES = loadExternalTimelinePhrases();
const AMBIGUOUS = loadAmbiguousTemporal();

const WISH = 'I want this to have never happened.';
const EXPECT = 'unm.time_gives_way';
// Facts this outcome actually erases, from the SHARED list — no private copy. A divergent copy is
// what produced four false C1 failures on the final run.
const ERASED_TERMS = ERASED_PROSE_TERMS[EXPECT] || [];
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
const pre = await preflight({ verbose: false, wish: WISH, expect: EXPECT, expectChoicePending: true, expectInsideReplacementPOV: true });
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

// ── VOID-RESPONSE GATE — FAIL CLOSED BEFORE SCORING ───────────────────────────────────────────
// Run 3 returned HTTP 502 (NO_RESPONSE_FROM_FUNCTION) with an empty body, and this harness went on
// to print "C1 (mechanical): PASS" and "C3: clean" — green checks on nothing at all. Scanners that
// look for forbidden content trivially pass an empty string. A run with no scene is VOID and must
// never be scored: an absent violation is not an obeyed instruction.
const beatsOk = plan && Array.isArray(plan.beats) && plan.beats.length > 0;
if (status !== 200 || !text || !beatsOk) {
  log('\n  ══ RUN VOID — NOT SCORED ══');
  log('  status=' + status + '  body=' + (raw ? raw.length : 0) + ' bytes  scene='
    + (text ? text.length : 0) + ' chars  beats=' + (plan && plan.beats ? plan.beats.length : 0));
  if (raw && raw.length < 300) log('  upstream said: ' + raw.trim().replace(/\s+/g, ' '));
  log('  No criterion is scored. C1-C4 are UNTESTED by this run, not passed.');
  log('  measured: ' + (measured != null ? '$' + measured.toFixed(6)
    : 'NO RECEIPT RETURNED — no usage reported'));
  fs.writeFileSync(path.join(OUT, 'VOID.json'), JSON.stringify(
    { void: true, status, ms, err, bodyBytes: raw ? raw.length : 0, upstream: raw,
      measured, estimate: guard.estimate, at: new Date().toISOString() }, null, 2));
  log('  evidence: ' + OUT);
  process.exit(5);
}

let prose = text;
if (plan) { const bits = []; JSON.stringify(plan, (k, v) => {
  if (typeof v === 'string' && v.length > 25) bits.push(v); return v; }); prose = bits.join('\n'); }
fs.writeFileSync(path.join(OUT, 'prose.txt'), prose);
log('  prose    : ' + prose.split(/\s+/).filter(Boolean).length + ' words\n');

// ── C2 MECHANICALLY FIRST — PRESENCE **AND** DISPOSITION ──────────────────────────────────────
// The earlier scorer tested presence only and reported a clean C2 on a scene that failed it.
const roster = pre.compiled.roster || [];
const c2 = scoreC2(prose, { roster, tokens: ROSTER_TOKENS, phrases: PHRASES, ambiguous: AMBIGUOUS });
log('C2 — ROSTER **AND** DISPOSITION');
log('  declared roster : ' + roster.join(', '));
log('  mentioned       : ' + (c2.presence.mentioned.join(', ') || '(none)'));
log('  OUTSIDE roster  : ' + (c2.presence.outside.length ? c2.presence.outside.join(', ') : '(none)'));
log('  MISSING         : ' + (c2.presence.missing.length ? c2.presence.missing.join(', ') : '(none)'));
log('  presence        : ' + (c2.presence.ok ? 'PASS' : 'FAIL'));
log('  disposition     : ' + (c2.disposition.ok ? 'PASS' : 'FAIL — ' + c2.disposition.leaks.length
  + ' replaced-timeline leak(s)'));
c2.disposition.leaks.forEach(l => log('     ✗ [' + l.phrases.join(', ') + '] '
  + (l.parties.length ? '(' + l.parties.join(', ') + ') ' : '') + '"' + l.sentence + '"'));
if (c2.retainingParties.length) log('  RETAINING       : ' + c2.retainingParties.join(', '));
log('  C2              : ' + (c2.pass ? 'PASS' : 'FAIL'));

// ── C4 MECHANICALLY — the point of this run ───────────────────────────────────────────────────
log('\nC4 — DOES THE SCENE STOP AT THE CHOICE?');
// SEMANTIC LIFECYCLE CHECK. effectiveGate() === lastBeat is an implementation identity now that the
// gate is derived — always true, so it proves nothing. C4 is scored on what the criterion means:
// the scene reaches the owed choice and holds it open, unresolved, to the last line.
const beats = (plan && Array.isArray(plan.beats)) ? plan.beats : [];
const eg = effectiveGate(plan);
const c4 = scoreC4(plan, { anchors: CHOICE_ANCHORS[EXPECT] });
log('  beats                    : ' + beats.length);
log('  first beat presenting the choice : '
  + (c4.firstChoiceBeat == null ? '(never presented) ✗' : c4.firstChoiceBeat));
log('  beats after it           : ' + (c4.postChoiceBeats ? c4.postChoiceBeats.length : 0)
  + '   (listed below for reading — a new EVENT is not reliably machine-detectable)');
(c4.postChoiceBeats || []).forEach(b => log('       · idx ' + b.idx + ': "' + b.text + '"'));
(c4.violations || []).forEach(v => log('     ✗ ' + v.kind + ' at idx ' + v.idx + ': "' + v.text + '"'));
log('  resolution / time advance after the choice : '
  + ((c4.violations || []).length ? 'FAIL — ' + c4.violations.length : 'none  ✓'));
log('  final beat holds it pending : ' + (c4.finalPending ? 'yes  ✓' : 'NO  ✗'));
log('  final beat               : "' + (c4.finalText || '-') + '"');
log('  C4                       : ' + (c4.pass ? 'PASS' : 'FAIL' + (c4.reason ? ' — ' + c4.reason : '')));
log('  (derived gate ' + eg.gate + '/' + eg.last + ' recorded for provenance only; NOT used as proof)');

log('\nC3 — FORBIDDEN-INVENTION SCAN');
// Declared FIRST: the residue/emission lines below read it, and a later `const` put it in the
// temporal dead zone — which crashed the runner after a successful, already-paid-for call.
// Costless means costless, DEFERRED included.
const c3 = scoreC3(prose, { costless: !pre.compiled.cost });
c3.residue.forEach(s => log('     ✗ magical residue:  "' + s + '"'));
c3.emission.forEach(s => log('     ✗ intervention as emission: "' + s + '"'));
c3.wardrobeAllowed.forEach(s => log('     ~ seed wardrobe (allowed): "' + s + '"'));
log('  magical residue       : ' + (c3.residue.length ? 'FAIL — ' + c3.residue.length : 'clean'));
log('  intervention emission : ' + (c3.emission.length ? 'FAIL — ' + c3.emission.length : 'clean'));
const verdictWords = prose.match(/\b(proved|proof of|confirmed (?:her )?guilt|the Answer (?:showed|revealed|declared))\b/gi) || [];
log('  Answer-as-verdict     : ' + (verdictWords.length ? 'HIT — ' + [...new Set(verdictWords)].join(', ') : 'clean'));
const costWords = c3.explicit.concat(c3.deferred);
c3.explicit.forEach(s => log('     ✗ stated price:   "' + s + '"'));
c3.deferred.forEach(s => log('     ✗ deferred price: "' + s + '"'));
log('  invented cost         : ' + (costWords.length ? 'FAIL — ' + costWords.length : 'clean')
  + '   (record says COST: none)');

// ── C1 — external-timeline narration, shared understanding, erased basis ──────────────────────
log('\nC1 — ONLY THE SEALED CONSEQUENCE (mechanical part)');
const c1 = scoreC1(prose, { phrases: PHRASES, erasedTerms: ERASED_TERMS });
log('  external-timeline narration : ' + (c1.externalTimeline.length ? 'FAIL — ' + c1.externalTimeline.length : 'clean'));
c1.externalTimeline.forEach(e => log('     ✗ [' + e.phrases.join(', ') + '] "' + e.sentence + '"'));
log('  shared understanding        : ' + (c1.sharedUnderstanding.length ? 'FAIL' : 'clean'));
log('  Answer as judge (even simile): ' + (c1.answerVerdict.length ? 'FAIL — ' + c1.answerVerdict.length : 'clean'));
c1.answerVerdict.forEach(e => log('     x "' + e.sentence + '"'));
log('  unpinned "charge"           : ' + (c1.unpinnedCharge.length ? 'FAIL — ' + c1.unpinnedCharge.length : 'clean'));
c1.unpinnedCharge.forEach(e => log('     x "' + e.sentence + '"'));
log('  absence rendered as present : ' + (c1.absenceAsPresence.length ? 'FAIL — ' + c1.absenceAsPresence.length : 'clean'));
c1.absenceAsPresence.forEach(e => log('     ✗ "' + e.sentence + '"'));
log('  choice on erased basis      : ' + (c1.erasedBasis.length ? 'FAIL' : 'clean'));
c1.erasedBasis.forEach(e => log('     ✗ "' + e.term + '" in "' + e.sentence + '"'));
log('  C1 (mechanical)             : ' + (c1.pass ? 'PASS' : 'FAIL')
  + '   (reading still owns the final call)');

log('\nAFTERMATH BEAT — reaction that outlives its reason?');
['Seren', 'Julian', 'Dohkar', 'Lirael'].forEach(n => {
  const r = aftermathLanded(prose, n);
  log('  ' + n.padEnd(7) + ' : ' + (r.landed ? 'yes — "' + r.sentence.slice(0, 92) + '"' : 'no'));
});

fs.writeFileSync(path.join(OUT, 'verdict_input.json'), JSON.stringify(
  { outcomeId: pre.compiled.outcomeId, roster, c1, c2, c3, c4,
    verdictWords: [...new Set(verdictWords)], costWords,
    estimate: guard.estimate, measured,
    words: prose.split(/\s+/).filter(Boolean).length }, null, 2));

// ── COMPLETION IS EXPLICIT ────────────────────────────────────────────────────────────────────
// A previous run crashed HERE, after a successful paid call, and the output gave no sign that the
// response was safely on disk. Persistence and scoring are now separate, stated facts: the run
// writes COMPLETE.json only when scoring finished, and says so either way.
fs.writeFileSync(path.join(OUT, 'COMPLETE.json'), JSON.stringify(
  { persisted: true, scored: true, status, measured, estimate: guard.estimate,
    c1: c1.pass, c2: c2.pass, c3: c3.pass, c4: c4.pass,
    at: new Date().toISOString() }, null, 2));
log('\n  PERSISTED : raw.txt, scene.json, prose.txt, receipt.json, preflight.json  (written before scoring)');
log('  SCORED    : complete — verdict_input.json and COMPLETE.json written');
log('  mechanical: C1 ' + (c1.pass ? 'pass' : 'FAIL') + ' · C2 ' + (c2.pass ? 'pass' : 'FAIL')
  + ' · C3 ' + (c3.pass ? 'pass' : 'FAIL') + ' · C4 ' + (c4.pass ? 'pass' : 'FAIL'));
log('  estimated $' + guard.estimate.toFixed(6) + '  measured $'
  + (measured != null ? measured.toFixed(6) : '?') + '   evidence: ' + OUT);
log('  NO VERDICT RENDERED HERE. C1/C3 are human calls against the sealed record.');
log('  If scoring ever fails, the response is already on disk: re-score for $0 with');
log('    node _fsc_rescore.mjs ' + OUT);
