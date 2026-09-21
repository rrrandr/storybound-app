// LI PRESENCE FLOOR — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after retry 13 (the first architecturally-successful Scene 2 sample): "Boundary Scene 2
// generation now works architecturally... But it's not 'finished content' yet, because the
// quality gap is exactly the one that matters for a romance CG: Julian is barely alive in the
// scene... The next dry step is to add LI presence as a required authoring axis for generated
// continuation scenes, not just as a post-hoc detector. The family accusation can be the public
// engine of the scene, but Julian still needs to exert pressure in it: a look, a line, a refusal
// to protect her, a procedural move, a charged silence that changes the room, something."
//
// This is a DIFFERENT axis from the earlier _detectLIPresenceDominance (which only judges the
// QUALITY of beats that already mention the LI, and requires >=3 such beats before it can even
// fire). Retry 13's real scene has exactly ONE Julian-subject beat ("Julian has not moved.") —
// too few for that detector to evaluate at all, yet the real problem (the LI barely exists in the
// scene) is genuine. _detectLIPresenceFloor (new, public/app.js, near
// _detectLIPresenceDominance) checks a narrower, complementary thing: when the LI is present in
// the scene at all, does he have AT LEAST ONE meaningful moment (dialogue, or an anchored/felt
// reaction beat, reusing the SAME already-proven _LI_PRESENCE_ANCHOR_RX vocabulary) — restrained
// pressure counts, dominance is never required.
//
// Fix: a new LI PRESENCE FLOOR directive in _buildCGScreenplayUserPrompt (the real CG continuation
// author's user prompt, not the planner) requires this explicitly, generically gated on
// (liName configured) AND (sceneIndex > 0 — a continuation scene) — inert for Scene 1 openers and
// any story with no LI configured. This is prevention (the prompt), not just detection — per
// Roman's explicit instruction not to rely on post-hoc reporting alone.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   RED        — retry 13's REAL captured scene (read verbatim from its persisted output) is
//                flagged: Julian is present but has no dialogue and no anchored reaction beat.
//   GREEN-A    — the SAME real scene, with ONLY the one Julian beat edited to add restrained,
//                anchored pressure ("Julian's jaw tightens, but he does not move to stop them."),
//                is NOT flagged.
//   GREEN-B    — the SAME real scene, with ONLY one dialogue line added for Julian, is NOT
//                flagged — proves dialogue alone also satisfies the floor.
//   ABSENCE-A  — a scene where the LI is never mentioned in phases, visualState, or beats at all
//                is NOT flagged (liPresent: false) — "absent/genuinely irrelevant" is respected.
//   ABSENCE-B  — no LI configured at all (opts.liName empty) is NOT flagged — never required when
//                the story has no love interest.
//   PROMPT     — the real _buildCGScreenplayUserPrompt renders the LI PRESENCE FLOOR directive
//                for a continuation scene (sceneIndex > 0) with an LI configured; it does NOT
//                render for a Scene 1 opener (sceneIndex === 0), and does NOT render when no LI is
//                configured.
//   COEXIST    — the CONTINUATION — AFTERMATH/CONSEQUENCE PACE directive still renders alongside.
//
// usage: node _scene2_li_presence_floor_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Read retry 13's REAL captured scene verbatim from its persisted output ──
const RETRY13_SCENE = JSON.parse(fs.readFileSync(path.join(__dirname, '_scene2_repair_replay_sample_out', 'scene2_raw_response_retry13.txt'), 'utf8'));
console.log('✓ loaded retry 13\'s real captured scene verbatim (' + RETRY13_SCENE.beats.length + ' beats)');
const julianBeats = RETRY13_SCENE.beats.filter((b) => /^julian\b/i.test(String(b.text || '').trim()));
console.log('  real Julian-subject beats: ' + JSON.stringify(julianBeats.map((b) => b.text)));

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectLIPresenceFloor === 'function' && typeof window._buildCGScreenplayUserPrompt === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('RED — retry 13\'s real scene: Julian present, no dialogue, no anchored beat');
  const red = await page.evaluate((scene) => window._detectLIPresenceFloor(scene, { liName: 'Julian' }), RETRY13_SCENE);
  ok('flagged', red.flagged === true, JSON.stringify(red));
  ok('liPresent recorded true', red.liPresent === true, JSON.stringify(red));
  ok('hasDialogue false, hasAnchoredBeat false', red.hasDialogue === false && red.hasAnchoredBeat === false, JSON.stringify(red));

  section('GREEN-A — the same real scene, Julian\'s one beat edited to add restrained, anchored pressure');
  const greenAScene = JSON.parse(JSON.stringify(RETRY13_SCENE));
  const julianIdx = greenAScene.beats.findIndex((b) => /^julian has not moved/i.test(String(b.text || '')));
  if (julianIdx === -1) { console.error('HARNESS BLOCKER: expected Julian beat not found in retry 13\'s real scene.'); await browser.close(); process.exit(2); }
  greenAScene.beats[julianIdx] = Object.assign({}, greenAScene.beats[julianIdx], { text: 'Julian\'s jaw tightens, but he does not move to stop them.' });
  const greenA = await page.evaluate((scene) => window._detectLIPresenceFloor(scene, { liName: 'Julian' }), greenAScene);
  ok('NOT flagged', greenA.flagged === false, JSON.stringify(greenA));
  ok('hasAnchoredBeat true (restraint still counts as meaningful pressure)', greenA.hasAnchoredBeat === true, JSON.stringify(greenA));

  section('GREEN-B — the same real scene, ONE dialogue line added for Julian (no anchored beat needed)');
  const greenBScene = JSON.parse(JSON.stringify(RETRY13_SCENE));
  greenBScene.beats.splice(20, 0, { idx: 19.5, kind: 'dialogue', text: '"I will not let this become a trial of her."', speaker: 'Julian', tension_state: 'tightening' });
  const greenB = await page.evaluate((scene) => window._detectLIPresenceFloor(scene, { liName: 'Julian' }), greenBScene);
  ok('NOT flagged', greenB.flagged === false, JSON.stringify(greenB));
  ok('hasDialogue true', greenB.hasDialogue === true, JSON.stringify(greenB));

  section('ABSENCE-A — the LI never appears in phases/visualState/beats at all: no requirement');
  const noLiScene = JSON.parse(JSON.stringify(RETRY13_SCENE));
  noLiScene.phases.forEach((p) => { p.characters_present = (p.characters_present || []).filter((c) => !/julian/i.test(c)); delete p.other_postures.Julian; });
  noLiScene.visualState.other_characters_present = noLiScene.visualState.other_characters_present.filter((c) => !/julian/i.test(c.name || ''));
  noLiScene.beats = noLiScene.beats.filter((b) => !/julian/i.test(String(b.text || '')));
  const absenceA = await page.evaluate((scene) => window._detectLIPresenceFloor(scene, { liName: 'Julian' }), noLiScene);
  ok('NOT flagged', absenceA.flagged === false, JSON.stringify(absenceA));
  ok('liPresent recorded false', absenceA.liPresent === false, JSON.stringify(absenceA));

  section('ABSENCE-B — no LI configured at all: never required');
  const absenceB = await page.evaluate((scene) => window._detectLIPresenceFloor(scene, { liName: '' }), RETRY13_SCENE);
  ok('NOT flagged', absenceB.flagged === false, JSON.stringify(absenceB));

  section('PROMPT — the real _buildCGScreenplayUserPrompt carries the LI PRESENCE FLOOR directive for continuation scenes');
  const promptResult = await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'li-presence-floor-control-' + Date.now();
    s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.loveInterestName = 'Julian';
    s.gender = 'Female'; s.loveInterest = 'Male';
    s.currentEngine = 'graphic'; s.renderMode = 'staged_story_mode';
    s._scenePlotContract = { sceneIndex: 1, stateChange: { event: 'x' }, hardBeats: [], aftermathTruths: [{ id: 'a', text: 'x' }], reservedConstraints: [] };
    const continuationBlock = window._buildCGScreenplayUserPrompt(1, 'a', 'b');
    const scene1Block = window._buildCGScreenplayUserPrompt(0, 'a', 'b');
    // Clear EVERY source _buildCGScreenplayUserPrompt's liName resolution chain checks
    // (_resolveStagedPartnerName -> state.loveInterestName -> picks.identity.partnerName) so this
    // genuinely represents "no LI configured," not just one of three fallbacks cleared.
    s.loveInterestName = ''; s.normalizedPartnerKernel = ''; s.partnerName = ''; s.rawPartnerName = '';
    s.picks.identity.partnerName = '';
    s.storybeau = '';
    const noLiBlock = window._buildCGScreenplayUserPrompt(1, 'a', 'b');
    return { continuationBlock, scene1Block, noLiBlock };
  });
  ok('LI PRESENCE FLOOR directive renders for a continuation scene with an LI configured', /LI PRESENCE FLOOR \(HARD/.test(promptResult.continuationBlock), 'not found');
  ok('the directive names Julian and states restraint/no-dominance explicitly', /Julian/.test(promptResult.continuationBlock) && /NOT a requirement that Julian dominate/.test(promptResult.continuationBlock), 'not found');
  ok('does NOT render for a Scene 1 opener (sceneIndex 0)', !/LI PRESENCE FLOOR \(HARD/.test(promptResult.scene1Block), 'unexpectedly found');
  ok('does NOT render when no LI is configured', !/LI PRESENCE FLOOR \(HARD/.test(promptResult.noLiBlock), 'unexpectedly found');

  section('COEXIST — CONTINUATION — AFTERMATH/CONSEQUENCE PACE still renders alongside');
  ok('CONT_AFTERMATH density line still present', /CONTINUATION — AFTERMATH\/CONSEQUENCE PACE/.test(promptResult.continuationBlock), 'not found');

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('LI PRESENCE FLOOR CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
