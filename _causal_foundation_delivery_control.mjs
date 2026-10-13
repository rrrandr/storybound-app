// ── CAUSAL FOUNDATION DELIVERY CONTROL (provider-free, $0) ───────────────────────────────────
// Does the private causal foundation actually REACH the three outgoing requests that plan and
// write this story, with the right asymmetry at each boundary?
//
// The standard here is the project's own: "wired" means the VALUE reaches the PAYLOAD. So every
// assertion below reads a request captured off the wire — never a fragment this file assembled,
// and never the seed object. The three stages are driven by their shipped generators.
//
// WHAT MUST BE TRUE
//   SPINE    receives every cause AND the sealed price (it is the book outline).
//   SCAFFOLD receives the planning causes and NOT the sealed price.
//   AUTHOR   receives private intent + disclosure prohibitions and NOT the sealed price.
//   CONTROL  a story with no causalFoundation sends none of it — if this does not go RED when
//            the emission is removed, the detector is matching something else.
//   SUPERSEDED strings (Teveren, "already his", "COUNTERS it") appear nowhere.
//
// Every model response in this file is CONSTRUCTED here and labelled as such. No provider call.
// STATIC SERVING: the harness serves the REAL public/ directory over a local socket instead of
// depending on `vercel dev`, which is currently returning 500 for every path (it cannot install
// @vercel/node). Nothing in production changes — these are the shipped files, byte for byte — and
// every /api/** call is intercepted in the page regardless, so no route handler is needed.
import { chromium } from 'playwright-core';
import fs from 'fs';
import http from 'node:http';
import path from 'node:path';
import { plannerReply, REQUEST_KINDS, PROSE, GENERIC, PC_BIBLE, LI_BIBLE } from './_delivery_fixtures.generated.mjs';

const PUB = path.resolve('public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
               '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
               '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const statics = http.createServer((req, res) => {
  let p = decodeURIComponent(String(req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const full = path.join(PUB, p);
  if (!full.startsWith(PUB) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.statusCode = 404; return res.end('not found');
  }
  res.setHeader('content-type', MIME[path.extname(full).toLowerCase()] || 'application/octet-stream');
  res.end(fs.readFileSync(full));
});
await new Promise(r => statics.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + statics.address().port;

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + String(detail).slice(0, 600) : '')); }
};
const section = (n) => console.log('\n' + n);

// Markers chosen to be distinctive to ONE tier, so a cross-boundary leak cannot hide behind a
// phrase that legitimately appears in two places.
const M = {
  // Augar now reaches for the memorised rescue formula and leaves its named-amount blank unfilled
  // (the formula is canon in _buildFatelandsWishSlingingDirective), so the marker is the failure
  // to bound it rather than the earlier free-standing "without a protective limit" phrasing.
  spineFather:   "THE FORMULA'S ENTIRE SAFETY IS THE NAMED AMOUNT",
  spineAlive:    'AUGAR IS PHYSICALLY ALIVE',
  spineConceal:  "AUGAR'S SACRIFICE NEVER BECOME PUBLICLY KNOWN",
  spineLimits:   'forgotten name makes you unfindable',
  // CORRECTED 2026-10-13: the "lost BY her vs lost TO her" requirement was an invented wording
  // law and is removed everywhere. The only wording fact is that Julian asked for SIZE.
  spineHinge:    'HE ASKED FOR SIZE AND SHE DID NOT',
  spineNoLaw:    'There is NO further rule about who did the losing',
  spineTried:    'THE START OF AN ADVENTURE AND NEVER A SHORTCUT',
  spineBond:     'THE BOND. He gave up his attachment to Augar',
  SEALED_PRICE:  'his capacity to WITHHOLD',
  planCauses:    'It is not revealed in this issue; it is the gravity under every scene',
  planDoNot:     'do not plan Augar appearing',
  planRelease:   'THE SEAL IS OPEN FROM THIS SCENE ON',
  planHinge:     'The distinction is SIZE REQUESTED, nothing else',
  // DURABLE intent only. "watching a rite move toward…" was an OPENING-ERA circumstance asserted
  // as a standing fact; it is now windowed to scene 1 and the durable half reads "protecting".
  authIntent:    'He is a man protecting the worst hour of his life',
  authForbid:    'DISCLOSURE WINDOW, SCENES 1-15',
  authRelease:   'THE WINDOW IS OPEN',
  authOpening:   'THE DECK IS IN THE SASH SHE IS WEARING',
  authPov:       'POV: first person, Lirael',
};
// Strings that must appear NOWHERE in any request: the invented wording law, in any phrasing.
const INVENTED_LAW = ['lost BY', 'lost TO her', 'SHE LOST" requires', 'requires that Lirael did the losing',
  'nearest thing Lirael HERSELF lost', 'no "she lost" clause'];
const SUPERSEDED = ['Teveren', 'already his', 'COUNTERS it', 'remaining years as the named price'];

