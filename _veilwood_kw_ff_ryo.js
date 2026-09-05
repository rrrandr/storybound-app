// Veilwood duel via the PRODUCTION sheet path — 2 Kwisheen vs 1 Veilweave-wearing First Favored, Ryo Toro.
// Drives _completeStagedSceneFromScreenplay → _renderOneShotSheet (the real path), so it exercises the new:
//   • weapon lock (protagonist/li TOKEN species resolution) — FF locks to The Answer, Kwisheen to tide-trident
//   • collapsed FF combat directive (one weapon, not a menu)
//   • Veilweave groin = soft blur (not a codpiece)
//   • veilwoodEnvBlock (white weeping veil-leaf fills the empty background + foreground side-curtains)
//   • mated-pair growth trees + paired red spiralgrass
// PAID — one prose gen + one 4-panel sheet render. Run: node _veilwood_kw_ff_ryo.js
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/veilwood_kw_ff_ryo';

const CRISIS =
  'In the VEILWOOD at dusk — pale WHITE trees whose twin trunks wind together in MATED PAIRS (most fully ' +
  'twisted like braided rope, a few younger pairs still leaning together), crowned with drooping WHITE ' +
  'weeping-willow veil-leaf canopy; deep-crimson spiralgrass underfoot growing in twisted pairs — a lone ' +
  'FIRST FAVORED warrior named KAEL is ambushed by TWO KWISHEEN. Kael wears the VEILWEAVE: a sheer, hooded, ' +
  'translucent leaf-vein garment that refracts him into several overlapping misregistered echoes of the same ' +
  'body. He fights with THE ANSWER, his double-ended polearm. The two attackers are Kwisheen — tall graceful ' +
  'tentacled humanoids with legs AND tentacles: THREXA (a lean female, violet-toned) and ORUN (a bearded ' +
  'male). This is a pure life-or-death FIGHT — no romance, no intimacy, no dialogue. Four escalating beats: ' +
  '(1) the two Kwisheen close in from both sides through the white veil-curtains, Kael turning to meet them, ' +
  'polearm raised; (2) blades and tentacles clash — Kael parries Threxa while Orun lunges, weapons locking; ' +
  '(3) Kael takes a cut but twists free in an acrobatic reversal, the Veilweave echoes smearing his position; ' +
  '(4) Kael lands a decisive blow on Orun as Threxa recoils. Every strike lands on an ENEMY BODY, never on a ' +
  'tree. Keep the fighters in the open clearing; the white veil trees frame the sides and fill the background.';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('console', m => { const t = m.text(); if (/\[ONESHOT\]|WEAPON|VEILWOOD|VEILWEAVE|canonical asset|\[STAGED:RENDER\]|Generation failed|WORLD-ANCHOR/i.test(t)) console.error('  >', t.slice(0, 160)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._completeStagedSceneFromScreenplay === 'function' && typeof window._renderOneShotSheet === 'function', { timeout: 40000 });

  console.log('VEILWOOD · 2 Kwisheen vs Veilweave First Favored · Ryo Toro — production sheet path');
  const res = await p.evaluate(async ({ CRISIS }) => {
    const s = window.state;
    s.storyId = 'veilwood-kwff-ryo';
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'romance',
      dynamic: 'enemies_to_lovers', tone: 'Charged', intensity: 'Suggestive',
      fantasyRegion: 'the_veilwood',
      identity: { playerName: 'Kael', partnerName: 'Threxa', displayPlayerName: 'Kael', displayPartnerName: 'Threxa' }, pov: '1st' };
    s.povMode = 'normal'; s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.fantasyRegion = 'the_veilwood'; s.gender = 'Male'; s.loveInterest = 'Female'; s.authorPronouns = 'He/Him';
    s._playerSpecies = 'First Favored'; s._liSpecies = 'Kwisheen'; s.storyLength = 'affair'; s.tier = 'affair';
    s.dynamic = 'enemies_to_lovers';
    s.contentMode = 'suggestive'; s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = []; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s.gnArtist = 'ryo_toro'; s._pcLookSkipped = true;
    window._devBypass = true; window._stagedFunnelBypass = true;
    window._structuralPass = false; window._oneShotSheet = true; window.__cgAuthorTimeoutMs = 180000;
    s._wishTwisted = false;
    s._sceneWant = 'survive the Kwisheen ambush and put both attackers down';
    s.currentCrisis = CRISIS;
    s.aPlot = { goal: 'survive the two-Kwisheen ambush in the Veilwood', antagonistOrAntiForce: 'two Kwisheen — Threxa and Orun — attacking from both sides', namedClock: 'before their tentacles pin his weapon' };

    var err = null;
    try {
      var gen = window._completeStagedSceneFromScreenplay(0, '', '');
      await Promise.race([gen, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('gen timeout')); }, 300000); })]);
    } catch (e) { err = e && e.message; }
    var plan = s._stagedActive && s._stagedActive.plan;
    if (!plan || !plan.visualState || !Array.isArray(plan.phases)) return { err: 'no usable plan (' + (err || '') + ')' };
    var sheets = [];
    try { if (window._lastOneShotSheet && window._lastOneShotSheet.url) sheets.push(window._lastOneShotSheet.url); } catch (_) {}
    if (!sheets.length) {
      try { window._lastOneShotSheet = null; await window._renderOneShotSheet(plan.visualState, plan.phases, 0, plan); var u = window._lastOneShotSheet && window._lastOneShotSheet.url; if (u) sheets.push(u); } catch (e) { sheets.push('ERR:' + (e && e.message)); }
    }
    return { err: err, proseLen: (s.scenes && s.scenes[0] && s.scenes[0].text || '').length,
      cast: (plan.visualState.characters_present || []).concat((plan.visualState.other_characters_present || []).map(function (o) { return (o && o.name) + ':' + (o && o.species); })),
      pcW: JSON.stringify(plan.visualState.pc_weapon || null), liW: JSON.stringify(plan.visualState.li_weapon || null),
      phaseTypes: plan.phases.map(function (ph) { return ph._readerLearning || ph.label || '?'; }), sheets: sheets };
  }, { CRISIS });

  console.log('  cast:', JSON.stringify(res.cast));
  console.log('  pc_weapon:', res.pcW, '· li_weapon:', res.liW);
  console.log('  phases:', JSON.stringify(res.phaseTypes), '· prose', res.proseLen, 'chars');
  if (!res.sheets || !res.sheets.length || String(res.sheets[0]).indexOf('data:') !== 0) {
    console.error('FAILED — ' + (res.err || (res.sheets && res.sheets[0]) || 'no sheet')); await b.close(); process.exit(1);
  }
  fs.writeFileSync(path.join(OUT, 'sheet.png'), Buffer.from(res.sheets[0].split(',')[1], 'base64'));
  console.log('  saved → ' + path.join(OUT, 'sheet.png'));
  await b.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
