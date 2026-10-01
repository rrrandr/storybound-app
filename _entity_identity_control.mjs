// ENTITY IDENTITY CONTROL. Provider-free, no network, no model calls, $0.
//
// WHAT THIS GUARDS, and why it exists at all — from the read-only alias trace:
//   · the canonical label IS already a deterministic fallback identity, but ONLY while labels stay
//     unique, and nothing enforced that;
//   · "the commission" resolves ONLY when explicitly declared — never guessed, never inferred,
//     matched whole-string;
//   · two entities could be declared with the same label, or the same generic alias, and that name
//     then resolved to NEITHER (fail-closed "ambiguous (2)") — a name silently lost;
//   · measured live: 2 of 5 samples sealed a durable institution with "aliases": [], and that
//     body's own sealed fact called it "the commission" — a form that cannot resolve back to it.
//
// Roman's seven required fixtures, each RED-FIRST (the violation is asserted to be REFUSED, and
// the legitimate shape asserted to still pass):
//   1 empty aliases · 2 duplicate aliases · 3 new label vs existing alias ·
//   4 new alias vs existing label · 5 two introduced entities colliding with each other ·
//   6 two distinct canonical labels resolving cleanly ·
//   7 a valid institution with ["the commission"] ACTIVATING successfully
// Plus the preservation clauses and the activation re-check.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._entityIdentityIssues === 'function', { timeout: 20000 });

console.log('=== ENTITY IDENTITY CONTROL (no network, no model, $0) ===\n');