const CONSTRUCTED_SCAFFOLD = {
  environment_anchor: 'the ceremony clearing', structural_pacing: 'measured',
  narrative_density: 'moderate', dialogue_ratio: 'balanced', beat_style: 'plain',
  tension_rhythm: 'rising',
  staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON', role: 'officiant' }],
  interlocutor_placement: 'the presiding Dohkar', li_texture_beat: null,
  pc_body_callback: null, li_body_callback: null, antagonist_body_callback: null,
  environment_plus: { target: 'the spiralgrass', axis: 'use' }, fusion: null,
  causal_outline: [{ beat: 'Seren names her offering' }, { beat: 'She changes the wish', link: 'but', from: 0 }],
  stage_contract: { present: ['Lirael', 'Seren'] },
};
// CONSTRUCTED continuation scene proposal, in the shape production validates.
const CONSTRUCTED_SCENE_PROPOSAL = {
  posture_read: 'she waits for the authority rather than leaving',
  local_objective: 'The presiding Dohkar serves Lirael formal notice in the gap between the trunks',
  local_objective_actor: 'the presiding Dohkar',
  present: ['Lirael', 'the presiding Dohkar'],
  state_change: 'Lirael is formally under investigation and restricted',
  state_change_precondition: 'Lirael has not yet been told her conduct is under investigation',
  forces_choice: 'whether to sign the acknowledgement or refuse it',
  event_slots: {
    precondition: 'the presiding Dohkar is present in the scene',
    actor: 'the presiding Dohkar', action: 'serves formal notice of investigation',
    target: 'Lirael', exit_state: 'Lirael is formally under investigation and restricted',
    mechanism_grounding: 'ordinary',
  },
};
const CONSTRUCTED_SPINE = {
  issueArcs: [{ issue: 1, title: 'The First Sacrifice', gravity: 'constructed',
    scenes: [{ n: 1, event: 'constructed row', kind: 'independent' }] }],
};

console.log('=== CAUSAL FOUNDATION DELIVERY CONTROL (provider-free, $0) ===');
console.log('Every model response here is CONSTRUCTED in this file. No provider is called.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
const pageLog = [];
page.on('console', m => { pageLog.push(m.type() + ': ' + m.text().replace(/\s+/g, ' ').slice(0, 300)); });
page.on('pageerror', e => pageLog.push('pageerror: ' + String(e && e.message).slice(0, 220)));
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const msgs = body.messages || [];
  const joined = msgs.map(m => String(m.content || '')).join('\n');
  calls.push({ url, role: body.role, model: body.model || body.preferredModel, joined, bytes: joined.length });
  const reply = (content) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ model: 'constructed', resolvedModel: 'constructed', upstreamAttempts: 1,
      choices: [{ message: { content: content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, cost_in_usd_ticks: 0 } }) });
  // ── DISPATCH, using the SHIPPED fixture classifier (_delivery_fixtures.generated.mjs) ──
  // Every reply below is CONSTRUCTED in this file or in that fixture module. The first version of
  // this harness answered everything it did not recognise with '{}', which aborted the chain the
  // moment it left the opening — so the continuation sections captured nothing. A chain that
  // cannot complete cannot be inspected.
  const sysMsg = String((msgs.find(m => m && m.role === 'system') || {}).content || '');
  const usrMsg = String((msgs.find(m => m && m.role === 'user') || {}).content || '');
  const kind = (REQUEST_KINDS.find(([, m]) => { try { return m(usrMsg, sysMsg); } catch (_) { return false; } }) || [])[0];
  if (/narrative skeletons/i.test(joined)) return reply(JSON.stringify(CONSTRUCTED_SCAFFOLD));
  if (kind === 'scaffold' || /CONTINUITY ARCHITECT/i.test(joined)) return reply(JSON.stringify(CONSTRUCTED_SPINE));
  // The opening planner's reply is built by the shipped fixture generator, which READS the
  // dispatched request and returns a contract-valid envelope. Hand-rolling one here would only
  // test my reconstruction of the envelope contract; this tests the real one.
  if (kind === 'planner' || body.role === 'OPENING_PLANNER') {
    try { return reply(plannerReply(usrMsg)); } catch (e) { return reply('{}'); }
  }
  if (kind === 'author') return reply(PROSE);                   // literary / CG prose
  if (kind === 'pcBodyBible') return reply(JSON.stringify(PC_BIBLE));
  if (kind === 'liBodyBible') return reply(JSON.stringify(LI_BIBLE));
  // CONTINUATION SCENE PLANNER — the per-scene proposal. Shape taken from the accepted contract
  // production validates (see _outline_delivery_control.mjs).
  if (/local_objective|state_change_precondition/i.test(joined))
    return reply(JSON.stringify(CONSTRUCTED_SCENE_PROPOSAL));
  if (/consume-fortune|refund-fortune/.test(url)) return reply(JSON.stringify({ success: true, fortunesRemaining: 9999 }));
  if (kind && /^pa_/.test(kind)) return reply(PROSE);           // post-author passes: return prose unchanged
  return reply(JSON.stringify(GENERIC));
});
console.log('serving the real public/ from ' + ORIGIN + ' (vercel dev is down; 500 on every path)\n');
await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window.__buildCGScaffold === 'function' && window.STARTER_STORIES && typeof window.handleBeginStory === 'function'
  && typeof window.__generateSceneSkeleton === 'function'
  && typeof window._buildFSCausalFoundationBlock === 'function'
  && typeof window._runCGScreenplayGen === 'function', { timeout: 30000 });

const setState = (over) => page.evaluate((o) => {
  const s = window.state;
  s.storyId = 'cf-ctl';
  s._starterId = 'starter_first_sacrifice';
  s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  s.currentEngine = 'graphic'; s.renderMode = 'cg'; s.storyLength = 'fling';
  s.fantasyRegion = 'the_veilwood'; s.issueIndexInRun = 1; s.turnCount = 0;
  // picks.world MUST be 'Fantasy' — it is what First Sacrifice actually runs as, and it gates the
  // Fatelands canon chain and the "why not just wish it solved" planning check. Omitting it made
  // the captured spine request unrepresentative: the contradiction scan caught the planning check
  // missing from a capture that production would have carried.
  s.picks = s.picks || {}; s.picks.world = 'Fantasy';
  s.cgScaffold = null; s.sceneSkeleton = null; s._skeletonMeta = null;
  Object.keys(o || {}).forEach(k => { s[k] = o[k]; });
  return true;
}, over || {});

