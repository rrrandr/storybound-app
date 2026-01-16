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
  // Use local proxy by default (requires XAI_API_KEY env var)
  // Falls back to external proxy if explicitly configured
  const PROXY_URL = config.proxyUrl || '/api/proxy';
  // Image requests always use local /api/image endpoint (never proxy)
  var IMAGE_PROXY_URL = '/api/image';

  // =============================================================================
  // AI ORCHESTRATION CONFIGURATION
  // =============================================================================
  /**
   * AUTHORITATIVE — DO NOT REINTERPRET
   *
   * Storybound uses MULTIPLE AI models with STRICT SEPARATION OF AUTHORITY:
   *
   * 1. ChatGPT (PRIMARY AUTHOR — ALWAYS CALLED)
   *    - ONLY model allowed to author plot progression
   *    - ONLY model allowed to determine if intimacy occurs
   *    - ONLY model allowed to enforce monetization gates
   *    - ONLY model allowed to generate Erotic Scene Directives (ESD)
   *    - Runs BEFORE any specialist renderer
   *    - Runs AFTER any specialist renderer (integration pass)
   *    - FINAL AUTHORITY on story state
   *
   * 2. Specialist Renderer (Grok) — CONDITIONAL
   *    - Purpose: Sensory embodiment ONLY
   *    - May ONLY receive a fully-specified ESD
   *    - May NEVER decide plot, invent lore, or change outcomes
   *    - NEVER decides "how far things go"
   *    - Renders HOW IT FEELS, within bounds
   *
   * 3. Fate Cards — Dual-Model Split
   *    - GPT-5.1: Structural authority (REQUIRED)
   *    - GPT-5.2: Linguistic elevation (OPTIONAL, discardable)
   *
   * DO NOT MERGE THESE RESPONSIBILITIES. The separation is intentional.
   *
   * ORCHESTRATION ORDER (NON-NEGOTIABLE):
   * 1. ChatGPT — Author Pass (plot, psychology, ESD generation)
   * 2. Specialist Renderer — OPTIONAL (sensory embodiment only)
   * 3. ChatGPT — Integration Pass (consequences, state, cliffhangers)
   */

  // Enable/disable orchestrated multi-model flow
  // When true: ChatGPT → optional Grok → ChatGPT
  // When false: Legacy single-model flow (Grok only)
  const ENABLE_ORCHESTRATION = true;

  // Legacy model (used when orchestration disabled or ChatGPT unavailable)
  const STORY_MODEL = 'grok-4.1-fast-reasoning'; 
  
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
// GLOBAL CONFIG (TEMP – UNTIL EXTERNALIZED CLEANLY)
window.config = window.config || {
  enableAncestry: true,
  enableStorybeau: true,
  enableQuill: true,
  enableVeto: true,
  enablePillCycling: true,
  enableAdvancedUI: true
};

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
  // STORY PAGINATION SYSTEM
  // =========================
  const StoryPagination = (function() {
      let pages = [];           // Array of page content (HTML strings)
      let currentPageIndex = 0;
      let isAnimating = false;

      // DOM references - lazily initialized
      let container = null;
      let prevBtn = null;
      let nextBtn = null;
      let indicator = null;

      // REPAIR: Lazy initialization - ensures container is found before any operation
      function ensureInitialized() {
          if (!container) {
              container = document.getElementById('storyPagesContainer');
          }
          if (!prevBtn) {
              prevBtn = document.getElementById('prevPageBtn');
              if (prevBtn && !prevBtn._bound) {
                  prevBtn.addEventListener('click', () => goToPrevPage());
                  prevBtn._bound = true;
              }
          }
          if (!nextBtn) {
              nextBtn = document.getElementById('nextPageBtn');
              if (nextBtn && !nextBtn._bound) {
                  nextBtn.addEventListener('click', () => goToNextPage());
                  nextBtn._bound = true;
              }
          }
          if (!indicator) {
              indicator = document.getElementById('pageIndicator');
          }
          return !!container;
      }

      function init() {
          ensureInitialized();
          // Keyboard navigation
          if (!document._paginationKeyBound) {
              document.addEventListener('keydown', handleKeyNav);
              document._paginationKeyBound = true;
          }
      }

      function handleKeyNav(e) {
          // Only handle arrow keys when story is visible
          const storyText = document.getElementById('storyText');
          if (!storyText || storyText.offsetParent === null) return;

          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              goToNextPage();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              goToPrevPage();
          }
      }

      function createPageElement(content, index) {
          const page = document.createElement('div');
          page.className = 'story-page';
          page.dataset.pageIndex = index;
          page.innerHTML = content;
          return page;
      }

      function updateNavigation() {
          ensureInitialized();
          if (prevBtn) prevBtn.disabled = currentPageIndex === 0 || isAnimating;
          if (nextBtn) nextBtn.disabled = currentPageIndex >= pages.length - 1 || isAnimating;
          if (indicator) indicator.textContent = pages.length > 0 ? `Page ${currentPageIndex + 1} of ${pages.length}` : 'Page 1 of 1';
      }

      // FIX #4: Post-render hook for tier UI rehydration
      function triggerPostRenderHooks() {
          if (typeof window.applyAccessLocks === 'function') {
              window.applyAccessLocks();
          }
          if (typeof window.applyTierUI === 'function') {
              window.applyTierUI();
          }
      }

      // FIX: Update story header display based on current page
      // Page 1: Large title, synopsis, intro image
      // Page 2+: Smaller title only, no synopsis or intro image
      function updateStoryHeaderDisplay() {
          const titleEl = document.getElementById('storyTitle');
          const synopsisEl = document.getElementById('storySynopsis');
          const settingShotWrap = document.getElementById('settingShotWrap');
          const sceneNumberEl = document.getElementById('sceneNumber');

          // Update scene number based on current page
          if (sceneNumberEl) {
              sceneNumberEl.textContent = 'Scene ' + (currentPageIndex + 1);
          }

          if (currentPageIndex === 0) {
              // Page 1: Full display
              if (titleEl) titleEl.style.fontSize = '';
              if (synopsisEl) synopsisEl.style.display = '';
              if (settingShotWrap) settingShotWrap.style.display = '';
          } else {
              // Page 2+: Compact display
              if (titleEl) titleEl.style.fontSize = '1.2em';
              if (synopsisEl) synopsisEl.style.display = 'none';
              if (settingShotWrap) settingShotWrap.style.display = 'none';
          }
      }

      // CORRECTIVE: Scroll to very top (title) on scene transitions
      function scrollToStoryTop() {
          const titleEl = document.getElementById('storyTitle');
          if (titleEl) {
              // Scroll to title to ensure Scene # is visible
              titleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // Also scroll window to absolute top
              window.scrollTo({ top: 0, behavior: 'smooth' });
          }
      }

      function renderCurrentPage(animate = false, direction = 'forward') {
          // REPAIR: Always try to get container before rendering
          if (!ensureInitialized()) {
              console.warn('StoryPagination: container not found, retrying...');
              return;
          }

          const existingPages = container.querySelectorAll('.story-page');
          const currentPage = createPageElement(pages[currentPageIndex] || '', currentPageIndex);

          if (!animate || existingPages.length === 0) {
              // No animation - just show the page
              container.innerHTML = '';
              currentPage.classList.add('active');
              container.appendChild(currentPage);
              updateNavigation();
              updateStoryHeaderDisplay();
              scrollToStoryTop();
              triggerPostRenderHooks();
              return;
          }

          // Check for reduced motion preference
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          if (prefersReducedMotion) {
              // Instant transition for reduced motion
              container.innerHTML = '';
              currentPage.classList.add('active');
              container.appendChild(currentPage);
              updateNavigation();
              updateStoryHeaderDisplay();
              scrollToStoryTop();
              triggerPostRenderHooks();
              return;
          }

          // Animated page turn
          isAnimating = true;
          updateNavigation();

          const oldPage = existingPages[0];
          const outClass = direction === 'forward' ? 'turning-out' : 'turning-out-reverse';
          const inClass = direction === 'forward' ? 'turning-in' : 'turning-in-reverse';

          // Add new page
          container.appendChild(currentPage);

          // Start animation
          oldPage.classList.remove('active');
          oldPage.classList.add(outClass);
          currentPage.classList.add(inClass);

          // Clean up after animation
          setTimeout(() => {
              oldPage.remove();
              currentPage.classList.remove(inClass);
              currentPage.classList.add('active');
              isAnimating = false;
              updateNavigation();
              updateStoryHeaderDisplay();
              scrollToStoryTop();
              triggerPostRenderHooks();
          }, 500);
      }

      function goToNextPage() {
          if (isAnimating || currentPageIndex >= pages.length - 1) return;
          currentPageIndex++;
          renderCurrentPage(true, 'forward');
      }

      function goToPrevPage() {
          if (isAnimating || currentPageIndex <= 0) return;
          currentPageIndex--;
          renderCurrentPage(true, 'backward');
      }

      function goToPage(index, animate = false) {
          if (index < 0 || index >= pages.length) return;
          const direction = index > currentPageIndex ? 'forward' : 'backward';
          currentPageIndex = index;
          renderCurrentPage(animate, direction);
      }

      function addPage(content, goToNew = true) {
          pages.push(content);
          if (goToNew) {
              currentPageIndex = pages.length - 1;
              renderCurrentPage(pages.length > 1, 'forward');
          } else {
              updateNavigation();
          }
      }

      function updateCurrentPage(content) {
          if (pages.length === 0) {
              addPage(content);
              return;
          }
          pages[currentPageIndex] = content;
          // Update DOM without animation
          ensureInitialized();
          const activePage = container?.querySelector('.story-page.active');
          if (activePage) {
              activePage.innerHTML = content;
          }
      }

      function appendToCurrentPage(content) {
          if (pages.length === 0) {
              addPage(content);
              return;
          }
          pages[currentPageIndex] += content;
          // Update DOM without animation
          ensureInitialized();
          const activePage = container?.querySelector('.story-page.active');
          if (activePage) {
              activePage.innerHTML = pages[currentPageIndex];
          }
      }

      function clear() {
          pages = [];
          currentPageIndex = 0;
          ensureInitialized();
          if (container) container.innerHTML = '';
          updateNavigation();
      }

      function getPageCount() {
          return pages.length;
      }

      function getCurrentPageIndex() {
          return currentPageIndex;
      }

      function getAllContent() {
          return pages.join('');
      }

      function setAllContent(htmlContent) {
          // Convert existing HTML into a single page (for loading saved stories)
          clear();
          if (htmlContent && htmlContent.trim()) {
              addPage(htmlContent, true);
          }
      }

      function getPages() {
          return [...pages];
      }

      function setPages(pageArray) {
          pages = [...pageArray];
          currentPageIndex = Math.min(currentPageIndex, pages.length - 1);
          if (currentPageIndex < 0) currentPageIndex = 0;
          renderCurrentPage(false);
      }

      return {
          init,
          addPage,
          updateCurrentPage,
          appendToCurrentPage,
          goToNextPage,
          goToPrevPage,
          goToPage,
          clear,
          getPageCount,
          getCurrentPageIndex,
          getAllContent,
          setAllContent,
          getPages,
          setPages,
          isAnimating: () => isAnimating
      };
  })();

  // Initialize pagination when DOM is ready
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => StoryPagination.init());
  } else {
      // DOM already loaded
      StoryPagination.init();
  }

  // Expose for debugging
  window.StoryPagination = StoryPagination;

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
          primaryOnly: false
      },
      CLOISTERED: {
          id: 'CLOISTERED',
          name: 'The Cloistered',
          desireStyle: 'Sheltered curiosity, restrained longing, awakening',
          summary: 'The Cloistered — sheltered and restrained, approaching desire as discovery, awakening slowly through trust, patience, and chosen intimacy.',
          primaryOnly: false
      },
      ROGUE: {
          id: 'ROGUE',
          name: 'The Rogue',
          desireStyle: 'Playful danger, charm, irreverent confidence',
          summary: 'The Rogue — playful and irreverent, using charm and danger to seduce, testing connection through flirtation, risk, and rule-bending confidence.',
          primaryOnly: false
      },
      DANGEROUS: {
          id: 'DANGEROUS',
          name: 'The Dangerous',
          desireStyle: 'Controlled menace, restraint, implied power',
          summary: 'The Dangerous — controlled and restrained, radiating implied power and menace, creating heat through what is held back rather than revealed.',
          primaryOnly: false
      },
      GUARDIAN: {
          id: 'GUARDIAN',
          name: 'The Guardian',
          desireStyle: 'Protection, steadiness, containment',
          summary: 'The Guardian — steady and protective, offering safety as intimacy, building desire through reliability, containment, and earned trust.',
          primaryOnly: false
      },
      SOVEREIGN: {
          id: 'SOVEREIGN',
          name: 'The Sovereign',
          desireStyle: 'Authority, composure, invitation rather than pursuit',
          summary: 'The Sovereign — composed and authoritative, inviting rather than pursuing, framing desire as permission granted, not attention sought.',
          primaryOnly: false
      },
      ENCHANTING: {
          id: 'ENCHANTING',
          name: 'The Enchanting',
          desireStyle: 'Allure, knowing control, magnetic presence',
          summary: 'The Enchanting — magnetic and intentional, wielding allure with knowing control, choosing rather than chasing, shaping desire through presence alone.',
          primaryOnly: false
      },
      DEVOTED: {
          id: 'DEVOTED',
          name: 'The Devoted',
          desireStyle: 'Focused attention, affection, emotional exclusivity',
          summary: 'The Devoted — focused and emotionally exclusive, expressing intensity through presence, loyalty, and the act of choosing again and again.',
          primaryOnly: false
      },
      STRATEGIST: {
          id: 'STRATEGIST',
          name: 'The Strategist',
          desireStyle: 'Anticipation, intelligence, teasing foresight',
          summary: 'The Strategist — intelligent and anticipatory, seducing through foresight and teasing precision, turning desire into a game you want to lose.',
          primaryOnly: false
      },
      BEAUTIFUL_RUIN: {
          id: 'BEAUTIFUL_RUIN',
          name: 'The Beautiful Ruin',
          desireStyle: 'Desire corrupted by distrust; love fractured, tested, and re-bound through choice',
          summary: 'The Beautiful Ruin — desired yet disillusioned, shaped by wounds that make love feel suspect, testing and fracturing bonds until someone chooses them with clear eyes and stays.',
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
      picks:{
        world: 'Modern',      // 4-axis: Story World (single-select)
        tone: 'Earnest',      // 4-axis: Story Tone (single-select)
        genre: 'Billionaire', // 4-axis: Genre/Flavor (single-select)
        dynamic: 'Enemies',   // 4-axis: Relationship Dynamic (single-select)
        era: 'Medieval',      // Historical Era sub-selection (when world=Historical)
        pov: 'First'
      },
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
          bible: { style: "", setting: "", characters: {} },
          // Per-scene visualization budget: sceneBudgets[sceneKey] = { remaining: 2, finalized: false }
          sceneBudgets: {}
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
      if (level === 'Dirty' && window.state.access !== 'sub') { window.showPaywall('sub_only'); return; }
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
      ['payModal', 'vizModal', 'menuOverlay', 'eroticPreviewModal', 'coupleConsentModal', 'coupleInvite', 'strangerModal', 'edgeCovenantModal', 'previewModal', 'gameQuillVetoModal'].forEach(id => {
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
      // PASS 1 FIX: Clear any stuck toasts on screen change
      if (typeof clearToasts === 'function') clearToasts();

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

      // CORRECTIVE PASS FIX 4: Do NOT scroll when entering game screen
      // The game screen uses a fixed book cover page overlay that handles its own viewport.
      // Scrolling to top during the loading transition causes a jarring jump.
      if (id !== 'game') {
          window.scrollTo(0,0);
      }
      _currentScreenId = id;
      updateNavUI();

      // Update DSP visibility based on screen (state-based, not scroll-based)
      if (typeof updateDSPVisibility === 'function') {
          updateDSPVisibility(id);
      }

      // Initialize fate hand system when entering setup screen
      if(id === 'setup') {
          initFateHandSystem();
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
      if (!document._lockedClickBound) {
          document._lockedClickBound = true;
          document.addEventListener('click', (e) => {
              // Allow preview buttons to work even in locked cards
              // Check both the target and all ancestors for .preview-btn
              const previewBtn = e.target.closest('.preview-btn');
              if (previewBtn) {
                  // Explicitly show preview and stop - don't let anything else handle this
                  e.stopPropagation();
                  const previewText = document.getElementById('previewText');
                  const previewModal = document.getElementById('previewModal');
                  if (previewText && previewModal && previewBtn.dataset.txt) {
                      previewText.textContent = previewBtn.dataset.txt;
                      previewModal.classList.remove('hidden');
                  }
                  return;
              }

              const lockedTarget = e.target.closest('.locked, .locked-style, .locked-input, .locked-tease, .locked-pass, [data-locked]');
              if (lockedTarget) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();

                  window.openPaywall('unlock');
              }
          }, true);
      } 

      document.addEventListener('keydown', (e) => {
          if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
              const p = document.getElementById('auth-panel');
              if(p) p.classList.toggle('hidden');
          }
      });
  }

  // --- SAFETY & CONSENT ---
  // PASS 1 FIX: Toast system with proper auto-dismiss and anti-stacking
  let _toastTimer = null;

  function showToast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;

      // Clear any existing toast timer to prevent stacking
      if (_toastTimer) {
          clearTimeout(_toastTimer);
          _toastTimer = null;
      }

      // Set content and show
      t.textContent = msg;
      t.classList.remove('hidden');

      // Reset animation by forcing reflow
      t.style.animation = 'none';
      void t.offsetWidth;
      t.style.animation = 'toastFadeInOut 3s forwards';

      // Explicit hide after animation completes (failsafe)
      _toastTimer = setTimeout(() => {
          t.classList.add('hidden');
          t.style.animation = 'none';
          _toastTimer = null;
      }, 3100);
  }

  // Clear any stuck toasts (call on state changes)
  function clearToasts() {
      const t = document.getElementById('toast');
      if (t) {
          t.classList.add('hidden');
          t.style.animation = 'none';
      }
      if (_toastTimer) {
          clearTimeout(_toastTimer);
          _toastTimer = null;
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
  // PASS 1 FIX: Canonical access resolver - ALL access checks must use this
  function resolveAccess() {
    // Read subscribed status from localStorage (source of truth)
    if (localStorage.getItem('sb_subscribed') === '1') {
        state.subscribed = true;
    }

    // Check billing validity
    const inGrace = (state.billingStatus === 'grace' && Date.now() < state.billingGraceUntil);
    const invalidSub = state.billingStatus === 'canceled' || (state.billingStatus === 'past_due' && !inGrace);

    // Determine access tier (priority order: sub > pass > free)
    if (state.subscribed && !invalidSub) {
        return 'sub';
    }

    if (state.mode === 'couple') {
        const roomAcc = state.roomAccess || 'free';
        return roomAcc;
    }

    if (state.storyId && hasStoryPass(state.storyId)) {
        return 'pass';
    }

    return 'free';
  }

  // PASS 1 FIX: Single function to sync state from canonical resolver
  function syncTierFromAccess() {
    // Resolve access from canonical source
    const resolvedAccess = resolveAccess();

    // Update state
    state.access = resolvedAccess;
    state.tier = (resolvedAccess === 'free') ? 'free' : 'paid';

    console.log('[ENTITLEMENT] syncTierFromAccess:', {
        access: state.access,
        tier: state.tier,
        subscribed: state.subscribed,
        storyId: state.storyId,
        hasPass: state.storyId ? hasStoryPass(state.storyId) : false
    });

    return resolvedAccess;
  }

  window.openPaywall = function(reason) {
      if(typeof window.showPaywall === 'function') {
          window.showPaywall(reason === 'god' ? 'god' : 'sub');
      }
  };

  function currentStoryWordCount(){
    // Get all content across all pages for accurate word count
    const allContent = StoryPagination.getAllContent();
    if (!allContent) return 0;
    // Strip HTML tags and count words
    const txt = allContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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
          // Append ending to current page
          StoryPagination.appendToCurrentPage(div.outerHTML);
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

  // --- FATE HAND SYSTEM (Replaces pill system) ---
  // Suggestion pools for rotating placeholders and fate draws
  const FATE_SUGGESTIONS = {
      ancestry: [
          // Intermixed ~50% fantasy, ~50% real-world
          "Fae", "Celtic", "Half-elf", "Nordic", "Starborn", "Andean",
          "Clockwork", "Levantine", "Night Court", "Korean", "Shadow-born", "Persian",
          "Mer-touched", "Japanese", "Dragon-blooded", "West African", "Storm-caller", "Greek",
          "Dusk Walker", "Mediterranean", "Moon-kissed", "Slavic", "Fire-veined", "Indian",
          "Void-touched", "Pacific Islander", "Iron-blooded", "Southeast Asian", "Sylvan", "Chinese",
          "Dream-walker", "Afro-Caribbean", "Changeling", "Latin American", "Forgotten royal line", "Middle Eastern"
      ],
      veto: [
          "No humiliation", "No betrayal", 'No "M\'Lady"', "No tattoos", "No scars",
          "No cheating", "No amnesia", "No pregnancy", "No ghosts", "No death",
          "No love triangles", "No supernatural", "No time skips", "No flowery language",
          "No second person", "No violence", "No crying scenes", "No miscommunication trope"
      ],
      quill: [
          "Public Bathhouse Setting", "Make it bigger", "Make it a Musical",
          "More tension", "Confession scene", "Jealousy beat", "Stolen glance",
          "Only one bed", "Enemies to lovers", "Forced proximity", "Vulnerability scene",
          "Take them somewhere private", "Build tension slowly", "Unexpected interruption",
          "Moonlit garden", "Charged silence", "Near miss moment", "Secret revealed"
      ],
      visualize: [
          "more muscular", "more elegant", "brighter lighting", "darker mood",
          "cuter", "softer facial features", "strong jawline", "hourglass figure",
          "athletic build", "blonde hair", "dark hair", "natural expression",
          "cinematic lighting", "high detail", "dreamlike", "painterly",
          "leading-actor looks", "movie poster style", "anime style", "photo-realistic"
      ]
  };

  let fateHandInitialized = false;
  let placeholderAnimations = {};

  // Tease mode check
  function isTeaseMode() {
      return state.storyLength === 'voyeur' && state.access === 'free';
  }

  // Get random suggestion from pool
  function getRandomSuggestion(type, exclude = []) {
      const pool = FATE_SUGGESTIONS[type] || [];
      const available = pool.filter(s => !exclude.includes(s));
      if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
      return available[Math.floor(Math.random() * available.length)];
  }

  // Initialize rotating placeholder for a field
  function initRotatingPlaceholder(inputId, type) {
      const input = document.getElementById(inputId);
      const placeholder = document.querySelector(`.rotating-placeholder[data-for="${inputId}"]`);
      if (!input || !placeholder) return;

      const suggestions = FATE_SUGGESTIONS[type] || [];
      if (suggestions.length === 0) return;

      // Build scrolling content (duplicate for seamless loop)
      const buildContent = () => {
          let html = '<span class="rotating-placeholder-inner">';
          // Double the suggestions for seamless scroll
          const doubled = [...suggestions, ...suggestions];
          doubled.forEach((s, i) => {
              const glowClass = Math.random() < 0.1 ? ' glow' : '';
              html += `<span class="suggestion${glowClass}">${s}</span>`;
              if (i < doubled.length - 1) html += '<span class="separator">•</span>';
          });
          html += '</span>';
          return html;
      };

      placeholder.innerHTML = buildContent();

      // Show/hide placeholder based on input content
      const updateVisibility = () => {
          if (input.value.trim()) {
              placeholder.classList.add('hidden');
          } else {
              placeholder.classList.remove('hidden');
          }
      };

      // Pause animation on focus
      input.addEventListener('focus', () => {
          const inner = placeholder.querySelector('.rotating-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'paused';
      });
      input.addEventListener('blur', () => {
          const inner = placeholder.querySelector('.rotating-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'running';
          updateVisibility();
      });
      input.addEventListener('input', updateVisibility);

      updateVisibility();

      // Random glow effect
      setInterval(() => {
          const spans = placeholder.querySelectorAll('.suggestion');
          spans.forEach(s => s.classList.remove('glow'));
          if (spans.length > 0 && Math.random() < 0.3) {
              const randomSpan = spans[Math.floor(Math.random() * spans.length)];
              randomSpan.classList.add('glow');
              setTimeout(() => randomSpan.classList.remove('glow'), 2000);
          }
      }, 4000);
  }

  // Handle fate hand click - reveal card and populate field
  function handleFateHandClick(hand) {
      const targetId = hand.dataset.target;
      const type = hand.dataset.type;
      const input = document.getElementById(targetId);
      const treeCard = document.querySelector(`.fate-tree-card[data-target="${targetId}"]`);

      if (!input || !treeCard) return;

      // TEASE MODE: Quill fate hand triggers paywall
      if (type === 'quill' && isTeaseMode()) {
          if (window.openPaywall) window.openPaywall('unlock');
          return;
      }

      // Get all cards in the hand
      const cards = hand.querySelectorAll('.fate-hand-card');
      const centerCard = cards[2]; // Middle card

      // Flip center card
      centerCard.classList.add('flipping');

      // Fade out other cards
      cards.forEach((card, i) => {
          if (i !== 2) card.classList.add('fading');
      });

      // After flip completes
      setTimeout(() => {
          // Hide the hand, show the tree card
          hand.style.display = 'none';
          treeCard.classList.remove('hidden');

          // Populate the field
          const suggestion = getRandomSuggestion(type);
          if (input.tagName === 'TEXTAREA') {
              input.value = input.value ? input.value + '\n' + suggestion : suggestion;
          } else {
              if (!input.value.trim()) {
                  input.value = suggestion;
              }
          }

          // Hide placeholder
          const placeholder = document.querySelector(`.rotating-placeholder[data-for="${targetId}"]`);
          if (placeholder) placeholder.classList.add('hidden');

          // Initialize leaf state (static, no animation until clicked)
          const leaf = treeCard.querySelector('.falling-leaf');
          if (leaf) {
              leaf.dataset.leafClicks = '0';
          }
      }, 450);
  }

  // Handle tree card click - invoke fate again (two-stage leaf animation)
  function handleTreeCardClick(treeCard) {
      const targetId = treeCard.dataset.target;
      const hand = document.querySelector(`.fate-hand[data-target="${targetId}"]`);
      const input = document.getElementById(targetId);
      const leaf = treeCard.querySelector('.falling-leaf');

      if (!input || !hand) return;

      const type = hand.dataset.type;

      // TEASE MODE: Quill tree card triggers paywall
      if (type === 'quill' && isTeaseMode()) {
          if (window.openPaywall) window.openPaywall('unlock');
          return;
      }

      // Two-stage leaf animation state machine
      if (leaf) {
          const clicks = parseInt(leaf.dataset.leafClicks || '0', 10);

          if (clicks === 0) {
              // First click: animate from mid-air to ground
              leaf.classList.add('leaf-fall-1');
              leaf.dataset.leafClicks = '1';
          } else if (clicks === 1) {
              // Second click: reset to lower branch, then fall to mid-air stop
              leaf.classList.remove('leaf-fall-1');
              leaf.classList.add('leaf-reset-2');
              void leaf.offsetWidth; // Force reflow

              // Brief pause at reset position, then animate
              setTimeout(() => {
                  leaf.classList.remove('leaf-reset-2');
                  leaf.classList.add('leaf-fall-2');
                  leaf.dataset.leafClicks = '2';

                  // After animation completes, set final resting state
                  setTimeout(() => {
                      leaf.classList.remove('leaf-fall-2');
                      leaf.classList.add('leaf-final');
                  }, 1000);
              }, 50);
          }
          // clicks >= 2: ignore further clicks
      }

      // Populate with new suggestion
      const suggestion = getRandomSuggestion(type, [input.value]);
      if (input.tagName === 'TEXTAREA') {
          input.value = input.value ? input.value + '\n' + suggestion : suggestion;
      } else {
          input.value = suggestion;
      }
  }

  // Initialize the entire fate hand system
  function initFateHandSystem() {
      if (fateHandInitialized) return;
      fateHandInitialized = true;

      // Initialize rotating placeholders
      initRotatingPlaceholder('ancestryInputPlayer', 'ancestry');
      initRotatingPlaceholder('ancestryInputLI', 'ancestry');
      initRotatingPlaceholder('vetoInput', 'veto');
      initRotatingPlaceholder('quillInput', 'quill');
      // Game modal rotating placeholders
      initRotatingPlaceholder('gameVetoInput', 'veto');
      initRotatingPlaceholder('gameQuillInput', 'quill');
      // Visualize modifier suggestions
      initRotatingPlaceholder('vizModifierInput', 'visualize');

      // Bind fate hand clicks
      document.querySelectorAll('.fate-hand').forEach(hand => {
          hand.addEventListener('click', () => handleFateHandClick(hand));
      });

      // Bind tree card clicks
      document.querySelectorAll('.fate-tree-card').forEach(card => {
          card.addEventListener('click', () => handleTreeCardClick(card));
      });

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
          banner.innerHTML = `Subscription inactive. <button onclick="window.showPaywall('sub_only')" style="margin-left:10px; background:var(--pink); color:black;">Resume the Affair</button>`;
          banner.style.display = 'block';
      } else {
          banner.style.display = 'none';
      }
  }

  // --- VISUAL HELPERS ---
  async function ensureVisualBible(textContext) {
      // Guard against null/undefined - initialize safe defaults
      if (!state.visual) {
          state.visual = { autoLock: true, locked: false, lastImageUrl: "", bible: { style: "", setting: "", characters: {} } };
      }
      if (!state.visual.bible) {
          state.visual.bible = { style: "", setting: "", characters: {} };
      }
      if (!state.visual.bible.characters || typeof state.visual.bible.characters !== 'object') {
          state.visual.bible.characters = {};
      }
      // Check if bible is already populated
      if (state.visual.bible.style && Object.keys(state.visual.bible.characters).length > 0) return;
      
      const genre = state?.picks?.genre || 'Billionaire';
      const sys = `You are a Visual Director. Extract consistent visual anchors into STRICT JSON with this structure:
{
  "style": "visual style description",
  "setting": "location/environment description",
  "characters": {
    "CharacterName": {
      "face": "detailed facial features (eyes, skin tone, expression style)",
      "hair": "color, length, style",
      "clothing": "current outfit description",
      "build": "body type/physique"
    }
  }
}
Extract details for ALL named characters. Be specific about face, hair, clothing, and build.`;

      try {
          const raw = await Promise.race([
              callChat([{role:'system', content: sys}, {role:'user', content: `Genre: ${genre}. Extract visual anchors from: ${textContext.slice(-2000)}`}]),
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

      // If locked, include specific character details for face/hair/clothing persistence
      if (state.visual.locked) {
          txt += "CHARACTER LOCK ACTIVE - MAINTAIN EXACT APPEARANCE: ";
          if (b.characters && typeof b.characters === 'object') {
              Object.entries(b.characters).forEach(([name, details]) => {
                  if (details && typeof details === 'object') {
                      txt += `${name}: `;
                      if (details.face) txt += `FACE: ${details.face}; `;
                      if (details.hair) txt += `HAIR: ${details.hair}; `;
                      if (details.clothing) txt += `CLOTHING: ${details.clothing}; `;
                      if (details.build) txt += `BUILD: ${details.build}; `;
                  }
              });
          }
          txt += "DO NOT CHANGE CHARACTER APPEARANCE. ";
      }
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

  // FIX: Added paywallMode parameter to support sub_only for Dirty intensity
  function setPaywallClickGuard(el, enabled, paywallMode = 'unlock'){
    if(!el) return;
    if (!el.dataset.paywallBound) {
        el.dataset.paywallBound = "true";
        el.addEventListener('click', (e) => {
            if (el.dataset.paywallActive === "true") {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                // Use element's stored paywall mode (defaults to 'unlock')
                const mode = el.dataset.paywallMode || 'unlock';
                window.showPaywall(mode);
            }
        }, { capture: true });
    }
    el.dataset.paywallActive = enabled ? "true" : "false";
    el.dataset.paywallMode = paywallMode;
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

      // Save button follows paywall rules
      const saveBtn = document.getElementById('saveBtn');
      if(saveBtn) {
          if(couple || paid) saveBtn.classList.remove('locked-style');
          else saveBtn.classList.add('locked-style');
          setPaywallClickGuard(saveBtn, !(couple || paid));
      }

      // Quill & Veto button is ALWAYS unlocked (even in Tease)
      const controlsBtn = document.getElementById('gameControlsBtn');
      if(controlsBtn) {
          controlsBtn.classList.remove('locked-style');
          setPaywallClickGuard(controlsBtn, false);
      }

      if (!couple) {
          applyLengthLocks();
          applyIntensityLocks();
          applyStyleLocks();
      }
  }

  function applyAccessLocks(){ applyTierUI(); }

  // FIX #4: Expose for post-render tier rehydration
  window.applyAccessLocks = applyAccessLocks;
  window.applyTierUI = applyTierUI;

  // PASS 1 FIX: Length locks with strict enforcement
  function applyLengthLocks(){
    // Always resolve access first
    syncTierFromAccess();

    const section = document.getElementById('lengthSection');
    if(section) section.classList.toggle('hidden', state.turnCount > 0);

    const cards = document.querySelectorAll('#lengthGrid .card[data-grp="length"]');

    console.log('[ENTITLEMENT] applyLengthLocks:', {
        access: state.access,
        currentStoryLength: state.storyLength,
        cardsFound: cards.length
    });

    cards.forEach(card => {
      const val = card.dataset.val;
      let locked = true;  // Default: locked
      let hidden = false;

      // ENTITLEMENT RULES (LOCKED):
      // - free: only voyeur unlocked
      // - pass ($3): only fling unlocked (NOT affair, NOT soulmates)
      // - sub: fling, affair, soulmates unlocked

      if (state.access === 'free' && val === 'voyeur') {
          locked = false;
      } else if (state.access === 'pass') {
          // CRITICAL: Pass ONLY unlocks Fling
          if (val === 'fling') locked = false;
          // affair and soulmates stay locked = true
      } else if (state.access === 'sub') {
          // Sub unlocks fling, affair, soulmates
          if (['fling', 'affair', 'soulmates'].includes(val)) locked = false;
      }

      // Hide voyeur for paid users
      if (state.access !== 'free' && val === 'voyeur') {
          locked = true;
          hidden = true;
      }

      // Apply classes
      card.classList.toggle('locked', locked);
      card.style.display = hidden ? 'none' : '';

      // CRITICAL FIX: Remove data-locked attribute when unlocked (CSS targets [data-locked])
      if (locked) {
          // Keep or set data-locked attribute for CSS styling
          if (!card.dataset.locked) {
              card.dataset.locked = (val === 'fling') ? 'pass' : 'sub';
          }
      } else {
          // Remove attribute so CSS [data-locked] selector doesn't apply
          card.removeAttribute('data-locked');
      }

      // Set paywall mode: affair/soulmates require sub_only
      const paywallMode = ['affair', 'soulmates'].includes(val) ? 'sub_only' : 'unlock';
      setPaywallClickGuard(card, locked, paywallMode);

      // Selection state
      card.classList.toggle('selected', val === state.storyLength);

      console.log('[ENTITLEMENT] Card:', val, 'locked:', locked, 'hidden:', hidden);
    });

    // ENFORCEMENT: If pass user somehow has affair/soulmates selected, downgrade
    if (state.access === 'pass' && ['affair', 'soulmates'].includes(state.storyLength)) {
        console.log('[ENTITLEMENT] Downgrading story length from', state.storyLength, 'to fling');
        state.storyLength = 'fling';
    }

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
          // CRITICAL FIX: Remove preset locked-tease/locked-pass classes when unlocked
          if (!locked) {
              btn.classList.remove('locked-tease', 'locked-pass');
          }
          if(locked) btn.classList.remove('active');
          // FIX: Dirty always requires subscription - use sub_only mode
          const paywallMode = (level === 'Dirty') ? 'sub_only' : 'unlock';
          setPaywallClickGuard(btn, locked, paywallMode);
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
          // CRITICAL FIX: Remove data-locked attribute when unlocked
          if (locked) {
              if (!card.dataset.locked) card.dataset.locked = 'true';
          } else {
              card.removeAttribute('data-locked');
          }
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
          if(level === 'Dirty' && state.access !== 'sub'){ window.showPaywall('sub_only'); return; }
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
    // LOGIC FIX: Show $3 Story Pass alongside $6 Subscribe for most paywall triggers
    // Hide unlock ONLY if: user already has pass, is subscribed, or mode is 'sub_only' (true sub-required features)
    const hideUnlock = (mode === 'sub_only') || state.subscribed || hasPassNow;
    const optUnlock = document.getElementById('optUnlock');
    if(optUnlock) optUnlock.classList.toggle('hidden', !!hideUnlock);

    pm.classList.remove('hidden');
  };

  // PASS 1 FIX: Refactored completePurchase with canonical access resolution
  function completePurchase() {
      // Clear any stuck toasts first
      clearToasts();

      const pm = document.getElementById('payModal');
      if (pm) pm.classList.add('hidden');

      const purchaseType = state.lastPurchaseType;
      const previousAccess = state.access;

      console.log('[ENTITLEMENT] completePurchase START:', {
          purchaseType,
          previousAccess,
          storyLength: state.storyLength,
          storyId: state.storyId
      });

      // Persist subscription if this was a subscription purchase
      if (state.pendingUpgradeToAffair || purchaseType === 'sub') {
          state.subscribed = true;
          localStorage.setItem('sb_subscribed', '1');
          console.log('[ENTITLEMENT] Subscription persisted to localStorage');
      }

      // Resolve access from canonical source (reads from localStorage)
      const newAccess = syncTierFromAccess();

      console.log('[ENTITLEMENT] Access resolved:', {
          previousAccess,
          newAccess,
          tier: state.tier
      });

      // Determine story length upgrades based on purchase type
      let upgraded = false;
      let toastMessage = null;

      // RULE: Storypass $3 upgrades ONLY to Fling (never Affair/Soulmates)
      if (purchaseType === 'pass' && newAccess === 'pass') {
          if (state.storyLength === 'voyeur') {
              state.storyLength = 'fling';
              upgraded = true;
              toastMessage = "Story expanded to Fling.";
          }
          // Pass users CANNOT access Affair or Soulmates - enforce this
          if (['affair', 'soulmates'].includes(state.storyLength)) {
              state.storyLength = 'fling';
              console.log('[ENTITLEMENT] Downgraded story length to Fling (pass cannot access affair/soulmates)');
          }
      }

      // RULE: Subscription can upgrade to Affair
      if (purchaseType === 'sub' && newAccess === 'sub') {
          if (['fling', 'voyeur'].includes(state.storyLength)) {
              state.storyLength = 'affair';
              upgraded = true;
              toastMessage = "Story upgraded to Affair.";
          }
      }

      if (upgraded) {
          state.storyEnded = false;
      }

      // Clear purchase state
      state.lastPurchaseType = null;
      state.pendingUpgradeToAffair = false;

      // CRITICAL: Apply all lock states AFTER access is resolved
      console.log('[ENTITLEMENT] Applying UI locks with access:', state.access);

      // Apply locks to all systems
      if (typeof applyLengthLocks === 'function') applyLengthLocks();
      if (typeof applyIntensityLocks === 'function') applyIntensityLocks();
      if (typeof applyStyleLocks === 'function') applyStyleLocks();
      if (typeof applyTierUI === 'function') applyTierUI();

      // CRITICAL FIX: Update Quill UI on both setup and game screens
      if (typeof updateQuillUI === 'function') updateQuillUI();
      if (typeof updateGameQuillUI === 'function') updateGameQuillUI();

      // Reinitialize cards if function exists
      if (window.initCards) window.initCards();

      // Save state
      saveStorySnapshot();

      // Only show toast if access actually changed
      if (toastMessage && newAccess !== previousAccess) {
          showToast(toastMessage);
      } else if (newAccess !== 'free' && previousAccess === 'free') {
          showToast("Content unlocked.");
      }

      // Navigate based on context
      if (state.purchaseContext === 'tierGate') {
          window.showScreen('modeSelect');
      }

      console.log('[ENTITLEMENT] completePurchase END:', {
          access: state.access,
          storyLength: state.storyLength,
          upgraded
      });
  }

  function renderFlingEnd() {
      const div = document.createElement('div');
      div.className = 'box';
      div.style.textAlign = 'center';
      div.style.border = '1px solid var(--pink)';
      div.innerHTML = `<h3 style="color:var(--pink)">Not finished.</h3><p>A Fling burns hot and leaves a mark. But an Affair lingers.</p><button onclick="window.upgradeFlingToAffair()" style="background:var(--pink); color:black; font-weight:bold; margin-top:10px;">Make it an Affair</button>`;
      // Append fling ending to current page
      StoryPagination.appendToCurrentPage(div.outerHTML);
  }

  window.upgradeFlingToAffair = function() {
      state.pendingUpgradeToAffair = true;
      state.lastPurchaseType = 'sub';
      if(state.access === 'sub') {
          completePurchase(); // Already subbed, just process upgrade
      } else {
          window.showPaywall('sub_only'); // Affair requires subscription
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
  // CORRECTIVE: IndexedDB for large story data when localStorage fails
  const STORY_DB_NAME = 'StoryBoundDB';
  const STORY_DB_VERSION = 1;
  const STORY_STORE_NAME = 'stories';

  function openStoryDB() {
      return new Promise((resolve, reject) => {
          if (!window.indexedDB) {
              reject(new Error('IndexedDB not supported'));
              return;
          }
          const request = indexedDB.open(STORY_DB_NAME, STORY_DB_VERSION);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          request.onupgradeneeded = (event) => {
              const db = event.target.result;
              if (!db.objectStoreNames.contains(STORY_STORE_NAME)) {
                  db.createObjectStore(STORY_STORE_NAME, { keyPath: 'id' });
              }
          };
      });
  }

  async function saveToIndexedDB(snapshot) {
      try {
          const db = await openStoryDB();
          const tx = db.transaction(STORY_STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORY_STORE_NAME);
          await new Promise((resolve, reject) => {
              const req = store.put({ id: 'current_story', ...snapshot });
              req.onsuccess = resolve;
              req.onerror = () => reject(req.error);
          });
          db.close();
          localStorage.setItem('sb_story_in_idb', '1');
          return true;
      } catch (e) {
          console.error('IndexedDB save failed', e);
          return false;
      }
  }

  async function loadFromIndexedDB() {
      try {
          const db = await openStoryDB();
          const tx = db.transaction(STORY_STORE_NAME, 'readonly');
          const store = tx.objectStore(STORY_STORE_NAME);
          const data = await new Promise((resolve, reject) => {
              const req = store.get('current_story');
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
          });
          db.close();
          return data;
      } catch (e) {
          console.error('IndexedDB load failed', e);
          return null;
      }
  }

  function hasSavedStory() {
      return !!localStorage.getItem('sb_saved_story') || localStorage.getItem('sb_story_in_idb') === '1';
  }

  function saveStorySnapshot(){
    const el = document.getElementById('storyText');
    if(!el) return;
    const currentWc = currentStoryWordCount();
    if (currentWc > state.lastSavedWordCount) {
        const globalWc = Number(localStorage.getItem('sb_global_word_count') || 0);
        try {
            localStorage.setItem('sb_global_word_count', globalWc + (currentWc - state.lastSavedWordCount));
        } catch(e) { console.warn('Word count save failed', e); }
        state.lastSavedWordCount = currentWc;
    }
    // Create clean state snapshot without heavy data
    const cleanState = { ...state };
    // Prevent storing large visual bible data that causes QuotaExceededError
    if (cleanState.visual) {
        cleanState.visual = {
            ...cleanState.visual,
            lastImageUrl: '', // Don't persist images
            bible: { style: cleanState.visual.bible?.style || '', setting: cleanState.visual.bible?.setting || '', characters: {} }
        };
    }
    // CORRECTIVE: Remove sysPrompt from state snapshot (it's stored separately)
    delete cleanState.sysPrompt;

    const snapshot = {
      storyId: state.storyId,
      subscribed: !!state.subscribed,
      tier: state.tier,
      sysPrompt: state.sysPrompt,
      title: document.getElementById('storyTitle')?.textContent || '',
      synopsis: document.getElementById('storySynopsis')?.textContent || '',
      storyHTML: StoryPagination.getAllContent(),  // Full content for fallback
      storyPages: StoryPagination.getPages(),       // Individual pages for pagination
      stateSnapshot: cleanState
    };

    // CORRECTIVE: Try localStorage first, fall back to IndexedDB on quota error
    try {
        // Remove old data first to free space
        localStorage.removeItem('sb_saved_story');
        localStorage.removeItem('sb_story_in_idb');
        localStorage.setItem('sb_saved_story', JSON.stringify(snapshot));
    } catch(e) {
        // QuotaExceededError - try IndexedDB
        console.warn('localStorage quota exceeded, trying IndexedDB...', e);
        try {
            localStorage.removeItem(SB_ANALYTICS_KEY); // Free space
            localStorage.removeItem('sb_saved_story');
        } catch(e2) { /* ignore */ }

        // Save to IndexedDB asynchronously
        saveToIndexedDB(snapshot).then(success => {
            if (success) {
                console.log('Story saved to IndexedDB');
            } else {
                showToast('Save failed. Storage full.');
            }
        });
    }
    updateContinueButtons();
  }

  // CORRECTIVE: Load story data from localStorage or IndexedDB
  async function loadStoryData() {
      // Try localStorage first
      const raw = localStorage.getItem('sb_saved_story');
      if (raw) {
          try {
              return JSON.parse(raw);
          } catch (e) {
              console.warn('Failed to parse localStorage story', e);
          }
      }
      // Try IndexedDB if localStorage failed
      if (localStorage.getItem('sb_story_in_idb') === '1') {
          const idbData = await loadFromIndexedDB();
          if (idbData) return idbData;
      }
      return null;
  }

  window.continueStory = async function(){
    const data = await loadStoryData();
    if (!data) {
        showToast('No saved story found.');
        return;
    }

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

    // Load story into pagination system
    StoryPagination.clear();
    if (data.storyPages && Array.isArray(data.storyPages) && data.storyPages.length > 0) {
        // Load saved pages
        StoryPagination.setPages(data.storyPages);
    } else if (data.storyHTML) {
        // Fallback: load as single page
        StoryPagination.addPage(data.storyHTML, true);
    }
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
    // Clear pagination system
    StoryPagination.clear();
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

  // Story Controls button - toggle Quill & Veto modal (always opens, Quill locked in Tease)
  $('gameControlsBtn')?.addEventListener('click', (e) => {
      // Clear inputs for new entries (committed entries are shown separately)
      const quillInput = document.getElementById('gameQuillInput');
      const vetoInput = document.getElementById('gameVetoInput');
      if (quillInput) quillInput.value = '';
      if (vetoInput) vetoInput.value = '';

      // CORRECTIVE: Render committed veto phrases in game modal
      const gameVetoCommitted = document.getElementById('gameVetoCommitted');
      if (gameVetoCommitted && state.committedVeto) {
          gameVetoCommitted.innerHTML = '';
          state.committedVeto.forEach((text, i) => {
              const phrase = document.createElement('div');
              phrase.className = 'committed-phrase veto-phrase';
              phrase.style.cssText = 'background:rgba(255,100,100,0.15); border:1px solid rgba(255,100,100,0.3); padding:4px 8px; margin:4px 0; border-radius:4px; font-size:0.85em;';
              phrase.innerHTML = `<span style="color:var(--pink);">${text}</span>`;
              gameVetoCommitted.appendChild(phrase);
          });
      }

      updateGameQuillUI();
      document.getElementById('gameQuillVetoModal')?.classList.remove('hidden');
  });

  // Game Quill commit button
  $('btnGameCommitQuill')?.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent scroll to top
      e.stopPropagation();

      // Save scroll position before any DOM changes
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (!getQuillReady()) return;
      const quillEl = document.getElementById('gameQuillInput');
      if (!quillEl) return;
      const quillText = quillEl.value.trim();
      if (!quillText) { showToast("No Quill edit to commit."); return; }

      // Also apply any pending veto constraints from game modal
      applyGameVetoFromInput();

      window.state.quillIntent = quillText;
      if (quillText) {
          const quillHtml = `<div class="quill-intervention" style="color:var(--gold); font-style:italic; border-left:3px solid var(--gold); padding-left:12px; margin:15px 0;">${formatStory(quillText)}</div>`;
          StoryPagination.appendToCurrentPage(quillHtml);
      }
      window.state.quillCommittedThisTurn = true;
      window.state.quill.uses++;
      window.state.quill.nextReadyAtWords = currentStoryWordCount() + computeNextCooldownWords();
      quillEl.value = '';
      updateQuillUI();
      updateGameQuillUI();
      document.getElementById('gameQuillVetoModal')?.classList.add('hidden');
      showToast("Quill committed.");

      // Restore scroll position after all DOM changes
      requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
      });
  });

  // Game Veto commit button
  $('btnGameCommitVeto')?.addEventListener('click', () => {
      const vetoEl = document.getElementById('gameVetoInput');
      if (!vetoEl) return;
      const vetoText = vetoEl.value.trim();
      if (!vetoText) { showToast("No Veto rules to commit."); return; }

      applyGameVetoFromInput();
      vetoEl.value = '';
      document.getElementById('gameQuillVetoModal')?.classList.add('hidden');
      showToast("Veto committed. Boundaries updated.");
  });

  function updateGameQuillUI() {
      const btn = document.getElementById('btnGameCommitQuill');
      const status = document.getElementById('gameQuillStatus');
      const quillBox = document.getElementById('gameQuillBox');
      const quillSection = quillBox?.closest('.qv-section');
      if (!btn || !status) return;

      // TEASE MODE: Lock entire Quill section
      if (isTeaseMode()) {
          status.textContent = "Quill: Locked (Upgrade to unlock)";
          btn.disabled = true;
          btn.style.opacity = '0.5';
          btn.textContent = "Commit Quill";
          if (quillBox) quillBox.classList.add('locked-input');
          if (quillSection) quillSection.style.opacity = '0.5';
          // Add click handler for paywall on quill section
          if (quillBox && !quillBox.dataset.paywallBound) {
              quillBox.dataset.paywallBound = '1';
              quillBox.addEventListener('click', () => {
                  if (isTeaseMode() && window.openPaywall) window.openPaywall('unlock');
              });
          }
          return;
      }

      // Paid users: normal Quill logic
      if (quillSection) quillSection.style.opacity = '1';
      // CRITICAL FIX: Ensure paywall click guard is disabled for paid users
      if (quillBox) {
          quillBox.dataset.paywallActive = 'false';
      }

      const ready = getQuillReady();
      const needed = state.quill.nextReadyAtWords;
      const wc = currentStoryWordCount();
      const remain = Math.max(0, needed - wc);

      if (ready || state.godModeActive) {
          status.textContent = state.authorChairActive ? "Quill: Poised" : "Quill: Poised";
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.textContent = state.godModeActive ? "Commit Quill (God Mode)" : "Commit Quill";
          if (quillBox) quillBox.classList.remove('locked-input');
      } else {
          status.textContent = `Quill: Spent (${remain} words to recharge)`;
          btn.disabled = true;
          btn.style.opacity = '0.5';
          if (quillBox) quillBox.classList.add('locked-input');
      }
  }

  function applyGameVetoFromInput() {
      const vetoEl = document.getElementById('gameVetoInput');
      if (!vetoEl) return;
      const txt = vetoEl.value.trim();
      if (!txt) return;
      // Parse and add to veto state (same as setup veto)
      txt.split('\n').forEach(line => {
          line = line.trim();
          if (!line) return;
          if (line.toLowerCase().startsWith('ban:')) {
              const word = line.slice(4).trim();
              if (word && !state.veto.bannedWords.includes(word)) state.veto.bannedWords.push(word);
          } else if (line.toLowerCase().startsWith('rename:')) {
              const parts = line.slice(7).split('->').map(s => s.trim());
              if (parts.length === 2 && parts[0] && parts[1]) {
                  state.veto.corrections.push({ from: parts[0], to: parts[1] });
              }
          } else {
              if (!state.veto.excluded.includes(line)) state.veto.excluded.push(line);
          }
      });
      vetoEl.value = '';
  }

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

  $('btnIndulge')?.addEventListener('click', () => window.showPaywall('sub_only'));

  document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      $('previewText').textContent = btn.dataset.txt || '';
      document.getElementById('previewModal').classList.remove('hidden');
    });
  });

  function initSelectionHandlers(){
    state.safety = state.safety || { mode:'balanced', darkThemes:true, nonConImplied:false, violence:true, boundaries:["No sexual violence"] };

    // Initialize default dynamic (single-select in 4-axis system)
    if (!state.picks.dynamic) {
        state.picks.dynamic = 'Enemies';
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

    // Single-select axes for 4-axis system
    const SINGLE_SELECT_AXES = ['world', 'tone', 'genre', 'dynamic', 'era', 'pov'];

    document.querySelectorAll('.card[data-grp]').forEach(card => {
      if(card.dataset.bound === '1') return;
      card.dataset.bound = '1';
      card.addEventListener('click', (e) => {
        if(e.target.closest('.preview-btn')) return;
        const grp = card.dataset.grp;
        const val = card.dataset.val;
        if(!grp || !val || grp === 'length') return;

        if(card.classList.contains('locked')) { window.showPaywall('unlock'); return; }

        // 4-axis system: world, tone, genre, dynamic, era, pov are all single-select
        if (SINGLE_SELECT_AXES.includes(grp)) {
          state.picks[grp] = val;
          document.querySelectorAll(`.card[data-grp="${grp}"]`).forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');

          // Special handling: show/hide Era sub-selection when World changes
          if (grp === 'world') {
            updateEraVisibility(val);
          }

          // Update floating synopsis panel
          updateSynopsisPanel();
          return;
        }

        // Legacy multi-select handling (if any remain)
        if(!state.picks[grp]) state.picks[grp] = [];
        const arr = state.picks[grp];
        const idx = arr.indexOf(val);
        if(idx >= 0) { arr.splice(idx, 1); card.classList.remove('selected'); }
        else { if(arr.length >= 3) return alert("Select up to 3 only."); arr.push(val); card.classList.add('selected'); }
      });
    });

    // Initialize Era visibility based on initial world selection
    updateEraVisibility(state.picks.world);
    // Initialize synopsis panel
    updateSynopsisPanel();

    // Initialize Archetype System
    initArchetypeUI();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERA VISIBILITY - Show/hide Historical Era selection
  // ═══════════════════════════════════════════════════════════════════
  function updateEraVisibility(worldValue) {
    const eraSection = document.getElementById('eraSelection');
    if (!eraSection) return;

    if (worldValue === 'Historical') {
      eraSection.classList.remove('hidden');
    } else {
      eraSection.classList.add('hidden');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SYNOPSIS PANEL - Live-updating story preview based on 4-axis selections
  // ═══════════════════════════════════════════════════════════════════
  //
  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║                    LOCKED DESIGN RULES                            ║
  // ║                                                                   ║
  // ║ 1. The floating synopsis panel must remain visually restrained   ║
  // ║    and literary. No glassmorphism, glow effects, or color-coded  ║
  // ║    highlighting. It should feel like an authorial whisper.       ║
  // ║                                                                   ║
  // ║ 2. Genres must describe narrative action or fantasy, not setting ║
  // ║    or life stage. "Sports", "College", "Small Town" are not      ║
  // ║    genres—they are world modifiers.                              ║
  // ║                                                                   ║
  // ║ 3. Relationship Dynamics are single-select and represent         ║
  // ║    emotional structure, not identity. They describe how          ║
  // ║    characters relate, not who they are.                          ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  //
  // ═══════════════════════════════════════════════════════════════════
  // DSP TONE-BASED GENERATORS (TONE SUPREMACY)
  // Tone controls the entire sentence voice, not just one fragment.
  // When tone changes, the entire DSP sentence rewrites in that voice.
  // ═══════════════════════════════════════════════════════════════════
  const DSP_WORLD_SETTINGS = {
    Modern: 'a world of ambition and buried secrets',
    Historical: 'an age bound by unforgiving rules',
    Dystopia: 'a broken world that demands sacrifice',
    PostApocalyptic: 'the ashes of what came before',
    Fantasy: 'a realm where magic breathes in shadow',
    SciFi: 'a frontier where stars hold both promise and peril',
    Supernatural: 'a place where the veil between worlds runs thin',
    Superheroic: 'a world where power demands impossible choices'
  };

  const DSP_GENRE_CONFLICTS = {
    CrimeSyndicate: 'blood oaths and betrayal',
    Billionaire: 'games only the powerful understand',
    Noir: 'shadows where no one walks clean',
    Heist: 'a plan you must trust completely',
    Espionage: 'secrets that could kill',
    Political: 'a web of dangerous alliances'
  };

  const DSP_DYNAMIC_ENGINES = {
    Forbidden: 'desire what you cannot have',
    Dangerous: 'want the one who could destroy you',
    Fated: 'fight what was always meant to be',
    Partners: 'trust only each other',
    Enemies: 'need the one who stands against you',
    Friends: 'cross a line you cannot uncross',
    Proximity: 'share space with the one you cannot escape',
    SecretIdentity: 'fall for who they pretend to be',
    Obsessive: 'become the center of someone\'s world',
    Caretaker: 'let someone see your wounds',
    SecondChance: 'reopen a door you thought was closed'
  };

  // TONE GENERATORS: Each produces a complete sentence in that tone's voice
  const DSP_TONE_GENERATORS = {
    Earnest: ({ world, genre, dynamic }) =>
      `In ${world}, you are drawn into ${genre}—and you will ${dynamic}.`,

    WryConfession: ({ world, genre, dynamic }) =>
      `So here you are, in ${world}, tangled up in ${genre}. And somehow, against all judgment, you ${dynamic}.`,

    Satirical: ({ world, genre, dynamic }) =>
      `Welcome to ${world}, where ${genre} is already a mess—and you've agreed to make it worse by deciding to ${dynamic}.`,

    Dark: ({ world, genre, dynamic }) =>
      `In ${world}, ${genre} waits in every shadow. You will ${dynamic}, no matter what it costs.`,

    Horror: ({ world, genre, dynamic }) =>
      `Something waits in ${world}. It wears the face of ${genre}. And it knows you will ${dynamic}.`,

    Mythic: ({ world, genre, dynamic }) =>
      `Fate calls you to ${world}, where ${genre} shapes the path of heroes—and you must ${dynamic}.`,

    Comedic: ({ world, genre, dynamic }) =>
      `Look, ${world} seemed like a good idea at the time. Now there's ${genre}, and apparently you're going to ${dynamic}. Good luck with that.`,

    Surreal: ({ world, genre, dynamic }) =>
      `${world} bends at the edges. ${genre} tastes like something half-remembered. You ${dynamic}, or perhaps you always have.`,

    Poetic: ({ world, genre, dynamic }) =>
      `Beneath the long shadow of ${world}, your fate drifts toward ${genre}—and love, the need to ${dynamic}, moves like a quiet inevitability.`
  };

  function generateDSPSentence(world, tone, genre, dynamic) {
    const worldText = DSP_WORLD_SETTINGS[world] || DSP_WORLD_SETTINGS.Modern;
    const genreText = DSP_GENRE_CONFLICTS[genre] || DSP_GENRE_CONFLICTS.Billionaire;
    const dynamicText = DSP_DYNAMIC_ENGINES[dynamic] || DSP_DYNAMIC_ENGINES.Enemies;

    const generator = DSP_TONE_GENERATORS[tone] || DSP_TONE_GENERATORS.Earnest;
    return generator({ world: worldText, genre: genreText, dynamic: dynamicText });
  }

  function updateSynopsisPanel() {
    const synopsisText = document.getElementById('synopsisText');
    if (!synopsisText) return;

    // Get current selections
    const world = state.picks.world || 'Modern';
    const tone = state.picks.tone || 'Earnest';
    const genre = state.picks.genre || 'Billionaire';
    const dynamic = state.picks.dynamic || 'Enemies';

    // Generate holistic sentence based on tone
    const newSentence = generateDSPSentence(world, tone, genre, dynamic);

    // Update with animation if content changed
    if (synopsisText.textContent !== newSentence) {
      synopsisText.classList.add('updating');
      synopsisText.textContent = newSentence;
      setTimeout(() => synopsisText.classList.remove('updating'), 500);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // DSP VISIBILITY LIFECYCLE (STATE-BASED)
  // DSP is visible throughout the four-axis configuration (World → Tone
  // → Genre → Dynamic). It disappears only after Begin Story is clicked.
  // Visibility is tied to screen state, not scroll position.
  // ═══════════════════════════════════════════════════════════════════
  function showDSP() {
    const synopsisPanel = document.getElementById('synopsisPanel');
    if (synopsisPanel && window.innerWidth > 1100) {
      synopsisPanel.classList.add('visible');
    }
  }

  function hideDSP() {
    const synopsisPanel = document.getElementById('synopsisPanel');
    if (synopsisPanel) {
      synopsisPanel.classList.remove('visible');
    }
  }

  // DSP shows when user is configuring story (setup screen)
  function updateDSPVisibility(screenId) {
    if (screenId === 'setup') {
      showDSP();
    } else {
      hideDSP();
    }
  }

  // Expose for external calls
  window.showDSP = showDSP;
  window.hideDSP = hideDSP;
  window.updateDSPVisibility = updateDSPVisibility;

  // Legacy function name for compatibility
  function initSynopsisPanelScrollBehavior() {
    // Now state-based, not scroll-based
    // DSP visibility controlled by updateDSPVisibility(screenId)
    updateDSPVisibility(_currentScreenId);
  }
  window.initSynopsisPanelScrollBehavior = initSynopsisPanelScrollBehavior;

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
  let _loadingCancelled = false;
  let _loadingCancelCallback = null;
  let _lastSettingShotDesc = '';

  const STORY_LOADING_MESSAGES = [
      // Required phrases
      "Crafting each individual snowflake...",
      "Setting traps...",
      "Naming the animals...",
      "Manifesting drama...",
      "Cleaning up double entendres...",
      "Darkening the past...",
      "Amping the feels...",
      // Additional playful, literary, worldbuilding phrases
      "Weaving backstories...",
      "Polishing the silver tongues...",
      "Hiding secrets in the walls...",
      "Brewing chemistry...",
      "Sharpening the wit...",
      "Planting red herrings...",
      "Tuning the heartstrings...",
      "Scheduling the rain...",
      "Lighting the candles...",
      "Rehearsing the longing glances...",
      "Aging the whiskey...",
      "Pressing the silk sheets...",
      "Whispering rumors...",
      "Composing the tension...",
      "Perfecting the timing...",
      "Casting shadows...",
      "Stoking the slow burn...",
      "Arranging the flowers...",
      "Calibrating the chemistry..."
  ];

  const VISUALIZE_LOADING_MESSAGES = [
      "Painting the scene...",
      "Saying it with his eyes...",
      "Letting the silence linger...",
      "Adding longing...",
      "Shaping the moment...",
      "Tracing the tension...",
      "Capturing the unspoken...",
      "Finding the perfect light...",
      "Catching the glance...",
      "Softening the shadows...",
      "Framing the desire...",
      "Holding the gaze...",
      "Rendering the warmth...",
      "Sculpting the posture...",
      "Brushing the highlights...",
      "Etching the atmosphere...",
      "Composing the stillness...",
      "Illuminating the moment..."
  ];

  function startLoading(msg, messageList = null, cancellable = false, onCancel = null){
    const overlay = document.getElementById('loadingOverlay');
    const fill = document.getElementById('loadingOverlayFill');
    const textEl = document.getElementById('loadingText');
    const percentEl = document.getElementById('loadingPercent');
    const cancelBtn = document.getElementById('loadingCancelBtn');

    if (textEl) textEl.textContent = msg || "Loading...";
    if (percentEl) percentEl.textContent = '0%';

    _loadingActive = true;
    _loadingCancelled = false;
    _loadingCancelCallback = onCancel;

    if(fill) fill.style.width = '0%';
    if(overlay) overlay.classList.remove('hidden');

    // Show/hide cancel button based on cancellable flag
    if (cancelBtn) {
        if (cancellable) {
            cancelBtn.classList.add('visible');
        } else {
            cancelBtn.classList.remove('visible');
        }
    }

    if(_loadingTimer) clearInterval(_loadingTimer);
    if(_loadingMsgTimer) clearInterval(_loadingMsgTimer);

    let p = 0;
    _loadingTimer = setInterval(() => {
      if(!_loadingActive || _loadingCancelled) return;
      p = Math.min(91, p + Math.random() * 6);
      if(fill) fill.style.width = p.toFixed(0) + '%';
      if(percentEl) percentEl.textContent = p.toFixed(0) + '%';
    }, 250);

    // Rotate messages if a message list is provided
    if (messageList && Array.isArray(messageList) && messageList.length > 0 && textEl) {
        // Shuffle the list for random order, no repeats until cycle completes
        const shuffled = [...messageList].sort(() => Math.random() - 0.5);
        let msgIdx = 0;

        // PART C: Crossfade transition for loading phrases
        // Fade duration: 300ms out + 300ms in
        const fadeDuration = 300;
        textEl.style.transition = `opacity ${fadeDuration}ms ease-in-out`;

        _loadingMsgTimer = setInterval(() => {
            if (!_loadingActive || _loadingCancelled) return;
            msgIdx = (msgIdx + 1) % shuffled.length;

            // Fade out
            textEl.style.opacity = '0';

            // Swap text at opacity 0, then fade in
            setTimeout(() => {
                if (!_loadingActive || _loadingCancelled) return;
                textEl.textContent = shuffled[msgIdx];
                textEl.style.opacity = '1';
            }, fadeDuration);
        }, 3200); // 3.2s cadence for slower, more readable rotation
    }
  }

  function cancelLoading() {
    _loadingCancelled = true;
    if (_loadingCancelCallback) {
        _loadingCancelCallback();
        _loadingCancelCallback = null;
    }
    stopLoading();
  }

  function isLoadingCancelled() {
    return _loadingCancelled;
  }

  /**
   * Update the loading message during an active loading state.
   * Used by orchestration to show phase-specific messages.
   */
  function updateLoadingMessage(msg) {
    if (!_loadingActive) return;
    const textEl = document.getElementById('loadingText');
    if (textEl) {
      // Fade transition
      textEl.style.opacity = '0';
      setTimeout(() => {
        textEl.textContent = msg;
        textEl.style.opacity = '1';
      }, 200);
    }
  }

  function stopLoading(){
    if(!_loadingActive) return;
    _loadingActive = false;
    const overlay = document.getElementById('loadingOverlay');
    const fill = document.getElementById('loadingOverlayFill');
    const percentEl = document.getElementById('loadingPercent');
    const cancelBtn = document.getElementById('loadingCancelBtn');
    const textEl = document.getElementById('loadingText');

    if(_loadingTimer) { clearInterval(_loadingTimer); _loadingTimer = null; }
    if(_loadingMsgTimer) { clearInterval(_loadingMsgTimer); _loadingMsgTimer = null; }
    if(fill) fill.style.width = '100%';
    if(percentEl) percentEl.textContent = '100%';
    if(cancelBtn) cancelBtn.classList.remove('visible');

    // Reset text opacity for next loading cycle
    if(textEl) {
        textEl.style.transition = 'none';
        textEl.style.opacity = '1';
    }

    setTimeout(() => {
      if(overlay) overlay.classList.add('hidden');
      if(fill) fill.style.width = '0%';
      if(percentEl) percentEl.textContent = '0%';
    }, 120);
  }

  // Bind cancel button
  document.getElementById('loadingCancelBtn')?.addEventListener('click', cancelLoading);

  // PASS 1 FIX: Storypass purchase - grants Fling tier ONLY
  $('payOneTime')?.addEventListener('click', () => {
    console.log('[ENTITLEMENT] Storypass $3 purchase initiated');

    // Ensure we have a story ID
    state.storyId = state.storyId || makeStoryId();

    // Mark purchase type BEFORE granting pass
    state.lastPurchaseType = 'pass';

    // Grant the story pass (stores in localStorage)
    grantStoryPass(state.storyId);

    console.log('[ENTITLEMENT] Story pass granted:', {
        storyId: state.storyId,
        hasPass: hasStoryPass(state.storyId)
    });

    // Complete purchase - will resolve access from localStorage
    completePurchase();
  });

  // PASS 1 FIX: Subscription purchase - grants full access
  $('paySub')?.addEventListener('click', () => {
    console.log('[ENTITLEMENT] Subscribe purchase initiated');

    // Mark purchase type
    state.lastPurchaseType = 'sub';

    // Persist subscription to localStorage (source of truth)
    state.subscribed = true;
    localStorage.setItem('sb_subscribed', '1');

    console.log('[ENTITLEMENT] Subscription stored in localStorage');

    // Complete purchase - will resolve access from localStorage
    completePurchase();
  });

  $('payGodMode')?.addEventListener('click', () => {
      localStorage.setItem('sb_god_mode_owned', '1');
      document.getElementById('payModal')?.classList.add('hidden');
      if (confirm("WARNING: God Mode permanently removes this story from canon.")) {
          activateGodMode();
      }
  });

  // Track committed phrases in state
  if (!state.committedQuill) state.committedQuill = [];
  if (!state.committedVeto) state.committedVeto = [];

  // Add a committed phrase to the UI
  function addCommittedPhrase(container, text, type, index) {
      const phrase = document.createElement('div');
      phrase.className = `committed-phrase ${type}-phrase`;
      phrase.dataset.index = index;
      phrase.innerHTML = `
          <button class="committed-phrase-remove" title="Remove">&times;</button>
          <span class="committed-phrase-text">${text}</span>
      `;
      // Insert at top (new commits above old)
      container.insertBefore(phrase, container.firstChild);

      // Bind remove button
      phrase.querySelector('.committed-phrase-remove').addEventListener('click', () => {
          removeCommittedPhrase(type, index);
      });
  }

  // Remove a committed phrase
  function removeCommittedPhrase(type, index) {
      const arr = type === 'quill' ? state.committedQuill : state.committedVeto;
      arr.splice(index, 1);
      renderCommittedPhrases(type);
      // Update veto state if needed
      if (type === 'veto') rebuildVetoFromCommitted();
      saveStorySnapshot();
  }

  // Render all committed phrases for a type
  function renderCommittedPhrases(type) {
      const container = document.getElementById(type === 'quill' ? 'quillCommitted' : 'vetoCommitted');
      const arr = type === 'quill' ? state.committedQuill : state.committedVeto;
      if (!container) return;
      container.innerHTML = '';
      arr.forEach((text, i) => addCommittedPhrase(container, text, type, i));
  }

  // Rebuild veto state from committed phrases
  function rebuildVetoFromCommitted() {
      state.veto = state.veto || { bannedWords: [], tone: [] };
      state.veto.bannedWords = [];
      state.veto.tone = [];
      state.committedVeto.forEach(line => {
          const l = line.trim().toLowerCase();
          if (l.startsWith('ban:')) {
              state.veto.bannedWords.push(l.replace('ban:', '').trim());
          } else if (l.startsWith('no ') || l.startsWith('avoid ')) {
              state.veto.tone.push(line.trim());
          } else {
              state.veto.tone.push(line.trim());
          }
      });
  }

  $('btnCommitQuill')?.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent scroll to top
      e.stopPropagation();

      // Save scroll position before any DOM changes
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (!getQuillReady()) return;
      const quillEl = document.getElementById('quillInput');
      if (!quillEl) return;
      const quillText = quillEl.value.trim();
      if (!quillText) { showToast("No Quill edit to commit."); return; }

      // Also apply any pending veto constraints
      applyVetoFromInput();

      // Store quill intent in state for prompt injection
      window.state.quillIntent = quillText;

      // Add to committed phrases
      state.committedQuill.push(quillText);
      renderCommittedPhrases('quill');

      if (quillText) {
          const quillHtml = `<div class="quill-intervention" style="font-style:italic; color:var(--gold); border-left:2px solid var(--gold); padding-left:10px; margin:15px 0;">${formatStory(quillText, true)}</div>`;
          StoryPagination.appendToCurrentPage(quillHtml);
      }

      window.state.quillCommittedThisTurn = true;
      window.state.quill.uses++;
      window.state.quill.nextReadyAtWords = currentStoryWordCount() + computeNextCooldownWords();
      quillEl.value = '';
      updateQuillUI();
      saveStorySnapshot();
      showToast("Quill committed.");

      // Restore scroll position after all DOM changes
      requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
      });
  });

  // Commit Veto Button Handler
  $('btnCommitVeto')?.addEventListener('click', () => {
      const vetoEl = document.getElementById('vetoInput');
      if (!vetoEl) return;
      const vetoText = vetoEl.value.trim();
      if (!vetoText) { showToast("No veto to commit."); return; }

      // Add each line as separate committed phrase
      const lines = vetoText.split('\n').filter(l => l.trim());
      lines.forEach(line => {
          if (!state.committedVeto.includes(line.trim())) {
              state.committedVeto.push(line.trim());
          }
      });
      renderCommittedPhrases('veto');

      applyVetoFromInput();
      vetoEl.value = '';
      saveStorySnapshot();
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

      // 4-axis validation: world, tone, genre, dynamic are required (single-select)
      if (!state.picks.world) {
          errors.push('Please select a Story World.');
      }

      if (!state.picks.tone) {
          errors.push('Please select a Story Tone.');
      }

      if (!state.picks.genre) {
          errors.push('Please select a Genre.');
      }

      if (!state.picks.dynamic) {
          errors.push('Please select a Relationship Dynamic.');
      }

      // Historical world requires era selection
      if (state.picks.world === 'Historical' && !state.picks.era) {
          errors.push('Please select a Historical Era.');
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

    // === EARLY VALIDATION (before screen transition) ===
    // Build diagnostic payload and validate BEFORE showing game screen
    const ancestryPlayer = $('ancestryInputPlayer')?.value.trim() || '';
    const ancestryLI = $('ancestryInputLI')?.value.trim() || '';
    const archetypeDirectives = buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen);
    const quillUnlocked = state.subscribed || state.godModeActive || (state.storyId && hasStoryPass(state.storyId));

    const earlyPayload = {
        mode: state.mode || 'solo',
        fourAxis: {
            world: state.picks.world || 'Modern',
            tone: state.picks.tone || 'Earnest',
            genre: state.picks.genre || 'Billionaire',
            dynamic: state.picks.dynamic || 'Enemies'
        },
        archetype: {
            primary: state.archetype.primary || null,
            directives: archetypeDirectives || '(none built)'
        },
        veto: {
            bannedWords: state.veto?.bannedWords || [],
            tone: state.veto?.tone || []
        },
        intensity: state.intensity || 'Naughty',
        pov: state.picks.pov || 'First',
        systemPromptLength: 1 // Will be set after sys prompt built
    };

    // Validate four-axis before proceeding
    const { world, tone, genre, dynamic } = earlyPayload.fourAxis;
    const earlyErrors = [];
    if (!earlyPayload.mode) earlyErrors.push('Mode is undefined');
    if (!world) earlyErrors.push('World is missing or empty');
    if (!tone) earlyErrors.push('Tone is missing or empty');
    if (!genre) earlyErrors.push('Genre is missing or empty');
    if (!dynamic) earlyErrors.push('Relationship Dynamic is missing or empty');
    if (!earlyPayload.archetype.primary) earlyErrors.push('Primary Archetype not selected');
    if (earlyPayload.archetype.directives === '(none built)') earlyErrors.push('Archetype directives failed to build');

    if (earlyErrors.length > 0) {
        console.error('STORYBOUND EARLY VALIDATION FAILED:', earlyErrors);
        showToast(`Story setup incomplete: ${earlyErrors[0]}`);
        return;
    }
    // === END EARLY VALIDATION ===

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

DIALOGUE BALANCE RULES (LONG-ARC):

Before writing dialogue, internally assess:
- Who is physically present in the scene
- Who is emotionally engaged or affected
- Who has reason to speak, react, or withhold

Single-Voice Prevention:
- Dialogue must not come exclusively from the player character across multiple pages.
- If another character is present and engaged, they must eventually speak—unless silence is narratively intentional.
- Intentional silence is valid only when: (1) explicitly described as meaningful (refusal, distance, threat, awe), and (2) temporary, not sustained across multiple pages.

Natural Turn-Taking:
- Avoid 3+ consecutive dialogue beats from the same speaker when others are present.
- Encourage response, interruption, deflection, or reaction from other characters.
- Dialogue should feel exchanged, not monologic.

Long-Arc Presence Awareness:
- Track whether each present character has spoken recently over multiple pages.
- If a character has been silent too long without narrative justification, bias toward giving them a voice.
- This is guidance, not a rigid quota—let silence breathe when it serves the story.

────────────────────────────────────

You are writing a story with the following 4-axis configuration:
- World: ${state.picks.world || 'Modern'}${state.picks.world === 'Historical' && state.picks.era ? ` (${state.picks.era} Era)` : ''}
- Tone: ${state.picks.tone || 'Earnest'}
- Genre: ${state.picks.genre || 'Billionaire'}
- Dynamic: ${state.picks.dynamic || 'Enemies'}
- POV: ${state.picks.pov || 'First'}


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
    5TH PERSON (AUTHOR) DIRECTIVES - CRITICAL:
    - Write as if The Author is a visible conductor of the narrative, referred to in THIRD PERSON only.
    - NEVER use first person ("I", "me", "my", "myself"). Always use "The Author" as the subject.
    - Example: "The Author watched with quiet satisfaction" NOT "I watched with quiet satisfaction".
    - Presence: ${state.authorPresence}. Cadence: ~${state.authorCadenceWords} words between Author references.
    - Fate card voice: ${state.fateCardVoice}.
    - Author awareness: ${state.allowAuthorAwareness ? 'enabled' : 'disabled'}, chance ${state.authorAwarenessChance}, window ${state.authorAwarenessWindowWords}w, max ${state.authorAwarenessMaxDurationWords}w.
    ` : ''}
    `;
    
    state.sysPrompt = sys;
    state.storyId = state.storyId || makeStoryId();

    window.showScreen('game');

    // Initialize book cover page - show cover, hide story content
    const bookCoverPage = document.getElementById('bookCoverPage');
    const storyContentEl = document.getElementById('storyContent');
    if (bookCoverPage) bookCoverPage.classList.remove('hidden');
    if (storyContentEl) storyContentEl.classList.add('hidden');
    startCoverLoading();

    startLoading("Conjuring the world...", STORY_LOADING_MESSAGES);
    
    // Pacing rules based on intensity
    const pacingRules = {
        'Clean': 'Focus only on atmosphere, world-building, and hints of the protagonist\'s past. No tension, no longing—just setting and mystery.',
        'Naughty': 'Focus on atmosphere and world-building. Light emotional undertones allowed, but no romantic tension yet.',
        'Erotic': 'Build atmosphere first. Romantic tension may simmer beneath the surface, but keep the focus on setting.',
        'Dirty': 'Atmosphere first, but charged undercurrents are allowed. The heat can be present from the start.'
    };
    const pacingRule = pacingRules[state.intensity] || pacingRules['Naughty'];
    const liAppears = state.intensity === 'Dirty' || Math.random() < 0.25;

    const authorOpeningDirective = state.povMode === 'author5th' ? `
AUTHOR PRESENCE (5TH PERSON) - CRITICAL FOR OPENING:
- The Author must be PALPABLY present from the first paragraph.
- Comment on the world as it forms around the protagonist—as if arranging set pieces.
- Reflect knowingly on the protagonist's ignorance of what The Author has planned for them.
- Express quiet intention, anticipation, and subtle manipulation.
- CRITICAL: NEVER use first person ("I", "me", "my"). Always refer to "The Author" in third person.
- Use phrases like: "The Author placed...", "The Author watched...", "They didn't yet know what The Author had planned...", "The Author had been waiting..."
- The Author is a visible hand, orchestrating with relish—but always referred to as "The Author", never "I".
` : '';

    // OPENING SCENE VARIATION - avoid repetitive patterns
    const openingModes = [
        { mode: 'Motion-first', directive: 'Open mid-action: transit, pursuit, labor, ritual, or urgent movement. The protagonist is DOING something when we meet them.' },
        { mode: 'World-first', directive: 'Open with environment or system acting before any character is named. Weather, architecture, or social machinery dominates the first beat.' },
        { mode: 'Social-first', directive: 'Open in a crowd, market, court, boardroom, dock, tavern, or gathering. Other people surround the protagonist.' },
        { mode: 'Aftermath-first', directive: 'Open in the wake of something significant. Consequences linger—a letter, a departure, a broken object, a changed landscape.' },
        { mode: 'Disruption-first', directive: 'Open with instability. Something is already wrong, charged, or off-kilter. Tension from the first sentence.' }
    ];
    const selectedOpening = openingModes[Math.floor(Math.random() * openingModes.length)];

    const introPrompt = `Write the opening scene (approx 200 words).
${authorOpeningDirective}
OPENING MODE: ${selectedOpening.mode}
${selectedOpening.directive}

FIRST SECTION RULES:
- ${pacingRule}
- Focus on: World setup, hints at overall arc, the protagonist's past or situation.
${liAppears ? '- The love interest may appear briefly or be hinted at.' : '- The love interest should NOT appear yet. Build anticipation.'}
- End with a hook, a question, or atmospheric tension—NOT a romantic moment.

AVOID these clichéd openings:
- Lone woman in solitude staring out a window
- Rain-lashed windows or fog-wreathed shops
- Characters passively observing weather, mist, or shadow
- Quiet interiors awaiting intrusion

The opening must feel intentional and specific, not archetypal or templated.`;

    // FATE STUMBLED DIAGNOSTIC - Structured payload logging
    // (ancestryPlayer, ancestryLI, archetypeDirectives, quillUnlocked already declared above)
    let tier = 'free';
    if (state.subscribed) tier = 'subscribed';
    else if (quillUnlocked) tier = 'quill_unlocked';
    else if (state.storyId && hasStoryPass(state.storyId)) tier = 'story_unlocked';

    // Build structured payload for diagnostic (4-axis system)
    const diagnosticPayload = {
        mode: state.mode || 'solo',
        tier: tier,
        fourAxis: {
            world: state.picks.world || 'Modern',
            era: state.picks.world === 'Historical' ? (state.picks.era || 'Medieval') : null,
            tone: state.picks.tone || 'Earnest',
            genre: state.picks.genre || 'Billionaire',
            dynamic: state.picks.dynamic || 'Enemies'
        },
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
        pov: state.picks.pov || 'First',
        storyLength: state.storyLength || 'voyeur',
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

        // Four-axis validation (world, tone, genre, dynamic)
        const { world, tone, genre, dynamic } = payload.fourAxis || {};
        if (!world) errors.push('World is missing or empty');
        if (!tone) errors.push('Tone is missing or empty');
        if (!genre) errors.push('Genre is missing or empty');
        if (!dynamic) errors.push('Relationship Dynamic is missing or empty');

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

        const title = await callChat([{role:'user', content:`Based on this opening, generate a 2-4 word title.

PROCESS: First, internally identify the story's emotional promise or arc (longing, danger, desire, destiny, transformation). Then craft a title that hints at that promise.

QUALITY RULES:
- The title must feel like a promise of experience, not a mood collage
- Avoid abstract noun clusters ("Veiled Whispers of the Dark")
- Prefer titles that imply stakes, longing, or transformation
- Good examples: "What the Sky Took", "The Wanting", "Before You Burned"

Return ONLY the title, no quotes or explanation:\n${text}`}]);

        // SYNOPSIS GENERATION RULE (AUTHORITATIVE)
        const synopsis = await callChat([{role:'user', content:`Write a 1-2 sentence synopsis (story promise) for this opening.

MANDATORY REQUIREMENTS — All three must be present:
1. A SPECIFIC CHARACTER with agency (e.g., "a hedge-witch on the brink of exile" — not just "one woman")
2. A DESIRE or TEMPTATION — something they want, fear wanting, or are being pulled toward
3. A LOOMING CONFLICT or CONSEQUENCE — a force, choice, or cost that threatens to change them

QUALITY CHECK — Before writing, answer internally:
- Who wants something?
- What do they want (or are tempted by)?
- What stands in the way, or what will it cost?

FORBIDDEN PATTERNS:
- Abstract noun collisions ("grit aches against ambition")
- Redundant metaphor stacking ("veiled shadows," "shrouded ambitions" together)
- Emotion verbs without bodies ("aches," "burns" without physical anchor)
- Mood collage without narrative motion

ALLOWED:
- Poetic language ONLY when attached to concrete agents or actions
- One central metaphor family maximum
- Present tense preferred

The reader should think: "I want to see what happens when this desire meets resistance."
NOT: "This sounds pretty."

Return ONLY the synopsis sentence(s), no quotes:\n${text}`}]);

        // CORRECTIVE: Set title and synopsis first
        const titleEl = document.getElementById('storyTitle');
        const synopsisEl = document.getElementById('storySynopsis');
        const storyTextEl = document.getElementById('storyText');

        // Hide story text until fully rendered
        if (storyTextEl) storyTextEl.style.opacity = '0';

        const cleanTitle = title.replace(/"/g,'');
        titleEl.textContent = cleanTitle;
        synopsisEl.textContent = synopsis;

        // Use pagination system for story display
        StoryPagination.clear();
        StoryPagination.addPage(formatStory(text), true);

        // Generate book cover with intent-based routing (async, non-blocking)
        // Uses gpt-image-1.5 for typography rendering
        const authorDisplayName = state.authorGender === 'Non-Binary'
            ? 'The Author'
            : (state.authorGender === 'Female' ? 'A. Romance' : 'A. Novelist');

        generateBookCover(synopsis, cleanTitle, authorDisplayName).then(coverUrl => {
            if (coverUrl) {
                stopCoverLoading(coverUrl);
            } else {
                // Cover generation failed - skip to story content
                console.warn('[BookCover] Failed to generate, skipping cover page');
                skipCoverPage();
            }
        });

        // Also generate setting shot for story content (in parallel)
        generateSettingShot(synopsis);

        // Story text reveal is handled by cover page flow
        // (user clicks "Open Your Story" to see content)

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

        // Clean up cover page state on error
        skipCoverPage();

        alert("Fate stumbled. Please try again. (Check console for diagnostics)");
        window.showScreen('setup');
    } finally {
        stopLoading();
        // Deal fresh fate cards for first turn
        if(window.dealFateCards) window.dealFateCards();
        else if(window.initCards) window.initCards();
        updateQuillUI();
        updateBatedBreathState();
    }
  });

  // --- API CALLS ---
  /**
   * ==========================================================================
   * STORY GENERATION API CALL
   * ==========================================================================
   *
   * This function routes story generation through the appropriate AI model(s).
   *
   * When ENABLE_ORCHESTRATION is true:
   * - Uses the orchestration client (ChatGPT primary author + optional Grok renderer)
   * - Enforces the canonical call order: ChatGPT → Grok → ChatGPT
   *
   * When ENABLE_ORCHESTRATION is false:
   * - Uses legacy single-model flow (Grok only)
   * - Provided for fallback/compatibility only
   *
   * ==========================================================================
   */
  async function callChat(messages, temp=0.7, options = {}) {
    // Check if orchestration client is available and enabled
    const useOrchestration = ENABLE_ORCHESTRATION &&
                             window.StoryboundOrchestration &&
                             !options.bypassOrchestration;

    if (useOrchestration) {
      // Route through orchestration client (ChatGPT primary author)
      try {
        return await window.StoryboundOrchestration.callChatGPT(
          messages,
          'PRIMARY_AUTHOR',
          { temperature: temp, max_tokens: options.max_tokens || 1000 }
        );
      } catch (orchestrationError) {
        console.warn('[ORCHESTRATION] ChatGPT failed, falling back to legacy:', orchestrationError.message);
        // Fall through to legacy Grok call
      }
    }

    // Legacy single-model flow (Grok via specialist proxy)
    const payload = {
       messages: messages,
       model: STORY_MODEL,
       temperature: temp,
       max_tokens: options.max_tokens || 1000
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

  /**
   * ==========================================================================
   * ORCHESTRATED TURN GENERATION
   * ==========================================================================
   *
   * Executes the full 3-phase orchestration flow for story generation:
   *
   * PHASE 1: ChatGPT Author Pass (ALWAYS RUNS)
   *   - Plot beats, character psychology, dialogue intent
   *   - Determines if intimacy occurs
   *   - Generates Erotic Scene Directive (ESD) if needed
   *   - Enforces monetization gates
   *
   * PHASE 2: Specialist Renderer (CONDITIONAL)
   *   - Called ONLY if ESD warrants it (Erotic/Dirty level)
   *   - Receives ONLY the ESD, no plot context
   *   - Renders sensory embodiment within bounds
   *   - NEVER decides outcomes
   *
   * PHASE 3: ChatGPT Integration Pass (ALWAYS RUNS)
   *   - Absorbs rendered scene
   *   - Applies consequences
   *   - Enforces cliffhanger or completion per tier
   *   - FINAL AUTHORITY on story state
   *
   * FAILURE HANDLING:
   *   - Renderer failure does NOT corrupt story state
   *   - ChatGPT regains control on failure
   *   - Fate Stumbled may be triggered
   *
   * ==========================================================================
   */
  async function generateOrchestatedTurn(params) {
    const {
      systemPrompt,
      storyContext,
      playerAction,
      playerDialogue,
      fateCard,
      onPhaseChange
    } = params;

    // Check if orchestration is available
    if (!window.StoryboundOrchestration) {
      console.warn('[ORCHESTRATION] Client not available, using legacy flow');
      // Fall back to legacy single-model call
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Action: ${playerAction}\nDialogue: "${playerDialogue}"` }
      ];
      return await callChat(messages, 0.7, { bypassOrchestration: true });
    }

    // Execute full orchestration flow
    const result = await window.StoryboundOrchestration.orchestrateStoryGeneration({
      accessTier: state.access || 'free',
      requestedEroticism: state.intensity || 'Clean',
      storyContext: storyContext,
      playerAction: playerAction,
      playerDialogue: playerDialogue,
      fateCard: fateCard,
      systemPrompt: systemPrompt,
      onPhaseChange: onPhaseChange
    });

    // Log orchestration details
    console.log('[ORCHESTRATION] Turn complete:', {
      success: result.success,
      rendererUsed: result.rendererUsed,
      fateStumbled: result.fateStumbled,
      gateEnforcement: result.gateEnforcement,
      timing: result.timing,
      errors: result.errors
    });

    // Handle Fate Stumbled
    if (result.fateStumbled) {
      console.warn('[ORCHESTRATION] Fate Stumbled - specialist renderer failed');
      // Story continues with author output only
    }

    if (!result.success && result.errors.length > 0) {
      console.error('[ORCHESTRATION] Errors:', result.errors);
    }

    return result.finalOutput;
  }

  // Setting shot uses unified IMAGE PROVIDER ROUTER with landscape shape
  // Book cover / world-establishing illustration (NOT scene illustration)
  async function generateSettingShot(desc) {
     _lastSettingShotDesc = desc; // Store for retry
     const img = document.getElementById('settingShotImg');
     const errDiv = document.getElementById('settingError');
     if(!img) return;
     const wrap = document.getElementById('settingShotWrap');
     if(wrap) wrap.style.display = 'flex';
     img.onload = null; img.onerror = null;
     img.style.display = 'none';
     if(errDiv) {
         errDiv.textContent = 'Conjuring the scene...';
         errDiv.classList.remove('hidden');
         errDiv.style.color = 'var(--gold)';
     }

     // WORLD-FIRST PROMPT: Environment description, NOT characters/actions
     // Strip any intensity/quality/erotic language (PG-13/R mood only)
     const sanitizeForCover = (text) => {
         return text
             .replace(/\bINTENSITY:.*?(?=\n|$)/gi, '')
             .replace(/\bQUALITY:.*?(?=\n|$)/gi, '')
             .replace(/\b(sensual|erotic|nude|naked|explicit|sexual|intimate|seductive|provocative|lustful|aroused|passionate)\b/gi, '')
             .replace(/\s+/g, ' ')
             .trim();
     };

     // Cap at 256 chars without cutting mid-sentence
     const capWorldDesc = (text, maxLen = 256) => {
         const clean = sanitizeForCover(text);
         if (clean.length <= maxLen) return clean;
         const truncated = clean.substring(0, maxLen);
         const lastPeriod = truncated.lastIndexOf('.');
         const lastComma = truncated.lastIndexOf(',');
         const cutPoint = Math.max(lastPeriod, lastComma);
         return cutPoint > maxLen * 0.5 ? truncated.substring(0, cutPoint + 1).trim() : truncated.trim();
     };

     const worldDesc = capWorldDesc(desc);
     const styleSuffix = 'Wide cinematic environment, atmospheric lighting, painterly illustration, epic scale, 16:9 aspect ratio, no text, no watermark.';

     // WORLD FIRST, then style suffix
     const prompt = `${worldDesc} ${styleSuffix}`;

     let rawUrl = null;

     // Use unified IMAGE PROVIDER ROUTER with FALLBACK CHAIN
     // Setting shots always use Clean tier (sanitized) with landscape shape
     try {
         rawUrl = await generateImageWithFallback({
             prompt: prompt,
             tier: 'Clean',
             shape: 'landscape',
             context: 'setting-shot'
         });
     } catch(e) {
         // All providers failed - logged by generateImageWithFallback
         console.warn('Setting shot: all providers exhausted', e.message);
     }

     if(rawUrl) {
         let imageUrl = rawUrl;
         if(!rawUrl.startsWith('http') && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:')) {
             imageUrl = `data:image/png;base64,${rawUrl}`;
         }
         img.src = imageUrl;

         // Add timeout for image load
         const loadTimeout = setTimeout(() => {
             img.style.display = 'none';
             if(errDiv) {
                 errDiv.innerHTML = 'The scene resists capture... <button onclick="window.retrySettingShot()" style="margin-left:10px; background:var(--gold); color:black; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">Retry</button>';
                 errDiv.style.color = '#ff6b6b';
                 errDiv.classList.remove('hidden');
             }
         }, 30000);

         img.onload = () => {
             clearTimeout(loadTimeout);
             img.style.display = 'block';
             if(errDiv) errDiv.classList.add('hidden');
         };
         img.onerror = () => {
             clearTimeout(loadTimeout);
             img.style.display = 'none';
             if(errDiv) {
                 errDiv.innerHTML = 'The scene resists capture... <button onclick="window.retrySettingShot()" style="margin-left:10px; background:var(--gold); color:black; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">Retry</button>';
                 errDiv.style.color = '#ff6b6b';
                 errDiv.classList.remove('hidden');
             }
         };
     } else {
         // All providers failed: non-blocking placeholder, story continues
         if(errDiv) {
             errDiv.innerHTML = 'The scene resists capture... <button onclick="window.retrySettingShot()" style="margin-left:10px; background:var(--gold); color:black; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">Retry</button>';
             errDiv.style.color = '#ff6b6b';
             errDiv.classList.remove('hidden');
         }
         // Story continues normally - no toast, no blocking
     }
  }

  window.retrySettingShot = function() {
      if (_lastSettingShotDesc) {
          generateSettingShot(_lastSettingShotDesc);
      }
  };

  // ============================================================
  // BOOK COVER PAGE SYSTEM
  // Staged loading → Cover generation → Page-turn reveal
  // ============================================================

  const COVER_CRAFT_PHRASES = [
      "Building your book cover...",
      "Selecting an artist...",
      "Composing the scene...",
      "Choosing the typography...",
      "Applying finishing touches...",
      "Binding the pages..."
  ];

  let _coverPhraseIndex = 0;
  let _coverPhraseInterval = null;
  let _coverProgressInterval = null;

  // Start cover loading UI with staged phrases
  function startCoverLoading() {
      const loadingState = document.getElementById('coverLoadingState');
      const revealState = document.getElementById('coverRevealState');
      const statusText = document.getElementById('coverStatusText');
      const progressFill = document.getElementById('coverProgressFill');

      if (loadingState) loadingState.classList.remove('hidden');
      if (revealState) revealState.classList.add('hidden');

      _coverPhraseIndex = 0;
      if (statusText) statusText.textContent = COVER_CRAFT_PHRASES[0];

      // Rotate through phrases every 3 seconds
      _coverPhraseInterval = setInterval(() => {
          _coverPhraseIndex = (_coverPhraseIndex + 1) % COVER_CRAFT_PHRASES.length;
          if (statusText) statusText.textContent = COVER_CRAFT_PHRASES[_coverPhraseIndex];
      }, 3000);

      // Progress bar animation (fake progress up to 90%)
      let progress = 0;
      if (progressFill) progressFill.style.width = '0%';
      _coverProgressInterval = setInterval(() => {
          progress += Math.random() * 8;
          if (progress > 90) progress = 90;
          if (progressFill) progressFill.style.width = progress + '%';
      }, 500);
  }

  // Stop cover loading and show physical book object
  function stopCoverLoading(coverUrl) {
      if (_coverPhraseInterval) clearInterval(_coverPhraseInterval);
      if (_coverProgressInterval) clearInterval(_coverProgressInterval);

      const loadingState = document.getElementById('coverLoadingState');
      const bookObject = document.getElementById('bookObject');
      const coverImg = document.getElementById('bookCoverImg');
      const progressFill = document.getElementById('coverProgressFill');
      const bookmarkRibbon = document.getElementById('bookmarkRibbon');

      // Complete progress bar
      if (progressFill) progressFill.style.width = '100%';

      setTimeout(() => {
          if (loadingState) loadingState.classList.add('hidden');
          if (bookObject) bookObject.classList.remove('hidden');
          if (coverImg && coverUrl) {
              coverImg.src = coverUrl;
          }

          // Show bookmark if returning reader
          if (bookmarkRibbon && state.turnCount > 0) {
              bookmarkRibbon.classList.remove('hidden');
          }

          // Start courtesy hinge timer (one-time only)
          scheduleCourtesyHinge();
      }, 500);
  }

  // Generate book cover with intent-based routing
  // Uses authoritative prestige cover template with symbolic objects
  async function generateBookCover(synopsis, title, authorName) {
      // Extract story context for symbolic object selection (4-axis system)
      const world = state.picks?.world || 'Modern';
      const tone = state.picks?.tone || 'Earnest';
      const genre = state.picks?.genre || 'Billionaire';
      const dynamic = state.picks?.dynamic || 'Enemies';
      const era = state.picks?.world === 'Historical' ? (state.picks?.era || 'Medieval') : null;

      // Build mode line from world + tone
      const modeLine = era ? `${era} ${world}` : `${world} ${tone}`;
      // Build story style description
      const storyStyle = `${tone} ${genre}`;

      try {
          const res = await fetch(IMAGE_PROXY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  prompt: synopsis || 'A dramatic scene from a romantic novel',
                  imageIntent: 'book_cover',
                  title: title || 'Untitled',
                  authorName: authorName || 'ANONYMOUS',
                  modeLine: modeLine,
                  dynamic: dynamic,
                  storyStyle: storyStyle,
                  genre: genre,
                  size: '1024x1024'
              })
          });

          if (!res.ok) {
              console.warn('[BookCover] HTTP error:', res.status);
              return null;
          }

          const data = await res.json();
          return data?.url || null;
      } catch (err) {
          console.error('[BookCover] Generation failed:', err.message);
          return null;
      }
  }

  // ============================================================
  // PHYSICAL BOOK INTERACTION SYSTEM
  // Hinge-based open, courtesy peek, no buttons
  // ============================================================

  const COURTESY_HINGE_KEY = 'storybound_courtesy_hinge_shown';
  let _courtesyHingeTimeout = null;
  let _bookOpened = false;

  // Check if courtesy hinge has already been shown (one-time ever)
  function hasSeenCourtesyHinge() {
      try {
          return localStorage.getItem(COURTESY_HINGE_KEY) === 'true';
      } catch (e) {
          return false;
      }
  }

  // Mark courtesy hinge as shown
  function markCourtesyHingeShown() {
      try {
          localStorage.setItem(COURTESY_HINGE_KEY, 'true');
      } catch (e) {
          // localStorage unavailable
      }
  }

  // Schedule courtesy hinge (2-3 seconds after cover shows)
  function scheduleCourtesyHinge() {
      if (hasSeenCourtesyHinge() || _bookOpened) return;

      _courtesyHingeTimeout = setTimeout(() => {
          if (_bookOpened) return; // User already opened

          const bookCover = document.getElementById('bookCover');
          if (bookCover) {
              bookCover.classList.add('courtesy-peek');
              markCourtesyHingeShown();

              // Remove class after animation completes
              setTimeout(() => {
                  bookCover.classList.remove('courtesy-peek');
              }, 2100);
          }
      }, 2500);
  }

  // Cancel courtesy hinge if user clicks
  function cancelCourtesyHinge() {
      if (_courtesyHingeTimeout) {
          clearTimeout(_courtesyHingeTimeout);
          _courtesyHingeTimeout = null;
      }
  }

  // Open book via hinge animation (triggered by clicking anywhere on book)
  function openBook() {
      if (_bookOpened) return;
      _bookOpened = true;
      cancelCourtesyHinge();

      const bookCover = document.getElementById('bookCover');
      const bookCoverPage = document.getElementById('bookCoverPage');
      const storyContent = document.getElementById('storyContent');
      const storyTextEl = document.getElementById('storyText');

      // Remove any courtesy peek class
      if (bookCover) {
          bookCover.classList.remove('courtesy-peek');
          bookCover.classList.add('hinge-open');
      }

      // After hinge animation, transition to story
      setTimeout(() => {
          if (bookCoverPage) bookCoverPage.classList.add('hidden');
          if (storyContent) {
              storyContent.classList.remove('hidden');
              storyContent.classList.add('fade-in');
          }
          if (storyTextEl) storyTextEl.style.opacity = '1';

          // Scroll to title
          const titleEl = document.getElementById('storyTitle');
          if (titleEl) {
              titleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 800);
  }

  // Initialize physical book event listeners
  function initCoverPageListeners() {
      // Click anywhere on book object to open
      const bookObject = document.getElementById('bookObject');
      if (bookObject) {
          bookObject.addEventListener('click', openBook);
      }

      // Also allow clicking on cover directly (redundant safety)
      const bookCover = document.getElementById('bookCover');
      if (bookCover) {
          bookCover.addEventListener('click', (e) => {
              e.stopPropagation();
              openBook();
          });
      }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCoverPageListeners);
  } else {
      initCoverPageListeners();
  }

  // Reset book state for new story
  function resetBookState() {
      _bookOpened = false;
      cancelCourtesyHinge();
      const bookCover = document.getElementById('bookCover');
      if (bookCover) {
          bookCover.classList.remove('hinge-open', 'courtesy-peek');
      }
  }

  // Hide cover page and show story content directly (fallback if cover fails)
  function skipCoverPage() {
      const bookCoverPage = document.getElementById('bookCoverPage');
      const storyContent = document.getElementById('storyContent');
      const storyTextEl = document.getElementById('storyText');

      // Stop any running cover loading intervals
      if (_coverPhraseInterval) clearInterval(_coverPhraseInterval);
      if (_coverProgressInterval) clearInterval(_coverProgressInterval);
      cancelCourtesyHinge();

      if (bookCoverPage) bookCoverPage.classList.add('hidden');
      if (storyContent) storyContent.classList.remove('hidden');
      if (storyTextEl) storyTextEl.style.opacity = '1';
      _bookOpened = true;
  }

  // --- VISUALIZE (STABILIZED) ---
  let _vizCancelled = false;

  // Visualize intensity bias based on player's selected eroticism level
  function getVisualizeIntensityBias() {
      const intensity = state.intensity || 'Naughty';
      switch(intensity) {
          case 'Clean':
              return 'Clean, non-sexual imagery. Romantic but modest. No nudity or explicit content.';
          case 'Naughty':
              return 'Suggestive, flirtatious imagery. Sensual tension without explicit nudity. Tasteful allure.';
          case 'Erotic':
              return 'Explicit, sensual imagery. Passionate and intimate. Artistic nudity permitted.';
          case 'Dirty':
              return 'As explicit as community standards allow. Intensely passionate and provocative.';
          default:
              return 'Suggestive, flirtatious imagery. Sensual tension.';
      }
  }

  // Default visual quality biases for attractive characters
  const VISUAL_QUALITY_DEFAULTS = 'Characters depicted with striking beauty, elegant features, and healthy appearance. Women with beautiful hourglass figures. Men with athletic gymnast-like builds. Faces are attractive and expressive with natural expressions, avoiding exaggerated or artificial looks.';

  // Sanitize image prompts - removes sensual adjectives for Clean/Naughty tiers
  function sanitizeImagePrompt(prompt) {
      // Words that trigger safety filters on mainstream providers
      const sensualWords = [
          'sensual', 'erotic', 'seductive', 'sexual', 'intimate', 'naked', 'nude',
          'provocative', 'suggestive', 'lustful', 'passionate', 'steamy', 'hot',
          'sexy', 'aroused', 'arousing', 'undressed', 'revealing', 'exposed',
          'busty', 'voluptuous', 'curvy', 'bedroom', 'lingerie', 'underwear',
          'explicit', 'raw', 'unfiltered', 'dirty', 'naughty', 'forbidden',
          'sultry', 'alluring', 'nudity'
      ];

      // Phrases that trigger moderation (multi-word)
      const sensualPhrases = [
          'parted lips', 'suggestive posture', 'alluring curves',
          'bedroom eyes', 'come hither', 'inviting gaze'
      ];

      let sanitized = prompt;

      // Remove "The Author" references (meta-character should never be in images)
      sanitized = sanitized.replace(/\bThe Author\b/gi, '').replace(/\bAuthor\b/gi, '');

      // Remove flagged phrases first (before single words)
      sensualPhrases.forEach(phrase => {
          const regex = new RegExp(phrase, 'gi');
          sanitized = sanitized.replace(regex, '');
      });

      // Remove sensual words entirely rather than replacing
      sensualWords.forEach(word => {
          const regex = new RegExp('\\b' + word + '\\b', 'gi');
          sanitized = sanitized.replace(regex, '');
      });

      // Clean up double spaces and punctuation issues
      sanitized = sanitized.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').replace(/\s+,/g, ',').trim();

      return sanitized;
  }

  // EROTIC/DIRTY TIER: Restore erotic language to prompts for Perchance rendering
  // This reverses sanitization for tiers that permit explicit imagery
  function restoreEroticLanguage(prompt) {
      // Keywords to restore/enhance for erotic tiers
      const eroticEnhancements = [
          'sensual', 'erotic', 'nudity', 'nude', 'explicit'
      ];

      let enhanced = prompt;

      // Remove "The Author" references (meta-character should NEVER be in images)
      enhanced = enhanced.replace(/\bThe Author\b/gi, '').replace(/\bAuthor\b/gi, '');

      // If prompt lacks erotic descriptors, inject tier-appropriate language
      const hasEroticTerms = eroticEnhancements.some(term =>
          enhanced.toLowerCase().includes(term)
      );

      if (!hasEroticTerms) {
          // Inject erotic context based on intensity guidance already in prompt
          if (enhanced.toLowerCase().includes('artistic nudity permitted') ||
              enhanced.toLowerCase().includes('explicit') ||
              enhanced.toLowerCase().includes('passionate')) {
              enhanced = enhanced.replace(
                  /Art style:/i,
                  'Sensual, erotic imagery permitted. Art style:'
              );
          }
      }

      // Clean up spacing
      enhanced = enhanced.replace(/\s+/g, ' ').trim();

      return enhanced;
  }

  // ============================================================
  // IMAGE PROVIDER ROUTER - Unified image generation system
  // ============================================================

  // PASS 2E: PROMPT LENGTH CLAMP (MAX 700 CHARACTERS)
  const MAX_IMAGE_PROMPT_LENGTH = 700;

  function clampPromptLength(prompt) {
      if (prompt.length > MAX_IMAGE_PROMPT_LENGTH) {
          console.warn(`[IMAGE-GEN] Prompt truncated: ${prompt.length} -> ${MAX_IMAGE_PROMPT_LENGTH}`);
          return prompt.substring(0, MAX_IMAGE_PROMPT_LENGTH);
      }
      return prompt;
  }

  // FLUX PROMPT HARD CONSTRAINTS (MANDATORY)
  const FLUX_PROMPT_PREFIX = 'Painterly cinematic realism, oil-painting style, realistic anatomy, natural proportions, non-anime.';
  const FLUX_PROMPT_SUFFIX = 'Single subject unless explicitly stated. Correct human anatomy. No extra limbs. No extra people.';

  // PERCHANCE PROMPT HARD CONSTRAINTS (MANDATORY)
  const PERCHANCE_PROMPT_PREFIX = 'default Art Style is oil painting 70s pulp, cinematic lighting, realistic proportions, oil-painting style, non-anime.';
  const PERCHANCE_PROMPT_SUFFIX = 'Single subject unless explicitly stated. Correct human anatomy. One head, two arms, two legs. No extra limbs. No extra people.';

  // DEV-ONLY: Logging helper for image generation debugging
  function logImageAttempt(provider, context, prompt, status, error = null) {
      const promptPreview = prompt.substring(0, 120) + (prompt.length > 120 ? '...' : '');

      // Categorize blocker type from error message
      const getBlocker = (err) => {
          if (!err) return 'None';
          const e = err.toLowerCase();
          if (e.includes('cors') || e.includes('access-control') || e.includes('preflight')) return 'CORS';
          if (e.includes('nsfw') || e.includes('safety') || e.includes('content policy') || e.includes('rejected')) return 'NSFW';
          if (e.includes('network') || e.includes('fetch') || e.includes('timeout') || e.includes('abort') || e.includes('econnrefused')) return 'Network';
          if (e.includes('null') || e.includes('no image')) return 'NoOutput';
          return 'Other';
      };

      const logData = {
          provider,
          context,
          reached: status === 'ATTEMPTING' || status === 'SUCCESS',
          blockedBy: status === 'FAILED' ? getBlocker(error) : 'None',
          status,
          promptLength: prompt.length,
          promptPreview,
          timestamp: new Date().toISOString()
      };
      if (error) logData.error = error;
      console.warn('[IMAGE-GEN]', JSON.stringify(logData));
  }

  // FLUX PRIMARY: Call Flux Uncensored image generation (via Replicate or self-hosted)
  // PASS 2E: Extended timeout for Replicate inference (up to 120s)
  // Default to 16:9 landscape for cinematic presentation
  async function callFluxImageGen(prompt, size = '1792x1024', timeout = 125000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Flux endpoint - Replicate API or self-hosted inference server
      const fluxUrl = (typeof FLUX_PROXY_URL !== 'undefined' && FLUX_PROXY_URL)
          ? FLUX_PROXY_URL
          : IMAGE_PROXY_URL;

      // Apply mandatory prefix and suffix constraints
      const constrainedPrompt = `${FLUX_PROMPT_PREFIX} ${prompt} ${FLUX_PROMPT_SUFFIX}`;

      // PASS 2E: Include context for server-side logging
      const res = await fetch(fluxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              prompt: constrainedPrompt,
              provider: 'flux',
              model: 'flux-uncensored',
              size: size,
              context: 'flux-primary',
              n: 1
          }),
          signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Flux HTTP ${res.status}`);
      }

      let data;
      try { data = await res.json(); } catch (e) { throw new Error('Flux invalid response'); }

      const imageUrl = data?.url || data?.image || data?.b64_json ||
          (Array.isArray(data?.data) && data.data[0]?.url) ||
          (Array.isArray(data?.data) && data.data[0]?.b64_json) ||
          (Array.isArray(data?.output) && data.output[0]);

      if (!imageUrl) {
          throw new Error('Flux returned no image');
      }

      return imageUrl;
  }

  // OPENAI LAST RESORT: Call OpenAI image generation (SAFE - never throws)
  async function callOpenAIImageGen(prompt, size = '1024x1024', timeout = 60000) {
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          // Determine aspect ratio from size (match Replicate logic)
          const aspectRatio = size === '1024x1024' ? '1:1' : '16:9';

          const res = await fetch(IMAGE_PROXY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  prompt: prompt,
                  provider: 'openai',
                  model: 'gpt-image-1.5',
                  size: size,
                  aspect_ratio: aspectRatio,
                  n: 1
              }),
              signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
              console.warn('[OpenAI] HTTP error:', res.status);
              return null; // Safe fallback - don't throw
          }

          let data;
          try { data = await res.json(); } catch (e) {
              console.warn('[OpenAI] Invalid response');
              return null;
          }

          const imageUrl = data?.url || data?.image || data?.b64_json ||
              (Array.isArray(data?.data) && data.data[0]?.url) ||
              (Array.isArray(data?.data) && data.data[0]?.b64_json);

          if (!imageUrl) {
              console.warn('[OpenAI] No image returned');
              return null;
          }

          return imageUrl;
      } catch (err) {
          console.warn('[OpenAI] Caught error:', err.message);
          return null; // Safe fallback - never crash pipeline
      }
  }

  // PERCHANCE PROVIDER: Call Perchance AI image generation service
  // Default to 16:9 landscape for cinematic presentation
  async function callPerchanceImageGen(prompt, size = '1792x1024', timeout = 60000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Perchance endpoint - server-side microservice or internal HTTP endpoint
      const perchanceUrl = (typeof PERCHANCE_PROXY_URL !== 'undefined' && PERCHANCE_PROXY_URL)
          ? PERCHANCE_PROXY_URL
          : IMAGE_PROXY_URL;

      // Apply mandatory prefix and suffix constraints
      const constrainedPrompt = `${PERCHANCE_PROMPT_PREFIX} ${prompt} ${PERCHANCE_PROMPT_SUFFIX}`;

      // Determine aspect ratio from size (match Replicate logic)
      const aspectRatio = size === '1024x1024' ? '1:1' : '16:9';

      const res = await fetch(perchanceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              prompt: constrainedPrompt,
              provider: 'perchance',
              size: size,
              aspect_ratio: aspectRatio,
              n: 1
          }),
          signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
          throw new Error(`Perchance HTTP ${res.status}`);
      }

      let data;
      try { data = await res.json(); } catch (e) { throw new Error('Perchance invalid response'); }

      const imageUrl = data?.url || data?.image || data?.b64_json ||
          (Array.isArray(data?.data) && data.data[0]?.url) ||
          (Array.isArray(data?.data) && data.data[0]?.b64_json);

      if (!imageUrl) {
          throw new Error('Perchance returned no image');
      }

      return imageUrl;
  }

  // GEMINI PROVIDER: Call Gemini image generation (SAFE - never throws)
  async function callGeminiImageGen(prompt, size = '1024x1024', timeout = 60000) {
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          // Determine aspect ratio from size (match Replicate logic)
          const aspectRatio = size === '1024x1024' ? '1:1' : '16:9';

          const res = await fetch(IMAGE_PROXY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  prompt: prompt,
                  provider: 'gemini',
                  model: 'imagen-3.0-generate-002',
                  size: size,
                  aspect_ratio: aspectRatio,
                  n: 1
              }),
              signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
              console.warn('[Gemini] HTTP error:', res.status);
              return null; // Safe fallback - don't throw
          }

          let data;
          try { data = await res.json(); } catch (e) {
              console.warn('[Gemini] Invalid response');
              return null;
          }

          const imageUrl = data?.url || data?.image || data?.b64_json ||
              (Array.isArray(data?.data) && data.data[0]?.url) ||
              (Array.isArray(data?.data) && data.data[0]?.b64_json);

          if (!imageUrl) {
              console.warn('[Gemini] No image returned');
              return null;
          }

          return imageUrl;
      } catch (err) {
          console.warn('[Gemini] Caught error:', err.message);
          return null; // Safe fallback - never crash pipeline
      }
  }

  // REPLICATE FLUX SCHNELL: Direct call to /api/visualize-flux endpoint
  async function callReplicateFluxSchnell(prompt, size = '1792x1024', timeout = 125000) {
      // Default to 16:9 landscape for cinematic presentation
      // Only use 1:1 if explicitly requested via size parameter
      const aspectRatio = size === '1024x1024' ? '1:1' : '16:9';

      // Step 1: Create prediction (POST)
      const createRes = await fetch('/api/visualize-flux', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              prompt: prompt,
              input: {
                  aspect_ratio: aspectRatio,
                  go_fast: true,
                  num_outputs: 1,
                  output_format: 'webp',
                  output_quality: 80
              }
          })
      });

      if (!createRes.ok) {
          const errData = await createRes.json().catch(() => null);
          throw new Error(errData?.error || `Replicate HTTP ${createRes.status}`);
      }

      let createData;
      try { createData = await createRes.json(); } catch (e) { throw new Error('Replicate invalid response'); }

      const predictionId = createData?.id;
      if (!predictionId) {
          throw new Error('Replicate returned no prediction ID');
      }

      // Step 2: Poll for completion (GET)
      const maxAttempts = 20;
      const pollInterval = 1500;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(r => setTimeout(r, pollInterval));

          const pollRes = await fetch(`/api/visualize-flux?id=${encodeURIComponent(predictionId)}`);

          if (!pollRes.ok) {
              const errData = await pollRes.json().catch(() => null);
              throw new Error(errData?.error || `Replicate poll HTTP ${pollRes.status}`);
          }

          let pollData;
          try { pollData = await pollRes.json(); } catch (e) { continue; }

          if (pollData.status === 'succeeded') {
              const imageUrl = pollData?.image || pollData?.url ||
                  (Array.isArray(pollData?.output) && pollData.output[0]);

              if (!imageUrl) {
                  throw new Error('Replicate returned no image');
              }
              return imageUrl;
          }

          if (pollData.status === 'failed') {
              throw new Error(pollData?.error || 'Replicate prediction failed');
          }

          // Continue polling for 'starting', 'processing', etc.
      }

      throw new Error('Replicate prediction timed out after 20 attempts');
  }

  // FALLBACK CHAIN: Unified image generation with provider fallbacks
  // All image generation MUST route through this function
  // Provider order: Replicate FLUX Schnell → Flux → Perchance → Gemini → OpenAI
  // Default to 16:9 landscape for cinematic presentation
  async function generateImageWithFallback({ prompt, tier, shape = 'landscape', context = 'visualize' }) {
      const normalizedTier = (tier || 'Naughty').toLowerCase();
      const isExplicitTier = normalizedTier === 'erotic' || normalizedTier === 'dirty';

      // Determine size based on shape (default landscape 16:9)
      const size = shape === 'portrait' ? '1024x1024' : '1792x1024';

      // PASS 2E: Clamp prompt length BEFORE any processing
      const clampedPrompt = clampPromptLength(prompt);

      // Prepare prompts for different provider requirements
      const eroticPrompt = clampPromptLength(restoreEroticLanguage(clampedPrompt));
      const sanitizedPrompt = clampPromptLength(sanitizeImagePrompt(clampedPrompt));

      // All providers now use sanitized prompts for stability
      // Explicit content belongs in prose, not images
      const basePrompt = sanitizedPrompt;

      // STABLE PROVIDER CHAIN: Gemini (primary) → OpenAI (fallback) → Replicate (last resort)
      // Perchance removed for stability. Replicate failures fail silently.
      const providerChain = [
          // GEMINI PRIMARY - reliable, sanitized prompts
          { name: 'Gemini', fn: callGeminiImageGen, prompt: sanitizedPrompt },
          // OPENAI FALLBACK - reliable, sanitized prompts
          { name: 'OpenAI', fn: callOpenAIImageGen, prompt: sanitizedPrompt },
          // REPLICATE LAST RESORT - allowed to fail silently
          { name: 'Replicate', fn: callReplicateFluxSchnell, prompt: sanitizedPrompt }
      ];

      let lastError = null;

      // FALLBACK CHAIN: Try each provider in order
      for (const provider of providerChain) {
          try {
              logImageAttempt(provider.name, context, provider.prompt, 'ATTEMPTING');
              const imageUrl = await provider.fn(provider.prompt, size);

              // Handle null returns from safe providers (Gemini/OpenAI)
              if (!imageUrl) {
                  logImageAttempt(provider.name, context, provider.prompt, 'FAILED', 'returned null');
                  continue; // Try next provider
              }

              logImageAttempt(provider.name, context, provider.prompt, 'SUCCESS');
              return imageUrl;
          } catch (e) {
              lastError = e;
              logImageAttempt(provider.name, context, provider.prompt, 'FAILED', e.message);
              // Continue to next provider in chain
          }
      }

      // All providers failed - fail silently, story continues
      console.warn('[Image] All providers failed:', lastError?.message || 'unknown');
      return null;
  }

  // Legacy wrapper for backward compatibility
  async function generateTieredImage(basePrompt, tier) {
      return generateImageWithFallback({
          prompt: basePrompt,
          tier: tier,
          shape: 'portrait',
          context: 'visualize'
      });
  }

  // Filter "The Author" from any image prompt
  function filterAuthorFromPrompt(prompt) {
      return prompt.replace(/\bThe Author\b/gi, '').replace(/\bAuthor\b/gi, '').replace(/\s+/g, ' ').trim();
  }

  // Initialize Visualize modifier interaction (scrolling suggestions)
  function initVizModifierPills() {
      const modifierInput = document.getElementById('vizModifierInput');
      const promptInput = document.getElementById('vizPromptInput');

      if (!modifierInput || !promptInput) return;

      // When user submits modifier (Enter key), append to prompt
      modifierInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault();
              const mod = modifierInput.value.trim();
              if (mod) {
                  const current = promptInput.value.trim();
                  if (current) {
                      promptInput.value = current + ', ' + mod;
                  } else {
                      promptInput.value = mod;
                  }
                  modifierInput.value = '';
                  // Re-show scrolling suggestions
                  const placeholder = document.querySelector('.rotating-placeholder[data-for="vizModifierInput"]');
                  if (placeholder) placeholder.classList.remove('hidden');
              }
          }
      });
  }

  // Reset modifier UI when modal opens
  function resetVizModifierUI() {
      const modifierInput = document.getElementById('vizModifierInput');
      const placeholder = document.querySelector('.rotating-placeholder[data-for="vizModifierInput"]');
      if (modifierInput) modifierInput.value = '';
      if (placeholder) placeholder.classList.remove('hidden');
  }

  // Initialize modifier pills on DOMContentLoaded
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVizModifierPills);
  } else {
      initVizModifierPills();
  }

  // ============================================================
  // SCENE VISUALIZATION BUDGET SYSTEM
  // Limits re-visualizations to 2 per scene, finalizes on insert
  // Scene key = turnCount (stable identifier for narrative moments)
  // ============================================================

  function getSceneKey() {
      // Use turnCount as scene identifier - increments with each player action
      return 'turn_' + (state.turnCount || 0);
  }

  function getSceneBudget(sceneKey) {
      if (!state.visual.sceneBudgets) state.visual.sceneBudgets = {};
      if (!state.visual.sceneBudgets[sceneKey]) {
          // Track attempts (incremented at START of visualize, not on success)
          // Max 2 attempts allowed (attempt 1 = first try, attempt 2 = last chance)
          state.visual.sceneBudgets[sceneKey] = { attempts: 0, finalized: false };
      }
      // Migration: convert old 'remaining' format to new 'attempts' format
      const budget = state.visual.sceneBudgets[sceneKey];
      if (budget.remaining !== undefined && budget.attempts === undefined) {
          budget.attempts = 2 - budget.remaining;
          delete budget.remaining;
      }
      return budget;
  }

  function incrementSceneAttempts(sceneKey) {
      const budget = getSceneBudget(sceneKey);
      budget.attempts = (budget.attempts || 0) + 1;
      saveStorySnapshot();
      return budget.attempts;
  }

  function getAttemptsRemaining(sceneKey) {
      const budget = getSceneBudget(sceneKey);
      return Math.max(0, 2 - (budget.attempts || 0));
  }

  function finalizeScene(sceneKey) {
      const budget = getSceneBudget(sceneKey);
      budget.finalized = true;
      saveStorySnapshot();
  }

  function updateVizButtonStates() {
      const sceneKey = getSceneKey();
      const budget = getSceneBudget(sceneKey);
      const remaining = getAttemptsRemaining(sceneKey);

      const vizBtn = document.getElementById('vizSceneBtn');
      const retryBtn = document.getElementById('vizRetryBtn');

      if (vizBtn) {
          if (budget.finalized) {
              vizBtn.textContent = '🔒 Finalized';
              vizBtn.disabled = true;
              vizBtn.style.opacity = '0.5';
              vizBtn.style.cursor = 'not-allowed';
          } else if (remaining <= 0) {
              vizBtn.textContent = '✨ Visualize (0)';
              vizBtn.disabled = true;
              vizBtn.style.opacity = '0.5';
              vizBtn.style.cursor = 'not-allowed';
          } else {
              vizBtn.textContent = `✨ Visualize (${remaining})`;
              vizBtn.disabled = false;
              vizBtn.style.opacity = '1';
              vizBtn.style.cursor = 'pointer';
          }
      }

      if (retryBtn) {
          if (budget.finalized) {
              retryBtn.textContent = 'Finalized';
              retryBtn.disabled = true;
          } else if (remaining <= 0) {
              retryBtn.textContent = 'Re-Visualize (0)';
              retryBtn.disabled = true;
          } else {
              retryBtn.textContent = `Re-Visualize (${remaining})`;
              retryBtn.disabled = false;
          }
      }
  }

  window.visualize = async function(isRe){
      if (_vizInFlight) return;

      const modal = document.getElementById('vizModal');
      const retryBtn = document.getElementById('vizRetryBtn');
      const img = document.getElementById('vizPreviewImg');
      const ph = document.getElementById('vizPlaceholder');
      const errDiv = document.getElementById('vizError');
      const storyText = document.getElementById('storyText');

      // Check scene budget before proceeding
      const sceneKey = getSceneKey();
      const budget = getSceneBudget(sceneKey);
      const remaining = getAttemptsRemaining(sceneKey);

      // Block if scene is finalized
      if (budget.finalized) {
          if(modal) modal.classList.remove('hidden');
          if(errDiv) {
              errDiv.textContent = 'Scene finalized. Image already inserted.';
              errDiv.classList.remove('hidden');
          }
          updateVizButtonStates();
          return;
      }

      // Block if all attempts exhausted (attempts >= 2)
      if (remaining <= 0) {
          if(modal) modal.classList.remove('hidden');
          if(errDiv) {
              errDiv.textContent = "You've used all visualize attempts for this scene.";
              errDiv.classList.remove('hidden');
          }
          updateVizButtonStates();
          return;
      }

      // INCREMENT ATTEMPTS NOW (before generation starts - closes Cancel loophole)
      const currentAttempt = incrementSceneAttempts(sceneKey);
      const isLastAttempt = currentAttempt >= 2;

      _vizInFlight = true;
      _vizCancelled = false;

      if (!img) { _vizInFlight = false; return; }

      // Reset modifier UI when opening modal
      resetVizModifierUI();

      if(modal) modal.classList.remove('hidden');
      if(retryBtn) retryBtn.disabled = true;

      // Show last-chance warning if this is attempt 2
      if (isLastAttempt && errDiv) {
          errDiv.textContent = '⚠️ This is your last chance to visualize this scene.';
          errDiv.style.color = 'var(--gold)';
          errDiv.classList.remove('hidden');
      }

      // Update button states to reflect current budget
      updateVizButtonStates();

      // Start cancellable loading with cancel callback
      startLoading("Painting the scene...", VISUALIZE_LOADING_MESSAGES, true, () => {
          _vizCancelled = true;
      });

      const allStoryContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ');
      const lastText = allStoryContent.slice(-600) || "";
      await ensureVisualBible(allStoryContent);

      // Check if cancelled during bible build
      if (_vizCancelled) {
          _vizInFlight = false;
          if(retryBtn) retryBtn.disabled = false;
          return;
      }

      const anchorText = buildVisualAnchorsText();

      img.onload = null; img.onerror = null;
      img.style.display = 'none';
      if(ph) ph.style.display = 'flex';
      if(errDiv) errDiv.classList.add('hidden');

      try {
          let promptMsg = document.getElementById('vizPromptInput').value;
          // Get intensity bias for prompt generation
          const intensityBias = getVisualizeIntensityBias();

          if(!isRe || !promptMsg) {
              try {
                  promptMsg = await Promise.race([
                      callChat([{
                          role:'user',
                          content:`${anchorText}\n\nYou are writing an image prompt. Follow these continuity anchors strictly. Describe this scene for an image generator. Maintain consistent character details and attire.\n\nINTENSITY GUIDANCE: ${intensityBias}\n\nReturn only the prompt: ${lastText}`
                      }]),
                      new Promise((_, reject) => setTimeout(() => reject(new Error("Prompt timeout")), 25000))
                  ]);
              } catch (e) {
                  promptMsg = "Fantasy scene, detailed, atmospheric.";
              }
              document.getElementById('vizPromptInput').value = promptMsg;
          }

          // Check if cancelled during prompt generation
          if (_vizCancelled) {
              _vizInFlight = false;
              if(retryBtn) retryBtn.disabled = false;
              return;
          }

          // Build base prompt with intensity bias, quality defaults, and veto exclusions (filter "The Author")
          const modifierInput = document.getElementById('vizModifierInput');
          const userModifiers = modifierInput ? modifierInput.value.trim() : '';

          // Include veto exclusions in visual prompt (e.g., "no blondes" should affect hair color)
          const vetoExclusions = state.veto?.excluded?.length > 0
              ? " Exclude: " + state.veto.excluded.slice(0, 3).join(', ') + "."
              : "";

          // SCENE-FIRST PROMPT CONSTRUCTION
          // Hard cap scene description to 256 characters (no ellipses, no rephrasing)
          const sceneDesc = filterAuthorFromPrompt(promptMsg).slice(0, 256);
          const modifiers = userModifiers ? " " + filterAuthorFromPrompt(userModifiers) : "";

          // Brief anchors from visual bible (characters only, 100 char max)
          const briefAnchors = filterAuthorFromPrompt(anchorText).slice(0, 100);

          // Shortened quality/intensity (clarity over verbosity)
          const shortQuality = "Attractive, elegant features, natural expressions.";
          const shortIntensity = intensityBias.split('.')[0] + "."; // First sentence only

          // SCENE FIRST, then anchors/style
          let basePrompt = sceneDesc + modifiers +
              "\n---\n" +
              "Style: cinematic, painterly, no text. " +
              shortQuality + " " +
              shortIntensity +
              vetoExclusions +
              (briefAnchors ? " " + briefAnchors : "");

          // Check if cancelled before image generation
          if (_vizCancelled) {
              _vizInFlight = false;
              if(retryBtn) retryBtn.disabled = false;
              return;
          }

          // TIER-BASED IMAGE ENGINE ROUTING
          // Clean/Naughty → OpenAI (sanitized prompt)
          // Erotic/Dirty → Perchance (restored prompt) with OpenAI fallback
          const currentTier = state.intensity || 'Naughty';
          const rawUrl = await generateTieredImage(basePrompt, currentTier);

          // Check if cancelled after image generation
          if (_vizCancelled) {
              _vizInFlight = false;
              if(retryBtn) retryBtn.disabled = false;
              return;
          }

          if (!rawUrl) throw new Error("Image generation failed.");

          let imageUrl = rawUrl;
          if (!rawUrl.startsWith('http') && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:')) {
              imageUrl = `data:image/png;base64,${rawUrl}`;
          }

          img.src = imageUrl;

          await new Promise((resolve, reject) => {
              // Add timeout for image load
              const loadTimeout = setTimeout(() => {
                  reject(new Error("Image load timeout"));
              }, 30000);

              img.onload = () => {
                  clearTimeout(loadTimeout);
                  img.style.display = 'block';
                  if(ph) ph.style.display = 'none';
                  // Don't store base64 images to avoid QuotaExceededError
                  // Only store external URLs (not data: or blob:)
                  if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
                      state.visual.lastImageUrl = img.src;
                  } else {
                      state.visual.lastImageUrl = ''; // Clear to prevent storage overflow
                  }
                  if (state.visual.autoLock && !state.visual.locked) state.visual.locked = true;

                  // Attempts already incremented at start - just update UI
                  updateVizButtonStates();

                  saveStorySnapshot();
                  resolve();
              };
              img.onerror = () => {
                  clearTimeout(loadTimeout);
                  reject(new Error("Image failed to render"));
              };
          });

      } catch(e) {
          // Don't show error if cancelled
          if (!_vizCancelled) {
              console.error("Visualize error:", e);
              if(errDiv) {
                  errDiv.innerText = "Visualization failed. Fate is cloudy.";
                  errDiv.classList.remove('hidden');
              }
              if(ph) ph.style.display = 'none';
          }
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

      // Finalize scene on insert - no more visualizations allowed
      const sceneKey = getSceneKey();
      finalizeScene(sceneKey);

      // Append visualized image to current page
      const imgHtml = `<img src="${img.src}" class="story-image" alt="Visualized scene">`;
      StoryPagination.appendToCurrentPage(imgHtml);

      // Update button states to reflect finalized status
      updateVizButtonStates();

      window.closeViz();
      saveStorySnapshot();
  };

  // --- GAME LOOP ---
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

      startLoading("Fate is weaving...", STORY_LOADING_MESSAGES);

      // Get story context from all pages
      const allContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ');
      const context = allContent.slice(-3000);
      
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

      // Build stronger squash directive, especially if Fate Card was used
      const fateCardUsed = selectedFateCard && selectedFateCard.title;
      const squashDirective = `CRITICAL REINTERPRETATION RULE:
- NEVER repeat the player's action or dialogue verbatim in your response.
- ALWAYS reinterpret their intent into the story's voice, tone, and character.
- Transform their words into the narrative style of this story.
- If they write "I kiss him", describe a kiss in your literary voice.
- If they write clunky dialogue, render it as the character would actually speak.
- The player provides intent. You provide craft.${fateCardUsed ? `

