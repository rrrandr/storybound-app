(function(window){
    // Card Definitions
    const fateDeck = [
        { id: 'temptation', title: 'Temptation', desc: 'A sudden, overwhelming urge.', action: 'You feel a pull towards something forbidden.', dialogue: '"I shouldn\'t..."' },
        { id: 'confession', title: 'Confession', desc: 'A secret spills out.', action: 'The truth burns on your tongue.', dialogue: '"There is something I must tell you."' },
        { id: 'boundary', title: 'Boundary', desc: 'A line is drawn or crossed.', action: 'You step back, or push forward.', dialogue: '"Stop." / "More."' },
        { id: 'power', title: 'Power Shift', desc: 'Control changes hands.', action: 'You take the lead, or surrender it.', dialogue: '"Look at me."' },
        { id: 'silence', title: 'Silence', desc: 'Words fail. Actions speak.', action: 'You let the quiet do the work.', dialogue: '(Silence)' },
        { id: 'touch', title: 'The Touch', desc: 'Skin against skin.', action: 'You reach out.', dialogue: '(Gasp)' },
        { id: 'gaze', title: 'The Gaze', desc: 'Eyes lock. The world fades.', action: 'You refuse to look away.', dialogue: '"I see you."' },
        { id: 'hesitation', title: 'Hesitation', desc: 'A moment of doubt.', action: 'You pause, heart racing.', dialogue: '"Are we sure?"' },
        { id: 'reckoning', title: 'Reckoning', desc: 'Consequences arrive.', action: 'The reality sets in.', dialogue: '"There is no going back."' },
        { id: 'surrender', title: 'Surrender', desc: 'Giving in completely.', action: 'You let go of control.', dialogue: '"I am yours."' }
    ];

    window.initCards = function() {
        const mount = document.getElementById('cardMount');
        if(!mount) return;
        
        // Only re-deal if empty
        if(mount.children.length > 0) return;

        // Create 5 placeholders
        mount.innerHTML = '';
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

        // Shuffle
        const shuffled = [...fateDeck].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        state.fateOptions = selected;

        mount.innerHTML = '';
        selected.forEach((data, i) => {
            const card = document.createElement('div');
            card.className = 'fate-card';
            // Locked check logic could go here if needed, currently cards are open unless specific state
            const lockedClass = ''; 
            
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
                if(card.classList.contains('locked')) {
                    window.showPaywall('unlock');
                    return;
                }
                
                // Flip animation
                card.classList.add('flipped');
                
                // Apply content to inputs after short delay
                setTimeout(() => {
                    const actInput = document.getElementById('actionInput');
                    const diaInput = document.getElementById('dialogueInput');
                    if(actInput) actInput.value = data.action;
                    if(diaInput) diaInput.value = data.dialogue;
                    
                    // Poof effect
                    card.classList.add('poof');
                    setTimeout(() => {
                        // Reset card visual after poof (optional, or remove)
                        card.classList.remove('flipped', 'poof');
                    }, 1000);
                }, 600);
            };
            
            mount.appendChild(card);
        });
    };

})(window);