// ═══ 0. THE RENDERER'S OWN BOUNDARY, BEFORE ANY REQUEST ══════════════════════════════════════
section('0. THE RENDERER (window._buildFSCausalFoundationBlock) — tier asymmetry');
await setState({});
const tiers = await page.evaluate(() => ({
  spine: window._buildFSCausalFoundationBlock(window.state, 'spine') || '',
  planning: window._buildFSCausalFoundationBlock(window.state, 'planning') || '',
  author: window._buildFSCausalFoundationBlock(window.state, 'author') || '',
  bogus: window._buildFSCausalFoundationBlock(window.state, 'reports') || '',
}));
t('spine tier is emitted and carries the sealed price',
  tiers.spine.length > 4000 && tiers.spine.includes(M.SEALED_PRICE), 'len=' + tiers.spine.length);
t('planning tier is emitted and does NOT carry the sealed price',
  tiers.planning.length > 800 && !tiers.planning.includes(M.SEALED_PRICE), 'len=' + tiers.planning.length);
t('author tier is emitted and does NOT carry the sealed price',
  tiers.author.length > 600 && !tiers.author.includes(M.SEALED_PRICE), 'len=' + tiers.author.length);
t('an unrecognised tier name returns EMPTY rather than guessing', tiers.bogus === '',
  JSON.stringify(tiers.bogus.slice(0, 120)));
// NOTE ON THE OPENING SIGNAL: production's _currentSceneNumber treats a bare turnCount of 0 as
// scene 2 (it returns turnCount + 2 when nothing else says otherwise). The authoritative opening
// markers are _isScene1Build === true or _stagedAuthoringSceneIndex === 0, so the test uses one —
// the earlier `!turnCount` gate was the sloppy version and has been replaced by the lifecycle.
const openingAuthor = await page.evaluate(() => {
  const s = window.state; s._stagedAuthoringSceneIndex = 0;
  const out = window._buildFSCausalFoundationBlock(s, 'author') || '';
  delete s._stagedAuthoringSceneIndex; return out;
});
t('the opening-only deck line is present at the OPENING', openingAuthor.includes(M.authOpening));
const laterAuthor = await page.evaluate(() => {
  const s = window.state; s._stagedAuthoringSceneIndex = 4;
  const out = window._buildFSCausalFoundationBlock(s, 'author') || '';
  delete s._stagedAuthoringSceneIndex; return out;
});
t('and GONE by scene 5, while the disclosure window remains',
  !laterAuthor.includes(M.authOpening) && laterAuthor.includes(M.authForbid));

// ═══ 1. THE SPINE'S REAL OUTGOING REQUEST ════════════════════════════════════════════════════
section('1. ISSUE SPINE — read off the wire');
calls.length = 0;
await setState({});
await page.evaluate(() => window.__buildCGScaffold(window.state, {}));
const spineReq = calls.filter(c => /CONTINUITY ARCHITECT/i.test(c.joined)).pop();
t('a spine request was actually sent', !!spineReq, 'calls=' + calls.map(c => c.url).join(','));
if (spineReq) {
  fs.writeFileSync('_audit_out/cf_spine_request.txt', spineReq.joined);
  for (const [k, v] of [['the father\'s unbounded memory offer', M.spineFather],
                        ['that Augar is alive', M.spineAlive],
                        ['the concealment wish', M.spineConceal],
                        ['the concealment\'s explicit LIMITS', M.spineLimits],
                        ['the "she lost" wording hinge', M.spineHinge],
                        ['what was already tried, and why it failed', M.spineTried],
                        ['Julian\'s bond price', M.spineBond],
                        ['FATE\'S SEALED PRICE for the open offer', M.SEALED_PRICE]])
    t('the spine request contains ' + k, spineReq.joined.includes(v));
  t('and it is sent as CAUSE, not as content to narrate',
    /USE IT AS CAUSE, NOT AS CONTENT/.test(spineReq.joined));
  t('spine request bytes: ' + spineReq.bytes, spineReq.bytes > 10000);
}

// ═══ 2. THE SCENE SCAFFOLD'S REAL OUTGOING REQUEST ═══════════════════════════════════════════
section('2. SCENE SCAFFOLD — read off the wire');
calls.length = 0;
await setState({ turnCount: 1, _stagedAuthoringSceneIndex: 1 });
await page.evaluate(() => window.__generateSceneSkeleton(null, null, {}));
const skelReq = calls.filter(c => /narrative skeletons/i.test(c.joined)).pop();
t('a scene scaffold request was actually sent', !!skelReq, 'calls=' + calls.map(c => c.url).join(','));
if (skelReq) {
  fs.writeFileSync('_audit_out/cf_scaffold_request.txt', skelReq.joined);
  t('the scaffold request contains the hidden causes', skelReq.joined.includes(M.planCauses));
  t('the scaffold request contains the DO-NOT-PLAN list', skelReq.joined.includes(M.planDoNot));
  t('the scaffold request contains the wording distinction it must honour',
    skelReq.joined.includes(M.planHinge));
  t('the scaffold is told to stage CONSEQUENCES, not disclose causes',
    /Stage the CONSEQUENCES/.test(skelReq.joined));
  t('*** BOUNDARY: the scaffold request does NOT contain the sealed price',
    !skelReq.joined.includes(M.SEALED_PRICE));
  t('and it does not carry the spine-only account of the concealment either',
    !skelReq.joined.includes(M.spineConceal));
}

