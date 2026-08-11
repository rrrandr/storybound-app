// _consequence_ab.mjs — Roman 2026-08-10 Phase 2 exp #1: CONSEQUENCE-SELECTION vs CURRENT (milestone) planner.
// One variable: window._consequenceSelectionPlanner (off = current milestone planner, on = follow-consequences). BOTH
// run through the FROZEN evidence verifier (_structuredEventHandoff=true) so the confusion tree is trustworthy.
// BLIND: randomized label→flag, key withheld, no flag names in stdout. Per run: confusion tree + distinct-objective
// count (momentum: distinct governing situations before repetition) + prose for blind read.
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 12;
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/consequence';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;

const ACTIONS = [
  { act: 'I refuse to let the rite finish until I know what the wish cost.', dia: 'Whose price is this?' },
  { act: 'I put myself between the youth and the elders.', dia: 'Leave them out of this.' },
  { act: 'I confront the elder who blamed me, in front of everyone.', dia: 'Say it to my face.' },
  { act: 'I search for the truth of what cracked the bond.', dia: 'Someone here knows.' },
  { act: 'I offer to bear the cost myself.', dia: 'Take it from me instead.' },
  { act: 'I press Julian to tell me what he did.', dia: 'No more shielding me.' },
  { act: 'I expose who really made the forbidden wish.', dia: 'That ends tonight.' },
  { act: 'I choose Julian over my own safety and say so aloud.', dia: 'Whatever comes for you comes for me.' },
  { act: 'I bargain with the fate that governs the binding.', dia: 'Let me set the price.' },
  { act: 'I stand against the order that would silence this.', dia: 'You cannot unmake what I saw.' },
  { act: 'I act on what I have learned and move to set it right.', dia: 'We fix it now.' },
  { act: 'I face what my choice has set in motion.', dia: 'I will see it through.' }
];

const log = (...a) => console.log(...a);

async function runOnce(label, csqOn) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const objectives = [], slotChecks = [], consequences = [], transitions = [];
  page.on('console', m => {
    const t = m.text();
    if (/\[STATE-CHANGE:EVENT\]/.test(t)) objectives.push(t.replace(/^.*\[STATE-CHANGE:EVENT\]\s*/, '').slice(0, 200));
    if (/\[SLOT-CHECK\]/.test(t)) slotChecks.push(t.replace(/^.*\[SLOT-CHECK\]\s*/, '').slice(0, 240));
    if (/\[CONSEQUENCE\]/.test(t)) consequences.push(t.replace(/^.*\[CONSEQUENCE\]\s*/, '').slice(0, 240));
    if (/\[STATE-TRANSITION\]/.test(t)) transitions.push(t.replace(/^.*\[STATE-TRANSITION\]\s*/, '').slice(0, 300));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
  await page.evaluate((csqOn) => {
    const s = window.state;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__disableSpeculativePreload = true;
    window._structuredEventHandoff = true;           // FROZEN verifier ON for both arms
    window._consequenceSelectionPlanner = csqOn === true;   // THE ONLY VARIABLE
    window._situationDrivenPlanner = false; window._accomplishedEventContract = false; window._usePlanSpine = false;
    try { localStorage.setItem('sb_stories_onboarded', '1'); } catch (_) {}
    window._forceDeckMandate = false;
    try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
    window.__capturedPages = [];
    try {
      const SP = window.StoryPagination;
      if (SP && typeof SP.addPage === 'function' && !SP.__wrapped) {
        const real = SP.addPage.bind(SP);
        SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return real(h, n); };
        SP.__wrapped = true;
      }
    } catch (_) {}
  }, csqOn);

  log(`[${label}] bootstrap …`);
  try {
    await page.evaluate(async ({ STARTER, T }) => {
      const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
      if (!def) throw new Error('starter not found');
      await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T))]);
    }, { STARTER, T: SCENE_TIMEOUT });
  } catch (e) { log(`[${label}] bootstrap ERR ` + (e && e.message)); }
  await page.waitForFunction(() => (Date.now() - (window.__lastPageAt || 0)) > 12000 && (window.__capturedPages || []).length >= 1 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});

  const grab = () => page.evaluate(() => {
    const s = window.state;
    const clean = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return { scenes: (window.__capturedPages || []).map(clean).filter(t => t.length > 150), facts: ((s._committedState && s._committedState.facts) || []).map(f => f.fact), cumulative: s._cumulativeAPICost || 0 };
  });

  const factsTraj = [];
  for (let i = 0; i < N; i++) {
    const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
    const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      if (attempt > 0) await page.waitForTimeout(30000);
      await page.evaluate((csq) => { const s = window.state; window._structuredEventHandoff = true; window._consequenceSelectionPlanner = csq === true; window._situationDrivenPlanner = false; window._accomplishedEventContract = false; window._usePlanSpine = false; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; }, csqOn);
      await page.evaluate(({ act, dia }) => { const sv = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; sv('actionInput', act); sv('dialogueInput', dia); }, A);
      try {
        await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
        const started = await page.waitForFunction(({ n, t }) => window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
        if (!started) throw new Error('submit BAILED');
        await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
        ok = true;
      } catch (e) { log(`[${label}] cont ${i + 1} fail: ` + (e && e.message)); }
    }
    await page.waitForTimeout(1200);
    const g = await grab();
    factsTraj.push(g.facts.length);
    log(`[${label}] cont ${i + 1}/${N} → scenes=${g.scenes.length} facts=${g.facts.length}` + (ok ? '' : ' (FAILED — stopping)'));
    if (!ok) break;
  }

  const g = await grab();
  await browser.close();
  return { scenes: g.scenes, facts: g.facts, factsTraj, objectives, slotChecks, consequences, transitions, cumulative: g.cumulative };
}

