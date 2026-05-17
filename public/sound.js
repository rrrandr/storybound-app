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

  // ── Master volume nodes — 4-bus split: Site/Story × Music/SFX ──
  // SITE buses control UI-layer audio: corridor ambience, button clicks,
  // typing sounds, hover sounds — anything that fires outside an active
  // story. STORY buses control in-story audio: scene ambient bed (rain,
  // traffic, fireplace, room tones), OAS dialogue audio (heartbeat,
  // breathing, splatter stings, sighs), and any sound mounted during a
  // reading session.
  var _sfxMasterGain = null;        // SITE SFX (legacy var name kept)
  var _musicMasterGain = null;      // SITE Music (legacy var name kept)
  var _storySfxGain = null;
  var _storyMusicGain = null;
  var _sfxVolume = 1.0;
  var _musicVolume = 1.0;
  var _storySfxVolume = 1.0;
  var _storyMusicVolume = 1.0;

  // Restore saved volume preferences (4 keys; legacy 2 keys retained
  // for backward compat — they map to the SITE masters).
  try {
    var _savedSfx       = localStorage.getItem('sb_sfx_volume');
    var _savedMus       = localStorage.getItem('sb_music_volume');
    var _savedStorySfx  = localStorage.getItem('sb_story_sfx_volume');
    var _savedStoryMus  = localStorage.getItem('sb_story_music_volume');
    if (_savedSfx      !== null) _sfxVolume        = parseFloat(_savedSfx);
    if (_savedMus      !== null) _musicVolume      = parseFloat(_savedMus);
    if (_savedStorySfx !== null) _storySfxVolume   = parseFloat(_savedStorySfx);
    if (_savedStoryMus !== null) _storyMusicVolume = parseFloat(_savedStoryMus);
  } catch (_) {}

  // Output helpers. The story buses fall back to ctx.destination IF they
  // weren't created (defensive — shouldn't happen post-init). The legacy
  // _sfxOut / _musicOut helpers still exist for SITE-bus audio.
  function _sfxOut(ctx)        { return _sfxMasterGain   || ctx.destination; }
  function _musicOut(ctx)      { return _musicMasterGain || ctx.destination; }
  function _storySfxOut(ctx)   { return _storySfxGain    || ctx.destination; }
  function _storyMusicOut(ctx) { return _storyMusicGain  || ctx.destination; }

  // ── Lazy AudioContext init (requires user gesture) ──
  function _ensureCtx() {
    if (!_audioCtx) {
      try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        window._audioCtxRef = _audioCtx;
      } catch(e) { return null; }
    }
    try {
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
      if (!_storySfxGain) {
        _storySfxGain = _audioCtx.createGain();
        _storySfxGain.gain.value = _storySfxVolume;
        _storySfxGain.connect(_audioCtx.destination);
      }
      if (!_storyMusicGain) {
        _storyMusicGain = _audioCtx.createGain();
        _storyMusicGain.gain.value = _storyMusicVolume;
        _storyMusicGain.connect(_audioCtx.destination);
      }
      // Expose master gains as window globals so app.js's legacy ambient
      // system (mood underscore / diegetic background / vocals / stings)
      // can route through them instead of connecting straight to ctx
      // .destination. Without this, those audio paths bypass the Vault
      // sliders entirely.
      window._siteMusicGainRef  = _musicMasterGain;
      window._siteSfxGainRef    = _sfxMasterGain;
      window._storyMusicGainRef = _storyMusicGain;
      window._storySfxGainRef   = _storySfxGain;
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
        // ── OAS audio bus — fire crackle (ambient bed), heartbeat
        //    (temperature-reactive), hold-beat (rhythmic momentum), and
        //    male sigh (one-shot on scene resolve). All four preload here.
        var _oasAssets = {
          _oasFireBuffer:      '/assets/intimacy/oas-fire-crackle.mp3',
          _oasHeartbeatBuffer: '/assets/intimacy/oas-heartbeat.mp3',
          _oasHoldBeatBuffer:  '/assets/intimacy/oas-hold-beat.mp3',
          _oasBreathBuffer:    '/assets/intimacy/oas-male-breath.mp3',
          _oasBreathFBuffer:   '/assets/audio/ambient/heavy_girl_breathing.mp3',
          _oasSighBuffer:      '/assets/intimacy/oas-male-sigh.mp3'
        };
        Object.keys(_oasAssets).forEach(function(key) {
          if (window[key]) return;
          fetch(_oasAssets[key])
            .then(function(r) { return r.arrayBuffer(); })
            .then(function(buf) { return _audioCtx.decodeAudioData(buf); })
            .then(function(decoded) { window[key] = decoded; })
            .catch(function() {});
        });
      }
    } catch (_) {}
    return _audioCtx;
  }

  // ── User-gesture unlock (iOS requires resume + silent buffer in same gesture) ──
  function _unlock() {
    // Create context if needed
    if (!_audioCtx) {
      try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        window._audioCtxRef = _audioCtx;
      } catch(e) { return; }
    }
    var ctx = _audioCtx;
    if (!ctx) return;

    function _finishUnlock() {
      if (!_initialized && ctx.state === 'running') {
        _initialized = true;
        console.log('[SOUND] AudioContext unlocked, state:', ctx.state);
        _ensureCtx();
      }
    }

    // iOS: play silent buffer to "warm" the context
    if (!_initialized) {
      try {
        var silent = ctx.createBuffer(1, 1, 22050);
        var src = ctx.createBufferSource();
        src.buffer = silent;
        src.connect(ctx.destination);
        src.start(0);
      } catch(e) {}
    }

    if (ctx.state === 'suspended') {
      // resume() is async — handle both sync and async resolution
      ctx.resume().then(_finishUnlock).catch(function() {});
    }
    // Also check synchronously (desktop often starts 'running' immediately)
    _finishUnlock();
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
  // OAS AUDIO BUS — fire crackle + heartbeat + hold-beat layered loops,
  // with temperature-reactive heartbeat (curious → peaking scales volume
  // and playback rate). Male sigh is a one-shot fired on scene resolve.
  // ───────────────────────────────────────────────────────────────────────────
  // Layer routing: all three loops + sigh feed the SFX master bus (not
  // music). Reasoning: these are diegetic/atmospheric rather than score —
  // they should duck if SFX is muted, independent of background music.
  // ═══════════════════════════════════════════════════════════════════════════

  var _oasState = {
    fireSrc: null,    fireGain: null,
    hbSrc: null,      hbGain: null,
    holdSrc: null,    holdGain: null,
    breathSrc: null,  breathGain: null,    // male breath layer
    breathFSrc: null, breathFGain: null,   // female breath layer (2026-05-15)
    active: false,
    currentTemperature: 'curious',
    currentMouth: 'closed_smile'  // tracks the LI mouth state for breath modulation
  };

  // Per-temperature heartbeat + hold-beat params. Breath is NOT in this
  // map anymore — breath volume is now driven by the LI's current mouth
  // state (see _MOUTH_STATE_BREATH_FACTOR below), not temperature.
  // Rationale: temperature can be "urgent" or "peaking" while the LI
  // visually has a closed mouth (smirk, lip-bite, pursed, etc.) — and
  // hearing him breath heavily over a closed-mouth crop was breaking
  // immersion. Breath now fires only when the visual matches: mouth
  // open below peak = 50%, mouth open AT peak = full.
  var _OAS_TEMP_PROFILES = {
    curious:  { hbVol: 0.18, hbRate: 0.90, holdVol: 0.03 },
    warming:  { hbVol: 0.26, hbRate: 1.05, holdVol: 0.05 },
    urgent:   { hbVol: 0.36, hbRate: 1.22, holdVol: 0.08 },
    peaking:  { hbVol: 0.50, hbRate: 1.45, holdVol: 0.11 }
  };
  // Breath volume factor per mouth state:
  //   0   — closed mouth / contained (no breath, regardless of temperature)
  //   0.5 — mouth open below peak (parted speech, hard_exhale, etc.) → half breath
  //   1.0 — mouth open at peak (ahh, big_o, no, intense, crying, etc.) → full breath
  // Note: blowing_smirk is "peak tier" temperature-wise but PURSED (closed
  // mouth), so its factor is 0. Affronted/apologetic/disgusted are mildly
  // parted (0.5). Smile_snarl is asymmetric peak (1.0).
  // Two breath layers (2026-05-15): male + female panted simultaneously,
  // both modulated by the LI's current mouth state. Volumes tuned for
  // subtle layering — combined peak (~0.45) matches the prior single-
  // track loudness, but split across two voices reads as "both
  // characters breathing together" rather than one dominant voice.
  var _BREATH_PEAK_VOL   = 0.25;  // male layer peak (was 0.45 solo)
  var _BREATH_F_PEAK_VOL = 0.20;  // female layer peak (new)
  var _MOUTH_STATE_BREATH_FACTOR = {
    // Closed-mouth states → no breath
    resting: 0, closed_smile: 0, smirk: 0, big_smirk: 0, knowing_smirk: 0,
    lip_bite: 0, lip_bite_held: 0, whistle: 0,
    withdrawn: 0, cold_dismissal: 0, guilty: 0,
    thinking_hand: 0, thinking_pursed: 0, thinking_intrigued: 0,
    blowing_smirk: 0,  // peak-TIER but pursed/closed mouth — no breath
    soft: 0, still: 0,  // legacy aliases
    // Open below peak → 50% breath
    ohno: 0.5, what: 0.5, you: 0.5,
    hard_exhale: 0.5,
    affronted: 0.5, apologetic: 0.5, disgusted: 0.5,
    parted: 0.5,  // legacy alias
    // Loose-smile states — soft open but not exerting. Quarter breath
    // (same tier as settled). relief = pre-intensity flirt / post-intensity
    // contented release; after = very satisfied afterglow.
    relief: 0.25, after: 0.25,
    // Open at peak → full breath
    ahh: 1.0, big_o: 1.0, no: 1.0,
    intense: 1.0, tense_bite: 1.0, smile_snarl: 1.0,
    crying: 1.0,
    gasping: 1.0,  // legacy alias
    // Settled — post-orgasm / afterglow recovery. Quarter breath. Not a
    // mouth state in the picker; set explicitly during _resolveIntimacyScene.
    settled: 0.25
  };
  function _breathVolForMouth(state) {
    var factor = _MOUTH_STATE_BREATH_FACTOR[state];
    if (typeof factor !== 'number') factor = 0;  // unknown state = silent (safe default)
    return _BREATH_PEAK_VOL * factor;
  }
  function _breathFVolForMouth(state) {
    var factor = _MOUTH_STATE_BREATH_FACTOR[state];
    if (typeof factor !== 'number') factor = 0;
    return _BREATH_F_PEAK_VOL * factor;
  }
  var _OAS_FIRE_VOL = 0.025;  // constant — room atmosphere bed (-75% from initial)

  function _oasLoopFromBuffer(buf, vol, rate) {
    var ctx = _ensureCtx();
    if (!ctx || !buf) return null;
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    if (typeof rate === 'number' && src.playbackRate) {
      try { src.playbackRate.value = rate; } catch (_) {}
    }
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.2);
    src.connect(gain).connect(_storySfxOut(ctx));   // OAS bed → STORY SFX
    src.start(0);
    return { src: src, gain: gain };
  }

  // Breath track is non-looping by design — the file's tail contains
  // slow recovery breaths that must be allowed to play through on scene
  // resolve. While OAS is active and temperature is urgent/peaking, we
  // restart the track via onended so the breathing feels continuous; once
  // the user starts resolving, we stop restarting and let the current
  // playback (including the recovery tail) land naturally.
  //
  // _oasState.breathAllowRestart gates the onended restart loop. Set to
  // true when starting the breath layer, false when stopping OAS.
  function _oasStartBreathTrack(initialVol) {
    var ctx = _ensureCtx();
    if (!ctx || !window._oasBreathBuffer) return null;
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    var src = ctx.createBufferSource();
    src.buffer = window._oasBreathBuffer;
    src.loop = false;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(initialVol, ctx.currentTime + 1.5);
    src.connect(gain).connect(_storySfxOut(ctx));   // OAS breath (male) → STORY SFX
    src.onended = function() {
      // If OAS is still active and the current mouth state is mouth-open,
      // restart the track. Otherwise let it stay ended — closed-mouth
      // means we shouldn't be breathing anyway, and the natural recovery
      // tail has just played out.
      if (!_oasState.active || !_oasState.breathAllowRestart) return;
      var targetVol = _breathVolForMouth(_oasState.currentMouth);
      if (targetVol <= 0) return;  // mouth is closed, don't restart
      var next = _oasStartBreathTrack(targetVol);
      if (next) {
        _oasState.breathSrc = next.src;
        _oasState.breathGain = next.gain;
      }
    };
    src.start(0);
    return { src: src, gain: gain };
  }

  // Female breath layer — mirrors the male track architecture so both
  // run in parallel, both modulated by mouth state. Reads its own
  // buffer (heavy_girl_breathing.mp3) and per-state volume. Restart
  // loop fires independently so the two voices don't lock in phase —
  // they breathe at their own natural cycles, layered.
  function _oasStartBreathTrackF(initialVol) {
    var ctx = _ensureCtx();
    if (!ctx || !window._oasBreathFBuffer) return null;
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    var src = ctx.createBufferSource();
    src.buffer = window._oasBreathFBuffer;
    src.loop = false;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(initialVol, ctx.currentTime + 1.5);
    src.connect(gain).connect(_storySfxOut(ctx));   // OAS breath (female) → STORY SFX
    src.onended = function() {
      if (!_oasState.active || !_oasState.breathAllowRestart) return;
      var targetVol = _breathFVolForMouth(_oasState.currentMouth);
      if (targetVol <= 0) return;
      var next = _oasStartBreathTrackF(targetVol);
      if (next) {
        _oasState.breathFSrc = next.src;
        _oasState.breathFGain = next.gain;
      }
    };
    src.start(0);
    return { src: src, gain: gain };
  }

  function _oasFadeOut(node, fadeSec) {
    if (!node || !node.src || !node.gain) return;
    try {
      var ctx = node.gain.context;
      var dur = (typeof fadeSec === 'number') ? fadeSec : 0.8;
      node.gain.gain.cancelScheduledValues(ctx.currentTime);
      node.gain.gain.setValueAtTime(node.gain.gain.value, ctx.currentTime);
      node.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      var srcRef = node.src;
      setTimeout(function() { try { srcRef.stop(); } catch (_) {} }, dur * 1000 + 50);
    } catch (_) {}
  }

  // ── PUBLIC: start the OAS audio bed ──
  // Safe to call multiple times — re-entry is guarded by _oasState.active.
  // Loops can take a few hundred ms to start because buffers may still be
  // decoding when OAS launches; if a buffer isn't ready, that loop is
  // skipped gracefully (no error).
  window.startOASAudio = function(initialTemperature) {
    if (_oasState.active) return;
    if (!_enabled) return;
    var ctx = _ensureCtx();
    if (!ctx) return;
    _oasState.active = true;
    _oasState.currentTemperature = (initialTemperature && _OAS_TEMP_PROFILES[initialTemperature]) ? initialTemperature : 'curious';
    var prof = _OAS_TEMP_PROFILES[_oasState.currentTemperature];

    // Fire crackle — always at the same bed volume regardless of temperature.
    if (window._oasFireBuffer && !_oasState.fireSrc) {
      var fire = _oasLoopFromBuffer(window._oasFireBuffer, _OAS_FIRE_VOL, 1.0);
      if (fire) { _oasState.fireSrc = fire.src; _oasState.fireGain = fire.gain; }
    }
    // Heartbeat — temperature-reactive volume + rate.
    if (window._oasHeartbeatBuffer && !_oasState.hbSrc) {
      var hb = _oasLoopFromBuffer(window._oasHeartbeatBuffer, prof.hbVol, prof.hbRate);
      if (hb) { _oasState.hbSrc = hb.src; _oasState.hbGain = hb.gain; }
    }
    // Hold-beat — rhythmic momentum, fades up with temperature.
    if (window._oasHoldBeatBuffer && !_oasState.holdSrc) {
      var hold = _oasLoopFromBuffer(window._oasHoldBeatBuffer, prof.holdVol, 1.0);
      if (hold) { _oasState.holdSrc = hold.src; _oasState.holdGain = hold.gain; }
    }
    // Breath layer is mouth-state-driven now. Start NOT firing — the
    // breath track stays silent until the LI's mouth opens (which calls
    // window.setOASBreathForMouth). Initial mouth state is 'soft' /
    // 'closed_smile' (factor 0) so no breath until something opens.
    _oasState.breathAllowRestart = true;
    _oasState.currentMouth = 'closed_smile';
    // Duck the per-scene location bed so OAS textures sit in front.
    if (typeof window.setSceneAmbientDuck === 'function') {
      try { window.setSceneAmbientDuck(true); } catch (_) {}
    }
    try { console.log('[OAS-AUDIO] started @ ' + _oasState.currentTemperature + ' — breath silent until mouth opens'); } catch (_) {}
  };

  // ── PUBLIC: update breath volume based on the LI's current mouth state ──
  // Called from app.js _crossfadeMouth whenever the mouth crop changes.
  // Three-tier factor (0 / 0.5 / 1.0) lookup determines target volume.
  // If breath track isn't running and target > 0 → start it. If running
  // → ramp gain. If target = 0 → ramp to silence but keep source alive
  // so a re-open doesn't trigger a restart click.
  window.setOASBreathForMouth = function(mouthState) {
    if (!_oasState.active) return;
    _oasState.currentMouth = mouthState;
    var target  = _breathVolForMouth(mouthState);
    var targetF = _breathFVolForMouth(mouthState);
    var fadeSec = 1.2;
    try {
      // ── MALE BREATH LAYER ──
      if (target > 0 && !_oasState.breathSrc && window._oasBreathBuffer) {
        _oasState.breathAllowRestart = true;
        var breath = _oasStartBreathTrack(target);
        if (breath) { _oasState.breathSrc = breath.src; _oasState.breathGain = breath.gain; }
        try { console.log('[OAS-AUDIO] breath(M) start @ mouth=' + mouthState + ' vol=' + target.toFixed(2)); } catch (_) {}
      } else if (_oasState.breathGain) {
        var ctx = _oasState.breathGain.context;
        _oasState.breathGain.gain.cancelScheduledValues(ctx.currentTime);
        _oasState.breathGain.gain.setValueAtTime(_oasState.breathGain.gain.value, ctx.currentTime);
        _oasState.breathGain.gain.linearRampToValueAtTime(target, ctx.currentTime + fadeSec);
        try { console.log('[OAS-AUDIO] breath(M) → ' + target.toFixed(2) + ' (mouth=' + mouthState + ')'); } catch (_) {}
      }

      // ── FEMALE BREATH LAYER (2026-05-15) ──
      // Parallel track — both characters panting together. Same
      // mouth-state factor drives both so the layers swell + recede
      // in unison with the on-screen intensity.
      if (targetF > 0 && !_oasState.breathFSrc && window._oasBreathFBuffer) {
        _oasState.breathAllowRestart = true;
        var breathF = _oasStartBreathTrackF(targetF);
        if (breathF) { _oasState.breathFSrc = breathF.src; _oasState.breathFGain = breathF.gain; }
        try { console.log('[OAS-AUDIO] breath(F) start @ mouth=' + mouthState + ' vol=' + targetF.toFixed(2)); } catch (_) {}
      } else if (_oasState.breathFGain) {
        var ctxF = _oasState.breathFGain.context;
        _oasState.breathFGain.gain.cancelScheduledValues(ctxF.currentTime);
        _oasState.breathFGain.gain.setValueAtTime(_oasState.breathFGain.gain.value, ctxF.currentTime);
        _oasState.breathFGain.gain.linearRampToValueAtTime(targetF, ctxF.currentTime + fadeSec);
        try { console.log('[OAS-AUDIO] breath(F) → ' + targetF.toFixed(2) + ' (mouth=' + mouthState + ')'); } catch (_) {}
      }
    } catch (_) {}
  };

  // ── PUBLIC: update heartbeat + hold-beat for new temperature ──
  // Called from the OAS turn handler when state.intimacyDialogue.temperature
  // changes ('curious' → 'warming' → 'urgent' → 'peaking').
  window.setOASTemperature = function(temperature) {
    if (!_oasState.active) return;
    var prof = _OAS_TEMP_PROFILES[temperature];
    if (!prof) return;
    if (temperature === _oasState.currentTemperature) return;
    _oasState.currentTemperature = temperature;
    var fadeSec = 1.5;
    try {
      if (_oasState.hbGain) {
        var ctxA = _oasState.hbGain.context;
        _oasState.hbGain.gain.cancelScheduledValues(ctxA.currentTime);
        _oasState.hbGain.gain.setValueAtTime(_oasState.hbGain.gain.value, ctxA.currentTime);
        _oasState.hbGain.gain.linearRampToValueAtTime(prof.hbVol, ctxA.currentTime + fadeSec);
      }
      if (_oasState.hbSrc && _oasState.hbSrc.playbackRate) {
        var ctxB = _oasState.hbSrc.context;
        _oasState.hbSrc.playbackRate.cancelScheduledValues(ctxB.currentTime);
        _oasState.hbSrc.playbackRate.setValueAtTime(_oasState.hbSrc.playbackRate.value, ctxB.currentTime);
        _oasState.hbSrc.playbackRate.linearRampToValueAtTime(prof.hbRate, ctxB.currentTime + fadeSec);
      }
      if (_oasState.holdGain) {
        var ctxC = _oasState.holdGain.context;
        _oasState.holdGain.gain.cancelScheduledValues(ctxC.currentTime);
        _oasState.holdGain.gain.setValueAtTime(_oasState.holdGain.gain.value, ctxC.currentTime);
        _oasState.holdGain.gain.linearRampToValueAtTime(prof.holdVol, ctxC.currentTime + fadeSec);
      }
      // Breath is mouth-state-driven — temperature changes do not touch
      // it. See window.setOASBreathForMouth (called from _crossfadeMouth).
    } catch (_) {}
    try { console.log('[OAS-AUDIO] temperature → ' + temperature); } catch (_) {}
  };

  // ── PUBLIC: one-shot male sigh for scene resolution ──
  window.playOASSigh = function() {
    if (!_enabled || !window._oasSighBuffer) return;
    var ctx = _ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    var src = ctx.createBufferSource();
    src.buffer = window._oasSighBuffer;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, ctx.currentTime);
    src.connect(gain).connect(_storySfxOut(ctx));   // OAS sigh → STORY SFX
    src.start(0);
  };

  // ── PUBLIC: stop OAS audio bed with smooth fade-out ──
  // The fire / heartbeat / hold-beat loops fade out over `fadeSec`. The
  // BREATH track gets special handling: instead of fading, we disable
  // restart and leave the current playback alone so its natural tail
  // (slow recovery breaths) lands post-peak. If the user's tearing OAS
  // down mid-track (unusual — usually resolve fires after a closing
  // beat), we apply a long gentle fade so the breaths sound like they're
  // settling rather than being cut.
  window.stopOASAudio = function(fadeSec) {
    if (!_oasState.active) return;
    var dur = (typeof fadeSec === 'number') ? fadeSec : 1.0;
    _oasFadeOut({ src: _oasState.fireSrc,  gain: _oasState.fireGain  }, dur);
    _oasFadeOut({ src: _oasState.hbSrc,    gain: _oasState.hbGain    }, dur);
    _oasFadeOut({ src: _oasState.holdSrc,  gain: _oasState.holdGain  }, dur);
    // Breath: stop the restart loop. Let the currently-playing instance
    // ride to its natural end so the recovery breaths land.
    _oasState.breathAllowRestart = false;
    if (_oasState.breathGain) {
      try {
        // Long gentle taper as a safety net — if the track is at peak
        // intensity when resolve fires, this softens the volume without
        // cutting the natural breath cadence. Track's onended will fire
        // when playback finishes naturally.
        var ctx = _oasState.breathGain.context;
        var breathFade = Math.max(dur * 2, 4.0);
        _oasState.breathGain.gain.cancelScheduledValues(ctx.currentTime);
        _oasState.breathGain.gain.setValueAtTime(_oasState.breathGain.gain.value, ctx.currentTime);
        _oasState.breathGain.gain.linearRampToValueAtTime(0, ctx.currentTime + breathFade);
      } catch (_) {}
    }
    if (_oasState.breathFGain) {
      // Same gentle taper for the female breath layer (2026-05-15).
      try {
        var ctxF = _oasState.breathFGain.context;
        var breathFadeF = Math.max(dur * 2, 4.0);
        _oasState.breathFGain.gain.cancelScheduledValues(ctxF.currentTime);
        _oasState.breathFGain.gain.setValueAtTime(_oasState.breathFGain.gain.value, ctxF.currentTime);
        _oasState.breathFGain.gain.linearRampToValueAtTime(0, ctxF.currentTime + breathFadeF);
      } catch (_) {}
    }
    _oasState.fireSrc = null;    _oasState.fireGain = null;
    _oasState.hbSrc = null;      _oasState.hbGain = null;
    _oasState.holdSrc = null;    _oasState.holdGain = null;
    _oasState.breathSrc = null;  _oasState.breathGain = null;
    _oasState.breathFSrc = null; _oasState.breathFGain = null;
    _oasState.active = false;
    // Restore per-scene location bed to normal volume.
    if (typeof window.setSceneAmbientDuck === 'function') {
      try { window.setSceneAmbientDuck(false); } catch (_) {}
    }
    try { console.log('[OAS-AUDIO] stopped'); } catch (_) {}
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE AMBIENT BUS — per-scene location bed, classified by LLM each scene.
  // Crossfades between beds when the tag changes. Very low base gain so the
  // bed sits under the prose. Ducks to 30% while OAS is active.
  // Routing: SFX bus (diegetic location track, not score).
  // ═══════════════════════════════════════════════════════════════════════════

  // Tag → asset path. neutral_quiet is the fallback bed.
  var _SCENE_AMBIENT_FILES = {
    neutral_quiet:   '/assets/audio/ambient/room_tone_quiet.mp3',
    urban_room:      '/assets/audio/ambient/room_tone_urban.mp3',
    urban_traffic:   '/assets/audio/ambient/traffic.mp3',
    office:          '/assets/audio/ambient/office.mp3',
    crowd_formal:    '/assets/audio/ambient/crowd_indoor_formal.mp3',
    crowd_casual:    '/assets/audio/ambient/crowd_indoor.mp3',
    crowd_uneasy:    '/assets/audio/ambient/crowd_indoor_uneasy.mp3',
    crowd_outdoor:   '/assets/audio/ambient/crowd_outdoor.mp3',
    medieval_village:'/assets/audio/ambient/medieval_village.mp3',
    courtyard:       '/assets/audio/ambient/courtyard.mp3',
    casual_sports:   '/assets/audio/ambient/casual_sports.mp3',
    court_intrigue:  '/assets/audio/ambient/court_intrigue.mp3',
    bell_tolling:    '/assets/audio/ambient/bell_tolling.mp3',
    cathedral_steps: '/assets/audio/ambient/footsteps_reverent.mp3',
    monster_steps:   '/assets/audio/ambient/footsteps_monster.mp3',
    swordfight:      '/assets/audio/ambient/swordfight.mp3',
    fireplace:       '/assets/audio/ambient/fireplace.mp3',
    forest_day:      '/assets/audio/ambient/nature_forest.mp3',
    forest_dark:     '/assets/audio/ambient/nature_forest_dark.mp3',
    forest_mystic:   '/assets/audio/ambient/nature_forest_mystic.mp3',
    ocean:           '/assets/audio/ambient/ocean_waves.mp3',
    underwater:      '/assets/audio/ambient/underwater.mp3',
    rain_storm:      '/assets/audio/ambient/rain_thunder.mp3',
    wind_cold:       '/assets/audio/ambient/wind_winter.mp3',
    night_summer:    '/assets/audio/ambient/night_summer.mp3',
    summer_crickets: '/assets/audio/ambient/summer_crickets.mp3',
    nightclub:       '/assets/audio/ambient/nightclub_sensual.mp3',
    edm_pulse:       '/assets/audio/ambient/edm_pulse.mp3',
    suspense:        '/assets/audio/ambient/suspense_build.mp3',
    melancholy:      '/assets/audio/ambient/melancholy_quiet_loop.mp3',
    anxious:         '/assets/audio/ambient/anxious_curious_loop.mp3',
    tense_build:     '/assets/audio/ambient/tense_buildup_loop.mp3',
    battlefield:     '/assets/audio/ambient/battlefield_combat.mp3'
  };
  // Public so the classifier prompt can read the canonical enum.
  window._SCENE_AMBIENT_TAGS = Object.keys(_SCENE_AMBIENT_FILES);

  // Base gain per tag. Most beds sit at 0.08; neutral_quiet is even lower so
  // "no clear ambient" defaults to barely-there room tone, not silence.
  // Combat / nightclub-style beds get a touch less because the source is busier.
  var _SCENE_AMBIENT_GAIN = {
    neutral_quiet:   0.04,
    urban_room:      0.07,
    urban_traffic:   0.06,
    office:          0.07,
    crowd_formal:    0.08,
    crowd_casual:    0.08,
    crowd_uneasy:    0.07,
    crowd_outdoor:   0.07,
    medieval_village:0.07,
    courtyard:       0.07,
    casual_sports:   0.07,
    court_intrigue:  0.06,
    bell_tolling:    0.09,
    cathedral_steps: 0.07,
    monster_steps:   0.09,
    swordfight:      0.08,
    fireplace:       0.08,
    forest_day:      0.08,
    forest_dark:     0.08,
    forest_mystic:   0.08,
    ocean:           0.08,
    underwater:      0.09,
    rain_storm:      0.08,
    wind_cold:       0.08,
    night_summer:    0.07,
    summer_crickets: 0.07,
    nightclub:       0.05,
    edm_pulse:       0.05,
    suspense:        0.06,
    melancholy:      0.07,
    anxious:         0.07,
    tense_build:     0.06,
    battlefield:     0.05
  };

  var _sceneAmbientBuffers = {};   // tag → AudioBuffer (lazy-loaded)
  var _sceneAmbientState = {
    src: null,
    gain: null,
    currentTag: null,
    duckFactor: 1.0  // 1.0 normal, 0.3 when OAS active
  };
  // Layer-2 ambient — a quieter secondary bed that plays UNDER the primary
  // scene ambient. Use case: interior city scene where rain (primary) and
  // distant traffic (secondary) should both be audible. Primary at full
  // _sceneTargetVol(tag), secondary at 35% of its tag's target.
  var _sceneAmbient2State = {
    src: null,
    gain: null,
    currentTag: null,
    duckFactor: 1.0
  };
  var _SCENE_AMBIENT_LAYER2_RATIO = 0.35;
  // Layer-3 ambient — third bed, even quieter, for triple-stacking. Use
  // case: urban office during rain — primary=office, layer2=urban_room
  // (distant traffic), layer3=rain_storm (rain through the window).
  // Or any other "interior + outdoor context + weather" composition.
  var _sceneAmbient3State = {
    src: null,
    gain: null,
    currentTag: null,
    duckFactor: 1.0
  };
  var _SCENE_AMBIENT_LAYER3_RATIO = 0.25;

  function _loadSceneAmbientBuffer(tag) {
    if (_sceneAmbientBuffers[tag]) return Promise.resolve(_sceneAmbientBuffers[tag]);
    var url = _SCENE_AMBIENT_FILES[tag];
    if (!url) return Promise.resolve(null);
    var ctx = _ensureCtx();
    if (!ctx) return Promise.resolve(null);
    return fetch(url)
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) { return ctx.decodeAudioData(buf); })
      .then(function(decoded) { _sceneAmbientBuffers[tag] = decoded; return decoded; })
      .catch(function() { return null; });
  }

  function _sceneTargetVol(tag) {
    var base = _SCENE_AMBIENT_GAIN[tag];
    if (typeof base !== 'number') base = 0.06;
    return base * (_sceneAmbientState.duckFactor || 1.0);
  }

  function _startSceneAmbientFromBuffer(tag, buf) {
    var ctx = _ensureCtx();
    if (!ctx || !buf || !_enabled) return null;
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(_sceneTargetVol(tag), ctx.currentTime + 1.5);
    src.connect(gain).connect(_storyMusicOut(ctx));   // Scene ambient primary → STORY Music
    src.start(0);
    return { src: src, gain: gain };
  }

  // ── PUBLIC: switch to (or start) a scene ambient bed by tag. ──
  // No-op if tag is already playing. Crossfades over ~1.5s otherwise.
  // Unknown tag falls back to neutral_quiet.
  window.setSceneAmbient = function(tag) {
    if (!_enabled) return;
    if (!_SCENE_AMBIENT_FILES[tag]) tag = 'neutral_quiet';
    if (_sceneAmbientState.currentTag === tag && _sceneAmbientState.src) return;
    var prev = { src: _sceneAmbientState.src, gain: _sceneAmbientState.gain };
    _sceneAmbientState.currentTag = tag;
    _sceneAmbientState.src = null;
    _sceneAmbientState.gain = null;
    _loadSceneAmbientBuffer(tag).then(function(buf) {
      if (!buf || _sceneAmbientState.currentTag !== tag) return;
      var node = _startSceneAmbientFromBuffer(tag, buf);
      if (!node) return;
      _sceneAmbientState.src = node.src;
      _sceneAmbientState.gain = node.gain;
      try { console.log('[SCENE-AMB] → ' + tag); } catch (_) {}
    });
    // Synchronous crossfade-out of previous bed (so it begins fading even
    // before the new buffer finishes loading).
    if (prev.src && prev.gain) {
      try {
        var ctx3 = prev.gain.context;
        prev.gain.gain.cancelScheduledValues(ctx3.currentTime);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, ctx3.currentTime);
        prev.gain.gain.linearRampToValueAtTime(0, ctx3.currentTime + 1.5);
        var prevSrcRef = prev.src;
        setTimeout(function() { try { prevSrcRef.stop(); } catch (_) {} }, 1600);
      } catch (_) {}
    }
  };

  // ── PUBLIC: stop scene ambient with a smooth fade. ──
  window.stopSceneAmbient = function(fadeSec) {
    _sceneAmbientState.currentTag = null;
    if (!_sceneAmbientState.src || !_sceneAmbientState.gain) {
      _sceneAmbientState.src = null;
      _sceneAmbientState.gain = null;
    } else {
      var srcRef = _sceneAmbientState.src;
      var gainRef = _sceneAmbientState.gain;
      _sceneAmbientState.src = null;
      _sceneAmbientState.gain = null;
      var dur = (typeof fadeSec === 'number') ? fadeSec : 1.5;
      try {
        var ctx = gainRef.context;
        gainRef.gain.cancelScheduledValues(ctx.currentTime);
        gainRef.gain.setValueAtTime(gainRef.gain.value, ctx.currentTime);
        gainRef.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
        setTimeout(function() { try { srcRef.stop(); } catch (_) {} }, dur * 1000 + 50);
      } catch (_) {}
      try { console.log('[SCENE-AMB] stopped'); } catch (_) {}
    }
    // Also stop layer 2 + layer 3 — symmetric tear-down.
    if (typeof window.stopSceneAmbientLayer2 === 'function') {
      try { window.stopSceneAmbientLayer2(fadeSec); } catch (_) {}
    }
    if (typeof window.stopSceneAmbientLayer3 === 'function') {
      try { window.stopSceneAmbientLayer3(fadeSec); } catch (_) {}
    }
  };

  // ── PUBLIC: set / switch the LAYER-2 (secondary) scene ambient. ──
  // Plays at 35% of the tag's normal target gain so it sits under the
  // primary layer. Use for interior-urban scenes where rain or another
  // weather is primary but distant city sounds should still bleed in.
  // No-op if already playing same tag. Crossfades over ~1.5s on swap.
  window.setSceneAmbientLayer2 = function(tag) {
    if (!_enabled) return;
    if (!_SCENE_AMBIENT_FILES[tag]) return;  // unknown tag — silently skip
    if (_sceneAmbient2State.currentTag === tag && _sceneAmbient2State.src) return;
    var prev = { src: _sceneAmbient2State.src, gain: _sceneAmbient2State.gain };
    _sceneAmbient2State.currentTag = tag;
    _sceneAmbient2State.src = null;
    _sceneAmbient2State.gain = null;
    _loadSceneAmbientBuffer(tag).then(function(buf) {
      if (!buf || _sceneAmbient2State.currentTag !== tag) return;
      var ctx = _ensureCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(function(){});
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var gain = ctx.createGain();
      var baseVol = _SCENE_AMBIENT_GAIN[tag];
      if (typeof baseVol !== 'number') baseVol = 0.06;
      var targetVol = baseVol * _SCENE_AMBIENT_LAYER2_RATIO * (_sceneAmbient2State.duckFactor || 1.0);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.5);
      src.connect(gain).connect(_storyMusicOut(ctx));   // Scene ambient layer 2 → STORY Music
      src.start(0);
      _sceneAmbient2State.src = src;
      _sceneAmbient2State.gain = gain;
      try { console.log('[SCENE-AMB-L2] → ' + tag + ' @ ' + targetVol.toFixed(3)); } catch (_) {}
    });
    // Crossfade-out previous layer-2 bed.
    if (prev.src && prev.gain) {
      try {
        var ctx2 = prev.gain.context;
        prev.gain.gain.cancelScheduledValues(ctx2.currentTime);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, ctx2.currentTime);
        prev.gain.gain.linearRampToValueAtTime(0, ctx2.currentTime + 1.5);
        var prevSrcRef = prev.src;
        setTimeout(function() { try { prevSrcRef.stop(); } catch (_) {} }, 1600);
      } catch (_) {}
    }
  };

  // ── PUBLIC: set / switch the LAYER-3 (tertiary) scene ambient. ──
  // Plays at 25% of the tag's normal target gain — even quieter than
  // layer 2. Use for triple-stacked compositions like office (primary)
  // + urban_room (layer 2 traffic) + rain_storm (layer 3 rain).
  window.setSceneAmbientLayer3 = function(tag) {
    if (!_enabled) return;
    if (!_SCENE_AMBIENT_FILES[tag]) return;
    if (_sceneAmbient3State.currentTag === tag && _sceneAmbient3State.src) return;
    var prev = { src: _sceneAmbient3State.src, gain: _sceneAmbient3State.gain };
    _sceneAmbient3State.currentTag = tag;
    _sceneAmbient3State.src = null;
    _sceneAmbient3State.gain = null;
    _loadSceneAmbientBuffer(tag).then(function(buf) {
      if (!buf || _sceneAmbient3State.currentTag !== tag) return;
      var ctx = _ensureCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(function(){});
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var gain = ctx.createGain();
      var baseVol = _SCENE_AMBIENT_GAIN[tag];
      if (typeof baseVol !== 'number') baseVol = 0.06;
      var targetVol = baseVol * _SCENE_AMBIENT_LAYER3_RATIO * (_sceneAmbient3State.duckFactor || 1.0);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.5);
      src.connect(gain).connect(_storyMusicOut(ctx));   // Layer 3 → STORY Music
      src.start(0);
      _sceneAmbient3State.src = src;
      _sceneAmbient3State.gain = gain;
      try { console.log('[SCENE-AMB-L3] → ' + tag + ' @ ' + targetVol.toFixed(3)); } catch (_) {}
    });
    if (prev.src && prev.gain) {
      try {
        var ctx2 = prev.gain.context;
        prev.gain.gain.cancelScheduledValues(ctx2.currentTime);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, ctx2.currentTime);
        prev.gain.gain.linearRampToValueAtTime(0, ctx2.currentTime + 1.5);
        var prevSrcRef = prev.src;
        setTimeout(function() { try { prevSrcRef.stop(); } catch (_) {} }, 1600);
      } catch (_) {}
    }
  };

  window.stopSceneAmbientLayer3 = function(fadeSec) {
    _sceneAmbient3State.currentTag = null;
    if (!_sceneAmbient3State.src || !_sceneAmbient3State.gain) {
      _sceneAmbient3State.src = null;
      _sceneAmbient3State.gain = null;
      return;
    }
    var srcRef3 = _sceneAmbient3State.src;
    var gainRef3 = _sceneAmbient3State.gain;
    _sceneAmbient3State.src = null;
    _sceneAmbient3State.gain = null;
    var dur3 = (typeof fadeSec === 'number') ? fadeSec : 1.5;
    try {
      var ctx4 = gainRef3.context;
      gainRef3.gain.cancelScheduledValues(ctx4.currentTime);
      gainRef3.gain.setValueAtTime(gainRef3.gain.value, ctx4.currentTime);
      gainRef3.gain.linearRampToValueAtTime(0, ctx4.currentTime + dur3);
      setTimeout(function() { try { srcRef3.stop(); } catch (_) {} }, dur3 * 1000 + 50);
    } catch (_) {}
    try { console.log('[SCENE-AMB-L3] stopped'); } catch (_) {}
  };

  window.stopSceneAmbientLayer2 = function(fadeSec) {
    _sceneAmbient2State.currentTag = null;
    if (!_sceneAmbient2State.src || !_sceneAmbient2State.gain) {
      _sceneAmbient2State.src = null;
      _sceneAmbient2State.gain = null;
      return;
    }
    var srcRef2 = _sceneAmbient2State.src;
    var gainRef2 = _sceneAmbient2State.gain;
    _sceneAmbient2State.src = null;
    _sceneAmbient2State.gain = null;
    var dur2 = (typeof fadeSec === 'number') ? fadeSec : 1.5;
    try {
      var ctx3 = gainRef2.context;
      gainRef2.gain.cancelScheduledValues(ctx3.currentTime);
      gainRef2.gain.setValueAtTime(gainRef2.gain.value, ctx3.currentTime);
      gainRef2.gain.linearRampToValueAtTime(0, ctx3.currentTime + dur2);
      setTimeout(function() { try { srcRef2.stop(); } catch (_) {} }, dur2 * 1000 + 50);
    } catch (_) {}
    try { console.log('[SCENE-AMB-L2] stopped'); } catch (_) {}
  };

  // ── PUBLIC: duck scene ambient for OAS coexistence. ──
  // active=true → 30% gain; active=false → back to 100%.
  window.setSceneAmbientDuck = function(active) {
    _sceneAmbientState.duckFactor = active ? 0.3 : 1.0;
    if (!_sceneAmbientState.gain || !_sceneAmbientState.currentTag) return;
    try {
      var ctx = _sceneAmbientState.gain.context;
      var target = _sceneTargetVol(_sceneAmbientState.currentTag);
      _sceneAmbientState.gain.gain.cancelScheduledValues(ctx.currentTime);
      _sceneAmbientState.gain.gain.setValueAtTime(_sceneAmbientState.gain.gain.value, ctx.currentTime);
      _sceneAmbientState.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.8);
    } catch (_) {}
  };

  // ── PUBLIC: corridor reader-mode fade. ──
  // Independent of screen-based mute. When active, corridor ambience fades to
  // silence so the scene ambient can take over. Restored on showScreen('setup').
  var _corridorReaderMode = false;
  window._setCorridorAmbienceForReader = function(active) {
    _corridorReaderMode = !!active;
    if (!_corridorGain) return;
    try {
      var ctx = _corridorGain.context;
      var targetVol;
      if (_corridorReaderMode) {
        targetVol = 0;
      } else {
        targetVol = _corridorMuted ? 0 : _corridorNormalVol;
      }
      _corridorGain.gain.cancelScheduledValues(ctx.currentTime);
      _corridorGain.gain.setValueAtTime(_corridorGain.gain.value, ctx.currentTime);
      _corridorGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.5);
    } catch (_) {}
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VOLUME CONTROL API — independent music / SFX sliders
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Helper: robust master-gain set ─────────────────────────────────
  // Web Audio caveat: setting AudioParam.value directly only inserts an
  // event at currentTime — any future scheduled ramps still play out
  // toward THEIR target. To make sliders authoritative ("0% means silent
  // RIGHT NOW and stays silent"), we cancel scheduled values + set both
  // the .value AND a setValueAtTime at currentTime. After this call,
  // any future ramps still work but start from the new value.
  function _setMasterGainSafely(gainNode, vol) {
    if (!gainNode) return;
    try {
      var ctx = gainNode.context;
      var now = ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(vol, now);
      gainNode.gain.value = vol;
    } catch (_) {
      try { gainNode.gain.value = vol; } catch (__) {}
    }
  }

  // SITE buses — corridor ambience (music) + UI sounds (sfx).
  window.setSFXVolume = function(v) {
    _sfxVolume = Math.max(0, Math.min(1, +v || 0));
    _setMasterGainSafely(_sfxMasterGain, _sfxVolume);
    try { localStorage.setItem('sb_sfx_volume', _sfxVolume.toString()); } catch (_) {}
  };

  window.setMusicVolume = function(v) {
    _musicVolume = Math.max(0, Math.min(1, +v || 0));
    _setMasterGainSafely(_musicMasterGain, _musicVolume);
    try { localStorage.setItem('sb_music_volume', _musicVolume.toString()); } catch (_) {}
    // Also update forbidden ambience in app.js if active
    if (window._updateForbiddenAmbienceVolume) window._updateForbiddenAmbienceVolume(_musicVolume);
  };

  // STORY buses — scene ambient (music) + OAS / in-story SFX.
  window.setStorySfxVolume = function(v) {
    _storySfxVolume = Math.max(0, Math.min(1, +v || 0));
    _setMasterGainSafely(_storySfxGain, _storySfxVolume);
    try { localStorage.setItem('sb_story_sfx_volume', _storySfxVolume.toString()); } catch (_) {}
  };

  window.setStoryMusicVolume = function(v) {
    _storyMusicVolume = Math.max(0, Math.min(1, +v || 0));
    _setMasterGainSafely(_storyMusicGain, _storyMusicVolume);
    try { localStorage.setItem('sb_story_music_volume', _storyMusicVolume.toString()); } catch (_) {}
  };

  window.getSFXVolume        = function() { return _sfxVolume; };
  window.getMusicVolume      = function() { return _musicVolume; };
  window.getStorySfxVolume   = function() { return _storySfxVolume; };
  window.getStoryMusicVolume = function() { return _storyMusicVolume; };

})();
