// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE GENERATED CONTINUATION'S STAGE CONTRACT — ONE CONSOLIDATED REAL-PATH PROOF
//
//  An unseeded story had no authoritative stage and no owned facts, so Character+ was
//  fail-closed for every generated continuation. The planner now returns a versioned
//  `stage_contract` — refs, presence modes, typed owned facts — which the backend validates
//  before anything grounds on it. The planner still selects NO psychology.
//
//  Driven through `__generateSceneSkeleton`, production's own planner call, with every provider
//  intercepted. Nothing is dispatched and nothing is enabled.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import vm from 'node:vm';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 620) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const MUT = process.env.SB_MUT || '';
let body = SRC;
if (MUT) {
  const [from, to] = MUT.split('@@TO@@');
  const n = body.split(from).length - 1;
  if (n !== 1) { console.error(`\n  MUTATION MARKER NOT UNIQUE: ${n}\n`); process.exit(2); }
  body = body.replace(from, to);
  try { new vm.Script(body, { filename: 'gsc.js' }); }
  catch (e) { console.error(`\n  MUTATED SOURCE DOES NOT PARSE: ${e && e.message}\n`); process.exit(2); }
}

const BASE = {
  environment_anchor: 'the salt-stiffened ledger rope across the harbour counter',
  structural_pacing: 'compressed', narrative_density: 'medium', dialogue_ratio: 'balanced',
  beat_style: 'escalating', tension_rhythm: 'rising', interlocutor_placement: 'across the counter',
  li_texture_beat: 'he squares the ledger without being asked',
  pc_body_callback: 'decision', li_body_callback: 'opening', antagonist_body_callback: null,
  staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
  environment_plus: { target: 'the harbour counter', axis: 'use' }, fusion: null };

const DOHKAR = 'role:first_sacrifice_presiding_dohkar';
const reply = (extra) => JSON.stringify(Object.assign({}, BASE, extra));

const browser = await chromium.launch({ headless: true });
let PLANNER = reply({});
const escaped = [], calls = [];

const ctx = await browser.newContext();
const page = await ctx.newPage();
await installSession(page);
await page.addInitScript(() => { window.__ctNoAutoBegin = true; });
async function wire(pg) {
 await pg.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let payload = ''; try { payload = route.request().postData() || ''; } catch (_) {}
  calls.push({ path, payload });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, content: PLANNER,
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: PLANNER } }] }) });
});
 await pg.route('**/app.js*', r => r.fulfill({ status: 200,
  contentType: 'application/javascript; charset=utf-8', body }));
 pg.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
}
await wire(page);
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.__generateSceneSkeleton && window.__CP_STAGE_CONTRACT, { timeout: 60000 });

