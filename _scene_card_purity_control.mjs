// SCENE-CARD PURITY: SOURCE-TO-SINK CONTROL. Provider-free, no network, $0.
//
// THE RULE UNDER TEST: no post-prose model-generated interpretation, summary, decisive change, or
// replacement framing may enter _sceneStateCard, planner input, protected-register derivation, or
// canon — at ANY delivery status (DELIVERED, PARTIAL or MISSED).
//
// Permitted continuity sources only: the exact sealed proposal + its activation status; the accepted
// rendered scene text (or a deterministic bounded projection of it); already committed canon.
//
// Usage:
//   node _scene_card_purity_control.mjs                 → behavioural + static against public/app.js
//   node _scene_card_purity_control.mjs <path/to/app.js> → STATIC ONLY, for the RED bite proof
import fs from 'fs';
import { chromium } from 'playwright-core';

const STATIC_TARGET = process.argv[2] || 'public/app.js';
const STATIC_ONLY = !!process.argv[2];

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// Every field the two post-prose model passes used to emit into the sink.
const MODEL_FIELDS = ['setting', 'charactersPresent', 'protagonistStatus', 'decisiveChange',
  'activeInterlocutor', 'protagonistAlone'];
// Distinctive model-authored values planted in the fixtures below. None may ever surface.
const PLANTED = ['the scorched chapel', 'Julian the Reach magistrate', 'condemned and shaking',
  'the college is dissolved', 'a Reach magistrate'];

console.log('=== SCENE-CARD PURITY: SOURCE → SINK (no network, $0) ===');
console.log('    static target: ' + STATIC_TARGET + (STATIC_ONLY ? '  [STATIC ONLY]' : '') + '\n');

// ══════════════════════════════════════════════════════════════════════════════
// STATIC: neither writer may put a model field into the sink.
// ══════════════════════════════════════════════════════════════════════════════
const SRC = fs.readFileSync(STATIC_TARGET, 'utf8');

console.log('A. the sink has ONE writer, and it is guarded  [STATIC]');
const assigns = (SRC.match(/_sceneStateCard\s*=/g) || []).length;
t('_sceneStateCard is assigned in exactly 2 places (null reset + the one writer)',
  assigns === 2, 'assignments=' + assigns);
t('the one writer refuses a non-deterministic card',
  /card\.source !== 'deterministic'/.test(SRC) && /SCENE-CARD:REJECT/.test(SRC));
