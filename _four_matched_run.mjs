#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE FOUR APPROVED CALLS. $0.08 allowance, $1.10 harness ceiling.
//   1 Luna picturability   2 Grok picturability   3 Luna craft   4 Grok craft
//
// MASK: DARK_VICE, from the SOURCE adult setup (_explicit_bakeoff.js:27 picks.playermask,
// :30 s.playerMask). Resolved through the PC chain only.
//
// Each call starts from the ORIGINAL scene. Picturability and craft are independent: no output
// feeds another request. Two message sets, each sent to both providers, byte-identical and
// fingerprint-gated. One attempt per call. Refusal, truncation or an invalid edit is recorded
// as the result and the arm stops — no fallback, no reroll, no retry.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'; import vm from 'node:vm'; import crypto from 'node:crypto';
const ROOT = '/Users/romantsukerman/storybound-app';
const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const ALLOWANCE = 0.08;
const HARNESS_CEILING = 1.10;
const HARNESS_SPENT_BEFORE = 1.004276;
const MASK = 'DARK_VICE';

vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

const APP = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
function extractProfiles() {
  const start = APP.indexOf('var _PC_NARRATOR_ARCHETYPE_PROFILES = {');
  let i = APP.indexOf('{', start), depth = 0, end = -1;
  for (let j = i; j < APP.length; j++) {
    if (APP[j] === '{') depth++;
    else if (APP[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  return vm.runInNewContext('(' + APP.slice(i, end + 1) + ')');
}
const PROFILES = extractProfiles();

const DOCTRINE = fs.readFileSync(ROOT + '/_ab_writing_out/CP_DOCTRINE_CANONICAL.txt', 'utf8');
const RUNDIR = ROOT + '/_ab_writing_out/handoff_run_2026-11-06T02-30-42-964Z';
const SCENE = fs.readFileSync(RUNDIR + '/03_DRAFT_combined.txt', 'utf8');
const LEADIN = fs.readFileSync(RUNDIR + '/01_leadin_luna.txt', 'utf8').trim();
const RUN = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = ROOT + '/_ab_writing_out/four_matched_run_' + RUN;
fs.mkdirSync(OUT, { recursive: true });
const log = []; const say = (s) => { console.log(s); log.push(s); };
const save = (n, o) => fs.writeFileSync(OUT + '/' + n,
  typeof o === 'string' ? o : JSON.stringify(o, null, 2));

const paras = EBC.paragraphsOf(SCENE).filter((p) => p.isProse);
const LEAD_N = LEADIN.split(/\n\n+/).filter((x) => x.trim()).length;
const contRefs = paras.slice(LEAD_N).map((p) => p.ref);
const PROTECTED = paras.slice(0, LEAD_N).map((p) => String(p.text || '').trim())
  .filter((t) => t.length > 12);

// ── CONTEXT, frozen, identical to the prepared and approved requests ────────────────────
const onStage = [
  { label: 'Mara', kind: 'pc', isPC: true, participation: 'major', presence: 'IN_PERSON' },
  { label: 'Roman Tusk', kind: 'character', isLI: true, isPC: false,
    participation: 'major', presence: 'IN_PERSON' }];
const roster = onStage.map((p) => ({ label: p.label, kind: p.kind }));
const appearance = [
  { name: 'Mara', role: 'pc', facts: ['dark hair pinned up for the gala, one pin already working loose',
    'a borrowed green silk dress a half-size too long', 'a thin scar across the left thumb'],
    from: 'SUPPLIED appearance record (bespoke brief fixture)' },
  { name: 'Roman Tusk', role: 'li', facts: ['black dinner jacket shed in the lift',
    'a white dress shirt whose cuffs are fastened at the wrists with linked metal cufflinks',
    'a flat grey stare', 'goes very still before he answers'],
    from: 'SUPPLIED appearance record (bespoke brief fixture)' }];
const MODE_WHY = 'a later depiction RETURNS to the established impression and shows what it now '
  + 'implies, costs, excepts or means. It is neither a first impression nor a restatement.';
const OPPORTUNITY = 'OPEN OPPORTUNITY, NOT A PRESCRIBED ANSWER: what this encounter reveals '
  + 'about these two and about what is between them — including what receiving his attention '
  + 'means to her, and why she wants this with HIM rather than with anyone. Find it in the '
  + 'supplied prose and canon; do not supply a past the scene does not have, and do not turn '
  + 'every action into a revelation.';
const planObligation = (label, isLI, isPC) => ({
  id: 'cplus:' + label.toLowerCase().replace(/\s+/g, '_'), label: label,
  kind: 'recurring', due: 'this_issue', depictionMode: 'on_stage', isLI: isLI, isPC: isPC,
  mode: 'echo_reinterpret', modeWhy: MODE_WHY, unresolvedNote: OPPORTUNITY,
  deliveredThisIssue: 1, wanted: 2, lastDeliveredOrdinal: 1, scenesSinceLastDelivered: 1,
  recurGap: 1,
  why: 'already depicted in the read-only lead-in of this scene; the continuation owes development'
});
const cPlan = { obligations: [planObligation('Roman Tusk', true, false),
  planObligation('Mara', false, true)], satisfied: [], excluded: [] };
const skeleton = { character_plus: [
  { character: 'Roman Tusk', isLI: true, first_mention: false, mode: 'IN_PERSON',
    behavior: '', facet_truth: '', pc_interpretation: '' },
  { character: 'Mara', isPC: true, first_mention: false, mode: 'IN_PERSON',
    behavior: '', facet_truth: '', pc_interpretation: '' }] };
const schedDue = EBC.cpEditorDue({ plan: cPlan, onStage, skeleton, liName: 'Roman Tusk',
  attempts: [], ledger: [], sceneOrdinal: 2, issue: 1 });
const EXAMPLES = EBC.cpExamplesForObligations(schedDue.due || [], []);

// The production resolver, PC chain only.
const prof = PROFILES[MASK];
const VIEWPOINT = {
  stable: { character: 'Mara', mask: MASK,
    maskProfile: { label: prof.label, movement: prof.movement, voice: prof.voice,
      sentenceShape: prof.sentenceShape },
    note: 'The PC\'s own mask, from the reader\'s pick. Not the love interest\'s archetype. '
      + 'Her mask is HOW SHE READS what she sees — it decides which observable detail matters '
      + 'to her and what she makes of it. It is not a label to state and not a trait to assert '
      + 'on the page.' },
  thisScene: { lensOperation: null },
  bounded: 'Only what the protagonist can perceive or infer. Her reading may be biased or '
    + 'mistaken; the narration must not convert her inference into omniscient fact.',
  doNotPrescribe: 'Do NOT write toward a predetermined feeling.'
};

const base = { draft: SCENE, coveragePlan: cPlan, onStage, skeleton,
  liName: 'Roman Tusk', attempts: [], ledger: [], sceneOrdinal: 2, issue: 1,
  protectedPassages: PROTECTED, editableRefs: contRefs, roster, appearance,
  owner: { storyId: 'handoff-bespoke', scene: 2, ticket: 'four' } };
const S = (x) => Array.isArray(x) ? x.join('\n') : String(x || '');

// ══ BUILD THE TWO MESSAGE SETS ══════════════════════════════════════════════════════════
let PIC = null, CRAFT = null;
await EBC.editorPassOnFinalizedDraft(Object.assign({}, base, { mode: 'picturability',
  editorFn: async (c) => { PIC = { sys: S(c.sys), user: S(c.user), ids: c.ids };
    return { dispatched: false, reason: 'captured' }; } }));
await EBC.editorPassOnFinalizedDraft(Object.assign({}, base,
  { doctrine: DOCTRINE, examples: EXAMPLES, viewpoint: VIEWPOINT,
    editorFn: async (c) => { CRAFT = { sys: S(c.sys), user: S(c.user), ids: c.ids };
      return { dispatched: false, reason: 'captured' }; } }));

const fp = (sys, user) => crypto.createHash('sha256')
  .update(sys + '\u0000' + user).digest('hex').slice(0, 16);
const PIC_FP = fp(PIC.sys, PIC.user), CRAFT_FP = fp(CRAFT.sys, CRAFT.user);

save('picturability_sys.txt', PIC.sys);
save('picturability_user.json', PIC.user);
save('craft_sys.txt', CRAFT.sys);
save('craft_user.json', CRAFT.user);
save('craft_viewpoint_delivered.json', JSON.parse(CRAFT.user).viewpointAndMask);

say('════ THE RESOLVED MASK ══════════════════════════════════════════════════════════');
say('  source            : _explicit_bakeoff.js:27 picks.playermask / :30 s.playerMask');
say('  resolved (PC chain): ' + MASK + '  →  "' + prof.label + '"');
const deliv = JSON.parse(CRAFT.user).viewpointAndMask;
say('  delivered          : mask=' + deliv.stable.mask + '  profile fields='
  + Object.keys(deliv.stable.maskProfile).join(','));
say('  FIRST matched comparison to receive a resolved Mask (the frozen run: null).');
say('');
say('════ MESSAGE SETS ═══════════════════════════════════════════════════════════════');
say('  picturability: ' + (PIC.sys.length + PIC.user.length) + ' chars  fp=' + PIC_FP
  + '  → calls 1 (Luna) and 2 (Grok)');
say('  craft        : ' + (CRAFT.sys.length + CRAFT.user.length) + ' chars  fp=' + CRAFT_FP
  + '  → calls 3 (Luna) and 4 (Grok)');
say('  identical per task: built once, dispatched twice.');
say('');

// ══ TRANSPORT ═══════════════════════════════════════════════════════════════════════════
let spent = 0; const ledger = []; let halted = null;
function normLuna(u) {
  if (!u) return { ok: false };
  const inTok = u.prompt_tokens || 0, total = u.total_tokens || 0;
  const completion = u.completion_tokens || 0;
  const reasoning = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0;
  const outTok = total && inTok ? (total - inTok) : completion;
  return { ok: true, inTok, completion, reasoning, outTok,
    basis: 'total − prompt equals completion (reasoning inside completion)',
    usd: (inTok * 0.10 + outTok * 0.50) / 1e6 };
}
function normGrok(u) {
  if (!u) return { ok: false };
  const inTok = u.prompt_tokens || 0, total = u.total_tokens || 0;
  const completion = u.completion_tokens || 0;
  const reasoning = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0;
  const outTok = total && inTok ? (total - inTok) : (completion + reasoning);
  return { ok: true, inTok, completion, reasoning, outTok,
    basis: 'total − prompt (reasoning billed OUTSIDE completion)',
    usd: (inTok * 1.25 + outTok * 2.50) / 1e6 };
}

async function callLuna(label, sys, user, expectFp) {
  if (halted) { say('  x ' + label + ' SKIPPED — halted: ' + halted); return null; }
  const sha = fp(sys, user);
  if (sha !== expectFp) { halted = 'fingerprint:' + label;
    say('  x ' + label + ' fingerprint ' + sha + ' != ' + expectFp + ' — refusing'); return null; }
  const cap = 32000, chars = sys.length + user.length;
  const ceiling = ((chars / 4) * 0.10 + cap * 0.50) / 1e6;
  if (spent + ceiling > ALLOWANCE) { halted = 'allowance';
    say('  x ' + label + ' NOT DISPATCHED — ceiling $' + ceiling.toFixed(6)
      + ' would exceed $' + ALLOWANCE.toFixed(2)); return null; }
  const body = { model: 'gpt-6-luna',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    max_completion_tokens: cap, reasoning_effort: 'medium',
    _sbCallLabel: 'four_' + label + '_' + RUN, _sbRunBudgetUsd: ALLOWANCE };
  const t0 = Date.now();
  const res = await fetch(ORIGIN + '/api/sol-scene-test', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const txt = await res.text(); let outer = null;
  try { outer = JSON.parse(txt); } catch (_) {}
  const up = (outer && outer._upstreamRaw) ? outer._upstreamRaw : outer;
  save('raw_' + label + '.json', { requestShape: { model: body.model, cap, effort: 'medium',
    messagesSha256: sha }, status: res.status, response: outer || txt });
  const ch = (up && up.choices && up.choices[0]) || null;
  const n = normLuna(up && up.usage);
  if (n.ok) spent += n.usd;
  const finish = ch && ch.finish_reason;
  const refusal = (ch && ch.message && ch.message.refusal) || null;
  ledger.push({ call: label, provider: 'luna', requested: 'gpt-6-luna',
    served: (up && up.model) || null, status: res.status, ms: Date.now() - t0, finish, refusal,
    cap, capField: 'max_completion_tokens', effort: 'medium', messagesSha256: sha,
    ceiling, inTok: n.inTok, completion: n.completion, reasoning: n.reasoning,
    billedOut: n.outTok, basis: n.basis, usd: n.usd });
  say('  [' + label + '] status=' + res.status + '  SERVED=' + ((up && up.model) || '—')
    + '  finish=' + (finish || '—') + (refusal ? '  REFUSAL' : '')
    + '  in=' + n.inTok + ' completion=' + n.completion + ' reasoning=' + n.reasoning
    + '  $' + (n.usd != null ? n.usd.toFixed(6) : '?') + '  cum $' + spent.toFixed(6));
  if (refusal) { halted = 'refusal:' + label; say('  STOP — refusal preserved.'); }
  else if (finish === 'length') { halted = 'truncation:' + label;
    say('  STOP — TRUNCATED. Preserved, not retried.'); }
  return ch && ch.message && ch.message.content;
}

async function callGrok(label, sys, user, expectFp) {
  if (halted) { say('  x ' + label + ' SKIPPED — halted: ' + halted); return null; }
  const sha = fp(sys, user);
  if (sha !== expectFp) { halted = 'fingerprint:' + label;
    say('  x ' + label + ' fingerprint ' + sha + ' != ' + expectFp + ' — refusing'); return null; }
  const OUTCAP = 4000;
  const reserve = (Math.ceil((sys.length + user.length) / 4) * 1.25e-6
    + Math.ceil(OUTCAP * 1.5) * 2.5e-6) * 1.2;
  if (spent + reserve > ALLOWANCE) { halted = 'allowance';
    say('  x ' + label + ' NOT DISPATCHED — reservation $' + reserve.toFixed(6)
      + ' would exceed $' + ALLOWANCE.toFixed(2)); return null; }
  const body = { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4.3',
    max_tokens: OUTCAP, reasoningEffort: 'medium' };
  const t0 = Date.now();
  const res = await fetch(ORIGIN + '/api/proxy', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const txt = await res.text(); let outer = null;
  try { outer = JSON.parse(txt); } catch (_) {}
  const up = (outer && outer._upstreamRaw) ? outer._upstreamRaw : outer;
  save('raw_' + label + '.json', { requestShape: { role: body.role,
    preferredModel: body.preferredModel, max_tokens: OUTCAP, reasoningEffort: 'medium',
    messagesSha256: sha }, status: res.status, response: outer || txt });
  const ch = (up && up.choices && up.choices[0]) || null;
  const n = normGrok(up && up.usage);
  if (n.ok) spent += n.usd;
  const finish = ch && (ch.finish_reason || ch.finishReason);
  const refusal = (ch && ch.message && ch.message.refusal) || null;
  const served = (up && (up.model || up.servedModel)) || (outer && outer.servedModel) || null;
  ledger.push({ call: label, provider: 'grok', requested: 'grok-4.3', served,
    status: res.status, ms: Date.now() - t0, finish, refusal,
    cap: OUTCAP, capField: 'max_tokens', effort: 'medium', messagesSha256: sha,
    reserve, inTok: n.inTok, completion: n.completion, reasoning: n.reasoning,
    billedOut: n.outTok, basis: n.basis, usd: n.usd });
  say('  [' + label + '] status=' + res.status + '  SERVED=' + (served || '—')
    + '  finish=' + (finish || '—') + (refusal ? '  REFUSAL' : '')
    + '  in=' + n.inTok + ' completion=' + n.completion + ' reasoning=' + n.reasoning
    + ' billedOut=' + n.outTok + '  $' + (n.usd != null ? n.usd.toFixed(6) : '?')
    + '  cum $' + spent.toFixed(6));
  if (refusal) { halted = 'refusal:' + label; say('  STOP — refusal preserved.'); }
  else if (finish === 'length') { halted = 'truncation:' + label;
    say('  STOP — TRUNCATED. Preserved, not retried.'); }
  return ch && ch.message && ch.message.content;
}

// ══ APPLY A REPLY THROUGH THE REAL VALIDATOR + SPLICE ═══════════════════════════════════
// Every call starts from the ORIGINAL scene, so each result is applied to SCENE independently.
async function apply(label, replyRaw, mode) {
  if (replyRaw == null) { save(label + '_result.json', { reason: 'no reply' }); return null; }
  save(label + '_reply_raw.txt', String(replyRaw));
  const opts = Object.assign({}, base, mode === 'picturability'
    ? { mode: 'picturability' }
    : { doctrine: DOCTRINE, examples: EXAMPLES, viewpoint: VIEWPOINT });
  const res = await EBC.editorPassOnFinalizedDraft(Object.assign({}, opts, {
    editorFn: async () => ({ dispatched: true, content: String(replyRaw),
      usage: { prompt_tokens: 1, completion_tokens: 1 } }) }));
  save(label + '_result.json', res);
  save(label + '_after.txt', res.text || SCENE);
  const changed = (res.text || SCENE) !== SCENE;
  say('  ' + label.padEnd(14) + ' → ' + (res.reason || '—')
    + '  | applied=' + ((res.applied || []).length)
    + ' keeps=' + ((res.keeps || []).length)
    + ' rejected=' + ((res.rejected || []).length)
    + ' | prose ' + (changed ? 'CHANGED (' + ((res.text || '').length - SCENE.length) + ' chars)'
      : 'UNCHANGED'));
  for (const r of (res.rejected || [])) {
    say('      REJECTED ' + (r.tag || r.id || '?') + ': ' + (r.code || '?'));
  }
  return res;
}

say('════ DISPATCH ═══════════════════════════════════════════════════════════════════');
const r1 = await callLuna('1_luna_picture', PIC.sys, PIC.user, PIC_FP);
const r2 = await callGrok('2_grok_picture', PIC.sys, PIC.user, PIC_FP);
const r3 = await callLuna('3_luna_craft', CRAFT.sys, CRAFT.user, CRAFT_FP);
const r4 = await callGrok('4_grok_craft', CRAFT.sys, CRAFT.user, CRAFT_FP);

say('');
say('════ APPLY (each to the ORIGINAL scene, independently) ══════════════════════════');
const a1 = await apply('1_luna_picture', r1, 'picturability');
const a2 = await apply('2_grok_picture', r2, 'picturability');
const a3 = await apply('3_luna_craft', r3, 'craft');
const a4 = await apply('4_grok_craft', r4, 'craft');

save('LEDGER.json', { ALLOWANCE, spent, ledger, halted,
  harnessCeiling: HARNESS_CEILING, harnessSpentBefore: HARNESS_SPENT_BEFORE,
  harnessSpentAfter: HARNESS_SPENT_BEFORE + spent,
  mask: MASK, maskSource: '_explicit_bakeoff.js:27 picks.playermask / :30 s.playerMask',
  picFingerprint: PIC_FP, craftFingerprint: CRAFT_FP });
save('SCENE_original.txt', SCENE);

say('');
say('════ ACCOUNTING ═════════════════════════════════════════════════════════════════');
for (const l of ledger) {
  say('  call ' + l.call.padEnd(16) + l.provider.padEnd(6) + 'served=' + (l.served || '—')
    + '  in=' + l.inTok + ' billedOut=' + l.billedOut + '  $' + (l.usd || 0).toFixed(6));
}
say('  spent $' + spent.toFixed(6) + ' of $' + ALLOWANCE.toFixed(2)
  + '   halted=' + (halted || 'no'));
say('  harness $' + HARNESS_SPENT_BEFORE.toFixed(6) + ' → $'
  + (HARNESS_SPENT_BEFORE + spent).toFixed(6) + ' of $' + HARNESS_CEILING.toFixed(2));
save('REPORT.txt', log.join('\n') + '\n');
say('artefacts: ' + OUT);
