// PAID SCENE-1 FIRST-DRAFT COMPLIANCE CAPTURE — First Sacrifice, HEAVY (production default).
//
// This is the ONE paid run authorised after Commit B. It spends money. It captures four
// artifacts and then STOPS: every model call after the first draft is blocked at the wire, so
// no line-editor, calcified-move repair, specialist or image generator ever runs. The draft
// written to disk is therefore the raw Grok output, not a post-processed one.
//
// Everything is captured at the NETWORK BOUNDARY via route.fetch(), so the recorded request is
// the bytes that left the browser and the recorded draft is the bytes that came back — neither
// is a client-side re-render of what we hope was sent.
//
//   1  _paid_scene1_compliance/01_mistral_raw.json    raw merged planner response
//   2  _paid_scene1_compliance/02_normalized.json     normalised skeleton  (+ 02_directive.txt)
//   3  _paid_scene1_compliance/03_grok_request.json   exact dispatched Grok request
//   4  _paid_scene1_compliance/04_grok_first_draft.md raw first draft, pre-everything
//
// app.js is served UNMODIFIED by the real dev server: no instrumenter, no forced tier. HOTFAST
// defaults off, so this exercises the production HEAVY opening path.
//
// usage: node _scene1_paid_compliance.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const DIR = '_paid_scene1_compliance';
fs.mkdirSync(DIR, { recursive: true });

// Free/local endpoints. Billing, quota and DB writes are stubbed: they are not under test and a
// real story-gen must not mutate a live account to prove a prose contract.
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
// Paid IMAGE generation is irrelevant to prose compliance and is the most expensive thing here.
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
// Paid TEXT models — these are allowed through for real.
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;

const PLANNER_SIG = /scene-structure planner for the OPENING scene/;
const AUTHOR_SIG  = /ARCHITECTURE LAWS/;

const calls = [];
let planner = null, author = null, authorDone = false, blockedAfter = 0, images = 0;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

await page.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();

  const stub = Object.keys(STUB).find(x => url.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STUB[stub]) });

  if (IMAGE.test(url)) { images++; return route.abort(); }

  if (!MODEL.test(url)) { calls.push({ url, kind: 'UNKNOWN-BLOCKED' }); return route.abort(); }

  // ── HARD STOP: nothing paid runs after the first draft is in hand ──
  if (authorDone) { blockedAfter++; calls.push({ url, kind: 'BLOCKED-AFTER-DRAFT' }); return route.abort(); }

  let body = null;
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const msgs = (body && body.messages) || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  const kind = PLANNER_SIG.test(sys) ? 'PLANNER' : AUTHOR_SIG.test(sys) ? 'AUTHOR' : 'other';

  const t0 = Date.now();
  const resp = await route.fetch({ timeout: 300000 });
  const text = await resp.text();
  const ms = Date.now() - t0;

  const rec = { url, kind, model: body && body.model, max_tokens: body && body.max_tokens,
                temperature: body && body.temperature, reasoning_effort: body && body.reasoning_effort,
                response_format: body && body.response_format,
                sysLen: sys.length, usrLen: usr.length, status: resp.status(), ms };
  calls.push(rec);
  console.log(`   [${kind}] ${url} model=${rec.model} sys=${sys.length} usr=${usr.length} ${resp.status()} ${ms}ms`);

  if (kind === 'PLANNER' && !planner) planner = { request: body, system: sys, user: usr, rawResponse: text, ms };
  if (kind === 'AUTHOR'  && !author)  { author = { request: body, system: sys, user: usr, rawResponse: text, ms }; authorDone = true; }

  return route.fulfill({ response: resp, body: text });
});

const logs = [];
page.on('console', m => { const x = m.text(); if (/SCENE1|SKELETON|PLANNER|A\/50|HOTFAST|SCENE-COST/.test(x)) logs.push(x.slice(0, 260)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 240)));

console.log(`\n${'═'.repeat(90)}\nPAID SCENE-1 FIRST-DRAFT COMPLIANCE — First Sacrifice · HEAVY\n${'═'.repeat(90)}\n`);
console.log(' serving PRODUCTION app.js (no instrumenter, no forced tier)\n');

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });

// Kick the real opening path off WITHOUT awaiting it: we stop as soon as the draft returns.
await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  if (!def) throw new Error('starter_first_sacrifice not found');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
    access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    renderMode: 'literary', currentEngine: 'literary', storyId: 'paidcompliance', myUid: 'probe' });
  s.picks.identity = s.identity;
  s._skipCorridorValidation = true;
  window.__paidErr = null;
  window.__paidRun = window.handleBeginStory().catch(e => { window.__paidErr = String(e && e.message); });
});

// Poll until the draft is captured (Node-side flag set by the route handler).
const DEADLINE = Date.now() + 420000;
while (!authorDone && Date.now() < DEADLINE) await new Promise(r => setTimeout(r, 500));
if (!authorDone) { console.log('\n  ✗ no author call captured within 7 minutes\n'); }

