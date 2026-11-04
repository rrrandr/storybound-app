/* ═══════════════════════════════════════════════════════════════════════════
 * ESSENTIAL-BEAT & CHARACTER+ CHECK — TARGETED EDITING BRIEF  (Roman 2026-10-15)
 * ═══════════════════════════════════════════════════════════════════════════
 * Produces a TARGETED EDITING BRIEF for the final reader-facing draft and applies
 * at most ONE repair. It does NOT reject a scene, does NOT regenerate one, and does
 * NOT block publication. Publication always proceeds; a failure is recorded.
 *
 * DIVISION OF LABOUR, enforced by construction:
 *   deterministic (this file)  — extraction boundary, revision binding, verbatim
 *                                presence, evidence sufficiency BY KIND, regression
 *                                detection, allowance arithmetic, brief assembly.
 *   semantic (injected)        — whether a beat actually happened, and whether a
 *                                Character+ passage delivers a viewpoint judgment.
 *
 * WHY EXACT QUOTES ARE NOT PROOF. A verbatim passage establishes only that those
 * words are in THIS revision. It can therefore DOWNGRADE a claim (nothing cited, or
 * cited text absent → unverified) but never UPGRADE one: a correctly quoted passage
 * does not make the semantic verdict correct. Verbatim success leaves the injected
 * status untouched; only failure moves it.
 *
 * STATUS OF THIS FILE. The orchestrator runOnFinalizedDraft() is called from
 * app.js's callChat finalization, but it is INERT until a judge is wired into
 * _judgeFn. No semantic judge has been validated, so nothing runs in production
 * today. Offline tests inject async stubs. Nothing here makes a network call.
 */
