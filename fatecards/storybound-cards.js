(function(){
  // Canonical 5 cards (locked)
  var CARDS = [
    { key:'temptation', label:'Temptation', sig:'T', art:'/fatecards/art/temptation.jpg' },
    { key:'confession', label:'Confession', sig:'C', art:'/fatecards/art/confession.jpg' },
    { key:'boundary', label:'Boundary', sig:'B', art:'/fatecards/art/boundary.jpg' },
    { key:'power-shift', label:'Power Shift', sig:'P', art:'/fatecards/art/power-shift.jpg' },
    { key:'silence', label:'Silence', sig:'S', art:'/fatecards/art/silence.jpg' },
  ];

  var state = {
    mounted: false,
    mountEl: null,
    intensity: 'clean', // clean|naughty|erotic|dirty
    selectedKey: null
  };

  function intensityPct(intensity){
    if (intensity === 'clean') return 25;
    if (intensity === 'naughty') return 55;
    if (intensity === 'erotic') return 78;
    return 92; // dirty
  }

  function safeImg(url){
    // if you don't provide art images, we still render a nice “no-art” gradient
    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = function(){
      img.style.display = 'none';
      if (img.parentNode){
        img.parentNode.style.background =
          'radial-gradient(circle at 35% 30%, rgba(255,215,0,.12), transparent 55%), ' +
          'linear-gradient(135deg, rgba(255,20,147,.12), rgba(0,0,0,.85))';
      }
    };
    img.src = url;
    return img;
  }

  function el(tag, cls){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function render(){
    if (!state.mountEl) return;

    state.mountEl.innerHTML = '';

    var wrap = el('div','sb-cards-wrap');
    var hand = el('div','sb-hand');

    var pct = intensityPct(state.intensity);

    CARDS.forEach(function(c, i){
      var slot = el('div','sb-slot');
      slot.setAttribute('data-i', String(i));

      if (state.selectedKey === c.key) slot.classList.add('sb-selected');
      else if (state.selectedKey) slot.classList.add('sb-dim');

      var card = el('div','sb-card');
      var inner = el('div','sb-inner');

      var back = el('div','sb-face sb-back');
      var badge = el('div','sb-badge');

      var sig = el('div','sb-sig'); sig.textContent = c.sig;
      var lbl = el('div','sb-lbl'); lbl.textContent = c.label;

      badge.appendChild(sig);
      badge.appendChild(lbl);
      back.appendChild(badge);

      var bar = el('div','sb-intensity');
      var fill = el('div'); fill.style.width = pct + '%';
      bar.appendChild(fill);
      back.appendChild(bar);

      var front = el('div','sb-face sb-front');
      front.appendChild(safeImg(c.art));

      inner.appendChild(back);
      inner.appendChild(front);
      card.appendChild(inner);
      slot.appendChild(card);

      card.addEventListener('click', function(){
        state.selectedKey = (state.selectedKey === c.key) ? null : c.key;
        render();
      });

      hand.appendChild(slot);
    });

    wrap.appendChild(hand);
    state.mountEl.appendChild(wrap);
  }

  function burnAndRedeal(){
    if (!state.mountEl) return;
    state.selectedKey = null;

    // “poof” animation
    var slots = state.mountEl.querySelectorAll('.sb-slot');
    for (var i=0;i<slots.length;i++){
      slots[i].classList.add('sb-poof');
    }
    setTimeout(function(){
      render();
    }, 260);
  }

  function mount(opts){
    if (state.mounted) return;
    var id = (opts && opts.mountId) ? opts.mountId : null;
    if (!id) throw new Error('StoryboundCards.mount requires { mountId }');

    var elMount = document.getElementById(id);
    if (!elMount) throw new Error('Mount element not found: #' + id);

    state.mountEl = elMount;
    state.mounted = true;
    render();
  }

  function setIntensity(intensity){
    state.intensity = intensity || 'clean';
    render();
  }

  window.StoryboundCards = {
    mount: mount,
    burnAndRedeal: burnAndRedeal,
    setIntensity: setIntensity,
    getSelected: function(){ return state.selectedKey; }
  };
})();
