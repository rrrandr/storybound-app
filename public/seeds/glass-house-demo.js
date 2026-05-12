/**
 * =============================================================================
 * GLASS HOUSE CG DEMO SEED — TASTE-MODE STARTER NOVEL
 * =============================================================================
 *
 * Pre-bake target. Activate this seed when ready to generate the canonical
 * 3rd Taste book: the CGN demo every new user gets on their library shelf.
 *
 * Story premise (locked):
 *   Chorus-connected PC is seduced into leaving the field for a Solo LI.
 *   The romance engine is the trade — bliss of universal communion vs
 *   the exclusive intensity of one specific person who is opaque to
 *   the Chorus because they've chosen to be.
 *
 * Demo scope (locked to per-book Taste F grant = 20F):
 *   Scene 1 (full)         — opens IN Chorus, first encounter, first disconnect,
 *                            FIRST CONVERSATION RENDERED VIA OAS (closing block).
 *   F budget breakdown     — 16F for Scene 1 prose beats + phase swaps;
 *                            4F for OAS taste (5–6 turns) as Scene 1 closing event.
 *   Cliffhanger position   — fires at next turn boundary after wallet zero,
 *                            typically OAS turn 5–6. Falls back to existing
 *                            cliff archetype system if user paces faster.
 *
 * Cost model: pre-render once (~$3-5 LLM + ~$2 image gen + ~$1.50 mouth set
 * per artist style). Per-Taste-user cost: ~$0 (CDN + optional ~$0.005 LLM
 * pass for PC name substitution).
 *
 * F-grant model: 20F granted on first-open of this book (handled by the
 * Taste book-grant system, not by the seed itself). Universal wallet —
 * unspent F rolls forward into other Taste books.
 *
 * Activation: load this module, merge into state, fire pre-render pipeline
 * with `prebakeMode: true` flag that suppresses normal LLM scene generation
 * in favor of seed-guided output. See activation notes at bottom.
 * =============================================================================
 */
