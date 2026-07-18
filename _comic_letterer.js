// $0 COMIC LETTERER v1 — professional comic typography as VECTOR DATA (not pixels). Image models
// are unreliable at readable text; Storybound produces structured lettering objects overlaid on the
// finished art — editable, translatable, accessible, toggleable. Proves the separation of
// illustration from lettering. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildLettering === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    // ── dialogue classification ──
    const speech = window._letterClassifyDialogue('You carry no mark of the tide.', {});
    const burst = window._letterClassifyDialogue('RUN!', {});
    const scream = window._letterClassifyDialogue('GET BACK!!', {});
    const whisper = window._letterClassifyDialogue('stay still', { whisper: true });
    const thought = window._letterClassifyDialogue('I can make the passage.', { thought: true });
    const internal = window._letterClassifyDialogue('The price has already begun.', { internal: true });
    const classifyOk = speech === 'speech_balloon' && burst === 'dialogue_burst' && scream === 'scream' && whisper === 'whisper' && thought === 'thought_balloon' && internal === 'internal_monologue';

    // ── controlled SFX vocabulary (semantic, deterministic, NOT random) ──
    const panelSword = { beatText: 'She draws her cutlass in one smooth motion.', dialogue: [], narration: [], eyeMagnet: 'the cutlass' };
    const lettSword = window._buildLettering(panelSword);
    const sfxSword = lettSword.find(o => o.type === 'sfx');
    const swordSfxOk = !!(sfxSword && sfxSword.sfxCategory === 'blade_draw' && window._LETTER_SFX_VOCAB.blade_draw.includes(sfxSword.text));
    // determinism: same beat → same SFX pick
    const lettSword2 = window._buildLettering(panelSword);
    const sfxDeterministic = lettSword2.find(o => o.type === 'sfx').text === sfxSword.text;
    // a magic surge maps to the magic vocabulary
    const lettMagic = window._buildLettering({ beatText: 'Tide-light gathers around his hands as the spell takes.', dialogue: [], narration: [] });
    const magicSfx = lettMagic.find(o => o.type === 'sfx');
    const magicSfxOk = !!(magicSfx && magicSfx.sfxCategory === 'magic');
    // a non-event beat produces NO sfx
    const lettQuiet = window._buildLettering({ beatText: 'She watches him across the silt.', dialogue: [], narration: [] });
    const noSfxWhenQuiet = !lettQuiet.some(o => o.type === 'sfx');

    // ── full panel: narration + dialogue + sfx → vector objects with placement + style ──
    const panel = {
      beatText: 'His cutlass connects, slamming her guard aside.',
      narration: ['The current dragged at my tunic.'],
      dialogue: [
        { speaker: 'Kesh', text: 'You think you can slip the net.' },
        { speaker: 'Mira', text: 'NO!' }
      ],
      hierarchy: { primary: 'Kesh' }, eyeMagnet: 'the cutlass'
    };
    const lett = window._buildLettering(panel);
    const hasNarration = lett.some(o => o.type === 'narration' && o.style.balloon === 'box');
    const hasSpeech = lett.some(o => o.type === 'speech_balloon' && o.speaker === 'Kesh' && o.tailTo === 'Kesh');
    const hasBurst = lett.some(o => o.type === 'dialogue_burst' && o.text === 'NO!' && o.style.balloon === 'none');
    const hasImpactSfx = lett.some(o => o.type === 'sfx' && o.sfxCategory === 'impact');
    const allVector = lett.every(o => o.type && o.style && o.anchor && typeof o.priority === 'number');
    const objectsNotPixels = allVector && lett.every(o => typeof o.text === 'string');

    // ── reading order: top→left→right→down, readIndex stamped ──
    const readIndexed = lett.every(o => typeof o.readIndex === 'number');
    const narrationReadsFirst = lett.find(o => o.type === 'narration').readIndex < lett.find(o => o.type === 'sfx').readIndex;

    // ── LETTERING LINT ──
    const overflow = window._letteringLint([{ type: 'speech_balloon', text: 'x', anchor: { x: 1.4, y: 0.2 }, style: {} }], panel);
    const catchesOverflow = overflow.warnings.some(w => /exits the panel bounds/i.test(w));
    const badTail = window._letteringLint([{ type: 'speech_balloon', text: 'x', tailTo: 'Ghost', anchor: { x: 0.2, y: 0.2 }, style: {} }], { dialogue: [{ speaker: 'Kesh', text: 'hi' }] });
    const catchesBadTail = badTail.warnings.some(w => /tail points to "Ghost"/i.test(w));
    const obscures = window._letteringLint([{ type: 'sfx', text: 'BOOM', anchor: { x: 0.5, y: 0.5 }, style: {} }], { eyeMagnet: 'the passage' });
    const catchesObscures = obscures.warnings.some(w => /obscure the eye-magnet/i.test(w));
    const tooMany = window._letteringLint([1, 2, 3, 4, 5].map((n, i) => ({ type: 'speech_balloon', text: 't' + n, anchor: { x: 0.2, y: 0.1 * i }, style: {} })), { dialogue: [] });
    const catchesTooMany = tooMany.warnings.some(w => /over the comfortable reading limit/i.test(w));

    // ── renderer contract forbids readable English + reserves space ──
    const contract = window._letteringRendererContract();
    const contractOk = /do NOT render any readable English/i.test(contract) && /reserve|leave clean negative space/i.test(contract) && /vector lettering layer/i.test(contract);

    return {
      classifyOk, swordSfxOk, sfxDeterministic, magicSfxOk, noSfxWhenQuiet,
      hasNarration, hasSpeech, hasBurst, hasImpactSfx, objectsNotPixels,
      readIndexed, narrationReadsFirst,
      catchesOverflow, catchesBadTail, catchesObscures, catchesTooMany, contractOk,
      sample: lett.map(o => o.type + (o.text ? '["' + o.text.slice(0, 10) + '"]' : '')).join(' ')
    };
  });

  await browser.close();

  const checks = [
    ['dialogue classifies into speech / burst / scream / whisper / thought / internal', R.classifyOk],
    ['SFX: "draws her cutlass" → controlled blade_draw vocabulary', R.swordSfxOk],
    ['SFX is deterministic (same beat → same pick, not random per issue)', R.sfxDeterministic],
    ['SFX: a magic surge maps to the magic vocabulary', R.magicSfxOk],
    ['SFX: a non-event beat produces NO sound effect', R.noSfxWhenQuiet],
    ['panel: narration → caption box', R.hasNarration],
    ['panel: dialogue → speech balloon with a tail to the speaker', R.hasSpeech],
    ['panel: "NO!" → artwork-integrated dialogue burst (no balloon)', R.hasBurst],
    ['panel: an impact beat adds an impact SFX', R.hasImpactSfx],
    ['lettering is VECTOR DATA (type + style + anchor + priority + text), not pixels', R.objectsNotPixels],
    ['reading order: every object has a readIndex', R.readIndexed],
    ['reading order: top narration reads before the lower SFX', R.narrationReadsFirst],
    ['LINT: catches typography exiting the panel bounds', R.catchesOverflow],
    ['LINT: catches a tail pointing to a non-speaker', R.catchesBadTail],
    ['LINT: catches an SFX obscuring the eye-magnet', R.catchesObscures],
    ['LINT: catches too many balloons in one panel', R.catchesTooMany],
    ['renderer contract forbids readable English + reserves space for the vector layer', R.contractOk]
  ];

  let pass = 0, fail = 0;
  console.log('\n  COMIC LETTERER v1 — typography as vector data  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · panel lettering: ' + R.sample);
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
