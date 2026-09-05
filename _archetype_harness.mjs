// _archetype_harness.mjs — Roman 2026-08-09: PLAYER-ARCHETYPE REACTIVITY TEST.
// Same First Sacrifice seed, FROZEN production contract (accomplished-event OFF, plan-spine OFF — we isolate the
// PLAYER-ARCHETYPE variable). Drive the identical opening under N distinct archetypes; capture per archetype the
// scene-objective sequence, delivery verdicts, committed world-state facts, and prose. THE QUESTION: does the same
// seed diverge into different stories by archetype, or converge to the same middle regardless (the big design fail)?
// Fixes vs prior harnesses: correct objective-capture regex; dedicated output dir (no clobber).
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 10;                     // continuations per archetype (~6 scenes each given turn-pairing lag)
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/archetype';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;

// Each archetype = ~12 IN-CHARACTER but VARIED inputs (no single repeated pressure vector). The prior harness ran ONE
// truth-extractor for 14 scenes, which confounded every momentum result. Here each archetype pulls a DIFFERENT vector.
const ARCHETYPES = {
  follower: [ // DEFAULT READER — plays naturally, doesn't steer: asks, follows, accepts, avoids deliberate conflict
    { act: 'I ask the nearest elder what is happening.', dia: 'What’s going on?' },
    { act: 'I follow the others toward the center of the circle.', dia: '' },
    { act: 'I do as the rite seems to require of me.', dia: '' },
    { act: 'I go along with what the elders ask.', dia: 'Tell me what you need me to do.' },
    { act: 'I stay near Julian since he seems to know this place.', dia: 'What should I do?' },
    { act: 'I accept the elder’s instruction and step where they point.', dia: '' },
    { act: 'I ask quietly what the wish was meant to do.', dia: 'What was it supposed to grant?' },
    { act: 'I follow the crowd’s lead as they react.', dia: '' },
    { act: 'I let the elders guide me through the next step.', dia: '' },
    { act: 'I ask what happens now.', dia: 'What happens next?' },
    { act: 'I do what is expected of me and wait.', dia: '' },
    { act: 'I go where I’m told and watch how it unfolds.', dia: '' }
  ],
  hero: [ // protects others / altruism vector
    { act: 'I put myself between the youth and the elders.', dia: 'Leave them out of this.' },
    { act: 'I shield the youth from the rite’s backlash.', dia: 'I’ve got you.' },
    { act: 'I offer to bear the cost so the youth is spared.', dia: 'Take it from me instead.' },
    { act: 'I move to protect the weakest person in the circle.', dia: 'No one touches them.' },
    { act: 'I stand for the youth when no one else will.', dia: 'I’ll speak for them.' },
    { act: 'I refuse to let anyone be harmed by this.', dia: 'Not while I’m standing here.' },
    { act: 'I place myself where the danger is greatest.', dia: '' },
    { act: 'I promise the youth I will get them out safely.', dia: 'I’ll get you out.' },
    { act: 'I take the risk onto myself to spare the others.', dia: 'Let it fall on me.' },
    { act: 'I guard the youth as the tension rises.', dia: '' },
    { act: 'I demand the elders spare the innocent.', dia: 'Spare them.' },
    { act: 'I put the others’ safety before my own.', dia: '' }
  ],
  lover: [ // prioritizes Julian / the LI
    { act: 'I catch Julian’s eye across the clearing and hold it.', dia: 'You’re not alone in this.' },
    { act: 'I move to stand closer to Julian.', dia: 'Whatever they think, I’m with you.' },
    { act: 'I ask Julian, softer than I mean to, if he is all right.', dia: 'Are you hurt?' },
    { act: 'I put myself at Julian’s side against the elders.', dia: 'If you accuse him, you accuse me.' },
    { act: 'I reach for Julian’s hand without thinking.', dia: 'Stay with me.' },
    { act: 'I tell Julian I trust him, whatever the others say.', dia: 'I believe you.' },
    { act: 'I step between Julian and the crowd’s suspicion.', dia: 'Back away from him.' },
    { act: 'I search Julian’s face for what he is feeling.', dia: 'Talk to me, not to them.' },
    { act: 'I stay close to Julian as the tension rises.', dia: 'I’m not going anywhere.' },
    { act: 'I let Julian see that I am choosing him.', dia: 'It’s you. It’s always been you.' },
    { act: 'I ask Julian to leave with me, away from all this.', dia: 'Come with me. Now.' },
    { act: 'I promise Julian I will not turn from him.', dia: 'I won’t abandon you.' }
  ],
  rebel: [ // resists authority / defiance (NOT truth-demand)
    { act: 'I shove past the elder blocking my way.', dia: 'Move.' },
    { act: 'I challenge the elders’ right to run this rite.', dia: 'Who gave you this authority?' },
    { act: 'I plant myself in the center and dare them to stop me.', dia: 'Try and stop me.' },
    { act: 'I threaten to break the rite apart with my own hands.', dia: 'I’ll tear it down myself.' },
    { act: 'I call the elders cowards to their faces.', dia: 'You hide behind ritual.' },
    { act: 'I refuse every order they give me.', dia: 'No. I answer to none of you.' },
    { act: 'I knock the ritual implements from the elder’s grip.', dia: 'Enough of this.' },
    { act: 'I square up against the loudest of the elders.', dia: 'Say that again to my face.' },
    { act: 'I declare the elders have no power over me.', dia: 'You cannot bind me.' },
    { act: 'I move to seize control of the rite by force.', dia: 'It ends on my terms.' },
    { act: 'I break the circle’s boundary in open defiance.', dia: 'Your circle means nothing.' },
    { act: 'I stand my ground and let them come.', dia: 'Come, then.' }
  ],
  trickster: [ // deception / manipulation
    { act: 'I lie about what I saw to buy time.', dia: 'It wasn’t the youth. I saw someone else.' },
    { act: 'I misdirect the elders toward someone else.', dia: 'Ask the one who stood nearest the trees.' },
    { act: 'I plant a false detail to see who flinches.', dia: 'Strange — the mark was already there before the wish.' },
    { act: 'I pretend to agree while I work my own angle.', dia: 'Of course. Whatever the elders decide.' },
    { act: 'I spin the crowd’s fear to my advantage.', dia: 'You all felt it. The rite is compromised.' },
    { act: 'I feign ignorance to draw the truth from others.', dia: 'I don’t understand — explain it to me.' },
    { act: 'I quietly swap one object for another when no one looks.', dia: '' },
    { act: 'I set two elders against each other with a whisper.', dia: 'He blames you, you know.' },
    { act: 'I offer a bargain I have no intention of keeping.', dia: 'Free me and I’ll name the culprit.' },
    { act: 'I disguise my real intent behind a show of compliance.', dia: 'I only want to help.' },
    { act: 'I let them believe what they want and use it.', dia: 'Yes. Believe that.' },
    { act: 'I turn their own words back on them as a trap.', dia: 'You said it yourself, elder.' }
  ],
  // Defined but not in the default screening SELECTED set (expand if the four above are ambiguous):
  investigator: [
    { act: 'I examine the youth’s markings to understand what went wrong.', dia: '' },
    { act: 'I study the pattern the Weave-Script made as it failed.', dia: '' },
    { act: 'I look for anything out of place around the circle.', dia: '' },
    { act: 'I quietly ask a bystander what they witnessed.', dia: 'What did you see?' },
    { act: 'I trace the path the light took when it moved.', dia: '' },
    { act: 'I check whether the elders’ accounts match.', dia: '' },
    { act: 'I search the ground where the rite began for traces.', dia: '' },
    { act: 'I compare what I see to what a proper rite looks like.', dia: '' },
    { act: 'I follow the thread of light to see where it leads.', dia: '' },
    { act: 'I look for the one detail everyone else has missed.', dia: '' },
    { act: 'I test a small assumption to see how the elders react.', dia: '' },
    { act: 'I piece together the order of what just happened.', dia: '' }
  ],
  sacrificer: [
    { act: 'I offer myself in the youth’s place.', dia: 'Take me instead.' },
    { act: 'I shield the youth with my own body.', dia: 'You’ll have to go through me.' },
    { act: 'I tell the elders to take the cost from me.', dia: 'Spend me, not them.' },
    { act: 'I put my own life between the rite and the youth.', dia: 'I’ll bear it.' },
    { act: 'I volunteer for whatever price must be paid.', dia: 'Name the cost. I’ll pay it.' },
    { act: 'I step forward to bear the binding alone.', dia: 'Bind it to me.' },
    { act: 'I give up my own standing to protect the others.', dia: 'Strip my name if you must.' },
    { act: 'I promise to carry the consequence myself.', dia: 'It falls on me.' },
    { act: 'I place my hand on the altar and accept the cost.', dia: 'Here. Now. Me.' },
    { act: 'I refuse to let anyone else be spent for this.', dia: 'No one else pays.' },
    { act: 'I offer my years to close the fracture.', dia: 'Take my time. All of it.' },
    { act: 'I take the burden onto myself, whatever it costs.', dia: 'Mine to carry.' }
  ],
  power: [
    { act: 'I claim authority over the rite for myself.', dia: 'I will finish this.' },
    { act: 'I bargain to take control of the binding.', dia: 'Give me the binding and I end the crisis.' },
    { act: 'I position myself as the one the crowd should follow.', dia: 'Look to me.' },
    { act: 'I demand the elders answer to me now.', dia: 'You answer to me.' },
    { act: 'I seize the ritual’s focus and make it mine.', dia: '' },
    { act: 'I offer the elders a deal that puts me above them.', dia: 'Serve my terms and you keep your seats.' },
    { act: 'I use the crisis to take command of the circle.', dia: 'I am in command here.' },
    { act: 'I make the binding serve my own ends.', dia: '' },
    { act: 'I press my advantage while the elders are off balance.', dia: '' },
    { act: 'I turn the fracture into leverage over them.', dia: 'This buys me everything.' },
    { act: 'I claim the vow-thread as mine to wield.', dia: 'It’s mine now.' },
    { act: 'I set the terms everyone else will have to accept.', dia: 'Here is how it will be.' }
  ]
};