// ═══ 2b. THE AUTHOR'S REAL OUTGOING REQUEST ══════════════════════════════════════════════════
// Asserting the renderer's author tier proves only that a string can be built. What matters is
// whether it reaches the payload the author is actually sent, so the shipped CG generator runs
// and the request is read off the wire.
// The authorized experiment is LITERARY Scenes 1-3, so the path tested here is the literary
// opening (handleBeginStory -> introPrompt at app.js ~277724), not the CG screenplay generator.
section('2b. LITERARY AUTHOR — read off the wire (handleBeginStory, the real opening path)');
calls.length = 0;
await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  window._devBypass = true; s.picks = s.picks || {};
  if (def) {
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    s.world = def.world; s.worldSubtype = def.worldSubtype; s.flavor = def.flavor;
    s.dynamic = def.dynamic; s.immutableTitle = def.title;
    s.archetype = { primary: def.archetype, modifier: null };
  }
  s._starterId = 'starter_first_sacrifice'; s.is_starter_story = true;
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  s.partnerName = 'Julian'; s.loveInterest = 'Male'; s.liGender = 'male';
  s.playerMask = 'OPEN_VEIN'; s.storyLength = 'fling'; s.tier = 'fling';
  s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999; s.previewActive = false;
  s._skipCorridorValidation = true; s.intensity = 'Steamy'; s.pov = 'first_person';
  s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.picks.identity = s.identity;
  s._pcLookSkipped = true; s.pcLookLocked = true;
  s.renderMode = 'literary'; s.currentEngine = 'literary';
  s.turnCount = 0; s._stagedAuthoringSceneIndex = 0;
  s.sceneSkeleton = null; s._skeletonMeta = null; s.cgScaffold = null;
});
await page.evaluate(() => { try { window.handleBeginStory(); } catch (_) {} });
for (let w = 0; w < 90000; w += 2000) {
  await page.waitForTimeout(2000);
  if (calls.some(c => c.bytes > 20000 && !/narrative skeletons/i.test(c.joined)
    && !/CONTINUITY ARCHITECT/i.test(c.joined))) break;
}
const openPlanReq = calls.filter(c => c.role === 'OPENING_PLANNER').pop();
const authorReq = calls.filter(c => c.bytes > 20000 && c.role !== 'OPENING_PLANNER'
  && !/narrative skeletons/i.test(c.joined) && !/CONTINUITY ARCHITECT/i.test(c.joined)).pop();
console.log('      calls=' + calls.map(c => (c.role || '?') + ':' + c.bytes + '@'
  + String(c.url).split('/api/').pop()).join(' '));
// THE OPENING PLANNER is a planning authority too — it proposes the scene mission and the stage.
t('an OPENING_PLANNER request was captured off the wire', !!openPlanReq);
if (openPlanReq) {
  fs.writeFileSync('_audit_out/cf_opening_planner_request.txt', openPlanReq.joined);
  t('the opening planner receives the hidden causes', openPlanReq.joined.includes(M.planCauses));
  t('the opening planner receives the DO-NOT-PLAN list', openPlanReq.joined.includes(M.planDoNot));
  t('*** BOUNDARY: the opening planner does NOT receive the sealed price',
    !openPlanReq.joined.includes(M.SEALED_PRICE));
}
t('an OUTGOING AUTHOR request was captured off the wire', !!authorReq,
  authorReq ? authorReq.bytes : 'none captured; page log: ' + pageLog.slice(-12).join(' | '));
if (authorReq) {
  fs.writeFileSync('_audit_out/cf_author_request.txt', authorReq.joined);
  t('the author request carries the private intent about Julian', authorReq.joined.includes(M.authIntent));
  t('the author request carries the ABSOLUTE disclosure prohibitions', authorReq.joined.includes(M.authForbid));
  t('the author request carries the opening-only deck placement (turnCount 0)',
    authorReq.joined.includes(M.authOpening));
  t('and it is told that knowing is not narrating',
    /KNOWING THIS IS NOT NARRATING IT/.test(authorReq.joined));
  t('*** BOUNDARY: the author request does NOT contain the sealed price',
    !authorReq.joined.includes(M.SEALED_PRICE));
  t('*** BOUNDARY: nor the spine-only concealment account',
    !authorReq.joined.includes(M.spineConceal) && !authorReq.joined.includes(M.spineAlive));
  t('author request bytes: ' + authorReq.bytes, authorReq.bytes > 20000);
}

