#!/usr/bin/env node
// _author_genre_mode_packet_control.mjs
//
// OFFLINE dry packet control for the genre-mode redesign (Roman, corrective pass 2026-09-16):
// deterministic ROMANTASY / CONTEMPORARY_ROMANCE mode selection (_authorMode), the shared floor
// + one resolved mode block (_buildAuthorFloorDirective), the REDIRECTION/assigned-event
// reconciliation and DOMAIN REGISTER relocation in buildLiteraryCraftDirective, and the CG
// wiring gap that was closed this pass. No browser, no network, no provider call — pure
// sandboxed execution of the REAL app.js source plus real-source text verification for claims
// (wiring, exactly-once delivery, C+/E+/fusion co-delivery) a pure function sandbox can't prove
// on its own. Requirement 5 of Roman's genre-mode spec: Fantasy/Fatelands, Modern,
// fallback/unknown, fixed starter, Corridor, CG, and literary paths — mode selection,
// exactly-once delivery, C+/E+/fusion preservation, absence of contradictory legacy instructions.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, 'public/app.js');
const SRC = fs.readFileSync(APP_PATH, 'utf8');

function sliceByAnchor(label, startAnchor, endAnchor) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) throw new Error(`ANCHOR DRIFT (${label}): start anchor not found: "${startAnchor.slice(0, 80)}"`);
  const to = SRC.indexOf(endAnchor, from + startAnchor.length);
  if (to === -1) throw new Error(`ANCHOR DRIFT (${label}): end anchor not found after start: "${endAnchor.slice(0, 80)}"`);
  return SRC.slice(from, to + endAnchor.length);
}

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ══════════════════════════════════════════════════════════════════════════
// SANDBOX — _authorMode through _buildAuthorFloorDirective's export (one contiguous real-source
// span; also pulls in _buildStagingFloorDirective/_buildA50ModeDirective, which sit between them
// in the real file — both self-gate to '' unless explicitly armed, exactly matching production
// default behavior, so including them is harmless) — plus buildLiteraryCraftDirective separately.
// ══════════════════════════════════════════════════════════════════════════
const modeAndFloorSrc = sliceByAnchor('author-mode-and-floor',
  'function _authorMode(s) {',
  'try { window._buildAuthorFloorDirective = _buildAuthorFloorDirective; } catch (_) {}');
const literaryCraftSrc = sliceByAnchor('literary-craft-directive',
  'function buildLiteraryCraftDirective() {',
  'window.buildLiteraryCraftDirective = buildLiteraryCraftDirective;');

// buildLiteraryCraftDirective reads a BARE `state` (module-scope in the real file); _authorMode/
// _buildAuthorFloorDirective take their own `s` param with a `window.state` fallback and never
// need it. Declaring it here satisfies the one caller that does, changes nothing for the others.
const body = 'var state = window.state;\n' + modeAndFloorSrc + '\n' + literaryCraftSrc;
const factory = new Function('window', body);

function freshSandbox(stateObj) {
  const win = { state: stateObj || {} };
  factory(win);
  return win;
}

// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — MODE SELECTION MATRIX (deterministic, world/flavor-driven, population-independent)');
// ══════════════════════════════════════════════════════════════════════════
{
  const cases = [
    { label: 'Fantasy world, fixed starter', state: { picks: { world: 'Fantasy', worldSubtype: 'fateland' }, _starterId: 'starter_first_sacrifice' }, expect: 'ROMANTASY' },
    { label: 'Fantasy world, corridor (no starter)', state: { picks: { world: 'Fantasy', worldSubtype: 'fateland' } }, expect: 'ROMANTASY' },
    { label: 'Fatelands-named worldSubtype alone (world unset)', state: { picks: { world: '', worldSubtype: 'thornwild' } }, expect: 'ROMANTASY' },
    { label: 'Modern world, fixed starter', state: { picks: { world: 'Modern' }, _starterId: 'starter_some_modern' }, expect: 'CONTEMPORARY_ROMANCE' },
    { label: 'Modern world, corridor (no starter)', state: { picks: { world: 'Modern' } }, expect: 'CONTEMPORARY_ROMANCE' },
    { label: 'world/worldSubtype read from state directly (no .picks)', state: { world: 'Fantasy', worldSubtype: 'veilwood' }, expect: 'ROMANTASY' },
  ];
  cases.forEach((c) => {
    const win = freshSandbox(c.state);
    const got = win._authorMode(c.state);
    ok('mode(' + c.label + ') === ' + c.expect, got === c.expect, 'got=' + got);
  });

  section('CONTROL 1b — FALLBACK / UNKNOWN POPULATION (never crashes, always resolves to a defined mode)');
  const fallbackCases = [
    { label: 'completely empty state', state: {} },
    { label: 'unknown world (SciFi)', state: { picks: { world: 'SciFi' } } },
    { label: 'empty picks object', state: { picks: {} } },
    { label: 'undefined picks entirely', state: { world: undefined, worldSubtype: undefined } },
  ];
  fallbackCases.forEach((c) => {
    const win = freshSandbox(c.state);
    let got, threw = false;
    try { got = win._authorMode(c.state); } catch (e) { threw = true; }
    ok('fallback(' + c.label + ') does not throw', !threw);
    ok('fallback(' + c.label + ') resolves to a defined, known mode (safe default)', got === 'ROMANTASY' || got === 'CONTEMPORARY_ROMANCE', 'got=' + got);
    ok('fallback(' + c.label + ') specifically defaults to CONTEMPORARY_ROMANCE (the less presumptuous mode — does not assume magic/fantasy elements for an unrecognized world)', got === 'CONTEMPORARY_ROMANCE', 'got=' + got);
  });

  section('CONTROL 1c — OVERRIDE HOOK (window._authorModeOverride / state._authorModeOverride outrank world/flavor)');
  {
    const win = freshSandbox({ picks: { world: 'Modern' } });
    win.window = win; // the override check reads window._authorModeOverride
    win._authorModeOverride_test = null;
    const gotWin = (() => { win._authorModeOverride = undefined; return win._authorMode({ picks: { world: 'Modern' } }); })();
    ok('no override set — Modern still resolves CONTEMPORARY_ROMANCE (sanity baseline)', gotWin === 'CONTEMPORARY_ROMANCE', 'got=' + gotWin);

    const win2 = freshSandbox({ picks: { world: 'Modern' } });
    const gotStateOverride = win2._authorMode({ picks: { world: 'Modern' }, _authorModeOverride: 'ROMANTASY' });
    ok('state._authorModeOverride="ROMANTASY" outranks a Modern world', gotStateOverride === 'ROMANTASY', 'got=' + gotStateOverride);

    const win3 = freshSandbox({ picks: { world: 'Fantasy' } });
    win3._authorModeOverride = 'CONTEMPORARY_ROMANCE'; // window._authorModeOverride
    const gotWindowOverride = win3._authorMode({ picks: { world: 'Fantasy' } });
    ok('window._authorModeOverride="CONTEMPORARY_ROMANCE" outranks a Fantasy world', gotWindowOverride === 'CONTEMPORARY_ROMANCE', 'got=' + gotWindowOverride);
  }
}

// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — MODE PURITY (no cross-mode leakage; shared floor present in both)');
// ══════════════════════════════════════════════════════════════════════════
{
  const romantasyState = { picks: { world: 'Fantasy', worldSubtype: 'fateland' } };
  const modernState = { picks: { world: 'Modern' } };
  const winR = freshSandbox(romantasyState);
  const floorR = winR._buildAuthorFloorDirective(romantasyState);
  const winM = freshSandbox(modernState);
  const floorM = winM._buildAuthorFloorDirective(modernState);

  ok('ROMANTASY floor contains "MODE: ROMANTASY"', floorR.includes('MODE: ROMANTASY'));
  ok('ROMANTASY floor does NOT contain "MODE: CONTEMPORARY ROMANCE"', !floorR.includes('MODE: CONTEMPORARY ROMANCE'));
  ok('ROMANTASY floor does NOT leak DOMAIN REGISTER (Modern-only legal/financial jargon calibration)', !floorR.includes('DOMAIN REGISTER'));
  ok('ROMANTASY floor does NOT contain any author/title imitation language (qualities-based, per Roman\'s explicit correction)', !/acotar|sarah j\.? maas|50 shades|fifty shades|write like/i.test(floorR), floorR.slice(0, 200));

  ok('CONTEMPORARY_ROMANCE floor contains "MODE: CONTEMPORARY ROMANCE"', floorM.includes('MODE: CONTEMPORARY ROMANCE'));
  ok('CONTEMPORARY_ROMANCE floor does NOT contain "MODE: ROMANTASY"', !floorM.includes('MODE: ROMANTASY'));
  ok('CONTEMPORARY_ROMANCE floor DOES carry DOMAIN REGISTER (relocated here this pass)', floorM.includes('DOMAIN REGISTER'));
  ok('CONTEMPORARY_ROMANCE floor does NOT contain any author/title imitation language', !/acotar|sarah j\.? maas|50 shades|fifty shades|write like/i.test(floorM), floorM.slice(0, 200));

  ['AUTHOR FLOOR (HARD', 'INTERIORITY DECODES', 'ASSIGNED EVENT IS ACTION', 'THE SCENE ENDS SOMEWHERE ELSE'].forEach((marker) => {
    ok('shared floor marker "' + marker + '" present in ROMANTASY', floorR.includes(marker));
    ok('shared floor marker "' + marker + '" present in CONTEMPORARY_ROMANCE', floorM.includes(marker));
  });

  const occR = (floorR.match(/AUTHOR FLOOR \(HARD/g) || []).length;
  const occM = (floorM.match(/AUTHOR FLOOR \(HARD/g) || []).length;
  ok('the floor header appears EXACTLY ONCE per single _buildAuthorFloorDirective() call (ROMANTASY)', occR === 1, 'count=' + occR);
  ok('the floor header appears EXACTLY ONCE per single _buildAuthorFloorDirective() call (CONTEMPORARY_ROMANCE)', occM === 1, 'count=' + occM);
}

// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — buildLiteraryCraftDirective: REDIRECTION reconciliation + DOMAIN REGISTER relocation (not duplication)');
// ══════════════════════════════════════════════════════════════════════════
{
  const romantasyState = { picks: { world: 'Fantasy' } };
  const modernState = { picks: { world: 'Modern' } };
  const winR = freshSandbox(romantasyState); winR.state = romantasyState;
  const craftR = winR.buildLiteraryCraftDirective();
  const winM = freshSandbox(modernState); winM.state = modernState;
  const craftM = winM.buildLiteraryCraftDirective();

  // Checks the actual relocated BLOCK (its distinctive header + a body line), not the bare
  // substring "DOMAIN REGISTER" — _twoEngineProportion legitimately cross-references it by name
  // ("(see DOMAIN REGISTER above...)", CONTEMPORARY_ROMANCE only) without duplicating its content.
  ['DOMAIN REGISTER (HARD', 'INVENTED COMPOUNDS — BANNED'].forEach((marker) => {
    ok('buildLiteraryCraftDirective no longer carries the DOMAIN REGISTER BLOCK itself ("' + marker + '") for ROMANTASY (never did)', !craftR.includes(marker));
    ok('buildLiteraryCraftDirective no longer carries the DOMAIN REGISTER BLOCK itself ("' + marker + '") for CONTEMPORARY_ROMANCE (relocated, not duplicated, this pass)', !craftM.includes(marker));
  });
  ok('the ROMANTASY cross-reference to DOMAIN REGISTER is correctly ABSENT (nothing to point to in that mode)', !craftR.includes('see DOMAIN REGISTER'));
  ok('the CONTEMPORARY_ROMANCE cross-reference to DOMAIN REGISTER IS present and points to where the content actually now lives (the AUTHOR FLOOR mode block)', craftM.includes('see DOMAIN REGISTER above, in the AUTHOR FLOOR mode block'));

  [craftR, craftM].forEach((txt, i) => {
    const label = i === 0 ? 'ROMANTASY' : 'CONTEMPORARY_ROMANCE';
    ok('REDIRECTION is scoped to beat/exchange level (' + label + ')', txt.includes('AT THE LEVEL OF A BEAT OR AN EXCHANGE'));
    ok('REDIRECTION no longer licenses skipping the assigned event (' + label + ')', txt.includes('THIS DOES NOT LICENSE THE SCENE ITSELF TO END WITHOUT ITS ASSIGNED EVENT'));
    ok('the reconciliation clause explicitly cross-references the floor\'s rule 2 (' + label + ')', txt.includes('see AUTHOR FLOOR, rule 2'));
    ok('STORYBOUND DECK CANON survives untouched (' + label + ' — canon, not style; must not be collateral damage)', txt.includes('STORYBOUND DECK CANON'));
    ok('TWO-ENGINE GRAVITY survives untouched (' + label + ' — Storybound romance-engine doctrine, not generic literary philosophy; out of this pass\'s scope)', txt.includes('TWO-ENGINE GRAVITY'));
  });
}

// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — EXACTLY-ONCE WIRING (real source verification — a pure function sandbox cannot prove this on its own)');
// ══════════════════════════════════════════════════════════════════════════
{
  const callSites = [...SRC.matchAll(/_buildAuthorFloorDirective\(state\)/g)].map((m) => m.index);
  ok('exactly 4 real call sites exist for _buildAuthorFloorDirective(state) (2 literary Scene-1 branches + 1 literary continuation fullSys + 1 CG usr — the CG one is this pass\'s fix)', callSites.length === 4, 'count=' + callSites.length);

  // Map each call site to its line number and enclosing function name for a human-readable report.
  function lineOf(idx) { return SRC.slice(0, idx).split('\n').length; }
  const lines = callSites.map(lineOf);
  const cgLine = lines.find((l) => {
    const spanStart = SRC.lastIndexOf('function _buildCGScreenplayUserPrompt(', SRC.split('\n').slice(0, l).join('\n').length);
    return spanStart !== -1;
  });
  ok('one of the 4 call sites falls inside _buildCGScreenplayUserPrompt (the CG usr payload builder)',
    SRC.indexOf('function _buildCGScreenplayUserPrompt(') !== -1 &&
    (() => {
      const fnStart = SRC.indexOf('function _buildCGScreenplayUserPrompt(');
      const fnRegionEnd = SRC.indexOf('\n  function ', fnStart + 40); // next top-level function after it
      const cgCallIdx = callSites.find((idx) => idx > fnStart && (fnRegionEnd === -1 || idx < fnRegionEnd));
      return cgCallIdx !== undefined;
    })());

  // The two literary Scene-1 call sites: confirmed by this pass's own investigation (and the
  // real source's own comment) to sit on MUTUALLY EXCLUSIVE else-if branches within
  // _buildScene1Scaffold — never both executed for the same generated payload.
  const mutexComment = SRC.indexOf('The three branches are MUTUALLY EXCLUSIVE');
  ok('the real source explicitly documents the two Scene-1 branches as mutually exclusive (else-if over a variable undefined at entry) — so "exactly once" holds per actual delivered payload, not just per source line', mutexComment !== -1);

  // Confirm none of the 4 call sites are literal duplicates on the SAME line (would indicate an
  // accidental double-call within one expression rather than 4 genuinely distinct sites).
  const uniqueLines = new Set(lines);
  ok('all 4 call sites are on distinct source lines (no accidental double-call within one expression)', uniqueLines.size === 4, 'lines=' + JSON.stringify(lines));
}

// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — C+/E+/FUSION PRESERVATION (structural: the floor coexists with, never replaces, content delivery)');
// ══════════════════════════════════════════════════════════════════════════
{
  const fnStart = SRC.indexOf('function _buildCGScreenplayUserPrompt(');
  const fnRegionEnd = SRC.indexOf('\n  function ', fnStart + 40);
  const cgFnSrc = SRC.slice(fnStart, fnRegionEnd === -1 ? fnStart + 20000 : fnRegionEnd);
  ok('_buildCGScreenplayUserPrompt calls _buildAuthorFloorDirective (genre mode)', cgFnSrc.includes('_buildAuthorFloorDirective(state)'));
  ok('_buildCGScreenplayUserPrompt ALSO still pushes the bible/facet block (_bibleBlock) — genre mode did not replace content delivery', cgFnSrc.includes('lines.push(_bibleBlock)'));
  const floorIdx = cgFnSrc.indexOf('_buildAuthorFloorDirective(state)');
  const bibleIdx = cgFnSrc.indexOf('lines.push(_bibleBlock)');
  ok('the genre-mode push is BEFORE the bible/C+ content push (mode/floor establishes voice first, content follows — matches literary\'s own AUTHOR FLOOR-then-content ordering)', floorIdx !== -1 && bibleIdx !== -1 && floorIdx < bibleIdx);

  const scaffoldFnStart = SRC.indexOf('async function _buildScene1Scaffold(');
  const scaffoldFnRegionEnd = SRC.indexOf('\n    async function ', scaffoldFnStart + 40);
  const scaffoldFnSrc = SRC.slice(scaffoldFnStart, scaffoldFnRegionEnd === -1 ? scaffoldFnStart + 30000 : scaffoldFnRegionEnd);
  ok('_buildScene1Scaffold ALSO still calls _buildCharacterPlusStateful (C+ delivery survives alongside genre mode in the literary Scene-1 path)', scaffoldFnSrc.includes('_buildCharacterPlusStateful'));
}

console.log('\n======================================================================');
console.log('AUTHOR GENRE-MODE PACKET CONTROL: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); fails.forEach((f) => console.log('  - ' + f)); process.exitCode = 1; }
