// PAID SCENE-1 RAW-FIRST-DRAFT COMPLIANCE — First Sacrifice, HEAVY, ONE draft.
//
// Authorised spend: exactly one Grok author call. app.js is served UNMODIFIED by the real dev
// server — no instrumenter, no forced tier, no prompt alteration of any kind.
//
// Everything is captured at the NETWORK BOUNDARY via route.fetch(): the recorded request is the
// bytes that left the browser and the recorded response is the bytes that came back.
//
// The instant the author response is in hand, EVERY further model call is aborted at the wire —
// line editor, mechanical repair, purple lens, specialists, LI-texture repair, S+ enforcement,
// images, and anything else. Nothing post-draft can run, and a second author request cannot.
//
// usage: node _scene1_paid_v2.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const DIR = '_paid_scene1_v2';
fs.mkdirSync(DIR, { recursive: true });

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;
const PLANNER_SIG = /scene-structure planner for the OPENING scene/;
const AUTHOR_SIG  = /ARCHITECTURE LAWS/;

const PRICE = {
  'grok-4.3':             { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
  'gpt-4o-mini':          { in: 0.00000015, out: 0.0000006 },
  'gpt-4o':               { in: 0.0000025,  out: 0.00001   },
};

const inventory = [];               // EVERY request attempt, escaped or not
const paid = [];                    // every call that actually reached the network
let planner = null, author = null, authorDone = false;
let blockedAfterDraft = 0, imagesBlocked = 0, secondAuthorAttempts = 0;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

page.on('request', r => {
  const u = r.url();
  inventory.push({ url: u.replace(/^https?:\/\/[^/]+/, ''),
                   host: (u.match(/^https?:\/\/([^/]+)/) || [])[1] || 'local',
                   method: r.method(), api: /\/api\//.test(u), t: Date.now() });
});

await page.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();

  const stub = Object.keys(STUB).find(x => url.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STUB[stub]) });

  if (IMAGE.test(url)) { imagesBlocked++; paid.push({ url, kind: 'IMAGE-BLOCKED', escaped: false }); return route.abort(); }
  if (!MODEL.test(url)) { paid.push({ url, kind: 'NON-MODEL-BLOCKED', escaped: false }); return route.abort(); }

  let body = null;
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const msgs = (body && body.messages) || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  const kind = PLANNER_SIG.test(sys) ? 'PLANNER' : AUTHOR_SIG.test(sys) ? 'AUTHOR' : 'PREREQ';

  // ── HARD STOP: nothing paid runs once the draft is in hand ──
  if (authorDone) {
    blockedAfterDraft++;
    if (kind === 'AUTHOR') secondAuthorAttempts++;
    paid.push({ url, kind: 'BLOCKED-AFTER-DRAFT', wouldHaveBeen: kind, model: body && body.model,
                sysHead: sys.slice(0, 160), escaped: false });
    return route.abort();
  }
  // ── belt: a SECOND author request is refused even if the flag somehow lagged ──
  if (kind === 'AUTHOR' && author) {
    secondAuthorAttempts++;
    paid.push({ url, kind: 'SECOND-AUTHOR-BLOCKED', escaped: false });
    return route.abort();
  }

  const t0 = Date.now();
  const resp = await route.fetch({ timeout: 300000 });
  const text = await resp.text();
  const ms = Date.now() - t0;
  let usage = null;
  try { const j = JSON.parse(text); usage = j.usage || (j._orchestration && j._orchestration.usage) || null; } catch (_) {}

  paid.push({ url, kind, model: body && body.model, max_tokens: body && body.max_tokens,
              temperature: body && body.temperature, reasoning_effort: body && body.reasoning_effort,
              sysLen: sys.length, usrLen: usr.length, status: resp.status(), ms, usage, escaped: true });
  console.log(`   [${kind}] ${url} model=${body && body.model} sys=${sys.length} usr=${usr.length} ${resp.status()} ${ms}ms`);

  if (kind === 'PLANNER' && !planner) planner = { request: body, system: sys, user: usr, rawResponse: text, usage, ms };
  if (kind === 'AUTHOR'  && !author)  { author  = { request: body, system: sys, user: usr, rawResponse: text, usage, ms }; authorDone = true; }

  return route.fulfill({ response: resp, body: text });
});

