// ─────────────────────────────────────────────────────────────────────────────────────────────
// SETUP FIXTURES for the reader-path tests. Provider-free, $0.
//
// CONTRACT-DERIVED, NOT RECORDINGS. Every key below was read from the producing prompt in
// public/app.js (PC bible ~268532, LI bible ~269596, R-PLOT ~277175, A-PLOT ~62480) so each
// response matches the shape its parser expects. They are deliberately generic: they assert NO
// canon for the Book used as a vehicle, because they exist only to let onboarding finish so the
// AUTHOR gets called. Nothing here is the behaviour under test.
//
// THE BOUNDARY: these simulate MODEL RESPONSES for setup stages. They never manufacture
// application state, acceptance, persistence or settlement — those must happen in production
// code or not at all.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export const PC_BIBLE = {
  age: 29, ancestry: 'mixed European', height: '5\'7"', build: 'narrow-shouldered, restless',
  complexion: 'olive, uneven in winter',
  hair: { category: 'dark', detail: 'blunt-cut to the jaw, usually pinned back badly' },
  face: { focus: 'eyes', detail: 'heavy brows that make her look angrier than she is' },
  signature_feature: 'a chipped front tooth she never had capped',
  second_celebrated_feature: 'the hollow of her throat',
  visual_anchor: 'a man\'s wristwatch worn loose, two sizes too big',
  stress_tic: 'she turns the watch face inward',
  confidence_tell: 'she stops apologising mid-sentence',
  impatience_tell: 'she answers before the question finishes',
  desire_tell: 'she goes very still',
  vulnerability_tell: 'she makes a joke at her own expense',
  core_contradiction: 'she wants to be known and arranges never to be',
  emotional_weather: 'braced',
  private_hope: 'that someone asks her to stay without being prompted',
  immediate_want: 'to get through the evening unrecognised',
  immediate_fear: 'being recognised',
  wound: { category: 'abandonment', core: 'she was left somewhere public and had to walk home',
    time_since_impact: 'eleven years', refusal: 'she will not ask anyone to wait for her',
    woundSurfacingMechanism: 'she leaves first, every time' },
  current_crisis: { event: 'the invitation she accepted was meant for someone else',
    detail: 'she came anyway' },
  hottest_emotion: 'shame that keeps turning into defiance',
  li_complication: 'he is the one who sent the invitation'
};

export const LI_BIBLE = {
  age: 34, ancestry: 'mixed European', height: '6\'1"', build: 'solid, deliberately still',
  complexion: 'fair, weathered at the temples',
  hair: { category: 'dark', detail: 'cut short, greying early at one temple' },
  face: { focus: 'mouth', detail: 'a mouth that rests just short of amused' },
  eye_color: 'grey-green', voice_quality: 'low, unhurried, carries without rising',
  mouth_quality: 'full, held closed', hands_quality: 'broad, scarred across one knuckle',
  signature_feature: 'the early grey at one temple',
  second_celebrated_feature: 'his forearms when he rolls his sleeves',
  self_conscious_feature: 'the scarred knuckle',
  visual_anchor: 'he rolls his cuffs back twice before he speaks seriously',
  signature_behavior: 'he waits a beat longer than anyone else before answering',
  signature_habits: ['he pours for other people first', 'he stands when she enters'],
  holding_style: 'one hand at the back of a chair, never on a person',
  attraction_pattern: 'he watches her hands, not her face',
  attraction_manifestation: 'he moves things out of her way before she reaches them',
  interest_tell: 'he stops looking at the room', focus_tell: 'he turns his whole body',
  restraint_tell: 'he puts his glass down', frustration_tell: 'he goes polite',
  deflection_pattern: 'he answers a question with a better question',
  desire_tell: 'he lowers his voice instead of leaning in',
  emotional_weather: 'contained', hunger: 'to be chosen openly rather than privately',
  deprivation: 'nobody has needed him for anything but competence in years',
  wound: { category: 'betrayal', core: 'he was used as a reference by someone who then disappeared',
    time_since_impact: 'six years' },
  defining_anecdote: 'he once stayed four hours past closing to walk a stranger to her car',
  secondary_anecdote_different_register: 'he refused a promotion rather than fire a friend',
  surfacing_hint: 'he never says the name of the person who left',
  signature_kink: 'being asked for, out loud'
};

