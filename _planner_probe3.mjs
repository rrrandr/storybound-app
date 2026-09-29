// BOUNDED PLANNER-ONLY PROBE — 3 sequential samples, First Sacrifice Scene 1.
//
// Exactly ONE real network call per sample: the opening planner. Everything upstream is mocked
// (free, deterministic) and Grok is HARD-BLOCKED — if an author request is ever attempted the
// sample is marked a violation. No downstream transformation, no full pipeline, no push.
//
// The request is built by PRODUCTION app.js, unmodified, so the stage contract, schema and
// eligible-cast block are exactly what the product would send today.
//
// usage: node _planner_probe3.mjs [n]
import { chromium } from 'playwright-core';
import fs from 'fs';
import { makeSession } from './_test_session_env.mjs';

// ── THE PURCHASE IS BEHIND A SESSION (wallet-security merge, 640a258) ──
// Production correctly refuses to sell the issue without a token: "[FORTUNE] no session token —
// charge not attempted" → "[ISSUE-PURCHASE] … authentication_required" → handleBeginStory aborts
// before any planner call (observed 2026-09-05 in the $0 control). Seed a dummy session under the
// REAL project's storage key (same pattern as _cold_scene1_cost_run.mjs) and stub the Supabase
// origin so the auth client can never reach a network. Config is served real, never faked.
const CFG = await (await fetch('http://localhost:3000/api/config')).json();
const SB_ORIGIN = new URL(CFG.supabaseUrl).origin;
const SB_KEY = 'sb-' + new URL(CFG.supabaseUrl).hostname.split('.')[0] + '-auth-token';

const N = Number(process.argv[2] || 3);
const DIR = process.argv[4] || '_planner_probe3';
fs.mkdirSync(DIR, { recursive: true });

// ── STAGE 0 KNOBS (2026-09-05, pilot_protocol_v1.md) ──
//   PP_ROUTE=8b|14b|small  sets window._preprocessorRoute before any page script (the flag-gated
//                          client route from _drafts/preprocessor-route-flag.patch). Unset = committed default.
//   CAP=<n>                HARD cap on real planner dispatches for the whole run (default 3). A planner
//                          request past the cap is ABORTED at the route and recorded as capped — retries
//                          inside the app count against it, so the authorized ceiling cannot be exceeded.
//   PRICE_IN / PRICE_OUT   $ per token for the model under test (default: the draft-recorded Ministral rates
//                          are NOT assumed — pass them explicitly; unset falls back to the in-repo Small rate).
const PP_ROUTE = process.env.PP_ROUTE || null;
const CAP = Number(process.env.CAP || 3);
let realDispatches = 0;
const cappedRequests = [];
const utf8 = s => Buffer.byteLength(String(s || ''), 'utf8');

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const STUB = {
  '/api/consume-fortune':         { success:true, fortunesRemaining:9999 },
  '/api/verify-subscription':     { success:true, subscribed:true, tier:'sub' },
  '/api/claim-issue-number':      { success:true, issueNumber:1 },
  '/api/refund-fortune':          { success:true },
  '/api/grant-welcome-milestone': { success:true },
  '/api/record-legal-acceptance': { success:true },
};
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;
const PLANNER_SIG = /scene-structure planner for the OPENING scene/;
const AUTHOR_SIG  = /ARCHITECTURE LAWS/;

const L = 'she understands the wish has already begun to cost her something she cannot name';
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

const PRICE = { in:  Number(process.env.PRICE_IN  || 0.00000015),
                out: Number(process.env.PRICE_OUT || 0.0000006) };   // default = mistral-small-latest in-repo rate

const browser = await chromium.launch({ headless: true });

