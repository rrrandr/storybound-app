// BENCHMARK A fixture renderer — A3 (urban humans-only) + A4 (interior dialogue-heavy).
// Humans only, contemporary (no fantasy region refs), one 2x2 one-shot sheet each. A4 has NO wish-burst so
// it is a genuine still/dialogue beat (tests whether the instrument manufactures action/SFX/burst defects
// on a quiet scene). Run: BENCH=A3 node _sheet_bench.js ; BENCH=A4 node _sheet_bench.js
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUTBASE = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad';
const BENCH = process.env.BENCH || 'A3';

const CFG = {
  A3: { out: 'sheet_bench_a3', flavor: 'billionaire_modern',
    want: 'win the confrontation on the rain-slicked city street without it turning violent',
    crisis: 'On a rain-slicked MODERN CITY street at dusk — glass towers, neon signage, wet asphalt, distant traffic and a few hurrying pedestrians with umbrellas — a woman confronts a man who has been following her. Both are ORDINARY HUMANS in contemporary clothes (she in a belted coat, he in a dark suit). No fantasy, no magic, no creatures. Gravity applies; they stand and move on the pavement. Tense, charged, but human-scale.',
    aPlot: { goal: 'win the street confrontation without violence', antagonistOrAntiForce: 'a man in a dark suit who has been tailing her through the city', namedClock: 'before he closes the distance' },
    twisted: false },
  // A4 ACCEPTANCE CRITERIA (validate render against these, don't just hope): exactly TWO principal
  // characters; BOTH visible in >=2 panels; readable facial expressions; conversational INTERACTION (not
  // parallel monologues); NO supernatural/underwater elements; NO wish-burst; ordinary contemporary interior.
  // billionaire_modern flavor (A3 proved it coral-free; smalltown_modern bled underwater elements).
  A4: { out: 'sheet_bench_a4', flavor: 'billionaire_modern',
    want: 'confront Daniel face to face and hold her ground until he answers',
    crisis: 'INSIDE an ordinary contemporary apartment living room at night — couch, coffee table with two mugs, a lamp, a window with distant city lights. TWO ORDINARY HUMANS face each other: NORA (woman) and DANIEL (man), contemporary clothes. This is a HEATED but STRICTLY NON-VIOLENT CONFRONTATION — an argument/confession, all words and faces. BOTH people are PRESENT AND INTERACTING in EVERY panel, close, facing each other — NEVER one person alone. Escalating beats: (1) Nora confronts Daniel with what she has discovered, both squared off; (2) Daniel deflects and denies, jaw tight; (3) the argument sharpens, both leaning in, hurt and anger on both faces; (4) a painful truth lands and they stare at each other across the small space. The drama is ENTIRELY in their two FACES and the words between them. NO physical violence, NO weapons, NO magic, NO supernatural or UNDERWATER elements, NO coral/water/marine anything, NO glowing bursts, NO sound-effect words. Ordinary modern interior; gravity applies.',
    aPlot: { goal: 'confront Daniel face to face and hold her ground', antagonistOrAntiForce: 'Daniel — the man standing across from her, defensive and evasive, denying what she has found', namedClock: 'before Daniel walks out the door' },
    twisted: false }
};
const C = CFG[BENCH];
const OUT = path.join(OUTBASE, C.out);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('console', m => { const t = m.text(); if (/\[ONESHOT\]|canonical asset|\[STAGED:RENDER\] Phase images|Generation failed/i.test(t)) console.error('  >', t.slice(0, 150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._completeStagedSceneFromScreenplay === 'function' && typeof window._renderOneShotSheet === 'function', { timeout: 40000 });

  console.log('BENCHMARK FIXTURE ' + BENCH + ' — ' + C.flavor + ' (humans only, one sheet)');
  const res = await p.evaluate(async ({ C }) => {
    const s = window.state;
    s.storyId = 'bench-' + Math.floor(1);
    s.picks = { world: 'Modern', worldSubtype: C.flavor, flavor: C.flavor, genre: 'romance',
      dynamic: 'slow_burn', tone: 'Charged', intensity: 'Suggestive',
      identity: { playerName: 'Nora', partnerName: 'Daniel', displayPlayerName: 'Nora', displayPartnerName: 'Daniel' }, pov: '1st' };
    s.povMode = 'normal'; s.world = 'Modern'; s.worldSubtype = C.flavor; s.flavor = C.flavor;
    s.fantasyRegion = ''; s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s._playerSpecies = 'Human'; s._liSpecies = 'Human'; s.storyLength = 'affair'; s.tier = 'affair';
    s.contentMode = 'suggestive'; s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = []; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s.gnArtist = s.gnArtist || 'ender_bond'; s._pcLookSkipped = true;
    window._devBypass = true; window._stagedFunnelBypass = true;
    window._structuralPass = false; window._oneShotSheet = true; window.__cgAuthorTimeoutMs = 180000;
    s._wishTwisted = !!C.twisted;
    s._sceneWant = C.want; s.currentCrisis = C.crisis; s.aPlot = C.aPlot;

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
      phaseTypes: plan.phases.map(function (ph) { return ph._readerLearning || ph.label || '?'; }), sheets: sheets };
  }, { C });

  if (!res.sheets || !res.sheets.length || String(res.sheets[0]).indexOf('data:') !== 0) { console.error('FAILED — ' + (res.err || (res.sheets && res.sheets[0]) || 'no sheet')); await b.close(); process.exit(1); }
  console.log('  scene ok · prose ' + res.proseLen + ' chars · phases [' + (res.phaseTypes || []).join(' → ') + ']');
  fs.writeFileSync(path.join(OUT, 'sheet1.png'), Buffer.from(res.sheets[0].split(',')[1], 'base64'));
  console.log('  saved → ' + path.join(OUT, 'sheet1.png'));
  await b.close();
})().catch(function (e) { console.error('BENCH ERROR:', e); process.exit(2); });