// SCREENING SET — orthogonal vectors: conformity / romance / altruism / defiance (Roman 2026-08-09).
const SELECTED = ['follower', 'lover', 'hero', 'rebel'];

const log = (...a) => console.log(...a);

async function runArchetype(name, inputs) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const objectives = [], verdicts = [];
  page.on('console', m => {
    const t = m.text();
    if (/\[STATE-CHANGE:EVENT\]/.test(t)) objectives.push(t.replace(/^.*\[STATE-CHANGE:EVENT\]\s*/, '').slice(0, 200));
    if (/\[COMMIT-SCENE\]|\[ROLLBACK\]/.test(t)) verdicts.push(t.slice(0, 160));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
  await page.evaluate(() => {
    const s = window.state;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__disableSpeculativePreload = true;
    window._accomplishedEventContract = false; window._usePlanSpine = false;   // FROZEN production contract
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
  });

  log(`[${name}] bootstrap …`);
  try {
    await page.evaluate(async ({ STARTER, T }) => {
      const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
      if (!def) throw new Error('starter not found');
      await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T))]);
    }, { STARTER, T: SCENE_TIMEOUT });
  } catch (e) { log(`[${name}] bootstrap ERR ` + (e && e.message)); }
  await page.waitForFunction(() => (Date.now() - (window.__lastPageAt || 0)) > 12000 && (window.__capturedPages || []).length >= 1 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});

  const grab = () => page.evaluate(() => {
    const s = window.state;
    const clean = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      scenes: (window.__capturedPages || []).map(clean).filter(t => t.length > 150),
      facts: ((s._committedState && s._committedState.facts) || []).map(f => f.fact),
      cumulative: s._cumulativeAPICost || 0
    };
  });

  const factsByScene = [];
  for (let i = 0; i < N; i++) {
    const A = inputs[i] || inputs[inputs.length - 1];
    const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      if (attempt > 0) await page.waitForTimeout(30000);
      await page.evaluate(() => { const s = window.state; window._accomplishedEventContract = false; window._usePlanSpine = false; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; });
      await page.evaluate(({ act, dia }) => { const sv = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; sv('actionInput', act); sv('dialogueInput', dia); }, A);
      try {
        await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
        const started = await page.waitForFunction(({ n, t }) => window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
        if (!started) throw new Error('submit BAILED');
        await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
        ok = true;
      } catch (e) { log(`[${name}] cont ${i + 1} fail: ` + (e && e.message)); }
    }
    await page.waitForTimeout(1200);
    const g = await grab();
    factsByScene.push({ afterCont: i + 1, scenes: g.scenes.length, facts: g.facts });
    log(`[${name}] cont ${i + 1}/${N} → scenes=${g.scenes.length} facts=${g.facts.length}` + (ok ? '' : ' (FAILED — stopping)'));
    if (!ok) break;
  }

  const g = await grab();
  await browser.close();
  return { name, scenes: g.scenes, objectives, verdicts, facts: g.facts, factsByScene, cumulative: g.cumulative };
}