t('a deterministic card builder exists', /function _deterministicSceneCard\(/.test(SRC));

console.log('\nB. WRITER 1 — the post-prose scene scorer  [STATIC]');
// The scorer's block is identified by its own `parsed.sceneState` read.
const w1 = SRC.indexOf('var ss = parsed && parsed.sceneState;');
const w1Body = w1 >= 0 ? SRC.slice(w1, w1 + 2600) : '';
t('writer 1 block located', w1Body.length > 0);
t('writer 1 does NOT assign _sceneStateCard', !/_sceneStateCard\s*=/.test(w1Body));
// CORRECTED (not relaxed): the first form tested word CO-OCCURRENCE within 400 chars of
// "_sceneStateCard", which a explanatory comment mentioning both trips even when no assignment
// exists. A persisted card requires the field as an OBJECT KEY, so that is what is asserted —
// still RED on the original writer, which built `{ … decisiveChange: … }`, without firing on prose.
MODEL_FIELDS.forEach(f => {
  t('  writer 1 declares no `' + f + ':` card key',
    !new RegExp('\\b' + f + '\\s*:').test(w1Body));
});
t('writer 1 is marked diagnostic-only', /SCENE-STATE:DIAGNOSTIC-ONLY/.test(w1Body));

console.log('\nC. WRITER 2 — the delivery verifier\'s tableau  [STATIC]');
const c0 = SRC.indexOf('async function _commitScene(');
const c1 = SRC.indexOf('cs._committedThroughScene = prevSceneNum;', c0);
const w2Body = (c0 >= 0 && c1 > c0) ? SRC.slice(c0, c1) : '';
t('writer 2 block located', w2Body.length > 0);
t('writer 2 builds the card DETERMINISTICALLY', /_tc = _deterministicSceneCard\(/.test(w2Body));
t('writer 2 no longer maps the verifier tableau into a card',
  !/_tc = \{\s*forScene/.test(w2Body));
MODEL_FIELDS.forEach(f => {
  t('  writer 2 reads no `_tab.' + f + '` into a card', !new RegExp('_tab\\.' + f).test(w2Body));
});
t('the discarded tableau is logged, not stored', /TABLEAU:DISCARDED/.test(w2Body));

if (STATIC_ONLY) {
  console.log('\n' + pass + '/' + (pass + fail) + ' passed  [static only]');
  process.exit(fail ? 1 : 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// BEHAVIOURAL: drive the real served functions.
// ══════════════════════════════════════════════════════════════════════════════
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._deterministicSceneCard === 'function'
  && typeof window._setSceneStateCard === 'function'
  && typeof window._buildSceneStateAnchor === 'function'
  && typeof window._sealProposal === 'function', { timeout: 20000 });

const SEALED_FACT = 'Lirael burns the Reach archive and the governance opens an investigation into her.';
const SCENE_TEXT = 'She set the taper to the shelf and did not look away. '
  + 'The smoke went up through the gallery and the bell began, and by the time it stopped '
  + 'there were three riders on the north road who had not been there at dusk.';

const r = await page.evaluate(({ SEALED_FACT, SCENE_TEXT, MODEL_FIELDS, PLANTED }) => {
  const out = {};
  window.state = window.state || {};
  window.state.turnCount = 11;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._sceneStateCard = null;
  window.state._scenePosture = { '11': { hash: 'ph-purity', choice: 'burn' } };

  const sealed = window._sealProposal({ fact: SEALED_FACT, scene: 11 });
  out.sealedId = sealed && sealed.id;

  // ── the deterministic card, at each delivery status
  const card = window._deterministicSceneCard(11, SCENE_TEXT, out.sealedId);
  out.cardSource = card.source;
  out.cardModelFields = MODEL_FIELDS.map(f => [f, JSON.stringify(card[f])]);
  out.cardHasSealedFact = card.sealedFact === SEALED_FACT;
  out.cardHasRef = card.sealedProposalRef === out.sealedId;
  out.cardActivationPending = card.activation;
  out.cardTailVerbatim = SCENE_TEXT.indexOf(card.sceneTail.slice(-60)) >= 0 && card.sceneTail.length > 0;
  out.cardJson = JSON.stringify(card);

  // activation flips to delivered once the sealed fact commits — deterministic, not a verdict string
  window._commitTransition(out.sealedId, 'scene11_transition', 11);
  out.cardActivationDelivered = window._deterministicSceneCard(11, SCENE_TEXT, out.sealedId).activation;

  // ── the sink refuses a model-shaped card (a future third writer cannot leak)
  const hostileCards = [
    { forScene: 11, setting: 'the scorched chapel', charactersPresent: ['Julian the Reach magistrate'],
      protagonistStatus: 'condemned and shaking', decisiveChange: 'the college is dissolved',
      activeInterlocutor: 'a Reach magistrate', protagonistAlone: false },
    { forScene: 11, source: 'verifier_tableau', decisiveChange: 'the college is dissolved' },
    { forScene: 11, source: 'deterministic_LOOKALIKE', setting: 'the scorched chapel' }
  ];
  out.hostileResults = hostileCards.map(c => {
    try { return window._setSceneStateCard(c) === null ? 'refused' : 'ACCEPTED'; } catch (e) { return 'threw'; }
  });
  out.sinkAfterHostile = JSON.stringify(window.state._sceneStateCard);

  // ── the legitimate card installs
  window._setSceneStateCard(card);
  out.sinkInstalled = window.state._sceneStateCard && window.state._sceneStateCard.source;

  // ── SOURCE → SINK: the planner-facing consumer must leak no model field
  out.anchor = window._buildSceneStateAnchor(11) || '';
  out.anchorLeaks = PLANTED.filter(p => out.anchor.indexOf(p) >= 0);
  out.anchorMentionsFinalLines = /final line/i.test(out.anchor);
  out.anchorFabricatesPresence = /unnamed others|is ALONE/.test(out.anchor);

  return out;
}, { SEALED_FACT, SCENE_TEXT, MODEL_FIELDS, PLANTED });

await browser.close();

console.log('\nD. the deterministic card carries no model interpretation  [BEHAVIOURAL]');
t('card.source is "deterministic"', r.cardSource === 'deterministic', String(r.cardSource));
r.cardModelFields.forEach(([f, v]) => {
  const empty = v === 'null' || v === '[]' || v === 'false';
  t('  `' + f + '` is empty (' + v + ')', empty, v);
});

console.log('\nE. permitted continuity sources ARE available  [BEHAVIOURAL]');
t('the sealed fact is present, byte-identical', r.cardHasSealedFact === true);
t('the sealed proposal reference is present', r.cardHasRef === true);
t('the accepted scene text is present as a VERBATIM tail', r.cardTailVerbatim === true);
t('activation is "pending" before commit', r.cardActivationPending === 'pending', String(r.cardActivationPending));
t('activation is "delivered" after commit', r.cardActivationDelivered === 'delivered', String(r.cardActivationDelivered));

console.log('\nF. the sink refuses model-shaped cards  [BEHAVIOURAL]');
console.log('   attempts: ' + JSON.stringify(r.hostileResults));
t('all model-shaped cards are refused', r.hostileResults.every(x => x === 'refused'),
  r.hostileResults.filter(x => x !== 'refused').length + ' not refused');
t('the sink is untouched by them', r.sinkAfterHostile === 'null', String(r.sinkAfterHostile).slice(0, 80));
t('the legitimate deterministic card installs', r.sinkInstalled === 'deterministic');

console.log('\nG. SOURCE → SINK: no model field reaches planner input  [BEHAVIOURAL]');
t('no planted model value appears in the planner-facing anchor',
  r.anchorLeaks.length === 0, 'leaked: ' + JSON.stringify(r.anchorLeaks));
t('the anchor does NOT fabricate a presence claim', r.anchorFabricatesPresence === false);
t('the anchor still directs the author to the scene\'s final lines',
  r.anchorMentionsFinalLines === true);
t('the card JSON itself contains no planted value',
  !PLANTED.some(p => r.cardJson.indexOf(p) >= 0));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