(function () {
  'use strict';

  const GLASS_HOUSE_DEMO_SEED = {
    // ── Identification ──
    seedId: 'glass-house-demo-v1',
    title: 'Glass House: The Bliss You Trade',
    bookType: 'cgn_demo',         // marks as the third Taste book
    libraryShelf: 'taste_starter', // alongside First Taste (billionaire literary) + First Sacrifice (fantasy literary)
    placement: 3,                   // shelf order: 1=billionaire literary, 2=fantasy literary, 3=this
    fortuneGrant: 20,               // F granted on first-open of this book
    commitOnOpen: true,             // FORCE-CONSUME — opening this book locks the user to the demo until cliff fires.
                                    // Prevents users from bailing with 4F unspent and skipping the OAS exposure entirely.
                                    // Enforced by state._committedTasteBookId; released by releaseTasteBookCommitment()
                                    // when the cliff fires (zero-F or taste cap).
    registerProfile: 'mode_1',      // LI is characterized for Mode-1 register from line 1 of OAS —
                                    // see hardConstraints below and oasBlock.openingLineSeed for the directive.

    // ── World / flavor / tone locks ──
    picks: {
      world: 'Dystopia',
      worldSubtype: 'glass_house',
      tone: 'Earnest',              // not Wry — we want sincere romance, not ironic distance
      pressure: null,               // no propaganda mode; this is personal stakes
      length: 'taste'               // taste-length story (gated by F budget naturally)
    },
    relationshipDynamic: 'fling',   // fast escalation appropriate to demo arc; can be re-keyed at upgrade
    storyturn: 'ST1',               // Scene 1 starts here

    // ── POV ──
    // Default 3rd limited (PC interiority) — NOT 5th Person Fate or 4th
    // Environmental. The Chorus conceit is best felt FROM INSIDE the PC's
    // experience of bliss being traded for one specific person.
    povMode: 'standard',
    pcGender: 'female',             // female-PC, male-LI = primary dynamic; substitute at activation if needed
    loveInterest: 'Male',

    // ── Character kernels (LLM elaborates from these) ──
    pc: {
      namePlaceholder: '{{PC_NAME}}',   // substitute via the cheap LLM personalization pass
      pronouns: 'she/her',
      role: 'mid-career professional in a Chorus-saturated industry (marketing, design, soft consulting). Connected to the Chorus daily as a default. Lives a fully-blissed-out modern life.',
      voiceKernel: 'thoughtful, observant, intermittently aware that her contentment is partly the field. Not unhappy in Chorus — genuinely held by it. The first encounter cracks something she didn\'t know was a question.',
      startingState: 'fully Chorus-connected — tears flowing, fresh clear under-eye patches, pinprick pupils, the easy grace of universal understanding'
    },
    li: {
      namePlaceholder: '{{LI_NAME}}',
      pronouns: 'he/him',
      archetype: 'solo_predatory_artisan',  // MODE 1-CODED: predator energy inside a craftsman frame
      role: 'works Solo by necessity AND by appetite. Some Chorus-incompatible profession (analog craftsman, restoration work, dangerous research) as cover — but the real reason he stays Solo is that the Chorus would smooth what he likes about himself out of him. He has lived alone with his own appetites long enough that he\'s comfortable with what they are.',
      voiceKernel: 'MODE 1 REGISTER FROM LINE 1. Dry, charged, faintly invasive. His first observation of PC is unsettling because it\'s exactly correct — he reads her decision to drop field before she\'s named it to herself. Speaks in short sharp lines that make her stomach drop, not because they\'re crude, but because they SEE her in a way the bliss-soaked Chorus never has. The Chorus offers being understood. He offers being known. The first is comforting; the second is dangerous. He does not perform danger — it\'s just there, in how unhurried he is, how directly he looks, how the next thing he says is always slightly more than she expected. He does NOT use crude anatomical language (this isn\'t a billionaire trope) — his Mode 1 is observational predation: naming what she wants before she does, identifying her tells, putting words to the want that the Chorus would have absorbed and erased. THAT is what makes the first OAS turn land hard.',
      visualSignature: 'no tears, no patches, no dilated pupils. Sharp gaze that does not look away first. Modern clothing, slightly more weighted/structured than the soft-fabric Chorus-default fashion. Hands that look like they make things. The body language of someone who is unhurried because he doesn\'t need to convince anyone.'
    },

    // ── HARD CONSTRAINTS for the generator ──
    // Injected as a high-priority directive block on every scene render.
    // Lock the world to its actual canon, prevent drift into surveillance/dystopia tropes.
    hardConstraints: [
      'OPEN INSIDE THE CHORUS. Scene 1 beats 1-3 MUST show PC fully connected: tears flowing, under-eye patches present, pinprick pupils, soft-eyed grace of universal communion. The bliss is REAL and GOOD — never frame Chorus as oppression, surveillance, or threat. Establish the value of what is about to be traded.',
      'THE CHORUS IS OPT-IN AND BELOVED. Background figures throughout demo are mostly Chorus-connected: blissful tears, patches, ambient ease. They are not victims, not coerced, not propagandized — they are happy. Solo PC and Solo LI are the outliers; their choice is the costly one.',
      'NO SURVEILLANCE FRAMING. No cameras, no enforcers, no authoritarian state, no implants, no chips. The Chorus is a distributed empathic field ("WiHi") — no hardware, no surgery, opt-in. Conflict comes from social marking of Solo state, not from regime oppression.',
      'NO SCI-FI VISUAL EFFECTS. Glass House looks like the present-day modern world plus tear-streaked, patch-wearing happy people. Cafés, transit, offices, parks, apartments. No glowing tech, no overlays, no implants visible. The visual conceit is human bodies, not gadgets.',
      'PC TRANSFORMATION ARC IS THE VISUAL HOOK. Across Scene 1: full Chorus signature → first disconnect (drying tears, dimming patches, sharpening pupils) → sustained Solo through OAS closing block. Phase hero images should feature tight framing on PC\'s face at these transitions.',
      'SOCIAL MARKING, NOT FORBIDDEN. The illicit thrill comes from Solo state being SOCIALLY NOTICED, not legally forbidden. Coworkers softly worried, friends concerned, strangers lightly puzzled — never angry, never aggressive. "Like not wearing a mask during COVID" — marked, slightly suspicious, polite-pressure inducing.',
      'CENTRAL ROMANCE ENGINE: exclusive intensity vs universal communion. The lovers\' attraction works BECAUSE neither is broadcasting. The Chorus has nothing to say about LI because LI isn\'t in the field. That opacity is the entire pull. The romance is the SECRET kept from a benevolent universe.',
      'OAS AS SCENE 1 CLOSING EVENT. The first sustained conversation between PC and LI is rendered through OAS — mouth-closeup intimate dialogue mode. Fires after PC drops field (Scene 1 Beat ~9), runs 5–6 OAS turns under wallet budget, ends in cliffhanger at next turn boundary after wallet zero. This is the demo\'s peak hook: showing OAS at maximum-charge moment (PC has just chosen Solo for this specific person, conversation is exclusively theirs, Chorus around them oblivious).',
      'MODE 1 LOCKED FROM OAS TURN 1. The LI is characterized for Mode 1 register — his first spoken line must already carry the charged-observational-predatory register that defines Mode 1, NOT a polite "hello" turn that ramps up over several beats. Route OAS through Grok from turn 1 by pre-setting state._mode1.routeToGrok = true at OAS open. On web register: full uninhibited Mode 1 (charged but observational — see LI voiceKernel; not crude anatomical language). On iOS register: keep the same predatory observational STRUCTURE but sanitize vocabulary per the existing OAS iOS register rules. The DEMO MUST DEMONSTRATE THE STORYBOUND HEAT ON LINE 1 OR THE CG TASTE FAILS ITS JOB.'
    ],

    // ── Scene blueprint (Scene 1 only — no Scene 2 in demo) ──
    // The 20F per-book grant covers: ~16F prose beats + ~4F OAS taste.
    // OAS fires as the Scene 1 closing block, NOT as a separate scene.
    scenes: [
      {
        sceneIdx: 1,
        sceneNumber: 1,
        importance: 'apex',           // forces Opus via resolveRenderTier (Scene 1 + apex)
        targetBeatCount: 16,           // ~16 beats of prose covers the F budget before OAS opens
        synopsis: 'PC moves through her Chorus-saturated daily life — work, transit, café — fully connected and at ease. She catches sight of a Solo man (LI) across a public space. The recognition is immediate and exclusive: he is opaque to the field. PC steps out of the Chorus briefly to approach him. A coworker nearby notices the change. The scene\'s prose beats build to PC and LI sitting together for the first time, both Solo. The OAS closing block then takes over for the actual conversation — 5–6 charged turns — until wallet zero triggers the cliffhanger.',
        register: 'Earnest, observant, soft-eyed in Chorus passages and sharper-eyed in Solo passages. Pace should slow at the moment of first disconnect — interiority intensifies as the field drops. Final beats before OAS are charged stillness, anticipation of speech.',
        mandatoryBeats: [
          {
            beatIdx: 0,
            label: 'Chorus baseline (establishing)',
            content: 'PC in her morning. Tears flowing, fresh patches on, pinprick pupils. Surroundings: Chorus-connected coworkers/strangers, ambient ease, soft forgiveness in the air. The bliss is felt and named — what universal communion gives. PC is not unhappy.'
          },
          {
            beatIdx: 1,
            label: 'Routine in bliss',
            content: 'PC at work or in transit, interacting with another Chorus-connected person. Effortless mutual understanding. A small frustration that the field instantly smooths. Establishes that Chorus genuinely solves problems Solo can\'t.'
          },
          {
            beatIdx: 2,
            label: 'Texture of communion',
            content: 'A brief beat showing the BREADTH of Chorus — someone\'s grief acknowledged without words, a stranger\'s contentment lifting PC\'s mood, the field gently regulating the room. Reader fully understands what is about to be traded.'
          },
          {
            beatIdx: 3,
            label: 'The Solo arrival',
            content: 'PC enters a public space (café, train platform, atrium, gallery) and sees LI. He is the only person whose face does not stream tears. No patches. Sharp eyes. The field has nothing to tell PC about him because he is not in it. The exclusivity is immediate — PC notices noticing him.'
          },
          {
            beatIdx: 4,
            label: 'First curiosity (still in Chorus)',
            content: 'PC keeps her aperture open but feels the unique pull of someone the Chorus can\'t describe. She watches him longer than is comfortable. The Chorus around her is unbothered — he\'s just another person to them.'
          },
          {
            beatIdx: 5,
            label: 'The internal pause',
            content: 'PC realizes she is the only one in the room interested in him — and the only one who could be, because the field has no opinion. A small private thought lands: she could meet him alone. The thought is novel — she rarely thinks anything alone anymore.'
          },
          {
            beatIdx: 6,
            label: 'The first disconnect (PIVOTAL BEAT — PHASE TRANSITION)',
            content: 'PC steps out of the field to approach. Patches stay on as social cover. The shift is physiological: tears slow, pupils sharpen, an uncanny private clarity floods in. The first hit of Solo state with THIS SPECIFIC PERSON in mind feels secret before words are exchanged. The world goes quieter, more textured, more her own.',
            phaseTransition: true,
            visualNote: 'PHASE 2 HERO: tight framing on PC\'s face mid-transition. Tears drying on cheeks but not yet absorbed by patches. Pupils contracting visibly. Background figures soft-blurred (still in Chorus).'
          },
          {
            beatIdx: 7,
            label: 'The approach',
            content: 'PC walks to him. The room\'s sound texture has changed for her — fewer overlapping emotions, sharper edges to the ambient. She catalogs him as she crosses: dry eyes, no patches, the small structured tension of a person holding themselves apart.'
          },
          {
            beatIdx: 8,
            label: 'The social marking',
            content: 'A coworker, friend, or barista nearby notices PC has dropped field. Their bliss flickers — not anger, just gentle puzzlement, the soft "are you okay?" energy of someone whose loved one removed a mask in a crowd. PC clocks being clocked. Nothing is said, but the weight is felt. She keeps walking.'
          },
          {
            beatIdx: 9,
            label: 'Eye contact — pre-speech',
            content: 'PC and LI meet eyes at conversational distance. He sees her Solo state and does not remark on it. The room\'s noise drops further. She has not yet spoken; he has not yet spoken. The next beat is the first word.',
            visualNote: 'PHASE 3 HERO: medium-tight on both, café/atrium setting. PC mid-Solo (drying tears), LI fully Solo (no signature). Background Chorus-connected figures slightly soft-focused.'
          },
          {
            beatIdx: 10,
            label: 'OAS DOORWAY — open here',
            content: 'The scene mode transitions from prose to OAS for the actual conversation. PC and LI exchange their first words in mouth-closeup intimate dialogue. The reader has been told everything they need to feel the heat of this exchange.',
            transitionToOAS: true
          }
        ],
        // OAS configuration: the closing block of Scene 1. The OAS module
        // owns its own beat count and turn structure — these settings just
        // bound it for the demo budget.
        oasBlock: {
          enabled: true,
          opensAfterBeat: 10,
          targetTurns: 6,                  // 5–6 OAS turns at ~0.7F per turn ≈ 4F budget
          cliffhangerOnTurnZeroF: true,
          forceMode1: true,                // route OAS through Grok from turn 1 — set state._mode1.routeToGrok = true at OAS open
          openingLineSeed: 'LI speaks first. MODE 1 OBSERVATIONAL-PREDATORY REGISTER from the very first sentence — no warm-up, no polite "hi". His line names what she just did before she has admitted it to herself: she dropped field for him. The line should be short, charged, dry — three options of register direction (pick one that fits the LI\'s voice): (a) NAMING — "You stepped out of the field." Said flat, like a fact he just observed. (b) READING HER TELL — "You\'ve been watching me for six minutes." Mild, almost amused. (c) CALLING THE COST — "Your friends are going to feel that you went Solo. You did it anyway." None of these are explicit. All of them are MORE INTIMATE than explicit would be — he is seeing her in a way the Chorus could not, and saying it out loud. THAT is the Mode 1 hook for Glass House. Avoid: generic seduction language, anatomical references, "hey beautiful" energy, anything that reads as billionaire-romance trope. HIS heat is OBSERVATIONAL ACCURACY.',
          registerCues: [
            'MODE 1 LOCKED. Every turn the LI takes should land slightly more invasively than the last — not crude, but progressively more correct about what PC is feeling. He reads her tells, names what the Chorus would have absorbed, puts the unspoken want into words she can\'t take back.',
            'Both Solo. The Chorus is irrelevant to this conversation by definition. PC is acutely aware she chose this.',
            'Background of the OAS frame (visible at edges of mouth crop) should subtly include Chorus-connected figures in soft focus — the world the lovers have stepped out of. Their tears are visible. The lovers\' dry-eyed faces are the only ones in focus.',
            'PC\'s mouth state in OAS frames: post-disconnect — no tears streaming, lips dry, pupils sharp. Different from the Chorus-baked OAS mouth defaults.',
            'Heat escalates fast — by turn 3 the LI has named something PC has not admitted to anyone. By turn 5 PC is short of breath. There is no physical contact yet; the heat is entirely linguistic.',
            'Final OAS turn before cliffhanger: a line that demands an answer PC can\'t give in this scene — could be a direct invitation ("come back tomorrow without the patches"), or a naming PC can\'t deflect ("you didn\'t come over to talk, did you"), or a question that breaks her cover ("how long have you wanted to leave the Chorus"). Cliff lands on PC\'s face mid-decision.',
            'iOS REGISTER FALLBACK: if user is on iOS profile, keep the observational-predatory STRUCTURE but sanitize specific language per existing OAS iOS rules. The HEAT MECHANIC stays — LI sees what she\'s hiding and names it. The VOCABULARY softens. Do not let iOS register flatten the demo into polite small-talk.'
          ],
          mouthStateUsage: [
            'closed_smile or smirk — opening turn (LI delivering the naming line — calm, unhurried)',
            'knowing_smirk — turn 2 when LI reads her tell and lands it',
            'lip_bite_held — PC silent, weighing how much he just saw',
            'parted (ohno or what) — PC trying to catch up to how exposed she is',
            'lip_bite — PC restrained, deciding whether to lean in or leave',
            'blowing_smirk — peak-wicked LI register if web-mode Mode 1 fires strongly (final turn before cliff)',
            'smile_snarl — alternate peak-wicked frame if blowing_smirk has fired already this exchange'
          ]
        },
        phases: [
          {
            phaseIdx: 0,
            label: 'Chorus baseline',
            startBeat: 0,
            visualState: {
              pc_visual: 'Chorus signature: tears, patches, pinprick pupils, soft posture',
              background: 'mid-density Chorus-connected crowd, tears-streaked-smiling, normalized',
              setting: 'urban modern, daytime, café or atrium or transit'
            }
          },
          {
            phaseIdx: 1,
            label: 'The Solo encounter (across-space)',
            startBeat: 3,
            visualState: {
              pc_visual: 'still Chorus-connected — tears, patches, dilated pupils',
              li_visual: 'fully Solo — no tears, no patches, sharp pupils, slightly weighted clothing register',
              composition: 'across-space sightline, LI is the only dry-eyed figure in frame'
            }
          },
          {
            phaseIdx: 2,
            label: 'First disconnect (transformation)',
            startBeat: 6,
            visualState: {
              pc_visual: 'mid-transition — tears slowing/drying, patches dimming, pupils sharpening. PHASE HERO IMAGE.',
              li_visual: 'Solo, present, gaze meeting',
              composition: 'tight framing on PC\'s face; background slightly softened to suggest field-disengagement'
            }
          },
          {
            phaseIdx: 3,
            label: 'The approach + pre-speech',
            startBeat: 7,
            visualState: {
              pc_visual: 'fully Solo now (visibly), patches still in place as cover, walking with intent',
              li_visual: 'Solo, gaze held, slightly amused',
              composition: 'medium-tight on both, anticipation of speech'
            }
          }
        ]
      }
    ],

    // ── Pre-render targets ──
    prerender: {
      phaseImages: {
        'scene1.phase0': true,  // Chorus baseline establishing shot
        'scene1.phase1': true,  // Across-space Solo encounter
        'scene1.phase2': true,  // First disconnect tight face (HERO)
        'scene1.phase3': true   // Approach + pre-speech (lead-in to OAS)
      },
      beatCloseups: {
        'scene1.beat6': 'PC tight face mid-disconnect — tears drying, pupils sharpening',
        'scene1.beat8': 'PC peripheral awareness of being clocked by coworker',
        'scene1.beat9': 'PC and LI eye contact pre-speech — medium-tight, both Solo'
      },
      // Mouth set for LI — used by the OAS closing block. Render across all
      // 4 artist styles since the OAS module reads from the active artist.
      mouthSet: {
        liDescription: 'sharp-eyed man, no Chorus signature (no tears, no patches), structured contemporary clothing, present and dry-eyed',
        artistStyles: ['ender_bond', 'lora_venn', 'ryo_toro', 'olen_droll'],
        // Use existing tiered prebatch: IMMEDIATE + FLIRT (Scene 1 OAS doesn't
        // need FULL tier — peak/vulnerable mouths not needed in opening exchange).
        tiers: ['immediate', 'flirt']
      },
      cinesequenceCues: {
        'scene1.disconnect': 'a 1-beat cinesequence over the disconnect — PC\'s face transformation, audio bed quieting, single line of voiceover prose. ~3-5 second clip.'
      }
    },

    // ── Cost-control flags for the activation pipeline ──
    activationFlags: {
      prebakeMode: true,
      modelOverrides: {
        scene1: 'claude-opus-4-1'      // bake Scene 1 in Opus (Tier A major + Scene 1)
        // No scene2 entry — demo is Scene 1 only
      },
      personalizationPass: {
        enabled: true,
        model: 'gpt-4o-mini',
        scope: 'name_pronoun_only',
        substitutions: ['{{PC_NAME}}', '{{LI_NAME}}']
      },
      mouthPrebatchOverride: {
        enabled: true,
        useGenericFeatureKey: false,
        liFeatureKey: 'male_solo_artisan_glass_house_demo'
      },
      // F-grant gating. The book grants 20F on first-open via the
      // Taste book-grant system (grantTasteBookFortune in app.js).
      // commitOnOpen: true forces the user to consume the full 20F
      // within this book — exiting before the cliff forfeits remaining F
      // (UI handler responsibility; check state._committedTasteBookId).
      // Cliff fires when wallet zeroes — typically at OAS turn 5–6.
      // Falls back to the existing cliff archetype system if user paces
      // faster (e.g., burns F on Petition Fate mid-prose-beats).
      fortuneGate: {
        grantAmount: 20,
        commitOnOpen: true,
        cliffhangerOnZero: true,
        targetCliffMoment: 'oas_turn_5_to_6',  // narrative-ideal landing; real cliff lands wherever F hits zero
        cliffArchetypeFallback: true            // existing _selectCliffArchetype handles non-ideal landings
      },
      // Mode 1 forcing for the OAS closing block. The OAS module reads
      // forceMode1 from oasBlock and sets state._mode1.routeToGrok = true
      // before the first turn fires. Ensures Grok delivers the predatory
      // observational register from line 1, even if the user is iOS
      // (in which case OAS iOS register sanitizes vocabulary but
      // preserves the heat-mechanic).
      oasMode1Force: {
        enabled: true,
        appliesToBeat: 11,                    // OAS opens after Scene 1 beat 10
        clearOnCliff: true                     // release the routeToGrok flag when cliffhanger fires
      }
    },

    activationNotes: [
      'STEP 1: Load this seed via fetch + JSON.parse OR direct module load. Merge into a clean state shadow — do NOT mutate the live user state.',
      'STEP 2: Invoke the staged-render pipeline for scene 1 with prebakeMode: true. The pipeline reads mandatoryBeats and phases as authoritative; the LLM elaborates within bounds rather than inventing the plot.',
      'STEP 3: Run mouth pre-batch for LI across all 4 artist styles using the dedicated featureKey. Persist URLs into a deployment-baked manifest (NOT user-side sb_mouth_db). Only IMMEDIATE + FLIRT tiers needed — Scene 1 OAS doesn\'t use peak/vulnerable mouths.',
      'STEP 4: Render phase hero images for all entries in prerender.phaseImages. Save to /public/seeds/glass-house-demo/scene1.phase{M}.png (or CDN equivalent).',
      'STEP 5: Render beat closeups for the listed beats. Save to /public/seeds/glass-house-demo/scene1.beat{M}.png.',
      'STEP 6: Generate Scene 1 prose in Opus using the mandatoryBeats as the scene-structure anchor + hardConstraints as a directive injection. Save final prose to /public/seeds/glass-house-demo/scene1.prose.txt.',
      'STEP 7: For the OAS closing block, prepare opening line + register cues for the OAS module. The OAS turns are NOT pre-rendered prose — they\'re live LLM calls under the bound wallet budget. Pre-render only the mouth crops and the phase backdrop.',
      'STEP 8: Wire the Taste library to surface this book as the third starter (placement: 3). Activation handler: when user opens the book, call grantTasteBookFortune("glass_house_demo") — this grants +20F AND locks state._committedTasteBookId since commitOnOpen is true. Show a "Begin demo — 20F" CTA on the cover rather than "+20F to wallet" framing, so the commitment is clear up front.',
      'STEP 9: UI MUST respect state._committedTasteBookId === "glass_house_demo" while the demo is in progress: gate Exit Library / Back-to-Shelf buttons, OR show a confirmation modal "Abandon demo? You\'ll lose the remaining F." Most users won\'t bail mid-demo; the lock is a safety net.',
      'STEP 10: At OAS open (after Scene 1 beat 10), the OAS module reads activationFlags.oasMode1Force.enabled === true and sets state._mode1.routeToGrok = true before the first OAS turn fires. This forces the LI\'s first line through Grok in Mode 1 register, ensuring observational-predatory voice from line 1.',
      'STEP 11: When user reaches cliff (wallet zero), the cliff handler (_openFatePausesModal) automatically calls releaseTasteBookCommitment, freeing the user to navigate. Two upgrade paths: (a) "Continue this story" — small F bundle, completes this book past the cliff; (b) "Make your own story" — larger F bundle, unlocks corridor.'
    ]
  };

  // Export for browser AND node (in case activation runs server-side)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GLASS_HOUSE_DEMO_SEED;
  } else if (typeof window !== 'undefined') {
    window.GLASS_HOUSE_DEMO_SEED = GLASS_HOUSE_DEMO_SEED;
  }
})();
