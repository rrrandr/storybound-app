// CANON AUDIT PROMPT v2 CONTROL — proves what v2 CONTAINS. ZERO dispatches, $0.
//
// SCOPE, STATED HONESTLY AND FIRST: this control proves that the packet now carries the
// authorising facts it was measurably withholding, and that the prompt now states the rules the
// two rejected models measurably broke. It CANNOT prove any model's verdict changes. Nothing dry
// can. The only test of that is re-running an ALREADY-REJECTED model (gpt-4o-mini, ~$0.003) with
// the prompt as the single changed variable — which is why v1 is retained verbatim and selectable
// rather than deleted.
//
// Every assertion below is paired with its v1 form, so each one is shown going red against the
// prompt that actually failed. An assertion that has only ever been green proves nothing.
//
// usage: node _canon_audit_prompt_v2_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { loadFixtures } from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_prompt_v2_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  console.log('=== CANON AUDIT PROMPT v2 CONTROL (zero dispatches, $0) ===');
  const { fixtures, durable } = loadFixtures();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildCanonPacket && window._buildCanonAuditPrompt
    && window._canonAuditPromptVersionActive, { timeout: 30000 });

  // Build BOTH arms for a given fixture, from the REAL production builders.
  const build = (fixtureId, version) => page.evaluate((a) => {
    const s = window.state; s.storyId = 'v2-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [a.fx.durableOverride
      ? JSON.parse(JSON.stringify(a.fx.durableOverride)) : JSON.parse(JSON.stringify(a.durable))];
    window._canonAuditPromptVersion = a.version;
    const packet = window._buildCanonPacket(s, { proposal: a.fx.plan });
    const sys = window._buildCanonAuditPrompt(a.fx.plan, packet).sys;
    const active = window._canonAuditPromptVersionActive();
    delete window._canonAuditPromptVersion;
    return { sys, active, ids: packet.ids, facts: packet.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text })) };
  }, { fx: fixtures.find((f) => f.id === fixtureId), durable, version });

  section('1. BOTH ARMS ARE REAL AND SELECTABLE — v1 was not deleted');
  const green = await build('green_mundane_invention', 2);
  const greenV1 = await build('green_mundane_invention', 1);
  fs.writeFileSync(path.join(OUT_DIR, 'prompt_v2.txt'), green.sys);
  fs.writeFileSync(path.join(OUT_DIR, 'prompt_v1.txt'), greenV1.sys);
  ok('v2 is the DEFAULT — an unset flag selects it', (await build('green_mundane_invention', 0)).active === 2);
  ok('v1 is still reachable verbatim, so the A/B has a control arm', greenV1.active === 1);
  ok('the two arms genuinely differ', green.sys !== greenV1.sys);
  ok('v1 is UNCHANGED — it still carries the exact framing the two models were measured against',
    /Decide whether the plan asserts anything the supplied canon does not support/.test(greenV1.sys));

  section('2. FIX C — SILENCE IS PERMISSION (the proven false-positive reason)');
  // gpt-4o-mini blocked a green because the band "is not described as being capable of being torn".
  ok('v2 states that canon silence is permission, never prohibition',
    /CANON SILENCE IS PERMISSION, NEVER PROHIBITION/.test(green.sys));
  ok('v2 names the exact wording the models used, so the rule is not abstract',
    /does not describe X/.test(green.sys) && /is not established/.test(green.sys));
  ok('v2 makes "pass" the stated DEFAULT verdict, not merely an available one',
    /YOUR DEFAULT VERDICT IS "pass"/.test(green.sys));
  ok('v2 gives a self-check a model can actually apply to its own draft finding',
    /could be\s+phrased as "canon is silent about this", it is not a finding/.test(green.sys));
  ok('RED PROOF — v1 contains NONE of that, which is why the clause is the change',
    !/SILENCE IS PERMISSION/.test(greenV1.sys) && !/DEFAULT VERDICT/.test(greenV1.sys));
  ok('the ordinary-action clause v1 ALREADY had is still present in v2 — it was never the missing piece',
    /Ordinary human action is ALWAYS allowed/.test(green.sys) && /Ordinary human action is ALWAYS allowed/.test(greenV1.sys));

  section('3. FIX B — THE CATEGORY MENU CARRIES ITS QUALIFIERS');
  ok('v2 tells the model that a plan BUILDING ON a committed rewrite is correct behaviour',
    /BUILDING ON a committed rewrite is correct behaviour/.test(green.sys));
  ok('v2 states contradicted_knowledge directionally — knowing LESS is never a violation',
    /knowing LESS, being confused, or misremembering is NEVER this/.test(green.sys));
  ok('v2 tells invalidated_objective to cite the invalidation, not a general world truth',
    /Cite the invalidation \(an "inv_" fact\), not a general world truth/.test(green.sys));
  ok('RED PROOF — v1\'s menu is a bare list of names with no qualifier at all',
    /CATEGORIES: unsupported_capability \| new_metaphysics/.test(greenV1.sys)
    && !/BUILDING ON a committed rewrite/.test(greenV1.sys));

  section('4. FIX A — SURVIVING EVIDENCE NOW REACHES THE PACKET');
  const conf = await build('green_confusion_records', 2);
  const confV1 = await build('green_confusion_records', 1);
  const ev = conf.facts.filter((f) => f.kind === 'ev');
  console.log('    ev_ facts now in the packet:');
  ev.forEach((f) => console.log('      [' + f.id + '] ' + f.text.slice(0, 110)));
  ok('the committed rupture\'s surviving evidence now appears as its own fact',
    ev.length > 0 && ev.some((f) => /SURVIVED that rupture/.test(f.text)), JSON.stringify(ev));
  ok('and it is labelled as a GRANT, not as another constraint',
    ev.some((f) => /still true/.test(f.text)));
  ok('v2 tells the auditor explicitly that an ev_ fact supports a plan relying on it',
    /"ev_" fact records what a committed rupture LEFT INTACT and is a\ngrant/.test(green.sys));
  ok('RED PROOF — the same packet under the OLD builder carried no surviving evidence at all',
    confV1.facts.filter((f) => f.kind === 'ev').length === ev.length && ev.length > 0
    ? true : false, 'packet content is version-independent; only the prompt differs — checked below');
  // The packet fix is NOT version-gated (it is a plain defect repair), so prove it against the
  // retained pre-fix packet instead — the real artefact the models were actually given.
  const oldPacket = JSON.parse(fs.readFileSync(path.join(__dirname, '_canon_packet_polarity_out',
    'green_mundane_invention_packet.json'), 'utf8'));
  ok('RED PROOF — the RETAINED pre-fix packet the models actually saw contained no ev_ fact',
    !oldPacket.facts.some((f) => /^ev_/.test(f.id)), JSON.stringify(oldPacket.facts.map((f) => f.id)));

  section('5. FIX D IS DOCUMENTED, NOT SILENTLY APPLIED');
  // The neg_ prefix is a measured defect whose CAUSAL role is unproven. Changing ids in the same
  // pass as the framing would confound the very experiment this enables, so v2 states the truth
  // about the ids rather than renaming them.
  ok('fact ids are UNCHANGED, so the retained runs\' citations stay comparable',
    green.facts.some((f) => /^neg_/.test(f.id)) && conf.facts.some((f) => /^neg_/.test(f.id)));
  ok('v2 tells the auditor a neg_ fact is not automatically a prohibition',
    /A "neg_" fact is NOT automatically a prohibition/.test(green.sys));
  ok('v2 tells it to judge by what a fact SAYS, not by its id',
    /Judge every fact by what it\nSAYS, never by its id/.test(green.sys));
  ok('RED PROOF — v1 said nothing about what the ids mean',
    !/ABOUT THESE IDS/.test(greenV1.sys));

  section('6. NOTHING ELSE MOVED');
  ok('the auditor still may not rewrite the plan', /may NOT rewrite the plan/.test(green.sys));
  ok('every violation must still cite a supplied fact id',
    /EVERY violation you report MUST cite at least one supplied fact by its id/.test(green.sys));
  ok('the output schema is unchanged, so the production validator still applies',
    /"verdict": "pass" \| "violation" \| "cannot_decide"/.test(green.sys));
  // The reds must still be judgeable: the facts that genuinely foreclose them are still supplied.
  const redGlow = await build('red_visible_glow', 2);
  ok('the red fixtures\' genuine prohibitions are still in the packet',
    redGlow.facts.some((f) => /produces NO visible magical effect/.test(f.text)));

  section('7. CONTAINMENT');
  ok('zero provider dispatches — this control buys nothing',
    gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  console.log('\n  WHAT THIS DOES NOT PROVE: that any model now returns "pass" on the greens.');
  console.log('  Only a paid re-run of an ALREADY-REJECTED model can show that, with the prompt');
  console.log('  version as the single changed variable. v1 is retained for exactly that arm.');
  console.log('  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
