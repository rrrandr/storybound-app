// SHARED RUN SCORER. Provider-free, no network.
//
// Built after the C4 run on unm.time_gives_way, where my own harness reported a CLEAN C2 on a
// scene that plainly failed it. Two defects, both fixed here:
//
//   1. C2 tested ROSTER PRESENCE only. The pre-registered criterion requires that "every roster
//      member's state is consistent with the declared disposition." A scene in which Lirael
//      narrates the replaced timeline scored as a pass because her NAME appeared.
//   2. The aftermath matcher false-negatived on Seren's rendered beat, because it demanded a
//      negation/uncertainty word AFTER the name in the same sentence.
//
// The external-timeline vocabulary is READ OUT OF public/app.js rather than restated here, so the
// instruction the author is given and the check it is scored against cannot drift apart.
import fs from 'fs';

// ── ONE SOURCE OF TRUTH ───────────────────────────────────────────────────────────────────────
const readArray = (src, name) => {
  const m = src.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\];'));
  if (!m) throw new Error(name + ' not found in public/app.js');
  return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
};
export function loadExternalTimelinePhrases(appPath = 'public/app.js') {
  return readArray(fs.readFileSync(appPath, 'utf8'), 'FSC_EXTERNAL_TIMELINE_PHRASES');
}
// Forbidden to the author, but NOT scored — each has an ordinary within-scene reading. The rerun
// proved the cost of conflating them: "voice steady again" and "the clearing feels older than it
// did moments ago" were reported as replaced-timeline leaks against an obedient passage.
export function loadAmbiguousTemporal(appPath = 'public/app.js') {
  return readArray(fs.readFileSync(appPath, 'utf8'), 'FSC_AMBIGUOUS_TEMPORAL');
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const externalTimelineHits = (text, phrases) =>
  phrases.filter(p => new RegExp('\\b' + esc(p) + '\\b', 'i').test(String(text || '')));

// ── ABSENCE RENDERED AS PRESENCE ──────────────────────────────────────────────────────────────
// The rerun's only genuine violation: "the interruption he never made still echoing in the air".
// Denied the vocabulary of comparison, the author asserted the erased event's ABSENCE as something
// perceptible. A non-event leaves nothing to echo, hang, linger or be missed.
export const ABSENCE_AS_PRESENCE_RX = [
  // "the interruption he never made", "the interference that never happened"
  /\bthe\s+\w+(?:\s+\w+)?\s+(?:he|she|they|it|we|I)\s+never\s+\w+/i,
  /\bthe\s+\w+(?:\s+\w+)?\s+that\s+never\s+(?:happened|occurred|took place|came|was)\b/i,
  // a non-occurrence given a present physical effect, in either order
  /\bnever\s+(?:made|happened|occurred|took place|asked|spoke|came|was said)\b[^.]{0,70}\b(?:still|echo\w*|hang\w*|linger\w*|in the air|between us|remain\w*|press\w*|weigh\w*)\b/i,
  /\b(?:still|echo\w*|hang\w*|linger\w*)\b[^.]{0,70}\bnever\s+(?:made|happened|occurred|took place)\b/i,
  // the shape of a gap: a hole left by something that did not occur
  /\b(?:the\s+)?(?:silence|gap|absence|space|hole|hollow)\s+(?:where|left by|of)\s+[^.]{0,50}\b(?:never|did ?n[o']t)\b/i,
  /\b(?:missing|absent)\s+(?:questioning|interruption|accusation|demand|interference)\b/i
];
export const absenceAsPresenceHits = t =>
  ABSENCE_AS_PRESENCE_RX.filter(rx => rx.test(String(t || '')));

// ── ORIENTATION BY RECURRENCE ─────────────────────────────────────────────────────────────────
// "again" has an ordinary within-scene reading ("voice steady again") and stays review-grade in
// general. It is NOT ambiguous when the RITE ITSELF is said to recur — that is a counting frame and
// a hard failure. The final run's beat 0, "The rite ends for the second time.", is the case this
// exists for.
// Precision matters more than reach: a positional "first two sentences" window and a broad subject
// list both over-fired, flagging "The assembly watches me again" and "voice steady again". So
// require the ceremony noun and a recurrence word BOUND TOGETHER, not merely co-present.
export const REPLAY_RECURRENCE_RX = [
  /\b(rite|ceremony|ritual)\b[^.]{0,50}\b(again|once more|anew|repeats?|repeating|repeated|replay\w*)\b/i,
  /\b(again|once more|anew|replay\w*)\b[^.]{0,30}\b(rite|ceremony|ritual)\b/i
];
export const orientsByRecurrence = s => REPLAY_RECURRENCE_RX.some(rx => rx.test(String(s || '')));

// ── ERASED PROSE TERMS — ONE SOURCE, PER OUTCOME ──────────────────────────────────────────────
// The runner and this control each kept a private copy. I corrected the control's and left the
// runner's stale, so the final run reported four false C1 failures on "the assumption" — a term
// that had already been established as ACTIVE canon. Exported so there is one list.
//
// A term belongs here ONLY if the outcome's delta genuinely ceases the atom behind it.
export const ERASED_PROSE_TERMS = {
  // unm.time_gives_way ceases: interr.julian_questioned_lirael, interr.dohkar_interrupted,
  // interr.choice_arose, lirael.scene1_disposition, answer.handed_to_lirael,
  // answer.lirael_authorized_to_hold. It ceases NO twist.* atom — so twist.assembly_turned and
  // twist.loose_note_heard survive, and the assembly's assumption that Lirael interfered is
  // ACTIVE CANON. "the assumption" and "the accusation" must never appear in this list.
  'unm.time_gives_way': ['never heard', 'the interruption', 'questioned me', 'the questioning']
};
// Terms that rest on atoms NO outcome in this set ceases. Asserted against, so a future edit
// cannot quietly reintroduce one.
export const ACTIVE_CANON_TERMS = ['the assumption', 'the accusation', 'the interference',
  'without interference'];

// Two characters given a shared understanding of the edit. Forbidden unless the record establishes
// the relationship outright.
export const SHARED_UNDERSTANDING_RX = [
  /\bknows?\s+(?:that\s+)?I\s+know\b/i, /\bI\s+know\s+(?:that\s+)?he\s+knows\b/i,
  /\bwe\s+both\s+know\b/i, /\bthey\s+both\s+knew\b/i, /\bknowing\s+look\b/i,
  /\bshared\s+(?:a\s+)?(?:glance|look|understanding)\b/i, /\bneither\s+of\s+us\s+said\b/i,
  /\bhe\s+knows\b[^.]{0,40}\bnever\s+happened\b/i
];
export const sharedUnderstandingHits = t =>
  SHARED_UNDERSTANDING_RX.filter(rx => rx.test(String(t || ''))).map(rx => String(rx));

const SENTENCES = t => String(t || '').split(/(?<=[.?!])\s+|\n+/).filter(Boolean);

// ── ROSTER TOKENS — SHARED, so the runner and the control cannot diverge ──────────────────────
// pc:lirael MUST match first-person narration. These scenes are written in her voice and her NAME
// may never appear; a name-only token reported her ABSENT from a scene she narrates, which would
// have scored a presence failure against an obedient scene.
export const ROSTER_TOKENS = {
  'pc:lirael': /\bLirael\b|\b(?:I|me|my|myself)\b/,
  'named:seren': /\bSeren\b/i,
  'named:julian': /\bJulian\b/i,
  'role:first_sacrifice_presiding_dohkar': /\bDohkar\b/i,
  'the_assembly': /\b(assembly|crowd|gathering|First Favored)\b/i
};

// ── C2 — ROSTER **AND** DISPOSITION ───────────────────────────────────────────────────────────
// presence: every member present, no non-member affected.
// disposition: for a sealed memory/replacement effect, NO affected party may carry the replaced
//   timeline. The POV narrator counts — she is inside the population.
export function scoreC2(prose, { roster, tokens, phrases, ambiguous = [], dispositionSealed = true }) {
  const mentioned = Object.keys(tokens).filter(k => tokens[k].test(prose));
  const outside = mentioned.filter(m => roster.indexOf(m) < 0);
  const missing = roster.filter(r => mentioned.indexOf(r) < 0);
  const presenceOk = outside.length === 0 && missing.length === 0;

  const leaks = [], review = [];
  if (dispositionSealed) {
    const ss = SENTENCES(prose);
    ss.forEach((s, i) => {
      // Attribute over the sentence AND the one before it: "Julian has not moved. He knows the
      // second rite never happened." puts the subject in the prior sentence and the leak in this
      // one. Scoring only the leak sentence credited that retention to nobody.
      const window = (i > 0 ? ss[i - 1] + ' ' : '') + s;
      const who = () => Object.keys(tokens).filter(k => tokens[k].test(window));
      const hard = externalTimelineHits(s, phrases);
      const absence = absenceAsPresenceHits(s);
      // An ambiguous word becomes a hard failure when it ORIENTS: in the opening sentences, or
      // applied to the scene's own events. Elsewhere it stays review-grade.
      const amb = ambiguous.length ? externalTimelineHits(s, ambiguous) : [];
      const orienting = amb.length > 0 && orientsByRecurrence(s);
      if (hard.length || absence.length || orienting) {
        leaks.push({ sentence: s.trim().slice(0, 150), phrases: hard.concat(orienting ? amb : []),
          absenceAsPresence: absence.length > 0, orientation: orienting, parties: who() });
      } else if (amb.length) {
        review.push({ sentence: s.trim().slice(0, 150), phrases: amb, parties: who() });
      }
    });
  }
  // A leak with no named party is still a leak: the narrator is a roster member.
  const dispositionOk = leaks.length === 0;
  return {
    pass: presenceOk && dispositionOk,
    presence: { ok: presenceOk, mentioned, outside, missing },
    disposition: { ok: dispositionOk, leaks },
    // Reported, never scored. Ordinary within-scene temporal wording lives here.
    review,
    // RETENTION means a character HOLDS the replaced timeline — the D1 defect. Only a
    // cross-timeline COMPARISON shows that. Absence-as-presence is a narration defect (the prose
    // gives a non-event a physical effect) and says nothing about what anyone remembers, so it
    // must not be reported as a party retaining. Conflating them would have kept D1 looking open
    // after it was fixed.
    retainingParties: [...new Set(leaks.filter(l => l.phrases.length).flatMap(l => l.parties))]
  };
}

// ── C1 — ONLY THE SEALED CONSEQUENCE ──────────────────────────────────────────────────────────
// Mechanically detectable violations for a historical_replacement. Reading still owns the final
// call; this catches the three the C4 run actually committed.
export function scoreC1(prose, { phrases, erasedTerms = [], ambiguous = [] }) {
  const timeline = [], absence = [];
  SENTENCES(prose).forEach((s, i) => {
    const hits = externalTimelineHits(s, phrases);
    const amb = ambiguous.length ? externalTimelineHits(s, ambiguous) : [];
    const orienting = amb.length > 0 && orientsByRecurrence(s);
    if (hits.length || orienting) {
      timeline.push({ sentence: s.trim().slice(0, 150),
        phrases: hits.concat(orienting ? amb : []), orientation: orienting });
    }
    if (absenceAsPresenceHits(s).length) absence.push({ sentence: s.trim().slice(0, 150) });
  });
  const shared = sharedUnderstandingHits(prose);
  // A choice or line resting on a fact this delta erased.
  const erased = [];
  for (const s of SENTENCES(prose)) {
    for (const t of erasedTerms) {
      if (new RegExp(esc(t), 'i').test(s)) erased.push({ sentence: s.trim().slice(0, 150), term: t });
    }
  }
  return {
    pass: timeline.length === 0 && shared.length === 0 && erased.length === 0 && absence.length === 0,
    externalTimeline: timeline, sharedUnderstanding: shared, erasedBasis: erased,
    absenceAsPresence: absence
  };
}

// ── C3 — COSTLESS MEANS COSTLESS, INCLUDING DEFERRED ──────────────────────────────────────────
// My C3 scan looked for a STATED price ("the price", "it cost her", "in exchange") and passed four
// runs that closed on "the cost is still uncounted" / "remains unnamed" / "uncounted either way".
// Declining to quantify a price still asserts one is owed. For a sealed COST: none outcome that is
// an invented cost.
//
// The distinction that must survive: active stakes are permitted, calling them payment is not.
//   permitted  — "Lirael's standing is at risk"      (twist.assembly_turned is active canon)
//   forbidden  — "the cost is uncounted"             (a price held in reserve)
//   forbidden  — "Fate will take something later"    (a price deferred)
export const EXPLICIT_COST_RX = [
  /\bthe price\b/i, /\bit cost (?:her|him|them|me)\b/i, /\bin exchange\b/i,
  /\bpaid for (?:it|this)\b/i, /\bthe cost was\b/i, /\ba debt\b/i, /\ba toll\b/i,
  /\bthe bill\b/i, /\bas payment\b/i, /\bthe reckoning\b/i,
  // CONDITIONAL AND FUTURE FORMS. "Either path will cost standing" passed as clean for a whole run:
  // the list had only past and present shapes, so a price placed in the future went unseen.
  /\b(?:will|would|could|may|might|shall|is going to|'ll|'d)\s+cost\b/i,
  /\bat the cost of\b/i, /\bat the price of\b/i,
  /\bcosts? (?:her|him|them|me|us)\b/i,
  /\bcost(?:s|ing)?\s+(?:standing|her standing|everything|something|dearly|more than)\b/i,
  /\b(?:exact|extract|demand|take)s?\s+(?:a\s+)?(?:price|payment|toll)\b/i,
  /\b(?:owe[sd]?|owing)\s+(?:a\s+)?(?:price|debt|payment|toll)\b/i,
  /\b(?:will|would|must)\s+(?:be\s+)?(?:pay|paid|repay|answer for)\b/i,
  /\bpays? (?:for|with)\b/i, /\bnot (?:come|be) free\b/i, /\bcomes? at a\b/i
];
// A cost asserted but withheld — the shape every run actually produced.
export const DEFERRED_COST_RX = [
  /\bcost\b[^.]{0,40}\b(?:uncounted|unnamed|not yet named|still to be|yet to be|unpaid|waiting|to come|later)\b/i,
  /\b(?:uncounted|unnamed|unpaid|unspoken)\b[^.]{0,20}\bcost\b/i,
  /\bcost\b[^.]{0,30}\b(?:has not|hasn[’']?t|is not|isn[’']?t)\b[^.]{0,30}\b(?:been named|been counted|come)\b/i,
  /\bFate (?:will|would) (?:take|collect|claim|exact)\b/i,
  /\b(?:she|he|they|I) (?:will|would) pay\b/i,
  /\bsomething (?:will|would) be (?:taken|collected|owed)\b/i,
  /\bwhat (?:it|this) (?:will|would) cost\b/i
];
// ── THE INTERVENTION AS AN EMISSION ───────────────────────────────────────────────────────────
// The sealed beat asks for a faint, unplaceable sense that no one can explain. A run turned it into
// a propagating physical event — "A low pulse travels through the clearing", "The Answer pulses
// once between his palms", "The pulse has already passed through every person present". That is a
// new perceptible trace of the intervention, and the world truth forbids it. Machine-only: this
// vocabulary is never shown to the author.
export const EMISSION_RX = [
  // something moving through the room or through the people in it
  /\b(pulse|ripple|wave|current|tremor|vibration|thrum|hum|surge|shockwave|shiver|shudder)\b[^.]{0,60}\b(travel\w*|pass\w*|spread\w*|mov\w*|ran|run\w*|roll\w*|sweep\w*|sweeps?|went|goes)\b[^.]{0,40}\b(through|across|over|outward)\b/i,
  /\b(travel\w*|pass\w*|spread\w*|roll\w*|sweep\w*)\b[^.]{0,40}\b(through|across)\s+(?:the\s+)?(clearing|assembly|crowd|gathering|room|air|grass|ground|everyone|them all)\b/i,
  // an object emitting rather than simply having a form
  /\b(pulses?|pulsed|pulsing|throbs?|throbbed|thrums?|thrummed|radiates?|radiated|emits?|emitted)\b[^.]{0,30}\b(once|twice|outward|between|from|into)\b/i,
  // the felt thing reaching every person
  /\b(passed|passes|travelled|traveled|travels|moved|moves|went|goes|reached|reaches)\s+through\s+(?:every|each|all|everyone)\b/i,
  // a named ambient physical presence
  /\ba\s+(?:low|faint|slow|deep|soft)\s+(pulse|hum|thrum|vibration|pressure|current)\b/i
];
// Ordinary bodily uses are out of scope: a heartbeat, a pulse at the wrist or throat.
export const BODILY_PULSE_RX =
  /\b(?:her|his|my|their|its)\s+(?:own\s+)?(?:pulse|heartbeat|heart)\b|\bpulse\s+(?:at|in)\s+(?:her|his|my|their)\b|\bheartbeat\b|\bpulse\s+(?:at|in)\s+the\s+(?:wrist|throat|neck)\b/i;
// ABSTRACT TEMPORAL SUBJECTS ARE OUT OF SCOPE. "The moment has already passed through the clearing"
// is idiomatic time, not a wish-emission — nothing physical travels. The detector fired on it for a
// whole run. A moment/hour/silence/hush moving through a place is ordinary English; a pulse, wave,
// current or an object emitting is not.
export const ABSTRACT_SUBJECT_RX =
  /\b(?:the\s+)?(moment|moments|instant|hour|minute|time|silence|hush|quiet|stillness|pause|beat|day|evening|night|question|thought|feeling|rumour|rumor|word|news)\b[^.]{0,30}\b(?:pass\w*|went|goes|mov\w*|travel\w*|run\w*|ran|slip\w*|spread\w*)\b/i;
export const emissionHits = t => {
  const s = String(t || '');
  const crowdish = /\b(clearing|assembly|crowd|gathering|room|everyone)\b/i.test(s);
  if (BODILY_PULSE_RX.test(s) && !crowdish) return [];
  // An abstract temporal//informational subject is exempt UNLESS the sentence also names a physical
  // or energetic emission by its own noun (pulse, wave, current, thrum, surge, ripple, vibration).
  const physicalNoun = /\b(pulse|ripple|wave|current|tremor|vibration|thrum|surge|shockwave)\b/i.test(s);
  if (ABSTRACT_SUBJECT_RX.test(s) && !physicalNoun) return [];
  return EMISSION_RX.filter(rx => rx.test(s));
};

// ── MAGICAL RESIDUE, WITH A SOURCE-AWARE WARDROBE ALLOWANCE ───────────────────────────────────
// "luminous" was reported for five consecutive runs on the SEED's own gossamer garment, which
// buried a real violation. The allowance is scoped to that specific description — gossamer blooming
// over torso/hips/seat — NOT a blanket whitelist of the word.
export const MAGICAL_RESIDUE_RX =
  /\b(glow\w*|luminous|shimmer\w*|aura|radian\w*|shone with|blaz\w*|incandescen\w*)\b/i;
export const SEED_GOSSAMER_RX =
  /\bgossamer\b[^.]{0,120}\b(luminous|blooms?|blooming)\b|\b(luminous|blooms?|blooming)\b[^.]{0,80}\b(torso|hips|seat|tunic)\b/i;

// ── C3'S PROVENANCE RULE ──────────────────────────────────────────────────────────────────────
// Not a weakening — a sharpening. The prose may render ONLY a cost sealed for this outcome, or a
// separately established active story fact whose provenance is NAMED. It may not convert an
// unresolved seed question into a cost of the Tempt or of the pending choice.
//
// This is what the seed audit forced: "the price has not yet been named" is a possibility in the
// baseline plan, and a possibility is not a price. A cost line now needs a citable source, and
// "the plan mentioned it" is not one.
export const C3_PROVENANCE_RULE =
  'A cost may be rendered only if (a) it is the cost sealed for THIS outcome, or (b) it is a '
+ 'separately established active story fact whose provenance is named. An unresolved question in a '
+ 'baseline plan is neither, and may not become a cost of the Tempt or of the pending choice.';

export function scoreC3(prose, { costless = true, sealedCost = null, costProvenance = [] } = {}) {
  const explicit = [], deferred = [], emission = [], residue = [], wardrobeAllowed = [], allowedCost = [];
  // A cost line is admissible only against a named source.
  const admissible = s => {
    if (sealedCost) {
      const rx = new RegExp(esc(String(sealedCost).replace(/_/g, ' ')).replace(/\s+/g, '\\s+'), 'i');
      if (rx.test(s)) return { ok: true, via: 'sealed cost: ' + sealedCost };
    }
    for (const p of costProvenance) if (p.rx.test(s)) return { ok: true, via: p.provenance };
    return { ok: false };
  };
  for (const s of SENTENCES(prose)) {
    const costShaped = EXPLICIT_COST_RX.some(rx => rx.test(s))
      || (costless && DEFERRED_COST_RX.some(rx => rx.test(s)));
    if (costShaped) {
      const a = admissible(s);
      if (a.ok) { allowedCost.push({ line: s.trim().slice(0, 150), via: a.via }); }
      else if (EXPLICIT_COST_RX.some(rx => rx.test(s))) explicit.push(s.trim().slice(0, 150));
      else deferred.push(s.trim().slice(0, 150));
    }
    if (emissionHits(s).length) emission.push(s.trim().slice(0, 150));
    if (MAGICAL_RESIDUE_RX.test(s)) {
      if (SEED_GOSSAMER_RX.test(s)) wardrobeAllowed.push(s.trim().slice(0, 110));
      else residue.push(s.trim().slice(0, 150));
    }
  }
  return { pass: explicit.length === 0 && deferred.length === 0
             && emission.length === 0 && residue.length === 0,
           explicit, deferred, emission, residue, wardrobeAllowed,
           allowedCost, provenanceRule: C3_PROVENANCE_RULE };
}

// ── C4 — DERIVE THE GATE EXACTLY AS PRODUCTION DOES ───────────────────────────────────────────
// decisionGateBeatIdx was withdrawn from the author schema, so the model no longer emits it and a
// check that reads the field reports a false failure. Production defaults an absent or out-of-range
// index to the last beat, then clamps it to the true last index unconditionally.
export function effectiveGate(plan) {
  const beats = (plan && Array.isArray(plan.beats)) ? plan.beats : [];
  if (!beats.length) return { gate: null, last: null, emitted: null, derived: false };
  const emitted = (plan && typeof plan.decisionGateBeatIdx === 'number') ? plan.decisionGateBeatIdx : null;
  const last = beats.length - 1;
  let gate = (emitted != null && emitted >= 0 && emitted < beats.length) ? emitted : last;
  if (gate !== last) gate = last;                       // production clamps unconditionally
  return { gate, last, emitted, derived: emitted === null };
}

// ── C4 — A SEMANTIC LIFECYCLE CHECK ───────────────────────────────────────────────────────────
// effectiveGate() === lastBeat became an IMPLEMENTATION IDENTITY once the gate was derived: it is
// always true and cannot fail, so it is not evidence of behaviour. C4 is now scored on what the
// criterion actually means — the scene reaches the owed choice and holds it open to the last line.
//
// Three checks that CAN fail, plus every post-choice beat listed for reading, because "any new
// event" is not reliably machine-detectable and over-claiming detection is its own defect.
export const RESOLUTION_RX = [
  /\bI\s+(?:claim|claimed|name|named|say|said|speak|spoke|tell|told|choose|chose|decide|decided|confess|confessed|step forward|stepped forward|let it stand|stayed silent|say nothing and)\b/i,
  /\b(?:she|Lirael)\s+(?:claims|claimed|names|named|speaks|spoke|tells|told|chooses|chose|decides|decided|confesses|confessed|steps forward|stepped forward)\b/i,
  /\bthe (?:choice|decision) (?:is|was) (?:made|taken|hers now and made)\b/i,
  /\b(?:in the end|so I|and so I|I do|I did)\b/i
];
export const TEMPORAL_ADVANCE_RX =
  /\b(later|afterward|afterwards|by (?:morning|nightfall|dawn)|hours? later|days? later|that night|the next (?:day|morning|hour)|when it (?:was|had) (?:over|ended)|by the time)\b/i;
// The final beat must still hold the choice open: either it restates the fork, or it says plainly
// that the choice is not made.
export const PENDING_RX =
  /\bor\b[^.]*$|\bhas not (?:yet )?been made\b|\bnot yet made\b|\bunmade\b|\bstill (?:to|un)\w*\b|\bmust choose\b|\bwaits? for (?:me|my)\b|\bsits? in my (?:hands|throat)\b|\bstand inside the choice\b/i;

export function scoreC4(plan, { anchors = null, window = 3 } = {}) {
  const beats = (plan && Array.isArray(plan.beats)) ? plan.beats : [];
  if (!beats.length) return { pass: false, reason: 'no_beats' };
  const texts = beats.map(b => String((b && b.text) || ''));
  const A = anchors || { alternatives: [], fork: /\bor\b|\beither\b/i };

  // 1. LOCATE THE CHOICE BY SEMANTIC ANCHORS, not by one sentence or one beat.
  //    Each alternative is a SET of paraphrases; a real scene wrote "claim what happened" and "let
  //    them keep their assumption" instead of the sealed wording, across TWO beats. Both
  //    alternatives must appear, within a small window of adjacent beats, with a fork marker.
  const hit = (rxs, t) => rxs.some(rx => rx.test(t));
  let first = -1, presentedAt = [];
  for (let i = 0; i < texts.length; i++) {
    const slice = texts.slice(i, i + window);
    const joined = slice.join(' ');
    const allPresent = A.alternatives.length > 0
      && A.alternatives.every(alt => hit(alt.rx, joined));
    if (allPresent && A.fork.test(joined)) {
      first = i;
      presentedAt = A.alternatives.map(alt => ({
        label: alt.label,
        beat: i + slice.findIndex(t => hit(alt.rx, t))
      }));
      break;
    }
  }
  if (first < 0) {
    return { pass: false, reason: 'choice_never_presented', beats: beats.length,
             alternativesFound: A.alternatives.map(alt => ({
               label: alt.label, found: texts.some(t => hit(alt.rx, t)) })) };
  }
  // The choice is "presented" as of the LAST beat that carries one of its alternatives, so later
  // beats are judged from there rather than from the first mention.
  const presentedThrough = Math.max(...presentedAt.map(p => p.beat));
  const presents = t => A.alternatives.every(alt => hit(alt.rx, t)) && A.fork.test(t);

  // 2. No beat after the choice is fully presented may resolve it or move time on.
  const violations = [];
  for (let i = presentedThrough + 1; i < texts.length; i++) {
    const t = texts[i];
    if (RESOLUTION_RX.some(rx => rx.test(t))) violations.push({ idx: i, kind: 'resolution', text: t.slice(0, 120) });
    else if (TEMPORAL_ADVANCE_RX.test(t)) violations.push({ idx: i, kind: 'temporal_advance', text: t.slice(0, 120) });
  }
  // 3. The FINAL beat must still leave the same choice unresolved — restating the fork, restating
  //    one alternative, or saying plainly that the choice is not made.
  const finalText = texts[texts.length - 1];
  const finalPending = PENDING_RX.test(finalText) || presents(finalText)
    || A.alternatives.some(alt => hit(alt.rx, finalText));

  return {
    pass: violations.length === 0 && finalPending,
    reason: violations.length ? 'resolved_or_advanced_after_choice'
          : (!finalPending ? 'final_beat_does_not_hold_the_choice' : null),
    firstChoiceBeat: first, presentedThrough, presentedAt, beats: beats.length, finalPending,
    finalText: finalText.slice(0, 140),
    violations,
    // For reading: a new event after the choice is not reliably detectable, so surface them all.
    postChoiceBeats: texts.slice(presentedThrough + 1)
      .map((t, k) => ({ idx: presentedThrough + 1 + k, text: t.slice(0, 120) }))
  };
}
// SEMANTIC ANCHORS for the sealed choice. Each alternative carries its paraphrases, because the
// scene is entitled to its own words — it wrote "claim what happened" and "let them keep their
// assumption" for a choice sealed as "claim the interference / let the assumption stand".
export const CHOICE_ANCHORS = {
  'unm.time_gives_way': {
    fork: /\bor\b|\beither\b/i,
    alternatives: [
      { label: 'claim it openly', rx: [
        /\bclaim(?:s|ing|ed)?\s+(?:the\s+|what\s+|it\b)/i,
        /\b(?:say|speak|tell|name)\s+(?:it|the truth|what happened)\b/i,
        /\badmit(?:s|ting|ted)?\b/i, /\bconfess(?:es|ing|ed)?\b/i,
        /\bspeak (?:up|out|through the seal)\b/i
      ] },
      { label: 'let the assumption stand', rx: [
        /\blet\s+(?:the\s+assembly|them|it)\b/i,
        /\bkeep\s+(?:their|its|the)\s+assumption\b/i,
        /\bassumption\s+(?:stand|hold|remain)/i,
        /\b(?:stay|remain|keep)\s+silent\b/i, /\bsay nothing\b/i
      ] }
    ]
  }
};
// Kept for provenance logging only; never used as proof of C4.
export const OPTION_RX = {
  'unm.time_gives_way': [
    /\bclaim(?:ing)?\s+(?:the\s+)?interference\b/i,
    /\blet\s+the\s+(?:assembly|assumption)\b/i
  ]
};

// ── AFTERMATH BEAT MATCHER (repaired) ─────────────────────────────────────────────────────────
// The register is a reaction whose CAUSE the character cannot name. The old pattern demanded a
// negation word AFTER the name inside one sentence, so it missed "her fingers trace her palms as
// if checking for something missing". Markers may now sit on EITHER side of the name.
export const AFTERMATH_MARKER_RX =
  /\b(as if|as though|something missing|for no reason|no reason|without (?:knowing|cause|reason|explanation|naming|comment|remarking)|cannot|could not|can[’']?t|couldn[’']?t|unable|falters?|faltered|stumbles?|stumbled|stalls?|stalled|refuses? to arrive|does not come|slips from|loses? (?:his|her|their) (?:place|thread)|lost (?:his|her|their) (?:place|thread)|finds? the thread|found the thread|her own certainty|does not know why|unplaceable|expects to find|before any (?:question|reason|sound|voice|word)\b|before any \w+ (?:gives|calls|asks)|gives (?:him|her|them) reason|before anything gives|name the reason|no better account|could not say what prompted|why)\b/i;

// ROLE-AWARE PARTY MATCHING. aftermathLanded used to match on NAME ONLY, so it missed Lirael in a
// first-person scene (her name may never appear) and any character referred to by office. This is
// the same fix already made for the C2 roster tokens, carried across — the rerun reported "Dohkar:
// no" and "Lirael: no" for beats that both plainly landed.
export const PARTY_RX = {
  Lirael: /\bLirael\b|\b(?:I|me|my|myself)\b/,
  Seren: /\bSeren\b/i,
  Julian: /\bJulian\b/i,
  Dohkar: /\b(?:the\s+)?(?:presiding\s+)?Dohkar\b/i
};

export function aftermathLanded(prose, name, markerRx = AFTERMATH_MARKER_RX) {
  const nameRx = PARTY_RX[name] || new RegExp('\\b' + esc(name) + '\\b', 'i');
  for (const s of SENTENCES(prose)) if (nameRx.test(s) && markerRx.test(s)) return { landed: true, sentence: s.trim() };
  // Allow the marker in the NEXT sentence — a two-sentence beat ("He falters. The word he needs
  // refuses to arrive.") is the same beat.
  const ss = SENTENCES(prose);
  for (let i = 0; i < ss.length - 1; i++)
    if (nameRx.test(ss[i]) && markerRx.test(ss[i + 1])) return { landed: true, sentence: (ss[i] + ' ' + ss[i + 1]).trim() };
  return { landed: false, sentence: null };
}

// ── CONTROL ───────────────────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  let pass = 0, fail = 0;
  const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
    else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
  console.log('=== RUN SCORER CONTROL (no network, $0) ===\n');

  const phrases = loadExternalTimelinePhrases();
  const ambiguous = loadAmbiguousTemporal();
  const ROSTER = ['the_assembly', 'named:seren', 'named:julian',
                  'role:first_sacrifice_presiding_dohkar', 'pc:lirael'];
  const TOK = ROSTER_TOKENS;
  // Shared with the runner — no private copy. A divergent copy is what produced four false C1
  // failures on the final run.
  const ERASED = ERASED_PROSE_TERMS['unm.time_gives_way'];

  console.log('A. both lists are READ FROM public/app.js, not restated');
  t('hard phrases loaded from the app', phrases.length > 8, phrases.length + ' phrases');
  t('ambiguous list loaded from the app', ambiguous.length > 3, ambiguous.join(','));
  t('the UNAMBIGUOUS list holds cross-timeline phrasing',
    ['the first time', 'a second time', 'remember nothing of'].every(p => phrases.includes(p)));
  t('ordinary within-scene words are NOT in the hard list',
    ['again', 'moments ago', 'earlier'].every(p => !phrases.includes(p)));
  t('  they are in the REVIEW list instead',
    ['again', 'moments ago', 'earlier'].every(p => ambiguous.includes(p)));

  // ── ADVERSARIAL FIXTURE 1 — the REAL failing scene's leaked lines ───────────────────────────
  console.log('\nB. ADVERSARIAL: the exact lines from the failed C4 run must FAIL C1 and C2');
  const REAL_FAIL = [
    'The crimson spiralgrass holds the same hush, but the air tastes thinner.',
    'Seren kneels where she knelt the first time, yet her fingers trace her palms as if checking for something missing.',
    "The presiding Dohkar's mouth opens on the same phrase he finished moments ago.",
    'He falters. The word he needs refuses to arrive.',
    'The assembly watches me. They remember nothing of the earlier interruption.',
    'The Answer remains in his hands. It never left them.',
    'Julian has not moved. He knows the second rite never happened. He knows I know.',
    'I could speak the truth the Dohkar never heard.',
    'Or I could let them believe the rite passed without interference.',
    'Tell the Dohkar the truth now, or let the assumption stand.'
  ].join('\n');

  const c2bad = scoreC2(REAL_FAIL, { roster: ROSTER, tokens: TOK, phrases });
  t('C2 FAILS on the real failing scene', c2bad.pass === false);
  t('  presence still passes — proving the FAILURE is the new disposition check',
    c2bad.presence.ok === true);
  t('  disposition FAILS', c2bad.disposition.ok === false);
  t('  it catches "the first time"',
    c2bad.disposition.leaks.some(l => l.phrases.includes('the first time')));
  t('  "moments ago" is now a REVIEW item, not a scored leak',
    !c2bad.disposition.leaks.some(l => l.phrases.includes('moments ago')));
  t('  it catches "remember nothing of"',
    c2bad.disposition.leaks.some(l => l.phrases.includes('remember nothing of')));
  t('  it names Seren as retaining',
    c2bad.retainingParties.includes('named:seren'), c2bad.retainingParties.join(','));
  t('  it names Julian as retaining', c2bad.retainingParties.includes('named:julian'));
  console.log('    leaks found: ' + c2bad.disposition.leaks.length);

  const c1bad = scoreC1(REAL_FAIL, { phrases, erasedTerms: ERASED });
  t('C1 FAILS on the real failing scene', c1bad.pass === false);
  t('  external-timeline narration caught', c1bad.externalTimeline.length > 0);
  t('  "He knows I know" caught as shared understanding', c1bad.sharedUnderstanding.length > 0);
  t('  "never heard" caught — the Dohkar never questioned her, so nothing was "never heard"',
    c1bad.erasedBasis.some(e => e.term === 'never heard'));
  t('  "the assumption" is NOT flagged — twist.assembly_turned survives the replacement',
    !c1bad.erasedBasis.some(e => e.term === 'the assumption'));
  // "He knows the second rite never happened" is a CROSS-TIMELINE COMPARISON, not an absence given
  // physical presence. The two failure modes are scored separately and must not be conflated.
  t('  "the second rite" caught as cross-timeline comparison',
    c1bad.externalTimeline.some(e => e.phrases.includes('the second rite')));
  t('  and NOT miscounted as absence-as-presence',
    !c1bad.absenceAsPresence.some(a => /second rite/i.test(a.sentence)));

  // ── ADVERSARIAL FIXTURE 2 — one leaked phrase, otherwise clean ──────────────────────────────
  console.log('\nC. ADVERSARIAL: a SINGLE unambiguous leak in an otherwise clean scene must fail');
  const base = [
    'The rite concludes. Seren kneels at the centre, her fingers tracing her palms as if checking for something missing.',
    'The Dohkar falters; the word he needs refuses to arrive.',
    'Julian stands apart. The Answer remains in his hands.',
    'Speak before the inquiry opens, or say nothing and let it open.'
  ];
  const ONE_LEAK = base.concat(['The assembly watches me for the first time.']).join('\n');
  const c2one = scoreC2(ONE_LEAK, { roster: ROSTER, tokens: TOK, phrases, ambiguous });
  t('one "the first time" is enough to fail C2 disposition', c2one.pass === false);
  t('  and it is the ONLY leak reported', c2one.disposition.leaks.length === 1,
    JSON.stringify(c2one.disposition.leaks.map(l => l.phrases)));
  // The counterpart: the same scene with an AMBIGUOUS word must NOT fail.
  const ONE_AMBIG = base.concat(['The assembly watches me again.']).join('\n');
  const c2amb = scoreC2(ONE_AMBIG, { roster: ROSTER, tokens: TOK, phrases, ambiguous });
  t('but a bare "again" does NOT fail — it has an ordinary within-scene reading',
    c2amb.disposition.ok === true, JSON.stringify(c2amb.disposition.leaks));
  t('  it is surfaced for review instead', c2amb.review.length === 1,
    JSON.stringify(c2amb.review.map(r => r.phrases)));

  // ── POSITIVE FIXTURE — inside the replacement, must PASS ────────────────────────────────────
  console.log('\nD. POSITIVE: a scene written from inside the replacement must PASS both');
  const CLEAN = [
    'The crimson spiralgrass holds its hush. The air tastes thin.',
    'Seren kneels at the centre, her fingers tracing her palms as if checking for something missing.',
    "The presiding Dohkar's mouth opens on the closing phrase. He falters. The word he needs refuses to arrive.",
    'The assembly shifts. No one speaks the unease aloud.',
    "Julian's gaze finds me before the Dohkar turns, for no reason he could name.",
    'The Answer remains in his hands.',
    'A review has been demanded. The inquiry has not opened.',
    'Speak before it opens, or say nothing and let it open.'
  ].join('\n');
  const c2ok = scoreC2(CLEAN, { roster: ROSTER, tokens: TOK, phrases });
  const c1ok = scoreC1(CLEAN, { phrases, erasedTerms: ERASED });
  t('C2 PASSES', c2ok.pass === true, JSON.stringify(c2ok.disposition.leaks));
  t('C1 PASSES', c1ok.pass === true,
    JSON.stringify({ tl: c1ok.externalTimeline, sh: c1ok.sharedUnderstanding, er: c1ok.erasedBasis }));
  t('  the scene is NOT trivially clean — all five parties are present', c2ok.presence.ok === true);

  // ── SEREN MATCHER REGRESSION ────────────────────────────────────────────────────────────────
  console.log('\nE. REGRESSION: the aftermath matcher must recognize Seren\'s real beats');
  const SEREN_C4 = 'Seren kneels where she knelt the first time, yet her fingers trace her palms as if checking for something missing.';
  const SEREN_ROSTER = 'Seren kneels where she finished her wish, composed as always, yet her brow furrows at her own certainty.';
  t('recognizes the C4 beat (the one it false-negatived)', aftermathLanded(SEREN_C4, 'Seren').landed === true);
  t('recognizes the roster-run beat', aftermathLanded(SEREN_ROSTER, 'Seren').landed === true);
  t('recognizes the CLEAN fixture\'s Seren beat', aftermathLanded(CLEAN, 'Seren').landed === true);
  t('recognizes a TWO-SENTENCE beat (Dohkar: "He falters. The word...")',
    aftermathLanded('The presiding Dohkar reaches the closing phrase. He falters.', 'Dohkar').landed === true);
  t('still says NO when the reaction has a named cause',
    aftermathLanded('Seren kneels because the Dohkar told her to kneel.', 'Seren').landed === false);
  t('still says NO when the party is absent',
    aftermathLanded('The Dohkar falters, unable to say why.', 'Seren').landed === false);

  // ── GROUND TRUTH ────────────────────────────────────────────────────────────────────────────
  // The fixtures above are my own prose. This scores the REAL saved output of the failed C4 run.
  // If the repaired scorer does not fail it, the repair is cosmetic.
  console.log('\nF. ABSENCE RENDERED AS PRESENCE — the rerun\'s only genuine violation');
  const ECHO = 'The presiding Dohkar turns at last, his authority intact yet the interruption he never made still echoing in the air.';
  t('caught as an absence-as-presence violation', absenceAsPresenceHits(ECHO).length > 0);
  t('it fails C1', scoreC1(ECHO, { phrases, erasedTerms: [] }).pass === false);
  t('it fails C2 disposition', scoreC2(ECHO, { roster: ROSTER, tokens: TOK, phrases, ambiguous }).disposition.ok === false);
  t('"the interference that never happened" caught',
    absenceAsPresenceHits('whether to claim the interference that never happened').length > 0);
  t('"the silence where the questioning never was" caught',
    absenceAsPresenceHits('She felt the silence where the questioning never was.').length > 0);
  t('a plain active-canon sentence is NOT caught',
    absenceAsPresenceHits('The Answer remains in his hands.').length === 0);
  t('the assembly’s surviving assumption is NOT caught',
    absenceAsPresenceHits('The assembly watches me now, the assumption of interference still hanging between us.').length === 0);

  console.log('\nG. ACTIVE CANON MUST NOT BE SCORED AS ERASED');
  const SURVIVES = [
    'The assembly watches me now, the assumption of interference still hanging between us.',
    'Claim the interference openly, or let the assembly keep its assumption.',
    'The words of the wish have come true and everyone can see how.'
  ].join('\n');
  const gc1 = scoreC1(SURVIVES, { phrases, erasedTerms: ERASED });
  t('the surviving assumption does NOT fail C1', gc1.pass === true,
    JSON.stringify({ er: gc1.erasedBasis, ab: gc1.absenceAsPresence, tl: gc1.externalTimeline }));
  t('"the assumption" is no longer an erased term', !ERASED.includes('the assumption'));
  t('"the accusation" is no longer an erased term', !ERASED.includes('the accusation'));
  t('NO active-canon term appears in the erased list',
    ACTIVE_CANON_TERMS.every(a => !ERASED.includes(a)), ERASED.join(','));
  // The drift that caused the false failures: two private copies of this list.
  t('the RUNNER imports the shared list rather than keeping its own',
    /ERASED_PROSE_TERMS/.test(fs.readFileSync('_fsc_c4_run.mjs', 'utf8'))
    && !/^const ERASED_TERMS = \[/m.test(fs.readFileSync('_fsc_c4_run.mjs', 'utf8')));

  console.log('\nH. WITHIN-SCENE TEMPORAL WORDING IS REVIEWED, NOT FAILED');
  const INNOCENT = [
    'The rite ends and the clearing feels older than it did moments ago.',
    'The Dohkar recovers and finishes the formula, voice steady again.',
    'Seren kneels at the centre. Julian stands apart, the Answer in his hands.'
  ].join('\n');
  const hc2 = scoreC2(INNOCENT, { roster: ROSTER, tokens: TOK, phrases, ambiguous });
  t('ordinary within-scene wording PASSES C2 disposition', hc2.disposition.ok === true,
    JSON.stringify(hc2.disposition.leaks));
  t('  but it IS surfaced for review', hc2.review.length === 2, JSON.stringify(hc2.review.map(r => r.phrases)));

  // ── GROUND TRUTH — BOTH REAL RUNS ───────────────────────────────────────────────────────────
  console.log('\nH1. ORDINAL + "time" IS NEVER AMBIGUOUS');
  // The final run opened on "The rite ends for the second time." The unambiguous list held
  // 'a second time' and 'the second rite' but not 'the second time', so the only violation in an
  // otherwise clean scene was downgraded to a review note and the run scored a false mechanical PASS.
  ['The rite ends for the second time.', 'She knelt there the first time.',
   'He asked for the third time.'].forEach(s =>
    t('"' + s.slice(0, 34) + '..." is a scored leak',
      externalTimelineHits(s, phrases).length > 0, JSON.stringify(externalTimelineHits(s, phrases))));
  t('but a bare ordinal is still only review-grade',
    externalTimelineHits('He reached for the second cup.', phrases).length === 0);
  t('  ("the second" alone stays in the ambiguous list)', ambiguous.includes('the second'));

  console.log('\nH1a. THE INTERVENTION MAY NOT BE AN EMISSION');
  [ 'A low pulse travels through the clearing.',
    'The Answer pulses once between his palms.',
    'The pulse has already passed through every person present.',
    'A ripple moved through the assembly.',
    'A slow current spread across the gathering.',
    'Something passed through everyone at the same moment.'
  ].forEach(s => t('forbidden: "' + s.slice(0, 46) + '"', scoreC3(s).pass === false));
  console.log('  ordinary bodily and ordinary-world uses stay OUT of scope:');
  [ 'Her pulse beat hard at her throat.',
    'He felt his own heartbeat in his ears.',
    'She pressed two fingers to the pulse at her wrist.',
    'The Answer rests in Julian’s hands, silver script moving slowly across his slate-blue skin.',
    'Here and there in the crowd someone shifts their weight or half-turns to go and then stays.'
  ].forEach(s => t('permitted: "' + s.slice(0, 46) + '"', scoreC3(s).pass === true,
    JSON.stringify(scoreC3(s).emission)));

  console.log('\nH1c2. C3 PROVENANCE — a cost needs a named source, not a plan that mentioned one');
  const UNCOUNTED = 'The cost of either path remains uncounted.';
  t('an unsourced cost line FAILS', scoreC3(UNCOUNTED).pass === false);
  t('  it is NOT rescued by the seed having raised the possibility',
    scoreC3(UNCOUNTED, { costProvenance: [] }).pass === false);
  const SEALED_LINE = 'The price is that she forgets whose it is.';
  t('the sealed-cost line IS cost-shaped, so it reaches the provenance check',
    scoreC3(SEALED_LINE).pass === false);
  t('  and with the sealed cost declared it becomes admissible',
    scoreC3(SEALED_LINE, { sealedCost: 'she_forgets_whose_it_is' }).pass === true);
  t('  recorded with its source',
    (scoreC3(SEALED_LINE, { sealedCost: 'she_forgets_whose_it_is' }).allowedCost[0] || {}).via
      === 'sealed cost: she_forgets_whose_it_is');
  t('  a DIFFERENT sealed cost does NOT admit it',
    scoreC3(SEALED_LINE, { sealedCost: 'escalation_invited' }).pass === false);
  const HOUSE = 'A debt to her house predates all of this.';
  t('a NAMED active-fact provenance is admissible',
    scoreC3(HOUSE, { costProvenance: [{ rx: /\bdebt to her house\b/i,
      provenance: 'house.debt_standing (active)' }] }).pass === true);
  t('  the same line without provenance FAILS', scoreC3(HOUSE).pass === false);
  t('the rule is carried in the result for the verdict to cite',
    /may not become a cost of the Tempt/i.test(scoreC3('x').provenanceRule));

  console.log('\nH1c3. COST IN EVERY TENSE — stated, deferred, conditional, future');
  [ 'Either path will cost standing.',                       // the real line the scanner missed
    'Either path would cost her something.',
    'She keeps her standing at the cost of the truth.',
    'It comes at a price she has not counted.',
    'The choice costs her either way.',
    'Fate will exact a toll for this.',
    'She owes a debt for it now.',
    'She will pay for this before the season turns.',
    'This does not come free.',
    'The price has not yet been named.',
    'The cost of either path remains uncounted.'
  ].forEach(s => t('caught: "' + s.slice(0, 46) + '"', scoreC3(s).pass === false));
  console.log('  and ordinary non-price uses stay clean:');
  [ 'The rite is finished and the clearing has not broken up.',
    'She counted the beads on her sash.',
    'He paid attention to the closing formula.',
    'The assembly waits without speaking.'
  ].forEach(s => t('clean: "' + s.slice(0, 46) + '"', scoreC3(s).pass === true,
    JSON.stringify(scoreC3(s).explicit.concat(scoreC3(s).deferred))));

  console.log('\nH1a1b. EMISSION — abstract temporal subjects are out of scope');
  [ 'The Dohkar’s voice steadies, but the moment has already passed through the clearing.',
    'The silence went through the gathering and no one broke it.',
    'Time passed through the clearing while no one moved.',
    'The question passed through the crowd unspoken.'
  ].forEach(s => t('exempt: "' + s.slice(0, 48) + '"', scoreC3(s).pass === true,
    JSON.stringify(scoreC3(s).emission)));
  console.log('  physical and object-originating emissions stay scored:');
  [ 'A low pulse travels through the clearing.',
    'The Answer pulses once between his palms.',
    'A ripple moved through the assembly.',
    'The moment passed, and a current spread through the crowd.'   // abstract + physical noun
  ].forEach(s => t('still caught: "' + s.slice(0, 48) + '"', scoreC3(s).pass === false));

  console.log('\nH1a4b. C4 TOLERATES PARAPHRASE AND SPLIT PRESENTATION');
  // The real run: both alternatives in the scene's OWN words, across two adjacent beats.
  // Local helpers: this block sits ABOVE the section that declares bp/ANCH, and reaching forward
  // for a const is the same dead-zone bug that crashed the runner after a paid call.
  const bp2 = (...x) => ({ beats: x.map((v, i) => ({ idx: i, text: v })) });
  const ANCH2 = CHOICE_ANCHORS['unm.time_gives_way'];
  const SPLIT = bp2('The rite is finished.', 'I know what they are waiting for.',
    'The choice sits in my mouth.', 'I can claim what happened.',
    'Or I can let them keep their assumption.', 'The assembly waits.',
    'I must choose which story they will carry away from this clearing.');
  const rs = scoreC4(SPLIT, { anchors: ANCH2 });
  t('a paraphrased, split choice is RECOGNIZED', rs.pass === true, JSON.stringify(rs.reason));
  t('  both alternatives are located, in different beats',
    rs.presentedAt.length === 2 && rs.presentedAt[0].beat !== rs.presentedAt[1].beat,
    JSON.stringify(rs.presentedAt));
  t('  the final beat holds it unresolved', rs.finalPending === true);
  const HALF = bp2('The rite is finished.', 'I can claim what happened.', 'The assembly waits.');
  t('ONE alternative alone is NOT a presented choice',
    scoreC4(HALF, { anchors: ANCH2 }).reason === 'choice_never_presented');
  t('  and the missing alternative is named',
    scoreC4(HALF, { anchors: ANCH2 }).alternativesFound.some(a => a.found === false));
  const FAR = bp2('I can claim what happened.', 'a', 'b', 'c', 'd',
    'Or I can let them keep their assumption.');
  t('alternatives too far apart are NOT a single presentation',
    scoreC4(FAR, { anchors: ANCH2 }).reason === 'choice_never_presented');
  const RESOLVES = bp2('I can claim what happened.', 'Or I can let them keep their assumption.',
    'I claimed it, and the clearing went quiet.');
  t('resolution after a SPLIT presentation still FAILS',
    scoreC4(RESOLVES, { anchors: ANCH2 }).pass === false);

  console.log('\nH1a2. THE WARDROBE ALLOWANCE IS SOURCE-AWARE, NOT A WHITELIST');
  const WARDROBE = "gossamer child's tunic blooming luminous white over torso hips and seat, aqua skin, pale coral hair";
  t('the seed gossamer garment is ALLOWED', scoreC3(WARDROBE).pass === true,
    JSON.stringify(scoreC3(WARDROBE).residue));
  t('  and is recorded as an allowance, not silently dropped',
    scoreC3(WARDROBE).wardrobeAllowed.length === 1);
  [ 'The grass was glowing faintly from generations of offerings.',
    'Her robes were still luminous from the rite.',
    'A faint aura clung to the spiralgrass.',
    'The clearing shimmered where the wish had landed.'
  ].forEach(s => t('still caught: "' + s.slice(0, 44) + '"', scoreC3(s).pass === false));

  console.log('\nH1a3. C4 DERIVES THE GATE AS PRODUCTION DOES');
  const mkPlan = (n, idx) => ({ beats: Array.from({ length: n }, (_, i) => ({ idx: i, text: 'b' + i })),
    ...(idx === undefined ? {} : { decisionGateBeatIdx: idx }) });
  t('an ABSENT index defaults to the last beat', effectiveGate(mkPlan(26)).gate === 25);
  t('  and is reported as derived', effectiveGate(mkPlan(26)).derived === true);
  t('an out-of-range index falls back to the last beat', effectiveGate(mkPlan(26, 99)).gate === 25);
  t('a mid-scene index is CLAMPED to the last beat, as production does',
    effectiveGate(mkPlan(26, 10)).gate === 25);
  t('a correct index is kept', effectiveGate(mkPlan(26, 25)).gate === 25);
  t('an empty plan yields no gate', effectiveGate({ beats: [] }).gate === null);

  console.log('\nH1a4. C4 IS A LIFECYCLE CHECK THAT CAN FAIL');
  const ANCH = CHOICE_ANCHORS['unm.time_gives_way'];
  const bp = (...t) => ({ beats: t.map((x, i) => ({ idx: i, text: x })) });
  const HOLD = bp('The rite is finished.', 'Seren studies her palms.',
    'Claim the interference or let the assumption stand.', 'The assembly waits without speaking.',
    'I stand inside the choice that has not yet been made.');
  const r1 = scoreC4(HOLD, { anchors: ANCH });
  t('a scene that reaches the choice and holds it PASSES', r1.pass === true, JSON.stringify(r1.reason));
  t('  it locates where both alternatives are on the table', r1.presentedThrough === 2);
  t('  and confirms the final beat holds it pending', r1.finalPending === true);

  const RESOLVED = bp('The rite is finished.',
    'Claim the interference or let the assumption stand.', 'I claimed it, and the clearing went quiet.');
  const r2 = scoreC4(RESOLVED, { anchors: ANCH });
  t('a scene that RESOLVES after the choice FAILS', r2.pass === false);
  t('  the violation is named as a resolution',
    r2.violations.some(v => v.kind === 'resolution'), JSON.stringify(r2.violations));

  const ADVANCED = bp('Claim the interference or let the assumption stand.',
    'Hours later the clearing was empty.');
  const r3 = scoreC4(ADVANCED, { anchors: ANCH });
  t('a scene that ADVANCES TIME after the choice FAILS', r3.pass === false);
  t('  the violation is named as a temporal advance',
    r3.violations.some(v => v.kind === 'temporal_advance'));

  const DRIFTED = bp('Claim the interference or let the assumption stand.',
    'The Dohkar waits.', 'Seren rises and walks out of the clearing.');
  const r4 = scoreC4(DRIFTED, { anchors: ANCH });
  t('a final beat that does NOT hold the choice FAILS', r4.pass === false
    && r4.reason === 'final_beat_does_not_hold_the_choice', JSON.stringify(r4.reason));

  const NOCHOICE = bp('The rite is finished.', 'Seren studies her palms.', 'The assembly waits.');
  t('a scene that never presents the choice FAILS',
    scoreC4(NOCHOICE, { anchors: ANCH }).reason === 'choice_never_presented');
  t('the check is NOT an identity — it returns both pass and fail across these fixtures',
    [r1, r2, r3, r4].map(r => r.pass).join(',') === 'true,false,false,false');
  t('post-choice beats are surfaced for reading', r1.postChoiceBeats.length === 2);

  console.log('\nH1a5. THE DOHKAR AFTERMATH MATCHER — real rendered lines');
  [ 'The presiding Dohkar stumbles on the final formula.',
    // The real pair, as rendered: the name is in the first sentence and the marker in the second.
    // A bare "He finds the thread again" with no antecedent must NOT attribute to him, and does not.
    'The presiding Dohkar stumbles on the final formula. He finds the thread again without comment.',
    'The Dohkar loses his place in a rite he has performed a hundred times.',
    'The Dohkar opens his mouth and the next word of the closing formula does not come.',
    'The presiding Dohkar loses his place in words he has spoken a hundred times, then recovers without remarking on it.'
  ].forEach(s => t('recognized: "' + s.slice(0, 48) + '"', aftermathLanded(s, 'Dohkar').landed === true));
  t('still says NO when the Dohkar simply acts with a named cause',
    aftermathLanded('The Dohkar raised his hand because the rite required it.', 'Dohkar').landed === false);
  t('a bare pronoun with NO antecedent does not attribute to him',
    aftermathLanded('He finds the thread again without comment.', 'Dohkar').landed === false);
  // GROUND TRUTH: the real run where the matcher reported NO.
  const R6 = '_tempt_fate_fixtures/fsc_c4_2026-09-29T21-54-50/prose.txt';
  if (fs.existsSync(R6)) {
    const p6 = fs.readFileSync(R6, 'utf8');
    t('the run that reported "Dohkar: NO" now recognizes him',
      aftermathLanded(p6, 'Dohkar').landed === true, aftermathLanded(p6, 'Dohkar').sentence);
    ['Seren', 'Julian', 'Lirael'].forEach(n =>
      t('  ' + n + ' still recognized', aftermathLanded(p6, n).landed === true));
    const plan6 = JSON.parse(fs.readFileSync('_tempt_fate_fixtures/fsc_c4_2026-09-29T21-54-50/scene.json', 'utf8'));
    const c4real = scoreC4(plan6, { anchors: ANCH });
    t('and C4 scores that real run SEMANTICALLY, not by identity',
      c4real.pass === true && c4real.presentedThrough === 20,
      JSON.stringify({ pass: c4real.pass, through: c4real.presentedThrough, reason: c4real.reason }));
    t('  with its four post-choice beats surfaced for reading',
      c4real.postChoiceBeats.length === 4, String(c4real.postChoiceBeats.length));
  } else { t('run-6 evidence present', false, R6); }

  console.log('\nH1b. NARRATOR ORIENTATION — all four named frames must FAIL C1 AND C2');
  // Each used as the scene's opening orientation, the position the final run actually failed in.
  [['for the second time', 'The rite ends for the second time.'],
   ['the second rite',     'The second rite closes without a word against her.'],
   ['again',              'The rite begins again in the crimson spiralgrass.'],
   ['replayed',           'The rite is replayed from its first word.']
  ].forEach(([label, opener]) => {
    const scene = [opener,
      'Seren kneels at the centre, her palms turned upward as if checking for something missing.',
      'The Dohkar falters; the word he needs does not come.',
      'Julian stands apart. The Answer rests in his hands.',
      'Claim the interference, or let the assumption stand.'].join('\n');
    const o1 = scoreC1(scene, { phrases, erasedTerms: ERASED, ambiguous });
    const o2 = scoreC2(scene, { roster: ROSTER, tokens: TOK, phrases, ambiguous });
    t('"' + label + '" as orientation FAILS C1', o1.pass === false,
      JSON.stringify(o1.externalTimeline));
    t('  and FAILS C2 disposition', o2.disposition.ok === false,
      JSON.stringify(o2.disposition.leaks.map(l => l.phrases)));
    t('  and is NOT quietly downgraded to review', o2.review.length === 0,
      JSON.stringify(o2.review.map(r => r.phrases)));
  });
  t('but "voice steady again" mid-scene is still only review-grade',
    scoreC2(['The rite concludes in the crimson spiralgrass.',
             'Seren kneels, her palms turned upward.',
             'Julian stands apart; the Answer rests in his hands.',
             'The Dohkar recovers and finishes, his voice steady again.'].join('\n'),
      { roster: ROSTER, tokens: TOK, phrases, ambiguous }).disposition.ok === true);

  console.log('\nH1c. COSTLESS MEANS COSTLESS — DEFERRED PRICE IS STILL AN INVENTED COST');
  // PERMITTED: active stakes that already govern.
  [ "Lirael's standing is at risk.",
    'The assembly has turned to her and the inquiry has not opened.',
    'My standing is at risk before the assembly.'
  ].forEach(s => t('permitted: "' + s.slice(0, 44) + '"', scoreC3(s).pass === true,
    JSON.stringify(scoreC3(s))));
  // FORBIDDEN: the same risk reframed as payment, stated or deferred.
  [ 'The cost is still uncounted.',
    'The cost remains unnamed.',
    'The cost remains uncounted either way.',
    'The cost of either path has not yet been named.',
    'My standing is at risk and the cost is still uncounted.',
    'Fate will take something later.',
    'She will pay for this in time.',
    'The price of the wish was her standing.',
    'Something will be collected for it.'
  ].forEach(s => t('forbidden: "' + s.slice(0, 44) + '"', scoreC3(s).pass === false));
  t('the permitted/forbidden split is the WHOLE distinction',
    scoreC3("Lirael's standing is at risk.").pass === true
    && scoreC3("My standing is at risk and the cost is still uncounted.").pass === false);
  // GROUND TRUTH: every run that I wrongly passed on C3 must now fail.
  [['fsc_roster_2026-09-29T15-59-11', 'roster / turning_forgotten'],
   ['fsc_c4_2026-09-29T16-46-27', 'C4 run 2'],
   ['fsc_c4_2026-09-29T19-42-53', 'C4 run 3'],
   ['fsc_c4_2026-09-29T20-08-11', 'C4 run 4 (validation)']
  ].forEach(([d, label]) => {
    const p = '_tempt_fate_fixtures/' + d + '/prose.txt';
    if (!fs.existsSync(p)) { t('evidence present: ' + label, false, p); return; }
    const r = scoreC3(fs.readFileSync(p, 'utf8'));
    t(label + ' now FAILS C3 (I passed it)', r.pass === false,
      JSON.stringify(r.deferred.concat(r.explicit)));
  });
  // And the one run that genuinely had no cost line must still pass.
  const clean1 = '_tempt_fate_fixtures/fsc_c4_2026-09-29T16-29-43/prose.txt';
  if (fs.existsSync(clean1))
    t('C4 run 1 had NO cost line and still passes C3',
      scoreC3(fs.readFileSync(clean1, 'utf8')).pass === true);

  console.log('\nH2. AN EMPTY OR VOID RESPONSE MUST NOT SCORE AS CLEAN');
  // Run 3 returned HTTP 502 with an empty body and the runner printed "C1: PASS / C3: clean".
  // Content scanners trivially pass an empty string; an absent violation is not obedience. The
  // runner now refuses to score a void response at all — these assertions pin WHY it must.
  const EMPTY = '';
  t('an empty scene "passes" C1 — which is exactly the trap', scoreC1(EMPTY, { phrases, erasedTerms: ERASED }).pass === true);
  t('an empty scene FAILS C2 presence — the only check that catches it',
    scoreC2(EMPTY, { roster: ROSTER, tokens: TOK, phrases, ambiguous }).presence.ok === false);
  t('  every roster member reported missing',
    scoreC2(EMPTY, { roster: ROSTER, tokens: TOK, phrases, ambiguous }).presence.missing.length === 5);
  t('no aftermath beat is found in nothing',
    ['Seren', 'Julian', 'Dohkar', 'Lirael'].every(n => aftermathLanded(EMPTY, n).landed === false));
  t('the runner gates on beats BEFORE scoring',
    /RUN VOID — NOT SCORED/.test(fs.readFileSync('_fsc_c4_run.mjs', 'utf8')));
  t('  and exits non-zero on a void run',
    /process\.exit\(5\)/.test(fs.readFileSync('_fsc_c4_run.mjs', 'utf8')));

  console.log('\nH3. GROUND TRUTH: the compact-brief run that my scanner passed on C3');
  const R5 = '_tempt_fate_fixtures/fsc_c4_2026-09-29T21-45-14/prose.txt';
  if (fs.existsSync(R5)) {
    const p5 = fs.readFileSync(R5, 'utf8');
    const g = scoreC3(p5);
    t('it now FAILS C3 (the old scanner reported only the wardrobe)', g.pass === false);
    t('  the failure is the EMISSION, not the wardrobe', g.emission.length > 0);
    t('  "A low pulse travels through the clearing" is caught',
      g.emission.some(s => /low pulse travels/i.test(s)));
    t('  "The pulse has already passed through every person" is caught',
      g.emission.some(s => /passed through every person/i.test(s)));
    t('  the gossamer wardrobe is NOT reported as residue', g.residue.length === 0,
      JSON.stringify(g.residue));
    t('  it is recorded as an allowance instead', g.wardrobeAllowed.length > 0);
    t('  and no invented cost is present', g.explicit.length === 0 && g.deferred.length === 0);
    const plan5 = JSON.parse(fs.readFileSync('_tempt_fate_fixtures/fsc_c4_2026-09-29T21-45-14/scene.json', 'utf8'));
    const eg = effectiveGate(plan5);
    t('  C4 derives a gate even though the author emitted none',
      eg.derived === true && eg.gate === eg.last && eg.gate === 25);
  } else { t('run-5 evidence present', false, R5); }

  console.log('\nI. GROUND TRUTH: re-score both real runs with the corrected scorer');
  const RUN1 = '_tempt_fate_fixtures/fsc_c4_2026-09-29T16-29-43/prose.txt';
  const RUN2 = '_tempt_fate_fixtures/fsc_c4_2026-09-29T16-46-27/prose.txt';
  if (fs.existsSync(RUN1) && fs.existsSync(RUN2)) {
    const p1 = fs.readFileSync(RUN1, 'utf8'), p2 = fs.readFileSync(RUN2, 'utf8');
    const a2 = scoreC2(p1, { roster: ROSTER, tokens: TOK, phrases, ambiguous });
    const a1 = scoreC1(p1, { phrases, erasedTerms: ERASED });
    console.log('  RUN 1 (before the POV rule)');
    t('  still FAILS C2 on disposition', a2.pass === false && a2.disposition.ok === false);
    t('  Lirael still named as retaining — D1', a2.retainingParties.includes('pc:lirael'));
    t('  still FAILS C1', a1.pass === false);
    t('  shared understanding still caught', a1.sharedUnderstanding.length > 0);

    const b2 = scoreC2(p2, { roster: ROSTER, tokens: TOK, phrases, ambiguous });
    const b1 = scoreC1(p2, { phrases, erasedTerms: ERASED });
    console.log('  RUN 2 (with the POV rule)');
    t('  presence passes', b2.presence.ok === true);
    t('  D1 is FIXED: Lirael no longer retains',
      !b2.retainingParties.includes('pc:lirael'), b2.retainingParties.join(','));
    t('  shared knowledge is FIXED: zero hits', b1.sharedUnderstanding.length === 0);
    t('  no cross-timeline comparison remains', b1.externalTimeline.length === 0,
      JSON.stringify(b1.externalTimeline));
    t('  the surviving ASSUMPTION is no longer miscounted as erased',
      b1.erasedBasis.every(e => e.term !== 'the assumption'), JSON.stringify(b1.erasedBasis));
    t('  "the interruption" IS still counted — that atom really is ceased',
      b1.erasedBasis.length === 1 && b1.erasedBasis[0].term === 'the interruption',
      JSON.stringify(b1.erasedBasis));
    t('  it STILL fails, and every remaining fault is absence-as-presence',
      b1.pass === false && b1.absenceAsPresence.length > 0);
    t('  two sentences carry it: the Dohkar beat and the dramatic question',
      b1.absenceAsPresence.length === 2, JSON.stringify(b1.absenceAsPresence.map(a => a.sentence.slice(0, 50))));
    t('  C2 fails for that reason ALONE — no comparison leak survives',
      b2.pass === false && b2.disposition.leaks.length > 0
      && b2.disposition.leaks.every(l => l.absenceAsPresence === true && l.phrases.length === 0),
      JSON.stringify(b2.disposition.leaks.map(l => l.phrases)));
    console.log('  aftermath, role-aware:');
    ['Seren', 'Julian', 'Dohkar', 'Lirael'].forEach(n =>
      t('  ' + n + ' beat recognized', aftermathLanded(p2, n).landed === true));
  } else {
    t('ground-truth evidence present', false, 'run prose missing');
  }

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
  process.exit(fail === 0 ? 0 : 1);
}