const logs = [];
page.on('console', m => { const x = m.text();
  if (/SCENE1|SKELETON|PLANNER|A\/50|HOTFAST|SCENE-COST|IDENTITY|SOLO|ENVELOPE|STAGE/.test(x)) logs.push(x.slice(0, 300)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 240)));

console.log(`\n${'═'.repeat(92)}\nPAID SCENE-1 RAW FIRST DRAFT — First Sacrifice · HEAVY · ONE author call\n${'═'.repeat(92)}\n`);
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 60000 });

const pre = await page.evaluate(() => ({
  armA50: (typeof window._armA50 === 'undefined') ? 'undefined' : window._armA50,
  a50BlockEmpty: (typeof window._buildA50ModeDirective === 'function') ? window._buildA50ModeDirective() === '' : 'fn-absent',
  hotFast: (typeof window._hotFastActive === 'function') ? window._hotFastActive() : null,
}));
console.log(` preflight: _armA50=${pre.armA50} · A/50 block empty=${pre.a50BlockEmpty} · hotFast=${pre.hotFast}\n`);

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
    renderMode: 'literary', currentEngine: 'literary', storyId: 'paidv2', myUid: 'probe' });
  s.picks.identity = s.identity;
  s._skipCorridorValidation = true;
  window.__err = null;
  window.__run = window.handleBeginStory().catch(e => { window.__err = String(e && e.message); });
});

const DEADLINE = Date.now() + 480000;
while (!authorDone && Date.now() < DEADLINE) await new Promise(r => setTimeout(r, 500));
if (!authorDone) console.log('\n  ✗ no author call captured within 8 minutes\n');
await new Promise(r => setTimeout(r, 4000));   // let post-draft calls ATTEMPT so we can record the blocks

// ── state-side artifacts + the reconciled envelope, computed by the SHIPPED reconciler ──
const st = await page.evaluate(({ plannerRaw, plannerUser }) => {
  const s = window.state || {};
  let reconciled = null;
  try {
    const j = JSON.parse(plannerRaw);
    const content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '';
    const env = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
    const usr = plannerUser || '';
    const fields = window._openingSpineDeclaredFields ? window._openingSpineDeclaredFields(usr) : [];
    const r = window._reconcileOpeningEnvelope ? window._reconcileOpeningEnvelope(env, fields) : null;
    reconciled = r ? { moves: r.moves, fault: r.fault, createdSpine: r.createdSpine, envelope: r.envelope,
                       declaredFieldCount: fields.length } : { note: 'reconciler unavailable' };
  } catch (e) { reconciled = { error: String(e && e.message) }; }
  return {
    reconciled,
    stageResolved: s._scene1StageResolved || null,
    assignments: s._scene1SceneAssignments || null,
    sceneSkeleton: s.sceneSkeleton ? { character_plus: s.sceneSkeleton.character_plus,
      environment_plus: s.sceneSkeleton.environment_plus, fusion: s.sceneSkeleton.fusion } : null,
    skeletonFatal: s._scene1SkeletonFatal || null,
    hotFast: (typeof window._hotFastActive === 'function') ? window._hotFastActive() : null,
    err: window.__err || null,
  };
}, { plannerRaw: planner ? planner.rawResponse : '{}', plannerUser: planner ? planner.user : '' });
await browser.close();

function draftOf(raw) {
  try { const j = JSON.parse(raw);
    if (typeof j.content === 'string' && j.content) return j.content;
    const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (typeof c === 'string') return c;
  } catch (_) {}
  return raw;
}
const draft = author ? draftOf(author.rawResponse) : '';

