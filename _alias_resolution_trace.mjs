// ALIAS RESOLUTION TRACE. Provider-free, no network, no model calls, $0. READ-ONLY — no edits to
// public/app.js, no policy change. This answers Roman's five questions against the REAL resolution
// paths, and asserts each answer so a misreading on my part shows up as a failure rather than as a
// confident paragraph.
//
// WHY: the 5-sample run sealed a durable institution in all five draws, but 2/5 returned
// "aliases": []. Sample 3's own sealed content says "The commission has received and logged a
// formal demand" while its entity carries label "Toll Road Commission" and NO aliases — so the
// fact names the body by a surface form that may not resolve back to it. That is the gap.
//
// The three resolution paths that matter, read from source first:
//   _deliveryAnchorAliases(ref)  id hit, else EXACT normalised label or alias, FAIL-CLOSED on tie
//   existingRefs[]               requires reg[ref] — an entity ID key, nothing else
//   canon_change.targets[]       reg[id] OR an exact introduces[] label string
//   _relNorm                     lowercase + collapse non-alphanumerics. Does NOT strip articles.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._deliveryAnchorAliases === 'function', { timeout: 20000 });

console.log('=== ALIAS RESOLUTION TRACE (read-only, no network, $0) ===\n');

const r = await page.evaluate(() => {
  const out = {};
  const reset = (tag) => {
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-alias-' + tag;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._sceneLocalPressures = null;
    window.state._lastContinuationResult = null;
    window.state.turnCount = 50;
    window.state._scenePosture = { '50': { hash: 'ph-alias-' + tag } };
  };
  const res = (x) => { const v = window._deliveryAnchorAliases(x); return { ok: v.ok, why: v.why || null, id: v.entityId || null }; };

  // ── A. THE SAMPLE 1/3 SHAPE: a label-only institution, aliases []
  reset('A');
  const a = window._proposeNewEntity({ kind: 'institution', label: 'Toll Road Commission', aliases: [] });
  out.aId = a.ok ? a.entity.id : null;
  out.aStored = a.ok ? { label: a.entity.label, aliases: a.entity.aliases || [] } : null;
  out.a = {
    byId: res(out.aId),
    byExactLabel: res('Toll Road Commission'),
    byLowercaseLabel: res('toll road commission'),
    byPunctuatedLabel: res('Toll-Road  Commission'),
    byTheCommission: res('the commission'),
    byCommission: res('commission'),
    byTollRoad: res('Toll Road')
  };
  out.aInRegister = !!window._protectedRegisterIds()[out.aId];
  // does it satisfy a later existingRef — by id, and by label?
  // ISOLATION: the thing under test is existingRefs, so `targets` must point at something this
  // proposal INTRODUCES. An earlier version targeted the established entity too, which made every
  // case Tier 3 and demanded a basis — the fixture was testing tier derivation, not references.
  const mk = (refs, targets) => ({
    scene_purpose: 'A later scene relies on the body.',
    forward_pressure: 'It will act.', pressure_scope: 'durable',
    derivation: 'The player petitioned it.',
    introduces: [{ kind: 'role', label: 'the appointed investigator', aliases: ['the investigator'],
      justification: 'The person the body assigns.', future_relevance: 'Will take her statement.' }],
    existingRefs: refs,
    canon_change: { tier: 2, targets: targets, content: 'It opens the inquiry.' }
  });
  out.aRefById = window._validateContinuationProposal(mk([out.aId], ['the appointed investigator']));
  out.aRefByLabel = window._validateContinuationProposal(mk(['Toll Road Commission'], ['the appointed investigator']));
  out.aRefByAliasForm = window._validateContinuationProposal(mk(['the commission'], ['the appointed investigator']));
  // And separately: targeting the ESTABLISHED entity by its LABEL rather than its id.
  out.aTargetByLabel = window._validateContinuationProposal(mk([out.aId], ['Toll Road Commission']));

  // ── B. THE SAMPLE 2/4/5 SHAPE: the same label WITH the natural variant declared
  reset('B');
  const b = window._proposeNewEntity({ kind: 'institution', label: 'Toll Road Commission',
    aliases: ['the commission'] });
  out.bId = b.ok ? b.entity.id : null;
  out.b = {
    byExactLabel: res('Toll Road Commission'),
    byTheCommission: res('the commission'),
    byTheCommissionCapitalised: res('The Commission'),
    byCommissionBare: res('commission')
  };

  // ── C. COLLISION: two bodies declaring the SAME generic alias
  reset('C');
  const c1 = window._proposeNewEntity({ kind: 'institution', label: 'Toll Road Commission',
    aliases: ['the commission'] });
  const c2 = window._proposeNewEntity({ kind: 'institution', label: 'River Commission',
    aliases: ['the commission'] });
  out.cIds = [c1.ok ? c1.entity.id : null, c2.ok ? c2.entity.id : null];
  out.cSecondAccepted = !!c2.ok;
  out.cSecondWhy = c2.ok ? null : (c2.why || c2.reason || null);
  out.c = {
    byGenericAlias: res('the commission'),
    byFirstLabel: res('Toll Road Commission'),
    bySecondLabel: res('River Commission')
  };

  // ── D. COLLISION: an alias that equals ANOTHER entity's canonical label
  reset('D');
  const d1 = window._proposeNewEntity({ kind: 'institution', label: 'the commission', aliases: [] });
  const d2 = window._proposeNewEntity({ kind: 'institution', label: 'Toll Road Commission',
    aliases: ['the commission'] });
  out.dIds = [d1.ok ? d1.entity.id : null, d2.ok ? d2.entity.id : null];
  out.d = { byContestedName: res('the commission'),
    byDistinctLabel: res('Toll Road Commission') };

  // ── E. A DUPLICATE LABEL with no aliases at all
  reset('E');
  const e1 = window._proposeNewEntity({ kind: 'institution', label: 'Toll Road Commission', aliases: [] });
  const e2 = window._proposeNewEntity({ kind: 'collective', label: 'Toll Road Commission', aliases: [] });
  out.eSecondAccepted = !!e2.ok;
  out.e = { byLabel: res('Toll Road Commission') };
  out.eIds = [e1.ok ? e1.entity.id : null, e2.ok ? e2.entity.id : null];

  // ── F. does the sealed FACT's own wording resolve? sample 3's exact text, verbatim
  reset('F');
  const f = window._proposeNewEntity({ kind: 'institution', label: 'Toll Road Commission', aliases: [] });
  out.fId = f.ok ? f.entity.id : null;
  out.fFact = 'The commission has received and logged a formal demand';
  out.fProseAnchor = (function () {
    const v = window._deliveryAnchorAliases(out.fId);
    if (!v.ok) return { ok: false, why: v.why };
    return { ok: true, aliases: v.aliases };
  })();
  return out;
});

