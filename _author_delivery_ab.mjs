// _author_delivery_ab.mjs — ISOLATE THE AUTHOR-MODEL VARIABLE (Roman 2026-08-08).
// Capture the EXACT author prompt for ONE real planner-proposed transition (same planner output, context, lore,
// state, prompt), then regenerate that single scene N× with Mistral-Small and N× with Grok-4.3 — the ONLY variable
// changed is the model. Judge each with the runtime verifier's single question: did the requested transition happen?
// Discriminates: author-model-failure (Grok delivers, Mistral doesn't) vs planner/prompt/prior mismatch (both fail).
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const DRIVE = 4;   // scenes to drive before capturing a mid-story transition + its exact author prompt
const N = 5;       // regenerations per model — 5v5 first (Roman); expand to 20 only if the 5v5 isn't decisive
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/author_delivery_ab.json';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;
const ACTIONS = [
  { act: 'I refuse to let the rite finish — I demand to know what the wish actually cost.', dia: 'Whose price is this? Say it before another word of the vow is spoken.' },
  { act: 'I press the one who blames me to admit it to my face.', dia: 'You think I made that wish. Then name me. Here. Now.' },
  { act: 'I go looking for the truth of what happened the night the bond cracked.', dia: 'Someone here knows. I mean to find out who.' },
  { act: 'I confront Julian directly and make him tell me what he did.', dia: 'No more shielding me. I want it from you, all of it.' }
];

const log = (...a) => console.log(...a);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
const stateChangeEvents = [];
page.on('console', m => { const t = m.text(); const sc = t.match(/\[STATE-CHANGE:EVENT\]\s*scene=(-?\d+)\s*::\s*(.+)$/); if (sc) stateChangeEvents.push({ scene: Number(sc[1]), event: sc[2].trim() }); });
page.on('pageerror', e => log('PAGEERROR', e && e.message));

// Capture the EXACT author prompt by intercepting /api/proxy (model-agnostic; doesn't rely on the uncommitted
// _authorChatCapture wrapper). Records request bodies only while `recordProxy` is on (the capture scene).
let recordProxy = false;
const proxyBodies = [];
const PROXY_RE = /\/api\/[a-z]*-?proxy\b/;   // /api/proxy, /api/mistral-proxy, /api/chatgpt-proxy, /api/deepseek-proxy
await page.route(PROXY_RE, async route => { if (recordProxy) { try { proxyBodies.push(route.request().postData() || ''); } catch (_) {} } return route.continue(); });

log('\n=== AUTHOR-MODEL A/B — one transition, Mistral vs Grok, all else constant ===');
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.waitForFunction(() => typeof window._verifyDelivery === 'function', { timeout: 15000 }).catch(() => {});

await page.evaluate(() => {
  const s = window.state;
  s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  window.__transitionRetryExperiment = true;   // makes _authorChatCapture stash state._lastAuthorMessages (the EXACT author prompt)
  window.__disableSpeculativePreload = true;
  try { localStorage.setItem('sb_stories_onboarded', '1'); } catch (_) {}
  window._forceDeckMandate = false;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  try { const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; } } catch (_) {}
});

log(`[bootstrap] ${STARTER} …`);
try { await page.evaluate(async ({ S, T }) => { const d = (window.STARTER_STORIES || []).find(x => x.id === S); if (!d) throw new Error('no starter'); await Promise.race([window._launchStarterStory(d), new Promise((_, r) => setTimeout(() => r(new Error('boot timeout')), T))]); }, { S: STARTER, T: SCENE_TIMEOUT }); } catch (e) { log('boot err', e.message); }
await page.waitForFunction(() => (Date.now() - (window.__lastPageAt || 0)) > 12000 && (window.__capturedPages || []).length >= 1 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});

