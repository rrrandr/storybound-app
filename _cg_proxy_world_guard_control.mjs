// CG PROXY WORLD-GUARD — DRY CONTROL (Roman, 2026-09-22)
//
// Roman, after Temptation attempt 11 (the first real, fully successful authored continuation):
// "the coffee leak matters. That's not a prose taste issue; it's a world-contamination issue in
// pc_proxy_action scaffold fields... Do not hard-code only 'coffee'; add a small protected-modern-
// object guard with tests, and make it world-gated so modern stories are unaffected."
//
// TRACE (dry, no provider calls): pc_proxy_action is 100% model-generated (the CG structural/
// screenplay author's own JSON beat output), not app-computed — see public/app.js's PC PROXY
// ACTION VALIDATOR (~line 229034), which only trims/nulls the field, never invents it. The literal
// string that leaked, "she didn't reach for the coffee", is a STATIC worked example in the CG
// author's own system prompt ("PC PROXY ACTION RULES" GOOD examples list) — the model copied it
// almost verbatim into a Fatelands scene. This is a generic scaffold-template leak, not model
// invention from scratch, not stale cross-story state, and not a separate author-side module.
//
// The real root cause: this app ALREADY HAS a generic, world-gated guard that explicitly bans
// "coffee" by name — buildColloquialismGuardDirective() — used by the literary/prose author path
// (3 call sites). The CG screenplay author's own prompt builder, _buildCGScreenplaySystemPrompt,
// NEVER called it. Zero references to buildColloquialismGuardDirective/buildWorldPhysicsDirective/
// state.picks.world existed anywhere in that ~1500-line function before this fix.
//
// Fixed, both in public/app.js, both dry (no prose edits, no resample, no provider calls):
//   1. _buildCGScreenplaySystemPrompt now calls the EXISTING buildColloquialismGuardDirective()
//      right after the PC PROXY ACTION RULES section, plus a new short WORLD REGISTER note
//      explicitly reframing the GOOD examples as placeholders, not literal props to copy.
//   2. A NEW, small, non-exhaustive, world-gated deterministic guard —
//      _cgWorldGuardModernObjectHit(text, world) — wired as check (c) into the existing PC PROXY
//      ACTION VALIDATOR (diagnostic-only, logs [CG:PROXY:WEAK], never rewrites — a validator that
//      rewrites is a competing author). Not "coffee"-only: covers a small food/drink + tech term
//      list. Gated exactly like buildColloquialismGuardDirective (world && world !== 'Modern').
//
// Proves, fully dry:
//   A. RED — attempt 11's OWN real, captured beat-19 pc_proxy_action text ("she didn't reach for
//      the coffee") is flagged under the real story's world ('Fantasy').
//   B. Non-exhaustive — a second, different modern-object term (not "coffee") is also caught.
//   C. Gated to non-Modern worlds generically, not just Fantasy — Historical world also flags.
//   D. GREEN — the SAME literal text is NOT flagged when world is 'Modern' (modern stories
//      unaffected — coffee-like objects stay allowed where appropriate).
//   E. No false positive on a genuinely fine, already-accepted proxy example under a non-Modern
//      world (no over-blocking of legitimate content).
//   F. Edge cases: empty/undefined world (custom/no-world stories) never throws, never flags.
//   G. WIRING — the real _buildCGScreenplaySystemPrompt(), under a Fantasy-world state, now
//      contains the colloquialism guard's own "coffee" ban text AND the new WORLD REGISTER note —
//      proves the fix reaches the actual dispatched CG author prompt, not just an isolated helper.
//   H. Under a Modern-world state, the guard block is absent from the prompt (unaffected, matching
//      buildColloquialismGuardDirective's own existing Modern-world short-circuit).
//
// usage: node _cg_proxy_world_guard_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Attempt 11's REAL, captured pc_proxy_action text — read verbatim from the preserved, already-
// paid report (not re-typed from memory).
const ATTEMPT11_REPORT = path.join(__dirname, '_scene2_repair_replay_sample_out', 'report_temptation_attempt11.json');
const attempt11 = JSON.parse(fs.readFileSync(ATTEMPT11_REPORT, 'utf8'));
const rawOutput = JSON.parse(attempt11.phaseReports.scene2CgAuthor.rawOutput);
const REAL_LEAKED_BEAT = rawOutput.beats.find((b) => b && b.pc_proxy_action === "she didn't reach for the coffee");
if (!REAL_LEAKED_BEAT) { console.error('HARNESS BLOCKER: attempt 11 report no longer contains the real leaked beat — re-derive the fixture.'); process.exit(2); }
console.log('✓ loaded Temptation attempt 11\'s REAL, already-paid pc_proxy_action leak verbatim: beat ' + REAL_LEAKED_BEAT.idx + ' — "' + REAL_LEAKED_BEAT.pc_proxy_action + '"');
const REAL_LEAKED_TEXT = REAL_LEAKED_BEAT.pc_proxy_action;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_cg_proxy_world_guard_control_out.jsonl') });
  // No stubs registered deliberately — this control only calls exposed window.* functions
  // directly; any /api/** call at all would be a genuine harness bug (fail-closed abort surfaces
  // it immediately).

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state
    && typeof window._cgWorldGuardModernObjectHit === 'function'
    && typeof window._buildCGScreenplaySystemPrompt === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or new functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, both new/touched functions exposed on window\n');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('A-F. _cgWorldGuardModernObjectHit — direct real-function checks');
  {
    const r = await page.evaluate(({ leaked }) => ({
      redAttempt11: window._cgWorldGuardModernObjectHit(leaked, 'Fantasy'),
      redOtherTerm: window._cgWorldGuardModernObjectHit('her thumb hovered over the phone, then withdrew', 'Fantasy'),
      gatedHistorical: window._cgWorldGuardModernObjectHit(leaked, 'Historical'),
      greenModern: window._cgWorldGuardModernObjectHit(leaked, 'Modern'),
      noFalsePositiveRing: window._cgWorldGuardModernObjectHit('the ring rotated once on her finger', 'Fantasy'),
      noFalsePositiveBreath: window._cgWorldGuardModernObjectHit('the breath caught and held', 'Fantasy'),
      emptyWorld: window._cgWorldGuardModernObjectHit(leaked, ''),
      undefinedWorld: window._cgWorldGuardModernObjectHit(leaked, undefined),
      emptyText: window._cgWorldGuardModernObjectHit('', 'Fantasy'),
      nullText: window._cgWorldGuardModernObjectHit(null, 'Fantasy'),
      caseInsensitive: window._cgWorldGuardModernObjectHit('She set the Coffee down untouched.', 'Fantasy'),
    }), { leaked: REAL_LEAKED_TEXT });

    ok('A. RED — attempt 11\'s real leaked text is flagged under Fantasy, hit="coffee"', r.redAttempt11 === 'coffee', JSON.stringify(r.redAttempt11));
    ok('B. Non-exhaustive — a different modern-object term ("phone") is also caught under Fantasy', r.redOtherTerm === 'phone', JSON.stringify(r.redOtherTerm));
    ok('C. Gated generically to non-Modern worlds, not just Fantasy — Historical also flags', r.gatedHistorical === 'coffee', JSON.stringify(r.gatedHistorical));
    ok('D. GREEN — the SAME literal text is NOT flagged under Modern (modern stories unaffected)', r.greenModern === null, JSON.stringify(r.greenModern));
    ok('E1. No false positive — an already-accepted GOOD-example proxy ("the ring rotated...") passes under Fantasy', r.noFalsePositiveRing === null, JSON.stringify(r.noFalsePositiveRing));
    ok('E2. No false positive — a second already-accepted proxy ("the breath caught and held") passes under Fantasy', r.noFalsePositiveBreath === null, JSON.stringify(r.noFalsePositiveBreath));
    ok('F1. Empty world string never throws, never flags (custom/no-world stories safe)', r.emptyWorld === null, JSON.stringify(r.emptyWorld));
    ok('F2. Undefined world never throws, never flags', r.undefinedWorld === null, JSON.stringify(r.undefinedWorld));
    ok('F3. Empty text never throws, never flags', r.emptyText === null, JSON.stringify(r.emptyText));
    ok('F4. Null text never throws, never flags', r.nullText === null, JSON.stringify(r.nullText));
    ok('Case-insensitive match ("Coffee" capitalized mid-sentence) still flags under Fantasy (matched text returned as-found, not case-normalized)', r.caseInsensitive && r.caseInsensitive.toLowerCase() === 'coffee', JSON.stringify(r.caseInsensitive));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('G-H. WIRING — the real CG author system prompt now carries the guard, world-gated');
  {
    const r = await page.evaluate(() => {
      const savedPicks = window.state.picks;
      try {
        window.state.picks = Object.assign({}, savedPicks, { world: 'Fantasy' });
        const fantasyPrompt = window._buildCGScreenplaySystemPrompt();
        window.state.picks = Object.assign({}, savedPicks, { world: 'Modern' });
        const modernPrompt = window._buildCGScreenplaySystemPrompt();
        return { fantasyPrompt, modernPrompt };
      } finally {
        window.state.picks = savedPicks;
      }
    });
    ok('G1. Fantasy-world CG prompt now contains the colloquialism guard\'s own "coffee" ban text (source-traced, not a paraphrase)', /Modern food\/drink names with no world equivalent \(popcorn, pizza, coffee, soda/.test(r.fantasyPrompt), 'prompt length=' + r.fantasyPrompt.length);
    ok('G2. Fantasy-world CG prompt contains the new WORLD REGISTER placeholder note', /GOOD examples above are ENGLISH-REGISTER PLACEHOLDERS/.test(r.fantasyPrompt), 'prompt length=' + r.fantasyPrompt.length);
    ok('G3. Fantasy-world CG prompt still contains the original "she didn\'t reach for the coffee" GOOD example (untouched — not a prose edit, the guard supersedes it via instruction, not deletion)', /she didn't reach for the coffee/.test(r.fantasyPrompt), 'unexpected: example line removed');
    ok('H. Modern-world CG prompt does NOT contain the colloquialism guard block (modern stories unaffected, matches buildColloquialismGuardDirective\'s own existing Modern short-circuit)', !/Modern food\/drink names with no world equivalent/.test(r.modernPrompt), 'unexpected: guard leaked into Modern-world prompt');
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CG PROXY WORLD-GUARD CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_cg_proxy_world_guard_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
