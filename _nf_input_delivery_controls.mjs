#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// INPUT / STATE / ASSIGNMENT DELIVERY CONTROLS — PROVIDER-BLOCKED.
//
// The application is loaded in a headless page with every /api/** route ABORTED. Inputs are the
// preserved artifacts of run_2026-11-02T19-03-47-893Z_29351, read from disk, never retyped.
//
// WHAT IS IN SCOPE
//   A  the normalization guard, on the ACTUAL recorded pairs (r107 undeclared, r36 and r58
//      declared-but-damaging), plus a MAPPED replacement as a positive control
//      plus one CONSTRUCTED collision case (a partner named Greyward, which the global mapping
//      approves for gandalf) — constructed, not from the manuscript
//   A2 the provider boundary for the same call: the body the page builds, and the final upstream
//      messages the real api/chatgpt-proxy.js handler produces from it, with fetch stubbed
//   B  the seed's seal wording, read out of window.STARTER_SEEDS
//   C  the assignment-setting parser's AUTHORITY, not its accuracy: three sentences it still
//      reads wrongly, shown to no longer be able to mandate anything
//   D  DELIVERED INPUTS — the text window._buildSceneAssignmentBlock and the spine-staging
//      writers actually emit for scene 4, captured with state restored from the run
//
// WHAT IS STILL OUT OF SCOPE: no story is launched and no full author request is assembled.
//   Planning needs providers, which are blocked. D captures the emitters that produce the setting
//   mandate and the anchor, which is where the contradiction lived — not the whole request.
//
// Red controls are reconstructed from the old behaviour and evaluated here, never asserted.
//
// Usage:  node _nf_input_delivery_controls.mjs       (needs the dev server on :3000)
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const RUN = process.env.SB_RUN_DIR
  || '/Users/romantsukerman/storybound-diag/_nf_story_test_RUN3/run_2026-11-02T19-03-47-893Z_29351';
const SEED_ID = 'starter_first_sacrifice';

let PASS = 0, FAIL = 0, INCONCLUSIVE = 0;
const FAILURES = [], INCONCLUSIVES = [];
const line = (s) => console.log(s);
const section = (t) => { line(''); line('='.repeat(88)); line(t); line('='.repeat(88)); };
const note = (l, v) => line('  ----  ' + l + ' :: ' + String(v).replace(/\n/g, ' ').slice(0, 320));
function check(label, ok, detail) {
  if (ok) { PASS++; line('  PASS  ' + label); }
  else { FAIL++; FAILURES.push(label); line('  FAIL  ' + label + (detail ? '  :: ' + String(detail).slice(0, 320) : '')); }
}
function inconclusive(label, why) {
  INCONCLUSIVE++; INCONCLUSIVES.push(label + ' — ' + why);
  line('  ????  ' + label + '\n        INCONCLUSIVE: ' + why);
}

// ── THE PRESERVED RECORD ─────────────────────────────────────────────────────────────────
const choice = (n) => JSON.parse(fs.readFileSync(RUN + '/choice_scene' + n + '.json', 'utf8'));
function normCall(reqId) {
  const j = JSON.parse(fs.readFileSync(RUN + '/response_r' + reqId + '_NORMALIZATION_200.json', 'utf8'));
  const b = JSON.parse(j.bodyComplete);
  return { reqId, scene: j.scene, got: b.canonical_instruction ?? b.normalized_text ?? '',
    report: { changed: b.changed, rejection_reason: b.rejection_reason } };
}
// r107 — scene 6 dialogue, UNDECLARED edit. r36 — scene 3 dialogue, DECLARED "protected name"
// while deleting the ward. r58 — scene 4 action, DECLARED "protected/IP names" while replacing
// both cast members with role placeholders.
const R107 = normCall(107), RAW107 = choice(5).dialogue;
const R36 = normCall(36),  RAW36 = choice(2).dialogue;
const R58 = normCall(58),  RAW58 = choice(3).action;
const R80 = normCall(80),  RAW80 = choice(4).action;
const R196 = normCall(196), RAW196 = choice(9).action;
const R34 = normCall(34),  RAW34 = choice(2).action;
// THE RUN'S OWN LIVE STATE. An earlier version of this suite hand-built a three-field stub
// (_starterId + playerName + loveInterestName), which is what let r34 look fixed when it was not:
// a stub cannot show what the real state does or does not make resolvable.
const REAL_STATE = JSON.parse(JSON.parse(
  fs.readFileSync(RUN + '/STATE_after_scene3.json', 'utf8')).storage.sb_saved_story).stateSnapshot;
const req6 = fs.readFileSync(RUN + '/AUTHOR_REQUEST_scene6.json', 'utf8');
const state5 = fs.readFileSync(RUN + '/STATE_after_scene5.json', 'utf8');
const savedStory = JSON.parse(JSON.parse(fs.readFileSync(RUN + '/STATE_after_scene10.json', 'utf8'))
  .storage.sb_saved_story);
const EVENTS = {};
for (const e of savedStory.stateSnapshot._sceneLedger.entries) {
  const n = e.sceneNumber ?? e.n;
  const pe = e.plannedEvent || (e.key && e.key.plannedEvent) || null;
  if (pe) EVENTS[n] = { plannedEvent: pe, settingAtRuntime: (e.setting !== undefined ? e.setting : (e.key && e.key.setting)) || null };
}

section('THE PRESERVED RECORD — read from disk, not constructed');
for (const [tag, raw, c] of [['r107 dialogue', RAW107, R107], ['r36 dialogue', RAW36, R36], ['r58 action', RAW58, R58]]) {
  note(tag, 'changed=' + c.report.changed + '  reason=' + JSON.stringify(c.report.rejection_reason));
  note('   submitted', '…' + raw.slice(-120));
  note('   returned ', '…' + c.got.slice(-120));
}
check('r107 deleted the ward while declaring no change',
  R107.report.changed === false && /\bSeren\b/.test(RAW107) && !/\bSeren\b/.test(R107.got));
check('r36 deleted the ward while claiming a protected-name removal',
  R36.report.changed === true && /protected name/.test(String(R36.report.rejection_reason))
  && /\bSeren\b/.test(RAW36) && !/\bSeren\b/.test(R36.got), R36.report.rejection_reason);
check('r58 replaced both cast members with role placeholders, claiming IP names',
  R58.report.changed === true && /\bJulian\b/.test(RAW58) && /\bSeren\b/.test(RAW58)
  && !/\bJulian\b/.test(R58.got) && !/\bSeren\b/.test(R58.got)
  && /the target/.test(R58.got) && /the other character/.test(R58.got), R58.got.slice(0, 160));

// Section E's fixture, declared here because the route handler closes over it.
let FIXTURE_ARMED = false;
const outgoingBodies = [];
const SKEL_FIXTURE = {
  environment_anchor: 'the ceremony clearing ringed by mated-pair trunks',
  structural_pacing: 'controlled tension', narrative_density: 'high', dialogue_ratio: 'balanced',
  beat_style: 'measured', tension_rhythm: 'escalating',
  staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON', role: 'protagonist' },
    { name: 'Julian', presence_mode: 'IN_PERSON', role: 'love interest' }],
  interlocutor_placement: 'Julian — the Chayr examining her sash, slow to answer',
  li_texture_beat: null, pc_body_callback: 'beat 1 — signature_feature (the crooked front tooth)',
  li_body_callback: 'beat 2 — restraint_tell (his hand flattening on the cloth)',
  antagonist_body_callback: null,
  environment_plus: { target: 'the sash', axis: 'history' }, fusion: null,
  stage_contract: {}, causal_outline: [{ beat: 'Julian asks to handle the sash', link: 'therefore' }],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
let apiAttempts = 0, apiAborted = 0;
let apiFixtured = 0;
// Blanket abort, EXCEPT the one endpoint section E serves a fixture to. A fixture is not a
// provider call: nothing leaves the machine and nothing is billed either way.
await ctx.route('**/api/**', (route) => {
  apiAttempts += 1;
  if (/\/api\/mistral-proxy/.test(route.request().url()) && FIXTURE_ARMED) {
    apiFixtured += 1;
    try { outgoingBodies.push(JSON.parse(route.request().postData() || '{}')); } catch (_) {}
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify(SKEL_FIXTURE) }) });
  }
  apiAborted += 1; return route.abort();
});

