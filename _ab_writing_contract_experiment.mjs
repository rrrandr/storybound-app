// ══════════════════════════════════════════════════════════════════════════════════════════════
// A/B: THE WRITING CONTRACT — ONE FROZEN SCENE REQUEST, TWO AUTHOR INSTRUCTIONS
// ══════════════════════════════════════════════════════════════════════════════════════════════
// NOT two consecutive scenes. ONE continuation request, frozen by the runner's SB_AB_FREEZE hook
// BEFORE any author reply existed, dispatched twice:
//     arm A — the author instructions production ships today
//     arm B — the same request with the screenplay/interiority contradiction reconciled
// The runner REFUSED the page's own author call, so no scene was mounted and neither reply can
// enter the other's context or become accepted story history.
//
// WHAT IS HELD CONSTANT: everything. Both arms POST the same frozen body to the same endpoint —
// same lore, personality, bibles, committed history, player input, planner assignment, scaffold,
// causal outline, model, temperature, output schema and 8,000-token allowance. The ONLY difference
// is ARM_B_EDITS, and the harness PROVES that by reconstructing B from A byte-for-byte before it
// spends anything.
//
// PRODUCTION IS UNCHANGED. Arm B's wording is applied to the captured body at dispatch time;
// public/app.js still ships arm A.
//
// Usage:  SB_AB_FROZEN=<file> SB_AB_CEILING=<usd> SB_AB_PRIOR=<usd> node _ab_writing_contract_experiment.mjs
//         SB_AB_DRYRUN=1 asserts the arms and prints the diff WITHOUT dispatching.
import fs from 'fs';
import { estimateUsd } from './_fsc_cost_guard.mjs';

const FROZEN_PATH = process.env.SB_AB_FROZEN || '_ab_writing_out/frozen_author_request.json';
const DRY = process.env.SB_AB_DRYRUN === '1';
const CEILING = Number(process.env.SB_AB_CEILING || 0);
const PRIOR = Number(process.env.SB_AB_PRIOR || 0);
const OUT = '_ab_writing_out/run_' + new Date().toISOString().replace(/[:.]/g, '-');

if (!DRY && !(CEILING > 0)) {
  console.error('*** REFUSING TO DISPATCH: no ceiling. Pass SB_AB_CEILING with the approved amount. ***');
  process.exit(2);
}
if (!fs.existsSync(FROZEN_PATH)) {
  console.error('*** NO FROZEN REQUEST at ' + FROZEN_PATH + '. Run the runner with SB_AB_FREEZE first. ***');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });
const LOG = fs.createWriteStream(OUT + '/run.log');
const say = (m) => { const s = String(m); process.stdout.write(s + '\n'); LOG.write(s + '\n'); };
const write = (f, o) => fs.writeFileSync(OUT + '/' + f, typeof o === 'string' ? o : JSON.stringify(o, null, 2));

