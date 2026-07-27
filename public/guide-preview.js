/* ─────────────────────────────────────────────────────────────────────────────
 * guide-preview.js — a STANDALONE preview of the between-scenes "story intermission"
 * (the loading screen as an in-world Traveler's-Guide reader). Purely a preview harness:
 * it does NOT touch the production #loadingOverlay pipeline, app.js, or styles.css.
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
    body: [
      "The masque had emptied by the time he found you on the terrace. He did not pretend the evening had been chance, and you did not pretend you had wanted it to be. Somewhere below, the tide came in against the stones; somewhere behind you, a door you could still have closed. You left it open.",
      "He said your name once — the way a person says a word they have decided to keep. Whatever the morning asks of you both, it will not be able to ask it of strangers."
    ]
  };

  var STATUS = [
    'Composing the next scene…', 'Setting the stage…', 'Consulting the fates…',
    'Deciding who speaks first…', 'Letting the moment breathe…', 'Turning toward what happens next…'
  ];

  var DISC_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', restricted: 'Restricted', lost: 'Lost' };

  var state = { pub: null, left: 1, paged: null, world: '', raf: 0, start: 0, dur: 0, done: false };

  // ---------------------------------------------------------------- styles ----
  var STYLE = [
    '#gpOverlay{position:fixed;inset:0;z-index:10000;display:none;flex-direction:column;',
      'background:radial-gradient(120% 90% at 50% -10%,#1b1526 0%,#0e0b14 60%,#080610 100%);',
      'color:#e9dcc4;font-family:Georgia,"Iowan Old Style","Times New Roman",serif;',
      'overflow-y:auto;padding:clamp(16px,4vw,40px);animation:gpFade .5s ease both;}',
    '#gpOverlay.gp-open{display:flex;}',
    '@keyframes gpFade{from{opacity:0}to{opacity:1}}',
    '.gp-shell{width:100%;max-width:920px;margin:0 auto;display:flex;flex-direction:column;gap:clamp(18px,3vw,32px);}',
    '.gp-close{position:fixed;top:14px;right:16px;z-index:2;background:none;border:1px solid rgba(201,168,106,.4);',
      'color:#c9a86a;width:34px;height:34px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;}',
    '.gp-close:hover{background:rgba(201,168,106,.14);}',
    // recap zone
    '.gp-recap{text-align:center;}',
    '.gp-kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#c9a86a;opacity:.85;margin-bottom:14px;}',
    '.gp-recap p{font-size:clamp(15px,1.9vw,18px);line-height:1.7;color:#d8ccb4;max-width:60ch;margin:0 auto 12px;font-style:italic;}',
    '.gp-rule{width:64px;height:1px;background:linear-gradient(90deg,transparent,#c9a86a,transparent);margin:6px auto 0;}',
    // book
    '.gp-bookwrap{display:flex;flex-direction:column;align-items:center;gap:12px;}',
    '.gp-intro{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9c8b6b;}',
    '.gp-librarian{max-width:56ch;margin:2px auto 0;text-align:center;font-style:italic;color:#cbb891;',
      'font-size:14.5px;line-height:1.5;display:flex;gap:8px;align-items:baseline;justify-content:center;}',
    '.gp-lib-mark{color:#c9a86a;font-style:normal;}',
    '.gp-lib-by{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#8c7c5c;text-align:center;}',
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
    // bar
    '.gp-barzone{margin-top:6px;text-align:center;}',
    '.gp-status{font-size:13px;color:#b7a680;letter-spacing:.06em;margin-bottom:10px;min-height:18px;}',
    '.gp-bar{position:relative;width:100%;max-width:520px;height:8px;margin:0 auto;border-radius:6px;',
      'background:rgba(201,168,106,.14);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(201,168,106,.22);}',
    '.gp-fill{position:absolute;inset:0 auto 0 0;width:0;border-radius:6px;',
      'background:linear-gradient(90deg,#8a6d34,#d8b978,#f0dca6);box-shadow:0 0 14px rgba(216,185,120,.5);transition:width .2s linear;}',
    '.gp-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);',
      'transform:translateX(-100%);animation:gpShim 1.6s ease-in-out infinite;}',
    '@keyframes gpShim{to{transform:translateX(100%)}}',
    '.gp-meta{margin-top:10px;font-size:11.5px;color:#877a5c;display:flex;justify-content:center;gap:14px;align-items:center;}',
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
  }
  function drawAnother() {
    var pk = draw(state.world);
    refreshBook();
    setLibrarian(pk, true);
  }
  function setLibrarian(pick, isRedraw) {
    var el = document.getElementById('gpLibLine');
    if (el && window._guideLibrarianLine) {
      el.textContent = window._guideLibrarianLine(pick, { isRedraw: isRedraw, filtered: !!state.world });
    }
  }

  // ---------------------------------------------------------------- the bar
  function startBar() {
    state.done = false;
    var minMs = 120000, maxMs = 240000; // 2–4 minutes, as in the real thing
    state.dur = (window._GP_DURATION_MS) || Math.round(minMs + Math.random() * (maxMs - minMs));
    state.start = performance.now();
    tick();
  }
  function tick() {
    var now = performance.now();
    var p = Math.min(1, (now - state.start) / state.dur);
    var fill = document.getElementById('gpFill');
    var pct = document.getElementById('gpPct');
    var st = document.getElementById('gpStatus');
    if (fill) fill.style.width = (p * 100).toFixed(1) + '%';
    if (pct) pct.textContent = Math.floor(p * 100) + '%';
    if (st) st.textContent = STATUS[Math.min(STATUS.length - 1, Math.floor(p * STATUS.length))];
    if (p >= 1) { finishBar(); return; }
    state.raf = requestAnimationFrame(tick);
  }
  function finishBar() {
    cancelAnimationFrame(state.raf);
    state.done = true;
    var bz = document.getElementById('gpBarZone');
    var cont = document.getElementById('gpContinue');
    if (bz) bz.style.display = 'none';
    if (cont) cont.classList.add('gp-show');
  }

  // ---------------------------------------------------------------- overlay
  function buildOverlay() {
    var ov = document.createElement('div');
    ov.id = 'gpOverlay';
    var worldOpts = ['<option value="">Any world</option>']
      .concat(uniqueWorlds().map(function (w) { return '<option value="' + w + '">' + esc(worldName(w)) + '</option>'; }))
      .join('');
    ov.innerHTML =
      '<button class="gp-close" id="gpClose" title="Back to homepage">&times;</button>' +
      '<div class="gp-shell">' +
        '<div class="gp-recap"><div class="gp-kicker">' + esc(RECAP.kicker) + '</div>' +
          RECAP.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
          '<div class="gp-rule"></div></div>' +
        '<div class="gp-bookwrap">' +
          '<div class="gp-intro">While your next scene is composed, read on</div>' +
          '<div class="gp-librarian"><span class="gp-lib-mark">✒</span><span id="gpLibLine"></span></div>' +
          '<div class="gp-lib-by">— the Librarian</div>' +
          '<div id="gpBookHost" style="width:100%;display:flex;justify-content:center;"></div>' +
          '<div class="gp-controls">' +
            '<button class="gp-btn" id="gpTurnBack">‹ Turn back</button>' +
            '<button class="gp-btn" id="gpTurnFwd">Turn page ›</button>' +
            '<button class="gp-btn" id="gpDraw">Draw another volume</button>' +
            '<select class="gp-sel" id="gpWorld">' + worldOpts + '</select>' +
          '</div>' +
        '</div>' +
        '<div class="gp-barzone" id="gpBarZone">' +
          '<div class="gp-status" id="gpStatus">' + esc(STATUS[0]) + '</div>' +
          '<div class="gp-bar"><div class="gp-fill" id="gpFill"></div></div>' +
          '<div class="gp-meta"><span id="gpPct">0%</span><span>·</span>' +
            '<span>this usually takes a few minutes</span><span>·</span>' +
            '<button class="gp-skip" id="gpSkip">skip the wait</button></div>' +
        '</div>' +
        '<div class="gp-continue" id="gpContinue">' +
          '<div><div class="gp-ready">✦ Next scene ready</div>' +
          '<button class="gp-cbtn" id="gpContinueBtn">Continue ›</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    ov.querySelector('#gpClose').addEventListener('click', closeOverlay);
    ov.querySelector('#gpTurnBack').addEventListener('click', function () { turn(-1); });
    ov.querySelector('#gpTurnFwd').addEventListener('click', function () { turn(1); });
    ov.querySelector('#gpDraw').addEventListener('click', drawAnother);
    ov.querySelector('#gpWorld').addEventListener('change', function (e) { state.world = e.target.value; drawAnother(); });
    ov.querySelector('#gpSkip').addEventListener('click', finishBar);
    ov.querySelector('#gpContinueBtn').addEventListener('click', closeOverlay);
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

  function openOverlay() {
    if (!window._GUIDE_ENTRIES || !window._guidePickBookThenPage) {
      alert('Guide data not loaded — check that guide-entries.js is included before guide-preview.js.');
      return;
    }
    var ov = document.getElementById('gpOverlay') || buildOverlay();
    state.world = '';
    var wsel = document.getElementById('gpWorld'); if (wsel) wsel.value = '';
    var pk = draw('');
    refreshBook();
    setLibrarian(pk, false);
    var cont = document.getElementById('gpContinue'); if (cont) cont.classList.remove('gp-show');
    var bz = document.getElementById('gpBarZone'); if (bz) bz.style.display = '';
    ov.classList.add('gp-open');
    startBar();
  }
  function closeOverlay() {
    cancelAnimationFrame(state.raf);
    var ov = document.getElementById('gpOverlay');
    if (ov) ov.classList.remove('gp-open');
  }

  function injectButton() {
    if (document.getElementById('gpTrigger')) return;
    var b = document.createElement('button');
    b.id = 'gpTrigger';
    b.textContent = '📖';
    b.title = "Loading-screen tester — between-scenes Traveler's Guide intermission (preview)";
    b.addEventListener('click', openOverlay);
    document.body.appendChild(b);
  }

  function boot() {
    injectStyle();
    window._gpOpenPreview = openOverlay; // callable from the console on any host
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (local) injectButton();           // match the other dev buttons: localhost only
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