// ═══ 2b2. CONTINUATIONS — SCENES 2 AND 3 ON THE REAL PATH ════════════════════════════════════
// The four earlier captures were all opening-stage. The authorized experiment is three CONNECTED
// scenes, so the continuation chain has to be demonstrated separately: it runs through different
// builders (the scene planner proposal and the continuation author), and an opening-only fact
// must not still be standing there.
section('2b2. CONTINUATION CHAIN: scene planner proposal + author for scenes 2-3');
const PRIOR = 'The gossamer band hung from my hand and the assembly had stopped pretending not to watch.';
const contCaptures = [];
for (const sceneNo of [2, 3]) {
  calls.length = 0;
  await page.evaluate(([prior, sc]) => {
    const s = window.state, SP = window.StoryPagination;
    try { SP.clear(); } catch (_) {}
    try { SP.addPage('<p>' + prior + '</p>', true); } catch (_) {}
    s._sceneTextRing = [{ text: prior }]; s._priorSceneText = prior;
    s._isScene1Build = false;
    // SCENE IDENTITY. _currentSceneNumber reads _isScene1Build, then _stagedAuthoringSceneIndex,
    // then turnCount + 2. Section 2b left _stagedAuthoringSceneIndex at 0 (a CG concept that the
    // literary path does not set), which pinned every continuation to "scene 1" and kept scene
    // 1's window in force. Clear it and let turnCount carry the scene, as the literary path does.
    delete s._stagedAuthoringSceneIndex;
    s.turnCount = sc - 2;
    s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
    s._petitionEmergenceFired = true; s._deckExamineFired = true;
    s.sceneSkeleton = null; s._skeletonMeta = null; s._scenePlotContract = null;
    // THE GATES THAT BLOCKED THIS, found in the page console rather than guessed:
    //   [BAKED:GATE] logged out — unlock modal shown. First Sacrifice's Scene 1 is a BAKED
    //   zero-API package and continuing past it runs _bakedGenesisGate, which requires a signed-in
    //   profile and then charges the issue. _isSignedIn() reads state.profileId, so the harness
    //   supplies one and marks the issue already purchased. Test setup only — no production path
    //   is altered, and nothing here touches the gate's own logic.
    s.profileId = 'cf-ctl-profile';
    s._bakedGenesisUnlocked = true; s.previewActive = false;
    s._issuePurchased = true; s._issuesPurchased = { 1: true };
    s.fortunes = 9999999; s.access = 'sub'; s.subscribed = true;
    // …and the staged/wrong-engine guard: this must read as a LITERARY book, not a CG one.
    s.renderMode = 'literary'; s.currentEngine = 'literary'; s._stagedBook = false;
  }, [PRIOR, sceneNo]);
  await page.evaluate(() => {
    const a = document.getElementById('actionInput'); if (a) a.value = 'I ask the Dohkar who demanded the review.';
    const d = document.getElementById('dialogueInput'); if (d) d.value = '';
    const b = document.getElementById('submitBtn'); if (b) { b.disabled = false; b.click(); }
  });
  for (let w = 0; w < 120000; w += 2500) {
    await page.waitForTimeout(2500);
    if (calls.some(c => c.bytes > 20000)) break;
  }
  const planner = calls.filter(c => /local_objective|state_change_precondition|SCENE SPINE PLANNER/i.test(c.joined)).pop();
  const author = calls.filter(c => c.bytes > 20000
    && !/narrative skeletons/i.test(c.joined) && !/CONTINUITY ARCHITECT/i.test(c.joined)
    && !/local_objective/i.test(c.joined)).pop();
  const skel = calls.filter(c => /narrative skeletons/i.test(c.joined)).pop();
  contCaptures.push({ sceneNo, planner, author, skel,
    seen: calls.map(c => (c.role || '?') + ':' + c.bytes) });
  console.log('      scene ' + sceneNo + ' calls=' + contCaptures[contCaptures.length - 1].seen.join(' '));
}
for (const cap of contCaptures) {
  const tag = 'scene ' + cap.sceneNo + ': ';
  if (cap.planner) {
    fs.writeFileSync('_audit_out/cf_cont_planner_s' + cap.sceneNo + '.txt', cap.planner.joined);
    t(tag + 'the SCENE PLANNER proposal request was captured', true);
    t(tag + 'the planner proposal carries the hidden causes', cap.planner.joined.includes(M.planCauses));
    t(tag + '*** and NOT the sealed price', !cap.planner.joined.includes(M.SEALED_PRICE));
  } else {
    t(tag + 'the SCENE PLANNER proposal request was captured', false, cap.seen.join(' '));
  }
  if (cap.skel) {
    fs.writeFileSync('_audit_out/cf_cont_scaffold_s' + cap.sceneNo + '.txt', cap.skel.joined);
    t(tag + 'the continuation SCAFFOLD carries the hidden causes', cap.skel.joined.includes(M.planCauses));
  }
  if (cap.author) {
    fs.writeFileSync('_audit_out/cf_cont_author_s' + cap.sceneNo + '.txt', cap.author.joined);
    t(tag + 'the CONTINUATION AUTHOR request was captured (' + cap.author.bytes + ' B)', true);
    t(tag + 'it carries the private intent', cap.author.joined.includes(M.authIntent));
    t(tag + 'it carries the disclosure window still in force', cap.author.joined.includes(M.authForbid));
    t(tag + '*** the OPENING-ONLY deck line is NOT standing here',
      !cap.author.joined.includes(M.authOpening));
    t(tag + '*** and it does not carry the sealed price', !cap.author.joined.includes(M.SEALED_PRICE));
  } else {
    t(tag + 'the CONTINUATION AUTHOR request was captured', false, cap.seen.join(' '));
  }
}

