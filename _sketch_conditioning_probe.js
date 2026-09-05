// SKETCH-CONDITIONING STRESS TESTS 2 & 3 — measure how much STRUCTURE survives colorize across
// the two regimes that have historically broken Storybound: CHARACTER-HEAVY (crowd/occlusion/
// multi-species) and TRANSFORMATION-HEAVY (wish burst / sacrifice stain / portal / body transform).
// Pipeline under test: line art (Gemini flash) → REAL _styleTransferRevealPanel (i2i, structure-locked)
// → colorized final. Verify BOTH against the SAME canon; delta = structural entropy from colorization.
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/80c638ef-dc45-46dc-ad83-43ad5d0e1a40/scratchpad';

const SCENES = [
  {
    id: 'test2_crowd',
    playerSpecies: 'Human', liSpecies: 'Kwisheen', expectedPeople: 5,
    wishAnchor: '',
    scene: 'A crowded underwater standoff in a drowned plaza, FIVE figures at different depths with OVERLAPPING silhouettes. ' +
      'FOREGROUND-LEFT: a HUMAN woman (plain human skin, TWO HUMAN LEGS, no scales) in a smooth manta-hide cloak, gripping a BONE SPEAR. ' +
      'MIDGROUND-CENTER: a KWISHEEN warrior (lower body a mantle of octopus TENTACLES, NO legs; two arms; tentacle-dreadlock mane; scaled skin) wielding a TRIDENT. ' +
      'MIDGROUND-RIGHT: a second KWISHEEN (tentacle mantle, no legs) casting a weighted NET. ' +
      'BACKGROUND: TWO human guards in scaled armor, each holding a spear, partly occluded by the others. ' +
      'Murky depth, drifting silt, god-rays, bodies overlapping front-to-back.',
    canon: [
      { name: 'the human woman', species: 'human', body_plan: 'ordinary human — two human legs, two arms, NO scales, NO tentacles', gender: 'female', weapon: 'spear', armor: 'manta-hide cloak' },
      { name: 'the Kwisheen warrior', species: 'kwisheen', body_plan: 'humanoid torso + tentacle-mantle lower body (no legs) + two arms', gender: 'androgynous', weapon: 'trident', armor: 'scaled armor' },
      { name: 'the net Kwisheen', species: 'kwisheen', body_plan: 'humanoid torso + tentacle-mantle lower body (no legs) + two arms', gender: 'androgynous', weapon: 'net', armor: 'wraps' },
      { name: 'a human guard', species: 'human', body_plan: 'ordinary human — two legs, no scales', gender: 'male', weapon: 'spear', armor: 'scaled armor' }
    ],
    measure: 'character count / identity / occlusion / camera / composition'
  },
  {
    id: 'test3_transform',
    playerSpecies: 'Human', liSpecies: 'Kwisheen', expectedPeople: 1,
    wishAnchor: "the woman's outstretched RIGHT hand",
    scene: 'A SINGLE human woman at the threshold of a blazing open PORTAL, caught mid-TRANSFORMATION and half-lit by the portal glow (partial visibility, strong LOW dramatic perspective with foreshortening). ' +
      'Her UPPER body is still human; her LOWER body is UNFURLING into KWISHEEN tentacles (legs dissolving into a tentacle mantle). ' +
      'A twisted RED WISH-BURST of jagged light radiates from her outstretched RIGHT hand. ' +
      'Her LEFT arm ends early at a fresh SACRIFICE STAIN — a dark shadow-stump where a hand was given up. ' +
      'Steam, embers, portal light, dramatic upward camera angle.',
    canon: [
      { name: 'the transforming woman', species: 'human-becoming-kwisheen', body_plan: 'human upper body; lower body mid-transformation from legs into a tentacle mantle', gender: 'female', weapon: '', armor: 'torn tunic', injuries: 'LEFT hand sacrificed — a dark shadow-stump at the left wrist' }
    ],
    measure: 'anchor / burst position / sacrifice position / body topology / framing'
  }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => { const t = m.text(); if (/\[VERIFY\]|coloriz|structure|drift/i.test(t)) console.error('  >', t.slice(0, 170)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._styleTransferRevealPanel === 'function' && typeof window._verifyPanelAnatomy === 'function', { timeout: 40000 });

  for (const SC of SCENES) {
    const res = await page.evaluate(async (SC) => {
      const s = window.state;
      s._playerSpecies = SC.playerSpecies; s._liSpecies = SC.liSpecies;
      s.gnArtist = s.gnArtist || 'ender_bond'; window._devBypass = true;
      const linePrompt = 'STRUCTURAL LINE ART ONLY. Black and white. No color, no shading, no rendering. ' +
        'Clean ink outlines showing EXACT anatomy, proportions, composition, camera framing, figure count, species topology, and who holds what. ' +
        'Accuracy of structure is the ONLY priority. SCENE: ' + SC.scene;
      let lineArtUrl = null, lineErr = null;
      try {
        const r = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: linePrompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview', size: '1024x1024', aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1 }) });
        if (r.ok) { const d = await r.json(); let u = d.image || d.url; if (u) lineArtUrl = u.startsWith('data:') ? u : 'data:image/png;base64,' + u; } else lineErr = 'HTTP ' + r.status;
      } catch (e) { lineErr = e.message; }
      if (!lineArtUrl) return { fail: 'no line art', lineErr };
      let finalUrl = null, colErr = null;
      try { finalUrl = await window._styleTransferRevealPanel(lineArtUrl, s.gnArtist, SC.measure); } catch (e) { colErr = e.message; }
      async function verify(url) {
        if (!url) return { skipped: 'no image' };
        try { const v = await window._verifyPanelAnatomy(url, '', false, { expectedPeople: SC.expectedPeople, canon: SC.canon, authorized: [], wishAnchor: SC.wishAnchor });
          return { pass: v.pass, skipped: v.skipped || false, confidence: v.confidence, person_count: v.person_count, has_human_legs: v.has_human_legs, tentacle_count: v.tentacle_count, defect_type: v.defect_type, priority: v.priority, p1_count: v.p1_count, violations: v.violations || [] };
        } catch (e) { return { error: e.message }; }
      }
      return { lineErr, colErr, lineArtUrl, finalUrl, hasFinal: !!finalUrl, sketchV: await verify(lineArtUrl), finalV: await verify(finalUrl) };
    }, SC);

    if (res.fail) { console.log('\n[' + SC.id + '] FAILED:', res.fail, res.lineErr || ''); continue; }
    try { if (res.lineArtUrl) fs.writeFileSync(path.join(OUT, 'cond_' + SC.id + '_sketch.png'), Buffer.from(res.lineArtUrl.split(',')[1], 'base64')); } catch (_) {}
    try { if (res.finalUrl) fs.writeFileSync(path.join(OUT, 'cond_' + SC.id + '_final.png'), Buffer.from(res.finalUrl.split(',')[1], 'base64')); } catch (_) {}
    const V = v => !v ? '(none)' : (v.skipped ? 'SKIPPED(' + v.skipped + ')' : (v.error ? 'ERR ' + v.error :
      (v.pass ? 'PASS' : 'FAIL') + ' [conf ' + v.confidence + '] people=' + v.person_count + ' legs=' + v.has_human_legs + ' tentacles=' + v.tentacle_count +
      ' defect=' + (v.defect_type || 'none') + (v.priority ? '/P' + v.priority : '') + ' p1=' + v.p1_count +
      '\n        violations:' + (v.violations.length ? v.violations.map(x => '\n          • ' + x).join('') : ' none')));
    console.log('\n  ══ ' + SC.id + ' ══  (measure: ' + SC.measure + ')');
    console.log('  line-art: ' + (res.lineArtUrl ? 'OK' : 'FAIL') + ' | colorize: ' + (res.hasFinal ? 'OK' : 'FAIL ' + (res.colErr || 'null')));
    console.log('  SKETCH: ' + V(res.sketchV));
    console.log('  FINAL:  ' + V(res.finalV));
    console.log('  saved: cond_' + SC.id + '_{sketch,final}.png');
  }
  console.log('\n  → INFO LOSS = defects in FINAL not in SKETCH. Both PNGs saved for visual invariant scoring.\n');
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
