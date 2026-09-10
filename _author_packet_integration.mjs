// SCENE-1 OPENING PLANNER — CAPPED LIVE MEASUREMENT (PAID; DO NOT RUN WITHOUT AN EXPLICIT GO).
//
// Purpose: record the ACTUAL served usage of the opening planner on the direct-Grok route — prompt
// tokens, completion tokens, reasoning tokens (expected 0 at effort 'none'), cached tokens, latency,
// attempt count — and whether the planner's reply was accepted by the product's own validators. This
// closes the one unknown term in `_audit_out/grok_scene_cost_bound.md` for the planner.
//
// What is paid: ONLY the opening planner request(s). Every other model request (portfolio, A-plot,
// bibles, author, post-author) is answered by the dry suite's shape-faithful fixtures, exactly as in
// `_scene1_stage_order_dry.mjs`. The author is STUBBED — no scene prose is generated.
//
// HARD CAP: one story, at most MAX_PLANNER_CALLS (2 = the client's single bounded retry) real
// requests. A third planner request is ABORTED at the route layer and reported as a defect, never
// forwarded. Known cost bound at list price for 2 calls: the planner-owned request is ~90k BYTES
// (≈ 20k tokens at the author payload's ~4.4 chars/token — an inference until this run records it), so
// ≈ 2 × (20k × $1.25/M + ≤2,400 × $2.50/M) ≈ $0.07 + reasoning (expected 0 at effort 'none').
//
// usage: GO=1 node _scene1_planner_measure_live.mjs     (without GO=1 it prints the plan and exits)
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
import { runStamp, rawReplyPath } from './_measure_naming.mjs';

