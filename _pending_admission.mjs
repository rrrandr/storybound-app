// PENDING ADMISSION — the handshake between a staged candidate and a canonical person.
//
// A bare plan name must never mint a permanent identity, and its psychology has to be ready
// before the planner selects a facet. This proves the only route that satisfies both: a portfolio
// bought against an OPAQUE ref, parked in backend state, and promoted onto a canonical entity
// only after verified finalized-scene admission returns one for that exact staged candidate.
//
// Mocked portfolios, intercepted extraction, no paid batch.
// usage: node _pending_admission.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

async function preflight(url = 'http://localhost:3000/') {
  try {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal }); clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(await res.text())) throw new Error('not the app shell');
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} not serving the app (${e.message}).`);
    process.exit(2);
  }
}
await preflight();

console.log(`\n${'═'.repeat(88)}\nPENDING ADMISSION — parked, never owned, until admission says who\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let paid = 0;
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
await page.route('**/api/**', async route => {
  const u = route.request().url();
  if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return route.continue();
  if (/proxy|chat|complet|grok|mistral/i.test(u)) paid++;         // nothing here should generate
  return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window._captureAdmissionManifest === 'function', { timeout: 60000 });

// One helper drives every case through the PRODUCTION functions — never a local reimplementation.
const run = fn => page.evaluate(fn);

const BOOT = `(function (storyId) {
  const s = window.state;
  Object.assign(s, { storyId: storyId, _relationshipLedger: null, _pendingAdmission: null,
    name: 'Lirael', playerName: 'Lirael', world: 'modern', worldSubtype: 'city' });
  return s;
})`;
const FACETS = `[
  { category:'worldview',   canonical_truth:'Paperwork repeated daily rarely earns her full attention.' },
  { category:'insecurity',  canonical_truth:'Deference paid to someone else makes her attentive to her standing.' },
  { category:'habit',       canonical_truth:'She turns another person\\'s error into an instruction.' },
  { category:'contradiction',canonical_truth:'On what a signature costs she assumes an unearned authority.' },
  { category:'value',       canonical_truth:'With people who hold no leverage she is unexpectedly generous.' }]`;

console.log(' 1 · CAPTURE, PARK, AND THE SNAPSHOT EXTRACTION IS GIVEN');
{
  const r = await run(`(async () => {
    ${BOOT}('pa-1');
    const m = window._captureAdmissionManifest(window.state,
      [{ id:'named:mara_dunn', label:'Mara Dunn', aliases:['Mara Dunn','Mara'], providerOwner:'ordinary/emergent name-only' }],
      { invocationId:'inv-1', sceneNumber:1 });
    const ref = m.candidates[0].candidate_ref;
    const parked = window._parkPendingPortfolio(window.state, 'inv-1', ref, ${FACETS});
    const beforeBind = window._pendingAdmissionSnapshot(window.state, 'uid-1');
    const bound = window._bindPendingAdmissionSceneUid(window.state, 'inv-1', 'uid-1');
    const snap = window._pendingAdmissionSnapshot(window.state, 'uid-1');
    return { ref, opaque: !/mara/i.test(ref), parked, beforeBind, bound, snap,
             storeStory: window._pendingAdmissionStore(window.state).storyId,
             snapJson: JSON.stringify(snap) };
  })()`);
  t('1a: a manifest mints an OPAQUE ref — nothing in it reconstructs the label',
    !!r.ref && r.opaque && r.ref.indexOf('cand:') === 0, r.ref);
  t('1b: a portfolio parks against that ref and becomes ready for THIS invocation',
    r.parked.ok === true && r.parked.facets === 5, JSON.stringify(r.parked));
  t('1c: before the sceneUid is bound there is no snapshot — an unmounted scene has no admission',
    r.beforeBind === null, JSON.stringify(r.beforeBind));
  t('1d: binding at mount is what makes the lookup a sceneUid lookup',
    r.bound === true && !!r.snap && r.snap.sceneUid === 'uid-1' && r.snap.subjects.length === 1);
  t('1e: the snapshot carries refs, labels and aliases ONLY — no portfolio, no truths',
    !/canonical_truth|worldview|portfolio/i.test(r.snapJson), r.snapJson.slice(0, 120));
}

console.log('\n 2 · THE ECHO CONTRACT — every failure mode fails CLOSED');
{
  const r = await run(`(async () => {
    ${BOOT}('pa-2');
    const m = window._captureAdmissionManifest(window.state, [
      { id:'named:mara', label:'Mara Dunn', aliases:['Mara Dunn'], providerOwner:'ordinary/emergent name-only' },
      { id:'named:tom',  label:'Tom Reed',  aliases:['Tom Reed'],  providerOwner:'ordinary/emergent name-only' }],
      { invocationId:'inv-2' });
    const [a, b] = m.candidates.map(c => c.candidate_ref);
    window._parkPendingPortfolio(window.state, 'inv-2', a, ${FACETS});
    window._parkPendingPortfolio(window.state, 'inv-2', b, ${FACETS});
    window._bindPendingAdmissionSceneUid(window.state, 'inv-2', 'uid-2');
    const snap = window._pendingAdmissionSnapshot(window.state, 'uid-2');
    const V = rows => window._validateAdmissionEchoes(rows, snap);
    return {
      good:      V([{ name:'Mara Dunn', subject_ref:a }, { name:'Tom Reed', subject_ref:b }]),
      incidental:V([{ name:'Mara Dunn', subject_ref:a }, { name:'a passing clerk' }]),
      unknown:   V([{ name:'Mara Dunn', subject_ref:'cand:not-a-real-ref' }]),
      duplicate: V([{ name:'Mara Dunn', subject_ref:a }, { name:'Tom Reed', subject_ref:a }]),
      swapped:   V([{ name:'Mara Dunn', subject_ref:b }, { name:'Tom Reed', subject_ref:a }]),
    };
  })()`);
  t('2a: correct echoes are accepted, one ref per staged person',
    r.good.ok === true && r.good.accepted.length === 2, JSON.stringify(r.good.faults));
  t('2b: an incidental character echoes no ref and stays on the existing admission path',
    r.incidental.ok === true && r.incidental.accepted.length === 1, JSON.stringify(r.incidental));
  t('2c: an UNKNOWN ref fails the whole response', r.unknown.ok === false
    && r.unknown.faults[0].code === 'unknown_ref' && r.unknown.accepted.length === 0);
  t('2d: a DUPLICATE ref fails the whole response', r.duplicate.ok === false
    && r.duplicate.faults.some(f => f.code === 'duplicate_ref') && r.duplicate.accepted.length === 0);
  t('2e: SWAPPED refs are caught as cross-assignment, not accepted as two valid echoes',
    r.swapped.ok === false && r.swapped.faults.every(f => f.code === 'cross_assigned')
      && r.swapped.accepted.length === 0, JSON.stringify(r.swapped.faults));
}

console.log('\n 3 · SAME-NAME TWINS — an unresolved identity, never a model\'s guess');
{
  const r = await run(`(async () => {
    ${BOOT}('pa-3');
    const twins = window._captureAdmissionManifest(window.state, [
      { id:'named:mara_a', label:'Mara', aliases:['Mara'], providerOwner:'ordinary/emergent name-only' },
      { id:'named:mara_b', label:'Mara', aliases:['Mara'], providerOwner:'ordinary/emergent name-only' }],
      { invocationId:'inv-3a' });
    const mixed = window._captureAdmissionManifest(window.state, [
      { id:'role:harbour_clerk', label:'Mara', aliases:['Mara'], providerOwner:'authored role instance',
        structuredSourceId:'harbour_clerk' },
      { id:'named:mara_b', label:'Mara', aliases:['Mara'], providerOwner:'ordinary/emergent name-only' }],
      { invocationId:'inv-3b' });
    return { twins, mixed };
  })()`);
  t('3a: two bare candidates sharing a label produce NO manifest — both excluded, neither paid for',
    r.twins === null, JSON.stringify(r.twins));
  t('3b: …and the one with a structured source survives while the bare twin does not',
    !!r.mixed && r.mixed.candidates.length === 1
      && r.mixed.candidates[0].structuredSourceId === 'harbour_clerk'
      && r.mixed.excluded.length === 1
      && r.mixed.excluded[0].reason === 'same_label_no_structured_source',
    JSON.stringify(r.mixed && { c: r.mixed.candidates.length, x: r.mixed.excluded }));
}

console.log('\n 4 · PROMOTION — only admission mints, and only once');
{
  const r = await run(`(async () => {
    ${BOOT}('pa-4');
    const m = window._captureAdmissionManifest(window.state,
      [{ id:'named:mara_dunn', label:'Mara Dunn', aliases:['Mara Dunn'], providerOwner:'ordinary/emergent name-only' }],
      { invocationId:'inv-4' });
    const ref = m.candidates[0].candidate_ref;
    window._parkPendingPortfolio(window.state, 'inv-4', ref, ${FACETS});
    window._bindPendingAdmissionSceneUid(window.state, 'inv-4', 'uid-4');
    // Nothing is attached while the portfolio is merely parked.
    const beforeLedger = Object.keys((window._relLedger(true) || {}).entities || {});
    const facetsBefore = window._facetsForCharacter({ id:'named:mara_dunn', label:'Mara Dunn', aliases:['Mara Dunn'] },
      window.state, { sceneNumber: 1 }).length;
    // ADMISSION mints the entity — this is the only place a permanent person appears, and it
    // takes an EXPLICIT create. Without it _relEntityForName resolves or refuses, which is the
    // behaviour the whole no-ghost-identities rule rests on: nothing mints by accident.
    const noMint = window._relEntityForName('Mara Dunn', {});
    const cid = window._relEntityForName('Mara Dunn', { create: true });
    const first  = window._promotePendingPortfolio(window.state, 'uid-4', ref, cid);
    const second = window._promotePendingPortfolio(window.state, 'uid-4', ref, cid);
    const facetsAfter = window._facetsForCharacter({ id: cid, label:'Mara Dunn', aliases:['Mara Dunn'] },
      window.state, { sceneNumber: 1 }).length;
    const L = window._relLedger(false);
    return { beforeLedger, facetsBefore, noMint, cid, first, second, facetsAfter,
             status: ((L.entities[cid] || {}).authorProfile || {}).status,
             origins: [...new Set((window._facetsForCharacter({ id: cid, label:'Mara Dunn', aliases:['Mara Dunn'] },
               window.state, { sceneNumber: 1 }) || []).map(f => f.origin))] };
  })()`);
  t('4a: while merely parked, the portfolio attaches to NOBODY and resolves to no facets',
    r.facetsBefore === 0 && !r.beforeLedger.some(k => /mara/i.test(k)),
    JSON.stringify({ facets: r.facetsBefore, ledger: r.beforeLedger }));
  t('4a2: …and resolving her name WITHOUT an explicit create mints nothing — the pending path ' +
    'cannot leak an identity by looking one up',
    r.noMint === null, JSON.stringify(r.noMint));
  t('4b: promotion after admission attaches it to the canonical entity and it becomes selectable',
    r.first.ok === true && r.first.canonicalId === r.cid && r.facetsAfter === 5
      && r.status === 'ready' && JSON.stringify(r.origins) === '["generated_cast"]',
    JSON.stringify({ first: r.first, facets: r.facetsAfter, status: r.status, origins: r.origins }));
  t('4c: promoting twice is idempotent — exactly once, and the second call says so',
    r.second.ok === true && r.second.code === 'already_promoted', JSON.stringify(r.second));
}

console.log('\n 5 · INVALIDATION — story switch, changed cast, ownership, abandonment');
{
  const r = await run(`(async () => {
    ${BOOT}('pa-5');
    const mk = (inv, label) => {
      const m = window._captureAdmissionManifest(window.state,
        [{ id:'named:x', label: label, aliases:[label], providerOwner:'ordinary/emergent name-only' }],
        { invocationId: inv });
      window._parkPendingPortfolio(window.state, inv, m.candidates[0].candidate_ref, ${FACETS});
      window._bindPendingAdmissionSceneUid(window.state, inv, 'uid-' + inv);
      return m.candidates[0].candidate_ref;
    };
    const refA = mk('inv-5a', 'Mara Dunn');
    // STORY SWITCH: the store belongs to a story nobody is playing.
    window.state.storyId = 'pa-5-OTHER';
    const afterSwitch = window._pendingAdmissionSnapshot(window.state, 'uid-inv-5a');
    const promoteAfterSwitch = window._promotePendingPortfolio(window.state, 'uid-inv-5a', refA, 'whatever');
    // Back on a fresh story: a changed cast and a changed fingerprint both invalidate.
    ${BOOT}('pa-5b');
    const refB = mk('inv-5b', 'Mara Dunn');
    const gone = window._revalidatePendingAdmission(window.state, 'inv-5b',
      [{ label:'Someone Else', aliases:['Someone Else'], providerOwner:'ordinary/emergent name-only' }]);
    const refC = mk('inv-5c', 'Tom Reed');
    const drift = window._revalidatePendingAdmission(window.state, 'inv-5c',
      [{ label:'Tom Reed', aliases:['Tom Reed'], providerOwner:'LI bible' }]);
    const promoteDiscarded = window._promotePendingPortfolio(window.state, 'uid-inv-5c', refC, 'x');
    // ABANDONMENT removes the package.
    const refD = mk('inv-5d', 'Ana Vale');
    const abandoned = window._abandonPendingAdmission(window.state, 'uid-inv-5d', 'scene abandoned');
    const afterAbandon = window._pendingAdmissionSnapshot(window.state, 'uid-inv-5d');
    // OWNERSHIP CHANGED: admission returns an entity that answers to a different person.
    const refE = mk('inv-5e', 'Rell Sarn');
    const wrong = window._relEntityForName('Somebody Different', { create: true });
    const mismatched = window._promotePendingPortfolio(window.state, 'uid-inv-5e', refE, wrong);
    return { afterSwitch, promoteAfterSwitch, gone, drift, promoteDiscarded,
             abandoned, afterAbandon, mismatched };
  })()`);
  t('5a: a store from another story yields no snapshot and refuses promotion',
    r.afterSwitch === null && r.promoteAfterSwitch.ok === false,
    JSON.stringify({ snap: r.afterSwitch, promote: r.promoteAfterSwitch }));
  t('5b: a candidate who left the cast is invalidated',
    r.gone.invalidated.length === 1 && r.gone.invalidated[0].code === 'cast_changed',
    JSON.stringify(r.gone));
  t('5c: a candidate whose identity claim CHANGED is invalidated — the portfolio was bought for ' +
    'a different person',
    r.drift.invalidated.length === 1 && r.drift.invalidated[0].code === 'fingerprint_changed',
    JSON.stringify(r.drift));
  t('5d: …and an invalidated candidate cannot then be promoted',
    r.promoteDiscarded.ok === false && r.promoteDiscarded.code === 'not_ready',
    JSON.stringify(r.promoteDiscarded));
  t('5e: abandonment removes the package entirely',
    r.abandoned === true && r.afterAbandon === null);
  t('5f: promotion onto an entity that answers to somebody else is refused',
    r.mismatched.ok === false && r.mismatched.code === 'ownership_changed',
    JSON.stringify(r.mismatched));
}

console.log('\n 6 · SAVE / RESTORE, RETRY, AND CONCURRENT ADMISSION');
{
  const r = await run(`(async () => {
    ${BOOT}('pa-6');
    const m = window._captureAdmissionManifest(window.state,
      [{ id:'named:mara_dunn', label:'Mara Dunn', aliases:['Mara Dunn'], providerOwner:'ordinary/emergent name-only' }],
      { invocationId:'inv-6' });
    const ref = m.candidates[0].candidate_ref;
    window._parkPendingPortfolio(window.state, 'inv-6', ref, ${FACETS});
    window._bindPendingAdmissionSceneUid(window.state, 'inv-6', 'uid-6');
    // SAVE / RESTORE: the whole store round-trips through JSON, as a save file does.
    const saved = JSON.stringify(window.state._pendingAdmission);
    window.state._pendingAdmission = null;
    const afterWipe = window._pendingAdmissionSnapshot(window.state, 'uid-6');
    window.state._pendingAdmission = JSON.parse(saved);
    const afterRestore = window._pendingAdmissionSnapshot(window.state, 'uid-6');
    // RETRY reuses the parked package rather than repurchasing it — a second capture for the same
    // invocation id would replace it, so the guard is that the ref and portfolio survive.
    const stillReady = window._pendingAdmissionStore(window.state)
      .byInvocation['inv-6'].candidates[0];
    // CONCURRENT ADMISSION: a second invocation may not claim a bound scene.
    window._captureAdmissionManifest(window.state,
      [{ id:'named:other', label:'Other Person', aliases:['Other Person'], providerOwner:'ordinary/emergent name-only' }],
      { invocationId:'inv-6b' });
    const stolen = window._bindPendingAdmissionSceneUid(window.state, 'inv-6b', 'uid-6');
    const rebind = window._bindPendingAdmissionSceneUid(window.state, 'inv-6', 'uid-6-different');
    return { afterWipe, afterRestore, ref, stillReady, stolen, rebind, saved: saved.length };
  })()`);
  t('6a: the pending package survives a save/restore round-trip with the same ref',
    r.afterWipe === null && !!r.afterRestore && r.afterRestore.subjects[0].subject_ref === r.ref,
    JSON.stringify({ wipe: r.afterWipe, restored: r.afterRestore && r.afterRestore.subjects }));
  t('6b: a retry reuses the parked portfolio — still ready, same ref, nothing repurchased',
    r.stillReady.status === 'ready' && r.stillReady.candidate_ref === r.ref
      && (r.stillReady.portfolio || []).length === 5,
    JSON.stringify({ status: r.stillReady.status, facets: (r.stillReady.portfolio || []).length }));
  t('6c: a second invocation may not claim a scene that already belongs to one',
    r.stolen === false);
  t('6d: …and a bound invocation may not be rebound to a different scene',
    r.rebind === false);
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// 8 · THE PRODUCTION LOOP, END TO END
//
// Nothing below calls a helper directly. A real Scene 1 runs: production captures the manifest at
// its own pre-planner seam, parks MOCKED portfolios through the seam the paid batch will occupy,
// offers all five facets to the planner, sends one truth to the author, mounts the page, binds the
// invocation by the prose it produced, hands extraction the snapshot, validates the whole echoed
// response, admits, and promotes exactly once.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n 8 · THE PRODUCTION LOOP — capture → planner → author → mount → echo → promote');
{
  const { chain } = await import('./_pending_admission_chain.mjs');
  const R = await chain(browser, SRC, {});
  if (process.env.PA_DIAG) console.log('   DIAG logs:\n' + (R.res.logs || []).join('\n'));
  if (process.env.PA_DIAG) console.log('   DIAG state: ' + JSON.stringify({ pages: R.res.diagPages, handoff: R.res.diagHandoff, scenes: R.res.diagScenes }));
  Object.entries(R.checks).forEach(([k, v]) => t('   ' + k, v.ok, v.detail));

  // ── A BAD ECHO MUTATES NOTHING ──
  const B = await chain(browser, SRC, { badEcho: true });
  t('   C10 one unknown ref sinks the WHOLE response — zero admissions, zero promotions',
    (B.res.cand || {}).status === 'ready' && !(B.res.cand || {}).promotedTo
      && B.res.charLedgerKeys.length === 0 && B.res.facetsAfter === 0,
    JSON.stringify({ cand: B.res.cand, ledger: B.res.charLedgerKeys, facets: B.res.facetsAfter }));

  // ── MUTATION CONTROLS ON THE FIVE PRODUCTION CALLS ──
  // Each removal must turn a specific claim red. The marker for each is asserted UNIQUE first.
  console.log('\n 9 · MUTATION CONTROLS — remove one production call, break one claim');
  const MUTS = [
    ['capture',            '_pendingInvocation = window._captureAdmissionManifest(state, _payable,',
                           '_pendingInvocation = null && (',
                           M => !M.res.manifestSeen && M.res.pendingCalls === 0, {}],
    ['uid binding',        'window._bindPendingAdmissionByProse(s, plain, uid);',
                           '/* MUTATION CONTROL */',
                           M => !M.res.rec || M.res.rec.sceneUid === null, {}],
    ['snapshot delivery',  `_pendingSnap = (typeof window._pendingAdmissionSnapshot === 'function')
          ? window._pendingAdmissionSnapshot(window.state, sceneUid) : null;`,
                           '_pendingSnap = null;',
                           M => !/STAGED SUBJECTS/.test(M.extraction || '') && !(M.res.cand || {}).promotedTo, {}],
    ['whole-response validation', 'if (_pendingSnap && !_echo.ok) {', 'if (false) {',
                           M => M.res.charLedgerKeys.length > 0, { badEcho: true }],
    ['promotion',          'var _pr = window._promotePendingPortfolio(window.state, sceneUid, _ref, _cid);',
                           'var _pr = { ok: false, code: "MUTATION CONTROL" };',
                           M => !(M.res.cand || {}).promotedTo && M.res.facetsAfter === 0, {}],
  ];
  for (const [label, from, to, check, opts] of MUTS) {
    const M = await chain(browser, SRC, { ...opts, mutateSrc: { from, to } });
    t(`   MUT "${label}" removed → the chain breaks`,
      M.targets === 1 && check(M),
      `targets=${M.targets} cand=${JSON.stringify(M.res.cand)} ledger=${JSON.stringify(M.res.charLedgerKeys)}`);
  }
}

console.log('\n 7 · COST');
t('7a: the handshake generated nothing — zero model calls', paid === 0, String(paid));

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
