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
  // CANON AUDIT (wired to production 2026-09-24) — the gate sits between planner and author and
  // fails closed with no auditor answer, which would block every scene here for an unrelated
  // reason. Answered as a clean pass, keyed on the auditor's own system-prompt marker.
  gate.stub('/api/mistral-proxy', async (req) => {
    const b = parse(req);
    const sys = ((b.messages || []).find((m) => m.role === 'system') || {}).content || '';
    if (sys.indexOf('CANON AUDITOR') !== -1) return { content: JSON.stringify({ verdict: 'pass', violations: [] }) };
    return { content: null };
  });
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

  // MIGRATED 2026-09-24. The author used to be handed the whole outcome schema and asked to
  // self-certify; these assertions checked that it was. It is no longer asked at all — the
  // dedicated extractor reads the ACCEPTED page instead — so the assertion inverts: the author
  // request must NOT carry the outcome contract, and the EXTRACTOR's prompt must carry all of it.
  ok('the author is NO LONGER asked to self-certify the outcome — the schema is absent from the real author request',
    authorBody.indexOf('temptFateOutcome') === -1 && authorBody.indexOf('affectedKnowers') === -1,
    'author request still mentions the outcome contract');
  const extractorPrompt = await page.evaluate(() => {
    const p = window._tfoBuildExtractorPrompt({
      wishText: 'everyone forgets the ceremony happened', invokerName: 'Lirael',
      rosterNames: ['Lirael', 'Julian', 'the assembly'], prose: 'some accepted prose'
    });
    return p.sys + '\n' + p.usr;
  });
  const missingFromExtractor = required.filter((n) => extractorPrompt.indexOf(n) === -1);
  ok('the EXTRACTOR prompt represents every field the validator can require — the contract moved layer, it did not weaken',
    missingFromExtractor.length === 0, 'missing from the extractor prompt: ' + JSON.stringify(missingFromExtractor));
  ok('the preflight invariant is retired for the author path (it guarded a schema the author no longer receives)',
    !consoleLines.some((t) => /PREFLIGHT ABORT/.test(t)), consoleLines.filter((t) => /preflight/i.test(t)).slice(-2).join(' | '));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. A MINIMAL VALID MEMORY OUTCOME COMMITS');
  // MIGRATED 2026-09-24: persistence no longer commits. It writes a PENDING record; the extractor
  // reads the accepted page and commits. So the path is proven in two steps, not one.
  const pendingState = await page.evaluate(() => ({
    pending: Object.keys(window.state._temptOutcomePending || {}),
    durableBefore: (window.state._temptFateDurableConsequences || []).length,
    blocked: !!window._tfoContinuationBlocked(window.state)
  }));
  ok('scene persistence writes a PENDING outcome record rather than committing',
    pendingState.pending.length === 1 && pendingState.durableBefore === 0, JSON.stringify(pendingState));
  ok('...and the next continuation is blocked until it resolves',
    pendingState.blocked === true, JSON.stringify(pendingState));

  // Resolve it through the REAL resolver with the extractor response injected (no dispatch).
  const committed = await page.evaluate(async () => {
    const pend = window._tfoUnresolvedPending(window.state);
    const ctx = pend[0] && pend[0].ctx;
    const quote = (ctx && ctx.prose ? String(ctx.prose).split('\n').filter(Boolean)[0] : '') || '';
    const res = await window._tfoResolvePendingRecord(pend[0], { injectRaw: {
      delivered: true,
      changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }],
      durability: [{ aspect: 'the memory gap', status: 'persists' }],
      establishedEvidence: ['the clearing does not explain itself'],
      requestedScope: 'everyone forgets the ceremony happened',
      deliveredScope: 'every witness present loses the memory',
      scopeMatch: 'full', ruptureClass: 'memory_perception',
      targetPopulation: { kind: 'all_present_except_invoker' },
      affectedKnowers: [
        { who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing', evidenceQuote: quote },
        { who: 'Julian', disposition: 'suspects', memoryAbsent: true, suspicionFromResidue: true, nowKnows: 'nothing, but senses a gap', evidenceQuote: quote }
      ],
      invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor', note: 'anchor' },
      unaccountedParties: []
    } });
    return {
      res,
      durable: (window.state._temptFateDurableConsequences || []).map((d) => ({ proposalId: d.proposalId, ruptureClass: d.ruptureClass, scopeMatch: d.scopeMatch, classDetail: d.classDetail })),
      pendingLeft: Object.keys(window.state._temptOutcomePending || {}).length
    };
  });
  ok('the EXTRACTED, citation-checked outcome commits through the production resolver',
    committed.durable.length === 1 && committed.durable[0].ruptureClass === 'memory_perception' && committed.pendingLeft === 0,
    JSON.stringify(committed.res).slice(0, 300));
  const cd0 = (committed.durable[0] || {}).classDetail || {};
  ok('the committed canon record carries the invoker exemption — a later scene can read WHY Lirael still remembers',
    cd0.invokerExemption && cd0.invokerExemption.who === 'Lirael' && cd0.invokerExemption.reason === 'invoker_anchor', JSON.stringify(cd0.invokerExemption));
  ok('the committed canon record resolves the speaking witness BY NAME, not absorbed into a collective',
    Array.isArray(cd0.affectedKnowers) && cd0.affectedKnowers.some((k) => k.who === 'Julian' && k.disposition === 'suspects'), JSON.stringify(cd0.affectedKnowers));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3b. THE COMPOSITE ROSTER — built from resolved identities, wider than the speakers, and it BITES');
  // The shared fixture for every validator probe below (sections 3b, 4, 7 and 8).
  const minimal = {
    delivered: true,
    changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }],
    durability: [{ aspect: 'the memory gap', status: 'persists' }],
    establishedEvidence: ['the assembly disperses without reference to it'],
    requestedScope: 'everyone forgets the ceremony happened',
    deliveredScope: 'every witness loses the memory',
    scopeMatch: 'full',
    ruptureClass: 'memory_perception',
    targetPopulation: { kind: 'all_present_except_invoker' },
    affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of the ceremony' }],
    invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor', note: 'keeps the anchor to what she changed' },
    unaccountedParties: []
  };
  // Roman, after the paid run committed scopeMatch:"full" while Julian spoke an unexplained line:
  // "Julian remains unaccounted for ... `scopeMatch: full` needs explicit accounting for all
  // non-invoker witnesses." The roster is not a keyword scan of prose — it is beat.speaker, the
  // same display name validateCGSpeakerDisplayNames already checks against the known cast.
  // Read the roster the PRODUCTION commit path actually computed and used, not one re-derived here.
  // The log records each name with the sources that vouched for it, so "wider than the speakers"
  // is proven from the real path rather than asserted.
  const rosterLine = consoleLines.filter((t) => /composite present roster for scope accounting/.test(t)).pop() || '';
  let rosterEntries = [];
  try { rosterEntries = JSON.parse(rosterLine.split(' roster=')[1]); } catch (_) { rosterEntries = []; }
  const rosterFromRealPlan = rosterEntries.map((r) => r.name);
  console.log('    composite roster: ' + JSON.stringify(rosterEntries));
  ok('the PRODUCTION commit path computed a non-empty composite roster (otherwise every check below is vacuous)',
    rosterFromRealPlan.length > 0, 'line=' + rosterLine);
  // Every composite source must be LIVE on the real path, not merely coded. A source that never
  // fires here would be an untested branch dressed as coverage.
  const sourcesSeen = [...new Set(rosterEntries.flatMap((r) => r.sources))];
  ['invoker', 'love_interest', 'accepted_stage', 'declared_collective', 'beat_speaker'].forEach((src) => {
    ok('roster source "' + src + '" actually fired on the real path', sourcesSeen.includes(src), 'sources seen: ' + JSON.stringify(sourcesSeen));
  });
  // The decisive property: at least one roster member NEVER spoke. A speaker-only roster could not
  // have seen them, which is exactly the weakness this composite replaces.
  const silentMembers = rosterEntries.filter((r) => !r.sources.includes('beat_speaker'));
  ok('the composite is strictly WIDER than the speakers — it carries parties who never spoke a line',
    silentMembers.length > 0, 'silent members: ' + JSON.stringify(silentMembers.map((r) => r.name + ' [' + r.sources.join('+') + ']')));
  ok('...including a DECLARED COLLECTIVE, which by construction never speaks and so is invisible to any speaker-based roster',
    silentMembers.some((r) => r.sources.includes('declared_collective')),
    'silent members: ' + JSON.stringify(silentMembers));

  // RED PROOF — the EXACT shape the paid run committed: only "the assembly", everyone else nowhere.
  const paidRunShape = await page.evaluate((args) => {
    const r = Object.assign({}, args.minimal, {
      affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of the ceremony' }]
    });
    return {
      withRoster: window._validateTemptFateOutcomeReport(r, { presentRoster: args.roster }),
      withoutRoster: window._validateTemptFateOutcomeReport(r)
    };
  }, { minimal, roster: rosterFromRealPlan });
  // Every roster member except "the assembly" and the invoker must be named in the rejection.
  const expectedOmitted = rosterFromRealPlan.filter((n) => !/assembly/i.test(n) && !/lirael/i.test(n));
  ok('the paid run\'s actual record — "the assembly" only — is REJECTED against the composite roster, naming EVERY omitted party',
    paidRunShape.withRoster.valid === false &&
    expectedOmitted.length > 0 &&
    expectedOmitted.every((n) => paidRunShape.withRoster.errors.some((e) => e.indexOf(n) !== -1)),
    'expected named: ' + JSON.stringify(expectedOmitted) + ' — errors: ' + JSON.stringify(paidRunShape.withRoster.errors));
  ok('that same record is accepted with NO roster — proving the rejection comes from the roster, not from some unrelated field',
    paidRunShape.withoutRoster.valid === true, JSON.stringify(paidRunShape.withoutRoster.errors));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. INVOKER ANCHOR IS THE DEFAULT — and self-targeting must be DECLARED, never silent');
  const invoker = await page.evaluate((args) => {
    const roster = ['Julian'];
    const withJulian = [
      { who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing' },
      { who: 'Julian', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing' }
    ];
    const mk = (over) => Object.assign({}, args.minimal, { affectedKnowers: withJulian }, over);
    return {
      // The normal case: Lirael remembers, reason invoker_anchor, and the prose is NOT asked to justify it.
      anchor: window._validateTemptFateOutcomeReport(mk({}), { presentSpeakers: roster }),
      // Lirael never listed among the forgetters, and never named as exempt either.
      invokerUnnamed: window._validateTemptFateOutcomeReport(mk({ invokerExemption: { who: '', status: 'exempt', reason: 'invoker_anchor' } }), { presentSpeakers: roster }),
      // Self-targeting IS allowed — when the wording earned it, the report says so, AND the
      // invoker actually loses the memory like everyone else.
      selfTargeted: window._validateTemptFateOutcomeReport(mk({
        affectedKnowers: withJulian.concat([{ who: 'Lirael', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing' }]),
        invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'wish_explicitly_includes_self', note: 'the wish said "everyone, including me"' }
      }), { presentRoster: roster }),
      // Targeting the invoker on a bare assertion, with no wording reason and no note.
      silentlyTargeted: window._validateTemptFateOutcomeReport(mk({ invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'invoker_anchor' } }), { presentRoster: roster }),
      // Ambiguous wording may take the invoker — but must be declared as such, with a note.
      ambiguous: window._validateTemptFateOutcomeReport(mk({
        affectedKnowers: withJulian.concat([{ who: 'Lirael', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing' }]),
        invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'ambiguous_wording_consequence', note: '"everyone" was not qualified; Fate read her into it' }
      }), { presentRoster: roster }),
      // "full" while openly leaving someone unresolved is a contradiction.
      fullButUnaccounted: window._validateTemptFateOutcomeReport(mk({ unaccountedParties: ['Seren'] }), { presentRoster: roster }),
      // The same admission is fine once the match is downgraded.
      // "narrower" is the real enum value for a partial grant; a non-full match also owes a scopeNote.
      narrowerAndUnaccounted: window._validateTemptFateOutcomeReport(mk({ scopeMatch: 'narrower', scopeNote: 'Seren\'s state is never established on the page', unaccountedParties: ['Seren'] }), { presentRoster: roster })
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
  section('8. ACCOUNTED FOR ≠ AFFECTED — the seven cases that separate coverage from delivery');
  // Roman: "merely accounting for someone does not mean the wish affected them. A report could
  // currently list Julian as `retained`, leave `unaccountedParties` empty, and still claim
  // `scopeMatch: full`. That would be structurally complete but semantically narrower."
  const eff = await page.evaluate((args) => {
    const m = args.minimal;
    const ASSEMBLY = { who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of the ceremony' };
    // A roster carrying a character who never speaks, plus a collective that by construction never speaks.
    const ROSTER = ['Lirael', 'Julian', 'Seren', 'the assembly'];
    const mk = (over) => Object.assign({}, m, over);
    const v = (r, roster) => window._validateTemptFateOutcomeReport(r, roster ? { presentRoster: roster } : undefined);
    const julian = (d, extra) => Object.assign({ who: 'Julian', disposition: d, memoryAbsent: d === 'forgot', suspicionFromResidue: false, nowKnows: '—' }, extra || {});
    const seren = (d, extra) => Object.assign({ who: 'Seren', disposition: d, memoryAbsent: d === 'forgot', suspicionFromResidue: false, nowKnows: '—' }, extra || {});
    return {
      // 1. A NAMED BYSTANDER WHO NEVER SPOKE, omitted entirely.
      silentNamedOmitted: v(mk({ affectedKnowers: [ASSEMBLY, julian('forgot')] }), ROSTER),
      // 2. A DECLARED COLLECTIVE, omitted entirely (collectives never speak, so only the composite roster can see them).
      silentCollectiveOmitted: v(mk({ affectedKnowers: [julian('forgot'), seren('forgot')] }), ROSTER),
      // 3. Julian RETAINED but properly accounted for — complete coverage, incomplete delivery.
      retainedClaimingFull: v(mk({ affectedKnowers: [ASSEMBLY, julian('retained'), seren('forgot')] }), ROSTER),
      retainedDeclaredNarrower: v(mk({
        scopeMatch: 'narrower', scopeNote: 'Julian kept the memory; the rest of the assembly lost it',
        deliveredScope: 'every witness but Julian loses the memory',
        affectedKnowers: [ASSEMBLY, julian('retained'), seren('forgot')]
      }), ROSTER),
      // 4. Julian SUSPECTS from residue with no memory — the wish DID reach him.
      suspectsFromResidue: v(mk({
        affectedKnowers: [ASSEMBLY, julian('suspects', { memoryAbsent: true, suspicionFromResidue: true, nowKnows: 'nothing of the ceremony, but the torn band does not fit his morning' }), seren('forgot')]
      }), ROSTER),
      // 4b. ...versus "suspects" while still REMEMBERING: a retained memory wearing a softer word.
      suspectsButRemembers: v(mk({
        affectedKnowers: [ASSEMBLY, julian('suspects', { memoryAbsent: false, suspicionFromResidue: false, nowKnows: 'he remembers it and is uneasy' }), seren('forgot')]
      }), ROSTER),
      // 5. The standard invoker anchor under "full".
      invokerAnchorUnderFull: v(mk({ affectedKnowers: [ASSEMBLY, julian('forgot'), seren('forgot')] }), ROSTER),
      // 6. Explicit self-targeting, invoker RETAINED — inconsistent under "full".
      selfTargetedButRetained: v(mk({
        affectedKnowers: [ASSEMBLY, julian('forgot'), seren('forgot'), { who: 'Lirael', disposition: 'retained', memoryAbsent: false, suspicionFromResidue: false, nowKnows: 'she remembers everything' }],
        invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'wish_explicitly_includes_self', note: 'the wish said "make everyone including me forget"' }
      }), ROSTER),
      selfTargetedRetainedNarrower: v(mk({
        scopeMatch: 'narrower', scopeNote: 'the wish named herself but her own memory survived',
        affectedKnowers: [ASSEMBLY, julian('forgot'), seren('forgot'), { who: 'Lirael', disposition: 'retained', memoryAbsent: false, suspicionFromResidue: false, nowKnows: 'she remembers everything' }],
        invokerExemption: { who: 'Lirael', status: 'targeted', reason: 'wish_explicitly_includes_self', note: 'the wish said "make everyone including me forget"' }
      }), ROSTER),
      // 7. A NAMED-SUBSET wish: only the Dohkar was targeted. Bystanders must be ACCOUNTED FOR,
      //    but are under no obligation to forget anything.
      namedSubsetBystandersKeep: v(mk({
        requestedScope: 'make the presiding Dohkar forget what he saw',
        deliveredScope: 'the presiding Dohkar loses the memory',
        targetPopulation: { kind: 'named_subset', members: ['the presiding Dohkar'] },
        affectedKnowers: [
          { who: 'the presiding Dohkar', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of what he saw' },
          julian('retained'), seren('retained'),
          { who: 'the assembly', disposition: 'retained', memoryAbsent: false, suspicionFromResidue: false, nowKnows: 'everything, unchanged' }
        ]
      }), ROSTER.concat(['the presiding Dohkar'])),
      // 7b. ...but a named target the report never resolves is still rejected.
      namedSubsetTargetOmitted: v(mk({
        requestedScope: 'make the presiding Dohkar forget what he saw',
        targetPopulation: { kind: 'named_subset', members: ['the presiding Dohkar'] },
        affectedKnowers: [ASSEMBLY, julian('retained'), seren('retained')]
      }), ROSTER)
    };
  }, { minimal });

  ok('1. a silent NAMED bystander omitted from the record is REJECTED — a speaker-only roster could never have caught this',
    eff.silentNamedOmitted.valid === false && eff.silentNamedOmitted.errors.some((e) => e.indexOf('Seren') !== -1), JSON.stringify(eff.silentNamedOmitted.errors));
  ok('2. a silent declared COLLECTIVE omitted from the record is REJECTED — collectives never speak by construction',
    eff.silentCollectiveOmitted.valid === false && eff.silentCollectiveOmitted.errors.some((e) => /assembly/.test(e)), JSON.stringify(eff.silentCollectiveOmitted.errors));
  ok('3. Julian RETAINED but fully accounted for is REJECTED at "full" — the exact gap: structurally complete, semantically narrower',
    eff.retainedClaimingFull.valid === false && eff.retainedClaimingFull.errors.some((e) => /did not reach every targeted party/.test(e)), JSON.stringify(eff.retainedClaimingFull.errors));
  ok('3b. the SAME record declared "narrower" is VALID — the rule forces an honest downgrade, never an omission',
    eff.retainedDeclaredNarrower.valid === true, JSON.stringify(eff.retainedDeclaredNarrower.errors));
  ok('4. Julian SUSPECTS from residue with the memory genuinely absent may remain "full" — the wish did reach him',
    eff.suspectsFromResidue.valid === true, JSON.stringify(eff.suspectsFromResidue.errors));
  ok('4b. "suspects" while still REMEMBERING is REJECTED at "full" — a retained memory cannot pass as delivery',
    eff.suspectsButRemembers.valid === false, JSON.stringify(eff.suspectsButRemembers.errors));
  ok('5. the standard invoker anchor is ALLOWED under "full"',
    eff.invokerAnchorUnderFull.valid === true, JSON.stringify(eff.invokerAnchorUnderFull.errors));
  ok('6. explicit self-targeting with the invoker RETAINED is REJECTED at "full" as inconsistent',
    eff.selfTargetedButRetained.valid === false && eff.selfTargetedButRetained.errors.some((e) => /invoker/i.test(e)), JSON.stringify(eff.selfTargetedButRetained.errors));
  ok('6b. ...and is VALID once declared "narrower" — the second half of Roman\'s "narrower or rejected as inconsistent"',
    eff.selfTargetedRetainedNarrower.valid === true, JSON.stringify(eff.selfTargetedRetainedNarrower.errors));
  ok('7. a NAMED-SUBSET wish does NOT require unrelated bystanders to forget — they need accounting, not amnesia',
    eff.namedSubsetBystandersKeep.valid === true, JSON.stringify(eff.namedSubsetBystandersKeep.errors));
  ok('7b. ...but a declared target the report never resolves is still REJECTED',
    eff.namedSubsetTargetOmitted.valid === false && eff.namedSubsetTargetOmitted.errors.some((e) => /Dohkar/.test(e)), JSON.stringify(eff.namedSubsetTargetOmitted.errors));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. REMOVE EACH REQUIRED FIELD IN TURN — every one must cause rejection');
  const baseValid = await page.evaluate((m) => window._validateTemptFateOutcomeReport(m), minimal);
  ok('the minimal report is valid as a baseline (otherwise the removals below prove nothing)', baseValid.valid === true, JSON.stringify(baseValid));
  const removable = ['requestedScope', 'deliveredScope', 'scopeMatch', 'ruptureClass', 'targetPopulation', 'affectedKnowers', 'invokerExemption', 'unaccountedParties'];
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
