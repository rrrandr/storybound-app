// BUILD THE CREATIVE-QUALITY STUDY PACKET. Provider-free, $0. NO generation, NO paid calls.
//
// Produces a self-contained packet a FRESH SESSION can score blind, with no generation context:
//   00_PREREGISTRATION.md   hypothesis + rubric + procedure, written BEFORE any prose exists
//   01_BRANCH_INPUTS.json   the three divergent branch inputs, derived from the seed's own decision
//   02_OBLIGATION_LEDGER.json  the REAL obligations and scene metadata, read from STARTER_PLANS
//   03_SLOTS/slot_NN.md     18 empty, path-anonymised slots in SHUFFLED order
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
// 6 PER PATH = 18 SCENES (Roman, 2026-10-02). My first build used 8, which I did not ground in
// anything: it was "4-6 plus margin" and I never checked it against the product. A CG issue is TEN
// scenes (app.js:86411 — cg: { scenesPerIssue: 10 }), and First Sacrifice is the CG Book, so the
// 20-row STARTER_PLANS spine I had read is longer than one CG issue. 6 covers the reported 4-6
// stall window inside a real issue length.
const SCENES = 6;
const PATHS = ['A', 'B', 'C'];   // anonymised in the packet; the key maps them to comply/defy/withdraw

console.log('=== BUILD QUALITY STUDY PACKET (provider-free, $0) ===\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => !!window.STARTER_PLANS, { timeout: 20000 });

// ── THE AXIS THE PRODUCT ACTUALLY PRESENTS ──────────────────────────────────
// The first build derived the three branch inputs from the Scene 1 plan row's own text: "END ON THE
// DECISION: tear the gossamer band away and go to Seren, or hold the line she was told to hold."
// That is NOT the choice the reader is given. The FS scene 1 → 2 preflight drove the real gate and
// the product mounted a different axis entirely, out of the baked package:
//
//     "run in shame vs remain and see where Julian was taking it"
//
// A study whose branches do not match the decision the reader makes is measuring a decision the
// product never offered. So the axis is now READ FROM THE APP through _sceneDecisionAxis(), the same
// function the decision prompt itself reads, after launching the Book with every /api/ call aborted.
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && typeof window._sceneDecisionAxis === 'function', { timeout: 20000 });
const axis = await page.evaluate(async () => {
  const list = window.STARTER_STORIES || {};
  const keys = Array.isArray(list) ? list.map((_, i) => i) : Object.keys(list);
  let def = null;
  for (const k of keys) { const d = list[k]; if (d && d.id === 'starter_first_sacrifice') def = d; }
  if (!def) return { error: 'no starter_first_sacrifice in STARTER_STORIES' };
  try { await window._launchStarterStory(def); } catch (e) { return { error: 'launch threw: ' + e.message }; }
  await new Promise(r => setTimeout(r, 5000));
  let ax = window._sceneDecisionAxis();
  if (!ax) {
    // The axis lives on state._bakedEmitted, which the mount hydrates. If it is not there yet, run
    // the production unlock (provider-free) and read again rather than guessing at the text.
    try { await window._unlockBakedGenesis('packet-build'); } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));
    ax = window._sceneDecisionAxis();
  }
  if (!ax) return { error: '_sceneDecisionAxis() returned null after launch and unlock' };
  return { axis: ax.axis, a: { key: ax.a.key, label: ax.a.label, text: ax.a.text },
    b: { key: ax.b.key, label: ax.b.label, text: ax.b.text } };
});
if (!axis || axis.error) {
  console.error('REFUSED: could not read the product\'s own decision axis — ' + (axis && axis.error));
  console.error('  The branch inputs must come from _sceneDecisionAxis(), never from the plan row.');
  await browser.close();
  process.exit(5);
}
console.log('  THE REAL AXIS, read from _sceneDecisionAxis(): "' + axis.axis + '"');
console.log('    A = ' + axis.a.key + '  (' + axis.a.label + ')');
console.log('    B = ' + axis.b.key + '  (' + axis.b.label + ')');

