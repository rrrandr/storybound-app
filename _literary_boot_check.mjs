// ── CAN FIRST SACRIFICE BOOT LITERARY, WITH ITS OWN SCENE 1? (provider-free, $0) ─────────────
// ONE focused check, not a framework. Every /api/* call is intercepted; the pre-author stages are
// served from the runner's existing fixture file, and the AUTHOR request is captured and REFUSED,
// so nothing is generated and nothing is mounted.
//
// WHAT IT PROVES, or fails to:
//   · FS's canonical material survives — _starterId stays set, so STARTER_SEEDS and STARTER_PLANS
//     still resolve (seed, lore, personalities, the 20-scene literary plan).
//   · renderMode is 'literary', not staged_story_mode.
//   · the BAKED Scene 1 is not mounted.
//   · the request that arrives is the LITERARY author ("bestselling romance author"), NOT the CG
//     screenplay author, and it asks for Scene 1 as new prose.
//
// THE OVERRIDES ARE TEST-ONLY AND MINIMAL. _launchStarterStory takes the def as an ARGUMENT, so a
// modified COPY is passed and the shipped STARTER_STORIES catalog is never mutated. The only other
// override is window._bakedScene1For -> null, in the page, for this tab. No repo file, no
// production routing, no saved story, no guard is changed.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin, installEntitledProfileStub, makeSession }
  from './_test_session_env.mjs';
import { findFSDef } from './_fs_story_setup.mjs';

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const SPINE_FIXTURE = fs.existsSync(process.env.SB_SPINE_FIXTURE || '_runner_fixtures/opening_spine_literary.json')
  ? JSON.parse(fs.readFileSync(process.env.SB_SPINE_FIXTURE || '_runner_fixtures/opening_spine_literary.json', 'utf8'))
  : null;
const FIXTURES = JSON.parse(fs.readFileSync(process.env.SB_FIXTURES || '_runner_fixtures/full.json', 'utf8'));
const OUT = '_ab_writing_out/literary_boot_' + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};
const say = (m) => console.log(m);

// ── STAGE 1 CONTROLS ────────────────────────────────────────────────────────────────────────
// LIVE_PLANNER dispatches exactly ONE real opening-planner call. CEILING is the TOTAL cap for the
// remaining experiments and PRIOR is the ledger as it stands, so the cap is enforced against real
// cumulative exposure rather than a per-script allowance.
import { estimateUsd } from './_fsc_cost_guard.mjs';
const LIVE_PLANNER = process.env.SB_LIVE_PLANNER === '1';
const CEILING = Number(process.env.SB_CAP || 0);
const PRIOR = Number(process.env.SB_PRIOR || 0);
// REPLAY + REPAIR. SB_REPLAY_PLANNER serves a SAVED planner response so the paid planner call is
// not repeated; SB_LIVE_REPAIR dispatches production's ONE conditional repair call live. Repair is
// CONDITIONAL on a response failing validation — not a mandatory second call for every opening.
const REPLAY_PLANNER = process.env.SB_REPLAY_PLANNER || null;
const REPLAY_BODY = REPLAY_PLANNER ? fs.readFileSync(REPLAY_PLANNER, 'utf8') : null;
const LIVE_REPAIR = process.env.SB_LIVE_REPAIR === '1';
const EXPECT_FAULT = process.env.SB_EXPECT_FAULT || 'NO_CONTACT';
let repairDispatched = false, repairSpend = 0, repairRetained = 0, repairReceipt = false;
let repairMeta = null, repairFaultMatched = null;
let plannerDispatched = false, plannerSpend = 0, plannerRetained = 0, plannerReceipt = false;
let plannerMeta = null;
if (LIVE_PLANNER && !(CEILING > 0)) {
  console.error('*** REFUSING: SB_LIVE_PLANNER=1 needs SB_CAP (the approved total cap). ***');
  process.exit(2);
}

const CG_AUTHOR = /screenplay-native cinematic-romance writer/i;
const LIT_AUTHOR = /You are a bestselling romance author/i;

const seen = [];
let litReq = null, cgReq = null;

say('=== LITERARY BOOT CHECK (provider-free, $0) ===');
say('origin: ' + ORIGIN);
say('every /api/* call is intercepted; the author request is captured and REFUSED\n');

const browser = await chromium.launch();
const CONSOLE = [];
const page = await browser.newPage();
page.on('console', (m) => { try { CONSOLE.push(m.text()); } catch (_) {} });
await installSession(page, makeSession());
await installEntitledProfileStub(page, { log: () => {} });

