// THE PLAYER CAUSAL STATE VECTOR.
//
// Replaces the branch test's original probe, which compared facts:null, crisis:null and
// the authored spine goal — two empty fields and one identical in every arm by design. It
// could not detect divergence, and reported "no causal difference" as though that were a
// measurement.
//
// Every field below was verified by _causal_state_survey.mjs to be POPULATED and to MOVE
// across a turn. Fields that merely sound causal but are always empty are listed in DEAD
// and deliberately excluded — reading them is how the last probe fooled itself.
//
// Emergent state only. Never authored intent: the spine goal is identical in both arms, so
// including it can only mask divergence.

export const VECTOR = {
  relationship: [
    'relationshipVector',          // {attraction, trust, resentment, jealousy, fear_of_abandonment, …}
    '_relationshipThresholds',     // {confessionCrossed, vulnerabilityCrossed, betrayalCrossed, …}
    '_relationalShapeProbe',       // {initiative, tension_handling, desire_expression, reciprocity}
    'attraction', 'spark', 'commitmentPressure', 'romanceProgression',
    'desireVector', 'emotionalMomentum',
  ],
  knowledge: [
    'committedTruth', '_committedState',
    'unansweredQuestions', 'misunderstandings',
    'echoMemories', 'conversationMemories', '_characterMemory',
    'characterMisbelief',
  ],
  world: [
    '_scenePlotContract', '_priorSceneStateChange',
    'foreshadowDebt', 'delayedPayoffs', 'foreshadowAnchors',
    'characterStrategy', 'characterDesires', 'characterGravity',
    'narrativeMomentum', 'relationalDoom',
  ],
  affordance: [                    // what the player can do NEXT — the interactive surface
    '_petitionEmergenceArmed', 'temptFateWish', '_lastAgencyLevel',
    '_playerImpactRead', 'passiveTurnCount',
  ],
};

// DEAD / RESERVED — verified always-empty in a real run. A probe reading these reports
// "identical" forever. Kept and classified rather than deleted, because the NAMES are the
// hazard: each one implies a working subsystem. Decision for each is remove-or-wire; none
// may be relied on until it has a writer.
export const DEAD = [
  { field: 'characterSecrets',        reason: 'no writer / no state mutation path', decision: 'wire or remove' },
  { field: 'callbackLedger',          reason: 'initialised to [] and never appended', decision: 'wire or remove' },
  { field: 'characterEmotionalBeats', reason: 'initialised to {} and never written', decision: 'wire or remove' },
  { field: 'activeSecret',            reason: 'null after a full turn', decision: 'wire or remove' },
  { field: 'secretHistory',           reason: 'null after a full turn', decision: 'wire or remove' },
  { field: 'availableSecrets',        reason: 'null after a full turn', decision: 'wire or remove' },
  { field: 'lastThresholdChoice',     reason: 'null despite a threshold system existing', decision: 'investigate' },
  { field: '_pendingSacrifice',       reason: 'null through a sacrifice scene', decision: 'investigate' },
  { field: 'intimacyHistory',         reason: 'null; intimacy engine writes elsewhere', decision: 'wire or remove' },
  { field: 'activeTemptations',       reason: 'null; Tempt state lives in temptFateWish', decision: 'remove' },
  { field: 'activeFateEvent',         reason: 'null after a wish resolved on-page', decision: 'investigate' },
  { field: 'lastFate',                reason: 'null after a wish resolved on-page', decision: 'investigate' },
];

// Runs in the page. Returns {category: {field: json}} for hashing per dimension.
export const READ_VECTOR = `(() => {
  const V = ${JSON.stringify(VECTOR)};
  const s = window.state || {};
  const j = v => { try { return v === undefined ? null : JSON.stringify(v); } catch (_) { return '[circular]'; } };
  const out = {};
  for (const cat of Object.keys(V)) {
    out[cat] = {};
    for (const f of V[cat]) out[cat][f] = j(s[f]);
  }
  return out;
})()`;

// Which categories diverged, and which individual fields drove it.
export function compare(a, b) {
  const byCategory = {}, fields = [];
  for (const cat of Object.keys(VECTOR)) {
    const av = (a && a[cat]) || {}, bv = (b && b[cat]) || {};
    const diff = VECTOR[cat].filter(f => av[f] !== bv[f]);
    byCategory[cat] = diff.length;
    for (const f of diff) fields.push({ cat, field: f, a: String(av[f]).slice(0, 80), b: String(bv[f]).slice(0, 80) });
  }
  // A vector where nothing is populated cannot prove sameness — say so rather than
  // reporting a confident "identical", which is the exact failure being corrected.
  const populated = Object.keys(VECTOR).reduce((n, cat) => n
    + VECTOR[cat].filter(f => { const v = (a && a[cat] || {})[f]; return v && v !== 'null' && v !== '{}' && v !== '[]'; }).length, 0);
  const pct = populated ? Math.round((fields.length / populated) * 1000) / 10 : 0;
  return { byCategory, fields, populated, pct, diverged: fields.length > 0 };
}
