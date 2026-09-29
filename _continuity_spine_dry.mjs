// CONTINUITY SPINE — DRY SUITE v2 (zero provider calls). Parts:
//   U  unit on the real page: ledger + block (facts only; planned events never rendered; verified facts rendered)
//   S  static: every author assembly carries the block; every page-commit site writes the ledger
//   N  numbering: what turnCount / canonical scene number / plan row the FIRST continuation gets per Scene-1 path
//   R  red controls through the REAL turn handler: author abort → no entry; retry → one fresh entry; speculative
//      discard → cannot enter; page-uid order; (adoption + preload capture when the preload fires dry)
//   C  executable captures of the other assemblies: CG sys, SD author, Mistral SD fallback, OAS turn
// usage: node _continuity_spine_dry.mjs     (dev server on :3000; every /api/** POST is answered locally)
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const results = [], infos = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail || '' }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 240) : '')); };
const info = (name, detail) => { infos.push({ name, detail }); console.log('INFO ' + name + (detail ? '  — ' + String(detail).slice(0, 300) : '')); };
const isAuthor = (sys, m) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(m || ''));

function wire(page, ctx) {
  ctx.authorMode = ctx.authorMode || 'ok'; ctx.authorPayloads = []; ctx.otherPosts = []; ctx.allPosts = [];
  return (async () => {
    await installSession(page);
    await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/**', async route => {
      const r = route.request(); const url = r.url().replace(/^https?:\/\/[^/]+/, '');
      if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
      if (isAuthOrigin(r.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (r.method() !== 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { b = {}; }
      const m = b.messages || []; const sys = String((m.find(x => x.role === 'system') || {}).content || '');
      const usr = String((m.find(x => x.role === 'user') || {}).content || '');
      if (!/\/api\/csp-report\b/.test(url)) ctx.allPosts.push({ url, sys, usr, model: b.model || b.preferredModel || null, role: b.role || null });
      if (isAuthor(sys, b.model || b.preferredModel)) {
        ctx.authorPayloads.push({ url, sys, usr, model: b.model || b.preferredModel || null, mode: ctx.authorMode });
        if (ctx.authorMode === 'fail') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'harness: author down' }) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: 'She left the customs house without looking back and the river took the rest of the evening. [stubbed author ' + ctx.authorPayloads.length + ']' }) });
      }
      if (!/\/api\/csp-report\b/.test(url)) ctx.otherPosts.push(url + (b.role ? ' role=' + b.role : ''));
      // ONE real proxy shape ({content}); '{}' is valid JSON for JSON pre-passes and inert text for the rest.
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
    });
  })();
}
async function open(page) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < 240000) {
    try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._buildContinuitySpineBlock && window.StoryPagination, { timeout: 60000 }); return true; }
    catch (e) { last = e; await new Promise(r => setTimeout(r, 3000)); }
  }
  throw last || new Error('server never answered');
}
const seedMidStory = () => {
  const s = window.state; window.__disableSpeculativePreload = true; window.__tierRouting = false;
  s.storyId = 'harness-story-1'; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
  s.picks = Object.assign(s.picks || {}, { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'Billionaire', dynamic: 'Enemies', pov: 'first_person', length: 'fling', intensity: 'Steamy', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Testa', partnerName: 'Rook' } });
  s.name = 'Testa'; s.playerName = 'Testa'; s.identity = { playerName: 'Testa', partnerName: 'Rook' }; s.gender = 'Female'; s.loveInterest = 'Male'; s.archetype = { primary: 'BEAUTIFUL_RUIN' }; s.playerMask = 'OPEN_VEIN'; s.storyLength = 'fling'; s._skipCorridorValidation = true;
  s.canonicalLI = { name: 'Rook', committed: true, mask: 'BEAUTIFUL_RUIN' };
  s.sysPrompt = 'STORYBOUND ARCHITECTURE LAWS — harness system prompt (no doctrine).';
  const one = 'Testa passed the folded note to the stranger at the customs house and walked out before he could read it.';
  window.StoryPagination.init(); window.StoryPagination.clear(); window.StoryPagination.addPage('<p>' + one + '</p>', true);
  s.scenes = [{ title: 'One', synopsis: '', text: one, fateCard: null }]; s.turnCount = 0; // inline literary Scene 1 leaves 0 (see Part N)
  s._sceneTextRing = [{ text: one }]; s._priorSceneText = one; s.currentStoryContent = one;
  s._sceneLedger = null; s._authoringSceneKey = null;
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 1, event: 'PLANNED ONE — the note is passed at the customs house', act: 'pass the note', pageUid: window.StoryPagination.getCurrentPageUid() });
  window._commitTransition('The note changed hands at the customs house.', 'scene1_transition', 1);
};
const submit = async (page, act, dia) => page.evaluate(([a, d]) => { document.getElementById('actionInput').value = a; document.getElementById('dialogueInput').value = d || ''; const b = document.getElementById('submitBtn'); b.disabled = false; b.click(); }, [act, dia || '']);
const settle = async (page, ctx, want, ms) => { const n0 = ctx.authorPayloads.length; for (let w = 0; w < ms; w += 2000) { await page.waitForTimeout(2000); if (ctx.authorPayloads.length > n0 && want === 'author') { await page.waitForTimeout(4000); return true; } } return ctx.authorPayloads.length > n0; };
const snap = (page) => page.evaluate(() => ({ turn: window.state.turnCount, ledger: ((window.state._sceneLedger || {}).entries || []).map(e => ({ n: e.n, sceneNumber: e.sceneNumber, kind: e.kind, pageUid: e.pageUid, act: e.act, card: e.card, plannedEvent: e.plannedEvent })), key: window.state._authoringSceneKey || null, pages: window.StoryPagination.getPageCount(), uids: window.StoryPagination.getPageUids(), spec: window.state.speculativeNextScene ? { normalizedAction: window.state.speculativeNextScene.normalizedAction, hash: window.state.speculativeNextScene.fateContextHash } : null, lastPage: (window.StoryPagination.getPages().slice(-1)[0] || '').replace(/<[^>]*>/g, ' ').slice(0, 120) }));

const browser = await chromium.launch({ headless: true });
// ── PART U ───────────────────────────────────────────────────────────────────────────────────────
{
  const page = await (await browser.newContext()).newPage(); const ctx = {}; await wire(page, ctx); await open(page);
  const U = await page.evaluate(() => {
    const S = window.state, out = []; const T = (name, pass, detail) => out.push({ name, pass: !!pass, detail: detail == null ? '' : String(detail).slice(0, 300) });
    const B = () => window._buildContinuitySpineBlock(S);
    const clean = () => { S._sceneLedger = null; S._authoringSceneKey = null; S._durableFateConsequences = []; S._committedState = null; S.canonicalLI = null; S.playerName = ''; S.name = ''; S.identity = null; S.picks = S.picks || {}; S.picks.identity = null; S.issueIndexInRun = 1; S.turnCount = 0; S._sceneAssignment = null; S.tempt_fate_invoked_this_turn = false; S.fate = S.fate || {}; S.fate.pendingPetition = null; };
    clean(); S.storyId = 'sid-A';
    T('U1 fresh story → block is empty (fail-closed)', B() === '', JSON.stringify(B()));
    const e1 = window._sceneLedgerCommit(S, { kind: 'scene', sceneNumber: 1, event: 'PLANNED ONE', act: 'walked in', dia: 'hello' });
    const L = window._sceneLedgerGet(S, false);
    T('U2 commit p1 → frozen entry; assignment kept only as plannedEvent', e1 && Object.isFrozen(e1) && L.storyId === 'sid-A' && L.entries.length === 1 && e1.plannedEvent === 'PLANNED ONE' && e1.event === undefined, JSON.stringify(e1));
    let b = B();
    T('U2b block renders the reader\'s act and words, NOT the planned event', /STORY LEDGER/.test(b) && /reader did: walked in/.test(b) && /reader said: "hello"/.test(b) && !/PLANNED ONE/.test(b), b);
    T('U2c block never prints undefined/null', !/\b(undefined|null)\b/.test(b), b);
    window._commitTransition('The door was barred behind her.', 'scene1_transition', 1); b = B();
    T('U2d a verifier-committed fact for that scene IS rendered as verified', /p1: .*verified on the page: The door was barred behind her\./.test(b), b);
    window._commitTransition('Something from scene nine.', 'scene9_transition', 9); b = B();
    T('U2e a fact committed for another scene is NOT attached to p1', !/scene nine/.test(b), b);
    S.playerName = 'Testa'; S.canonicalLI = { name: 'Rook', committed: true }; b = B();
    T('U3 identity from the commits: PC + LI appear', /WHO: PC Testa · LI Rook/.test(b), b.split('\n')[1]);
    S.canonicalLI = { name: 'Rook', committed: false }; b = B();
    T('U3b uncommitted LI is NOT named (fail-closed)', !/Rook/.test(b), b.split('\n')[1]);
    S.playerName = ''; b = B();
    T('U3c unresolved PC → no WHO line at all', !/WHO:/.test(b), b.split('\n')[1]);
    S.playerName = 'Testa'; S.turnCount = 0; S._sceneAssignment = { sceneNumber: 2, event: 'PLANNED TWO', source: 'plan' }; S.tempt_fate_invoked_this_turn = true;
    const key = window._sceneLedgerStamp(S, { act: 'act two', dia: '' });
    T('U4 stamp before the author pass: scene 2, planned assignment, Tempt card, reader act', key && key.sceneNumber === 2 && key.plannedEvent === 'PLANNED TWO' && key.card === 'tempt' && key.act === 'act two' && key.dia === null, JSON.stringify(key));
    S.tempt_fate_invoked_this_turn = false;
    const e2 = window._sceneLedgerCommit(S, { kind: 'scene', pageUid: 'uid-2' });
    T('U4b commit consumes the key: uid, act, card carried; key cleared', e2 && e2.sceneNumber === 2 && e2.pageUid === 'uid-2' && e2.act === 'act two' && e2.card === 'tempt' && S._authoringSceneKey === null, JSON.stringify(e2));
    b = B();
    T('U4c block lists p2 with act + [Tempt Fate played], no planned text', /p2: reader did: act two — \[Tempt Fate played\]/.test(b) && !/PLANNED TWO/.test(b), b);
    // stale key must not leak into a commit that names a different scene
    S.turnCount = 1; window._sceneLedgerStamp(S, { act: 'stale act', dia: '' }); // key for scene 3
    const eX = window._sceneLedgerCommit(S, { kind: 'scene', sceneNumber: 7, event: null, pageUid: 'uid-7' });
    T('U4d a key stamped for scene 3 is NOT consumed by a commit that names scene 7', eX && eX.sceneNumber === 7 && eX.act === null && S._authoringSceneKey && S._authoringSceneKey.sceneNumber === 3, JSON.stringify(eX));
    S._authoringSceneKey = null;
    // durable attribution
    S.turnCount = 6; const k3 = window._sceneLedgerStamp(S, { act: 'bargains', dia: 'take it' });
    S._durableFateConsequences.push({ id: 'fc_2_1_voice_lost', type: 'voice_lost', detail: 'Fate took the PC’s voice (a whisper) for the bargain: to be believed', sceneIdx: 2, bargainId: 'b1', permanent: true });
    const e3 = window._sceneLedgerCommit(S, { kind: 'scene', pageUid: 'uid-8' });
    T('U5 a durable consequence recorded during the page is attributed to that page', e3 && e3.sceneNumber === 8 && e3.changes.length === 1 && e3.changes[0] === 'fc_2_1_voice_lost' && k3.durableBefore === 0, JSON.stringify(e3));
    b = B();
    T('U5b block carries the permanent change (existing directive, now delivered) + the page marker', /PERMANENT WISH-COSTS ALREADY PAID/.test(b) && /voice/.test(b) && /\[Fate recorded a permanent change\]/.test(b), b);
    const snap0 = JSON.stringify(L.entries[0]); const before = L.entries.length;
    try { L.entries[0].act = 'tampered'; } catch (_) {}
    const dup = window._sceneLedgerCommit(S, { kind: 'scene', sceneNumber: 8, pageUid: 'uid-8-again' });
    T('U6 earlier entries are immutable; a page commits once (duplicate returns the existing entry)', JSON.stringify(L.entries[0]) === snap0 && dup === e3 && L.entries.length === before, 'len=' + L.entries.length);
    S._durableFateConsequences = []; S._committedState = null; S.storyId = 'sid-B';
    T('U7 another story id → the ledger is not READ (block empty)', window._sceneLedgerGet(S, false) === null && B() === '', JSON.stringify(B()));
    const eB = window._sceneLedgerCommit(S, { kind: 'scene', sceneNumber: 1, event: 'B one' });
    T('U7b a commit under the new story opens a fresh ledger', eB && window._sceneLedgerGet(S, false).storyId === 'sid-B' && window._sceneLedgerGet(S, false).entries.length === 1, '');
    S.storyId = 'sid-C'; S._sceneLedger = null;
    for (let i = 1; i <= 40; i++) window._sceneLedgerCommit(S, { kind: 'scene', sceneNumber: i, event: 'planned ' + i, act: 'did thing ' + i + ' with enough words to make the line long enough to matter for the cap' });
    b = B();
    T('U8 40 pages → capped block, most recent six listed, older counted', b.length <= 2200 && /34 earlier not listed/.test(b) && /p40: reader did: did thing 40/.test(b) && !/p1: /.test(b), 'len=' + b.length);
    const json = JSON.stringify(window._sceneLedgerGet(S, false)); const L2 = window._sceneLedgerRestamp(json, 'sid-D');
    T('U9 restamp for the issue boundary keeps every page, frozen, under the new story id', L2 && L2.storyId === 'sid-D' && L2.entries.length === 40 && Object.isFrozen(L2.entries[0]), '');
    S.storyId = 'sid-D'; S._sceneLedger = L2; const L3 = window._sceneLedgerRestamp(json, 'sid-D'); S._sceneLedger = L3;
    T('U9b replaying the same carry twice is idempotent (40 pages, not 80)', S._sceneLedger.entries.length === 40 && window._sceneLedgerGet(S, false) === L3, '');
    S.issueIndexInRun = 2; b = B();
    T('U10 pages from an earlier issue are tagged with their issue', /issue 1 p40/.test(b), b.split('\n').slice(-3).join(' | '));
    const eI = window._sceneLedgerCommit(S, { kind: 'issue_open', sceneNumber: 1, event: null, pageUid: 'uid-i2' });
    T('U10b after the carry, the new issue appends (issue 2, p1) without touching issue-1 pages', eI && eI.issue === 2 && S._sceneLedger.entries.length === 41 && S._sceneLedger.entries[0].issue === 1, '');
    S.issueIndexInRun = 1; S.turnCount = 4; b = B();
    T('U11 NOW line uses the canonical scene number (turnCount+2)', /NOW: page 6 /.test(b), b.split('\n').slice(-1)[0]);
    clean(); S.storyId = 'sid-Z';
    return out;
  });
  U.forEach(r => ok(r.name, r.pass, r.detail));
  ok('U0 zero provider POSTs during the unit part', ctx.otherPosts.length === 0 && ctx.authorPayloads.length === 0, ctx.otherPosts.slice(0, 3).join(' ; '));
  await page.context().close();
}
// ── PART S ───────────────────────────────────────────────────────────────────────────────────────
{
  const app = fs.readFileSync('public/app.js', 'utf8').split('\n'), orch = fs.readFileSync('public/orchestration-client.js', 'utf8').split('\n');
  const find = (lines, re) => lines.map((l, i) => re.test(l) ? (i + 1) : 0).filter(Boolean);
  const blockSites = find(app, /_buildContinuitySpineBlock\(/).filter(n => !/function _buildContinuitySpineBlock|window\._buildContinuitySpineBlock = /.test(app[n - 1]));
  const tag = n => { const l = app[n - 1]; return /let fullSys/.test(l) ? 'heavy fullSys' : /_pass2Sys/.test(l) ? 'multi-pass pass2' : /_specCacheSentinel/.test(l) ? 'speculative preload' : /_continuitySpineBlock = /.test(l) ? 'CG screenplay sys' : /parts\.push/.test(l) ? 'OAS intimacy prompt' : 'other'; };
  const tags = blockSites.map(n => n + ':' + tag(n));
  ok('S1 app.js author assemblies carry the block (heavy, pass2, speculative, CG, OAS)', ['heavy fullSys', 'multi-pass pass2', 'speculative preload', 'CG screenplay sys', 'OAS intimacy prompt'].every(t => tags.some(x => x.endsWith(t))), tags.join(', '));
  ok('S2 orchestration-client SD author + Mistral SD fallback carry the block', find(orch, /_buildContinuitySpineBlock\(/).length >= 2, find(orch, /_buildContinuitySpineBlock\(/).join(','));
  const commits = find(app, /_sceneLedgerCommit\(state, \{/);
  ok('S3 page-commit sites write the ledger (continuation, Scene 1 ×2, baked, CG, issue open) — baked writes the ledger but receives NO block (verbatim prose, no prompt)', commits.length >= 6, commits.join(','));
  ok('S4 the continuation stamps the scene key before the heavy assembly and before the speculative check', (() => { const st = find(app, /_sceneLedgerStamp\(state, \{ act:/)[0]; const fs_ = blockSites.find(n => tag(n) === 'heavy fullSys'); const spec = find(app, /const speculativeScene = tryCommitSpeculativeScene\(\)/)[0]; return st && st < fs_ && fs_ < spec; })(), '');
  ok('S5 issue boundary carries and re-stamps the ledger', find(app, /_sceneLedgerJson|_sceneLedgerRestamp\(_carriedRel/).length >= 2, '');
  ok('S6 the block never renders plannedEvent (static: no "plannedEvent" read inside the block builder)', (() => { const a = find(app, /function _buildContinuitySpineBlock\(/)[0]; const z = find(app, /window\._buildContinuitySpineBlock = /)[0]; return !app.slice(a, z).some(l => /\.plannedEvent|e\.event\b/.test(l)); })(), '');
  // numbering statics
  const tc1 = find(app, /^\s*state\.turnCount = 1;/);
  info('S7 turnCount=1 writers after a Scene-1 commit: ' + tc1.join(','), 'issue-open _mountAndTransition, Scene-1 site A (background-pregenerated path, unconditional after its branches), CG/GN renderer; baked uses "if (!(turnCount>0)) turnCount=1"');
}
// ── PART N (numbering under the invariant: turnCount = completed continuation turns) ─────────────
{
  const page = await (await browser.newContext()).newPage(); const ctx = {}; await wire(page, ctx); await open(page);
  const N = await page.evaluate(() => {
    const s = window.state, out = {}; const sel = () => { try { const a = window._selectSceneAssignment(s); return a ? { sceneNumber: a.sceneNumber, source: a.source, event: String(a.event || '').slice(0, 40) } : null; } catch (e) { return { err: String(e) }; } };
    // N1 baked starter unlock (the red control: pre-repair this selected row 3)
    s.storyId = 'num-1'; s._starterId = 'starter_first_sacrifice'; s.is_starter_story = true; s.turnCount = 0; s.scenes = []; s._sceneLedger = null; s._stagedAuthoringSceneIndex = null; s.issueIndexInRun = 1;
    s._bakedPendingCommit = { title: 'The First Sacrifice', synopsis: '', text: 'placeholder prose', fateCard: null };
    window._commitBakedScene();
    out.baked = { turn: s.turnCount, canonical: window._currentSceneNumber(s), selected: sel() };
    // N2 CG / staged generation seam: advancing to scene index 1 (Scene 2) must select row 2; index 2 → row 3; cleared → literary rule
    s.turnCount = 1; s._stagedAuthoringSceneIndex = 1; out.cgIdx1 = { canonical: window._currentSceneNumber(s), selected: sel() };
    s._stagedAuthoringSceneIndex = 2; out.cgIdx2 = { canonical: window._currentSceneNumber(s), selected: sel() };
    s._stagedAuthoringSceneIndex = 0; out.cgIdx0 = window._currentSceneNumber(s);
    s._stagedAuthoringSceneIndex = null; s.turnCount = 0; out.afterClear = window._currentSceneNumber(s);
    // N3 literary: after the first continuation committed (turnCount 1) the second continuation is scene 3 / row 3
    s.turnCount = 1; out.second = { canonical: window._currentSceneNumber(s), selected: sel() };
    // N4 issue start: opening mounted (turnCount 0), issue 2 → first continuation is scene 2
    s.turnCount = 0; s.issueIndexInRun = 2; out.issue = { canonical: window._currentSceneNumber(s) }; s.issueIndexInRun = 1;
    // N5 preview stop "stop after scene 3": after 2 scenes displayed (turnCount 1) not at stop; after 3 (turnCount 2) at stop
    s.previewActive = true; s.previewProductId = 'starter_famous_fate'; s.previewContinued = false; s._betaPreviewStopLogged = true;
    s.turnCount = 1; out.stopAfter2 = window._isAtPreviewStop(); s.turnCount = 2; out.stopAfter3 = window._isAtPreviewStop(); s.turnCount = 3; out.stopAfter4 = window._isAtPreviewStop();
    s.previewActive = false; s.previewProductId = null; s.turnCount = 0;
    // N6 the CG wrapper clears its index even when the inner generator throws (exercise with a missing plan → inner rejects fast or resolves)
    out.wrapperExposed = typeof window._runCGScreenplayGen === 'function';
    return out;
  });
  const plan = await page.evaluate(() => ((window.STARTER_PLANS || {}).starter_first_sacrifice || { scenes: [] }).scenes.slice(0, 3).map(r => ({ n: r.n, goal: String(r.goal).slice(0, 30) })));
  info('N0 plan rows: ' + JSON.stringify(plan), '');
  ok('N1 baked starter unlock → turnCount 0 → canonical next scene 2 → plan row 2 "THE TWIST" (red control: pre-repair log shows row 3)', N.baked.turn === 0 && N.baked.canonical === 2 && N.baked.selected && N.baked.selected.sceneNumber === 2 && /THE TWIST/.test(N.baked.selected.event), JSON.stringify(N.baked));
  ok('N2 CG seam: generating scene index 1 → scene 2 / row 2; index 2 → scene 3 / row 3; index 0 → 1; cleared → literary rule', N.cgIdx1.canonical === 2 && N.cgIdx1.selected.sceneNumber === 2 && N.cgIdx2.canonical === 3 && N.cgIdx2.selected.sceneNumber === 3 && N.cgIdx0 === 1 && N.afterClear === 2, JSON.stringify({ i1: N.cgIdx1, i2: N.cgIdx2, i0: N.cgIdx0, clr: N.afterClear }));
  ok('N3 genuine second continuation (turnCount 1) is scene 3 / row 3', N.second.canonical === 3 && N.second.selected && N.second.selected.sceneNumber === 3, JSON.stringify(N.second));
  ok('N4 issue start: opening mounted → first continuation of the new issue is scene 2', N.issue.canonical === 2, JSON.stringify(N.issue));
  ok('N5 preview "stop after scene 3" fires after exactly three scenes displayed (not after two, not after four)', N.stopAfter2 === false && N.stopAfter3 === true && N.stopAfter4 === false, JSON.stringify({ a2: N.stopAfter2, a3: N.stopAfter3, a4: N.stopAfter4 }));
  const app = fs.readFileSync('public/app.js', 'utf8');
  const tc1 = app.split('\n').map((l, i) => /^\s*state\.turnCount = 1;/.test(l) ? i + 1 : 0).filter(Boolean);
  const gnOnly = tc1.every(n => /LEGACY GN RENDERER/.test(app.split('\n').slice(Math.max(0, n - 6), n).join('\n')));
  ok('N6 static: no reachable Scene-1 writer begins turnCount at 1 (only the legacy GN renderer, explicitly exempted); no decrement anywhere; couple resume has no +1', gnOnly && !/turnCount\s*(--|-=)/.test(app) && !/turn_index \+ 1;/.test(app), 'turnCount=1 writers: ' + tc1.join(','));
  ok('N7 static: CG generator wrapper sets and clears the authoring index in finally', /_stagedAuthoringSceneIndex = \(typeof sceneIndex === 'number'/.test(app) && /finally \{ try \{ state\._stagedAuthoringSceneIndex = null; \}/.test(app) && N.wrapperExposed, '');
  await page.context().close();
}
// ── PART M (one-time turn-count schema normalization on resume) ──────────────────────────────────
{
  const page = await (await browser.newContext()).newPage(); const ctx = {}; await wire(page, ctx); await open(page);
  const Mres = await page.evaluate(() => {
    const out = []; const T = (name, pass, detail) => out.push({ name, pass: !!pass, detail: detail == null ? '' : String(detail).slice(0, 260) });
    const fresh = (o) => Object.assign({ storyId: 'mig-' + Math.random().toString(36).slice(2), turnCount: 1, scenes: [{ text: 'one' }], _sceneLedger: null, _committedState: null, _turnCountSchema: undefined, _turnCountMigration: null, issueIndexInRun: 1 }, o || {});
    const run = (st, pages) => window._normalizeLegacyTurnCount(st, { storyPages: pages });
    // (a) background-pregenerated / inline-literary Scene-1-only save stored as 1: one page, one scene
    let st = fresh(); const pagesA = ['<p>scene one</p>']; const snapA = JSON.stringify(pagesA); let r = run(st, pagesA);
    T('M1 (a) literary Scene-1-only save at 1 → normalized to 0, schema 2, migration record with before/after', r.applied && st.turnCount === 0 && st._turnCountSchema === 2 && st._turnCountMigration.turnCountBefore === 1 && st._turnCountMigration.turnCountAfter === 0, JSON.stringify(r));
    T('M1b pages passed in are untouched', JSON.stringify(pagesA) === snapA, '');
    // (b) genuine first continuation on the literary path: two pages, one scene (continuations do not push scenes)
    st = fresh({ scenes: [{ text: 'one' }] }); r = run(st, ['<p>one</p>', '<p>two</p>']);
    T('M2 (b) literary genuine first continuation (2 pages) stays 1, stamped', !r.applied && st.turnCount === 1 && st._turnCountSchema === 2 && /continuation was displayed/.test(r.reason), JSON.stringify(r));
    // (a) baked CG starter after unlock: baked page + scenes[0], no CG scene yet
    st = fresh({ scenes: [{ text: 'baked' }] }); r = run(st, ['<p>baked</p>']);
    T('M3 (a) baked starter after unlock (1 page, 1 scene) → 0', r.applied && st.turnCount === 0, JSON.stringify(r));
    // (b) CG genuine: baked page only in pagination but two scenes pushed
    st = fresh({ scenes: [{ text: 'baked' }, { text: 'cg scene 2' }] }); r = run(st, ['<p>baked</p>']);
    T('M4 (b) CG genuine first continuation (2 scenes, 1 page) stays 1', !r.applied && st.turnCount === 1, JSON.stringify(r));
    // (a) issue opening stored as 1
    st = fresh({ issueIndexInRun: 2, scenes: [{ text: 'book two opening' }] }); r = run(st, ['<p>opening</p>']);
    T('M5 (a) issue-2 opening stored as 1 → 0', r.applied && st.turnCount === 0, JSON.stringify(r));
    // ambiguous legacy single-blob save (no storyPages array)
    st = fresh(); r = run(st, null);
    T('M6 AMBIGUOUS legacy single-blob save: left at 1, stamped so it is not re-evaluated, reason says ambiguous', !r.applied && st.turnCount === 1 && st._turnCountSchema === 2 && /AMBIGUOUS/.test(r.reason), JSON.stringify(r));
    // mid-story legacy (consistently offset) — never re-numbered
    st = fresh({ turnCount: 3 }); r = run(st, ['1', '2', '3']);
    T('M7 mid-story legacy save (turnCount 3, 3 pages) left as saved', !r.applied && st.turnCount === 3, JSON.stringify(r));
    // RED CONTROL SET (review 2026-09-06): a verifier fact is NOT display evidence. CG Scene 1 runs the plot
    // contract, and an aborted Scene-2 attempt verifies its proposal against Scene 1's page — so a Scene-1-only
    // save can carry a fact at scene 1, at scene 0 (fallback numbering), by sourceEvent only, or even labeled 2.
    st = fresh({ _committedState: { facts: [{ fact: 'x', committedAtScene: 1 }] } }); r = run(st, ['1']);
    T('MF1 (a) literary Scene-1-only at 1, one page, WITH a Scene-1 verifier fact → normalized to 0', r.applied && st.turnCount === 0, JSON.stringify(r));
    st = fresh({ scenes: [{ text: 'baked' }], _committedState: { facts: [{ fact: 'x', committedAtScene: 1 }] } }); r = run(st, ['<p>baked</p>']);
    T('MF2 (a) baked Scene-1-only at 1, one page, WITH a Scene-1 verifier fact (CG Scene 1 runs the plot contract) → 0', r.applied && st.turnCount === 0, JSON.stringify(r));
    st = fresh({ _committedState: { facts: [{ fact: 'x', sourceEvent: 'scene1_transition' }] } }); r = run(st, ['1']);
    T('MF3 fact keyed only by sourceEvent scene1_transition → still normalized', r.applied && st.turnCount === 0, JSON.stringify(r));
    st = fresh({ _committedState: { facts: [{ fact: 'x', committedAtScene: 0 }] } }); r = run(st, ['1']);
    T('MF4 fact at scene 0 (verifier fallback numbering) → still normalized', r.applied && st.turnCount === 0, JSON.stringify(r));
    st = fresh({ _committedState: { facts: [{ fact: 'x', committedAtScene: 2 }] } }); r = run(st, ['1']);
    T('MF5 fact labeled scene 2 with ONE displayed page (aborted Scene-2 attempt verified against Scene 1) → page count governs → normalized', r.applied && st.turnCount === 0, JSON.stringify(r));
    // ledger authority (post-ledger saves): ledger says 2 pages committed → untouched even if pagination shows 1
    st = fresh({ _sceneLedger: { storyId: 'L', entries: [{ n: 1 }, { n: 2 }] }, storyId: 'L' }); r = run(st, ['1']);
    T('M9 scene ledger (when present for this story) is the authority: 2 committed pages → left at 1', !r.applied && st.turnCount === 1 && r.evidence.ledger === 2, JSON.stringify(r));
    // idempotence / no double correction / rollback info
    st = fresh(); run(st, ['1']); const again = run(st, ['1']);
    T('M10 second pass is a no-op (schema stamp): turnCount stays 0, not −1, and the record keeps turnCountBefore=1 for rollback', !again.applied && /already schema 2/.test(again.reason) && st.turnCount === 0 && st._turnCountMigration.turnCountBefore === 1, JSON.stringify(again));
    // new stories are born at schema 2 → never evaluated
    st = fresh({ turnCount: 0, _turnCountSchema: 2 }); r = run(st, ['1']);
    T('M11 a story born at schema 2 is never touched', !r.applied && st.turnCount === 0 && /already schema 2/.test(r.reason), JSON.stringify(r));
    // turnCount 0 legacy inline save: nothing to do, stamped
    st = fresh({ turnCount: 0 }); r = run(st, ['1']);
    T('M12 inline-literary legacy save (already 0) stays 0, stamped', !r.applied && st.turnCount === 0 && st._turnCountSchema === 2, JSON.stringify(r));
    return out;
  });
  Mres.forEach(r => ok(r.name, r.pass, r.detail));
  const app = fs.readFileSync('public/app.js', 'utf8');
  const iSet = app.indexOf('StoryPagination.setPages(_cleanPages, _uids);'), iBlob = app.indexOf("StoryPagination.addPage(_cleanHtml, true, 'legacy:' + _sidH + ':storyHTML:0');"), iHook = app.indexOf('_normalizeLegacyTurnCount(state, { storyPages: (data && Array.isArray(data.storyPages)) ? data.storyPages : null })'), iAssign = app.indexOf('if(data.stateSnapshot) Object.assign(state, data.stateSnapshot);');
  ok('M13 static: resume (continueStory) applies the snapshot, restores pages (both branches), THEN normalizes once', iAssign > 0 && iSet > iAssign && iBlob > iSet && iHook > iBlob, JSON.stringify({ iAssign, iSet, iBlob, iHook }));
  ok('M14 static: new stories are stamped schema 2 in _resetStoryState; no writer sets schema elsewhere except the normalizer', (app.match(/_turnCountSchema = 2;/g) || []).length === 1 && /s\._turnCountSchema = _TURN_COUNT_SCHEMA;/.test(app), '');
  await page.context().close();
}
// ── PART R (red controls through the real handler) ──────────────────────────────────────────────
{
  const page = await (await browser.newContext()).newPage(); const ctx = {}; const errs = [], logs = [];
  page.on('pageerror', e => errs.push(String(e && e.message).slice(0, 160)));
  page.on('console', m => { const t = m.text(); if (/SCENE-LEDGER|SPECULATIVE|\[BRANCH\]/.test(t)) logs.push(t.replace(/\s+/g, ' ').slice(0, 160)); });
  await wire(page, ctx); await open(page); await page.evaluate(seedMidStory);
  const s0 = await snap(page);
  // R1 abort: author returns 500
  ctx.authorMode = 'fail'; await submit(page, 'I try the locked door.'); await settle(page, ctx, 'author', 90000); await page.waitForTimeout(8000);
  const s1 = await snap(page);
  ok('R1 author ABORT (HTTP 500) → no page added, no ledger entry, page count unchanged', ctx.authorPayloads.length >= 1 && s1.ledger.length === s0.ledger.length && s1.pages === s0.pages, 'authorCalls=' + ctx.authorPayloads.length + ' ledger=' + s1.ledger.length + ' pages=' + s1.pages + ' errs=' + errs.slice(0, 2).join(' | '));
  ok('R1b the aborted attempt left a stale key (expected) that names the scene it was for', !!s1.key && typeof s1.key.sceneNumber === 'number', JSON.stringify(s1.key));
  // Seeds for the three scene-keyed consumers (G controls): gravity axis, intensity signal, onboarding story
  await page.evaluate(() => { const s = window.state; s.storyGravity = 'outcome'; s._ownership = 'outcome'; /* deadband holds it through the per-turn recompute */ s._intensitySignal = 'toward'; s._indulgenceOffered = false; s.onboarding_story_id = s.storyId; s.has_received_intro_vision = false; });
  // R2 retry with a DIFFERENT act: exactly one fresh entry carrying the new act, not the aborted one
  ctx.authorMode = 'ok'; const n1 = ctx.authorPayloads.length; await submit(page, 'I walk down to the river instead.'); await settle(page, ctx, 'author', 120000); await page.waitForTimeout(6000);
  const s2 = await snap(page);
  const fresh = s2.ledger[s2.ledger.length - 1];
  info('R2 author calls made by the retry turn (the app\'s own chain: author + follow-up passes): ' + (ctx.authorPayloads.length - n1), ctx.authorPayloads.slice(n1).map(p => p.url + ' ' + p.model).join(' ; '));
  ok('R2 retry → exactly ONE new page and ONE new entry with the NEW act (the aborted act never recorded), key consumed', s2.pages === s0.pages + 1 && s2.ledger.length === s0.ledger.length + 1 && fresh && /river/.test(fresh.act || '') && !s2.ledger.some(e => /locked door/.test(e.act || '')) && s2.key === null, JSON.stringify(fresh) + ' pages=' + s2.pages + ' key=' + JSON.stringify(s2.key));
  ok('R2b the entry\'s page uid is the page just displayed (last pagination uid)', fresh && fresh.pageUid === s2.uids[s2.uids.length - 1], fresh && fresh.pageUid);
  const sysR2 = (ctx.authorPayloads[n1] || {}).sys || '';
  ok('R2c the author payload for the retry listed page 1 with the reader\'s act and the verified fact, and no planned text', /p1: reader did: pass the note — verified on the page: The note changed hands at the customs house\./.test(sysR2) && !/PLANNED ONE/.test(sysR2), '');
  const g2 = await page.evaluate(() => ({ vision: window.state.has_received_intro_vision, indulge: window.state._indulgenceOffered }));
  ok('G1 story-gravity one-shot fires on the SCENE 2 build (payload carries the opening-emphasis block)', /STORY GRAVITY \(opening emphasis/.test(sysR2), '');
  ok('G3 Scene-2 intro vision fires after SCENE 2 commits (flag set)', g2.vision === true, JSON.stringify(g2));
  ok('G5 Scene-3 indulgence does NOT fire on Scene 2 (adjacent red)', g2.indulge === false, JSON.stringify(g2));
  await page.evaluate(() => { window.state.has_received_intro_vision = false; }); // re-arm to prove it does not fire again on Scene 3
  ok('R2d NOW line agrees with the page being authored (Scene 1 read → NOW: page 2) and with the committed entry', /NOW: page 2 /.test(sysR2) && fresh && fresh.sceneNumber === 2, (sysR2.match(/NOW: page \d+/) || [''])[0]);
  // R3 speculative DISCARD: a stale preloaded scene must not enter the ledger or the page
  await page.evaluate(() => { window.state.speculativeNextScene = { text: 'SPECULATIVE DRAFT THAT MUST NOT APPEAR', fateContextHash: 'stale-hash', tone: '', world: '', selectedFateCard: null, normalizedAction: 'anything', normalizedDialogue: '', estCostUsd: 0, createdAt: Date.now() }; });
  const n2 = ctx.authorPayloads.length; await submit(page, 'I follow the river to the mill.'); await settle(page, ctx, 'author', 120000); await page.waitForTimeout(6000);
  const s3 = await snap(page);
  const last3 = s3.ledger[s3.ledger.length - 1];
  const sysR3 = (ctx.authorPayloads[n2] || {}).sys || ''; const g3 = await page.evaluate(() => ({ vision: window.state.has_received_intro_vision, indulge: window.state._indulgenceOffered, gravity: window.state.storyGravity }));
  ok('G2a gravity value is still set on the Scene 3 build (so G2 is not vacuous)', g3.gravity === 'outcome', JSON.stringify(g3));
  ok('G2 story-gravity one-shot does NOT fire on the Scene 3 build (adjacent red)', !/STORY GRAVITY \(opening emphasis/.test(sysR3), '');
  ok('G4 Scene-2 intro vision does NOT fire after Scene 3 (adjacent red, re-armed)', g3.vision === false, JSON.stringify(g3));
  ok('G6 Scene-3 indulgence fires after SCENE 3 commits (flag set)', g3.indulge === true, JSON.stringify(g3));
  await page.evaluate(() => { window.state._indulgenceOffered = false; });
  ok('R3 speculative DISCARD (context mismatch) → the real author ran, ONE page + ONE entry for the real page, the draft never displayed, spec cleared', ctx.authorPayloads.length > n2 && s3.pages === s2.pages + 1 && s3.ledger.length === s2.ledger.length + 1 && /mill/.test(last3.act || '') && !/SPECULATIVE DRAFT/.test(s3.lastPage) && s3.spec === null && logs.some(l => /\[SPECULATIVE\] Context mismatch/.test(l)), JSON.stringify(last3) + ' | lastPage=' + s3.lastPage + ' | logs=' + logs.filter(l => /SPECULATIVE/.test(l)).slice(-2).join(' ; '));
  // R4 uid order: ledger 'scene' entries follow pagination order
  const sceneUids = s3.ledger.filter(e => e.kind === 'scene' && e.pageUid).map(e => e.pageUid);
  const pagOrder = s3.uids.filter(u => sceneUids.includes(u));
  ok('R4 ledger entries are in page-uid order and one-to-one with displayed pages', JSON.stringify(sceneUids) === JSON.stringify(pagOrder) && sceneUids.length === s3.pages, JSON.stringify({ sceneUids, pages: s3.pages }));
  ok('R5 scene numbers increase by one per displayed page from the seeded Scene 1', s3.ledger.map(e => e.sceneNumber).join(',') === '1,2,3', s3.ledger.map(e => e.sceneNumber).join(','));
  ok('R5b the third page\'s author payload said NOW: page 3 and turnCount after it is 2 (completed continuation turns)', /NOW: page 3 /.test((ctx.authorPayloads[n2] || {}).sys || '') && s3.turn === 2, 'turn=' + s3.turn);
  // R6 speculative PRELOAD + ADOPTION (only if the preload fires dry)
  await page.evaluate(() => { window.__disableSpeculativePreload = false; });
  const n3 = ctx.authorPayloads.length; await submit(page, 'I knock on the mill door.'); await settle(page, ctx, 'author', 120000); await page.waitForTimeout(3000);
  let preFired = false; for (let w = 0; w < 60000; w += 2000) { await page.waitForTimeout(2000); const sp = await page.evaluate(() => !!window.state.speculativeNextScene); if (sp) { preFired = true; break; } }
  const s4 = await snap(page);
  const knockEntry = s4.ledger[s4.ledger.length - 1];
  const g4 = await page.evaluate(() => ({ indulge: window.state._indulgenceOffered }));
  ok('G7 Scene-3 indulgence does NOT fire on Scene 4 (adjacent red, re-armed)', g4.indulge === false, JSON.stringify(g4));
  ok('R6a the knock turn committed ONE page/entry (p4) and its author payload listed exactly the three pages read before it', s4.pages === s3.pages + 1 && knockEntry && /knock/.test(knockEntry.act || '') && /ALREADY READ \(3 pages\)/.test((ctx.authorPayloads[n3] || {}).sys || ''), JSON.stringify(knockEntry));
  if (preFired) {
    const specSys = ctx.authorPayloads[ctx.authorPayloads.length - 1].sys;
    ok('R6 speculative PRELOAD fired dry and its own assembly carries the block (executable capture of the second-system path)', /STORY LEDGER \(authoritative/.test(specSys) && /p4: reader did: I knock on the mill door/.test(specSys), 'specSys=' + specSys.length);
    ok('R6b the preloaded draft is NOT in the ledger (no page displayed yet)', s4.ledger.length === s3.ledger.length + 1, JSON.stringify(s4.spec));
    if (s4.spec && s4.spec.normalizedAction) {
      const n4 = ctx.authorPayloads.length; await submit(page, s4.spec.normalizedAction); await page.waitForTimeout(12000); const s5 = await snap(page);
      const adopted = s5.ledger[s5.ledger.length - 1];
      ok('R6c speculative ADOPTION → page displayed → ONE ledger entry with the reader\'s act, no extra author call', s5.pages === s4.pages + 1 && s5.ledger.length === s4.ledger.length + 1 && adopted.act && ctx.authorPayloads.length === n4, JSON.stringify(adopted) + ' authorCalls=' + (ctx.authorPayloads.length - n4));
    } else info('R6c adoption not exercised — preload stored no normalizedAction', JSON.stringify(s4.spec));
  } else {
    info('R6 speculative preload did NOT store a draft in the dry run (gated or stub rejected) — the second-system assembly is proven STATIC only (S1); discard-on-mismatch is proven by R3; adoption UNPROVEN', 'authorCalls after knock=' + (ctx.authorPayloads.length - n3) + ' spec=' + JSON.stringify(s4.spec) + ' logs=' + logs.filter(l => /SPECULATIVE/.test(l)).slice(-3).join(' ; '));
  }
  fs.writeFileSync('_validate_out/continuity_spine_dry.json', JSON.stringify({ results, infos, authorPayloads: ctx.authorPayloads.map(p => ({ url: p.url, model: p.model, mode: p.mode, sysLen: p.sys.length, ledgerBlock: (p.sys.match(/STORY LEDGER[\s\S]{0,900}/) || [''])[0] })), otherPosts: ctx.otherPosts, logs, errs }, null, 2));
  await page.context().close();
}
// ── PART C (executable captures of the other assemblies) ────────────────────────────────────────
{
  const page = await (await browser.newContext()).newPage(); const ctx = {}; const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message).slice(0, 160)));
  await wire(page, ctx); await open(page); await page.evaluate(seedMidStory);
  const cg = await page.evaluate(() => { try { return String(window._buildCGScreenplaySystemPrompt() || ''); } catch (e) { return 'ERR ' + e.message; } });
  ok('C1 CG screenplay system prompt (executed builder) carries the block with page 1 facts', /STORY LEDGER \(authoritative/.test(cg) && /p1: reader did: pass the note/.test(cg), cg.slice(0, 80));
  const before = ctx.allPosts.length;
  const sd = await page.evaluate(async () => { try { const r = await window.StoryboundOrchestration.callGrokSDAuthor({ physicalBounds: 'harness bounds', hardStops: ['consent_withdrawal'] }, {}, {}); return 'ok ' + String(r || '').slice(0, 40); } catch (e) { return 'ERR ' + e.message; } });
  const sdPosts = ctx.allPosts.slice(before);
  const sdHit = sdPosts.find(p => /STORY LEDGER \(authoritative/.test(p.sys + p.usr));
  if (sdPosts.length) ok('C2 SD author (executed) → captured POST carries the block', !!sdHit, 'posts=' + sdPosts.map(p => p.url + ' ' + p.model).join(' ; ') + ' ret=' + sd);
  else info('C2 SD author did not POST in the dry run — UNPROVEN by capture (static only)', 'ret=' + sd + ' errs=' + errs.slice(-1));
  const before2 = ctx.allPosts.length;
  const mf = await page.evaluate(async () => { try { const r = await window.StoryboundOrchestration.callMistralSDFallback({ physicalBounds: 'harness bounds', hardStops: ['consent_withdrawal'] }, {}, {}); return 'ok ' + String(r || '').slice(0, 40); } catch (e) { return 'ERR ' + e.message; } });
  const mfPosts = ctx.allPosts.slice(before2);
  const mfHit = mfPosts.find(p => /STORY LEDGER \(authoritative/.test(p.sys + p.usr));
  if (mfPosts.length) ok('C3 Mistral SD fallback (executed) → captured POST carries the block', !!mfHit, 'posts=' + mfPosts.map(p => p.url + ' ' + p.model).join(' ; ') + ' ret=' + mf);
  else info('C3 Mistral SD fallback did not POST in the dry run — UNPROVEN by capture (static only)', 'ret=' + mf + ' errs=' + errs.slice(-1));
  const before3 = ctx.allPosts.length;
  const oas = await page.evaluate(async () => { try { const s = window.state; s.intimacyDialogue = { active: true, beatCount: 1, softCap: 8, hardCap: 14, _exitRampsOffered: 0, temperature: 'warm', userRegister: 'neutral', userSignals: { positive: 0, neutral: 1, disengaged: 0 }, mouthUrls: [], currentMouth: null, currentDirective: '', liTurnHistory: [], userInputLengths: [12], boredomScore: 0, pivotOffered: false, pivotAccepted: false, endIntent: null, startedAt: Date.now(), pendingRequestId: null, awaitingResponse: false, lastRequestStartedAt: 0, _woundEligibleThisScene: false, _repairWindow: null }; await window._handleIntimacyTurn('You came back.', 'I step closer.'); return 'ok'; } catch (e) { return 'ERR ' + e.message; } });
  const oasPosts = ctx.allPosts.slice(before3);
  const oasHit = oasPosts.find(p => /STORY LEDGER \(authoritative/.test(p.sys + p.usr));
  if (oasPosts.length) ok('C4 OAS intimacy turn (executed) → captured POST carries the block', !!oasHit, 'posts=' + oasPosts.map(p => p.url + ' role=' + p.role + ' ' + p.model).join(' ; ') + ' ret=' + oas);
  else info('C4 OAS turn did not POST in the dry run — UNPROVEN by capture (static only)', 'ret=' + oas + ' errs=' + errs.slice(-1));
  info('C5 multi-pass pass-2: unreachable dry (buildScenePlan needs a real plan) — STATIC only (S1)', '');
  info('C6 baked Scene 1: EXCLUDED — verbatim prose, no prompt; the ledger records the page but no block is delivered there', '');
  await page.context().close();
}
await browser.close();
const fails = results.filter(r => !r.pass).length;
console.log('\n' + results.length + ' checks · ' + (results.length - fails) + ' passed · ' + fails + ' failed · ' + infos.length + ' info');
process.exit(fails ? 1 : 0);
