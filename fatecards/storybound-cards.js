/* storybound-cards.js */
(function(){
  var state = {
    tier: 'free',
    hasFlippedOnce: false,
    selectedCard: null,
    cfg: {}
  };

  function byId(id){ return document.getElementById(id); }

  function mount(cfg){
    state.cfg = cfg || {};
    var root = byId(cfg.mountId || 'cardMount');
    if (!root) return;

    var cards = root.querySelectorAll('.fate-card');
    
    cards.forEach(function(el, idx){
      el.setAttribute('data-idx', idx);
      el.onclick = function(e){ handleCardClick(el, idx, cards); };
    });

    applyLocks();
  }

  function handleCardClick(clickedEl, idx, allCards){
    // 1. FIRST FLIP EVENT (Global)
    if (!state.hasFlippedOnce) {
      state.hasFlippedOnce = true;
      
      // Flip ALL cards immediately
      allCards.forEach(function(c){ c.classList.add('flipped'); });

      // If Tease Mode: Wait 4s, then flip back the locked ones (indices 2, 3, 4)
      if (state.tier === 'free') {
        setTimeout(function(){
          allCards.forEach(function(c, i){
            if (i >= 2) c.classList.remove('flipped'); // Hide them again
          });
        }, 4000);
      }
      return; // Don't select on the very first "reveal" click
    }

    // 2. CHECK LOCKS
    var isLocked = (state.tier === 'free' && idx >= 2);
    if (isLocked) return; // Locked cards don't respond after the initial show

    // 3. FLIP (Individual toggle allowed for unlocked cards)
    // clickedEl.classList.toggle('flipped'); // Optional: if you want them to toggle back/forth

    // 4. SELECT
    if (state.selectedCard && state.selectedCard !== clickedEl) {
      state.selectedCard.classList.remove('selected');
    }
    state.selectedCard = clickedEl;
    clickedEl.classList.add('selected');

    // 5. POPULATE INPUTS
    var say = clickedEl.getAttribute('data-say');
    var doAction = clickedEl.getAttribute('data-do');
    
    var dInput = byId(state.cfg.dialogueId || 'dialogueInput');
    var aInput = byId(state.cfg.actionId || 'actionInput');

    if(dInput) dInput.value = say || '';
    if(aInput) aInput.value = doAction || '';
  }

  function applyLocks(){
    var root = byId(state.cfg.mountId || 'cardMount');
    if(!root) return;
    var cards = root.querySelectorAll('.fate-card');
    cards.forEach(function(c, i){
      if(state.tier === 'free' && i >= 2) c.classList.add('sb-locked-card');
      else c.classList.remove('sb-locked-card');
    });
  }

  function setTier(t){
    state.tier = t;
    state.hasFlippedOnce = false; // Reset flip logic on tier change
    applyLocks();
  }

  // Submit animation
  function poofAndClear(){
    var root = byId(state.cfg.mountId || 'cardMount');
    if(!root) return;
    var cards = root.querySelectorAll('.fate-card');
    
    cards.forEach(function(c, i){
      setTimeout(function(){
        c.classList.add('poof');
        setTimeout(function(){ c.classList.remove('flipped', 'selected', 'poof'); }, 600);
      }, i * 100);
    });
    
    state.hasFlippedOnce = false; // Reset for next hand
    state.selectedCard = null;
  }

  window.StoryboundCards = {
    mount: mount,
    setTier: setTier,
    poof: poofAndClear
  };
})();
