// THE DIRECTIVE REGISTRY — one canonical list of the creative instructions that must
// reach the model, and WHICH LAYER each one is for.
//
// The acceptance criterion this exists to serve:
//     DEFINED -> BUILT -> DELIVERED -> USED -> VALIDATED
// A rule that stops at "built" is not real.
//
// `expect` is the load-bearing field. The audit's hardest finding was not that a rule was
// missing — it was that a rule reached the PLANNER while the AUTHOR, the layer actually
// making the decision, never saw it. That is DELIVERED_TO_WRONG_LAYER, and it is a
// different defect from unused: someone got it, but not the one who needed it.
//
//   defined  — a regex proving the instruction exists in public/app.js
//   probe    — a lowercase substring proving it reached a payload
//   expect   — the layers that MUST carry it: 'author' | 'planner'
//   scope    — 'continuation' for directives that ride the spine block, which does not
//              exist in Scene 1. Omitted means every scene.
//
// Consumers: _delivery_audit.mjs, _payload_manifest.mjs. Add a directive here, not there.

export const DIRECTIVES = [
  { key: '5f',        name: 'wish order (5f)',           defined: /INVOCATION, SACRIFICE, DESIRE/,     probe: 'invocation',                 expect: ['author'] },
  { key: '5g',        name: 'memory offering (5g)',      defined: /WHAT FIRST FAVORED OFFER/,          probe: 'memories',                   expect: ['author'] },
  { key: '5h',        name: 'twist immediate (5h)',      defined: /EXACTING, NOT MALICIOUS/,           probe: 'exacting',                   expect: ['author'] },
  { key: '5i',        name: 'offering boundary (5i)',    defined: /TAKES ONLY WHAT WAS OFFERED/,       probe: 'only what was offered',      expect: ['author'] },
  { key: '5j',        name: 'Tempt is player-only (5j)', defined: /TEMPT FATE IS THE PLAYER/,          probe: 'never the character',        expect: ['author'] },
  { key: '5k',        name: 'no rule recitation (5k)',   defined: /NEVER RECITE THE RULES/,            probe: 'never recite',               expect: ['author'] },
  { key: '5l',        name: 'named offices (5l)',        defined: /NAMED OFFICES TAKE PRIORITY/,       probe: 'named offices',              expect: ['author'] },
  { key: '5m',        name: 'sayings registry (5m)',     defined: /FATELANDS SAYINGS/,                 probe: 'blank page',                 expect: ['author'] },
  { key: '5n',        name: 'three channels (5n)',       defined: /THREE CHANNELS, NEVER MIXED/,       probe: 'three channels',             expect: ['author'] },
  { key: '5o',        name: 'twist sequence (5o)',       defined: /THE WISH-TWIST SEQUENCE/,           probe: 'wish-twist sequence',        expect: ['author'] },
  { key: 'charplus',  name: 'Character+ mechanisms',     defined: /ROTATE MECHANISMS, NEVER SURFACES/, probe: 'rotate mechanisms',          expect: ['author'] },
  { key: 'charscope', name: 'Character+ scope',          defined: /WHO GETS CHARACTER/,                probe: 'who gets character',         expect: ['author'] },
  { key: 'charbudget',name: 'Character+ budget',         defined: /RECURRENCE BUDGET/,                 probe: 'recurrence budget',          expect: ['author'] },
  { key: 'liattract', name: 'LI attraction judgement',   defined: /ATTRACTION IS A JUDGEMENT/,         probe: 'attraction is a judgement',  expect: ['author'] },
  { key: 'envcause',  name: 'environment causality',     defined: /THE CLEARING IS NOT SCENERY/,       probe: 'not scenery',                expect: ['author'] },
  // These two are why the wrong-layer category exists. Both were built into the PLANNER's
  // prompt only; real paid payloads showed 0 occurrences on the Author side while the
  // Author was the layer inventing characters and skipping the player's decision.
  { key: 'forbidden', scope: 'continuation', name: 'forbidden inventions',      defined: /FORBIDDEN INVENTIONS/,              probe: 'forbidden inventions',       expect: ['planner', 'author'] },
  { key: 'contract', scope: 'continuation',  name: 'interactive contract',      defined: /PLAYER DECISION AT THE END/,        probe: 'player decision at the end', expect: ['planner', 'author'] },
  { key: 'spine', scope: 'continuation',     name: 'spine event (author)',      defined: /SCENE SPINE . THE EVENT/,           probe: 'scene spine',                expect: ['author'] },
];

// The Author's system prompt is the only one carrying the architecture laws.
export const isAuthorSys = sys => /STORYBOUND ARCHITECTURE LAWS/.test(String(sys || ''));

export const carries = (text, probe) =>
  String(text || '').toLowerCase().includes(String(probe).toLowerCase());
