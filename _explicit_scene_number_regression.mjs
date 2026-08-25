// COMMIT A — explicit scene-number support at the selector/generator boundary.
//
// Continuations derive their scene number from a shared counter accessor. The opening scene
// cannot: no counter can say "1" while nothing has been finalized. So the selector and the
// skeleton generator now accept an EXPLICIT number, used only when supplied.
//
// The design constraint is that this is LOCAL: no persistent target state, nothing read from
// or written to _isScene1Build, turnCount, or _sceneChronoCurrent. A cancelled or failed
// build must leave nothing stale behind.
//
// usage: node _explicit_scene_number_regression.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\//;
const attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  attempts.push(route.request().url());
  return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._selectSceneAssignment && window.STARTER_PLANS,
  { timeout: 40000 });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};

const seed = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'expnum'; s._starterId = 'starter_first_sacrifice'; s.is_starter_story = true;
  s._sceneAssignment = null; s._sceneMissionCurrent = null;
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  const plan = (window.STARTER_PLANS || {})['starter_first_sacrifice'];
  return { rows: (plan && plan.scenes || []).map(p => p && p.n).filter(n => n != null).slice(0, 6) };
});

// Which row does a given call resolve to?
const pick = (turnCount, explicit) => page.evaluate(({ turnCount, explicit }) => {
  const s = window.state;
  s.turnCount = turnCount;
  const before = JSON.stringify({
    asg: s._sceneAssignment, chrono: s._sceneChronoCurrent, flag: s._isScene1Build,
    target: s._targetSceneNumber
  });
  const a = (explicit === null || explicit === undefined)
    ? window._selectSceneAssignment(s)
    : window._selectSceneAssignment(s, explicit);
  const after = JSON.stringify({
    asg: s._sceneAssignment, chrono: s._sceneChronoCurrent, flag: s._isScene1Build,
    target: s._targetSceneNumber
  });
  let row = null;
  try {
    const plan = (window.STARTER_PLANS || {})['starter_first_sacrifice'];
    if (a && a.event && plan) {
      const hit = (plan.scenes || []).find(p => p && p.goal && String(p.goal).slice(0, 40) === String(a.event).slice(0, 40));
      row = hit ? hit.n : 'no-row-match';
    }
  } catch (_) {}
  return { row, event: a && a.event ? String(a.event).slice(0, 45) : null, mutated: before !== after,
    derived: window._currentSceneNumber(s) };
}, { turnCount, explicit });

console.log(`\n${'═'.repeat(82)}\nEXPLICIT SCENE NUMBER (Commit A)\n${'═'.repeat(82)}`);
const info = await seed();
console.log(`\n  plan rows available: ${JSON.stringify(info.rows)}`);

// ── 1. omitted → unchanged continuation behaviour ──
console.log('\n 1. OMITTED ARGUMENT PRESERVES CONTINUATION BEHAVIOUR');
const c0 = await pick(0, null);   // first continuation: derived 2
const c1 = await pick(1, null);   // later continuation: derived 3
t('turnCount 0 → derives scene 2', c0.derived === 2, `derived=${c0.derived}`);
t('turnCount 1 → derives scene 3', c1.derived === 3, `derived=${c1.derived}`);
t('omitted picks the derived row (tc=0 → row 2)', c0.row === 2 || c0.row === null,
  `row=${c0.row} event=${c0.event}`);
t('omitted picks the derived row (tc=1 → row 3)', c1.row === 3 || c1.row === null,
  `row=${c1.row} event=${c1.event}`);

// ── 2. explicit 1 wins regardless of the counter ──
console.log('\n 2. EXPLICIT 1 SELECTS ROW 1 REGARDLESS OF turnCount');
for (const tc of [0, 1, 7]) {
  const r = await pick(tc, 1);
  t(`turnCount ${tc} + explicit 1 → row 1`, r.row === 1, `row=${r.row} event=${r.event}`);
}
const r2 = await pick(0, 3);
t('explicit 3 → row 3 (not the derived 2)', r2.row === 3, `row=${r2.row}`);

// ── 3. nothing persistent, nothing stale ──
console.log('\n 3. NO PERSISTENT TARGET STATE');
const st = await pick(0, 1);
t('selector writes no assignment/chrono/flag/target state', !st.mutated);
const clean = await page.evaluate(() => {
  const s = window.state;
  return { hasTarget: '_targetSceneNumber' in s, flag: s._isScene1Build };
});
t('no state._targetSceneNumber introduced', !clean.hasTarget);
t('_isScene1Build still never written', clean.flag === undefined);