let directive = '';
if (author) {
  const i = author.system.indexOf('Narrative skeleton for this scene:');
  if (i !== -1) { const rest = author.system.slice(i); const end = rest.indexOf('\n\n═══');
                  directive = end === -1 ? rest.slice(0, 8000) : rest.slice(0, end); }
}
const cost = (u, model) => {
  if (!u) return null;
  const p = PRICE[model] || PRICE['gpt-4o-mini'];
  const cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
  const fresh = Math.max(0, (u.prompt_tokens || 0) - cached);
  return fresh * p.in + cached * (p.cacheRead || p.in) + (u.completion_tokens || 0) * p.out;
};
const W = (f, s) => fs.writeFileSync(`${DIR}/${f}`, s);
W('01_mistral_request_response.json', JSON.stringify({ request: planner && planner.request,
  system: planner && planner.system, user: planner && planner.user,
  rawResponse: planner && planner.rawResponse, usage: planner && planner.usage, ms: planner && planner.ms }, null, 2));
W('02_reconciled_envelope.json', JSON.stringify(st.reconciled, null, 2));
W('03_resolved_spine_and_stage.json', JSON.stringify({ stageResolved: st.stageResolved,
  openingSpine: st.reconciled && st.reconciled.envelope && st.reconciled.envelope.opening_spine }, null, 2));
W('04_normalized_assignments.json', JSON.stringify({ assignments: st.assignments,
  sceneSkeleton: st.sceneSkeleton, skeletonFatal: st.skeletonFatal }, null, 2));
W('05_skeleton_directive.txt', directive);
W('06_grok_request.json', JSON.stringify({ model: author && author.request.model,
  temperature: author && author.request.temperature, max_tokens: author && author.request.max_tokens,
  reasoning_effort: author && author.request.reasoning_effort,
  system: author && author.system, user: author && author.user }, null, 2));
W('07_grok_raw_response.json', author ? author.rawResponse : '');
W('07_grok_first_draft.md', draft);
W('00_request_inventory.json', JSON.stringify({ paid, inventory, imagesBlocked, blockedAfterDraft,
  secondAuthorAttempts, preflight: pre, hotFast: st.hotFast, pageError: st.err, logs }, null, 2));

const pc = cost(planner && planner.usage, planner && planner.request && planner.request.model);
const ac = cost(author && author.usage, author && author.request && author.request.model);
console.log(`\n${'─'.repeat(92)}`);
console.log(` tier                : ${st.hotFast ? 'HOTFAST' : 'HEAVY'}`);
console.log(` skeleton fault      : ${st.skeletonFatal || 'none'}`);
console.log(` page error          : ${st.err || 'none'}`);
console.log(` reconciler          : moves=${JSON.stringify(st.reconciled && st.reconciled.moves)} fault=${st.reconciled && st.reconciled.fault}`);
console.log(` escaped model calls : ${paid.filter(c => c.escaped).length}  (${paid.filter(c=>c.escaped).map(c=>c.kind).join(', ')})`);
console.log(` blocked after draft : ${blockedAfterDraft}   second-author attempts: ${secondAuthorAttempts}   images blocked: ${imagesBlocked}`);
console.log(` planner usage       : ${planner && planner.usage ? JSON.stringify(planner.usage) : 'n/a'}  ~$${pc != null ? pc.toFixed(5) : '?'}`);
console.log(` grok usage          : ${author && author.usage ? JSON.stringify(author.usage) : 'n/a'}  ~$${ac != null ? ac.toFixed(5) : '?'}`);
console.log(` TOTAL               : ~$${((pc || 0) + (ac || 0)).toFixed(5)}`);
console.log(` draft               : ${draft.length} chars · ${draft.split(/\s+/).filter(Boolean).length} words`);
console.log(`\n artifacts -> ${DIR}/\n`);
process.exit(author ? 0 : 1);
