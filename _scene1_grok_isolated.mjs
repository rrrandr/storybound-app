// ISOLATED GROK COMPLIANCE TEST — First Sacrifice Scene 1.
//
// The planner is NOT re-bought. The exact saved raw Mistral envelope from _paid_scene1_v2 is
// replayed in place of the live planner response, so the plan under test is the known-good one.
// Everything else is production: app.js unmodified, prerequisites real, no prompt alteration.
//
// Exactly ONE real Grok author request is permitted. The instant its response is in hand every
// further model call is aborted at the wire — S+ enforcement, line editor, mechanical repair,
// purple lens, specialists, LI-texture repair, images, everything.
//
//   DRY=1  -> block the author too, capture the request only, spend nothing on Grok.
//
// usage: DRY=1 node _scene1_grok_isolated.mjs   |   node _scene1_grok_isolated.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const DRY = process.env.DRY === '1';
const DIR = DRY ? '_grok_isolated_dry' : '_grok_isolated';
fs.mkdirSync(DIR, { recursive: true });

const SAVED = JSON.parse(fs.readFileSync('_paid_scene1_v2/01_mistral_request_response.json', 'utf8'));
const SAVED_RAW = SAVED.rawResponse;
const SAVED_USER = SAVED.user || '';
const castOf = u => { const m = u.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
  return m ? m[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : []; };
const whereOf = u => (u.match(/WHERE \(fixed\): ([^\n]+)/) || [])[1] || '';
const SAVED_CAST = castOf(SAVED_USER), SAVED_WHERE = whereOf(SAVED_USER);

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const STUB = {
  '/api/consume-fortune': { success:true, fortunesRemaining:9999 },
  '/api/verify-subscription': { success:true, subscribed:true, tier:'sub' },
  '/api/claim-issue-number': { success:true, issueNumber:1 },
  '/api/refund-fortune': { success:true },
  '/api/grant-welcome-milestone': { success:true },
  '/api/record-legal-acceptance': { success:true },
};
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;
const PLANNER_SIG = /scene-structure planner for the OPENING scene/;
const AUTHOR_SIG  = /ARCHITECTURE LAWS/;
const PRICE = { 'grok-4.3':{in:1.25e-6,out:2.5e-6,cacheRead:2e-7}, 'mistral-small-latest':{in:1.5e-7,out:6e-7},
                'gpt-4o-mini':{in:1.5e-7,out:6e-7}, 'gpt-4o':{in:2.5e-6,out:1e-5} };

const paid = [];
let planner = null, author = null, authorDone = false;
let blockedAfterDraft = 0, imagesBlocked = 0, secondAuthorAttempts = 0, compat = null;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

await page.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();
  const stub = Object.keys(STUB).find(x => url.startsWith(x));
  if (stub) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(STUB[stub]) });
  if (IMAGE.test(url)) { imagesBlocked++; paid.push({ url, kind:'IMAGE-BLOCKED', escaped:false }); return route.abort(); }
  if (!MODEL.test(url)) { paid.push({ url, kind:'NON-MODEL-BLOCKED', escaped:false }); return route.abort(); }

  let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const msgs = (body && body.messages) || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  const kind = PLANNER_SIG.test(sys) ? 'PLANNER' : AUTHOR_SIG.test(sys) ? 'AUTHOR' : 'PREREQ';

  if (authorDone) { blockedAfterDraft++; if (kind === 'AUTHOR') secondAuthorAttempts++;
    paid.push({ url, kind:'BLOCKED-AFTER-DRAFT', wouldHaveBeen:kind, sysHead:sys.slice(0,140), escaped:false });
    return route.abort(); }

  // ── THE PLANNER IS REPLAYED, NEVER RE-BOUGHT ──
  if (kind === 'PLANNER') {
    const liveCast = castOf(usr), liveWhere = whereOf(usr);
    compat = { savedCast: SAVED_CAST, liveCast, savedWhere: SAVED_WHERE, liveWhere,
      castMatch: JSON.stringify(liveCast) === JSON.stringify(SAVED_CAST),
      whereMatch: liveWhere === SAVED_WHERE,
      seedMatch: /starter_first_sacrifice|First Sacrifice/i.test(usr) === /starter_first_sacrifice|First Sacrifice/i.test(SAVED_USER) };
    planner = { request: body, system: sys, user: usr, replayed: true };
    paid.push({ url, kind:'PLANNER-REPLAYED', escaped:false, compat });
    if (!compat.castMatch || !compat.whereMatch) {
      console.log('   ✗ INCOMPATIBLE — live planner request does not match the saved plan; aborting before any author call');
      console.log('     saved cast :', JSON.stringify(SAVED_CAST));
      console.log('     live  cast :', JSON.stringify(liveCast));
      console.log('     saved WHERE:', SAVED_WHERE.slice(0,110));
      console.log('     live  WHERE:', liveWhere.slice(0,110));
      return route.abort();
    }
    console.log(`   [PLANNER-REPLAYED] cast+WHERE match the saved plan — no planner spend`);
    return route.fulfill({ status:200, contentType:'application/json', body: SAVED_RAW });
  }

  if (kind === 'AUTHOR') {
    if (author) { secondAuthorAttempts++; paid.push({ url, kind:'SECOND-AUTHOR-BLOCKED', escaped:false }); return route.abort(); }
    if (DRY) { author = { request: body, system: sys, user: usr, rawResponse: '', usage: null, ms: 0, dry: true };
      authorDone = true; paid.push({ url, kind:'AUTHOR-DRY-BLOCKED', model: body && body.model,
        sysLen: sys.length, usrLen: usr.length, escaped:false });
      console.log(`   [AUTHOR-DRY] captured request only — sys=${sys.length} usr=${usr.length}, NOT dispatched`);
      return route.abort(); }
  }

  const t0 = Date.now();
  let resp, text;
  try { resp = await route.fetch({ timeout: 300000 }); text = await resp.text(); }
  catch (e) {
    // Teardown race: the context can be disposed while a late prerequisite is still in flight.
    // That is not a test result — swallow it rather than crashing before artifacts are written.
    paid.push({ url, kind: kind + '-INFLIGHT-DROPPED', escaped: false, note: String(e && e.message).slice(0, 80) });
    try { return route.abort(); } catch (_) { return; }
  }
  const ms = Date.now() - t0;
  let usage = null; try { const j = JSON.parse(text); usage = j.usage || (j._orchestration && j._orchestration.usage) || null; } catch (_) {}
  paid.push({ url, kind, model: body && body.model, max_tokens: body && body.max_tokens,
    sysLen: sys.length, usrLen: usr.length, status: resp.status(), ms, usage, escaped:true });
  console.log(`   [${kind}] ${url} model=${body && body.model} sys=${sys.length} usr=${usr.length} ${resp.status()} ${ms}ms`);
  if (kind === 'AUTHOR') { author = { request: body, system: sys, user: usr, rawResponse: text, usage, ms }; authorDone = true; }
  return route.fulfill({ response: resp, body: text });
});

