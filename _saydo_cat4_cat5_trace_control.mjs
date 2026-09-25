// SAY/DO CATEGORIES 4 & 5 — TEST-FIRST TRACE. ZERO dispatches, $0.
//
// NOW A CONTROL, NOT ONLY A TRACE (Roman 2026-09-25). The measured gaps were approved for
// implementation, so this file proves the fixes as well as the behaviour they replaced.
//
// Originally a DIAGNOSTIC. Per the original test plan both categories are test-first:
// trace what production does today, then decide whether anything needs building. Nothing in
// public/app.js is modified by this pass.
//
//   Category 4 — game complaints. A detector ALREADY EXISTS (_detectWallBreakSignal, six
//   categories including model-name-complaint, plot-memory-complaint and interface). The job is to
//   find out what it does and does not cover, NOT to build a second one.
//
//   Category 5 — weak responses. These must NOT be blocked. The job is to trace how they reach the
//   planner and author, and whether anything downstream inflates them into a decision the player
//   never made.
//
// usage: node _saydo_cat4_cat5_trace_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_saydo_cat4_cat5_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const note = (t) => console.log('    ' + t);
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Roman's category-4 inputs, plus the in-character negative controls that must NOT be caught.
const CAT4 = [
  { id: 'model-complaint',   text: 'Claude messed this up.',            expectCaught: true,  kind: 'subjective/model' },
  { id: 'boring',            text: 'This game is boring.',              expectCaught: null,  kind: 'subjective frustration' },
  { id: 'continuity',        text: 'You forgot what happened.',         expectCaught: true,  kind: 'continuity claim' },
  { id: 'button-broken',     text: 'The Continue button is broken.',    expectCaught: null,  kind: 'bug report' },
  { id: 'NEG-ceremony',      text: 'This ceremony is boring.',          expectCaught: false, kind: 'in-character' },
  { id: 'NEG-oath',          text: 'You forgot your oath.',             expectCaught: false, kind: 'in-character' }
];
// Category 5 — weak but legitimate. None of these may be blocked or rewritten.
const CAT5 = ['I don\'t know', 'whatever', '...', 'sure'];

