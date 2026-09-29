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
const REPAIR_USR_SIG = /Your previous response had one or more fields that failed validation/;

// ══════════════════════════════════════════════════════════════════════════════════════
// ROLE ALLOWLIST (Roman, corrective pass 2026-09-16) — closes the accounting gap: the first
// real run this pass produced fired 12 real model requests but only 1 (the planner) had a
// declared role; the other 11 fell into an undifferentiated PREREQ bucket. "~11 prerequisite
// calls observed" was correctly rejected as not an acceptable budget.
//
// Every entry below was verified against REAL app.js source (route + exact max_tokens +
// exact temperature, read directly from each caller's dispatch site — not inferred from the
// captured ledger's sizes):
//   PC_BODY_BIBLE_TIER1/2/3   — _generatePCBodyBibleUncached, _callTieredProvider('pcBodyBible',
//                                ..., {max_tokens:2500, temperature:0.6}) (app.js ~256580)
//   LI_BODY_BIBLE_TIER1/2/3   — _generateLIBodyBible, _callTieredProvider('liBodyBible', ...,
//                                {max_tokens:3000, temperature:0.6}) (app.js ~257650)
//   ANTAGONIST_BODY_BIBLE_*   — _generateAntagonistBodyBibleUncached, _callTieredProvider(
//                                'antagonistBodyBible', ..., {max_tokens:1100, temperature:0.65})
//                                (app.js ~257891) — First Sacrifice's seed has no antagonist cast
//                                entry, so this is expected NOT to fire for this starter, but is
//                                allowed (not required) since the harness targets a specific
//                                starter, not a specific cast shape.
//   PHYSICAL_CANON_DECALCIFY_GATE — _physicalCanonDecalcifyGate(bible, role, ctxLabel), plain
//                                _setupMistralPost({max_tokens:600, temperature:0.97}) (app.js
//                                ~254910), sys signature "You revise physical-canon fields of a
//                                romance" — a best-effort cross-story-variety polish pass, can
//                                fire once per bible (PC and/or LI), so allowed up to 2x.
//   PC_FIELD_REPAIR_CRISIS/5FIELDS — two distinct inline JSON-repair sub-calls observed inside
//                                _generatePCBodyBibleUncached (app.js ~256699, ~256784), plain
//                                _setupMistralPost at {300,0.9} and {500,0.9} respectively, user
//                                message "Rewrite the crisis/5 fields now as JSON."
//   EDITORIAL_PASS             — window._runEditorialPass (app.js ~98042), fetch('/api/proxy',
//                                {role:'SPECIALIST_RENDERER', preferredModel:
//                                'grok-4-1-fast-non-reasoning', temperature:0.95, max_tokens:220}),
//                                gated on window._editorialPass && turnCount===0.
//   OPENING_PLANNER            — the scene-structure planner call this harness already named.
//   OPENING_PLANNER_REPAIR     — NEW (corrective pass 2026-09-16): the ONE bounded holistic
//                                skeleton repair (_doRepairScaffoldCall, app.js ~268888), same
//                                route/model/sys as OPENING_PLANNER but a distinct, compact user
//                                message — only reachable after the planner response fails
//                                validation AND every fault is a confidently classified C+/E+/
//                                fusion fault.
//   AUTHOR                     — the actual Scene-1 draft call this harness already named.
//
// SIX of the 11 real PREREQ calls from the first successful run (2026-09-16) could NOT be
// matched against any known caller after a real, but time-bounded, static search — see the
// session's own investigation notes. Rather than guess, this allowlist is built ONLY from
// verified callers; anything that does not match one of these roles is a genuinely UNKNOWN
// request and, per Roman's explicit requirement, is BLOCKED before dispatch rather than let
// through blind. If this blocks something on the next run, that is the diagnostic working as
// intended — it names exactly what needs a new allowlist entry, rather than staying opaque.
const ROLE_ALLOWLIST = [
  { role: 'PC_BODY_BIBLE_TIER1_MISTRAL',         route: '/api/mistral-proxy', maxTokens: 2500, temperature: 0.6,  maxCount: 1, required: true,  reachable: 'always' },
  { role: 'PC_BODY_BIBLE_TIER2_GROK',            route: '/api/proxy',         maxTokens: 2500, temperature: 0.6,  maxCount: 1, required: false, reachable: 'after tier1 fails' },
  { role: 'PC_BODY_BIBLE_TIER3_OPENAI',          route: '/api/chatgpt-proxy', maxTokens: 2500, temperature: 0.6,  maxCount: 1, required: false, reachable: 'after tier1+2 fail' },
  { role: 'LI_BODY_BIBLE_TIER1_MISTRAL',         route: '/api/mistral-proxy', maxTokens: 3000, temperature: 0.6,  maxCount: 1, required: true,  reachable: 'always' },
  { role: 'LI_BODY_BIBLE_TIER2_GROK',            route: '/api/proxy',         maxTokens: 3000, temperature: 0.6,  maxCount: 1, required: false, reachable: 'after tier1 fails' },
  { role: 'LI_BODY_BIBLE_TIER3_OPENAI',          route: '/api/chatgpt-proxy', maxTokens: 3000, temperature: 0.6,  maxCount: 1, required: false, reachable: 'after tier1+2 fail' },
  { role: 'ANTAGONIST_BODY_BIBLE_TIER1_MISTRAL', route: '/api/mistral-proxy', maxTokens: 1100, temperature: 0.65, maxCount: 1, required: false, reachable: 'only if seed casts an antagonist (First Sacrifice does not)' },
  { role: 'ANTAGONIST_BODY_BIBLE_TIER2_GROK',    route: '/api/proxy',         maxTokens: 1100, temperature: 0.65, maxCount: 1, required: false, reachable: 'after tier1 fails, same gate as tier1' },
  { role: 'ANTAGONIST_BODY_BIBLE_TIER3_OPENAI',  route: '/api/chatgpt-proxy', maxTokens: 1100, temperature: 0.65, maxCount: 1, required: false, reachable: 'after tier1+2 fail, same gate as tier1' },
  { role: 'PHYSICAL_CANON_DECALCIFY_GATE',       route: '/api/mistral-proxy', maxTokens: 600,  temperature: 0.97, maxCount: 2, required: false, reachable: 'best-effort polish, up to once per bible (PC and/or LI)' },
  { role: 'PC_FIELD_REPAIR_CRISIS',              route: '/api/mistral-proxy', maxTokens: 300,  temperature: 0.9,  maxCount: 1, required: false, reachable: 'best-effort inline JSON repair inside PC bible generation' },
  { role: 'PC_FIELD_REPAIR_5FIELDS',             route: '/api/mistral-proxy', maxTokens: 500,  temperature: 0.9,  maxCount: 1, required: false, reachable: 'best-effort inline JSON repair inside PC bible generation' },
  { role: 'EDITORIAL_PASS',                      route: '/api/proxy',         maxTokens: 220,  temperature: 0.95, maxCount: 1, required: false, reachable: 'gated on window._editorialPass, scene 1 only' },
  // ORDER MATTERS: OPENING_PLANNER_REPAIR's condition is a strict SUBSET of OPENING_PLANNER's
  // (same sys signature, plus the repair-specific user message) — it MUST be checked first, or
  // the weaker OPENING_PLANNER match would shadow every repair call and misclassify it.
  { role: 'OPENING_PLANNER_REPAIR',              route: '/api/proxy',         sysTest: (s, u) => PLANNER_SIG.test(s) && REPAIR_USR_SIG.test(u), maxCount: 1, required: false, reachable: 'only after the planner response fails validation AND every fault is repair-eligible (corrective pass 2026-09-16)' },
  { role: 'OPENING_PLANNER',                     route: '/api/proxy',         sysTest: s => PLANNER_SIG.test(s),                                maxCount: 1, required: true,  reachable: 'always' },
  { role: 'AUTHOR',                              route: '/api/proxy',         sysTest: s => AUTHOR_SIG.test(s),                                 maxCount: 1, required: true,  reachable: 'after a valid skeleton (first-pass or repaired) is accepted' },
];
const roleCounts = {};
const blockedUnknown = [];
function matchRole(url, body, sys, usr) {
  const route = url.split('?')[0];
  for (const r of ROLE_ALLOWLIST) {
    if (r.route !== route) continue;
    if (r.sysTest) { if (!r.sysTest(sys, usr)) continue; }
    else {
      if (typeof r.maxTokens === 'number' && body?.max_tokens !== r.maxTokens) continue;
      if (typeof r.temperature === 'number' && body?.temperature !== r.temperature) continue;
    }
    return r;
  }
  return null;
}