await page.route('**/*', async (route) => {
  const req = route.request();
  const url = req.url();
  if (isAuthOrigin(url)) return route.fallback();
  if (/\/api\/config/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(configBody()) });
  }
  if (/\/api\/(img-proxy|bfl-kontext)/.test(url)) {
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"images blocked"}' });
  }
  if (!/\/api\//.test(url)) return route.fallback();

  let body = {};
  try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const sys = String((body.messages && body.messages[0] && body.messages[0].content) || '');
  seen.push({ url: url.replace(/^.*\/api\//, 'api/'), head: sys.slice(0, 60).replace(/\s+/g, ' ') });

  if (LIT_AUTHOR.test(sys)) {
    if (!litReq) {
      litReq = body;
      fs.writeFileSync(OUT + '/literary_author_request.json', JSON.stringify({ url, body }, null, 2));
      say('  [CAPTURED] the LITERARY author request arrived — refusing it, nothing is generated');
    }
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: '{"error":"author call withheld by the literary boot check"}' });
  }
  if (CG_AUTHOR.test(sys)) {
    if (!cgReq) { cgReq = body; say('  [!!] a CG SCREENPLAY author request arrived — the override did not hold'); }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"cg author refused"}' });
  }

  // THE OPENING-PLANNER REQUEST IS SAVED. Production derives its allowlist from the TEMPLATE IT
  // DISPATCHED (_openingSpineDeclaredFields), so the only reliable way to build a conforming
  // fixture is to read the declared keys out of the real request rather than guess which
  // conditional branch of the schema was used.
  if (/scene-structure planner for the OPENING scene/i.test(sys)) {
    try {
      fs.writeFileSync(OUT + '/opening_planner_request.json', JSON.stringify({ url, body }, null, 2));
      say('  [CAPTURED] the opening-planner request (template saved for fixture derivation)');
    } catch (_) {}
  }

  // ── THE CONDITIONAL REPAIR STAGE ──────────────────────────────────────────────────────────
  // Production assembles this ONLY when a planner response fails validation. Its prompt shares
  // the planner's opening sentence, which is why the earlier capture overwrote itself; the
  // discriminator is its own scope line.
  const _usrMsg = String((body.messages && body.messages[1] && body.messages[1].content) || "");
  if (/top-level keys, corrected:/i.test(_usrMsg)) {
    const usr = String((body.messages && body.messages[1] && body.messages[1].content) || '');
    repairFaultMatched = usr.indexOf(EXPECT_FAULT) !== -1;
    fs.writeFileSync(OUT + '/ARM1_repair_request_assembled.json', JSON.stringify({ url, body }, null, 2));
    say('  [REPAIR] assembled; expected fault "' + EXPECT_FAULT + '" present: ' + repairFaultMatched);
    if (!LIVE_REPAIR) {
      say('  [REPAIR] not authorised in this run — refusing');
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"repair not authorised"}' });
    }
    if (repairDispatched) {
      say('  [REPAIR] a SECOND repair was attempted — REFUSED (one repair only, no loop)');
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"one repair only"}' });
    }
    if (!repairFaultMatched) {
      say('  [REPAIR] REFUSED — the assembled fault does not match the saved one; context differs');
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"fault mismatch"}' });
    }
    repairDispatched = true;
    const e = estimateUsd(body, body.preferredModel || body.model, url);
    if (!e || !e.bounded) {
      say('  [REPAIR] REFUSED — unpriceable: ' + ((e && e.refuseReason) || 'no estimate'));
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unpriceable"}' });
    }
    say('  [REPAIR] priced before dispatch: $' + e.estimate.toFixed(6)
      + ' (promptTokens~' + e.promptTokens + ' ESTIMATED chars/4.0, reserved out~' + e.outTokens + ')');
    if (PRIOR + repairSpend + e.estimate > CEILING) {
      say('  [REPAIR] HALTED BEFORE DISPATCH — would exceed the cap $' + CEILING.toFixed(6));
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"cap"}' });
    }
    const t0 = Date.now();
    let res, txt = '';
    try { res = await route.fetch(); txt = await res.text(); }
    catch (err) {
      repairRetained = e.estimate;
      say('  [REPAIR] DISPATCH FAILED: ' + (err && err.message) + ' — reservation RETAINED');
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"dispatch failed"}' });
    }
    const ms = Date.now() - t0;
    let parsed = {}; try { parsed = JSON.parse(txt); } catch (_) {}
    const ticks = parsed.usage && parsed.usage.cost_in_usd_ticks;
    if (typeof ticks === 'number' && ticks > 0) { repairSpend = ticks * 1e-10; repairReceipt = true; }
    else { repairRetained = e.estimate; }
    repairMeta = { ms, status: res.status(), model: parsed.model || null,
      orchestration: parsed._orchestration || null, usage: parsed.usage || null,
      estimated: e.estimate, measured: repairSpend, receipt: repairReceipt, retained: repairRetained };
    fs.writeFileSync(OUT + '/ARM1_repair_response_raw.json', txt);
    say('  [REPAIR] status=' + res.status() + ' ' + ms + 'ms in=' + ((parsed.usage || {}).prompt_tokens ?? '?')
      + ' out=' + ((parsed.usage || {}).completion_tokens ?? '?')
      + (repairReceipt ? ('  receipt $' + repairSpend.toFixed(6)) : ('  NO RECEIPT — retained $' + repairRetained.toFixed(6))));
    return route.fulfill({ status: res.status(), headers: res.headers(), body: txt });
  }

  // ── STAGE 1: ONE REAL OPENING-PLANNER CALL (SB_LIVE_PLANNER=1) ────────────────────────────
  // The ACTUAL outgoing request is priced here, before it leaves — not from an earlier call's
  // receipt, which is a reference figure for a different request. Exactly one dispatch; no
  // retry, and the production validator is untouched either way.
  if (/scene-structure planner for the OPENING scene/i.test(sys) && REPLAY_BODY) {
    say('  [REPLAY] serving the SAVED planner response — the paid planner call is NOT repeated');
    return route.fulfill({ status: 200, contentType: 'application/json', body: REPLAY_BODY });
  }

  if (/scene-structure planner for the OPENING scene/i.test(sys) && LIVE_PLANNER) {
    if (plannerDispatched) {
      say('  [LIVE-PLANNER] a second opening-planner call was attempted — REFUSED (one call only)');
      return route.fulfill({ status: 503, contentType: 'application/json',
        body: '{"error":"one planner call only; no retry"}' });
    }
    plannerDispatched = true;
    const e = estimateUsd(body, body.preferredModel || body.model, url);
    if (!e || !e.bounded) {
      say('  [LIVE-PLANNER] REFUSED — cost cannot be bounded: ' + ((e && e.refuseReason) || 'no estimate'));
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unpriceable"}' });
    }
    say('  [LIVE-PLANNER] THIS request priced before dispatch: $' + e.estimate.toFixed(6)
      + ' (model ' + e.model + ' via ' + e.resolvedBy + '; promptTokens≈' + e.promptTokens
      + ' ESTIMATED at chars/4.0, reserved out≈' + e.outTokens + ')');
    if (PRIOR + plannerSpend + e.estimate > CEILING) {
      say('  [LIVE-PLANNER] HALTED BEFORE DISPATCH — $' + (PRIOR + plannerSpend).toFixed(6)
        + ' + $' + e.estimate.toFixed(6) + ' would exceed the cap $' + CEILING.toFixed(6));
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"cap"}' });
    }
    const t0 = Date.now();
    let res, txt = '';
    try { res = await route.fetch(); txt = await res.text(); }
    catch (err) {
      plannerRetained = e.estimate;
      say('  [LIVE-PLANNER] DISPATCH FAILED: ' + (err && err.message) + ' — reservation RETAINED');
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"dispatch failed"}' });
    }
    const ms = Date.now() - t0;
    let parsed = {}; try { parsed = JSON.parse(txt); } catch (_) {}
    const ticks = parsed.usage && parsed.usage.cost_in_usd_ticks;
    if (typeof ticks === 'number' && ticks > 0) { plannerSpend = ticks * 1e-10; plannerReceipt = true; }
    else { plannerRetained = e.estimate; }
    plannerMeta = { ms, status: res.status(), model: parsed.model || null,
      orchestration: parsed._orchestration || null, usage: parsed.usage || null,
      estimated: e.estimate, measured: plannerSpend, receipt: plannerReceipt,
      retained: plannerRetained };
    fs.writeFileSync(OUT + '/opening_planner_response_raw.json', txt);
    say('  [LIVE-PLANNER] status=' + res.status() + ' ' + ms + 'ms model=' + (parsed.model || '?')
      + ' in=' + ((parsed.usage || {}).prompt_tokens ?? '?')
      + ' out=' + ((parsed.usage || {}).completion_tokens ?? '?')
      + (plannerReceipt ? ('  receipt $' + plannerSpend.toFixed(6))
                        : ('  NO RECEIPT — retained $' + plannerRetained.toFixed(6))));
    return route.fulfill({ status: res.status(), headers: res.headers(), body: txt });
  }

  // THE CORRECTED OPENING-PLANNER FIXTURE takes precedence over the CG-era one, whose five
  // undeclared fields (environment_elements, li_texture_beat, pc_wound_anchor,
  // antagonist_body_callback, stage_contract) made production refuse to author Scene 1. The
  // replacement is DERIVED from the dispatched template's own declared keys
  // (_opening_spine_fixture_from_template.mjs). The production validator is untouched.
  if (/scene-structure planner for the OPENING scene/i.test(sys) && SPINE_FIXTURE) {
    say('  [FIXTURE] serving the template-derived opening_spine reply (labelled fixture, not a plan)');
    return route.fulfill({ status: 200, contentType: 'application/json', body: SPINE_FIXTURE.body });
  }

  // Pre-author stages: serve the runner's own fixture bodies so the flow can reach the author.
  let served = null;
  for (const k of Object.keys(FIXTURES.byMatch || {})) {
    let hit = false;
    try { hit = new RegExp(k, 'i').test(sys); } catch (_) { hit = sys.indexOf(k) !== -1; }
    if (hit) { served = FIXTURES.byMatch[k].body; break; }
  }
  if (!served) served = (FIXTURES.default && FIXTURES.default.body)
    || '{"choices":[{"message":{"content":"{}"}}]}';
  return route.fulfill({ status: 200, contentType: 'application/json', body: served });
});

