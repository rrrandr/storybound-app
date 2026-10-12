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
    name: 'screenplay governs form, not substance — interiority is not excluded',
    find: 'WHAT THAT GOVERNS IS THE FORM, NOT THE SUBSTANCE. "Screenplay-native" means the scene'
      + ' arrives as staged beats — what is done, what is said, what is seen — rather than as'
      + ' novelistic narration with interiority and literary description.',
    replace: 'WHAT THAT GOVERNS IS THE FORM, NOT THE SUBSTANCE. "Screenplay-native" governs STAGING,'
      + ' DIALOGUE AND BEAT DELIVERY: the scene arrives as staged beats — what is done, what is said,'
      + ' what is seen, and what the point-of-view character makes of it as it happens. It does NOT'
      + ' exclude her perception, her thought, her physical response or her voice. Narration carries'
      + ' those AROUND the spoken and the done — never IN PLACE OF them, and never instead of the'
      + ' event itself. What is excluded is literary ornament and essayistic digression, not'
      + ' interiority: a reader must never have to reconstruct the situation from her feelings about'
      + ' it, and at any important moment they should know where we are, what just happened, what she'
      + ' wants now, what prevents it, and what she fears will follow.'
  },
  {
    name: 'a short beat is fine; a scene made of labels is not',
    find: 'A beat is still never a scene.',
    replace: 'A beat is still never a scene. THE FAILURE IS NOT A SHORT BEAT — IT IS A SCENE MADE OF'
      + ' THEM. A sharp short line is a legitimate choice and some moments need nothing more. What'
      + ' fails is sustained underdevelopment: beat after beat that LABELS the situation — reporting'
      + ' that pressure landed, that a restriction weighs, that something was understood — instead of'
      + ' writing the interaction through, so the scene reads as its own summary. Where a moment is'
      + ' load-bearing the exchange CONTINUES: the other person answers, and the cost arrives on the'
      + ' page. Before you return the scene, read it whole: if most of its beats name what is'
      + ' happening rather than enact it, develop those moments.'
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
let settled = 0, retained = 0, inFlight = 0;
const calls = [];
const exposure = () => PRIOR + settled + retained + inFlight;

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
  if (typeof ticks === 'number' && ticks > 0) { measured = ticks / 1e7; settled += measured; receipt = true; }
  else { retained += est; retainedEst = est; }
  const content = (((parsed.choices || [])[0] || {}).message || {}).content || '';
  write(label + '_response_raw.json', txt);
  const rec = { label, status, ms, model: parsed.model || null, usage: parsed.usage || null,
    measured, receipt, retainedEst, contentChars: content.length };
  calls.push(rec);
  say('  [' + label + '] status=' + status + ' ' + ms + 'ms model=' + (parsed.model || '?')
    + ' in=' + ((parsed.usage || {}).prompt_tokens ?? '?')
    + ' out=' + ((parsed.usage || {}).completion_tokens ?? '?')
    + ' ' + (receipt ? ('receipt $' + measured.toFixed(6)) : ('NO RECEIPT — retained $' + est.toFixed(6))));
  return rec;
}

say('\n── DISPATCH (the same frozen request, twice) ──');
const rA = await dispatch('arm_A_current', armA);
const rB = await dispatch('arm_B_reconciled', armB);

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

const sum = (k) => calls.reduce((n, c) => n + (c[k] || 0), 0);
say('\n── SPEND (author arms only; the shared setup is the runner\'s own accounting) ──');
say('  receipted $' + sum('measured').toFixed(6) + ' + retained $' + sum('retainedEst').toFixed(6)
  + ' = $' + (sum('measured') + sum('retainedEst')).toFixed(6));
say('  TOTAL EXPOSURE $' + exposure().toFixed(6) + ' of ceiling $' + CEILING.toFixed(6));
if (inFlight > 0.000001) say('  NOTE: $' + inFlight.toFixed(6) + ' outstanding at exit — UNRESOLVED, not forgiven.');

write('SUMMARY.json', { armA: mA, armB: mB, edits: applied, calls,
  settled, retained, inFlight, exposure: exposure(), ceiling: CEILING, prior: PRIOR });
say('\noutput: ' + OUT);
say('ONE PAIR IS DIAGNOSTIC, NOT PROOF OF RELIABILITY.');