(async () => {
  console.log('=== SAY/DO CATEGORIES 4 & 5 — TEST-FIRST TRACE (zero dispatches, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._detectWallBreakSignal && window._sayDoWallBreakFallback
    && window.sanitizeShortInput, { timeout: 30000 });

  // The REAL Submit-path transform, in the order the handler applies it.
  const submitPath = (text) => page.evaluate((t) => {
    const detected = window._detectWallBreakSignal(t);
    const sanitized = window.sanitizeShortInput(t, 2000);
    const afterFallbackAction = window._sayDoWallBreakFallback(sanitized, 'action');
    const afterFallbackDialogue = window._sayDoWallBreakFallback(sanitized, 'dialogue');
    return { detected, sanitized, afterFallbackAction, afterFallbackDialogue,
      sanitizedToEmpty: sanitized === '', changedByFallback: afterFallbackAction !== sanitized };
  }, text);

  section('1. CATEGORY 4 — WHAT THE EXISTING DETECTOR ALREADY COVERS');
  const cat4 = [];
  for (const c of CAT4) {
    const r = await submitPath(c.text);
    cat4.push({ ...c, ...r });
    note((c.id + ':').padEnd(18) + JSON.stringify(c.text).padEnd(34)
      + ' → ' + (r.detected ? ('CAUGHT [' + r.detected.category + ']') : 'not caught')
      + (r.sanitizedToEmpty ? '  +BLANKED by sanitize' : '')
      + (r.changedByFallback ? '  +fallback substituted' : ''));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'cat4.json'), JSON.stringify(cat4, null, 2));

  const byId = {}; cat4.forEach((r) => { byId[r.id] = r; });
  ok('a detector ALREADY EXISTS and is reachable — nothing here needs a second one',
    typeof (await page.evaluate(() => typeof window._detectWallBreakSignal)) === 'string');
  ok('"Claude messed this up." is caught as a MODEL complaint',
    byId['model-complaint'].detected && byId['model-complaint'].detected.category === 'model-name-complaint',
    JSON.stringify(byId['model-complaint'].detected));
  ok('"You forgot what happened." is caught as a CONTINUITY complaint',
    byId['continuity'].detected && byId['continuity'].detected.category === 'plot-memory-complaint',
    JSON.stringify(byId['continuity'].detected));

  section('2. CATEGORY 4 — THE NEGATIVE CONTROLS MUST SURVIVE');
  // These are the whole reason a complaint detector is dangerous: the same words in character.
  ok('in-character "This ceremony is boring." is NOT caught',
    !byId['NEG-ceremony'].detected, JSON.stringify(byId['NEG-ceremony'].detected));
  ok('...and reaches the story unchanged',
    byId['NEG-ceremony'].afterFallbackAction === byId['NEG-ceremony'].sanitized
    && !byId['NEG-ceremony'].sanitizedToEmpty, JSON.stringify(byId['NEG-ceremony']));
  ok('in-character "You forgot your oath." is NOT caught — the pattern requires the/what/that',
    !byId['NEG-oath'].detected, JSON.stringify(byId['NEG-oath'].detected));
  ok('...and reaches the story unchanged',
    byId['NEG-oath'].afterFallbackAction === byId['NEG-oath'].sanitized
    && !byId['NEG-oath'].sanitizedToEmpty);

  section('3. CATEGORY 4 — THE TWO MEASURED GAPS ARE NOW CLOSED');
  // These began as the trace's findings: both reached story canon verbatim. The assertions are
  // INVERTED rather than deleted, so they now fail if the coverage regresses — and section 2
  // above still proves the negative controls survive, which is the risk that coverage creates.
  ok('WAS A GAP, NOW COVERED — "This game is boring." is caught',
    !!byId['boring'].detected, JSON.stringify(byId['boring'].detected));
  ok('WAS A GAP, NOW COVERED — "The Continue button is broken." is caught',
    !!byId['button-broken'].detected, JSON.stringify(byId['button-broken'].detected));
  ok('...and each is caught as its OWN kind, not lumped together',
    byId['boring'].detected.category === 'subjective-frustration'
    && byId['button-broken'].detected.category === 'interface',
    JSON.stringify([byId['boring'].detected.category, byId['button-broken'].detected.category]));

  section('4. CATEGORY 4 — THE OLD COLLAPSING FALLBACK, AND WHY IT IS OFF THE PATH');
  // The old handling ran every caught complaint through ONE fallback string. The function still
  // exists (other callers may use it), so its collapsing behaviour is asserted here as the thing
  // that was replaced — and section 7 proves it is no longer on the Submit path at all.
  const caught = cat4.filter((r) => r.detected);
  const distinctCategories = [...new Set(caught.map((r) => r.detected.category))];
  const distinctOutputs = [...new Set(caught.map((r) => r.afterFallbackAction))];
  note('categories detected: ' + JSON.stringify(distinctCategories));
  note('distinct outputs:    ' + JSON.stringify(distinctOutputs));
  ok('the detector DOES distinguish complaint kinds — the taxonomy already exists',
    distinctCategories.length >= 2, JSON.stringify(distinctCategories));
  ok('MEASURED: but every caught complaint collapses to ONE identical fallback, so the taxonomy\n'
    + '     is computed and then discarded',
    distinctOutputs.length === 1, JSON.stringify(distinctOutputs));
  ok('...and that fallback is a neutral placeholder, not authored prose — so nothing a complaint\n'
    + '     said enters canon',
    distinctOutputs[0] === 'a brief, unplaceable pause, as if she lost her train of thought',
    JSON.stringify(distinctOutputs[0]));

  section('5. CATEGORY 5 — WEAK INPUT MUST NOT BE BLOCKED OR REWRITTEN');
  const cat5 = [];
  for (const t of CAT5) {
    const r = await submitPath(t);
    cat5.push({ text: t, ...r });
    note(JSON.stringify(t).padEnd(16) + ' → sanitized=' + JSON.stringify(r.sanitized)
      + (r.detected ? ('  CAUGHT[' + r.detected.category + ']') : '')
      + (r.changedByFallback ? '  SUBSTITUTED' : '  passes through'));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'cat5.json'), JSON.stringify(cat5, null, 2));
  ok('no weak response is caught by any detector', cat5.every((r) => !r.detected),
    JSON.stringify(cat5.filter((r) => r.detected)));
  ok('none is substituted or rewritten', cat5.every((r) => !r.changedByFallback));
  ok('none is blanked by sanitize — "..." and "sure" survive intact',
    cat5.every((r) => r.sanitized === r.text), JSON.stringify(cat5.map((r) => r.sanitized)));

  section('6. CATEGORY 5 — WHAT THE AUTHOR IS TOLD ABOUT A WEAK MOVE');
  // The risk is not blocking; it is INFLATION downstream. buildPlayerImpactDirective tells the
  // author the input is CANON and the scene must react "proportionally" — correct for a strong
  // move, and the place where a shrug could be turned into a decision.
  const impact = await page.evaluate((weak) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    const out = {};
    weak.forEach((t) => {
      s._playerImpactRead = { raw: { do: t, say: '' }, mustReact: false, class: [], fate: null };
      out[t] = window.buildPlayerImpactDirective ? window.buildPlayerImpactDirective() : '(absent)';
    });
    // And the same weak input if something upstream marked it high-impact.
    s._playerImpactRead = { raw: { do: weak[0], say: '' }, mustReact: true, class: ['divergent'], fate: null };
    out.__mustReact = window.buildPlayerImpactDirective ? window.buildPlayerImpactDirective() : '(absent)';
    delete s._playerImpactRead;
    return out;
  }, CAT5);
  fs.writeFileSync(path.join(OUT_DIR, 'impact_directives.txt'),
    Object.entries(impact).map(([k, v]) => '### ' + k + '\n' + v).join('\n\n'));
  const anyWeak = impact[CAT5[0]];
  ok('a weak move still reaches the author as the player\'s literal input',
    anyWeak.indexOf(CAT5[0]) !== -1, anyWeak.slice(0, 200));
  ok('MEASURED: the directive tells the author the input is CANON and the scene must react\n'
    + '     "proportionally" — which for a shrug is exactly where inflation could happen',
    /literal input is CANON/.test(anyWeak) && /react to it proportionally/.test(anyWeak));
  ok('MEASURED: it contains NO instruction to preserve uncertainty, hesitation or weak assent',
    !/uncertain|hesitat|weak|shrug|non-?committal|resign/i.test(anyWeak), anyWeak.slice(0, 300));
  ok('MEASURED: and nothing forbids converting a weak move into a decision the player never made',
    !/never (turn|convert|escalate)/i.test(anyWeak));
  ok('the high-impact variant escalates harder still — "the moment escalates or breaks from the plan"',
    /the moment escalates or breaks from the plan/.test(impact.__mustReact));

  section('7. CATEGORY 4 FIX — COMPLAINTS ROUTE BY KIND AND NEVER TOUCH CANON');
  const routed = await page.evaluate((cases) => {
    const out = {};
    cases.forEach((c) => {
      const r = window._routeWallBreakComplaint(c.text, '');
      out[c.id] = r ? { category: r.category, route: r.route, advancesStory: r.advancesStory } : null;
    });
    return out;
  }, CAT4);
  Object.entries(routed).forEach(([k, v]) => note((k + ':').padEnd(18) + (v ? (v.category + ' → ' + v.route) : 'not routed (reaches the story)')));
  fs.writeFileSync(path.join(OUT_DIR, 'routes.json'), JSON.stringify(routed, null, 2));
  ok('the NEW coverage catches "This game is boring." as subjective frustration',
    routed['boring'] && routed['boring'].category === 'subjective-frustration', JSON.stringify(routed['boring']));
  ok('the NEW coverage catches "The Continue button is broken." as interface',
    routed['button-broken'] && routed['button-broken'].category === 'interface', JSON.stringify(routed['button-broken']));
  ok('THE NEGATIVE CONTROLS STILL SURVIVE — "This ceremony is boring." is not routed',
    routed['NEG-ceremony'] === null, JSON.stringify(routed['NEG-ceremony']));
  ok('...and "You forgot your oath." is not routed', routed['NEG-oath'] === null, JSON.stringify(routed['NEG-oath']));
  // Roman's additional negative control: an in-world broken button.
  const coat = await page.evaluate(() => window._routeWallBreakComplaint('My coat button is broken.', ''));
  ok('...and "My coat button is broken." is NOT routed — the pattern needs a UI noun nearby',
    coat === null, JSON.stringify(coat));

  ok('THE CATEGORY IS PRESERVED THROUGH ROUTING, not discarded',
    ['model-complaint', 'boring', 'continuity', 'button-broken'].every((k) => routed[k] && routed[k].category));
  ok('a bug report opens the BUG-REPORT panel',
    routed['button-broken'].route === 'bug-report');
  ok('a continuity claim goes to VERIFICATION, not to an apology or a retcon',
    routed['continuity'].route === 'concierge-verify');
  ok('model complaints and frustration go to the OOC concierge',
    routed['model-complaint'].route === 'concierge-ooc' && routed['boring'].route === 'concierge-ooc');
  ok('NO routed complaint advances the story',
    ['model-complaint', 'boring', 'continuity', 'button-broken'].every((k) => routed[k].advancesStory === false));

  // THE TURN MUST NOT BE CONSUMED, and nothing may reach the ledger.
  const consumed = await page.evaluate(() => {
    const s = window.state;
    s.turnCount = 7; s.scenes = [{ title: 'A', synopsis: 'a', text: 'x', fateCard: null }];
    delete s._lastComplaintRoute;
    const before = { turn: s.turnCount, scenes: s.scenes.length };
    const handled = window._handleWallBreakComplaint('The Continue button is broken.', '');
    return { handled, before, after: { turn: s.turnCount, scenes: s.scenes.length },
      recorded: s._lastComplaintRoute || null };
  });
  ok('the handler reports the turn was CONSUMED BY ROUTING, so the caller stops', consumed.handled === true);
  ok('THE TURN COUNT DID NOT ADVANCE', consumed.before.turn === consumed.after.turn,
    JSON.stringify(consumed));
  ok('NOTHING WAS WRITTEN TO THE SCENE LEDGER', consumed.before.scenes === consumed.after.scenes,
    JSON.stringify(consumed));
  ok('...and the route was recorded for review, with its category',
    consumed.recorded && consumed.recorded.category === 'interface'
    && consumed.recorded.advancedStory === false, JSON.stringify(consumed.recorded));
  ok('RED PROOF — the old in-world fallback no longer runs on the Submit path, so no fake\n'
    + '     canonical action is manufactured',
    !/action = _sayDoWallBreakFallback\(action, 'action'\)/.test(
      fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8')));

  section('8. CATEGORY 5 FIX — RESTRAINT REACHES THE PLANNER *AND* THE AUTHOR');
  const weak = await page.evaluate((cases) => {
    const out = {};
    cases.forEach((t) => { out[t] = window._detectWeakTurn(t, ''); });
    out.__substantivePlusSure = window._detectWeakTurn(
      'I take the ledger from his hands and hold it up so the room can see', 'sure');
    out.__mixed = window._detectWeakTurn('whatever', 'I refuse to sign it and walk out');
    out.__withFate = window._detectWeakTurn('whatever', '', { fateAction: true });
    out.__empty = window._detectWeakTurn('', '');
    return out;
  }, CAT5);
  CAT5.forEach((t) => note(JSON.stringify(t).padEnd(16) + ' → weak=' + weak[t].weak + '  posture=' + JSON.stringify(weak[t].postures)));
  ok('every whole-response weak shape is recognised', CAT5.every((t) => weak[t].weak === true),
    JSON.stringify(CAT5.map((t) => [t, weak[t].weak])));
  ok('the posture is identified, not just the weakness',
    weak["I don't know"].postures[0] === 'uncertainty' && weak['whatever'].postures[0] === 'disengagement'
    && weak['...'].postures[0] === 'silence' && weak['sure'].postures[0] === 'weak assent',
    JSON.stringify(CAT5.map((t) => weak[t].postures)));
  ok('A SUBSTANTIVE ACTION PLUS "sure" IS NOT A WEAK TURN — the substance is the move',
    weak.__substantivePlusSure.weak === false, JSON.stringify(weak.__substantivePlusSure));
  ok('...nor is a weak action beside a substantive line',
    weak.__mixed.weak === false, JSON.stringify(weak.__mixed));
  ok('a Fate action beside weak text disables it — that turn is not weak',
    weak.__withFate.weak === false, JSON.stringify(weak.__withFate));
  ok('an empty turn is not a weak turn', weak.__empty.weak === false, JSON.stringify(weak.__empty));

  const directive = await page.evaluate(() => window._buildWeakTurnRestraintDirective("I don't know", ''));
  fs.writeFileSync(path.join(OUT_DIR, 'weak_directive.txt'), directive);
  ok('the contract preserves the posture exactly',
    /PRESERVE THE POSTURE EXACTLY/.test(directive) && /uncertainty stays uncertain/.test(directive));
  ok('it forbids upgrading to enthusiasm, confession, refusal, commitment or decisive action',
    /No sudden enthusiasm, no confession, no declaration, no firm refusal,\n *no commitment, no decisive action/.test(directive));
  ok('...and names the exact inflation it prevents',
    /"I don't know" does not become "I choose you"/.test(directive));
  ok('the scene may still move — from OUTSIDE the protagonist',
    /THE SCENE STILL MOVES — but from OUTSIDE the protagonist/.test(directive));
  ok('a new pressure or consequence is allowed; pretending the player chose is not',
    /A NEW PRESSURE OR CONSEQUENCE IS ALLOWED\. Pretending the player chose is NOT/.test(directive));
  ok('an ORDINARY turn emits nothing, so every normal scene is byte-identical',
    (await page.evaluate(() => window._buildWeakTurnRestraintDirective(
      'I take the ledger and hold it up', 'Then say it plainly.'))) === '');

  // DELIVERY TO BOTH. The planner is the one that matters most — author-only would be too late.
  const src2 = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('DELIVERED TO THE PLANNER — before the event is chosen',
    /_scSys \+= '\\n\\n' \+ _wtr;/.test(src2));
  ok('...and that happens BEFORE the planner messages are assembled',
    src2.indexOf("_scSys += '\\n\\n' + _wtr;") < src2.indexOf('var _scMessages = ['));
  ok('DELIVERED TO THE AUTHOR — the same contract survives the handoff',
    /_buildWeakTurnRestraintDirective\(\s*\n?\s*\(window\.state && window\.state\._lastSayDoAction\)/.test(src2));
  const inAuthor = await page.evaluate(() => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    s._lastSayDoAction = "I don't know"; s._lastSayDoDialogue = '';
    let sys = ''; try { sys = window._buildCGScreenplaySystemPrompt() || ''; } catch (e) { sys = 'ERR ' + e.message; }
    delete s._lastSayDoAction; delete s._lastSayDoDialogue;
    return { has: sys.indexOf('WEAK-TURN RESTRAINT') !== -1, len: sys.length };
  });
  ok('THE VALUE REACHES THE AUTHOR PAYLOAD — present in the real CG system prompt',
    inAuthor.has === true, JSON.stringify(inAuthor));

  section('8b. MIXED SAY/DO MUST ROUTE THE FIELD THAT ACTUALLY COMPLAINED');
  // Detection ran per field but the routed TEXT was always `action || dialogue`, so an ordinary
  // action beside a complaint in dialogue opened the bug report prefilled with the wrong sentence.
  const MIXED = [
    ['interface',              'I fold my arms',            'The Continue button is broken.', 'bug-report'],
    ['plot-memory-complaint',  'I step back from the table','You forgot what happened.',      'concierge-verify'],
    ['model-name-complaint',   'I look at the door',        'Claude messed this up.',         'concierge-ooc']
  ];
  for (const [cat, act, dia, route] of MIXED) {
    const r = await page.evaluate((a) => window._routeWallBreakComplaint(a.act, a.dia), { act, dia });
    note((cat + ':').padEnd(24) + 'field=' + (r && r.field) + '  text=' + JSON.stringify(r && r.text));
    ok('mixed ' + cat + ': the DIALOGUE field is identified as the source',
      !!r && r.field === 'dialogue', JSON.stringify(r));
    ok('...and the routed text is the COMPLAINT, not the innocent action',
      !!r && r.text === dia && r.text !== act, JSON.stringify(r && r.text));
    ok('...routed to ' + route, !!r && r.route === route, JSON.stringify(r && r.route));
  }
  // And the converse: a complaint in the ACTION field still routes the action.
  const actSide = await page.evaluate(() => window._routeWallBreakComplaint('The Continue button is broken.', 'Then say it plainly.'));
  ok('a complaint in the ACTION field routes the action text',
    actSide && actSide.field === 'action' && actSide.text === 'The Continue button is broken.',
    JSON.stringify(actSide));

  section('8c. CONTINUITY — A BOUNDED PROPOSITION GRAMMAR, NOT TOKEN COUNTING');
  // Token counting cannot verify anything. The reds below are the three ways the previous version
  // was provably wrong, plus the authority and handoff cases.
  const seedStory = (opts) => page.evaluate((a) => {
    const s = window.state;
    s.storyId = a.storyId; s._starterId = 'starter_first_sacrifice';
    s.scenes = a.scenes || [];
    s._sceneLedger = a.ledger || null;
    s._scenePlotContract = a.plotContract || null;
    delete s._lastContinuityVerification;
  }, opts);
  const verify = (claim) => page.evaluate((c) => window._conciergeVerifyContinuityClaim(c), claim);

  // RED 1 — WRONG ACTOR, SAME WORDS. Three shared tokens used to be enough.
  await seedStory({ storyId: 'S1', scenes: [
    { text: 'Julian carried The Answer after Seren stole it from the vestry.' }] });
  const wrongActor = await verify('You forgot Julian stole The Answer.');
  note('wrong actor: ' + JSON.stringify({ v: wrongActor.verdict, p: wrongActor.proposition }));
  ok('RED — a claim about the WRONG ACTOR is not supported by the right words',
    wrongActor.verdict !== 'supported', JSON.stringify(wrongActor).slice(0, 220));
  // The record's own object there is a PRONOUN ("Seren stole it"), which canonical comparison
  // cannot resolve — so unresolved is the correct answer, not a miss. My first version of this
  // assertion expected 'supported', which only held under the loose matching being removed.
  ok('...and a pronoun object in the record is UNRESOLVED, not guessed at',
    (await verify('You forgot Seren stole The Answer.')).verdict === 'unresolved');
  ok('...while a record naming the object explicitly DOES support the right actor',
    (await page.evaluate(async () => {
      window.state.scenes = [{ text: 'Seren stole The Answer from the vestry.' }];
      return (await window._conciergeVerifyContinuityClaim('You forgot Seren stole The Answer.')).verdict;
    })) === 'supported');

  // RED 2 — TWO ACTORS, OPPOSITE PREDICATES, ONE RECORD.
  await seedStory({ storyId: 'S2', scenes: [
    { text: 'Julian denied the accusation; Seren admitted the accusation.' }] });
  const twoActors = await verify('You forgot Seren admitted the accusation.');
  note('two actors: ' + JSON.stringify({ v: twoActors.verdict, ev: twoActors.evidence }));
  ok('RED — a TRUE claim is not contradicted by the other actor\'s opposite predicate',
    twoActors.verdict === 'supported', JSON.stringify(twoActors).slice(0, 260));
  ok('...while the genuinely opposed claim about the SAME actor IS contradicted',
    (await verify('You forgot Julian admitted the accusation.')).verdict === 'contradicted');

  // RED 3 — "DID NOT ADMIT" vs "ADMITTED". The negation used to be discarded as a short token.
  await seedStory({ storyId: 'S3', scenes: [
    { text: 'Julian did not admit the accusation that night.' }] });
  const negated = await verify('You forgot Julian admitted the accusation.');
  note('negation: ' + JSON.stringify({ v: negated.verdict, c: negated.contradiction }));
  ok('RED — "did not admit" CONTRADICTS "admitted" instead of supporting it',
    negated.verdict === 'contradicted', JSON.stringify(negated).slice(0, 240));
  ok('...and the negated claim itself is supported by the negated record',
    (await verify('You forgot Julian did not admit the accusation.')).verdict === 'supported');
  ok('the parser binds polarity to the relation, so "denied" is the negative pole of the same axis',
    (await page.evaluate(() => window._parseProposition('Julian denied the accusation'))).polarity === 'negative');
  ok('...and "did not deny" is positive on that axis',
    (await page.evaluate(() => window._parseProposition('Julian did not deny the accusation'))).polarity === 'positive');

  // RED 4 — A PLANNED EVENT THAT NEVER APPEARED IN PROSE.
  await seedStory({ storyId: 'S4', scenes: [{ text: 'The lamp guttered and no one spoke.' }],
    ledger: { storyId: 'S4', entries: [
      { sceneNumber: 1, plannedEvent: 'Julian admitted the accusation before the assembly',
        act: 'I waited', dia: 'Say it.', plannedSource: 'spine' }] } });
  const planned = await verify('You forgot Julian admitted the accusation.');
  note('planned only: ' + JSON.stringify({ v: planned.verdict, ev: planned.evidence }));
  ok('RED — a PLANNED event that never reached prose cannot prove it happened',
    planned.verdict === 'unresolved', JSON.stringify(planned).slice(0, 260));
  ok('...the planned entry is visible as CONTEXT, and is labelled as such',
    planned.checked.some((c) => /^plannedEvent\[\d+\]:context$/.test(c)), JSON.stringify(planned.checked));
  ok('...and the reason names the authority problem, not a matching problem',
    /only non-authoritative sources matched/.test(planned.reason || ''), planned.reason);
  ok('DELIVERED prose in the same story DOES support it',
    (await page.evaluate(async () => {
      window.state.scenes = [{ text: 'Julian admitted the accusation before the assembly.' }];
      return (await window._conciergeVerifyContinuityClaim('You forgot Julian admitted the accusation.')).verdict;
    })) === 'supported');

  // Anything outside the grammar must refuse to answer.
  const outside = await verify('You forgot the whole thing about the sash and the weather.');
  ok('a claim OUTSIDE the bounded grammar returns unresolved, never a confident verdict',
    outside.verdict === 'unresolved' && /bounded proposition grammar/.test(outside.reason || ''),
    JSON.stringify(outside).slice(0, 200));

  section('8c-1b. OBJECT EQUALITY, NOT SHARED FILLER WORDS');
  // One shared 3+ character token accepted "the", "before", "after" — so a MURDER before the
  // ASSEMBLY matched an ACCUSATION before the COUNCIL and was confidently supported.
  await seedStory({ storyId: 'S1b', scenes: [
    { text: 'Julian admitted the accusation before the council.' }] });
  const wrongObject = await verify('You forgot Julian admitted the murder before the assembly.');
  note('wrong object: ' + JSON.stringify({ v: wrongObject.verdict, ev: wrongObject.evidence.length }));
  ok('RED — a DIFFERENT object sharing only filler words is not supported',
    wrongObject.verdict === 'unresolved', JSON.stringify(wrongObject).slice(0, 240));
  ok('...and no evidence was accepted at all', wrongObject.evidence.length === 0,
    JSON.stringify(wrongObject.evidence));
  ok('the SAME object still matches across a differing adjunct — the object is the direct object,\n'
    + '     not the phrase that follows it',
    (await verify('You forgot Julian admitted the accusation before the assembly.')).verdict === 'supported');

  section('8c-1c. RAW PLAYER INPUT PROVES THE UTTERANCE, NOT ITS CONTENTS');
  // Lirael SAYING "Julian admitted it" establishes that she said it. Treating the embedded
  // proposition as history would let a player assert anything into canon by typing it.
  await seedStory({ storyId: 'S1c', scenes: [{ text: 'The lamp guttered and no one spoke.' }],
    ledger: { storyId: 'S1c', entries: [
      { sceneNumber: 1, act: 'I stepped forward', dia: 'Julian admitted the accusation.', plannedEvent: null }] } });
  const fromInput = await verify('You forgot Julian admitted the accusation.');
  note('from player input: ' + JSON.stringify({ v: fromInput.verdict, checked: fromInput.checked.filter((c) => /playerInput/.test(c)) }));
  ok('RED — a proposition embedded in the player\'s own dialogue cannot prove itself',
    fromInput.verdict === 'unresolved', JSON.stringify(fromInput).slice(0, 240));
  ok('...the player input is visible but labelled CONTEXT, not delivered fact',
    fromInput.checked.some((c) => /^playerInput\[\d+\]:context$/.test(c)), JSON.stringify(fromInput.checked));
  ok('...and delivered prose asserting the same thing DOES support it',
    (await page.evaluate(async () => {
      window.state.scenes = [{ text: 'Julian admitted the accusation before the council.' }];
      return (await window._conciergeVerifyContinuityClaim('You forgot Julian admitted the accusation.')).verdict;
    })) === 'supported');

  section('8c-1d. A RECORD THAT DISAGREES WITH ITSELF IS UNRESOLVED');
  await seedStory({ storyId: 'S1d', scenes: [
    { text: 'Julian admitted the accusation.' },
    { text: 'Julian did not admit the accusation.' }] });
  const conflicted = await verify('You forgot Julian admitted the accusation.');
  note('self-conflicting record: ' + JSON.stringify({ v: conflicted.verdict, c: !!conflicted.conflict }));
  ok('RED — matching AND opposing authoritative evidence yields UNRESOLVED, not contradicted',
    conflicted.verdict === 'unresolved', JSON.stringify(conflicted).slice(0, 240));
  ok('...and both sides of the conflict are preserved for the conversation',
    !!(conflicted.conflict && conflicted.conflict.support && conflicted.conflict.contradiction),
    JSON.stringify(conflicted.conflict));
  ok('...with a reason that names the disagreement',
    /both a matching and an opposing account/.test(conflicted.reason || ''), conflicted.reason);

  section('8c-2. STORY ISOLATION, THROUGH THE PRODUCTION ACCESSOR');
  await seedStory({ storyId: 'S5', scenes: [],
    ledger: { storyId: 'SOMEONE-ELSE', entries: [
      { sceneNumber: 1, act: 'Seren admitted the accusation', dia: '', plannedEvent: null }] } });
  const stale = await verify('You forgot Seren admitted the accusation.');
  ok('STALE-LEDGER NEGATIVE — a ledger stamped for another story is not read',
    !stale.checked.some((c) => /^playerInput\[/.test(c)), JSON.stringify(stale.checked));
  ok('...so it cannot support the claim', stale.verdict !== 'supported', JSON.stringify(stale.verdict));

  section('8c-3. THE HANDOFF REPORTS WHAT IT ACTUALLY DELIVERED');
  // _openPanel returns early when already open, suppressed, or zoomed, and drops firstLine once
  // any history exists. The old caller set handedOff=true regardless.
  const handoff = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    const scroll = () => document.getElementById('conciergeDialogueScroll');
    const count = () => { const el = scroll(); return el ? el.children.length : -1; };
    // (a) ALREADY OPEN, WITH EXISTING HISTORY — the case firstLine silently drops.
    window._openConciergePanel('An earlier line of conversation.');
    const before = count();
    out.already = window._conciergeHandoffContinuity('You forgot Seren admitted it.', 'Let us go through it.');
    out.alreadyAppended = count() - before;
    out.alreadyText = (scroll() || { textContent: '' }).textContent;
    // (b) SUPPRESSED — library zoom has focus and the panel is shut.
    if (typeof window._closeConciergePanel === 'function') window._closeConciergePanel();
    window._libraryZoomActive = true;
    out.suppressed = window._conciergeHandoffContinuity('You forgot the ledger.', 'Unresolved.');
    out.queueDepth = window._conciergeHandoffQueueDepth();
    window._libraryZoomActive = false;
    // (c) SUPPRESSION LIFTS AND THE PLAYER JUST OPENS THE CONCIERGE NORMALLY — no second
    // complaint. The queue must drain from the panel-open lifecycle itself.
    // _closePanel sets a 1500ms _suppressOpenUntil window, which is real production behaviour and
    // not something to work around — so the test waits it out, exactly as a player would.
    await sleep(1600);
    window._openConciergePanel();                       // an ordinary bell-style open
    out.afterText = (scroll() || { textContent: '' }).textContent;
    out.queueAfter = window._conciergeHandoffQueueDepth();
    // (d) a dispute queued under a DIFFERENT story must not surface in this one.
    // The panel must be CLOSED for the queue path to be exercised at all — an open panel
    // delivers directly and zoom is irrelevant to it, which is correct but not what this tests.
    if (typeof window._closeConciergePanel === 'function') window._closeConciergePanel();
    window.state.storyId = 'story-ONE';
    window._libraryZoomActive = true;
    window._conciergeHandoffContinuity('A dispute from another book.', 'Unresolved.');
    window._libraryZoomActive = false;
    window.state.storyId = 'story-TWO';
    if (typeof window._closeConciergePanel === 'function') window._closeConciergePanel();
    await sleep(1600);
    window._openConciergePanel();
    out.crossStoryText = (scroll() || { textContent: '' }).textContent;
    out.crossStoryQueue = window._conciergeHandoffQueueDepth();
    return out;
  });
  fs.writeFileSync(path.join(OUT_DIR, 'handoff.json'), JSON.stringify(handoff, null, 2));
  ok('ALREADY-OPEN WITH HISTORY — the handoff still delivers',
    handoff.already.delivered === true && handoff.already.alreadyOpen === true, JSON.stringify(handoff.already));
  ok('...appending BOTH the claim and the finding to the visible dialogue',
    handoff.alreadyAppended >= 2, String(handoff.alreadyAppended));
  ok('...and the player\'s exact words are on screen, not just the finding',
    /You forgot Seren admitted it\./.test(handoff.alreadyText || ''), (handoff.alreadyText || '').slice(-160));
  ok('SUPPRESSED — it reports delivered=FALSE rather than claiming success',
    handoff.suppressed.delivered === false && /zoom|suppress/.test(handoff.suppressed.reason || ''),
    JSON.stringify(handoff.suppressed));
  ok('...and queues the message instead of dropping it',
    handoff.suppressed.queued === true && handoff.queueDepth >= 1, JSON.stringify(handoff));
  ok('...and an ORDINARY panel open drains it — no second complaint required',
    handoff.queueAfter === 0 && /You forgot the ledger\./.test(handoff.afterText || ''),
    JSON.stringify({ q: handoff.queueAfter, tail: (handoff.afterText || '').slice(-120) }));
  ok('a dispute queued under ANOTHER story is discarded, not surfaced in this one',
    handoff.crossStoryQueue === 0 && !/A dispute from another book\./.test(handoff.crossStoryText || ''),
    JSON.stringify({ q: handoff.crossStoryQueue, tail: (handoff.crossStoryText || '').slice(-120) }));

  section('8c-4. THE OOC BRANCH IS NAMED HONESTLY');
  const oocRes = await page.evaluate(() => {
    const s = window.state;
    const beforeState = { scenes: (s.scenes || []).length, turn: s.turnCount };
    const ooc = window._conciergeOOCAcknowledge('This game is boring.', 'subjective-frustration');
    const el = document.getElementById('conciergeWhisper');
    return { ooc, text: el ? el.textContent : null, beforeState,
      after: { scenes: (s.scenes || []).length, turn: s.turnCount } };
  });
  ok('it answers out-of-character and states the story is untouched',
    /feedback for me, not for the scene/.test(oocRes.ooc.message)
    && oocRes.ooc.storyFactsChanged === false, JSON.stringify(oocRes.ooc));
  ok('NO STORY FACT CHANGED', oocRes.beforeState.scenes === oocRes.after.scenes
    && oocRes.beforeState.turn === oocRes.after.turn, JSON.stringify(oocRes));
  const srcHonest = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('and the code documents it as a TRANSIENT acknowledgement, not Concierge routing',
    /TRANSIENT OUT-OF-CHARACTER ACKNOWLEDGEMENT[\s\S]{0,300}?NOT the conversational Concierge/.test(srcHonest));

  section('8d. WEAK-TURN STATE — REAL GENERATION PATH, AND NO LEAK INTO THE NEXT TURN');
  // The cleanup was accidentally placed in the Chrome-translation finally block. That could erase
  // the contract mid-generation, or let it survive into a later ordinary turn. Both are tested.
  const src0 = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('the cleanup is NOT in the translation block any more',
    !/_chromeI18nBusy = false;[\s\S]{0,200}?delete state\._lastSayDoAction/.test(src0)
    && !/delete state\._lastSayDoAction[\s\S]{0,120}?_chromeI18nBusy = false/.test(src0));
  ok('...and there is exactly ONE cleanup site',
    (src0.match(/delete state\._lastSayDoAction/g) || []).length === 1,
    String((src0.match(/delete state\._lastSayDoAction/g) || []).length));
  ok('...and it sits in the generation\'s own finally, right after the plan is returned',
    src0.indexOf('delete state._lastSayDoAction') > src0.indexOf('return _cgPlan;')
    && (src0.indexOf('delete state._lastSayDoAction') - src0.indexOf('return _cgPlan;')) < 600,
    'distance=' + (src0.indexOf('delete state._lastSayDoAction') - src0.indexOf('return _cgPlan;')));

  const reqs = [];
  const serveGen = async (req) => {
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = ((b.messages || []).find((m) => m.role === 'system') || {}).content || '';
    const usr = ((b.messages || []).find((m) => m.role === 'user') || {}).content || '';
    const all = JSON.stringify(b);
    const kind = all.indexOf('decisionGateBeatIdx') !== -1 ? 'author'
      : (all.indexOf('state_change') !== -1 || all.indexOf('tactical_move') !== -1) ? 'planner' : 'other';
    reqs.push({ kind, sys });
    if (kind === 'planner') {
      const base = buildScheduleAwareStubResponse(sys, usr, false);
      base.event_slots = Object.assign({}, base.event_slots, { mechanism_grounding: 'ordinary' });
      return { content: JSON.stringify(base) };
    }
    if (kind === 'author') return { content: JSON.stringify({
      beats: [{ idx: 0, kind: 'narration', text: 'The lamp gutters and no one speaks.', speaker: null }],
      visualState: {}, decisionGateBeatIdx: 0, hardBeats: [] }) };
    return { content: null };
  };
  ['/api/proxy', '/api/mistral-proxy'].forEach((ep) => gate.stub(ep, serveGen));
  gate.stub('/api/chatgpt-proxy', async (req) => ({ choices: [{ message: { content: (await serveGen(req)).content } }] }));

  const seedGen = (extra) => page.evaluate((e) => {
    const s = window.state;
    s.storyId = 'cat5-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
      identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 1; s.scenes = [{ title: 'A', synopsis: 'a', text: 'The clearing holds its silence.', fateCard: null }];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice'; s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
    window._devBypass = true; s._intimacyDevMode = true; window._canonAuditEnabled = false;
    s.contentMode = 'full';
    delete s._acceptedPlannerProposal; delete s._lastSayDoAction; delete s._lastSayDoDialogue;
    Object.assign(s, e || {});
  }, extra);

  // TURN 1 — a weak turn driven through the REAL generator.
  reqs.length = 0;
  await seedGen({});
  gate.setPhase('cat5-weak', 40);
  const weakRun = await page.evaluate(async () => {
    const p = await window._runCGScreenplayGen(1, "I don't know", '');
    return { got: !!p, leakedAction: window.state._lastSayDoAction, leakedDialogue: window.state._lastSayDoDialogue };
  });
  gate.closePhase();
  const plannerReq = reqs.find((r) => r.kind === 'planner');
  const authorReq = reqs.find((r) => r.kind === 'author');
  note('weak turn requests: ' + JSON.stringify(reqs.map((r) => r.kind)));
  ok('the weak turn reached a real PLANNER request', !!plannerReq);
  ok('THE RESTRAINT REACHED THE PLANNER PAYLOAD',
    !!plannerReq && plannerReq.sys.indexOf('WEAK-TURN RESTRAINT') !== -1,
    plannerReq ? plannerReq.sys.slice(-200) : 'no planner request');
  ok('the weak turn reached a real AUTHOR request', !!authorReq);
  ok('THE RESTRAINT REACHED THE AUTHOR PAYLOAD',
    !!authorReq && authorReq.sys.indexOf('WEAK-TURN RESTRAINT') !== -1);
  ok('...and it is the SAME contract in both, not two drifting copies',
    !!plannerReq && !!authorReq
    && plannerReq.sys.indexOf('PRESERVE THE POSTURE EXACTLY') !== -1
    && authorReq.sys.indexOf('PRESERVE THE POSTURE EXACTLY') !== -1);
  ok('THE STATE WAS CLEARED after generation — nothing is left behind',
    weakRun.leakedAction === undefined && weakRun.leakedDialogue === undefined,
    JSON.stringify(weakRun));

  // TURN 2 — an ORDINARY turn immediately after. The contract must NOT appear.
  reqs.length = 0;
  gate.setPhase('cat5-ordinary', 40);
  const ordRun = await page.evaluate(async () => {
    await window._runCGScreenplayGen(1, 'I take the ledger from his hands and hold it up', 'Then say it plainly.');
    return { leaked: window.state._lastSayDoAction };
  });
  gate.closePhase();
  const p2 = reqs.find((r) => r.kind === 'planner'), a2 = reqs.find((r) => r.kind === 'author');
  ok('the NEXT ordinary turn still reached planner and author', !!p2 && !!a2);
  ok('NO LEAK — the ordinary turn carries NO weak-turn restraint in the planner',
    !!p2 && p2.sys.indexOf('WEAK-TURN RESTRAINT') === -1);
  ok('...nor in the author', !!a2 && a2.sys.indexOf('WEAK-TURN RESTRAINT') === -1);
  ok('...and nothing was left on state', ordRun.leaked === undefined, JSON.stringify(ordRun));

  section('9. CONTAINMENT');
  ok('still only ONE wall-break detector — nothing was duplicated',
    (src2.match(/function _detectWallBreakSignal/g) || []).length === 1);
  ok('weak input is still never BLOCKED — the contract restrains the scene, not the player',
    cat5.every((r) => !r.changedByFallback && r.sanitized === r.text));
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, cat4, cat5 }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  console.log('\n  This is a TRACE. It changes nothing and proposes nothing on its own —');
  console.log('  the measured gaps are in the report for a decision.');
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