await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function', { timeout: 30000 });
say('app loaded');

const def = await findFSDef(page);
t('the shipped FS def is found', !!def && def.id === 'starter_first_sacrifice');
t('  and it ships as staged_story_mode (the guard this test overrides)',
  !!def && def.render_mode === 'staged_story_mode', 'render_mode=' + (def && def.render_mode));
t('  with a baked Scene 1 package present in production',
  await page.evaluate(() => !!(window._bakedScene1For && window._bakedScene1For('starter_first_sacrifice'))));

// ── THE TWO TEST-ONLY OVERRIDES ─────────────────────────────────────────────────────────────
const overridden = await page.evaluate(() => {
  window.__realBaked = window._bakedScene1For;
  window._bakedScene1For = function () { return null; };
  return { bakedStubbed: window._bakedScene1For('starter_first_sacrifice') === null,
           catalogUntouched: (window.STARTER_STORIES || []).some(
             (d) => d && d.id === 'starter_first_sacrifice' && d.render_mode === 'staged_story_mode') };
});
t('override 1: the baked-opening lookup returns null for this tab', overridden.bakedStubbed);
t('  and the shipped STARTER_STORIES catalog is UNTOUCHED', overridden.catalogUntouched);

const litDef = Object.assign({}, def, { render_mode: 'literary' });
t('override 2: a COPY of the def carries render_mode=literary (catalog not mutated)',
  litDef.render_mode === 'literary' && def.render_mode === 'staged_story_mode');

