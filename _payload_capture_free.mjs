// _payload_capture_free.mjs — ZERO-SPEND author-payload capture.
//
// The delivery audit can only ever be as fresh as the payload it reads, and every
// existing capture is a by-product of a PAID run. So the audit kept reporting
// staleness as if it were a gap. This harness plays the real loop but FULFILLS every
// model POST with a canned body instead of continuing to the proxy: no tokens leave
// the machine, and the author payload is built by the same code path as a paid run.
//
// This is sound for the instructions the audit checks, because all of them are static
// canon text plus STARTER_PLANS spine data — none is downstream of a planner's LLM
// output. It is NOT sound for anything whose content depends on a real model reply.
//
// Player boundary: the same law as Test A. Onboarding state is entered through the
// transition a real user triggers; completion flags are never set by hand.
//
// usage: node _payload_capture_free.mjs [OUTDIR]
import { chromium } from 'playwright-core';
import fs from 'fs';

const OUT = process.argv[2] || '_validate_out/payload_free';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.error(...a);

const isAuthor = sys => /STORYBOUND ARCHITECTURE LAWS/.test(sys);

// Canned prose in the app-level shape chatgpt-proxy normalizes to. Deliberately bland:
// nothing here should ever be mistaken for authored output if it leaks into a capture.
// Long enough to clear the render and length gates — an 84-char stub left turnCount at 0
// and the run never reached a continuation. Deliberately bland and repetitive: nothing
// here should survive being mistaken for authored output.
// The layered wish canon is CONTENT-TRIGGERED (_FATELANDS_WISH_PRESENT_RX /
// _FATELANDS_WISH_RESOLVE_RX read the prior scene's text). Bland stub prose fires neither,
// so the next payload loses those layers and the harness reports a delivery gap it caused
// itself. The stub must be representative of what this story's prose actually contains:
// a wish spoken, a sacrifice named, a price paid.
const STUB_PARA = 'The clearing held its breath and I stood at its edge, counting the seconds before '
  + 'the rite would begin. Seren named her sacrifice aloud and made the wish she had rehearsed, '
  + 'and Fate answered the words as spoken. The price was taken in the same breath. The assembly '
  + 'had gathered in a loose ring and no one spoke. I watched the light move across the ground and '
  + 'waited, and the waiting was its own kind of work. I kept my hands still because keeping them '
  + 'still was the only thing left that I could decide.';
const STUB_PROSE = Array(6).fill(STUB_PARA).join('\n\n');
// The Author's spine block is built by _buildPlotContractDirective(), which is gated on
// the planner's state_change having an `event`. A blanket '{}' stub silently skips the
// whole block — so the harness would report a delivery gap that is purely its own doing.
// Give the state_change planner a schema-shaped reply so the gate opens honestly.
const isStateChange = sys => /"tactical_move"|state_change_precondition/.test(sys);
const STUB_STATE_CHANGE = JSON.stringify({
  tactical_move: 'Lirael steps between Seren and the presiding Dohkar.',
  state_change_precondition: 'The assembly still believes the rite can be closed cleanly.',
  state_change: 'The assembly now holds Lirael answerable for the twisted wish.',
  forces_choice: 'forces Lirael to choose between naming what Seren offered and shielding her by taking the blame',
  branch_a: 'Lirael names the offering aloud.',
  branch_b: 'Lirael claims the fault as her own.',
});
const stubContent = (sys) => isAuthor(sys) ? STUB_PROSE
  : isStateChange(sys) ? STUB_STATE_CHANGE
  : '{}';
const stubBody = (sys) => {
  const content = stubContent(sys);
  let parsed = null; try { parsed = JSON.parse(content); } catch (_) {}
  return JSON.stringify({
    ok: true,
    content,
    ...(parsed || {}),
    canonical_instruction: content,
    _orchestration: { role: 'stub', model: 'stub', tier_used: 'stub', timestamp: '1970-01-01T00:00:00.000Z' },
    usage: null,
  });
};

let spend = 0, stubbed = 0;
const payloads = [];
const nonAuthor = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