async function sample(i, mode) {
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  const planner = [], authorAttempts = [], escaped = [], mocked = [];
  const logs = [];
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(STUB).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(STUB[k]) });
    if (IMAGE.test(url)) return route.abort();
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) return route.abort();
    const m=(b&&b.messages)||[];
    const sys=String((m.find(x=>x.role==='system')||{}).content||'');
    const usr=String((m.find(x=>x.role==='user')||{}).content||'');

    // ── HARD BLOCK: Grok must never be called by this probe ──
    if (AUTHOR_SIG.test(sys)) { authorAttempts.push(url); return route.abort(); }

    // ── THE ONE REAL CALL ──
    if (PLANNER_SIG.test(sys)) {
      // ── REPLAY MODE ($0): serve a frozen planner envelope instead of dispatching ──
      //   REPLAY_DIR=<dir>  serves <dir>/sample<i>_response.json verbatim for sample i. The product
      //   validates it exactly as it would a live reply, so the SAME harness is the control test for
      //   validator changes: replay the six frozen stage-0 plans before and after, diff the verdicts.
      if (process.env.REPLAY_DIR) {
        const rp = `${process.env.REPLAY_DIR}/sample${i}_response.json`;
        const saved = fs.readFileSync(rp, 'utf8');
        planner.push({ url, request: b, system: sys, user: usr, status: 200, replayed: rp,
                       identity: { model: b && b.model, reasoning_effort_present: !!(b && b.reasoning_effort != null), reasoning_effort: b && b.reasoning_effort,
                                   response_format: b && b.response_format, max_tokens: b && b.max_tokens,
                                   messageBytes: m.reduce((a, x) => a + utf8(x && x.content), 0), reserve: 0 },
                       governorRefusal: null, retryAfter: null, rawResponse: saved, ms: 0 });
        return route.fulfill({ status: 200, contentType: 'application/json', body: saved });
      }
      // ── HARD CAP: the authorized ceiling is enforced HERE, before the wire ──
      if (realDispatches >= CAP) {
        cappedRequests.push({ sample: i, url, model: b && b.model });
        return route.abort();
      }
      realDispatches++;
      // request identity, recorded BEFORE dispatch (what the product actually sent)
      const identity = { model: b && b.model,
                         reasoning_effort_present: !!(b && b.reasoning_effort !== undefined && b.reasoning_effort !== null),
                         reasoning_effort: b && b.reasoning_effort,
                         response_format: b && b.response_format,
                         max_tokens: b && b.max_tokens,
                         messageBytes: m.reduce((a, x) => a + utf8(x && x.content), 0),
                         reserve: m.reduce((a, x) => a + utf8(x && x.content), 0) + (Number(b && b.max_tokens) || 0) };
      const t0 = Date.now();
      const resp = await route.fetch({ timeout: 180000 });
      const text = await resp.text();
      let gov = null; try { const j = JSON.parse(text); if (j && j.governor) gov = { governor: true, error: j.error, terminal: j.terminal, retry_after_ms: j.retry_after_ms }; } catch (_) {}
      planner.push({ url, request: b, system: sys, user: usr, status: resp.status(), identity, governorRefusal: gov,
                     retryAfter: resp.headers()['retry-after'] || null,
                     rawResponse: text, ms: Date.now() - t0 });
      return route.fulfill({ response: resp, body: text });
    }
    // ── everything else: free mock ──
    mocked.push(url);
    const out = JSON.stringify(GENERIC);
    const env = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(env) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  page.on('console', m => { const x=m.text(); if (process.env.DEBUG_ALL === '1' || /SCENE1|STAGE|SKELETON|PLANNER|ANGLE/.test(x)) logs.push(x.slice(0,300)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

  // session seeded BEFORE any page script runs; checkout-intent keys cleared so no boot-time
  // CHECKOUT_RETURN auto-begin fires a second handleBeginStory underneath ours.
  await page.addInitScript(({ key, s }) => {
    try { window.localStorage.setItem(key, JSON.stringify(s)); } catch (_) {}
    try {
      ['sb_baked_pending_entry','sb_ff_pending_entry','sb_pre_checkout_fortunes'].forEach(k => window.localStorage.removeItem(k));
      Object.keys(window.localStorage).filter(k => k.indexOf('sb_pending_op_') === 0).forEach(k => window.localStorage.removeItem(k));
    } catch (_) {}
  }, { key: SB_KEY, s: makeSession() });
  // Supabase origin: what PostgREST returns for no rows, which .maybeSingle() reduces to null.
  await page.route(SB_ORIGIN + '/**', r => {
    const mth = r.request().method();
    if (mth === 'GET' || mth === 'HEAD') return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  page.on('console', m => { if (/Profile hydrated\./.test(m.text())) page.evaluate(() => { window.__hydrationSeen = true; }).catch(() => {}); });
  if (PP_ROUTE) await page.addInitScript((r) => { window._preprocessorRoute = r; }, PP_ROUTE);
  // SB_VALVE=off → the contract-v2 availability valve is switched off for this page (an invalid
  // assignment plan then ABORTS Scene 1 as before). Used as the valve's mutation control.
  if (process.env.SB_VALVE === 'off') await page.addInitScript(() => { window._scene1AssignmentValve = false; });
  if (process.env.SB_VALVE === 'on')  await page.addInitScript(() => { window._scene1AssignmentValve = true; });
  // in-page dispatch observer: handleBeginStory resolves before the flow finishes, so settle is
  // decided on the product's own markers or on quiescence of /api/ fetches, never on its return.
  await page.addInitScript(() => {
    window.__fetchObs = [];
    const _f = window.fetch;
    window.fetch = function (u) { try { if (/\/api\//.test(String((u && u.url) || u))) window.__fetchObs.push(Date.now()); } catch (_) {} return _f.apply(this, arguments); };
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:120000 });
  // hydration lands asynchronously and would overwrite staged access state; wait for it first.
  await page.waitForFunction(() => window.__hydrationSeen === true, { timeout: 60000 })
    .catch(() => logs.push('(no "Profile hydrated." marker within 60s — staging may race hydration)'));
  const st = await page.evaluate(async (mode) => {
    const s = window.state;
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'probe3', myUid:'probe' });
    if (mode === 'corridor') {
      // No seed. The planner OWNS setting and presence, and the LI is MENTIONED in the mission
      // but never staged — so exclusion is exercised against live output, not just synthetically.
      s._scene1Mission = 'She waits alone in the customs house before the tide turns, rehearsing what she will say to Julian when he finally comes to collect the debt';
    } else {
      Object.assign(s, { _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
    }
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    let threw = null, settled = false, settleReason = 'timeout';
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,150000))]); }
    catch(e){ threw = String(e && e.message); }
    // handleBeginStory RESOLVES BEFORE THE FLOW IS DONE (cold run note, 2026-09-04). Wait on the
    // product's own markers, else on dispatch quiescence; a timeout is reported as one.
    { const t0 = Date.now(); let lastLen = -1, lastChange = Date.now();
      while (Date.now() - t0 < 170000) {
        if (s._scene1SceneAssignments) { settled = true; settleReason = 'assignments'; break; }
        if (s._scene1SkeletonFatal)    { settled = true; settleReason = 'fatal'; break; }
        if (s._scene1QuotaBusy)        { settled = true; settleReason = 'quota'; break; }
        const n = (window.__fetchObs || []).length;
        if (n !== lastLen) { lastLen = n; lastChange = Date.now(); }
        else if (n > 0 && Date.now() - lastChange > 12000) { settled = true; settleReason = 'quiescent'; break; }
        await new Promise(r => setTimeout(r, 500));
      } }
    const stage = s._scene1StageResolved || (window._scene1StageContract ? window._scene1StageContract(s) : null);
    return { threw, settled, settleReason, quotaBusy: s._scene1QuotaBusy || null, fetchCount: (window.__fetchObs || []).length,
      // contract v2 valve: an invalid plan no longer sets the fatal — it drops the assignments and records why
      assignmentsDropped: s._scene1AssignmentsDropped || null,
      stage: stage && { ok:stage.ok, fault:stage.fault, source:stage.source,
                        settingOwner:stage.settingOwner, presenceOwner:stage.presenceOwner,
                        setting:stage.setting, presentText:stage.presentText,
                        onStage:(stage.onStage||[]).map(c=>c.label),
                        offStage:(stage.offStage||[]).map(c=>({ name:c.name, reason:c.reason })) },
      assignments: s._scene1SceneAssignments || null,
      fatal: s._scene1SkeletonFatal || null,
      envelopeNormalised: !!s._scene1EnvelopeNormalised,
      stagedLifted: !!s._scene1StagedLifted,
      attempts: s._scene1PlannerAttempts, retryReason: s._scene1PlannerRetryReason || null,
      // ── SCORE IN-PAGE, AGAINST THE RESOLVED STAGE, WITH THE SHIPPED FUNCTIONS ──
      // The old scorecard re-derived everything from the raw response against the PRE-resolution
      // stage, so it printed known-wrong ✗ marks for plans the product had accepted. A paid
      // harness that prints false failures is not evidence. This scores what the product scored:
      // the normalised assignments, the resolved stage, and _targetInInventory/_targetInScene.
      score: (function () {
        try {
          const st = s._scene1StageResolved;
          const a  = s._scene1SceneAssignments;
          if (!st) return { computable:false, reason:'no resolved stage (aborted before resolution)' };
          const lc = x => String(x || '').trim().toLowerCase();
          const cp = (a && a.character_plus) || [];
          const ep = a && a.environment_plus;
          const fu = a && a.fusion;
          const onLabels = (st.onStage || []).map(r => r.label);
          const offLc = (st.offStage || []).map(r => lc(r.name));
          const plannerOwnsEnv = st.environmentOwner === 'planner';
          const grounded = (t) => plannerOwnsEnv
            ? window._targetInInventory(t, st.environmentElements, st.setting)
            : window._targetInScene(t, st.groundText);
          const c = {
            settingKept:  !!st.setting && (st.settingOwner === 'planner' ? true : true),
            noOffstage:   !cp.some(x => offLc.includes(lc(x.character)))
                          && !(fu && fu.character && offLc.includes(lc(fu.character))),
            oneEach:      cp.length === onLabels.length
                          && onLabels.every(n => cp.some(x => lc(x.character) === lc(n)))
                          && new Set(cp.map(x => lc(x.character))).size === cp.length,
            firstMention: cp.length > 0 && cp.every(x => x.first_mention === true),
            anglesOk:     cp.length > 0 && cp.every(x => window._validateAngleConcreteness(x.angle, x.character).ok),
            epGrounded:   !!(ep && ep.target) && grounded(ep.target),
            fusionOk:     !!(fu && fu.character && fu.target && fu.beat),
          };
          const verdict = Object.keys(c).every(k => c[k]);
          // ── NEW SCHEMA (2026-08-26) — REPORTED, NOT SCORED ──
          // Kept out of `verdict` deliberately: the product judges these with token-coverage
          // tolerance, and an exact-match column here would print disagreements the product
          // never reached. Reported so the sample can be read; the product's own accept/reject
          // remains the only verdict.
          const pof = a && a.pc_opening_fusion;
          const pcRec = (st.onStage || []).filter(r => r.kind === 'pc')[0] || null;
          const pcLabel = pcRec ? pcRec.label : '';
          const pcCp = cp.filter(x => lc(x.character) === lc(pcLabel))[0] || null;
          // The staged manifest as VALIDATED and stored by the product (state._scene1StagedCharacters),
          // not a re-read of the raw reply — the anchor we compare is the one that shipped.
          const stagedPc = (s._scene1StagedCharacters || [])
            .filter(x => x && lc(x.name) === lc(pcLabel))[0] || null;
          const newSchema = {
            pcLabel,
            epBeat: (ep && ep.beat) || null,
            epBeatGrounded: !!(ep && ep.beat) && grounded(ep.target),
            pof: pof || null,
            pofTargetMatches: !!(pof && ep) && lc(pof.environment_target) === lc(ep.target)
                              && lc(pof.environment_axis) === lc(ep.axis),
            pofIsPc: !!(pof && pcLabel) && lc(pof.character) === lc(pcLabel),
            pcCpAngle: pcCp ? pcCp.angle : null,
            pcCpIsTheBeat: !!(pof && pcCp) && String(pcCp.angle).trim() === String(pof.beat).trim(),
            pcAnchor: stagedPc ? (stagedPc.anchor_beat || null) : null,
            pcAnchorIsTheBeat: !!(pof && stagedPc)
              && String(stagedPc.anchor_beat || '').trim() === String(pof.beat).trim(),
            nonPcCp: cp.filter(x => lc(x.character) !== lc(pcLabel))
                       .map(x => ({ who: x.character, angle: x.angle })),
          };
          return { computable:true, criteria:c, verdict, newSchema,
                   environmentOwner: st.environmentOwner || 'stage',
                   elements: st.environmentElements || null };
        } catch (e) { return { computable:false, reason:'score threw: ' + (e && e.message) }; }
      })() };
  }, mode);
  await page.close();
  return { i, mode, planner, authorAttempts, escaped, mocked, logs, ...st };
}

const results = [];
console.log(`\n${'═'.repeat(94)}\nBOUNDED PLANNER PROBE — First Sacrifice Scene 1 · ${N} sequential samples\n${'═'.repeat(94)}`);
console.log(` one real call per sample (the planner) · Grok hard-blocked · upstream mocked\n`);

const MODES = (process.argv[3] || 'seeded,seeded,corridor').split(',');
for (let i = 1; i <= N; i++) {
  if (i > 1) { console.log(` … 25s gap (sequential, never a burst)\n`); await new Promise(r => setTimeout(r, 25000)); }
  const R = await sample(i, MODES[i - 1] || 'seeded');
  results.push(R);

  const p = R.planner[0];
  let env = null, plan = null, usage = null, finish = null, content = '';
  if (p) {
    try { env = JSON.parse(p.rawResponse); } catch (_) {}
    usage = env && env.usage;
    finish = env && env.choices && env.choices[0] && env.choices[0].finish_reason;
    content = (env && env.choices && env.choices[0] && env.choices[0].message && env.choices[0].message.content) || '';
    try { plan = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)); } catch (_) {}
  }
  const spine = plan && (plan.opening_spine || plan);
  const skel  = plan && (plan.scene_skeleton || (plan.opening_spine && plan.opening_spine.scene_skeleton));
  const cost = usage ? (usage.prompt_tokens * PRICE.in + usage.completion_tokens * PRICE.out) : null;

  fs.writeFileSync(`${DIR}/sample${i}_request.json`, JSON.stringify(
    { params: p && { model:p.request.model, temperature:p.request.temperature, max_tokens:p.request.max_tokens,
                     reasoning_effort:p.request.reasoning_effort, response_format:p.request.response_format },
      system: p && p.system, user: p && p.user }, null, 2));
  fs.writeFileSync(`${DIR}/sample${i}_response.json`, p ? p.rawResponse : '');
  fs.writeFileSync(`${DIR}/sample${i}_verdict.json`, JSON.stringify(
    { stage: R.stage, assignments: R.assignments, newSchema: (R.score && R.score.newSchema) || null, fatal: R.fatal,
      attempts: R.attempts, retryReason: R.retryReason, usage, finish, cost,
      angleRejections: R.logs.filter(l => /ANGLE:REJECTED/.test(l)),
      logs: R.logs.filter(l => /STAGE|SKELETON|PLANNER|ABORT/.test(l)) }, null, 2));

  console.log(` ── SAMPLE ${i} · ${R.mode.toUpperCase()} ${'─'.repeat(66)}`);
  console.log(`  network      : planner=${R.planner.length} real · mocked=${R.mocked.length} · GROK attempts=${R.authorAttempts.length} · escaped=${R.escaped.length}`);
  console.log(`  attempts     : ${R.attempts} ${R.retryReason ? `(retried: ${R.retryReason})` : '(no retry)'}`);
  console.log(`  settle       : ${R.settled ? R.settleReason : 'TIMEOUT'} · in-page /api fetches=${R.fetchCount} · threw=${R.threw || 'no'}${R.quotaBusy ? ' · QUOTA ' + JSON.stringify(R.quotaBusy).slice(0, 160) : ''}`);
  console.log(`  usage        : ${usage ? `${usage.prompt_tokens} in / ${usage.completion_tokens} out · finish=${finish}` : 'n/a'}`);
  console.log(`  cost         : ${cost != null ? '$' + cost.toFixed(5) : 'n/a'}`);
  if (R.stage) {
    console.log(`  SUPPLIED WHERE (${R.stage.settingOwner}-owned): ${String(R.stage.setting).slice(0,100)}`);
    console.log(`  SUPPLIED PRESENT       : ${String(R.stage.presentText).slice(0,120)} (presenceOwner=${R.stage.presenceOwner})`);
    console.log(`  eligible C+ recipients : ${JSON.stringify(R.stage.onStage)}`);
    console.log(`  offstage (ineligible)  : ${JSON.stringify(R.stage.offStage.map(o=>o.name))}`);
  }
  console.log(`  RETURNED opening_setting: ${spine ? JSON.stringify(spine.opening_setting) : 'n/a'}`);
  console.log(`  RETURNED staged cast    : ${spine && Array.isArray(spine.staged_characters)
      ? JSON.stringify(spine.staged_characters.map(c => `${c.name}:${c.presence || c.presence_mode || '?'}`)) : 'n/a'}`);
  if (skel && Array.isArray(skel.character_plus)) {
    console.log(`  C+ (${skel.character_plus.length}):`);
    skel.character_plus.forEach(c => console.log(`      • ${String(c.character).padEnd(24)} first_mention=${JSON.stringify(c.first_mention)}  angle="${c.angle}"`));
  } else console.log(`  C+ : n/a`);
  console.log(`  E+           : ${skel ? JSON.stringify(skel.environment_plus) : 'n/a'}`);
  console.log(`  fusion       : ${skel ? JSON.stringify(skel.fusion) : 'n/a'}`);
  // ── THE NEW COMBINED FIELD, AS RETURNED ──
  const ns = (R.score && R.score.newSchema) || null;
  console.log(`  pc_opening_fusion (raw): ${skel ? JSON.stringify(skel.pc_opening_fusion) : 'n/a'}`);
  if (ns) {
    console.log(`  ── one-assignment coherence (PC = ${JSON.stringify(ns.pcLabel)}) ──`);
    console.log(`     recipient is the PC        : ${ns.pofIsPc ? 'YES' : 'NO'}`);
    console.log(`     E+ target/axis match       : ${ns.pofTargetMatches ? 'YES' : 'NO'}`);
    console.log(`     E+ evidence beat           : ${ns.epBeat ? JSON.stringify(ns.epBeat) : 'MISSING'}${ns.epBeat ? ' · grounded=' + ns.epBeatGrounded : ''}`);
    console.log(`     PC C+ angle IS the beat    : ${ns.pcCpIsTheBeat ? 'YES' : 'NO'}`);
    console.log(`     PC anchor_beat IS the beat : ${ns.pcAnchorIsTheBeat ? 'YES' : 'NO'}`);
    if (!ns.pcCpIsTheBeat)     console.log(`        C+ angle : ${JSON.stringify(ns.pcCpAngle)}`);
    if (!ns.pcAnchorIsTheBeat) console.log(`        anchor   : ${JSON.stringify(ns.pcAnchor)}`);
    console.log(`     non-PC C+ (${ns.nonPcCp.length}):`);
    ns.nonPcCp.forEach(x => console.log(`        • ${String(x.who).padEnd(24)} "${x.angle}"`));
  }
  const aliasLogs = R.logs.filter(l => /SCENE1:ALIAS/.test(l));
  console.log(`  alias resolves: ${aliasLogs.length ? '' : 'none needed'}`);
  aliasLogs.forEach(l => console.log(`      ${l.replace(/^\[SCENE1:ALIAS\]\s*/, '')}`));
  console.log(`  envelope     : ${R.envelopeNormalised ? 'NORMALISED (nested skeleton lifted)' : 'top-level as sent'}`);
  console.log(`  STORED C+    : ${JSON.stringify(((R.assignments && R.assignments.character_plus) || []).map(c => c.character))}`);
  console.log(`  VALIDATION   : ${R.fatal ? 'REJECTED — ' + R.fatal : (R.assignmentsDropped ? 'ASSIGNMENTS DROPPED (valve) — ' + R.assignmentsDropped : 'ACCEPTED')}`);
  const rej = R.logs.filter(l => /ANGLE:REJECTED/.test(l));
  if (rej.length) rej.forEach(l => console.log(`      ${l}`));
  console.log('');
}

