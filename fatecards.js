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
        const storyEl = document.getElementById('storyText');
        const context = storyEl ? storyEl.textContent.slice(-500) : '';
        const liName = state.loveInterestName || 'them';
        const intensity = state.intensity || 'Naughty';

        // Build contextual suggestions based on card type
        const contextualMods = {
            temptation: {
                action: `You find yourself wanting to move closer to ${liName}.`,
                dialogue: `"I keep thinking about..."`
            },
            confession: {
                action: `The weight of an unspoken truth presses against your chest.`,
                dialogue: `"Before this goes any further, I need you to know..."`
            },
            boundary: {
                action: intensity === 'Clean' ? `You take a breath and create space.` : `You decide how far this moment will go.`,
                dialogue: intensity === 'Clean' ? `"I need a moment."` : `"Is this what you want?"`
            },
            power: {
                action: `The balance between you shifts. You can feel it.`,
                dialogue: `"Your move."`
            },
            silence: {
                action: `You hold ${liName}'s gaze. No words needed.`,
                dialogue: `(Your eyes say everything)`
            }
        };

        const mod = contextualMods[baseCard.id] || {};
        return {
            ...baseCard,
            action: mod.action || baseCard.actionTemplate,
            dialogue: mod.dialogue || baseCard.dialogueTemplate
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

                // Apply content to inputs after animation delay (match existing 600ms timing)
                _pendingApplyTimer = setTimeout(() => {
                    const actInput = document.getElementById('actionInput');
                    const diaInput = document.getElementById('dialogueInput');
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