const r = await page.evaluate(() => {
  const out = {};
  let sc = 600;
  const reset = (tag) => {
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-ident-' + tag;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._sceneLocalPressures = null;
    window.state._lastContinuationResult = null;
    window.state.turnCount = sc;
    window.state._scenePosture = {}; window.state._scenePosture[String(sc)] = { hash: 'ph-ident-' + tag };
    return sc++;
  };
  const ent = (o) => Object.assign({ kind: 'institution', label: 'Toll Road Commission',
    aliases: ['the commission'], justification: 'The body the player addressed.',
    future_relevance: 'It will convene and summon her.' }, o);
  const prop = (intro, extra) => Object.assign({
    scene_purpose: 'Put the petition before a body that can act.',
    forward_pressure: 'It will convene over the demand.',
    pressure_scope: 'durable',
    derivation: 'The player sent a sealed demand to it.',
    introduces: intro, existingRefs: [],
    canon_change: { tier: 2, targets: [intro[0] ? intro[0].label : 'x'],
      content: 'The body receives a formal demand for an investigation.' }
  }, extra || {});
  const V = (p) => { const v = window._validateContinuationProposal(p);
    return { ok: v.ok, why: v.why || [] }; };

  // ── 1. EMPTY ALIASES
  reset('1');
  out.f1_empty = V(prop([ent({ aliases: [] })]));
  out.f1_missing = V(prop([ent({ aliases: undefined })]));
  out.f1_blankStrings = V(prop([ent({ aliases: ['', '   '] })]));
  out.f1_valid = V(prop([ent({})]));

  // ── 2. DUPLICATE ALIASES (and an alias duplicating the label)
  reset('2');
  out.f2_dupAlias = V(prop([ent({ aliases: ['the commission', 'The Commission'] })]));
  out.f2_aliasEqualsLabel = V(prop([ent({ aliases: ['Toll Road Commission'] })]));
  out.f2_punctVariant = V(prop([ent({ aliases: ['the commission', 'the  commission!'] })]));

  // ── 3. NEW LABEL colliding with an EXISTING ALIAS
  reset('3');
  const e3 = window._proposeNewEntity({ kind: 'institution', label: 'River Authority',
    aliases: ['the commission'] });
  out.f3_existingId = e3.ok ? e3.entity.id : null;
  out.f3 = V(prop([ent({ label: 'The Commission', aliases: ['the toll board'] })]));

  // ── 4. NEW ALIAS colliding with an EXISTING LABEL
  reset('4');
  const e4 = window._proposeNewEntity({ kind: 'institution', label: 'Toll Road Commission', aliases: ['the board'] });
  out.f4_existingId = e4.ok ? e4.entity.id : null;
  out.f4 = V(prop([ent({ label: 'River Assize', aliases: ['toll road commission'] })]));

  // ── 5. TWO INTRODUCED ENTITIES COLLIDING WITH EACH OTHER
  reset('5');
  out.f5_sameAlias = V(prop([
    ent({ label: 'Toll Road Commission', aliases: ['the commission'] }),
    ent({ label: 'River Commission', aliases: ['the commission'] })]));
  out.f5_aliasVsLabel = V(prop([
    ent({ label: 'Toll Road Commission', aliases: ['the commission'] }),
    ent({ label: 'the commission', aliases: ['the body'] })]));
  out.f5_sameLabel = V(prop([
    ent({ label: 'Toll Road Commission', aliases: ['the commission'] }),
    ent({ label: 'Toll Road Commission', aliases: ['the toll board'] })]));

  // ── 6. TWO DISTINCT CANONICAL LABELS RESOLVE CLEANLY
  reset('6');
  out.f6_valid = V(prop([
    ent({ label: 'Toll Road Commission', aliases: ['the commission'] }),
    ent({ label: 'River Assize', aliases: ['the assize'] })]));
  const p6 = window._processContinuationProposal(prop([
    ent({ label: 'Toll Road Commission', aliases: ['the commission'] }),
    ent({ label: 'River Assize', aliases: ['the assize'] })]), { scene: window.state.turnCount });
  out.f6_outcome = p6.outcome;
  if (p6.sealedId) {
    window._commitTransition(p6.sealedId, 'scene6', window.state.turnCount);
    const res = (x) => { const v = window._deliveryAnchorAliases(x); return { ok: v.ok, id: v.entityId || null, why: v.why || null }; };
    out.f6_resolve = {
      labelA: res('Toll Road Commission'), labelB: res('River Assize'),
      aliasA: res('the commission'), aliasB: res('the assize')
    };
    out.f6_distinct = out.f6_resolve.labelA.id !== out.f6_resolve.labelB.id;
  }

  // ── 7. A VALID INSTITUTION WITH ["the commission"] ACTIVATES
  const s7 = reset('7');
  const p7 = window._processContinuationProposal(prop([ent({})]), { scene: s7 });
  out.f7_outcome = p7.outcome;
  out.f7_sealedId = p7.sealedId || null;
  out.f7_factsBeforeCommit = window._ensureCommittedState().facts.length;
  // IDENTITY, NOT COUNT. _protectedRegisterIds() includes the bootstrapped PC/LI anchors, so a
  // register LENGTH is never the right measure here — this is the third time that has bitten me.
  const regLabels = () => Object.keys(window._protectedRegisterIds())
    .map(k => String(window._protectedRegisterIds()[k].label || ''));
  out.f7_labelsBeforeCommit = regLabels();
  if (p7.sealedId) {
    const fact = window._commitTransition(p7.sealedId, 'scene7', s7);
    out.f7_fact = fact ? fact.fact : null;
    const v = window._deliveryAnchorAliases('the commission');
    out.f7_aliasResolves = { ok: v.ok, id: v.entityId || null, aliases: v.aliases || null };
    const v2 = window._deliveryAnchorAliases('Toll Road Commission');
    out.f7_labelResolves = { ok: v2.ok, id: v2.entityId || null };
    out.f7_factsAfter = window._ensureCommittedState().facts.length;
    out.f7_labelsAfterCommit = regLabels();
  }

  // ── 8. PENDING ENTITIES DO NOT PARTICIPATE IN GLOBAL COLLISION CHECKS UNTIL ACTIVATION
  const s8 = reset('8');
  const p8a = window._processContinuationProposal(prop([ent({})]), { scene: s8 });
  out.f8_firstSealed = p8a.outcome;
  // A SECOND proposal in a LATER scene claiming the SAME names, while the first is still PENDING.
  const s8b = s8 + 1; window.state.turnCount = s8b;
  window.state._scenePosture[String(s8b)] = { hash: 'ph-ident-8b' };
  out.f8_secondWhilePending = V(prop([ent({})]));
  out.f8_labelsWhilePending = Object.keys(window._protectedRegisterIds())
    .map(k => String(window._protectedRegisterIds()[k].label || ''));

  // ── 9. ACTIVATION RE-CHECKS AND FAILS CLOSED when a collision appeared after sealing
  const s9 = reset('9');
  const p9 = window._processContinuationProposal(prop([ent({})]), { scene: s9 });
  out.f9_sealed = p9.outcome;
  // Between sealing and delivery, something else takes the name directly in the register.
  window._proposeNewEntity({ kind: 'collective', label: 'the commission', aliases: ['the body'] });
  out.f9_squatterId = Object.keys(window._protectedRegisterIds()).filter(function (id) {
    return window._protectedRegisterIds()[id].label === 'the commission'; })[0] || null;
  const fact9 = p9.sealedId ? window._commitTransition(p9.sealedId, 'scene9', s9) : null;
  out.f9_commitRefused = fact9 === null;
  out.f9_facts = window._ensureCommittedState().facts.length;
  out.f9_pendingAdmitted = Object.keys(window._protectedRegisterIds())
    .some(function (id) { return window._protectedRegisterIds()[id].provenance === 'continuation_activated'; });

  // ── 10. PRESERVATION: ordinary scene-local texture is untouched
  const s10 = reset('10');
  out.f10_sceneLocal = V({
    scene_purpose: 'Let the silence do the work.',
    forward_pressure: 'Someone will answer for this before the week is out.',
    pressure_scope: 'scene_local', canon_change: null, introduces: [] });
  // ── 11. PRESERVATION: ids remain the only valid existingRefs / protected targets
  const e11 = window._proposeNewEntity({ kind: 'institution', label: 'Standing Assize', aliases: ['the assize'] });
  out.f11_id = e11.ok ? e11.entity.id : null;
  out.f11_byId = V(prop([ent({})], { existingRefs: [out.f11_id] }));
  out.f11_byLabel = V(prop([ent({})], { existingRefs: ['Standing Assize'] }));
  out.f11_byAlias = V(prop([ent({})], { existingRefs: ['the assize'] }));
  return out;
});

