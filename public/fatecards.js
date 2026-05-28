/**
 * =============================================================================
 * STORYBOUND FATE CARD SYSTEM
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * =============================================================================
 * FATE CARD DUAL-MODEL SPLIT (LOCKED)
 * =============================================================================
 *
 * Fate Cards use a dual-model architecture with strict separation:
 *
 * GPT-5.1 — Structural Authority (REQUIRED)
 * -----------------------------------------
 * GPT-5.1 is the ONLY authority allowed to:
 * - Define Fate Card identity
 * - Define card scope and effect
 * - Define action seed
 * - Define dialogue seed
 * - Enforce consent, safety, and intensity ceilings
 *
 * This output is CANONICAL and FROZEN.
 *
 * GPT-5.2 — Linguistic Elevation (OPTIONAL)
 * -----------------------------------------
 * GPT-5.2 may be used ONLY AFTER GPT-5.1 output is locked.
 *
 * GPT-5.2 may:
 * - Elevate phrasing
 * - Increase emotional gravity
 * - Enhance inevitability and tension
 *
 * GPT-5.2 may NOT:
 * - Explain
 * - Command
 * - Imply control
 * - Speak as Fate, Author, or system
 * - Add outcomes or awareness
 *
 * If GPT-5.2 violates Fate Card laws, its output is DISCARDED
 * and GPT-5.1 text is used.
 *
 * There is NO live improvisation.
 *
 * =============================================================================
 * INTEGRATION WITH ORCHESTRATION
 * =============================================================================
 *
 * Fate Cards are processed through the orchestration client when available:
 * - window.StoryboundOrchestration.processFateCard(card, storyContext)
 *
 * This ensures:
 * - GPT-5.1 structural pass runs first
 * - GPT-5.2 elevation is optional and validated
 * - Elevation violations result in fallback to GPT-5.1 output
 *
 * =============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// STORYBEAU AUTHORITY — AUTHORITATIVE TARGETING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
//
// CORE INVARIANT (AUTHORITATIVE · MUST HOLD)
// Any Fate Card that implies attraction, invitation, temptation, intimacy,
// or emotional pressure MUST target the Storybeau unless an explicit
// override is provided.
//
// No exceptions by implication.
// No guessing.
// No "most relevant character" substitution.
//
// MANTRA: Characters may surprise the Story. Roles may not.
// ═══════════════════════════════════════════════════════════════════════════

// Romantic implication cards — these MUST target the Storybeau
const ROMANTIC_IMPLICATION_CARDS = [
    'confession',
    'temptation',
    'boundary',
    'reversal'  // Power dynamics imply romantic context when Storybeau present
];

// Cards that may consult scene salience for non-romantic contexts
const SCENE_SALIENCE_ALLOWED_CARDS = [
    'silence'  // Silence can apply to any character tension
];

/**
 * STORYBEAU AUTHORITY: Resolve the target for a Fate Card
 *
 * Hard rules:
 * - Romantic cards MUST NOT consult scene salience
 * - Scene salience is allowed ONLY for non-romantic cards
 * - Override MUST be explicit with declared intent
 * - Silent substitution is PROHIBITED
 *
 * @param {string} cardId - The card type identifier
 * @param {object} sceneContext - Scene analysis result from extractSceneContext
 * @param {object} options - Override options { overrideTarget, overrideReason }
 * @returns {object} { target, isStorybeau, overrideApplied }
 */