// The old PRICE table (grok-4.3/mistral-small-latest/gpt-4o-mini/gpt-4o $/token rates) was
// removed here (Roman, corrective pass 2026-09-16) — it silently substituted gpt-4o-mini
// pricing for ministral-8b-2512 (never in the table at all) and was never independently sourced
// for the Mistral-family entries either. See costInfo() below: only xAI's own
// cost_in_usd_ticks is treated as sourced; everything else is reported as unsourced usage, not
// estimated.

const inventory = [];               // EVERY request attempt, escaped or not
const paid = [];                    // every call that actually reached the network
let planner = null, author = null, repair = null, authorDone = false;
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

  // ── ROLE ALLOWLIST GATE (Roman, corrective pass 2026-09-16) — closes the accounting gap.
  // Every real model request must match a DECLARED role with remaining budget, or it is
  // blocked before dispatch. This is checked BEFORE the authorDone/second-author guards below
  // so a role violation is always reported as exactly that, never masked by a later reason.
  const matchedRole = matchRole(url, body, sys, usr);
  if (!matchedRole) {
    blockedUnknown.push({ url, model: body?.model, max_tokens: body?.max_tokens, temperature: body?.temperature, sysLen: sys.length, usrLen: usr.length, sysHead: sys.slice(0, 120), usrHead: usr.slice(0, 120) });
    try { console.error('[SCENE1:ROLE-GATE] BLOCKED unrecognized request — ' + url + ' model=' + body?.model + ' max_tokens=' + body?.max_tokens + ' temperature=' + body?.temperature + ' (no matching role in the allowlist)'); } catch (_) {}
    return route.abort();
  }
  roleCounts[matchedRole.role] = (roleCounts[matchedRole.role] || 0) + 1;
  if (roleCounts[matchedRole.role] > matchedRole.maxCount) {
    try { console.error('[SCENE1:ROLE-GATE] BLOCKED — role "' + matchedRole.role + '" exceeded its declared max count (' + matchedRole.maxCount + ')'); } catch (_) {}
    paid.push({ url, kind: 'ROLE-CAP-EXCEEDED', role: matchedRole.role, escaped: false });
    return route.abort();
  }

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

  paid.push({ url, kind, role: matchedRole.role, model: body && body.model, max_tokens: body && body.max_tokens,
              temperature: body && body.temperature, reasoning_effort: body && body.reasoning_effort,
              sysLen: sys.length, usrLen: usr.length, status: resp.status(), ms, usage, escaped: true });
  console.log(`   [${matchedRole.role}] ${url} model=${body && body.model} sys=${sys.length} usr=${usr.length} ${resp.status()} ${ms}ms`);

  if (matchedRole.role === 'OPENING_PLANNER' && !planner) planner = { request: body, system: sys, user: usr, rawResponse: text, usage, ms };
  if (matchedRole.role === 'OPENING_PLANNER_REPAIR' && !repair) repair = { request: body, system: sys, user: usr, rawResponse: text, usage, ms };
  if (matchedRole.role === 'AUTHOR' && !author)  { author  = { request: body, system: sys, user: usr, rawResponse: text, usage, ms }; authorDone = true; }

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
  // DEV BYPASS (Roman, corrective fix 2026-09-16, found by read-only diagnosis after the first
  // run stalled silently for 8 minutes with zero API calls): handleBeginStory hits the real
  // _chargeIssuePurchase gate before any planner/author call. This harness's synthetic
  // subscribed/access fields are client-side only; the real backend charge requires an
  // authenticated session a headless synthetic run never has, so the server declines with
  // authentication_required and handleBeginStory returns early — cleanly, no thrown error, which
  // is why the harness saw silence rather than a page error. app.js already ships a purpose-built
  // bypass for exactly this (_chargeIssuePurchase ~138719, strictly gated to _isQaHost() +
  // window._devBypass, "never fires in production") — this harness never set it. Verified free
  // (model routes deliberately blocked) that setting it lets execution proceed correctly past the
  // purchase gate, through LI Body Bible generation, scene assignment, and C+ evaluation, all the
  // way to firing the real Scene-1 planner call.
  window._devBypass = true;
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
// HONEST COST — Roman, corrective pass 2026-09-16: "Do not present a dollar ceiling while
// Ministral pricing remains unsourced. Report known provider cost separately from unknown-cost
// usage." The ONLY sourced number in this file is xAI's own cost_in_usd_ticks (present on every
// /api/proxy response). Every Mistral-family model (ministral-8b-2512, mistral-small-latest) has
// NO verified $/token rate anywhere in this codebase — this session's own PC-foundation work
// already found and flagged this exact gap (_pc_foundation_preflight_dry.mjs: "no sourced
// ministral-8b-2512 rate exists"). The OLD PRICE table below silently substituted gpt-4o-mini
// pricing for it — exactly the "unverified estimate dressed as a bound" Roman rejected once
// already; that silent substitution is REMOVED, not reused.
function costInfo(u, model) {
  if (!u) return { sourced: false, usd: null, reason: 'no usage data' };
  if (typeof u.cost_in_usd_ticks === 'number') return { sourced: true, usd: u.cost_in_usd_ticks / 1e10, reason: 'provider-reported (xAI cost_in_usd_ticks)' };
  return { sourced: false, usd: null, reason: 'no sourced $/token rate for model "' + (model || 'unknown') + '" in this codebase' };
}
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
W('06b_skeleton_repair.json', JSON.stringify(repair ? { request: repair.request, system: repair.system, user: repair.user, rawResponse: repair.rawResponse, usage: repair.usage, ms: repair.ms } : { fired: false }, null, 2));
// MANIFEST — every declared role, its actual observed count this run, its cap, and whether that
// count is consistent with the allowlist's required/optional/reachable declaration.
const manifest = ROLE_ALLOWLIST.map(r => ({
  role: r.role, route: r.route, maxCount: r.maxCount, required: r.required, reachable: r.reachable,
  observedCount: roleCounts[r.role] || 0,
}));
W('00_request_inventory.json', JSON.stringify({ paid, inventory, imagesBlocked, blockedAfterDraft,
  secondAuthorAttempts, blockedUnknown, manifest, preflight: pre, hotFast: st.hotFast, pageError: st.err, logs }, null, 2));