const MAX_PLANNER_CALLS = 2;
// E2E=1 (Roman 2026-09-07): literary Modern-corridor Scene 1 END TO END — flag ON, planner + AT MOST two real Grok author attempts,
// no fallback (the flag terminalizes it), raw replies retained locally for both, stop after one mounted page or a named failure.
// Requires a PROVIDER-SIDE xAI project spend cap set beforehand ($1 authorized as a hard safety ceiling, not a forecast):
// author reasoning is unbounded by evidence, so no client-side number is a dollar ceiling.
const E2E = process.env.E2E === '1';
const RUN_STAMP = runStamp();
// ═══ AUTHOR-PACKET INTEGRATION TEST (Roman 2026-09-10, §42 A) ═══ DRY: planner fixture, author STUBBED, everything else as the
// live harness. Captures the OUTBOUND author request and asserts, by exact strings, that the Storybound-owned packet sections are
// present and that the POV rule matches the pick. RED controls: RED=pcbible (generator returns a bible without core fields),
// RED=libible, RED=pov (session pick 'first_person', a non-production value). Fixture bibles are generator DATA, never prose.
const RED = String(process.env.RED || '').toLowerCase(); let authorBody = null, plannerBody = null; const packetRows = [];
const MAX_AUTHOR_CALLS = 2;
// SPEND MONITOR (Roman 2026-09-07: 'forget the cap, just monitor spend'): the cumulative xAI-reported cost of completed
// requests is tracked; if it already exceeds SPEND_STOP_USD, the NEXT paid request is refused at the route layer.
// This bounds the number of further calls, not the cost of a call already in flight.
const SPEND_STOP_USD = 1.00; let spentUsd = 0;
const RATE_IN = 1.25 / 1e6, RATE_OUT = 2.50 / 1e6;   // grok-4.3 list price (verified 2026-09-01); reasoning billed as output
// PIN THE OPENING STATE (Roman 2026-09-09): the planner prompt is bimodal (LI-ARRIVAL DEFERRED vs FROM_START). One run = one state.
// PIN_LI=FROM_START (default: LI-present / full-crisis) or PIN_LI=DEFERRED (the red control). The pin is asserted THROUGH the boundary:
// a paid planner request whose system prompt is in the other state is ABORTED before it leaves the page (no spend on the wrong state).
const PIN_LI = (process.env.PIN_LI || 'FROM_START').toUpperCase(); if (PIN_LI !== 'FROM_START' && PIN_LI !== 'DEFERRED') throw new Error('PIN_LI must be FROM_START or DEFERRED');
// PIN THE STORY SHAPE (Roman 2026-09-09): a paired prose read is invalid if the shape differs. PIN_SHAPE=<id> (default CARETAKING, the
// shape the 11:31 pinned live call drew). Harness seam: state._invertedShape (the product's own pre-pick slot) held by a write-ignoring
// accessor. Boundary guard: a paid planner request whose user prompt carries another shape id is ABORTED before it leaves the page.
// SHAPE_DRIFT=1 (red control): pins LEGACY in the page but keeps guarding PIN_SHAPE → the request MUST be aborted.
const PIN_SHAPE = (process.env.PIN_SHAPE || 'CARETAKING').toUpperCase(); const SHAPE_DRIFT = process.env.SHAPE_DRIFT === '1';
const DRY = process.env.DRY === '1';
// DRY rehearsals retain their (stubbed) replies in their OWN folder: a rehearsal must never pose as a retained real reply
// (the 04:08 rehearsal's fixture prose was picked up as 'the retained real page' by the stage-order suite on 2026-09-09).
const RAW_DIR = DRY ? '_validate_out/dry_rehearsal' : '_validate_out'; fs.mkdirSync(RAW_DIR, { recursive: true });   // DRY=1: identical flow, planner answered by the dry fixture — proves the harness for free
if (process.env.GO !== '1' && !DRY) {
  console.log('MODES: planner-only (default) · E2E=1 adds the author (flag ON, ≤ 2 real Grok author attempts) · DRY=1 rehearses either mode free.');
  console.log('PLAN ONLY (set GO=1 to run, DRY=1 to rehearse free): one unseeded Modern corridor story; opening planner forwarded to /api/proxy (real xAI); '
    + 'author + every setup pass stubbed; cap ' + MAX_PLANNER_CALLS + ' planner calls; records served usage + validity to _validate_out/scene1_planner_measure_live.json');
  process.exit(0);
}
// Reuse the dry harness's fixtures by importing its module would execute its scenarios; instead the
// fixture responders are loaded from the slice the dry harness itself was generated from.
const dry = fs.readFileSync('_scene1_stage_order_dry.mjs', 'utf8');
const sliceStart = dry.indexOf('const REQUEST_KINDS');
const sliceEnd = dry.indexOf('async function run(');
if (sliceStart < 0 || sliceEnd < 0) throw new Error('dry harness fixture slice not found');
const fixtureModule = '_measure_fixtures.generated.mjs';   // repo root: the slice's relative imports (./_test_session_env.mjs) must resolve
// The slice's top-level `await preflight();` opens a headless browser that nothing closes — it kept two
// rehearsal processes alive for hours (2026-09-07). Strip it; this harness does its own server wait.
fs.writeFileSync(fixtureModule, dry.slice(0, sliceEnd).replace(/^const results = \[\];[\s\S]*?\n(?=const)/m, '').replace(/^await preflight\(\);\s*$/m, '') + '\nexport { REQUEST_KINDS, plannerReply, scaffoldReply, APLOT_VALID, ANTAGONIST_BIBLE, PC_BIBLE, LI_BIBLE, GENERIC, PROSE, utf8, PASSTHROUGH, LOCAL, MODEL };\n');
const F = await import('./' + fixtureModule);

