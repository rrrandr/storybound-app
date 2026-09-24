// TEMPT OUTCOME CONTRACT CONTROL — proves prompt schema and validator cannot drift apart.
//
// Roman, after a paid run delivered a scene and committed nothing: "Eliminate the
// prompt-schema/validator drift structurally rather than relying on another assertion against
// inline text. Create one authoritative Tempt outcome contract descriptor that both renders the
// author's real reporting schema and drives _validateTemptFateOutcomeReport ... add a zero-cost
// preflight invariant that inspects the actual assembled request body ... If that invariant fails,
// abort before dispatch and identify the missing fields."
//
// The failure this exists to make impossible: scope/class fields were added to a builder no prompt
// called while the validator began requiring them. Every delivered outcome was rejected for
// omitting fields it was never asked for, and the controls stayed green because they asserted
// against the unused builder.
//
// Everything here runs against the REAL UI-shaped path with every provider stubbed. Zero dispatches.
//
// usage: node _tempt_fate_outcome_contract_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_outcome_contract_control_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

const SCENE1_DECISION = 'remain';
const WISH = 'everyone forgets the ceremony happened';

(async () => {
  console.log('=== TEMPT OUTCOME CONTRACT CONTROL (dry; zero provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await ctx.addInitScript(() => {
    window.__authorBodies = [];
    const orig = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        let body = '';
        try { body = (init && init.body) ? String(init.body) : ''; } catch (_) {}
        if (/\/api\//.test(url) && body.indexOf('decisionGateBeatIdx') !== -1) window.__authorBodies.push(body);
      } catch (_) {}
      return orig.apply(this, arguments);
    };
  });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  const parse = (req) => { try { return JSON.parse(req.postData() || '{}'); } catch (_) { return {}; } };
  const planFor = (b) => {
    const sys = (b.messages || []).find((m) => m.role === 'system');
    const usr = (b.messages || []).find((m) => m.role === 'user');
    const sysText = (sys && sys.content) || '';
    return buildScheduleAwareStubResponse(sysText, usr && usr.content, sysText.indexOf('ACTIVE INVOCATION THIS SCENE') !== -1);
  };
  gate.stub('/api/mistral-proxy', async () => ({ content: null }));
  gate.stub('/api/proxy', async (req) => ({ content: JSON.stringify(planFor(parse(req))) }));
  gate.stub('/api/chatgpt-proxy', async (req) => {
    const b = parse(req);
    if (JSON.stringify(b).includes('classify whether a fate-card')) return { choices: [{ message: { content: JSON.stringify({ scope: 'out_of_scope', reason: 'stubbed' }) } }] };
    return { choices: [{ message: { content: JSON.stringify(planFor(b)) } }] };
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._renderTemptOutcomeSchema && window._validateTemptFateOutcomeReport
    && window._temptOutcomePreflight && window._temptOutcomeRequiredFieldNames && window._temptOutcomeSceneRoster
    && window._renderBakedScene1, { timeout: 30000 });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. ONE SOURCE OF TRUTH — the schema is rendered from the same descriptor the validator uses');
  const required = await page.evaluate(() => window._temptOutcomeRequiredFieldNames());
  const rendered = await page.evaluate(() => window._renderTemptOutcomeSchema(true));
  console.log('    validator can require ' + required.length + ' fields: ' + required.join(', '));
  const missingFromRender = required.filter((n) => rendered.indexOf(n) === -1);
  ok('every field the validator can require is emitted by the renderer — drift is structurally impossible, not merely asserted',
    missingFromRender.length === 0, 'missing=' + JSON.stringify(missingFromRender));
  ok('there is no second, unused schema builder left to drift', await page.evaluate(() => typeof window._buildTemptFateOutcomeReportingSchema === 'undefined'));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. THE REAL UI-SHAPED PATH — capture the ACTUAL author request');
  await page.evaluate(() => {
    window.state.storyId = 'contract-' + Date.now();
    window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
    window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
    window.state.turnCount = 0; window.state.scenes = [];
    window.state.subscribed = true; window.state.fortunes = 9999999; window.state.access = 'sub';
    window.state._starterId = 'starter_first_sacrifice';
    window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
    window._devBypass = true; window.state._intimacyDevMode = true;
    window._renderBakedScene1({ id: 'starter_first_sacrifice' }, window._bakedScene1For('starter_first_sacrifice'));
  });
  await page.waitForFunction(() => { const s = document.getElementById('splashOverlay'); return !s || s.classList.contains('splash-done'); }, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window._mountSceneDecisionPrompt(null));
  const keys = await page.evaluate(() => ({ a: document.getElementById('sceneDecisionA').getAttribute('data-choice'), b: document.getElementById('sceneDecisionB').getAttribute('data-choice') }));
  await page.click(keys.a === SCENE1_DECISION ? '#sceneDecisionA' : '#sceneDecisionB', { timeout: 8000 });
  await page.click('.tempt-fate-card', { timeout: 8000 });
  await page.waitForSelector('.tempt-wish-columns', { timeout: 8000 });
  await page.click('.tempt-wish-columns', { timeout: 8000 });
  await page.fill('#temptZoomInput', WISH);
  await page.click('.tempt-proceed-btn', { timeout: 8000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
  await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 10000 });
  await page.fill('#gnActionInput', 'Lirael closes her eyes for a long moment, then opens them again.');
  await page.fill('#gnDialogueInput', '');
  gate.setPhase('scene-A', 32);
  await page.click('#gnSubmitBtn', { timeout: 10000 });
  await page.waitForFunction(() => (window.state.scenes || []).length >= 1, { timeout: 90000 }).catch(() => {});
  await page.waitForFunction(() => !window.state._stagedSubmitting, { timeout: 60000 }).catch(() => {});
  gate.closePhase();

  const authorBodies = await page.evaluate(() => window.__authorBodies || []);
  const authorBody = authorBodies[0] || '';
  fs.writeFileSync(path.join(OUT_DIR, 'author_body_len.txt'), String(authorBody.length));
  ok('a REAL author request was captured through the full UI-shaped path', authorBody.length > 1000, 'len=' + authorBody.length);

  const missingFromReal = required.filter((n) => authorBody.indexOf(n) === -1);
  ok('the ACTUAL author request represents every field the validator can require — universal AND all five class contracts',
    missingFromReal.length === 0, 'missing from the real request: ' + JSON.stringify(missingFromReal));
  ok('the preflight invariant ran and passed on the real request', consoleLines.some((t) => /preflight OK/.test(t)), consoleLines.filter((t) => /preflight/i.test(t)).slice(-2).join(' | '));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. A MINIMAL VALID MEMORY OUTCOME COMMITS');
  const committed = await page.evaluate(() => ({
    durable: (window.state._temptFateDurableConsequences || []).map((d) => ({ proposalId: d.proposalId, ruptureClass: d.ruptureClass, scopeMatch: d.scopeMatch, classDetail: d.classDetail }))
  }));
  ok('the stubbed minimal memory_perception outcome passed validation and COMMITTED through the production path',
    committed.durable.length === 1 && committed.durable[0].ruptureClass === 'memory_perception', JSON.stringify(committed).slice(0, 400));
  const cd0 = (committed.durable[0] || {}).classDetail || {};
  ok('the committed canon record carries the invoker exemption — a later scene can read WHY Lirael still remembers',
    cd0.invokerExemption && cd0.invokerExemption.who === 'Lirael' && cd0.invokerExemption.reason === 'invoker_anchor', JSON.stringify(cd0.invokerExemption));
  ok('the committed canon record resolves the speaking witness BY NAME, not absorbed into a collective',
    Array.isArray(cd0.affectedKnowers) && cd0.affectedKnowers.some((k) => k.who === 'Julian' && k.disposition === 'suspects'), JSON.stringify(cd0.affectedKnowers));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3b. THE ROSTER IS READ FROM THE REAL RENDERED PLAN, AND IT BITES');
  // The shared fixture for every validator probe below (sections 3b, 4 and 7).
  const minimal = {
    delivered: true,
    changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }],
    durability: [{ aspect: 'the memory gap', status: 'persists' }],
    establishedEvidence: ['the assembly disperses without reference to it'],
    requestedScope: 'everyone forgets the ceremony happened',
    deliveredScope: 'every witness loses the memory',
    scopeMatch: 'full',
    ruptureClass: 'memory_perception',
    affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', nowKnows: 'nothing of the ceremony' }],
    invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor', note: 'keeps the anchor to what she changed' },
    unaccountedParties: []
  };
  // Roman, after the paid run committed scopeMatch:"full" while Julian spoke an unexplained line:
  // "Julian remains unaccounted for ... `scopeMatch: full` needs explicit accounting for all
  // non-invoker witnesses." The roster is not a keyword scan of prose — it is beat.speaker, the
  // same display name validateCGSpeakerDisplayNames already checks against the known cast.
  // Read the roster the PRODUCTION commit path actually computed and used, not one re-derived here.
  const rosterLine = consoleLines.filter((t) => /on-page speaking roster for scope accounting/.test(t)).pop() || '';
  const rosterFromRealPlan = rosterLine
    ? rosterLine.split('accounting: ')[1].split(', ').map((s) => s.trim()).filter((s) => s && s !== '(none — narration only)')
    : [];
  ok('the PRODUCTION commit path computed a non-empty speaking roster from the rendered beats (otherwise the check below is vacuous)',
    rosterFromRealPlan.length > 0 && rosterFromRealPlan.indexOf('Julian') !== -1, 'line=' + rosterLine);

  // RED PROOF — the EXACT shape the paid run committed: only "the assembly", Julian nowhere.
  const paidRunShape = await page.evaluate((args) => {
    const r = Object.assign({}, args.minimal, {
      affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', nowKnows: 'nothing of the ceremony' }]
    });
    return {
      withRoster: window._validateTemptFateOutcomeReport(r, { presentSpeakers: args.roster }),
      withoutRoster: window._validateTemptFateOutcomeReport(r)
    };
  }, { minimal, roster: rosterFromRealPlan });
  ok('the paid run\'s actual record — "the assembly" only — is REJECTED once the real roster is supplied, naming Julian',
    paidRunShape.withRoster.valid === false && paidRunShape.withRoster.errors.some((e) => e.indexOf('Julian') !== -1),
    JSON.stringify(paidRunShape.withRoster.errors));
  ok('that same record is accepted with NO roster — proving the rejection comes from the roster, not from some unrelated field',
    paidRunShape.withoutRoster.valid === true, JSON.stringify(paidRunShape.withoutRoster.errors));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. INVOKER ANCHOR IS THE DEFAULT — and self-targeting must be DECLARED, never silent');
  const invoker = await page.evaluate((args) => {
    const roster = ['Julian'];
    const withJulian = [{ who: 'the assembly', disposition: 'forgot', nowKnows: 'nothing' }, { who: 'Julian', disposition: 'forgot', nowKnows: 'nothing' }];
    const mk = (over) => Object.assign({}, args.minimal, { affectedKnowers: withJulian }, over);
    return {
      // The normal case: Lirael remembers, reason invoker_anchor, and the prose is NOT asked to justify it.
      anchor: window._validateTemptFateOutcomeReport(mk({}), { presentSpeakers: roster }),
      // Lirael never listed among the forgetters, and never named as exempt either.
      invokerUnnamed: window._validateTemptFateOutcomeReport(mk({ invokerExemption: { who: '', status: 'exempt', reason: 'invoker_anchor' } }), { presentSpeakers: roster }),
      // Self-targeting IS allowed — when the wording earned it and the report says so.
      selfTargeted: window._validateTemptFateOutcomeReport(mk({ invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'wish_explicitly_includes_self', note: 'the wish said "everyone, including me"' } }), { presentSpeakers: roster }),
      // Targeting the invoker on a bare assertion, with no wording reason and no note.
      silentlyTargeted: window._validateTemptFateOutcomeReport(mk({ invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'invoker_anchor' } }), { presentSpeakers: roster }),
      // Ambiguous wording may take the invoker — but must be declared as such, with a note.
      ambiguous: window._validateTemptFateOutcomeReport(mk({ invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'ambiguous_wording_consequence', note: '"everyone" was not qualified; Fate read her into it' } }), { presentSpeakers: roster }),
      // "full" while openly leaving someone unresolved is a contradiction.
      fullButUnaccounted: window._validateTemptFateOutcomeReport(mk({ unaccountedParties: ['Seren'] }), { presentSpeakers: roster }),
      // The same admission is fine once the match is downgraded to partial.
      // "narrower" is the real enum value for a partial grant; a non-full match also owes a scopeNote.
      narrowerAndUnaccounted: window._validateTemptFateOutcomeReport(mk({ scopeMatch: 'narrower', scopeNote: 'Seren\'s state is never established on the page', unaccountedParties: ['Seren'] }), { presentSpeakers: roster })
    };
  }, { minimal });
  ok('the DEFAULT invoker anchor validates with no justification anywhere in the report — the prose does not have to earn it',
    invoker.anchor.valid === true, JSON.stringify(invoker.anchor.errors));
  ok('an invoker who is neither forgetting nor named as exempt is REJECTED — silence about the protagonist is not an account',
    invoker.invokerUnnamed.valid === false, JSON.stringify(invoker.invokerUnnamed.errors));
  ok('an explicitly self-including wish MAY take the invoker, declared as wish_explicitly_includes_self',
    invoker.selfTargeted.valid === true, JSON.stringify(invoker.selfTargeted.errors));
  ok('targeting the invoker while still claiming reason "invoker_anchor" is REJECTED — self-targeting cannot be silent',
    invoker.silentlyTargeted.valid === false, JSON.stringify(invoker.silentlyTargeted.errors));
  ok('ambiguous wording may take the invoker when declared as a wording consequence WITH a note',
    invoker.ambiguous.valid === true, JSON.stringify(invoker.ambiguous.errors));
  ok('scopeMatch "full" with a party openly listed as unaccounted is REJECTED',
    invoker.fullButUnaccounted.valid === false, JSON.stringify(invoker.fullButUnaccounted.errors));
  ok('the same honest admission is ACCEPTED at scopeMatch "narrower" with a scopeNote — the rule forces the downgrade, not the omission',
    invoker.narrowerAndUnaccounted.valid === true, JSON.stringify(invoker.narrowerAndUnaccounted.errors));

  // A named party with no stated disposition is the old shape: present in the record, unresolved
  // in substance. "Listed" is not "accounted for".
  const noDisposition = await page.evaluate((m) => window._validateTemptFateOutcomeReport(
    Object.assign({}, m, { affectedKnowers: [{ who: 'the assembly', nowKnows: 'nothing of the ceremony' }] })), minimal);
  ok('a knower listed WITHOUT a disposition is REJECTED — naming someone is not resolving them',
    noDisposition.valid === false && noDisposition.errors.some((e) => e.indexOf('disposition') !== -1), JSON.stringify(noDisposition.errors));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. REMOVE EACH REQUIRED FIELD IN TURN — every one must cause rejection');
  const baseValid = await page.evaluate((m) => window._validateTemptFateOutcomeReport(m), minimal);
  ok('the minimal report is valid as a baseline (otherwise the removals below prove nothing)', baseValid.valid === true, JSON.stringify(baseValid));
  const removable = ['requestedScope', 'deliveredScope', 'scopeMatch', 'ruptureClass', 'affectedKnowers', 'invokerExemption', 'unaccountedParties'];
  const removalResults = await page.evaluate((args) => {
    const out = {};
    args.fields.forEach((f) => { const c = Object.assign({}, args.minimal); delete c[f]; out[f] = window._validateTemptFateOutcomeReport(c); });
    return out;
  }, { minimal, fields: removable });
  removable.forEach((f) => {
    ok('removing "' + f + '" is REJECTED', removalResults[f].valid === false && removalResults[f].errors.some((e) => e.indexOf(f) !== -1), JSON.stringify(removalResults[f].errors));
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. A NON-MEMORY CLASS VALIDATES WITHOUT ANY MEMORY-ONLY FIELDS');
  const possession = await page.evaluate(() => window._validateTemptFateOutcomeReport({
    delivered: true,
    changed: [{ subject: 'The Answer', whatChanged: 'changed hands' }],
    durability: [{ aspect: 'possession', status: 'expires' }],
    establishedEvidence: ['the assembly saw her holding it'],
    requestedScope: 'put The Answer in my hand',
    deliveredScope: 'she holds it until the window closes',
    scopeMatch: 'full',
    ruptureClass: 'materialization_possession',
    materialEffects: [{ what: 'The Answer', whoHolds: 'Lirael', duration: 'until the rupture window closes' }]
  }));
  ok('a materialization_possession outcome validates with NO affectedKnowers and no other memory-only field',
    possession.valid === true, JSON.stringify(possession));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. THE PREFLIGHT ITSELF MUST FAIL when the emitted schema is deliberately incomplete');
  const pfBroken = await page.evaluate(() => {
    const full = window._renderTemptOutcomeSchema(true);
    // Strip one contract field from the emitted text — simulating exactly the drift that caused the
    // lost run: the validator can demand it, the schema no longer mentions it.
    const crippled = full.split('\n').filter((l) => l.indexOf('ruptureClass') === -1).join('\n');
    return { onFull: window._temptOutcomePreflight(full), onCrippled: window._temptOutcomePreflight(crippled) };
  });
  ok('preflight passes on the complete schema', pfBroken.onFull.ok === true, JSON.stringify(pfBroken.onFull));
  ok('preflight FAILS on a deliberately incomplete schema and NAMES the missing field — before any network release',
    pfBroken.onCrippled.ok === false && pfBroken.onCrippled.missing.indexOf('ruptureClass') !== -1, JSON.stringify(pfBroken.onCrippled));

  section('CONTAINMENT');
  ok('ZERO real provider dispatches across the whole control', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('OUTCOME CONTRACT CONTROL: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
