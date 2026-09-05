/* ═══════════════════════════════════════════════════════════════════════════
 * STORYBOUND — BAKED SCENE 1 PACKAGES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every starter Book EXCEPT Famous Fate opens on a hand-authored Scene 1 that
 * ships with the app. It is not generated — not for anonymous visitors, not for
 * signed-in readers, not ever. Opening the Book costs nothing, makes zero API
 * calls, and renders instantly.
 *
 * WHY THIS EXISTS
 *   Scene 1 is the shop window. It should be the best prose in the product,
 *   identical for every reader, authored by a human, and free to look at. The
 *   Genesis purchase (or, for a logged-out visitor, signing in) is what buys
 *   Scene 2 onward — the charge moved off the Book click and onto the first
 *   thing the reader does AFTER they have read.
 *
 * THE `prose` FIELD IS AUTHORED BY HAND. It is FINAL. It never passes through
 * the generation pipeline's validators, repair passes, or editorial stack — a
 * validator that can rewrite is a competing author, and there is no author to
 * compete with here. `_renderBakedScene1` mounts it verbatim.
 *
 * ── EVERYTHING IN THIS FILE IS A PLACEHOLDER ────────────────────────────────
 * Every `prose`, `panels[].prose`, and `emitted` value below is scaffolding of
 * the RIGHT SHAPE with the WRONG WORDS, so the render path, the gates, and the
 * Scene-2 handoff can be exercised end to end. Roman authors the real Scene 1
 * for each Book. Replace the content, keep the schema, bump `version`.
 *
 * ── PACKAGE SCHEMA ──────────────────────────────────────────────────────────
 *   version   string   bump on every content change; shown in [BAKED] logs
 *   placeholder bool   true while the content is scaffolding (surfaced in the [BAKED] load log)
 *   format    'literary' | 'cg'
 *   title     string   MUST match STARTER_STORIES[].title (the locked title)
 *   synopsis  string   inside-cover / back-cover blurb for this opening
 *   prose     string   LITERARY: the whole scene, verbatim, paragraph breaks as \n\n
 *   panels    array    CG only: 5 panels (state.gnPanelsPerScene is locked at 5).
 *                      { n, imageLabel, prose }  — imageLabel is the placeholder
 *                      caption until real art is baked; no image is generated.
 *   endsAt    string   CG only: 'oas_interrupt' — the scene runs to the moment the
 *                      OAS would open. That handoff is the gate.
 *   ambient   string   REQUIRED. One key from window._SCENE_AMBIENT_TAGS (see
 *                      _SCENE_AMBIENT_FILES in sound.js). Mounting a scene page
 *                      normally fires a Grok ambient classifier; a baked scene
 *                      ships its tag so that call never happens. Omitting this
 *                      does not break the page — it falls back to neutral_quiet
 *                      — but the scene will sound wrong.
 *
 *   emitted   object   WHAT SCENE 2 READS. Scene 1 normally emits a great deal of
 *                      state as a side effect of being generated; a baked scene has
 *                      to carry it explicitly or Scene 2 cold-starts and the story
 *                      forgets its own opening. Authored alongside the prose:
 *     sceneSummary   string   what happened, in plain English, for the context builder
 *     openState      object   { location, timeOfDay, presentCast[], pcCondition }
 *     obligations    string[] hard beats Scene 2 inherits and must honor
 *     ledgerSeeds    object[] relationship perception events Scene 1 established
 *                             { subject, about, perception } — feeds _relationshipLedger
 *     calcification  object   { phrases[], moves[] } — this scene's signatures, so the
 *                             anti-repetition rotator does not let Scene 2 reuse them
 *     axes           object   { microDecision, pull, polarity } opening values
 *     expansions     object   { A, B } — the <<EXPANSION_A/B>> payoffs for the
 *                             scene-tail micro-choice, pre-authored (no click-time gen)
 *
 * The structural spine for these Books already lives in STARTER_SEEDS /
 * STARTER_PLANS in app.js — world truths, cast, and the 20-scene arc. `emitted`
 * is the OTHER half: not what the story IS, but what this particular scene DID.
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var PH = '[PLACEHOLDER SCENE — the authored Scene 1 replaces this text.]';

  var STARTER_SCENE1 = {

    /* ── THE FIRST TASTE — literary (Genesis 30✦, scenes 2–10 on unlock) ───── */
    starter_the_first_taste: {
      version: '0.1.0-placeholder',
      placeholder: true,
      format: 'literary',
      title: 'The First Taste',
      ambient: 'crowd_formal',       // masked gala, formal crowd
      synopsis: 'A masked gala. A stranger whose voice you almost recognize. One night to decide whether power is something you take — or something you surrender.',
      prose: [
        PH,
        'The invitation had no name on it, which should have been the first thing I questioned and was, instead, the reason I came. Cream stock, heavier than it needed to be. An address in a part of the city where the streetlights are spaced further apart because the people who live there prefer it that way.',
        'I had been standing under the awning for four minutes deciding whether to go in. That is the kind of detail I keep. Not the dress, not the car that let me out, not the weather. Four minutes, and the small sound my heel made each time I shifted my weight.',
        'Inside, the room did the thing that expensive rooms do — it made a sound like a room half its size. Masks everywhere, and beneath them the particular confidence of people who have never once had to explain themselves.',
        'Someone said my name. Not the name on the invitation, because there wasn\'t one. My actual name, in a voice I was certain I had heard before and could not place, and the certainty was worse than the not-placing.',
        'I turned around.',
        PH
      ].join('\n\n'),
      emitted: {
        sceneSummary: 'PLACEHOLDER. The PC arrives alone at a masked gala she was invited to anonymously, hesitates at the threshold, and is recognized by name by a masked stranger whose voice she almost places.',
        openState: {
          location: 'the gala\'s main floor, just inside the entrance',
          timeOfDay: 'late evening',
          presentCast: ['PC', 'the masked stranger (unidentified)'],
          pcCondition: 'alert, off-balance, has not yet removed her mask'
        },
        obligations: [
          'PLACEHOLDER — the stranger knows the PC\'s real name and she does not know why.',
          'PLACEHOLDER — the invitation was unsigned; who sent it is an open question.'
        ],
        ledgerSeeds: [
          { subject: 'PC', about: 'the masked stranger', perception: 'PLACEHOLDER — recognizes the voice without being able to name it, and reads that failure as a threat rather than a curiosity.' }
        ],
        calcification: {
          phrases: ['the room did the thing that expensive rooms do', 'four minutes'],
          moves: ['scene opens on the PC hesitating at a threshold', 'closes on the PC turning toward an unidentified speaker']
        },
        axes: { microDecision: null, pull: 'approach', polarity: 'guarded' },
        expansions: {
          A: 'PLACEHOLDER — payoff if the reader chooses to hold her ground.',
          B: 'PLACEHOLDER — payoff if the reader chooses to close the distance.'
        }
      }
    },

    /* ── GLASS HOUSE — literary (Genesis 30✦, scenes 2–20 on unlock) ───────── */
    starter_glass_house: {
      version: '0.1.0-placeholder',
      placeholder: true,
      format: 'literary',
      title: 'Glass House',
      ambient: 'urban_room',         // her apartment during the evening Chorus
      synopsis: 'A society that loves out loud, together — until you feel the one thing you are forbidden to feel alone.',
      prose: [
        PH,
        'The Chorus came up at 6:40 the way it always did, and for the first eleven seconds of it I was fine. Eleven seconds is a long time when you are counting them.',
        'Everyone talks about the aperture like it is a window. It is not a window. A window is a thing you look through. The aperture is a thing that looks back, and it does not do you the courtesy of blinking.',
        'My neighbor two floors down was feeling something enormous about her daughter and the whole building had it by 6:42, the way you have weather. That is supposed to be the beautiful part. I have been told it is the beautiful part in a voice that did not leave room for a second opinion.',
        'What I felt at 6:43 I felt by myself. Deliberately. I put it somewhere the Field could not reach and I held it there with both hands, and the effort of that was the first genuinely private thing I had done in nine years.',
        'The aperture stayed open. It always stays open.',
        'It just had nothing of mine to carry.',
        PH
      ].join('\n\n'),
      emitted: {
        sceneSummary: 'PLACEHOLDER. During the daily Chorus, the PC deliberately withholds a feeling from the Field for the first time in nine years, and discovers she can — which is itself the forbidden act.',
        openState: {
          location: 'the PC\'s apartment during the evening Chorus',
          timeOfDay: 'evening, 6:40',
          presentCast: ['PC'],
          pcCondition: 'newly, secretly aware she can hold something back'
        },
        obligations: [
          'PLACEHOLDER — the PC is now carrying a private feeling in a society with no privacy.',
          'PLACEHOLDER — nobody has noticed yet. Someone will.'
        ],
        ledgerSeeds: [
          { subject: 'PC', about: 'the Chorus', perception: 'PLACEHOLDER — has stopped experiencing it as belonging and started experiencing it as surveillance, and cannot say so.' }
        ],
        calcification: {
          phrases: ['the aperture is a thing that looks back', 'eleven seconds'],
          moves: ['scene structured around a timed daily ritual', 'closes on an absence rather than an event']
        },
        axes: { microDecision: null, pull: 'withdraw', polarity: 'concealing' },
        expansions: {
          A: 'PLACEHOLDER — payoff if the reader chooses to let the feeling through.',
          B: 'PLACEHOLDER — payoff if the reader chooses to keep holding it.'
        }
      }
    },

    /* ── THE FIRST SACRIFICE — cinegraphic (gate at the OAS handoff) ─────────
     * PRICING NOTE: PREVIEW_CATALOG declares 15✦ / 115✦ but still carries
     * `stub: true`, and that flag is what makes this Book free. A signed-in
     * reader therefore unlocks it WITHOUT being charged — the gate fires, the
     * confirm screen short-circuits on the stub, and the OAS opens. Dropping
     * `stub: true` is what switches the 15✦ charge on. Until then, "Genesis
     * 15✦" describes the intent, not the behavior. */
    starter_first_sacrifice: {
      version: '0.1.0-placeholder',
      placeholder: true,
      format: 'cg',
      title: 'The First Sacrifice',
      ambient: 'crowd_uneasy',       // the assembled house turning on her
      synopsis: 'The binding ritual demands a sacrifice neither of you expected. Ancient magic pulls you closer to someone who should be your enemy — and the cost of resisting may be greater than the cost of giving in.',
      // 5 panels: state.gnPanelsPerScene is locked at 5 (1 scene = 1 page = 5 panels).
      // NO ART IS GENERATED. Each panel renders its imageLabel as a placeholder plate
      // until the authored art is baked in alongside the authored prose.
      panels: [
        { n: 1, imageLabel: 'Image 1', prose: PH + ' Establishing: the binding circle at dusk, the assembled house, the PC brought in under guard.' },
        { n: 2, imageLabel: 'Image 2', prose: PH + ' The terms of the binding are read aloud. The PC understands what is being asked a beat before the room does.' },
        { n: 3, imageLabel: 'Image 3', prose: PH + ' The love interest is revealed as the other half of the binding. Neither of them chose this.' },
        { n: 4, imageLabel: 'Image 4', prose: PH + ' The first contact of the rite. Quicksilver at the wrist. The circle takes.' },
        { n: 5, imageLabel: 'Image 5', prose: PH + ' The house withdraws and leaves them bound and alone, which is the part nobody warned her about.' }
      ],
      // The scene runs to the threshold of the One-on-One (OAS) interface and stops.
      // The OAS is live — every exchange is a real generation — so it cannot be baked
      // and cannot be free. `_initIntimacyDialogue` is gated: signing in / unlocking
      // Genesis is what opens it.
      endsAt: 'oas_interrupt',
      oasHandoff: {
        cue: 'PLACEHOLDER — the line, gesture, or look that hands the scene to the live one-on-one.',
        openingFrame: 'PLACEHOLDER — the state the OAS opens in: who speaks first, what the binding has just done to both of them.'
      },
      emitted: {
        sceneSummary: 'PLACEHOLDER. The binding rite is performed; the PC and the love interest are bound to each other against the will of both, and the house leaves them alone with it.',
        openState: {
          location: 'the binding chamber, after the house has withdrawn',
          timeOfDay: 'dusk into night',
          presentCast: ['PC', 'the love interest'],
          pcCondition: 'newly bound, quicksilver still at the wrist, alone with him for the first time'
        },
        obligations: [
          'PLACEHOLDER — the binding is done and cannot be undone by either of them.',
          'PLACEHOLDER — neither consented; both are now responsible for the other.'
        ],
        ledgerSeeds: [
          { subject: 'PC', about: 'the love interest', perception: 'PLACEHOLDER — reads his stillness during the rite as complicity, and is wrong about that in a way that will cost her.' }
        ],
        calcification: {
          phrases: ['the circle takes', 'quicksilver at the wrist'],
          moves: ['scene built as a public ritual collapsing into a private one', 'closes on enforced proximity']
        },
        axes: { microDecision: null, pull: 'endure', polarity: 'defiant' },
        expansions: {
          A: 'PLACEHOLDER — payoff if the reader chooses to speak first.',
          B: 'PLACEHOLDER — payoff if the reader chooses to make him speak first.'
        }
      }
    }
  };

  window.STARTER_SCENE1 = STARTER_SCENE1;

  /** The baked package for a starter id, or null if that Book generates its
   *  Scene 1 live (Famous Fate — the world is named by the player, so there is
   *  nothing to bake). */
  window._bakedScene1For = function (starterId) {
    try { return (starterId && STARTER_SCENE1[starterId]) || null; } catch (_) { return null; }
  };

  try {
    var _ph = Object.keys(STARTER_SCENE1).filter(function (k) { return STARTER_SCENE1[k].placeholder; });
    console.log('[BAKED] starter-scenes.js loaded — ' + Object.keys(STARTER_SCENE1).length +
      ' package(s)' + (_ph.length ? ', ' + _ph.length + ' still PLACEHOLDER: ' + _ph.join(', ') : ''));
  } catch (_) {}
})();