// UNSEEDED: no _starterId, so there is no seed sceneOne and no assignment row — the exact story
// shape that was fail-closed before this contract existed.
const run = async (plannerReply, tag) => {
  PLANNER = plannerReply;
  const c = await browser.newContext();
  const pg = await c.newPage();
  await installSession(pg);
  await pg.addInitScript(() => { window.__ctNoAutoBegin = true; });
  await wire(pg);
  await pg.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pg.waitForFunction(() => window.state && window.__generateSceneSkeleton, { timeout: 60000 });
  const r = await pg.evaluate(async (t) => {
    const s = window.state;
    Object.assign(s, { _starterId: null, is_starter_story: false,
      world: 'Fatelands', worldSubtype: 'fatelands_core',
      name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
      pov: 'first_person', storyId: 'gsc-' + t, turnCount: 3, scenes: ['a', 'b', 'c'],
      sceneSkeleton: null, issueNumber: 1 });
    s._relationshipLedger = null; s._cpGeneratedStage = null; s._cpGeneratedStageReport = null;
    const L = window._relLedger(true) || (s._relationshipLedger =
      { v: 1, storyId: String(s.storyId), processed: {}, entities: {}, edges: {}, seq: 0 });
    L.entities['role:first_sacrifice_presiding_dohkar'] = { id: 'role:first_sacrifice_presiding_dohkar',
      kind: 'role', label: 'the presiding Dohkar', aliases: ['the presiding Dohkar'],
      // Facets stand in for what a CHARACTER_PORTFOLIO call would mint. The stage contract
      // supplies PRESENCE and FACTS; psychology still has to come from somewhere, and for an
      // unseeded story that source does not exist yet — a separate, named gap.
      authorProfile: { status: 'ready', origin: 'generated_cast', cPlusFacets: [{ facet_id: 'gen:dohkar:v1:worldview', category: 'worldview',
        canonical_truth: 'Routine ceremony rarely deserves his full attention.',
        forbidden_restatements: [], pressures: [],
        possible_pressures: [{ text: 'a rite he has performed many times', evidence_requires: 'rite' }] }] } };
    await window.__generateSceneSkeleton('she pushes past the clerk', 'I need the manifest cleared.', {});
    const sk = s.sceneSkeleton || {};
    const stage = window._sceneStageContract(s, 4);
    return { report: s._cpGeneratedStageReport, cp: (sk.character_plus || []),
             plannerSupplied: sk._cpPlannerSupplied,
             contract: s._cpContinuationContract,
             stageOk: !!(stage && stage.ok), stageSource: stage && stage.source,
             authorityOk: !!(stage && stage.stageAuthority && stage.stageAuthority.ok),
             provenance: stage && stage.stageAuthority && stage.stageAuthority.provenance,
             onStage: (stage && stage.onStage || []).map(x => ({ id: x.id, presence: x.presence })),
             facts: (stage && stage.eventFacts || []).length };
  }, tag);
  await c.close().catch(() => {});
  return r;
};

const GOOD = { v: 1,
  participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }, { ref: DOHKAR, presence: 'IN_PERSON' }],
  event_facts: [{ text: 'he performs the rite without looking up',
                  participants: [{ ref: DOHKAR, role: 'actor' }, { ref: 'pc:self', role: 'subject' }] }] };

// ══ 1. A VALID STAGE MAKES THE SCENE AUTHORITATIVE, AND C+ IS MINTED BACKEND-SIDE ══
const V = await run(reply({ stage_contract: GOOD }), 'valid');
ok('G1 ★ a validated generated stage is AUTHORITATIVE for an unseeded continuation',
   V.report && V.report.ok === true && V.stageOk && V.authorityOk,
   JSON.stringify({ report: V.report, source: V.stageSource, authorityOk: V.authorityOk }));
ok('G2 ★ its provenance is planner_stage — a claim about THIS scene, not pre-existing truth',
   V.provenance === 'planner_stage' && /^generated:/.test(String(V.stageSource)),
   `provenance=${V.provenance} source=${V.stageSource}`);
ok('G3 ★ presence came from the contract, by issued ref — never inferred from a roster',
   V.onStage.length === 2 && V.onStage.every(x => x.presence === 'IN_PERSON')
   && V.onStage.some(x => x.id === DOHKAR), JSON.stringify(V.onStage));
ok('G4 ★ the backend minted a grounded Character+ from it, naming the exact facet',
   V.cp.length >= 1 && V.cp.every(c => c.canonicalId && c.facet_id && c.option_id
     && c.source === 'backend_continuation'),
   JSON.stringify(V.cp).slice(0, 320) + ' | reason=' + (V.contract && V.contract.reason));

// ══ 2. REJECTIONS — EACH REJECTS THE WHOLE CONTRACT AND SKIPS C+ ══
const bad = async (tag, sc) => {
  const R = await run(reply({ stage_contract: sc }), tag);
  return { code: R.report && R.report.code, ok: R.report && R.report.ok,
           cp: R.cp.length, stageOk: R.stageOk, contract: R.contract };
};
const U = await bad('unissued', { v: 1,
  participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }, { ref: 'named:someone_invented', presence: 'IN_PERSON' }],
  event_facts: GOOD.event_facts });
