// ═══════════════════════════════════════════════════════════════════════════════
// STORYBOUND UI SOUND SYSTEM — Minimalist tactile audio feedback
// Synthesized via Web Audio API — zero external assets, <2KB total
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  let _audioCtx = null;
  let _enabled = true;
  let _initialized = false;
  const _lastPlayed = {};        // rate-limiter: { soundName: timestamp }
  const MIN_INTERVAL_MS = 120;   // minimum gap between identical sounds

  // ── Master volume nodes — independent music / SFX control ──
  var _sfxMasterGain = null;
  var _musicMasterGain = null;
  var _sfxVolume = 1.0;
  var _musicVolume = 1.0;

  // Restore saved volume preferences
  try {
    var _savedSfx = localStorage.getItem('sb_sfx_volume');
    var _savedMus = localStorage.getItem('sb_music_volume');
    if (_savedSfx !== null) _sfxVolume = parseFloat(_savedSfx);
    if (_savedMus !== null) _musicVolume = parseFloat(_savedMus);
  } catch (_) {}

  function _sfxOut(ctx) { return _sfxMasterGain || ctx.destination; }
  function _musicOut(ctx) { return _musicMasterGain || ctx.destination; }

  // ── Lazy AudioContext init (requires user gesture) ──
  function _ensureCtx() {
    if (_audioCtx) return _audioCtx;
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window._audioCtxRef = _audioCtx; // expose for ambient loops
      // Create master gain nodes for independent volume control
      if (!_sfxMasterGain) {
        _sfxMasterGain = _audioCtx.createGain();
        _sfxMasterGain.gain.value = _sfxVolume;
        _sfxMasterGain.connect(_audioCtx.destination);
      }
      if (!_musicMasterGain) {
        _musicMasterGain = _audioCtx.createGain();
        _musicMasterGain.gain.value = _musicVolume;
        _musicMasterGain.connect(_audioCtx.destination);
      }
      // Preload audio samples
      if (_audioCtx) {
        if (!window._bellBuffer) {
          fetch('/assets/Concierge/bell-ring.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._bellBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._cardFlipBuffer) {
          fetch('/assets/ui/card-flip.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._cardFlipBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._cardDissipateBuffer) {
          fetch('/assets/ui/card-dissipate.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._cardDissipateBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._petitionZoomBuffer) {
          fetch('/assets/ui/petition-zoom.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._petitionZoomBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._temptZoomBuffer) {
          fetch('/assets/ui/tempt-zoom.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._temptZoomBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._beginStoryBuffer) {
          fetch('/assets/ui/begin-story.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._beginStoryBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._buttonTapBuffer) {
          fetch('/assets/ui/button-tap.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._buttonTapBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._paperSlideBuffer) {
          fetch('/assets/ui/paper-slide.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._paperSlideBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._sparkleUpBuffer) {
          fetch('/assets/ui/sparkle-up.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._sparkleUpBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._zoomSparkleLoopBuffer) {
          fetch('/assets/ui/zoom-sparkle-loop.mp3')
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window._zoomSparkleLoopBuffer = decoded; })
            .catch(function() {});
        }
        if (!window._bookPullBuffers) {
          window._bookPullBuffers = [];
          ['/assets/ui/book-pull-1.mp3', '/assets/ui/book-pull-2.mp3', '/assets/ui/book-pull-3.mp3'].forEach(function(url) {
            fetch(url)
              .then(function(r) { return r.arrayBuffer(); })
              .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
              .then(function(decoded) { window._bookPullBuffers.push(decoded); })
              .catch(function() {});
          });
        }
      }
    } catch (_) {}
    return _audioCtx;
  }

  // ── User-gesture unlock (iOS requires touchend, not just touchstart) ──
  function _unlock() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(function() {
        _initialized = true;
        console.log('[SOUND] AudioContext unlocked, state:', ctx.state);
      }).catch(function() {});
    } else if (ctx.state === 'running') {
      _initialized = true;
    }
  }

  // Multiple event types — iOS Safari is picky about which gesture unlocks audio
  ['click', 'touchstart', 'touchend', 'keydown'].forEach(function(evt) {
    document.addEventListener(evt, _unlock, { passive: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUND DEFINITIONS — synthesized micro-sounds
  // Each function creates a short, disposable audio graph
  // ═══════════════════════════════════════════════════════════════════════════

  const SOUNDS = {

    // Card flip — real sample from card-flip.mp3
    card_flip: function(ctx, t) {
      if (window._cardFlipBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._cardFlipBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Paper slide — dropdown open/close
    paper_slide: function(ctx, t) {
      if (window._paperSlideBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._paperSlideBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.45, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Sparkle up — breadcrumb sparkle rise
    sparkle_up: function(ctx, t) {
      if (window._sparkleUpBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._sparkleUpBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Book pull — one of 3 random samples
    book_pull: function(ctx, t) {
      var bufs = window._bookPullBuffers;
      if (!bufs || bufs.length === 0) return;
      var buf = bufs[Math.floor(Math.random() * bufs.length)];
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      src.connect(gain).connect(_sfxOut(ctx));
      src.start(t);
    },

    // Begin Story — chimes on story launch
    begin_story: function(ctx, t) {
      if (window._beginStoryBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._beginStoryBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.45, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Tempt Fate zoom — riser shudder on zoom-in
    tempt_zoom: function(ctx, t) {
      if (window._temptZoomBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._temptZoomBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Petition Fate zoom — spooky chimes on zoom-in
    petition_zoom: function(ctx, t) {
      if (window._petitionZoomBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._petitionZoomBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Card dissipate — mystical chime for sparkle dissolution
    card_dissipate: function(ctx, t) {
      if (window._cardDissipateBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._cardDissipateBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.45, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Soft shimmer — filtered noise sparkle, no tonal oscillator
    sparkle: function(ctx, t) {
      const dur = 0.10;
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.12;
      noise.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3000;
      bp.Q.value = 1.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(bp).connect(gain).connect(_sfxOut(ctx));
      noise.start(t);
      noise.stop(t + dur);
    },

    // Button tap — real sample
    button_click: function(ctx, t) {
      if (window._buttonTapBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._buttonTapBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Soft page + leather creak — book opening
    book_open: function(ctx, t) {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
      noise.buffer = buf;

      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(1200, t);
      filt.frequency.exponentialRampToValueAtTime(400, t + 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      noise.connect(filt).connect(gain).connect(_sfxOut(ctx));
      noise.start(t);
      noise.stop(t + 0.15);
    },

    // Soft wooden shelf contact — book landing
    book_land: function(ctx, t) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      // Noise layer for wood texture
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
      noise.buffer = buf;

      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'lowpass';
      nFilt.frequency.value = 600;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.10, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain).connect(_sfxOut(ctx));
      noise.connect(nFilt).connect(nGain).connect(_sfxOut(ctx));
      osc.start(t);
      osc.stop(t + 0.1);
      noise.start(t);
      noise.stop(t + 0.06);
    },

    // Quiet page rustle — scene advance
    page_turn: function(ctx, t) {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
      noise.buffer = buf;

      const filt = ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.setValueAtTime(2000, t);
      filt.frequency.exponentialRampToValueAtTime(4000, t + 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.10, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      noise.connect(filt).connect(gain).connect(_sfxOut(ctx));
      noise.start(t);
      noise.stop(t + 0.12);
    },

    // Hotel desk bell — real sample from bell-ring.mp3
    bell_ting: function(ctx, t) {
      if (window._bellBuffer) {
        var src = ctx.createBufferSource();
        src.buffer = window._bellBuffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, t);
        src.connect(gain).connect(_sfxOut(ctx));
        src.start(t);
      }
    },

    // Barely audible air — hover
    hover_soft: function(ctx, t) {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.08;
      noise.buffer = buf;

      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 5000;
      filt.Q.value = 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filt).connect(gain).connect(_sfxOut(ctx));
      noise.start(t);
      noise.stop(t + 0.05);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Play a named UI sound.
   * @param {string} name - One of: card_flip, sparkle, button_click, book_open, book_land, page_turn, hover_soft
   */
  function playUISound(name) {
    if (!_enabled) return;

    const synth = SOUNDS[name];
    if (!synth) return;

    // Rate limiter
    const now = performance.now();
    if (_lastPlayed[name] && (now - _lastPlayed[name]) < MIN_INTERVAL_MS) return;
    _lastPlayed[name] = now;

    const ctx = _ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(function() {
        try { synth(ctx, ctx.currentTime); } catch (_) {}
      }).catch(function() {});
      return;
    }

    try {
      synth(ctx, ctx.currentTime);
    } catch (_) {}
  }

  /**
   * Enable or disable UI sounds.
   * @param {boolean} on
   */
  function setUISoundEnabled(on) {
    _enabled = !!on;
    try {
      localStorage.setItem('sb_ui_sounds', _enabled ? 'true' : 'false');
    } catch (_) {}
  }

  /**
   * @returns {boolean} Whether UI sounds are enabled.
   */
  function isUISoundEnabled() {
    return _enabled;
  }

  // Restore saved preference
  try {
    const saved = localStorage.getItem('sb_ui_sounds');
    if (saved === 'false') _enabled = false;
  } catch (_) {}

  // Expose globally
  window.playUISound = playUISound;
  window.setUISoundEnabled = setUISoundEnabled;
  window.isUISoundEnabled = isUISoundEnabled;

  // Zoom sparkle loop — koshi chimes at half volume, looping
  var _zoomLoopSrc = null;
  var _zoomLoopGain = null;
  window.startZoomSparkleLoop = function() {
    if (_zoomLoopSrc) return; // already playing
    if (!window._zoomSparkleLoopBuffer || !_enabled) return;
    var ctx = _ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { ctx.resume().catch(function(){}); }
    var src = ctx.createBufferSource();
    src.buffer = window._zoomSparkleLoopBuffer;
    src.loop = true;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.5);
    src.connect(gain).connect(_sfxOut(ctx));
    src.start(0);
    _zoomLoopSrc = src;
    _zoomLoopGain = gain;
  };
  window.stopZoomSparkleLoop = function() {
    if (!_zoomLoopSrc) return;
    try {
      var ctx = _zoomLoopGain.context;
      _zoomLoopGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      var src = _zoomLoopSrc;
      setTimeout(function() { try { src.stop(); } catch(_){} }, 500);
    } catch(_) {}
    _zoomLoopSrc = null;
    _zoomLoopGain = null;
  };

  // Global delegated button tap — plays on any button/sb-btn-png click
  // Skips cards and elements that play their own sounds
  document.addEventListener('click', function(e) {
    if (!_enabled) return;
    // Skip if click is on a card (has its own flip sound)
    if (e.target.closest('.sb-card, .fate-card, .library-book, .playermask-card, .mode-select-card')) return;
    var el = e.target.closest('button, .sb-btn-png, [role="button"]');
    if (!el) return;
    playUISound('button_click');
  }, false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CORRIDOR AMBIENCE — persistent site-wide loop (eternity chimes)
  // Plays across all screens EXCEPT libraries, gala images, and story reader.
  // Does NOT restart between pages. Volume halved during card zoom.
  // ═══════════════════════════════════════════════════════════════════════════
  var _corridorSrc = null;
  var _corridorGain = null;
  var _corridorNormalVol = 0.10;
  var _corridorZoomVol = 0.05;
  var _corridorMuted = false; // true when on excluded screen

  // Screens where corridor ambience should NOT play
  var _CORRIDOR_EXCLUDED = [
    'vaultLibraryScreen', 'forbiddenLibraryScreen', 'libraryReaderScreen',
    'legalGate', 'ageGate'
  ];

  function _startCorridorAmbience() {
    if (_corridorSrc) return; // already running
    if (!window._corridorAmbienceBuffer || !_enabled) return;
    var ctx = _ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    var src = ctx.createBufferSource();
    src.buffer = window._corridorAmbienceBuffer;
    src.loop = true;
    var gain = ctx.createGain();
    var vol = _corridorMuted ? 0 : _corridorNormalVol;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2.0);
    src.connect(gain).connect(_musicOut(ctx));
    src.start(0);
    _corridorSrc = src;
    _corridorGain = gain;
  }

  window._setCorridorAmbienceForScreen = function(screenId) {
    var shouldMute = _CORRIDOR_EXCLUDED.indexOf(screenId) !== -1;
    _corridorMuted = shouldMute;
    if (!_corridorGain) {
      // Try to start if not yet running and screen is allowed
      if (!shouldMute) _startCorridorAmbience();
      return;
    }
    var ctx = _corridorGain.context;
    var targetVol = shouldMute ? 0 : _corridorNormalVol;
    _corridorGain.gain.cancelScheduledValues(ctx.currentTime);
    _corridorGain.gain.setValueAtTime(_corridorGain.gain.value, ctx.currentTime);
    _corridorGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.0);
  };

  window._setCorridorAmbienceZoom = function(isZoomed) {
    if (!_corridorGain || _corridorMuted) return;
    var ctx = _corridorGain.context;
    var targetVol = isZoomed ? _corridorZoomVol : _corridorNormalVol;
    _corridorGain.gain.cancelScheduledValues(ctx.currentTime);
    _corridorGain.gain.setValueAtTime(_corridorGain.gain.value, ctx.currentTime);
    _corridorGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 0.5);
  };

  // Preload corridor ambience (deferred — not on first gesture, but after)
  function _preloadCorridorAmbience() {
    if (window._corridorAmbienceBuffer) return;
    fetch('/assets/ui/corridor-ambience.mp3')
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) {
        var ctx = _ensureCtx();
        if (!ctx) return;
        return ctx.decodeAudioData(buf);
      })
      .then(function(decoded) {
        window._corridorAmbienceBuffer = decoded;
        // Auto-start if we're on an allowed screen
        if (!_corridorMuted && !_corridorSrc) _startCorridorAmbience();
      })
      .catch(function() {});
  }
  // Start preload after first user interaction (must cover touch for mobile)
  function _initAudioOnGesture() {
    // Resume suspended AudioContext during the gesture (iOS requirement)
    var ctx = _ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function(){});
    setTimeout(_preloadCorridorAmbience, 300);
  }
  document.addEventListener('click', _initAudioOnGesture, { once: true, passive: true });
  document.addEventListener('touchstart', _initAudioOnGesture, { once: true, passive: true });
  document.addEventListener('touchend', _initAudioOnGesture, { once: true, passive: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // VOLUME CONTROL API — independent music / SFX sliders
  // ═══════════════════════════════════════════════════════════════════════════

  window.setSFXVolume = function(v) {
    _sfxVolume = Math.max(0, Math.min(1, +v || 0));
    if (_sfxMasterGain) _sfxMasterGain.gain.value = _sfxVolume;
    try { localStorage.setItem('sb_sfx_volume', _sfxVolume.toString()); } catch (_) {}
  };

  window.setMusicVolume = function(v) {
    _musicVolume = Math.max(0, Math.min(1, +v || 0));
    if (_musicMasterGain) _musicMasterGain.gain.value = _musicVolume;
    try { localStorage.setItem('sb_music_volume', _musicVolume.toString()); } catch (_) {}
    // Also update forbidden ambience in app.js if active
    if (window._updateForbiddenAmbienceVolume) window._updateForbiddenAmbienceVolume(_musicVolume);
  };

  window.getSFXVolume = function() { return _sfxVolume; };
  window.getMusicVolume = function() { return _musicVolume; };

})();
