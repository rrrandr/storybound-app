// Extracts REAL recorded provider replies from the 6MB replay recording
// (_scene2_repair_replay_sample_out/run_1789884119160.jsonl) for the two upstream funnel stages
// that _fsc_delivery_servedapp_control.mjs's section D needs stubbed so the seeded First Sacrifice
// path completes past them and reaches the terminal author request. See CLAUDE-facing task notes
// for full rationale (feedback_shape_faithful_mocks: a mock returns ONE real shape, never a guess).
//
// Findings (see _fsc_replay_summary.json, produced by _fsc_inspect_replay.mjs):
//   - SCENE-SPINE planner (fingerprint "You are the SCENE-SPINE planner for an interactive romance
//     engine...") IS present in the recording: roleTag 'scene2-structural-author', dispatched to
//     /api/mistral-proxy, paired with a real 200 response. Used AS-IS.
//   - The terminal screenplay-author request ("You are a screenplay-native cinematic-romance
//     writer...") is ALSO present: same roleTag, dispatched to /api/proxy, paired with a real 200
//     response. Used AS-IS for the author stub's content (real shape + real text, even though it
//     was generated for a different scene — the point is a REAL provider reply shape, not invented
//     JSON).
//   - The PC/LI body-bible stage ("DISTINGUISHING FEATURE (anti-calcification ROTATION — HARD)...")
//     is NOT present anywhere in this recording (grep confirms zero matches). No real reply exists
//     to extract. A minimal synthetic reply is derived instead, directly from the parser at
//     public/app.js ~266396-266422 (_generatePCBodyBible): the ONLY hard requirements are
//     `bible.signature_feature` truthy and at least one of `bible.stress_tic` / `bible.desire_tell`
//     truthy — everything else downstream is guarded by its own try/catch or truthy-checks. This is
//     flagged source:'derived' in the output fixture, not source:'real-recording'.
import fs from 'fs';

const src = '_scene2_repair_replay_sample_out/run_1789884119160.jsonl';
const lines = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean);
const events = lines.map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);

function extractContent(respBody) {
  if (!respBody) return null;
  if (typeof respBody.content === 'string') return respBody.content;
  const c = respBody.choices && respBody.choices[0] && respBody.choices[0].message && respBody.choices[0].message.content;
  return typeof c === 'string' ? c : null;
}

function findPair(matchDispatch) {
  const dIdx = events.findIndex((e) => e.kind === 'dispatch' && matchDispatch(e));
  if (dIdx === -1) return null;
  const d = events[dIdx];
  // paired response: the next 'response' event with the same roleTag+url, in file order after the dispatch.
  const r = events.find((e, i) => i > dIdx && e.kind === 'response' && e.roleTag === d.roleTag && e.url === d.url);
  if (!r) return null;
  return { dispatch: d, response: r };
}

// -- SCENE-SPINE planner --
const plannerPair = findPair((e) =>
  e.url && e.url.indexOf('/api/mistral-proxy') >= 0 &&
  e.requestBody && e.requestBody.messages && e.requestBody.messages[0] &&
  /SCENE-SPINE planner/.test(String(e.requestBody.messages[0].content || '')));

let plannerContent = null;
if (plannerPair) plannerContent = extractContent(plannerPair.response.responseBody);

