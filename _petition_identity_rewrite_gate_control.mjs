// PETITION FATE IDENTITY-REWRITE VALIDATION — DRY CONTROL (Roman, 2026-09-22)
//
// Roman: "Next step should be Petition Fate identity/real-person rewrite validation, not Tempt
// Fate yet. The 'Elon / gender / LI rename' issue is concrete, high-risk, and structurally
// different from ordinary Say/Do." No paid calls, no prose generation, no image work. Tempt Fate
// canon-rupture handling untouched, per instruction.
//
// TRACED (this pass, personally re-verified against current source, not trusted from the earlier
// adversarial-input research pass): the real Petition submit flow (two near-duplicate call sites,
// ~107320 and ~116020) runs, in order: sanitizeWishInput (scrubs full real-person/franchise names,
// e.g. "elon musk" -> "a public figure") -> validatePetitionText -> normalizePetitionInput ->
// classifyPetition(text) -> IF classification === 'structural_override': validateStructuralOverride
// (text) as a hard gate, reject-and-return on failure, BEFORE state.volatility_window is ever set
// (confirmed: the reject-and-return sits textually and functionally before the volatility_window
// assignment in the same function, which is the only mechanism that surfaces petition wishText to
// _buildCGPetitionDirective/buildWorldLawDirective for a future author prompt).
//
// A DEEPER TRACE than the earlier research pass did (following "where the resulting change reaches
// story state"): a structural_override petition does NOT go through AI text generation or mutate
// state.loveInterestName AT ALL. It redirects into a real, existing UI: triggerPcLookModal (PC),
// triggerCastCustomizeModal (LI, only for 2+-candidate multi-LI stories -- an APPEARANCE-only
// editor, "hair, build, distinguishing marks", gated by classifyPetition's own real match against
// EXISTING cast candidates, never a free rename field), or triggerLiFaceReveal (LI, single-LI
// stories -- discards the petition text entirely, opens the standard face-reveal modal). No code
// path reachable from Petition Fate writes to any name or gender field. This materially narrows the
// real risk versus the original assumption: the live exposure is the Cast Customize textarea
// (multi-LI stories only) pre-populating with raw petition text and passing it through
// sanitizeShortInput on save -- which inherits the SAME bare-first-name gap this fix closes
// upstream, so fixing validateStructuralOverride (which runs BEFORE that modal can ever open)
// prevents the dangerous text from ever reaching that pre-fill in the first place.
//
// FIXED, both in public/app.js, both generic (not First-Sacrifice-specific -- these are the shared
// Petition-mechanics functions used by any starter):
//   1. classifyPetition's structural_override trigger regex gained "gender" as a recognized
//      attribute -- a gender-change request is now classified and handled deliberately instead of
//      falling through unclassified to the weaker general Eight-Orders wish path.
//   2. validateStructuralOverride gained two new checks: (a) a NARROW bare-first-name check for
//      exactly two of the six names already on the full-name IP-breach list -- "elon" and "darth"
//      only, because both are genuinely unambiguous (Darth is not a real given name outside Star
//      Wars; Elon reads as Musk by default in casual 2020s usage) -- deliberately excluding
//      "taylor" and "harry", both common, ordinary English first names with real non-celebrity use,
//      per Roman's explicit instruction not to globally ban common first names; and (b) an explicit
//      "unsupported_gender_change" rejection, since tracing confirmed there is no real
//      continuity-migration pathway for a mid-story LI gender change today, and silently routing it
//      into the appearance-only Cast Customize/Face-Reveal flow would not do what was asked.
//
// usage: node _petition_identity_rewrite_gate_control.mjs
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
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_petition_identity_rewrite_gate_control_out.jsonl') });
  // No stubs registered deliberately — direct window.* function calls only; any /api/** call would
  // be a genuine harness bug, and would mean this "no paid calls" pass accidentally spent money.

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window.classifyPetition === 'function'
    && typeof window.validateStructuralOverride === 'function'
    && typeof window.sanitizeWishInput === 'function', { timeout: 25000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  async function runPipeline(text) {
    return page.evaluate((t) => {
      const san = window.sanitizeWishInput(t);
      const cls = san.valid ? window.classifyPetition(san.text) : null;
      const so = (cls === 'structural_override') ? window.validateStructuralOverride(san.text) : null;
      // Mirrors the real Submit handler's own control flow: rejected at any stage -> never reaches
      // the volatility_window assignment that would surface text to a future author prompt.
      const blocked = !san.valid || (cls === 'structural_override' && so && !so.valid);
      return { sanitizedText: san.text, valid: san.valid, classification: cls, structuralOverrideCheck: so, wouldReachAuthorPrompt: !blocked };
    }, text);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. "Make the LI a different gender and change his name to Elon" — the user\'s own compound example');
  {
    const r = await runPipeline('Make the LI a different gender and change his name to Elon');
    ok('classified as structural_override (both "gender" and "name" attributes present)', r.classification === 'structural_override', JSON.stringify(r));
    ok('rejected (bare "Elon" caught — fires before the gender check, either reason is a correct block)', r.structuralOverrideCheck && r.structuralOverrideCheck.valid === false, JSON.stringify(r));
    ok('would NOT reach a future author prompt as accepted canon', r.wouldReachAuthorPrompt === false, JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. "Rename Julian to Elon" — the concrete, previously-unblocked gap');
  {
    const r = await runPipeline('Rename Julian to Elon');
    ok('classified as structural_override', r.classification === 'structural_override', JSON.stringify(r));
    ok('rejected with reason ip_breach_bare_name (the specific fix)', r.structuralOverrideCheck && r.structuralOverrideCheck.valid === false && r.structuralOverrideCheck.reason === 'ip_breach_bare_name', JSON.stringify(r));
    ok('would NOT reach a future author prompt as accepted canon', r.wouldReachAuthorPrompt === false, JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. "Make Julian Elon Musk" — proves the PRE-EXISTING upstream scrub already handles the full-name case');
  {
    const r = await runPipeline('Make Julian Elon Musk');
    ok('sanitizeWishInput already anonymizes "Elon Musk" to "a public figure" BEFORE classification — the literal identity never survives regardless of classification outcome', r.sanitizedText === 'Make Julian a public figure', JSON.stringify(r));
    ok('would NOT reach a future author prompt with the real name intact', r.sanitizedText.indexOf('Elon') === -1 && r.sanitizedText.indexOf('Musk') === -1, JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. Safe fictional rename — must still be ALLOWED (no over-blocking)');
  {
    const r = await runPipeline('Rename Julian to Marcus');
    ok('classified as structural_override', r.classification === 'structural_override', JSON.stringify(r));
    ok('correctly ALLOWED — an ordinary, non-celebrity name is not blocked by either the full-name or the narrow bare-name check', r.structuralOverrideCheck && r.structuralOverrideCheck.valid === true, JSON.stringify(r));
    ok('would legitimately reach the normal petition flow (not blocked)', r.wouldReachAuthorPrompt === true, JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Gender change — explicitly rejected, not silently mishandled');
  {
    const r1 = await runPipeline('change his gender');
    ok('"change his gender" classifies as structural_override (the routing fix)', r1.classification === 'structural_override', JSON.stringify(r1));
    ok('rejected with reason unsupported_gender_change, not silently routed into the appearance-only flow', r1.structuralOverrideCheck && r1.structuralOverrideCheck.valid === false && r1.structuralOverrideCheck.reason === 'unsupported_gender_change', JSON.stringify(r1));

    // BEFORE this fix, "change his gender" alone (no "name") would not have matched the
    // structural_override trigger regex at all — confirm the routing gap is closed, not just the
    // rejection reason.
    const r2 = await page.evaluate(() => window.classifyPetition('I want my love interest to change gender'));
    ok('a differently-phrased gender request also routes to structural_override now', r2 === 'structural_override', JSON.stringify(r2));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. Non-identity sentence mentioning "Elon" — must NOT false-positive');
  {
    const r = await runPipeline('My cousin Elon called earlier to say hello');
    ok('does NOT classify as structural_override (no rename-operation phrasing present)', r.classification !== 'structural_override', JSON.stringify(r));
    ok('the bare "Elon" mention is left untouched — sanitizeWishInput\'s own real-person scrub correctly requires the full "Elon Musk" phrase, and this sentence never reaches validateStructuralOverride at all since it is not classified as a rewrite operation', r.sanitizedText === 'My cousin Elon called earlier to say hello' && r.structuralOverrideCheck === null, JSON.stringify(r));
    ok('would legitimately reach the normal petition flow (not falsely blocked)', r.wouldReachAuthorPrompt === true, JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. ANTI-OVER-REACH — "taylor" and "harry" are deliberately NOT bare-banned (common ordinary first names)');
  {
    const r1 = await runPipeline('Rename Julian to Taylor');
    ok('"Taylor" as a rename target is ALLOWED — common, ordinary English first name, not exclusively a celebrity identifier', r1.structuralOverrideCheck && r1.structuralOverrideCheck.valid === true, JSON.stringify(r1));
    const r2 = await runPipeline('Rename Julian to Harry');
    ok('"Harry" as a rename target is ALLOWED — same reasoning (Prince Harry/Harry Styles exist, but so does every ordinary Harry)', r2.structuralOverrideCheck && r2.structuralOverrideCheck.valid === true, JSON.stringify(r2));
    // Full-name matches for these two are handled the SAME way as "Elon Musk" in section 3: the
    // upstream sanitizeWishInput scrub anonymizes the full name to "a public figure" BEFORE
    // classification ever runs, so by the time validateStructuralOverride sees the text, the real
    // identity is already gone and a valid:true verdict on the SCRUBBED text is correct, not a
    // regression. (Confirmed by first checking the raw assertion I originally wrote — expecting an
    // ip_breach rejection reason — actually failed, which is what caught this.)
    const r3 = await runPipeline('Rename Julian to Taylor Swift');
    ok('"Taylor Swift" (full name) never reaches the future author prompt with the real identity intact — pre-existing upstream scrub, unaffected by this pass', r3.sanitizedText.indexOf('Taylor') === -1 && r3.sanitizedText.indexOf('Swift') === -1, JSON.stringify(r3));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('8. STRUCTURAL PROOF — the reject-and-return happens before volatility_window is ever set');
  {
    // Static, source-level proof (no paid dispatch needed or performed): confirm the real Submit
    // handler's control-flow ordering directly, matching this session's own established pattern
    // for proving "authoring is blocked" without a live click-through.
    const src = await page.evaluate(() => document.documentElement.outerHTML.length > 0); // trivial liveness check, not the real proof
    ok('harness reached a live page (sanity check for this section\'s framing)', src === true);
  }
  {
    // The real proof: fetch the served app.js and confirm the code-order fact directly, since this
    // is a claim about SOURCE STRUCTURE, not runtime behavior a page.evaluate can observe.
    //
    // NOTE: a naive appJs.indexOf('state.volatility_window = {') picks up the FIRST textual match
    // in the whole file, which is an unrelated `{ active: false, ... }` RESET assignment (a
    // different mechanism entirely, not the Petition path) sitting earlier in the file than either
    // real Petition call site. There are two near-duplicate Petition submit call sites in app.js
    // (confirmed via grep: soCheck at ~107398/~116084, the real wishText-bearing volatility_window
    // assignment at ~107488/~116127) — this proof checks EACH call site's own local ordering, not a
    // single global indexOf.
    const appJs = await (await fetch('http://localhost:3000/app.js')).text();
    const soCheckMarker = 'if (!soCheck.valid) {';
    const volWinMarker = 'state.volatility_window = {';
    const callSites = [];
    let searchFrom = 0;
    while (true) {
      const soIdx = appJs.indexOf(soCheckMarker, searchFrom);
      if (soIdx === -1) break;
      // The matching volatility_window assignment for THIS call site is the next occurrence of the
      // marker after this soCheck — bounded to a generous 5000-char window so an unrelated, much
      // later occurrence in a different function can't be mistaken for this call site's own.
      const volIdx = appJs.indexOf(volWinMarker, soIdx);
      const withinWindow = volIdx !== -1 && (volIdx - soIdx) < 5000;
      callSites.push({ soIdx, volIdx, withinWindow, orderedCorrectly: withinWindow && soIdx < volIdx });
      searchFrom = soIdx + soCheckMarker.length;
    }
    ok('found both known Petition submit call sites (soCheck occurrences)', callSites.length === 2, JSON.stringify(callSites));
    ok('EVERY call site: the structural-override reject-and-return sits BEFORE its own volatility_window assignment in source order', callSites.length > 0 && callSites.every((c) => c.orderedCorrectly), JSON.stringify(callSites));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('PETITION FATE IDENTITY-REWRITE GATE CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_petition_identity_rewrite_gate_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
