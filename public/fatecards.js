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
// CONTINUOUS SPARKLE EMITTER — GLOBAL DEFINITIONS
// ======================================================

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL SPARKLES FEATURE FLAG
// When true: Sparkles render as children of Fate Card (scroll naturally)
// When false: Existing overlay sparkle system runs unchanged
// Rollback: Set to false to restore original behavior immediately
// ═══════════════════════════════════════════════════════════════════════════
const USE_STRUCTURAL_SPARKLES = true;

let _sparkleEmitterActive = false;
let _continuousSparkleInterval = null;

// Sparkle cycle controller — 3s ON, 2s OFF pattern
let _sparkleCycleTimer = null;
let _sparkleActiveCardId = null;

// Structural sparkle state (only used when USE_STRUCTURAL_SPARKLES === true)
let _structuralSparkleIntervals = [];
let _structuralSparkleContainers = [];

function startSparkleCycle(cardId, cardEl, actInput, diaInput) {
    // ═══════════════════════════════════════════════════════════════════
    // FX DEBUG: Log visibility state of all FX elements
    // ═══════════════════════════════════════════════════════════════════
    console.log('[FX:DEBUG] startSparkleCycle triggered', {
        cardId,
        useStructuralSparkles: USE_STRUCTURAL_SPARKLES,
        cardElExists: !!cardEl,
        cardElVisible: cardEl ? !cardEl.classList.contains('hidden') && cardEl.offsetParent !== null : false,
        actInputExists: !!actInput,
        actInputVisible: actInput ? !actInput.classList.contains('hidden') && actInput.offsetParent !== null : false,
        diaInputExists: !!diaInput,
        diaInputVisible: diaInput ? !diaInput.classList.contains('hidden') && diaInput.offsetParent !== null : false,
        startFireflyEmanationExists: typeof window.startFireflyEmanation === 'function',
        stopAllEmanationsExists: typeof window.stopAllEmanations === 'function'
    });

    // Clear any existing cycle
    stopSparkleCycle();
    _sparkleActiveCardId = cardId;

    // ═══════════════════════════════════════════════════════════════════
    // CONTINUOUS SPARKLES: Anchored sparkles stay on permanently
    // No ON/OFF cycling — anchored elements don't need stop/restart
    // ═══════════════════════════════════════════════════════════════════

    const isValidAnchor = (el) => {
        if (!el || typeof el.getBoundingClientRect !== 'function') return false;
        const r = el.getBoundingClientRect();
        return r && r.width > 0 && r.height > 0;
    };

    if (USE_STRUCTURAL_SPARKLES) {
        console.log('[FX:DEBUG] Starting continuous structural sparkles for card:', cardId);
        stopStructuralSparkles();
        if (isValidAnchor(cardEl)) startStructuralSparkles(cardEl);
        if (isValidAnchor(actInput)) startStructuralSparkles(actInput);
        if (isValidAnchor(diaInput)) startStructuralSparkles(diaInput);
        return;
    }

    // LEGACY OVERLAY MODE: Start emanations once, keep running
    console.log('[FX:DEBUG] Starting continuous emanations for card:', cardId);
    if (typeof window.stopAllEmanations === 'function') window.stopAllEmanations();
    if (typeof window.startFireflyEmanation === 'function') {
        if (isValidAnchor(cardEl)) window.startFireflyEmanation(cardEl);
        if (isValidAnchor(actInput)) window.startFireflyEmanation(actInput);
        if (isValidAnchor(diaInput)) window.startFireflyEmanation(diaInput);
    } else {
        console.warn('[FX:DEBUG] startFireflyEmanation not found — FX will not render');
    }
}

