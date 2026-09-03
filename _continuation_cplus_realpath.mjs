// ══════════════════════════════════════════════════════════════════════════════════════════
//  CONTINUATION CHARACTER+ — THROUGH THE REAL PLANNER AND THE REAL PAGE MOUNT
//
//  `_continuation_stage.mjs` proves the stage contract by calling _sceneStageContract and
//  _cpNormalizeStage directly. That is helper invocation: it cannot show that a continuation
//  SCENE ends up with a grounded assignment, that the AUTHOR receives it, or that a finalized
//  page commits it.
//
//  Arms here drive `_generateSceneSkeleton` (production's own planner for every scene after the
//  first), `buildSkeletonDirective` (what the author is handed), and `StoryPagination.addPage`
//  (the mount whose hook fires the commit). Zero paid calls; the census is asserted.
//
//  EACH ARM THAT MUST STAND ALONE GETS ITS OWN PAGE AND STORY. Arms 1-2 share one on purpose —
//  arm 2 commits arm 1's assignment and that continuity is the thing being proven. Arms 3 and 4
//  are isolated: sharing a page let late async work from earlier arms reset state mid-run, and an
//  arm that intermittently finds no assignment is measuring the previous arms, not the code.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 620) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const MUT = process.env.SB_MUT || '';
let mutated = false, targets = null;

// THE PLANNER REPLY, WITH A FAKE ASSIGNMENT IN IT ON PURPOSE.
// The prompt now forbids character_plus, but a model can still volunteer one, and the backend
// path must be indifferent to that. The fake cites a facet and an option that do not exist.
const PLANNER_REPLY = JSON.stringify({
  environment_anchor: 'the salt-stiffened ledger rope across the harbour counter',
  structural_pacing: 'compressed', narrative_density: 'medium', dialogue_ratio: 'balanced',
  beat_style: 'escalating', tension_rhythm: 'rising',
  interlocutor_placement: 'across the counter',
  li_texture_beat: 'he squares the ledger without being asked',
  pc_body_callback: 'decision', li_body_callback: 'opening', antagonist_body_callback: null,
  staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
  character_plus: [{ character: 'Julian', first_mention: true,
                     angle: 'FAKE-ANGLE-INVENTED-BY-THE-PLANNER',
                     facet_id: 'FAKE-FACET-NOT-IN-CANON',
                     option_id: 'OPT-999-NEVER-OFFERED' }],
  environment_plus: { target: 'the harbour counter', axis: 'use' },
  fusion: null
});

// The extractor's own shape — a second REAL shape, never a union with the planner's.
const DISCLOSURE_REPLY = JSON.stringify({
  characters: [{ name: 'the presiding Dohkar', present: true, relationshipToPC: null,
                 newLayer: null, vehicle: 'none' },
               { name: 'Julian', present: true, relationshipToPC: null, newLayer: null, vehicle: 'none' }],
  scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.0 },
  sceneState: { setting: 'the harbour office', charactersPresent: ['the presiding Dohkar', 'Julian'] }
});

let body = SRC;
if (MUT) {
  const [from, to] = MUT.split('@@TO@@');
  targets = body.split(from).length - 1;
  // A NON-UNIQUE MARKER IS A DEAD CONTROL. `replace` takes the FIRST occurrence, and a marker
  // that matched twice once had me mutating a pre-existing production guard while believing I
  // was removing my own addition — the control "bit" and proved something I had not written.
  if (targets !== 1) {
    console.error(`\n  MUTATION MARKER IS NOT UNIQUE: ${targets} occurrence(s). Refusing a control that would mutate the wrong one.\n`);
    process.exit(2);
  }
  body = body.replace(from, to);
  mutated = body !== SRC;
}

const browser = await chromium.launch({ headless: true });
const calls = [];
const escaped = [];
const logs = [];

async function wire(pg) {
  await pg.route('**/*', async route => {
    const url = route.request().url();
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (!/\/api\//.test(path)) return route.continue();
    if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    // FULFILLED, NEVER CONTINUED: a continued /api/ route spawns a @vercel/node runtime per call
    // that is never reaped, which is what wedges the dev server across a long suite.
    let payload = '';
    try { payload = route.request().postData() || ''; } catch (_) {}
    const isDisclosure = /charactersPresent|relationshipToPC/.test(payload);
    calls.push({ path, bytes: payload.length, payload, kind: isDisclosure ? 'disclosure' : 'planner' });
    const reply = isDisclosure ? DISCLOSURE_REPLY : PLANNER_REPLY;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, content: reply,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: reply } }] }) });
  });
  // REGISTERED LAST ON PURPOSE. Playwright gives the most recently added matching route
  // precedence, so a catch-all declared after this one served the REAL app.js and a mutation
  // control passed while changing nothing.
  await pg.route('**/app.js*', r => r.fulfill({ status: 200,
    contentType: 'application/javascript; charset=utf-8', body }));
  pg.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  pg.on('console', m => { const x = m.text(); if (/SKELETON|CPLUS/i.test(x)) logs.push(x.slice(0, 260)); });
  pg.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 200)));
  await pg.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pg.waitForFunction(() => window.state && window.__generateSceneSkeleton, { timeout: 60000 });
}