// PATCH (Roman's task note: "if the recording turns out not to contain a usable reply... describe
// the minimal realistic shape you used instead"). The real recorded reply IS genuinely usable for
// most of the funnel (its local_objective/local_objective_actor/present/reserved/stage_* fields are
// exactly what let a first dry run reach '[OBJECTIVE:ACCEPTED]' and the SCENE-ASSIGNMENT/STATE-CHANGE
// stages downstream) — but it predates the AFTERMATH LANE governance layer (public/app.js ~9222
// _detectPlannerFunctionGap, called from the CG:PLANNER-GATE at ~236516-236558) and so carries NONE
// of chosen_aftermath_lane / lane_posture_modulation / mechanism_grounding / aftermath_obligations.
// A first live run against the unpatched real content was REJECTED at that gate:
//   "[CG:PLANNER-GATE] REJECTED before author dispatch, scene=1 — the planner declared no
//   chosen_aftermath_lane ... specifically the resolved lane \"dohkar_preliminary_review\""
// That required lane is resolved DETERMINISTICALLY from app state (_resolveStarterEventFrame), never
// from the model's reply, so it is not a guess — it is what THIS exact seeded scene requires. Only
// the fields this specific gate inspects are overridden below; everything else stays the untouched
// real recorded reply. Sourced directly from the app's own canon text for this lane:
//   signalRx (public/app.js ~131395): /\b(preliminary review|calls? for (?:a )?review|demands?
//     (?:a )?review|recommends? (?:a )?review|warns? of (?:a )?review|review will follow|answer for
//     (?:her|his) conduct|matter (?:of conduct )?(?:is |be )?referred)\b/i
//   defaultEventFrame.eventFrame (public/app.js ~131545): "The presiding Dohkar puts Lirael's
//     conduct formally in question before the assembly — he states that it WILL be reviewed and
//     that she will answer for it, moving the confrontation off the ritual floor and into
//     procedure. He does NOT name who will convene it, does NOT give a date or timeframe, and does
//     NOT name The Open, a Chayr, or "two Dohkars" — the seed reserves the constituted inquiry for
//     LATE Issue 1 ... The pressure is the event; the proceeding is not."
// The override text below is that canon event frame, reworded to (1) contain literal signalRx
// vocabulary ("demands a review" — the frame's own exact wording contains no signalRx phrase, so a
// verbatim copy would still fail the lane-content check) and (2) DROP the frame's own "he does NOT
// name who will convene it / a date / The Open / a Chayr / two Dohkars" restriction clause. That
// clause is authoring GUIDANCE (telling a prose author what not to write) — restating it inside the
// PLAN's own state_change field ironically trips public/app.js's _detectReservedContentBreach
// (~194199), a deterministic, negation-blind keyword scan (app.js ~194206: "nothing is being
// convened or scheduled" gate fires on the literal word "convene" appearing ANYWHERE in scope,
// including inside "does NOT convene") co-occurring with 2+ of its seed-reserved markers
// (dohkar/julian/chayr/lirael/open, all of which the restriction clause names in order to forbid
// them) — confirmed by a live run: "[CANON-DET] BLOCKED ... markers [dohkar, julian, chayr, lirael,
// open] with \"convene\"". The restriction is honored simply by never writing the reserved content
// (conveners/date/venue) in the first place, which this shorter form does without the checker-baiting
// disclaimer sentence.
const plannerOverride = {
  tactical_move: 'force the presiding Dohkar to escalate the confrontation off the ritual floor and into procedure by demanding a review of Lirael’s conduct before the assembly',
  state_change_precondition: 'the assembly has not yet heard any authority demand a review of Lirael’s conduct',
  state_change: 'The presiding Dohkar puts Lirael’s conduct formally in question before the assembly — he demands a review of her conduct and states that she will answer for it, moving the confrontation off the ritual floor and into procedure. The pressure is the event; the proceeding is not.',
  forces_choice: 'forces Lirael to choose whether to answer the Dohkar’s demand for review now, before the assembly, or to hold her silence and let the demand stand unanswered',
  branch_a: 'Lirael answers the Dohkar’s demand directly, before the assembly',
  branch_b: 'Lirael holds her silence and lets the demand for review stand unanswered',
  chosen_aftermath_lane: 'dohkar_preliminary_review',
  lane_posture_modulation: 'the reader’s recorded posture determines whether Lirael meets the Dohkar’s demand with open defiance or a guarded, procedural calm, but the demand itself and its procedural framing do not change.',
  mechanism_grounding: 'ordinary',
  aftermath_obligations: 'the Dohkar’s demand for a review of Lirael’s conduct is now on record before the assembly and must be addressed — answered, deflected, or escalated — in a following scene',
  event_slots: {
    precondition: 'the presiding Dohkar and the assembly are present to hear him speak',
    actor: 'the presiding Dohkar',
    action: 'demands a review of Lirael’s conduct before the assembly, moving the confrontation off the ritual floor and into procedure',
    target: 'Lirael',
    exit_state: 'the assembly now knows that Lirael’s conduct will be reviewed and that she must answer for it',
    mechanism_grounding: 'ordinary',
  },
};
let plannerContentPatched = null;
if (plannerContent != null) {
  let cleaned = plannerContent.replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const real = JSON.parse(cleaned);
  const merged = Object.assign({}, real, plannerOverride, {
    event_slots: Object.assign({}, real.event_slots || {}, plannerOverride.event_slots),
  });
  plannerContentPatched = JSON.stringify(merged);
}

// -- terminal screenplay author --
const AUTHOR_MARKERS = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
  /screenplay-native|cinematic-romance writer|prose author/i];
function markCount(sysText) { return AUTHOR_MARKERS.reduce((n, rx) => n + (rx.test(sysText) ? 1 : 0), 0); }

const authorPair = findPair((e) => {
  if (!e.url || e.url.indexOf('/api/proxy') < 0) return false;
  const sys = e.requestBody && e.requestBody.messages && e.requestBody.messages[0] && e.requestBody.messages[0].content;
  const sysText = typeof sys === 'string' ? sys : '';
  const msgs = (e.requestBody && e.requestBody.messages || []).length;
  return msgs === 2 && markCount(sysText) >= 2;
});