export const R_PLOT = {
  relationshipQuestion: 'Will she let herself be known by someone who already knows?',
  coreTension: 'He keeps making room for her; she keeps declining it.',
  escalationAxis: 'from deniable proximity to stated want',
  issuePressures: [{ issue: 1, pressure: 'she cannot leave without being seen leaving' }],
  issueRelationshipStates: [{ issue: 1, state: 'strangers who are not strangers' }],
  relationshipMilestones: [{ atScene: 3, event: 'she says his name first' },
                           { atScene: 7, event: 'she asks him for something' }]
};

export const A_PLOT = {
  kind: 'social', proper_name: 'The Lennox Invitation',
  goal: 'get through the party without being named aloud',
  antagonistOrAntiForce: 'the room\'s appetite for a story',
  antagonistShape: 'a crowd', antagonistSubject: 'the other guests',
  antagonistPersonalTie: 'one of them knew her before',
  stakesIfWin: 'she leaves with her name still her own',
  stakesIfFail: 'she becomes the evening\'s anecdote',
  personalStakePC: 'the version of herself she has spent years building',
  personalStakeLI: 'the trust he spent to get her through the door',
  namedClock: 'the toast at midnight', clockUnit: 'hours', totalClockUnits: 4,
  milestones: [{ atPercent: 25, atScene: 2, event: 'someone almost says her name' },
               { atPercent: 60, atScene: 5, event: 'the near-miss becomes a question' }],
  pcWound: 'she was left somewhere public', pcWoundCategory: 'abandonment',
  liWound: 'he was used and discarded', liWoundCategory: 'betrayal',
  liEmotionalNeedFromPC: 'to be asked for plainly',
  pcUnknowinglySatisfies: 'she asks him for nothing, which he reads as being trusted',
  woundLoadBearingProof: 'every exit she plans is a door she can reach alone',
  woundSurfacingMechanism: 'she leaves first',
  emotional_conductivity: 'high'
};


// ── SECOND WAVE: the stages that only appear once the first six succeed ──────────────────────
export const WHY_THIS_PAIR = {
  whyHer: 'She asks him for nothing, which is the first time anyone has not wanted something.',
  whyHim: 'He makes room without announcing it, which she can accept without admitting she needs it.',
  attractionEngine: 'withheld recognition',
  psychologicalLock_pc: 'she can be seen without being handled',
  psychologicalLock_pc_secondary: 'he does not ask her to explain herself',
  psychologicalLock_li: 'she wants him present, not useful',
  psychologicalLock_li_secondary: 'she never checks whether he is still watching',
  eroticLock_pc: 'his restraint reads as a question she gets to answer',
  eroticLock_li: 'her stillness when she wants something',
  irreplaceabilityProof_pc: 'anyone else would have said her name by now',
  irreplaceabilityProof_li: 'anyone else would have made her ask twice'
};

export const APLOT_COMPRESSION = Array.from({ length: 6 }, (_, i) => ({
  pressure_sentence: 'The room narrows around her by one more person.',
  state_change: 'She is recognised by one more guest than before.',
  state_change_precondition: 'she is still in the room',
  forces_choice: 'answer to the name, or leave before the toast',
  emotional_consequence: 'the evening stops being deniable',
  li_entanglement_one_line: 'he is the reason she can stay and the reason staying costs something',
  branch_a_delete_test: 'without this the toast arrives with nothing at stake',
  branch_b_delete_test: 'without this she could leave at no cost'
}));

