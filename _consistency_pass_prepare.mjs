#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// PREPARE ONE LUNA CONSISTENCY PASS ON THE SAVED GROK CRAFT OUTPUT. NO DISPATCH.
//
// INPUT: an unchanged copy of 4_grok_craft_after.txt — the paid Grok craft result, which
// carries BOTH demonstrated defects: the duplicated sentence in P29 and the clothing/position
// ambiguity across P24/P26/P29. The original is copied into the artefact directory untouched.
//
// MECHANISM: the existing named-task editor (`opts.task` → CP_TASK). Not a Character+ pass and
// not a picturability pass: task mode emits neither the C+ doctrine nor the grounding block, and
// `enrichment` is false in task mode, so `replace` is available — which this pass needs, because
// removing a duplicate and rewording a contradictory clothing reference are not additions.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'; import vm from 'node:vm'; import crypto from 'node:crypto';
const ROOT = '/Users/romantsukerman/storybound-app';
vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

const SRC = ROOT + '/_ab_writing_out/four_matched_run_2026-11-06T08-45-51-691Z';
const DRAFT = fs.readFileSync(SRC + '/4_grok_craft_after.txt', 'utf8');
const LEADIN = fs.readFileSync(ROOT
  + '/_ab_writing_out/handoff_run_2026-11-06T02-30-42-964Z/01_leadin_luna.txt', 'utf8').trim();
const OUT = ROOT + '/_ab_writing_out/consistency_prepared_'
  + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(OUT, { recursive: true });
const log = []; const say = (s) => { console.log(s); log.push(s); };
let pass = 0; const fails = [];
const ok = (c, l, x) => { if (c) { pass++; say('  ok    ' + l); }
  else { fails.push(l); say('  FAIL  ' + l + (x ? '\n        ' + x : '')); } };

// The input is preserved before anything reads it.
fs.writeFileSync(OUT + '/INPUT_grok_craft_unchanged.txt', DRAFT);

const paras = EBC.paragraphsOf(DRAFT).filter((p) => p.isProse);
const LEAD_N = LEADIN.split(/\n\n+/).filter((x) => x.trim()).length;
const contRefs = paras.slice(LEAD_N).map((p) => p.ref);
const PROTECTED = paras.slice(0, LEAD_N).map((p) => String(p.text || '').trim())
  .filter((t) => t.length > 12);

say('════ INPUT ══════════════════════════════════════════════════════════════════════');
say('  source      : 4_grok_craft_after.txt (paid Grok craft result, unchanged)');
say('  chars       : ' + DRAFT.length + '   paragraphs: ' + paras.length);
say('  READ-ONLY   : P1-P' + LEAD_N + ' (protected)');
say('  EDITABLE    : ' + contRefs[0] + '-' + contRefs[contRefs.length - 1]);
const DUP = 'He groaned my name into my neck, one hand sliding between us to circle my clit with slick fingers.';
say('  duplicate   : the P29 sentence occurs ' + (DRAFT.split(DUP).length - 1) + 'x');
say('  door line   : ' + (DRAFT.indexOf('The door he used to close between us stayed open') !== -1
  ? 'present (must survive)' : 'MISSING'));
say('');