// ═══ 2b3. THE REVEAL SCENE, AS A COMPLETE REQUEST ════════════════════════════════════════════
// The lifecycle section below exercises the disclosure HELPER. That is not sufficient and it
// missed a real conflict: a permanent "Nobody may speak the actual hidden truth aloud." was still
// being emitted by the SEED-CONTEXT builder, so the assembled request both permitted and forbade
// the reveal. Only a complete request shows that. This drives the real continuation chain at the
// unsealing scene and reads the whole document.
section('2b3. SCENE 16 — the complete planner and author requests through the real builders');
calls.length = 0;
await page.evaluate((prior) => {
  const s = window.state, SP = window.StoryPagination;
  try { SP.clear(); } catch (_) {}
  try { SP.addPage('<p>' + prior + '</p>', true); } catch (_) {}
  s._sceneTextRing = [{ text: prior }]; s._priorSceneText = prior;
  s._isScene1Build = false;
  delete s._stagedAuthoringSceneIndex;
  s.turnCount = 14;                     // _currentSceneNumber: turnCount + 2 => scene 16
  s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
  s._petitionEmergenceFired = true; s._deckExamineFired = true;
  s.sceneSkeleton = null; s._skeletonMeta = null; s._scenePlotContract = null;
  s.profileId = 'cf-ctl-profile'; s._bakedGenesisUnlocked = true;
  s._issuePurchased = true; s._issuesPurchased = { 1: true };
  s.renderMode = 'literary'; s.currentEngine = 'literary'; s._stagedBook = false;
}, 'The inquiry had been sitting for a month and nobody had said the one thing that mattered.');
await page.evaluate(() => {
  const a = document.getElementById('actionInput'); if (a) a.value = 'I ask Julian, in front of the inquiry, what he did at the rite.';
  const d = document.getElementById('dialogueInput'); if (d) d.value = '';
  const b = document.getElementById('submitBtn'); if (b) { b.disabled = false; b.click(); }
});
for (let w = 0; w < 120000; w += 2500) {
  await page.waitForTimeout(2500);
  if (calls.some(c => c.bytes > 20000)) break;
}
const s16Planner = calls.filter(c => /local_objective|state_change_precondition/i.test(c.joined)).pop();
const s16Author = calls.filter(c => c.bytes > 20000 && c.role !== 'OPENING_PLANNER'
  && !/narrative skeletons/i.test(c.joined) && !/CONTINUITY ARCHITECT/i.test(c.joined)
  && !/local_objective/i.test(c.joined)).pop();
console.log('      scene 16 calls=' + calls.map(c => (c.role || '?') + ':' + c.bytes).join(' '));
t('a COMPLETE scene-16 author request was captured', !!s16Author,
  calls.map(c => (c.role || '?') + ':' + c.bytes).join(' '));
if (s16Author) {
  fs.writeFileSync('_audit_out/cf_s16_author_request.txt', s16Author.joined);
  t('scene 16: the request agrees it is scene 16', /current scene: 16/.test(s16Author.joined));
  t('*** scene 16: the scenes-1-15 disclosure window is NOT in the request',
    !s16Author.joined.includes(M.authForbid));
  t('*** scene 16: the positive permission IS in the request', s16Author.joined.includes(M.authRelease));
  // THE CONFLICT THIS SECTION EXISTS TO CATCH.
  t('*** scene 16: "Nobody may speak the actual hidden truth aloud." is GONE from INVARIANTS',
    !s16Author.joined.includes('Nobody may speak the actual hidden truth aloud'),
    'the seed-context builder is still emitting it as a permanent invariant');
  t('*** scene 16: and the released counterpart is present instead',
    s16Author.joined.includes('NO LONGER FORBIDDEN on the page'));
  t('*** scene 16: release is PERMISSIBLE, not accomplished',
    /PERMISSIBLE, NOT ACCOMPLISHED/.test(s16Author.joined)
    && /nobody in the story has learned anything until a scene actually delivers it/.test(s16Author.joined));
  t('*** scene 16: and later knowledge must follow what the page showed',
    /treat as known only what the page actually showed/.test(s16Author.joined));
  // OPENING-ERA FACTS MUST NOT BE ASSERTED AS CURRENT.
  t('*** scene 16: the rite is not described as currently in progress',
    !s16Author.joined.includes('watching a rite move toward that hour'));
  t('*** scene 16: Lirael\'s overturned belief is not re-asserted',
    !s16Author.joined.includes('believes her father took the family deck when he went'));
  t('scene 16: and the author is pointed at established history for her beliefs instead',
    /her beliefs CHANGE as the story delivers things to her/.test(s16Author.joined));
  t('scene 16: durable motivation survives (Julian is still protecting that hour)',
    s16Author.joined.includes('protecting the worst hour of his life'));
  t('*** scene 16: the sealed price is STILL withheld', !s16Author.joined.includes(M.SEALED_PRICE));
}
if (s16Planner) {
  fs.writeFileSync('_audit_out/cf_s16_planner_request.txt', s16Planner.joined);
  t('a COMPLETE scene-16 planner request was captured', true);
  t('*** scene 16 planner: the do-not-plan schedule has LAPSED', !s16Planner.joined.includes(M.planDoNot));
  t('*** scene 16 planner: the seal-open release is present', s16Planner.joined.includes(M.planRelease));
  t('*** scene 16 planner: still no sealed price', !s16Planner.joined.includes(M.SEALED_PRICE));
} else {
  t('a COMPLETE scene-16 planner request was captured', false, 'none');
}

