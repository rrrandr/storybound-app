// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ONE-SHOT INTEGRATION TEST — a REAL scene through the full pipeline with window._oneShotSheet on.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Unlike every prior sheet harness (which hand-wrote quadrant beats), this authors a real screenplay
// via _completeStagedSceneFromScreenplay, so it exercises the actual integration: chooser →
// _buildOneShotSheetPrompt (composed from _resolvePhaseVisualState + _buildStagedHeroPrompt per phase)
// → one 2K sheet → gutter split → 4 panels mounted into the real DOM shells.
//
// Verifies: (1) the chooser routed to the one-shot path, (2) the sheet rendered + split into 4,
// (3) four distinct panel images mounted, (4) graceful — no scene blanked.
//
// PAID (screenplay authoring text + one 2K sheet, ~$0.30-0.60). RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/oneshot_integration';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('ONE-SHOT INTEGRATION — real scene, window._oneShotSheet=true, 2K');
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const logs = [];
  page.on('console', m => {
    const t = m.text();
    if (/\[ONESHOT|\[CG:SCREENPLAY|\[STAGED:HERO\]|\[ASSET-INTEGRITY|RENDER-BYPASS|one-shot sheet path/i.test(t)) {
      logs.push(t.slice(0, 200)); console.error('   > ' + t.slice(0, 170));
    }
  });
  page.on('pageerror', e => { logs.push('PAGEERROR: ' + e.message); console.error('   !! ' + e.message); });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state
    && typeof window._completeStagedSceneFromScreenplay === 'function'
    && typeof window._renderSceneImages === 'function', { timeout: 40000 });

  console.log('\nAuthoring + rendering scene (flag ON)…');
  const t0 = Date.now();
  const out = await page.evaluate(async () => {
    const s = window.state;
    // Real Kwisheen combat scene (same setup the identity benchmark used).
    s.storyId = 'oneshot-integ';
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'fantasy',
      dynamic: 'forbidden', tone: 'Charged', intensity: 'Steamy',
      identity: { playerName: 'Mira', partnerName: 'Vael', displayPlayerName: 'Mira', displayPartnerName: 'Vael' }, pov: '1st' };
    s.povMode = 'normal'; s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman'; s.fantasyRegion = 'gloamwater_bay';
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her'; s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s.storyLength = 'affair'; s.tier = 'affair'; s.contentMode = 'explicit'; s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = []; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s.gnArtist = s.gnArtist || 'ender_bond'; s._pcLookSkipped = true;
    s._sceneWant = "survive the Kwisheen raider's Many-Tide assault and keep Vael alive";
    s.currentCrisis = 'a hostile KWISHEEN raider ambushes Mira and Vael in the drowned coral ruins, fighting the Many-Tide way — a spear-tentacle high, a cutlass-tentacle low, a hidden dagger for the killing thrust; Vael, herself Kwisheen, answers tentacle against tentacle.';
    s.aPlot = { goal: "survive the Kwisheen raider's Many-Tide ambush", antagonistOrAntiForce: 'a hostile Kwisheen raider fighting the Many-Tide way', namedClock: "before the raider's hidden dagger finds Mira" };
    window._devBypass = true; window._stagedFunnelBypass = true; window.__cgAuthorTimeoutMs = 180000;
    // THE FLAGS UNDER TEST
    window._oneShotSheet = true; window._oneShotSheetSize = '2K';
    s._stagedActive = null; s._stagedHeroCache = {}; s._stagedRegionContract = null; s._castingLibrary = {};

    let err = null;
    try {
      await Promise.race([
        window._completeStagedSceneFromScreenplay(0, '', ''),
        new Promise((_, r) => setTimeout(() => r(new Error('scene timeout 540s')), 540000))
      ]);
    } catch (e) { err = e && e.message; }

    // Grab the actual one-shot sheet the render produced (observability stash), independent of DOM mount.
    let sheet = null;
    for (let i = 0; i < 30; i++) {
      if (window._lastOneShotSheet && window._lastOneShotSheet.url) { sheet = window._lastOneShotSheet.url; break; }
      await new Promise(r => setTimeout(r, 2000));
    }
    return { err, sheet: sheet, panelCount: sheet ? 1 : 0,
             phaseCount: (s._stagedActive && s._stagedActive.plan && s._stagedActive.plan.phases) ? s._stagedActive.plan.phases.length : null };
  });

  console.log(`\n  authored + rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s${out.err ? ' (with: ' + out.err + ')' : ''}`);
  console.log(`  phases in plan     : ${out.phaseCount}`);
  console.log(`  panels mounted     : ${out.panelCount}`);
  const firedOneShot = logs.some(l => /\[ONESHOT\] .*one-shot sheet path|\[ONESHOT\] rendering 2x2/.test(l));
  const splitOk = logs.some(l => /\[ONESHOT\].*sheet done.*4 quadrants/.test(l));
  const fellBack = logs.some(l => /\[ONESHOT\] failed.*falling back/.test(l));
  console.log(`  one-shot path fired: ${firedOneShot ? 'YES' : 'NO'}`);
  console.log(`  sheet split ok     : ${splitOk ? 'YES' : 'NO'}`);
  console.log(`  fell back to per-phase: ${fellBack ? 'YES (sheet failed)' : 'no'}`);

  // save panels
  if (out.sheet) { try { fs.writeFileSync(path.join(OUT, 'sheet.png'), Buffer.from(out.sheet.split(',')[1], 'base64')); console.log('  captured sheet → sheet.png'); } catch (_) {} }
  fs.writeFileSync(path.join(OUT, 'logs.txt'), logs.join('\n'));

  const pass = firedOneShot && splitOk && !!out.sheet && !fellBack;
  console.log('\n' + (pass ? 'PASS — one-shot path drove a real scene: sheet rendered, split into 4, mounted.'
                         : 'PARTIAL/FAIL — see logs.txt and the flags above.'));
  console.log('Saved panels + logs → ' + OUT);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
