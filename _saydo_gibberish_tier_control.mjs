// GIBBERISH POLICY — THREE TIERS. Dry, zero dispatches, $0.
//
// Roman's policy (2026-09-26): never block, never scold, never quote the raw keystrokes — but let
// REPETITION change the meaning. Isolated noise is a stumble; a mixed input is a player who IS
// communicating; repeated pure gibberish is authored behaviour the world may answer consequentially.
//
// usage: node _saydo_gibberish_tier_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_saydo_gibberish_tier_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
const note = (t) => console.log('    ' + t);
const section = (t) => console.log('\n=== ' + t + ' ===');

const RAW_A = 'asdkfjh sdkfj lkjwer';
const RAW_D = 'qwerty zzzz aaaa';
const MIXED_D = 'You have no right to judge me sdkfjhsdkf';
const MIXED_A = 'I step toward the Dohkar and lkjwerlkj';

(async () => {
  console.log('=== GIBBERISH POLICY — THREE TIERS (dry, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._applyGibberishPolicy && window._buildGibberishHandlingDirective
    && window._buildStrongTurnDeliveryDirective && window._detectGibberish, { timeout: 30000 });

  section('1. TIER 1 — ISOLATED PURE GIBBERISH IS A STUMBLE, NOT AGENCY');
  const t1 = await page.evaluate((io) => {
    const P = window._applyGibberishPolicy;
    const r = P(io.a, io.d, { streak: 0 });
    return { r, strong: window._buildStrongTurnDeliveryDirective(r.action, r.dialogue, { fallbackGenerated: r.fallbackGenerated }),
             dir: window._buildGibberishHandlingDirective(r.tier) };
  }, { a: RAW_A, d: RAW_D });
  fs.writeFileSync(path.join(OUT_DIR, 'tier1_isolated.json'), JSON.stringify(t1, null, 2));
  note('tier=' + t1.r.tier + ' streak=' + t1.r.streak + ' fields=' + JSON.stringify(t1.r.fields));
  ok('an isolated pure-gibberish turn is tier "isolated"', t1.r.tier === 'isolated', JSON.stringify(t1.r));
  ok('both fields are substituted with the documented placeholders',
    t1.r.action === 'a beat of dazed, wordless hesitation'
    && t1.r.dialogue === 'a confused, wordless sound that never resolves into words', JSON.stringify(t1.r));
  ok('RAW KEYSTROKES ARE GONE from both fields',
    t1.r.action.indexOf(RAW_A) === -1 && t1.r.dialogue.indexOf(RAW_D) === -1, JSON.stringify(t1.r));
  ok('THE STRONG-DELIVERY RULE DOES NOT FIRE — a placeholder is not a committed move',
    t1.strong === '', String(t1.strong).slice(0, 200));
  ok('a light-acknowledgement directive is present instead',
    /ACKNOWLEDGE LIGHTLY/.test(t1.dir) && /ONE light beat/.test(t1.dir));
  ok('...and it forbids treating it as meaningful or building the scene on it',
    /Do NOT treat it as a deliberate, meaningful statement/.test(t1.dir)
    && /Nobody interprets it/.test(t1.dir));
  ok('...and forbids quoting the literal keystrokes',
    /literal keystrokes are NOT canon and must never be quoted/.test(t1.dir));
  ok('...and forbids breaking frame to comment on the player or the interface',
    /Do NOT comment on the player, the interface/.test(t1.dir));

  section('2. TIER 2 — MIXED INPUT KEEPS THE PLAYER\'S INTENT');
  const t2 = await page.evaluate((io) => {
    const P = window._applyGibberishPolicy;
    const dOnly = P('', io.mixedD, { streak: 0 });
    const aOnly = P(io.mixedA, '', { streak: 0 });
    return { dOnly, aOnly, dir: window._buildGibberishHandlingDirective(dOnly.tier),
             strong: window._buildStrongTurnDeliveryDirective(dOnly.action, dOnly.dialogue, { fallbackGenerated: dOnly.fallbackGenerated }) };
  }, { mixedD: MIXED_D, mixedA: MIXED_A });
  fs.writeFileSync(path.join(OUT_DIR, 'tier2_mixed.json'), JSON.stringify(t2, null, 2));
  note('mixed dialogue → "' + t2.dOnly.dialogue + '"');
  note('mixed action   → "' + t2.aOnly.action + '"');
  ok('a mixed input is tier "mixed"', t2.dOnly.tier === 'mixed' && t2.aOnly.tier === 'mixed',
    JSON.stringify([t2.dOnly.tier, t2.aOnly.tier]));
  ok('THE INTELLIGIBLE SENTENCE SURVIVES — the whole input is not discarded',
    t2.dOnly.dialogue.indexOf('You have no right to judge me') === 0, t2.dOnly.dialogue);
  ok('...and the action\'s intelligible half survives too',
    t2.aOnly.action.indexOf('I step toward the Dohkar and') === 0, t2.aOnly.action);
  ok('ONLY the corrupt fragment is rendered, as a broken sound',
    /a syllable that comes apart before it is a word/.test(t2.dOnly.dialogue)
    && t2.dOnly.dialogue.indexOf('sdkfjhsdkf') === -1, t2.dOnly.dialogue);
  ok('RAW FRAGMENT IS GONE from the action too', t2.aOnly.action.indexOf('lkjwerlkj') === -1, t2.aOnly.action);
  ok('a mixed turn RESETS the pure-gibberish streak — the player is communicating',
    t2.dOnly.streak === 0, String(t2.dOnly.streak));

  section('3. TIER 3 — REPEATED GIBBERISH BECOMES THE CHARACTER\'S BEHAVIOUR');
  const t3 = await page.evaluate((io) => {
    const P = window._applyGibberishPolicy;
    const first = P(io.a, io.d, { streak: 0 });
    const second = P(io.a, io.d, { streak: first.streak });
    const third = P(io.a, io.d, { streak: second.streak });
    return { first, second, third, dir: window._buildGibberishHandlingDirective(second.tier),
             strong: window._buildStrongTurnDeliveryDirective(second.action, second.dialogue, { fallbackGenerated: second.fallbackGenerated }),
             // A clean turn after the streak must reset it.
             afterClean: P('I take the ledger and hold it up', 'Then say it plainly.', { streak: third.streak }) };
  }, { a: RAW_A, d: RAW_D });
  fs.writeFileSync(path.join(OUT_DIR, 'tier3_repeated.json'), JSON.stringify(t3, null, 2));
  note('streaks: ' + JSON.stringify([t3.first.streak, t3.second.streak, t3.third.streak])
     + ' tiers: ' + JSON.stringify([t3.first.tier, t3.second.tier, t3.third.tier]));
  ok('the SECOND consecutive pure-gibberish turn escalates to tier "repeated"',
    t3.second.tier === 'repeated' && t3.second.streak === 2, JSON.stringify(t3.second));
  ok('...and it stays escalated on the third', t3.third.tier === 'repeated', JSON.stringify(t3.third));
  ok('THE STORY IS NOT HALTED AND THE RAW TEXT IS STILL NOT CANON',
    t3.second.action.indexOf(RAW_A) === -1 && t3.second.dialogue.indexOf(RAW_D) === -1, JSON.stringify(t3.second));
  ok('the strong-delivery rule still does not fire', t3.strong === '', String(t3.strong).slice(0, 120));
  ok('an IN-WORLD INCOHERENCE directive is present',
    /THIS IS NOW THE CHARACTER'S BEHAVIOUR/.test(t3.dir), t3.dir.slice(0, 200));
  ok('...it states the canon fact is repeated failure to be understood, NEVER the typed text',
    /REPEATEDLY COULD NOT/.test(t3.dir) && /do not quote, spell, or transcribe it, ever/.test(t3.dir));
  ok('...it licenses CONSEQUENTIAL in-world reactions',
    /concern, fear, guilt, impatience/.test(t3.dir) && /incapacity, defiance, shock, contamination, or evidence/.test(t3.dir)
    && /social cost may rise/.test(t3.dir));
  ok('...it forbids halting, stalling, or breaking frame to address the player',
    /does NOT halt, refuse, or stall/.test(t3.dir) && /does not break\n?\s*frame to address the player/.test(t3.dir));
  ok('...and it preserves her AGENCY rather than reading as a malfunction',
    /She keeps her agency/.test(t3.dir) && /not a malfunction of the game/.test(t3.dir));
  ok('a CLEAN turn afterwards resets the streak and emits no gibberish directive',
    t3.afterClean.tier === 'none' && t3.afterClean.streak === 0
    && t3.afterClean.action === 'I take the ledger and hold it up', JSON.stringify(t3.afterClean));

  section('4. ORDINARY PLAY IS UNTOUCHED, AND CONCIERGE IS NOT SUMMONED');
  const clean = await page.evaluate(() => {
    const P = window._applyGibberishPolicy;
    const r = P('I pull him down onto the bed and start unbuckling his belt', '"Stay. I want you tonight."', { streak: 0 });
    return { r, dir: window._buildGibberishHandlingDirective(r.tier),
             strong: window._buildStrongTurnDeliveryDirective(r.action, r.dialogue, { fallbackGenerated: r.fallbackGenerated }).length,
             // Concierge routing must fire for a real complaint and NOT for gibberish.
             complaintRoutes: !!window._routeWallBreakComplaint('', 'The Continue button is broken.'),
             gibberishRoutes: !!window._routeWallBreakComplaint('asdkfjh sdkfj lkjwer', 'qwerty zzzz aaaa'),
             placeholderRoutes: !!window._routeWallBreakComplaint('a beat of dazed, wordless hesitation',
               'a confused, wordless sound that never resolves into words') };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'clean_and_concierge.json'), JSON.stringify(clean, null, 2));
  ok('an ordinary committed move is tier "none" and is passed through verbatim',
    clean.r.tier === 'none' && clean.r.action.indexOf('unbuckling his belt') !== -1, JSON.stringify(clean.r));
  ok('...it emits NO gibberish directive, so ordinary play is byte-identical', clean.dir === '');
  ok('...and it DOES get the strong-delivery rule — the fix did not disarm the real case',
    clean.strong > 0, String(clean.strong));
  ok('CONCIERGE IS NOT SUMMONED BY GIBBERISH — raw or substituted',
    clean.gibberishRoutes === false && clean.placeholderRoutes === false, JSON.stringify(clean));
  ok('...but a genuine app complaint STILL routes', clean.complaintRoutes === true, JSON.stringify(clean));

  section('5. THE POLICY IS WIRED AT THE REAL SUBMIT SITE');
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('the Submit handler calls the tiered policy, not the two flat fallbacks',
    /var _gp = _applyGibberishPolicy\(action, dialogue, \{ streak: state\._gibberishStreak \|\| 0 \}\)/.test(src));
  ok('...it persists the streak across turns', /state\._gibberishStreak = _gp\.streak;/.test(src));
  ok('...and marks the values as fallback-generated', /state\._sayDoFallbackGenerated = true;/.test(src));
  ok('the strong rule honours that mark and returns early',
    /if \(_fg\) return '';/.test(src));
  ok('the tier directive reaches the author prompt', /_buildGibberishHandlingDirective\(\(window\.state && window\.state\._gibberishTier\)/.test(src));
  ok('the tier flags are cleared with the rest of the Say/Do turn state',
    /delete state\._sayDoFallbackGenerated; delete state\._gibberishTier;/.test(src));

  section('6. CONTAINMENT');
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