// Give the page a moment to settle, then read the state-side artifacts.
await new Promise(r => setTimeout(r, 1500));
const st = await page.evaluate(() => {
  const s = window.state || {};
  return {
    eligible: (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null),
    assignments: s._scene1SceneAssignments || null,
    sceneSkeleton: s.sceneSkeleton ? { character_plus: s.sceneSkeleton.character_plus,
      environment_plus: s.sceneSkeleton.environment_plus, fusion: s.sceneSkeleton.fusion } : null,
    skeletonFatal: s._scene1SkeletonFatal || null,
    auditSystem: (s._lastScene1AuditPrompt && s._lastScene1AuditPrompt.system) || null,
    hotFast: (typeof window._hotFastActive === 'function') ? window._hotFastActive() : null,
    err: window.__paidErr || null,
  };
});
await browser.close();

// ── extract the raw draft text from the upstream response envelope ──
function draftOf(raw) {
  try {
    const j = JSON.parse(raw);
    if (typeof j.content === 'string' && j.content) return j.content;
    const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (typeof c === 'string') return c;
  } catch (_) {}
  return raw;
}
const draft = author ? draftOf(author.rawResponse) : '';

// ── the rendered directive, sliced out of the bytes that were actually dispatched ──
let directive = '';
if (author) {
  const i = author.system.indexOf('Narrative skeleton for this scene:');
  if (i !== -1) {
    const rest = author.system.slice(i);
    const end = rest.indexOf('\n\n═══');
    directive = end === -1 ? rest.slice(0, 6000) : rest.slice(0, end);
  }
}

const W = (f, s) => fs.writeFileSync(`${DIR}/${f}`, s);
W('01_mistral_raw.json', JSON.stringify({
  request: planner && { model: planner.request.model, temperature: planner.request.temperature,
    max_tokens: planner.request.max_tokens, reasoning_effort: planner.request.reasoning_effort,
    response_format: planner.request.response_format },
  system: planner && planner.system, user: planner && planner.user,
  rawResponse: planner && planner.rawResponse, ms: planner && planner.ms }, null, 2));
W('02_normalized.json', JSON.stringify({ eligible: st.eligible, assignments: st.assignments,
  sceneSkeleton: st.sceneSkeleton, skeletonFatal: st.skeletonFatal }, null, 2));
W('02_directive.txt', directive);
W('03_grok_request.json', JSON.stringify({
  model: author && author.request.model, temperature: author && author.request.temperature,
  max_tokens: author && author.request.max_tokens, reasoning_effort: author && author.request.reasoning_effort,
  systemLength: author && author.system.length, userLength: author && author.user.length,
  system: author && author.system, user: author && author.user }, null, 2));
W('04_grok_first_draft.md', draft);
W('00_calls.json', JSON.stringify({ calls, hotFast: st.hotFast, pageError: st.err,
  imagesBlocked: images, blockedAfterDraft: blockedAfter, logs }, null, 2));

// ── report ──
const cp = (st.sceneSkeleton && st.sceneSkeleton.character_plus) || [];
const ep = st.sceneSkeleton && st.sceneSkeleton.environment_plus;
const fu = st.sceneSkeleton && st.sceneSkeleton.fusion;
console.log(`\n${'─'.repeat(90)}`);
console.log(` tier              : ${st.hotFast ? 'HOTFAST' : 'HEAVY'}   (production default)`);
console.log(` eligible cast     : ${JSON.stringify(st.eligible)}`);
console.log(` skeleton fault    : ${st.skeletonFatal || 'none'}`);
console.log(` page error        : ${st.err || 'none'}`);
console.log(` paid text calls   : ${calls.filter(c => c.status).length}  ·  images blocked: ${images}  ·  blocked after draft: ${blockedAfter}`);
console.log(` planner           : ${planner ? `${planner.request.model} re=${planner.request.reasoning_effort} max=${planner.request.max_tokens} ${planner.ms}ms` : 'NONE'}`);
console.log(` grok author       : ${author ? `${author.request.model} max=${author.request.max_tokens} sys=${author.system.length} usr=${author.user.length} ${author.ms}ms` : 'NONE'}`);
console.log(` C+ assigned       : ${JSON.stringify(cp.map(c => c.character))}`);
cp.forEach(c => console.log(`     • ${c.character} — ${c.angle}`));
console.log(` E+                : ${JSON.stringify(ep)}`);
console.log(` fusion            : ${JSON.stringify(fu)}`);
console.log(` A/50 in prompt    : ${author ? /A\/50 COMMERCIAL ROMANCE MODE/.test(author.system) : 'n/a'}`);
console.log(` draft length      : ${draft.length} chars · ${draft.split(/\s+/).filter(Boolean).length} words`);
console.log(`\n artifacts written to ${DIR}/\n`);
process.exit(author ? 0 : 1);