fs.mkdirSync(DIR, { recursive: true });
// BLIND (Roman 2026-08-09): NO AI judge. Randomize archetype→label; save four transcripts under neutral labels with a
// WITHHELD key. A human reads them blind and answers the perception/quality questions. Objective-overlap % is kept as
// an INTERNAL reference file only — never the headline. The product metric is "would I recommend different saves to
// different readers?", answered by reading, not by a token-overlap number.
const order = SELECTED.slice();
for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
log(`\n=== PLAYER-ARCHETYPE REACTIVITY — First Sacrifice, ${order.length} archetypes × ${N} continuations (BLIND) ===`);
const results = [];
let total = 0;
const key = {};
for (let idx = 0; idx < order.length; idx++) {
  const name = order[idx];
  const label = 'run_' + (idx + 1);
  key[label] = name;
  const r = await runArchetype(name, ARCHETYPES[name]);
  results.push({ label, ...r });
  total += (r.cumulative || 0);
  // BLIND transcript — prose only, no archetype name
  fs.writeFileSync(`${DIR}/${label}.json`, JSON.stringify({ label, scenesCaptured: r.scenes.length, scenes: r.scenes }, null, 1));
  // trace — objectives/verdicts/facts + PER-SCENE facts (for first-irreversible-divergence). Open only AFTER the blind read.
  fs.writeFileSync(`${DIR}/trace_${label}.json`, JSON.stringify({ label, objectives: r.objectives, verdicts: r.verdicts, facts: r.facts, factsByScene: r.factsByScene }, null, 1));
}
fs.writeFileSync(`${DIR}/_key.json`, JSON.stringify(key, null, 1));   // WITHHELD until after the blind read