await page.route('**/api/**', async route => {
  const r = route.request();
  if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  if (!msgs.length) return route.continue();          // not a model call — let it through
  const sys = String(msgs.find(m => m.role === 'system')?.content || '');
  const usr = String(msgs.find(m => m.role === 'user')?.content || '');
  if (isAuthor(sys)) payloads.push({ n: payloads.length + 1, sys, usr });
  // Non-author payloads are captured too, so DELIVERED_TO_WRONG_LAYER can be detected:
  // a directive present in the planner and absent from the Author is a different defect
  // from one nobody received, and only a both-sides capture can tell them apart.
  else nonAuthor.push({ n: nonAuthor.length + 1, sys, usr });
  stubbed++;
  return route.fulfill({ status: 200, contentType: 'application/json', body: stubBody(sys) });
});

// Spine telemetry. A stubbed planner can break the spine selection, which would look
// exactly like a delivery gap — so record whether the spine was ever selected at all.
const spineLog = [];
const emitLog = [];
page.on('console', m => {
  const t = m.text();
  const mm = t.match(/Finalized: \$([0-9.]+)/);
  if (mm) spend += parseFloat(mm[1]);
  if (/SPINE|ASSIGN|MILESTONE|_fromPlan|authored-spine/i.test(t)) spineLog.push(t.slice(0, 220));
  if (/^\[EMIT\]/.test(t)) { emitLog.push(t); log('  ' + t); }
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.STARTER_STORIES, { timeout: 90000 });

await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies']
    .forEach(k => s.picks[k] = def[k]);
  Object.assign(s, {
    world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
    access: 'sub', subscribed: true, fortunes: 9999999, previewActive: false,
    _skipCorridorValidation: true, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    _pcLookSkipped: true, pcLookLocked: true, renderMode: 'literary', currentEngine: 'literary',
  });
  s.picks.identity = s.identity;
  window._devBypass = true;
  if (typeof window.scheduleSpeculativePreload === 'function') window.scheduleSpeculativePreload = function () {};
  // DELIBERATELY NOT SET: _petitionEmergenceFired, _deckExamineFired, _cliffhangerContinueAuthorized
});

