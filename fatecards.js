(function(window){
    // Card Definitions
    const fateDeck = [
        { id: 'temptation', title: 'Temptation', desc: 'A sudden, overwhelming urge.', action: 'You feel a pull towards something forbidden.', dialogue: '"I shouldn\'t..."' },
        { id: 'confession', title: 'Confession', desc: 'A secret spills out.', action: 'The truth burns on your tongue.', dialogue: '"There is something I must tell you."' },
        { id: 'boundary', title: 'Boundary', desc: 'A line is drawn or crossed.', action: 'You step back, or push forward.', dialogue: '"Stop." / "More."' },
        { id: 'power', title: 'Power Shift', desc: 'Control changes hands.', action: 'You take the lead, or surrender it.', dialogue: '"Look at me."' },
        { id: 'silence', title: 'Silence', desc: 'Words fail. Actions speak.', action: 'You let the quiet do the work.', dialogue: '(Silence)' }
    ];

    // --- Surgical glue: minimal shared helpers / guards ---
    let _commitHooksBound = false;
    let _inputsBound = false;
    let _allFlipped = false;
    let _pendingApplyTimer = null;
    let _currentTurnAtDeal = -1; // Track which turn cards were dealt for

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

        // Store in fateHistory for per-turn tracking (canonical state)
        const turnNum = window.state.turnCount || 0;
        if (!window.state.fateHistory) window.state.fateHistory = {};

        const actInput = document.getElementById('actionInput');
        const diaInput = document.getElementById('dialogueInput');
        const cardData = window.state.fateOptions ? window.state.fateOptions[selectedIdx] : null;

        window.state.fateHistory[turnNum] = {
            cardIndex: selectedIdx,
            cardData: cardData,
            sayText: diaInput ? diaInput.value : '',
            doText: actInput ? actInput.value : '',
            committedAt: Date.now()
        };

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
                // Add "Your Chosen Fate:" label
                addChosenFateLabel(mount, cardEl);
            }

            cardEl.style.pointerEvents = 'none';
        });

        clearPendingTimer();
    }

    function addChosenFateLabel(mount, cardEl) {
        // Add "Your Chosen Fate:" label to the left of the chosen card
        const existingLabel = mount.querySelector('.chosen-fate-label');
        if (existingLabel) return; // Already exists

        const label = document.createElement('div');
        label.className = 'chosen-fate-label';
        label.textContent = 'Your Chosen Fate:';
        label.style.cssText = 'position:absolute; left:-120px; top:50%; transform:translateY(-50%); color:var(--gold); font-size:0.9em; font-style:italic; white-space:nowrap;';

        // Position relative to card
        if (cardEl.style.position !== 'relative' && cardEl.style.position !== 'absolute') {
            cardEl.style.position = 'relative';
        }
        cardEl.appendChild(label);
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

        const turnNum = window.state.turnCount || 0;
        _currentTurnAtDeal = turnNum;

        // Check if this turn already has a committed fate (prevents re-selection on navigation)
        if (!window.state.fateHistory) window.state.fateHistory = {};
        const existingFate = window.state.fateHistory[turnNum];

        if (existingFate) {
            // This turn already has a committed fate - show only the chosen card
            renderCommittedFate(mount, existingFate);
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

        // Shuffle the 5 cards
        const shuffled = [...fateDeck].sort(() => 0.5 - Math.random());
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

    // Render a previously committed fate (for navigation back to old turns)
    function renderCommittedFate(mount, fateData) {
        mount.innerHTML = '';

        const cardData = fateData.cardData;
        if (!cardData) return;

        // Create a single card showing the committed choice
        const card = document.createElement('div');
        card.className = 'fate-card flipped chosen';
        card.style.pointerEvents = 'none';
        card.style.position = 'relative';

        card.innerHTML = `
            <div class="inner">
                <div class="front"><h3>Fate</h3></div>
                <div class="back">
                    <h3>${cardData.title}</h3>
                    <p>${cardData.desc}</p>
                </div>
            </div>
        `;

        // Add "Your Chosen Fate:" label
        const label = document.createElement('div');
        label.className = 'chosen-fate-label';
        label.textContent = 'Your Chosen Fate:';
        label.style.cssText = 'position:absolute; left:-120px; top:50%; transform:translateY(-50%); color:var(--gold); font-size:0.9em; font-style:italic; white-space:nowrap;';
        card.appendChild(label);

        mount.appendChild(card);

        // Center the single card
        mount.style.justifyContent = 'center';

        // Do NOT update Say/Do boxes - they should retain current values
        // The committed values are stored in fateData.sayText and fateData.doText
        // but clicking old scenes should NOT repopulate them

        // Mark state as committed for this turn (prevents any further selection)
        window.state.fateCommitted = true;
        window.state.fateSelectedIndex = fateData.cardIndex;
    }

})(window);
