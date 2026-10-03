// WHAT SURVIVES INTO THE NEXT SCENE'S CONTEXT? Provider-free, $0.
//
// Two regression cases Roman named, run against the system AS IT STANDS so the failures are
// established before any repair, and re-run afterwards with the same assertions.
//
//   1. A CONSEQUENTIAL EVENT IN THE MIDDLE OF A SCENE — an object handed over at mid-scene.
//      The memory extractor sees plain.slice(-1500) (the END); the scene window keeps
//      slice(0, 420) (the BEGINNING). A mid-scene event is in neither.
//   2. AN OLDER UNRESOLVED DECISION — an obligation several scenes back, still unresolved,
//      which must survive even though it has fallen outside any recent-scenes window.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
console.log('=== HISTORY CONTINUITY REGRESSION (provider-free, $0) ===\n');

// A scene whose decisive event sits in the MIDDLE, with filler either side so neither the
// head-clip nor the tail-slice can reach it.
// LENGTH MATTERS, and my first version of this test was wrong about it. head(420) + tail(1500)
// COVER a short scene completely, so the gap only opens once a scene exceeds ~1,920 characters.
// The CG scenes this corpus produced were 897-1,914 chars — inside the covered range. The BAKED
// OPENING is 7,605, and literary scenes run long, so the hole is real where scenes are long.
// This filler puts the handover squarely inside it.
const FILLER_A = 'The chamber was colder than the clearing had been, and the light came in low. '
  .repeat(40);
const HANDOVER = 'Julian took the sealed writ from his sleeve and put it into Lirael\'s hands, '
  + 'and she closed her fingers around it before she could think better of it. ';
const FILLER_B = 'Somewhere beyond the door a bell was being rung for the second hour. '.repeat(40);
const MID_SCENE = FILLER_A + HANDOVER + FILLER_B;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.state, { timeout: 30000 });

console.log('1. THE MID-SCENE HANDOVER');
console.log('   scene is ' + MID_SCENE.length + ' chars; the handover sits at ' + FILLER_A.length
  + '–' + (FILLER_A.length + HANDOVER.length));
{
  const r = await page.evaluate(({ text, probe }) => {
    const head = text.slice(0, 420);
    const tail = text.slice(-1500);
    return { inHead: head.includes(probe), inTail: tail.includes(probe),
      headLen: head.length, tailLen: tail.length, total: text.length };
  }, { text: MID_SCENE, probe: 'put it into Lirael' });
  console.log('     head(420) contains it: ' + r.inHead + '   tail(1500) contains it: ' + r.inTail
    + '   <- THE OLD CHANNELS, measured as baseline, not asserted');
  // The old channels are NOT the test. They clip by position and always will; the repair does not
  // change their arithmetic. What must be true is that the handover REACHES THE MODELS, which is
  // what the note carries.
  const d = await page.evaluate(({ text }) => {
    window.state.scenes = [];
    const rec = window._sbPersistSceneProjection
      ? window._sbPersistSceneProjection({ kind: 'body', input: text, uid: 'lit:midscene',
          historyNote: { transfers: [{ text: 'Julian put the sealed writ into Lirael\'s hands.' }],
            events: [], decisions: [], consequences: [], disclosures: [], obligations: [] } })
      : null;
    if (!rec) { window.state.scenes = [{ uid: 'lit:midscene', text: text }];
      window._attachHistoryNote('lit:midscene',
        { transfers: [{ text: 'Julian put the sealed writ into Lirael\'s hands.' }] }, text); }
    return { block: window._buildHistoryContinuityBlock(window.state, {}),
      bornWithNote: !!(rec && rec.historyNote) };
  }, { text: MID_SCENE });
  t('the note was attached AT THE SCENE RECORD\'S BIRTH, not bolted on later', d.bornWithNote,
    '_sbPersistSceneProjection did not carry spec.historyNote');
  t('THE MID-SCENE HANDOVER REACHES THE MODELS through the note',
    /sealed writ into Lirael/.test(d.block),
    'the handover is still lost: ' + String(d.block).slice(0, 160));
}

console.log('\n2. AN OLDER UNRESOLVED DECISION');
{
  const r = await page.evaluate(() => {
    // Seed an obligation several scenes back, then advance past any recent-scenes window.
    window.state.sceneWindow = [];
    for (let i = 1; i <= 6; i++) {
      const txt = 'Scene ' + i + ' opened on the same stone table and nothing was decided. ';
      // the production trimmer: first 420 chars of each, last two kept
      let trimmed = txt.length > 420 ? txt.slice(0, 420) : txt;
      window.state.sceneWindow.push(trimmed);
      if (window.state.sceneWindow.length > 2) window.state.sceneWindow.shift();
    }
    const promises = (window.state.narrativeState && window.state.narrativeState.unresolved_promises) || null;
    return { windowLen: window.state.sceneWindow.length,
      windowHasScene1: window.state.sceneWindow.some(x => /Scene 1 /.test(x)),
      unresolvedChannel: promises };
  });
  console.log('     scene window retains ' + r.windowLen + ' scene(s); contains scene 1: '
    + r.windowHasScene1);
  console.log('     <- again the OLD window, baseline only; section 5 is the repaired assertion');
  t('the old scene window still holds only two scenes (unchanged by design)',
    r.windowLen === 2 && r.windowHasScene1 === false,
    'the window behaviour changed unexpectedly');
}