// ── THE ONLY DIFFERENCE BETWEEN THE ARMS ────────────────────────────────────────────────────
// Each edit must match EXACTLY ONCE or the run aborts before spending: a silently-unapplied edit
// would make B identical to A and the comparison worthless.
//
// EDIT 1 removes the contradiction. The shipped clause defines screenplay-native AGAINST
// "novelistic narration with interiority and literary description". The contract that produced the
// 1,478-word / 20-beat draft REQUIRES interiority ("INTERIORITY DECODES; IT DOES NOT ENCODE") and
// requires narration to carry "perception, subtext, physical response, and consequence AROUND the
// utterance, never IN PLACE OF it".
//
// EDIT 2 does NOT forbid short beats. The permission to write one sharp sentence is kept verbatim.
// What is added is the distinction between a short beat (legitimate) and a scene made of labels
// (the failure). No word quota, no example, no style blacklist, no stripped lore, no metadata
// removal, no second call, no segmentation stage. The 700-1000-word requirement is untouched.
const ARM_B_EDITS = [
  {
    // BOTH PARAGRAPHS, AS ONE REPLACEMENT. The first pass changed only the "rather than as
    // novelistic narration with interiority" clause and left its NEIGHBOUR — "TWO FAILURES …
    // (1) Literary prose cut into beats — paragraphs of interiority with beat boundaries dropped
    // in" — untouched. Arm B would then have permitted her perception and thought in one
    // paragraph and condemned it in the next, and the experiment could have bought an
    // inconclusive result. The reconciled version distinguishes ARBITRARY SEGMENTATION (the real
    // failure: prose chopped where paragraphs happened to break) from perception and thought
    // carried INSIDE a staged moment (legitimate).
    name: 'screenplay governs form, not substance — and the neighbouring prohibition agrees',
    find: 'WHAT THAT GOVERNS IS THE FORM, NOT THE SUBSTANCE. "Screenplay-native" means the scene'
      + ' arrives as staged beats — what is done, what is said, what is seen — rather than as'
      + ' novelistic narration with interiority and literary description. It does NOT mean a thin'
      + ' scene, a summary, or one line per moment. A screenplay scene is FULLY ENACTED: a person'
      + ' makes a demand, another answers it, the exchange continues, and the situation is different'
      + ' afterwards. That is what the word budget below is for.\n'
      + 'TWO FAILURES, BOTH WRONG. (1) Literary prose cut into beats — paragraphs of interiority with'
      + ' beat boundaries dropped in. (2) An outline rendered as captions — each development reduced'
      + ' to a single declarative line so the scene reads as its own summary. Write the scene, in'
      + ' screenplay-native beats, at the length the moments actually need.',
    replace: 'WHAT THAT GOVERNS IS THE FORM, NOT THE SUBSTANCE. "Screenplay-native" governs STAGING,'
      + ' DIALOGUE AND BEAT DELIVERY: the scene arrives as staged beats — what is done, what is said,'
      + ' what is seen, and what the point-of-view character makes of it as it happens. It does NOT'
      + ' exclude her perception, her thought, her physical response or her voice. Those ride INSIDE'
      + ' the staged moment, carried around the spoken and the done rather than in place of them.'
      + ' What is excluded is literary ornament and essayistic digression — NOT interiority. A reader'
      + ' must never have to reconstruct the situation from her feelings about it: at any important'
      + ' moment they should know where we are, what just happened, what she wants now, what prevents'
      + ' it, and what she fears will follow. It does NOT mean a thin scene, a summary, or one line'
      + ' per moment. A screenplay scene is FULLY ENACTED: a person makes a demand, another answers'
      + ' it, the exchange continues, and the situation is different afterwards. That is what the word'
      + ' budget below is for.\n'
      + 'TWO FAILURES, BOTH WRONG. (1) ARBITRARY SEGMENTATION — a continuous passage written as prose'
      + ' and then divided at convenient points, so the beat boundaries fall where a paragraph'
      + ' happened to break instead of where the moments are. The test is whether each beat is ONE'
      + ' moment — NOT whether it contains her perception or her thought. A staged moment that'
      + ' carries both is correct, and is not this failure. (2) An outline rendered as captions —'
      + ' each development reported in a single declarative line so the scene reads as its own'
      + ' summary. Write the scene, in screenplay-native beats, at the length the moments actually'
      + ' need.'
  },
  {
    // THE CRITERION IS ENACTMENT, NOT LENGTH. The first pass said "THE FAILURE IS NOT A SHORT BEAT
    // — IT IS A SCENE MADE OF THEM", which smuggles shortness back in as the measure. It is not.
    // A moment complete in a few words has not failed. What fails is a load-bearing moment
    // REPORTED instead of played out. No sentence count, no word count, no beat-length rule.
    name: 'the criterion is summary vs enactment, not sentence length',
    find: 'A beat is still never a scene.',
    replace: 'A beat is still never a scene. WHAT FAILS IS SUMMARY, NOT BREVITY. A beat fails when it'
      + ' REPORTS the situation instead of enacting it — stating that pressure landed, that a'
      + ' restriction weighs, that something was understood — while the interaction it belongs to is'
      + ' never carried any further. A moment that is genuinely complete in a few words has NOT'
      + ' failed, and NO beat is wrong merely for being short. What is wrong is a scene whose'
      + ' load-bearing moments are named rather than played: where a moment is load-bearing the'
      + ' exchange CONTINUES — the other person answers, and the cost arrives on the page. Before'
      + ' returning the scene, read it whole and ask of each load-bearing moment whether it was'
      + ' ENACTED or merely REPORTED.'
  }
];

