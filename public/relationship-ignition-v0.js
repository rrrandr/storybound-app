/* ═══════════════════════════════════════════════════════════════════════════
 * RELATIONSHIP IGNITION v0 (Roman 2026-07-30) — the desire-first opening.
 * ═══════════════════════════════════════════════════════════════════════════
 * Empirical root cause (3-story calibration, 27/40 scenes): the author renders
 * the LI as a FEATURE-CATALOG (body anchor, NO wanting) instead of through the
 * protagonist's charged perception → relationship never ignites → GR axis,
 * romance gravity, and trust-delivery all stay dormant.
 *
 * This module is the FIX as a FIRST-CLASS AUTHOR OBJECTIVE, not a hard gate
 * (desire-coding is fuzzy; hard-gating optimizes toward detector compliance).
 *   • buildOpeningDirective(state) → the authoring block for the LI's first
 *     meaningful presentation. Universal FUNCTION + gender/archetype TENDENCIES
 *     (examples, never separate male/female rules) + catalog ban + the question.
 *   • scoreOpening(prose, state) → LOG-ONLY ignition telemetry (body / emotional
 *     filter / catalog / protagonist-revealed / charge strength / PASS-FAIL).
 *
 * Design symmetry with the invariant runtime:
 *   invariant runtime:  a truth follows its REALIZATION (no label before it happens)
 *   relationship ignition: a description follows EMOTION (no body before the feeling)
 * Both ban substituting a LABEL ("trust", "beautiful eyes") for lived experience.
 *
 * The one rule that never changes — the core authoring question:
 *   "Why is THIS protagonist noticing THIS person, and what does that reveal
 *    about the protagonist?"
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ROOT = (typeof window !== 'undefined') ? window : globalThis;
  function log() { try { console.log.apply(console, arguments); } catch (_) {} }

  // ── config read (defensive; sensible fallbacks) ──────────────────────────
  function _cfg(state) {
    var s = state || ROOT.state || {};
    var pc = String(s.gender || s.playerGender || (s.identity && s.identity.gender) || 'female').toLowerCase();
    pc = (pc.indexOf('male') === 0 && pc.indexOf('female') !== 0) ? 'male' : (pc.indexOf('female') === 0 ? 'female' : (pc === 'nonbinary' || pc === 'non-binary' ? 'nonbinary' : pc));
    var li = String(s.liGender || s.loveInterestGender || (s.picks && s.picks.liGender) || '').toLowerCase();
    if (!li) li = (pc === 'female') ? 'male' : (pc === 'male') ? 'female' : 'unspecified';   // fallback: opposite of PC
    li = (li.indexOf('female') === 0) ? 'female' : (li.indexOf('male') === 0 ? 'male' : li);
    var dynamic = String((s.picks && s.picks.dynamic) || s.dynamic || '').toLowerCase();
    var arch = String((s.archetype && s.archetype.primary) || '').toLowerCase();
    return { pc: pc, li: li, dynamic: dynamic, arch: arch };
  }

  // ── ARCHETYPE FILTER — how the charge DISGUISES itself for this relationship ──
  // (Roman: classify by relationship archetype more than by gender.)
  function _archetypeFilter(c) {
    var d = c.dynamic + ' ' + c.arch;
    if (/enem|rival|nemes/.test(d))            return { label: 'RIVALS / ENEMIES', line: 'wanting is BURIED BENEATH IRRITATION — the protagonist resents that they keep noticing. Ex: "Why couldn\'t I stop noticing the line of her jaw exactly when I most wanted to win?"' };
    if (/protect|guard|bodyguard|ward/.test(d)) return { label: 'PROTECTOR', line: 'wanting arrives as CONCERN — the protagonist over-registers the other\'s hurt. Ex: "The split skin over his knuckles bothered me far more than it had any right to."' };
    if (/forbid|taboo|off[- ]?limits|vow|oath|duty/.test(d)) return { label: 'FORBIDDEN', line: 'wanting shows as RESISTANCE — the protagonist tries to look away and fails. Ex: "I should have walked out. Instead I memorised the shape of his mouth."' };
    if (/mystery|stranger|masked|unknown|secret/.test(d)) return { label: 'MYSTERY', line: 'wanting shows as FASCINATION — every answer opens another question. Ex: "Every non-answer she gave made me want to ask a better one."' };
    if (/beautiful[_ ]?ruin|obsess|fixation|doomed/.test(d)) return { label: 'DREAD-ATTRACTION', line: 'wanting is laced with WARNING — the pull the protagonist distrusts. Ex: "Some animal part of me leaned toward him even as the rest of me counted exits."' };
    return { label: 'DEFAULT', line: 'wanting shows as INVOLUNTARY ATTENTION — the protagonist keeps returning to this person against their own intention.' };
  }

  // ── GENDER TENDENCIES — not stereotypes; common successful patterns to ADAPT ──
  function _genderTendency(c) {
    var key = c.pc + '>' + c.li;
    if (key === 'female>male') return 'often: involuntary awareness of his PRESENCE; feeling physically/emotionally off-balance; attraction vs. caution at war; noticing what he DOES (competence, restraint, danger, an unexpected gentleness) as much as how he looks. GOOD: "His gaze held mine a beat too long. I looked away first, and hated that I had." BAD: "He had blue eyes."';
    if (key === 'male>female')   return 'often: trying NOT to stare and failing; a beat of embarrassment at being caught noticing; fascination/curiosity; a protective impulse; wanting closeness while resisting it. GOOD: "She tucked a loose strand behind her ear, still reading the map. I realised I\'d stopped listening to anything else." BAD: "She had long dark hair."';
    if (c.li === 'male')   return 'filter his presence through the protagonist\'s reaction — what he does and how it lands on the protagonist, not a feature list. GOOD: reaction-first ("I forgot the question I\'d meant to ask"). BAD: "He had a sculpted jaw."';
    if (c.li === 'female') return 'filter her presence through the protagonist\'s reaction — the effect she has, not an inventory. GOOD: reaction-first ("I lost my place in my own sentence"). BAD: "She had perfect lips."';
    return 'filter the love interest\'s presence through the protagonist\'s charged reaction, whatever its shape — the body exists because of its effect on the protagonist.';
  }

  // Gate for the DIRECTIVE (opt-in, default OFF — the directive changes production authoring, so it
  // stays flag-gated for a clean A/B until validated). The SCORER is log-only and runs regardless.
  function isActive(state) {
    try {
      if (ROOT._relationshipIgnitionV0 !== true) return false;   // opt-in
      var s = state || ROOT.state;
      return !!(s && (s.loveInterestName || (s.archetype && s.archetype.primary) || (s.picks && s.picks.flavor)));
    } catch (_) { return false; }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // THE OPENING DIRECTIVE — first meaningful presentation of the LI.
  // ═══════════════════════════════════════════════════════════════════════
  function buildOpeningDirective(state) {
    var s = state || ROOT.state; if (!s) return '';
    var c = _cfg(s);
    var af = _archetypeFilter(c);
    var gt = _genderTendency(c);
    var liName = s.loveInterestName || 'the love interest';
    var L = [];
    L.push('\n\nRELATIONSHIP IGNITION (HARD — the first meaningful presentation of ' + liName + '):');
    L.push('  THE RULE (never negotiable): the reader must learn as much about what the PROTAGONIST FEELS as about what ' + liName + ' looks like. Every physical observation is FILTERED THROUGH the protagonist\'s charged perception — never delivered as objective description.');
    L.push('  THE QUESTION every line of this presentation must answer: WHY is this protagonist noticing THIS person, and what does that noticing reveal about the protagonist? If a physical detail does not answer that, cut it.');
    L.push('  THE EMOTIONAL FILTER (the charge need NOT be lust): it may be desire, fascination, dread-attraction, protectiveness, jealousy, curiosity, recognition, or self-betrayal — but the body must be EXPERIENCED, not catalogued. The lens IS the point; the feature is only its occasion.');
    L.push('  FOR THIS PAIRING — ' + af.label + ': ' + af.line);
    L.push('  TENDENCY (' + c.pc + ' protagonist / ' + c.li + ' love interest — a pattern to ADAPT to these two, NOT a template): ' + gt);
    L.push('  BANNED — the feature-catalog (this is the measured default failure, 27/40 scenes): NEVER a bare inventory — "emerald eyes", "raven hair", "sculpted jaw", "perfect lips", "chiselled features". A physical trait may appear ONLY when the same beat reveals why THIS protagonist notices it. Body-without-feeling is the failure.');
    L.push('  BALANCE: across the first presentation, the protagonist\'s reaction should occupy at least as much of the prose as ' + liName + '\'s appearance. If you can delete every line about the protagonist\'s inner reaction and still have a full physical description, you have written a catalogue — rewrite it.');
    return L.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // THE IGNITION SCORER — LOG-ONLY telemetry (never gates). Broader than the
  // production desireCoded detector: it scores the EMOTIONAL FILTER (charge),
  // not just lust/wanting. Does NOT touch _liDescriptionCheck.
  // ═══════════════════════════════════════════════════════════════════════
  var CATS = {
    hair: /\b(?:hair|hairline|bald|shaved|braid|braided|ponytail|bun|curls|curl|cropped|disheveled|silver|grey|gray|graying|blonde|brunette|dark[- ]haired|auburn|red[- ]haired)\b/i,
    faceDescribed: /\b(?:scar|mole|freckl\w*|dimple|stubble|beard|mustache|goatee|(?:dark|pale|light|deep-set|hooded|blue|green|grey|gray|brown|hazel|amber|black|golden)[- ]?(?:eyes|eyed)|(?:crooked|sharp|aquiline|broad|strong|square|heavy) (?:nose|jaw|jawline|chin|brow|cheekbones?)|(?:high|sharp|hollow) cheekbones?|(?:thin|full|wide|cruel|generous) (?:lips|mouth))\b/i,
    build: /\b(?:tall|short|broad|broad-shouldered|lean|stocky|slim|slight|build|frame|shoulders?|chest|waist|hips?|thigh|height|stature|muscled?|wiry|compact)\b/i,
    handsOther: /\b(?:forearms?|wrists?|fingers?|palm|palms|hands?)\b/i
  };
  var BODY_FACE = ['hair', 'faceDescribed', 'build', 'handsOther'];
  // EMOTIONAL FILTER (charge) — broad: desire + fascination + dread + protective + involuntary attention + self-betrayal.
  var CHARGE = /\b(?:want(?:ed|ing)?|ache[ds]?|aching|crav(?:e|ed|ing)|hunger(?:ed)?|drawn to|pull(?:ed|ing)?|heat|mouth went dry|breath (?:caught|snagged|left)|could ?n'?t (?:look away|stop|help|breathe|think)|kept (?:looking|staring|returning|noticing)|stopped (?:listening|breathing|thinking)|forgot (?:what|the|my|to)|lost (?:my|the) (?:place|thread|train)|a (?:beat|heartbeat|moment) too long|looked away first|hated (?:that|how|myself|the)|should have (?:walked|left|looked)|knew better|against my (?:will|better)|fascinat\w*|mesmeri\w*|transfix\w*|bothered me (?:more|far more)|leaned toward|some (?:animal|traitor)|distrust\w* the pull|recogni[sz]\w*|memori[sz]ed)\b/i;
  var FIRST_PERSON = /\b(?:I|me|my|myself)\b/;
  // objective-catalog shapes (the measured default) — feature stated flatly.
  var CATALOG_SHAPE = /\b(?:emerald|sapphire|raven|ebony|chisel\w*|sculpted|perfect|flawless|piercing|smoldering)\b/i;

  function _liFocus(sent, liFirst) {
    if (liFirst && new RegExp('\\b' + liFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(sent)) return true;
    return /\b(?:he|him|his|she|her|hers|they|them|their)\b/i.test(sent);
  }

  function scoreOpening(prose, state) {
    var s = state || ROOT.state || {};
    var clean = String(prose || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length < 40) return null;
    var liFirst = ((s.loveInterestName || '').split(/\s+/)[0] || '');
    var sents = clean.split(/(?<=[.!?])\s+/).filter(function (x) { return x.trim().length; });
    var liSents = sents.filter(function (x) { return _liFocus(x, liFirst); });
    var scope = liSents.join(' ');

    var bodyAnchor = BODY_FACE.some(function (cat) { return CATS[cat].test(scope); });
    var emotionalFilter = CHARGE.test(scope);
    // catalog score: LI-focused sentences that have a body feature but NO charge (the clinical failure).
    var clinical = liSents.filter(function (x) { return BODY_FACE.some(function (c) { return CATS[c].test(x); }) && !CHARGE.test(x); }).length;
    var charged  = liSents.filter(function (x) { return BODY_FACE.some(function (c) { return CATS[c].test(x); }) && CHARGE.test(x); }).length;
    var catalogShapes = (scope.match(CATALOG_SHAPE) || []).length;
    var catalogScore = (clinical >= 3 || catalogShapes >= 2) ? 'HIGH' : (clinical >= 1 ? 'MED' : 'LOW');
    // protagonist revealed: a charged LI sentence that also carries first-person interiority.
    var protagonistRevealed = liSents.some(function (x) { return CHARGE.test(x) && FIRST_PERSON.test(x); });
    var chargeStrength = !emotionalFilter ? 'none' : (protagonistRevealed && charged >= 1 ? 'strong' : 'moderate');
    // one perceptual beat: body + charge within 2 adjacent sentences.
    var oneBeat = false;
    for (var i = 0; i < sents.length - 1; i++) {
      var w = sents[i] + ' ' + sents[i + 1];
      if (!_liFocus(w, liFirst)) continue;
      if (BODY_FACE.some(function (c) { return CATS[c].test(w); }) && CHARGE.test(w)) { oneBeat = true; break; }
    }
    var ignition = (bodyAnchor && emotionalFilter && oneBeat) ? 'PASS' : 'FAIL';
    var failReason = ignition === 'PASS' ? '' :
      (!liSents.length ? 'LI offstage/absent' : !bodyAnchor ? 'no body anchor' : !emotionalFilter ? 'CLINICAL (body, no emotional filter) ← catalog' : 'scope (body+charge present, not one beat)');

    var result = {
      bodyAnchor: bodyAnchor, emotionalFilter: emotionalFilter, catalogScore: catalogScore,
      protagonistRevealed: protagonistRevealed, chargeStrength: chargeStrength, ignition: ignition,
      clinicalSentences: clinical, chargedSentences: charged, failReason: failReason
    };
    log('[IGNITION] body=' + (bodyAnchor ? '✓' : '✗') + ' emotional-filter=' + (emotionalFilter ? '✓' : '✗') +
        ' catalog=' + catalogScore + ' protagonist-revealed=' + (protagonistRevealed ? '✓' : '✗') +
        ' charge=' + chargeStrength + ' → IGNITION ' + ignition + (failReason ? ' (' + failReason + ')' : ''));
    return result;
  }

  ROOT.RelationshipIgnitionV0 = {
    _v: 0,
    isActive: isActive,
    buildOpeningDirective: buildOpeningDirective,
    scoreOpening: scoreOpening,
    _cfg: _cfg
  };
})();
