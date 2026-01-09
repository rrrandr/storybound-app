(function(window){
    // ═══════════════════════════════════════════════════════════════════
    // STORYBOUND FATE CARDS — AUTHORITATIVE IMPLEMENTATION
    // ═══════════════════════════════════════════════════════════════════
    // Fate Cards exist to reintroduce constraint, consequence, and uncertainty.
    // They are NOT powers, NOT cheats, NOT god-mode controls.
    // They represent Fate nudging reality, not the player rewriting it.
    // ═══════════════════════════════════════════════════════════════════

    // Canonical Deck (Exactly 5)
    const fateDeck = [
        {
            id: 'temptation',
            title: 'Temptation',
            desc: 'A sudden, overwhelming urge.',
            action: 'You feel a pull towards something forbidden.',
            dialogue: '"I shouldn\'t..."'
        },
        {
            id: 'confession',
            title: 'Confession',
            desc: 'A secret spills out.',
            action: 'The truth burns on your tongue.',
            dialogue: '"There is something I must tell you."'
        },
        {
            id: 'boundary',
            title: 'Boundary',
            desc: 'A line is drawn or crossed.',
            action: 'You step back, or push forward.',
            dialogue: '"Stop." / "More."'
        },
        {
            id: 'power',
            title: 'Power Shift',
            desc: 'Control changes hands.',
            action: 'You take the lead, or surrender it.',
            dialogue: '"Look at me."'
        },
        {
            id: 'silence',
            title: 'Silence',
            desc: 'Words fail. Actions speak.',
            action: 'You let the quiet do the work.',
            dialogue: '(Silence)'
        }
    ];

    // Track state for this turn's cards
    let cardsRevealed = false;
    let selectedCardIndex = null;
    let committed = false;

    // Determine how many cards are unlocked based on tier
    function getUnlockedCount() {
        if (!window.state) return 2;
        const access = window.state.access || 'free';
        if (access === 'sub' || window.state.subscribed) return 5;
        if (access === 'pass') return 3;
        return 2; // free
    }

    // Initialize with face-down placeholders
    window.initCards = function() {
        const mount = document.getElementById('cardMount');
        if (!mount) return;

        // Reset turn state
        cardsRevealed = false;
        selectedCardIndex = null;
        committed = false;

        mount.innerHTML = '';

        // Create 5 face-down placeholders
        for (let i = 0; i < 5; i++) {
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

    // Deal 5 shuffled cards for this turn
    window.dealFateCards = function() {
        const mount = document.getElementById('cardMount');
        if (!mount) return;

        if (!window.state) {
            console.warn("State not ready for dealing cards.");
            return;
        }

        // Reset turn state
        cardsRevealed = false;
        selectedCardIndex = null;
        committed = false;

        // Shuffle the deck
        const shuffled = [...fateDeck].sort(() => 0.5 - Math.random());

        // All 5 cards, shuffled order
        window.state.fateOptions = shuffled;

        const unlockedCount = getUnlockedCount();

        mount.innerHTML = '';
        shuffled.forEach((data, i) => {
            const card = document.createElement('div');
            card.className = 'fate-card';
            card.dataset.index = i;

            // Lock cards beyond the tier's allowance
            const isLocked = i >= unlockedCount;
            if (isLocked) {
                card.classList.add('locked');
            }

            card.innerHTML = `
                <div class="inner">
                    <div class="front"><h3>Fate</h3></div>
                    <div class="back">
                        <h3>${data.title}</h3>
                        <p>${data.desc}</p>
                        ${isLocked ? '<div class="lock-overlay"></div>' : ''}
                    </div>
                </div>
            `;

            card.onclick = () => handleCardClick(card, data, i, isLocked);

            mount.appendChild(card);
        });

        // Listen for manual edits to inputs (triggers commitment)
        setupCommitmentListeners();
    };

    function handleCardClick(card, data, index, isLocked) {
        // If already committed this turn, no more interactions
        if (committed) return;

        // FIRST CLICK ON ANY CARD: Reveal all 5 simultaneously
        if (!cardsRevealed) {
            revealAllCards();
            cardsRevealed = true;

            // If this specific card is locked, show paywall
            if (isLocked) {
                if (window.showPaywall) window.showPaywall('unlock');
                return;
            }

            // Select this card
            selectCard(card, data, index);
            return;
        }

        // Already revealed - handle selection
        if (isLocked) {
            if (window.showPaywall) window.showPaywall('unlock');
            return;
        }

        // Select/switch to this card
        selectCard(card, data, index);
    }

    function revealAllCards() {
        const mount = document.getElementById('cardMount');
        if (!mount) return;

        const cards = mount.querySelectorAll('.fate-card');
        cards.forEach(card => {
            card.classList.add('flipped');
        });
    }

    function selectCard(card, data, index) {
        const mount = document.getElementById('cardMount');
        if (!mount) return;

        // Clear previous selection
        const cards = mount.querySelectorAll('.fate-card');
        cards.forEach(c => c.classList.remove('selected'));

        // Mark this card as selected
        card.classList.add('selected');
        selectedCardIndex = index;

        // Populate inputs with suggestions (not commands)
        const actInput = document.getElementById('actionInput');
        const diaInput = document.getElementById('dialogueInput');

        if (actInput) actInput.value = data.action;
        if (diaInput) diaInput.value = data.dialogue;

        // Store the selected card data for narrative injection
        window.state.selectedFateCard = data;
    }

    function setupCommitmentListeners() {
        const actInput = document.getElementById('actionInput');
        const diaInput = document.getElementById('dialogueInput');

        // Manual edit = commitment (after a card was selected)
        const onEdit = () => {
            if (selectedCardIndex !== null && !committed) {
                // User edited the text - this counts as commitment
                // Don't dissolve yet - wait for Submit
            }
        };

        if (actInput) {
            actInput.removeEventListener('input', onEdit);
            actInput.addEventListener('input', onEdit);
        }
        if (diaInput) {
            diaInput.removeEventListener('input', onEdit);
            diaInput.addEventListener('input', onEdit);
        }
    }

    // Called when Submit is clicked - dissolve unselected cards
    window.commitFateCard = function() {
        if (committed) return;
        committed = true;

        const mount = document.getElementById('cardMount');
        if (!mount) return;

        const cards = mount.querySelectorAll('.fate-card');

        cards.forEach((card, i) => {
            if (i === selectedCardIndex) {
                // The chosen card gets a subtle glow then fades
                card.classList.add('committed');
                setTimeout(() => {
                    card.classList.add('fade-out');
                }, 400);
            } else {
                // Unselected cards dissolve in smoke
                card.classList.add('smoke-dissolve');
            }
        });

        // Clear the mount after animations complete
        setTimeout(() => {
            mount.innerHTML = '';
        }, 1200);
    };

    // Called to clear cards without commitment (e.g., turn ended without playing)
    window.discardFateCards = function() {
        const mount = document.getElementById('cardMount');
        if (!mount) return;

        const cards = mount.querySelectorAll('.fate-card');
        cards.forEach(card => {
            card.classList.add('smoke-dissolve');
        });

        setTimeout(() => {
            mount.innerHTML = '';
            // Reset state
            if (window.state) {
                window.state.fateOptions = [];
                window.state.selectedFateCard = null;
            }
        }, 800);

        // Reset turn state
        cardsRevealed = false;
        selectedCardIndex = null;
        committed = false;
    };

    // Get the selected card's context for narrative injection
    // Returns context modifier, NOT direct text injection
    window.getFateCardContext = function() {
        if (!window.state || !window.state.selectedFateCard) return null;

        const card = window.state.selectedFateCard;

        // Return narrative pressure/context, not commands
        // The AI uses this to flavor the response, not as direct instruction
        return {
            id: card.id,
            pressure: card.desc,
            tendency: card.action,
            // Cards may NOT: force explicit outcomes, override consent, function as commands
            // This is a nudge, not an order
            directive: `[FATE PRESSURE: The scene carries a subtle weight of "${card.title.toLowerCase()}" — ${card.desc.toLowerCase()} This is atmospheric, not a command. Resolve naturally within existing narrative constraints.]`
        };
    };

    // Reset for new turn
    window.resetFateCards = function() {
        cardsRevealed = false;
        selectedCardIndex = null;
        committed = false;
        if (window.state) {
            window.state.selectedFateCard = null;
        }
    };

})(window);