const froz = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
const FROZEN_URL = froz.url;
const frozen = froz.body;
say('=== A/B WRITING CONTRACT ===');
say('frozen request: ' + FROZEN_PATH + (froz.frozenAt ? ('  (captured ' + froz.frozenAt + ')') : ''));
say('endpoint: ' + FROZEN_URL);
say('ONE frozen body, dispatched twice. The page\'s own author call was REFUSED — nothing entered history.');
say(DRY ? 'DRY RUN — the arms are asserted and the diff printed; NOTHING is dispatched.'
        : ('ceiling $' + CEILING.toFixed(6) + ' · prior exposure $' + PRIOR.toFixed(6)));

// ── BUILD BOTH BODIES, AND PROVE THEY DIFFER ONLY AS DECLARED ───────────────────────────────
const armA = JSON.parse(JSON.stringify(frozen));
const armB = JSON.parse(JSON.stringify(frozen));
let sysB = String(armB.messages[0].content);
const applied = [];
for (const e of ARM_B_EDITS) {
  const n = sysB.split(e.find).length - 1;
  if (n !== 1) {
    say('\n*** ABORT BEFORE SPENDING — arm-B edit "' + e.name + '" matched ' + n
      + ' time(s) in the frozen prompt (expected exactly 1). ***');
    say('    An unapplied edit would make B identical to A and the comparison worthless.');
    process.exit(3);
  }
  sysB = sysB.replace(e.find, e.replace);
  applied.push({ name: e.name, findChars: e.find.length, replaceChars: e.replace.length });
}
armB.messages[0].content = sysB;

const aKeys = Object.keys(armA).sort(), bKeys = Object.keys(armB).sort();
const sameKeys = JSON.stringify(aKeys) === JSON.stringify(bKeys);
const sameNonSystem = JSON.stringify(armA.messages.slice(1)) === JSON.stringify(armB.messages.slice(1));
const sameScalars = aKeys.filter((k) => k !== 'messages')
  .every((k) => JSON.stringify(armA[k]) === JSON.stringify(armB[k]));
let recon = String(armA.messages[0].content);
for (const e of ARM_B_EDITS) recon = recon.replace(e.find, e.replace);
const reconExact = recon === armB.messages[0].content;

write('arm_A_request.json', armA);
write('arm_B_request.json', armB);
write('arm_B_edits.json', ARM_B_EDITS);
say('\n── THE ONLY DIFFERENCE ──');
applied.forEach((a, i) => say('  ' + (i + 1) + '. ' + a.name + '  (' + a.findChars + ' -> ' + a.replaceChars + ' chars)'));
say('  model / max_tokens / temperature   : ' + JSON.stringify({
  model: armA.preferredModel || armA.model || null, max_tokens: armA.max_tokens, temperature: armA.temperature }));
say('  top-level keys identical           : ' + sameKeys + '  (' + aKeys.length + ' keys)');
say('  non-system messages identical      : ' + sameNonSystem
  + '  (' + (armA.messages.length - 1) + ' message(s), ' + JSON.stringify(armA.messages.slice(1)).length + ' chars)');
say('  model/max_tokens/temperature same  : ' + sameScalars);
say('  B reconstructs from A exactly      : ' + reconExact);
say('  system prompt chars  A=' + armA.messages[0].content.length + '  B=' + armB.messages[0].content.length
  + '  (delta ' + (armB.messages[0].content.length - armA.messages[0].content.length) + ')');
if (!(sameKeys && sameNonSystem && sameScalars && reconExact)) {
  say('\n*** ABORT BEFORE SPENDING — the arms differ by more than the declared edits. ***');
  process.exit(4);
}
say('  VERIFIED: the arms differ ONLY in the two declared substrings.');

// ── READ THE WHOLE RESULTING OPENING, NOT JUST THE REPLACED SUBSTRINGS ──────────────────────
// The first preparation pass reconciled one clause and left its neighbour contradicting it. The
// only way to catch that is to read the assembled block, so both arms' openings are written out
// in full and arm B's is printed here before anything is dispatched.
const OPENING_CHARS = 2600;
write('arm_A_opening.txt', armA.messages[0].content.slice(0, OPENING_CHARS));
write('arm_B_opening.txt', armB.messages[0].content.slice(0, OPENING_CHARS));
say('\n── ARM B, COMPLETE OPENING AS ASSEMBLED (read it, do not trust the diff) ──');
say(armB.messages[0].content.slice(0, 2100).split('\n').map((l) => '  | ' + l).join('\n'));
// A contradiction guard with teeth: no residue of the prohibitions arm B is supposed to have
// reconciled may survive anywhere in arm B's prompt.
const RESIDUE = [
  'novelistic narration with interiority',
  'paragraphs of interiority with beat boundaries dropped in',
  'IT IS A SCENE MADE OF THEM'
];
const residueFound = RESIDUE.filter((r) => armB.messages[0].content.indexOf(r) !== -1);
say('\n  residual contradicting text in arm B: ' + (residueFound.length ? residueFound.join(' | ') : 'NONE'));
if (residueFound.length) {
  say('*** ABORT BEFORE SPENDING — arm B still contains text that discourages the writing under test. ***');
  process.exit(6);
}

