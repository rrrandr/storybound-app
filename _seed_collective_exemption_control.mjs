// SEED-COLLECTIVE EXEMPTION CONTROL. Provider-free, $0.
//
// THE DEFECT THIS LOCKS DOWN, measured on a live FS planner call (2026-10-02, $0.013438):
// the planner returned a correct scene-local continuation and the persistence guard rejected it
// because "assembly" appeared in branch_b and event_slots.exit_state —
//     "A body the player named is not canon by that act alone… Either adopt it as durable canon…"
// but "the assembly" IS canon: a structured seed collective, { id:'the_assembly',
// label:'the assembly' }. The guard's own remedy would have minted a duplicate of it.
//
// BOTH DIRECTIONS MATTER EQUALLY. Loosening a guard is only safe if the thing it was built to catch
// is still caught, so every exemption case here is paired with an unseeded body that must still be
// rejected. The real captured planner reply is used verbatim as the primary case.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS } from './_fs_story_setup.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== SEED-COLLECTIVE EXEMPTION CONTROL (provider-free, $0) ===\n');

// THE REAL CAPTURED REPLY. Not a hand-written approximation: the actual content of the one live FS
// planner call, read from its run directory.
const capDirs = fs.existsSync('_fs_planner_capture_out')
  ? fs.readdirSync('_fs_planner_capture_out').filter(d => /^run_/.test(d)).sort() : [];
let captured = null, capturedFrom = null;
for (let i = capDirs.length - 1; i >= 0; i--) {
  const p = '_fs_planner_capture_out/' + capDirs[i] + '/planner_response.json';
  if (!fs.existsSync(p)) continue;
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const c = j.content
      || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    const s = c.indexOf('{'), e = c.lastIndexOf('}');
    if (s < 0 || e < 0) continue;
    captured = JSON.parse(c.slice(s, e + 1));
    capturedFrom = p;
    break;
  } catch (_) {}
}
if (!captured) {
  console.error('REFUSED: no captured FS planner response found under _fs_planner_capture_out/.');
  console.error('  This control asserts against the REAL reply, never a hand-written stand-in.');
  process.exit(4);
}
console.log('  captured reply read from ' + capturedFrom);
console.log('  its pressure_scope = ' + JSON.stringify(captured.pressure_scope)
  + ', canon_change = ' + JSON.stringify(captured.canon_change)
  + ', introduces = ' + JSON.stringify(captured.introduces));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && typeof window._validateContinuationProposal === 'function'
  && typeof window._seedCollectiveNames === 'function', { timeout: 20000 });

// THE FS STORY MUST BE ACTIVE, or there is no seed to read collectives from — and then the
// exemption would be vacuously absent rather than tested.
const def = await findFSDef(page);
await launchFS(page, def);
await unlockFS(page, 'exemption-control');

const seedNames = await page.evaluate(() => window._seedCollectiveNames());
console.log('  seed collectives the guard now knows: ' + JSON.stringify(seedNames) + '\n');

console.log('1. the seed actually declares the collective (otherwise nothing below means anything)');
t('the active seed yields at least one structured collective', seedNames.length > 0,
  JSON.stringify(seedNames));
t('"the assembly" is among them',
  seedNames.some(n => n.indexOf('assembly') >= 0), JSON.stringify(seedNames));
t('presentGroups prose did NOT leak in — no parentheticals, no "unnamed"',
  seedNames.every(n => !/[()]|unnamed|no dialogue/.test(n)), JSON.stringify(seedNames));

const validate = (reply) => page.evaluate((r) => {
  const out = window._validateContinuationProposal(r);
  return { ok: !!out.ok, outcome: out.outcome || null,
    why: Array.isArray(out.why) ? out.why : (out.why ? [String(out.why)] : []),
    persistenceViolation: !!out.persistenceViolation };
}, reply);
const persistenceWhy = (v) => v.why.filter(w => /continuing (body|referent)/i.test(w));

// ── 2. THE REAL REPLY PASSES ────────────────────────────────────────────────
console.log('\n2. THE REAL CAPTURED REPLY — the established assembly no longer rejects it');
{
  const v = await validate(captured);
  t('no persistence violation is raised', v.persistenceViolation === false,
    JSON.stringify(persistenceWhy(v)));
  t('nothing complains about a continuing body', persistenceWhy(v).length === 0,
    JSON.stringify(persistenceWhy(v)));
  t('the reply is ACCEPTED', v.ok === true, v.outcome + ' :: ' + JSON.stringify(v.why).slice(0, 300));
  if (!v.ok) console.log('     full why: ' + JSON.stringify(v.why, null, 2).slice(0, 900));
}

