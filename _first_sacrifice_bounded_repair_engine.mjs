#!/usr/bin/env node
// FIRST SACRIFICE — BOUNDED REPAIR ENGINE (Roman, 2026-09-20, post-Attempt-6 operational redesign)
//
// Six real attempts (751/425/381/943/1035/751 words, all rejected) prove that a single blind
// primary call — even with an explicit end-of-prompt self-check reminder — is not a reliable way
// to satisfy this operation's own word-count contract. All six real completions finished with
// finish_reason "stop" at 1570-2412 completion tokens against an 8000-token ceiling: this is
// GENUINE MODEL EARLY COMPLETION, not truncation (see _first_sacrifice_truncation_capacity_proof.mjs
// and REPORT_bounded_repair_design.md for the full trace). A second full-scene call does not fix
// that; a SURGICAL, BOUNDED repair of only the specific under-length slots does not re-roll the
// whole draft and gives the model a narrow, concrete, already-scoped task instead.
//
// This module is PURE — no network calls, no provider SDKs, no randomness. Every function here is
// deterministic given its inputs. It is imported by _first_sacrifice_draft_authoring_run.mjs (the
// real, paid run script — NOT executed by this module or by its control script) and exercised
// entirely dry by _first_sacrifice_bounded_repair_engine_control.mjs.
//
// Design (Roman's spec, 2026-09-20):
//   1. measureBeatDeficiencies — locally measures EVERY beat's real prose word count against its
//      OWN assigned slot target (scene1_beat_number_template.slots[i].wordRange), not just the
//      scene-level total. Also detects STRUCTURAL drift (wrong beat count, image/kind mismatch
//      against the locked template) and marks the draft non-repairable in that case — a bounded
//      repair only ever targets word-count deficiency on an otherwise-correct structure; it must
//      never be asked to invent, reorder, or reassign beats.
//   2. buildRepairPrompt / buildRepairFallbackChain — a repair request that names ONLY the
//      deficient slots (by their locked slot number "n"), carries the full accepted draft as
//      read-only context for continuity, and demands a structured replacement list — never a
//      whole-scene rewrite, never new canon, never a touch on oasOpening or postInterruptionBeat.
//   3. mergeRepairIntoDraft — merges the repair response back into the primary draft LOCALLY (no
//      provider call). Enforces the repair's own bounded contract mechanically: only 'n' and
//      'text' fields are ever accepted per entry; every named entry must match a slot flagged
//      deficient by step 1; every flagged slot must be covered; any unapproved field, any
//      unflagged slot, any missing slot, or a malformed response rejects the WHOLE merge (fails
//      closed — never a partial, silently-incomplete merge).
//
// The caller (the real run script) is responsible for: running the REAL validator against the
// merged candidate after step 3, and rejecting with ZERO package write if it still fails — this
// module never marks anything "approved" itself.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 1. LOCAL PER-BEAT MEASUREMENT ───────────────────────────────────────────────────────────
function wordCount(t) {
  return typeof t === 'string' ? t.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function measureBeatDeficiencies(scene1Candidate, packet) {
  const bnt = packet.scene1_beat_number_template;
  const totalFloor = bnt.slots.reduce((n, s) => n + s.wordRange[0], 0);
  const beats = scene1Candidate && Array.isArray(scene1Candidate.beats) ? scene1Candidate.beats : null;

  if (!beats || beats.length !== bnt.slots.length) {
    return {
      structurallyRepairable: false,
      reason: 'beat count is ' + (beats ? beats.length : 'missing') + ', expected EXACTLY ' + bnt.slots.length +
        ' — a beat-count mismatch is a STRUCTURAL failure (wrong shape entirely, e.g. real attempts 3 and 4 ' +
        'returned 16 and 14 beats), not a per-beat density deficiency. Bounded repair only ever targets word ' +
        'count on an otherwise-correct structure; a wrong beat count must be rejected and re-attempted from ' +
        'the primary tier, never patched by this engine.',
      deficiencies: [], totalWords: beats ? beats.reduce((n, b) => n + wordCount(b && b.text), 0) : 0, totalFloor,
    };
  }

  const drift = [];
  bnt.slots.forEach((slot, i) => {
    const beat = beats[i];
    if (!beat || typeof beat.text !== 'string') { drift.push('slot ' + slot.n + ': beat is missing or has no text'); return; }
    if (beat.image !== slot.image) drift.push('slot ' + slot.n + ': image is "' + beat.image + '", locked template requires "' + slot.image + '"');
    if (slot.kind !== 'narration_or_dialogue' && beat.kind !== slot.kind) drift.push('slot ' + slot.n + ': kind is "' + beat.kind + '", locked template requires "' + slot.kind + '"');
  });
  if (drift.length > 0) {
    return {
      structurallyRepairable: false,
      reason: 'beat count matches (' + beats.length + ') but the locked image/kind mapping has drifted from ' +
        'scene1_beat_number_template — bounded repair only targets word-count deficiency on an otherwise-' +
        'correct structure, it is never authorized to reassign a beat\'s image or kind: ' + drift.join('; '),
      deficiencies: [], totalWords: beats.reduce((n, b) => n + wordCount(b && b.text), 0), totalFloor,
    };
  }

  let totalWords = 0;
  const deficiencies = [];
  bnt.slots.forEach((slot, i) => {
    const beat = beats[i];
    const words = wordCount(beat.text);
    totalWords += words;
    if (words < slot.wordRange[0]) {
      deficiencies.push({
        n: slot.n, id: slot.id, image: slot.image, kind: slot.kind, wordRange: slot.wordRange, fn: slot.fn,
        actualWords: words, deficitWords: slot.wordRange[0] - words,
      });
    }
  });
  return { structurallyRepairable: true, deficiencies, totalWords, totalFloor, totalBelowFloor: totalWords < 1100 };
}

// ── 2. BOUNDED REPAIR REQUEST ───────────────────────────────────────────────────────────────
export function buildRepairPrompt(packet, primaryDraft, deficiencies) {
  if (!deficiencies || deficiencies.length === 0) {
    throw new Error('buildRepairPrompt: no deficient slots given — nothing to repair; the caller must not invoke a repair pass when measureBeatDeficiencies found none');
  }
  const beats = primaryDraft.scene1Candidate.beats;
  const deficientN = new Set(deficiencies.map(d => d.n));
  const L = [];
  L.push('You are performing a BOUNDED REPAIR on exactly ' + deficiencies.length + ' already-identified under-length beat slot(s) of an otherwise-accepted Scene 1 candidate. This is a SURGICAL patch, not a rewrite — everything else about this scene has already been accepted.');
  L.push('');
  L.push('HARD SCOPE (any violation is a hard failure of this repair, rejected wholesale):');
  L.push('  - Return ONLY the ' + deficiencies.length + ' named slot(s) below, each keyed by its locked slot number "n". Do not return any other slot.');
  L.push('  - Do NOT return oasOpening, postInterruptionBeat, scene1Coverage, first_person_lirael, or any other top-level field — this repair touches beat TEXT only.');
  L.push('  - Do NOT change any beat\'s image, kind, speaker, or provenance/objectClaims metadata — those are already approved and stay exactly as they are; you are extending existing approved prose in place, never re-authoring a beat\'s role.');
  L.push('  - Do NOT invent new canon, new characters, new dialogue from another character, or move/reorder any event — expand the SAME moment already established in the accepted text with more concrete sensory detail, interior reaction, or physical action from that same instant.');
  L.push('  - Never pad with generic description ("the air felt heavy," "time seemed to slow") — the expansion must be as concrete and grounded as the surrounding already-accepted prose.');
  L.push('  - Aim comfortably INSIDE the stated word range for each slot, not barely at its floor — the scene-level total floor (1,100 words) is cleared by only a ~10-word margin if every slot lands exactly on its own minimum, so a slot landing a few words above its floor is safer than one landing exactly on it.');
  L.push('');
  L.push('FULL ACCEPTED DRAFT — for continuity only (you are replacing ONLY the [NEEDS REPAIR] slots below; every other slot shown here is already final and must not be echoed back):');
  beats.forEach((b, i) => {
    const n = i + 1;
    const flagged = deficientN.has(n);
    L.push('Beat ' + n + (flagged ? ' [NEEDS REPAIR]' : ' [ACCEPTED — do not return this one]') + ' (' + b.kind + ', image=' + b.image + '): ' + b.text);
  });
  L.push('');
  L.push('SLOTS TO REPAIR — each MUST individually reach its own stated word-count floor:');
  deficiencies.forEach(d => {
    L.push('  - Slot ' + d.n + ' (id=' + (d.id || 'null') + ', image=' + d.image + ', kind=' + d.kind + '): current text is ' + d.actualWords + ' words; REQUIRED range is ' + d.wordRange[0] + '-' + d.wordRange[1] + ' words (at least ' + d.deficitWords + ' more words needed). This slot\'s function: ' + d.fn);
  });
  L.push('');
  L.push('OUTPUT SCHEMA (HARD — return ONLY this JSON object, nothing else): { "repairs": [ { "n": <slot number>, "text": "<expanded text>" }, ... ] } — exactly ' + deficiencies.length + ' entries, one per slot listed above, "n" values exactly: ' + deficiencies.map(d => d.n).join(', ') + '. No other top-level field. No other field inside a repair entry.');
  const system = 'You are performing a bounded, surgical repair on specific under-length beats of an already-mostly-accepted scene. You return ONLY the repaired beat text for the named slots as structured JSON — nothing else, no commentary, no full-scene rewrite.';
  return { system, user: L.join('\n') };
}

export function buildRepairFallbackChain(packet, primaryDraft, deficiencies) {
  const { system, user } = buildRepairPrompt(packet, primaryDraft, deficiencies);
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  // Sized for the real structural ceiling (all 20 slots flagged at once, the worst case) with
  // headroom — a real repair request should usually name far fewer slots than this.
  const MAX_TOKENS = 4000;
  return [
    { tier: 'primary', name: 'Grok-4.3', roleTag: 'firstSacrificeAuthoringRepair', endpoint: '/api/proxy', role: 'STRUCTURE_GENERATOR', preferredModel: 'grok-4-1-fast-reasoning', billedModel: 'grok-4.3', messages, max_tokens: MAX_TOKENS, temperature: 0.85, timeoutMs: 60000 },
    { tier: 'fallback', name: 'Ministral-8B', roleTag: 'firstSacrificeAuthoringRepair', endpoint: '/api/mistral-proxy', billedModel: 'ministral-8b-2512', messages, max_tokens: MAX_TOKENS, temperature: 0.7, timeoutMs: 45000 },
    { tier: 'terminal', name: 'GPT-4o', roleTag: 'firstSacrificeAuthoringRepair', role: 'PRIMARY_AUTHOR', model: 'gpt-4o', responseFormat: 'json_object', messages, max_tokens: MAX_TOKENS, temperature: 0.85, timeoutMs: 45000 },
  ];
}

// ── 3. LOCAL MERGE — no provider call; fails CLOSED on any deviation from the bounded contract ──
export function mergeRepairIntoDraft(primaryDraft, repairResponse, deficiencies) {
  const errors = [];
  const allowedN = new Set(deficiencies.map(d => d.n));

  if (!repairResponse || typeof repairResponse !== 'object' || Array.isArray(repairResponse)) {
    return { merged: null, errors: ['repair response is not a JSON object'] };
  }
  Object.keys(repairResponse).forEach(k => {
    if (k !== 'repairs') errors.push('unapproved top-level field in repair response: "' + k + '" — a bounded repair may only return {repairs}');
  });
  const repairs = Array.isArray(repairResponse.repairs) ? repairResponse.repairs : null;
  if (!repairs) { errors.push('repair response is missing a "repairs" array'); return { merged: null, errors }; }

  // Deep clone — the merge must never mutate the primary draft object the caller still holds.
  const merged = JSON.parse(JSON.stringify(primaryDraft));
  const seenN = new Set();
  repairs.forEach((r, idx) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) { errors.push('repairs[' + idx + '] is not an object'); return; }
    Object.keys(r).forEach(k => {
      if (k !== 'n' && k !== 'text') errors.push('repairs[' + idx + '] has an unapproved field "' + k + '" — a repair entry may only ever replace text, never image/kind/speaker/provenance/objectClaims');
    });
    if (typeof r.n !== 'number' || !allowedN.has(r.n)) { errors.push('repairs[' + idx + '] names slot n=' + JSON.stringify(r.n) + ', which was never flagged as deficient — a repair may only touch slots named in the request'); return; }
    if (typeof r.text !== 'string' || !r.text.trim()) { errors.push('repairs[' + idx + '] for slot ' + r.n + ' has no usable text'); return; }
    if (seenN.has(r.n)) { errors.push('repairs[] names slot ' + r.n + ' more than once'); return; }
    seenN.add(r.n);
    merged.scene1Candidate.beats[r.n - 1].text = r.text;
  });
  allowedN.forEach(n => { if (!seenN.has(n)) errors.push('repair response never returned a replacement for deficient slot ' + n + ' — every flagged slot must be covered'); });

  if (errors.length > 0) return { merged: null, errors };
  return { merged, errors: [] };
}

// ── Which validator rules a bounded word-expansion repair is ever authorized to address. Kept
// deliberately narrow and literal to Roman's spec ("below the total or density floor") — a repair
// must NEVER be attempted to paper over a canon, structural, or scope violation. ──
export const REPAIR_ELIGIBLE_VALIDATOR_RULES = Object.freeze(['scene1_too_thin', 'scene1_insufficient_narration_density']);

export function isRepairEligible(violations) {
  return Array.isArray(violations) && violations.length > 0 && violations.every(v => REPAIR_ELIGIBLE_VALIDATOR_RULES.includes(v.rule));
}