const newPage = async () => { const c = await browser.newContext(); const p = await c.newPage();
  await installSession(p); await wire(p); return p; };

const setup = (pg, sceneNum, tag) => pg.evaluate(([n, tg]) => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'contreal-' + (tg || '') + n, turnCount: n - 1,
    scenes: new Array(n - 1).fill('x'), sceneSkeleton: null });
  s._relationshipLedger = null; s._cpDirectedBeats = null; s._cpContinuationContract = null;
  return s.storyId;
}, [sceneNum, tag]);

// Snapshot the store as soon as the commit lands. A fixed sleep let an unrelated story
// initialisation reset the ledger first, so a commit that logged spent=1 read back empty.
const SNAP = `(async () => {
  const snap = () => {
    const L = window._relLedger(false); const r = {};
    Object.keys((L && L.entities) || {}).forEach(k => {
      const e = L.entities[k], c = e && e.cplusContinuity;
      if (!c || !Array.isArray(c.manifestations) || !c.manifestations.length) return;
      r[e.label || e.name || k] = { id: k,
        manifestations: c.manifestations.map(m => ({ facet_id: m.facet_id, verification: m.verification,
                                                     visibleAction: m.visibleAction })),
        facets: Object.keys(c.byFacetId || {}).map(fid => ({ facet_id: fid,
          disclosureStatus: c.byFacetId[fid].disclosureStatus,
          verifiedCount: c.byFacetId[fid].verifiedCount || 0 })) };
    });
    return r;
  };
  for (let i = 0; i < 200; i++) {
    const cur = snap();
    if (Object.keys(cur).length) return cur;
    await new Promise(r => setTimeout(r, 25));
  }
  return {};
})()`;

const page = await newPage();

// ══ 1. THE MIGRATED CONTINUATION: BACKEND-MINTED, GROUNDED, AND THE FAKE IS GONE ══
const story1 = await setup(page, 4);
const A = await page.evaluate(async () => {
  await window.__generateSceneSkeleton('she pushes past the clerk', 'I need the manifest cleared.', {});
  const sk = window.state.sceneSkeleton || {};
  return { contract: window.state._cpContinuationContract,
           cp: (sk.character_plus || []), plannerSupplied: sk._cpPlannerSupplied };
});
ok('R1 the real planner ran and its reply was accepted as STRUCTURE',
   !!A.contract && typeof A.contract.sceneNumber === 'number', JSON.stringify(A.contract));
ok('R2 ★ the planner volunteered a character_plus anyway, and it was discarded rather than merged',
   A.plannerSupplied === 1, `plannerSupplied=${A.plannerSupplied}`);
ok('R3 ★ the fake facet_id, option_id and angle reach the skeleton NOWHERE',
   !/FAKE-FACET-NOT-IN-CANON|OPT-999-NEVER-OFFERED|FAKE-ANGLE/.test(JSON.stringify(A.cp)),
   JSON.stringify(A.cp).slice(0, 300));
ok('R4 ★ a backend-minted assignment carries canonicalId + facet_id + option_id + truth + pressure + interpretation',
   A.cp.length >= 1 && A.cp.every(c => c.canonicalId && c.facet_id && c.option_id
     && c.facet_truth && c.facet_pressure && c.pc_interpretation && c.source === 'backend_continuation'),
   JSON.stringify(A.cp).slice(0, 420) + ' | reason=' + (A.contract && A.contract.reason));
ok('R5 the minted option is one this scene actually offered — not invented',
   A.cp.length >= 1 && A.cp.every(c => !!(A.contract.optionById || {})[c.option_id]),
   `ids=${A.cp.map(c => c.option_id).join()} offered=${Object.keys((A.contract || {}).optionById || {}).join()}`);