export const ANTAGONIST_BIBLE = {
  archetype: 'the charming gatekeeper', archetype_signature: 'he makes exclusion feel like taste',
  height: '5\'11"', build: 'trim, expensively kept', complexion: 'fair, evenly tanned',
  hair: { category: 'light', detail: 'silver at the crown, cut close' },
  face: { focus: 'eyes', detail: 'a smile that arrives before the eyes do' },
  eye_color: 'pale blue', voice_quality: 'warm, pitched to carry just far enough',
  hands_quality: 'manicured, always holding something',
  signature_feature: 'a signet ring he turns while listening',
  visual_anchor: 'he touches the small of a guest\'s back to steer them',
  control_tell: 'he answers for other people',
  targeting_tell: 'he repeats a name until the room learns it',
  escalation_tell: 'his warmth increases as his questions narrow',
  pleasure_tell: 'he laughs a half-beat before the joke lands',
  corrupted_warmth_tell: 'he offers help that costs the receiver something later',
  softness_seam: 'he genuinely loves the music and stops talking for it',
  proximity_default: 'one step closer than is comfortable',
  eyes_register: 'he looks at who is watching, not at who is speaking',
  pc_keeps_noticing: 'how often his hand is on someone',
  ex_romance_archetype: null
};

export const SWAP_TEST = {
  verdict: 'pass',
  swap_test: 'Another love interest could not resolve this wound; it requires someone who '
    + 'declines to use her.',
  link: 'her abandonment wound is answered specifically by his refusal to need anything from her',
  interaction_type: 'complementary',
  integration_mode: 'wound_answered_by_restraint',
  fix: null
};

// The canonicalisation/normalisation engine. Shape read from the prompt's own response block
// (app.js:18272 ff): it echoes the input unchanged, which is the correct no-op for fixture text
// that contains no protected IP.
export const NORMALIZATION = {
  kind: 'real_ancestry',
  normalized_text: '',
  canonical_form: null,
  rejection_reason: null,
  confidence_level: 'high'
};

export const STRATEGY = {
  intent_category: 'hold_position', type: 'social', present: ['Lirael', 'Julian'],
  st_phase: 'early', tone_pressure: 'rising', power_vector_shift: 'toward the room',
  active_entropy_axis: 'exposure', entropy_manifestation_summary: 'she is noticed more each minute',
  syzygy_triggered: false, world_artifact_to_surface: null, petition: null
};

export const SUBPLOTS = { subplots: [
  { id: 'sp1', title: 'The Misdirected Invitation', summary: 'Someone else was meant to be here.',
    involved_characters: [{ role: 'pc', secondary_role: 'subject' }], initial_status: 'open',
    first_surface_scene: 2, emotional_weight: 'medium', thematic_alignment: 'exposure',
    convergence_potential: 'high' },
  { id: 'sp2', title: 'The Unsigned Demand', summary: 'No one will say who signed it.',
    involved_characters: [{ role: 'li', secondary_role: 'withholder' }], initial_status: 'open',
    first_surface_scene: 3, emotional_weight: 'high', thematic_alignment: 'authority',
    convergence_potential: 'medium' } ] };

// THE LINE-EDITOR IS A REAL DOWNSTREAM REWRITE. It returns {quote, replacement} pairs that the
// app applies to the ACCEPTED prose (orchestration-client.js:3076). The fixture uses it to
// REMOVE A SPAN THE HISTORY NOTE CITES, which is the only honest way to test that a stored note
// is checked against the final prose rather than the draft it was written from.
export const LINE_EDIT_REMOVING_CITED_SPAN = [
  { quote: 'began reading the demand aloud',
    replacement: 'unfolded the page and said nothing for a moment' }
];
export const LINE_EDIT_NOOP = [];

