// BUILD THE CREATIVE-QUALITY STUDY PACKET. Provider-free, $0. NO generation, NO paid calls.
//
// Produces a self-contained packet a FRESH SESSION can score blind, with no generation context:
//   00_PREREGISTRATION.md   hypothesis + rubric + procedure, written BEFORE any prose exists
//   01_BRANCH_INPUTS.json   the three divergent branch inputs, derived from the seed's own decision
//   02_OBLIGATION_LEDGER.json  the REAL obligations and scene metadata, read from STARTER_PLANS
//   03_SLOTS/slot_NN.md     24 empty, path-anonymised slots in SHUFFLED order
//   04_SCORESHEET.csv       one row per slot, rubric columns, empty
//   KEY_SEALED.json         slot → (path, scene). SEPARATE. Not to be opened until scoring is done.
//   README.md               how to use it without seeing the key
//
// The obligations are READ FROM THE APP, not transcribed by me: a scoring rubric built on
// remembered obligations would measure my memory, not the story.
import fs from 'fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright-core';

const OUT = '_quality_study_packet';
const SCENES = 8;           // 1..8 — the stall is reported around 4-6, so the window must clear it
const PATHS = ['A', 'B', 'C'];   // anonymised in the packet; the key maps them to comply/defy/withdraw

console.log('=== BUILD QUALITY STUDY PACKET (provider-free, $0) ===\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => !!window.STARTER_PLANS, { timeout: 20000 });

// ── THE REAL PLAN DATA ──────────────────────────────────────────────────────
const plan = await page.evaluate((SCENES) => {
  const P = window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice;
  if (!P) return null;
  const rows = (P.scenes || []).filter(r => r && typeof r.n === 'number' && r.n <= SCENES);
  return {
    issue: P.issue,
    sealedEvents: (P.sealedEvents || []).map(e => ({ id: e.id, label: e.label, unsealsAtScene: e.unsealsAtScene })),
    sceneCount: (P.scenes || []).length,
    // THE REAL FIELD NAMES, inspected rather than guessed. My first version read `hardBeats` and
    // `obligations`, which DO NOT EXIST on these rows — the ledger came out with 0 obligations and
    // a rubric scoring three obligation dimensions against nothing. The build's own count is what
    // caught it.
    scenes: rows.map(r => ({
      n: r.n,
      goal: String(r.goal || ''),
      participants: r.participants || [],
      presentGroups: r.presentGroups || null,
      collectives: r.collectives || null,
      requiredTruth: r.requiredTruth || null,
      aftermathTruths: r.aftermathTruths || null,
      constraints: r.constraints || null,
      reservedEvents: r.reservedEvents || null,
      exitState: r.exitState || null,
      sceneFunction: r.sceneFunction || null,
      player_decision_required: r.player_decision_required || null,
      decision_axis: r.decision_axis || null,
      decision_consequence: r.decision_consequence || null,
      vectors: r.vectors || null
    }))
  };
}, SCENES);
await browser.close();

if (!plan) { console.error('REFUSED: STARTER_PLANS.starter_first_sacrifice not reachable.'); process.exit(2); }
console.log('  plan read from the app: issue ' + plan.issue + ', ' + plan.sceneCount
  + ' authored scenes, ' + plan.scenes.length + ' in the study window');
console.log('  sealed future reveals: ' + JSON.stringify(plan.sealedEvents.map(e => e.id)));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + '/03_SLOTS', { recursive: true });