// ══ THE TASK ════════════════════════════════════════════════════════════════════════════
// Three remits and nothing else. It names the DEFECT CLASSES and requires each proposed
// correction to be tied to a specific conflicting span; it does not say where the defects are,
// which spans conflict, or how to resolve them.
const TASK = {
  objective: 'REPAIR DEMONSTRATED CONSISTENCY DEFECTS IN THE EDITABLE PASSAGE, AND NOTHING '
    + 'ELSE. There are exactly three things in your remit. (1) ACCIDENTAL DUPLICATION: text or '
    + 'an action that appears twice because it was copied, not because the prose is repeating '
    + 'for effect. (2) CLOTHING AND BODY-POSITION CONTINUITY across the encounter: a garment '
    + 'that is both on and off, a fastening that moves from one part of the body to another '
    + 'without being undone, a position that cannot follow from the one before it. (3) WHEN '
    + 'CORRECTING A CONTINUITY DEFECT, CHECK ALL RELATED MENTIONS of the affected person, '
    + 'object or state throughout the supplied scene. Return the smallest COMPLETE SET of '
    + 'coordinated corrections that leaves the sequence coherent — not merely a locally correct '
    + 'sentence. READ THE FULL CONTEXT, BUT EDIT ONLY THE AUTHORIZED REGION: if a complete '
    + 'repair would require changing protected or read-only prose, make the corrections you can '
    + 'and REPORT THE UNRESOLVED CONFLICT in your `why` — name the span you cannot reach and '
    + 'what still contradicts it — rather than claiming the defect is fixed. '
    + 'FIRST FIND THE CONFLICT, THEN FIX IT: for every edit you propose, your `why` must quote '
    + 'or name the OTHER span it conflicts with and say what the contradiction is. An edit whose '
    + '`why` does not identify a specific conflicting span is not a repair, and this pass has no '
    + 'other business. If a thing is merely not to your taste, it is not in your remit.',
  welcome: 'YOU MAY DELETE AN ACCIDENTAL DUPLICATE, and you may narrowly REWORD a contradictory '
    + 'clothing or position reference so it agrees with the established canon below and with the '
    + 'rest of the encounter. Those two are what this pass is for. Use the smallest span that '
    + 'does the job AT EVERY MENTION THE DEFECT TOUCHES — one reworded sentence where one is '
    + 'enough, and a coordinated set where the same state is referred to more than once. Do NOT '
    + 'invent an accessory, an action or an explanation to make a contradictory reference work; '
    + 'correct the reference or report it unresolved.',
  insufficient: 'NOTICING A PROBLEM WITHOUT NAMING THE SPAN IT CONFLICTS WITH. "this reads '
    + 'oddly" and "this could be clearer" are not defects. A duplication is a defect because the '
    + 'same text is in two places; a clothing reference is a defect because another span says '
    + 'something incompatible. Point at both halves of the contradiction or leave it alone.',
  exclusions: 'NO Character+ work, no new interpretation of anyone, no romance beat, no '
    + 'stylistic polishing, no euphemism or softening, no new sexual act and no escalation or '
    + 'de-escalation of what is already explicit, and NO INVENTED RESTRAINT of any kind — the '
    + 'cufflinks are jewellery fastening a shirt cuff and nothing else. Do not change the '
    + 'sequence of events, anyone\'s characterization, the viewpoint, or the level of '
    + 'explicitness. Do not rewrite prose that is doing its job: effective sentences stay '
    + 'exactly as they are, including the line about a door that used to be closed between '
    + 'them, which is grounded in the earlier part of this scene and must survive verbatim.',
  // THE ONE AUTHORIZED EXCEPTION to the block's standing "remove nothing" rule.
  authorizedRemoval: 'where text or an action is ACCIDENTALLY DUPLICATED, the redundant copy may '
    + 'be deleted, leaving one instance.'
};

// ══ ESTABLISHED CLOTHING CANON — facts, not a resolution ════════════════════════════════
const appearance = [
  { name: 'Mara', role: 'pc', facts: [
    'dark hair pinned up for the gala, one pin already working loose',
    'a borrowed green silk dress a half-size too long',
    'a thin scar across the left thumb'],
    from: 'SUPPLIED appearance record (bespoke brief fixture)' },
  { name: 'Roman Tusk', role: 'li', facts: [
    'black dinner jacket shed in the lift',
    'a white dress shirt whose cuffs are fastened at the wrists with linked metal cufflinks',
    'the cufflinks are ordinary jewellery: two linked metal fasteners holding each shirt cuff '
      + 'closed at the wrist. They fasten a GARMENT. They do not bind him, join his hands, or '
      + 'restrain him in any way, and they cannot remain fastened at his wrists once the shirt '
      + 'is off him',
    'a flat grey stare', 'goes very still before he answers'],
    from: 'SUPPLIED appearance record (bespoke brief fixture)' }];

const onStage = [
  { label: 'Mara', kind: 'pc', isPC: true, participation: 'major', presence: 'IN_PERSON' },
  { label: 'Roman Tusk', kind: 'character', isLI: true, isPC: false,
    participation: 'major', presence: 'IN_PERSON' }];
const roster = onStage.map((p) => ({ label: p.label, kind: p.kind }));

const base = { draft: DRAFT, task: TASK, onStage, skeleton: { character_plus: [] },
  liName: 'Roman Tusk', attempts: [], ledger: [], sceneOrdinal: 2, issue: 1,
  protectedPassages: PROTECTED, editableRefs: contRefs, roster, appearance,
  owner: { storyId: 'handoff-bespoke', scene: 2, ticket: 'consistency' } };