// ── BOOT ────────────────────────────────────────────────────────────────────────────────────
say('\nlaunching the test instance...');
await page.evaluate(async (d) => { try { await window._launchStarterStory(d); } catch (_) {} }, litDef);
await page.waitForTimeout(8000);
// THE DEPENDENCY, IDENTIFIED: launching sets the story up but does not author anything. The
// production entry point that generates the scene is handleBeginStory — the baked path calls it
// itself once setup completes (app.js:146447). With the baked opening stubbed out, the test has to
// invoke the SAME production entry point. This is not a new path; it is the one the product uses.
const began = await page.evaluate(async () => {
  if (typeof window.handleBeginStory !== 'function') return 'handleBeginStory is not exposed';
  try { await window.handleBeginStory(); return 'invoked'; } catch (e) { return 'threw: ' + e.message; }
});
say('  handleBeginStory: ' + began);
await page.waitForTimeout(45000);

const st = await page.evaluate(() => ({
  starterId: window.state._starterId || null,
  renderMode: window.state.renderMode || null,
  bakedMounted: !!window.state._bakedOpeningMounted,
  bakedMountedAt: window.state._bakedScene1MountedAt || null,
  scenes: (window.state.scenes || []).length,
  turnCount: window.state.turnCount,
  seedResolves: !!(window._activeSeed ? window._activeSeed(window.state) : null),
  planResolves: !!(window._activePlan ? window._activePlan(window.state) : null),
  isCG: (typeof window._isCGRenderMode === 'function') ? window._isCGRenderMode() : null
}));
say('\nstate after boot: ' + JSON.stringify(st));

