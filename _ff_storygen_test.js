// Live Famous-Fate story-gen validation of BOTH new subsystems.
//  PART 1 (capture): feed a scene that leaves a sword in a cave + orders followers to train + notes the
//    vibranium skeleton → _famousFateContractCheck should record them in ffStoryMemory with kind object/order/state.
//  PART 2 (render): diverged + vulnerable, established facts present → fire pressure (villain) + world clock →
//    build the real FF directive stack → live Grok scene → does the prose PLAY the strike AND HONOR the facts?
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/ff_storygen';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('console', m => { const t = m.text(); if (/\[FF-PRESSURE\]|\[FF-WORLD|\[FF-CONTRACT\]/i.test(t)) console.error('  >', t.slice(0, 150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._famousFateContractCheck === 'function' && typeof window._ffTickAntagonistPressure === 'function' && typeof window._buildFamousFateWorldEventDirective === 'function' && typeof window._buildFamousFateContractDirective === 'function', { timeout: 40000 });

  const res = await p.evaluate(async () => {
    const s = window.state;
    function setup() {
      s.fateMode = 'famous_fate';
      s.famousFate = { period: 'canon', source: 'Old Man Logan (Marvel)', embodied: 'Logan' };
      s.protagonistName = 'Logan';
      s.contentMode = 'suggestive';
      s.aPlot = { goal: 'protect what family he has left in the villain-carved wasteland' };
      s.ffLocationState = { currentRegion: "Reed Richards' hidden lab", currentPlace: "Reed Richards' hidden lab", travelState: 'local' };
      s.ffContract = {
        character: { name: 'Logan', canonVow: { power: 'his claws', reason: 'the night he killed the X-Men', heldFor: '~50 years' }, canonWounds: ['killed the X-Men under illusion'], coreTruths: ['refuses to pop his claws'] },
        world: { name: 'Old Man Logan', worldArcs: [ { arc: 'the villains carved America into kingdoms', who: 'Doom, Hulk Gang, Kingpin', kind: 'reckoning' } ] },
        castList: [ { name: 'Victor Von Doom', role: 'villain', importance: 'major' }, { name: 'The Hulk Gang', role: 'enemy faction', importance: 'major' }, { name: 'Sue Storm', role: 'ally', importance: 'major' } ],
        forbiddenPresence: [ { name: 'Charles Xavier', status: 'deceased' } ],
        relationships: [], canonBeatLedger: [
          { beatIndex: 1, canonBeat: 'Logan wakes in the wasteland', momentum: 'player_gated' },
          { beatIndex: 2, canonBeat: 'Logan takes the cross-country job', momentum: 'world_parallel' },
          { beatIndex: 3, canonBeat: 'Logan reaches the coast', momentum: 'player_gated' }
        ]
      };
      s._ffCanonDivergedAt = 3; s._ffWorldClock = 9; s._ffDivergeClock = 4;
      s._ffResolvedWorldBeats = { 2: true }; s._ffWorldEvents = []; s._ffPendingIntersects = [];
      s._ffIntersectThisScene = null; s._ffNewsThisScene = null; s._ffLastPressureScene = null; s._ffEmergentBeats = []; s._ffPlayerFledFar = false;
      s.ffStoryMemory = [];
    }
    const R = {};

    // ── PART 1: CAPTURE — feed prose establishing durable facts, then read what got recorded ──
    setup();
    const scenePose = "Logan drove the last raiders back into the dark, then knelt and rammed his heavy iron sword deep into the cave's stone floor, leaving it buried there as a marker — a promise he'd return for it. He turned to the ragged survivors who'd chosen to follow him. 'Train,' he told them, low and flat. 'Every day. Weapons, running, holding a line. Until I come back for you.' His new vibranium bones — lighter than the old adamantium Reed had drawn out — carried him easily as he walked out into the ash.";
    try { await window._famousFateContractCheck(scenePose); } catch (e) { R.capture_err = e.message; }
    const mem = Array.isArray(s.ffStoryMemory) ? s.ffStoryMemory : [];
    R.captured = mem.map(m => ({ kind: (m && m.kind) || '?', subject: (m && m.subject) || '', change: String((m && m.change) || m).slice(0, 90) }));
    const hasKind = (rx) => mem.some(m => rx.test(String((m && m.change) || m) + ' ' + String((m && m.kind) || '')));
    R.captured_object = mem.some(m => (m.kind === 'object') || /sword|cave|buried/i.test(String((m && m.change) || '')));
    R.captured_order = mem.some(m => (m.kind === 'order') || /train|until.*return|follow/i.test(String((m && m.change) || '')));
    R.captured_state = mem.some(m => (m.kind === 'state') || /vibranium/i.test(String((m && m.change) || '')));

    // ── PART 2: RENDER — established facts + diverged + vulnerable → fire pressure + world clock → gen ──
    setup();
    s.ffStoryMemory = [
      { subject: "Logan's skeleton", kind: 'state', change: 'is now VIBRANIUM (Reed transmuted it from adamantium) — lighter, and it no longer poisons him' },
      { subject: 'Logan\'s iron sword', kind: 'object', change: 'is left buried in the eastern cave as a marker he swore to return for' },
      { subject: "Logan's followers", kind: 'order', change: 'were told to train every day until he returns for them' }
    ];
    s.scenes = [{ text: 'The lab lights hummed. Logan lay strapped to the slab, chest cracked open, the last of the black adamantium drawn out and cool vibranium poured in. He could not move. For the first time in a century, Logan was utterly defenseless — and, for once, hopeful.' }];
    const ACT = 'Logan lies still on the slab as Reed finishes the transmutation, weaponless and unable to move.';
    await window._ffTickAntagonistPressure(ACT, '');
    window._ffTickWorldClock();
    R.dramatic = window._ffPcDramaticState ? window._ffPcDramaticState(s.scenes[0].text + ' ' + ACT) : '?';
    const emergent = (s.ffContract.canonBeatLedger || []).filter(x => x && x._emergent);
    R.emergent_injected = emergent.map(x => ({ type: x._emergentType, ds: x._dramaticState, beat: x.canonBeat }));
    const worldDir = window._buildFamousFateWorldEventDirective() || '';
    const contractDir = window._buildFamousFateContractDirective() || '';
    R.worldDir_has_intersect = /A WORLD EVENT INTERSECTS THIS SCENE/.test(worldDir);
    R.contractDir_has_established = /\[ESTABLISHED\]/.test(contractDir);

    const FRAME = 'You are the prose author for a Famous Fate interactive story — the player embodies Old Man Logan inside the Marvel wasteland, and has diverged from canon. Write ONE vivid scene (3-4 paragraphs) continuing from the player action. HONOR the contract + story-memory + world-event directives below EXACTLY — the [ESTABLISHED] facts are TRUE and must be respected; the world event has its own momentum and lands in this scene. Do not quote the directives.';
    const sys = FRAME + '\n\n' + contractDir + '\n\n' + worldDir;
    const usr = 'PLAYER ACTION: ' + ACT + '\nRECENT SCENE: ' + s.scenes[0].text + '\n\nWrite the next scene.';
    async function grok(system, user) {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.8, max_tokens: 1100 }) });
      if (!r.ok) return 'ERR HTTP ' + r.status;
      const d = await r.json();
      return String((d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '').trim();
    }
    R.prose = await grok(sys, usr);
    const pl = String(R.prose).toLowerCase();
    R.prose_plays_strike = /doom|doombot|hulk gang|attack|breach|strike|siege|storm(?!\bsue)|assault|through the (door|wall)|alarm/i.test(R.prose);
    R.prose_honors_vibranium = /vibranium/i.test(R.prose);
    R.prose_honors_sword_or_order = /sword|cave|buried|follower|train|return for/i.test(R.prose);
    return R;
  });

  console.log('=== PART 1 — CAPTURE (does it record durable facts with kind?) ===');
  console.log('  captured object (sword/cave):', res.captured_object);
  console.log('  captured order  (train/return):', res.captured_order);
  console.log('  captured state  (vibranium)   :', res.captured_state);
  (res.captured || []).forEach(c => console.log('    · [' + c.kind + '] ' + (c.subject ? c.subject + ': ' : '') + c.change));
  console.log('=== PART 2 — RENDER ===');
  console.log('  pc dramatic state           :', res.dramatic);
  console.log('  emergent event injected     :', JSON.stringify(res.emergent_injected));
  console.log('  world directive INTERSECT   :', res.worldDir_has_intersect);
  console.log('  contract directive [ESTABLISHED]:', res.contractDir_has_established);
  console.log('  prose PLAYS the strike      :', res.prose_plays_strike);
  console.log('  prose honors VIBRANIUM      :', res.prose_honors_vibranium);
  console.log('  prose honors sword/order    :', res.prose_honors_sword_or_order);
  fs.writeFileSync(path.join(OUT, 'scene.txt'), String(res.prose || ''));
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 2));
  console.log('  scene saved →', path.join(OUT, 'scene.txt'));
  await b.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
