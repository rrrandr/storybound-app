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

// THE CAPTURED FS CG PLANNER REPLY. A real response from the one authorized live FS planner call
// (2026-10-02, $0.013438 measured). The synthetic story's PLANNER_RAW is a continuation envelope and
// FS's CG planner wants a different shape — local_objective, local_objective_actor, posture_read,
// present, reserved, aftermath — which is why replaying the synthetic reply drew
// "[OBJECTIVE:REJECTED] no local_objective; no posture_read; no present cast".
//
// It THROWS rather than falling back. A harness that silently serves the wrong shape reports a
// product failure that is really a fixture failure, which is exactly the hour this cost once.
export const fsPlannerCaptured = () => {
  const root = '_fs_planner_capture_out';
  if (!fs.existsSync(root)) throw new Error('no _fs_planner_capture_out/ — nothing captured yet');
  const dirs = fs.readdirSync(root).filter(d => /^run_/.test(d)).sort();
  for (let i = dirs.length - 1; i >= 0; i--) {
    const p = root + '/' + dirs[i] + '/planner_response.json';
    if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const c = j.content
      || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    if (c && c.indexOf('{') >= 0) return c;
  }
  throw new Error('no planner_response.json with content under ' + root);
};

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
  // THE OAS ONE-ON-ONE, tested AFTER the author and on its OWN opening sentence.
  //
  // Its calls used to classify as 'other' and were aborted invisibly — part of how a REQUIRED
  // segment of the opening went missing with nothing saying so. My first fix matched /OAS/i, which
  // is broad enough to swallow the AUTHOR prompt: a replay then showed
  // stages ["planner","oas","oas:blocked_duplicate"] and no scene generated at all. The pattern is
  // now the observed opener sentence, and it is tested after the author markers so a prompt that
  // merely mentions the OAS can never be mistaken for one.
  // Matched on the OAS RESPONSE SCHEMA, which both the opener and the turn prompts carry and the
  // author prompt never does. My first pattern was the opener's own sentence, so TURN calls fell to
  // 'other' and were aborted: the integrated replay served exactly one beat, the dialogue never
  // resolved, and every downstream assertion failed for a reason that had nothing to do with them.
  if (/li_face_state|li_dialogue|You play .{1,40}? opening an intimate dialogue/i.test(sys)) return 'oas';
  if (/SCENE-SPINE planner|SCENE planner/.test(sys)) return 'planner';
  if (/BODY BIBLE/.test(sys)) return 'bible';
  return 'other';
};

// ── OAS FIXTURES: CONTRACT-DERIVED, AND LABELLED AS SUCH ────────────────────────────────────
// NOT A RECORDING. These are built from the OAS prompt's OWN declared output schema (app.js
// ~191079: li_dialogue, li_action, li_next_prompt, li_face_state, scene_state, scene_tone,
// user_signal, temperature_shift). A contract-derived fixture can exercise PARSING, the
// interaction turns, COMPLETION, history persistence and the handoff to the next planner. It
// cannot say anything about whether a real OAS reply is any good.
//
// LIVE OAS QUALITY IS UNTESTED and must be reported that way wherever these are used. Requiring a
// paid recording before testing the plumbing is what kept a REQUIRED segment of the opening
// unexercised through an entire ten-scene issue.
export const OAS_FACE_STATES = ['closed_smile', 'smirk', 'big_smirk', 'knowing_smirk',
  'lip_bite', 'lip_bite_held', 'hard_exhale', 'ahh'];

export const oasBeat = (opts) => {
  const o = opts || {};
  return JSON.stringify({
    li_dialogue: o.dialogue || 'You called to me, and everyone saw you do it.',
    li_action: o.action || 'he does not step closer',
    li_next_prompt: '',
    li_face_state: o.face || 'knowing_smirk',
    scene_state: o.sceneState || 'continue',
    scene_tone: o.tone || 'charged',
    user_signal: o.signal || 'neutral',
    temperature_shift: typeof o.shift === 'number' ? o.shift : 0,
    _fixture: 'contract-derived, not a recording'
  });
};

// A closing beat, so completion and handoff can be exercised without a live encounter.
export const oasClosingBeat = () => oasBeat({
  dialogue: 'Then say it where they can hear you, or do not say it at all.',
  action: 'he waits, and the clearing waits with him',
  sceneState: 'resolve', tone: 'charged', face: 'hard_exhale'
});

// The refs the verifier was asked about, parsed from its own user prompt.
export const refsFromVerifierRequest = (usr) =>
  (String(usr || '').match(/ref (prop:\d+:\d+)/g) || []).map(m => m.replace('ref ', ''));
