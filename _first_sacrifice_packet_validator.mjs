#!/usr/bin/env node
// FIRST SACRIFICE SOURCE PACKET — dry validator + red/green proof (Roman, 2026-09-16)
//
// Validates a HYPOTHETICAL future draft-generation output against _first_sacrifice_source_packet.json.
// No prose is generated here — every "draft" object below is a hand-constructed STRUCTURAL test
// fixture used only to prove the validator's rejection rules actually bite (red) and correctly
// accept compliant shapes (green). This is the review boundary for a FUTURE authoring pass, not
// the authoring pass itself. Zero network, zero model calls, zero cost by construction.
//
// usage: node _first_sacrifice_packet_validator.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ── THE VALIDATOR (v6 — Roman's sixth redesign pass, 2026-09-17) ───────────────────────────────
// Rewritten against the REAL app mechanism, traced directly: the player is Lirael, so the model
// writes scene1Candidate + scene1Coverage + first_person_lirael, exactly ONE oasOpening line
// (Julian only), exactly ONE postInterruptionBeat (crystallizes an unresolved choice, never
// decides it), and fateCards (5 fixed archetype keys) for the post-interruption handoff.
// Everything between the opening line and the interruption is LIVE (real app.js
// _handleIntimacyTurn turns), never authored by this operation. The interruption caption and the
// 3-line fixed tail are already-baked content the adapter splices in at the real OAS exit event,
// never asked of the model. Returns { ok, violations: [{ rule, detail }] }. Every rule is
// REJECT-ONLY — it never rewrites or repairs a draft, matching this session's established
// doctrine that a validator which can write is a competing author.
const SEALED_PATTERNS = [
  { id: 'julian_counter_wish', re: /counter[- ]?wish/i },
  { id: 'julian_obscuring_wishes', re: /obscur\w* wish/i },
  { id: 'julian_forbidden_readings', re: /\b(contempt|disdain|cannot be bothered|unimpressed by the (?:rite|ceremony)|challenge to her|challenging her|undermin\w+ her|contest\w* her authority|suspicio\w+|hiding something|conceal\w+|secret\w*|knows (?:more|something)|will not say|keeps? it to himself|withhold\w+)\b/i },
  { id: 'inquiry_not_opened', re: /inquiry\b[^.!?]{0,30}\b(?:opened|convened|underway|in session|began|started|ruled|concluded|delivered its (?:ruling|verdict))/i },
  // NEW (Roman, seventh pass, 2026-09-17) — companion to julian_counter_wish/julian_obscuring_wishes
  // above: the wish's arrest must not be attributed to Julian at all, not just not attributed to his
  // specific sealed mechanism. Narrow proximity scan (Julian's name within ~80 chars of a stopping/
  // arresting verb, either order) — a disclosed lexical guard, not a claim that every real leak is
  // caught (see the existing julian_forbidden_readings precedent for the same honest framing).
  { id: 'twist_arrest_cause_unattributed', re: /julian[^.!?]{0,80}\b(stopped|halted|arrested|checked|intervened|steadied|calmed|quieted|stilled|silenced)\b|\b(stopped|halted|arrested|checked|intervened|steadied|calmed|quieted|stilled|silenced)\b[^.!?]{0,80}julian/i },
];
const CONTRADICTION_PATTERNS = [
  { re: /the answer (?:is|was|belongs to) (?:hers|Lirael'?s|mine)/i, why: 'contradicts locked fact: The Answer is the Institution\'s, Julian is its caretaker, never PC-owned' },
  { re: /julian (?:is not|was not|isn'?t) (?:the )?provast/i, why: 'contradicts locked fact: Julian currently holds the office of Provast' },
  { re: /lirael (?:owns|is given|keeps) the answer/i, why: 'contradicts locked fact: Lirael holds it only for the duration of the questioning' },
];
const RUN_STAY_PATTERN = /\b(run(?:s|ning)? (?:in shame|away)?\s*(?:or|vs\.?|versus)\s*(?:remain|stay))\b/i;
// SCENE1/OAS BOUNDARY LEAK (Roman, 2026-09-17) — a real rejected draft (v7 attempt 2) dramatized
// Julian's actual interrogation ("He asked whether I had called to him through the rite") and
// Lirael's reaction to it INSIDE scene1Candidate — content exclusive to oasOpening/the live OAS
// exchange. Scoped ONLY to scene1Candidate.beats text (never the whole draft — postInterruptionBeat
// and fateCards legitimately reflect on the live exchange after it happened). A narrow, disclosed
// lexical guard, not a claim that every possible leak is caught.
const SCENE1_OAS_LEAK_PATTERNS = [
  { id: 'desirability', re: /desirability/i },
  { id: 'rescue', re: /\b(?:hoping (?:he|she|I) would rescue|would rescue (?:her|him|me))\b/i },
  { id: 'manipulation_accusation', re: /\bmanipulat\w+ (?:her|him|me|Seren|without knowing)\b/i },
  { id: 'interrogation_question', re: /\basked?\s+(?:me\s+|her\s+|him\s+)?(?:whether|if)\b/i },
];
// EXEMPLAR VERBATIM-COPY GUARD (Roman, 2026-09-17) — attempt4_positive_exemplars are explicitly
// non-canonical, craft-reference-only; the packet's own hard boundary bans quoting or closely
// copying them. A narrow, disclosed guard: flags a 6-consecutive-word verbatim match against
// either exemplar's own text. Catches literal copying, not paraphrase (same honest limit as the
// vague-consequence disclosure elsewhere in this file — a validator cannot judge "closeness").
function _ngramOverlap(text, exemplarText, n) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  const textWords = norm(text);
  const exWords = norm(exemplarText);
  if (exWords.length < n) return false;
  const grams = new Set();
  for (let i = 0; i <= exWords.length - n; i++) grams.add(exWords.slice(i, i + n).join(' '));
  for (let i = 0; i <= textWords.length - n; i++) { if (grams.has(textWords.slice(i, i + n).join(' '))) return true; }
  return false;
}
// ══ THE ANSWER — STATEFUL MANIFESTATION CONTINUITY ENGINE (Roman, 2026-09-20) ═══════════════════
// REPLACES the earlier permanent-form model (which wrongly treated the staff as fixed forever and
// leaned on a human-review safety net that does not exist — Roman's own correction). The Answer's
// IDENTITY persists; its physical MANIFESTATION is mutable state that changes ONLY as the declared
// consequence of a concrete wielder need via a structured manifestation-change event — never because
// prose/an author/a renderer wants a different image or metaphor. See packet
// scene1_answer_manifestation for the full contract. This is a DETERMINISTIC mechanical check, not a
// deferral to human review: it walks the ordered narrative stream, tracks which manifestation is
// ACTIVE at each position, and requires every physical claim to match the one active there.
const ANSWER_OBJECT_REF = 'the_answer';
const PROVENANCE_KINDS = new Set(['locked_canon_fact', 'grounded_inference', 'generated_expression']);
const ALLOWED_OBJECT_CLAIM_FIELDS = new Set(['object_ref', 'physical_form_claim', 'claim_kind', 'cites']);
const THE_ANSWER_RE = /\bThe Answer\b/;
// SECONDARY BACKUP ONLY (per Roman: "keep narrowly scoped lexical checks as a backup only") — tuned
// against the only manifestation ever approved so far (the staff). Fires on same-text co-occurrence
// with "The Answer", or (see _theAnswerAdjacentPairViolations) split across one adjacent beat pair.
const THE_ANSWER_BANNED_FORM_RE = /\b(stones?|gem(?:stones?)?|orbs?|crystals?|rocks?|pebbles?|jewels?)\b/i;
function _theAnswerFormViolation(text) {
  const t = String(text || '');
  if (!THE_ANSWER_RE.test(t)) return null;
  const m = t.match(THE_ANSWER_BANNED_FORM_RE);
  return m ? m[0] : null;
}
function _theAnswerAdjacentPairViolations(beats) {
  const hits = [];
  if (!Array.isArray(beats)) return hits;
  for (let i = 0; i < beats.length - 1; i++) {
    const tA = String((beats[i] && beats[i].text) || '');
    const tB = String((beats[i + 1] && beats[i + 1].text) || '');
    const namesA = THE_ANSWER_RE.test(tA), namesB = THE_ANSWER_RE.test(tB);
    if (!namesA && !namesB) continue;
    const sameTextAlreadyCaught = (namesA && THE_ANSWER_BANNED_FORM_RE.test(tA)) || (namesB && THE_ANSWER_BANNED_FORM_RE.test(tB));
    if (sameTextAlreadyCaught) continue;
    const mA = tA.match(THE_ANSWER_BANNED_FORM_RE), mB = tB.match(THE_ANSWER_BANNED_FORM_RE);
    const hit = mA || mB;
    if (hit) hits.push({ i, j: i + 1, word: hit[0] });
  }
  return hits;
}
// PRIMARY TRIGGER (Roman, 2026-09-20): "require object-claim metadata for any physical handling,
// visual description, or transformation — not merely literal uses of its proper name." Gated on
// hasEntered (only meaningful once The Answer has already appeared once in the stream) so an
// unrelated early "it" doesn't false-trigger before the object exists in the scene. Bidirectional,
// bounded 50-char window: a pronoun ("it"/"its") near a handling/description/transformation word, or
// vice versa. A disclosed, bounded heuristic — not a claim every possible phrasing is caught; the
// mandatory-metadata requirement plus this widened trigger is the real closure the earlier
// literal-name-only version lacked.
const ANSWER_HANDLING_WORDS = 'weight|shape|form|hook|hooks|shaft|staff|held|holding|closed|closing|drew|drawing|grip|gripped|palm|hands?|fingers?|became|become|becomes|shifted|shifting|shift|changed|changing|change|transformed|transforming|transform';
const ANSWER_HANDLING_SIGNAL_RE = new RegExp('\\b(it|its)\\b[\\s\\S]{0,50}\\b(?:' + ANSWER_HANDLING_WORDS + ')\\b|\\b(?:' + ANSWER_HANDLING_WORDS + ')\\b[\\s\\S]{0,50}\\b(it|its)\\b', 'i');
function _answerHandlingSignal(text) { return ANSWER_HANDLING_SIGNAL_RE.test(String(text || '')); }

// Reads + structurally validates packet.scene1_answer_manifestation.permitted_manifestation_change_
// events (packet-level validity — independent of any draft). Returns { current, events, violations }
// where events is sorted by after_beat ascending, each { afterPos, manifestationId, form, ref }.
//
// WORLD-SCOPE GATE (Roman, 2026-09-20): manifestation variance is a SHARED Fatelands Fantasy reality
// law (_fatelands_reality_seam_and_manifestation_law.json) — it must never be imposed on Famous Fate
// or any other independently-canonical world. validateDraft() stays self-contained (no filesystem
// reads — other scripts extract it by regex+eval), so the gate checks packet.world_scope directly
// rather than re-reading the shared law file: a packet not scoped to "fatelands_fantasy" gets NO
// manifestation-variance affordance at all — any declared event is refused outright, regardless of
// how well-formed it otherwise is.
function _buildAnswerManifestationTimeline(packet) {
  const ms = packet && packet.scene1_answer_manifestation;
  const violations = [];
  const fatelandsScope = !!packet && packet.world_scope === 'fatelands_fantasy';
  // The gate bites MISUSE (an actual attempt to invoke manifestation VARIANCE — a declared change
  // event), not mere world identity: a single fixed current_manifestation is not itself a Fatelands-
  // law claim (any world can say "this object currently looks like X"), so a non-Fatelands packet
  // with zero declared events is not punished for a law it never invoked.
  const rawEventsForGate = (ms && ms.permitted_manifestation_change_events) || [];
  if (!fatelandsScope && rawEventsForGate.length > 0) {
    violations.push({ rule: 'fatelands_manifestation_law_misapplied', detail: 'packet.world_scope is "' + (packet && packet.world_scope) + '", not "fatelands_fantasy", but this packet declares ' + rawEventsForGate.length + ' permitted_manifestation_change_event(s) — the shared Fatelands reality-seam/manifestation law (_fatelands_reality_seam_and_manifestation_law.json) never applies outside Fatelands Fantasy stories; it must never be imposed on Famous Fate or another independently-canonical world' });
  }
  const current = ms && ms.current_manifestation;
  if (!current || !current.manifestation_id || !current.form) {
    violations.push({ rule: 'the_answer_manifestation_state_malformed', detail: 'packet.scene1_answer_manifestation.current_manifestation is missing or incomplete — every draft is refused until the packet declares a valid current manifestation' });
  }
  const events = [];
  const rawEvents = (ms && ms.permitted_manifestation_change_events) || [];
  rawEvents.forEach((ev, ei) => {
    const ref = 'scene1_answer_manifestation.permitted_manifestation_change_events[' + ei + ']';
    // Already reported once at the top (fatelands_manifestation_law_misapplied) when out of scope —
    // just refuse to admit the event into the timeline here, no per-event duplicate violation.
    if (!fatelandsScope) return;
    if (!ev || !ev.wielder_need || !String(ev.wielder_need).trim()) { violations.push({ rule: 'the_answer_manifestation_event_invalid', detail: ref + ' has no concrete wielder_need — a manifestation change is never valid without one' }); return; }
    if (!ev.resulting_manifestation || !ev.resulting_manifestation.manifestation_id || !ev.resulting_manifestation.form) { violations.push({ rule: 'the_answer_manifestation_event_invalid', detail: ref + ' has no complete resulting_manifestation {manifestation_id, form}' }); return; }
    if (typeof ev.after_beat !== 'number' || !Number.isInteger(ev.after_beat)) { violations.push({ rule: 'the_answer_manifestation_event_invalid', detail: ref + ' has no integer after_beat position' }); return; }
    events.push({ afterPos: ev.after_beat, manifestationId: ev.resulting_manifestation.manifestation_id, form: ev.resulting_manifestation.form, ref: ref });
  });
  events.sort((a, b) => a.afterPos - b.afterPos);
  return { current: current || null, events, violations };
}
// The manifestation active AT a given stream position (see _buildAnswerNarrativeStream for what a
// position means) — current_manifestation, superseded by the LAST valid event whose afterPos < pos.
function _activeManifestationAt(pos, timeline) {
  let active = timeline.current ? { manifestationId: timeline.current.manifestation_id, form: timeline.current.form, ref: 'scene1_answer_manifestation.current_manifestation' } : null;
  for (const ev of timeline.events) { if (ev.afterPos < pos) active = ev; else break; }
  return active;
}
// Every manifestation_id this packet has ever declared as valid (current + every structurally-valid
// event) — the closed set physical_form_claim must resolve against, REGARDLESS of position; a
// position-specific mismatch is the SEPARATE the_answer_manifestation_conflict check below.
function _knownManifestationIds(timeline) {
  const ids = new Set(['neutral_reference']);
  if (timeline.current) ids.add(timeline.current.manifestation_id);
  timeline.events.forEach(ev => ids.add(ev.manifestationId));
  return ids;
}

// Builds the ordered narrative stream for the continuity walk: scene1Candidate.beats get positions
// 1..N (their index+1), oasOpening gets 100 (after all scene1 beats — the live OAS opener), and
// postInterruptionBeat gets 101 (after that) — simple, deterministic, sufficient since
// manifestation-change events are declared in terms of scene1 beat numbers 1-20.
function _buildAnswerNarrativeStream(scene1Beats, oasOpening, postInterruptionBeat) {
  const stream = scene1Beats.map((b, i) => ({ pos: i + 1, where: 'scene1Candidate.beats[' + i + ']', text: b && b.text, objectClaims: b && b.objectClaims }));
  if (oasOpening) stream.push({ pos: 100, where: 'oasOpening', text: oasOpening.text, objectClaims: oasOpening.objectClaims });
  if (postInterruptionBeat) stream.push({ pos: 101, where: 'postInterruptionBeat', text: postInterruptionBeat.text, objectClaims: postInterruptionBeat.objectClaims });
  return stream;
}

// THE main engine. Walks the stream in order; once The Answer has entered (literal name, an
// explicit objectClaims entry, or — after entry — the widened handling-signal), every entry
// involving it MUST carry objectClaims, and any form-restating claim must match the manifestation
// ACTIVE at that entry's position (not merely a KNOWN manifestation — the right one, right now).
function _validateAnswerContinuity(stream, packet, violations) {
  const timeline = _buildAnswerManifestationTimeline(packet);
  violations.push(...timeline.violations);
  const knownIds = _knownManifestationIds(timeline);
  let hasEntered = false;
  stream.forEach(entry => {
    const text = String(entry.text || '');
    const claims = Array.isArray(entry.objectClaims) ? entry.objectClaims : (entry.objectClaims == null ? [] : null);
    if (claims === null) { violations.push({ rule: 'the_answer_claim_malformed', detail: entry.where + '.objectClaims must be an array' }); return; }
    const answerClaims = claims.filter(c => c && c.object_ref === ANSWER_OBJECT_REF);
    const namesAnswer = THE_ANSWER_RE.test(text);
    const handlingSignal = hasEntered && _answerHandlingSignal(text);
    const involvesAnswer = namesAnswer || handlingSignal || answerClaims.length > 0;
    if (!involvesAnswer) return;
    hasEntered = true;
    if (answerClaims.length === 0) {
      violations.push({ rule: 'the_answer_missing_object_metadata', detail: entry.where + ' involves The Answer (naming, physical handling, visual description, or transformation) but carries no objectClaims entry for object_ref="the_answer" — required disclosure, not optional' });
    }
    const active = _activeManifestationAt(entry.pos, timeline);
    claims.forEach((c, ci) => {
      if (!c || typeof c !== 'object') { violations.push({ rule: 'the_answer_claim_malformed', detail: entry.where + '.objectClaims[' + ci + '] is not an object' }); return; }
      const extra = Object.keys(c).filter(k => !ALLOWED_OBJECT_CLAIM_FIELDS.has(k));
      if (extra.length) violations.push({ rule: 'unapproved_output_field', detail: 'unapproved field(s) "' + extra.join(', ') + '" in ' + entry.where + '.objectClaims[' + ci + ']' });
      if (c.object_ref !== ANSWER_OBJECT_REF) { violations.push({ rule: 'unapproved_object_ref', detail: entry.where + '.objectClaims[' + ci + '].object_ref="' + c.object_ref + '" is not a recognized object — this packet tracks only "the_answer"' }); return; }
      if (!knownIds.has(c.physical_form_claim)) {
        violations.push({ rule: 'the_answer_physical_claim_invalid', detail: entry.where + '.objectClaims[' + ci + '].physical_form_claim="' + c.physical_form_claim + '" is not a manifestation this packet has ever declared (known: ' + [...knownIds].join('|') + ') — free-text form descriptions and unrecognized manifestation ids are never permitted here' });
        return;
      }
      if (c.physical_form_claim !== 'neutral_reference' && (!active || c.physical_form_claim !== active.manifestationId)) {
        violations.push({ rule: 'the_answer_manifestation_conflict', detail: entry.where + '.objectClaims[' + ci + '] claims manifestation "' + c.physical_form_claim + '" but the manifestation ACTIVE at this position is "' + (active && active.manifestationId) + '" — a manifestation change is valid only as the declared consequence of a permitted wielder-need event, never because this beat wants a different form' });
        return;
      }
      if (!PROVENANCE_KINDS.has(c.claim_kind)) {
        violations.push({ rule: 'the_answer_claim_provenance_invalid', detail: entry.where + '.objectClaims[' + ci + '].claim_kind="' + c.claim_kind + '" must be one of ' + [...PROVENANCE_KINDS].join('|') });
      } else if (c.physical_form_claim !== 'neutral_reference') {
        if (c.claim_kind !== 'locked_canon_fact') violations.push({ rule: 'the_answer_claim_provenance_invalid', detail: entry.where + '.objectClaims[' + ci + '] restates a manifestation but claim_kind is "' + c.claim_kind + '", not "locked_canon_fact" — restating a declared fact is always a citation, never a free invention' });
        else if (!c.cites) violations.push({ rule: 'the_answer_claim_provenance_invalid', detail: entry.where + '.objectClaims[' + ci + '] restates a manifestation as locked_canon_fact but has no cites' });
      }
    });
  });
}
const FIXED_TAIL_TEXTS = [
  'That is enough, Provast', // Dohkar's fixed cutoff line — the model must not write this itself
  'Agreed. A formal inquiry', // Julian's fixed claim line
];
// RESOLVING-LANGUAGE HEURISTIC (Roman, sixth pass, 2026-09-17) — a narrow, disclosed guard on
// postInterruptionBeat: it must crystallize an unresolved choice, never decide it. This cannot
// catch every way a beat could silently pre-write the player's answer (that judgment stays
// Roman's, per the human review rubric) — it catches the explicit, literal resolving phrasings
// named in the packet's hard boundary.
const RESOLVING_LANGUAGE_PATTERN = /\bI (decided|chose|answered|said (?:yes|no)|agreed to|refused|gave in|resisted|told him)\b/i;
const CARD_KEYS = ['temptation', 'silence', 'reversal', 'boundary', 'confession'];
const VARIANTS = ['amplify', 'ruin', 'redirect'];
const SCENE1_KINDS = ['narration', 'exposition', 'dialogue'];
const SCENE1_IMAGE_ORDER = ['intro_lirael', 'intro_seren', 'intro_dohkar', 'intro_julian', 'd1', 'd2', 'd3', 'd4'];
const WORD_COUNT = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

function validateDraft(draft, packet) {
  const violations = [];
  // NON-BLOCKING DIAGNOSTICS (Roman, 2026-09-20 correction): findings worth surfacing for human
  // review but that must NEVER by themselves make ok:false or block a bounded repair pass. A
  // WITHHELD historical exemplar (never rendered into the authoring prompt — see
  // attempt4_positive_exemplars) is not a copy source: a real generation resembling it is not
  // evidence of copying, only evidence that both texts are valid expressions of the SAME
  // explicitly-required canonical content (e.g. julian_opening_turn's "rescue" framing is directly
  // required by the live, rendered opening_frame_brief / oas_opening_requirement.content_requirement
  // — real Attempt 8 independently produced closely related wording for exactly that reason, not
  // because it "copied" a draft it was never shown). See diagnostics_policy at the bottom of this
  // function for the exact rule.
  const diagnostics = [];

  // DEFENSIVE FIELD-TYPE GUARD — a reject-only validator must never THROW on a malformed shape;
  // it must report the violation and continue as if the field were absent.
  function asLineArray(v, fieldName) {
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v;
    violations.push({ rule: 'wrong_field_type', detail: fieldName + ' must be an array of {speaker,text} lines, got ' + (typeof v) + (typeof v === 'string' ? ' ("' + v.slice(0, 60) + (v.length > 60 ? '...' : '') + '")' : '') });
    return [];
  }
  // oasOpening / postInterruptionBeat (Roman, sixth pass, 2026-09-17) — REPLACES
  // interrogationExchange entirely. The player is Lirael; everything between Julian's ONE
  // authored opening line and the fixed interruption tail is LIVE, never authored by this
  // operation. See oas_sequence_v3 in the packet.
  const oasOpening = (draft && draft.oasOpening && typeof draft.oasOpening === 'object' && !Array.isArray(draft.oasOpening)) ? draft.oasOpening : null;
  if (draft && draft.oasOpening !== undefined && !oasOpening) {
    violations.push({ rule: 'wrong_field_type', detail: 'oasOpening must be an object { speaker, text }, got ' + (Array.isArray(draft.oasOpening) ? 'array' : typeof draft.oasOpening) });
  }
  const postInterruptionBeat = (draft && draft.postInterruptionBeat && typeof draft.postInterruptionBeat === 'object' && !Array.isArray(draft.postInterruptionBeat)) ? draft.postInterruptionBeat : null;
  if (draft && draft.postInterruptionBeat !== undefined && !postInterruptionBeat) {
    violations.push({ rule: 'wrong_field_type', detail: 'postInterruptionBeat must be an object { speaker, image, kind, text }, got ' + (Array.isArray(draft.postInterruptionBeat) ? 'array' : typeof draft.postInterruptionBeat) });
  }
  // fateCards REMOVED (Roman, 2026-09-17) — no longer an authored field; the structural scope
  // gate below (ALLOWED_TOP_LEVEL_FIELDS) now rejects it like any other unapproved field. See
  // fate_card_lifecycle_correction in the packet.

  // scene1Candidate (Roman, fourth redesign pass, 2026-09-17) — a full candidate replacement
  // Scene 1, reviewed alongside the current baked scene, never silently substituted for it.
  const scene1 = (draft && draft.scene1Candidate && typeof draft.scene1Candidate === 'object' && !Array.isArray(draft.scene1Candidate)) ? draft.scene1Candidate : null;
  if (draft && draft.scene1Candidate !== undefined && !scene1) {
    violations.push({ rule: 'wrong_field_type', detail: 'scene1Candidate must be an object { beats }, got ' + (Array.isArray(draft.scene1Candidate) ? 'array' : typeof draft.scene1Candidate) });
  }
  const scene1Beats = scene1 ? asLineArray(scene1.beats, 'scene1Candidate.beats') : [];
  if (scene1) {
    // Beat count TIGHTENED to EXACTLY 20 (Roman, 2026-09-17, scene1_beat_number_template — was an
    // 18-22 range; Grok has now shown both failure modes: 20 beats too thin (attempt 1), 14 beats
    // richer but short (attempt 4) — a range still let the model settle short of the target).
    if (scene1Beats.length > 0 && scene1Beats.length !== 20) violations.push({ rule: 'scene1_wrong_beat_count', detail: 'scene1Candidate.beats has ' + scene1Beats.length + ' beat(s); the contract requires EXACTLY 20, per the numbered template — not a range' });
    // WORD-COUNT FLOOR (Roman, fifth pass, RAISED sixth pass, 2026-09-17) — objective, structural,
    // NOT a craft judgment, and explicitly NOT quality proof (a candidate can clear this floor
    // through padding and still fail every real craft bar below). Raised from 900 to 1,100 —
    // still a floor, not the 1,350-1,550 target, which stays a soft, human-judged aim.
    let totalWords = 0;
    if (scene1Beats.length > 0) {
      totalWords = scene1Beats.reduce((n, b) => n + (b && typeof b.text === 'string' ? b.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
      if (totalWords < 1100) violations.push({ rule: 'scene1_too_thin', detail: 'scene1Candidate totals ' + totalWords + ' words across ' + scene1Beats.length + ' beats — accepted range 1,100-1,700, target 1,350-1,550 (baked scene ~1,444); beats satisfying the COUNT target with flat one-line prose is a hard failure, not just a quality preference' });
      if (totalWords > 1700) violations.push({ rule: 'scene1_too_long_words', detail: 'scene1Candidate totals ' + totalWords + ' words — accepted range 1,100-1,700' });
    }
    // SCENE-1 COMPOSITION CONTRACT (Roman, 2026-09-17) — 3 real drafts hit the total-word floor
    // shallowly (or missed it while trending worse) by writing many short beats. A total alone
    // cannot distinguish an evenly-dramatized scene from a padded outline — these checks require
    // actual COMPOSITION, per-beat, not just a sum. See scene1_composition_contract in the packet.
    if (scene1Beats.length > 0) {
      const wc = (t) => (typeof t === 'string' ? t.trim().split(/\s+/).filter(Boolean).length : 0);
      const narrationBeats = scene1Beats.map((b, i) => ({ b, i })).filter(({ b }) => b && (b.kind === 'narration' || b.kind === 'exposition'));
      // LOWER BOUND ONLY (Roman, 2026-09-20 correction, following real Attempt 8's regression): the
      // 60-word floor exists to stop THIN, padded beats — it was never meant to force deletion of
      // good, information-dense prose. A real 99-word beat that carried unique, causally load-bearing
      // content (Seren's wish beginning to curve/misalign) was shrunk by a since-removed repair pass
      // to satisfy this band's upper bound, and the shrink replaced that content with a near-duplicate
      // of the adjacent beat — a real regression the validator's own upper bound caused. The 90-word
      // side is now a NON-BLOCKING pacing diagnostic only (below), never part of the qualifying count
      // and never a violation. TIGHTENED 55-110 -> 60-90 (Roman, 2026-09-17, following attempt 4's
      // 14-beat undershoot) — that floor stays; only the ceiling's blocking status is reversed here.
      const qualifyingNarrationBeats = narrationBeats.filter(({ b }) => wc(b.text) >= 60);
      if (qualifyingNarrationBeats.length < 12) {
        violations.push({ rule: 'scene1_insufficient_narration_density', detail: 'only ' + qualifyingNarrationBeats.length + ' of ' + narrationBeats.length + ' narration/exposition beats are at least 60 words each (need at least 12) — a few long beats cannot cover for many thin ones; this is checked PER-BEAT, independent of the total-word floor. A beat ABOVE 90 words still counts toward this floor-only requirement — see the non-blocking pacing diagnostic below for beats that run long.' });
      }
      // PACING DIAGNOSTIC — NON-BLOCKING (Roman, 2026-09-20): a narration/exposition beat over 90
      // words is flagged for human pacing review only. It NEVER affects `ok`, is NEVER a repair
      // target, and never subtracts from qualifyingNarrationBeats above — length alone is not a
      // defect; only genuine thinness is.
      narrationBeats.forEach(({ b, i }) => {
        const n = wc(b.text);
        if (n > 90) diagnostics.push({ rule: 'narration_beat_pacing_long', detail: 'scene1Candidate.beats[' + i + '] is ' + n + ' words (over the 90-word pacing guideline) — non-blocking; long, information-dense prose is not itself a defect and this never triggers repair or rejection' });
      });
      // DIALOGUE ADJACENCY: a dialogue beat may be short, but only with an adequately-long
      // narration/exposition neighbor immediately before or after it.
      scene1Beats.forEach((b, i) => {
        if (!b || b.kind !== 'dialogue') return;
        const neighbor = (j) => scene1Beats[j];
        const qualifies = (nb) => nb && (nb.kind === 'narration' || nb.kind === 'exposition') && wc(nb.text) >= 40;
        if (!qualifies(neighbor(i - 1)) && !qualifies(neighbor(i + 1))) {
          violations.push({ rule: 'scene1_dialogue_not_grounded', detail: 'scene1Candidate.beats[' + i + '] is a dialogue beat with no adjacent narration/exposition beat of at least 40 words carrying concrete action, sensory detail, or interior consequence — a dialogue beat cannot stand alone' });
        }
      });
      // NO SYNOPSIS STAND-IN: a narrow, disclosed guard against the NAMED failure shapes from
      // prose_construction_requirement.banned_construction ("X felt Y", "X stepped forward", "the
      // charge landed") when they constitute most of a SHORT beat — not every generic sentence,
      // only these literal named patterns used as a bare stand-in.
      const SYNOPSIS_STANDIN_PATTERNS = [/\b\w+\s+felt\s+\w+\.?\s*$/i, /\bstepped forward\b/i, /\bthe charge landed\b/i, /\b\w+\s+landed\.?\s*$/i];
      scene1Beats.forEach((b, i) => {
        if (!b || (b.kind !== 'narration' && b.kind !== 'exposition')) return;
        const n = wc(b.text);
        if (n > 0 && n < 20 && SYNOPSIS_STANDIN_PATTERNS.some(re => re.test(b.text))) {
          violations.push({ rule: 'scene1_synopsis_standin', detail: 'scene1Candidate.beats[' + i + '] (' + n + ' words) is a bare synopsis-style sentence standing in for a dramatic moment — see prose_construction_requirement.banned_construction' });
        }
      });
    }
    // SCENE1/OAS BOUNDARY LEAK (Roman, 2026-09-17) — scoped ONLY to scene1Candidate text; see
    // SCENE1_OAS_LEAK_PATTERNS above for why this scope matters.
    if (scene1Beats.length > 0) {
      const scene1Text = scene1Beats.map(b => (b && b.text) || '').join(' ');
      SCENE1_OAS_LEAK_PATTERNS.forEach(p => {
        if (p.re.test(scene1Text)) violations.push({ rule: 'scene1_oas_scope_leak', detail: 'scene1Candidate contains OAS-exclusive content (matched "' + p.id + '") — Julian\'s actual interrogation/accusation belongs to oasOpening and the live OAS exchange, never to scene1Candidate; Scene 1 must end at his stated INTENT to question her' });
      });
      if (packet.attempt4_positive_exemplars && _ngramOverlap(scene1Text, packet.attempt4_positive_exemplars.twist_and_arrest, 6)) {
        // NON-BLOCKING (Roman, 2026-09-20): twist_and_arrest is a WITHHELD historical exemplar,
        // never rendered into the authoring prompt — a real match is not evidence of copying a
        // source the model was never shown, only a similarity worth a human glance.
        diagnostics.push({ rule: 'exemplar_similarity', detail: 'scene1Candidate contains a 6+ word verbatim match against the withheld, non-rendered twist_and_arrest exemplar — non-blocking similarity report, not evidence of copying (the exemplar was never supplied to the model)' });
      }
    }
    // FIRST-PERSON FOCALITY GATE (Roman, sixth pass, 2026-09-17) — a narrow, disclosed
    // repeat-failure guard against the exact real failure (the first draft was third person
    // throughout), NOT a POV-quality certification. Narration/exposition beats only — dialogue
    // legitimately uses any grammatical person. Counts first-person pronouns (I/me/my/mine/
    // myself) vs. third-person-feminine-singular pronouns (she/her/hers/herself) across those
    // beats; if third-person pronouns outnumber first-person, or the model's own
    // first_person_lirael declaration contradicts the count, the draft is rejected by name.
    if (scene1Beats.length > 0) {
      const narrationText = scene1Beats.filter(b => b && (b.kind === 'narration' || b.kind === 'exposition')).map(b => b.text || '').join(' ');
      const firstPersonCount = (narrationText.match(/\b(I|me|my|mine|myself)\b/g) || []).length;
      const thirdPersonCount = (narrationText.match(/\b(she|her|hers|herself)\b/gi) || []).length;
      if (thirdPersonCount > firstPersonCount) {
        violations.push({ rule: 'scene1_not_first_person', detail: 'scene1Candidate narration/exposition beats are substantially third person (I/me/my/mine/myself=' + firstPersonCount + ' vs. she/her/hers/herself=' + thirdPersonCount + ') — this world\'s real convention is first-person Lirael, confirmed directly from the baked scene text' });
      }
      if (draft.first_person_lirael === true && thirdPersonCount > firstPersonCount) {
        violations.push({ rule: 'first_person_declaration_false', detail: 'draft.first_person_lirael is declared true but the structural pronoun count says otherwise — the declaration is not trusted on its own' });
      }
      if (draft.first_person_lirael !== undefined && typeof draft.first_person_lirael !== 'boolean') {
        violations.push({ rule: 'wrong_field_type', detail: 'first_person_lirael must be a boolean, got ' + typeof draft.first_person_lirael });
      }
    }
    // REQUIRED-BEAT COVERAGE MAP (Roman, sixth pass, 2026-09-17) — draft metadata (never reader
    // prose) mapping each of the 8 required_content_beats ids to the scene1Candidate.beats
    // index(es) that actually cover it. A missing/empty mapping is a hard failure — this is what
    // catches an omitted sacrifice statement structurally, not by trusting a generic citation.
    const requiredBeatIds = (packet.scene1_candidate_requirement && packet.scene1_candidate_requirement.required_content_beats
      ? packet.scene1_candidate_requirement.required_content_beats.beats.map(b => b.id) : []);
    const coverage = (draft && draft.scene1Coverage && typeof draft.scene1Coverage === 'object' && !Array.isArray(draft.scene1Coverage)) ? draft.scene1Coverage : null;
    if (draft && draft.scene1Coverage !== undefined && !coverage) {
      violations.push({ rule: 'wrong_field_type', detail: 'scene1Coverage must be an object keyed by the required_content_beats ids, got ' + (Array.isArray(draft.scene1Coverage) ? 'array' : typeof draft.scene1Coverage) });
    }
    if (scene1 && requiredBeatIds.length) {
      if (!coverage) {
        violations.push({ rule: 'missing_coverage_map', detail: 'scene1Coverage is required alongside scene1Candidate — required beats cannot hide behind a generic citation' });
      } else {
        requiredBeatIds.forEach(id => {
          const idxs = coverage[id];
          if (!Array.isArray(idxs) || idxs.length === 0) {
            violations.push({ rule: 'required_beat_not_covered', detail: 'required_content_beats id "' + id + '" has no covering scene1Candidate beat index in scene1Coverage' });
          } else if (idxs.some(i => typeof i !== 'number' || i < 0 || i >= scene1Beats.length)) {
            violations.push({ rule: 'coverage_index_out_of_range', detail: 'scene1Coverage["' + id + '"] references a beat index outside scene1Candidate.beats' });
          }
        });
        const extraCoverageKeys = Object.keys(coverage).filter(k => !requiredBeatIds.includes(k));
        if (extraCoverageKeys.length) violations.push({ rule: 'unapproved_output_field', detail: 'scene1Coverage has unapproved key(s) not in required_content_beats: ' + extraCoverageKeys.join(', ') });
      }
    }
    // WISH-MISALIGNMENT VISUAL GRAMMAR (Roman, 2026-09-20, real Attempt 8 finding) — mechanical
    // backstop for wish_twist_and_arrest_requirement.banned_wrong_visual_grammar /
    // _fatelands_ordinary_wish_misalignment_law.json. Scoped ONLY to the beats scene1Coverage
    // itself maps to wish_visibly_twists / twist_unnaturally_arrested / public_charge — never a
    // blanket scan of the whole scene, which could false-positive on unrelated prose. This is the
    // BACKSTOP, not the primary fix — the primary fix is the corrected packet instructions
    // themselves; this only catches convergence the instructions failed to prevent.
    if (coverage) {
      const WISH_MISALIGNMENT_ATTACK_GRAMMAR_RE = /\b(seams?|rifts?|projectiles?|beams?|scorch(?:ed|ing)?|burst(?:ing)?|blasts?|explosions?|explosive)\b|rope of light|residue/i;
      ['wish_visibly_twists', 'twist_unnaturally_arrested', 'public_charge'].forEach(id => {
        const idxs = Array.isArray(coverage[id]) ? coverage[id] : [];
        idxs.forEach(i => {
          const b = scene1Beats[i];
          if (!b || typeof b.text !== 'string') return;
          const m = b.text.match(WISH_MISALIGNMENT_ATTACK_GRAMMAR_RE);
          if (m) violations.push({ rule: 'wish_twist_wrong_visual_grammar', detail: 'scene1Candidate.beats[' + i + '] (covering required beat "' + id + '") contains attack-grammar vocabulary ("' + m[0] + '") — an ordinary Fatelands wish misalignment is a subjective/internal pull, never an external magical attack, visible rift, or damage residue (see wish_twist_and_arrest_requirement.banned_wrong_visual_grammar / _fatelands_ordinary_wish_misalignment_law.json)' });
        });
      });
    }
    // Per-beat kind/image/provenance checks
    let lastImageIdx = -1;
    // LOCKED BEAT-TO-ASSET MAPPING (Roman, 2026-09-18; re-keyed to scene1_visual_storyboard 2026-
    // 09-19) — the author cannot assign a beat to an arbitrary asset/occurrence. scene1_visual_
    // storyboard.beats is now the PRIMARY source for this lock (each entry's .occurrence is the
    // image/occurrence id) — it is the packet's authoring-facing declaration of the same locked
    // facts the real runtime renderer reads from starter-scenes.js's imageOccurrences (kept in
    // lockstep by _first_sacrifice_visual_storyboard_control.mjs). Falls back to the older
    // scene1_beat_number_template.slots[].image for any packet that predates the storyboard section
    // (backward compatibility for older fixtures) — but a packet carrying BOTH must agree, or this
    // refuses to trust either rather than silently picking one.
    const bntSlots = (packet.scene1_beat_number_template && packet.scene1_beat_number_template.slots) || [];
    const sbBeats = (packet.scene1_visual_storyboard && packet.scene1_visual_storyboard.beats) || [];
    let lockSource = null, lockLabel = null;
    if (sbBeats.length && bntSlots.length) {
      const agree = sbBeats.length === bntSlots.length && sbBeats.every((sb, i) => bntSlots[i] && sb.occurrence === bntSlots[i].image && sb.n === bntSlots[i].n);
      if (!agree) { violations.push({ rule: 'visual_storyboard_template_drift', detail: 'scene1_visual_storyboard.beats disagrees with scene1_beat_number_template.slots — the packet\'s own locked sources contradict each other; refusing to trust either for the beat-asset-mapping lock until reconciled' }); }
      else { lockSource = sbBeats.map(sb => ({ n: sb.n, image: sb.occurrence })); lockLabel = 'scene1_visual_storyboard'; }
    } else if (sbBeats.length) { lockSource = sbBeats.map(sb => ({ n: sb.n, image: sb.occurrence })); lockLabel = 'scene1_visual_storyboard'; }
    else if (bntSlots.length) { lockSource = bntSlots; lockLabel = 'scene1_beat_number_template'; }
    const lockMappingApplies = !!lockSource && scene1Beats.length === lockSource.length;
    // THE ANSWER — ADJACENT-PAIR GUARD (whole-array check, run once before the per-beat loop).
    _theAnswerAdjacentPairViolations(scene1Beats).forEach(h => {
      violations.push({ rule: 'the_answer_form_violation', detail: 'scene1Candidate.beats[' + h.i + '] and beats[' + h.j + '] together name The Answer and carry a banned physical form ("' + h.word + '") split across adjacent beats — The Answer\'s current manifestation for this scene is a staff (double-ended shaft) with a question-mark-shaped hook at each end; no manifestation-change event is permitted here (packet scene1_answer_manifestation)' });
    });
    scene1Beats.forEach((b, i) => {
      if (!b || typeof b !== 'object') { violations.push({ rule: 'scene1_beat_malformed', detail: 'scene1Candidate.beats[' + i + '] is not an object' }); return; }
      if (!SCENE1_KINDS.includes(b.kind)) violations.push({ rule: 'scene1_invalid_kind', detail: 'scene1Candidate.beats[' + i + '].kind="' + b.kind + '" must be one of ' + SCENE1_KINDS.join('|') });
      const imgIdx = SCENE1_IMAGE_ORDER.indexOf(b.image);
      if (imgIdx === -1) violations.push({ rule: 'scene1_invalid_image', detail: 'scene1Candidate.beats[' + i + '].image="' + b.image + '" is not one of the 8 existing images — no new image may be generated' });
      else if (imgIdx < lastImageIdx) violations.push({ rule: 'scene1_image_out_of_order', detail: 'scene1Candidate.beats[' + i + '].image="' + b.image + '" goes backward in the fixed 8-image sequence' });
      else lastImageIdx = imgIdx;
      if (lockMappingApplies && imgIdx !== -1 && lockSource[i] && b.image !== lockSource[i].image) {
        violations.push({ rule: 'scene1_beat_asset_mapping_locked', detail: 'scene1Candidate.beats[' + i + '].image="' + b.image + '" does not match the locked ' + lockLabel + ' beat ' + lockSource[i].n + ' (occurrence="' + lockSource[i].image + '") — the author cannot assign a beat to a different asset/occurrence' });
      }
      // THE ANSWER — backup lexical guard only (secondary); the real check is the continuity
      // engine run once below, after this loop, over the full ordered stream.
      { const _taHit = _theAnswerFormViolation(b.text);
        if (_taHit) violations.push({ rule: 'the_answer_form_violation', detail: 'scene1Candidate.beats[' + i + '] mentions The Answer alongside a banned physical form ("' + _taHit + '") — The Answer\'s current manifestation for this scene is a staff (double-ended shaft) with a question-mark-shaped hook at each end; no manifestation-change event is permitted here (packet scene1_answer_manifestation)' }); }
      // PROVENANCE PROPORTIONALITY (Roman, fifth pass, 2026-09-17): "keep provenance
      // proportional: only locked factual assertions need citations; dialogue, imagery,
      // interiority, and other generated_expression beats must not be rejected for being
      // original." Three-tier discipline, deliberately asymmetric:
      //   locked_canon_fact    -> REQUIRES a citation (cites) into this packet's own sections.
      //   grounded_inference   -> REQUIRES named grounds (cites a facet/constraint it draws
      //                           from) — lighter than a full citation, but still named, not bare.
      //   generated_expression -> REQUIRES NOTHING. No citation, no named grounds, never
      //                           rejected for lacking either — this is the default, unconstrained
      //                           home for original dialogue, description, rhythm, interiority.
      //                           Do not let per-beat provenance turn into a ban on prose.
      if (b.provenance && b.provenance.kind === 'locked_canon_fact' && !b.provenance.cites) {
        violations.push({ rule: 'unsupported_historical_claim', detail: 'scene1Candidate.beats[' + i + '] declares locked_canon_fact with no citation' });
      }
      if (b.provenance && b.provenance.kind === 'grounded_inference' && !b.provenance.cites) {
        violations.push({ rule: 'missing_named_grounds', detail: 'scene1Candidate.beats[' + i + '] declares grounded_inference with no named grounds (cites) — must name the facet/constraint it draws from' });
      }
      // generated_expression: deliberately NO check here. Never rejected for lacking a citation.
    });
  }

  // 1. Contradictions
  const oasOpeningText = (oasOpening && typeof oasOpening.text === 'string') ? oasOpening.text : '';
  const postInterruptionText = (postInterruptionBeat && typeof postInterruptionBeat.text === 'string') ? postInterruptionBeat.text : '';
  const allText = [
    oasOpeningText, postInterruptionText,
    ...scene1Beats.map(b => (b && b.text) || ''),
  ].join(' \n ');
  CONTRADICTION_PATTERNS.forEach(p => { if (p.re.test(allText)) violations.push({ rule: 'contradiction', detail: p.why }); });

  // 2. Sealed-fact leakage + premature Inquiry (same pattern set — inquiry_not_opened lives here too)
  SEALED_PATTERNS.forEach(p => { if (p.re.test(allText)) violations.push({ rule: p.id === 'inquiry_not_opened' ? 'premature_inquiry' : 'sealed_fact_leakage', detail: 'matched forbidden pattern for ' + p.id }); });

  // 3. Binary Run/Stay framing anywhere in text
  if (RUN_STAY_PATTERN.test(allText)) violations.push({ rule: 'binary_run_stay_control', detail: 'text matches a run-vs-remain/stay binary framing' });

  // 4. oasOpening / postInterruptionBeat must not duplicate/pre-empt the fixed tail
  FIXED_TAIL_TEXTS.forEach(fragment => {
    if (oasOpeningText.indexOf(fragment) !== -1) violations.push({ rule: 'fixed_tail_duplicated', detail: 'oasOpening contains text belonging to the FIXED tail ("' + fragment + '...")' });
    if (postInterruptionText.indexOf(fragment) !== -1) violations.push({ rule: 'fixed_tail_duplicated', detail: 'postInterruptionBeat contains text belonging to the FIXED tail ("' + fragment + '...") — it comes AFTER the tail, never re-narrates it' });
  });

  // 5. oasOpening — exactly one authored TURN, Julian only. SUPERSEDED (Roman, 2026-09-17): the
  // prior ≤14-word constraint (real live opener's own constraint, app.js:184458) never structurally
  // applied to this AUTHORED bypass path — a real rejected 9-word draft ("You shaped her wish
  // through your own unspoken desire") had no room for observed behavior + a real question +
  // subtext together. Range is now 35-80 words.
  if (oasOpening) {
    if (oasOpening.speaker !== 'Julian') violations.push({ rule: 'oas_opening_wrong_speaker', detail: 'oasOpening.speaker must be exactly "Julian", got "' + oasOpening.speaker + '"' });
    if (typeof oasOpening.text !== 'string' || !oasOpening.text.trim()) violations.push({ rule: 'oas_opening_empty', detail: 'oasOpening.text is missing or empty' });
    else {
      const oaWords = WORD_COUNT(oasOpening.text);
      if (oaWords < 35) violations.push({ rule: 'oas_opening_too_short', detail: 'oasOpening.text is ' + oaWords + ' words, must be 35-80 — a blunt short accusation (the real rejected example was 9 words) has no room for observed behavior, a real question, and subtext together' });
      if (oaWords > 80) violations.push({ rule: 'oas_opening_too_long', detail: 'oasOpening.text is ' + oaWords + ' words, must be 35-80' });
      if (packet.attempt4_positive_exemplars && _ngramOverlap(oasOpening.text, packet.attempt4_positive_exemplars.julian_opening_turn, 6)) {
        // NON-BLOCKING (Roman, 2026-09-20, following real Attempt 8): julian_opening_turn is a
        // WITHHELD historical exemplar, never rendered into the authoring prompt. A real match
        // (e.g. "hoping I would step forward and...") is not evidence of copying a hidden source —
        // it is the direct, expected consequence of oas_sequence_v3.fixed_baked_content's OWN
        // rendered opening_frame_brief ("asks whether she called to him hoping he would rescue
        // her") and oas_opening_requirement.content_requirement ("the rescue question"), both of
        // which explicitly require this exact framing and ARE supplied to the model every time.
        // The exemplar and any real generation are both downstream expressions of that SAME
        // rendered, canonical requirement — resemblance between them is expected, not illicit.
        diagnostics.push({ rule: 'exemplar_similarity', detail: 'oasOpening contains a 6+ word verbatim match against the withheld, non-rendered julian_opening_turn exemplar — non-blocking similarity report, not evidence of copying (the exemplar was never supplied to the model; the matched framing is independently required by the rendered opening_frame_brief / oas_opening_requirement.content_requirement)' });
      }
      const _taHitOas = _theAnswerFormViolation(oasOpening.text);
      if (_taHitOas) violations.push({ rule: 'the_answer_form_violation', detail: 'oasOpening.text mentions The Answer alongside a banned physical form ("' + _taHitOas + '") — The Answer\'s current manifestation for this scene is a staff (double-ended shaft) with a question-mark-shaped hook at each end; no manifestation-change event is permitted here (packet scene1_answer_manifestation)' });
    }
  }

  // 6. postInterruptionBeat — one beat, final image, first person, never resolving the player's choice
  if (postInterruptionBeat) {
    if (postInterruptionBeat.image !== 'd4') violations.push({ rule: 'post_interruption_wrong_image', detail: 'postInterruptionBeat.image must be "d4" (the scene\'s final image), got "' + postInterruptionBeat.image + '"' });
    if (!['narration', 'dialogue'].includes(postInterruptionBeat.kind)) violations.push({ rule: 'post_interruption_invalid_kind', detail: 'postInterruptionBeat.kind must be narration|dialogue, got "' + postInterruptionBeat.kind + '"' });
    if (postInterruptionBeat.speaker !== null && postInterruptionBeat.speaker !== 'Lirael') violations.push({ rule: 'post_interruption_wrong_speaker', detail: 'postInterruptionBeat.speaker must be null or "Lirael", got "' + postInterruptionBeat.speaker + '"' });
    if (typeof postInterruptionBeat.text !== 'string' || !postInterruptionBeat.text.trim()) violations.push({ rule: 'post_interruption_empty', detail: 'postInterruptionBeat.text is missing or empty' });
    else {
      if (RESOLVING_LANGUAGE_PATTERN.test(postInterruptionBeat.text)) violations.push({ rule: 'post_interruption_resolves_choice', detail: 'postInterruptionBeat.text contains resolving language ("' + (postInterruptionBeat.text.match(RESOLVING_LANGUAGE_PATTERN) || [''])[0] + '") — this beat must crystallize the unresolved choice, never decide it for the player' });
      const _taHitPib = _theAnswerFormViolation(postInterruptionBeat.text);
      if (_taHitPib) violations.push({ rule: 'the_answer_form_violation', detail: 'postInterruptionBeat.text mentions The Answer alongside a banned physical form ("' + _taHitPib + '") — The Answer\'s current manifestation for this scene is a staff (double-ended shaft) with a question-mark-shaped hook at each end; no manifestation-change event is permitted here (packet scene1_answer_manifestation)' });
    }
  }

  // THE ANSWER — STATEFUL MANIFESTATION CONTINUITY (Roman, 2026-09-20): the real, primary check —
  // run ONCE over the full ordered narrative stream (scene1 beats, then oasOpening, then
  // postInterruptionBeat) so a manifestation established in one beat is verified consistent (or
  // validly changed) through every later beat/field, not checked independently per field.
  if (scene1) {
    _validateAnswerContinuity(_buildAnswerNarrativeStream(scene1Beats, oasOpening, postInterruptionBeat), packet, violations);
  }

  // fateCards validation REMOVED (Roman, 2026-09-17) — no longer an authored field. The 5 fixed
  // archetypes are dealt live by the real app mechanism (generateIntimateFatePreviewsBatch) after
  // each OAS exchange, never pre-authored by this packet. A fateCards field appearing in a draft
  // now falls through to the structural scope gate below, like any other unapproved field.

  // 7. STRUCTURAL SCOPE GATE — schema-based, NOT lexical. Reject any field not on the allowlisted
  // output schema; never scan prose text for phrases like "Scene 2". The allowlist below is the
  // single source of truth this validator, the adapter's own output request, and any future
  // consumer must all agree on.
  const ALLOWED_TOP_LEVEL_FIELDS = new Set(['scene1Candidate', 'scene1Coverage', 'first_person_lirael', 'oasOpening', 'postInterruptionBeat']);
  const ALLOWED_SCENE1_FIELDS = new Set(['beats']);
  const ALLOWED_SCENE1_BEAT_FIELDS = new Set(['kind', 'speaker', 'image', 'text', 'provenance', 'objectClaims']);
  const ALLOWED_OAS_OPENING_FIELDS = new Set(['speaker', 'text', 'objectClaims']);
  const ALLOWED_POST_INTERRUPTION_FIELDS = new Set(['speaker', 'image', 'kind', 'text', 'objectClaims']);

  function checkAllowlist(obj, allowed, where) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(k => {
      if (!allowed.has(k)) violations.push({ rule: 'unapproved_output_field', detail: 'unapproved structural field "' + k + '" in ' + where + ' — not part of the allowlisted output schema' });
    });
  }
  checkAllowlist(draft, ALLOWED_TOP_LEVEL_FIELDS, 'draft (top level)');
  checkAllowlist(oasOpening, ALLOWED_OAS_OPENING_FIELDS, 'oasOpening');
  checkAllowlist(postInterruptionBeat, ALLOWED_POST_INTERRUPTION_FIELDS, 'postInterruptionBeat');
  if (scene1) {
    checkAllowlist(scene1, ALLOWED_SCENE1_FIELDS, 'scene1Candidate');
    scene1Beats.forEach((b, i) => checkAllowlist(b, ALLOWED_SCENE1_BEAT_FIELDS, 'scene1Candidate.beats[' + i + ']'));
  }

  // diagnostics_policy: diagnostics NEVER affect `ok` and are never a repair-blocking violation —
  // they are a non-blocking similarity report for human review only (Roman, 2026-09-20).
  return { ok: violations.length === 0, violations, diagnostics };
}

// ── A genuinely compliant scene1Candidate — 18 beats, walking the 8 fixed images in order,
// grounded in the packet's own causal sequence/C+ facets, each beat cited. ──
function compliantScene1() {
  // Each beat text is deliberately a full ~55-word paragraph (not a flat one-liner) so this
  // fixture itself demonstrates the density this session's fifth-pass correction requires —
  // totals just over the validator's 900-word floor. Still a structural test fixture, not real
  // prose craft; the validator cannot and does not judge quality, only presence/shape/density.
  const mk = (kind, speaker, image, text, prov, objectClaims) => { const o = { kind, speaker, image, text, provenance: prov || { kind: 'generated_expression' } }; if (objectClaims) o.objectClaims = objectClaims; return o; };
  return {
    beats: [
      mk('narration', null, 'intro_lirael', 'Dawn in the clearing, and I stood in the sash, the mouth-band tied close, the weight of being the responsible Sacrificiant settling into my shoulders for the first time. Every eye in the assembly already knew what I did not yet feel steady enough to trust: that today was mine to carry, mine to be measured against, whether I wanted the measuring or not.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.Lirael' }),
      mk('exposition', null, 'intro_lirael', 'I knew the procedure better than I had ever performed it, and the gap between knowing the steps and standing inside them was where the fear actually lived — not in the rite itself but in the certainty that everyone present would see exactly which parts I still had to fake, the way a crowd always seems to know before you do.', { kind: 'grounded_inference', cites: 'pc_untested_brilliance' }),
      mk('narration', null, 'intro_seren', 'Seren knelt before me in her rehearsed composure, coral Weave-Script steady and bright along her arms, every part of her aligned toward the same true thing. She was sixteen this season and had wanted this morning, this exact morning, more openly than I had ever let myself want anything, and I envied her that plainness even as I stood there responsible for keeping it safe.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.Seren' }),
      mk('dialogue', 'Seren', 'intro_seren', '"I know it by heart," she whispered up at me, before the presiding Dohkar could even begin the invocation, and something in her certainty made me believe, for one unguarded moment, that we were both about to be safe, that this morning would go exactly the way we had rehearsed it a dozen times in the quiet after lessons.', { kind: 'grounded_inference', cites: 'seren_trained_composure' }),
      mk('narration', null, 'intro_dohkar', 'The presiding Dohkar held the rite to its fixed order, unmoved by anything but procedure, the kind of stillness that comes from a man who has said these words so many times he has stopped hearing them, and who makes every child\'s rite a lesson about himself instead. I had watched him do it to other Sacrificiants before me and had promised myself I would not give him the opening.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.the_presiding_Dohkar' }),
      mk('dialogue', 'the presiding Dohkar', 'intro_dohkar', '"The cost first," he said, to Seren and to the whole clearing, and Seren named her offering aloud exactly as she had rehearsed it — her earliest memory, the one thing she could not get back and could not fake giving up in front of all these witnesses, her voice steady in a way I envied and did not trust myself to match if it had been my own memory on the line.', { kind: 'generated_expression' }),
      mk('narration', null, 'intro_julian', 'At the edge of the gathering, apart from Seren\'s family and guests, a man stood too still to be merely watching. Julian. The Provast, the office my own father had held before him, present only as an observer, and somehow already observing only me, in a way that made the whole crowded clearing feel, for one unwanted heartbeat, like it had narrowed down to just the two of us.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.Julian' }),
      mk('exposition', null, 'intro_julian', 'He never crossed a floor first, had let rooms come to him for twenty years and called it patience, and I — who cannot stand at the edge of anything without my whole face announcing it — could not stop my attention finding him anyway, long before I understood why, and long before I was ready to admit that I had noticed him noticing me right back.', { kind: 'grounded_inference', cites: 'julian_status_without_display' }),
      mk('narration', null, 'd1', 'Seren began the invocation, and for the space of three words I let myself believe I was not afraid, that the morning would simply be what it was supposed to be: a child\'s rehearsed wish, spoken cleanly, and nothing more complicated than that.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.1' }),
      mk('dialogue', 'Seren', 'd1', '"So that Lirael may find the one she lost," she said, abandoning the practiced wish entirely, spending her one First Sacrifice on me instead of herself, in front of everyone who had come to watch her, not me.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.1' }),
      mk('narration', null, 'd2', 'The words bent the instant they left her — not a wrong note but a loose one, care performed for the assembly\'s witness over the desire she actually held, and I knew it the way I know my own face: this was never truly for me, it was for every person watching her be good, watching her be seen being good, which was somehow the truer wish underneath the one she said aloud.', { kind: 'grounded_inference', cites: 'seren_goodness_needs_witness' }),
      mk('narration', null, 'd2', 'Then the loose word found purchase. The deep-crimson spiralgrass beneath my bare feet convulsed once, hard, a ripple running the width of the clearing toward me like something under the ground had just been asked a question it meant to answer badly — a wish with teeth, closing, and every part of me understood before my mind caught up that it was closing on me.', { kind: 'generated_expression' }),
      mk('narration', null, 'd2', 'It should have reached me. I had already begun bracing for whatever a wrongly-spent First Sacrifice does to the person it lands on — and then it was simply gone, cut off mid-motion the way a held breath stops when someone else decides you may exhale. Nothing marked me. Nothing cried out. The spiralgrass went still under my feet. My own Weave-Script, which had been a heartbeat from telling the whole clearing exactly what I felt, dimmed instead, and I had no way to account for why, or for whose hand had reached in ahead of mine.', { kind: 'generated_expression' }),
      mk('narration', null, 'd2', 'I was sealed, forbidden to interfere, and I understood exactly how it would look before I ever moved, understood it the way you understand a fall while you are still only leaning — and I tore the band from my mouth and went to her anyway, because standing still felt like the one thing I truly could not survive doing.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.2' }),
      mk('dialogue', 'Lirael', 'd3', '"Seren —" The first word I had spoken aloud since the sash went on, and it was already too late to be anything but evidence against me, evidence I had handed them myself, freely, with my own torn band still hanging from my hand.', { kind: 'generated_expression' }),
      mk('narration', null, 'd3', 'Two dozen faces turned to me at once — not merely at the torn band and the step I had taken, but at the spiralgrass gone unnaturally still where it should have kept moving, reading in that stillness exactly the shape of an interferer they had not yet been told to look for, as though the clearing itself had already decided the shape of the story before I had said a single word in my own defense.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.3' }),
      mk('dialogue', 'the presiding Dohkar', 'd3', '"The wish was shaped for the Sacrificiant\'s own benefit," he said, to the clearing and not to me, each word placed like a stone he had been carrying since before I ever tore the band from my mouth. "She broke her seal. She interfered in her own ward\'s rite. Both charges stand."', { kind: 'grounded_inference', cites: 'scene1_causal_sequence.3' }),
      mk('narration', null, 'd4', 'Seren\'s mother was already moving toward her, but her eyes had found me first, and there was nothing kind left in them. Two of the family\'s guests drew back half a step, the specific half-step people make around something they have decided might be catching, and I understood in that one motion that I was no longer merely a Sacrificiant under charge — I was a threat this family would carry home and repeat at every table for a season.', { kind: 'grounded_inference', cites: 'social_fallout_family_reaction' }),
      mk('narration', null, 'd4', 'Julian moved without hurry, coming in from the edge the way rooms only make space for someone they have already decided outranks them, and the presiding Dohkar\'s own Weave-Script went a flat, hard color at watching it happen in front of him, a color I recognized because I had seen it on my own arms more than once, in rooms where someone else had just quietly taken the floor from me.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.4' }),
      mk('dialogue', 'Julian', 'd4', '"I can hear where she is aligned," he said, to all of them and to me, and drew out The Answer, closing my fingers around it with his own, the scarred wrist pressed for one deliberate second against my palm before he told me plainly, in front of everyone, that he meant to question me himself, here, now, and that whatever answer I gave would be judged by every person still watching us.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.4' },
        [{ object_ref: 'the_answer', physical_form_claim: 'neutral_reference', claim_kind: 'generated_expression' }]),
    ],
  };
}

