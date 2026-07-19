// $0 COMPOSITION REFERENCES — framing given as an IMAGE, not text, to beat the renderer's two-shot prior.
// Verifies the framing mapper, the resolver, registry wiring, precedence, and that the assets actually exist.
// Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._panelFraming === 'function' && typeof window._resolveCanonicalAssets === 'function' && typeof window._resolveCompositionRef === 'function', { timeout: 15000 });

  const R = await page.evaluate(async () => {
    const F = window._panelFraming, RC = window._resolveCompositionRef, RA = window._resolveCanonicalAssets;

    // MAPPER — a panel's framing intent → the framing the two-shot prior fights
    const eventLed = F({ eventLed: true }, 'Revelation') === 'object_dominant';
    const establishing = F({ establishing: true }, 'Threat') === 'establishing_solo';
    const orientation = F({}, 'Orientation') === 'environment_wide';
    const plainChar = F({}, 'Decision') === null;                          // ordinary character panel → no comp ref (shot-director text governs)
    const precedence = F({ eventLed: true, establishing: true }, 'Revelation') === 'object_dominant'; // event object dominates > solo establishing
    const nullPanel = F(null, 'Orientation') === null;

    // RESOLVER — each key → {path,label}; unknown → null
    const three = ['establishing_solo', 'object_dominant', 'environment_wide'].every(k => { const r = RC(k); return r && r.path && /FRAMING/i.test(r.label); });
    const unknownNull = RC('nope') === null;
    // labels must forbid drawing the shapes (the burst failure mode: don't recreate the reference)
    const labelGuards = ['establishing_solo', 'object_dominant', 'environment_wide'].every(k => /NOT content to draw|do NOT render/i.test(RC(k).label));

    // REGISTRY WIRING — _resolveCanonicalAssets attaches ONE composition ref when ctx.framing is set
    const objAssets = RA({ framing: 'object_dominant' });
    const attaches = objAssets.some(a => a.id === 'composition:object_dominant' && /Comp_Object_Dominant/.test(a.path) && a.tier === 2);
    const noFramingNoComp = RA({}).every(a => !/^composition:/.test(a.id));  // no framing → no comp ref
    // and it composes with the other canonical assets (burst + composition together)
    const both = RA({ wishOutcome: 'twisted', framing: 'establishing_solo' });
    const composes = both.some(a => a.id === 'wish_burst') && both.some(a => a.id === 'composition:establishing_solo');

    // ASSETS EXIST — the three PNGs actually resolve (a dangling path = a silent no-ref render)
    const paths = ['/assets/Fatelands/Comp_Establishing_Solo_v1.png', '/assets/Fatelands/Comp_Object_Dominant_v1.png', '/assets/Fatelands/Comp_Environment_Wide_v1.png'];
    const existArr = await Promise.all(paths.map(p => fetch(p).then(r => r.ok).catch(() => false)));
    const assetsExist = existArr.every(Boolean);
    // the re-authored burst emblems also still resolve
    const burstExist = (await Promise.all(['/assets/Fatelands/Wish_Burst_Clean_v1.png', '/assets/Fatelands/Wish_Burst_Twisted_v1.png'].map(p => fetch(p).then(r => r.ok).catch(() => false)))).every(Boolean);

    // UNDERWATER BUOYANCY float ref: resolver + the ctx.underwater FALLBACK (framing wins when both set)
    const ufRef = RC('underwater_float');
    const ufResolves = ufRef && /Comp_Underwater_Float/.test(ufRef.path) && /BUOYANCY|SUSPENDED/i.test(ufRef.label);
    const ufFallback = RA({ underwater: true }).some(a => a.id === 'composition:underwater_float');
    const framingWins = (() => { const r = RA({ framing: 'object_dominant', underwater: true }); return r.some(a => a.id === 'composition:object_dominant') && !r.some(a => a.id === 'composition:underwater_float'); })();
    const ufAssetExists = await fetch('/assets/Fatelands/Comp_Underwater_Float_v1.png').then(r => r.ok).catch(() => false);

    return { eventLed, establishing, orientation, plainChar, precedence, nullPanel, three, unknownNull, labelGuards, attaches, noFramingNoComp, composes, assetsExist, burstExist, ufResolves, ufFallback, framingWins, ufAssetExists };
  });

  await browser.close();

  const checks = [
    ['MAPPER: event-led panel → object_dominant (the event object dominates the frame)', R.eventLed],
    ['MAPPER: establishing panel → establishing_solo (a lone subject, not a two-shot)', R.establishing],
    ['MAPPER: Orientation → environment_wide (a wide, inhabited place)', R.orientation],
    ['MAPPER: ordinary character panel → no composition ref (shot-director text governs)', R.plainChar],
    ['MAPPER: precedence — event object dominates over solo establishing', R.precedence],
    ['MAPPER: null panel → null (no throw)', R.nullPanel],
    ['RESOLVER: all three keys → {path,label} with a FRAMING label', R.three],
    ['RESOLVER: unknown framing → null', R.unknownNull],
    ['RESOLVER: labels forbid drawing the shapes (avoid the burst-copy failure mode)', R.labelGuards],
    ['WIRING: _resolveCanonicalAssets attaches ONE tier-2 composition ref for ctx.framing', R.attaches],
    ['WIRING: no framing → no composition ref attached', R.noFramingNoComp],
    ['WIRING: composition composes with the burst emblem (both attach together)', R.composes],
    ['UNDERWATER: underwater_float resolves with a BUOYANCY label', R.ufResolves],
    ['UNDERWATER: ctx.underwater attaches the float ref as the composition FALLBACK', R.ufFallback],
    ['UNDERWATER: a framing ref WINS over the underwater fallback (never two comp refs)', R.framingWins],
    ['UNDERWATER: the float PNG resolves', R.ufAssetExists],
    ['ASSETS: all three composition PNGs actually resolve (no dangling path)', R.assetsExist],
    ['ASSETS: the re-authored pure-symbol burst emblems still resolve', R.burstExist]
  ];

  let pass = 0, fail = 0;
  console.log('\n  COMPOSITION REFERENCES — framing as an image, not text  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