ok('G5 ★ an UNISSUED ref rejects the whole contract, and C+ is skipped',
   U.ok === false && U.code === 'whole_contract_rejected' && U.cp === 0, JSON.stringify(U));
const BN = await bad('barename', { v: 1,
  participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }, { ref: 'Mara Dunn', presence: 'IN_PERSON' }],
  event_facts: GOOD.event_facts });
ok('G6 ★ a BARE NAME is not a ref — whole contract rejected, C+ skipped',
   BN.ok === false && BN.code === 'whole_contract_rejected' && BN.cp === 0, JSON.stringify(BN));
const DUP = await bad('duplicate', { v: 1,
  participants: [{ ref: DOHKAR, presence: 'IN_PERSON' }, { ref: DOHKAR, presence: 'ANTICIPATED' }],
  event_facts: GOOD.event_facts });
ok('G7 ★ a DUPLICATE ref rejects the whole contract, C+ skipped',
   DUP.ok === false && DUP.code === 'whole_contract_rejected' && DUP.cp === 0, JSON.stringify(DUP));
const NOMODE = await bad('nomode', { v: 1,
  participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }, { ref: DOHKAR }],
  event_facts: GOOD.event_facts });
ok('G8 ★ a participant with NO explicit presence mode rejects the whole contract',
   NOMODE.ok === false && NOMODE.code === 'whole_contract_rejected' && NOMODE.cp === 0, JSON.stringify(NOMODE));
const MAL = await run(reply({ stage_contract: 'not an object' }), 'malformed');
ok('G9 ★ a malformed stage_contract is refused, C+ skipped, and the scene still plans',
   MAL.report && MAL.report.ok === false && MAL.cp.length === 0
   && (MAL.contract ? MAL.contract.ok === false : true),
   JSON.stringify({ report: MAL.report, cp: MAL.cp.length }));
const ABSENT = await run(reply({}), 'absent');
ok('G10 ★ no stage_contract at all → fail-closed, and the ordinary scene still proceeds',
   ABSENT.report && ABSENT.report.ok === false && ABSENT.cp.length === 0
   && ABSENT.stageOk === false, JSON.stringify(ABSENT.report));

// ══ 3. THE SIZE BOUND — AT LIMIT ACCEPTED, ONE OVER REJECTED ══
const BOUNDS = await page.evaluate(() => window.__CP_STAGE_CONTRACT);
ok('G11 the bounds are declared centrally, not at the call site',
   BOUNDS.genStageMaxBytes === 900 && BOUNDS.genStageWholeReject === true
   && BOUNDS.genStageProvenance === 'planner_stage', JSON.stringify(BOUNDS));
const sized = await page.evaluate((dohkar) => {
  const enc = (o) => new TextEncoder().encode(JSON.stringify(o)).length;
  const mk = (padLen) => ({ v: 1,
    participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }, { ref: dohkar, presence: 'IN_PERSON' }],
    event_facts: [{ text: 'x'.repeat(Math.max(1, padLen)),
                    participants: [{ ref: dohkar, role: 'actor' }] }] });
  let pad = 1;
  while (enc(mk(pad)) < 900 && pad < 4000) pad++;
  const atLimit = enc(mk(pad)) === 900 ? mk(pad) : mk(pad - (enc(mk(pad)) - 900));
  const over = mk(pad + (900 - enc(mk(pad))) + 1);
  const call = (sc) => window._cpIngestGeneratedStage(sc, ['pc:self', dohkar], 'gsc-bound', 4, 'pc');
  return { atBytes: enc(atLimit), overBytes: enc(over),
           at: call(atLimit), ov: call(over) };
}, DOHKAR);
ok('G12 ★ a contract exactly AT the 900-byte bound is accepted',
   sized.atBytes === 900 && sized.at.ok === true,
   JSON.stringify({ atBytes: sized.atBytes, code: sized.at.code }));