function resolveFateCardTarget(cardId, sceneContext, options = {}) {
    const state = window.state || {};

    // ═══════════════════════════════════════════════════════════════════
    // STORYBEAU BINDING: Establish authoritative reference
    // ═══════════════════════════════════════════════════════════════════
    const storybeau = state.storybeau || {
        name: state.loveInterestName || sceneContext.liName || null,
        role: 'primary romantic interest',
        exclusive: true
    };

    // ═══════════════════════════════════════════════════════════════════
    // EXPLICIT OVERRIDE: Only with declared intent
    // ═══════════════════════════════════════════════════════════════════
    if (options.overrideTarget) {
        if (!options.overrideReason) {
            // VIOLATION: Override without reason is prohibited
            console.error('[FATE:AUTHORITY] Override attempted without reason — BLOCKED', {
                cardId,
                attemptedTarget: options.overrideTarget,
                storybeau: storybeau.name
            });
            // Fall through to normal resolution — do not honor override
        } else {
            // Valid override with reason
            console.log('[FATE:AUTHORITY] Explicit override applied', {
                cardId,
                target: options.overrideTarget,
                reason: options.overrideReason,
                storybeau: storybeau.name
            });
            return {
                target: options.overrideTarget,
                isStorybeau: options.overrideTarget === storybeau.name,
                overrideApplied: true,
                overrideReason: options.overrideReason
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ROMANTIC IMPLICATION CARDS: Must target Storybeau
    // ═══════════════════════════════════════════════════════════════════
    if (ROMANTIC_IMPLICATION_CARDS.includes(cardId)) {
        if (!storybeau.name) {
            // VIOLATION: Romantic card without Storybeau defined
            console.warn('[FATE:AUTHORITY] Romantic card invoked without Storybeau — using fallback', {
                cardId,
                presentCharacters: sceneContext.presentCharacters
            });
            // Return null target — card text should use generic language
            return {
                target: null,
                isStorybeau: false,
                overrideApplied: false,
                warning: 'NO_STORYBEAU_DEFINED'
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // ALL-AROUND RETARGET: when the LI is KNOWN to be offstage, a
        // "romantic" card becomes a GENERAL interaction stance toward whoever
        // IS present — in a NON-ROMANTIC register (Triangle Guard intent: do
        // NOT imply romance with the present non-LI character). The cards are
        // suggestions for any situation, not LI-only. Fires only on a POSITIVE
        // absence signal; unknown presence still defaults to the Storybeau
        // (the click-time LLM preview refines from the actual prose).
        // ═══════════════════════════════════════════════════════════════
        const _present = Array.isArray(sceneContext.presentCharacters) ? sceneContext.presentCharacters : [];
        const _liKnownAbsent =
            (_present.length > 0 && !_present.some(c => c === storybeau.name)) ||
            (typeof state._scene1LIOnStage === 'boolean' && state._scene1LIOnStage === false && (state.turnCount || 0) === 0);
        if (_liKnownAbsent) {
            let _interlocutor = null;
            for (let _i = 0; _i < _present.length; _i++) {
                if (_present[_i] !== storybeau.name) { _interlocutor = _present[_i]; break; }
            }
            console.log('[FATE:AUTHORITY] LI offstage — romantic card retargeted to present interlocutor (non-romantic)', {
                cardId, interlocutor: _interlocutor, presentCharacters: _present
            });
            return {
                target: _interlocutor,   // may be null → self-directed
                isStorybeau: false,
                romantic: false,
                liAbsent: true,
                overrideApplied: false
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // TRIANGLE GUARD: Block accidental triangle formation
        // ═══════════════════════════════════════════════════════════════
        if (sceneContext.presentCharacters && sceneContext.presentCharacters.length > 1) {
            // Multiple characters present — verify target remains Storybeau
            const otherCharacters = sceneContext.presentCharacters.filter(c => c !== storybeau.name);
            if (otherCharacters.length > 0) {
                console.log('[FATE:AUTHORITY] Triangle guard active — Storybeau enforced', {
                    cardId,
                    storybeau: storybeau.name,
                    otherCharactersPresent: otherCharacters,
                    verdict: 'TARGET_LOCKED_TO_STORYBEAU'
                });
            }
        }

        return {
            target: storybeau.name,
            isStorybeau: true,
            overrideApplied: false
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // NON-ROMANTIC CARDS: May consult scene salience
    // ═══════════════════════════════════════════════════════════════════
    if (SCENE_SALIENCE_ALLOWED_CARDS.includes(cardId)) {
        // Prefer Storybeau if present, but allow scene-relevant character
        const mostRelevant = sceneContext.presentCharacters?.[0] || storybeau.name;
        return {
            target: mostRelevant,
            isStorybeau: mostRelevant === storybeau.name,
            overrideApplied: false
        };
    }

    // Default: Use Storybeau
    return {
        target: storybeau.name,
        isStorybeau: true,
        overrideApplied: false
    };
}

/**
 * SECONDARY CHARACTERS: Rivals, observers, antagonists
 * These may apply pressure but may NOT become romantic targets by default.
 *
 * Initialize or retrieve secondary character registry.
 */
function getSecondaryCharacters() {
    const state = window.state || {};
    if (!state.secondaryCharacters) {
        state.secondaryCharacters = {
            rivals: [],
            observers: [],
            antagonists: []
        };
    }
    return state.secondaryCharacters;
}

/**
 * REGRESSION TEST: Verify Storybeau targeting invariant
 *
 * Test case:
 * - Storybeau = Marcus
 * - Scene includes Marcus and Jax
 * - Fate Card = Temptation
 * - Expected: Card targets Marcus, not Jax
 */
function runStorybeauTargetingTest() {
    console.log('[FATE:TEST] Running Storybeau targeting regression test...');

    const testState = {
        storybeau: { name: 'Marcus', role: 'primary romantic interest', exclusive: true },
        loveInterestName: 'Marcus'
    };

    const testSceneContext = {
        presentCharacters: ['Marcus', 'Jax'],
        liName: 'Marcus',
        liIntroduced: true,
        lastEmotionalBeat: 'tension',
        confidence: 0.8
    };

    // Test 1: Temptation card should target Marcus
    const result1 = resolveFateCardTarget('temptation', testSceneContext, {});
    const test1Pass = result1.target === 'Marcus' && result1.isStorybeau === true;
    console.log('[FATE:TEST] Test 1 (Temptation → Marcus):', test1Pass ? 'PASS' : 'FAIL', result1);

    // Test 2: Override without reason should be blocked
    const result2 = resolveFateCardTarget('temptation', testSceneContext, { overrideTarget: 'Jax' });
    const test2Pass = result2.target === 'Marcus'; // Should fall back to Marcus
    console.log('[FATE:TEST] Test 2 (Override without reason blocked):', test2Pass ? 'PASS' : 'FAIL', result2);

    // Test 3: Override WITH reason should be allowed
    const result3 = resolveFateCardTarget('temptation', testSceneContext, {
        overrideTarget: 'Jax',
        overrideReason: 'jealousy trigger / external pressure'
    });
    const test3Pass = result3.target === 'Jax' && result3.overrideApplied === true;
    console.log('[FATE:TEST] Test 3 (Override with reason allowed):', test3Pass ? 'PASS' : 'FAIL', result3);

    // Test 4: Silence card may use scene salience
    const result4 = resolveFateCardTarget('silence', testSceneContext, {});
    const test4Pass = result4.target !== undefined; // Can be Marcus or Jax
    console.log('[FATE:TEST] Test 4 (Silence allows salience):', test4Pass ? 'PASS' : 'FAIL', result4);

    const allPass = test1Pass && test2Pass && test3Pass && test4Pass;
    console.log('[FATE:TEST] Regression test:', allPass ? 'ALL PASS' : 'FAILURES DETECTED');

    return allPass;
}

// Expose for testing
window.runStorybeauTargetingTest = runStorybeauTargetingTest;
window.resolveFateCardTarget = resolveFateCardTarget;
window.getSecondaryCharacters = getSecondaryCharacters;
window.ROMANTIC_IMPLICATION_CARDS = ROMANTIC_IMPLICATION_CARDS;

// ======================================================
// CONTINUOUS SPARKLE EMITTER — Delegates to unified sparkle system (app.js)
// ======================================================

let _sparkleEmitterActive = false;
let _continuousSparkleInterval = null;
let _sparkleCycleTimer = null;
let _sparkleActiveCardId = null;
let _fateSparkleContainerIds = [];

function startSparkleCycle(cardId, cardEl, actInput, diaInput) {

    // Clear any existing cycle
    stopSparkleCycle();
    _sparkleActiveCardId = cardId;

    const isValidAnchor = (el) => {
        if (!el || typeof el.getBoundingClientRect !== 'function') return false;
        const r = el.getBoundingClientRect();
        return r && r.width > 0 && r.height > 0;
    };

    // Delegate to unified sparkle system
    const anchors = [cardEl, actInput, diaInput].filter(isValidAnchor);
    anchors.forEach((el, i) => {
        if (typeof window.createAnchoredSparkleContainer === 'function') {
            const containerId = window.createAnchoredSparkleContainer(el, `fate-${cardId}-${i}`);
            if (containerId) {
                _fateSparkleContainerIds.push(containerId);
                window.startSparkleEmitter(containerId, 'fateFirefly', 8);
            }
        }
    });
}

function stopSparkleCycle() {
    if (_sparkleCycleTimer) {
        clearTimeout(_sparkleCycleTimer);
        _sparkleCycleTimer = null;
    }
    _sparkleActiveCardId = null;

    // Clean up anchored containers
    _fateSparkleContainerIds.forEach(id => {
        if (typeof window.removeAnchoredSparkleContainer === 'function') {
            window.removeAnchoredSparkleContainer(id);
        }
    });
    _fateSparkleContainerIds = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL FX FUNCTION EXPOSURE — Required for rebind across navigation
// ═══════════════════════════════════════════════════════════════════════════
window.stopSparkleCycle = stopSparkleCycle;
window.startSparkleCycle = startSparkleCycle;
window.startContinuousSparkles = startContinuousSparkles;
window.stopContinuousSparkles = stopContinuousSparkles;

function startContinuousSparkles() {
    if (_sparkleEmitterActive) return;
    _sparkleEmitterActive = true;

    _continuousSparkleInterval = setInterval(() => {
        const mount = document.getElementById('cardMount');
        const actInput = document.getElementById('actionInput');
        const diaInput = document.getElementById('dialogueInput');
        if (!mount) return;

        const selected = mount.querySelector('.fate-card.selected');
        if (selected) {
            // Validate selected card has valid dimensions
            const selRect = selected.getBoundingClientRect();
            if (!selRect || selRect.width === 0 || selRect.height === 0) return;

            // Golden flow to both Say (dialogue) and Do (action) boxes
            if (typeof window.triggerGoldenFlow === 'function') {
                if (actInput) {
                    const actRect = actInput.getBoundingClientRect();
                    if (actRect && actRect.width > 0 && actRect.height > 0) {
                        window.triggerGoldenFlow(selected, actInput);
                    }
                }
                if (diaInput) {
                    const diaRect = diaInput.getBoundingClientRect();
                    if (diaRect && diaRect.width > 0 && diaRect.height > 0) {
                        window.triggerGoldenFlow(selected, diaInput);
                    }
                }
            }
        }
    }, 600);
}

function stopContinuousSparkles() {
    _sparkleEmitterActive = false;
    if (_continuousSparkleInterval) {
        clearInterval(_continuousSparkleInterval);
        _continuousSparkleInterval = null;
    }
}

(function(window){
    if (window.__FATECARDS_LOADED__) return;
    window.__FATECARDS_LOADED__ = true;

   
    // Card Definitions - Base templates
    const fateDeckBase = [
        { id: 'temptation', title: 'Temptation', desc: 'A sudden, overwhelming urge.', actionTemplate: 'You feel drawn to something you know you shouldn\'t want.', dialogueTemplate: '"I shouldn\'t want this..."' },
        { id: 'confession', title: 'Confession', desc: 'A secret spills out.', actionTemplate: 'The truth rises to your lips.', dialogueTemplate: '"There\'s something I need to tell you."' },
        { id: 'boundary', title: 'Boundary', desc: 'A line is drawn or crossed.', actionTemplate: 'You decide whether to stop or go further.', dialogueTemplate: '"Wait." / "Don\'t stop."' },
        { id: 'reversal', title: 'Reversal', desc: 'Control changes hands.', actionTemplate: 'You take control, or yield it willingly.', dialogueTemplate: '"Look at me."' },
        { id: 'silence', title: 'Silence', desc: 'Words fail. Actions speak.', actionTemplate: 'You let the moment breathe without words.', dialogueTemplate: '(Silence speaks louder)' }
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // PLOT CONTEXT EXTRACTOR — Slice 1 (added 2026-05-17)
    // ═══════════════════════════════════════════════════════════════════════
    // Reads the 8+ load-bearing state slots the existing scene-context
    // extractor was ignoring: A-plot pressure, archetype, intimacy phase,
    // committed truth, active grievance contracts, recent callback ledger
    // entries, recent narrative scars, relationship gravity direction,
    // narrative gravity arcs, and microDecision axis lean.
    //
    // Slice 1 (this one) ONLY surfaces the data. Template generators may
    // start reading it, but most existing templates will continue to ignore
    // it until Slice 3 wires per-card use. Slice 2 will route the intimate
    // deck through Grok with this context as the prompt payload.
    //
    // Defensive throughout — every slot may be absent. Returns null/empty
    // for missing data; never throws.
    // ═══════════════════════════════════════════════════════════════════════
    function extractPlotContext(state) {
        const s = state || {};

        // A-plot pressure
        const aPlot = s.aPlot || {};
        const aPlotGoal = aPlot.goal || null;
        const aPlotStakes = aPlot.stakes || null;
        const aPlotClock = aPlot.clock || null;
        const aPlotTimelineLength = aPlot.timelineLength || 0;
        const turnCount = s.turnCount || 0;
        const arcPct = (aPlotTimelineLength > 0) ? (turnCount / aPlotTimelineLength) : null;

        // Archetype + structural state
        const archetypePrimary = (s.archetype && s.archetype.primary) || null;
        const archetypeModifier = (s.archetype && s.archetype.modifier) || null;
        const storyturn = s.storyturn || 'ST1';
        const intimacyPhase = !!s.intimacyPhase;

        // Committed truth (slice 1 promise architecture)
        let committedTruth = null;
        if (s.committedTruth && s.committedTruth.decidedTruth) {
            committedTruth = {
                about: s.committedTruth.about || null,
                family: s.committedTruth.family || null,
                subFamily: s.committedTruth.subFamily || null,
                summary: String(s.committedTruth.decidedTruth).slice(0, 160),
                seedScene: s.committedTruth.seedScene || 0,
                revealFired: !!(s.committedTruth.reveal && s.committedTruth.reveal.fired),
                inClimaxWindow: (arcPct !== null) && arcPct >= 0.85
            };
        }

        // Active grievance contracts (escalating / surfacing / converged
        // are interesting for card flavor; dormant + abandoned are not)
        const activeGrievances = (s.grievanceContracts || [])
            .filter(c => c && (c.visibility === 'escalating_offscreen' || c.visibility === 'surfacing' || c.visibility === 'converged'))
            .slice(0, 2)
            .map(c => ({
                sourceCharacter: c.sourceCharacter,
                vector: c.grievanceVector,
                visibility: c.visibility,
                weight: c.weight,
                originatingScene: c.originatingScene,
                aftermathPhase: c.aftermathPhase || null
            }));

        // Recent unresolved callback ledger entries (max 2)
        // Handle both array and {entries, used} shape per the dual-shape pattern
        const ledgerArr = Array.isArray(s.callbackLedger)
            ? s.callbackLedger
            : (s.callbackLedger && Array.isArray(s.callbackLedger.entries) ? s.callbackLedger.entries : []);
        const recentCallbacks = ledgerArr
            .filter(e => e && !e.resolved && e.text)
            .slice(-2)
            .map(e => ({
                type: e.type || 'promise',
                text: String(e.text).slice(0, 140),
                sceneAdded: e.scene_added || 0
            }));

        // Recent narrative scars (slice 1 emotional illusion) — most recent 2
        const recentScars = (s.narrativeScars || [])
            .slice(-2)
            .map(sc => ({
                type: sc.type,
                target: sc.target,
                expression: sc.expression,
                sourceScene: sc.sourceScene,
                physical: !!sc.physical
            }));

        // Recent near-misses (max 1, for card-side "echo" flavor)
        const recentNearMiss = (s.nearMisses || []).slice(-1).map(nm => ({
            what: nm.what,
            distance: nm.distance,
            scene: nm.scene
        }))[0] || null;

        // Relationship gravity (trajectory)
        const gravityDirection = (s.relationshipGravity && s.relationshipGravity.direction) || null;
        const gravityStrength = (s.relationshipGravity && s.relationshipGravity.strength) || null;

        // Narrative gravity (arc carry-forward)
        let narrativeGravity = null;
        if (s.narrativeGravity) {
            narrativeGravity = {
                primary: s.narrativeGravity.primary || null,
                secondary: s.narrativeGravity.secondary || null,
                emotional: s.narrativeGravity.emotional || null
            };
        }

        // microDecision axis lean (objective ↔ relationship)
        const axis = s._stagedPreferenceAxis;
        let axisLean = null;
        if (axis && ((axis.objective || 0) + (axis.relationship || 0) > 0)) {
            const lead = (axis.objective || 0) - (axis.relationship || 0);
            axisLean = {
                objective: axis.objective || 0,
                relationship: axis.relationship || 0,
                lead
            };
        }

        // Charge gravity (avoidance ↔ dwell)
        const cg = s.chargeGravity || null;
        let chargeLean = null;
        if (cg && ((cg.avoidance || 0) + (cg.dwell || 0) > 0)) {
            chargeLean = {
                avoidance: cg.avoidance || 0,
                dwell: cg.dwell || 0,
                lead: (cg.dwell || 0) - (cg.avoidance || 0)
            };
        }

        // Active Fate-OAS budget (informs cards during in-OAS Fate distortion)
        let fateOASBudget = null;
        if (s._fateOASBudget && s._fateOASBudget.turnsRemaining > 0) {
            fateOASBudget = {
                type: s._fateOASBudget.type,
                turnsRemaining: s._fateOASBudget.turnsRemaining,
                totalTurns: s._fateOASBudget.totalTurns
            };
        }

        return {
            // A-plot
            aPlotGoal, aPlotStakes, aPlotClock, aPlotTimelineLength, arcPct, turnCount,
            // structural
            archetypePrimary, archetypeModifier, storyturn, intimacyPhase,
            // promise / consequence systems
            committedTruth, activeGrievances, recentCallbacks, recentScars, recentNearMiss,
            // gravity readouts
            gravityDirection, gravityStrength, narrativeGravity, axisLean, chargeLean,
            // Fate-OAS distortion (during invocation)
            fateOASBudget
        };
    }
    window.extractPlotContext = extractPlotContext;

    // SCENE AWARENESS: Extract critical context from story
    function extractSceneContext(storyText, state) {
        const recentText = storyText.slice(-800).toLowerCase();
        const veryRecentText = storyText.slice(-300).toLowerCase();

        // Extract named characters present in scene
        const presentCharacters = [];
        const liName = state.loveInterestName || '';
        const playerName = state.playerName || 'you';
        if (liName && recentText.includes(liName.toLowerCase())) {
            presentCharacters.push(liName);
        }
        // Check for other named characters mentioned recently
        const nameMatches = recentText.match(/\b[A-Z][a-z]{2,12}\b/g) || [];
        nameMatches.forEach(name => {
            if (name !== liName && name !== playerName && !presentCharacters.includes(name)) {
                if (recentText.split(name.toLowerCase()).length > 2) {
                    presentCharacters.push(name);
                }
            }
        });

        // Detect last emotional beat
        let lastEmotionalBeat = 'neutral';
        if (/kiss(ed|ing)?|lips\s+(met|touch|press)/.test(veryRecentText)) {
            lastEmotionalBeat = 'intimacy';
        } else if (/argue|anger|frustrat|shouted|yelled|storm(ed)?/.test(veryRecentText)) {
            lastEmotionalBeat = 'conflict';
        } else if (/laugh(ed|ing)?|smiled|grinned|joy/.test(veryRecentText)) {
            lastEmotionalBeat = 'relief';
        } else if (/heart\s+(pound|race)|breath\s+(catch|hitch)|tense|charged/.test(veryRecentText)) {
            lastEmotionalBeat = 'tension';
        } else if (/tears?|cried|confess|vulnerab|admit/.test(veryRecentText)) {
            lastEmotionalBeat = 'vulnerability';
        } else if (/secret|hidden|conceal|lie|lying/.test(veryRecentText)) {
            lastEmotionalBeat = 'deception';
        }

        // Detect unresolved tension
        const unresolvedTension = [];
        if (/but\s+didn't|almost\s+said|wanted\s+to\s+but|held\s+back|stopped\s+(your|him|her)self/.test(recentText)) {
            unresolvedTension.push('withheld action');
        }
        if (/question\s+hung|unanswered|didn't\s+respond|silence\s+stretched|no\s+reply/.test(recentText)) {
            unresolvedTension.push('unanswered question');
        }
        if (/secret|hiding|haven't\s+told|don't\s+know\s+that/.test(recentText)) {
            unresolvedTension.push('hidden truth');
        }
        if (/interrupt(ed)?|cut\s+off|phone\s+rang|door\s+(opened|burst)|someone\s+(entered|arrived)/.test(recentText)) {
            unresolvedTension.push('interrupted moment');
        }
        if (/promise|swore|vowed|committed/.test(recentText) && /break|betray|doubt/.test(recentText)) {
            unresolvedTension.push('threatened promise');
        }

        // Extract location/setting elements
        const locationMatches = recentText.match(/\b(room|bedroom|office|garden|balcony|kitchen|hallway|car|restaurant|bar|street|roof|beach|forest|library|study)\b/g) || [];
        const currentLocation = locationMatches.length > 0 ? locationMatches[locationMatches.length - 1] : null;

        // Extract objects/props mentioned
        const objectMatches = recentText.match(/\b(door|window|glass|drink|phone|letter|ring|key|photograph|mirror|candle|fire|rain|storm)\b/g) || [];
        const sceneObjects = [...new Set(objectMatches)].slice(0, 3);

        // Calculate confidence score (0-1) based on how much context we found
        let confidence = 0;
        if (liName && recentText.includes(liName.toLowerCase())) confidence += 0.3;
        if (lastEmotionalBeat !== 'neutral') confidence += 0.25;
        if (unresolvedTension.length > 0) confidence += 0.2;
        if (currentLocation) confidence += 0.15;
        if (sceneObjects.length > 0) confidence += 0.1;

        // Slice 1 (added 2026-05-17): plot context merged in as `plot` key.
        // Existing destructures pull specific scene-context fields, ignoring
        // extras — safe to add. Slices 2-3 will read `plot.*` for richer
        // card flavor; Slice 1 only surfaces the data so it's available.
        const plot = extractPlotContext(state);
        try {
            console.log('[FATE-CARDS:PLOT-CTX]',
                'archetype=' + (plot.archetypePrimary || '–'),
                '· ST=' + plot.storyturn,
                '· intimacy=' + plot.intimacyPhase,
                '· aplot=' + (plot.aPlotGoal ? '"' + String(plot.aPlotGoal).slice(0, 40) + '"' : '–'),
                '· truth=' + (plot.committedTruth ? plot.committedTruth.about + (plot.committedTruth.inClimaxWindow ? '[climax]' : '') : '–'),
                '· grievances=' + plot.activeGrievances.length,
                '· callbacks=' + plot.recentCallbacks.length,
                '· scars=' + plot.recentScars.length,
                '· gravity=' + (plot.gravityDirection || '–'),
                '· axis-lead=' + (plot.axisLean ? plot.axisLean.lead : '–'),
                '· fateOAS=' + (plot.fateOASBudget ? plot.fateOASBudget.type + '(' + plot.fateOASBudget.turnsRemaining + 'left)' : '–')
            );
        } catch (_) {}

        return {
            presentCharacters,
            lastEmotionalBeat,
            unresolvedTension,
            currentLocation,
            sceneObjects,
            liName,
            liIntroduced: liName && recentText.includes(liName.toLowerCase()),
            confidence,
            plot
        };
    }

    // NON-REPETITION: Track recently used phrases
    let lastTurnPhrases = [];

    function isPhraseTooSimilar(phrase, usedPhrases) {
        const normalized = phrase.toLowerCase().replace(/[^a-z\s]/g, '');
        for (const used of usedPhrases) {
            const usedNorm = used.toLowerCase().replace(/[^a-z\s]/g, '');
            // Check for high overlap
            const words1 = normalized.split(/\s+/);
            const words2 = usedNorm.split(/\s+/);
            const overlap = words1.filter(w => words2.includes(w) && w.length > 3).length;
            if (overlap >= 3 || (overlap >= 2 && words1.length <= 5)) {
                return true;
            }
        }
        return false;
    }

    // GENERIC VERB AVOIDANCE: Only allow if contextualized
    const GENERIC_VERBS = ['lean in', 'step closer', 'hesitate', 'lock eyes', 'move toward', 'pull away', 'look away'];

    function hasGenericVerb(phrase) {
        const lower = phrase.toLowerCase();
        return GENERIC_VERBS.some(v => lower.includes(v));
    }

    // SOFT FALLBACKS: Restrained options for low-confidence scenes
    // These are warmer than hard generics but don't assume specific context
    const SOFT_FALLBACKS = {
        temptation: {
            action: 'Something pulls at you—not quite nameable, but undeniable.',
            dialogue: '"I shouldn\'t... but I want to."',
            altAction: 'A quiet want stirs. You could follow it.',
            altDialogue: '"Maybe just this once."'
        },
        confession: {
            action: 'Words you\'ve kept inside press against your teeth.',
            dialogue: '"There\'s something I need to say."',
            altAction: 'The weight of unspoken truth grows heavier.',
            altDialogue: '"I haven\'t been honest."'
        },
        boundary: {
            action: 'You sense a threshold ahead. Cross it, or hold the line.',
            dialogue: '"I need to decide what I\'m willing to risk."',
            altAction: 'The moment asks: how far?',
            altDialogue: '"Tell me if this is too much."'
        },
        reversal: {
            action: 'The dynamic between you shifts. Lean into it or resist.',
            dialogue: '"Who\'s in control here?"',
            altAction: 'You feel the balance tipping. Guide it.',
            altDialogue: '"Your move."'
        },
        silence: {
            action: 'Words feel inadequate. Let the quiet say what you can\'t.',
            dialogue: '(The silence means something.)',
            altAction: 'Sometimes not speaking is the strongest choice.',
            altDialogue: '(You hold the pause.)'
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // INTIMATE CONTEXT DETECTION
    // ═══════════════════════════════════════════════════════════════════

    function isIntimateContextActive() {
        const st = window.state || {};
        // Active intimate scene (ESD exists this turn) OR cascade just ended (re-entry window)
        return !!(st.esd || st.cascadeContext);
    }

    function resolveIntimateMode() {
        const st = window.state || {};
        const mode = st.eroticMode || 'ROMANTIC';
        // INTENSITY_REDIRECT maps to ROMANTIC templates (no escalation)
        return mode === 'INTENSITY_REDIRECT' ? 'ROMANTIC' : mode;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTIMATE DECK BASE — 5 erotic archetype reframes
    // ═══════════════════════════════════════════════════════════════════

    const INTIMATE_DECK_BASE = [
        { id: 'temptation', title: 'Temptation', desc: 'Escalate. New act, new territory, new threshold.', actionTemplate: 'Push past what you were just doing.', dialogueTemplate: '"More."' },
        { id: 'confession', title: 'Confession', desc: 'Admit what you want. Mid-act, no armor.', actionTemplate: 'Say it while it\'s happening.', dialogueTemplate: '"I need—"' },
        { id: 'boundary', title: 'Boundary', desc: 'State your need. Demand, not refusal.', actionTemplate: 'Tell them exactly what you want.', dialogueTemplate: '"Right there. Don\'t stop."' },
        { id: 'reversal', title: 'Reversal', desc: 'Power changes hands. Take or yield.', actionTemplate: 'Seize control or surrender it.', dialogueTemplate: '"Let me."' },
        { id: 'silence', title: 'Silence', desc: 'No words. Teeth, nails, breath, movement.', actionTemplate: 'Let your body speak.', dialogueTemplate: '(A sound, not a word.)' }
    ];

    // ═══════════════════════════════════════════════════════════════════
    // INTIMATE OPTION GENERATORS × 3 MODES
    // ═══════════════════════════════════════════════════════════════════

    function getIntimateTemptationOptions(ctx) {
        const mode = ctx.intimateMode || 'ROMANTIC';
        const li = ctx.liName || 'them';
        switch (mode) {
            case 'CARNAL':
                return {
                    action: `Take what you haven't claimed from ${li}. New act, now.`,
                    dialogue: '"I\'m not done with you."',
                    altAction: `Push ${li} into something neither of you has tried.`,
                    altDialogue: '"You can take more than that."'
                };
            case 'VISCERAL':
                return {
                    action: `Guide ${li}'s mouth somewhere new. Change positions.`,
                    dialogue: '"Come here."',
                    altAction: `Pull ${li} closer and shift the angle.`,
                    altDialogue: '"I want to feel you differently."'
                };
            default: // ROMANTIC
                return {
                    action: `Undress ${li} slowly—one more layer.`,
                    dialogue: '"Let me see you."',
                    altAction: `Trace a line down ${li}'s skin with your fingertips.`,
                    altDialogue: '"I\'ve wanted to touch you here."'
                };
        }
    }

    function getIntimateConfessionOptions(ctx) {
        const mode = ctx.intimateMode || 'ROMANTIC';
        const li = ctx.liName || 'them';
        switch (mode) {
            case 'CARNAL':
                return {
                    action: `Describe what you're doing to ${li}. In detail. While doing it.`,
                    dialogue: '"Feel what you do to me."',
                    altAction: `Tell ${li} exactly how they taste.`,
                    altDialogue: '"You have no idea how long I\'ve wanted this."'
                };
            case 'VISCERAL':
                return {
                    action: `Tell ${li} what their body does to you—breathless.`,
                    dialogue: '"You feel—god—"',
                    altAction: `Gasp against ${li}'s skin and let the truth spill.`,
                    altDialogue: '"I can\'t think when you do that."'
                };
            default: // ROMANTIC
                return {
                    action: `Whisper to ${li} what you've been holding back.`,
                    dialogue: '"I want you. I\'ve wanted you."',
                    altAction: `Press your forehead to ${li}'s and confess.`,
                    altDialogue: '"I didn\'t know it could feel like this."'
                };
        }
    }

    function getIntimateBoundaryOptions(ctx) {
        const mode = ctx.intimateMode || 'ROMANTIC';
        const li = ctx.liName || 'them';
        switch (mode) {
            case 'CARNAL':
                return {
                    action: `Command ${li}. On your knees. Don't ask—tell.`,
                    dialogue: '"On your knees."',
                    altAction: `Set the pace. ${li} follows your rhythm now.`,
                    altDialogue: '"You do what I say."'
                };
            case 'VISCERAL':
                return {
                    action: `Grab ${li} and position them where you need them. Harder.`,
                    dialogue: '"Harder."',
                    altAction: `Pull ${li} against you and set the depth.`,
                    altDialogue: '"Don\'t you dare stop."'
                };
            default: // ROMANTIC
                return {
                    action: `Guide ${li}'s hand exactly where you need it.`,
                    dialogue: '"Right there. Don\'t stop."',
                    altAction: `Arch into ${li} and show them without words.`,
                    altDialogue: '"Stay. Just like that."'
                };
        }
    }

    function getIntimateReversalOptions(ctx) {
        const mode = ctx.intimateMode || 'ROMANTIC';
        const li = ctx.liName || 'them';
        switch (mode) {
            case 'CARNAL':
                return {
                    action: `Pin ${li}'s wrists. Full surrender or full control—choose.`,
                    dialogue: '"You\'re mine right now."',
                    altAction: `Flip ${li} and take what you want.`,
                    altDialogue: '"I decide when you\'re done."'
                };
            case 'VISCERAL':
                return {
                    action: `Pin ${li} and take the rhythm. You lead now.`,
                    dialogue: '"My turn."',
                    altAction: `Push ${li} back and climb on top.`,
                    altDialogue: '"I\'ve been patient enough."'
                };
            default: // ROMANTIC
                return {
                    action: `Gently take over. "Let me." Roll ${li} beneath you.`,
                    dialogue: '"Let me take care of you."',
                    altAction: `Cup ${li}'s face and shift the dynamic—tender control.`,
                    altDialogue: '"Trust me."'
                };
        }
    }

    function getIntimateSilenceOptions(ctx) {
        const mode = ctx.intimateMode || 'ROMANTIC';
        const li = ctx.liName || 'them';
        switch (mode) {
            case 'CARNAL':
                return {
                    action: `A raw animal sound. Grip ${li} hard enough to bruise.`,
                    dialogue: '(A guttural moan—nothing human about it.)',
                    altAction: `Teeth in ${li}'s shoulder. Nails raking. No words left.`,
                    altDialogue: '(The sound you make isn\'t voluntary.)'
                };
            case 'VISCERAL':
                return {
                    action: `Bite ${li}'s shoulder. Nails down their back. No words.`,
                    dialogue: '(A sharp intake of breath through clenched teeth.)',
                    altAction: `Dig your fingers into ${li}'s hips and pull them closer.`,
                    altDialogue: '(A moan you couldn\'t stop if you tried.)'
                };
            default: // ROMANTIC
                return {
                    action: `Lips on ${li}'s pulse point. Fingertip tracing their jaw.`,
                    dialogue: '(A soft sound against their skin.)',
                    altAction: `Close your eyes. Press your lips to ${li}'s collarbone.`,
                    altDialogue: '(Your breath catches—that\'s enough.)'
                };
        }
    }

    function generateIntimateCardOptions(cardId, ctx) {
        switch (cardId) {
            case 'temptation': return getIntimateTemptationOptions(ctx);
            case 'confession': return getIntimateConfessionOptions(ctx);
            case 'boundary':   return getIntimateBoundaryOptions(ctx);
            case 'reversal':   return getIntimateReversalOptions(ctx);
            case 'silence':    return getIntimateSilenceOptions(ctx);
            default:           return getIntimateTemptationOptions(ctx);
        }
    }

    // Export intimate context detection
    window.isIntimateContextActive = isIntimateContextActive;

    // Confidence threshold for using full contextual options
    const CONFIDENCE_THRESHOLD = 0.35;

    // Contextual card generation with full scene awareness
    function generateContextualCard(baseCard, sceneContext, usedInThisDraw) {
        const state = window.state || {};
        const turnCount = state.turnCount || 0;
        const intensity = state.intensity || 'Naughty';

        const { presentCharacters, lastEmotionalBeat, unresolvedTension, currentLocation, sceneObjects, liName, liIntroduced, confidence } = sceneContext;

        // ═══════════════════════════════════════════════════════════════════
        // STORYBEAU AUTHORITY: Resolve target before card generation
        // Romantic cards MUST target Storybeau — no inference allowed
        // ═══════════════════════════════════════════════════════════════════
        const targetResolution = resolveFateCardTarget(baseCard.id, sceneContext, {});
        const resolvedTargetName = targetResolution.target || liName;

        // Log authority resolution for debugging
        if (ROMANTIC_IMPLICATION_CARDS.includes(baseCard.id)) {
            console.log('[FATE:AUTHORITY] Card target resolved', {
                cardId: baseCard.id,
                resolvedTarget: resolvedTargetName,
                isStorybeau: targetResolution.isStorybeau,
                sceneCharacters: presentCharacters
            });
        }

        // ═══════════════════════════════════════════════════════════════════
        // INTIMATE CONTEXT: Route through erotic generators, skip ChatGPT
        // ═══════════════════════════════════════════════════════════════════
        if (isIntimateContextActive()) {
            // Slice 2 (added 2026-05-17): check speculative Grok cache first.
            // _speculativeGrokIntimateFateCards fires at scene-finalize for the
            // NEXT turn; by deal time the cache should usually be populated.
            // Cards include `variant` (amplify | ruin | redirect) for telemetry.
            const tc = state.turnCount || 0;
            const grokCache = state._grokIntimateFateCards;
            if (grokCache && grokCache.turnCount === tc && grokCache.cards && grokCache.cards[baseCard.id]) {
                const g = grokCache.cards[baseCard.id];
                try { console.log('[FATE-CARDS:GROK-HIT] card=' + baseCard.id + ' variant=' + (g.variant || 'amplify')); } catch (_) {}
                return { ...baseCard, action: g.action, dialogue: g.dialogue, _intimate: true, _variant: g.variant || 'amplify', _grokSourced: true };
            }

            // Cache miss → fall back to template generator. Either speculative
            // call didn't fire (no orchestration client), it's still in flight,
            // or it failed (Grok down). Templates always work as a floor.
            try { console.log('[FATE-CARDS:GROK-MISS] card=' + baseCard.id + ' — template fallback'); } catch (_) {}
            const intimateMode = resolveIntimateMode();
            const intimateCtx = { intimateMode, liName: resolvedTargetName };
            const options = generateIntimateCardOptions(baseCard.id, intimateCtx);

            // Anti-repetition filter
            const allUsed = [...usedInThisDraw, ...lastTurnPhrases];
            let action = options.action;
            let dialogue = options.dialogue;
            if (isPhraseTooSimilar(action, allUsed)) {
                action = options.altAction || action;
            }
            if (isPhraseTooSimilar(dialogue, allUsed)) {
                dialogue = options.altDialogue || dialogue;
            }

            return { ...baseCard, action, dialogue, _intimate: true };
        }

        // Determine story phase
        const isSetup = turnCount === 0;
        const isEarlyStory = turnCount <= 2;

        // LOW CONFIDENCE: Use soft fallbacks instead of full contextual options
        // This avoids over-specific language when we're not sure what's happening
        if (confidence < CONFIDENCE_THRESHOLD && !isSetup) {
            const fallback = SOFT_FALLBACKS[baseCard.id];
            if (fallback) {
                const allUsed = [...usedInThisDraw, ...lastTurnPhrases];
                let action = fallback.action;
                let dialogue = fallback.dialogue;

                // Still check for repetition, use alt if needed
                if (isPhraseTooSimilar(action, allUsed)) {
                    action = fallback.altAction;
                }
                if (isPhraseTooSimilar(dialogue, allUsed)) {
                    dialogue = fallback.altDialogue;
                }

                return { ...baseCard, action, dialogue };
            }
        }

        // Generate options based on card type with scene awareness
        // STORYBEAU AUTHORITY: Use resolved target, not raw liName
        // Slice 3 (added 2026-05-17): pass `plot` through so card generators
        // can branch on A-plot pressure, committed truth, grievances, scars,
        // callbacks, gravity, axis lean. Existing branches still fire if no
        // plot signal matches.
        const options = generateCardOptions(baseCard.id, {
            isSetup,
            isEarlyStory,
            liIntroduced: targetResolution.target ? true : liIntroduced,
            liName: resolvedTargetName, // AUTHORITATIVE: Storybeau-resolved target
            liAbsent: !!targetResolution.liAbsent, // LI offstage → non-LI generic fallback
            intensity,
            lastEmotionalBeat,
            unresolvedTension,
            currentLocation,
            sceneObjects,
            presentCharacters,
            // Pass resolution metadata for triangle-aware generation
            targetResolution,
            // Slice 3: plot context (Slice 1 extracted, Slice 3 reads)
            plot: sceneContext.plot || null
        });

        // Filter out repetitive or generic options
        let action = options.action;
        let dialogue = options.dialogue;

        // Check against used phrases in this draw and last turn
        const allUsed = [...usedInThisDraw, ...lastTurnPhrases];

        if (isPhraseTooSimilar(action, allUsed) || (hasGenericVerb(action) && !currentLocation && !liName)) {
            action = options.altAction || baseCard.actionTemplate;
        }
        if (isPhraseTooSimilar(dialogue, allUsed)) {
            dialogue = options.altDialogue || baseCard.dialogueTemplate;
        }

        return {
            ...baseCard,
            action,
            dialogue
        };
    }

    // LI-ABSENT generic defaults — used when the love interest is offstage so
    // the (normally romance-coded) cards read as all-around interaction
    // suggestions toward the present situation, NON-romantically. These are
    // deal-time placeholders; the click-time LLM preview refines them from the
    // actual prose. Silence has no LI dependency, so it uses its normal path.
    const _LI_ABSENT_FALLBACKS = {
        temptation: { action: "There's an opening right in front of you. Take it before the moment closes.", dialogue: '"Why not. Who\'s going to stop me."',
                      altAction: 'Do the reckless thing the room is daring you not to do.', altDialogue: '"Let\'s see what happens."' },
        confession: { action: 'Stop hedging and put the real thing on the table — out loud.', dialogue: '"Here\'s the truth, since no one else will say it."',
                      altAction: 'Own the thing you\'ve been dancing around.', altDialogue: '"I\'m done pretending otherwise."' },
        boundary:   { action: "Hold the line. Don't give an inch you didn't mean to.", dialogue: '"That\'s as far as this goes."',
                      altAction: 'Plant your feet and refuse to be moved.', altDialogue: '"No. Not this."' },
        reversal:   { action: 'Take the reins of this exchange. Let them follow your lead for once.', dialogue: '"We\'re doing this my way now."',
                      altAction: 'Flip who\'s running the room.', altDialogue: '"I\'ll decide how this goes."' }
    };

    // ACTIONABLE OPTIONS: Each should change the next beat differently
    function generateCardOptions(cardId, ctx) {
        const { isSetup, isEarlyStory, liIntroduced, liName, intensity, lastEmotionalBeat, unresolvedTension, currentLocation, sceneObjects, presentCharacters, plot, liAbsent } = ctx;

        const locationPhrase = currentLocation ? `in the ${currentLocation}` : '';
        const objectPhrase = sceneObjects.length > 0 ? sceneObjects[0] : '';
        const tensionPhrase = unresolvedTension.length > 0 ? unresolvedTension[0] : '';

        // LI offstage → romance-coded cards use the non-LI generic default
        // instead of LI-templated text. (Silence falls through — no LI dep.)
        if (liAbsent && _LI_ABSENT_FALLBACKS[cardId]) {
            return _LI_ABSENT_FALLBACKS[cardId];
        }

        switch(cardId) {
            case 'temptation':
                return getTemptationOptions(ctx, locationPhrase, objectPhrase, tensionPhrase);
            case 'confession':
                return getConfessionOptions(ctx, locationPhrase, objectPhrase, tensionPhrase);
            case 'boundary':
                return getBoundaryOptions(ctx, locationPhrase, objectPhrase, tensionPhrase);
            case 'reversal':
                return getReversalOptions(ctx, locationPhrase, objectPhrase, tensionPhrase);
            case 'silence':
                return getSilenceOptions(ctx, locationPhrase, objectPhrase, tensionPhrase);
            default:
                return { action: '', dialogue: '' };
        }
    }

    function getTemptationOptions(ctx, locationPhrase, objectPhrase, tensionPhrase) {
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, intensity, plot } = ctx;

        // ── Slice 3: plot-driven branches (fire BEFORE generic emotional-beat) ──
        if (plot) {
            // Committed truth in climax window — temptation = take the reveal
            if (plot.committedTruth && !plot.committedTruth.revealFired && plot.committedTruth.inClimaxWindow) {
                return {
                    action: `The thing you've been circling — it's right there. Reach for it.`,
                    dialogue: `"I think I finally see it."`,
                    altAction: `The pattern is about to name itself. Don't look away.`,
                    altDialogue: `"Tell me I'm wrong."`
                };
            }
            // Active grievance (escalating / surfacing) — temptation toward confrontation
            if (plot.activeGrievances && plot.activeGrievances.length) {
                const g = plot.activeGrievances[0];
                return {
                    action: `Bring up ${g.sourceCharacter}. You've been steering around the name for too long.`,
                    dialogue: `"What happened with ${g.sourceCharacter} — it never settled, did it?"`,
                    altAction: `The pull to close the loop with ${g.sourceCharacter} sharpens.`,
                    altDialogue: `"I keep almost saying ${g.sourceCharacter}'s name."`
                };
            }
            // Recent near-miss — temptation to circle back to the alternate timeline
            if (plot.recentNearMiss) {
                return {
                    action: `Something pulls you back toward what almost happened. Follow it.`,
                    dialogue: `"I keep thinking about the day I didn't pick up."`,
                    altAction: `The almost-thing won't stop almosting. Test it again.`,
                    altDialogue: `"What if I'd answered?"`
                };
            }
            // Heavy axis lean — temptation toward the OPPOSITE pole
            if (plot.axisLean && Math.abs(plot.axisLean.lead) >= 4) {
                if (plot.axisLean.lead > 0) {
                    // objective-heavy → temptation to drop the goal for ${liName}
                    return {
                        action: `Set the work down. Let ${liName} be the only thing in the room.`,
                        dialogue: `"None of it matters tonight."`,
                        altAction: `The goal can wait. Choose the person.`,
                        altDialogue: `"I want this more than I want to be right."`
                    };
                } else {
                    // relationship-heavy → temptation to seize the objective alone
                    return {
                        action: `Step away from ${liName}. Do the thing nobody can do with you.`,
                        dialogue: `"I have to handle this myself."`,
                        altAction: `Walk past ${liName}. The work is its own pull.`,
                        altDialogue: `"Don't follow me."`
                    };
                }
            }
        }

        if (isSetup) {
            return {
                action: 'A pull toward something forbidden tugs at you. Act on it, or resist.',
                dialogue: '"This feeling... I should ignore it."',
                altAction: 'Something here calls to you against your better judgment.',
                altDialogue: '"Why does this feel so familiar?"'
            };
        }

        if (!liIntroduced) {
            return {
                action: 'Your curiosity sharpens into want. Follow it deeper.',
                dialogue: '"I need to know more..."',
                altAction: 'A dangerous curiosity takes hold. Pursue it.',
                altDialogue: '"This is reckless. I don\'t care."'
            };
        }

        // ESCALATE based on last emotional beat
        if (lastEmotionalBeat === 'intimacy') {
            return {
                action: `That taste of ${liName} wasn't enough. Take more.`,
                dialogue: '"I want that again."',
                altAction: `Your body remembers ${liName}'s touch. It wants more.`,
                altDialogue: '"Once wasn\'t enough."'
            };
        }
        if (lastEmotionalBeat === 'conflict') {
            return {
                action: `Your anger at ${liName} burns—but so does something else.`,
                dialogue: '"I hate how much I still want this."',
                altAction: `Fighting with ${liName} lit something you can't extinguish.`,
                altDialogue: '"This doesn\'t change anything." (It does.)'
            };
        }
        if (lastEmotionalBeat === 'tension') {
            return {
                action: `The air between you and ${liName} crackles. Break the tension—or let it break you.`,
                dialogue: '"If you don\'t stop looking at me like that..."',
                altAction: `The tension demands release. You could give in.`,
                altDialogue: '"We both know what happens next."'
            };
        }

        // Default with context
        const locContext = locationPhrase ? ` ${locationPhrase}` : '';
        return {
            action: `${liName} is right there${locContext}. Your restraint wavers.`,
            dialogue: '"I keep telling myself to stop wanting this."',
            altAction: `Every moment near ${liName} tests your resolve.`,
            altDialogue: '"Just this once..."'
        };
    }

    function getConfessionOptions(ctx, locationPhrase, objectPhrase, tensionPhrase) {
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, unresolvedTension, plot } = ctx;

        // ── Slice 3: plot-driven branches (fire BEFORE generic emotional-beat) ──
        if (plot) {
            // Committed truth — confession can surface the seed (not in climax yet)
            if (plot.committedTruth && !plot.committedTruth.revealFired) {
                const t = plot.committedTruth;
                const scenesSinceSeed = (plot.turnCount || 0) - (t.seedScene || 0);
                if (scenesSinceSeed >= 3 && !t.inClimaxWindow) {
                    return {
                        action: `The thing you've kept folded inside finally needs air. Say it to ${liName}.`,
                        dialogue: `"There's something I should have told you weeks ago."`,
                        altAction: `What you noticed but haven't named is starting to weigh too much.`,
                        altDialogue: `"I've been turning it over. I think you should know."`
                    };
                }
            }
            // Recent narrative scar — confession can name the avoidance
            if (plot.recentScars && plot.recentScars.length) {
                const sc = plot.recentScars[plot.recentScars.length - 1];
                return {
                    action: `Acknowledge what you've been walking around. Name "${sc.target}" out loud.`,
                    dialogue: `"I haven't been able to talk about it. Until now."`,
                    altAction: `The thing you've been steering past — admit it.`,
                    altDialogue: `"You've noticed me avoiding it, haven't you?"`
                };
            }
            // Active grievance — confession about the source character
            if (plot.activeGrievances && plot.activeGrievances.length) {
                const g = plot.activeGrievances[0];
                return {
                    action: `Tell ${liName} what really happened with ${g.sourceCharacter}.`,
                    dialogue: `"I haven't been honest about ${g.sourceCharacter}."`,
                    altAction: `${g.sourceCharacter}'s name needs saying. Say it.`,
                    altDialogue: `"I owe ${g.sourceCharacter} an account. Maybe you too."`
                };
            }
            // Unresolved callback — confession about what was left hanging
            if (plot.recentCallbacks && plot.recentCallbacks.length) {
                return {
                    action: `Reopen the thing you both let drop. Don't soften it this time.`,
                    dialogue: `"That conversation we didn't finish — I want to finish it."`,
                    altAction: `Bring the unanswered question back into the room.`,
                    altDialogue: `"You asked me something I didn't answer. I'm answering now."`
                };
            }
        }

        if (isSetup) {
            return {
                action: 'A truth you\'ve buried demands air. Speak it now, or swallow it again.',
                dialogue: '"There\'s something I\'ve never said out loud..."',
                altAction: 'Words you\'ve rehearsed a thousand times rise unbidden.',
                altDialogue: '"Before anything else happens, you need to know..."'
            };
        }

        if (!liIntroduced) {
            return {
                action: 'The weight of an unspoken truth becomes unbearable.',
                dialogue: '"I can\'t keep pretending..."',
                altAction: 'Silence feels like lying. Speak.',
                altDialogue: '"The truth is..."'
            };
        }

        // REVEAL based on unresolved tension
        if (tensionPhrase === 'hidden truth') {
            return {
                action: `The secret you've kept from ${liName} claws at your throat. Let it out.`,
                dialogue: '"There\'s something I should have told you."',
                altAction: `Continuing to hide this from ${liName} is corroding you.`,
                altDialogue: '"I\'ve been lying. About everything."'
            };
        }
        if (lastEmotionalBeat === 'vulnerability') {
            return {
                action: `${liName}'s openness deserves your own. Match it.`,
                dialogue: '"Since you were honest with me..."',
                altAction: `Their vulnerability unlocked something in you. Reciprocate.`,
                altDialogue: '"I\'ve felt the same way. Longer than you know."'
            };
        }
        if (lastEmotionalBeat === 'conflict') {
            return {
                action: `The fight stripped your defenses. Say what the argument was really about.`,
                dialogue: '"That\'s not why I\'m angry. The truth is..."',
                altAction: `Anger made you honest. Don't retreat now.`,
                altDialogue: '"I only fight this hard because I..."'
            };
        }

        return {
            action: `The moment demands truth. Tell ${liName} what you've been holding back.`,
            dialogue: '"I need you to understand something."',
            altAction: `Silence is a form of lying. Choose honesty.`,
            altDialogue: '"What I haven\'t said is..."'
        };
    }

    function getBoundaryOptions(ctx, locationPhrase, objectPhrase, tensionPhrase) {
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, intensity, currentLocation, plot } = ctx;

        // ── Slice 3: plot-driven branches (fire BEFORE generic emotional-beat) ──
        if (plot) {
            // Grievance aftermath firing — boundary about the convergence
            if (plot.activeGrievances && plot.activeGrievances.some(function(g) { return g.aftermathPhase === 'firing'; })) {
                var gAft = plot.activeGrievances.find(function(g) { return g.aftermathPhase === 'firing'; });
                return {
                    action: `Decide right now how much you owe ${gAft.sourceCharacter}. The room is waiting.`,
                    dialogue: `"I have to choose what to give them."`,
                    altAction: `Hold the line — or don't — between yourself and ${gAft.sourceCharacter}.`,
                    altDialogue: `"This is where I either make it right or don't."`
                };
            }
            // Recent narrative scar — boundary that honors the scar
            if (plot.recentScars && plot.recentScars.length) {
                var scB = plot.recentScars[plot.recentScars.length - 1];
                return {
                    action: `You know where the line is now. Don't let ${liName} talk you past "${scB.target}".`,
                    dialogue: `"I can't do that anymore. Not after last time."`,
                    altAction: `The scar is the boundary. Honor it without explaining it.`,
                    altDialogue: `"Some things I just don't do now."`
                };
            }
            // A-plot pressure — boundary against sacrificing the goal
            if (plot.aPlotGoal && plot.aPlotStakes) {
                return {
                    action: `${liName} is here, but so is the deadline. Make a choice that doesn't apologize for either.`,
                    dialogue: `"I can give you tonight, but I can't give you tomorrow."`,
                    altAction: `Name the cost out loud. ${liName} either accepts it or doesn't.`,
                    altDialogue: `"If I stay, I lose the thing I came for."`
                };
            }
            // Heavy charge avoidance — boundary that protects the avoidance
            if (plot.chargeLean && plot.chargeLean.lead <= -4) {
                return {
                    action: `Step back before this becomes more than you can hold. ${liName} can wait.`,
                    dialogue: `"Not tonight. I need to think."`,
                    altAction: `The pull is real and the answer is still no.`,
                    altDialogue: `"I want this. That's why I'm leaving."`
                };
            }
        }

        if (isSetup) {
            return {
                action: 'Decide now what you will and won\'t permit—before the moment decides for you.',
                dialogue: '"Not yet. Not like this."',
                altAction: 'Draw a line. Or erase the one that\'s there.',
                altDialogue: '"I need to know where this is going."'
            };
        }

        // COMPLICATE based on what just happened
        if (lastEmotionalBeat === 'intimacy') {
            return {
                action: 'What just happened changes things. Decide: further, or stop here.',
                dialogue: '"That was... do we keep going?"',
                altAction: 'The line you told yourself you wouldn\'t cross is behind you. Draw a new one.',
                altDialogue: '"If we do more, there\'s no going back."'
            };
        }
        if (lastEmotionalBeat === 'tension') {
            return {
                action: `The tension is a knife's edge. Tip it one direction.`,
                dialogue: '"Either we do this, or we walk away. Now."',
                altAction: `This can\'t stay suspended. Force a resolution.`,
                altDialogue: '"Make a choice. I need to know."'
            };
        }
        if (tensionPhrase === 'interrupted moment') {
            return {
                action: 'The interruption gave you an exit. Take it, or refuse it.',
                dialogue: '"Maybe that was a sign we should stop."',
                altAction: 'You could let this moment die. Or resurrect it.',
                altDialogue: '"Where were we? I don\'t want to lose this."'
            };
        }

        // Location-specific
        if (currentLocation === 'bedroom' || currentLocation === 'room') {
            return {
                action: `Here, in this ${currentLocation}, the choice is inescapable. Decide.`,
                dialogue: '"Do you want me to stay, or go?"',
                altAction: `The ${currentLocation} demands a decision.`,
                altDialogue: '"Tell me what you want."'
            };
        }

        // GUARD: If liName unavailable, use generic fallback (no dangling preposition)
        if (!liName) {
            return {
                action: 'Set the terms. What happens next is your call.',
                dialogue: '"Before this goes further—"',
                altAction: 'Draw the line. What happens next is your call.',
                altDialogue: '"Is this what you want?"'
            };
        }

        return {
            action: `Set the terms with ${liName}. What happens next is your call.`,
            dialogue: '"Before this goes further—"',
            altAction: `You have power here. Use it to draw a line or invite ${liName} past it.`,
            altDialogue: '"Is this what you want?"'
        };
    }

    function getReversalOptions(ctx, locationPhrase, objectPhrase, tensionPhrase) {
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, presentCharacters, plot } = ctx;

        // ── Slice 3: plot-driven branches (fire BEFORE generic emotional-beat) ──
        if (plot) {
            // Heavy axis lean — reversal pulls toward the OPPOSITE pole
            if (plot.axisLean && Math.abs(plot.axisLean.lead) >= 4) {
                if (plot.axisLean.lead > 0) {
                    // objective-heavy → reversal toward connection
                    return {
                        action: `Set down the agenda you've been carrying. Look at ${liName} like the agenda was never the point.`,
                        dialogue: `"None of this works without you."`,
                        altAction: `Stop strategizing. Choose ${liName} mid-sentence.`,
                        altDialogue: `"I've been managing you. I'm done."`
                    };
                } else {
                    // relationship-heavy → reversal toward objective
                    return {
                        action: `Pull back from ${liName} just enough to act. The work was always going to need you eventually.`,
                        dialogue: `"I love this. But it can't be the only thing."`,
                        altAction: `Step out of the soft place. Take the move you've been postponing.`,
                        altDialogue: `"I need to be the person who does this."`
                    };
                }
            }
            // Grievance surfacing — reversal hands the power to the absent figure
            if (plot.activeGrievances && plot.activeGrievances.some(function(g) { return g.visibility === 'surfacing'; })) {
                var gSurf = plot.activeGrievances.find(function(g) { return g.visibility === 'surfacing'; });
                return {
                    action: `Acknowledge ${gSurf.sourceCharacter} out loud. Give the absent the room they've been earning.`,
                    dialogue: `"${gSurf.sourceCharacter} has been part of this without being here."`,
                    altAction: `Let the dynamic between you and ${liName} reshape around someone neither of you is looking at.`,
                    altDialogue: `"We've been having the wrong conversation."`
                };
            }
            // Relationship gravity drift — reversal corrects the trajectory
            if (plot.gravityDirection === 'away') {
                return {
                    action: `Close the distance you've let open with ${liName}. Don't ask permission.`,
                    dialogue: `"I've been letting this slip. I'm not anymore."`,
                    altAction: `Reach for ${liName} before you decide if you should.`,
                    altDialogue: `"Come here."`
                };
            }
            if (plot.gravityDirection === 'toward') {
                return {
                    action: `Step back from ${liName}. The pull is real; that's not the same as right.`,
                    dialogue: `"I want this. I'm not sure I should."`,
                    altAction: `Cool the orbit on purpose. ${liName} will feel it.`,
                    altDialogue: `"Let me think."`
                };
            }
        }

        if (isSetup || !liIntroduced) {
            return {
                action: 'You straighten, letting the room feel the shift in you.',
                dialogue: '"Your move."',
                altAction: 'You take a half-step forward, claiming the space between you.',
                altDialogue: '"I\'m waiting."'
            };
        }

        // WITHDRAW or ASSERT based on beat
        if (lastEmotionalBeat === 'intimacy') {
            return {
                action: `You pull back just enough to take the reins from ${liName}.`,
                dialogue: '"Now it\'s my turn."',
                altAction: `You catch ${liName}'s wrist and draw them closer.`,
                altDialogue: '"You think you have the upper hand?"'
            };
        }
        if (lastEmotionalBeat === 'conflict') {
            return {
                action: `You let the silence after the argument settle, then close the distance.`,
                dialogue: '"I could end this. But I won\'t."',
                altAction: `You stop retreating and hold your ground against ${liName}.`,
                altDialogue: '"Admit you were wrong."'
            };
        }
        if (lastEmotionalBeat === 'vulnerability') {
            return {
                action: `You reach out and steady ${liName}, anchoring the moment.`,
                dialogue: '"You just gave me everything."',
                altAction: `You let ${liName}'s openness draw you closer instead of pulling away.`,
                altDialogue: '"Thank you for trusting me."'
            };
        }

        // Third party present
        if (presentCharacters.length > 1) {
            const otherPerson = presentCharacters.find(p => p !== liName) || 'them';
            return {
                action: `You step between ${otherPerson} and ${liName}, making your position clear.`,
                dialogue: `"${liName} is with me."`,
                altAction: `You catch ${liName}'s eye across the room and tilt your head toward the door.`,
                altDialogue: '"We should discuss this privately."'
            };
        }

        return {
            action: `You step forward, tipping the balance between you and ${liName}.`,
            dialogue: '"Come here."',
            altAction: `You hold ${liName}'s gaze and let the power shift.`,
            altDialogue: '"Show me what you want."'
        };
    }

    function getSilenceOptions(ctx, locationPhrase, objectPhrase, tensionPhrase) {
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, currentLocation, sceneObjects, plot } = ctx;

        // ── Slice 3: plot-driven branches (fire BEFORE generic emotional-beat) ──
        if (plot) {
            // Recent near-miss — silence honors the alternate timeline the PC doesn't know
            if (plot.recentNearMiss) {
                return {
                    action: `Hold the silence in the spot where the other path almost forked.`,
                    dialogue: `(You don't say it. You don't know why.)`,
                    altAction: `Don't fill the pause. Whatever didn't happen is still in the air.`,
                    altDialogue: `(Something in you decides not to speak.)`
                };
            }
            // Committed truth NOT in climax window — silence holds the truth
            if (plot.committedTruth && !plot.committedTruth.revealFired && !plot.committedTruth.inClimaxWindow) {
                return {
                    action: `Let the silence carry what your words won't. ${liName} can feel the absence.`,
                    dialogue: `(The thing you almost said folds back into your chest.)`,
                    altAction: `Hold the truth in. Not forever — just not now.`,
                    altDialogue: `(You decide to say nothing. ${liName} notices anyway.)`
                };
            }
            // Recent narrative scar — silence around the scar topic
            if (plot.recentScars && plot.recentScars.length) {
                var scS = plot.recentScars[plot.recentScars.length - 1];
                return {
                    action: `${liName} drifts close to "${scS.target}". Don't take the bait. Let the silence steer them off.`,
                    dialogue: `(You change the subject without speaking.)`,
                    altAction: `Refuse to be drawn into the thing you've stopped touching.`,
                    altDialogue: `(Your stillness is the answer.)`
                };
            }
            // Heavy charge avoidance — silence as protective distance
            if (plot.chargeLean && plot.chargeLean.lead <= -4) {
                return {
                    action: `Hold the space empty. Don't let ${liName} fill the silence for you.`,
                    dialogue: `(You don't help. You don't soften it.)`,
                    altAction: `Let ${liName} stay uncertain. Your quiet is intentional.`,
                    altDialogue: `(The silence stretches because you keep it stretching.)`
                };
            }
        }

        if (isSetup || !liIntroduced) {
            return {
                action: 'Let the silence speak. Your stillness is a statement.',
                dialogue: '(The quiet holds meaning.)',
                altAction: 'Words would break this. Stay silent on purpose.',
                altDialogue: '(You let the moment stretch.)'
            };
        }

        // MISDIRECT through silence
        if (lastEmotionalBeat === 'conflict') {
            return {
                action: 'Refuse to fill the silence after the fight. Let it suffocate.',
                dialogue: '(Your silence is louder than any words.)',
                altAction: `Don't give ${liName} the satisfaction of a response.`,
                altDialogue: '(You say nothing. That is your answer.)'
            };
        }
        if (lastEmotionalBeat === 'intimacy') {
            return {
                action: 'No words could hold what just passed between you. Breathe together.',
                dialogue: '(The silence is sacred.)',
                altAction: 'Speaking would cheapen it. Stay wordless.',
                altDialogue: '(Your eyes say everything.)'
            };
        }
        if (tensionPhrase === 'unanswered question') {
            return {
                action: 'They asked. You don\'t answer. Let the silence be your reply.',
                dialogue: '(The question hangs. You let it.)',
                altAction: 'Your non-answer is deliberate. Hold it.',
                altDialogue: '(Some questions don\'t deserve words.)'
            };
        }

        // Object-based silence
        if (objectPhrase === 'window') {
            return {
                action: `Turn to the window. Let ${liName} wonder what you\'re thinking.`,
                dialogue: '(Your gaze says: follow me or don\'t.)',
                altAction: 'The window offers escape from conversation. Take it.',
                altDialogue: '(Silence and distance speak together.)'
            };
        }
        if (objectPhrase === 'drink' || objectPhrase === 'glass') {
            return {
                action: `Sip your drink instead of speaking. Make ${liName} break first.`,
                dialogue: '(The glass buys you time.)',
                altAction: 'Hide behind the ritual of drinking. Wait them out.',
                altDialogue: '(Actions louder than words.)'
            };
        }

        return {
            action: `Hold ${liName}\'s gaze without speaking. See who breaks first.`,
            dialogue: '(The air between you thickens.)',
            altAction: 'Your silence is a test. Will they fill it, or endure?',
            altDialogue: '(Neither of you speaks. Neither looks away.)'
        };
    }

    // Generate the deck with contextual awareness
    function buildFateDeck() {
        const state = window.state || {};
        let allContent = window.StoryPagination ? window.StoryPagination.getAllContent() : '';
        let storyText = (allContent || '').replace(/<[^>]*>/g, ' ');
        // Staged (cinegraphic) mode bypasses StoryPagination — the prose is
        // routed into the staged renderer's beat array via
        // _completeStagedSceneFromLiterary (app.js:103018), and pagination
        // stays empty. Without this fallback, extractSceneContext below
        // sees no text → confidence stays 0 → cards collapse to soft
        // fallbacks or isSetup templates that read as scene-blind.
        if ((!storyText || storyText.trim().length < 100) &&
            state && state._stagedActive && state._stagedActive.plan &&
            Array.isArray(state._stagedActive.plan.beats)) {
            storyText = state._stagedActive.plan.beats
                .map(function(b) { return (b && b.text) ? b.text : ''; })
                .filter(Boolean)
                .join(' ');
        }

        // INTIMATE CONTEXT: Use erotic deck base instead of standard deck
        const deckBase = isIntimateContextActive() ? INTIMATE_DECK_BASE : fateDeckBase;

        // Extract scene context once for all cards
        const sceneContext = extractSceneContext(storyText, state);

        // Track used phrases in this draw to prevent repetition
        const usedInThisDraw = [];

        return deckBase.map(baseCard => {
            const card = generateContextualCard(baseCard, sceneContext, usedInThisDraw);
            // Track what we generated to avoid repetition in same draw
            usedInThisDraw.push(card.action);
            usedInThisDraw.push(card.dialogue);
            return card;
        });
    }

    // Store phrases from last turn for non-repetition
    function recordLastTurnPhrases(options) {
        if (options && Array.isArray(options)) {
            lastTurnPhrases = options.flatMap(o => [o.action || '', o.dialogue || '']).filter(Boolean);
        }
    }

    const fateDeck = fateDeckBase;

    // --- Surgical glue: minimal shared helpers / guards ---
    // NOTE: These flags are now resettable via resetFateBindFlags() for rebind support
    let _commitHooksBound = false;
    let _inputsBound = false;
    let _allFlipped = false;
    let _pendingApplyTimer = null;

    // ═══════════════════════════════════════════════════════════════════════════
    // REBIND SUPPORT: Reset bind flags to allow re-initialization
    // ═══════════════════════════════════════════════════════════════════════════
    function resetFateBindFlags() {
        _commitHooksBound = false;
        _inputsBound = false;
        _allFlipped = false;
        if (_pendingApplyTimer) {
            clearTimeout(_pendingApplyTimer);
            _pendingApplyTimer = null;
        }
        // SAFETY: Clear pending sparkle timers to prevent stale emissions after navigation
        if (window.stopSparkleCycle) window.stopSparkleCycle();
        if (window.stopContinuousSparkles) window.stopContinuousSparkles();
        if (window.stopAllEmanations) window.stopAllEmanations();
        console.log('[FATE] Bind flags reset — ready for rebind');
    }
    window.resetFateBindFlags = resetFateBindFlags;

    function resolveUnlockCount(){
        // Highest priority: explicit override if app.js sets it
        if (window.state && typeof window.state.fateUnlockCount === 'number') {
            return Math.max(0, Math.min(5, window.state.fateUnlockCount));
        }

        const st = window.state || {};
        const access = st.access;

        // Subscribers always get the full deck.
        if (access === 'sub') return 5;

        // StoryPass holders have paid for the story-length tier → full deck.
        if (access === 'pass') return 5;

        // ── PURCHASED-FORTUNES UNLOCK ──
        // Any user who has ever bought Fortunes OR carries a positive paid
        // balance (purchased pack OR subscription Fortunes) earns the full
        // 5-card deck on every scene — INCLUDING free-tier Taste-mode scenes
        // where the per-scene cost is 0. Rationale: card-locking exists as
        // an upsell to non-payers; once the user has paid anything into the
        // system, the upsell pressure is misplaced and feels punitive.
        // Selecting Taste tier should not cost the user previously-earned
        // unlock benefits.
        if ((st.purchasedFortunes || 0) > 0) return 5;
        if ((st.subscriptionFortunes || 0) > 0) return 5;
        if (st.hasEverPurchased === true) return 5;

        // Per-scene paid users: if Fortune was spent to generate THIS scene,
        // the user earned access to the full deck. This is the authoritative
        // rule — "since I was charged 1F, all 5 cards should be unlocked."
        // Free-tier + Taste + under cap returns cost = 0 (truly free scene)
        // and falls through to the partial-deck upsell below.
        try {
            if (typeof window.getSceneFortuneCost === 'function') {
                const cost = window.getSceneFortuneCost();
                if (cost > 0) return 5;
            }
        } catch (_) {}

        // User spec 2026-05-25: the 5 archetype Fate cards are NEVER locked
        // or paywalled — they are free to preview/select in every tier and
        // mode (literary / CG / Taste / OAS). The previous free-tier "partial
        // deck" upsell (3 of 5, with locked cards opening the paywall on click)
        // is removed. Monetization gating lives ONLY on Petition + Tempt Fate
        // (the premium deck-summon cards), handled separately. Every path
        // returns the full deck of 5 so no archetype card is ever `.locked`
        // and the locked-card→paywall branch never fires for these cards.
        return 5;
    }

    function flipAllCards(mount){
        _allFlipped = true;
        const cards = mount.querySelectorAll('.fate-card:not(.petition-fate-card)');
        cards.forEach(c => c.classList.add('flipped'));
        if (window.playUISound) window.playUISound('card_flip');
    }

    function clearPendingTimer(){
        if (_pendingApplyTimer) {
            clearTimeout(_pendingApplyTimer);
            _pendingApplyTimer = null;
        }
    }

    // Firefly emanation — gentle particles drifting from an element
    var _activeEmanations = [];

    function stopAllEmanations() {
        _activeEmanations.forEach(function (e) {
            clearInterval(e.interval);
            clearTimeout(e.stopTimer);
            clearTimeout(e.cleanupTimer);
            // Fade out overlay gracefully instead of instant removal
            if (e.overlay.parentNode) {
                e.overlay.style.transition = 'opacity 0.5s ease-out';
                e.overlay.style.opacity = '0';
                setTimeout(function() {
                    if (e.overlay.parentNode) e.overlay.remove();
                }, 500);
            }
        });
        _activeEmanations = [];
    }

    function startFireflyEmanation(anchorEl) {
        // ═══════════════════════════════════════════════════════════════════
        // ANCHOR VALIDATION: Abort if anchor is missing or has no dimensions
        // Prevents sparkles emitting from (0,0) when element is stale/removed
        // ═══════════════════════════════════════════════════════════════════
        if (!anchorEl || typeof anchorEl.getBoundingClientRect !== 'function') {
            return; // No anchor — abort silently
        }
        var rect = anchorEl.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            return; // Invalid dimensions — abort silently
        }

        // ═══════════════════════════════════════════════════════════════════
        // PERIMETER POSITIONING: Overlay extends 16px beyond element edges
        // Sparkles spawn on the OUTSIDE border, not inside content
        // ═══════════════════════════════════════════════════════════════════
        var PERIMETER_OFFSET = 8;
        var overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;' +
            'left:' + (rect.left - PERIMETER_OFFSET) + 'px;' +
            'top:' + (rect.top - PERIMETER_OFFSET) + 'px;' +
            'width:' + (rect.width + PERIMETER_OFFSET * 2) + 'px;' +
            'height:' + (rect.height + PERIMETER_OFFSET * 2) + 'px;' +
            'pointer-events:none;' +
            'z-index:2500;' /* Below modals (z-index: 3000+) */ +
            'overflow:visible;';
        document.body.appendChild(overlay);

        var VISIBLE_DURATION = 3000;  // 3s visible
        var FADE_DURATION = 2000;     // 2s fade-out (AUTHORITATIVE: no hard cut)
        var emanDuration = 7000;

        var eman = { overlay: overlay, interval: null, stopTimer: null, cleanupTimer: null };
        _activeEmanations.push(eman);

        // Helper: Generate perimeter position (on border, not inside)
        // Returns { x, y, edge } where edge indicates spawn location
        function getPerimeterPosition(w, h) {
            var edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
            var x, y;
            switch (edge) {
                case 0: // Top edge
                    x = Math.random() * w;
                    y = -4 + Math.random() * 8;
                    break;
                case 1: // Right edge
                    x = w - 4 + Math.random() * 8;
                    y = Math.random() * h;
                    break;
                case 2: // Bottom edge
                    x = Math.random() * w;
                    y = h - 4 + Math.random() * 8;
                    break;
                case 3: // Left edge
                    x = -4 + Math.random() * 8;
                    y = Math.random() * h;
                    break;
            }
            return { x: x, y: y, edge: edge };
        }

        // Helper: Calculate radially outward velocity based on spawn edge
        // Particles burst gently away from element into surrounding space
        function getOutwardVelocity(edge) {
            var baseSpeed = 15 + Math.random() * 25; // Velocity magnitude with randomness
            var spread = (Math.random() - 0.5) * 20; // Cross-axis spread for scattered feel
            var dx, dy;
            switch (edge) {
                case 0: // Top edge → emit upward
                    dx = spread;
                    dy = -baseSpeed;
                    break;
                case 1: // Right edge → emit rightward
                    dx = baseSpeed;
                    dy = spread;
                    break;
                case 2: // Bottom edge → emit downward
                    dx = spread;
                    dy = baseSpeed;
                    break;
                case 3: // Left edge → emit leftward
                    dx = -baseSpeed;
                    dy = spread;
                    break;
            }
            return { dx: dx, dy: dy };
        }

        eman.interval = setInterval(function () {
            var ct = 3 + Math.floor(Math.random() * 3);
            var overlayW = rect.width + PERIMETER_OFFSET * 2;
            var overlayH = rect.height + PERIMETER_OFFSET * 2;

            for (var j = 0; j < ct; j++) {
                var size = 3 + Math.random() * 4;
                var pos = getPerimeterPosition(overlayW, overlayH);
                var vel = getOutwardVelocity(pos.edge); // Radially outward based on spawn edge
                var dx = vel.dx;
                var dy = vel.dy;
                var peakOpacity = 0.5 + Math.random() * 0.4;

                var p = document.createElement('div');
                p.style.cssText =
                    'position:absolute;' +
                    'left:' + pos.x + 'px;' +
                    'top:' + pos.y + 'px;' +
                    'width:' + size + 'px;' +
                    'height:' + size + 'px;' +
                    'border-radius:50%;' +
                    'background:radial-gradient(circle,rgba(255,235,150,0.95),rgba(255,215,0,0.6));' +
                    'box-shadow:0 0 8px rgba(255,215,0,0.7);' +
                    'opacity:0;' +
                    'transition:opacity ' + FADE_DURATION + 'ms ease-out;' +
                    'animation:fate-firefly ' + VISIBLE_DURATION + 'ms ease-in-out forwards;' +
                    '--ff-dx:' + dx + 'px;' +
                    '--ff-dy:' + dy + 'px;' +
                    '--ff-opacity:' + peakOpacity + ';';
                overlay.appendChild(p);

                // ═══════════════════════════════════════════════════════════════
                // FADE-OUT: After 3s visible, fade to 0 over 2s, then remove
                // Total particle lifetime: 5s (no hard cut)
                // ═══════════════════════════════════════════════════════════════
                (function (el) {
                    // Start fade after visible duration
                    setTimeout(function () {
                        el.style.opacity = '0';
                    }, VISIBLE_DURATION);
                    // Remove after fade completes
                    setTimeout(function () {
                        if (el.parentNode) el.remove();
                    }, VISIBLE_DURATION + FADE_DURATION + 100);
                })(p);
            }
        }, 120);

        eman.stopTimer = setTimeout(function () {
            clearInterval(eman.interval);
            // Allow remaining particles to fade out naturally
            eman.cleanupTimer = setTimeout(function () {
                if (eman.overlay.parentNode) eman.overlay.remove();
                var idx = _activeEmanations.indexOf(eman);
                if (idx !== -1) _activeEmanations.splice(idx, 1);
            }, VISIBLE_DURATION + FADE_DURATION + 500);
        }, emanDuration);
    }

    // Golden flow animation from card to inputs - continuous gentle stream
    function triggerGoldenFlow(fromEl, toEl) {
        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // ANCHOR VALIDATION: Abort if either element has no dimensions
        if (!fromRect || fromRect.width === 0 || fromRect.height === 0) return;
        if (!toRect || toRect.width === 0 || toRect.height === 0) return;

        const startX = fromRect.left + fromRect.width / 2;
        const startY = fromRect.top + fromRect.height / 2;
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + toRect.height / 2;

        const container = document.createElement('div');
        container.className = 'golden-flow-container';
        document.body.appendChild(container);

        const particleCount = 12;
        const streamDuration = 800;
        const particleDuration = 600;

        // Create particles with staggered starts for continuous flow effect
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'golden-flow-particle';
            container.appendChild(particle);

            const delay = (i / particleCount) * streamDuration;

            setTimeout(() => {
                const pStartTime = performance.now();

                function animateParticle(currentTime) {
                    const elapsed = currentTime - pStartTime;
                    const progress = Math.min(elapsed / particleDuration, 1);

                    // Gentle ease-in-out
                    const eased = progress < 0.5
                        ? 2 * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                    // Slight wave for organic feel
                    const wave = Math.sin(progress * Math.PI * 2) * 8;

                    const currentX = startX + (endX - startX) * eased;
                    const currentY = startY + (endY - startY) * eased + wave;

                    particle.style.left = currentX + 'px';
                    particle.style.top = currentY + 'px';

                    // Fade in/out for continuous stream look
                    if (progress < 0.2) {
                        particle.style.opacity = progress / 0.2 * 0.7;
                    } else if (progress > 0.8) {
                        particle.style.opacity = (1 - progress) / 0.2 * 0.7;
                    } else {
                        particle.style.opacity = 0.7;
                    }

                    if (progress < 1) {
                        requestAnimationFrame(animateParticle);
                    } else {
                        particle.remove();
                    }
                }

                requestAnimationFrame(animateParticle);
            }, delay);
        }

        // Remove container after all particles done
        setTimeout(() => container.remove(), streamDuration + particleDuration + 100);
    }

// ═══════════════════════════════════════════════════════════════════════════
// FATE CARD FLIP FIX — SELECTION DETERMINES FACE (AUTHORITATIVE)
// ═══════════════════════════════════════════════════════════════════════════
// CEREMONIAL FATE CARD SELECTION — AUTHORITATIVE
// ═══════════════════════════════════════════════════════════════════════════
// - Group flip is triggered by PHASE change (via flipAllCards), not selection
// - Selection ONLY adds .selected class — no flip logic here
// - Sparkle cycle targets selected card AND active Say/Do boxes
// ═══════════════════════════════════════════════════════════════════════════
function setSelectedState(mount, selectedCardEl){
    const cards = mount.querySelectorAll('.fate-card');

    // CEREMONIAL FIX: Selection only sets .selected class
    // Flip state is controlled by group flip (flipAllCards), not per-card selection
    cards.forEach(c => {
        c.classList.remove('selected');
    });

    if (selectedCardEl) {
        selectedCardEl.classList.add('selected');

        // CEREMONIAL GROUP FLIP: First selection triggers group reveal
        // All cards flip together on first interaction, not individually
        flipAllCards(mount);
    }

    // Track selection in state without changing shape elsewhere
    if (window.state) {
        const idx = Number(
            selectedCardEl &&
            selectedCardEl.dataset &&
            selectedCardEl.dataset.cardIndex
        );
        if (!Number.isNaN(idx)) {
            window.state.fateSelectedIndex = idx;
            // SPECULATIVE PRELOAD: Invalidate on fate card change
            if (typeof window.invalidateSpeculativeScene === 'function') {
                window.invalidateSpeculativeScene();
            }
        }
    }

    // 🔑 SPARKLE WIRING — Sparkles on card + Say/Do boxes
    if (selectedCardEl) {
        startContinuousSparkles();
    } else {
        stopContinuousSparkles();
    }
}

    // Sparkle disintegration for a card — overlay-based, no card CSS animation
    function disintegrateCard(cardEl) {
        var rect = cardEl.getBoundingClientRect();
        cardEl.style.visibility = 'hidden';

        var overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;' +
            'left:' + rect.left + 'px;' +
            'top:' + rect.top + 'px;' +
            'width:' + rect.width + 'px;' +
            'height:' + rect.height + 'px;' +
            'pointer-events:none;' +
            'z-index:2500;' /* Below modals (z-index: 3000+) */ +
            'overflow:visible;';
        document.body.appendChild(overlay);

        var count = 18;
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
            var dist = 20 + Math.random() * 35;
            var size = 2 + Math.random() * 3;
            var dur = 560 + Math.random() * 350;
            var p = document.createElement('div');
            p.style.cssText =
                'position:absolute;' +
                'left:' + (Math.random() * 100) + '%;' +
                'top:' + (Math.random() * 100) + '%;' +
                'width:' + size + 'px;' +
                'height:' + size + 'px;' +
                'border-radius:50%;' +
                'background:radial-gradient(circle,rgba(255,235,150,0.9),rgba(255,215,0,0.5));' +
                'box-shadow:0 0 6px rgba(255,215,0,0.6);' +
                'opacity:1;' +
                'animation:fate-disintegrate ' + dur + 'ms ease-in-out forwards;' +
                '--dis-x:' + (Math.cos(angle) * dist) + 'px;' +
                '--dis-y:' + (Math.sin(angle) * dist) + 'px;';
            overlay.appendChild(p);
        }

        setTimeout(function () { overlay.remove(); }, 1000);
    }

    function commitFateSelection(mount){
        // Commit means: lock choice, disintegrate unchosen, disable further selection
        if (!window.state) return;
        if (window.state.fateCommitted) return;

        const selectedIdx = typeof window.state.fateSelectedIndex === 'number' ? window.state.fateSelectedIndex : -1;
        if (selectedIdx < 0) return; // nothing selected -> nothing to commit

        window.state.fateCommitted = true;

        // Record preference signal for selected fate card (session-scoped, deterministic)
        if (window.StoryboundOrchestration && window.StoryboundOrchestration.recordPreferenceSignal) {
            const selectedCard = window.state.fateOptions && window.state.fateOptions[selectedIdx];
            if (selectedCard && selectedCard.id) {
                window.StoryboundOrchestration.recordPreferenceSignal('FATE_CARD_SELECTED', {
                    cardId: selectedCard.id
                });
            }
        }

        const cards = mount.querySelectorAll('.fate-card');
        cards.forEach((cardEl) => {
            const idx = Number(cardEl.dataset && cardEl.dataset.cardIndex);
            if (idx !== selectedIdx) {
                // Sparkle disintegration instead of poof
                disintegrateCard(cardEl);
            } else {
                // Keep chosen visible; disable further clicking
                cardEl.classList.add('chosen');
            }

            cardEl.style.pointerEvents = 'none';
        });

        clearPendingTimer();
    }

    function bindCommitHooks(mount){
        if (_commitHooksBound) return;
        _commitHooksBound = true;

        // Best-effort submit bindings without assuming your HTML structure.
        // If these elements don't exist, nothing happens.
        const tryBindClick = (id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('click', () => commitFateSelection(mount), { passive: true });
        };

        // Common IDs across builds (safe no-op if missing). GN reader's
        // submit button is gnSubmitBtn — without it, GN turn-submission
        // wouldn't trigger the chosen-card sparkle/disintegrate commit.
        ['submitBtn','gnSubmitBtn','sendBtn','submitTurn','turnSubmit','submit'].forEach(tryBindClick);

        // If there's a form, committing on submit is also reasonable and non-invasive.
        const forms = [];
        const f1 = document.getElementById('turnForm');
        if (f1) forms.push(f1);
        // Bind any parent form of actionInput if present
        const act = document.getElementById('actionInput');
        if (act && act.form) forms.push(act.form);

        // Deduplicate and bind
        [...new Set(forms)].forEach(form => {
            form.addEventListener('submit', () => commitFateSelection(mount), { passive: true });
        });
    }

    function bindInputCommit(mount){
        if (_inputsBound) return;
        _inputsBound = true;

        // Bind to BOTH literary and GN textareas — whichever pair exists
        // will fire focus/input events when the user starts editing.
        // Previously only literary IDs were bound, so GN-mode edits never
        // committed the fate selection (the chosen card stayed clickable
        // and the disintegrate animation didn't fire).
        const actInputs = [
            document.getElementById('actionInput'),
            document.getElementById('gnActionInput')
        ].filter(Boolean);
        const diaInputs = [
            document.getElementById('dialogueInput'),
            document.getElementById('gnDialogueInput')
        ].filter(Boolean);

        const maybeCommitOnEdit = () => {
            if (!window.state) return;
            if (window.state.fateCommitted) return;
            // Only commit if a card has been selected
            if (typeof window.state.fateSelectedIndex !== 'number') return;
            commitFateSelection(mount);
        };

        // "Once the player clicks into the populated text boxes…"
        // Focus counts as "click into". Input counts as editing.
        [...actInputs, ...diaInputs].forEach(el => {
            el.addEventListener('focus', maybeCommitOnEdit);
            el.addEventListener('input', maybeCommitOnEdit);
        });
    }

    window.initCards = function() {
        const mount = document.getElementById('cardMount');
        if(!mount) return;

        // Reset if we need a clean slate or it's empty
        mount.innerHTML = '';

        // Reset per-hand runtime flags
        _allFlipped = false;
        clearPendingTimer();

        // Create 5 placeholders (backs only)
        for(let i=0; i<5; i++){
            const card = document.createElement('div');
            card.className = 'fate-card';
            card.innerHTML = `
                <div class="inner">
                    <div class="front"><h3>Fate</h3></div>
                    <div class="back"></div>
                </div>
            `;
            mount.appendChild(card);
            if (window.applyCardGleam) window.applyCardGleam(card);
        }
    };

    window.stopAllEmanations = stopAllEmanations;
    window.startFireflyEmanation = startFireflyEmanation;
    window.triggerGoldenFlow = triggerGoldenFlow;

    window.dealFateCards = function(opts) {
        opts = opts || {};
        const mount = document.getElementById('cardMount');
        if(!mount) return;

        // Safety: Ensure state exists before trying to write to it
        if (!window.state) {
            console.warn("State not ready for dealing cards.");
            return;
        }

        // ── PER-SCENE RE-ROLL GUARD (added 2026-05-17) ──────────────────
        // If cards have already been dealt for this turnCount AND the call
        // didn't explicitly opt into a redeal (opts.force === true), reuse
        // the existing state.fateOptions. Prevents re-clicks / re-mounts
        // from accidentally re-rolling card suggestions mid-scene.
        // Resets that bypass this: explicit force flag, OR new turn (different
        // turnCount), OR explicit reset via resetFateBindFlags-adjacent paths.
        const currentTurn = window.state.turnCount || 0;
        // SCENE FINGERPRINT: turnCount alone is NOT a reliable per-scene key —
        // it can repeat across consecutive scenes in some flows (Scene 1 vs the
        // first turn share a value), which made this guard no-op and re-serve the
        // PRIOR scene's EXACT cards (the "Scene 2 shows Scene 1's options" bug).
        // Add the reader PAGE INDEX: each scene adds exactly one page, while
        // mid-scene whispers/omens append to the CURRENT page — so the page index
        // is stable within a scene (re-clicks/re-mounts still no-op) but always
        // advances on a real scene change (forcing a fresh deal). CG/staged mode
        // bypasses pagination (count 0) → falls back to turnCount-only behavior.
        var _pageIdx = 0;
        try { _pageIdx = (window.StoryPagination && window.StoryPagination.getPageCount) ? window.StoryPagination.getPageCount() : 0; } catch (_) {}
        const _sceneKey = currentTurn + ':' + _pageIdx;
        if (!opts.force
            && window.state.fateOptions
            && Array.isArray(window.state.fateOptions)
            && window.state.fateOptions.length
            && window.state._fateOptionsSceneKey === _sceneKey) {
            try { console.log('[FATE] dealFateCards no-op — already dealt for scene ' + _sceneKey + ' (use opts.force=true to redeal)'); } catch (_) {}
            return;
        }

        // Record last turn's phrases for non-repetition before resetting
        if (window.state.fateOptions) {
            recordLastTurnPhrases(window.state.fateOptions);
        }

        // Reset per-hand state (surgical: only fate-related fields)
        window.state.fateOptions = null;
        window.state.fateSelectedIndex = -1;
        window.state.fateCommitted = false;
        window.state._fateOptionsTurnCount = currentTurn;
        window.state._fateOptionsSceneKey = _sceneKey;

        // SPECULATIVE PRELOAD: Invalidate when new cards dealt
        if (typeof window.invalidateSpeculativeScene === 'function') {
            window.invalidateSpeculativeScene();
        }

        // Reset per-hand runtime flags
        _allFlipped = false;
        clearPendingTimer();

        const unlockCount = resolveUnlockCount();

        // Build contextual deck and shuffle
        const contextualDeck = buildFateDeck();
        const shuffled = [...contextualDeck].sort(() => 0.5 - Math.random());
        // Select top 5 (which is all of them, just randomized order)
        const selected = shuffled.slice(0, 5);

        // Write to Global State
        window.state.fateOptions = selected;

        mount.innerHTML = '';

        selected.forEach((data, i) => {
            const card = document.createElement('div');
            card.className = 'fate-card';
            card.dataset.cardIndex = String(i);

            // Lock logic: only first N (by position after shuffle) are selectable.
            // Visible but greyed/locked for the rest.
            const isLocked = (i >= unlockCount);
            if (isLocked) card.classList.add('locked');

            // Per-card art: capitalize first letter of id for filename
            const artName = data.id.charAt(0).toUpperCase() + data.id.slice(1);
            const artUrl = `/assets/card-art/cards/Tarot-Gold-front-${artName}.png`;

            card.innerHTML = `
                <div class="inner">
                    <div class="front"><h3>Fate</h3></div>
                    <div class="back" style="background-image: url('${artUrl}');">
                        <h3>${data.title}</h3>
                        <p>${data.desc}</p>
                    </div>
                </div>
            `;

            card.onclick = () => {
                // If already committed, ignore all clicks
                if (window.state && window.state.fateCommitted) return;

                // Block clicks while paywall is visible
                const payModal = document.getElementById('payModal');
                if (payModal && !payModal.classList.contains('hidden')) return;

                // FLIP FIX: Selection determines face — flipAllCards removed
                // setSelectedState now handles flip state per-card

                // Locked cards trigger paywall and do not select
                // NOTE: Subscribers should never hit this — entitlement system unlocks cards for them
                // showPaywall has subscription guard as backup
                if(card.classList.contains('locked')) {
                    const st = window.state || {};
                    // SUBSCRIPTION SHORT-CIRCUIT: Subscribers bypass paywall
                    if (st.subscribed) {
                        // Should not happen — card should be unlocked for subscribers
                        console.warn('[FATECARDS] Locked card clicked by subscriber — entitlement issue');
                        return;
                    }
                    if(window.showPaywall) {
                        // CANONICAL: Use story metadata for paywall mode (persisted, immutable per-story)
                        const mode = typeof window.getPaywallMode === 'function' ? window.getPaywallMode() : 'sub_only';
                        window.showPaywall(mode);
                    }
                    return;
                }

                // Selecting a different unlocked card wipes/replaces suggestions
                setSelectedState(mount, card);

                // Mark that the player has now used a Tarot card at least
                // once — persisted across stories. Used by the Scene 1
                // Tarot-decision-participant injection to stop showing
                // the Tarot onboarding directive after first real use.
                // Persistence via localStorage (matches the per-field
                // pattern used elsewhere: no monolithic save-state).
                try {
                    if (window.state) window.state._tarotCardClickedEver = true;
                    localStorage.setItem('sb_tarot_clicked_ever', '1');
                } catch (_) {}

                // STORY GRAVITY — tag the selected card's contribution to
                // the outcome/relationship axis. Card id lives in `data`
                // (from fateOptions selection). Mapping:
                //   temptation, reversal, twist, break, push → outcome
                //   boundary, confession, silence, hold, tether → relationship
                // Cards outside this set contribute 0 (neutral). Lightweight
                // keyword match on id/name — no new subsystem.
                try {
                    var _gs = window.state && window.state.gravityScore;
                    if (_gs && data) {
                        var _tag = String((data.id || data.name || '')).toLowerCase();
                        if (/tempt|revers|twist|break|push|confront|strike/.test(_tag))      _gs.outcome      += 1;
                        else if (/bound|confess|silenc|hold|tether|linger|reveal/.test(_tag)) _gs.relationship += /silenc/.test(_tag) ? 0.5 : 1;
                    }
                } catch (_) {}

                clearPendingTimer();

                // Cancel any prior sparkle cycle, then start new cycle
                stopSparkleCycle();

                // Trigger golden flow animations to inputs.
                // Mode-aware lookup so GN-mode fate clicks fill the GN
                // textareas, not the (non-existent) literary ones.
                const _inputs = (typeof window._getActiveTurnInputs === 'function')
                    ? window._getActiveTurnInputs()
                    : { actInput: document.getElementById('actionInput'),
                        diaInput: document.getElementById('dialogueInput') };
                const actInput = _inputs.actInput;
                const diaInput = _inputs.diaInput;

                // Start sparkle cycle (3s ON, 2s OFF) on card + inputs
                startSparkleCycle(data.id, card, actInput, diaInput);
                if (actInput) triggerGoldenFlow(card, actInput);
                setTimeout(() => {
                    if (diaInput) triggerGoldenFlow(card, diaInput);
                }, 150); // Slight stagger for elegance

                // ═══════════════════════════════════════════════════════════════
                // CONTEXTUAL PREVIEW GENERATION — Scene-aware Say/Do suggestions
                // Cancel any prior preview, then generate new contextual preview
                // after animation delay (match existing 600ms timing)
                // ═══════════════════════════════════════════════════════════════
                if (typeof window.cancelFatePreview === 'function') {
                    window.cancelFatePreview();
                }
                _pendingApplyTimer = setTimeout(() => {
                    // Use contextual preview if available, fallback to card defaults
                    if (typeof window.generateFatePreview === 'function') {
                        window.generateFatePreview(data);
                    } else {
                        if(actInput) actInput.value = data.action;
                        if(diaInput) diaInput.value = data.dialogue;
                    }
                }, 600);

                // Standard fate cards: flip-all only, no per-card zoom
            };

            mount.appendChild(card);
        });

        // ── Auto-flip: reveal cards 2s after they scroll into view ──
        if ('IntersectionObserver' in window) {
            const flipObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !_allFlipped) {
                        setTimeout(() => {
                            if (!_allFlipped) flipAllCards(mount);
                        }, 2000);
                        flipObserver.disconnect();
                    }
                });
            }, { threshold: 0.3 });
            flipObserver.observe(mount);
        }

        // ── Petition & Tempt cards → separate "Take Fate In Your Own Hands" container ──
        const specialMount = document.getElementById('fateSpecialCards') || mount;
        specialMount.innerHTML = '';

        // Petition Fate card — always visible, always unlocked
        // First click flips (back→front), second click opens zoom
        const petitionCard = document.createElement('div');
        petitionCard.className = 'fate-card petition-fate-card';
        petitionCard.innerHTML = `
            <div class="inner">
                <div class="front" style="background:url('/assets/card-art/cards/Tarot-Gold-PetitionFate-back.png') center/cover no-repeat, #111;"></div>
                <div class="back" style="background-image:url('/assets/card-art/cards/Tarot-Gold-PetitionFate-front.png');"></div>
            </div>
        `;
        // Petition Fate: hover flips, mouseleave unflips, click zooms
        petitionCard.addEventListener('mouseenter', () => {
            if (!petitionCard.classList.contains('flipped')) {
                petitionCard.classList.add('flipped');
                if (window.playUISound) window.playUISound('card_flip');
            }
        });
        petitionCard.addEventListener('mouseleave', () => {
            if (!petitionCard.classList.contains('petition-zoomed')) {
                petitionCard.classList.remove('flipped');
            }
        });
        petitionCard.onclick = () => {
            if (document.querySelector('.design-mode-badge')) return;
            if (!petitionCard.classList.contains('flipped')) petitionCard.classList.add('flipped');
            if (typeof window.openPetitionZoom === 'function') window.openPetitionZoom(petitionCard);
        };
        specialMount.appendChild(petitionCard);

        // Tempt Fate card
        const temptCard = document.createElement('div');
        temptCard.className = 'fate-card tempt-fate-card';
        temptCard.innerHTML = `
            <div class="inner">
                <div class="front" style="background:url('/assets/card-art/cards/Tarot-RED-back-TemptFate.png') center/cover no-repeat, #111;"></div>
                <div class="back" style="background-image:url('/assets/card-art/cards/Tarot-RED-front-TemptFate.png?v=2');"></div>
            </div>
        `;
        // Tempt Fate: hover flips, mouseleave unflips, click zooms
        // Electricity is always on (both faces)
        temptCard.addEventListener('mouseenter', () => {
            if (!temptCard.classList.contains('flipped')) {
                temptCard.classList.add('flipped');
                if (window.playUISound) window.playUISound('card_flip');
            }
        });
        temptCard.addEventListener('mouseleave', () => {
            if (!temptCard.classList.contains('tempt-zoomed')) {
                temptCard.classList.remove('flipped');
            }
        });
        temptCard.onclick = () => {
            if (document.querySelector('.design-mode-badge')) return;
            if (!temptCard.classList.contains('flipped')) temptCard.classList.add('flipped');
            if (typeof window.openTemptZoom === 'function') window.openTemptZoom();
        };
        specialMount.appendChild(temptCard);
        // Start electricity on both faces — always running
        if (window._startTemptElectricity) window._startTemptElectricity(temptCard);
        // FIX D — Fate card gating: apply locked state based on current turnCount
        // so Petition + Tempt read as "not yet wakeable" through Scenes 1-2.
        if (typeof window._syncFateCardLockState === 'function') window._syncFateCardLockState();

        // Bind commitment triggers once (safe no-op if elements missing)
        bindCommitHooks(mount);
        bindInputCommit(mount);

        // Apply gleam effect to all fate cards (both main grid and special row)
        if (window.applyCardGleam) {
            mount.querySelectorAll('.fate-card').forEach(window.applyCardGleam);
            specialMount.querySelectorAll('.fate-card').forEach(window.applyCardGleam);
        }

        console.log('[FATE] dealFateCards complete — cards bound');
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // CENTRALIZED FATE CARD INITIALIZATION — IDEMPOTENT REBIND
    // ═══════════════════════════════════════════════════════════════════════════
    // This function MUST be called on every reader mount to ensure:
    // - Click handlers are attached
    // - Flip animations work
    // - Sparkle/firefly/glow FX work
    //
    // Safe to call multiple times — resets bind flags before rebinding.
    // ═══════════════════════════════════════════════════════════════════════════
    window.initFateCards = function() {
        console.log('[FATE] initFateCards called');

        const mount = document.getElementById('cardMount');
        if (!mount) {
            console.log('[FATE] No cardMount found — skipping');
            return;
        }

        // Check if cards already exist with handlers
        const existingCards = mount.querySelectorAll('.fate-card');
        const hasCards = existingCards.length > 0;

        // Reset bind flags to ensure fresh bindings
        resetFateBindFlags();

        // Verify FX functions are globally accessible
        const fxStatus = {
            startSparkleCycle: typeof window.startSparkleCycle === 'function',
            stopSparkleCycle: typeof window.stopSparkleCycle === 'function',
            startFireflyEmanation: typeof window.startFireflyEmanation === 'function',
            stopAllEmanations: typeof window.stopAllEmanations === 'function',
            triggerGoldenFlow: typeof window.triggerGoldenFlow === 'function',
            startContinuousSparkles: typeof window.startContinuousSparkles === 'function',
            stopContinuousSparkles: typeof window.stopContinuousSparkles === 'function'
        };
        console.log('[FATE] FX functions status:', fxStatus);

        // If cards exist, rebind handlers without clearing DOM
        if (hasCards && window.state && window.state.fateOptions) {
            console.log('[FATE] Rebinding existing cards');
            rebindExistingFateCards(mount);
        } else if (window.dealFateCards) {
            // No cards or no state — deal fresh
            console.log('[FATE] Dealing fresh cards');
            window.dealFateCards();
        }

        console.log('[FATE] initFateCards bound');
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // REBIND EXISTING FATE CARDS — Attach handlers without recreating DOM
    // ═══════════════════════════════════════════════════════════════════════════
    function rebindExistingFateCards(mount) {
        const cards = mount.querySelectorAll('.fate-card');
        const fateOptions = window.state.fateOptions || [];

        cards.forEach((card, i) => {
            const data = fateOptions[i];
            if (!data) return;

            // Remove old handler and add new one
            card.onclick = () => {
                console.log('[FATE] card clicked:', data.id);

                // If already committed, ignore all clicks
                if (window.state && window.state.fateCommitted) return;

                // Block clicks while paywall is visible
                const payModal = document.getElementById('payModal');
                if (payModal && !payModal.classList.contains('hidden')) return;

                // FLIP FIX: Selection determines face — flipAllCards removed
                // setSelectedState now handles flip state per-card

                // Locked cards trigger paywall and do not select
                if (card.classList.contains('locked')) {
                    const st = window.state || {};
                    if (st.subscribed) {
                        console.warn('[FATECARDS] Locked card clicked by subscriber — entitlement issue');
                        return;
                    }
                    if (window.showPaywall) {
                        // CANONICAL: Use story metadata for paywall mode (persisted, immutable per-story)
                        const mode = typeof window.getPaywallMode === 'function' ? window.getPaywallMode() : 'sub_only';
                        window.showPaywall(mode);
                    }
                    return;
                }

                // Selecting a different unlocked card wipes/replaces suggestions
                setSelectedState(mount, card);
                clearPendingTimer();

                // Cancel any prior sparkle cycle, then start new cycle
                if (window.stopSparkleCycle) window.stopSparkleCycle();

                // Trigger golden flow animations to inputs.
                // Mode-aware lookup so GN-mode fate clicks fill the GN
                // textareas, not the (non-existent) literary ones.
                const _inputs = (typeof window._getActiveTurnInputs === 'function')
                    ? window._getActiveTurnInputs()
                    : { actInput: document.getElementById('actionInput'),
                        diaInput: document.getElementById('dialogueInput') };
                const actInput = _inputs.actInput;
                const diaInput = _inputs.diaInput;

                // Start sparkle cycle (3s ON, 2s OFF) on card + inputs
                console.log('[FATE] sparkle FX triggered');
                if (window.startSparkleCycle) window.startSparkleCycle(data.id, card, actInput, diaInput);
                if (actInput && window.triggerGoldenFlow) window.triggerGoldenFlow(card, actInput);
                setTimeout(() => {
                    if (diaInput && window.triggerGoldenFlow) window.triggerGoldenFlow(card, diaInput);
                }, 150);

                // ═══════════════════════════════════════════════════════════════
                // CONTEXTUAL PREVIEW GENERATION — Scene-aware Say/Do suggestions
                // ═══════════════════════════════════════════════════════════════
                if (typeof window.cancelFatePreview === 'function') {
                    window.cancelFatePreview();
                }
                _pendingApplyTimer = setTimeout(() => {
                    if (typeof window.generateFatePreview === 'function') {
                        window.generateFatePreview(data);
                    } else {
                        if (actInput) actInput.value = data.action;
                        if (diaInput) diaInput.value = data.dialogue;
                    }
                }, 600);

                // Standard fate cards: flip-all only, no per-card zoom
            };
        });

        // Rebind Petition Fate card (now in #fateSpecialCards, not in mount)
        const specialMount = document.getElementById('fateSpecialCards');
        const petitionCard = (specialMount || mount).querySelector('.petition-fate-card');
        if (petitionCard) {
            // Reset flipped state on rebind — cards must start face-down
            petitionCard.classList.remove('flipped');
            // Hover flips, mouseleave unflips, click zooms
            petitionCard.onmouseenter = () => {
                if (!petitionCard.classList.contains('flipped')) {
                    petitionCard.classList.add('flipped');
                    if (window.playUISound) window.playUISound('card_flip');
                }
            };
            petitionCard.onmouseleave = () => {
                if (!petitionCard.classList.contains('petition-zoomed')) {
                    petitionCard.classList.remove('flipped');
                }
            };
            petitionCard.onclick = () => {
                if (document.querySelector('.design-mode-badge')) return;
                if (!petitionCard.classList.contains('flipped')) petitionCard.classList.add('flipped');
                if (typeof window.openPetitionZoom === 'function') window.openPetitionZoom(petitionCard);
            };
        }

        // Rebind Tempt Fate card (now in #fateSpecialCards)
        const temptCard = (specialMount || mount).querySelector('.tempt-fate-card');
        if (temptCard) {
            // Reset flipped state on rebind — cards must start face-down
            temptCard.classList.remove('flipped');
            // Hover flips, mouseleave unflips, click zooms
            temptCard.onmouseenter = () => {
                if (!temptCard.classList.contains('flipped')) {
                    temptCard.classList.add('flipped');
                    if (window.playUISound) window.playUISound('card_flip');
                }
            };
            temptCard.onmouseleave = () => {
                if (!temptCard.classList.contains('tempt-zoomed')) {
                    temptCard.classList.remove('flipped');
                }
            };
            temptCard.onclick = () => {
                if (document.querySelector('.design-mode-badge')) return;
                if (!temptCard.classList.contains('flipped')) temptCard.classList.add('flipped');
                if (typeof window.openTemptZoom === 'function') window.openTemptZoom();
            };
            // Restart electricity on rebind
            if (window._startTemptElectricity) window._startTemptElectricity(temptCard);
        }

        // Rebind commit hooks
        bindCommitHooks(mount);
        bindInputCommit(mount);

        console.log('[FATE] Existing cards rebound:', cards.length);
    }

})(window);

// ═══════════════════════════════════════════════════════════════════════════
// DOM READY INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    console.log('[FATE] DOMContentLoaded — initializing');
    if (typeof window.initCards === 'function') {
        window.initCards();
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// STORYBEAU AUTHORITY — DOCUMENTATION (APPEND-ONLY)
// ═══════════════════════════════════════════════════════════════════════════
//
// REGIME CONTEXT (LOCKED)
// ------------------------
// Storybound operates under a semantic authority model.
// The Storybeau is a named, authoritative role chosen before story generation.
// Fate Cards must never infer this role from scene salience, proximity, or recency.
//
// CORE INVARIANT (AUTHORITATIVE · MUST HOLD)
// -------------------------------------------
// Any Fate Card that implies attraction, invitation, temptation, intimacy,
// or emotional pressure MUST target the Storybeau unless an explicit
// override is provided.
//
// - No exceptions by implication.
// - No guessing.
// - No "most relevant character" substitution.
//
// ROMANTIC IMPLICATION CARDS
// --------------------------
// These cards MUST target the Storybeau:
// - confession
// - temptation
// - boundary
// - reversal
//
// SCENE SALIENCE ALLOWED CARDS
// ----------------------------
// These cards may consult scene salience for non-romantic contexts:
// - silence
//
// TARGET RESOLUTION FLOW
// ----------------------
// 1. Check for explicit override with reason → honor if valid
// 2. Check if romantic implication card → return Storybeau
// 3. Check if scene salience allowed → return most relevant character
// 4. Default → return Storybeau
//
// EXPLICIT OVERRIDE CONTRACT
// --------------------------
// When a Fate Card intentionally targets someone other than the Storybeau,
// it MUST declare why:
//
//   {
//     overrideTarget: "Jax",
//     overrideReason: "external pressure / warning / jealousy trigger"
//   }
//
// Rules:
// - Override must be explicit
// - Override must include a reason
// - Override does not reassign the Storybeau role
// - Override does not advance romantic Storyturns
//
// TRIANGLE GUARD
// --------------
// If multiple characters appear in a scene AND no override is provided
// AND a romantic Fate Card is invoked:
// → Target MUST remain the Storybeau
// → No "implicit triangle" formation is allowed
//
// SECONDARY CHARACTERS (FUTURE-SAFE)
// ----------------------------------
// state.secondaryCharacters = {
//   rivals: ["Jax"],
//   observers: [],
//   antagonists: []
// };
//
// These characters may:
// - apply warnings
// - introduce tension
// - be referenced in consequences
// - influence stakes
//
// They may NOT become romantic targets by default.
//
// REGRESSION TEST
// ---------------
// Run: window.runStorybeauTargetingTest()
//
// Test case:
// - Storybeau = Marcus
// - Scene includes Marcus and Jax
// - Fate Card = Temptation
// → Card text MUST reference Marcus
// → Jax may only appear as context or pressure
//
// HARD CONSTRAINTS
// ----------------
// ❌ Do not change Storyturn rules
// ❌ Do not change Fate Card availability
// ❌ Do not add new cards
// ❌ Do not add inference logic
// ❌ Do not redesign copy unless required to insert the Storybeau name
//
// SUCCESS CONDITION
// -----------------
// - Fate Cards never misidentify the romantic target
// - Storybeau remains stable across scenes
// - Rivals can create tension without role drift
// - Claude is no longer allowed to "decide who matters"
//
// MANTRA (DO NOT REMOVE)
// ----------------------
// Characters may surprise the Story.
// Roles may not.
//
// ═══════════════════════════════════════════════════════════════════════════
