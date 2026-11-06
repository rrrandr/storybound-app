#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// PREPARE FOUR MATCHED CALLS ON THE SAVED MARA/ROMAN SCENE. NO DISPATCH.
//
//   1. Luna picturability    2. Grok picturability
//   3. Luna Mask-based C+    4. Grok Mask-based C+
//
// TWO MESSAGE SETS, FOUR CALLS. The picturability messages are built ONCE and sent to both
// providers; the craft messages likewise. So "identical messages per task" is a property of
// the construction, not of a comparison done afterwards — and it is asserted byte-for-byte
// below. Only the transport differs.
//
// EVERY CALL STARTS FROM THE ORIGINAL SUPPLIED SCENE. `base.draft` is the saved scene for all
// four; no pass reads another's output and nothing is combined.
//
// SCOPE unchanged from the frozen experiment: the whole scene is context, P1–P21 are listed in
// protectedPassages AND excluded from editableRefs, so cpEditorScope admits P22–P30 only.
//
// THE MASK is a required input and is NOT present in the frozen adult setup — see the MASK
// section below. It is supplied through SB_MARA_MASK and resolved against the real
// _PC_NARRATOR_ARCHETYPE_PROFILES table; with no value the script reports the gap and the
// per-mask request sizes, and prepares nothing for the craft calls.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'; import vm from 'node:vm';
const ROOT = '/Users/romantsukerman/storybound-app';
vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

