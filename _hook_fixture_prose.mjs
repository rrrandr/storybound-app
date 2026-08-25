// SCENE-1 HOOK FIXTURE — the prose generator, shared by the fixture builder and the
// repair-cascade harness so both assert against literally the same text.
//
// Built mechanically against the live detector (see _hook_fixture.mjs for the full
// branch map). The only variable is the OBJECT WORD in the opening window:
//
//   'letter'  a world object token   -> groupB true  -> hook PASSES, _evaluate = []
//   'moment'  not a token            -> groupB false -> exactly one HARD hook failure,
//                                       reason `no_object_token`
//   'burden'  not a token            -> same failure, but a DIFFERENT text, so a
//                                       surgical "repair" that returns it is drift-safe
//                                       yet still failing (the only path to attempt 2)
//
// Every variant has identical paragraph structure and word count, so the swap is provably
// hook-specific and cannot trip the drift guard.

export const TOKEN_WORD = 'letter';    // must be in _scene1ObjectTokenList()
export const NONTOKEN_A = 'moment';    // same length, not a token
export const NONTOKEN_B = 'burden';    // same length, not a token

// Shape signal for `magical_or_physical_anomaly`. Deliberately NOT `the pact` or
// `the summons`: those shape patterns are ALSO object tokens, so either would silently
// restore groupB in the failing variants and destroy the contrast.
export const SHAPE_SIGNAL = 'The glow along the far wall had not shifted since dawn.';

// The love interest is absent by construction: this scene carries an off-stage contract,
// and any bodily presence cue adds a second hard `li_on_stage` failure.
const CAST = ['Lirael', 'Seren', 'Kesh', 'Maren'];
const VERBS = ['turned toward', 'considered', 'stepped past', 'reached for', 'measured', 'refused'];
// 'burden' must NOT appear here — it is NONTOKEN_B, the marker that identifies the
// still-failing repair variant, and a collision would make the variants indistinguishable.
const NOUNS = ['answer', 'regret', 'matter', 'wonder', 'motive', 'ritual'];

// The planner's `scene_want` must share at least one content word (length >= 4, non-stop)
// with the first 250 words, or the post-prose scrub sets sceneWantAbsent and _evaluate
// pushes a SOFT `scene_want_absent` fail. That soft fail is not cosmetic here: it makes
// every repair "not strictly better" and short-circuits the accept branch entirely.
// 'answer' appears in the first paragraph of every variant.
export const SCENE_WANT = 'to hold the answer steady';
const DIALOGUE = '"Set it down where they can see," Seren said.';

// groupA comes from DIALOGUE, not from a name: the proper-noun scan starts at token
// index 1 of each sentence, so a sentence-initial name never counts.
export const ENDING =
  `Lirael chose. She set the ${TOKEN_WORD} down on the table and said, "I will carry it."`;

export function buildScene1Prose(objectWord) {
  const paras = [];
  let n = 0;
  for (let p = 0; p < 5; p++) {
    const sent = [];
    for (let i = 0; i < 8; i++, n++) {
      const obj = (n % 4 === 0) ? `the ${objectWord}` : `the ${NOUNS[n % NOUNS.length]}`;
      sent.push(`${CAST[n % CAST.length]} ${VERBS[(n * 3) % VERBS.length]} ${obj} while the hall held its breath.`);
      if (n === 2) sent.push(DIALOGUE);
      if (n === 4) sent.push(SHAPE_SIGNAL);
    }
    paras.push(sent.join(' '));
  }
  return paras.concat([ENDING]).join('\n\n');
}

/** Occurrences of `the <objectWord>` — how each variant is identified in mounted prose. */
export function countObject(text, objectWord) {
  return (String(text || '').match(new RegExp(`the ${objectWord}`, 'g')) || []).length;
}