function stopSparkleCycle() {
    if (_sparkleCycleTimer) {
        clearTimeout(_sparkleCycleTimer);
        _sparkleCycleTimer = null;
    }
    _sparkleActiveCardId = null;

    // Clean up based on active mode
    if (USE_STRUCTURAL_SPARKLES) {
        stopStructuralSparkles();
    } else {
        if (typeof window.stopAllEmanations === 'function') window.stopAllEmanations();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL SPARKLES — DOM-ANCHORED IMPLEMENTATION
// Sparkles render as children of Fate Card elements, scrolling naturally
// No scroll listeners, no position syncing, no math-based updates
// ═══════════════════════════════════════════════════════════════════════════

function stopStructuralSparkles() {
    // Clear all intervals
    _structuralSparkleIntervals.forEach(interval => clearInterval(interval));
    _structuralSparkleIntervals = [];

    // Remove all sparkle containers with fade
    _structuralSparkleContainers.forEach(container => {
        if (container && container.parentNode) {
            container.style.transition = 'opacity 0.5s ease-out';
            container.style.opacity = '0';
            setTimeout(() => {
                if (container.parentNode) container.remove();
            }, 500);
        }
    });
    _structuralSparkleContainers = [];
}

function startStructuralSparkles(anchorEl) {
    // ═══════════════════════════════════════════════════════════════════
    // ANCHOR VALIDATION: Abort if anchor is missing or invalid
    // ═══════════════════════════════════════════════════════════════════
    if (!anchorEl || !anchorEl.parentNode) {
        return; // No valid anchor — abort silently
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEXTAREA HANDLING: Textareas cannot have children
    // Append sparkle container to parent wrapper, position relative to textarea
    // ═══════════════════════════════════════════════════════════════════
    const isTextarea = anchorEl.tagName && anchorEl.tagName.toLowerCase() === 'textarea';
    const containerParent = isTextarea ? anchorEl.parentNode : anchorEl;

    // Ensure container parent has position for absolute children
    const computedPosition = window.getComputedStyle(containerParent).position;
    if (computedPosition === 'static') {
        containerParent.style.position = 'relative';
    }

    // ═══════════════════════════════════════════════════════════════════
    // CREATE SPARKLE CONTAINER — Child of anchor (or parent for textareas)
    // Uses position: absolute to scroll naturally with parent
    // ═══════════════════════════════════════════════════════════════════
    const PERIMETER_OFFSET = 8;
    const container = document.createElement('div');
    container.className = 'fate-card-sparkles';

    if (isTextarea) {
        // For textareas, position relative to textarea within wrapper
        const anchorRect = anchorEl.getBoundingClientRect();
        const parentRect = containerParent.getBoundingClientRect();
        const offsetLeft = anchorRect.left - parentRect.left;
        const offsetTop = anchorRect.top - parentRect.top;

        container.style.cssText =
            'position:absolute;' +
            'left:' + (offsetLeft - PERIMETER_OFFSET) + 'px;' +
            'top:' + (offsetTop - PERIMETER_OFFSET) + 'px;' +
            'width:' + (anchorRect.width + PERIMETER_OFFSET * 2) + 'px;' +
            'height:' + (anchorRect.height + PERIMETER_OFFSET * 2) + 'px;' +
            'pointer-events:none;' +
            'z-index:10;' +
            'overflow:visible;';
    } else {
        container.style.cssText =
            'position:absolute;' +
            'left:' + (-PERIMETER_OFFSET) + 'px;' +
            'top:' + (-PERIMETER_OFFSET) + 'px;' +
            'right:' + (-PERIMETER_OFFSET) + 'px;' +
            'bottom:' + (-PERIMETER_OFFSET) + 'px;' +
            'pointer-events:none;' +
            'z-index:10;' +
            'overflow:visible;';
    }

    containerParent.appendChild(container);
    _structuralSparkleContainers.push(container);

    const VISIBLE_DURATION = 3000;
    const FADE_DURATION = 2000;

    // Helper: Generate perimeter position
    function getPerimeterPosition(w, h) {
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        switch (edge) {
            case 0: x = Math.random() * w; y = -4 + Math.random() * 8; break;
            case 1: x = w - 4 + Math.random() * 8; y = Math.random() * h; break;
            case 2: x = Math.random() * w; y = h - 4 + Math.random() * 8; break;
            case 3: x = -4 + Math.random() * 8; y = Math.random() * h; break;
        }
        return { x, y, edge };
    }

    // Helper: Calculate outward velocity
    function getOutwardVelocity(edge) {
        const baseSpeed = 15 + Math.random() * 25;
        const spread = (Math.random() - 0.5) * 20;
        let dx, dy;
        switch (edge) {
            case 0: dx = spread; dy = -baseSpeed; break;
            case 1: dx = baseSpeed; dy = spread; break;
            case 2: dx = spread; dy = baseSpeed; break;
            case 3: dx = -baseSpeed; dy = spread; break;
        }
        return { dx, dy };
    }

    // Emit sparkles at intervals
    const interval = setInterval(() => {
        if (!container.parentNode) {
            clearInterval(interval);
            return;
        }

        const rect = container.getBoundingClientRect();
        const ct = 3 + Math.floor(Math.random() * 3);

        for (let j = 0; j < ct; j++) {
            const size = 3 + Math.random() * 4;
            const pos = getPerimeterPosition(rect.width, rect.height);
            const vel = getOutwardVelocity(pos.edge);
            const peakOpacity = 0.5 + Math.random() * 0.4;

            const p = document.createElement('div');
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
                '--ff-dx:' + vel.dx + 'px;' +
                '--ff-dy:' + vel.dy + 'px;' +
                '--ff-opacity:' + peakOpacity + ';';
            container.appendChild(p);

            // Fade and cleanup
            ((el) => {
                setTimeout(() => { el.style.opacity = '0'; }, VISIBLE_DURATION);
                setTimeout(() => { if (el.parentNode) el.remove(); }, VISIBLE_DURATION + FADE_DURATION + 100);
            })(p);
        }
    }, 120);

    _structuralSparkleIntervals.push(interval);
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

        return {
            presentCharacters,
            lastEmotionalBeat,
            unresolvedTension,
            currentLocation,
            sceneObjects,
            liName,
            liIntroduced: liName && recentText.includes(liName.toLowerCase()),
            confidence
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
        power: {
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
        const options = generateCardOptions(baseCard.id, {
            isSetup,
            isEarlyStory,
            liIntroduced: targetResolution.target ? true : liIntroduced,
            liName: resolvedTargetName, // AUTHORITATIVE: Storybeau-resolved target
            intensity,
            lastEmotionalBeat,
            unresolvedTension,
            currentLocation,
            sceneObjects,
            presentCharacters,
            // Pass resolution metadata for triangle-aware generation
            targetResolution
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

    // ACTIONABLE OPTIONS: Each should change the next beat differently
    function generateCardOptions(cardId, ctx) {
        const { isSetup, isEarlyStory, liIntroduced, liName, intensity, lastEmotionalBeat, unresolvedTension, currentLocation, sceneObjects, presentCharacters } = ctx;

        const locationPhrase = currentLocation ? `in the ${currentLocation}` : '';
        const objectPhrase = sceneObjects.length > 0 ? sceneObjects[0] : '';
        const tensionPhrase = unresolvedTension.length > 0 ? unresolvedTension[0] : '';

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
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, intensity } = ctx;

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
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, unresolvedTension } = ctx;

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
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, intensity, currentLocation } = ctx;

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
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, presentCharacters } = ctx;

        if (isSetup || !liIntroduced) {
            return {
                action: 'The balance of control wavers. Tip it in your favor, or cede ground.',
                dialogue: '"Your move."',
                altAction: 'Someone must lead. Decide if it\'s you.',
                altDialogue: '"I\'m waiting."'
            };
        }

        // WITHDRAW or ASSERT based on beat
        if (lastEmotionalBeat === 'intimacy') {
            return {
                action: `After that closeness, reclaim control—or surrender more.`,
                dialogue: '"Now it\'s my turn."',
                altAction: `${liName} had you vulnerable. Reassert yourself, or let them keep the advantage.`,
                altDialogue: '"You think you have the upper hand?"'
            };
        }
        if (lastEmotionalBeat === 'conflict') {
            return {
                action: `The argument left you both exposed. Seize the advantage, or extend mercy.`,
                dialogue: '"I could end this. But I won\'t."',
                altAction: `One of you must yield. Make ${liName} bend first, or offer the first surrender.`,
                altDialogue: '"Admit you were wrong."'
            };
        }
        if (lastEmotionalBeat === 'vulnerability') {
            return {
                action: `${liName}'s vulnerability is power. Protect it, or exploit it.`,
                dialogue: '"You just gave me everything."',
                altAction: `They trusted you with weakness. Honor that, or use it.`,
                altDialogue: '"Thank you for trusting me."'
            };
        }

        // Third party present
        if (presentCharacters.length > 1) {
            const otherPerson = presentCharacters.find(p => p !== liName) || 'them';
            return {
                action: `With ${otherPerson} watching, assert your claim on ${liName}—or defer.`,
                dialogue: `"${liName} is with me."`,
                altAction: `The presence of others changes the dynamic. Use it.`,
                altDialogue: '"We should discuss this privately."'
            };
        }

        return {
            action: `Shift the balance with ${liName}. Command, or invite them to lead.`,
            dialogue: '"Come here."',
            altAction: `You could take charge. Or make ${liName} earn it.`,
            altDialogue: '"Show me what you want."'
        };
    }

    function getSilenceOptions(ctx, locationPhrase, objectPhrase, tensionPhrase) {
        const { isSetup, liIntroduced, liName, lastEmotionalBeat, currentLocation, sceneObjects } = ctx;

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
        const allContent = window.StoryPagination ? window.StoryPagination.getAllContent() : '';
        const storyText = allContent.replace(/<[^>]*>/g, ' ');

        // Extract scene context once for all cards
        const sceneContext = extractSceneContext(storyText, state);

        // Track used phrases in this draw to prevent repetition
        const usedInThisDraw = [];

        return fateDeckBase.map(baseCard => {
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

        // Best-effort inference from existing state fields (non-invasive defaults)
        const access = window.state ? window.state.access : null;
        if (access === 'free') return 2;
        if (access === 'sub') return 5;

        // Default paid-but-not-sub tier
        return 3;
    }

    function flipAllCards(mount){
        if (_allFlipped) return;
        _allFlipped = true;
        const cards = mount.querySelectorAll('.fate-card:not(.petition-fate-card)');
        cards.forEach(c => c.classList.add('flipped'));
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
        console.log('[FX:DEBUG] triggerGoldenFlow called', {
            fromElExists: !!fromEl,
            toElExists: !!toEl,
            fromElVisible: fromEl ? fromEl.offsetParent !== null : false,
            toElVisible: toEl ? toEl.offsetParent !== null : false
        });

        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // ANCHOR VALIDATION: Abort if either element has no dimensions
        if (!fromRect || fromRect.width === 0 || fromRect.height === 0) return;
        if (!toRect || toRect.width === 0 || toRect.height === 0) return;

        console.log('[FX:DEBUG] Golden flow coords', {
            fromRect: { left: fromRect.left, top: fromRect.top, width: fromRect.width, height: fromRect.height },
            toRect: { left: toRect.left, top: toRect.top, width: toRect.width, height: toRect.height }
        });

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

        // Common IDs across builds (safe no-op if missing)
        ['submitBtn','sendBtn','submitTurn','turnSubmit','submit'].forEach(tryBindClick);

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

        const actInput = document.getElementById('actionInput');
        const diaInput = document.getElementById('dialogueInput');

        const maybeCommitOnEdit = () => {
            if (!window.state) return;
            if (window.state.fateCommitted) return;
            // Only commit if a card has been selected
            if (typeof window.state.fateSelectedIndex !== 'number') return;
            commitFateSelection(mount);
        };

        // "Once the player clicks into the populated text boxes…"
        // Focus counts as "click into". Input counts as editing.
        [actInput, diaInput].forEach(el => {
            if (!el) return;
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
        }
    };

    window.stopAllEmanations = stopAllEmanations;
    window.startFireflyEmanation = startFireflyEmanation;
    window.triggerGoldenFlow = triggerGoldenFlow;

    window.dealFateCards = function() {
        const mount = document.getElementById('cardMount');
        if(!mount) return;

        // Safety: Ensure state exists before trying to write to it
        if (!window.state) {
            console.warn("State not ready for dealing cards.");
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

                clearPendingTimer();

                // Cancel any prior sparkle cycle, then start new cycle
                stopSparkleCycle();

                // Trigger golden flow animations to inputs
                const actInput = document.getElementById('actionInput');
                const diaInput = document.getElementById('dialogueInput');

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
            };

            mount.appendChild(card);
        });

        // Petition Fate card — 6th card, always visible, always unlocked, pre-flipped
        const petitionCard = document.createElement('div');
        petitionCard.className = 'fate-card petition-fate-card flipped';
        petitionCard.innerHTML = `
            <div class="inner">
                <div class="front"><h3>Fate</h3></div>
                <div class="back petition-back">
                    <span class="petition-quill-icon">&#x270D;</span>
                    <h3 style="margin:2px 0; font-size:0.9em;">Petition Fate</h3>
                    <p style="font-size:0.7em; opacity:0.7; margin:0;">Speak your desire</p>
                </div>
            </div>
        `;
        petitionCard.onclick = () => {
            if (typeof window.openPetitionZoom === 'function') window.openPetitionZoom();
        };
        mount.appendChild(petitionCard);

        // Bind commitment triggers once (safe no-op if elements missing)
        bindCommitHooks(mount);
        bindInputCommit(mount);

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

                // Trigger golden flow animations to inputs
                const actInput = document.getElementById('actionInput');
                const diaInput = document.getElementById('dialogueInput');

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
            };
        });

        // Rebind Petition Fate card (has no fateOptions entry, skipped by forEach above)
        const petitionCard = mount.querySelector('.petition-fate-card');
        if (petitionCard) {
            petitionCard.onclick = () => {
                if (typeof window.openPetitionZoom === 'function') window.openPetitionZoom();
            };
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
