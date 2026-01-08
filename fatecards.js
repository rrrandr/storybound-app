(function(window){
    // Card Definitions
    const fateDeck = [
        { id: 'touch', title: 'The Touch', desc: 'Skin against skin.', action: 'You reach out.', dialogue: '(Gasp)' },
        { id: 'gaze', title: 'The Gaze', desc: 'Eyes lock. The world fades.', action: 'You refuse to look away.', dialogue: '"I see you."' },
        { id: 'hesitation', title: 'Hesitation', desc: 'A moment of doubt.', action: 'You pause, heart racing.', dialogue: '"Are we sure?"' },
        { id: 'reckoning', title: 'Reckoning', desc: 'Consequences arrive.', action: 'The reality sets in.', dialogue: '"There is no going back."' },
        { id: 'surrender', title: 'Surrender', desc: 'Giving in completely.', action: 'You let go of control.', dialogue: '"I am yours."' }
    ];

    window.initCards = function() {
        const mount = document.getElementById('cardMount');
        if(!mount) return;
        
        // Reset if we need a clean slate or it's empty
        mount.innerHTML = '';
        
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
            
            // Optional: Check if we should lock based on tier (currently open)
            // const isLocked = window.state.access === 'free' && i > 2; 
            
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
                // If the card itself has a lock class manually added
                if(card.classList.contains('locked')) {
                    if(window.showPaywall) window.showPaywall('unlock');
                    return;
                }
                
                // Flip animation
                card.classList.add('flipped');
                
                // Apply content to inputs after animation delay
                setTimeout(() => {
                    const actInput = document.getElementById('actionInput');
                    const diaInput = document.getElementById('dialogueInput');
                    if(actInput) actInput.value = data.action;
                    if(diaInput) diaInput.value = data.dialogue;
                    
                    // Poof effect
                    card.classList.add('poof');
                    
                    // Cleanup visual after poof finishes
                    setTimeout(() => {
                        card.style.visibility = 'hidden'; 
                    }, 600);
                }, 600);
            };
            
            mount.appendChild(card);
        });
    };

})(window);