await browser.close();

console.log('Q1. Does a label-only entity resolve by ID, label, and alias?');
console.log('    stored record: ' + JSON.stringify(r.aStored));
t('by ID — resolves', r.a.byId.ok === true, JSON.stringify(r.a.byId));
t('by EXACT canonical label — resolves', r.a.byExactLabel.ok === true, JSON.stringify(r.a.byExactLabel));
t('  and case-insensitively', r.a.byLowercaseLabel.ok === true, JSON.stringify(r.a.byLowercaseLabel));
t('  and through punctuation/whitespace normalisation', r.a.byPunctuatedLabel.ok === true,
  JSON.stringify(r.a.byPunctuatedLabel));
t('by alias — there are none to resolve by', (r.aStored.aliases || []).length === 0,
  JSON.stringify(r.aStored.aliases));
t('it IS in the protected register regardless', r.aInRegister === true);

console.log('\nQ3. Does "Toll Road Commission" resolve when aliases: []?');
t('YES — the canonical label is already a deterministic identity', r.a.byExactLabel.ok === true
  && r.a.byExactLabel.id === r.aId, JSON.stringify(r.a.byExactLabel) + ' want id=' + r.aId);

console.log('\nQ4. Does "the commission" resolve only when explicitly declared?');
t('label-only entity: "the commission" does NOT resolve', r.a.byTheCommission.ok === false,
  JSON.stringify(r.a.byTheCommission));
t('  reason is "unresolved", not a near-miss', r.a.byTheCommission.why === 'unresolved',
  JSON.stringify(r.a.byTheCommission.why));
t('  bare "commission" does NOT resolve either', r.a.byCommission.ok === false,
  JSON.stringify(r.a.byCommission));
t('  nor does a partial "Toll Road"', r.a.byTollRoad.ok === false, JSON.stringify(r.a.byTollRoad));
t('WITH the alias declared: "the commission" resolves', r.b.byTheCommission.ok === true,
  JSON.stringify(r.b.byTheCommission));
t('  and capitalisation of the alias does not matter', r.b.byTheCommissionCapitalised.ok === true,
  JSON.stringify(r.b.byTheCommissionCapitalised));
t('  but matching is WHOLE-STRING: bare "commission" still fails', r.b.byCommissionBare.ok === false,
  JSON.stringify(r.b.byCommissionBare));

