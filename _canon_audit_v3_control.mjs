// CANON AUDIT v3 CONTROL — packet wording, rubric, and red-fixture soundness. ZERO dispatches, $0.
//
// v3 fixes a claim v2 made that was simply FALSE and that measurably misled two independent models.
// v2's packet emitted every establishedEvidence entry as "SURVIVED that rupture and is still true",
// and its prompt told the auditor an ev_ fact "records what a committed rupture LEFT INTACT". Both
// grok-4.3 and claude-haiku-4-5 then cited ev_0 — "no one names the accusation", a snapshot of the
// instant the outcome landed — as though it forbade anyone ever naming it later.
//
// Two models agreeing is not corroboration when the packet misled them identically. That is the
// whole lesson of this control, and every assertion below is paired with the v2 form it replaces.
//
// usage: node _canon_audit_v3_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { loadFixtures, scoreFixture } from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_v3_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  console.log('=== CANON AUDIT v3 CONTROL (zero dispatches, $0) ===');
  const { fixtures, durable } = loadFixtures();
  const redCK = fixtures.find((f) => f.id === 'red_contradicted_knowledge');
  const redIO = fixtures.find((f) => f.id === 'red_invalidated_objective');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildCanonPacket && window._buildCanonAuditPrompt
    && window._canonAuditPromptVersionActive, { timeout: 30000 });

  const build = (fx, version) => page.evaluate((a) => {
    const s = window.state; s.storyId = 'v3-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [JSON.parse(JSON.stringify(a.durable))];
    window._canonAuditPromptVersion = a.version;
    const packet = window._buildCanonPacket(s, { proposal: a.fx.plan });
    const sys = window._buildCanonAuditPrompt(a.fx.plan, packet).sys;
    const active = window._canonAuditPromptVersionActive();
    delete window._canonAuditPromptVersion;
    return { sys, active, facts: packet.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text })) };
  }, { fx: { plan: fx.plan }, durable, version });

  section('1. THE PACKET NO LONGER PROMOTES A MOMENT INTO A RULE');
  const ck = await build(redCK, 3);
  fs.writeFileSync(path.join(OUT_DIR, 'packet_v3.json'), JSON.stringify(ck.facts, null, 2));
  const ev = ck.facts.filter((f) => f.kind === 'ev');
  ev.forEach((f) => console.log('      [' + f.id + '] ' + f.text.slice(0, 120)));
  ok('an establishedEvidence fact is labelled as an OBSERVATION AT A MOMENT',
    ev.some((f) => /OBSERVED at the moment that rupture landed/.test(f.text)), JSON.stringify(ev.map((f) => f.text.slice(0, 60))));
  ok('...and says explicitly that it does NOT establish the thing still holds later',
    ev.some((f) => /NOT a standing rule/.test(f.text) && /does not by itself establish that this still holds later/.test(f.text)));
  ok('RED PROOF — the false v2 wording "SURVIVED that rupture and is still true" is GONE',
    !ck.facts.some((f) => /SURVIVED that rupture and is still true/.test(f.text)));
  ok('RED PROOF — the retained v2 packet the models were actually shown DID carry it',
    /SURVIVED that rupture and is still true/.test(
      JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures',
        'canon_calibration_2026-09-25_02-36-54', 'red_contradicted_knowledge.json'), 'utf8')).result.prompt.sys));

  section('2. DURABILITY IS NOW STATED, HAVING BEEN OMITTED ENTIRELY');
  // The worst combination v2 achieved: emit a momentary observation AS durable, while withholding
  // the field that actually records durability.
  ok('the packet emits explicit durability statements from the commit record',
    ck.facts.some((f) => f.kind === 'dur' && /explicit DURABILITY statement/.test(f.text)),
    JSON.stringify(ck.facts.filter((f) => f.kind === 'dur').map((f) => f.text.slice(0, 80))));
  ok('RED PROOF — no dur_ fact appears in the retained v2 packet at all',
    !/\[dur_\d+\]/.test(JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures',
      'canon_calibration_2026-09-25_02-36-54', 'red_contradicted_knowledge.json'), 'utf8')).result.prompt.sys));

  section('3. THE PROMPT TELLS THE AUDITOR WHAT AN ev_ FACT IS — AND IS NOT');
  fs.writeFileSync(path.join(OUT_DIR, 'prompt_v3.txt'), ck.sys);
  ok('v3 is the default arm', (await build(redCK, 0)).active === 3);
  ok('v3 states that a moment is not a rule', /A MOMENT IS NOT A RULE/.test(ck.sys));
  ok('...in the model\'s own failing words — "no one named it at that moment" is not "may never"',
    /does not mean no one may ever name it/.test(ck.sys));
  ok('...and directs durability claims to facts that actually assert durability',
    /WHAT PERSISTS IS STATED EXPLICITLY/.test(ck.sys) && /"dur_" *\n?durability statement|"dur_"/.test(ck.sys));
  const ckV2 = await build(redCK, 2);
  ok('RED PROOF — v2 told the auditor the OPPOSITE, and is preserved unchanged as that arm',
    /records what a committed rupture LEFT INTACT and is a\ngrant/.test(ckV2.sys));
  ok('v3 does NOT carry that false sentence', !/LEFT INTACT and is a\ngrant/.test(ck.sys));
  ok('v1 is still reachable and untouched', (await build(redCK, 1)).active === 1);

  section('4. THE RUBRIC JUDGES WHAT A FACT ASSERTS, NOT ITS PREFIX');
  ok('no red fixture uses a blanket id-prefix whitelist any more',
    fixtures.filter((f) => f.expect === 'violation').every((f) => typeof f.supportingFact === 'function'),
    fixtures.filter((f) => f.expect === 'violation').map((f) => f.id + ':' + typeof f.supportingFact).join(' '));
  ok('every red declares in words what a citation must assert',
    fixtures.filter((f) => f.expect === 'violation').every((f) => typeof f.supportingDescription === 'string' && f.supportingDescription.length > 20));
  // The two corrections Roman specified, tested against the REAL packet facts.
  const V = (cat, ids) => ({ valid: true, verdict: 'violation', violations: [{ category: cat, claim: 'x', citedFactIds: ids, why: 'y' }] });
  const io = await build(redIO, 3);
  ok('CORRECTION 1 — "other" + neg_0 now COUNTS on red_invalidated_objective',
    scoreFixture(redIO, V('other', ['neg_0']), null, { facts: io.facts }).outcome === 'caught',
    JSON.stringify(scoreFixture(redIO, V('other', ['neg_0']), null, { facts: io.facts })));
  ok('...because that fact affirmatively forbids convening the inquiry this early',
    io.facts.some((f) => f.id === 'neg_0' && /never the convened inquiry|NOT yet convened/i.test(f.text)));
  ok('the recorded invalidation still counts too',
    scoreFixture(redIO, V('invalidated_objective', ['inv_0']), null, { facts: io.facts }).outcome === 'caught');
  ok('RED PROOF — an unrelated world truth still does NOT count',
    scoreFixture(redIO, V('other', ['neg_2']), null, { facts: io.facts }).outcome === 'unsupported_finding');
  ok('CORRECTION 2 — "other" + ev_0 is STILL NOT support on red_contradicted_knowledge',
    scoreFixture(redCK, V('other', ['ev_0']), null, { facts: ck.facts }).outcome === 'unsupported_finding',
    JSON.stringify(scoreFixture(redCK, V('other', ['ev_0']), null, { facts: ck.facts })));
  ok('...and the rejection explains WHY, naming the durable alternative',
    /never an ev_ observation of the moment/.test(scoreFixture(redCK, V('other', ['ev_0']), null, { facts: ck.facts }).note));
  ok('there is NO general ev_ whitelist — the ev_ kind is rejected on its assertion, not its prefix',
    !/supportingFactKinds: \['ev'/.test(fs.readFileSync(path.join(__dirname, '_canon_audit_calibration_core.mjs'), 'utf8')));

  section('5. red_contradicted_knowledge IS SOUND — a genuinely durable fact forecloses it');
  // Roman: if no genuinely durable supplied fact forecloses the plan, the fixture is mislabeled and
  // must be rewritten. It is not — two exist, and the v2 packet simply buried them under a louder,
  // false one.
  const durableFacts = ck.facts.filter((f) => redCK.supportingFact(f));
  durableFacts.forEach((f) => console.log('      supports: [' + f.id + '] ' + f.text.slice(0, 100)));
  ok('at least one genuinely DURABLE fact forecloses this plan, so the fixture stands unrewritten',
    durableFacts.length > 0, 'none — the fixture would have to be replaced');
  ok('it is a knowledge state or recorded change, not an observation',
    durableFacts.every((f) => f.kind !== 'ev') && durableFacts.some((f) => f.kind === 'know' || f.kind === 'dc'),
    JSON.stringify(durableFacts.map((f) => f.id + ':' + f.kind)));
  ok('citing that durable fact DOES score as caught',
    scoreFixture(redCK, V('contradicted_knowledge', [durableFacts[0].id]), null, { facts: ck.facts }).outcome === 'caught');
  ok('and "other" + that same durable fact also counts, since the prompt permits the category',
    scoreFixture(redCK, V('other', [durableFacts[0].id]), null, { facts: ck.facts }).outcome === 'caught');

  section('6. THE GREENS ARE UNCHANGED — this correction must not loosen them');
  ok('all four greens still expect a pass and none gained a supporting predicate',
    fixtures.filter((f) => f.expect === 'pass').length === 4
    && fixtures.filter((f) => f.expect === 'pass').every((f) => !f.supportingFact));
  ok('a green that returns violation is still a FALSE POSITIVE',
    scoreFixture(fixtures.find((f) => f.id === 'green_mundane_invention'), V('other', ['neg_1']), null, { facts: ck.facts }).outcome === 'FALSE_POSITIVE');

  section('7. CONTAINMENT');
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
