// CONTROLLED ENTITY-KIND VOCABULARY CONTROL. Provider-free, no network, $0.
//
// Proves the bounded expansion: named · role · artifact · institution · collective · place.
// A generic `object` is deliberately absent — ordinary props stay scene-local.
//
// Also proves the guard the expansion required: non-person kinds (artifact/institution/collective/
// place) may never be resolved as a dialogue speaker or a person, which is the doctrine
// _validateLocalObjective already states for collectives.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._proposeNewEntity === 'function'
  && typeof window._validateEntityCreationProposal === 'function', { timeout: 20000 });

console.log('=== CONTROLLED ENTITY-KIND VOCABULARY (no network, $0) ===\n');

const r = await page.evaluate(() => {
  const out = {};
  window.state = window.state || {};
  window.state.storyId = 'story-kind-control';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;

  const mk = (spec) => { const res = window._proposeNewEntity(spec); return { ok: !!(res && res.ok), why: res && res.why, id: res && res.ok ? res.entity.id : null, kind: res && res.ok ? res.entity.kind : null }; };

  // ── the six permitted kinds
  out.named       = mk({ kind: 'named',       label: 'Julian',         aliases: ['the Provast'] });
  out.role        = mk({ kind: 'role',        label: 'presiding Dohkar' });
  out.artifact    = mk({ kind: 'artifact',    label: 'the Answer',     aliases: ['the relic'] });
  out.institution = mk({ kind: 'institution', label: 'the Reach governance', aliases: ['the governance'] });
  out.collective  = mk({ kind: 'collective',  label: 'the dawn patrol', aliases: ['the patrol'] });
  out.place       = mk({ kind: 'place',       label: "Aeryn's Reach",  aliases: ['the Reach'] });

  // ── the kind that must stay rejected, plus an ordinary prop
  out.objectKind  = mk({ kind: 'object',      label: 'a clay cup' });
  out.propAsNamed = mk({ kind: 'prop',        label: 'the taper' });

  // ── ARTIFACT ANCHORING: the Answer must anchor like a character
  window.state.turnCount = 40;
  window.state._scenePosture = { '40': { hash: 'ph-kind' } };
  const sealed = window._sealProposal({
    fact: 'Julian takes the Answer from Lirael.', scene: 40,
    anchors: [{ role: 'actor', ref: out.named.id }, { role: 'artifact', ref: out.artifact.id }] });
  out.sealedAnchors = sealed && sealed.anchors.length;
  out.artifactAliases = window._deliveryAnchorAliases(out.artifact.id);
  // alias-only prose, no proper names at all
  out.aliasCheck = window._checkDeliveryAnchors(sealed.id,
    'The Provast reached down and lifted the relic out of her hands without a word.', []);
  out.artifactAbsent = window._checkDeliveryAnchors(sealed.id,
    'The Provast reached down and spoke to her quietly, and then the morning went on.', []);

  // ── ALIAS SCOPING: an alias must resolve only within its OWN entity
  out.reachViaAlias       = window._deliveryAnchorAliases('the Reach');        // → place
  out.governanceViaAlias  = window._deliveryAnchorAliases('the governance');   // → institution
  out.patrolViaAlias      = window._deliveryAnchorAliases('the patrol');       // → collective
  out.relicViaAlias       = window._deliveryAnchorAliases('the relic');        // → artifact

  // ── NON-PERSON kinds must never resolve as a person/dialogue speaker
  out.hasResolver = typeof window._relResolveWho === 'function';
  out.speaker = {};
  out.speakerNames = ['Julian', 'the Reach governance', 'the dawn patrol', 'the Answer', 'the relic'];
  out.speakerNames.forEach((nm) => {
    let id = null;
    try { id = out.hasResolver ? window._relResolveWho(nm) : 'NO_FN'; } catch (e) { id = 'THREW'; }
    out.speaker[nm] = id === undefined ? null : id;
  });

  // The ledger legitimately also holds bootstrapped PC/LI anchors (see _ensureStoryEntityAnchors),
  // so the total is NOT the count of entities this control created. Report both.
  const ents = (window.state._relationshipLedger || { entities: {} }).entities;
  out.entityCount = Object.keys(ents).length;
  out.kindsPresent = Object.keys(ents).map(k => ents[k].kind).sort();
  out.myIdsAllPresent = [out.named.id, out.role.id, out.artifact.id,
    out.institution.id, out.collective.id, out.place.id].every(id => !!ents[id]);
  return out;
});

await browser.close();