// FAIL CLOSED on an unpriceable model: estimateUsd returns {bounded,estimate,refuseReason} and
// Infinity when it cannot bound the cost. A dispatch that cannot be priced is not dispatched.
const estA = estimateUsd(armA, armA.preferredModel || armA.model, FROZEN_URL);
if (!estA || !estA.bounded) {
  say('\n*** REFUSING TO DISPATCH — the cost cannot be bounded: '
    + ((estA && estA.refuseReason) || 'estimateUsd returned nothing') + ' ***');
  process.exit(5);
}
const estPer = estA.estimate;
say('\n  model priced as ' + estA.model + ' (resolved by ' + estA.resolvedBy + ')');
say('  estimated per arm $' + estPer.toFixed(6) + ' · both arms $' + (estPer * 2).toFixed(6)
  + '  (promptTokens≈' + estA.promptTokens + ', reserved outTokens≈' + estA.outTokens + ')');
if (DRY) {
  write('SUMMARY.json', { dryRun: true, edits: applied, estPerArm: estPer, estBoth: estPer * 2,
    frozenUrl: FROZEN_URL, sameKeys, sameNonSystem, sameScalars, reconExact });
  say('\nDRY RUN COMPLETE — nothing dispatched.  output: ' + OUT);
  process.exit(0);
}

// ── SPEND ───────────────────────────────────────────────────────────────────────────────────
let settled = 0, retained = 0, inFlight = 0, peak = 0;
const calls = [];
// EXPOSURE AT ANY INSTANT: prior + receipted + retained + whatever is reserved RIGHT NOW.
// PEAK is tracked along the actual execution sequence. Summing every reservation ever made is
// NOT peak exposure when calls run one at a time: a receipted call RELEASES its reservation
// before the next is made, so only one author reservation is ever in flight here.
const exposure = () => PRIOR + settled + retained + inFlight;
const mark = () => { const e = exposure(); if (e > peak) peak = e; return e; };

