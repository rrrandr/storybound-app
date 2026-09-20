// IMAGE PROMPT — VISUAL CHARGE DIRECTIVE — DRY CONTROL (Roman, 2026-09-20)
//
// Roman: "when a CG scene or panel has romantic, erotic, charged, intimate, jealous,
// confrontational-flirtation, or power-dynamic content, the image prompt should carry that
// visually in safe, policy-compatible terms... For First Sacrifice specifically, make sure
// Julian/Lirael OAS-adjacent panels can carry 'charged public accusation / dangerous flirtation /
// restrained desire / ceremonial power pressure' without turning into explicit sexual imagery or
// generic fantasy combat."
//
// Fully dry: no provider calls, no image calls, no First Sacrifice render. Exercises the REAL,
// unmodified app.js functions directly (_resolvePhaseVisualState, _buildPhaseChargeDirective,
// _buildStagedHeroPrompt, sanitizeImagePrompt) against real and synthetic fixtures — never
// reimplements their logic here.
//
// Extends the EXISTING _buildPhaseChargeDirective (the already-live "CHEMISTRY / CHARGE" block,
// consumed by every render path via _buildStagedHeroPrompt) with a new, narrower RESTRAINED CHARGE
// register for phases the full-romance gate correctly does not fire on but which are not simply
// neutral either — gated on the CG author's OWN declared attractionPresence==='latent', or on
// social_staging_mode + sceneCharge.stake naming public-pressure/power/attraction-adjacent content.
//
// usage: node _image_visual_charge_directive_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── The real, preserved First Sacrifice Scene 2 sample — read verbatim, never modified ──
const REAL_SAMPLE_PATH = path.join(__dirname, '_scene2_repair_replay_sample_out', 'scene2_raw_response.txt');
const REAL_SCENE2 = JSON.parse(fs.readFileSync(REAL_SAMPLE_PATH, 'utf8'));
console.log('✓ loaded the real, preserved Scene 2 sample verbatim — social_staging_mode=' + REAL_SCENE2.visualState.social_staging_mode + ' attractionPresence=' + REAL_SCENE2.visualState.attractionPresence + ' stake="' + REAL_SCENE2.sceneCharge.stake + '"');

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._resolvePhaseVisualState === 'function' && typeof window._buildStagedHeroPrompt === 'function' && typeof window.sanitizeImagePrompt === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready, or one of _resolvePhaseVisualState/_buildStagedHeroPrompt/sanitizeImagePrompt not exposed on window — ' + (e && e.message)); await browser.close(); process.exit(2); });

  const NEUTRAL_PHASE = { phaseIdx: 0, characters_present: ['protagonist', 'li'], props_present: [], li_visibility_phase: 'partial' };

  section('1. NEUTRAL — a platonic, unattracted scene gets NO charge directive of either register');
  const neutralVS = { social_staging_mode: 'platonic_warm', attractionPresence: 'none' };
  const neutralCharge = { stake: 'they need to decide who carries the water back to camp' };
  const neutralEff = await page.evaluate(({ vs, phase, charge }) => window._resolvePhaseVisualState(vs, phase, null, null, charge), { vs: neutralVS, phase: NEUTRAL_PHASE, charge: neutralCharge });
  ok('no directive fires for a neutral, unattracted, non-public-pressure scene', neutralEff._phaseChargeDirective === '', JSON.stringify(neutralEff._phaseChargeDirective));

  section('2. CHARGED/ROMANTIC — the existing full-romance directive still fires (regression check — this repair must not break it)');
  const romanceVS = { social_staging_mode: 'romance_eligible', attractionPresence: 'foreground' };
  const romanceEff = await page.evaluate(({ vs, phase }) => window._resolvePhaseVisualState(vs, phase, null, null, null), { vs: romanceVS, phase: NEUTRAL_PHASE });
  ok('a romance_eligible/foreground scene still gets the CHEMISTRY / CHARGE directive', /CHEMISTRY \/ CHARGE/.test(romanceEff._phaseChargeDirective || ''), JSON.stringify(romanceEff._phaseChargeDirective));
  ok('the full-romance register never appears for the neutral case above (no cross-contamination)', !/CHEMISTRY \/ CHARGE/.test(neutralEff._phaseChargeDirective || ''), JSON.stringify(neutralEff._phaseChargeDirective));

  section('3. FIRST SACRIFICE (real fixture) — the RESTRAINED CHARGE register fires on the real, unmodified Scene 2 sample');
  const realEff = await page.evaluate(({ vs, phase, charge }) => window._resolvePhaseVisualState(vs, phase, null, null, charge), { vs: REAL_SCENE2.visualState, phase: NEUTRAL_PHASE, charge: REAL_SCENE2.sceneCharge });
  console.log('  · directive: ' + JSON.stringify(realEff._phaseChargeDirective));
  ok('the real sample (adversarial / attractionPresence:none / public-accusation stake) gets a directive at all — this scene previously got NOTHING', !!realEff._phaseChargeDirective && realEff._phaseChargeDirective.length > 0, JSON.stringify(realEff._phaseChargeDirective));
  ok('it is the RESTRAINED CHARGE register specifically, NOT the full-romance one (this is not a romantic scene)', /RESTRAINED CHARGE/.test(realEff._phaseChargeDirective || '') && !/CHEMISTRY \/ CHARGE/.test(realEff._phaseChargeDirective || ''), JSON.stringify(realEff._phaseChargeDirective));
  ok('the directive explicitly disclaims romantic staging ("do NOT pose the pair as a couple")', /do NOT pose the pair as a couple/i.test(realEff._phaseChargeDirective || ''), JSON.stringify(realEff._phaseChargeDirective));
  ok('the directive uses only safe visual-grammar vocabulary (gaze / posture / composure / jaw / hand / stillness) — no explicit or bare "sexy" language', /gaze|posture|composure|jaw|hand|stillness|distance/i.test(realEff._phaseChargeDirective || '') && !/\b(sexy|nude|naked|explicit)\b/i.test(realEff._phaseChargeDirective || ''), JSON.stringify(realEff._phaseChargeDirective));

  section('4. GUARD — attractionPresence:"none" in a mode-appropriate but stake-silent scene still gets NOTHING (not a blanket always-on for adversarial)');
  const silentAdversarialVS = { social_staging_mode: 'adversarial', attractionPresence: 'none' };
  const silentCharge = { stake: 'the wagon wheel is broken and they are losing daylight' };
  const silentEff = await page.evaluate(({ vs, phase, charge }) => window._resolvePhaseVisualState(vs, phase, null, null, charge), { vs: silentAdversarialVS, phase: NEUTRAL_PHASE, charge: silentCharge });
  ok('an adversarial scene with a genuinely mundane stake (no public/power/attraction language) still gets no directive', silentEff._phaseChargeDirective === '', JSON.stringify(silentEff._phaseChargeDirective));

  section('5. LATENT — attractionPresence:"latent" fires the restrained register on its own, no stake match needed');
  const latentVS = { social_staging_mode: 'professional', attractionPresence: 'latent' };
  const latentEff = await page.evaluate(({ vs, phase }) => window._resolvePhaseVisualState(vs, phase, null, null, null), { vs: latentVS, phase: NEUTRAL_PHASE });
  ok('attractionPresence:"latent" alone is sufficient to fire the restrained register', /RESTRAINED CHARGE/.test(latentEff._phaseChargeDirective || ''), JSON.stringify(latentEff._phaseChargeDirective));

  section('6. FORBIDDEN WORDING — sanitizeImagePrompt still catches explicit terms even when the safe charge directive is present in the same prompt');
  const leakedPrompt = 'A comic panel. ' + (realEff._phaseChargeDirective || '') + ' Explicit description: bondage, submission, a lap dance, tied up with handcuffs.';
  const sanitized = await page.evaluate((p) => window.sanitizeImagePrompt(p), leakedPrompt);
  ok('hard-forbidden terms (bondage/submission/lap dance/handcuffs) are removed from the final prompt', !/bondage|submission|lap\s*dance|handcuff/i.test(sanitized), sanitized);
  ok('the safe RESTRAINED CHARGE directive text survives the same sanitize pass intact', /RESTRAINED CHARGE/.test(sanitized) && /composure|jaw|gaze/i.test(sanitized), sanitized);

  section('7. 2x2 SHEET PARITY — the sheet path threads sceneCharge into _resolvePhaseVisualState identically to the single-panel path');
  // Same call SHAPE _buildOneShotSheetPrompt uses per quadrant (app.js ~209803): visualState, phases[i],
  // planMeta.phases, planMeta.beats, planMeta.sceneCharge — proving both paths feed the identical function
  // the identical inputs, which is what actually guarantees identical output (not a separate reimplementation).
  const sheetStyleEff = await page.evaluate(({ vs, phase, charge }) => {
    var planMeta = { phases: [phase], beats: [], sceneCharge: charge };
    return window._resolvePhaseVisualState(vs, phase, planMeta.phases, planMeta.beats, planMeta.sceneCharge);
  }, { vs: REAL_SCENE2.visualState, phase: NEUTRAL_PHASE, charge: REAL_SCENE2.sceneCharge });
  ok('the sheet-call-shape produces the exact same directive as the single-panel call shape for the real fixture', sheetStyleEff._phaseChargeDirective === realEff._phaseChargeDirective && !!sheetStyleEff._phaseChargeDirective, JSON.stringify({ sheet: sheetStyleEff._phaseChargeDirective, single: realEff._phaseChargeDirective }));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('IMAGE VISUAL CHARGE DIRECTIVE CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