log('[free] scene 1 — stubbed author, capturing payload…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 180000 && !payloads.length; w += 2000) await page.waitForTimeout(2000);
await page.waitForTimeout(6000);
const s1Count = payloads.length;

// SCENE 2 IS THE POINT. The spine selection runs at turnCount+2, so Scene 1 never
// receives a spine block at all — auditing spine delivery against a Scene 1 payload
// can only ever report a phantom gap. Advance through the real say/do submit.
log('[free] scene 2 — advancing through the real player action…');
const turn = () => page.evaluate(() => (window.state && window.state.turnCount) || 0);
// Literary mode gates the action inputs behind the deck examine, entered the way a real
// player enters it — never by setting _deckExamineFired.
const dex = await page.evaluate(async () => {
  if (typeof window._fireLiteraryDeckExamine !== 'function') return { ok: false, why: 'no deck fn' };
  try { await window._fireLiteraryDeckExamine(); } catch (e) { return { ok: false, why: String(e).slice(0, 80) }; }
  return { ok: true, fired: !!window.state._deckExamineFired };
});
log(`  deck examine: ${dex.ok ? 'fired=' + dex.fired : 'skipped — ' + dex.why}`);
await page.waitForTimeout(3000);
const sub = await page.evaluate(() => {
  const a = document.getElementById('actionInput'),
        d = document.getElementById('dialogueInput'),
        b = document.getElementById('submitBtn');
  if (!a || !b) return { ok: false, why: 'inputs missing' };
  a.value = 'I step between Seren and the Dohkar and put my hand on her shoulder.';
  d.value = '"She spoke alone. Judge me, not her."';
  b.disabled = false; b.click(); return { ok: true };
});
if (!sub.ok) log('  [warn] could not submit: ' + sub.why);
for (let w = 0; w < 180000; w += 3000) {
  await page.waitForTimeout(3000);
  if (await turn() >= 1 && payloads.length > s1Count) break;
}
await page.waitForTimeout(6000);
log(`  turnCount=${await turn()}  scene-1 payloads=${s1Count}  continuation payloads=${payloads.length - s1Count}`);

for (const p of payloads) fs.writeFileSync(`${OUT}/payload_${p.n}.txt`, p.sys + '\n=====USER=====\n' + p.usr);
for (const p of nonAuthor) fs.writeFileSync(`${OUT}/nonauthor_${p.n}.txt`, p.sys + '\n=====USER=====\n' + p.usr);
// Snapshot the spine state directly, so "no spine block in the payload" can be told
// apart from "the spine was never selected because a stub broke the planner".
const spineState = await page.evaluate(() => {
  const s = window.state || {};
  let planScenes = null;
  try {
    const f = window._activePlan || (typeof _activePlan === 'function' ? _activePlan : null);
    const p = f ? f(s) : null;
    planScenes = p && Array.isArray(p.scenes) ? p.scenes.length : null;
  } catch (_) {}
  return {
    turnCount: s.turnCount || 0,
    usePlanSpine: window._usePlanSpine,
    planScenes,
    spineEventVerbatim: String(s._spineEventVerbatim || '').slice(0, 120),
    sceneAssignment: s._sceneAssignment ? String(s._sceneAssignment.event || '').slice(0, 120) : null,
    spineStaging: s._spineStaging ? s._spineStaging.setting : null,
  };
});
fs.writeFileSync(`${OUT}/spine_state.json`, JSON.stringify({ spineState, spineLog }, null, 1));

// COVERAGE DECLARATION. Large parts of the Fatelands canon are CONTENT-GATED on _ltScene
// (currentCrisis + aPlot fields + playerAction), and a stubbed planner leaves those empty —
// so those layers never load and the audit would report them missing when the real defect
// is the harness. Record the gate input so the audit can refuse to draw that conclusion.
const gate = await page.evaluate(() => {
  const s = window.state || {};
  const lt = String(s.currentCrisis || '') + ' '
    + String((s.aPlot && s.aPlot.antagonistOrAntiForce) || '') + ' '
    + String((s.aPlot && s.aPlot.goal) || '');
  const rx = window._FATELANDS_WISH_PRESENT_RX;
  return { ltScene: lt.trim().slice(0, 200), ltFires: rx ? rx.test(lt) : null };
});
const gateTrace = await page.evaluate(() => (window.state && window.state._canonGateTrace) || null);
if (gateTrace) log(`  canon gate trace: wishDepicted=${gateTrace.wishDepicted} wishResolves=${gateTrace.wishResolves} `
  + `spineInGate=${gateTrace.spineInGate} twistPhysicsActivated=${gateTrace.twistPhysicsActivated}`);
else log('  canon gate trace: ABSENT — the gate site never ran on this path');
fs.writeFileSync(`${OUT}/emit_log.txt`, emitLog.join('\n'));
fs.writeFileSync(`${OUT}/gate_trace.json`, JSON.stringify(gateTrace, null, 1));
fs.writeFileSync(`${OUT}/capture_meta.json`, JSON.stringify({
  stubbed: true,
  note: 'Model replies were stubbed; no tokens spent. PRESENT findings are proof. ABSENT findings are NOT disproof.',
  canonGateInput: gate.ltScene,
  canonGateFires: gate.ltFires,
  gateTrace,
}, null, 1));
log(`  canon content-gate: ${gate.ltFires ? 'fires' : 'DOES NOT FIRE (stubbed aPlot) — absent canon rows are harness artifacts'}`);
log('\n  spine state: ' + JSON.stringify(spineState));
log('  spine console lines: ' + spineLog.length + (spineLog.length ? '\n    ' + spineLog.slice(0, 6).join('\n    ') : ''));
await browser.close();

log(`\n  model POSTs stubbed: ${stubbed}`);
log(`  author payloads captured: ${payloads.length}`);
log(`  non-author payloads captured: ${nonAuthor.length}  (for wrong-layer detection)`);
log(`  spend: $${spend.toFixed(4)}`);
if (spend > 0) { log('\n  ABORT — this harness must never spend. Investigate the route filter.'); process.exit(1); }
if (!payloads.length) { log('\n  NO PAYLOAD — a stub probably broke the pipeline before the author call.'); process.exit(1); }
log(`\n  → ${OUT}/payload_1.txt   then: node _delivery_audit.mjs ${OUT}`);