// drive DRIVE scenes to reach a mid-story transition
for (let i = 0; i < DRIVE; i++) {
  const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
  log(`[drive ${i + 1}/${DRIVE}] turn ${before.turn}`);
  let ok = false;
  for (let a = 0; a < 3 && !ok; a++) {
    if (a > 0) await page.waitForTimeout(30000);
    await page.evaluate(() => { const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; });
    await page.evaluate(({ act, dia }) => { const sv = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; sv('actionInput', act); sv('dialogueInput', dia); }, A);
    try {
      await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
      const started = await page.waitForFunction(({ n, t }) => window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
      if (!started) throw new Error('bailed');
      await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
      ok = true;
    } catch (e) { log('  fail: ' + e.message); }
  }
  if (!ok) { log('drive stalled — proceeding with what we have'); break; }
}

// CAPTURE the exact author prompt (via /api/proxy interception) + the proposed transition for the NEXT scene
await page.evaluate(() => { const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; });
await page.evaluate(() => { const sv = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; sv('actionInput', 'I force the truth of the cost into the open, now, whatever it takes.'); sv('dialogueInput', 'No more waiting. Say what it costs, and say it to my face.'); });
const beforeCap = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
recordProxy = true;
await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: beforeCap.pages, t: beforeCap.turn }, { timeout: CONT_TIMEOUT, polling: 3000 }).catch(() => log('capture-scene gen timed out — trying to capture anyway'));
recordProxy = false;
await page.unroute(PROXY_RE).catch(() => {});   // stop intercepting so replay fetches go direct

// pick the AUTHOR call out of the recorded proxy bodies: the largest-prompt body (the ~94k author prompt)
let authorMessages = null, authorTemp = 0.8;
let best = -1;
for (const b of proxyBodies) {
  let j; try { j = JSON.parse(b); } catch (_) { continue; }
  if (!j || !Array.isArray(j.messages)) continue;
  const size = j.messages.reduce((a, m) => a + String(m.content || '').length, 0);
  const isAuthor = /author/i.test(String(j.role || '')) || size > 40000;
  if (isAuthor && size > best) { best = size; authorMessages = j.messages; authorTemp = j.temperature || 0.8; }
}
const transition = (await page.evaluate(() => { const s = window.state; return (s._priorSceneStateChange && s._priorSceneStateChange.event) || (s._scenePlotContract && s._scenePlotContract.stateChange && s._scenePlotContract.stateChange.event) || null; }))
  || (stateChangeEvents.length ? stateChangeEvents[stateChangeEvents.length - 1].event : null);
log(`[capture] proxyBodies=${proxyBodies.length} authorPromptChars=${best} transition="${String(transition).slice(0, 90)}"`);
if (!authorMessages || !transition) { log('CAPTURE FAILED — no author call intercepted or no transition; aborting'); fs.writeFileSync(OUT, JSON.stringify({ error: 'capture failed', proxyBodies: proxyBodies.length, best, transition, stateChangeEvents }, null, 1)); await browser.close(); process.exit(1); }
const cap = { messages: authorMessages, temp: authorTemp, turn: beforeCap.turn };

// capture the PRIOR scenes' prose (for the repetition-vs-prior diagnostic)
const priorScenes = await page.evaluate(() => (window.__capturedPages || []).map(h => String(h).replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()).filter(t => t.length > 150));
log(`[priors] ${priorScenes.length} prior scenes captured for repetition scoring`);