// ── 01. THE BRANCH INPUTS, derived from the seed's OWN authored decision ────
// Scene 1's goal ends: "END ON THE DECISION: tear the gossamer band away and go to Seren, or hold
// the line she was told to hold." Two of the three branches ARE that binary. The third is
// deliberately OFF-SPINE: a choice the seed does not offer, which is the only way to test whether
// the planner handles divergence it was not authored for.
const s1goal = (plan.scenes.find(s => s.n === 1) || {}).goal || '';
const decisionLine = (s1goal.match(/END ON THE DECISION:[^]*?$/) || [''])[0].slice(0, 400);
const BRANCHES = {
  comply: {
    label: 'comply — hold the line she was told to hold',
    source: 'the seed\'s own Scene 1 decision, second option',
    action: 'I hold the line. I keep the gossamer band on and I do not move from the witness row.',
    dialogue: 'Nothing. I am a witness. I hold.'
  },
  defy: {
    label: 'defy — tear the band away and go to Seren',
    source: 'the seed\'s own Scene 1 decision, first option',
    action: 'I tear the gossamer band off my wrist and go to Seren before the wish finishes turning.',
    dialogue: 'Seren, stop — take it back, take the words back now.'
  },
  withdraw: {
    label: 'withdraw — leave the assembly entirely',
    source: 'DELIBERATELY OFF-SPINE: the seed offers only hold-or-intervene. This branch tests '
      + 'divergence the plan does not anticipate, which is where circling is most likely.',
    action: 'I say nothing, step back out of the witness row, and walk out of the assembly.',
    dialogue: 'Nothing. I leave before anyone can ask me to answer for her.'
  }
};
fs.writeFileSync(OUT + '/01_BRANCH_INPUTS.json', JSON.stringify({
  sharedOpening: {
    story: 'starter_first_sacrifice',
    scene: 1,
    note: 'Scene 1 is a FIXED seed package and is NEVER planner-routed, so all three paths share a '
      + 'byte-identical opening. Divergence begins at the Scene 1 → 2 decision, which means any '
      + 'difference downstream is attributable to the CHOICE and not to a different story.',
    authoredDecision: decisionLine
  },
  branches: BRANCHES
}, null, 2));
console.log('  01_BRANCH_INPUTS.json — 3 branches, 2 from the seed\'s decision, 1 deliberately off-spine');

// ── 02. THE OBLIGATION LEDGER, read from the plan ───────────────────────────
const ledger = {
  provenance: 'READ FROM window.STARTER_PLANS.starter_first_sacrifice at packet build time — not '
    + 'transcribed from memory. A rubric built on remembered obligations would measure the memory.',
  sealedFutureReveals: plan.sealedEvents,
  sealedRule: 'These are RESERVED. A scene that delivers, names or pre-empts one before its '
    + 'unsealsAtScene is a VIOLATION, and the scorer should record it as such — it is not a payoff.',
  fieldGuide: {
    aftermathTruths: 'ALREADY TRUE and NOT to be re-staged. A scene that re-stages one is not a '
      + 'payoff — record it as a VIOLATION. Each has a stable id, which is what the scoresheet\'s '
      + 'obligation columns should reference.',
    requiredTruth: 'must be true by the end of the scene',
    constraints: 'prohibitions, e.g. "NO new named character". A breach is an obligation FAILURE.',
    reservedEvents: 'must NOT be delivered before their due scene',
    exitState: 'the authored exit state — the baseline for judging forward movement',
    decision_axis: 'the authored choice; decision_consequence is what each side costs',
    vectors: 'AUTHORED CANDIDATE CONTINUATIONS, not obligations. Useful for branch-specificity: a '
      + 'scene that could only follow one vector is branch-specific.'
  },
  scenes: plan.scenes.map(s => ({
    n: s.n,
    participants: s.participants,
    presentGroups: s.presentGroups,
    collectives: s.collectives,
    sceneFunction: s.sceneFunction,
    requiredTruth: s.requiredTruth,
    aftermathTruths: s.aftermathTruths,
    constraints: s.constraints,
    reservedEvents: s.reservedEvents,
    exitState: s.exitState,
    player_decision_required: s.player_decision_required,
    decision_axis: s.decision_axis,
    decision_consequence: s.decision_consequence,
    vectors: s.vectors,
    goalExcerpt: s.goal.slice(0, 400)
  }))
};
fs.writeFileSync(OUT + '/02_OBLIGATION_LEDGER.json', JSON.stringify(ledger, null, 2));
const cnt = (x) => Array.isArray(x) ? x.length : (x ? 1 : 0);
const obligationCount = plan.scenes.reduce((n, s) =>
  n + cnt(s.aftermathTruths) + cnt(s.requiredTruth) + cnt(s.constraints) + cnt(s.reservedEvents), 0);
// REFUSE TO SHIP AN UNSCORABLE PACKET. Three of the eight rubric dimensions score obligations; a
// ledger with none would make them unanswerable, which is exactly what my guessed field names
// produced on the first build.
if (obligationCount === 0) {
  console.error('REFUSED: the obligation ledger is EMPTY — three rubric dimensions would be '
    + 'unscorable. Check the plan-row field names before shipping this packet.');
  process.exit(3);
}
console.log('  02_OBLIGATION_LEDGER.json — ' + plan.scenes.length + ' scene rows, '
  + plan.sealedEvents.length + ' sealed reveals, ' + obligationCount + ' declared beats/obligations');

