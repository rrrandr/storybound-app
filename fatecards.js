(function(window){
    // Card Definitions - Base templates
    const fateDeckBase = [
        { id: 'temptation', title: 'Temptation', desc: 'A sudden, overwhelming urge.', actionTemplate: 'You feel drawn to something you know you shouldn\'t want.', dialogueTemplate: '"I shouldn\'t want this..."' },
        { id: 'confession', title: 'Confession', desc: 'A secret spills out.', actionTemplate: 'The truth rises to your lips.', dialogueTemplate: '"There\'s something I need to tell you."' },
        { id: 'boundary', title: 'Boundary', desc: 'A line is drawn or crossed.', actionTemplate: 'You decide whether to stop or go further.', dialogueTemplate: '"Wait." / "Don\'t stop."' },
        { id: 'power', title: 'Power Shift', desc: 'Control changes hands.', actionTemplate: 'You take control, or yield it willingly.', dialogueTemplate: '"Look at me."' },
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
        const options = generateCardOptions(baseCard.id, {
            isSetup,
            isEarlyStory,
            liIntroduced,
            liName,
            intensity,
            lastEmotionalBeat,
            unresolvedTension,
            currentLocation,
            sceneObjects,
            presentCharacters
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
            case 'power':
                return getPowerOptions(ctx, locationPhrase, objectPhrase, tensionPhrase);
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

        return {
            action: `Set the terms with ${liName}. What happens next is your call.`,
            dialogue: '"Before this goes further—"',
            altAction: `You have power here. Use it to draw a line or invite ${liName} past it.`,
            altDialogue: '"Is this what you want?"'
        };
    }

    function getPowerOptions(ctx, locationPhrase, objectPhrase, tensionPhrase) {
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
    let _commitHooksBound = false;
    let _inputsBound = false;
    let _allFlipped = false;
    let _pendingApplyTimer = null;

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
        const cards = mount.querySelectorAll('.fate-card');
        cards.forEach(c => c.classList.add('flipped'));
    }

    function clearPendingTimer(){
        if (_pendingApplyTimer) {
            clearTimeout(_pendingApplyTimer);
            _pendingApplyTimer = null;
        }
    }

    // Golden flow animation from card to inputs - continuous gentle stream
    function triggerGoldenFlow(fromEl, toEl) {
        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

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

    function setSelectedState(mount, selectedCardEl){
        const cards = mount.querySelectorAll('.fate-card');
        cards.forEach(c => c.classList.remove('selected'));
        if (selectedCardEl) selectedCardEl.classList.add('selected');

        // Show "Your choice:" label when a card is selected
        const yourChoiceLabel = document.getElementById('yourChoiceLabel');
        if (yourChoiceLabel) {
            if (selectedCardEl) {
                yourChoiceLabel.classList.remove('hidden');
            } else {
                yourChoiceLabel.classList.add('hidden');
            }
        }

        // Track selection in state without changing shape elsewhere
        if (window.state) {
            const idx = Number(selectedCardEl && selectedCardEl.dataset && selectedCardEl.dataset.cardIndex);
            if (!Number.isNaN(idx)) window.state.fateSelectedIndex = idx;
        }
    }

    function commitFateSelection(mount){
        // Commit means: lock choice, poof unchosen 4, disable further selection
        if (!window.state) return;
        if (window.state.fateCommitted) return;

        const selectedIdx = typeof window.state.fateSelectedIndex === 'number' ? window.state.fateSelectedIndex : -1;
        if (selectedIdx < 0) return; // nothing selected -> nothing to commit

        window.state.fateCommitted = true;

        const cards = mount.querySelectorAll('.fate-card');
        cards.forEach((cardEl) => {
            const idx = Number(cardEl.dataset && cardEl.dataset.cardIndex);
            if (idx !== selectedIdx) {
                cardEl.classList.add('poof');
                // Cleanup visual after poof finishes
                setTimeout(() => {
                    cardEl.style.visibility = 'hidden';
                }, 600);
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

            card.innerHTML = `
                <div class="inner">
                    <div class="front"><h3>Fate</h3></div>
                    <div class="back">
                        <h3>${data.title}</h3>
                        <p>${data.desc}</p>
                    </div>
                </div>
            `;

            card.onclick = () => {
                // If already committed, ignore all clicks
                if (window.state && window.state.fateCommitted) return;

                // First interaction flips all 5 at once
                flipAllCards(mount);

                // Locked cards trigger paywall and do not select
                if(card.classList.contains('locked')) {
                    if(window.showPaywall) window.showPaywall('unlock');
                    return;
                }

                // Selecting a different unlocked card wipes/replaces suggestions
                setSelectedState(mount, card);

                clearPendingTimer();

                // Trigger golden flow animations to inputs
                const actInput = document.getElementById('actionInput');
                const diaInput = document.getElementById('dialogueInput');
                if (actInput) triggerGoldenFlow(card, actInput);
                setTimeout(() => {
                    if (diaInput) triggerGoldenFlow(card, diaInput);
                }, 150); // Slight stagger for elegance

                // Apply content to inputs after animation delay (match existing 600ms timing)
                _pendingApplyTimer = setTimeout(() => {
                    if(actInput) actInput.value = data.action;
                    if(diaInput) diaInput.value = data.dialogue;
                }, 600);
            };

            mount.appendChild(card);
        });

        // Bind commitment triggers once (safe no-op if elements missing)
        bindCommitHooks(mount);
        bindInputCommit(mount);
    };

})(window);