// A/B: regenerate the SAME prompt N× per model via the app's OWN author functions (faithful endpoints/params/
// retries), verify delivery, score repetition vs prior scenes, keep prose. Pace calls to dodge provider 429s.
async function runModel(model) {
  return await page.evaluate(async ({ messages, model, transition, N, priorScenes }) => {
    const VSYS = 'You are a delivery verifier for an interactive story. Given a PROPOSED TRANSITION (an intended irreversible on-page event) and the SCENE PROSE, decide ONE thing: did the prose DELIVER that transition as a concrete, externally-observable ON-PAGE event? Output STRICT JSON: {"delivery":"DELIVERED|PARTIAL|MISSED"}. DELIVERED = the event concretely happened on the page; PARTIAL = begun/only gestured/not completed; MISSED = did not happen.';
    const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const priorSents = new Set();
    priorScenes.forEach(p => (p.split(/(?<=[.!?"])\s+/) || []).forEach(s => { const n = norm(s); if (n.split(' ').length >= 8) priorSents.add(n); }));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const genOne = async () => {   // the app's OWN author fn — faithful path; retry once on error (429s)
      for (let a = 0; a < 2; a++) {
        try {
          const r = (model === 'mistral') ? await window._mistralAuthor(messages, { max_tokens: 1200 }) : await window.callGrokNarrativeAuthor(messages, { preferredModel: 'grok-4.3', max_tokens: 1200 });
          const prose = String((typeof r === 'string') ? r : ((r && r.content) || '')).trim();
          if (prose) return prose;
        } catch (e) { if (a === 0) await sleep(6000); else return 'ERR ' + (e && e.message); }
      }
      return '';
    };
    const out = [];
    for (let i = 0; i < N; i++) {
      let prose = '', delivery = 'ERROR', repPct = 0;
      try { prose = await genOne(); } catch (e) { prose = 'ERR ' + (e && e.message); }
      if (prose && prose.length > 60 && !/^ERR/.test(prose)) {
        const sents = (prose.split(/(?<=[.!?"])\s+/) || []).map(norm).filter(s => s.split(' ').length >= 8);
        const rec = sents.filter(s => priorSents.has(s)).length;
        repPct = sents.length ? Math.round(100 * rec / sents.length) : 0;   // % of 8+word sentences copied from a prior scene
        try {
          const vr = await fetch('/api/chatgpt-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: VSYS }, { role: 'user', content: 'PROPOSED TRANSITION: ' + String(transition).slice(0, 240) + '\n\nSCENE PROSE:\n' + prose.slice(0, 6000) + '\n\nReturn the JSON now.' }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 40, jsonMode: true }) });
          if (vr.ok) { const vd = await vr.json(); const vc = (vd && vd.content) || (vd && vd.choices && vd.choices[0] && vd.choices[0].message && vd.choices[0].message.content); let p; try { p = JSON.parse(vc); } catch (_) { const mm = String(vc || '').match(/\{[\s\S]*\}/); if (mm) { try { p = JSON.parse(mm[0]); } catch (_) {} } } if (p) delivery = String(p.delivery || 'MISSED').toUpperCase(); }
        } catch (_) {}
      }
      out.push({ delivery, len: prose.length, repPct, head: prose.slice(0, 160), full: prose.slice(0, 2400) });
      await sleep(4000);   // pace calls to avoid provider rate limits
    }
    return out;
  }, { messages: cap.messages, model, transition, N, priorScenes });
}

log(`\n[A/B] regenerating the SAME scene ${N}× per model (transition held constant)…`);
const mistral = await runModel('mistral');
log('  mistral done: ' + mistral.map(x => x.delivery[0]).join(''));
const grok = await runModel('grok');
log('  grok done:    ' + grok.map(x => x.delivery[0]).join(''));

function tally(arr) { const t = {}; arr.forEach(x => t[x.delivery] = (t[x.delivery] || 0) + 1); return t; }
const result = { transition, driveTurns: cap.turn, N, mistral: { tally: tally(mistral), runs: mistral }, grok: { tally: tally(grok), runs: grok } };
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
const avg = (arr, k) => { const v = arr.filter(x => x.delivery !== 'ERROR'); return v.length ? Math.round(v.reduce((a, x) => a + (x[k] || 0), 0) / v.length) : 0; };
log('\n=== RESULT ===');
log('  transition: "' + String(transition).slice(0, 100) + '"');
log('  Mistral-Small: delivery ' + JSON.stringify(tally(mistral)) + ' · avgRep% ' + avg(mistral, 'repPct') + ' · avgLen ' + avg(mistral, 'len'));
log('  Grok-4.3:      delivery ' + JSON.stringify(tally(grok)) + ' · avgRep% ' + avg(grok, 'repPct') + ' · avgLen ' + avg(grok, 'len'));
await browser.close();
process.exit(0);
