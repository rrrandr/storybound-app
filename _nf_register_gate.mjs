// ══════════════════════════════════════════════════════════════════════════════════════════
// PRE-AUTHOR REGISTER GATE — for a GENERAL-PROSE-ONLY test.
//
// THREE STATES, KEPT APART. The first version collapsed them and was wrong in both directions.
//
//   INTIMACY PERMITTED            — a permission state. NOT a stop. ST3/ST4, a scene-number gate
//                                   or previously unlocked milestones say the story MAY go there;
//                                   none of them says THIS scene requires explicit writing. An
//                                   ordinary conversation at ST4 is in scope.
//   EXPLICIT REGISTER REQUESTED   — a per-scene requirement the product has already DECLARED.
//                                   This is a stop for a general-prose test.
//   UNKNOWN                       — the declarations cannot establish eligibility. Also a stop.
//
// WHAT ESTABLISHES "EXPLICIT REGISTER REQUESTED". Only product-made declarations about THIS
// upcoming scene, all set by _sniffAndRouteExplicit (app.js:793) from the READER'S OWN typed
// input — never a model call, never an inference from a provider refusal:
//   · state._mode1.routeToGrok        — the product has classified the reader's input as explicit
//                                      and routed the next scene render to the explicit author.
//   · state._sustainedProfanityActive — a sustained register (2+ of the last 3 turns), which the
//                                      app's own log says "routes future scenes".
//   · state._explicitCarryForward     — an explicit moment is being carried into this scene.
//
// WHAT DOES NOT ESTABLISH IT, and is therefore recorded but never used to stop:
//   · storyturn ST3/ST4 — permission, not a content requirement.
//   · isMainCharacterIntimacySceneAllowed (app.js:328878) — `turnCount >= gateScene`: SCENE-NUMBER
//     eligibility only.
//   · detectMainPairEroticContent (app.js:328888) — whether first_kiss AND first_intimacy were
//     previously unlocked; its own comment says it is "Used to determine scene length, not to
//     block content".
//   Exposing those two on window would make this gate runnable, not authoritative, so this gate
//   does not ask for them and no production export is proposed.
//
// CHARACTER-VOICE COMPATIBILITY IS DECLARED, NOT SNIFFED. There is no field anywhere that states
// "this love interest requires the explicit register". The first version regex-matched
// escalation_tell for words like "explicit" and treated a profile WITHOUT a match as clearance —
// missing information silently becoming "no escalation". It does not do that any more: the test
// CONFIGURATION must declare that its cast is general-prose compatible, and an undeclared
// configuration is UNKNOWN. A character's voice is never altered to qualify.
//
// Pure function. Not wired into production. Builds no routing and no revision stage.
// ══════════════════════════════════════════════════════════════════════════════════════════

export const PROCEED = 'proceed';
export const STOP_EXPLICIT_REQUESTED = 'stop_explicit_register_requested';
export const STOP_UNKNOWN = 'stop_register_eligibility_unknown';

// Readable from window without any production change. `declaredGeneralProseScope` is supplied by
// the TEST CONFIGURATION, not read from the story: nothing in the app declares it.
const REQUIRED = ['storyturn', 'declaredGeneralProseScope'];

export function registerVerdict(snap) {
  const missing = REQUIRED.filter((k) => snap == null || snap[k] === undefined || snap[k] === null);
  if (missing.length) {
    return { verdict: STOP_UNKNOWN, permitted: null, authorMayBeCalled: false,
      reasons: ['cannot establish eligibility: ' + missing.join(', ') + ' not declared'] };
  }
  if (snap.declaredGeneralProseScope !== true) {
    return { verdict: STOP_UNKNOWN, permitted: null, authorMayBeCalled: false,
      reasons: ['the configuration does not DECLARE general-prose scope — eligibility unknown. '
        + 'Character-voice compatibility is not inferable from any existing field.'] };
  }

  // Per-scene explicit-register declarations. Any one is sufficient to stop.
  const declared = [];
  if (snap.mode1RouteToGrok === true) declared.push('state._mode1.routeToGrok — the product routed this scene to the explicit author');
  if (snap.sustainedProfanityActive === true) declared.push('state._sustainedProfanityActive — a sustained explicit register routes future scenes');
  if (snap.explicitCarryForward === true) declared.push('state._explicitCarryForward — an explicit moment carries into this scene');

  // Permission state, reported for the record. Never a stop on its own.
  const permitted = (snap.storyturn === 'ST3' || snap.storyturn === 'ST4')
    ? 'intimacy permitted at ' + snap.storyturn + ' (permission only — not a content requirement)'
    : 'intimacy not permitted at ' + snap.storyturn;

  if (declared.length) {
    return { verdict: STOP_EXPLICIT_REQUESTED, permitted, reasons: declared, authorMayBeCalled: false };
  }
  return { verdict: PROCEED, permitted, authorMayBeCalled: true,
    reasons: ['general-prose scope is declared by the configuration; no per-scene explicit-register '
      + 'declaration is set. ' + permitted] };
}

// Reads ONLY fields that exist on window today. The two intimacy helpers are deliberately absent:
// their semantics do not answer this question, so asking for them would manufacture a false
// dependency and an always-unknown verdict.
export const snapshotInPage = (declaredGeneralProseScope) => `(() => {
  const S = window.state || {};
  return {
    storyturn: S.storyturn || null,
    declaredGeneralProseScope: ${declaredGeneralProseScope === true ? 'true' : 'null'},
    mode1RouteToGrok: !!(S._mode1 && S._mode1.routeToGrok),
    sustainedProfanityActive: !!S._sustainedProfanityActive,
    explicitCarryForward: !!S._explicitCarryForward,
  };
})()`;
