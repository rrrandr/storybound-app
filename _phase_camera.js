// $0 test: phase camera auto-variety (the dedup fix). A plan whose phases all leave
// camera_override null should come out of the normalizer with DISTINCT cameras, so
// N phases no longer collapse to fewer images via _phaseFingerprint collision.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/orchestrator**', '**/api/grok-image**', '**/api/visualize-flux**', '**/api/verify-anatomy**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._validateAndNormalizeCGPlan === 'function', { timeout: 40000 });

  const R = await page.evaluate(() => {
    const out = [];
    const t = (name, pass, detail) => out.push({ name, pass: !!pass, detail: detail || '' });
    const s = window.state;
    s.gnArtist = 'ender_bond'; s.gender = 'Female'; s.loveInterest = 'Male';
    s.picks = { world: 'Fantasy', identity: { playerName: 'Mira', partnerName: 'Vael' } };
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';

    function mkPlan(cams) {
      return {
        beats: Array.from({ length: 22 }, (_, i) => ({ idx: i, text: 'beat ' + i + ' of the confrontation.', kind: 'narration', speaker: null, tension_state: 'composed', expression_target: 'neutral' })),
        visualState: { camera: 'medium_two_shot', background: 'a tidal grotto, Gloamwater Bay', pc_visibility: 'full', li_position: 'right', li_expression: 'neutral', li_visibility: 'revealed', other_characters_present: [], expression_arc: {} },
        phases: cams.map((c, i) => ({ phaseIdx: i, startBeat: i * 7, characters_present: ['protagonist', 'li'], props_present: [], li_visibility_phase: 'revealed', camera_override: c, li_position_override: null, li_expression_override: null }))
      };
    }
    const distinct = (arr) => new Set(arr).size === arr.length && arr.every(Boolean);

    // Case 1: three phases all null → should become three DISTINCT cameras.
    try {
      const p1 = mkPlan([null, null, null]);
      window._validateAndNormalizeCGPlan(p1, 0);
      const cams = p1.phases.map(x => x.camera_override);
      t('3 null-camera phases → 3 distinct cameras (no dedup)', distinct(cams) && cams.length === 3, cams.join(' → '));
    } catch (e) { t('3 null-camera phases → 3 distinct cameras (no dedup)', false, 'THREW ' + e.message); }

    // Case 2: three phases all the SAME explicit camera → still distinct after normalize.
    try {
      const p2 = mkPlan(['over_shoulder_pc', 'over_shoulder_pc', 'over_shoulder_pc']);
      window._validateAndNormalizeCGPlan(p2, 0);
      const cams = p2.phases.map(x => x.camera_override);
      t('3 same-camera phases → distinct after auto-variety', distinct(cams), cams.join(' → '));
    } catch (e) { t('3 same-camera phases → distinct after auto-variety', false, 'THREW ' + e.message); }

    // Case: microDecision afterBeat set LATE (near the deck) → snapped into the first ~40%.
    try {
      const pM = mkPlan([null, null, null]);
      pM.decisionGateBeatIdx = 21;
      pM.microDecision = { afterBeat: 20, prompt: 'Say it plainly or let it show?', options: [{ text: 'say it plainly', signal: 'direct+' }, { text: 'let it show', signal: 'subtle+' }] };
      window._validateAndNormalizeCGPlan(pM, 0);
      const ab = pM.microDecision && pM.microDecision.afterBeat;
      const cap = Math.floor(pM.beats.length * 0.4);
      t('microDecision afterBeat snapped to first ~40% (axis fires midway, not before deck)', typeof ab === 'number' && ab <= cap && ab < pM.decisionGateBeatIdx - 1, 'afterBeat=' + ab + ' (cap ' + cap + ', gate ' + pM.decisionGateBeatIdx + ')');
    } catch (e) { t('microDecision afterBeat snapped to first ~40%', false, 'THREW ' + e.message); }

    // Case: closeup floor — a 22-beat scene with 0 authored closeups should get ~3 promoted.
    try {
      const pC = mkPlan([null, null, null]);
      window._validateAndNormalizeCGPlan(pC, 0);
      const cu = pC.beats.filter(b => b && b.cut_to_closeup).length;
      t('closeup floor: ~3 cut-ins promoted for a 22-beat scene (was capped at 1)', cu >= 3, 'cut_to_closeup beats = ' + cu);
    } catch (e) { t('closeup floor: ~3 cut-ins promoted', false, 'THREW ' + e.message); }

    // Case 3: author already varied → preserved (no clobber).
    try {
      const p3 = mkPlan(['wide_establishing', 'over_shoulder_pc', 'close_pc']);
      window._validateAndNormalizeCGPlan(p3, 0);
      const cams = p3.phases.map(x => x.camera_override);
      t('already-distinct author cameras preserved', cams[0] === 'wide_establishing' && cams[1] === 'over_shoulder_pc' && cams[2] === 'close_pc', cams.join(' → '));
    } catch (e) { t('already-distinct author cameras preserved', false, 'THREW ' + e.message); }

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  console.log('\n  PHASE CAMERA AUTO-VARIETY  ($0)\n  ' + '─'.repeat(58));
  for (const r of R) { r.pass ? pass++ : fail++; console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : '')); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