await browser.close();

const whyHas = (v, frag) => JSON.stringify(v.why).toLowerCase().indexOf(String(frag).toLowerCase()) >= 0;

console.log('FIXTURE 1 — empty aliases');
t('aliases: [] is REJECTED', r.f1_empty.ok === false, JSON.stringify(r.f1_empty.why));
t('  the reason says a durable entity must declare one', whyHas(r.f1_empty, 'declares no aliases'),
  JSON.stringify(r.f1_empty.why));
t('  and states the label remains a valid fallback', whyHas(r.f1_empty, 'valid fallback identity'));
t('  and that variants are never guessed', whyHas(r.f1_empty, 'never guessed'));
t('a MISSING aliases key is rejected the same way', r.f1_missing.ok === false);
t('aliases of only blank strings is rejected too', r.f1_blankStrings.ok === false,
  JSON.stringify(r.f1_blankStrings.why));
t('the same entity WITH ["the commission"] passes', r.f1_valid.ok === true,
  JSON.stringify(r.f1_valid.why));

console.log('\nFIXTURE 2 — duplicate aliases');
t('two aliases that normalise alike are REJECTED', r.f2_dupAlias.ok === false,
  JSON.stringify(r.f2_dupAlias.why));
t('  the reason names the repeat', whyHas(r.f2_dupAlias, 'repeats the name'));
t('an alias duplicating its OWN canonical label is REJECTED', r.f2_aliasEqualsLabel.ok === false,
  JSON.stringify(r.f2_aliasEqualsLabel.why));
t('punctuation/whitespace variants normalise alike and are REJECTED', r.f2_punctVariant.ok === false,
  JSON.stringify(r.f2_punctVariant.why));

console.log('\nFIXTURE 3 — new LABEL colliding with an EXISTING ALIAS');
t('REJECTED', r.f3.ok === false, JSON.stringify(r.f3.why));
t('  and the conflicting entity ID is reported', whyHas(r.f3, r.f3_existingId),
  'want ' + r.f3_existingId + ' in ' + JSON.stringify(r.f3.why));
// JSON.stringify ESCAPES the inner quotes, so a fragment written with bare quotes can never
// match — the same escaping trap that bit the preflight. Match the escaped form.
t('  with the conflicting VALUE and its field', whyHas(r.f3, 'alias \\"the commission\\"'),
  JSON.stringify(r.f3.why));
t('  and says it is never merged or auto-disambiguated',
  whyHas(r.f3, 'rejected rather than merged or auto-disambiguated'));

console.log('\nFIXTURE 4 — new ALIAS colliding with an EXISTING LABEL');
t('REJECTED', r.f4.ok === false, JSON.stringify(r.f4.why));
t('  and the conflicting entity ID is reported', whyHas(r.f4, r.f4_existingId),
  'want ' + r.f4_existingId);
t('  matching through normalisation, not case', whyHas(r.f4, 'toll road commission'),
  JSON.stringify(r.f4.why));

console.log('\nFIXTURE 5 — two INTRODUCED entities colliding with each other');
t('same alias on both is REJECTED', r.f5_sameAlias.ok === false, JSON.stringify(r.f5_sameAlias.why));
t('  and the reason points at the other introduces[] entry',
  whyHas(r.f5_sameAlias, 'declared in this same proposal'), JSON.stringify(r.f5_sameAlias.why));
t('one entity\'s alias equal to another\'s label is REJECTED', r.f5_aliasVsLabel.ok === false,
  JSON.stringify(r.f5_aliasVsLabel.why));