const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
await page.addInitScript(({ e2e }) => { window.__E2E_FLAG = e2e; }, { e2e: E2E });
const planner = [], logs = [], refunds = [], dialogs = [], aborted = []; let authorAttempts = 0; const authorReqs = [];
page.on('console', m => { const t = m.text(); if (/SCENE1:PLANNER|SCENE1:STAGE|SCENE1:ENVELOPE|SCENE1:FUSION|BeginStory\] Error|ISSUE-REFUND|BEGIN:REFUND|\[LI-ARRIVAL\]|\[A-PLOT:SHAPE\]|\[A-PLOT:READER-Q\]|\[SCENE1_MODE\]/.test(t)) logs.push(t.slice(0, 400)); });
page.on('dialog', async d => { dialogs.push(d.message().slice(0, 200)); await d.dismiss(); });
await installSession(page);
await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(route.request().url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (/\/api\/refund-fortune\b/.test(url)) { let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {} refunds.push({ context: b.context || null, amount: b.amount || null }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) }); }
  if (F.PASSTHROUGH.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const k = Object.keys(F.LOCAL).find(x => url.startsWith(x)); if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[k]) });
  let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  if (!F.MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const m = b.messages || []; const sys = String((m.find(x => x.role === 'system') || {}).content || ''); const usr = String((m.find(x => x.role === 'user') || {}).content || '');
  const txt = sys + '\n' + usr; const hits = F.REQUEST_KINDS.filter(([, test]) => test(txt, sys, usr)).map(([kk]) => kk); const kind = hits.length === 1 ? hits[0] : null;
  if (kind === 'planner') {
    // THE ONLY PAID REQUEST. Forwarded to the local dev server → /api/proxy → xAI. Capped.
    if (!/\/api\/proxy\b/.test(url)) { aborted.push({ why: 'planner not on /api/proxy', url }); return route.abort(); }
    if (!DRY && spentUsd > SPEND_STOP_USD) { aborted.push({ why: 'spend guard: cumulative xAI cost ' + spentUsd.toFixed(4) + ' > ' + SPEND_STOP_USD, kind: 'planner' }); return route.abort(); }
    if (planner.length >= MAX_PLANNER_CALLS) { aborted.push({ why: 'cap reached', n: planner.length + 1 }); return route.abort(); }
    const sysIsDeferred = /LI-ARRIVAL=DEFERRED/.test(sys); const stateSeen = sysIsDeferred ? 'DEFERRED' : 'FROM_START';
    const shapeM = usr.match(/Story Shape: ([^\n(]+?)(?: \(id: ([A-Z_]+)\))?\n/); const shapeSeen = shapeM ? (shapeM[2] || shapeM[1].trim().toUpperCase().replace(/[^A-Z]+/g, '_')) : null;
    if (shapeSeen !== PIN_SHAPE) { aborted.push({ why: 'PIN VIOLATION: planner user prompt carries story shape ' + shapeSeen + ' but the run is pinned to ' + PIN_SHAPE + ' — request aborted before leaving the page', kind: 'planner' }); return route.abort(); }
    if (stateSeen !== PIN_LI) { aborted.push({ why: 'PIN VIOLATION: planner system prompt is in state ' + stateSeen + ' but the run is pinned to ' + PIN_LI + ' — request aborted before leaving the page', kind: 'planner', sysBytes: F.utf8(sys) }); return route.abort(); }
    planner.push({ at: Date.now(), url, role: b.role, model: b.model, effort: b.reasoningEffort, openingState: stateSeen, pinned: PIN_LI, shapeSeen, pinnedShape: PIN_SHAPE, rf: b.response_format && b.response_format.type, max_tokens: b.max_tokens, sysBytes: F.utf8(sys), usrBytes: F.utf8(usr) });
    try { fs.writeFileSync(rawReplyPath(RUN_STAMP, 'PLANNER_REQUEST', planner.length, RAW_DIR).replace(/\.txt$/, '.json'), JSON.stringify(b, null, 1)); } catch (_) {}   // the exact planner request, retained
    if (!DRY) return route.continue();
    // DRY rehearsal: the dry harness's valid planner reply + the CURRENT valid planner-owned contract (stage_contract with
    // participants / event_facts / elements+affordances, and the v3 fusion with structured contact). Mirrors the stage-order
    // suite's valid mode (2026-09-09). If the product's request changes again, the rehearsal must FAIL (no page), never pass silently.
    const issued = [...usr.matchAll(/^\s+·\s+(\S+)\s*$/gm)].map(x => x[1]); const env = JSON.parse(F.plannerReply(usr, null));
    if (/"stage_contract": \{/.test(usr) && process.env.DRY_DRIFT !== '1') { const self = 'pc:self';   /* DRY_DRIFT=1: red control for the rehearsal guard */ const other = issued.find(r => r !== self) || null;
      const sk = env.scene_skeleton || (env.scene_skeleton = {}); const ep = sk.environment_plus || {};
      const els = (env.opening_spine && env.opening_spine.environment_elements) || []; const all = [...new Set([...(ep.target ? [ep.target] : []), ...els])];
      env.stage_contract = { v: 1, participants: [{ ref: self, presence: 'IN_PERSON' }].concat(other ? [{ ref: other, presence: 'ANTICIPATED' }] : []),
        event_facts: [{ text: 'She counts what the invitation has already cost her before the stranger arrives', participants: [{ ref: self, role: 'actor' }] }],
        elements: all.map(n => ({ name: n, affordance: 'GRASPABLE' })) };
      const v3Offered = /"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES below, verbatim>"/.test(usr);
      const issuedOps = [...usr.matchAll(/^\s+·\s+([A-Z_]+)\s+—\s+(.+)$/gm)].map(m => ({ op: m[1], gloss: m[2].trim() }));
      if (v3Offered) {
        const op = issuedOps[0] || { op: 'NONE_ISSUED', gloss: '' };
        const _contactObj = String(ep.target || ''); delete ep.target;   // revised template: no independent target; contact decides
        const PCN3 = (env.opening_spine && env.opening_spine.staged_characters && env.opening_spine.staged_characters[0] && env.opening_spine.staged_characters[0].name) || 'Testa';
        sk.pc_opening_fusion = { character: PCN3, placement: 'PC_FIRST_EMBODIED_BEAT',
          contact: { verb: 'PRESS', object: _contactObj },
          action: 'I set my palm flat on {ENV_TARGET} and let the cold of it climb my wrist.',
          pc_lens_operation: op.op,
          character_revelation: PCN3 + ' takes hold of it as if it were already ' + PCN3 + '\'s to answer for.',
          environment_pressure: { grounds: ['env:axis', 'pick:flavor'], text: 'Whatever this room has already lost, ' + PCN3 + ' is the one standing in it now.' } };
      } else if (/NO pc_opening_fusion THIS SCENE/.test(usr)) delete sk.pc_opening_fusion; }
    plannerBody = b;
    const p = planner[planner.length - 1]; p.status = 200; p.latencyMs = 0; p.served = 'grok-4.3 (DRY fixture)'; p.usage = { prompt_tokens: 0, completion_tokens: 0, completion_tokens_details: { reasoning_tokens: 0 } };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'dry', object: 'chat.completion', model: 'grok-4.3', usage: p.usage, _orchestration: { role: b.role, model: 'grok-4.3' }, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(env) } }] }) });
  }
  let out;
  if (kind === 'scaffold') { const ref = txt.match(/subject_ref:\s*(\S+)/); out = JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, true)); }
  else if (kind === 'author') {
    authorAttempts++; authorBody = b;
    authorReqs.push({ at: Date.now(), url, role: b.role, model: b.model || null, preferredModel: b.preferredModel, max_tokens: b.max_tokens, sysBytes: F.utf8(sys), usrBytes: F.utf8(usr) });
    // FREEZE THE PROMPT (Roman 2026-09-08): the exact author request body is retained locally — it is the input to the
    // separately authorized paired effort experiment. Local file only; never pasted into a shared document.
    try { fs.writeFileSync(rawReplyPath(RUN_STAMP, 'AUTHOR_REQUEST', authorAttempts, RAW_DIR).replace(/\.txt$/, '.json'), JSON.stringify(b, null, 1)); } catch (_) {}
    if (E2E && !DRY) {
      if (!/\/api\/proxy\b/.test(url) || b.role !== 'NARRATIVE_AUTHOR_GROK_ONLY') { aborted.push({ why: 'author not on the flag-on Grok route', url, role: b.role }); return route.abort(); }
      if (authorAttempts > MAX_AUTHOR_CALLS) { aborted.push({ why: 'author cap reached', n: authorAttempts }); return route.abort(); }
      if (spentUsd > SPEND_STOP_USD) { aborted.push({ why: 'spend guard: cumulative xAI cost ' + spentUsd.toFixed(4) + ' > ' + SPEND_STOP_USD, kind: 'author' }); return route.abort(); }
      return route.continue();   // THE SECOND PAID REQUEST KIND (≤ 2)
    }
    if (E2E && DRY) { const a = authorReqs[authorReqs.length - 1]; a.status = 200; a.latencyMs = 0; a.served = 'grok-4.3 (DRY fixture)'; a.usage = { prompt_tokens: 0, completion_tokens: 0, completion_tokens_details: { reasoning_tokens: 0 } }; }
    out = F.PROSE;   // DRY / planner-only: the stub answers; the ATTEMPT is what the gate counts
  }
  else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') out = JSON.stringify(F.APLOT_VALID);
  else if (kind === 'antagonistBodyBible') out = JSON.stringify(F.ANTAGONIST_BIBLE);
  else if (kind === 'pcBodyBible') out = JSON.stringify(RED === 'pcbible' ? { height: 'five foot six' } : F.PC_BIBLE);
  else if (kind === 'liBodyBible') out = JSON.stringify(RED === 'libible' ? { height: 'six foot one' } : F.LI_BIBLE);
  else out = JSON.stringify(F.GENERIC);
  const envelope = /mistral-proxy|\/api\/proxy\b/.test(url) ? { id: 'mock', object: 'chat.completion', model: b.model, usage: {}, _orchestration: {}, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: out } }] } : { ok: true, content: out, choices: [{ message: { content: out } }] };
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope) });
});
// Attribute a response to a planner row ONLY when its own request carried the planner role — other
// mocked requests share /api/proxy and must never overwrite the planner's served usage.
let plannerResponsesSeen = 0, authorResponsesSeen = 0;
page.on('response', async res => { try { const u = res.url(); if (!/\/api\/proxy\b/.test(u)) return; let rb = {}; try { rb = JSON.parse(res.request().postData() || '{}'); } catch (_) {} let p = null;
  if (rb.role === 'OPENING_PLANNER') p = planner[plannerResponsesSeen++];
  else if (rb.role === 'NARRATIVE_AUTHOR_GROK_ONLY') p = authorReqs[authorResponsesSeen++];
  else return;
  if (!p) return; p.status = res.status(); p.latencyMs = Date.now() - p.at;
  if (res.status() === 200) { const j = await res.json(); p.served = j.model || null; p.usage = j.usage || null; p.orch = j._orchestration || null;
    try { if (j.usage && typeof j.usage.cost_in_usd_ticks === 'number') { spentUsd += j.usage.cost_in_usd_ticks / 1e10; logs.push('[SPEND] +' + (j.usage.cost_in_usd_ticks / 1e10).toFixed(4) + ' USD (' + rb.role + ') cumulative ' + spentUsd.toFixed(4)); } } catch (_) {}
    // KEEP THE RAW REPLY: the 2026-09-07 run lost it, and "stage_contract absent" could not be told from "nested".
    const c = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; p.rawReply = String(c); p.rawReplyBytes = Buffer.byteLength(String(c), 'utf8');
    // RAW REPLY: written to a LOCAL file only (may contain story text) — never into the shared report.
    // RAW REPLY, timestamped per run so a later run never overwrites an earlier reply (the 18:55 planner reply was lost this way).
    try { const _fn = rawReplyPath(RUN_STAMP, rb.role, rb.role === 'OPENING_PLANNER' ? plannerResponsesSeen : authorResponsesSeen, RAW_DIR); fs.writeFileSync(_fn, String(c)); p.rawReplyFile = _fn; } catch (_) {}
    try { const o = JSON.parse(String(c).replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '')); p.replyTopKeys = Object.keys(o); p.replySpineKeys = o.opening_spine ? Object.keys(o.opening_spine) : null; p.replySkeletonKeys = o.scene_skeleton ? Object.keys(o.scene_skeleton) : (o.opening_spine && o.opening_spine.scene_skeleton ? Object.keys(o.opening_spine.scene_skeleton) : null);
      p.stageContractAt = ['top', 'opening_spine', 'scene_skeleton', 'opening_spine.scene_skeleton'].filter(h => { const obj = h === 'top' ? o : h === 'opening_spine' ? o.opening_spine : h === 'scene_skeleton' ? o.scene_skeleton : (o.opening_spine && o.opening_spine.scene_skeleton); return obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'stage_contract'); }); } catch (_) { p.replyParse = 'not JSON'; }
  } else { p.errorBody = String(await res.text()).slice(0, 300); } } catch (e) { p_err(e); } });
