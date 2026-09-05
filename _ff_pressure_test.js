// Validate the off-canon antagonist-pressure engine. Sets up a DIVERGED Old-Man-Logan FF state and checks:
//   (free, no LLM — these short-circuit before the generator) gating: skips when not diverged / canon beat
//   already due / cadence gap not met / an emergent beat still pending.
//   (1 cheap gpt-4o-mini call) when the world is QUIET it injects an emergent beat, and _ffTickWorldClock
//   surfaces it so _buildFamousFateWorldEventDirective shows an INTERSECT. Plus one direct generator call to
//   eyeball the "Doom smells blood at the vibranium surgery" beat quality.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/ff_pressure';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('console', m => { const t = m.text(); if (/\[FF-PRESSURE\]|\[FF-WORLD/i.test(t)) console.error('  >', t.slice(0, 150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._ffTickAntagonistPressure === 'function' && typeof window._ffTickWorldClock === 'function' && typeof window._ffGenerateEmergentPressureBeat === 'function', { timeout: 40000 });

  const res = await p.evaluate(async () => {
    const s = window.state;
    function setup() {
      s.fateMode = 'famous_fate';
      s.famousFate = { period: 'canon', source: 'Old Man Logan (Marvel)', embodied: 'Logan' };
      s.protagonistName = 'Logan';
      s.aPlot = { goal: 'survive the wasteland and protect what family he has left' };
      s.ffLocationState = { currentRegion: "Reed Richards' hidden lab", currentPlace: "Reed Richards' hidden lab", travelState: 'local' };
      s.ffStoryMemory = ['Logan rescued Reed & Sue and their children', "Logan's adamantium skeleton was transmuted to vibranium by Reed and the reforged Mjolnir"];
      s.scenes = [{ text: 'The lab lights hummed. Logan lay strapped to the slab, chest cracked open, the last of the black adamantium being drawn out and the cool vibranium poured in. He could not move. Reed worked fast; Sue held the field steady. For the first time in a century, Logan was utterly defenseless — and, for once, hopeful.' }];
      s.ffContract = {
        canonBeatLedger: [
          { beatIndex: 1, canonBeat: 'Logan wakes in the wasteland', momentum: 'player_gated' },
          { beatIndex: 2, canonBeat: 'Logan takes the cross-country job', momentum: 'world_parallel' },
          { beatIndex: 3, canonBeat: 'Logan reaches the coast', momentum: 'player_gated' },
          { beatIndex: 4, canonBeat: 'The Hulk Gang collects rent at the farm', momentum: 'world_parallel', urgency: 'high', triggerWindow: { kind: 'immediate' }, setting: 'the farm', outcomeIfAbsent: 'the Hulk Gang murders the family over the rent', canIntersectPlayer: true }
        ],
        castList: [
          { name: 'Victor Von Doom', role: 'villain', importance: 'major' },
          { name: 'The Hulk Gang', role: 'enemy faction', importance: 'major' },
          { name: 'Mysterio', role: 'villain', importance: 'supporting' },
          { name: 'Sue Storm', role: 'ally', importance: 'major' }
        ],
        world: { name: 'Old Man Logan', worldArcs: [ { arc: 'the Baddies carve up America into villain kingdoms', who: 'Doom, Hulk Gang, Kingpin', kind: 'reckoning' }, { arc: 'a hunt for the last free heroes', who: 'Doom', kind: 'hunt' } ] },
        forbiddenPresence: [ { name: 'Charles Xavier', status: 'deceased' }, { name: 'Jean Grey', status: 'deceased' } ],
        character: {}
      };
      s._ffCanonDivergedAt = 3;
      s._ffWorldClock = 8;
      s._ffDivergeClock = 4;
      s._ffResolvedWorldBeats = {};
      s._ffWorldEvents = []; s._ffPendingIntersects = []; s._ffIntersectThisScene = null; s._ffNewsThisScene = null;
      s._ffLastPressureScene = null; s._ffEmergentBeats = [];
      s._ffPlayerFledFar = false;
    }
    const led = () => s.ffContract.canonBeatLedger.length;
    const ACT = 'Logan lies still on the slab as Reed finishes the transmutation.', DIA = '';
    const R = {};

    // NEG 1: not diverged → skip (no LLM, no append)
    setup(); s._ffCanonDivergedAt = null; let n0 = led(); await window._ffTickAntagonistPressure(ACT, DIA); R.skip_not_diverged = (led() === n0);

    // NEG 2: a canon world_parallel beat is due (beat 4 unresolved, immediate) → skip
    setup(); let n1 = led(); await window._ffTickAntagonistPressure(ACT, DIA); R.skip_canon_beat_due = (led() === n1);

    // NEG 3: cadence gap not met (last pressure this same clock) → skip
    setup(); s._ffResolvedWorldBeats[4] = true; s._ffLastPressureScene = s._ffWorldClock; let n2 = led();
    await window._ffTickAntagonistPressure(ACT, DIA); R.skip_gap_not_met = (led() === n2);

    // POS: quiet world (beat 4 resolved), gap met → inject (1 LLM call)
    setup(); s._ffResolvedWorldBeats[4] = true; s._ffLastPressureScene = null; let n3 = led();
    await window._ffTickAntagonistPressure(ACT, DIA);
    R.injected = (led() === n3 + 1);
    const inj = s.ffContract.canonBeatLedger[s.ffContract.canonBeatLedger.length - 1];
    R.injected_beat = inj && inj._emergent ? { canonBeat: inj.canonBeat, chars: inj.presentCharacters, urgency: inj.urgency, momentum: inj.momentum, beatIndex: inj.beatIndex } : null;

    // NEG 4: now an emergent beat is pending (unresolved) → skip a second injection
    let n4 = led(); await window._ffTickAntagonistPressure(ACT, DIA); R.skip_pending = (led() === n4);

    // SURFACING: tick the world clock → the emergent beat should intersect → directive shows it
    window._ffTickWorldClock();
    const dir = window._buildFamousFateWorldEventDirective ? window._buildFamousFateWorldEventDirective() : '';
    R.intersected = /A WORLD EVENT INTERSECTS THIS SCENE/.test(dir);
    R.directive_snippet = String(dir).replace(/\s+/g, ' ').slice(0, 500);

    // DEAD-VILLAIN GUARD: ensure the injected beat didn't resurrect a forbiddenPresence figure
    const deadNames = ['charles xavier', 'jean grey'];
    R.avoided_dead = R.injected_beat ? !deadNames.some(d => (String(R.injected_beat.canonBeat) + ' ' + (R.injected_beat.chars || []).join(' ')).toLowerCase().includes(d)) : null;

    // STATE-CONDITIONED MIX: sample the generator under 3 dramatic states → the type distribution should shift.
    async function sampleState(prose, act, n) {
      setup(); s.scenes = [{ text: prose }]; s._ffEmergentBeats = [];
      const detected = window._ffPcDramaticState ? window._ffPcDramaticState(prose + ' ' + act) : '?';
      const rows = [];
      for (let i = 0; i < n; i++) {
        const bx = await window._ffGenerateEmergentPressureBeat(act, '');
        if (bx) { rows.push({ type: bx._emergentType, ds: bx._dramaticState, beat: String(bx.canonBeat).slice(0, 120) }); s._ffEmergentBeats.push(String(bx.canonBeat).slice(0, 110)); }
      }
      return { detected, rows };
    }
    R.vulnerable = await sampleState(
      'Logan lay strapped to the slab, chest cracked open, the last of the adamantium drawn out and cool vibranium poured in. He could not move. For the first time in a century, Logan was utterly defenseless.',
      'Logan lies still on the slab as Reed finishes the transmutation.', 4);
    R.losing = await sampleState(
      'The Hulk Gang had him surrounded — three of them, huge, and Logan was on his knees in the mud, claws not enough, blood in his eyes, about to be overrun. One more blow and he was finished.',
      'Logan swings wildly, losing ground, nearly beaten.', 4);
    R.stable = await sampleState(
      'The road stretched empty for miles. Logan rode the rusted truck west through the quiet wasteland, the family dozing in the back, nothing but dust and the hum of the engine.',
      'Logan drives the family west, watchful but calm.', 5);
    return R;
  });

  console.log('=== GATING (free — negatives short-circuit before the LLM) ===');
  console.log('  skip when NOT diverged      :', res.skip_not_diverged);
  console.log('  skip when canon beat DUE    :', res.skip_canon_beat_due);
  console.log('  skip when cadence GAP unmet :', res.skip_gap_not_met);
  console.log('  skip when emergent PENDING  :', res.skip_pending);
  console.log('=== INJECTION (1 LLM call) ===');
  console.log('  injected when QUIET+gap-met :', res.injected);
  console.log('  injected beat               :', JSON.stringify(res.injected_beat));
  console.log('  avoided dead (forbidden)    :', res.avoided_dead);
  console.log('=== SURFACING ===');
  console.log('  surfaces as INTERSECT       :', res.intersected);
  console.log('  directive snippet           :', res.directive_snippet);
  ['vulnerable', 'losing', 'stable'].forEach(function (k) {
    var g = res[k]; if (!g) return;
    var counts = {}; (g.rows || []).forEach(function (r) { counts[r.type] = (counts[r.type] || 0) + 1; });
    console.log('=== PC STATE: ' + k + ' (detected="' + g.detected + '") → ' + JSON.stringify(counts) + ' ===');
    (g.rows || []).forEach(function (r) { console.log('   [' + r.type + '] ' + r.beat); });
  });
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 2));
  await b.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
