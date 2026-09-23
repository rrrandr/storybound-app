// TEMPT FATE — MODEL-DRIVEN OUTCOME MECHANISM — DRY CONTROL (Roman, 2026-09-23)
//
// Roman's correction of the prior pass: "The model should work out the consequences of an
// unfamiliar wish. Code should preserve those consequences and keep future scenes consistent; it
// shouldn't need a handwritten response for every possible wish... Remove the keyword-based
// eligibility gate and predefined residue/clue templates as authorities over its consequences...
// It's still mixing ordinary wishing with Tempt Fate. 'Circumstances, not minds' would undermine
// your memory-erasure example. Tempt Fate can actually erase the memories... A wish is a request, a
// plan is a proposal, and neither becomes accomplished history merely because the model filled out
// a field." No paid calls, no prose generation, no image work.
//
// This control proves the MECHANISM (validation, commit, idempotency, persistence, delivery to
// future prompts, instruction-hierarchy precedence) using SIMULATED outcome reports — hand-built
// objects standing in for what a real model-generated report would contain. Per Roman's own
// correction: "Dry tests can prove that mechanism. They cannot certify the model's creative
// judgment; reserve that claim for subsequent live tests." This control does NOT and CANNOT prove
// the model will produce GOOD reports — only that well-formed reports are handled correctly and
// malformed/undelivered ones are safely rejected. See the live-test authorization sheet in
// _tempt_fate_model_driven_outcome_2026_09_23.md for what a live pass would need to additionally
// establish.
//
// usage: node _tempt_fate_model_driven_outcome_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_fate_model_driven_outcome_control_out.jsonl') });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._validateTemptFateOutcomeReport === 'function'
    && typeof window._commitTemptFateOutcome === 'function'
    && typeof window._buildTemptFateDurableConsequenceDirective === 'function'
    && typeof window._buildContinuitySpineBlock === 'function'
    && typeof window.classifyWishDisposition === 'function'
    && typeof window._cgTemptFateAftermathCleanup === 'function'
    && typeof window._buildCGTemptDirective === 'function', { timeout: 25000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  // Confirm the OLD keyword-gate/template functions are genuinely GONE, not just unused —
  // Roman: "Remove the keyword-based eligibility gate and predefined residue/clue templates as
  // authorities over its consequences."
  const removed = await page.evaluate(() => ({
    warrantGateGone: typeof window._temptWishWarrantsDurableConsequence === 'undefined',
    shapeClassifierGone: typeof window._classifyTemptRuptureShape === 'undefined',
    categoryClassifierGone: typeof window._temptRuptureCategoryFromText === 'undefined',
    oldRecorderGone: typeof window._recordTemptFateDurableConsequence === 'undefined',
  }));
  ok('the keyword eligibility gate (_temptWishWarrantsDurableConsequence) no longer exists', removed.warrantGateGone, JSON.stringify(removed));
  ok('the keyword shape classifier (_classifyTemptRuptureShape) no longer exists', removed.shapeClassifierGone, JSON.stringify(removed));
  ok('the keyword category/residue-template classifier (_temptRuptureCategoryFromText) no longer exists', removed.categoryClassifierGone, JSON.stringify(removed));
  ok('the old pre-generation keyword-gated recorder (_recordTemptFateDurableConsequence) no longer exists', removed.oldRecorderGone, JSON.stringify(removed));

  function resetBaseline() {
    return page.evaluate(() => {
      window.state = window.state || {};
      window.state.picks = window.state.picks || {};
      window.state.picks.world = 'Fantasy';
      window.state.loveInterestName = 'Julian';
      window.state.playerName = 'Lirael';
      window.state.canonicalLI = { committed: true, name: 'Julian' };
      window.state.turnCount = 5;
      window.state._temptFateDurableConsequences = [];
      window.state._temptOutcomeCommittedScenes = {};
      window.state._durableFateConsequences = [];
      window.state.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
      window.state._temptAftermathScenes = 0;
      window.state._temptAftermathWish = '';
      window.state.fate_saturation = 0;
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      window.state.consecutive_tempt_fate_count = 0;
    });
  }

  async function protectedSnapshot() {
    return page.evaluate(() => ({
      loveInterestName: window.state.loveInterestName,
      canonicalLI: JSON.stringify(window.state.canonicalLI),
      playerName: window.state.playerName,
      aPlot: JSON.stringify(window.state.aPlot || null),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. An UNFAMILIAR wish, outside every removed category — normal generation response → validated outcome → commit');
  await resetBaseline();
  {
    const before = await protectedSnapshot();
    // Deliberately NOT memory/death/materialization-shaped — a bureaucratic-fraud rupture. There is
    // no category system left to match or miss; this proves genericity structurally, not by
    // picking a lucky keyword.
    const wish = "let the harbor tide-registry believe a ship that never sailed logged safe passage";
    const ledgerEntry = { wishText: wish, sceneIdx: 5, bargainId: 'bg_1' };
    // A SIMULATED "normal generation response" — a hand-built object standing in for what a real
    // model-generated outcome report would contain. This is exactly what Roman's correction asked
    // for: build/prove the plumbing with simulated responses; reserve live testing for creative
    // quality.
    const simulatedReport = {
      delivered: true,
      changed: [
        { subject: 'the harbor tide-registry', whatChanged: 'now shows a logged safe-passage entry for a ship that never existed' },
        { subject: 'the harbormaster', whatChanged: 'signed off on the entry without noticing anything wrong' }
      ],
      durability: [
        { aspect: 'the registry entry', status: 'persists', note: 'a written record does not un-write itself when the rupture window closes' },
        { aspect: 'the harbormaster\'s confident recollection of signing it', status: 'uncertain', note: 'he genuinely believes he remembers the ship, but nothing about that memory is verifiable' }
      ],
      knowledgeStates: [
        { character: 'harbormaster', state: 'believes', note: 'confidently recalls a ship and crew he never actually saw' },
        { character: 'dockhands on duty', state: 'unaware', note: 'no one on the actual dock has any memory of the ship, because it was never there' }
      ],
      establishedEvidence: [
        'the registry page itself, in the harbormaster\'s own handwriting',
        'no corresponding entry in the dockhands\' shift log for that night'
      ],
      openPossibilities: [
        'an auditor could eventually notice the registry and shift log disagree',
        'someone could ask the harbormaster to describe the ship and find his account strangely generic'
      ]
    };

    const result = await page.evaluate((args) => {
      var v = window._validateTemptFateOutcomeReport(args.report);
      var entry = window._commitTemptFateOutcome(args.sceneIdx, args.ledgerEntry, args.report);
      return { valid: v, entry: entry, count: (window.state._temptFateDurableConsequences || []).length };
    }, { report: simulatedReport, sceneIdx: 5, ledgerEntry });

    ok('the simulated report validates structurally', result.valid.valid === true, JSON.stringify(result.valid));
    ok('the commit succeeds and produces an entry', !!result.entry, JSON.stringify(result));
    ok('the entry\'s requestedRupture is the exact wish text from the ledger proposal (never re-derived or guessed)', result.entry && result.entry.requestedRupture === wish, JSON.stringify(result.entry));
    ok('the entry\'s changed[] is EXACTLY what the report said — not reinterpreted, not template-filled', result.entry && result.entry.changed.length === 2 && result.entry.changed[0].subject === 'the harbor tide-registry', JSON.stringify(result.entry && result.entry.changed));
    ok('per-effect durability is preserved (one persists, one uncertain — nothing collapsed to a single overall tier)', result.entry && result.entry.durability.length === 2 && result.entry.durability[0].status === 'persists' && result.entry.durability[1].status === 'uncertain', JSON.stringify(result.entry && result.entry.durability));
    ok('permanent === true (derived: at least one effect persists/uncertain)', result.entry && result.entry.permanent === true, JSON.stringify(result.entry));
    ok('openPossibilities are stored SEPARATELY from establishedEvidence (never merged into established fact)', result.entry && result.entry.openPossibilities.length === 2 && result.entry.establishedEvidence.length === 2, JSON.stringify(result.entry));

    const directive = await page.evaluate(() => window._buildTemptFateDurableConsequenceDirective());
    ok('directive marks establishedEvidence as ESTABLISHED (binding)', directive.indexOf('EVIDENCE ALREADY ON THE PAGE') !== -1, directive.slice(0, 400));
    ok('directive explicitly marks openPossibilities as NOT YET ESTABLISHED — future scenes MAY explore, must not be treated as already true', directive.indexOf('NOT YET ESTABLISHED') !== -1 && directive.indexOf('auditor could eventually notice') !== -1, directive);

    const after = await protectedSnapshot();
    ok('NO protected/canon state field was touched', JSON.stringify(before) === JSON.stringify(after), JSON.stringify({ before, after }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. Roman\'s own worked example — a manifested Answer disappears while a witnessed accusation persists (different durability, SAME wish)');
  await resetBaseline();
  {
    const wish = "Tempt Fate materializes The Answer in Lirael's hand";
    const report = {
      delivered: true,
      changed: [
        { subject: 'The Answer', whatChanged: 'briefly, physically appeared in Lirael\'s hand in front of witnesses' },
        { subject: 'the accusation against the rite-keeper', whatChanged: 'is now something the witnesses genuinely believe they saw grounds for' }
      ],
      durability: [
        { aspect: 'The Answer\'s physical presence', status: 'expires', note: 'the scene shows it fading from her hand as the rupture window closes' },
        { aspect: 'the accusation itself', status: 'persists', note: 'the witnesses\' belief in what they saw does not fade just because the object did' }
      ],
      knowledgeStates: [{ character: 'the witnesses', state: 'believes', note: 'saw it with their own eyes, will say so' }],
      establishedEvidence: ['the rite-keeper\'s stunned silence when it appeared'],
      openPossibilities: ['someone could demand The Answer be produced again as proof']
    };
    const entry = await page.evaluate((args) => window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report), { wish, sceneIdx: 5, report });
    ok('a SINGLE wish can produce effects with DIFFERENT durability — the manifestation expires, the accusation persists (exactly Roman\'s worked example)', entry && entry.durability.find(d => d.aspect.includes('Answer')).status === 'expires' && entry.durability.find(d => d.aspect.includes('accusation')).status === 'persists', JSON.stringify(entry && entry.durability));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. Rejected/failed generation — an undelivered report must NOT create history');
  await resetBaseline();
  {
    const report = { delivered: false, changed: [], durability: [], knowledgeStates: [], establishedEvidence: [], openPossibilities: [] };
    const result = await page.evaluate((args) => {
      var entry = window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report);
      return { entry, count: (window.state._temptFateDurableConsequences || []).length };
    }, { wish: 'some wish', sceneIdx: 5, report });
    ok('delivered:false produces NO entry', result.entry === null, JSON.stringify(result));
    ok('the array stays empty', result.count === 0, JSON.stringify(result));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. Malformed generation — an invalid report must NOT create history');
  await resetBaseline();
  {
    const malformed = [
      { delivered: true }, // delivered:true but nothing changed/established — shape error
      { delivered: 'yes', changed: [] }, // delivered wrong type
      { delivered: true, changed: [{ subject: 'x' }] }, // missing whatChanged
      { delivered: true, durability: [{ aspect: 'x', status: 'sort-of' }], changed: [{ subject: 'x', whatChanged: 'y' }] }, // bad enum
      null,
      'not an object',
    ];
    for (const bad of malformed) {
      const result = await page.evaluate((args) => {
        var before = (window.state._temptFateDurableConsequences || []).length;
        var entry = window._commitTemptFateOutcome(args.sceneIdx, { wishText: 'x', sceneIdx: args.sceneIdx }, args.bad);
        var after = (window.state._temptFateDurableConsequences || []).length;
        return { entry, before, after };
      }, { sceneIdx: 5, bad });
      ok('malformed report ' + JSON.stringify(bad).slice(0, 60) + ' produces no entry and no growth', result.entry === null && result.before === result.after, JSON.stringify(result));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Duplicate/retried generation for the SAME scene must not create duplicate history');
  await resetBaseline();
  {
    const wish = 'a real rupture';
    const report = { delivered: true, changed: [{ subject: 'x', whatChanged: 'y' }], durability: [{ aspect: 'x', status: 'persists' }], knowledgeStates: [], establishedEvidence: ['z'], openPossibilities: [] };
    const result = await page.evaluate((args) => {
      var first = window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report);
      var second = window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report); // simulates a retry
      var third = window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report); // simulates a second retry
      return { first: !!first, second: second, third: third, count: (window.state._temptFateDurableConsequences || []).length };
    }, { wish, sceneIdx: 7, report });
    ok('the first commit for a scene succeeds', result.first === true, JSON.stringify(result));
    ok('a retried commit for the SAME scene is a silent no-op (returns null)', result.second === null && result.third === null, JSON.stringify(result));
    ok('the array holds exactly ONE entry, not three', result.count === 1, JSON.stringify(result));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. Save/reload round-trip (Issue-boundary carry-forward JSON pattern)');
  await resetBaseline();
  {
    const wish = 'a durable rupture that must survive a save';
    const report = { delivered: true, changed: [{ subject: 'x', whatChanged: 'y' }], durability: [{ aspect: 'x', status: 'persists' }], knowledgeStates: [{ character: 'Julian', state: 'suspects' }], establishedEvidence: ['a torn page'], openPossibilities: ['a rumor could spread'] };
    const roundTripped = await page.evaluate((args) => {
      window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report);
      // Mirror the REAL Issue-carry-forward capture/restore pattern (app.js ~101748/~101801):
      // JSON.stringify before a reset-shaped wipe, JSON.parse to restore.
      var captured = JSON.stringify(window.state._temptFateDurableConsequences);
      var capturedCommitted = JSON.stringify(window.state._temptOutcomeCommittedScenes);
      window.state._temptFateDurableConsequences = [];
      window.state._temptOutcomeCommittedScenes = {};
      window.state._temptFateDurableConsequences = JSON.parse(captured);
      window.state._temptOutcomeCommittedScenes = JSON.parse(capturedCommitted);
      return window.state._temptFateDurableConsequences;
    }, { wish, sceneIdx: 9, report });
    ok('the entry survives a save/reload round-trip byte-for-byte on its content fields', roundTripped.length === 1 && roundTripped[0].requestedRupture === wish && roundTripped[0].establishedEvidence[0] === 'a torn page', JSON.stringify(roundTripped));

    // The idempotency guard must ALSO survive the round-trip — a retried commit for the SAME scene
    // after a reload must still be a no-op, not silently re-open the door to duplicates.
    const stillIdempotent = await page.evaluate((args) => {
      var entry = window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report);
      return { entry, count: window.state._temptFateDurableConsequences.length };
    }, { wish, sceneIdx: 9, report });
    ok('the idempotency guard survives the round-trip — a post-reload retry is still a no-op', stillIdempotent.entry === null && stillIdempotent.count === 1, JSON.stringify(stillIdempotent));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. Future planner/author prompts receive it as binding, via the real shared continuity-spine builder');
  await resetBaseline();
  {
    const wish = 'everyone forgets the ceremony happened';
    const report = {
      delivered: true,
      changed: [{ subject: 'everyone present at the ceremony', whatChanged: 'no longer remembers it happening' }],
      durability: [{ aspect: 'the collective memory gap', status: 'persists', note: 'the scene never shows it fading' }],
      knowledgeStates: [{ character: 'Lirael', state: 'suspects', note: 'something is wrong even though she cannot name it' }],
      establishedEvidence: ['the ceremonial hall is still arranged for a rite no one recalls starting', 'the registrar\'s ledger has an entry for that hour with no name filled in'],
      openPossibilities: ['someone could cross-reference the ledger against the hall\'s arrangement and notice the mismatch']
    };
    await page.evaluate((args) => window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report), { wish, sceneIdx: 5, report });
    const spine = await page.evaluate(() => window._buildContinuitySpineBlock(window.state, {}));
    ok('the REAL _buildContinuitySpineBlock includes the committed consequence', spine.indexOf(wish) !== -1, spine.slice(0, 500));
    ok('it carries the established evidence verbatim', spine.indexOf("registrar's ledger has an entry") !== -1, spine.slice(0, 900));
    ok('it clearly separates ESTABLISHED from NOT YET ESTABLISHED', spine.indexOf('ESTABLISHED') !== -1 && spine.indexOf('NOT YET ESTABLISHED') !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('8. Volatility-window expiration does NOT automatically undo lasting changes');
  await resetBaseline();
  {
    const wish = 'a lasting rupture';
    const report = { delivered: true, changed: [{ subject: 'x', whatChanged: 'y' }], durability: [{ aspect: 'x', status: 'persists' }], knowledgeStates: [], establishedEvidence: ['z'], openPossibilities: [] };
    await page.evaluate((args) => window._commitTemptFateOutcome(args.sceneIdx, { wishText: args.wish, sceneIdx: args.sceneIdx }, args.report), { wish, sceneIdx: 5, report });

    const timeline = await page.evaluate(() => {
      var log = [];
      // Activate a real volatility window (Tempt invocation) and run it all the way through
      // activation -> taper -> close -> aftermath imprint -> fading -> full expiration, using the
      // REAL, already-fixed CG lifecycle functions from the prior two passes.
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'a lasting rupture';
      window._cgTemptFateAftermathCleanup();
      log.push({ step: 'activate', durableCount: window.state._temptFateDurableConsequences.length });
      for (var i = 0; i < 8; i++) {
        window.state.tempt_fate_invoked_this_turn = false;
        window._cgTemptFateAftermathCleanup();
        log.push({ step: 'decay' + i, windowActive: window.state.volatility_window.active, aftermathScenes: window.state._temptAftermathScenes, durableCount: window.state._temptFateDurableConsequences.length });
        if (!window.state.volatility_window.active && window.state._temptAftermathScenes === 0) break;
      }
      return log;
    });
    console.log('  timeline: ' + JSON.stringify(timeline));
    const allCountsAreOne = timeline.every((t) => t.durableCount === 1);
    ok('the durable consequence survives the ENTIRE volatility-window lifecycle (activation through full aftermath expiration) untouched — the array never grows or shrinks from window/aftermath decay', allCountsAreOne, JSON.stringify(timeline));
    const finallyExpired = timeline[timeline.length - 1];
    ok('meanwhile the window/aftermath mechanism itself DID fully expire (proving this isn\'t just a no-op timeline)', finallyExpired.windowActive === false && finallyExpired.aftermathScenes === 0, JSON.stringify(finallyExpired));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('9. Instruction hierarchy — Tempt Fate overrides ordinary Fatelands wish limits, in the REAL live directive');
  await resetBaseline();
  {
    const directive = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'erase everyone\'s memory of the ceremony';
      var d = window._buildCGTemptDirective(); // wraps buildWorldLawDirective() — that one isn't exposed on window directly
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      return d;
    });
    ok('the directive explicitly states Tempt Fate OVERRIDES ordinary wish limits', directive.indexOf('TEMPT FATE OVERRIDES ORDINARY WISH LIMITS') !== -1, directive.slice(0, 300));
    ok('it explicitly says "Circumstances, not minds" does not limit Tempt Fate', directive.indexOf('does not limit what Tempt Fate itself can do') !== -1);
    ok('it explicitly preserves ordinary doctrine\'s role in how the world INTERPRETS/INVESTIGATES afterward', directive.indexOf('INTERPRETS, EXPLAINS, SUSPECTS, and INVESTIGATES') !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('10. Separation from ordinary wish doctrine still holds (structural, not by function-name convention)');
  await resetBaseline();
  {
    const wish = 'I wish I could make everyone forget the ceremony ever happened';
    const result = await page.evaluate((w) => {
      var countBefore = (window.state._temptFateDurableConsequences || []).length;
      var cls = window.classifyWishDisposition(w);
      var countAfter = (window.state._temptFateDurableConsequences || []).length;
      return { cls, countBefore, countAfter };
    }, wish);
    ok('the ordinary wish classifier resists it (AGENCY), never granting it cleanly the way Tempt Fate would', result.cls.disposition !== 'welcomes', JSON.stringify(result.cls));
    ok('calling the ordinary classifier never touches Tempt\'s own durable-consequence array', result.countBefore === 0 && result.countAfter === 0, JSON.stringify(result));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE MODEL-DRIVEN OUTCOME CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_tempt_fate_model_driven_outcome_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
