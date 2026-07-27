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
      "He said your name like a word he means to keep."
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
    // top zone: recap (compact, at top) + primary loader centered in the first viewport
    '.gp-top{min-height:86vh;display:flex;flex-direction:column;}',
    '.gp-recap{text-align:center;flex:0 0 auto;}',
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
      'box-shadow:0 30px 70px rgba(0,0,0,.55),0 2px 0 #d9cba9,inset 0 0 0 1px rgba(120,96,52,.18);}',
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
    '.gp-loader-primary{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;}',
    '.gp-loader-foot{margin-top:12px;padding-top:22px;border-top:1px solid rgba(201,168,106,.12);}',
    '.gp-status{font-size:13.5px;color:#c3b389;letter-spacing:.06em;margin-bottom:12px;min-height:18px;font-style:italic;}',
    '.gp-hint{font-size:12px;color:#8c7c5c;margin:12px auto 0;max-width:52ch;line-height:1.5;}',
    '.gp-bar{position:relative;width:100%;max-width:520px;height:8px;margin:0 auto;border-radius:6px;',
      'background:rgba(201,168,106,.14);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(201,168,106,.22);}',
    '.gp-fill{position:absolute;inset:0 auto 0 0;width:0;border-radius:6px;',
      'background:linear-gradient(90deg,#8a6d34,#d8b978,#f0dca6);box-shadow:0 0 14px rgba(216,185,120,.5);transition:width .2s linear;}',
    '.gp-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);',
      'transform:translateX(-100%);animation:gpShim 1.6s ease-in-out infinite;}',
    '@keyframes gpShim{to{transform:translateX(100%)}}',
    '.gp-meta{margin-top:12px;display:flex;justify-content:center;}',
    '.gp-skip{background:none;border:none;color:#877a5c;text-decoration:underline;cursor:pointer;font:inherit;font-size:11.5px;}',
    '.gp-skip:hover{color:#c9a86a;}',
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
    // live mode hides preview-only affordances (skip + its meta row, close-to-home);
    // the world picker + turn/draw controls stay, per the layout spec.
    '.gp-live .gp-skip,.gp-live .gp-meta,.gp-live #gpClose{display:none;}',
    '@media(max-width:640px){.gp-page{column-count:1!important;}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('gp-style')) return;
    var s = document.createElement('style');
    s.id = 'gp-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
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

    return '<div class="gp-book">' +
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
  function startBar() {
    state.done = false;
    var minMs = 120000, maxMs = 240000; // 2–4 minutes, as in the real thing
    state.dur = (window._GP_DURATION_MS) || Math.round(minMs + Math.random() * (maxMs - minMs));
    state.start = performance.now();
    tick();
  }
  // both loader blocks update together (shared classes, not ids)
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function setAllText(sel, t) { each(sel, function (el) { el.textContent = t; }); }
  function setFill(p) { each('.gp-fill', function (el) { el.style.width = (p * 100).toFixed(1) + '%'; }); }

  function tick() {
    var p = Math.min(1, (performance.now() - state.start) / state.dur);
    setFill(p);
    setAllText('.gp-status', STATUS[Math.min(STATUS.length - 1, Math.floor(p * STATUS.length))]);
    if (p >= 1) { finishBar(); return; }
    state.raf = requestAnimationFrame(tick);
  }
  function finishBar() {
    cancelAnimationFrame(state.raf);
    state.done = true;
    setFill(1);
    each('.gp-meta', function (el) { el.style.display = 'none'; });
    each('.gp-continue', function (el) { el.classList.add('gp-show'); });
  }

  // live bar: asymptotic climb toward ~95% while the scene really generates; the real
  // completion signal (sb:scene-page-added) calls onLiveFinish() to snap to 100% + Continue.
  function startBarLive() {
    state.done = false; state.live = true; state.start = performance.now();
    tickLive();
  }
  function tickLive() {
    var t = (performance.now() - state.start) / 1000;
    var p = 0.95 * (1 - Math.exp(-t / 45));  // ~63% @45s, ~86% @90s, easing toward 95%
    setFill(p);
    setAllText('.gp-status', STATUS[Math.floor(t / 12) % STATUS.length]);
    if (state.done) return;
    state.raf = requestAnimationFrame(tickLive);
  }

  function recapHTML(kicker, bullets) {
    var items = (bullets || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('');
    return '<div class="gp-kicker">' + esc(kicker) + '</div>' +
      (items ? '<ul class="gp-bullets">' + items + '</ul>' : '') +
      '<div class="gp-rule"></div>';
  }

  // ---------------------------------------------------------------- overlay
  // one loader block = cute phrase (above) · bar · hint (below) · Continue (when ready).
  // Rendered TWICE: primary (centered in the first viewport) + foot (for scroll-down readers).
  function loaderBlock(primary) {
    return '<div class="gp-loader ' + (primary ? 'gp-loader-primary' : 'gp-loader-foot') + '">' +
      '<div class="gp-status">' + esc(STATUS[0]) + '</div>' +
      '<div class="gp-bar"><div class="gp-fill"></div></div>' +
      '<div class="gp-hint">' + esc(HINTS[0]) + '</div>' +
      '<div class="gp-meta"><button class="gp-skip">skip the wait</button></div>' +
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
    Array.prototype.forEach.call(ov.querySelectorAll('.gp-skip'), function (el) { el.addEventListener('click', finishBar); });
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
    if (isLive) { live.engaged = false; live.ready = false; if (live.dismissTimer) { clearTimeout(live.dismissTimer); live.dismissTimer = 0; } }
    setAllText('.gp-continue-btn', isLive ? 'Return to Story' : 'Continue ›');
    setAllText('.gp-ready', isLive ? '✦ Your next scene is ready' : '✦ Next scene ready');
    // recap: real "Previously…" (3 short beats) from the last scene in live mode; dummy in preview
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
    if (isLive) startBarLive(); else startBar();
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
    pageAddedSinceStart: false, wasAdvancing: false, poll: 0, dismissTimer: 0 };
  function byId(id) { return document.getElementById(id); }

  function composeRecap() {
    try {
      var sw = (window.state && window.state.sceneWindow) || [];
      var last = sw.length ? sw[sw.length - 1] : '';
      var txt = String(last || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!txt) return { kicker: 'Your story begins', bullets: ['The page is blank, the ink still wet.'] };
      return { kicker: 'Previously', bullets: recapBullets(txt) };
    } catch (e) { return { kicker: '', bullets: [] }; }
  }
  // extractive, no LLM: the last few sentences (where we left off), each capped at 13 words
  function recapBullets(txt) {
    var sents = txt.split(/(?<=[.!?"'”’])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    return sents.slice(-3).map(function (s) {
      var w = s.replace(/^["'“”‘’\-–\s]+/, '').split(/\s+/);
      return (w.length <= 13 ? w.join(' ') : w.slice(0, 13).join(' ') + '…').replace(/[",;:]+$/, '');
    });
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
    if (live.ready) showReturn(); // scene already waiting → upgrade PASSIVE→READING (cancel auto-fade)
  }
  function showReturn() {
    if (live.dismissTimer) { clearTimeout(live.dismissTimer); live.dismissTimer = 0; }
    each('.gp-meta', function (el) { el.style.display = 'none'; });
    each('.gp-continue', function (el) { el.classList.add('gp-show'); });
  }
  function onLiveFinish() {
    if (!live.active) return;
    live.pageAddedSinceStart = true; live.ready = true;
    state.done = true; cancelAnimationFrame(state.raf);
    setFill(1);
    setAllText('.gp-status', 'Your next scene is ready.');
    if (live.engaged) showReturn();                    // READING → wait for the click
    else live.dismissTimer = setTimeout(dismiss, 800); // PASSIVE → brief beat, then auto-fade
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
