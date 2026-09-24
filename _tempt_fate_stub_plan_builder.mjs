// SHARED SCHEMA-AWARE STUB PLAN BUILDER — extracted verbatim from
// _tempt_fate_memory_erasure_live_test_harness.mjs (2026-09-23) so the dry UI-order proof and the
// harness stub the CG author with the SAME known-good shapes instead of drifting apart.
//
// This is not a generic mock. It reads the REAL system prompt's own declared requirements (which
// keys "reserved"/"aftermath" must contain, which aftermath lane id is mandated, which roster names
// may be present) and builds a response that satisfies them. Every phrase below traces to a real
// validator or a real lane's own signalRx — each one was added because an earlier, simpler stub was
// empirically REJECTED by that gate, not because it seemed plausible. Keep that property: if this
// builder starts guessing, the dry proofs stop meaning anything.

export function buildScheduleAwareStubResponse(sysText, usrText, isTemptScene) {
  const wantsLocalObjective = /"reserved" MUST be an object containing EVERY ONE of these exact keys/.test(sysText || '');
  const beats = [{ idx: 0, kind: 'narration', text: isTemptScene ? 'The clearing forgets its own reason for gathering.' : 'Lirael steps back, and the clearing does not explain itself.', speaker: null, tension_state: 'composed' }];
  // A SPEAKING WITNESS on the Tempt scene (added 2026-09-23). The paid run's scene put Julian on
  // the page — "The question stands" — while the outcome record named only "the assembly", and
  // nothing caught it. _temptOutcomeSceneRoster reads beat.speaker, so a stub whose only beat is
  // narration produces an EMPTY roster and silently skips the witness-accounting check it is
  // supposed to exercise. Keep a speaker here or section 3 stops proving anything.
  if (isTemptScene) beats.push({ idx: 1, kind: 'dialogue', text: 'The question stands.', speaker: 'Julian', tension_state: 'composed' });
  const base = { beats, visualState: {}, is_consummate_scene: false, hardBeats: [] };
  if (isTemptScene) {
    // Scope fields added 2026-09-23 with the scope-honesty validator: a delivered report that does
    // not declare requested-vs-delivered scope is now structurally invalid and will not commit, so
    // a stub omitting them would silently stop exercising the commit path it exists to exercise.
    // Invoker exemption + per-witness dispositions added 2026-09-23. Lirael's retained memory is
    // the DEFAULT anchor, declared rather than earned; Julian is on the page and so must be
    // resolved by name, not absorbed into "the assembly".
    base.temptFateOutcome = { delivered: true, changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }], durability: [{ aspect: 'the memory gap', status: 'persists' }], knowledgeStates: [{ character: 'Lirael', state: 'remembers', note: 'invoker anchor' }], establishedEvidence: ['torn mouth-band on the ground'], openPossibilities: ['someone could notice the arrangement of the clearing does not match anyone\'s memory of why they gathered'], requestedScope: 'everyone forgets the ceremony happened', deliveredScope: 'every witness present loses the memory of the ceremony', scopeMatch: 'full', ruptureClass: 'memory_perception',
      targetPopulation: { kind: 'all_present_except_invoker' },
      // Julian SATISFIES the effect: the memory is gone (memoryAbsent) and his unease comes from
      // the residue in the clearing, not from remembering. That is what lets this stay "full".
      affectedKnowers: [
        { who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of the ceremony' },
        { who: 'Julian', disposition: 'suspects', memoryAbsent: true, suspicionFromResidue: true, nowKnows: 'nothing of the ceremony, but the torn band on the ground does not fit the morning he remembers' }
      ],
      invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor', note: 'she keeps the memory of what she changed' },
      unaccountedParties: [] };
  }
  if (!wantsLocalObjective) return base;
  const reservedMatch = /"reserved" MUST be an object containing EVERY ONE of these exact keys, spelled exactly as given: \[([^\]]*)\]/.exec(sysText);
  const aftermathMatch = /"aftermath" MUST be an object containing EVERY ONE of these exact keys: \[([^\]]*)\]/.exec(sysText);
  const rosterMatch = /ROSTER — who CAN be present \(name only these; choose who IS\): ([^\n]*)/.exec(sysText || usrText || '');
  const reservedIds = reservedMatch ? reservedMatch[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
  const aftermathIds = aftermathMatch ? aftermathMatch[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
  const rosterNames = rosterMatch ? rosterMatch[1].split('·').map((s) => s.trim().replace(/\s*\(.*$/, '')).filter(Boolean) : ['Lirael'];
  const actor = rosterNames[0] || 'Lirael';
  const reserved = {}; reservedIds.forEach((id) => { reserved[id] = 'untouched'; });
  const aftermath = {}; aftermathIds.forEach((id) => { aftermath[id] = 'kept'; });
  const out = Object.assign({}, base, {
    tactical_move: isTemptScene ? 'Lirael watches the wish take hold.' : 'Lirael steps back from the center of the clearing.',
    state_change_precondition: 'The assembly is still gathered, confused.',
    state_change: isTemptScene ? 'The assembly\'s memory of the ceremony visibly empties.' : 'The assembly mills, unable to say why they gathered.',
    forces_choice: 'Lirael must decide whether to speak into the confusion or let it stand.',
    branch_a: 'She speaks, risking drawing attention to what only she remembers.',
    branch_b: 'She stays silent, letting the confusion pass her by unremarked.',
    local_objective: isTemptScene ? 'The wish\'s erasure visibly lands across the gathered assembly.' : 'The assembly\'s confusion continues to play out without resolution.',
    posture_read: 'The reader wants to observe the consequence land, not be told about it.',
    present: [actor],
    local_objective_actor: actor,
    reserved,
    aftermath,
    // "event_slots.exit_state" (a real, separate rejection reason seen empirically, from a DIFFERENT
    // gate than _validateLocalObjective — the planner-function/aftermath-lane gate) needs a
    // non-empty nested exit_state alongside aftermath_obligations below.
    // mechanism_grounding added 2026-09-24 with the capability grounding gate. A stub that omits
    // it is now REJECTED before the author — which is the gate working, but it makes every
    // downstream assertion in this harness fail for a reason unrelated to what it tests. 'ordinary'
    // is the honest value: nothing in this stub's event needs a special capability.
    event_slots: { exit_state: 'The assembly disperses, still not agreeing on what just happened.', mechanism_grounding: 'ordinary' }
  });
  // scene_function / aftermath_obligations — required whenever the seed declares a sceneFunction
  // row (app.js ~100488).
  if (/"scene_function_instantiated"/.test(sysText)) {
    out.scene_function_instantiated = 'the institutional preliminary-review lane';
    out.aftermath_obligations = 'The presiding Dohkar opens a preliminary review of Lirael\'s conduct; Julian\'s claimed authority over the eventual inquiry is not yet exercised.';
  }
  // chosen_aftermath_lane / lane_posture_modulation — required whenever the seed declares an
  // aftermathLanes menu (app.js ~100499/100501). If a frame was already resolved, the EXACT required
  // lane id is embedded in the prompt text itself ("MUST be EXACTLY \"<id>\"") — use it verbatim
  // rather than guessing; otherwise fall back to the first id in the listed menu.
  const exactLaneMatch = /"chosen_aftermath_lane" \(MUST be EXACTLY "([^"]+)"/.exec(sysText);
  const menuLaneMatch = /"chosen_aftermath_lane" \(EXACTLY one of these ids, spelled exactly as given — nothing else: \[([^\]]*)\]/.exec(sysText);
  if (exactLaneMatch || menuLaneMatch) {
    const laneId = exactLaneMatch ? exactLaneMatch[1] : menuLaneMatch[1].split(',')[0].trim();
    out.chosen_aftermath_lane = laneId;
    out.lane_posture_modulation = 'The reader\'s watchful posture keeps the lane procedural rather than confrontational.';
    // The REAL lane definitions (app.js ~129977-130088) additionally validate that the proposed
    // event/tactical-move actually INSTANTIATES the chosen lane, via a per-lane content regex
    // (signalRx) — a declared label alone is not enough (confirmed empirically: an earlier stub
    // version was rejected for exactly this). Phrases below are drawn directly from each lane's own
    // real signalRx, not guessed.
    const LANE_SATISFYING_PHRASE = {
      dohkar_preliminary_review: 'the presiding Dohkar sets a preliminary review date',
      family_accusation: 'Seren\'s family publicly accuses Lirael before the assembly',
      julian_jurisdiction_challenge: 'Julian challenges the Dohkar\'s jurisdiction over the matter',
      lirael_constrained: 'Lirael is placed under watch, constrained pending the inquiry',
      lirael_defensive_path: 'Lirael submits to procedure and demands specific terms'
    };
    const phrase = LANE_SATISFYING_PHRASE[laneId] || ('the scene instantiates the ' + laneId + ' lane');
    out.state_change = out.state_change + ' — ' + phrase + '.';
    out.tactical_move = out.tactical_move + ' — ' + phrase + '.';
    out.aftermath_obligations = phrase.charAt(0).toUpperCase() + phrase.slice(1) + ', moving the confrontation off the ritual floor and into procedure.';
  }
  return out;
}
