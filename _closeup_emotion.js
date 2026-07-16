// $0 verification that cut-ins are now VARIED, BUDGETED emotional inserts:
//  A) the floor emits ≤2 cut-ins (≈5-image budget) of DISTINCT modalities — a
//     strong reacting FACE + a meaningful ARTIFACT / a different party — never
//     N identical PC faces, each carrying a real emotion.
//  B) an author-emitted PC gesture is still coerced to a face (kills the glass).
//  C) the PC face render is a TIGHT face (no standing body); the LI 'mouth' shot
//     is nose+mouth/jaw with NO eyes.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._validateAndNormalizeCGPlan === 'function' && typeof window._renderCutCloseup === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const s = window.state;
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s.kwisheenAppearance = { sylas: { skin: 'royal violet', pattern: 'x', iris: 'y' } };

    function mkPlan(withAuthorGesture) {
      const beats = [];
      for (let i = 0; i < 25; i++) {
        let kind = 'narration', speaker = null, expr = 'neutral';
        if (i === 16) { kind = 'dialogue'; speaker = 'Sylas'; expr = 'jaw_clench'; }   // strongest emotion
        if (i === 11) { kind = 'dialogue'; speaker = 'protagonist'; expr = 'lips_pressed'; }
        const beat = { idx: i, kind, speaker, text: kind === 'dialogue' ? '"a line"' : 'beat ' + i, cut_to_closeup: false, expression_target: expr, tension_state: '' };
        if (withAuthorGesture && i === 3) { beat.cut_to_closeup = true; beat.shot_type = 'gesture'; beat.closeup_target = 'protagonist'; beat.expression_target = 'neutral'; }
        beats.push(beat);
      }
      return {
        beats,
        phases: [
          { phaseIdx: 0, startBeat: 0, characters_present: ['protagonist', 'Sylas'], li_visibility_phase: 'absent' },
          { phaseIdx: 1, startBeat: 12, characters_present: ['protagonist', 'Sylas'], li_visibility_phase: 'absent' }
        ],
        visualState: { background: 'a tidal chamber', lighting: 'cool', li_visibility: 'absent', _phaseLIAbsent: true, pc_wardrobe: 'linen shift', props_present: ['a hidden scroll'], other_characters_present: [{ name: 'Sylas', species: 'kwisheen' }] },
        sceneCharge: { stake: 'a hidden scroll' }, decisionGateBeatIdx: 24,
        phaseForBeat: function (bi) { return bi >= 12 ? this.phases[1] : this.phases[0]; }
      };
    }

    // A — floor variety + budget (no author cut-ins → full budget of 2).
    const npA = window._validateAndNormalizeCGPlan(mkPlan(false), 0) || {};
    const cutsA = (npA.beats || []).filter(b => b.cut_to_closeup);
    const nonObj = cutsA.filter(b => b.shot_type !== 'object');
    const pcFaces = cutsA.filter(b => b.shot_type === 'face' && String(b.closeup_target).toLowerCase() === 'protagonist');
    const floor = {
      count: cutsA.length,
      withinBudget: cutsA.length <= 2,
      varied: new Set(cutsA.map(b => b.shot_type)).size >= 2 || new Set(cutsA.map(b => String(b.closeup_target).toLowerCase())).size === cutsA.length,
      hasObject: cutsA.some(b => b.shot_type === 'object'),
      noDupPCFace: pcFaces.length <= 1,
      faceHasEmotion: nonObj.every(b => b.expression_target && b.expression_target !== 'neutral'),
      sample: cutsA.map(b => ({ idx: b.idx, shot: b.shot_type, target: b.closeup_target, expr: b.expression_target }))
    };

    // B — author gesture coercion (separate plan).
    const npB = window._validateAndNormalizeCGPlan(mkPlan(true), 0) || {};
    const b3 = (npB.beats || []).find(b => b.idx === 3) || {};
    const authorGestureCoerced = b3.shot_type === 'face' && b3.expression_target && b3.expression_target !== 'neutral';

    // C — render prompts.
    s._stagedCloseupCache = {};
    const ctx = { background: 'a tidal chamber', pcWardrobe: 'linen shift', pcSpecies: 'Human' };
    window._lastCloseupPrompt = ''; await window._renderCutCloseup('jaw_clench', 'cool', 'protagonist', 'face', ctx).catch(() => {}); const pcFace = window._lastCloseupPrompt || '';
    window._lastCloseupPrompt = ''; await window._renderCutCloseup('jaw_clench', 'cool', 'li', 'mouth', ctx).catch(() => {}); const liMouth = window._lastCloseupPrompt || '';

    return { floor, authorGestureCoerced, pcFace, liMouth };
  });

  await browser.close();
  const f = R.floor;
  const checks = [
    ['floor stays within the ~5-image budget (≤2 cut-ins)', f.withinBudget && f.count >= 1],
    ['cut-ins are VARIED (distinct modalities, not N identical faces)', f.varied],
    ['a meaningful ARTIFACT cut-in is used (not only faces)', f.hasObject],
    ['no two PC-face cut-ins (variety across subjects)', f.noDupPCFace],
    ['every face/reaction cut-in carries a non-neutral emotion', f.faceHasEmotion],
    ['author-emitted PC gesture coerced to FACE + emotion (kills the glass)', R.authorGestureCoerced],
    ['PC face render is a TIGHT face (no standing body)', /EXTREME TIGHT FACE/.test(R.pcFace) && /NO standing figure/.test(R.pcFace) && /PROTAGONIST\'s FACE/.test(R.pcFace)],
    ['LI mouth render: nose+mouth/jaw with NO eyes', /NOSE, MOUTH, and JAW/.test(R.liMouth) && /NO eyes/.test(R.liMouth)]
  ];
  let pass = 0, fail = 0;
  console.log('\n  CUT-IN VARIETY + EMOTION + BUDGET  ($0)\n  ' + '─'.repeat(58));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · floor cut-ins: ' + JSON.stringify(f.sample));
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
