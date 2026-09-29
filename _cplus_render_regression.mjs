// ═══ C+ RENDER REGRESSION (Codex finding, 2026-09-10) ═══ free, network-fenced. The planner's specific
// `pc_interpretation` and its `pc_lens_operation` must BOTH survive normalization AND rendering into the
// author directive, once each. Before the fix, buildSkeletonDirective rendered the operation INSTEAD OF the
// interpretation whenever the operation existed — the one sentence naming what the act exposes never reached
// the author. RED=interp drops the interpretation at the seam and must turn the assertion red.
import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
const RED = String(process.env.RED || '').toLowerCase();
const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
await installSession(page);
await page.route('**/api/**', r => /\/api\/config\b/.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: configBody() }) : (isAuthOrigin(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })));
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window.buildSkeletonDirective && window._normalizeSceneAssignments, { timeout: 120000 });
const R = await page.evaluate((red) => {
  // Two entries, two branches of buildSkeletonDirective: Seren carries a cited facet (rich branch); the Dohkar
  // carries none (the NO-authored-psychology exception → fallback branch). Both must render both fields once.
  const raw = { character_plus: [
    { character: 'Seren', mode: 'IN_PERSON', behavior: 'BEHAVIOR-A: she answers before the question ends', pc_lens_operation: 'OPERATION_A', pc_interpretation: 'INTERP-A: her compassion needs a witness before it can begin' },
    { character: 'the presiding Dohkar', mode: 'IN_PERSON', behavior: 'BEHAVIOR-B: he names the bent word before anyone asks', pc_lens_operation: 'OPERATION_B', pc_interpretation: 'INTERP-B: being passed over is the only feeling he has left that shows' },
    { character: 'Halvern', mode: 'ANTICIPATED', behavior: 'BEHAVIOR-C: he is spoken of as already on his way', pc_lens_operation: 'OPERATION_C', pc_interpretation: 'INTERP-C: being sent for would mean he had been forgotten' }
  ], environment_plus: null, fusion: null };
  const norm = window._normalizeSceneAssignments(raw, 'reg', 'regression_test');
  const cp = (norm && norm.character_plus) || [];
  const normKeeps = cp.length === 3 && cp.every(c => c.pc_interpretation && c.pc_lens_operation);   // three entries now (the third is the absent recipient)
  cp[0].facet_truth = 'FACET-TRUTH-A (source, never stated)';   // rich branch
  // ABSENT recipient (doctrine rows 5e 6a 6b 6b2 6c3 6e 6f 6g): the planner path stamps these after normalization
  // (not_physically_present at ~266096, first_mention from the plan) — set the same way here.
  cp[2].facet_truth = 'FACET-TRUTH-C (source, never stated)'; cp[2].first_mention = true;
  if (red !== 'absent') cp[2].not_physically_present = true;   // RED=absent: the marker is dropped → the law must vanish
  if (red === 'interp') cp.forEach(c => { delete c.pc_interpretation; });   // the seam: drop the interpretation after normalization
  const st = window.state; const prev = st.sceneSkeleton;
  st.sceneSkeleton = Object.assign({}, prev || {}, { character_plus: cp, environment_plus: null, fusion: null, staged_characters: [], beats: [] });
  let dir = ''; try { dir = window.buildSkeletonDirective() || ''; } catch (e) { dir = 'THREW: ' + (e && e.message); }
  st.sceneSkeleton = prev;
  const count = (h, n) => h.split(n).length - 1;
  return { normKeeps, dirLen: dir.length, interpA: count(dir, 'INTERP-A'), opA: count(dir, 'OPERATION_A'), interpB: count(dir, 'INTERP-B'), opB: count(dir, 'OPERATION_B'), behA: count(dir, 'BEHAVIOR-A'), behB: count(dir, 'BEHAVIOR-B'),
    absentHead: count(dir, '• Halvern (first mention — the beat lands here) — ANTICIPATED; NOT PHYSICALLY PRESENT'), law: count(dir, 'ABSENT PEOPLE STAY ABSENT (HARD)'), trustedNote: count(dir, '"trusted facet" is the established, canonical truth'), truthC: count(dir, 'SOURCE TRUTH — DO NOT STATE: FACET-TRUTH-C'), interpC: count(dir, 'INTERP-C'), opC: count(dir, 'OPERATION_C'), presentHead: count(dir, '• Seren — IN_PERSON'), presentAbsentMarker: count(dir, '• Seren — IN_PERSON; NOT PHYSICALLY PRESENT'),
    snippet: (dir.match(/[^\n]*Seren[\s\S]{0,1400}/) || [''])[0].slice(0, 1400) };
}, RED);
const rows = []; const ok = (n, p, d) => { rows.push(p); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + d)); };
console.log('=== directive excerpt ===\n' + R.snippet + '\n');
ok('R1 normalization keeps pc_interpretation and pc_lens_operation on every entry', R.normKeeps, JSON.stringify(R));
ok('R2 RICH branch (cited facet): the specific interpretation and the lens operation each render EXACTLY ONCE, alongside each other', R.interpA === 1 && R.opA === 1, 'interpA=' + R.interpA + ' opA=' + R.opA + ' dirLen=' + R.dirLen);
ok('R3 FALLBACK branch (no cited facet): the specific interpretation and the lens operation each render EXACTLY ONCE too', R.interpB === 1 && R.opB === 1, 'interpB=' + R.interpB + ' opB=' + R.opB);
ok('R4 each visible action renders once', R.behA === 1 && R.behB === 1, 'behA=' + R.behA + ' behB=' + R.behB);
// ABSENT recipient — doctrine rows 6a/6b/6c3 (mode + NOT PHYSICALLY PRESENT + first-mention tag on the head line), 6b2 (three components + lens), 6e/6g (the law, once), 6f (trusted-facet note), 6d (a PRESENT recipient carries a mode and no absence marker)
ok('R5 [6a 6b 6c3] the absent recipient\'s head line carries first-mention tag, MODE and NOT PHYSICALLY PRESENT, once', R.absentHead === 1, 'absentHead=' + R.absentHead);
ok('R6 [6b2] …and the same construction: SOURCE TRUTH once, interpretation once, lens operation once', R.truthC === 1 && R.interpC === 1 && R.opC === 1, JSON.stringify({ truthC: R.truthC, interpC: R.interpC, opC: R.opC }));
ok('R7 [6e 6g] the NON-MATERIALISATION LAW reaches the author exactly once when an absent recipient exists', R.law === 1, 'law=' + R.law);
ok('R8 [6f] the trusted-facet note is present once', R.trustedNote === 1, 'trustedNote=' + R.trustedNote);
ok('R9 [6d] a PRESENT recipient carries a mode and NO absence marker', R.presentHead === 1 && R.presentAbsentMarker === 0, JSON.stringify({ presentHead: R.presentHead, presentAbsentMarker: R.presentAbsentMarker }));
const R10 = await page.evaluate(() => { const st = window.state; st.playerMask = 'OPEN_VEIN'; st.picks = st.picks || {}; st.picks.playermask = 'OPEN_VEIN'; const line = window._cpBeatLines({ character: 'Marcus Vale', mode: 'IN_PERSON', facet_truth: 'FACET-TRUTH-D (source, never stated)' }, false); return { line, hasCompose: /YOURS TO COMPOSE — through her ESTABLISHED lens, OPEN VEIN/.test(line), noOp: !/lens operation/.test(line), truthOnce: line.split('FACET-TRUTH-D').length - 1 === 1 }; });
ok('R10 CONTINUATION SHAPE: an entry with neither interpretation nor operation asks the author to COMPOSE through her ESTABLISHED lens (OPEN VEIN), names no operation, and does not restate the truth as the reading', R10.hasCompose && R10.noOp && R10.truthOnce && !/what she reads in it/.test(R10.line), R10.line.slice(0, 300));
await browser.close();
const fails = rows.filter(x => !x).length; console.log(`\nC+ RENDER REGRESSION${RED ? ' (RED=' + RED + ')' : ''}: ${rows.length} rows · ${rows.length - fails} passed · ${fails} failed`); process.exit(fails ? 1 : 0);