let authorContent = null;
if (authorPair) authorContent = extractContent(authorPair.response.responseBody);

// -- confirm pc body-bible fingerprint is genuinely absent (do not silently assume) --
const bodyBiblePresent = events.some((e) => e.kind === 'dispatch' && e.requestBody && e.requestBody.messages &&
  e.requestBody.messages[0] && /DISTINGUISHING FEATURE \(anti-calcification ROTATION/.test(String(e.requestBody.messages[0].content || '')));

// Populates BOTH the PC-bible hard requirements (signature_feature + stress_tic/desire_tell,
// public/app.js ~266419) AND the LI-bible hard requirements (signature_feature +
// voice_quality/hands_quality/mouth_quality, public/app.js ~267504) so the SAME fixture is a valid
// reply under either "BODY BIBLE" fingerprint match, in case the LI stage is ever reached too.
const pcBodyBibleDerived = JSON.stringify({
  signature_feature: 'a habit of tracing the seam of her own sleeve when she is deciding whether to trust someone',
  stress_tic: 'presses her tongue flat against the back of her teeth and counts silently to four',
  desire_tell: 'goes very still and stops blinking for a beat too long',
  vulnerability_tell: 'her voice drops half a register and she talks faster to cover it',
  emotional_weather: 'quietly watchful, waiting to be given a reason to stop bracing',
  core_contradiction: 'performs self-sufficiency while starving for someone to notice she is not fine',
  private_hope: 'to be fully known and not leave the room after',
  voice_quality: 'low, unhurried, drops a half-step when he means something',
  hands_quality: 'careful, deliberate hands that go still before he says anything that matters',
  mouth_quality: 'a mouth that tips crooked on one side before he lets himself smile all the way',
  current_crisis: {
    event: 'she is forced to choose between the plan she built her whole identity around and the person standing in front of her',
    immediate_fear: 'that choosing wrong costs her everything twice',
    li_complication: 'the love interest is on the other side of the choice, not beside it',
    refusal: 'she insists she can carry this alone, the way she always has'
  }
});

const out = {
  scenePlanner: plannerPair
    ? { source: 'real-recording+patched', sourceFile: src, roleTag: plannerPair.dispatch.roleTag, sourceUrl: plannerPair.dispatch.url,
        patchReason: 'real reply predates the aftermath-lane governance layer (public/app.js ~9222/~236516) and carries no chosen_aftermath_lane/mechanism_grounding/lane_posture_modulation/aftermath_obligations; a first live run was REJECTED at [CG:PLANNER-GATE] for exactly that. Only those fields (plus state_change/tactical_move/forces_choice/branch_a/branch_b/event_slots, which the lane-content check also inspects) are overridden with content derived from this lane\'s own canon signalRx (app.js ~131395) and defaultEventFrame (app.js ~131545); every other field (local_objective, local_objective_actor, present, reserved, posture_read, stage_location, stage_issued_objects, stage_affordances, aftermath) is the untouched real recorded reply.',
        rawRecordedContent: plannerContent, content: plannerContentPatched }
    : { source: 'MISSING — no matching dispatch/response pair found in the recording' },
  authorGrok: authorPair
    ? { source: 'real-recording', sourceFile: src, roleTag: authorPair.dispatch.roleTag, sourceUrl: authorPair.dispatch.url, content: authorContent }
    : { source: 'MISSING — no matching dispatch/response pair found in the recording' },
  pcBodyBible: {
    source: 'derived',
    derivation: 'public/app.js ~266396-266422 (_generatePCBodyBible parser): only bible.signature_feature (truthy) plus at least one of bible.stress_tic / bible.desire_tell (truthy) are hard-required; everything else downstream is guarded. Fields above populate the full documented shape so no optional consumer trips on an unexpectedly-missing field.',
    confirmedAbsentFromRecording: !bodyBiblePresent,
    content: pcBodyBibleDerived,
  },
};

fs.writeFileSync('_fsc_stage_fixtures.json', JSON.stringify(out, null, 2));
console.log('scenePlanner: ' + out.scenePlanner.source + (plannerContentPatched ? ' (patchedLen=' + plannerContentPatched.length + ', rawLen=' + (plannerContent ? plannerContent.length : 0) + ')' : ''));
console.log('authorGrok: ' + out.authorGrok.source + (authorContent ? ' (contentLen=' + authorContent.length + ')' : ''));
console.log('pcBodyBible: derived, confirmedAbsentFromRecording=' + !bodyBiblePresent);
console.log('wrote _fsc_stage_fixtures.json');
