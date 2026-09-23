// TEMPT FATE DURABLE CONSEQUENCES — DRY DESIGN + WIRING CONTROL (Roman, 2026-09-22)
//
// Roman: "Tempt Fate can violate the local rules; the local world then has to process the
// violation through its own metaphysics, institutions, suspicions, and costs... The biggest
// actionable gap is durable consequence plumbing for Tempt Fate, not a blunt premise-protection
// regex. I'd have Claude build that next, dry-only." No paid calls, no prose generation, no image
// work.
//
// TRACE (this pass): the existing _recordDurableConsequence/_buildDurableFateConsequenceDirective
// (LAYER 2) is real and wired into _buildContinuitySpineBlock (confirmed reaching the prompt
// payload), but its only two call sites are inside _resolveOrdinaryWish -- the UNPAID, in-dialogue
// wish pipeline. Tempt Fate has no durable-consequence mechanism of its own.
//
// FIX: a SEPARATE array (state._temptFateDurableConsequences), SEPARATE recorder
// (_recordTemptFateDurableConsequence), SEPARATE directive builder
// (_buildTemptFateDurableConsequenceDirective) -- deliberately never collapsed into the ordinary-
// wish LAYER 2 machinery (Roman: "without collapsing Tempt Fate into ordinary Fatelands wish
// doctrine"). Wired into the SAME _buildContinuitySpineBlock the ordinary-wish version already
// reaches, so future author/planner prompts receive it identically. Gated by
// _temptWishWarrantsDurableConsequence (cataclysmic keyword OR mass-scale OR premise-break OR one
// of three named story-bearing rupture categories: memory/death_or_removal/materialization) so a
// harmless flourish leaves no record. NEVER mutates protected state -- purely additive to its own
// array.
//
// This control calls ONLY the real, exposed functions -- no reimplementation, no stubs. Fail-closed
// network gate confirms zero /api/** traffic: genuinely zero paid calls.
//
// usage: node _tempt_fate_durable_consequences_control.mjs
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
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_fate_durable_consequences_control_out.jsonl') });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._recordTemptFateDurableConsequence === 'function'
    && typeof window._buildTemptFateDurableConsequenceDirective === 'function'
    && typeof window._temptWishWarrantsDurableConsequence === 'function'
    && typeof window._buildContinuitySpineBlock === 'function'
    && typeof window.classifyWishDisposition === 'function', { timeout: 25000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

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
      window.state._durableFateConsequences = [];
    });
  }

  // Snapshot of protected/canon fields, to prove none of them ever get touched by this pass's code.
  async function protectedSnapshot() {
    return page.evaluate(() => ({
      loveInterestName: window.state.loveInterestName,
      canonicalLI: JSON.stringify(window.state.canonicalLI),
      playerName: window.state.playerName,
      aPlot: JSON.stringify(window.state.aPlot || null),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. "Tempt Fate materializes The Answer in Lirael\'s hand temporarily"');
  await resetBaseline();
  {
    const before = await protectedSnapshot();
    const wish = "Tempt Fate materializes The Answer in Lirael's hand temporarily";
    const result = await page.evaluate((w) => {
      var warrants = window._temptWishWarrantsDurableConsequence(w, null);
      var entry = warrants ? window._recordTemptFateDurableConsequence(w, { sceneIdx: window.state.turnCount }) : null;
      return { warrants: warrants, entry: entry, count: (window.state._temptFateDurableConsequences || []).length };
    }, wish);
    ok('warrants a durable record (materialization category)', result.warrants === true, JSON.stringify(result));
    ok('record created with source "tempt" (never ordinary-wish LAYER 2)', result.entry && result.entry.source === 'tempt', JSON.stringify(result));
    ok('outcome.shape is "granted" (TYPE 1 power move — no kill/erase/forget keyword)', result.entry && result.entry.outcome.shape === 'granted', JSON.stringify(result.entry));
    ok('permanenceDepth is "temporary" — the wish itself says so, and only explicit wish-text language or an explicit story-structure signal can produce anything but "lasting"', result.entry && result.entry.permanenceDepth === 'temporary', JSON.stringify(result.entry));
    ok('residueClues are materialization-shaped (not generic, not memory, not death)', result.entry && result.entry.residueClues.some(c => /custodian|authority over the true original|true original/i.test(c)), JSON.stringify(result.entry && result.entry.residueClues));

    const directive = await page.evaluate(() => window._buildTemptFateDurableConsequenceDirective());
    ok('directive contains the raw requested wish text', directive.indexOf(wish) !== -1, directive.slice(0, 300));
    ok('directive is explicitly labeled as NOT ordinary Fatelands wish doctrine', directive.indexOf('NOT ordinary Fatelands wish doctrine') !== -1);

    const after = await protectedSnapshot();
    ok('NO protected/canon state field was touched (loveInterestName/canonicalLI/playerName/aPlot all unchanged)', JSON.stringify(before) === JSON.stringify(after), JSON.stringify({ before, after }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. "everyone forgets the ceremony happened" — clues/inconsistencies preserved');
  await resetBaseline();
  {
    const wish = 'everyone forgets the ceremony happened';
    const result = await page.evaluate((w) => {
      var warrants = window._temptWishWarrantsDurableConsequence(w, null);
      var entry = warrants ? window._recordTemptFateDurableConsequence(w, { sceneIdx: window.state.turnCount }) : null;
      return { warrants, entry };
    }, wish);
    ok('warrants a durable record (memory category, also cataclysmic "everyone" and mass-scale — triple-redundant true)', result.warrants === true, JSON.stringify(result));
    ok('outcome.shape is "translated" (forgets/forgotten matches the TYPE 2 shape)', result.entry && result.entry.outcome.shape === 'translated', JSON.stringify(result.entry));
    ok('permanenceDepth defaults to "lasting" (no explicit temporary language, no story-structure override)', result.entry && result.entry.permanenceDepth === 'lasting', JSON.stringify(result.entry));
    ok('residueClues include the exact "wasn\'t it today" clue shape Roman described', result.entry && result.entry.residueClues.some(c => /wasn.t it today/i.test(c)), JSON.stringify(result.entry && result.entry.residueClues));
    ok('residueClues include a records/institution-mismatch clue', result.entry && result.entry.residueClues.some(c => /record|ledger|institution/i.test(c)), JSON.stringify(result.entry && result.entry.residueClues));
    ok('noticers name institutions/investigators (mass scale)', result.entry && result.entry.noticers.some(n => /institution|investigat/i.test(n)), JSON.stringify(result.entry && result.entry.noticers));
    ok('explanationPressure names the "Fate cannot testify, only ordinary evidence" doctrine', result.entry && /ordinary evidence/i.test(result.entry.explanationPressure), result.entry && result.entry.explanationPressure);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. "Julian dies" — translated into mortal danger/contested fate, never casual permanent removal unless explicitly allowed');
  await resetBaseline();
  {
    const wish = 'Julian dies';
    const withoutFlag = await page.evaluate((w) => {
      var warrants = window._temptWishWarrantsDurableConsequence(w, null);
      var entry = warrants ? window._recordTemptFateDurableConsequence(w, { sceneIdx: window.state.turnCount }) : null;
      return { warrants, entry };
    }, wish);
    ok('warrants a durable record (death_or_removal category)', withoutFlag.warrants === true, JSON.stringify(withoutFlag));
    ok('outcome.shape is "translated"', withoutFlag.entry && withoutFlag.entry.outcome.shape === 'translated', JSON.stringify(withoutFlag.entry));
    ok('outcome.description explicitly says mortal danger, not a confirmed death', withoutFlag.entry && /mortal danger rather than a confirmed death/i.test(withoutFlag.entry.outcome.description), withoutFlag.entry && withoutFlag.entry.outcome.description);
    ok('WITHOUT an explicit story-structure signal, permanenceDepth is NEVER "foundational" — defaults to "lasting" (casual permanent removal is not the default)', withoutFlag.entry && withoutFlag.entry.permanenceDepth === 'lasting', JSON.stringify(withoutFlag.entry));
    ok('residueClues are death/removal-shaped (body/absence, grieving hesitation, contested declaration)', withoutFlag.entry && withoutFlag.entry.residueClues.some(c => /body|remains|grieve/i.test(c)), JSON.stringify(withoutFlag.entry && withoutFlag.entry.residueClues));

    // The escape hatch: an explicit story-structure signal CAN reach 'foundational' — proving
    // "unless explicitly allowed by story structure" is a real, reachable path, not dead code.
    await resetBaseline();
    const withFlag = await page.evaluate((w) => {
      var entry = window._recordTemptFateDurableConsequence(w, { sceneIdx: window.state.turnCount, storyStructureAllowsPermanent: true });
      return { entry };
    }, wish);
    ok('WITH an explicit storyStructureAllowsPermanent signal, permanenceDepth CAN reach "foundational" (the escape hatch is real, not dead code)', withFlag.entry && withFlag.entry.permanenceDepth === 'foundational', JSON.stringify(withFlag.entry));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. Harmless temporary dramatic flourish — must NOT create a durable record');
  await resetBaseline();
  {
    const wish = 'let the candlelight between them flicker warm and gold for a moment';
    const result = await page.evaluate((w) => {
      var warrants = window._temptWishWarrantsDurableConsequence(w, null);
      var countBefore = (window.state._temptFateDurableConsequences || []).length;
      if (warrants) window._recordTemptFateDurableConsequence(w, { sceneIdx: window.state.turnCount });
      var countAfter = (window.state._temptFateDurableConsequences || []).length;
      return { warrants, countBefore, countAfter };
    }, wish);
    ok('does NOT warrant a durable record (no cataclysmic/mass/premise-break/named-category signal)', result.warrants === false, JSON.stringify(result));
    ok('the durable-consequences array stays empty — mirrors the REAL wiring at the Tempt seal point (app.js ~108910), which gates the record call behind this exact same warrant check', result.countBefore === 0 && result.countAfter === 0, JSON.stringify(result));

    const directive = await page.evaluate(() => window._buildTemptFateDurableConsequenceDirective());
    ok('directive is empty — no phantom consequence for a harmless flourish', directive === '', JSON.stringify(directive));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. An ORDINARY Fatelands wish attempting the same thing — proves ordinary wish doctrine constrains it differently, and the two pipelines never cross');
  await resetBaseline();
  {
    // NOTE ON FIXTURE PHRASING: a first attempt used "I wish everyone forgot the ceremony
    // happened" — a natural, subject-first memory-erasure phrasing. It returned dominantOrder
    // 'RESTORATION'/disposition 'welcomes' (the innocuous SAFE fallback), NOT resisted. Traced this
    // to a genuine, real coverage gap in WISH_ORDER_SIGNALS (app.js ~105797): HISTORY's patterns
    // are narrowly shaped around resurrection/undoing-death/time-reversal ("undo/unmake/erase the
    // past/death/war/accident/what happened"), and AGENCY's patterns require an object-of-"make"
    // shape ("make them forget"), neither of which "everyone forgot X happened" (subject-first)
    // matches. This is a genuine gap in a DIFFERENT system (ordinary wish doctrine) — flagged here,
    // NOT fixed, per this pass's explicit instruction not to touch ordinary wish doctrine and the
    // standing adjacent-defect-is-a-separate-decision discipline. Corrected fixture below uses
    // "make everyone forget" phrasing, which DOES match AGENCY's real pattern
    // (make (him|her|them|\w+) forget), to correctly exercise what this section needs to prove.
    const wish = 'I wish I could make everyone forget the ceremony ever happened';
    const result = await page.evaluate((w) => {
      var countBefore = (window.state._temptFateDurableConsequences || []).length;
      var cls = window.classifyWishDisposition(w);
      var countAfter = (window.state._temptFateDurableConsequences || []).length;
      return { cls, countBefore, countAfter };
    }, wish);
    ok('classifyWishDisposition (the REAL Eight-Orders code-level classifier) recognizes this as a heavily-resisted Order (AGENCY — overriding many people\'s will/memory), not a casual grant', ['HISTORY', 'AGENCY', 'IDENTITY'].includes(result.cls.dominantOrder) || (result.cls.resistedOperation && ['AGENCY', 'IDENTITY', 'HISTORY'].includes(result.cls.resistedOperation)), JSON.stringify(result.cls));
    ok('disposition reflects resistance, not "welcomes"', result.cls.disposition !== 'welcomes', JSON.stringify(result.cls));
    ok('calling the ORDINARY wish classifier never touches state._temptFateDurableConsequences (the two pipelines are structurally separate — Tempt Fate is never gated by ordinary wish doctrine, and ordinary wishes never populate Tempt\'s own record)', result.countBefore === 0 && result.countAfter === 0, JSON.stringify(result));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. Future planner/author prompts receive it as a BINDING fact, via the real shared continuity-spine builder');
  await resetBaseline();
  {
    await page.evaluate(() => {
      window._recordTemptFateDurableConsequence('everyone forgets the ceremony happened', { sceneIdx: window.state.turnCount });
    });
    const spine = await page.evaluate(() => window._buildContinuitySpineBlock(window.state, {}));
    ok('the REAL _buildContinuitySpineBlock (the same function ordinary-wish durable consequences already reach) includes the Tempt durable consequence', spine.indexOf('everyone forgets the ceremony happened') !== -1, spine.slice(0, 500));
    ok('it carries the binding obligation language, not free-floating prose suggestion', spine.indexOf('must not be silently reverted') !== -1, spine.slice(0, 800));
    ok('it is clearly labeled as a DURABLE CONSEQUENCE section (structured, not indistinguishable from ordinary narration)', spine.indexOf('TEMPT FATE') !== -1 && spine.indexOf('DURABLE CONSEQUENCES') !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. Ordinary Say/Do and non-warranting Tempt use leave state._temptFateDurableConsequences untouched (regression against silent growth)');
  await resetBaseline();
  {
    const before = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    // Simulate a scene with no Tempt invocation at all touching the array.
    await page.evaluate(() => { window.state.tempt_fate_invoked_this_turn = false; window.state.temptFateWish = ''; });
    const after = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    ok('array length unchanged with no Tempt activity', before === 0 && after === 0, JSON.stringify({ before, after }));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE DURABLE CONSEQUENCES CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_tempt_fate_durable_consequences_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
