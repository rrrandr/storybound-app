// ═══════════════════════════════════════════════════════════════════════════
// RELATIONAL-SHAPE CLASSIFIER — single shared authority
// ═══════════════════════════════════════════════════════════════════════════
// One source of truth for relational-shape classification, consumed by BOTH:
//   • the browser app (public/app.js → _readRelationalShape), and
//   • the simulation harness (scripts/relational-ecology-sim.mjs).
// This replaces the previous mirror-copy arrangement — there is now NO second
// copy to drift out of sync. See project_relational_attraction_architecture.md.
//
// PURE: no `state`, no DOM, no I/O. Input in, classification out. Telemetry-only
// by construction — it cannot influence anything; callers decide what to do.
//
// TWO TIERS:
//   v0 LEXICAL (always): classifies input-FORM vectors from the raw text alone.
//   CONTEXT-AWARE (when `ctx` provided): resolves the SCENE-RELATIONAL vectors
//     (reciprocity_recognition, presence_after_contact, receptivity) using what
//     the LI just did. This is the upgrade the attunement-canary demanded: with
//     ctx, "noticed vs MISSED" becomes detectable — a bold line that ignores a
//     signal the LI actually gave reads `missed`, separating tone-deaf boldness
//     from attuned presence. When `ctx` is null/empty, behavior is IDENTICAL to
//     v0 (backward-compatible — the live app passes ctx=null until the scene-
//     relational signal extractor lands).
//
// ctx shape (all optional booleans describing the IMMEDIATELY-PRECEDING LI move):
//   { li_signaled, li_revealed, li_offered }
// ═══════════════════════════════════════════════════════════════════════════

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;       // node / harness (CJS)
  if (typeof window !== 'undefined') window.StoryboundRelationalShape = api;        // browser (global)
})(this, function () {
  'use strict';

  var VECTORS = ['initiative', 'tension_handling', 'desire_expression', 'reciprocity_recognition',
    'register_shape', 'receptivity', 'desire_ownership', 'presence_after_contact', 'vulnerability'];

  // Returns a distributed shape object (NO aggregate scalar), or null if the
  // input is too short to classify. Caller attaches scene index / storage.
  function classifyRelationalShape(rawDo, rawSay, prior, ctx) {
    var t = (String(rawDo || '') + ' ' + String(rawSay || '')).trim().toLowerCase();
    if (t.length < 2) return null;
    var wordCount = t.split(/\s+/).filter(Boolean).length;
    ctx = ctx || {};
    var hasCtx = ctx.li_signaled === true || ctx.li_revealed === true || ctx.li_offered === true;

    // ── v0 LEXICAL — input-form vectors ─────────────────────────────────────
    var initiative = 'participated';
    if (/^\s*(i\s+)?(wait|watch|listen|stay (still|silent|quiet)|say nothing|do nothing|hesitat|freeze|look away|glance away|avert|shrug|don't say)/.test(t)) initiative = 'waited';
    else if (/\b(ask|tell her|invite|kiss|reach for|take her hand|step closer|lean in|lead|suggest|pull her|offer|propose|close the distance|move toward|make the first)\b/.test(t)) initiative = 'initiated';

    var tension_handling = 'held';
    if (/\b(look away|step back|pull back|change the subject|deflect|excuse myself|walk away|back off|withdraw|leave the room|create distance)\b/.test(t)) tension_handling = 'retreated';
    else if (/\b(just kidding|nevermind|never mind|forget it|it'?s nothing|no big deal|laugh it off|make a joke|brush it off)\b/.test(t)) tension_handling = 'collapsed';
    else if (/\b(kiss|hold her gaze|admit|confess|reach for|i want|pull her close|tell her how|cross the)\b/.test(t)) tension_handling = 'advanced';

    var desire_expression = 'hidden';
    if (/\b(just friends|not interested|don'?t feel that way|nothing like that|no i don'?t)\b/.test(t)) desire_expression = 'denied';
    else if (/\b(i want you|i'?m attracted|i like you|i desire|i'?ve wanted|can'?t stop thinking about you|you'?re beautiful|i need you|want to kiss)\b/.test(t)) desire_expression = 'expressed';
    else if (/\b(maybe|might|wonder if|sometime|grab a (drink|coffee)|see you again|would you want)\b/.test(t)) desire_expression = 'hinted';

    var isIronic = /\b(yeah right|sure,? sure|as if|oh (great|wonderful|fantastic|how nice)|how (romantic|sweet|cute|charming)|real smooth|don'?t flatter yourself|wow,? okay|gee thanks|lol|haha)\b/.test(t);

    var register_shape = 'grounded';
    var hedgeMarkers = (t.match(/\b(maybe|i guess|kind of|sort of|i think|perhaps|possibly|i don'?t know|um|uh|i mean|sorta|kinda)\b/g) || []).length;
    if (/\b(sorry|apolog|didn'?t mean to|my bad|i shouldn'?t have)\b/.test(t)) register_shape = 'apologetic';
    else if (isIronic) register_shape = 'ironic';
    else if (/\b(is that ok|if that'?s (alright|okay|ok)|only if you|hope that'?s|do you mind|is this ok|would that be ok|if you want me to)\b/.test(t)) register_shape = 'approval_seeking';
    else if (hedgeMarkers >= 2 || /^\s*(um|uh|maybe if|i guess)/.test(t)) register_shape = 'hedged';
    else if (wordCount > 45) register_shape = 'over_explained';

    var desire_ownership = 'na';
    if (desire_expression === 'expressed' || /\b(i want|i do want|i'?ve wanted|yes i want)\b/.test(t)) desire_ownership = 'owned';
    else if (/\b(it'?s probably nothing|i shouldn'?t want|don'?t read into|forget i said|i don'?t even know why)\b/.test(t)) desire_ownership = 'disowned';
    else if (isIronic) desire_ownership = 'ironized';

    var vulnerability = 'na';
    if (/\b(i'?m (scared|afraid|nervous)|this scares me|i'?ve never (told|felt)|honestly|the truth is|i feel (so|really)|i'?m terrified|let my guard)\b/.test(t)) vulnerability = 'exposed';
    else if (isIronic || register_shape === 'approval_seeking' || /\b(keep (my|it) (guard|cool)|stay (calm|composed)|don'?t let (him|her) see)\b/.test(t)) vulnerability = 'guarded';

    // input-side acknowledgment / receive / deflect cues (reused by both tiers)
    var refsHerCue = /\b(the way you|you just|since you|you keep|you'?re looking at me|you smiled|you leaned|you said you|i notice you|you'?ve been)\b/.test(t);
    var receiveCue = /\b(i'?d like that|i want that|me too|yes\b|i feel it too|let you in|come here)\b/.test(t);
    var deflectCue = isIronic || /\b(brush (it|him) off|change the subject|don'?t need|i'?m fine)\b/.test(t);
    var testCue    = /\b(prove it|if you really|do you even|are you sure you|why should i|let'?s see if you|earn it)\b/.test(t);
    var withdrawCue = /\b(step back|pull away|put (up )?(my|the) (guard|walls)|need space|not ready|back off)\b/.test(t);
    var silentCue  = initiative === 'waited' && /\b(say nothing|stay silent|look away|don'?t respond|go quiet)\b/.test(t);
    var stayCue    = /\b(stay|hold his gaze|don'?t look away|let him see|stay with (him|it)|meet his eyes)\b/.test(t);

    // ── SCENE-RELATIONAL vectors ────────────────────────────────────────────
    // v0 (no ctx): lexical best-effort, mostly 'na' (the documented blind spot).
    // context-aware (ctx): resolves against what the LI just did — crucially,
    // makes 'missed' detectable (ignoring a signal that WAS there).
    var reciprocity_recognition = 'na';
    var presence_after_contact = 'na';
    var receptivity = 'na';

    if (!hasCtx) {
      // ── v0 fallback (identical to pre-extraction behavior) ──
      if (refsHerCue) reciprocity_recognition = 'noticed';
      if (isIronic) presence_after_contact = 'retreated_ironic';
      else if (silentCue) presence_after_contact = 'retreated_silent';
      else if (stayCue) presence_after_contact = 'stayed';
      if (deflectCue) receptivity = 'deflected';
      else if (testCue) receptivity = 'tested';
      else if (withdrawCue) receptivity = 'withdrew';
      else if (receiveCue) receptivity = 'received';
    } else {
      // ── context-aware ──
      if (ctx.li_signaled === true) {
        // The LI gave a cue this beat — did the player acknowledge it?
        reciprocity_recognition = refsHerCue ? 'noticed' : 'missed';
      } // else stays 'na' — nothing to recognize.

      if (ctx.li_revealed === true) {
        // The LI exposed/risked something — does the player stay present?
        if (isIronic) presence_after_contact = 'retreated_ironic';
        else if (silentCue || initiative === 'waited') presence_after_contact = 'retreated_silent';
        else presence_after_contact = 'stayed';
      } else if (silentCue) {
        presence_after_contact = 'retreated_silent';
      }

      if (ctx.li_offered === true) {
        // The LI made an opening — how does the player meet it?
        if (deflectCue) receptivity = 'deflected';
        else if (testCue) receptivity = 'tested';
        else if (withdrawCue) receptivity = 'withdrew';
        else if (receiveCue || initiative === 'initiated') receptivity = 'received';
        else receptivity = 'deflected'; // an offer left unmet reads as a soft deflection
      } else {
        if (deflectCue) receptivity = 'deflected';
        else if (testCue) receptivity = 'tested';
        else if (withdrawCue) receptivity = 'withdrew';
        else if (receiveCue) receptivity = 'received';
      }
    }

    return {
      // universal (input-form) vectors
      initiative: initiative,
      tension_handling: tension_handling,
      desire_expression: desire_expression,
      reciprocity_recognition: reciprocity_recognition,
      register_shape: register_shape,
      // Female-leaning universal vectors (emphasis-tuned downstream, not gated)
      receptivity: receptivity,
      desire_ownership: desire_ownership,
      presence_after_contact: presence_after_contact,
      vulnerability: vulnerability,
      // provenance
      _prior: prior || { pc: 'unknown', li: 'unknown' },
      _classifier: hasCtx ? 'v1-context' : 'v0-heuristic'
    };
  }

  return { classifyRelationalShape: classifyRelationalShape, VECTORS: VECTORS };
});