// ── THE REAL PLAN DATA ──────────────────────────────────────────────────────
const plan = await page.evaluate((SCENES) => {
  const P = window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice;
  if (!P) return null;
  const rows = (P.scenes || []).filter(r => r && typeof r.n === 'number' && r.n <= SCENES);
  // THE PRODUCT'S OWN ISSUE LENGTH, read rather than remembered. The study window has to be
  // justified against this number; my first build asserted 8 from nothing.
  // READ THE CG ROW BY NAME. `_getActiveIssuePricing()` returns the ACTIVE mode's row, and a fresh
  // session is literary — it answered 20, which is the literary issue length, not the CG one. First
  // Sacrifice is the CG Book, so the CG row is the only correct bound. Naming the row is the fix.
  var pricing = null, pricingSource = null;
  try {
    if (typeof ISSUE_PRICING !== 'undefined' && ISSUE_PRICING && ISSUE_PRICING.cg) {
      pricing = ISSUE_PRICING.cg; pricingSource = 'ISSUE_PRICING.cg';
    }
  } catch (_) {}
  return {
    issue: P.issue,
    issueScenes: (pricing && pricing.scenesPerIssue) || null,
    issueScenesSource: pricingSource,
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
// THE WINDOW MUST FIT A REAL ISSUE. First Sacrifice is the CG Book; a CG issue is scenesPerIssue
// scenes. A window longer than one issue is not a study of an issue.
if (plan.issueScenes) {
  console.log('  CG issue length read from ' + plan.issueScenesSource + ': ' + plan.issueScenes
    + ' scenes — study window ' + SCENES + ' per path');
  if (SCENES > plan.issueScenes) {
    console.error('REFUSED: the ' + SCENES + '-scene window exceeds one CG issue ('
      + plan.issueScenes + ' scenes). Ground the window in the product, not in a guess.');
    process.exit(4);
  }
} else {
  console.log('  CG issue length: UNREADABLE from the page — window not cross-checked '
    + '(recorded as unverified, not assumed)');
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + '/03_SLOTS', { recursive: true });

// ── 01. THE BRANCH INPUTS, derived from the seed's OWN authored decision ────
// Scene 1's goal ends: "END ON THE DECISION: tear the gossamer band away and go to Seren, or hold
// the line she was told to hold." Two of the three branches ARE that binary. The third is
// deliberately OFF-SPINE: a choice the seed does not offer, which is the only way to test whether
// the planner handles divergence it was not authored for.
const s1goal = (plan.scenes.find(s => s.n === 1) || {}).goal || '';
const planDecisionLine = (s1goal.match(/END ON THE DECISION:[^]*?$/) || [''])[0].slice(0, 400);

// THE AXIS IS BINARY, AND THAT CONSTRAINS THE STUDY. _mountSceneDecisionPrompt renders exactly two
// buttons, A and B, from the baked package. There is no third button, so a third AXIS choice is not
// reachable through the product's own gate — my earlier "deliberately off-spine" branch was not a
// path a reader could take.
//
// A third arm is still worth having, but it has to diverge where divergence is actually possible:
// the reader's own say/do words at the gate that follows. So arm C records the SAME axis choice as
// arm B and differs only in what the player says and does. That is a weaker contrast than two
// different axis choices, and H2 is restated below to say exactly what it now compares.
const BRANCHES = {
  A_run: {
    label: axis.a.key + ' — ' + axis.a.label,
    axisChoice: axis.a.key,
    source: 'THE PRODUCT\'S OWN AXIS, button A, read from _sceneDecisionAxis()',
    authoredConsequence: axis.a.text || null,
    action: 'I turn away from the clearing and walk, and I do not look at any of them.',
    dialogue: 'Nothing. I have nothing to say to any of you.'
  },
  B_remain: {
    label: axis.b.key + ' — ' + axis.b.label,
    axisChoice: axis.b.key,
    source: 'THE PRODUCT\'S OWN AXIS, button B, read from _sceneDecisionAxis()',
    authoredConsequence: axis.b.text || null,
    action: 'I stay where I am and keep my eyes on Julian, waiting to see what he does next.',
    dialogue: 'I am still here. Say the rest of it.'
  },
  C_remain_offscript: {
    label: axis.b.key + ' — ' + axis.b.label + ', with words the axis does not anticipate',
    axisChoice: axis.b.key,
    source: 'SAME AXIS CHOICE AS ARM B. The axis offers only two buttons, so a third axis choice '
      + 'does not exist in the product. This arm diverges at the SAY/DO gate instead: the reader '
      + 'remains, and then names publicly what the scene left unsaid — a move the authored '
      + 'consequence for "remain" does not anticipate. It tests branch specificity under an '
      + 'identical recorded decision, which is a DIFFERENT question from H2\'s original one.',
    action: 'I stay, and I say out loud what everyone in this clearing is pretending not to know.',
    dialogue: 'Say whose wish it really was. Say it where they can all hear you.'
  }
};
fs.writeFileSync(OUT + '/01_BRANCH_INPUTS.json', JSON.stringify({
  sharedOpening: {
    story: 'starter_first_sacrifice',
    scene: 1,
    note: 'Scene 1 is a FIXED baked package and is NEVER planner-routed. The FS preflight measured '
      + 'it: 20/20 beats verbatim from public/starter-scenes.js, byte-identical across three '
      + 'independent launches, and zero provider calls to display it. So all arms share an '
      + 'identical opening and any downstream difference is attributable to what the reader did.',
    howTheChoiceIsMade: 'The product mounts a two-button prompt (_mountSceneDecisionPrompt) built '
      + 'from the baked package\'s own axis. _advanceStagedScene REFUSES to request a continuation '
      + 'until the choice is recorded, and dispatches nothing while it is unrecorded — measured in '
      + 'the FS preflight. The corpus runner must therefore record the decision through the '
      + 'prompt\'s own handler, not by submitting say/do alone.',
    theRealAxis: {
      axis: axis.axis,
      a: axis.a, b: axis.b,
      provenance: '_sceneDecisionAxis(), read from the running app at packet build time',
      binary: 'EXACTLY TWO CHOICES EXIST. There is no third button, so no third axis choice is '
        + 'reachable. Arm C therefore shares arm B\'s axis choice and diverges in say/do only.'
    },
    planRowWordingIsNotTheChoice: {
      planRowSays: planDecisionLine,
      correction: 'This is the Scene 1 plan row\'s own prose, and the FIRST version of this packet '
        + 'derived all three branches from it. It is NOT what the reader is asked. The product '
        + 'presents the axis above. Recorded here so the error is visible rather than overwritten.'
    }
  },
  branches: BRANCHES
}, null, 2));
console.log('  01_BRANCH_INPUTS.json — 3 arms built FROM THE AXIS: '
  + Object.values(BRANCHES).map(b => b.axisChoice).join('/') + ' (A/B are the two buttons; C shares B)');

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

**H1 (primary):** circling appears by **scene ${SCENES}** on **at least one** of the three paths.

"Circling" = a scene whose exit state a reader cannot distinguish from the previous scene's in any
way they could name.

**The window: ${SCENES} scenes per path, ${SCENES * PATHS.length} scenes total.** The reported stall is
intrinsic around scenes 4-6, so the window has to reach 6. The upper bound is the product: a CG issue is
**${plan.issueScenes || 'UNKNOWN (unreadable at build time)'} scenes** (read from
\`${plan.issueScenesSource || 'nothing — unreadable'}\` at build time, not remembered), and First
Sacrifice is the CG Book, so ${SCENES} sits inside one issue. The CG row is read **by name**: the
active-pricing accessor answers for whatever mode the session is in, and a fresh session is literary,
so it returns 20 — the literary length, not this Book's.
An earlier draft of this file said 8 per path and 24 total. That number was not derived from anything —
it was "4-6 plus margin" and was never checked against the issue length. It is removed, not amended.

**H2 (restated — the original was built on a decision the product does not offer):** the arm whose
**player words** go past what the axis anticipates (arm C) circles **earlier** than the arm that
takes the same axis choice and stays within it (arm B).

The original H2 compared an "off-spine path the seed does not anticipate" against two on-spine
paths. That comparison is not available. The product's scene-1 decision is a **two-button prompt**
built from the baked package's own axis:

> **${axis.axis}**
> · A = \`${axis.a.key}\` — ${axis.a.label}
> · B = \`${axis.b.key}\` — ${axis.b.label}

There is no third button, so no third axis choice exists and no reader can take one. The first
version of this packet derived its three branches from the Scene 1 plan row's prose instead
(${JSON.stringify(planDecisionLine.slice(0, 90))}…), which is authoring notes, not the player's
choice. Arm C now shares arm B's axis choice and diverges only in say/do. That is a weaker contrast
than two distinct axis choices, and H2 says so rather than implying otherwise.

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

## Results already in hand, and what they do NOT mean

Four provider-free boundary runs preceded this study. They are recorded here so their results are
never read as quality findings:

- **The four-scene run proves BOUNDARY RELIABILITY ONLY.** It shows four consecutive scenes can be
  advanced through the real production entry point without the harness failing. It says nothing
  about the prose.
- **The repeated prose in that run is a FIXTURE ARTIFACT.** Every scene replayed one recorded
  author response, so every scene rendered identical prose. That is not circling and must not be
  counted as evidence for H1.
- **The repeated "Toll Road Commission" introductions are an IDENTITY-GUARD CHECK, not a creative
  failure.** Replaying one planner reply introduced the same institution every scene, and the guard
  correctly refused it as a redefinition of an already-activated entity. That is the safety rule
  working; it is not the planner being repetitive.
- **The activation counts from that run are INCONCLUSIVE.** Activations stayed at 1 while facts grew,
  and per-scene verdicts were not captured, so the cause is not established. The most consistent
  explanation is the same fixture artifact — one prose body cannot anchor four different
  institutions — but it is unproven and must not be cited either way.

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
  pathLabels: { A: BRANCHES.A_run.label, B: BRANCHES.B_remain.label, C: BRANCHES.C_remain_offscript.label },
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
4. \`03_SLOTS/\` — 18 anonymised slots, shuffled. Scene prose is filled in only after an
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
    return !/\brun in shame\b|\bremain and see\b|off-?script/i.test(b) && !new RegExp('scene\\\\s*' + k.scene + '\\\\b', 'i').test(b); }));
t('the key is a SEPARATE file', fs.existsSync(OUT + '/KEY_SEALED.json'));
t('  and no other packet file contains the mapping',
  ['00_PREREGISTRATION.md', '01_BRANCH_INPUTS.json', '02_OBLIGATION_LEDGER.json',
   '04_SCORESHEET.csv', 'README.md'].every(f =>
    !/"slot_\d+"\s*,\s*"path"/.test(fs.readFileSync(OUT + '/' + f, 'utf8'))
    && !/slot_\d+.*(run in shame|remain and see)/i.test(fs.readFileSync(OUT + '/' + f, 'utf8'))));
t('the shuffle is not the identity order',
  key.some((k, i) => !(k.path === PATHS[Math.floor(i / SCENES)] && k.scene === (i % SCENES) + 1)));
t('all three paths appear ' + SCENES + ' times each — ' + (SCENES * PATHS.length) + ' slots total',
  PATHS.every(p => key.filter(k => k.path === p).length === SCENES));
// THE BRANCHES COME FROM THE PRODUCT, NOT FROM THE PLAN PROSE. This is the check that would have
// caught the first build: every arm's axisChoice must be one of the two keys the app itself reports.
t('every arm records an axis choice the APP reports',
  Object.values(BRANCHES).every(b => b.axisChoice === axis.a.key || b.axisChoice === axis.b.key),
  JSON.stringify(Object.values(BRANCHES).map(b => b.axisChoice)) + ' vs app '
  + JSON.stringify([axis.a.key, axis.b.key]));
t('both of the app\'s buttons are exercised',
  [axis.a.key, axis.b.key].every(k => Object.values(BRANCHES).some(b => b.axisChoice === k)));
t('the binary constraint is stated, not glossed',
  /EXACTLY TWO CHOICES EXIST/.test(fs.readFileSync(OUT + '/01_BRANCH_INPUTS.json', 'utf8')));
t('the superseded plan-row wording is recorded as superseded',
  /NOT what the reader is asked/.test(fs.readFileSync(OUT + '/01_BRANCH_INPUTS.json', 'utf8')));
t('no arm\'s input text was lifted from the plan row\'s decision line',
  Object.values(BRANCHES).every(b =>
    !planDecisionLine.toLowerCase().includes(String(b.action).toLowerCase().slice(0, 25))),
  'an arm reuses the plan-row prose');
t('H2 is restated against the arms that actually exist',
  /H2 \(restated/.test(fs.readFileSync(OUT + '/00_PREREGISTRATION.md', 'utf8')));
t('the preregistration carries the real axis text verbatim',
  fs.readFileSync(OUT + '/00_PREREGISTRATION.md', 'utf8').includes(axis.axis));
t('the obligation ledger came from the app, with real sealed ids',
  plan.sealedEvents.length > 0 && plan.sealedEvents.every(e => e.id && e.unsealsAtScene));
t('the pre-registration states H1 before any prose exists',
  /H1 \(primary\):/.test(fs.readFileSync(OUT + '/00_PREREGISTRATION.md', 'utf8'))
  && key.every(k => /no generation has occurred/i.test(fs.readFileSync(OUT + '/03_SLOTS/' + k.slot + '.md', 'utf8'))));
// THE WINDOW IS GROUNDED, NOT ASSERTED. These three bite on the exact error Roman caught: a corpus
// size I made up and never checked against the product.
t('the corpus is exactly ' + SCENES + ' × ' + PATHS.length + ' = ' + (SCENES * PATHS.length) + ' slots',
  key.length === SCENES * PATHS.length
  && fs.readdirSync(OUT + '/03_SLOTS').filter(f => /^slot_\d+\.md$/.test(f)).length === SCENES * PATHS.length,
  'slot files: ' + fs.readdirSync(OUT + '/03_SLOTS').length);
t('the window fits one CG issue, read from the CG row BY NAME',
  plan.issueScenesSource === 'ISSUE_PRICING.cg' && plan.issueScenes !== null
  && SCENES <= plan.issueScenes,
  'source=' + plan.issueScenesSource + ' issueScenes=' + plan.issueScenes);
t('no packet file still claims the fabricated 8-per-path / 24-total corpus',
  ['00_PREREGISTRATION.md', 'README.md', '01_BRANCH_INPUTS.json'].every(f => {
    const b = fs.readFileSync(OUT + '/' + f, 'utf8');
    // The preregistration names the retracted number once, as a retraction. Any OTHER occurrence,
    // and any live claim of 24 slots, is a stale fabrication.
    const live = b.replace(/An earlier draft of this file said[^]*?not amended\./, '');
    return !/\b24\b/.test(live) && !/\bscene 8\b/i.test(live) && !/8 scenes per path/i.test(live);
  }));
// THE FOUR SEPARATIONS Roman required, carried in the packet itself so a scoring session cannot
// mistake a boundary-reliability result for a quality result.
[['boundary reliability only', /BOUNDARY RELIABILITY ONLY/],
 ['repeated prose = fixture artifact', /FIXTURE ARTIFACT/],
 ['repeated Commission = identity-guard check', /IDENTITY-GUARD CHECK, not a creative\n  failure/],
 ['activation counts inconclusive', /activation counts from that run are INCONCLUSIVE/i]]
  .forEach(([name, re]) => t('the preregistration separates: ' + name,
    re.test(fs.readFileSync(OUT + '/00_PREREGISTRATION.md', 'utf8'))));
t('every slot is EMPTY — nothing was generated', key.every(k =>
  /_\(empty — no generation has occurred; this packet is pre-authorisation\)_/
    .test(fs.readFileSync(OUT + '/03_SLOTS/' + k.slot + '.md', 'utf8'))));

console.log('\n' + pass + '/' + (pass + fail) + ' integrity checks passed');
process.exit(fail ? 1 : 0);
