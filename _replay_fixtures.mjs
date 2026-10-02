// THE REPLAY CORPUS, in one place.
//
// Recorded REAL responses from run 13, replayed by every provider-free harness. Two runners need
// them now (_multi_scene_harness_proof.mjs and _live_corpus_runner.mjs --dry-replay), and a second
// copy of a fixture drifts from the first exactly like a second copy of a reservation does.
//
// WHAT THESE ARE, stated rather than glossed: real recorded planner and author replies, the
// memory extractor's own contract skeleton, and a DELIVERED verifier verdict whose refs are parsed
// out of the request so no harness ever invents a proposal id. Replaying one author response means
// every scene renders the SAME prose — adequate for a reliability test of the machinery, and NOT a
// creative-quality signal.
import fs from 'fs';

export const RUN13 = '_continuation_live_eval_out/run_2026-10-01T22-08-44-097Z';

export const contentOf = (f) => {
  const j = JSON.parse(fs.readFileSync(RUN13 + '/' + f, 'utf8'));
  return j.content
    || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
};

export const PLANNER_RAW = contentOf('s1_response_planner_1.json');
export const AUTHOR = contentOf('s1_response_author_2.json');

// PER-SCENE DISTINCT INSTITUTION — a LABELLED FIXTURE EDIT, forced by the first run of the
// four-scene proof. Replaying one planner reply made every scene introduce the SAME "Toll Road
// Commission", and from scene 3 the identity guard REJECTED it as a redefinition of an entity
// already activated. That is the guard working, not a defect: one institution cannot be introduced
// as new four times. Each scene gets its own body instead.
//
// SIX ENTRIES, not four: `plannerFor` indexes modulo this list, so a 5- or 6-scene replay with four
// bodies would repeat one and draw the guard's rejection again — a harness artefact that looks like
// a product failure. The study window is six scenes per path, so the list is six long.
export const BODIES = [
  { label: 'Toll Road Commission', aliases: ['the commission', 'the toll commission'] },
  { label: 'River Assize', aliases: ['the assize', 'the river assize'] },
  { label: 'Chancery of Ways', aliases: ['the chancery', 'the ways chancery'] },
  { label: 'Veilwood Tribunal', aliases: ['the tribunal', 'the veilwood tribunal'] },
  { label: 'Ledger Court of Ennis', aliases: ['the ledger court', 'the court of ennis'] },
  { label: 'Wardens of the Span', aliases: ['the wardens', 'the span wardens'] }
];

// Vary the recorded planner reply by institution. Refuses rather than inventing a shape: if the
// recorded reply ever stops carrying `introduces` and `canon_change`, that is a real change in the
// contract and a harness must not paper over it.
export const plannerFor = (scene) => {
  const b = BODIES[(scene - 1) % BODIES.length];
  const i = PLANNER_RAW.indexOf('{'), j = PLANNER_RAW.lastIndexOf('}');
  const o = JSON.parse(PLANNER_RAW.slice(i, j + 1));
  if (!o.introduces || !o.introduces[0] || !o.canon_change) {
    throw new Error('the recorded planner reply no longer carries introduces + canon_change');
  }
  o.introduces[0].label = b.label;
  o.introduces[0].aliases = b.aliases.slice();
  o.canon_change.targets = [b.label];
  o.canon_change.content = b.label + "'s clerk begins reading the sealed demand aloud in the chamber.";
  o.forward_pressure = 'The ' + b.label + ' now has the demand in hand and must answer it.';
  return JSON.stringify(o);
};

export const MEMORY = JSON.stringify({
  characters: [],
  scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.0 },
  sceneState: { setting: null, charactersPresent: [], protagonistStatus: null,
    decisiveChange: null, activeInterlocutor: null, protagonistAlone: false },
  relations: []
});

// A line that really appears in the recorded author prose, so a replayed verdict's evidence quotes
// survive the production verbatim-citation check instead of being waved through.
export const TRACER = "The clerk's fingers crack the seal on the parchment I sent.";

// The replayed verdict. `refs` come from the caller, which parses them out of the verifier's own
// request — the only way the reply can be adjudicated by the real code.
export const verifierVerdict = (refs) => JSON.stringify({
  delivery: 'DELIVERED', transition_position: 40, first_irreversible_position: 40,
  per_proposal: refs.map(r => ({ ref: r, delivery: 'DELIVERED', reason: 'delivered',
    evidence: TRACER, precondition_evidence: TRACER })),
  slots_check: { precondition_evidence: TRACER, actor_evidence: TRACER, action_evidence: TRACER,
    target_evidence: TRACER, exit_state_evidence: TRACER, occurred_this_scene: true },
  actual_exit_state: 'the demand is with the commission'
});

// WHAT COUNTS AS PROVIDER SPEND. One definition, because getting this wrong in either direction is
// a reporting defect: the FS preflight counted ANY /api/ URL as a provider call and therefore
// reported "the deferred setup is a PAID step" when the only calls were /api/csp-report,
// /api/config, /api/geo and /api/beta-events — infrastructure and telemetry. A green assertion
// built on that reading is worse than a red one.
export const PROVIDER_ENDPOINT = /\/api\/(proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy)/;
export const isProviderEndpoint = (url) => PROVIDER_ENDPOINT.test(String(url || ''));
// Named explicitly so a new infrastructure endpoint shows up as unclassified rather than silently
// landing in the spend column.
export const NON_PROVIDER_ENDPOINTS = ['/api/config', '/api/geo', '/api/csp-report',
  '/api/beta-events', '/api/fortunes', '/api/auth', '/api/supabase'];

// THE STAGE CLASSIFIER, shared. Reads a request's system prompt and says which pipeline stage it
// is. Both runners route on this; two copies would route differently and the difference would show
// up as a mystery dispatch.
export const stageOf = (sys) => {
  const AMARK = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
    /screenplay-native|cinematic-romance writer|prose author/i]
    .reduce((n, rx) => n + (rx.test(sys) ? 1 : 0), 0);
  if (/RUNTIME COMMIT verifier/.test(sys)) return 'verifier';
  if (/CHARACTER MEMORY EXTRACTOR/.test(sys)) return 'memory';
  if (AMARK >= 2) return 'author';
  if (/SCENE-SPINE planner|SCENE planner/.test(sys)) return 'planner';
  if (/BODY BIBLE/.test(sys)) return 'bible';
  return 'other';
};

// The refs the verifier was asked about, parsed from its own user prompt.
export const refsFromVerifierRequest = (usr) =>
  (String(usr || '').match(/ref (prop:\d+:\d+)/g) || []).map(m => m.replace('ref ', ''));
