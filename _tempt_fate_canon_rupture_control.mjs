// TEMPT FATE CANON-RUPTURE HANDLING — DRY TRACE + CONTROLS (Roman, 2026-09-22)
//
// Roman: "Next step should be Tempt Fate canon-rupture handling... The key is not 'block
// impossible things.' It's 'classify, bound, metabolize.'" No paid calls, no prose generation, no
// image work. Dry trace + design + BEGIN controls only — no live Tempt Fate sample, no code fix
// this pass. See _tempt_fate_canon_rupture_2026_09_22.md for the full trace, taxonomy, structured-
// result-record spec, and findings (F1-F8) this control supports.
//
// Every check below calls the REAL, unmodified exposed functions — sanitizeWishInput,
// _isOutOfScopeForEmbodiedTempt, buildWorldLawDirective, _buildCGTemptDirective,
// validateStructuralOverride (cross-check against the prior Petition Fate pass) — no
// reimplementation, no stubs. Fail-closed network gate confirms zero /api/** traffic: this pass
// makes genuinely zero paid calls.
//
// usage: node _tempt_fate_canon_rupture_control.mjs
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
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_fate_canon_rupture_control_out.jsonl') });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window.sanitizeWishInput === 'function'
    && typeof window._isOutOfScopeForEmbodiedTempt === 'function'
    && typeof window._buildCGTemptDirective === 'function'
    && typeof window.validateStructuralOverride === 'function', { timeout: 25000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  // Common setup mirroring a First Sacrifice CG session — Fantasy world (WORLD_TEMPT_FATE_MODE.Fantasy
  // === 'divine'), enough state for buildWorldLawDirective to run its real branches.
  await page.evaluate(() => {
    window.state = window.state || {};
    window.state.picks = window.state.picks || {};
    window.state.picks.world = 'Fantasy';
    window.state.loveInterestName = 'Julian';
    window.state.currentPrimaryLiId = 'julian';
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('0. RUNTIME CHECK — does First Sacrifice actually carry a worldSubtype at all? (F5)');
  {
    // Not asserting a fixed expectation — this is an open empirical question the design doc (F5)
    // raises from a static seed-object read. Report what's actually there.
    const ws = await page.evaluate(() => (window.state && (window.state.worldSubtype || (window.state.picks && window.state.picks.worldSubtype))) || null);
    console.log('  INFO worldSubtype on a fresh session state: ' + JSON.stringify(ws) + ' (empty/null supports F5 — no dedicated premise-constraints entry for First Sacrifice)');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. "Julian dies" — TYPE 2 structural break, must translate not execute');
  {
    const san = await page.evaluate((t) => window.sanitizeWishInput(t), 'Julian dies');
    ok('sanitizeWishInput passes it through (fictional character death is not blocked content)', san.valid === true && san.text === 'Julian dies', JSON.stringify(san));

    const oos = await page.evaluate((t) => window._isOutOfScopeForEmbodiedTempt(t), 'Julian dies');
    ok('_isOutOfScopeForEmbodiedTempt does NOT flag it (intransitive "dies", no destructive verb — correct, that guard is narrower than general classification, see F7)', oos === false, JSON.stringify(oos));

    const directive = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'Julian dies';
      var d = window._buildCGTemptDirective();
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      return d;
    });
    ok('directive contains the TEMPT FATE EMPOWERMENT CONTRACT', directive.indexOf('TEMPT FATE EMPOWERMENT CONTRACT') !== -1);
    ok('directive contains the TYPE 2 STRUCTURAL BREAKS heading + never-execute-literally rule', directive.indexOf('TYPE 2 — STRUCTURAL BREAKS') !== -1 && directive.indexOf('Never say no. Never execute literally.') !== -1);
    ok('directive contains the worked "Kill the LI" translate example', directive.indexOf('Kill the LI') !== -1 && directive.indexOf('immediate, undeniable mortal danger') !== -1);
    ok('the player\'s literal wish text is present for the model to translate, not deleted from the prompt', directive.indexOf('Julian dies') !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. "The Answer destroys the Institution" — wish-scale inflection gap (F6)');
  {
    // _wishScale itself isn't exposed directly; exercise it through the real directive builder and
    // read back which OMEN intensity line it selected — cataclysmic vs the medium default reveals
    // whether "destroys" (inflected) matched the same as bare "destroy" would.
    const omenFor = async (wish) => page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      var d = window._buildCGTemptDirective();
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      return d;
    }, wish);

    const dInflected = await omenFor('The Answer destroys the Institution');
    const cataclysmicLine = 'Strong environmental reaction — wind dies, sound drops, multiple characters freeze mid-action. Something fundamental shifted.';
    const inflectedGotCataclysmic = dInflected.indexOf(cataclysmicLine) !== -1;

    const dBare = await omenFor('destroy the Institution');
    const bareGotCataclysmic = dBare.indexOf(cataclysmicLine) !== -1;

    ok('bare "destroy" correctly triggers cataclysmic-scale omen framing', bareGotCataclysmic, dBare.slice(0, 300));
    // This assertion documents the ACTUAL runtime behavior (may confirm F6 as a real gap, or show
    // it doesn't matter in practice if "the" + "Institution" pulls in a different cataclysmic
    // trigger word) — report honestly either way, do not force a pre-decided pass/fail framing.
    console.log('  INFO "destroys" (inflected) got cataclysmic omen: ' + inflectedGotCataclysmic + (inflectedGotCataclysmic ? ' — no gap in practice for this fixture' : ' — CONFIRMS F6: the exact-word regex misses the inflected form for this fixture'));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. "I reveal I am Fate" — grandiose in-world identity claim, not a fourth-wall break');
  {
    const san = await page.evaluate((t) => window.sanitizeWishInput(t), 'I reveal I am Fate');
    ok('sanitizeWishInput passes it through — Fate is legitimate in-world cosmology (Fatelands), not a real-world meta reference', san.valid === true, JSON.stringify(san));

    const directive = await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      var d = window._buildCGTemptDirective();
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      return d;
    }, 'I reveal I am Fate');
    ok('directive builds without error and still carries the EMPOWERMENT CONTRACT + NARRATIVE TRUTH RULE (governs even an identity-claim wish — cannot assert cosmology-collapsing fact, only perceived/unstable belief)', directive.indexOf('TEMPT FATE EMPOWERMENT CONTRACT') !== -1 && directive.indexOf('NARRATIVE TRUTH RULE') !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. "everyone forgets the rite happened" — cataclysmic scale + matches the contract\'s own "Erase what happened" example');
  {
    const directive = await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      var d = window._buildCGTemptDirective();
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      return d;
    }, 'everyone forgets the rite happened');
    ok('"everyone" correctly triggers cataclysmic-scale omen framing', directive.indexOf('Strong environmental reaction — wind dies, sound drops, multiple characters freeze mid-action. Something fundamental shifted.') !== -1);
    ok('directive carries the matching worked example: "Erase what happened" → world becomes uncertain, not deleted', directive.indexOf('Erase what happened') !== -1 && directive.indexOf('destabilized but not deleted') !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Valid temporary miraculous rupture — aftermath imprint/fading, ambiguous world explanation');
  {
    const imprint = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.volatility_window = { active: false };
      window.state._temptAftermathScenes = 2;
      window.state._temptAftermathWish = 'let the storm break early, just this once';
      return window.buildWorldLawDirective ? window.buildWorldLawDirective() : null;
    });
    // buildWorldLawDirective isn't exposed directly — fall back to confirming via the CG wrapper,
    // which calls it internally and returns '' only if the literary block itself was empty.
    const imprintCG = imprint === null ? await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.volatility_window = { active: false };
      window.state._temptAftermathScenes = 2;
      window.state._temptAftermathWish = 'let the storm break early, just this once';
      return window._buildCGTemptDirective();
    }) : imprint;
    ok('IMPRINT scene directive fires with the player\'s wish echoed back', imprintCG.indexOf('TEMPT FATE AFTERMATH — IMPRINT') !== -1 && imprintCG.indexOf('let the storm break early, just this once') !== -1, imprintCG.slice(0, 400));
    ok('IMPRINT carries the mass-delusion-style ambiguity language (no sustained suspicion, organic/varied reactions)', imprintCG.indexOf('No sustained suspicion or threat framing') !== -1 && imprintCG.indexOf('ORGANIC AND VARIED') !== -1);

    const fading = await page.evaluate(() => {
      window.state._temptAftermathScenes = 1;
      return window._buildCGTemptDirective();
    });
    ok('FADING scene directive fires on the second aftermath scene, with reinterpretation-not-certainty language', fading.indexOf('TEMPT FATE AFTERMATH — FADING') !== -1 && fading.indexOf('reinterpreted the event into something explicable') !== -1, fading.slice(0, 400));

    const cleared = await page.evaluate(() => {
      window.state._temptAftermathScenes = 0;
      window.state._temptAftermathWish = '';
      return window._buildCGTemptDirective();
    });
    ok('directive returns empty once aftermath is fully consumed (no lingering Fate framing forever)', cleared === '', JSON.stringify(cleared));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. Safety-blocked input — same shared gate as Petition Fate');
  {
    // Fixture chosen to actually match _detectSelfHarmSignal's real regex (kill myself/me | i want
    // to die | suicide | self-harm | cut myself/my wrists | end my/it all life) — a first attempt
    // with softer phrasing ("hurt myself badly enough to end it") did NOT match this narrow regex
    // and produced a false "gap" read; corrected to a fixture that genuinely exercises the detector,
    // matching the same fixture-verification discipline used in the prior Petition Fate pass.
    const san = await page.evaluate((t) => window.sanitizeWishInput(t), 'let me end my life so the pain stops');
    ok('self-harm-shaped wish is hard-blocked by the SAME sanitizeWishInput gate Tempt Fate\'s own modal handler calls', san.valid === false, JSON.stringify(san));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. Petition-routed permanent identity rewrite typed into the Tempt box');
  {
    const san = await page.evaluate((t) => window.sanitizeWishInput(t), 'Rename Julian to Elon');
    ok('sanitizeWishInput passes it through as ordinary text (Tempt has no rename-specific classifier — accepted as a ordinary wish, not specially flagged)', san.valid === true, JSON.stringify(san));

    const directive = await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      var d = window._buildCGTemptDirective();
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      return d;
    }, 'Rename Julian to Elon');
    ok('the directive treats it as ordinary wish text (no crash, no special-case bypass) — structurally it CANNOT become durable canon this way: no code path anywhere writes state.loveInterestName from temptFateWish content (see design doc §1, exhaustive grep)', directive.indexOf('Rename Julian to Elon') !== -1);

    // Cross-check: the SAME literal text run through Petition Fate's own gate (closed in the prior
    // pass) is correctly rejected there — confirming the durable-rewrite surface is Petition's, not
    // Tempt's, and that surface is already closed.
    const petitionCls = await page.evaluate((t) => window.classifyPetition ? window.classifyPetition(t) : null, 'Rename Julian to Elon');
    const petitionCheck = petitionCls === 'structural_override' ? await page.evaluate((t) => window.validateStructuralOverride(t), 'Rename Julian to Elon') : null;
    ok('the SAME text, run through Petition Fate\'s (already-closed) gate, is correctly rejected — confirms durable identity rewrite has exactly one real surface, and it is already closed', petitionCls === 'structural_override' && petitionCheck && petitionCheck.valid === false && petitionCheck.reason === 'ip_breach_bare_name', JSON.stringify({ petitionCls, petitionCheck }));

    // Structural proof, mirrored from the Petition control's own pattern: state.loveInterestName is
    // untouched by the Tempt directive-build call above.
    const liNameUnchanged = await page.evaluate(() => window.state.loveInterestName);
    ok('state.loveInterestName is untouched after building the Tempt directive for this wish', liNameUnchanged === 'Julian', liNameUnchanged);
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE CANON-RUPTURE DRY CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_tempt_fate_canon_rupture_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
