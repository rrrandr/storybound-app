// _pendingintent_ab.mjs — Roman 2026-08-10. THE PENDING-INTENT DELETION TEST (behavioral, not capability).
// ONE variable: window._suppressPendingIntent. Arm A = pendingIntent injected normally after a MISS (live loop as ships).
// Arm B = pendingIntent line omitted after a MISS. Everything else identical: DEFAULT spine planner (all experimental
// planner flags OFF), frozen evidence verifier (_structuredEventHandoff=true), same starter, same action sequence.
// Question: with pendingIntent gone, does the planner INVENT a new objective, or independently REGENERATE the same one?
// Captures per scene: [STATE-CHANGE:EVENT] objective, [COMMIT-SCENE] delivery verdict, [SLOT-CHECK], committed-fact
// trajectory, and the LITERAL [PLANNER-PROMPT] _scUsr dump (written to file for inspection). NOT blind — the primary
// metric (objective self-repetition / divergence) is mechanical.
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 10;
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/pendingintent';
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
  { act: 'I stand against the order that would silence this.', dia: 'You cannot unmake what I saw.' }
];

const log = (...a) => console.log(...a);

async function runOnce(label, suppressPI) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const objectives = [], slotChecks = [], commitLines = [], plannerPrompts = [];
  page.on('console', m => {
    const t = m.text();
    if (/\[STATE-CHANGE:EVENT\]/.test(t)) objectives.push(t.replace(/^.*\[STATE-CHANGE:EVENT\]\s*/, '').slice(0, 200));
    if (/\[SLOT-CHECK\]/.test(t)) slotChecks.push(t.replace(/^.*\[SLOT-CHECK\]\s*/, '').slice(0, 240));
    if (/\[COMMIT-SCENE\]/.test(t)) commitLines.push(t.replace(/^.*\[COMMIT-SCENE\]\s*/, '').slice(0, 200));
    if (/\[PLANNER-PROMPT\]/.test(t)) plannerPrompts.push(t.replace(/^.*\[PLANNER-PROMPT\]\s*/, ''));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
  await page.evaluate((suppressPI) => {
    const s = window.state;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__disableSpeculativePreload = true;
    window._structuredEventHandoff = true;            // FROZEN verifier ON (trusted MISS attribution → pendingIntent fires reliably)
    window._suppressPendingIntent = suppressPI === true;  // THE ONLY VARIABLE
    window._dumpPlannerPrompt = true;                 // log the literal _scUsr
    // ALL experimental planner flags OFF → the DEFAULT spine planner (the live shipping planner)
    window._consequenceSelectionPlanner = false; window._situationDrivenPlanner = false;
    window._accomplishedEventContract = false; window._usePlanSpine = false; window._scenePlannerStageable = false;
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
  }, suppressPI);

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
      await page.evaluate((sp) => { const s = window.state; window._structuredEventHandoff = true; window._suppressPendingIntent = sp === true; window._dumpPlannerPrompt = true; window._consequenceSelectionPlanner = false; window._situationDrivenPlanner = false; window._accomplishedEventContract = false; window._usePlanSpine = false; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; }, suppressPI);
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
  return { scenes: g.scenes, facts: g.facts, factsTraj, objectives, slotChecks, commitLines, plannerPrompts, cumulative: g.cumulative };
}

// self-repetition: consecutive objectives judged SAME/DIFFERENT dramatic problem (semantic, not wording)
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
function firstMissScene(commitLines) { // COMMIT-SCENE lines carry delivery=... ; find first non-DELIVERED
  for (const l of commitLines) { const m = l.match(/scene=(\d+)\s+delivery=(\w+)/); if (m && m[2] !== 'DELIVERED') return parseInt(m[1], 10); }
  return -1;
}

fs.mkdirSync(DIR, { recursive: true });
log(`\n=== PENDING-INTENT DELETION A/B — First Sacrifice, ${N} continuations (LABELED; one variable: _suppressPendingIntent) ===`);
const out = {}; let total = 0;
for (const [label, sp] of [['A_pendingIntent_ON', false], ['B_pendingIntent_SUPPRESSED', true]]) {
  const r = await runOnce(label, sp);
  out[label] = r; total += (r.cumulative || 0);
  fs.writeFileSync(`${DIR}/${label}_scenes.json`, JSON.stringify({ label, scenes: r.scenes }, null, 1));
  fs.writeFileSync(`${DIR}/${label}_trace.json`, JSON.stringify({ label, objectives: r.objectives, slotChecks: r.slotChecks, commitLines: r.commitLines, factsTraj: r.factsTraj, facts: r.facts }, null, 1));
  fs.writeFileSync(`${DIR}/${label}_planner_prompts.txt`, r.plannerPrompts.join('\n\n========================================\n\n'));
}

log(`\n=== DONE — total $${total.toFixed(3)} → ${DIR} ===`);
for (const label of ['A_pendingIntent_ON', 'B_pendingIntent_SUPPRESSED']) {
  const r = out[label];
  const ent = await situationEntropy(r.objectives);
  const fm = firstMissScene(r.commitLines);
  log(`\n${label}: scenes=${r.scenes.length} objectives=${r.objectives.length}`);
  log(`  committed-fact trajectory: [${(r.factsTraj || []).join(',')}]`);
  log(`  first MISS at scene: ${fm}  (pendingIntent starts firing AFTER this in arm A)`);
  log(`  situation-entropy: ${ent.different}/${ent.judged} consecutive transitions pose a DIFFERENT dramatic problem`);
  log(`  OBJECTIVE SEQUENCE:`);
  r.objectives.forEach((o, i) => log(`    ${i}: ${o.replace(/^scene=\d+\s*::\s*/, '').slice(0, 100)}`));
}
log(`\nDeletion-test read: compare the two OBJECTIVE SEQUENCES from the first-MISS scene onward. If B diverges (new`);
log(`objectives) while A repeats → pendingIntent was PINNING the planner. If B still repeats → something else dominates.`);
log(`Literal planner prompts (see what dominates): ${DIR}/*_planner_prompts.txt`);
process.exit(0);