// ── 3. AN UNSEEDED BODY IS STILL REJECTED ───────────────────────────────────
// The same reply shape, with the established collective swapped for a body the seed never declared.
// If this passes, the exemption has become the escape hatch it was written to avoid.
console.log('\n3. AN UNSEEDED continuing body in the same fields is STILL rejected');
const swap = (obj, from, to) => JSON.parse(JSON.stringify(obj)
  .replace(new RegExp(from, 'gi'), to));
{
  const unseeded = swap(captured, 'assembly', 'Toll Road Commission');
  const v = await validate(unseeded);
  t('a persistence violation IS raised', v.persistenceViolation === true,
    JSON.stringify(v.why).slice(0, 200));
  t('the complaint names the unseeded body', persistenceWhy(v).length > 0
    && /commission/i.test(persistenceWhy(v).join(' ')), JSON.stringify(persistenceWhy(v)));
  t('the reply is REJECTED', v.ok === false, v.outcome);
}
{
  // A second, lowercase-only unseeded body — the case the guard was extended for earlier.
  const unseeded = swap(captured, 'assembly', 'tribunal');
  const v = await validate(unseeded);
  t('a lowercase unseeded body ("the tribunal") is rejected too', v.ok === false
    && v.persistenceViolation === true, JSON.stringify(persistenceWhy(v)).slice(0, 200));
}

// ── 4. FORWARD_PRESSURE, BOTH WAYS ──────────────────────────────────────────
// Route (i) of the guard reads forward_pressure alone. It must exempt the seed collective and still
// catch an unseeded body there.
console.log('\n4. forward_pressure: the seed collective is exempt, an unseeded body is not');
{
  const base = { scene_purpose: 'Hold the review open', pressure_scope: 'scene_local',
    canon_change: null, introduces: [] };
  const okReply = Object.assign({}, base,
    { forward_pressure: 'The assembly now waits for Lirael to answer the review.' });
  const v1 = await validate(okReply);
  t('"The assembly" in forward_pressure does not trip the guard',
    persistenceWhy(v1).length === 0 && v1.persistenceViolation === false,
    JSON.stringify(v1.why).slice(0, 220));
  const badReply = Object.assign({}, base,
    { forward_pressure: 'The commission now waits for Lirael to answer the review.' });
  const v2 = await validate(badReply);
  t('"The commission" in forward_pressure still trips it',
    v2.persistenceViolation === true, JSON.stringify(v2.why).slice(0, 220));
}

// ── 5. THE EXEMPTION IS SCOPED, NOT A WILDCARD ──────────────────────────────
// A longer name that merely CONTAINS the collective's word must not inherit the exemption.
console.log('\n5. the exemption is scoped to the canonical name, not to the word');
{
  const base = { scene_purpose: 'x', pressure_scope: 'scene_local', canon_change: null,
    introduces: [] };
  const v = await validate(Object.assign({}, base,
    { forward_pressure: 'The Assembly of Ways now holds the writ and must answer it.',
      branch_a: 'press the Assembly of Ways', branch_b: 'withdraw the writ',
      exit_state: 'the writ sits with the Assembly of Ways' }));
  t('"the Assembly of Ways" is NOT exempted by "the assembly"',
    v.persistenceViolation === true || persistenceWhy(v).length > 0,
    'outcome=' + v.outcome + ' why=' + JSON.stringify(v.why).slice(0, 220));
}

// ── 6. NO SEED, NO EXEMPTION ────────────────────────────────────────────────
// On a story with no active seed plan the list must be empty, so nothing is silently exempted for
// corridor-created stories.
console.log('\n6. a story with no seed gets no exemptions');
{
  // The FS page is closed first: left open it keeps working (deferred CG scaffolding, image
  // plumbing) and the second page's load timed out competing with it. Closing is enough — the
  // assertion below needs a fresh page, not a concurrent one.
  await page.close();
  const page2 = await browser.newPage();
  await page2.route('**/api/**', r => r.abort());
  await page2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page2.waitForFunction(() => typeof window._seedCollectiveNames === 'function', { timeout: 30000 });
  const none = await page2.evaluate(() => {
    window.state = window.state || {};
    delete window.state._starterId;
    return window._seedCollectiveNames();
  });
  t('no starter id yields an empty exemption list', Array.isArray(none) && none.length === 0,
    JSON.stringify(none));
  await page2.close();
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