const p_err = e => { try { logs.push('[MEASURE] response read failed: ' + (e && e.message)); } catch (_) {} };

const t0 = Date.now(); let up = false; while (Date.now() - t0 < 240000 && !up) { try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 60000 }); up = true; } catch (_) { await new Promise(r => setTimeout(r, 3000)); } }
if (!up) throw new Error('server never answered');
const modern = () => { const s = window.state; window.__disableSpeculativePreload = true; if (window.__E2E_FLAG) window._grokOnlySceneAuthor = true;
  // The pin must survive the product's own re-roll during begin (plain assignment did not: 2 of 5 dry runs flipped). Accessors that
  // ignore writes hold the value for the life of this state object; the boundary guard still aborts any paid request in the other state.
  if (window.__PIN_LI) { try { Object.defineProperty(s, 'liArrival', { get() { return window.__PIN_LI; }, set() {}, configurable: false, enumerable: true });
      Object.defineProperty(s, '_liDeferIntent', { get() { return window.__PIN_LI === 'DEFERRED'; }, set() {}, configurable: false, enumerable: true }); } catch (_) { /* already pinned (second call) */ }
    s._liArrivalRecorded = true; }
  if (window.__PIN_SHAPE) { try { const lib = window.STORY_SHAPE_LIBRARY || {}; const shp = lib[window.__PIN_SHAPE]; if (!shp) throw new Error('unknown shape ' + window.__PIN_SHAPE);
      Object.defineProperty(s, '_invertedShape', { get() { return { shape: shp, _pinned: true }; }, set() {}, configurable: false, enumerable: true }); } catch (e) { if (!/Cannot redefine/.test(String(e && e.message))) console.log('[PIN-SHAPE] ' + (e && e.message)); } }
  s.picks = Object.assign(s.picks || {}, { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'Billionaire', dynamic: 'Enemies', pov: (window.__RED === 'pov' ? 'first_person' : 'First'), length: 'fling', intensity: 'low', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Testa', partnerName: 'Rook' } });
  Object.assign(s, { world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies', archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null }, name: 'Testa', playerName: 'Testa', loveInterestName: 'Rook', partnerName: 'Rook', loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'low', pov: 'First', identity: { playerName: 'Testa', partnerName: 'Rook' }, renderMode: 'literary', currentEngine: 'literary', storyId: 'measure-' + Math.random().toString(36).slice(2, 8), myUid: 'probe', _skipCorridorValidation: true });
  s.picks.identity = s.identity; };
await page.waitForTimeout(2000);   // let the page's own checkout-return auto-begin fire against UNSEEDED state (see the dry harness)
await page.evaluate(([pin, shape, red]) => { window.__PIN_LI = pin; window.__PIN_SHAPE = shape; window.__RED = red; }, [PIN_LI, SHAPE_DRIFT ? 'LEGACY' : PIN_SHAPE, RED]);
await page.evaluate(modern); await page.waitForTimeout(6000); await page.evaluate(modern);
let threw = null; try { await page.evaluate(() => Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 300000))])); } catch (e) { threw = String(e && e.message).slice(0, 200); }
await page.waitForTimeout(4000);
const st = await page.evaluate(() => ({ soft: (window.state._scene1SoftFindings || []).map(f => ({ code: f.code, field: f.field, action: f.action })), fatal: window.state._scene1SkeletonFatal || null, pages: window.StoryPagination.getPageCount(), genStage: !!(window.state._cpGeneratedStage && window.state._cpGeneratedStage['1']), mission: window.state._scene1Mission || null, usage: window.state._scene1PlannerUsage || null, attempts: window.state._scene1PlannerAttempts || null, retryReason: window.state._scene1PlannerRetryReason || null }));
// PRESERVE THE MOUNTED PAGE (Roman 2026-09-09): the rendered page text, verbatim, next to the raw replies — this is what gets read.
const pageText = await page.evaluate(() => Array.from(document.querySelectorAll('#storyText .story-page')).map(e => e.innerText || e.textContent || '').join('\n\n=== PAGE BREAK ===\n\n'));
const pageFile = RAW_DIR + '/scene1_measure_live.page.' + RUN_STAMP + '.txt';
if (pageText && pageText.trim()) { fs.writeFileSync(pageFile, pageText); console.log('page text retained → ' + pageFile + ' (' + pageText.length + ' chars)'); }
await browser.close();
const costRow = p => { const u = p.usage || {}; const rt = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0; const cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
  return { role: p.role || 'OPENING_PLANNER', status: p.status, latencyMs: p.latencyMs, served: p.served, prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens, reasoning_tokens: rt, cached_tokens: cached, usd_list: (u.prompt_tokens || 0) * RATE_IN + ((u.completion_tokens || 0) + rt) * RATE_OUT, xai_usd: (typeof u.cost_in_usd_ticks === 'number') ? u.cost_in_usd_ticks / 1e10 : null, replyBytes: p.rawReplyBytes || null, stageContractAt: p.stageContractAt || null }; };