const logs = [];
page.on('console', m => { const x = m.text();
  if (/SCENE1|SKELETON|PLANNER|A\/50|ANGLE|FUSION|GROUND|STAGE|IDENTITY|SOLO|ENVELOPE/.test(x)) logs.push(x.slice(0,300)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,240)));

console.log(`\n${'═'.repeat(92)}\nISOLATED GROK COMPLIANCE — replayed plan · ${DRY ? 'DRY (no Grok spend)' : 'ONE REAL GROK CALL'}\n${'═'.repeat(92)}\n`);
await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:60000 });
const pre = await page.evaluate(() => ({
  armA50: (typeof window._armA50 === 'undefined') ? 'undefined' : window._armA50,
  a50BlockEmpty: (typeof window._buildA50ModeDirective === 'function') ? window._buildA50ModeDirective() === '' : 'fn-absent',
  hotFast: (typeof window._hotFastActive === 'function') ? window._hotFastActive() : null }));
console.log(` preflight: _armA50=${pre.armA50} · A/50 block empty=${pre.a50BlockEmpty} · hotFast=${pre.hotFast}\n`);

await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
    _starterId:def.id, is_starter_story:true, immutableTitle:def.title, archetype:{primary:def.archetype,modifier:null},
    name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
    liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
    fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
    renderMode:'literary', currentEngine:'literary', storyId:'grokiso', myUid:'probe' });
  s.picks.identity = s.identity; s._skipCorridorValidation = true;
  window.__err = null;
  window.__run = window.handleBeginStory().catch(e => { window.__err = String(e && e.message); });
});

