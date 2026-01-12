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

  // =========================
  // ARCHETYPE SYSTEM (LOCKED)
  // =========================
  const ARCHETYPES = {
      ROMANTIC: {
          id: 'ROMANTIC',
          name: 'The Romantic',
          desireStyle: 'Expressive, devoted, emotionally fluent',
          summary: 'The Romantic — expressive and devoted, offering love openly and poetically, binding through attention, longing, and emotional presence.',
          shadow: 'Shadow: risks overgiving, binding too tightly, and losing themselves in longing.',
          primaryOnly: false
      },
      CLOISTERED: {
          id: 'CLOISTERED',
          name: 'The Cloistered',
          desireStyle: 'Sheltered curiosity, restrained longing, awakening',
          summary: 'The Cloistered — sheltered and restrained, approaching desire as discovery, awakening slowly through trust, patience, and chosen intimacy.',
          shadow: 'Shadow: withdraws or delays, letting fear of awakening stall intimacy.',
          primaryOnly: false
      },
      ROGUE: {
          id: 'ROGUE',
          name: 'The Rogue',
          desireStyle: 'Playful danger, charm, irreverent confidence',
          summary: 'The Rogue — playful and irreverent, using charm and danger to seduce, testing connection through flirtation, risk, and rule-bending confidence.',
          shadow: 'Shadow: deflects depth with charm, testing how far desire can go without consequence.',
          primaryOnly: false
      },
      DANGEROUS: {
          id: 'DANGEROUS',
          name: 'The Dangerous',
          desireStyle: 'Controlled menace, restraint, implied power',
          summary: 'The Dangerous — controlled and restrained, radiating implied power and menace, creating heat through what is held back rather than revealed.',
          shadow: 'Shadow: withholds warmth, letting restraint harden into distance or intimidation.',
          primaryOnly: false
      },
      GUARDIAN: {
          id: 'GUARDIAN',
          name: 'The Guardian',
          desireStyle: 'Protection, steadiness, containment',
          summary: 'The Guardian — steady and protective, offering safety as intimacy, building desire through reliability, containment, and earned trust.',
          shadow: 'Shadow: overcontains, mistaking protection for control or emotional silence.',
          primaryOnly: false
      },
      SOVEREIGN: {
          id: 'SOVEREIGN',
          name: 'The Sovereign',
          desireStyle: 'Authority, composure, invitation rather than pursuit',
          summary: 'The Sovereign — composed and authoritative, inviting rather than pursuing, framing desire as permission granted, not attention sought.',
          shadow: 'Shadow: waits too long to yield, risking isolation behind authority.',
          primaryOnly: false
      },
      ENCHANTING: {
          id: 'ENCHANTING',
          name: 'The Enchanting',
          desireStyle: 'Allure, knowing control, magnetic presence',
          summary: 'The Enchanting — magnetic and intentional, wielding allure with knowing control, choosing rather than chasing, shaping desire through presence alone.',
          shadow: 'Shadow: keeps desire at a remove, fearing loss of control if fully seen.',
          primaryOnly: false
      },
      DEVOTED: {
          id: 'DEVOTED',
          name: 'The Devoted',
          desireStyle: 'Focused attention, affection, emotional exclusivity',
          summary: 'The Devoted — focused and emotionally exclusive, expressing intensity through presence, loyalty, and the act of choosing again and again.',
          shadow: 'Shadow: clings too closely, risking suffocation or fear of abandonment.',
          primaryOnly: false
      },
      STRATEGIST: {
          id: 'STRATEGIST',
          name: 'The Strategist',
          desireStyle: 'Anticipation, intelligence, teasing foresight',
          summary: 'The Strategist — intelligent and anticipatory, seducing through foresight and teasing precision, turning desire into a game you want to lose.',
          shadow: 'Shadow: overcalculates, turning intimacy into a game that delays surrender.',
          primaryOnly: false
      },
      BEAUTIFUL_RUIN: {
          id: 'BEAUTIFUL_RUIN',
          name: 'The Beautiful Ruin',
          desireStyle: 'Desire corrupted by distrust; love fractured, tested, and re-bound through choice',
          summary: 'The Beautiful Ruin — desired yet disillusioned, shaped by wounds that make love feel suspect, testing and fracturing bonds until someone chooses them with clear eyes and stays.',
          shadow: 'Shadow: tests and fractures bonds, fearing that love offered freely is not real.',
          primaryOnly: true,
          genderedExpression: {
              male: 'Power + unworthiness → possessive devotion → fear of being chosen',
              female: 'Desire + disillusionment → testing and withdrawal → fear of being falsely loved'
          }
      },
      ANTI_HERO: {
          id: 'ANTI_HERO',
          name: 'The Anti-Hero',
          desireStyle: 'Restrained longing shaped by duty, guilt, or a consuming moral code',
          summary: 'The Anti-Hero — burdened by duty, guilt, or a consuming code, suppressing desire to prevent collateral harm, resisting love even as it draws them closer.',
          shadow: 'Shadow: isolates themselves behind duty and self-denial, letting loneliness harden into resignation or controlled rage.',
          primaryOnly: true,
          coreFantasy: 'They want love, but refuse it because intimacy would endanger others, compromise their mission, or violate their personal code. They are not afraid of love. They are afraid of what love would cost.'
      }
  };

  const ARCHETYPE_ORDER = [
      'ROMANTIC', 'CLOISTERED', 'ROGUE', 'DANGEROUS', 'GUARDIAN',
      'SOVEREIGN', 'ENCHANTING', 'DEVOTED', 'STRATEGIST', 'BEAUTIFUL_RUIN', 'ANTI_HERO'
  ];

  function getArchetypeSectionTitle(loveInterestGender) {
      const g = (loveInterestGender || '').toLowerCase();
      if (g === 'male') return 'Shape Your Storybeau';
      if (g === 'female') return 'Shape Your Storybelle';
      return 'Shape Your Storyboo';
  }

  function validateArchetypeSelection(primaryId, modifierId) {
      const errors = [];
      if (!primaryId) {
          errors.push('You must select exactly one Primary Archetype.');
          return { valid: false, errors };
      }
      const primary = ARCHETYPES[primaryId];
      if (!primary) {
          errors.push('Invalid Primary Archetype selected.');
          return { valid: false, errors };
      }
      if (modifierId) {
          const modifier = ARCHETYPES[modifierId];
          if (!modifier) {
              errors.push('Invalid Modifier Archetype selected.');
              return { valid: false, errors };
          }
          if (modifier.primaryOnly) {
              errors.push(`${modifier.name} may only be chosen as a Primary Archetype.`);
              return { valid: false, errors };
          }
          if (primaryId === modifierId) {
              errors.push('Primary and Modifier cannot be the same archetype.');
              return { valid: false, errors };
          }
      }
      return { valid: true, errors: [] };
  }

  function buildArchetypeDirectives(primaryId, modifierId, loveInterestGender) {
      if (!primaryId) return '';
      const primary = ARCHETYPES[primaryId];
      if (!primary) return '';

      let directive = `
LOVE INTEREST ARCHETYPE DIRECTIVES (LOCKED):

Primary Archetype: ${primary.name}
${primary.summary}
${primary.shadow}
`;

      if (primary.id === 'BEAUTIFUL_RUIN' && primary.genderedExpression) {
          const g = (loveInterestGender || '').toLowerCase();
          if (g === 'male') {
              directive += `\nGendered Expression: ${primary.genderedExpression.male}\n`;
          } else if (g === 'female') {
              directive += `\nGendered Expression: ${primary.genderedExpression.female}\n`;
          }
      }

      if (primary.id === 'ANTI_HERO' && primary.coreFantasy) {
          directive += `\nCore Fantasy: ${primary.coreFantasy}\n`;
      }

      if (modifierId) {
          const modifier = ARCHETYPES[modifierId];
          if (modifier) {
              directive += `
Modifier Archetype: ${modifier.name}
The Modifier colors expression style only. It does not override the Primary's emotional arc or shadow.
Modifier Desire Style: ${modifier.desireStyle}
`;
          }
      }

      directive += `
STORYTELLER ENFORCEMENT:
- Treat the Primary Archetype as dominant.
- Use the Shadow Clause as the main source of relational tension.
- Allow fracture and repair without erasing the shadow.
- Never "heal away" the archetype.
`;

      if (primary.id === 'ANTI_HERO') {
          directive += `
ANTI-HERO ENFORCEMENT:
- Treat self-restraint as the dominant tension driver.
- Surface conflict through refusal, withdrawal, sacrifice, delayed or denied intimacy.
- Allow love to progress only through breach of code, not casual erosion.
- Do not trivialize the code or duty.
- Do not turn restraint into coyness.
- Do not resolve the arc by removing responsibility.
- Anti-Hero arcs hinge on choice under cost, not healing-through-love.
`;
      }

      return directive;
  }

  // --- GLOBAL STATE INITIALIZATION ---
  window.state = {
      tier:'free',
      picks:{ genre:['Romantasy'], dynamic:[], pov:'First', style:['Breathless'] },
      gender:'Female',
      loveInterest:'Male',
      archetype: { primary: null, modifier: null }, 
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
  function escapeHTML(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
  }

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
      // Allows preview buttons within locked cards to still function
      document.addEventListener('click', (e) => {
          // Allow preview buttons to work even in locked cards
          // Use closest() to catch clicks on button or any child element
          if (e.target.closest('.preview-btn')) {
              return; // Let the preview button handle its own click
          }

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

  // --- SUGGESTION PILLS (12 PILLS SYSTEM WITH FIXED WIDTH CLASSES) ---
  // Pills organized by width class: small (~2 words), medium (~3 words), large (~4 words)
  const VETO_PILLS = {
      small: ["no tattoos", "no scars", "ban: moist", "no cheating", "no amnesia", "no pregnancy", "no betrayal", "no ghosts", "no death", "no crying"],
      medium: ["keep pacing slower", "no second person", "avoid violence", "no love triangles", "less explicit talk", "no supernatural"],
      large: ["no sudden time skips", "avoid flowery language", "keep it grounded", "no fourth wall breaks"]
  };
  const QUILL_PILLS = {
      small: ["more tension", "confession", "jealousy beat", "stolen glance", "charged silence", "longing pause", "near miss", "secret out", "heated look", "soft touch"],
      medium: ["only one bed", "enemies to lovers", "forced proximity", "vulnerability scene", "desire lingers", "touch lingers"],
      large: ["take them somewhere private", "build tension slowly", "unexpected interruption", "let desire simmer"]
  };
  const ANCESTRY_PILLS = {
      small: ["Celtic", "Nordic", "Slavic", "Persian", "Greek", "Roman", "Korean", "Japanese", "Chinese", "Indian", "Mayan", "Inuit"],
      medium: ["East Asian", "South Asian", "West African", "Latin American", "Middle Eastern", "Pacific Islander"],
      large: ["Afro-Caribbean descent", "Indigenous American", "Southeast Asian heritage", "Mediterranean roots"]
  };

  // Track active pills and cycling state
  let activePills = { veto: [], quill: [], ancestryPlayer: [], ancestryLI: [] };
  let pillCycleIntervals = {};

  // Width class helpers
  function getWidthClass(size) {
      return size === 'small' ? 'pill-small' : size === 'medium' ? 'pill-medium' : 'pill-large';
  }

  function getRandomFromPool(pool, sizeClass, usedSet) {
      const bucket = pool[sizeClass];
      if (!bucket) return null;
      const available = bucket.filter(p => !usedSet.has(p));
      if (available.length === 0) return null;
      return available[Math.floor(Math.random() * available.length)];
  }

  function generatePillSet(pool, count) {
      // Row structure: 2 small, 1 medium, 1 large per row (4 pills per row, 3 rows = 12 pills)
      const rowPattern = ['small', 'small', 'medium', 'large'];
      const pills = [];
      const used = new Set();

      for (let row = 0; row < Math.ceil(count / 4); row++) {
          for (let i = 0; i < rowPattern.length && pills.length < count; i++) {
              const sizeClass = rowPattern[i];
              const text = getRandomFromPool(pool, sizeClass, used);
              if (text) {
                  pills.push({ text, sizeClass });
                  used.add(text);
              }
          }
      }
      return pills;
  }

  // Tease mode check - Quill pills do nothing in Tease (voyeur + free)
  function isTeaseMode() {
      return state.storyLength === 'voyeur' && state.access === 'free';
  }

  function createPillElement(text, type, index, sizeClass, inputId) {
      const pill = document.createElement('span');
      pill.className = `pill ${type}-pill ${getWidthClass(sizeClass)} fade-in`;
      pill.textContent = text;
      pill.dataset.index = index;
      pill.dataset.sizeClass = sizeClass;
      pill.dataset.type = type;

      pill.onclick = () => {
          // TEASE MODE GUARD: Quill pills do nothing in Tease
          if (type === 'quill' && isTeaseMode()) {
              return; // Do nothing
          }

          const input = document.getElementById(inputId);
          if (input) {
              input.value = input.value ? input.value + '\n' + text : text;
          }
          triggerPillReplace(pill, type, index);
      };

      return pill;
  }

  function triggerPillReplace(pill, type, index) {
      const pool = type === 'veto' ? VETO_PILLS : type === 'quill' ? QUILL_PILLS : ANCESTRY_PILLS;
      const sizeClass = pill.dataset.sizeClass;
      const usedSet = new Set(activePills[type].map(p => p.text));

      // Fade out
      pill.classList.remove('fade-in');
      pill.classList.add('fade-out');

      setTimeout(() => {
          const newText = getRandomFromPool(pool, sizeClass, usedSet);
          if (newText) {
              pill.textContent = newText;
              activePills[type][index] = { text: newText, sizeClass };

              // Update click handler
              const inputId = type === 'veto' ? 'vetoInput' : type === 'quill' ? 'quillInput' :
                  type === 'ancestryPlayer' ? 'ancestryInputPlayer' : 'ancestryInputLI';
              pill.onclick = () => {
                  // TEASE MODE GUARD: Quill pills do nothing in Tease
                  if (type === 'quill' && isTeaseMode()) {
                      return;
                  }

                  const input = document.getElementById(inputId);
                  if (input) {
                      input.value = input.value ? input.value + '\n' + newText : newText;
                  }
                  triggerPillReplace(pill, type, index);
              };
          }
          pill.classList.remove('fade-out');
          pill.classList.add('fade-in');
      }, 300);
  }

  // Continuous cycling - at least one pill always fading
  function startPillCycling(containerId, type) {
      if (pillCycleIntervals[type]) clearInterval(pillCycleIntervals[type]);

      pillCycleIntervals[type] = setInterval(() => {
          const container = document.getElementById(containerId);
          if (!container) return;

          const pills = container.querySelectorAll('.pill:not(.fade-out)');
          if (pills.length === 0) return;

          // Pick a random pill to cycle
          const randomPill = pills[Math.floor(Math.random() * pills.length)];
          const index = parseInt(randomPill.dataset.index, 10);
          triggerPillReplace(randomPill, type, index);
      }, 3000 + Math.random() * 2000); // Cycle every 3-5 seconds
  }

  function populatePills() {
      const vetoPillsEl = document.getElementById('vetoPills');
      const quillPillsEl = document.getElementById('quillPills');
      if (!vetoPillsEl || !quillPillsEl) return;

      vetoPillsEl.innerHTML = '';
      quillPillsEl.innerHTML = '';
      activePills.veto = [];
      activePills.quill = [];

      // Generate 12 pills for each
      const vetoPillSet = generatePillSet(VETO_PILLS, 12);
      const quillPillSet = generatePillSet(QUILL_PILLS, 12);

      vetoPillSet.forEach((p, i) => {
          activePills.veto.push(p);
          vetoPillsEl.appendChild(createPillElement(p.text, 'veto', i, p.sizeClass, 'vetoInput'));
      });

      quillPillSet.forEach((p, i) => {
          activePills.quill.push(p);
          quillPillsEl.appendChild(createPillElement(p.text, 'quill', i, p.sizeClass, 'quillInput'));
      });

      // Start continuous cycling
      startPillCycling('vetoPills', 'veto');
      startPillCycling('quillPills', 'quill');

      // Populate ancestry pills for both subsections
      populateAncestryPills();
  }

  function populateAncestryPills() {
      const playerContainer = document.getElementById('ancestryPillsPlayer');
      const liContainer = document.getElementById('ancestryPillsLI');

      if (playerContainer) {
          playerContainer.innerHTML = '';
          activePills.ancestryPlayer = [];
          const playerPillSet = generatePillSet(ANCESTRY_PILLS, 12);
          playerPillSet.forEach((p, i) => {
              activePills.ancestryPlayer.push(p);
              playerContainer.appendChild(createPillElement(p.text, 'ancestryPlayer', i, p.sizeClass, 'ancestryInputPlayer'));
          });
          startPillCycling('ancestryPillsPlayer', 'ancestryPlayer');
      }

      if (liContainer) {
          liContainer.innerHTML = '';
          activePills.ancestryLI = [];
          const liPillSet = generatePillSet(ANCESTRY_PILLS, 12);
          liPillSet.forEach((p, i) => {
              activePills.ancestryLI.push(p);
              liContainer.appendChild(createPillElement(p.text, 'ancestryLI', i, p.sizeClass, 'ancestryInputLI'));
          });
          startPillCycling('ancestryPillsLI', 'ancestryLI');
      }

      // Update LI ancestry label based on gender
      updateAncestryLILabel();
  }

  function updateAncestryLILabel() {
      const label = document.getElementById('ancestryLabelLI');
      if (!label) return;
      const liGender = document.getElementById('loveInterestGender')?.value || 'Male';
      if (liGender === 'Male') label.textContent = "Your Storybeau's";
      else if (liGender === 'Female') label.textContent = "Your Storybelle's";
      else label.textContent = "Your Storyboo's";
  }

  function updateQuillUI() {
      const btn = document.getElementById('btnCommitQuill');
      const status = document.getElementById('quillStatus');
      const godToggle = document.getElementById('godModeToggle');
      const quillBox = document.getElementById('quillBox');
      if(!btn || !status) return;

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

      // Quill unlocks with: subscription, story pass, or god mode
      const quillUnlocked = state.subscribed || state.godModeActive || (state.storyId && hasStoryPass(state.storyId));

      if (!quillUnlocked) {
          // Quill is paywalled
          status.textContent = "Quill: Locked";
          status.style.color = "var(--gold)";
          if(quillBox) {
              quillBox.classList.add('locked-input');
              quillBox.onclick = () => window.showPaywall('unlock');
          }
          btn.disabled = true;
          btn.style.opacity = "0.5";
      } else if(ready) {
          status.textContent = state.authorChairActive ? "🪑 Quill: Poised" : "Quill: Poised";
          status.style.color = "var(--pink)";
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.borderColor = "var(--pink)";
          btn.textContent = state.godModeActive ? "Commit Quill (God Mode)" : "Commit Quill";
          if(quillBox) {
              quillBox.classList.remove('locked-input');
              quillBox.onclick = null;
          }
      } else {
          const remain = Math.max(0, needed - wc);
          status.textContent = `Quill: Spent (${remain} words to recharge)`;
          status.style.color = "var(--gold)";
          // Don't lock for cooldown - just disable button
          if(quillBox) {
              quillBox.classList.remove('locked-input');
              quillBox.onclick = null;
          }
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.borderColor = "transparent";
      }
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
      let hidden = false;

      if (state.access === 'free' && val === 'voyeur') locked = false;
      else if (state.access === 'pass' && val === 'fling') locked = false;
      else if (state.access === 'sub' && ['fling', 'affair', 'soulmates'].includes(val)) locked = false;
      
      if(state.access !== 'free' && val === 'voyeur') { locked = true; hidden = true; }

      card.classList.toggle('locked', locked);
      card.style.display = hidden ? 'none' : '';
      setPaywallClickGuard(card, locked);
      card.classList.toggle('selected', val === state.storyLength);
    });

    // Auto-select fling if pass tier and current selection is voyeur (now hidden)
    if (state.access === 'pass' && state.storyLength === 'voyeur') {
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
      
      if(state.pendingUpgradeToAffair || state.lastPurchaseType === 'sub') {
          state.subscribed = true;
          localStorage.setItem('sb_subscribed', '1'); 
      }
      
      syncTierFromAccess();
      
      let upgraded = false;
      if (state.lastPurchaseType === 'pass' && state.storyLength === 'voyeur') {
          state.storyLength = 'fling';
          upgraded = true;
          showToast("Story expanded to Fling.");
      }
      if (state.lastPurchaseType === 'sub' && ['fling', 'voyeur'].includes(state.storyLength)) {
          state.storyLength = 'affair';
          upgraded = true;
          showToast("Story upgraded to Affair.");
      }

      if (upgraded) state.storyEnded = false;

      state.lastPurchaseType = null; 
      state.pendingUpgradeToAffair = false;

      applyAccessLocks(); 
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
          else if(confirm("WARNING: God Mode permanently removes this story from canon.")) activateGodMode();
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
    state.archetype = { primary: null, modifier: null };
    document.getElementById('storyText').innerHTML = '';
    // Re-render archetype pills to clear selection
    if (typeof renderArchetypePills === 'function') renderArchetypePills();
    if (typeof updateArchetypePreview === 'function') updateArchetypePreview();
    
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
    state.safety = state.safety || { mode:'balanced', darkThemes:true, nonConImplied:false, violence:true, boundaries:["No sexual violence"] };

    // Initialize default dynamics (Power Imbalance)
    if (!state.picks.dynamic || state.picks.dynamic.length === 0) {
        state.picks.dynamic = ['Power'];
    }

    // Bind Visual Auto-Lock
    const chkLock = document.getElementById('chkAutoLockVisual');
    if(chkLock && chkLock.dataset.bound !== '1') {
        chkLock.dataset.bound = '1';
        chkLock.addEventListener('change', (e) => { state.visual.autoLock = e.target.checked; saveStorySnapshot(); });
    }

    // Bind boundary chips (non-locked ones)
    document.querySelectorAll('.boundary-chips .chip[data-boundary]').forEach(chip => {
        if (chip.dataset.bound === '1') return;
        chip.dataset.bound = '1';
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            const boundary = chip.textContent.trim();
            if (chip.classList.contains('active')) {
                if (!state.safety.boundaries.includes(boundary)) {
                    state.safety.boundaries.push(boundary);
                }
            } else {
                state.safety.boundaries = state.safety.boundaries.filter(b => b !== boundary);
            }
        });
    });

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

    // Initialize Archetype System
    initArchetypeUI();
  }

  // =========================
  // ARCHETYPE UI HANDLERS
  // =========================
  function initArchetypeUI() {
      renderArchetypePills();
      bindArchetypeHandlers();
      bindLoveInterestGenderWatcher();
      updateArchetypeSectionTitle();
  }

  function renderArchetypePills() {
      const primaryContainer = document.getElementById('primaryArchetypePills');
      const modifierContainer = document.getElementById('modifierArchetypePills');
      if (!primaryContainer || !modifierContainer) return;

      primaryContainer.innerHTML = '';
      modifierContainer.innerHTML = '';

      ARCHETYPE_ORDER.forEach(id => {
          const arch = ARCHETYPES[id];
          if (!arch) return;

          // Primary pill
          const primaryPill = document.createElement('button');
          primaryPill.className = 'archetype-pill' + (arch.primaryOnly ? ' primary-only' : '');
          primaryPill.dataset.archetype = id;
          primaryPill.dataset.role = 'primary';
          primaryPill.textContent = arch.name;
          primaryPill.type = 'button';
          if (state.archetype.primary === id) primaryPill.classList.add('selected');
          primaryContainer.appendChild(primaryPill);

          // Modifier pill (only for non-primary-only archetypes)
          if (!arch.primaryOnly) {
              const modPill = document.createElement('button');
              modPill.className = 'archetype-pill';
              modPill.dataset.archetype = id;
              modPill.dataset.role = 'modifier';
              modPill.textContent = arch.name;
              modPill.type = 'button';
              if (state.archetype.modifier === id) modPill.classList.add('selected');
              if (state.archetype.primary === id) modPill.classList.add('disabled');
              modifierContainer.appendChild(modPill);
          }
      });
  }

  function bindArchetypeHandlers() {
      document.querySelectorAll('.archetype-pill').forEach(pill => {
          if (pill.dataset.bound === '1') return;
          pill.dataset.bound = '1';
          pill.addEventListener('click', handleArchetypePillClick);
      });
  }

  function handleArchetypePillClick(e) {
      const pill = e.currentTarget;
      const id = pill.dataset.archetype;
      const role = pill.dataset.role;

      if (pill.classList.contains('disabled')) return;

      if (role === 'primary') {
          if (state.archetype.primary === id) {
              // Deselect
              state.archetype.primary = null;
          } else {
              // Select new primary
              state.archetype.primary = id;
              // If modifier is same as new primary, clear modifier
              if (state.archetype.modifier === id) {
                  state.archetype.modifier = null;
              }
          }
      } else if (role === 'modifier') {
          const arch = ARCHETYPES[id];
          if (arch && arch.primaryOnly) {
              showToast(`${arch.name} may only be chosen as a Primary.`);
              return;
          }
          if (state.archetype.primary === id) {
              showToast('Modifier cannot be the same as Primary.');
              return;
          }
          if (state.archetype.modifier === id) {
              // Deselect
              state.archetype.modifier = null;
          } else {
              // Select new modifier
              state.archetype.modifier = id;
          }
      }

      updateArchetypePillStates();
      updateArchetypePreview();
  }

  function updateArchetypePillStates() {
      // Update primary pills
      document.querySelectorAll('.archetype-pill[data-role="primary"]').forEach(pill => {
          const id = pill.dataset.archetype;
          pill.classList.toggle('selected', state.archetype.primary === id);
      });

      // Update modifier pills
      document.querySelectorAll('.archetype-pill[data-role="modifier"]').forEach(pill => {
          const id = pill.dataset.archetype;
          pill.classList.toggle('selected', state.archetype.modifier === id);
          pill.classList.toggle('disabled', state.archetype.primary === id);
      });
  }

  function updateArchetypePreview() {
      const previewEl = document.getElementById('archetypePreview');
      const contentEl = document.getElementById('archetypePreviewContent');
      if (!previewEl || !contentEl) return;

      if (!state.archetype.primary) {
          previewEl.classList.add('hidden');
          return;
      }

      const primary = ARCHETYPES[state.archetype.primary];
      if (!primary) {
          previewEl.classList.add('hidden');
          return;
      }

      let html = `
          <h4 class="archetype-preview-name">${primary.name}</h4>
          <p class="archetype-preview-summary">${primary.summary}</p>
          <p class="archetype-preview-shadow">${primary.shadow}</p>
      `;

      if (state.archetype.modifier) {
          const modifier = ARCHETYPES[state.archetype.modifier];
          if (modifier) {
              html += `
                  <div class="archetype-preview-modifier">
                      <p class="archetype-preview-modifier-label">Modifier: ${modifier.name}</p>
                      <p class="archetype-preview-modifier-style">Expression Style: ${modifier.desireStyle}</p>
                  </div>
              `;
          }
      }

      contentEl.innerHTML = html;
      previewEl.classList.remove('hidden');
  }

  function updateArchetypeSectionTitle() {
      const titleEl = document.getElementById('archetypeSectionTitle');
      if (!titleEl) return;
      const genderSelect = document.getElementById('loveInterestGender');
      const customInput = document.getElementById('customLoveInterest');
      let loveGender = 'Male';
      if (genderSelect) {
          if (genderSelect.value === 'Custom' && customInput && customInput.value.trim()) {
              loveGender = customInput.value.trim();
          } else {
              loveGender = genderSelect.value;
          }
      }
      titleEl.textContent = getArchetypeSectionTitle(loveGender);
  }

  function bindLoveInterestGenderWatcher() {
      const genderSelect = document.getElementById('loveInterestGender');
      const customInput = document.getElementById('customLoveInterest');

      function onGenderChange() {
          updateArchetypeSectionTitle();
          updateAncestryLILabel();
      }

      if (genderSelect && genderSelect.dataset.archetypeBound !== '1') {
          genderSelect.dataset.archetypeBound = '1';
          genderSelect.addEventListener('change', onGenderChange);
      }

      if (customInput && customInput.dataset.archetypeBound !== '1') {
          customInput.dataset.archetypeBound = '1';
          customInput.addEventListener('input', onGenderChange);
      }
  }

  // --- LOADING OVERLAY ---
  let _loadingTimer = null;
  let _loadingActive = false;
  let _loadingMsgTimer = null;

  const LOADING_MESSAGES = [
      "Painting the scene...",
      "Saying it with his eyes...",
      "Letting the silence linger...",
      "Adding longing...",
      "Shaping the moment...",
      "Tracing the tension...",
      "Capturing the unspoken...",
      "Finding the perfect light..."
  ];

  function startLoading(msg, rotate = false){
    const overlay = document.getElementById('loadingOverlay');
    const fill = document.getElementById('loadingOverlayFill');
    const textEl = document.getElementById('loadingText');
    if (textEl) textEl.textContent = msg || "Loading...";

    _loadingActive = true;
    if(fill) fill.style.width = '0%';
    if(overlay) overlay.classList.remove('hidden');

    if(_loadingTimer) clearInterval(_loadingTimer);
    if(_loadingMsgTimer) clearInterval(_loadingMsgTimer);

    let p = 0;
    _loadingTimer = setInterval(() => {
      if(!_loadingActive) return;
      p = Math.min(91, p + Math.random() * 6);
      if(fill) fill.style.width = p.toFixed(0) + '%';
    }, 250);

    // Rotate messages if requested (for visualize)
    if (rotate && textEl) {
        let msgIdx = 0;
        _loadingMsgTimer = setInterval(() => {
            if (!_loadingActive) return;
            msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
            textEl.textContent = LOADING_MESSAGES[msgIdx];
        }, 2000);
    }
  }

  function stopLoading(){
    if(!_loadingActive) return;
    _loadingActive = false;
    const overlay = document.getElementById('loadingOverlay');
    const fill = document.getElementById('loadingOverlayFill');
    if(_loadingTimer) { clearInterval(_loadingTimer); _loadingTimer = null; }
    if(_loadingMsgTimer) { clearInterval(_loadingMsgTimer); _loadingMsgTimer = null; }
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
      if (confirm("WARNING: God Mode permanently removes this story from canon.")) {
          activateGodMode();
      }
  });

  $('btnCommitQuill')?.addEventListener('click', () => {
      if (!getQuillReady()) return;
      const quillEl = document.getElementById('quillInput');
      if (!quillEl) return;
      const quillText = quillEl.value.trim();
      if (!quillText) { showToast("No Quill edit to commit."); return; }

      // Also apply any pending veto constraints
      applyVetoFromInput();

      // Store quill intent in state for prompt injection
      window.state.quillIntent = quillText;

      const storyEl = document.getElementById('storyText');
      if (storyEl && quillText) {
          const div = document.createElement('div');
          div.className = 'quill-intervention';
          div.style.cssText = 'font-style:italic; color:var(--gold); border-left:2px solid var(--gold); padding-left:10px; margin:15px 0;';
          div.innerHTML = formatStory(quillText, true);
          storyEl.appendChild(div);
      }

      window.state.quillCommittedThisTurn = true;
      window.state.quill.uses++;
      window.state.quill.nextReadyAtWords = currentStoryWordCount() + computeNextCooldownWords();
      quillEl.value = '';
      updateQuillUI();
      saveStorySnapshot();
      showToast("Quill committed.");
  });

  // Commit Veto Button Handler
  $('btnCommitVeto')?.addEventListener('click', () => {
      const vetoEl = document.getElementById('vetoInput');
      if (!vetoEl) return;
      const vetoText = vetoEl.value.trim();
      if (!vetoText) { showToast("No veto to commit."); return; }

      applyVetoFromInput();
      vetoEl.value = '';
      showToast("Veto committed. Boundaries updated.");
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

  // --- BEGIN STORY VALIDATION GUARDRAIL ---
  function validateBeginStory() {
      const errors = [];

      // Check archetype selection
      const archetypeValidation = validateArchetypeSelection(state.archetype.primary, state.archetype.modifier);
      if (!archetypeValidation.valid) {
          errors.push(archetypeValidation.errors[0] || 'Please select a Primary Archetype.');
      }

      // Check for at least one genre selected
      if (!state.picks.genre || state.picks.genre.length === 0) {
          errors.push('Please select at least one Genre.');
      }

      // Check for at least one dynamic selected
      if (!state.picks.dynamic || state.picks.dynamic.length === 0) {
          errors.push('Please select at least one Dynamic.');
      }

      // Check for at least one style selected
      if (!state.picks.style || state.picks.style.length === 0) {
          errors.push('Please select at least one Story Style.');
      }

      return errors;
  }

  // --- BEGIN STORY (RESTORED) ---
  $('beginBtn')?.addEventListener('click', async () => {
    // Comprehensive validation before proceeding
    const validationErrors = validateBeginStory();
    if (validationErrors.length > 0) {
        showToast(validationErrors[0]);
        return;
    }

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

    ${buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen)}

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
    ${state.povMode === 'author5th' ? `
    5TH PERSON (AUTHOR) DIRECTIVES:
    - You are the Author, a visible conductor of the narrative.
    - Presence: ${state.authorPresence}. Cadence: ~${state.authorCadenceWords} words between Author references.
    - Fate card voice: ${state.fateCardVoice}.
    - Author awareness: ${state.allowAuthorAwareness ? 'enabled' : 'disabled'}, chance ${state.authorAwarenessChance}, window ${state.authorAwarenessWindowWords}w, max ${state.authorAwarenessMaxDurationWords}w.
    ` : ''}
    `;
    
    state.sysPrompt = sys;
    state.storyId = state.storyId || makeStoryId();
    
    window.showScreen('game');
    
    startLoading("Conjuring the world...");
    
    // Pacing rules based on intensity
    const pacingRules = {
        'Clean': 'Focus only on atmosphere, world-building, and hints of the protagonist\'s past. No tension, no longing—just setting and mystery.',
        'Naughty': 'Focus on atmosphere and world-building. Light emotional undertones allowed, but no romantic tension yet.',
        'Erotic': 'Build atmosphere first. Romantic tension may simmer beneath the surface, but keep the focus on setting.',
        'Dirty': 'Atmosphere first, but charged undercurrents are allowed. The heat can be present from the start.'
    };
    const pacingRule = pacingRules[state.intensity] || pacingRules['Naughty'];
    const liAppears = state.intensity === 'Dirty' || Math.random() < 0.25;

    const introPrompt = `Write the opening scene (approx 200 words).

FIRST SECTION RULES:
- ${pacingRule}
- Focus on: World setup, hints at overall arc, the protagonist's past or situation.
${liAppears ? '- The love interest may appear briefly or be hinted at.' : '- The love interest should NOT appear yet. Build anticipation.'}
- End with a hook, a question, or atmospheric tension—NOT a romantic moment.

Setting: A place full of atmosphere and sensory detail fitting the genre.
Situation: The Protagonist is alone with their thoughts, or engaged in something unrelated to romance.`;

    // FATE STUMBLED DIAGNOSTIC - Structured payload logging
    const ancestryPlayer = $('ancestryInputPlayer')?.value.trim() || '';
    const ancestryLI = $('ancestryInputLI')?.value.trim() || '';
    const archetypeDirectives = buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen);

    // Determine unlock tier
    const quillUnlocked = state.subscribed || state.godModeActive || (state.storyId && hasStoryPass(state.storyId));
    let tier = 'free';
    if (state.subscribed) tier = 'subscribed';
    else if (quillUnlocked) tier = 'quill_unlocked';
    else if (state.storyId && hasStoryPass(state.storyId)) tier = 'story_unlocked';

    // Build structured payload for diagnostic
    const diagnosticPayload = {
        mode: state.mode || 'solo',
        tier: tier,
        genre: state.picks.genre || [],
        archetype: {
            primary: state.archetype.primary || null,
            modifier: state.archetype.modifier || null,
            directives: archetypeDirectives || '(none built)'
        },
        ancestry: {
            yours: ancestryPlayer || '(empty)',
            storybeau: ancestryLI || '(empty)'
        },
        quill: {
            unlocked: quillUnlocked,
            directives: quillUnlocked ? (state.quillIntent || '(none this turn)') : '(LOCKED - not injected)'
        },
        veto: {
            bannedWords: state.veto?.bannedWords || [],
            tone: state.veto?.tone || []
        },
        intensity: state.intensity || 'Naughty',
        pov: state.picks.pov || 'Third Person Limited',
        style: state.picks.style || [],
        dynamic: state.picks.dynamic || [],
        storyLength: state.storyLength || 'novella',
        systemPromptLength: state.sysPrompt?.length || 0
    };

    // Log the full payload
    console.group('STORYBOUND FINAL PROMPT PAYLOAD');
    console.log(diagnosticPayload);
    console.groupEnd();

    // VALIDATION GUARD - Check all required fields before model call
    function validatePayload(payload) {
        const errors = [];

        // Required field checks
        if (!payload.mode) errors.push('Mode is undefined');
        if (!payload.genre || payload.genre.length === 0) errors.push('Genre is missing or empty');
        if (!payload.style || payload.style.length === 0) errors.push('Style is missing or empty');
        if (!payload.archetype.primary) errors.push('Primary Archetype not selected (default: Beautiful Ruin)');
        if (!payload.intensity) errors.push('Intensity is undefined');
        if (!payload.pov) errors.push('POV is undefined');
        if (payload.systemPromptLength === 0) errors.push('System prompt is empty (critical failure)');

        // Check for null/undefined in directive arrays
        if (payload.veto.bannedWords.some(w => w === null || w === undefined)) {
            errors.push('Veto bannedWords array contains null/undefined');
        }
        if (payload.veto.tone.some(t => t === null || t === undefined)) {
            errors.push('Veto tone array contains null/undefined');
        }

        // Check archetype directives actually built
        if (payload.archetype.directives === '(none built)' || !payload.archetype.directives) {
            errors.push('Archetype directives failed to build');
        }

        return errors;
    }

    const payloadErrors = validatePayload(diagnosticPayload);

    if (payloadErrors.length > 0) {
        console.group('STORYBOUND VALIDATION FAILED');
        console.error('Errors:', payloadErrors);
        console.log('Payload at failure:', diagnosticPayload);
        console.groupEnd();

        stopLoading();
        const errorMessage = `Story setup incomplete: ${payloadErrors[0]}`;
        showToast(errorMessage);
        console.error('FATE STUMBLED PREVENTED:', errorMessage);
        window.showScreen('setup');
        return;
    }

    console.log('STORYBOUND VALIDATION PASSED - Proceeding to model call');

    try {
        const text = await callChat([
            {role:'system', content: state.sysPrompt},
            {role:'user', content: introPrompt}
        ]);

        const title = await callChat([{role:'user', content:`Based on this opening, generate a 2-4 word title that is:
- Poetic and evocative
- Mysterious, not literal
- Avoids clichés like "Forbidden", "Dangerous", "Seduction"
Return ONLY the title, no quotes or explanation:\n${text}`}]);
        const synopsis = await callChat([{role:'user', content:`Write back-cover copy for this story in ONE sentence. It should:
- Tease themes and mood, not plot
- Imply conflict without revealing it
- Sound like a published novel blurb
Return ONLY the sentence:\n${text}`}]);
        
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
        console.group('STORYBOUND FATE STUMBLED - API ERROR');
        console.error('Error object:', e);
        console.error('Error message:', e?.message || '(no message)');
        console.error('Error stack:', e?.stack || '(no stack)');
        console.log('System prompt length at failure:', state.sysPrompt?.length || 0);
        console.log('Intro prompt length at failure:', introPrompt?.length || 0);
        console.groupEnd();

        alert("Fate stumbled. Please try again. (Check console for diagnostics)");
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
        if(!res.ok) {
            const errorText = await res.text().catch(() => '(could not read response body)');
            console.group('STORYBOUND API ERROR');
            console.error('HTTP Status:', res.status, res.statusText);
            console.error('Response body:', errorText);
            console.error('Request payload size:', JSON.stringify(payload).length, 'bytes');
            console.error('System message length:', messages[0]?.content?.length || 0);
            console.groupEnd();
            throw new Error(`API Error: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.group('STORYBOUND API MALFORMED RESPONSE');
            console.error('Response data:', data);
            console.groupEnd();
            throw new Error('API returned malformed response (no choices)');
        }
        return data.choices[0].message.content;
    } catch(e){
        console.error('callChat error:', e);
        throw e;
    }
  }

  async function generateSettingShot(desc) {
     const img = document.getElementById('settingShotImg');
     const errDiv = document.getElementById('settingError');
     if(!img) return;
     const wrap = document.getElementById('settingShotWrap');
     if(wrap) wrap.style.display = 'flex';
     img.style.display = 'none';
     if(errDiv) errDiv.classList.add('hidden');

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
             img.onerror = () => {
                 img.style.display = 'none';
                 if(errDiv) { errDiv.textContent = 'The scene resists capture...'; errDiv.classList.remove('hidden'); }
             };
         } else {
             if(errDiv) { errDiv.textContent = 'The scene resists capture...'; errDiv.classList.remove('hidden'); }
         }
     } catch(e) {
         console.warn("Setting shot failed", e);
         if(errDiv) { errDiv.textContent = 'The scene resists capture...'; errDiv.classList.remove('hidden'); }
     }
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

      startLoading("Painting the scene...", true);

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
          if(errDiv) { errDiv.innerText = "Visualization failed. Fate is cloudy."; errDiv.classList.remove('hidden'); }
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

  // Helper: Insert Fate Card separator into story
  function insertFateCardSeparator(cardTitle) {
      const storyEl = document.getElementById('storyText');
      if (!storyEl || !cardTitle) return;
      const sep = document.createElement('div');
      sep.className = 'fate-card-separator';
      sep.innerHTML = `<div class="fate-mini"><h4>${escapeHTML(cardTitle)}</h4></div>`;
      storyEl.appendChild(sep);
  }

  // --- GAME LOOP (RESTORED) ---
  $('submitBtn')?.addEventListener('click', async () => {
      const billingLock = (state.mode === 'solo') && ['affair','soulmates'].includes(state.storyLength) && !state.subscribed;
      if (billingLock) { window.showPaywall('unlock'); return; }

      const act = $('actionInput').value.trim();
      const dia = $('dialogueInput').value.trim();
      if(!act && !dia) return alert("Input required.");

      // Get selected Fate Card title for separator
      let selectedFateCard = null;
      if (state.fateOptions && typeof state.fateSelectedIndex === 'number' && state.fateSelectedIndex >= 0) {
          selectedFateCard = state.fateOptions[state.fateSelectedIndex];
      }
      
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
      const safetyDirective = state.godModeActive ? "" : "Remember Safety: No sexual violence. No non-con (unless implied/consensual roleplay).";
      const edgeDirective = (state.edgeCovenant.active) 
        ? `EDGE COVENANT ACTIVE (Level ${state.edgeCovenant.level}): You are authorized to be more dominant, push boundaries, and create higher tension/stakes. Use more imperative language.` 
        : "";
      
      const metaMsg = buildMetaDirective();
      const squashDirective = `CRITICAL REINTERPRETATION RULE:
- NEVER repeat the player's action or dialogue verbatim in your response.
- ALWAYS reinterpret their intent into the story's voice, tone, and character.
- Transform their words into the narrative style of this story.
- If they write "I kiss him", describe a kiss in your literary voice.
- If they write clunky dialogue, render it as the character would actually speak.
- The player provides intent. You provide craft.`;
      
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

      const fullSys = state.sysPrompt + `\n\n${intensityGuard}\n${squashDirective}\n${metaReminder}\n${vetoRules}\n${quillDirective}\n${bbDirective}\n${safetyDirective}\n${edgeDirective}\n${pacingDirective}\n\nTURN INSTRUCTIONS: 
      Story So Far: ...${context}
      Player Action: ${act}. 
      Player Dialogue: ${dia}. 
      ${metaMsg}
      
      Write the next beat (150-250 words).`;

      try {
          // Insert Fate Card separator if a card was selected (K)
          if (selectedFateCard && selectedFateCard.title) {
              insertFateCardSeparator(selectedFateCard.title);
          }

          // USER TURN RENDER
          const uDiv = document.createElement('div');
          uDiv.className = 'dialogue-block p1-dia';
          uDiv.innerHTML = `<strong>You:</strong> ${escapeHTML(act)} <br> "${escapeHTML(dia)}"`;
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

          // Scroll to the new content
          if (selectedFateCard) {
              // If Fate Card was used, scroll to top of new section
              const separator = document.querySelector('.fate-card-separator:last-child');
              if (separator) separator.scrollIntoView({behavior:'smooth', block:'start'});
              else sep.scrollIntoView({behavior:'smooth', block:'start'});
          } else {
              sep.scrollIntoView({behavior:'smooth', block:'start'});
          }

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

  function formatStory(text, shouldEscape = false){
      const process = shouldEscape ? escapeHTML : (s => s);
      return text.split('\n').map(p => {
          if(!p.trim()) return '';
          const safe = process(p);
          // Format dialogue with special styling
          // Match dialogue and dialogue tag up to first period after closing quote
          const dialogueMatch = safe.match(/^(\s*)(".*?"[^.]*\.?)(.*)/);
          if (dialogueMatch) {
              const [, indent, dialoguePart, rest] = dialogueMatch;
              return `<p>${indent}<span class="story-dialogue">${dialoguePart}</span>${rest}</p>`;
          }
          if(p.trim().startsWith('"')) return `<p class="story-dialogue">${safe}</p>`;
          return `<p>${safe}</p>`;
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
     if(m === 'stranger') window.showScreen('strangerModal');
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
      if (!sb) { alert("Couple mode unavailable."); return; }
      const uid = await ensureAnonSession();
      if (!uid) { alert("Auth failed."); return; }
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
      if (!uid) { alert("Auth failed."); return; }
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

  // Invitation send handlers
  const INVITATION_TEXTS = [
      "A private chamber awaits. The mask is optional. The curiosity is not.",
      "Behind this door, two become one story. Enter if you dare.",
      "The candles are lit. The words are waiting. Only you are missing.",
      "Some invitations cannot be declined. This is one of them."
  ];

  function getInvitationMessage() {
      const text = INVITATION_TEXTS[Math.floor(Math.random() * INVITATION_TEXTS.length)];
      const code = window.state.roomCode || '------';
      return `${text}\n\nYour chamber code: ${code}\n\nJoin at: ${window.location.origin}`;
  }

  function markInvitationSent() {
      const status = document.getElementById('inviteSentStatus');
      const enterBtn = document.getElementById('btnEnterCoupleGame');
      const soloBtn = document.getElementById('btnPlaySoloWaiting');

      if (status) status.classList.remove('hidden');
      if (enterBtn) {
          enterBtn.classList.remove('hidden');
          enterBtn.disabled = false;
      }
      if (soloBtn) soloBtn.classList.remove('hidden');

      window.state.invitationSent = true;
  }

  $('btnSendEmail')?.addEventListener('click', () => {
      const subject = encodeURIComponent("You're invited to a Private Chamber");
      const body = encodeURIComponent(getInvitationMessage());
      // Use location.href for proper mailto handling with default email client
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      markInvitationSent();
      showToast("Email client opened.");
  });

  $('btnSendSMS')?.addEventListener('click', () => {
      const body = encodeURIComponent(getInvitationMessage());
      window.location.href = `sms:?body=${body}`;
      markInvitationSent();
      showToast("SMS opened.");
  });

  $('btnSendBoth')?.addEventListener('click', () => {
      const subject = encodeURIComponent("You're invited to a Private Chamber");
      const body = encodeURIComponent(getInvitationMessage());
      // Open email first via location.href
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      markInvitationSent();
      showToast("Email client opened. Use SMS button for text.");
  });

  $('btnPlaySoloWaiting')?.addEventListener('click', () => {
      window.state.batedBreathActive = true;
      window.showScreen('setup');
  });

  $('btnEnterCoupleGame')?.addEventListener('click', () => {
      if (!window.state.invitationSent) {
          showToast("Please send an invitation first.");
          return;
      }
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