// ══ 2. THE COMMIT, THROUGH THE DISCLOSURE ENTRY POINT ══
const MINTED = (A.cp || [])[0] || {};
const B = await page.evaluate(async ([cp, snapSrc]) => {
  const prose = 'The harbour office was colder than the street. ' + cp.character + ' '
    + cp.verification_target + ', and I watched him do it without saying anything at all.';
  await window._updateCharacterDisclosureLedgerForCurrent(prose, 'contreal-uid-4');
  return await eval(snapSrc);
}, [MINTED, SNAP]);
const mintedRow = B[MINTED.character];
// THE EXACT ONE, NOT "SOME": `some verified manifestation` would pass on any character.
ok('R6 ★ the EXACT minted character and facet commit as verified, and the facet becomes revealed',
   !!mintedRow
   && mintedRow.manifestations.some(m => m.facet_id === MINTED.facet_id && m.verification === 'verified')
   && mintedRow.facets.some(f => f.facet_id === MINTED.facet_id && f.disclosureStatus === 'revealed'
                                 && f.verifiedCount >= 1),
   `minted=${MINTED.character}/${MINTED.facet_id} store=${JSON.stringify(B).slice(0, 420)}`);
ok('R7 …and visibleAction is recorded as null — a continuation directs no act and does not pretend to',
   !!mintedRow && mintedRow.manifestations.every(m => m.visibleAction === null),
   String(JSON.stringify(mintedRow)).slice(0, 320));

// ══ 3. THE UNMIGRATED CONTINUATION: NO C+, NO SPEND, SCENE STILL PROCEEDS ══
const page3 = await newPage();
const before = calls.length;
await setup(page3, 7, 'legacy');
const C = await page3.evaluate(async () => {
  await window.__generateSceneSkeleton('she waits at the dock', 'Nothing to declare.', {});
  const sk = window.state.sceneSkeleton || {};
  return { contract: window.state._cpContinuationContract,
           cp: (sk.character_plus || []), staged: (sk.staged_characters || []).length };
});
ok('R8 ★ the unmigrated (legacy) continuation produces NO Character+',
   C.cp.length === 0 && !!C.contract && C.contract.ok === false, JSON.stringify(C.contract));
ok('R9 …and it refuses for the AUTHORITY reason, not by scene number',
   /authoritative stage|eligibility refused|no grounded option/.test(String(C.contract && C.contract.reason)),
   String(C.contract && C.contract.reason));
ok('R10 ★ the ordinary scene still proceeds — the skeleton is populated and staged',
   C.staged >= 1, `staged=${C.staged}`);

// ══ 4. PRODUCTION FLOW: PLANNER → AUTHOR DIRECTIVE → MOUNTED PAGE → COMMIT ══
//  Arm 2 proved the commit helper verifies a string handed to it. It did NOT prove the author
//  receives the assignment, nor that a finalized page reaches the commit on its own. This arm
//  never calls _updateCharacterDisclosureLedgerForCurrent, and asserts only its OWN assignment.
const page4 = await newPage();
const story4 = await setup(page4, 4, 'flow');
const P = await page4.evaluate(async () => {
  const s = window.state;
  await window.__generateSceneSkeleton('she pushes past the clerk', 'I need the manifest cleared.', {});
  const cp = ((s.sceneSkeleton || {}).character_plus || [])[0] || null;
  const directive = (typeof window.buildSkeletonDirective === 'function')
    ? String(window.buildSkeletonDirective() || '') : '';
  return { cp, storyId: s.storyId, contract: s._cpContinuationContract, len: directive.length,
           hasChar: !!(cp && directive.indexOf(cp.character) !== -1),
           // The renderer consumes the bridge's COMPONENTS — truth as the unstated source truth,
           // pressure as why it applies here — not the joined `revelation_bridge` string.
           hasTruth: !!(cp && cp.facet_truth && directive.indexOf(cp.facet_truth) !== -1),
           hasPressure: !!(cp && cp.facet_pressure && directive.indexOf(cp.facet_pressure) !== -1),
           hasInterp: !!(cp && cp.pc_interpretation && directive.indexOf(cp.pc_interpretation) !== -1),
           leaksFacetId: !!(cp && directive.indexOf(cp.facet_id) !== -1),
           leaksOptionId: !!(cp && directive.indexOf(cp.option_id) !== -1) };
});
ok('R11 ★ arm 4 ran under its OWN story, so nothing it asserts can be arm 1\'s committed beat',
   !!P.storyId && P.storyId !== story1 && /flow/.test(String(P.storyId)),
   `arm4=${P.storyId} arm1=${story1}`);
ok('R12 ★ the AUTHOR DIRECTIVE carries this arm\'s assignment — source truth, its pressure and the PC reading all reach the author',
   P.hasChar && P.hasTruth && P.hasPressure && P.hasInterp,
   `char=${P.hasChar} truth=${P.hasTruth} pressure=${P.hasPressure} interp=${P.hasInterp} len=${P.len} contract=${JSON.stringify(P.contract && P.contract.reason)}`);