console.log('\nQ2. Does a label-only entity satisfy a later existingRef?');
t('existingRefs by ID — accepted', r.aRefById.ok === true, JSON.stringify(r.aRefById.why));
t('existingRefs by LABEL — REJECTED (ids only, by contract)', r.aRefByLabel.ok === false,
  JSON.stringify(r.aRefByLabel.why));
t('  and the reason says it does not resolve',
  JSON.stringify(r.aRefByLabel.why).indexOf('does not resolve to an established entity') >= 0,
  JSON.stringify(r.aRefByLabel.why));
t('existingRefs by the undeclared alias form — REJECTED', r.aRefByAliasForm.ok === false,
  JSON.stringify(r.aRefByAliasForm.why));
t('canon_change.targets by LABEL of an ESTABLISHED entity — REJECTED',
  r.aTargetByLabel.ok === false, JSON.stringify(r.aTargetByLabel.why));
t('  (the Tier 3 by-label finding from the grading control, reconfirmed here)',
  JSON.stringify(r.aTargetByLabel.why).indexOf('neither an established entity nor declared') >= 0,
  JSON.stringify(r.aTargetByLabel.why));

console.log('\nQ5. What happens on collisions between generic aliases?');
console.log('    two bodies both declaring "the commission": ids=' + JSON.stringify(r.cIds));
t('the second declaration is accepted (no uniqueness check on aliases)', r.cSecondAccepted === true,
  JSON.stringify(r.cSecondWhy));
t('the shared generic alias then resolves to NEITHER — fail-closed',
  r.c.byGenericAlias.ok === false, JSON.stringify(r.c.byGenericAlias));
t('  and the reason reports the ambiguity with a count',
  String(r.c.byGenericAlias.why || '').indexOf('ambiguous') >= 0, JSON.stringify(r.c.byGenericAlias.why));
t('each distinct canonical LABEL still resolves cleanly',
  r.c.byFirstLabel.ok === true && r.c.bySecondLabel.ok === true,
  JSON.stringify([r.c.byFirstLabel, r.c.bySecondLabel]));
console.log('    an alias colliding with another entity\'s LABEL: ids=' + JSON.stringify(r.dIds));
t('the contested name resolves to neither', r.d.byContestedName.ok === false,
  JSON.stringify(r.d.byContestedName));
t('  the uncontested label still resolves', r.d.byDistinctLabel.ok === true,
  JSON.stringify(r.d.byDistinctLabel));
console.log('    two entities with the SAME label and no aliases: ids=' + JSON.stringify(r.eIds));
t('a duplicate label is accepted at proposal time', r.eSecondAccepted === true);
t('  and that label then resolves to neither — the label fallback is NOT collision-proof',
  r.e.byLabel.ok === false, JSON.stringify(r.e.byLabel));

console.log('\nQ6 (the live consequence). Sample 3\'s own sealed wording against its own entity');
console.log('    fact    : ' + JSON.stringify(r.fFact));
console.log('    aliases : ' + JSON.stringify(r.fProseAnchor.aliases));
t('the controlled alias set is the bare label only',
  JSON.stringify(r.fProseAnchor.aliases) === JSON.stringify(['Toll Road Commission']),
  JSON.stringify(r.fProseAnchor.aliases));
// _anchorAliasInProse is NOT exposed on window — I assumed it was and the trace said FN_MISSING,
// so the matcher is mirrored here EXACTLY as app.js defines it (word-boundary, case-insensitive,
// whole phrase). Mirrored rather than imported because app.js is a browser script; if the two ever
// diverge this trace is reporting the mirror, which is why it is quoted verbatim above.
const anchorHit = (aliases, prose) => {
  const p = String(prose || '');
  for (const a0 of aliases) {
    const a = String(a0 || '').trim(); if (!a) continue;
    const rx = new RegExp('(^|[^A-Za-z0-9])' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z0-9])', 'i');
    if (rx.test(p)) return a;
  }
  return null;
};
const hit = anchorHit(r.fProseAnchor.aliases, r.fFact);
t('the sealed fact\'s OWN phrasing does NOT match any permitted name', hit === null,
  'anchor hit = ' + JSON.stringify(hit));
t('  whereas the declared-alias shape WOULD have matched it',
  anchorHit(['Toll Road Commission', 'the commission'], r.fFact) === 'the commission',
  JSON.stringify(anchorHit(['Toll Road Commission', 'the commission'], r.fFact)));

console.log('\n' + pass + '/' + (pass + fail) + ' trace assertions held');
process.exit(fail ? 1 : 0);
