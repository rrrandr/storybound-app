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
import { plannerReply } from './_delivery_fixtures.generated.mjs';

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
  spineHinge:    '"SHE LOST" requires that LIRAEL did the losing',
  spineTried:    'THE START OF AN ADVENTURE AND NEVER A SHORTCUT',
  spineBond:     'THE BOND. He gave up his attachment to Augar',
  SEALED_PRICE:  'his capacity to WITHHOLD',
  planCauses:    'It is not revealed in this issue; it is the gravity under every scene',
  planDoNot:     'DO NOT PLAN: Augar appearing',
  planHinge:     "JULIAN'S wording carries no such clause",
  authIntent:    'He is a man watching a rite move toward the worst hour of his life',
  authForbid:    'Do NOT write, imply or hint that he is alive',
  authOpening:   'THE DECK IS IN THE SASH SHE IS WEARING',
};
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
  if (/narrative skeletons/i.test(joined)) return reply(JSON.stringify(CONSTRUCTED_SCAFFOLD));
  if (/CONTINUITY ARCHITECT/i.test(joined)) return reply(JSON.stringify(CONSTRUCTED_SPINE));
  // The opening planner's reply is built by the shipped fixture generator, which READS the
  // dispatched request and returns a contract-valid envelope. Hand-rolling one here would only
  // test my reconstruction of the envelope contract; this tests the real one.
  if (body.role === 'OPENING_PLANNER' || /scene-structure planner for the OPENING scene/i.test(joined)) {
    const usrMsg = String((msgs.find(m => m && m.role === 'user') || {}).content || '');
    try { return reply(plannerReply(usrMsg)); } catch (e) { return reply('{}'); }
  }
  if (/consume-fortune/.test(url)) return reply(JSON.stringify({ success: true, fortunesRemaining: 9999 }));
  return reply('{}');
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
t('the opening-only deck line is present at turnCount 0', tiers.author.includes(M.authOpening));
const laterAuthor = await page.evaluate(() => {
  window.state.turnCount = 4;
  const out = window._buildFSCausalFoundationBlock(window.state, 'author') || '';
  window.state.turnCount = 0; return out;
});
t('and GONE once scenes have been authored (turnCount 4), while the limits remain',
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