(function () {
  'use strict';

  // ── STATUS TAXONOMY ────────────────────────────────────────────────────────
  // KNOWN INCORRECT ("we checked and it is wrong") is kept distinct from
  // UNVERIFIED ("we could not check"). Only the first is material — something an
  // edit can aim at. Neither is ever treated as a pass.
  var STATUS = {
    FULFILLED:     'fulfilled',
    PARTIAL:       'partial',
    ASSERTED_ONLY: 'asserted_only',   // the consequence is on the page; the act never is
    CONTEMPLATED:  'contemplated',    // the prose weighs the act; it never happens
    MISSED:        'missed',
    CONTRADICTED:  'contradicted',
    UNVERIFIED:    'unverified'       // NOT a pass
  };
  var KNOWN_INCORRECT = { partial: 1, asserted_only: 1, contemplated: 1, missed: 1, contradicted: 1 };

  // ── WHAT HAPPENED TO A REQUIRED ACT, IN CONTEXT (Roman 2026-10-15) ───────────────────────
  // The judge states this; the checker does not infer it from vocabulary. A modal clause does
  // NOT decide it: "I could hear the courtiers fall silent when Julian approached" reports a
  // reaction that really occurred, while "I could tear the band away" reports one that did not.
  // Only the surrounding prose settles which, so the judge answers and the answer is recorded.
  var OCCURRENCE = {
    performed:    { passing: true,  maps: null },
    contemplated: { passing: false, maps: 'contemplated' },
    negated:      { passing: false, maps: 'contradicted' },
    asserted:     { passing: false, maps: 'asserted_only' }
  };

  // ── EVIDENCE DEFECTS ARE NOT STORY DEFECTS (Roman 2026-10-15) ────────────────────────────
  // A quotation we cannot verify tells us the JUDGE failed to evidence its claim. It does not
  // tell us the scene lacks the beat. Every one of these resolves to UNVERIFIED, never to a
  // status asserting absence, and every one is repeated back so the failure is inspectable.
  var EVIDENCE_PROBLEM = {
    NOT_VERBATIM: 'not_verbatim_in_this_revision',
    ELIDED:       'elided_composite_is_not_one_passage',
    TOO_SHORT:    'quotation_shorter_than_minimum',
    MISSING:      'required_quotation_absent',
    NOT_A_QUOTE:  'quotation_was_not_a_string_or_list_of_strings'
  };
  var PASSING = { fulfilled: 1 };
  var STATUS_VALUES = {};
  Object.keys(STATUS).forEach(function (k) { STATUS_VALUES[STATUS[k]] = 1; });

  // ── EVIDENCE RULES BY KIND ─────────────────────────────────────────────────
  // Replaces the blanket "every beat MUST be a CAMERA-VISIBLE EVENT" rule, whose
  // examples turned "realize a betrayal" into "the betrayer PERFORMS it in view" and
  // "understand the danger" into "the danger physically OCCURS". Discovering
  // evidence of a past betrayal is legitimate; recognising danger need not trigger
  // it; a concealed action must stay concealed.
  //
  // needsAction=false is the load-bearing case: a concealed action is NEVER required
  // to produce a passage revealing it. Only its permitted consequences are assessed.
  var EVIDENCE_RULES = {
    on_page_action:                            { needsAction: true,  needsConsequence: false },
    discovered_evidence:                       { needsAction: true,  needsConsequence: false },
    internal_recognition:                      { needsAction: true,  needsConsequence: false },
    concealed_action_with_visible_consequence: { needsAction: false, needsConsequence: true },
    // ── EVERY LOVE INTEREST'S FIRST CHARACTER+ IS SOCIAL PROOF (Roman 2026-10-15) ────────
    // A STANDING RULE, not one character's exception. The LI's first depiction must show another
    // person — one is enough, no crowd required — responding to them with awe, deference, desire,
    // fear, curiosity or a character-appropriate mix, STAGED and specific. Then the protagonist
    // interprets that response through her own worldview, mask, history or bias: what she notices,
    // resents, distrusts, envies, dismisses or misreads about it.
    //
    // It reuses the two-passage machinery rather than adding fields: the ACTION passage is the
    // other person's response, the CONSEQUENCE passage is the protagonist's reading of it. Both
    // are required, so appearance, an involuntary tell, narration asserting "everyone respected
    // him", or the protagonist simply finding him attractive cannot satisfy it — none of those
    // supplies a staged response by someone else PLUS an interpretation of it.
    //
    // This applies to the FIRST depiction only. Later ones may echo, complicate or broaden it and
    // need not keep staging social proof.
    social_proof_with_pc_interpretation: { needsAction: true, needsConsequence: true }
  };
  function ruleFor(kind) { return EVIDENCE_RULES[String(kind || 'on_page_action')] || EVIDENCE_RULES.on_page_action; }

  // ── REVISION IDENTITY ──────────────────────────────────────────────────────
  // A verdict is only meaningful against the exact text it was asked about. Same
  // discipline as the existing sealed-proposal verifier's "verbatim substring of the
  // ACCEPTED prose" rule, with the revision named so a verdict cannot be carried
  // onto a later draft.
  function revisionId(text) {
    var s = String(text == null ? '' : text), h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
    return 'r' + h.toString(36) + '-' + s.length;
  }

  var MIN_QUOTE_CHARS = 12;
  function normalise(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function quotePresent(quote, hay) {
    var q = normalise(quote).toLowerCase();
    if (q.length < MIN_QUOTE_CHARS) return false;
    return normalise(hay).toLowerCase().indexOf(q) !== -1;
  }

  // ── EVERY SUPPLIED QUOTATION IS VALIDATED, INCLUDING THE OPTIONAL ONES ───────────────────
  // (Roman 2026-10-15) The first version checked a passage only where its evidence rule
  // REQUIRED one, so an unrequired consequence passage was accepted unread. The live judge
  // then returned two consequence passages that were elided composites — two non-adjacent
  // excerpts joined by "..." — and both were recorded as evidence without ever being verified.
  //
  // AN ELIDED COMPOSITE IS NOT ONE VERBATIM PASSAGE. It is also not a reason to reject the
  // underlying claim: several genuine excerpts are legitimate evidence, so they may be supplied
  // SEPARATELY, as a list, and each is then verified on its own. What is refused is a single
  // string pretending to be contiguous prose that the draft does not contain.
  //
  // OVERLAP IS EXPLICITLY ALLOWED. Two quotations may be the same span, or one inside the
  // other: a single sentence can carry both another person's reaction and the protagonist's
  // reading of it, and we agreed it may. Overlap is recorded as a signal and never penalised.
  var ELISION_RX = /…|\.\.\.|\[\s*…\s*\]|\[\s*\.\.\.\s*\]/;
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // CHARACTER+ IS CONCENTRATED INTO THE ACTION, NOT EXPLAINED AFTER IT  (Roman 2026-10-15)
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // ONE definition, read by the author directive in app.js, the repair brief and the judge
  // contract, so the three cannot drift.
  //
  // WHAT PROVOKED IT: the first live repair delivered real social proof and then spent 22 more
  // words explaining what it meant — "It was the kind of deference that made me uneasy in myself
  // for noticing... I despised how easily I read it." The staging worked; the explanatory
  // aftermath diluted it, and 67 words went where a single sentence does the whole job.
  //
  // THE DESIGN REFERENCE, kept HERE and deliberately NOT in any model-facing string:
  //   "The misalignment hit the gathering like a wave, turning all eyes to crash upon the
  //    unmoving Julian, whose gaze shot past their deference but flickered when it met mine."
  // One sentence, four jobs at once: the wrongness spreads (plot), the gathering turns (social
  // proof), he disregards the deference (character), and his composure changes only for her
  // (relational intrigue). Her viewpoint is carried by WHAT SHE CHOOSES TO NOTICE — it needs no
  // "I understood his power, and it unsettled me."
  //
  // IT IS A REFERENCE, NEVER AN EXEMPLAR IN A PROMPT. A concrete sentence handed to a model WILL
  // be copied verbatim, and rotating which one leaks is not a guard — so the requirement below
  // describes the STRUCTURE and supplies no sentence to paste. It is also not a new plot fact for
  // any other story.
  //
  // IT IS A DEFAULT, NOT A QUOTA. No word limit, and no instruction to overload one sentence.
  // ── THESE AMPLIFY THE AUGUST DOCTRINE; THEY DO NOT REDEFINE IT (Roman 2026-10-15) ───────────
  // The first version of this block restated rules that already existed in app.js's Character+
  // doctrine, in new October words: `integration` was THE BAR ("FUSE them into one"),
  // `noAftermath` was the GOVERNING PRINCIPLE and the BANNED SHAPE, `implicitViewpoint` was
  // "information CREATED BY a character's choice of attention". Maintaining both is how a
  // specification drifts, so these now point at the recovered text and add only what it lacks.
  //
  // "EMBEDDED IN ACTION" WAS TOO NARROW and is gone. The established mechanisms run on remembered
  // patterns, absence, comparison and corrected assumptions as well as on action, and the doctrine
  // explicitly permits observed-only, observer-only, or both. Nothing here may become a checklist
  // requiring every line to perform every function.
  var CP_STYLE = {
    compression: 'COMPRESS; DO NOT TRANSLATE AFTERWARD. Prefer the fewest sentences that carry the '
      + 'moment and the protagonist\'s way of seeing it together — one is often enough, two are '
      + 'fine when the moment needs them. This is a stylistic default, not a word quota and not a '
      + 'reason to overload a sentence. It is the doctrine\'s own bar: if the observed detail and '
      + 'the observer\'s reading sit in two separate stacked clauses, you have built a template — '
      + 'fuse them. And once a moment works, do not add a sentence explaining what it meant.',
    breadth: 'IT NEED NOT BE AN ACTION. The established mechanisms run equally on a remembered '
      + 'pattern, an absence or a change, a contrast, a corrected assumption, a line of dialogue, '
      + 'or a small present-tense behaviour. Reach for whichever this moment actually affords.',
    notChecklist: 'NO BEAT OWES EVERY FUNCTION. Revealing the observed is enough; revealing the '
      + 'observer is enough; both at once is enough. The only question is what inference the '
      + 'reader gains that did not exist before the line.',
    implicitViewpoint: 'HER VIEWPOINT CAN LIVE IN THE SELECTION. What she chooses to notice, what '
      + 'she compares it to, the words she reaches for, the contrast she draws — any of these '
      + 'carries her reading. She does not have to declare what she felt about it.',
    noNewCast: 'USE PEOPLE THE STORY ALREADY HAS, or witnesses the material already permits to be '
      + 'unnamed ("two or three of them", "an older one standing near him"). Do NOT give a '
      + 'bystander a name, and do NOT invent backstory, history or relationships, in order to '
      + 'deliver this beat. A named witness becomes cast, and cast carries continuity obligations '
      + 'the story never agreed to.',
    // ── "FRESH" IS NOT "NEW" (Roman 2026-10-15, corrected) ──────────────────────────────────
    // The first wording said "not a reprise of the first", which reads as a demand for novelty
    // and pushes a later depiction to forget the impression the reader already holds. The
    // requirement is a MIXTURE: echoes that deepen the established reading, and broader insights
    // that complicate it. An echo is not a repetition — it returns to the same truth and shows
    // what it now implies, costs, excepts or means. This matches CP_MODE's existing
    // echo_reinterpret / broaden split rather than competing with it.
    freshness: 'A LATER DEPICTION IS SITUATIONAL — come at the person through what THIS moment '
      + 'affords. REVISITING THE ESTABLISHED IMPRESSION IS NOT ONLY ALLOWED BUT WANTED: return to '
      + 'the same truth and show a new implication, an exception, a cost it has started to charge, '
      + 'or a changed reading of what the reader already saw. That is an echo, and an echo deepens. '
      + 'What is to be avoided is restating the first impression in new words, and equally a '
      + '"fresh" depiction that behaves as though the first never happened.'
  };
  // ADVISORY ONLY. Never rejects a passage. "I could hear the courtiers fall silent when Julian
  // approached" is a modal clause reporting a reaction that actually happened; "I could tear the
  // band away" is one that did not. The word cannot tell them apart, so it sets no status.
  var MODAL_RX = /\b(could|would|might|may|should|was about to|were about to|if I|if she|if he)\b/i;
  function validateQuotation(raw, reader, opts) {
    opts = opts || {};
    var out = { supplied: raw != null && raw !== '', excerpts: [], problems: [], text: null };
    if (!out.supplied) {
      if (opts.required) out.problems.push({ code: EVIDENCE_PROBLEM.MISSING, label: opts.label || null });
      return out;
    }
    var list = Array.isArray(raw) ? raw : [raw];
    if (!list.length || !list.every(function (x) { return typeof x === 'string'; })) {
      out.problems.push({ code: EVIDENCE_PROBLEM.NOT_A_QUOTE, label: opts.label || null,
        got: Object.prototype.toString.call(raw) });
      return out;
    }
    list.forEach(function (one) {
      var q = normalise(one);
      if (!q) return;
      // An elision marker inside ONE string is the defect. Supplied as separate excerpts, the
      // same two pieces are fine — which is what the rejection tells the judge to do.
      if (ELISION_RX.test(q) && !quotePresent(q, reader)) {
        out.problems.push({ code: EVIDENCE_PROBLEM.ELIDED, label: opts.label || null, quote: q,
          remedy: 'supply each excerpt separately as a list; do not join them with an ellipsis' });
        return;
      }
      if (q.length < MIN_QUOTE_CHARS) {
        out.problems.push({ code: EVIDENCE_PROBLEM.TOO_SHORT, label: opts.label || null, quote: q });
        return;
      }
      if (!quotePresent(q, reader)) {
        out.problems.push({ code: EVIDENCE_PROBLEM.NOT_VERBATIM, label: opts.label || null, quote: q });
        return;
      }
      out.excerpts.push(q);
    });
    if (!out.excerpts.length && !out.problems.length && opts.required) {
      out.problems.push({ code: EVIDENCE_PROBLEM.MISSING, label: opts.label || null });
    }
    out.text = out.excerpts.length ? out.excerpts.join(' / ') : null;
    return out;
  }
  function spansOverlap(a, b) {
    if (!a || !b) return false;
    var x = String(a).toLowerCase(), y = String(b).toLowerCase();
    return x === y || x.indexOf(y) !== -1 || y.indexOf(x) !== -1;
  }
  function sentences(t) { return normalise(t).split(/(?<=[.?!])\s+/).filter(Boolean); }

  // ── READER-FACING EXTRACTION ───────────────────────────────────────────────
  // The check judges what the READER gets. Mirrors app.js's extraction and, for the
  // same reason, preserves legitimate prose after a PROPERLY CLOSED appendix while
  // hiding the branches. An UNCLOSED appendix keeps strip-to-end, because there is
  // then no way to tell trailing prose from an unterminated branch.
  function readerFacing(raw) {
    var t = String(raw == null ? '' : raw);
    t = t.replace(/^\[(CHARACTERS|TITLE|SYNOPSIS):[\s\S]*?\]\s*/gm, '').replace(/^---\s*$/gm, '');
    var closed = /<<\s*END_EXPANSION\s*>>/i.test(t) && /<<\s*EXPANSION_A\s*>>/i.test(t);
    t = closed
      ? t.replace(/\s*<<\s*EXPANSION_A\s*>>[\s\S]*?<<\s*END_EXPANSION\s*>>/i, '\n\n')
      : t.replace(/\s*<<\s*EXPANSION_A\s*>>[\s\S]*$/i, '');
    return t.replace(/<<\s*MICRO_EXPRESSION\s*>>[\s\S]*?<<\s*CONTINUE\s*>>/i, '')
            .replace(/<<[^>]*>>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }
  function branchesOf(raw) {
    var m = String(raw == null ? '' : raw)
      .match(/<<\s*EXPANSION_A\s*>>([\s\S]*?)<<\s*EXPANSION_B\s*>>([\s\S]*?)(?:<<\s*END_EXPANSION\s*>>|\s*$)/i);
    return m ? { direct: normalise(m[1]), subtle: normalise(m[2]) } : null;
  }

  // ── CHARACTER+ DIAGNOSTICS — ADVISORY ONLY ─────────────────────────────────
  // NONE of these set a status or make a beat material. An echo, appearance
  // vocabulary, or a missing assignment entry does not by itself prove failed
  // characterisation: a borrowed sentence can still carry a real judgment, and
  // appearance can accompany one. Whether a passage delivers a SPECIFIC viewpoint
  // judgment is a semantic question, left to the judge. These are leads for the
  // brief and for diagnosis, nothing more.
  //
  // Tense is normalised before echo matching: an assignment is written in the
  // present and an author fitting it into past-tense prose changes the auxiliary.
  // On the saved samples that single word was the only difference across a 12-word
  // span, and exact matching missed it entirely.
  var TENSE_MAP = { has: 'AUX_HAVE', had: 'AUX_HAVE', have: 'AUX_HAVE',
    is: 'AUX_BE', was: 'AUX_BE', are: 'AUX_BE', were: 'AUX_BE', be: 'AUX_BE', been: 'AUX_BE',
    does: 'AUX_DO', did: 'AUX_DO', do: 'AUX_DO' };
  function echoTokens(s) {
    return normalise(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
      .filter(Boolean).map(function (w) { return TENSE_MAP[w] || w; });
  }
  function instructionEcho(prose, instructionText, minWords) {
    var need = minWords || 8;
    var a = echoTokens(prose);
    var bSet = ' ' + echoTokens(instructionText).join(' ') + ' ';
    var best = null;
    for (var i = 0; i < a.length; i++) {
      for (var len = Math.min(need + 14, a.length - i); len >= need; len--) {
        if (bSet.indexOf(a.slice(i, i + len).join(' ')) !== -1) {
          if (!best || len > best.words) best = { span: a.slice(i, i + len).join(' '), words: len };
          break;
        }
      }
    }
    return best;   // ADVISORY: origin, not quality. A borrowed sentence may still judge.
  }

  // "standing too still" was missed by a pattern that only had "stood too still", so a canonical
  // involuntary tell passed the social-proof floor. Matched on the tell itself, not its tense.
  var TELL_RX = /\b(trembl|blush|flinch|hesitat|caught (?:her|his|their) breath|went (?:very )?still|(?:perfectly|too|very) still|stand\w*\s+(?:too|very|perfectly)\s+still|stiffen|shak(?:ing|y)|sputter|flicker)/i;
  var APPEARANCE_RX = /\b(hair|skin|eyes|eyebrow|jaw|shoulders|tunic|robe|tall|slender|coral|aqua|slate|silver)\b/i;
  var CHOSEN_ACT_RX = /\b(before|instead of|so that|rather than|without being asked|chose|answered|corrected|filled|claimed|refused|assumes?|will not wait)\b/i;
  // ── IS THERE A RESPONDER OTHER THAN THE LI? ────────────────────────────────────────────────
  // The only question a deterministic layer can honestly answer about social proof. A third
  // party's reaction counts whether it was chosen or involuntary; the LI's own does not. Returns
  // `onlySubjectIsLI` true ONLY when the passage names the LI and nothing else that could be a
  // responder — otherwise it defers, because deciding whether a response is MEANINGFUL is
  // semantic. Roster labels from the scene are used when supplied, so a named bystander counts.
  // Includes metonymic responders ("heads turned", "every eye", "the room went quiet") because a
  // response is often carried by a body part or a collective noun rather than a named person.
  // Still only a SIGNAL — it is not asked to be complete, and nothing downgrades on its absence.
  var RESPONDER_RX = /\b(someone|somebody|anyone|everyone|people|they|them|their|others?|another|heads?|eyes?|faces?|gazes?|voices?|hands?|shoulders?|a (?:woman|man|girl|boy|youth|child|elder|guest|servant|guard|soldier|priest|officer|stranger)|the (?:assembly|crowd|room|gathering|family|guests|others|rest)|two|three|several|a few)\b/i;
  function socialProofResponder(passage, liName, roster) {
    var t = normalise(passage);
    if (!t) return { onlySubjectIsLI: false, why: 'no passage to inspect' };
    var li = normalise(liName || '');
    var liFirst = li ? li.split(/\s+/)[0] : '';
    var mentionsLI = !!li && (new RegExp('\\b' + li.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t)
      || (liFirst && new RegExp('\\b' + liFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t)));
    // Anyone else nameable from this scene's roster.
    var otherNamed = (roster || []).some(function (r) {
      var lbl = normalise(typeof r === 'string' ? r : (r && r.label));
      if (!lbl) return false;
      if (li && (lbl.toLowerCase() === li.toLowerCase())) return false;
      return new RegExp('\\b' + lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t);
    });
    // Strip the LI's own name before looking for a generic responder, so "Julian" alone does not
    // register as "someone".
    var stripped = t;
    if (li) {
      try {
        stripped = stripped.replace(new RegExp('\\b' + li.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), ' ');
        if (liFirst) stripped = stripped.replace(new RegExp('\\b' + liFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), ' ');
      } catch (_) {}
    }
    var genericResponder = RESPONDER_RX.test(stripped);
    return {
      onlySubjectIsLI: mentionsLI && !otherNamed && !genericResponder,
      mentionsLI: mentionsLI, otherNamed: otherNamed, genericResponder: genericResponder,
      note: 'An involuntary reaction by someone else IS social proof. Only the LI\'s own reaction is not.'
    };
  }

  function characterPlusEvidenceSignals(ev) {
    var t = normalise(ev);
    return {
      containsTell: !!t && TELL_RX.test(t),
      containsAppearance: !!t && APPEARANCE_RX.test(t),
      containsChosenAct: !!t && CHOSEN_ACT_RX.test(t),
      advisory: 'Signals only. A tell or an appearance detail does not establish that the '
        + 'passage fails to deliver a viewpoint judgment; that is the judge\'s call.'
    };
  }
  // A cast member the scene requires to appear but for whom NO Character+ beat was
  // assigned cannot be scored against the author — the requirement never arrived.
  // Reported as a possible INPUT defect, never as a prose failure.
  function characterPlusCoverage(assignedIds, requiredCast) {
    var have = {};
    (assignedIds || []).forEach(function (n) { have[normalise(n).toLowerCase()] = 1; });
    return { assigned: (assignedIds || []).slice(), requiredCast: (requiredCast || []).slice(),
      unassigned: (requiredCast || []).filter(function (n) { return !have[normalise(n).toLowerCase()]; }),
      advisory: 'An unassigned cast member indicates a planning gap to investigate, not a '
        + 'demonstrated characterisation failure.' };
  }

  // ── ONE SHARED CORRECTION ALLOWANCE ────────────────────────────────────────
  // The host breaker does NOT provide this: its cap is 4, description repairs are
  // exempt from the cosmetic sub-cap, and the from-scaffold regen is uncapped and
  // never calls it. So this feature carries its own single allowance, and claiming
  // it also consumes a host slot where one is available, so pre-existing paths
  // cannot multiply this feature's correction. ONE CALL, NOT ONE BEAT.
  function allowanceFor(state, key) {
    var s = state || {};
    if (!s._essentialFixAllowance || s._essentialFixAllowance.key !== key) {
      s._essentialFixAllowance = { key: key, used: 0, mode: null, outcome: null };
    }
    return s._essentialFixAllowance;
  }
  function claimCorrection(state, key, mode, budgetClaim) {
    var a = allowanceFor(state, key);
    if (a.used > 0) return { granted: false, reason: 'the single correction allowance for this scene is already spent', allowance: a };
    if (typeof budgetClaim === 'function') {
      var hostOk = false;
      try { hostOk = !!budgetClaim('essential-beat-fix', 'repair'); } catch (_) { hostOk = false; }
      if (!hostOk) return { granted: false, reason: 'the host repair budget refused a slot', allowance: a };
    }
    a.used = 1; a.mode = String(mode || 'edit');
    return { granted: true, allowance: a };
  }

  // ── EVALUATION ─────────────────────────────────────────────────────────────
  function evaluate(opts) {
    opts = opts || {};
    var draft = String(opts.draft == null ? '' : opts.draft);
    var reader = opts.alreadyExtracted ? draft : readerFacing(draft);
    var rev = revisionId(reader);
    var beats = (opts.beats || []).filter(function (b) { return b && b.id && b.essential !== false; });
    var byId = {};
    (opts.verdicts || []).forEach(function (v) { if (v && v.id) byId[String(v.id)] = v; });

    var findings = beats.map(function (b) {
      var rule = ruleFor(b.evidenceKind);
      var v = byId[String(b.id)];
      var f = { id: b.id, kind: b.kind || 'essential', evidenceKind: String(b.evidenceKind || 'on_page_action'),
        region: b.region || null, status: STATUS.UNVERIFIED, verified: false, material: false,
        reasons: [], actionPassage: null, consequencePassage: null,
        produces: b.produces || [], dependsOn: b.dependsOn || [] };

      if (v && v.revisionId && v.revisionId !== rev) {
        f.reasons.push('verdict was produced against revision ' + v.revisionId + ', not ' + rev);
        return f;
      }
      if (!v || !v.status || !STATUS_VALUES[String(v.status)]) {
        f.reasons.push(v ? ('malformed verdict status "' + String(v.status) + '"') : 'no verdict returned for this beat');
        return f;
      }

      var claimed = String(v.status);

      // EVERY supplied quotation is validated, required or not. An unverifiable quotation is a
      // defect in the EVIDENCE, so it can only ever produce UNVERIFIED — never a claim that the
      // story lacks the beat.
      var evAct = validateQuotation(v.actionPassage, reader,
        { required: rule.needsAction && PASSING[claimed], label: 'actionPassage' });
      var evCon = validateQuotation(v.consequencePassage, reader,
        { required: rule.needsConsequence && PASSING[claimed], label: 'consequencePassage' });
      var problems = evAct.problems.concat(evCon.problems);

      if (!rule.needsAction && evAct.excerpts.length) {
        f.status = STATUS.CONTRADICTED; f.material = true; f.verified = true;
        f.reasons.push('a concealed-action beat was evidenced by a passage revealing the act — a disclosure breach, not a completion');
        f.actionPassage = evAct.text; return f;
      }

      // ── THE FOUR THINGS SOCIAL PROOF HAS TO NAME (Roman 2026-10-15) ────────────────────
      // Being listed among trained observers establishes neither deference nor anyone reaching
      // for the LI's judgment. The live judge nonetheless credited exactly that, and put the
      // deference it had invented in a prose NOTE where nothing could check it. The note is no
      // longer where the reasoning goes: the judge must name the RESPONDER, the RECIPIENT, the
      // depicted RESPONSE and the protagonist's INTERPRETATION, and cite prose for each.
      //
      // The checker verifies what it can verify — that all four are answered and that every
      // citation is verbatim here — and nothing more. Whether a quoted line really shows that
      // person responding stays the judge's call; forcing it into four labelled, cited fields
      // makes a wrong call inspectable instead of invisible.
      //
      // OVERLAP IS NOT A DEFECT. One sentence may carry several of the four — "I could hear the
      // courtiers fall silent when Julian approached, and I resented how little it cost him"
      // holds all four — so overlapping or identical spans are recorded as a signal and never
      // penalised. This was agreed explicitly and the earlier substring prohibition is withdrawn.
      var sp = null;
      if (f.evidenceKind === 'social_proof_with_pc_interpretation') {
        var raw = (v.socialProof && typeof v.socialProof === 'object') ? v.socialProof : {};
        var parts = [['responder', 'who responded'], ['recipient', 'who they responded to'],
                     ['response', 'what the response was'], ['interpretation', 'how the protagonist read it']];
        sp = { components: {}, missing: [], problems: [], overlaps: [] };
        parts.forEach(function (p) {
          var key = p[0], named = normalise(raw[key] && raw[key].named);
          var q = validateQuotation(raw[key] && raw[key].quote, reader,
            { required: !!PASSING[claimed], label: 'socialProof.' + key });
          sp.components[key] = { named: named || null, quote: q.text, excerpts: q.excerpts,
            asks: p[1], problems: q.problems };
          if (!named && !q.excerpts.length) sp.missing.push(key);
          sp.problems = sp.problems.concat(q.problems);
        });
        parts.forEach(function (p, i) {
          parts.slice(i + 1).forEach(function (q2) {
            if (spansOverlap(sp.components[p[0]].quote, sp.components[q2[0]].quote)) {
              sp.overlaps.push(p[0] + '≡' + q2[0]);
            }
          });
        });
        sp.overlapNote = 'Overlapping or identical spans are permitted; one sentence may carry '
          + 'the reaction and the reading of it. Recorded as a signal only.';
        // The one structural thing a named responder settles that free-text scanning could not:
        // the responder must not BE the recipient. The judge names both, so this is a check on
        // its own answer rather than a guess about prose.
        var rName = (sp.components.responder.named || '').toLowerCase();
        var liName = String(b.character || '').toLowerCase();
        if (rName && liName && (rName === liName || rName === liName.split(/\s+/)[0]
            || (liName.indexOf(rName) !== -1 && rName.length > 2))) {
          sp.selfResponse = true;
        }
        f.socialProof = sp;
        // Advisory only, unchanged in force: these set no status.
        f.socialProofSignals = { responder: socialProofResponder(sp.components.response.quote || evAct.text,
            b.character, opts.roster || []),
          advisory: characterPlusEvidenceSignals(sp.components.response.quote || evAct.text || ''),
          note: 'Signals only. They do not set or change the status.' };
      }

      // ── WHAT HAPPENED TO THE REQUIRED ACT (Roman 2026-10-15) ───────────────────────────
      // Stated by the judge, in context, not inferred from modal vocabulary. A cited action
      // containing "could" may describe a reaction that genuinely occurred; the same word may
      // frame one that never did. The modal scan survives only as an ADVISORY note beside the
      // judge's answer, and sets no status — the blanket modal rejection is withdrawn.
      var occ = null;
      if (rule.needsAction && b.requiresOccurrence !== false) {
        var stated = normalise(v.occurrence).toLowerCase();
        if (!stated) {
          if (PASSING[claimed]) problems.push({ code: EVIDENCE_PROBLEM.MISSING, label: 'occurrence',
            remedy: 'state one of: performed | contemplated | negated | asserted' });
        } else if (!OCCURRENCE[stated]) {
          problems.push({ code: 'unknown_occurrence_value', label: 'occurrence', got: stated });
        } else {
          occ = stated;
          f.occurrence = stated;
          f.occurrenceAdvisory = MODAL_RX.test(evAct.text || '')
            ? 'the cited action contains a modal or conditional clause — this is NOT a defect by '
              + 'itself and changes no status; it is noted so a "performed" answer beside a purely '
              + 'hypothetical citation can be seen'
            : null;
        }
      }

      if (problems.length) {
        f.status = STATUS.UNVERIFIED; f.verified = false; f.material = false;
        f.evidenceProblems = problems;
        problems.forEach(function (p) {
          f.reasons.push('EVIDENCE DEFECT (' + p.code + ')' + (p.label ? ' on ' + p.label : '')
            + (p.remedy ? ' — ' + p.remedy : '')
            + (p.quote ? ' — cited: "' + String(p.quote).slice(0, 80) + '"' : ''));
        });
        f.reasons.push('UNVERIFIED means the verdict did not evidence its claim. It does NOT mean '
          + 'the scene lacks this beat, and it is not a repair instruction.');
        if (evAct.excerpts.length) f.actionPassage = evAct.text;
        if (evCon.excerpts.length) f.consequencePassage = evCon.text;
        return f;
      }

      if (PASSING[claimed]) {
        f.actionPassage = evAct.text; f.consequencePassage = evCon.text;
        if (sp && sp.missing.length) {
          f.status = STATUS.UNVERIFIED;
          f.reasons.push('social proof was credited without naming ' + sp.missing.join(', ')
            + ' — each of responder, recipient, response and interpretation must be named and cited');
          f.reasons.push('UNVERIFIED: the verdict did not evidence its claim; this is not a finding '
            + 'that the scene lacks social proof.');
          return f;
        }
        if (sp && sp.selfResponse) {
          f.status = STATUS.MISSED; f.material = true; f.verified = true;
          f.reasons.push('the named responder IS the love interest — their own reaction is not '
            + 'social proof; another person must respond to them');
          return f;
        }
        if (occ && !OCCURRENCE[occ].passing) {
          f.status = OCCURRENCE[occ].maps; f.material = true; f.verified = true;
          f.reasons.push('the required act was ' + occ + ', not performed'
            + (v.occurrenceEvidence ? ' — ' + normalise(v.occurrenceEvidence) : ''));
          return f;
        }
        // ── GOOD CHARACTER+ IS NOT THE ASSIGNED FACET (Roman 2026-10-15) ─────────────────
        // Seren's delivered passage reads her genuinely — "imprecision wearing the clothes of
        // kindness" — and says nothing about her kindness needing an audience, which is the truth
        // the assignment named. A different insight landing is a real achievement and is recorded
        // as one; it does not discharge the obligation, and the facet must not be marked delivered
        // because something else was good. The two are reported apart, and PARTIAL is what
        // "Character+ landed, assigned facet did not" means.
        if (b.kind === 'character_plus' && b.assignedFacet) {
          var landed = v.characterPlusLanded !== false;
          var fq = validateQuotation(v.facetQuote, reader, { label: 'facetQuote' });
          var delivered = v.assignedFacetDelivered === true && !!fq.excerpts.length;
          f.facet = { assigned: b.assignedFacet, delivered: delivered,
            characterPlusLanded: landed, quote: fq.text,
            judgeSaidDelivered: v.assignedFacetDelivered === true,
            quoteProblems: fq.problems,
            note: delivered ? null
              : 'The assigned facet is NOT recorded as delivered. Any other insight the passage '
                + 'achieved is recorded separately and does not discharge this obligation.' };
          if (!delivered) {
            f.status = landed ? STATUS.PARTIAL : STATUS.MISSED;
            f.material = true; f.verified = true;
            f.reasons.push(landed
              ? 'Character+ landed but the ASSIGNED facet was not delivered: ' + b.assignedFacet
              : 'neither Character+ nor the assigned facet was delivered: ' + b.assignedFacet);
            if (fq.problems.length) f.reasons.push('facetQuote was supplied but unverifiable ('
              + fq.problems.map(function (p) { return p.code; }).join(', ') + ')');
            return f;
          }
        }
        f.status = STATUS.FULFILLED; f.verified = true; f.material = false; return f;
      }

      f.status = claimed; f.verified = true; f.material = !!KNOWN_INCORRECT[claimed];
      f.actionPassage = evAct.text; f.consequencePassage = evCon.text;
      if (v.note) f.reasons.push(String(v.note));
      return f;
    });

    return { revisionId: rev, reader: reader, branches: branchesOf(draft), findings: findings,
      byId: findings.reduce(function (m, f) { m[f.id] = f; return m; }, {}),
      material: findings.filter(function (f) { return f.material; }),
      unverified: findings.filter(function (f) { return f.status === STATUS.UNVERIFIED; }),
      evidenceDefects: findings.filter(function (f) { return (f.evidenceProblems || []).length; }) };
  }

  // ── ONE DEFINITION OF THE REPLY THE JUDGE OWES ─────────────────────────────────────────────
  // The checker's requirements and the prompt's instructions were two hand-maintained lists, and
  // the live run proved what that costs: the prompt asked for a free-text note and the checker
  // had nothing to verify, so invented deference passed. The contract is now generated from the
  // same beats the checker evaluates, so a field the checker demands is always a field the judge
  // was asked for.
  function judgeContract(beats) {
    var list = (beats || []).filter(function (b) { return b && b.id && b.essential !== false; });
    var needsOcc = list.filter(function (b) {
      return ruleFor(b.evidenceKind).needsAction && b.requiresOccurrence !== false; });
    var needsSP = list.filter(function (b) {
      return String(b.evidenceKind) === 'social_proof_with_pc_interpretation'; });
    var needsFacet = list.filter(function (b) { return b.kind === 'character_plus' && b.assignedFacet; });
    var lines = [];
    lines.push('Return ONLY JSON: {"verdicts":[ ... one object per requirement id ... ]}');
    lines.push('');
    lines.push('EVERY object: {"id":"<exact id>","status":"<' + Object.keys(STATUS_VALUES).join('|') + '>",'
      + '"actionPassage":<quotation>,"consequencePassage":<quotation>,"note":"<one sentence>"}');
    lines.push('');
    lines.push('A <quotation> is EITHER one string copied EXACTLY from the scene, OR a list of such '
      + 'strings. Never join non-adjacent excerpts with "..." or an ellipsis — that is not a '
      + 'quotation of anything. If your evidence is two separate places in the prose, supply them '
      + 'as a list of two strings. Every quotation you supply is checked against the scene, '
      + 'including ones a requirement does not strictly need. If you cannot quote it, omit the '
      + 'field; do not paraphrase and do not reconstruct.');
    lines.push('Quotations MAY overlap, and MAY be the same sentence. One sentence can carry both '
      + 'a reaction and the reading of it. That is expected, not a problem.');
    if (needsOcc.length) {
      lines.push('');
      lines.push('THESE REQUIREMENTS NAME AN ACT THAT MUST OCCUR: ' + needsOcc.map(function (b) { return b.id; }).join(', '));
      lines.push('For each, add "occurrence" with EXACTLY ONE of: '
        + '"performed" (it happens in the prose) · "contemplated" (the prose weighs or offers it and '
        + 'it does not happen) · "negated" (the prose states it does not happen, or the opposite '
        + 'happens) · "asserted" (later prose refers back to it as done, but it is never shown). '
        + 'Decide from the surrounding prose, not from single words: a sentence containing "could" '
        + 'may report something that genuinely happened ("I could hear the courtiers fall silent '
        + 'when he approached") or something that never did ("I could tear the band away"). Add '
        + '"occurrenceEvidence" with one short sentence saying what in the prose settles it.');
    }
    if (needsSP.length) {
      lines.push('');
      lines.push('THESE REQUIREMENTS ARE SOCIAL PROOF: ' + needsSP.map(function (b) { return b.id; }).join(', '));
      lines.push('For each, add "socialProof" naming FOUR things, each with a verbatim quotation:');
      lines.push('  "socialProof": {');
      lines.push('    "responder":      {"named":"<who responded>",        "quote":<quotation>},');
      lines.push('    "recipient":      {"named":"<who they responded to>","quote":<quotation>},');
      lines.push('    "response":       {"named":"<what they did>",        "quote":<quotation>},');
      lines.push('    "interpretation": {"named":"<how the protagonist read it>","quote":<quotation>}}');
      lines.push('  The responder must be SOMEONE OTHER than the person being established. Their own '
        + 'reaction, their appearance, their posture and their stillness are not social proof.');
      // ── THE INTERPRETATION DOES NOT HAVE TO BE A DECLARATION (Roman 2026-10-15) ──────────
      // Without this the judge looks for a sentence saying how she felt, and the best writing
      // does not contain one: the viewpoint sits in the selection. A checker that demands the
      // declaration rewards exactly the explanatory aftermath we are trying to remove.
      lines.push('  THE INTERPRETATION MAY BE IMPLICIT, AND MAY SHARE A SENTENCE WITH THE RESPONSE. '
        + 'It counts when the protagonist\'s reading is carried by what she selects to notice, what '
        + 'she compares it to, the diction she reaches for, or a contrast she draws. She does NOT '
        + 'have to state what she felt. Quote the span that carries it and say in "named" HOW it '
        + 'carries it (for example: "carried by her choosing to watch him rather than the rite").');
      lines.push('  Do NOT require, or reward, a separate explanatory sentence after the staged '
        + 'moment. A reaction that is staged and then explained again is weaker, not stronger. If '
        + 'the staging carries her reading, that is a fulfilled interpretation.');
      lines.push('  BEING NAMED IN A LIST IS NOT A RESPONSE. Appearing among a group of people, or '
        + 'being described as trained, senior or capable, establishes neither deference nor anyone '
        + 'turning toward them. If no one in the prose responds to this person, the status is '
        + '"missed" — do not credit it from a mention.');
      lines.push('  Do not state a responder, a response or an interpretation that your own '
        + 'quotations do not show. An unsupported component is worse than "missed".');
    }
    if (needsFacet.length) {
      lines.push('');
      lines.push('THESE REQUIREMENTS NAME A SPECIFIC ASSIGNED TRUTH: ' + needsFacet.map(function (b) { return b.id; }).join(', '));
      lines.push('For each, answer the two questions SEPARATELY:');
      lines.push('  "characterPlusLanded": true/false — did the prose give a revealing perception of '
        + 'this person through the protagonist\'s own worldview, history, mask or bias?');
      lines.push('  "assignedFacetDelivered": true/false — did it deliver THE ASSIGNED TRUTH named in '
        + 'the requirement, specifically? plus "facetQuote":<quotation> showing where.');
      lines.push('  A passage may be genuinely revealing about someone and still not deliver the '
        + 'assigned truth. Say so: true for the first, false for the second. Do NOT report the '
        + 'assigned truth as delivered because a different insight landed well.');
    }
    return { text: lines.join('\n'), requires: {
      occurrence: needsOcc.map(function (b) { return b.id; }),
      socialProof: needsSP.map(function (b) { return b.id; }),
      assignedFacet: needsFacet.map(function (b) { return b.id; }) } };
  }

  // ── WHICH PASSAGES ARE IN SCOPE FOR THE EDIT ───────────────────────────────
  // Opening and closing passages are preserved ONLY when no material failure
  // touches them. A broken closing decision is exactly the passage that must be
  // editable, so "preserve the closing beat" can never be unconditional.
  function affectedRegions(ev, beatsById) {
    var ss = sentences(ev.reader);
    var open = ss[0] || '', close = ss[ss.length - 1] || '';
    var out = { opening: false, closing: false, why: [] };
    ev.material.forEach(function (f) {
      var b = (beatsById || {})[f.id] || {};
      var region = f.region || b.region || null;
      if (region === 'opening') { out.opening = true; out.why.push(f.id + ' is an opening beat'); }
      if (region === 'closing') { out.closing = true; out.why.push(f.id + ' is a closing beat'); }
      [f.actionPassage, f.consequencePassage].filter(Boolean).forEach(function (p) {
        var pn = normalise(p).toLowerCase();
        if (pn && normalise(open).toLowerCase().indexOf(pn) !== -1) { out.opening = true; out.why.push(f.id + ' is anchored in the opening sentence'); }
        if (pn && normalise(close).toLowerCase().indexOf(pn) !== -1) { out.closing = true; out.why.push(f.id + ' is anchored in the closing sentence'); }
      });
    });
    return { opening: out.opening, closing: out.closing, why: out.why, openingSentence: open, closingSentence: close };
  }

  // ── THE EDITING BRIEF ──────────────────────────────────────────────────────
  // Names WHAT must become true and WHICH sentences are implicated. No prose, no
  // wording, no word quota. Carries dependencies and disclosure limits so a local
  // fix cannot break a downstream event or spill a secret.
  function buildBrief(ev, ctx) {
    ctx = ctx || {};
    if (!ev || !ev.material || !ev.material.length) return null;
    var beatsById = ctx.beatsById || {};
    var aff = affectedRegions(ev, beatsById);
    var items = ev.material.map(function (f) {
      var b = beatsById[f.id] || {};
      return { id: f.id, kind: f.kind, status: f.status, evidenceKind: f.evidenceKind,
        region: f.region || b.region || null,
        requirement: b.description || null,
        why: f.reasons.slice(),
        anchorPassages: [f.actionPassage, f.consequencePassage].filter(Boolean),
        mustRemainTrue: f.produces || [],
        dependencies: (f.dependsOn || []).map(function (d) {
          return typeof d === 'string' ? d
            : (d && (d.beat || d.fact) ? String(d.beat || d.fact) + (d.reason ? ' (' + d.reason + ')' : '') : '');
        }).filter(Boolean),
        disclosureLimits: b.disclosure || null,
        // Character+ repairs need the governing interpretation and the viewpoint bound,
        // or an editor will reach for appearance or a tell — the two channels that do
        // not satisfy it.
        character: b.character || null,
        mode: b.mode || null,
        isPC: b.isPC || false,
        coverage: b.coverage || null,
        owes: (b.coverage && b.coverage.kind === 'recurring')
          ? (b.coverage.depictionMode === 'echo_reinterpret'
              ? 'A RETURN, NOT A RESTATEMENT: revisit the established impression and show a different implication, cost, exception or meaning.'
              : 'BROADEN: show a different grounded facet that complicates the established reading.')
          : (b.coverage && b.coverage.kind === 'introduction'
              ? 'FIRST IMPRESSION: establish the reading; it is neither an echo nor a broadening.' : null),
        // Carried into the repair so a targeted edit restores SOCIAL PROOF plus its reading,
        // reusing the existing LI social-proof wording rather than a second polish pass.
        requiresSocialProof: b.requiresSocialProof || undefined,
        socialProof: b.socialProof || undefined,
        pcInterpretation: b.pcInterpretation || null,
        viewpoint: b.viewpoint || null,
        // Only a real seal produces a prohibition. An unsealed canonical facet produces a STYLE
        // note instead, so a repair may deliver the admission or the observation it needs.
        mustNotReveal: b.evidenceKind === 'concealed_action_with_visible_consequence'
          ? 'This beat is CONCEALED. Repair its visible consequence only; do not reveal, hint at or explain the act itself.'
          : ((b.disclosure && b.disclosure.sealed)
            ? ('SEALED: ' + (b.disclosure.sealedTruth || 'this truth')
               + ' may not reach the page in any form yet.')
            : null),
        // A seal forbids disclosure, not relational charge — but the availability is conditional
        // and is carried with its conditions attached, never as an invitation.
        relationalReactionAvailability: (b.disclosure && b.disclosure.sealed)
          ? b.disclosure.relationalReactionAvailability || null : null,
        styleNote: (b.disclosure && b.disclosure.sealed === false)
          ? b.disclosure.styleConstraint : null,
        expressionPermitted: (b.disclosure && b.disclosure.sealed === false)
          ? b.disclosure.permitted : null };
    });
    return {
      revisionId: ev.revisionId, scope: 'targeted',
      instruction: 'Repair only the passages named below, plus any immediately dependent sentence '
        + 'that must change for continuity. Preserve all other prose exactly. Keep every item under '
        + 'mustNotReveal concealed. Do not add length for its own sake.',
      // ── TIGHTEN AND INTEGRATE; DO NOT APPEND (Roman 2026-10-15) ────────────────────────────
      // The first live repair appended 67 words to a working paragraph and explained what its own
      // staging already said. The brief now states the default plainly, because an editor given a
      // paragraph and a missing requirement will otherwise reach for addition every time.
      style: {
        preferIntegration: 'WORK INSIDE THE EXISTING SENTENCES WHERE YOU CAN. Tighten, re-aim or '
          + 'extend a sentence that is already there in preference to adding new ones. Appending a '
          + 'block of new prose to the end of a paragraph is the last resort, not the first move.',
        compression: CP_STYLE.compression,
        breadth: CP_STYLE.breadth,
        notChecklist: CP_STYLE.notChecklist,

        implicitViewpoint: CP_STYLE.implicitViewpoint,
        noNewCast: CP_STYLE.noNewCast,
        keepTiming: 'The paragraph\'s place in the scene\'s sequence does not change, and nothing '
          + 'you add may take over the moment from whoever it currently belongs to.'
      },
      // ── THE DOCTRINE THE AUTHOR ALREADY HAD, WHICH THE EDITOR DID NOT (Roman 2026-10-15) ──
      // A faithful selection of the established Character+ doctrine, read from app.js so there is
      // one source: the compact framing, the annotated Jess/ring exemplar with the law that
      // separates them, the governing principle, the fusion bar, the not-a-checklist permission,
      // and the banned shape with its mechanism-not-pattern clarification.
      //
      // DELIBERATELY NOT THE WHOLE AUTHOR PROMPT. The nine-mechanism table is omitted: an editor
      // rewriting one paragraph needs the physics and the one worked distinction, not a menu of
      // nine shapes to choose from — and a mechanism table in a one-paragraph brief is an
      // invitation to copy a shape rather than find the one this moment affords.
      characterPlusDoctrine: (function () {
        try {
          var f = (typeof globalThis !== 'undefined') && globalThis._cpDoctrineExcerptForRepair;
          return typeof f === 'function' ? f() : null;
        } catch (_) { return null; }
      })(),
      items: items,
      // Only UNAFFECTED boundaries are protected, and each is stated as a fact about
      // this draft rather than a blanket rule.
      preserve: {
        opening: aff.opening ? null : aff.openingSentence.slice(0, 180),
        closing: aff.closing ? null : aff.closingSentence.slice(-180)
      },
      editable: [].concat(aff.opening ? ['opening'] : [], aff.closing ? ['closing'] : []),
      editableWhy: aff.why,
      advisory: ctx.advisory || null   // Character+ leads; never requirements
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE DEDICATED CHARACTER+ EDITOR — KEEP OR ONE LOCALIZED EDIT  (Roman 2026-10-16)
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // A different shape from the judge-driven repair: no verdict controls it. The editor is given
  // the scene, who is due a depiction, the grounded facts, the viewpoint, the disclosure limits
  // and the relevant prior depictions, and it answers one of two ways.
  //
  // KEEP IS A FIRST-CLASS ANSWER. The repair path could only edit, so "this already works" was
  // inexpressible and the model's only way to comply was to change something. A KEEP must quote
  // the working passage EXACTLY, which is what makes it checkable and what stops it being a
  // polite way of doing nothing.
  //
  // It reuses the existing authorization machinery unchanged: paragraphsOf for refs,
  // authorizeRepairRegions for scope, validateRepairReply for the edit, spliceAuthorized to
  // apply. Nothing here is a parallel edit system.
  function editorContract(opts) {
    opts = opts || {};
    var refs = (opts.regions || []).map(function (r) { return r.ref + ':' + r.op; });
    return [
      'Return ONLY JSON, in ONE of these two shapes.',
      '',
      'IF THE SCENE ALREADY DELIVERS THE DEPICTION — keep it, and prove you found it:',
      '  {"decision":"keep","keptPassage":"<copied EXACTLY from the scene>","why":"<one sentence>"}',
      '  A kept passage must be verbatim. Keeping is a real answer and is often the right one:',
      '  prose that already works must not be rewritten to express a different insight.',
      '',
      'OTHERWISE — one localized change, in the authorized region(s) only:',
      '  {"decision":"edit","paragraphs":[{"ref":"<ref>","op":"<op>","text":"<prose>"}]}',
      '  Authorized: ' + (refs.length ? refs.join(', ') : '(none)'),
      '  PREFER ONE SHARP SENTENCE. Two when the moment needs them. Never a rewritten scene,',
      '  never an explanatory paragraph, never a note to the reader about what you did.',
      '',
      'EITHER WAY: preserve the plot, the reader\'s choices, established canon, and every passage',
      'listed under protectedPassages — verbatim. An edit that drops one is rejected in full.'
    ].join('\n');
  }
  // Accepts either shape. A KEEP is verified against the scene; an edit goes through the
  // existing validateRepairReply so authorization, protection and marker rules are identical.
  function validateEditorReply(raw, slots, paragraphs, reader) {
    var out = { decision: null, ok: false, kept: null, items: [], rejected: [], code: null };
    var parsed = raw;
    if (typeof raw === 'string') {
      var t = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      try { parsed = JSON.parse(t); }
      catch (_) { var m = t.match(/\{[\s\S]*\}/); try { parsed = m ? JSON.parse(m[0]) : null; } catch (__) { parsed = null; } }
    }
    if (!parsed || typeof parsed !== 'object') { out.code = CP_REJECT.MALFORMED; return out; }
    var d = String(parsed.decision || (Array.isArray(parsed.paragraphs) ? 'edit' : '')).toLowerCase();
    if (d === 'keep') {
      out.decision = 'keep';
      var q = normalise(parsed.keptPassage);
      if (!q) { out.code = 'keep_without_passage';
        out.rejected.push({ code: out.code, reason: 'a KEEP must quote the passage it is keeping' });
        return out; }
      if (!quotePresent(q, String(reader || ''))) { out.code = 'kept_passage_not_verbatim';
        out.rejected.push({ code: out.code, quote: q,
          reason: 'the kept passage is not verbatim in this scene — a KEEP must point at real prose' });
        return out; }
      out.ok = true; out.kept = { passage: q, why: normalise(parsed.why) || null };
      return out;
    }
    if (d === 'edit') {
      out.decision = 'edit';
      var v = validateRepairReply(parsed, slots, paragraphs);
      out.ok = v.items.length > 0; out.items = v.items; out.rejected = v.rejected;
      out.code = v.code || (out.ok ? null : 'no_usable_edit');
      return out;
    }
    out.code = 'unknown_decision';
    out.rejected.push({ code: out.code, got: d || '(none)',
      reason: 'decision must be "keep" or "edit"' });
    return out;
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // FOUR-CHARACTER COVERAGE IN ONE CALL  (Roman 2026-10-16)
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // One editor call covering several obligations needs a reply shape the single-obligation
  // contract cannot express: two characters can legitimately share a paragraph, and if each
  // returned its own full replacement for that paragraph the second would silently overwrite the
  // first. So the DECISION is per obligation and the TEXT is per region: one replacement per
  // paragraph, naming every obligation it serves.
  //
  // KEEP remains first-class and per character. A coverage test is not a requirement to
  // manufacture an edit for everyone.
  function coverageContract(slots, ids) {
    var byRef = {};
    (slots || []).forEach(function (s) {
      var k = s.ref + ':' + s.op;
      byRef[k] = (s.beatIds || [s.beatId]).join(', ');
    });
    var regionLines = Object.keys(byRef).map(function (k) {
      return '    ' + k + '   serves: ' + byRef[k]; });
    return [
      'Return ONLY JSON with BOTH arrays, in this shape:',
      '',
      '{"decisions":[',
      '   {"id":"<obligation id>","decision":"keep","keptPassage":"<copied EXACTLY from the scene>","why":"<one sentence>"},',
      '   {"id":"<obligation id>","decision":"edit","ref":"<region ref>","why":"<one sentence>"}',
      ' ],',
      ' "edits":[',
      '   {"ref":"<region ref>","op":"<its op>","text":"<prose>","forObligations":["<id>","<id>"]}',
      ' ]}',
      '',
      'ONE DECISION PER OBLIGATION, for all of these: ' + (ids || []).join(', '),
      '',
      'ONE TEXT PER REGION. If two obligations share a region, give that region a SINGLE '
        + 'replacement that serves both and list both under forObligations. Never return two texts '
        + 'for the same ref — the second would overwrite the first.',
      '',
      'Authorized regions:',
      regionLines.join('\n'),
      '',
      'A KEEP must quote the scene verbatim. Keeping is a real answer and is often the right one.',
      'An edit must stay inside its authorized region, preserve every protectedPassage verbatim,',
      'and prefer one sharp sentence.'
    ].join('\n');
  }
  // Validates the grouped shape. Decisions and texts are checked separately, then cross-checked:
  // an obligation that chose "edit" must have a text covering it, and a text must not claim an
  // obligation that chose "keep".
  function validateCoverageReply(raw, slots, paragraphs, reader, ids) {
    var out = { ok: false, code: null, keeps: [], items: [], rejected: [], unanswered: [] };
    var parsed = raw;
    if (typeof raw === 'string') {
      var t = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      try { parsed = JSON.parse(t); }
      catch (_) { var m = t.match(/\{[\s\S]*\}/); try { parsed = m ? JSON.parse(m[0]) : null; } catch (__) { parsed = null; } }
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.decisions)) {
      out.code = CP_REJECT.MALFORMED; return out;
    }
    var want = {}; (ids || []).forEach(function (i) { want[i] = true; });
    var chose = {};
    parsed.decisions.forEach(function (d) {
      var id = String((d && d.id) || '');
      if (!want[id]) return out.rejected.push({ id: id, code: 'unknown_obligation',
        reason: 'no obligation with id "' + id + '" was requested' });
      if (chose[id]) return out.rejected.push({ id: id, code: 'duplicate_decision' });
      var dec = String((d && d.decision) || '').toLowerCase();
      if (dec === 'keep') {
        var q = normalise(d.keptPassage);
        if (!q) return out.rejected.push({ id: id, code: 'keep_without_passage' });
        if (!quotePresent(q, String(reader || ''))) {
          return out.rejected.push({ id: id, code: 'kept_passage_not_verbatim', quote: q });
        }
        chose[id] = 'keep';
        out.keeps.push({ id: id, passage: q, why: normalise(d.why) || null });
      } else if (dec === 'edit') {
        chose[id] = 'edit';
      } else {
        out.rejected.push({ id: id, code: 'unknown_decision', got: dec || '(none)' });
      }
    });
    // The texts, through the existing authorization machinery.
    if (Array.isArray(parsed.edits) && parsed.edits.length) {
      var v = validateRepairReply({ paragraphs: parsed.edits }, slots, paragraphs);
      out.items = v.items;
      out.rejected = out.rejected.concat(v.rejected || []);
      if (!v.items.length && v.code) out.code = v.code;
    }
    // Cross-check: every obligation that chose edit must be covered by an accepted text.
    var covered = {};
    out.items.forEach(function (it) {
      (it.beatIds || [it.beatId]).forEach(function (id) { covered[id] = true; }); });
    Object.keys(want).forEach(function (id) {
      if (!chose[id]) { out.unanswered.push({ id: id, why: 'no decision returned' }); return; }
      if (chose[id] === 'edit' && !covered[id]) {
        out.unanswered.push({ id: id, why: 'chose edit but no accepted text covers it' });
      }
    });
    out.ok = (out.keeps.length + out.items.length) > 0;
    return out;
  }

  // ── APPLICATION-OWNED REPAIR REGIONS ───────────────────────────────────────
  // THE MODEL NEVER NAMES A LOCATION. The application splits the draft into
  // backend-issued paragraph refs, decides which refs a FAILED requirement actually
  // touches, and asks for replacement text for THOSE REFS ONLY. The backend splices.
  //
  // This is the authorization model the codebase already uses for Character+ canon
  // repair (app.js:142354 _cpParagraphs / :142367 _cpRepairValidate / :142392
  // _cpSpliceParagraphs), and its rejection vocabulary is reused verbatim so the two
  // paths cannot drift. The earlier version of this file let the REPAIR supply any
  // unique anchor, which meant a marker-free scene could be its own anchor and a
  // whole-scene rewrite was still expressible. Scope ownership, not a length limit,
  // is what closes that: a ref the application did not authorize is refused, and the
  // model cannot invent one.
  //
  // Non-prose data is preserved because only PROSE paragraphs are authorizable and
  // the splice is by byte offset: metadata headers, the micro-decision widget and the
  // branch appendix are never offered to the editor and never reassembled.
  var CP_REJECT = { MALFORMED: 'malformed_response', UNKNOWN: 'unknown_paragraph_ref',
    EXTRA: 'extra_paragraph', DUPLICATE: 'duplicate_paragraph', MISSING: 'missing_paragraph',
    EMPTY: 'empty_replacement', UNAUTHORIZED: 'unauthorized_ref', NON_PROSE: 'non_prose_ref',
    // Protected content that shares a paragraph with an eligible repair must SURVIVE the edit.
    // Enforced by validation, not by asking the editor nicely.
    PROTECTED: 'protected_passage_removed' };

  // Backend-issued refs, with byte offsets so the splice preserves original separators.
  function paragraphsOf(draft) {
    var src = String(draft == null ? '' : draft);
    var out = [], n = 0, idx = 0;
    src.split(/(\n\s*\n)/).forEach(function (chunk, i) {
      if (i % 2 === 1) { idx += chunk.length; return; }   // the separator itself
      var start = idx; idx += chunk.length;
      if (!chunk.trim()) return;
      var isMeta = /^\s*\[(CHARACTERS|TITLE|SYNOPSIS)\s*:/i.test(chunk) || /^\s*-{3,}\s*$/.test(chunk);
      var hasMarker = /<<[^>]*>>/.test(chunk);
      out.push({ ref: 'P' + (++n), text: chunk, start: start, end: start + chunk.length,
        isProse: !isMeta && !hasMarker, why: isMeta ? 'metadata' : (hasMarker ? 'control markers' : null) });
    });
    return out;
  }

  // WHICH REGIONS THE APPLICATION AUTHORIZES, derived from failed requirements only.
  // A slot exists because a material finding points at it — never because a repair
  // asked. Each slot names the beat it serves, so an edit is always traceable to an
  // actual failed requirement.
  function authorizeRepairRegions(ev, beatsById, paragraphs) {
    var paras = paragraphs || paragraphsOf(ev.reader);
    var prose = paras.filter(function (p) { return p.isProse; });
    var slots = [], refused = [];
    if (!prose.length) return { slots: [], refused: [{ reason: 'no prose paragraphs to authorize' }], paragraphs: paras };

    var firstProse = prose[0], lastProse = prose[prose.length - 1];

    // ── A NON-REPAIRABLE OBLIGATION AUTHORIZES NOTHING, AND IS PROTECTED ──────────────────
    // (Roman 2026-10-16) `repairable: false` was read only by the harness's own repair-only
    // mode. The connected path repairs ev.material and nothing filtered it, so a region was
    // authorized for `plot:band` — an obligation designated non-repairable — and the editor
    // changed it. The flag is now enforced HERE, where regions are issued, so every consumer
    // gets it.
    //
    // Its passages also become PROTECTED: a paragraph may legitimately carry both an eligible
    // repair and protected content, and in that case the region is still authorized but the
    // protected text must survive verbatim. That is checked in validateRepairReply rather than
    // requested of the editor.
    var _protectedByRef = {};
    (ev.findings || []).forEach(function (f) {
      var b = (beatsById || {})[f.id] || {};
      if (b.repairable !== false) return;
      [f.actionPassage, f.consequencePassage].filter(Boolean).forEach(function (q) {
        prose.forEach(function (pp) {
          if (!quotePresent(q, pp.text)) return;
          (_protectedByRef[pp.ref] = _protectedByRef[pp.ref] || []).push({ beatId: f.id, quote: q });
        });
      });
    });

    (ev.material || []).forEach(function (f) {
      var b = (beatsById || {})[f.id] || {};
      if (b.repairable === false) {
        refused.push({ beatId: f.id, reason: 'this obligation is marked repairable:false — it '
          + 'authorizes no edit, and its passages are protected from edits made for other beats' });
        return;
      }
      var region = f.region || b.region || null;
      var anchors = [f.actionPassage, f.consequencePassage].filter(Boolean);
      var hit = null;
      for (var i = 0; i < anchors.length && !hit; i++) {
        var a = normalise(anchors[i]).toLowerCase();
        hit = prose.find(function (p) { return normalise(p.text).toLowerCase().indexOf(a) !== -1; }) || null;
      }
      if (!hit && region === 'opening') hit = firstProse;
      if (!hit && region === 'closing') hit = lastProse;
      if (hit) {
        slots.push({ ref: hit.ref, op: 'replace', beatId: f.id, status: f.status,
          why: anchors.length ? 'a failed requirement is anchored in this paragraph'
            : ('this is the ' + region + ' paragraph and the ' + region + ' beat failed') });
        return;
      }
      // Nothing to replace: the beat is absent. The APPLICATION picks the insertion point.
      var opens = normalise(b.opensFrom || '').toLowerCase();
      var at = opens ? prose.find(function (p) { return normalise(p.text).toLowerCase().indexOf(opens) !== -1; }) : null;
      var why = opens ? 'opensFrom names this paragraph' : null;
      // ── A CHARACTER+ BEAT IS ANCHORED WHERE ITS PERSON IS (Roman 2026-10-15) ──────────
      // Without this every anchorless beat fell back to the SAME paragraph — the one before
      // the closing — so four material Character+ failures produced four identical ref+op
      // claims and the dedupe refused three of them by array order. One region was authorized,
      // it belonged to whichever beat happened to be first, and a repair could not reach the
      // other three people at all. That is the array-order dependence resurfacing in the
      // authorizer, and it is fixed by anchoring on the person rather than on a default: the
      // paragraph where this character is first on the page is a deterministic, model-free
      // choice, and it is also where their depiction belongs.
      //
      // AND IT IS AUTHORIZED AS A REPLACE, NOT AN INSERT (Roman 2026-10-15). Handing the editor
      // a neighbouring paragraph and an insertion point asks for an appended block; handing it
      // the paragraph the person is actually in asks it to work inside prose that already
      // exists, which is the integration the style default wants. An insert_after remains the
      // fallback for a beat whose person is nowhere on the page.
      if (!at && b.character) {
        var nm = String(b.character).toLowerCase().replace(/^the\s+/, '');
        var first = String(nm).split(/\s+/)[0];
        // ── A NAME ALONE IS INSUFFICIENT EVIDENCE — AND THAT IS NOT A DIALOGUE BAN ──────
        // (Roman 2026-10-16, corrected twice.) Matching on name occurrence anchored the
        // PROTAGONIST's own Character+ on Seren's spoken wish, because her name appears in
        // someone else's dialogue. That placement was wrong.
        //
        // MY FIX WAS WORSE THAN THE BUG. I disqualified names inside quotations and
        // predominantly-quoted paragraphs as depiction sites, which would have ruled out one of
        // the doctrine's own mechanisms: dialogue IS an allowed Character+ channel, and
        // "ANOTHER'S OBSERVATION, THEN HER RESPONSE" — someone addressing the protagonist — is
        // explicitly a first-person mode. A line like "Ah, Lirael. Still nursing baby birds, I
        // see." is an excellent depiction site. Those exclusions are WITHDRAWN.
        //
        // WHAT STANDS: a name occurrence is not sufficient evidence that a paragraph is the right
        // location. This fallback remains a weak heuristic and is NOT a validated location
        // selector. Where placement matters, it should be reviewed — the frozen coverage
        // experiment pins explicitly reviewed regions rather than trusting this.
        var found = prose.find(function (p) {
          var t = normalise(p.text).toLowerCase();
          return t.indexOf(nm) !== -1 || (first.length > 3 && t.indexOf(first) !== -1);
        }) || null;
        if (found) {
          slots.push({ ref: found.ref, op: 'replace', beatId: f.id, status: f.status,
            character: b.character || null,
            why: 'the paragraph ' + b.character + ' is already in — tighten or integrate here '
              + 'rather than appending elsewhere' });
          return;
        }
      }
      if (!at) { at = prose.length > 1 ? prose[prose.length - 2] : firstProse;
        why = 'application-chosen insertion point before the closing paragraph'; }
      slots.push({ ref: at.ref, op: 'insert_after', beatId: f.id, status: f.status,
        character: b.character || null, why: why });
    });

    // ── ONE PARAGRAPH, ONE REPLACEMENT, ALL OF ITS OBLIGATIONS (Roman 2026-10-15) ────────────
    // Refusing a second replace on the same paragraph was wrong. Characters share scene moments
    // constantly — a paragraph where the assembly reacts can legitimately owe depictions of two
    // or three people at once — and refusing the later claims silently dropped necessary repairs
    // by array order, which is the same defect in a new place.
    //
    // The fix is neither competing replacements (two rewrites of one paragraph cannot both be
    // spliced) nor relocation to an unrelated paragraph (which moves a depiction away from the
    // moment that grounds it). It is ONE replacement slot for the paragraph, carrying EVERY
    // applicable finding, so the editor rewrites that paragraph once while owing all of them —
    // and still owing everything the paragraph already did.
    var seen = {}, slotByKey = {}, keep = [];
    slots.forEach(function (s) {
      var k = s.ref + ':' + s.op;
      if (!seen[k]) {
        seen[k] = s.beatId;
        s.beatIds = [s.beatId];
        s.characters = s.character ? [s.character] : [];
        slotByKey[k] = s; keep.push(s); return;
      }
      if (s.op === 'replace') {
        var owner = slotByKey[k];
        if (owner.beatIds.indexOf(s.beatId) === -1) owner.beatIds.push(s.beatId);
        if (s.character && owner.characters.indexOf(s.character) === -1) owner.characters.push(s.character);
        owner.shared = true;
        owner.why = 'ONE replacement of this paragraph, owing ' + owner.beatIds.length
          + ' obligations at the same moment (' + owner.beatIds.join(', ') + '). Deliver every one '
          + 'of them inside this paragraph and keep everything it already does.';
        // ── ADDRESSED IS NOT FULFILLED (Roman 2026-10-15) ────────────────────────────────
        // A shared slot means one replacement was ASKED to satisfy several obligations. It is
        // not a claim that it did. Each obligation still earns its status from its own evidence
        // on the next assessment, and coverage credit still follows that evidence per
        // obligation — a single accepted edit never credits a depiction nobody can point to.
        owner.addressedNotProven = 'This region was authorized for ' + owner.beatIds.length
          + ' obligations. Accepting the edit means each was ADDRESSED, not that each was '
          + 'FULFILLED: every one is re-evidenced individually, and coverage credit follows the '
          + 'evidence for that obligation alone.';
        return;
      }
      var start = prose.findIndex(function (p) { return p.ref === s.ref; });
      var moved = null;
      for (var j = start + 1; j < prose.length - 1 && !moved; j++) {
        if (!seen[prose[j].ref + ':insert_after']) moved = prose[j];
      }
      for (var j2 = start - 1; j2 >= 0 && !moved; j2--) {
        if (!seen[prose[j2].ref + ':insert_after']) moved = prose[j2];
      }
      if (!moved) {
        refused.push({ ref: s.ref, beatId: s.beatId,
          reason: 'every prose paragraph before the closing is already authorized for another beat' });
        return;
      }
      seen[moved.ref + ':insert_after'] = s.beatId;
      keep.push({ ref: moved.ref, op: 'insert_after', beatId: s.beatId, beatIds: [s.beatId],
        status: s.status, character: s.character,
        characters: s.character ? [s.character] : [],
        why: s.why + ' — moved from ' + s.ref + ', already authorized for ' + seen[k] });
    });
    keep.forEach(function (sl) {
      var prot = _protectedByRef[sl.ref] || [];
      if (prot.length) {
        sl.protectedPassages = prot.map(function (x) { return x.quote; });
        sl.protectedFor = prot.map(function (x) { return x.beatId; });
        sl.protectedNote = 'This paragraph also carries content belonging to a non-repairable '
          + 'obligation. Every passage listed in protectedPassages must appear VERBATIM in your '
          + 'replacement; an edit that drops one is rejected in full.';
      }
    });
    return { slots: keep, refused: refused, paragraphs: paras,
      proseCount: prose.length, authorizedCount: keep.length,
      protectedByRef: _protectedByRef };
  }

  // EXACTLY the authorized refs, each once, each non-empty. Anything else discards
  // that item — a reply touching a region nobody authorized is not partially usable.
  function validateRepairReply(raw, slots, paragraphs) {
    var out = { ok: false, code: null, items: [], rejected: [] };
    var known = {}, authorized = {};
    (paragraphs || []).forEach(function (p) { known[p.ref] = p; });
    (slots || []).forEach(function (s) { authorized[s.ref + ':' + s.op] = s; });
    // ── A FENCED REPLY IS NOT A MALFORMED REPLY (Roman 2026-10-15) ──────────────────────────
    // The first live repair call returned correct, well-formed prose wrapped in a ```json fence
    // and this parser discarded the whole edit as malformed_response. The prose was fine; the
    // parser was strict about packaging. The fence is stripped, and a trailing or leading
    // explanation around the object is tolerated by taking the outermost object — the same
    // leniency the judge path already applies. What is NOT relaxed is anything downstream:
    // every ref is still checked against the authorized slots.
    var parsed = raw;
    if (typeof raw === 'string') {
      var s = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      try { parsed = JSON.parse(s); }
      catch (_) {
        var m = s.match(/\{[\s\S]*\}/);
        try { parsed = m ? JSON.parse(m[0]) : null; } catch (__) { parsed = null; }
      }
    }
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.paragraphs)) parsed = parsed.paragraphs;
    if (!Array.isArray(parsed)) { out.code = CP_REJECT.MALFORMED; return out; }

    var seen = {};
    parsed.forEach(function (it, i) {
      var ref = String((it && it.ref) || '');
      var op = String((it && it.op) || 'replace');
      var text = (it && typeof it.text === 'string') ? it.text : '';
      var tag = ref + ':' + op;
      if (!known[ref]) return out.rejected.push({ tag: tag, code: CP_REJECT.UNKNOWN, reason: 'ref "' + ref + '" is not a paragraph of this revision' });
      if (!known[ref].isProse) return out.rejected.push({ tag: tag, code: CP_REJECT.NON_PROSE, reason: 'ref "' + ref + '" is ' + known[ref].why + ', not prose' });
      if (!authorized[tag]) return out.rejected.push({ tag: tag, code: CP_REJECT.UNAUTHORIZED, reason: 'ref "' + ref + '" was not authorized for ' + op + ' — no failed requirement points at it' });
      if (seen[tag]) return out.rejected.push({ tag: tag, code: CP_REJECT.DUPLICATE, reason: 'ref "' + ref + '" returned twice' });
      if (!text.trim()) return out.rejected.push({ tag: tag, code: CP_REJECT.EMPTY, reason: 'empty replacement for "' + ref + '"' });
      if (/<<[^>]*>>/.test(text)) return out.rejected.push({ tag: tag, code: CP_REJECT.NON_PROSE, reason: 'replacement text introduces control markers' });
      // PROTECTED CONTENT SURVIVES, OR THE EDIT DOES NOT. Checked, not requested.
      var _prot = authorized[tag].protectedPassages || [];
      var _lost = _prot.filter(function (q) { return !quotePresent(q, text); });
      if (_lost.length) return out.rejected.push({ tag: tag, code: CP_REJECT.PROTECTED,
        reason: 'the replacement drops protected content belonging to a non-repairable obligation ('
          + (authorized[tag].protectedFor || []).join(', ') + '): "'
          + String(_lost[0]).slice(0, 80) + '"' });
      seen[tag] = 1;
      // A shared region carries every obligation it was authorized for, so one accepted
      // replacement resolves all of them rather than only the first.
      out.items.push({ ref: ref, op: op, text: text, beatId: authorized[tag].beatId,
        beatIds: (authorized[tag].beatIds || [authorized[tag].beatId]).slice(),
        // ADDRESSED, not fulfilled. The flag below is what downstream accounting must read: an
        // accepted shared edit resolves "did the editor answer this region", never "is this
        // obligation now delivered". That stays a question for evidence.
        addressed: (authorized[tag].beatIds || [authorized[tag].beatId]).slice(),
        provesFulfilment: false });
    });
    out.ok = out.items.length > 0;
    return out;
  }

  // THE BACKEND SPLICES, by byte offset, so every byte outside an authorized region
  // is preserved exactly — including the separators between paragraphs.
  function spliceAuthorized(draft, paragraphs, items) {
    var src = String(draft == null ? '' : draft);
    var byRef = {};
    (paragraphs || []).forEach(function (p) { byRef[p.ref] = p; });
    var ops = (items || []).map(function (it) {
      var p = byRef[it.ref];
      if (!p) return null;
      return it.op === 'replace'
        ? { start: p.start, end: p.end, text: it.text, ref: it.ref, op: it.op, replaced: p.text, beatId: it.beatId }
        : { start: p.end, end: p.end, text: '\n\n' + it.text, ref: it.ref, op: it.op, replaced: '', beatId: it.beatId };
    }).filter(Boolean).sort(function (a, b) { return b.start - a.start; });
    var out = src;
    ops.forEach(function (o) { out = out.slice(0, o.start) + o.text + out.slice(o.end); });
    return { text: out, applied: ops.slice().reverse().map(function (o) {
      return { tag: o.beatId, ref: o.ref, op: o.op, replaced: o.replaced, inserted: o.text.trim() }; }) };
  }

  // Everything outside the applied spans must be byte-identical. This is true by
  // construction; it is asserted anyway, because "by construction" is a claim.
  function unaffectedBytesPreserved(before, after, applied) {
    var b = String(before), a = String(after);
    var bCuts = [], aCuts = [];
    var delta = 0;
    applied.slice().sort(function (x, y) { return x.anchor && y.anchor ? 0 : 0; });
    // Recompute spans in both texts by walking the same edit list in order.
    var ordered = applied.slice();
    var okAll = true;
    ordered.forEach(function (e) {
      // ── AN INSERTION HAS NOTHING TO FIND IN THE *BEFORE* TEXT (Roman 2026-10-16) ───────────
      // This looked up `e.anchor` for a non-replace edit, but spliceAuthorized never sets that
      // field — so `b.indexOf(undefined)` searched for the literal string "undefined", came back
      // -1, and every insert_after edit failed the byte check and was discarded as a structural
      // failure. Caught by the production editor's integration suite, where insert_after is one
      // of the two operations the editor may choose. An insertion adds text and replaces none,
      // so the only invariant that applies to it is the residue comparison below.
      if (e.op !== 'replace') return;
      if (b.indexOf(e.replaced) === -1) { okAll = false; }
    });
    // Simple invariant: removing each replaced span and each inserted span yields
    // the same residue.
    var bRes = b, aRes = a;
    ordered.forEach(function (e) {
      if (e.op === 'replace') { bRes = bRes.replace(e.replaced, '\u0000'); aRes = aRes.replace(e.inserted, '\u0000'); }
      else { aRes = aRes.replace(e.inserted, ''); }
    });
    return { ok: okAll && normaliseNulls(bRes) === normaliseNulls(aRes), residueBefore: bRes.length, residueAfter: aRes.length };
  }
  function normaliseNulls(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  // ── BRANCH CONSISTENCY ─────────────────────────────────────────────────────
  // The stored optional branches continue from the scene's end. If an edit replaced
  // text that a branch leans on, the branch may no longer follow. Deterministic and
  // conservative: it flags a shared span for review, it does not rewrite a branch.
  function branchConsistency(draft, applied) {
    var br = branchesOf(draft);
    if (!br || !applied || !applied.length) return { checked: !!br, flags: [] };
    var flags = [];
    applied.filter(function (e) { return e.op === 'replace' && e.replaced; }).forEach(function (e) {
      ['direct', 'subtle'].forEach(function (k) {
        var hit = instructionEcho(br[k], e.replaced, 6);
        if (hit) flags.push({ branch: k, tag: e.tag, sharedSpan: hit.span, words: hit.words,
          note: 'this branch leans on text the edit replaced — review that it still follows' });
      });
    });
    return { checked: true, flags: flags };
  }
  // A regression is a beat that was FULFILLED before and is no longer fulfilled.
  function regressions(beforeEv, afterEv) {
    if (!beforeEv || !afterEv) return [];
    return beforeEv.findings.filter(function (f) {
      if (f.status !== STATUS.FULFILLED) return false;
      var a = afterEv.byId[f.id];
      return !!a && a.status !== STATUS.FULFILLED;
    }).map(function (f) { return f.id; });
  }

  // ── ONE CORRECTION, ONE RECHECK, THEN REPORT ───────────────────────────────
  // Async throughout: reviseFn and recheckFn may return Promises, and both are
  // awaited. A missing, malformed or failed recheck leaves the result UNVERIFIED —
  // never successful by default.
  //
  // PARTIAL PRESERVATION: a revision that fixes some material failures and leaves
  // others is KEPT, provided it is structurally safe and regresses nothing. The
  // remaining issues are reported unresolved. Only malformed or regressive
  // revisions are reverted. There is no second repair.
  async function applyOnce(opts) {
    opts = opts || {};
    var ev = opts.evaluation, state = opts.state || {}, key = opts.sceneKey || 'scene';
    var out = { published: true, draftUsed: 'original', text: ev ? ev.reader : (opts.draft || null),
      brief: null, correction: null, recheck: null, recheckStatus: 'not_run',
      fixed: [], unresolved: [], reverted: null, allowance: allowanceFor(state, key) };
    if (!ev) {
      out.unresolved.push({ id: '*', reason: 'no evaluation available — check unavailable', status: 'unverified' });
      return out;
    }
    ev.unverified.forEach(function (f) {
      out.unresolved.push({ id: f.id, reason: f.reasons[0] || 'unverified', status: 'unverified' });
    });
    if (!ev.material.length) return out;

    out.brief = buildBrief(ev, opts.ctx);
    var claim = claimCorrection(state, key, 'edit', opts.budgetClaim);
    if (!claim.granted) {
      ev.material.forEach(function (f) { out.unresolved.push({ id: f.id, reason: claim.reason, status: f.status }); });
      return out;
    }

    // THE APPLICATION AUTHORIZES THE REGIONS. The repair is handed backend-issued
    // paragraph refs for the failed requirements and returns text for those refs only.
    var fullDraft = String(opts.fullDraft != null ? opts.fullDraft : ev.reader);
    var paras = paragraphsOf(fullDraft);
    var auth = authorizeRepairRegions(ev, (opts.ctx || {}).beatsById, paras);
    out.authorized = auth.slots;
    out.regionsRefused = auth.refused;
    if (!auth.slots.length) {
      state._essentialFixAllowance.outcome = 'repair_failed';
      ev.material.forEach(function (f) { out.unresolved.push({ id: f.id, status: f.status,
        reason: 'no repair region could be authorized for this requirement — original retained' }); });
      return out;
    }
    // Claim the authorized regions so the optional perception-lens polish does not
    // also rewrite them. Scarcity keeps governing lenses; it never reaches this check.
    cpClaimRefs(state, key, auth.slots.map(function (s) { return s.ref; }));
    var byRef = {}; paras.forEach(function (p) { byRef[p.ref] = p; });
    out.brief.regions = auth.slots.map(function (s) {
      return { ref: s.ref, op: s.op, beatId: s.beatId,
        // Every obligation this one region owes. A shared paragraph is rewritten ONCE and must
        // deliver all of them, so the editor is told which, rather than seeing only the first.
        beatIds: (s.beatIds || [s.beatId]).slice(),
        characters: (s.characters || []).slice(),
        shared: s.shared === true || undefined,
        why: s.why,
        // Told to the editor as well as enforced, so a rejection is avoidable rather than a trap.
        protectedPassages: s.protectedPassages || undefined,
        protectedFor: s.protectedFor || undefined,
        protectedNote: s.protectedNote || undefined,
        currentText: s.op === 'replace' ? byRef[s.ref].text : null,
        precedingText: s.op === 'insert_after' ? byRef[s.ref].text : null };
    });
    // The captured owner travels ON the brief, so the editor adapter never has to read current
    // state to find out which scene it is editing.
    out.brief.owner = opts.owner || null;
    out.brief.replyContract = 'Return ONLY {"paragraphs":[{"ref":"<one of the refs above>","op":"<its op>",'
      + '"text":"<prose>"}]}. You may return text for these refs and no others; you may not name a '
      + 'location in your own words. Every other paragraph is preserved unchanged.';

    var reply = null;
    try { reply = await opts.reviseFn(out.brief, ev.reader, fullDraft); } catch (e) {
      reply = null; out.repairError = String((e && e.message) || e);
    }
    var v = validateRepairReply(reply, auth.slots, paras);
    out.editsRejected = v.rejected;
    if (!v.ok) {
      state._essentialFixAllowance.outcome = 'repair_failed';
      ev.material.forEach(function (f) {
        var r = v.rejected.find(function (x) { return (auth.slots.find(function (s) { return s.beatId === f.id; }) || {}).ref === String(x.tag).split(':')[0]; });
        out.unresolved.push({ id: f.id, status: f.status,
          reason: 'no edit applied — ' + ((r && r.reason) || v.code || 'repair returned nothing usable') + ' — original retained' });
      });
      return out;
    }
    var spliced = spliceAuthorized(fullDraft, paras, v.items);
    var revisedFull = spliced.text;
    var revised = readerFacing(revisedFull);
    out.preservation = unaffectedBytesPreserved(fullDraft, revisedFull, spliced.applied);
    out.branches = branchConsistency(revisedFull, spliced.applied);
    out.correction = { mode: 'anchored_edit', revisionId: revisionId(revised),
      applied: spliced.applied.length, rejected: (v.rejected || []).length,
      authorizedRefs: auth.slots.map(function (s) { return s.ref + ':' + s.op; }) };
    // A region the reply failed to fill leaves its beat unresolved, even if other
    // authorized regions in the same response landed.
    var filled = {};
    v.items.forEach(function (it) {
      (it.beatIds || [it.beatId]).forEach(function (id) { filled[id] = 1; });
    });
    auth.slots.forEach(function (s) {
      (s.beatIds || [s.beatId]).forEach(function (id) {
        if (!filled[id] && ev.byId[id]) {
          out.unresolved.push({ id: id, status: ev.byId[id].status,
            reason: 'authorized region ' + s.ref + ' was not filled by the repair' });
        }
      });
    });

    // ── ONE SEMANTIC RECHECK, SCOPED TO WHAT THE EDIT COULD HAVE CHANGED ──────────────────
    // (Roman 2026-10-16) The repaired obligations, plus every obligation that was FULFILLED
    // before the edit and whose paragraph the edit touched — those are the two sets that can
    // have changed. Computed here because this is where both are known: the accepted items
    // carry their beatIds, and spliced.applied carries the refs.
    var _touchedRefs = {};
    (spliced.applied || []).forEach(function (a) { if (a && a.ref) _touchedRefs[a.ref] = true; });
    var _affected = {};
    (v.items || []).forEach(function (it) {
      (it.beatIds || [it.beatId]).forEach(function (id) { if (id) _affected[id] = true; }); });
    (auth.slots || []).forEach(function (s) {
      if (_touchedRefs[s.ref]) (s.beatIds || [s.beatId]).forEach(function (id) { if (id) _affected[id] = true; }); });
    // A previously fulfilled obligation anchored in a touched paragraph is included, because a
    // regression there is exactly what the revert exists to catch.
    (ev.findings || []).forEach(function (f) {
      if (f.status !== STATUS.FULFILLED) return;
      var anchors = [f.actionPassage, f.consequencePassage].filter(Boolean);
      var hit = anchors.some(function (q) {
        return (paras || []).some(function (p) {
          return _touchedRefs[p.ref] && quotePresent(q, p.text); }); });
      if (hit) _affected[f.id] = true;
    });
    // applyOnce receives ctx.beatsById, not a beats array — so the scoped beat objects are
    // resolved from there rather than from an opts.beats that does not exist here.
    var _bbyId = (opts.ctx && opts.ctx.beatsById) || {};
    var _recheckBeats = Object.keys(_affected)
      .map(function (id) { return _bbyId[id]; }).filter(Boolean);
    out.recheckScope = { beatIds: Object.keys(_affected), touchedRefs: Object.keys(_touchedRefs),
      note: 'the repaired obligations plus previously fulfilled obligations anchored in a touched paragraph' };

    var re = null;
    try { re = typeof opts.recheckFn === 'function' ? await opts.recheckFn(revised, _recheckBeats) : null; }
    catch (e) { re = null; out.recheckError = String((e && e.message) || e); }
    var wellFormed = !!(re && Array.isArray(re.findings) && re.byId);
    out.recheck = re || null;
    out.recheckStatus = wellFormed ? 'complete' : (re ? 'malformed' : 'unavailable');

    if (!wellFormed) {
      // Cannot confirm the edit, and cannot confirm a regression either. The edit is
      // kept only because it passed the deterministic safety checks; every material
      // issue stays UNVERIFIED rather than becoming a silent success.
      state._essentialFixAllowance.outcome = 'applied_unverified';
      out.draftUsed = 'revised'; out.text = revisedFull;
      ev.material.forEach(function (f) {
        out.unresolved.push({ id: f.id, status: 'unverified',
          reason: 'edit applied but the recheck was ' + out.recheckStatus + ' — completion not verified' });
      });
      return out;
    }

    var regressed = regressions(ev, re);
    if (regressed.length) {
      state._essentialFixAllowance.outcome = 'reverted_regression';
      out.reverted = 'regressed previously fulfilled beats: ' + regressed.join(', ');
      out.draftUsed = 'original'; out.text = fullDraft;
      ev.material.forEach(function (f) { out.unresolved.push({ id: f.id, reason: 'revision reverted — ' + out.reverted, status: f.status }); });
      return out;
    }

    // Keep the edit. Report what it fixed and what it did not.
    var stillMaterial = re.material || [];
    var stillIds = stillMaterial.reduce(function (m, f) { m[f.id] = f; return m; }, {});
    // ── AN OBLIGATION OUTSIDE THE RECHECK SCOPE IS NOT "FIXED" ────────────────────────────
    // (Roman 2026-10-16) With the recheck narrowed, `ev.material` contains obligations the
    // recheck never looked at. The old `else out.fixed.push(f.id)` would have credited every one
    // of them as fixed purely because the recheck did not mention them — awarding exactly the
    // invented credit this feature exists to prevent. Absence from a scoped recheck is silence,
    // not success.
    var _recheckedIds = {};
    (_recheckBeats || []).forEach(function (b) { if (b && b.id) _recheckedIds[b.id] = 1; });
    ev.material.forEach(function (f) {
      if (!_recheckedIds[f.id]) {
        out.unresolved.push({ id: f.id, status: f.status,
          reason: 'not rechecked — outside the edit\'s scope, so its earlier failure stands and '
            + 'no repair was attempted for it' });
        return;
      }
      if (stillIds[f.id]) out.unresolved.push({ id: f.id, status: stillIds[f.id].status,
        reason: 'still failing after one correction — edit kept, issue unresolved, no further repair' });
      else out.fixed.push(f.id);
    });
    (re.unverified || []).forEach(function (f) {
      if (!stillIds[f.id]) out.unresolved.push({ id: f.id, status: 'unverified', reason: f.reasons[0] || 'unverified after revision' });
    });
    state._essentialFixAllowance.outcome = out.unresolved.length ? 'partially_repaired' : 'repaired';
    out.draftUsed = 'revised'; out.text = revisedFull;
    return out;
  }

  // ── PRODUCTION ENTRY POINT ─────────────────────────────────────────────────
  // Called (awaited) from app.js's callChat finalization, AFTER the appendix strip
  // so it judges the reader-facing draft. Self-gating: returns the draft untouched
  // unless a judge is wired and the scene actually carries essential beats. It never
  // throws into the caller and never blocks publication.
  async function runOnFinalizedDraft(opts) {
    opts = opts || {};
    var draft = String(opts.draft == null ? '' : opts.draft);
    var judge = opts.judgeFn || api._judgeFn;
    var beats = opts.beats || [];
    if (!draft.trim() || typeof judge !== 'function' || !beats.length) {
      return { ran: false, text: draft, reason: !draft.trim() ? 'empty draft'
        : (typeof judge !== 'function' ? 'no judge wired' : 'no essential beats for this scene') };
    }
    var state = opts.state || {};
    var key = String(opts.sceneKey || ((state.storyId || '') + ':' + (state.turnCount || 0)));
    var beatsById = beats.reduce(function (m, b) { m[b.id] = b; return m; }, {});
    var reader = readerFacing(draft);

    // THE OWNER IS CARRIED, NOT RE-READ. Everything downstream — judge, editor, recheck — gets
    // the same captured owner, so a pass that completes after the turn moved on cannot be
    // attributed to whatever scene happens to be current.
    var owner = opts.owner || null;
    var verdicts = null;
    try { verdicts = await judge({ reader: reader, revisionId: revisionId(reader), beats: beats,
      contract: judgeContract(beats), owner: owner, op: 'assess' }); }
    catch (e) { verdicts = null; }

    // ── DISABLED IS NOT A FAILED ASSESSMENT (Roman 2026-10-16) ─────────────────────────────
    // With activation off the adapter returned null, this read it as "ran and could not verify",
    // and the host then recorded an assessment ATTEMPT for every obligation — imposing cooldown
    // and altering future Character+ scheduling although nothing ever ran. A local pre-dispatch
    // refusal (guard, ownership change) is the same category and must not masquerade either.
    //
    // So a judge may say so explicitly: any non-array carrying `notDispatched` ends the pass with
    // `ran: false`. No findings, no unresolved list, no attempt, no cooldown, no allowance claim —
    // the draft is returned exactly as it arrived.
    if (verdicts && !Array.isArray(verdicts) && verdicts.notDispatched === true) {
      return { ran: false, dispatched: false, text: draft,
        reason: String(verdicts.reason || 'not dispatched'),
        scheduling: 'untouched — no assessment ran, so nothing is recorded and no retry is paced' };
    }
    // STALE: the work happened but belongs to a scene or story that is no longer current. Its
    // accounting is already settled against its own reservation. Nothing may reach story state —
    // no prose, no attempt, no credit, no scene report — and no repair or recheck follows.
    if (verdicts && !Array.isArray(verdicts) && verdicts.stale === true) {
      return { ran: false, dispatched: true, stale: true, text: draft,
        reason: String(verdicts.reason || 'stale result'),
        scheduling: 'untouched — this result belongs to a scene or story that is no longer current' };
    }
    if (!Array.isArray(verdicts)) {
      // No usable judgment. Nothing is material, nothing is repaired, and every
      // essential beat is reported unverified. The draft is returned untouched.
      // No findingsById here on purpose: with no usable judgment there is no validated evidence,
      // so an attempt recorded from this path evidences no appearance either.
      return { ran: true, text: draft, judgeUsable: false, findingsById: null,
        revisionId: revisionId(reader),
        unresolved: beats.map(function (b) { return { id: b.id, status: 'unverified', reason: 'judge returned no usable verdicts' }; }) };
    }

    var ev = evaluate({ draft: reader, alreadyExtracted: true, beats: beats, verdicts: verdicts,
      roster: opts.roster || [] });
    var result = await applyOnce({ evaluation: ev, state: state, sceneKey: key,
      fullDraft: draft,
      ctx: { beatsById: beatsById, advisory: opts.advisory || null },
      owner: owner,
      budgetClaim: opts.budgetClaim,
      reviseFn: opts.reviseFn || function () { return null; },
      // ONE semantic recheck, over the scope applyOnce computed. `scoped` is the repaired
      // obligations plus previously fulfilled ones in a touched paragraph; an empty scope means
      // the edit could not have changed any obligation, so no call is made at all.
      recheckFn: opts.recheckFn || (typeof judge === 'function' ? async function (revisedText, scoped) {
        var use = (Array.isArray(scoped) && scoped.length) ? scoped : null;
        if (!use) return null;
        var rv = null;
        try { rv = await judge({ reader: revisedText, revisionId: revisionId(revisedText), beats: use,
            contract: judgeContract(use), op: 'recheck', owner: owner }); }
        catch (e) { return null; }
        if (!Array.isArray(rv)) return null;
        return evaluate({ draft: revisedText, alreadyExtracted: true, beats: use, verdicts: rv,
          roster: opts.roster || [] });
      } : null) });

    // No re-assembly. applyOnce spliced the FULL draft, so metadata, widget markers
    // and the branch appendix are already in place, byte-for-byte, wherever no edit
    // touched them. Re-attaching anything here would be the rebuild this design
    // exists to avoid.
    var outText = (result.draftUsed === 'revised' && typeof result.text === 'string' && result.text.trim())
      ? result.text : draft;
    // WHAT WAS DELIVERED, NOT ONLY WHAT WAS REPAIRED. A beat the author landed on the first pass
    // is delivered just as much as one a repair restored, and credit must not be reachable only
    // through the repair path. The recheck's view wins where it ran, because it describes the text
    // that actually shipped.
    // ── EVIDENCE DESCRIBES THE TEXT THAT ACTUALLY SHIPS (Roman 2026-10-16) ─────────────────
    // The old line took the scoped recheck WHOLESALE whenever it completed, which was wrong in
    // three ways at once: it dropped every valid fulfilled finding outside the recheck's scope;
    // it could credit repaired text after a REVERT, because recheckStatus said 'complete' while
    // the original draft shipped; and when the recheck was unavailable it fell back to the
    // ORIGINAL findings for passages the edit had changed — evidence about text nobody reads.
    //
    // The merge now follows the shipped text:
    //   original text kept  → the original findings, entirely.
    //   revision retained   → original findings for UNAFFECTED obligations, recheck findings for
    //                         AFFECTED ones, and UNVERIFIED for an affected obligation the
    //                         recheck could not establish.
    var _shippedRevision = revisionId(readerFacing(outText));
    var _keptRevision = result.draftUsed === 'revised';
    var _scopeIds = (result.recheckScope && result.recheckScope.beatIds) || [];
    var _affectedSet = _scopeIds.reduce(function (m, id) { m[id] = 1; return m; }, {});
    var _reById = (result.recheck && result.recheck.byId) || null;
    var _mergedById = {};
    (ev.findings || []).forEach(function (f) {
      if (!_keptRevision || !_affectedSet[f.id]) { _mergedById[f.id] = f; return; }
      var r = _reById ? _reById[f.id] : null;
      if (r) { _mergedById[f.id] = r; return; }
      // Affected and unverifiable. NOT the original finding, which describes replaced prose.
      _mergedById[f.id] = { id: f.id, kind: f.kind, evidenceKind: f.evidenceKind,
        status: STATUS.UNVERIFIED, verified: false, material: false, reasons: [
          'the edit changed this passage and the recheck did not establish its state — unverified, '
          + 'not fulfilled and not a finding of absence'],
        actionPassage: null, consequencePassage: null, produces: f.produces, dependsOn: f.dependsOn };
    });
    var _finalEv = { revisionId: _shippedRevision,
      findings: Object.keys(_mergedById).map(function (k) { return _mergedById[k]; }),
      byId: _mergedById };
    _finalEv.material = _finalEv.findings.filter(function (f) { return f.material; });
    _finalEv.unverified = _finalEv.findings.filter(function (f) { return f.status === STATUS.UNVERIFIED; });
    // FULFILLED MEANS A FINDING SAYS SO. `fixed` is the repair's own bookkeeping and an id is
    // absent from re.material for many reasons, so provenance is read from it but fulfilment
    // never is.
    var _fulfilled = _finalEv.findings.filter(function (f) {
      return f.status === STATUS.FULFILLED; }).map(function (f) {
        return { id: f.id, kind: f.kind,
          provenance: (_keptRevision && _affectedSet[f.id]
            && (result.fixed || []).indexOf(f.id) !== -1) ? 'repair' : 'authored' }; });
    return { ran: true, dispatched: true, judgeUsable: true, text: outText, draftUsed: result.draftUsed,
      fulfilled: _fulfilled,
      fixed: result.fixed, unresolved: result.unresolved, reverted: result.reverted,
      recheckStatus: result.recheckStatus, recheckScope: result.recheckScope || null,
      // The MERGED findings, describing the shipped text — so an appearance quotation taken from
      // here cannot come from prose that was replaced or reverted.
      findingsById: _mergedById,
      brief: result.brief, revisionId: _shippedRevision,
      editsApplied: result.correction ? result.correction.applied : 0,
      editsRejected: result.editsRejected || [], preservation: result.preservation || null,
      branchFlags: (result.branches && result.branches.flags) || [] };
  }

  // ── CHARACTER+ ASSIGNMENTS AS ASSESSABLE BEATS ─────────────────────────────
  // The existing per-scene assignments live on state.sceneSkeleton.character_plus and
  // already carry everything the judge needs: the behaviour to stage, the protagonist's
  // governing interpretation, the lens her attention moves through, the canonical facet
  // that must stay UNSTATED, and any guardrails. This converts them into beats so
  // characterisation is assessed and repaired by the SAME path as plot beats, instead
  // of only being described in the author prompt.
  //
  // MODE IS RESPECTED. An assignment marked not_physically_present is a recalled or
  // reported introduction; it becomes internal_recognition, so the judge never demands
  // an on-stage appearance the mode forbids.
  //
  // facet_truth is passed as a DISCLOSURE LIMIT, never as required evidence: it is the
  // thing the beat reveals, and quoting it would be the failure.
  function characterPlusBeats(skeleton, opts) {
    opts = opts || {};
    var sk = skeleton || {};
    var list = Array.isArray(sk.character_plus) ? sk.character_plus : [];
    // ── THE PROTAGONIST'S OBLIGATION LIVES UNDER A DIFFERENT KEY (Roman 2026-10-15) ──────────
    // She is not exempt from Character+ — her Scene-1 beat is OWNED by pc_opening_fusion, which
    // the frozen author request states outright: "Lirael (first mention — the beat lands here) —
    // assigned BELOW as the PROTAGONIST OPENING BEAT. That single beat is her Character+; do not
    // write her a second one here." Reading only `character_plus` therefore dropped a real
    // obligation silently, and a run that evaluated three characters looked complete.
    //
    // The fusion row is translated into the same beat shape rather than given a parallel path, so
    // one evaluator covers her too. It is NOT a second assignment: if a `character_plus` row for
    // the same person already exists, the fusion is skipped, because two beats for one moment is
    // the exact competition pc_opening_fusion exists to prevent.
    var pof = sk.pc_opening_fusion;
    if (pof && pof.character) {
      var already = list.some(function (c) {
        return c && c.character && String(c.character).toLowerCase() === String(pof.character).toLowerCase(); });
      if (!already) {
        list = list.concat([{
          character: pof.character, isPC: true, first_mention: true,
          coverage: { kind: 'introduction' },
          // The fusion's own vocabulary, mapped onto the shared field names. `beat` is the
          // visible action that must occur; `reveals` is what it must expose about her.
          behavior: String(pof.beat || '').trim(),
          pc_interpretation: String(pof.reveals || pof.exposes || '').trim(),
          facet_truth: String(pof.facet_truth || '').trim(),
          guardrails: String(pof.guardrails || '').trim(),
          pc_lens_operation: String(pof.pc_lens_operation || '').trim(),
          mode: 'on_stage',
          _fromFusion: true, _fusionThrough: String(pof.through || pof.environment_target || '').trim()
        }]);
      }
    }
    return list.filter(function (c) { return c && c.character; }).map(function (c) {
      var who = String(c.character).trim();
      var recalled = c.not_physically_present === true
        || /recall|report|offstage|off-stage/i.test(String(c.mode || ''));
      // The LI's FIRST depiction takes the social-proof rule. Driven by the coverage obligation,
      // so it is the standing cadence rule deciding, not a name.
      // The flag where the assignment carries one; otherwise the story's LI name, passed in by the
      // caller. A Scene-1 row comes from the opening planner and has no isLI field.
      var _liName = String(opts.liName || '').trim();
      var isLI = c.isLI === true || c.is_love_interest === true
        || (!!_liName && (who.toLowerCase() === _liName.toLowerCase()
            || who.toLowerCase() === _liName.split(/\s+/)[0].toLowerCase()));
      var firstDepiction = (c.coverage && c.coverage.kind === 'introduction')
        || c.first_mention === true;
      var liSocialProof = isLI && firstDepiction && !recalled;
      // ── SEALING IS DECIDED ONCE, BEFORE ANY DELIVERABLE IS DERIVED FROM A TRUTH ────────────
      // This predicate used to live inside the `disclosure` block, which is built AFTER
      // `assignedFacet`. So assignedFacet could not consult it, and fell through to facet_truth —
      // the sealed secret itself — producing a requirement that demanded and forbade the same
      // sentence. One definition now, computed first, used by both.
      var _guard = String(c.guardrails || '').trim() || null;
      var _sealed = c.sealed === true || c.disclosure === 'sealed'
        || c.facet_sealed === true
        || (c.disclosure && typeof c.disclosure === 'object'
            && (c.disclosure.sealed === true || c.disclosure.forbidUntilScene != null))
        || /\bsealed\b|do not reveal|must not be revealed|forbidden until|not yet known/i.test(_guard || '');
      var want = [String(c.behavior || c.angle || '').trim(),
        String(c.character_revelation || '').trim()].filter(Boolean).join(' — ');
      return {
        id: 'cplus:' + who.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        kind: 'character_plus', essential: true,
        character: who,
        evidenceKind: liSocialProof ? 'social_proof_with_pc_interpretation'
          : (recalled ? 'internal_recognition' : 'on_page_action'),
        isLI: isLI || undefined,
        requiresSocialProof: liSocialProof || undefined,
        socialProof: liSocialProof ? {
          // ══ RECONCILED, NOT APPENDED (2026-10-20) ═══════════════════════════════
          // This said "One person is enough; no crowd is required" AND, after I appended the
          // sufficiency standard, that an ordinary individual's response is insufficient. Both
          // reached the model in one requirement, and the reply's stated reason — "a single
          // staged response by another trained figure satisfies the social-proof contract" —
          // tracks the older permission. That makes the run an input confound, so the two are
          // now ONE statement instead of two that disagree.
          //
          // THE TRUE PART OF THE OLD PERMISSION IS KEPT: no crowd is required, because an
          // established authority deferring is one person and is enough. What is withdrawn is
          // the blanket reading that ANY one person suffices.
          needs: 'A STAGED RESPONSE BY ANOTHER PERSON to ' + who + ' — awe, deference, desire, fear, curiosity, or a character-appropriate combination. It must be specific behaviour, not narration asserting that people admire him. NO CROWD IS REQUIRED, AND WHO RESPONDS DECIDES HOW MANY: one person is enough when that person is the one the room would normally look to, because their deference or orientation toward ' + who + ' is itself the evidence. An ORDINARY individual’s response is not enough on its own — it shows attention and leaves the relationship illegible — so where the respondent carries no recognised standing, the weight has to come from several people independently adjusting around him, or from a credible reputational or institutional trace. Her reading of the response is welcome and may carry it: an inference of hers is permitted evidence, and the shortfall to avoid is insufficient social weight, never the presence of interpretation.',
          // THE RESPONSE AND HER READING MAY BE ONE SENTENCE (Roman 2026-10-15). "Then" is an
          // order of evidence, not an instruction to write two separate beats — and writing them
          // as two invites exactly the explanatory aftermath that weakens the first.
          thenPCInterprets: 'The protagonist reads that response through her own worldview, mask, '
            + 'history or bias — what she notices, resents, distrusts, envies, dismisses or '
            + 'misunderstands about it. The response is the evidence; her reading is the '
            + 'Character+. THE TWO MAY OCCUPY THE SAME SENTENCE, and usually should: her reading '
            + 'can be carried by what she selects, what she compares it to, or the words she '
            + 'chooses, rather than by a separate statement of what she felt.',
          style: CP_STYLE.compression + ' ' + CP_STYLE.breadth,
          viewpointMayBeImplicit: CP_STYLE.implicitViewpoint,
          castLimit: CP_STYLE.noNewCast,
          doesNotRequire: ['prior intimacy or acquaintance', 'knowledge of his private motives',
            'universal admiration, fame, wealth or rank', 'a crowd'],
          cannotBeSatisfiedBy: ['appearance', 'an involuntary tell', 'the protagonist finding him '
            + 'attractive', 'narration declaring that others respect him'],
          opportunities: Array.isArray(c.social_proof_opportunities) ? c.social_proof_opportunities.slice() : []
        } : undefined,
        mode: recalled ? 'recalled_or_reported' : 'on_stage',
        region: null,
        // The trailing period is stripped from the authored fragment, which otherwise produced
        // "…reads that response.. A revealing perception…" in the dispatched requirement.
        description: 'Character+ for ' + who + (want ? ': ' + want.replace(/\s*\.\s*$/, '') : '')
          + '. A revealing perception of THIS person through the protagonist\'s own worldview, '
          + 'history, mask or bias — not appearance, not an involuntary tell, not a label.',
        pcInterpretation: String(c.pc_interpretation || c.psychological_read || '').trim() || null,
        // ── THE SPECIFIC TRUTH THIS BEAT OWES (Roman 2026-10-15, corrected) ─────────────
        // THREE THINGS, KEPT APART:
        //   PRIVATE CAUSAL TRUTH      — facet_truth / psychological_read. Source material. When
        //                               the facet is sealed, this IS the secret.
        //   PERMITTED DEPICTION       — pc_interpretation. Authored as on-page material: the
        //                               reading that must govern the narration.
        //   DISCLOSURE RESTRICTION    — the sealed flag and its scene bound.
        //
        // The old fallback chain collapsed the first two: with no pc_interpretation it reached
        // through psychological_read to facet_truth and made the SOURCE TRUTH a deliverable. On a
        // sealed facet that is a requirement to put the secret on the page, sent in the same
        // request as the prohibition against doing so. A live judge received exactly that —
        // "THE ASSIGNED TRUTH THIS BEAT OWES: his concealed wish at the rite" beside "SEALED —
        // must NOT be revealed or hinted: his concealed wish at the rite" — and downgraded the
        // beat for not delivering what it was forbidden to deliver. Correctly, given the input.
        //
        // So: a sealed facet contributes NO delivery requirement unless a permitted depiction was
        // separately authored. ABSENT beats invented: there is nothing to check, and the general
        // Character+ requirement plus the social-proof contract still apply. Unsealed facets keep
        // the ordinary fallback unchanged.
        assignedFacet: (function () {
          var permitted = String(c.pc_interpretation || '').trim();
          if (permitted) return permitted;
          if (_sealed) return null;   // never derive a deliverable from a sealed truth
          return String(c.psychological_read || c.facet_truth || '').trim() || null;
        })(),
        // Why no assigned facet exists, so a consumer can tell "sealed, so none" from "none
        // authored" and neither is mistaken for an oversight.
        assignedFacetAbsentBecause: (function () {
          if (String(c.pc_interpretation || '').trim()) return undefined;
          if (_sealed) return 'the facet is SEALED and no permitted on-page depiction was authored '
            + '— its private truth may not become a delivery requirement. The general Character+ '
            + 'requirement and any social-proof contract still apply.';
          if (!String(c.psychological_read || c.facet_truth || '').trim()) return 'no facet material was supplied';
          return undefined;
        })(),
        viewpoint: { lensOperation: String(c.pc_lens_operation || '').trim() || null,
          lensGloss: String(c.pc_lens_gloss || '').trim() || null,
          pcEffect: String(c.pc_effect || '').trim() || null,
          // GROUNDED CONTEXT, NOT A CONCLUSION (Roman 2026-10-15). Where an assignment supplies
          // her situation and lens instead of a prescribed feeling, that context is carried and
          // the reading is left to the writer. A supplied conclusion comes back as the prose.
          context: Array.isArray(c.pc_viewpoint_context) ? c.pc_viewpoint_context.slice() : null,
          contextNote: String(c.pc_interpretation_note || '').trim() || null,
          bounded: 'Only what the protagonist can perceive or infer. Her reading may be biased or '
            + 'mistaken; the narration must not convert her inference into omniscient fact.' },
        // ── DISCLOSURE IS NOT STYLE (Roman 2026-10-15) ──────────────────────────────────
        // The earlier version marked every canonical facet "never state, paraphrase or voice",
        // which forbade exactly the revealing admission or another character's observation that
        // first-person characterisation depends on. Avoiding a pasted dossier is a STYLE rule;
        // keeping a sealed truth off the page is a DISCLOSURE rule. They are now separate, and
        // only a genuinely sealed facet is protected as a secret.
        disclosure: (function () {
          var truth = String(c.facet_truth || '').trim() || null;
          var guard = _guard;        // one definition, hoisted above
          var sealed = _sealed;      // ditto — this block no longer re-derives it
          if (sealed) {
            return { sealed: true, sealedTruth: truth, guardrails: guard,
              forbidUntilScene: (c.disclosure && c.disclosure.forbidUntilScene) || null,
              note: 'SEALED: this truth may not reach the page in any form yet — not stated, not '
                + 'implied, not spoken by a character. Show behaviour only.',
              // ── A SEAL DOES NOT FORBID RELATIONAL CHARGE — BUT THIS IS NOT A LICENCE ────
              // (Roman 2026-10-15, corrected) The first version told every sealed character that
              // a break in composure toward the protagonist "IS permitted and is good material".
              // That generalised one character's specific opportunity into a standing invitation,
              // and the predictable result is every mysterious figure flickering whenever the
              // protagonist looks at them — a tic, not characterisation.
              //
              // So this is stated as a NARROW AVAILABILITY with its own conditions. Two of them
              // matter most. First, it has to be consistent with who this person is, what the
              // scene is actually doing, and the specific restriction on THIS facet — a seal that
              // forbids any sign of recognition forbids this too. Second, being unexplained does
              // NOT make a gesture safe: a flicker at the exact moment a secret is nearly touched
              // tells the reader what it is about without ever naming it. Timing and context
              // disclose. The test is whether the moment could belong to several explanations,
              // not whether the prose withholds the word.
              relationalReactionAvailability: 'CONDITIONAL, NOT RECOMMENDED. A break in composure '
                + 'directed at the protagonist — a look held, a hesitation when their eyes meet — '
                + 'is one thing a sealed character MAY do, and only when all of these hold: it fits '
                + 'who this person is and how they behave under observation; the scene genuinely '
                + 'affords the moment; and this facet\'s own restriction does not forbid signs of '
                + 'recognition. It is not an expected feature of a sealed character, and a '
                + 'mysterious person who shows nothing is often the better choice. Do not reach for '
                + 'it to satisfy a requirement.\n'
                + 'IF USED, IT MUST BE RELATIONALLY AMBIGUOUS. She may notice it and may be '
                + 'curious, stung or unsettled; neither she nor the narration may identify its '
                + 'cause; nothing may frame it as evidence of the sealed truth; and any reading she '
                + 'forms must be one she could be wrong about. BEING UNEXPLAINED IS NOT ENOUGH: '
                + 'placing the reaction where the secret is nearly touched discloses it by timing, '
                + 'even with the word withheld. It has to be able to mean several things. Do not '
                + 'supply the explanation later in the same scene.' };
          }
          return { sealed: false, canonicalTruth: truth, guardrails: guard,
            styleConstraint: 'Do not paste this as narration or hand the reader a diagnosis of the '
              + 'character. It is the insight a depiction EARNS.',
            permitted: 'Because this truth is not sealed, it MAY be expressed when the scene earns '
              + 'it: a grounded self-admission, or a specific observation by someone who could '
              + 'plausibly know it, followed by a revealing response. What is forbidden is the '
              + 'dossier, not the insight.',
            note: 'Not a secret — a style constraint. Do not confuse the two.' };
        })(),
        produces: [], dependsOn: [],
        // The coverage obligation the planner attached, so a REPAIR knows whether it is restoring
        // an introduction or a recurring depiction, and which of the two modes it owes.
        coverage: c.coverage || null,
        isPC: c.isPC === true || undefined,
        firstMention: c.first_mention === true || c.first_mention === 1 || undefined,
        // Carried so a repair brief knows this beat is the fusion and must stay ONE beat, and
        // that the environment axis has to remain materially legible in it.
        fromFusion: c._fromFusion === true || undefined,
        fusionThrough: c._fusionThrough || undefined
      };
    }).filter(function (b) { return !opts.only || opts.only[b.character]; });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHARACTER+ COVERAGE — DELIVERED, NOT ASSIGNED  (Roman 2026-10-15)
  // ══════════════════════════════════════════════════════════════════════════
  // Reads and writes the SHAPE the existing ledger already uses
  // (app.js:141655 _cpRecordManifestation → continuity.manifestations, with
  // verification 'directed' vs 'verified' and relation reinforced/complicated/
  // evolved/excepted). Nothing here is a second character-truth store: it is a
  // coverage calculator over that ledger plus a dedupe rule it lacks.
  //
  // CREDIT IS FOR WHAT REACHED THE READER. A 'directed' record means we asked; only
  // 'verified' counts toward coverage. That distinction already exists in the ledger
  // and is honoured rather than re-invented.
  var CP_MODE = { ECHO: 'echo_reinterpret', BROADEN: 'broaden' };
  // ── ONE INTERVENING SCENE, WHICH IS NOT THE SAME AS GAP 1 (Roman 2026-10-16, corrected) ────
  // This was 1, and the comment claimed it meant "not twice running". It did not: an attempt in
  // scene 3 gave `sinceLast = 1` in scene 4, which satisfied `>= 1` and reassigned immediately.
  // Gap 1 is SAME-SCENE DEDUPLICATION, not a cooldown — the obligation would have been retried in
  // every single scene.
  //
  // 2 is one genuinely intervening scene: attempt in 3 → deferred in 4 → eligible in 5. It paces
  // retries only; the obligation is never dropped, and a genuinely new character is never paced
  // at all (`firstEverAttempt`).
  var CP_INTRO_RETRY_GAP = 2;
  // Spacing between successive DELIVERED depictions of the same character inside one issue.
  // Declared here because cpCoveragePlan (above cpEditorDue) now needs it to decide eligibility.
  var CP_COVERAGE_RECUR_GAP = CP_INTRO_RETRY_GAP;

  // ── RECEIPT FIELDS ARE VALIDATED, NEVER COERCED (Roman 2026-10-16) ─────────────────────────
  // `Number(p.usage && p.usage.input_tokens)` turns a NULL usage object into 0, and 0 is finite —
  // so a reply carrying no usage at all settled as a completed call costing nothing. Absence and
  // a genuine reported zero are different facts and must stay distinguishable: `present` says
  // whether the fields were there, so a real 0/0 reply settles at $0 while a missing one is
  // unresolved with its reservation retained.
  function ebValidateUsage(usage) {
    if (!usage || typeof usage !== 'object') {
      return { ok: false, present: false, why: 'no usage object on the reply' };
    }
    var i = usage.input_tokens, o = usage.output_tokens;
    var have = Object.prototype.hasOwnProperty.call(usage, 'input_tokens')
            && Object.prototype.hasOwnProperty.call(usage, 'output_tokens');
    if (!have) return { ok: false, present: false, why: 'usage is missing input_tokens or output_tokens' };
    if (typeof i !== 'number' || typeof o !== 'number') {
      return { ok: false, present: true, why: 'usage token counts are not numbers' };
    }
    if (!isFinite(i) || !isFinite(o)) {
      return { ok: false, present: true, why: 'usage token counts are not finite' };
    }
    if (i < 0 || o < 0) {
      return { ok: false, present: true, why: 'usage token counts are negative' };
    }
    return { ok: true, present: true, inTok: i, outTok: o,
      genuineZero: i === 0 && o === 0 };
  }
  // ── USAGE COMES IN TWO SHAPES, AND REASONING TOKENS ARE BILLED OUTPUT ──────────────────────
  // (Roman 2026-10-16) The Anthropic route returns {input_tokens, output_tokens}; /api/proxy
  // returns the OpenAI shape {prompt_tokens, completion_tokens}. ebValidateUsage only understood
  // the first, so every Grok call in the editor comparison was recorded as unusable and retained
  // its full reservation instead of settling — which is what exhausted the ceiling and refused
  // the echo and broadening cases.
  //
  // REASONING TOKENS ARE BILLED AS OUTPUT and are NOT inside completion_tokens: case 1 billed
  // 165 completion + 524 reasoning, and total_tokens - prompt_tokens = 689 exactly. Pricing on
  // completion_tokens alone would have under-counted output by 4x. So billed output is taken as
  // total - prompt where a total is given, and completion + reasoning otherwise.
  //
  // CACHED INPUT is reported (cached_tokens) and is NOT discounted here: this repo has no
  // verified cached rate, so cached input is priced at the full input rate. That errs high, which
  // is the only safe direction, and the amount is tiny — 128 cached tokens a call.
  function ebNormalizeUsage(usage) {
    if (!usage || typeof usage !== 'object') {
      return { ok: false, present: false, why: 'no usage object on the reply' };
    }
    var isAnthropic = typeof usage.input_tokens === 'number'
      || Object.prototype.hasOwnProperty.call(usage, 'input_tokens');
    if (isAnthropic) {
      var v = ebValidateUsage(usage);
      if (!v.ok) return v;
      return { ok: true, present: true, shape: 'anthropic', inTok: v.inTok, outTok: v.outTok,
        reasoningTok: 0, cachedInTok: 0, genuineZero: v.genuineZero };
    }
    var pt = usage.prompt_tokens, ct = usage.completion_tokens;
    if (typeof pt !== 'number' || typeof ct !== 'number') {
      return { ok: false, present: false, why: 'usage has neither input_tokens nor prompt_tokens' };
    }
    if (!isFinite(pt) || !isFinite(ct) || pt < 0 || ct < 0) {
      return { ok: false, present: true, why: 'openai-shape token counts are not finite and non-negative' };
    }
    // ── REASONING NORMALIZATION IS TIED TO THE VERIFIED SHAPE, NOT TO FIELD NAMES ────────
    // (Roman 2026-10-16) "OpenAI-shaped" is not one billing model. The total-minus-prompt rule
    // was VERIFIED against this provider's actual replies — completion_tokens_details.
    // reasoning_tokens present, and total_tokens - prompt_tokens == completion + reasoning in
    // all four — so it is applied only where that shape is actually observed. A generic
    // OpenAI-shaped reply without those markers is priced on prompt + completion and SAYS SO,
    // rather than silently inheriting a rule that was never checked for it.
    var rd = usage.completion_tokens_details;
    var hasReasoningField = !!rd && typeof rd.reasoning_tokens === 'number';
    var reasoning = hasReasoningField ? rd.reasoning_tokens : 0;
    var totalGiven = typeof usage.total_tokens === 'number' && usage.total_tokens >= pt;
    var verifiedReasoningShape = hasReasoningField && totalGiven
      && (usage.total_tokens - pt) === (ct + reasoning);
    var billedOut, basis;
    if (verifiedReasoningShape) { billedOut = usage.total_tokens - pt; basis = 'verified_reasoning_shape'; }
    else if (hasReasoningField) { billedOut = ct + reasoning; basis = 'reasoning_field_without_matching_total'; }
    else { billedOut = ct; basis = 'completion_only_reasoning_not_reported'; }
    var cached = (usage.prompt_tokens_details
      && typeof usage.prompt_tokens_details.cached_tokens === 'number')
      ? usage.prompt_tokens_details.cached_tokens : 0;
    return { ok: true, present: true, shape: 'openai', inTok: pt, outTok: billedOut,
      completionTok: ct, reasoningTok: reasoning, outputBasis: basis,
      reasoningAccounted: basis !== 'completion_only_reasoning_not_reported',
      cachedInTok: cached,
      // A COMPUTED FIGURE, NOT A PROVIDER BILL. Cached input is priced at the full input rate
      // because this repo holds no verified cached rate, so any total containing cached tokens
      // is conservative by construction and must be labelled as such.
      conservativeCachedInput: cached > 0,
      cachedNote: cached > 0
        ? 'priced at the FULL input rate — conservative, not an exact provider charge'
        : null,
      genuineZero: pt === 0 && billedOut === 0 };
  }

  // The marker a LOCAL refusal carries. A budget refusal is not a transport failure: aborting the
  // request made it look like a dead network, so the adapter kept exposure and the pass recorded an
  // assessment attempt for work that never left the machine. A refusal is now returned explicitly.
  var EB_LOCAL_REFUSAL = '_ebLocalRefusal';

  // ── ONE RESERVATION CALCULATION, FOR QUOTING AND FOR DISPATCH (Roman 2026-10-16) ───────────
  // The app-side guard used chars/4 with no output multiplier while the quotes came from
  // _fsc_cost_guard.estimateUsd, which uses chars/2.6 for the Claude 5 family and multiplies the
  // output allowance by 1.5. Those are materially different numbers — the app's was far lower —
  // and presenting one as enforcement of the other was wrong. This is now the single definition;
  // the harness's quote path calls it too, so a quote and a dispatch price identically.
  //
  // IT IS AN APPROXIMATION, NOT A BOUND. 2.6 chars/token comes from one observed Claude 5
  // payload; a denser prompt can tokenize below it and under-reserve. REASONING_MULT exists
  // because reasoning tokens are not bounded by max_tokens.
  // Rates copied from _fsc_cost_guard's verified table, which the harness cross-checks at
  // startup. An unlisted model fails closed rather than borrowing another model's rate.
  var EB_RATES = { 'claude-haiku-4-5-20251001': { in: 0.000001,   out: 0.000005 },
                   'grok-4.3':                  { in: 0.00000125, out: 0.0000025 } };
  var EB_CHARS_PER_TOKEN_CLAUDE5 = 2.6;
  var EB_CHARS_PER_TOKEN = 4.0;
  var EB_REASONING_MULT = 1.5;
  // The 1.2 margin the cost guard applies on top of everything else. Omitting it was the concrete
  // gap: the app-side guard priced ~17% under the figure the quotes were built from, so the quote
  // was never enforcement of the guard. A cross-check in the harness refuses to run if these
  // constants ever drift from _fsc_cost_guard's.
  var EB_SAFETY_MARGIN = 1.2;
  function ebReserveUsd(messages, maxTokens, model) {
    var m = String(model || 'claude-haiku-4-5-20251001');
    var rate = EB_RATES[m];
    // FAIL CLOSED: an unpriceable model is refused, not reserved at some default.
    if (!rate) return { bounded: false, usd: Infinity, model: m,
      why: 'no published rate for "' + m + '", so this dispatch cannot be priced' };
    var chars = 0;
    (messages || []).forEach(function (x) { chars += String((x && x.content) || '').length; });
    var cpt = /^claude-(sonnet|opus|haiku|fable|mythos)-5/.test(m)
      ? EB_CHARS_PER_TOKEN_CLAUDE5 : EB_CHARS_PER_TOKEN;
    var inTok = Math.ceil(chars / cpt);
    var outTok = Math.ceil((Number(maxTokens) || 0) * EB_REASONING_MULT);
    var raw = inTok * rate.in + outTok * rate.out;
    return { bounded: true, usd: raw * EB_SAFETY_MARGIN, raw: raw, model: m,
      chars: chars, inTok: inTok, outTok: outTok, charsPerToken: cpt,
      reasoningMult: EB_REASONING_MULT, safetyMargin: EB_SAFETY_MARGIN };
  }

  // ── THE SHAPE OF AN ATTEMPT RECORD, DEFINED ONCE ───────────────────────────────────────────
  // (Roman 2026-10-15) Built here so the writer in app.js and the reader `_cpAttemptsFlat` cannot
  // disagree about what an attempt is. It is attached to a manifestation as `assessment`, and the
  // recorder's existing facet_id + sceneUid dedupe means duplicate processing of one scene
  // REPLACES the row rather than adding a second attempt.
  //
  // `ran` is the whole point: a row without it is an instruction, not an attempt.
  // `appearanceEvidenced` requires a quotation validated against the published text. An
  // unavailable judge leaves appearance unknown, so it stays false and the author is told so
  // rather than being assured the reader has met the person.
  function cpAttemptRecord(opts) {
    opts = opts || {};
    var usable = opts.judgeUsable !== false;
    var q = normalise(opts.appearanceQuote);
    var evidenced = usable && !!q && !!opts.reader && quotePresent(q, opts.reader);
    return {
      ran: true,
      outcome: usable ? 'unverified' : 'unavailable',
      revisionId: opts.revisionId || null,
      appearanceEvidenced: evidenced,
      appearanceQuote: evidenced ? q : null,
      note: usable
        ? 'An assessment ran against this revision and could not establish delivery.'
        : 'An assessment was attempted and produced no usable judgment; neither delivery nor '
          + 'appearance was established.'
    };
  }

  // ONE CREDIT PER CHARACTER PER SCENE. Retries, page navigation and re-renders must
  // not add a second; a REPAIR supersedes that scene's record instead of adding a
  // credit beside it. The existing recorder pushes unconditionally, so this is the
  // missing guard rather than a replacement for it.
  function cpCreditDelivery(ledger, rec) {
    var list = Array.isArray(ledger) ? ledger : [];
    if (!rec || !rec.character || !rec.sceneUid) {
      return { outcome: 'ignored', why: 'a credit needs both a character and a sceneUid', ledger: list };
    }
    if (rec.verification && rec.verification !== 'verified') {
      return { outcome: 'ignored', why: 'only delivered (verified) depictions earn coverage credit', ledger: list };
    }
    var k = String(rec.character).toLowerCase() + '@' + String(rec.sceneUid);
    var at = list.findIndex(function (m) {
      return String(m.character || '').toLowerCase() + '@' + String(m.sceneUid) === k;
    });
    var entry = { character: String(rec.character), sceneUid: String(rec.sceneUid),
      issue: (rec.issue != null) ? rec.issue : null,
      ordinal: (rec.ordinal != null) ? rec.ordinal : null,
      facetId: rec.facetId || null,
      mode: (rec.mode === CP_MODE.ECHO || rec.mode === CP_MODE.BROADEN) ? rec.mode : null,
      relation: rec.relation || null,
      whatIsNew: rec.whatIsNew || null,
      verification: 'verified',
      provenance: rec.provenance || 'authored' };
    if (at === -1) { list = list.concat([entry]); return { outcome: 'added', ledger: list }; }
    // Supersede: same character, same scene. A repair's record replaces the original.
    var prior = list[at];
    var next = list.slice();
    next[at] = Object.assign({}, entry, { provenance: rec.provenance || 'repaired',
      supersedes: prior.provenance || 'authored' });
    return { outcome: 'replaced', ledger: next, replaced: prior };
  }

  // WHAT THIS ISSUE STILL OWES. Introductions first, then recurring coverage.
  // participants: [{ id, label, isNew, participation: 'major'|'minor'|'crowd', isPC,
  //                  depictionMode: 'on_stage'|'recalled_or_reported' }]
  function cpCoveragePlan(opts) {
    opts = opts || {};
    var issue = opts.issue != null ? opts.issue : null;
    var ledger = Array.isArray(opts.ledger) ? opts.ledger : [];
    // ATTEMPTS ARE A SEPARATE LIST AND NEVER JOIN `delivered`. The verified-only filters below
    // are unchanged; nothing here can turn an unverified record into coverage credit.
    var attempts = Array.isArray(opts.attempts) ? opts.attempts : [];
    var sceneOrdinal = (typeof opts.sceneOrdinal === 'number') ? opts.sceneOrdinal : null;
    // ── A COMPLETED EDIT IS NOT PERMANENTLY UNDELIVERED (Roman 2026-10-16) ────────────────────
    // This filtered on `verified` alone, which had a consequence I did not see: the dedicated
    // editor writes no verified records (it has no judge, by design), so NOTHING it ever did
    // could move a character out of "introduction still owed". After the spacing gap it would
    // ask for the same introduction again, indefinitely, for a scene that already depicts them.
    //
    // Separating editorial claims from proven quality must not mean treating every completed
    // edit as undelivered forever. So there are now THREE tiers, and the middle one is the
    // honest operational record this was missing:
    //
    //   verified         a judge checked the published text and found the depiction. Unused today.
    //   editor_reviewed  the dedicated editor answered, and the PUBLISHED TEXT carries the
    //                    passage — an accepted edit or a KEEP whose quote survives in what
    //                    shipped. Operational delivery. NOT a quality finding.
    //   directed         we asked. Nobody established anything. Still owed.
    //
    // SCHEDULING counts the first two; nothing else does. `verified` keeps its exact meaning, no
    // record is relabelled, and every consumer can still tell them apart.
    var delivered = ledger.filter(cpCountsAsDepiction);
    var inIssue = delivered.filter(function (m) { return issue == null || m.issue === issue; });
    var byChar = function (arr, label) {
      return arr.filter(function (m) { return String(m.character || '').toLowerCase() === String(label).toLowerCase(); });
    };

    var obligations = [], satisfied = [], excluded = [];
    (opts.participants || []).forEach(function (p) {
      if (!p || !p.label) return;
      // A crowd is a crowd. Individual characterisation is owed to individually
      // depicted people, never to every member of a passing throng.
      if (p.participation === 'crowd') {
        return excluded.push({ label: p.label, why: 'crowd — not individually depicted' });
      }
      var everDelivered = byChar(delivered, p.label);
      var thisIssue = byChar(inIssue, p.label);

      if (!everDelivered.length) {
        // ── AN OVERDUE INTRODUCTION IS NOT A NEW ONE (Roman 2026-10-15) ────────────────────
        // Nothing verified, so this stays an INTRODUCTION: `delivered` and `inIssue` are
        // untouched, cpDepictionMode is never reached, and for a love interest the social-proof
        // requirement therefore survives until something is actually verified. What changes is
        // only HOW it is staged and WHEN it is eligible again.
        //
        // ATTEMPTS ARE EXPLICIT, NEVER INFERRED. `verification: 'directed'` is the recorder's
        // DEFAULT — it means "we asked", which may be an instruction nobody ever fulfilled or
        // checked. So only rows carrying an assessment that actually RAN count here, and the
        // caller supplies them; this function does not reinterpret non-verified rows.
        //
        // ELIGIBILITY IS SCENE-RELATIVE, NOT CUMULATIVE. A running total never resets, so a
        // threshold once crossed stays crossed for the whole issue and the obligation would be
        // deferred forever. The gap is measured from the LAST actual attempt.
        var tried = byChar(attempts, p.label)
          .filter(function (m) { return issue == null || m.issue == null || m.issue === issue; });
        var lastOrd = null;
        tried.forEach(function (m) {
          if (m.ordinal != null && (lastOrd == null || m.ordinal > lastOrd)) lastOrd = m.ordinal; });
        var sinceLast = (lastOrd != null && sceneOrdinal != null) ? (sceneOrdinal - lastOrd) : null;
        var eligible = !tried.length                      // never attempted → mandatory, always
          || sinceLast == null                            // no scene arithmetic available → do not defer
          || sinceLast >= CP_INTRO_RETRY_GAP;
        // Appearance is a SEPARATE fact from delivery, and an unavailable judge leaves it
        // unknown. Only an attempt that actually evidenced the person in the published text
        // licenses telling the author they are already on the page.
        var appeared = tried.some(function (m) { return m.appearanceEvidenced === true; });
        var apQuote = null;
        tried.forEach(function (m) { if (!apQuote && m.appearanceEvidenced === true && m.appearanceQuote) apQuote = m.appearanceQuote; });
        return obligations.push({ label: p.label, id: p.id || null, isPC: !!p.isPC,
          kind: 'introduction',
          due: eligible ? 'this_scene' : 'later_in_issue',
          eligibleThisScene: eligible,
          firstEverAttempt: !tried.length,
          priorAttempts: tried.length,
          lastAttemptOrdinal: lastOrd,
          scenesSinceLastAttempt: sinceLast,
          retryGap: CP_INTRO_RETRY_GAP,
          appearanceEvidenced: appeared,
          appearanceQuote: apQuote,
          staging: tried.length ? 'resume' : 'fresh',
          unresolvedNote: tried.length
            ? ('A depiction was attempted' + (lastOrd != null ? ' in scene ' + lastOrd : '')
               + ' and its delivery was NOT verified, so the introduction is still owed. '
               + (appeared
                   ? 'The published text does show this person, so do not stage another entrance — '
                     + 'complete the unfinished depiction of someone already present.'
                   : 'Whether the published text shows this person at all was NOT established, so '
                     + 'do not assume the reader has met them and do not assume they have not.')
               + ' There is no verified first impression to echo or broaden.')
            : null,
          depictionMode: p.depictionMode || 'on_stage',
          why: tried.length
            ? 'an earlier depiction was attempted and never verified — the introduction remains outstanding'
            : 'first individually depicted appearance — Character+ is owed on introduction',
          mode: null, modeWhy: 'an introduction establishes the first impression; it is neither an echo nor a broadening' });
      }
      // Existing character. At least one NEW depiction per issue they participate in;
      // normally two for a recurring major participant.
      var want = (p.participation === 'major') ? 2 : 1;
      if (thisIssue.length >= want) {
        return satisfied.push({ label: p.label, delivered: thisIssue.length, wanted: want });
      }
      var m = cpDepictionMode(everDelivered, inIssue);
      // ── THE SECOND DEPICTION MUST BECOME ELIGIBLE (fixed 2026-10-19) ──────────────────────
      // This set due:'later_in_issue' for ANY character who already had one depiction this issue,
      // and cpEditorDue defers everything that is not 'this_issue'. Between them the second
      // depiction a major participant is owed could never come due: the label said "later" and
      // nothing ever made later arrive. A major character's `wanted: 2` was unreachable.
      //
      // ELIGIBILITY IS NOW SPACING, NOT A BINARY LABEL. The next depiction comes due once
      // CP_RECUR_GAP scenes have passed since the last one DELIVERED this issue — so it is not
      // forced into the immediately following scene, and it is not deferred for ever either.
      // Measured from delivery, not from attempts; cpEditorDue still applies its own attempt
      // spacing on top, so a tried-and-unverified depiction is not retried immediately.
      var lastDeliveredOrdinal = null;
      thisIssue.forEach(function (d) {
        if (d && d.ordinal != null && (lastDeliveredOrdinal == null || d.ordinal > lastDeliveredOrdinal)) {
          lastDeliveredOrdinal = d.ordinal;
        }
      });
      var sinceDelivered = (lastDeliveredOrdinal != null && sceneOrdinal != null)
        ? (sceneOrdinal - lastDeliveredOrdinal) : null;
      var spacedEnough = !thisIssue.length                     // nothing yet this issue → due now
        || sinceDelivered == null                              // no scene arithmetic → do not defer
        || sinceDelivered >= CP_COVERAGE_RECUR_GAP;
      obligations.push({ label: p.label, id: p.id || null, isPC: !!p.isPC,
        kind: 'recurring', due: spacedEnough ? 'this_issue' : 'later_in_issue',
        depictionMode: p.depictionMode || 'on_stage',
        deliveredThisIssue: thisIssue.length, wanted: want,
        lastDeliveredOrdinal: lastDeliveredOrdinal,
        scenesSinceLastDelivered: sinceDelivered,
        recurGap: CP_COVERAGE_RECUR_GAP,
        mode: m.mode, modeWhy: m.why,
        why: 'participates in this issue with ' + thisIssue.length + ' of ' + want
          + ' new depictions delivered'
          + (thisIssue.length
              ? (spacedEnough
                  ? '; the next one is due now (' + sinceDelivered + ' scene(s) since the last delivered, gap is ' + CP_COVERAGE_RECUR_GAP + ')'
                  : '; the next one is not spaced yet (' + sinceDelivered + ' of ' + CP_COVERAGE_RECUR_GAP + ' scene(s))')
              : '') });
    });

    // Both modes should occur across an issue where the opportunities exist. If every
    // recurring obligation came back the same way, flip the one with the most history
    // — chosen by evidence, not by alternation or a coin.
    var recurring = obligations.filter(function (o) { return o.kind === 'recurring'; });
    var modes = {};
    recurring.forEach(function (o) { if (o.mode) modes[o.mode] = (modes[o.mode] || 0) + 1; });
    var issueModes = {};
    inIssue.forEach(function (m) { if (m.mode) issueModes[m.mode] = (issueModes[m.mode] || 0) + 1; });
    if (recurring.length > 1 && Object.keys(modes).length === 1 && !issueModes[CP_MODE.BROADEN]
      && modes[CP_MODE.ECHO]) {
      var pick = recurring.slice().sort(function (a, b) { return b.deliveredThisIssue - a.deliveredThisIssue; })[0];
      pick.mode = CP_MODE.BROADEN;
      pick.modeWhy = 'this issue has only echoes so far, and this participant has the most history to broaden from';
    }

    return { issue: issue, obligations: obligations, satisfied: satisfied, excluded: excluded,
      deliveredThisIssue: inIssue.length, modesThisIssue: issueModes };
  }

  // ECHO vs BROADEN, from history — never a coin flip and never strict alternation.
  // A first impression that has never been revisited is owed an echo; once it has
  // been, the next depiction broadens unless this issue has no echo in it at all.
  function cpDepictionMode(charDelivered, issueDelivered) {
    var hist = charDelivered || [];
    var echoes = hist.filter(function (m) { return m.mode === CP_MODE.ECHO; }).length;
    var broadenings = hist.filter(function (m) { return m.mode === CP_MODE.BROADEN; }).length;
    if (hist.length === 1 && !echoes) {
      return { mode: CP_MODE.ECHO,
        why: 'the first impression has never been returned to; revisit it with a new implication, cost, exception or meaning' };
    }
    if (echoes && !broadenings) {
      return { mode: CP_MODE.BROADEN,
        why: 'the first impression has been echoed ' + echoes + 'x and no other facet has been shown yet' };
    }
    if (broadenings > echoes) {
      return { mode: CP_MODE.ECHO,
        why: broadenings + ' broadenings against ' + echoes + ' echoes — return to the established impression and complicate it' };
    }
    return { mode: CP_MODE.BROADEN,
      why: 'echoes and broadenings are level (' + echoes + '/' + broadenings + '); reveal another grounded facet' };
  }

  // ── GROUNDED SOCIAL-PROOF OPPORTUNITIES (Roman 2026-10-15) ───────────────────────────────
  // Derived from the LI's EXISTING facets and this scene's own facts — never invented. A facet
  // whose condition already involves other people IS a social-proof opportunity: the condition
  // names the circumstance in which someone else's response becomes legible. Each one is paired
  // with the scene facts that could stage it, so a plan cannot select a response this scene has no
  // evidence for. If no condition involves other people, that is an input gap in the character
  // material — not licence to invent a reaction.
  // NO TRAILING \b: these are deliberately PREFIXES (assembl→assembly, defer→defers, observ→
  // observer). A closing boundary made every prefix unmatchable, so "a peer the assembly defers to"
  // yielded no opportunity at all and the derivation looked empty.
  var OTHERS_RX = /\b(assembl|guests?|famil|room|crowd|watch|observ|witness|onlooker|defer|regard|rank|preced|senior|address|announc|turns? toward|approval|everyone|people)/i;
  function cpSocialProofOpportunities(facets, opts) {
    opts = opts || {};
    var facts = (opts.facts || []).filter(function (f) { return f && f.pressureEligible && f.text; });
    var out = [], seen = {};
    (Array.isArray(facets) ? facets : []).forEach(function (f) {
      if (!f || !f.facet_id) return;
      [].concat(f.pressures || [], f.possible_pressures || []).forEach(function (p) {
        var text = (typeof p === 'string') ? p : (p && p.text);
        if (!text || !OTHERS_RX.test(text)) return;
        // DEDUPLICATED. `pressures` and `possible_pressures` can carry the same condition, and the
        // list was printing it twice. Keyed on facet + condition so the meaning is untouched.
        var _k = String(f.facet_id) + '\u0001' + normalise(text).toLowerCase();
        if (seen[_k]) return;
        seen[_k] = 1;
        // A NEGATED CONDITION IS NOT AN OPPORTUNITY. "a quiet room with nobody watching" contains
        // a people-word and involves no one; a lexical scan cannot tell those apart on its own, so
        // the obvious negations are excluded explicitly. This stays a derivation over authored
        // conditions, so a condition that slips through is selected by planning, never invented.
        if (/\b(nobody|no one|no-one|alone|unobserved|unwatched|without (?:anyone|witness)|empty)\b/i.test(text)) return;
        out.push({ facetId: f.facet_id, category: f.category || null,
          condition: String(text),
          expresses: f.canonical_truth || null,
          stageableFrom: facts.filter(function (x) { return OTHERS_RX.test(x.text); })
            .map(function (x) { return x.evidence_id; }),
          asks: 'stage ONE other person responding under this condition — specific behaviour, not '
            + 'narration about how people feel — then let the protagonist read that response' });
      });
    });
    return { ok: out.length > 0, opportunities: out,
      why: out.length ? null
        : 'no facet condition on record involves other people, so there is no grounded social-proof '
          + 'opportunity — resolve this in the character material rather than inventing a reaction' };
  }

  // ── BIBLE MATERIAL, DERIVED FROM CANON (Roman 2026-10-15) ──────────────────────────────
  // FIRST IMPRESSION / ECHO / BROADENING / DISCLOSURE, built from the facets a character
  // ALREADY has — the authored seed facets for an established cast, or the ones the existing
  // character-generation call produced for a generated one. Same field names either way
  // (facet_id, category, canonical_truth, pressures, forbidden_restatements), so this adds no
  // model call, no per-character call, and no competing character-truth store.
  //
  // For an established character this DERIVES; it never replaces their psychology. The canonical
  // truth is carried through untouched and stays unstated — it is the thing a depiction reveals.
  //
  // These are INGREDIENTS AND OPPORTUNITIES, not mandatory prose and not an entrance routine.
  // Scene planning selects; the author writes the expression in context.
  function cpBibleMaterial(facets, opts) {
    opts = opts || {};
    var list = (Array.isArray(facets) ? facets : []).filter(function (f) { return f && f.facet_id; });
    if (!list.length) {
      return { ok: false, why: 'no canonical facets on record — this is an input gap to resolve from '
        + 'established character material, not something a depiction should improvise',
        firstImpression: null, echoMaterial: [], broadeningMaterial: [], disclosureLimits: null };
    }
    var pressuresOf = function (f) {
      return [].concat(f.pressures || [], f.possible_pressures || [])
        .map(function (p) { return typeof p === 'string' ? { text: p } : (p || {}); })
        .filter(function (p) { return p && p.text; });
    };
    // The first impression rests on the facet with the most ways to surface naturally — the one
    // the story can actually afford to show early — with ties broken by order, never randomly.
    var ranked = list.slice().sort(function (a, b) { return pressuresOf(b).length - pressuresOf(a).length; });
    var lead = ranked[0];
    var leadPressures = pressuresOf(lead);

    var first = {
      facetId: lead.facet_id, category: lead.category || null,
      expressesFacet: lead.canonical_truth || null,
      circumstances: leadPressures.map(function (p) { return p.text; }).slice(0, 4),
      note: 'A grounded behaviour or detail that expresses this facet. The facet itself is SOURCE '
        + 'material and must stay unstated.',
      // ── POSSIBILITIES, NOT STOCK OPENERS (Roman 2026-10-15) ─────────────────────────────
      // A circumstance is a condition the story already affords. It is not a line to reproduce,
      // and a bible that reads as an approved opener produces the same introduction in every
      // story — which is what makes an introduction feel generated rather than observed.
      areCircumstances: 'These are CONDITIONS this scene already affords, offered so a depiction '
        + 'does not have to invent an event. None is wording to reuse, and none is required: pick '
        + 'whichever this moment genuinely supports, or find another the scene affords. Realise it '
        + 'as the specific thing happening here, in this room, to these people.',
      style: CP_STYLE.compression + ' ' + CP_STYLE.breadth,
      castLimit: CP_STYLE.noNewCast
    };
    // ECHO: the SAME facet under a condition it has not been shown under yet — a new implication,
    // cost, exception or meaning for an impression the reader already holds.
    var echo = leadPressures.slice(1).map(function (p) {
      return { facetId: lead.facet_id, newCondition: p.text,
        revisits: lead.canonical_truth || null,
        asks: 'return to the established impression under this condition and show what it now implies, '
          + 'costs, excepts or means — not the same reading in new words' };
    });
    // BROADEN: the OTHER facets, which complicate rather than repeat the first reading.
    var broaden = ranked.slice(1).map(function (f) {
      return { facetId: f.facet_id, category: f.category || null,
        facet: f.canonical_truth || null,
        circumstances: pressuresOf(f).map(function (p) { return p.text; }).slice(0, 3),
        complicates: lead.canonical_truth || null,
        mustStaySituational: CP_STYLE.freshness };
    });
    // DISCLOSURE: what may be perceived now versus what stays private. Reuses the canon's own
    // forbidden_restatements rather than inventing a second prohibition vocabulary.
    var forbidden = [];
    list.forEach(function (f) {
      // The authored canon shape is { forbid: <pattern>, why: <reason> } (see the seed's
      // cPlusFacets); a plain string and {text}/{phrase} are accepted too.
      (f.forbidden_restatements || []).forEach(function (x) {
        var t = typeof x === 'string' ? x : (x && (x.forbid || x.text || x.phrase));
        if (!t) return;
        var rec = { pattern: String(t), why: (x && x.why) ? String(x.why) : null, facetId: f.facet_id };
        if (!forbidden.some(function (y) { return y.pattern === rec.pattern; })) forbidden.push(rec);
      });
    });
    var sealed = list.filter(function (f) { return f.sealed === true || f.disclosure === 'sealed'
      || (f.untilScene != null) || (f.fromScene != null); }).map(function (f) {
        return { facetId: f.facet_id, fromScene: f.fromScene != null ? f.fromScene : null,
          untilScene: f.untilScene != null ? f.untilScene : null }; });
    return { ok: true,
      firstImpression: first, echoMaterial: echo, broadeningMaterial: broaden,
      disclosureLimits: {
        mustRemainUnstated: list.map(function (f) { return f.canonical_truth; }).filter(Boolean),
        forbiddenRestatements: forbidden,
        scheduled: sealed,
        note: 'A canonical truth is never a sentence to reproduce: show the behaviour and let the '
          + 'reading land. Scheduled facets may not be perceived outside their window.'
      },
      derivedFrom: list.length + ' canonical facet(s)', derivation: 'canon-derived, no model call' };
  }

  // ONE DEFICIENCY, ONE EDITOR. The optional perception-lens polish and this repair
  // must not both rewrite the same paragraph. Repair claims its authorized refs; the
  // lens pass reads the claim and leaves those alone. Scarcity still governs LENSES —
  // it does not get to cancel a required Character+ depiction, because this
  // assessment never consults the lens budget.
  function cpClaimRefs(state, sceneKey, refs) {
    var s = state || {};
    if (!s._cpRepairClaimedRefs || s._cpRepairClaimedRefs.key !== sceneKey) {
      s._cpRepairClaimedRefs = { key: sceneKey, refs: [] };
    }
    (refs || []).forEach(function (r) {
      if (s._cpRepairClaimedRefs.refs.indexOf(r) === -1) s._cpRepairClaimedRefs.refs.push(r);
    });
    return s._cpRepairClaimedRefs;
  }
  function cpRefClaimed(state, sceneKey, ref) {
    var c = (state || {})._cpRepairClaimedRefs;
    return !!(c && c.key === sceneKey && c.refs.indexOf(ref) !== -1);
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE PRODUCTION CHARACTER+ EDITOR — ONE SCENE-WIDE CALL, EVERY ELIGIBLE SCENE
  // (Roman 2026-10-16)
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // This is the connected feature, not a harness. It runs on the ordinary finalized-prose path,
  // for openings and continuations alike, before the scene is published.
  //
  // WHAT IT IS NOT: the judge → repair → judge chain. No verdict controls it, there is no
  // recheck, and no second call. One request per eligible scene covering everybody due.
  //
  // WHAT THE SCHEDULER MEANS. cpCoveragePlan says who is ELIGIBLE; it never says the prose
  // failed. KEEP is a first-class answer for every obligation, and "the author already did it"
  // is the expected outcome on a well-written scene. An assignment is not proof of delivery, and
  // mechanical acceptance of an edit is not proof of fulfilment — those stay separate all the
  // way through to history.

  // How many obligations one call may carry. Beyond this the request stops being a focused
  // editing brief and becomes a worklist, and the output allowance stops being predictable.
  // Overflow is NOT dropped: it stays unmet in the ledger, so the scheduler offers it again in a
  // later scene, spaced by the usual gap, without this scene being charged twice.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // FUSION — C+ FUSED WITH E+  (Roman 2026-10-19; revises the instruction freeze for Fusion only)
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // ONE SOURCE. The author's voice block (app.js _buildAuthorVoiceSTB) and the editor both read
  // this, so there is a single definition rather than a second overlapping doctrine.
  //
  // WHAT FUSION IS: environmental description that reveals its observer — through what they
  // notice, how they describe it, and what they make of it. The SAME words do both jobs.
  //
  // WHAT IT IS NOT: bodily tension plus scenery. Nor a character explanation appended to an
  // environmental paragraph. Those are two things next to each other; Fusion is one thing.
  // ── THE PROTAGONIST IS NOT EXEMPT (Roman 2026-10-19) ───────────────────────────────────────
  // She flows through cpCoveragePlan as a participant like anyone else (isPC, 'major', so two new
  // depictions per issue), and from Scene 2 on nothing owns her beat the way pc_opening_fusion
  // owns the opening. But the editor was never TOLD what her depiction may be made of, so a
  // reply could satisfy everyone else and leave her a camera. Stated once, here, and printed only
  // when a PC obligation is actually due.
  // ── THE PROTAGONIST IS NOT EXEMPT (Roman 2026-10-19) ───────────────────────────────────────
  // She flows through cpCoveragePlan as a participant like anyone else (isPC, 'major', so two new
  // depictions per issue), and from Scene 2 on nothing owns her beat the way pc_opening_fusion
  // owns the opening. But the editor was never TOLD her depiction was owed at all, so a reply
  // could satisfy everyone else and leave her a camera.
  //
  // CORRECTED, AND THE FIRST VERSION WAS WRONG. It listed two channels — explicit
  // self-assessment or another person's observation — and added "narrating what she SEES is not
  // a depiction of her". That contradicts Fusion outright: what she singles out, the words she
  // chooses for it and what she makes of it ARE how a description reveals its observer, and
  // demanding a "conclusion drawn" invites exactly the explanatory gloss the doctrine rejects.
  // This states the DISTINCTION (generic sensation against revealing perception) without
  // prescribing a channel, and defers to the shared standard instead of competing with it.
  var CP_PC = {
    channels: 'THE PROTAGONIST IS DUE A DEPICTION TOO, and she is not exempt because the scene is '
      + 'hers. ANY CHANNEL THAT REVEALS HER COUNTS, and most of them are not statements about '
      + 'her: what she singles out and what she passes over, the words she reaches for, what she '
      + 'assumes without checking, what she does, what she declines to do, how she reads another '
      + 'person, another person\'s response to her. An environmental passage can satisfy her '
      + 'Character+ and a Fusion at the same time — that is the form, not a loophole. '
      + 'THE DISTINCTION THAT MATTERS is between a sensation anyone could have had in that room '
      + 'and a perception only she would have: "her chest tightened" could be anyone; which '
      + 'detail she cannot stop looking at, and what she takes it to mean, could only be her. '
      + 'You do not have to spell out what it reveals — do not append an explanation. The same '
      + 'standard as every other obligation applies: grounded, revealing, scene intact.',
    withFusion: 'HER DEPICTION AND THE FUSION ARE ONE OBLIGATION when a Fusion is due — if the '
      + 'Fusion lands, she is depicted. Do not write a second, separate passage about her.'
  };

  var CP_FUSION = {
    // ══ BROADENED (Roman 2026-10-20) ═════════════════════════════════════════
    // This said Fusion is a description that reveals its OBSERVER. That made the protagonist's
    // internal reading the whole definition and excluded a person revealed through what they say
    // or do with a place — a scope restriction, not a quality bar. Corrected at the definition
    // rather than patched with an exception.
    definition: 'FUSION combines environmental characterization with characterization of a person '
      + 'through their RELATIONSHIP to that environment. The relationship may appear through '
      + 'perception, association, judgment, dialogue or action. The character revealed may be the '
      + 'protagonist or another character. The environmental feature must contribute meaningfully '
      + 'to the revelation rather than merely sit beside it — so bodily tension next to scenery '
      + 'is not Fusion, and neither is a line about a person appended to a paragraph about a room.',
    closePov: 'CLOSE POV STILL BINDS. Another character’s WORDS or ACTIONS with a place may reveal '
      + 'them; their unspoken thoughts remain unavailable. The protagonist may infer, and her '
      + 'inference stays hers.',
    ownership: 'AN ASSIGNMENT NAMES WHO MUST BE REVEALED. A passage revealing one person through '
      + 'the environment can satisfy the environmental work AND that person’s characterization; it '
      + 'does NOT thereby satisfy a different person’s. A Fusion that reveals the love interest is '
      + 'not a repair of a protagonist assignment, and labelling a passage Fusion awards no '
      + 'coverage to anyone it does not reveal.',
    // A LABELLED TECHNIQUE DEMONSTRATION. Not compulsory wording, not a personality every
    // protagonist must have, and not canon.
    demonstration: {
      passage: 'I kept my eyes on a mated pair of Veilwood trees, studying the smooth white '
        + 'trunks twisting together in immortal love. This pair had a faint pink coloring at the '
        + 'seam where the trunks pulled each other closest. I hated the stories some used to '
        + 'scare children by telling them that pink was the remains of a criminal, tied between '
        + 'two trunks as they slowly tightened their branches around each other, crushing '
        + 'anything in between them.',
      why: 'The trees, the pink at the seam and the story attached to them develop the '
        + 'ENVIRONMENT. Reading the twisting as immortal love, and objecting to the version told '
        + 'to frighten children, reveal the OBSERVER — in the same description, not after it.',
      caution: 'A LABELLED DEMONSTRATION OF THE TECHNIQUE. Do not copy its wording, its subject '
        + 'or its sentence shapes, and do not infer that every protagonist is romantic or '
        + 'protective of children. The viewpoint supplied for THIS story decides what is noticed.'
    },
    // The criterion, stated once, used by the request and by the KEEP rule.
    criterion: 'Does the SAME passage make the environment particular AND reveal something '
      + 'particular about the person whose relationship to it is shown — whoever that is? One passage may satisfy both the environmental '
      + 'obligation and the protagonist\u2019s Character+ when its environmental description is '
      + 'genuinely meaningful AND the relationship shown genuinely reveals that person. '
      + 'Sharing a paragraph does not establish that by itself; naming her role does not by '
      + 'itself; announcing a skill does not by itself \u2014 that she CAN read something is a '
      + 'capability, and what she READS in it is the revelation. Bodily sensation is not '
      + 'forbidden: it cannot stand in for a reading, and it may appear in a passage that '
      + 'has one.',
    // ══ SCENE PRESSURE AS A SELECTION AID (Roman 2026-10-20) ═══════════════════════
    // WHY THIS EXISTS. "Choose a feature and connect it to her concerns" leaves the hardest part
    // — WHICH feature, and why that one — entirely open, and four attempts answered it by reaching
    // for whatever was nearest to hand (warmth, scent, a shift of weight). Naming the scene's
    // central pressure gives a reason to prefer one feature over another.
    //
    // IT IS A SELECTION AID, NOT A LAW THAT EVERY SETTING MUST SYMBOLISE THE PLOT. If every room
    // comments on the protagonist, the device dies. It applies where a scene has a pressure worth
    // resonating with, and the sequence stays: pressure → a feature that resonates → a character's
    // particular response.
    //
    // AND IT NARROWS THE PRESSURE, NEVER THE CONCLUSION. The character is told what the scene
    // turns on; nothing tells them what to think about it.
    scenePressure: 'CHOOSING WHICH FEATURE. When the scene\'s central pressure is supplied, let it '
      + 'decide: choose an available environmental feature whose appearance, history or use '
      + 'RESONATES with that pressure, then let a character\'s response to it reveal something '
      + 'particular about them. The connection may be a parallel, a contrast or a counterpoint — '
      + 'and do not explain the scene\'s theme afterward. A beautiful, apparently innocent feature '
      + 'with something harsh attached to it often works better than an obviously ominous object. '
      + 'THIS IS A WAY TO CHOOSE, NOT A REQUIREMENT THAT EVERY SETTING COMMENT ON THE PLOT.',
    scenePressureBoundaries: 'THREE BOUNDARIES ON IT. FIRST, THE CHARACTER CANNOT KNOW FUTURE '
      + 'EVENTS — BUT THE PROSE MAY FORESHADOW THEM. A character may respond to something that '
      + 'already exists and already carries its own meaning; the reader may recognise the parallel '
      + 'later, and that recognition is the point. What is forbidden is the CHARACTER holding '
      + 'knowledge of what has not happened. SECOND, AN ILLUSTRATIVE OBJECT IS NOT AUTOMATICALLY '
      + 'AUTHORISED: a deliberately placed object can introduce a mystery or a consequential act, '
      + 'so it needs to be established or supplied — the ordinary grounding and editing '
      + 'permissions apply here as everywhere, and nothing more restrictive. THIRD, PRESSURE '
      + 'GUIDES WHICH FEATURE TO CHOOSE. It does not dictate every environmental detail in the '
      + 'scene, and it never dictates what the character concludes.',
    method: 'HOW TO BUILD ONE — ALTERNATIVES, NOT SLOTS. Choose the available environmental '
      + 'feature with the strongest revealing potential for this character in this situation. '
      + 'Find its relationship to their wound, mask, desire, values, contradiction or current '
      + 'predicament. Express that relationship through perception, speech or interaction. No '
      + 'metaphor, internal monologue, historical explanation, obstacle or consequential action is '
      + 'required.',
    length: 'NO ONE-SENTENCE LIMIT. A short passage can be compressed and still do both jobs; '
      + 'two or three sentences that develop place and person together are better than one that '
      + 'does half of each. Length is not the measure — whether the same words do both is.',
    noPrescribedFeeling: 'DO NOT WRITE TOWARD A SUPPLIED FEELING. Nothing here prescribes '
      + 'distrust, tenderness, fear or wonder. The established viewpoint and mask are given; the '
      + 'revealing perception is yours to find.',
    grounding: 'NO INVENTED FOLKLORE, no invented historical incident, no consequential choice '
      + 'and no hidden motive presented as established fact. Small canon-compatible details and '
      + 'small deliberate actions remain permissible — the same standard as ordinary Character+.',
    // ── THE DESIGNATED FOCUS (Roman 2026-10-19) ──────────────────────────────────────────────
    // THE REQUIREMENT, stated once, for all three consumers. The planner designates ONE element
    // so Character+ and Environment+ fuse on the same thing instead of drifting apart. That is a
    // rule about where the passage CENTRES, not a ban on vocabulary: the demonstration above
    // names trees, a seam, a colour, a story and a person tied between the trunks, and it is the
    // canonical example of Fusion done right. A validator that rejected a second noun would
    // reject our own demonstration — which is how this was found.
    focus: 'ONE DESIGNATED ENVIRONMENTAL FOCUS organises the passage: the element the plan names '
      + 'is what the description is ABOUT, and it is what the revealing perception attaches to. '
      + 'That does NOT forbid mentioning anything else — a seam, a colour, a story told about '
      + 'the place, another object in reach may all appear, in any order and as often as the '
      + 'passage needs them, and good Fusion usually needs them. What the focus asks is that the '
      + 'designated element is the one being DEVELOPED. If the passage is really about something '
      + 'else, the fix is to change the designated element — never to delete the word.',
    // What the author block prints, so the two consumers cannot drift.
    authorBlock: function () {
      return '   FUSION, the form to reach for: ' + CP_FUSION.definition
        + '\n   ' + CP_FUSION.closePov
        + '\n   ' + CP_FUSION.ownership
        + '\n   ' + CP_FUSION.scenePressure
        + '\n   ' + CP_FUSION.scenePressureBoundaries
        + '\n   ' + CP_FUSION.method
        + '\n   ' + CP_FUSION.criterion
        + '\n   DEMONSTRATION (technique only — not wording to copy, not canon): "'
        + CP_FUSION.demonstration.passage + '"'
        + '\n   WHY IT WORKS: ' + CP_FUSION.demonstration.why
        + '\n   ' + CP_FUSION.demonstration.caution
        + '\n   ' + CP_FUSION.focus
        + '\n   ' + CP_FUSION.length
        + '\n   ' + CP_FUSION.noPrescribedFeeling;
    },
    // What the editor is told when a Fusion obligation is due.
    // ══ EXPERIMENTAL: THE REFLECTIVE-ROUTE SCAFFOLD ══════════════════════════════
    // (Roman 2026-10-21.) PLAIN INSTRUCTION TEXT. These are creative questions for the writer to
    // answer, NOT request fields the application supplies and NOT additions to the reply schema.
    //
    // IT REPLACES overlapping composition guidance on this route rather than stacking on it: with
    // the scaffold on, `method` and the separate feature-selection aid are NOT emitted, because
    // question 1 asks what they asked and question 2 asks what `method` asked.
    //
    // IT IS NOT A NEW OPERATION. `method` already said to choose the feature with the strongest
    // revealing potential and find its relationship to the character. This states the same
    // operation in a form that is easier to follow; any claim that the operation was absent
    // before is wrong.
    //
    // DEFAULT OFF. No production caller passes the flag, so the production prompt is unchanged.
    reflectiveScaffold: [
      'When reflective Fusion is needed, work out:',
      '1. What concrete environmental feature is available?',
      '2. What does this particular character make of it?',
      '3. What does that response reveal about them?',
      '',
      'Then write the connection. Your second answer must do more than repeat the physical '
        + 'description. The interpretation may be implicit in attention, wording or behavior; no '
        + 'explicit thought or emotion label is required. Preserve the established feature, '
        + 'events and chronology, and do not explain away an uncertainty the scene leaves open.',
      '',
      'THESE ARE WORKING QUESTIONS, NOT THREE MANDATORY SENTENCES, and they are not part of your '
        + 'reply: return only the usual decisions and edits in the usual format. Do not return '
        + 'your answers to them.',
      'THIS IS ONE ROUTE, not a replacement definition of Fusion. A spoken or enacted '
        + 'relationship to a place is equally Fusion. Where the scene ALREADY contains effective '
        + 'Fusion, the right answer is KEEP — do not rewrite working prose to fit this shape.'
    ].join('\n'),
    editorBlock: function (opts) {
      var _scaf = !!(opts && opts.reflectiveScaffold);
      return [
        'ONE OBLIGATION IS A FUSION. ' + CP_FUSION.definition,
        CP_FUSION.closePov,
        CP_FUSION.ownership,
        '',
        _scaf ? CP_FUSION.reflectiveScaffold : CP_FUSION.scenePressure,
        _scaf ? '' : CP_FUSION.scenePressureBoundaries,
        'AS THE EDITOR, THE SECOND BOUNDARY MEANS YOUR USUAL GROUNDING APPLIES: a feature has to '
          + 'be established in the scene or supplied to you. That is the same permission you '
          + 'already work under — not a special prohibition on objects.',
        '',
        _scaf ? '' : CP_FUSION.method,          // question 2 asks what `method` asked
        '',
        'THE TEST: ' + CP_FUSION.criterion,
        '',
        'DEMONSTRATION OF ONE REFLECTIVE ROUTE — technique only, and NOT the universal shape. A '
          + 'spoken or enacted relationship to a place is equally Fusion. Do not copy its wording, '
          + 'its subject or its sentence shapes, and do not infer a personality from it:',
        '  "' + CP_FUSION.demonstration.passage + '"',
        '  WHY: ' + CP_FUSION.demonstration.why,
        '',
        CP_FUSION.focus,
        CP_FUSION.length,
        CP_FUSION.noPrescribedFeeling,
        CP_FUSION.grounding,
        '',
        'PREFER DEVELOPING AN ENVIRONMENTAL PASSAGE THE SCENE ALREADY HAS. A small coherent '
          + 'insertion is allowed where none can carry it, under the same region and '
          + 'protected-passage rules as any other edit.',
        '',
        'THIS IS ONE COMBINED OBLIGATION, NOT TWO. It satisfies the protagonist\'s Character+ '
          + 'THROUGH Environment+. Do not also write a separate depiction of her: if your Fusion '
          + 'lands, she is depicted. And meaningful standalone characterisation of her does NOT '
          + 'by itself satisfy this — a field named pc_opening_fusion, a physical sensation, or '
          + 'general atmosphere is not proof either. KEEP requires a cited passage where the '
          + 'environment is particular AND it reveals her.'
      ].join('\n');
    }
  };

  // ── THE THREE DELIVERY TIERS ───────────────────────────────────────────────────────────────
  // See cpCoveragePlan for why the middle one exists. `cpCountsAsDepiction` is the ONLY predicate
  // scheduling may use; anything reporting on quality must read `verification` itself and say
  // which tier it found.
  var CP_DELIVERY = { VERIFIED: 'verified', EDITOR_REVIEWED: 'editor_reviewed', DIRECTED: 'directed' };
  function cpCountsAsDepiction(m) {
    if (!m) return false;
    return m.verification === CP_DELIVERY.VERIFIED
      || m.verification === CP_DELIVERY.EDITOR_REVIEWED;
  }
  // An operational record is only honest if the passage it claims is actually in the shipped
  // text. This is what the host must satisfy before writing `editor_reviewed`.
  function cpEditorDeliveryRecord(opts) {
    opts = opts || {};
    var passage = normalise(opts.publishedPassage);
    var reader = String(opts.reader || '');
    var present = !!(passage && quotePresent(passage, reader));
    return {
      verification: present ? CP_DELIVERY.EDITOR_REVIEWED : CP_DELIVERY.DIRECTED,
      publishedPassage: present ? passage : null,
      publishedRevision: opts.revisionId || null,
      decision: opts.decision || null,            // 'keep' | 'edit'
      // SAID PLAINLY, ON EVERY RECORD: nobody checked whether this is GOOD.
      semanticallyVerified: false,
      basis: present
        ? 'the dedicated editor answered and the passage is present in the published text'
        : 'the passage the editor claimed is NOT in the published text — nothing is credited',
      at: Date.now()
    };
  }

  // ── NO INTRODUCTION IS SILENTLY DROPPED ────────────────────────────────────────────────────
  // There was a flat five-obligation cutoff here, which quietly deferred a sixth NEWLY
  // INTRODUCED character — reintroducing the introduction-density problem this project already
  // resolved, and redefining "newly introduced characters are covered" without approval.
  //
  // Introductions are now never dropped. What is bounded is the REQUEST, and when the work
  // genuinely will not fit the approved budget the pass REFUSES AND SAYS SO (capacity_exceeded,
  // naming who was not covered) instead of silently covering some of them.
  //
  // RECURRING obligations may still be deferred — by the issue cadence and the spacing rule,
  // which are the approved behaviour and not a cutoff.
  var CP_EDITOR_SOFT_DUE = 5;          // beyond this, recurring work waits for a later scene
  var CP_EDITOR_HARD_DUE = 12;         // beyond this the request cannot be sized; refuse loudly
  // Recurring depictions get the same breathing room as a retried introduction, measured from
  // the last ATTEMPT rather than from a cumulative total that never resets.
  var CP_RECUR_GAP = CP_COVERAGE_RECUR_GAP;   // one source for the spacing, shared with coverage

  // WHO IS DUE IN THIS SCENE, and what the editor needs to know about each of them. Takes the
  // scheduler's own output; adds nothing to it except the authored material and the priority
  // order. Characters not on stage in this scene are not due in this scene.
  // ══ ENVIRONMENT+ COVERAGE: INTRODUCTIONS, RETURNS, CHANGES, RESIGNIFICATION ══════════════════
  // (Roman 2026-10-19.) Scheduled from SCENE EVENTS, never from a per-scene quota. The firing
  // rules are data so they can be read, tested and corrected without touching the scheduler.
  //
  // WHAT IT REUSES. Location identity comes from the stage record's own `location.label` (there is
  // no location id in the shipped shape) slugged the same way other identities are; objects come
  // from the normalised stage inventory (`issued_objects` → {object_id,label,head,kind}). Nothing
  // new is invented where something exists.
  //
  // WHAT IT REFUSES TO DO. It never asks for history or damage: a `change` obligation fires only
  // when the caller supplies an ESTABLISHED change, and the obligation carries that change rather
  // than inviting one. "New scorch marks" is an example of changed state, not permission to invent
  // damage. A passing doorway gets nothing; a major new place gets a distinctive introduction.
  var EP_GAP_RECOGNITION = 2;      // intervening scenes elsewhere before a return is worth marking
  var EP_FIRING = [
    { kind: 'introduction',
      when: 'this place has no delivered depiction yet and the scene is set here',
      weight: 'distinctive — enough that the reader can place it again later',
      why: 'a new meaningful environment is owed one real introduction' },
    { kind: 'recognition',
      when: 'a place already depicted is returned to after intervening scenes elsewhere, or after a '
          + 'meaningful time gap',
      weight: 'concise — a line or two that lands the return; NOT a second introduction',
      why: 'the reader should feel they have been here before without being told it again' },
    { kind: 'change',
      when: 'an ESTABLISHED change to a place already depicted (supplied by the caller, never '
          + 'invented by the editor)',
      weight: 'the relevant difference against the remembered setting, not a fresh survey',
      why: 'what changed is the news; the rest of the room is already known' },
    { kind: 'resignification',
      when: 'an established feature becomes newly meaningful because of what has happened or what '
          + 'the viewpoint character now understands',
      weight: 'a new reading of the same thing — no new facts about it',
      why: 'the place did not change; what it means did' },
    { kind: null,
      when: 'continuous action in the same unchanged place',
      weight: 'nothing is owed',
      why: 'a scene already here does not re-introduce itself' },
  ];

  // ── LOCATION IDENTITY: AN ESTABLISHED ID WHERE THERE IS ONE ─────────────────────────────────
  // A label is not an identity. Two different rooms can share a label ("the study"), and renaming
  // one place must not read as arriving somewhere new. So an established id wins whenever the
  // stage record carries one, and the label-derived key is only the fallback. Which was used is
  // reported, so a story running without ids can be seen to be doing so rather than quietly
  // relying on string equality.
  // ── LOCATION IDENTITY IS NOT A DESCRIPTION ──────────────────────────────────────────────────
  // (corrected 2026-10-19.) The first version slugged the whole setting string, which preserved
  // WORDING rather than place: "Dawn in a Veilwood ceremony clearing, open ground inside a ring
  // of pale living trunks…" became a 90-character key, and "the clearing at dusk" would have been
  // a different environment entirely. Time of day, descriptive expansion and the viewpoint's
  // phrasing all moved the key.
  //
  // SO IDENTITY IS ONLY CLAIMED WHEN SOMETHING ESTABLISHES IT. An established reference — a stage
  // record's location id, or a seed's declared sceneOne.locationId — is authoritative and stable
  // across any rewording. With no such reference the identity is UNRESOLVED: a key is still
  // derived so a first depiction can be credited, but `resolved: false` travels with it and the
  // scheduler refuses the obligations that depend on knowing it is the same place (recognition,
  // change, resignification). Retaining that uncertainty is the point: silently treating every
  // rephrasing as a new environment produced confident nonsense, and silently treating every
  // same-label place as one environment would merge genuinely different rooms.
  function epLocationIdentity(location) {
    var loc = location || {};
    var id = String(loc.id || loc.location_id || loc.locationId || '').trim();
    if (id) {
      return { key: /^loc:/.test(id) ? id : ('loc:' + id), source: 'established_id',
        label: String(loc.label || ''), resolved: true };
    }
    var label = String(loc.label == null ? '' : loc.label).trim();
    if (!label) return { key: null, source: 'none', label: '', resolved: false };
    return { key: epLocationKey(label), source: 'label_fallback', label: label, resolved: false,
      unresolvedWhy: 'no established location reference — this key follows the WORDING of the '
        + 'setting, so a rewording or a different time of day would read as a different place. '
        + 'Obligations that depend on recognising the same place are withheld.' };
  }
  function epLocationKey(label) {
    return 'loc:' + String(label == null ? '' : label).trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  // THE RECORD. Mirrors cpEditorDeliveryRecord exactly: the claimed passage must be in the
  // published text or nothing is credited, and no record ever claims the writing is good.
  // ══ A TRANSITION'S IDENTITY ═════════════════════════════════════════════
  // (Roman 2026-10-20.) Delivery credit used to be "a change record exists at this location at or
  // after the authorizing scene", which compares neither the feature nor the states. Publishing a
  // broken window therefore established a scorched staircase as remembered history, and a second
  // change to the SAME feature was credited by the first.
  //
  // So a change is identified by what it actually is: the feature, the prior condition and the new
  // one. Computed here once and used by the obligation, the delivery record and the history check,
  // so the three cannot disagree. It is an identity, not a judgment — it says which transition a
  // record is about, never whether the transition is true or well written.
  function epTransitionId(featureId, from, to) {
    var f = normalise(String(featureId == null ? '' : featureId));
    var a2 = normalise(String(from == null ? '' : from));
    var b2 = normalise(String(to == null ? '' : to));
    if (!f && !a2 && !b2) return null;
    return f + ' ‖ ' + a2 + ' → ' + b2;
  }

  function epDeliveryRecord(opts) {
    opts = opts || {};
    var passage = normalise(opts.publishedPassage);
    var reader = String(opts.reader || '');
    var present = !!(passage && quotePresent(passage, reader));
    return {
      locationKey: opts.locationKey || null,
      featureId: opts.featureId || null,
      // WHICH transition this record is evidence for. Null for every kind except change, where it
      // is the only thing that makes the credit specific.
      transitionId: (opts.transitionId != null) ? String(opts.transitionId) : null,
      // WHICH AUTHORIZED OCCURRENCE this passage is evidence for. A transition's content can
      // repeat across a story; an authorization cannot.
      authorizationId: (opts.authorizationId != null) ? String(opts.authorizationId) : null,
      kind: opts.kind || null,                       // introduction | recognition | change | resignification
      verification: present ? CP_DELIVERY.EDITOR_REVIEWED : CP_DELIVERY.DIRECTED,
      publishedPassage: present ? passage : null,
      publishedRevision: opts.revisionId || null,
      ordinal: (opts.sceneOrdinal != null) ? opts.sceneOrdinal : null,
      issue: (opts.issue != null) ? opts.issue : null,
      semanticallyVerified: false,
      basis: present
        ? 'the editor answered and the passage is present in the published text'
        : 'the passage the editor claimed is NOT in the published text — nothing is credited',
      at: Date.now()
    };
  }

  // ESTABLISHED FACT AND VIEWPOINT READING ARE KEPT APART. A character may misread a place; that
  // reading must never become world history. Callers store them in separate arrays and this
  // scheduler passes them through separately — it never promotes one into the other.
  function epMemoryFor(ledger, locationKey) {
    var rows = (Array.isArray(ledger) ? ledger : []).filter(function (r) {
      return r && r.locationKey === locationKey && cpCountsAsDepiction(r); });
    var lastOrdinal = null;
    rows.forEach(function (r) {
      if (r.ordinal != null && (lastOrdinal == null || r.ordinal > lastOrdinal)) lastOrdinal = r.ordinal;
    });
    return {
      delivered: rows.length,
      lastOrdinal: lastOrdinal,
      passages: rows.map(function (r) { return { ordinal: r.ordinal, kind: r.kind,
        passage: r.publishedPassage }; }).filter(function (x) { return !!x.passage; })
    };
  }

  // opts: { ledger, location:{label}, objects:[], sceneOrdinal, issue,
  //         previousLocationKey, continuous, establishedChanges:[{featureId,label,change}],
  //         resignified:[{featureId,label,why}], significant }
  function epCoveragePlan(opts) {
    opts = opts || {};
    var out = { obligations: [], skipped: [], firingRules: EP_FIRING, locationKey: null };
    var ident = epLocationIdentity(opts.location);
    var label = ident.label;
    if (!ident.key || ident.source === 'none') {
      out.skipped.push({ why: 'no location on the stage record — nothing to depict' }); return out;
    }
    var key = ident.key;
    out.locationKey = key;
    out.locationIdentitySource = ident.source;
    var ordinal = (opts.sceneOrdinal != null) ? Number(opts.sceneOrdinal) : null;
    var mem = epMemoryFor(opts.ledger, key);
    out.memory = mem;

    // A PASSING PLACE IS NOT A SETTING. The caller says whether this place carries the scene;
    // `significant: false` means a doorway, and a doorway gets no miniature history.
    if (opts.significant === false) {
      out.skipped.push({ locationKey: key, why: 'not a significant setting for this scene — a '
        + 'passing place needs no introduction' });
      return out;
    }

    var sameAsPrevious = !!(opts.previousLocationKey && opts.previousLocationKey === key);
    // WITHOUT RESOLVED IDENTITY, ONLY A FIRST DEPICTION IS HONEST. A recognition asserts "you
    // have been here before", a change asserts "this is the same place, altered", and a
    // resignification asserts "this same feature now means something else". All three require
    // knowing the place is the same one, which a wording-derived key cannot establish.
    out.identityResolved = ident.resolved === true;
    if (!ident.resolved && mem.delivered) {
      out.skipped.push({ locationKey: key, why: 'location identity is UNRESOLVED ('
        + (ident.unresolvedWhy || 'no established reference') + ') — a prior depiction exists under '
        + 'this wording, but nothing establishes it is the same place, so no recognition, change '
        + 'or resignification is scheduled' });
      return out;
    }

    // ══ AN EMPTY HISTORY IS NOT THE SAME AS NO HISTORY ═══════════════════════════
    // (Roman 2026-10-20.) The ledger handed to this scheduler has already had unresolved rows
    // filtered out, so a place whose introduction was published but whose page cannot currently
    // be consulted arrives looking exactly like a place never depicted — and was handed a second
    // INTRODUCTION. The change branch learned to defer; this branch had not.
    //
    // FOUR STATES ARE KEPT APART, and only the fourth defers:
    //   · no credited depiction at all      → introduction (a genuinely new place)
    //   · a depiction confirmed current      → recognition / change / resignification as before
    //   · a depiction confirmed SUPERSEDED   → also an introduction, and correctly so: the
    //     replacement publication removed it, so the reader has not been shown this place
    //   · a depiction whose publication is UNRESOLVED → DEFER. It is unknown whether the reader
    //     has seen this place, so neither an introduction nor a recognition can be chosen, and
    //     guessing either way writes something false.
    //
    // `unresolvedEvidence` counts rows for THIS place that could not be resolved. It defers only
    // this location's environmental decision — other places, and all Character+ work, are
    // untouched.
    var _unres = Number(opts.unresolvedEvidence || 0);
    if (!mem.delivered && _unres > 0) {
      out.deferred = true;
      out.skipped.push({ locationKey: key, unresolvedEvidence: _unres,
        why: 'this place has ' + _unres + ' credited depiction(s) whose current publication could '
           + 'not be resolved, so the active history is empty WITHOUT establishing that the place '
           + 'is undepicted. Scheduling is DEFERRED: an introduction might duplicate one the '
           + 'reader has already read, and a recognition might refer to prose they have never '
           + 'seen. Nothing is assumed and the rows are preserved.' });
      return out;
    }

    if (!mem.delivered) {
      out.obligations.push({ id: 'eplus:' + key, kind: 'introduction', locationKey: key,
        label: label, objects: (opts.objects || []).slice(0, 8),
        weight: 'distinctive', priorPassages: [],
        // A superseded prior depiction lands here too, which is right: the replacement removed
        // it from what the reader has, so the place is owed a real introduction again.
        why: (Number(opts.supersededEvidence || 0) > 0)
          ? 'this place had a depiction, but the scene carrying it was republished without it, so '
            + 'the reader has not been shown this place'
          : 'this place has no delivered depiction yet' });
    } else if (opts.continuous === true && sameAsPrevious) {
      // CONTINUOUS ACTION IN AN UNCHANGED PLACE: nothing automatic. A change or a resignification
      // below may still fire, because those are events, not re-introductions.
      out.skipped.push({ locationKey: key, why: 'continuous action in the same unchanged place — '
        + 'no automatic re-introduction' });
    } else {
      // ── A RETURN IS A VISIT, NOT A DESCRIPTION COUNT (fixed 2026-10-19) ─────────────────
      // This measured scenes since the last DESCRIPTION, which is the wrong quantity: a place
      // visited every scene without being re-described would accumulate a "gap" and eventually
      // ask for a recognition it had never left. What makes a return is being ELSEWHERE in
      // between, or a meaningful passage of story time. `visits` (actual scene visits to this
      // place) is used when supplied; `storyTimeGap` lets a story say "weeks later" even when the
      // previous scene was here.
      var visits = Array.isArray(opts.visits) ? opts.visits : null;
      var elsewhereBetween = null;
      if (visits) {
        var lastHere = null;
        visits.forEach(function (v) {
          if (!v || v.locationKey !== key) return;
          if (v.ordinal != null && (lastHere == null || v.ordinal > lastHere)) lastHere = v.ordinal;
        });
        elsewhereBetween = (lastHere != null && ordinal != null)
          ? visits.some(function (v) { return v && v.locationKey !== key
              && v.ordinal != null && v.ordinal > lastHere && v.ordinal < ordinal; })
          : null;
      }
      var describedGap = (ordinal != null && mem.lastOrdinal != null) ? (ordinal - mem.lastOrdinal) : null;
      var timeGap = opts.storyTimeGap === true;
      var returned = (elsewhereBetween === true) || timeGap
        || (elsewhereBetween === null && !sameAsPrevious);
      if (returned) {
        out.obligations.push({ id: 'eplus:' + key + ':return', kind: 'recognition', locationKey: key,
          label: label, weight: 'concise', priorPassages: mem.passages.slice(-2),
          scenesSinceLastDepicted: describedGap,
          basis: (elsewhereBetween === true) ? 'intervening scenes elsewhere'
            : (timeGap ? 'a meaningful story-time gap' : 'arrived from another place'),
          why: 'returned to a place the reader has been shown' });
      } else {
        out.skipped.push({ locationKey: key, why: 'still here and nothing has changed' });
      }
    }

    // ESTABLISHED CHANGES — supplied, never solicited. The obligation carries the change itself so
    // the editor describes a difference it was given rather than inventing one.
    (opts.establishedChanges || []).forEach(function (ch) {
      if (!ch || !ch.change) return;
      // ══ AN UNRESOLVED DELIVERY STATE DEFERS THE DECISION ════════════════════════
      // (Roman 2026-10-20.) When publication cannot be consulted — no pages loaded for this
      // story, a ledger read outside the rendered app, a lookup that threw — it is unknown
      // whether this change has already been delivered. Emitting the obligation anyway would
      // treat "cannot verify" as a proven omission and ask the editor to write a change that may
      // already be on the page; suppressing it silently would do the opposite. So it is recorded
      // as deferred and decided when publication is available.
      if (ch.deferred === true || ch.deliveryEvidence === 'unresolved') {
        out.skipped.push({ locationKey: key, featureId: ch.featureId || null,
          why: 'the delivery state of this change is UNRESOLVED (publication could not be '
             + 'consulted), so the obligation is DEFERRED rather than decided — it is neither '
             + 'treated as already delivered nor as a proven omission' });
        return;
      }
      var _tid = epTransitionId(ch.featureId, ch.priorCondition, ch.change);
      out.obligations.push({ id: 'eplus:' + key + ':change:' + (ch.featureId || 'x'),
        kind: 'change', locationKey: key, featureId: ch.featureId || null,
        // Travels to the editor result, the published passage and the delivery record, so credit
        // lands on THIS transition and on no other.
        transitionId: _tid,
        authorizationId: ch.authorizationId || null,
        authorizedInScene: (ch.authorizedInScene != null) ? String(ch.authorizedInScene) : null,
        label: ch.label || label, establishedChange: String(ch.change),
        priorCondition: ch.priorCondition || null,
        weight: 'the relevant difference only', priorPassages: mem.passages.slice(-2),
        // ══ AUTHORIZED TO HAPPEN NOW vs ALREADY REMEMBERED ════════════════════════
        // (Roman 2026-10-20.) A change is authorized when its stage is accepted, which happens
        // BEFORE the scene is written. If the obligation reads the same either way, an authorized
        // but undelivered change becomes remembered history: the editor is told the staircase
        // "has changed" when no published prose ever changed it, and the reader is handed a past
        // that never occurred. So the instruction differs by delivery state, and an undelivered
        // change is explicitly an event to render NOW, never a memory to refer back to.
        delivered: ch.delivered === true,
        why: (ch.delivered === true)
          ? 'an established change to a place the reader already knows'
          : 'a change AUTHORIZED for this scene, not yet delivered in any published prose',
        guard: (ch.delivered === true)
          ? ('DESCRIBE THE SUPPLIED CHANGE, against the SUPPLIED prior condition. Both states '
             + 'are given; do not invent damage, history or any other difference, and do not '
             + 're-survey the room.')
          : ('THIS CHANGE HAS NOT HAPPENED IN ANY PUBLISHED PROSE YET. Render it as something '
             + 'that occurs or becomes apparent IN THIS SCENE, against the SUPPLIED prior '
             + 'condition. Do NOT write it as already known, already remembered, or as having '
             + 'happened earlier — there is no earlier. Do not invent damage, history or any '
             + 'other difference beyond the supplied one, and do not re-survey the room.') });
    });

    // RESIGNIFICATION — the place is the same; what it means has moved.
    (opts.resignified || []).forEach(function (rs) {
      if (!rs || !rs.featureId) return;
      out.obligations.push({ id: 'eplus:' + key + ':means:' + rs.featureId,
        kind: 'resignification', locationKey: key, featureId: rs.featureId,
        label: rs.label || label, newSignificance: String(rs.why || ''),
        weight: 'a new reading, no new facts', priorPassages: mem.passages.slice(-2),
        why: 'an established feature is newly meaningful',
        guard: 'NO NEW FACTS ABOUT IT. The feature is unchanged; only its meaning has moved.' });
    });
    return out;
  }

  function cpEditorDue(opts) {
    opts = opts || {};
    var plan = opts.plan || { obligations: [] };
    var onStage = {};
    (opts.onStage || []).forEach(function (p) {
      if (p && p.label) onStage[String(p.label).toLowerCase()] = p; });
    var skRows = (opts.skeleton && Array.isArray(opts.skeleton.character_plus))
      ? opts.skeleton.character_plus : [];
    var liName = String(opts.liName || '').trim().toLowerCase();
    var attempts = Array.isArray(opts.attempts) ? opts.attempts : [];
    var ordinal = (typeof opts.sceneOrdinal === 'number') ? opts.sceneOrdinal : null;
    var issue = opts.issue != null ? opts.issue : null;
    var ledger = Array.isArray(opts.ledger) ? opts.ledger : [];

    var due = [], deferred = [];
    (plan.obligations || []).forEach(function (o) {
      var key = String(o.label || '').toLowerCase();
      // ON STAGE IS A PRECONDITION, NOT A PREFERENCE. An absent character cannot be depicted,
      // and asking for it invites the model to invent a presence the scene does not have.
      if (!onStage[key]) {
        return deferred.push({ label: o.label, why: 'not on stage in this scene' });
      }
      if (o.kind === 'introduction' && o.eligibleThisScene === false) {
        return deferred.push({ label: o.label, why: 'introduction retried too recently — '
          + (o.scenesSinceLastAttempt != null ? o.scenesSinceLastAttempt : '?') + ' scene(s) since '
          + 'the last attempt, gap is ' + o.retryGap });
      }
      if (o.kind === 'recurring') {
        // Issue-level cadence: one new depiction, two for a major participant, APPROPRIATELY
        // SPACED. due === 'later_in_issue' means this issue already has one and the next is not
        // owed yet.
        if (o.due !== 'this_issue') {
          // cpCoveragePlan now decides this by SPACING, so the reason it gives is the real one
          // rather than "satisfied for now" on an obligation that was still owed.
          return deferred.push({ label: o.label, why: 'not spaced yet — '
            + o.deliveredThisIssue + ' of ' + o.wanted + ' delivered this issue, '
            + (o.scenesSinceLastDelivered != null ? o.scenesSinceLastDelivered : '?')
            + ' scene(s) since the last delivered one (gap is '
            + (o.recurGap != null ? o.recurGap : CP_RECUR_GAP) + ')' });
        }
        var lastTry = null;
        attempts.forEach(function (m) {
          if (!m || String(m.character || '').toLowerCase() !== key) return;
          if (issue != null && m.issue != null && m.issue !== issue) return;
          if (m.ordinal != null && (lastTry == null || m.ordinal > lastTry)) lastTry = m.ordinal;
        });
        if (lastTry != null && ordinal != null && (ordinal - lastTry) < CP_RECUR_GAP) {
          return deferred.push({ label: o.label, why: 'a depiction was attempted ' + (ordinal - lastTry)
            + ' scene(s) ago; recurring depictions are spaced by ' + CP_RECUR_GAP });
        }
      }
      var row = skRows.filter(function (r) {
        return r && String(r.character || '').toLowerCase() === key; })[0] || null;
      var isLI = !!(o.isLI || (row && row.isLI) || (liName && key === liName));
      // THE LI'S FIRST DEPICTION REQUIRES EXTERNAL SOCIAL PROOF, and "first" means nothing
      // verified exists yet — which is exactly what makes the scheduler call it an introduction.
      var requiresSocialProof = isLI && o.kind === 'introduction';
      // PRIOR DEPICTIONS TRAVEL WITH THEIR ACTUAL PUBLISHED PASSAGE, and include the editor's own
      // operational records — otherwise an echo or a broadening is asked for with no knowledge of
      // the first impression it is supposed to return to.
      var prior = ledger.filter(function (m) {
        return cpCountsAsDepiction(m)
          && String(m.character || '').toLowerCase() === key; })
        .slice(-3)
        .map(function (m) { return { scene: m.ordinal != null ? m.ordinal : null,
          issue: m.issue != null ? m.issue : null, facet: m.facet_id || null,
          mode: m.mode || null, relation: m.relation || null,
          visibleAction: m.visibleAction || null,
          publishedPassage: m.publishedPassage || null,
          // THE TIER IS CARRIED, so nothing downstream mistakes an operational record for a
          // quality finding.
          establishedBy: m.verification === CP_DELIVERY.VERIFIED
            ? 'a judge checked the published text'
            : 'the dedicated editor answered and the passage shipped (NOT quality-checked)' }; });
      // ── PC-OPENING FUSION IS ONE COMBINED OBLIGATION ──────────────────────────────────────
      // Her Character+ is satisfied THROUGH Environment+. Scheduling a standalone PC depiction
      // alongside it would create exactly the competition pc_opening_fusion exists to prevent:
      // two edits for one moment, and a redundant depiction when the Fusion already lands.
      // THE PC HAS NO character_plus ROW BY DESIGN — the request forbids one and her Character+
      // lives in pc_opening_fusion. Reading `row` for her therefore finds nothing, which is why
      // the fusion is detected from the SKELETON's own fusion record, matched by name.
      var pof = (opts.skeleton && opts.skeleton.pc_opening_fusion) || null;
      var isFusion = !!(row && (row._fromFusion === true || row.fromFusion === true))
        || !!(pof && String(pof.character || '').toLowerCase() === key);
      due.push({
        id: 'cplus:' + key.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        character: o.label,
        kind: isFusion ? 'fusion' : o.kind,
        requiresFusion: isFusion || undefined,
        // The environmental anchor the fusion is meant to develop, where the plan named one.
        fusionThrough: isFusion
          ? ((row && (row._fusionThrough || row.fusionThrough))
             || (pof && (pof.through || pof.environment_target)) || null) : undefined,
        // Her angle and beat as the plan stated them — source material, not a perception.
        fusionAngle: isFusion ? ((pof && pof.character_angle) || null) : undefined,
        fusionBeat: isFusion ? ((pof && pof.beat) || null) : undefined,
        fusionIsCombined: isFusion
          ? 'satisfies the protagonist\'s Character+ THROUGH Environment+ — one obligation, not two'
          : undefined,
        mode: o.mode || null,
        modeWhy: o.modeWhy || null,
        isPC: !!(o.isPC || (row && row.isPC)),
        isLI: isLI,
        requiresSocialProof: requiresSocialProof,
        socialProof: requiresSocialProof ? {
          required: true,
          what: 'another person at this scene responds to him, specifically and in staged '
            + 'behaviour, which the protagonist then reads',
          notSufficient: 'his own stillness, posture, appearance or silence',
          reciprocationRequired: false,
          opportunities: (row && row.social_proof_opportunities) || null
        } : null,
        assignedFacet: (row && (row.facet_truth || null)) || null,
        assignedFacetIsAnOpportunity: !requiresSocialProof,
        facetPressure: (row && row.facet_pressure) || null,
        assignedBehavior: (row && row.behavior) || null,
        viewpoint: (row && row.pc_viewpoint_context) || null,
        disclosure: (row && row.disclosure) || ((row && row.sealed) ? { sealed: true } : null),
        priorDepictions: prior,
        unresolvedNote: o.unresolvedNote || null,
        appearanceEvidenced: o.appearanceEvidenced === true,
        why: o.why || null,
        // ORIGINAL when this scene's own author request carried the assignment; RETROSPECTIVE
        // when the scheduler is asking for something the author never received. A gap under a
        // retrospective obligation is an opportunity, never evidence the author disobeyed.
        provenance: row ? 'ORIGINAL' : 'RETROSPECTIVE'
      });
    });
    // Introductions first, then the LI, then recurring — the order in which a missing depiction
    // costs the reader most.
    due.sort(function (a, b) {
      var rank = function (o) {
        if (o.requiresSocialProof) return 0;
        if (o.kind === 'introduction' || o.kind === 'fusion') return 1;
        return 2; };
      return rank(a) - rank(b);
    });
    // ── INTRODUCTIONS ARE NEVER DROPPED; RECURRING WORK CAN WAIT ───────────────────────────────
    // A FUSION OBLIGATION KEEPS THE SAME STANDING AS AN INTRODUCTION: it must remain visible
    // even when every ordinary NPC Character+ is already satisfied, because nothing else in the
    // scene can satisfy it.
    var intros = due.filter(function (o) {
      return o.kind === 'introduction' || o.kind === 'fusion'; });
    var recurring = due.filter(function (o) {
      return o.kind !== 'introduction' && o.kind !== 'fusion'; });
    var carried = intros.slice();
    // Recurring depictions fill whatever room is left, and the rest are genuinely still owed —
    // the issue cadence already says they need not land in THIS scene.
    recurring.forEach(function (o) {
      if (carried.length < CP_EDITOR_SOFT_DUE) return carried.push(o);
      deferred.push({ label: o.character, kind: o.kind,
        why: 'the scene already covers ' + carried.length + ' obligation(s); this recurring '
          + 'depiction is owed within the issue, not within this scene — still owed, offered again' });
    });
    // A CAPACITY REFUSAL IS LOUD. If even the introductions cannot be sized into one request, the
    // pass refuses and names everyone, rather than covering some and saying nothing.
    var capacity = null;
    if (carried.length > CP_EDITOR_HARD_DUE) {
      capacity = { code: 'capacity_exceeded', due: carried.length, limit: CP_EDITOR_HARD_DUE,
        notCovered: carried.map(function (o) { return o.character; }),
        why: carried.length + ' obligations (' + intros.length + ' of them introductions) cannot '
          + 'be sized into one request within the approved output budget. NOBODY was covered; '
          + 'this is reported, not silently narrowed.' };
    }
    return { due: carried, deferred: deferred, introductions: intros.length,
      capacity: capacity, overflow: deferred.length };
  }

  // THE EDITOR CHOOSES WHERE. Every prose paragraph of this revision is in scope; the editor
  // selects the refs. A name match is not evidence of suitability, and no channel is privileged:
  // first-person narration, dialogue, another person's observation, memory, contrast and absence
  // are all legitimate places for a depiction to live.
  //
  // PROTECTION IS CONTENT-BASED, NOT LOCATION-BASED. Pinning editable locations was how the
  // frozen experiment worked, and it both mis-placed a depiction and ruled out dialogue. Here the
  // scope is the whole scene and the invariant is that protected passages survive verbatim — so
  // a paragraph holding one may still be edited, as long as the protected words come through.
  // THIRD PARAMETER IS OPT-IN AND DEFAULT-OFF. Omitted — which is every production caller —
  // the result is byte-identical to before: every prose paragraph is editable. Supplied, the
  // scope is narrowed to those refs, and BOTH `refs` and `byRef` are narrowed: the validator
  // tests `scope.byRef[ref]`, so filtering only the refs array would advertise a boundary it
  // then failed to enforce. A diagnostic that needs a smaller editable region uses this; no
  // production editing policy changes, because no production caller passes it.
  function cpEditorScope(paragraphs, protectedPassages, editableRefs) {
    var prose = (paragraphs || []).filter(function (p) { return p.isProse; });
    var prot = (protectedPassages || []).filter(function (q) { return q && String(q).trim(); });
    if (Array.isArray(editableRefs) && editableRefs.length) {
      var allow = {};
      editableRefs.forEach(function (r) { allow[String(r)] = 1; });
      prose = prose.filter(function (p) { return allow[String(p.ref)]; });
    }
    return {
      refs: prose.map(function (p) { return p.ref; }),
      byRef: prose.reduce(function (m, p) { m[p.ref] = p; return m; }, {}),
      protectedByRef: prose.reduce(function (m, p) {
        var hits = prot.filter(function (q) { return quotePresent(q, p.text); });
        if (hits.length) m[p.ref] = hits;
        return m;
      }, {}),
      protectedPassages: prot
    };
  }

  function sceneEditorContract(ids, refs, envIds) {
    return [
      'Return ONLY JSON with BOTH arrays, in this shape:',
      '',
      '{"decisions":[',
      '   {"id":"<obligation id>","decision":"keep","keptPassage":"<copied EXACTLY from the scene>","why":"<one sentence>"},',
      '   {"id":"<obligation id>","decision":"edit","ref":"<the paragraph you chose>","why":"<one sentence>"}',
      ' ],',
      ' "edits":[',
      '   {"ref":"<paragraph ref>","op":"replace","text":"<prose>","forObligations":["<id>"]}',
      ' ]}',
      '',
      'ONE DECISION PER OBLIGATION, for all of these: ' + (ids || []).join(', '),
      '',
      'YOU CHOOSE THE PARAGRAPH. Any of these may be edited: ' + (refs || []).join(' '),
      'op is "replace" for an existing paragraph, or "insert_after" to add one following that ref.',
      'Pick the paragraph where the depiction genuinely belongs — the moment that affords it.',
      'A paragraph merely MENTIONING the person is not necessarily the right place.',
      '',
      'ONE TEXT PER PARAGRAPH. If two obligations belong in the same paragraph, give that',
      'paragraph a SINGLE replacement serving both and list both under forObligations. Never',
      'return two texts for the same ref — the second would overwrite the first and one',
      'character\'s depiction would be lost.',
      '',
      'A KEEP must quote the scene verbatim, and is available ONLY where existing prose already',
      'satisfies that character\'s own applicable requirement. It is not a way to decline.',
      'FOR A FUSION OBLIGATION a KEEP must cite a passage where the environment is PARTICULAR and',
      'the SAME passage reveals its observer. A pc_opening_fusion field, a physical sensation or',
      'general atmosphere is not proof. If Character+ and Fusion fall in the same paragraph,',
      'return ONE combined replacement naming both obligation ids — never competing edits.',
      'An edit must preserve every protectedPassage verbatim and prefer one sharp sentence.'
    ].concat((envIds && envIds.length) ? [
      '',
      'THE ENVIRONMENTAL OBLIGATIONS (' + envIds.join(', ') + ') ANSWER IN THE SAME TWO ARRAYS.',
      'A KEEP for one of them must quote a passage that already does that environmental job — a '
        + 'place the reader can picture for an introduction, a passage that lands the return for a '
        + 'recognition, the supplied difference for a change. A sentence that merely mentions the '
        + 'place is not proof.',
      'An EDIT for one of them is an ordinary edit: same refs, same op, same protected-passage '
        + 'rules. If one passage serves an environmental obligation AND a character obligation, '
        + 'return ONE text and list BOTH ids under forObligations.'
    ] : []).join('\n');
  }

  // The scene-wide request. The draft itself, stable refs, who is due, the authored material,
  // viewpoint, disclosure limits, prior delivered depictions, protected content, the consolidated
  // doctrine and the curated examples — and nothing repeated twice.
  function buildSceneEditorRequest(opts) {
    opts = opts || {};
    var reader = readerFacing(opts.draft);
    var paras = paragraphsOf(reader);
    // opts.editableRefs is opt-in; absent, this is exactly the previous call.
    var scope = cpEditorScope(paras, opts.protectedPassages, opts.editableRefs);
    var dueList = opts.due || [];
    // ── ALLOWED IDS COVER EVERY OBLIGATION IN THIS PASS (fixed 2026-10-19) ─────────────────
    // These came only from the Character+ list while environmental obligations were supplied
    // separately, so an answer naming an E+ id was rejected as `unknown_obligation` and an
    // environmental-only scene could not receive a single valid edit. One pass means one id space.
    var envDueIds = (Array.isArray(opts.environmentDue) ? opts.environmentDue : [])
      .map(function (o) { return o && o.id; }).filter(Boolean);
    var cpIds = dueList.map(function (o) { return o.id; });
    var ids = cpIds.concat(envDueIds);
    var doctrine = opts.doctrine || null;
    // ══ APPEARANCE CONTINUITY REACHES THE EDITOR (Roman 2026-10-21) ═══════════════════
    // THE GAP: the repair editor and the selector received NO appearance values at all, so they
    // worked with less authority than the author on exactly the thing they are asked to judge.
    // The PC / LI / antagonist bibles already hold these facts and already render through
    // _apprFactLine; nothing about them was blocked by supporting-character extraction.
    //
    // CONTINUITY, NOT A DEMAND TO DESCRIBE. The wording is the same discipline the author's lock
    // block uses: receiving a hair colour is not an instruction to mention hair.
    var _apprLines = [];
    (Array.isArray(opts.appearance) ? opts.appearance : []).forEach(function (a) {
      if (!a || !a.name || !a.facts) return;
      _apprLines.push('  ' + a.name + (a.role ? ' (' + a.role + ')' : '') + ': ' + a.facts);
      // ══ RESTRICTIONS MUST REACH THE REQUEST, NOT JUST THE ROW ════════════════════════
      // (Roman 2026-10-21.) This rendered name/role/facts only, so a disclosure restriction
      // supplied alongside the facts was silently dropped on its way into the prompt - the
      // editor was handed someone's appearance with the rule about what may not be said about
      // them removed. The SCOPE travels with each one; a restriction without its window is a
      // different rule.
      (Array.isArray(a.restrictions) ? a.restrictions : []).forEach(function (r) {
        if (!r || !r.forbid) return;
        // ══ THE CONDITIONS TRAVEL, NOT JUST THE PROHIBITION (Roman 2026-10-21) ═════════
        // This emitted forbid + why only, so a restriction carrying scene bounds or a facet
        // scope arrived as an UNCONDITIONAL ban. A conditional prohibition rendered without its
        // condition is a different rule, and the stricter one.
        var _sc = [];
        if (r.fromScene != null) _sc.push('from scene ' + r.fromScene);
        if (r.untilScene != null) _sc.push('until scene ' + r.untilScene);
        if (r.forbidUntilScene != null) _sc.push('applies only BEFORE scene ' + r.forbidUntilScene);
        if (r.appliesToFacets && r.appliesToFacets.length) {
          _sc.push('applies ONLY to these facets: ' + [].concat(r.appliesToFacets).join(', '));
        }
        if (r.facets && r.facets.length) _sc.push('facet scope: ' + [].concat(r.facets).join(', '));
        if (r.scope) _sc.push('scope: ' + r.scope);
        _apprLines.push('      RESTRICTION on ' + a.name + ' \u2014 MUST NOT be written: ' + r.forbid
          // ══ MISSING STRUCTURED BOUNDS ARE NOT "UNCONDITIONAL" (Roman 2026-10-21) ═══
          // THE CONTRADICTION: this inferred "unconditional - no scene or facet bounds are
          // recorded" whenever the structured fields were absent, and printed it directly
          // above a `why` that says "before Scene 8". A CONDITION WRITTEN IN PROSE IS STILL A
          // CONDITION; missing metadata does not erase it. The inference is removed. Where
          // structured bounds exist they are given; where they do not, the note says the
          // STRUCTURED FORM is unavailable and the prose governs - it never asserts there is
          // no limit.
          + (_sc.length ? '\n        SCOPE (the prohibition applies ONLY within it): ' + _sc.join(' \u00b7 ')
             : '\n        SCOPE: no structured bounds are recorded for this entry. ANY LIMIT STATED '
               + 'IN THE REASON BELOW STILL APPLIES \u2014 do not treat this as unconditional.')
          + (r.why ? '\n        why (read it for conditions): ' + r.why : ''));
      });
    });
    var examples = opts.examples || null;

    var sys = [
      'You are the dedicated Character+ editor for an ongoing illustrated story. One scene, '
        + (dueList.length === 1 ? 'one person' : dueList.length + ' people') + ' due a depiction, '
        + 'ONE reply.',
      '',
      'FOR EACH PERSON: either KEEP existing prose that already delivers a meaningful depiction of '
        + 'them — quoting it exactly — or make ONE targeted local change in the paragraph you '
        + 'judge right. Where the scene already does the work, keep it.',
      '',
      'KEEP IS AVAILABLE ONLY WHERE AN EXISTING PASSAGE SATISFIES THAT PERSON\'S OWN APPLICABLE '
        + 'REQUIREMENT. All KEEPs is a legitimate answer only if every requirement is already met. '
        + 'In particular: a general depiction of the love interest — however good — CANNOT '
        + 'substitute for his specifically required external social proof.',
      '',
      'MEANINGFUL CHARACTER+ AND A PARTICULAR FACET ARE DIFFERENT ACHIEVEMENTS. Preserve '
        + 'successful characterization EVEN WHERE IT EXPRESSES A DIFFERENT GROUNDED FACET from the '
        + 'one suggested. A suggested facet is an opportunity; replacing prose that already lands '
        + 'in order to satisfy it is a failure, not a fix.',
      '',
      'WHAT YOU MAY WRITE: the protagonist\'s reading of what she sees — defeasible, hers, '
        + 'possibly wrong — and you need not explain it afterwards. Also SMALL DELIBERATE ACTIONS '
        + 'that fit what this scene already shows: someone choosing to glance at him before '
        + 'glancing at the board is an action, it is intentional, and it is perfectly good '
        + 'Character+.',
      '',
      'WHAT YOU MAY NOT INVENT: a CONSEQUENTIAL CHOICE the story has not made, a HIDDEN MOTIVE '
        + 'nobody was shown holding, or HISTORY that has not been established. "the signal he '
        + 'withheld" fails — not because it names an action, but because it implies a concealed '
        + 'intention the scene never shows him forming. "the way it never had" fails because it '
        + 'asserts a past the story has not established.',
      '',
      'ASK THREE THINGS OF YOUR OWN SENTENCE: is it GROUNDED in what this scene and the supplied '
        + 'facts actually show; does it REVEAL something about this person; and does it leave the '
        + 'scene INTACT — the plot, the choices, and whatever was already working. A sentence that '
        + 'passes all three is right whatever words it happens to use.',
      '',
      'YOU MAY NOT CHANGE: plot outcomes, the reader\'s decisions, the causal sequence, sealed '
        + 'disclosures, or established history — and you may not invent any of those to '
        + 'manufacture characterization. Every passage under protectedPassages must appear '
        + 'VERBATIM in anything you return; an edit that drops one is rejected in full. If the '
        + 'scene contains an unresolved tension or an instruction it did not follow, leave it '
        + 'alone: resolving it is not your job.',
      '',
      'NO NEW CAST. Where a depiction needs another person to react, use someone already present.'
    ];
    // ── FUSION, ONLY WHEN ONE IS DUE ────────────────────────────────────────────────────────
    // THE FLAG IS READ WHEREVER IT IS DECLARED. This filtered the Character+ list ALONE, so an
    // environmental obligation carrying requiresFusion got the selection aid and none of the
    // teaching: no definition, no relationship method, no ownership guidance, no demonstration.
    // The request then asked for environmental work rather than for environmental work that
    // reveals a named person — and nothing said so, because the flag was simply not read.
    //
    // THIS IS THE SAME BUG AND THE SAME FIX AS THE ID SPACE FIFTY LINES ABOVE: one pass means one
    // obligation space. A flag an obligation declares is read whether it is character-side or
    // environment-side.
    //
    // ORDINARY E+ IS UNAFFECTED. The flag is opt-in per obligation, so an environmental
    // obligation that does not declare it still gets the selection aid and no Fusion teaching.
    var envDueRaw = Array.isArray(opts.environmentDue) ? opts.environmentDue : [];
    var fusionDue = dueList.concat(envDueRaw)
      .filter(function (o) { return o && o.requiresFusion; });
    var fusionIsEnvOnly = fusionDue.length > 0
      && !dueList.some(function (o) { return o && o.requiresFusion; });
    // opts.reflectiveScaffold is opt-in; absent, this is exactly the previous call.
    if (fusionDue.length) sys.push('', CP_FUSION.editorBlock(
      { reflectiveScaffold: !!opts.reflectiveScaffold }));
    // THE SELECTION AID APPLIES TO ANY ENVIRONMENTAL WORK, not only Fusion: it answers "which
    // feature", which an environmental obligation asks just as much. Emitted here when
    // environmental work is due without a Fusion (the Fusion block already carries it).
    if (!fusionDue.length && envDueIds.length) {
      sys.push('', opts.reflectiveScaffold
        ? CP_FUSION.reflectiveScaffold
        : CP_FUSION.scenePressure + '\n' + CP_FUSION.scenePressureBoundaries);
    }
    // THE SOCIAL-WEIGHT ALGORITHM TRAVELS WITH THE REQUIREMENT. It is emitted only when a
    // social-proof obligation is actually due, so a scene without one is not taught it.
    if (dueList.some(function (o) { return o.requiresSocialProof; })) {
      sys.push('', CP_SOCIAL_WEIGHT.block());
    }
    // ── ENVIRONMENTAL WORK, IN THE SAME PASS ────────────────────────────────────────────────
    // One editor call carries C+, E+ and Fusion. There is no separate environmental call: the
    // editor sees the whole draft once and decides where each obligation belongs in it.
    var envDue = envDueRaw;
    if (envDue.length) {
      var _envKinds = envDue.map(function (o) { return o.kind; });
      sys.push('', [
        'ENVIRONMENTAL WORK IS DUE IN THIS SCENE (' + _envKinds.join(', ') + ').',
        '',
        'AN INTRODUCTION is for a place the reader has not been shown: make it DISTINCTIVE enough '
          + 'that they could recognise it again. A major room or setting earns that; a passing '
          + 'doorway does not and is not on this list.',
        'A RECOGNITION is a RETURN: concise, a line or two that lands "we have been here", never a '
          + 'second introduction. The passages already published for this place are supplied — use '
          + 'them to avoid repeating yourself, not to repeat them.',
        'A CHANGE describes THE SUPPLIED DIFFERENCE against the remembered setting, and nothing '
          + 'else. Do NOT invent damage, history, or any further change, and do not re-survey a '
          + 'room the reader already knows.',
        'A RESIGNIFICATION gives an established feature a NEW READING because of what has happened '
          + 'or what she now understands. The feature itself is unchanged: no new facts about it.',
        '',
        'ESTABLISHED FACT AND HER READING OF IT ARE DIFFERENT THINGS. She may misread a place. Her '
          + 'interpretation is hers and stays defeasible — it does not become world history, and '
          + 'you may not state it as one.',
        'NO INVENTED HISTORY. A place may only carry a past the story has established.',
        '',
        'NEWLY KNOWN IS NOT NEWLY CHANGED. `environmentMemory.newlyKnown` holds facts recorded for '
          + 'this place for the first time. That may mean the story has only now described them, '
          + 'or only now revealed them — it does NOT mean the place changed, and there is no prior '
          + 'condition to contrast against. Use them as context you may now draw on. Do not write '
          + '"it had not been there before", "newly", "no longer" or any other before/after about '
          + 'them. A CHANGE obligation is the only thing that licenses a contrast, and it arrives '
          + 'with both states supplied.'
      ].join('\n'));
    }
    // THE PROTAGONIST'S OWN CHANNELS, only when she is actually due.
    var pcDue = dueList.filter(function (o) { return o.isPC; });
    if (pcDue.length) {
      sys.push('', CP_PC.channels + (fusionDue.length ? ' ' + CP_PC.withFusion : ''));
    }
    // ── FUSION BEYOND THE OPENING: PREFER ONE PASSAGE, NEVER FORCE IT ───────────────────────
    // When environmental work and the protagonist's own depiction are both owed, one passage that
    // does both is the better answer — that is what Fusion IS, and it is available in any scene,
    // not just the opening. But forcing the combination where it weakens either is worse than two
    // passages: E+ may stand alone, and a brief return callback owes no psychological discovery.
    if (envDue.length && pcDue.length) {
      sys.push('', [
        'BOTH ENVIRONMENTAL WORK AND THE PROTAGONIST\'S OWN DEPICTION ARE DUE.',
        'PREFER ONE PASSAGE THAT DOES BOTH — ' + CP_FUSION.criterion + ' That is Fusion, and it is '
          + 'available in any scene, not only an opening.',
        'DO NOT FORCE IT. If combining them would weaken either, write them separately: '
          + 'environmental work may stand alone, and a brief recognition callback does not owe a '
          + 'new psychological truth.',
        'IF YOU DO COMBINE THEM, say in `why` how the one passage addresses EACH obligation, and '
          + 'list BOTH ids under forObligations. One combined passage earns credit for both only '
          + 'when you identify how it serves each and the passage survives publication — a '
          + '"Fusion" label on its own proves neither.',
        CP_FUSION.focus
      ].join('\n'));
    }
    if (doctrine) sys.push('', doctrine);
    if (_apprLines.length) {
      sys.push('', 'APPEARANCE ALREADY ESTABLISHED FOR THESE PEOPLE \u2014 SUPPLIED FOR CONSISTENCY, '
        + 'NOT AS A PROMPT TO DESCRIBE. Receiving these facts is not an instruction to mention '
        + 'them, and an edit that mentions none of them is correct. Use them so that anything you '
        + 'DO write cannot contradict what the reader has already been shown; never re-list them, '
        + 'and never alter them.');
      _apprLines.forEach(function (l) { sys.push(l); });
    }
    if (examples) {
      sys.push('',
        'WORKED TRANSFORMATIONS — these demonstrate the physics. Do not copy their wording, their '
          + 'connective tissue or their sentence shapes; the worlds are unrelated to this story.',
        examples);
    }
    sys.push('', sceneEditorContract(ids, scope.refs, envDueIds));

    var user = JSON.stringify({
      // WHICH SCENE THIS REQUEST IS FOR. The editor pass is async, so anything naming the request
      // from a caller's own mutable per-scene variable can mislabel it: the runner wrote scene 1's
      // editor request as `scene2_...` and a test then read it as a continuation request and
      // concluded the recurring cadence had never engaged. The request states its own scene.
      sceneNumber: (opts.sceneOrdinal != null) ? opts.sceneOrdinal : null,
      scene: paras.filter(function (p) { return p.isProse; })
        .map(function (p) { return { ref: p.ref, text: p.text }; }),
      dueThisScene: ids,
      obligations: dueList,
      editableRefs: scope.refs,
      protectedPassages: scope.protectedPassages,
      protectedByParagraph: scope.protectedByRef,
      roster: opts.roster || [],
      // E+ TRAVELS BESIDE C+, in one request. `priorPassages` are what was actually PUBLISHED for
      // this place, so a return can differ from what the reader already read. `established` and
      // `interpretation` are deliberately separate keys: a viewpoint reading must not arrive
      // looking like world fact.
      // ══ CONTEXT, NOT A FUSION FIELD ═══════════════════════════════════════════
      // I first nested environmentalCanon and scenePressure inside the `fusion` sub-object, which
      // is emitted ONLY when a Fusion obligation is due — so an environmental obligation with no
      // Fusion got neither, and a verification whose obligation lacked requiresFusion saw nothing
      // at all. They are scene context: the canon is the place's established facts, and the
      // pressure guides which feature to choose for ANY environmental work.
      // The viewpoint is whose eyes the whole scene is in — context, like the canon.
      viewpointAndMask: opts.viewpoint || undefined,
      environmentalCanon: opts.environmentalCanon || undefined,
      scenePressure: opts.scenePressure || undefined,
      scenePressureNote: (function () {
        if (!opts.scenePressure) {
          return 'NOT SUPPLIED for this scene. Choose a feature on its revealing potential '
            + 'alone, and do not infer a theme in order to have one to resonate with.';
        }
        var base = 'Supplied. Use it to choose WHICH feature resonates; it does not tell you '
          + 'what any character concludes, and it does not govern every environmental detail.';
        // THE PLANNED-CONTEXT SHAPE IS LABELLED AS SUCH — AND CORRECTLY FOR THIS STAGE.
        // My first wording said "do not narrate the state_change as accomplished", which is
        // wrong here: this pass runs on a FINALIZED DRAFT, and the plan's state_change is
        // frequently already on the page — in the scene-3 draft prepared for the next literary
        // test, "the first shared silence … slips from my mind" IS that state_change, written.
        // Telling the editor not to narrate it as accomplished would have asked it to undo the
        // scene. What is actually true is narrower: these are the PLAN's words, not the
        // reader's knowledge. The draft decides what has happened; the plan does not.
        if (opts.scenePressure.plannedContext) {
          base += ' These are the accepted plan\'s OWN FIELDS for this scene, verbatim — THE '
            + 'PLAN\'S INTENTIONS, NOT A RECORD OF WHAT THE READER HAS BEEN TOLD. The draft is '
            + 'the only account of what has happened: where the draft already carries one of '
            + 'these, treat it as carried and do not restate it; where the draft does not, do '
            + 'NOT add it — your task is environmental, not plot repair. And none of it is '
            + 'prior history the reader already knows.';
        }
        return base;
      })(),
      environmentDue: envDue.length ? envDue : undefined,
      environmentMemory: envDue.length ? (opts.environmentMemory || null) : undefined,
      // ── FUSION MATERIAL: SOURCE FACTS, KEPT SEPARATE FROM HER READING OF THEM ─────────────
      // The canon is what is TRUE of the place. The viewpoint is how this protagonist sees. They
      // are deliberately not merged: merging them would hand the writer a pre-formed perception
      // and defeat the point.
      fusion: fusionDue.length ? {
        obligations: fusionDue.map(function (o) { return o.id; }),
        test: CP_FUSION.criterion,
        // WHAT IS OWED DIFFERS BY WHICH LIST CARRIES THE FUSION. When a Character+ obligation
        // carries it, one passage discharges both and a second depiction would be redundant.
        // When an ENVIRONMENTAL obligation carries it there is no separate Character+ debt at
        // all — "do not also write a separate depiction of her" would have implied one was
        // owed, and crediting her Character+ would credit work never assigned.
        combined: fusionIsEnvOnly
          ? ('ONE obligation, and it is ENVIRONMENTAL. The environmental passage itself must '
            + 'reveal the named person through their relationship to the place. No separate '
            + 'Character+ depiction is owed or credited here, and adding one does not satisfy '
            + 'this: the revealing must happen IN the environmental writing.')
          : ('ONE obligation — her Character+ THROUGH Environment+. Do not also write a '
            + 'separate depiction of her.'),
        // THE PERSON THE ENVIRONMENT MUST REVEAL. `fusionThrough` is the only key read; an
        // obligation that writes `through` instead delivers null — which is how the first
        // prepared diagnostic asked for Fusion while naming nobody.
        environmentalAnchor: fusionDue.map(function (o) {
          return { id: o.id, through: o.fusionThrough || null }; }),
        revealsWhom: fusionDue.map(function (o) { return o.fusionThrough || null })
          .filter(Boolean),

        // THE SCENE'S CENTRAL PRESSURE, SUPPLIED OR ABSENT — NEVER INVENTED HERE. The selection
        // aid above is conditional on this arriving; without it the editor chooses a feature the
        // way it did before, which is the behaviour the aid exists to improve. Declaring the aid
        // without delivering its input is the gap this project keeps rediscovering, so the field
        // is named and its absence is visible rather than silent.

        priorEnvironmentalDepictions: opts.priorEnvironment || null,
        preferDeveloping: 'an environmental passage this scene already contains',
        candidateEnvironmentalPassages: opts.environmentalPassages || null,
        note: 'The canon above is SOURCE FACT. The viewpoint is HOW SHE SEES. Neither is a '
          + 'perception written for you.'
      } : undefined,
      style: CP_STYLE
    }, null, 2);

    return { sys: sys.join('\n'), user: user, paragraphs: paras, reader: reader,
      scope: scope, ids: ids, revisionId: revisionId(reader) };
  }

  // Validates a reply whose refs the MODEL chose. Everything structural is still checked here —
  // letting the model choose the location does not let it choose what is safe.
  function validateSceneEditorReply(raw, ctx) {
    ctx = ctx || {};
    var scope = ctx.scope || { refs: [], byRef: {}, protectedByRef: {}, protectedPassages: [] };
    var ids = ctx.ids || [];
    var reader = String(ctx.reader || '');
    var out = { ok: false, code: null, keeps: [], items: [], rejected: [], unanswered: [] };

    var parsed = raw;
    if (typeof raw === 'string') {
      var t = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      try { parsed = JSON.parse(t); }
      catch (_) { var m = t.match(/\{[\s\S]*\}/); try { parsed = m ? JSON.parse(m[0]) : null; } catch (__) { parsed = null; } }
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.decisions)) {
      out.code = CP_REJECT.MALFORMED; return out;
    }
    var want = {}; ids.forEach(function (i) { want[i] = true; });
    var chose = {};
    parsed.decisions.forEach(function (d) {
      var id = String((d && d.id) || '');
      if (!want[id]) return out.rejected.push({ id: id, code: 'unknown_obligation',
        reason: 'no obligation with id "' + id + '" is due in this scene' });
      if (chose[id]) return out.rejected.push({ id: id, code: 'duplicate_decision' });
      var dec = String((d && d.decision) || '').toLowerCase();
      if (dec === 'keep') {
        var q = normalise(d.keptPassage);
        if (!q) return out.rejected.push({ id: id, code: 'keep_without_passage' });
        if (!quotePresent(q, reader)) {
          return out.rejected.push({ id: id, code: 'kept_passage_not_verbatim', quote: q });
        }
        chose[id] = 'keep';
        out.keeps.push({ id: id, passage: q, why: normalise(d.why) || null });
      } else if (dec === 'edit') {
        chose[id] = 'edit';
      } else {
        out.rejected.push({ id: id, code: 'unknown_decision', got: dec || '(none)' });
      }
    });

    var seen = {};
    (Array.isArray(parsed.edits) ? parsed.edits : []).forEach(function (e) {
      var ref = String((e && e.ref) || '');
      var op = String((e && e.op) || 'replace');
      var text = (e && typeof e.text === 'string') ? e.text : '';
      var tag = ref + ':' + op;
      var forIds = Array.isArray(e && e.forObligations)
        ? e.forObligations.map(String).filter(function (i) { return want[i]; }) : [];
      if (!scope.byRef[ref]) return out.rejected.push({ tag: tag, code: CP_REJECT.UNKNOWN,
        reason: 'ref "' + ref + '" is not an editable prose paragraph of this revision' });
      if (op !== 'replace' && op !== 'insert_after') {
        return out.rejected.push({ tag: tag, code: 'unknown_op', got: op });
      }
      // ONE TEXT PER PARAGRAPH. A second text for the same paragraph is REJECTED, never applied:
      // applying it would overwrite the first and silently lose a character's depiction.
      if (seen[ref]) return out.rejected.push({ tag: tag, code: CP_REJECT.DUPLICATE,
        reason: 'paragraph "' + ref + '" already has a replacement; a shared paragraph takes ONE '
          + 'combined text naming every obligation it serves' });
      if (!text.trim()) return out.rejected.push({ tag: tag, code: CP_REJECT.EMPTY });
      if (/<<[^>]*>>/.test(text)) return out.rejected.push({ tag: tag, code: CP_REJECT.NON_PROSE,
        reason: 'replacement text introduces control markers' });
      if (!forIds.length) return out.rejected.push({ tag: tag, code: 'edit_serves_nothing',
        reason: 'an edit must name at least one due obligation under forObligations' });
      // PROTECTED CONTENT SURVIVES, OR THE EDIT DOES NOT.
      if (op === 'replace') {
        var prot = scope.protectedByRef[ref] || [];
        var lost = prot.filter(function (q) { return !quotePresent(q, text); });
        if (lost.length) return out.rejected.push({ tag: tag, code: CP_REJECT.PROTECTED,
          reason: 'the replacement drops protected content: "' + String(lost[0]).slice(0, 90) + '"' });
      }
      seen[ref] = 1;
      out.items.push({ ref: ref, op: op, text: text, beatId: forIds[0],
        beatIds: forIds.slice(), addressed: forIds.slice(), provesFulfilment: false });
    });

    var covered = {};
    out.items.forEach(function (it) {
      it.beatIds.forEach(function (id) { covered[id] = true; }); });
    Object.keys(want).forEach(function (id) {
      if (!chose[id]) return out.unanswered.push({ id: id, why: 'no decision returned' });
      if (chose[id] === 'edit' && !covered[id]) {
        out.unanswered.push({ id: id, why: 'chose edit but no accepted text covers it' });
      }
    });
    out.ok = (out.keeps.length + out.items.length) > 0;
    return out;
  }

  // ── THE PASS ──────────────────────────────────────────────────────────────────────────────
  // Returns the text to publish and a factual account of what happened. It NEVER throws, never
  // blocks publication, never regenerates, never retries and never falls back to another model.
  // On timeout, malformed output, budget refusal or unusable edits it returns the original draft
  // — with any independently valid edits applied — and records the result as unresolved.
  async function editorPassOnFinalizedDraft(opts) {
    opts = opts || {};
    var reader = readerFacing(opts.draft);
    var base = { ran: false, text: opts.draft, reader: reader, revisionId: revisionId(reader),
      keeps: [], applied: [], rejected: [], unanswered: [], due: [], deferred: [],
      dispatched: false, unresolved: null };

    if (typeof opts.editorFn !== 'function') {
      base.reason = 'no editor is wired'; return base;
    }
    var plan = null;
    try {
      plan = cpEditorDue({
        plan: opts.coveragePlan, onStage: opts.onStage, skeleton: opts.skeleton,
        liName: opts.liName, attempts: opts.attempts, ledger: opts.ledger,
        sceneOrdinal: opts.sceneOrdinal, issue: opts.issue });
    } catch (e) {
      base.reason = 'scheduling failed: ' + ((e && e.message) || e); return base;
    }
    base.due = plan.due; base.deferred = plan.deferred;
    // NOBODY DUE, NO CALL. Not a failure and not recorded as one.
    // SKIP THE EDITOR ONLY WHEN NOTHING AT ALL IS DUE. Environmental work can be owed in a scene
    // that owes no Character+ — a new room with every character's cadence already satisfied — and
    // the pass must still run for it. Checking only `plan.due` would have silently dropped every
    // E+ obligation in exactly that case.
    var _envCount = Array.isArray(opts.environmentDue) ? opts.environmentDue.length : 0;
    if (!plan.due.length && !_envCount) {
      base.reason = 'nothing is due in this scene — no Character+, no Fusion, no environmental work';
      return base;
    }
    // A CAPACITY REFUSAL IS AN EXPLICIT OUTCOME, never a quiet narrowing.
    if (plan.capacity) {
      base.reason = plan.capacity.code;
      base.capacity = plan.capacity;
      base.unresolved = { why: plan.capacity.why,
        obligations: plan.due.map(function (o) { return o.id; }) };
      return base;
    }

    // ══ FORWARD EVERYTHING THE BUILDER READS ═══════════════════════════════════
    // (Roman 2026-10-20.) This hand-copied list forwarded nine of fourteen inputs. The five it
    // dropped — environmentalCanon, viewpoint, scenePressure, environmentalPassages,
    // priorEnvironment — are all read by the builder, which emits each key with `|| null`, so the
    // ORDINARY editor silently received `viewpointAndMask: null` and `environmentalCanon: null`
    // while the combined-request experiment, which calls the builder directly, received real
    // values. Same class of drift as the example-selection limit: a caller-private list that
    // nobody checked against the callee.
    //
    // The list is kept explicit rather than spread, because a spread would forward whatever the
    // caller happened to hold; but it is now checked against the builder's own reads.
    var req = buildSceneEditorRequest({
      draft: reader, due: plan.due, protectedPassages: opts.protectedPassages,
      sceneOrdinal: opts.sceneOrdinal,
      environmentDue: opts.environmentDue, environmentMemory: opts.environmentMemory,
      environmentalCanon: opts.environmentalCanon,
      environmentalPassages: opts.environmentalPassages,
      priorEnvironment: opts.priorEnvironment,
      viewpoint: opts.viewpoint,
      scenePressure: opts.scenePressure,
      editableRefs: opts.editableRefs,
      roster: opts.roster, doctrine: opts.doctrine, examples: opts.examples,
      // APPEARANCE MUST BE ON THIS LIST OR IT NEVER REACHES PRODUCTION. The comment above warns
      // about exactly this: an explicit caller-private forward list that nobody checks against
      // the callee, which is how viewpointAndMask and environmentalCanon were silently null on
      // the ordinary path while a direct caller got real values. Added with the parameter.
      appearance: opts.appearance });
    base.requestRevision = req.revisionId;

    var replyRaw = null, call = null;
    try {
      call = await opts.editorFn({
        sys: req.sys, user: req.user, ids: req.ids, due: plan.due,
        revisionId: req.revisionId, owner: opts.owner || null,
        // SIZED FOR EVERYONE DUE, not for a fixed cap: a decision plus a replacement paragraph
        // per obligation, plus the reply envelope. The server clamps this to its own hard bound,
        // and cpEditorDue refuses above CP_EDITOR_HARD_DUE rather than let it grow unbounded.
        // SIZED FOR EVERY OBLIGATION IN THE PASS. Counting only plan.due starved an
        // environmental-only scene of output budget entirely (900 floor, nothing per obligation).
        maxTokens: Math.max(900, 420 * (plan.due.length + _envCount) + 400) });
      replyRaw = call && (typeof call === 'string' ? call : call.content);
    } catch (e) {
      base.reason = 'the editor call threw: ' + ((e && e.message) || e);
      base.unresolved = { why: base.reason }; return base;
    }
    if (!call || call.dispatched === false) {
      base.reason = (call && call.reason) || 'not dispatched';
      base.refusal = (call && call.refusal) || null;
      return base;                               // no call made: nothing to record, nothing spent
    }
    base.dispatched = true;
    base.usage = call.usage || null;
    base.cost = call.cost || null;
    if (!replyRaw || (call.truncated === true)) {
      base.ran = true;
      base.reason = call.truncated ? 'the reply was truncated at the output limit' : 'empty reply';
      base.unresolved = { why: base.reason, obligations: req.ids };
      return base;                               // ORIGINAL PROSE PUBLISHES. Never a partial JSON.
    }

    var v = validateSceneEditorReply(replyRaw, {
      scope: req.scope, ids: req.ids, reader: req.reader });
    base.ran = true;
    base.keeps = v.keeps; base.rejected = v.rejected; base.unanswered = v.unanswered;
    base.code = v.code || null;

    if (!v.items.length) {
      base.reason = v.keeps.length ? 'every answer was a KEEP — prose unchanged'
        : (v.code || 'no usable edit');
      if (!v.keeps.length) base.unresolved = { why: base.reason, obligations: req.ids };
      return base;
    }

    // APPLY THE VALID ONES. Rejected regions are left exactly as written.
    var spl = spliceAuthorized(req.reader, req.paragraphs, v.items);
    var bytes = unaffectedBytesPreserved(req.reader, spl.text, spl.applied);
    var lost = (req.scope.protectedPassages || []).filter(function (q) {
      return !quotePresent(q, spl.text); });
    if (!bytes.ok || lost.length) {
      // A structural failure discards the SPLICE, not the scene. The original publishes.
      base.reason = lost.length
        ? ('the spliced text lost protected content: "' + String(lost[0]).slice(0, 90) + '"')
        : 'the splice did not preserve unaffected prose';
      base.unresolved = { why: base.reason, obligations: req.ids };
      base.structuralFailure = true;
      return base;
    }
    base.text = spl.text;
    base.applied = spl.applied;
    base.appliedFor = v.items.map(function (it) {
      return { ref: it.ref, op: it.op, obligations: it.beatIds.slice() }; });
    base.publishedRevision = revisionId(readerFacing(spl.text));
    base.reason = 'applied ' + v.items.length + ' edit(s), kept ' + v.keeps.length;
    if (v.unanswered.length) {
      base.unresolved = { why: 'some obligations were not answered',
        obligations: v.unanswered.map(function (u) { return u.id; }) };
    }
    return base;
  }

  // ── THE CURATED EXAMPLES, NOW WHERE PRODUCTION CAN REACH THEM ────────────────────────────
  // These were prepared in a Node-only harness file, which meant the browser — the only place
  // the real editor runs — could not see them. Moved here so there is ONE copy; the harness
  // re-exports these rather than keeping a second set that can drift.
  //
  // THREE RULES THIS BANK OBEYS, because the project has paid for each of them:
  //  1. A FEW PER REQUEST, never the whole bank — a long list of specimens is a menu to copy.
  //  2. EVERY ENTRY IS A FIXTURE, NEVER CANON, in a world unrelated to any live story. Examples
  //     drawn from the live story contaminate every other story.
  //  3. THE MECHANISM IS SHARED; THE MATERIAL IS NOT. An example that shares its answer with the
  //     scene teaches the answer rather than the technique.
  // ══ SOCIAL WEIGHT — THE ALGORITHM AND ITS ROUTES (Roman 2026-10-20) ════════════════
  // Roman's design. The requirement used to say "a staged response by another person", which a
  // bare glance satisfies — and a glance establishes ATTENTION, not that the social world already
  // assigns this person unusual weight. Three routes carry that weight; one person noticing does
  // not.
  var CP_SOCIAL_WEIGHT = {
    scope: 'THIS IS HOW TO FULFIL A SOCIAL-PROOF ASSIGNMENT WHEN ONE APPLIES. It is craft '
      + 'guidance, not a quota: no scene owes a fresh display of anyone’s standing, and a scene '
      + 'with no such assignment owes nothing here. Where an assignment does apply, the routes '
      + 'below are how to meet it.',
    algorithm: 'SOCIAL WEIGHT, IN THREE STEPS: establish the normal social order → show how this '
      + 'person alters it → make the alteration specific enough to imply why they matter. Choose '
      + 'the social world first (a courtroom, a village, a research group, a nightclub and a royal '
      + 'household each recognise a different kind of importance); identify who normally commands '
      + 'attention there, or whose response carries weight; then choose how this person’s '
      + 'significance becomes visible — deference, anticipation, desire, disruption, imitation, '
      + 'resentment, dependence or institutional recognition.',
    routes: 'THREE ROUTES, ANY ONE OF WHICH IS ENOUGH. (1) DISPLACED AUTHORITY: the person '
      + 'everyone would normally look to instead looks to them. An unexpected shift in where the '
      + 'room’s attention settles is enough on its own — a sacrifice or a changed decision is one '
      + 'way to show it, never a condition of it. '
      + '(2) COLLECTIVE ORIENTATION: several people independently adjust around them — watching '
      + 'for a reaction, preparing for an arrival, reacting to the name. (3) DISTRIBUTED '
      + 'REPUTATION: their significance exists beyond this encounter, in conversation, '
      + 'institutions, media, documents or customary comparison. These are alternatives, not three '
      + 'boxes to tick.',
    sufficiency: 'WHAT IS NOT ENOUGH: an ordinary individual’s unexplained glance. It shows '
      + 'attention and leaves the relationship illegible. What suffices is an established '
      + 'authority’s revealing deference or orientation toward them, a coordinated group '
      + 'response, or a credible reputational or institutional trace.',
    notFlattering: 'IT NEED NOT FLATTER. Rivals organising against them, people copying their '
      + 'tastes, access controlled through their associates, invitations valued because they might '
      + 'attend, opponents taking precautions they waive for everyone else — resistance '
      + 'establishes significance as clearly as admiration does.',
    boundaries: 'TWO BOUNDARIES. FIRST, the signal must fit the KIND of standing intended: a room '
      + 'falling silent could mean fear, scandal or reverence, and context should make the '
      + 'relevant relationship legible without eliminating all ambiguity — it does not by itself '
      + 'establish romantic desirability. SECOND, AN EXAMPLE CANNOT AUTHORISE A NEW CONSEQUENTIAL '
      + 'FACT: a judge consulting someone implies judicial interference, a name on a hospital '
      + 'implies ownership, patronage or family history. Use those only where the supplied story '
      + 'already supports them; otherwise choose a smaller, grounded social response.',
    // INVENTED TEACHING EXAMPLES, NOT STORYBOUND CANON. Each assumes the roles and circumstances
    // it mentions are established in ITS OWN setting, and none of its facts may be imported.
    examples: [
      ['displaced authority · political or military',
       '“The council waited for the mayor’s answer. The mayor waited for the man beside the window.”'],
      ['collective calibration · business or court intrigue',
       '“The joke carried halfway down the table. At the far end, people checked his expression '
         + 'before deciding whether to laugh.”'],
      ['anticipated desirability · romance or social comedy',
       '“‘He’s coming?’ Three conversations stopped. Across the mirror, two women caught each '
         + 'other adjusting their hair.”'],
      ['disrupted performance · gala, court or nightclub',
       '“The quartet lost a beat when he entered; the hostess, halfway through her best story, '
         + 'forgot its ending.”'],
      ['judicial influence · corruption or political thriller',
       '“The judge had already lifted the sentence. Before reading it, she looked toward the last bench.”'],
      ['response to an absent person · gothic or suspense',
       '“At his name, the servants stopped clearing the plates. A fork remained suspended over the '
         + 'silver tray.”'],
      ['professional reliance · medicine, science or engineering',
       '“The department chair erased her own calculation when his correction arrived. Nobody asked '
         + 'who had sent it.”'],
      ['reputation as a shared benchmark · contemporary or speculative',
       '“‘I’m not Vey,’ the pilot said. ‘I need somewhere to land.’ Nobody needed the comparison '
         + 'explained.”'],
      ['institutional reach · dynastic, corporate or secret-society',
       '“His name was above the hospital entrance. Inside, it appeared again beneath the clause '
         + 'governing who could be refused.”'],
      ['costly accommodation · any hierarchical setting',
       '“The duke moved the signing to Thursday. His daughter’s wedding stayed on Wednesday; the '
         + 'witness he needed could spare only one afternoon.”'],
    ],
    block: function () {
      var L = [this.scope, '', this.algorithm, '', this.routes, '', this.sufficiency,
        '', this.notFlattering,
        '', this.boundaries, '',
        'EXAMPLES BY SITUATION — invented demonstrations, NOT facts of this story. Each assumes '
          + 'its own setting’s roles; choose the one whose social world resembles this scene’s, '
          + 'and take the mechanism, never the wording or the circumstances.'];
      this.examples.forEach(function (e) { L.push('  · ' + e[0] + ' — ' + e[1]); });
      return L.join('\n');
    }
  };

  var CP_EXAMPLES = [
    // ══ ENVIRONMENT+ — MOVED HERE, NOT COPIED (Roman 2026-10-20) ═════════════════════
    // These two lived as string literals inside _buildAuthorVoiceSTB, so only the AUTHOR ever saw
    // them and the combined-request experiment reached them by extracting app.js source. The
    // ordinary editor got neither. They now live here, once, and both consumers render from this
    // bank — the same consolidation CP_EXAMPLES already went through.
    //
    // THE ROSE-OIL PAIR IS DELIBERATELY NOT HERE. "She refreshed it before every negotiation"
    // ASSERTS A RECURRING HABIT, which is a claim about the past however observable each instance
    // is — being an action does not make it history-free. It also characterises a PERSON, so it
    // demonstrates C+, not environmental characterization. It stays in the author doctrine where
    // its licence to assert belongs.
    { mechanism: 'environment', id: 'env-room-arrangement',
      assumes: 'that the room is furnished with a long table and chairs, and that the arrangement '
        + 'is as described. An editor has no licence to assume either: these are the EXAMPLE\'s '
        + 'grounds, not facts about any story.',
      before: '“The room was luxurious.”',
      after: '“Every chair faced the door except the one at the head of the table. That chair faced '
        + 'everyone else.”',
      why: 'An ARRANGEMENT carries it. Nothing is asserted about the past: the chairs are where '
        + 'they are, and what that says about who sits there is left to the reader. This is the '
        + 'route to prefer when you have no established history to draw on.' },
    { mechanism: 'environment', id: 'env-sword-use',
      assumes: 'that the sword HAS a repair history. That is an invented past — legitimate for an '
        + 'author composing a world, and NOT available to an editor, who may only use a past this '
        + 'story has already established.',
      before: '“The sword was old and nicked.”',
      after: '“The sword had been repaired more times than replaced. Someone kept choosing to save '
        + 'it.”',
      why: 'USE AND NEGLECT carry it: the object\'s condition becomes a record of choices somebody '
        + 'made. Take the RELATIONSHIP — a fact becomes meaning through how it has been used — and '
        + 'not the invention.' },

    { id: 'keep-already-works', mechanism: 'keep',
      facts: ['Marisa runs the dispatch desk', 'the night shift calls her when a route fails'],
      viewpoint: 'the narrator has worked under her for two years and notices procedure',
      before: 'Marisa took the call about the washed-out bridge and started rerouting before the '
        + 'driver finished the sentence. She had the alternate up on the second screen already.',
      decision: 'keep',
      kept: 'She had the alternate up on the second screen already.',
      why: 'The second screen is the inference: she had anticipated this failure. It reveals her '
        + '(she plans for the route she does not trust) and the narrator (someone who watches '
        + 'which screen a person reaches for). Nothing needs adding.',
      failure: { text: 'Marisa took the call and started rerouting immediately. She was always '
          + 'three steps ahead — that was simply who she was.',
        why: 'The rewrite replaces evidence with a verdict. "Three steps ahead" is a compliment '
          + 'the reader is asked to accept; the second screen was something they could conclude.' } },
    { id: 'keep-not-the-named-facet', mechanism: 'keep_different_facet',
      facts: ['Oren was the youngest ever promoted to the floor',
        'the facet on file is: he needs to be the one who noticed first'],
      viewpoint: 'the narrator competes with him and is fair about it',
      before: 'Oren read the variance report out loud, slowly, the way you do when you want the '
        + 'room to arrive where you already are.',
      decision: 'keep',
      kept: 'slowly, the way you do when you want the room to arrive where you already are',
      why: 'This delivers a DIFFERENT truth from the one on file — managing how others arrive at '
        + 'a conclusion, not needing to have noticed first. It is genuine Character+ and it '
        + 'stays. A suggested facet is an opportunity, not a target to overwrite working prose for.' },
    { id: 'social-proof-first-depiction', mechanism: 'social_proof',
      facts: ['Teodor holds no rank at the exchange',
        'the floor has learned his read is usually right'],
      viewpoint: 'the narrator distrusts consensus and notices who defers to whom',
      before: 'Teodor stood near the back of the floor, watching the board.',
      after: 'When the number came in wrong, two of the clerks looked at Teodor before they '
        + 'looked at the board again, and he kept watching the board.',
      why: 'The clerks supply the social proof — someone else responds to him, specifically and '
        + 'in staged behaviour. His not turning is his, and it needs no explanation. The '
        + 'narrator\'s reading is carried by WHAT SHE SELECTS: that they checked him before '
        + 'rechecking the number. She declares nothing.',
      failure: { text: 'Teodor stood near the back, and everyone knew his read was the one that '
          + 'mattered.',
        why: 'Narration asserting that people defer is not people deferring. Nobody did anything.' },
      note: 'RECIPROCATION IS NOT REQUIRED. Others must respond to him; he need not respond '
        + 'back. An editor that rejects this because he does not react has inverted the '
        + 'requirement.' },
    { id: 'pc-first-person', mechanism: 'pc_self',
      facts: ['the narrator left the hearing early', 'she is the one who filed the complaint'],
      viewpoint: 'first person; her mask is competence and she narrates herself as practical',
      before: 'I left before the vote. There was no point staying to watch it happen.',
      after: 'I left before the vote. There was no point staying, I told the clerk, and I said it '
        + 'again in the stairwell where there was no clerk.',
      why: 'Saying it twice, the second time to nobody, is the seam. It reveals that the reason '
        + 'is one she needs rather than one she holds — and the prose never says so, never names '
        + 'a feeling, and does not supply the motive underneath.',
      failure: { text: 'I left before the vote. I have always run from things that hurt me, and '
          + 'I knew it even then.',
        why: 'She diagnoses herself, and names the whole motive. A protagonist who can state her '
          + 'own pattern that cleanly leaves the reader nothing to infer.' } },
    { id: 'dialogue-another-observes', mechanism: 'dialogue',
      facts: ['Halvard has known the narrator since she was a trainee',
        'she is now senior to him and neither of them mentions it'],
      viewpoint: 'first person; she hears the old rank in his voice and answers the words instead',
      before: 'Halvard greeted her as she came in, and she returned the greeting.',
      after: '"There she is," Halvard said, the way he had when she fetched his files. I asked '
        + 'him how the intake had gone, and heard myself use his first name.',
      why: 'SOMEONE ELSE\'S WORDS carry the depiction, and her RESPONSE carries her: she answers '
        + 'the question rather than the diminishment, and then hears her own small assertion of '
        + 'rank. Dialogue is a Character+ channel in its own right — and this is her facet, not '
        + 'his.',
      note: 'The depiction may live in another person\'s line, in a memory, in a contrast, or in '
        + 'what somebody does NOT do. No channel is privileged.' },
    { id: 'echo-same-truth-new-cost', mechanism: 'echo',
      facts: ['established earlier: Vashti answers questions she was not asked',
        'this scene: she is being deposed and the stenographer is recording'],
      viewpoint: 'the narrator has come to rely on it and has not examined why',
      before: 'Vashti answered the lawyer\'s question, then added the part he had not asked about.',
      after: 'Vashti answered what he asked, then gave him the part he had not asked about, and '
        + 'for the first time I wished she would stop.',
      why: 'An ECHO, not a restatement: the reader already knows she over-answers. What is new is '
        + 'the NARRATOR\'S relation to it, and "for the first time" is the whole change. Nothing '
        + 'is invented beyond the supplied facts.',
      note: 'An echo is WANTED on a return. "Fresh" never meant forgetting the first depiction.' },
    { id: 'broaden-complicates', mechanism: 'broaden',
      facts: ['established: Ines is the one who stays calm',
        'also on file: she rehearses conversations in advance'],
      viewpoint: 'the narrator has started noticing the rehearsal',
      before: 'Ines stayed calm while the others argued, and said her piece at the end.',
      after: 'Ines said her piece at the end, in the same order she had said it to me in the car.',
      why: 'BROADENS rather than echoes: the established calm now reads as preparation, which '
        + 'complicates it without contradicting it. The narrator\'s share is that she was in the '
        + 'car and recognises the running order.',
      failure: { text: 'Ines stayed calm while the others argued. She was calm, but underneath '
          + 'she was not calm at all.',
        why: 'Contradiction dressed as depth. Broadening adds a facet that coexists with the '
          + 'first; it does not cancel it.' } }
  ];
  var CP_EXAMPLE_PROVENANCE = {
    authority: 'The mechanisms, the annotated exemplar pair, the substitution and removal tests, '
      + 'the governing principle and the bar live in _CP_DOCTRINE (app.js), from commits 02d27366 '
      + 'and b940a9ef. Those are Roman\'s.',
    theseExamples: 'FIXTURES. Invented for this work, in worlds unrelated to any live story. Not '
      + 'canon, not approved doctrine, and not to be reused as story content.'
  };
  // A KEEP always travels, because KEEP is the answer most likely to be skipped. The mechanisms
  // a scene needs are derived from its own obligations, so a scene with no LI introduction never
  // sees the social-proof example.
  // envDue is a SECOND parameter because this function only ever saw the Character+ list, so an
  // environmental obligation could never ask for the environmental examples. Optional, so every
  // existing caller keeps working unchanged.
  function cpExampleMechanismsFor(due, envDue) {
    var want = {};
    (due || []).forEach(function (o) {
      if (o.requiresSocialProof) want.social_proof = 1;
      if (o.isPC) want.pc_self = 1;
      if (o.mode === CP_MODE.ECHO) want.echo = 1;
      if (o.mode === CP_MODE.BROADEN) want.broaden = 1;
      if (o.kind === 'introduction' && !o.isPC && !o.requiresSocialProof) want.dialogue = 1;
    });
    want.keep = 1; want.keep_different_facet = 1;
    if (Array.isArray(envDue) ? envDue.length : !!envDue) want.environment = 1;
    return Object.keys(want);
  }
  // ══ COVERAGE FIRST, SO BANK ORDER CANNOT DISPLACE A RELEVANT EXAMPLE ═══════════════
  // (Roman 2026-10-20.) This filtered CP_EXAMPLES in BANK ORDER and sliced to the limit, so the
  // position of an entry decided whether it survived. Adding the two environmental examples at
  // the front therefore pushed pc-first-person off the end for a scene that had a protagonist
  // obligation — the example most relevant to it was dropped because of where it sat in an array.
  //
  // Now every requested mechanism gets ONE example before any mechanism gets a second, and the
  // order is the order the MECHANISMS were requested (which comes from the obligations), not the
  // bank's. Only after each is represented is the remaining capacity filled. Raising the limit is
  // not the fix and is not used as one.
  function cpSelectExamples(mechanisms, limit) {
    var want = (mechanisms || []).slice();
    // The keep injection is preserved: a repair pass must always see that KEEP is available.
    if (want.indexOf('keep') === -1 && want.indexOf('keep_different_facet') === -1) {
      want.unshift('keep');
    }
    var byMech = {};
    CP_EXAMPLES.forEach(function (e) {
      (byMech[e.mechanism] = byMech[e.mechanism] || []).push(e);
    });
    var out = [], taken = {};
    // Pass one: one per requested mechanism, in requested order.
    want.forEach(function (m) {
      var pool = byMech[m] || [];
      if (pool.length && !taken[pool[0].id]) { out.push(pool[0]); taken[pool[0].id] = 1; }
    });
    // Pass two: fill what is left, still only from requested mechanisms.
    want.forEach(function (m) {
      (byMech[m] || []).forEach(function (e) {
        if (!taken[e.id]) { out.push(e); taken[e.id] = 1; }
      });
    });
    var cap = limit || 4;
    // NEVER CUT INTO COVERAGE. If the cap is smaller than the number of mechanisms actually
    // represented, the cap loses: dropping a mechanism entirely is the failure this prevents.
    var covered = out.filter(function (e, i) {
      return out.findIndex(function (x) { return x.mechanism === e.mechanism; }) === i; }).length;
    return out.slice(0, Math.max(cap, covered));
  }

  // ══ ONE SELECTION POLICY, SHARED BY EVERY CALLER ═══════════════════════════════
  // The ordinary editor selected at limit 5; the experiment selected at limit 6 AND merged extra
  // mechanisms of its own, so the experiment received teaching production did not. Both now call
  // this, which derives everything from the obligations and takes no limit argument — there is no
  // parameter left to disagree about.
  function cpExamplesForObligations(due, envDue) {
    var mechs = cpExampleMechanismsFor(due, envDue);
    return cpRenderExamples(cpSelectExamples(mechs, mechs.length + 1));
  }
  function cpRenderExamples(list) {
    return (list || []).map(function (e) {
      var L = ['— MECHANISM: ' + e.mechanism];
      // ══ AN ENVIRONMENTAL EXAMPLE HAS A DIFFERENT SHAPE ═════════════════════════
      // The C+ entries carry `facts` and `viewpoint`; an environmental one carries what it
      // ASSUMES about its own invented setting. That assumption is printed, because an example
      // that silently relies on a repair history would otherwise read as permission to invent one.
      if (e.mechanism === 'environment') {
        L.push('  what this example ASSUMES about its own setting: ' + e.assumes);
        L.push('  flat: "' + e.before + '"');
        L.push('  significant: "' + e.after + '"');
        L.push('  why it works: ' + e.why);
        L.push('  AN ILLUSTRATION, NOT A FACT. Nothing in it is true of this story, and none of '
          + 'its details may be imported. Take the relationship only.');
        return L.join('\n');
      }
      L.push('  grounded facts the editor had: ' + e.facts.join(' · '));
      L.push('  viewpoint bound: ' + e.viewpoint);
      L.push('  the passage as written: "' + e.before + '"');
      if (e.decision === 'keep') L.push('  DECISION: KEEP, quoting "' + e.kept + '"');
      else L.push('  the revision: "' + e.after + '"');
      L.push('  why it works: ' + e.why);
      if (e.failure) {
        L.push('  the near-miss that looks similar: "' + e.failure.text + '"');
        L.push('  why that one fails: ' + e.failure.why);
      }
      if (e.note) L.push('  note: ' + e.note);
      return L.join('\n');
    }).join('\n\n');
  }

  // ── DURABLE OPERATION IDENTITY ────────────────────────────────────────────────────────────
  // One editing pass per (account, story, scene, draft revision). A reload, a retried host
  // request or a second tab produces the SAME id, so the server replays the first result instead
  // of charging again. The revision is part of it on purpose: a genuinely regenerated scene is a
  // different draft and gets its own pass, while re-running the same bytes does not.
  function cpEditorOperationId(o) {
    o = o || {};
    var parts = ['cplus-editor', String(o.accountId || 'anon'), String(o.storyId || ''),
      'scene' + String(o.scene == null ? '?' : o.scene), String(o.revisionId || '')];
    return parts.join(':');
  }

  var api = {
    STATUS: STATUS, EVIDENCE_RULES: EVIDENCE_RULES,
    readerFacing: readerFacing, branchesOf: branchesOf, revisionId: revisionId,
    quotePresent: quotePresent, sentences: sentences,
    instructionEcho: instructionEcho,
    characterPlusEvidenceSignals: characterPlusEvidenceSignals,
    characterPlusCoverage: characterPlusCoverage,
    allowanceFor: allowanceFor, claimCorrection: claimCorrection,
    evaluate: evaluate, affectedRegions: affectedRegions, buildBrief: buildBrief,
    regressions: regressions, characterPlusBeats: characterPlusBeats,
    judgeContract: judgeContract, validateQuotation: validateQuotation,
    CP_STYLE: CP_STYLE,
    STATUS: STATUS, OCCURRENCE: OCCURRENCE, EVIDENCE_PROBLEM: EVIDENCE_PROBLEM,
    paragraphsOf: paragraphsOf, authorizeRepairRegions: authorizeRepairRegions,
    validateRepairReply: validateRepairReply, spliceAuthorized: spliceAuthorized,
    CP_REJECT: CP_REJECT, CP_MODE: CP_MODE,
    cpCreditDelivery: cpCreditDelivery, cpCoveragePlan: cpCoveragePlan,
    cpDepictionMode: cpDepictionMode, cpClaimRefs: cpClaimRefs, cpRefClaimed: cpRefClaimed,
    cpBibleMaterial: cpBibleMaterial, cpSocialProofOpportunities: cpSocialProofOpportunities,
    editorContract: editorContract, validateEditorReply: validateEditorReply,
    coverageContract: coverageContract, validateCoverageReply: validateCoverageReply,
    cpAttemptRecord: cpAttemptRecord, CP_INTRO_RETRY_GAP: CP_INTRO_RETRY_GAP,
    ebReserveUsd: ebReserveUsd, ebValidateUsage: ebValidateUsage,
    ebNormalizeUsage: ebNormalizeUsage,
    EB_LOCAL_REFUSAL: EB_LOCAL_REFUSAL,
    socialProofResponder: socialProofResponder,
    unaffectedBytesPreserved: unaffectedBytesPreserved,
    branchConsistency: branchConsistency,
    applyOnce: applyOnce, runOnFinalizedDraft: runOnFinalizedDraft,
    // ── THE PRODUCTION EDITOR ────────────────────────────────────────────────────────────────
    cpEditorDue: cpEditorDue, cpEditorScope: cpEditorScope,
    sceneEditorContract: sceneEditorContract,
    buildSceneEditorRequest: buildSceneEditorRequest,
    validateSceneEditorReply: validateSceneEditorReply,
    editorPassOnFinalizedDraft: editorPassOnFinalizedDraft,
    cpEditorOperationId: cpEditorOperationId,
    CP_EDITOR_SOFT_DUE: CP_EDITOR_SOFT_DUE, CP_EDITOR_HARD_DUE: CP_EDITOR_HARD_DUE,
    CP_RECUR_GAP: CP_RECUR_GAP,
    CP_DELIVERY: CP_DELIVERY, cpCountsAsDepiction: cpCountsAsDepiction,
    CP_FUSION: CP_FUSION,
    CP_PC: CP_PC,
    EP_FIRING: EP_FIRING,
    epCoveragePlan: epCoveragePlan,
    epDeliveryRecord: epDeliveryRecord,
    epTransitionId: epTransitionId,
    epLocationKey: epLocationKey,
    epLocationIdentity: epLocationIdentity,
    epMemoryFor: epMemoryFor,
    cpEditorDeliveryRecord: cpEditorDeliveryRecord,
    CP_EXAMPLES: CP_EXAMPLES, CP_EXAMPLE_PROVENANCE: CP_EXAMPLE_PROVENANCE,
    cpSelectExamples: cpSelectExamples,
    cpExamplesForObligations: cpExamplesForObligations,
    CP_SOCIAL_WEIGHT: CP_SOCIAL_WEIGHT, cpRenderExamples: cpRenderExamples,
    cpExampleMechanismsFor: cpExampleMechanismsFor,
    _judgeFn: null   // INERT until a validated judge is wired. Tests inject async stubs.
  };
  globalThis.EssentialBeatCheck = api;
  if (typeof window !== 'undefined') window.EssentialBeatCheck = api;
})();