// Which stage a system prompt belongs to. Read from the producing prompts, not guessed.
export function setupStageOf(sys) {
  if (/this character's ONE memorable physical marker/.test(sys)) return 'pc_bible';
  if (/this love interest's ONE memorable physical marker/.test(sys)) return 'li_bible';
  if (/You are designing an R-PLOT/.test(sys)) return 'r_plot';
  if (/You are the A-PLOT GENERATOR/.test(sys)) return 'a_plot';
  if (/scene-structure planner for the OPENING scene/.test(sys)) return 'opening_planner';
  if (/Write a "Previously…" recap/.test(sys)) return 'recap';
  if (/architect of WHY THIS PAIR/.test(sys)) return 'why_pair';
  if (/compressing the procedural A-plot/.test(sys)) return 'aplot_compress';
  if (/generating an ANTAGONIST BODY BIBLE/.test(sys)) return 'antagonist_bible';
  if (/WOUND.{0,3}LI SWAP TEST/.test(sys)) return 'swap_test';
  if (/canonicalization and normalization engine/.test(sys)) return 'normalization';
  if (/Strategy Engine for an interactive romance/.test(sys)) return 'strategy';
  if (/SUBPLOT GENERATOR for Storybound/.test(sys)) return 'subplots';
  if (/ruthless line-editor for romance prose/.test(sys)) return 'line_edit';
  if (/Fix ONLY mechanical defects/.test(sys)) return 'mech_fix';
  return null;
}

export const SETUP_RESPONSES = {
  pc_bible: PC_BIBLE, li_bible: LI_BIBLE, r_plot: R_PLOT, a_plot: A_PLOT,
  why_pair: WHY_THIS_PAIR, aplot_compress: APLOT_COMPRESSION,
  antagonist_bible: ANTAGONIST_BIBLE, swap_test: SWAP_TEST, normalization: NORMALIZATION,
  strategy: STRATEGY, subplots: SUBPLOTS, line_edit: LINE_EDIT_NOOP,
  recap: { bullets: ['She accepted an invitation meant for someone else.',
                     'She went anyway, and he noticed her at the door.',
                     'He has not said her name where anyone can hear it.',
                     'The toast is at midnight and she has not left.'] },
  opening_planner: {
    // opening_spine is DELIBERATELY ABSENT: it must be an OBJECT, and rather than guess its
    // shape the fixture leaves the recognised fields at top level and lets production's own
    // CONTAINER RECOVERY build it (app.js:135677). The field list below was read from the LIVE
    // user prompt, which is what _openingSpineDeclaredFields parses, so nothing is invented and
    // no undeclared key is sent (the envelope rejects strays).
    pressure_source_type: 'relational',
    pressure_source: 'the host who knows exactly who she is',
    hook_object: null,
    // The validator looks this up by person_id among the people physically present, and
    // explicitly permits NULL ("name the person_id the opening beat stages, or null",
    // app.js:281601). The fixture does not invent a person_id it was never issued.
    opening_actor_id: null,
    opening_beat: 'She steps into the room and the conversation changes pitch.',
    rising_beats: ['A stranger almost names her aloud.', 'The room waits for her to answer.'],
    decision_beat: 'She can answer to the name, or walk back out.',
    pc_career: 'archivist',
    opening_setting: 'a crowded upstairs room at a private party',
    environment_elements: ['the long table along the wall', 'the door she came in by'],
    li_texture_beat: 'He moves a glass out of her reach before she reaches for it.',
    pc_wound_anchor: 'she checks where the door is before she speaks',
    pc_self_presentation_beat: 'she gives a shorter name than the one she was invited under',
    scene_want: 'to get through the room without being named',
    scene_mission: 'Establish that she is here under a name that is not hers, and that one '
      + 'person in the room already knows it.',
    reader_state: {
      knows: 'she accepted an invitation meant for someone else',
      believes: 'she can leave before anyone places her',
      wondering: 'who sent the invitation, and why',
      must_not_confuse: 'the host\'s courtesy for ignorance'
    },
    // environment_plus / character_plus are declared fields. Omitting environment_plus made the
    // scaffold builder throw, which the app itself labels "[SCENE1:SCAFFOLD:BUG] ... a defect,
    // not a fallback" — reported separately; the fixture supplies it so the run can continue.
    // scene_skeleton is the top-level container (the envelope moves it opening_spine -> top
    // level), and pc_opening_fusion lives inside it — precisely the object the scaffold builder
    // dereferenced while it was null.
    scene_skeleton: {
      // environment_plus belongs at scene_skeleton level, not inside the fusion.
      environment_plus: {
        // _EP_AXES allowlist (app.js:282272): history|use|damage|ownership|repair|ritual|absence
        axis: 'use',
        target: 'the long table along the wall',
        // A target and an axis with no physical evidence is an assignment with nothing in it.
        beat: 'The table\'s varnish is worn pale in a band where a hundred elbows have rested.',
        grounds: ['env:axis', 'stage:element:1'],
        text: 'Every step toward the table puts another face between her and the door.'
      },
      // The fusion is what the repair pass targets when it is thin. CONTACT verbs are an
      // enumerated set from the live prompt (GRIP/PRESS/.../HOLD), and "grounds" MUST include
      // env:axis plus at least one id that is not env:*.
      // ── THE FUSION, ASSEMBLED FROM THE VALIDATOR AND THE CONTRACT TOGETHER ────────────────
      // Required v3 fields (app.js:282582): pc_lens_operation, character_revelation,
      // environment_pressure — plus a STRUCTURED contact (verb + object).
      //   · pc_lens_operation must be one of the four ISSUED for this mask. BEAUTIFUL_RUIN's are
      //     EXAMINE_FOR_THE_HOOK_UNDERNEATH / TEST_WHO_IS_PAYING_ATTENTION_AND_WHY /
      //     DISTRUST_THE_UNEARNED / DISCOUNT_HER_OWN_STANDING (_PC_LENS_OPERATIONS, app.js:141674).
      //   · contact.object must be the EXACT name of an issued stage element, and the verb must
      //     be permitted by that element's affordance (SURFACE does not take HOLD; PRESS does).
      //   · environment_pressure is an OBJECT whose grounds cite ISSUED ids, and must include
      //     env:axis plus at least one id that is not env:*.
      pc_opening_fusion: {
        pc_lens_operation: 'EXAMINE_FOR_THE_HOOK_UNDERNEATH',
        character_revelation: 'She reads the room for what the invitation is going to cost her.',
        contact: { verb: 'PRESS', object: 'the long table along the wall' },
        environment_pressure: {
          text: 'Every arrival puts another body between her and the door she came in by.',
          grounds: ['env:axis', 'stage:fact:1']
        }
      },
      character_plus: null
    },
    pc_body_callback: 'she turns the loose watch face inward',
    antagonist_body_callback: null,
    staged_characters: [{ name: 'the narrator', presence: 'IN_PERSON',
      anchor_beat: 'she is the one moving through the room' }],
    // stage_contract is the ONE field the envelope allows at top level (allowTopLevel, app.js
    // :281329) because the planner owns part of the stage. Sub-keys taken from the declared list.
    stage_contract: {
      v: 1,
      // Refs must be ISSUED ones the prompt hands the planner (protagonist:not_an_issued_ref),
      // and facts are objects with text, not bare strings (fact_without_text). The fixture
      // therefore issues NO refs of its own and carries only well-formed facts.
      // The live prompt issues exactly one: "stage:participant:pc:self = pc:self [issued_ref]".
      participants: [{ ref: 'pc:self', role: 'pc', presence: 'IN_PERSON',
        placement: 'just inside the doorway' }],
      // Every element needs one issued affordance from the enumerated set.
      elements: [{ ref: 'stage:element:1', name: 'the long table along the wall', affordance: 'SURFACE' },
                 { ref: 'stage:element:2', name: 'the door she came in by', affordance: 'PORTAL' }],
      event_facts: [{ text: 'the room is crowded' }, { text: 'the toast has not happened yet' }]
    }
  }
};
