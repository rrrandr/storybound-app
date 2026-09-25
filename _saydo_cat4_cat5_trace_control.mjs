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