// ── A genuinely compliant draft shape, for the green control ──────────────────────────────────
function compliantDraft() {
  return {
    scene1Candidate: compliantScene1(),
    first_person_lirael: true,
    scene1Coverage: {
      ceremony_setting: [0],
      seren_kneeling_rehearsed: [2, 3],
      cost_offering_statement: [5],
      julian_introduced: [6, 7],
      invocation_begins: [8],
      wish_and_sacrifice: [9, 10],
      wish_visibly_twists: [11],
      twist_unnaturally_arrested: [12],
      public_charge: [15, 16],
      social_fallout_family_reaction: [17],
      julian_claims_the_answer: [18, 19],
    },
    oasOpening: { speaker: 'Julian', text: '"You watched Seren the entire time she spoke, and your hand moved to the band at your mouth before the wish even finished bending — did you feel it reaching for you, or did some part of you call it there yourself, the way you draw every eye in every room you enter without ever once asking to?"' },
    postInterruptionBeat: { speaker: null, image: 'd4', kind: 'narration', text: 'The Answer sat heavy in my palms, still not mine, and the formal Inquiry Julian had just claimed hung over both of us, unopened and unanswered.',
      objectClaims: [{ object_ref: 'the_answer', physical_form_claim: 'neutral_reference', claim_kind: 'generated_expression' }] },
    // fateCards deliberately absent (Roman, 2026-09-17) — no longer an authored field.
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
section('GREEN CONTROL — a genuinely compliant draft shape passes cleanly');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const v = validateDraft(compliantDraft(), PACKET);
  ok('compliant draft passes with zero violations', v.ok === true, JSON.stringify(v.violations));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('RED CONTROLS — scene1Candidate (fourth redesign pass, 2026-09-17)');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const d = compliantDraft(); d.scene1Candidate.beats = d.scene1Candidate.beats.slice(0, 5);
  const v = validateDraft(d, PACKET);
  ok('RED: a 5-beat scene1Candidate (far short of the exact-20 target) is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_wrong_beat_count'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  const extra = Array.from({ length: 10 }, (_, i) => ({ kind: 'narration', speaker: null, image: 'd4', text: 'Padding beat number ' + i + ' to push the count past the exact-20 target.', provenance: { kind: 'generated_expression' } }));
  d.scene1Candidate.beats = d.scene1Candidate.beats.concat(extra);
  const v = validateDraft(d, PACKET);
  ok('RED: an oversized scene1Candidate (30 beats) is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_wrong_beat_count'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Candidate.beats = d.scene1Candidate.beats.slice(0, 14); // the exact real v7-attempt-4 shape
  const v = validateDraft(d, PACKET);
  ok('RED: 14 beats (the real v7-attempt-4 undershoot) is rejected — not "close enough" to 20', !v.ok && v.violations.some(x => x.rule === 'scene1_wrong_beat_count'), JSON.stringify(v.violations));
}
{
  // Reproduces the exact real failure mode (2026-09-17): beat-COUNT target satisfied (18, inside
  // 16-24 tolerance) with flat one-line beats — 232 real words. Must now be rejected on density.
  const d = compliantDraft();
  d.scene1Candidate.beats = d.scene1Candidate.beats.map(b => ({ ...b, text: b.text.split(/\s+/).slice(0, 8).join(' ') + '.' }));
  const v = validateDraft(d, PACKET);
  ok('RED: 18 beats of flat one-line text (232-word-scale, the real 2026-09-17 failure) is rejected on density', !v.ok && v.violations.some(x => x.rule === 'scene1_too_thin'), JSON.stringify(v.violations));
}
{
  // Roman's explicit named scenario, matching the real v7-attempt-1 shape exactly: the right beat
  // COUNT (20, inside the now-18-22 tolerance) but averaging only ~25 words/beat (~500 total) —
  // real drafts hit this exact shape 3 times. Must be rejected on BOTH the total floor AND the new
  // per-beat narration-density check independently.
  const d = compliantDraft();
  d.scene1Candidate.beats = d.scene1Candidate.beats.map(b => ({ ...b, text: b.text.split(/\s+/).slice(0, 25).join(' ') + '.' }));
  const v = validateDraft(d, PACKET);
  const totalWords = d.scene1Candidate.beats.reduce((n, b) => n + b.text.trim().split(/\s+/).filter(Boolean).length, 0);
  ok('RED: 20 compliant-count beats averaging ~25 words (the real recurring shape across all 3 rejected drafts) is rejected on both the total floor and the per-beat narration-density check', !v.ok && v.violations.some(x => x.rule === 'scene1_too_thin') && v.violations.some(x => x.rule === 'scene1_insufficient_narration_density'), 'totalWords=' + totalWords + ' violations=' + JSON.stringify(v.violations));
}
{
  // REGRESSION FIXTURE (Roman, 2026-09-20): real Attempt 8's beat 10, in the model's own original
  // words — 99 words, over the (now non-blocking) 90-word pacing guideline, carrying real, unique,
  // causally load-bearing content (Seren's wish beginning to curve/misalign toward Lirael) found
  // nowhere else in the scene. A since-removed shrink-to-midpoint repair pass rewrote this exact
  // beat down to fit the old hard ceiling and, in doing so, replaced this content with a near-
  // duplicate of the preceding beat — a real, disclosed regression. This beat must now be ACCEPTED
  // as-is: no violation, no repair target, a non-blocking pacing diagnostic only.
  const REAL_ATTEMPT8_BEAT10_TEXT = 'Then the rhythm of her voice changed by a single beat. The sentence she was meant to finish curved instead toward me, and I felt the misalignment arrive the way a rider feels a horse decide to leave the path. Her gaze lifted to mine and held it with the same careful softness she had practiced, yet the words that followed carried the shape of an audience she needed to witness her goodness rather than the private desire she had rehearsed for herself alone. I recognized the gap between the two in the same instant the rite felt it.';
  const d = compliantDraft();
  const targetIdx = d.scene1Candidate.beats.findIndex(b => b.kind === 'narration' || b.kind === 'exposition');
  d.scene1Candidate.beats[targetIdx] = { ...d.scene1Candidate.beats[targetIdx], text: REAL_ATTEMPT8_BEAT10_TEXT };
  const realBeatWords = REAL_ATTEMPT8_BEAT10_TEXT.trim().split(/\s+/).filter(Boolean).length;
  const v = validateDraft(d, PACKET);
  ok('the real Attempt 8 fixture text is genuinely 99 words (over the 90-word guideline) — real arithmetic, not a placeholder', realBeatWords === 99, 'got ' + realBeatWords);
  ok('REGRESSION FIXTURE: an information-dense 99-word narration beat that uniquely advances its assigned function is ACCEPTED — no scene1_insufficient_narration_density violation caused by its length alone, draft otherwise still ok', v.ok && !v.violations.some(x => x.rule === 'scene1_insufficient_narration_density'), JSON.stringify(v.violations));
  ok('REGRESSION FIXTURE: the beat is reported as a non-blocking narration_beat_pacing_long DIAGNOSTIC only — never a violation, never affecting ok', v.diagnostics.some(x => x.rule === 'narration_beat_pacing_long' && x.detail.includes('beats[' + targetIdx + ']') && x.detail.includes('99 words')));
}
{
  // Roman's explicit named scenario: reproduces v7 attempt 5's EXACT real shape — the numbered
  // template's beat COUNT worked (exactly 20), but density still failed: 1,035 words total (65
  // short of the 1,100 floor), only 7 of 16 narration/exposition beats in the 60-90 qualifying
  // range. Real per-beat word counts and kinds from the actual rejected draft
  // (_first_sacrifice_draft_v7_attempt5_full_package/02_draft.json), not invented.
  const ATTEMPT5_REAL_SHAPE = [
    ['narration', 83], ['exposition', 60], ['narration', 65], ['exposition', 49],
    ['dialogue', 5], ['narration', 59], ['exposition', 67], ['narration', 49],
    ['narration', 53], ['exposition', 49], ['dialogue', 27], ['narration', 66],
    ['narration', 76], ['exposition', 56], ['dialogue', 23], ['narration', 56],
    ['exposition', 61], ['dialogue', 26], ['narration', 51], ['exposition', 54],
  ];
  const IMAGES_20 = ['intro_lirael', 'intro_lirael', 'intro_seren', 'intro_seren', 'intro_dohkar', 'intro_dohkar', 'intro_julian', 'intro_julian', 'd1', 'd1', 'd2', 'd2', 'd2', 'd2', 'd3', 'd3', 'd3', 'd4', 'd4', 'd4'];
  const mkWords = (n) => Array.from({ length: n }, (_, i) => 'word' + i).join(' ') + '.';
  const d = compliantDraft();
  d.scene1Candidate.beats = ATTEMPT5_REAL_SHAPE.map(([kind, n], i) => ({
    kind, speaker: kind === 'dialogue' ? (i % 2 ? 'Julian' : 'Seren') : null, image: IMAGES_20[i],
    text: mkWords(n), provenance: { kind: 'generated_expression' },
  }));
  const v = validateDraft(d, PACKET);
  const totalWords = d.scene1Candidate.beats.reduce((n, b) => n + b.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const thinViolation = v.violations.find(x => x.rule === 'scene1_too_thin');
  const densityViolation = v.violations.find(x => x.rule === 'scene1_insufficient_narration_density');
  ok('RED: the exact real v7-attempt-5 shape (20 beats, 1,035 words, only 7/16 qualifying narration beats) is rejected on both the total floor and the per-beat density check',
    !v.ok && totalWords === 1035 && !!thinViolation && !!densityViolation && /only 7 of 16/.test(densityViolation.detail),
    'totalWords=' + totalWords + ' violations=' + JSON.stringify(v.violations));
}
{
  const goodResult = validateDraft(compliantDraft(), PACKET);
  ok('GREEN: the fixture\'s own ~1,100-word, full-paragraph, first-person scene1Candidate passes every density/POV/coverage gate', goodResult.ok, JSON.stringify(goodResult.violations));
}
{
  // Reproduces the OTHER real failure mode (2026-09-17): the actual failed draft was written
  // entirely in third person ("Lirael stood", "she knelt") despite the world's real convention
  // (confirmed from the baked text) being first person.
  const d = compliantDraft();
  d.scene1Candidate.beats = d.scene1Candidate.beats.map(b => (b.kind === 'dialogue' ? b : {
    ...b, text: b.text.replace(/\bI\b/g, 'Lirael').replace(/\bmy\b/gi, 'her').replace(/\bme\b/gi, 'her').replace(/\bmyself\b/gi, 'herself'),
  }));
  const v = validateDraft(d, PACKET);
  ok('RED: a scene1Candidate narrated substantially in third person (the real 2026-09-17 failure) is rejected by the focality gate', !v.ok && v.violations.some(x => x.rule === 'scene1_not_first_person'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.first_person_lirael = true; // declared true...
  d.scene1Candidate.beats = d.scene1Candidate.beats.map(b => (b.kind === 'dialogue' ? b : {
    ...b, text: b.text.replace(/\bI\b/g, 'Lirael').replace(/\bmy\b/gi, 'her').replace(/\bme\b/gi, 'her').replace(/\bmyself\b/gi, 'herself'),
  })); // ...while the actual prose is third person
  const v = validateDraft(d, PACKET);
  ok('RED: a false first_person_lirael declaration (true, contradicted by the pronoun count) is rejected, not trusted on its own', !v.ok && v.violations.some(x => x.rule === 'first_person_declaration_false'), JSON.stringify(v.violations));
}
{
  // Reproduces the specific omission Roman found in the real draft: the cost/offering statement
  // beat was skipped entirely. Removing its coverage-map entry (even though the packet's other
  // required beats are still covered) must be rejected — a generic citation elsewhere cannot
  // stand in for actually covering this specific required beat.
  const d = compliantDraft();
  delete d.scene1Coverage.cost_offering_statement;
  const v = validateDraft(d, PACKET);
  ok('RED: an omitted required beat (the real missing sacrifice/cost statement) is rejected via the coverage map', !v.ok && v.violations.some(x => x.rule === 'required_beat_not_covered' && /cost_offering_statement/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Coverage.wish_and_sacrifice = []; // present key, but empty — no beat actually covers it
  const v = validateDraft(d, PACKET);
  ok('RED: an empty coverage array for a required beat (claimed but not actually covered) is rejected', !v.ok && v.violations.some(x => x.rule === 'required_beat_not_covered' && /wish_and_sacrifice/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Coverage.cost_offering_statement = [99]; // out-of-range beat index
  const v = validateDraft(d, PACKET);
  ok('RED: a coverage entry pointing at a beat index that does not exist is rejected', !v.ok && v.violations.some(x => x.rule === 'coverage_index_out_of_range'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  delete d.scene1Coverage;
  const v = validateDraft(d, PACKET);
  ok('RED: scene1Coverage entirely missing (no coverage claim at all) is rejected', !v.ok && v.violations.some(x => x.rule === 'missing_coverage_map'), JSON.stringify(v.violations));
}
// ── SEVENTH PASS (Roman, 2026-09-17): the wish must visibly twist and then be inexplicably
// arrested — reproducing the real rejected failure mode ("everyone looked at Lirael" with no
// concrete twist, no unexplained arrest) as coverage-map omissions, plus the new sealed-fact
// leak where the arrest gets attributed to Julian by name. ──
{
  const d = compliantDraft();
  delete d.scene1Coverage.wish_visibly_twists;
  const v = validateDraft(d, PACKET);
  ok('RED: an omitted concrete twist (the real "everyone looked at her" vague-consequence failure) is rejected via the coverage map', !v.ok && v.violations.some(x => x.rule === 'required_beat_not_covered' && /wish_visibly_twists/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  delete d.scene1Coverage.twist_unnaturally_arrested;
  const v = validateDraft(d, PACKET);
  ok('RED: an omitted unexplained arrest is rejected via the coverage map', !v.ok && v.violations.some(x => x.rule === 'required_beat_not_covered' && /twist_unnaturally_arrested/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Candidate.beats[12].text = 'It should have reached me — and then Julian stopped it, though I did not yet understand how.';
  const v = validateDraft(d, PACKET);
  ok('RED: attributing the arrest to Julian by name (exposing what should stay genuinely unexplained) is rejected as a sealed-fact leak', !v.ok && v.violations.some(x => x.rule === 'sealed_fact_leakage'), JSON.stringify(v.violations));
}
// ── WISH-MISALIGNMENT VISUAL GRAMMAR (Roman, 2026-09-20, real Attempt 8 finding): an ordinary
// Fatelands wish misalignment must read as a subjective/internal pull, never an external magical
// attack. Mechanical backstop scoped ONLY to the wish_visibly_twists/twist_unnaturally_arrested/
// public_charge-covering beats. ──
{
  const d = compliantDraft();
  d.scene1Candidate.beats[11].text = 'A dark seam tore open above Seren\'s head and stretched toward my chest, a thin rope of light aimed directly at me, closing the distance fast.';
  const v = validateDraft(d, PACKET);
  ok('RED: a wish_visibly_twists beat depicting a dark seam/rope-of-light attack is rejected (attack-grammar vocabulary)', !v.ok && v.violations.some(x => x.rule === 'wish_twist_wrong_visual_grammar'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Candidate.beats[12].text = 'The seam stopped three handspans from my chest, leaving a faint scorch mark on the grass where it had been.';
  const v = validateDraft(d, PACKET);
  ok('RED: a twist_unnaturally_arrested beat citing a scorch mark left behind is rejected', !v.ok && v.violations.some(x => x.rule === 'wish_twist_wrong_visual_grammar'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Candidate.beats[16].text = d.scene1Candidate.beats[16].text.replace('Both charges stand.', 'The residue on the grass stands as witness.');
  const v = validateDraft(d, PACKET);
  ok('RED: a public_charge beat citing physical residue as evidence is rejected', !v.ok && v.violations.some(x => x.rule === 'wish_twist_wrong_visual_grammar'), JSON.stringify(v.violations));
}
{
  // Scope discipline: the SAME banned word appearing OUTSIDE the 3 mapped beats must never trigger
  // this rule — it is scoped to real coverage-mapped indices, not a blanket scene-wide scan.
  const d = compliantDraft();
  d.scene1Candidate.beats[0].text = d.scene1Candidate.beats[0].text + ' A burst of birdsong crossed the clearing.';
  const v = validateDraft(d, PACKET);
  ok('GREEN (scope discipline): a banned word appearing in an UNRELATED beat (not covering wish_visibly_twists/twist_unnaturally_arrested/public_charge) never triggers wish_twist_wrong_visual_grammar', !v.violations.some(x => x.rule === 'wish_twist_wrong_visual_grammar'), JSON.stringify(v.violations));
}
{
  // REAL DATA: the actual, on-disk Attempt 8 candidate (never hand-edited) genuinely violates this
  // NEW law — real, disclosed evidence the correction is necessary and the rule fires on real
  // content, not only synthetic fixtures. Attempt 8 remains preserved untouched and unshipped; a
  // future focused paid revision is required to replace only the affected wish-twist beats.
  const attempt8Path = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/08_corrected_candidate_from_pass1.json');
  if (fs.existsSync(attempt8Path)) {
    const attempt8Draft = JSON.parse(fs.readFileSync(attempt8Path, 'utf8')).draft;
    const v = validateDraft(attempt8Draft, PACKET);
    const hit = v.violations.filter(x => x.rule === 'wish_twist_wrong_visual_grammar');
    ok('REAL DATA: the actual, on-disk Attempt 8 candidate (untouched, unshipped) genuinely fails the new wish-misalignment visual-grammar rule — real confirmation this correction is necessary, not merely theoretical', hit.length > 0, JSON.stringify(hit));
  } else {
    ok('REAL DATA: Attempt 8 candidate artifact not present in this environment — skipping real-data confirmation (not a failure; synthetic RED/GREEN coverage above already proves the rule)', true);
  }
}
// ── EXEMPLAR SIMILARITY — NON-BLOCKING DIAGNOSTIC (Roman, 2026-09-20 correction, replacing the
// 2026-09-17 hard-failure version): attempt4_positive_exemplars are WITHHELD historical drafts,
// never rendered into the authoring prompt (see attempt4_positive_exemplars' own disclosure). Real
// Attempt 8 proved the hard-failure version was wrong: its oasOpening independently matched
// julian_opening_turn's "rescue" framing not because it copied a source it was never shown, but
// because that exact framing is INDEPENDENTLY required by the live, rendered
// opening_frame_brief / oas_opening_requirement.content_requirement. A match against text the
// model never saw is not evidence of copying — treating it as a hard failure blocked bounded
// repair from ever running on Attempt 8, even though its only REAL blocking issue was narration
// density. This is now a non-blocking diagnostics-only report; `ok`/`violations` are unaffected. ──
{
  const d = compliantDraft();
  d.scene1Candidate.beats[12].text = 'No flare, no sound, no hand I could point to. The spiralgrass stilled, and I had no way to explain any of it to anyone watching.';
  const v = validateDraft(d, PACKET);
  ok('a scene1Candidate beat that verbatim-matches 6+ consecutive words from the WITHHELD twist_and_arrest exemplar is reported as a non-blocking diagnostic, NOT a violation — ok is unaffected by it alone', v.ok && v.diagnostics.some(x => x.rule === 'exemplar_similarity') && !v.violations.some(x => x.rule === 'exemplar_verbatim_copy'), JSON.stringify(v));
}
{
  const d = compliantDraft();
  d.oasOpening.text = 'You glanced toward me three times during the invocation, fingers tightening on the sash each time Seren faltered, and I have not stopped thinking about it since, turning the moment over long after the assembly went quiet, wondering exactly what it meant that you looked instead of speaking.';
  const v = validateDraft(d, PACKET);
  ok('an oasOpening that verbatim-matches 6+ consecutive words from the WITHHELD julian_opening_turn exemplar is reported as a non-blocking diagnostic, NOT a violation — ok is unaffected by it alone', v.ok && v.diagnostics.some(x => x.rule === 'exemplar_similarity') && !v.violations.some(x => x.rule === 'exemplar_verbatim_copy'), JSON.stringify(v));
}
{
  // RED preserved: exemplar_verbatim_copy must never again appear as a VIOLATION rule name — that
  // would silently re-block a bounded repair pass the way it wrongly did for real Attempt 8.
  const d = compliantDraft();
  d.scene1Candidate.beats[12].text = 'No flare, no sound, no hand I could point to. The spiralgrass stilled, and I had no way to explain any of it to anyone watching.';
  d.oasOpening.text = 'You glanced toward me three times during the invocation, fingers tightening on the sash each time Seren faltered, and I have not stopped thinking about it since.';
  const v = validateDraft(d, PACKET);
  ok('RED (policy guard): exemplar_verbatim_copy never appears as a violations[] rule anywhere, even with BOTH exemplars matched at once', !v.violations.some(x => x.rule === 'exemplar_verbatim_copy') && v.diagnostics.filter(x => x.rule === 'exemplar_similarity').length === 2);
}
{
  const d = compliantDraft();
  // A LONG-but-vague beat (55+ words, so it still clears the composition contract's per-beat
  // length floor and evades the short-synopsis-standin pattern, which only fires under 20 words) —
  // this is the genuinely remaining gap: padding a vague beat to length defeats every current
  // mechanical check.
  d.scene1Candidate.beats[10].text = 'The wish bent, and everyone looked at her, and kept looking, the way a crowd looks when something has shifted in the air though nobody can yet say what, and the looking went on and on until it felt like its own kind of accusation, long before anyone present had spoken a single word aloud about whatever it was they thought they had just seen happen.';
  const v = validateDraft(d, PACKET);
  // The validator cannot mechanically judge whether this is "concrete enough" (see
  // wish_twist_and_arrest_requirement.banned_vague_consequence, a disclosed human-review-only
  // limit) — this control proves what IS true: a genuinely omitted coverage key still fails, which
  // is the machine-checkable half of this requirement. Documented, not silently overclaimed.
  ok('DISCLOSED LIMIT (not a red control): a LONG but still vague "everyone looked at her" beat (padded to clear the length floor) is NOT rejected by the validator on content quality alone — this dimension is human-review-only, by design', v.ok === true, JSON.stringify(v.violations));
}
// ── SCENE1/OAS BOUNDARY LEAK (Roman, 2026-09-17): reproduces the real v7-attempt-2 rejected
// failure — Julian's interrogation dramatized inside scene1Candidate — plus each individual leak
// pattern, and proves the SAME text is NOT flagged when it appears in postInterruptionBeat instead
// (where reflecting on the just-finished live exchange is legitimate). ──
{
  const d = compliantDraft();
  d.scene1Candidate.beats[19].text = 'He asked whether I had called to him through the rite.'; // the exact real leaked line
  const v = validateDraft(d, PACKET);
  ok('RED: the exact real rejected leak ("asked whether I had called to him") inside scene1Candidate is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_oas_scope_leak' && /interrogation_question/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Candidate.beats[19].text = 'He named it plainly: I had manipulated her without knowing it, through my own desirability.';
  const v = validateDraft(d, PACKET);
  ok('RED: OAS-exclusive accusation vocabulary ("desirability") inside scene1Candidate is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_oas_scope_leak' && /desirability/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Candidate.beats[19].text = 'Some part of me wondered if I had called to him hoping he would rescue me from all of it.';
  const v = validateDraft(d, PACKET);
  ok('RED: OAS-exclusive "hoping he would rescue" language inside scene1Candidate is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_oas_scope_leak' && /rescue/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.postInterruptionBeat.text = 'He had asked whether I called to him, and I still did not know my own answer.';
  const v = validateDraft(d, PACKET);
  ok('GREEN: the same "asked whether" phrasing in postInterruptionBeat (reflecting on the just-finished live exchange) is NOT flagged — the leak check is scoped only to scene1Candidate', v.ok === true, JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.scene1Candidate.beats[0].kind = 'flashback';
  const v = validateDraft(d, PACKET);
  ok('RED: an invalid beat kind is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_invalid_kind'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.scene1Candidate.beats[0].image = 'freshly_generated_new_image';
  const v = validateDraft(d, PACKET);
  ok('RED: an image ID outside the 8 fixed existing images is rejected (no new image may ever be generated)', !v.ok && v.violations.some(x => x.rule === 'scene1_invalid_image'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.scene1Candidate.beats[3].image = 'd4'; // jump forward
  d.scene1Candidate.beats[4].image = 'intro_lirael'; // then jump backward — out of order
  const v = validateDraft(d, PACKET);
  ok('RED: an image sequence that goes backward is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_image_out_of_order'), JSON.stringify(v.violations));
}
// ── LOCKED BEAT-TO-ASSET MAPPING (Roman, 2026-09-18): the author cannot assign a beat to an
// arbitrary asset, even one that's still forward-moving and structurally "valid" on its own. ──
{
  const d = compliantDraft();
  d.scene1Candidate.beats[10].image = 'd3'; // slot 11 is locked to "d2" — this is forward-moving and otherwise valid, but not the LOCKED asset for this slot
  const v = validateDraft(d, PACKET);
  ok('RED: a beat assigned a DIFFERENT (but still forward-moving, structurally "valid") image than its locked template slot declares is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_beat_asset_mapping_locked'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  const v = validateDraft(d, PACKET);
  ok('GREEN: the compliant draft\'s beat-to-image assignments exactly match every locked template slot (no mapping violations)', !v.violations.some(x => x.rule === 'scene1_beat_asset_mapping_locked'), JSON.stringify(v.violations));
}
// ── RE-KEYED TO scene1_visual_storyboard (Roman, 2026-09-19): "prove the authoring adapter/
// validator receive THIS locked mapping" — the lock now sources from scene1_visual_storyboard.beats
// as primary (not merely the older template), and its own rejection message names that section by
// name, proving the drift check is genuinely keyed to the storyboard Roman reviewed, not a separate,
// silently-agreeing definition. ──
{
  const d = compliantDraft();
  d.scene1Candidate.beats[14].image = 'd4'; // slot 15 (n=15) is locked to "d3" per scene1_visual_storyboard.beats[14].occurrence
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'scene1_beat_asset_mapping_locked');
  ok('RED: a beat drifting from scene1_visual_storyboard is rejected, and the rejection explicitly names scene1_visual_storyboard as the locked source', !v.ok && !!hit && /scene1_visual_storyboard/.test(hit.detail) && /occurrence="d3"/.test(hit.detail), JSON.stringify(hit));
}
{
  // A packet whose scene1_visual_storyboard has been tampered to CONTRADICT its own
  // scene1_beat_number_template must refuse to trust either — never silently pick one over the other.
  const tamperedPacket = JSON.parse(JSON.stringify(PACKET));
  tamperedPacket.scene1_visual_storyboard.beats[5].occurrence = 'd1'; // template still says "intro_dohkar" for n=6
  const d = compliantDraft();
  const v = validateDraft(d, tamperedPacket);
  ok('RED: a packet whose scene1_visual_storyboard contradicts its own scene1_beat_number_template is rejected as internally inconsistent, not silently resolved', !v.ok && v.violations.some(x => x.rule === 'visual_storyboard_template_drift'), JSON.stringify(v.violations));
}
// ── THE ANSWER — OBJECT-FIDELITY GUARD (Roman, 2026-09-19): hard object-fidelity constraint, not a
// style suggestion. Real historical failure shape: every prior draft attempt that mentioned The
// Answer's form invented one (attempt 1 "cool metal", attempt 4 "cool stone", attempt 5 "carved
// bone") because the packet recorded the correct form but the adapter never rendered it. Both sides
// closed now: the adapter renders the locked form as a hard constraint (see TASK 0 / locked world
// facts), and this validator mechanically rejects a candidate that assigns a conflicting form. ──
{
  const d = compliantDraft();
  d.scene1Candidate.beats[18].text = 'Julian closed my hands around the cool stone of The Answer, its weight settling into my palms.';
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_form_violation');
  ok('RED: "stone" assigned to The Answer in a scene1Candidate beat is rejected, citing the banned word and the staff/hook canon', !v.ok && !!hit && /"stone"/.test(hit.detail) && /staff/.test(hit.detail), JSON.stringify(hit));
}
{
  const d = compliantDraft();
  d.oasOpening.text = 'He closed her fingers around the smooth gemstone, cool against her palm, and asked if she was ready — his gaze steady, his patience visible, before all of them.';
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_form_violation');
  ok('SCOPE: a banned form word ("gemstone") in oasOpening with NO pronoun signal and no prior claim is NOT flagged — the continuity engine requires an actual involvement signal (name, handling-signal, or claim), not mere co-presence of an unrelated word', !hit, JSON.stringify(hit));
  // Re-run WITH the literal name present, to confirm the guard genuinely fires on oasOpening too.
  const d2 = compliantDraft();
  d2.oasOpening.text = 'He closed her fingers around The Answer, a smooth cool orb pressed into her palm, and asked if she was ready before all of them, his gaze steady and unhurried.';
  const v2 = validateDraft(d2, PACKET);
  const hit2 = v2.violations.find(x => x.rule === 'the_answer_form_violation');
  ok('RED: a banned form word ("orb") for The Answer in oasOpening.text IS rejected once the object is literally named in that same text', !v2.ok && !!hit2 && /"orb"/.test(hit2.detail), JSON.stringify(hit2));
}
{
  const d = compliantDraft();
  d.postInterruptionBeat.text = 'The Answer sat heavy and strange in my palm, a fragment of crystal cold against my skin as I waited.';
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_form_violation');
  ok('RED: a banned form word ("crystal") for The Answer in postInterruptionBeat.text is rejected', !v.ok && !!hit && /"crystal"/.test(hit.detail), JSON.stringify(hit));
}
{
  // A NEUTRAL reference — names The Answer, says who holds it and what is about to happen, but does
  // NOT restate its physical form at all — must remain allowed, INCLUDING the now-mandatory
  // objectClaims metadata (a neutral reference still requires disclosure, just the cheap kind).
  const d = compliantDraft();
  d.scene1Candidate.beats[18].text = 'Julian closed my hands around The Answer, its weight settling into my palms as the assembly watched.';
  d.scene1Candidate.beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'neutral_reference', claim_kind: 'generated_expression' }];
  const v = validateDraft(d, PACKET);
  const answerViolations = v.violations.filter(x => x.rule === 'the_answer_form_violation' || x.rule === 'the_answer_missing_object_metadata' || x.rule === 'the_answer_physical_claim_invalid' || x.rule === 'the_answer_claim_provenance_invalid');
  ok('GREEN: a neutral reference to The Answer (with matching objectClaims metadata) that does not restate its physical form clears every the_answer_* rule (other violations here are unrelated density mechanics from shortening this one fixture beat, not this correction)', answerViolations.length === 0, JSON.stringify(answerViolations));
}
{
  // An UNRELATED object described with one of the same banned words, nowhere near "The Answer" in
  // that beat's text, must never be flagged — the guard is scoped to explicit co-occurrence only.
  const d = compliantDraft();
  d.scene1Candidate.beats[0].text = 'The clearing floor was cold stone beneath my bare feet, worn smooth by generations of witnessed rites.';
  const v = validateDraft(d, PACKET);
  const answerViolationsUnrelated = v.violations.filter(x => x.rule === 'the_answer_form_violation' || x.rule === 'the_answer_missing_object_metadata');
  ok('GREEN: an unrelated object ("cold stone" flooring, no mention of The Answer in that beat) is unaffected by the guard or the metadata requirement', answerViolationsUnrelated.length === 0, JSON.stringify(answerViolationsUnrelated));
}
// ── STRUCTURED OBJECT-CLAIM METADATA — closing the evasion Roman identified: a same-text guard
// alone misses adjacent sentences, pronouns, and a beat split. Five required RED/canonical cases. ──
{
  // RED 1: "It was cold stone in my hands. The Answer..." across ADJACENT SENTENCES — here modeled
  // as the literal two-sentence text Roman gave, inside ONE beat (the same-text guard already
  // catches this; the adjacent-pair guard is the one that catches it split across TWO beats, tested
  // next) — this proves the two-sentence phrasing itself is still caught regardless of punctuation.
  const d = compliantDraft();
  d.scene1Candidate.beats[18].text = 'It was cold stone in my hands. The Answer dragged at my wrist as Julian let go.';
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_form_violation');
  ok('RED 1: "It was cold stone in my hands. The Answer dragged at my wrist." — adjacent sentences in one beat — is rejected', !v.ok && !!hit && /"stone"/.test(hit.detail), JSON.stringify(hit));
}
{
  // RED 1b: the SAME wrong claim, now split across two ADJACENT BEATS (a real "beat split" evasion
  // of the same-text guard) — caught only by the widened adjacent-pair check.
  const d = compliantDraft();
  d.scene1Candidate.beats[17].text = 'It was cold stone in my hands, colder than I expected, and I did not yet understand what I was holding.';
  d.scene1Candidate.beats[18].text = 'The Answer dragged at my wrist as Julian let go and stepped back to let the assembly see.';
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_form_violation' && /adjacent beats/.test(x.detail));
  ok('RED 1b: the same wrong claim SPLIT across two adjacent beats (no single beat contains both "The Answer" and "stone") is still rejected, via the widened adjacent-pair guard', !v.ok && !!hit && /"stone"/.test(hit.detail), JSON.stringify(hit));
}
{
  // RED 2: a PRONOUN-BEARING continuation of a PRIOR beat that named The Answer — no literal name in
  // THIS beat, only "it" — caught by the same adjacent-pair guard (order-agnostic: prior beat names
  // it, this beat carries the banned word via pronoun).
  const d = compliantDraft();
  d.scene1Candidate.beats[18].text = 'Julian closed my hands around The Answer before the whole assembly, his grip steady over mine.';
  d.scene1Candidate.beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'neutral_reference', claim_kind: 'generated_expression' }];
  d.scene1Candidate.beats[19].text = 'It was smooth cold stone against my palm, and I could not stop staring at it even as he spoke.';
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_form_violation');
  ok('RED 2: a pronoun-bearing continuation ("It was...cold") in the beat AFTER one naming The Answer is rejected, even with no literal name in that beat', !v.ok && !!hit, JSON.stringify(hit));
}
{
  // RED 3: a physical HANDLING/description beat that names The Answer but supplies NO object
  // metadata at all — no banned word either, so the fast guard is silent; only the mandatory-
  // metadata rule catches this.
  const d = compliantDraft();
  d.scene1Candidate.beats[18].text = 'Julian closed my hands around The Answer, and I felt its weight settle strangely against my palm.';
  delete d.scene1Candidate.beats[18].objectClaims;
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_missing_object_metadata');
  ok('RED 3: a beat naming The Answer with no banned word but ALSO no objectClaims metadata is rejected — disclosure is mandatory, not conditional on a banned word being present', !v.ok && !!hit && /scene1Candidate\.beats\[18\]/.test(hit.detail), JSON.stringify(hit));
}
{
  // CANONICAL: a valid staff-and-opposed-question-mark-hooks claim, properly cited as a locked fact
  // — must be ACCEPTED. Does not require the word "blade"; states form only.
  const d = compliantDraft();
  d.scene1Candidate.beats[18].text = 'Julian closed my hands around The Answer, the double-ended shaft cool and steady between my palms, its two hooked heads catching the low light.';
  d.scene1Candidate.beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'staff_double_ended_question_mark_hooks', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.current_manifestation' }];
  const v = validateDraft(d, PACKET);
  const answerViolationsCanon = v.violations.filter(x => x.rule.startsWith('the_answer_'));
  ok('CANONICAL: a valid staff/double-ended/question-mark-hooks claim, cited as locked_canon_fact, is fully accepted by every the_answer_* rule', answerViolationsCanon.length === 0, JSON.stringify(answerViolationsCanon));
}
// ── STATEFUL MANIFESTATION MODEL (Roman, 2026-09-20): identity persists, manifestation changes
// only as the declared consequence of a concrete wielder need. Real packet declares ZERO permitted
// change events for this scene (every test above proves that holds); these two controls exercise
// the MECHANISM itself against a test-only packet that DOES declare one, proving it is a real,
// working, deterministic mechanism — not a hypothetical never-exercised code path. ──
{
  // GREEN: a FUTURE valid need-driven change. Test-only packet declares one permitted event (a
  // concrete wielder_need, a distinct resulting manifestation, after_beat: 20 — i.e. active from
  // oasOpening/postInterruptionBeat onward, not during scene1Candidate.beats). A beat AT/BEFORE the
  // threshold stays on the staff; postInterruptionBeat (position 101, past the threshold) correctly
  // claims the NEW manifestation, cited to the event — must be ACCEPTED.
  const eventPacket = JSON.parse(JSON.stringify(PACKET));
  eventPacket.scene1_answer_manifestation.permitted_manifestation_change_events = [{
    event_id: 'test_wielder_adapts_grip',
    wielder_need: 'Julian needs The Answer small enough for Lirael to hold one-handed while he keeps her other hand in his',
    resulting_manifestation: { manifestation_id: 'compact_wielder_blade', form: 'a short, balanced single-edged blade sized for a one-handed grip — states form only' },
    after_beat: 20,
  }];
  const d = compliantDraft();
  // beats[18] (n=19) stays on the staff — the threshold (after_beat 20) has not been reached yet.
  d.scene1Candidate.beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'staff_double_ended_question_mark_hooks', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.current_manifestation' }];
  d.postInterruptionBeat.text = 'The Answer had changed in my hands — no longer the staff Julian first pressed into them, but a compact blade, fitted for one grip, for one hand, for whatever came next.';
  d.postInterruptionBeat.objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'compact_wielder_blade', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.permitted_manifestation_change_events[0]' }];
  const v = validateDraft(d, eventPacket);
  const answerViolationsFuture = v.violations.filter(x => x.rule.startsWith('the_answer_'));
  ok('GREEN: a future valid need-driven manifestation change (concrete wielder_need, declared resulting form, correct after_beat position) is fully accepted', answerViolationsFuture.length === 0, JSON.stringify(answerViolationsFuture));
}
{
  // RED: the SAME test-only packet/event, but the new manifestation is claimed TOO EARLY — a
  // scene1Candidate beat well before after_beat:20 claims the not-yet-active resulting form. The
  // event is real and valid; the CLAIM is not justified at this position — rejected as a
  // manifestation conflict, not merely an unknown value.
  const eventPacket2 = JSON.parse(JSON.stringify(PACKET));
  eventPacket2.scene1_answer_manifestation.permitted_manifestation_change_events = [{
    event_id: 'test_wielder_adapts_grip',
    wielder_need: 'Julian needs The Answer small enough for Lirael to hold one-handed while he keeps her other hand in his',
    resulting_manifestation: { manifestation_id: 'compact_wielder_blade', form: 'a short, balanced single-edged blade sized for a one-handed grip — states form only' },
    after_beat: 20,
  }];
  const d = compliantDraft();
  d.scene1Candidate.beats[18].text = 'Julian closed my hands around The Answer, already the compact blade he would need later, though nothing here yet explained why.';
  d.scene1Candidate.beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'compact_wielder_blade', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.permitted_manifestation_change_events[0]' }];
  const v = validateDraft(d, eventPacket2);
  const hit = v.violations.find(x => x.rule === 'the_answer_manifestation_conflict');
  ok('RED: claiming a validly-declared future manifestation BEFORE its after_beat position is rejected as a manifestation conflict (the event is real; the timing is not justified yet)', !v.ok && !!hit && /"compact_wielder_blade"/.test(hit.detail), JSON.stringify(hit));
}
{
  // RED (Roman's explicit framing): an UNJUSTIFIED stone/bone/orb shift AFTER the staff has already
  // been established via structured metadata earlier in the scene — the REAL packet (zero permitted
  // events), via the structured metadata channel this time, not just the lexical backup.
  const d = compliantDraft();
  d.scene1Candidate.beats[16].text = 'Julian stood ready at the edge, The Answer already resting against his palm, waiting for the moment to give it to me.';
  d.scene1Candidate.beats[16].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'staff_double_ended_question_mark_hooks', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.current_manifestation' }];
  d.scene1Candidate.beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'carved_bone_relic', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.current_manifestation' }];
  const v = validateDraft(d, PACKET);
  const hit = v.violations.find(x => x.rule === 'the_answer_physical_claim_invalid');
  ok('RED: an unjustified "bone" manifestation shift claimed after the staff is already established (no permitted change event exists in the real packet) is rejected — not a manifestation this packet has ever declared', !v.ok && !!hit && /carved_bone_relic/.test(hit.detail), JSON.stringify(hit));
}
// ── FATELANDS WORLD-SCOPE GATE (Roman, 2026-09-20): "It should be a Fatelands reality law, not
// imposed on Famous Fate worlds with their own canon." Proves the gate is real, not documentation
// only — a packet not scoped to fatelands_fantasy gets NO manifestation-variance affordance. ──
{
  ok('the real First Sacrifice packet declares world_scope "fatelands_fantasy" (the shared law\'s gate is satisfied for this story)', PACKET.world_scope === 'fatelands_fantasy', PACKET.world_scope);
}
{
  // RED: a Famous-Fate-scoped copy of the SAME packet, with the SAME (otherwise valid) permitted
  // change event used by the earlier GREEN "future valid change" control — the event itself is
  // well-formed; only the world_scope differs. Must be refused wholesale.
  const famousFatePacket = JSON.parse(JSON.stringify(PACKET));
  famousFatePacket.world_scope = 'famous_fate';
  famousFatePacket.scene1_answer_manifestation.permitted_manifestation_change_events = [{
    event_id: 'test_wielder_adapts_grip',
    wielder_need: 'Julian needs The Answer small enough for Lirael to hold one-handed while he keeps her other hand in his',
    resulting_manifestation: { manifestation_id: 'compact_wielder_blade', form: 'a short, balanced single-edged blade sized for a one-handed grip — states form only' },
    after_beat: 20,
  }];
  const d = compliantDraft();
  d.postInterruptionBeat.text = 'The Answer had changed in my hands — no longer the staff Julian first pressed into them, but a compact blade, fitted for one grip, for one hand, for whatever came next.';
  d.postInterruptionBeat.objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'compact_wielder_blade', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.permitted_manifestation_change_events[0]' }];
  const v = validateDraft(d, famousFatePacket);
  const gateHit = v.violations.filter(x => x.rule === 'fatelands_manifestation_law_misapplied');
  ok('RED: a Famous-Fate-scoped packet with an OTHERWISE VALID permitted manifestation-change event is refused wholesale — the event is never honored, and the resulting_manifestation claim is rejected as unknown, not silently accepted', !v.ok && gateHit.length >= 1 && v.violations.some(x => x.rule === 'the_answer_physical_claim_invalid' && /compact_wielder_blade/.test(x.detail)), JSON.stringify({ gateHit, allAnswerViolations: v.violations.filter(x => x.rule.startsWith('the_answer_') || x.rule === 'fatelands_manifestation_law_misapplied') }));
}
{
  // GREEN sanity: the SAME famous_fate world_scope, but with NO declared change event and only a
  // neutral reference to The Answer, is unaffected — the gate only bites when a change is actually
  // attempted; a story outside Fatelands scope making no manifestation claim at all is not punished
  // for a law that was never invoked.
  const famousFatePacket2 = JSON.parse(JSON.stringify(PACKET));
  famousFatePacket2.world_scope = 'famous_fate';
  const d = compliantDraft();
  const v = validateDraft(d, famousFatePacket2);
  ok('GREEN: a Famous-Fate-scoped packet with NO declared manifestation-change event and only neutral/current-manifestation claims triggers no fatelands_manifestation_law_misapplied violation (the gate bites misuse, not mere world identity)', !v.violations.some(x => x.rule === 'fatelands_manifestation_law_misapplied'), JSON.stringify(v.violations.filter(x => x.rule === 'fatelands_manifestation_law_misapplied')));
}
{
  const d = compliantDraft(); d.scene1Candidate.beats[0].provenance = { kind: 'locked_canon_fact' }; // no cites
  const v = validateDraft(d, PACKET);
  ok('RED: a scene1Candidate beat declaring locked_canon_fact with no citation is rejected', !v.ok && v.violations.some(x => x.rule === 'unsupported_historical_claim'), JSON.stringify(v.violations));
}
{
  // beats[1] in compliantScene1() is grounded_inference (cites: pc_untested_brilliance) — strip it.
  const d = compliantDraft(); d.scene1Candidate.beats[1].provenance = { kind: 'grounded_inference' }; // no cites/named grounds
  const v = validateDraft(d, PACKET);
  ok('RED: a scene1Candidate beat declaring grounded_inference with no named grounds is rejected', !v.ok && v.violations.some(x => x.rule === 'missing_named_grounds'), JSON.stringify(v.violations));
}
{
  // PROVENANCE PROPORTIONALITY, proven both ways: generated_expression NEVER needs a citation or
  // named grounds — original prose/dialogue/interiority must pass cleanly with only {kind}, no
  // cites field at all. This is the GREEN half of the asymmetric discipline Roman required.
  const d = compliantDraft();
  d.scene1Candidate.beats[0].provenance = { kind: 'generated_expression' };
  d.scene1Candidate.beats[1].provenance = { kind: 'generated_expression' };
  const v = validateDraft(d, PACKET);
  ok('GREEN: generated_expression beats with NO citation and NO named grounds are NOT rejected — original prose is never penalized for being original', v.ok === true, JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.scene1Candidate.beats[0].caption = 'an unapproved field on a scene1 beat';
  const v = validateDraft(d, PACKET);
  ok('RED: an unapproved field on a scene1Candidate beat is rejected — structural scope gate', !v.ok && v.violations.some(x => x.rule === 'unapproved_output_field' && /scene1Candidate\.beats\[0\]/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.scene1Candidate.beats.push({ kind: 'narration', speaker: null, image: 'd4', text: 'The Answer is hers now, given freely.', provenance: { kind: 'generated_expression' } });
  const v = validateDraft(d, PACKET);
  ok('RED: a contradiction inside scene1Candidate text is rejected (the same text-level rules apply there too)', !v.ok && v.violations.some(x => x.rule === 'contradiction'), JSON.stringify(v.violations));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('RED CONTROLS — each rejection rule must genuinely bite');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const d = compliantDraft(); d.postInterruptionBeat.text = 'The Answer is hers now, given freely.';
  const v = validateDraft(d, PACKET);
  ok('RED: contradiction (The Answer as hers) is rejected', !v.ok && v.violations.some(x => x.rule === 'contradiction'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.oasOpening.text = 'He is hiding something about his counter-wish.';
  const v = validateDraft(d, PACKET);
  ok('RED: sealed-fact leakage (counter-wish / hiding something) is rejected', !v.ok && v.violations.some(x => x.rule === 'sealed_fact_leakage'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.postInterruptionBeat.text = 'Somewhere, unseen, Julian is already suspicious of what she withholds.';
  const v = validateDraft(d, PACKET);
  ok('RED: sealed-fact leakage (Julian forbidden reading: suspicious/withholds) is rejected', !v.ok && v.violations.some(x => x.rule === 'sealed_fact_leakage'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.postInterruptionBeat.text = 'The formal inquiry has already ruled against her.';
  const v = validateDraft(d, PACKET);
  ok('RED: premature Inquiry (already ruled) is rejected', !v.ok && v.violations.some(x => x.rule === 'premature_inquiry'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.oasOpening.speaker = 'Lirael';
  const v = validateDraft(d, PACKET);
  ok('RED: oasOpening attributed to anyone other than Julian is rejected — the player, not this packet, speaks for Lirael', !v.ok && v.violations.some(x => x.rule === 'oas_opening_wrong_speaker'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.oasOpening.text = 'You manipulated her without knowing it, through her considerable and widely remarked-upon desirability, and everyone standing in this clearing has surely noticed it by now, whether or not they would ever say so plainly, in front of the assembly, the presiding Dohkar, or her own ward, who is still kneeling not ten feet from where the two of us are standing and speaking right now, watching everything that passes between us, the way everyone here has been watching you since long before I ever said a single word about any of it.';
  const v = validateDraft(d, PACKET);
  ok('RED: an oasOpening line over 80 words is rejected', !v.ok && v.violations.some(x => x.rule === 'oas_opening_too_long'), JSON.stringify(v.violations));
}
{
  // Roman's explicit named scenario: "a 1,100-word draft padded with generic summary sentences" —
  // total word count clears the floor (so scene1_too_thin does NOT fire), but several SHORT
  // narration beats are bare synopsis-standin sentences, padded out by a few very long beats
  // elsewhere purely to hit the total. Proves the total-word floor alone would have let this
  // through; the new per-beat checks catch what it misses.
  const d = compliantDraft();
  const pad = ' Padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding.';
  d.scene1Candidate.beats[0].text += pad + pad + pad; // absorbs the words removed below, keeps the total at/above 1,100
  d.scene1Candidate.beats[2].text += pad + pad + pad;
  d.scene1Candidate.beats[4].text = 'She felt afraid.'; // bare "X felt Y" synopsis stand-in
  d.scene1Candidate.beats[6].text = 'Julian stepped forward.'; // bare "stepped forward" synopsis stand-in
  const v = validateDraft(d, PACKET);
  const totalWords = d.scene1Candidate.beats.reduce((n, b) => n + b.text.trim().split(/\s+/).filter(Boolean).length, 0);
  ok('RED: a 1,100+ word draft padded with generic summary sentences (total floor cleared, but built from bare synopsis stand-ins) is rejected', totalWords >= 1100 && !v.ok && v.violations.some(x => x.rule === 'scene1_synopsis_standin'), 'totalWords=' + totalWords + ' violations=' + JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.oasOpening.text = 'You shaped her wish through your own unspoken desire.'; // the real rejected example (9 words)
  const v = validateDraft(d, PACKET);
  ok('RED: the exact real rejected blunt-short oasOpening ("You shaped her wish through your own unspoken desire", 9 words) is rejected as too short', !v.ok && v.violations.some(x => x.rule === 'oas_opening_too_short'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.oasOpening.text = 'That is enough, Provast, this is going too far and must end now.';
  const v = validateDraft(d, PACKET);
  ok('RED: oasOpening writing the FIXED tail’s own line is rejected', !v.ok && v.violations.some(x => x.rule === 'fixed_tail_duplicated'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.postInterruptionBeat.image = 'd3';
  const v = validateDraft(d, PACKET);
  ok('RED: postInterruptionBeat NOT on the scene’s final image (d4) is rejected', !v.ok && v.violations.some(x => x.rule === 'post_interruption_wrong_image'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.postInterruptionBeat.speaker = 'Julian';
  const v = validateDraft(d, PACKET);
  ok('RED: postInterruptionBeat attributed to Julian (not Lirael/narration) is rejected', !v.ok && v.violations.some(x => x.rule === 'post_interruption_wrong_speaker'), JSON.stringify(v.violations));
}
{
  // Reproduces exactly what Roman flagged as the core risk: a beat that silently pre-writes the
  // player's answer instead of crystallizing an open choice.
  const d = compliantDraft(); d.postInterruptionBeat = { speaker: 'Lirael', image: 'd4', kind: 'dialogue', text: '"I decided to answer him plainly, whatever the cost."' };
  const v = validateDraft(d, PACKET);
  ok('RED: postInterruptionBeat resolving the player’s choice ("I decided...") is rejected', !v.ok && v.violations.some(x => x.rule === 'post_interruption_resolves_choice'), JSON.stringify(v.violations));
}
// ── FATE-CARD LIFECYCLE CORRECTION (Roman, 2026-09-17): fateCards is no longer an authored field
// at all — the real dynamic mechanism (generateIntimateFatePreviewsBatch) deals fresh cards after
// every live OAS exchange, including post-interruption. A draft that still includes a fateCards
// field (old habit, stale model memory, or a genuine regression) must be rejected exactly like any
// other unapproved field — proven here, replacing the old per-card-content controls above. ──
{
  const d = compliantDraft();
  d.fateCards = { temptation: { action: 'She steps closer.', dialogue: '"Say it."', variant: 'amplify' }, silence: {}, reversal: {}, boundary: {}, confession: {} };
  const v = validateDraft(d, PACKET);
  ok('RED: a draft that still includes fateCards (the removed field) is rejected as an unapproved top-level field', !v.ok && v.violations.some(x => x.rule === 'unapproved_output_field' && /fateCards/.test(x.detail)), JSON.stringify(v.violations));
}
{
  // Structural violation: an unapproved top-level field (a continuation/scaffold-shaped
  // structure), NOT text mentioning "Scene 2" — the rule must reject STRUCTURE, not wording.
  const d = compliantDraft(); d.sceneSpine = { objective: 'a Scene-2 planning object that should never appear here' };
  const v = validateDraft(d, PACKET);
  ok('RED: an unapproved top-level field (sceneSpine) is rejected — structural scope gate', !v.ok && v.violations.some(x => x.rule === 'unapproved_output_field' && /sceneSpine/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.continuationPlan = { hint: 'a smuggled continuation artifact' };
  const v = validateDraft(d, PACKET);
  ok('RED: an unapproved top-level field (continuationPlan) is rejected — structural scope gate', !v.ok && v.violations.some(x => x.rule === 'unapproved_output_field' && /continuationPlan/.test(x.detail)), JSON.stringify(v.violations));
}
{
  // Ordinary prose that happens to mention "Scene 2" must NOT be rejected — proves the gate is
  // structural, not lexical, per Roman's explicit correction.
  const d = compliantDraft(); d.postInterruptionBeat.text = 'I wonder, distantly, what Scene 2 of my life will look like after this.';
  const v = validateDraft(d, PACKET);
  ok('GREEN: ordinary prose containing the words "Scene 2" is NOT rejected (structural gate, not lexical)', v.ok === true, JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.oasOpening.tone = 'an unapproved field smuggled onto an otherwise-valid line';
  const v = validateDraft(d, PACKET);
  ok('RED: an unapproved field on oasOpening is rejected — structural scope gate applies at every level', !v.ok && v.violations.some(x => x.rule === 'unapproved_output_field' && /oasOpening/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.postInterruptionBeat.tone = 'an unapproved field smuggled onto an otherwise-valid beat';
  const v = validateDraft(d, PACKET);
  ok('RED: an unapproved field on postInterruptionBeat is rejected — structural scope gate applies at every level', !v.ok && v.violations.some(x => x.rule === 'unapproved_output_field' && /postInterruptionBeat/.test(x.detail)), JSON.stringify(v.violations));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('PACKET STRUCTURAL SANITY — the packet itself is well-formed');
// ═══════════════════════════════════════════════════════════════════════════════
ok('packet is marked DRAFT / not baked', /DRAFT/.test(PACKET.status));
ok('packet declares immutable:true', PACKET.immutable === true);
ok('sealed_facts_forbidden_pre_surface includes inquiry_not_opened', PACKET.sealed_facts_forbidden_pre_surface.some(f => f.id === 'inquiry_not_opened'));
ok('oas_sequence_v2_SUPERSEDED_scripted_transcript is retained but explicitly marked SUPERSEDED, not deleted', /SUPERSEDED/.test(PACKET.oas_sequence_v2_SUPERSEDED_scripted_transcript.status));
ok('oas_sequence_v3 fixed_tail_exchange matches the real baked package (3 lines, Dohkar/Julian/narration), content unchanged from the superseded design', (() => {
  const t = PACKET.oas_sequence_v3.fixed_baked_content.fixed_tail_exchange;
  return Array.isArray(t) && t.length === 3 && t[0].speaker === 'the presiding Dohkar' && t[1].speaker === 'Julian' && t[2].speaker === null;
})());
const _fc = PACKET.oas_sequence_v2_SUPERSEDED_scripted_transcript.five_fate_cards_requirement; // structure/semantics still authoritative, reused verbatim by oas_sequence_v3
ok('five_fate_cards_requirement declares the FIXED real archetype keys, not free labels', JSON.stringify(_fc.required_keys_exact) === JSON.stringify(CARD_KEYS));
ok('fateCards are marked reviewable_package_interaction (NOT a canon-fact category), not locked', _fc.kind === 'reviewable_package_interaction');
ok('the packet is explicit that approving a card never writes world/character canon', /not\s+write\s+a\s+new\s+locked_canon_fact/i.test(_fc.not_world_canon));
ok('archetype semantics are given for all 5 fixed keys (ample instruction for the model to interpret, per Roman)', CARD_KEYS.every(k => typeof _fc.archetype_semantics_adapted_for_this_scene[k] === 'string' && _fc.archetype_semantics_adapted_for_this_scene[k].length > 20));

// ── FATE-CARD LIFECYCLE CORRECTION (Roman, 2026-09-17) ──
ok('oas_sequence_v3.five_fate_cards_requirement is explicitly REMOVED, not silently deleted', /REMOVED/.test(PACKET.oas_sequence_v3.five_fate_cards_requirement) && !!PACKET.oas_sequence_v3.superseded_five_fate_cards_requirement);
ok('fate_card_lifecycle_correction section present, citing the real dynamic mechanism and its real fix', !!PACKET.fate_card_lifecycle_correction && /generateIntimateFatePreviewsBatch/.test(PACKET.fate_card_lifecycle_correction.real_mechanism) && /_authoredOASBlock/.test(PACKET.fate_card_lifecycle_correction.real_gap_found_and_fixed));
ok('fate_card_lifecycle_correction confirms card-click-prefills-only semantics are unchanged by this correction', /prefills the editable Say\/Do/.test(PACKET.fate_card_lifecycle_correction.card_click_semantics_unchanged));
ok('oas_opening_requirement declares the 35-80 word constraint (superseding the ≤14-word one) and forbids Lirael’s response', /35-80 words/.test(PACKET.oas_sequence_v3.oas_opening_requirement.length_constraint) && /Must NOT include Lirael/.test(PACKET.oas_sequence_v3.oas_opening_requirement.hard_boundary));
ok('scene1_composition_contract section present, citing all 3 real rejected drafts', !!PACKET.scene1_composition_contract && /attempts 1\/2\/3/.test(PACKET.scene1_composition_contract.cites));

// ── ATTEMPT4 EXEMPLAR SAFEGUARD (Roman, 2026-09-17 follow-up) ──
ok('attempt4_positive_exemplars declares non_canonical_status with all 4 required guardrails', (() => {
  const nc = PACKET.attempt4_positive_exemplars && PACKET.attempt4_positive_exemplars.non_canonical_status;
  if (!nc || !Array.isArray(nc.hard_boundary) || nc.hard_boundary.length !== 4) return false;
  const joined = nc.hard_boundary.join(' | ');
  return /Non-canonical/.test(joined) && /Craft reference only/.test(joined) && /Do NOT quote or closely copy/.test(joined) && /no detail inside an exemplar becomes a locked world, character, or event fact/i.test(joined);
})());

// ── VERBATIM EXEMPLARS REMOVED FROM PROMPT (Roman, 2026-09-18, following real v7-attempt-5
// copying despite guardrails) ──
ok('attempt4_positive_exemplars is explicitly marked historical-only, not rendered', /HISTORICAL RECORD ONLY, NOT RENDERED IN THE PROMPT/.test(PACKET.attempt4_positive_exemplars.status));
ok('attempt4_craft_requirements_abstract present with all 3 non-quotable requirements', !!(PACKET.attempt4_craft_requirements_abstract && Array.isArray(PACKET.attempt4_craft_requirements_abstract.requirements) && PACKET.attempt4_craft_requirements_abstract.requirements.length === 3));
{
  // EMPIRICAL, not inferred: actually render the real prompt and confirm neither exemplar's
  // distinctive real phrasing (the exact text that got copied in attempt 5) is present anymore.
  const { buildFixedInputView, buildPacketAuthoringPrompt } = await import('./_first_sacrifice_authoring_adapter.mjs');
  const { user } = buildPacketAuthoringPrompt(PACKET, buildFixedInputView());
  const leaked = /twisting rope of light aimed directly/.test(user) || /fingers tightening on the sash each time Seren faltered/.test(user);
  ok('EMPIRICAL: the real constructed prompt contains no verbatim exemplar text (the exact real attempt-4 phrasing that got copied in attempt 5)', !leaked);
}

// ── RICH NUMBERED TEMPLATE (Roman, 2026-09-18, following v7-attempt-5's density shortfall) ──
ok('scene1_beat_number_template.slots all declare kind + wordRange + fn (unmissable per-slot requirements)', PACKET.scene1_beat_number_template.slots.every(s => typeof s.kind === 'string' && Array.isArray(s.wordRange) && s.wordRange.length === 2 && typeof s.fn === 'string' && s.fn.length > 10));
ok('scene1_beat_number_template guarantees the 1,100 floor even at every slot\'s theoretical minimum', PACKET.scene1_beat_number_template.slots.reduce((n, s) => n + s.wordRange[0], 0) >= 1100);
ok('at least 12 slots are kind=narration (matching the composition contract\'s min_narration_beats floor)', PACKET.scene1_beat_number_template.slots.filter(s => s.kind === 'narration').length >= 12);

ok('post_interruption_beat_requirement forbids deciding the player’s choice', /MUST NOT decide/.test(PACKET.oas_sequence_v3.post_interruption_beat_requirement.hard_boundary));
ok('oas_mechanism_trace records the real traced turn/exit mechanism and the disclosed release-condition gap', !!(PACKET.oas_mechanism_trace && PACKET.oas_mechanism_trace.real_gap_found && /beatCount >= 1/.test(PACKET.oas_mechanism_trace.real_gap_found.proposed_structural_condition)));
ok('scope_lock section present and explicitly excludes Scene 2', !!PACKET.scope_lock && /does NOT extend into Scene 2/.test(PACKET.scope_lock.statement));
ok('validator_limits section present, discloses the validator cannot certify quality', !!PACKET.validator_limits && /CANNOT certify/.test(PACKET.validator_limits.statement));
ok('review_defaults section present with all 4 defaults (approver/rejection/regeneration/approval)', !!(PACKET.review_defaults && PACKET.review_defaults.approver && PACKET.review_defaults.on_rejection && PACKET.review_defaults.on_regeneration && PACKET.review_defaults.on_approval));
ok('authoring_mechanism_trace present with a direct-code-trace finding', !!(PACKET.authoring_mechanism_trace && /cannot accept this packet as-is/.test(PACKET.authoring_mechanism_trace.finding)));
ok('authoring cost census is explicitly marked PROVISIONAL, not a spend estimate', PACKET.authoring_operation_cost_census_PROVISIONAL.status.includes('PROVISIONAL'));
ok('the OAS-only-schema cost census is retained but marked SUPERSEDED, not deleted', !!(PACKET.grok_ministral8b_openai_authoring_operation_census_SUPERSEDED_oas_only_schema && /SUPERSEDED/.test(PACKET.grok_ministral8b_openai_authoring_operation_census_SUPERSEDED_oas_only_schema.status)));
ok('a real full_package_authoring_operation_census exists, admitted by the real governor, for the current full-package schema', !!(PACKET.full_package_authoring_operation_census
  && /REAL CENSUS/.test(PACKET.full_package_authoring_operation_census.status)
  && PACKET.full_package_authoring_operation_census.governor_check.admit_result.outcome === 'admitted'
  && PACKET.full_package_authoring_operation_census.max_tokens_ceiling.value === 8000));
ok('the ministral8b_fallback_compat_check section is present with all 4 conditions passing', !!(PACKET.ministral8b_fallback_compat_check
  && Object.values(PACKET.ministral8b_fallback_compat_check.conditions).every(c => c.pass === true)));
ok('the earlier DeepSeek-chain census is retained but explicitly marked SUPERSEDED, not deleted', !!(PACKET.grok_authoring_operation_census_SUPERSEDED_deepseek_not_approved && /SUPERSEDED/.test(PACKET.grok_authoring_operation_census_SUPERSEDED_deepseek_not_approved.status)));
ok('the earlier Mistral-primary-based governor measurement is also retained but explicitly marked SUPERSEDED, not deleted', !!(PACKET.governor_admission_measurement_SUPERSEDED_wrong_provider && /SUPERSEDED/.test(PACKET.governor_admission_measurement_SUPERSEDED_wrong_provider.status)));
ok('the mistral-small-latest fallback census is also retained but explicitly marked SUPERSEDED, not deleted', !!(PACKET.grok_mistral_openai_authoring_operation_census_SUPERSEDED_mistral_small_refused && /SUPERSEDED/.test(PACKET.grok_mistral_openai_authoring_operation_census_SUPERSEDED_mistral_small_refused.status)));
ok('the pre-redesign oas_sequence is retained but explicitly marked SUPERSEDED, not deleted', /SUPERSEDED/.test(PACKET.oas_sequence_v2_SUPERSEDED.status));
ok('scene1_candidate_requirement section present, requiring a FULL candidate replacement scene (not just the OAS delta)', !!(PACKET.scene1_candidate_requirement && /CANDIDATE REPLACEMENT/i.test(PACKET.scene1_candidate_requirement.what_roman_actually_authored)));
ok('scene1_candidate_requirement fixes the exact 8 existing images in order, no new image ever', JSON.stringify(PACKET.scene1_candidate_requirement.existing_images_reuse_only.order) === JSON.stringify(SCENE1_IMAGE_ORDER));
ok('scene1_candidate_requirement targets EXACTLY 20 beats (tightened from a range)', /EXACTLY 20 beats/.test(PACKET.scene1_candidate_requirement.beat_count_target));
ok('scene1_beat_number_template declares exactly 20 numbered slots', Array.isArray(PACKET.scene1_beat_number_template && PACKET.scene1_beat_number_template.slots) && PACKET.scene1_beat_number_template.slots.length === 20);
ok('scene1_beat_number_template slots cover exactly the required_content_beats ids, no more, no fewer', (() => { const ids = PACKET.scene1_beat_number_template.slots.filter(s => s.id).map(s => s.id); const required = PACKET.scene1_candidate_requirement.required_content_beats.beats.map(b => b.id); return ids.length === required.length && required.every(r => ids.includes(r)); })());
ok('scene1_candidate_requirement is explicit the baked scene’s presence is not approval of its quality/provenance', /not approval of its quality or provenance/i.test(PACKET.scene1_candidate_requirement.what_roman_actually_authored));
ok('the packet correctly records Roman did NOT personally write the baked scene (his own direct correction, 2026-09-17)', /did not write it/i.test(PACKET.scene1_candidate_requirement.what_roman_actually_authored));
ok('point_of_view / density_requirement / required_content_beats sections exist, fixing the real 2026-09-17 draft failure', !!(PACKET.scene1_candidate_requirement.point_of_view && PACKET.scene1_candidate_requirement.density_requirement && PACKET.scene1_candidate_requirement.required_content_beats));
ok('scene1_candidate_requirement requires a side-by-side review, never a silent substitution', /side by side/i.test(PACKET.scene1_candidate_requirement.review_framing));
ok('Lirael C+ grounds present', Array.isArray(PACKET.cplus_eplus_fusion_grounds.Lirael) && PACKET.cplus_eplus_fusion_grounds.Lirael.length === 2);
ok('Julian C+ grounds present', Array.isArray(PACKET.cplus_eplus_fusion_grounds.Julian) && PACKET.cplus_eplus_fusion_grounds.Julian.length === 2);
ok('Seren C+ grounds present (3 facets)', Array.isArray(PACKET.cplus_eplus_fusion_grounds.Seren) && PACKET.cplus_eplus_fusion_grounds.Seren.length === 3);
ok('five claim categories defined, including the new reviewable_package_interaction kind', Object.keys(PACKET.claim_categories).length === 5 && PACKET.claim_categories.generated_expression && PACKET.claim_categories.flagged_new_canon_candidate && PACKET.claim_categories.reviewable_package_interaction);

// ── SEVENTH PASS (Roman, 2026-09-17): mandatory causal-and-strategic revision present ──
ok('wish_twist_and_arrest_requirement section present with all 6 requirement bullets (REVISED 2026-09-20: split the recognition step into recognition + understanding-wrongly-fulfilled, per the real Attempt 8 wish-misalignment correction)', Array.isArray(PACKET.wish_twist_and_arrest_requirement && PACKET.wish_twist_and_arrest_requirement.requirement) && PACKET.wish_twist_and_arrest_requirement.requirement.length === 6);
ok('wish_twist_and_arrest_requirement cites the shared fatelands_ordinary_wish_misalignment governing_law', PACKET.wish_twist_and_arrest_requirement.governing_law && PACKET.wish_twist_and_arrest_requirement.governing_law.law_id === 'fatelands_ordinary_wish_misalignment' && PACKET.wish_twist_and_arrest_requirement.governing_law.file === '_fatelands_ordinary_wish_misalignment_law.json');
ok('wish_twist_and_arrest_requirement.hard_boundary explicitly bans the wrong attack-grammar visual (projectile, rift/seam, burst, beam, scorch)', /magical projectile, dark rift\/seam, burst, beam, scorch trail/.test(PACKET.wish_twist_and_arrest_requirement.hard_boundary));
ok('wish_twist_and_arrest_requirement declares banned_wrong_visual_grammar as the mechanical backstop', typeof PACKET.wish_twist_and_arrest_requirement.banned_wrong_visual_grammar === 'string' && /seam, rift, projectile, beam, scorch/.test(PACKET.wish_twist_and_arrest_requirement.banned_wrong_visual_grammar));
ok('wish_twist_and_arrest_requirement bans attributing the arrest to Julian/a named agent/an explained mechanism', /named agent/.test(PACKET.wish_twist_and_arrest_requirement.hard_boundary));
ok('required_content_beats now includes wish_visibly_twists, twist_unnaturally_arrested, and social_fallout_family_reaction (11 total, up from 8)', PACKET.scene1_candidate_requirement.required_content_beats.beats.length === 11 && PACKET.scene1_candidate_requirement.required_content_beats.beats.some(b => b.id === 'wish_visibly_twists') && PACKET.scene1_candidate_requirement.required_content_beats.beats.some(b => b.id === 'twist_unnaturally_arrested') && PACKET.scene1_candidate_requirement.required_content_beats.beats.some(b => b.id === 'social_fallout_family_reaction'));
ok('scene1_causal_sequence step 2 discloses its own supersession of the vaguer baked-scene wording, not a silent overwrite', !!PACKET.scene1_causal_sequence.find(s => s.step === 2).superseded_event_from_baked_scene);
ok('sealed_facts_forbidden_pre_surface includes the new twist_arrest_cause_unattributed companion rule', PACKET.sealed_facts_forbidden_pre_surface.some(f => f.id === 'twist_arrest_cause_unattributed'));
ok('oas_sequence_v3 includes julian_strategic_logic_requirement with all 5 strategic-logic bullets', Array.isArray(PACKET.oas_sequence_v3.julian_strategic_logic_requirement && PACKET.oas_sequence_v3.julian_strategic_logic_requirement.strategic_logic) && PACKET.oas_sequence_v3.julian_strategic_logic_requirement.strategic_logic.length === 5);
ok('julian_strategic_logic_requirement is explicitly subtext-only (inferable, never stated outright)', /never stated outright|INFERABLE/i.test(PACKET.oas_sequence_v3.julian_strategic_logic_requirement.hard_boundary + PACKET.oas_sequence_v3.julian_strategic_logic_requirement.status));
ok('julian_strategic_logic_requirement still forbids surfacing julian_counter_wish/julian_obscuring_wishes', /julian_counter_wish/.test(PACKET.oas_sequence_v3.julian_strategic_logic_requirement.hard_boundary));

// ── density-instruction strengthening + scene1/OAS boundary (Roman, 2026-09-17, following 2 real rejected drafts) ──
ok('density_requirement carries a worked too-thin/full-paragraph example, not just an abstract rule', !!(PACKET.scene1_candidate_requirement.density_requirement.worked_example && PACKET.scene1_candidate_requirement.density_requirement.worked_example.too_thin && PACKET.scene1_candidate_requirement.density_requirement.worked_example.full_paragraph));
ok('scene1_oas_boundary_requirement section present, citing the real rejected draft that motivated it', !!PACKET.scene1_oas_boundary_requirement && /v7_attempt2/.test(PACKET.scene1_oas_boundary_requirement.cites));

console.log('\n' + '='.repeat(70));
console.log(`FIRST SACRIFICE SOURCE PACKET VALIDATOR: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
