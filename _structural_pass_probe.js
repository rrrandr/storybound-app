// STRUCTURAL PASS (#3) orchestration validation — drives the REAL _structuralPassRender end to end:
// line-art → structural verify → regen-loop(feedback) → colorize(conditioned) → recolorize-recheck.
// Confirms it returns a colorized final, the no-text contract holds, and structure survives. A few
// cheap image/verify calls (line-art + colorize + verifies).
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/80c638ef-dc45-46dc-ad83-43ad5d0e1a40/scratchpad';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => { const t = m.text(); if (/STRUCTURAL-PASS|REGEN-LOOP|\[VERIFY\]/i.test(t)) console.error('  >', t.slice(0, 180)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._structuralPassRender === 'function', { timeout: 40000 });

  const res = await page.evaluate(async () => {
    const s = window.state; s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen'; s.gnArtist = s.gnArtist || 'ender_bond'; window._devBypass = true;
    const scene = 'A HUMAN woman (plain human skin, two human legs, no scales) in a linen tunic grips a BONE SPEAR in her right hand, her left hand thrown up with a radiating WISH-BURST; facing her a KWISHEEN (tentacle-mantle lower body, no legs, two arms, tentacle-dreadlock mane, scaled skin) lunges. A glowing PORTAL between them. Underwater ruins, bubbles.';
    const canon = [
      { name: 'the human woman', species: 'human', body_plan: 'ordinary human — two human legs, two arms, NO scales, NO tentacles', gender: 'female', skin: 'warm tan', weapon: 'spear', armor: 'linen tunic' },
      { name: 'the Kwisheen', species: 'kwisheen', body_plan: 'humanoid torso + tentacle-mantle lower body (no legs) + two arms', gender: 'androgynous', skin: 'ember red-orange', pattern: 'reticulated scale', eyes: 'amber', weapon: '', armor: 'scaled wraps' }
    ];
    const r = await window._structuralPassRender(scene, {
      artist: s.gnArtist,
      verifyOpts: { expectedPeople: 2, canon, authorized: [], wishAnchor: "the woman's raised left hand", camera: '', phaseIdx: 0 }
    });
    return r ? { hasFinal: !!r.finalUrl, hasSketch: !!r.sketchUrl, structResolved: r.structResolved, colorizeFailed: !!r.colorizeFailed, sketchUrl: r.sketchUrl, finalUrl: r.finalUrl } : { nullReturn: true };
  });

  console.log('\n  STRUCTURAL PASS (#3) — orchestration validation');
  console.log('  ' + '─'.repeat(60));
  if (res.nullReturn) { console.log('  RETURNED NULL (would fall back to one-shot render) — check logs above'); await browser.close(); return; }
  console.log('  produced final: ' + res.hasFinal + ' | sketch: ' + res.hasSketch + ' | structure resolved: ' + res.structResolved + ' | colorizeFailed: ' + res.colorizeFailed);
  try { if (res.sketchUrl) fs.writeFileSync(path.join(OUT, 'sp_sketch.png'), Buffer.from(res.sketchUrl.split(',')[1], 'base64')); } catch (_) {}
  try { if (res.finalUrl) fs.writeFileSync(path.join(OUT, 'sp_final.png'), Buffer.from(res.finalUrl.split(',')[1], 'base64')); } catch (_) {}
  console.log('  saved: sp_sketch.png + sp_final.png → ' + OUT + '  (visual check: structure preserved + NO text labels)');
  console.log('  ' + '─'.repeat(60) + '\n');
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
