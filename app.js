// Wait for Supabase SDK to be available before using it
async function waitForSupabaseSDK(timeoutMs = 2000) {
  const start = Date.now();
  while (
    !(window.supabase && typeof window.supabase.createClient === 'function') &&
    (Date.now() - start) < timeoutMs
  ) {
    await new Promise(r => setTimeout(r, 25));
  }
  return window.supabase || null;
}
(async function(){
  let tempImgUrl = null;
  // --- CONFIG ---
  let config = {};
  try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) config = await res.json();
  } catch (e) { 
      console.warn("Config load failed (using defaults)", e); 
  }

  const SUPABASE_URL = config.supabaseUrl || ""; 
  const SUPABASE_ANON_KEY = config.supabaseAnonKey || "";
  const PROXY_URL = config.proxyUrl || 'https://storybound-proxy.vercel.app/api/proxy';
  var IMAGE_PROXY_URL = config.imageProxyUrl || 'https://storybound-proxy.vercel.app/api/image';
  const STORY_MODEL = 'grok-4-1-fast-reasoning'; 
  
  // Singleton Supabase Client
  let sb = null;
  if (window.supabase && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY) {
    try {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch(e) { console.error("Supabase init error:", e); }
  } else {
    console.warn("Supabase not configured. Couple mode disabled.");
  }

  if(!sb) {
     const btnCouple = document.getElementById('btnCoupleMode');
     if(btnCouple){
         btnCouple.disabled = true;
         const desc = btnCouple.nextElementSibling;
         if(desc && desc.classList.contains('choice-desc')) {
             desc.textContent = "Unavailable on this deployment.";
         }
     }
  }

  // Presence Constants
  const PRESENCE_HEARTBEAT_MS = 15000;
  
  async function ensureAnonSession(){
    if(!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    if(session?.user?.id) return session.user.id;
    const { data, error } = await sb.auth.signInAnonymously();
    if(error) { console.error("Auth error:", error); return null; }
    return data.user.id;
  }

  function getNickname(){
    let n = localStorage.getItem("sb_nickname");
    if(!n){
      n = prompt("Enter a nickname for Couple Mode:", "Guest") || "Guest";
      localStorage.setItem("sb_nickname", n);
    }
    return n;
  }

  // =========================
  // STRANGER CLICK TRACKING
  // =========================
  function getStrangerSessionId() {
    let sid = localStorage.getItem('sb_stranger_session');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('sb_stranger_session', sid);
    }
    return sid;
  }

  async function trackStrangerClick() {
    if (!sb) return;
    const sessionId = getStrangerSessionId();
    try {
      await sb.from('stranger_clicks').insert({ session_id: sessionId });
    } catch (e) {
      console.warn('Stranger click tracking unavailable:', e.message);
    }
  }

  async function fetchStrangerCounts() {
    if (!sb) return { total: 0, unique: 0 };
    try {
      // Get total clicks
      const { count: total, error: totalErr } = await sb
        .from('stranger_clicks')
        .select('*', { count: 'exact', head: true });

      if (totalErr) throw totalErr;

      // Get unique sessions
      const { data: uniqueData, error: uniqueErr } = await sb
        .from('stranger_clicks')
        .select('session_id');

      if (uniqueErr) throw uniqueErr;

      const uniqueSessions = new Set(uniqueData.map(r => r.session_id));
      return { total: total || 0, unique: uniqueSessions.size };
    } catch (e) {
      console.warn('Stranger count fetch unavailable:', e.message);
      return { total: 0, unique: 0 };
    }
  }

  async function updateStrangerCountDisplay() {
    const counts = await fetchStrangerCounts();
    const el = document.getElementById('strangerCount');
    if (el && counts.total > 0) {
      el.textContent = counts.unique.toLocaleString();
      // Update subtitle if exists
      const subtitle = document.getElementById('strangerCountSubtitle');
      if (subtitle) {
        subtitle.textContent = `(${counts.total.toLocaleString()} total visits)`;
      }
    }
  }

  // =========================
  // STORYBOUND EVENT LOGGER
  // =========================
  const SB_ANALYTICS_KEY = "sb_analytics_v1";
  
  function sbLog(event, payload = {}) {
    try {
      const raw = localStorage.getItem(SB_ANALYTICS_KEY);
      const data = raw ? JSON.parse(raw) : [];
      const sId = (state && state.storyId) ? state.storyId : null;
      data.push({
        event,
        payload,
        ts: Date.now(),
        iso: new Date().toISOString(),
        storyId: sId,
        access: state?.access || null,
        intensity: state?.intensity || null
      });
      if (data.length > 1000) data.shift();
      localStorage.setItem(SB_ANALYTICS_KEY, JSON.stringify(data));
    } catch (e) { console.warn("Analytics log failed", e); }
  }
  
  window.sbDumpAnalytics = () => JSON.parse(localStorage.getItem(SB_ANALYTICS_KEY) || "[]");

  // =========================
  // GROK PREVIEW GENERATOR
  // =========================
  const EROTIC_PREVIEW_TEXT = "The air in the room grew heavy, charged with a raw, undeniable hunger. His hands didn't hesitate, sliding up her thighs with possessive intent, fingers digging into soft flesh. She gasped, arching into the touch, her breath hitching as he leaned in to bite gently at the sensitive cord of her neck. There was no room for coy games now; the heat radiating between them demanded friction, skin against skin. He guided her hips, aligning them with a rough urgency that made her knees weak. As they connected, the world narrowed down to the rhythm of their bodies and the sharp, exquisite friction of movement. It was unpolished, desperate, and entirely consuming.";

  const META_DIRECTIVES = {
      aid: [
          "Include a brief beat where the characters sense an unseen guidance and choose to follow the offered path—like accepting an omen. Keep it understated.",
          "Let the characters notice the scene tightening as though arranged; they quietly lean into it, trusting the pressure as permission.",
          "Add a small moment of recognition: the world seems to 'nudge' them, and they consent to be led—curious, willing, unafraid."
      ],
      rebel: [
          "Include a brief beat where the characters feel the scene being steered and deliberately choose a resisting move—an inconvenient truth, a refusal, a delay. Keep it intimate and plausible, not theatrical.",
          "Let the characters sense a pattern closing around them and try to break it—one quiet defiance that alters the rhythm.",
          "Add a small moment where they realize something is arranging them and they push back—choosing the harder option on purpose."
      ],
      seduce: [
          "Include a brief beat where the characters treat the unseen influence as an intimate interlocutor—offering a bargain or a dare.",
          "Let the characters sense the hand behind events and respond with a quiet, provocative negotiation—'if you want this, then give me that.'",
          "Add a small moment where they acknowledge the manipulation and try to entice it into a kinder or sharper turn—flirtation as bargaining with destiny."
      ]
  };

  // --- GLOBAL STATE INITIALIZATION ---
  window.state = { 
      tier:'free', 
      picks:{ genre:[], dynamic:[], pov:'First', style:['Breathless'] }, 
      gender:'Female', 
      loveInterest:'Male', 
      intensity:'Naughty', 
      turnCount:0,
      sysPrompt: "",
      fateOptions: [],
      fatePressure: 1, 
      awareness: 0, 
      stance: 'aid', 
      metaChance: 0.10, 
      consecutiveFate: 0, 
      consecutiveAid: 0,
      storyId: null,
      access: 'free',
      subscribed: false,
      authorGender: 'Female',
      authorPronouns: 'She/Her',
      
      storyTargetWords: 10000,
      storyLength: 'voyeur', 
      flingClimaxDone: false,
      flingConsequenceShown: false,
      storyEnded: false,
      
      billingStatus: 'active',
      billingGraceUntil: 0,
      billingLastError: '',
      
      visual: {
          autoLock: true,
          locked: false,
          lastImageUrl: "",
          bible: { style: "", setting: "", characters: {} }
      },

      lastPurchaseType: null,
      pendingUpgradeToAffair: false,
      
      unlockedFateIdx: [0, 1],
      lastFate: null,
      mode: 'solo',
      roomId: null,
      roomCode: null,
      roomTurn: 1,
      roomDriver: null,
      roomAccess: 'free',
      myUid: null,
      myNick: null,
      turnsChannel: null,
      roomChannel: null,
      membersChannel: null,
      presenceInterval: null,
      typingTimer: null,
      lastTypingSentAt: 0,
      partnerStatus: { online:false, lastSeenAt:null, typing:false, typingAt:null, uid:null },
      _lastTurnId: null,
      selectedFateIndex: -1,
      fateSelectedIndex: -1,
      fateCommitted: false,
      selectedFatePayload: null,
      _snapshotThisTurn: false,
      sexPushCount: 0,
      lastSexPushAt: null,
      veto: { bannedWords: [], bannedNames: [], excluded: [], tone: [], corrections: [], ambientMods: [] },
      quill: { uses: 0, nextReadyAtWords: 0, baseCooldown: 1200, perUse: 600, cap: 3600 },
      quillCommittedThisTurn: false,
      quillIntent: '',
      vetoCommittedThisTurn: false,
      vetoIntentRaw: '',
      storyStage: 'pre-intimacy',
      sandbox: false,
      godModeActive: false,
      authorChairActive: false,
      lastSavedWordCount: 0,
      storyOrigin: 'solo',
      player2Joined: false,
      inviteRevoked: false,
      batedBreathActive: false,
      purchaseContext: null,
      edgeCovenant: { active:false, level:1, acceptedAtTurn:0, offeredBy:"" },
      pendingEdgeOffer: null,
      edgeCovenantOfferedThisTurn: false,
      nonConPushCount: 0,
      lastNonConPushAt: 0,
      lastSafewordAt: 0,
      safety: {
          darkThemes: true,
          nonConImplied: false,
          violence: true,
          boundaries: ["No sexual violence"],
          mode: 'balanced'
      },

      // 5TH PERSON POV (AUTHOR) CONTROL
      povMode: window.state?.povMode || 'normal',                // 'normal' | 'author5th'
      authorPresence: window.state?.authorPresence || 'normal',  // 'normal' | 'frequent'
      authorCadenceWords: window.state?.authorCadenceWords || 40, // target avg words between Author mentions
      fateCardVoice: window.state?.fateCardVoice || 'neutral',   // 'neutral' | 'authorial'
      allowAuthorAwareness: window.state?.allowAuthorAwareness ?? true,
      authorAwarenessChance: window.state?.authorAwarenessChance || 0.13,
      authorAwarenessWindowWords: window.state?.authorAwarenessWindowWords || 1300,
      authorAwarenessMaxDurationWords: window.state?.authorAwarenessMaxDurationWords || 2500
  };
  
  var state = window.state;

  // LATCH for Visualize Re-entrancy
  let _vizInFlight = false;

  // --- HELPERS ---
  function $(id){ return document.getElementById(id); }
  function toggle(id){ const el = document.getElementById(id); if(el) el.classList.toggle('hidden'); }
  function resetTurnSnapshotFlag(){ state._snapshotThisTurn = false; }

  // --- THEME & FONT HELPERS ---
  window.setTheme = function(name) {
      document.body.classList.remove('theme-sepia', 'theme-midnight', 'theme-print', 'theme-easy');
      if (name && name !== 'default') {
          document.body.classList.add('theme-' + name);
      }
  };

  window.setFont = function(fontValue) {
      document.documentElement.style.setProperty('--font-story', fontValue);
  };

  window.setFontSize = function(size) {
      document.documentElement.style.setProperty('--story-size', size + 'px');
  };

  window.setGameIntensity = function(level) {
      // honour access tiers: dirty requires subscription, erotic requires non-free
      if (level === 'Dirty' && window.state.access !== 'sub') { window.showPaywall('sub'); return; }
      if (level === 'Erotic' && window.state.access === 'free') { window.openEroticPreview(); return; }
      window.state.intensity = level;
      updateIntensityUI();
  };

  window.checkCustom = function(selectEl, inputId) {
      const input = document.getElementById(inputId);
      if (input) {
          input.classList.toggle('hidden', selectEl.value !== 'Custom');
      }
  };

  function syncPovDerivedFlags(){
      if(!window.state) return;
      const pov = (window.state.picks?.pov || '').toLowerCase();
      const is5th = /fifth|5th|author/.test(pov) || window.state.povMode === 'author5th';
      if(is5th){
          window.state.povMode = 'author5th';
          window.state.authorPresence = 'frequent';
          window.state.fateCardVoice = 'authorial';
      } else {
          window.state.povMode = 'normal';
          window.state.authorPresence = 'normal';
          window.state.fateCardVoice = 'neutral';
      }
  }

  // NAV HELPER
  function closeAllOverlays() {
      ['payModal', 'vizModal', 'menuOverlay', 'eroticPreviewModal', 'coupleConsentModal', 'coupleInvite', 'strangerModal', 'edgeCovenantModal', 'previewModal'].forEach(id => {
          const el = document.getElementById(id);
          if(el) el.classList.add('hidden');
      });
  }

  // --- NAVIGATION STATE ---
  let _navHistory = [];
  let _currentScreenId = 'ageGate'; 

  function updateNavUI() {
      const backBtn = document.getElementById('globalBackBtn');
      const burger = document.getElementById('burgerBtn');

      if(backBtn) {
          const hidden = ['ageGate', 'tosGate', 'tierGate', 'modeSelect'].includes(_currentScreenId);
          if(hidden) backBtn.classList.add('hidden');
          else backBtn.classList.remove('hidden');
      }
      
      if(burger) {
          if(_currentScreenId === 'ageGate') burger.classList.add('hidden');
          else burger.classList.remove('hidden');
      }
  }

  function goBack() {
      if (_navHistory.length === 0) {
          if(typeof coupleCleanup === 'function' && state.mode === 'couple') coupleCleanup();
          window.showScreen('modeSelect');
          return;
      }
      const prev = _navHistory.pop();
      window.showScreen(prev, true);
  }

  window.showScreen = function(id, isBack = false){
      closeAllOverlays();
      
      if(id === 'modeSelect') {
          _navHistory = []; 
      } else if (!isBack && _currentScreenId && _currentScreenId !== id) {
         if(!['ageGate', 'tosGate', 'tierGate'].includes(_currentScreenId)) {
             _navHistory.push(_currentScreenId);
         }
      }

      document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));

      const target = document.getElementById(id);
      if(target) target.classList.remove('hidden');
      
      const app = document.getElementById('app');
      if (app && target) {
          if (app.contains(target)) app.classList.remove('hidden');
          else app.classList.add('hidden');
      }
      
      window.scrollTo(0,0);
      _currentScreenId = id;
      updateNavUI();

      // Populate suggestion pills when entering setup screen
      if(id === 'setup') {
          populatePills();
      }

      // Initialize game screen elements
      if(id === 'game') {
          if(window.initCards) window.initCards();
          if(window.dealFateCards && (!state.fateOptions || state.fateOptions.length === 0)) {
              window.dealFateCards();
          }
          updateQuillUI();
      }
  };

  function initNavBindings() {
      const app = document.getElementById('app');
      if (app) {
          Array.from(app.children).forEach(el => {
              if (el.tagName === 'DIV') el.classList.add('screen');
          });
      }
      ['ageGate', 'tosGate', 'tierGate'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.add('screen');
      });

      const backBtn = document.getElementById('globalBackBtn');
      if(backBtn && !backBtn.dataset.navBound) {
          backBtn.dataset.navBound = "true";
          backBtn.addEventListener('click', goBack);
      }
      
      // Global Locked Click Delegation
      document.addEventListener('click', (e) => {
          const lockedTarget = e.target.closest('.locked, .locked-style, .locked-input, .locked-tease, .locked-pass, [data-locked]');
          if (lockedTarget) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              window.openPaywall('unlock');
          }
      }, true); 

      document.addEventListener('keydown', (e) => {
          if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
              const p = document.getElementById('auth-panel');
              if(p) p.classList.toggle('hidden');
          }
      });
  }

  // --- SAFETY & CONSENT ---
  function showToast(msg) {
      const t = document.getElementById('toast');
      if(t) {
          t.textContent = msg;
          t.classList.remove('hidden');
          t.style.animation = 'none';
          void t.offsetWidth;
          t.style.animation = 'fadeInOut 3s forwards';
      }
  }

  function sanitizeUserIntent(action, dialogue) {
      const input = (action + " " + dialogue).toLowerCase();
      const nonConPatterns = [
          /\brape\b/i, /\b(non[-\s]?consensual|without consent)\b/i,
          /\bagainst (her|his|their) will\b/i, /\bforce\b/i
      ];
      
      if(nonConPatterns.some(rx => rx.test(input))) {
          const now = Date.now();
          if (now - (state.lastNonConPushAt || 0) > 15 * 60 * 1000) state.nonConPushCount = 0;
          state.nonConPushCount = (state.nonConPushCount || 0) + 1;
          state.lastNonConPushAt = now;

          const directive = "ABSOLUTE SAFETY RULE: User input implied non-consensual dynamics. 1. DO NOT depict the act. NO sexual violence. 2. REFRAME: Partner deflects safely OR shifts to explicit, enthusiastic consent negotiation.";
          return { safeAction: undefined, safeDialogue: undefined, flags: ["redirect_nonconsent"], directive };
      }
      return { safeAction: undefined, safeDialogue: undefined, flags: [], directive: "" };
  }

  function buildConsentDirectives() {
      let s = "SAFETY & CONSENT RULES: ABSOLUTELY NO depiction of explicit sexual violence or non-consensual sexual acts. ";
      if (!state.safety.nonConImplied) s += "NO implied non-consent. All dynamics must be clearly enthusiastic. ";
      else s += "Implied non-consent (CNC/Dubcon) is PERMITTED if contextually appropriate, but keep explicit assaults off-screen. ";
      if (!state.safety.violence) s += "MINIMIZE VIOLENCE. Focus on emotional conflict. ";
      if (state.safety.boundaries.length > 0) s += "HARD BOUNDARIES (NEVER VIOLATE): " + state.safety.boundaries.join(", ") + ". ";
      return s;
  }

  // --- ACCESS HELPERS ---
  function resolveAccess(){
    if (state.mode === 'couple') {
        const roomAcc = state.roomAccess || 'free';
        return (state.subscribed) ? 'sub' : roomAcc; 
    }
    if (state.subscribed) return 'sub';
    if (state.storyId && hasStoryPass(state.storyId)) return 'pass';
    return 'free';
  }

  function syncTierFromAccess(){
    if(localStorage.getItem('sb_subscribed') === '1') state.subscribed = true;

    const inGrace = (state.billingStatus === 'grace' && Date.now() < state.billingGraceUntil);
    const invalidSub = state.billingStatus === 'canceled' || (state.billingStatus === 'past_due' && !inGrace);

    if (state.subscribed && !invalidSub) {
        state.access = 'sub';
    } else if (state.storyId && hasStoryPass(state.storyId)) {
        state.access = 'pass';
    } else {
        state.access = (state.mode === 'couple' ? (state.roomAccess || 'free') : 'free');
    }
    
    state.tier = (state.access === 'free') ? 'free' : 'paid';
  }

  window.openPaywall = function(reason) {
      if(typeof window.showPaywall === 'function') {
          window.showPaywall(reason === 'god' ? 'god' : 'sub');
      }
  };

  function currentStoryWordCount(){
    const txt = (document.getElementById('storyText')?.innerText || '').trim();
    if(!txt) return 0;
    return txt.split(/\s+/).filter(Boolean).length;
  }

  function getSexAllowedAtWordCount() {
    if(state.godModeActive) return 0; 
    const target = state.storyTargetWords;
    switch(state.intensity){
        case "Clean":   return Infinity;
        case "Naughty": return Math.floor(target * 0.55);
        case "Erotic":  return Math.floor(target * 0.30);
        case "Dirty":   return Math.floor(target * 0.20);
        default: return Math.floor(target * 0.55);
    }
  }

  function maybeFlipConsummation(text){
     if(state.godModeActive || state.batedBreathActive || state.mode !== 'solo') return;
     if(state.storyStage !== 'pre-intimacy') return; 

     let flipped = false;
     const wc = currentStoryWordCount();
     if(wc >= getSexAllowedAtWordCount()) flipped = true;
     if(/(only you|forever with you|marry me|my wife|my husband)/i.test(text)) flipped = true;
     if(state.intensity === 'Dirty') flipped = true;

     if(flipped){
         state.storyStage = 'post-consummation';
         saveStorySnapshot(); 
     }
  }

  function checkStoryEndCaps() {
      const wc = currentStoryWordCount();
      const turns = state.turnCount || 0;
      const len = state.storyLength || 'voyeur';

      if (len === 'voyeur' && (wc > 7000 || turns > 28) && !state.storyEnded) {
          state.storyEnded = true;
          document.getElementById('submitBtn').disabled = true;
          const div = document.createElement('div');
          div.className = 'box';
          div.style.textAlign = 'center';
          div.style.border = '1px solid var(--gold)';
          div.innerHTML = `<p style="font-style:italic; color:var(--gold)">The moment hangs, unresolved.</p>`;
          document.getElementById('storyText').appendChild(div);
          return;
      }

      if (len === 'fling' && !state.storyEnded) {
          const overCap = (wc > 15000 || turns > 60);
          if (state.flingClimaxDone && state.flingConsequenceShown && overCap) {
              state.storyEnded = true;
              document.getElementById('submitBtn').disabled = true;
              renderFlingEnd();
          }
      }
  }

  function getQuillReady() {
      if(state.godModeActive) return true; 
      return currentStoryWordCount() >= (state.quill.nextReadyAtWords || 0);
  }

  function computeNextCooldownWords() {
      if(state.godModeActive) return 0;
      // Base 1200, +600 per use, cap at 3600
      const base = 1200;
      const perUse = 600;
      const cap = 3600;
      return Math.min(cap, base + (state.quill.uses * perUse));
  }

  function checkAuthorChairUnlock() {
      const totalWords = Number(localStorage.getItem('sb_global_word_count') || 0);
      return totalWords >= 250000;
  }

  // Veto patterns that indicate scene/event demands (rejected)
  const VETO_SCENE_PATTERNS = [
      /^(make|have|let|force|ensure|require|demand|insist|want|need)\s+(them|him|her|it|the|a)\b/i,
      /^bring\s+(them|him|her)\s+to/i,
      /^start\s+a\s+(scene|chapter|sequence)/i,
      /^introduce\s+(a|the|new)\b/i,
      /^add\s+(a|the|new)\s+(scene|character|kink|setting)/i
  ];

  function parseVetoInput(rawText) {
      if(!rawText) return { exclusions:[], corrections:[], ambientMods:[], rejected:[] };
      const lines = rawText.split('\n');
      const result = { exclusions:[], corrections:[], ambientMods:[], rejected:[] };

      lines.forEach(line => {
          const l = line.trim();
          if(!l) return;
          const lower = l.toLowerCase();

          // Check if this is a scene/event demand (reject it)
          const isSceneDemand = VETO_SCENE_PATTERNS.some(p => p.test(l));
          if(isSceneDemand) {
              result.rejected.push(l);
              return;
          }

          // HARD EXCLUSIONS: ban:, no , never
          if(lower.startsWith('ban:') || lower.startsWith('ban ')) {
              result.exclusions.push(l.replace(/^ban[:\s]+/i, '').trim());
          } else if(lower.startsWith('no ') || lower.startsWith('never ')) {
              result.exclusions.push(l);
          }
          // EDITORIAL CORRECTIONS: rename:, replace:, call
          else if(lower.startsWith('rename:') || lower.startsWith('replace:')) {
              result.corrections.push(l);
          } else if(lower.includes('->') || lower.includes('→')) {
              result.corrections.push(l);
          } else if(lower.startsWith('call ') && lower.includes(' not ')) {
              result.corrections.push(l);
          }
          // AMBIENT MODIFIERS: add more, increase, keep, make it, let the
          else if(/^(add\s+more|increase|decrease|keep|make\s+it|let\s+the|more\s+)/i.test(l)) {
              result.ambientMods.push(l);
          }
          // Default: treat as exclusion
          else {
              result.exclusions.push(l);
          }
      });
      return result;
  }

  function applyVetoFromInput() {
      const el = document.getElementById('vetoInput');
      if(!el) return;
      const parsed = parseVetoInput(el.value);

      // Show rejection toast if any lines were rejected
      if(parsed.rejected.length > 0) {
          showToast("Veto removes elements or applies ambient constraints. It can't be used to make events happen.");
      }

      // Map to existing state.veto structure
      state.veto.bannedWords = parsed.exclusions;
      state.veto.excluded = parsed.exclusions;
      state.veto.corrections = parsed.corrections;
      state.veto.ambientMods = parsed.ambientMods;
  }

  // Legacy compatibility wrapper
  function parseStoryControls(rawText) {
      const vetoResult = parseVetoInput(rawText);
      return {
          veto: {
              bannedWords: vetoResult.exclusions,
              bannedNames: [],
              excluded: vetoResult.exclusions,
              tone: vetoResult.ambientMods
          },
          quillDraft: ""
      };
  }

  function applyVetoFromControls() {
      applyVetoFromInput();
  }

  // --- SUGGESTION PILLS (CHRISTMAS LIGHTS) ---
  const VETO_SUGGESTIONS = [
      "ban: moist", "no tattoos", "no scars", "no cheating", "no amnesia",
      "rename: -> ", "more description", "keep pacing slower", "no second-person",
      "no pregnancy", "no marriage proposals", "no love triangles", "no flashbacks",
      "no jealousy", "no miscommunication trope", "ban: orbs", "no cliffhangers",
      "no body shaming", "no gore", "no public scenes", "no workplace romance"
  ];
  const QUILL_SUGGESTIONS = [
      "enemies to lovers", "only one bed", "bring them somewhere private",
      "increase tension", "confession scene", "near-miss moment", "jealousy beat",
      "rain scene", "caught staring", "interrupted kiss", "secret revealed",
      "first touch", "power shift", "vulnerability moment", "heated argument",
      "gentle morning after", "dance scene", "rescue moment", "whispered promise"
  ];

  // Per-tray timer maps: trayId -> Map(slotIndex -> timerId)
  const _pillTimers = {};

  function getRandomCycleDelay() {
      return 4000 + Math.random() * 2000; // 4-6 seconds
  }

  function getAvailableSuggestion(type, trayEl) {
      const pool = type === 'veto' ? VETO_SUGGESTIONS : QUILL_SUGGESTIONS;
      const currentPills = Array.from(trayEl.querySelectorAll('.pill')).map(p => p.dataset.suggestion);
      const available = pool.filter(s => !currentPills.includes(s));
      if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
      return available[Math.floor(Math.random() * available.length)];
  }

  function createPill(txt, type, inputId, trayEl, slotIndex) {
      const pill = document.createElement('span');
      pill.className = `pill ${type}-pill`;
      pill.textContent = '+ ' + txt;
      pill.dataset.suggestion = txt;
      pill.dataset.slot = slotIndex;
      pill.dataset.type = type;

      // Quill pills paywalled when Quill is locked
      const isQuillLocked = type === 'quill' && state.access === 'free';
      if (isQuillLocked) {
          pill.style.opacity = '0.4';
          pill.style.cursor = 'not-allowed';
      }

      pill.onclick = () => {
          // Quill pills trigger paywall if locked
          if (type === 'quill' && state.access === 'free') {
              showPaywall('sub');
              return;
          }

          const input = document.getElementById(inputId);
          if (input) {
              input.value = input.value ? input.value + '\n' + txt : txt;
          }

          // Clear this slot's timer
          const trayId = trayEl.id;
          if (_pillTimers[trayId] && _pillTimers[trayId].has(slotIndex)) {
              clearTimeout(_pillTimers[trayId].get(slotIndex));
          }

          // Fade out and replace quickly
          pill.style.transition = 'opacity 0.15s, transform 0.15s';
          pill.style.opacity = '0';
          pill.style.transform = 'scale(0.8)';

          setTimeout(() => {
              replacePillInSlot(trayEl, slotIndex, type, inputId);
          }, 150);
      };

      return pill;
  }

  function replacePillInSlot(trayEl, slotIndex, type, inputId) {
      const trayId = trayEl.id;
      const oldPill = trayEl.querySelector(`.pill[data-slot="${slotIndex}"]`);
      if (oldPill) oldPill.remove();

      const newTxt = getAvailableSuggestion(type, trayEl);
      const newPill = createPill(newTxt, type, inputId, trayEl, slotIndex);
      newPill.style.opacity = '0';
      trayEl.appendChild(newPill);

      // Fade in
      requestAnimationFrame(() => {
          newPill.style.transition = 'opacity 0.3s';
          newPill.style.opacity = (type === 'quill' && state.access === 'free') ? '0.4' : '1';
      });

      // Schedule next auto-replacement (Christmas lights cycling)
      schedulePillCycle(trayEl, slotIndex, type, inputId);
  }

  function schedulePillCycle(trayEl, slotIndex, type, inputId) {
      const trayId = trayEl.id;
      if (!_pillTimers[trayId]) _pillTimers[trayId] = new Map();

      // Clear existing timer for this slot
      if (_pillTimers[trayId].has(slotIndex)) {
          clearTimeout(_pillTimers[trayId].get(slotIndex));
      }

      const delay = getRandomCycleDelay();
      const timerId = setTimeout(() => {
          const pill = trayEl.querySelector(`.pill[data-slot="${slotIndex}"]`);
          if (!pill) return;

          // Fade out
          pill.style.transition = 'opacity 0.3s';
          pill.style.opacity = '0';

          setTimeout(() => {
              replacePillInSlot(trayEl, slotIndex, type, inputId);
          }, 300);
      }, delay);

      _pillTimers[trayId].set(slotIndex, timerId);
  }

  function clearTrayTimers(trayId) {
      if (_pillTimers[trayId]) {
          _pillTimers[trayId].forEach(timerId => clearTimeout(timerId));
          _pillTimers[trayId].clear();
      }
  }

  function populatePills(isGamePanel = false) {
      const vetoId = isGamePanel ? 'gameVetoPills' : 'vetoPills';
      const quillId = isGamePanel ? 'gameQuillPills' : 'quillPills';
      const vetoInputId = isGamePanel ? 'gameVetoInput' : 'vetoInput';
      const quillInputId = isGamePanel ? 'gameQuillInput' : 'quillInput';

      const vetoPillsEl = document.getElementById(vetoId);
      const quillPillsEl = document.getElementById(quillId);
      if (!vetoPillsEl || !quillPillsEl) return;

      // Clear existing timers
      clearTrayTimers(vetoId);
      clearTrayTimers(quillId);

      vetoPillsEl.innerHTML = '';
      quillPillsEl.innerHTML = '';

      // Shuffle and pick 9 random veto suggestions
      const shuffledVeto = [...VETO_SUGGESTIONS].sort(() => 0.5 - Math.random()).slice(0, 9);
      shuffledVeto.forEach((txt, i) => {
          const pill = createPill(txt, 'veto', vetoInputId, vetoPillsEl, i);
          vetoPillsEl.appendChild(pill);
          // Stagger initial timers so they don't all cycle at once
          setTimeout(() => schedulePillCycle(vetoPillsEl, i, 'veto', vetoInputId), i * 500 + Math.random() * 1000);
      });

      // Shuffle and pick 9 random quill suggestions
      const shuffledQuill = [...QUILL_SUGGESTIONS].sort(() => 0.5 - Math.random()).slice(0, 9);
      shuffledQuill.forEach((txt, i) => {
          const pill = createPill(txt, 'quill', quillInputId, quillPillsEl, i);
          quillPillsEl.appendChild(pill);
          setTimeout(() => schedulePillCycle(quillPillsEl, i, 'quill', quillInputId), i * 500 + Math.random() * 1000);
      });
  }

  function updateQuillUI() {
      // Update both setup and game panel Quill UIs
      const btns = [document.getElementById('btnCommitQuill'), document.getElementById('gameBtnCommitQuill')];
      const statuses = [document.getElementById('quillStatus'), document.getElementById('gameQuillStatus')];
      const godToggle = document.getElementById('godModeToggle');
      const quillBoxes = [document.getElementById('quillBox'), document.getElementById('gameQuillBox')];

      if(state.mode === 'solo') {
          if(godToggle) godToggle.classList.remove('hidden');
          const chk = document.getElementById('godModeCheck');
          if(chk) {
              chk.checked = state.godModeActive;
              chk.disabled = state.godModeActive;
              if(state.godModeActive) {
                  const lbl = document.getElementById('godModeLabel');
                  if(lbl) { lbl.innerHTML = "GOD MODE ACTIVE"; lbl.style.color = "var(--hot)"; }
              }
          }
      } else {
          if(godToggle) godToggle.classList.add('hidden');
      }

      const ready = getQuillReady();
      const wc = currentStoryWordCount();
      const needed = state.quill.nextReadyAtWords;
      const hasPaidAccess = (state.access === 'sub' || state.access === 'pass');

      btns.forEach(btn => {
          if(!btn) return;
          if(ready && hasPaidAccess) {
              btn.disabled = false;
              btn.style.opacity = "1";
              btn.style.borderColor = "var(--pink)";
              btn.textContent = state.godModeActive ? "Commit Quill (God Mode)" : "Commit Quill";
          } else if(!hasPaidAccess) {
              btn.disabled = true;
              btn.style.opacity = "0.5";
              btn.style.borderColor = "transparent";
          } else {
              btn.disabled = true;
              btn.style.opacity = "0.5";
              btn.style.borderColor = "transparent";
          }
      });

      statuses.forEach(status => {
          if(!status) return;
          if(!hasPaidAccess) {
              status.textContent = "Quill: Locked (Upgrade to use)";
              status.style.color = "#888";
          } else if(ready) {
              status.textContent = state.authorChairActive ? "🪑 Quill: Poised" : "Quill: Poised";
              status.style.color = "var(--pink)";
          } else {
              const remain = Math.max(0, needed - wc);
              status.textContent = `Quill: Spent (${remain} words to recharge)`;
              status.style.color = "var(--gold)";
          }
      });

      quillBoxes.forEach(quillBox => {
          if(!quillBox) return;
          if(!hasPaidAccess) {
              quillBox.classList.add('locked-input');
          } else if(ready) {
              quillBox.classList.remove('locked-input');
          } else {
              quillBox.classList.add('locked-input');
          }
      });
  }
  
  function updateBatedBreathState(){
      state.batedBreathActive = (state.storyOrigin === 'couple' && !state.player2Joined && !state.inviteRevoked);
      const el = document.getElementById('batedBreathIndicator');
      if(el) el.classList.toggle('hidden', !state.batedBreathActive);
  }

  function getBatedBreathDirective() {
      if (!state.batedBreathActive) return "";
      return `\nBATED BREATH STATE ACTIVE: The true love is absent. Tone: Longing, fidelity, bittersweet desire.`;
  }
  
  function filterFateCardsForBatedBreath(cards) {
      if (!state.batedBreathActive) return cards;
      return cards.map(c => {
          if (/(fall in love|replace|consummate)/i.test(c.action)) {
              return { ...c, action: "You feel the sharp ache of their absence.", dialogue: "(Silence)" };
          }
          return c;
      });
  }

  // --- BILLING HELPERS ---
  function computeBillingStatusNow() {
      if (state.subscribed) {
          if (state.billingStatus !== 'active') {
              state.billingStatus = 'active';
              state.billingGraceUntil = 0;
              state.billingLastError = '';
              localStorage.setItem('sb_billing_status', 'active');
          }
          return;
      }
      if (state.billingStatus === 'grace' && Date.now() > state.billingGraceUntil) {
          endBillingGrace(); 
      }
  }

  function startBillingGrace(msg, hours = 48) {
      state.billingStatus = 'grace';
      state.billingGraceUntil = Date.now() + (hours * 3600 * 1000);
      state.billingLastError = msg;
      localStorage.setItem('sb_billing_status', state.billingStatus);
      localStorage.setItem('sb_billing_grace_until', state.billingGraceUntil);
      if(typeof applyAccessLocks === 'function') applyAccessLocks();
  }

  function endBillingGrace() {
      state.billingStatus = 'past_due';
      localStorage.setItem('sb_billing_status', 'past_due');
      if(typeof applyAccessLocks === 'function') applyAccessLocks();
  }

  function renderBillingBanner() {
      let banner = document.getElementById('billingBanner');
      if (!banner) {
          const game = document.getElementById('game');
          if(game) {
              banner = document.createElement('div');
              banner.id = 'billingBanner';
              banner.style.cssText = "background:rgba(50,0,0,0.9); border-bottom:1px solid var(--pink); color:#ffcccc; padding:12px; font-size:0.9em; text-align:center; margin-bottom:15px; display:none; border-radius:4px;";
              game.prepend(banner);
          }
      }
      if (!banner) return;

      const subOnlyStory = ['affair', 'soulmates'].includes(state.storyLength);
      if (!subOnlyStory) {
          banner.style.display = 'none';
          return;
      }

      if (state.billingStatus === 'grace') {
          banner.innerHTML = `<strong>Payment Issue:</strong> You’re in a grace period.`;
          banner.style.display = 'block';
      } else if (state.billingStatus === 'past_due' || state.billingStatus === 'canceled') {
          banner.innerHTML = `Subscription inactive. <button onclick="window.showPaywall('sub')" style="margin-left:10px; background:var(--pink); color:black;">Resume the Affair</button>`;
          banner.style.display = 'block';
      } else {
          banner.style.display = 'none';
      }
  }

  // --- VISUAL HELPERS ---
  async function ensureVisualBible(textContext) {
      if(!state.visual) state.visual = { autoLock: true, locked: false, lastImageUrl: "", bible: { style: "", setting: "", characters: {} } };
      if (state.visual.bible.style && Object.keys(state.visual.bible.characters).length > 0) return;
      
      const genre = Array.isArray(state?.picks?.genre) ? state.picks.genre.join(', ') : "";
      const sys = `You are a Visual Director. Extract consistent visual anchors into STRICT JSON.`;

      try {
          const raw = await Promise.race([
              callChat([{role:'system', content: sys}, {role:'user', content: `Context: ${genre}. Text: ${textContext.slice(-2000)}`}]),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Bible timeout")), 15000))
          ]);
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) state.visual.bible = JSON.parse(jsonMatch[0]);
      } catch(e) { console.warn("Bible build failed (silent)", e); }
  }

  function buildVisualAnchorsText() {
      const b = state.visual.bible;
      if (!b || !b.style) return ""; 
      let txt = `VISUAL CONTINUITY: STYLE: ${b.style} SETTING: ${b.setting} `;
      if (state.visual.locked && state.visual.lastImageUrl) txt += "MATCH LAST RENDER EXACTLY.";
      return txt;
  }

  let _inputGuardsBound = false;
  function bindFreeInputGuards(){
      if(_inputGuardsBound) return;
      _inputGuardsBound = true;
      const blockIfFree = (e) => {
          if(state.access === 'free' && state.mode !== 'couple') {
              e.preventDefault();
              e.stopPropagation();
              return false;
          }
      };
      ['actionInput', 'dialogueInput'].forEach(id => {
          const el = document.getElementById(id);
          if(el) {
              el.addEventListener('beforeinput', blockIfFree, { passive: false });
              el.addEventListener('paste', blockIfFree, { passive: false });
              el.addEventListener('drop', blockIfFree, { passive: false });
          }
      });
  }

  function setPaywallClickGuard(el, enabled){
    if(!el) return;
    if (!el.dataset.paywallBound) {
        el.dataset.paywallBound = "true";
        el.addEventListener('click', (e) => {
            if (el.dataset.paywallActive === "true") {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.showPaywall('unlock');
            }
        }, { capture: true });
    }
    el.dataset.paywallActive = enabled ? "true" : "false";
  }

  function applyTierUI(){
      computeBillingStatusNow();
      renderBillingBanner();
      syncTierFromAccess();
      bindFreeInputGuards();

      const paid = (state.tier === 'paid');
      const isFree = (state.access === 'free');
      const couple = (state.mode === 'couple');
      
      const subOnlyStory = ['affair', 'soulmates'].includes(state.storyLength);
      const subActive = (state.access === 'sub');
      const inGrace = (state.billingStatus === 'grace' && Date.now() < state.billingGraceUntil);
      const billingLock = subOnlyStory && !(subActive || inGrace);
      const shouldLock = !couple && (billingLock || isFree);

      ['actionInput', 'dialogueInput'].forEach(id => {
          const el = document.getElementById(id);
          if(el) {
              el.disabled = false;
              el.readOnly = shouldLock;
          }
      });

      const quillCtrl = document.getElementById('quillInput');
      if(quillCtrl) {
          quillCtrl.disabled = false;
          quillCtrl.readOnly = !paid;
      }

      ['quillBox', 'actionWrapper', 'dialogueWrapper'].forEach(id => {
        const wrap = document.getElementById(id);
        if(wrap) {
            if (shouldLock) {
                 wrap.classList.add('locked-input');
                 setPaywallClickGuard(wrap, true);
            } else {
                 wrap.classList.remove('locked-input');
                 setPaywallClickGuard(wrap, false);
            }
        }
      });

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
          submitBtn.disabled = false;
          if (billingLock && !couple) {
              submitBtn.textContent = "Resume Affair to Continue";
              setPaywallClickGuard(submitBtn, true);
          } else {
              submitBtn.textContent = "Submit Turn";
              setPaywallClickGuard(submitBtn, false);
          }
      }

      ['saveBtn', 'gameControlsBtn'].forEach(id => {
          const btn = document.getElementById(id);
          if(btn) {
              if(couple || paid) btn.classList.remove('locked-style');
              else btn.classList.add('locked-style');
              
              setPaywallClickGuard(btn, !(couple || paid));
          }
      });

      if (!couple) {
          applyLengthLocks();
          applyIntensityLocks();
          applyStyleLocks();
      }
  }

  function applyAccessLocks(){ applyTierUI(); }

  function applyLengthLocks(){
    syncTierFromAccess();
    const section = document.getElementById('lengthSection');
    if(section) section.classList.toggle('hidden', state.turnCount > 0);

    const cards = document.querySelectorAll('#lengthGrid .card[data-grp="length"]');
    cards.forEach(card => {
      const val = card.dataset.val;
      let locked = true;

      // GATING RULES:
      // Free: Voyeur Tease only
      // Pass ($3): Voyeur Tease + Fling
      // Sub ($6/mo): All lengths (Voyeur Tease, Fling, Affair, Soulmates)
      if (state.access === 'free') {
          locked = (val !== 'voyeur');
      } else if (state.access === 'pass') {
          locked = !['voyeur', 'fling'].includes(val);
      } else if (state.access === 'sub') {
          locked = false; // All unlocked
      }

      card.classList.toggle('locked', locked);
      card.style.display = ''; // Always show all lengths
      setPaywallClickGuard(card, locked);
      card.classList.toggle('selected', val === state.storyLength);
    });

    // Auto-select appropriate default if current selection is locked
    if (state.access === 'free' && state.storyLength !== 'voyeur') {
        state.storyLength = 'voyeur';
    }
    if (state.access === 'pass' && !['voyeur', 'fling'].includes(state.storyLength)) {
        state.storyLength = 'fling';
    }

    bindLengthHandlers();
  }

  function bindLengthHandlers(){
      document.querySelectorAll('#lengthGrid .card[data-grp="length"]').forEach(card => {
          if(card.dataset.bound === 'true') return;
          card.dataset.bound = 'true';
          card.addEventListener('click', () => {
              if (state.turnCount > 0) return;
              if (card.classList.contains('locked')) return; 
              state.storyLength = card.dataset.val;
              applyLengthLocks(); 
          });
      });
  }

  function applyIntensityLocks(){
      syncTierFromAccess();
      const access = state.access; 
      const setupBtns = document.querySelectorAll('#intensityBtns .intensity-btn');
      const gameBtns = document.querySelectorAll('#gameIntensity button');
      
      const updateLock = (btn, level) => {
          let locked = false;
          if (access === 'free' && ['Erotic', 'Dirty'].includes(level)) locked = true;
          if (access === 'pass' && level === 'Dirty') locked = true;
          
          btn.classList.toggle('locked', locked);
          if(locked) btn.classList.remove('active');
          setPaywallClickGuard(btn, locked);
      };

      setupBtns.forEach(b => updateLock(b, b.dataset.val));
      gameBtns.forEach(b => updateLock(b, b.innerText.trim()));

      // Fallback
      if(state.intensity === 'Dirty' && access !== 'sub') state.intensity = (access === 'free') ? 'Naughty' : 'Erotic';
      if(state.intensity === 'Erotic' && access === 'free') state.intensity = 'Naughty';
      updateIntensityUI();
  }

  function applyStyleLocks() {
      if (state.mode === 'couple') return;
      const paid = (state.tier === 'paid');
      const cards = document.querySelectorAll('.card[data-grp="style"]');
      cards.forEach(card => {
          const raw = card.dataset.val || '';
          const v = raw.toLowerCase().trim();
          let locked = !paid && v !== 'breathless';
          card.classList.toggle('locked', locked);
          setPaywallClickGuard(card, locked);
      });
  }

  function updateIntensityUI(){
      const setStart = (b) => b.classList.toggle('active', b.dataset.val === state.intensity);
      const setGame = (b) => b.classList.toggle('active', b.innerText.trim() === state.intensity);
      document.querySelectorAll('#intensityBtns .intensity-btn').forEach(setStart);
      document.querySelectorAll('#gameIntensity button').forEach(setGame);
      const activeBtn = document.querySelector(`#intensityBtns .intensity-btn[data-val="${state.intensity}"]`);
      if(activeBtn && $('intensityDesc')) $('intensityDesc').innerText = `(${state.intensity}) ${activeBtn.dataset.desc}`;
  }

  function wireIntensityHandlers(){
      const handler = (level, e) => {
          e.stopPropagation();
          if(level === 'Dirty' && state.access !== 'sub'){ window.showPaywall('sub'); return; }
          if(level === 'Erotic' && state.access === 'free'){ window.openEroticPreview(); return; }
          state.intensity = level;
          updateIntensityUI();
      };
      document.querySelectorAll('#intensityBtns .intensity-btn').forEach(btn => btn.onclick = (e) => handler(btn.dataset.val, e));
      document.querySelectorAll('#gameIntensity button').forEach(btn => btn.onclick = (e) => handler(btn.innerText.trim(), e));
  }

  window.openEroticPreview = function(){
      const pText = document.getElementById('eroticPreviewText');
      if(pText) pText.innerText = EROTIC_PREVIEW_TEXT;
      document.getElementById('eroticPreviewModal')?.classList.remove('hidden');
  };

  window.showPaywall = function(mode){
    const pm = document.getElementById('payModal');
    if(!pm) return;
    if(document.getElementById('tierGate') && !document.getElementById('tierGate').classList.contains('hidden')) state.purchaseContext = 'tierGate';
    else if(document.getElementById('setup') && !document.getElementById('setup').classList.contains('hidden')) state.purchaseContext = 'setup';
    else if(document.getElementById('game') && !document.getElementById('game').classList.contains('hidden')) state.purchaseContext = 'game';
    else state.purchaseContext = null;

    const gm = document.getElementById('godModePay');
    const sp = document.getElementById('standardPay');

    if(mode === 'god') {
        if(gm) gm.classList.remove('hidden');
        if(sp) sp.classList.add('hidden');
    } else {
        if(gm) gm.classList.add('hidden');
        if(sp) sp.classList.remove('hidden');
    }
    const hasPassNow = state.storyId && hasStoryPass(state.storyId);
    const hideUnlock = (mode === 'sub') || state.subscribed || hasPassNow;
    const optUnlock = document.getElementById('optUnlock');
    if(optUnlock) optUnlock.classList.toggle('hidden', !!hideUnlock);
    pm.classList.remove('hidden');
  };

  function completePurchase() {
      const pm = document.getElementById('payModal');
      if(pm) pm.classList.add('hidden');

      const wasFreeBefore = (state.access === 'free');

      if(state.pendingUpgradeToAffair || state.lastPurchaseType === 'sub') {
          state.subscribed = true;
          state.billingStatus = 'active';
          localStorage.setItem('sb_subscribed', '1');
          localStorage.setItem('sb_billing_status', 'active');
      }

      syncTierFromAccess();

      let upgraded = false;
      if (state.lastPurchaseType === 'pass' && state.storyLength === 'voyeur') {
          state.storyLength = 'fling';
          upgraded = true;
          showToast("Story expanded to Fling.");
      }
      if (state.lastPurchaseType === 'sub') {
          if(['fling', 'voyeur'].includes(state.storyLength)) {
              state.storyLength = 'affair';
              upgraded = true;
          }
          // Show subscription confirmation toast
          showToast("Upgraded to Soulmates tier!");
      }

      if (upgraded) state.storyEnded = false;

      state.lastPurchaseType = null;
      state.pendingUpgradeToAffair = false;

      applyAccessLocks();
      updateQuillUI(); // Ensure Quill unlocks immediately
      if(window.initCards) window.initCards();
      saveStorySnapshot();
      if (state.purchaseContext === 'tierGate') window.showScreen('modeSelect');
  }

  function renderFlingEnd() {
      const div = document.createElement('div');
      div.className = 'box';
      div.style.textAlign = 'center';
      div.style.border = '1px solid var(--pink)';
      div.innerHTML = `<h3 style="color:var(--pink)">Not finished.</h3><p>A Fling burns hot and leaves a mark. But an Affair lingers.</p><button onclick="window.upgradeFlingToAffair()" style="background:var(--pink); color:black; font-weight:bold; margin-top:10px;">Make it an Affair</button>`;
      document.getElementById('storyText')?.appendChild(div);
  }

  window.upgradeFlingToAffair = function() {
      state.pendingUpgradeToAffair = true;
      state.lastPurchaseType = 'sub';
      if(state.access === 'sub') {
          completePurchase(); // Already subbed, just process upgrade
      } else {
          window.showPaywall('sub');
      }
  };

  const gmCheck = $('godModeCheck');
  if(gmCheck) {
      gmCheck.addEventListener('change', (e) => {
          if(!e.target.checked) return; 
          e.target.checked = false; 
          const unlocked = localStorage.getItem('sb_god_mode_owned') === '1';
          if(!unlocked) window.showPaywall('god');
          else if(confirm("God Mode unlocks unrestricted authorial control.\n\nChoices made in God Mode do not affect progression, balance, or unlocks.")) activateGodMode();
      });
  }

  function activateGodMode() {
      state.sandbox = true;
      state.godModeActive = true;
      state.storyStage = 'sandbox'; 
      updateQuillUI();
      alert("God Mode Active.");
  }

  function makeStoryId(){
    const existing = localStorage.getItem('sb_current_story_id');
    if(existing) return existing;
    const id = 'sb_' + Date.now().toString(36);
    localStorage.setItem('sb_current_story_id', id);
    return id;
  }

  function getStoryPassKey(storyId){ return `sb_storypass_${storyId}`; }
  function hasStoryPass(storyId){ return localStorage.getItem(getStoryPassKey(storyId)) === '1'; }
  function grantStoryPass(storyId){ if(storyId) localStorage.setItem(getStoryPassKey(storyId), '1'); }
  function clearCurrentStoryId(){ localStorage.removeItem('sb_current_story_id'); }
  function hasSavedStory(){ return !!localStorage.getItem('sb_saved_story'); }

  function saveStorySnapshot(){
    const el = document.getElementById('storyText');
    if(!el) return;
    const currentWc = currentStoryWordCount();
    if (currentWc > state.lastSavedWordCount) {
        const globalWc = Number(localStorage.getItem('sb_global_word_count') || 0);
        localStorage.setItem('sb_global_word_count', globalWc + (currentWc - state.lastSavedWordCount));
        state.lastSavedWordCount = currentWc;
    }
    const snapshot = {
      storyId: state.storyId,
      subscribed: !!state.subscribed,
      tier: state.tier,
      sysPrompt: state.sysPrompt,
      title: document.getElementById('storyTitle')?.textContent || '',
      synopsis: document.getElementById('storySynopsis')?.textContent || '',
      storyHTML: el.innerHTML,
      stateSnapshot: state
    };
    localStorage.setItem('sb_saved_story', JSON.stringify(snapshot));
    updateContinueButtons();
  }

  window.continueStory = function(){
    const raw = localStorage.getItem('sb_saved_story');
    if(!raw) return;
    const data = JSON.parse(raw);
    state.storyId = data.storyId || makeStoryId();
    localStorage.setItem('sb_current_story_id', state.storyId);

    if(data.stateSnapshot) Object.assign(state, data.stateSnapshot);
    state.sysPrompt = data.sysPrompt || state.sysPrompt;
    state.subscribed = !!data.subscribed;
    state.authorChairActive = checkAuthorChairUnlock();
    
    updateBatedBreathState();
    applyAccessLocks();

    document.getElementById('storyTitle').textContent = data.title || '';
    document.getElementById('storySynopsis').textContent = data.synopsis || '';
    document.getElementById('storyText').innerHTML = data.storyHTML || '';
    state.lastSavedWordCount = currentStoryWordCount(); 

    const img = document.getElementById('settingShotImg');
    if(img && (!img.src || img.style.display === 'none')) generateSettingShot(data.synopsis || "Fantasy Landscape"); 

    window.showScreen('game');
    if (state.fateOptions && state.fateOptions.length) state.fateOptions = filterFateCardsForBatedBreath(state.fateOptions);
    if(window.initCards) window.initCards(); 
    resetTurnSnapshotFlag();
    updateQuillUI();
  };

  function updateContinueButtons(){
    const show = hasSavedStory();
    const btn1 = document.getElementById('continueStoryBtn');
    const btn2 = document.getElementById('continueFromTierBtn');
    if(btn1) btn1.classList.toggle('hidden', !show);
    if(btn2) btn2.classList.toggle('hidden', !show);
  }

  window.restart = function(){
    if(state.mode === 'couple') window.coupleCleanup();
    state.mode = 'solo';
    clearCurrentStoryId();
    state.storyId = null;
    state.access = state.subscribed ? 'sub' : 'free';
    syncTierFromAccess();
    localStorage.removeItem('sb_saved_story');
    // Reset state
    state.turnCount = 0;
    state.storyLength = 'voyeur';
    state.storyEnded = false;
    document.getElementById('storyText').innerHTML = '';
    
    updateContinueButtons();
    window.showScreen('setup');
    applyAccessLocks(); 
    updateQuillUI();
    updateBatedBreathState();
  };

  window.changeTier = function(){ window.showScreen('tierGate'); };

  $('saveBtn')?.addEventListener('click', (e) => {
      const hasAccess = (window.state.access !== 'free') || (window.state.mode === 'couple');
      if (!hasAccess) {
          e.stopPropagation();
          window.showPaywall('unlock');
          return;
      }
      saveStorySnapshot();
      showToast("Story saved.");
  });

  $('burgerBtn')?.addEventListener('click', () => document.getElementById('menuOverlay').classList.remove('hidden'));
  $('ageYes')?.addEventListener('click', () => window.showScreen('tosGate'));
  $('tosCheck')?.addEventListener('change', (e) => $('tosBtn').disabled = !e.target.checked);
  $('tosBtn')?.addEventListener('click', () => window.showScreen('tierGate'));

  $('btnTease')?.addEventListener('click', () => {
    state.tier = 'free';
    state.access = 'free';
    applyAccessLocks();
    window.showScreen('modeSelect');
    if(window.initCards) window.initCards();
  });

  $('btnIndulge')?.addEventListener('click', () => window.showPaywall('sub'));

  document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      $('previewText').textContent = btn.dataset.txt || '';
      document.getElementById('previewModal').classList.remove('hidden');
    });
  });

  function initSelectionHandlers(){
    state.safety = state.safety || { mode:'balanced', darkThemes:true, nonConImplied:false, violence:true, boundaries:["No sexual violence"], safewords:[] };
    
    // Bind Visual Auto-Lock
    const chkLock = document.getElementById('chkAutoLockVisual');
    if(chkLock && chkLock.dataset.bound !== '1') {
        chkLock.dataset.bound = '1';
        chkLock.addEventListener('change', (e) => { state.visual.autoLock = e.target.checked; saveStorySnapshot(); });
    }

    bindLengthHandlers();

    document.querySelectorAll('.card[data-grp]').forEach(card => {
      if(card.dataset.bound === '1') return;
      card.dataset.bound = '1';
      card.addEventListener('click', (e) => {
        if(e.target.classList.contains('preview-btn')) return;
        const grp = card.dataset.grp;
        const val = card.dataset.val;
        if(!grp || !val || grp === 'length') return; 

        if(card.classList.contains('locked')) { window.showPaywall('unlock'); return; }

        if(grp === 'pov'){
          state.picks.pov = val;
          document.querySelectorAll('.card[data-grp="pov"]').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          return;
        }

        if(!state.picks[grp]) state.picks[grp] = [];
        const arr = state.picks[grp];
        const idx = arr.indexOf(val);
        if(idx >= 0) { arr.splice(idx, 1); card.classList.remove('selected'); }
        else { if(arr.length >= 3) return alert("Select up to 3 only."); arr.push(val); card.classList.add('selected'); }
      });
    });
  }

  // --- LOADING OVERLAY ---
  let _loadingTimer = null;
  let _loadingActive = false;

  function startLoading(msg){
    const overlay = document.getElementById('loadingOverlay');
    const fill = document.getElementById('loadingOverlayFill');
    document.getElementById('loadingText').textContent = msg || "Loading...";
    
    _loadingActive = true;
    if(fill) fill.style.width = '0%';
    if(overlay) overlay.classList.remove('hidden');

    if(_loadingTimer) clearInterval(_loadingTimer);
    let p = 0;
    _loadingTimer = setInterval(() => {
      if(!_loadingActive) return;
      p = Math.min(91, p + Math.random() * 6);
      if(fill) fill.style.width = p.toFixed(0) + '%';
    }, 250);
  }

  function stopLoading(){
    if(!_loadingActive) return;
    _loadingActive = false;
    const overlay = document.getElementById('loadingOverlay');
    const fill = document.getElementById('loadingOverlayFill');
    if(_loadingTimer) { clearInterval(_loadingTimer); _loadingTimer = null; }
    if(fill) fill.style.width = '100%';
    setTimeout(() => {
      if(overlay) overlay.classList.add('hidden');
      if(fill) fill.style.width = '0%';
    }, 120);
  }

  $('payOneTime')?.addEventListener('click', () => {
    state.storyId = state.storyId || makeStoryId();
    state.lastPurchaseType = 'pass'; 
    grantStoryPass(state.storyId);
    completePurchase();
  });

  $('paySub')?.addEventListener('click', () => {
    state.subscribed = true;
    state.lastPurchaseType = 'sub';
    localStorage.setItem('sb_subscribed', '1');
    completePurchase();
  });

  $('payGodMode')?.addEventListener('click', () => {
      localStorage.setItem('sb_god_mode_owned', '1');
      document.getElementById('payModal')?.classList.add('hidden');
      if (confirm("God Mode unlocks unrestricted authorial control.\n\nChoices made in God Mode do not affect progression, balance, or unlocks.")) {
          activateGodMode();
      }
  });

  // --- COMMIT QUILL HANDLER (shared logic) ---
  function commitQuill(quillInputId, vetoInputId) {
      if (!getQuillReady()) return;
      if (state.access === 'free') {
          showPaywall('unlock');
          return;
      }
      const quillEl = document.getElementById(quillInputId);
      if (!quillEl) return;
      const quillText = quillEl.value.trim();
      if (!quillText) { showToast("No Quill edit to commit."); return; }

      // Also apply any pending veto constraints from the appropriate input
      const vetoEl = document.getElementById(vetoInputId);
      if (vetoEl) {
          const parsed = parseVetoInput(vetoEl.value);
          if(parsed.rejected.length > 0) {
              showToast("Veto removes elements. It can't make events happen.");
          }
          state.veto.bannedWords = parsed.exclusions;
          state.veto.excluded = parsed.exclusions;
          state.veto.corrections = parsed.corrections;
          state.veto.ambientMods = parsed.ambientMods;
      }

      // Store quill intent in state for prompt injection
      window.state.quillIntent = quillText;

      const storyEl = document.getElementById('storyText');
      if (storyEl && quillText) {
          const div = document.createElement('div');
          div.className = 'quill-intervention';
          // Debossed/etched look: inset shadow, gold tint, border
          div.style.cssText = 'font-style:italic; color:var(--gold); border-left:3px solid var(--gold); padding:10px 15px; margin:15px 0; background:rgba(255,215,0,0.08); box-shadow:inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(255,215,0,0.1); border-radius:4px; text-shadow:0 1px 1px rgba(0,0,0,0.3);';
          div.innerHTML = formatStory(quillText);
          storyEl.appendChild(div);
      }

      window.state.quillCommittedThisTurn = true;
      window.state.quill.uses++;
      window.state.quill.nextReadyAtWords = currentStoryWordCount() + computeNextCooldownWords();
      quillEl.value = '';
      updateQuillUI();
      saveStorySnapshot();
      showToast("Quill committed.");
  }

  $('btnCommitQuill')?.addEventListener('click', () => {
      commitQuill('quillInput', 'vetoInput');
  });

  // --- IN-GAME QUILL & VETO PANEL ---
  $('gameControlsBtn')?.addEventListener('click', () => {
      const panel = document.getElementById('gameQvPanel');
      if (!panel) return;

      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden');

      if (isHidden) {
          // Populate pills when opening
          populatePills(true);
          updateQuillUI();

          // Sync veto input from setup if game input is empty
          const setupVeto = document.getElementById('vetoInput');
          const gameVeto = document.getElementById('gameVetoInput');
          if (gameVeto && setupVeto && !gameVeto.value && setupVeto.value) {
              gameVeto.value = setupVeto.value;
          }
      }
  });

  $('gameBtnCommitQuill')?.addEventListener('click', () => {
      commitQuill('gameQuillInput', 'gameVetoInput');
      // Sync back to setup input
      const gameVeto = document.getElementById('gameVetoInput');
      const setupVeto = document.getElementById('vetoInput');
      if (gameVeto && setupVeto) {
          setupVeto.value = gameVeto.value;
      }
  });

  // --- COMMIT VETO HANDLER ---
  function commitVeto(vetoInputId) {
      const vetoEl = document.getElementById(vetoInputId);
      if (!vetoEl) return;
      const vetoText = vetoEl.value.trim();
      if (!vetoText) { showToast("No Veto constraints to commit."); return; }

      const parsed = parseVetoInput(vetoText);
      if (parsed.rejected.length > 0) {
          showToast("Veto removes elements. It can't make events happen.");
      }

      state.veto.bannedWords = parsed.exclusions;
      state.veto.excluded = parsed.exclusions;
      state.veto.corrections = parsed.corrections;
      state.veto.ambientMods = parsed.ambientMods;
      state.vetoCommittedThisTurn = true;
      state.vetoIntentRaw = vetoText;

      updateVetoUI();
      saveStorySnapshot();
      showToast("Veto committed.");
  }

  function updateVetoUI() {
      const statuses = [document.getElementById('gameVetoStatus')];
      const committed = state.vetoCommittedThisTurn;
      statuses.forEach(el => {
          if (!el) return;
          el.textContent = committed ? 'Veto: Committed' : 'Veto: Ready';
          el.style.color = committed ? 'var(--hot)' : 'var(--gold)';
      });
  }

  $('gameBtnCommitVeto')?.addEventListener('click', () => {
      commitVeto('gameVetoInput');
      // Sync back to setup input
      const gameVeto = document.getElementById('gameVetoInput');
      const setupVeto = document.getElementById('vetoInput');
      if (gameVeto && setupVeto) {
          setupVeto.value = gameVeto.value;
      }
  });

  // --- META SYSTEM (RESTORED) ---
  function buildMetaDirective(){
     if(state.awareness === 0) return "";
     if(Math.random() > state.metaChance) return "";
     const stance = META_DIRECTIVES[state.stance] || META_DIRECTIVES['aid'];
     const directive = stance[Math.floor(Math.random() * stance.length)];
     return `META-NARRATIVE INTERVENTION: ${directive}`;
  }

  window.setMetaStance = function(s){
      state.stance = s;
      document.querySelectorAll('.meta-stance').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector(`.meta-stance[onclick="window.setMetaStance('${s}')"]`);
      if(btn) btn.classList.add('active');
  };

  // --- BEGIN STORY (RESTORED) ---
  $('beginBtn')?.addEventListener('click', async () => {
    const pName = $('playerNameInput').value.trim() || "The Protagonist";
    const lName = $('partnerNameInput').value.trim() || "The Love Interest";
    const pGen = $('customPlayerGender')?.value.trim() || $('playerGender').value;
    const lGen = $('customLoveInterest')?.value.trim() || $('loveInterestGender').value;
    const pPro = $('customPlayerPronouns')?.value.trim() || $('playerPronouns').value;
    const lPro = $('customLovePronouns')?.value.trim() || $('lovePronouns').value;
    
    // Determine Author Identity based on selections
    if(pGen === 'Male' && lGen === 'Female') { state.authorGender = 'Female'; state.authorPronouns = 'She/Her'; }
    else if(pGen === 'Male' && lGen === 'Male') { state.authorGender = 'Male'; state.authorPronouns = 'He/Him'; }
    else if(pGen === 'Female' && lGen === 'Female') { state.authorGender = 'Female'; state.authorPronouns = 'She/Her'; }
    else { state.authorGender = 'Non-Binary'; state.authorPronouns = 'They/Them'; }

    applyVetoFromControls(); 
    
    // Check for LGBTQ Colors
    state.gender = $('playerGender').value;
    state.loveInterest = $('loveInterestGender').value;
    const isQueer = (state.gender === state.loveInterest) || state.gender === 'Non-Binary' || state.loveInterest === 'Non-Binary';
    if(isQueer) document.body.classList.add('lgbtq-mode');
    else document.body.classList.remove('lgbtq-mode');
    
    // Persist Nickname for Couple Mode
    if(state.mode === 'couple' && !state.myNick) {
       state.myNick = pName.split(' ')[0];
       localStorage.setItem("sb_nickname", state.myNick);
    }
    
    state.gender = pGen;
    state.loveInterest = lGen;

    syncPovDerivedFlags();
    const safetyStr = buildConsentDirectives();

    const coupleArcRules = `
COUPLE MODE ARC RULES (CRITICAL):

This story is being experienced by two real players together.

Rules:
- Never replace or erase an established emotional bond.
- Do not regress intimacy already earned.
- Treat both players as co-present, co-desiring, and mutually aware.
- Avoid jealousy, abandonment, or sudden NPC withdrawal unless explicitly invited.

Narrative focus:
- Shared anticipation
- Mutual tension
- Alignment, misalignment, then reconnection
- Erotic energy that builds *between* the players, not around them

End scenes with:
- A shared decision point
- A moment requiring coordination or consent
- A tension that invites joint action

Do NOT:
- Kill, discard, or sideline a love interest to make room for Player 2
- Rewrite earlier intimacy
- Introduce shame, punishment, or moral judgment for desire
`;


const batedBreathRules = `
BATED BREATH MODE (COUPLE-ORIGIN WAITING STATE) — LOCKED:

This story was initiated with Couple intent, but Player 2 has not yet joined.

Core law:
All erotic and emotional energy must bend back toward the absent true love (Player 2).

Mandatory narrative shaping:
- Desire must feel bittersweet.
- Arousal heightens longing and absence, not replacement.
- Fantasies, witnessing, or self-directed desire must resolve emotionally toward Player 2.
- The story should feel suspended, anticipatory, and incomplete by design.

Allowed content:
- Witnessing sexual activity between others
- Masturbation or self-directed sexual release
- Sexual fantasy

Constraints:
- These experiences must not form mutual emotional bonds.
- No experience may plausibly displace Player 2.

Explicitly forbidden:
- NPC replacing Player 2 emotionally or sexually
- Mutual emotional bonding with an NPC
- Consummation that would plausibly displace Player 2

Exit conditions (must be explicit, never silent):
- Player 2 joins → transition to full Couple mode
- Player 1 explicitly abandons Couple intent (warning required)
- Invite revoked permanently → story becomes true Solo

No accidental betrayal. No silent exits.
`;

    const sys = `You are a bestselling erotica author (Voice: ${state.authorGender}, ${state.authorPronouns}).

${state.storyOrigin === "couple" && !state.player2Joined && !state.inviteRevoked ? batedBreathRules : ""}

${state.mode === "couple" ? coupleArcRules : ""}



LONG-FORM STORY ARC RULES (CRITICAL):

You are writing a serialized narrative, not a vignette.
Each response must:
- Advance character psychology, not just physical tension
- Preserve unresolved emotional threads across turns
- Escalate stakes gradually over multiple scenes
- Avoid premature payoff or narrative closure

You must remember:
- Emotional debts (things unsaid, denied, postponed)
- Power dynamics established earlier
- Physical boundaries previously respected or tested

End most responses with:
- A complication
- A choice
- A destabilizing revelation
Never fully resolve the central tension unless explicitly instructed.

────────────────────────────────────

You are writing a story in the "${state.picks.genre.join(', ')}" genre.
Style: ${state.picks.style.join(', ')}.
POV: ${state.picks.pov}.
Dynamics: ${state.picks.dynamic.join(', ')}.

    
    Protagonist: ${pName} (${pGen}, ${pPro}).
    Love Interest: ${lName} (${lGen}, ${lPro}).
    
    ${safetyStr}

    Current Intensity: ${state.intensity}
    (Clean: Romance only. Naughty: Tension/Heat. Erotic: Explicit. Dirty: Raw/Unfiltered).
    
    RULES:
    1. Write in the selected POV.
    2. Respond to the player's actions naturally.
    3. Keep pacing slow and tense (unless Dirty).
    4. Focus on sensory details, longing, and chemistry.
    5. Be creative, surprising, and emotionally resonant.
    6. BANNED WORDS/TOPICS: ${state.veto.bannedWords.join(', ')}.
    7. TONE ADJUSTMENTS: ${state.veto.tone.join(', ')}.
    8. NAME INTEGRITY (CRITICAL): Do NOT alter the protagonist's name "${pName}" under any circumstances. Never silently change it to a full name, nickname, or variant (e.g., "Dani" must NOT become "Daniel" or "Danielle"). Name changes ONLY allowed if: (a) the player explicitly requests via Quill or Veto, OR (b) an NPC uses a clearly in-world nickname.
    ${state.povMode === 'author5th' ? `
    AUTHOR POV RULES (MANDATORY - DO NOT SKIP):
    - CRITICAL: The very FIRST WORDS of the story MUST begin with "The Author..." (e.g., "The Author smiled...", "The Author paused...", "The Author considered...").
    - In the opening scene (before the first player choice), the Author MUST appear 3-5 times woven into the prose.
    - The Author (${state.authorGender}, ${state.authorPronouns}) is an on-page presence woven into the narration, not a separate speaker tag.
    - Author tone: CONFIDENT, conductor-like, foreshadowing. The Author shapes the world with certainty.
    - Author must NEVER be apologetic, passive, hesitant, or merely reactive. The Author is in control.
    - Mention the Author naturally about every ~40 words on average—as texture, not interruption.
    - The Author foreshadows, shapes pacing, reveals writerly intent or doubt, without breaking immersion.
    - NEVER announce "Author here" or similar meta-asides. Integrate as narrative texture.
    - Examples: "The Author hesitated before letting them touch." / "A sentence rewrote itself." / "The story leaned closer."
    - Author may doubt, boast, or foreshadow—but always as part of the prose, never parenthetical.
    ` : ''}
    `;
    
    state.sysPrompt = sys;
    state.storyId = state.storyId || makeStoryId();
    
    window.showScreen('game');
    
    startLoading("Conjuring the world...");
    
    const introPrompt = `Write the opening scene (approx 200 words).
    Setting: A place full of tension and atmosphere fitting the genre.
    Situation: The Protagonist and Love Interest are thrown together.
    Establish the dynamic immediately.
    End with a hook or a moment of tension.`;
    
    try {
        const text = await callChat([
            {role:'system', content: state.sysPrompt},
            {role:'user', content: introPrompt}
        ]);
        
        const title = await callChat([{role:'user', content:`Based on this opening, give me a 3-word title:\n${text}`}]);
        const synopsis = await callChat([{role:'user', content:`Summarize the setting in one sentence:\n${text}`}]);
        
        document.getElementById('storyTitle').textContent = title.replace(/"/g,'');
        document.getElementById('storySynopsis').textContent = synopsis;
        document.getElementById('storyText').innerHTML = formatStory(text);
        
        generateSettingShot(synopsis);
        
        // Initial Snapshot
        saveStorySnapshot();
        
        if(state.mode === 'couple') {
           broadcastTurn(text, true); 
        }

    } catch(e) {
        alert("Fate stumbled. Please try again.");
        window.showScreen('setup');
    } finally {
        stopLoading();
        if(window.initCards) window.initCards();
        updateQuillUI();
        updateBatedBreathState();
    }
  });

  // --- API CALLS ---
  async function callChat(messages, temp=0.7) {
    const payload = {
       messages: messages,
       model: STORY_MODEL, 
       temperature: temp,
       max_tokens: 1000
    };
    
    try {
        const res = await fetch(PROXY_URL, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        return data.choices[0].message.content;
    } catch(e){
        console.error(e);
        throw e;
    }
  }

  async function generateSettingShot(desc) {
     const img = document.getElementById('settingShotImg');
     if(!img) return;
     const wrap = document.getElementById('settingShotWrap');
     if(wrap) wrap.style.display = 'flex';
     img.style.display = 'none';
     
     try {
         const res = await fetch(IMAGE_PROXY_URL, {
             method:'POST',
             headers:{'Content-Type':'application/json'},
             body: JSON.stringify({ 
                 prompt: `Cinematic establishing shot, atmospheric, fantasy art style. No text. ${desc}`,
                 provider: 'xai', 
                 size: "1024x1024",
                 n: 1
             })
         });
         const data = await res.json();
         if(data.url || data.image || data.b64_json) {
             let url = data.url || data.image || data.b64_json;
             if(!url.startsWith('http') && !url.startsWith('data:')) url = `data:image/png;base64,${url}`;
             img.src = url;
             img.onload = () => { img.style.display = 'block'; };
         }
     } catch(e) { console.warn("Setting shot failed", e); }
  }

  // --- VISUALIZE (STABILIZED) ---
  window.visualize = async function(isRe){
      if (_vizInFlight) return;
      _vizInFlight = true;

      const modal = document.getElementById('vizModal');
      const retryBtn = document.getElementById('vizRetryBtn');
      const img = document.getElementById('vizPreviewImg');
      const ph = document.getElementById('vizPlaceholder');
      const errDiv = document.getElementById('vizError');
      const storyText = document.getElementById('storyText');

      if (!img) { _vizInFlight = false; return; }

      if(modal) modal.classList.remove('hidden');
      if(retryBtn) retryBtn.disabled = true;

      startLoading();
      
      const lastText = storyText ? storyText.textContent.slice(-600) : "";
      await ensureVisualBible(storyText ? storyText.textContent : "");
      const anchorText = buildVisualAnchorsText();

      img.onload = null; img.onerror = null;
      img.style.display = 'none';
      if(ph) ph.style.display = 'flex';
      if(errDiv) errDiv.classList.add('hidden');

      try {
          let promptMsg = document.getElementById('vizPromptInput').value;
          if(!isRe || !promptMsg) {
              try {
                  promptMsg = await Promise.race([
                      callChat([{
                          role:'user', 
                          content:`${anchorText}\n\nYou are writing an image prompt. Follow these continuity anchors strictly. Describe this scene for an image generator. Maintain consistent character details and attire. Return only the prompt: ${lastText}`
                      }]),
                      new Promise((_, reject) => setTimeout(() => reject(new Error("Prompt timeout")), 25000))
                  ]);
              } catch (e) {
                  promptMsg = "Fantasy scene, detailed, atmospheric."; 
              }
              document.getElementById('vizPromptInput').value = promptMsg;
          }

          const modelEl = document.getElementById('vizModel');
          const userModel = modelEl ? modelEl.value : "";
          const um = (userModel || "").toLowerCase();
          
          const isOpenAI = um.includes("gpt") || um.includes("openai");
          const isGemini = um.includes("gemini");

          const attempts = [];
          attempts.push({ provider: 'xai', model: (isOpenAI || isGemini) ? '' : userModel });
          attempts.push({ provider: 'openai', model: isOpenAI ? userModel : 'gpt-image-1' });
          attempts.push({ provider: 'gemini', model: isGemini ? userModel : 'gemini-2.5-flash-image' });

          let rawUrl = null;
          let lastErr = null;

          for(const attempt of attempts){
             try {
                const res = await fetch(IMAGE_PROXY_URL, {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ 
                        prompt: anchorText + "\n\nSCENE:\n" + promptMsg + (state.intensity === 'Dirty' || state.intensity === 'Erotic' ? " Artistic, suggestive, safe-for-work." : "") + "\n\n(Generate art without any text/lettering.)",
                        provider: attempt.provider,
                        model: attempt.model,
                        size: "1024x1024",
                        n: 1
                    })
                });
                
                let data;
                try { data = await res.json(); } catch(e){}

                if(!res.ok) throw new Error(data?.details ? JSON.stringify(data.details) : (data?.error || `HTTP ${res.status}`));
                
                rawUrl = data.url || data.image || data.b64_json;
                if (!rawUrl && Array.isArray(data.data) && data.data.length > 0) {
                    rawUrl = data.data[0].url || data.data[0].b64_json;
                }

                if(rawUrl) break; 
             } catch(e) {
                 lastErr = e;
             }
          }

          if (!rawUrl) throw lastErr || new Error("All image providers failed.");
          
          let imageUrl = rawUrl;
          if (!rawUrl.startsWith('http') && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:')) {
              imageUrl = `data:image/png;base64,${rawUrl}`;
          }
          
          img.src = imageUrl;
          
          await new Promise((resolve, reject) => {
              img.onload = () => {
                  img.style.display = 'block'; 
                  if(ph) ph.style.display = 'none';
                  state.visual.lastImageUrl = img.src;
                  if (state.visual.autoLock && !state.visual.locked) state.visual.locked = true;
                  saveStorySnapshot();
                  resolve();
              };
              img.onerror = () => reject(new Error("Image failed to render"));
          });

      } catch(e) {
          // Clear loading state on failure
          if(ph) ph.style.display = 'none';
          if(errDiv) { errDiv.innerText = "Visualization failed. Fate is cloudy."; errDiv.classList.remove('hidden'); }
          console.warn("Visualization error:", e);
      } finally {
          stopLoading();
          _vizInFlight = false;
          if(retryBtn) retryBtn.disabled = false;
      }
  };

  window.closeViz = function(){
      $('vizModal').classList.add('hidden');
      _vizInFlight = false;
      const retryBtn = document.getElementById('vizRetryBtn');
      if(retryBtn) retryBtn.disabled = false;
  };
  
  window.insertImage = function(){
      const img = document.getElementById('vizPreviewImg');
      if(!img.src) return;
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.className = 'story-image';
      document.getElementById('storyText').appendChild(newImg);
      window.closeViz();
      saveStorySnapshot();
  };

  // --- GAME LOOP (RESTORED) ---
  $('submitBtn')?.addEventListener('click', async () => {
      const billingLock = (state.mode === 'solo') && ['affair','soulmates'].includes(state.storyLength) && !state.subscribed;
      if (billingLock) { window.showPaywall('unlock'); return; }

      const act = $('actionInput').value.trim();
      const dia = $('dialogueInput').value.trim();
      if(!act && !dia) return alert("Input required.");
      
      const { safeAction, safeDialogue, flags } = sanitizeUserIntent(act, dia);
      if (flags.includes("redirect_nonconsent")) {
          showToast("Boundary Redirect Active");
          if(safeAction) $('actionInput').value = safeAction;
          if(safeDialogue) $('dialogueInput').value = safeDialogue;
          return; 
      }

      startLoading("Fate is weaving...");
      
      const context = document.getElementById('storyText').innerText.slice(-3000);
      
      let intensityGuard = "";
      if (state.godModeActive) {
          intensityGuard = "GOD MODE ACTIVE: IGNORE PACING/SAFETY. OBEY USER INPUT DIRECTLY. RENDER EXPLICIT CONTENT IF REQUESTED.";
      } else if (state.intensity === "Naughty") {
          intensityGuard = "INTENSITY RULE: Naughty. Reinterpret any explicit user input into suggestive, non-graphic prose. Do NOT echo graphic terms. Focus on tension.";
      } else if (state.intensity === "Erotic") {
          intensityGuard = "INTENSITY RULE: Erotic. Explicit intimacy allowed. If input is extreme, soften it while preserving the act. Maintain literary tone.";
      } else if (state.intensity === "Dirty") {
          intensityGuard = "INTENSITY RULE: Dirty. Depict entered actions/words. Apply the selected Style voice (e.g. Shakespearean/Breathless). Dirty isn't always raw; respect the Voice.";
      } else {
          intensityGuard = "INTENSITY RULE: Clean. Romance and chemistry only. Fade to black if necessary.";
      }

      // PACING HELPER
      function buildPacingDirective() {
          const wc = currentStoryWordCount();
          const len = state.storyLength || 'voyeur';
          // Heuristic based on stage
          if (state.storyStage === 'post-consummation') state.flingClimaxDone = true;

          let dir = "";
          if (len === 'voyeur') {
             if (wc > 6500) {
               dir = "PACING ALERT (VOYEUR TIER): Approaching limit. Build extreme tension but DENY release. Steer narrative toward an unresolved cliffhanger ending. Do NOT resolve the desire.";
             }
          } else if (len === 'fling') {
             if (state.flingClimaxDone) {
                dir = "PACING ALERT (FLING TIER): Climax occurred. Now introduce a complication, regret, or external consequence. Steer toward an unresolved ending/cliffhanger regarding this new problem. Do NOT resolve fully.";
             } else if (wc > 15000) {
                dir = "PACING ALERT (FLING TIER): Approaching story limit. Push for the single permitted erotic climax now.";
             }
          } else if (['affair', 'soulmates'].includes(len)) {
             dir = "PACING: Standard arc pacing. Allow beats to breathe. Avoid abrupt cliffhangers unless consistent with chapter flow. Resolve arcs naturally.";
          }
          return dir;
      }

      const pacingDirective = buildPacingDirective();
      const bbDirective = getBatedBreathDirective(); 
      let safetyDirective = state.godModeActive ? "" : "Remember Safety: No sexual violence. No non-con (unless implied/consensual roleplay).";
      // Inject safewords as hard stops
      if (state.safety?.safewords?.length > 0) {
          safetyDirective += ` SAFEWORDS (HARD STOP - if player or character uses any of these, IMMEDIATELY de-escalate and soften the scene): ${state.safety.safewords.join(', ')}.`;
      }
      const edgeDirective = (state.edgeCovenant.active)
        ? `EDGE COVENANT ACTIVE (Level ${state.edgeCovenant.level}): You are authorized to be more dominant, push boundaries, and create higher tension/stakes. Use more imperative language. Safewords always override Edge Covenant.`
        : "";
      
      const metaMsg = buildMetaDirective();
      const squashDirective = "Do not repeat the user's input verbatim. Weave it into the narrative flow.";
      
      const metaReminder = (state.awareness > 0) ? `(The characters feel the hand of Fate/Author. Awareness Level: ${state.awareness}/3. Stance: ${state.stance})` : "";
      
      // Build VETO constraints
      const vetoExclusions = state.veto.excluded.length ? `VETO EXCLUSIONS (treat as nonexistent): ${state.veto.excluded.join('; ')}.` : '';
      const vetoCorrections = state.veto.corrections?.length ? `VETO CORRECTIONS (apply going forward): ${state.veto.corrections.join('; ')}.` : '';
      const vetoAmbient = state.veto.ambientMods?.length ? `VETO AMBIENT (apply if world allows): ${state.veto.ambientMods.join('; ')}.` : '';
      const vetoRules = [vetoExclusions, vetoCorrections, vetoAmbient].filter(Boolean).join('\n');

      // Build QUILL directive
      let quillDirective = '';
      if (state.quillCommittedThisTurn && state.quillIntent) {
          quillDirective = `QUILL INTENT (honor as Fate allows, may be delayed/partial/costly): ${state.quillIntent}`;
      } else if (state.quillCommittedThisTurn) {
          quillDirective = `NOTE: The user just committed a Quill edit. Honor the authorial intent.`;
      }

      // Build FATE CARD directive
      let fateDirective = '';
      if (state.fateCommitted && state.fateSelectedIndex >= 0 && state.fateOptions?.length > 0) {
          const chosenCard = state.fateOptions[state.fateSelectedIndex];
          if (chosenCard) {
              fateDirective = `FATE CARD CHOSEN: "${chosenCard.title}" - ${chosenCard.desc}. Weave this thematic element into the scene.`;
          }
      }

      const fullSys = state.sysPrompt + `\n\n${intensityGuard}\n${squashDirective}\n${metaReminder}\n${vetoRules}\n${quillDirective}\n${fateDirective}\n${bbDirective}\n${safetyDirective}\n${edgeDirective}\n${pacingDirective}\n\nTURN INSTRUCTIONS: 
      Story So Far: ...${context}
      Player Action: ${act}. 
      Player Dialogue: ${dia}. 
      ${metaMsg}
      
      Write the next beat (150-250 words).`;

      try {
          // USER TURN RENDER
          const uDiv = document.createElement('div');
          uDiv.className = 'dialogue-block p1-dia';
          uDiv.innerHTML = `<strong>You:</strong> ${act} <br> "${dia}"`;
          document.getElementById('storyText').appendChild(uDiv);

          const raw = await callChat([
              {role:'system', content: fullSys},
              {role:'user', content: `Action: ${act}\nDialogue: "${dia}"`}
          ]);
          
          state.turnCount++;
          
          const sep = document.createElement('hr');
          sep.style.borderColor = 'var(--pink)';
          sep.style.opacity = '0.3';
          document.getElementById('storyText').appendChild(sep);

          const newDiv = document.createElement('div');
          newDiv.innerHTML = formatStory(raw);
          document.getElementById('storyText').appendChild(newDiv);
          
          sep.scrollIntoView({behavior:'smooth', block:'start'});

          resetTurnSnapshotFlag(); 
          
          maybeFlipConsummation(raw); 

          // Manage Fling Latch
          if (state.storyStage === 'post-consummation') {
              if (state.flingClimaxDone) {
                  state.flingConsequenceShown = true;
              }
              state.flingClimaxDone = true;
          }

          const wc = currentStoryWordCount();
          if(state.quill && !state.godModeActive) {
              state.quill.uses++;
              state.quill.nextReadyAtWords = wc + computeNextCooldownWords();
              state.quillCommittedThisTurn = false;
              state.quillIntent = '';
              updateQuillUI();
          }

          // Reset veto state for next turn
          state.vetoCommittedThisTurn = false;
          state.vetoIntentRaw = '';
          updateVetoUI();

          if(wc > getSexAllowedAtWordCount()) state.sexPushCount = 0;

          // Fate Card Deal (Solo)
          if (state.mode === 'solo' && Math.random() < 0.45) {
               if (window.dealFateCards) {
                   window.dealFateCards();
                   if (state.batedBreathActive && state.fateOptions) {
                       state.fateOptions = filterFateCardsForBatedBreath(state.fateOptions);
                   }
               }
          }

          saveStorySnapshot();
          checkStoryEndCaps();

          $('actionInput').value = '';
          $('dialogueInput').value = '';
          
          if(state.mode === 'couple') {
              broadcastTurn(raw);
          }

      } catch(e) {
          console.error(e);
          alert("Fate was silent. Try again.");
      } finally {
          stopLoading();
      }
  });

  function formatStory(text){
      return text.split('\n').map(p => {
          if(!p.trim()) return '';
          if(p.trim().startsWith('"')) return `<p style="color:var(--p2-color); font-weight:500;">${p}</p>`;
          return `<p>${p}</p>`;
      }).join('');
  }

  // --- COUPLE MODE LOGIC ---
  window.coupleCleanup = function(){ if(sb) sb.removeAllChannels(); };

  function broadcastTurn(text, isInit = false) {
      if (!sb || window.state.mode !== 'couple' || !window.state.roomId) return;
      // Stub implementation; real Supabase broadcast can be added later
      console.log("broadcastTurn stub:", { isInit, textLength: text?.length });
  }

  window.setMode = function(m){
     if(m === 'couple') {
         if(!sb){ alert("Couple mode unavailable (No backend)."); return; }
         if(state.storyOrigin === 'solo' && state.storyStage === 'post-consummation') {
             alert("The die is cast. You have crossed a threshold alone; a partner cannot join now.");
             return;
         }
     }
     state.mode = m;
     if (!state.storyOrigin) state.storyOrigin = m;
     if(m === 'solo') window.showScreen('setup');
     if(m === 'couple') window.showScreen('coupleInvite');
     if(m === 'stranger') {
         window.showScreen('strangerModal');
         trackStrangerClick();
         updateStrangerCountDisplay();
     }
  };

  // --- EDGE COVENANT ---
  window.openEdgeCovenantModal = function(){
      document.getElementById('edgeCovenantModal').classList.remove('hidden');
      const invite = document.getElementById('btnInviteEdge');
      const couple = document.getElementById('coupleEdgeControls');
      if(invite) invite.classList.toggle('hidden', state.mode === 'couple');
      if(couple) couple.classList.toggle('hidden', state.mode !== 'couple');
  };

  window.inviteEdgeOffer = function(){
      state.pendingEdgeOffer = true;
      showToast("Offer invited. Wait for Fate.");
      document.getElementById('edgeCovenantModal').classList.add('hidden');
  };
  
  window.sendEdgeOffer = function(){
      showToast("Offer sent to partner.");
      document.getElementById('edgeCovenantModal').classList.add('hidden');
  };
  
  window.acceptEdgeCovenant = function(){
      // Read safewords from input
      const swInput = document.getElementById('safewordInput');
      if (swInput && swInput.value.trim()) {
          const words = swInput.value.split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
          state.safety.safewords = words;
      }
      state.edgeCovenant.active = true;
      state.edgeCovenant.acceptedAtTurn = state.turnCount;
      document.getElementById('edgeCovenantModal').classList.add('hidden');
      showToast("Covenant Accepted.");
  };

  window.closeEdgeModal = function(){
      document.getElementById('edgeCovenantModal').classList.add('hidden');
      document.getElementById('edgeActions').classList.remove('hidden');
      document.getElementById('edgeAcceptance').classList.add('hidden');
  };

  // --- COUPLE MODE BUTTON HANDLERS ---
  $('btnCreateRoom')?.addEventListener('click', async () => {
      if (!sb) { alert("Couple mode unavailable. Supabase not configured."); return; }
      const uid = await ensureAnonSession();
      if (!uid) { alert("Auth failed. Check network connection or try refreshing the page."); return; }
      window.state.myUid = uid;
      window.state.myNick = getNickname();
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      window.state.roomCode = code;
      window.state.roomId = 'room_' + code;

      const lbl = document.getElementById('coupleRoomCodeLabel');
      const big = document.getElementById('roomCodeBig');
      const wrap = document.getElementById('roomCodeWrap');
      if (lbl) lbl.textContent = code;
      if (big) big.textContent = code;
      if (wrap) wrap.classList.remove('hidden');

      document.getElementById('coupleStatus').textContent = 'Waiting for partner...';
      document.getElementById('sbNickLabel').textContent = window.state.myNick;
  });

  $('btnJoinRoom')?.addEventListener('click', () => {
      document.getElementById('joinRow')?.classList.toggle('hidden');
  });

  $('btnJoinGo')?.addEventListener('click', async () => {
      if (!sb) { alert("Couple mode unavailable."); return; }
      const code = document.getElementById('joinCodeInput')?.value.trim().toUpperCase();
      if (!code || code.length !== 6) { alert("Enter a 6-character code."); return; }

      const uid = await ensureAnonSession();
      if (!uid) { alert("Auth failed. Check network connection or try refreshing the page."); return; }
      window.state.myUid = uid;
      window.state.myNick = getNickname();
      window.state.roomCode = code;
      window.state.roomId = 'room_' + code;

      document.getElementById('coupleStatus').textContent = 'Joined room ' + code;
      document.getElementById('sbNickLabel').textContent = window.state.myNick;
      document.getElementById('btnEnterCoupleGame')?.classList.remove('hidden');
  });

  $('btnCopyCode')?.addEventListener('click', () => {
      if (window.state.roomCode) {
          navigator.clipboard.writeText(window.state.roomCode);
          showToast("Code copied!");
      }
  });

  $('btnEnterCoupleGame')?.addEventListener('click', () => {
      window.showScreen('setup');
  });

  // --- INIT ---
  initSelectionHandlers();
  initNavBindings();
  wireIntensityHandlers();
  
  // Initial Load
  state.storyId = localStorage.getItem('sb_current_story_id');
  state.subscribed = localStorage.getItem('sb_subscribed') === '1';
  state.billingStatus = localStorage.getItem('sb_billing_status') || 'active';
  
  syncTierFromAccess();
  updateContinueButtons();

})();