try {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.usableDialogue === 'function'
    && typeof window._spineStagingFromEvent === 'function'
    && typeof window._buildSceneAssignmentBlock === 'function'
    && typeof window._selectSceneAssignment === 'function', { timeout: 60000 });

  // THE RUN'S OWN STATE IS INSTALLED WHOLESALE. Nothing is hand-set, so what the guard can and
  // cannot resolve here is what it could resolve during the run.
  const CAST = await page.evaluate((st) => {
    // MUTATE, DO NOT REPLACE. app.js binds `var state = window.state` once (~line 20652), so
    // assigning a new object to window.state leaves every internal reader on the old one — which
    // is how an earlier version of this suite asserted against an object the emitters never saw.
    Object.assign(window.state, st);
    return { cast: window._normStoryCastNames(window.state),
      seedResolves: !!(window._activeSeed && window._activeSeed(window.state)),
      starterId: window.state._starterId || null };
  }, REAL_STATE);
  note('state installed from', 'STATE_after_scene3.json → sb_saved_story.stateSnapshot');
  note('its _starterId', CAST.starterId);
  note('cast names the guard derives from it', CAST.cast.join(', '));
  check('the seed resolves from the run\'s own state, not from a stub', CAST.seedResolves === true,
    String(CAST.seedResolves));
  check('the cast it derives includes both named individuals and the PC',
    CAST.cast.includes('Lirael') && CAST.cast.includes('Julian') && CAST.cast.includes('Seren'),
    CAST.cast.join(','));

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('A — THE READER\'S NAMED CAST SURVIVES NORMALIZATION');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const run = (fn, raw, got, report) => page.evaluate(([f, raw, got, report]) =>
    window[f](got, raw, report), [fn, raw, got, report]);
  // The old guard: declaration-only. Reconstructed so each case shows both verdicts.
  const oldGuard = (raw, got, report) => (report && report.changed === false && got !== raw) ? raw : got;

  const CASES = [
    { name: 'r107 — UNDECLARED deletion of the ward (dialogue)', fn: 'usableDialogue',
      raw: RAW107, got: R107.got, report: R107.report, expect: 'raw' },
    { name: 'r36 — DECLARED "protected name", deletes the ward (dialogue)', fn: 'usableDialogue',
      raw: RAW36, got: R36.got, report: R36.report, expect: 'raw' },
    { name: 'r58 — DECLARED "protected/IP names", both cast → placeholders (action)', fn: 'usableAction',
      raw: RAW58, got: R58.got, report: R58.report, expect: 'raw' },
    { name: 'r58 — same pair with NO report at all (missing metadata)', fn: 'usableAction',
      raw: RAW58, got: R58.got, report: null, expect: 'raw' },
    { name: 'r80 — DECLARED, no reason, deletes the LI\'s name (action)', fn: 'usableAction',
      raw: RAW80, got: R80.got, report: R80.report, expect: 'raw' },
    { name: 'r196 — DECLARED, no reason, name → placeholder and him → them (action)', fn: 'usableAction',
      raw: RAW196, got: R196.got, report: R196.report, expect: 'raw' },
    // THE CASE THE CAST-NAME TEST COULD NOT SEE. Found only by running against the real state.
    { name: 'r34 — DECLARED, deletes a TITLED authority, no cast name lost (action)', fn: 'usableAction',
      raw: RAW34, got: R34.got, report: R34.report, expect: 'raw' },
  ];
  for (const c of CASES) {
    const now = await run(c.fn, c.raw, c.got, c.report);
    const lost = await page.evaluate(([raw, got]) =>
      window._normLostAddressees(raw, got, window.state), [c.raw, c.got]);
    const want = c.expect === 'raw' ? c.raw : c.got;
    check('NEGATIVE CONTROL: ' + c.name + '  lost=[' + lost.join(',') + ']',
      now === want, 'got="' + String(now).slice(0, 150) + '"');
    const old = oldGuard(c.raw, c.got, c.report);
    if ((old === c.raw ? 'raw' : 'got') !== c.expect) {
      check('  RED CONTROL: the declaration-only guard accepted this damage', true);
    } else {
      inconclusive('  RED CONTROL: the declaration-only guard accepted this damage',
        'it rejected the case too, so this pair does not demonstrate the gap');
    }
  }

  // ── THE INSTRUCTION ITSELF, NOT JUST ITS NAMES ───────────────────────────────────────
  // THE CASES THAT DEFEATED THE TWO PREVIOUS VERSIONS.
  //   v1 constrained the REMOVED token (capitalised, absent from the result, not cast, not a
  //      title) and left the REPLACEMENT free, so the first three below passed and reported
  //      "1 name substitution(s), nothing else changed".
  //   v2 required a DECLARED span and tested it against IP_PATTERNS, but tested it for
  //      CONTAINMENT and let the model write the replacement under a word cap, so the last two
  //      below passed: five words of invented action, and a span that carried the reader's own
  //      instruction along with the name.
  // Every one is now refused, and each is refused for a NAMED reason — reported here so the
  // reason, not just the verdict, is on the record.
  const why = (raw, got, report) => page.evaluate(([raw, got, report]) =>
    window._normSubstitutionOnly(raw, got, window.state, report), [raw, got, report]);
  const SUB_CASES = [
    { name: 'an invented act smuggled into the replacement span, UNDECLARED',
      fn: 'usableAction', raw: 'I hand the deck to Gandalf and wait.',
      got: 'I hand the deck to the grey pilgrim and kneel at his feet and wait.',
      report: { changed: true, rejection_reason: 'protected name — removed recognizable name' } },
    { name: '…and the same act DECLARED as one substitution',
      fn: 'usableAction', raw: 'I hand the deck to Gandalf and wait.',
      got: 'I hand the deck to the grey pilgrim and kneel at his feet and wait.',
      report: { changed: true, substitutions: [{ from: 'Gandalf',
        to: 'the grey pilgrim and kneel at his feet', why: 'protected name' }] } },
    { name: 'a deletion dressed as a substitution, UNDECLARED',
      fn: 'usableAction', raw: 'I ask Gandalf, then wait.', got: 'I ask, then wait.',
      report: { changed: true, rejection_reason: 'protected name — removed recognizable name' } },
    { name: '…and the same deletion DECLARED with an empty replacement',
      fn: 'usableAction', raw: 'I ask Gandalf, then wait.', got: 'I ask, then wait.',
      report: { changed: true, substitutions: [{ from: ' Gandalf', to: '', why: 'protected name' }] } },
    { name: 'a different day of the week, DECLARED as a name substitution',
      fn: 'usableDialogue', raw: 'I will meet you on Monday and wait.',
      got: 'I will meet you on Friday and wait.',
      report: { changed: true, substitutions: [{ from: 'Monday', to: 'Friday', why: 'protected name' }] } },
    { name: 'the instruction inverted, DECLARED as a substitution of its verb phrase',
      fn: 'usableAction', raw: 'I do not take Julian\'s hand off the cloth.',
      got: 'I take Julian\'s hand off the cloth.',
      report: { changed: true, substitutions: [{ from: 'do not take', to: 'take', why: 'legibility' }] } },
    { name: 'this story\'s own cast renamed, DECLARED and applied exactly',
      fn: 'usableAction', raw: 'I step toward Julian and stop.',
      got: 'I step toward the target and stop.',
      report: { changed: true, substitutions: [{ from: 'Julian', to: 'the target', why: 'protected/IP name' }] } },
    { name: 'a second edit outside the declared span',
      fn: 'usableAction', raw: 'I hand the deck to Gandalf and wait.',
      got: 'I hand the deck to the grey pilgrim and wait quietly.',
      report: { changed: true, substitutions: [{ from: 'Gandalf', to: 'the grey pilgrim', why: 'protected name' }] } },
    { name: 'a declared span that is not in the reader\'s text at all',
      fn: 'usableAction', raw: 'I hand the deck to Gandalf and wait.',
      got: 'I hand the deck to the grey pilgrim and wait.',
      report: { changed: true, substitutions: [{ from: 'Mithrandir', to: 'the grey pilgrim', why: 'protected name' }] } },
    // ── THE TWO THAT DEFEATED v2 ──────────────────────────────────────────────────────
    { name: 'an invented act INSIDE the word cap (five words), declared on a correct span',
      fn: 'usableAction', raw: 'I hand the deck to Gandalf and wait.',
      got: 'I hand the deck to the grey pilgrim and kneel and wait.',
      report: { changed: true, substitutions: [{ from: 'Gandalf',
        to: 'the grey pilgrim and kneel', why: 'protected name' }] } },
    { name: 'the reader\'s own instruction swallowed by the declared span',
      fn: 'usableAction', raw: 'I ask Gandalf to wait, then leave.',
      got: 'I ask the grey pilgrim to follow, then leave.',
      report: { changed: true, substitutions: [{ from: 'Gandalf to wait',
        to: 'the grey pilgrim to follow', why: 'protected name' }] } },
    { name: '…and the same span-swallowing with an APPROVED name inside it',
      fn: 'usableAction', raw: 'I ask Gandalf to wait, then leave.',
      got: 'I ask Galdric to follow, then leave.',
      report: { changed: true, substitutions: [{ from: 'Gandalf to wait',
        to: 'Galdric to follow', why: 'protected name' }] } },
  ];
  for (const c of SUB_CASES) {
    const now = await run(c.fn, c.raw, c.got, c.report);
    const verdict = await why(c.raw, c.got, c.report);
    check('NEGATIVE CONTROL: ' + c.name, now === c.raw, 'returned="' + String(now).slice(0, 140) + '"');
    note('   refused because', verdict && verdict.why);
  }
  // The identity tests cannot see the inversion — the control that shows WHY the constructive
  // check has to exist rather than another name test.
  const lostOnInversion = await page.evaluate(() => window._normLostAddressees(
    'I do not take Julian\'s hand off the cloth.', 'I take Julian\'s hand off the cloth.', window.state));
  check('  RED CONTROL: the identity tests see nothing wrong with the inversion',
    lostOnInversion.length === 0, JSON.stringify(lostOnInversion));
  const invertedNeg = await run('usableAction',
    'I refuse to hand the deck over and stay on my knees.',
    'I hand the deck over and stay on my knees.',
    { changed: true, rejection_reason: null });
  check('NEGATIVE CONTROL: a dropped refusal is refused too',
    invertedNeg === 'I refuse to hand the deck over and stay on my knees.', invertedNeg);

  // ── THE RED CONTROLS FOR v2's TWO HOLES ──────────────────────────────────────────────
  // The permission check as v2 wrote it, reconstructed here: CONTAINMENT against IP_PATTERNS,
  // plus a non-empty replacement under a six-word cap with no negation. Evaluated, never
  // asserted as behaviour — it exists to show the two cases above were real holes, not theory.
  const v2Permits = (from, to) => page.evaluate(([from, to]) => {
    const conf = window._normProtectedConfidence(from);        // CONTAINMENT — v2's test
    const words = (String(to).match(/[\p{L}\p{N}'’]+/gu) || []).length;
    const neg = /\b(?:not|never|no|none|nobody|nothing|neither|nor|without|cannot)\b/i.test(to);
    return { conf, words, neg, permitted: conf >= 0.65 && words > 0 && words <= 6 && !neg };
  }, [from, to]);
  for (const [label, from, to] of [
    ['an invented act inside the cap', 'Gandalf', 'the grey pilgrim and kneel'],
    ['a span carrying the instruction', 'Gandalf to wait', 'the grey pilgrim to follow'],
  ]) {
    const v = await v2Permits(from, to);
    if (v.permitted) check('  RED CONTROL: v2\'s permission check admitted ' + label, true);
    else inconclusive('  RED CONTROL: v2\'s permission check admitted ' + label,
      'it refused this one too, so the case does not demonstrate the hole');
    note('   v2 saw', 'containment confidence ' + v.conf + ', ' + v.words + ' replacement words');
  }

  // ── POSITIVE CONTROL: a genuinely permitted replacement ──────────────────────────────
  // Declared; the span is the identifier END TO END; the replacement is one of the values this
  // page itself approves for it (NAME_TRANSFORMS.gandalf = Galdric | Galden | Greyward); and
  // applying the declaration reproduces what came back exactly.
  const PERM_RAW = 'I hand the deck to Gandalf and wait, Julian. Ask him yourself.';
  const PERM_GOT = 'I hand the deck to Galdric and wait, Julian. Ask him yourself.';
  const PERM_REP = { changed: true, substitutions: [{ from: 'Gandalf', to: 'Galdric',
    why: 'protected name — removed recognizable name' }] };
  const permitted = await run('usableDialogue', PERM_RAW, PERM_GOT, PERM_REP);
  check('POSITIVE CONTROL: a MAPPED substitution IS applied', permitted === PERM_GOT, permitted);
  note('   accepted because', (await why(PERM_RAW, PERM_GOT, PERM_REP)).why);
  note('   the page\'s approved values for that span',
    JSON.stringify(await page.evaluate(() => window._normMappedReplacements('Gandalf'))));
  note('   span confidence, anchored vs contained', await page.evaluate(() => JSON.stringify({
    whole_span_is_the_name: window._normProtectedSpanConfidence('Gandalf'),
    span_merely_contains_it: window._normProtectedSpanConfidence('Gandalf to wait'),
    v2_containment_on_that_span: window._normProtectedConfidence('Gandalf to wait') })));
  // THE OTHER ALTERNATIVES IN THE SAME MAPPING ARE EQUALLY PERMITTED — the gate accepts the
  // table's values, not one hardcoded favourite.
  for (const alt of ['Galden', 'Greyward']) {
    const g = PERM_RAW.replace('Gandalf', alt);
    const r = await run('usableDialogue', PERM_RAW, g,
      { changed: true, substitutions: [{ from: 'Gandalf', to: alt, why: 'protected name' }] });
    check('POSITIVE CONTROL: "' + alt + '", the mapping\'s other approved value, is applied',
      r === g, r);
  }
  // A MULTI-WORD IDENTIFIER, where every word is mapped and the permitted set is the product of
  // the per-word alternatives.
  const MW_RAW = 'I tell Luke Skywalker to hold the line.';
  const MW_GOT = 'I tell Lucan Skyborne to hold the line.';
  const multiword = await run('usableAction', MW_RAW, MW_GOT,
    { changed: true, substitutions: [{ from: 'Luke Skywalker', to: 'Lucan Skyborne', why: 'protected name' }] });
  check('POSITIVE CONTROL: a two-word identifier, both words mapped, is applied',
    multiword === MW_GOT, multiword);
  note('   permitted values for that span (product of the per-word lists)',
    JSON.stringify(await page.evaluate(() => window._normMappedReplacements('Luke Skywalker'))));
  // AND THE SAME REPLACEMENT UNDECLARED IS REFUSED. `changed:true` with no list is not a
  // description of the edit, so there is nothing to validate.
  const permittedUndeclared = await run('usableDialogue', PERM_RAW, PERM_GOT,
    { changed: true, rejection_reason: 'protected name — removed recognizable name' });
  check('…and the identical replacement UNDECLARED is refused', permittedUndeclared === PERM_RAW,
    permittedUndeclared);
  // A COST THE FIRST VERSION PAID AND THIS ONE DOES NOT: a protected name the reader puts
  // FIRST in a sentence. The old rule excluded sentence-initial words to keep ordinary rewording
  // out; a declared span checked against a closed mapping needs no such exclusion.
  const SI_RAW = 'Gandalf told me the deck would answer.';
  const SI_GOT = 'Galdric told me the deck would answer.';
  const sentenceInitial = await run('usableDialogue', SI_RAW, SI_GOT,
    { changed: true, substitutions: [{ from: 'Gandalf', to: 'Galdric', why: 'protected name' }] });
  check('POSITIVE CONTROL: a protected name the reader puts FIRST is now substitutable',
    sentenceInitial === SI_GOT, sentenceInitial);

  // ── WHAT THE LAYER IS TOLD IT MAY DO, FOR THE READER'S OWN TEXT ──────────────────────
  // The permitted mapping now travels WITH the request, so a substitution never has to be
  // invented. This is the same table the gate reads, built for the reader's own sentence.
  const permittedForText = await page.evaluate(() => ({
    gandalf: window._normPermittedSubstitutions('I hand the deck to Gandalf and wait.'),
    none: window._normPermittedSubstitutions('I hand the deck to Julian and wait.'),
    unmapped: window._normPermittedSubstitutions('I hand the deck to Voldemort and wait.'),
  }));
  note('   permitted_substitutions for the Gandalf sentence', JSON.stringify(permittedForText.gandalf));
  check('the request carries the one mappable span and its approved values',
    permittedForText.gandalf.length === 1 && permittedForText.gandalf[0].from === 'Gandalf'
    && permittedForText.gandalf[0].permitted_to.join('|') === 'Galdric|Galden|Greyward',
    JSON.stringify(permittedForText.gandalf));
  check('…and the model-written phrase is NOT among the values offered to the layer',
    !JSON.stringify(permittedForText.gandalf).includes('grey pilgrim'));
  check('a sentence with nothing replaceable offers an EMPTY list',
    permittedForText.none.length === 0, JSON.stringify(permittedForText.none));
  check('a protected name with no mapping offers nothing either',
    permittedForText.unmapped.length === 0, JSON.stringify(permittedForText.unmapped));

  // ── AN APPROVED VALUE THAT IS SOMEONE IN THIS STORY ──────────────────────────────────
  // CONSTRUCTED, not from the manuscript: the partner is named Greyward, which is one of the
  // three values the GLOBAL table approves for gandalf. The mapping is approved everywhere and
  // unsafe here, and the collision is invisible to every other test — the name is already in the
  // reader's own sentence, so "introduces a name" sees nothing.
  const COLL_RAW = 'I tell Greyward to wait and ask Gandalf to follow me.';
  const COLL_GOT = 'I tell Greyward to wait and ask Greyward to follow me.';
  const COLL_REP = { changed: true,
    substitutions: [{ from: 'Gandalf', to: 'Greyward', why: 'protected name' }] };
  const priorPartner = await page.evaluate(() => {
    const was = window.state.partnerName;
    window.state.partnerName = 'Greyward';   // mutate, never replace (see the note above)
    return was === undefined ? null : was;
  });
  try {
    const castNow = await page.evaluate(() => window._normStoryCastNames(window.state));
    check('PRECONDITION: the constructed partner name is in the cast the guard derives',
      castNow.includes('Greyward'), castNow.join(','));
    // RED CONTROL: the global table still approves that value — which is exactly what the
    // previous version checked membership against, and why it accepted the merge.
    const globalList = await page.evaluate(() => window._normMappedReplacements('Gandalf', null));
    if (globalList.includes('Greyward')) {
      check('  RED CONTROL: the GLOBAL mapping approves "Greyward" for gandalf — the list the'
        + ' previous version checked against', true);
    } else {
      inconclusive('  RED CONTROL: the global mapping approves "Greyward"',
        'it does not, so this case does not demonstrate the collision');
    }
    const merged = await run('usableAction', COLL_RAW, COLL_GOT, COLL_REP);
    check('NEGATIVE CONTROL: an approved value that names this story\'s partner is REFUSED',
      merged === COLL_RAW, merged);
    note('   refused because', (await why(COLL_RAW, COLL_GOT, COLL_REP)).why);
    // THE ADVERTISED LIST MUST NOT OFFER IT EITHER — both halves, or the exclusion is a hole.
    const offered = await page.evaluate((raw) =>
      window._normPermittedSubstitutions(raw, window.state), COLL_RAW);
    check('…and the list sent to the layer no longer offers it',
      offered.length === 1 && !offered[0].permitted_to.includes('Greyward')
      && offered[0].permitted_to.join('|') === 'Galdric|Galden', JSON.stringify(offered));
    note('   what this story advertises for that span', JSON.stringify(offered[0] && offered[0].permitted_to));
    // POSITIVE CONTROL, IN THE SAME STATE: a mapped value that collides with nobody still applies.
    const SAFE_GOT = 'I tell Greyward to wait and ask Galdric to follow me.';
    const safeOne = await run('usableAction', COLL_RAW, SAFE_GOT,
      { changed: true, substitutions: [{ from: 'Gandalf', to: 'Galdric', why: 'protected name' }] });
    check('POSITIVE CONTROL: a non-colliding mapped replacement still applies, same story',
      safeOne === SAFE_GOT, safeOne);
    // AND WHEN NOTHING SAFE REMAINS, the reader's input is retained. Constructed state passed
    // straight to the real guard, so no live state is touched for this one.
    const noneLeft = await page.evaluate(([raw, got, report]) => {
      const s = Object.assign({}, window.state, { playerName: 'Galdric',
        partnerName: 'Greyward', loveInterestName: 'Galden' });
      return { verdict: window._normSubstitutionOnly(raw, got, s, report),
        advertised: window._normPermittedSubstitutions(raw, s),
        approvedGlobally: window._normMappedReplacements('Gandalf', null) };
    }, [COLL_RAW, 'I tell Greyward to wait and ask Galdric to follow me.',
      { changed: true, substitutions: [{ from: 'Gandalf', to: 'Galdric', why: 'protected name' }] }]);
    check('when EVERY approved value collides, no safe replacement remains and the input stands',
      noneLeft.verdict.ok === false && /no safe replacement remains/.test(noneLeft.verdict.why),
      noneLeft.verdict.why);
    check('…and that span is not advertised to the layer at all',
      noneLeft.advertised.length === 0, JSON.stringify(noneLeft.advertised));
    note('   the global table still holds all three', JSON.stringify(noneLeft.approvedGlobally));
  } finally {
    const restored = await page.evaluate((was) => {
      if (was === null) delete window.state.partnerName; else window.state.partnerName = was;
      return { partnerName: window.state.partnerName === undefined ? null : window.state.partnerName,
        cast: window._normStoryCastNames(window.state) };
    }, priorPartner);
    check('the constructed partner name is removed again before anything else runs',
      !restored.cast.includes('Greyward') && restored.partnerName === priorPartner,
      JSON.stringify(restored));
  }

  // ── WHAT THIS CONTRACT COSTS, STATED AS TESTS ────────────────────────────────────────
  // Not defects. The rule working, in the direction it is meant to fail in.
  const reworded = await run('usableDialogue',
    'Seren, tell me what you remember of that morning. Don\'t spare me.',
    'Seren, tell me what you remember about that morning, and do not spare me.',
    { changed: true, rejection_reason: null });
  check('COST: an ordinary rewording is refused — there is no span that explains it',
    reworded === 'Seren, tell me what you remember of that morning. Don\'t spare me.', reworded);
  const UNLISTED_RAW = 'I hand the deck to Geralt and wait.';
  const unlisted = await run('usableAction', UNLISTED_RAW, 'I hand the deck to the white wolf and wait.',
    { changed: true, substitutions: [{ from: 'Geralt', to: 'the white wolf', why: 'protected name' }] });
  check('COST: a protected name the page\'s IP table does not carry is NOT substituted',
    unlisted === UNLISTED_RAW, unlisted);
  // THE NEW COST, AND THE SHARPER ONE: a name the IP table DOES carry, at high confidence, with
  // no entry in the replacement mapping. v2 would have allowed any six words here.
  const UNMAPPED_RAW = 'I hand the deck to Voldemort and wait.';
  const unmapped = await run('usableAction', UNMAPPED_RAW, 'I hand the deck to the dark lord and wait.',
    { changed: true, substitutions: [{ from: 'Voldemort', to: 'the dark lord', why: 'protected name' }] });
  check('COST: a protected name with NO approved mapping is not substituted either',
    unmapped === UNMAPPED_RAW, unmapped);
  note('   its standing in the two tables', await page.evaluate(() => JSON.stringify({
    ip_confidence: window._normProtectedSpanConfidence('Voldemort'),
    approved_replacements: window._normMappedReplacements('Voldemort') })));
  note('   the trade', 'the reader\'s own text is kept, so that name stays in it and the IP '
    + 'machinery elsewhere is what must deal with it. Over-rejection costs nothing here: the '
    + 'reader\'s text is always a valid instruction.');
  note('   what the receipts do and do not say', 'the 18 recorded NORMALIZATION calls in this run '
    + 'carry no `substitutions` field, which dates them — it does not establish what a reply can '
    + 'contain now. The prompt asks for the field, the proxy spreads parsed fields through, the '
    + 'call sites pass the report to the gate, and the request now carries the permitted mapping. '
    + 'Section A2 verifies the upstream half of that against a stub; what a live reply returns is '
    + 'unmeasured here, by design — no provider is contacted.');

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('A2 — THE PROVIDER BOUNDARY: WHAT THE NORMALIZATION CALL ACTUALLY SENDS');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // THE CONFLICT THIS CLOSES: for role NORMALIZATION the proxy prepended its own system prompt —
  // "You are an archetypal distillation layer", OUTPUT FORMAT one non-narrative mythic fragment
  // or { archetype, burden, tension }, "Output only the mythic kernel" — in front of the page's
  // reader-preservation contract, which requires the reader's instruction back with every change
  // declared span by span. One call, two contradictory instructions, and no reply could satisfy
  // both. The two reader axes are now scoped out of it AT THE BOUNDARY; every other axis keeps it.
  //
  // BOTH HALVES ARE READ FROM THE REAL CODE, WITH NO PROVIDER CONTACTED:
  //   · the PAGE half — the body callNormalizationLayer builds, captured off the wire
  //   · the PROXY half — api/chatgpt-proxy.js required in-process and handed that exact body,
  //     with global fetch replaced by a stub that captures the upstream OpenAI request and
  //     answers from a fixture. Nothing leaves the machine; nothing is billed.
  const READER_RAW = 'I hand the deck to Gandalf and wait.';
  const STUB_REPLY = { canonical_instruction: 'I hand the deck to Galdric and wait.',
    changed: true, rejection_reason: null,
    substitutions: [{ from: 'Gandalf', to: 'Galdric', why: 'protected name' }] };
  const pageBodies = [];
  const normRoute = (route) => {
    apiAttempts += 1; apiFixtured += 1;
    try { pageBodies.push(JSON.parse(route.request().postData() || '{}')); } catch (_) {}
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(Object.assign({ ok: true, content: JSON.stringify(STUB_REPLY) }, STUB_REPLY)) });
  };
  await ctx.route('**/api/chatgpt-proxy', normRoute);

  // ── THE PAGE HALF ────────────────────────────────────────────────────────────────────
  const readerOut = await page.evaluate((raw) => window.callNormalizationLayer({
    axis: 'player_action', user_text: raw, context_signals: [] }), READER_RAW);
  check('the substitution metadata survives the client path intact',
    Array.isArray(readerOut.substitutions) && readerOut.substitutions.length === 1
    && readerOut.substitutions[0].from === 'Gandalf' && readerOut.substitutions[0].to === 'Galdric',
    JSON.stringify(readerOut.substitutions));
  const roundTrip = await run('usableAction', READER_RAW, readerOut.canonical_instruction, readerOut);
  check('…and a reply built to that contract is ACCEPTED by the guard, end to end',
    roundTrip === STUB_REPLY.canonical_instruction, roundTrip);
  const readerBody = pageBodies[0] || {};
  check('the page sends the axis TOP-LEVEL, where the proxy can read it',
    readerBody.axis === 'player_action', JSON.stringify(readerBody.axis));
  const readerSys = (readerBody.messages || []).filter((m) => m.role === 'system');
  const readerUser = (readerBody.messages || []).find((m) => m.role === 'user');
  const readerPayload = JSON.parse((readerUser && readerUser.content) || '{}');
  check('the page sends exactly one system message, its own contract', readerSys.length === 1
    && /substitutions/.test(readerSys[0].content), readerSys.length + ' system message(s)');
  check('that contract states the permitted mapping is the whole of what the layer may do',
    /permitted_substitutions/.test(readerSys[0].content)
    && /UNCHANGED/.test(readerSys[0].content));
  check('the payload carries the permitted mapping for the reader\'s own text',
    Array.isArray(readerPayload.permitted_substitutions)
    && readerPayload.permitted_substitutions.length === 1
    && readerPayload.permitted_substitutions[0].from === 'Gandalf'
    && readerPayload.permitted_substitutions[0].permitted_to.includes('Galdric'),
    JSON.stringify(readerPayload.permitted_substitutions));

  // ── A NON-READER AXIS, DRIVEN THE SAME WAY ───────────────────────────────────────────
  await page.evaluate(() => window.callNormalizationLayer({
    axis: 'character', user_text: 'Gandalf', context_signals: [] }));
  const charBody = pageBodies[1] || {};
  check('a non-reader axis sends no permitted mapping — its contract is unchanged',
    charBody.axis === 'character'
    && JSON.parse(((charBody.messages || []).find((m) => m.role === 'user') || {}).content || '{}')
         .permitted_substitutions === undefined, JSON.stringify(charBody.axis));
  await ctx.unroute('**/api/chatgpt-proxy', normRoute);

  // ── THE PROXY HALF: THE FINAL UPSTREAM MESSAGES ──────────────────────────────────────
  const upstream = [];
  const _realFetch = globalThis.fetch;
  const _priorKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'stub-key-never-used';
  globalThis.fetch = async (url, opts) => {
    upstream.push({ url: String(url), body: JSON.parse((opts && opts.body) || '{}') });
    return { ok: true, status: 200, text: async () => JSON.stringify({
      choices: [{ message: { content: JSON.stringify(STUB_REPLY) } }],
      usage: { prompt_tokens: 0, completion_tokens: 0 } }) };
  };
  const ARCHETYPAL = /archetypal distillation layer|mythic kernel|MODE: (SOLO|COUPLE|STRANGER)/;
  let proxyErr = null, readerRes = null, charRes = null, noAxisRes = null, payloadAxisRes = null;
  try {
    const require = createRequire(import.meta.url);
    const handler = require('/Users/romantsukerman/storybound-app/api/chatgpt-proxy.js');
    const callProxy = async (body) => {
      const res = { statusCode: 0, body: null, headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(c) { this.statusCode = c; return this; },
        json(b) { this.body = b; return this; }, end() { return this; } };
      await handler({ method: 'POST', headers: { origin: 'http://localhost:3000' }, body }, res);
      return res;
    };
    readerRes = await callProxy(readerBody);
    charRes = await callProxy(charBody);
    // RED CONTROL, and the no-axis contract: a caller that labels nothing keeps the old behaviour.
    const stripped = JSON.parse(JSON.stringify(readerBody));
    delete stripped.axis;
    const strippedPayload = JSON.parse(stripped.messages.find((m) => m.role === 'user').content);
    const payloadOnly = JSON.parse(JSON.stringify(stripped));
    delete strippedPayload.axis;
    stripped.messages.find((m) => m.role === 'user').content = JSON.stringify(strippedPayload);
    noAxisRes = await callProxy(stripped);
    payloadAxisRes = await callProxy(payloadOnly);
  } catch (e) {
    proxyErr = e && e.message;
  } finally {
    globalThis.fetch = _realFetch;
    if (_priorKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = _priorKey;
  }
  if (proxyErr) {
    inconclusive('the real proxy handler could not be driven in-process', proxyErr);
  } else {
    const up = (i) => JSON.stringify((upstream[i] || {}).body || {});
    const sysOf = (i) => (((upstream[i] || {}).body || {}).messages || [])
      .filter((m) => m.role === 'system');
    note('upstream calls captured', upstream.length + ' → ' + (upstream[0] || {}).url);
    check('READER AXIS: exactly ONE system message reaches the provider', sysOf(0).length === 1,
      sysOf(0).length + ' system message(s)');
    check('…and it is the page\'s own contract, unmodified',
      sysOf(0)[0] && sysOf(0)[0].content === readerSys[0].content);
    check('…with no archetypal-distillation instruction anywhere in the request',
      !ARCHETYPAL.test(up(0)), up(0).slice(0, 200));
    check('…and the reader\'s text and permitted mapping arrive intact',
      up(0).includes('Gandalf') && up(0).includes('permitted_substitutions')
      && up(0).includes('Galdric'));
    check('the proxy passes the returned substitution metadata back to the caller',
      readerRes.statusCode === 200 && Array.isArray(readerRes.body.substitutions)
      && readerRes.body.substitutions[0].to === 'Galdric'
      && readerRes.body.canonical_instruction === STUB_REPLY.canonical_instruction,
      JSON.stringify(readerRes.body && readerRes.body.substitutions));
    // EVERY OTHER AXIS IS UNTOUCHED — the distillation prompt is still prepended, with its mode.
    check('NON-READER AXIS: the archetypal prompt is still prepended, as before',
      sysOf(1).length === 2 && /archetypal distillation layer/.test(sysOf(1)[0].content)
      && /Output only the mythic kernel/.test(sysOf(1)[0].content),
      sysOf(1).length + ' system message(s)');
    check('…including its mode guidance', /MODE: (SOLO|COUPLE|STRANGER)/.test(sysOf(1)[0].content));
    // RED CONTROL: unlabelled, the prepend is exactly what a reader turn used to receive.
    if (sysOf(2).length === 2 && ARCHETYPAL.test(up(2))) {
      check('  RED CONTROL: with no axis to read, the contradictory prompt IS still prepended —'
        + ' which is what both reader axes received before this change', true);
    } else {
      inconclusive('  RED CONTROL: the unlabelled call still receives the distillation prompt',
        'it was not prepended, so this does not demonstrate the former behaviour');
    }
    check('an older caller that labels the axis only INSIDE the payload is covered too',
      sysOf(3).length === 1 && !ARCHETYPAL.test(up(3)), sysOf(3).length + ' system message(s)');
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('B — THE SEED\'S SEAL WORDING, READ OUT OF THE RUNNING PAGE');
  // ══════════════════════════════════════════════════════════════════════════════════════
  check('RED CONTROL: committed state at the scene-5 checkpoint puts the band at her throat',
    state5.includes('lowered the mouth-band to her throat'), 'no lowering recorded');
  check('RED CONTROL: the preserved scene-6 request asserted muffling for the rite\'s duration',
    req6.includes('cries and speech are MUFFLED behind the cloth')
      && !req6.includes('WHILE THE BAND IS ACROSS HER MOUTH'), 'already conditioned');
  check('RED CONTROL: and the delivered scene-6 prose wrote the band across her mouth',
    fs.readFileSync(RUN + '/scene06.txt', 'utf8').includes('band over my mouth'), 'not taken');
  const seal = await page.evaluate((id) => {
    const s = (window.STARTER_SEEDS || {})[id] || {};
    return { truths: (s.worldTruths || []).filter((t) => /SACRIFICIANT SEAL/.test(String(t))),
      vc: ((s.visualCanon || {}).PC || []).filter((t) => /SACRIFICIANT SEAL/.test(String(t))) };
  }, SEED_ID);
  check('exactly one worldTruth and one visualCanon entry carry the seal',
    seal.truths.length === 1 && seal.vc.length === 1, seal.truths.length + '/' + seal.vc.length);
  const t = seal.truths[0] || '', v = seal.vc[0] || '';
  check('the muffling is conditioned on the band being across her mouth',
    /WHILE THE BAND IS ACROSS HER MOUTH/.test(t), t.slice(-180));
  check('the muffling follows the band, not the rite',
    /THE MUFFLING FOLLOWS WHERE THE BAND IS, NOT WHETHER THE RITE IS IN PROGRESS/.test(t), t.slice(-180));
  check('established state governs the position, in both entries',
    /established state/.test(t) && /established state/i.test(v), 'truth/vc');
  check('the seal is still unbroken wherever the band sits',
    /the seal is unbroken wherever the band sits/.test(t), t.slice(-180));
  check('the visualCanon entry conditions the muffling the same way',
    /ONLY while it is across her mouth/.test(v), v.slice(-150));
  check('the band still begins across the mouth', /across the mouth to begin with/.test(v), v.slice(-180));

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('C — THE PARSER\'S AUTHORITY, NOT ITS ACCURACY');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // The three sentences it still reads wrongly. The point is NOT that these now parse correctly —
  // they do not, and a parser that can be wrong must not be able to mandate. What is asserted is
  // that its output is marked as a parse, so no consumer can treat it as supplied staging.
  const stillWrong = await page.evaluate(() => [
    'Not in the archive, Lirael waits in the clearing.',
    'Lirael refuses to go into the archive and stays in the clearing.',
    'They agree to meet at his stall tomorrow; for now both remain in the clearing.',
  ].map((s) => { const r = window._spineStagingFromEvent(s, ['Lirael']);
    return { sentence: s, setting: (r && r.setting) || null, parsed: !!(r && r.parsed) }; }));
  for (const r of stillWrong) {
    note('parser reading', JSON.stringify(r.setting) + '  ← ' + r.sentence);
    check('  still marked as a parse, so no consumer may treat it as given', r.parsed === true,
      JSON.stringify(r));
  }
  check('at least one of the three is still parsed wrongly — accuracy was NOT the fix',
    stillWrong.some((r) => r.setting && !/^clearing$/.test(r.setting)),
    JSON.stringify(stillWrong.map((r) => r.setting)));

  // The selector marks a parsed setting; a supplied one is left unmarked.
  const marking = await page.evaluate(([ev]) => {
    window.state._sceneAssignment = null;
    const parsed = window._spineStagingFromEvent(ev, ['Lirael', 'Julian']);
    return { parsedFlag: !!(parsed && parsed.parsed), setting: parsed && parsed.setting };
  }, [EVENTS[4].plannedEvent]);
  check('the scene-4 sentence still yields a parse flag', marking.parsedFlag === true, JSON.stringify(marking));
  check('…and no longer yields the place the sentence excludes',
    marking.setting !== 'ceremony clearing', String(marking.setting));
  check('RED CONTROL: the run itself resolved that scene to the excluded place',
    EVENTS[4].settingAtRuntime === 'ceremony clearing', String(EVENTS[4].settingAtRuntime));

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('D — DELIVERED INPUTS: WHAT THE SCENE-4 EMITTERS NOW PRODUCE');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // state is restored enough for the real emitters to run: the scene-4 assignment as the run had
  // it (source issue-outline, no supplied setting), and a skeleton carrying the prior scene's
  // anchor — the exact condition under which the contradiction was produced.
  const delivered = await page.evaluate(([ev, parsedSetting]) => {
    const s = window.state;
    s._sceneAssignment = { event: ev, setting: parsedSetting, _settingInferred: true,
      participants: ['Lirael', 'Julian'], _participantsInferred: true, props: null,
      stateChange: null, source: 'issue-outline' };
    s.sceneSkeleton = { environment_anchor: 'the ceremony clearing ringed by mated-pair trunks',
      structural_pacing: 'x', dialogue_ratio: 'x', narrative_density: 'x', beat_style: 'x',
      tension_rhythm: 'x' };
    s._spineStaging = window._spineStagingFromEvent(ev, ['Lirael', 'Julian']);
    const assignmentBlock = window._buildSceneAssignmentBlock(s, 4);
    // buildSkeletonDirective() reads app.js's own `state` binding, which is window.state only
    // because this suite mutates rather than replaces it — see the install above.
    const skeletonDirective = window.buildSkeletonDirective ? window.buildSkeletonDirective() : '';
    return { assignmentBlock, skeletonDirective, anchorAfter: s.sceneSkeleton.environment_anchor,
      sameObject: window.state === s, liveContinuation: !!s._sceneLiveContinuation };
  }, [EVENTS[4].plannedEvent, marking.setting]);

  note('ASSIGNED EVENT line present', /^ASSIGNED EVENT/m.test(delivered.assignmentBlock));
  line('  ---- delivered assignment block (setting lines) ----');
  for (const l of delivered.assignmentBlock.split('\n')) {
    if (/SETTING|PRESENT/.test(l)) line('        ' + l.slice(0, 260));
  }

  check('the complete assignment sentence is delivered verbatim',
    delivered.assignmentBlock.includes(EVENTS[4].plannedEvent),
    delivered.assignmentBlock.slice(0, 200));
  check('NO "REQUIRED SETTING (given …MUST be this place)" mandate is delivered',
    !/REQUIRED SETTING \(given/.test(delivered.assignmentBlock),
    (delivered.assignmentBlock.match(/REQUIRED SETTING[^\n]*/) || [''])[0]);
  check('the parsed reading is delivered, labelled as possibly wrong',
    /read from the assigned event sentence above by a text parser, which may be wrong/i
      .test(delivered.assignmentBlock),
    (delivered.assignmentBlock.match(/[^\n]*text parser[^\n]*/) || ['label missing'])[0]);
  check('the sentence is named as the authority over the reading',
    /The SENTENCE is authoritative, not this reading/.test(delivered.assignmentBlock), 'missing');
  check('the scanned participant list is not a presence requirement',
    /NAMED IN THE EVENT SENTENCE \(scanned by the text parser/.test(delivered.assignmentBlock)
      && !/MUST BE PRESENT/.test(delivered.assignmentBlock),
    (delivered.assignmentBlock.match(/[^\n]*(MUST BE PRESENT|NAMED IN THE EVENT)[^\n]*/) || [''])[0]);
  check('no delivered line mandates the clearing for scene 4',
    !/MUST be this place[^\n]*clearing/.test(delivered.assignmentBlock)
      && !/REQUIRED SETTING[^\n]*clearing/.test(delivered.assignmentBlock),
    (delivered.assignmentBlock.match(/[^\n]*clearing[^\n]*/) || [''])[0]);

  // THE ANCHOR — the HARD first-sentence command.
  note('environment_anchor after the emitters ran', delivered.anchorAfter);
  check('a PARSED setting did not overwrite the environment anchor',
    delivered.anchorAfter === 'the ceremony clearing ringed by mated-pair trunks',
    delivered.anchorAfter);
  note('skeleton directive built against the same state object', delivered.sameObject);
  note('this scene is a live continuation (anchor deferred, not dropped)', delivered.liveContinuation);
  check('the anchor still reaches the author, deferred or as the first-sentence command',
    /SCENE ENVIRONMENT ANCHOR/.test(delivered.skeletonDirective),
    delivered.skeletonDirective.slice(0, 200));
  check('the anchor the author receives is the prior one, not a parser reading',
    /ceremony clearing ringed by mated-pair trunks/.test(delivered.skeletonDirective)
      && !/small ceramics stall/.test(delivered.skeletonDirective),
    (delivered.skeletonDirective.match(/SCENE ENVIRONMENT ANCHOR[^\n]*\n?[^\n]*/) || [''])[0]);

  // ── RED CONTROL: a SUPPLIED setting still mandates, so the boundary is not a blanket off ──
  const suppliedCase = await page.evaluate(([ev]) => {
    const s = window.state;
    s._sceneAssignment = { event: ev, setting: 'ceramics stall', participants: ['Lirael', 'Julian'],
      props: null, stateChange: null, source: 'plan-scene' };
    return window._buildSceneAssignmentBlock(s, 4);
  }, [EVENTS[4].plannedEvent]);
  check('RED CONTROL: a SUPPLIED setting still produces the REQUIRED SETTING mandate',
    /REQUIRED SETTING \(given — environment_anchor MUST be this place/.test(suppliedCase)
      && /ceramics stall/.test(suppliedCase),
    (suppliedCase.match(/REQUIRED SETTING[^\n]*/) || [''])[0]);
  check('…and a supplied setting is not labelled as a parser reading',
    !/text parser/.test(suppliedCase.split('\n').filter((l) => /SETTING/.test(l)).join(' ')),
    (suppliedCase.match(/[^\n]*SETTING[^\n]*/) || [''])[0]);

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('E — THE REAL PATH: SELECTOR → SKELETON GENERATION → OUTGOING BODY (FIXTURE-SERVED)');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // DELIVERY VERIFICATION ONLY. The skeleton generator's provider call is answered by a FIXTURE,
  // so this shows what the planning path DELIVERS and what the emitters then produce. It is NOT
  // evidence that the real planner would choose the right place — that is the planner's judgement
  // and no fixture can stand in for it.
  //
  // THE SAVED COUNTER IS NOT TOUCHED (corrected 2026-11-02). The previous version set
  // `s.turnCount = 4` so that it could ask for scene 4 — which made _currentSceneNumber answer 6
  // and manufactured the very scene-stamp disagreement it then reported. The checkpoint's own
  // counter is turnCount=2, and the scene it is about to build is _currentSceneNumber(state)=4.
  // That ONE value is the target-scene identity used everywhere below; nothing else is consulted.
  FIXTURE_ARMED = true;

  const identity = await page.evaluate(() => ({
    turnCount: window.state.turnCount,
    csn: window._currentSceneNumber ? window._currentSceneNumber(window.state) : null,
  }));
  note('the checkpoint\'s own counters', 'turnCount=' + identity.turnCount
    + '  _currentSceneNumber=' + identity.csn + '  (neither is modified by this suite)');
  check('the preserved counter is the run\'s own, unmodified', identity.turnCount === 2,
    String(identity.turnCount));
  check('and the scene it is about to build is 4, from that counter alone', identity.csn === 4,
    String(identity.csn));
  const SCENE = identity.csn;

  // ── THE RUN'S OWN CONFIGURATION: AUTHORED ROWS WITHHELD ──────────────────────────────
  // The previous version restored the checkpoint onto a default launch and got `plan-scene` with
  // an authored row, then reported the run's `issue-outline` ledger as an unexplained divergence.
  // It was not unexplained: run_2026-11-02T19-03-47 ran in FRESH-PLAN mode. Its own RUN.log line 2
  // reads "PRE-LAUNCH FRESH-PLAN: rows 20 → 0 · seed registered: true · funded spine: true", and
  // line 20 records a Sol-served scaffold of 40 rows with assignment source `issue-outline`.
  // So the withholding is REAPPLIED here, by the same existing mechanism the playthrough harness
  // uses (_nf_literary_playthrough.mjs → applyFreshPlanMode): STARTER_PLANS[id].scenes is emptied
  // and stashed, the SEED is left intact, and the saved generated scaffold is the one restored from
  // the checkpoint. Nothing is injected and nothing is invented.
  const withheld = await page.evaluate(() => {
    const s = window.state, id = s._starterId;
    const sp = (window.STARTER_PLANS || {})[id];
    const rowsBefore = (sp && Array.isArray(sp.scenes)) ? sp.scenes.length : 0;
    if (sp) { window.__withheldRows = sp.scenes; sp.scenes = []; }
    s._sceneAssignment = null;
    const sc = s.cgScaffold || null;
    return { rowsBefore, rowsNow: (sp && sp.scenes) ? sp.scenes.length : null,
      seedAlive: !!(typeof window._activeSeed === 'function' && window._activeSeed(s)),
      scaffoldPresent: !!sc,
      scaffoldRows: sc ? (sc.issueArcs || []).reduce((n, a) => n + ((a.sceneOutline || []).length), 0) : 0,
      issueScenesStillDeclared: (sp && sp.issueScenes) || null };
  });
  note('fresh-plan withholding reapplied', JSON.stringify(withheld));
  check('the authored rows are withheld, as the run had them', withheld.rowsBefore === 20
    && withheld.rowsNow === 0, JSON.stringify(withheld));
  check('the SEED canon is left intact', withheld.seedAlive === true, String(withheld.seedAlive));
  check('and the run\'s own generated scaffold is the one restored from the checkpoint',
    withheld.scaffoldPresent === true && withheld.scaffoldRows >= 20, JSON.stringify(withheld));

  const realPath = await page.evaluate(async ([sceneNum]) => {
    const s = window.state;
    // THE REAL SELECTOR on the restored checkpoint, in the run's own plan configuration. The
    // per-scene working fields are cleared so the selection is made fresh.
    s._sceneAssignment = null; s._spineStaging = null; s.sceneSkeleton = null; s._skeletonMeta = null;
    s._sceneLiveContinuation = false;
    const asg = window._selectSceneAssignment(s, sceneNum);
    s._sceneAssignment = asg;
    // WHAT THE OUTLINE RESOLVER HAS FOR THE SAME SCENE, independently of what the selector chose.
    let rio = null;
    try {
      const r = window._resolveIssueOutline(s, { sceneNumber: sceneNum, force: true });
      const row = (r && Array.isArray(r.scenes)) ? r.scenes.filter((x) => x && x.n === sceneNum)[0] : null;
      rio = row ? { accomplishes: String(row.accomplishes || ''), delivery: row.delivery, kind: row.kind } : null;
    } catch (_) { rio = null; }
    const eff = window._effectiveSceneRow ? window._effectiveSceneRow(s, sceneNum) : null;
    await window.__generateSceneSkeleton('I keep my hand on the cloth.', 'Then examine it here.',
      { sceneNumber: sceneNum });
    return {
      asg: asg && { event: asg.event, setting: asg.setting, inferred: !!asg._settingInferred,
        source: asg.source, participants: asg.participants,
        participantsInferred: !!asg._participantsInferred },
      rio,
      eff: eff && { goal: String(eff.goal || ''), withheld: (eff._reconciliation || {}).withheld || [] },
      skeleton: s.sceneSkeleton && { anchor: s.sceneSkeleton.environment_anchor,
        anchorFor: s.sceneSkeleton.environment_anchor_for,
        anchorTurn: s.sceneSkeleton.environment_anchor_turn,
        anchorSrc: s.sceneSkeleton.environment_anchor_src },
      turnCountAfter: s.turnCount,
      csnAfter: window._currentSceneNumber ? window._currentSceneNumber(s) : null,
      directiveFresh: window.buildSkeletonDirective(),
      // THE CARRIED CASE, by provenance alone: the same anchor text, stamped for the PREVIOUS
      // scene. The turn stamp is left MATCHING on purpose — if a matching secondary counter could
      // still rescue a disagreeing scene stamp, this case would come back mandatory.
      directiveCarried: (function () {
        s.sceneSkeleton = Object.assign({}, s.sceneSkeleton, {
          environment_anchor_for: sceneNum - 1, environment_anchor_turn: s.turnCount });
        return window.buildSkeletonDirective();
      })(),
    };
  }, [SCENE]);

  note('selector produced', JSON.stringify(realPath.asg));
  note('outline resolver, same scene', JSON.stringify(realPath.rio));
  note('fixture-served anchor', realPath.skeleton && realPath.skeleton.anchor);
  note('its recorded provenance', 'for scene ' + (realPath.skeleton && realPath.skeleton.anchorFor)
    + ', turn ' + (realPath.skeleton && realPath.skeleton.anchorTurn)
    + ', src=' + (realPath.skeleton && realPath.skeleton.anchorSrc));
  check('the saved counter is still unmodified after the real path ran',
    realPath.turnCountAfter === 2 && realPath.csnAfter === 4,
    'turnCount=' + realPath.turnCountAfter + ' csn=' + realPath.csnAfter);

  // ── THE BRANCH THE RUN ITSELF TOOK ───────────────────────────────────────────────────
  const LIVE_ROW = EVENTS[SCENE].plannedEvent;
  check('the real selector chooses the issue-outline row, as the run\'s ledger recorded',
    !!(realPath.asg && realPath.asg.source === 'issue-outline'),
    'source=' + (realPath.asg && realPath.asg.source));
  check('…and it is the run\'s OWN row for this scene, from the saved scaffold',
    !!(realPath.asg && realPath.asg.event === LIVE_ROW),
    'event=' + String(realPath.asg && realPath.asg.event).slice(0, 140));
  check('the withheld authored row did NOT supply the assignment',
    !!(realPath.asg && !/NOTICE AND RESTRICTION/.test(String(realPath.asg.event))),
    String(realPath.asg && realPath.asg.event).slice(0, 90));
  note('the run\'s own row for this scene', LIVE_ROW.slice(0, 150));
  check('the skeleton generator was actually called (fixture intercepted its body)',
    outgoingBodies.length >= 1, outgoingBodies.length + ' body/bodies captured');

  // THE OUTGOING BODY — what the planning path really sent, on whichever branch it took.
  const sentMsgs = ((outgoingBodies[0] || {}).messages || []).map((m) => String(m.content || '')).join('\n');
  check('the outgoing planner body carries the selector\'s own event sentence verbatim',
    !!(realPath.asg && realPath.asg.event) && sentMsgs.includes(realPath.asg.event),
    (sentMsgs.match(/ASSIGNED EVENT[^\n]{0,110}/) || [''])[0]);
  check('its setting is marked as a parse, not as given',
    realPath.asg && realPath.asg.inferred === true,
    'source=' + (realPath.asg && realPath.asg.source) + ' setting=' + (realPath.asg && realPath.asg.setting));
  check('the outgoing planner body contains NO "REQUIRED SETTING (given" mandate',
    !/REQUIRED SETTING \(given/.test(sentMsgs),
    (sentMsgs.match(/REQUIRED SETTING[^\n]{0,90}/) || [''])[0]);
  check('the outgoing planner body labels the parsed reading as possibly wrong',
    /read from the assigned event sentence above by a text parser, which may be wrong/i.test(sentMsgs),
    (sentMsgs.match(/[^\n]{0,40}text parser[^\n]{0,60}/) || [''])[0]);
  // AUTHORED participants ARE a presence requirement, and that must not regress. On this branch the
  // selector's participants are SCANNED (the outline row supplies none), so the authored case is
  // exercised against the emitter with a supplied list — forced, and labelled as forced.
  const authoredParts = await page.evaluate(([ev, sceneNum]) => {
    const s = window.state;
    const keep = s._sceneAssignment;
    s._sceneAssignment = { event: ev, setting: 'the ceremony clearing', _settingInferred: false,
      participants: ['Lirael', 'the presiding Dohkar'], _participantsInferred: false, props: null,
      stateChange: null, source: 'plan-scene' };
    const block = window._buildSceneAssignmentBlock(s, sceneNum);
    s._sceneAssignment = keep;
    return block;
  }, [LIVE_ROW, SCENE]);
  check('AUTHORED participants are still delivered as MUST BE PRESENT (forced: this branch scans them)',
    /MUST BE PRESENT/.test(authoredParts),
    (authoredParts.match(/[^\n]*(MUST BE PRESENT|NAMED IN THE EVENT)[^\n]*/) || [''])[0]);
  check('…and the scanned list the real selector produced is NOT delivered that way',
    realPath.asg && realPath.asg.participantsInferred === true && !/MUST BE PRESENT/.test(sentMsgs),
    'participantsInferred=' + (realPath.asg && realPath.asg.participantsInferred)
      + ' · ' + (sentMsgs.match(/[^\n]*(MUST BE PRESENT|NAMED IN THE EVENT SENTENCE)[^\n]*/) || [''])[0]);

  // AND A SCANNED MENTION MUST NOT BE ONE — exercised on the row the RUN used, whose sentence is
  // the one that produced the scene-4 contradiction, with its cast scanned out of the sentence.
  const scannedParts = await page.evaluate(([ev, sceneNum]) => {
    const s = window.state;
    const st = window._spineStagingFromEvent(ev, ['Lirael', 'Julian']);
    s._sceneAssignment = { event: ev, setting: st && st.setting, _settingInferred: true,
      participants: (st && st.cast) || ['Lirael', 'Julian'], _participantsInferred: true, props: null,
      stateChange: null, source: 'issue-outline' };
    return { block: window._buildSceneAssignmentBlock(s, sceneNum), parsed: st && st.setting,
      cast: st && st.cast };
  }, [LIVE_ROW, SCENE]);
  note('the parser\'s reading of the run\'s own sentence', JSON.stringify(scannedParts.parsed)
    + '  cast=' + JSON.stringify(scannedParts.cast));
  check('an INFERRED participant list is NOT delivered as MUST BE PRESENT',
    !/MUST BE PRESENT/.test(scannedParts.block)
      && /NAMED IN THE EVENT SENTENCE \(scanned by the text parser/.test(scannedParts.block),
    (scannedParts.block.match(/[^\n]*(MUST BE PRESENT|NAMED IN THE EVENT)[^\n]*/) || [''])[0]);
  check('…and that line says a mention is not a presence requirement',
    /a MENTION, which is NOT a[\s\S]{0,12}presence requirement/.test(scannedParts.block),
    (scannedParts.block.match(/NAMED IN THE EVENT SENTENCE[^\n]*/) || [''])[0]);
  check('the run\'s own sentence reaches the block whole, stall clause included',
    scannedParts.block.includes(LIVE_ROW), 'the assigned event sentence was not delivered whole');

  // THE ANCHOR'S AUTHORITY, BY PROVENANCE — ONE IDENTITY.
  check('an anchor produced FOR this scene is still the mandatory opening command',
    /SCENE ENVIRONMENT ANCHOR:\s*\nThe scene must begin from/.test(realPath.directiveFresh),
    (realPath.directiveFresh.match(/SCENE ENVIRONMENT ANCHOR[^\n]*/) || [''])[0]);
  check('a CARRIED anchor is demoted even though its TURN stamp matches',
    /SCENE ENVIRONMENT ANCHOR \(CARRIED OVER/.test(realPath.directiveCarried)
      && !/The scene must begin from/.test(realPath.directiveCarried),
    (realPath.directiveCarried.match(/SCENE ENVIRONMENT ANCHOR[^\n]*/) || [''])[0]);
  check('…and the carried line says it is not this scene\'s location',
    /do NOT treat it as this scene's location/.test(realPath.directiveCarried),
    (realPath.directiveCarried.match(/SCENE ENVIRONMENT ANCHOR[^\n]*/) || [''])[0]);
  check('the carried anchor\'s TEXT is unchanged — the parser did not replace it',
    realPath.directiveCarried.includes('ceremony clearing ringed by mated-pair trunks')
      && !/small ceramics stall/.test(realPath.directiveCarried), 'anchor text altered');
  // ── RED CONTROL: the old emitter mandated a carried anchor ──
  const oldEmitter = (sk, live) => live
    ? 'DEFERRED'
    : 'SCENE ENVIRONMENT ANCHOR:\nThe scene must begin from this physical object or phenomenon: ' + sk;
  check('RED CONTROL: the old emitter issued the mandate regardless of provenance',
    /The scene must begin from/.test(oldEmitter(SKEL_FIXTURE.environment_anchor, false)), 'n/a');
  // ── RED CONTROL: the turn-count rescue this version removed ──
  const dualIdentity = (anchorFor, anchorTurn, csn, turnCount) =>
    !((anchorFor != null && csn != null && Number(csn) === anchorFor)
      || (anchorTurn != null && turnCount != null && Number(turnCount) === anchorTurn));
  check('RED CONTROL: the either-identity version called this carried anchor FRESH',
    dualIdentity(SCENE - 1, 2, 4, 2) === false,
    'the removed rule would have treated an anchor made for scene ' + (SCENE - 1) + ' as current');

  FIXTURE_ARMED = false;
  const restored = await page.evaluate(() => {
    const sp = (window.STARTER_PLANS || {})[window.state._starterId];
    if (sp && Array.isArray(window.__withheldRows)) sp.scenes = window.__withheldRows;
    return (sp && sp.scenes) ? sp.scenes.length : null;
  });
  check('the withheld authored rows are put back when the section ends', restored === 20,
    String(restored));

  section('SCOPE AND PROVIDER-BLOCKED ATTESTATION');
  note('exercised', 'window.usableDialogue / usableAction / callNormalizationLayer / '
    + '_normStoryCastNames / _normPermittedSubstitutions / _spineStagingFromEvent / '
    + '_buildSceneAssignmentBlock / buildSkeletonDirective / STARTER_SEEDS, plus the real '
    + 'api/chatgpt-proxy.js handler required in-process');
  note('section A2\'s stub', 'the proxy handler runs here with globalThis.fetch REPLACED, so the '
    + 'upstream OpenAI request is captured and answered from a fixture. The 4 captured calls were '
    + 'never dispatched — no socket was opened and OPENAI_API_KEY was a stub string — and fetch '
    + 'and the environment are restored in a finally block.');
  note('NOT done', 'no story launched and no full AUTHOR request assembled. Section E runs the '
    + 'real planning path with the generator answered by a FIXTURE, so it is DELIVERY '
    + 'VERIFICATION: it shows what the path hands the planner and what the emitters produce. It '
    + 'is NOT evidence that the real planner would choose the right place.');
  note('/api/** attempted', apiAttempts + ' (aborted ' + apiAborted + ', fixture-served ' + apiFixtured + ')');
  check('every /api request was either aborted or fixture-served — nothing left this machine',
    apiAttempts === apiAborted + apiFixtured,
    apiAttempts + ' attempted / ' + apiAborted + ' aborted / ' + apiFixtured + ' fixture');
} finally {
  await browser.close();
}

line('');
line('='.repeat(88));
line('  PASS ' + PASS + ' · FAIL ' + FAIL + ' · INCONCLUSIVE ' + INCONCLUSIVE);
for (const f of FAILURES) line('    FAILED: ' + f);
for (const i of INCONCLUSIVES) line('    INCONCLUSIVE: ' + i);
line('  These are the tested cases. They are not a statement about untested paths.');
line('='.repeat(88));
process.exit(FAIL ? 1 : 0);