// ── SCORECARD (post-resolution, shipped functions, self-consistent) ──
// Every column is computed IN-PAGE against the resolved stage and the normalised assignments,
// using the same _targetInInventory / _targetInScene / _validateAngleConcreteness the product
// uses. The stale pre-resolution grounding path is gone. The harness then asserts that its own
// verdict equals the PRODUCT's verdict and FAILS if they disagree — a scorecard that can print a
// failure the product did not reach is not evidence.
console.log(`${'═'.repeat(94)}\nSCORECARD (post-resolution · product functions)\n${'═'.repeat(94)}\n`);
const mark = b => b === null ? ' n/a ' : (b ? '  ✓  ' : '  ✗  ');
let disagreements = 0;
console.log(' # | mode     | setting | no offstage | one C+ each | first_ment | angles | E+ grounded | fusion | INLINE | PRODUCT');
for (const R of results) {
  const sc = R.score || { computable:false, reason:'no score' };
  // contract v2 valve: dropped assignments are a product REJECTION of the plan (the scene proceeds without it)
  const productVerdict = !R.fatal && !R.assignmentsDropped;
  if (!sc.computable) {
    console.log(` ${R.i} | ${R.mode.padEnd(8)} | ${' '.repeat(7)}(not computable: ${sc.reason})`);
    // A plan the product REJECTED before resolution is legitimately unscoreable; that agrees.
    if (productVerdict) { disagreements++; console.log('   ⚠ product ACCEPTED but the scorecard could not score it'); }
    continue;
  }
  const c = sc.criteria;
  console.log(` ${R.i} | ${R.mode.padEnd(8)} |${mark(c.settingKept)}|${mark(c.noOffstage)}      |${mark(c.oneEach)}      |${mark(c.firstMention)}     |${mark(c.anglesOk)}|${mark(c.epGrounded)}      |${mark(c.fusionOk)}| ${sc.verdict ? 'PASS' : 'FAIL'}   | ${productVerdict ? 'ACCEPTED' : 'REJECTED'}`);
  if (sc.verdict !== productVerdict) {
    disagreements++;
    console.log(`   ⚠ DISAGREEMENT — inline=${sc.verdict} product=${productVerdict}; failing criteria: `
      + Object.keys(c).filter(k => !c[k]).join(', ') + (R.fatal ? ` | product fault: ${R.fatal}` : ''));
  }
  if (sc.elements) console.log(`      environment (${sc.environmentOwner}-owned): ${JSON.stringify(sc.elements)}`);
}
const totalCost = results.reduce((a, R) => {
  try { const u = JSON.parse(R.planner[0].rawResponse).usage;
        return a + u.prompt_tokens * PRICE.in + u.completion_tokens * PRICE.out; } catch (_) { return a; }
}, 0);
console.log(`\n STAGE 0 · route=${PP_ROUTE || '(committed default)'} · CAP=${CAP} · real dispatches=${realDispatches} · capped (aborted at route)=${cappedRequests.length}`);
for (const R of results) for (const p of R.planner) console.log(`   sample ${R.i}: model=${p.identity.model} bytes=${p.identity.messageBytes} reserve=${p.identity.reserve} max_tokens=${p.identity.max_tokens} reasoning_effort=${p.identity.reasoning_effort_present ? JSON.stringify(p.identity.reasoning_effort) : 'ABSENT'} response_format=${JSON.stringify(p.identity.response_format)} http=${p.status}${p.governorRefusal ? ' GOVERNOR-REFUSED ' + p.governorRefusal.error : ''}${p.retryAfter ? ' retry-after=' + p.retryAfter : ''} ms=${p.ms}`);
fs.writeFileSync(`${DIR}/_stage0_summary.json`, JSON.stringify({ route: PP_ROUTE, cap: CAP, realDispatches, capped: cappedRequests,
  samples: results.map(R => ({ i: R.i, mode: R.mode, planner: R.planner.map(p => ({ status: p.status, identity: p.identity, governorRefusal: p.governorRefusal, retryAfter: p.retryAfter, ms: p.ms })),
                               attempts: R.attempts, retryReason: R.retryReason, fatal: R.fatal, score: R.score,
                               threw: R.threw, settled: R.settled, settleReason: R.settleReason, quotaBusy: R.quotaBusy, fetchCount: R.fetchCount,
                               assignmentsDropped: R.assignmentsDropped || null, grokAttemptsBlocked: R.authorAttempts.length,
                               consoleAll: process.env.DEBUG_ALL === '1' ? R.logs : undefined })) }, null, 2));
console.log(`\n total real planner calls: ${results.reduce((a,R)=>a+R.planner.length,0)}`);
console.log(` planner attempts        : ${results.map(R=>R.attempts + (R.retryReason ? '('+R.retryReason+')' : '')).join(', ')}`);
console.log(` GROK requests dispatched: 0  (attempts blocked at the route layer: ${results.reduce((a,R)=>a+R.authorAttempts.length,0)})`);
console.log(` escaped requests        : ${results.reduce((a,R)=>a+R.escaped.length,0)} (must be 0)`);
console.log(` total spend             : $${totalCost.toFixed(5)}`);
console.log(` inline/product agreement: ${disagreements === 0 ? 'CONSISTENT' : disagreements + ' DISAGREEMENT(S)'}`);
console.log(`\n artifacts: ${DIR}/sample{1..${N}}_{request,response,verdict}.json\n`);

await browser.close();

if (disagreements > 0) { console.error('\n  HARNESS FAILURE: the scorecard disagreed with the product verdict.\n'); process.exit(1); }