const DEADLINE = Date.now() + 480000;
while (!authorDone && Date.now() < DEADLINE) await new Promise(r => setTimeout(r, 500));
await new Promise(r => setTimeout(r, DRY ? 2000 : 5000));

try { await page.unrouteAll({ behavior: 'ignoreErrors' }); } catch (_) {}
const st = await page.evaluate(() => { const s = window.state || {};
  return { stageResolved: s._scene1StageResolved || null, assignments: s._scene1SceneAssignments || null,
    sceneSkeleton: s.sceneSkeleton ? { character_plus:s.sceneSkeleton.character_plus,
      environment_plus:s.sceneSkeleton.environment_plus, fusion:s.sceneSkeleton.fusion } : null,
    skeletonFatal: s._scene1SkeletonFatal || null,
    hotFast: (typeof window._hotFastActive==='function') ? window._hotFastActive() : null, err: window.__err || null }; });
await browser.close();

function draftOf(raw) { try { const j = JSON.parse(raw);
  if (typeof j.content === 'string' && j.content) return j.content;
  const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (typeof c === 'string') return c; } catch (_) {} return raw; }
const draft = author && author.rawResponse ? draftOf(author.rawResponse) : '';
let directive = '';
if (author) { const i = author.system.indexOf('Narrative skeleton for this scene:');
  if (i !== -1) { const rest = author.system.slice(i); const end = rest.indexOf('\n\n═══');
    directive = end === -1 ? rest.slice(0, 9000) : rest.slice(0, end); } }
const cost = (u, m) => { if (!u) return 0; const p = PRICE[m] || PRICE['grok-4.3'];
  const cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
  return Math.max(0,(u.prompt_tokens||0)-cached)*p.in + cached*(p.cacheRead||p.in) + (u.completion_tokens||0)*p.out; };
let total = 0; paid.forEach(c => { if (c.escaped) total += cost(c.usage, c.model || 'grok-4.3'); });

const W = (f, s) => fs.writeFileSync(`${DIR}/${f}`, s);
W('00_inventory.json', JSON.stringify({ paid, compat, preflight: pre, imagesBlocked, blockedAfterDraft,
  secondAuthorAttempts, hotFast: st.hotFast, pageError: st.err, logs }, null, 2));
W('01_normalized_plan.json', JSON.stringify({ assignments: st.assignments, sceneSkeleton: st.sceneSkeleton,
  stageResolved: st.stageResolved, skeletonFatal: st.skeletonFatal }, null, 2));
W('02_skeleton_directive.txt', directive);
W('03_grok_request.json', JSON.stringify({ model: author && author.request.model,
  temperature: author && author.request.temperature, max_tokens: author && author.request.max_tokens,
  system: author && author.system, user: author && author.user }, null, 2));
W('04_grok_raw_response.json', author ? (author.rawResponse || '') : '');
W('04_grok_draft.md', draft);

console.log(`\n${'─'.repeat(92)}`);
console.log(` compat            : cast=${compat && compat.castMatch} where=${compat && compat.whereMatch}`);
console.log(` skeleton fault    : ${st.skeletonFatal || 'none'}`);
console.log(` page error        : ${st.err || 'none'}`);
console.log(` escaped calls     : ${paid.filter(c=>c.escaped).length} (${paid.filter(c=>c.escaped).map(c=>c.kind).join(', ')})`);
console.log(` planner spend     : $0 (replayed)`);
console.log(` blocked after draft: ${blockedAfterDraft} · second-author: ${secondAuthorAttempts} · images: ${imagesBlocked}`);
console.log(` grok usage        : ${author && author.usage ? JSON.stringify(author.usage) : (DRY ? 'DRY — not dispatched' : 'n/a')}`);
console.log(` TOTAL SPEND       : ~$${total.toFixed(5)}`);
console.log(` directive         : ${directive.length} chars`);
console.log(` draft             : ${draft.length} chars · ${draft.split(/\s+/).filter(Boolean).length} words`);
console.log(`\n artifacts -> ${DIR}/\n`);
process.exit(author ? 0 : 1);
