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
      // ── THE FIRST SACRIFICE — fixed editorial Scene 1 (Roman's canonical sequence, 2026-09-10) ──
      // Authored from STARTER_SEEDS / STARTER_PLANS facts + the product lore (The Answer = the First Favored Witness; ranks
      // Dohkar → Profer; offices Chayr → Provast → First Dohkar; Julian = Provast, next for First Dohkar, per Roman). Lenses: Lirael = OPEN VEIN, Julian = SPELLBINDER (Roman 2026-09-10). REAL CG SHAPE: ~20 beats (conversation + inner thought + description) over
      // 4 dramatic images + 1–4 character intro images. Beats 1–5 of Roman's sequence are this page; beats 6–7 (Julian's
      // public interrogation, the Dohkar's interruption, run-or-remain) are the OAS, carried by `oasHandoff` below.
      version: '1.8.0-editorial',
      placeholder: false,
      format: 'cg',
      title: 'The First Sacrifice',
      ambient: 'crowd_uneasy',       // two dozen First Favored in a dawn clearing, turning on the supervisor
      synopsis: 'Lirael’s first time supervising a First Sacrifice. Her ward Seren spends the wish on her instead of herself, the words bend, and the presiding Dohkar names Lirael for it — until the still man at the edge of the clearing, the Provast, puts The Answer in her hands and says he will question her before them all.',
      images: [
        { id: "intro_lirael", kind: "intro", label: "Lirael", subject: "Lirael" },
        { id: "intro_seren", kind: "intro", label: "Seren", subject: "Seren" },
        { id: "intro_dohkar", kind: "intro", label: "The presiding Dohkar", subject: "the presiding Dohkar" },
        { id: "intro_julian", kind: "intro", label: "Julian", subject: "Julian" },
        { id: "d1", kind: "dramatic", label: "Image 1", subject: "the rite begins — Seren kneeling before Lirael in the dawn clearing" },
        { id: "d2", kind: "dramatic", label: "Image 2", subject: "the wish — Seren speaks it; Lirael tears the band and moves" },
        { id: "d3", kind: "dramatic", label: "Image 3", subject: "the charge — the assembly turns; the presiding Dohkar names Lirael" },
        { id: "d4", kind: "dramatic", label: "Image 4", subject: "The Answer — Julian closes her hands around it before them all" },
      ],
      // ── BAKED-IMAGE-PRECEDENT PLUMBING (Roman 2026-09-19) — generic starter-package capability,
      // consumed by the structured renderer (_mountImageOccurrence, app.js) instead of text markup.
      // ASSETS: the real underlying generated images. 4 solo intro portraits + ONE shared 2x2
      // interaction sheet (NOT 4 independent dramatic images) — matches the real production default
      // contract (_renderOneShotSheet). `url` is null until the scene is actually rendered (not yet
      // authorized — see the packet's fate_card_lifecycle_correction-style disclosure convention);
      // the structured renderer resolves to nothing when url is absent, never a placeholder image.
      imageAssets: [
        { id: "intro_lirael", kind: "intro", label: "Lirael", url: null },
        { id: "intro_seren", kind: "intro", label: "Seren", url: null },
        { id: "intro_dohkar", kind: "intro", label: "The presiding Dohkar", url: null },
        { id: "intro_julian", kind: "intro", label: "Julian", url: null },
        { id: "interaction_sheet_1", kind: "sheet", label: "Scene 1 interaction sheet (d1-d4)", url: null },
      ],
      // OCCURRENCES: keyed by the SAME strings already used in beats[].image / images[].id above —
      // the locked 20-beat template (see _first_sacrifice_source_packet.json
      // scene1_beat_number_template) already fixes which of these 9 keys each of the 20 beats uses;
      // this table is what turns that already-locked key into a real asset + treatment + (for a
      // sheet) quadrant. The 4 intro keys are 'full' occurrences of their own solo asset. d1-d4 are
      // 'quadrant' occurrences of the ONE shared interaction_sheet_1 asset — 4 occurrences, 1 asset.
      // dohkar_interruption is a 9th OCCURRENCE (not a 9th asset): the Dohkar's later interruption
      // reuses his existing intro_dohkar asset at a tighter 'close' camera treatment — zero new
      // generation, wired via oasHandoff.interruptionPortrait below.
      imageOccurrences: {
        intro_lirael: { assetId: "intro_lirael", treatment: "full" },
        intro_seren: { assetId: "intro_seren", treatment: "full" },
        intro_dohkar: { assetId: "intro_dohkar", treatment: "full" },
        intro_julian: { assetId: "intro_julian", treatment: "full" },
        d1: { assetId: "interaction_sheet_1", treatment: "quadrant", quadrant: 0 },
        d2: { assetId: "interaction_sheet_1", treatment: "quadrant", quadrant: 1 },
        d3: { assetId: "interaction_sheet_1", treatment: "quadrant", quadrant: 2 },
        d4: { assetId: "interaction_sheet_1", treatment: "quadrant", quadrant: 3 },
        dohkar_interruption: { assetId: "intro_dohkar", treatment: "close" },
      },
      beats: [
        { idx: 0, kind: "narration", speaker: null, image: "intro_lirael",
          text: "Dawn in the Veilwood, and the clearing was already full. The white weeping-willow veil-canopy hung down around us from the pale mated-pair trees, leaf-curtains close enough to touch, and under our bare feet the deep-crimson spiralgrass braided and re-braided itself the way it only does where First Sacrifices have been witnessed for generations. The ground was the record of everything the assembly had come to watch. Two dozen of Seren’s people stood on it in gossamer Veilweave. I stood on it in the sash." },
        { idx: 1, kind: "exposition", speaker: null, image: "intro_lirael",
          text: "The one ornamented sash of the officiating Sacrificiant, and the band — a strip of gossamer tied across my mouth and knotted behind my head, so that the guide of a First Sacrifice cannot cleanly voice a wish of her own while a child spends hers. My first time as the responsible Sacrificiant. My father had knelt on grass like this as a Dohkar and had left it as Provast, over every college in these woods, and the college standing here now had come to see whether his daughter could carry one child through one wish. I breathed behind the cloth and did not let my Weave-Script say what I was feeling." },
        { idx: 2, kind: "narration", speaker: null, image: "intro_seren",
          text: "Seren, the Graduant, knelt in front of me in her child’s tunic. Aqua-skinned, her pale coral hair combed flat for once, composed the way months of rehearsal had made her, and the Weave-Script along her forearms held a steady coral that said, plainly, pride. Not a tremor in it. She was sixteen this season and she had wanted this morning more than I had." },
        { idx: 3, kind: "dialogue", speaker: "Seren", image: "intro_seren",
          text: "“I know it by heart,” she whispered up at me, before the Dohkar could begin. “You can stop looking at me like that.” I could not answer through the band, so I read her instead, the way I had been trained to: two dozen alignments in the clearing and hers the brightest of all, every part of her pointing at the same true thing. I let myself believe we were safe." },
        { idx: 4, kind: "narration", speaker: null, image: "intro_dohkar",
          text: "The presiding Dohkar wore no sash. He held the rite to its fixed order — invocation, then sacrifice, then desire — in the tone of a man who has said the words more times than he has listened to them. He had examined under my father once. He had never been asked to head anything, and he stood the way men stand who keep count of that. He had spent so many years being unmoved by other people’s wishes that being passed over was the only feeling he had left that showed, and he showed it the only way he knew — as procedure. He could not guide a child through a rite without turning it into a lesson about himself, which is why families asked for him last." },
        { idx: 5, kind: "dialogue", speaker: "the presiding Dohkar", image: "intro_dohkar",
          text: "“The cost first,” he said, to Seren and to the clearing. Seren named her offering aloud, as rehearsed: her earliest memory, the one thing she could not get back and could not fake giving. The assembly settled, because this was correct." },
        { idx: 6, kind: "narration", speaker: null, image: "intro_julian",
          text: "At the edge of the gathering, apart from Seren’s family and guests, a man stood too still. Deep slate-blue skin, long black hair fallen forward past his jaw, silver Weave-Script quiet along his arms, a healed scar over the left wrist. Julian. The Provast — the office my father had held before him, over every Chayr in the Veilwood, and the man next in line for First Dohkar. Present as an observer only, and observing me. He never crossed a floor first. He had let clearings full of people come to him for twenty years and called it patience, and I — who cannot stand at the edge of anything without my whole face announcing it — could not tell whether what he was withholding from me was a feeling or the fact that there wasn’t one. My father used to say Julian saw everything in a room and offered none of it, and let people call that discretion because it cost him nothing." },
        { idx: 7, kind: "narration", speaker: null, image: "intro_julian",
          text: "I had noticed him the way you notice a change in the light, before I knew what I was noticing. I made myself look back at my ward. Along my own arms the Weave-Script stayed the colour I wanted it to be, and I was proud of that for exactly as long as it lasted." },
        { idx: 8, kind: "narration", speaker: null, image: "d1",
          text: "Seren began the invocation. I knew every word of it, and for the space of three of them I was not afraid. Then she looked up at me — not at the Dohkar, not at her mother — and I watched her decide." },
        { idx: 9, kind: "dialogue", speaker: "Seren", image: "d1",
          text: "She abandoned the practiced wish. She knew the rule; she had recited it back to me for months. In front of the whole assembly she spent her First Sacrifice on me instead. Seren could not help herself: even her one wish had to be about what a caring person she was, and she had to be seen being it. I knew what she was doing before the words finished. I have never in my life been able to keep a feeling off my face, and it has taught me exactly what one looks like when it has been arranged there. At least she spared me some embarrassment by blurring the wound instead of naming it. “So that Lirael may find the one she lost.” It was the beautiful mistake." },
        { idx: 10, kind: "narration", speaker: null, image: "d2",
          text: "I heard it the instant the words left her: not a wrong note but a loose one, a wish described too gently to bind. Every First Favored in the clearing heard it a breath after I did. A Weave-Script stuttered on a guest’s throat. One hand stopped mid-gesture. The Dohkar went still." },
        { idx: 11, kind: "narration", speaker: null, image: "d2",
          text: "I was sealed. I was forbidden to interfere. Intervening now would look like exactly what it would look like, because the wish was about me. I tore the band away and moved toward her anyway." },
        { idx: 12, kind: "dialogue", speaker: "Lirael", image: "d2",
          text: "“Seren —” The first word I had spoken aloud since the sash went on, and it was already too late to be anything but evidence. She looked up at me, pleased, and then puzzled that I was not." },
        { idx: 13, kind: "narration", speaker: null, image: "d3",
          text: "Nothing flared. Nothing was seen. Fate does not perform; it honours the words as spoken and denies the intent as meant. Seren had asked that I find the one I lost, and what was found, in that clearing, was the loss itself — two dozen faces turning to me at once, looking for it, reading the torn band and the step I had taken and the sash that said whose rite this was." },
        { idx: 14, kind: "dialogue", speaker: "the presiding Dohkar", image: "d3",
          text: "“‘Find.’” The presiding Dohkar named the word, because he cannot let a lesson pass. “She asked that you find the one you lost. Fate did not go looking. It made every one of us look at you.”" },
        { idx: 15, kind: "dialogue", speaker: "the presiding Dohkar", image: "d3",
          text: "Then the charges, laid in the order he thought them: that the wish had been shaped for its supervisor’s benefit — coerced, or worse, taught — and that the supervisor had broken her seal and interfered in her own ward’s rite. Either would have ended it: Dohkar this morning, Chayr, Provast one day, the path my father had walked and I had never once imagined not walking. Together they made me something the clearing stepped back from. Seren’s mother was on her feet." },
        { idx: 16, kind: "narration", speaker: null, image: "d3",
          text: "And still, with my standing coming down around me, some traitorous part of my attention went to the edge of the gathering, to the man who had not moved. I did not want him to look away. I wanted, God help me, to be the thing he was looking at." },
        { idx: 17, kind: "narration", speaker: null, image: "d4",
          text: "Julian moved. He came in from the edge without hurry, and the assembly made room for him the way rooms do for a man who has never asked them to. The Dohkar’s Weave-Script went a hard, flat colour that said, whether he liked it or not, that he had noticed who they deferred to." },
        { idx: 18, kind: "dialogue", speaker: "Julian", image: "d4",
          text: "“I can hear where she is aligned,” Julian said, to all of them and to me. “Everything in her points one way. She believes she did not do this.” He did not say what had been done, or by whom." },
        { idx: 19, kind: "dialogue", speaker: "Julian", image: "d4",
          text: "He drew out The Answer — the double-ended shaft, a deep hooked blade curling from each end like a question asked twice — and set it in my right hand, and closed my fingers around it with his, the scarred wrist against my palm for one deliberate second. “Hold it. I am going to ask you questions, here, in front of them. If you are misaligned when you answer, everyone present will know.” It lay still in my hand. My mouth was uncovered now. “What have you to say?”" },
        { idx: 20, kind: "narration", speaker: null, image: "d4",
          text: "My other hand tightened around my great-grandmother’s tarot deck. I didn’t remember bringing it. I toyed with the idea of letting the cards decide." },
      ],
      endsAt: 'oas_interrupt',
      oasHandoff: {
        // THE OPENING ENTRANCE (Roman 2026-10-06). Julian's question closes the authored page,
        // so the conversation is already open: there is no OAS opener to generate, and the
        // player's submitted input is the FIRST turn. Scoped to this package.
        openerOnPage: true,
        oasEntrance: {
          examineLabel: 'Examine the cards',
          lockedLabels: ['Petition Fate', 'Tempt Fate']
        },
        cue: 'Julian, the Provast, closes Lirael’s fingers around The Answer and says he will question her in front of the assembly.',
        // The interrogation is a REQUIRED part of the opening (Roman 2026-09-11): it occurs after the CG endpoint and before
        // any player choice; the Dohkar's interruption ends it; only then does the run-or-remain choice arise.
        // Plate: an EXISTING pre-rendered image (no new image call). d3 = the charge — the assembly turns; the Dohkar names Lirael.
        interruptionImage: 'd3',
        // SECOND OCCURRENCE (Roman 2026-09-19): a tighter reaction cutaway of the Dohkar himself,
        // reusing his existing intro_dohkar asset at a 'close' camera treatment (see imageOccurrences
        // above) — no ninth generated asset. Mounted through the structured renderer alongside the
        // d3 plate text, never as markup in the interruption's authored prose.
        interruptionPortrait: 'dohkar_interruption',
        interruption: 'The presiding Dohkar cut the interrogation off — a Provast questioning a Sacrificiant about her desires, in front of her ward’s family — and the clearing went still around the two of them.',
        // FIXED EXCHANGE (Roman 2026-09-11; Dohkar's register: dismissive, per his ritual-contempt and peer-jealousy facets). Establishes that the rite and the ruling are the Dohkar's, that the formal inquiry is the venue, and that Julian takes the inquiry — his intended move. Why he wants it stays sealed.
        interruptionExchange: [
          { speaker: 'the presiding Dohkar', text: '“That is enough, Provast. This rite is mine to preside, and what the Sacrificiant did in it is mine to rule on — in a formal inquiry, before a Chayr and two Dohkars, where questions are put for the record. Not here, and not as your opportunity to flirt with the accused.”' },
          { speaker: 'Julian', text: '“Agreed. A formal inquiry — I will convene it, and preside. That was always where this was going.”' },
          { speaker: null, text: 'The assembly’s attention came back to me, and to The Answer still in my hands, which was not mine.' }
        ],
        openingFrame: 'The fixed Scene 1 has just ended: Seren’s wish twisted, the presiding Dohkar has publicly charged Lirael with shaping the wish and with interfering, and Julian — the Provast, the office her father once held, next in line for First Dohkar, and the path she aspires to — has stepped in, said he can hear that she is aligned with her own innocence, and put The Answer in her hands so that any misalignment in her answers will be plain to everyone present. The one-on-one opens THERE, still public. Julian’s first line is an accusation, not a comfort: that she manipulated Seren without knowing it, the way she manipulates everyone — through desirability. He describes her gestures and where her attention went during the rite, and asks whether she called to him hoping he would rescue her. He wears predatory confidence while framing himself as the one she has done this to. She is forced to acknowledge the attraction as true. Adults; sensual and charged, never explicit. The presiding Dohkar will interrupt the public interrogation as grossly inappropriate; Lirael’s first decision is whether to run in shame or remain and see where Julian was taking it.'
      },
      emitted: {
        // ≤300 chars: the production scene ledger clips each page's event at 300 (_sceneLedgerCommit → _slClip). This is the
        // committed record Scene 2 reads under STORY LEDGER p1; sceneSummary below is the fuller orientation for THE FIXED OPENING block.
        ledgerLine: "Seren’s wish for Lirael — “that she find the one she lost” — began to twist; all felt it go wrong, then it stopped and nothing came of it. The Dohkar charged Lirael with shaping and interfering. Julian, the Provast, put The Answer in her hand and said he would question her before the assembly.",
        sceneSummary: "At Seren’s First Sacrifice, supervised for the first time by her apprentice Sacrificiant Lirael, Seren abandoned her rehearsed wish and spent it on Lirael instead — “so that Lirael may find the one she lost” — blurred to spare her. The words bent because the wish was MISALIGNED: care performed for the assembly over the desire Seren actually held, and every First Favored present heard the loose note. The wish began to TWIST, and every First Favored in the clearing felt it going wrong — and then it stopped, short of whatever it was turning into, and nothing came of it at all. No one can say why it stopped. Because the wish never completed, it had NO effect: nothing was found, nothing was taken, and the assembly has no outcome to point at — only the shared memory of a wish going wrong in the air and then failing. Lirael tore her mouth-band and moved toward her ward. The presiding Dohkar named the bent word and charged Lirael publicly with shaping the wish for her own benefit and with interfering in the rite — his grounds being that everyone felt the wish twisting, and the supervising Sacrificiant, closest to it, would have felt it first, so the one who could have interfered is the one who did; her path — Dohkar, then Chayr, then Provast as her father was — is in jeopardy and Seren’s family is provoked. Julian, the Provast, stepped in from the edge, said he could hear Lirael is aligned with her own innocence, and put The Answer — the Institution’s, in his keeping — in her hands to question her before the assembly. He then questioned her intimately and as an accusation: that she manipulates without knowing it, through desirability, and had called to him for rescue; she was made to own the attraction. The presiding Dohkar interrupted the interrogation as grossly inappropriate, asserting that the rite and the ruling on the Sacrificiant’s conduct are his and that a formal inquiry — before a Chayr and two Dohkars — is the venue, not the Provast’s opportunity to flirt with the accused; Julian agreed and claimed the inquiry: he will convene it and preside, and said that was always where this was going. Only then came her choice. The Dohkar’s charge presumes an interferer; nobody has named one.",
        openState: {
          location: 'the Veilwood ceremony clearing — crimson spiralgrass, white weeping-willow veil-canopy',
          timeOfDay: 'dawn',
          presentCast: ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar', 'the assembled First Favored family and guests'],
          pcCondition: 'mouth-band torn away, ceremonial sash still on, publicly accused, holding The Answer (the Institution’s, in Julian’s keeping — hers only for the questioning), the interrogation just cut off by the Dohkar'
        },
        obligations: [
          'Seren’s wish was spoken aloud as “so that Lirael may find the one she lost” and its intent failed; the words are already honoured and cannot be re-spoken.',
          'The presiding Dohkar has charged Lirael with shaping the wish and with interfering; he has not yet ruled, and her Dohkar qualification — and the Chayr and Provast she aspires to after it — is in jeopardy.',
          'Julian, the Provast, publicly claimed Lirael is aligned with her own innocence and has ALREADY questioned her before the assembly — intimately, as an accusation through desirability — until the presiding Dohkar interrupted it as grossly inappropriate. It happened; it is not re-staged.',
          'The Answer is the Institution’s; Julian is its caretaker; Lirael holds it only for the questioning. It is not hers.',
          'The presiding Dohkar asserted that the rite and the ruling on the Sacrificiant’s conduct are his and named a formal inquiry as the venue; Julian agreed and publicly claimed authority to convene and preside over that inquiry. The inquiry has NOT yet been opened.',
          'The wish bent on Seren’s own misalignment, heard by every First Favored present. The Dohkar’s charge presumes an interferer; nobody has named one, and Lirael has not said aloud why the wish matters to her.'
        ],
        ledgerSeeds: [
          { subject: 'Lirael', about: 'Julian', perception: 'noticed him before anything went wrong and could not stop her attention going to him while her standing collapsed; reads his stillness as attention she has not earned and wants; he holds the office her father held' },
          { subject: 'the presiding Dohkar', about: 'Lirael', perception: 'judges her guilty of shaping her ward’s wish and of breaking her seal, and resents that the assembly turned to the Provast instead of to him' },
          { subject: 'Seren', about: 'Lirael', perception: 'believes she gave Lirael a gift in front of everyone and does not yet understand what it cost' },
          { subject: 'the assembled First Favored', about: 'Lirael', perception: 'saw her tear the band and step toward Seren the instant the words finished, and read it as interference' },
          { subject: 'Julian', about: 'Lirael', perception: 'questioned her before the assembly as the man she has done this to — through desirability — and was cut off by the Dohkar before he finished' },
          { subject: 'the presiding Dohkar', about: 'Julian', perception: 'ended the Provast’s interrogation as grossly inappropriate and reclaimed the rite as his to rule on — in front of the assembly that had deferred to Julian' },
          { subject: 'Julian', about: 'the presiding Dohkar', perception: 'conceded the interruption at once and took the formal inquiry for himself, as if that had been the point all along' }
        ],
        calcification: {
          phrases: ['the ground was the record', 'not a wrong note but a loose one', 'Fate does not perform', 'the way rooms do for a man who has never asked them to', 'a question asked twice'],
          moves: ['a rite whose supervisor is the one it turns on', 'the twist lands as attention, not spectacle', 'the still observer becomes the intervener', 'closes on an object placed in her hands and a speech she cannot make']
        },
        axes: { microDecision: 'run in shame vs remain and see where Julian was taking it', pull: 'endure', polarity: 'defiant',
          // WHICH CHOICES CHANGE THE SITUATION (Roman 2026-10-02). Declared, not inferred: a
          // recorded choice named here displaces a scheduled event frame that cannot absorb it,
          // so 'run' produces an attempted departure and its consequences instead of being
          // demoted to a mood. 'remain' is absent on purpose — it leaves the schedule intact.
          displacingChoices: ['run'] },
        expansions: {
          A: 'If she runs: the clearing lets her go, which is worse than being stopped; The Answer is still in her hand when she reaches the trees, and Julian has not followed.',
          B: 'If she remains: she stays where the whole assembly can see her, holding The Answer, and lets Julian finish the question the Dohkar tried to end.'
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
