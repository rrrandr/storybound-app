/* ─────────────────────────────────────────────────────────────────────────────
 * guide-preview.js — the between-scenes "story intermission" (loading screen as an
 * in-world Traveler's-Guide reader), in TWO modes: a homepage PREVIEW harness, and a
 * LIVE curtain wired to the real generation lifecycle. Does NOT edit app.js/styles.css/
 * the #loadingOverlay pipeline — LIVE mode only OBSERVES window.state + the
 * 'sb:scene-page-added' event and lays its own overlay over the real flow.
 * It drives the REAL guide-entries.js selection model so what you see is what the
 * shipped feature will do. Requires guide-entries.js to load first.
 *
 * Adds a discreet shortcut on the homepage → opens the intermission. Above the bar:
 * dummy between-scenes recap copy. Middle: a book, opened to a spread, that you can
 * page through / re-draw per world. Bar animates ~2–4 min, then becomes "Next scene
 * ready → Continue". Concept tags stay invisible (players browse books, not concepts).
 * ───────────────────────────────────────────────────────────────────────────── */
(function () {
  if (window.__gpInit) return;
  window.__gpInit = true;

  // ---- dummy between-scenes recap (world-neutral romance intermission) ----
  var RECAP = {
    kicker: 'Previously',
    bullets: [
      "You told him the truth on the terrace; he didn't look away.",
      "The tide came in below; a door stayed open behind you.",
      "You chose to stay, and said nothing.",
      "What holds you here: the letter he hasn't mentioned."
    ]
  };

  var STATUS = [
    'Composing the next scene…', 'Setting the stage…', 'Consulting the fates…',
    'Deciding who speaks first…', 'Letting the moment breathe…', 'Turning toward what happens next…'
  ];
  var HINTS = [
    'The Guide is older than your story — and does not always agree with it.',
    'No two copies of a Guide are quite the same.',
    'Turn a page; your next scene will wait for you.',
    'Some volumes are common. A few are nearly lost.',
    'Every book here was written by someone who believed it.'
  ];

  var DISC_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', restricted: 'Restricted', lost: 'Lost' };

  var state = { pub: null, left: 1, paged: null, world: '', raf: 0, start: 0, dur: 0, done: false };

  // ---------------------------------------------------------------- styles ----
  var STYLE = [
    '#gpOverlay{position:fixed;inset:0;z-index:10000;display:none;flex-direction:column;',
      'background:radial-gradient(120% 90% at 50% -10%,#1b1526 0%,#0e0b14 60%,#080610 100%);',
      'color:#e9dcc4;font-family:Georgia,"Iowan Old Style","Times New Roman",serif;',
      'overflow-y:auto;padding:clamp(16px,4vw,40px);animation:gpFade .5s ease both;transition:opacity .3s ease;}',
    '#gpOverlay.gp-open{display:flex;}',
    '#gpOverlay.gp-fading{opacity:0;}',
    '@keyframes gpFade{from{opacity:0}to{opacity:1}}',
    '.gp-shell{width:100%;max-width:920px;margin:0 auto;display:flex;flex-direction:column;gap:clamp(18px,3vw,32px);}',
    '.gp-close{position:fixed;top:14px;right:16px;z-index:2;background:none;border:1px solid rgba(201,168,106,.4);',
      'color:#c9a86a;width:34px;height:34px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;}',
    '.gp-close:hover{background:rgba(201,168,106,.14);}',
    // top zone: recap + primary loader, TIGHT (no viewport-fill) so the guide is visible
    '.gp-top{display:flex;flex-direction:column;gap:14px;}',
    '.gp-recap{text-align:center;}',
    '.gp-kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#c9a86a;opacity:.85;margin-bottom:16px;}',
    '.gp-bullets{list-style:none;padding:0;margin:0 auto;max-width:56ch;display:flex;flex-direction:column;gap:10px;}',
    '.gp-bullets li{position:relative;padding-left:22px;font-size:clamp(15px,1.9vw,17px);line-height:1.45;color:#d8ccb4;font-style:italic;text-align:left;}',
    '.gp-bullets li::before{content:"❧";position:absolute;left:0;top:0;color:#c9a86a;font-style:normal;opacity:.7;}',
    '.gp-rule{width:64px;height:1px;background:linear-gradient(90deg,transparent,#c9a86a,transparent);margin:18px auto 0;}',
    // book
    '.gp-bookwrap{display:flex;flex-direction:column;align-items:center;gap:12px;}',
    '.gp-intro{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9c8b6b;text-align:center;}',
    '.gp-book{position:relative;width:100%;max-width:720px;background:linear-gradient(180deg,#f4ead6,#ece0c8);',
      'color:#2b2118;border-radius:6px;padding:clamp(22px,3.4vw,40px) clamp(20px,4vw,52px);',
      'font-family:var(--gp-body,Georgia,"Iowan Old Style","Times New Roman",serif);',
      'box-shadow:0 30px 70px rgba(0,0,0,.55),0 2px 0 #d9cba9,inset 0 0 0 1px rgba(120,96,52,.18);}',
    // ── per-world typography (each civilization sets --gp-body + --gp-title) ──
    ".gp-world-modern{--gp-body:'Lora',Georgia,serif;--gp-title:'Lora',Georgia,serif;}",
    ".gp-world-historical{--gp-body:'EB Garamond',Georgia,serif;--gp-title:'EB Garamond',Georgia,serif;}",
    ".gp-world-fatelands{--gp-body:'MedievalSharp',Georgia,serif;--gp-title:'Uncial Antiqua','MedievalSharp',serif;}",
    ".gp-world-dystopia{--gp-body:'Zilla Slab',Georgia,serif;--gp-title:'Zilla Slab',Georgia,serif;}",
    ".gp-world-scifi{--gp-body:'Chakra Petch',system-ui,sans-serif;--gp-title:'Orbitron','Chakra Petch',sans-serif;}",
    ".gp-world-postapocalyptic{--gp-body:'Special Elite','Courier New',monospace;--gp-title:'Architects Daughter','Special Elite',cursive;}",
    // display-only faces are titles only; body stays the readable partner above
    '.gp-btitle,.gp-etitle{font-family:var(--gp-title,var(--gp-body,inherit));}',
    '.gp-world-postapocalyptic .gp-btitle,.gp-world-postapocalyptic .gp-etitle{text-transform:uppercase;letter-spacing:.03em;}',
    '.gp-world-dystopia .gp-btitle{font-weight:700;letter-spacing:-0.01em;}',
    '.gp-world-scifi .gp-btitle{letter-spacing:.06em;text-transform:uppercase;}',
    '.gp-world-fatelands .gp-page{line-height:1.68;}', // MedievalSharp runs tall
    '.gp-world-scifi .gp-page,.gp-world-postapocalyptic .gp-page{font-size:clamp(13px,1.7vw,15px);}', // mono/techy read larger
    // decorative center crease
    '.gp-book::before{content:"";position:absolute;top:14px;bottom:14px;left:50%;width:2px;transform:translateX(-1px);',
      'background:linear-gradient(180deg,transparent,rgba(120,96,52,.28),transparent);pointer-events:none;}',
    '.gp-bhead{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:1px solid rgba(120,96,52,.28);',
      'padding-bottom:10px;margin-bottom:16px;flex-wrap:wrap;}',
    '.gp-btitle{font-size:clamp(17px,2.3vw,22px);font-weight:600;letter-spacing:.01em;color:#3a2c17;}',
    '.gp-bedition{font-size:12px;font-style:italic;color:#7a6543;}',
    '.gp-chiprow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}',
    '.gp-chip{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:20px;',
      'border:1px solid rgba(120,96,52,.4);color:#6b5836;}',
    '.gp-chip.gp-disc-rare,.gp-chip.gp-disc-restricted,.gp-chip.gp-disc-lost{border-color:#a9702a;color:#8a4e12;background:rgba(169,112,42,.08);}',
    '.gp-page{font-size:clamp(14px,1.8vw,16px);line-height:1.72;column-gap:44px;}',
    '.gp-entry{break-inside:avoid;margin:0 0 18px;}',
    '.gp-etitle{font-size:15.5px;font-weight:600;color:#3a2c17;margin:0 0 2px;}',
    '.gp-emeta{font-size:11px;font-style:italic;color:#8a7550;margin:0 0 7px;}',
    '.gp-entry p{margin:0 0 10px;}',
    '.gp-margin{margin:8px 0;padding:8px 12px;border-left:2px solid rgba(169,112,42,.5);background:rgba(169,112,42,.06);',
      'font-size:12.5px;font-style:italic;color:#6b5836;}',
    '.gp-margin b{font-style:normal;font-weight:600;color:#8a4e12;}',
    '.gp-bfoot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;',
      'border-top:1px solid rgba(120,96,52,.22);padding-top:10px;font-size:12px;color:#7a6543;flex-wrap:wrap;}',
    '.gp-prov{font-style:italic;}',
    '.gp-pageno{letter-spacing:.06em;}',
    // controls
    '.gp-controls{display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;}',
    '.gp-btn{background:rgba(201,168,106,.1);border:1px solid rgba(201,168,106,.45);color:#e6d3a6;',
      'padding:8px 15px;border-radius:22px;font:inherit;font-size:13px;cursor:pointer;transition:background .15s;}',
    '.gp-btn:hover:not(:disabled){background:rgba(201,168,106,.22);}',
    '.gp-btn:disabled{opacity:.35;cursor:default;}',
    '.gp-sel{background:#160f22;border:1px solid rgba(201,168,106,.4);color:#e6d3a6;padding:7px 12px;border-radius:20px;font:inherit;font-size:13px;}',
    // loader block — repeated: primary (centered, top) + foot (for scroll-down readers)
    '.gp-loader{text-align:center;width:100%;}',
    '.gp-loader-primary{margin-top:2px;}',
    '.gp-loader-foot{margin-top:12px;padding-top:22px;border-top:1px solid rgba(201,168,106,.12);}',
    '.gp-status{font-size:13.5px;color:#c3b389;letter-spacing:.06em;margin-bottom:12px;min-height:18px;font-style:italic;}',
    '.gp-hint{font-size:12px;color:#8c7c5c;margin:12px auto 0;max-width:52ch;line-height:1.5;}',
    // the loader visual is the real card-flip row (.fate-loading-row / .fate-loading-card),
    // styled by the app's global styles.css — no bar styles needed here.
    '.gp-flip{margin:12px auto;}',
    // continue (replaces bar)
    '.gp-continue{display:none;justify-content:center;margin-top:4px;}',
    '.gp-continue.gp-show{display:flex;animation:gpFade .5s ease both;}',
    '.gp-cbtn{background:linear-gradient(180deg,#e6c987,#c9a86a);color:#241a08;border:none;padding:13px 30px;',
      'border-radius:26px;font:inherit;font-weight:700;font-size:15px;letter-spacing:.02em;cursor:pointer;',
      'box-shadow:0 10px 26px rgba(201,168,106,.4);}',
    '.gp-cbtn:hover{filter:brightness(1.06);}',
    '.gp-ready{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#c9a86a;margin-bottom:10px;text-align:center;}',
    // homepage trigger
    // trigger: joins the localhost dev-button stack (bottom-right), circular gold/dark
    // to match the ✡ Mock-Mode toggle (bottom:168px) and intimacy launcher (bottom:116px).
    '#gpTrigger{position:fixed;bottom:220px;right:20px;z-index:999999;width:40px;height:40px;padding:0;',
      'display:flex;align-items:center;justify-content:center;border-radius:50%;background:#222;color:#c9a24e;',
      'border:1px solid #444;cursor:pointer;font-size:18px;line-height:1;box-shadow:0 2px 10px rgba(0,0,0,.5);}',
    '#gpTrigger:hover{background:#2c2c2c;border-color:#c9a24e;}',
    // live mode hides the close-to-home ×; the world picker + turn/draw controls stay.
    '.gp-live #gpClose{display:none;}',
    '@media(max-width:640px){.gp-page{column-count:1!important;}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('gp-style')) return;
    var s = document.createElement('style');
    s.id = 'gp-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }
  // per-world book fonts (the app already loads Google Fonts, so this is CSP-safe)
  function injectFonts() {
    if (document.getElementById('gp-fonts')) return;
    var l = document.createElement('link');
    l.id = 'gp-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400' +
      '&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Uncial+Antiqua&family=MedievalSharp' +
      '&family=Zilla+Slab:wght@400;600;700&family=Orbitron:wght@500;700&family=Chakra+Petch:wght@400;500' +
      '&family=Special+Elite&family=Architects+Daughter&display=swap';
    document.head.appendChild(l);
  }

  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }

  // -------------------------------------------------- data helpers (real model)
  function paginate(pub) {
    return (window._guidePaginateBook ? window._guidePaginateBook(pub) : { totalPages: 1, entries: [] });
  }
  function draw(world) {
    if (!window._guidePickBookThenPage) return null;
    var r = window._guidePickBookThenPage({ world: world || undefined });
    if (!r) return null;
    state.pub = r.publication;
    state.paged = paginate(r.publication);
    // start on the same spread the picker chose
    var left = r.pageStart % 2 === 1 && r.pageStart < state.paged.totalPages ? r.pageStart + 1 : r.pageStart;
    state.left = Math.max(1, left);
    state.provenance = r.provenance;
    return r;
  }

  function currentBook() {
    var P = window._GUIDE_PUBLICATIONS || {};
    return P[state.pub] || {};
  }
  function entriesOnSpread() {
    var L = state.left, R = L + 1;
    return (state.paged.entries || []).filter(function (e) { return e.endPage >= L && e.startPage <= R; });
  }

  // -------------------------------------------------------------- book render
  function renderBook() {
    var meta = currentBook();
    if (!meta.title) return '<div class="gp-book">No guide data loaded.</div>';
    var disc = meta.discovery || 'common';
    var total = state.paged.totalPages;
    var L = state.left, R = Math.min(total, L + 1);
    var chips = [
      '<span class="gp-chip gp-disc-' + disc + '">' + esc(DISC_LABEL[disc] || disc) + '</span>',
      meta.shelf ? '<span class="gp-chip">' + esc(shelfLabel(meta.shelf)) + '</span>' : ''
    ].join('');
    var body = entriesOnSpread().map(function (e) {
      var margins = (e.margin_notes || []).map(function (m) {
        return '<div class="gp-margin"><b>' + esc(m.hand) + ':</b> ' + esc(m.note) + '</div>';
      }).join('');
      var paras = String(e.body || '').split(/\n{2,}/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
      return '<div class="gp-entry"><div class="gp-etitle">' + esc(e.title) + '</div>' +
        '<div class="gp-emeta">' + esc(e.category || '') + (e.author ? ' · ' + esc(e.author) : '') + '</div>' +
        paras + margins + '</div>';
    }).join('') || '<div class="gp-entry"><p><em>(blank leaf)</em></p></div>';

    return '<div class="gp-book gp-world-' + esc(meta.world || 'modern') + '">' +
      '<div class="gp-bhead"><span class="gp-btitle">' + esc(meta.title) + '</span>' +
      (meta.edition_label ? '<span class="gp-bedition">' + esc(meta.edition_label) + '</span>' : '') + '</div>' +
      '<div class="gp-chiprow">' + chips + '</div>' +
      '<div class="gp-page" style="column-count:' + (entriesOnSpread().length > 1 ? 2 : 1) + ';">' + body + '</div>' +
      '<div class="gp-bfoot"><span class="gp-prov">' + esc(state.provenance || '') + '</span>' +
      '<span class="gp-pageno">pp. ' + L + '–' + R + ' of ' + total + '</span></div>' +
      '</div>';
  }

  function shelfLabel(slug) {
    var S = window._GUIDE_SHELVES || {};
    return (S[slug] && S[slug].label) || slug;
  }

  function refreshBook() {
    var host = document.getElementById('gpBookHost');
    if (host) host.innerHTML = renderBook();
    var total = state.paged ? state.paged.totalPages : 1;
    var back = document.getElementById('gpTurnBack'), fwd = document.getElementById('gpTurnFwd');
    if (back) back.disabled = state.left <= 1;
    if (fwd) fwd.disabled = state.left + 2 > total;
  }

  function turn(delta) {
    var total = state.paged.totalPages;
    state.left = Math.min(Math.max(1, state.left + delta * 2), Math.max(1, total - (total % 2 === 0 ? 1 : 0)));
    if (state.left < 1) state.left = 1;
    refreshBook();
    markEngaged();
  }
  function drawAnother() {
    draw(state.world);
    refreshBook();
    markEngaged();
  }

  // ---------------------------------------------------------------- the bar
  // both loader blocks update together (shared classes, not ids)
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function setAllText(sel, t) { each(sel, function (el) { el.textContent = t; }); }

  // ---- the REAL card-flip loader, replicated from app.js _startLitOverlayFlip.
  //      Per-instance timers (el._flipTimers) so the two loader rows animate independently;
  //      relies on the app's global .fate-loading-* CSS + card-art assets. ----
  var FLIP_DECK = [
    { name: 'Temptation',    front: '/assets/card-art/cards/Tarot-Gold-front-Temptation.png',    back: '/assets/card-art/cards/Tarot-Gold-back.png' },
    { name: 'Boundary',      front: '/assets/card-art/cards/Tarot-Gold-front-Boundary.png',      back: '/assets/card-art/cards/Tarot-Gold-back.png' },
    { name: 'Reversal',      front: '/assets/card-art/cards/Tarot-Gold-front-Reversal.png',      back: '/assets/card-art/cards/Tarot-Gold-back.png' },
    { name: 'Silence',       front: '/assets/card-art/cards/Tarot-Gold-front-Silence.png',       back: '/assets/card-art/cards/Tarot-Gold-back.png' },
    { name: 'Confession',    front: '/assets/card-art/cards/Tarot-Gold-front-Confession.png',    back: '/assets/card-art/cards/Tarot-Gold-back.png' },
    { name: 'Petition Fate', front: '/assets/card-art/cards/Tarot-Gold-PetitionFate-front.png',  back: '/assets/card-art/cards/Tarot-Gold-back-PetitionFate.png' },
    { name: 'Tempt Fate',    front: '/assets/card-art/cards/Tarot-RED-front-TemptFate.png',       back: '/assets/card-art/cards/Tarot-RED-back-TemptFate.png' }
  ];
  function startFlip(rowEl) {
    if (!rowEl) return;
    stopFlip(rowEl);
    rowEl.innerHTML = FLIP_DECK.map(function (c, i) {
      return '<div class="fate-loading-card" data-idx="' + i + '" title="' + esc(c.name) + '">' +
        '<div class="fate-loading-card-inner">' +
        '<img class="fate-loading-card-face fate-loading-card-back" src="' + c.back + '" alt="" aria-hidden="true" />' +
        '<img class="fate-loading-card-face fate-loading-card-front" src="' + c.front + '" alt="' + esc(c.name) + '" />' +
        '</div></div>';
    }).join('');
    var INITIAL_HOLD = 2000, FAST = 700, PAUSE_AFTER_3 = 2000, STEADY = 2400, HOLD = 2000;
    function schedule(n) { var s = [], t = INITIAL_HOLD; for (var i = 0; i < n; i++) { s.push(t); if (i < 2) t += FAST; else if (i === 2) t += PAUSE_AFTER_3; else if (i === 3) t += FAST; else t += STEADY; } return s; }
    function cycle() {
      if (!rowEl || !document.body.contains(rowEl)) { stopFlip(rowEl); return; }
      var cards = rowEl.querySelectorAll('.fate-loading-card');
      Array.prototype.forEach.call(cards, function (c) { c.classList.remove('flipped'); });
      var sched = schedule(cards.length), timers = [];
      sched.forEach(function (d, i) { timers.push(setTimeout(function () { var live = rowEl.querySelectorAll('.fate-loading-card'); if (live[i]) live[i].classList.add('flipped'); }, d)); });
      timers.push(setTimeout(cycle, (sched.length ? sched[sched.length - 1] : 0) + HOLD));
      rowEl._flipTimers = timers;
    }
    cycle();
  }
  function stopFlip(rowEl) {
    if (rowEl && Array.isArray(rowEl._flipTimers)) rowEl._flipTimers.forEach(function (h) { try { clearTimeout(h); } catch (_) {} });
    if (rowEl) rowEl._flipTimers = null;
  }

  // ---- loader lifecycle: flip animation + rotating phrase (above) / hint (below).
  //      No progress bar — the flip is decorative (as in the real overlay); readiness is
  //      signalled by the status text + the Continue button. ----
  function startLoaders(isLive) {
    state.done = false;
    each('.gp-flip', function (el) { startFlip(el); });
    var i = 0, h = 0;
    setAllText('.gp-status', STATUS[0]);
    state.phraseTimer = setInterval(function () { i = (i + 1) % STATUS.length; setAllText('.gp-status', STATUS[i]); }, 3200);
    state.hintTimer = setInterval(function () { h = (h + 1) % HINTS.length; setAllText('.gp-hint', HINTS[h]); }, 6000);
    if (!isLive) { // preview: no real completion → finish after a realistic 2–4 min (skippable)
      state.dur = (window._GP_DURATION_MS) || Math.round(120000 + Math.random() * 120000);
      state.previewTimer = setTimeout(finishBar, state.dur);
    }
  }
  function stopLoaders() {
    each('.gp-flip', function (el) { stopFlip(el); });
    clearInterval(state.phraseTimer); clearInterval(state.hintTimer);
    if (state.previewTimer) { clearTimeout(state.previewTimer); state.previewTimer = 0; }
  }
  function showReady() {
    if (live.dismissTimer) { clearTimeout(live.dismissTimer); live.dismissTimer = 0; }
    stopLoaders();
    each('.gp-meta', function (el) { el.style.display = 'none'; });
    each('.gp-continue', function (el) { el.classList.add('gp-show'); });
  }
  function finishBar() { // preview completion (timer or "skip the wait")
    state.done = true;
    setAllText('.gp-status', 'Your next scene is ready.');
    showReady();
  }

  function recapHTML(kicker, bullets) {
    var items = (bullets || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('');
    return '<div class="gp-kicker">' + esc(kicker) + '</div>' +
      (items ? '<ul class="gp-bullets">' + items + '</ul>' : '') +
      '<div class="gp-rule"></div>';
  }

  // ---------------------------------------------------------------- overlay
  // one loader block = cute phrase (above) · card-flip row · hint (below) · Continue (when ready).
  // Rendered TWICE: primary (centered in the first viewport) + foot (for scroll-down readers).
  function loaderBlock(primary) {
    return '<div class="gp-loader ' + (primary ? 'gp-loader-primary' : 'gp-loader-foot') + '">' +
      '<div class="gp-status">' + esc(STATUS[0]) + '</div>' +
      '<div class="fate-loading-row gp-flip"></div>' +
      '<div class="gp-hint">' + esc(HINTS[0]) + '</div>' +
      '<div class="gp-continue"><div class="gp-ready">✦ Next scene ready</div>' +
        '<button class="gp-cbtn gp-continue-btn">Continue ›</button></div>' +
    '</div>';
  }
  function buildOverlay() {
    var ov = document.createElement('div');
    ov.id = 'gpOverlay';
    var worldOpts = ['<option value="">Any world</option>']
      .concat(uniqueWorlds().map(function (w) { return '<option value="' + w + '">' + esc(worldName(w)) + '</option>'; }))
      .join('');
    ov.innerHTML =
      '<button class="gp-close" id="gpClose" title="Back to homepage">&times;</button>' +
      '<div class="gp-shell">' +
        '<div class="gp-top">' +
          '<div class="gp-recap" id="gpRecap">' + recapHTML(RECAP.kicker, RECAP.bullets) + '</div>' +
          loaderBlock(true) +
        '</div>' +
        '<div class="gp-bookwrap">' +
          '<div class="gp-intro">While your next scene is composed, consider:</div>' +
          '<div id="gpBookHost" style="width:100%;display:flex;justify-content:center;"></div>' +
          '<div class="gp-controls">' +
            '<button class="gp-btn" id="gpTurnBack">‹ Turn back</button>' +
            '<button class="gp-btn" id="gpTurnFwd">Turn page ›</button>' +
            '<button class="gp-btn" id="gpDraw">Draw another volume</button>' +
            '<select class="gp-sel" id="gpWorld">' + worldOpts + '</select>' +
          '</div>' +
        '</div>' +
        loaderBlock(false) +
      '</div>';
    document.body.appendChild(ov);

    ov.querySelector('#gpClose').addEventListener('click', dismiss);
    ov.querySelector('#gpTurnBack').addEventListener('click', function () { turn(-1); });
    ov.querySelector('#gpTurnFwd').addEventListener('click', function () { turn(1); });
    ov.querySelector('#gpDraw').addEventListener('click', drawAnother);
    ov.querySelector('#gpWorld').addEventListener('change', function (e) { state.world = e.target.value; drawAnother(); });
    Array.prototype.forEach.call(ov.querySelectorAll('.gp-continue-btn'), function (el) { el.addEventListener('click', dismiss); });
    return ov;
  }

  function uniqueWorlds() {
    var P = window._GUIDE_PUBLICATIONS || {}, seen = {}, out = [];
    Object.keys(P).forEach(function (k) { var w = P[k].world; if (!seen[w]) { seen[w] = 1; out.push(w); } });
    return out;
  }
  function worldName(w) {
    return ({ fatelands: 'Fatelands (Fantasy)', modern: 'Modern', historical: 'Historical',
      dystopia: 'Dystopia', scifi: 'Sci-Fi', postapocalyptic: 'Post-Apocalypse' })[w] || w;
  }

  function openOverlay(mode, ctx) {
    mode = mode || 'preview'; ctx = ctx || {};
    if (!window._GUIDE_ENTRIES || !window._guidePickBookThenPage) {
      if (mode === 'preview') alert('Guide data not loaded — check that guide-entries.js is included before guide-preview.js.');
      return;
    }
    var ov = document.getElementById('gpOverlay') || buildOverlay();
    var isLive = (mode === 'live');
    ov.classList.toggle('gp-live', isLive);
    ov.classList.remove('gp-fading');
    if (isLive) { live.engaged = false; live.ready = false; live.cycle = (live.cycle || 0) + 1; if (live.dismissTimer) { clearTimeout(live.dismissTimer); live.dismissTimer = 0; } }
    setAllText('.gp-continue-btn', isLive ? 'Return to Story' : 'Continue ›');
    setAllText('.gp-ready', isLive ? '✦ Your next scene is ready' : '✦ Next scene ready');
    // recap: extractive fallback shown instantly; live mode then upgrades it via a tiny LLM call
    var recap = document.getElementById('gpRecap');
    if (recap) {
      var r = isLive ? composeRecap() : { kicker: RECAP.kicker, bullets: RECAP.bullets };
      recap.innerHTML = recapHTML(r.kicker, r.bullets);
    }
    state.world = isLive ? (ctx.world || '') : '';
    var wsel = document.getElementById('gpWorld'); if (wsel) wsel.value = state.world;
    draw(state.world);
    refreshBook();
    // reset BOTH loader blocks to the loading state
    each('.gp-meta', function (el) { el.style.display = ''; });
    each('.gp-continue', function (el) { el.classList.remove('gp-show'); });
    each('.gp-hint', function (el) { el.textContent = HINTS[Math.floor(Math.random() * HINTS.length)]; });
    ov.classList.add('gp-open');
    startLoaders(isLive);
    if (isLive) summarizeRecap(live.cycle);
  }
  function closeOverlay() {
    cancelAnimationFrame(state.raf);
    if (live.dismissTimer) { clearTimeout(live.dismissTimer); live.dismissTimer = 0; }
    live.active = false; live.engaged = false; live.ready = false;
    var ov = document.getElementById('gpOverlay');
    if (ov) ov.classList.remove('gp-open');
  }

  // ------------------------------------------------------ LIVE lifecycle wiring
  // A curtain over the real generation flow. START = state._isAdvancingScene flips
  // true (overlay also un-hides); FINISH = the 'sb:scene-page-added' event (the new
  // scene has mounted + auto-navigated UNDERNEATH). Continue merely lifts the curtain
  // to reveal it — no scheduling change, no app.js edits; read-only observation only.
  var live = { enabled: false, active: false, engaged: false, ready: false,
    pageAddedSinceStart: false, wasAdvancing: false, poll: 0, dismissTimer: 0,
    cycle: 0, didText: '', saidText: '' };
  function byId(id) { return document.getElementById(id); }

  function shorten13(s) {
    var w = String(s).replace(/^["'“”‘’\-–•*\s]+/, '').split(/\s+/).filter(Boolean);
    return (w.length <= 13 ? w.join(' ') : w.slice(0, 13).join(' ') + '…').replace(/[",;:]+$/, '');
  }
  function lastSceneText() {
    var t = String(window._lastSceneText || '');
    if (!t) { var sw = (window.state && window.state.sceneWindow) || []; t = sw.length ? sw[sw.length - 1] : ''; }
    return String(t).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // deterministic bullet for what the reader entered into Say/Do — GUARANTEES the say/do
  // is represented (used in the instant fallback; the LLM upgrade also summarizes it).
  function actionBullet() {
    var did = (live.didText || '').trim(), said = (live.saidText || '').trim();
    if (did && said) return shorten13('You ' + did.charAt(0).toLowerCase() + did.slice(1) + ', and said, “' + said + '”');
    if (did) return shorten13('You ' + did.charAt(0).toLowerCase() + did.slice(1));
    if (said) return shorten13('You said, “' + said + '”');
    return '';
  }
  function composeRecap() {
    try {
      var scene = lastSceneText();
      var ab = actionBullet();
      if (!scene && !ab) return { kicker: 'Your story begins', bullets: ['The page is blank, the ink still wet.'] };
      var sceneBullets = scene ? recapBullets(scene).slice(0, 2) : [];
      return { kicker: 'Previously', bullets: sceneBullets.concat(ab ? [ab] : []) };
    } catch (e) { return { kicker: '', bullets: [] }; }
  }
  // extractive fallback, no LLM: the last sentences (where we left off), each ≤13 words
  function recapBullets(txt) {
    var sents = txt.split(/(?<=[.!?"'”’])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    return sents.slice(-2).map(shorten13);
  }
  // the tiny summarization call (gpt-4o-mini via the app's chatgpt-proxy). 3 bullets, one of
  // which recaps the reader's Say/Do. Upgrades the fallback in place; keeps it if it fails.
  function summarizeRecap(cycle) {
    if (typeof fetch !== 'function') return;
    var scene = lastSceneText();
    var did = (live.didText || '').trim(), said = (live.saidText || '').trim();
    if (!scene && !did && !said) return; // scene 1 / nothing to summarize → keep "Your story begins"
    var action = [did ? 'DID: ' + did : '', said ? 'SAID: ' + said : ''].filter(Boolean).join('\n') || '(the reader waited in silence)';
    var sys = 'Write a "Previously…" recap as EXACTLY four bullet points, each 13 words or fewer, addressed to the reader as "you". ' +
      'Bullet 1: a vivid beat from the PREVIOUS SCENE. ' +
      'Bullet 2: another beat, or the feeling you were left on. ' +
      'Bullet 3: WHAT YOU CHOSE TO DO OR SAY. ' +
      'Bullet 4: WHAT YOU ARE TRYING TO ACCOMPLISH NOW, or WHAT STANDS IN YOUR WAY (your current goal or obstacle). ' +
      'Output ONLY the four lines, one bullet per line — no numbering, no dashes, no markup.';
    var body = { role: 'BACK_COVER_SYNOPSIS', model: 'gpt-4o-mini', mode: (window.state && window.state.mode) || 'solo',
      temperature: 0.4, max_tokens: 180,
      messages: [{ role: 'system', content: sys },
        { role: 'user', content: 'PREVIOUS SCENE:\n' + scene.slice(0, 1600) + '\n\nWHAT THE READER DID/SAID:\n' + action }] };
    try {
      fetch('/api/chatgpt-proxy', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (cycle !== live.cycle || !live.active) return; // a newer cycle started → discard
          var text = (d && (d.content || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content))) || '';
          var lines = text.split(/\n+/).map(function (s) { return s.replace(/^[\s\-•*\d.\)]+/, '').trim(); }).filter(Boolean).slice(0, 4).map(shorten13);
          if (lines.length < 2) return; // too thin → keep the fallback
          var recap = document.getElementById('gpRecap');
          if (recap) recap.innerHTML = recapHTML('Previously', lines);
        })
        .catch(function () { /* keep the extractive fallback */ });
    } catch (e) { /* keep fallback */ }
  }
  function captureInputs() {
    var a = document.getElementById('actionInput'), d = document.getElementById('dialogueInput');
    live.didText = a ? String(a.value || '').trim() : '';
    live.saidText = d ? String(d.value || '').trim() : '';
  }
  function storyWorldToGuide() {
    try {
      var picks = (window.state && window.state.picks) || {};
      var w = String(picks.world || picks.worldSubtype || '').toLowerCase();
      if (uniqueWorlds().indexOf(w) > -1) return w;
      if (/fant|fate/.test(w)) return 'fatelands';
      if (/hist|regen|victor|period|edwardian/.test(w)) return 'historical';
      if (/dyst|glass|chorus/.test(w)) return 'dystopia';
      if (/sci|space|star|galax|frontier|future/.test(w)) return 'scifi';
      if (/post|apoc|wasteland|ruin|fallout/.test(w)) return 'postapocalyptic';
      if (/modern|contemp|city|urban/.test(w)) return 'modern';
      return ''; // unknown → draw from any world
    } catch (e) { return ''; }
  }
  // Three reading states, so the guide is a reward for curiosity, never a mandatory click:
  //   PASSIVE (no interaction) → scene ready → brief beat → auto-fade (no click)
  //   READING (turned a page / drew a volume) → scene ready → wait for "Return to Story"
  //   BUSY (still generating) → read freely, no pressure
  function markEngaged() {
    if (!live.active) return;
    live.engaged = true;
    if (live.ready) showReady(); // scene already waiting → upgrade PASSIVE→READING (cancel auto-fade)
  }
  function onLiveFinish() {
    if (!live.active) return;
    live.pageAddedSinceStart = true; live.ready = true;
    state.done = true;
    setAllText('.gp-status', 'Your next scene is ready.');
    if (live.engaged) { showReady(); }                 // READING → wait for the click
    else { stopLoaders(); live.dismissTimer = setTimeout(dismiss, 800); } // PASSIVE → brief beat, auto-fade
  }
  function dismiss() {
    if (live.dismissTimer) { clearTimeout(live.dismissTimer); live.dismissTimer = 0; }
    var ov = byId('gpOverlay');
    if (ov) ov.classList.add('gp-fading');             // "closing the book" fade-out
    setTimeout(function () { closeOverlay(); if (ov) ov.classList.remove('gp-fading'); }, 320);
  }
  function startCurtain() {
    if (!live.enabled || live.active) return;
    if (window.state && window.state._travelMapActive) return; // travel-map owns its reveal
    live.active = true; live.pageAddedSinceStart = false;
    try { openOverlay('live', { world: storyWorldToGuide() }); } catch (e) { live.active = false; }
  }
  function installLiveHooks() {
    window.addEventListener('sb:scene-page-added', onLiveFinish);  // universal FINISH signal
    // capture the Say/Do text at submit-CLICK (capture phase), before app.js clears the fields
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && (t.id === 'submitBtn' || (t.closest && t.closest('#submitBtn')))) captureInputs();
    }, true);
    // START for scene 2+/GN: poll the in-flight flag (no "generation started" event exists)
    live.poll = setInterval(function () {
      if (!live.enabled) return;
      var adv = !!(window.state && window.state._isAdvancingScene);
      if (adv && !live.wasAdvancing) startCurtain();
      if (!adv && live.wasAdvancing && live.active && !live.pageAddedSinceStart) dismiss();
      live.wasAdvancing = adv;
    }, 250);
    // START for SCENE 1: the first generation doesn't set _isAdvancingScene, so watch the
    // real overlay un-hide while turnCount is 0 (skip image/visualize loaders). Also
    // grace-dismisses the curtain if the overlay hides without a scene mounting (error/misfire).
    var ov = document.getElementById('loadingOverlay');
    if (ov && typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () {
        if (!live.enabled) return;
        var shown = !ov.classList.contains('hidden');
        var st = window.state || {};
        var txt = (byId('loadingText') || {}).textContent || '';
        if (shown && !live.active && !st.turnCount && !/paint|visuali|portrait|image|cover|frontispiece/i.test(txt)) {
          startCurtain();
        } else if (!shown && live.active && !live.pageAddedSinceStart) {
          setTimeout(function () { if (live.active && !live.pageAddedSinceStart) dismiss(); }, 600);
        }
      }).observe(ov, { attributes: true, attributeFilter: ['class'] });
    }
  }
  window._GUIDE_INTERMISSION = {
    enable: function () { live.enabled = true; return 'live intermission ON'; },
    disable: function () { live.enabled = false; if (live.active) dismiss(); return 'live intermission OFF'; },
    status: function () { return { enabled: live.enabled, active: live.active, engaged: live.engaged, ready: live.ready }; },
    skip: function () { finishBar(); return 'skipped (dev)'; }, // dev-only: end the preview wait from the console
    // demo the live look with NO generation: opens, then simulates "ready" as a READING user
    demo: function () {
      live.active = true; live.pageAddedSinceStart = true;
      openOverlay('live', { world: storyWorldToGuide() });
      live.engaged = true;                       // show the Return-to-Story path
      setTimeout(onLiveFinish, 1300);
      return 'live demo — read, then "Return to Story" appears';
    },
    _debug: { composeRecap: function () { return composeRecap(); }, worldMap: function () { return storyWorldToGuide(); } }
  };

  function injectButton() {
    if (document.getElementById('gpTrigger')) return;
    var b = document.createElement('button');
    b.id = 'gpTrigger';
    b.textContent = '📖';
    b.title = "Loading-screen tester — between-scenes Traveler's Guide intermission (preview)";
    b.addEventListener('click', function () { openOverlay('preview'); });
    document.body.appendChild(b);
  }

  function boot() {
    injectStyle();
    injectFonts();
    window._gpOpenPreview = function () { openOverlay('preview'); }; // console, any host
    installLiveHooks();
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (local) injectButton();  // preview button: localhost only (joins the dev stack)
    live.enabled = local;       // LIVE intermission auto-ON for localhost testing, OFF in
                                // production (enable there via _GUIDE_INTERMISSION.enable())
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