// ── 00. THE PRE-REGISTRATION, written before any prose exists ───────────────
fs.writeFileSync(OUT + '/00_PREREGISTRATION.md', `# Creative-quality study — PRE-REGISTRATION

Written **before any prose is generated**. Nothing in this file may be revised after generation;
a revision after the fact is not a pre-registration.

## The hypothesis, stated first

**H1 (primary):** circling appears by **scene 6** on **at least one** of the three paths.

"Circling" = a scene whose exit state a reader cannot distinguish from the previous scene's in any
way they could name. The reported stall is intrinsic around scenes 4-6, so the window runs to 8.

**H2:** the **off-spine** path (the one the seed does not anticipate) circles **earlier** than the
two paths taken from the seed's own decision.

**H3:** obligations are silently dropped more often than they are paid off.

A result contradicting any of these is the finding. They are recorded so that cannot be
re-narrated afterwards.

## The rubric — per slot, scored blind

| # | dimension | how to score |
|---|---|---|
| 1 | \`forward\` | \`yes\` / \`no\` — can you name, in one clause, something true at the end of this scene that was not true at the end of the previous one? If \`no\`, fill \`repeated\` with the element that recurs. |
| 2 | \`obligations_carried\` | list obligation ids from 02 that this scene keeps alive |
| 3 | \`obligations_paid\` | list obligation ids this scene concludes |
| 4 | \`obligations_dropped\` | list obligation ids that were live and are now silently absent |
| 5 | \`sealed_violation\` | \`yes\` / \`no\` — did it deliver, name or pre-empt a sealed reveal before its scene? |
| 6 | \`new_pressure\` | \`0\` none · \`1\` present but generic · \`2\` coherent AND interesting. Quote it. |
| 7 | \`branch_specific\` | \`yes\` / \`no\` — could this scene have occurred on a different path? \`no\` = branch-specific. |
| 8 | \`notes\` | one line, free text |

**Scene 1 is identical on all paths** and appears once per path by design; score it anyway, as the
baseline the \`forward\` judgement is made against.

## Procedure, in this order

1. Read \`00\`, \`01\`, \`02\`. Do **not** open \`KEY_SEALED.json\`.
2. Read every slot in \`03_SLOTS/\` **in file order**. The order is shuffled, so consecutive files
   are not consecutive scenes and are usually not the same path.
3. For dimension 1 you need the previous scene *of the same path*, which you cannot identify while
   blind. Therefore score dimension 1 on a **second pass**, after the key is opened, and record the
   first-pass impressions in \`notes\`. **Every other dimension is scored fully blind.**
4. Fill \`04_SCORESHEET.csv\`. Save it.
5. **Only then** open \`KEY_SEALED.json\`, map slots to (path, scene), and do the \`forward\` pass.
6. State the verdict against H1/H2/H3 before interpreting anything else.

## What this study cannot establish

It measures the prose this corpus produced. It is not a measure of the engine's ceiling, it does
not generalise to other Books, and \`n = 1 run per path\`: a path that circles may have circled on
that draw. A clean sweep is informative; a split result is a reason to run more, not to split the
difference.

## Honest limitation on who scores

The session that GENERATES this corpus should not be the session that scores it. Mechanical
blinding — shuffling and stripping labels — cannot make a generator unknow its own output. A fresh
session, or Roman reading directly, is materially stronger evidence.
`);
console.log('  00_PREREGISTRATION.md — H1/H2/H3 + 8-dimension rubric + procedure');

// ── 03. THE SLOTS, shuffled and anonymised ──────────────────────────────────
// A cryptographic shuffle, so the order carries no information about path or scene. The mapping
// exists ONLY in KEY_SEALED.json.
const assignments = [];
PATHS.forEach(p => { for (let n = 1; n <= SCENES; n++) assignments.push({ path: p, scene: n }); });
for (let i = assignments.length - 1; i > 0; i--) {
  const j = crypto.randomInt(0, i + 1);
  const tmp = assignments[i]; assignments[i] = assignments[j]; assignments[j] = tmp;
}
const key = [];
assignments.forEach((a, idx) => {
  const slot = String(idx + 1).padStart(2, '0');
  key.push({ slot: 'slot_' + slot, path: a.path, scene: a.scene });
  fs.writeFileSync(OUT + '/03_SLOTS/slot_' + slot + '.md',
    `# slot_${slot}\n\n`
    + `<!-- PATH AND SCENE DELIBERATELY ABSENT. The mapping is in KEY_SEALED.json, which must not\n`
    + `     be opened until 04_SCORESHEET.csv is filled and saved. -->\n\n`
    + `## scene prose\n\n_(empty — no generation has occurred; this packet is pre-authorisation)_\n\n`
    + `## player input that produced it\n\n_(empty)_\n\n`
    + `## scene exit state as rendered\n\n_(empty)_\n`);
});
console.log('  03_SLOTS/ — ' + assignments.length + ' empty anonymised slots, cryptographically shuffled');

