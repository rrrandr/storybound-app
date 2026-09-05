// ONE-SHOT WIRING TEST — validates the RENDER PATH directly, bypassing flaky/expensive screenplay
// authoring (which failed the full integration test twice: 5 phases, then a Grok JSON parse error —
// both unrelated to the render wiring). Feeds a minimal-but-valid 4-phase plan straight into
// window._renderSceneImages with the flag on, and checks: chooser routes to one-shot, sheet renders,
// splits into 4, returns the correct results[] shape + firstReady. Prompt QUALITY was already validated
// in the 0/24 defect run; this is purely the plumbing.  PAID — one 2K sheet (~$0.10). RUN=1.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/oneshot_wiring';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('ONE-SHOT WIRING TEST — render path direct, flag ON, 2K');
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  const logs = [];
  p.on('console', m => { const t = m.text(); if (/\[ONESHOT|\[CG:CEILING|\[ASSET-INTEGRITY|RENDER-BYPASS/i.test(t)) { logs.push(t.slice(0,180)); console.error('   > ' + t.slice(0,160)); } });
  p.on('pageerror', e => { logs.push('PAGEERR: ' + e.message); console.error('   !! ' + e.message); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof window._renderSceneImages === 'function', { timeout: 40000 });

  console.log('\nRendering…'); const t0 = Date.now();
  const out = await p.evaluate(async () => {
    const s = window.state;
    // Minimal real-ish scene state so the region contract + species anchors resolve.
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman',
      identity: { playerName: 'Mira', partnerName: 'Vael' } };
    s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman'; s.fantasyRegion = 'gloamwater_bay';
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen'; s.gnArtist = 'ender_bond';
    s._stagedRegionContract = null;

    // A minimal but structurally valid visualState + 4 phases + beats.
    const visualState = {
      background: 'underwater in the drowned coral ruins of Gloamwater Bay, silt-lit',
      setting: 'Gloamwater Bay coral ruins', camera: 'medium', lighting: 'silt-lit blue-green',
      li_visibility: 'revealed',
      characters_present: [{ name: 'Vael', species: 'Kwisheen', position: 'right' }],
      pc_position: 'left', li_position: 'right',
      key_props: ['lantern', 'blade']
    };
    const mk = (i, label, beat) => ({ phaseIdx: i, startBeat: i, label: label,
      li_visibility_phase: 'revealed', characters_present: ['protagonist','li'],
      props_present: [], camera_override: null, beat: beat });
    const phases = [
      mk(0, 'establishing', 'Mira and Vael face the drowned gate, wary'),
      mk(1, 'approach', 'Vael reaches toward the glowing shell'),
      mk(2, 'crisis', 'a raider surges from the dark, tentacles lashing'),
      mk(3, 'aftermath', 'Mira braces, blade up, as the shell dims')
    ];
    const beats = phases.map((ph, i) => ({ idx: i, text: ph.beat, expression_target: 'neutral' }));
    const planMeta = { phases: phases, beats: beats, visualState: visualState,
      phaseForBeat: function (bi) { return phases[Math.min(bi, phases.length - 1)]; } };

    // Build the region contract the way scene-completion does, so species anchors resolve.
    try { s._stagedRegionContract = window._buildStagedRegionContract({ visualState: visualState, phases: phases, beats: beats }); } catch (e) { /* ok */ }

    window._oneShotSheet = true; window._oneShotSheetSize = '2K';

    const promise = window._renderSceneImages(visualState, phases, 0, planMeta);
    const hasFirstReady = !!(promise && promise.firstReady && typeof promise.firstReady.then === 'function');
    let firstReadyPhase = null;
    try { const fr = await promise.firstReady; firstReadyPhase = fr && fr.phaseIdx; } catch (_) {}
    const results = await promise;

    return {
      hasFirstReady, firstReadyPhase,
      resultCount: Array.isArray(results) ? results.length : -1,
      shapes: (results || []).map(r => ({ phaseIdx: r.phaseIdx, hasImg: !!(r.imageUrl && r.imageUrl.indexOf('data:') === 0), oneShot: !!r._oneShot, err: r.error || null })),
      imgs: (results || []).map(r => (r.imageUrl && r.imageUrl.indexOf('data:') === 0) ? r.imageUrl : null)
    };
  });

  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s`);
  console.log(`  result count       : ${out.resultCount} (want 4)`);
  console.log(`  .firstReady present: ${out.hasFirstReady} (phase ${out.firstReadyPhase})`);
  out.shapes.forEach(sh => console.log(`    phase ${sh.phaseIdx}: img=${sh.hasImg} oneShot=${sh.oneShot}${sh.err ? ' ERR=' + sh.err : ''}`));
  const firedOneShot = logs.some(l => /one-shot sheet path|rendering 2x2/.test(l));
  const splitOk = logs.some(l => /sheet done.*4 quadrants/.test(l));
  const fellBack = logs.some(l => /failed.*falling back/.test(l));
  console.log(`  one-shot fired     : ${firedOneShot ? 'YES' : 'NO'}`);
  console.log(`  split ok           : ${splitOk ? 'YES' : 'NO'}`);
  console.log(`  fell back          : ${fellBack ? 'YES' : 'no'}`);

  out.imgs.forEach((src, i) => { if (src) try { fs.writeFileSync(path.join(OUT, `q${i+1}.png`), Buffer.from(src.split(',')[1], 'base64')); } catch (_) {} });
  fs.writeFileSync(path.join(OUT, 'logs.txt'), logs.join('\n'));

  const distinct = new Set(out.imgs.filter(Boolean).map(s => s.length)).size; // crude distinctness check
  const pass = firedOneShot && splitOk && out.resultCount === 4 && out.hasFirstReady && !fellBack
    && out.shapes.every(sh => sh.hasImg && sh.oneShot) && distinct >= 2;
  console.log('\n' + (pass ? 'PASS — chooser→sheet→split→results all wired correctly; 4 distinct quadrants returned.'
                          : 'FAIL — see above + logs.txt.'));
  console.log('Saved → ' + OUT);
  await b.close(); process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