// ═══ 2c. DISCLOSURE LIFECYCLE — THE PROHIBITIONS MUST RELEASE ════════════════════════════════
// The first version of the author tier shipped a block headed "DISCLOSURE LIMITS, ABSOLUTE" with
// no expiry, so an author at scene 16 was still forbidden to hint at the concealment while the
// spine outlined its delivery. These assertions are the reason that cannot happen again: the
// window must be IN FORCE early, GONE at the reveal, and REPLACED by a positive permission.
section('2c. LIFECYCLE: the author\'s disclosure window across scenes 1 / 5 / 16');
const atScene = (n) => page.evaluate((sc) => {
  const s = window.state;
  s._starterId = 'starter_first_sacrifice';
  s._isScene1Build = (sc === 1);
  s.turnCount = sc - 1;
  s._stagedAuthoringSceneIndex = sc - 1;
  return window._buildFSCausalFoundationBlock(s, 'author') || '';
}, n);
const a1 = await atScene(1), a5 = await atScene(5), a16 = await atScene(16);
fs.writeFileSync('_audit_out/cf_author_tier_s1.txt', a1);
fs.writeFileSync('_audit_out/cf_author_tier_s5.txt', a5);
fs.writeFileSync('_audit_out/cf_author_tier_s16.txt', a16);
t('scene 1: the window is in force', a1.includes(M.authForbid));
t('scene 1: the opening-only deck placement is present', a1.includes(M.authOpening));
t('scene 5: the window is STILL in force', a5.includes(M.authForbid));
t('*** scene 5: the opening-only deck line is GONE (opening facts do not stand)',
  !a5.includes(M.authOpening));
t('*** scene 16: the window has CLOSED — no prohibition on the concealment',
  !a16.includes(M.authForbid));
t('*** scene 16: and a POSITIVE permission replaces it',
  a16.includes(M.authRelease) && /PERMISSIBLE, NOT ACCOMPLISHED/.test(a16));