async function dispatch(label, body) {
  const e = estimateUsd(body, body.preferredModel || body.model, FROZEN_URL);
  if (!e || !e.bounded) {
    say('  [' + label + '] REFUSED — cost cannot be bounded: ' + ((e && e.refuseReason) || 'no estimate'));
    return { label, refused: true };
  }
  const est = e.estimate;
  if (exposure() + est > CEILING) {
    say('  [' + label + '] HALTED BEFORE DISPATCH — exposure $' + exposure().toFixed(6)
      + ' + $' + est.toFixed(6) + ' would exceed the ceiling $' + CEILING.toFixed(6));
    return { label, halted: true };
  }
  inFlight += est;
  mark();
  const t0 = Date.now();
  let txt = '', status = 0;
  try {
    const r = await fetch(FROZEN_URL, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    status = r.status; txt = await r.text();
  } catch (e) {
    inFlight -= est; retained += est;
    say('  [' + label + '] DISPATCH FAILED: ' + (e && e.message) + ' — reservation RETAINED as exposure');
    return { label, error: String(e && e.message), retainedEst: est };
  }
  const ms = Date.now() - t0;
  inFlight -= est;
  let parsed = {}; try { parsed = JSON.parse(txt); } catch (_) {}
  const ticks = parsed.usage && parsed.usage.cost_in_usd_ticks;
  let measured = 0, receipt = false, retainedEst = 0;
  // TICKS ARE 1e-10 USD. The first run of this script divided by 1e7 and reported arm B's
  // $0.0986 receipt as $98.60 — a DISPLAY error only: both dispatches were gated by the
  // pre-dispatch ESTIMATE, not by this figure, and no further call followed. Same conversion as
  // _fs_live_sequence.mjs:1056 (`rec.ticks * 1e-10`), which is the authority here.
  if (typeof ticks === 'number' && ticks > 0) {
    measured = ticks * 1e-10; settled += measured; receipt = true;
  } else { retained += est; retainedEst = est; }
  mark();
  const content = (((parsed.choices || [])[0] || {}).message || {}).content || '';
  write(label + '_response_raw.json', txt);
  // ── WHO ACTUALLY WROTE IT ─────────────────────────────────────────────────────────────────
  // Logging the returned model is not enough: the proxy runs a fallback chain
  // (grok-4-1-fast-reasoning -> grok-4-1-fast-non-reasoning -> grok-4.3), and a substituted model
  // makes the arm useless for this comparison. _orchestration carries chainEntry, resolvedModel,
  // reasoningEffort and upstreamAttempts, so a fallback is detectable rather than assumed absent.
  const orch = parsed._orchestration || null;
  const prov = {
    requested: body.preferredModel || body.model || null,
    chainEntry: orch ? orch.chainEntry : null,
    resolvedModel: orch ? orch.resolvedModel : (parsed.model || null),
    reasoningEffort: orch ? orch.reasoningEffort : null,
    upstreamAttempts: orch ? orch.upstreamAttempts : null,
    firstAttempt: orch ? (orch.upstreamAttempts === 1) : null
  };
  const rec = { label, status, ms, model: parsed.model || null, usage: parsed.usage || null,
    measured, receipt, retainedEst, contentChars: content.length, provenance: prov };
  calls.push(rec);
  say('    provenance: requested=' + prov.requested + ' chainEntry=' + prov.chainEntry
    + ' served=' + prov.resolvedModel + ' effort=' + prov.reasoningEffort
    + ' upstreamAttempts=' + prov.upstreamAttempts
    + (prov.firstAttempt === false ? '  *** FALLBACK OCCURRED ***' : ''));
  say('  [' + label + '] status=' + status + ' ' + ms + 'ms model=' + (parsed.model || '?')
    + ' in=' + ((parsed.usage || {}).prompt_tokens ?? '?')
    + ' out=' + ((parsed.usage || {}).completion_tokens ?? '?')
    + ' ' + (receipt ? ('receipt $' + measured.toFixed(6)) : ('NO RECEIPT — retained $' + est.toFixed(6))));
  return rec;
}

// ── WHICH ARM(S) TO DISPATCH ────────────────────────────────────────────────────────────────
// SB_AB_ONLY=A completes a pair whose other arm already exists: arm A was refused upstream
// (xAI 429) on the first attempt while arm B was served, so only the control is missing. The
// saved B response is reused verbatim via SB_AB_B_RESPONSE — it is NOT regenerated, so B is
// exactly the passage already read and reported.
const ONLY = String(process.env.SB_AB_ONLY || '').toUpperCase();
const B_SAVED = process.env.SB_AB_B_RESPONSE || null;
if (ONLY) say('\n  DISPATCHING ONLY ARM ' + ONLY + (B_SAVED ? ('; the other arm is reused from ' + B_SAVED) : ''));

say('\n── DISPATCH (the same frozen request) ──');
const rA = (ONLY === 'B') ? { label: 'arm_A_current', skipped: true }
  : await dispatch('arm_A_current', armA);
const rB = (ONLY === 'A') ? { label: 'arm_B_reconciled', skipped: true }
  : await dispatch('arm_B_reconciled', armB);
// Bring the saved arm forward so the measures and the validity check see both.
if (B_SAVED && ONLY === 'A') {
  try {
    const savedTxt = fs.readFileSync(B_SAVED, 'utf8');
    write('arm_B_reconciled_response_raw.json', savedTxt);
    const sp = JSON.parse(savedTxt);
    const so = sp._orchestration || null;
    calls.push({ label: 'arm_B_reconciled', reusedFrom: B_SAVED, status: 200,
      ms: null, model: sp.model || null, usage: sp.usage || null,
      measured: 0, receipt: false, retainedEst: 0,   // already paid for and already in the ledger
      provenance: { requested: armB.preferredModel || armB.model || null,
        chainEntry: so ? so.chainEntry : null,
        resolvedModel: so ? so.resolvedModel : (sp.model || null),
        reasoningEffort: so ? so.reasoningEffort : null,
        upstreamAttempts: so ? so.upstreamAttempts : null,
        firstAttempt: so ? (so.upstreamAttempts === 1) : null } });
    say('  [arm_B_reconciled] REUSED from the earlier dispatch — not regenerated, not re-charged');
  } catch (e) { say('  [arm_B_reconciled] could not reuse saved response: ' + (e && e.message)); }
}

// ── MEASURE (the READING is the finding; these sit underneath it) ────────────────────────────
function measure(label) {
  const p = OUT + '/' + label + '_response_raw.json';
  if (!fs.existsSync(p)) return null;
  let parsed = {}; try { parsed = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
  const content = (((parsed.choices || [])[0] || {}).message || {}).content || '';
  let obj = null;
  try { obj = JSON.parse(content.replace(/^```json\s*|\s*```$/g, '')); } catch (_) {
    const m = content.match(/\{[\s\S]*\}/); if (m) { try { obj = JSON.parse(m[0]); } catch (_) {} }
  }
  if (!obj || !Array.isArray(obj.beats)) return { label, parsed: false, totalChars: content.length };
  const prose = obj.beats.map((b) => String(b.text || '')).join(' ');
  const words = prose.trim() ? prose.trim().split(/\s+/).length : 0;
  write(label + '_beats.txt', obj.beats.map((b, i) => i + ' [' + (b.kind || '?') + ']'
    + (b.speaker ? ' <' + b.speaker + '>' : '') + ' ' + String(b.text || '')).join('\n\n'));
  return { label, parsed: true, beats: obj.beats.length, words, proseChars: prose.length,
    totalChars: content.length,
    proseSharePct: Math.round((prose.length / Math.max(1, content.length)) * 1000) / 10,
    wordsPerBeat: Math.round((words / Math.max(1, obj.beats.length)) * 10) / 10 };
}
const mA = measure('arm_A_current'), mB = measure('arm_B_reconciled');
say('\n── MEASURES ──');
[mA, mB].forEach((m) => { if (m) say('  ' + JSON.stringify(m)); });

// ── VALIDITY: SAME AUTHOR, FIRST ATTEMPT, BOTH ARMS ─────────────────────────────────────────
const pA = (calls.find((c) => c.label === 'arm_A_current') || {}).provenance || null;
const pB = (calls.find((c) => c.label === 'arm_B_reconciled') || {}).provenance || null;
const sameAuthor = !!(pA && pB
  && pA.resolvedModel === pB.resolvedModel
  && pA.chainEntry === pB.chainEntry
  && pA.reasoningEffort === pB.reasoningEffort);
const noFallback = !!(pA && pB && pA.firstAttempt === true && pB.firstAttempt === true);
const VALID = sameAuthor && noFallback;
say('\n── COMPARISON VALIDITY ──');
say('  same chainEntry / served model / reasoning effort : ' + sameAuthor);
say('  both served on the FIRST upstream attempt         : ' + noFallback);
if (!VALID) {
  say('  *** THIS PAIR IS INVALID FOR THE COMPARISON ***');
  say('      A substituted model, or a differing reasoning effort, confounds the only variable');
  say('      under test. Report the result as invalid; do NOT read it as a contract finding.');
} else {
  say('  VALID: both arms were written by the same model on its first attempt.');
}

const sum = (k) => calls.reduce((n, c) => n + (c[k] || 0), 0);
say('\n── SPEND (author arms only; the shared setup is the runner\'s own accounting) ──');
say('  receipted $' + sum('measured').toFixed(6) + ' + retained $' + sum('retainedEst').toFixed(6)
  + ' = $' + (sum('measured') + sum('retainedEst')).toFixed(6));
say('  FINAL EXPOSURE $' + exposure().toFixed(6) + ' of ceiling $' + CEILING.toFixed(6));
say('  PEAK EXPOSURE  $' + peak.toFixed(6) + ' (highest point along the execution sequence,'
  + ' with one reservation in flight at a time)');
if (inFlight > 0.000001) say('  NOTE: $' + inFlight.toFixed(6) + ' outstanding at exit — UNRESOLVED, not forgiven.');

write('SUMMARY.json', { armA: mA, armB: mB, edits: applied, calls, valid: VALID,
  provenance: { armA: pA, armB: pB }, sameAuthor, noFallback,
  settled, retained, inFlight, exposure: exposure(), peak, ceiling: CEILING, prior: PRIOR });
say('\noutput: ' + OUT);
say('ONE PAIR IS DIAGNOSTIC, NOT PROOF OF RELIABILITY.');
