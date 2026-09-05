// A/B: render a REAL assembled Storybound sheet prompt via DashScope (Qwen / Wan) to compare vs BFL/Gemini.
// Builds the same _buildOneShotSheetPrompt a live Veilwood combat sheet would, then sends it to each model.
// Requires server env DASHSCOPE_API_KEY (+ optional DASHSCOPE_IMAGE_URL). Without the key it verifies the
// wiring and reports "not configured". Renders: qwen-image-2.0-pro, qwen-image-2.0, wan2.7-image-pro.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('console', m => { const t = m.text(); if (/DASHSCOPE/i.test(t)) console.error('  >', t.slice(0, 150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window.callDashScopeImage === 'function' && typeof window._buildOneShotSheetPrompt === 'function', { timeout: 40000 });

  const built = await p.evaluate(() => {
    const s = window.state;
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', fantasyRegion: 'the_veilwood', identity: { playerName: 'Kael', partnerName: 'Threxa' }, pov: '3rd' };
    s.world = 'Fantasy'; s.fantasyRegion = 'the_veilwood'; s.protagonistName = 'Kael'; s.loveInterestName = 'Threxa';
    s._playerSpecies = 'First Favored'; s._liSpecies = 'Kwisheen'; s.gnArtist = 'ryo_toro';
    s._stagedRegionContract = { regionLabel: 'the_veilwood', anchorImages: [] };
    const visualState = {
      characters_present: ['protagonist', 'li'],
      other_characters_present: [{ name: 'Orun', species: 'Kwisheen', gender: 'Male' }],
      li_visibility: 'present',
      pc_wardrobe: 'the Veilweave — a sheer hooded translucent leaf-vein garment refracting him into overlapping echoes',
      li_wardrobe: 'coral-and-shell harness, violet tentacles', pc_weapon: null, li_weapon: null,
      background: 'the Veilwood at dusk — pale WHITE mated-pair twisted trees, WHITE weeping veil-leaf canopy, deep-crimson spiralgrass'
    };
    const shot = (d, a) => ({ distance: d, angle: a });
    const ph = (i, l, sh, beat) => ({ phaseIdx: i, label: l, _readerLearning: l, characters_present: ['protagonist', 'li', 'orun'], props_present: [], li_visibility_phase: 'present', _shot: sh, beat: beat });
    const phases = [
      ph(0, 'Orientation', shot('wide establishing shot', 'slightly_low'), 'WIDE: Kael, a First Favored in the sheer Veilweave (refracted into overlapping echoes), turns at bay as two Kwisheen — Threxa and Orun — close in through the white veil-curtains; he raises THE ANSWER, his double-ended hooked polearm.'),
      ph(1, 'Threat', shot('medium shot', 'eye_level'), 'Kael sweeps the polearm to parry Threxa\'s tide-trident as Orun lunges from the other side, tentacles and hafts clashing.'),
      ph(2, 'Decision', shot('close-up', 'dutch_tilt'), 'CLOSE: THE ANSWER locked against Threxa\'s trident, sparks flying; Kael\'s Veilweave echoes smear his position.'),
      ph(3, 'Consequence', shot('wide shot', 'slightly_high'), 'PULL BACK: mated-pair twisted white trunks, white weeping canopy, crimson spiralgrass; Kael stands over a downed Orun as Threxa recoils.')
    ];
    let prompt = '';
    try { prompt = window._buildOneShotSheetPrompt(visualState, phases, 0, { phases, beats: [] }) || ''; } catch (e) { prompt = 'ERR:' + e.message; }
    return { prompt, len: prompt.length };
  });

  console.log('=== full assembled sheet prompt: ' + built.len + ' chars (would TRUNCATE on Qwen/Wan) ===');
  fs.writeFileSync(path.join(OUT, 'prompt_full.txt'), built.prompt);

  // Use the COMPRESSED prompt (~1,100 tokens) — the fair test, since Qwen caps ~1,300 tokens / Wan 5,000 chars.
  const COMPRESSED = fs.readFileSync(path.join(OUT, 'compressed_prompt.txt'), 'utf8');
  const NEG = fs.readFileSync(path.join(OUT, 'compressed_negative.txt'), 'utf8').trim();
  console.log('=== compressed prompt: ' + COMPRESSED.length + ' chars, negative: ' + NEG.length + ' chars ===');

  const models = ['qwen-image-2.0-pro', 'qwen-image-2.0', 'wan2.7-image-pro'];
  for (const model of models) {
    const r = await p.evaluate(async ({ prompt, model, NEG }) => {
      const url = await window.callDashScopeImage(prompt, { model, negativePrompt: NEG, size: /wan/.test(model) ? '4K' : '2048*2048' });
      return url;
    }, { prompt: COMPRESSED, model, NEG });
    if (r && String(r).indexOf('http') === 0) {
      try {
        const buf = await (await p.request.get(r)).body();
        fs.writeFileSync(path.join(OUT, model.replace(/[^a-z0-9.]/gi, '_') + '.png'), buf);
        console.log('  ' + model + ' → saved (' + (buf.length / 1024).toFixed(0) + 'KB): ' + path.join(OUT, model + '.png'));
      } catch (e) { console.log('  ' + model + ' → url ' + r + ' (download failed: ' + e.message + ')'); }
    } else if (r && String(r).indexOf('data:') === 0) {
      fs.writeFileSync(path.join(OUT, model.replace(/[^a-z0-9.]/gi, '_') + '.png'), Buffer.from(String(r).split(',')[1], 'base64'));
      console.log('  ' + model + ' → saved (data-uri)');
    } else {
      console.log('  ' + model + ' → NO IMAGE (null). If key not set, this is expected — see server log "DashScope not configured".');
    }
  }
  console.log('Prompt + any images → ' + OUT);
  await b.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