// confusion tree + momentum (distinct objectives) helpers
function confusion(slotChecks) {
  let pass = 0, impossible = 0, dropped = 0;
  slotChecks.forEach(sc => { const fail = /FAIL/.test(sc); if (!fail && /\bPASS\b/.test(sc)) pass++; else if (/IMPOSSIBLE-EVENT/.test(sc)) impossible++; else if (fail) dropped++; });
  return { checked: pass + impossible + dropped, pass, impossible, dropped };
}
function toks(s) { return new Set(String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4)); }
function distinctCount(objs) { // count how many objectives are NOT near-duplicates of an earlier one (Jaccard<0.5)
  const seen = []; let distinct = 0;
  for (const o of objs) { const T = toks(o); const dup = seen.some(S => { let i = 0; T.forEach(w => { if (S.has(w)) i++; }); return i / (T.size + S.size - i || 1) >= 0.5; }); if (!dup) { distinct++; seen.push(T); } }
  return distinct;
}

// SITUATION ENTROPY (Roman's pacing metric): does scene N pose a DIFFERENT dramatic problem than N-1 — not "did the
// wording/intensity change" but "would a human describe a different problem." Semantic judge on consecutive objectives.
const ENTROPY_SYS = 'You judge story pacing. Given two consecutive scene objectives, decide whether they pose the SAME dramatic problem or DIFFERENT dramatic problems. SAME = a reader would describe the core unresolved problem the same way (only wording or intensity changed). DIFFERENT = the core problem the characters must solve has actually changed. Reply ONLY JSON {"verdict":"same"|"different"}.';
async function judgePair(prev, cur) {
  try {
    const r = await fetch('http://localhost:3000/api/chatgpt-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: ENTROPY_SYS }, { role: 'user', content: 'PREV: ' + prev + '\nCUR: ' + cur }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0, max_tokens: 40, jsonMode: true }) });
    const d = await r.json(); const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    return (JSON.parse(c).verdict || '?');
  } catch (_) { return '?'; }
}
async function situationEntropy(objectives) {
  const objs = objectives.map(o => o.replace(/^scene=\d+\s*::\s*/, '').slice(0, 160));
  let different = 0, judged = 0;
  for (let i = 1; i < objs.length; i++) { const v = await judgePair(objs[i - 1], objs[i]); if (v !== '?') judged++; if (v === 'different') different++; }
  return { transitions: objs.length - 1, judged, different };
}

fs.mkdirSync(DIR, { recursive: true });
const flagOnLabel = (Math.random() < 0.5) ? 'run_1' : 'run_2';
log(`\n=== CONSEQUENCE-SELECTION A/B — First Sacrifice, ${N} continuations (BLIND, frozen verifier) ===`);
const out = {}; let total = 0;
for (const label of ['run_1', 'run_2']) {
  const r = await runOnce(label, label === flagOnLabel);
  out[label] = r; total += (r.cumulative || 0);
  fs.writeFileSync(`${DIR}/${label}.json`, JSON.stringify({ label, scenesCaptured: r.scenes.length, scenes: r.scenes }, null, 1));
  fs.writeFileSync(`${DIR}/trace_${label}.json`, JSON.stringify({ label, objectives: r.objectives, slotChecks: r.slotChecks, consequences: r.consequences, transitions: r.transitions, facts: r.facts }, null, 1));
}
fs.writeFileSync(`${DIR}/_key.json`, JSON.stringify({ flagOnLabel, note: flagOnLabel + ' = consequence-selection planner ON; the other = current milestone planner' }, null, 1));

log(`\n=== DONE — total $${total.toFixed(3)} → ${DIR} ===`);
for (const label of ['run_1', 'run_2']) {
  const r = out[label]; const c = confusion(r.slotChecks); const d = distinctCount(r.objectives);
  const ent = await situationEntropy(r.objectives);
  log(`\n${label}: scenes=${r.scenes.length} objectives=${r.objectives.length} distinct-objectives(momentum)=${d}`);
  log(`  confusion: ${c.checked} checked · ${c.impossible} impossible(planner) · ${c.dropped} dropped(author) · ${c.pass} rendered`);
  log(`  committed-fact trajectory: [${(r.factsTraj || []).join(',')}]  (climbs = engine self-feeding; flat 0 = spinning)`);
  log(`  situation-entropy: ${ent.different}/${ent.judged} consecutive transitions pose a DIFFERENT dramatic problem (higher = less stall)`);
}
const onSit = out[flagOnLabel].consequences.length;
log(`\nSANITY (mechanism fired): consequence-on run emitted ${onSit} [CONSEQUENCE] line(s) (0 = did NOT fire).`);
log(`BLIND READ: run_1.json, run_2.json · KEY WITHHELD → _key.json`);
process.exit(0);