console.log('A. the six permitted kinds all register');
[['named', 'Julian'], ['role', 'presiding Dohkar'], ['artifact', 'the Answer'],
 ['institution', 'the Reach governance'], ['collective', 'the dawn patrol'], ['place', "Aeryn's Reach"]]
  .forEach(([k, label]) => {
    t('`' + k + '` accepted (' + label + ')', r[k].ok === true && r[k].kind === k,
      JSON.stringify(r[k].why || r[k].kind));
  });

console.log('\nB. backward compatibility');
t('`named` still validates unchanged', r.named.ok === true && r.named.kind === 'named');
t('`role` still validates unchanged', r.role.ok === true && r.role.kind === 'role');

console.log('\nC. a generic prop cannot enter the durable register');
t('`object` is REJECTED', r.objectKind.ok === false, JSON.stringify(r.objectKind));
t('  the rejection names the forbidden kind',
  JSON.stringify(r.objectKind.why || '').indexOf('forbidden/irrelevant entity kind') >= 0,
  JSON.stringify(r.objectKind.why));
t('`prop` is REJECTED', r.propAsNamed.ok === false, JSON.stringify(r.propAsNamed));

console.log('\nD. the Answer registers AND anchors as an artifact');
t('both anchors sealed (character + artifact)', r.sealedAnchors === 2, 'anchors=' + r.sealedAnchors);
t('the artifact yields a controlled alias set',
  r.artifactAliases.ok === true && r.artifactAliases.aliases.indexOf('the relic') >= 0,
  JSON.stringify(r.artifactAliases));
console.log('   alias-only prose → ' + r.aliasCheck.verdict + ' ' + JSON.stringify(r.aliasCheck.perAnchor.map(a => a.role + ':' + a.status + '(' + a.matchedAlias + ')')));
t('alias-only prose satisfies BOTH anchors', r.aliasCheck.verdict === 'anchors_present',
  r.aliasCheck.verdict + ' ' + JSON.stringify(r.aliasCheck.why));
t('an absent artifact downgrades', r.artifactAbsent.verdict === 'anchor_missing',
  r.artifactAbsent.verdict);
t('  and names the artifact as the missing participant',
  JSON.stringify(r.artifactAbsent.why).indexOf('the relic') >= 0, JSON.stringify(r.artifactAbsent.why));

console.log('\nE. institution, collective and place are DISTINCT records');
const ids = [r.institution.id, r.collective.id, r.place.id, r.artifact.id, r.named.id, r.role.id];
t('all six entities have distinct ids', new Set(ids).size === 6, JSON.stringify(ids));
t('the place and its governing institution are separate records',
  r.place.id !== r.institution.id && r.place.kind === 'place' && r.institution.kind === 'institution');
t('a patrol from that institution is its own record',
  r.collective.id !== r.institution.id && r.collective.kind === 'collective');
// The ledger also carries bootstrapped PC/LI anchors, so the total exceeds what this control made.
console.log('   ledger kinds: ' + JSON.stringify(r.kindsPresent) + ' (total=' + r.entityCount + ')');
t('all six created records are present in the ledger', r.myIdsAllPresent === true);
t('  none was merged away', r.entityCount >= 6, 'count=' + r.entityCount);

console.log('\nF. aliases resolve ONLY within the correct entity');
t('"the Reach" → the place', r.reachViaAlias.ok && r.reachViaAlias.entityId === r.place.id,
  JSON.stringify(r.reachViaAlias));
t('"the governance" → the institution',
  r.governanceViaAlias.ok && r.governanceViaAlias.entityId === r.institution.id, JSON.stringify(r.governanceViaAlias));
t('"the patrol" → the collective',
  r.patrolViaAlias.ok && r.patrolViaAlias.entityId === r.collective.id, JSON.stringify(r.patrolViaAlias));
t('"the relic" → the artifact',
  r.relicViaAlias.ok && r.relicViaAlias.entityId === r.artifact.id, JSON.stringify(r.relicViaAlias));
t('no alias resolves across entities',
  new Set([r.reachViaAlias.entityId, r.governanceViaAlias.entityId,
           r.patrolViaAlias.entityId, r.relicViaAlias.entityId]).size === 4);

console.log('\nG. non-person kinds can never resolve as a person/speaker');
t('the resolver is exported for direct proof', r.hasResolver === true);
console.log('   ' + JSON.stringify(r.speaker));
t('a named person DOES resolve', r.speaker['Julian'] === r.named.id, String(r.speaker['Julian']));
// Driven from the same list the page used, so a typo cannot silently skip a case.
r.speakerNames.filter(nm => nm !== 'Julian').forEach(nm => {
  t('`' + nm + '` does NOT resolve', r.speaker[nm] === null, String(r.speaker[nm]));
});

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
