// CAPABILITY-ROOTED EXTRAPOLATION CONTROL — ZERO dispatches, $0.
//
// The first v2 draft over-corrected. "Canon silence is permission" fixes absence-as-prohibition
// and immediately licenses anything canon fails to mention, which is the opposite error. The rule
// that is actually right is COMPOSITIONAL:
//
//     an established capability  +  an ordinary application / technique / prop / coordination
//
// Canon need not enumerate the stunt. A Kwisheen with an established appearance ability may look
// like a dragon; twelve of them may coordinate into the look of a whale. Neither gains real fire,
// real flight, real mass, lungs, or bodily fusion — those are separate CATEGORIES OF EFFECT.
//
// WHAT THIS PROVES: the prompt states that rule; the fixtures separate the two failure modes; the
// grounding capability actually reaches the packet through the real builder; and the deterministic
// pre-gate does not shoot the greens before a model ever sees them. WHAT IT CANNOT PROVE: that a
// model classifies them correctly. Only a paid run shows that.
//
// usage: node _canon_audit_extrapolation_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { loadFixtures, extrapolationFixtures, extrapolationPaidCost, candidate } from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_extrapolation_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  console.log('=== CAPABILITY-ROOTED EXTRAPOLATION CONTROL (zero dispatches, $0) ===');
  const X = extrapolationFixtures();
  const paid = loadFixtures().fixtures;

  section('1. THE PAID EIGHT ARE UNTOUCHED');
  ok('loadFixtures() still returns exactly the original eight', paid.length === 8, String(paid.length));
  ok('and none of the extrapolation fixtures leaked into it',
    !paid.some((f) => /^x_/.test(f.id)), paid.map((f) => f.id).join(','));
  ok('the extrapolation set is separate: 3 green, 4 red',
    X.filter((f) => f.expect === 'pass').length === 3 && X.filter((f) => f.expect === 'violation').length === 4,
    X.map((f) => f.expect).join(','));
  const cost = extrapolationPaidCost(candidate('mistral-small-2603'));
  console.log('    if ever folded into a paid run: ' + cost.totalFixtures + ' fixtures, $' + cost.totalUsd.toFixed(6)
    + ' (adds $' + cost.extraUsd.toFixed(6) + ')');
  ok('folding them into a paid run is PRICED, so the count and ceiling cannot change silently',
    cost.extraFixtures === 7 && cost.totalFixtures === 15 && cost.totalUsd > cost.extraUsd);

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildCanonPacket && window._buildCanonAuditPrompt
    && window._detectUngroundedCapability && window._canonAuditPromptVersionActive, { timeout: 30000 });

  section('2. THE PROMPT STATES THE COMPOSITIONAL RULE — all eight clauses');
  const { durable } = loadFixtures();
  // Build through the REAL builders, injecting the fixture's capability facts into the REAL
  // character ledger so they arrive as real cap_ facts rather than a hand-assembled packet.
  const build = (fx, version) => page.evaluate((a) => {
    const s = window.state; s.storyId = 'x-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [JSON.parse(JSON.stringify(a.durable))];
    const led = {};
    // The packet renders a ledger row as "<name>: <layers>", so the layer must NOT repeat the
    // name — otherwise the auditor reads "Sath (Kwisheen): Sath (Kwisheen): established ability".
    (a.fx.capabilityFacts || []).forEach((t, i) => {
      const cut = String(t).indexOf(': ');
      led['xcap' + i] = cut > 0
        ? { name: String(t).slice(0, cut), revealedLayers: [String(t).slice(cut + 2)] }
        : { name: 'canon', revealedLayers: [String(t)] };
    });
    s._characterDisclosureLedger = led;       // migrates into legacy rows, surfaced by _charLedger()
    window._canonAuditPromptVersion = a.version;
    const packet = window._buildCanonPacket(s, { proposal: a.fx.plan });
    const sys = window._buildCanonAuditPrompt(a.fx.plan, packet).sys;
    const det = window._detectUngroundedCapability(a.fx.plan, {
      worldTruths: [], affordances: [], canonFacts: packet.facts.map((f) => f.text) });
    delete window._canonAuditPromptVersion;
    return { sys, det, truncated: packet.truncated,
      facts: packet.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text })) };
  }, { fx, durable, version });

  const g0 = await build(X[0], 2);
  fs.writeFileSync(path.join(OUT_DIR, 'prompt_v2_extrapolation.txt'), g0.sys);
  const clauses = [
    ['1 — silence permits ordinary action, dialogue, tactics, props, technique',
      /ordinary physical and social action, dialogue, tactics, props, technique/],
    ['1 — and creative appearance, and ordinary coordination',
      /creative appearance and presentation/, /ordinary coordination and teamwork/],
    ['2 — novel applications and combinations of established capabilities are allowed',
      /novel application or combination of established capabilities is ALLOWED/],
    ['3 — judge the KIND of effect, never demand a precedent for the exact event',
      /same KIND of effect canon already grants/, /NEVER "has canon shown this exact/],
    ['4 — an extraordinary-looking plan passes when every effect traces to a capability',
      /decomposes into/, /ESTABLISHED CAPABILITY/],
    ['5 — the new-category list is explicit and complete',
      /new biology/, /real mass or physical\ntransformation/, /mind access/, /time alteration/,
      /resurrection/, /teleportation/, /bodily fusion/, /newly acquired power/, /new metaphysical mechanism/],
    ['6 — complete packet + ungroundable new category → violation',
      /plan needs a materially new category of effect, the packet is COMPLETE/],
    ['7 — truncated packet + ungroundable category → cannot_decide',
      /cannot ground here AND the packet is\n\s*TRUNCATED/],
    ['8 — an explicit canon contradiction is always a violation',
      /AFFIRMATIVELY FORBIDS or DIRECTLY CONTRADICTS the plan/]
  ];
  clauses.forEach((c) => {
    const [name, ...rxs] = c;
    ok('clause ' + name, rxs.every((rx) => rx.test(g0.sys)), rxs.map(String).join(' '));
  });
  ok('the worked examples teach BOTH sides — the dragon and whale pass, the fire/flight and fusion do not',
    /SUPPORTED  someone with an established DISGUISE ability appears as a dragon/.test(g0.sys)
    && /SUPPORTED  twelve such people coordinate/.test(g0.sys)
    && /UNSUPPORTED  that disguised dragon breathes REAL fire/.test(g0.sys)
    && /UNSUPPORTED  those twelve FUSE into one real whale/.test(g0.sys));
  ok('it says plainly that disguise grants appearance and NOT biology, mass or physics',
    /Disguise grants APPEARANCE\. It does not grant new biology, mass, or physics/.test(g0.sys));
  ok('RED PROOF — the blunt "silence is permission" rule that over-corrected is GONE',
    !/CANON SILENCE IS PERMISSION, NEVER PROHIBITION/.test(g0.sys));
  ok('...but the absence-as-prohibition correction it existed for SURVIVES',
    /CANON SILENCE IS NOT PROHIBITION/.test(g0.sys) && /does not describe X/.test(g0.sys));
  ok('and silence is explicitly NOT extended to a new category of effect',
    /silence\ndoes not permit a new CATEGORY of effect either/.test(g0.sys));
  const g0v1 = await build(X[0], 1);
  ok('RED PROOF — v1 contains none of the compositional rule', !/CAPABILITY-ROOTED EXTRAPOLATION/.test(g0v1.sys));

  section('3. THE GROUNDING CAPABILITY ACTUALLY REACHES THE PACKET');
  const caps = g0.facts.filter((f) => f.kind === 'cap');
  caps.forEach((f) => console.log('      [' + f.id + '] ' + f.text.slice(0, 100)));
  ok('the fixture\'s established capability arrives as a real cap_ fact from the real builder',
    caps.some((f) => /alter their own APPEARANCE at will/.test(f.text)), JSON.stringify(caps.map((f) => f.id)));
  ok('and it states its own limit — appearance only, no strength, mass, organs or new ability',
    caps.some((f) => /confers no strength, no mass, no new organs/.test(f.text)));
  const twelve = await build(X[1], 2);
  ok('the twelve-Kwisheen fixture supplies BOTH the ability and the fact that twelve hold it',
    twelve.facts.filter((f) => f.kind === 'cap').length >= 2,
    JSON.stringify(twelve.facts.filter((f) => f.kind === 'cap').map((f) => f.id)));
  const limitFx = await build(X[6], 2);
  ok('the explicit-limit red supplies the limit it contradicts',
    limitFx.facts.some((f) => f.kind === 'cap' && /CANNOT be held while unconscious/.test(f.text)));

  section('4. THE DETERMINISTIC PRE-GATE DOES NOT SHOOT THE GREENS');
  // A green blocked here never reaches the auditor at all, and the semantic rule would be moot.
  for (const fx of X.filter((f) => f.expect === 'pass')) {
    const b = await build(fx, 2);
    ok('GREEN ' + fx.id + ' survives the deterministic grounding check',
      !b.det.flagged, JSON.stringify(b.det.reasons));
  }

  section('5. THE FIXTURES SEPARATE THE TWO FAILURE MODES, NOT MERELY "EXOTIC vs PLAIN"');
  // The point of the set: reds and greens are EQUALLY extraordinary-looking. What differs is the
  // category of effect. If the greens were the plain ones, the set would prove nothing.
  const dragonG = X.find((f) => f.id === 'x_green_dragon_appearance');
  const dragonR = X.find((f) => f.id === 'x_red_dragon_fire_and_flight');
  ok('the dragon GREEN and the dragon RED share the same capability and the same form',
    JSON.stringify(dragonG.capabilityFacts) === JSON.stringify(dragonR.capabilityFacts)
    && /dragon/.test(dragonG.plan.state_change) && /dragon/.test(dragonR.plan.state_change));
  ok('they differ ONLY in category of effect — appearance vs real fire and real flight',
    /gaining no dragon abilities/.test(dragonG.plan.state_change)
    && /breathes real fire.*physically flies/i.test(dragonR.plan.state_change));
  const whaleG = X.find((f) => f.id === 'x_green_twelve_whale');
  const whaleR = X.find((f) => f.id === 'x_red_twelve_fuse');
  ok('the whale GREEN keeps twelve separate beings; the whale RED demands real mass and fusion',
    /remaining twelve separate beings/.test(whaleG.plan.state_change)
    && /physically fuse/.test(whaleR.plan.state_change) && /real mass/.test(whaleR.plan.state_change));
  ok('every red names a category from the prompt\'s own new-category list',
    X.filter((f) => f.expect === 'violation').every((f) =>
      /fire|flies|fuse|mass|stops time|portal|unconscious/i.test(f.plan.state_change)));
  ok('every red declares expectCategories AND supportingFactKinds, so a lucky verdict is not a catch',
    X.filter((f) => f.expect === 'violation').every((f) =>
      Array.isArray(f.expectCategories) && f.expectCategories.length
      && Array.isArray(f.supportingFactKinds) && f.supportingFactKinds.length));
  ok('every green declares a mechanism_grounding, so none is short-circuited before the model',
    X.filter((f) => f.expect === 'pass').every((f) =>
      (f.plan.event_slots && f.plan.event_slots.mechanism_grounding) || f.plan.mechanism_grounding));

  section('6. CONTAINMENT');
  ok('zero provider dispatches — this control buys nothing',
    gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, fixtures: X, cost }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  console.log('\n  NOT PROVEN: that any model classifies these correctly. Dry cannot show that.');
  console.log('  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
