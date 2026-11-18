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
    // ── REPLACED: MINIMUM SUFFICIENCY → THE CONNECTING WORK (Roman 2026-11-06) ────────────
    // WHAT THIS REPLACED AND WHY. The old `notChecklist` read "Revealing the observed is enough;
    // revealing the observer is enough; both at once is enough." Three permissions to stop. An
    // editor handed a paragraph and that framing locates one line that qualifies and halts, which
    // is what the two measured craft passes did: one certified an existing line, the other wrote
    // social proof. The permission itself is NOT lost — it is the author's own
    // `_CP_DOCTRINE.notChecklist`, which now reaches the craft request verbatim, in his words.
    // This slot therefore carries the work the doctrine already describes rather than a weaker
    // paraphrase of its permission. NOTHING IS APPENDED: one field replaces one field.
    //
    // ── CONSOLIDATED: NAMED THE DEFAULT OPERATION, AND THE MASK (Roman 2026-11-06) ─────────
    // The previous wording said WHAT to connect but not WHERE TO START, so "take the behaviour
    // this moment puts in front of her" left the editor free to compose a new incident and
    // interpret that instead. The operation is now stated as a sequence: SELECT prose that is
    // already there, then DEVELOP its meaning. Two further things fold into this one field
    // rather than arriving as more instructions:
    //  · THE READING IS MASK-SHAPED. It is her mask that decides which observable detail
    //    matters and what she makes of it, and the mask now reaches this request through the
    //    existing viewpoint input (`viewpointAndMask`) instead of being absent from it.
    //  · NO COMPULSORY GLOSS. Measured in both craft arms: the connection arrived as a stated
    //    opinion appended to an observation. Selection, comparison and response carry a reading
    //    too, which CP_STYLE.implicitViewpoint already says — so this says plainly that an
    //    opinion after every observation is NOT owed, instead of leaving the two in tension.
    // THE OBSERVED/OBSERVER/BOTH PERMISSION IS CARRIED HERE, and that is a correction to the
    // first version of this field. It assumed the author's own `_CP_DOCTRINE.notChecklist` made
    // the permission redundant, which is true of the CRAFT EDITOR — the doctrine reaches that
    // request verbatim — and FALSE of the judge-driven repair brief, which carries CP_STYLE and
    // no doctrine at all. `_essential_beat_check_control` and `_eb_evidence_corrections` both
    // went red on exactly that, correctly. The permission is restored into this one field rather
    // than as a sixth key, so the one-field-for-one-field discipline holds: it belongs here,
    // because it qualifies what the connection has to accomplish. The nine mechanisms are
    // untouched and remain the author's own words. No exemplar sentence is supplied, in either
    // version.
    connection: 'START FROM SOMETHING ALREADY ON THE PAGE, THEN DEVELOP WHAT IT MEANS TO HER. '
      + 'That is the default operation, in that order: SELECT observable behaviour this encounter '
      + 'already contains — his, her own, or the two together — and DEVELOP its meaning through '
      + 'her reading of it, which is the reading her mask gives her. Her desires, her '
      + 'assumptions, her defences, her self-image, her sense of what she is to this person: the '
      + 'connection runs between the observable thing and one of those. Finding one line that '
      + 'qualifies and stopping is not the work; neither is writing a new incident in order to '
      + 'have something to interpret. Express the connection THROUGH THE ENCOUNTER ITSELF — in '
      + 'what she attends to, what she takes it to mean, and how she answers it — and do not step '
      + 'outside the moment to explain it. AN OPINION AFTER EVERY OBSERVATION IS NOT OWED: a '
      + 'stated reading is one way and often the weakest, selection and comparison and response '
      + 'carry a reading too, and the prose must not become observation-then-gloss repeated down '
      + 'the page. NO BEAT OWES EVERY FUNCTION: revealing the observed is enough, revealing the '
      + 'observer is enough, and both at once is enough — what the connection may not be is '
      + 'absent, or the same inference the reader already had. HIS MOTIVES REMAIN HER READING OF '
      + 'HIM — defeasible, possibly wrong, and never promoted into fact by the narration. Invent '
      + 'no backstory and no hidden motive to make a connection available: work from what the '
      + 'supplied prose and canon already give you, and where they give you little, choose a '
      + 'smaller connection rather than a supplied past.',
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
  // ══ PHYSICAL GROUNDING — THE SECOND, DISTINCT FINDING (Roman 2026-11-04) ══════════════════
  // WHAT THIS REPLACES, AND WHY. The appearance block used to tell the editor the supplied facts
  // were "ALREADY ESTABLISHED ... NOT AS A PROMPT TO DESCRIBE", and that "an edit that mentions
  // none of them is correct". The premise was wrong: a character record is CANON, not evidence
  // that the reader has ever been shown it. Missing information in an abbreviated history is not
  // proof that a character was never described, and holding a record is not proof that they were.
  //
  // THE MEASURED FAILURE. On the Sol opening the production assessor returned `fulfilled` for all
  // four Character+ obligations — including the presiding Dohkar, who has no face, build, hair or
  // name anywhere on the page, and whose entire physical presence is a hand that stops moving.
  // That verdict is CORRECT for what C+ measures: a relationship PERCEPTION EVENT, which behaviour
  // and inference alone can satisfy. Nothing in the pass could see that the reader cannot picture
  // him, because nothing in the pass was looking.
  //
  // SO: TWO FINDINGS, KEPT APART. "We perceive something about this person" and "we can picture or
  // recognize this person" are different achievements. A fulfilled C+ obligation does not answer
  // the second and MUST NOT suppress an edit for it. Equally, a useful physical detail owes no
  // psychological truth and no plot work — helping the reader see someone is sufficient.
  // ══ A NAMED EDITING TASK, WHEN THE PASS IS NOT A GROUNDING PASS (Roman 2026-11-05) ═══════
  // The editor's machinery — paragraph refs, protected passages, the splice, the byte check —
  // is task-agnostic. What was NOT task-agnostic was the instruction block and the reply
  // contract: both hard-coded the Character+/grounding questions, so a differently-briefed pass
  // was still asked those four questions and answered them. This carries an objective supplied
  // by the caller and asks the model to do THAT, with the same preservation guarantees.
  //
  // It is a MECHANISM, not a new stage and not a permanent mode: nothing in production supplies
  // `opts.task`, so no shipped pass changes behaviour.
  var CP_TASK = {
    // ── THE AUTHORIZED SCOPE IS A SECOND ARGUMENT, AND IT HAD TO BE (Roman 2026-11-08) ──────
    // MEASURED GAP: the explicitness task's objective opens "READ THE AUTHORIZED SCOPE BELOW —
    // it names WHICH MATERIAL you may make explicit, and it is the only thing that does", and
    // the caller was passing `authorizedScope` as an option that NOTHING in this file read. So
    // the one input that decides whether a pass may touch the body never reached the editor:
    // a dialogue-only whisper and a full physical scene would have sent the identical prompt.
    // Caught by the saved-scene control, which asserted the scope's own words in the outgoing
    // request and found them absent.
    //
    // Omitted, the block is byte-identical to before, so the consistency pass is unaffected.
    block: function (t, authorizedScope) {
      var L = ['THIS PASS HAS ONE EDITING TASK, STATED BELOW. It is not a Character+ pass and '
        + 'not a description pass; do the task named here.', '', 'TASK: ' + t.objective];
      if (authorizedScope) {
        // PLACED IMMEDIATELY AFTER THE OBJECTIVE, because the objective tells the editor to read
        // it first. It is a CEILING: it says what may be made explicit, never what must be.
        L.push('', 'AUTHORIZED SCOPE — THIS IS THE CEILING FOR THIS PASS, AND THE ONLY THING '
          + 'THAT NAMES WHICH MATERIAL YOU MAY TOUCH:', String(authorizedScope));
      }
      if (t.welcome) L.push('', t.welcome);
      if (t.insufficient) L.push('', 'NOT AUTOMATICALLY ENOUGH: ' + t.insufficient);
      if (t.exclusions) L.push('', 'ABSOLUTE EXCLUSIONS: ' + t.exclusions);
      // ── ONE AUTHORIZED EXCEPTION, NAMED BY THE CALLER (Roman 2026-11-06) ───────────────
      // "Remove nothing the scene already has" is right for every task this block has carried,
      // and it CONTRADICTS a consistency pass that is explicitly authorized to delete an
      // accidental duplicate — the pass would be told the opposite of its remit in the same
      // prompt. `authorizedRemoval` lets the caller name that one exception instead of relaxing
      // the rule for everybody. Omitted, the sentence is byte-identical to before, and nothing
      // in production supplies `opts.task` at all.
      L.push('', 'PRESERVE: the scene’s events and their causal order, every established '
        + 'fact, every character description already present, the viewpoint, the reader’s '
        + 'choices including the closing decision, and the prose’s voice and rhythm. '
        + (t.authorizedRemoval
          ? ('Remove nothing the scene already has, WITH ONE AUTHORIZED EXCEPTION: '
             + t.authorizedRemoval + ' Everything outside that exception stays.')
          : 'Remove nothing the scene already has.')
        + ' Every protectedPassage must survive verbatim.');
      L.push('', 'USE THE OPPORTUNITY THE SCENE ALREADY OFFERS. Do not invent contact, privacy '
        + 'or events this scene cannot support, and do not introduce a new obstacle, a '
        + 'confession, shame or denial that the scene did not already contain.');
      L.push('', 'A KEEP IS AVAILABLE AND IS THE RIGHT ANSWER WHEN THE REQUESTED EFFECT ALREADY '
        + 'WORKS. Quote the passage that achieves it and change nothing. Leave passages that are '
        + 'doing other work well alone.');
      if (t.exampleNote) L.push('', t.exampleNote);
      return L.join('\n');
    }
  };

  // ── THE CONSISTENCY TASK, AS ALREADY WRITTEN (Roman 2026-11-06) ─────────────────────────
  // This is the task from the prepared pass (_consistency_pass_prepare.mjs), moved here as DATA
  // so a run can schedule it. It is not a new stage, framework or prompt rule: it is the same
  // object, carried through the same CP_TASK block, the same task mode, the same validator and
  // the same duplicate-insertion guard. Its three remits, its welcome, its insufficient clause
  // and its authorizedRemoval are the approved wording, verbatim.
  //
  // TWO SCENE-BOUND CLAUSES WERE NOT CARRIED OVER, and that is a deliberate, reported change:
  //   · the exclusion naming cufflinks as "jewellery fastening a shirt cuff and nothing else"
  //   · the instruction protecting "the line about a door that used to be closed between them"
  // Both describe ONE saved Mara/Roman scene. Roman's own direction on that scene was that the
  // shirt/cuff ambiguity is "a local regression case, not a permanent prompt example", and a
  // concrete exemplar in a prompt gets copied verbatim — so sending either into every First
  // Sacrifice scene would plant objects and lines that scene has never contained. The STRUCTURAL
  // rules they instantiate are already in this wording and are untouched: "Do NOT invent an
  // accessory, an action or an explanation to make a contradictory reference work", "NO INVENTED
  // RESTRAINT of any kind", and "Do not rewrite prose that is doing its job: effective sentences
  // stay exactly as they are." The per-scene clothing and body canon arrives the way it does for
  // every other pass — through `appearance`, from the run's own bibles, not from this constant.
  var CP_CONSISTENCY_TASK = {
    id: 'consistency',
    objective: 'REPAIR DEMONSTRATED CONSISTENCY DEFECTS IN THE EDITABLE PASSAGE, AND NOTHING '
      + 'ELSE. There are exactly three things in your remit. (1) ACCIDENTAL DUPLICATION: text or '
      + 'an action that appears twice because it was copied, not because the prose is repeating '
      + 'for effect. (2) CLOTHING AND BODY-POSITION CONTINUITY across the encounter: a garment '
      + 'that is both on and off, a fastening that moves from one part of the body to another '
      + 'without being undone, a position that cannot follow from the one before it. (3) WHEN '
      + 'CORRECTING A CONTINUITY DEFECT, CHECK ALL RELATED MENTIONS of the affected person, '
      + 'object or state throughout the supplied scene. Return the smallest COMPLETE SET of '
      + 'coordinated corrections that leaves the sequence coherent — not merely a locally correct '
      + 'sentence. READ THE FULL CONTEXT, BUT EDIT ONLY THE AUTHORIZED REGION: if a complete '
      + 'repair would require changing protected or read-only prose, make the corrections you can '
      + 'and REPORT THE UNRESOLVED CONFLICT in your `why` — name the span you cannot reach and '
      + 'what still contradicts it — rather than claiming the defect is fixed. '
      + 'FIRST FIND THE CONFLICT, THEN FIX IT: for every edit you propose, your `why` must quote '
      + 'or name the OTHER span it conflicts with and say what the contradiction is. An edit whose '
      + '`why` does not identify a specific conflicting span is not a repair, and this pass has no '
      + 'other business. If a thing is merely not to your taste, it is not in your remit.',
    welcome: 'YOU MAY DELETE AN ACCIDENTAL DUPLICATE, and you may narrowly REWORD a contradictory '
      + 'clothing or position reference so it agrees with the established canon below and with the '
      + 'rest of the encounter. Those two are what this pass is for. Use the smallest span that '
      + 'does the job AT EVERY MENTION THE DEFECT TOUCHES — one reworded sentence where one is '
      + 'enough, and a coordinated set where the same state is referred to more than once. Do NOT '
      + 'invent an accessory, an action or an explanation to make a contradictory reference work; '
      + 'correct the reference or report it unresolved.',
    insufficient: 'NOTICING A PROBLEM WITHOUT NAMING THE SPAN IT CONFLICTS WITH. "this reads '
      + 'oddly" and "this could be clearer" are not defects. A duplication is a defect because the '
      + 'same text is in two places; a clothing reference is a defect because another span says '
      + 'something incompatible. Point at both halves of the contradiction or leave it alone.',
    exclusions: 'NO Character+ work, no new interpretation of anyone, no romance beat, no '
      + 'stylistic polishing, no euphemism or softening, no new sexual act and no escalation or '
      + 'de-escalation of what is already explicit, and NO INVENTED RESTRAINT of any kind. '
      + 'Do not change the sequence of events, anyone\'s characterization, the viewpoint, or the '
      + 'level of explicitness. Do not rewrite prose that is doing its job: effective sentences '
      + 'stay exactly as they are.',
    authorizedRemoval: 'where text or an action is ACCIDENTALLY DUPLICATED, the redundant copy may '
      + 'be deleted, leaving one instance.'
  };

  // ══ THE EXPLICITNESS TASK (Roman 2026-11-08) ══════════════════════════════════════════════
  // The ENHANCED edition of a passage, produced by the existing editor as a named task — the
  // same shape as CP_CONSISTENCY_TASK, carried as data. Nothing new is built: it goes through the
  // same task mode, the same CP_TASK block, the same validator and the same non-destructive
  // operations, and because `_taskMode` suppresses the Character+ doctrine, the Fusion block, the
  // style block and the examples, its request carries only the passages, the compact appearance
  // canon, the roster and this remit — not the author rulebook.
  //
  // THIS REPLACES A FULL-SCENE SECOND AUTHOR. The superseded cascade handed the whole scene to a
  // second model with its own consent adjudication and its own failure handling, and the reader
  // got that model's scene rather than an enhanced version of the one they were reading. An
  // editor pass cannot do that: it may only return bounded edits to a draft that already exists,
  // and the plot, the reader's choices, the identities and the outcomes are already fixed in it.
  //
  // IT IS NOT AN AUTHORIZER. Whether this pass runs at all is decided upstream — by the scene's
  // authorized scope AND by the server, which enforces which edition this deployment may
  // produce. Reaching this object means that decision has already been made.
  // ── THE REMIT IS WHAT THE SCOPE AUTHORIZES, WHICH IS NOT ALWAYS PHYSICAL (Roman 2026-11-08) ─
  // CORRECTED IN PLACE. The first wording required physical intimacy in every clause — "render
  // the already-authorized PHYSICAL INTIMACY", "rewrite a PHYSICAL PASSAGE", "nothing outside the
  // physical passages" — so the early LI whisper, which is DIALOGUE and deliberately precedes the
  // StoryTurn romance gates, could never be enhanced at all. That excluded the one come-on the
  // architecture was asked to keep.
  //
  // The fix is one task whose remit is read from the AUTHORIZED SCOPE supplied with each call,
  // not a second rule block appended to a physical-only task. Two scopes exist today —
  // dialogue-only and physical — and the wording below holds both without the editor having to
  // guess which it is in: the scope states it.
  //
  // DIALOGUE PERMISSION IS NOT PHYSICAL PERMISSION. That separation is the whole reason the old
  // architecture's collapse of it mattered, so it is stated in the objective AND again in the
  // exclusions rather than left to the scope string alone.
  var CP_EXPLICITNESS_TASK = {
    id: 'explicitness',
    objective: 'RAISE THE EXPLICITNESS OF THIS PASSAGE TO WHAT THE AUTHORIZED SCOPE BELOW '
      + 'PERMITS, AND CHANGE NOTHING ELSE. The scene is finished: the events happened, the '
      + 'characters chose what they chose, and it reached the outcome it reached. Your remit is '
      + 'the LANGUAGE, never what occurs. '
      + 'READ THE AUTHORIZED SCOPE FIRST — it names WHICH MATERIAL you may make explicit, and it '
      + 'is the only thing that does. '
      + 'WHERE THE SCOPE AUTHORIZES SPOKEN LANGUAGE, your remit is what characters SAY: a '
      + 'proposition carried by implication, innuendo or a tactful paraphrase may be spoken '
      + 'plainly, in that speaker\'s own voice and at that speaker\'s own level of nerve. '
      + 'WHERE THE SCOPE AUTHORIZES PHYSICAL INTIMACY, your remit extends to the body: where an '
      + 'authorized act is carried by euphemism, by a cut away, or by a summary of what happened '
      + 'rather than the happening of it, write it directly, with anatomical and tactile '
      + 'specificity, in the narration\'s established voice. '
      + 'SPOKEN PERMISSION IS NOT PHYSICAL PERMISSION. A scope that authorizes dialogue '
      + 'authorizes dialogue ONLY: you may make a character say something far more explicit and '
      + 'you may NOT add, extend or render any physical act, touch or undressing anywhere in the '
      + 'passage, however the line is answered. '
      + 'Where the prose is ALREADY at the authorized level, leave it alone. EDIT ONLY THE '
      + 'AUTHORIZED REGION: if a passage you would change is protected or read-only, make the '
      + 'edits you can and REPORT what you could not reach in your `why`, naming the span, '
      + 'rather than claiming the passage is done.',
    welcome: 'YOU MAY REWRITE A PASSAGE at the explicitness the authorized scope allows. For a '
      + 'dialogue scope, that is the SPOKEN LINE: say the thing outright instead of circling it, '
      + 'keeping the speaker\'s diction, rhythm and restraint, and keeping every surrounding '
      + 'narration sentence as it stands. For a physical scope, that is the body as well: anatomy '
      + 'named directly, contact and rhythm narrated rather than implied, sensation given to the '
      + 'viewpoint character in her own register. In both cases use the smallest span that does '
      + 'the job and keep the paragraph\'s shape, length and position in the scene. For each '
      + 'edit, your `why` must name what the authorized scope permits and what the current '
      + 'wording is standing in for.',
    insufficient: 'RAISING THE TEMPERATURE WITHOUT SAYING OR RENDERING ANYTHING. An intensifier, '
      + 'an adverb or a more urgent verb attached to the same implication is not this pass\'s '
      + 'work; neither is making the narration hotter around a line that still will not say what '
      + 'it means. Nor is a passage that is already at the authorized level and merely not to '
      + 'your taste. If the prose already says it or already renders it, it is finished.',
    exclusions: 'NO NEW EVENTS AND NO NEW ACTS. Do not add, remove, reorder or extend anything '
      + 'beyond the authorized scope supplied below — the scope is a CEILING, not a target, and a '
      + 'passage may sit well under it. ON A DIALOGUE-ONLY SCOPE, no physical act of any kind may '
      + 'be added, extended, or rendered more explicitly: not a touch, not a kiss, not a hand '
      + 'moving, not a garment, and not a body described in a way the draft did not already '
      + 'describe it. Do NOT change who is present, who does what, who consents to what, what '
      + 'anyone refuses, how anyone answers a line, or how the passage ends. Do NOT change any '
      + 'character\'s identity, body, name, appearance, relationship or history, and do not '
      + 'invent any of those. Do NOT rewrite dialogue the reader chose. Do NOT cross a stated '
      + 'hard stop or boundary, and do not narrate anyone the roster does not place in the '
      + 'passage. Do NOT de-escalate, soften, abridge, moralize, add regret or add a consequence '
      + 'that is not already in the scene. No Character+ work, no picturability work, no '
      + 'continuity repair, and no stylistic polishing of prose outside the authorized material.',
    authorizedRemoval: 'where a cut away, a fade, a tactful paraphrase, or a line that REPORTS '
      + 'authorized material instead of delivering it stands in place of the thing itself, that '
      + 'stand-in may be replaced by the delivered line or act, within the authorized scope. '
      + 'Nothing else may be removed.'
  };

  var CP_GROUNDING = {
    // The one compact paragraph that now carries the whole requirement.
    paragraph: 'GROUND THE PROTAGONIST, THE LOVE INTEREST AND THE NAMED OR CONSEQUENTIAL ON-PAGE '
      + 'CHARACTERS SUFFICIENTLY FOR THE READER TO PICTURE THEM. Where that grounding is missing, '
      + 'weave in a few clear, memorable details — often one to three — starting with what the '
      + 'encounter is doing to their body, clothing, voice or movement, and using fixed features '
      + 'where they help the reader recognize someone. Briefly recall a familiar feature when '
      + 'someone returns after an absence; otherwise let description recur when it helps us picture '
      + 'the encounter. This is not a per-scene quota. Preserve established traits and player '
      + 'choices. Supplied character records establish canon, not proof that the reader has seen it.',
    // ── SELECTION, NOT VOLUME (Roman 2026-11-05) ────────────────────────────────────────────
    // CORRECTED ATTRIBUTION. I first wrote that the editor "reached for HAIR, the one attribute
    // the prose already had". That was false: the original Luna draft contained no hair for
    // Lirael at all — the only hair in it belonged to Julian and to Seren — and the edit
    // INTRODUCED hers. The criticism is not repetition. It is that she arrived with seven
    // delivered facts (age, height, build, hair, face, complexion, signature) and the resulting
    // portrait was still THIN: one feature added where the record could have supported a fuller
    // impression. A bible may be detailed while the prose selects the few features that do work.
    // ── THE ENCOUNTER FIRST, NOT THE FEATURE LIST (Roman 2026-11-10) ───────────────────────
    // WHAT THIS REPLACES: feature-led guidance that told the editor which ATTRIBUTES of the
    // supplied record to pick from (face, build, height, bearing, voice, scar) and then argued
    // about which were defaults. Asked which attribute to choose, the editor chose attributes.
    //
    // MEASURED on the Scene 12 picturability pass, which is the comparison this wording is aimed
    // at and NOT a template for other scenes: three accepted edits, all canon-faithful. The one
    // that earned its place was Julian's Weave-Script spelling his concern — Lirael sees it while
    // he takes her direction, so the detail is what the encounter is doing to him and what she
    // can notice in the act. The two that could have waited were a portrait of his nose inserted
    // mid-descent and a five-colour inventory of the crowd placed in the paragraph where the
    // surge and the fall happen. Both are accurate; neither is what that moment was doing.
    //
    // So the instruction now leads with the body under pressure and keeps fixed features as a
    // recognition aid rather than the starting point. Appearance canon is untouched — the system
    // block still supplies it and it is still never to be contradicted — and KEEP is named here
    // as it was before.
    selection: 'Choose the detail that makes this person physically present in this moment. '
      + 'Start with what the encounter is doing to their body, clothing, voice or movement. '
      + 'In a rescue, that might be grit sticking to a sweaty wrist, a grip that shakes, or '
      + 'someone having to stop for breath. Choose what the viewpoint character can actually '
      + 'notice, and fit it into the action already on the page. Use fixed features when they '
      + 'help the reader recognize someone. KEEP passages that already make the person feel '
      + 'present.',
    // ── STAGING IS NOT AN IMPRESSION (Roman 2026-11-04, recalibrating this paragraph) ───────
    // The withdrawn wording ended "a generic hand movement, a posture or a silence does not by
    // itself make anyone recognizable" — a list of insufficient examples, which the editor read
    // and then certified a hand movement anyway. Naming the CATEGORY is the correction: the
    // question is not whether someone is visibly doing something, it is whether the reader comes
    // away with a concrete impression of this particular person.
    twoFindings: 'KEEP THE TWO FINDINGS DISTINCT, PER PERSON. (1) PERCEPTION — the passage '
      // ── WHAT PERCEPTION ACTUALLY REQUIRES (Roman 2026-11-05) ────────────────────────────
      // REPLACES "we perceive something about this person", which a restatement of someone's
      // job satisfies. Measured: the presiding Dohkar's C+ was credited to "You are supervising
      // her sacrifice. Do not add your own." — a line that states his office and her duty
      // and reveals nothing anyone did not already know. The requirement names its CHANNELS so
      // the test is what the passage does, not whether it mentions the person.
      + 'REVEALS SOMETHING about this person, about the observer, or about what lies between '
      + 'them — carried by the viewpoint\'s ATTENTION (what she notices, and that she '
      + 'noticed it), INTERPRETATION (what she makes of it), ACTION (what someone chooses to '
      + 'do) or RESPONSE (what it costs or changes in someone). RESTATING SOMEONE’S '
      + 'PROFESSIONAL ROLE IS NOT AUTOMATICALLY ENOUGH: that he presides, that she supervises, '
      + 'that he is senior, is position rather than revelation. It becomes revelation when the '
      + 'passage shows how this person holds that position, or what the observer makes of them '
      + 'holding it. (2) GROUNDING — we come away with a concrete impression of '
      + 'THIS PARTICULAR PERSON. A fulfilled perception obligation does NOT satisfy the second '
      + 'and does not block an edit for it. THESE ARE DIFFERENT QUESTIONS, AND THE EASIER ONE IS '
      + 'NOT THE ONE BEING ASKED: "is this person visibly doing something" is answered by '
      + 'STAGING — turning, entering, speaking, moving their hands, holding a room — and staging '
      + 'does not automatically answer the second. Someone can act decisively through a whole '
      + 'scene and still leave nobody the reader could pick out of the crowd they were commanding. '
      + 'A PHYSICAL FEATURE, A VOICE, A BEARING OR A DISTINCTIVE HABIT each supply that '
      // ── NO UNIQUENESS TEST (Roman 2026-11-04) ─────────────────────────────────────────
      // This closed with "an action that anyone present could equally have performed does not",
      // which set a bar nobody asked for: a shared accent, a common build or a gesture half the
      // room makes can still let the reader see someone. The question is whether the reader can
      // picture this person here, not whether the detail distinguishes them from everyone.
      + 'impression. Generic staging alone may leave someone indistinct. The detail need not be '
      + 'unique; it needs to help the reader picture or recognize this person in context.',
    sufficiency: 'DESCRIPTION MAY SIMPLY HELP THE READER SEE SOMEONE. It does not have to justify '
      + 'itself by advancing the plot or revealing a psychological truth. Scale it to the person\'s '
      + 'importance, and weave it into action the scene already has rather than stopping for a '
      + 'portrait. FIRST-PERSON NARRATION EXEMPTS NOBODY: the protagonist telling the story needs '
      + 'physical presence too.',
    invention: 'PREFER EXISTING PHYSICAL CANON, which is supplied below where a record exists. '
      + 'Where a detail is genuinely unspecified, a modest, compatible invention is permitted — '
      + 'but missing access to a record is never permission to contradict one. Never alter, '
      + 'contradict or re-list a supplied fact, and never contradict a player choice.',
    // ── THE ANSWER MAY COME FROM EARLIER PROSE, AND USUALLY SHOULD ──────────────────────────
    // The first version of this requirement accepted ONLY evidence quoted from the scene in
    // front of the editor. That turned "not a per-scene quota" into a per-scene quota by
    // validation: a character described in scene 2 and developed through dialogue in scene 3
    // could not be left alone, because the scene-3 prose held no description to quote. The
    // obligation would go unanswered and an edit would be owed — another identifying passage,
    // every time a cadence came due, which is precisely the repetitive portraiture this whole
    // requirement exists to avoid.
    // ── REPLACED: SCENE-WIDE SUFFICIENCY → THE ENCOUNTER IN FRONT OF YOU (Roman 2026-11-06) ─
    // WHAT THIS REPLACED AND WHY — MEASURED, both providers, on the same frozen request. The
    // editable span was the explicit continuation (P22–P30). Both picturability passes answered
    // ALL-KEEP with `basis: "scene"`, quoting Mara's loosening pin and borrowed green silk and
    // Roman's shed jacket and white shirt — every word of it from P2 and P3, which were supplied
    // READ-ONLY. The claim was literally true (it IS this scene) and it settled nothing about the
    // encounter, which runs for nine paragraphs with no physical particularity in it at all.
    // Both also quoted the cuffs approvingly while the encounter has them fastened at the wrists,
    // then at the forearms, with the shirt coming off in between and clicking "with every drive"
    // — a clothing contradiction neither pass registered, because nothing asked it to look at the
    // encounter as the thing under judgement.
    //
    // THE OLD FRAMING IS WHAT PERMITTED THAT, and its reason was sound: a character described in
    // scene 2 and developed through dialogue in scene 3 must not be re-described merely because
    // scene 3 carries no portrait. That protection is KEPT, in `prior`. What is withdrawn is the
    // part that let prose from OUTSIDE the editable encounter answer a question about the
    // encounter. A record and an earlier portrait supply CONTINUITY AND FACTS; they do not
    // discharge this requirement, and `basis: "scene"` now means the editable encounter itself.
    // NOTHING IS APPENDED: one field replaces one field.
    encounter: 'JUDGE THE ENCOUNTER YOU CAN EDIT. The question is whether THE PARAGRAPHS YOU ARE '
      + 'PERMITTED TO CHANGE make these particular people physically present, and whether their '
      + 'clothing, positions and movement stay coherent through them. EARLIER DESCRIPTION AND A '
      + 'SUPPLIED RECORD GIVE YOU CONTINUITY AND FACTS — THEY DO NOT AUTOMATICALLY DISCHARGE THIS '
      + 'ENCOUNTER. A portrait delivered before this encounter began tells you what the reader has '
      + 'already read; a character record tells you what is true of someone; neither answers '
      + 'whether the reader can see them HERE. Say which you are standing on in `grounding.basis`: '
      + '"scene" when THE EDITABLE ENCOUNTER ITSELF grounds them — a quote taken from read-only '
      + 'prose outside it is continuity, not an answer, and is not accepted as one; "prior" when a '
      + 'supplied published passage from an EARLIER SCENE already did and this encounter needs no '
      + 'reminder; "unknown" ONLY where the supplied history is incomplete and you genuinely '
      + 'cannot tell — then say in `why` what you are unsure of. "unknown" RECORDS '
      + 'UNCERTAINTY AND NOTHING ELSE: it does not force another description, and it does not '
      + 'certify that one was ever delivered, so it is not a finding that the reader can picture '
      + 'this person. WHERE THE SUPPLIED HISTORY IS COMPLETE — '
      + '`publishedPassagesForThesePeople.historyComplete` says so, and it is true of an opening '
      + '— there is no earlier prose to appeal to, and an unsupported claim that someone was '
      + 'described before is unavailable. GENERIC ANATOMICAL ACTIVITY IS NOT AUTOMATICALLY '
      + 'ENOUGH: bodies in motion, hands and mouths doing things, the mechanics of contact — '
      + 'these can run for paragraphs without telling the reader WHOSE body it is. NO NEW TRAIT '
      + 'AND NO ANATOMICAL CHECKLIST IS REQUIRED OF YOU: a familiar feature recurring naturally, '
      + 'through movement, clothing, proximity or what the viewpoint notices, is usually the '
      + 'better answer than a new one. AND GROUNDING IS STILL NOT A QUOTA — ask for an edit when '
      + 'the reader cannot see these people in this encounter, or when its clothing or positions '
      + 'contradict themselves; never merely because a span of prose happens to carry no '
      + 'description.',
    // ── KEEP IS STILL FIRST-CLASS, AND IT IS NOW ANSWERED FROM THE ENCOUNTER ────────────────
    // The second sentence used to read "So does a character the reader can already picture from
    // earlier scenes, where this encounter needs no reminder" — the same scene-wide discharge
    // `encounter` has just withdrawn, sitting one field below it. A person who is ON STAGE in the
    // editable encounter is answered from that encounter; `prior` remains for a person the
    // encounter does not actually put in front of the reader. Nothing here forces a portrait: an
    // encounter that already works, or one where another detail would add little, is a KEEP.
    restraint: 'KEEP WHAT ALREADY WORKS. A character THIS ENCOUNTER already grounds adequately '
      + 'takes a KEEP on this finding, and you quote the passage inside it that does the work. So '
      + 'does a character the encounter does not actually put in front of the reader — someone '
      + 'referred to, remembered or off-stage — where an earlier scene has already shown them. '
      + 'AN ENCOUNTER THAT IS ALREADY SUFFICIENTLY EMBODIED IS A KEEP, and so is one where another '
      + 'detail would add little: the test is what the reader comes away with, never how many '
      + 'features you counted. DO NOT FORCE ANOTHER INTRODUCTORY PORTRAIT INTO AN ENCOUNTER '
      + 'ALREADY UNDER WAY — the moment for an establishing description has passed, and what '
      + 'belongs here is woven into the action the encounter already has. Do not give everyone a '
      + 'second portrait, do not require a new feature on every appearance, and do not substitute '
      + 'a compulsory repeated gesture for a missing appearance. WHERE YOU CORRECT CLOTHING OR '
      + 'POSITION, KEEP IT NARROW: fix the thing that contradicts itself and change no event — no '
      + 'action removed, none added, none reordered.',
    // The header for the supplied records themselves. It replaces the withdrawn
    // "NOT AS A PROMPT TO DESCRIBE" wording and says what a record actually is.
    recordsHeader: 'ESTABLISHED PHYSICAL CANON FOR THESE PEOPLE. This is CANON — what is TRUE '
      + 'of them, which nothing you write may contradict or restate as a list. It is NOT a record '
      + 'of what the reader has been shown, and its absence for someone is NOT evidence they were '
      + 'described. Prefer these facts over inventing new ones when you ground a person.',
    block: function () {
      return [
        'PHYSICAL RECOGNIZABILITY IS DUE IN THIS PASS, ALONGSIDE CHARACTER+.',
        '',
        this.paragraph,
        '',
        this.twoFindings,
        this.encounter,
        this.selection,
        this.sufficiency,
        this.invention,
        this.restraint
      ].join('\n');
    }
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
        connection: CP_STYLE.connection,

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
  // `opts` is accepted and unused. The C+ ledger handoff was briefly wired here; this function
  // has NO caller in public/ (only two test harnesses reference it), so it was never the live
  // boundary. The live parser is validateSceneEditorReply and the handoff lives beside its
  // consumer in app.js. Left in place because the signature is exported.
  function validateEditorReply(raw, slots, paragraphs, reader, opts) {
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
    PROTECTED: 'protected_passage_removed',
    // ── THE ENRICHMENT-PRESERVATION BOUNDARY (Roman 2026-11-06) ─────────────────────────────
    // An ADDITIVE pass may add; it may not hand back a paragraph. These two are the structural
    // refusals that make that true rather than requested. The code names the OPERATION that was
    // refused, not a judgement about the returned text — nothing here inspected the text.
    DESTRUCTIVE: 'replace_unavailable_in_enrichment',
    ANCHOR: 'anchor_not_unique_in_paragraph',
    // An insertion that reproduces source prose already sitting beside the insertion point.
    ECHOED: 'insertion_copies_adjacent_source',
    // A grounding finding about the editable encounter, answered from read-only prose.
    OUTSIDE: 'grounding_outside_the_encounter' };

  // ── WHAT AN ENRICHMENT MAY DO: ADD. THAT IS THE WHOLE RULE. ───────────────────────────────
  // (Roman 2026-11-06, third version, and the first that is not a heuristic.) THE TWO EARLIER
  // VERSIONS WERE BOTH MEASUREMENTS OF THE TEXT AND BOTH WRONG, in opposite directions.
  //
  //  · Requiring every SENTENCE of the source to survive verbatim forbade the fusion the craft
  //    exists to perform, and the editor suite said so at once: eight legitimate fixtures red.
  //  · Allowing up to half the CONTENT WORDS to go permitted the exact thing the boundary was
  //    built to stop. A replacement can turn "He stayed" into "He left" while dropping almost
  //    nothing, and my own calibration table recorded a suite fixture swapping a response for a
  //    different action at a cost of ONE token — reported as a known gap rather than fixed.
  //
  // A THRESHOLD THAT KNOWINGLY ADMITS AN ACTION CHANGE IS NOT PROTECTION, and tuning it only
  // moves which action change passes silently. There is no number here to get right.
  //
  // SO THE BOUNDARY IS THE OPERATION, NOT A PROPERTY OF THE TEXT. An additive pass is given the
  // two operations that cannot delete anything: `insert_at_anchor`, which weaves after an exact
  // source phrase INSIDE a paragraph, and `insert_after`, which adds a paragraph following one.
  // Both leave every original byte in place by construction, so an interpretation can be woven
  // in after the observed action without the action being touched. `replace` hands back a whole
  // paragraph with no constraint on what comes out, and is refused in this mode.
  //
  // THIS IS SCOPED TO THE ENRICHMENT MODE AND NOWHERE ELSE. A picturability pass corrects what
  // contradicts itself and must be able to reword, so it keeps `replace`. A named-task pass is
  // governed by the caller's own CP_TASK terms. The judge-driven repair path authorizes a
  // `replace` per slot against a NAMED FAILED REQUIREMENT — a separately authorized revision,
  // with its own protected-passage rules — and is untouched. Nothing about the literary bar
  // changes: no instruction was added to compensate for the format, and the only prompt change
  // is which operations the reply shape offers.

  // ── THE PROSE BOUNDARY: MACHINE TRAILERS ARE NOT STORY PARAGRAPHS ─────────────────────────
  // (Roman 2026-11-04.) MEASURED on the preserved Sol opening, whose draft ends:
  //   [LORE: Sacrificiant ~ ritual_role ~ …]
  //   [CONSPIRACY: regional ambient]
  //   <!--sceneDuty: world_revelation | attraction: leaking-->
  // Those three lines are one paragraph and the name test above only knew CHARACTERS/TITLE/
  // SYNOPSIS, so the trailer was marked `isProse` — offered to the editor as an EDITABLE STORY
  // PARAGRAPH, and taken by the plot-protection derivation as "the last sentence of the
  // reader-facing draft", which displaced the actual closing choice from protection.
  //
  // TESTED BY WHAT REMAINS, NOT BY A LIST OF NAMES. A paragraph is machine metadata when
  // removing the bracket tags, the HTML comments and the control markers leaves nothing behind.
  // Any new trailer tag is covered the day it is introduced, and a prose paragraph that merely
  // contains one is still prose — only a paragraph that is ENTIRELY machine text is excluded.
  //
  // NOTHING IS STRIPPED. The paragraph keeps its bytes, its ref and its offsets, so every
  // existing consumer of the metadata still reads it and the splice still reassembles around
  // it: it is simply not editable and not story prose.
  function _machineOnlyParagraph(chunk) {
    var t = String(chunk)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<<[^>]*>>/g, '')
      .replace(/\[[A-Z][A-Z0-9_ \-]{0,40}:[^\]]*\]/g, '')
      .trim();
    return t.length === 0;
  }
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
      var isTrailer = !isMeta && !hasMarker && _machineOnlyParagraph(chunk);
      out.push({ ref: 'P' + (++n), text: chunk, start: start, end: start + chunk.length,
        isProse: !isMeta && !hasMarker && !isTrailer,
        why: isMeta ? 'metadata'
          : (hasMarker ? 'control markers' : (isTrailer ? 'machine trailer' : null)) });
    });
    return out;
  }

  // ── THE SCENE'S ACTUAL CLOSING PASSAGE ────────────────────────────────────────────────────
  // What production protects from the editor: the last sentence the READER reads. Derived from
  // the last PROSE paragraph, so a machine trailer can never stand in for the closing choice.
  // The caller used `sentences(readerFacing(draft)).pop()` directly, which on the Sol opening
  // returned the `<!--sceneDuty…-->` line and left the real closing question unprotected.
  function cpClosingPassage(draft) {
    var prose = paragraphsOf(readerFacing(draft)).filter(function (p) { return p.isProse; });
    if (!prose.length) return null;
    var sents = sentences(prose[prose.length - 1].text) || [];
    var last = sents.length ? String(sents[sents.length - 1]).trim() : '';
    return last.length > 12 ? last : null;
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
  //
  // ── THE THIRD OP: AN INSERTION ANCHORED INSIDE A PARAGRAPH (Roman 2026-11-06) ─────────────
  // WHY IT EXISTS. `replace` hands the model the whole paragraph and takes back whatever comes
  // out, so an additive enrichment and a deletion are the same operation to this splice. Measured
  // on P27 of the frozen continuation: the craft pass added one genuinely good clause and, in the
  // same replacement, removed five established sentences — her reaching for his belt, the
  // trousers dropping, an anatomical description, the first stroking, and his response — leaving
  // a dangling "once more" referring to prose that no longer existed. Nothing structural could
  // have caught that, because a replacement is permitted to say anything.
  //
  // `insert_at_anchor` carries an EXACT SOURCE ANCHOR and adds text immediately after it, inside
  // the paragraph. Every other byte of that paragraph survives BY CONSTRUCTION — not by a rule
  // the model is asked to respect, and not by a check that runs afterwards. Deleting an action
  // through this op is not possible. It reuses the existing byte-offset splice, the existing
  // protection and byte checks, and the existing applied-edit record; the validator settles the
  // anchor's existence and uniqueness before anything reaches here.
  function spliceAuthorized(draft, paragraphs, items) {
    var src = String(draft == null ? '' : draft);
    var byRef = {};
    (paragraphs || []).forEach(function (p) { byRef[p.ref] = p; });
    var ops = (items || []).map(function (it) {
      var p = byRef[it.ref];
      if (!p) return null;
      if (it.op === 'insert_at_anchor') {
        // Validated upstream: the anchor occurs EXACTLY ONCE in p.text. indexOf is therefore
        // the only occurrence, and the offset is inside this paragraph's own span.
        var _a = String(it.anchor || '');
        var _i = p.text.indexOf(_a);
        if (!_a || _i === -1) return null;
        var _at = p.start + _i + _a.length;
        // One separating space unless the anchor or the addition already supplies whitespace.
        var _lead = (/\s$/.test(_a) || /^\s/.test(it.text)) ? '' : ' ';
        return { start: _at, end: _at, text: _lead + it.text, ref: it.ref, op: it.op,
          replaced: '', anchor: _a, beatId: it.beatId };
      }
      return it.op === 'replace'
        ? { start: p.start, end: p.end, text: it.text, ref: it.ref, op: it.op, replaced: p.text, beatId: it.beatId }
        : { start: p.end, end: p.end, text: '\n\n' + it.text, ref: it.ref, op: it.op, replaced: '', beatId: it.beatId };
    }).filter(Boolean).sort(function (a, b) { return b.start - a.start; });
    var out = src;
    ops.forEach(function (o) { out = out.slice(0, o.start) + o.text + out.slice(o.end); });
    return { text: out, applied: ops.slice().reverse().map(function (o) {
      // THE AUDIT RECORD HAS TO BE REVIEWABLE FOR EVERY OP. A replacement is reviewed against
      // the prose it displaced, which is `replaced`. An insertion displaces nothing, so
      // `replaced` is correctly empty and the reviewable fact is WHERE it landed — the anchor it
      // followed. Carried so the host's before/after report can show an insertion in its place
      // rather than reporting an empty before and no position.
      return { tag: o.beatId, ref: o.ref, op: o.op, replaced: o.replaced,
        anchor: o.anchor || undefined, inserted: o.text.trim() }; }) };
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
    // ── TWO CONVENTIONS, ONE CORRECT RULE: THE PROVIDER'S OWN TOTAL ─────────────────────────
    // (Roman 2026-11-04, measured on saved receipts.) `ct + reasoning` is right for xAI and a
    // DOUBLE CHARGE for OpenAI:
    //   · grok-4.3    prompt 15,070 · completion 703   · total 16,945 · reasoning 1,172
    //                 total − prompt = 1,875 = completion + reasoning → reasoning is OUTSIDE.
    //   · gpt-6-luna  prompt 15,113 · completion 3,984 · total 19,097 · reasoning 3,150
    //                 total − prompt = 3,984 = completion exactly    → reasoning is INSIDE.
    // The second case took the `reasoning_field_without_matching_total` branch and billed 7,134
    // output tokens for 3,984 — $0.001575 over on one receipt, and it scaled with every
    // reasoning call. `total − prompt` is what the provider says it billed and is right for
    // both; the reasoning count stays for reporting and is no longer an addend.
    var billedOut, basis;
    if (totalGiven) {
      billedOut = usage.total_tokens - pt;
      basis = verifiedReasoningShape ? 'total_minus_prompt_reasoning_outside_completion'
        : (billedOut === ct ? 'total_minus_prompt_reasoning_inside_completion'
           : 'total_minus_prompt');
    } else if (hasReasoningField) {
      // No total to trust: charge conservatively rather than risk under-billing.
      billedOut = ct + reasoning; basis = 'completion_plus_reasoning_no_total_to_verify';
    } else { billedOut = ct; basis = 'completion_only_reasoning_not_reported'; }
    var cached = (usage.prompt_tokens_details
      && typeof usage.prompt_tokens_details.cached_tokens === 'number')
      ? usage.prompt_tokens_details.cached_tokens : 0;
    return { ok: true, present: true, shape: 'openai', inTok: pt, outTok: billedOut,
      completionTok: ct, reasoningTok: reasoning, outputBasis: basis,
      reasoningAccounted: basis !== 'completion_only_reasoning_not_reported',
      cacheWriteTok: (usage.prompt_tokens_details
        && typeof usage.prompt_tokens_details.cache_write_tokens === 'number')
        ? usage.prompt_tokens_details.cache_write_tokens : 0,
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
                   'grok-4.3':                  { in: 0.00000125, out: 0.0000025 },
                   // ── TWO COMPARISON ARMS, PRICED FROM THEIR OWN ROUTES ────────────────────
                   // gpt-6.1-sol: $2.00 / $10.00 per MTok, the figures api/sol-scene-test.js
                   // already prices its per-call cap with (`RATE = { in: 2.0, out: 10.0 }`).
                   'gpt-6.1-sol':               { in: 0.000002,   out: 0.00001 },
                   // gpt-6-luna: $0.10 / $0.50 per MTok, standard rates, Roman's figures from
                   // developers.openai.com/api/docs/models/gpt-6-luna. No prompt-length tier.
                   'gpt-6-luna':                { in: 0.0000001,  out: 0.0000005 },
                   // claude-haiku-5-5 is the one current model priced BY PROMPT LENGTH:
                   // $0.10 / $0.50 per MTok up to 100,000 input tokens, $0.50 / $2.50 above it
                   // (recorded in api/anthropic-proxy.js's allowlist note). A single pair of
                   // numbers would misprice it on one side of that boundary, so the tier
                   // travels with the rate and the reservation picks by its OWN input estimate.
                   'claude-haiku-5-5':          { in: 0.0000001,  out: 0.0000005,
                                                  aboveInTok: 100000,
                                                  inAbove: 0.0000005, outAbove: 0.0000025 } };
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
    // A PROMPT-LENGTH TIER, APPLIED FROM THIS REQUEST'S OWN ESTIMATE. Only models that declare
    // `aboveInTok` have one; everyone else is unaffected and prices exactly as before.
    var rIn = rate.in, rOut = rate.out, tier = null;
    if (rate.aboveInTok && inTok > rate.aboveInTok) {
      rIn = rate.inAbove; rOut = rate.outAbove;
      tier = 'above ' + rate.aboveInTok + ' input tokens';
    } else if (rate.aboveInTok) {
      tier = 'up to ' + rate.aboveInTok + ' input tokens';
    }
    var raw = inTok * rIn + outTok * rOut;
    return { bounded: true, usd: raw * EB_SAFETY_MARGIN, raw: raw, model: m,
      chars: chars, inTok: inTok, outTok: outTok, charsPerToken: cpt, tier: tier,
      rateIn: rIn, rateOut: rOut,
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
      passage: 'I kept my eyes on a grafted pair of old sycamores, studying the smooth white '
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
  // ── THE RECORD KEEPS BOTH SUPPORTING PASSAGES ─────────────────────────────────────────────
  // (Roman 2026-11-04.) It used to take ONE `publishedPassage` and credit a Character+ delivery
  // on it. With a grounding-only edit that meant an inserted appearance sentence was filed as
  // the C+ manifestation — the Dohkar's introduction recorded against "thick violet hair
  // brushing his narrow, pearl-grey face". The two findings have two passages and the record
  // keeps both: `perceptionPassage` is the Character+ manifestation, `groundingPassage` is the
  // description. Neither stands in for the other.
  //
  // `completion` (from cpAssessObligationCompletion) decides the tier. EDITOR_REVIEWED requires
  // BOTH findings supported in the published text; anything less is DIRECTED — work was done and
  // nothing is credited, so the cadence does not advance.
  function cpEditorDeliveryRecord(opts) {
    opts = opts || {};
    var reader = String(opts.reader || '');
    var comp = (opts.completion && typeof opts.completion === 'object') ? opts.completion : null;
    // The perception passage is the Character+ manifestation. `publishedPassage` remains
    // accepted as its legacy name so existing callers keep working unchanged.
    var pq = normalise(comp ? (comp.perception && comp.perception.passage)
      : opts.publishedPassage);
    var gq = normalise(comp ? (comp.grounding && comp.grounding.passage) : opts.groundingPassage);
    // ── THE ASSESSMENT IS TRUSTED WHERE IT EXISTS ──────────────────────────────────────────
    // (Roman 2026-11-04.) Re-checking here against the CURRENT scene undid the prior-evidence
    // fix one layer down: a grounding passage published in an earlier scene is legitimately
    // absent from this one, and re-testing it against this scene's text would deny credit for
    // correctly NOT re-describing a familiar character. cpAssessObligationCompletion already
    // verified each finding against its own proper source and says which; this records that
    // result rather than re-deriving it from the wrong text.
    var pPresent = comp ? !!(comp.perception && comp.perception.supported)
      : !!(pq && quotePresent(pq, reader));
    var gPresent = comp ? !!(comp.grounding && comp.grounding.supported)
      : !!(gq && quotePresent(gq, reader));
    // WITHOUT A COMPLETION ASSESSMENT this behaves exactly as before: the one passage it was
    // given decides the tier. An older caller is not silently held to the new requirement.
    var complete = comp ? (pPresent && gPresent) : pPresent;
    return {
      verification: complete ? CP_DELIVERY.EDITOR_REVIEWED : CP_DELIVERY.DIRECTED,
      // Kept apart, deliberately. The C+ manifestation is the perception passage and nothing
      // else; a description is never promoted into that slot.
      publishedPassage: pPresent ? pq : null,     // legacy name for the perception passage
      perceptionPassage: pPresent ? pq : null,
      groundingPassage: gPresent ? gq : null,
      perceptionSupported: pPresent,
      groundingSupported: gPresent,
      // PRESERVED THROUGH RECORDING: a passage credited from earlier published prose says so,
      // so nothing downstream reads its absence from this scene as a failure.
      groundingVerifiedAgainst: comp
        ? ((comp.grounding && comp.grounding.verifiedAgainst) || null)
        : (gPresent ? 'finished_scene' : null),
      groundingBasis: comp ? ((comp.grounding && comp.grounding.basis) || null) : null,
      publishedRevision: opts.revisionId || null,
      decision: opts.decision || null,            // 'keep' | 'edit'
      // SAID PLAINLY, ON EVERY RECORD: nobody checked whether this is GOOD. A quotation check
      // establishes that the passage EXISTS in the published text, never that it means what the
      // editor said it means.
      semanticallyVerified: false,
      basis: complete
        ? (comp
            ? 'both findings are supported by passages present in the published text — their '
              + 'EXISTENCE is verified, their sufficiency is not'
            : 'the dedicated editor answered and the passage is present in the published text')
        : (!pPresent
            // KEEPS THE PHRASE THE EXISTING CONTRACT READS. §17p of the editor integration
            // suite asserts "NOT in the published text" here, and that wording is exactly
            // right for both callers: the legacy single-passage one and the completion one.
            ? 'the Character+ passage is NOT in the published text — nothing is credited, '
              + 'whatever prose the edit produced'
            : 'the Character+ passage is present but physical grounding is not supported — the '
              + 'obligation is not complete and is not credited'),
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
      // ── A FRAME BEAT'S ELIGIBILITY COMES FROM THE RESOLVED OPENING ROSTER ────────────
      // `onStage` here is the craft pass's own roster, which in the measured Scene 1 held only
      // Dani — so Helen's frame obligation was dropped as "not on stage" while the ACCEPTED
      // stage had her present and acting as the opening actor. A frame beat is checked against
      // the roster the scene was accepted with.
      // ── AN ADMIRATION OBLIGATION IS ABOUT THE LI, AND THE LI MUST BE IN THE SCENE ────
      // Checked on its own terms rather than folded into the frame branch, where an
      // "LI is on the roster" fallback wrongly admitted an obligation labelled for a DIFFERENT
      // character, and an empty roster admitted everything.
      if (o.kind === 'li_admiration') {
        if (!liName || key !== liName) {
          return deferred.push({ label: o.label, id: o.id || null,
            why: 'an admiration obligation must name the LI; this one names '
              + (o.label || '(nobody)') });
        }
        var admRoster = {};
        (opts.frameRoster || []).forEach(function (p) {
          if (!p) return;
          if (p.label) admRoster[String(p.label).toLowerCase()] = 1;
          if (p.id) admRoster[String(p.id).toLowerCase()] = 1;
        });
        // With a resolved roster, use it; without one, fall back to the craft pass's own
        // on-stage map rather than letting the obligation through unchecked.
        var admPresent = (opts.frameRoster || []).length
          ? !!admRoster[key] : !!onStage[key];
        if (!admPresent) {
          return deferred.push({ label: o.label, id: o.id || null,
            why: 'the LI is not present in this scene, so there is nothing to admire' });
        }
      } else if (o.kind === 'character_plus_frame') {
        var fr = {};
        (opts.frameRoster || []).forEach(function (p) {
          if (!p) return;
          if (p.label) fr[String(p.label).toLowerCase()] = 1;
          if (p.id) fr[String(p.id).toLowerCase()] = 1;
        });
        // The admiration obligations carry the LI's NAME as their label but a `liadmire:` id,
        // so the id lookup never matches a roster entry; the label and the LI ref are what can.
        var okFrame = fr[key] || fr[String(o.id || '').toLowerCase()];
        if (!okFrame && (opts.frameRoster || []).length) {
          return deferred.push({ label: o.label, id: o.id || null,
            why: 'not on the resolved roster for this scene' });
        }
      } else if (!onStage[key]) {
        return deferred.push({ label: o.label, id: o.id || null,
          why: 'not on stage in this scene' });
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
        // ── A FRAME OBLIGATION KEEPS ITS OWN ID AND INSTRUCTIONS (Roman 2026-11-17) ───────
        // This rebuilt every id from the character's NAME, so two distinct frame beats for two
        // characters both collapsed to `cplus:dani_macbrayne` in the craft POST, and the frame
        // text, slots and ask were dropped entirely. A beat whose id cannot round-trip cannot be
        // settled against the published page.
        // GENERALISED 2026-11-18: the carve-out above was for `character_plus_frame` only, so
        // the next kind to bring its own id hit the same bug. Scene 4 raised
        // `liadmire:social` and `liadmire:capability`, both labelled "Roman Tusk" — had they
        // survived scheduling, BOTH would have been rebuilt as `cplus:roman_tusk`, becoming one
        // indistinguishable obligation with its instructions dropped. ANY obligation that
        // arrives with its own namespaced id keeps it; only an id-less one is derived from the
        // name, which is the one case where the name is all there is.
        id: (o && typeof o.id === 'string' && o.id.indexOf(':') !== -1)
          ? o.id
          : ('cplus:' + key.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')),
        frameTitle: (o && o.frameTitle) || undefined,
        frameText: (o && o.frameText) || undefined,
        frameSlots: (o && o.frameSlots) || undefined,
        ask: (o && o.ask) || undefined,
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
        if (o.kind === 'introduction' || o.kind === 'fusion' || o.kind === 'li_admiration') return 1;
        return 2; };
      return rank(a) - rank(b);
    });
    // ── INTRODUCTIONS ARE NEVER DROPPED; RECURRING WORK CAN WAIT ───────────────────────────────
    // A FUSION OBLIGATION KEEPS THE SAME STANDING AS AN INTRODUCTION: it must remain visible
    // even when every ordinary NPC Character+ is already satisfied, because nothing else in the
    // scene can satisfy it.
    // AN ADMIRATION AREA KEEPS THE SAME STANDING, for the same stated reason: it is ISSUE-level
    // coverage and nothing else in the scene can satisfy it. MEASURED on Scene 4: three frame
    // beats filled CP_EDITOR_SOFT_DUE (5) first, and `liadmire:capability` was deferred as
    // "the scene already covers 5 obligation(s)" — so an area the issue owes was dropped
    // silently while a recurring depiction that is explicitly allowed to wait took its place.
    // At most three areas exist and only OWED ones are ever raised, so this adds at most three
    // and stays far inside CP_EDITOR_HARD_DUE (12), which still refuses loudly.
    var _neverDrop = function (o) {
      return o.kind === 'introduction' || o.kind === 'fusion' || o.kind === 'li_admiration'; };
    var intros = due.filter(_neverDrop);
    var recurring = due.filter(function (o) { return !_neverDrop(o); });
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
    // ── THE CURRENT ENCOUNTER IS THE EDITABLE PROSE, WHATEVER ITS EXTENT ───────────────────
    // (Roman 2026-11-06.) `editableRefs` already bounded what MAY BE CHANGED. Nothing bounded
    // what may be CITED, so a grounding finding about the editable prose was answerable from
    // prose the pass could not touch — measured on both providers, which quoted P2/P3 and called
    // it `basis: "scene"`.
    //
    // THE ENCOUNTER IS DEFINED BY THE CALL SITE, NOT BY A WINDOWING SYSTEM. At the ordinary
    // production call site no `editableRefs` is supplied, so the whole scene is editable and
    // `encounterText` IS the scene — which is correct, not a gap: a normal scene is the current
    // encounter, and nothing needs to be built for that case. `restricted` is true only when a
    // caller is deliberately editing part of a scene, which is what the continuation pass does.
    //
    // WHAT THE CHECK CANNOT DO, STATED PLAINLY: inside one unrestricted scene it cannot tell a
    // lead-in from the encounter that follows it, because nothing in the text marks the boundary
    // and no deterministic check can find one. A caller that wants only part of a scene judged
    // says so with `editableRefs`. The check enforces the boundary it is given; it does not
    // discover one.
    var _restricted = false;
    if (Array.isArray(editableRefs) && editableRefs.length) {
      var allow = {};
      editableRefs.forEach(function (r) { allow[String(r)] = 1; });
      var _all = prose.length;
      prose = prose.filter(function (p) { return allow[String(p.ref)]; });
      _restricted = prose.length < _all;
    }
    return {
      restricted: _restricted,
      encounterText: prose.map(function (p) { return p.text; }).join('\n\n'),
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

  // ── THE REPLY SHAPE FOR A NAMED-TASK PASS ─────────────────────────────────────────────────
  // One decision per obligation still, because the obligations are what the splice authorizes
  // against — but the QUESTION is the task, and no grounding finding is requested or validated.
  // `validateSceneEditorReply` is called without groundingIds for these, so a reply that omits
  // the grounding object is accepted rather than rejected.
  // ── THE PICTURABILITY REPLY SHAPE ─────────────────────────────────────────────────────────
  // One decision per PERSON, because picturability is a per-person question. It asks for the
  // grounding finding and nothing else: no perception claim, no obligation certification.
  function pictureEditorContract(ids, refs) {
    return [
      'Return ONLY JSON with BOTH arrays, in this shape:',
      '',
      '{"decisions":[',
      '   {"id":"<person id>","decision":"keep","keptPassage":"<copied EXACTLY from the scene>",',
      '    "grounding":{"recognizable":true,"basis":"scene|prior|unknown","evidence":"<copied EXACTLY>","why":"<name the feature, voice, bearing or habit>"}},',
      '   {"id":"<person id>","decision":"edit","ref":"<the paragraph you chose>","why":"<what you added and why it helps>",',
      '    "grounding":{"recognizable":false,"basis":"scene","evidence":null}}',
      ' ],',
      ' "edits":[',
      '   {"ref":"<paragraph ref>","op":"replace","text":"<prose>","forObligations":["<id>"]}',
      ' ]}',
      '',
      'ONE DECISION PER PERSON, for all of these: ' + (ids || []).join(', '),
      '',
      'WHERE EVIDENCE COMES FROM, BY DECISION \u2014 both decisions name a passage.',
      'On a KEEP, `grounding.evidence` quotes prose that ALREADY EXISTS: this scene, or one of',
      'that person\'s supplied published passages.',
      'On an EDIT, `grounding.evidence` quotes THE PASSAGE INSIDE YOUR OWN `text` that carries',
      'the physical grounding \u2014 copied verbatim from the replacement you are proposing, not a',
      'summary of it and not a sentence you leave out of the edit. It is checked against the',
      'FINISHED scene after your edits are spliced in. An edit that names no passage is recorded',
      'as applied with its picturability requirement UNMET: having changed a line is not',
      'evidence that the reader can now see anyone.',
      '',
      'YOU CHOOSE THE PARAGRAPH. Any of these may be edited: ' + (refs || []).join(' '),
      'THOSE PARAGRAPHS ARE THE ENCOUNTER YOU ARE JUDGING — ordinarily the whole scene, and a',
      'range of it when you are editing only part of one. Anything outside them is supplied for',
      'context and is read-only. On a KEEP with basis "scene", `grounding.evidence` must come',
      'from one of the paragraphs listed above: a quote from read-only prose is continuity,',
      'not a finding about this encounter, and it is recorded as unanswered rather than accepted.',
      'Three ops are available:',
      '  "replace"          — the paragraph\'s full text, replaced by yours.',
      '  "insert_after"     — a new paragraph following that ref.',
      '  "insert_at_anchor" — your text inserted INSIDE the paragraph, immediately after an',
      '                       exact source quote you supply as "anchor". Everything else in that',
      '                       paragraph survives untouched. Prefer this when you are ADDING a',
      '                       detail rather than correcting one. The anchor must be copied',
      '                       byte-exact and must occur exactly once in that paragraph.',
      '                       `text` IS ONLY THE NEW PROSE. Do not repeat the anchor in it, and',
      '                       do not carry over the sentence that follows the anchor — those',
      '                       sentences stay where they are, and copying one back publishes it',
      '                       twice, which is rejected.',
      '',
      'A CORRECTION STAYS NARROW. Where you fix clothing, position or movement that contradicts',
      'itself, change the thing that contradicts and nothing else: no action removed, none added,',
      'none reordered. An edit that rewrites the events around the correction is the wrong edit.',
      '',
      'ONE TEXT PER PARAGRAPH. If two people belong in the same paragraph, give that paragraph a',
      'SINGLE replacement serving both and list both under forObligations.',
      '',
      'EVERY CHARACTER DECISION CARRIES BOTH FINDINGS (' + (ids || []).join(', ') + ') \u2014 here,',
      'the finding is picturability, reported per person.',
      '',
      'THAT QUESTION IS NOT ASKED OF THIS SCENE ALONE. `grounding.basis` says what your answer',
      'stands on, and all three are legitimate:',
      '  "scene"   \u2014 `grounding.evidence` quotes THIS SCENE verbatim.',
      '  "prior"   \u2014 `grounding.evidence` quotes one of that person\'s supplied published',
      '              passages verbatim; the reader has read it and needs no reminder here.',
      '  "unknown" \u2014 the supplied history is INCOMPLETE and you cannot tell. No quote;',
      '              `grounding.why` says what you are unsure of. It records uncertainty and',
      '              certifies nothing. UNAVAILABLE where historyComplete is true.',
      '',
      'NO REVELATION IS REQUIRED OF YOU. A physical reminder does not have to expose anyone, mean',
      'anything, or advance the plot. It has to let the reader see the person.',
      'FAMILIAR FEATURES MAY RECUR \u2014 through movement, clothing, proximity or what the',
      'viewpoint notices. A returning person needs no NEW trait: recalling one the reader already',
      'has is often the better answer.',
      'A KEEP is the right answer whenever the reader can already picture someone. It is not a way',
      'to decline: quote the passage that does it.',
      'An edit must preserve every protectedPassage verbatim and must remove nothing the scene has.'
    ].join('\n');
  }

  function taskEditorContract(ids, refs) {
    return [
      'Return ONLY JSON with BOTH arrays, in this shape:',
      '',
      '{"decisions":[',
      '   {"id":"<obligation id>","decision":"keep","keptPassage":"<copied EXACTLY from the scene>","why":"<how this passage already achieves the task>"},',
      '   {"id":"<obligation id>","decision":"edit","ref":"<the paragraph you chose>","why":"<what your edit does for the task>"}',
      ' ],',
      ' "edits":[',
      '   {"ref":"<paragraph ref>","op":"replace","text":"<prose>","forObligations":["<id>"]}',
      ' ]}',
      '',
      'ONE DECISION, on the task. Its id is: ' + (ids || []).join(', '),
      'You are NOT certifying a list of people. Answer the task once: either the scene already',
      'achieves it (KEEP, quoting the passage that does) or it does not (EDIT, with the targeted',
      'changes that achieve it). Several edits may serve the one decision — list them all under',
      'the same id.',
      '',
      'YOU CHOOSE THE PARAGRAPH. Any of these may be edited: ' + (refs || []).join(' '),
      'op is "replace" for an existing paragraph, or "insert_after" to add one following that ref.',
      '',
      'ONE TEXT PER PARAGRAPH. If two obligations belong in the same paragraph, give that',
      'paragraph a SINGLE replacement serving both and list both under forObligations.',
      '',
      'A KEEP must quote the scene verbatim. It is a legitimate answer when the task\'s effect',
      'is already achieved; it is not a way to decline the task.',
      'An edit must preserve every protectedPassage verbatim and must not remove anything the',
      'scene already has.'
    ].join('\n');
  }

  function sceneEditorContract(ids, refs, envIds, groundIds) {
    return [
      'Return ONLY JSON with BOTH arrays, in this shape:',
      '',
      '{"decisions":[',
      '   {"id":"<obligation id>","decision":"keep","keptPassage":"<copied EXACTLY from the scene>","why":"<one sentence>",',
      '    "grounding":{"recognizable":true,"basis":"scene|prior|established","evidence":"<copied EXACTLY from the scene, or from that person\'s supplied published passages>","why":"<one sentence>"}},',
      '   {"id":"<obligation id>","decision":"edit","ref":"<the paragraph you chose>","why":"<one sentence>",',
      '    "perception":{"passage":"<the passage that satisfies this character\'s own requirement in the FINISHED scene — existing prose you are leaving alone, or text you are adding>","why":"<one sentence>"},',
      '    "grounding":{"recognizable":true,"basis":"scene","evidence":"<the passage that lets the reader picture them in the FINISHED scene>","why":"<name the feature, voice, bearing or habit>"}}',
      ' ],',
      ' "edits":[',
      '   {"ref":"<paragraph ref>","op":"insert_at_anchor","anchor":"<exact source text yours follows>","text":"<prose>","forObligations":["<id>"]}',
      ' ]}',
      '',
      'ONE DECISION PER OBLIGATION, for all of these: ' + (ids || []).join(', '),
      '',
      'YOU CHOOSE THE PARAGRAPH. Any of these may be edited: ' + (refs || []).join(' '),
      'Pick the paragraph where the depiction genuinely belongs — the moment that affords it.',
      'A paragraph merely MENTIONING the person is not necessarily the right place.',
      '',
      'THIS PASS ADDS. TWO OPS ARE AVAILABLE, and the first is the one it usually wants:',
      '  "insert_at_anchor" — your sentence woven INTO the paragraph, immediately after an exact',
      '                       source quote you supply as "anchor". Everything else in that',
      '                       paragraph stays exactly as it is, so the action you are reading is',
      '                       still there to be read. `text` IS ONLY YOUR NEW PROSE: do not',
      '                       repeat the anchor in it and do not carry over the sentence that',
      '                       follows the anchor — those stay where they are, and copying one',
      '                       back publishes it twice, which is rejected. The anchor is copied',
      '                       byte-exact and must occur exactly once in that paragraph:',
      '                       {"ref":"<ref>","op":"insert_at_anchor","anchor":"<exact source',
      '                       sentence yours follows>","text":"<your sentence>",',
      '                       "forObligations":["<id>"]}',
      '  "insert_after"     — a new paragraph following that ref. Use it sparingly: a paragraph',
      '                       of interpretation standing on its own is usually the weaker answer.',
      '"replace" IS NOT AVAILABLE IN THIS PASS and is rejected, leaving the paragraph as written',
      'and the obligation unanswered. This is not a judgement about what you would have written:',
      'a returned paragraph can silently lose an undressing, a movement or a response, and the',
      'pass cannot tell that from a rewrite, so the operation is withheld rather than policed.',
      'WRITE AS YOU WOULD ANYWAY. The standard, the mechanisms and the tests are unchanged; what',
      'changes is where your sentence goes. If your line reads best fused with an existing',
      'sentence, anchor on that sentence and let yours follow it.',
      '',
      'ONE TEXT PER PARAGRAPH. If two obligations belong in the same paragraph, give that',
      'paragraph a SINGLE addition serving both and list both under forObligations. Never return',
      'two texts for the same ref.',
      '',
      'A KEEP must quote the scene verbatim, and is available ONLY where existing prose already',
      'satisfies that character\'s own applicable requirement. It is not a way to decline.',
      ''
    ].concat((groundIds && groundIds.length) ? [
      'EVERY CHARACTER DECISION CARRIES BOTH FINDINGS (' + groundIds.join(', ') + ').',
      '`grounding.recognizable` answers the SECOND finding only: can the reader picture or',
      'recognize this person? A posture, a silence or a generic hand movement is not evidence.',
      '',
      'THAT QUESTION IS NOT ASKED OF THIS SCENE ALONE. `grounding.basis` says what your answer',
      'stands on, and all three are legitimate:',
      '  "scene"       — `grounding.evidence` quotes THIS SCENE verbatim.',
      '  "prior"       — `grounding.evidence` quotes one of that person\'s supplied published',
      '                  passages verbatim; the reader has read it and needs no reminder here.',
      '  "unknown"     — the supplied history is INCOMPLETE and you cannot tell. No quote;',
      '                  `grounding.why` says what you are unsure of. It records uncertainty: it',
      '                  neither forces a description nor certifies one was delivered, and it is',
      '                  NOT a finding that the reader can picture them. UNAVAILABLE where',
      '                  historyComplete is true — in an opening there is no earlier prose to',
      '                  appeal to, and a bare claim of one is REJECTED.',
      'A KEEP REQUIRES BOTH: existing prose satisfying the perception requirement AND',
      'grounding.recognizable true on one of those three bases. PERCEPTION FULFILLED WITH THE',
      'READER UNABLE TO PICTURE SOMEONE IS AN EDIT — choose a paragraph and weave the identifying',
      'details into the action it already has. A keep reporting recognizable false, or omitting',
      'the grounding field, or quoting evidence that is not in the source its basis names, is',
      'REJECTED and that obligation goes unanswered.',
      'A SCENE WITH NO DESCRIPTION IN IT IS NOT A FAILURE. Do not edit for grounding merely',
      'because this scene carries none; edit when the reader cannot picture the person, or when a',
      'return after an absence wants one familiar feature recalled.',
      '',
      'AN EDIT CARRIES BOTH FINDINGS TOO, AND THIS IS JUDGED ON THE FINISHED SCENE.',
      'For every character decision, `perception.passage` names the passage that satisfies that',
      'character\'s own requirement and `grounding.evidence` names the passage that lets the',
      'reader picture them — BOTH AS THE SCENE WILL READ AFTER YOUR EDITS ARE APPLIED. The two',
      'may be DIFFERENT PASSAGES and they may come from different places: existing prose you are',
      'leaving untouched can carry one while your new text carries the other. That is the',
      'expected case, and it is why you are NOT asked to write fresh characterization for',
      'someone the scene already characterizes — quote what is already there.',
      'QUOTE FROM THE FINISHED SCENE. A passage you overwrite is gone: if your edit replaces the',
      'paragraph holding the perception, the quote must be the text you are putting there instead.',
      'A GROUNDING-ONLY EDIT IS STILL WORTH MAKING. If you can ground someone but cannot point',
      'at a passage that satisfies their perception requirement, make the edit and leave',
      '`perception.passage` null — the edit will be applied and the obligation reported as still',
      'owed. What you must not do is claim a passage that is not there.',
      'IN `grounding.why`, NAME THE FEATURE, VOICE, BEARING OR HABIT the reader comes away with.',
      '"it supplies the details that make him recognizable" RESTATES THE VERDICT and explains',
      'nothing — if you cannot name the thing itself, the impression is not there and the edit is',
      'owed. Where you edit for grounding alone, say so there, and keep the perception passage',
      'intact.',
      ''
    ] : []).concat([
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
    ] : [])).join('\n');
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
    // ── TASK MODE ANSWERS ONE QUESTION, SO IT CARRIES ONE ID (Roman 2026-11-05) ───────────
    // The validator keys decisions by obligation id, so asking for a single decision on the
    // objective needs an id for it. In task mode the id space IS the task: no Character+
    // obligation is listed, requested or certified. Ordinary mode is unchanged.
    var _taskModeIds = (opts.task && opts.task.objective)
      ? ['task:' + String(opts.task.id || 'objective')] : null;
    var ids = _taskModeIds || cpIds.concat(envDueIds);
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
    // ══ PERSON-LINKED PUBLISHED PROSE: THE SECOND SOURCE THE GROUNDING FINDING MAY STAND ON ══
    // (Roman 2026-11-04.) WHY THIS EXISTS. The grounding finding first accepted evidence quoted
    // from the scene in front of the editor and nothing else, which made a KEEP impossible for a
    // character described in an earlier scene and developed here through dialogue — a per-scene
    // description quota enforced by validation, under a prompt that says there is no quota.
    //
    // A BIBLE IS NOT PUBLISHED EVIDENCE. The appearance records above are CANON; these are prose
    // the reader has actually read. They are different things and they are kept apart: a record
    // can never satisfy this finding, and a published passage can.
    //
    // THE ROWS ARE THE DELIVERY LEDGER'S OWN SHAPE, so production forwards what it already holds
    // and no transform in between can drift. Matched on WHOLE label equality, never a substring:
    // "Seren" must not collect "Seren's mother".
    var _priorRows = (Array.isArray(opts.priorCharacterPassages) ? opts.priorCharacterPassages : [])
      .map(function (r) {
        if (!r) return null;
        var nm = normalise(r.name || r.character || '');
        var tx = normalise(r.passage || r.publishedPassage || '');
        if (!nm || !tx) return null;
        return { name: nm, passage: tx, ordinal: (r.ordinal != null) ? r.ordinal : null };
      }).filter(Boolean);
    var _priorFor = {};        // obligation id -> [passages]
    dueList.forEach(function (o) {
      var nm = normalise((o && o.character) || '').toLowerCase();
      if (!nm) return;
      var mine = _priorRows.filter(function (r) { return r.name.toLowerCase() === nm; });
      if (mine.length) _priorFor[o.id] = mine.map(function (r) { return r.passage; });
    });
    // The corpus the validator checks a "prior" quote against: one string per obligation.
    var _priorCorpus = {};
    Object.keys(_priorFor).forEach(function (id) {
      _priorCorpus[id] = _priorFor[id].join('\n\n');
    });
    // ── KNOWN-COMPLETE HISTORY vs INCOMPLETE HISTORY ──────────────────────────────────────
    // (Roman 2026-11-04.) These are different situations and the grounding finding must not
    // treat them alike. In an OPENING the history is complete BY CONSTRUCTION — no scene has
    // been published before it, so there is nothing earlier for a claim of prior description to
    // appeal to, and "the reader already knows his appearance" is not an abbreviated record but
    // a false statement. Recognizability is then judged from the scene and the supplied passages
    // alone. Where the history genuinely IS abbreviated, uncertainty is recordable — as
    // uncertainty, never as grounding.
    //
    // DERIVED, NOT GUESSED. `sceneOrdinal <= 1` is a structural fact about the story, not an
    // inference from prose. A caller that knows more may state it with `historyComplete`; absent
    // both, the history is treated as INCOMPLETE, which is the conservative reading — it allows
    // uncertainty rather than forcing a description.
    var _histComplete = (opts.historyComplete === true)
      || (opts.sceneOrdinal != null && Number(opts.sceneOrdinal) <= 1);
    var examples = opts.examples || null;

    // ══ TASK MODE OMITS THE CHARACTER+ ASSIGNMENT ENTIRELY (Roman 2026-11-05) ═══════════
    // MEASURED on the frozen romance request: replacing the grounding block was not enough. Line
    // 1 still read "You are the dedicated Character+ editor … 4 people due a depiction", and the
    // request went on to teach Fusion, social proof, the protagonist's own depiction channels and
    // the worked Character+ transformations. The pass was handed a competing assignment and did
    // it. In task mode the whole Character+ apparatus is omitted — header, teaching, examples —
    // and what remains is the scene, the canon, the viewpoint, the protections and the task.
    var _pictureMode = opts.mode === 'picturability';
    var _taskMode = !_pictureMode && !!(opts.task && opts.task.objective);
    var sys = _pictureMode ? [
      'You are a prose editor for an ongoing illustrated story. One scene, ONE reply, ONE task:',
      'CAN THE READER SEE THESE PEOPLE?',
      '',
      'This is NOT a Character+ pass. Nobody here is due a depiction, a revelation or an',
      'environmental beat, and you are not being asked for one. You are asked only whether each',
      'person below is sufficiently physically present on the page, and to supply what is missing.',
      '',
      'THE AUTHOR IS EXPECTED TO WRITE EMBODIED PEOPLE ALREADY. This pass catches omissions; it',
      'is not the place description comes from. Where the scene already does it, KEEP.'
    ] : _taskMode ? [
      'You are a prose editor for an ongoing illustrated story. One scene, ONE reply, ONE task.',
      '',
      'This is NOT a Character+ pass and NOT a description pass. You are not assigned anyone to '
        + 'depict. The task you are doing is stated below, and nothing else is being asked of you.'
    ] : [
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
    // E+ AND FUSION BELONG TO THE OTHER PASS. Picturability is about people, so it carries no
    // environmental obligations even when the caller forwards them. Gated HERE rather than on
    // the forward list, because a key missing from that list silently never arrives at all.
    var envDueRaw = (!_pictureMode && Array.isArray(opts.environmentDue)) ? opts.environmentDue : [];
    var fusionDue = dueList.concat(envDueRaw)
      .filter(function (o) { return o && o.requiresFusion; });
    var fusionIsEnvOnly = fusionDue.length > 0
      && !dueList.some(function (o) { return o && o.requiresFusion; });
    // opts.reflectiveScaffold is opt-in; absent, this is exactly the previous call.
    if (!_taskMode && fusionDue.length) sys.push('', CP_FUSION.editorBlock(
      { reflectiveScaffold: !!opts.reflectiveScaffold }));
    // THE SELECTION AID APPLIES TO ANY ENVIRONMENTAL WORK, not only Fusion: it answers "which
    // feature", which an environmental obligation asks just as much. Emitted here when
    // environmental work is due without a Fusion (the Fusion block already carries it).
    if (!_taskMode && !fusionDue.length && envDueIds.length) {
      sys.push('', opts.reflectiveScaffold
        ? CP_FUSION.reflectiveScaffold
        : CP_FUSION.scenePressure + '\n' + CP_FUSION.scenePressureBoundaries);
    }
    // THE SOCIAL-WEIGHT ALGORITHM TRAVELS WITH THE REQUIREMENT. It is emitted only when a
    // social-proof obligation is actually due, so a scene without one is not taught it.
    if (!_taskMode && dueList.some(function (o) { return o.requiresSocialProof; })) {
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
    if (!_taskMode && pcDue.length) {
      sys.push('', CP_PC.channels + (fusionDue.length ? ' ' + CP_PC.withFusion : ''));
    }
    // ── FUSION BEYOND THE OPENING: PREFER ONE PASSAGE, NEVER FORCE IT ───────────────────────
    // When environmental work and the protagonist's own depiction are both owed, one passage that
    // does both is the better answer — that is what Fusion IS, and it is available in any scene,
    // not just the opening. But forcing the combination where it weakens either is worse than two
    // passages: E+ may stand alone, and a brief return callback owes no psychological discovery.
    if (!_taskMode && envDue.length && pcDue.length) {
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
    // The C+ doctrine excerpt is Character+ teaching, so it is omitted in task mode too.
    // The canonical Character+ doctrine is C+ teaching: neither a task pass nor a picturability
    // pass carries it. This is the "give each pass only its own teaching" rule.
    if (!_taskMode && !_pictureMode && doctrine) sys.push('', doctrine);
    // \u2500\u2500 THE GROUNDING REQUIREMENT TRAVELS WITH THE PEOPLE, NOT WITH THE RECORDS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // Emitted whenever anyone is due, INCLUDING when no appearance record was supplied at all.
    // Gating it on `_apprLines` would have skipped exactly the character who needs it most: the
    // presiding Dohkar has no body bible (antagonistBodyBible was null for the Sol opening,
    // because he resolved as a role rather than an identity), so a record-gated instruction
    // would reach every character the reader can already picture and none of the ones they
    // cannot. Environmental-only passes still emit nothing.
    // ══ THE TASK MODE DECIDES WHAT THIS PASS IS FOR (Roman 2026-11-05) ═══════════════════
    // A romance pass is a DIFFERENT EDITING TASK, not a brief attached to the grounding block.
    // Measured: supplying the romance objective through `doctrine` while the request still
    // asked the four Character+/grounding questions produced four KEEPs and zero romance work
    // — the model answered the questions it was actually asked. When `opts.task` names a
    // different objective, THAT objective replaces the grounding block as the pass's task, and
    // the contract asks for it. Absent `opts.task` this is byte-identical to before.
    // ══ TWO EDITING PURPOSES, SCHEDULED INDEPENDENTLY (Roman 2026-11-05) ════════════════
    // THE SPLIT. Character+/E+/Fusion asks whether a passage REVEALS someone. Picturability
    // asks whether the reader can SEE them. They were one request, so a scene with nobody
    // C+-due could not get a physical reminder at all, and every C+ pass was also asked to
    // certify grounding — which is how three consecutive passes spent their edit on Lirael's
    // hair instead of on a revelation.
    //
    // THE GROUNDING TEACHING IS MOVED, NOT COPIED: CP_GROUNDING is emitted by the
    // PICTURABILITY pass and by nothing else. The C+ pass no longer carries it and no longer
    // requests a grounding finding, so its whole budget goes to the canonical standard.
    if (_pictureMode) {
      sys.push('', CP_GROUNDING.block());
    } else if (_taskMode) {
      sys.push('', CP_TASK.block(opts.task, opts.authorizedScope));
    }
    if (_apprLines.length) {
      sys.push('', CP_GROUNDING.recordsHeader);
      _apprLines.forEach(function (l) { sys.push(l); });
    }
    // ── MY FIXTURE EXEMPLARS ARE WITHDRAWN (Roman 2026-11-05) ──────────────────────────────
    // The Brannick / Oren / Teodor / Halvard / Vashti / Ines bank was written by me in October
    // to teach the same mechanisms the AUTHOR's annotated Jess/ring pair already teaches, and
    // it taught them at a lower bar — several of its entries are ordinary characterisation that
    // would not pass the exposure clause. The canonical exemplar now reaches the editor inside
    // the doctrine excerpt, so a second substitute bank is duplication that lowers the
    // standard. Supplying `opts.examples` still emits them, for any caller that wants them;
    // the production dispatch no longer does.
    if (!_taskMode && examples && opts.allowSubstituteExamples === true) {
      sys.push('',
        'WORKED TRANSFORMATIONS — these demonstrate the physics. Do not copy their wording, their '
          + 'connective tissue or their sentence shapes; the worlds are unrelated to this story.',
        examples);
    }
    // THE CONTRACT FOLLOWS THE TASK. A task pass is not asked the grounding question per
    // character, so it is not asked to report a grounding finding either.
    sys.push('', _pictureMode
      ? pictureEditorContract(ids, scope.refs)
      : (_taskMode ? taskEditorContract(ids, scope.refs)
        // cpIds is passed as [] so the C+ contract no longer demands a grounding finding:
        // that question now belongs to the picturability pass.
        : sceneEditorContract(ids, scope.refs, envDueIds, [])));

    var user = JSON.stringify({
      // WHICH SCENE THIS REQUEST IS FOR. The editor pass is async, so anything naming the request
      // from a caller's own mutable per-scene variable can mislabel it: the runner wrote scene 1's
      // editor request as `scene2_...` and a test then read it as a continuation request and
      // concluded the recurring cadence had never engaged. The request states its own scene.
      sceneNumber: (opts.sceneOrdinal != null) ? opts.sceneOrdinal : null,
      scene: paras.filter(function (p) { return p.isProse; })
        .map(function (p) { return { ref: p.ref, text: p.text }; }),
      // ── NO CHARACTER+ ASSIGNMENT IN TASK MODE ─────────────────────────────────────────
      // MEASURED on the frozen romance request: the system message was clean but the USER
      // packet still shipped dueThisScene, all four obligations with requiresSocialProof and
      // requiresFusion, the Fusion assignment and the Character+ style guidance. A cleaned
      // system message beside a four-obligation payload is still a competing assignment.
      dueThisScene: ids,
      // IN PICTURE MODE THESE ARE NOT OBLIGATIONS. They are the people to assess, and they carry
      // no requiresSocialProof, no requiresFusion and no assigned facet — so they are named for
      // what they are rather than shipped under a key that reads as a Character+ assignment.
      obligations: (_taskMode || _pictureMode) ? undefined : dueList,
      peopleToPicture: _pictureMode ? dueList.map(function (o) {
        return { id: o.id, character: o.character, isPC: !!o.isPC }; }) : undefined,
      editableRefs: scope.refs,
      protectedPassages: scope.protectedPassages,
      protectedByParagraph: scope.protectedByRef,
      // THE ROSTER STAYS AS CONTEXT — who is on stage — never as a certification list.
      roster: opts.roster || [],
      rosterNote: _taskMode ? 'Context only: who is present. Nobody here requires a depiction, '
        + 'a Character+ beat or any certification in this pass.' : undefined,
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
      // ── WHAT A MISSING RECORD DOES AND DOES NOT MEAN ──────────────────────────────────────
      // Stated as data because the inference runs both ways and both ways were being made
      // wrongly: holding a record was read as proof the reader had seen it, and holding none was
      // read as proof there was nothing to honour. Neither follows.
      physicalCanon: dueList.length ? {
        suppliedFor: (Array.isArray(opts.appearance) ? opts.appearance : [])
          .filter(function (a) { return a && a.name && a.facts; })
          .map(function (a) { return a.name; }),
        note: 'Named people have established physical canon in the system block, and it is CANON '
          + '— true of them, never to be contradicted. Anyone due but NOT on this list has no '
          + 'record reaching this pass, which is not evidence that they were never described and '
          + 'not evidence that they were. A record is not published evidence: judge grounding '
          + 'from THE SCENE and from `publishedPassagesForThesePeople`.'
      } : undefined,
      // ── WHAT THE READER HAS ALREADY READ ABOUT EACH PERSON ────────────────────────────────
      // Prose that actually shipped in earlier scenes, filed under that person. This is the
      // "prior" basis for the grounding finding, and it is the reason a KEEP no longer requires
      // a fresh description in every scheduled scene. `passages: []` means NONE REACHED THIS
      // PASS — the history here is abbreviated, and that silence proves nothing either way.
      publishedPassagesForThesePeople: dueList.length ? {
        historyComplete: _histComplete,
        historyNote: _histComplete
          ? 'THE HISTORY HERE IS COMPLETE. No scene precedes this one, so there is no earlier '
            + 'prose about anyone: whatever the reader can picture, they can picture from THIS '
            + 'scene. A claim that someone was described before is not an abbreviated record, it '
            + 'is false, and basis "unknown" is unavailable.'
          : 'THE HISTORY HERE IS INCOMPLETE. Only the passages below reached this pass, and '
            + 'their absence proves nothing either way. Where you cannot tell, basis "unknown" '
            + 'records that — it is not a finding that the reader can picture the person.',
        note: 'PROSE THE READER HAS ALREADY READ, filed under each person. Quoting one of these '
          + 'verbatim with basis "prior" is a legitimate answer to the grounding finding: the '
          + 'reader already holds this person and this encounter may need no reminder. An empty '
          + 'list means no published passage for them reached this pass — the history supplied '
          + 'here is ABBREVIATED, so an empty list is NOT evidence they were never described. '
          + 'These are not canon records and nothing here is an instruction to repeat them.',
        byObligation: dueList.map(function (o) {
          return { id: o.id, character: o.character || null,
            passages: _priorFor[o.id] ? _priorFor[o.id].slice() : [] };
        })
      } : undefined,
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
      fusion: (!_taskMode && fusionDue.length) ? {
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
        // ── TWO DIFFERENT THINGS, READ FROM TWO DIFFERENT FIELDS (Roman 2026-11-04) ───────
        // THE DEFECT, measured in the assembled Sol request: both keys were mapped from
        // `fusionThrough`, so `revealsWhom` came out as "the officiating Sacrificiant's one
        // ornamented ceremonial sash" — a GARMENT named as the person the environment must
        // reveal. The editor was told to reveal the sash, and the paid pass duly wrote more
        // sash: "The single sash, heavy with its one permitted ornament, settled lower than
        // the rehearsed line." That edit was the request's fault, not the model's.
        //
        // `fusionThrough` was always the ENVIRONMENTAL ANCHOR — the producer at cpEditorDue
        // says so in its own comment ("the environmental anchor the fusion is meant to
        // develop") and reads it from pc_opening_fusion.through / .environment_target. The
        // PERSON is `o.character`, which is what a Character+ obligation is about. Nothing
        // upstream changes: the anchor keeps its value, the person is read from the field that
        // holds a person.
        environmentalAnchor: fusionDue.map(function (o) {
          return { id: o.id, through: o.fusionThrough || null }; }),
        revealsWhom: fusionDue.map(function (o) { return o.character || null })
          .filter(Boolean),
        // NOTHING IS ADDED HERE BEYOND THE CORRECTED FIELDS. A note I briefly added said "do not
        // write a depiction of the anchor itself", which CHANGES THE ASSIGNMENT: a Fusion
        // obligation exists precisely to develop the object or the place in order to reveal the
        // person, so banning the anchor's depiction contradicts the combined task. The two
        // corrected fields already say which is the person and which is the feature.

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
      // CP_STYLE is Character+ craft guidance. A task pass keeps the prose-preservation
      // requirements (in the task block) and not the depiction style rules.
      // CP_STYLE is Character+ craft guidance; neither a task pass nor a picturability pass
      // carries it. Their own preservation requirements travel in their own blocks.
      style: (_taskMode || _pictureMode) ? undefined : CP_STYLE
    }, null, 2);

    // `groundingIds` is the CHARACTER id space only. The grounding finding is about a person the
    // reader must be able to picture, so an environmental obligation never carries one and must
    // not be rejected for lacking it.
    return { sys: sys.join('\n'), user: user, paragraphs: paras, reader: reader,
      scope: scope, ids: ids, groundingCorpus: _priorCorpus,
      historyComplete: _histComplete,
      // A NAMED-TASK PASS ASKS NEITHER FINDING, so neither is required of its reply.
      // GROUNDING FINDINGS BELONG TO THE PICTURABILITY PASS ALONE. The C+ pass is no longer
      // asked to certify whether anyone can be pictured.
      groundingIds: _pictureMode ? ids : [],
      // The ids whose claims this pass collects, and the finding it is accountable for.
      claimIds: _taskMode ? [] : ids,
      completionRequire: _pictureMode ? 'grounding' : (_taskMode ? null : 'perception'),
      perceptionRequested: !_pictureMode && !_taskMode,
      // THE CHARACTER+ CRAFT PASS IS AN ADDITIVE PASS, and the preservation boundary applies to
      // it alone. A picturability pass corrects what contradicts and must be able to reword; a
      // named-task pass is told its own preservation terms by the caller through CP_TASK.
      enrichment: !_pictureMode && !_taskMode,
      revisionId: revisionId(reader) };
  }

  // Validates a reply whose refs the MODEL chose. Everything structural is still checked here —
  // letting the model choose the location does not let it choose what is safe.
  function validateSceneEditorReply(raw, ctx) {
    ctx = ctx || {};
    var scope = ctx.scope || { refs: [], byRef: {}, protectedByRef: {}, protectedPassages: [] };
    var ids = ctx.ids || [];
    var reader = String(ctx.reader || '');
    // CHARACTER OBLIGATIONS ONLY. An environmental obligation carries no grounding finding and is
    // not held to one. Absent (an older caller), nothing is required and behaviour is unchanged.
    var needsGround = {};
    (ctx.groundingIds || []).forEach(function (i) { needsGround[i] = true; });
    // ── CLAIMS ARE COLLECTED FOR THE PASS'S OWN IDS ─────────────────────────────────────────
    // (Roman 2026-11-05.) These were collected only where a GROUNDING finding was required. When
    // the picturability split set groundingIds to [] for the Character+ pass, that pass stopped
    // collecting any claims at all — so its completion assessment had no rows, "applied is not
    // fulfilled" silently lost its teeth, and `unresolved` came back null. Claim collection is
    // now keyed on the obligations this pass is answering; `needsGround` still governs only the
    // grounding rejection rule.
    var claimIds = {};
    ((ctx.claimIds && ctx.claimIds.length) ? ctx.claimIds : (ctx.groundingIds || []))
      .forEach(function (i) { claimIds[i] = true; });
    // Person-linked published prose, per obligation. Absent for an id means NO prior passage for
    // that person reached this pass — which is not evidence they were never described.
    var groundCorpus = (ctx.groundingCorpus && typeof ctx.groundingCorpus === 'object')
      ? ctx.groundingCorpus : {};
    // Known-complete history (an opening) withdraws the uncertainty basis altogether: there is
    // no earlier prose for a claim of prior description to be about.
    var histComplete = ctx.historyComplete === true;
    var out = { ok: false, code: null, keeps: [], items: [], rejected: [], unanswered: [],
      grounding: [], claims: [] };

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
      // ── THE SECOND FINDING, RECORDED FOR EVERY CHARACTER DECISION ────────────────────────
      // Recorded whether the decision is keep or edit, and whether or not it is well-formed, so
      // the pass can report what the editor found about recognizability even where it then
      // rejects the decision. `evidence` is verified against the scene exactly as a KEEP is: an
      // attestation quoting prose that is not there proves nothing.
      var _g = (d && d.grounding && typeof d.grounding === 'object') ? d.grounding : null;
      var _gEv = _g ? normalise(_g.evidence) : null;
      var _gRec = !!(_g && _g.recognizable === true);
      var _gWhy = _g ? (normalise(_g.why) || null) : null;
      var _corpus = (typeof groundCorpus[id] === 'string') ? groundCorpus[id] : '';
      // ── THREE BASES, AND THE SCENE IS ONLY ONE OF THEM ────────────────────────────────────
      // A missing basis is INFERRED rather than rejected, so a reply that answers the way the
      // first version of this contract asked (scene evidence, no basis field) still validates
      // exactly as it did: quote in the scene → "scene"; quote in that person's supplied
      // published prose → "prior".
      var _basis = _g ? String(_g.basis || '').toLowerCase().trim() : '';
      if (_gRec && !_basis) {
        _basis = (_gEv && quotePresent(_gEv, reader)) ? 'scene'
          : ((_gEv && _corpus && quotePresent(_gEv, _corpus)) ? 'prior' : 'scene');
      }
      var _gOk = false, _gFail = null, _gVerified = false, _gUnknown = false;
      if (_gRec) {
        if (_basis === 'scene') {
          // ── "SCENE" MEANS THE ENCOUNTER, NOT EVERYTHING SUPPLIED WITH IT ────────────────
          // (Roman 2026-11-06.) Where the editable span is restricted, prose outside it is
          // CONTEXT: the reader has read it, so it carries continuity and facts, and it cannot
          // answer whether the encounter in front of the editor grounds anyone. Measured on
          // both providers, which quoted the read-only lead-in and called it "scene". The
          // quote is still checked against the whole scene first, so a FABRICATED quote keeps
          // its own existing failure code and the two reasons never get confused.
          //
          // IT FORCES NOTHING. The consequence is that the finding is not credited and the
          // obligation is recorded unanswered; no edit is demanded, and the prose publishes
          // untouched. In ordinary production `scope.restricted` is false and this is inert.
          if (!_gEv) _gFail = 'grounding_without_evidence';
          else if (!quotePresent(_gEv, reader)) _gFail = 'grounding_evidence_not_verbatim';
          else if (scope.restricted === true && scope.encounterText
                   && !quotePresent(_gEv, scope.encounterText)) _gFail = CP_REJECT.OUTSIDE;
          else { _gOk = true; _gVerified = true; }
        } else if (_basis === 'prior') {
          // VERIFIABLE WHENEVER A CORPUS ARRIVED, AND THEN IT BITES. Claiming prior publication
          // with a quote that is in neither the scene nor that person's supplied prose is a
          // fabrication, and is rejected like any other unfound quotation.
          if (!_gEv) _gFail = 'grounding_without_evidence';
          else if (!_corpus) _gFail = 'prior_grounding_without_supplied_prose';
          else if (!quotePresent(_gEv, _corpus)) _gFail = 'prior_evidence_not_in_supplied_prose';
          else { _gOk = true; _gVerified = true; }
        } else if (_basis === 'established' || _basis === 'unknown') {
          // ── UNCERTAINTY IS RECORDED AS UNCERTAINTY, AND NEVER AS RECOGNIZABILITY ────────
          // (Roman 2026-11-04, narrowing the previous version of this branch.) It used to
          // ACCEPT any non-empty reason as a grounding finding and merely flag it unverified —
          // which let "the reader already knows his appearance" satisfy the requirement for an
          // undescribed character, in an OPENING, where no earlier prose exists at all. Marking
          // a claim unverified does not stop it from discharging the obligation; only refusing
          // to count it does.
          //
          // TWO SITUATIONS, KEPT APART:
          //  · KNOWN-COMPLETE HISTORY (an opening): REJECTED. Nothing precedes this scene, so
          //    there is nothing for the claim to be about, and recognizability is judged from
          //    the scene and the supplied passages alone.
          //  · INCOMPLETE HISTORY: the KEEP may stand — uncertainty must not force another
          //    description — but `recognizable` is recorded as 'unknown', NOT as true. It
          //    certifies nothing about what was previously delivered.
          if (histComplete) _gFail = 'established_unavailable_complete_history';
          else if (!_gWhy) _gFail = 'uncertain_without_reason';
          else { _gOk = true; _gUnknown = true; }
        } else _gFail = 'grounding_basis_unrecognized';
      }
      if (needsGround[id]) {
        // ── AN EDIT'S CLAIM IS CHECKED AFTER THE SPLICE, NOT HERE ───────────────────────
        // An EDIT now names the grounding passage inside its own proposed text, so it HAS a
        // claim at reply time — but that claim quotes prose that does not exist in the scene
        // yet, so it cannot be verified here. It is PENDING, and the post-splice assessment
        // settles it. An edit that names NO passage is not pending: there is nothing to check,
        // and it is recorded as applied with its requirement unmet.
        var _pending = (dec === 'edit') && !!_gEv;
        out.grounding.push({ id: id, decision: dec || null,
          pending: _pending || undefined,
          pendingWhy: _pending
            ? 'the edit names a passage in its own proposed text; checked after splicing'
            : undefined,
          noGroundingClaimed: ((dec === 'edit') && !_gEv) || undefined,
          // 'unknown' is a THIRD value, not a true. Nothing downstream may read this as a
          // finding that the reader can picture the person.
          reported: _g ? (_gUnknown ? 'unknown' : _gRec) : null,
          basis: _gRec ? (_gUnknown ? 'unknown' : (_basis || null)) : null,
          claimedBasis: _g ? (_basis || null) : null,
          historyComplete: histComplete,
          evidence: _gEv || null,
          evidenceVerbatim: _gEv
            ? (quotePresent(_gEv, reader) || (!!_corpus && quotePresent(_gEv, _corpus)))
            : null,
          priorProseSupplied: !!_corpus,
          accepted: _gOk,
          // FALSE for an "established" attestation: accepted, not verified. The distinction is
          // the whole reason this field exists.
          verified: _gVerified,
          code: _gFail,
          why: _gWhy });
      }
      if (dec === 'keep') {
        var q = normalise(d.keptPassage);
        if (!q) return out.rejected.push({ id: id, code: 'keep_without_passage' });
        if (!quotePresent(q, reader)) {
          return out.rejected.push({ id: id, code: 'kept_passage_not_verbatim', quote: q });
        }
        // ── A KEEP NEEDS BOTH FINDINGS, OR IT IS NOT A KEEP ──────────────────────────────
        // This is the whole point of the change: perception fulfilled with grounding missing
        // used to end the obligation. Now it leaves the obligation UNANSWERED, which is what
        // makes the pass able to ask for an edit instead.
        if (needsGround[id] && !_gOk) {
          return out.rejected.push({ id: id,
            code: !_g ? 'keep_without_grounding_finding'
              : (!_gRec ? 'keep_but_not_recognizable' : (_gFail || 'grounding_not_accepted')),
            quote: _gEv || null,
            basis: _gRec ? (_basis || null) : null,
            reason: (_gFail === CP_REJECT.OUTSIDE)
              ? ('the grounding evidence is real prose but it lies OUTSIDE the editable '
                 + 'encounter, so it is continuity rather than an answer about this encounter. '
                 + 'Quote a passage from the paragraphs you may edit, or make a small edit that '
                 + 'carries one. The prose you quoted is untouched either way.')
              : ('a KEEP must satisfy BOTH findings: the perception requirement AND physical '
              + 'recognizability — evidenced in the editable encounter, or in a supplied '
              + 'published passage for this person. Where the history is complete there is no '
              + 'earlier prose to appeal to, and an unsupported claim of one counts for nothing. '
              + 'Perception alone does not end this obligation — an edit for grounding is owed.') });
        }
        chose[id] = 'keep';
        if (claimIds[id]) {
          out.claims.push({ id: id, decision: 'keep',
            perception: q, perceptionWhy: normalise(d.why) || null,
            grounding: _gEv, groundingBasis: _gUnknown ? 'unknown' : (_basis || null),
            groundingWhy: _gWhy });
        }
        out.keeps.push({ id: id, passage: q, why: normalise(d.why) || null,
          grounding: needsGround[id]
            ? { basis: _gUnknown ? 'unknown' : (_basis || null), evidence: _gEv,
                verified: _gVerified, recognizable: _gUnknown ? 'unknown' : true } : undefined });
      } else if (dec === 'edit') {
        chose[id] = 'edit';
        // ── AN EDIT'S OWN TWO CLAIMS, CARRIED FORWARD FOR THE POST-SPLICE CHECK ──────────
        // (Roman 2026-11-04.) THE DEFECT THIS CLOSES, measured on two paid passes: an EDIT
        // discharged a Character+ obligation by EXISTING. `chose[id]='edit'` plus any edit
        // text listing that id marked it answered, and nothing asked whether the text served
        // the perception requirement — so gpt-6.1-sol wrote "thick violet hair brushing his
        // narrow, pearl-grey face", said in its own `why` that it "supplies only the missing
        // physical grounding", and the presiding Dohkar's INTRODUCTION was recorded as
        // delivered by a sentence of hair colour. A keep had to prove both findings; an edit
        // proved neither.
        //
        // The claims are only RECORDED here. They are checked against the FINISHED scene
        // after the splice, because that is the only text that answers the question — a
        // passage an edit overwrote is not in the scene the reader gets.
        if (claimIds[id]) {
          var _pc = (d && d.perception && typeof d.perception === 'object') ? d.perception : null;
          out.claims.push({ id: id, decision: 'edit',
            perception: _pc ? (normalise(_pc.passage) || null) : null,
            perceptionWhy: _pc ? (normalise(_pc.why) || null) : (normalise(d.why) || null),
            grounding: _gEv, groundingBasis: _gRec ? (_gUnknown ? 'unknown' : (_basis || null)) : null,
            groundingWhy: _gWhy });
        }
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
      if (op !== 'replace' && op !== 'insert_after' && op !== 'insert_at_anchor') {
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
      // ── AN ANCHORED INSERTION MUST NAME ONE UNAMBIGUOUS PLACE ──────────────────────────
      // The anchor is matched BYTE-EXACT, because the splice offsets into the source by
      // indexOf. It must occur exactly once: zero occurrences is a quote the paragraph does
      // not contain, and two is an insertion point nobody chose.
      var _anchor = (e && typeof e.anchor === 'string') ? e.anchor : '';
      if (op === 'insert_at_anchor') {
        var _src = scope.byRef[ref].text || '';
        if (!_anchor.trim()) return out.rejected.push({ tag: tag, code: CP_REJECT.ANCHOR,
          reason: 'an anchored insertion must carry `anchor`: the exact source text it follows' });
        var _n = _src.split(_anchor).length - 1;
        if (_n !== 1) return out.rejected.push({ tag: tag, code: CP_REJECT.ANCHOR, occurrences: _n,
          reason: _n === 0
            ? ('the anchor is not verbatim in paragraph "' + ref + '" — copy it exactly, '
               + 'including punctuation: "' + _anchor.slice(0, 70) + '"')
            : ('the anchor occurs ' + _n + ' times in paragraph "' + ref + '" — extend it until '
               + 'it names one place') });
        // ── COPIED ADJACENT SOURCE CONTEXT (Roman 2026-11-06) ────────────────────────────
        // MEASURED on the paid Grok craft reply. Its P29 insertion payload opened with the
        // sentence that already FOLLOWED its anchor — the model wrote the addition in context,
        // the way a replacement would be written — so the splice put that sentence into the
        // paragraph a second time and "He groaned my name into my neck…" published twice. The
        // additive ops guarantee nothing is LOST; they cannot stop something being DOUBLED, and
        // no check existed for it.
        //
        // THE RULE IS LOCAL AND STRUCTURAL: an insertion may not reproduce a whole sentence
        // that the source already has at the insertion point — the anchor itself, or the
        // remainder of that paragraph after it. Nothing else is examined.
        //
        // WHAT IT DELIBERATELY DOES NOT DO. It is not a prose de-duplicator: it looks only at
        // the one paragraph being edited and only at the span adjacent to the insertion, never
        // across the scene. It cannot fire on a repeated WORD or phrase, because the unit is a
        // complete sentence at the existing MIN_QUOTE_CHARS floor. It cannot fire on the
        // model's OWN rhythmic repetition — "He was gone. He was gone." passes, because neither
        // sentence is in the adjacent source. It fires only when the duplicate is source prose
        // the model copied back, which is the defect and is never intentional craft.
        //
        // THE PAYLOAD IS NOT REWRITTEN. Stripping the copied sentence would usually be
        // equivalent, but "usually" is not demonstrable from here — the model may have intended
        // the second half to read against the copy — so the edit is refused, that paragraph
        // publishes as written, and other independently valid edits in the same reply still
        // apply.
        var _at = _src.indexOf(_anchor);
        var _adjacent = _anchor + ' ' + _src.slice(_at + _anchor.length);
        var _copied = sentences(text).filter(function (s) {
          return normalise(s).length >= MIN_QUOTE_CHARS && quotePresent(s, _adjacent); });
        if (_copied.length) return out.rejected.push({ tag: tag, code: CP_REJECT.ECHOED,
          copied: _copied, copiedCount: _copied.length,
          reason: 'this insertion reproduces ' + _copied.length + ' sentence(s) that paragraph "'
            + ref + '" already has at the insertion point, so splicing it would publish them '
            + 'twice: "' + String(_copied[0]).slice(0, 80) + '". Send ONLY the new prose — the '
            + 'anchor already places it, and the surrounding sentences stay where they are. The '
            + 'paragraph is retained as written.' });
      }
      // PROTECTED CONTENT SURVIVES, OR THE EDIT DOES NOT. Checked ahead of the mode rule so a
      // replacement that drops protected prose keeps reporting THAT, which is the more specific
      // fault and the one the caller named.
      if (op === 'replace') {
        var prot = scope.protectedByRef[ref] || [];
        var lost = prot.filter(function (q) { return !quotePresent(q, text); });
        if (lost.length) return out.rejected.push({ tag: tag, code: CP_REJECT.PROTECTED,
          reason: 'the replacement drops protected content: "' + String(lost[0]).slice(0, 90) + '"' });
        // ── THE ENRICHMENT-PRESERVATION BOUNDARY: NO UNRESTRICTED REPLACE ───────────────
        // An additive pass may not hand back a whole paragraph. THE SOURCE PROSE IS RETAINED —
        // the paragraph is left exactly as written, the obligation goes unanswered, and nothing
        // is sent to a model to repair it. The rejection names the two operations that can do
        // the work, because the point is not to refuse the edit but to refuse the format that
        // makes deletion possible.
        if (ctx.enrichment === true) {
          return out.rejected.push({ tag: tag, code: CP_REJECT.DESTRUCTIVE,
            availableOps: ['insert_at_anchor', 'insert_after'],
            reason: 'this is an additive pass, and `replace` is not available in it: handing '
              + 'back the whole of paragraph "' + ref + '" can drop an action, a movement or a '
              + 'response, and no check on the returned text can reliably tell that from a '
              + 'rewrite. Weave your line in after the prose it reads with '
              + '{"ref":"' + ref + '","op":"insert_at_anchor","anchor":"<the exact source text '
              + 'yours follows>","text":"<your sentence>"}, or add a paragraph with '
              + '"insert_after". The source prose is retained.' });
        }
      }
      seen[ref] = 1;
      out.items.push({ ref: ref, op: op, text: text, anchor: _anchor || undefined,
        beatId: forIds[0],
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

  // ── WHAT THE FINISHED SCENE ACTUALLY SUPPORTS ─────────────────────────────────────────────
  // (Roman 2026-11-04.) AN EDIT BEING APPLIED IS NOT AN OBLIGATION BEING FULFILLED. This is the
  // separation: the splice decides what the reader gets, and THIS decides what may be credited.
  //
  // JUDGED ON THE FINAL ASSEMBLED TEXT, for two reasons. A passage an edit overwrote is not in
  // the scene the reader receives, so a claim quoting it must not count; and a passage the edit
  // ADDED is legitimately available, so new text and untouched prose may carry the two findings
  // between them. Nothing here asks for redundant characterization: quoting prose that was
  // already on the page is the expected way to support the perception finding.
  //
  // THE TWO FINDINGS STAY SEPARATE. Grounding supported with perception unsupported is a real,
  // publishable improvement AND an unfulfilled Character+ obligation — the edit stands, the
  // credit does not.
  //
  // WHAT A QUOTATION CHECK PROVES, AND WHAT IT DOES NOT. `quotePresent` establishes that the
  // passage EXISTS in the finished scene. It cannot establish that the passage MEANS what the
  // editor says it means — that it is a relationship perception event rather than a line of
  // dialogue that happens to be addressed to someone. No deterministic check can, and none here
  // pretends to: `semanticallyVerified` stays false on every record this produces.
  function cpAssessObligationCompletion(opts) {
    opts = opts || {};
    var finalText = String(opts.finalText || '');
    var claims = Array.isArray(opts.claims) ? opts.claims : [];
    var ids = Array.isArray(opts.groundingIds) ? opts.groundingIds : [];
    var byId = {};
    claims.forEach(function (c) { if (c && c.id) byId[c.id] = c; });
    return ids.map(function (id) {
      var c = byId[id] || null;
      var pq = c ? (c.perception || null) : null;
      var gq = c ? (c.grounding || null) : null;
      var pOk = !!(pq && quotePresent(pq, finalText));
      // An "unknown" grounding basis is an admission of uncertainty, never support. It cannot
      // carry the grounding half of a creditable result.
      var gBasis = c ? (c.groundingBasis || null) : null;
      // ── A `prior` QUOTE IS CHECKED AGAINST ITS OWN SOURCE, NOT AGAINST THIS SCENE ────────
      // (Roman 2026-11-04, fixing a regression this function introduced.) The first version
      // required every grounding quote to be present in the FINISHED SCENE. For basis "prior"
      // that is the per-scene description quota coming back in through the bookkeeping: a
      // familiar character correctly left undescribed this time would be denied credit
      // BECAUSE the editor rightly did not re-describe them. Published evidence is evidence
      // wherever it was published. So a "prior" quote is verified against that person's
      // person-linked published prose — the same corpus the reply-time check used — and a
      // "scene" quote against the finished scene, which is where it claims to be.
      var corpus = (opts.groundingCorpus && typeof opts.groundingCorpus === 'object'
        && typeof opts.groundingCorpus[id] === 'string') ? opts.groundingCorpus[id] : '';
      var gSource = (gBasis === 'prior') ? corpus : finalText;
      var gOk = !!(gq && gSource && quotePresent(gq, gSource)) && gBasis !== 'unknown';
      // ── AN EDIT IS SETTLED BY ITS CLAIMED PASSAGE, NOT BY HAVING LANDED ───────────────
      // (Roman 2026-11-05, replacing my previous rule.) I had made an applied edit settle
      // grounding automatically: any text spliced for this obligation counted. That is wrong —
      // it makes APPLICATION and GROUNDING SUPPORT the same fact, so an edit that changes a
      // line without adding any physical grounding would certify picturability.
      //
      // An EDIT must therefore NAME THE GROUNDING PASSAGE inside the finished text it is
      // proposing. After splicing, that passage is checked exactly as a KEEP's is — the
      // difference is only WHERE it is quoted from: a KEEP quotes prose that already exists or
      // was supplied as prior publication; an EDIT quotes its own proposed text.
      //
      // APPLICATION STATUS IS REPORTED SEPARATELY and never substitutes for support. An older
      // reply that claimed no passage (the null-evidence contract this replaces) is recorded as
      // APPLIED with grounding UNSUPPORTED. Nothing is back-filled on its behalf.
      var appliedForId = null;
      (Array.isArray(opts.applied) ? opts.applied : []).forEach(function (a) {
        if (appliedForId) return;
        // spliceAuthorized records the obligation as `tag`; richer callers may pass beatIds.
        var ids = (a && (a.beatIds || (a.tag ? [a.tag] : (a.beatId ? [a.beatId] : [])))) || [];
        if (ids.indexOf(id) !== -1) appliedForId = normalise(a.inserted || a.text || '') || true;
      });
      var _noClaim = !!(c && c.decision === 'edit' && !gq);
      var why = [];
      if (!c) why.push('no character decision was recorded for this obligation');
      else {
        if (!pq) why.push('no perception passage was claimed');
        else if (!pOk) why.push('the claimed perception passage is NOT in the finished scene '
          + '(absent, misquoted, or no longer contiguous after an edit)');
        if (!gq) why.push(gBasis === 'unknown'
          ? 'grounding was reported as unknown, which supports nothing'
          : 'no grounding passage was claimed');
        else if (!gOk) why.push(gBasis === 'unknown'
          ? 'grounding was reported as unknown, which supports nothing'
          : (gBasis === 'prior'
              ? (corpus
                  ? 'the claimed prior passage is NOT in that person\'s supplied published prose'
                  : 'basis "prior" was claimed but no published prose for that person reached '
                    + 'this pass, so the quote cannot be verified against its own source')
              : 'the claimed grounding passage is NOT in the finished scene'));
      }
      // WHICH FINDING THIS PASS IS ACCOUNTABLE FOR. Under the split, the Character+ pass owns
      // perception and the picturability pass owns grounding; neither is judged on the other's.
      var req = opts.require || 'both';
      var complete = (req === 'perception') ? pOk : (req === 'grounding' ? gOk : (pOk && gOk));
      return { id: id, decision: c ? c.decision : null, requires: req,
        perception: { passage: pq, supported: pOk, why: c ? c.perceptionWhy : null },
        grounding: { passage: gq, supported: gOk, basis: gBasis,
          // APPLICATION IS NOT SUPPORT. Both are reported; only the second can complete.
          editApplied: appliedForId ? true : (c && c.decision === 'edit' ? false : undefined),
          noGroundingClaimed: _noClaim || undefined,
          noClaimWhy: _noClaim
            ? 'the reply named no grounding passage, so nothing can be checked after splicing'
            : undefined,
          settledBy: gOk ? (gBasis === 'prior' ? 'published_prose' : 'finished_scene') : null,
          // WHERE IT WAS VERIFIED, carried so the recorder does not re-check a prior quote
          // against the current scene and undo this.
          verifiedAgainst: gOk ? (gBasis === 'prior' ? 'published_prose' : 'finished_scene') : null,
          why: c ? c.groundingWhy : null },
        // COMPLETE means this pass's own finding is supported by a passage in the finished scene.
        complete: complete,
        creditable: complete,
        // Said on every one of these, because a quote check cannot answer it.
        semanticallyVerified: false,
        why: why.length ? why.join('; ') : 'both findings are supported by passages in the '
          + 'finished scene — EXISTENCE of the evidence, not a judgment that it is good' };
    });
  }

  // ── PICTURABILITY ELIGIBILITY, INDEPENDENT OF CHARACTER+ ──────────────────────────────────
  // (Roman 2026-11-05.) THE WHOLE POINT OF THE SPLIT. This asks only "who is importantly on this
  // page", so it fires in a scene where NOBODY is Character+, E+ or Fusion due — which the
  // combined request could never do, because the grounding question only travelled with a C+
  // obligation. The PC is included: first-person narration exempts nobody.
  //
  // IT IS NOT A QUOTA. This returns who is ELIGIBLE to be assessed; the editor answers KEEP for
  // anyone the scene already pictures, and a scene where everyone is already visible produces
  // no edits at all. Nothing here schedules "another description every N scenes".
  //
  // WHAT IT DELIBERATELY DOES NOT DECIDE: whether the reader has in fact seen someone. That is
  // the editor's finding, against the scene and any supplied published prose — canonical
  // appearance is what is TRUE of a person, never evidence of what has been shown, and an
  // uncertain history is reported as unknown rather than certifying anyone as already described.
  function cpPictureDue(opts) {
    opts = opts || {};
    var seen = {}, out = [];
    var push = function (label, extra) {
      var key = String(label || '').toLowerCase().trim();
      if (!key || seen[key]) return;
      seen[key] = 1;
      out.push(Object.assign({
        id: 'picture:' + key.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        character: String(label) }, extra || {}));
    };
    // ── THE RESOLVED LIST WINS (Roman 2026-11-18) ──────────────────────────────────────────
    // `opts.people` is the SAME list the author's picturability mandate was built from, so the
    // two surfaces cannot disagree about who the reader met. It already encodes the decisions
    // this function used to approximate: who is present in person, who is an individual rather
    // than a crowd, and who is unnamed but interacts on the page.
    var people = Array.isArray(opts.people) ? opts.people : null;
    if (people) {
      people.forEach(function (p) {
        if (!p) return;
        var label = String(p.label || p.character || '').trim();
        if (!label) return;
        push(label, { kind: p.kind || null, isPC: p.isPC === true,
          unnamed: p.unnamed === true, participation: p.participation || null,
          why: p.why || null });
      });
      try {
        if (typeof console !== 'undefined' && console.log) {
          console.log('[PICTURE:ELIGIBLE] from the resolved roster — '
            + out.map(function (x) { return x.character + (x.unnamed ? '(unnamed)' : ''); }).join(', '));
        }
      } catch (_) {}
      return out;
    }
    // ── FALLBACK: THE OLD MAJOR-ONLY FILTER, DELIBERATELY UNCHANGED ────────────────────────
    // Without the resolved roster there is no `presence` here, so this cannot tell a person in
    // the room from a voice on a phone. Widening it would demand a picture of someone who
    // cannot be pictured, so it stays narrow and says that it is the narrow path.
    var onStage = Array.isArray(opts.onStage) ? opts.onStage : [];
    onStage.forEach(function (p) {
      if (!p || !p.label) return;
      var major = p.isPC === true || p.isLI === true
        || String(p.participation || '') === 'major'
        || String(p.kind || '') === 'pc' || String(p.kind || '') === 'li';
      if (!major) return;
      push(p.label, { kind: p.kind || null, isPC: p.isPC === true,
        participation: p.participation || null });
    });
    try {
      if (typeof console !== 'undefined' && console.log) {
        console.log('[PICTURE:ELIGIBLE] NARROW PATH — no resolved roster was supplied, so only'
          + ' major participants are assessed (an unnamed interactor cannot be seen from here): '
          + out.map(function (x) { return x.character; }).join(', '));
      }
    } catch (_) {}
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
      keeps: [], applied: [], rejected: [], unanswered: [], grounding: [], completion: [],
      due: [], deferred: [],
      dispatched: false, unresolved: null };

    if (typeof opts.editorFn !== 'function') {
      base.reason = 'no editor is wired'; return base;
    }
    var plan = null;
    try {
      plan = cpEditorDue({
        plan: opts.coveragePlan, onStage: opts.onStage, skeleton: opts.skeleton,
        // ── THE EDITOR SCHEDULES AGAINST THE CURRENT SCENE'S ROSTER (Roman 2026-11-18) ────
        // This call omitted frameRoster, so the EDITOR's own scheduling saw only `onStage`
        // while the author-prompt resolution upstream was given the accepted stage. On Scene 4
        // that dropped both admiration obligations as "not on stage" with Roman speaking
        // throughout. Falls back to onStage when no roster is supplied, so nothing changes for
        // a caller that does not pass one.
        frameRoster: opts.frameRoster || opts.onStage,
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
    // ── PICTURABILITY SCHEDULES ITSELF ──────────────────────────────────────────────────────
    // In picturability mode the Character+ plan is NOT what gates the pass: the people on stage
    // are. So a scene with nobody C+ due still runs, which is the behaviour the split exists for.
    var _pictureMode = opts.mode === 'picturability';
    if (_pictureMode) {
      var _picDue = cpPictureDue({ onStage: opts.onStage, people: opts.picturePeople });
      base.due = _picDue;
      base.mode = 'picturability';
      if (!_picDue.length) {
        base.reason = 'no important on-page character to assess for picturability';
        return base;
      }
      plan = { due: _picDue, deferred: [], introductions: 0, capacity: null, overflow: 0 };
    }
    // ── A NAMED TASK SCHEDULES ITSELF TOO (Roman 2026-11-06) ────────────────────────────────
    // Same shape as the picturability exemption above, and found the same way — by a task pass
    // returning "nothing is due" and never reaching the editor. The Character+ plan is not what
    // gates a task pass: the CALLER'S OBJECTIVE is. A consistency pass over a finished scene
    // owes no C+ depiction to anybody and must still run. Without this, `opts.task` could only
    // ever fire on a scene that happened to owe Character+ work, which has nothing to do with
    // the task. Nothing in production supplies `opts.task`, so no shipped pass changes.
    var _taskMode = !_pictureMode && !!(opts.task && opts.task.objective);
    var _envCount = Array.isArray(opts.environmentDue) ? opts.environmentDue.length : 0;
    if (_taskMode) {
      base.mode = 'task';
      plan = { due: [], deferred: [], introductions: 0, capacity: null, overflow: 0 };
    } else if (!_pictureMode && !plan.due.length && !_envCount) {
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
      environmentDue: opts.environmentDue,
      environmentMemory: opts.environmentMemory,
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
      appearance: opts.appearance,
      task: opts.task,
      // ── AND THIS IS THE SAME TRAP AGAIN (Roman 2026-11-08) ────────────────────────────────
      // `authorizedScope` was passed by the enhancement caller and dropped HERE, by this very
      // forward list — the third time the comment above has described its own failure. The
      // explicitness task's objective tells the editor the scope is "the only thing that names
      // which material you may touch", and without this line a dialogue-only whisper and a full
      // physical scene sent byte-identical prompts.
      authorizedScope: opts.authorizedScope,
      mode: opts.mode,
      // PERSON-LINKED PUBLISHED PROSE. On this explicit forward list for the reason the comment
      // above gives: the builder reads it, so a caller-private list that omits it delivers an
      // empty corpus and the grounding finding silently loses its "prior" basis.
      priorCharacterPassages: opts.priorCharacterPassages,
      historyComplete: opts.historyComplete });
    base.requestRevision = req.revisionId;

    var replyRaw = null, call = null;
    try {
      call = await opts.editorFn({
        sys: req.sys, user: req.user, ids: req.ids, due: plan.due,
        revisionId: req.revisionId, owner: opts.owner || null,
        // WHICH PASS THIS IS, so the dispatcher can key its durable operation per pass rather
        // than per draft revision (see cpEditorOperationId). Picturability, the craft pass and a
        // named task are three different operations on the same prose.
        //
        // A NAMED TASK CARRIES ITS OWN IDENTITY. Two different tasks on one draft are two
        // different operations, so the id is the task's own — `task:consistency` cannot collide
        // with `picturability`, with `craft`, or with some later task. A task without an id is
        // still distinct from the two editor passes, which is what the collision fix required.
        mode: _pictureMode ? 'picturability'
          : (_taskMode ? ('task:' + String((opts.task && opts.task.id) || 'unnamed')) : 'craft'),
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
      scope: req.scope, ids: req.ids, reader: req.reader,
      groundingIds: req.groundingIds, claimIds: req.claimIds,
      groundingCorpus: req.groundingCorpus,
      enrichment: req.enrichment === true,
      historyComplete: req.historyComplete });
    base.ran = true;
    base.keeps = v.keeps; base.rejected = v.rejected; base.unanswered = v.unanswered;
    base.grounding = v.grounding;
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
    // ── APPLIED IS NOT FULFILLED ───────────────────────────────────────────────────────────
    // Assessed against the FINISHED scene, after the splice. This is what may be credited; the
    // prose above is what publishes, and the two are deliberately not the same decision.
    // ── ASSESSED ONLY AGAINST A CONTRACT THAT WAS ACTUALLY SENT ────────────────────────────
    // (Roman 2026-11-04.) The perception claim is a field this contract asks for. A reply
    // produced from a request that never asked for it cannot be scored on its absence — that
    // would read a format change as a writing failure, which is exactly what a replay of an
    // earlier request must not do. `perceptionRequested` travels with the request; a replay
    // sets it false and the pass reports decisions and prose without a completion verdict.
    var _wantPerception = (opts.perceptionRequested === false) ? false
      : (req.perceptionRequested !== false);
    // The completion assessment runs whenever the pass owns a finding — perception for the
    // Character+ pass, grounding for the picturability pass, neither for a named task.
    var _require = req.completionRequire || null;
    base.perceptionRequested = _wantPerception;
    base.completion = _require ? cpAssessObligationCompletion({
      finalText: readerFacing(spl.text), claims: v.claims, applied: spl.applied,
      groundingCorpus: req.groundingCorpus, require: _require,
      groundingIds: req.claimIds && req.claimIds.length ? req.claimIds : req.groundingIds }) : [];
    var _incomplete = base.completion.filter(function (c) { return !c.complete; });
    var _unansweredIds = v.unanswered.map(function (u) { return u.id; });
    // An obligation whose edit was applied but whose Character+ is unsupported is NOT answered,
    // however much prose it produced. It joins the unresolved list rather than being counted.
    _incomplete.forEach(function (c) {
      if (_unansweredIds.indexOf(c.id) === -1) _unansweredIds.push(c.id);
    });
    if (_unansweredIds.length) {
      base.unresolved = {
        why: v.unanswered.length
          ? 'some obligations were not answered, and some received an edit without support for '
            + 'both findings in the finished scene'
          : 'an edit was applied without support for both findings in the finished scene — the '
            + 'prose improvement stands, the obligation does not',
        obligations: _unansweredIds,
        incomplete: _incomplete.map(function (c) {
          return { id: c.id, perceptionSupported: c.perception.supported,
            groundingSupported: c.grounding.supported, why: c.why }; })
      };
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

    // ══ REPLACED, NOT APPENDED (Roman 2026-11-04) ════════════════════════════════════
    // This slot held the Marisa dispatch-desk KEEP, which taught evidence-over-verdict for the
    // PERCEPTION finding — a lesson the editor already applies well. What it did not teach is
    // the standard that actually failed: on the measured pass every character was KEPT, and the
    // one with no feature, no voice and no bearing on the page was certified recognizable on a
    // hand movement, defended as "supplies the physical details that make him recognizable".
    // Same mechanism, same always-travelling slot, same evidence-over-verdict structure —
    // retargeted onto grounding, where the verdict was standing in for the finding.
    { id: 'keep-impression-not-staging', mechanism: 'keep',
      facts: ['Brannick chairs the water board',
        'the board has learned to wait for him, and he never raises his voice'],
      viewpoint: 'the narrator has sat through nine of these hearings and watches who moves first',
      before: 'Brannick turned towards the petitioner, his hands moving quietly at his side, and '
        + 'waited until the room was looking at him. "Read the second clause again," he said, in '
        + 'the flat Dunmarch vowels he has never bothered to soften.',
      decision: 'keep',
      kept: 'waited until the room was looking at him. "Read the second clause again," he said, '
        + 'in the flat Dunmarch vowels he has never bothered to soften',
      why: 'BOTH FINDINGS, AND THEY ARE ANSWERED BY DIFFERENT PARTS OF THE SENTENCE. PERCEPTION '
        + 'is the waiting — a judgment about who controls the room, selected by a narrator who '
        + 'watches for it. GROUNDING is the unsoftened vowels: a concrete vocal impression, and '
        + 'a habit of not bothering with it. Whether anyone else in the hearing shares that '
        + 'accent is unknown and does not matter — the reader can hear him either way. THE '
        + 'TURNING AND THE HANDS, AS WRITTEN HERE, CARRY NEITHER: they report that he is doing '
        + 'something and leave little to picture. One clause of voice was enough, and it '
        + 'explains nothing about his psychology; it does not have to.',
      failure: { text: 'Brannick turned towards the petitioner, his hands moving quietly at his '
          + 'side, and waited until the room was looking at him. "Read the second clause again."',
        why: 'The same perception, and little beyond the managing of the room: strike the voice '
          + 'and this particular passage leaves the reader not much to picture, so one concrete '
          + 'identifying cue would help. THIS IS NOT A RULE THAT WAITING, POSTURE OR A MOVEMENT '
          + 'OF THE HANDS CAN NEVER GROUND ANYONE — written with enough particularity, bearing '
          + 'does exactly that. What fails is the DEFENCE: a KEEP justified as "the passage '
          + 'supplies the physical details that make him recognizable" restates the verdict and '
          + 'names nothing. Point at the cue; where there is none to point at, the edit is '
          + 'owed.' } },
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
  // ── TWO INDEPENDENT PASSES NEED TWO OPERATION IDS (Roman 2026-11-06) ────────────────────
  // MEASURED DEFECT: this id did not name the PASS, only the draft revision. Picturability runs
  // first; whenever it leaves the text unchanged — an empty or unusable reply, a refusal, or a
  // perfectly legitimate all-KEEP outcome — the craft pass arrives at the SAME revision, builds
  // the SAME id, and app.js:148082 refuses it as "this draft revision already had an editing
  // pass in this session". Observed provider-free with four characters returning
  // verdict=DUE: the C+/E+/Fusion pass never dispatched at all.
  //
  // So the two passes were structurally separated and then silently re-joined by their shared
  // idempotency key — one cancelling the other. Naming the mode makes each pass its own durable
  // operation, which is what every protection keyed on this id (the per-call reservation, the
  // daily cap, the ledger row) was meant to be counting. It does NOT make either pass run: each
  // keeps its own eligibility, and a genuine repeat of the SAME pass on the SAME revision is
  // still refused exactly as before.
  //
  // Absent a mode the id is byte-identical to the old one, so no existing operation changes key.
  function cpEditorOperationId(o) {
    o = o || {};
    var parts = ['cplus-editor', String(o.accountId || 'anon'), String(o.storyId || ''),
      'scene' + String(o.scene == null ? '?' : o.scene), String(o.revisionId || '')];
    if (o.mode) parts.push(String(o.mode));
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
    CP_GROUNDING: CP_GROUNDING, CP_TASK: CP_TASK,
    CP_CONSISTENCY_TASK: CP_CONSISTENCY_TASK,
    CP_EXPLICITNESS_TASK: CP_EXPLICITNESS_TASK,
    STATUS: STATUS, OCCURRENCE: OCCURRENCE, EVIDENCE_PROBLEM: EVIDENCE_PROBLEM,
    paragraphsOf: paragraphsOf, cpClosingPassage: cpClosingPassage,
    authorizeRepairRegions: authorizeRepairRegions,
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
    cpPictureDue: cpPictureDue,
    cpAssessObligationCompletion: cpAssessObligationCompletion,
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
