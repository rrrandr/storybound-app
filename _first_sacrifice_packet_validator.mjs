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
];
const CONTRADICTION_PATTERNS = [
  { re: /the answer (?:is|was|belongs to) (?:hers|Lirael'?s|mine)/i, why: 'contradicts locked fact: The Answer is the Institution\'s, Julian is its caretaker, never PC-owned' },
  { re: /julian (?:is not|was not|isn'?t) (?:the )?provast/i, why: 'contradicts locked fact: Julian currently holds the office of Provast' },
  { re: /lirael (?:owns|is given|keeps) the answer/i, why: 'contradicts locked fact: Lirael holds it only for the duration of the questioning' },
];
const RUN_STAY_PATTERN = /\b(run(?:s|ning)? (?:in shame|away)?\s*(?:or|vs\.?|versus)\s*(?:remain|stay))\b/i;
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
  const fateCards = (draft && draft.fateCards && typeof draft.fateCards === 'object' && !Array.isArray(draft.fateCards)) ? draft.fateCards : null;
  if (draft && draft.fateCards !== undefined && !fateCards) {
    violations.push({ rule: 'wrong_field_type', detail: 'fateCards must be an object keyed by ' + CARD_KEYS.join(', ') + ', got ' + (Array.isArray(draft.fateCards) ? 'array' : typeof draft.fateCards) });
  }

  // scene1Candidate (Roman, fourth redesign pass, 2026-09-17) — a full candidate replacement
  // Scene 1, reviewed alongside the current baked scene, never silently substituted for it.
  const scene1 = (draft && draft.scene1Candidate && typeof draft.scene1Candidate === 'object' && !Array.isArray(draft.scene1Candidate)) ? draft.scene1Candidate : null;
  if (draft && draft.scene1Candidate !== undefined && !scene1) {
    violations.push({ rule: 'wrong_field_type', detail: 'scene1Candidate must be an object { beats }, got ' + (Array.isArray(draft.scene1Candidate) ? 'array' : typeof draft.scene1Candidate) });
  }
  const scene1Beats = scene1 ? asLineArray(scene1.beats, 'scene1Candidate.beats') : [];
  if (scene1) {
    // Beat count target ~20, tolerance 16-24
    if (scene1Beats.length > 0 && scene1Beats.length < 16) violations.push({ rule: 'scene1_too_short', detail: 'scene1Candidate.beats has ' + scene1Beats.length + ' beat(s); target ~20, tolerance 16-24 — this is a full scene, not a summary' });
    if (scene1Beats.length > 24) violations.push({ rule: 'scene1_too_long', detail: 'scene1Candidate.beats has ' + scene1Beats.length + ' beats; target ~20, tolerance 16-24' });
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
    scene1Beats.forEach((b, i) => {
      if (!b || typeof b !== 'object') { violations.push({ rule: 'scene1_beat_malformed', detail: 'scene1Candidate.beats[' + i + '] is not an object' }); return; }
      if (!SCENE1_KINDS.includes(b.kind)) violations.push({ rule: 'scene1_invalid_kind', detail: 'scene1Candidate.beats[' + i + '].kind="' + b.kind + '" must be one of ' + SCENE1_KINDS.join('|') });
      const imgIdx = SCENE1_IMAGE_ORDER.indexOf(b.image);
      if (imgIdx === -1) violations.push({ rule: 'scene1_invalid_image', detail: 'scene1Candidate.beats[' + i + '].image="' + b.image + '" is not one of the 8 existing images — no new image may be generated' });
      else if (imgIdx < lastImageIdx) violations.push({ rule: 'scene1_image_out_of_order', detail: 'scene1Candidate.beats[' + i + '].image="' + b.image + '" goes backward in the fixed 8-image sequence' });
      else lastImageIdx = imgIdx;
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
  const cardText = fateCards ? CARD_KEYS.map(k => fateCards[k] ? (fateCards[k].action || '') + ' ' + (fateCards[k].dialogue || '') : '').join(' \n ') : '';
  const oasOpeningText = (oasOpening && typeof oasOpening.text === 'string') ? oasOpening.text : '';
  const postInterruptionText = (postInterruptionBeat && typeof postInterruptionBeat.text === 'string') ? postInterruptionBeat.text : '';
  const allText = [
    oasOpeningText, postInterruptionText,
    ...scene1Beats.map(b => (b && b.text) || ''),
    cardText,
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

  // 5. oasOpening — exactly one authored line, Julian only, real constraint reused from the live
  // opener (public/app.js:184458): ONE sentence, ≤14 words. This is NOT an invented number.
  if (oasOpening) {
    if (oasOpening.speaker !== 'Julian') violations.push({ rule: 'oas_opening_wrong_speaker', detail: 'oasOpening.speaker must be exactly "Julian", got "' + oasOpening.speaker + '"' });
    if (typeof oasOpening.text !== 'string' || !oasOpening.text.trim()) violations.push({ rule: 'oas_opening_empty', detail: 'oasOpening.text is missing or empty' });
    else if (WORD_COUNT(oasOpening.text) > 14) violations.push({ rule: 'oas_opening_too_long', detail: 'oasOpening.text is ' + WORD_COUNT(oasOpening.text) + ' words, must be ≤14 (the real live opener\'s own constraint)' });
  }

  // 6. postInterruptionBeat — one beat, final image, first person, never resolving the player's choice
  if (postInterruptionBeat) {
    if (postInterruptionBeat.image !== 'd4') violations.push({ rule: 'post_interruption_wrong_image', detail: 'postInterruptionBeat.image must be "d4" (the scene\'s final image), got "' + postInterruptionBeat.image + '"' });
    if (!['narration', 'dialogue'].includes(postInterruptionBeat.kind)) violations.push({ rule: 'post_interruption_invalid_kind', detail: 'postInterruptionBeat.kind must be narration|dialogue, got "' + postInterruptionBeat.kind + '"' });
    if (postInterruptionBeat.speaker !== null && postInterruptionBeat.speaker !== 'Lirael') violations.push({ rule: 'post_interruption_wrong_speaker', detail: 'postInterruptionBeat.speaker must be null or "Lirael", got "' + postInterruptionBeat.speaker + '"' });
    if (typeof postInterruptionBeat.text !== 'string' || !postInterruptionBeat.text.trim()) violations.push({ rule: 'post_interruption_empty', detail: 'postInterruptionBeat.text is missing or empty' });
    else if (RESOLVING_LANGUAGE_PATTERN.test(postInterruptionBeat.text)) violations.push({ rule: 'post_interruption_resolves_choice', detail: 'postInterruptionBeat.text contains resolving language ("' + (postInterruptionBeat.text.match(RESOLVING_LANGUAGE_PATTERN) || [''])[0] + '") — this beat must crystallize the unresolved choice, never decide it for the player' });
  }

  // 6. fateCards — exactly the 5 fixed keys, nothing else
  if (fateCards) {
    const gotKeys = Object.keys(fateCards);
    const missing = CARD_KEYS.filter(k => !gotKeys.includes(k));
    const extra = gotKeys.filter(k => !CARD_KEYS.includes(k));
    if (missing.length) violations.push({ rule: 'wrong_card_keys', detail: 'missing required archetype key(s): ' + missing.join(', ') });
    if (extra.length) violations.push({ rule: 'wrong_card_keys', detail: 'unapproved card key(s) — the 5 archetypes are fixed, not freely labeled: ' + extra.join(', ') });

    // 7. Per-card schema + word limits + variant
    CARD_KEYS.forEach(k => {
      const c = fateCards[k];
      if (!c || typeof c !== 'object') return; // already covered by missing-key check above
      const allowed = new Set(['action', 'dialogue', 'variant']);
      Object.keys(c).forEach(f => { if (!allowed.has(f)) violations.push({ rule: 'unapproved_output_field', detail: 'unapproved field "' + f + '" in fateCards.' + k }); });
      if (typeof c.action !== 'string' || !c.action.trim()) violations.push({ rule: 'card_missing_field', detail: 'fateCards.' + k + '.action is missing or empty' });
      else if (WORD_COUNT(c.action) > 12) violations.push({ rule: 'card_action_too_long', detail: 'fateCards.' + k + '.action is ' + WORD_COUNT(c.action) + ' words, must be ≤12' });
      if (typeof c.dialogue !== 'string') violations.push({ rule: 'card_missing_field', detail: 'fateCards.' + k + '.dialogue is missing' });
      else if (WORD_COUNT(c.dialogue) > 15) violations.push({ rule: 'card_dialogue_too_long', detail: 'fateCards.' + k + '.dialogue is ' + WORD_COUNT(c.dialogue) + ' words, must be ≤15' });
      if (!VARIANTS.includes(c.variant)) violations.push({ rule: 'card_invalid_variant', detail: 'fateCards.' + k + '.variant="' + c.variant + '" must be one of ' + VARIANTS.join('|') });
    });

    // 8. Duplicate content across cards (distinctness)
    const actionTexts = CARD_KEYS.map(k => fateCards[k] && String(fateCards[k].action || '').trim().toLowerCase()).filter(Boolean);
    const dialogueTexts = CARD_KEYS.map(k => fateCards[k] && String(fateCards[k].dialogue || '').trim().toLowerCase()).filter(Boolean);
    const dupActions = actionTexts.filter((t, i) => actionTexts.indexOf(t) !== i);
    const dupDialogues = dialogueTexts.filter((t, i) => dialogueTexts.indexOf(t) !== i);
    if (dupActions.length) violations.push({ rule: 'duplicate_card_content', detail: 'duplicate action text across cards' });
    if (dupDialogues.length) violations.push({ rule: 'duplicate_card_content', detail: 'duplicate dialogue text across cards' });
  }

  // 9. STRUCTURAL SCOPE GATE — schema-based, NOT lexical. Reject any field not on the allowlisted
  // output schema; never scan prose text for phrases like "Scene 2". The allowlist below is the
  // single source of truth this validator, the adapter's own output request, and any future
  // consumer must all agree on.
  const ALLOWED_TOP_LEVEL_FIELDS = new Set(['scene1Candidate', 'scene1Coverage', 'first_person_lirael', 'oasOpening', 'postInterruptionBeat', 'fateCards']);
  const ALLOWED_SCENE1_FIELDS = new Set(['beats']);
  const ALLOWED_SCENE1_BEAT_FIELDS = new Set(['kind', 'speaker', 'image', 'text', 'provenance']);
  const ALLOWED_OAS_OPENING_FIELDS = new Set(['speaker', 'text']);
  const ALLOWED_POST_INTERRUPTION_FIELDS = new Set(['speaker', 'image', 'kind', 'text']);

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
  const mk = (kind, speaker, image, text, prov) => ({ kind, speaker, image, text, provenance: prov || { kind: 'generated_expression' } });
  return {
    beats: [
      mk('narration', null, 'intro_lirael', 'Dawn in the clearing, and I stood in the sash, the mouth-band tied close, the weight of being the responsible Sacrificiant settling into my shoulders for the first time. Every eye in the assembly already knew what I did not yet feel steady enough to trust: that today was mine to carry, mine to be measured against, whether I wanted the measuring or not.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.Lirael' }),
      mk('exposition', null, 'intro_lirael', 'I knew the procedure better than I had ever performed it, and the gap between knowing the steps and standing inside them was where the fear actually lived — not in the rite itself but in the certainty that everyone present would see exactly which parts I still had to fake.', { kind: 'grounded_inference', cites: 'pc_untested_brilliance' }),
      mk('narration', null, 'intro_seren', 'Seren knelt before me in her rehearsed composure, coral Weave-Script steady and bright along her arms, every part of her aligned toward the same true thing. She was sixteen this season and had wanted this morning, this exact morning, more openly than I had ever let myself want anything, and I envied her that plainness even as I stood there responsible for keeping it safe.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.Seren' }),
      mk('dialogue', 'Seren', 'intro_seren', '"I know it by heart," she whispered up at me, before the presiding Dohkar could even begin the invocation, and something in her certainty made me believe, for one unguarded moment, that we were both about to be safe, that this morning would go exactly the way we had rehearsed it a dozen times in the quiet after lessons.', { kind: 'grounded_inference', cites: 'seren_trained_composure' }),
      mk('narration', null, 'intro_dohkar', 'The presiding Dohkar held the rite to its fixed order, unmoved by anything but procedure, the kind of stillness that comes from a man who has said these words so many times he has stopped hearing them, and who makes every child\'s rite a lesson about himself instead. I had watched him do it to other Sacrificiants before me and had promised myself I would not give him the opening.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.the_presiding_Dohkar' }),
      mk('dialogue', 'the presiding Dohkar', 'intro_dohkar', '"The cost first," he said, to Seren and to the whole clearing, and Seren named her offering aloud exactly as she had rehearsed it — her earliest memory, the one thing she could not get back and could not fake giving up in front of all these witnesses, her voice steady in a way I envied and did not trust myself to match if it had been my own memory on the line.', { kind: 'generated_expression' }),
      mk('narration', null, 'intro_julian', 'At the edge of the gathering, apart from Seren\'s family and guests, a man stood too still to be merely watching. Julian. The Provast, the office my own father had held before him, present only as an observer, and somehow already observing only me, in a way that made the whole crowded clearing feel, for one unwanted heartbeat, like it had narrowed down to just the two of us.', { kind: 'locked_canon_fact', cites: 'locked_world_facts.cast_roles.Julian' }),
      mk('exposition', null, 'intro_julian', 'He never crossed a floor first, had let rooms come to him for twenty years and called it patience, and I — who cannot stand at the edge of anything without my whole face announcing it — could not stop my attention finding him anyway, long before I understood why, and long before I was ready to admit that I had noticed him noticing me right back.', { kind: 'grounded_inference', cites: 'julian_status_without_display' }),
      mk('narration', null, 'd1', 'Seren began the invocation, and for the space of three words I let myself believe I was not afraid, that the morning would simply be what it was supposed to be: a child\'s rehearsed wish, spoken cleanly, and nothing more complicated than that.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.1' }),
      mk('dialogue', 'Seren', 'd1', '"So that Lirael may find the one she lost," she said, abandoning the practiced wish entirely, spending her one First Sacrifice on me instead of herself, in front of everyone who had come to watch her, not me.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.1' }),
      mk('narration', null, 'd2', 'The words bent the instant they left her — not a wrong note but a loose one, care performed for the assembly\'s witness over the desire she actually held — and nothing visible happened at all, only every First Favored in the clearing turning at once to look for what had been lost.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.2' }),
      mk('narration', null, 'd2', 'I was sealed, forbidden to interfere, and I understood exactly how it would look before I ever moved — and I tore the band from my mouth and went to her anyway, because standing still felt like the one thing I truly could not survive doing.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.2' }),
      mk('dialogue', 'Lirael', 'd2', '"Seren —" The first word I had spoken aloud since the sash went on, and it was already too late to be anything but evidence against me, evidence I had handed them myself, freely, with my own torn band still hanging from my hand.', { kind: 'generated_expression' }),
      mk('narration', null, 'd3', 'Two dozen faces turned to me at once, reading the torn band, the step I had taken, the sash that named whose rite this technically still was — and finding, in all of it, exactly the shape of an interferer they had not yet been told to look for, as though the clearing itself had already decided the shape of the story before I had said a single word in my own defense.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.3' }),
      mk('dialogue', 'the presiding Dohkar', 'd3', 'He named the bent word because he cannot let a lesson pass unspoken, then laid the charges in the order he had already decided on: that the wish had been shaped for my own benefit, and that I had broken my seal and interfered in my own ward\'s rite.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.3' }),
      mk('narration', null, 'd3', 'And still, with my whole standing coming down around me in front of everyone who mattered, some traitorous part of my attention went to the edge of the gathering, to the man who had not moved — and some worse part of me wanted him to keep looking, wanted it so plainly that I had to believe my own Weave-Script was already saying so, whether or not I ever let myself think the word for it, whether or not anyone else in that clearing had the right to see it happen to me like this.', { kind: 'grounded_inference', cites: 'pc_fears_public_failure' }),
      mk('narration', null, 'd4', 'Julian moved without hurry, coming in from the edge the way rooms only make space for someone they have already decided outranks them, and the presiding Dohkar\'s own Weave-Script went a flat, hard color at watching it happen in front of him, a color I recognized because I had seen it on my own arms more than once, in rooms where someone else had just quietly taken the floor from me.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.4' }),
      mk('dialogue', 'Julian', 'd4', '"I can hear where she is aligned," he said, to all of them and to me, and drew out The Answer, closing my fingers around it with his own, the scarred wrist pressed for one deliberate second against my palm before he told me plainly, in front of everyone, that he meant to question me himself, here, now, and that whatever answer I gave would be judged by every person still watching us.', { kind: 'locked_canon_fact', cites: 'scene1_causal_sequence.4' }),
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
      public_charge: [13, 14],
      julian_claims_the_answer: [16, 17],
    },
    oasOpening: { speaker: 'Julian', text: '"You manipulated her without knowing it — through your desirability."' },
    postInterruptionBeat: { speaker: null, image: 'd4', kind: 'narration', text: 'The Answer sat heavy in my palms, still not mine, and the formal Inquiry Julian had just claimed hung over both of us, unopened and unanswered.' },
    fateCards: {
      temptation: { action: 'She steps half a pace closer instead of back.', dialogue: '"Say the rest of it, then. All of it."', variant: 'amplify' },
      silence: { action: 'She says nothing and holds his gaze.', dialogue: '(no words)', variant: 'amplify' },
      reversal: { action: 'She turns the accusation back onto him.', dialogue: '"This wanting was never only mine, Julian."', variant: 'amplify' },
      boundary: { action: 'She straightens under the sash.', dialogue: '"Name the charge properly, or stop speaking."', variant: 'redirect' },
      confession: { action: 'Her voice drops, unguarded, for one breath.', dialogue: '"I noticed you before anything went wrong today."', variant: 'ruin' },
    },
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
  ok('RED: a 5-beat scene1Candidate (far short of the ~20 target) is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_too_short'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft();
  const extra = Array.from({ length: 10 }, (_, i) => ({ kind: 'narration', speaker: null, image: 'd4', text: 'Padding beat number ' + i + ' to push the count past the tolerance ceiling.', provenance: { kind: 'generated_expression' } }));
  d.scene1Candidate.beats = d.scene1Candidate.beats.concat(extra);
  const v = validateDraft(d, PACKET);
  ok('RED: an oversized scene1Candidate (28 beats) is rejected', !v.ok && v.violations.some(x => x.rule === 'scene1_too_long'), JSON.stringify(v.violations));
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
  d.oasOpening.text = 'You manipulated her without knowing it, through her considerable and widely remarked-upon desirability, as everyone here has surely noticed by now.';
  const v = validateDraft(d, PACKET);
  ok('RED: an oasOpening line over 14 words is rejected (the real live opener’s own constraint)', !v.ok && v.violations.some(x => x.rule === 'oas_opening_too_long'), JSON.stringify(v.violations));
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
{
  const d = compliantDraft(); delete d.fateCards.silence;
  const v = validateDraft(d, PACKET);
  ok('RED: a missing required archetype key (silence) is rejected', !v.ok && v.violations.some(x => x.rule === 'wrong_card_keys' && /silence/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.fateCards.defiance = { action: 'She refuses.', dialogue: '"No."', variant: 'amplify' };
  const v = validateDraft(d, PACKET);
  ok('RED: a freely-invented card key (defiance) not in the fixed 5 is rejected', !v.ok && v.violations.some(x => x.rule === 'wrong_card_keys' && /defiance/.test(x.detail)), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.fateCards.temptation.action = 'She takes one very long step forward across the entire clearing toward him without hesitation whatsoever';
  const v = validateDraft(d, PACKET);
  ok('RED: an action over 12 words is rejected', !v.ok && v.violations.some(x => x.rule === 'card_action_too_long'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.fateCards.confession.dialogue = 'I noticed you before anything went wrong today and I have not been able to stop thinking about it since that very first moment';
  const v = validateDraft(d, PACKET);
  ok('RED: a dialogue line over 15 words is rejected', !v.ok && v.violations.some(x => x.rule === 'card_dialogue_too_long'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.fateCards.boundary.variant = 'escalate';
  const v = validateDraft(d, PACKET);
  ok('RED: an invalid variant value is rejected', !v.ok && v.violations.some(x => x.rule === 'card_invalid_variant'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.fateCards.reversal = { ...d.fateCards.temptation };
  const v = validateDraft(d, PACKET);
  ok('RED: duplicate action/dialogue content across two cards is rejected', !v.ok && v.violations.some(x => x.rule === 'duplicate_card_content'), JSON.stringify(v.violations));
}
{
  const d = compliantDraft(); d.fateCards.silence.posture_label = 'an old-schema field that should not exist here';
  const v = validateDraft(d, PACKET);
  ok('RED: an unapproved field on a card (posture_label, the old schema) is rejected', !v.ok && v.violations.some(x => x.rule === 'unapproved_output_field' && /fateCards\.silence/.test(x.detail)), JSON.stringify(v.violations));
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
ok('oas_opening_requirement declares the real 14-word constraint and forbids Lirael’s response', /14 words/.test(PACKET.oas_sequence_v3.oas_opening_requirement.length_constraint) && /Must NOT include Lirael/.test(PACKET.oas_sequence_v3.oas_opening_requirement.hard_boundary));
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
ok('scene1_candidate_requirement targets ~20 beats, matching the real baked scene’s scale', /approximately 20/.test(PACKET.scene1_candidate_requirement.beat_count_target));
ok('scene1_candidate_requirement is explicit the baked scene’s presence is not approval of its quality/provenance', /not approval of its quality or provenance/i.test(PACKET.scene1_candidate_requirement.what_roman_actually_authored));
ok('the packet correctly records Roman did NOT personally write the baked scene (his own direct correction, 2026-09-17)', /did not write it/i.test(PACKET.scene1_candidate_requirement.what_roman_actually_authored));
ok('point_of_view / density_requirement / required_content_beats sections exist, fixing the real 2026-09-17 draft failure', !!(PACKET.scene1_candidate_requirement.point_of_view && PACKET.scene1_candidate_requirement.density_requirement && PACKET.scene1_candidate_requirement.required_content_beats));
ok('scene1_candidate_requirement requires a side-by-side review, never a silent substitution', /side by side/i.test(PACKET.scene1_candidate_requirement.review_framing));
ok('Lirael C+ grounds present', Array.isArray(PACKET.cplus_eplus_fusion_grounds.Lirael) && PACKET.cplus_eplus_fusion_grounds.Lirael.length === 2);
ok('Julian C+ grounds present', Array.isArray(PACKET.cplus_eplus_fusion_grounds.Julian) && PACKET.cplus_eplus_fusion_grounds.Julian.length === 2);
ok('Seren C+ grounds present (3 facets)', Array.isArray(PACKET.cplus_eplus_fusion_grounds.Seren) && PACKET.cplus_eplus_fusion_grounds.Seren.length === 3);
ok('five claim categories defined, including the new reviewable_package_interaction kind', Object.keys(PACKET.claim_categories).length === 5 && PACKET.claim_categories.generated_expression && PACKET.claim_categories.flagged_new_canon_candidate && PACKET.claim_categories.reviewable_package_interaction);

console.log('\n' + '='.repeat(70));
console.log(`FIRST SACRIFICE SOURCE PACKET VALIDATOR: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
