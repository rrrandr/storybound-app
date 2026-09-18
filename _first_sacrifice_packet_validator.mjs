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
// THE ANSWER — OBJECT-FIDELITY GUARD (Roman, 2026-09-19). Hard constraint, not a style suggestion:
// The Answer is a staff (double-ended shaft/polearm) with a question-mark-shaped hook at each end —
// NEVER a stone, gem, orb, crystal, or any other handheld relic. Scoped to same-text co-occurrence:
// fires only when a beat/opener/post-interruption text mentions "The Answer" AND a banned-form word
// IN THAT SAME TEXT — a neutral reference to The Answer elsewhere, or an unrelated object described
// with one of these words with no mention of The Answer in that same text, is never flagged. Matches
// the real, historical failure shape (every drift found was the SAME sentence/beat naming both).
const THE_ANSWER_RE = /\bThe Answer\b/;
const THE_ANSWER_BANNED_FORM_RE = /\b(stones?|gem(?:stones?)?|orbs?|crystals?|rocks?|pebbles?|jewels?)\b/i;
function _theAnswerFormViolation(text) {
  const t = String(text || '');
  if (!THE_ANSWER_RE.test(t)) return null;
  const m = t.match(THE_ANSWER_BANNED_FORM_RE);
  return m ? m[0] : null;
}
// WIDENED (Roman, 2026-09-19): the same-text check above is a real guard but is trivially evaded by
// adjacent sentences, pronouns, or a beat split — "It was cold stone in my hands. The Answer dragged
// at my wrist." reads as one physical claim about The Answer even split across two beats, neither of
// which alone contains both the name and the banned word. This checks every CONSECUTIVE PAIR of
// scene1Candidate beats: if EITHER beat of the pair names The Answer and EITHER beat of that SAME
// pair carries a banned-form word, the pair is flagged — regardless of which beat carries which, and
// regardless of pronoun use in the beat that doesn't name it. Bounded to one-beat lookback/lookahead
// (a disclosed limit, not a claim every possible cross-beat coreference is caught — the MANDATORY
// objectClaims metadata below is the real structural closure; this is defense in depth).
function _theAnswerAdjacentPairViolations(beats) {
  const hits = [];
  if (!Array.isArray(beats)) return hits;
  for (let i = 0; i < beats.length - 1; i++) {
    const tA = String((beats[i] && beats[i].text) || '');
    const tB = String((beats[i + 1] && beats[i + 1].text) || '');
    const namesA = THE_ANSWER_RE.test(tA), namesB = THE_ANSWER_RE.test(tB);
    if (!namesA && !namesB) continue;
    // Skip pairs already fully caught by the same-text check on a single beat — only report when
    // the name and the banned word are split ACROSS the two beats (avoids double-reporting the
    // same-beat case under two different rules).
    const sameTextAlreadyCaught = (namesA && THE_ANSWER_BANNED_FORM_RE.test(tA)) || (namesB && THE_ANSWER_BANNED_FORM_RE.test(tB));
    if (sameTextAlreadyCaught) continue;
    const mA = tA.match(THE_ANSWER_BANNED_FORM_RE), mB = tB.match(THE_ANSWER_BANNED_FORM_RE);
    const hit = mA || mB;
    if (hit) hits.push({ i, j: i + 1, word: hit[0] });
  }
  return hits;
}
// ── STRUCTURED PER-BEAT OBJECT-CLAIM METADATA (Roman, 2026-09-19) — the real structural closure.
// See packet scene1_answer_object_claim_schema for the full schema. Summary: ANY beat/oasOpening/
// postInterruptionBeat text that literally names "The Answer" MUST carry an objectClaims array with
// exactly one entry {object_ref:"the_answer", physical_form_claim, claim_kind, cites?}.
// physical_form_claim is a CLOSED ENUM (neutral_reference | the one canonical token) — never free
// text — so a conflicting form claim cannot be smuggled through the metadata channel either.
const ANSWER_OBJECT_REF = 'the_answer';
const ANSWER_FORM_CLAIM_VALUES = new Set(['neutral_reference', 'staff_double_ended_question_mark_hooks']);
const PROVENANCE_KINDS = new Set(['locked_canon_fact', 'grounded_inference', 'generated_expression']);
const ALLOWED_OBJECT_CLAIM_FIELDS = new Set(['object_ref', 'physical_form_claim', 'claim_kind', 'cites']);
// Validates one {where} field's objectClaims against its text — pushes violations, returns nothing.
function _validateAnswerObjectClaims(text, objectClaims, where, violations) {
  const namesAnswer = THE_ANSWER_RE.test(String(text || ''));
  const claims = Array.isArray(objectClaims) ? objectClaims : (objectClaims == null ? [] : null);
  if (claims === null) { violations.push({ rule: 'the_answer_claim_malformed', detail: where + '.objectClaims must be an array' }); return; }
  const answerClaims = claims.filter(c => c && c.object_ref === ANSWER_OBJECT_REF);
  if (namesAnswer && answerClaims.length === 0) {
    violations.push({ rule: 'the_answer_missing_object_metadata', detail: where + ' names The Answer but carries no objectClaims entry for object_ref="the_answer" — required disclosure whenever the object appears materially, not optional' });
  }
  claims.forEach((c, ci) => {
    if (!c || typeof c !== 'object') { violations.push({ rule: 'the_answer_claim_malformed', detail: where + '.objectClaims[' + ci + '] is not an object' }); return; }
    const extra = Object.keys(c).filter(k => !ALLOWED_OBJECT_CLAIM_FIELDS.has(k));
    if (extra.length) violations.push({ rule: 'unapproved_output_field', detail: 'unapproved field(s) "' + extra.join(', ') + '" in ' + where + '.objectClaims[' + ci + ']' });
    if (c.object_ref !== ANSWER_OBJECT_REF) { violations.push({ rule: 'unapproved_object_ref', detail: where + '.objectClaims[' + ci + '].object_ref="' + c.object_ref + '" is not a recognized object — this packet tracks only "the_answer"' }); return; }
    if (!ANSWER_FORM_CLAIM_VALUES.has(c.physical_form_claim)) {
      violations.push({ rule: 'the_answer_physical_claim_invalid', detail: where + '.objectClaims[' + ci + '].physical_form_claim="' + c.physical_form_claim + '" is not an approved value — must be exactly "neutral_reference" or the locked canonical-form token "staff_double_ended_question_mark_hooks"; free-text form descriptions are never permitted here' });
      return;
    }
    if (!PROVENANCE_KINDS.has(c.claim_kind)) {
      violations.push({ rule: 'the_answer_claim_provenance_invalid', detail: where + '.objectClaims[' + ci + '].claim_kind="' + c.claim_kind + '" must be one of ' + [...PROVENANCE_KINDS].join('|') });
    } else if (c.physical_form_claim === 'staff_double_ended_question_mark_hooks') {
      if (c.claim_kind !== 'locked_canon_fact') violations.push({ rule: 'the_answer_claim_provenance_invalid', detail: where + '.objectClaims[' + ci + '] restates the canonical form but claim_kind is "' + c.claim_kind + '", not "locked_canon_fact" — restating a locked fact is always a citation, never a free invention' });
      else if (!c.cites) violations.push({ rule: 'the_answer_claim_provenance_invalid', detail: where + '.objectClaims[' + ci + '] restates the canonical form as locked_canon_fact but has no cites' });
    }
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
      // TIGHTENED 55-110 -> 60-90 (Roman, 2026-09-17, following attempt 4's 14-beat undershoot).
      const qualifyingNarrationBeats = narrationBeats.filter(({ b }) => { const n = wc(b.text); return n >= 60 && n <= 90; });
      if (qualifyingNarrationBeats.length < 12) {
        violations.push({ rule: 'scene1_insufficient_narration_density', detail: 'only ' + qualifyingNarrationBeats.length + ' of ' + narrationBeats.length + ' narration/exposition beats are 60-90 words each (need at least 12) — a few long beats cannot cover for many thin ones; this is checked PER-BEAT, independent of the total-word floor' });
      }
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
        violations.push({ rule: 'exemplar_verbatim_copy', detail: 'scene1Candidate contains a 6+ word verbatim match against the non-canonical twist_and_arrest exemplar — craft reference only, never to be quoted or closely copied' });
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
      violations.push({ rule: 'the_answer_form_violation', detail: 'scene1Candidate.beats[' + h.i + '] and beats[' + h.j + '] together name The Answer and carry a banned physical form ("' + h.word + '") split across adjacent beats — The Answer is a staff (double-ended shaft) with a question-mark-shaped hook at each end, never a stone/gem/orb/crystal/other handheld relic (packet locked_world_facts.the_answer)' });
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
      // THE ANSWER — OBJECT-FIDELITY (Roman, 2026-09-19, HARD): a locked canonical fact, not a
      // style suggestion. See packet locked_world_facts.the_answer.hard_boundary and
      // scene1_answer_object_claim_schema. Fast same-text guard + mandatory structured metadata.
      { const _taHit = _theAnswerFormViolation(b.text);
        if (_taHit) violations.push({ rule: 'the_answer_form_violation', detail: 'scene1Candidate.beats[' + i + '] mentions The Answer alongside a banned physical form ("' + _taHit + '") — The Answer is a staff (double-ended shaft) with a question-mark-shaped hook at each end, never a stone/gem/orb/crystal/other handheld relic (packet locked_world_facts.the_answer)' }); }
      _validateAnswerObjectClaims(b.text, b.objectClaims, 'scene1Candidate.beats[' + i + ']', violations);
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
        violations.push({ rule: 'exemplar_verbatim_copy', detail: 'oasOpening contains a 6+ word verbatim match against the non-canonical julian_opening_turn exemplar — craft reference only, never to be quoted or closely copied' });
      }
      const _taHitOas = _theAnswerFormViolation(oasOpening.text);
      if (_taHitOas) violations.push({ rule: 'the_answer_form_violation', detail: 'oasOpening.text mentions The Answer alongside a banned physical form ("' + _taHitOas + '") — The Answer is a staff (double-ended shaft) with a question-mark-shaped hook at each end, never a stone/gem/orb/crystal/other handheld relic (packet locked_world_facts.the_answer)' });
      _validateAnswerObjectClaims(oasOpening.text, oasOpening.objectClaims, 'oasOpening', violations);
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
      if (_taHitPib) violations.push({ rule: 'the_answer_form_violation', detail: 'postInterruptionBeat.text mentions The Answer alongside a banned physical form ("' + _taHitPib + '") — The Answer is a staff (double-ended shaft) with a question-mark-shaped hook at each end, never a stone/gem/orb/crystal/other handheld relic (packet locked_world_facts.the_answer)' });
      _validateAnswerObjectClaims(postInterruptionBeat.text, postInterruptionBeat.objectClaims, 'postInterruptionBeat', violations);
    }
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

  return { ok: violations.length === 0, violations };
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
      mk('narration', null, 'd2', 'It should have reached me. I had already begun bracing for whatever a wrongly-spent First Sacrifice does to the person it lands on — and then it was simply gone, cut off mid-motion the way a held breath stops when someone else decides you may exhale. Nothing scorched. Nothing cried out. The spiralgrass went still under my feet. My own Weave-Script, which had been a heartbeat from telling the whole clearing exactly what I felt, dimmed instead, and I had no way to account for why, or for whose hand had reached in ahead of mine.', { kind: 'generated_expression' }),
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
// ── EXEMPLAR VERBATIM-COPY GUARD (Roman, 2026-09-17 follow-up): attempt4_positive_exemplars are
// non-canonical, craft-reference-only — quoting or closely copying them is a hard failure. ──
{
  const d = compliantDraft();
  d.scene1Candidate.beats[12].text = 'No flare, no sound, no hand I could point to. The spiralgrass stilled, and I had no way to explain any of it to anyone watching.';
  const v = validateDraft(d, PACKET);
  ok('RED: a scene1Candidate beat that verbatim-copies 6+ consecutive words from the non-canonical twist_and_arrest exemplar is rejected', !v.ok && v.violations.some(x => x.rule === 'exemplar_verbatim_copy'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  d.oasOpening.text = 'You glanced toward me three times during the invocation, fingers tightening on the sash each time Seren faltered, and I have not stopped thinking about it since.';
  const v = validateDraft(d, PACKET);
  ok('RED: an oasOpening that verbatim-copies 6+ consecutive words from the non-canonical julian_opening_turn exemplar is rejected', !v.ok && v.violations.some(x => x.rule === 'exemplar_verbatim_copy'), JSON.stringify(v.violations));
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
  ok('SCOPE: a banned form word ("gemstone") with an implied but not literally-named Answer reference in oasOpening is NOT flagged — the guard\'s documented scope is explicit "The Answer" co-occurrence in the same text, not inference across an antecedent', !hit, JSON.stringify(hit));
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
  d.scene1Candidate.beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'staff_double_ended_question_mark_hooks', claim_kind: 'locked_canon_fact', cites: 'locked_world_facts.the_answer' }];
  const v = validateDraft(d, PACKET);
  const answerViolationsCanon = v.violations.filter(x => x.rule.startsWith('the_answer_'));
  ok('CANONICAL: a valid staff/double-ended/question-mark-hooks claim, cited as locked_canon_fact, is fully accepted by every the_answer_* rule', answerViolationsCanon.length === 0, JSON.stringify(answerViolationsCanon));
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
ok('wish_twist_and_arrest_requirement section present with all 5 requirement bullets', Array.isArray(PACKET.wish_twist_and_arrest_requirement && PACKET.wish_twist_and_arrest_requirement.requirement) && PACKET.wish_twist_and_arrest_requirement.requirement.length === 5);
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
