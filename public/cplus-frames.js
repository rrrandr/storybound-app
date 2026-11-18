// ── CHARACTER+ SENTENCE FRAMES (Roman 2026-11-17) ─────────────────────────────────────────────
//
// WHAT THIS IS. Twelve sentence frames in two banks — six for Character+ and six for a physical
// tell. Each frame is a SKELETON with labelled slots. The author keeps the wording around the
// slots (adjusting only for tense, point of view and voice) and the narrator's judgment goes into
// WHICH details fill the slots. "As usual" is the whole tell; the frame supplies the rest.
//
// WHY A FRAME AND NOT AN INSTRUCTION. Every previous attempt told the author what a Character+
// beat must ACHIEVE and left the sentence to it. A frame constrains GENERATION instead of
// labelling it, which is the lever that has actually worked in this codebase.
//
// ── THE EXAMPLES ARE QUARANTINED, AND HERE IS WHY ────────────────────────────────────────────
// A filled example in a shared prompt has already shipped verbatim to a reader in this project:
// a First Sacrifice scene published "Tell Devorah about the email, or wait until morning?" —
// item one of an "Examples of correct form" list — with "do NOT copy" printed beside it,
// rotation already in place for that pool, and a verification gate that passed while the
// contamination shipped. Rotation only changes WHICH example leaks.
//
// Two of the C+ examples as proposed name HELEN, a First Taste character. Shipped in a shared
// bank, that name reaches other Books, which is the same defect pointed the other way.
//
// So: the FRAME and its SLOTS are always delivered. The filled example is delivered only when
// `window._sbCplusFrameExamples === true` (harness switch SB_CPLUS_FRAME_EXAMPLES=1), so the
// open question — does the example teach the shape, or does it leak? — is answered by an A/B
// instead of by anyone's conviction. `leakTokens` names the distinctive lexis of each example so
// a leak is DETECTABLE rather than a matter of reading every page.
(function () {
  'use strict';

  var CPLUS_FRAMES = [
    { id: 'easier-thing', title: 'The easier thing',
      frame: '[Subject] looked at [object with a clear answer] instead of [person whose reaction '
           + 'mattered], because it was easier to read.',
      slots: ['subject', 'object with a clear answer', 'person whose reaction mattered'],
      example: 'He looked at the label on the wine bottle instead of the host’s face, because '
             + 'it was easier to read.',
      leakTokens: ['wine bottle', 'the host’s face', "the host's face"] },
    { id: 'practiced-face', title: 'The practiced face',
      frame: 'I have a [expression, tone, or phrase I’ve learned to put on] I use just for '
           + '[specific audience or situation].',
      slots: ['expression, tone, or phrase learned to put on', 'specific audience or situation'],
      example: 'I have a smile I use just for the screen.',
      leakTokens: ['a smile I use just for the screen'] },
    { id: 'safer-correction', title: 'The safer correction',
      frame: '[Person] said [the larger thing the narrator disputes]. They got [smaller fact] '
           + 'wrong, too. I corrected [smaller fact].',
      slots: ['person', 'larger thing disputed', 'smaller fact'],
      example: 'Helen called it a reconciliation. She got the name of my shop wrong, too. '
             + 'I corrected the name.',
      // NAMES A FIRST TASTE CHARACTER. Quarantined for that reason as much as any.
      leakTokens: ['Helen called it a reconciliation', 'the name of my shop'] },
    { id: 'job-they-know', title: 'The job they know how to do',
      frame: 'When [person] asked me [question I’d rather answer with a task], I [did '
           + 'something precise I know how to do].',
      slots: ['person', 'question better answered with a task', 'precise competent action'],
      example: 'When he asked if I wanted him to stay, I showed him how to get the back door to latch.',
      leakTokens: ['the back door to latch', 'if I wanted him to stay'] },
    { id: 'the-exception', title: 'The exception',
      frame: 'I never let anyone [specific intrusion or intimacy]. When [particular person] did '
           + 'it, I [small action that makes room for it].',
      slots: ['specific intrusion or intimacy', 'particular person', 'small action making room'],
      example: 'I never let anyone read over my shoulder. When I caught Helen doing it, I tilted the screen.',
      leakTokens: ['read over my shoulder', 'I tilted the screen', 'caught Helen doing it'] },
    { id: 'unasked-favor', title: 'The unasked favor',
      frame: 'Before [person] [arrived or sat down], [subject] [made a specific accommodation]. '
           + '[Person] had only ever asked once.',
      slots: ['person', 'arrival or sitting', 'specific accommodation'],
      example: 'Before she came in, he pulled the chair with arms out from the table. She’d only '
             + 'ever asked him to do it once.',
      leakTokens: ['the chair with arms', 'only ever asked him to do it once'] },
  ];

  var TELL_FRAMES = [
    { id: 'dial-down', title: 'Dial the feature down',
      frame: '[Subject] was [physically imposing trait]. [Subject] [made that trait less imposing] '
           + 'whenever [moment they could use it to their advantage].',
      slots: ['subject', 'imposing physical trait', 'how it is made less imposing', 'the advantageous moment'],
      example: 'He was six foot four. He sat down whenever he had to tell somebody no.',
      leakTokens: ['six foot four', 'sat down whenever he had to tell somebody no'] },
    { id: 'right-audience', title: 'Show it to the right audience',
      frame: '[Subject] covered [physical feature] for [audience they want to read them one way]. '
           + '[Subject] left it showing for [audience they want to read them differently].',
      slots: ['subject', 'physical feature', 'audience one', 'audience two'],
      example: 'She covered the gray for dates. She left it showing for depositions.',
      leakTokens: ['covered the gray for dates', 'showing for depositions'] },
    { id: 'use-limitation', title: 'Use the limitation',
      frame: '[Subject] turned [body part or side with an established limitation] toward [something '
           + 'they wanted to receive only in part].',
      slots: ['subject', 'body part with an established limitation', 'thing received only in part'],
      example: 'She turned her bad ear toward apologies she wanted to accept.',
      leakTokens: ['her bad ear', 'apologies she wanted to accept'] },
    { id: 'private-job', title: 'Give it a different job in private',
      frame: 'In [public setting], [subject] hid [physical feature]. With [trusted person], it was '
           + 'the [body part] [doing something that shows trust or affection].',
      slots: ['public setting', 'subject', 'physical feature', 'trusted person', 'trusting action'],
      example: 'In company photos he hid his prosthetic hand. In every picture with his daughter, '
             + 'it was the one holding hers.',
      leakTokens: ['prosthetic hand', 'the one holding hers'] },
    { id: 'come-to-you', title: 'Make the other person come to you',
      frame: '[Subject’s physical feature] could [effect at full strength]. When [emotion or '
           + 'need took over], [subject] made you [come closer or pay closer attention].',
      slots: ['physical feature', 'effect at full strength', 'emotion or need', 'how you are drawn in'],
      example: 'His voice could reach the loading dock from the office. When he was angry, he made '
             + 'you lean in.',
      leakTokens: ['reach the loading dock', 'made you lean in'] },
    { id: 'act-first', title: 'Act before anyone can help',
      frame: '[Subject’s body] [showed an involuntary reaction] whenever [specific trigger]. '
           + '[Subject] [did the action that exposed it] before [person] could offer to take over.',
      slots: ['involuntary reaction', 'specific trigger', 'the exposing action', 'person who would offer'],
      example: 'Her hands shook when anyone watched. She carved the first slice herself, before her '
             + 'brothers could offer.',
      leakTokens: ['carved the first slice', 'before her brothers could offer'] },
  ];

  // ── ONE FRAME FROM EACH BANK PER STORY, HELD FOR THE STORY ──────────────────────────────────
  // Deterministic in the storyId, so the pair is stable across every scene, every regeneration
  // and every reopen of the same story — and two different stories get different pairs without a
  // counter anyone has to persist.
  function _hash(s) {
    var h = 2166136261;
    var t = String(s == null ? '' : s);
    for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function dealForStory(storyId) {
    var h = _hash(storyId);
    return {
      cplus: CPLUS_FRAMES[h % CPLUS_FRAMES.length],
      tell: TELL_FRAMES[(h >>> 8) % TELL_FRAMES.length],
      storyId: String(storyId == null ? '' : storyId),
    };
  }

  // The prompt text. The frame and its slots always travel; the filled example only when the
  // switch is on, and then LABELLED as a shape demonstration with its own refusal line.
  function renderForPrompt(deal, opts) {
    var withExamples = !!(opts && opts.withExamples);
    var L = [];
    L.push('═══ THE SENTENCE FRAMES FOR THIS STORY ═══');
    L.push('Two frames are dealt per story and held for the whole story. Build the beat ON the');
    L.push('frame: keep the wording around the slots, adjusting ONLY for tense, point of view and');
    L.push('voice. Your judgment goes into WHICH detail fills each slot — the person, object,');
    L.push('gesture or audience already present in THIS scene. A single qualifier can carry the');
    L.push('whole reading; the frame carries the rest.');
    L.push('');
    [['CHARACTER+ FRAME', deal.cplus], ['PHYSICAL TELL FRAME', deal.tell]].forEach(function (pair) {
      L.push(pair[0] + ' — "' + pair[1].title + '"');
      L.push('  ' + pair[1].frame);
      L.push('  SLOTS: ' + pair[1].slots.join(' · '));
      if (withExamples) {
        L.push('  ONE FILLED EXAMPLE (the SHAPE only — every noun in it belongs to another story');
        L.push('  and must NOT appear in yours): ' + pair[1].example);
      } else {
        L.push('  NO FILLED EXAMPLE IS GIVEN, ON PURPOSE: a worked example in a shared prompt has');
        L.push('  shipped verbatim to a reader here before. Fill the slots from this scene.');
      }
      L.push('');
    });
    return L.join('\n');
  }

  // ── THE LEAK DETECTOR ───────────────────────────────────────────────────────────────────────
  // Checks prose against the distinctive lexis of EVERY example in both banks, not only the
  // dealt pair: rotation means any of them could be the one that leaks. Returns the offenders.
  function detectLeaks(text) {
    var hits = [];
    var t = String(text == null ? '' : text).toLowerCase();
    CPLUS_FRAMES.concat(TELL_FRAMES).forEach(function (f) {
      (f.leakTokens || []).forEach(function (tok) {
        var k = String(tok).toLowerCase();
        if (k && t.indexOf(k) !== -1) hits.push({ frame: f.id, token: tok });
      });
    });
    return hits;
  }

  window.SB_CPLUS_FRAMES = {
    CPLUS_FRAMES: CPLUS_FRAMES, TELL_FRAMES: TELL_FRAMES,
    dealForStory: dealForStory, renderForPrompt: renderForPrompt, detectLeaks: detectLeaks,
  };
})();

// ── THE PER-CHARACTER BEAT LEDGER (Roman 2026-11-17) ─────────────────────────────────────────
//
// Frames rotate BY CHARACTER and are tracked across the story, so nobody gets the same shape
// twice and a lead's beats build on each other:
//
//   named supporting character   1 beat   from the C+ bank, due at their first appearance
//                                        where they DO something that affects another person
//   PC · LI · villain            2-3      from EITHER bank, at different points, in this arc:
//                                          beat 1  a habit
//                                          beat 2  who gets an exception
//                                          beat 3  what happens when the habit stops working
//
// A beat is marked DELIVERED only when the behaviour survives onto the PUBLISHED page — not when
// it was assigned, and not when the author's draft contained it. Anything still due is re-offered,
// which is the whole point of a ledger rather than a one-shot instruction.
(function () {
  'use strict';
  var API = window.SB_CPLUS_FRAMES;
  if (!API) return;

  var BEAT_INTENT = [
    'A HABIT — something this person does by default, shown once in action.',
    'WHO GETS AN EXCEPTION — the one person or case for whom the habit bends.',
    'WHEN THE HABIT STOPS WORKING — the default fails them and they are exposed without it.',
  ];

  function _h(s) {
    var h = 2166136261, t = String(s == null ? '' : s);
    for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function _isLead(role) {
    var r = String(role || '').toLowerCase();
    return r === 'pc' || r === 'protagonist' || r === 'li' || r === 'love_interest'
        || r === 'villain' || r === 'antagonist';
  }
  // Beats per character: leads get 2 or 3 (stable per character), supporting get 1.
  function beatsFor(role, storyId, characterId) {
    if (!_isLead(role)) return 1;
    return 2 + (_h(storyId + '|' + characterId) % 2);
  }
  // ROTATION BY CHARACTER. Every beat draws a frame the character has not had; leads draw from
  // both banks pooled, supporting from the C+ bank only. The walk is deterministic in
  // (storyId, characterId) so the assignment is identical on every reopen and regeneration.
  function assignFor(role, storyId, characterId) {
    var pool = _isLead(role)
      ? API.CPLUS_FRAMES.concat(API.TELL_FRAMES)
      : API.CPLUS_FRAMES.slice();
    var n = beatsFor(role, storyId, characterId);
    var seed = _h(storyId + '::' + characterId);
    // ── DRAWN WITHOUT REPLACEMENT (Roman 2026-11-17) ──────────────────────────────────────
    // This was a "coprime-ish" walk: `step = 1 + (seed % (pool.length - 1))` over a 12-frame
    // pool, which is NOT coprime whenever step shares a factor with 12. MEASURED on story-43:
    // the PC drew Right Audience → Practiced Face → Right Audience, the same frame twice in
    // three beats. My own no-repeat check passed because it tested ONE story.
    //
    // A deterministic shuffle, then take the first n, cannot repeat by construction.
    var order = pool.map(function (f, i) {
      return { f: f, k: _h(storyId + '::' + characterId + '::' + i + '::' + f.id) };
    }).sort(function (a, b) { return a.k - b.k || (a.f.id < b.f.id ? -1 : 1); });
    // A TEST FIXTURE MAY PIN THE FIRST FRAME (offline only). Declared, so a canned editor reply
    // can be matched to a real assignment without the fixture also having to judge prose.
    try {
      if (typeof window !== 'undefined' && window._sbCplusForceFrame
          && String(window._sbCplusForceFrame.role || '') === String(role || '')) {
        var pin = window._sbCplusForceFrame.frameId;
        var pi = order.map(function (o) { return o.f.id; }).indexOf(pin);
        if (pi > 0) { var hit = order.splice(pi, 1)[0]; order.unshift(hit); }
      }
    } catch (_) {}
    var out = [];
    for (var i = 0; i < n; i++) {
      var f = order[i].f;
      out.push({ beatIndex: i + 1, frameId: f.id,
        bank: API.CPLUS_FRAMES.indexOf(f) !== -1 ? 'cplus' : 'tell',
        intent: BEAT_INTENT[Math.min(i, BEAT_INTENT.length - 1)],
        status: 'due', scene: null, deliveredAtScene: null });
    }
    return out;
  }
  function frameById(id) {
    var all = API.CPLUS_FRAMES.concat(API.TELL_FRAMES);
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) return all[i]; }
    return null;
  }
  // The ledger for a cast. `cast` is [{ id, name, role, firstAppearanceScene? }].
  function buildLedger(storyId, cast) {
    var led = { storyId: String(storyId == null ? '' : storyId), characters: {} };
    (cast || []).forEach(function (c) {
      if (!c || !c.id) return;
      led.characters[c.id] = { id: c.id, name: c.name || c.id, role: c.role || 'supporting',
        beats: assignFor(c.role, led.storyId, c.id) };
    });
    return led;
  }
  // WHAT IS DUE THIS SCENE. A supporting character's single beat comes due at their first
  // appearance, provided the scene gives them something to reveal — stated by the caller as
  // `actsOnAnother`, because "affects another person" is a judgement about the scene, not a
  // string match. A lead's beats are spaced across the story so two never land together.
  function dueThisScene(ledger, sceneNo, present) {
    var due = [];
    (present || []).forEach(function (p) {
      var rec = ledger && ledger.characters && ledger.characters[p.id];
      if (!rec) return;
      var open = rec.beats.filter(function (b) { return b.status !== 'delivered'; });
      if (!open.length) return;
      if (!_isLead(rec.role)) {
        if (p.actsOnAnother) due.push({ character: rec, beat: open[0] });
        return;
      }
      // Leads: one beat at a time, and not in the same scene as their previous one.
      var last = rec.beats.filter(function (b) { return b.deliveredAtScene != null; })
        .map(function (b) { return b.deliveredAtScene; }).sort(function (a, b) { return b - a; })[0];
      if (last != null && Number(sceneNo) <= Number(last)) return;
      due.push({ character: rec, beat: open[0] });
    });
    return due;
  }
  // THE DELIVERY. The assigned frame, ITS EXAMPLE, and the character's established details —
  // handed over when the beat comes due, which is also exactly what the C+ editor is told to
  // look for when it decides KEEP.
  function renderAssignment(item, established) {
    var f = frameById(item.beat.frameId);
    if (!f) return '';
    var L = [];
    L.push('═══ CHARACTER+ BEAT DUE THIS SCENE — ' + item.character.name + ' ═══');
    L.push('WHO: ' + item.character.name + ' (' + item.character.role + ')');
    L.push('BEAT ' + item.beat.beatIndex + ' OF ' + item.character.beats.length + ' — ' + item.beat.intent);
    L.push('FRAME — "' + f.title + '" (' + item.beat.bank + ' bank)');
    L.push('  ' + f.frame);
    L.push('  SLOTS: ' + f.slots.join(' · '));
    L.push('  ONE FILLED EXAMPLE, FOR SHAPE ONLY — every noun in it belongs to another story and');
    L.push('  must NOT appear in yours: ' + f.example);
    L.push('KEEP THE WORDING AROUND THE SLOTS, adjusting only for tense, point of view and voice.');
    L.push('FILL THE SLOTS from what is already established about ' + item.character.name
      + ' and from what is physically in THIS scene.');
    if (established && String(established).trim()) {
      L.push('ESTABLISHED, AND BINDING — ' + item.character.name + ': ' + String(established).trim());
    } else {
      L.push('NOTHING IS ESTABLISHED ABOUT ' + item.character.name.toUpperCase()
        + ' YET: the slots you fill become their first established detail, so choose what you are'
        + ' willing to keep true for the rest of the story.');
    }
    L.push('PLACE IT where ' + item.character.name + ' DOES something that affects another person'
      + ' — not in narration about them.');
    return L.join('\n');
  }
  // MARKED DELIVERED ONLY FROM THE PUBLISHED PAGE.
  //
  // HONEST LIMIT, STATED IN THE RECORD IT WRITES: whether a beat REVEALS what it was meant to is
  // a judgement, and that judgement belongs to the C+ editor's KEEP. What this can establish is
  // SURVIVAL: the character is named in the published prose and acts there. A beat that cannot be
  // found stays DUE and is offered again, which is strictly better than assuming it landed.
  // ── DELIVERY IS JUDGED ON THE ACCEPTED PASSAGE, NOT ON A NAME (Roman 2026-11-17) ──────────
  // THE OLD CHECK WAS WRONG IN BOTH DIRECTIONS, measured:
  //   false NEGATIVE  "I have a smile I use just for the screen."  — Dani's own C+ line, in first
  //                   person, never says "Dani", so it stayed DUE and would be re-offered forever.
  //   false POSITIVE  "Helen wondered whether Dani would ever come home." — an incidental mention
  //                   inside someone else's narration, marked DELIVERED.
  // A name plus any nearby verb is not evidence that a beat landed. What is evidence is the
  // PASSAGE the C+ editor accepted as delivering the beat, still present on the published page.
  //
  // So the editor names the passage and what it reveals; this function only asks whether that
  // exact passage SURVIVED. No passage accepted, or the accepted passage gone from the page, and
  // the beat stays due. Nothing here judges whether the passage is good — that was the editor's
  // KEEP, and it is recorded beside the evidence.
  function _norm(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]+>/g, ' ')
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/\s+/g, ' ')
      .trim().toLowerCase();
  }
  // ── THE CHARACTER MUST BE THE AGENT, NOT THE SUBJECT MATTER ─────────────────────────────
  // MEASURED as the opposite controls:
  //   "I have a smile I use just for the screen."            Dani ACTS. First person, no name.
  //   "Helen wondered whether Dani would ever come home."     Dani is what Helen WONDERS ABOUT.
  // Both are on the page and the second even names her, so survival alone cannot tell them
  // apart. A Character+ beat is something the person DOES; being the content of someone else's
  // thought is not a beat, and accepting it would let any incidental mention close a beat.
  //
  // NARROW BY DESIGN: a first-person agent counts for the PC, a name acting counts for anyone,
  // and a name sitting inside a complement clause (whether/that/if/about/how ...) does not.
  // It cannot judge whether the beat REVEALS anything — that is the editor's KEEP.
  function _isAgentIn(passage, rec, opts) {
    var s = String(passage || '');
    var first = String((rec && rec.name) || '').split(/\s+/)[0];
    var esc = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Named only as the content of someone else's clause → a mention, not agency.
    if (first && new RegExp('\\b(?:whether|that|if|about|how|why)\\s+(?:[^.]{0,40}?\\s)?'
        + esc + '\\b', 'i').test(s)) {
      // unless the SAME passage also has them acting in a main clause
      if (!new RegExp('(?:^|[.!?]\\s+)' + esc + '\\s+[a-z]', '').test(s)) return false;
    }
    var pcFirstPerson = !!(opts && opts.pcFirstPerson)
      && String((rec && rec.role) || '').toLowerCase().indexOf('pc') !== -1;
    if (pcFirstPerson && /(^|[^a-z])I\s+[a-z]|(^|\s)my\s+[a-z]/.test(s)) return true;
    if (first && new RegExp('(?:^|[.!?\u201c"]\\s*)' + esc + '\\s+[a-z]', '').test(s)) return true;
    if (first && new RegExp('\\b' + esc + '\\s+(?:had|has|was|is|would|could|never|always)\\b', 'i').test(s)
        && !new RegExp('\\b(?:whether|that|if|about|how|why)\\s+(?:[^.]{0,40}?\\s)?' + esc, 'i').test(s)) return true;
    return false;
  }

  // accepted: [{ characterId, beatIndex, passage, reveals }] — from the C+ editor.
  // `edited` (optional) is the editor's APPLIED EDITS, parsed back to their beats. It exists
  // because a beat the editor answered by editing used to settle as
  //   "still due" · "the C+ editor accepted no passage for this beat"
  // even though the editor's sentence was on the published page. The two routes stay labelled
  // apart: a KEEP is the author's own sentence the editor vouched for; an EDIT is the editor's
  // sentence. Both must survive onto the page and both must pass the agency test. Neither is
  // semantic proof — this pass runs no judge.
  function markDeliveredFromPage(ledger, publishedText, sceneNo, accepted, edited) {
    var out = [];
    var page = _norm(publishedText);
    var byKey = {};
    (accepted || []).forEach(function (a) {
      if (a && a.characterId && a.beatIndex != null) byKey[a.characterId + '#' + a.beatIndex] = a;
    });
    var byKeyEdit = {};
    (edited || []).forEach(function (a) {
      if (a && a.characterId && a.beatIndex != null) byKeyEdit[a.characterId + '#' + a.beatIndex] = a;
    });
    Object.keys((ledger && ledger.characters) || {}).forEach(function (id) {
      var rec = ledger.characters[id];
      rec.beats.forEach(function (bt) {
        if (bt.status === 'delivered') return;
        if (bt.scene == null || Number(bt.scene) !== Number(sceneNo)) return;
        var acc = byKey[id + '#' + bt.beatIndex];
        var viaEdit = false;
        if (!acc || !String(acc.passage || '').trim()) {
          // No keep for this beat. Did the editor answer it by EDITING?
          var ed = byKeyEdit[id + '#' + bt.beatIndex];
          if (ed && String(ed.passage || '').trim()) { acc = ed; viaEdit = true; }
        }
        if (!acc || !String(acc.passage || '').trim()) {
          bt.status = 'due'; bt.scene = null;
          out.push({ character: rec.name, beat: bt.beatIndex, frameId: bt.frameId,
            status: 'still due',
            why: 'the C+ editor neither accepted a passage nor applied an edit for this beat' });
          return;
        }
        var passage = _norm(acc.passage);
        // A short fragment is not evidence; it would match by accident.
        if (passage.length < 24) {
          bt.status = 'due'; bt.scene = null;
          out.push({ character: rec.name, beat: bt.beatIndex, frameId: bt.frameId,
            status: 'still due', why: (viaEdit ? 'the editor\u2019s applied edit' : 'the accepted passage')
              + ' is too short to be evidence' });
          return;
        }
        if (!_isAgentIn(acc.passage, rec, { pcFirstPerson: true })) {
          bt.status = 'due'; bt.scene = null;
          out.push({ character: rec.name, beat: bt.beatIndex, frameId: bt.frameId,
            status: 'still due',
            why: rec.name + ' is not the agent in the '
              + (viaEdit ? 'editor\u2019s applied edit' : 'accepted passage') + ' \u2014 they are what it is '
              + 'about, which is a mention and not a Character+ beat' });
          return;
        }
        if (page.indexOf(passage) !== -1) {
          bt.status = 'delivered'; bt.deliveredAtScene = Number(sceneNo);
          bt.passage = String(acc.passage).trim();
          bt.reveals = String(acc.reveals || '').trim() || null;
          // WHICH PEN DELIVERED IT, recorded on the beat, so a reader of the ledger can tell an
          // author sentence the editor vouched for from a sentence the editor wrote itself.
          bt.deliveredVia = viaEdit ? 'editor-edit' : 'author-passage';
          bt.semanticallyVerified = false;
          out.push({ character: rec.name, beat: bt.beatIndex, frameId: bt.frameId,
            status: 'delivered', via: bt.deliveredVia,
            passage: bt.passage.slice(0, 90), reveals: bt.reveals,
            why: viaEdit ? 'the C+ editor answered this beat by applying an edit, and that '
              + 'sentence is on the published page' : undefined });
        } else {
          bt.status = 'due'; bt.scene = null;
          out.push({ character: rec.name, beat: bt.beatIndex, frameId: bt.frameId,
            status: 'still due',
            why: (viaEdit ? 'the editor\u2019s applied edit' : 'the accepted passage')
              + ' did not survive onto the published page' });
        }
      });
    });
    return out;
  }

  API.BEAT_INTENT = BEAT_INTENT;
  API.beatsFor = beatsFor;
  API.assignFor = assignFor;
  API.frameById = frameById;
  // ── THE CAST IS MERGED BY STABLE ID, NEVER REBUILT (Roman 2026-11-17) ───────────────────
  // MEASURED: the live builder runs more than once per scene, and on an early pass the roster
  // held only [pc:self] while a later pass held [pc:self, named:helen_macbrayne]. The rebuild
  // condition keyed on CAST SIZE, so the ledger was thrown away and reassigned mid-scene —
  // which can discard a character's assignment and any delivery already recorded for it.
  //
  // Merging by id instead: a new person is ADDED with their own assignment, an existing person
  // keeps theirs, and delivered beats keep their passage, reveal and scene. Nobody is removed
  // when a roster shrinks, because a character who left the room has not lost their history.
  function mergeLedgerCast(ledger, storyId, cast) {
    var led = (ledger && ledger.characters) ? ledger : { storyId: String(storyId == null ? '' : storyId), characters: {} };
    led.storyId = String(storyId == null ? '' : storyId);
    var added = [], kept = [];
    (cast || []).forEach(function (c) {
      if (!c || !c.id) return;
      var ex = led.characters[c.id];
      if (!ex) {
        led.characters[c.id] = { id: c.id, name: c.name || c.id, role: c.role || 'supporting',
          beats: assignFor(c.role, led.storyId, c.id) };
        added.push(c.id);
        return;
      }
      kept.push(c.id);
      // A name or role can be refined by a later pass; the ASSIGNMENT and history do not move.
      if (c.name) ex.name = c.name;
      if (c.role && !_isLead(ex.role) && _isLead(c.role)) {
        // Promoted to a lead by a later resolution: extend to the lead beat count, keeping
        // everything already assigned and everything already delivered.
        var want = beatsFor(c.role, led.storyId, c.id);
        if (ex.beats.length < want) {
          var pool = API.CPLUS_FRAMES.concat(API.TELL_FRAMES);
          var used = {}; ex.beats.forEach(function (b) { used[b.frameId] = 1; });
          var extra = assignFor(c.role, led.storyId, c.id)
            .filter(function (b) { return !used[b.frameId]; });
          for (var i = ex.beats.length; i < want && extra.length; i++) {
            var nb = extra.shift();
            nb.beatIndex = i + 1;
            nb.intent = BEAT_INTENT[Math.min(i, BEAT_INTENT.length - 1)];
            ex.beats.push(nb);
          }
        }
        ex.role = c.role;
      }
    });
    led._lastMerge = { added: added, kept: kept, at: Date.now() };
    return led;
  }

  // ── THE DUE LIST, RESOLVED ONCE FROM THE ACCEPTED STAGE ─────────────────────────────────
  // One resolution, reused by BOTH the author prompt and the craft obligations, so the two can
  // never disagree about which beats are due. Previously each site computed its own, and the
  // author got Dani while craft got Dani twice and Helen not at all.
  // ── THE CURRENT SCENE'S ROSTER, NOT SCENE 1'S (Roman 2026-11-17) ──────────────────────
  // This read `_scene1StageResolved` unconditionally. On a continuation that field still holds
  // the OPENING's roster, so a Scene 2 that brings a new person on stage resolves nobody for
  // them, and a person who has since left is still offered a beat. app.js now publishes the
  // authoritative roster under the scene it belongs to (`_cplusStageForScene`); Scene 1's own
  // field remains the fallback for scene 1, so the opening path is unchanged.
  // Returns { stage, scene } or null. The record's OWN scene is authoritative — app.js
  // publishes it from _sceneBeingBuilt, which is the one function that knows which scene is
  // being assembled. `floor` is turnCount + 1: turnCount advances only after finalization, so
  // while scene N is authored it reads N-1 and the floor is N. A record BELOW the floor is
  // stale (turnCount never goes backwards) and is refused; at or above it, it is this scene.
  function _stageForScene(st, floor) {
    try {
      var cur = st._cplusStageForScene || null;
      if (cur && cur.stage && ((cur.stage.onStage || []).length)
          && Number(cur.scene) >= Number(floor)) {
        return { stage: cur.stage, scene: Number(cur.scene) };
      }
      if (Number(floor) === 1 && st._scene1StageResolved) {
        return { stage: st._scene1StageResolved, scene: 1 };
      }
      return null;
    } catch (_) { return null; }
  }
  // ── DOES THIS SUPPORTING CHARACTER ACT IN THIS SCENE? ─────────────────────────────────
  // Scene 1 has one piece of NON-CIRCULAR evidence: the plan names the one person the opening
  // beat shows DOING something (`opening_actor_id`). A continuation has no opening beat, so
  // that field is absent — or, worse, still carries Scene 1's actor. There the evidence is
  // presence IN PERSON: a continuation stages the people the reader's choice acts on and who
  // act back, and a named supporting character has no crowd to stand in.
  //
  // This is deliberately the OFFER gate and not the CREDIT gate. markDeliveredFromPage() still
  // requires the character to be the AGENT in the passage the editor accepted, so a frame
  // offered to someone who never acts is simply never delivered and returns next scene. Being
  // generous about offering costs a prompt block; being generous about crediting would mark a
  // beat delivered that the reader never got.
  function _actsThisScene(rec, entry, scene, actorId) {
    if (!rec) return false;
    if (String(rec.role || '') !== 'supporting') return true;
    if (Number(scene) === 1) return !!actorId && actorId === rec.id;
    return String((entry && entry.presence) || 'IN_PERSON') === 'IN_PERSON';
  }
  function resolveDue(state) {
    try {
      var st = state || {};
      var led = st._cplusBeatLedger || null;
      if (!led || !led.characters) return [];
      var scene = Number(st.turnCount || 0) + 1;
      var _hit = _stageForScene(st, scene);
      if (!_hit) return [];
      var res = _hit.stage;
      scene = _hit.scene;      // the beat is stamped with the scene its roster was published for
      var onIds = {};
      (res.onStage || []).forEach(function (e) { if (e && e.id) onIds[String(e.id)] = e; });
      var actor = '';
      try {
        actor = String((st.sceneSkeleton && st.sceneSkeleton.opening_actor_id) || '');
      } catch (_) { actor = ''; }
      var out = [];
      Object.keys(led.characters).forEach(function (cid) {
        var rec = led.characters[cid];
        if (!onIds[cid]) return;
        if (!_actsThisScene(rec, onIds[cid], scene, actor)) return;
        var open = (rec.beats || []).filter(function (b) { return b.status !== 'delivered'; });
        if (!open.length) return;
        var bt = open[0];
        bt.scene = scene;
        var fr = frameById(bt.frameId);
        if (!fr) return;
        out.push({ character: rec, beat: bt, frame: fr });
      });
      return out;
    } catch (_) { return []; }
  }
  // The author-facing block for the whole due list, rendered at the final prompt boundary.
  function renderDueForAuthor(state, dueList, establishedFor) {
    var L = [];
    (dueList || []).forEach(function (item) {
      var est = '';
      try { est = establishedFor ? String(establishedFor(item) || '') : ''; } catch (_) { est = ''; }
      L.push(renderAssignment(item, est));
      L.push('');
    });
    return L.join('\n');
  }

  API.resolveDue = resolveDue;
  API._stageForScene = _stageForScene;
  API._actsThisScene = _actsThisScene;
  API.renderDueForAuthor = renderDueForAuthor;
  API.mergeLedgerCast = mergeLedgerCast;
  API.buildLedger = buildLedger;
  API.dueThisScene = dueThisScene;
  API.renderAssignment = renderAssignment;
  API.markDeliveredFromPage = markDeliveredFromPage;
  API._isAgentIn = _isAgentIn;
})();
