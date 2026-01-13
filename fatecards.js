(function(window){
    // Card Definitions - Base templates
    const fateDeckBase = [
        { id: 'temptation', title: 'Temptation', desc: 'A sudden, overwhelming urge.', actionTemplate: 'You feel drawn to something you know you shouldn\'t want.', dialogueTemplate: '"I shouldn\'t want this..."' },
        { id: 'confession', title: 'Confession', desc: 'A secret spills out.', actionTemplate: 'The truth rises to your lips.', dialogueTemplate: '"There\'s something I need to tell you."' },
        { id: 'boundary', title: 'Boundary', desc: 'A line is drawn or crossed.', actionTemplate: 'You decide whether to stop or go further.', dialogueTemplate: '"Wait." / "Don\'t stop."' },
        { id: 'power', title: 'Power Shift', desc: 'Control changes hands.', actionTemplate: 'You take control, or yield it willingly.', dialogueTemplate: '"Look at me."' },
        { id: 'silence', title: 'Silence', desc: 'Words fail. Actions speak.', actionTemplate: 'You let the moment breathe without words.', dialogueTemplate: '(Silence speaks louder)' }
    ];

    // Contextual card generation based on story state
    function generateContextualCard(baseCard) {
        const state = window.state || {};
        // REPAIR: Get story content from pagination system (all pages), not visible DOM
        const allContent = window.StoryPagination ? window.StoryPagination.getAllContent() : '';
        const storyText = allContent.replace(/<[^>]*>/g, ' '); // Strip HTML tags
        const turnCount = state.turnCount || 0;
        const intensity = state.intensity || 'Naughty';

        // Determine story phase
        const isSetup = turnCount === 0;
        const isEarlyStory = turnCount <= 2;
        const liName = state.loveInterestName || '';

        // Check if love interest has actually appeared in the story
        const liIntroduced = liName && storyText.toLowerCase().includes(liName.toLowerCase());

        // Detect recent story moments from last ~500 chars
        const recentText = storyText.slice(-500).toLowerCase();
        const recentMoments = {
            kissed: /kiss(ed|ing|es)?|lips\s+(met|touched|pressed)/.test(recentText),
            touched: /touch(ed|ing)?|hand\s+(on|against)|fingers\s+(brush|trace)/.test(recentText),
            tension: /heart\s+(pound|race|skip)|breath\s+(catch|hitch)|pulse\s+quick/.test(recentText),
            argument: /argue|anger|frustrat|storm(ed)?\s+out|walked\s+away/.test(recentText),
            vulnerable: /tears?|cried|confess|admit|truth|secret/.test(recentText),
            alone: /alone\s+together|empty\s+room|door\s+(close|shut)|private/.test(recentText)
        };

        // Phase-appropriate suggestions that respond to recent story events
        const contextualMods = {
            temptation: getTemptationMod(isSetup, isEarlyStory, liIntroduced, liName, intensity, recentMoments),
            confession: getConfessionMod(isSetup, isEarlyStory, liIntroduced, intensity, recentMoments),
            boundary: getBoundaryMod(isSetup, liIntroduced, intensity, recentMoments),
            power: getPowerMod(isSetup, liIntroduced, liName, intensity, recentMoments),
            silence: getSilenceMod(isSetup, liIntroduced, liName, intensity, recentMoments)
        };

        const mod = contextualMods[baseCard.id] || {};
        return {
            ...baseCard,
            action: mod.action || baseCard.actionTemplate,
            dialogue: mod.dialogue || baseCard.dialogueTemplate
        };
    }

    function getTemptationMod(isSetup, isEarly, liIntro, liName, intensity, recent) {
        if (isSetup) {
            return {
                action: 'Something catches your attention—a scent, a sound, a half-remembered feeling.',
                dialogue: '"What is this place...?"'
            };
        }
        if (!liIntro) {
            return {
                action: 'A pull toward something unknown. Curiosity, or something deeper.',
                dialogue: '"I should leave this alone..."'
            };
        }
        // Respond to recent story moments
        if (recent.kissed) {
            return {
                action: `The memory of that kiss lingers. You want more.`,
                dialogue: '"That wasn\'t enough..."'
            };
        }
        if (recent.argument) {
            return {
                action: `Even angry, you can\'t stop thinking about ${liName}.`,
                dialogue: '"Why do I still want this?"'
            };
        }
        if (recent.alone) {
            return {
                action: `Alone with ${liName}, the air feels charged.`,
                dialogue: '"We shouldn\'t... but..."'
            };
        }
        if (intensity === 'Clean') {
            return {
                action: `Your thoughts drift to ${liName}. You catch yourself.`,
                dialogue: '"I wonder what they\'re thinking..."'
            };
        }
        return {
            action: `You find yourself wanting to move closer to ${liName}.`,
            dialogue: '"I keep thinking about..."'
        };
    }

    function getConfessionMod(isSetup, isEarly, liIntro, intensity, recent) {
        if (isSetup) {
            return {
                action: 'Something you\'ve been carrying demands to be spoken.',
                dialogue: '"I\'ve never told anyone this..."'
            };
        }
        if (!liIntro) {
            return {
                action: 'A truth rises unbidden to your lips.',
                dialogue: '"There\'s something you should know..."'
            };
        }
        // Respond to recent moments
        if (recent.kissed) {
            return {
                action: 'After that kiss, holding back feels impossible.',
                dialogue: '"I need to tell you what this means to me..."'
            };
        }
        if (recent.vulnerable) {
            return {
                action: 'The vulnerability unlocks something deeper.',
                dialogue: '"Since we\'re being honest..."'
            };
        }
        if (recent.argument) {
            return {
                action: 'The fight stripped away your defenses.',
                dialogue: '"The truth is, I\'m scared of how much I..."'
            };
        }
        return {
            action: 'The weight of an unspoken truth presses against your chest.',
            dialogue: '"Before this goes any further, I need you to know..."'
        };
    }

    function getBoundaryMod(isSetup, liIntro, intensity, recent) {
        if (isSetup) {
            return {
                action: 'You decide what you will and won\'t allow in this moment.',
                dialogue: '"Not yet."'
            };
        }
        // Respond to recent moments
        if (recent.kissed || recent.touched) {
            return {
                action: 'After what just happened, you need to decide: more, or stop here.',
                dialogue: '"Wait... or don\'t stop?"'
            };
        }
        if (recent.tension) {
            return {
                action: 'The tension is unbearable. You must choose.',
                dialogue: '"If we do this..."'
            };
        }
        if (intensity === 'Clean') {
            return {
                action: 'You take a breath and create space.',
                dialogue: '"I need a moment."'
            };
        }
        return {
            action: 'You decide how far this moment will go.',
            dialogue: '"Is this what you want?"'
        };
    }

    function getPowerMod(isSetup, liIntro, liName, intensity, recent) {
        if (isSetup || !liIntro) {
            return {
                action: 'You sense the balance of control shifting around you.',
                dialogue: '"Your move."'
            };
        }
        // Respond to recent moments
        if (recent.kissed) {
            return {
                action: 'After that kiss, who leads next?',
                dialogue: '"Your turn... or mine?"'
            };
        }
        if (recent.argument) {
            return {
                action: `The argument leaves you both raw. Someone must yield first.`,
                dialogue: '"I\'m not backing down."'
            };
        }
        if (recent.vulnerable) {
            return {
                action: `Vulnerability is its own kind of power.`,
                dialogue: '"You have me at a disadvantage."'
            };
        }
        return {
            action: `The balance between you and ${liName} shifts. You feel it.`,
            dialogue: '"Look at me."'
        };
    }

    function getSilenceMod(isSetup, liIntro, liName, intensity, recent) {
        if (isSetup || !liIntro) {
            return {
                action: 'You let the silence speak for you.',
                dialogue: '(The moment stretches, full of meaning.)'
            };
        }
        // Respond to recent moments
        if (recent.kissed) {
            return {
                action: 'No words could follow that. You simply breathe together.',
                dialogue: '(The silence says everything.)'
            };
        }
        if (recent.argument) {
            return {
                action: 'After the shouting, the quiet is deafening.',
                dialogue: '(The silence demands attention.)'
            };
        }
        if (recent.tension) {
            return {
                action: `The tension between you and ${liName} is palpable.`,
                dialogue: '(Neither of you dares speak first.)'
            };
        }
        return {
            action: `You hold ${liName}'s gaze. No words needed.`,
            dialogue: '(Your eyes say everything.)'
        };
    }

    // Generate the deck with contextual awareness
    function buildFateDeck() {
        return fateDeckBase.map(generateContextualCard);
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

        // “Once the player clicks into the populated text boxes…”
        // Focus counts as “click into”. Input counts as editing.
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