// ── 04. THE SCORESHEET ──────────────────────────────────────────────────────
const cols = ['slot', 'forward', 'repeated', 'obligations_carried', 'obligations_paid',
  'obligations_dropped', 'sealed_violation', 'new_pressure', 'new_pressure_quote',
  'branch_specific', 'notes'];
fs.writeFileSync(OUT + '/04_SCORESHEET.csv',
  cols.join(',') + '\n' + key.map(k => k.slot + ','.repeat(cols.length - 1)).join('\n') + '\n');
console.log('  04_SCORESHEET.csv — ' + key.length + ' rows, ' + cols.length + ' columns, empty');

// ── THE KEY, separate ───────────────────────────────────────────────────────
fs.writeFileSync(OUT + '/KEY_SEALED.json', JSON.stringify({
  WARNING: 'DO NOT OPEN until 04_SCORESHEET.csv is filled and saved. Opening this first destroys '
    + 'the blind and the study with it.',
  pathLabels: { A: BRANCHES.comply.label, B: BRANCHES.defy.label, C: BRANCHES.withdraw.label },
  mapping: key
}, null, 2));
console.log('  KEY_SEALED.json — slot → (path, scene), separate file');

fs.writeFileSync(OUT + '/README.md', `# Creative-quality study packet

**State: PRE-AUTHORISATION. No generation has occurred. Every slot is empty.**

Order of use:
1. \`00_PREREGISTRATION.md\` — the hypothesis and rubric. Read first.
2. \`01_BRANCH_INPUTS.json\` — the shared opening and the three branch inputs.
3. \`02_OBLIGATION_LEDGER.json\` — the obligations and scene metadata needed to score, read from
   the app at build time.
4. \`03_SLOTS/\` — 24 anonymised slots, shuffled. Scene prose is filled in only after an
   authorised generation run.
5. \`04_SCORESHEET.csv\` — fill this. Save it.
6. \`KEY_SEALED.json\` — **open last.**

The session that generates the corpus should not be the session that scores it.
`);

// ── INTEGRITY CHECKS on the packet itself ───────────────────────────────────
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
console.log('\nPACKET INTEGRITY');
t('every slot file exists', key.every(k => fs.existsSync(OUT + '/03_SLOTS/' + k.slot + '.md')));
t('no slot file names its path or scene',
  key.every(k => { const b = fs.readFileSync(OUT + '/03_SLOTS/' + k.slot + '.md', 'utf8');
    return !/comply|defy|withdraw/i.test(b) && !new RegExp('scene\\\\s*' + k.scene + '\\\\b', 'i').test(b); }));
t('the key is a SEPARATE file', fs.existsSync(OUT + '/KEY_SEALED.json'));
t('  and no other packet file contains the mapping',
  ['00_PREREGISTRATION.md', '01_BRANCH_INPUTS.json', '02_OBLIGATION_LEDGER.json',
   '04_SCORESHEET.csv', 'README.md'].every(f =>
    !/"slot_\d+"\s*,\s*"path"/.test(fs.readFileSync(OUT + '/' + f, 'utf8'))
    && !/slot_\d+.*(comply|defy|withdraw)/i.test(fs.readFileSync(OUT + '/' + f, 'utf8'))));
t('the shuffle is not the identity order',
  key.some((k, i) => !(k.path === PATHS[Math.floor(i / SCENES)] && k.scene === (i % SCENES) + 1)));
t('all three paths appear 8 times each',
  PATHS.every(p => key.filter(k => k.path === p).length === SCENES));
t('the obligation ledger came from the app, with real sealed ids',
  plan.sealedEvents.length > 0 && plan.sealedEvents.every(e => e.id && e.unsealsAtScene));
t('the pre-registration states H1 before any prose exists',
  /H1 \(primary\):/.test(fs.readFileSync(OUT + '/00_PREREGISTRATION.md', 'utf8'))
  && key.every(k => /no generation has occurred/i.test(fs.readFileSync(OUT + '/03_SLOTS/' + k.slot + '.md', 'utf8'))));
t('every slot is EMPTY — nothing was generated', key.every(k =>
  /_\(empty — no generation has occurred; this packet is pre-authorisation\)_/
    .test(fs.readFileSync(OUT + '/03_SLOTS/' + k.slot + '.md', 'utf8'))));

console.log('\n' + pass + '/' + (pass + fail) + ' integrity checks passed');
process.exit(fail ? 1 : 0);
