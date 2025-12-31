/* storybound-cards.js (DOM-Enhancement Version) */
(function(){
  
  var state = {
    tier: 'free',       // free|indulge
    activeCard: null,   // currently selected DOM element
    cfg: {}             // config passed from main page
  };

  function byId(id){ return document.getElementById(id); }

  function mount(cfg){
    state.cfg = cfg || {};
    var mountId = cfg.mountId || 'cardMount';
    var root = byId(mountId);

    if (!root){ 
      console.error('StoryboundCards: Root element #' + mountId + ' not found.'); 
      return; 
    }

    // 1. Find the EXISTING cards in your HTML (don't overwrite them)
    // We look for .fate-card (your current class) or .sb-card (legacy support)
    var cards = root.querySelectorAll('.fate-card, .sb-card');

    if (cards.length === 0) {
      console.warn('StoryboundCards: No cards found inside #' + mountId);
      return;
    }

    // 2. Attach logic to each existing card
    cards.forEach(function(el, idx){
      // Ensure it has an index for locking logic
      el.setAttribute('data-idx', idx);

      // Remove old listeners (by cloning) if necessary, or just add new one
      // For safety in this setup, we just add the listener.
      el.onclick = function(e){
        handleCardClick(el, idx);
      };
    });

    // 3. Apply initial locks based on default tier
    updateLocks();
  }

  function handleCardClick(el, idx){
    // A. FLIP: Always allow visual flipping
    el.classList.toggle('flipped');
    el.classList.toggle('is-flipped'); 

    // B. CHECK LOCK: Is this card allowed in the current tier?
    // (Tease Mode: Index 0 and 1 are free. Index 2+ are locked)
    var isLocked = (state.tier === 'free' && idx >= 2);

    if (isLocked) {
      // It's locked. We flipped it visually, but we DO NOT select it.
      return;
    }

    // C. SELECT: Handle radio-button behavior
    if (state.activeCard && state.activeCard !== el) {
      state.activeCard.classList.remove('selected');
      state.activeCard.classList.remove('is-selected');
    }
    state.activeCard = el;
    el.classList.add('selected');
    el.classList.add('is-selected');

    // D. POPULATE: specific inputs
    populateInputs(el);
  }

  function populateInputs(cardEl){
    var actionInput = byId(state.cfg.actionId || 'actionInput');
    var dialogueInput = byId(state.cfg.dialogueId || 'dialogueInput');
    var submitBtn = byId(state.cfg.submitId || 'sendBtn');

    // Read data attributes from your HTML
    // Note: The HTML uses data-do="..." and data-say="..."
    var doText = cardEl.getAttribute('data-do') || cardEl.getAttribute('data-action') || '';
    var sayText = cardEl.getAttribute('data-say') || cardEl.getAttribute('data-dialogue') || '';

    if (actionInput) {
      actionInput.value = doText;
      actionInput.disabled = false;     // Unlock input
      actionInput.classList.remove('is-locked', 'sb-locked');
    }
    
    if (dialogueInput) {
      dialogueInput.value = sayText;
      dialogueInput.disabled = false;   // Unlock input
      dialogueInput.classList.remove('is-locked', 'sb-locked');
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-locked', 'sb-locked');
    }
  }

  function updateLocks(){
    var root = byId(state.cfg.mountId || 'cardMount');
    if (!root) return;

    var cards = root.querySelectorAll('.fate-card, .sb-card');
    cards.forEach(function(el, idx){
      // Tease Rule: Index 2, 3, 4 are locked
      var isLocked = (state.tier === 'free' && idx >= 2);

      if (isLocked){
        el.classList.add('sb-select-locked');
        // Optional: Add visual lock indicator if your CSS supports it
      } else {
        el.classList.remove('sb-select-locked');
      }
    });
  }

  function setTier(t){
    state.tier = (t === 'indulge' ? 'indulge' : 'free');
    updateLocks();
    
    // If we just downgraded to free, and a premium card was selected, deselect it
    if (state.tier === 'free' && state.activeCard) {
      var idx = parseInt(state.activeCard.getAttribute('data-idx') || '0');
      if (idx >= 2) {
        state.activeCard.classList.remove('selected', 'is-selected');
        state.activeCard = null;
        // Optionally clear inputs here if you want
      }
    }
  }

  // --- Stubs for other calls if your main app tries to use them ---
  function setSelections(obj){ /* stored for future logic if needed */ }
  function setIntensity(val){ /* stored for future logic if needed */ }
  function burnAndRedeal(){ /* animation hook */ }

  // --- EXPORT ---
  window.StoryboundCards = {
    mount: mount,
    setTier: setTier,
    setSelections: setSelections,
    setIntensity: setIntensity,
    burnAndRedeal: burnAndRedeal
  };

})();