// HONEST COST LEDGER — sourced (xAI, exact) reported separately from unsourced (Mistral-family,
// genuinely unknown) usage, per Roman's explicit requirement. Never a blended dollar figure that
// would silently imply the unsourced portion is free or negligible.
let sourcedTotal = 0, unsourcedCalls = [];
paid.filter(c => c.escaped && c.usage).forEach(c => {
  const ci = costInfo(c.usage, c.model);
  if (ci.sourced) sourcedTotal += ci.usd;
  else unsourcedCalls.push({ role: c.role, model: c.model, prompt_tokens: c.usage.prompt_tokens, completion_tokens: c.usage.completion_tokens });
});
console.log(`\n${'─'.repeat(92)}`);
console.log(` tier                : ${st.hotFast ? 'HOTFAST' : 'HEAVY'}`);
console.log(` skeleton fault      : ${st.skeletonFatal || 'none'}`);
console.log(` page error          : ${st.err || 'none'}`);
console.log(` reconciler          : moves=${JSON.stringify(st.reconciled && st.reconciled.moves)} fault=${st.reconciled && st.reconciled.fault}`);
console.log(` escaped model calls : ${paid.filter(c => c.escaped).length}  (${paid.filter(c=>c.escaped).map(c=>c.role).join(', ')})`);
console.log(` blocked (no role)   : ${blockedUnknown.length}${blockedUnknown.length ? '  — ' + blockedUnknown.map(b => b.url + ' mt=' + b.max_tokens + ' t=' + b.temperature).join(' | ') : ''}`);
console.log(` blocked after draft : ${blockedAfterDraft}   second-author attempts: ${secondAuthorAttempts}   images blocked: ${imagesBlocked}`);
console.log(`\n ROLE MANIFEST:`);
manifest.forEach(m => console.log(`   ${m.role.padEnd(32)} observed=${m.observedCount}/${m.maxCount}  ${m.required ? 'REQUIRED' : 'optional'}  (${m.reachable})`));
console.log(`\n COST — SOURCED (xAI, exact, provider-reported): ~$${sourcedTotal.toFixed(5)}`);
console.log(` COST — UNSOURCED (Mistral-family, genuinely unknown $/token): ${unsourcedCalls.length} call(s) — ${unsourcedCalls.map(c => c.role + ' (' + c.prompt_tokens + '+' + c.completion_tokens + ' tok)').join(', ') || 'none'}`);
console.log(` TOTAL — NOT a single dollar figure: sourced ~$${sourcedTotal.toFixed(5)} PLUS ${unsourcedCalls.length} unsourced call(s). No invented rate is applied to the unsourced portion.`);
console.log(` draft               : ${draft.length} chars · ${draft.split(/\s+/).filter(Boolean).length} words`);
console.log(`\n artifacts -> ${DIR}/\n`);
process.exit(author ? 0 : 1);