ok('R13 …and the bookkeeping does not ride along — no facet_id, no option_id in the author payload',
   !P.leaksFacetId && !P.leaksOptionId, `facet=${P.leaksFacetId} option=${P.leaksOptionId}`);

// The author is intercepted, so its prose is a fixture — unavoidable without a paid generation.
// Everything after it (mount, hook, extraction, verifier, commit) is production's.
const FLOW = P.cp ? await page4.evaluate(async ([cp, snapSrc]) => {
  // RE-READ THE LIVE SKELETON AT THE MOMENT OF MOUNTING. `cp` was captured a step earlier; if
  // anything replaced the assignment in between, committing against the captured copy would
  // report a match the running scene does not have.
  const live = ((window.state.sceneSkeleton || {}).character_plus || [])[0] || null;
  const liveMatches = !!live && live.canonicalId === cp.canonicalId && live.facet_id === cp.facet_id
    && live.option_id === cp.option_id && live.character === cp.character;
  const prose = 'The harbour office was colder than the street. ' + cp.character + ' '
    + cp.verification_target + ', and I watched it happen without saying anything at all. '
    + 'He did not look up when I asked again, and the ledger stayed where it was.';
  // PRODUCTION'S OWN MOUNT. The disclosure hook fires from inside the pagination module.
  window.StoryPagination.addPage('<p>' + prose + '</p>', true, 'contreal-flow-4', { invocationId: 'inv-cont-4' });
  const store = await eval(snapSrc);
  return { store, live, liveMatches, uids: window.StoryPagination.getPageUids() };
}, [P.cp, SNAP]) : { store: {}, live: null, liveMatches: false, uids: [], skipped: true };
const flowRow = FLOW.store[P.cp && P.cp.character];
ok('R14 ★ the assignment in the DIRECTIVE is the one live in state at the moment the page mounts',
   FLOW.liveMatches === true,
   `directive=${JSON.stringify(P.cp && { c: P.cp.character, f: P.cp.facet_id, o: P.cp.option_id })} live=${JSON.stringify(FLOW.live && { c: FLOW.live.character, f: FLOW.live.facet_id, o: FLOW.live.option_id })}`);
ok('R15 ★ mounting the finalized page through production reaches the commit with NO help from this test',
   Object.keys(FLOW.store).length > 0, `store=${JSON.stringify(FLOW.store).slice(0, 300)} uids=${JSON.stringify(FLOW.uids)}`);
ok('R16 ★ THIS ARM\'s own minted canonicalId + facet_id becomes the VERIFIED manifestation, end to end',
   !!flowRow && !!P.cp && flowRow.id === P.cp.canonicalId
   && flowRow.manifestations.some(m => m.facet_id === P.cp.facet_id && m.verification === 'verified'),
   `arm4Minted=${P.cp && P.cp.canonicalId}/${P.cp && P.cp.facet_id} got=${JSON.stringify(flowRow)}`);
ok('R17 …and that facet is REVEALED — the reader met it, so canon now says so',
   !!flowRow && !!P.cp && flowRow.facets.some(f => f.facet_id === P.cp.facet_id
     && f.disclosureStatus === 'revealed' && f.verifiedCount >= 1),
   String(JSON.stringify(flowRow && flowRow.facets)).slice(0, 320));

// ══ CENSUS ══
const PAID_CP_ROLES = /CHARACTER_PORTFOLIO|CHARACTER_CANON_AUDITOR|CHARACTER_CANON_REPAIR/;
const cpPaid = calls.filter(c => PAID_CP_ROLES.test(c.payload || ''));
ok('R18 ★ no arm spends on Character+ — no portfolio mint, no canon auditor, grounded or refused',
   cpPaid.length === 0, `cpPaidCalls=${cpPaid.length} legacyArmCalls=${calls.length - before}`);
ok('R19 every request was intercepted — nothing escaped to a paid provider',
   escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));

console.log('\n' + out.join('\n'));
console.log(`\n  arm1 minted : ${JSON.stringify((A.cp || []).map(c => ({ who: c.character, opt: c.option_id, facet: c.facet_id })))}`);
console.log(`  arm4 minted : ${JSON.stringify(P.cp && { who: P.cp.character, opt: P.cp.option_id, facet: P.cp.facet_id })}  story=${P.storyId}`);
console.log(`  legacy      : ${C.contract && C.contract.reason}`);
console.log(`  requests    : ${calls.length} (${calls.filter(c => c.kind === 'disclosure').length} disclosure)`);
if (MUT) console.log(`  MUTATION    : targets=${targets} applied=${mutated}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