ok('G13 ★ …and one byte OVER is rejected as over_size_bound',
   sized.overBytes === 901 && sized.ov.ok === false && sized.ov.code === 'over_size_bound',
   JSON.stringify({ overBytes: sized.overBytes, code: sized.ov.code }));

// ══ 4. OWNERSHIP: target never manufactures pressure ══
const ROLES = await page.evaluate(() => window.__CP_GROUNDING_ROLES || null);
const TGT = await run(reply({ stage_contract: { v: 1,
  participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }, { ref: DOHKAR, presence: 'IN_PERSON' }],
  event_facts: [{ text: 'the clerk turns the ledger toward him',
                  participants: [{ ref: DOHKAR, role: 'target' }] }] } }), 'targetonly');
ok('G14 ★ a fact owning the Dohkar only as TARGET grounds no pressure for him — no C+ minted',
   TGT.report && TGT.report.ok === true && TGT.cp.length === 0,
   `report=${JSON.stringify(TGT.report)} cp=${JSON.stringify(TGT.cp)} reason=${TGT.contract && TGT.contract.reason}`);
const XCHAR = await run(reply({ stage_contract: { v: 1,
  participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }, { ref: DOHKAR, presence: 'IN_PERSON' }],
  event_facts: [{ text: 'the protagonist counts what she has already signed for',
                  participants: [{ ref: 'pc:self', role: 'actor' }] }] } }), 'crosschar');
ok('G15 ★ a fact owned by the PC does not ground the Dohkar — ownership is per character',
   XCHAR.report && XCHAR.report.ok === true
   && XCHAR.cp.every(c => c.canonicalId !== DOHKAR),
   `cp=${JSON.stringify(XCHAR.cp).slice(0, 240)}`);

// ══ 5. THE PLANNER STILL ASSIGNS NO PSYCHOLOGY ══
const HOSTILE = await run(reply({ stage_contract: GOOD,
  character_plus: [{ character: 'Julian', first_mention: true, angle: 'FAKE-ANGLE',
                     facet_id: 'FAKE-FACET', option_id: 'OPT-999' }] }), 'hostile');
ok('G16 ★ a volunteered character_plus is DISCARDED — the fake facet and option reach nothing',
   HOSTILE.plannerSupplied === 1
   && !/FAKE-FACET|OPT-999|FAKE-ANGLE/.test(JSON.stringify(HOSTILE.cp)),
   `supplied=${HOSTILE.plannerSupplied} cp=${JSON.stringify(HOSTILE.cp).slice(0, 260)}`);
const askedFor = calls.filter(c => /stage_contract/.test(c.payload || '')).length;
ok('G17 the prompt asks for a stage and forbids psychology in the same breath',
   askedFor > 0 && calls.some(c => /Do NOT return character_plus, facet_id, option_id/.test(c.payload || '')),
   `payloadsMentioningContract=${askedFor}`);
ok('G18 ★ only actor/subject/speaker may ground — target is not a grounding role',
   Array.isArray(ROLES) ? (ROLES.indexOf('target') === -1)
     : SRC.includes("var CP_GROUNDING_ROLES = ['actor', 'subject', 'speaker'];"),
   JSON.stringify(ROLES));
ok('G19 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));

console.log('\n' + out.join('\n'));
console.log(`\n  valid    : ${JSON.stringify(V.report)} · cp=${JSON.stringify((V.cp||[]).map(c => c.character + '/' + c.facet_id))}`);
console.log(`  bound    : at=${sized.atBytes}B ok=${sized.at.ok} · over=${sized.overBytes}B code=${sized.ov.code}`);
console.log(`  requests : ${calls.length}, escaped ${escaped.length}`);
if (MUT) console.log(`  MUTATION applied`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