let SYS = null, USER = null, IDS = null;
await EBC.editorPassOnFinalizedDraft(Object.assign({}, base, {
  editorFn: async (c) => { SYS = Array.isArray(c.sys) ? c.sys.join('\n') : String(c.sys);
    USER = Array.isArray(c.user) ? c.user.join('\n') : String(c.user); IDS = c.ids;
    return { dispatched: false, reason: 'captured' }; } }));
const W = SYS + '\n' + USER;

say('════ IT IS A TASK PASS, NOT A C+ OR PICTURABILITY PASS ══════════════════════════');
ok(/THIS PASS HAS ONE EDITING TASK/.test(W), 'T1: the named-task block is in the request');
ok((W.match(/^\s+[A-I] · /gm) || []).length === 0, 'T2: no C+ mechanisms');
ok(!/NOT A FOUR-SLOT CHECKLIST/.test(W), 'T3: no C+ doctrine');
ok(!/START FROM SOMETHING ALREADY ON THE PAGE/.test(W), 'T4: no connecting instruction');
ok(!/JUDGE THE ENCOUNTER YOU CAN EDIT/.test(W), 'T5: no picturability grounding block');
ok(!/viewpointAndMask/.test(W) || JSON.parse(USER).viewpointAndMask === undefined,
  'T6: no Mask — this pass has no C+ remit');
ok((IDS || []).length === 1, 'T7: ONE decision, on the task: ' + JSON.stringify(IDS));

say('');
say('════ THE THREE REMITS, AND NOTHING ELSE ═════════════════════════════════════════');
ok(/ACCIDENTAL DUPLICATION/.test(W), 'R1: duplication is in the remit');
ok(/CLOTHING AND BODY-POSITION CONTINUITY/.test(W), 'R2: clothing/position continuity is in it');
ok(/CHECK ALL RELATED MENTIONS/.test(W) && /smallest COMPLETE SET of\s*coordinated corrections/.test(W.replace(/\n/g, ' ')),
  'R3: the smallest COMPLETE SET of coordinated corrections, not a locally correct sentence');
ok(/READ THE FULL CONTEXT, BUT EDIT ONLY THE AUTHORIZED REGION/.test(W)
  && /REPORT THE UNRESOLVED CONFLICT/.test(W),
  'R3b: an unreachable protected span is reported unresolved, not claimed fixed');
ok(/Do NOT\s*invent an accessory, an action or an explanation/.test(W.replace(/\n/g, ' ')),
  'R3c: no invented accessory, action or explanation to justify a contradiction');
ok(!/SMALLEST CORRECTION THAT RESOLVES EACH DEFECT/.test(W),
  'R3d: the replaced minimum-correction wording is GONE from the request');
ok(/your `why` must quote\s*or name the OTHER span it conflicts with/.test(W.replace(/\n/g, ' ')),
  'R4: each correction must be tied to a named conflicting span');
ok(/NOTICING A PROBLEM WITHOUT NAMING THE SPAN/.test(W), 'R5: taste is not a defect');
ok(/NO INVENTED RESTRAINT of any kind/.test(W), 'R6: no invented restraints');
ok(/no euphemism or softening/.test(W) && /level of\s*explicitness/.test(W.replace(/\n/g, ' ')),
  'R7: explicitness is preserved, no softening');
ok(/no\s*stylistic polishing/.test(W.replace(/\n/g, ' ')), 'R8: no stylistic polish');
ok(/which is grounded in the earlier part of this scene and must survive verbatim/.test(W),
  'R9: Grok\'s door line is explicitly protected');
ok(/WITH ONE AUTHORIZED EXCEPTION/.test(W) && /the redundant copy may be deleted/.test(W),
  'R10: the standing "remove nothing" rule names the one authorized deletion');

say('');
say('════ CANON AND SCOPE ════════════════════════════════════════════════════════════');
ok(/cuffs are fastened at the wrists with linked metal cufflinks/.test(W),
  'K1: the shirt-cuff canon is supplied');
ok(/They fasten a GARMENT/.test(W) && /cannot remain fastened at his wrists once the shirt/.test(W),
  'K2: and what a cufflink IS, so the contradiction is derivable from canon');
ok(!/handcuff/i.test(W), 'K3: the word that would plant the wrong reading is absent');
const payload = JSON.parse(USER);
ok((payload.editableRefs || []).join(',') === contRefs.join(','),
  'K4: editable scope is ' + contRefs.join(', '));