FATE CARD ADAPTATION (CRITICAL):
- The player used a Fate Card "${selectedFateCard.title}" - their input reflects that card's suggestion.
- You MUST transform the Fate Card text completely into your own prose.
- DO NOT echo phrases like "${(act || '').slice(0, 30)}..." verbatim.
- The Fate Card is a prompt, not a script. Capture the ESSENCE, never the exact words.
- Write as if YOU conceived this beat, not as if you're following a template.` : ''}`;
      
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

      // Flag to track if story was successfully displayed (prevents false positive errors)
      let storyDisplayed = false;

      try {
          /**
           * =================================================================
           * AI MODEL ORCHESTRATION — TURN GENERATION
           * =================================================================
           *
           * For Erotic/Dirty intensity levels with ENABLE_ORCHESTRATION:
           *   Uses full 3-phase flow (ChatGPT → optional Grok → ChatGPT)
           *
           * For Clean/Naughty or when orchestration disabled:
           *   Uses single-model flow (ChatGPT as primary author)
           *
           * The orchestration flow ensures:
           * - ChatGPT ALWAYS decides plot and outcomes
           * - Specialist renderer (if used) only handles sensory embodiment
           * - Monetization gates are enforced pre-render
           * - Renderer failure does NOT corrupt story state
           * =================================================================
           */
          const useFullOrchestration = ENABLE_ORCHESTRATION &&
                                       window.StoryboundOrchestration &&
                                       ['Erotic', 'Dirty'].includes(state.intensity);

          let raw;

          if (useFullOrchestration) {
              // Full 3-phase orchestration: ChatGPT → optional Grok → ChatGPT
              raw = await generateOrchestatedTurn({
                  systemPrompt: fullSys,
                  storyContext: context,
                  playerAction: act,
                  playerDialogue: dia,
                  fateCard: selectedFateCard,
                  onPhaseChange: (phase, data) => {
                      // Update loading message based on phase
                      if (phase === 'AUTHOR_PASS') {
                          updateLoadingMessage('Fate is weaving the plot...');
                      } else if (phase === 'RENDER_PASS') {
                          updateLoadingMessage('Fate is embodying the moment...');
                      } else if (phase === 'INTEGRATION_PASS') {
                          updateLoadingMessage('Fate is sealing the consequences...');
                      }
                  }
              });
          } else {
              // Single-model flow (ChatGPT as primary author)
              raw = await callChat([
                  {role:'system', content: fullSys},
                  {role:'user', content: `Action: ${act}\nDialogue: "${dia}"`}
              ]);
          }

          // Validate response shape before marking as success
          if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
              throw new Error('Invalid response: empty or malformed story text');
          }

          state.turnCount++;

          // Update visualization button states for new scene
          updateVizButtonStates();

          // Build new page content
          let pageContent = '';

          // FIX #1: Fate Card separator shows ONLY title icon, no descriptive text
          if (selectedFateCard && selectedFateCard.title) {
              pageContent += `<div class="fate-card-separator"><div class="fate-mini"><h4>${escapeHTML(selectedFateCard.title)}</h4></div></div>`;
          }

          // FIX #2: Removed user dialogue block - AI alone narrates the action
          // User input is passed to AI but not rendered as prose to avoid duplication

          // Add AI response only
          pageContent += formatStory(raw);

          // Add new page with animation
          StoryPagination.addPage(pageContent, true);

          // CRITICAL: Mark story as displayed AFTER successful DOM insertion
          storyDisplayed = true;

          // Scroll to Fate Card header so player can pick next card
          try {
              const fateHeader = document.getElementById('fateCardHeader');
              if (fateHeader) {
                  fateHeader.scrollIntoView({behavior:'smooth', block:'start'});
              }
          } catch(scrollErr) {
              console.warn('Scroll failed (non-critical):', scrollErr);
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

          // Fate Card Deal - deal fresh cards each turn for interaction
          // Wrapped to prevent false positive errors
          try {
              if (window.dealFateCards) {
                  window.dealFateCards();
                  if (state.batedBreathActive && state.fateOptions) {
                      state.fateOptions = filterFateCardsForBatedBreath(state.fateOptions);
                  }
              }
          } catch(fateErr) {
              console.warn('Fate card deal failed (non-critical):', fateErr);
          }

          saveStorySnapshot();
          checkStoryEndCaps();

          $('actionInput').value = '';
          $('dialogueInput').value = '';

          if(state.mode === 'couple') {
              broadcastTurn(raw);
          }

      } catch(e) {
          console.error('Turn submission error:', e);
          // Only show error alert if story was NOT successfully displayed
          if (!storyDisplayed) {
              alert("Fate was silent. Try again.");
          }
      } finally {
          stopLoading();
      }
  });

  function formatStory(text, shouldEscape = false){
      const process = shouldEscape ? escapeHTML : (s => s);
      return text.split('\n').map(p => {
          if(!p.trim()) return '';
          const safe = process(p);

          // CORRECTIVE: Fix dialogue colorization leak
          // Only style the quoted text itself, not the dialogue tag that follows
          // Pattern: match "quoted text" and style only the quote
          const formatted = safe.replace(/"([^"]*)"/g, (match, quote) => {
              return `<span class="story-dialogue">"${quote}"</span>`;
          });

          // If the line is entirely dialogue, use dialogue class on the paragraph
          if(p.trim().startsWith('"') && p.trim().endsWith('"')) {
              return `<p class="story-dialogue">${safe}</p>`;
          }
          return `<p>${formatted}</p>`;
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
