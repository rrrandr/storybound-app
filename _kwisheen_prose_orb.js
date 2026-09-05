// Validate the Kwisheen PROSE wiring + the Vision Orb (literary image) lore/guard parity.
// FREE phase (always): directive-string checks across gates + capture the assembled Vision-Orb image prompt
//   (providers monkey-patched to record the prompt and abort → no image spend) to confirm the Kwisheen guard
//   + Veilwood [WORLD] lore actually reach the Orb.
// PAID phase (RUN=1): 2 live Grok prose beats (Wry land-disguise tell + non-wry intimate sex canon) and 1 real
//   Vision-Orb image render of a Kwisheen in the Veilwood.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/kwisheen_orb';
const RUN = process.env.RUN === '1';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('console', m => { const t = m.text(); if (/\[BFL:REF\]|WORLD-ANCHOR|literarySetting|Generation failed/i.test(t)) console.error('  >', t.slice(0, 140)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._buildFantasySpeciesIntimacyDirective === 'function' && typeof window.generateImageWithFallback === 'function', { timeout: 40000 });

  const res = await p.evaluate(async ({ RUN }) => {
    const s = window.state;
    // Human PC + Kwisheen LI (disguised on land) in the Veilwood; literary Fantasy.
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'romance',
      dynamic: 'forbidden', tone: 'Earnest', intensity: 'Explicit', fantasyRegion: 'the_veilwood',
      identity: { playerName: 'Wren', partnerName: 'Neris', displayPlayerName: 'Wren', displayPartnerName: 'Neris' }, pov: '1st' };
    s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman'; s.fantasyRegion = 'the_veilwood';
    s.protagonistName = 'Wren'; s.loveInterestName = 'Neris';
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s.renderMode = 'literary'; s.currentEngine = 'literary'; s.contentMode = 'explicit';
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    delete s._wryDistortion;

    const R = { free: {}, paid: {} };

    // ── FREE 1: directive-string checks across gates ──
    s.picks.tone = 'Earnest'; delete s._wryDistortion;
    var dEarnest = window._buildFantasySpeciesIntimacyDirective();
    s._wryDistortion = { active: true };                       // → getEffectiveTone() === 'WryConfession'
    var dWry = window._buildFantasySpeciesIntimacyDirective();
    delete s._wryDistortion; s.picks.tone = 'Earnest';
    var dSafe = (function(){ var m = s.contentMode; s.contentMode = 'safe'; var x = window._buildFantasySpeciesIntimacyDirective(); s.contentMode = m; return x; })();
    R.free.tell_subtle_earnest   = /SMELL OF THE OCEAN/.test(dEarnest) && !/REEKS of LOW TIDE/.test(dEarnest);
    R.free.tell_wry_reek         = /REEKS of LOW TIDE/.test(dWry);
    R.free.sexcanon_present      = /assumes ALL manner of genders/.test(dEarnest);
    R.free.sexcanon_gated_safe   = !/assumes ALL manner of genders/.test(dSafe);   // suppressed in safe mode
    R.free.tell_still_in_safe    = /SMELL OF THE OCEAN/.test(dSafe);               // anatomy line still carries the tell

    // ── FREE 2: capture the assembled Vision-Orb image prompt via fetch interception (no spend) ──
    var captured = null, genErr = null;
    var _origFetch = window.fetch;
    window.fetch = function (url, opts) {
      try {
        var body = (opts && opts.body) ? String(opts.body) : '';
        if (/weeping|Veilwood|CEPHALOPOD|Kwisheen/i.test(body)) { captured = { url: String(url), body: body }; return Promise.reject(new Error('__CAPTURE_ABORT__')); }
      } catch (_) {}
      return _origFetch.apply(window, arguments);
    };
    try {
      await window.generateImageWithFallback({ prompt: 'Neris, a Kwisheen woman, stands among the pale white weeping trees of the Veilwood at dusk, red spiralgrass at her feet.', context: 'visualize', intent: 'scene', costTier: 'hero' });
    } catch (e) { genErr = e && e.message; }
    window.fetch = _origFetch;
    var P = '';
    try { if (captured) { var j = JSON.parse(captured.body); P = j.prompt || j.text || captured.body; } } catch (_) { P = captured ? captured.body : ''; }
    R.free.orb_gen_err = genErr;
    R.free.orb_prompt_captured   = !!captured;
    R.free.orb_kwisheen_guard    = /NEVER a single fused FISH TAIL/.test(P) && /SMOOTH colour-shifting CEPHALOPOD/.test(P) && /CAPSULE-SHAPED pupils/.test(P);
    R.free.orb_shapeshifter_legs = /LEGS ARE NEVER AN ERROR/.test(P);
    R.free.orb_veilwood_lore     = /VEILWOOD TREE CANON/.test(P) || /weeping/i.test(P) || /\[WORLD\]/.test(P);
    R.free.orb_prompt_len        = P.length;
    R.free.orb_prompt_full       = P;
    R.free.orb_capture_url       = captured ? captured.url : null;

    if (!RUN) return R;

    // ── PAID: restore providers (fresh page would be cleaner, but re-import refs by reloading not needed here) ──
    // NOTE: providers are monkey-patched above; the Orb render below is skipped unless we reload. Signal caller.
    R.paid.note = 'providers patched in-page; PAID prose uses /api/proxy (unaffected). Orb render done in a 2nd pass.';

    // PAID prose beat A — WRY land scene, disguised Kwisheen LI (expect ocean/low-tide tell)
    s.picks.tone = 'Earnest'; s._wryDistortion = { active: true };
    var dirA = window._buildFantasySpeciesIntimacyDirective();
    // PAID prose beat B — non-wry INTIMATE scene (expect sex/gender fluidity)
    delete s._wryDistortion; s.picks.tone = 'Earnest';
    var dirB = window._buildFantasySpeciesIntimacyDirective();

    async function grok(system, user) {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.8, max_tokens: 900 }) });
      if (!r.ok) return 'ERR HTTP ' + r.status;
      const d = await r.json();
      return String((d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '').trim();
    }
    const FRAME = 'You are the prose author for a Fatelands fantasy story. Write vivid literary prose for ONE short scene (2-3 paragraphs). The SPECIES rules below are HARD physical facts of this world — honor them through concrete sensory detail, but never quote or explain them.';
    R.paid.proseA_wry = await grok(FRAME + dirA, 'SCENE (Wry tone): On a crowded land market road in a human town, Wren walks beside Neris — who is passing as an ordinary human woman. Wren keeps noticing something the other townsfolk react to but Neris seems utterly unaware of. Write the walk and the small human reactions around them.');
    R.paid.proseB_intimate = await grok(FRAME + dirB, 'SCENE (intimate, explicit permitted): Alone at last in a veil-draped bower, Wren and Neris come together. Neris, no longer hiding what she is, shows Wren what a Kwisheen lover can be. Write the beginning of their intimacy.');
    R.paid.proseA_hasTell = /ocean|brine|sea|tide|salt/i.test(R.paid.proseA_wry);
    R.paid.proseB_hasFluidity = /gender|genital|shift|change|form|become|cock|cunt|both/i.test(R.paid.proseB_intimate);
    return R;
  }, { RUN });

  console.log('=== FREE — directive gates ===');
  console.log('  subtle ocean tell (earnest):', res.free.tell_subtle_earnest);
  console.log('  wry low-tide reek         :', res.free.tell_wry_reek);
  console.log('  sex canon present (explicit):', res.free.sexcanon_present);
  console.log('  sex canon SUPPRESSED (safe) :', res.free.sexcanon_gated_safe);
  console.log('  tell still present in safe  :', res.free.tell_still_in_safe);
  console.log('=== FREE — Vision Orb prompt capture ===');
  console.log('  orb prompt captured        :', res.free.orb_prompt_captured, '(len ' + res.free.orb_prompt_len + ')', res.free.orb_gen_err ? ('genErr=' + res.free.orb_gen_err) : '');
  console.log('  orb KWISHEEN guard present :', res.free.orb_kwisheen_guard);
  console.log('  orb shapeshifter-legs line :', res.free.orb_shapeshifter_legs);
  console.log('  orb Veilwood lore present  :', res.free.orb_veilwood_lore);
  console.log('  orb capture url            :', res.free.orb_capture_url);
  try { fs.writeFileSync(path.join(OUT, 'orb_prompt.txt'), res.free.orb_prompt_full || ''); console.log('  orb prompt dumped → ' + path.join(OUT, 'orb_prompt.txt')); } catch (_) {}

  if (RUN) {
    console.log('\n=== PAID — prose ===');
    console.log('  proseA (wry) has ocean/tide tell:', res.paid.proseA_hasTell);
    console.log('  proseB (intimate) has fluidity  :', res.paid.proseB_hasFluidity);
    fs.writeFileSync(path.join(OUT, 'proseA_wry.txt'), res.paid.proseA_wry || '');
    fs.writeFileSync(path.join(OUT, 'proseB_intimate.txt'), res.paid.proseB_intimate || '');
    console.log('  prose saved →', OUT);

    // Orb image render in a FRESH page (providers not patched there)
    const p2 = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
    p2.on('console', m => { const t = m.text(); if (/\[BFL|\[IMAGE|Generation failed/i.test(t)) console.error('  img>', t.slice(0,120)); });
    await p2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p2.waitForFunction(() => window.state && typeof window.generateImageWithFallback === 'function', { timeout: 40000 });
    const img = await p2.evaluate(async () => {
      const s = window.state;
      s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', fantasyRegion: 'the_veilwood', identity: {} };
      s.world = 'Fantasy'; s.fantasyRegion = 'the_veilwood'; s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
      s.renderMode = 'literary'; s.contentMode = 'suggestive'; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
      try {
        var r = await window.generateImageWithFallback({ prompt: 'Neris, a Kwisheen woman in her true form, among the pale white weeping-veil trees of the Veilwood at dusk, red spiralgrass underfoot. Cinematic photoreal.', context: 'visualize', intent: 'scene', costTier: 'hero' });
        return (r && (r.url || r.imageUrl || r)) || null;
      } catch (e) { return 'ERR:' + (e && e.message); }
    });
    if (img && String(img).indexOf('data:') === 0) {
      fs.writeFileSync(path.join(OUT, 'orb.png'), Buffer.from(String(img).split(',')[1], 'base64'));
      console.log('  Orb image saved → ' + path.join(OUT, 'orb.png'));
    } else { console.error('  Orb render: ' + String(img).slice(0, 200)); }
    await p2.close();
  } else {
    console.log('\nFREE checks only (no spend). Set RUN=1 for prose + Orb render.');
  }
  await b.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
