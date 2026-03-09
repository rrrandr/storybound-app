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

  // ── Lazy AudioContext init (requires user gesture) ──
  function _ensureCtx() {
    if (_audioCtx) return _audioCtx;
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {}
    return _audioCtx;
  }

  // ── User-gesture unlock ──
  function _unlock() {
    if (_initialized) return;
    const ctx = _ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    _initialized = true;
  }

  document.addEventListener('click', _unlock, { once: false, passive: true });
  document.addEventListener('touchstart', _unlock, { once: false, passive: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUND DEFINITIONS — synthesized micro-sounds
  // Each function creates a short, disposable audio graph
  // ═══════════════════════════════════════════════════════════════════════════

  const SOUNDS = {

    // Card on velvet — breathy fabric brush, no tonal oscillator
    card_flip: function(ctx, t) {
      const dur = 0.14;
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.22;
      noise.buffer = buf;

      // Low bandpass — warm fabric swoosh, no highs
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(180, t + dur);
      bp.Q.value = 0.7;

      // Gentle fade-in then out (avoids click transient)
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(bp).connect(gain).connect(ctx.destination);
      noise.start(t);
      noise.stop(t + dur);
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

      noise.connect(bp).connect(gain).connect(ctx.destination);
      noise.start(t);
      noise.stop(t + dur);
    },

    // Soft tactile tap — buttons (noise-only, no oscillator)
    button_click: function(ctx, t) {
      const dur = 0.04;
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
      noise.buffer = buf;

      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 500;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.10, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(filt).connect(gain).connect(ctx.destination);
      noise.start(t);
      noise.stop(t + dur);
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

      noise.connect(filt).connect(gain).connect(ctx.destination);
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

      osc.connect(gain).connect(ctx.destination);
      noise.connect(nFilt).connect(nGain).connect(ctx.destination);
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

      noise.connect(filt).connect(gain).connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.12);
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

      noise.connect(filt).connect(gain).connect(ctx.destination);
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
      ctx.resume().catch(() => {});
      return; // will play next time after resume
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

})();
