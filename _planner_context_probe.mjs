// WHAT CONTINUITY ACTUALLY REACHES THE NEXT PLANNER? Provider-free, $0.
//
// Zero committed facts proves the LEDGER received nothing. It does not prove the planner was told
// nothing. This captures a real scene-3 planner REQUEST and reports what continuity it carries, so
// the question is answered from the prompt rather than inferred from the reply.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, fsPlannerCaptured, AUTHOR as REPLAY_AUTHOR, MEMORY,
  verifierVerdict, refsFromVerifierRequest } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, advanceExpectingGate, chooseBranch }
  from './_fs_story_setup.mjs';

const browser = await chromium.launch();
const page = await browser.newPage();
const plannerReqs = [];
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = '', usr = '';
  try { const j = JSON.parse(raw || '{}');
    sys = String((j.messages || [])[0]?.content || '');
    usr = String((j.messages || [])[1]?.content || ''); } catch (_) {}
  const st = stageOf(sys);
  const give = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c }) });
  if (st === 'planner') { plannerReqs.push({ sys, usr }); try { return give(fsPlannerCaptured()); } catch (_) {} }
  if (st === 'author') return give(REPLAY_AUTHOR);
  if (st === 'memory') return give(MEMORY);
  if (st === 'verifier') return give(verifierVerdict(refsFromVerifierRequest(usr)));
  try { await route.abort(); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });
const def = await findFSDef(page);
await launchFS(page, def); await unlockFS(page, 'ctx-probe'); await finalizePreview(page);
await advanceExpectingGate(page, '', ''); await chooseBranch(page, 'A');
const readToGate = () => page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const st = () => { const a = window.state._stagedActive || null;
    return a ? { beat: a.currentBeatIdx, gateShown: !!a.gateShown, microShown: !!a.microShown } : null; };
  for (let i = 0; i < 240; i++) {
    const cur = st(); if (!cur || cur.gateShown) break;
    const prev = cur.beat;
    try { window._advanceStagedBeat(); } catch (_) {}
    await sleep(50);
    const nxt = st();
    if (nxt && nxt.beat === prev && !nxt.gateShown) {
      if (!nxt.microShown && typeof window._resolveMicroDecision === 'function') {
        try { window._resolveMicroDecision(0); } catch (_) {}
        await sleep(70);
      } else await sleep(100);
    }
  }
});
let dl = Date.now() + 180000;
while (Date.now() < dl) {
  const m = await page.evaluate(() => { const a = window.state._stagedActive;
    return !!(a && a.plan && Array.isArray(a.plan.beats) && a.plan.beats.length); });
  if (m) break; await new Promise(r => setTimeout(r, 1000));
}
await readToGate();
const before = plannerReqs.length;
await page.evaluate(() => {
  const el = document.querySelector('[data-card-index="0"]'); if (el) el.click();
  try { window._advanceStagedScene('', ''); } catch (_) {}
});
dl = Date.now() + 180000;
while (Date.now() < dl && plannerReqs.length <= before) await new Promise(r => setTimeout(r, 1000));
await browser.close();

if (plannerReqs.length <= before) { console.error('no scene-3 planner request captured'); process.exit(1); }
const r = plannerReqs[plannerReqs.length - 1];
fs.mkdirSync('_audit_out/planner_ctx', { recursive: true });
fs.writeFileSync('_audit_out/planner_ctx/scene3_system.txt', r.sys);
fs.writeFileSync('_audit_out/planner_ctx/scene3_user.txt', r.usr);
const all = r.sys + '\n' + r.usr;
console.log('=== SCENE 3 PLANNER REQUEST ===');
console.log('system ' + r.sys.length + ' chars, user ' + r.usr.length + ' chars\n');
console.log('ALL-CAPS SECTION HEADERS PRESENT (what the planner was actually handed):');
const heads = [...new Set((all.match(/^[A-Z][A-Z0-9 \-\/&'(),.:]{8,70}$/gm) || [])
  .map(x => x.trim()))];
heads.slice(0, 50).forEach(h => console.log('   · ' + h));
console.log('\nCONTINUITY PROBES:');
const probes = [
  ['committed-state / canon facts block', /COMMITTED (WORLD )?STATE|CANON FACT|ESTABLISHED FACT/i],
  ['prior scene prose or recap', /PREVIOUS SCENE|STORY SO FAR|RECAP|WHAT HAS HAPPENED|PRIOR SCENE/i],
  ['the baked opening\'s own text', /gossamer|the assembly settled|Weave-Script/i],
  ['seed world truths', /WORLD TRUTH|AFTERMATH TRUTH|REQUIRED TRUTH/i],
  ['reserved / sealed future events', /RESERVED EVENT|SEALED|unsealsAtScene|julian_counter_wish/i],
  ['the reader\'s recorded choice', /run in shame|SCENE 1 CHOICE|DECISION RECORDED|posture/i],
  ['the fate card just played', /FATE CARD|Reversal|Boundary|Temptation|Confession/i],
  ['named cast', /Lirael|Julian|Seren/],
  ['scene position / plan row', /SCENE \d+ OF|plan scene|SCENE POSITION/i]
];
probes.forEach(([name, rx]) => console.log('   ' + (rx.test(all) ? 'PRESENT ' : 'absent  ') + name));
console.log('\nartefacts: _audit_out/planner_ctx/');