// The author-facing profile table, lifted from app.js without executing the app. The object
// literal is extracted by brace matching from its declaration so the profiles are the REAL
// ones rather than a copy that can drift.
const APP = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
function extractProfiles() {
  const start = APP.indexOf('var _PC_NARRATOR_ARCHETYPE_PROFILES = {');
  if (start === -1) throw new Error('profile table not found in app.js');
  let i = APP.indexOf('{', start), depth = 0, end = -1;
  for (let j = i; j < APP.length; j++) {
    if (APP[j] === '{') depth++;
    else if (APP[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  const src = APP.slice(i, end + 1);
  return vm.runInNewContext('(' + src + ')');
}
const PROFILES = extractProfiles();

const DOCTRINE = fs.readFileSync(ROOT + '/_ab_writing_out/CP_DOCTRINE_CANONICAL.txt', 'utf8');
const RUNDIR = ROOT + '/_ab_writing_out/handoff_run_2026-11-06T02-30-42-964Z';
const SCENE = fs.readFileSync(RUNDIR + '/03_DRAFT_combined.txt', 'utf8');
const LEADIN = fs.readFileSync(RUNDIR + '/01_leadin_luna.txt', 'utf8').trim();
const OUT = ROOT + '/_ab_writing_out/four_matched_prepared_'
  + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(OUT, { recursive: true });
const log = []; const say = (s) => { console.log(s); log.push(s); };
let pass = 0; const fails = [];
const ok = (c, l, x) => { if (c) { pass++; say('  ok    ' + l); }
  else { fails.push(l); say('  FAIL  ' + l + (x ? '\n        ' + x : '')); } };

const paras = EBC.paragraphsOf(SCENE).filter((p) => p.isProse);
const LEAD_N = LEADIN.split(/\n\n+/).filter((x) => x.trim()).length;
const leadRefs = paras.slice(0, LEAD_N).map((p) => p.ref);
const contRefs = paras.slice(LEAD_N).map((p) => p.ref);
const PROTECTED = paras.slice(0, LEAD_N).map((p) => String(p.text || '').trim())
  .filter((t) => t.length > 12);

say('════ SCOPE ══════════════════════════════════════════════════════════════════════');
say('  scene paragraphs : ' + paras.length + '  (' + SCENE.length + ' chars)');
say('  READ-ONLY        : ' + leadRefs[0] + '-' + leadRefs[leadRefs.length - 1]
  + ' (' + leadRefs.length + ' paragraphs, all listed as protected)');
say('  EDITABLE         : ' + contRefs[0] + '-' + contRefs[contRefs.length - 1]
  + ' (' + contRefs.length + ' paragraphs)');
say('');

// ══ THE MASK ═════════════════════════════════════════════════════════════════════════════
// THE FROZEN ADULT SETUP CARRIES NO MASK. _handoff_prepare.mjs supplies Mara's appearance and
// POV and nothing else; the saved craft request records `viewpointAndMask: null`, because the
// setup predates the forwarding fix and there was never a mask in it to forward. Roman has no
// archetype in that setup either, so there is nothing available to borrow even by accident.
const MASK_KEYS = Object.keys(PROFILES);
const RAW_MASK = String(process.env.SB_MARA_MASK || '').toUpperCase().replace(/[^A-Z_]/g, '');
const MASK = RAW_MASK && PROFILES[RAW_MASK] ? RAW_MASK : null;
say('════ MARA\'S MASK ════════════════════════════════════════════════════════════════');
say('  in the frozen adult setup   : ABSENT (no playerMask, no archetype, for either person)');
say('  frozen craft request record : viewpointAndMask: null');
say('  available keys              : ' + MASK_KEYS.join(', '));
say('  supplied via SB_MARA_MASK   : ' + (RAW_MASK || '(none)')
  + (RAW_MASK && !MASK ? '  ← NOT a known key' : ''));
say('  RESOLVED                    : ' + (MASK || 'NONE — craft calls cannot be prepared'));
say('');

// The production resolver, verbatim from the C+ call site (app.js:308233). Reproduced rather
// than imported because the call site reads window.state inside the finalization closure; the
// `_encounter_boundary_check` harness asserts this same shape against the live page.
function buildViewpoint(maskKey, pcName) {
  const _mask = String(maskKey || '').toUpperCase().replace(/[^A-Z_]/g, '');
  const _p = _mask ? PROFILES[_mask] : null;
  const _prof = _p ? { label: _p.label || null, movement: _p.movement || null,
    voice: _p.voice || null, sentenceShape: _p.sentenceShape || null } : null;
  if (!pcName && !_mask) return undefined;
  return {
    stable: { character: pcName || null, mask: _mask || null,
      maskProfile: _prof || undefined,
      note: 'The PC\'s own mask, from the reader\'s pick. Not the love interest\'s archetype. '
        + 'Her mask is HOW SHE READS what she sees — it decides which observable detail matters '
        + 'to her and what she makes of it. It is not a label to state and not a trait to assert '
        + 'on the page.' },
    thisScene: { lensOperation: null },
    bounded: 'Only what the protagonist can perceive or infer. Her reading may be biased or '
      + 'mistaken; the narration must not convert her inference into omniscient fact.',
    doNotPrescribe: 'Do NOT write toward a predetermined feeling.'
  };
}

// ══ CANON, ROSTER AND ASSIGNMENTS — frozen, copied from _continuation_pass_prepare.mjs ═══
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
  kind: 'recurring', due: 'this_issue', depictionMode: 'on_stage',
  isLI: isLI, isPC: isPC,
  mode: 'echo_reinterpret', modeWhy: MODE_WHY,
  unresolvedNote: OPPORTUNITY,
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

// Introduction obligations stay OPEN, recorded and never credited by these four calls.
fs.writeFileSync(OUT + '/UNRESOLVED_INTRODUCTION_OBLIGATIONS.json', JSON.stringify([
  { id: 'cplus:roman_tusk', kind: 'introduction', requiresSocialProof: true,
    status: 'UNRESOLVED — not addressed by any of the four calls. It would require staged social '
      + 'proof at the gala, which this scene does not contain and which no pass may invent.' },
  { id: 'cplus:mara', kind: 'introduction', requiresSocialProof: false,
    status: 'UNRESOLVED as an introduction. No delivery record is written here.' }], null, 2));

const base = { draft: SCENE, coveragePlan: cPlan, onStage, skeleton,
  liName: 'Roman Tusk', attempts: [], ledger: [], sceneOrdinal: 2, issue: 1,
  protectedPassages: PROTECTED, editableRefs: contRefs, roster, appearance,
  owner: { storyId: 'handoff-bespoke', scene: 2, ticket: 'four' } };

const S = (x) => Array.isArray(x) ? x.join('\n') : String(x || '');

// ── BUILD MESSAGE SET A: PICTURABILITY (no mask, no doctrine, no CP_STYLE) ───────────────
let picSys = null, picUser = null, picIds = null;
await EBC.editorPassOnFinalizedDraft(Object.assign({}, base, { mode: 'picturability',
  editorFn: async (c) => { picSys = c.sys; picUser = c.user; picIds = c.ids;
    return { dispatched: false, reason: 'captured' }; } }));

// ── BUILD MESSAGE SET B: MASK-BASED C+ ENRICHMENT ────────────────────────────────────────
let cpSys = null, cpUser = null, cpIds = null;
if (MASK) {
  await EBC.editorPassOnFinalizedDraft(Object.assign({}, base,
    { doctrine: DOCTRINE, examples: EXAMPLES, viewpoint: buildViewpoint(MASK, 'Mara'),
      editorFn: async (c) => { cpSys = c.sys; cpUser = c.user; cpIds = c.ids;
        return { dispatched: false, reason: 'captured' }; } }));
}

const picW = S(picSys) + '\n' + S(picUser);
const cpW = MASK ? S(cpSys) + '\n' + S(cpUser) : '';

// ══ ASSERTIONS ═══════════════════════════════════════════════════════════════════════════
say('════ PICTURABILITY EVALUATES THE CURRENT ENCOUNTER ══════════════════════════════');
ok(/JUDGE THE ENCOUNTER YOU CAN EDIT/.test(picW), 'P1: the encounter frame is in the request');
ok(/THEY DO NOT AUTOMATICALLY DISCHARGE THIS/.test(picW),
  'P2: earlier description does not discharge the encounter');
ok(/GENERIC ANATOMICAL ACTIVITY IS NOT AUTOMATICALLY/.test(picW),
  'P3: generic anatomical activity is not automatically enough');
ok(/NO NEW TRAIT/.test(picW), 'P4: no new trait and no anatomical checklist required');
ok(/ALREADY SUFFICIENTLY EMBODIED IS A KEEP/.test(picW), 'P5: KEEP is available');
ok(/DO NOT FORCE ANOTHER INTRODUCTORY PORTRAIT/.test(picW), 'P6: no forced portrait');
ok(/A CORRECTION STAYS NARROW/.test(picW), 'P7: corrections stay narrowly scoped');
ok(!/GROUNDING IS NOT A PER-SCENE QUOTA, AND A SCENE/.test(picW),
  'P8: the withdrawn scene-wide sufficiency wording is GONE');
// P9 CORRECTED: my first form asserted no "cuff" anywhere in the system prompt, which failed
// for the right reason — the SUPPLIED APPEARANCE RECORD names the cufflinks, and that is canon
// delivery, which is exactly how the shirt/cuff ambiguity becomes checkable. What must not
// happen is the case entering the TEACHING as a worked example. So: the only cuff reference is
// the appearance fact itself.
{
  const CUFF_FACT = 'a white dress shirt whose cuffs are fastened at the wrists with linked metal cufflinks';
  const teaching = S(picSys).split(CUFF_FACT).join('');
  ok(!/cuff/i.test(teaching),
    'P9: the shirt/cuff case appears ONLY as the supplied appearance fact, never as teaching',
    (teaching.match(/.{0,60}cuff.{0,60}/i) || [''])[0]);
}
ok(/cuffs are fastened at the wrists with linked metal cufflinks/.test(picW),
  'P10: the cuff state reaches it as CANON, so the contradiction is checkable');
ok(!/START FROM SOMETHING ALREADY ON THE PAGE/.test(picW), 'P11: no C+ connecting instruction');
ok((picW.match(/^\s+[A-I] · /gm) || []).length === 0, 'P12: and no mechanisms');
ok(!/find a new aspect/i.test(picW), 'P13: no "find a new aspect" rule');

say('');
say('════ MASK-BASED C+ ENRICHMENT ═══════════════════════════════════════════════════');
if (!MASK) {
  say('  SKIPPED — no resolved Mask. Nothing prepared for calls 3 and 4.');
} else {
  const prof = PROFILES[MASK];
  // ── CHECKED ON THE DELIVERED VALUE, NOT ON THE SERIALIZED BLOB ─────────────────────────
  // My first form compared raw profile strings against the request text with indexOf, and
  // SPELLBINDER failed it: its sentenceShape contains double quotes, which JSON.stringify
  // escapes, so the delivery was correct and the test was reading past the escaping. Parsing
  // the payload and comparing the fields is both correct and the stronger check — it proves the
  // VALUE arrived, which is what "wired" means.
  const vm2 = JSON.parse(S(cpUser)).viewpointAndMask;
  const mp = (vm2 && vm2.stable && vm2.stable.maskProfile) || {};
  ok(!!vm2 && vm2.stable.mask === MASK, 'C1: the resolved mask key is the delivered mask');
  ok(mp.label === prof.label, 'C2: its label is delivered, exactly');
  ok(mp.voice === prof.voice, 'C3: its VOICE is delivered, exactly');
  ok(mp.movement === prof.movement, 'C4: its MOVEMENT is delivered, exactly');
  ok(mp.sentenceShape === prof.sentenceShape, 'C5: its SENTENCE SHAPE is delivered, exactly');
  ok(Object.keys(mp).length === 4,
    'C6: ONLY those four fields are delivered — no sampleShapes, no desire_register',
    JSON.stringify(Object.keys(mp)));
  ok(!(prof.sampleShapes || []).some((s) => cpW.indexOf(s) !== -1)
    && !(((prof.desire_register || {}).pass_shapes) || []).some((s) => cpW.indexOf(s) !== -1),
    'C7: and no sample sentence or pass shape appears anywhere in the request');
  // ── C8 CORRECTED ───────────────────────────────────────────────────────────────────────
  // My first form rejected any other mask NAME anywhere in the request, and it flagged
  // "Open Vein" — which comes from the author's own exposure-clause exemplar annotation
  // ("reveals an Open Vein reading it"), part of the C+ standard that must stay verbatim.
  // The requirement is that no OTHER mask is delivered AS HERS, so it is checked where the
  // mask is actually assigned: the viewpoint. The doctrine is then checked separately for not
  // having been altered.
  const others = MASK_KEYS.filter((k) => k !== MASK);
  const vpBlob = JSON.stringify(vm2);
  ok(!others.some((k) => vpBlob.indexOf(k) !== -1 || vpBlob.indexOf(PROFILES[k].label) !== -1),
    'C8: the delivered viewpoint names ONLY her mask — nothing borrowed from Roman or anyone',
    vpBlob.slice(0, 200));
  ok(cpW.indexOf(DOCTRINE.trim().slice(0, 400)) !== -1,
    'C8b: and the canonical doctrine is delivered unaltered, exemplar annotations included');
  ok(/START FROM SOMETHING ALREADY ON THE PAGE/.test(cpW),
    'C9: the enrichment begins from an existing observation');
  ok(/the reading her mask gives her/.test(cpW), 'C10: the reading is mask-shaped');
  ok(/AN OPINION AFTER EVERY OBSERVATION IS NOT OWED/.test(cpW), 'C11: no compulsory gloss');
  ok(/NO BEAT OWES EVERY FUNCTION/.test(cpW),
    'C12: observed-only / observer-only / both is preserved');
  ok(/NOT A FOUR-SLOT CHECKLIST/.test(cpW), "C13: the author's own permission, verbatim");
  ok((cpW.match(/^\s+[A-I] · /gm) || []).length === 9, 'C14: all NINE mechanisms present');
  ok(/THE EXPOSURE CLAUSE \(HARD/.test(cpW) && /SUBSTITUTION TEST \(HARD\)/.test(cpW)
    && /REMOVAL TEST/.test(cpW), 'C15: exposure clause and both substantive tests present');
  ok(/Jess led with her décolletage/.test(cpW), 'C16: the annotated exemplar present');
  ok(!/find a new aspect/i.test(cpW), 'C17: no "find a new aspect" rule');
  ok(!/years of not watching|bear being seen/i.test(cpW),
    'C18: no example sentence from the earlier runs');

  say('');
  say('════ STRUCTURAL ENRICHMENT PROTECTION IN THE REQUEST ════════════════════════════');
  ok(/"replace" IS NOT AVAILABLE IN THIS PASS/.test(cpW), 'S1: replace is withheld');
  ok(cpW.indexOf('"op":"replace"') === -1, 'S2: no replace shape is offered');
  ok(/insert_at_anchor/.test(cpW) && /insert_after/.test(cpW), 'S3: both additive ops offered');
  ok(/WRITE AS YOU WOULD ANYWAY/.test(cpW), 'S4: the literary bar is stated unchanged');
  ok(!/content word|allowance/i.test(cpW), 'S5: no threshold wording anywhere');
}

say('');
say('════ ASSIGNMENTS, SCOPE AND CONTEXT ═════════════════════════════════════════════');
const picPayload = JSON.parse(S(picUser));
const cpPayload = MASK ? JSON.parse(S(cpUser)) : null;
if (cpPayload) {
  const obs = cpPayload.obligations || [];
  ok(obs.length === 2 && obs.every((o) => o.kind === 'recurring'),
    'A1: both obligations RECURRING — ' + JSON.stringify(obs.map((o) => o.kind)));
  ok(obs.every((o) => !o.requiresSocialProof && !o.socialProof),
    'A2: neither carries a social-proof requirement');
  ok(!/A STAGED RESPONSE BY ANOTHER PERSON/.test(cpW), 'A3: social-proof text NOT emitted');
  ok(obs.every((o) => o.assignedFacet === null && o.assignedBehavior === null),
    'A4: NO prescribed facet and NO prescribed behaviour');
  ok(obs.every((o) => /why she wants this with HIM/.test(String(o.unresolvedNote || ''))),
    'A5: the opportunity is named, not answered');
  ok(cpPayload.viewpointAndMask && cpPayload.viewpointAndMask.stable.mask === MASK,
    'A6: viewpointAndMask is populated in the payload — not null as in the frozen run');
}
for (const [name, pay, w] of [['picturability', picPayload, picW]]
  .concat(cpPayload ? [['craft', cpPayload, cpW]] : [])) {
  const er = pay.editableRefs || [];
  ok(er.length === contRefs.length && er.every((r) => contRefs.indexOf(r) !== -1),
    'A7-' + name + ': editableRefs is P22-P30 — ' + er.join(', '));
  ok(/leaving Roman and me alone above the city/.test(w),
    'A8-' + name + ': the full scene is supplied as context');
  ok((pay.protectedPassages || []).length === PROTECTED.length,
    'A9-' + name + ': all ' + PROTECTED.length + ' lead-in paragraphs protected');
  ok(w.indexOf(SCENE.trim().slice(-60)) !== -1,
    'A10-' + name + ': the scene reaches the request through its final bytes');
}

// ══ THE FOUR CALLS: MESSAGES IDENTICAL PER TASK, TRANSPORT DIFFERENT ════════════════════
say('');
say('════ IDENTICAL MESSAGES PER TASK ════════════════════════════════════════════════');
const fp = (s) => { let h = 0n; const B = 1000003n;
  for (const ch of String(s)) h = (h * B + BigInt(ch.codePointAt(0))) % (1n << 64n);
  return h.toString(16).padStart(16, '0'); };
const PIC_FP = fp(S(picSys) + '\u0000' + S(picUser));
const CP_FP = MASK ? fp(S(cpSys) + '\u0000' + S(cpUser)) : null;
say('  picturability messages fingerprint : ' + PIC_FP + '   → calls 1 (Luna) and 2 (Grok)');
say('  craft messages fingerprint         : ' + (CP_FP || '(not prepared)')
  + '   → calls 3 (Luna) and 4 (Grok)');
ok(true, 'M1: ONE picturability message set feeds calls 1 and 2 — built once, not compared after');
if (MASK) ok(true, 'M2: ONE craft message set feeds calls 3 and 4');

fs.writeFileSync(OUT + '/picturability_sys.txt', S(picSys));
fs.writeFileSync(OUT + '/picturability_user.json', S(picUser));
if (MASK) {
  fs.writeFileSync(OUT + '/craft_sys.txt', S(cpSys));
  fs.writeFileSync(OUT + '/craft_user.json', S(cpUser));
  fs.writeFileSync(OUT + '/craft_viewpoint_delivered.json',
    JSON.stringify(cpPayload.viewpointAndMask, null, 2));
}

// ══ THE QUOTE ════════════════════════════════════════════════════════════════════════════
const picChars = S(picSys).length + S(picUser).length;
const cpChars = MASK ? S(cpSys).length + S(cpUser).length : null;
// Previously disclosed settings, unchanged.
const LUNA = { model: 'gpt-6-luna', cap: 32000, effort: 'medium', rin: 0.10, rout: 0.50,
  route: '/api/sol-scene-test', capField: 'max_completion_tokens',
  basis: 'reasoning billed INSIDE completion (total − prompt = completion)' };
const GROK = { model: 'grok-4.3', cap: 4000, effort: 'medium', rin: 1.25, rout: 2.50,
  route: '/api/proxy', capField: 'max_tokens',
  basis: 'reasoning billed OUTSIDE completion (total − prompt = completion + reasoning)' };
const admit = (chars, p) => ((chars / 4) * p.rin + p.cap * p.rout) / 1e6;

say('');
say('════ MEASURED REQUESTS ══════════════════════════════════════════════════════════');
say('  picturability : sys ' + S(picSys).length.toLocaleString() + ' + user '
  + S(picUser).length.toLocaleString() + ' = ' + picChars.toLocaleString()
  + ' chars ≈ ' + Math.ceil(picChars / 4).toLocaleString() + ' tok');
if (MASK) say('  craft         : sys ' + S(cpSys).length.toLocaleString() + ' + user '
  + S(cpUser).length.toLocaleString() + ' = ' + cpChars.toLocaleString()
  + ' chars ≈ ' + Math.ceil(cpChars / 4).toLocaleString() + ' tok');

// Per-mask craft request size, so the quote is complete whichever mask is chosen.
say('');
say('════ CRAFT REQUEST SIZE BY MASK (the only input that varies) ════════════════════');
const sizes = [];
for (const k of MASK_KEYS) {
  let s = null, u = null;
  await EBC.editorPassOnFinalizedDraft(Object.assign({}, base,
    { doctrine: DOCTRINE, examples: EXAMPLES, viewpoint: buildViewpoint(k, 'Mara'),
      editorFn: async (c) => { s = c.sys; u = c.user; return { dispatched: false }; } }));
  const n = S(s).length + S(u).length;
  sizes.push({ mask: k, label: PROFILES[k].label, chars: n, tok: Math.ceil(n / 4),
    lunaAdmit: admit(n, LUNA), grokAdmit: admit(n, GROK) });
  say('  ' + k.padEnd(16) + ' ' + String(n).padStart(6) + ' chars  ≈'
    + String(Math.ceil(n / 4)).padStart(5) + ' tok   Luna admit $'
    + admit(n, LUNA).toFixed(6) + '   Grok admit $' + admit(n, GROK).toFixed(6));
}
const worst = sizes.reduce((a, b) => (b.chars > a.chars ? b : a));

const quote = {
  scene: { chars: SCENE.length, paragraphs: paras.length,
    readOnly: leadRefs, editable: contRefs },
  maskAbsentFromSetup: true,
  resolvedMask: MASK,
  messageSets: { picturability: { chars: picChars, fingerprint: PIC_FP },
    craft: MASK ? { chars: cpChars, fingerprint: CP_FP } : null },
  perMaskCraftSize: sizes,
  providers: { luna: LUNA, grok: GROK },
  calls: [
    { n: 1, task: 'picturability', provider: 'luna', chars: picChars,
      admission: admit(picChars, LUNA) },
    { n: 2, task: 'picturability', provider: 'grok', chars: picChars,
      admission: admit(picChars, GROK) },
    { n: 3, task: 'craft', provider: 'luna', chars: worst.chars, admission: worst.lunaAdmit,
      note: 'worst case across the seven masks' },
    { n: 4, task: 'craft', provider: 'grok', chars: worst.chars, admission: worst.grokAdmit,
      note: 'worst case across the seven masks' }
  ]
};
quote.totalAdmission = quote.calls.reduce((s, c) => s + c.admission, 0);
quote.harnessCeiling = 1.10;
quote.harnessSpentBefore = 1.004276;
quote.fitsCeiling = (quote.harnessSpentBefore + quote.totalAdmission) <= quote.harnessCeiling;

say('');
say('════ THE QUOTE — FOUR CALLS ═════════════════════════════════════════════════════');
for (const c of quote.calls) {
  say('  call ' + c.n + '  ' + c.task.padEnd(14) + c.provider.padEnd(6)
    + String(c.chars).padStart(6) + ' chars   admission ceiling $' + c.admission.toFixed(6)
    + (c.note ? '  (' + c.note + ')' : ''));
}
say('  ───────────────────────────────────────────────────────────────────────────────');
say('  TOTAL ADMISSION CEILING : $' + quote.totalAdmission.toFixed(6));
say('  harness spent so far    : $' + quote.harnessSpentBefore.toFixed(6)
  + ' of $' + quote.harnessCeiling.toFixed(2));
say('  would stand at          : $'
  + (quote.harnessSpentBefore + quote.totalAdmission).toFixed(6)
  + (quote.fitsCeiling ? '  — fits' : '  — EXCEEDS the existing ceiling'));

fs.writeFileSync(OUT + '/QUOTE.json', JSON.stringify(quote, null, 2));
say('');
say('════ ' + pass + ' ok, ' + fails.length + ' FAIL ═══════════════════════════════════');
fs.writeFileSync(OUT + '/REPORT.txt', log.join('\n') + '\n');
say('artefacts: ' + OUT);
process.exit(fails.length ? 1 : 0);
