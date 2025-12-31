/* storybound-cards.js (static-friendly) */
(function(){
  var state = {
    mounted: false,
    tier: 'free',              // free|indulge
    selections: {},
    chosenIndex: null,
    cards: []
  };

  function byId(id){ return document.getElementById(id); }

  function mount(cfg){
    cfg = cfg || {};
    var mountId = cfg.mountId || 'cardMount';

    var root = byId(mountId);
    if (!root){ console.error('StoryboundCards mount: missing #' + mountId); return; }

    state.cfg = cfg;
    state.mounted = true;

    root.innerHTML = (
      '<div class="sb-cards-wrap">' +
        '<div class="sb-hand" id="sbHand"></div>' +
      '</div>'
    );

    // Simple starter deck (replace later with your real Fatecard data)
    state.cards = [
      { title:'Whispered Bargain', action:'You step closer, testing the edge of consent with a velvet dare.', dialogue:'"Tell me what you want… and don’t lie."' },
      { title:'Dangerous Smile', action:'You hold their gaze, letting the power imbalance flicker—controlled, deliberate.', dialogue:'"Careful. I bite back."' },
      { title:'Velvet Threat', action:'You circle them like a promise you can’t take back.', dialogue:'"Say yes… or make me earn it."' },
      { title:'Golden Leverage', action:'You offer a deal that sounds sweet—until the hook reveals itself.', dialogue:'"If you want it, you’ll pay in honesty."' },
      { title:'Door With Teeth', action:'You cross the threshold anyway. The trap is half the thrill.', dialogue:'"I know it’s dangerous. I’m still here."' }
    ];

    render();
  }

  function render(){
    var hand = document.getElementById('sbHand');
    if (!hand) return;

    hand.innerHTML = '';
    state.cards.forEach(function(card, idx){
      var disabled = (state.tier === 'free' && idx > 1); // Tease: only first two selectable
      var isSelected = (state.chosenIndex === idx);

      var el = document.createElement('div');
      el.className = 'sb-card' +
        (disabled ? ' is-disabled' : '') +
        (isSelected ? ' is-selected' : '');
      el.setAttribute('data-idx', String(idx));

      el.innerHTML =
        '<div class="sb-face sb-front">' +
          '<div style="text-align:center;padding:10px">' +
            '<div style="font-family:inherit;font-size:0.95em;opacity:0.9">FATE</div>' +
            '<div style="margin-top:8px;font-size:1.05em;line-height:1.2">' + escapeHTML(card.title) + '</div>' +
            (disabled ? '<div style="margin-top:10px;font-size:0.9em;opacity:0.85;color:#ffd700">🔒 Indulge</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="sb-face sb-back">' +
          '<div style="padding:12px;font-size:0.95em;line-height:1.35;text-align:left">' +
            '<div style="opacity:0.85;margin-bottom:8px"><b>Action</b>: ' + escapeHTML(card.action) + '</div>' +
            '<div style="opacity:0.9"><b>Say</b>: ' + escapeHTML(card.dialogue) + '</div>' +
          '</div>' +
        '</div>';

      el.addEventListener('click', function(){
        // Flip always (even if disabled)
        el.classList.toggle('is-flipped');

        // Selection only if allowed
        if (disabled) return;

        state.chosenIndex = idx;
        fillInputs(card);
        render(); // update selected outlines
      });

      hand.appendChild(el);
    });
  }

  function fillInputs(card){
    var cfg = state.cfg || {};
    var actionEl = byId(cfg.actionId || 'actionInput');
    var dialogueEl = byId(cfg.dialogueId || 'dialogueInput');

    if (actionEl) actionEl.value = card.action || '';
    if (dialogueEl) dialogueEl.value = card.dialogue || '';
  }

  function setTier(t){
    state.tier = (t === 'indulge') ? 'indulge' : 'free';
    // If tease and currently-selected card is >1, clear it
    if (state.tier === 'free' && state.chosenIndex != null && state.chosenIndex > 1){
      state.chosenIndex = null;
    }
    render();
  }

  function setSelections(obj){
    state.selections = obj || {};
  }

  function burnAndRedeal(){
    // optional hook for your submit button
    state.chosenIndex = null;
    render();
  }

  function escapeHTML(str){
    return (str || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  window.StoryboundCards = {
    mount: mount,
    setTier: setTier,
    setSelections: setSelections,
    burnAndRedeal: burnAndRedeal
  };
})();