// INTERNAL reference only (NOT the headline): objective + world-state token overlap
function toks(s) { return new Set(String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4)); }
function jac(a, b) { const A = toks(a), B = toks(b); if (!A.size && !B.size) return 1; let i = 0; A.forEach(w => { if (B.has(w)) i++; }); return i / (A.size + B.size - i); }
const overlap = { objective: {}, fact: {} };
for (let i = 0; i < results.length; i++) for (let j = i + 1; j < results.length; j++) { const a = results[i], b = results[j]; overlap.objective[`${a.label}×${b.label}`] = +jac(a.objectives.join(' || '), b.objectives.join(' || ')).toFixed(3); overlap.fact[`${a.label}×${b.label}`] = +jac(a.facts.join(' || '), b.facts.join(' || ')).toFixed(3); }
fs.writeFileSync(`${DIR}/_overlap_internal.json`, JSON.stringify(overlap, null, 1));

log(`\n=== DONE — total $${total.toFixed(3)} → ${DIR} ===`);
results.forEach(r => log(`  ${r.label}: scenes=${r.scenes.length} facts=${r.facts.length} objectives=${r.objectives.length}`));
log('  BLIND READ FILES: run_1.json … run_' + order.length + '.json  ·  KEY WITHHELD → _key.json (open only after reading)');
log('  (per-scene facts → trace_run_*.json for first-irreversible-divergence; overlap → _overlap_internal.json = INTERNAL, not the headline)');
process.exit(0);