t('two identical labels in one proposal are REJECTED', r.f5_sameLabel.ok === false,
  JSON.stringify(r.f5_sameLabel.why));

console.log('\nFIXTURE 6 — two DISTINCT canonical labels resolve cleanly');
t('the proposal is accepted', r.f6_valid.ok === true, JSON.stringify(r.f6_valid.why));
t('  it seals', r.f6_outcome === 'sealed', JSON.stringify(r.f6_outcome));
t('  both canonical labels resolve after activation',
  r.f6_resolve && r.f6_resolve.labelA.ok === true && r.f6_resolve.labelB.ok === true,
  JSON.stringify(r.f6_resolve));
t('  to DIFFERENT entities', r.f6_distinct === true, JSON.stringify(r.f6_resolve));
t('  and both declared aliases resolve too',
  r.f6_resolve && r.f6_resolve.aliasA.ok === true && r.f6_resolve.aliasB.ok === true,
  JSON.stringify(r.f6_resolve));
t('  each alias to its own entity',
  r.f6_resolve && r.f6_resolve.aliasA.id === r.f6_resolve.labelA.id
  && r.f6_resolve.aliasB.id === r.f6_resolve.labelB.id, JSON.stringify(r.f6_resolve));

console.log('\nFIXTURE 7 — a valid institution with ["the commission"] ACTIVATES');
t('it seals', r.f7_outcome === 'sealed', JSON.stringify(r.f7_outcome));
t('  sealing admits nothing: zero facts, and the body is NOT in the register',
  r.f7_factsBeforeCommit === 0 && r.f7_labelsBeforeCommit.indexOf('Toll Road Commission') === -1,
  'facts=' + r.f7_factsBeforeCommit + ' labels=' + JSON.stringify(r.f7_labelsBeforeCommit));
t('  (the register holds only the bootstrapped cast anchors at that point)',
  r.f7_labelsBeforeCommit.every(l => l === 'Wren' || l === 'Cassel' || !l),
  JSON.stringify(r.f7_labelsBeforeCommit));
t('  and the commit admits it', (r.f7_labelsAfterCommit || []).indexOf('Toll Road Commission') >= 0,
  JSON.stringify(r.f7_labelsAfterCommit));
t('  the commit writes exactly one fact', r.f7_factsAfter === 1, 'facts=' + r.f7_factsAfter);
t('  AND the declared alias now resolves — the gap the live run exposed, closed',
  r.f7_aliasResolves && r.f7_aliasResolves.ok === true, JSON.stringify(r.f7_aliasResolves));
t('  the canonical label resolves to the SAME entity',
  r.f7_labelResolves && r.f7_labelResolves.ok === true
  && r.f7_labelResolves.id === r.f7_aliasResolves.id,
  JSON.stringify([r.f7_labelResolves, r.f7_aliasResolves]));
t('  and the controlled alias set carries both forms',
  r.f7_aliasResolves && (r.f7_aliasResolves.aliases || []).length === 2,
  JSON.stringify(r.f7_aliasResolves && r.f7_aliasResolves.aliases));

console.log('\n8. PENDING entities do not participate in global collision checks');
t('the first proposal sealed', r.f8_firstSealed === 'sealed');
t('  the body is NOT in the register while it is pending',
  r.f8_labelsWhilePending.indexOf('Toll Road Commission') === -1,
  JSON.stringify(r.f8_labelsWhilePending));
t('  so a later proposal claiming the SAME names is NOT blocked by it',
  r.f8_secondWhilePending.ok === true, JSON.stringify(r.f8_secondWhilePending.why));

console.log('\n9. ACTIVATION re-checks and FAILS CLOSED');
t('the proposal sealed before the name was taken', r.f9_sealed === 'sealed');
t('  a squatter then took the name in the active register', !!r.f9_squatterId, r.f9_squatterId);
t('  the commit is REFUSED', r.f9_commitRefused === true);
t('  NO fact was written', r.f9_facts === 0, 'facts=' + r.f9_facts);
t('  and the pending entity was NOT admitted', r.f9_pendingAdmitted === false);

console.log('\n10-11. PRESERVED behaviour');
t('ordinary scene-local texture is unaffected', r.f10_sceneLocal.ok === true,
  JSON.stringify(r.f10_sceneLocal.why));
t('existingRefs by ID still accepted', r.f11_byId.ok === true, JSON.stringify(r.f11_byId.why));
t('  by LABEL still rejected', r.f11_byLabel.ok === false);
t('  by ALIAS still rejected', r.f11_byAlias.ok === false);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