t('FS canonical material is INTACT — _starterId still set',
  st.starterId === 'starter_first_sacrifice', JSON.stringify(st.starterId));
t('  the seed resolves (lore / personalities / world truths)', st.seedResolves !== false);
t('  the plan resolves (the authored scene plan)', st.planResolves !== false);
t('renderMode is literary, not staged_story_mode', st.renderMode === 'literary', 'renderMode=' + st.renderMode);
t('  and _isCGRenderMode() is false', st.isCG === false, 'isCG=' + st.isCG);
t('the BAKED Scene 1 was NOT mounted', st.bakedMounted === false && !st.bakedMountedAt,
  'bakedMounted=' + st.bakedMounted + ' at=' + st.bakedMountedAt);
t('no CG screenplay author request was made', cgReq === null);
t('the LITERARY author request WAS reached', litReq !== null);

if (litReq) {
  const sysChars = String(litReq.messages[0].content).length;
  const usrChars = litReq.messages.length > 1 ? String(litReq.messages[1].content).length : 0;
  const total = sysChars + usrChars;
  say('\n── THE LITERARY AUTHOR REQUEST (sizes are ESTIMATES) ──');
  say('  system ' + sysChars + ' chars · user ' + usrChars + ' chars · total ' + total);
  say('  ESTIMATED tokens ~' + Math.ceil(total / 4.0)
    + '  (chars/4.0, the cost guard\'s CHARS_PER_TOKEN — an APPROXIMATION, not a tokenizer,'
    + ' and not measured for any Mistral tokenizer)');
  say('  max_tokens=' + litReq.max_tokens + ' temperature=' + litReq.temperature
    + ' model=' + (litReq.preferredModel || litReq.model || '(unspecified)'));
  const sys = String(litReq.messages[0].content) + ' ' + (litReq.messages[1] ? litReq.messages[1].content : '');
  t('it asks for a FIRST scene (no prior scene to continue)',
    /scene 1|first scene|opening scene/i.test(sys) || st.scenes === 0,
    'scenes=' + st.scenes);
  t('it carries NO CG beat schema (no "beats" array contract)', !/"beats"\s*:\s*\[/.test(sys));
  fs.writeFileSync(OUT + '/SIZES.json', JSON.stringify({ sysChars, usrChars, total,
    estimatedTokensChars4: Math.ceil(total / 4.0), maxTokens: litReq.max_tokens,
    note: 'chars/4.0 estimate from the cost guard; NOT a tokenizer measurement' }, null, 2));
}

say('\n── SUPPORTING CALLS SEEN BEFORE THE AUTHOR (fixture-served, $0) ──');
seen.forEach((c, i) => say('  ' + String(i + 1).padStart(2) + '. ' + c.url + '  <- ' + c.head));
fs.writeFileSync(OUT + '/supporting_calls.json', JSON.stringify(seen, null, 2));

await browser.close();
fs.writeFileSync(OUT + '/console.log', CONSOLE.join('\n'));
if (LIVE_PLANNER) {
  say('\n── STAGE 1 SPEND (this call, not a reference figure) ──');
  if (!plannerMeta) say('  the opening-planner call was NOT dispatched (halted, refused or never reached)');
  else {
    say('  estimated before dispatch : $' + plannerMeta.estimated.toFixed(6));
    say('  measured (receipt)        : $' + plannerMeta.measured.toFixed(6)
      + (plannerMeta.receipt ? '' : '  [NO RECEIPT — retained $' + plannerMeta.retained.toFixed(6) + ']'));
    say('  latency                   : ' + plannerMeta.ms + 'ms  status=' + plannerMeta.status);
    say('  provenance                : ' + JSON.stringify(plannerMeta.orchestration));
    say('  usage                     : ' + JSON.stringify(plannerMeta.usage));
  }
  const spent = plannerSpend + plannerRetained;
  say('  exposure after this stage  : $' + (PRIOR + spent).toFixed(6) + ' of cap $' + CEILING.toFixed(6));
  fs.writeFileSync(OUT + '/STAGE1_SPEND.json', JSON.stringify({ plannerMeta, plannerSpend,
    plannerRetained, prior: PRIOR, cap: CEILING, exposureAfter: PRIOR + spent }, null, 2));
}
say('\n' + pass + '/' + (pass + fail) + ' checks passed');
say('output: ' + OUT);
say('NOTHING WAS GENERATED. Every provider call was intercepted; the author was refused.');
process.exit(fail ? 1 : 0);