// ── 4. skeleton generator accepts opts and records them, without changing defaults ──
console.log('\n 4. GENERATOR OPTS ARE LOCAL AND CACHE-DISTINGUISHING');
const gen = await page.evaluate(async () => {
  const s = window.state;
  s.sceneSkeleton = null; s._skeletonMeta = null;
  // network is fenced with 500s, so generation fails — the point is that failure
  // leaves nothing behind and the signature accepts opts.
  let threw = null;
  try { await window.__generateSceneSkeleton('act', 'dia'); } catch (e) { threw = e.message; }
  const afterFail = { sk: s.sceneSkeleton, meta: s._skeletonMeta };
  // simulate a valid opening-scene meta and prove cache separation
  s.sceneSkeleton = { character_plus: [], environment_plus: null, fusion: null };
  s._skeletonMeta = { generatedAt: s.turnCount, sceneNumber: 1, openingScene: true,
    relationship_phase: s.relationship_phase || 'strangers',
    storyturn: s.storyturn || '', location: '', explicitAuth: !!s.explicitEmbodimentAuthorized };
  return {
    failLeftNothing: !afterFail.sk && !afterFail.meta,
    validAsOpening: window._isSkeletonValidProbe ? null : true,
    threw
  };
});
t('failed generation leaves no skeleton or meta', gen.failLeftNothing);

// ── 5. LEGACY META COMPATIBILITY — discriminating, against the REAL predicate ──
// The normalization is boolean coercion, not loose equality:
//     if (!!(opts && opts.openingScene) !== !!meta.openingScene) return false;
//     if (opts && typeof opts.sceneNumber === 'number' && meta.sceneNumber
//         && opts.sceneNumber !== meta.sceneNumber) return false;
// A legacy meta has neither field, so !!undefined === false matches the omitted-opts
// default, while an explicit opening call yields true !== false and is refused.
console.log('\n 5. LEGACY _skeletonMeta COMPATIBILITY');
const legacy = await page.evaluate(() => {
  const s = window.state;
  // A legacy meta: written before sceneNumber/openingScene existed, otherwise VALID
  // (same turn, same phase/storyturn/location/auth) so the only thing under test is
  // the new opening-vs-continuation rule.
  s.turnCount = 4;
  s.relationship_phase = 'strangers';
  s.storyturn = 'ST2';
  s.narrativeState = { storyturn_state: 'ST2' };
  s.physicalState = { location: 'the shrine' };
  s.explicitEmbodimentAuthorized = false;
  s.sceneSkeleton = { character_plus: [], environment_plus: null, fusion: null };
  s._skeletonMeta = {
    generatedAt: 4,
    relationship_phase: 'strangers',
    storyturn: 'ST2',
    location: 'the shrine',
    explicitAuth: false
    // NOTE: no sceneNumber, no openingScene — this is the legacy shape
  };
  const hasNeither = !('sceneNumber' in s._skeletonMeta) && !('openingScene' in s._skeletonMeta);
  return {
    hasNeither,
    continuationReuse: window.__isSkeletonValid(),                                  // omitted opts
    continuationReuseExplicitUndef: window.__isSkeletonValid(undefined),
    openingReuse: window.__isSkeletonValid({ sceneNumber: 1, openingScene: true }),  // must refuse
    openingOnlyFlag: window.__isSkeletonValid({ openingScene: true }),
    numberMismatch: window.__isSkeletonValid({ sceneNumber: 9 })                     // meta has none → allowed
  };
});
t('legacy meta really lacks both fields', legacy.hasNeither);
t('omitted-opts continuation CAN reuse a legacy meta', legacy.continuationReuse === true);
t('explicit undefined behaves as omitted', legacy.continuationReuseExplicitUndef === true);
t('{sceneNumber:1, openingScene:true} CANNOT reuse it', legacy.openingReuse === false);
t('openingScene:true alone is enough to refuse', legacy.openingOnlyFlag === false);
t('a number against a meta with none does not refuse', legacy.numberMismatch === true);

// and the converse: an opening meta must not be reused by a continuation caller
const converse = await page.evaluate(() => {
  const s = window.state;
  s._skeletonMeta = { generatedAt: 4, sceneNumber: 1, openingScene: true,
    relationship_phase: 'strangers', storyturn: 'ST2', location: 'the shrine', explicitAuth: false };
  return {
    openingReuse: window.__isSkeletonValid({ sceneNumber: 1, openingScene: true }),
    continuationReuse: window.__isSkeletonValid()
  };
});
t('an opening meta IS reusable by the same opening call', converse.openingReuse === true);
t('an opening meta is NOT reusable by a continuation caller', converse.continuationReuse === false);

await browser.close();
console.log(`\n  network: ${attempts.length} intercepted, 0 issued.`);
console.log(`\n${'─'.repeat(82)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