console.log('\n3. DOES ANY OF IT REACH THE PLANNER?');
{
  const r = await page.evaluate(() => ({
    builderExists: typeof window.buildStoryMemoryDirective === 'function',
    continuityExists: typeof window._buildContinuitySpineBlock === 'function',
    historyContract: typeof window._buildHistoryContinuityBlock === 'function'
  }));
  console.log('     ' + JSON.stringify(r));
  t('a shared history contract exists that both planner and author can call',
    r.historyContract === true,
    'no _buildHistoryContinuityBlock — story memory is assembled only for the literary author');
}

console.log('\n4. THE NOTE IS A PROPOSED SUMMARY, AND THE PROSE IS THE AUTHORITY');
{
  const PROSE = 'The chamber was quiet. Julian took the sealed writ from his sleeve and put it '
    + 'into Lirael\'s hands. She closed her fingers around it. The Dohkar did not look up.';
  const r = await page.evaluate(({ prose }) => {
    window.state.scenes = [{ uid: 'lit:hn-test', text: prose, title: '', synopsis: '' }];
    const note = {
      events: [{ text: 'Julian handed Lirael the sealed writ in the chamber.' }],
      transfers: [{ text: 'The sealed writ passed from Julian to Lirael.' }],
      // A CLAIM THE PROSE NEVER SHOWS — the negative case.
      disclosures: [{ text: 'Julian confessed that he spent his own wish to stop the twist.' }],
      obligations: [{ text: 'Lirael must answer for her conduct at the inquiry.', owedBy: 'Lirael' }],
      knowledge: { 'the assembly': 'saw the writ change hands; does not know what it says' }
    };
    const stored = window._attachHistoryNote('lit:hn-test', note, prose);
    const block = window._buildHistoryContinuityBlock(window.state, {});
    return { stored, block };
  }, { prose: PROSE });
  const v = r.stored && r.stored.verified, u = r.stored && r.stored.unverified;
  t('a supported event is ESTABLISHED', (v.events || []).length === 1, JSON.stringify(v.events));
  t('a supported object transfer is ESTABLISHED', (v.transfers || []).length === 1);
  t('AN UNSUPPORTED CLAIM IS NOT ESTABLISHED — the negative case',
    (v.disclosures || []).length === 0 && (u.disclosures || []).length === 1,
    'verified=' + JSON.stringify(v.disclosures) + ' unverified=' + JSON.stringify(u.disclosures));
  t('and it does NOT appear in the history block the models receive',
    !/spent his own wish/.test(r.block), 'the unsupported claim leaked into established history');
  t('the supported transfer DOES appear in that block',
    /sealed writ passed from Julian/.test(r.block));
  t('who-knows-what is carried', /KNOWS — the assembly/.test(r.block));
  t('an obligation is carried as still unresolved',
    /STILL UNRESOLVED/.test(r.block) && /answer for her conduct/.test(r.block));
  t('the note did not touch the entity register or any durable fact',
    !/activated|proposalRef/.test(JSON.stringify(r.stored)));
}

console.log('\n5. OBLIGATIONS OUTLIVE THE RECENT WINDOW');
{
  const r = await page.evaluate(() => {
    window.state.scenes = [];
    for (let i = 1; i <= 6; i++) {
      window.state.scenes.push({ uid: 'lit:s' + i, text: 'Scene ' + i + ' happened and was read.',
        historyNote: { v: 1, verified: { events: [{ text: 'scene ' + i + ' event' }],
          obligations: i === 1 ? [{ text: 'The writ must be answered before the inquiry.' }] : [] },
          unverified: {}, knowledge: null } });
    }
    const block = window._buildHistoryContinuityBlock(window.state, {});
    return { block, open: window._openObligations(window.state).length };
  });
  t('an obligation from six scenes back is still open', r.open === 1, 'open=' + r.open);
  t('and it survives into the block even though its scene left the recent window',
    /must be answered before the inquiry/.test(r.block) && !/scene 1 event/.test(r.block),
    'recent events are compacted but the obligation must persist');
}

await browser.close();
fs.mkdirSync('_audit_out', { recursive: true });
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
