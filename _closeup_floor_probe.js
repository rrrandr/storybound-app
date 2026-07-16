// $0 probe: does _validateAndNormalizeCGPlan promote closeups on a 25-beat
// LI-absent Kwisheen-style plan? Isolates the floor from the render/timing.
// No paid endpoints touched — pure plan normalization.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._validateAndNormalizeCGPlan === 'function', { timeout: 40000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    s._playerSpecies = 'human'; s._liSpecies = 'kwisheen';
    // Synthetic 25-beat LI-absent plan mirroring the Kwisheen Scene 1 (all narrator/PC beats).
    const beats = [];
    for (let i = 0; i < 25; i++) beats.push({ idx: i, kind: 'narration', speaker: i % 3 === 0 ? 'protagonist' : 'narrator', text: 'beat ' + i, cut_to_closeup: false, expression_target: 'neutral' });
    // 3 phases → ~5-image budget leaves room for up to 2 cut-ins.
    const phases = [
      { phaseIdx: 0, startBeat: 0, label: 'Discovery', characters_present: ['protagonist', 'Thal'], li_visibility_phase: 'absent' },
      { phaseIdx: 1, startBeat: 9, label: 'Thal enters', characters_present: ['protagonist', 'Thal'], li_visibility_phase: 'absent' },
      { phaseIdx: 2, startBeat: 18, label: 'Pressure', characters_present: ['protagonist', 'Thal'], li_visibility_phase: 'absent' }
    ];
    const plan = {
      beats, phases,
      visualState: { background: 'a tidal chamber, Gloamwater Bay', lighting: 'low_cool', li_visibility: 'absent', _phaseLIAbsent: true, props_present: ['hidden scroll', 'water-breathing talisman'], pc_wardrobe: 'linen tunic' },
      sceneCharge: { stake: 'a hidden scroll that proves the secret correspondence' },
      microDecision: { prompt: 'Name the lie?', options: [{ text: 'say it', signal: 'direct+' }, { text: 'let it show', signal: 'subtle+' }], afterBeat: 20 },
      phaseForBeat: function (bi) { let p = phases[0]; for (const ph of phases) if (bi >= ph.startBeat) p = ph; return p; }
    };
    const cutsBefore = beats.filter(b => b.cut_to_closeup).length;
    let normalized, threw = null;
    try { normalized = window._validateAndNormalizeCGPlan(plan, 0); } catch (e) { threw = e.message; }
    const np = normalized || plan;
    const cutBeats = (np.beats || []).filter(b => b.cut_to_closeup);
    return {
      threw,
      beatCount: (np.beats || []).length,
      cutsBefore,
      cutsAfter: cutBeats.length,
      cutIdxs: cutBeats.map(b => b.idx),
      allHaveIdx: cutBeats.every(b => typeof b.idx === 'number'),
      sample: cutBeats.slice(0, 4).map(b => ({ idx: b.idx, target: b.closeup_target, shot: b.shot_type, expr: b.expression_target }))
    };
  });

  await browser.close();
  console.log('\n  CLOSEUP FLOOR PROBE ($0)\n  ' + '─'.repeat(56));
  console.log('  threw: ' + (R.threw || 'none'));
  console.log('  beats: ' + R.beatCount + ' | cut_to_closeup before: ' + R.cutsBefore + ' → after validation: ' + R.cutsAfter);
  console.log('  promoted beat idxs: [' + R.cutIdxs.join(',') + ']');
  console.log('  all promoted beats carry numeric .idx (render key): ' + R.allHaveIdx);
  R.sample.forEach(b => console.log('    idx=' + b.idx + ' target=' + b.target + ' shot=' + b.shot + ' expr=' + b.expr));
  const ok = !R.threw && R.cutsAfter >= 1 && R.cutsAfter <= 2 && R.allHaveIdx;
  console.log('  ' + '─'.repeat(56) + '\n  VERDICT: ' + (ok ? 'FLOOR WORKS — closeups are queued; 0-rendered is a render/timing issue' : 'FLOOR BROKEN — closeups never promoted') + '\n');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