const cost = planner.map(costRow).concat(authorReqs.map(costRow));
// GATE VERDICT (frozen 2026-09-07): exactly one author attempt AND one page, or zero of each with a named reason.
const gate = { softFindings: st.soft || [], pinned: PIN_LI, openingState: (planner[0] && planner[0].openingState) || null, pinnedShape: PIN_SHAPE, shapeSeen: (planner[0] && planner[0].shapeSeen) || null, stateLogs: logs.filter(l => /LI-ARRIVAL|A-PLOT:SHAPE|A-PLOT:READER-Q|SCENE1_MODE/.test(l)).map(l => l.slice(0, 160)), authorAttempts, pages: st.pages, pageFile: (pageText && pageText.trim()) ? pageFile : null, pageChars: (pageText || '').length, fatal: st.fatal, verdict: (authorAttempts === 1 && st.pages === 1 && !st.fatal) ? 'PASS: one author attempt, one page' : (authorAttempts === 0 && st.pages === 0 && st.fatal) ? ('FAIL-CLOSED (named): ' + st.fatal) : ('INDETERMINATE: author=' + authorAttempts + ' pages=' + st.pages + ' fatal=' + st.fatal) };
const strip = p => { const { rawReply, ...rest } = p; return rest; };
const report = { at: new Date().toISOString(), mode: E2E ? (DRY ? 'E2E-DRY' : 'E2E-LIVE') : (DRY ? 'planner-DRY' : 'planner-LIVE'), requestLimits: { planner: MAX_PLANNER_CALLS, author: MAX_AUTHOR_CALLS }, plannerCalls: planner.length, authorCalls: authorReqs.length, aborted, planner: planner.map(strip), author: authorReqs.map(strip), cost, totalUsdList: cost.reduce((a, c) => a + (c.usd_list || 0), 0), totalXaiUsd: cost.reduce((a, c) => a + (c.xai_usd || 0), 0), gate, st, threw, refunds, dialogs, logs };
const _flat = (m) => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
const _pk = authorBody ? (authorBody.messages || []).map(_flat).join('\n') : '';
const row = (name, pass, detail) => { packetRows.push([name, !!pass]); console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass ? '' : '  — ' + detail)); };
row('P0 exactly one outbound author request was captured', !!authorBody && authorAttempts === 1, 'attempts=' + authorAttempts);
row('P1 PC bible reached the packet: signature feature string present', /a healed burn scar across the left knuckles/.test(_pk), 'no PC signature string');
row('P2 PC bible visual anchor delivered as VISUAL ANCHOR (lead with this)', /VISUAL ANCHOR \(lead with this\) — the healed burn scar across her left knuckles goes white when she grips/.test(_pk), 'no PC visual anchor line');
row('P3 LI bible reached the packet: visual anchor (the one charged anchor when he is offstage) present', /VISUAL ANCHOR \(lead with this\) — his long hands stay perfectly still on the table/.test(_pk), 'no LI visual anchor line');
row('P4 POV rule matches the pick (FIRST PERSON) and no THIRD PERSON rule', /POV PROSE RULE \(HARD — FIRST PERSON\)/.test(_pk) && !/POV PROSE RULE \(HARD — THIRD PERSON\)/.test(_pk), (_pk.match(/POV PROSE RULE \(HARD — [A-Z ]+\)/) || ['no POV rule'])[0]);
const _pl = plannerBody ? (plannerBody.messages || []).map(_flat).join('\n') : '';
row('P5 HOT_CRISIS block reaches the PLANNER request (the planner opens the scene inside it; the author receives the planner\'s spine)', /OPENING TEMPERATURE = HOT_CRISIS/.test(_pl), 'no HOT_CRISIS block in the planner request');
row('P6 the PC bible current_crisis EVENT reaches the PLANNER request as CURRENT CRISIS · EVENT', /CURRENT CRISIS[\s\S]{0,300}EVENT: the commission kiln is cooling mid-firing/.test(_pl), 'crisis event not delivered to the planner');
row('P6b the author packet carries the HOT-crisis opening directive', /open INSIDE the scene's live crisis/.test(_pk), 'no hot-opening directive in the author packet');
row('P7 scene assignment delivered (PROTAGONIST OPENING BEAT + CONTACT line)', /PROTAGONIST OPENING BEAT/.test(_pk) && /CONTACT: [A-Z_]+ — /.test(_pk), 'assignment block missing');
row('P8 Environment+ assignment delivered', /ENVIRONMENT\+ ASSIGNED THIS SCENE/.test(_pk), 'E+ block missing');
row('P9 STORY SCAFFOLD Issue 1 is non-empty', /ISSUE ARCS:\n- Issue 1: \S/.test(_pk), (_pk.match(/ISSUE ARCS:\n- Issue 1:[^\n]*/) || ['no scaffold arc'])[0]);
row('P10 no stale bible reference without content', !/PC Body Bible \(in the system prompt\)/.test(_pk) || /VISUAL ANCHOR \(lead with this\) — the healed burn scar/.test(_pk), 'directive references a bible that is not in the packet');
const _fails = packetRows.filter(r => !r[1]).map(r => r[0]);
console.log(`\nPACKET TEST (RED=${RED || 'none'}): ${packetRows.length} rows · ${packetRows.length - _fails.length} passed · ${_fails.length} failed` + (_fails.length ? ' → ' + _fails.join(' | ') : ''));
try { fs.writeFileSync('_validate_out/author_packet_integration.' + (RED || 'green') + '.txt', _pk); } catch (_) {}
const outName = '_validate_out/scene1_measure_' + report.mode + '.' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
fs.writeFileSync(outName, JSON.stringify(report, null, 2)); fs.writeFileSync('_validate_out/scene1_planner_measure_live.json', JSON.stringify(report, null, 2)); console.log('written ' + outName);
console.log(JSON.stringify({ mode: report.mode, plannerCalls: planner.length, authorCalls: authorReqs.length, aborted, cost, totalList: report.totalUsdList, totalXaiUsd: report.totalXaiUsd, gate, envelope: planner.map(p => ({ top: p.replyTopKeys, spine: p.replySpineKeys, skeleton: p.replySkeletonKeys, stageContractAt: p.stageContractAt })), attempts: st.attempts, retryReason: st.retryReason }, null, 2));
// Exit explicitly: never rely on the event loop draining while an imported slice may hold a handle.
// A DRY rehearsal that mounts no page means the harness fixture has drifted from the product's request — fail loudly, never pass silently.
if (DRY && !(st.pages === 1 && !st.fatal)) { console.log('DRY REHEARSAL FAILED: pages=' + st.pages + ' fatal=' + String(st.fatal)); process.exit(1); }
process.exit(_fails.length ? 1 : 0);