ok((payload.protectedPassages || []).length === PROTECTED.length,
  'K5: all ' + PROTECTED.length + ' lead-in paragraphs protected');
ok(W.indexOf(DUP) !== -1, 'K6: the duplicated sentence is visible in the supplied draft');
ok(W.indexOf('still cuffed at the wrists') !== -1
  && W.indexOf('the linked silver glinting against his forearms') !== -1
  && W.indexOf('the cuffs clicking faintly with every drive') !== -1,
  'K7: all three conflicting clothing spans are in the supplied draft');
ok(W.indexOf(DRAFT.trim().slice(-60)) !== -1, 'K8: the draft reaches the request to its last bytes');

say('');
say('════ THE REPLY SHAPE PERMITS THE REPAIRS ════════════════════════════════════════');
ok(/"op":"replace"/.test(W) || /op is "replace"/.test(W),
  'S1: replace is available — a deletion and a reword are not additions');
ok(/insert_after/.test(W), 'S2: insert_after is available');
// S3 CORRECTED. I first asserted that the anchored op and its copied-adjacent-source rule were
// offered here. They are not: `taskEditorContract` offers replace and insert_after only. That
// is correct for this remit — removing a duplicate and rewording a contradiction are neither
// of them additions — and widening the task contract to carry an op this pass does not need
// would be scope creep. The new check still PROTECTS this pass; it simply has nothing to say
// about a reply that makes no anchored insertion.
ok(!/insert_at_anchor/.test(W),
  'S3: the anchored op is NOT offered in task mode, and is not needed for a deletion or a reword');
ok(!/enrichment/i.test(W),
  'S4: no enrichment framing — the additive-only boundary does not apply to this mode');

fs.writeFileSync(OUT + '/consistency_sys.txt', SYS);
fs.writeFileSync(OUT + '/consistency_user.json', USER);

// ══ THE QUOTE ═══════════════════════════════════════════════════════════════════════════
const chars = SYS.length + USER.length;
const CAP = 32000;
const ceiling = ((chars / 4) * 0.10 + CAP * 0.50) / 1e6;
const fp = crypto.createHash('sha256').update(SYS + '\u0000' + USER).digest('hex').slice(0, 16);
const quote = {
  call: 'one Luna consistency pass',
  route: '/api/sol-scene-test (existing isolated Luna test route)',
  model: 'gpt-6-luna', capField: 'max_completion_tokens', cap: CAP, effort: 'medium',
  rates: { in: 0.10, out: 0.50, per: '1M tokens' },
  billing: 'reasoning billed INSIDE completion (total − prompt = completion)',
  inputChars: chars, inputTokensApprox: Math.ceil(chars / 4),
  admissionCeiling: ceiling,
  perCallCap: 0.30, capLimit: 64000,
  requires: ['_sbCallLabel (single-use)', '_sbRunBudgetUsd'],
  messagesSha256: fp,
  harnessCeiling: 1.10, harnessSpentBefore: 1.030955
};
quote.harnessWorstCase = quote.harnessSpentBefore + ceiling;
fs.writeFileSync(OUT + '/QUOTE.json', JSON.stringify(quote, null, 2));

say('');
say('════ THE QUOTE — ONE CALL ═══════════════════════════════════════════════════════');
say('  route            : ' + quote.route);
say('  model / settings : gpt-6-luna, max_completion_tokens ' + CAP + ', effort medium');
say('  measured input   : sys ' + SYS.length.toLocaleString() + ' + user '
  + USER.length.toLocaleString() + ' = ' + chars.toLocaleString() + ' chars ≈ '
  + Math.ceil(chars / 4).toLocaleString() + ' tok');
say('  fingerprint      : ' + fp);
say('  admission ceiling: $' + ceiling.toFixed(6) + '  (route per-call cap $0.30)');
say('  harness          : $' + quote.harnessSpentBefore.toFixed(6) + ' → worst case $'
  + quote.harnessWorstCase.toFixed(6) + ' of $1.10');
say('');
say('════ ' + pass + ' ok, ' + fails.length + ' FAIL ═══════════════════════════════════');
fs.writeFileSync(OUT + '/REPORT.txt', log.join('\n') + '\n');
say('artefacts: ' + OUT);
process.exit(fails.length ? 1 : 0);
