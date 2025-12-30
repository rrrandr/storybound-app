/* storybound-cards.js (static, no build tools) */
(function(){
  var state = {
    mountId: null,
    actionId: null,
    dialogueId: null,
    submitId: null,
    getTier: function(){ return 'free'; },
    intensity: 'naughty',
    selectedIndex: null
  };

  var CARDS = [
    { title:'Gilded Provocation', tease:true,  fillA:'I step closer, letting the silence dare them.', fillD:'Careful—your confidence is showing.' },
    { title:'Velvet Ultimatum',    tease:true,  fillA:'I offer a choice that sounds like mercy.',      fillD:'Pick wisely. I enjoy watching you decide.' },
    { title:'Hostile Attraction',  tease:false, fillA:'I turn the tension into a weapon I can aim.',   fillD:'You keep looking at me like you want a fight.' },
    { title:'Leverage & Lace',     tease:false, fillA:'I trade a secret for a touch—on my terms.',     fillD:'Let’s negotiate. Slowly.' },
    { title:'Ruinous Kiss',        tease:false, fillA:'I close the distance like I own it.',           fillD:'Say “stop” if you don’t mean it.' }
  ];

  function $(id){ return document.getElementById(id); }

  function ensureStyles(){
    if (document.getElementById('sbCardsInjectedStyles')) return;
    var s = document.createElement('style');
    s.id = 'sbCardsInjectedStyles';
    s.textContent = `
      .sb-hand{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;align-items:start}
      @media (max-width:820px){.sb-hand{grid-template-columns:repeat(3,minmax(0,1fr))}}
      .sb-card{width:100%;aspect-ratio:2/3;border-radius:14px;position:relative;transform-style:preserve-3d;transition:transform 260ms ease, box-shadow 260ms ease;box-shadow:0 10px 28px rgba(0,0,0,.35)}
      .sb-card:hover{transform:translateY(-4px)}
      .sb-card.is-flipped{transform:rotateY(180deg)}
      .sb-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:center}
      .sb-front{background:radial-gradient(circle at 30% 20%, rgba(255,105,180,.35), rgba(30,30,30,.95));border:1px solid rgba(255,105,180,.25)}
      .sb-back{transform:rotateY(180deg);background:rgba(10,10,10,.9);border:1px solid rgba(255,215,0,.25);padding:12px;text-align:center;line-height:1.25}
      .sb-card.sb-disabled{opacity:.45;pointer-events:none;filter:grayscale(.35)}
      .sb-burn{animation:sbBurn 520ms ease forwards}
      @keyframes sbBurn{to{opacity:0;transform:translateY(10px) scale(.98)}}
    `;
    document.head.appendChild(s);
  }

  function getTier(){
    try{
      // allow either global var name or window.tier directly
      if (typeof window.tier === 'string') return window.tier === 'indulge' ? 'indulge' : 'free';
      return state.getTier();
    }catch(e){
      return 'free';
    }
  }

  function lockTeaseCards(){
    var tier = getTier();
    var hand = $(state.mountId);
    if (!hand) return;

    var cardEls = hand.querySelectorAll('.sb-card');
    cardEls.forEach(function(el){
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var isAllowed = (tier !== 'free') || (idx === 0 || idx === 1);
      el.classList.toggle('sb-disabled', !isAllowed);
    });
  }

  function writeToInputs(idx){
    var c = CARDS[idx];
    var a = $(state.actionId);
    var d = $(state.dialogueId);
    if (a) a.value = c.fillA || '';
    if (d) d.value = c.fillD || '';
  }

  function render(){
    ensureStyles();
    var mount = $(state.mountId);
    if (!mount) return;

    mount.innerHTML = '';
    var hand = document.createElement('div');
    hand.className = 'sb-hand';

    CARDS.forEach(function(c, idx){
      var card = document.createElement('div');
      card.className = 'sb-card';
      card.setAttribute('data-idx', String(idx));
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');

      var front = document.createElement('div');
      front.className = 'sb-face sb-front';
      front.innerHTML = '<div style="font-weight:700;letter-spacing:0.04em;opacity:.95">Fate</div>';

      var back = document.createElement('div');
      back.className = 'sb-face sb-back';
      back.innerHTML =
        '<div style="font-weight:700;margin-bottom:6px;color:#ffd700">'+ c.title +'</div>' +
        '<div style="font-size:0.95em;opacity:.9">Click to choose this beat.</div>';

      card.appendChild(front);
      card.appendChild(back);

      card.addEventListener('click', function(){
        // if disabled in Tease
        if (card.classList.contains('sb-disabled')) return;

        // flip & persist
        card.classList.add('is-flipped');
        state.selectedIndex = idx;

        // populate inputs
        writeToInputs(idx);
      });

      hand.appendChild(card);
    });

    mount.appendChild(hand);
    lockTeaseCards();
  }

  function burnAndRedeal(){
    var mount = $(state.mountId);
    if (!mount) return;
    var cards = mount.querySelectorAll('.sb-card');
    cards.forEach(function(c){ c.classList.add('sb-burn'); });
    setTimeout(function(){
      state.selectedIndex = null;
      render();
    }, 540);
  }

  window.StoryboundCards = {
    mount: function(cfg){
      cfg = cfg || {};
      // allow global config too
      var g = window.STORYBOUND_CARDS_CONFIG || {};

      state.mountId = cfg.mountId || g.mountId || 'cardMount';
      state.actionId = cfg.actionId || g.actionId || 'actionInput';
      state.dialogueId = cfg.dialogueId || g.dialogueId || 'dialogueInput';
      state.submitId = cfg.submitId || g.submitId || 'sendBtn';

      // Optional: let page supply a tier getter
      if (typeof cfg.getTier === 'function') state.getTier = cfg.getTier;

      render();
      return true;
    },
    setIntensity: function(val){
      state.intensity = val || 'naughty';
    },
    applyTeaseCardLimits: function(){
      lockTeaseCards();
    },
    burnAndRedeal: burnAndRedeal
  };
})();