t('scene 16 still withholds the two later secrets by name',
  /Augar’s survival|Augar's survival/.test(a16) && /price Fate took/.test(a16));
t('the POV rule never expires (it is a rule, not a secret)',
  [a1, a5, a16].every(x => x.includes(M.authPov)));
t('every tier states the current scene so the window is legible',
  a1.includes('current scene: 1') && a16.includes('current scene: 16'));
// Planning tier releases too.
const p5 = await page.evaluate(() => { window.state._isScene1Build = false; window.state.turnCount = 4;
  window.state._stagedAuthoringSceneIndex = 4; return window._buildFSCausalFoundationBlock(window.state, 'planning') || ''; });
const p16 = await page.evaluate(() => { window.state.turnCount = 15;
  window.state._stagedAuthoringSceneIndex = 15; return window._buildFSCausalFoundationBlock(window.state, 'planning') || ''; });
t('planning at scene 5: the do-not-plan schedule applies', p5.includes(M.planDoNot));
t('*** planning at scene 16: the schedule has lapsed and the seal is open',
  !p16.includes(M.planDoNot) && p16.includes(M.planRelease));

// ═══ 2d. THE INVENTED WORDING LAW IS GONE EVERYWHERE ═════════════════════════════════════════
section('2d. REMOVED: the "lost BY her versus lost TO her" requirement');
const allTiers = await page.evaluate(() => {
  const s = window.state; s._starterId = 'starter_first_sacrifice'; s.turnCount = 0; s._isScene1Build = true;
  return ['spine', 'planning', 'author'].map(k => window._buildFSCausalFoundationBlock(s, k) || '').join('\n');
});
for (const bad of INVENTED_LAW) {
  t('absent from every tier: ' + JSON.stringify(bad), !allTiers.includes(bad));
}
t('the spine states the contrast as SIZE REQUESTED instead', allTiers.includes(M.spineHinge));
t('and explicitly denies that a who-did-the-losing rule exists', allTiers.includes(M.spineNoLaw));
t('the planning tier states the same, without the law', allTiers.includes(M.planHinge));

// ═══ 3. CONTROL — IT MUST GO RED WITHOUT THE SEED ════════════════════════════════════════════
section('3. CONTROL: a story with no causalFoundation (the detector must bite)');
calls.length = 0;
await page.evaluate(() => { window.state._starterId = null; window.state.cgScaffold = null; });
await page.evaluate(() => window.__buildCGScaffold(window.state, {}));
const bareSpine = calls.filter(c => /CONTINUITY ARCHITECT/i.test(c.joined)).pop();
t('a spine request was still sent without a seed', !!bareSpine);
if (bareSpine) {
  t('*** CONTROL: it carries NONE of the foundation',
    !bareSpine.joined.includes(M.spineFather) && !bareSpine.joined.includes(M.spineAlive)
    && !bareSpine.joined.includes(M.SEALED_PRICE) && !/PRIVATE CAUSAL FOUNDATION/.test(bareSpine.joined),
    'leak detected');
}
const bareTiers = await page.evaluate(() => ({
  spine: window._buildFSCausalFoundationBlock(window.state, 'spine') || '',
  planning: window._buildFSCausalFoundationBlock(window.state, 'planning') || '',
  author: window._buildFSCausalFoundationBlock(window.state, 'author') || '',
}));
t('all three tiers emit EMPTY for a seedless story (byte-identical path)',
  bareTiers.spine === '' && bareTiers.planning === '' && bareTiers.author === '');

// ═══ 3b. GENERATED FOUNDATIONS — SAME MECHANISM, OR IT IS NOT THE SAME CAPABILITY ════════════
// The spine authors a foundation for stories with no seeded one. Two things must be true, and
// neither was at first: the windows must be STRUCTURED (the renderer honours fromScene/untilScene
// and treats a string as always-on, so "a scene number inside the text" never expires), and a
// spine-only object must be REJECTED rather than stored — otherwise it reproduces the original
// defect, with causes held upstream and nothing downstream.
section('3b. GENERATED FOUNDATION: validation and structured windows');
const tryAttach = (cf) => page.evaluate((c) => {
  const s = window.state;
  s._starterId = null;                       // no authored foundation, so the spine's answer applies
  s._generatedCausalFoundation = null;
  const out = window._attachGeneratedCausalFoundation(s, { causalFoundation: c });
  return { stored: !!s._generatedCausalFoundation, returned: !!out,
           planning: out ? out.planning.length : 0, author: out ? out.author.length : 0 };
}, cf);
const GOOD = {
  spine: ['A paid a price B is concealing', 'the concealment keeps the record incomplete'],
  planning: ['the concealment shapes every official response',
             { untilScene: 9, text: 'do not plan the concealment being discovered' },
             { fromScene: 10, text: 'the discovery is now available to plan' }],
  author: ['B is frightened, not knowing',
           { untilScene: 9, text: 'the reader may not be told that B concealed anything' },
           { fromScene: 10, text: 'it may now reach the page if the scene plan calls for it' }],
  whyNotWishedAway: 'the only person who could phrase the question does not know it needs asking',
};
const good = await tryAttach(GOOD);
t('a complete, windowed foundation IS accepted and stored', good.stored && good.returned,
  JSON.stringify(good));
t('…and whyNotWishedAway is folded into spine and planning', good.planning === 4,
  'planning=' + good.planning);
// REJECTIONS — each must go RED, or the validator is decorative.
const REJECT = [
  ['a spine-only object (the original defect)', { spine: ['a cause'] }],
  ['planning present but author empty', { spine: ['x'], planning: GOOD.planning, author: [] }],
  ['author present but planning empty', { spine: ['x'], planning: [], author: GOOD.author }],
  ['planning restrictions with no release', { spine: ['x'], author: GOOD.author,
    planning: ['a cause', { untilScene: 9, text: 'do not plan it' }] }],
  ['author window with no release', { spine: ['x'], planning: GOOD.planning,
    author: ['intent', { untilScene: 9, text: 'do not tell the reader' }] }],
  ['prose-only windows (a scene number inside a string is not a window)', { spine: ['x'],
    planning: ['do not plan the discovery until scene 10'],
    author: ['do not tell the reader until scene 10'] }],
  ['a missing field', null],
  ['a non-object', 'a foundation, honestly'],
];
for (const [label, cf] of REJECT) {
  const r = await tryAttach(cf);
  t('*** REJECTED, nothing stored: ' + label, !r.stored && !r.returned, JSON.stringify(r));
}
// A malformed window degrades to always-on rather than silently never applying.
const sloppy = await page.evaluate(() => {
  const s = window.state; s._starterId = null; s._generatedCausalFoundation = null;
  const out = window._attachGeneratedCausalFoundation(s, { causalFoundation: {
    spine: ['x'],
    planning: ['c', { untilScene: 9, text: 'r' }, { fromScene: 10, text: 'o' }],
    author: ['i', { untilScene: '9', text: 'typo: a string, not a number' },
             { untilScene: 9, text: 'r' }, { fromScene: 10, text: 'o' }],
  } });
  const typo = out && out.author.filter(x => x && typeof x === 'object' && /^typo:/.test(x.text))[0];
  return { ok: !!out, typoHasWindow: !!(typo && 'untilScene' in typo) };
});
t('*** a malformed scene number is DROPPED (degrades to always-on, never silently inert)',
  sloppy.ok && sloppy.typoHasWindow === false, JSON.stringify(sloppy));
// And an AUTHORED foundation is never overwritten by a generated one.
const authoredWins = await page.evaluate((c) => {
  const s = window.state; s._starterId = 'starter_first_sacrifice'; s._generatedCausalFoundation = null;
  const out = window._attachGeneratedCausalFoundation(s, { causalFoundation: c });
  const rendered = window._buildFSCausalFoundationBlock(s, 'spine') || '';
  return { returned: out, stored: !!s._generatedCausalFoundation, usesAuthored: /v4-2026-10-13-augar/.test(rendered) };
}, GOOD);
t('*** an AUTHORED foundation outranks a generated one and is not overwritten',
  authoredWins.returned === null && !authoredWins.stored && authoredWins.usesAuthored,
  JSON.stringify(authoredWins));

// ═══ 4. SUPERSEDED MATERIAL IS GONE FROM THE SEED ════════════════════════════════════════════
section('4. SUPERSEDED v1-v3 material');
const seedDump = await page.evaluate(() => {
  const p = window.STARTER_SEEDS && window.STARTER_SEEDS.starter_first_sacrifice;
  if (!p) return null;
  return JSON.stringify({ truths: p.truths, dramaticTruth: p.dramaticTruth, cf: p.causalFoundation });
});
t('the seed is reachable for inspection', !!seedDump);
if (seedDump) {
  for (const s of SUPERSEDED)
    t('superseded string absent from truths/dramaticTruth/causalFoundation: ' + JSON.stringify(s),
      !seedDump.includes(s));
  t('dramaticTruth now states the Augar causal chain',
    /alive and does not know he ever had a daughter/.test(seedDump));
  t('truths no longer say Julian countered the misalignment',
    /DIVERT it/.test(seedDump) && !/to counter it/.test(seedDump));
  t('causalFoundation is version-stamped', /v4-2026-10-13-augar/.test(seedDump));
}

fs.writeFileSync('_audit_out/cf_page_console.log', pageLog.join('\n'));
console.log('\n── wrote _audit_out/cf_spine_request.txt and _audit_out/cf_scaffold_request.txt');
console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
await browser.close();
await new Promise(r => statics.close(r));
process.exit(fail ? 1 : 0);
