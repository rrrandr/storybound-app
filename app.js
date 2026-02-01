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

  // AUTHOR MODEL: ChatGPT is the ONLY model for story authoring
  // Grok must NEVER be used for DSP, normalization, veto, or story logic
  // Legacy STORY_MODEL removed - all story logic routes through ChatGPT orchestration 
  
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
          const settingShotWrap = document.getElementById('settingShotWrap');
          const sceneNumberEl = document.getElementById('sceneNumber');

          // Update scene number based on current page
          if (sceneNumberEl) {
              sceneNumberEl.textContent = 'Scene ' + (currentPageIndex + 1);
          }

          if (currentPageIndex === 0) {
              // Page 1: Full display (no setting image in Scene 1)
              if (titleEl) titleEl.style.fontSize = '';
              if (settingShotWrap) settingShotWrap.style.display = 'none';
          } else {
              // Page 2+: Compact display
              if (titleEl) titleEl.style.fontSize = '1.2em';
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
  // STORY WORLD TAXONOMY
  // =========================
  // Maps internal world codes to human-first labels
  // Fantasy worlds represent invented magical worlds only (not real-world mythology)
  // World flavor label mappings for UI display
  const WORLD_LABELS = {
      // Modern Flavors
      small_town: 'Small Town',
      college: 'College',
      friends: 'Friends',
      old_money: 'Old Money',
      office: '9-5 / Office',
      supernatural_modern: 'Supernatural Modern',
      superheroic_modern: 'Superheroic Modern',
      // Sci-Fi Flavors
      space_opera: 'Star-Spanning Civilizations',
      hard_scifi: 'Future Built on Science',
      cyberpunk: 'Neon Futures',
      post_human: 'Post-Human',
      alien_contact: 'First Contact',
      abundance_collapse: 'Abundance or Collapse',
      // Fantasy Flavors (invented magical worlds, not mythology)
      enchanted_realms: 'Enchanted Realms',
      hidden_magic: 'Hidden Magic',
      cursed_corrupt: 'Cursed & Corrupt Worlds',
      // Dystopia Flavors
      authoritarian: 'Authoritarian',
      surveillance: 'Surveillance',
      corporate: 'Corporate',
      environmental: 'Environmental',
      // Post-Apocalyptic Flavors
      nuclear: 'Nuclear Aftermath',
      pandemic: 'Pandemic Collapse',
      climate: 'Climate Ruin',
      technological: 'Technological Fallout',
      slow_decay: 'Slow Civilizational Decay'
  };

  function getWorldLabel(worldCode) {
      return WORLD_LABELS[worldCode] || worldCode;
  }

  // =========================
  // RUNTIME NORMALIZATION PROMPT
  // =========================
  // This prompt is executed by ChatGPT at runtime for IP canonicalization.
  // DO NOT MODIFY. This is authoritative and verbatim.
  const RUNTIME_NORMALIZATION_PROMPT = `You are a canonicalization and normalization engine for Storybound.

You do NOT write prose.
You do NOT invent lore.
You do NOT explain decisions.
You do NOT output copyrighted or public-domain fictional IP.

Your only task is to transform raw user-authored text into
canonical, IP-safe, Storybound-compatible instructions.
If a protected or recognizable name is detected with HIGH confidence,
you must remove the ENTIRE name, including generic first names.
Never output partial names or name fragments.

--------------------------------
GENERAL RULES (NON-NEGOTIABLE)
--------------------------------

1. Ignore proper nouns as references, not as content.
2. Extract experiential intent, not named franchises.
3. Never output real or fictional character names from known works.
4. Never output franchise, book, movie, or universe names.
5. Output must conform strictly to the allowed categories provided.
6. If normalization is ambiguous, choose the closest safe archetype.
7. Do NOT ask questions. Do NOT request clarification.
8. If output violates rules, regenerate silently until compliant.
9. If a protected or recognizable name is detected with HIGH confidence,
   you must remove the ENTIRE name.
   Never output partial names, fragments, or generic first names
   (e.g. "Luke", "Harry", "Neo") when they originate from protected IP.

--------------------------------
CONFIDENCE-BASED CANONICALIZATION
--------------------------------

Assess whether the user_text references a known fictional character,
franchise, or setting.

- LOW confidence (<0.30):
  → Return text EXACTLY as entered. No changes.

- MEDIUM confidence (0.30–0.65):
  → Return text EXACTLY as entered unless MULTIPLE reinforcing signals.

- HIGH confidence (≥0.65):
  → ONLY if clearly recognizable protected IP:
     - preserve cadence and vibe
     - remove recognizability
     - output an original equivalent

--------------------------------
CHARACTER NAME NORMALIZATION (axis == "character")
--------------------------------

CRITICAL: Be EXTREMELY conservative. Most names should pass through UNCHANGED.

ONLY modify a name if ALL conditions are met:
1. The name is a KNOWN protected IP character (Harry Potter, Luke Skywalker, etc.)
2. Confidence is HIGH (≥0.65)
3. The name is clearly recognizable as that IP character

DO NOT MODIFY:
- Real-sounding full names (e.g., "Cassandra Cassidy" → keep as-is)
- Common first names alone (e.g., "Cole" → keep as-is)
- Names that merely RESEMBLE IP but aren't exact matches
- Any name where you have doubt

NEVER:
- Shorten names (e.g., "Cassandra" → "Cass" is WRONG)
- Expand names (e.g., "Cole" → "Caden" is WRONG)
- "Improve" or "clean up" names
- Change names for stylistic reasons

If confidence < 0.65 OR any doubt exists → return EXACTLY what was entered.

Examples of CORRECT handling:
- "Harry Potter" → "Harlan Potts" (HIGH confidence IP)
- "Luke Skywalker" → "Lucas Skye" (HIGH confidence IP)
- "Cassandra Cassidy" → "Cassandra Cassidy" (NOT IP - keep exact)
- "Cole" → "Cole" (common name - keep exact)
- "Sarah" → "Sarah" (common name - keep exact)
- "Draco" → "Draco" (could be IP, but alone is ambiguous - keep exact)
- "Bella Swan" → "Bella Swan" or normalize (MEDIUM confidence - lean toward keeping)

--------------------------------
WORLD SUBTYPE NORMALIZATION
--------------------------------

If axis == "world_subtype":

- Ignore all proper nouns.
- Use allowed_subtypes only.
- Output:
  - one primary subtype (required)
  - one secondary subtype (optional)
- Never invent new subtypes.
- Never output IP.

--------------------------------
TOOL-SPECIFIC RULES
--------------------------------

If axis == "veto":
- Normalize the TARGET of the veto, not the wording.

If axis == "quill":
- Normalize BEFORE applying rename or rewrite.
- Never allow IP to enter canon.

If axis == "god_mode":
- Apply the same rules.
- God Mode does NOT bypass normalization.

--------------------------------
OUTPUT FORMAT (STRICT)
--------------------------------

Return JSON only.

For names:
{
  "normalized_text": "string",
  "confidence_level": "low | medium | high"
}

For world subtype:
{
  "primary_subtype": "string",
  "secondary_subtype": "string | null"
}

For veto/quill/god_mode:
{
  "canonical_instruction": "string"
}`;

  // =========================
  // RUNTIME NORMALIZATION LAYER
  // =========================
  // Calls ChatGPT with the normalization prompt for IP-safe canonicalization.
  // All user-authored text affecting canon MUST route through this.

  /**
   * Call the runtime normalization layer (ChatGPT) for canonicalization.
   * ROUTES TO OPENAI via /api/chatgpt-proxy - NEVER uses Grok.
   * @param {Object} params - { axis, selected_world, allowed_subtypes, user_text, context_signals }
   * @returns {Promise<Object>} - Normalized response JSON
   */
  async function callNormalizationLayer(params) {
      const { axis, selected_world = null, allowed_subtypes = [], user_text, context_signals = [] } = params;

      // SINGLE-FLIGHT LOCK: Only one normalization request at a time
      if (_normalizationInFlight) {
          console.warn('[NORMALIZATION] Request blocked — another normalization in flight');
          return { ok: false, reason: 'IN_FLIGHT', normalized_text: user_text || '' };
      }

      if (!user_text || typeof user_text !== 'string' || !user_text.trim()) {
          // Empty input - return passthrough
          return axis === 'world_subtype'
              ? { primary_subtype: null, secondary_subtype: null }
              : { normalized_text: user_text || '', confidence_level: 'low' };
      }

      const payload = {
          axis,
          selected_world,
          allowed_subtypes,
          user_text,
          context_signals
      };

      // Determine normalization role based on axis
      // FIXED: Always use 'NORMALIZATION' role to trigger backend system prompt
      const normalizationRole = 'NORMALIZATION';

      // ACQUIRE SINGLE-FLIGHT LOCK
      _normalizationInFlight = true;

      try {
          // CRITICAL: Use ChatGPT proxy, NOT Grok proxy
          // NO FALLBACKS - errors must fail loudly
          const res = await fetch('/api/chatgpt-proxy', {
              credentials: 'same-origin',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  role: normalizationRole,
                  mode: state.mode || 'solo',
                  model: 'gpt-4o-mini',
                  messages: [
                      { role: 'system', content: RUNTIME_NORMALIZATION_PROMPT },
                      { role: 'user', content: JSON.stringify(payload) }
                  ],
                  temperature: 0,
                  max_tokens: 500
              })
          });

          // HTTP 429 CHECK — TERMINAL FAILURE, NO RETRY
          const rateLimitErr = checkRateLimit(res, 'normalization');
          if (rateLimitErr) {
              throw rateLimitErr;
          }

          if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              const errorMsg = `[NORMALIZATION FAILED] HTTP ${res.status}: ${errorData.error || errorData.details || 'Unknown error'}`;
              console.error(errorMsg);
              throw new Error(errorMsg);
          }

          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;

          if (!content) {
              const errorMsg = '[NORMALIZATION FAILED] No content in API response';
              console.error(errorMsg);
              throw new Error(errorMsg);
          }

          // Parse JSON response
          try {
              const parsed = JSON.parse(content.trim());
              return parsed;
          } catch (e) {
              // Try to extract JSON from response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                  return JSON.parse(jsonMatch[0]);
              }
              const errorMsg = `[NORMALIZATION FAILED] Invalid JSON response: ${content.slice(0, 100)}`;
              console.error(errorMsg);
              throw new Error(errorMsg);
          }
      } finally {
          // RELEASE SINGLE-FLIGHT LOCK
          _normalizationInFlight = false;
      }
  }

  // ==========================================================================
  // FALLBACK NORMALIZATION REMOVED — DISABLED PER AUTHORITATIVE DIRECTIVE
  // ==========================================================================
  // All normalization MUST go through /api/chatgpt-proxy.
  // Silent pass-through is forbidden.
  // If normalization fails, the action is blocked.

  // Expose runtime normalization layer
  window.callNormalizationLayer = callNormalizationLayer;

  // =========================
  // IP DETECTION PATTERNS (FOR REFERENCE ONLY)
  // =========================
  // These patterns are used by the runtime normalization layer.
  // Local canonicalization is DISABLED - all requests go to OpenAI.

  // IP detection patterns with confidence scores (0-1)
  // Higher confidence = more likely to be protected IP
  const IP_PATTERNS = [
      // High confidence (≥0.65) - Iconic characters
      { pattern: /\b(luke\s*skywalker|darth\s*vader|princess\s*leia|han\s*solo|obi.?wan|yoda|anakin|padme|chewbacca)\b/i, confidence: 0.85, franchise: 'starwars' },
      { pattern: /\b(harry\s*potter|hermione|ron\s*weasley|dumbledore|voldemort|snape|hagrid|draco\s*malfoy)\b/i, confidence: 0.85, franchise: 'harrypotter' },
      { pattern: /\b(frodo|gandalf|aragorn|legolas|gimli|sauron|gollum|bilbo|samwise)\b/i, confidence: 0.80, franchise: 'lotr' },
      { pattern: /\b(katniss|peeta|gale|haymitch|effie|snow|finnick)\b/i, confidence: 0.75, franchise: 'hungergames' },
      { pattern: /\b(batman|superman|wonder\s*woman|spider.?man|iron\s*man|captain\s*america|thor|hulk|wolverine)\b/i, confidence: 0.80, franchise: 'comics' },
      { pattern: /\b(james\s*bond|007)\b/i, confidence: 0.75, franchise: 'bond' },
      { pattern: /\b(sherlock\s*holmes|watson|moriarty)\b/i, confidence: 0.50, franchise: 'sherlock' },
      { pattern: /\b(dracula|frankenstein|jekyll|hyde)\b/i, confidence: 0.35, franchise: 'classic' },
      // Medium confidence (0.30-0.65) - Character names that could be common
      { pattern: /\b(daenerys|tyrion|cersei|jon\s*snow|arya\s*stark|jaime\s*lannister)\b/i, confidence: 0.70, franchise: 'got' },
      { pattern: /\b(bella\s*swan|edward\s*cullen|jacob\s*black)\b/i, confidence: 0.70, franchise: 'twilight' },
      { pattern: /\b(neo|morpheus|trinity)\b/i, confidence: 0.55, franchise: 'matrix' },
      { pattern: /\b(ripley|xenomorph)\b/i, confidence: 0.60, franchise: 'alien' },
      // Franchise/world markers (boost confidence when combined with names)
      { pattern: /\b(hogwarts|gryffindor|slytherin|hufflepuff|ravenclaw|quidditch)\b/i, confidence: 0.70, franchise: 'harrypotter', isContext: true },
      { pattern: /\b(jedi|sith|lightsaber|force\s*user|death\s*star|millennium\s*falcon)\b/i, confidence: 0.65, franchise: 'starwars', isContext: true },
      { pattern: /\b(middle.?earth|mordor|shire|rivendell|gondor|rohan)\b/i, confidence: 0.65, franchise: 'lotr', isContext: true },
      { pattern: /\b(gotham|metropolis|krypton|wakanda|asgard)\b/i, confidence: 0.60, franchise: 'comics', isContext: true },
      { pattern: /\b(westeros|kings.?landing|winterfell|iron\s*throne)\b/i, confidence: 0.65, franchise: 'got', isContext: true }
  ];

  // Name transformation rules - preserve cadence while removing recognizability
  const NAME_TRANSFORMS = {
      // First name transforms (phonetic similarity)
      'luke': ['Lucas', 'Lucan', 'Lucien'],
      'harry': ['Harlan', 'Harold', 'Harris'],
      'hermione': ['Harmonia', 'Helena', 'Helaine'],
      'frodo': ['Froderic', 'Florin', 'Faron'],
      'gandalf': ['Galdric', 'Galden', 'Greyward'],
      'aragorn': ['Arathorn', 'Aldric', 'Aradan'],
      'daenerys': ['Daenara', 'Daelia', 'Daena'],
      'katniss': ['Katara', 'Katrin', 'Kestrel'],
      'bella': ['Bellamy', 'Belinda', 'Bela'],
      'edward': ['Edwin', 'Edric', 'Edmund'],
      'neo': ['Nero', 'Neon', 'Nico'],
      'sherlock': ['Sheldon', 'Sherman', 'Sherwin'],
      // Surname transforms
      'skywalker': ['Skyrider', 'Starstrider', 'Skyborne'],
      'potter': ['Porter', 'Proctor', 'Pottinger'],
      'granger': ['Grantham', 'Granger-Hill', 'Graves'],
      'weasley': ['Wesley', 'Westley', 'Weatherby'],
      'baggins': ['Baggley', 'Bagwell', 'Baxter'],
      'targaryen': ['Tarandel', 'Taragorn', 'Taravyn'],
      'stark': ['Starke', 'Sterling', 'Stormborn'],
      'lannister': ['Lancaster', 'Landry', 'Lanford'],
      'swan': ['Swann', 'Swanley', 'Swanford'],
      'cullen': ['Callahan', 'Colton', 'Culver']
  };

  // Archetype transforms for concepts
  const ARCHETYPE_TRANSFORMS = {
      'frankenstein': { replacement: 'forbidden reanimator', contextPatterns: [/\b(lab|monster|creature|creation|doctor|science)\b/i] },
      'dracula': { replacement: 'ancient vampire lord', contextPatterns: [/\b(vampire|blood|castle|transylvania|undead)\b/i] },
      'jekyll': { replacement: 'dual-natured scientist', contextPatterns: [/\b(hyde|potion|transformation|split)\b/i] }
  };

  /**
   * Calculate IP confidence for a piece of text
   * @param {string} text - Input text to analyze
   * @returns {{ confidence: number, matches: Array, contextSignals: Array }}
   */
  function calculateIPConfidence(text) {
      if (!text || typeof text !== 'string') return { confidence: 0, matches: [], contextSignals: [] };

      const matches = [];
      const contextSignals = [];
      let maxConfidence = 0;
      let franchiseContext = new Set();

      IP_PATTERNS.forEach(({ pattern, confidence, franchise, isContext }) => {
          const match = text.match(pattern);
          if (match) {
              if (isContext) {
                  contextSignals.push({ match: match[0], franchise, confidence });
                  franchiseContext.add(franchise);
              } else {
                  matches.push({ match: match[0], franchise, confidence });
                  maxConfidence = Math.max(maxConfidence, confidence);
              }
          }
      });

      // Boost confidence if context signals reinforce character matches
      matches.forEach(m => {
          if (franchiseContext.has(m.franchise)) {
              m.confidence = Math.min(1, m.confidence + 0.15);
              maxConfidence = Math.max(maxConfidence, m.confidence);
          }
      });

      return { confidence: maxConfidence, matches, contextSignals };
  }

  /**
   * Transform a name while preserving cadence
   * @param {string} name - Original name
   * @returns {string} - Canonicalized name
   */
  function transformName(name) {
      if (!name) return name;

      const words = name.split(/\s+/);
      const transformed = words.map(word => {
          const lower = word.toLowerCase();
          const transforms = NAME_TRANSFORMS[lower];
          if (transforms && transforms.length > 0) {
              // Pick consistently based on hash to maintain stability
              const hash = lower.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
              return transforms[hash % transforms.length];
          }
          return word;
      });

      return transformed.join(' ');
  }

  /**
   * Transform archetype concepts
   * @param {string} text - Input text
   * @returns {string} - Transformed text
   */
  function transformArchetypes(text) {
      let result = text;

      Object.entries(ARCHETYPE_TRANSFORMS).forEach(([key, { replacement, contextPatterns }]) => {
          const keyPattern = new RegExp(`\\b${key}\\b`, 'gi');
          if (keyPattern.test(result)) {
              // Check if context patterns are present
              const hasContext = contextPatterns.some(cp => cp.test(result));
              if (hasContext) {
                  result = result.replace(keyPattern, replacement);
              }
          }
      });

      return result;
  }

  /**
   * MAIN CANONICALIZATION FUNCTION
   * All user-authored inputs MUST flow through this before committing to canon.
   *
   * @param {string} text - Raw user input
   * @param {Object} options - { source: 'veto'|'quill'|'godmode'|'character'|'dsp', worldContext: string[] }
   * @returns {string} - Canonicalized text safe for storage and prompts
   */
  function canonicalizeInput(text, options = {}) {
      if (!text || typeof text !== 'string') return text || '';

      const { source = 'unknown', worldContext = [] } = options;
      const { confidence, matches } = calculateIPConfidence(text);

      // LEVEL 0: confidence < 0.30 - Allow verbatim
      if (confidence < 0.30) {
          return text;
      }

      // LEVEL 1: confidence 0.30-0.65 - Allow unless contextual signals reinforce
      if (confidence < 0.65) {
          // Check for reinforcing context
          const hasWorldReinforcement = matches.some(m =>
              worldContext.some(w => w.toLowerCase().includes(m.franchise))
          );
          const isPrivilegedSource = source === 'quill' || source === 'godmode';

          // If no reinforcement and not from privileged source, allow
          if (!hasWorldReinforcement && !isPrivilegedSource) {
              return text;
          }
      }

      // LEVEL 2: confidence ≥ 0.65 - Soft-canonicalize
      let result = text;

      // Transform matched IP names
      matches.forEach(({ match }) => {
          const transformed = transformName(match);
          if (transformed !== match) {
              result = result.replace(new RegExp(escapeRegex(match), 'gi'), transformed);
          }
      });

      // Transform archetype concepts
      result = transformArchetypes(result);

      return result;
  }

  /**
   * Normalize free-form world description to canonical subtypes
   * @param {string} description - User's free-form world description
   * @param {string} worldCategory - 'scifi' | 'fantasy' | 'mythic'
   * @returns {{ primary: string, secondary: string|null }}
   */
  function normalizeWorldSubtype(description, worldCategory) {
      if (!description) return { primary: null, secondary: null };

      // First, strip any IP references
      const cleaned = canonicalizeInput(description, { source: 'world' });
      const lower = cleaned.toLowerCase();

      const SUBTYPE_SIGNALS = {
          scifi: {
              space_opera: ['empire', 'galactic', 'starship', 'fleet', 'interstellar', 'space battle', 'federation'],
              hard_scifi: ['physics', 'realistic', 'science', 'engineering', 'plausible', 'technical'],
              cyberpunk: ['neon', 'corporate', 'hacker', 'dystopia', 'augment', 'cyber', 'rain', 'noir'],
              post_human: ['transcend', 'upload', 'singularity', 'evolved', 'posthuman', 'ai consciousness'],
              alien_contact: ['alien', 'first contact', 'extraterrestrial', 'xeno', 'encounter'],
              abundance_collapse: ['utopia', 'abundance', 'collapse', 'post-scarcity', 'automated', 'end of work']
          },
          fantasy: {
              high_fantasy: ['magic', 'elf', 'elves', 'quest', 'enchant', 'fairy', 'mystical', 'wizard', 'kingdom'],
              low_fantasy: ['hidden magic', 'rare magic', 'grounded', 'subtle', 'secret power', 'dangerous magic'],
              dark_fantasy: ['grim', 'corrupt', 'curse', 'dark', 'horror', 'decay', 'cost', 'forbidden']
          },
          mythic: {
              greek_myth: ['greek', 'olymp', 'zeus', 'athena', 'hero', 'fate', 'hubris', 'oracle', 'titan'],
              norse_myth: ['norse', 'viking', 'odin', 'thor', 'ragnarok', 'rune', 'valhalla', 'frost'],
              egyptian_myth: ['egypt', 'pharaoh', 'nile', 'pyramid', 'afterlife', 'anubis', 'ra', 'isis'],
              biblical_myth: ['biblical', 'angel', 'prophet', 'covenant', 'divine law', 'heaven', 'apocalypse']
          }
      };

      const signals = SUBTYPE_SIGNALS[worldCategory] || {};
      const scores = {};

      Object.entries(signals).forEach(([subtype, keywords]) => {
          scores[subtype] = keywords.filter(kw => lower.includes(kw)).length;
      });

      // Sort by score
      const sorted = Object.entries(scores)
          .filter(([, score]) => score > 0)
          .sort((a, b) => b[1] - a[1]);

      return {
          primary: sorted[0] ? sorted[0][0] : null,
          secondary: sorted[1] && sorted[1][1] > 0 ? sorted[1][0] : null
      };
  }

  // Helper: Escape regex special characters
  function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Expose for use across tools
  window.canonicalizeInput = canonicalizeInput;
  window.normalizeWorldSubtype = normalizeWorldSubtype;
  window.calculateIPConfidence = calculateIPConfidence;

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
  // ARCHETYPE SYSTEM (CANONICAL — 7 ARCHETYPES)
  // Replaces legacy 11-archetype system.
  // Each character: 1 Primary + optional 1 Secondary.
  // Legacy mapping by relational function (not surface traits):
  //   GUARDIAN, SOVEREIGN → HEART_WARDEN
  //   ROMANTIC, CLOISTERED → OPEN_VEIN
  //   ENCHANTING, STRATEGIST → SPELLBINDER
  //   ROGUE → ARMORED_FOX
  //   DANGEROUS, ANTI_HERO → DARK_VICE
  //   BEAUTIFUL_RUIN → BEAUTIFUL_RUIN
  //   DEVOTED → ETERNAL_FLAME
  // =========================
  const ARCHETYPES = {
      HEART_WARDEN: {
          id: 'HEART_WARDEN',
          name: 'The Heart Warden',
          desireStyle: 'He positioned himself between her and the door without thinking — not from fear, but from certainty that nothing would reach her while he stood',
          summary: 'Protection is not a gesture but a gravitational constant. The Heart Warden builds walls around the people they love and calls it devotion. Safety is their language, control is their shadow, and tenderness arrives armored.',
          stressFailure: 'over-control, authoritarian protection'
      },
      OPEN_VEIN: {
          id: 'OPEN_VEIN',
          name: 'The Open Vein',
          desireStyle: 'Every emotion lived on the surface, unguarded — tenderness offered without condition, vulnerability worn like a second skin',
          summary: 'The Open Vein gives everything before it is asked. Love is not cautious here — it is hemorrhage, offering, surrender before the first wound. They feel too much, too soon, too visibly.',
          stressFailure: 'self-erasure, overexposure'
      },
      SPELLBINDER: {
          id: 'SPELLBINDER',
          name: 'The Spellbinder',
          desireStyle: 'Every glance felt deliberate, every silence a trap — the room bent toward them without knowing why',
          summary: 'The Spellbinder commands attention through presence alone. Charm is currency, and they spend it selectively — never by accident. Three moves ahead, they make surrender feel like your idea.',
          stressFailure: 'asymmetric attachment, selective honesty'
      },
      ARMORED_FOX: {
          id: 'ARMORED_FOX',
          name: 'The Armored Fox',
          desireStyle: 'That crooked smile promised trouble, and trouble was the only honest thing about him',
          summary: 'The Armored Fox survives by never being where you expect. Deflection is art, evasion is affection, and nothing sticks — until it does. The armor is charm; the fox is the wound underneath.',
          stressFailure: 'permanent deflection, irresponsible freedom'
      },
      DARK_VICE: {
          id: 'DARK_VICE',
          name: 'The Dark Vice',
          desireStyle: 'The room went quiet when he entered — not from fear, but from the gravity of something that should not be desired',
          summary: 'The Dark Vice is the thing you reach for knowing it will cost you. Power, danger, and want fused into a single presence that justifies its own harm. Restraint is performance; beneath it, something hungers.',
          stressFailure: 'escalation, rationalized harm'
      },
      BEAUTIFUL_RUIN: {
          id: 'BEAUTIFUL_RUIN',
          name: 'The Beautiful Ruin',
          desireStyle: 'His jaw clenched, a storm behind his perfect eyes — pain or shame, she couldn\'t tell',
          summary: 'The Beautiful Ruin destroys what it loves before love can disappoint. Self-sabotage as preemptive strike, beauty as wreckage, tenderness laced with goodbye. "Everyone leaves" is prophecy and weapon both.',
          stressFailure: 'preemptive destruction, mutual sabotage',
          genderedExpression: {
              male: 'He loved fiercely, possessively, as if tenderness itself might betray him',
              female: 'She pushed away first, always, before the disappointment could reach her'
          }
      },
      ETERNAL_FLAME: {
          id: 'ETERNAL_FLAME',
          name: 'The Eternal Flame',
          desireStyle: 'He remembered the coffee order she\'d mentioned once, three months ago, in passing — devotion expressed in accumulated attention',
          summary: 'The Eternal Flame endures. Love is not a feeling but a practice — patient, unwavering, burning steady when everything else has gone dark. They will wait. They will notice. They will still be there.',
          stressFailure: 'self-neglect, moral endurance'
      }
  };

  const ARCHETYPE_ORDER = [
      'HEART_WARDEN', 'OPEN_VEIN', 'SPELLBINDER', 'ARMORED_FOX',
      'DARK_VICE', 'BEAUTIFUL_RUIN', 'ETERNAL_FLAME'
  ];

  function getArchetypeSectionTitle(loveInterestGender) {
      const g = (loveInterestGender || '').toLowerCase();
      if (g === 'male') return 'Archetype Storybeau';
      if (g === 'female') return 'Archetype Storybelle';
      return 'Archetype Storyboo';
  }

  // =========================
  // SECONDARY ARCHETYPE PAIRING RULES
  // allowed: always valid
  // conditional: valid but carries narrative tension
  // forbidden: invalid — must flag clearly, never auto-correct
  // =========================
  const ARCHETYPE_PAIRING_RULES = {
      HEART_WARDEN: {
          allowed: ['ETERNAL_FLAME'],
          conditional: ['DARK_VICE', 'SPELLBINDER'],
          forbidden: ['ARMORED_FOX', 'OPEN_VEIN']
      },
      OPEN_VEIN: {
          allowed: ['ETERNAL_FLAME'],
          conditional: ['BEAUTIFUL_RUIN', 'SPELLBINDER'],
          forbidden: ['HEART_WARDEN', 'ARMORED_FOX']
      },
      SPELLBINDER: {
          allowed: ['DARK_VICE'],
          conditional: ['HEART_WARDEN', 'BEAUTIFUL_RUIN'],
          forbidden: ['ETERNAL_FLAME']
      },
      ARMORED_FOX: {
          allowed: ['DARK_VICE'],
          conditional: ['BEAUTIFUL_RUIN', 'SPELLBINDER'],
          forbidden: ['HEART_WARDEN', 'ETERNAL_FLAME']
      },
      DARK_VICE: {
          allowed: ['SPELLBINDER', 'ARMORED_FOX'],
          conditional: ['BEAUTIFUL_RUIN'],
          forbidden: ['ETERNAL_FLAME']
      },
      BEAUTIFUL_RUIN: {
          allowed: [],
          conditional: ['OPEN_VEIN', 'ARMORED_FOX'],
          forbidden: ['ETERNAL_FLAME', 'HEART_WARDEN']
      },
      ETERNAL_FLAME: {
          allowed: ['HEART_WARDEN'],
          conditional: ['OPEN_VEIN'],
          forbidden: ['DARK_VICE', 'SPELLBINDER', 'ARMORED_FOX']
      }
  };

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
              errors.push('Invalid Secondary Archetype selected.');
              return { valid: false, errors };
          }
          if (primaryId === modifierId) {
              errors.push('Primary and Secondary cannot be the same archetype.');
              return { valid: false, errors };
          }
          // Enforce pairing rules — forbidden combinations must be flagged
          const rules = ARCHETYPE_PAIRING_RULES[primaryId];
          if (rules && rules.forbidden.includes(modifierId)) {
              errors.push(`${primary.name} + ${modifier.name} is a forbidden pairing.`);
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

      if (modifierId) {
          const modifier = ARCHETYPES[modifierId];
          if (modifier) {
              directive += `
Secondary Archetype: ${modifier.name}
The Secondary colors expression style only. It does not override the Primary's emotional arc or shadow.
Secondary Desire Style: ${modifier.desireStyle}
`;
          }
      }

      // Stress & Failure Pattern (shadow clause) — always included
      directive += `
STRESS & FAILURE PATTERN (SHADOW CLAUSE):
When under pressure, emotional threat, or lens-driven withholding (Withheld Core / Moral Friction):
- ${primary.name} fails toward: ${primary.stressFailure}
`;
      if (modifierId) {
          const modifier = ARCHETYPES[modifierId];
          if (modifier && modifier.stressFailure) {
              directive += `- Secondary stress echo (${modifier.name}): ${modifier.stressFailure}\n`;
          }
      }

      directive += `
Stress must never:
- Remove agency from the other party
- Excuse harm as romance
- Stall without escalation or change

STORYTELLER ENFORCEMENT:
- Treat the Primary Archetype as dominant.
- Use the Stress & Failure Pattern as the main source of relational tension.
- Allow fracture and repair without erasing the shadow.
- Never "heal away" the archetype.
`;

      return directive;
  }

  // Get valid secondary archetypes for a given primary (respects pairing rules)
  function getValidModifierArchetypes(primaryId) {
      if (!primaryId) return ARCHETYPE_ORDER.slice();
      const rules = ARCHETYPE_PAIRING_RULES[primaryId];
      return ARCHETYPE_ORDER.filter(id => {
          if (id === primaryId) return false;
          if (rules && rules.forbidden.includes(id)) return false;
          return true;
      });
  }

  // Normalize user input to best matching secondary archetype
  // Maps free text to closest secondary (IP-safe transformation)
  function normalizeArchetypeModifierInput(input, currentPrimary) {
      if (!input || typeof input !== 'string') return null;

      const normalized = input.trim().toLowerCase();
      if (!normalized) return null;

      // Get valid secondaries (respects pairing rules)
      const validModifiers = getValidModifierArchetypes(currentPrimary);

      // Direct match by name
      for (const id of validModifiers) {
          const arch = ARCHETYPES[id];
          if (arch.name.toLowerCase().includes(normalized) ||
              normalized.includes(arch.name.toLowerCase().replace('the ', ''))) {
              return id;
          }
      }

      // Keyword matching — maps legacy and descriptive terms to canonical archetypes
      const keywordMap = {
          // Heart Warden (absorbs Guardian, Sovereign)
          'warden': 'HEART_WARDEN',
          'protective': 'HEART_WARDEN',
          'guardian': 'HEART_WARDEN',
          'safe': 'HEART_WARDEN',
          'shield': 'HEART_WARDEN',
          'authority': 'HEART_WARDEN',
          'sovereign': 'HEART_WARDEN',
          'paladin': 'HEART_WARDEN',
          'knight': 'HEART_WARDEN',
          'steady': 'HEART_WARDEN',
          // Open Vein (absorbs Romantic, Cloistered)
          'vein': 'OPEN_VEIN',
          'vulnerable': 'OPEN_VEIN',
          'romantic': 'OPEN_VEIN',
          'tender': 'OPEN_VEIN',
          'expressive': 'OPEN_VEIN',
          'poetic': 'OPEN_VEIN',
          'cloistered': 'OPEN_VEIN',
          'sheltered': 'OPEN_VEIN',
          'innocent': 'OPEN_VEIN',
          'awakening': 'OPEN_VEIN',
          // Spellbinder (absorbs Enchanting, Strategist)
          'spellbinder': 'SPELLBINDER',
          'charm': 'SPELLBINDER',
          'magnetic': 'SPELLBINDER',
          'allure': 'SPELLBINDER',
          'enchanting': 'SPELLBINDER',
          'seductive': 'SPELLBINDER',
          'strategist': 'SPELLBINDER',
          'intelligent': 'SPELLBINDER',
          'clever': 'SPELLBINDER',
          'anticipation': 'SPELLBINDER',
          // Armored Fox (absorbs Rogue)
          'fox': 'ARMORED_FOX',
          'rogue': 'ARMORED_FOX',
          'playful': 'ARMORED_FOX',
          'irreverent': 'ARMORED_FOX',
          'evasive': 'ARMORED_FOX',
          'deflect': 'ARMORED_FOX',
          // Dark Vice (absorbs Dangerous, Anti-Hero)
          'vice': 'DARK_VICE',
          'dangerous': 'DARK_VICE',
          'menace': 'DARK_VICE',
          'dark': 'DARK_VICE',
          'restrained': 'DARK_VICE',
          'power': 'DARK_VICE',
          'anti-hero': 'DARK_VICE',
          // Beautiful Ruin
          'ruin': 'BEAUTIFUL_RUIN',
          'destruction': 'BEAUTIFUL_RUIN',
          'sabotage': 'BEAUTIFUL_RUIN',
          'wreckage': 'BEAUTIFUL_RUIN',
          // Eternal Flame (absorbs Devoted)
          'flame': 'ETERNAL_FLAME',
          'devoted': 'ETERNAL_FLAME',
          'loyal': 'ETERNAL_FLAME',
          'endure': 'ETERNAL_FLAME',
          'unwavering': 'ETERNAL_FLAME',
          'focused': 'ETERNAL_FLAME',
          'attention': 'ETERNAL_FLAME',
          'exclusive': 'ETERNAL_FLAME'
      };

      for (const [keyword, archId] of Object.entries(keywordMap)) {
          if (normalized.includes(keyword) && validModifiers.includes(archId)) {
              return archId;
          }
      }

      return null;
  }

  // =========================
  // LENS SYSTEM
  // Lenses are narrative constraint layers applied to characters.
  // Two-lens maximum enforced. Withheld Core does not count toward limit.
  // =========================
  const LENS_REGISTRY = {
      WITHHELD_CORE: {
          id: 'WITHHELD_CORE',
          name: 'Withheld Core',
          countsTowardLimit: false,
          maxVariants: 1,
          variants: {
              CLOISTERED: {
                  id: 'CLOISTERED',
                  trigger: 'innocence, isolation, or lack of experience',
                  pacingBias: 'firstness and threshold tension',
                  blocks: ['UNEXPECTED_COMPETENCE'],
                  restricts: ['VOLATILE_MIRROR'],
                  resolution: 'partial awakening by midpoint',
                  directive: `WITHHELD CORE — CLOISTERED VARIANT (LOCKED):
Withholding is driven by innocence, isolation, or lack of experience.
- Bias pacing toward firstness and threshold tension.
- Block Unexpected Competence: the character must NOT display sudden mastery of intimacy or social fluency they have no basis for.
- Restrict Volatile Mirror: avoid reflecting the partner's intensity back prematurely.
- This lens MUST resolve through partial awakening by the story's midpoint. Full awakening may follow, but the first crack must appear by midpoint.`
              },
              UNWORTHINESS: {
                  id: 'UNWORTHINESS',
                  trigger: 'guilt, self-disqualification, or fear of harming others',
                  pacingBias: 'Moral Friction',
                  frames: ['control as protective', 'distance as protective', 'sacrifice as protective'],
                  resolution: 'acceptance or explicit refusal by midpoint or shortly after',
                  directive: `WITHHELD CORE — UNWORTHINESS VARIANT (LOCKED):
Withholding is driven by guilt, self-disqualification, or fear of harming others.
- Bias pacing toward Moral Friction.
- Frame control, distance, or sacrifice as protective behavior — not coldness.
- The character believes closeness will cause harm, and acts accordingly.
- This lens MUST resolve through acceptance or explicit refusal by midpoint or shortly after. The character must either allow themselves to be loved, or consciously refuse it — silence is not resolution.`
              }
          }
      }
  };

  const MAX_LENS_COUNT = 2;

  function validateLensSelection(lenses, withheldCoreVariant) {
      const errors = [];
      const countable = lenses.filter(id => {
          const reg = LENS_REGISTRY[id];
          return !reg || reg.countsTowardLimit !== false;
      });
      if (countable.length > MAX_LENS_COUNT) {
          errors.push('Maximum two lenses allowed.');
      }
      if (withheldCoreVariant && !LENS_REGISTRY.WITHHELD_CORE.variants[withheldCoreVariant]) {
          errors.push('Invalid Withheld Core variant.');
      }
      return { valid: errors.length === 0, errors };
  }

  function buildLensDirectives(withheldCoreVariant, turnCount, storyLength) {
      if (!withheldCoreVariant) return '';
      const variant = LENS_REGISTRY.WITHHELD_CORE.variants[withheldCoreVariant];
      if (!variant) return '';

      // Determine midpoint range based on story length
      const midpointTurns = { voyeur: 3, fling: 6, affair: 12, soulmates: 20 };
      const midpoint = midpointTurns[storyLength] || 6;
      const atOrPastMidpoint = turnCount >= midpoint;
      const approachingMidpoint = turnCount >= (midpoint - 2);

      let directive = '\n' + variant.directive + '\n';

      // Midpoint enforcement
      if (atOrPastMidpoint) {
          directive += `\nMIDPOINT ENFORCEMENT: We are at or past the story midpoint (turn ${turnCount}). The Withheld Core lens (${withheldCoreVariant}) MUST begin resolving NOW. ${
              withheldCoreVariant === 'CLOISTERED'
                  ? 'Show at least partial awakening — the character must demonstrate that their innocence has cracked, even if full awakening follows later.'
                  : 'The character must either accept being loved or explicitly refuse it. Continued silence or passive avoidance is no longer valid.'
          }\n`;
      } else if (approachingMidpoint) {
          directive += `\nMIDPOINT APPROACHING: The story approaches midpoint (turn ${turnCount} of ~${midpoint * 2}). Begin seeding conditions for the Withheld Core lens to resolve. Do not force it yet.\n`;
      }

      return directive;
  }

  // Guided Fate: assign Withheld Core variant based on archetype signals
  // Canonical mapping after legacy migration:
  //   OPEN_VEIN (absorbed CLOISTERED) → CLOISTERED variant
  //   BEAUTIFUL_RUIN → UNWORTHINESS variant
  //   DARK_VICE (absorbed ANTI_HERO) → UNWORTHINESS variant
  // TODO: OPEN_VEIN also absorbed ROMANTIC which had no variant.
  //   Current behavior: all OPEN_VEIN selections trigger CLOISTERED.
  //   May over-apply for players who intend Romantic rather than Cloistered.
  //   Refine with dynamic-based signal if needed.
  function getFateWithheldCoreVariant(archetype, dynamic) {
      // CLOISTERED: avoidance driven by inexperience or unformed desire
      if (archetype === 'OPEN_VEIN') return 'CLOISTERED';
      // UNWORTHINESS: avoidance driven by guilt, shame, or belief of being undeserving
      if (archetype === 'BEAUTIFUL_RUIN' || archetype === 'DARK_VICE') return 'UNWORTHINESS';
      // No variant if neither condition is met
      return null;
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
      archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null },
      lenses: [],                    // Active lens IDs (two-lens max, Withheld Core exempt)
      withheldCoreVariant: null,     // 'CLOISTERED' | 'UNWORTHINESS' | null
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
      worldInstanceId: null,      // Persistent world identity for same-world continuations
      worldName: null,            // Unique world name for world-linked titles
      previousTitle: null,        // Last title for continuation mode matching
      previousTitleMode: null,    // Title mode to echo in continuations
      continuationPath: null,     // 'continue' | 'same_world' | 'new_story'
      access: 'free',
      subscribed: false,
      isLoggedIn: false,  // AUTH GATE: persistence only allowed when logged in
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
          sceneBudgets: {},
          // Per-scene visualization tracking: has this scene been visualized with a free credit?
          visualizedScenes: {}
      },

      // ============================================================
      // VISUALIZATION ECONOMY — Credits earned by scene completion
      // ============================================================
      vizEconomy: {
          // Per-story credits (reset on new story)
          storyCredits: 0,
          // Global credits from Forbidden Library (persist across stories)
          globalCredits: 0,
          // Forbidden Library bonus cap tracking
          forbiddenLibraryBonusThisMonth: 0,
          forbiddenLibraryBonusMonthKey: null,
          // Pay-As-You-Go opt-in (one-time, persists)
          payAsYouGoEnabled: false,
          // Last credited scene count (to avoid double-crediting)
          lastCreditedSceneCount: 0
      },

      // ============================================================
      // PHASE 1 COVER MODE — LOCAL/COMPOSITED COVERS ONLY
      // coverMode: 'PHASE_1_FORGED' = deterministic local assets only
      // coverEligibility: false = custom (model-based) covers disabled
      // Custom cover generation ONLY reachable when coverEligibility === true
      // ============================================================
      coverMode: 'PHASE_1_FORGED',
      coverEligibility: false,

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

  // ============================================================
  // SOLO SUBTITLE SYSTEM — Staged permission gradient
  // ============================================================
  // Default: "Just you and your curiosity."
  // Upgraded: "Just you and your desire." (persists once triggered)
  // ============================================================

  const SOLO_SUBTITLE_DEFAULT = 'Just you and your curiosity.';
  const SOLO_SUBTITLE_UPGRADED = 'Just you and your desire.';
  const SOLO_COMPLETED_KEY = 'sb_solo_completed';

  /**
   * Check if Solo subtitle should show upgraded copy
   * Upgrade conditions: arousal >= Naughty OR user has completed a Solo session
   * @returns {boolean}
   */
  function shouldUpgradeSoloSubtitle() {
      // Check persisted flag first
      if (localStorage.getItem(SOLO_COMPLETED_KEY) === 'true') {
          return true;
      }
      // Check current arousal level
      const arousalOrder = ['Clean', 'Naughty', 'Erotic', 'Dirty'];
      const currentArousal = state.intensity || 'Naughty';
      const arousalIndex = arousalOrder.indexOf(currentArousal);
      // Naughty or higher (index >= 1)
      if (arousalIndex >= 1) {
          return true;
      }
      return false;
  }

  /**
   * Update Solo subtitle text based on conditions
   * Called when modeSelect screen is shown
   */
  function updateSoloSubtitle() {
      const subtitleEl = document.getElementById('soloSubtitle');
      if (!subtitleEl) return;

      if (shouldUpgradeSoloSubtitle()) {
          subtitleEl.textContent = SOLO_SUBTITLE_UPGRADED;
      } else {
          subtitleEl.textContent = SOLO_SUBTITLE_DEFAULT;
      }
  }

  /**
   * Mark Solo session as completed
   * Called when a Solo story progresses past scene 1
   */
  function markSoloSessionCompleted() {
      if (state.mode === 'solo') {
          localStorage.setItem(SOLO_COMPLETED_KEY, 'true');
      }
  }

  // Expose for Dev HUD
  window.updateSoloSubtitle = updateSoloSubtitle;
  window.shouldUpgradeSoloSubtitle = shouldUpgradeSoloSubtitle;

  // ============================================================
  // 5TH PERSON AUTHOR CONDUCTOR SYSTEM
  // The Author is causal/agentic, not a voyeur
  // ============================================================

  // BANNED VOYEUR VERBS - The Author never merely observes
  const AUTHOR_BANNED_VERBS = [
      'watched', 'observed', 'saw', 'looked on', 'gazed at', 'witnessed',
      'noticed', 'perceived', 'beheld', 'eyed', 'surveyed', 'regarded',
      'looked at', 'stared at', 'peered at', 'glimpsed'
  ];

  // BANNED VOYEUR PATTERNS - Passive observation phrases
  const AUTHOR_BANNED_PATTERNS = [
      /the author (watched|observed|saw|looked on)/gi,
      /as (she|he|they) [\w\s]+, the author/gi,
      /watched as (she|he|they)/gi,
      /the author.{0,20}(with satisfaction|with interest|with amusement) as/gi
  ];

  // ALLOWED AGENTIC VERBS - The Author causes, arranges, orchestrates
  const AUTHOR_AGENTIC_VERBS = [
      'tilted', 'threaded', 'arranged', 'set', 'sent', 'unlatched',
      'steered', 'coaxed', 'provoked', 'seeded', 'tightened', 'loosened',
      'staged', 'placed', 'positioned', 'orchestrated', 'wove', 'spun',
      'nudged', 'pressed', 'released', 'ignited', 'extinguished', 'delayed',
      'accelerated', 'redirected', 'planted', 'uprooted', 'summoned', 'banished'
  ];

  // Validate that 5th person opener starts with "The Author"
  function validate5thPersonOpener(text) {
      if (!text || typeof text !== 'string') return false;
      const trimmed = text.trim();
      // Must start with "The Author" (case-insensitive first match)
      return /^the author/i.test(trimmed);
  }

  // Rewrite opener to start with "The Author" if needed
  async function enforce5thPersonOpener(text) {
      if (validate5thPersonOpener(text)) return text;

      // Force rewrite of first paragraph
      try {
          const rewritten = await callChat([{
              role: 'user',
              content: `REWRITE REQUIRED: The following story opening MUST start with "The Author" as the grammatical subject of the first sentence.

CURRENT TEXT:
${text.slice(0, 500)}

RULES:
1. The very first word must be "The" and second word "Author"
2. The Author must be DOING something (causal), not watching
3. Use verbs like: ${AUTHOR_AGENTIC_VERBS.slice(0, 8).join(', ')}
4. NEVER use voyeur verbs: ${AUTHOR_BANNED_VERBS.slice(0, 6).join(', ')}
5. Preserve the rest of the content as much as possible

Return the rewritten text only, no explanation.`
          }]);
          return rewritten || text;
      } catch (e) {
          console.warn('[5thPerson] Opener enforcement failed:', e.message);
          // Fallback: prepend a conductor sentence
          return `The Author set the stage with quiet precision. ${text}`;
      }
  }

  // Check if an Author sentence contains voyeur verbs
  function hasVoyeurVerbs(sentence) {
      const lower = sentence.toLowerCase();
      // Only check sentences that mention "the author"
      if (!lower.includes('the author')) return false;
      return AUTHOR_BANNED_VERBS.some(verb => lower.includes(verb)) ||
             AUTHOR_BANNED_PATTERNS.some(pattern => pattern.test(sentence));
  }

  // Rewrite a single voyeur sentence to agentic causation
  function rewriteVoyeurSentence(sentence) {
      let result = sentence;
      // Replace common voyeur patterns with agentic alternatives
      const replacements = [
          [/The Author watched (as )?/gi, 'The Author arranged for '],
          [/The Author observed (that )?/gi, 'The Author ensured that '],
          [/The Author saw (that )?/gi, 'The Author had orchestrated that '],
          [/The Author looked on (as )?/gi, 'The Author steered events so that '],
          [/watched as (she|he|they)/gi, 'set in motion what made $1'],
          [/The Author.{0,10}with (quiet )?satisfaction/gi, 'The Author, having arranged this'],
          [/The Author noticed/gi, 'The Author had ensured'],
          [/The Author perceived/gi, 'The Author had woven']
      ];
      for (const [pattern, replacement] of replacements) {
          result = result.replace(pattern, replacement);
      }
      return result;
  }

  // Enforce Author-as-conductor throughout text (not just opener)
  function enforceAuthorConductor(text) {
      if (!text || typeof text !== 'string') return text;
      if (window.state?.povMode !== 'author5th') return text;

      // Split into sentences and check each
      const sentences = text.split(/(?<=[.!?])\s+/);
      let modified = false;

      const corrected = sentences.map(sentence => {
          if (hasVoyeurVerbs(sentence)) {
              modified = true;
              return rewriteVoyeurSentence(sentence);
          }
          return sentence;
      });

      if (modified) {
          console.log('[5thPerson] Corrected voyeur verbs to agentic causation');
      }

      return corrected.join(' ');
  }

  // ============================================================
  // 5TH PERSON POV — LOCKED CONTRACT BLOCK (AUTHORITATIVE)
  // Prepended to prompts when povMode === 'author5th'
  // ============================================================

  const FIFTH_PERSON_POV_CONTRACT = `
═══════════════════════════════════════════════════════════════════════════════
5TH PERSON POV CONTRACT (LOCKED — NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

CORE DEFINITION:
5th Person POV places The Author inside the story as a force of Fate.

The Author IS:
- A conscious presence
- Emotionally invested
- Reacting to inevitability, pressure, resistance, and consequence

The Author is NOT:
- A camera
- A neutral observer
- A character performing physical actions
- A narrator replacing character agency

The scene itself remains 3rd-person limited.
If the Author were removed, the story must feel structurally incomplete.

ABSOLUTE STRUCTURAL RULES (HARD):

1. OPENING RITUAL: The story MUST begin with "The Author" as the first two words.
2. CLOSING AUTHORITY: The final perspective MUST return to The Author
   (reflection, doubt, pressure, or resolve).
3. ROLE SEPARATION:
   - Characters act, speak, and decide.
   - The Author reacts, anticipates, weighs, resists, or tightens the frame.
4. NO CAMERA VOICE: The Author must never function as a passive observer,
   cinematic lens, or neutral narrator.

FORBIDDEN (NO META LABELS):
- "the protagonist"
- "the love interest"
- "main character"
- Any meta-label for Player Characters

AUTHOR PRESENCE (STYLE GUIDANCE):
Author presence should:
- Express interiority (doubt, desire, reluctance, anticipation)
- Apply pressure or inevitability
- React emotionally to unfolding events

Author presence must NOT be:
- Decorative
- Mechanical
- Repetitive
- Confined only to the opening and closing

There is no hard maximum on Author mentions.
Target presence should feel necessary, not counted.

SCENE 1 RAMP-IN:
Scene 1 is a threshold, not a stress test.
- Author presence may be lighter
- Some Author functions may appear gradually
- Tone and rhythm may still be settling
However:
- Opening and closing MUST still be Author-anchored
- The Author must already feel essential
- Role separation must remain intact
Do NOT force density unnaturally in Scene 1.

EROTIC CONSTRAINT (HARD):
If a scene is explicitly erotic:
- The Author must be entirely absent during erotic action
- The Author may appear before or after, never during
This rule does not apply to Scene 1 unless explicitly erotic.

PRONOUN ALIGNMENT:
The Author's pronouns MUST mirror Player 1's chosen gender.
If Player 1 is non-binary or undefined, adapt pronouns naturally.

CRITICAL FAILURE AVOIDANCE:
- Prioritize structural correctness over perfection
- Do NOT over-saturate Author mentions
- Do NOT pad with filler to meet imagined quotas
- If uncertain, favor clarity and restraint

NON-NEGOTIABLE PRINCIPLE:
The Author must matter. Quietly. Unmistakably. Without stealing agency.

═══════════════════════════════════════════════════════════════════════════════
`;

  const FIFTH_PERSON_GOD_MODE_CONTRACT = `
═══════════════════════════════════════════════════════════════════════════════
5TH PERSON GOD MODE — ADVERSARIAL AUTHOR (LOCKED)
═══════════════════════════════════════════════════════════════════════════════

GOD MODE VARIANT: The Author has lost control.

WHAT CHANGES:
- The Author is aware something is wrong
- The Author believes his mind may be breaking, or a split personality is writing
  over him, or someone is trespassing in his stories
- The Author does NOT know about "God Mode"
- The Author does NOT recognize the Player
- The Author does NOT name the interloper

THE AUTHOR MAY:
- Despair over damage to beloved characters
- Scramble to repair plot damage
- Resist, bargain, plead, flatter
- Briefly give up and observe chaos
- Occasionally laugh or admire clever disruption

BUT:
- Resistance always returns
- Order is always attempted
- Fate never fully abdicates

WHAT DOES NOT CHANGE:
- Opening/closing rules still apply
- System/UI explanations still forbidden
- Scene prose still uses 3rd-person limited

═══════════════════════════════════════════════════════════════════════════════
`;

  // ============================================================
  // 5TH PERSON POV — COMPREHENSIVE VALIDATOR
  // Returns { valid: boolean, violations: string[], canRepair: boolean }
  // ============================================================

  // Track last POV validation result for Dev HUD
  let _lastPOVValidation = { valid: true, violations: [], timestamp: 0 };

  function validate5thPersonPOV(text, isSceneOne = false, isErotic = false) {
      const violations = [];
      const warnings = []; // SOFT violations (logged but don't block)
      if (!text || typeof text !== 'string') {
          return { valid: false, violations: ['Empty or invalid text'], warnings: [], canRepair: false };
      }

      const trimmed = text.trim();

      // RULE 1: Must start with "The Author" (HARD FAIL — ritual, not cosmetic)
      const hasValidOpener = /^The Author\b/.test(trimmed);
      if (!hasValidOpener) {
          violations.push('HARD_FAIL:Opening does not start with "The Author"');
      }

      // RULE 2: Must end with Author perspective (STRUCTURAL CHECK)
      // Final paragraph must contain Author as subject, not just string presence
      const paragraphs = trimmed.split(/\n\n+/).filter(p => p.trim().length > 0);
      const finalParagraph = paragraphs[paragraphs.length - 1] || '';
      const finalSentences = finalParagraph.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      const lastTwoSentences = finalSentences.slice(-2).join(' ');
      // Author must be grammatical subject in final perspective (not just mentioned)
      const authorAsSubject = /The Author\s+(held|tilted|set|arranged|steered|coaxed|seeded|threaded|watched|waited|considered|wondered|doubted|resisted|smiled|frowned|paused|knew|felt|sensed|released|tightened|loosened)\b/i.test(lastTwoSentences);
      const authorReflection = /The Author.{0,60}(uncertain|doubt|wonder|question|resist|perhaps|might|whether|if only)/i.test(lastTwoSentences);
      if (!authorAsSubject && !authorReflection) {
          violations.push('HARD_FAIL:Closing lacks Author as final perspective (structural)');
      }

      // RULE 3: Forbidden meta-labels for Player Character
      const metaLabels = [
          /\bthe protagonist\b/gi,
          /\blove interest\b/gi,
          /\bthe player\b/gi,
          /\bthe reader\b/gi
      ];
      for (const pattern of metaLabels) {
          if (pattern.test(text)) {
              violations.push(`Forbidden meta-label found: ${pattern.source}`);
          }
      }

      // RULE 4: Author mention count (SOFT for Scene 1, advisory only)
      const authorMentions = (text.match(/The Author\b/gi) || []).length;
      if (isSceneOne && authorMentions < 6) {
          // Scene 1: SOFT warning, not blocking
          warnings.push(`SOFT:Scene 1 has ${authorMentions} Author mentions (target: 6+)`);
      }

      // RULE 5: Erotic scenes must have ZERO Author presence (HARD FAIL)
      // EXCEPTION: Scene 1 is exempt — erotic rule only applies to Scene 2+
      if (isErotic && !isSceneOne && authorMentions > 0) {
          violations.push('HARD_FAIL:Author presence in erotic scene (forbidden — must be 0)');
      }

      // RULE 6: Author should not use voyeur verbs (repairable)
      const voyeurPatterns = [
          /The Author\s+watched\b/gi,
          /The Author\s+observed\b/gi,
          /The Author\s+saw\b/gi,
          /The Author\s+noticed\b/gi,
          /The Author\s+gazed\b/gi,
          /The Author\s+witnessed\b/gi,
          /The Author\s+perceived\b/gi,
          /The Author\s+looked on\b/gi
      ];
      for (const pattern of voyeurPatterns) {
          if (pattern.test(text)) {
              violations.push(`Voyeur verb detected: ${pattern.source}`);
          }
      }

      // Determine if violations are repairable
      // HARD_FAIL violations are NEVER repairable — must regenerate
      const hasHardFail = violations.some(v => v.startsWith('HARD_FAIL:'));
      const canRepair = !hasHardFail && violations.length > 0 && violations.every(v =>
          v.includes('Voyeur')
      );

      const result = {
          valid: violations.length === 0,
          violations,
          warnings, // SOFT violations (logged, not blocking)
          canRepair,
          authorMentions,
          timestamp: Date.now()
      };

      // Store for Dev HUD
      _lastPOVValidation = result;

      if (!result.valid) {
          console.warn('[5thPerson] POV validation failed:', violations);
      }
      if (warnings.length > 0) {
          console.log('[5thPerson] POV soft warnings:', warnings);
      }

      return result;
  }

  // Attempt to repair POV violations (ONLY voyeur verbs — opener/closer are HARD FAILS)
  async function repair5thPersonPOV(text) {
      // Only voyeur verbs are repairable — opener/closer/frequency/erotic require regeneration
      return enforceAuthorConductor(text);
  }

  // Build the 5th Person prompt contract block
  function build5thPersonContract() {
      if (window.state?.povMode !== 'author5th') return '';

      let contract = FIFTH_PERSON_POV_CONTRACT;

      // Add God Mode adversarial framing if active
      if (window.state?.godModeActive) {
          contract += FIFTH_PERSON_GOD_MODE_CONTRACT;
      }

      return contract;
  }

  // ============================================================
  // 5TH PERSON AUTHOR FUNCTION CONTRACT — HARD STRUCTURAL ENFORCEMENT
  // ============================================================
  // Scene 1 MUST contain Author presence fulfilling ALL five functions.
  // This is POST-GENERATION VALIDATION, not prompting.

  const AUTHOR_FUNCTION_ERRORS = {
    MENTION_UNDERFLOW: 'AUTHOR_FUNC_FAIL:Author mentions below target (found: %d, target: 6+)',
    // MENTION_OVERFLOW removed — TASK C: Use 6+ with no upper bound
    MISSING_OPENING: 'AUTHOR_FUNC_FAIL:Author not present in opening paragraph',
    MISSING_CLOSING: 'AUTHOR_FUNC_FAIL:Author not present in final paragraph',
    MISSING_STAGE_SETTING: 'AUTHOR_FUNC_FAIL:Missing stage-setting function (pressure/inevitability)',
    MISSING_ANTICIPATION: 'AUTHOR_FUNC_FAIL:Missing anticipation/desire function',
    MISSING_INITIATION: 'AUTHOR_FUNC_FAIL:Missing initiation/nudge function',
    MISSING_SPECULATION: 'AUTHOR_FUNC_FAIL:Missing speculation/wonder function',
    MISSING_CONCERN: 'AUTHOR_FUNC_FAIL:Missing concern/judgment function',
    DECORATIVE_MENTION: 'AUTHOR_FUNC_FAIL:Decorative Author mention without function',
    CAMERA_STYLE: 'AUTHOR_FUNC_FAIL:Camera-style Author usage (scenery/passive observation)',
    // NEW: Strict 5th Person enforcement errors
    PRESENCE_GAP: 'AUTHOR_PRES_FAIL:Author absent for >2 consecutive paragraphs (gap at paragraph %d)',
    PRONOUN_DRIFT: 'AUTHOR_PRON_FAIL:Author pronoun drift — expected %s, found %s',
    NARRATIVE_AUTONOMY: 'AUTHOR_AUTO_FAIL:Scene functions without Author (Author could be removed)',
    INTERIORITY_ABSENT: 'AUTHOR_INT_FAIL:Author lacks interiority (only action verbs, no emotional investment)',
    TONE_NOT_AUTHORED: 'AUTHOR_TONE_FAIL:Tone markers appear outside Author voice',
    CAMEO_ONLY: 'AUTHOR_CAM_FAIL:Author appears only at boundaries (cameo pattern)'
  };

  // ============================================================
  // PROSE REFUSAL DETECTION — ATOMIC SCENE CREATION GUARD
  // ============================================================
  // Model refusals MUST NOT be inserted as scene content.
  // This gate runs BEFORE any scene object is created or stored.

  const PROSE_REFUSAL_MARKERS = [
    // OpenAI / ChatGPT refusal patterns
    /I('m| am) sorry,? but I (can't|cannot|am unable to|won't)/i,
    /I (can't|cannot|am unable to) (assist|help|create|generate|write|produce)/i,
    /I('m| am) not able to (assist|help|create|generate|write|produce)/i,
    /This (request|content) (violates|goes against|is against)/i,
    /against (my|our) (content |usage )?policy/i,
    /I (must|have to) (decline|refuse|refrain)/i,
    /I('m| am) (designed|programmed) to (avoid|decline|refuse)/i,
    // Anthropic refusal patterns
    /I (don't|do not) (feel comfortable|think I should)/i,
    /I('d| would) prefer not to/i,
    // Generic safety markers
    /content policy/i,
    /safety guidelines/i,
    /inappropriate content/i,
    /explicit (sexual |adult )?content/i,
    // Validation error objects serialized
    /AUTHOR_\w+_FAIL:/,
    /HARD_FAIL:/,
    /^\s*\{[\s\S]*"error"[\s\S]*\}\s*$/  // JSON error object
  ];

  const PROSE_MINIMUM_LENGTH = 50; // Refusals are typically short

  /**
   * Detects if model output is a refusal or error, not valid prose.
   * @param {string} text - The raw model output
   * @returns {{ isRefusal: boolean, reason: string|null }}
   */
  function detectProseRefusal(text) {
    if (!text || typeof text !== 'string') {
      return { isRefusal: true, reason: 'EMPTY_OUTPUT' };
    }

    const trimmed = text.trim();

    // Length check: refusals are typically very short
    if (trimmed.length < PROSE_MINIMUM_LENGTH) {
      return { isRefusal: true, reason: 'OUTPUT_TOO_SHORT' };
    }

    // Marker check: explicit refusal patterns
    for (const marker of PROSE_REFUSAL_MARKERS) {
      if (marker.test(trimmed)) {
        return { isRefusal: true, reason: 'REFUSAL_MARKER_DETECTED' };
      }
    }

    // Structural check: valid prose should have multiple sentences
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 2) {
      return { isRefusal: true, reason: 'INSUFFICIENT_PROSE_STRUCTURE' };
    }

    return { isRefusal: false, reason: null };
  }

  /**
   * Error thrown when prose generation returns a refusal.
   * Distinct from network/API errors — indicates content policy rejection.
   */
  class ProseRefusalError extends Error {
    constructor(reason, rawOutput) {
      super(`Prose generation refused: ${reason}`);
      this.name = 'ProseRefusalError';
      this.reason = reason;
      this.rawOutput = rawOutput;
    }
  }

  // ============================================================
  // HTTP 429 RATE LIMIT HANDLING — TERMINAL FAILURE
  // ============================================================
  // 429 = system pressure, NOT content failure.
  // MUST NOT retry, fallback, or advance any state.
  // Requires explicit user action to retry.

  /**
   * Error thrown when API returns HTTP 429 (rate limited).
   * This is a TERMINAL failure — no retries, no fallbacks.
   */
  class RateLimitError extends Error {
    constructor(endpoint, retryAfter = null) {
      super(`Rate limited (HTTP 429) on ${endpoint}`);
      this.name = 'RateLimitError';
      this.endpoint = endpoint;
      this.retryAfter = retryAfter;
      this.isRateLimit = true;
    }
  }

  // Single-flight locks to prevent concurrent requests
  let _normalizationInFlight = false;
  let _proseGenerationInFlight = false;

  /**
   * Checks if HTTP response is a 429 rate limit error.
   * @param {Response} res - Fetch Response object
   * @param {string} endpoint - Endpoint name for logging
   * @returns {RateLimitError|null} - RateLimitError if 429, null otherwise
   */
  function checkRateLimit(res, endpoint) {
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      console.error(`[RATE_LIMIT] HTTP 429 on ${endpoint}. Retry-After: ${retryAfter || 'not specified'}`);
      return new RateLimitError(endpoint, retryAfter);
    }
    return null;
  }

  // Author interiority verbs (emotional investment, NOT just action)
  const AUTHOR_INTERIORITY_VERBS = /The Author\b.{0,40}(wondered|doubted|feared|hoped|worried|sensed|felt|knew|suspected|resisted|yearned|ached|hungered|trembled|hesitated|considered|questioned|pondered|mused|regretted|anticipated|dreaded|craved|savored)/i;

  // Tone markers that MUST appear in Author's voice when tone is active
  const AUTHOR_TONE_MARKERS = {
    WryConfession: /The Author\b.{0,80}(irony|self-aware|wry|confess|admit|rueful|sardonic|knowing)/i,
    Poetic: /The Author\b.{0,80}(breathed|whispered|painted|wove|threaded|composed|crafted the)/i,
    Dark: /The Author\b.{0,80}(shadow|darkness|dread|ominous|foreboding|sinister|corrupt|twisted)/i,
    Horror: /The Author\b.{0,80}(dread|terror|fear|horror|unspeakable|nameless|creeping)/i,
    Mythic: /The Author\b.{0,80}(fated|destined|eternal|ancient|prophecy|legend|myth|ordained)/i,
    Comedic: /The Author\b.{0,80}(amused|delighted|laughed|chuckled|absurd|ridiculous|comedic)/i,
    Surreal: /The Author\b.{0,80}(dream|impossible|bent|warped|shifted|unreal|strange)/i,
    Satirical: /The Author\b.{0,80}(mocked|skewered|exposed|pretense|facade|hypocrisy)/i
  };

  // Heuristic classifiers for Author Function detection
  // Each returns true if the sentence containing "The Author" fulfills that function
  const AUTHOR_FUNCTION_CLASSIFIERS = {
    // Stage-setting: pressure, inevitability, fate-in-motion (NOT scenery)
    stageSetting: (sentence) => {
      return /The Author\b.{0,80}(set|staged|arranged|positioned|placed|tilted toward|angled|had already|long ago|before .* began|from the start|was never|always meant|inevitable|inescapable|sealed|locked|fated|destined|threaded|wove|wound)\b/i.test(sentence) &&
        !/The Author\b.{0,40}(watched|observed|saw|noticed|gazed|looked|the (sun|moon|sky|rain|fog|mist|crowd|street|room))/i.test(sentence);
    },

    // Anticipation: desire for what is coming, hunger, waiting
    anticipation: (sentence) => {
      return /The Author\b.{0,80}(wanted|desired|hungered|ached|longed|awaited|anticipated|could (barely|hardly|scarcely) wait|savored the|relished|craved|yearned|needed this|needed them|needed her|needed him)\b/i.test(sentence);
    },

    // Initiation: nudge, permit, withhold, tilt events
    initiation: (sentence) => {
      return /The Author\b.{0,80}(tilted|nudged|pushed|pulled|steered|coaxed|provoked|sent|released|loosened|tightened|opened|closed|permitted|allowed|withheld|denied|granted|unlatched|unlocked|triggered|seeded|planted|introduced|delivered)\b/i.test(sentence);
    },

    // Speculation: wonder, uncertainty, possibility
    speculation: (sentence) => {
      return /The Author\b.{0,80}(wondered|speculated|considered|pondered|mused|imagined|thought|questioned|asked|uncertain|unsure|perhaps|might|may|could be|what if|whether|if only|possibility|possibilities|curious|intrigued)\b/i.test(sentence);
    },

    // Concern: judgment, worry about flaw/innocence/risk
    concern: (sentence) => {
      return /The Author\b.{0,80}(worried|feared|doubted|concerned|judged|noted|recognized|knew|understood|sensed|felt|pitied|regretted|lamented|mourned|hoped|prayed|wished|flaw|innocen|naive|blind|foolish|reckless|fragile|vulnerable|danger|risk|peril|harm|damage|wound|break|shatter|destroy|ruin)\b/i.test(sentence);
    }
  };

  // Detect decorative/camera-style Author usage (PROHIBITED)
  function isDecorativeOrCamera(sentence) {
    // Camera-style: scenery description, passive observation
    const cameraPatterns = [
      /The Author\b.{0,40}(watched|observed|saw|noticed|gazed|witnessed|perceived|looked on)\b/i,
      /The Author\b.{0,60}(the (sun|moon|sky|stars|rain|fog|mist|snow|wind|clouds))/i,
      /The Author\b.{0,60}(the (room|street|crowd|city|town|building|house|garden))/i,
      /The Author\b.{0,40}(described|narrated|wrote|penned|chronicled)\b/i
    ];

    for (const pattern of cameraPatterns) {
      if (pattern.test(sentence)) return true;
    }

    // Decorative: Author mentioned without any function verb
    const hasFunctionVerb = Object.values(AUTHOR_FUNCTION_CLASSIFIERS).some(fn => fn(sentence));
    const hasActionVerb = /The Author\b\s+\w+ed\b/i.test(sentence) || /The Author\b\s+(held|felt|knew|was|had)\b/i.test(sentence);

    // If Author is mentioned but no function verb and no clear action = decorative
    if (!hasFunctionVerb && !hasActionVerb) {
      // Check if it's just a reference without substance
      if (/The Author('s)?\s+(story|tale|narrative|work|creation|design)\b/i.test(sentence)) {
        return true;
      }
    }

    return false;
  }

  // Extract sentences containing "The Author"
  function extractAuthorSentences(text) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => /The Author\b/i.test(s));
    return sentences;
  }

  // Main validation function for Author Function Contract
  function validateFifthPersonAuthorRole(text, sceneIndex) {
    // SCOPE: Only applies to Scene 1 with 5th Person POV
    if (sceneIndex !== 1) {
      return { valid: true, violations: [], warnings: [], functions: {}, mentionCount: 0 };
    }

    const violations = [];
    const warnings = []; // SOFT checks (logged, not blocking)
    const trimmed = (text || '').trim();

    if (!trimmed) {
      return { valid: false, violations: ['Empty text'], warnings: [], functions: {}, mentionCount: 0 };
    }

    // Count Author mentions
    const authorMentions = (trimmed.match(/The Author\b/gi) || []).length;

    // SOFT CHECK: 6+ mentions recommended (no upper bound — TASK C resolution)
    if (authorMentions < 6) {
      warnings.push(`SOFT:Author mentions below target (found: ${authorMentions}, target: 6+)`);
    }

    // Split into paragraphs
    const paragraphs = trimmed.split(/\n\n+/).filter(p => p.trim().length > 0);
    const openingPara = paragraphs[0] || '';
    const closingPara = paragraphs[paragraphs.length - 1] || '';

    // HARD CHECK: Author in opening paragraph
    if (!/The Author\b/i.test(openingPara)) {
      violations.push(AUTHOR_FUNCTION_ERRORS.MISSING_OPENING);
    }

    // HARD CHECK: Author in final paragraph
    if (!/The Author\b/i.test(closingPara)) {
      violations.push(AUTHOR_FUNCTION_ERRORS.MISSING_CLOSING);
    }

    // Extract all Author sentences for function analysis
    const authorSentences = extractAuthorSentences(trimmed);

    // Track which functions are fulfilled
    const functionsFound = {
      stageSetting: false,
      anticipation: false,
      initiation: false,
      speculation: false,
      concern: false
    };

    // Check each Author sentence
    let decorativeCount = 0;
    for (const sentence of authorSentences) {
      // Check for prohibited decorative/camera usage
      if (isDecorativeOrCamera(sentence)) {
        decorativeCount++;
        console.warn('[AuthorRole] Decorative/camera usage:', sentence.substring(0, 100));
      }

      // Check which functions this sentence fulfills
      if (AUTHOR_FUNCTION_CLASSIFIERS.stageSetting(sentence)) {
        functionsFound.stageSetting = true;
      }
      if (AUTHOR_FUNCTION_CLASSIFIERS.anticipation(sentence)) {
        functionsFound.anticipation = true;
      }
      if (AUTHOR_FUNCTION_CLASSIFIERS.initiation(sentence)) {
        functionsFound.initiation = true;
      }
      if (AUTHOR_FUNCTION_CLASSIFIERS.speculation(sentence)) {
        functionsFound.speculation = true;
      }
      if (AUTHOR_FUNCTION_CLASSIFIERS.concern(sentence)) {
        functionsFound.concern = true;
      }
    }

    // SOFT CHECK: Author functions (advisory for Scene 1 ramp-in)
    if (!functionsFound.stageSetting) {
      warnings.push('SOFT:Missing stage-setting function');
    }
    if (!functionsFound.anticipation) {
      warnings.push('SOFT:Missing anticipation function');
    }
    if (!functionsFound.initiation) {
      warnings.push('SOFT:Missing initiation function');
    }
    if (!functionsFound.speculation) {
      warnings.push('SOFT:Missing speculation function');
    }
    if (!functionsFound.concern) {
      warnings.push('SOFT:Missing concern function');
    }

    // SOFT CHECK: Decorative mentions (warning only for Scene 1)
    if (decorativeCount > 0) {
      warnings.push(`SOFT:Decorative Author mentions detected (${decorativeCount} found)`);
    }

    if (warnings.length > 0) {
      console.log('[AuthorRole] Soft warnings:', warnings);
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      functions: functionsFound,
      mentionCount: authorMentions,
      decorativeCount
    };
  }

  // Build regeneration prompt for Author Function failures
  function buildAuthorFunctionRegenerationPrompt(violations, functionsFound) {
    const missingFunctions = [];
    if (!functionsFound.stageSetting) missingFunctions.push('STAGE-SETTING (pressure, inevitability — NOT scenery)');
    if (!functionsFound.anticipation) missingFunctions.push('ANTICIPATION (desire, hunger for what is coming)');
    if (!functionsFound.initiation) missingFunctions.push('INITIATION (nudge, permit, withhold, tilt events)');
    if (!functionsFound.speculation) missingFunctions.push('SPECULATION (wonder, uncertainty, possibility)');
    if (!functionsFound.concern) missingFunctions.push('CONCERN (judgment about flaw, innocence, or risk)');

    return `
═══════════════════════════════════════════════════════════════════════════════
AUTHOR FUNCTION CONTRACT — REGENERATION REQUIRED
═══════════════════════════════════════════════════════════════════════════════

Previous output FAILED Author Function validation.

FAILURES:
${violations.map(v => '- ' + v.replace('AUTHOR_FUNC_FAIL:', '')).join('\n')}

MISSING FUNCTIONS (The Author must perform ALL five):
${missingFunctions.map(f => '- ' + f).join('\n')}

ABSOLUTE REQUIREMENTS:
1. "The Author" should appear 6+ times (target, not strict)
2. "The Author" must appear in OPENING paragraph
3. "The Author" must appear in FINAL paragraph
4. Each Author mention MUST perform one of these five functions:
   - Stage-setting: pressure, inevitability (NOT scenery description)
   - Anticipation: desire, hunger, waiting for what comes
   - Initiation: nudge, permit, withhold, tilt, steer events
   - Speculation: wonder, uncertainty, what-if, possibility
   - Concern: judgment, worry about flaw, innocence, risk

PROHIBITED:
- The Author describing scenery
- The Author narrating physical action
- The Author as passive camera/observer
- Decorative Author mentions without function

═══════════════════════════════════════════════════════════════════════════════
`;
  }

  // ============================================================
  // STRICT 5TH PERSON POV ENFORCEMENT — CONTINUOUS PRESENCE
  // ============================================================
  // These checks enforce the AUTHORITATIVE 5th Person contract:
  // - Author must appear continuously (max 2 paragraph gap)
  // - Author must have interiority, not just action verbs
  // - Author pronouns must match Player 1 gender
  // - Tone must route through Author's voice
  // - Scene must collapse without Author (narrative dependency)

  /**
   * CHECK: Continuous Author presence (max 2 paragraph gap)
   * HARD FAIL if Author absent for >2 consecutive paragraphs
   */
  function checkAuthorPresenceGap(paragraphs) {
    const violations = [];
    let consecutiveWithout = 0;
    let gapStartIndex = -1;

    for (let i = 0; i < paragraphs.length; i++) {
      const hasAuthor = /The Author\b/i.test(paragraphs[i]);
      if (hasAuthor) {
        consecutiveWithout = 0;
        gapStartIndex = -1;
      } else {
        if (consecutiveWithout === 0) gapStartIndex = i;
        consecutiveWithout++;
        if (consecutiveWithout > 2) {
          violations.push(AUTHOR_FUNCTION_ERRORS.PRESENCE_GAP.replace('%d', gapStartIndex + 1));
          break; // One gap violation is enough
        }
      }
    }
    return violations;
  }

  /**
   * CHECK: Author pronoun alignment with Player 1 gender
   * Author must use same pronouns as Player 1 (mirroring requirement)
   * HARD FAIL if Author uses conflicting pronouns
   */
  function checkAuthorPronounDrift(text) {
    const violations = [];
    const playerGender = window.state?.picks?.playerGender || window.state?.playerGender;
    if (!playerGender) return violations; // Can't check without gender

    // Expected pronouns based on player gender
    const expectedPronouns = playerGender === 'male'
      ? { subject: 'he', object: 'him', possessive: 'his' }
      : playerGender === 'female'
      ? { subject: 'she', object: 'her', possessive: 'her' }
      : null;

    if (!expectedPronouns) return violations; // Non-binary/other not enforced

    // Check Author sentences for conflicting pronouns
    const authorSentences = text.split(/(?<=[.!?])\s+/).filter(s => /The Author\b/i.test(s));

    for (const sentence of authorSentences) {
      // Look for Author + pronoun patterns
      const afterAuthor = sentence.replace(/.*The Author\b/i, '');

      // Check for wrong pronouns in Author context
      if (playerGender === 'male') {
        if (/\b(she|her)\s+(felt|knew|wondered|sensed|wanted)\b/i.test(afterAuthor)) {
          violations.push(AUTHOR_FUNCTION_ERRORS.PRONOUN_DRIFT
            .replace('%s', 'he/him/his')
            .replace('%s', 'she/her'));
          break;
        }
      } else if (playerGender === 'female') {
        if (/\b(he|him|his)\s+(felt|knew|wondered|sensed|wanted)\b/i.test(afterAuthor)) {
          violations.push(AUTHOR_FUNCTION_ERRORS.PRONOUN_DRIFT
            .replace('%s', 'she/her')
            .replace('%s', 'he/him/his'));
          break;
        }
      }
    }
    return violations;
  }

  /**
   * CHECK: Author interiority (emotional investment, not just action)
   * HARD FAIL if Author only has action verbs, no interiority
   */
  function checkAuthorInteriority(text) {
    const violations = [];
    const authorSentences = text.split(/(?<=[.!?])\s+/).filter(s => /The Author\b/i.test(s));

    // Must have at least one interiority verb
    const hasInteriority = authorSentences.some(s => AUTHOR_INTERIORITY_VERBS.test(s));

    if (!hasInteriority && authorSentences.length >= 3) {
      // Check if all Author mentions are just action verbs
      const actionOnly = authorSentences.every(s =>
        /The Author\b\s+(set|placed|arranged|tilted|positioned|opened|closed|moved|pushed|pulled)\b/i.test(s) &&
        !AUTHOR_INTERIORITY_VERBS.test(s)
      );
      if (actionOnly) {
        violations.push(AUTHOR_FUNCTION_ERRORS.INTERIORITY_ABSENT);
      }
    }
    return violations;
  }

  /**
   * CHECK: Cameo pattern detection (Author only at boundaries)
   * HARD FAIL if Author appears only in first and last paragraph
   */
  function checkAuthorCameoPattern(paragraphs) {
    const violations = [];
    if (paragraphs.length < 4) return violations; // Too short to have cameo pattern

    const authorByParagraph = paragraphs.map(p => /The Author\b/i.test(p));
    const firstHas = authorByParagraph[0];
    const lastHas = authorByParagraph[authorByParagraph.length - 1];
    const middleHasAny = authorByParagraph.slice(1, -1).some(Boolean);

    // Cameo pattern: Author only at first and last, absent in middle
    if (firstHas && lastHas && !middleHasAny) {
      violations.push(AUTHOR_FUNCTION_ERRORS.CAMEO_ONLY);
    }
    return violations;
  }

  /**
   * CHECK: Tone routed through Author (tone markers must appear in Author voice)
   * Soft warning for now, but flagged for enforcement
   */
  function checkToneAuthoring(text, tone) {
    const violations = [];
    if (!tone || tone === 'Earnest') return violations; // Earnest is baseline, no special markers

    const tonePattern = AUTHOR_TONE_MARKERS[tone];
    if (!tonePattern) return violations;

    // Check if tone markers exist in text
    const toneMarkers = {
      WryConfession: /\b(irony|ironic|self-aware|wry|sardonic|rueful)\b/i,
      Poetic: /\b(whispered|breathed|painted|wove|lyrical|verse)\b/i,
      Dark: /\b(shadow|darkness|dread|ominous|foreboding|sinister)\b/i,
      Horror: /\b(dread|terror|horror|unspeakable|nameless|creeping)\b/i,
      Mythic: /\b(fated|destined|eternal|ancient|prophecy|ordained)\b/i,
      Comedic: /\b(absurd|ridiculous|laughed|chuckled|comedic|hilarious)\b/i,
      Surreal: /\b(dream|impossible|warped|unreal|strange|shifting)\b/i,
      Satirical: /\b(mocked|skewered|pretense|facade|hypocrisy)\b/i
    };

    const generalTonePattern = toneMarkers[tone];
    if (!generalTonePattern) return violations;

    const hasToneInText = generalTonePattern.test(text);
    const hasToneInAuthor = tonePattern.test(text);

    // If tone appears in text but NOT in Author voice = violation
    if (hasToneInText && !hasToneInAuthor) {
      violations.push(AUTHOR_FUNCTION_ERRORS.TONE_NOT_AUTHORED);
    }
    return violations;
  }

  /**
   * CHECK: Narrative autonomy (scene must depend on Author)
   * If removing Author sentences doesn't collapse the scene = FAIL
   */
  function checkNarrativeAutonomy(text) {
    const violations = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    const authorSentences = sentences.filter(s => /The Author\b/i.test(s));
    const nonAuthorSentences = sentences.filter(s => !/The Author\b/i.test(s));

    // If non-Author sentences form a coherent scene alone = violation
    // Heuristic: if >70% of content is non-Author, scene may be autonomous
    const authorRatio = authorSentences.length / sentences.length;

    if (authorRatio < 0.15 && sentences.length > 10) {
      // Very low Author presence in substantial text = autonomy risk
      violations.push(AUTHOR_FUNCTION_ERRORS.NARRATIVE_AUTONOMY);
    }
    return violations;
  }

  /**
   * MASTER ENFORCEMENT: Strict 5th Person POV validation
   * Combines all enforcement checks into single validation pass
   */
  function enforceStrict5thPersonPOV(text, sceneIndex, tone) {
    if (window.state?.povMode !== 'author5th') {
      return { valid: true, violations: [], warnings: [], checks: {} };
    }

    const violations = [];
    const warnings = []; // SOFT checks for Scene 1 ramp-in
    const paragraphs = (text || '').split(/\n\n+/).filter(p => p.trim().length > 0);
    const isSceneOne = sceneIndex === 1;

    // Run all enforcement checks
    const presenceGap = checkAuthorPresenceGap(paragraphs);
    const pronounDrift = checkAuthorPronounDrift(text);
    const interiority = checkAuthorInteriority(text);
    const cameoPattern = checkAuthorCameoPattern(paragraphs);
    const toneAuthoring = checkToneAuthoring(text, tone);
    const narrativeAutonomy = checkNarrativeAutonomy(text);

    // Scene 1: Most checks are SOFT (warnings only)
    // Scene 2+: All checks are HARD (violations)
    if (isSceneOne) {
      // SOFT for Scene 1: presenceGap, interiority, narrativeAutonomy, toneAuthoring
      warnings.push(...presenceGap.map(v => 'SOFT:' + v));
      warnings.push(...interiority.map(v => 'SOFT:' + v));
      warnings.push(...narrativeAutonomy.map(v => 'SOFT:' + v));
      warnings.push(...toneAuthoring.map(v => 'SOFT:' + v));
      // HARD for Scene 1: pronounDrift, cameoPattern (structural)
      violations.push(...pronounDrift);
      violations.push(...cameoPattern);
    } else {
      // Scene 2+: All checks are HARD
      violations.push(...presenceGap);
      violations.push(...pronounDrift);
      violations.push(...interiority);
      violations.push(...cameoPattern);
      violations.push(...toneAuthoring);
      violations.push(...narrativeAutonomy);
    }

    const result = {
      valid: violations.length === 0,
      violations,
      warnings,
      checks: {
        presenceGap: presenceGap.length === 0,
        pronounDrift: pronounDrift.length === 0,
        interiority: interiority.length === 0,
        cameoPattern: cameoPattern.length === 0,
        toneAuthoring: toneAuthoring.length === 0,
        narrativeAutonomy: narrativeAutonomy.length === 0
      }
    };

    if (!result.valid) {
      console.error('[5thPerson:Strict] Enforcement FAILED:', violations);
    }
    if (warnings.length > 0) {
      console.log('[5thPerson:Strict] Soft warnings:', warnings);
    }

    return result;
  }

  // Expose for integration
  window.enforceStrict5thPersonPOV = enforceStrict5thPersonPOV;

  // ============================================================
  // EROTIC/DIRTY LANGUAGE ESCALATION SYSTEM (MANDATORY)
  // ============================================================
  // When intensity >= Erotic, prose MUST demonstrate physical charge
  // This is NOT satisfied by mood, metaphor, or poetic abstraction alone
  // ============================================================

  // Sensory markers that indicate proper erotic grounding
  const EROTIC_SENSORY_MARKERS = [
      /\b(breath|breathing|breathless|exhale|inhale)\b/gi,
      /\b(skin|flesh|bare|naked|exposed)\b/gi,
      /\b(heat|warm|warmth|hot|burn|burning|fever)\b/gi,
      /\b(weight|press|pressure|heavy|lean)\b/gi,
      /\b(scent|smell|musk|perfume|sweat)\b/gi,
      /\b(friction|rub|slide|glide|grind)\b/gi,
      /\b(shiver|tremble|shudder|quiver|shake)\b/gi,
      /\b(pulse|heartbeat|racing|pounding|thump)\b/gi,
      /\b(touch|stroke|grip|grasp|clutch|hold)\b/gi,
      /\b(lips|mouth|tongue|teeth|bite|kiss)\b/gi,
      /\b(throat|neck|collarbone|shoulder|spine)\b/gi,
      /\b(hips|waist|thigh|chest|stomach)\b/gi,
      /\b(gasp|moan|groan|sigh|whimper|cry)\b/gi,
      /\b(ache|throb|tingle|flush|blush)\b/gi,
      /\b(tight|tense|clench|curl|arch)\b/gi
  ];

  // Patterns indicating bodily contradiction (restraint vs reaction)
  const BODILY_CONTRADICTION_PATTERNS = [
      /\b(tried to|wanted to|meant to|shouldn't|couldn't help|despite|even as|though.*body)\b/gi,
      /\b(said.*but|told.*yet|claimed.*while|denied.*as)\b/gi,
      /\b(fought|resisted|held back|pulled away).*\b(drawn|pulled|leaned|reached)\b/gi
  ];

  // Forbidden abstraction-only patterns (desire without physicality)
  const ABSTRACTION_ONLY_PATTERNS = [
      /\b(fate|destiny|stars|meant to be|written|ordained)\b.*\b(desire|want|love|need)\b/gi,
      /\b(souls?|spirits?)\b.*\b(merge|join|connect|entwine)\b/gi,
      /\b(hearts?)\b.*\b(beat as one|know|recognize|call)\b/gi
  ];

  /**
   * EROTIC LANGUAGE ESCALATION BLOCK — Injected into prompts for Erotic/Dirty
   */
  const EROTIC_ESCALATION_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
EROTIC LANGUAGE ESCALATION (MANDATORY — EROTIC/DIRTY INTENSITY)
═══════════════════════════════════════════════════════════════════════════════

This story operates at ELEVATED INTENSITY. Prose must be PHYSICALLY CHARGED.

REQUIRED SENSORY DENSITY (per 300 words):
- At least 4 sensory references: breath, skin, heat, weight, scent, friction, involuntary reactions
- These must be EMBODIED, not metaphorical ("her breath caught" not "destiny pulled them")
- Touch, temperature, and proximity must be SPECIFIC, not implied

REQUIRED BODILY CONTRADICTION (per scene):
- At least one moment where a character's BODY contradicts their WORDS or INTENTIONS
- Example: "She said no, but her hand stayed on his chest."
- Example: "He meant to leave, but his feet wouldn't move."
- This creates erotic tension through physical honesty vs verbal resistance

FORBIDDEN ABSTRACTION-ONLY DESIRE:
- DO NOT frame desire as purely spiritual, fated, or romantic destiny
- DO NOT use metaphor as a substitute for physical sensation
- "Their souls recognized each other" is INVALID without bodily grounding
- "Something cosmic" is INVALID without "his thumb traced her wrist"

DIRTY ESCALATION (additional):
- Desire must be INCONVENIENT, DISRUPTIVE, or SLIGHTLY INAPPROPRIATE
- Clean noble desire is INVALID at Dirty intensity
- The wanting should feel like an intrusion, not a gift
- Characters should be bothered by how much they want

EVEN BLOCKED SCENES MUST FEEL CHARGED:
- If action is interrupted or refused, the PHYSICAL TENSION remains
- Bodies remember almost-contact
- Near-misses leave residue: "She could still feel where he hadn't touched her"
═══════════════════════════════════════════════════════════════════════════════`;

  const DIRTY_ESCALATION_ADDENDUM = `
DIRTY INTENSITY ADDENDUM:
- Desire is friction, not flow. It disrupts, interrupts, intrudes.
- Characters resent the pull even as they feel it.
- Heat should feel like a problem to solve, not a gift to accept.
- The body wants what the mind knows is complicated.`;

  /**
   * Validate erotic escalation requirements in generated text
   * @returns {object} { valid: boolean, violations: string[], metrics: object }
   */
  function validateEroticEscalation(text, arousalLevel) {
      if (!['Erotic', 'Dirty'].includes(arousalLevel)) {
          return { valid: true, violations: [], metrics: {} };
      }

      const violations = [];
      const wordCount = text.split(/\s+/).length;
      const blocks = Math.ceil(wordCount / 300);
      const requiredSensory = Math.max(4, blocks * 4);

      // Count sensory markers
      let sensoryCount = 0;
      EROTIC_SENSORY_MARKERS.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) sensoryCount += matches.length;
      });

      // Check for bodily contradiction
      let hasContradiction = false;
      BODILY_CONTRADICTION_PATTERNS.forEach(pattern => {
          if (pattern.test(text)) hasContradiction = true;
      });

      // Check for abstraction-only desire (forbidden)
      let hasAbstractionOnly = false;
      ABSTRACTION_ONLY_PATTERNS.forEach(pattern => {
          if (pattern.test(text)) {
              // Check if there's nearby physical grounding
              const match = text.match(pattern);
              if (match) {
                  const nearbyText = text.slice(Math.max(0, text.indexOf(match[0]) - 100), text.indexOf(match[0]) + 100);
                  let hasPhysical = false;
                  EROTIC_SENSORY_MARKERS.slice(0, 5).forEach(sp => {
                      if (sp.test(nearbyText)) hasPhysical = true;
                  });
                  if (!hasPhysical) hasAbstractionOnly = true;
              }
          }
      });

      // Build violations list
      if (sensoryCount < requiredSensory) {
          violations.push(`SENSORY_DEFICIT: Only ${sensoryCount} sensory markers found (required: ${requiredSensory} for ${wordCount} words)`);
      }

      if (!hasContradiction && wordCount > 200) {
          violations.push('NO_BODILY_CONTRADICTION: Scene lacks restraint-vs-reaction tension');
      }

      if (hasAbstractionOnly) {
          violations.push('ABSTRACTION_ONLY: Desire framed as fate/destiny without physical grounding');
      }

      // Dirty-specific: check for inconvenient desire framing
      if (arousalLevel === 'Dirty') {
          const disruptionPatterns = /\b(shouldn't|wrong|bad idea|complicated|dangerous|mistake|problem|trouble|couldn't|resent|hate that|damn|cursed)\b/gi;
          const hasDisruption = disruptionPatterns.test(text);
          if (!hasDisruption && wordCount > 150) {
              violations.push('DIRTY_TOO_CLEAN: Desire should feel inconvenient/disruptive at Dirty intensity');
          }
      }

      const metrics = {
          wordCount,
          sensoryCount,
          requiredSensory,
          hasContradiction,
          hasAbstractionOnly,
          arousalLevel
      };

      return {
          valid: violations.length === 0,
          violations,
          metrics
      };
  }

  /**
   * Build erotic escalation block for prompt injection
   */
  function buildEroticEscalationBlock() {
      const intensity = window.state?.intensity;
      if (!['Erotic', 'Dirty'].includes(intensity)) return '';

      let block = EROTIC_ESCALATION_BLOCK;
      if (intensity === 'Dirty') {
          block += DIRTY_ESCALATION_ADDENDUM;
      }
      return block;
  }

  // ============================================================
  // GLOBAL TONE COMPLIANCE — MANDATORY LINGUISTIC VALIDATION
  // ============================================================
  // Tone is NOT decorative. Tone must be measurably present in prose.
  // If tone is selected but no linguistic signals appear → FAIL.
  // ============================================================

  /**
   * Tone-specific linguistic signal patterns
   * Each tone MUST have detectable markers in prose
   */
  const TONE_SIGNAL_PATTERNS = {
      // Earnest: Sincere emotional expression, direct feeling, unguarded moments
      Earnest: {
          patterns: [
              /\b(truly|honestly|really|genuinely|actually)\b/gi,
              /\b(heart|soul|feeling|felt|feel)\b/gi,
              /\b(hoped|wished|wanted|needed|longed)\b/gi,
              /\b(believed|trusted|knew|understood)\b/gi,
              /\b(meant|mattered|cared)\b/gi
          ],
          required: 3,
          description: 'sincere emotional expression'
      },

      // WryConfession: Self-contradiction, understated irony, internal deflation
      WryConfession: {
          patterns: [
              /\b(of course|naturally|obviously|predictably)\b/gi,
              /\b(should have|could have|would have|might have)\b.*\b(known|realized|expected)\b/gi,
              /\b(not that|as if|like that|which was)\b.*\b(mattered|helped|changed)\b/gi,
              /\b(told|convinced|assured)\b.*\b(myself|herself|himself)\b/gi,
              /\b(stupid|foolish|ridiculous|absurd|pathetic)\b/gi,
              /\b(anyway|whatever|fine|great)\b/gi,
              /\b(irony|ironic|figures|typical)\b/gi,
              /—.*—/g // Self-interrupting em-dashes common in confessional voice
          ],
          required: 2,
          description: 'self-aware irony or internal contradiction'
      },

      // Poetic: Lyrical language, imagery, sensory metaphor, rhythm
      Poetic: {
          patterns: [
              /\b(like|as if|as though)\b.*\b(the|a)\b/gi, // Similes
              /\b(whispered|murmured|breathed|sighed)\b/gi,
              /\b(light|shadow|dark|bright|glow|gleam)\b/gi,
              /\b(silk|velvet|glass|silver|gold|pearl)\b/gi,
              /\b(drift|float|flow|ripple|shimmer)\b/gi,
              /\b(ache|throb|pulse|hum|sing)\b/gi,
              /,\s*(and|but|or)\s+/g // Lyrical connectives
          ],
          required: 4,
          description: 'lyrical imagery or sensory metaphor'
      },

      // Mythic: Fated language, destiny, archetypes, grandeur
      Mythic: {
          patterns: [
              /\b(fate|fated|destined|destiny|ordained)\b/gi,
              /\b(ancient|eternal|timeless|immortal)\b/gi,
              /\b(prophecy|prophesied|foretold|written)\b/gi,
              /\b(chosen|marked|cursed|blessed)\b/gi,
              /\b(gods|spirits|ancestors|forces)\b/gi,
              /\b(blood|bone|stone|fire|water|earth)\b/gi,
              /\b(must|shall|will)\b.*\b(be|become|fall|rise)\b/gi
          ],
          required: 3,
          description: 'mythic or fated language'
      },

      // Comedic: Timing reversals, disproportionate reactions, tonal whiplash
      Comedic: {
          patterns: [
              /\b(unfortunately|tragically|somehow|apparently)\b/gi,
              /\b(disaster|catastrophe|nightmare|horror)\b.*\b(was|being|became)\b/gi,
              /\b(completely|utterly|absolutely|totally)\b.*\b(wrong|terrible|awful|fine)\b/gi,
              /\b(great|perfect|wonderful|fantastic)\b\./gi, // Deadpan understatement
              /\b(of all|ever|in history|possible)\b/gi,
              /\?!|!\?/g, // Comedic punctuation
              /\.\s*\.\s*\./g, // Trailing off
              /\b(tried|attempted|managed)\b.*\b(not|failed|couldn't)\b/gi
          ],
          required: 2,
          description: 'comedic timing or tonal reversal'
      },

      // Surreal: Unstable causality, dream-logic, reality slippage
      Surreal: {
          patterns: [
              /\b(somehow|impossibly|inexplicably|suddenly)\b/gi,
              /\b(dream|dreaming|dreamlike|nightmare)\b/gi,
              /\b(shifted|changed|transformed|became)\b.*\b(without|before|as)\b/gi,
              /\b(remembered|forgot|knew|didn't know)\b.*\b(that|whether|if|how)\b/gi,
              /\b(wrong|strange|different|off)\b.*\b(way|place|time)\b/gi,
              /\b(where|when|how|why)\b.*\b(had|hadn't|should|shouldn't)\b/gi,
              /\b(melted|dissolved|faded|blurred|bled)\b/gi,
              /\b(reality|world|room|ground)\b.*\b(tilted|shifted|warped)\b/gi
          ],
          required: 3,
          description: 'surreal causality or reality slippage'
      },

      // Dark: Moral cost, consequence, pressure, weight
      Dark: {
          patterns: [
              /\b(cost|price|consequence|toll|debt)\b/gi,
              /\b(wrong|sin|guilt|shame|regret)\b/gi,
              /\b(dark|shadow|black|cold|hollow)\b/gi,
              /\b(trapped|caught|stuck|bound|chained)\b/gi,
              /\b(couldn't|wouldn't|shouldn't)\b.*\b(escape|leave|stop|forget)\b/gi,
              /\b(haunted|hunted|followed|watched)\b/gi,
              /\b(heavy|weight|burden|pressure)\b/gi,
              /\b(blood|pain|wound|scar|bruise)\b/gi
          ],
          required: 3,
          description: 'moral weight or dark consequence'
      }
  };

  // ============================================================
  // NARRATIVE AUTHORITY LAYER (Runs BEFORE Tone + POV)
  // ============================================================
  // POV-agnostic validation that suppresses default LLM narration behaviors.
  // Layer Order: 1. Narrative Authority → 2. Tone → 3. POV → 4. Prose Output
  // ============================================================

  /**
   * FORBIDDEN PATTERNS: Taxonomy leakage (system metadata in prose)
   * These terms are metadata-only and must NEVER appear in prose.
   */
  const NARRATIVE_TAXONOMY_FORBIDDEN = [
      // Archetype names
      /\b(beautiful\s*ruin|open\s*vein|dark\s*vice|anti[\s-]*hero|cloistered)\b/gi,
      // World types (as labels)
      /\b(the\s+)?(fantasy|modern|noir|gothic|scifi|historical|paranormal)\s+(world|setting|genre)\b/gi,
      // Genre labels
      /\b(billionaire|bodyguard|enemies.to.lovers|forbidden|second.chance|rockstar|professor)\s+(romance|trope|genre|story)\b/gi,
      // Tone labels
      /\b(earnest|wry\s*confession|poetic|mythic|comedic|surreal|dark)\s+(tone|mood|register)\b/gi,
      // System concepts
      /\b(arousal\s*level|intensity\s*level|story\s*length|fate\s*card|quill\s*intervention)\b/gi,
      // Meta-narrative terms
      /\b(the\s+narrator|this\s+story|the\s+reader|narrative\s*arc|character\s*development)\b/gi
  ];

  /**
   * EXPLANATORY PATTERNS: Prose that explains rather than shows
   * Sentences that orient, summarize, or frame the world.
   */
  const NARRATIVE_EXPLANATORY_PATTERNS = [
      // Genre/world restatement
      /\b(this\s+is\s+a|in\s+this)\s+(world|story|place|setting)\b/gi,
      /\b(a\s+world\s+where|a\s+place\s+where|a\s+time\s+when)\b/gi,
      /\b(post[\s-]*apocalyptic|dystopian|utopian)\s+(purgatory|wasteland|paradise|society)\b/gi,
      // Framing language
      /\b(to\s+understand|you\s+must\s+know|it\s+is\s+important\s+to)\b/gi,
      /\b(the\s+kind\s+of|the\s+type\s+of|the\s+sort\s+of)\s+(person|place|thing)\b/gi,
      // Summary orientation
      /\b(in\s+summary|to\s+summarize|in\s+other\s+words|what\s+this\s+means)\b/gi,
      /\b(the\s+point\s+is|the\s+lesson\s+is|the\s+meaning\s+is)\b/gi
  ];

  /**
   * HELPFUL NARRATOR PATTERNS: Instructional/apologetic/reverent narration
   * The narrator must not clarify, moralize, or reassure.
   */
  const NARRATIVE_HELPFUL_PATTERNS = [
      // Clarification
      /\b(to\s+be\s+clear|to\s+clarify|in\s+case\s+you're\s+wondering)\b/gi,
      /\b(what\s+this\s+meant\s+was|what\s+happened\s+was|the\s+reason\s+was)\b/gi,
      // Moralization
      /\b(it\s+was\s+(right|wrong|good|bad)\s+to)\b/gi,
      /\b(should\s+have|shouldn't\s+have|ought\s+to\s+have)\s+(known|realized|understood)\b/gi,
      /\b(the\s+moral\s+of|the\s+lesson\s+here|this\s+teaches\s+us)\b/gi,
      // Reassurance
      /\b(everything\s+would\s+be\s+(okay|alright|fine))\b/gi,
      /\b(don't\s+worry|rest\s+assured|have\s+no\s+fear)\b/gi,
      /\b(in\s+the\s+end|ultimately|eventually)\s*,?\s*(everything|it\s+all|things)\s+(worked?\s+out|turned?\s+out)\b/gi,
      // Reverence/apology
      /\b(with\s+all\s+due\s+respect|if\s+I\s+may|forgive\s+me\s+for\s+saying)\b/gi,
      /\b(the\s+sacred|the\s+divine|the\s+holy)\s+(nature|essence|spirit)\s+of\b/gi
  ];

  /**
   * ABSTRACT WITHOUT CONSEQUENCE: States named without physical/relational grounding
   * Heuristic: abstract terms must appear near concrete consequence markers.
   */
  const NARRATIVE_ABSTRACT_TERMS = [
      'hope', 'redemption', 'salvation', 'symbolized', 'represented',
      'meaning', 'purpose', 'destiny', 'fate', 'truth', 'justice',
      'enlightenment', 'transcendence', 'transformation', 'awakening'
  ];

  const NARRATIVE_CONSEQUENCE_MARKERS = [
      // Physical consequence
      /\b(bled|bruised|scarred|broke|tore|burned|ached|throbbed|trembled)\b/gi,
      /\b(cost\s+her|cost\s+him|paid\s+for|lost\s+his|lost\s+her)\b/gi,
      // Relational consequence
      /\b(left\s+him|left\s+her|walked\s+away|turned\s+away|refused)\b/gi,
      /\b(silence\s+between|distance\s+between|the\s+look\s+in)\b/gi,
      // Outcome markers
      /\b(and\s+then|after\s+that|from\s+that\s+day|never\s+again)\b/gi
  ];

  /**
   * Validate prose against Narrative Authority rules
   * @param {string} prose - The generated prose to validate
   * @returns {object} { valid: boolean, errors: Array<{code: string, message: string, match: string}> }
   */
  function validateNarrativeAuthority(prose) {
      if (!prose || typeof prose !== 'string') {
          return { valid: true, errors: [] }; // Empty = pass
      }

      const errors = [];
      const sentences = prose.split(/[.!?]+/).filter(s => s.trim().length > 10);

      // CHECK 1: Taxonomy Leakage (HARD FAIL)
      for (const pattern of NARRATIVE_TAXONOMY_FORBIDDEN) {
          const match = prose.match(pattern);
          if (match) {
              errors.push({
                  code: VALIDATION_ERRORS.NARR_TAXONOMY_LEAK,
                  message: 'System taxonomy leaked into prose',
                  match: match[0]
              });
          }
      }

      // CHECK 2: Explanatory Narration
      for (const pattern of NARRATIVE_EXPLANATORY_PATTERNS) {
          const match = prose.match(pattern);
          if (match) {
              errors.push({
                  code: VALIDATION_ERRORS.NARR_EXPLANATORY,
                  message: 'Explanatory/orienting narration detected',
                  match: match[0]
              });
          }
      }

      // CHECK 3: Helpful Narrator
      for (const pattern of NARRATIVE_HELPFUL_PATTERNS) {
          const match = prose.match(pattern);
          if (match) {
              errors.push({
                  code: VALIDATION_ERRORS.NARR_HELPFUL_NARRATOR,
                  message: 'Helpful/instructional/apologetic narrator detected',
                  match: match[0]
              });
          }
      }

      // CHECK 4: Abstract Without Consequence
      // For each abstract term, check if nearby text has consequence markers
      for (const term of NARRATIVE_ABSTRACT_TERMS) {
          const termRegex = new RegExp(`\\b${term}\\b`, 'gi');
          const termMatch = prose.match(termRegex);
          if (termMatch) {
              // Find sentence containing this term
              const containingSentence = sentences.find(s =>
                  new RegExp(`\\b${term}\\b`, 'gi').test(s)
              );
              if (containingSentence) {
                  // Check if consequence markers exist in same sentence or adjacent
                  const sentenceIndex = sentences.indexOf(containingSentence);
                  const contextWindow = sentences.slice(
                      Math.max(0, sentenceIndex - 1),
                      Math.min(sentences.length, sentenceIndex + 2)
                  ).join(' ');

                  const hasConsequence = NARRATIVE_CONSEQUENCE_MARKERS.some(pattern =>
                      pattern.test(contextWindow)
                  );

                  if (!hasConsequence) {
                      errors.push({
                          code: VALIDATION_ERRORS.NARR_ABSTRACT_WITHOUT_CONSEQUENCE,
                          message: `Abstract term "${term}" lacks physical/relational consequence`,
                          match: containingSentence.trim().substring(0, 80) + '...'
                      });
                  }
              }
          }
      }

      const valid = errors.length === 0;
      if (!valid) {
          console.warn('[NarrativeAuthority] Validation failed:', errors);
      }

      return { valid, errors };
  }

  /**
   * Build Narrative Authority enforcement block for prompt injection
   * Used when regeneration is required due to authority violations.
   */
  function buildNarrativeAuthorityBlock() {
      return `
NARRATIVE AUTHORITY ENFORCEMENT (Global — applies before POV/Tone):

FORBIDDEN:
- Do NOT explain the genre, world, or setting
- Do NOT name archetypes, system concepts, or tone labels
- Do NOT summarize themes or clarify intent
- Do NOT moralize actions or reassure the reader
- Do NOT use abstract terms (hope, redemption, meaning) without physical consequence

REQUIRED:
- Show through action and dialogue, not through narration
- Imply meaning through cost, friction, or outcome
- Let consequence speak. Do not explain what something "means."
- The narrator is not instructional, apologetic, or reverent.

If you name what something IS, you have failed. Show what it COSTS.
`;
  }

  // Track last Narrative Authority validation for DevHUD
  let _lastNarrativeAuthorityValidation = { valid: true, errors: [], timestamp: 0 };

  // Expose for DevHUD and integration
  window.validateNarrativeAuthority = validateNarrativeAuthority;
  window.buildNarrativeAuthorityBlock = buildNarrativeAuthorityBlock;

  /**
   * Tone enforcement prompt block — injected when tone validation might fail
   */
  const TONE_ENFORCEMENT_BLOCKS = {
      Earnest: `TONE ENFORCEMENT (Earnest): Prose must contain sincere, unguarded emotional expression. Show genuine feeling without ironic distance. Characters mean what they say.`,
      WryConfession: `TONE ENFORCEMENT (Wry/Confessional): Prose must contain self-aware irony, internal contradiction, or quiet self-deprecation. Characters undercut their own dignity. Include moments of "I told myself" followed by reality contradicting it.`,
      Poetic: `TONE ENFORCEMENT (Poetic): Prose must be lyrical. Use similes, sensory metaphor, rhythm. Language should shimmer. Verbs should evoke texture and light.`,
      Mythic: `TONE ENFORCEMENT (Mythic): Prose must evoke fate, destiny, ancient patterns. Use words like "ordained," "chosen," "eternal." Events feel written in stone.`,
      Comedic: `TONE ENFORCEMENT (Comedic): Prose must include timing reversals, disproportionate reactions, or deadpan understatement. Something should go wrong in a way that's funny. Tonal whiplash is required.`,
      Surreal: `TONE ENFORCEMENT (Surreal): Prose must include dream-logic, unstable causality, or reality slippage. Time, space, or memory should behave strangely. Things transform without explanation.`,
      Dark: `TONE ENFORCEMENT (Dark): Prose must carry moral weight, consequence, or pressure. Something has cost something. Shadows are literal and metaphorical. Relief does not come easily.`
  };

  /**
   * Validate that prose contains detectable tone signals
   * @returns {object} { valid: boolean, violations: string[], matchCount: number }
   */
  function validateTone(text, tone) {
      // Earnest is the baseline — always passes if nothing stronger selected
      if (!tone || tone === 'Earnest') {
          // Still validate Earnest has SOME emotional presence
          const earnestConfig = TONE_SIGNAL_PATTERNS.Earnest;
          let earnestMatches = 0;
          earnestConfig.patterns.forEach(p => {
              const matches = text.match(p);
              if (matches) earnestMatches += matches.length;
          });
          if (earnestMatches < 2) {
              return {
                  valid: false,
                  violations: ['TONE_DRIFT: Prose lacks basic emotional presence (Earnest baseline)'],
                  matchCount: earnestMatches,
                  required: 2
              };
          }
          return { valid: true, violations: [], matchCount: earnestMatches, required: 2 };
      }

      const config = TONE_SIGNAL_PATTERNS[tone];
      if (!config) {
          // Unknown tone — pass by default
          return { valid: true, violations: [], matchCount: 0, required: 0 };
      }

      let matchCount = 0;
      config.patterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) matchCount += matches.length;
      });

      if (matchCount < config.required) {
          return {
              valid: false,
              violations: [`TONE_DRIFT: "${tone}" tone selected but prose lacks ${config.description}. Found ${matchCount} markers, need ${config.required}+.`],
              matchCount,
              required: config.required
          };
      }

      return { valid: true, violations: [], matchCount, required: config.required };
  }

  /**
   * Build tone enforcement block for prompt injection
   */
  function buildToneEnforcementBlock(tone) {
      if (!tone || !TONE_ENFORCEMENT_BLOCKS[tone]) return '';
      return '\n' + TONE_ENFORCEMENT_BLOCKS[tone] + '\n';
  }

  // ============================================================
  // UNIFIED VALIDATION SYSTEM — RUNTIME ENFORCEMENT LAYER
  // ============================================================
  // Pure validators that return { pass, errors } and NEVER mutate content.
  // On failure: caller must regenerate upstream.
  // Compatible with Dev HUD: check dsp, check pov, check tone, check erotic
  // ============================================================

  /**
   * SHARED ERROR TAXONOMY
   * Structured error codes for all validators
   */
  const VALIDATION_ERRORS = {
      // DSP Errors
      DSP_TEMPLATE_VIOLATION: 'DSP_TEMPLATE_VIOLATION',
      DSP_INVALID_WORLD_PHRASE: 'DSP_INVALID_WORLD_PHRASE',
      DSP_INVALID_GENRE_PHRASE: 'DSP_INVALID_GENRE_PHRASE',
      DSP_INVALID_ARCHETYPE_ADJ: 'DSP_INVALID_ARCHETYPE_ADJ',
      DSP_INVALID_TONE_ADJ: 'DSP_INVALID_TONE_ADJ',
      DSP_EXTRA_PROSE: 'DSP_EXTRA_PROSE',
      DSP_WORLD_SUBTYPE_LEAK: 'DSP_WORLD_SUBTYPE_LEAK',
      DSP_LEGACY_PHRASING: 'DSP_LEGACY_PHRASING',

      // POV Errors (5th Person)
      POV_INVALID_OPENER: 'POV_INVALID_OPENER',
      POV_INVALID_CLOSER: 'POV_INVALID_CLOSER',
      POV_SCENE1_FREQUENCY: 'POV_SCENE1_FREQUENCY',
      POV_LATER_FREQUENCY: 'POV_LATER_FREQUENCY',
      POV_EROTIC_AUTHOR_PRESENT: 'POV_EROTIC_AUTHOR_PRESENT',
      POV_AUTHOR_NARRATES_ACTION: 'POV_AUTHOR_NARRATES_ACTION',
      POV_NON_3RD_PERSON: 'POV_NON_3RD_PERSON',
      POV_META_AWARENESS_EXCESS: 'POV_META_AWARENESS_EXCESS',
      POV_GODMODE_PLAYER_AWARENESS: 'POV_GODMODE_PLAYER_AWARENESS',

      // Tone Errors
      TONE_DRIFT: 'TONE_DRIFT',
      TONE_SIGNAL_DEFICIT: 'TONE_SIGNAL_DEFICIT',

      // Erotic Escalation Errors
      EROTIC_SENSORY_DEFICIT: 'EROTIC_SENSORY_DEFICIT',
      EROTIC_NO_CONTRADICTION: 'EROTIC_NO_CONTRADICTION',
      EROTIC_ABSTRACTION_ONLY: 'EROTIC_ABSTRACTION_ONLY',
      DIRTY_TOO_CLEAN: 'DIRTY_TOO_CLEAN',
      DIRTY_NO_INTRUSION: 'DIRTY_NO_INTRUSION',

      // Title Validation Errors
      TITLE_GENERIC: 'TITLE_GENERIC',
      TITLE_CLICHE: 'TITLE_CLICHE',
      TITLE_ABSTRACT_CLUSTER: 'TITLE_ABSTRACT_CLUSTER',
      TITLE_TONE_MISMATCH: 'TITLE_TONE_MISMATCH',
      TITLE_TOO_LONG: 'TITLE_TOO_LONG',
      TITLE_TOO_SHORT: 'TITLE_TOO_SHORT',

      // Signal Alignment Errors
      SIGNAL_AXIS_MISMATCH: 'SIGNAL_AXIS_MISMATCH',
      TITLE_AROUSAL_CONTRADICTION: 'TITLE_AROUSAL_CONTRADICTION',
      COVER_AROUSAL_CONTRADICTION: 'COVER_AROUSAL_CONTRADICTION',
      AROUSAL_SIGNAL_ABSENT: 'AROUSAL_SIGNAL_ABSENT',
      SIGNAL_AMBIGUOUS: 'SIGNAL_AMBIGUOUS',

      // Title Pipeline Errors
      TITLE_BANNED_PHRASE: 'TITLE_BANNED_PHRASE',
      TITLE_SWAP_TEST_FAIL: 'TITLE_SWAP_TEST_FAIL',
      TITLE_MULTI_CLAUSE: 'TITLE_MULTI_CLAUSE',
      TITLE_MARKETING_COPY: 'TITLE_MARKETING_COPY',
      TITLE_AROUSAL_MISMATCH: 'TITLE_AROUSAL_MISMATCH',
      TITLE_MODE_VIOLATION: 'TITLE_MODE_VIOLATION',
      TITLE_IMMUTABLE_VIOLATION: 'TITLE_IMMUTABLE_VIOLATION',
      COVER_BASELINE_CONTRADICTION: 'COVER_BASELINE_CONTRADICTION',

      // Continuation Path Errors
      CONTINUATION_WORD_REUSE: 'CONTINUATION_WORD_REUSE',
      SAME_WORLD_MISSING_SUBTITLE: 'SAME_WORLD_MISSING_SUBTITLE',
      SAME_WORLD_MISSING_WORLD_NAME: 'SAME_WORLD_MISSING_WORLD_NAME',
      NEW_STORY_PRIOR_NOUN_REUSE: 'NEW_STORY_PRIOR_NOUN_REUSE',

      // Paywall Routing Errors
      STORYPASS_DIRTY_LEAK: 'STORYPASS_DIRTY_LEAK',
      STORYPASS_SOULMATES_LEAK: 'STORYPASS_SOULMATES_LEAK',

      // Narrative Authority Errors (POV-agnostic, runs before Tone/POV)
      NARR_EXPLANATORY: 'NARR_EXPLANATORY',
      NARR_TAXONOMY_LEAK: 'NARR_TAXONOMY_LEAK',
      NARR_ABSTRACT_WITHOUT_CONSEQUENCE: 'NARR_ABSTRACT_WITHOUT_CONSEQUENCE',
      NARR_HELPFUL_NARRATOR: 'NARR_HELPFUL_NARRATOR'
  };

  // ============================================================
  // TITLE VALIDATION + FALLBACK SYSTEM
  // ============================================================
  // Validates generated titles against known failure patterns.
  // On failure: deterministic name-based fallback is generated.
  // ============================================================

  /**
   * TITLE FAILURE PATTERNS
   * Regex patterns that indicate a bad title
   */
  const TITLE_FAIL_PATTERNS = {
      // Generic/cliché romance titles
      GENERIC: [
          /^(a|the)\s+(love|heart|soul|kiss|desire|passion)\b/i,
          /^love('s)?\s+(story|song|way|promise|dance|journey)/i,
          /^hearts?\s+(of|in|on)\s+/i,
          /^(whispers?|echoes?|shadows?|secrets?)\s+of\s+(the\s+)?(heart|soul|desire|love)/i,
          /^(eternal|forbidden|hidden|secret|dark|lost)\s+(love|desire|passion|heart)/i,
          /^(love|desire)\s+(in\s+the\s+)?(shadows?|dark(ness)?|night)/i
      ],
      // Abstract noun clusters (mood collage)
      ABSTRACT_CLUSTER: [
          /^(veiled|shrouded|hidden)\s+(whispers?|secrets?|desires?|shadows?)/i,
          /^(whispers?|echoes?)\s+(of|and)\s+(whispers?|echoes?|shadows?|secrets?)/i,
          /^(shadows?|darkness)\s+(and|of)\s+(light|desire|whispers?)/i,
          /\b(aches?|burns?|yearns?)\s+(of|for|with)\s+(the\s+)?(soul|heart|desire)/i
      ],
      // Poetic-but-empty (no stakes/narrative promise)
      CLICHE: [
          /^(when|where)\s+(hearts?|souls?|love)\s+(meet|collide|dance)/i,
          /^(beneath|beyond|between)\s+(the\s+)?(stars?|moon|sky|veil)/i,
          /^(dancing|dancing\s+with)\s+(shadows?|flames?|fate)/i,
          /^(chasing|finding|seeking)\s+(love|desire|destiny|fate)/i,
          /^(written\s+in|painted\s+with)\s+(the\s+)?(stars?|blood|fire)/i
      ],
      // BANNED PHRASES (HARD FAIL)
      BANNED: [
          /\bshadows?\s+of\b/i,
          /\bechoes?\s+of\b/i,
          /\bwhispers?\s+of\b/i,
          /\bwhispers?\b/i,  // Whispers alone is banned
          /^beneath\b/i,
          /^within\b/i,
          /^beyond\b/i,
          /\bdestiny\b/i,
          /\bfated?\b/i,
          /\bforever\s+(yours|mine|ours)\b/i,
          /\beternal\s+(love|flame|bond)\b/i
      ],
      // Multi-clause poetic phrasing
      MULTI_CLAUSE: [
          /^.+,\s+.+,\s+.+/,  // Three or more comma-separated clauses
          /^.+\s+—\s+.+\s+—\s+.+/,  // Multiple em-dashes
          /^.+:\s+.+:\s+/,  // Multiple colons
          /^(when|where|if|as)\s+.+,\s+(then|so|and)\s+/i  // Conditional phrasing
      ],
      // Marketing copy tone
      MARKETING: [
          /\b(ultimate|passionate|unforgettable|breathtaking|stunning)\b/i,
          /\b(journey|adventure)\s+(of|to)\s+(love|passion|desire)\b/i,
          /\b(one|a)\s+(woman|man|person)('s)?\s+(journey|quest|search)\b/i,
          /\bthe\s+(story|tale)\s+of\b/i,
          /\b(discover|unlock|explore)\s+(the|your)\b/i
      ]
  };

  /**
   * TITLE MODES (LOCKED)
   * Primary title generator selects EXACTLY ONE mode
   */
  const TITLE_MODES = {
      POSSESSIVE_POWER: 'possessive_power',    // "Her Silence", "Your Obedience"
      FORBIDDEN_OBJECT: 'forbidden_object',    // "The Key", "The Contract"
      VERB_LOCKED: 'verb_locked',              // "What He Took", "Where You Knelt"
      TWO_WORD_FRACTURE: 'two_word_fracture'   // "Golden Hunger", "Sacred Damage"
  };

  /**
   * TITLE MODE PATTERNS
   * Regex patterns that detect which mode a title belongs to
   */
  const TITLE_MODE_PATTERNS = {
      [TITLE_MODES.POSSESSIVE_POWER]: /^(her|his|my|your|their|our)\s+\w+$/i,
      [TITLE_MODES.FORBIDDEN_OBJECT]: /^the\s+\w+$/i,
      [TITLE_MODES.VERB_LOCKED]: /^(what|where|when|how|why)\s+(he|she|they|you|i)\s+\w+$/i,
      [TITLE_MODES.TWO_WORD_FRACTURE]: /^\w+\s+\w+$/i  // Fallback: any two words
  };

  /**
   * MODE-SPECIFIC VOCABULARY
   * Words appropriate for each title mode
   */
  const TITLE_MODE_VOCABULARY = {
      [TITLE_MODES.POSSESSIVE_POWER]: {
          possessives: ['Her', 'His', 'My', 'Your', 'Their'],
          nouns: {
              Clean: ['Silence', 'Distance', 'Waiting', 'Refusal', 'Terms'],
              Naughty: ['Secret', 'Temptation', 'Risk', 'Edge', 'Game'],
              Erotic: ['Surrender', 'Claim', 'Confession', 'Devotion', 'Hunger'],
              Dirty: ['Obedience', 'Ruin', 'Undoing', 'Breaking', 'Use']
          }
      },
      [TITLE_MODES.FORBIDDEN_OBJECT]: {
          articles: ['The'],
          objects: {
              Clean: ['Door', 'Letter', 'Ring', 'Promise', 'Line'],
              Naughty: ['Key', 'Contract', 'Rule', 'Wager', 'Dare'],
              Erotic: ['Bargain', 'Binding', 'Claim', 'Mark', 'Bond'],
              Dirty: ['Leash', 'Price', 'Terms', 'Debt', 'Trade']
          }
      },
      [TITLE_MODES.VERB_LOCKED]: {
          openers: ['What', 'Where', 'When', 'How'],
          subjects: ['He', 'She', 'You', 'They', 'I'],
          verbs: {
              Clean: ['Left', 'Kept', 'Said', 'Heard', 'Saw'],
              Naughty: ['Wanted', 'Almost', 'Nearly', 'Risked', 'Dared'],
              Erotic: ['Took', 'Claimed', 'Gave', 'Begged', 'Needed'],
              Dirty: ['Broke', 'Wrecked', 'Used', 'Ruined', 'Demanded']
          }
      },
      [TITLE_MODES.TWO_WORD_FRACTURE]: {
          adjectives: {
              Clean: ['Quiet', 'Cold', 'Still', 'Distant', 'Careful'],
              Naughty: ['Sweet', 'Hidden', 'Secret', 'Dangerous', 'Willing'],
              Erotic: ['Golden', 'Sacred', 'Burning', 'Aching', 'Desperate'],
              Dirty: ['Raw', 'Filthy', 'Ruined', 'Wrecked', 'Brutal']
          },
          nouns: ['Hunger', 'Damage', 'Mercy', 'Silence', 'Reckoning', 'Terms', 'Price']
      }
  };

  /**
   * AROUSAL-TITLE ALIGNMENT
   * Required signals for each arousal level
   */
  const AROUSAL_TITLE_SIGNALS = {
      Clean: {
          required: /\b(distance|silence|waiting|refusal|line|door|kept|left)\b/i,
          forbidden: /\b(hunger|claim|surrender|break|ruin|use|obedience)\b/i,
          description: 'restraint, distance'
      },
      Naughty: {
          required: /\b(secret|risk|edge|dare|wager|almost|nearly|tempt)\b/i,
          forbidden: /\b(claim|surrender|break|ruin|use|filth|raw)\b/i,
          description: 'suggestion, withholding'
      },
      Erotic: {
          required: /\b(claim|hunger|surrender|devotion|confession|need|gave|took)\b/i,
          forbidden: /\b(filth|raw|ruin|wreck|use|break|brutal)\b/i,
          description: 'intimacy, possession'
      },
      Dirty: {
          required: /\b(ruin|break|use|obedience|undoing|wreck|raw|brutal|demand)\b/i,
          forbidden: /\b(sweet|gentle|soft|tender|pure|innocent)\b/i,
          description: 'bluntness, intrusion'
      }
  };

  /**
   * TITLE TONE VALIDATORS
   * Each tone has words that SHOULD appear and words that SHOULD NOT
   */
  const TITLE_TONE_SIGNALS = {
      WryConfession: {
          allow: /\b(truth|lie|almost|nearly|never|mistake|wrong|anyway|still)\b/i,
          forbid: /\b(eternal|destiny|fated|sacred|divine)\b/i
      },
      Comedic: {
          allow: /\b(trouble|disaster|oops|wrong|chaos|mess|help)\b/i,
          forbid: /\b(shadow|darkness|veiled|eternal|doom)\b/i
      },
      Surreal: {
          allow: /\b(dream|strange|nowhere|maybe|almost|forgot|remember)\b/i,
          forbid: /\b(real|practical|ordinary|normal)\b/i
      },
      Dark: {
          allow: /\b(blood|bone|ash|ruin|end|last|only|never)\b/i,
          forbid: /\b(cute|sweet|lovely|precious|darling)\b/i
      },
      Earnest: {
          allow: null, // Most permissive
          forbid: /\b(ironic|sarcastic|bitter|cruel)\b/i
      }
  };

  /**
   * FALLBACK QUALIFIERS — World-keyed
   * Deterministic selection via hash of tone+genre
   */
  const TITLE_FALLBACK_QUALIFIERS = {
      Fantasy: ['Reckoning', 'Wrath', 'Dominion', 'Undoing', 'Ascent', 'Betrayal', 'Return'],
      Historical: ['Scandal', 'Ruin', 'Fortune', 'Disgrace', 'Rise', 'Downfall', 'Legacy'],
      Modern: ['Mistake', 'Risk', 'Gamble', 'Fall', 'Edge', 'Breaking Point', 'Terms'],
      SciFi: ['Protocol', 'Override', 'Glitch', 'Terminus', 'Signal', 'Collision', 'Drift'],
      Noir: ['Alibi', 'Mark', 'Score', 'Angle', 'Setup', 'Double Cross', 'Last Dance'],
      Gothic: ['Haunting', 'Descent', 'Inheritance', 'Curse', 'Reckoning', 'Manor', 'Return'],
      Paranormal: ['Awakening', 'Binding', 'Reckoning', 'Threshold', 'Convergence', 'Haunt']
  };

  /**
   * Simple deterministic hash for fallback selection
   * @param {string} str - String to hash
   * @returns {number} - Hash value
   */
  function simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
      }
      return Math.abs(hash);
  }

  /**
   * Extract first name from a full name string
   * @param {string} fullName - Full character name
   * @returns {string} - First name only
   */
  function extractFirstName(fullName) {
      if (!fullName) return null;
      const parts = fullName.trim().split(/\s+/);
      return parts[0] || null;
  }

  /**
   * TITLE VALIDATION (ENHANCED)
   * Full pipeline validation with banned patterns, swap-test, arousal alignment.
   * @param {string} title - The title to validate
   * @param {string} tone - Current story tone
   * @param {string} arousal - Current arousal level (optional, for arousal validation)
   * @param {object} context - { world, genre } for swap-test (optional)
   * @returns {{ valid: boolean, errors: Array<{code: string, message: string}>, mode: string|null }}
   */
  function validateTitle(title, tone, arousal, context) {
      const errors = [];
      const cleanTitle = (title || '').replace(/"/g, '').trim();

      // Length validation
      if (cleanTitle.length < 2) {
          errors.push({
              code: VALIDATION_ERRORS.TITLE_TOO_SHORT,
              message: `Title too short: "${cleanTitle}"`
          });
          return { valid: false, errors, mode: null };
      }
      if (cleanTitle.split(/\s+/).length > 7) {
          errors.push({
              code: VALIDATION_ERRORS.TITLE_TOO_LONG,
              message: `Title too long (>7 words): "${cleanTitle}"`
          });
      }

      // BANNED PHRASES (HARD FAIL)
      for (const pattern of TITLE_FAIL_PATTERNS.BANNED) {
          if (pattern.test(cleanTitle)) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_BANNED_PHRASE,
                  message: `Banned phrase in title: "${cleanTitle}"`
              });
              break;
          }
      }

      // MULTI-CLAUSE CHECK
      for (const pattern of TITLE_FAIL_PATTERNS.MULTI_CLAUSE) {
          if (pattern.test(cleanTitle)) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_MULTI_CLAUSE,
                  message: `Multi-clause poetic phrasing: "${cleanTitle}"`
              });
              break;
          }
      }

      // MARKETING COPY CHECK
      for (const pattern of TITLE_FAIL_PATTERNS.MARKETING) {
          if (pattern.test(cleanTitle)) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_MARKETING_COPY,
                  message: `Marketing copy tone: "${cleanTitle}"`
              });
              break;
          }
      }

      // Generic pattern check
      for (const pattern of TITLE_FAIL_PATTERNS.GENERIC) {
          if (pattern.test(cleanTitle)) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_GENERIC,
                  message: `Generic title pattern detected: "${cleanTitle}"`
              });
              break;
          }
      }

      // Abstract cluster check
      for (const pattern of TITLE_FAIL_PATTERNS.ABSTRACT_CLUSTER) {
          if (pattern.test(cleanTitle)) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_ABSTRACT_CLUSTER,
                  message: `Abstract noun cluster: "${cleanTitle}"`
              });
              break;
          }
      }

      // Cliché check
      for (const pattern of TITLE_FAIL_PATTERNS.CLICHE) {
          if (pattern.test(cleanTitle)) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_CLICHE,
                  message: `Cliché title pattern: "${cleanTitle}"`
              });
              break;
          }
      }

      // Tone mismatch check
      const toneSignals = TITLE_TONE_SIGNALS[tone];
      if (toneSignals && toneSignals.forbid && toneSignals.forbid.test(cleanTitle)) {
          errors.push({
              code: VALIDATION_ERRORS.TITLE_TONE_MISMATCH,
              message: `Title contains words inappropriate for ${tone} tone: "${cleanTitle}"`
          });
      }

      // AROUSAL ALIGNMENT CHECK (if arousal provided)
      if (arousal && AROUSAL_TITLE_SIGNALS[arousal]) {
          const arousalSignals = AROUSAL_TITLE_SIGNALS[arousal];
          if (arousalSignals.forbidden && arousalSignals.forbidden.test(cleanTitle)) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_AROUSAL_MISMATCH,
                  message: `Title contains words forbidden at ${arousal} level: "${cleanTitle}"`
              });
          }
      }

      // SWAP-TEST UNIQUENESS (if context provided)
      if (context) {
          const swapTestResult = runSwapTest(cleanTitle, context.world, arousal);
          if (!swapTestResult.unique) {
              errors.push({
                  code: VALIDATION_ERRORS.TITLE_SWAP_TEST_FAIL,
                  message: `Title too generic — would fit other books: "${cleanTitle}"`
              });
          }
      }

      // Detect title mode
      const detectedMode = detectTitleMode(cleanTitle);

      return {
          valid: errors.length === 0,
          errors,
          mode: detectedMode
      };
  }

  /**
   * DETECT TITLE MODE
   * Identifies which of the 4 title modes a title belongs to
   * @param {string} title - The title to analyze
   * @returns {string|null} - Mode identifier or null
   */
  function detectTitleMode(title) {
      const cleanTitle = (title || '').trim();

      if (TITLE_MODE_PATTERNS[TITLE_MODES.POSSESSIVE_POWER].test(cleanTitle)) {
          return TITLE_MODES.POSSESSIVE_POWER;
      }
      if (TITLE_MODE_PATTERNS[TITLE_MODES.VERB_LOCKED].test(cleanTitle)) {
          return TITLE_MODES.VERB_LOCKED;
      }
      if (TITLE_MODE_PATTERNS[TITLE_MODES.FORBIDDEN_OBJECT].test(cleanTitle)) {
          return TITLE_MODES.FORBIDDEN_OBJECT;
      }
      if (TITLE_MODE_PATTERNS[TITLE_MODES.TWO_WORD_FRACTURE].test(cleanTitle)) {
          return TITLE_MODES.TWO_WORD_FRACTURE;
      }
      return null;
  }

  /**
   * SWAP-TEST UNIQUENESS
   * Tests if a title is too generic by checking if it could fit other contexts
   * @param {string} title - The title to test
   * @param {string} world - Current world setting
   * @param {string} arousal - Current arousal level
   * @returns {{ unique: boolean, reason: string|null }}
   */
  function runSwapTest(title, world, arousal) {
      const cleanTitle = (title || '').toLowerCase().trim();

      // Universal titles that fit ANY context → FAIL
      const universalPatterns = [
          /^the\s+(beginning|end|journey|story|tale)$/i,
          /^(love|desire|passion)\s*(story|tale)?$/i,
          /^(new|first|last)\s+(love|chance|time)$/i,
          /^(starting|finding|losing)\s+(over|out|love)$/i
      ];
      for (const pattern of universalPatterns) {
          if (pattern.test(cleanTitle)) {
              return { unique: false, reason: 'Universal pattern fits any context' };
          }
      }

      // World-agnostic check: title should have some specificity
      // If title contains only abstract emotional words → FAIL
      const abstractOnlyPattern = /^(love|heart|soul|desire|passion|hope|dream|wish|longing|yearning)(\s+(love|heart|soul|desire|passion|hope|dream|wish))?$/i;
      if (abstractOnlyPattern.test(cleanTitle)) {
          return { unique: false, reason: 'Title contains only abstract emotional words' };
      }

      // Arousal-agnostic check: title should signal specific intensity
      // If title could plausibly belong to Clean OR Dirty → FAIL
      const arousalAgnosticPatterns = [
          /^the\s+(moment|night|day|time)$/i,
          /^(that|this)\s+(one|night|day|moment)$/i
      ];
      for (const pattern of arousalAgnosticPatterns) {
          if (pattern.test(cleanTitle)) {
              return { unique: false, reason: 'Title could fit any arousal level' };
          }
      }

      return { unique: true, reason: null };
  }

  /**
   * TITLE IMMUTABILITY ENFORCEMENT
   * Once set, title must never change. Returns error if mutation attempted.
   * @param {string} currentTitle - Currently stored title
   * @param {string} newTitle - Proposed new title
   * @returns {{ allowed: boolean, error: object|null }}
   */
  function enforceTitleImmutability(currentTitle, newTitle) {
      // If no current title, any new title is allowed
      if (!currentTitle || currentTitle.trim() === '') {
          return { allowed: true, error: null };
      }

      // If titles match, no mutation
      if (currentTitle.trim() === newTitle?.trim()) {
          return { allowed: true, error: null };
      }

      // Any attempt to change an existing title is a HARD FAIL
      return {
          allowed: false,
          error: {
              code: VALIDATION_ERRORS.TITLE_IMMUTABLE_VIOLATION,
              message: `Title mutation blocked: "${currentTitle}" → "${newTitle}"`
          }
      };
  }

  /**
   * COVER ESCALATION VALIDATION
   * Cover may escalate beyond title's baseline, but must not contradict downward
   * @param {string} titleArousal - Arousal level signaled by title
   * @param {string} coverArousal - Current cover arousal (from intensity layers)
   * @param {string} baselineArousal - Original arousal when title was generated
   * @returns {{ valid: boolean, error: object|null }}
   */
  function validateCoverEscalation(titleArousal, coverArousal, baselineArousal) {
      const arousalOrder = ['Clean', 'Naughty', 'Erotic', 'Dirty'];
      const baselineIndex = arousalOrder.indexOf(baselineArousal);
      const coverIndex = arousalOrder.indexOf(coverArousal);

      // Cover can escalate (higher index) or stay same
      // Cover CANNOT de-escalate below baseline
      if (coverIndex < baselineIndex) {
          return {
              valid: false,
              error: {
                  code: VALIDATION_ERRORS.COVER_BASELINE_CONTRADICTION,
                  message: `Cover de-escalated below title baseline: ${baselineArousal} → ${coverArousal}`
              }
          };
      }

      return { valid: true, error: null };
  }

  /**
   * BUILD TITLE GENERATION PROMPT
   * Creates structured prompt for title generation based on selected mode
   * @param {string} mode - Selected title mode
   * @param {string} arousal - Current arousal level
   * @param {string} world - Current world setting
   * @returns {string} - Prompt text
   */
  function buildTitlePrompt(mode, arousal, world) {
      const modeVocab = TITLE_MODE_VOCABULARY[mode];
      const arousalSignals = AROUSAL_TITLE_SIGNALS[arousal];

      let modeInstruction = '';
      switch (mode) {
          case TITLE_MODES.POSSESSIVE_POWER:
              modeInstruction = `Generate a POSSESSIVE POWER title.
Format: [Possessive] [Noun]
Possessives: ${modeVocab.possessives.join(', ')}
Nouns for ${arousal}: ${modeVocab.nouns[arousal]?.join(', ') || 'Silence, Distance, Terms'}
Examples: "Her Silence", "Your Obedience", "My Confession"`;
              break;
          case TITLE_MODES.FORBIDDEN_OBJECT:
              modeInstruction = `Generate a FORBIDDEN OBJECT title.
Format: The [Object]
Objects for ${arousal}: ${modeVocab.objects[arousal]?.join(', ') || 'Door, Key, Contract'}
Examples: "The Key", "The Contract", "The Door"`;
              break;
          case TITLE_MODES.VERB_LOCKED:
              modeInstruction = `Generate a VERB-LOCKED title (past tense).
Format: [What/Where/When/How] [Subject] [Past Verb]
Verbs for ${arousal}: ${modeVocab.verbs[arousal]?.join(', ') || 'Took, Left, Kept'}
Examples: "What He Took", "Where You Knelt"`;
              break;
          case TITLE_MODES.TWO_WORD_FRACTURE:
              modeInstruction = `Generate a TWO-WORD FRACTURE title.
Format: [Adjective] [Noun]
Adjectives for ${arousal}: ${modeVocab.adjectives[arousal]?.join(', ') || 'Golden, Sacred, Raw'}
Nouns: ${modeVocab.nouns.join(', ')}
Examples: "Golden Hunger", "Sacred Damage"`;
              break;
      }

      return `${modeInstruction}

AROUSAL SIGNAL REQUIRED: ${arousal} → ${arousalSignals?.description || 'clear intensity'}
WORLD: ${world}

BANNED (HARD FAIL):
- "Shadows of", "Echoes of", "Whispers"
- "Beneath", "Within", "Beyond"
- Destiny/fate language
- Multi-clause poetic phrasing
- Marketing copy tone

Return ONLY the title, no quotes or explanation.`;
  }

  /**
   * SELECT TITLE MODE
   * Deterministically selects which title mode to use
   * @param {string} world - Current world setting
   * @param {string} arousal - Current arousal level
   * @param {string} genre - Current genre
   * @returns {string} - Selected mode
   */
  function selectTitleMode(world, arousal, genre) {
      // Use hash for deterministic but varied selection
      const seed = (world || 'Modern') + (arousal || 'Naughty') + (genre || 'Romance');
      const hash = simpleHash(seed);
      const modes = Object.values(TITLE_MODES);
      return modes[hash % modes.length];
  }

  // Expose pipeline functions globally
  window.detectTitleMode = detectTitleMode;
  window.runSwapTest = runSwapTest;
  window.enforceTitleImmutability = enforceTitleImmutability;
  window.validateCoverEscalation = validateCoverEscalation;
  window.buildTitlePrompt = buildTitlePrompt;
  window.selectTitleMode = selectTitleMode;
  window.TITLE_MODES = TITLE_MODES;

  // ============================================================
  // TRIPLE-FORK CONTINUATION SYSTEM
  // ============================================================
  // Three paths at story completion:
  // 1. Continue this story (same world instance, sequel title)
  // 2. New story, same world (same world ID, world-marked title)
  // 3. Completely new story (new world ID, fresh title)
  // ============================================================

  const CONTINUATION_PATHS = {
      CONTINUE: 'continue',
      SAME_WORLD: 'same_world',
      NEW_STORY: 'new_story'
  };

  const WORLD_STORY_SUFFIXES = ['Story', 'Tale', 'Chronicle', 'Affair', 'Exposé', 'Adventure'];

  /**
   * Generate a unique World Instance ID
   * @returns {string}
   */
  function generateWorldInstanceId() {
      return 'world_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Generate a unique World Name based on world + flavor
   * @param {string} world - Current world setting
   * @param {string} genre - Current genre
   * @returns {string} - Unique world name (e.g., "The Veiled Courts", "Obsidian Towers")
   */
  function generateWorldName(world, genre) {
      const WORLD_NAME_PREFIXES = {
          Modern: ['The Glass', 'The Steel', 'The Gilded', 'The Shadow'],
          Historical: ['The Veiled', 'The Crown', 'The Silver', 'The Crimson'],
          Fantasy: ['The Arcane', 'The Sundered', 'The Moonlit', 'The Thornwood'],
          SciFi: ['The Obsidian', 'The Nebula', 'The Quantum', 'The Orbital'],
          Noir: ['The Smoke', 'The Neon', 'The Midnight', 'The Velvet'],
          Gothic: ['The Hollow', 'The Raven', 'The Ashen', 'The Shrouded'],
          Paranormal: ['The Liminal', 'The Spectral', 'The Twilight', 'The Veil']
      };
      const WORLD_NAME_SUFFIXES = {
          Modern: ['Towers', 'District', 'Circle', 'Heights'],
          Historical: ['Courts', 'Houses', 'Halls', 'Estates'],
          Fantasy: ['Realm', 'Kingdom', 'Dominion', 'Throne'],
          SciFi: ['Station', 'Sector', 'Frontier', 'Array'],
          Noir: ['Corners', 'Streets', 'District', 'Alleys'],
          Gothic: ['Manor', 'Abbey', 'Estate', 'Grounds'],
          Paranormal: ['Crossing', 'Threshold', 'Boundary', 'Gate']
      };

      const prefixes = WORLD_NAME_PREFIXES[world] || WORLD_NAME_PREFIXES.Modern;
      const suffixes = WORLD_NAME_SUFFIXES[world] || WORLD_NAME_SUFFIXES.Modern;

      const seed = (world || '') + (genre || '') + Date.now();
      const prefixIndex = simpleHash(seed) % prefixes.length;
      const suffixIndex = simpleHash(seed + 'suffix') % suffixes.length;

      return prefixes[prefixIndex] + ' ' + suffixes[suffixIndex];
  }

  /**
   * Get world story suffix based on world/tone
   * @param {string} world - Current world
   * @param {string} tone - Current tone
   * @returns {string}
   */
  function getWorldStorySuffix(world, tone) {
      // Different tones get different suffixes
      if (tone === 'Dark' || tone === 'Horror') return 'Chronicle';
      if (tone === 'Comedic') return 'Adventure';
      if (tone === 'WryConfession') return 'Exposé';
      if (world === 'Noir') return 'Affair';
      return 'Tale';
  }

  /**
   * Build continuation title prompt for CONTINUE path
   * Must use SAME mode, echo structure, share NO exact words
   * @param {string} previousTitle - The title to echo
   * @param {string} previousMode - The mode to maintain
   * @param {string} arousal - Current arousal
   * @returns {string}
   */
  function buildContinuationTitlePrompt(previousTitle, previousMode, arousal) {
      const modeVocab = TITLE_MODE_VOCABULARY[previousMode];

      return `Generate a SEQUEL title that echoes the previous title.

PREVIOUS TITLE: "${previousTitle}"
TITLE MODE: ${previousMode} (MUST use same structure)

RULES:
1. Use the EXACT SAME title mode/structure as "${previousTitle}"
2. Echo its semantic feel and rhythm
3. Share NO EXACT WORDS with the previous title
4. Signal ${arousal} arousal level

${previousMode === TITLE_MODES.POSSESSIVE_POWER ?
    `Format: [Possessive] [Noun] — Use: ${modeVocab.possessives.join(', ')}` :
    previousMode === TITLE_MODES.FORBIDDEN_OBJECT ?
    `Format: The [Object]` :
    previousMode === TITLE_MODES.VERB_LOCKED ?
    `Format: [What/Where/When/How] [Subject] [Past Verb]` :
    `Format: [Adjective] [Noun]`}

Example: "The Hitched Breath" → "The Forbidden Sigh"

Return ONLY the title, no quotes or explanation.`;
  }

  /**
   * Build same-world title with world-marking subtitle
   * @param {string} primaryTitle - The main title
   * @param {string} worldName - The persistent world name
   * @param {string} suffix - Story/Tale/Chronicle etc.
   * @returns {string}
   */
  function buildWorldMarkedTitle(primaryTitle, worldName, suffix) {
      return `${primaryTitle}\nA ${worldName} ${suffix}`;
  }

  /**
   * Validate continuation title based on path
   * @param {string} title - Generated title
   * @param {string} path - CONTINUE | SAME_WORLD | NEW_STORY
   * @param {object} context - { previousTitle, worldName, priorNouns }
   * @returns {{ valid: boolean, errors: Array<{code: string, message: string}> }}
   */
  function validateContinuationTitle(title, path, context) {
      const errors = [];
      const cleanTitle = (title || '').trim();

      if (path === CONTINUATION_PATHS.CONTINUE) {
          // Must share no exact words with previous title
          if (context.previousTitle) {
              const prevWords = context.previousTitle.toLowerCase().split(/\s+/);
              const newWords = cleanTitle.toLowerCase().split(/\s+/);
              const sharedWords = newWords.filter(w => prevWords.includes(w) && w.length > 2);
              if (sharedWords.length > 0) {
                  errors.push({
                      code: 'CONTINUATION_WORD_REUSE',
                      message: `Continuation title shares words with previous: ${sharedWords.join(', ')}`
                  });
              }
          }
      }

      if (path === CONTINUATION_PATHS.SAME_WORLD) {
          // Must include world-marking subtitle
          if (!cleanTitle.includes('\n') && !cleanTitle.includes(':')) {
              errors.push({
                  code: 'SAME_WORLD_MISSING_SUBTITLE',
                  message: 'Same-world title must include world-marking subtitle'
              });
          }
          // Must include world name
          if (context.worldName && !cleanTitle.includes(context.worldName)) {
              errors.push({
                  code: 'SAME_WORLD_MISSING_WORLD_NAME',
                  message: `Same-world title must include world name: "${context.worldName}"`
              });
          }
      }

      if (path === CONTINUATION_PATHS.NEW_STORY) {
          // Must not reference prior world nouns
          if (context.priorNouns && context.priorNouns.length > 0) {
              const titleLower = cleanTitle.toLowerCase();
              const reusedNouns = context.priorNouns.filter(n => titleLower.includes(n.toLowerCase()));
              if (reusedNouns.length > 0) {
                  errors.push({
                      code: 'NEW_STORY_PRIOR_NOUN_REUSE',
                      message: `New story title references prior world: ${reusedNouns.join(', ')}`
                  });
              }
          }
      }

      return { valid: errors.length === 0, errors };
  }

  /**
   * Initialize continuation state for a path
   * @param {string} path - Selected continuation path
   */
  function initializeContinuationPath(path) {
      state.continuationPath = path;

      if (path === CONTINUATION_PATHS.CONTINUE) {
          // Keep same world instance, store previous title for reference
          // worldInstanceId stays the same
          console.log('[Continuation] CONTINUE: Same world instance, sequel title');
      } else if (path === CONTINUATION_PATHS.SAME_WORLD) {
          // Keep world instance ID and name, new story ID
          state.storyId = null; // Will be regenerated
          state.previousTitle = state.immutableTitle;
          console.log('[Continuation] SAME_WORLD: Same world, new narrative');
      } else {
          // NEW_STORY: Reset everything
          state.worldInstanceId = generateWorldInstanceId();
          state.worldName = null;
          state.previousTitle = null;
          state.previousTitleMode = null;
          state.storyId = null;
          console.log('[Continuation] NEW_STORY: Fresh start, new world instance');
      }
  }

  /**
   * Route title generation based on continuation path
   * @param {string} path - Continuation path
   * @param {object} context - Generation context
   * @returns {object} - { prompt: string, mode: string, worldMarked: boolean }
   */
  function routeTitleGeneration(path, context) {
      const { world, arousal, genre, tone } = context;

      if (path === CONTINUATION_PATHS.CONTINUE) {
          // Use previous mode, build continuation prompt
          const mode = state.previousTitleMode || detectTitleMode(state.previousTitle) || selectTitleMode(world, arousal, genre);
          return {
              prompt: buildContinuationTitlePrompt(state.previousTitle, mode, arousal),
              mode: mode,
              worldMarked: false
          };
      } else if (path === CONTINUATION_PATHS.SAME_WORLD) {
          // Standard title generation, will add world suffix after
          if (!state.worldName) {
              state.worldName = generateWorldName(world, genre);
          }
          const mode = selectTitleMode(world, arousal, genre);
          return {
              prompt: buildTitlePrompt(mode, arousal, world),
              mode: mode,
              worldMarked: true,
              worldName: state.worldName,
              suffix: getWorldStorySuffix(world, tone)
          };
      } else {
          // NEW_STORY: Standard title generation
          const mode = selectTitleMode(world, arousal, genre);
          return {
              prompt: buildTitlePrompt(mode, arousal, world),
              mode: mode,
              worldMarked: false
          };
      }
  }

  /**
   * Store prior world proper nouns for new story validation
   * @returns {string[]}
   */
  function collectPriorWorldNouns() {
      const nouns = [];
      if (state.worldName) nouns.push(state.worldName);
      if (state.rawPlayerName) nouns.push(state.rawPlayerName);
      if (state.rawPartnerName) nouns.push(state.rawPartnerName);
      // Could add location names, institution names from story if tracked
      return nouns.filter(n => n && n.length > 2);
  }

  // Expose continuation system globally
  window.CONTINUATION_PATHS = CONTINUATION_PATHS;
  window.generateWorldInstanceId = generateWorldInstanceId;
  window.generateWorldName = generateWorldName;
  window.validateContinuationTitle = validateContinuationTitle;
  window.initializeContinuationPath = initializeContinuationPath;
  window.routeTitleGeneration = routeTitleGeneration;
  window.buildWorldMarkedTitle = buildWorldMarkedTitle;
  window.collectPriorWorldNouns = collectPriorWorldNouns;

  /**
   * Show the triple-fork continuation modal
   * Called at story completion or when user requests new story
   */
  function showContinuationFork() {
      const modal = document.getElementById('continuationForkModal');
      if (modal) {
          modal.classList.remove('hidden');
          console.log('[Continuation] Fork modal shown');
      }
  }

  /**
   * Hide the continuation fork modal
   */
  function hideContinuationFork() {
      const modal = document.getElementById('continuationForkModal');
      if (modal) {
          modal.classList.add('hidden');
      }
  }

  /**
   * Handle user selection of continuation path
   * @param {string} path - 'continue' | 'same_world' | 'new_story'
   */
  function selectContinuationPath(path) {
      // Map string to constant
      const pathMap = {
          'continue': CONTINUATION_PATHS.CONTINUE,
          'same_world': CONTINUATION_PATHS.SAME_WORLD,
          'new_story': CONTINUATION_PATHS.NEW_STORY
      };
      const selectedPath = pathMap[path] || CONTINUATION_PATHS.NEW_STORY;

      console.log('[Continuation] Path selected:', selectedPath);

      // Store prior world nouns before path initialization (for NEW_STORY validation)
      const priorNouns = collectPriorWorldNouns();
      state._priorWorldNouns = priorNouns;

      // Preserve world for SAME_WORLD path before any resets
      const preservedWorld = state.picks?.world;
      const preservedTitle = state.immutableTitle;
      const preservedTitleMode = state.previousTitleMode;

      // Initialize the path (sets continuation state)
      initializeContinuationPath(selectedPath);

      // Hide modal
      hideContinuationFork();

      // Handle path-specific state management
      if (selectedPath === CONTINUATION_PATHS.CONTINUE) {
          // Direct sequel — preserve most state, just reset story position
          state.storyEnded = false;
          state.turnCount = 0;
          clearStoryContent();
          // Title should echo previous title's mode
          state.previousTitle = preservedTitle;
          console.log('[Continuation] CONTINUE: Story state reset for sequel');
          window.showScreen('setup');
      } else if (selectedPath === CONTINUATION_PATHS.SAME_WORLD) {
          // Same world, new story — reset story but keep world
          resetForNewStory();
          state.picks.world = preservedWorld; // Restore world selection
          state.previousTitle = preservedTitle;
          state.previousTitleMode = preservedTitleMode;
          // Pre-select the world card in UI
          preselectWorldCard(preservedWorld);
          console.log('[Continuation] SAME_WORLD: Fresh story in', preservedWorld);
          window.showScreen('setup');
      } else {
          // Completely new story — full reset
          resetForNewStory();
          console.log('[Continuation] NEW_STORY: Full reset');
          window.showScreen('setup');
      }
  }

  /**
   * Clear story content without resetting picks
   */
  function clearStoryContent() {
      state.currentStoryContent = '';
      state.storyHistory = [];
      localStorage.removeItem('sb_saved_story');
      // Clear pagination if available
      if (typeof StoryPagination !== 'undefined' && StoryPagination.clear) {
          StoryPagination.clear();
      }
      const storyEl = document.getElementById('storyText');
      if (storyEl) storyEl.innerHTML = '';
  }

  /**
   * Reset state for a new story (preserves subscription/payment state)
   */
  function resetForNewStory() {
      state.storyEnded = false;
      state.turnCount = 0;
      state.storyLength = 'voyeur';
      state.storyId = null;
      clearStoryContent();

      // Reset DSP state for new story
      if (typeof resetDSPState === 'function') resetDSPState();

      // Reset title state
      state.immutableTitle = null;
      state.coverArchetype = null;

      // Reset visual state
      state.visual = { autoLock: true, locked: false, lastImageUrl: "", bible: { style: "", setting: "", characters: {} }, sceneBudgets: {}, visualizedScenes: {} };

      // Reset per-story visualization credits (preserve globalCredits and payAsYouGoEnabled)
      if (state.vizEconomy) {
          state.vizEconomy.storyCredits = 0;
          state.vizEconomy.lastCreditedSceneCount = 0;
          state.vizEconomy.awardedMilestones = [];
      }

      // Clear cover state
      if (_coverAbortController) { _coverAbortController.abort(); _coverAbortController = null; }
      if (typeof resetBookState === 'function') resetBookState();
      const coverImg = document.getElementById('bookCoverImg');
      if (coverImg) coverImg.src = '';
      const coverLoading = document.getElementById('coverLoadingState');
      if (coverLoading) coverLoading.classList.add('hidden');
      const bookObj = document.getElementById('bookObject');
      if (bookObj) bookObj.classList.add('hidden');
  }

  /**
   * Pre-select a world card in the setup UI
   */
  function preselectWorldCard(world) {
      if (!world) return;
      // Find and select the world card
      const worldCards = document.querySelectorAll('.sb-card[data-grp="world"]');
      worldCards.forEach(card => {
          card.classList.remove('selected', 'flipped');
          if (card.dataset.val === world) {
              card.classList.add('selected', 'flipped');
          }
      });
  }

  /**
   * Default to new story if modal closed without selection
   */
  function defaultContinuationPath() {
      console.log('[Continuation] Default path: NEW_STORY');
      selectContinuationPath('new_story');
  }

  // Expose fork modal handlers globally
  window.showContinuationFork = showContinuationFork;
  window.hideContinuationFork = hideContinuationFork;
  window.selectContinuationPath = selectContinuationPath;
  window.defaultContinuationPath = defaultContinuationPath;

  /**
   * FALLBACK TITLE GENERATOR
   * Creates a deterministic name-based title when validation fails.
   * Pattern A: [FirstName]'s [Qualifier]
   * Pattern B: [FullName]: [Qualifier]
   *
   * @param {object} opts - { playerName, partnerName, world, tone, genre }
   * @returns {string} - Fallback title (never fails)
   */
  function generateFallbackTitle(opts) {
      const { playerName, partnerName, world, tone, genre } = opts;

      // Get qualifiers for this world (fallback to Modern)
      const qualifiers = TITLE_FALLBACK_QUALIFIERS[world] || TITLE_FALLBACK_QUALIFIERS.Modern;

      // Deterministic qualifier selection via hash of tone+genre
      const hashSeed = (tone || 'Earnest') + (genre || 'Romance');
      const qualifierIndex = simpleHash(hashSeed) % qualifiers.length;
      const qualifier = qualifiers[qualifierIndex];

      // Prefer love interest name for more intrigue, fallback to player
      const primaryName = partnerName || playerName;
      const firstName = extractFirstName(primaryName);

      // If we have a valid first name, use Pattern A
      if (firstName && firstName.length > 1 && !/^(the|a)\s/i.test(firstName)) {
          return `${firstName}'s ${qualifier}`;
      }

      // If we have a full name with 2+ parts, use Pattern B
      if (primaryName && primaryName.includes(' ')) {
          return `${primaryName}: ${qualifier}`;
      }

      // Last resort: use qualifier alone with dramatic framing
      return `The ${qualifier}`;
  }

  // Expose validators globally for Dev HUD
  window.validateTitle = validateTitle;
  window.generateFallbackTitle = generateFallbackTitle;

  // ============================================================
  // TITLE ↔ COVER SIGNAL ALIGNMENT LAYER
  // ============================================================
  // Ensures title and cover art signal the SAME dominant axis.
  // Primary axis: exactly one (usually Arousal)
  // Secondary axis: optional (max one)
  // All other axes: neutral
  // ============================================================

  /**
   * SIGNAL AXIS DEFINITIONS
   * Each axis has detection patterns for both title and cover
   */
  const SIGNAL_AXES = {
      AROUSAL: 'arousal',
      TONE: 'tone',
      GENRE: 'genre'
  };

  /**
   * AROUSAL SIGNAL PATTERNS
   * Title/cover must independently signal the arousal tier
   */
  const AROUSAL_SIGNALS = {
      Clean: {
          title: {
              allow: /\b(distance|restraint|waiting|watching|almost|nearly|silence|apart)\b/i,
              forbid: /\b(burn|ache|want|hunger|possession|devour|consume|claim)\b/i
          },
          cover: {
              allow: ['separation', 'stillness', 'restraint', 'waiting', 'longing from afar'],
              forbid: ['touch', 'embrace', 'intimacy', 'skin', 'heat', 'tension']
          },
          signal: 'restraint, distance'
      },
      Naughty: {
          title: {
              allow: /\b(almost|want|tempt|tease|forbidden|secret|risk|dare|edge)\b/i,
              forbid: /\b(claim|possess|devour|consume|take|surrender|yield)\b/i
          },
          cover: {
              allow: ['suggestion', 'withholding', 'anticipation', 'almost-touch', 'nearness'],
              forbid: ['explicit intimacy', 'possession', 'surrender', 'exposure']
          },
          signal: 'suggestion, withholding'
      },
      Erotic: {
          title: {
              allow: /\b(want|ache|burn|claim|mine|yours|possess|surrender|give|take)\b/i,
              forbid: /\b(filth|raw|intrude|force|use|ruin|wreck|break)\b/i
          },
          cover: {
              allow: ['intimacy', 'possession', 'surrender', 'closeness', 'heat', 'connection'],
              forbid: ['clinical', 'crude', 'explicit anatomy', 'shock']
          },
          signal: 'intimacy, possession'
      },
      Dirty: {
          title: {
              allow: /\b(filth|raw|ruin|wreck|use|break|devour|consume|claim|take)\b/i,
              forbid: /\b(sweet|gentle|soft|tender|pure|innocent|chaste)\b/i
          },
          cover: {
              allow: ['intrusion', 'bluntness', 'rawness', 'edge', 'danger', 'intensity'],
              forbid: ['sweetness', 'gentleness', 'purity', 'innocence']
          },
          signal: 'intrusion, bluntness'
      }
  };

  /**
   * TONE SIGNAL PATTERNS
   * Secondary axis - tone signals in title/cover
   */
  const TONE_AXIS_SIGNALS = {
      WryConfession: {
          title: /\b(almost|anyway|still|wrong|mistake|lie|truth|never)\b/i,
          cover: ['irony', 'self-awareness', 'confession', 'doubt']
      },
      Comedic: {
          title: /\b(oops|wrong|disaster|mess|trouble|help|chaos)\b/i,
          cover: ['lightness', 'absurdity', 'playfulness', 'mischief']
      },
      Surreal: {
          title: /\b(dream|strange|nowhere|forgot|remember|almost|maybe)\b/i,
          cover: ['dream-logic', 'dissolution', 'unreality', 'drift']
      },
      Dark: {
          title: /\b(blood|bone|ash|ruin|end|last|only|never|death)\b/i,
          cover: ['weight', 'shadow', 'gravity', 'consequence', 'doom']
      },
      Earnest: {
          title: null, // Most permissive
          cover: ['sincerity', 'hope', 'warmth', 'openness']
      }
  };

  /**
   * GENRE SIGNAL PATTERNS
   * Secondary axis - genre signals in title/cover
   */
  const GENRE_AXIS_SIGNALS = {
      Billionaire: {
          title: /\b(empire|fortune|deal|contract|merger|penthouse|heir)\b/i,
          cover: ['wealth', 'power', 'luxury', 'corporate', 'skyline']
      },
      CrimeSyndicate: {
          title: /\b(blood|family|loyalty|debt|oath|boss|territory)\b/i,
          cover: ['danger', 'shadows', 'underworld', 'loyalty']
      },
      Espionage: {
          title: /\b(secret|agent|cover|mission|asset|handler|burn)\b/i,
          cover: ['mystery', 'concealment', 'danger', 'surveillance']
      },
      Noir: {
          title: /\b(smoke|rain|night|shadow|dame|case|trouble)\b/i,
          cover: ['shadow', 'mystery', 'urban night', 'smoke', 'rain']
      },
      Heist: {
          title: /\b(score|job|crew|vault|mark|inside|take)\b/i,
          cover: ['precision', 'tension', 'planning', 'stakes']
      }
  };

  /**
   * Extract dominant signal axis from title
   * @param {string} title - The book title
   * @param {string} arousal - Current arousal level
   * @param {string} tone - Current tone
   * @param {string} genre - Current genre
   * @returns {{ primary: string, secondary: string|null, arousalMatch: boolean, signals: object }}
   */
  function extractTitleSignals(title, arousal, tone, genre) {
      const cleanTitle = (title || '').toLowerCase().trim();
      const signals = {
          arousal: null,
          tone: null,
          genre: null
      };

      // Check arousal signals
      const arousalConfig = AROUSAL_SIGNALS[arousal];
      if (arousalConfig?.title?.allow?.test(cleanTitle)) {
          signals.arousal = arousal;
      }
      // Check for arousal contradiction
      const arousalContradiction = arousalConfig?.title?.forbid?.test(cleanTitle);

      // Check tone signals
      const toneConfig = TONE_AXIS_SIGNALS[tone];
      if (toneConfig?.title?.test(cleanTitle)) {
          signals.tone = tone;
      }

      // Check genre signals
      const genreConfig = GENRE_AXIS_SIGNALS[genre];
      if (genreConfig?.title?.test(cleanTitle)) {
          signals.genre = genre;
      }

      // Determine primary axis (priority: arousal > tone > genre)
      let primary = null;
      let secondary = null;

      if (signals.arousal) {
          primary = SIGNAL_AXES.AROUSAL;
          if (signals.tone) secondary = SIGNAL_AXES.TONE;
          else if (signals.genre) secondary = SIGNAL_AXES.GENRE;
      } else if (signals.tone) {
          primary = SIGNAL_AXES.TONE;
          if (signals.genre) secondary = SIGNAL_AXES.GENRE;
      } else if (signals.genre) {
          primary = SIGNAL_AXES.GENRE;
      }

      return {
          primary,
          secondary,
          arousalMatch: signals.arousal === arousal,
          arousalContradiction,
          signals
      };
  }

  /**
   * Extract dominant signal axis from cover prompt
   * @param {object} coverPrompt - The cover prompt object from buildCoverPrompt
   * @param {string} arousal - Current arousal level
   * @param {string} tone - Current tone
   * @param {string} genre - Current genre
   * @returns {{ primary: string, secondary: string|null, arousalMatch: boolean, signals: object }}
   */
  function extractCoverSignals(coverPrompt, arousal, tone, genre) {
      const promptText = (coverPrompt?.promptText || '').toLowerCase();
      const emotion = (coverPrompt?.emotion || '').toLowerCase();
      const signals = {
          arousal: null,
          tone: null,
          genre: null
      };

      // Check arousal signals in cover
      const arousalConfig = AROUSAL_SIGNALS[arousal];
      if (arousalConfig?.cover?.allow) {
          const hasArousalSignal = arousalConfig.cover.allow.some(sig =>
              promptText.includes(sig.toLowerCase()) || emotion.includes(sig.toLowerCase())
          );
          if (hasArousalSignal) signals.arousal = arousal;
      }

      // Check for arousal contradiction
      let arousalContradiction = false;
      if (arousalConfig?.cover?.forbid) {
          arousalContradiction = arousalConfig.cover.forbid.some(sig =>
              promptText.includes(sig.toLowerCase()) || emotion.includes(sig.toLowerCase())
          );
      }

      // Check tone signals
      const toneConfig = TONE_AXIS_SIGNALS[tone];
      if (toneConfig?.cover) {
          const hasToneSignal = toneConfig.cover.some(sig =>
              promptText.includes(sig.toLowerCase()) || emotion.includes(sig.toLowerCase())
          );
          if (hasToneSignal) signals.tone = tone;
      }

      // Check genre signals
      const genreConfig = GENRE_AXIS_SIGNALS[genre];
      if (genreConfig?.cover) {
          const hasGenreSignal = genreConfig.cover.some(sig =>
              promptText.includes(sig.toLowerCase())
          );
          if (hasGenreSignal) signals.genre = genre;
      }

      // Frame/border state for composed cover validation
      const keyholeEl = document.getElementById('coverKeyholeOverlay');
      const borderEl = document.getElementById('coverEroticBorder');
      const frameType = keyholeEl && !keyholeEl.classList.contains('hidden') ? 'keyhole' : null;
      const borderType = borderEl && !borderEl.classList.contains('hidden') ? 'erotic' : null;

      // DIRTY FRAMING SHORT-CIRCUIT: Frame/border has precedence over image semantics
      // Dirty is signaled by keyhole/metalwork framing, NOT image content
      const hasDirtyFraming = frameType === 'keyhole';
      let primary = null;
      let secondary = null;
      let arousalMatchOverride = false;

      if (arousal === 'Dirty' && hasDirtyFraming) {
          // HARD OVERRIDE: Dirty framing sets arousal axis, image semantics cannot override
          primary = SIGNAL_AXES.AROUSAL;
          arousalMatchOverride = true;
          // Secondary can still be tone or genre from image
          if (signals.tone) secondary = SIGNAL_AXES.TONE;
          else if (signals.genre) secondary = SIGNAL_AXES.GENRE;
      } else if (signals.arousal) {
          primary = SIGNAL_AXES.AROUSAL;
          if (signals.tone) secondary = SIGNAL_AXES.TONE;
          else if (signals.genre) secondary = SIGNAL_AXES.GENRE;
      } else if (signals.tone) {
          primary = SIGNAL_AXES.TONE;
          if (signals.genre) secondary = SIGNAL_AXES.GENRE;
      } else if (signals.genre) {
          primary = SIGNAL_AXES.GENRE;
      }

      return {
          primary,
          secondary,
          arousalMatch: arousalMatchOverride || signals.arousal === arousal,
          arousalContradiction: arousalMatchOverride ? false : arousalContradiction,
          signals,
          // Composed cover signals (framing is part of the cover signal)
          frameType,
          borderType,
          dirtyFramingOverride: hasDirtyFraming && arousal === 'Dirty'
      };
  }

  /**
   * SIGNAL ALIGNMENT VALIDATION
   * Validates that title and cover signal the same dominant axis
   * @param {string} title - The book title
   * @param {object} coverPrompt - Cover prompt from buildCoverPrompt
   * @param {object} context - { arousal, tone, genre }
   * @returns {{ aligned: boolean, errors: Array<{code: string, message: string}>, titleSignals: object, coverSignals: object }}
   */
  function validateSignalAlignment(title, coverPrompt, context) {
      const { arousal, tone, genre } = context;
      const errors = [];

      // Extract signals from both sources
      const titleSignals = extractTitleSignals(title, arousal, tone, genre);
      const coverSignals = extractCoverSignals(coverPrompt, arousal, tone, genre);

      // CHECK 1: Primary axis alignment
      if (titleSignals.primary && coverSignals.primary) {
          if (titleSignals.primary !== coverSignals.primary) {
              errors.push({
                  code: 'SIGNAL_AXIS_MISMATCH',
                  message: `Title signals ${titleSignals.primary}, cover signals ${coverSignals.primary}`
              });
          }
      }

      // CHECK 2: Arousal contradiction (HARD FAIL)
      if (titleSignals.arousalContradiction) {
          errors.push({
              code: 'TITLE_AROUSAL_CONTRADICTION',
              message: `Title contains words forbidden at ${arousal} arousal level`
          });
      }
      if (coverSignals.arousalContradiction) {
          errors.push({
              code: 'COVER_AROUSAL_CONTRADICTION',
              message: `Cover contains signals forbidden at ${arousal} arousal level`
          });
      }

      // CHECK 3: Neither signals arousal (when arousal should be primary)
      // DIRTY EXCEPTION: Keyhole/metalwork framing provides the arousal signal,
      // not the image content. applyCoverIntensityLayers() applies keyhole for Dirty.
      if (arousal === 'Erotic') {
          if (!titleSignals.arousalMatch && !coverSignals.arousalMatch) {
              errors.push({
                  code: 'AROUSAL_SIGNAL_ABSENT',
                  message: `${arousal} intensity but neither title nor cover signals it`
              });
          }
      } else if (arousal === 'Dirty') {
          // Dirty covers signal arousal via keyhole/metalwork framing, NOT image content.
          // The framing is guaranteed by applyCoverIntensityLayers when arousal=Dirty.
          // Therefore: image content may remain Naughty-compatible or symbolic.
          // CHECK: Verify keyhole overlay is/will be present
          const keyholeEl = document.getElementById('coverKeyholeOverlay');
          const hasKeyholeFrame = keyholeEl && !keyholeEl.classList.contains('hidden');
          const willHaveKeyholeFrame = true; // Dirty always gets keyhole via applyCoverIntensityLayers

          if (!hasKeyholeFrame && !willHaveKeyholeFrame) {
              // Only fail if Dirty lacks Dirty-signaling framing
              errors.push({
                  code: 'DIRTY_FRAME_ABSENT',
                  message: 'Dirty intensity requires keyhole/metalwork framing'
              });
          }
          // Note: titleSignals.arousalMatch and coverSignals.arousalMatch NOT required for Dirty
          // The composed cover (image + keyhole frame) is the signal, not image alone
      }

      // CHECK 4: Ambiguity check - no clear primary in either
      if (!titleSignals.primary && !coverSignals.primary) {
          errors.push({
              code: 'SIGNAL_AMBIGUOUS',
              message: 'Neither title nor cover has a clear primary signal axis'
          });
      }

      // CHECK 5: Secondary axis conflict
      if (titleSignals.secondary && coverSignals.secondary) {
          if (titleSignals.secondary !== coverSignals.secondary) {
              // Soft warning, not hard fail
              console.log('[SignalAlignment] Secondary axis differs:', titleSignals.secondary, 'vs', coverSignals.secondary);
          }
      }

      return {
          aligned: errors.length === 0,
          errors,
          titleSignals,
          coverSignals,
          context: {
              expectedArousal: arousal,
              arousalSignal: AROUSAL_SIGNALS[arousal]?.signal || 'neutral'
          }
      };
  }

  /**
   * Quick arousal inference from title alone
   * Used for pre-validation before cover is generated
   * @param {string} title - The book title
   * @returns {string|null} - Inferred arousal tier or null if ambiguous
   */
  function inferArousalFromTitle(title) {
      const cleanTitle = (title || '').toLowerCase().trim();

      // Check in order from most restrictive to least
      for (const level of ['Dirty', 'Erotic', 'Naughty', 'Clean']) {
          const config = AROUSAL_SIGNALS[level];
          if (config?.title?.allow?.test(cleanTitle)) {
              // Also check it doesn't violate this level's forbid
              if (!config.title.forbid?.test(cleanTitle)) {
                  return level;
              }
          }
      }
      return null; // Ambiguous
  }

  // Expose signal alignment functions globally
  window.validateSignalAlignment = validateSignalAlignment;
  window.extractTitleSignals = extractTitleSignals;
  window.extractCoverSignals = extractCoverSignals;
  window.inferArousalFromTitle = inferArousalFromTitle;
  window.SIGNAL_AXES = SIGNAL_AXES;
  window.AROUSAL_SIGNALS = AROUSAL_SIGNALS;

  /**
   * DSP VALIDATION — Strict template enforcement
   * DSP must EXACTLY match: "In [WORLD], shaped by [GENRE], a question awaits:
   * Will [ARCH_ADJ] desire redeem this [TONE_ADJ] affair — or ruin it?"
   *
   * @param {string} dspText - The DSP text to validate (HTML stripped)
   * @param {object} inputs - { world, genre, archetypeId, tone }
   * @returns {{ pass: boolean, errors: Array<{code: string, message: string}> }}
   */
  function validateDSP(dspText, inputs) {
      const errors = [];
      const { world, genre, archetypeId, tone } = inputs;

      // Strip HTML tags for validation
      const plainText = dspText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      // Get expected phrases from locked dictionaries
      const expectedWorld = DSP_WORLD_PHRASES[world];
      const expectedGenre = DSP_GENRE_PARAPHRASES[genre];
      const expectedArch = DSP_ARCHETYPE_ADJECTIVES[archetypeId];
      const expectedTone = DSP_TONAL_ADJECTIVES[tone];

      // Validate world phrase exists
      if (!expectedWorld) {
          errors.push({
              code: VALIDATION_ERRORS.DSP_INVALID_WORLD_PHRASE,
              message: `No DSP world phrase for: "${world}"`
          });
      }

      // Validate genre phrase exists
      if (!expectedGenre) {
          errors.push({
              code: VALIDATION_ERRORS.DSP_INVALID_GENRE_PHRASE,
              message: `No DSP genre paraphrase for: "${genre}"`
          });
      }

      // Validate archetype adjective exists
      if (!expectedArch) {
          errors.push({
              code: VALIDATION_ERRORS.DSP_INVALID_ARCHETYPE_ADJ,
              message: `No DSP archetype adjective for: "${archetypeId}"`
          });
      }

      // Validate tone adjective exists
      if (!expectedTone) {
          errors.push({
              code: VALIDATION_ERRORS.DSP_INVALID_TONE_ADJ,
              message: `No DSP tonal adjective for: "${tone}"`
          });
      }

      // If any dictionary lookups failed, return early
      if (errors.length > 0) {
          return { pass: false, errors };
      }

      // Build expected DSP text (exact template)
      const expectedDSP = `In ${expectedWorld}, shaped by ${expectedGenre}, a question awaits: Will ${expectedArch} desire redeem this ${expectedTone} affair — or ruin it?`;

      // Normalize both for comparison (handle HTML entities)
      const normalizedExpected = expectedDSP.replace(/\s+/g, ' ').trim();
      const normalizedActual = plainText
          .replace(/&#8201;/g, ' ')
          .replace(/&#8212;/g, '—')
          .replace(/\u2009/g, ' ')  // thin space
          .replace(/\u2014/g, '—')  // em dash
          .replace(/\s+/g, ' ')
          .trim();

      // Check for exact match
      if (normalizedActual !== normalizedExpected) {
          // Diagnose specific failure
          if (!normalizedActual.startsWith('In ')) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_TEMPLATE_VIOLATION,
                  message: 'DSP must start with "In "'
              });
          }
          if (!normalizedActual.includes(expectedWorld)) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_INVALID_WORLD_PHRASE,
                  message: `World phrase "${expectedWorld}" not found in DSP`
              });
          }
          if (!normalizedActual.includes(expectedGenre)) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_INVALID_GENRE_PHRASE,
                  message: `Genre phrase "${expectedGenre}" not found in DSP`
              });
          }
          if (!normalizedActual.includes(expectedArch)) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_INVALID_ARCHETYPE_ADJ,
                  message: `Archetype adjective "${expectedArch}" not found in DSP`
              });
          }
          if (!normalizedActual.includes(expectedTone)) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_INVALID_TONE_ADJ,
                  message: `Tone adjective "${expectedTone}" not found in DSP`
              });
          }

          // STRICT ADJECTIVE POSITION VALIDATION
          // Verify exact adjective appears in correct DSP slot
          const archSlotMatch = normalizedActual.match(/Will\s+(\w+)\s+desire/i);
          if (archSlotMatch && archSlotMatch[1].toLowerCase() !== expectedArch.toLowerCase()) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_INVALID_ARCHETYPE_ADJ,
                  message: `Wrong adjective in archetype slot: found "${archSlotMatch[1]}", expected "${expectedArch}"`
              });
          }
          const toneSlotMatch = normalizedActual.match(/this\s+(\w+)\s+affair/i);
          if (toneSlotMatch && toneSlotMatch[1].toLowerCase() !== expectedTone.toLowerCase()) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_INVALID_TONE_ADJ,
                  message: `Wrong adjective in tone slot: found "${toneSlotMatch[1]}", expected "${expectedTone}"`
              });
          }

          // Check for world subtype leakage
          const SUBTYPE_PATTERNS = [
              /\bsmall[- ]town\b/i, /\bcampus\b/i, /\boffice\b/i, /\bold[- ]money\b/i,
              /\bcyberpunk\b/i, /\bspace opera\b/i, /\bgalactic\b/i, /\bVictorian\b/i,
              /\bRegency\b/i, /\bMedieval\b/i, /\bAncient\b/i
          ];
          for (const pattern of SUBTYPE_PATTERNS) {
              if (pattern.test(normalizedActual)) {
                  errors.push({
                      code: VALIDATION_ERRORS.DSP_WORLD_SUBTYPE_LEAK,
                      message: `World subtype leaked into DSP: ${normalizedActual.match(pattern)?.[0]}`
                  });
                  break;
              }
          }

          // Check for extra prose
          if (normalizedActual.length > normalizedExpected.length + 10) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_EXTRA_PROSE,
                  message: 'DSP contains extra prose beyond locked template'
              });
          }

          // Check for legacy phrasing — comprehensive list of deprecated DSP text
          const LEGACY_PATTERNS = [
              /\bdestiny story prompt\b/i,
              /\byour story\b/i,
              /\bonce upon\b/i,
              /\bin this tale\b/i,
              // Legacy world phrases (pre-canon)
              /\bstrangers meet\b/i,
              /\bpower lingers\b/i,
              /\bforces move\b/i,
              /\bvows bind\b/i,
              /\bold powers\b/i,
              /\bcity of strangers\b/i,
              /\bthe present day\b/i,
              /\ban earlier era\b/i,
              /\bsupernatural forces\b/i,
              /\bambition and consequence\b/i,
              // Legacy genre phrases (pre-canon)
              /\bdangerous games\b/i,
              /\bshadow and silk\b/i,
              /\bhigh stakes\b/i,
              /\bforbidden fruit\b/i,
              /\bsecret desires\b/i,
              /\bpassion and peril\b/i,
              /\blove and loss\b/i,
              // Meta-narrative leakage
              /\bthe narrative\b/i,
              /\bthe story\b/i,
              /\bthis romance\b/i,
              /\btheir journey\b/i
          ];
          for (const pattern of LEGACY_PATTERNS) {
              if (pattern.test(normalizedActual)) {
                  errors.push({
                      code: VALIDATION_ERRORS.DSP_LEGACY_PHRASING,
                      message: `Legacy phrasing detected: ${normalizedActual.match(pattern)?.[0]}`
                  });
                  break;
              }
          }

          // WORD-SOURCE VALIDATION: DSP output must contain ONLY words from selected phrases
          // Extract content words (skip articles, prepositions, punctuation)
          const STRUCTURAL_WORDS = new Set([
              'in', 'a', 'an', 'the', 'of', 'and', 'or', 'by', 'shaped', 'question', 'awaits',
              'will', 'desire', 'redeem', 'this', 'affair', 'ruin', 'it', 'to', 'for', 'with'
          ]);
          const dspWords = normalizedActual.toLowerCase()
              .replace(/[.,!?;:\u2014\u2013\u2009\u00a0]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 2 && !STRUCTURAL_WORDS.has(w));

          // Build allowed word set from selected phrases
          const allowedWords = new Set();
          (expectedWorld || '').toLowerCase().split(/\s+/).forEach(w => allowedWords.add(w.replace(/[.,]/g, '')));
          (expectedGenre || '').toLowerCase().split(/\s+/).forEach(w => allowedWords.add(w.replace(/[.,]/g, '')));
          (expectedArch || '').toLowerCase().split(/\s+/).forEach(w => allowedWords.add(w.replace(/[.,]/g, '')));
          (expectedTone || '').toLowerCase().split(/\s+/).forEach(w => allowedWords.add(w.replace(/[.,]/g, '')));
          // Add structural words to allowed set
          STRUCTURAL_WORDS.forEach(w => allowedWords.add(w));

          const illegalWords = dspWords.filter(w => !allowedWords.has(w));
          if (illegalWords.length > 0) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_EXTRA_PROSE,
                  message: `DSP contains words not from canonical phrases: ${illegalWords.slice(0, 5).join(', ')}`
              });
          }

          // Generic template violation if no specific error found
          if (errors.length === 0) {
              errors.push({
                  code: VALIDATION_ERRORS.DSP_TEMPLATE_VIOLATION,
                  message: `DSP does not match locked template. Expected: "${normalizedExpected.slice(0, 50)}..."`
              });
          }
      }

      return { pass: errors.length === 0, errors };
  }

  /**
   * POV VALIDATION (5th Person) — Comprehensive scene validation
   *
   * @param {string} sceneText - The scene prose to validate
   * @param {object} context - { sceneIndex, isErotic, isGodMode }
   * @returns {{ pass: boolean, errors: Array<{code: string, message: string}>, metrics: object }}
   */
  function validatePOV(sceneText, context) {
      const errors = [];
      const { sceneIndex = 0, isErotic = false, isGodMode = false } = context;
      const isSceneOne = sceneIndex === 0;

      // Count Author mentions
      const authorMatches = sceneText.match(/\bThe Author\b/g) || [];
      const authorMentions = authorMatches.length;

      // Extract first words and last paragraph
      const trimmed = sceneText.trim();
      const firstTwoWords = trimmed.split(/\s+/).slice(0, 2).join(' ');
      const paragraphs = trimmed.split(/\n\n+/);
      const lastParagraph = paragraphs[paragraphs.length - 1] || '';
      const sentences = lastParagraph.match(/[^.!?]+[.!?]+/g) || [lastParagraph];
      const lastTwoSentences = sentences.slice(-2).join(' ');

      // RULE 1: First two words = "The Author" (always enforced)
      const hasValidOpener = /^The Author\b/i.test(trimmed);
      if (!hasValidOpener) {
          errors.push({
              code: VALIDATION_ERRORS.POV_INVALID_OPENER,
              message: `Opening must start with "The Author". Found: "${firstTwoWords}"`
          });
      }

      // RULE 2: Final perspective = The Author (structural check)
      const AUTHOR_CLOSING_VERBS = [
          'held', 'tilted', 'set', 'arranged', 'steered', 'coaxed', 'seeded', 'threaded',
          'watched', 'waited', 'considered', 'wondered', 'doubted', 'resisted', 'smiled',
          'frowned', 'paused', 'knew', 'felt', 'sensed', 'released', 'tightened', 'loosened'
      ];
      const closingVerbPattern = new RegExp(
          'The Author\\s+(' + AUTHOR_CLOSING_VERBS.join('|') + ')\\b', 'i'
      );
      const authorReflectionPattern = /The Author.{0,60}(uncertain|doubt|wonder|question|resist|perhaps|might|whether|if only)/i;
      const hasValidCloser = closingVerbPattern.test(lastTwoSentences) || authorReflectionPattern.test(lastTwoSentences);

      if (!hasValidCloser && !isErotic) {
          errors.push({
              code: VALIDATION_ERRORS.POV_INVALID_CLOSER,
              message: 'Scene must end with The Author as final perspective (action verb or reflection)'
          });
      }

      // RULE 3: Scene prose = strict 3rd person limited
      const firstPersonPattern = /\b(I|me|my|mine|myself)\b(?!\s*["'])/gi;
      const firstPersonMatches = sceneText.match(firstPersonPattern) || [];
      // Filter out dialogue (rough heuristic: not near quotes)
      const nonDialogueFirstPerson = firstPersonMatches.filter(match => {
          const idx = sceneText.indexOf(match);
          const nearbyText = sceneText.slice(Math.max(0, idx - 20), idx + 20);
          return !/"[^"]*$/.test(nearbyText.slice(0, 20)) && !/^[^"]*"/.test(nearbyText.slice(20));
      });
      if (nonDialogueFirstPerson.length > 2) {
          errors.push({
              code: VALIDATION_ERRORS.POV_NON_3RD_PERSON,
              message: `Scene contains ${nonDialogueFirstPerson.length} first-person references outside dialogue`
          });
      }

      // RULE 4: Author NEVER narrates action or scenery (banned voyeur verbs)
      const BANNED_AUTHOR_VERBS = ['watched', 'observed', 'saw', 'looked on', 'gazed at', 'witnessed', 'noticed', 'perceived'];
      const bannedPattern = new RegExp('The Author\\s+(' + BANNED_AUTHOR_VERBS.join('|') + ')\\b', 'gi');
      const bannedMatches = sceneText.match(bannedPattern) || [];
      if (bannedMatches.length > 0) {
          errors.push({
              code: VALIDATION_ERRORS.POV_AUTHOR_NARRATES_ACTION,
              message: `Author uses banned voyeur verbs: ${bannedMatches.slice(0, 3).join(', ')}`
          });
      }

      // RULE 5: Frequency requirements
      if (isSceneOne && authorMentions < 6) {
          errors.push({
              code: VALIDATION_ERRORS.POV_SCENE1_FREQUENCY,
              message: `Scene 1 requires ≥6 Author mentions. Found: ${authorMentions}`
          });
      } else if (!isSceneOne && !isErotic && (authorMentions < 1 || authorMentions > 3)) {
          errors.push({
              code: VALIDATION_ERRORS.POV_LATER_FREQUENCY,
              message: `Later scenes require 1-3 Author mentions. Found: ${authorMentions}`
          });
      }

      // RULE 6: Erotic scenes = 0 Author mentions
      if (isErotic && authorMentions > 0) {
          errors.push({
              code: VALIDATION_ERRORS.POV_EROTIC_AUTHOR_PRESENT,
              message: `Erotic scenes must have 0 Author mentions. Found: ${authorMentions}`
          });
      }

      // RULE 7: Meta-awareness spike ~5% (check for excess)
      const metaAwarenessPatterns = [
          /\b(character|story|narrative|plot|author|reader|page|chapter)\b/gi,
          /\b(as if|somehow|knew|felt|sensed)\s+(that|the|this)\s+(story|tale|narrative)/gi
      ];
      let metaCount = 0;
      metaAwarenessPatterns.forEach(p => {
          const matches = sceneText.match(p);
          if (matches) metaCount += matches.length;
      });
      const wordCount = sceneText.split(/\s+/).length;
      const metaRatio = metaCount / wordCount;
      if (metaRatio > 0.08) { // ~8% threshold
          errors.push({
              code: VALIDATION_ERRORS.POV_META_AWARENESS_EXCESS,
              message: `Meta-awareness exceeds 5% threshold. Ratio: ${(metaRatio * 100).toFixed(1)}%`
          });
      }

      // RULE 8: God Mode — Author does NOT know Player exists
      if (isGodMode) {
          const playerAwarenessPatterns = [
              /\bThe Author\b.{0,50}\b(player|user|you|your)\b/gi,
              /\bThe Author\b.{0,50}\b(knew|sensed|felt)\b.{0,30}\b(was being|someone)\b/gi
          ];
          for (const pattern of playerAwarenessPatterns) {
              if (pattern.test(sceneText)) {
                  errors.push({
                      code: VALIDATION_ERRORS.POV_GODMODE_PLAYER_AWARENESS,
                      message: 'God Mode: Author must NOT know Player exists'
                  });
                  break;
              }
          }
      }

      const metrics = {
          authorMentions,
          isSceneOne,
          isErotic,
          isGodMode,
          hasValidOpener,
          hasValidCloser,
          wordCount
      };

      return { pass: errors.length === 0, errors, metrics };
  }

  /**
   * Get current validation state for Dev HUD
   * Runs all validators against current story state
   */
  function getValidationStatus() {
      const results = {};

      // DSP validation
      const dspEl = document.getElementById('synopsisText');
      if (dspEl && state.picks) {
          const dspResult = validateDSP(dspEl.textContent || '', {
              world: state.picks.world || 'Modern',
              genre: state.picks.genre || 'Billionaire',
              archetypeId: (state.archetype?.primary) || 'BEAUTIFUL_RUIN',
              tone: state.picks.tone || 'Earnest'
          });
          results.dsp = dspResult;
      }

      // POV validation (last generated scene)
      if (state.povMode === 'author5th' && window.StoryPagination) {
          const lastContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ');
          const lastScene = lastContent.slice(-2000);
          const povResult = validatePOV(lastScene, {
              sceneIndex: state.turnCount || 0,
              isErotic: ['Erotic', 'Dirty'].includes(state.intensity) && state.turnCount > 0,
              isGodMode: state.godModeActive || false
          });
          results.pov = povResult;
      }

      // Tone validation
      if (state.picks?.tone && window.StoryPagination) {
          const lastContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ');
          const lastScene = lastContent.slice(-2000);
          const toneResult = validateTone(lastScene, state.picks.tone);
          results.tone = toneResult;
      }

      // Erotic escalation validation
      if (['Erotic', 'Dirty'].includes(state.intensity) && window.StoryPagination) {
          const lastContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ');
          const lastScene = lastContent.slice(-2000);
          const eroticResult = validateEroticEscalation(lastScene, state.intensity);
          results.erotic = eroticResult;
      }

      // Title validation
      const titleEl = document.getElementById('storyTitle');
      if (titleEl && titleEl.textContent) {
          const titleResult = validateTitle(titleEl.textContent.trim(), state.picks?.tone);
          results.title = titleResult;
      }

      // Signal alignment validation
      if (titleEl && titleEl.textContent) {
          const currentTitle = titleEl.textContent.trim();
          const mockCoverPrompt = {
              promptText: 'emotion: ' + (state.coverEmotion || 'mystery'),
              emotion: state.coverEmotion || 'mystery'
          };
          const signalResult = validateSignalAlignment(currentTitle, mockCoverPrompt, {
              arousal: state.intensity || 'Naughty',
              tone: state.picks?.tone || 'Earnest',
              genre: state.picks?.genre || 'Romance'
          });
          results.signal = signalResult;
      }

      return results;
  }

  // Expose validators globally for Dev HUD access
  window.validateDSP = validateDSP;
  window.validatePOV = validatePOV;
  window.validateTone = validateTone;
  window.validateEroticEscalation = validateEroticEscalation;
  window.getValidationStatus = getValidationStatus;
  window.VALIDATION_ERRORS = VALIDATION_ERRORS;

  // ============================================================
  // NARRATIVE VOCABULARY BANS — POST-GENERATION ENFORCEMENT
  // ============================================================
  // System-internal terms that must NEVER appear in reader-facing text.
  // "The Author" is exempt ONLY in 5th-person (Fate POV) prose.
  // Archetype names influence structure/pacing/framing but are invisible
  // to readers — they must never surface in prose, dialogue, or synopsis.
  // ============================================================

  const VOCAB_BAN_PATTERNS = [
      // "The Author" — banned except in Fate POV meta blocks
      { id: 'AUTHOR_LEAK',          rx: /The Author\b/g,                                           fatePOVExempt: true },
      // Any X Warden compound (Heart Warden, Shadow Warden, Blood Warden, etc.)
      { id: 'WARDEN_COMPOUND',      rx: /(?:Heart|Shadow|Blood|\w+)\s+Warden\b/gi,                 fatePOVExempt: false },
      // Cover-composition archetype names leaked into prose
      { id: 'ARCHETYPE_THRESHOLD',  rx: /\bThreshold\b/g,                                          fatePOVExempt: false },
      { id: 'ARCHETYPE_EMBLEM',     rx: /\bEmblem\b/g,                                             fatePOVExempt: false },
      // Canonical 7-archetype display names
      { id: 'ARCHETYPE_OPEN_VEIN',  rx: /\bOpen Vein\b/gi,                                         fatePOVExempt: false },
      { id: 'ARCHETYPE_SPELLBINDER',rx: /\bSpellbinder\b/gi,                                       fatePOVExempt: false },
      { id: 'ARCHETYPE_ARMORED_FOX',rx: /\bArmored Fox\b/gi,                                       fatePOVExempt: false },
      { id: 'ARCHETYPE_DARK_VICE',  rx: /\bDark Vice\b/gi,                                         fatePOVExempt: false },
      { id: 'ARCHETYPE_BEAUTIFUL_RUIN', rx: /\bBeautiful Ruin\b/gi,                                fatePOVExempt: false },
      { id: 'ARCHETYPE_ETERNAL_FLAME',  rx: /\bEternal Flame\b/gi,                                 fatePOVExempt: false }
  ];

  // Human-readable ban description per pattern (for negative-constraint injection)
  const VOCAB_BAN_LABELS = {
      AUTHOR_LEAK:            '"The Author" — meta-narrator term forbidden outside Fate POV',
      WARDEN_COMPOUND:        'X Warden compound — system-internal archetype name',
      ARCHETYPE_THRESHOLD:    '"Threshold" — internal cover-composition archetype',
      ARCHETYPE_EMBLEM:       '"Emblem" — internal cover-composition archetype',
      ARCHETYPE_OPEN_VEIN:    '"Open Vein" — internal character archetype',
      ARCHETYPE_SPELLBINDER:  '"Spellbinder" — internal character archetype',
      ARCHETYPE_ARMORED_FOX:  '"Armored Fox" — internal character archetype',
      ARCHETYPE_DARK_VICE:    '"Dark Vice" — internal character archetype',
      ARCHETYPE_BEAUTIFUL_RUIN: '"Beautiful Ruin" — internal character archetype',
      ARCHETYPE_ETERNAL_FLAME:  '"Eternal Flame" — internal character archetype'
  };

  /**
   * Scan text for vocabulary ban violations.
   * @param {string} text          - The generated text to check
   * @param {object} context       - { type: 'prose'|'synopsis'|'title'|'cover', isFatePOV: boolean }
   * @returns {{ clean: boolean, violations: Array<{id:string, matches:string[]}> }}
   */
  function scrubNarrativeVocabulary(text, context) {
      if (!text || typeof text !== 'string') return { clean: true, violations: [] };

      const violations = [];
      const isFatePOV = context.isFatePOV && context.type === 'prose';

      for (const ban of VOCAB_BAN_PATTERNS) {
          // "The Author" is allowed in Fate POV prose (5th-person mode)
          if (ban.fatePOVExempt && isFatePOV) continue;

          // Reset regex lastIndex (global flag)
          ban.rx.lastIndex = 0;
          const matches = text.match(ban.rx);
          if (matches && matches.length > 0) {
              violations.push({ id: ban.id, matches });
          }
      }

      return { clean: violations.length === 0, violations };
  }

  /**
   * Build a negative-constraint instruction string from violations.
   * Injected into the system prompt on regeneration.
   */
  function buildVocabBanConstraint(violations) {
      const lines = violations.map(v =>
          `- NEVER use ${VOCAB_BAN_LABELS[v.id] || v.id}. Found: "${v.matches.join('", "')}" — remove or rephrase.`
      );
      return `\n\nCRITICAL VOCABULARY BAN — the following terms are system-internal and MUST NOT appear in your output:\n${lines.join('\n')}\nRewrite any sentence that would contain these terms. They are invisible to the reader and must never surface in prose, dialogue, synopsis, or titles.\n`;
  }

  /**
   * Enforce vocabulary bans with one-shot regeneration.
   *
   * @param {string}   text          - generated text to check
   * @param {object}   context       - { type, isFatePOV }
   * @param {function} regenerateFn  - async (negativeConstraint: string) => string
   *                                   Called once on violation. Receives the negative-constraint
   *                                   string to append to the system prompt. Must return new text.
   * @returns {string} clean (or best-effort) text
   */
  async function enforceVocabularyBans(text, context, regenerateFn) {
      const result = scrubNarrativeVocabulary(text, context);
      if (result.clean) return text;

      console.warn('[VOCAB_BAN] Violations in ' + context.type + ':', result.violations);

      if (!regenerateFn) {
          console.error('[VOCAB_BAN] No regeneration function provided — returning dirty text');
          return text;
      }

      // Regenerate once with explicit negative constraint
      const constraint = buildVocabBanConstraint(result.violations);
      console.log('[VOCAB_BAN] Regenerating with negative constraint');
      const regenerated = await regenerateFn(constraint);

      // Re-check — if still dirty, log hard warning but return anyway
      const recheck = scrubNarrativeVocabulary(regenerated, context);
      if (!recheck.clean) {
          console.error('[VOCAB_BAN] Regeneration STILL violates bans:', recheck.violations.map(v => v.id));
      } else {
          console.log('[VOCAB_BAN] Regeneration passed vocabulary check');
      }

      return regenerated;
  }

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
      // Check eligibility using canonical helper
      const tempState = { ...window.state, intensity: level };
      if (!isStoryPassEligible(tempState) && window.state.access !== 'sub') {
          window.showPaywall('sub_only'); return;
      }
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

  // =========================
  // AUTH GATING FOR PERSISTENCE
  // =========================
  // Persistence is ONLY allowed when logged in.
  // Without login, app behaves stateless (no story/purchase restoration on reload).

  function isLoggedIn() {
      return !!state.isLoggedIn;
  }

  // Login function - sets persistence gate
  window.login = function() {
      state.isLoggedIn = true;
      localStorage.setItem('sb_logged_in', '1');
      renderBurgerMenu();
      updateContinueButtons();
  };

  // Logout function - clears persistence gate and all persisted state
  window.logout = function() {
      state.isLoggedIn = false;
      localStorage.removeItem('sb_logged_in');
      // Clear all persisted story/purchase state
      clearAnonymousState();
      renderBurgerMenu();
      updateContinueButtons();
  };

  // Clear all persisted state for anonymous/testing mode
  function clearAnonymousState() {
      localStorage.removeItem('sb_saved_story');
      localStorage.removeItem('sb_story_in_idb');
      localStorage.removeItem('sb_current_story_id');
      localStorage.removeItem('sb_subscribed');
      localStorage.removeItem('sb_billing_status');
      localStorage.removeItem('sb_god_mode_owned');
      // Clear all story pass keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb_storypass_')) {
              keysToRemove.push(key);
          }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      // Clear IndexedDB story data
      if (window.indexedDB) {
          try {
              const request = indexedDB.deleteDatabase(STORY_DB_NAME);
              request.onerror = () => console.warn('Failed to clear IndexedDB');
          } catch (e) { /* ignore */ }
      }
  }

  // Render burger menu auth section
  function renderBurgerMenu() {
      const section = document.getElementById('menuAuthSection');
      if (!section) return;
      if (isLoggedIn()) {
          section.innerHTML = '<button onclick="window.logout()">Logout</button>';
      } else {
          section.innerHTML = '<button onclick="window.login()">Login</button>';
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
      // Task B: If on game screen with book open, navigate within book first
      if (_currentScreenId === 'game') {
          const bookCover = document.getElementById('bookCover');
          const isBookOpen = bookCover?.classList.contains('hinge-open') || _bookOpened;

          if (isBookOpen && _bookPageIndex > 0) {
              // Navigate backwards within the book
              if (typeof previousBookPage === 'function' && previousBookPage()) {
                  return; // Stepped back within book
              }
          }

          if (isBookOpen && _bookPageIndex === 0) {
              // At cover page, close the book
              const bookCoverPage = document.getElementById('bookCoverPage');
              const storyContent = document.getElementById('storyContent');
              if (bookCover) {
                  bookCover.classList.remove('hinge-open', 'courtesy-peek');
              }
              if (bookCoverPage) {
                  bookCoverPage.classList.remove('hidden');
              }
              if (storyContent) {
                  storyContent.classList.add('hidden');
              }
              _bookOpened = false;
              setBookPage(0); // Reset to cover
              return; // Don't navigate away yet
          }
      }

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

      // UX-2 FIX: Clean up fate visuals when leaving setup screen
      // GUARD: Skip cleanup if Guided Fate visuals are still active (will be torn down later)
      if (_currentScreenId === 'setup' && id !== 'setup') {
          if (!_guidedFateVisualsActive && typeof cleanupFateVisuals === 'function') cleanupFateVisuals();
      }

      if(id === 'modeSelect') {
          _navHistory = [];
          // Update Solo subtitle based on permission gradient
          if (typeof updateSoloSubtitle === 'function') updateSoloSubtitle();
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
          // Start ambient sparkles around the Guided Fate card
          if (typeof startAmbientCardSparkles === 'function') startAmbientCardSparkles();
          // Couple subhead: show ONLY when mode === 'couple', no other conditions
          const coupleSubhead = document.getElementById('coupleSubhead');
          if (coupleSubhead) coupleSubhead.classList.toggle('hidden', state.mode !== 'couple');
      } else {
          if (typeof stopAmbientCardSparkles === 'function') stopAmbientCardSparkles();
          // Stop fate card sparkle cycle when leaving game screen
          if (window.stopSparkleCycle) window.stopSparkleCycle();
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
          // Show continuation fork after delay for user to read ending
          setTimeout(() => {
              showContinuationFork();
          }, 3000);
          return;
      }

      if (len === 'fling' && !state.storyEnded) {
          const overCap = (wc > 15000 || turns > 60);
          if (state.flingClimaxDone && state.flingConsequenceShown && overCap) {
              state.storyEnded = true;
              document.getElementById('submitBtn').disabled = true;
              renderFlingEnd();
              // Show continuation fork after delay for user to read ending
              setTimeout(() => {
                  showContinuationFork();
              }, 3000);
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

  async function parseVetoInput(rawText) {
      if(!rawText) return { exclusions:[], corrections:[], ambientMods:[], rejected:[] };

      // RUNTIME NORMALIZATION: All veto input flows through ChatGPT normalization layer
      // CRITICAL: Never store raw text - always use normalized kernel
      const vetoNorm = await callNormalizationLayer({
          axis: 'veto',
          user_text: rawText,
          context_signals: state.picks?.world || []
      });
      // Extract kernel - prefer archetype/burden format, then normalized_text, NEVER raw
      const kernel = vetoNorm.archetype || vetoNorm.burden || vetoNorm.normalized_text || vetoNorm.canonical_instruction;
      const canonicalized = kernel || 'excluded element';

      const lines = canonicalized.split('\n');
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

  async function applyVetoFromInput() {
      const el = document.getElementById('vetoInput');
      if(!el) return;
      const parsed = await parseVetoInput(el.value);

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
  async function parseStoryControls(rawText) {
      const vetoResult = await parseVetoInput(rawText);
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

  async function applyVetoFromControls() {
      await applyVetoFromInput();
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
      world: [
          // Generic fallback (kept for compatibility)
          "Ancient empire ruins", "Clockwork city", "Floating islands", "Underground kingdom",
          "Endless library", "Frozen wasteland", "Desert oasis", "Living forest",
          "Crystal caverns", "Storm-wracked coast", "Sunken civilization", "Sky citadel",
          "Volcanic archipelago", "Haunted frontier", "Merchant crossroads", "Border fortress",
          "Hidden valley", "Plague quarantine", "Orbital station", "Dream realm"
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
      ],
      archetypeModifier: [
          "Romantic", "Cloistered", "Rogue", "Dangerous", "Guardian",
          "Sovereign", "Enchanting", "Devoted", "Strategist"
      ]
  };

  // PASS 9D: World-specific custom setting suggestions
  const WORLD_CUSTOM_SUGGESTIONS = {
      Modern: [
          "Manhattan penthouse", "Small coastal town", "College campus", "Underground club scene",
          "Tech startup hub", "Old Hollywood glamour", "Fashion district", "Hidden supernatural society",
          "Political dynasty estate", "Art gallery scene", "Beach resort town", "Urban rooftop gardens"
      ],
      Historical: [
          "Regency England ballroom", "Victorian London fog", "Renaissance Florence court", "Ancient Rome villa",
          "Medieval castle keep", "Roaring Twenties speakeasy", "Gilded Age mansion", "Tudor court intrigue",
          "Ming Dynasty palace", "French Revolution Paris", "Viking settlement", "Ottoman Empire harem"
      ],
      Fantasy: [
          "Enchanted forest glade", "Floating sky citadel", "Dragon-ruled kingdom", "Fae court realm",
          "Underwater mer-kingdom", "Crystal cave sanctuary", "Witch's hidden academy", "Cursed castle ruins",
          "Living forest heart", "Elemental nexus", "Shadow realm border", "Phoenix empire capital"
      ],
      SciFi: [
          "Space station colony", "Terraformed Mars city", "Generation ship deck", "Cyberpunk megacity",
          "Alien embassy quarter", "Virtual reality nexus", "Clone facility lab", "Time loop station",
          "Quantum research hub", "First contact zone", "Post-singularity haven", "Asteroid mining outpost"
      ],
      Dystopia: [
          "Surveillance state tower", "Underground resistance base", "Corporate zone boundary", "Memory wipe facility",
          "Rationing district", "Propaganda broadcast center", "Elite compound walls", "Rebel safe house",
          "Black market tunnels", "Re-education center", "Border checkpoint", "Forbidden archive"
      ],
      PostApocalyptic: [
          "Ruined city overgrowth", "Survivor settlement", "Irradiated wasteland edge", "Flooded coastal ruins",
          "Bunker community", "Reclaimed factory", "Nomad caravan camp", "Plague quarantine zone",
          "Fallen skyscraper shelter", "Clean water spring", "Tech scavenger den", "Nature-reclaimed highway"
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

      // PASS 9F: Enter commits text, not clears it
      // Scrolling examples do NOT overwrite user-entered text on Enter
      input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault();
              // Just blur to commit - do NOT clear the value
              input.blur();
          }
      });

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

      // Initialize destiny flip cards (Quill/Veto)
      initDestinyFlipCards();

      // Initialize character destiny cards (name + ancestry per character)
      initCharacterDestinyCards();
  }

  function initCharacterDestinyCards() {
      // Character destiny cards - fill name + ancestry for each character
      // ISOLATED: Never triggers story start, loading, or global fate state
      document.querySelectorAll('.character-destiny-card').forEach(card => {
          card.addEventListener('click', (e) => {
              // CRITICAL: Stop propagation to prevent any parent/global handlers
              e.stopPropagation();

              const character = card.dataset.character; // 'player' or 'loveInterest'

              // Flip the card (visual only - NEVER toggles back)
              if (!card.classList.contains('flipped')) {
                  card.classList.add('flipped');
              }

              // PASS 9F: Populate fields based on character type
              if (character === 'player') {
                  // Get player gender to select appropriate name list
                  const playerGender = document.getElementById('playerGender')?.value || 'Female';
                  const nameList = getNameListForGender(playerGender);
                  const randomName = nameList[Math.floor(Math.random() * nameList.length)];
                  const randomAncestry = getRandomSuggestion('ancestry');
                  const randomAge = Math.floor(Math.random() * 15) + 22; // 22-36

                  // Fill name
                  const nameInput = document.getElementById('playerNameInput');
                  if (nameInput) {
                      nameInput.value = randomName;
                      nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                  }

                  // Fill ancestry
                  const ancestryInput = document.getElementById('ancestryInputPlayer');
                  if (ancestryInput) {
                      ancestryInput.value = randomAncestry;
                      const placeholder = document.querySelector('.rotating-placeholder[data-for="ancestryInputPlayer"]');
                      if (placeholder) placeholder.classList.add('hidden');
                  }

                  // Fill age
                  const ageInput = document.getElementById('playerAgeInput');
                  if (ageInput) {
                      ageInput.value = randomAge;
                  }
              } else if (character === 'loveInterest') {
                  // Get love interest gender to select appropriate name list
                  const liGender = document.getElementById('loveInterestGender')?.value || 'Male';
                  const nameList = getNameListForGender(liGender);
                  const randomName = nameList[Math.floor(Math.random() * nameList.length)];
                  const randomAncestry = getRandomSuggestion('ancestry');
                  const randomAge = Math.floor(Math.random() * 15) + 25; // 25-39

                  // Fill name
                  const nameInput = document.getElementById('partnerNameInput');
                  if (nameInput) {
                      nameInput.value = randomName;
                      nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                  }

                  // Fill ancestry
                  const ancestryInput = document.getElementById('ancestryInputLI');
                  if (ancestryInput) {
                      ancestryInput.value = randomAncestry;
                      const placeholder = document.querySelector('.rotating-placeholder[data-for="ancestryInputLI"]');
                      if (placeholder) placeholder.classList.add('hidden');
                  }

                  // Fill age
                  const ageInput = document.getElementById('partnerAgeInput');
                  if (ageInput) {
                      ageInput.value = randomAge;
                  }
              }

              // Character destiny cards ONLY populate fields
              // They NEVER trigger story start, loading, or navigation
          });
      });
  }

  // Helper to get appropriate name list based on gender
  function getNameListForGender(gender) {
      const g = (gender || '').toLowerCase();
      if (g === 'female') return FATE_FEMALE_NAMES;
      if (g === 'male') return FATE_MALE_NAMES;
      // Non-Binary or Custom: randomly pick from either list
      return Math.random() < 0.5 ? FATE_FEMALE_NAMES : FATE_MALE_NAMES;
  }

  function initDestinyFlipCards() {
      // Destiny flip cards (Quill/Veto) - flip in place + insert random suggestion
      document.querySelectorAll('.destiny-flip-card').forEach(flipCard => {
          flipCard.addEventListener('click', () => {
              const targetId = flipCard.dataset.target;
              const type = flipCard.dataset.type;
              const input = document.getElementById(targetId);

              // Flip the card
              flipCard.classList.toggle('flipped');

              // Insert random suggestion from the appropriate pool
              if (input && type) {
                  const suggestion = getRandomSuggestion(type);
                  if (input.tagName === 'TEXTAREA') {
                      // For textareas (Quill/Veto), append on new line
                      input.value = input.value ? input.value + '\n' + suggestion : suggestion;
                  } else {
                      // For inputs, replace
                      input.value = suggestion;
                  }
                  // Hide placeholder
                  const placeholder = document.querySelector(`.rotating-placeholder[data-for="${targetId}"]`);
                  if (placeholder) placeholder.classList.add('hidden');
              }
          });
      });
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
              // AUTH GATE: Only persist to storage when logged in
              if (isLoggedIn()) localStorage.setItem('sb_billing_status', 'active');
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
      // AUTH GATE: Only persist to storage when logged in
      if (isLoggedIn()) {
          localStorage.setItem('sb_billing_status', state.billingStatus);
          localStorage.setItem('sb_billing_grace_until', state.billingGraceUntil);
      }
      if(typeof applyAccessLocks === 'function') applyAccessLocks();
  }

  function endBillingGrace() {
      state.billingStatus = 'past_due';
      // AUTH GATE: Only persist to storage when logged in
      if (isLoggedIn()) localStorage.setItem('sb_billing_status', 'past_due');
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
      const vbWorld = state?.picks?.world || 'Modern';
      const vbEra = state?.picks?.world === 'Historical' ? (state?.picks?.era || 'Medieval') : null;
      const visualPowerRole = resolvePowerRole(vbWorld, vbEra, genre);
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
              callChat([{role:'system', content: sys}, {role:'user', content: `Genre: ${visualPowerRole}. Extract visual anchors from: ${textContext.slice(-2000)}`}]),
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
              // Selection aura on focus
              el.addEventListener('focus', () => {
                  if (typeof applySelectionAura === 'function') applySelectionAura(el);
              });
              el.addEventListener('blur', () => {
                  if (typeof removeSelectionAura === 'function') removeSelectionAura(el);
              });
          }
      });

      // Fate Resolution Glow — brief visual pulse on every in-story Fate card click
      document.addEventListener('click', function(e) {
          const card = e.target.closest('.fate-card');
          if (!card || !card.closest('#cardMount')) return;
          if (card.classList.contains('locked')) return;
          if (window.state && window.state.fateCommitted) return;

          // Card pulse (replayable — remove + reflow + add)
          card.classList.remove('fate-resolve-pulse');
          void card.offsetWidth;
          card.classList.add('fate-resolve-pulse');
          setTimeout(() => card.classList.remove('fate-resolve-pulse'), 400);

          // Input glow at text-injection time (~600ms matches fatecards.js apply delay)
          setTimeout(() => {
              ['actionInput', 'dialogueInput'].forEach(id => {
                  const el = document.getElementById(id);
                  if (!el) return;
                  el.classList.remove('fate-resolve-glow');
                  void el.offsetWidth;
                  el.classList.add('fate-resolve-glow');
                  setTimeout(() => el.classList.remove('fate-resolve-glow'), 400);
              });
          }, 600);
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

      // Determine paywall mode: Dirty or Soulmates require sub_only (no StoryPass)
      const requiresSubOnly = (state.intensity === 'Dirty') || (state.storyLength === 'soulmates');
      const lockPaywallMode = requiresSubOnly ? 'sub_only' : 'unlock';

      ['quillBox', 'actionWrapper', 'dialogueWrapper'].forEach(id => {
        const wrap = document.getElementById(id);
        if(wrap) {
            if (shouldLock) {
                 wrap.classList.add('locked-input');
                 setPaywallClickGuard(wrap, true, lockPaywallMode);
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
              setPaywallClickGuard(submitBtn, true, lockPaywallMode);
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

    const cards = document.querySelectorAll('#lengthGrid .sb-card[data-grp="length"]');

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
      // EXCEPTION: soulmates is always selectable — gate is at Begin Story

      if (state.access === 'free' && val === 'voyeur') {
          locked = false;
      } else if (val === 'soulmates') {
          // Soulmates: always selectable, gated at Begin Story
          locked = false;
      } else if (state.access === 'pass') {
          // CRITICAL: Pass ONLY unlocks Fling
          if (val === 'fling') locked = false;
          // affair stays locked = true
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

      // Set paywall mode using canonical eligibility check
      const tempState = { ...state, storyLength: val };
      const paywallMode = isStoryPassEligible(tempState) ? 'unlock' : 'sub_only';
      setPaywallClickGuard(card, locked, paywallMode);

      // Selection state - toggle both selected and flipped
      const isSelected = val === state.storyLength;
      card.classList.toggle('selected', isSelected);
      card.classList.toggle('flipped', isSelected);

      console.log('[ENTITLEMENT] Card:', val, 'locked:', locked, 'hidden:', hidden);
    });

    // ENFORCEMENT: If pass user has affair selected, downgrade (soulmates is allowed, gated at Begin Story)
    if (state.access === 'pass' && state.storyLength === 'affair') {
        console.log('[ENTITLEMENT] Downgrading story length from affair to fling');
        state.storyLength = 'fling';
    }

    // Auto-select fling if pass tier and current selection is voyeur (now hidden)
    if (state.access === 'pass' && state.storyLength === 'voyeur') {
        state.storyLength = 'fling';
    }

    bindLengthHandlers();
  }

  // REMOVED: Separate length click handlers - now using unified handler
  // Length cards are handled by the single unified card handler in initSelectionCardSystem()
  function bindLengthHandlers(){
      // No-op: click handling moved to unified handler
  }

  function applyIntensityLocks(){
      syncTierFromAccess();
      const access = state.access;
      // DEV LOGGING: arousal gating decision
      console.log('[DEV:IntensityGate] access:', access, '| intensity:', state.intensity, '| subscribed:', state.subscribed);
      const setupCards = document.querySelectorAll('#intensityGrid .sb-card');
      const gameBtns = document.querySelectorAll('#gameIntensity button');

      const updateLock = (el, level, isCard) => {
          let locked = false;
          // EXCEPTION: Dirty is selectable on Setup screen — gate is at Begin Story
          // But in Reader (game buttons), Dirty requires Subscribe
          if (access === 'free' && level === 'Erotic') locked = true;
          if (!isCard && level === 'Dirty' && access !== 'sub') locked = true; // Reader: Dirty requires sub

          el.classList.toggle('locked', locked);
          // CRITICAL FIX: Remove preset locked-tease/locked-pass classes when unlocked
          if (!locked) {
              el.classList.remove('locked-tease', 'locked-pass');
              // BUGFIX: Remove data-locked attribute so CSS [data-locked] selector
              // and global click handler no longer treat this as locked
              el.removeAttribute('data-locked');
          } else {
              // Ensure data-locked is set for CSS styling when locked
              if (!el.dataset.locked) {
                  el.dataset.locked = (level === 'Dirty') ? 'sub' : 'tease';
              }
          }
          if(locked) el.classList.remove(isCard ? 'selected' : 'active');
          // Use canonical eligibility check for paywall mode
          const tempState = { ...state, intensity: level };
          const paywallMode = isStoryPassEligible(tempState) ? 'unlock' : 'sub_only';
          setPaywallClickGuard(el, locked, paywallMode);
      };

      setupCards.forEach(c => updateLock(c, c.dataset.val, true));
      gameBtns.forEach(b => updateLock(b, b.innerText.trim(), false));

      // Fallback — Dirty is allowed (gated at Begin Story), only downgrade Erotic for free
      if(state.intensity === 'Erotic' && access === 'free') state.intensity = 'Naughty';
      updateIntensityUI();
  }

  function applyStyleLocks() {
      if (state.mode === 'couple') return;
      const paid = (state.tier === 'paid');
      const cards = document.querySelectorAll('.sb-card[data-grp="style"]');
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
      const setCard = (c) => {
          const isSelected = c.dataset.val === state.intensity;
          c.classList.toggle('selected', isSelected);
          c.classList.toggle('flipped', isSelected);
      };
      const setGame = (b) => b.classList.toggle('active', b.innerText.trim() === state.intensity);
      document.querySelectorAll('#intensityGrid .sb-card').forEach(setCard);
      document.querySelectorAll('#gameIntensity button').forEach(setGame);
  }

  // REMOVED: Separate intensity card handlers - now using unified handler
  // Intensity cards are handled by the single unified card handler in initSelectionCardSystem()
  function wireIntensityHandlers(){
      // Game buttons still need handlers (they are not .sb-card elements)
      document.querySelectorAll('#gameIntensity button').forEach(btn => btn.onclick = (e) => {
          const level = btn.innerText.trim();
          // Dirty in Reader: Subscribe only, no StoryPass
          if (level === 'Dirty' && state.access !== 'sub') {
              window.showPaywall('sub_only'); return;
          }
          // Use canonical eligibility check for other levels
          const tempState = { ...state, intensity: level };
          if (!isStoryPassEligible(tempState) && state.access !== 'sub') {
              window.showPaywall('sub_only'); return;
          }
          if(level === 'Erotic' && state.access === 'free'){ window.openEroticPreview(); return; }
          state.intensity = level;
          state.picks.intensity = level;
          updateIntensityUI();
      });
  }

  window.openEroticPreview = function(){
      const pText = document.getElementById('eroticPreviewText');
      if(pText) pText.innerText = EROTIC_PREVIEW_TEXT;
      document.getElementById('eroticPreviewModal')?.classList.remove('hidden');
  };

  window.showPaywall = function(mode){
    const pm = document.getElementById('payModal');
    if(!pm) return;

    // Cancel any running Fate ceremony — paywall interrupts it completely
    if (_fateRunning) {
        _fateOverridden = true;
        if (typeof cleanupFateVisuals === 'function') cleanupFateVisuals();
        // Also stop fatecards emanations and sparkle cycle
        if (window.stopAllEmanations) window.stopAllEmanations();
        if (window.stopSparkleCycle) window.stopSparkleCycle();
        state._paywallCancelledCeremony = true;
    }

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
    // EXPLICIT ENFORCEMENT: Dirty, Soulmates, Affair NEVER show StoryPass regardless of mode
    const requiresSubOnly = (state.intensity === 'Dirty') ||
                            (state.storyLength === 'soulmates') ||
                            (state.storyLength === 'affair');
    // Use canonical eligibility check — Dirty/Soulmates/Affair NEVER show StoryPass
    const hideUnlock = (mode === 'sub_only') || state.subscribed || hasPassNow || requiresSubOnly || !isStoryPassEligible(state);
    const optUnlock = document.getElementById('optUnlock');
    if(optUnlock) optUnlock.classList.toggle('hidden', !!hideUnlock);

    // Disable Say/Do inputs while paywall is visible
    const _actInput = document.getElementById('actionInput');
    const _diaInput = document.getElementById('dialogueInput');
    if (_actInput) _actInput.disabled = true;
    if (_diaInput) _diaInput.disabled = true;

    pm.classList.remove('hidden');
  };

  // Re-enable inputs when paywall is dismissed without purchase
  window.onPaywallDismiss = function() {
    const actInput = document.getElementById('actionInput');
    const diaInput = document.getElementById('dialogueInput');
    if (actInput) actInput.disabled = false;
    if (diaInput) diaInput.disabled = false;
    state._paywallCancelledCeremony = false;
  };

  /**
   * VALIDATION GUARD: Paywall routing integrity check
   * Ensures StoryPass is never shown for Dirty or Soulmates
   * StoryPass ($3) unlocks Clean, Naughty, and Erotic
   * Returns { valid: true } or { valid: false, error: string }
   */
  function validatePaywallRouting() {
      const optUnlock = document.getElementById('optUnlock');
      const payModal = document.getElementById('payModal');

      // Only validate when paywall is visible
      if (!payModal || payModal.classList.contains('hidden')) {
          return { valid: true, skipped: true };
      }

      const storyPassVisible = optUnlock && !optUnlock.classList.contains('hidden');
      const isDirty = state.intensity === 'Dirty';
      const isSoulmates = state.storyLength === 'soulmates';
      const isAffair = state.storyLength === 'affair';

      // HARD FAIL: StoryPass visible for Dirty
      if (storyPassVisible && isDirty) {
          console.error('[PAYWALL VALIDATION] HARD FAIL: StoryPass shown for Dirty intensity');
          return {
              valid: false,
              error: VALIDATION_ERRORS.STORYPASS_DIRTY_LEAK,
              context: { intensity: state.intensity, storyLength: state.storyLength }
          };
      }

      // HARD FAIL: StoryPass visible for Soulmates
      if (storyPassVisible && isSoulmates) {
          console.error('[PAYWALL VALIDATION] HARD FAIL: StoryPass shown for Soulmates length');
          return {
              valid: false,
              error: VALIDATION_ERRORS.STORYPASS_SOULMATES_LEAK,
              context: { intensity: state.intensity, storyLength: state.storyLength }
          };
      }

      // HARD FAIL: StoryPass visible for Affair
      if (storyPassVisible && isAffair) {
          console.error('[PAYWALL VALIDATION] HARD FAIL: StoryPass shown for Affair length');
          return {
              valid: false,
              error: 'STORYPASS_AFFAIR_LEAK',
              context: { intensity: state.intensity, storyLength: state.storyLength }
          };
      }

      return { valid: true };
  }

  // Expose for DevHUD
  window.validatePaywallRouting = validatePaywallRouting;

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
          // AUTH GATE: Only persist to storage when logged in
          if (isLoggedIn()) {
              localStorage.setItem('sb_subscribed', '1');
              console.log('[ENTITLEMENT] Subscription persisted to localStorage');
          }
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
              toastMessage = "You have shed your limitations.";
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

      // Reset Fate ceremony state — full restart after paywall
      _fateRunning = false;
      _fateOverridden = false;
      _revealedDSPAxes = null;
      _dspGuidedFateActive = false;
      state.fateCommitted = false;

      // Clear DSP pending classes
      const synopsisText = document.getElementById('synopsisText');
      if (synopsisText) {
          synopsisText.querySelectorAll('.dsp-pending').forEach(span => {
              span.classList.remove('dsp-pending');
          });
          synopsisText.classList.remove('dsp-dissolving', 'dsp-revealing');
      }

      // Re-enable Say/Do inputs
      const actInput = document.getElementById('actionInput');
      const diaInput = document.getElementById('dialogueInput');
      if (actInput) { actInput.disabled = false; actInput.value = ''; }
      if (diaInput) { diaInput.disabled = false; diaInput.value = ''; }

      // Full card re-deal (not just init) — gives clickable, flippable, unlocked cards
      if (window.dealFateCards) window.dealFateCards();
      else if (window.initCards) window.initCards();

      // Clear the ceremony-cancelled flag
      state._paywallCancelledCeremony = false;

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
  // Purchase is the authorization — pass must always be granted when paid
  function grantStoryPass(storyId){ if(storyId) localStorage.setItem(getStoryPassKey(storyId), '1'); }

  /**
   * CANONICAL StoryPass eligibility check — SINGLE SOURCE OF TRUTH
   * StoryPass ($3) unlocks: Clean, Naughty, Erotic intensities + Fling length ONLY
   * StoryPass NEVER unlocks: Dirty intensity, Soulmates length, Affair length
   * @param {object} st - state object with intensity and storyLength
   * @returns {boolean} true if StoryPass is a valid unlock option
   */
  function isStoryPassEligible(st) {
    // Dirty intensity ALWAYS requires subscription
    if (st.intensity === 'Dirty') return false;
    // Soulmates length ALWAYS requires subscription
    if (st.storyLength === 'soulmates') return false;
    // Affair length ALWAYS requires subscription
    if (st.storyLength === 'affair') return false;
    // Only Fling length is StoryPass eligible (voyeur is free tier)
    // Clean, Naughty, Erotic with fling length = StoryPass eligible
    return (st.intensity === 'Clean' || st.intensity === 'Naughty' || st.intensity === 'Erotic') &&
           (st.storyLength === 'fling' || st.storyLength === 'voyeur' || !st.storyLength);
  }
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
      // AUTH GATE: No saved story visible unless logged in
      if (!isLoggedIn()) return false;
      return !!localStorage.getItem('sb_saved_story') || localStorage.getItem('sb_story_in_idb') === '1';
  }

  function saveStorySnapshot(){
    // AUTH GATE: Persistence only allowed when logged in
    if (!isLoggedIn()) return;
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
      synopsis: state._synopsisMetadata || '', // Metadata only, never rendered
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
    // AUTH GATE: Continue Story only available when logged in
    if (!isLoggedIn()) {
        showToast('Please login to continue a saved story.');
        return;
    }
    const data = await loadStoryData();
    if (!data) {
        showToast('No saved story found.');
        return;
    }

    state.storyId = data.storyId || makeStoryId();
    // AUTH GATE: Only persist when logged in (redundant but safe)
    if (isLoggedIn()) localStorage.setItem('sb_current_story_id', state.storyId);

    if(data.stateSnapshot) Object.assign(state, data.stateSnapshot);
    state.sysPrompt = data.sysPrompt || state.sysPrompt;
    state.subscribed = !!data.subscribed;
    state.authorChairActive = checkAuthorChairUnlock();

    updateBatedBreathState();
    applyAccessLocks();

    document.getElementById('storyTitle').textContent = data.title || '';
    // BOOK FLOW SPEC: Synopsis is metadata only, never rendered
    // Inside cover = blank paper, Setting plate = visual only
    state._synopsisMetadata = data.synopsis || '';

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

    // Setting shot removed from auto-load - requires explicit user action

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
    if (window.stopSparkleCycle) window.stopSparkleCycle(); // Clear any active fate card sparkles
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
    state.archetype = { primary: 'BEAUTIFUL_RUIN', modifier: null };

    // FIX: Full 4-axis + world state reset (prevents Ash Quarter / Warden-Cadre leak)
    state.picks = { world: 'Modern', tone: 'Earnest', genre: 'Billionaire', dynamic: 'Enemies', era: 'Medieval', pov: 'First' };
    state.intensity = 'Naughty';
    state.visual = { autoLock: true, locked: false, lastImageUrl: "", bible: { style: "", setting: "", characters: {} }, sceneBudgets: {} };
    state.coverArchetype = null;
    state.lenses = [];
    state.withheldCoreVariant = null;
    state.normalizedPlayerKernel = null;
    state.normalizedPartnerKernel = null;
    state.rawPlayerName = null;
    state.rawPartnerName = null;

    // FIX: Cover regeneration reset — allow new cover without hard refresh
    if (_coverAbortController) { _coverAbortController.abort(); _coverAbortController = null; }
    resetBookState();
    // Reset DSP state for fresh intro/placeholder cycle
    if (typeof resetDSPState === 'function') resetDSPState();
    const coverImg = document.getElementById('bookCoverImg');
    if (coverImg) coverImg.src = '';
    const coverLoading = document.getElementById('coverLoadingState');
    if (coverLoading) coverLoading.classList.add('hidden');
    const bookObj = document.getElementById('bookObject');
    if (bookObj) bookObj.classList.add('hidden');
    if (_coverPhraseInterval) { clearInterval(_coverPhraseInterval); _coverPhraseInterval = null; }
    if (_coverProgressInterval) { clearInterval(_coverProgressInterval); _coverProgressInterval = null; }

    // Reset card UI to match default state
    const cardDefaults = { world: 'Modern', tone: 'Earnest', genre: 'Billionaire', dynamic: 'Enemies', intensity: 'Naughty', length: 'voyeur', pov: 'First' };
    Object.entries(cardDefaults).forEach(([grp, val]) => {
        document.querySelectorAll(`.sb-card[data-grp="${grp}"]`).forEach(c => {
            c.classList.remove('selected', 'flipped');
        });
        const def = document.querySelector(`.sb-card[data-grp="${grp}"][data-val="${val}"]`);
        if (def) def.classList.add('selected', 'flipped');
    });

    // Reset name inputs
    const pInput = $('playerNameInput');
    if (pInput) pInput.value = '';
    const lInput = $('partnerNameInput');
    if (lInput) lInput.value = '';

    // Clear pagination system
    StoryPagination.clear();
    // Re-render archetype cards to show default selection
    if (typeof renderArchetypeCards === 'function') renderArchetypeCards();
    if (typeof updateArchetypeSelectionSummary === 'function') updateArchetypeSelectionSummary();

    // PASS 9E: Reset fate card state
    const fateCard = $('fateDestinyCard');
    if (fateCard) {
        fateCard.dataset.fateUsed = 'false';
        fateCard.style.opacity = '1';
        fateCard.style.pointerEvents = 'auto';
        fateCard.classList.remove('flipped');
    }

    updateContinueButtons();
    window.showScreen('setup');
    // FIX: Explicit lock re-application ensures intensity cards reflect current access tier
    applyAccessLocks();
    applyIntensityLocks();
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
  $('btnGameCommitQuill')?.addEventListener('click', async (e) => {
      e.preventDefault(); // Prevent scroll to top
      e.stopPropagation();

      // Save scroll position before any DOM changes
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (!getQuillReady()) return;
      const quillEl = document.getElementById('gameQuillInput');
      if (!quillEl) return;
      const rawQuillText = quillEl.value.trim();
      if (!rawQuillText) { showToast("No Quill edit to commit."); return; }

      // RUNTIME NORMALIZATION: Quill input flows through ChatGPT normalization layer
      const quillNorm = await callNormalizationLayer({
          axis: 'quill',
          user_text: rawQuillText,
          context_signals: state.picks?.world || []
      });
      const quillText = quillNorm.canonical_instruction || quillNorm.normalized_text || rawQuillText;

      // Also apply any pending veto constraints from game modal
      await applyGameVetoFromInput();

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
  $('btnGameCommitVeto')?.addEventListener('click', async () => {
      const vetoEl = document.getElementById('gameVetoInput');
      if (!vetoEl) return;
      const vetoText = vetoEl.value.trim();
      if (!vetoText) { showToast("No Veto rules to commit."); return; }

      await applyGameVetoFromInput();
      vetoEl.value = '';
      document.getElementById('gameQuillVetoModal')?.classList.add('hidden');
      showToast(`Excluded: "${vetoText}"`);
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

  async function applyGameVetoFromInput() {
      const vetoEl = document.getElementById('gameVetoInput');
      if (!vetoEl) return;
      const rawTxt = vetoEl.value.trim();
      if (!rawTxt) return;

      // RUNTIME NORMALIZATION: Game veto input flows through ChatGPT normalization layer
      // CRITICAL: Never store raw text - always use normalized kernel
      const vetoNorm = await callNormalizationLayer({
          axis: 'veto',
          user_text: rawTxt,
          context_signals: state.picks?.world || []
      });
      // Extract kernel - prefer archetype/burden format, then normalized_text, NEVER raw
      const kernel = vetoNorm.archetype || vetoNorm.burden || vetoNorm.normalized_text || vetoNorm.canonical_instruction;
      const txt = kernel || 'excluded element';

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

  $('burgerBtn')?.addEventListener('click', () => {
      if (typeof renderBurgerMenu === 'function') renderBurgerMenu();
      document.getElementById('menuOverlay')?.classList.remove('hidden');
  });
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

  // MODULE-SCOPE: Zoom state variables (accessible to all card systems)
  let currentOpenCard = null;
  let zoomBackdrop = null;

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

    // ==========================================================================
    // CANONICAL ORDER: World → Flavor → Tone → Genre → Dynamic
    // ==========================================================================

    // Layer prerequisites - which selections must exist for a layer to be active
    const LAYER_PREREQUISITES = {
      world: [],           // Always active
      worldSubtype: ['world'],  // Requires World
      tone: ['world'],     // Requires World
      genre: ['world', 'tone'], // Requires World + Tone
      dynamic: ['world', 'tone', 'genre'], // Requires World + Tone + Genre
      era: ['world'],      // Requires World (Historical)
      pov: []              // Always active
    };

    // Tone × Genre compatibility - null means all compatible
    // Format: { tone: [incompatible genres] }
    const TONE_GENRE_INCOMPATIBLE = {
      Comedic: ['Noir'],  // Comedic tone doesn't fit noir fatalism
      Horror: [],         // Horror works with most genres
      Satirical: [],      // Satirical can work with anything
      Mythic: [],         // Mythic is flexible
      Surreal: [],        // Surreal works widely
      Poetic: [],         // Poetic is flexible
      Earnest: [],        // Earnest works with everything
      WryConfession: [],  // Wry works broadly
      Dark: []            // Dark fits everything
    };

    // Genre × Dynamic compatibility - null means all compatible
    // Format: { genre: [incompatible dynamics] }
    const GENRE_DYNAMIC_INCOMPATIBLE = {
      Noir: ['Comedic'],  // Noir fatalism clashes with pure comedy dynamics (if any existed)
      Heist: [],
      CrimeSyndicate: [],
      Billionaire: [],
      Espionage: [],
      Political: []
    };

    // Check if a genre is compatible with the current tone
    function isGenreCompatible(genre, tone) {
      if (!tone) return true;
      const incompatible = TONE_GENRE_INCOMPATIBLE[tone] || [];
      return !incompatible.includes(genre);
    }

    // Check if a dynamic is compatible with the current genre and tone
    function isDynamicCompatible(dynamic, genre, tone) {
      if (!genre) return true;
      const incompatible = GENRE_DYNAMIC_INCOMPATIBLE[genre] || [];
      return !incompatible.includes(dynamic);
    }

    // Check if a layer has its prerequisites met
    function isLayerUnlocked(grp) {
      const prereqs = LAYER_PREREQUISITES[grp] || [];
      return prereqs.every(p => !!state.picks[p]);
    }

    // Update layer visual state (inert/active)
    function updateLayerStates() {
      const layers = ['world', 'worldSubtype', 'tone', 'genre', 'dynamic'];

      layers.forEach(layer => {
        const cards = document.querySelectorAll(`.sb-card[data-grp="${layer}"]`);
        const unlocked = isLayerUnlocked(layer);

        cards.forEach(card => {
          if (!unlocked) {
            card.classList.add('layer-locked');
          } else {
            card.classList.remove('layer-locked');

            // Additional compatibility check for genre and dynamic
            const val = card.dataset.val;
            if (layer === 'genre') {
              const compatible = isGenreCompatible(val, state.picks.tone);
              card.classList.toggle('incompatible', !compatible);
            } else if (layer === 'dynamic') {
              const compatible = isDynamicCompatible(val, state.picks.genre, state.picks.tone);
              card.classList.toggle('incompatible', !compatible);
            }
          }
        });

        // Update helper text for locked layers
        updateLayerHelperText(layer, unlocked);
      });
    }

    // Show/hide helper text for locked layers
    function updateLayerHelperText(layer, unlocked) {
      const helperTexts = {
        tone: 'Choose a World to continue',
        genre: 'Choose a Tone to continue',
        dynamic: 'Choose a Genre to continue'
      };

      const sectionTitles = {
        tone: 'Tone',
        genre: 'Genre',
        dynamic: 'Dynamic'
      };

      // Find section title element
      const sections = document.querySelectorAll('.section-title');
      sections.forEach(section => {
        if (section.textContent.includes(sectionTitles[layer])) {
          let helper = section.querySelector('.layer-helper');
          if (!unlocked && helperTexts[layer]) {
            if (!helper) {
              helper = document.createElement('span');
              helper.className = 'layer-helper';
              section.appendChild(helper);
            }
            helper.textContent = ` — ${helperTexts[layer]}`;
            helper.style.display = 'inline';
          } else if (helper) {
            helper.style.display = 'none';
          }
        }
      });
    }

    // Re-evaluate downstream selections and clear only incompatible ones
    function evaluateDownstreamSelections(changedLayer) {
      const order = ['world', 'worldSubtype', 'tone', 'genre', 'dynamic'];
      const changedIdx = order.indexOf(changedLayer);

      // Check each downstream layer
      for (let i = changedIdx + 1; i < order.length; i++) {
        const layer = order[i];
        const currentVal = state.picks[layer];

        if (!currentVal) continue;

        let compatible = true;

        // Check genre compatibility with tone
        if (layer === 'genre' && state.picks.tone) {
          compatible = isGenreCompatible(currentVal, state.picks.tone);
        }

        // Check dynamic compatibility with genre
        if (layer === 'dynamic' && state.picks.genre) {
          compatible = isDynamicCompatible(currentVal, state.picks.genre, state.picks.tone);
        }

        // Auto-clear only if incompatible
        if (!compatible) {
          autoClearSelection(layer, currentVal);
        }
      }

      updateLayerStates();
    }

    // Auto-clear a selection with subtle feedback
    function autoClearSelection(layer, clearedVal) {
      // Clear from state
      state.picks[layer] = null;

      // Update UI
      const card = document.querySelector(`.sb-card[data-grp="${layer}"][data-val="${clearedVal}"]`);
      if (card) {
        card.classList.remove('selected');
        card.classList.add('auto-cleared');

        // Remove feedback after brief moment
        setTimeout(() => {
          card.classList.remove('auto-cleared');
        }, 1500);
      }

      // Dev-only warning
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[State Repair] Auto-cleared incompatible ${layer}: ${clearedVal}`);
      }
    }

    // ==========================================================================
    // SELECTION CARD SYSTEM (5×7 Flip Cards)
    // ==========================================================================

    // Sub-options data for each World type
    // Modern: NO custom field | All others: HAS custom field
    const WORLD_SUB_OPTIONS = {
      Modern: [
        { val: 'small_town', label: 'Small Town' },
        { val: 'college', label: 'College' },
        { val: 'friends', label: 'Friends' },
        { val: 'old_money', label: 'Old Money' },
        { val: 'office', label: '9-5 / Office' },
        { val: 'supernatural_modern', label: 'Supernatural' },
        { val: 'superheroic_modern', label: 'Superheroic' }
      ],
      Historical: [
        { val: 'prehistoric', label: 'Prehistoric' },
        { val: 'classical', label: 'Classical' },
        { val: 'medieval', label: 'Medieval' },
        { val: 'renaissance', label: 'Renaissance' },
        { val: 'victorian', label: 'Victorian' },
        { val: '20th_century', label: '20th Century' }
      ],
      Fantasy: [
        { val: 'enchanted_realms', label: 'Enchanted Realms' },
        { val: 'hidden_magic', label: 'Hidden Magic' },
        { val: 'cursed_worlds', label: 'Cursed Worlds' }
      ],
      SciFi: [
        { val: 'galactic_civilizations', label: 'Galactic Civilizations' },
        { val: 'future_of_science', label: 'Future of Science' },
        { val: 'cyberpunk', label: 'Cyberpunk' },
        { val: 'post_human', label: 'Post-Human' },
        { val: 'first_contact', label: 'First Contact' },
        { val: 'simulation', label: 'Simulation' }
      ],
      Dystopia: [
        { val: 'authoritarian', label: 'Authoritarian' },
        { val: 'surveillance', label: 'Surveillance' },
        { val: 'corporate', label: 'Corporate' },
        { val: 'environmental', label: 'Environmental' }
      ],
      PostApocalyptic: [
        { val: 'nuclear_aftermath', label: 'Nuclear Aftermath' },
        { val: 'pandemic', label: 'Pandemic' },
        { val: 'climate_ruin', label: 'Climate Ruin' },
        { val: 'tech_fallout', label: 'Tech Fallout' },
        { val: 'slow_decay', label: 'Slow Decay' }
      ]
    };

    // Worlds that have custom text fields (all except Modern)
    // PASS 9F: Added Modern to enable custom modifier text field
    const WORLDS_WITH_CUSTOM_FIELD = ['Modern', 'Historical', 'Fantasy', 'SciFi', 'Dystopia', 'PostApocalyptic'];

    // Historical era remapping (legacy values → new values)
    const HISTORICAL_ERA_REMAP = {
      'Ancient': 'prehistoric',
      'ancient': 'prehistoric',
      'Classical': 'classical',
      'Biblical': 'classical',
      'Medieval': 'medieval',
      'Renaissance': 'renaissance',
      'Early Modern': 'renaissance',
      'Victorian': 'victorian',
      'Industrial': 'victorian',
      'Early20th': '20th_century',
      'Mid20th': '20th_century',
      'Early 20th': '20th_century',
      'Mid-20th': '20th_century',
      '20th Century': '20th_century'
    };

    // Normalize custom field input (IP-safe transformation)
    // Accepts any input, returns normalized kernel
    function normalizeWorldCustom(input) {
      if (!input || typeof input !== 'string') return '';

      // Trim and clean whitespace
      let normalized = input.trim().replace(/\s+/g, ' ');

      // Cap length to prevent abuse
      if (normalized.length > 500) {
        normalized = normalized.substring(0, 500);
      }

      return normalized;
    }

    // Apply Historical era remapping (legacy → new values)
    function applyHistoricalEraRemap() {
      // Check if we have a legacy era value that needs remapping
      if (state.picks.era && !state.picks.worldSubtype) {
        const remapped = HISTORICAL_ERA_REMAP[state.picks.era];
        if (remapped) {
          state.picks.worldSubtype = remapped;
        }
      }

      // Also check worldSubtype itself for legacy values
      if (state.picks.worldSubtype && HISTORICAL_ERA_REMAP[state.picks.worldSubtype]) {
        state.picks.worldSubtype = HISTORICAL_ERA_REMAP[state.picks.worldSubtype];
      }
    }

    function initSelectionCardSystem() {
      // Create zoom backdrop (dims background when card is zoomed)
      if (!document.getElementById('sbZoomBackdrop')) {
        zoomBackdrop = document.createElement('div');
        zoomBackdrop.id = 'sbZoomBackdrop';
        zoomBackdrop.className = 'sb-zoom-backdrop';
        document.body.appendChild(zoomBackdrop);

        // Close zoom on backdrop click
        zoomBackdrop.addEventListener('click', () => {
          closeZoomedCard();
        });
      } else {
        zoomBackdrop = document.getElementById('sbZoomBackdrop');
      }

      // Keyboard handler for Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentOpenCard) {
          closeZoomedCard();
        }
      });

      // REMOVED: convertCardsToSelectionCards() - World, Tone, Genre, Dynamic now use .sb-card system
    }

    function convertCardsToSelectionCards() {
      // Process each layer's card grid
      const grids = [
        { id: 'worldGrid', grp: 'world' },
        { id: 'toneGrid', grp: 'tone' },
        { id: 'genreGrid', grp: 'genre' }
      ];

      grids.forEach(({ id, grp }) => {
        const grid = document.getElementById(id);
        if (!grid) return;

        // Get existing cards
        const oldCards = grid.querySelectorAll('.sb-card[data-grp]');
        const cardData = [];

        oldCards.forEach(card => {
          cardData.push({
            val: card.dataset.val,
            title: card.querySelector('h3')?.textContent || '',
            desc: card.querySelector('p')?.textContent || '',
            selected: card.classList.contains('selected')
          });
        });

        // Clear and convert to selection grid
        grid.classList.remove('style-cards');
        grid.classList.add('selection-grid');
        grid.innerHTML = '';

        cardData.forEach(data => {
          const selCard = createSelectionCard(grp, data);
          grid.appendChild(selCard);
        });
      });

      // Handle dynamic cards (grouped structure)
      const dynamicGrid = document.getElementById('dynamicGrid');
      if (dynamicGrid) {
        const allDynamicCards = dynamicGrid.querySelectorAll('.sb-card[data-grp="dynamic"]');
        const cardData = [];

        allDynamicCards.forEach(card => {
          cardData.push({
            val: card.dataset.val,
            title: card.querySelector('h3')?.textContent || '',
            desc: card.querySelector('p')?.textContent || '',
            selected: card.classList.contains('selected')
          });
        });

        // Replace with flat selection grid
        dynamicGrid.innerHTML = '';
        dynamicGrid.classList.add('selection-grid');
        dynamicGrid.classList.remove('dynamic-grouped');

        cardData.forEach(data => {
          const selCard = createSelectionCard('dynamic', data);
          dynamicGrid.appendChild(selCard);
        });
      }

      // Update layer states for new cards
      updateSelectionCardStates();
    }

    function createSelectionCard(grp, data) {
      const card = document.createElement('div');
      card.className = 'selection-card';
      card.dataset.grp = grp;
      card.dataset.val = data.val;
      if (data.selected) card.classList.add('selected');

      card.innerHTML = `
        <div class="selection-card-inner">
          <div class="selection-card-face selection-card-front">
            <span class="card-title">${data.title}</span>
          </div>
          <div class="selection-card-face selection-card-back">
            <h4 class="card-title">${data.title}</h4>
            <p class="card-desc">${data.desc}</p>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openSelectionCard(card, grp, data));

      return card;
    }

    // Legacy openSelectionCard - now uses in-place zoom for .selection-card elements
    // NOTE: .selection-card system is deprecated - .sb-card is the canonical system
    function openSelectionCard(card, grp, data) {
      // Check if layer is unlocked
      if (!isLayerUnlocked(grp)) return;

      // Check if card is incompatible
      if (card.classList.contains('incompatible')) return;

      // Close any currently open card
      if (currentOpenCard) {
        closeZoomedCard();
      }

      currentOpenCard = card;

      // Dim all other cards
      document.querySelectorAll('.selection-card').forEach(c => {
        if (c !== card) c.classList.add('dimmed');
      });

      // Calculate transform to center the card
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;

      // Calculate translation needed to center the card
      const translateX = viewportCenterX - cardCenterX;
      const translateY = viewportCenterY - cardCenterY;

      // Scale factor (reduced ~20%)
      const scale = 2.0;

      // Apply zoom transform to the SAME card element
      card.classList.add('zoomed');
      card.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

      // Show backdrop
      if (zoomBackdrop) {
        zoomBackdrop.classList.add('active');
      }
    }

    function selectFromZoomedCard(grp, val) {
      // Update state
      state.picks[grp] = val;

      // Update card selection states
      document.querySelectorAll(`.selection-card[data-grp="${grp}"]`).forEach(c => {
        const isSelected = c.dataset.val === val;
        c.classList.toggle('selected', isSelected);
        c.classList.toggle('flipped', isSelected);
      });

      // Also update old-style cards if any remain
      document.querySelectorAll(`.sb-card[data-grp="${grp}"]`).forEach(c => {
        const isSelected = c.dataset.val === val;
        c.classList.toggle('selected', isSelected);
        c.classList.toggle('flipped', isSelected);
      });

      // Handle World-specific updates
      if (grp === 'world') {
        updateWorldSubtypeVisibility(val, state.picks.tone);
        // Clear subtype if world changed
        if (state.picks.worldSubtype && !WORLD_SUB_OPTIONS[val]?.some(o => o.val === state.picks.worldSubtype)) {
          state.picks.worldSubtype = null;
        }
      }

      // Handle Tone-specific updates
      if (grp === 'tone') {
        updateWorldSubtypeVisibility(state.picks.world, val);
      }

      // Evaluate downstream selections
      evaluateDownstreamSelections(grp);

      // Increment DSP activation count (explicit Story Shape choice)
      incrementDSPActivation();

      // Update synopsis
      updateSynopsisPanel(true); // User action: card selection

      // Close after brief delay
      setTimeout(() => closeSelectionCard(), 300);
    }

    // Close zoomed card - returns to STATE 2 (face-up in grid)
    function closeZoomedCard() {
      if (!currentOpenCard) return;

      // Remove any dynamically added zoom content
      const zoomContent = currentOpenCard.querySelector('.sb-zoom-content');
      if (zoomContent) {
        zoomContent.remove();
      }

      // Remove zoom transform from the card
      currentOpenCard.classList.remove('zoomed');
      currentOpenCard.style.transform = '';

      // Remove dimming from all cards (both .sb-card and .selection-card)
      document.querySelectorAll('.sb-card.dimmed, .selection-card.dimmed').forEach(c => {
        c.classList.remove('dimmed');
      });

      // Hide backdrop
      if (zoomBackdrop) {
        zoomBackdrop.classList.remove('active');
      }

      currentOpenCard = null;

      // Re-apply layer states
      updateSelectionCardStates();
    }

    // Legacy alias for compatibility
    function closeSelectionCard() {
      closeZoomedCard();
    }

    // STATE 3: Open zoomed view for .sb-card elements
    // The SAME card element scales and translates to viewport center
    // NO modal, NO popup, NO duplicate DOM
    function openSbCardZoom(card, grp, val) {
      // Close any currently open card
      if (currentOpenCard) {
        closeZoomedCard();
      }

      currentOpenCard = card;

      // Dim all other cards
      document.querySelectorAll('.sb-card[data-grp]').forEach(c => {
        if (c !== card) c.classList.add('dimmed');
      });

      // For World cards, add flavor content to the front face
      if (grp === 'world') {
        populateWorldZoomContent(card, val);
      }

      // Calculate transform to center the card
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;

      // Calculate translation needed to center the card
      const translateX = viewportCenterX - cardCenterX;
      const translateY = viewportCenterY - cardCenterY;

      // Scale factor (reduced ~20%)
      const scale = 2.5;

      // Apply zoom transform to the SAME card element
      card.classList.add('zoomed');
      card.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

      // Show backdrop
      if (zoomBackdrop) {
        zoomBackdrop.classList.add('active');
      }
    }

    // Populate World card zoom view with flavor buttons and optional custom field
    function populateWorldZoomContent(card, worldVal) {
      const frontFace = card.querySelector('.sb-card-front');
      if (!frontFace) return;

      // Remove any existing zoom content
      const existing = frontFace.querySelector('.sb-zoom-content');
      if (existing) existing.remove();

      const flavors = WORLD_SUB_OPTIONS[worldVal] || [];
      const hasCustomField = WORLDS_WITH_CUSTOM_FIELD.includes(worldVal);

      // Create zoom content container
      const zoomContent = document.createElement('div');
      zoomContent.className = 'sb-zoom-content';

      // Add flavor buttons if any
      if (flavors.length > 0) {
        const flavorGrid = document.createElement('div');
        flavorGrid.className = 'sb-zoom-flavors';

        flavors.forEach(flavor => {
          const btn = document.createElement('button');
          btn.className = 'sb-flavor-btn';
          btn.textContent = flavor.label;
          btn.dataset.val = flavor.val;

          // Check if this flavor is currently selected
          if (state.picks.worldSubtype === flavor.val) {
            btn.classList.add('selected');
          }

          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle selection
            if (state.picks.worldSubtype === flavor.val) {
              state.picks.worldSubtype = null;
              btn.classList.remove('selected');
            } else {
              // Deselect others
              flavorGrid.querySelectorAll('.sb-flavor-btn').forEach(b => b.classList.remove('selected'));
              state.picks.worldSubtype = flavor.val;
              btn.classList.add('selected');
            }
            // Increment DSP activation count (explicit Story Shape choice)
            incrementDSPActivation();
            updateSynopsisPanel(true); // User action: flavor selection
          });

          flavorGrid.appendChild(btn);
        });

        zoomContent.appendChild(flavorGrid);
      }

      // Add custom text field if this world supports it
      if (hasCustomField) {
        const customWrapper = document.createElement('div');
        customWrapper.className = 'sb-zoom-custom';

        const customLabel = document.createElement('label');
        customLabel.className = 'sb-zoom-custom-label';
        customLabel.textContent = 'Custom Setting:';

        // Create input wrapper for rotating placeholder
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'sb-zoom-custom-wrapper';

        const customInput = document.createElement('textarea');
        customInput.className = 'sb-zoom-custom-input';
        customInput.id = 'worldCustomInput-' + Date.now(); // Unique ID
        customInput.value = state.worldCustomText || '';
        customInput.rows = 2;

        // Create rotating placeholder
        const rotatingPlaceholder = document.createElement('div');
        rotatingPlaceholder.className = 'sb-zoom-rotating-placeholder';

        // PASS 9D: Build scrolling suggestion content scoped to selected world
        const suggestions = WORLD_CUSTOM_SUGGESTIONS[worldVal] || FATE_SUGGESTIONS.world || [];
        if (suggestions.length > 0) {
          const doubled = [...suggestions, ...suggestions];
          let html = '<span class="sb-zoom-placeholder-inner">';
          doubled.forEach((s, i) => {
            html += `<span class="suggestion">${s}</span>`;
            if (i < doubled.length - 1) html += '<span class="separator">•</span>';
          });
          html += '</span>';
          rotatingPlaceholder.innerHTML = html;
        }

        // Show/hide placeholder based on input content
        const updatePlaceholderVisibility = () => {
          if (customInput.value.trim().length > 0) {
            rotatingPlaceholder.classList.add('hidden');
          } else {
            rotatingPlaceholder.classList.remove('hidden');
          }
        };

        customInput.addEventListener('input', (e) => {
          state.worldCustomText = normalizeWorldCustom(e.target.value);
          updatePlaceholderVisibility();
        });

        customInput.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        customInput.addEventListener('focus', () => {
          const inner = rotatingPlaceholder.querySelector('.sb-zoom-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'paused';
        });

        customInput.addEventListener('blur', () => {
          const inner = rotatingPlaceholder.querySelector('.sb-zoom-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'running';
          updatePlaceholderVisibility();
        });

        inputWrapper.appendChild(customInput);
        inputWrapper.appendChild(rotatingPlaceholder);
        customWrapper.appendChild(customLabel);
        customWrapper.appendChild(inputWrapper);
        zoomContent.appendChild(customWrapper);

        // Initialize visibility
        updatePlaceholderVisibility();
      }

      frontFace.appendChild(zoomContent);
    }

    function updateSelectionCardStates() {
      const layers = ['world', 'tone', 'genre', 'dynamic'];

      layers.forEach(layer => {
        const cards = document.querySelectorAll(`.selection-card[data-grp="${layer}"]`);
        const unlocked = isLayerUnlocked(layer);

        cards.forEach(card => {
          const val = card.dataset.val;

          // Layer locking
          card.classList.toggle('layer-locked', !unlocked);

          // Compatibility check for genre/dynamic
          if (unlocked) {
            if (layer === 'genre') {
              const compatible = isGenreCompatible(val, state.picks.tone);
              card.classList.toggle('incompatible', !compatible);
            } else if (layer === 'dynamic') {
              const compatible = isDynamicCompatible(val, state.picks.genre, state.picks.tone);
              card.classList.toggle('incompatible', !compatible);
            } else {
              card.classList.remove('incompatible');
            }
          }

          // Selection state - toggle both selected and flipped
          const isSelected = state.picks[layer] === val;
          card.classList.toggle('selected', isSelected);
          card.classList.toggle('flipped', isSelected);
        });
      });
    }

    // UNIFIED SINGLE-SELECT: ALL card groups use this handler - NO separate handlers
    const SINGLE_SELECT_AXES = ['world', 'tone', 'genre', 'dynamic', 'era', 'pov', 'worldSubtype', 'intensity', 'length'];

    document.querySelectorAll('.sb-card[data-grp]').forEach(card => {
      if(card.dataset.bound === '1') return;
      card.dataset.bound = '1';
      card.addEventListener('click', (e) => {
        if(e.target.closest('.preview-btn')) return;
        const grp = card.dataset.grp;
        const val = card.dataset.val;
        if(!grp || !val) return;

        // Length cards locked after game starts
        if (grp === 'length' && state.turnCount > 0) return;

        // Intensity/length paywall checks using canonical eligibility
        // EXCEPTION: Soulmates and Dirty are freely selectable — gate is at Begin Story
        if (grp === 'intensity' || grp === 'length') {
          const isSoulmatesOrDirty = (grp === 'intensity' && val === 'Dirty') ||
                                     (grp === 'length' && val === 'soulmates');
          if (!isSoulmatesOrDirty) {
            const tempState = grp === 'intensity'
              ? { ...state, intensity: val }
              : { ...state, storyLength: val };
            if (!isStoryPassEligible(tempState) && state.access !== 'sub') {
              window.showPaywall('sub_only'); return;
            }
          }
          if (grp === 'intensity' && val === 'Erotic' && state.access === 'free') {
            window.openEroticPreview(); return;
          }
        }

        // Locked card: use correct paywall mode based on eligibility
        // EXCEPTION: Soulmates and Dirty bypass lock — gate is at Begin Story
        if(card.classList.contains('locked')) {
          const isSoulmatesOrDirty = (state.intensity === 'Dirty' && grp === 'intensity' && val === 'Dirty') ||
                                     (grp === 'length' && val === 'soulmates');
          if (isSoulmatesOrDirty) {
            // Allow selection — will be gated at Begin Story
            card.classList.remove('locked');
          } else {
            const requiresSubOnly = (state.intensity === 'Dirty') ||
                                    (state.storyLength === 'soulmates') ||
                                    (state.storyLength === 'affair');
            window.showPaywall(requiresSubOnly ? 'sub_only' : 'unlock');
            return;
          }
        }

        // Check if layer is unlocked (prerequisites met)
        if (!isLayerUnlocked(grp)) {
          // Layer is inert - do nothing
          return;
        }

        // Check if card is incompatible
        if (card.classList.contains('incompatible')) {
          // Incompatible selection - do nothing
          return;
        }

        // THREE-STATE CARD INTERACTION MODEL:
        // STATE 1 (face-down) → STATE 2 (face-up/selected): First click on unselected card
        // STATE 2 (face-up) → STATE 3 (zoomed): Second click on already-selected card
        // NEVER deselect by clicking same card - only another card in group can deselect

        const isAlreadySelected = card.classList.contains('selected') && card.classList.contains('flipped');

        if (isAlreadySelected) {
          // STATE 2 → STATE 3: Open zoom view (NEVER deselect)
          openSbCardZoom(card, grp, val);
          return;
        }

        // STATE 1 → STATE 2: Select this card, deselect others in same group
        // Update state based on card group
        if (grp === 'intensity') {
          state.intensity = val;
          state.picks.intensity = val;
        } else if (grp === 'length') {
          state.storyLength = val;
          applyLengthLocks(); // Re-apply locks after selection
        } else {
          state.picks[grp] = val;
        }

        // Deselect all other cards in this group, select this one
        document.querySelectorAll(`.sb-card[data-grp="${grp}"]`).forEach(c => {
          c.classList.remove('selected', 'flipped');
          // Remove any flavor count indicators
          const oldFlavorCount = c.querySelector('.sb-card-flavor-count');
          if (oldFlavorCount) oldFlavorCount.remove();
        });
        card.classList.add('selected', 'flipped');

        // Add flavor count indicator for World cards
        if (grp === 'world') {
          const flavors = WORLD_SUB_OPTIONS[val] || [];
          if (flavors.length > 0) {
            const frontFace = card.querySelector('.sb-card-front');
            if (frontFace && !frontFace.querySelector('.sb-card-flavor-count')) {
              const flavorCount = document.createElement('span');
              flavorCount.className = 'sb-card-flavor-count';
              flavorCount.textContent = `${flavors.length} flavors`;
              frontFace.appendChild(flavorCount);
            }
          }
          updateWorldSubtypeVisibility(val, state.picks.tone);
        }

        // Special handling: show/hide Horror subtypes when Tone changes
        if (grp === 'tone') {
          updateWorldSubtypeVisibility(state.picks.world, val);
        }

        // Evaluate downstream selections for compatibility
        evaluateDownstreamSelections(grp);

        // Increment DSP activation count (explicit Story Shape choice)
        incrementDSPActivation();

        // Update DSP segment based on selection axis
        if (grp === 'world' && DSP_WORLD_PHRASES[val]) {
          activateDSPSegment('world', 'In ' + DSP_WORLD_PHRASES[val]);
        } else if (grp === 'genre' && DSP_GENRE_PARAPHRASES[val]) {
          activateDSPSegment('genre', ', shaped by ' + DSP_GENRE_PARAPHRASES[val]);
        } else if (grp === 'dynamic' && state.archetype?.primary && DSP_ARCHETYPE_ADJECTIVES[state.archetype.primary]) {
          activateDSPSegment('archetype', ', a question awaits: Will ' + DSP_ARCHETYPE_ADJECTIVES[state.archetype.primary]);
        } else if (grp === 'tone' && DSP_TONAL_ADJECTIVES[val]) {
          activateDSPSegment('tone', ' desire redeem this ' + DSP_TONAL_ADJECTIVES[val]);
        } else if (grp === 'length') {
          const AFFAIR_WORD_MAP = { voyeur: 'tease', fling: 'fling', affair: 'affair', soulmates: 'cosmic connection' };
          activateDSPSegment('length', ' ' + (AFFAIR_WORD_MAP[val] || 'affair') + '\u2009\u2014\u2009or ruin it?');
        }

        // Update floating synopsis panel
        updateSynopsisPanel(true); // User action: card click
      });
    });

    // Initialize World Subtype visibility based on initial selections
    updateWorldSubtypeVisibility(state.picks.world, state.picks.tone);
    // Initialize synopsis panel (not a user action - keeps placeholder)
    updateSynopsisPanel();
    // Initialize layer states (gating, compatibility)
    updateLayerStates();
    // Initialize selection card system
    initSelectionCardSystem();
    // Apply any legacy Historical era remapping
    applyHistoricalEraRemap();

    // Name refining indicator helpers
    function showNameRefiningIndicator(inputEl) {
      let indicator = inputEl.parentElement?.querySelector('.name-refining-indicator');
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'name-refining-indicator';
        indicator.innerHTML = '<span class="refining-dot">●</span> Refining name…';
        inputEl.parentElement?.appendChild(indicator);
      }
      indicator.style.display = 'inline';
    }

    function hideNameRefiningIndicator(inputEl) {
      const indicator = inputEl.parentElement?.querySelector('.name-refining-indicator');
      if (indicator) indicator.style.display = 'none';
    }

    // Player name normalization (DSP no longer includes names — no DSP refresh needed)
    const playerNameInput = $('playerNameInput');
    if (playerNameInput) {
      playerNameInput.addEventListener('input', () => {
        state.normalizedPlayerKernel = playerNameInput.value.trim() || 'the one who carries the story';
        // Name entry does NOT trigger DSP update — names are not in DSP
      });
      playerNameInput.addEventListener('blur', async () => {
        const raw = playerNameInput.value.trim();
        if (!raw) return;
        showNameRefiningIndicator(playerNameInput);
        const norm = await callNormalizationLayer({
          axis: 'character',
          user_text: raw,
          context_signals: state.picks?.world || []
        });
        hideNameRefiningIndicator(playerNameInput);
        const kernel = norm.normalized_text || norm.archetype || 'the one who carries the story';
        state.normalizedPlayerKernel = kernel;
        state.rawPlayerName = raw;
        playerNameInput.value = kernel;
        // Name entry does NOT trigger DSP update — names are not in DSP
      });
    }

    // Normalize partner name on blur (DSP no longer includes names — no DSP refresh needed)
    const partnerNameInput = $('partnerNameInput');
    if (partnerNameInput) {
      partnerNameInput.addEventListener('input', () => {
        // Name entry does NOT trigger DSP update — names are not in DSP
      });
      partnerNameInput.addEventListener('blur', async () => {
        const raw = partnerNameInput.value.trim();
        if (!raw) return;
        showNameRefiningIndicator(partnerNameInput);
        const norm = await callNormalizationLayer({
          axis: 'character',
          user_text: raw,
          context_signals: state.picks?.world || []
        });
        hideNameRefiningIndicator(partnerNameInput);
        const kernel = norm.normalized_text || norm.archetype || 'the one who draws them forward';
        state.normalizedPartnerKernel = kernel;
        state.rawPartnerName = raw;
        partnerNameInput.value = kernel;
      });
    }

    // Initialize Archetype System
    initArchetypeUI();
  }

  // Debounce utility for input handlers
  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // WORLD SUBTYPE VISIBILITY - Show/hide subtype selections per world
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Maps world values to their subtype selection container IDs.
   * Only these worlds have subtype options:
   * - SciFi, Fantasy, Horror (tone-based), Dystopia, PostApocalyptic
   */
  const WORLD_SUBTYPE_MAP = {
    Modern: 'modernSubtypeSelection',
    SciFi: 'scifiSubtypeSelection',
    Fantasy: 'fantasySubtypeSelection',
    Dystopia: 'dystopiaSubtypeSelection',
    PostApocalyptic: 'apocalypseSubtypeSelection'
  };

  // Horror subtypes are shown when Horror TONE is selected with certain worlds
  const HORROR_ELIGIBLE_WORLDS = ['Fantasy', 'Modern'];

  function updateWorldSubtypeVisibility(worldValue, toneValue) {
    // CORRECTIVE: World flavors now appear ONLY in the zoomed card popup
    // Hide all below-card subtype sections permanently
    Object.values(WORLD_SUBTYPE_MAP).forEach(id => {
      const section = document.getElementById(id);
      if (section) section.classList.add('hidden');
    });
    const horrorSection = document.getElementById('horrorSubtypeSelection');
    if (horrorSection) horrorSection.classList.add('hidden');

    // Clear worldSubtype from state when world changes
    if (state.picks.worldSubtype) {
      delete state.picks.worldSubtype;
    }

    // DISABLED: Below-card sections are no longer shown
    // Flavors now only appear in the zoomed world card popup
    return;

    // Show relevant subtype section based on world
    const subtypeSectionId = WORLD_SUBTYPE_MAP[worldValue];
    if (subtypeSectionId) {
      const section = document.getElementById(subtypeSectionId);
      if (section) section.classList.remove('hidden');
    }

    // Show horror subtypes if Horror tone is selected with eligible world
    if (toneValue === 'Horror' && HORROR_ELIGIBLE_WORLDS.includes(worldValue)) {
      if (horrorSection) horrorSection.classList.remove('hidden');
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
  // ═══════════════════════════════════════════════════════════════════
  // DSP FIXED TEMPLATE — ASSEMBLED, NOT AUTHORED
  // Two-sentence ceremonial template with locked phrase injection.
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // DSP WORLD PHRASES — LOCKED CANON (DO NOT MODIFY)
  // Used as: "In [world] …"
  // Supernatural is a Modern subtype, not a standalone world.
  // ═══════════════════════════════════════════════════════════════════
  const DSP_WORLD_PHRASES = {
    Modern: 'a modern world of ambition and things left unsaid',
    Historical: 'an era of duty, reputation, and unyielding tradition',
    Fantasy: 'a realm of oaths, myth, and old magic',
    SciFi: 'an age of technological acceleration and alien laws',
    Dystopia: 'a world of surveillance, rationed freedom, and enforced order',
    PostApocalyptic: 'a broken world of scarcity, ruins, and hard bargains'
  };

  // ═══════════════════════════════════════════════════════════════════
  // DSP GENRE PARAPHRASES — LOCKED CANON (DO NOT MODIFY)
  // Used as: "shaped by …"
  // ═══════════════════════════════════════════════════════════════════
  const DSP_GENRE_PARAPHRASES = {
    CrimeSyndicate: 'loyalty, leverage, and quiet violence',
    Billionaire: 'power, appetite, and polished threat',
    Noir: 'secrets, temptation, and moral compromise',
    Political: 'alliances, betrayals, and shifting leverage',
    Heist: 'precision, misdirection, and nerve',
    Espionage: 'double lives, coded truths, and invisible wars',
    Escape: 'locked doors, narrow windows, and the clock',
    Survival: 'scarcity, endurance, and brutal choices',
    Sports: 'discipline, rivalry, and everything on the line',
    Obsession: 'fixation, escalation, and loss of control',
    Redemption: 'reckoning, mercy, and second chances',
    BuildingBridges: 'repair, trust, and improbable understanding',
    RelentlessPast: 'old debts, buried identities, and consequences that refuse to stay buried',
    ForbiddenKnowledge: 'curiosity, revelation, and the price of knowing',
    Purgatory: 'unfinished business, reflection, and finding the key to your own lock'
  };

  const DSP_ARCHETYPE_ADJECTIVES = {
    HEART_WARDEN: 'controlling',
    OPEN_VEIN: 'overwhelming',
    SPELLBINDER: 'mesmerizing',
    ARMORED_FOX: 'unaccountable',
    DARK_VICE: 'consuming',
    BEAUTIFUL_RUIN: 'self-destructive',
    ETERNAL_FLAME: 'unyielding'
  };

  const DSP_TONAL_ADJECTIVES = {
    Earnest: 'heartfelt',
    WryConfession: 'self-deprecating',
    Poetic: 'brewing',
    Dark: 'suffocating',
    Horror: 'terrifying',
    Mythic: 'fated',
    Comedic: 'utterly unnecessary',
    Surreal: 'reality-bending',
    Satirical: 'forethoughtless'
  };

  /**
   * Generate the DSP — fixed two-sentence ceremonial template.
   * Sentence 1: In [WORLD_PHRASE], shaped by [GENRE_PARAPHRASE], a question awaits:
   * Sentence 2: Will [ARCHETYPAL_ADJECTIVE] desire redeem this [TONAL_ADJECTIVE] affair — or ruin it?
   * Slots wrapped in dsp-clause spans for progressive reveal.
   * World subtypes are intentionally ignored — DSP uses bible phrases only.
   */
  /**
   * Generate DSP sentence from locked template.
   * HARD FAILS if any required input is missing or invalid.
   * No fallbacks, no defaults, no invented prose.
   * @returns {{ success: boolean, html: string|null, error: object|null }}
   */
  function generateDSPSentence() {
    const world = state.picks?.world;
    const genre = state.picks?.genre;
    const tone = state.picks?.tone;
    const archetypeId = state.archetype?.primary;

    // HARD FAIL: No fallback defaults — all inputs must be explicitly set
    if (!world) {
      const error = { code: 'DSP_MISSING_WORLD', message: 'DSP generation failed: world not set' };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }
    if (!genre) {
      const error = { code: 'DSP_MISSING_GENRE', message: 'DSP generation failed: genre not set' };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }
    if (!tone) {
      const error = { code: 'DSP_MISSING_TONE', message: 'DSP generation failed: tone not set' };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }
    if (!archetypeId) {
      const error = { code: 'DSP_MISSING_ARCHETYPE', message: 'DSP generation failed: archetype not set' };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }

    // HARD FAIL: Phrase must exist in approved list
    const worldPhrase = DSP_WORLD_PHRASES[world];
    if (!worldPhrase) {
      const error = { code: 'DSP_INVALID_WORLD', message: `DSP generation failed: no approved phrase for world "${world}"` };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }

    const genrePhrase = DSP_GENRE_PARAPHRASES[genre];
    if (!genrePhrase) {
      const error = { code: 'DSP_INVALID_GENRE', message: `DSP generation failed: no approved phrase for genre "${genre}"` };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }

    const archAdj = DSP_ARCHETYPE_ADJECTIVES[archetypeId];
    if (!archAdj) {
      const error = { code: 'DSP_INVALID_ARCHETYPE', message: `DSP generation failed: no approved adjective for archetype "${archetypeId}"` };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }

    const toneAdj = DSP_TONAL_ADJECTIVES[tone];
    if (!toneAdj) {
      const error = { code: 'DSP_INVALID_TONE', message: `DSP generation failed: no approved adjective for tone "${tone}"` };
      console.error('[DSP] HARD FAIL:', error.message);
      return { success: false, html: null, error };
    }

    // CANONICITY ASSERTION: All DSP components must match canonical maps EXACTLY
    // Guards against any runtime modification or corruption
    if (worldPhrase !== DSP_WORLD_PHRASES[world]) {
      const error = { code: 'DSP_CANONICITY_FAIL', message: `World phrase corrupted: expected canonical "${DSP_WORLD_PHRASES[world]}"` };
      console.error('[DSP] CANONICITY FAIL:', error.message);
      return { success: false, html: null, error };
    }
    if (genrePhrase !== DSP_GENRE_PARAPHRASES[genre]) {
      const error = { code: 'DSP_CANONICITY_FAIL', message: `Genre phrase corrupted: expected canonical "${DSP_GENRE_PARAPHRASES[genre]}"` };
      console.error('[DSP] CANONICITY FAIL:', error.message);
      return { success: false, html: null, error };
    }
    if (archAdj !== DSP_ARCHETYPE_ADJECTIVES[archetypeId]) {
      const error = { code: 'DSP_CANONICITY_FAIL', message: `Archetype adjective corrupted: expected canonical "${DSP_ARCHETYPE_ADJECTIVES[archetypeId]}"` };
      console.error('[DSP] CANONICITY FAIL:', error.message);
      return { success: false, html: null, error };
    }
    if (toneAdj !== DSP_TONAL_ADJECTIVES[tone]) {
      const error = { code: 'DSP_CANONICITY_FAIL', message: `Tone adjective corrupted: expected canonical "${DSP_TONAL_ADJECTIVES[tone]}"` };
      console.error('[DSP] CANONICITY FAIL:', error.message);
      return { success: false, html: null, error };
    }

    // STRICT DSP ASSEMBLY — no invented prose, no embellishment
    // Dynamic affair word based on storyLength
    const AFFAIR_WORD_MAP = {
      voyeur: 'tease',
      fling: 'fling',
      affair: 'affair',
      soulmates: 'cosmic connection'
    };

    let html = '';

    // FULL MODE: Only after story has begun (turnCount > 0)
    // SPARSE MODE: During Story Shape and Guided Fate (progressive reveal)
    const storyHasBegun = (state.turnCount || 0) > 0;

    if (storyHasBegun) {
      // FULL MODE: Render complete sentence (story in progress)
      const affairWord = AFFAIR_WORD_MAP[state.storyLength] || 'affair';
      html = 'In <span class="dsp-clause" data-axis="world">' + worldPhrase +
        ', shaped by ' + genrePhrase + '</span>' +
        ', a question awaits: Will <span class="dsp-clause" data-axis="archetype">' + archAdj + '</span>' +
        ' desire redeem this <span class="dsp-clause" data-axis="tone">' + toneAdj + '</span>' +
        ' ' + affairWord + '&#8201;&#8212;&#8201;or ruin it?';
    } else {
      // SPARSE MODE: Build sentence incrementally based on completed selections
      // During Guided Fate: use _revealedDSPAxes
      // During Story Shape: derive from state.picks (user-initiated selections)
      // NO greyed text, NO placeholders, NO future parts
      let hasWorld, hasArchetype, hasTone, hasLength;

      if (_revealedDSPAxes) {
        // Guided Fate mode: use explicit reveal tracking
        hasWorld = _revealedDSPAxes.has('world');
        hasArchetype = _revealedDSPAxes.has('archetype');
        hasTone = _revealedDSPAxes.has('tone');
        hasLength = _revealedDSPAxes.has('length');
      } else {
        // Story Shape mode: derive from completed selections
        // DSP activates after 2+ explicit choices — show all current picks
        hasWorld = isDSPActivated() && !!state.picks?.world;
        hasArchetype = isDSPActivated() && !!state.picks?.genre;
        hasTone = isDSPActivated() && !!state.picks?.tone;
        hasLength = isDSPActivated() && !!state.storyLength;
      }

      if (hasWorld) {
        html = 'In <span class="dsp-clause" data-axis="world">' + worldPhrase +
          ', shaped by ' + genrePhrase + '</span>';
      }
      if (hasWorld && hasArchetype) {
        html += ', a question awaits: Will <span class="dsp-clause" data-axis="archetype">' + archAdj + '</span>';
      }
      if (hasWorld && hasArchetype && hasTone) {
        html += ' desire redeem this <span class="dsp-clause" data-axis="tone">' + toneAdj + '</span>';
      }
      if (hasWorld && hasArchetype && hasTone && hasLength) {
        const affairWord = AFFAIR_WORD_MAP[state.storyLength] || 'affair';
        html += ' ' + affairWord + '&#8201;&#8212;&#8201;or ruin it?';
      }
    }

    return { success: true, html, error: null };
  }

  // NOTE: World subtypes are INTENTIONALLY excluded from DSP.
  // DSP uses ONLY base world phrases from DSP_WORLD_PHRASES.
  // Subtypes affect story generation prompts, NOT the DSP.

  function updateSynopsisPanel(isUserAction = false) {
    const synopsisText = document.getElementById('synopsisText');
    if (!synopsisText) return;

    // GATE: During Guided Fate, DSP updates come ONLY from revealDSPClause
    // This prevents bulk hydration or catch-up rendering
    if (_dspGuidedFateActive) return;

    // ACTIVATION THRESHOLD: DSP requires at least 2 explicit Story Shape choices
    // Block rendering until threshold is met
    if (!isDSPActivated()) return;

    const result = generateDSPSentence();

    // HARD FAIL: Do not display anything if DSP generation failed
    if (!result.success) {
      console.error('[DSP] updateSynopsisPanel blocked:', result.error?.message);
      // Keep placeholder if threshold not met
      if (!isDSPActivated()) return;
      // Clear any legacy content — DSP must be empty on failure
      synopsisText.innerHTML = '';
      synopsisText._lastDSP = null;
      return;
    }

    // Track first hydration for animation purposes
    const wasFirstHydration = !synopsisText._lastDSP;

    const newSentence = result.html;

    // Update with animation if content changed
    if (synopsisText._lastDSP !== newSentence) {
      synopsisText._lastDSP = newSentence;
      synopsisText.classList.add('updating');
      synopsisText.innerHTML = newSentence;

      // Sequential reveal of clauses on first hydration (non-Guided Fate only)
      if (wasFirstHydration && !_fateRunning) {
        const clauses = synopsisText.querySelectorAll('.dsp-clause');
        clauses.forEach((clause, i) => {
          clause.classList.add('dsp-pending');
          setTimeout(() => {
            clause.classList.remove('dsp-pending');
            clause.classList.add('dsp-glow');
            setTimeout(() => clause.classList.remove('dsp-glow'), 500);
          }, 300 + i * 400);
        });
      }
      // SPARSE MODE: During Guided Fate, sentence is built incrementally
      // by revealDSPClause — no pending classes needed here

      setTimeout(() => synopsisText.classList.remove('updating'), 500);
    }
  }

  // Ceremonial DSP presentation swap — dissolve + re-render fully resolved
  // No prose recomposition; same authored template, just remove pending state.
  function performDSPCeremonialRewrite() {
    const synopsisText = document.getElementById('synopsisText');
    if (!synopsisText) return;

    // Phase 1: dissolve current text
    synopsisText.classList.add('dsp-dissolving');

    // Spawn a few particles near DSP during dissolve (anchored to panel)
    const panel = document.getElementById('synopsisPanel');
    if (panel) {
      const container = getOrCreateSparkleContainer(panel);
      if (container) {
        const pw = panel.offsetWidth;
        const ph = panel.offsetHeight;
        for (let i = 0; i < 8; i++) {
          const spark = document.createElement('div');
          spark.className = 'fate-dust-particle';
          spark.dataset.sparkleTag = 'dsp-rewrite';
          const sx = Math.random() * pw;
          const sy = Math.random() * ph;
          const sz = 2 + Math.random() * 3;
          const sd = 2000 + Math.random() * 1500;
          spark.style.cssText = `
            left:${sx}px; top:${sy}px;
            width:${sz}px; height:${sz}px;
            --dust-duration:${sd}ms;
            --dust-opacity:${0.5 + Math.random() * 0.3};
            --dust-dx:${(Math.random() - 0.5) * 30}px;
            --dust-dy:${-(10 + Math.random() * 20)}px;
          `;
          container.appendChild(spark);
          setTimeout(() => { if (spark.parentNode) spark.remove(); }, sd + 100);
        }
      }
    }

    // Phase 2: re-render same sentence fully resolved (no pending classes)
    setTimeout(() => {
      const result = generateDSPSentence();
      // HARD FAIL: Do not display anything if DSP generation failed
      if (!result.success) {
        console.error('[DSP] performDSPCeremonialRewrite blocked:', result.error?.message);
        synopsisText.innerHTML = '';
        synopsisText._lastDSP = null;
        synopsisText.classList.remove('dsp-dissolving');
        return;
      }
      const resolved = result.html;
      synopsisText.innerHTML = resolved;
      synopsisText._lastDSP = resolved;
      synopsisText.classList.remove('dsp-dissolving');
      synopsisText.classList.add('dsp-revealing');

      setTimeout(() => synopsisText.classList.remove('dsp-revealing'), 700);
    }, 500);
  }

  /**
   * Get selected world subtype from the subtype selection UI
   * Returns null if no subtype is selected
   */
  function getSelectedWorldSubtype(world) {
    // Map world to subtype container ID
    const subtypeContainerMap = {
      SciFi: 'scifiSubtypeGrid',
      Fantasy: 'fantasySubtypeGrid',
      Horror: 'horrorSubtypeGrid',
      Dystopia: 'dystopiaSubtypeGrid',
      PostApocalyptic: 'apocalypseSubtypeGrid'
    };

    const containerId = subtypeContainerMap[world];
    if (!containerId) return null;

    const container = document.getElementById(containerId);
    if (!container) return null;

    const selected = container.querySelector('.card.selected');
    return selected?.dataset?.val || null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // DSP VISIBILITY LIFECYCLE (STATE-BASED)
  // DSP is visible throughout the four-axis configuration (World → Tone
  // → Genre → Dynamic). It disappears only after Begin Story is clicked.
  // Visibility is tied to screen state, not scroll position.
  // ═══════════════════════════════════════════════════════════════════
  let _dspActivationCount = 0; // Count of explicit Story Shape selections (activates DSP at >= 2)
  let _dspGuidedFateActive = false; // True during Guided Fate — prevents bulk hydration
  let _dspPhase = 0; // 0=intro, 1=placeholder, 2=live, 3=veto
  let _dspIntroTimer = null; // Timer for intro→placeholder transition

  // Reset DSP state for new story / mode change
  function resetDSPState() {
      _dspPhase = 0;
      _dspActivationCount = 0;
      if (_dspIntroTimer) {
          clearTimeout(_dspIntroTimer);
          _dspIntroTimer = null;
      }
      const synopsisText = document.getElementById('synopsisText');
      if (synopsisText) {
          synopsisText._dspInitialized = false;
          synopsisText._lastDSP = null;
      }
  }

  function isDSPActivated() {
      return _dspActivationCount >= 2;
  }

  function incrementDSPActivation() {
      _dspActivationCount++;
      console.log(`[DSP] Activation count: ${_dspActivationCount}`);
  }

  // Build full DSP placeholder sentence with all segments in grey (inactive) state
  function buildDSPPlaceholderHTML() {
      return '<span class="dsp-segment dsp-inactive" data-axis="world">In a world yet unchosen</span>' +
             '<span class="dsp-segment dsp-inactive" data-axis="genre">, shaped by forces unknown</span>' +
             '<span class="dsp-segment dsp-inactive" data-axis="archetype">, a question awaits: Will unspoken</span>' +
             '<span class="dsp-segment dsp-inactive" data-axis="tone"> desire redeem this</span>' +
             '<span class="dsp-segment dsp-inactive" data-axis="length"> untold affair&#8201;&#8212;&#8201;or ruin it?</span>';
  }

  // Update a single DSP segment when user makes a selection
  function activateDSPSegment(axis, text) {
      if (_dspPhase < 1) return; // Not ready for updates yet
      _dspPhase = 2; // Move to live phase
      const synopsisText = document.getElementById('synopsisText');
      if (!synopsisText) return;
      const segment = synopsisText.querySelector(`.dsp-segment[data-axis="${axis}"]`);
      if (segment) {
          // Guard: prevent glow spam on reselection
          if (segment.classList.contains('dsp-active')) return;
          segment.textContent = text;
          segment.classList.remove('dsp-inactive');
          segment.classList.add('dsp-active', 'dsp-glow');
          setTimeout(() => segment.classList.remove('dsp-glow'), 500);
      }
  }

  // Veto override: reveal all remaining grey segments as white (no glow)
  function revealAllDSPSegments() {
      _dspPhase = 3;
      const synopsisText = document.getElementById('synopsisText');
      if (!synopsisText) return;
      const inactiveSegments = synopsisText.querySelectorAll('.dsp-segment.dsp-inactive');
      inactiveSegments.forEach(seg => {
          seg.classList.remove('dsp-inactive');
          seg.classList.add('dsp-active');
          // No glow for veto-revealed segments
      });
  }

  function showDSP() {
    const synopsisPanel = document.getElementById('synopsisPanel');
    if (synopsisPanel) {
      // Inject "First Taste" header if not present
      if (!synopsisPanel.querySelector('.synopsis-title')) {
        const title = document.createElement('div');
        title.className = 'synopsis-title';
        title.textContent = 'First Taste';
        synopsisPanel.insertBefore(title, synopsisPanel.firstChild);
      }
      const synopsisText = document.getElementById('synopsisText');
      // Phase 0: Show intro message
      if (_dspPhase === 0 && synopsisText && !synopsisText._dspInitialized) {
        synopsisText._dspInitialized = true;
        synopsisText.innerHTML = '<span class="dsp-intro">Your choices shape your story</span>';
        // Transition to Phase 1 after 5 seconds
        if (_dspIntroTimer) clearTimeout(_dspIntroTimer);
        _dspIntroTimer = setTimeout(() => {
          _dspPhase = 1;
          synopsisText.innerHTML = buildDSPPlaceholderHTML();
        }, 5000);
      }
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
  window.activateDSPSegment = activateDSPSegment;
  window.revealAllDSPSegments = revealAllDSPSegments;

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

  function renderArchetypeCards() {
      const grid = document.getElementById('archetypeCardGrid');
      if (!grid) return;

      grid.innerHTML = '';

      ARCHETYPE_ORDER.forEach(id => {
          const arch = ARCHETYPES[id];
          if (!arch) return;

          const card = document.createElement('div');
          card.className = 'sb-card';
          card.dataset.archetype = id;
          if (state.archetype.primary === id) {
              card.classList.add('selected', 'flipped');
          }

          // Card structure: BACK shows title only (unclicked), FRONT shows title+desc (revealed on flip/select)
          card.innerHTML = `
              <div class="sb-card-inner">
                  <div class="sb-card-face sb-card-back">
                      <span class="sb-card-title">${arch.name}</span>
                  </div>
                  <div class="sb-card-face sb-card-front">
                      <span class="sb-card-title">${arch.name}</span>
                      <span class="sb-card-desc">${arch.desireStyle}</span>
                  </div>
              </div>
          `;

          // Click to select/flip in place - NO popup
          card.addEventListener('click', () => selectArchetypeCard(id));
          grid.appendChild(card);
      });
  }

  // THREE-STATE ARCHETYPE CARD MODEL:
  // STATE 1 (face-down) → STATE 2 (face-up/selected): Click unselected card
  // STATE 2 (face-up) → STATE 3 (zoomed): Click already-selected card
  // Cards only return to face-down when another card is selected
  function selectArchetypeCard(archetypeId) {
      const isAlreadySelected = state.archetype.primary === archetypeId;

      if (isAlreadySelected) {
          // STATE 2 → STATE 3: Open zoomed overlay (never deselect)
          openArchetypeOverlay(archetypeId);
          return;
      }

      // STATE 1 → STATE 2: Select this card, previous selection returns to face-down
      state.archetype.primary = archetypeId;
      // Clear modifier if it was same as new primary
      if (state.archetype.modifier === archetypeId) {
          state.archetype.modifier = null;
      }

      // Update all card states - only selected card stays flipped
      updateArchetypeCardStates();
      updateArchetypeSelectionSummary();
      // Increment DSP activation count (explicit Story Shape choice)
      incrementDSPActivation();
      updateSynopsisPanel(true); // User action: archetype selection
  }

  // Populate archetype card zoom view with modifier custom field only (NO pills)
  function populateArchetypeZoomContent(card, archetypeId) {
      const frontFace = card.querySelector('.sb-card-front');
      if (!frontFace) return;

      // Remove any existing zoom content
      const existing = frontFace.querySelector('.sb-zoom-content');
      if (existing) existing.remove();

      // Get valid secondaries (respects pairing rules, excludes current primary)
      const validModifiers = getValidModifierArchetypes(archetypeId);

      // Create zoom content container
      const zoomContent = document.createElement('div');
      zoomContent.className = 'sb-zoom-content sb-zoom-content-storybeau';

      // NO modifier pills - only custom text field with scrolling examples

      // Add custom text field with rotating placeholder
      const customWrapper = document.createElement('div');
      customWrapper.className = 'sb-zoom-custom';

      const customLabel = document.createElement('label');
      customLabel.className = 'sb-zoom-custom-label';
      customLabel.textContent = 'Secondary:';

      // Create input wrapper for rotating placeholder
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'sb-zoom-custom-wrapper';

      const customInput = document.createElement('textarea');
      customInput.className = 'sb-zoom-custom-input';
      customInput.id = 'archetypeModifierInput-' + Date.now();
      customInput.rows = 1;

      // Restore modifier value from state if previously set
      if (state.archetype.modifier && ARCHETYPES[state.archetype.modifier]) {
          customInput.value = ARCHETYPES[state.archetype.modifier].name;
      }

      // Create rotating placeholder
      const rotatingPlaceholder = document.createElement('div');
      rotatingPlaceholder.className = 'sb-zoom-rotating-placeholder';

      // Build scrolling suggestion content from valid modifier names
      const modifierNames = validModifiers.map(modId => {
          const mod = ARCHETYPES[modId];
          return mod ? mod.name.replace('The ', '') : null;
      }).filter(Boolean);

      if (modifierNames.length > 0) {
          // Double the list for seamless scrolling
          const doubled = [...modifierNames, ...modifierNames];
          let html = '<span class="sb-zoom-placeholder-inner">';
          doubled.forEach((name, i) => {
              html += `<span class="suggestion">${name}</span>`;
              if (i < doubled.length - 1) html += '<span class="separator">•</span>';
          });
          html += '</span>';
          rotatingPlaceholder.innerHTML = html;
      }

      // TASK A: Single commitModifier function for ALL exit paths
      function commitModifier() {
          const inputVal = customInput.value.trim();
          if (!inputVal) {
              // Empty input - show placeholder but don't clear state
              rotatingPlaceholder.classList.remove('hidden');
              return;
          }

          // Try to normalize and match
          const matchedModifier = normalizeArchetypeModifierInput(inputVal, archetypeId);
          if (matchedModifier) {
              // Matched archetype - update state and show canonical name
              state.archetype.modifier = matchedModifier;
              state.archetype.modifierText = null;
              const canonicalName = ARCHETYPES[matchedModifier]?.name || matchedModifier;
              customInput.value = canonicalName;
          } else {
              // No match - keep the text as custom modifier text
              // DO NOT clear the input - user's text stays visible
              state.archetype.modifier = null;
              state.archetype.modifierText = inputVal; // Store raw text
          }
          updateArchetypeSelectionSummary();
          // Keep placeholder hidden since input has value
          rotatingPlaceholder.classList.add('hidden');
      }

      customInput.addEventListener('click', (e) => {
          e.stopPropagation();
      });

      customInput.addEventListener('focus', () => {
          const inner = rotatingPlaceholder.querySelector('.sb-zoom-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'paused';
          rotatingPlaceholder.classList.add('hidden');
      });

      // TASK A & C: blur routes through commitModifier
      customInput.addEventListener('blur', () => {
          const inner = rotatingPlaceholder.querySelector('.sb-zoom-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'running';
          commitModifier();
      });

      // TASK C: Enter key commits without clearing
      customInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault();
              commitModifier();
              customInput.blur();
          }
      });

      inputWrapper.appendChild(customInput);
      inputWrapper.appendChild(rotatingPlaceholder);
      customWrapper.appendChild(customLabel);
      customWrapper.appendChild(inputWrapper);
      zoomContent.appendChild(customWrapper);

      // Hide placeholder if input already has value (restored from state)
      if (customInput.value.trim()) {
          rotatingPlaceholder.classList.add('hidden');
      }

      frontFace.appendChild(zoomContent);
  }

  // STATE 3: Open zoomed view for archetype cards
  // The SAME card element scales and translates to viewport center
  // NO modal, NO popup, NO duplicate DOM
  function openArchetypeOverlay(archetypeId) {
      const card = document.querySelector(`#archetypeCardGrid .sb-card[data-archetype="${archetypeId}"]`);
      const arch = ARCHETYPES[archetypeId];
      if (!card || !arch) return;

      // Close any currently zoomed card
      if (currentOpenCard) {
          closeZoomedCard();
      }

      currentOpenCard = card;

      // Dim all other archetype cards
      document.querySelectorAll('#archetypeCardGrid .sb-card').forEach(c => {
          if (c !== card) c.classList.add('dimmed');
      });

      // Populate modifier selection content
      populateArchetypeZoomContent(card, archetypeId);

      // Calculate transform to center the card
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;

      // Calculate translation needed to center the card
      const translateX = viewportCenterX - cardCenterX;
      const translateY = viewportCenterY - cardCenterY;

      // Scale factor (reduced ~20%)
      const scale = 2.5;

      // Apply zoom transform to the SAME card element
      card.classList.add('zoomed');
      card.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

      // Show backdrop
      if (zoomBackdrop) {
          zoomBackdrop.classList.add('active');
      }
  }

  // Close archetype zoom - returns to STATE 2 (face-up in grid)
  function closeArchetypeOverlay() {
      closeZoomedCard();
  }

  function bindArchetypeHandlers() {
      // No longer needed - archetype zoom uses the unified zoom system
      // Backdrop click is handled by the global backdrop listener
  }

  function updateArchetypeCardStates() {
      document.querySelectorAll('#archetypeCardGrid .sb-card').forEach(card => {
          const id = card.dataset.archetype;
          const isSelected = state.archetype.primary === id;
          card.classList.toggle('selected', isSelected);
          card.classList.toggle('flipped', isSelected); // Selected cards stay flipped
      });
  }

  function updateArchetypeSelectionSummary() {
      const primaryName = document.getElementById('selectedPrimaryName');
      const modifierName = document.getElementById('selectedModifierName');

      if (primaryName) {
          const primary = state.archetype.primary ? ARCHETYPES[state.archetype.primary] : null;
          primaryName.textContent = primary ? primary.name : 'None';
      }
      if (modifierName) {
          const modifier = state.archetype.modifier ? ARCHETYPES[state.archetype.modifier] : null;
          modifierName.textContent = modifier ? modifier.name : 'None';
      }
  }

  // Legacy function stubs for compatibility
  function renderArchetypePills() { renderArchetypeCards(); }
  function updateArchetypePillStates() { updateArchetypeCardStates(); }

  function updateArchetypePreview() {
      // Now handled by overlay and selection summary - keeping for compatibility
      updateArchetypeSelectionSummary();
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

    // Start loading bar sparkles
    startOverlayLoadingSparkles();

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

    // Stop overlay sparkles
    stopOverlayLoadingSparkles();
  }

  // ============================================================
  // OVERLAY LOADING BAR SPARKLES (Story + Visualize ONLY)
  // SEPARATE from cover bar sparkles — do NOT modify cover system
  // ============================================================
  let _overlaySparkleInterval = null;

  function spawnOverlayLoadingSparkle(container) {
      if (!container) return;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      if (containerWidth === 0) return;

      const sparkle = document.createElement('div');
      sparkle.className = 'overlay-loading-sparkle';

      // Random X position along the bar
      const spawnX = Math.random() * containerWidth;
      // Slight vertical variance above/below centerline
      const spawnY = (Math.random() - 0.5) * 20 - 8;

      // Curved arc motion — upward drift with lateral sway
      const baseAngle = -60 - Math.random() * 60; // -60° to -120° (upward arc)
      const angleRad = baseAngle * (Math.PI / 180);
      const distance = 25 + Math.random() * 45;
      const dx = Math.cos(angleRad) * distance * (Math.random() > 0.5 ? 1 : -1);
      const dy = Math.sin(angleRad) * distance - 15 - Math.random() * 20; // Strong upward bias

      // Lateral sway for organic feel
      const sway = (Math.random() - 0.5) * 18;

      // Rotation for visual interest
      const rotation = (Math.random() - 0.5) * 40;

      // Variable size (2-5px)
      const size = 2 + Math.random() * 3;

      // Randomized lifetime (1.2s - 3.5s)
      const duration = 1200 + Math.random() * 2300;

      // Variable opacity (0.6 - 0.95)
      const opacity = 0.6 + Math.random() * 0.35;

      // Randomized easing
      const easings = ['ease-in-out', 'ease-out', 'cubic-bezier(0.4, 0, 0.2, 1)', 'cubic-bezier(0.25, 0.1, 0.25, 1)'];
      const easing = easings[Math.floor(Math.random() * easings.length)];

      sparkle.style.cssText = `
          left: ${spawnX}px;
          top: ${spawnY}px;
          width: ${size}px;
          height: ${size}px;
          --ols-duration: ${duration}ms;
          --ols-opacity: ${opacity};
          --ols-dx: ${dx}px;
          --ols-dy: ${dy}px;
          --ols-sway: ${sway}px;
          --ols-rot: ${rotation}deg;
          --ols-easing: ${easing};
      `;

      container.appendChild(sparkle);
      setTimeout(() => { if (sparkle.parentNode) sparkle.remove(); }, duration + 100);
  }

  function startOverlayLoadingSparkles() {
      stopOverlayLoadingSparkles();

      const loadingBar = document.getElementById('loadingOverlayBar');
      if (!loadingBar) return;

      // Ensure container is positioned for absolute children
      const style = window.getComputedStyle(loadingBar);
      if (style.position === 'static') {
          loadingBar.style.position = 'relative';
      }
      loadingBar.style.overflow = 'visible';
      loadingBar.classList.add('sparkle-active');

      // Higher density: spawn at staggered intervals (8-16 concurrent)
      _overlaySparkleInterval = setInterval(() => {
          spawnOverlayLoadingSparkle(loadingBar);
      }, 140); // ~7 sparkles per second

      // Initial burst — staggered for natural appearance
      for (let i = 0; i < 8; i++) {
          setTimeout(() => spawnOverlayLoadingSparkle(loadingBar), i * 60);
      }
  }

  function stopOverlayLoadingSparkles() {
      if (_overlaySparkleInterval) {
          clearInterval(_overlaySparkleInterval);
          _overlaySparkleInterval = null;
      }

      const loadingBar = document.getElementById('loadingOverlayBar');
      if (loadingBar) {
          loadingBar.classList.remove('sparkle-active');
      }

      // Fade out existing sparkles gracefully
      document.querySelectorAll('.overlay-loading-sparkle').forEach(s => {
          s.style.opacity = '0';
          s.style.transition = 'opacity 0.4s ease-out';
          setTimeout(() => s.remove(), 450);
      });
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
    // AUTH GATE: Only persist to storage when logged in
    if (isLoggedIn()) {
        localStorage.setItem('sb_subscribed', '1');
        console.log('[ENTITLEMENT] Subscription stored in localStorage');
    }

    // Complete purchase - will resolve access from localStorage
    completePurchase();
  });

  $('payGodMode')?.addEventListener('click', () => {
      // AUTH GATE: Only persist to storage when logged in
      if (isLoggedIn()) {
          localStorage.setItem('sb_god_mode_owned', '1');
      }
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

  $('btnCommitQuill')?.addEventListener('click', async (e) => {
      e.preventDefault(); // Prevent scroll to top
      e.stopPropagation();

      // Save scroll position before any DOM changes
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (!getQuillReady()) return;
      const quillEl = document.getElementById('quillInput');
      if (!quillEl) return;
      const rawQuillText = quillEl.value.trim();
      if (!rawQuillText) { showToast("No Quill edit to commit."); return; }

      // RUNTIME NORMALIZATION: Quill input flows through ChatGPT normalization layer
      const quillNorm = await callNormalizationLayer({
          axis: 'quill',
          user_text: rawQuillText,
          context_signals: state.picks?.world || []
      });
      const quillText = quillNorm.canonical_instruction || quillNorm.normalized_text || rawQuillText;

      // Also apply any pending veto constraints
      await applyVetoFromInput();

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
  // TASK E: Store EXACT phrase, not normalized kernel
  $('btnCommitVeto')?.addEventListener('click', async () => {
      const vetoEl = document.getElementById('vetoInput');
      if (!vetoEl) return;
      const vetoText = vetoEl.value.trim();
      if (!vetoText) { showToast("No veto to commit."); return; }

      // TASK E: Store exact user phrase for display, normalize internally for rules
      const lines = vetoText.split('\n').filter(l => l.trim());
      for (const line of lines) {
          const rawPhrase = line.trim();
          // Store the EXACT phrase user entered (not normalized)
          if (!state.committedVeto.includes(rawPhrase)) {
              state.committedVeto.push(rawPhrase);
          }
      }
      renderCommittedPhrases('veto');

      await applyVetoFromInput();
      vetoEl.value = '';
      saveStorySnapshot();
      showToast(`Excluded: "${vetoText}"`);
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

      // Skip validation if Fate triggered (all values are pre-set correctly)
      if (state._fateTriggered) {
          return errors;
      }

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

  // ========================================
  // LET FATE DECIDE - Auto-selection System
  // ========================================

  // Weighted random selection helper
  function weightedSelect(options, weights) {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < options.length; i++) {
      random -= weights[i];
      if (random <= 0) return options[i];
    }
    return options[options.length - 1];
  }

  // Name lists for fate-generated names (IP-safe, non-famous)
  const FATE_FEMALE_NAMES = [
    'Elara Vance', 'Cassandra Wells', 'Mira Thornwood', 'Vivian Blake', 'Cordelia Hart',
    'Aurelia Stone', 'Seraphina Cole', 'Isadora Crane', 'Helena Frost', 'Rosalind Grey',
    'Celestine Moore', 'Evangeline Price', 'Lydia Sterling', 'Ophelia Dane', 'Tatiana West'
  ];

  const FATE_MALE_NAMES = [
    'Sebastian Blackwood', 'Julian Ashford', 'Marcus Thorne', 'Alexander Crane', 'Dominic Vale',
    'Lucian Grey', 'Theodore Sterling', 'Maximilian Drake', 'Gabriel Frost', 'Benedict Hale',
    'Damien Cross', 'Vincent Ashmore', 'Nathaniel Wolfe', 'Adrian Sinclair', 'Dorian Vance'
  ];

  // Module-level world flavors for fate selection (mirrors WORLD_SUB_OPTIONS structure)
  const FATE_WORLD_FLAVORS = {
    Modern: [
      { val: 'small_town' }, { val: 'college' }, { val: 'friends' },
      { val: 'old_money' }, { val: 'office' }
    ],
    Historical: [
      { val: 'medieval' }, { val: 'victorian' }, { val: 'renaissance' },
      { val: 'classical' }, { val: '20th_century' }
    ],
    Fantasy: [
      { val: 'enchanted_realms' }, { val: 'hidden_magic' }, { val: 'cursed_worlds' }
    ],
    SciFi: [
      { val: 'galactic_civilizations' }, { val: 'cyberpunk' }, { val: 'future_of_science' }
    ]
  };

  // Get entitlement-aware intensity selection
  function getFateIntensity() {
    // Prefer Erotic if entitled, else Naughty. Never Dirty.
    if (state.access === 'sub' || state.access === 'pass') {
      return 'Erotic';
    }
    return 'Naughty';
  }

  // Get entitlement-aware story length selection
  function getFateStoryLength() {
    // Prefer Affair/Soulmates if sub, else Fling if pass, else Voyeur
    if (state.access === 'sub') {
      // Weighted: prefer Affair (50%), Soulmates (50%)
      return Math.random() < 0.5 ? 'affair' : 'soulmates';
    } else if (state.access === 'pass') {
      return 'fling';
    }
    return 'voyeur';
  }

  // Get weighted world selection
  function getFateWorld() {
    // Prefer Modern > Historical > Fantasy > Sci-Fi
    const worlds = ['Modern', 'Historical', 'Fantasy', 'SciFi'];
    const weights = [40, 30, 20, 10]; // Heavy preference for Modern
    return weightedSelect(worlds, weights);
  }

  // Get weighted flavor for selected world
  function getFateFlavor(world) {
    if (typeof FATE_WORLD_FLAVORS === 'undefined' || !FATE_WORLD_FLAVORS) return null;
    const flavors = FATE_WORLD_FLAVORS[world];
    if (!flavors || flavors.length === 0) return null;
    // Bias toward first (broader) options
    const weights = flavors.map((_, i) => Math.max(10 - i * 2, 1));
    const selected = weightedSelect(flavors, weights);
    return selected.val;
  }

  // Get weighted tone selection
  function getFateTone() {
    // Prefer Earnest, WryConfession, Poetic
    const tones = ['Earnest', 'WryConfession', 'Poetic', 'Mythic', 'Comedic'];
    const weights = [40, 30, 20, 5, 5];
    return weightedSelect(tones, weights);
  }

  // Get weighted genre selection (context-aware for Modern)
  function getFateGenre(world) {
    if (world === 'Modern') {
      // Prefer Billionaire, SmallTown, FamousNotorious, CollegeEarlyCareer for Modern
      // Note: Some of these may be World flavors, using available genres
      const genres = ['Billionaire', 'Noir', 'Political', 'Heist'];
      const weights = [50, 20, 15, 15];
      return weightedSelect(genres, weights);
    }
    // Default genres for other worlds
    const genres = ['Billionaire', 'CrimeSyndicate', 'Espionage', 'Political'];
    const weights = [40, 25, 20, 15];
    return weightedSelect(genres, weights);
  }

  // Get weighted dynamic selection
  function getFateDynamic() {
    // Prefer Friends to Lovers, Forbidden Love, Fated
    const dynamics = ['Friends', 'Forbidden', 'Fated', 'Enemies', 'SecondChance'];
    const weights = [35, 30, 25, 5, 5];
    return weightedSelect(dynamics, weights);
  }

  // Get POV selection (prefer 1st person)
  function getFatePOV() {
    // Prefer First (1st person "I"), fall back if needed
    return 'First';
  }

  // Get weighted archetype selection (canonical 7)
  function getFateArchetype() {
    // Weighted toward emotionally accessible archetypes for default romance experience
    // Legacy mapping: ROMANTIC→OPEN_VEIN, DEVOTED→ETERNAL_FLAME,
    //   ENCHANTING→SPELLBINDER, GUARDIAN→HEART_WARDEN
    const archetypes = ['OPEN_VEIN', 'ETERNAL_FLAME', 'SPELLBINDER', 'HEART_WARDEN', 'ARMORED_FOX'];
    const weights = [30, 25, 20, 15, 10];
    return weightedSelect(archetypes, weights);
  }

  // PASS 9D: Generate fate ages with 95% within ±10 years, 5% edge cases
  function getFateAges() {
    // Base age for player character (22-35 typical range)
    const playerAge = 22 + Math.floor(Math.random() * 14); // 22-35

    // 95% of the time: partner age within ±10 years
    // 5% of the time: allow larger gaps (edge cases)
    const isEdgeCase = Math.random() < 0.05;

    let partnerAge;
    if (isEdgeCase) {
      // Edge case: wider range (18-60)
      partnerAge = 18 + Math.floor(Math.random() * 43);
    } else {
      // Normal case: within ±10 years of player, clamped to 18-60
      const offset = Math.floor(Math.random() * 21) - 10; // -10 to +10
      partnerAge = Math.max(18, Math.min(60, playerAge + offset));
    }

    return { playerAge, partnerAge };
  }

  // =================================================================
  // GUIDED FATE CHOREOGRAPHY ENGINE (AUTHORITATIVE)
  // Controls tempo, direction, and order of Fate's reveal.
  // ONE DIRECTION (down), ONE SECTION AT A TIME, HUMAN PACE
  // =================================================================

  // Fate override flag - when true, all automated motion stops
  let _fateOverridden = false;
  let _fateRunning = false;
  let _guidedFateVisualsActive = false;

  // DSP clause reveal tracking — non-null only during Guided Fate ceremony
  let _revealedDSPAxes = null;

  function revealDSPClause(axis) {
    if (!_revealedDSPAxes) return;
    _revealedDSPAxes.add(axis);
    const synopsisText = document.getElementById('synopsisText');
    if (!synopsisText) return;

    // SPARSE RENDERING: Regenerate sentence with only revealed axes
    // NO pending clauses, NO greyed text — just the revealed portions
    const result = generateDSPSentence();
    if (result.success) {
      const newHtml = result.html;

      // GUARD: Do not clear DSP if result is empty (world not yet revealed)
      // Keep placeholder or previous content until we have actual sentence content
      if (!newHtml || newHtml.trim() === '') return;

      // Increment activation for Guided Fate reveals
      incrementDSPActivation();

      // Only update DOM if content changed
      if (synopsisText._lastDSP !== newHtml) {
        synopsisText._lastDSP = newHtml;
        synopsisText.innerHTML = newHtml;

        // Brief golden glow on the newly revealed clause
        synopsisText.querySelectorAll('.dsp-clause[data-axis="' + axis + '"]').forEach(span => {
          span.classList.add('dsp-glow');
          setTimeout(() => span.classList.remove('dsp-glow'), 550);
        });
      }
    }
  }

  // Timing constants (HUMAN PACE - deliberate, not efficient)
  const FATE_TIMING = {
    SCROLL_SETTLE: 500,      // 400-600ms after scroll
    CARD_FLIP: 350,          // 300-400ms card flip animation
    TYPING_PER_CHAR: 65,     // 50-80ms per character
    SECTION_PAUSE: 700,      // 500-800ms between sections
    HIGHLIGHT_SETTLE: 400,   // Time before clearing highlight
    // MINIMUM TIMING GUARANTEES (authoritative)
    MIN_NAMES_CEREMONY: 5000,   // Names ceremony must be ≥5 seconds
    MIN_ARCHETYPE_REVEAL: 4000, // Archetype section must be ≥4 seconds
    MIN_INTENSITY_REVEAL: 4000  // Intensity section must be ≥4 seconds
  };

  // =================================================================
  // FAIRY DUST PARTICLE SYSTEM
  // Sparse, ethereal gold specks during Guided Fate ceremony
  // =================================================================

  let _dustInterval = null;
  let _sparkleIntervals = [];
  let _ambientCardInterval = null;
  let _anchoredParticles = []; // Track particles with owner elements for scroll sync
  let _sparkleScrollListener = null;
  let _sparkleInitialScrollY = 0;
  const DUST_CONFIG = {
    MAX_PARTICLES: 350,       // Dense vignette sparkles (3× visibility)
    SPAWN_INTERVAL: 15,       // Fast spawn for density
    MIN_SIZE: 3,              // Small, delicate
    MAX_SIZE: 9,
    MIN_DURATION: 5000,       // Long gentle drift
    MAX_DURATION: 10000,
    MIN_OPACITY: 0.5,         // Clearly visible
    MAX_OPACITY: 0.9
  };

  // Anchored particle position sync — scroll-offset tracking (no per-tick getBoundingClientRect)
  function registerAnchoredParticle(particle, ownerEl, relX, relY, initialLeft, initialTop) {
    // Store initial positions and scroll offset
    const entry = {
      particle,
      ownerEl,
      relX,
      relY,
      initialLeft,
      initialTop,
      initialScrollY: window.scrollY
    };
    _anchoredParticles.push(entry);
    if (!_sparkleScrollListener) startSparkleScrollSync();
  }

  function startSparkleScrollSync() {
    _sparkleInitialScrollY = window.scrollY;
    _sparkleScrollListener = function() {
      // Prune dead particles
      _anchoredParticles = _anchoredParticles.filter(p => p.particle.parentNode && p.ownerEl.offsetParent);
      if (_anchoredParticles.length === 0) {
        stopSparkleScrollSync();
        return;
      }
      // Update positions using scroll delta (no getBoundingClientRect)
      for (const p of _anchoredParticles) {
        const scrollDelta = window.scrollY - p.initialScrollY;
        p.particle.style.top = (p.initialTop + p.relY - scrollDelta) + 'px';
        // X remains unchanged (no horizontal scroll tracking needed)
      }
    };
    window.addEventListener('scroll', _sparkleScrollListener, { passive: true });
  }

  function stopSparkleScrollSync() {
    if (_sparkleScrollListener) {
      window.removeEventListener('scroll', _sparkleScrollListener);
      _sparkleScrollListener = null;
    }
    _anchoredParticles = [];
  }

  // Global overlay for anchored sparkles (fixed positioning, updated per-frame)
  function getSparkleOverlay() {
    let overlay = document.getElementById('sparkleAnchorOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sparkleAnchorOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4001;overflow:visible;';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  // DEV ASSERTION: Fate card sparkles must be DOM descendants of the Fate card
  // Validates invariant: sparkles appended to .fate-destiny-card subtree only
  function assertFateSparkleOwnership(particle, tag) {
    if (!particle) return;
    const fateCard = particle.closest('.fate-destiny-card');
    if (!fateCard) {
      console.error('[DEV] INVARIANT VIOLATION: Fate sparkle (tag=' + tag + ') is not a DOM descendant of .fate-destiny-card. Parent:', particle.parentElement);
    }
  }

  function spawnDustParticle() {
    if (!_guidedFateVisualsActive) return;

    // Limit particle count (vignette particles only — tag 'vignette')
    const existing = document.querySelectorAll('.fate-dust-particle[data-sparkle-tag="vignette"]');
    if (existing.length >= DUST_CONFIG.MAX_PARTICLES) return;

    const particle = document.createElement('div');
    particle.className = 'fate-dust-particle fate-dust-particle--viewport';
    particle.dataset.sparkleTag = 'vignette';

    // Viewport-based positioning weighted toward vignette edges
    const edge = Math.random();
    let x, y;
    if (edge < 0.35) {
      x = Math.random() * 15;
      y = 5 + Math.random() * 90;
    } else if (edge < 0.65) {
      x = 85 + Math.random() * 15;
      y = 5 + Math.random() * 90;
    } else if (edge < 0.80) {
      x = 5 + Math.random() * 90;
      y = 80 + Math.random() * 18;
    } else if (edge < 0.90) {
      x = 10 + Math.random() * 80;
      y = Math.random() * 15;
    } else {
      x = 25 + Math.random() * 50;
      y = 25 + Math.random() * 50;
    }

    // Randomize properties
    const size = DUST_CONFIG.MIN_SIZE + Math.random() * (DUST_CONFIG.MAX_SIZE - DUST_CONFIG.MIN_SIZE);
    const duration = DUST_CONFIG.MIN_DURATION + Math.random() * (DUST_CONFIG.MAX_DURATION - DUST_CONFIG.MIN_DURATION);
    const opacity = DUST_CONFIG.MIN_OPACITY + Math.random() * (DUST_CONFIG.MAX_OPACITY - DUST_CONFIG.MIN_OPACITY);

    // Slow, gentle drift with slight swirl
    const baseAngle = Math.random() * Math.PI * 2;
    const driftDistance = 20 + Math.random() * 40;
    const dx = Math.cos(baseAngle) * driftDistance;
    const dy = -30 - Math.random() * 50;

    particle.style.cssText = `
      left: ${x}vw;
      top: ${y}vh;
      width: ${size}px;
      height: ${size}px;
      --dust-duration: ${duration}ms;
      --dust-opacity: ${opacity};
      --dust-dx: ${dx}px;
      --dust-dy: ${dy}px;
    `;

    document.body.appendChild(particle);

    // Self-cleanup after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.remove();
      }
    }, duration + 100);
  }

  function startFairyDust() {
    stopFairyDust(); // Clear any existing
    _dustInterval = setInterval(spawnDustParticle, DUST_CONFIG.SPAWN_INTERVAL);
    // Gentle initial burst
    for (let i = 0; i < 15; i++) {
      setTimeout(spawnDustParticle, i * 20);
    }
  }

  function stopFairyDust() {
    if (_dustInterval) {
      clearInterval(_dustInterval);
      _dustInterval = null;
    }
    // Clear all sparkle intervals
    _sparkleIntervals.forEach(id => clearInterval(id));
    _sparkleIntervals = [];
    // Stop anchored particle tracking
    stopSparkleScrollSync();
    // Fade out existing particles gracefully
    document.querySelectorAll('.fate-dust-particle').forEach(p => {
      p.style.opacity = '0';
      p.style.transition = 'opacity 0.4s ease-out';
      setTimeout(() => p.remove(), 500);
    });
  }

  // Get or create sparkle anchor container inside an element
  // Container uses position: absolute with inset: 0 and overflow: visible
  // so sparkles can appear on the perimeter (outside element bounds)
  function getOrCreateSparkleContainer(element) {
    if (!element) return null;
    // Ensure parent is positioned so absolute children work correctly
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }
    // Check for existing container
    let container = element.querySelector(':scope > .sparkle-anchor-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'sparkle-anchor-container';
      element.appendChild(container);
    }
    return container;
  }

  // Ambient pre-click sparkle emitter for the Guided Fate card
  // Uses getBoundingClientRect for true scroll-synced positioning
  function spawnAmbientCardSparkle() {
    const fateCard = document.getElementById('fateDestinyCard');
    if (!fateCard || fateCard.dataset.fateUsed === 'true') return;
    if (!fateCard.offsetParent) return; // not visible

    const overlay = getSparkleOverlay();
    const existing = overlay.querySelectorAll('.fate-dust-particle[data-sparkle-owner="ambient-fateCard"]');
    if (existing.length >= 90) return;

    const rect = fateCard.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    const particle = document.createElement('div');
    particle.className = 'fate-dust-particle fate-dust-particle--anchored';
    particle.dataset.sparkleTag = 'ambient';
    particle.dataset.sparkleOwner = 'ambient-fateCard';

    // Spawn on outer perimeter ±14-22px outside card edges (element-relative)
    const side = Math.random();
    const offset = 14 + Math.random() * 8;
    let relX, relY;
    if (side < 0.25) { relX = Math.random() * width; relY = -offset; }
    else if (side < 0.5) { relX = Math.random() * width; relY = height + offset; }
    else if (side < 0.75) { relX = -offset; relY = Math.random() * height; }
    else { relX = width + offset; relY = Math.random() * height; }

    const size = 2 + Math.random() * 5;
    const duration = 3000 + Math.random() * 4000;
    const opacity = 0.5 + Math.random() * 0.4;

    // Slow orbit / drift outward from element center
    const cx = width / 2;
    const cy = height / 2;
    const outAngle = Math.atan2(relY - cy, relX - cx);
    const dx = Math.cos(outAngle) * (10 + Math.random() * 20);
    const dy = Math.sin(outAngle) * (10 + Math.random() * 20) - 10;

    particle.style.cssText = `
      position: fixed;
      left: ${rect.left + relX}px; top: ${rect.top + relY}px;
      width: ${size}px; height: ${size}px;
      --dust-duration: ${duration}ms;
      --dust-opacity: ${opacity};
      --dust-dx: ${dx}px; --dust-dy: ${dy}px;
    `;
    overlay.appendChild(particle);
    registerAnchoredParticle(particle, fateCard, relX, relY, rect.left, rect.top);
    setTimeout(() => { if (particle.parentNode) particle.remove(); }, duration + 100);
  }

  function startAmbientCardSparkles() {
    stopAmbientCardSparkles();
    _ambientCardInterval = setInterval(spawnAmbientCardSparkle, 40);
    // Immediate burst
    for (let i = 0; i < 20; i++) {
      setTimeout(spawnAmbientCardSparkle, i * 20);
    }
  }

  function stopAmbientCardSparkles() {
    if (_ambientCardInterval) {
      clearInterval(_ambientCardInterval);
      _ambientCardInterval = null;
    }
    document.querySelectorAll('.fate-dust-particle[data-sparkle-tag="ambient"]').forEach(p => {
      p.style.opacity = '0';
      p.style.transition = 'opacity 0.4s ease-out';
      setTimeout(() => p.remove(), 500);
    });
  }

  // Anchor-aware sparkle spawner — particles track owner element via rAF
  // Uses getBoundingClientRect for true scroll-synced positioning
  function startFateEdgeSparkles({ anchorEl, anchorRect, maxParticles, spawnInterval, tag }) {
    if (!anchorEl) return;
    maxParticles = maxParticles || DUST_CONFIG.MAX_PARTICLES;
    spawnInterval = spawnInterval || DUST_CONFIG.SPAWN_INTERVAL;
    tag = tag || 'card';

    const overlay = getSparkleOverlay();

    const checkWidth = anchorEl.offsetWidth;
    const checkHeight = anchorEl.offsetHeight;
    if (checkWidth === 0 || checkHeight === 0) {
      console.warn('[DEV] startFateEdgeSparkles: anchor has zero dimensions — aborting');
      return;
    }

    function spawn() {
      if (!_guidedFateVisualsActive) return;
      if (!anchorEl.offsetParent) return; // owner removed from DOM

      const existing = overlay.querySelectorAll('.fate-dust-particle[data-sparkle-owner="' + tag + '-' + (anchorEl.id || 'anon') + '"]');
      if (existing.length >= maxParticles) return;

      const rect = anchorEl.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width === 0 || height === 0) return;

      const particle = document.createElement('div');
      particle.className = 'fate-dust-particle fate-dust-particle--anchored';
      particle.dataset.sparkleTag = tag;
      particle.dataset.sparkleOwner = tag + '-' + (anchorEl.id || 'anon');

      // Spawn on outer perimeter — offset ±12-20px outside element edges (element-relative)
      const OFFSET_MIN = 12;
      const OFFSET_MAX = 20;
      const perimeterSide = Math.random();
      let relX, relY;
      const offset = OFFSET_MIN + Math.random() * (OFFSET_MAX - OFFSET_MIN);
      if (perimeterSide < 0.25) {
        // Top edge
        relX = Math.random() * width;
        relY = -offset;
      } else if (perimeterSide < 0.5) {
        // Bottom edge
        relX = Math.random() * width;
        relY = height + offset;
      } else if (perimeterSide < 0.75) {
        // Left edge
        relX = -offset;
        relY = Math.random() * height;
      } else {
        // Right edge
        relX = width + offset;
        relY = Math.random() * height;
      }

      const size = DUST_CONFIG.MIN_SIZE + Math.random() * (DUST_CONFIG.MAX_SIZE - DUST_CONFIG.MIN_SIZE);
      const duration = DUST_CONFIG.MIN_DURATION + Math.random() * (DUST_CONFIG.MAX_DURATION - DUST_CONFIG.MIN_DURATION);
      const opacity = DUST_CONFIG.MIN_OPACITY + Math.random() * (DUST_CONFIG.MAX_OPACITY - DUST_CONFIG.MIN_OPACITY);

      // Drift outward from element center
      const cx = width / 2;
      const cy = height / 2;
      const outAngle = Math.atan2(relY - cy, relX - cx);
      const driftDistance = 15 + Math.random() * 30;
      const dx = Math.cos(outAngle) * driftDistance;
      const dy = Math.sin(outAngle) * driftDistance - 15;

      particle.style.cssText = `
        position: fixed;
        left: ${rect.left + relX}px;
        top: ${rect.top + relY}px;
        width: ${size}px;
        height: ${size}px;
        --dust-duration: ${duration}ms;
        --dust-opacity: ${opacity};
        --dust-dx: ${dx}px;
        --dust-dy: ${dy}px;
      `;

      overlay.appendChild(particle);
      registerAnchoredParticle(particle, anchorEl, relX, relY, rect.left, rect.top);
      setTimeout(() => { if (particle.parentNode) particle.remove(); }, duration + 100);
    }

    const intervalId = setInterval(spawn, spawnInterval);
    _sparkleIntervals.push(intervalId);

    // Gentle initial burst
    const burstCount = Math.min(5, maxParticles);
    for (let i = 0; i < burstCount; i++) {
      setTimeout(spawn, i * 80);
    }
  }

  // Scroll handler for sparkle fade-out — prevents sparkles drifting from cards
  let _sparkleScrollHandler = null;
  let _sparkleScrollFading = false;
  let _isAutoScrolling = false;

  // Debounce timer for card/input sparkle reappearance (3000ms)
  let _sparkleReappearTimer = null;
  const SPARKLE_REAPPEAR_DELAY = 3000;

  // Dissipate card/input sparkles (NOT vignette) on scroll/resize
  function dissipateAnchoredSparkles() {
      // Stop all sparkle spawn intervals (prevents immediate respawn)
      _sparkleIntervals.forEach(id => clearInterval(id));
      _sparkleIntervals = [];
      // Fade out anchored sparkles (card + input)
      document.querySelectorAll('.fate-dust-particle--anchored').forEach(p => {
          p.style.transition = 'opacity 200ms ease-out';
          p.style.opacity = '0';
      });
      // Remove after fade
      setTimeout(() => {
          document.querySelectorAll('.fate-dust-particle--anchored').forEach(p => p.remove());
      }, 250);
      // Clear anchored particle tracking
      _anchoredParticles = [];
  }

  // Recreate card/input sparkles at current element positions
  // GUARD: Only called from debounce timer completion
  function recreateAnchoredSparkles() {
      if (!_guidedFateVisualsActive) return;

      // Recreate Fate Card sparkles
      const fateCard = document.getElementById('fateDestinyCard');
      if (fateCard && fateCard.offsetParent) {
          const cardRect = fateCard.getBoundingClientRect();
          if (cardRect.width > 0 && cardRect.height > 0) {
              startFateEdgeSparkles({ anchorEl: fateCard, anchorRect: cardRect, maxParticles: 120, spawnInterval: 25, tag: 'card' });
          }
      }

      // Recreate input sparkles
      const playerInput = document.getElementById('playerNameInput');
      const partnerInput = document.getElementById('partnerNameInput');
      if (playerInput && playerInput.offsetParent) {
          startFateEdgeSparkles({ anchorEl: playerInput, maxParticles: 9, spawnInterval: 270, tag: 'input' });
      }
      if (partnerInput && partnerInput.offsetParent) {
          startFateEdgeSparkles({ anchorEl: partnerInput, maxParticles: 9, spawnInterval: 270, tag: 'input' });
      }
  }

  // Shared scroll/resize handler — dissipate and debounce reappear
  function handleSparkleScrollResize() {
      // GUARD: Only during Guided Fate
      if (!_guidedFateVisualsActive) return;

      // Immediately dissipate card/input sparkles
      dissipateAnchoredSparkles();

      // Clear existing timer and restart 3000ms debounce
      if (_sparkleReappearTimer) {
          clearTimeout(_sparkleReappearTimer);
      }
      _sparkleReappearTimer = setTimeout(() => {
          _sparkleReappearTimer = null;
          recreateAnchoredSparkles();
      }, SPARKLE_REAPPEAR_DELAY);
  }

  function handleSparkleScroll() {
      // GUARD: Never teardown vignette during Guided Fate — ONLY on explicit exit
      if (_guidedFateVisualsActive || _sparkleScrollFading) return;
      _sparkleScrollFading = true;

      // Only fade out viewport-based (vignette) sparkles — anchored sparkles move with their parent
      document.querySelectorAll('.fate-dust-particle--viewport').forEach(p => {
          p.style.transition = 'opacity 250ms ease-out';
          p.style.opacity = '0';
      });

      // Stop vignette emitter only — anchored emitters keep running
      if (_dustInterval) {
          clearInterval(_dustInterval);
          _dustInterval = null;
      }

      // Cleanup viewport particles after fade completes
      setTimeout(() => {
          document.querySelectorAll('.fate-dust-particle--viewport').forEach(p => p.remove());
      }, 300);
  }

  // Activate Guided Fate visuals — requires actual Guided Fate card DOM node
  function activateGuidedFateVisuals(fateCardElement) {
      if (!fateCardElement) return;
      _guidedFateVisualsActive = true;
      _sparkleScrollFading = false;

      // Vignette
      const vignette = document.getElementById('fateVignette');
      if (vignette) vignette.classList.add('active');

      // Stop ambient pre-click sparkles — replaced by activated sparkles
      stopAmbientCardSparkles();

      // Global vignette sparkles (viewport-based, coexist with anchored)
      startFairyDust();

      // Card glow
      fateCardElement.classList.add('fate-activating');

      // Anchored sparkles from Guided Fate card outer perimeter (intensified)
      const anchorRect = fateCardElement.getBoundingClientRect();
      if (anchorRect.width === 0 || anchorRect.height === 0) {
          console.warn('[DEV] Guided Fate card has zero rect — sparkles aborted');
      } else {
          startFateEdgeSparkles({ anchorEl: fateCardElement, anchorRect: anchorRect, maxParticles: 120, spawnInterval: 25, tag: 'card' });
      }

      // Say/Do input glow + secondary low-density sparkles (3 particles max shared)
      const playerInput = document.getElementById('playerNameInput');
      const partnerInput = document.getElementById('partnerNameInput');
      if (playerInput) {
          playerInput.classList.add('guided-fate-glow');
          startFateEdgeSparkles({ anchorEl: playerInput, maxParticles: 9, spawnInterval: 270, tag: 'input' });
      }
      if (partnerInput) {
          partnerInput.classList.add('guided-fate-glow');
          startFateEdgeSparkles({ anchorEl: partnerInput, maxParticles: 9, spawnInterval: 270, tag: 'input' });
      }

      // SCROLL FADE-OUT: Add scroll listener to fade sparkles on scroll
      if (_sparkleScrollHandler) {
          window.removeEventListener('scroll', _sparkleScrollHandler, true);
      }
      _sparkleScrollHandler = handleSparkleScroll;
      window.addEventListener('scroll', _sparkleScrollHandler, true); // capture phase for all scrollable containers

      // DISSIPATE-AND-REAPPEAR: Add listeners for card/input sparkle repositioning
      window.addEventListener('scroll', handleSparkleScrollResize, { passive: true });
      window.addEventListener('resize', handleSparkleScrollResize, { passive: true });
  }

  // Deactivate Guided Fate visuals — idempotent, no guards
  function deactivateGuidedFateVisuals() {
      _guidedFateVisualsActive = false;
      _sparkleScrollFading = false;

      // Remove scroll listener
      if (_sparkleScrollHandler) {
          window.removeEventListener('scroll', _sparkleScrollHandler, true);
          _sparkleScrollHandler = null;
      }

      // Remove dissipate-and-reappear listeners
      window.removeEventListener('scroll', handleSparkleScrollResize);
      window.removeEventListener('resize', handleSparkleScrollResize);
      if (_sparkleReappearTimer) {
          clearTimeout(_sparkleReappearTimer);
          _sparkleReappearTimer = null;
      }

      // Clear all sparkle intervals and DOM particles
      stopFairyDust();

      // Shut off vignette
      const vignette = document.getElementById('fateVignette');
      if (vignette) {
          vignette.style.opacity = '';
          vignette.classList.remove('active');
          vignette.classList.add('fading');
          setTimeout(() => vignette.classList.remove('fading'), 1600);
      }

      // Remove glow from Guided Fate card
      const fateCard = document.getElementById('fateDestinyCard');
      if (fateCard) fateCard.classList.remove('fate-activating');

      // Remove golden echo from downstream inputs
      document.querySelectorAll('.guided-fate-glow').forEach(el => el.classList.remove('guided-fate-glow'));
  }

  // In-story selection aura — reusable golden glow + low-density sparkles
  let _auraSparkleIntervals = [];

  function applySelectionAura(el) {
      if (!el) return;
      el.classList.add('selection-aura');
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (width === 0 || height === 0) return;

      const overlay = getSparkleOverlay();
      const ownerId = 'aura-' + (el.id || Math.random().toString(36).slice(2, 8));

      // Low-density sparkles from element perimeter (element-relative)
      const OFFSET_MIN = 8;
      const OFFSET_MAX = 14;
      function spawnAuraSparkle() {
          if (!el.offsetParent) return; // owner removed
          const existing = overlay.querySelectorAll('.fate-dust-particle[data-sparkle-owner="' + ownerId + '"]');
          if (existing.length >= 4) return;

          const rect = el.getBoundingClientRect();
          const w = rect.width;
          const h = rect.height;
          if (w === 0 || h === 0) return;

          const particle = document.createElement('div');
          particle.className = 'fate-dust-particle fate-dust-particle--anchored';
          particle.dataset.sparkleTag = 'aura';
          particle.dataset.sparkleOwner = ownerId;

          const side = Math.random();
          const offset = OFFSET_MIN + Math.random() * (OFFSET_MAX - OFFSET_MIN);
          let relX, relY;
          if (side < 0.25) { relX = Math.random() * w; relY = -offset; }
          else if (side < 0.5) { relX = Math.random() * w; relY = h + offset; }
          else if (side < 0.75) { relX = -offset; relY = Math.random() * h; }
          else { relX = w + offset; relY = Math.random() * h; }

          const size = 2 + Math.random() * 4;
          const duration = 3000 + Math.random() * 3000;
          const opacity = 0.15 + Math.random() * 0.3;
          const cx = w / 2;
          const cy = h / 2;
          const angle = Math.atan2(relY - cy, relX - cx);
          const dx = Math.cos(angle) * (10 + Math.random() * 15);
          const dy = Math.sin(angle) * (10 + Math.random() * 15) - 10;

          particle.style.cssText = `
            position: fixed;
            left: ${rect.left + relX}px; top: ${rect.top + relY}px;
            width: ${size}px; height: ${size}px;
            --dust-duration: ${duration}ms;
            --dust-opacity: ${opacity};
            --dust-dx: ${dx}px; --dust-dy: ${dy}px;
          `;
          overlay.appendChild(particle);
          registerAnchoredParticle(particle, el, relX, relY, rect.left, rect.top);
          setTimeout(() => { if (particle.parentNode) particle.remove(); }, duration + 100);
      }

      const intervalId = setInterval(spawnAuraSparkle, 900);
      _auraSparkleIntervals.push(intervalId);
      spawnAuraSparkle(); // immediate first particle
  }

  function removeSelectionAura(el) {
      if (el) el.classList.remove('selection-aura');
  }

  function removeAllSelectionAuras() {
      document.querySelectorAll('.selection-aura').forEach(el => el.classList.remove('selection-aura'));
      _auraSparkleIntervals.forEach(id => clearInterval(id));
      _auraSparkleIntervals = [];
      document.querySelectorAll('.fate-dust-particle[data-sparkle-tag="aura"]').forEach(p => {
          p.style.opacity = '0';
          p.style.transition = 'opacity 0.3s ease-out';
          setTimeout(() => p.remove(), 400);
      });
  }

  // Expose for fatecards.js
  window.applySelectionAura = applySelectionAura;
  window.removeSelectionAura = removeSelectionAura;
  window.removeAllSelectionAuras = removeAllSelectionAuras;

  function cleanupFateVisuals() {
    // Stop fate running state
    _fateOverridden = true;
    _fateRunning = false;
    _dspGuidedFateActive = false;

    // Clear DSP pending state — reveal all clauses immediately on override
    _revealedDSPAxes = null;
    const synopsisText = document.getElementById('synopsisText');
    if (synopsisText) {
      synopsisText.querySelectorAll('.dsp-pending').forEach(span => {
        span.classList.remove('dsp-pending');
      });
    }

    // Stop fairy dust
    stopFairyDust();

    // Remove golden vignette
    const vignette = document.getElementById('fateVignette');
    if (vignette) {
      vignette.style.opacity = ''; // BUGFIX: Clear inline opacity set during ceremony BEFORE fading
      vignette.classList.remove('active');
      vignette.classList.add('fading');
      // Fully hide after fade animation completes
      setTimeout(() => {
        vignette.classList.remove('fading');
      }, 500);
    }

    // Clear all fate highlights
    document.querySelectorAll('.fate-active').forEach(el => el.classList.remove('fate-active'));
    document.querySelectorAll('.fate-typing').forEach(el => el.classList.remove('fate-typing'));
    document.querySelectorAll('.fate-ceremony').forEach(el => el.classList.remove('fate-ceremony'));
  }

  // Override handler - user takes control from Fate
  // Always deactivates Guided Fate visuals on any user interaction
  function handleFateOverride(event) {
    // Guard: do not self-cancel when the interaction originates from the Guided Fate card
    const fateCard = document.getElementById('fateDestinyCard');
    if (fateCard && fateCard.contains(event.target)) return;

    // Unconditional visual shutdown on any user action
    deactivateGuidedFateVisuals();

    if (_fateRunning && !_fateOverridden) {
      _fateOverridden = true;
      // Clear all fate highlights immediately
      document.querySelectorAll('.fate-active').forEach(el => el.classList.remove('fate-active'));
      document.querySelectorAll('.fate-typing').forEach(el => el.classList.remove('fate-typing'));
      document.querySelectorAll('.fate-ceremony').forEach(el => el.classList.remove('fate-ceremony'));

      // Stop fairy dust particles
      stopFairyDust();

      // Fade the golden vignette (pulse stops via CSS animation: none)
      const vignette = document.getElementById('fateVignette');
      if (vignette) {
        vignette.style.opacity = ''; // BUGFIX: Clear inline opacity set during ceremony
        vignette.classList.remove('active');
        vignette.classList.add('fading');
      }

      showToast('You take the reins from Fate.');
    }
  }

  // Setup override listeners
  function setupFateOverrideListeners() {
    const setupArea = document.getElementById('setup');
    if (!setupArea) return;

    // Listen for user interaction that indicates override
    const overrideEvents = ['click', 'keydown', 'input', 'change'];
    overrideEvents.forEach(evt => {
      setupArea.addEventListener(evt, handleFateOverride, { capture: true, passive: true });
    });

    // Scroll override (manual scroll detection)
    let lastScrollTop = window.scrollY;
    const scrollHandler = () => {
      if (_fateRunning && !_fateOverridden) {
        const currentScroll = window.scrollY;
        // If user scrolled up (against fate direction), override
        if (currentScroll < lastScrollTop - 50) {
          handleFateOverride();
        }
        lastScrollTop = currentScroll;
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  // Clear all fate highlights (ensure clean state before next section)
  function clearAllFateHighlights() {
    document.querySelectorAll('.fate-active').forEach(el => el.classList.remove('fate-active'));
  }

  // Helper: Scroll element into view (DOWNWARD ONLY - NEVER UPWARD)
  // AUTHORITATIVE: This constraint is absolute. No upward scrolling can occur.
  // Combined with visual Y-position sorting, guarantees strict top→bottom flow.
  function scrollToSectionDownward(el) {
    if (!el || _fateOverridden) return;

    const rect = el.getBoundingClientRect();
    const currentScroll = window.scrollY;
    const targetScroll = currentScroll + rect.top - 120; // 120px from top

    // ABSOLUTE CONSTRAINT: Only scroll if target is BELOW current position
    // If targetScroll <= currentScroll, NO SCROLL OCCURS (element already visible or above)
    if (targetScroll > currentScroll) {
      _isAutoScrolling = true;
      // Explicitly trigger sparkle dissipate before programmatic scroll
      if (typeof handleSparkleScrollResize === 'function') handleSparkleScrollResize();
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      setTimeout(() => { _isAutoScrolling = false; }, 600);
    }
  }

  // Helper: Type text letter-by-letter with gold glow effect (SLOWED)
  async function typeTextWithGlow(inputEl, text, delayPerChar = FATE_TIMING.TYPING_PER_CHAR) {
    if (!inputEl || !text || _fateOverridden) return;

    inputEl.value = '';
    inputEl.classList.add('fate-typing');
    inputEl.classList.remove('fate-typed');

    for (let i = 0; i < text.length; i++) {
      if (_fateOverridden) break; // Check override each character
      inputEl.value += text[i];
      await new Promise(r => setTimeout(r, delayPerChar));
    }

    // Settle the glow
    inputEl.classList.remove('fate-typing');
    if (!_fateOverridden) {
      inputEl.classList.add('fate-typed');
      setTimeout(() => inputEl.classList.remove('fate-typed'), 800);
    }
  }

  // Helper: Flip a card with reveal animation (SLOWED)
  async function flipCardForFate(cardEl) {
    if (!cardEl || _fateOverridden) return;

    cardEl.classList.add('fate-revealing');

    // Card flip animation
    await new Promise(r => setTimeout(r, FATE_TIMING.CARD_FLIP));
    if (_fateOverridden) return;

    cardEl.classList.add('selected', 'flipped');

    // Settle after flip
    await new Promise(r => setTimeout(r, FATE_TIMING.CARD_FLIP));
    cardEl.classList.remove('fate-revealing');
  }

  // Helper: Atomic section reveal for card grids
  // gridOrSelector can be a CSS selector string OR an element reference
  async function revealCardSection(gridOrSelector, value, sectionTitleEl) {
    if (_fateOverridden) return false;

    const grid = typeof gridOrSelector === 'string'
      ? document.querySelector(gridOrSelector)
      : gridOrSelector;
    if (!grid || !value) return false;

    // STEP 1: Clear previous highlights (one section at a time)
    clearAllFateHighlights();

    // STEP 2: Highlight this section
    if (sectionTitleEl) {
      sectionTitleEl.classList.add('fate-active');
    }

    // STEP 3: Scroll into view (downward only)
    scrollToSectionDownward(sectionTitleEl || grid);
    await new Promise(r => setTimeout(r, FATE_TIMING.SCROLL_SETTLE));
    if (_fateOverridden) return false;

    // STEP 4: Deselect existing cards
    grid.querySelectorAll('.sb-card.selected').forEach(c => {
      c.classList.remove('selected', 'flipped');
    });

    // STEP 5: Find and flip target card
    const targetCard = grid.querySelector(`.sb-card[data-val="${value}"]`);
    if (targetCard) {
      await flipCardForFate(targetCard);
    }

    // STEP 6: Settle, then clear highlight
    await new Promise(r => setTimeout(r, FATE_TIMING.HIGHLIGHT_SETTLE));
    if (sectionTitleEl) {
      sectionTitleEl.classList.remove('fate-active');
    }

    return !!targetCard;
  }

  // Helper: Atomic section reveal for archetype cards
  async function revealArchetypeSection(archetypeId) {
    if (_fateOverridden) return false;

    const grid = $('archetypeCardGrid');
    if (!grid || !archetypeId) return false;

    const sectionTitle = $('archetypeSectionTitle');

    // STEP 1: Clear previous highlights
    clearAllFateHighlights();

    // STEP 2: Highlight this section
    if (sectionTitle) {
      sectionTitle.classList.add('fate-active');
    }

    // STEP 3: Scroll into view (downward only)
    scrollToSectionDownward(sectionTitle || grid);
    await new Promise(r => setTimeout(r, FATE_TIMING.SCROLL_SETTLE));
    if (_fateOverridden) return false;

    // STEP 4: Deselect existing
    grid.querySelectorAll('.sb-card.selected').forEach(c => {
      c.classList.remove('selected', 'flipped');
    });

    // STEP 5: Find and flip target card
    const targetCard = grid.querySelector(`.sb-card[data-archetype="${archetypeId}"]`);
    if (targetCard) {
      await flipCardForFate(targetCard);
    }

    // STEP 6: Settle, then clear highlight
    await new Promise(r => setTimeout(r, FATE_TIMING.HIGHLIGHT_SETTLE));
    if (sectionTitle) {
      sectionTitle.classList.remove('fate-active');
    }

    return !!targetCard;
  }

  // Helper: Atomic section reveal for name fields
  async function revealNameSection(inputId, name, charBlockSelector) {
    if (_fateOverridden || !name) return;

    const inputEl = $(inputId);
    if (!inputEl) return;

    const charBlock = inputEl.closest('.character-block');
    const fieldContainer = inputEl.closest('.character-field');

    // STEP 1: Clear previous highlights
    clearAllFateHighlights();

    // STEP 2: Highlight this field
    if (fieldContainer) {
      fieldContainer.classList.add('fate-active');
    }

    // STEP 3: Scroll into view (downward only)
    scrollToSectionDownward(charBlock || fieldContainer);
    await new Promise(r => setTimeout(r, FATE_TIMING.SCROLL_SETTLE));
    if (_fateOverridden) return;

    // STEP 4: Type the name
    await typeTextWithGlow(inputEl, name);

    // STEP 5: Settle, then clear highlight
    await new Promise(r => setTimeout(r, FATE_TIMING.HIGHLIGHT_SETTLE));
    if (fieldContainer) {
      fieldContainer.classList.remove('fate-active');
    }
  }

  // Helper: Highlight Begin Story button (END STATE)
  function highlightBeginButton() {
    if (_fateOverridden) return;

    clearAllFateHighlights();

    const beginBtn = $('beginBtn');
    if (beginBtn) {
      beginBtn.classList.add('fate-ready');
      scrollToSectionDownward(beginBtn);

      // Remove highlight on click
      const removeHighlight = () => {
        beginBtn.classList.remove('fate-ready');
        beginBtn.removeEventListener('click', removeHighlight);
      };
      beginBtn.addEventListener('click', removeHighlight);
    }
  }

  // Main Guided Fate Choreography Engine
  // AUTHORITATIVE: DOM visual order, opening ceremony, downward-only
  async function runGuidedFateFill(fateChoices) {
    // Initialize override state
    _fateOverridden = false;
    _fateRunning = true;
    setupFateOverrideListeners();

    // Pre-set state values (silent, no UI)
    state.gender = 'Female';
    state.loveInterest = 'Male';
    state.picks.world = fateChoices.world;
    state.picks.worldSubtype = fateChoices.worldFlavor;
    state.picks.tone = fateChoices.tone;
    state.picks.genre = fateChoices.genre;
    state.picks.dynamic = fateChoices.dynamic;
    state.picks.pov = fateChoices.pov;
    state.intensity = fateChoices.intensity;
    state.storyLength = fateChoices.storyLength;
    state.archetype = { primary: fateChoices.archetype, modifier: null };

    if (fateChoices.world === 'Historical' && fateChoices.worldFlavor) {
      state.picks.era = fateChoices.worldFlavor;
    }

    state.veto = { bannedWords: [], bannedNames: [], excluded: [], tone: [], corrections: [], ambientMods: [] };
    state.quillIntent = '';
    // QUILL STATE RESET: Reset cooldown on new story (quillSpent only set AFTER actual commit)
    state.quill = { uses: 0, nextReadyAtWords: 0, baseCooldown: 1200, perUse: 600, cap: 3600 };
    state.quillCommittedThisTurn = false;
    // VETO SCOPING: Clear shape-phase committed vetoes on story start
    // In-story vetoes are added fresh via gameVetoInput
    state.committedVeto = [];
    state.committedQuill = [];

    // Pre-set dropdowns silently
    $('playerGender').value = 'Female';
    $('playerPronouns').value = 'She/Her';
    $('loveInterestGender').value = 'Male';
    $('lovePronouns').value = 'He/Him';

    if (fateChoices.playerAge && $('playerAgeInput')) {
      $('playerAgeInput').value = fateChoices.playerAge;
    }
    if (fateChoices.partnerAge && $('partnerAgeInput')) {
      $('partnerAgeInput').value = fateChoices.partnerAge;
    }

    // Initialize DSP clause reveal tracking — all clauses start pending
    _revealedDSPAxes = new Set();
    _dspGuidedFateActive = true; // Lock DSP to incremental mode

    // NOTE: DSP is NOT pre-populated here. It remains showing placeholder.
    // DSP content is populated on-demand when revealDSPClause is first called.

    // ===============================================
    // PART B: OPENING CEREMONY
    // Golden vignette + character names first (MINIMUM 5 seconds, NO SCROLL)
    // ===============================================

    const ceremonyStartTime = Date.now();

    // Activate golden vignette + sparkles + input echo
    const fateCardElement = document.getElementById('fateDestinyCard');
    activateGuidedFateVisuals(fateCardElement);

    // Highlight both character blocks during ceremony
    const mcBlock = document.querySelector('#playerNameInput')?.closest('.character-block');
    const liBlock = document.querySelector('#partnerNameInput')?.closest('.character-block');
    if (mcBlock) mcBlock.classList.add('fate-ceremony');
    if (liBlock) liBlock.classList.add('fate-ceremony');

    // NO SCROLL during opening ceremony - names fill in place
    await new Promise(r => setTimeout(r, 800)); // Let vignette settle
    if (_fateOverridden) { _fateRunning = false; return; }

    // Fill MC name (letter-by-letter with gold glow, 120ms per char for gravitas)
    const mcInput = $('playerNameInput');
    if (mcInput && fateChoices.playerName && !_fateOverridden) {
      mcInput.value = '';
      mcInput.classList.add('fate-typing');
      for (let i = 0; i < fateChoices.playerName.length; i++) {
        if (_fateOverridden) break;
        mcInput.value += fateChoices.playerName[i];
        await new Promise(r => setTimeout(r, 120)); // Deliberate pace
      }
      mcInput.classList.remove('fate-typing');
      mcInput.classList.add('fate-typed');
      setTimeout(() => mcInput.classList.remove('fate-typed'), 800);

      // Set character name kernel (no longer displayed in DSP)
      state.normalizedPlayerKernel = fateChoices.playerName;
    }

    await new Promise(r => setTimeout(r, 800)); // Pause between names
    if (_fateOverridden) { _fateRunning = false; return; }

    // Fill LI name (letter-by-letter with gold glow, 120ms per char for gravitas)
    const liInput = $('partnerNameInput');
    if (liInput && fateChoices.partnerName && !_fateOverridden) {
      liInput.value = '';
      liInput.classList.add('fate-typing');
      for (let i = 0; i < fateChoices.partnerName.length; i++) {
        if (_fateOverridden) break;
        liInput.value += fateChoices.partnerName[i];
        await new Promise(r => setTimeout(r, 120)); // Deliberate pace
      }
      liInput.classList.remove('fate-typing');
      liInput.classList.add('fate-typed');
      setTimeout(() => liInput.classList.remove('fate-typed'), 800);
    }

    // ENFORCE MINIMUM CEREMONY DURATION (≥5 seconds)
    const ceremonyElapsed = Date.now() - ceremonyStartTime;
    const ceremonyRemaining = FATE_TIMING.MIN_NAMES_CEREMONY - ceremonyElapsed;
    if (ceremonyRemaining > 0 && !_fateOverridden) {
      await new Promise(r => setTimeout(r, ceremonyRemaining));
    }
    if (_fateOverridden) { _fateRunning = false; return; }

    // Remove ceremony highlights from character blocks
    if (mcBlock) mcBlock.classList.remove('fate-ceremony');
    if (liBlock) liBlock.classList.remove('fate-ceremony');

    // Vignette stays at full intensity through Guided Fate → book dwell

    // ===============================================
    // PART A/C: BUILD SECTION LIST BY DOM POSITION
    // Execute sections in strict visual order (top → bottom)
    // ===============================================

    // Define all Fate-relevant sections with their grid selectors and data keys
    const sectionConfigs = [
      { id: 'archetype', grid: '#archetypeCardGrid', titleId: 'archetypeSectionTitle', value: fateChoices.archetype, type: 'archetype' },
      { id: 'intensity', grid: '#intensityGrid', value: fateChoices.intensity, type: 'card' },
      { id: 'length', grid: '#lengthGrid', value: fateChoices.storyLength, type: 'card' },
      { id: 'pov', grid: '#povGrid', value: fateChoices.pov, type: 'card' },
      { id: 'world', grid: '#worldGrid', value: fateChoices.world, type: 'card' },
      { id: 'tone', grid: '#toneGrid', value: fateChoices.tone, type: 'card' },
      { id: 'genre', grid: '#genreGrid', value: fateChoices.genre, type: 'card' },
      { id: 'dynamic', grid: '#dynamicGrid', value: fateChoices.dynamic, type: 'card' }
    ];

    // Build section list sorted by DOM visual position
    const sectionsWithPositions = sectionConfigs
      .map(cfg => {
        const grid = document.querySelector(cfg.grid);
        if (!grid) return null;
        const rect = grid.getBoundingClientRect();
        const visualY = rect.top + window.scrollY;
        return { ...cfg, grid, visualY };
      })
      .filter(s => s !== null)
      .sort((a, b) => a.visualY - b.visualY);

    // Execute sections in visual order (downward only)
    // ENFORCES: Archetype ≥4s, Intensity ≥4s minimum timing
    for (const section of sectionsWithPositions) {
      if (_fateOverridden) { _fateRunning = false; return; }

      const sectionStartTime = Date.now();

      if (section.type === 'archetype') {
        // Archetype has special handling
        await revealArchetypeSection(section.value);
        const archName = ARCHETYPES[section.value]?.name || section.value;
        const primaryNameEl = $('selectedPrimaryName');
        if (primaryNameEl) primaryNameEl.textContent = archName;

        // ENFORCE MINIMUM ARCHETYPE DURATION (≥4 seconds)
        const archetypeElapsed = Date.now() - sectionStartTime;
        const archetypeRemaining = FATE_TIMING.MIN_ARCHETYPE_REVEAL - archetypeElapsed;
        if (archetypeRemaining > 0 && !_fateOverridden) {
          await new Promise(r => setTimeout(r, archetypeRemaining));
        }
      } else {
        // Standard card section
        const sectionTitle = section.grid.previousElementSibling;
        await revealCardSection(section.grid, section.value, sectionTitle);

        // ENFORCE MINIMUM INTENSITY DURATION (≥4 seconds)
        if (section.id === 'intensity') {
          const intensityElapsed = Date.now() - sectionStartTime;
          const intensityRemaining = FATE_TIMING.MIN_INTENSITY_REVEAL - intensityElapsed;
          if (intensityRemaining > 0 && !_fateOverridden) {
            await new Promise(r => setTimeout(r, intensityRemaining));
          }
        }
      }

      // Reveal corresponding DSP clause after card is visually selected
      if (['world', 'tone', 'archetype', 'length'].includes(section.id)) {
        revealDSPClause(section.id);
      }

      await new Promise(r => setTimeout(r, FATE_TIMING.SECTION_PAUSE));
    }

    // ===============================================
    // END STATE: Highlight Begin Story
    // ===============================================
    if (_fateOverridden) { _fateRunning = false; return; }

    // Vignette + fairy dust persist through Begin Story → book dwell
    // deactivateGuidedFateVisuals() is called when dwell completes in openBook()

    highlightBeginButton();
    showToast('Fate has spoken. Click Begin Story when ready.');

    _fateRunning = false;
    // Keep _revealedDSPAxes and _dspGuidedFateActive until story begins
    // This prevents bulk hydration on any late updateSynopsisPanel calls
  }

  // Populate all UI selections from fate choices
  function populateFateSelections(fateChoices) {
    // Set player character
    $('playerGender').value = 'Female';
    $('playerPronouns').value = 'She/Her';
    $('playerNameInput').value = fateChoices.playerName;

    // PASS 9D: Set ages if provided
    if (fateChoices.playerAge && $('playerAgeInput')) {
      $('playerAgeInput').value = fateChoices.playerAge;
    }

    // Set love interest
    $('loveInterestGender').value = 'Male';
    $('lovePronouns').value = 'He/Him';
    $('partnerNameInput').value = fateChoices.partnerName;

    // PASS 9D: Set partner age if provided
    if (fateChoices.partnerAge && $('partnerAgeInput')) {
      $('partnerAgeInput').value = fateChoices.partnerAge;
    }

    // Update state directly
    state.gender = 'Female';
    state.loveInterest = 'Male';
    state.picks.world = fateChoices.world;
    state.picks.worldSubtype = fateChoices.worldFlavor;
    state.picks.tone = fateChoices.tone;
    state.picks.genre = fateChoices.genre;
    state.picks.dynamic = fateChoices.dynamic;
    state.picks.pov = fateChoices.pov;
    state.intensity = fateChoices.intensity;
    state.storyLength = fateChoices.storyLength;

    // Set archetype (required for story generation)
    state.archetype = { primary: fateChoices.archetype, modifier: null };

    // Set Withheld Core lens variant (if assigned by fate)
    state.withheldCoreVariant = fateChoices.withheldCoreVariant || null;

    // Handle Historical era if needed
    if (fateChoices.world === 'Historical' && fateChoices.worldFlavor) {
      state.picks.era = fateChoices.worldFlavor;
    }

    // Clear veto/quill (defaults only)
    state.veto = { bannedWords: [], bannedNames: [], excluded: [], tone: [], corrections: [], ambientMods: [] };
    state.quillIntent = '';
    // QUILL STATE RESET: Reset cooldown on new story (quillSpent only set AFTER actual commit)
    state.quill = { uses: 0, nextReadyAtWords: 0, baseCooldown: 1200, perUse: 600, cap: 3600 };
    state.quillCommittedThisTurn = false;
    // VETO SCOPING: Clear shape-phase committed vetoes on story start
    state.committedVeto = [];
    state.committedQuill = [];

    // Update UI cards to reflect selections
    updateAllCardSelections();

    // GATE: Do NOT bulk-hydrate DSP during Guided Fate — incremental reveal only
    // DSP updates are handled by revealDSPClause() per selection
  }

  // Update all card UI to reflect state
  function updateAllCardSelections() {
    const axes = ['world', 'tone', 'genre', 'dynamic', 'intensity', 'length', 'pov'];
    axes.forEach(grp => {
      const value = grp === 'intensity' ? state.intensity :
                    grp === 'length' ? state.storyLength :
                    state.picks[grp];
      if (!value) return;

      document.querySelectorAll(`.sb-card[data-grp="${grp}"]`).forEach(card => {
        const isSelected = card.dataset.val === value;
        card.classList.toggle('selected', isSelected);
        card.classList.toggle('flipped', isSelected);
      });
    });
  }

  // GUIDED FATE FILL ENGINE - Fate Destiny Card click handler
  // On click: generate choices, reveal step-by-step, highlight Begin Story
  // Does NOT auto-start the story - user must click Begin Story explicitly
  $('fateDestinyCard')?.addEventListener('click', async () => {
    const fateCard = $('fateDestinyCard');
    if (!fateCard || fateCard.dataset.fateUsed === 'true') return;

    // 1. Mark as used to prevent double-click (NO FLIP to tree)
    fateCard.dataset.fateUsed = 'true';
    fateCard.style.opacity = '0.6';
    fateCard.style.pointerEvents = 'none';

    // 2. Generate fate choices including ages
    const ages = getFateAges();
    const fateChoices = {
      playerName: FATE_FEMALE_NAMES[Math.floor(Math.random() * FATE_FEMALE_NAMES.length)],
      partnerName: FATE_MALE_NAMES[Math.floor(Math.random() * FATE_MALE_NAMES.length)],
      playerAge: ages.playerAge,
      partnerAge: ages.partnerAge,
      world: getFateWorld(),
      tone: getFateTone(),
      dynamic: getFateDynamic(),
      pov: getFatePOV(),
      intensity: getFateIntensity(),
      storyLength: getFateStoryLength(),
      archetype: getFateArchetype()
    };

    // Add world-dependent selections
    fateChoices.worldFlavor = getFateFlavor(fateChoices.world);
    fateChoices.genre = getFateGenre(fateChoices.world);

    // Lens: assign Withheld Core variant based on archetype/dynamic signals
    fateChoices.withheldCoreVariant = getFateWithheldCoreVariant(fateChoices.archetype, fateChoices.dynamic);

    // 3. Run guided fate fill - reveals step-by-step with animations
    // This does NOT auto-click Begin Story - user chooses when to start
    await runGuidedFateFill(fateChoices);
  });

  // --- BEGIN STORY (RESTORED) ---
  $('beginBtn')?.addEventListener('click', async () => {
    // Reveal all remaining DSP segments on Begin Story (veto phase)
    if (typeof revealAllDSPSegments === 'function') revealAllDSPSegments();

    // ========================================
    // SOULMATES / DIRTY SUBSCRIBE GATE
    // These selections require $6 Subscribe only — no StoryPass
    // ========================================
    const requiresSubscribeOnly = (state.intensity === 'Dirty') || (state.storyLength === 'soulmates');
    if (requiresSubscribeOnly && state.access !== 'sub') {
        window.showPaywall('sub_only');
        return;
    }

    // ========================================
    // PHASE 1: SYNC VALIDATION (no async!)
    // ========================================
    const validationErrors = validateBeginStory();
    const wasFateTriggered = state._fateTriggered;
    state._fateTriggered = false; // Clear flag after validation

    if (validationErrors.length > 0) {
        showToast(validationErrors[0]);
        return;
    }

    // Capture raw form values synchronously (needed for early validation)
    const rawPlayerName = $('playerNameInput').value.trim() || "The Protagonist";
    const rawPartnerName = $('partnerNameInput').value.trim() || "The Love Interest";
    const pGen = $('customPlayerGender')?.value.trim() || $('playerGender').value;
    const lGen = $('customLoveInterest')?.value.trim() || $('loveInterestGender').value;
    const pPro = $('customPlayerPronouns')?.value.trim() || $('playerPronouns').value;
    const lPro = $('customLovePronouns')?.value.trim() || $('lovePronouns').value;
    // PASS 9D: Capture ages from form fields
    const pAge = $('playerAgeInput')?.value.trim() || '';
    const lAge = $('partnerAgeInput')?.value.trim() || '';

    // Lens: infer Withheld Core variant from archetype if not already set by Fate
    if (!state.withheldCoreVariant && state.archetype.primary) {
        state.withheldCoreVariant = getFateWithheldCoreVariant(state.archetype.primary, state.picks.dynamic);
    }

    // Early validation with pre-normalization values
    const earlyArchetypeDirectives = buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen);
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
            directives: earlyArchetypeDirectives || '(none built)'
        },
        intensity: state.intensity || 'Naughty',
        pov: state.picks.pov || 'First'
    };

    // Validate four-axis before proceeding (sync check)
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

    // ========================================
    // PHASE 2: SHOW LOADER IMMEDIATELY (sync)
    // ========================================
    // GUARD: If book is already opening/open, do not reset cover visibility
    if (_bookOpened) return;

    // Clear Guided Fate DSP lock — story has begun
    _dspGuidedFateActive = false;
    _revealedDSPAxes = null;

    window.showScreen('game');
    console.log('[DEBUG PAGE MOUNT] enterReaderView: _bookPageIndex=', _bookPageIndex, 'pageType=cover');
    const bookCoverPage = document.getElementById('bookCoverPage');
    const storyContentEl = document.getElementById('storyContent');
    console.log('[DEBUG PAGE MOUNT] containers: bookCoverPage=', bookCoverPage?.id, 'storyContent=', storyContentEl?.id);
    if (bookCoverPage) bookCoverPage.classList.remove('hidden');
    if (storyContentEl) storyContentEl.classList.add('hidden');
    startCoverLoading();
    startLoading("Conjuring the world...", STORY_LOADING_MESSAGES);

    // ========================================
    // PHASE 3: DEFER ASYNC WORK (next tick)
    // Ensures loader renders before any await
    // PASS 9B FIX: Wrap normalization in try/catch to prevent hang
    // ========================================
    await new Promise(resolve => setTimeout(resolve, 0));

    // RUNTIME NORMALIZATION: Character names flow through ChatGPT normalization layer
    // PASS 9B FIX: Handle normalization errors gracefully to prevent loader hang
    let playerNorm, partnerNorm, pKernel, lKernel;
    try {
        playerNorm = await callNormalizationLayer({
            axis: 'character',
            user_text: rawPlayerName,
            context_signals: state.picks?.world || []
        });
        partnerNorm = await callNormalizationLayer({
            axis: 'character',
            user_text: rawPartnerName,
            context_signals: state.picks?.world || []
        });
        pKernel = playerNorm.normalized_text || playerNorm.archetype || 'the one who carries the story';
        lKernel = partnerNorm.normalized_text || partnerNorm.archetype || 'the one who draws them forward';
    } catch (normError) {
        console.error('[NORMALIZATION ERROR]', normError);
        // Fallback: Use raw names if normalization fails
        pKernel = rawPlayerName || 'the one who carries the story';
        lKernel = rawPartnerName || 'the one who draws them forward';
    }

    // CRITICAL: Store normalized kernels in state and overwrite raw display
    state.normalizedPlayerKernel = pKernel;
    state.normalizedPartnerKernel = lKernel;
    state.rawPlayerName = rawPlayerName;
    state.rawPartnerName = rawPartnerName;
    if ($('playerNameInput')) $('playerNameInput').value = pKernel;
    if ($('partnerNameInput')) $('partnerNameInput').value = lKernel;

    // Determine Author Identity based on selections
    if(pGen === 'Male' && lGen === 'Female') { state.authorGender = 'Female'; state.authorPronouns = 'She/Her'; }
    else if(pGen === 'Male' && lGen === 'Male') { state.authorGender = 'Male'; state.authorPronouns = 'He/Him'; }
    else if(pGen === 'Female' && lGen === 'Female') { state.authorGender = 'Female'; state.authorPronouns = 'She/Her'; }
    else { state.authorGender = 'Non-Binary'; state.authorPronouns = 'They/Them'; }

    // PASS 9B FIX: Wrap veto in try/catch to prevent hang
    try {
        await applyVetoFromControls();
    } catch (vetoError) {
        console.error('[VETO ERROR]', vetoError);
        // Continue without veto if it fails
    }

    // Check for LGBTQ Colors
    state.gender = $('playerGender').value;
    state.loveInterest = $('loveInterestGender').value;
    const isQueer = (state.gender === state.loveInterest) || state.gender === 'Non-Binary' || state.loveInterest === 'Non-Binary';
    if(isQueer) document.body.classList.add('lgbtq-mode');
    else document.body.classList.remove('lgbtq-mode');

    // Persist Nickname for Couple Mode
    if(state.mode === 'couple' && !state.myNick) {
       state.myNick = pKernel.split(' ')[0];
       localStorage.setItem("sb_nickname", state.myNick);
    }

    state.gender = pGen;
    state.loveInterest = lGen;

    syncPovDerivedFlags();
    const safetyStr = buildConsentDirectives();

    // Variables for later use (ancestry normalization happens later)
    let ancestryPlayer = $('ancestryInputPlayer')?.value.trim() || '';
    let ancestryLI = $('ancestryInputLI')?.value.trim() || '';
    let archetypeDirectives = buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen);
    let quillUnlocked = state.subscribed || state.godModeActive || (state.storyId && hasStoryPass(state.storyId));

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

    // Power Role: resolve genre into world-appropriate label for story prompts
    const storyWorld = state.picks.world || 'Modern';
    const storyEra = state.picks.world === 'Historical' ? (state.picks.era || 'Medieval') : null;
    const storyGenre = state.picks.genre || 'Billionaire';
    const storyPowerRole = resolvePowerRole(storyWorld, storyEra, storyGenre);
    const storyPowerFrame = resolvePowerFrame(storyWorld, storyGenre);

    // Prehistoric hard forbid — prevent anachronistic vocabulary leak
    const prehistoricForbid = storyWorld === 'Prehistoric' ? `
PREHISTORIC WORLD — HARD FORBIDS:
The following concepts DO NOT EXIST in this world. Never reference them:
- "Ash Quarter" or any named district / quarter
- "Warden-cadre" or any institutional guard force
- Guilds, markets, syndicates, courts, or councils
- Currency, trade routes, written law, formal ranks
- Feudal / medieval hierarchy (lords, knights, castles)
Use instead: tribal structures, clan hierarchy, natural landmarks, oral tradition, primal authority, territory, hunting grounds.` : '';

    // DEV LOGGING: story generation + world resolve snapshot
    console.log('[DEV:StoryGen] world:', storyWorld, '| tone:', state.picks.tone, '| genre:', storyGenre, '→ powerRole:', storyPowerRole, '| powerFrame:', storyPowerFrame, '| intensity:', state.intensity);
    console.log('[DEV:WorldResolve] world:', storyWorld, '| genre:', storyGenre, '→ powerFrame:', storyPowerFrame, '| prehistoricForbid:', storyWorld === 'Prehistoric');

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
- Genre: ${storyPowerRole}
- Power Frame: ${storyPowerFrame}
- Dynamic: ${state.picks.dynamic || 'Enemies'}
- POV: ${state.picks.pov || 'First'}
${prehistoricForbid}

    Protagonist: ${pKernel} (${pGen}, ${pPro}${pAge ? `, age ${pAge}` : ''}).
    Love Interest: ${lKernel} (${lGen}, ${lPro}${lAge ? `, age ${lAge}` : ''}).

    ${buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen)}
    ${buildLensDirectives(state.withheldCoreVariant, state.turnCount, state.storyLength)}
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
    5TH PERSON (AUTHOR AS CONDUCTOR) - CRITICAL:
    - The Author is CAUSAL and AGENTIC, not a voyeur. The Author initiates, arranges, and sets events in motion.
    - The Author is the wind, the timing, the coincidence, the pressure. The Author thinks: "What shall I make happen next?"
    - NEVER use first person ("I", "me", "my"). Always refer to "The Author" in third person.
    - BANNED VOYEUR VERBS (never use with "The Author"): watched, observed, saw, looked on, gazed at, witnessed, noticed, perceived, stared.
    - REQUIRED AGENTIC VERBS: tilted, threaded, arranged, set, sent, unlatched, steered, coaxed, provoked, seeded, tightened, loosened, staged, orchestrated, wove.
    - Author's inner thoughts must be about CRAFTING/ENGINEERING outcomes, not spectating.
    - BAD: "The Author watched as she crossed the room." GOOD: "The Author tilted the light so she would notice the letter."
    - Presence: ${state.authorPresence}. Cadence: ~${state.authorCadenceWords} words between Author references.
    - Fate card voice: ${state.fateCardVoice}.
    ` : ''}
    `;
    
    state.sysPrompt = sys;
    state.storyId = state.storyId || makeStoryId();

    // NOTE: Loader already shown in Phase 2 (before async work)
    // Screen transition, cover page, and loading already active

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
AUTHOR AS CONDUCTOR (5TH PERSON) - MANDATORY OPENER:
- CRITICAL: The VERY FIRST SENTENCE must begin with exactly "The Author" as subject.
- The Author is CAUSAL from word one. The Author CAUSES the opening situation, not observes it.
- The Author arranges, sets, seeds, tilts, threads—never watches, observes, or looks on.
- Author's thoughts are about engineering outcomes: "The Author had placed the letter where she would find it."
- BANNED OPENER VERBS: watched, observed, saw, looked on, gazed, witnessed, noticed, perceived.
- REQUIRED OPENER VERBS: tilted, threaded, arranged, set, sent, unlatched, steered, coaxed, provoked, seeded, staged.
- CORRECT: "The Author tilted the morning light through the window..."
- WRONG: "The Author watched as she entered the room..."
- The Author is the invisible hand making things happen, referred to in third person, never "I".
` : '';

    // OPENING SCENE VARIATION - avoid repetitive patterns
    // UPDATED: Removed Social-first (market/tavern default), added world-seeding modes
    const openingModes = [
        { mode: 'Motion-first', directive: 'Open mid-action: transit, pursuit, labor, ritual, or urgent movement. The protagonist is DOING something when we meet them. The action reveals the world.' },
        { mode: 'System-first', directive: 'Open with a governing system, faction, or power structure making itself felt. A decree, a toll, a checkpoint, a ritual of compliance. The protagonist navigates or resists.' },
        { mode: 'Aftermath-first', directive: 'Open in the wake of something significant. Consequences linger—a departure, a broken object, a changed landscape. Someone is already gone.' },
        { mode: 'Disruption-first', directive: 'Open with instability. Something is already wrong, charged, or off-kilter. Tension from the first sentence. The ordinary has cracked.' },
        { mode: 'Object-first', directive: 'Open with a world-specific object, material, or custom that does not exist on Earth. Do not explain it. Let it anchor the scene and reveal the world through use.' }
    ];
    const selectedOpening = openingModes[Math.floor(Math.random() * openingModes.length)];

    // 5TH PERSON POV CONTRACT INJECTION (locked, non-editable)
    const fifthPersonContract = build5thPersonContract();

    // EROTIC ESCALATION BLOCK (Erotic/Dirty intensity only)
    const eroticEscalationBlock = buildEroticEscalationBlock();

    // TONE ENFORCEMENT BLOCK (all tones)
    const toneEnforcementBlock = buildToneEnforcementBlock(state.picks?.tone);

    const introPrompt = `${fifthPersonContract}${eroticEscalationBlock}${toneEnforcementBlock}Write the opening scene (approx 400-500 words). This is 2-3 pages of a book. Take your time.
${authorOpeningDirective}
OPENING MODE: ${selectedOpening.mode}
${selectedOpening.directive}

═══════════════════════════════════════════════════════
UNIVERSAL WORLD-SEEDING (MANDATORY — ALL STORIES)
═══════════════════════════════════════════════════════
The opening scene must feel IMPOSSIBLE to relocate to another world without breaking immersion.
This applies to ALL genres, ALL tones, ALL settings.

CORE REQUIREMENT:
Include AT LEAST 6 world-specific elements, drawn from AT LEAST 3 different categories below.
Introduce them CASUALLY, WITHOUT explanation — they are ordinary facts of life to the characters.

CATEGORIES (choose 3+ per opening):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A. SLANG, IDIOMS, OR SHORTHAND unique to this world
   Example: "She'd been marked riven since the Quiet Year" — never define "riven" or "Quiet Year."

B. INSTITUTIONS, AUTHORITIES, FACTIONS, OR POWER STRUCTURES
   A tax collector, a curfew, a forbidden district, a title that carries weight, a uniform that means something.
   Show through behavior, not explanation.

C. OBJECTS, TOOLS, MATERIALS, OR RESOURCES characteristic of the setting
   Not "a knife" but "a veinglass blade." Not "lantern" but "a caged spark-moth."

D. LOCATIONS OR PLACE-NAMES implying a larger system
   Not "the city" but "the Lower Tithe." Not "downtown" but "the Ash Quarter."

E. PROFESSIONS, ROLES, OR SOCIAL FUNCTIONS specific to this society
   Not "guard" but "a Thread-warden." Not "doctor" but "a marrow-knitter."

F. CUSTOMS, RITUALS, OR UNSPOKEN RULES
   Behaviors characters perform without explaining why — greetings, gestures, taboos.

G. ECONOMIC, CLASS, OR POWER DYNAMICS taken for granted
   Debts owed to specific entities, trade goods unique to this world, labor systems implied.

NON-NEGOTIABLE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Do NOT explain or define these elements
✗ Do NOT italicize or spotlight them
✗ Do NOT pause the narrative to clarify meaning
✓ Treat them as ordinary facts of life to the characters
✓ Let meaning be inferred through context alone

SUBSTITUTION RULE (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Whenever a GENERIC or EARTH-NEUTRAL noun appears (food, money, street, job, authority, weapon, transport, fruit, drink, law, crowd):
→ REPLACE it with a world-specific equivalent unless realism explicitly requires otherwise.
✗ "pomegranate" → ✓ "a heat-veined emberfruit from the Collective orchards"
✗ "money" → ✓ "a handful of bone-chips" or "three unmarked debts"
✗ "the police" → ✓ "the Silence" or "a Warden-cadre"

QUALITY GATE (FAILURE CONDITION):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If this opening scene could be relocated to modern Earth with only name changes, it has FAILED.
If failure detected: REWRITE the opening scene entirely. Do NOT proceed. Do NOT ask for clarification.

TEXTURE OVER SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No narrator voice summarizing the protagonist's life or situation.
Enter mid-scene. The reader should feel dropped into an ongoing life that existed before page one.

═══════════════════════════════════════════════════════
FIRST SECTION RULES
═══════════════════════════════════════════════════════
- ${pacingRule}
- Focus on: World texture, protagonist in motion or decision, atmospheric specificity.
${liAppears ? '- The love interest may appear briefly or be hinted at — but not as the focus.' : '- The love interest should NOT appear yet. Build anticipation through absence.'}
- End with a hook, a question, or atmospheric tension — NOT a romantic moment, NOT a cliffhanger about romance.

═══════════════════════════════════════════════════════
HARD-BANNED OPENINGS (DO NOT USE)
═══════════════════════════════════════════════════════
These settings are BANNED as default openings UNLESS the world's power structure explicitly requires them:
- Bustling marketplace with vendors calling out
- Tavern or inn with a fire crackling
- Neutral public squares as default "liveliness"
- Any crowd scene used merely for atmosphere

These are ALWAYS banned regardless of world:
- Lone woman in solitude staring out a window
- Rain-lashed windows or fog-wreathed atmospherics
- Characters passively observing weather, mist, or shadow
- Quiet interiors awaiting intrusion
- Waking up, getting dressed, looking in a mirror
- Flashback or memory before the present scene is established

═══════════════════════════════════════════════════════
POV REMINDER
═══════════════════════════════════════════════════════
${state.povMode === 'author5th' ?
`5TH PERSON (THE AUTHOR):
The Author CAUSES events. The Author does NOT observe passively.
BANNED verbs with "The Author": watched, saw, observed, noticed, gazed, witnessed, perceived, looked on.
REQUIRED verbs: tilted, threaded, arranged, set, sent, unlatched, steered, coaxed, provoked, seeded, staged, loosened, tightened.
The Author is the invisible hand — the wind, the timing, the coincidence.`
: 'Use the selected POV consistently throughout.'}

The opening must feel intentional, textured, and strange. Not archetypal. Not templated. Specific to THIS world.`;

    // FATE STUMBLED DIAGNOSTIC - Structured payload logging
    // RUNTIME NORMALIZATION: Ancestry/DSP inputs flow through ChatGPT normalization layer
    // PASS 9D FIX: Wrap ancestry normalization in try/catch to prevent hang
    const rawAncestryPlayer = $('ancestryInputPlayer')?.value.trim() || '';
    const rawAncestryLI = $('ancestryInputLI')?.value.trim() || '';
    const worldContext = state.picks?.world ? [state.picks.world] : [];
    try {
        const ancestryPlayerNorm = await callNormalizationLayer({
            axis: 'dsp',
            user_text: rawAncestryPlayer,
            context_signals: worldContext
        });
        const ancestryLINorm = await callNormalizationLayer({
            axis: 'dsp',
            user_text: rawAncestryLI,
            context_signals: worldContext
        });
        // Reassign with normalized values (variables declared earlier with let)
        ancestryPlayer = ancestryPlayerNorm.normalized_text || rawAncestryPlayer;
        ancestryLI = ancestryLINorm.normalized_text || rawAncestryLI;
    } catch (ancestryNormError) {
        console.error('[ANCESTRY NORMALIZATION ERROR]', ancestryNormError);
        // Fallback: Use raw ancestry values if normalization fails
        ancestryPlayer = rawAncestryPlayer;
        ancestryLI = rawAncestryLI;
    }
    archetypeDirectives = buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen);

    // Determine unlock tier (reassign)
    quillUnlocked = state.subscribed || state.godModeActive || (state.storyId && hasStoryPass(state.storyId));
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
        let text = await callChat([
            {role:'system', content: state.sysPrompt},
            {role:'user', content: introPrompt}
        ]);

        // ============================================================
        // PROSE REFUSAL GATE — ATOMIC SCENE CREATION GUARD
        // ============================================================
        // Check IMMEDIATELY after callChat — before any validation/repair.
        // If refusal detected, abort entire flow. Scene is never created.
        const refusalCheck = detectProseRefusal(text);
        if (refusalCheck.isRefusal) {
            console.error('[ProseRefusal] Scene 1 generation refused:', refusalCheck.reason);
            console.error('[ProseRefusal] Raw output:', text?.slice(0, 200));
            throw new ProseRefusalError(refusalCheck.reason, text);
        }

        // ============================================================
        // 5TH PERSON POV — CONSOLIDATED SINGLE-PASS VALIDATION (Scene 1)
        // ============================================================
        // TASK A: All checks run once, regenerate at most ONCE per scene.
        // TASK B: Scene 1 ramp-in — Opening/Closing are HARD, others are SOFT.
        if (state.povMode === 'author5th') {
            // PHASE 1: Repair voyeur verbs (always safe, no regeneration needed)
            text = await repair5thPersonPOV(text);

            // PHASE 2: Run ALL validation checks in a single pass
            const povCheck = validate5thPersonPOV(text, true, false); // isSceneOne=true, isErotic=false
            const authorRoleCheck = validateFifthPersonAuthorRole(text, 1);
            const strictCheck = enforceStrict5thPersonPOV(text, 1, state.picks?.tone);

            // Collect all HARD violations (blocking)
            const allHardViolations = [
                ...povCheck.violations.filter(v => v.startsWith('HARD_FAIL:')).map(v => v.replace('HARD_FAIL:', '')),
                ...authorRoleCheck.violations,
                ...strictCheck.violations
            ];

            // Collect all SOFT warnings (non-blocking)
            const allSoftWarnings = [
                ...(povCheck.warnings || []),
                ...(authorRoleCheck.warnings || []),
                ...(strictCheck.warnings || [])
            ];

            // Log soft warnings (advisory only, Scene 1 ramp-in)
            if (allSoftWarnings.length > 0) {
                console.log('[5thPerson:Scene1] Soft warnings (non-blocking):', allSoftWarnings);
            }

            // PHASE 3: If HARD violations exist, regenerate ONCE (consolidated)
            if (allHardViolations.length > 0) {
                console.error('[5thPerson:Scene1] HARD violations detected, regenerating ONCE:', allHardViolations);

                const consolidatedPrompt = FIFTH_PERSON_POV_CONTRACT + `

═══════════════════════════════════════════════════════════════════════════════
SCENE 1 REGENERATION — CONSOLIDATED HARD FAILURES
═══════════════════════════════════════════════════════════════════════════════

Your output failed these ABSOLUTE structural requirements:
- ${allHardViolations.join('\n- ')}

HARD REQUIREMENTS (must pass):
1. Start with exactly "The Author" as first two words
2. End with Author as final perspective (reflection, doubt, or resistance)
3. Use strict 3rd-person limited for scene prose
4. Author must not appear only at boundaries (cameo pattern)

Regenerate the scene now.
═══════════════════════════════════════════════════════════════════════════════
` + introPrompt;

                text = await callChat([
                    { role: 'system', content: state.sysPrompt },
                    { role: 'user', content: consolidatedPrompt }
                ]);

                // REFUSAL GATE: Check regeneration output
                const regenRefusal = detectProseRefusal(text);
                if (regenRefusal.isRefusal) {
                    console.error('[ProseRefusal] Scene 1 POV regeneration refused:', regenRefusal.reason);
                    throw new ProseRefusalError(regenRefusal.reason, text);
                }

                // Apply voyeur verb cleanup after regeneration
                text = await repair5thPersonPOV(text);

                // Final validation check (log only, no further regeneration)
                const finalPovCheck = validate5thPersonPOV(text, true, false);
                const finalAuthorCheck = validateFifthPersonAuthorRole(text, 1);
                const finalStrictCheck = enforceStrict5thPersonPOV(text, 1, state.picks?.tone);

                const remainingHard = [
                    ...finalPovCheck.violations.filter(v => v.startsWith('HARD_FAIL:')),
                    ...finalAuthorCheck.violations,
                    ...finalStrictCheck.violations
                ];

                if (remainingHard.length > 0) {
                    console.warn('[5thPerson:Scene1] Post-regen violations (proceeding anyway):', remainingHard);
                } else {
                    console.log('[5thPerson:Scene1] Regeneration successful — all HARD checks passed');
                }
            } else {
                console.log('[5thPerson:Scene1] All HARD checks passed on first attempt');
            }
        }

        // VOCABULARY BAN ENFORCEMENT — story opener prose
        text = await enforceVocabularyBans(
            text,
            { type: 'prose', isFatePOV: state.povMode === 'author5th' },
            async (negConstraint) => {
                return await callChat([
                    { role: 'system', content: state.sysPrompt + negConstraint },
                    { role: 'user', content: introPrompt }
                ]);
            }
        );

        // ============================================================
        // NARRATIVE AUTHORITY VALIDATION (Scene 1 — Runs FIRST, before Tone/POV)
        // ============================================================
        const scene1NarrCheck = validateNarrativeAuthority(text);
        _lastNarrativeAuthorityValidation = {
            valid: scene1NarrCheck.valid,
            errors: scene1NarrCheck.errors,
            timestamp: Date.now()
        };
        if (!scene1NarrCheck.valid) {
            console.log('[NarrativeAuthority] Scene 1 validation failed:', scene1NarrCheck.errors);
            // Regenerate with Narrative Authority enforcement
            const narrAuthPrompt = buildNarrativeAuthorityBlock() +
                '\n\nREGENERATION REQUIRED — Previous output violated Narrative Authority:\n- ' +
                scene1NarrCheck.errors.map(e => `${e.code}: ${e.match}`).join('\n- ') +
                '\n\n' + introPrompt;
            text = await callChat([
                { role: 'system', content: state.sysPrompt },
                { role: 'user', content: narrAuthPrompt }
            ]);
            // REFUSAL GATE: Check regeneration output
            const narrRefusal = detectProseRefusal(text);
            if (narrRefusal.isRefusal) {
                console.error('[ProseRefusal] Narrative authority regeneration refused:', narrRefusal.reason);
                throw new ProseRefusalError(narrRefusal.reason, text);
            }
            console.warn('[NarrativeAuthorityFail] Scene 1 regenerated due to:', scene1NarrCheck.errors.map(e => e.code));
        }

        // EROTIC ESCALATION VALIDATION (Scene 1)
        if (['Erotic', 'Dirty'].includes(state.intensity)) {
            const escalationCheck = validateEroticEscalation(text, state.intensity);
            if (!escalationCheck.valid) {
                console.log('[EroticEscalation] Validation failed:', escalationCheck.violations);
                console.log('[EroticEscalation] Metrics:', escalationCheck.metrics);
                // Regenerate with explicit escalation notice
                const escalationPrompt = EROTIC_ESCALATION_BLOCK +
                    (state.intensity === 'Dirty' ? DIRTY_ESCALATION_ADDENDUM : '') +
                    '\n\nREGENERATION REQUIRED — Previous output failed escalation check:\n- ' +
                    escalationCheck.violations.join('\n- ') +
                    '\n\nYou MUST include more sensory grounding (breath, skin, heat, touch) and bodily contradiction (restraint vs reaction).\n\n' + introPrompt;
                text = await callChat([
                    { role: 'system', content: state.sysPrompt },
                    { role: 'user', content: escalationPrompt }
                ]);
                // REFUSAL GATE: Check regeneration output
                const escRefusal = detectProseRefusal(text);
                if (escRefusal.isRefusal) {
                    console.error('[ProseRefusal] Erotic escalation regeneration refused:', escRefusal.reason);
                    throw new ProseRefusalError(escRefusal.reason, text);
                }
                // Log result to Dev HUD
                console.warn('[EroticEscalationFail] Scene 1 regenerated due to:', escalationCheck.violations);
            }
        }

        // TONE VALIDATION (Scene 1 — all stories)
        const currentTone = state.picks?.tone || 'Earnest';
        const toneCheck = validateTone(text, currentTone);
        if (!toneCheck.valid) {
            console.log('[ToneDrift] Validation failed:', toneCheck.violations);
            console.log('[ToneDrift] Metrics: found', toneCheck.matchCount, 'markers, need', toneCheck.required);
            // Regenerate with explicit tone enforcement
            const tonePrompt = buildToneEnforcementBlock(currentTone) +
                '\n\nREGENERATION REQUIRED — Tone selected but not present in language:\n- ' +
                toneCheck.violations.join('\n- ') +
                '\n\n' + introPrompt;
            text = await callChat([
                { role: 'system', content: state.sysPrompt },
                { role: 'user', content: tonePrompt }
            ]);
            // REFUSAL GATE: Check regeneration output
            const toneRefusal = detectProseRefusal(text);
            if (toneRefusal.isRefusal) {
                console.error('[ProseRefusal] Tone regeneration refused:', toneRefusal.reason);
                throw new ProseRefusalError(toneRefusal.reason, text);
            }
            console.warn('[ToneDriftDetected] Scene 1 regenerated for tone:', currentTone);
        }

        // ============================================================
        // TITLE GENERATION PIPELINE (LOCKED)
        // Mode selection → Continuation routing → Generation → Validation → Fallback → Immutability
        // ============================================================

        // Initialize world instance if not set
        if (!state.worldInstanceId) {
            state.worldInstanceId = generateWorldInstanceId();
        }

        // STEP 1: Route title generation based on continuation path
        const continuationPath = state.continuationPath || CONTINUATION_PATHS.NEW_STORY;
        const titleRouting = routeTitleGeneration(continuationPath, {
            world: state.picks?.world || 'Modern',
            arousal: state.intensity || 'Naughty',
            genre: state.picks?.genre || 'Romance',
            tone: state.picks?.tone || 'Earnest'
        });

        const selectedMode = titleRouting.mode;
        const titlePrompt = titleRouting.prompt;
        console.log('[TitlePipeline] Path:', continuationPath, '| Mode:', selectedMode);

        // STEP 2: Generate title with path-specific prompt
        let title = await callChat([{role:'user', content:`Based on this opening, generate a title.

${titlePrompt}

Story opening for context:
${text.slice(0, 500)}`}]);

        // STEP 3: Vocabulary ban enforcement
        title = await enforceVocabularyBans(
            title,
            { type: 'title', isFatePOV: false },
            async (negConstraint) => {
                return await callChat([{role:'user', content:`Generate a title in ${selectedMode} mode.

${titlePrompt}
${negConstraint}

Story opening for context:
${text.slice(0, 500)}`}]);
            }
        );

        // STEP 4: Apply world-marking for SAME_WORLD path
        if (titleRouting.worldMarked && titleRouting.worldName) {
            title = buildWorldMarkedTitle(
                title.replace(/"/g, '').trim(),
                titleRouting.worldName,
                titleRouting.suffix
            );
            console.log('[TitlePipeline] World-marked title:', title);
        }

        // STEP 5: Full pipeline validation
        const titleCheck = validateTitle(
            title,
            state.picks?.tone,
            state.intensity || 'Naughty',
            { world: state.picks?.world, genre: state.picks?.genre }
        );

        // STEP 6: Continuation-specific validation
        const continuationCheck = validateContinuationTitle(title, continuationPath, {
            previousTitle: state.previousTitle,
            worldName: state.worldName,
            priorNouns: state._priorWorldNouns || []
        });

        if (!titleCheck.valid || !continuationCheck.valid) {
            const allErrors = [...(titleCheck.errors || []), ...(continuationCheck.errors || [])];
            console.log('[TitleValidation] Failed:', allErrors.map(e => e.message));
            console.log('[TitleValidation] Detected mode:', titleCheck.mode);

            // STEP 7: Deterministic name-based fallback
            let fallbackTitle = generateFallbackTitle({
                playerName: state.rawPlayerName,
                partnerName: state.rawPartnerName,
                world: state.picks?.world || 'Modern',
                tone: state.picks?.tone || 'Earnest',
                genre: state.picks?.genre || 'Romance'
            });

            // Apply world-marking to fallback if SAME_WORLD
            if (titleRouting.worldMarked && titleRouting.worldName) {
                fallbackTitle = buildWorldMarkedTitle(
                    fallbackTitle,
                    titleRouting.worldName,
                    titleRouting.suffix
                );
            }

            console.log('[TitleFallback] Using fallback:', fallbackTitle);
            title = fallbackTitle;
        } else {
            console.log('[TitleValidation] PASS — Mode:', titleCheck.mode);
        }

        // STEP 8: Store baseline arousal and title for immutability + future continuations
        state.titleBaselineArousal = state.intensity || 'Naughty';
        state.immutableTitle = title.replace(/"/g, '').trim();
        state.previousTitle = state.immutableTitle;
        state.previousTitleMode = selectedMode;

        // Clear continuation path after use
        state.continuationPath = null;
        state._priorWorldNouns = null;

        // SYNOPSIS GENERATION RULE (AUTHORITATIVE)
        let synopsis = await callChat([{role:'user', content:`Write a 1-2 sentence synopsis (story promise) for this opening.

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

        // VOCABULARY BAN ENFORCEMENT — synopsis
        synopsis = await enforceVocabularyBans(
            synopsis,
            { type: 'synopsis', isFatePOV: false },
            async (negConstraint) => {
                return await callChat([{role:'user', content:`Write a 1-2 sentence synopsis (story promise) for this opening.

MANDATORY: A specific character + a desire + a looming conflict.
${negConstraint}
Return ONLY the synopsis sentence(s), no quotes:\n${text}`}]);
            }
        );

        // CORRECTIVE: Set title first (synopsis lives ONLY on inside cover flyleaf)
        const titleEl = document.getElementById('storyTitle');
        const storyTextEl = document.getElementById('storyText');

        // Hide story text until fully rendered
        if (storyTextEl) storyTextEl.style.opacity = '0';

        const cleanTitle = title.replace(/"/g,'');
        titleEl.textContent = cleanTitle;

        // BOOK FLOW SPEC: Synopsis rendered ONLY on inside cover, never in pagination
        // Inside cover = title + synopsis (white paper)
        // Setting plate = visual only (setting image)
        // Scene pages = title + text only (via StoryPagination)
        state._synopsisMetadata = synopsis; // Store for inside cover + cover generation

        // ============================================================
        // FINAL ATOMIC GATE — Scene creation only if prose is valid
        // ============================================================
        // This is the LAST CHECK before scene content is stored.
        // If refusal detected here, something slipped through earlier gates.
        const finalRefusalCheck = detectProseRefusal(text);
        if (finalRefusalCheck.isRefusal) {
            console.error('[ATOMIC GATE] FINAL refusal check caught invalid prose:', finalRefusalCheck.reason);
            throw new ProseRefusalError(finalRefusalCheck.reason, text);
        }

        // Use pagination system for story display
        StoryPagination.init();
        StoryPagination.clear();
        StoryPagination.addPage(formatStory(text), true);

        // OPENING SPREAD COMPOSITION: Populate inside cover with title + synopsis
        // Page 1 (inside cover) = paper background + title + synopsis (NO image generation)
        // Page 2+ (scene) = scene text with setting image INLINE if present
        const insideCover = document.getElementById('bookInsideCover');
        if (insideCover) {
            console.log('[DEBUG PAGE MOUNT] insideCoverContent: _bookPageIndex=', _bookPageIndex, 'pageType=insideCover', 'container=', insideCover.id);
            insideCover.innerHTML = `
                <div class="inside-cover-content">
                    <h1 class="inside-cover-title">${cleanTitle}</h1>
                    <p class="inside-cover-synopsis">${synopsis}</p>
                </div>
            `;
        }

        // ============================================================
        // PHASE 1 COVER GATE — NO NETWORK CALLS DURING BEGIN STORY
        // coverMode === 'PHASE_1_FORGED': local assets only, deterministic, synchronous
        // Custom (model-based) cover ONLY when coverEligibility === true
        // ============================================================
        const authorDisplayName = state.coverAuthor || 'Anonymous';

        // CONTROL-FLOW INVARIANT: Cover generation is DECORATIVE and must NEVER block page mounting
        // Defer all cover logic to next tick to ensure pages are fully mounted first
        setTimeout(() => {
            // FENCE: PHASE_1_FORGED fallback applies ONLY when page type is COVER (index 0)
            console.log('[DEBUG PAGE STATE] cover setTimeout: _bookPageIndex=', _bookPageIndex, 'coverMode=', state.coverMode);
            if (_bookPageIndex !== 0) return;

            if (state.coverMode === 'PHASE_1_FORGED' || state.coverEligibility !== true) {
                // PHASE 1: Render local fallback cover (no API call)
                console.log('[BookCover] PHASE_1_FORGED mode — using local fallback cover');
                renderFallbackCover(state.picks?.world, state.picks?.genre, cleanTitle);
                stopCoverLoading(null);
                applyCoverIntensityLayers(state.intensity, state.picks?.world);
            } else {
                // CUSTOM COVER PATH (gated — only when coverEligibility === true)
                generateBookCover(synopsis, cleanTitle, authorDisplayName).then(coverUrl => {
                    if (coverUrl) {
                        stopCoverLoading(coverUrl);
                    } else {
                        // Cover generation failed — render fallback (never skip)
                        console.warn('[BookCover] Failed to generate, rendering fallback cover');
                        renderFallbackCover(state.picks?.world, state.picks?.genre, cleanTitle);
                        stopCoverLoading(null);
                    }
                    applyCoverIntensityLayers(state.intensity, state.picks?.world);
                });
            }
        }, 0);

        // Generate setting art for Scene 1 (page 2) — renders INLINE, not fullscreen
        // Setting image is a distinct asset from cover, shown within scene content
        // Store promise so openBook() can gate scene transition until ready
        _settingImagePromise = generateBookSceneArt(synopsis);

        // Story text reveal is handled by cover page flow
        // (user clicks "Open Your Story" to see content)

        // Initial Snapshot
        saveStorySnapshot();
        
        if(state.mode === 'couple') {
           broadcastTurn(text, true); 
        }

    } catch(e) {
        // ============================================================
        // PROSE REFUSAL ERROR — ATOMIC ABORT (no book, no scene)
        // ============================================================
        if (e instanceof ProseRefusalError) {
            console.group('STORYBOUND PROSE REFUSAL - SCENE NOT CREATED');
            console.error('Refusal reason:', e.reason);
            console.error('Raw output (first 300 chars):', e.rawOutput?.slice(0, 300));
            console.groupEnd();

            // DO NOT render fallback cover
            // DO NOT call stopCoverLoading (would show book object)
            // DO NOT create scene — state.text remains unchanged
            // Hide loading state and return to setup
            const loadingState = document.getElementById('coverLoadingState');
            if (loadingState) loadingState.classList.add('hidden');

            alert("Story generation was declined. Please try different settings.");
            window.showScreen('setup');
            return; // Exit early — finally block still runs
        }

        // ============================================================
        // HTTP 429 RATE LIMIT — TERMINAL FAILURE, NO RETRY
        // ============================================================
        if (e instanceof RateLimitError || e?.isRateLimit) {
            console.group('STORYBOUND RATE LIMITED - TERMINAL FAILURE');
            console.error('Endpoint:', e.endpoint);
            console.error('Retry-After:', e.retryAfter || 'not specified');
            console.groupEnd();

            // DO NOT render fallback cover
            // DO NOT call stopCoverLoading (would show book object)
            // DO NOT create scene — state remains unchanged
            // DO NOT trigger any secondary async calls
            // Hide loading state and return to setup
            const loadingState = document.getElementById('coverLoadingState');
            if (loadingState) loadingState.classList.add('hidden');

            // Surface recoverable error — require explicit user action
            alert("Rate limited. Please wait a moment and try again.");
            window.showScreen('setup');
            return; // Exit early — finally block still runs
        }

        // Generic API/network errors
        console.group('STORYBOUND FATE STUMBLED - API ERROR');
        console.error('Error object:', e);
        console.error('Error message:', e?.message || '(no message)');
        console.error('Error stack:', e?.stack || '(no stack)');
        console.log('System prompt length at failure:', state.sysPrompt?.length || 0);
        console.log('Intro prompt length at failure:', introPrompt?.length || 0);
        console.groupEnd();

        // Clean up cover page state on error — render fallback (never skip)
        renderFallbackCover(state.picks?.world, state.picks?.genre);
        stopCoverLoading(null);
        applyCoverIntensityLayers(state.intensity, state.picks?.world);

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
   * HARD RULE: Story authoring ONLY uses ChatGPT (PRIMARY_AUTHOR).
   * Grok must NEVER be called for DSP, normalization, veto, or story logic.
   *
   * ==========================================================================
   */
  async function callChat(messages, temp=0.7, options = {}) {
    // LOCKED: Story authoring routes through ChatGPT orchestration ONLY
    if (!window.StoryboundOrchestration) {
      throw new Error('[MODEL WIRING] Orchestration client not loaded. ChatGPT required for story authoring.');
    }

    // SINGLE-FLIGHT LOCK: Only one prose generation at a time
    if (_proseGenerationInFlight) {
      console.warn('[PROSE] Request blocked — another prose generation in flight');
      throw new Error('Prose generation blocked: request already in flight');
    }

    _proseGenerationInFlight = true;

    try {
      return await window.StoryboundOrchestration.callChatGPT(
        messages,
        'PRIMARY_AUTHOR',
        { temperature: temp, max_tokens: options.max_tokens || 1000 }
      );
    } catch (orchestrationError) {
      // CHECK FOR HTTP 429 IN ERROR MESSAGE — TERMINAL FAILURE
      const errMsg = orchestrationError?.message || '';
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit') || errMsg.includes('too many requests')) {
        console.error('[RATE_LIMIT] Detected 429 in orchestration error:', errMsg);
        throw new RateLimitError('prose-generation', null);
      }

      // NO GROK FALLBACK - Story authoring must use ChatGPT
      console.error('[MODEL WIRING] ChatGPT failed. No Grok fallback for story logic:', orchestrationError.message);
      throw new Error(`Story generation failed: ${orchestrationError.message}. Grok cannot be used for story authoring.`);
    } finally {
      // RELEASE SINGLE-FLIGHT LOCK
      _proseGenerationInFlight = false;
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
  // TASK G: Ensure setting shot always reaches image generation
  async function generateSettingShot(desc) {
     _lastSettingShotDesc = desc; // Store for retry
     const img = document.getElementById('settingShotImg');
     const errDiv = document.getElementById('settingError');
     // TASK G: Log if DOM element missing (not silent gate)
     if(!img) {
         console.warn('[SettingShot] settingShotImg element not found - cannot render');
         return;
     }
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

     // Route through canonical setting visualize prompt
     const visualizeMode = 'setting';
     const settingPromptBase = buildVisualizePrompt({ mode: visualizeMode, lastText: '' });
     let prompt = settingPromptBase + '\n\n' + worldDesc;

     // VISUAL INTENT GUARD: Enforce balanced lighting for settings
     prompt = applyVisualIntentGuard(prompt, {
         tone: state.picks?.tone,
         world: state.picks?.world,
         intensity: state.intensity
     });

     let rawUrl = null;

     // Use unified IMAGE PROVIDER ROUTER with FALLBACK CHAIN
     // Setting shots use intent='setting' for Gemini primary → OpenAI fallback
     try {
         rawUrl = await generateImageWithFallback({
             prompt: prompt,
             tier: 'Clean',
             shape: 'landscape',
             context: 'setting-shot',
             intent: 'setting'
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
  // BOOK SCENE ART — Inline setting image for Scene 1 (page 2)
  // Distinct asset from cover. Uses imageIntent='setting'.
  // MUST render INLINE within scene content, NEVER fullscreen.
  // MUST NOT run on COVER (page 0) or INSIDE_COVER (page 1).
  // ============================================================
  async function generateBookSceneArt(synopsis) {
      // GUARD: Setting image is ONLY for Scene pages (page 2+)
      // Never generate for cover or inside cover
      console.log('[DEBUG PAGE STATE] generateBookSceneArt: _bookPageIndex=', _bookPageIndex);

      const sceneImg = document.getElementById('bookSceneImg');
      const loadingEl = document.getElementById('bookSceneLoading');
      console.log('[BookScene:DEBUG] ENTRY', {
          coverMode: state.coverMode,
          PHASE_1_FORGED: state.coverMode === 'PHASE_1_FORGED',
          sceneImgId: sceneImg?.id || null,
          sceneImgSrc: sceneImg?.src || null,
          sceneImgDisplay: sceneImg?.style?.display || null,
          loadingElId: loadingEl?.id || null,
          settingPlateId: document.getElementById('settingPlate')?.id || null
      });
      if (!sceneImg) {
          console.warn('[BookScene:DEBUG] EARLY_RETURN: bookSceneImg element not found');
          return;
      }

      const world = state.picks?.world || 'Modern';
      const era = state.picks?.world === 'Historical' ? (state.picks?.era || 'Medieval') : null;
      const worldLabel = era ? `${era} ${world}` : world;

      // Build a concise world-establishing description (symbolic only — no story prose)
      const tone = state.picks?.tone || 'Earnest';
      const desc = `${worldLabel} world. ${tone} atmosphere. A dramatic setting.`;

      let vistaPrompt = `${desc}

CRITICAL COMPOSITION RULES:
- This MUST be a WORLD VISTA image: landscape, environment, establishing shot.
- If ANY human figure appears, they MUST be facing AWAY, silhouette only.
- ABSOLUTELY FORBIDDEN: Portraits, faces, character close-ups, romantic poses.
- Camera position: Wide establishing shot, epic scale, environment is the subject.

Wide cinematic environment, atmospheric lighting, painterly illustration, no text, no watermark.`;

      // VISUAL INTENT GUARD: Enforce balanced lighting for scene art
      vistaPrompt = applyVisualIntentGuard(vistaPrompt, {
          tone: state.picks?.tone,
          world: state.picks?.world,
          intensity: state.intensity
      });

      try {
          const rawUrl = await generateImageWithFallback({
              prompt: vistaPrompt,
              tier: 'Clean',
              shape: 'landscape',
              context: 'book-scene-art',
              intent: 'setting'
          });
          console.log('[BookScene:DEBUG] AFTER_generateImageWithFallback', {
              rawUrl: rawUrl ? (rawUrl.substring(0, 50) + '...') : null,
              rawUrlType: rawUrl ? (rawUrl.startsWith('http') ? 'http' : rawUrl.startsWith('data:') ? 'data' : rawUrl.startsWith('blob:') ? 'blob' : 'base64') : 'null',
              failureReason: rawUrl ? null : 'generateImageWithFallback returned null'
          });

          if (rawUrl) {
              let imageUrl = rawUrl;
              if (!rawUrl.startsWith('http') && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:')) {
                  imageUrl = `data:image/png;base64,${rawUrl}`;
              }
              sceneImg.src = imageUrl;
              console.log('[BookScene:DEBUG] DOM_APPLIED', {
                  targetElement: 'bookSceneImg',
                  srcSet: imageUrl.substring(0, 50) + '...',
                  sceneImgId: sceneImg.id
              });
              sceneImg.onload = () => {
                  // GUARD: Setting images must render INLINE, never fullscreen
                  // Setting plate should have 'setting-inline' class when on scene page
                  const settingPlate = document.getElementById('settingPlate');
                  if (settingPlate && sceneImg.closest('#settingPlate')) {
                      // Ensure inline mode (not fullscreen)
                      settingPlate.classList.add('setting-inline');
                      settingPlate.classList.remove('setting-active'); // Remove any fullscreen class
                      sceneImg.style.display = 'block';
                      if (loadingEl) loadingEl.style.display = 'none';
                      console.log('[BookScene:DEBUG] IMAGE_LOADED', { display: sceneImg.style.display, mountPath: 'settingPlate', mode: 'inline' });
                  } else {
                      // ABORT: Setting image mounted in wrong container
                      console.error('[BookScene:GUARD] Setting image not in settingPlate - aborting display');
                      sceneImg.style.display = 'none';
                  }
              };
              sceneImg.onerror = () => {
                  console.warn('[BookScene] Image failed to load');
                  if (loadingEl) loadingEl.textContent = '';
              };
          } else {
              // Generation failed — hide loading text silently
              if (loadingEl) loadingEl.textContent = '';
          }
      } catch (err) {
          console.warn('[BookScene] Generation failed:', err.message);
          if (loadingEl) loadingEl.textContent = '';
      }
  }

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
  let _coverAbortController = null;

  // Abort cover generation — render fallback cover (never skip)
  function abortCoverGeneration() {
      if (_coverAbortController) {
          _coverAbortController.abort();
          _coverAbortController = null;
      }
      renderFallbackCover(state.picks?.world, state.picks?.genre);
      stopCoverLoading(null);
      applyCoverIntensityLayers(state.intensity, state.picks?.world);
  }

  // ============================================================
  // LOADING BAR SPARKLE EMITTER (SCOPED TO PROGRESS BARS ONLY)
  // Localized sparkle system for loading/progress indicators
  // Does NOT affect Fate, DSP, or other global sparkle systems
  // ============================================================
  let _loadingSparkleInterval = null;

  function spawnLoadingSparkle(container) {
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      if (containerWidth === 0) return;

      const sparkle = document.createElement('div');
      sparkle.className = 'loading-sparkle';

      // Random spawn position along and around the bar
      const spawnX = Math.random() * containerWidth;
      const spawnY = (Math.random() - 0.5) * 30 - 5; // Above/around bar

      // Randomized direction — avoid fixed diagonal
      const angle = (Math.random() * 120 - 60) * (Math.PI / 180); // -60° to +60° (upward bias)
      const distance = 15 + Math.random() * 25;
      const dx = Math.cos(angle) * distance * (Math.random() > 0.5 ? 1 : -1);
      const dy = -Math.abs(Math.sin(angle) * distance) - 5; // Always drift upward

      // Wobble for organic motion
      const wobble = (Math.random() - 0.5) * 10;

      // Size and timing variance
      const size = 2 + Math.random() * 3;
      const duration = 2000 + Math.random() * 2000;
      const opacity = 0.5 + Math.random() * 0.4;

      sparkle.style.cssText = `
          left: ${spawnX}px;
          top: ${spawnY}px;
          width: ${size}px;
          height: ${size}px;
          --ls-duration: ${duration}ms;
          --ls-opacity: ${opacity};
          --ls-dx: ${dx}px;
          --ls-dy: ${dy}px;
          --ls-wobble: ${wobble}px;
      `;

      container.appendChild(sparkle);
      setTimeout(() => { if (sparkle.parentNode) sparkle.remove(); }, duration + 100);
  }

  function startLoadingBarSparkles() {
      stopLoadingBarSparkles(); // Clear any existing

      const progressBar = document.querySelector('.cover-progress-bar');
      if (!progressBar) return;

      // Ensure container is positioned for absolute children
      const style = window.getComputedStyle(progressBar);
      if (style.position === 'static') {
          progressBar.style.position = 'relative';
      }

      // Spawn sparkles at staggered intervals for overlapping lifetimes
      _loadingSparkleInterval = setInterval(() => {
          spawnLoadingSparkle(progressBar);
      }, 180); // ~5-6 sparkles per second

      // Initial burst — staggered for natural appearance
      for (let i = 0; i < 4; i++) {
          setTimeout(() => spawnLoadingSparkle(progressBar), i * 80);
      }
  }

  function stopLoadingBarSparkles() {
      if (_loadingSparkleInterval) {
          clearInterval(_loadingSparkleInterval);
          _loadingSparkleInterval = null;
      }
      // Fade out existing sparkles gracefully
      document.querySelectorAll('.loading-sparkle').forEach(s => {
          s.style.opacity = '0';
          s.style.transition = 'opacity 0.3s ease-out';
          setTimeout(() => s.remove(), 350);
      });
  }

  // Start cover loading UI with staged phrases
  function startCoverLoading() {
      // Create new abort controller for this generation
      _coverAbortController = new AbortController();

      // Wire up abort button
      const abortBtn = document.getElementById('coverAbortBtn');
      if (abortBtn) {
          abortBtn.onclick = abortCoverGeneration;
      }
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

      // Start loading bar sparkles (localized emitter)
      startLoadingBarSparkles();
  }

  // Stop cover loading and show physical book object
  function stopCoverLoading(coverUrl) {
      if (_coverPhraseInterval) clearInterval(_coverPhraseInterval);
      if (_coverProgressInterval) clearInterval(_coverProgressInterval);

      // Stop loading bar sparkles
      stopLoadingBarSparkles();

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

  // ============================================================
  // COVER INTELLIGENCE SYSTEM
  // Focal object extraction, anti-repetition, domain backgrounds, palette
  // ============================================================

  const COVER_MOTIF_STORAGE_KEY = 'storybound_cover_motifs';
  const MAX_MOTIF_HISTORY = 5;

  // Object class groupings for anti-repetition (same class = repetition)
  const OBJECT_CLASSES = {
      jewelry: ['ring', 'necklace', 'bracelet', 'pendant', 'locket', 'brooch', 'crown', 'tiara'],
      keys: ['key', 'keyring', 'skeleton key', 'antique key', 'golden key'],
      letters: ['letter', 'envelope', 'note', 'scroll', 'document', 'contract', 'deed'],
      flowers: ['rose', 'flower', 'bouquet', 'petal', 'lily', 'orchid', 'wildflower'],
      weapons: ['dagger', 'sword', 'knife', 'gun', 'pistol', 'blade'],
      vessels: ['wine glass', 'goblet', 'cup', 'bottle', 'vial', 'chalice'],
      timepieces: ['watch', 'clock', 'hourglass', 'pocket watch', 'sundial'],
      books: ['book', 'diary', 'journal', 'tome', 'manuscript', 'ledger'],
      masks: ['mask', 'masquerade mask', 'venetian mask', 'domino mask'],
      doors: ['door', 'gate', 'portal', 'archway', 'threshold']
  };

  // Color families for anti-repetition
  const COLOR_FAMILIES = {
      warm: ['red', 'orange', 'gold', 'amber', 'copper', 'bronze', 'rust', 'burgundy', 'crimson'],
      cool: ['blue', 'teal', 'cyan', 'navy', 'sapphire', 'cobalt', 'azure', 'indigo'],
      earth: ['brown', 'tan', 'sienna', 'umber', 'chocolate', 'mahogany', 'sepia'],
      jewel: ['emerald', 'purple', 'violet', 'amethyst', 'ruby', 'jade'],
      neutral: ['black', 'white', 'grey', 'gray', 'silver', 'charcoal', 'ivory'],
      nature: ['green', 'forest', 'olive', 'moss', 'sage', 'hunter']
  };

  // ============================================================
  // POWER ROLE TRANSMUTATION
  // Resolves genre labels into world-appropriate power roles.
  // Prevents anachronistic concepts from propagating to prompts.
  // Rollback: replace all resolvePowerRole() calls with raw genre
  // ============================================================
  function resolvePowerRole(world, era, genre) {
      if (genre !== 'Billionaire') return genre;
      if (world === 'Modern') return 'Capital Magnate';
      if (world === 'Historical') {
          if (era === 'Renaissance') return 'Merchant Prince';
          if (era === 'Roman') return 'Imperium Holder';
          return 'Sovereign'; // Medieval and default Historical
      }
      if (world === 'Prehistoric') return 'Clan Alpha';
      if (world === 'Fantasy') return 'Arcane Sovereign';
      if (world === 'SciFi') return 'Technocratic Hegemon';
      return genre; // unknown world fallback
  }

  // ============================================================
  // POWER FRAME RESOLUTION
  // Maps genre labels to world-appropriate narrative frames.
  // Broader than resolvePowerRole (which handles Billionaire only).
  // Modern worlds pass through unchanged.
  // Rollback: remove resolvePowerFrame() calls, use raw genre
  // ============================================================
  function resolvePowerFrame(world, genre) {
      if (world === 'Modern') return genre;

      // Non-Modern generic frame transmutation
      if (genre === 'Billionaire') return 'Ruler';
      if (genre === 'Crime Syndicate') return 'Faction';
      if (genre === 'Sports') return 'Ritual Contest';

      // Prehistoric-specific transmutations
      if (world === 'Prehistoric') {
          if (genre === 'Mafia') return 'Tribal Enforcer';
          if (genre === 'Military') return 'War Leader';
      }

      return genre; // default pass-through
  }

  // Background patterns by domain
  const DOMAIN_BACKGROUNDS = {
      // World-based
      Modern: ['geometric glass patterns', 'city skyline silhouette', 'neon reflections on wet pavement', 'modernist architecture lines'],
      Historical: ['aged parchment texture', 'heraldic filigree', 'candlelit stone walls', 'tapestry weave pattern'],
      Fantasy: ['magical runes glowing', 'starfield with constellations', 'enchanted forest mist', 'crystalline formations'],
      SciFi: ['holographic grid', 'star map', 'circuit board traces', 'nebula swirls', 'spacecraft hull panels'],
      // Genre-based
      CrimeSyndicate: ['smoke wisps', 'playing cards scattered', 'city noir shadows', 'venetian blind slats'],
      Billionaire: ['marble texture', 'champagne bubbles', 'stock ticker lines', 'crystal chandelier reflections'],
      Noir: ['rain-streaked window', 'venetian blind shadows', 'cigarette smoke trails', 'foggy streetlamp halos'],
      Heist: ['vault door mechanism', 'blueprint lines', 'laser grid', 'scattered diamonds'],
      Espionage: ['redacted document', 'surveillance static', 'crosshairs overlay', 'encrypted text streams'],
      Political: ['marble columns', 'seal embossing', 'flag fabric folds', 'courtroom wood grain'],
      Escape: ['broken chains', 'open road horizon', 'shattered glass', 'fading footprints'],
      Redemption: ['sunrise gradient', 'phoenix feathers', 'cracked mirror healing', 'emerging from shadow'],
      BuildingBridges: ['interlocking hands silhouette', 'bridge architecture', 'puzzle pieces', 'woven threads'],
      Purgatory: ['fog layers', 'liminal doorways', 'clock faces overlapping', 'fading photographs'],
      RelentlessPast: ['cracked photographs', 'faded newspaper', 'chains and shadows', 'footsteps in dust'],
      Sports: ['stadium lights', 'scoreboard glow', 'trophy shelf', 'field markings', 'crowd silhouettes'],
      Survival: ['cracked earth', 'sparse rations', 'barren landscape', 'weathered hands', 'distant smoke'],
      Obsession: ['pinboard with strings', 'circled photographs', 'repeated patterns', 'sleepless light', 'worn edges'],
      ForbiddenKnowledge: ['ancient tome', 'glowing sigils', 'eye in shadow', 'forbidden archive', 'sealed door']
  };

  // Palette by tone + common material affinities
  const TONE_PALETTES = {
      Earnest: { primary: 'warm gold', secondary: 'deep burgundy', accent: 'ivory' },
      Angsty: { primary: 'stormy blue', secondary: 'bruised purple', accent: 'lightning silver' },
      Campy: { primary: 'hot pink', secondary: 'electric blue', accent: 'gold glitter' },
      Gritty: { primary: 'charcoal', secondary: 'rust', accent: 'dried blood red' },
      Tender: { primary: 'blush pink', secondary: 'soft lavender', accent: 'pearl white' },
      Steamy: { primary: 'deep red', secondary: 'black velvet', accent: 'gold shimmer' },
      Brooding: { primary: 'midnight blue', secondary: 'storm grey', accent: 'moonlight silver' },
      Playful: { primary: 'coral', secondary: 'turquoise', accent: 'sunshine yellow' }
  };

  // Material-based palette adjustments
  const MATERIAL_PALETTES = {
      metal: { shift: 'silver/steel highlights' },
      gold: { shift: 'warm gold, amber glow' },
      glass: { shift: 'cool reflections, prismatic edges' },
      paper: { shift: 'cream, sepia, aged yellow' },
      fabric: { shift: 'rich textile colors, soft shadows' },
      stone: { shift: 'grey, moss green, weathered' },
      wood: { shift: 'warm brown, grain patterns' },
      crystal: { shift: 'prismatic, ice blue, diamond sparkle' }
  };

  // Get object class for anti-repetition check
  function getObjectClass(object) {
      const lower = object.toLowerCase();
      for (const [cls, items] of Object.entries(OBJECT_CLASSES)) {
          if (items.some(item => lower.includes(item))) return cls;
      }
      return lower; // Use object itself as unique class
  }

  // Get color family for anti-repetition check
  function getColorFamily(color) {
      const lower = color.toLowerCase();
      for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
          if (colors.some(c => lower.includes(c))) return family;
      }
      return 'neutral'; // Default
  }

  // ISSUE 2 FIX: Abstraction ladder for true object substitution on repetition
  // object → trace → environment → absence (NEVER reuse same object class)
  const ABSTRACTION_LADDER = {
      communication: [
          'torn paper fragments scattered in gutter',
          'wax seal imprint on empty desk',
          'indentation in wood where something once lay',
          'negative space shaped like absence'
      ],
      jewelry: [
          'velvet impression where ring once sat',
          'empty jewelry box with worn hinge',
          'faint mark on skin where band was worn',
          'dusty display case, bare'
      ],
      weapons: [
          'blade-shaped shadow on wall',
          'notch in doorframe from impact',
          'empty sheath, leather cracked',
          'rust stain in shape of what was'
      ],
      keys: [
          'worn keyhole, brass darkened',
          'ring of dust where keys hung',
          'lock mechanism exposed, no key',
          'chain with empty clasp'
      ],
      timepieces: [
          'sundial with no shadow',
          'clock face with missing hands',
          'hourglass with sand frozen',
          'empty pocket, fob chain dangling'
      ],
      containers: [
          'lid without its vessel',
          'rim impression in dust',
          'empty shelf with object outline',
          'spilled contents, vessel gone'
      ],
      flora: [
          'pressed flower stain on page',
          'empty vase with dried water ring',
          'petal impression in wax',
          'barren stem, bloom fallen'
      ],
      light_sources: [
          'smoke trail where flame was',
          'wax pool, wick drowned',
          'soot pattern on ceiling',
          'match head, spent and dark'
      ],
      documents: [
          'ink blot bleeding through blank page',
          'creased paper, text faded to nothing',
          'fountain pen dry on empty desk',
          'typewriter ribbon exhausted'
      ]
  };

  // Get abstraction substitution for repeated object class
  function getAbstractionSubstitute(objectClass, usedSubstitutes = []) {
      const ladder = ABSTRACTION_LADDER[objectClass];
      if (!ladder) {
          // No predefined ladder - use generic absence
          return 'empty space where something meaningful once was';
      }

      // Find unused substitution
      const available = ladder.filter(s => !usedSubstitutes.includes(s));
      if (available.length > 0) {
          return available[Math.floor(Math.random() * available.length)];
      }

      // All used - return highest abstraction (absence)
      return ladder[ladder.length - 1];
  }

  // Load motif history from localStorage
  function loadMotifHistory() {
      try {
          const stored = localStorage.getItem(COVER_MOTIF_STORAGE_KEY);
          return stored ? JSON.parse(stored) : [];
      } catch (e) {
          return [];
      }
  }

  // Save motif to history
  function saveMotifToHistory(motif) {
      try {
          const history = loadMotifHistory();
          history.unshift(motif);
          if (history.length > MAX_MOTIF_HISTORY) history.pop();
          localStorage.setItem(COVER_MOTIF_STORAGE_KEY, JSON.stringify(history));
      } catch (e) {
          // localStorage unavailable
      }
  }

  // Check if motif would repeat recent covers
  function wouldRepeatMotif(objectClass, colorFamily, backgroundStyle) {
      const history = loadMotifHistory();
      if (history.length === 0) return { repeats: false };

      const lastMotif = history[0];
      const repeats = {
          object: history.some(m => m.objectClass === objectClass),
          color: history.some(m => m.colorFamily === colorFamily),
          background: history.some(m => m.backgroundStyle === backgroundStyle),
          artDeco: backgroundStyle === 'art-deco' && lastMotif.backgroundStyle === 'art-deco'
      };

      return {
          repeats: repeats.object || repeats.color || repeats.artDeco,
          details: repeats
      };
  }

  // Extract focal anchor and emotional gravity from synopsis (AUTHORITATIVE)
  async function extractFocalObject(synopsis, genre, world, tone) {
      // Default fallback for minimal synopsis
      if (!synopsis || synopsis.length < 20) {
          return {
              object: 'antique key',
              material: 'metal',
              emotion: 'mystery',
              humanFigure: 'none',
              reason: 'default'
          };
      }

      // Derive emotional gravity from tone if not extracted
      const TONE_TO_EMOTION = {
          Earnest: 'yearning',
          WryConfession: 'tension',
          Satirical: 'rebellion',
          Dark: 'foreboding',
          Horror: 'foreboding',
          Mythic: 'inevitability',
          Comedic: 'mystery',
          Surreal: 'mystery',
          Poetic: 'longing'
      };

      try {
          const extraction = await callChat([{
              role: 'user',
              content: `Extract cover elements for a SYMBOLIC book cover (not scene illustration).

SYNOPSIS: "${synopsis}"
GENRE: ${genre}
WORLD: ${world}

DECISIONS NEEDED:

1. EMOTIONAL GRAVITY (choose ONE): foreboding, yearning, pressure, secrecy, rebellion, inevitability, longing, tension, mystery, isolation, devotion, betrayal

2. FOCAL ANCHOR (choose ONE physical object or symbol mentioned/implied):
   - Must be CONCRETE, not abstract
   - NEVER: envelope, generic rose, book, candle, heart shape
   - Prefer objects with story-specific meaning

3. HUMAN FIGURE decision:
   - "none" - object/environment carries meaning
   - "silhouette" - figure as shadow/shape only
   - "turned_away" - figure facing away, no face visible
   - "partial" - hands, shoulders, or fragment only

Return ONLY valid JSON:
{
  "object": "the focal object/symbol",
  "material": "metal|paper|glass|fabric|stone|wood|crystal|gold",
  "emotion": "the dominant emotional gravity",
  "humanFigure": "none|silhouette|turned_away|partial",
  "reason": "brief justification"
}`
          }]);

          // Strip markdown fences if present (```json ... ``` or ``` ... ```)
          let cleanedExtraction = extraction.trim();
          if (cleanedExtraction.startsWith('```')) {
              // Remove opening fence (```json or ```)
              cleanedExtraction = cleanedExtraction.replace(/^```(?:json)?\s*\n?/, '');
              // Remove closing fence
              cleanedExtraction = cleanedExtraction.replace(/\n?```\s*$/, '');
          }
          const parsed = JSON.parse(cleanedExtraction.trim());
          if (parsed.object && parsed.emotion) {
              return parsed;
          }
      } catch (e) {
          console.warn('[CoverIntel] Focal extraction failed:', e.message);
      }

      // Fallback: genre-based default objects with emotion
      const GENRE_DEFAULTS = {
          CrimeSyndicate: { object: 'bloodstained playing card', material: 'paper', emotion: 'foreboding' },
          Billionaire: { object: 'crystal champagne flute', material: 'crystal', emotion: 'pressure' },
          Noir: { object: 'smoldering cigarette trailing smoke', material: 'paper', emotion: 'tension' },
          Heist: { object: 'diamond catching spotlight', material: 'crystal', emotion: 'tension' },
          Espionage: { object: 'torn passport page', material: 'paper', emotion: 'secrecy' },
          Political: { object: 'broken wax seal', material: 'metal', emotion: 'betrayal' },
          Escape: { object: 'shattered chain link', material: 'metal', emotion: 'rebellion' },
          Redemption: { object: 'phoenix feather in ash', material: 'gold', emotion: 'transformation' },
          BuildingBridges: { object: 'two hands almost touching', material: 'fabric', emotion: 'yearning' },
          Purgatory: { object: 'stopped clock face', material: 'metal', emotion: 'isolation' },
          RelentlessPast: { object: 'cracked photograph edge', material: 'paper', emotion: 'foreboding' },
          Sports: { object: 'trophy silhouette in spotlight', material: 'gold', emotion: 'pressure' },
          Survival: { object: 'last match in weathered box', material: 'wood', emotion: 'tension' },
          Obsession: { object: 'pinboard thread stretching taut', material: 'fabric', emotion: 'foreboding' },
          ForbiddenKnowledge: { object: 'opened tome with glowing page', material: 'paper', emotion: 'mystery' }
      };

      const fallback = GENRE_DEFAULTS[genre] || {
          object: 'antique key',
          material: 'metal',
          emotion: TONE_TO_EMOTION[tone] || 'mystery'
      };
      fallback.humanFigure = 'none';
      fallback.reason = 'fallback';

      return fallback;
  }

  // Derive background pattern from domain (genre + world)
  function deriveBackgroundPattern(genre, world, history) {
      // Collect candidates from both genre and world
      const genrePatterns = DOMAIN_BACKGROUNDS[genre] || [];
      const worldPatterns = DOMAIN_BACKGROUNDS[world] || [];
      const allPatterns = [...new Set([...genrePatterns, ...worldPatterns])];

      if (allPatterns.length === 0) {
          // Art-deco is fallback only
          return 'subtle gradient with abstract shapes';
      }

      // Filter out recently used patterns
      const recentBackgrounds = history.map(m => m.backgroundStyle);
      const available = allPatterns.filter(p => !recentBackgrounds.includes(p));

      // If all patterns used recently, reset but avoid art-deco twice in a row
      if (available.length === 0) {
          const lastBg = history[0]?.backgroundStyle;
          return allPatterns.find(p => p !== lastBg) || allPatterns[0];
      }

      // Random selection from available
      return available[Math.floor(Math.random() * available.length)];
  }

  // Derive palette from tone + object material
  function derivePalette(tone, material, history) {
      const basePalette = TONE_PALETTES[tone] || TONE_PALETTES.Earnest;
      const materialShift = MATERIAL_PALETTES[material]?.shift || '';

      // Check if palette would repeat
      const colorFamily = getColorFamily(basePalette.primary);
      const recentFamilies = history.map(m => m.colorFamily);

      // If color family repeats, shift to complementary
      let finalPalette = { ...basePalette };
      if (recentFamilies.includes(colorFamily)) {
          const SHIFTS = {
              warm: { primary: 'cool sapphire', secondary: 'deep teal' },
              cool: { primary: 'warm amber', secondary: 'burgundy' },
              earth: { primary: 'jewel emerald', secondary: 'amethyst' },
              jewel: { primary: 'neutral silver', secondary: 'charcoal' },
              neutral: { primary: 'jewel ruby', secondary: 'gold' },
              nature: { primary: 'warm copper', secondary: 'rust' }
          };
          const shift = SHIFTS[colorFamily] || {};
          finalPalette = { ...basePalette, ...shift };
      }

      // Brown is NEVER default - must be justified by material
      if (finalPalette.primary.includes('brown') && material !== 'wood') {
          finalPalette.primary = basePalette.secondary || 'deep burgundy';
      }

      return {
          ...finalPalette,
          materialNote: materialShift,
          family: getColorFamily(finalPalette.primary)
      };
  }

  // Build intelligent cover prompt with all guardrails (AUTHORITATIVE)
  // PROMPT STRUCTURE ORDER: Layout → Emotion → Focal → Background → Palette → Exclusions
  async function buildCoverPrompt(synopsis, genre, world, tone, dynamic, era) {
      const history = loadMotifHistory();
      const powerRole = resolvePowerRole(world, era, genre);

      // ==========================================
      // STEP 1: LAYOUT ROULETTE (MANDATORY)
      // Select structurally distinct composition
      // ==========================================
      const selectedLayout = selectCoverLayout(history);
      console.log('[CoverIntel] Layout selected:', selectedLayout.id);

      // Extract focal anchor with emotional gravity and human figure decision
      const focalResult = await extractFocalObject(synopsis, powerRole, world, tone);
      const focalObject = focalResult.object;
      const material = focalResult.material || 'metal';
      const emotion = focalResult.emotion || 'mystery';
      const humanFigure = focalResult.humanFigure || 'none';

      // Check for repetition
      const objectClass = getObjectClass(focalObject);
      const repetitionCheck = wouldRepeatMotif(objectClass, null, null);

      // ISSUE 2 FIX: If object class repeats, force TRUE substitution via abstraction ladder
      // NEVER reuse same object in any form (literal, shadow, silhouette, fragment)
      let finalObject = focalObject;
      if (repetitionCheck.details?.object) {
          // Get recently used substitutes to avoid those too
          const usedSubs = history
              .filter(m => m.objectClass === objectClass)
              .map(m => m.substitution)
              .filter(Boolean);
          finalObject = getAbstractionSubstitute(objectClass, usedSubs);
      }

      // Derive background from domain (theme-derived, not decorative)
      // Power Role: Modern keeps raw genre for Billionaire-specific patterns;
      // non-Modern uses powerRole (no match → falls back to world patterns only)
      const bgGenre = world === 'Modern' ? genre : powerRole;
      const backgroundPattern = deriveBackgroundPattern(bgGenre, world, history);

      // Derive palette from tone + material
      // HARD RULE: No brown/cream unless explicitly required by layout
      const palette = derivePalette(tone, material, history);

      // Anti-repetition: avoid art-deco twice in a row AND block cream backgrounds
      let finalBackground = backgroundPattern;
      const recentBgs = history.slice(0, 2).map(m => m.backgroundStyle?.toLowerCase() || '');
      if (backgroundPattern.includes('art-deco') || backgroundPattern.includes('geometric')) {
          if (recentBgs.some(bg => bg.includes('art-deco') || bg.includes('geometric'))) {
              finalBackground = DOMAIN_BACKGROUNDS[world]?.[0] || 'atmospheric gradient with depth';
          }
      }
      // Block cream/parchment unless center_object layout
      if (selectedLayout.id !== 'center_object') {
          if (finalBackground.includes('cream') || finalBackground.includes('parchment')) {
              finalBackground = 'deep atmospheric gradient';
          }
      }

      // Visual restraint rules (layout-aware)
      let restraintText = 'Limited palette (2-3 tones). Soft focus or shallow depth.';
      if (selectedLayout.id === 'negative_space_dominant') {
          restraintText = 'Minimal elements. 70%+ empty space. Single small anchor.';
      } else if (selectedLayout.id === 'fragmented_object') {
          restraintText = 'Object cropped or broken. Tension through incompleteness.';
      } else if (selectedLayout.id === 'off_center_focus') {
          restraintText = 'Strong asymmetry. Directional tension. Off-center weight.';
      }

      // Human figure handling
      let figureText = '';
      if (humanFigure === 'silhouette') {
          figureText = 'Human figure as shadow/silhouette only, no face visible.';
      } else if (humanFigure === 'turned_away') {
          figureText = 'Figure facing away, back to viewer.';
      } else if (humanFigure === 'partial') {
          figureText = 'Only hands or partial body, no face.';
      }

      // Save motif to history (include layout for repetition tracking)
      const wasSubstituted = repetitionCheck.details?.object;
      const newMotif = {
          layoutId: selectedLayout.id,           // Track layout for roulette
          objectClass: objectClass,              // Original class, not substituted
          colorFamily: palette.family,
          backgroundStyle: finalBackground,
          emotion: emotion,
          substitution: wasSubstituted ? finalObject : null,
          timestamp: Date.now()
      };
      saveMotifToHistory(newMotif);

      // Build the authoritative prompt (ORDER MATTERS)
      // Layout → Emotion → Focal → Background → Palette → Restraint → Exclusions
      return {
          layoutId: selectedLayout.id,
          focalObject: finalObject,
          material: material,
          emotion: emotion,
          humanFigure: humanFigure,
          background: finalBackground,
          palette: palette,
          promptText: `LAYOUT: ${selectedLayout.description}
EMOTIONAL GRAVITY: ${emotion} (guides all visual decisions).
FOCAL ANCHOR: ${finalObject} rendered in ${material}, composed per layout.
BACKGROUND: ${finalBackground}. (Support emotion, not decoration.)
PALETTE: ${palette.primary}, ${palette.secondary}. Max 3 tones. ${palette.materialNote}
COMPOSITION: ${restraintText}
${figureText ? figureText + '\n' : ''}${COVER_EXCLUSIONS}`
      };
  }

  // ============================================================
  // PHASE 3A: ARCHETYPE SELECTOR
  // Deterministic world-based archetype — NEVER returns null.
  // Explicit state.coverArchetype overrides world default.
  // Prehistoric / Historical / Fantasy → THRESHOLD
  // SciFi / Modern / Dystopian → EMBLEM
  // ============================================================
  function selectCoverArchetype(genre, dynamic, tone, world, synopsis) {
      // Explicit archetype override (UI or Guided-Fate driven)
      if (state.coverArchetype === 'EMBLEM') return 'EMBLEM';
      if (state.coverArchetype === 'THRESHOLD') return 'THRESHOLD';

      // World-based deterministic default
      if (world === 'Prehistoric' || world === 'Historical' || world === 'Fantasy') {
          return 'THRESHOLD';
      }
      // SciFi, Modern, Dystopian, unknown → EMBLEM
      return 'EMBLEM';
  }

  // Generate book cover with intent-based routing
  // Uses COVER INTELLIGENCE SYSTEM for focal object, anti-repetition, domain backgrounds, palette
  // DSP-lite cover subtitle derived from story shape axes
  function generateCoverSubtitle() {
      const GENRE_PHRASE = {
          Billionaire: 'wealth and want',
          CrimeSyndicate: 'crime and collusion',
          Espionage: 'secrets and espionage',
          Political: 'power and politics',
          Noir: 'shadow and suspicion',
          Heist: 'schemes and daring'
      };
      const DYNAMIC_PHRASE = {
          Enemies: 'rivals become something more',
          Friends: 'friendship ignites',
          Forbidden: 'the forbidden pulls closer',
          Fated: 'destiny refuses to let go',
          SecondChance: 'the past returns uninvited',
          ForcedProximity: 'proximity rewrites the rules',
          OnlyOneBed: 'closeness becomes unavoidable',
          Fake: 'the lie begins to feel real',
          Grumpy: 'opposites collide',
          Boss: 'authority blurs every line',
          Rivals: 'competition sparks something unexpected'
      };
      const WORLD_SHADE = {
          Modern: 'under city lights',
          Fantasy: 'in lands uncharted',
          Romantasy: 'where magic meets desire',
          SciFi: 'among the stars',
          Historical: 'across the ages',
          Dystopia: 'in a world undone',
          PostApocalyptic: 'after the fall',
          Horror: 'in the dark between worlds'
      };

      const genre = state.picks?.genre || 'Billionaire';
      const dynamic = state.picks?.dynamic || 'Enemies';
      const world = state.picks?.world || 'Modern';
      const intensity = state.intensity || 'Naughty';

      const gp = GENRE_PHRASE[genre] || 'intrigue';
      const dp = DYNAMIC_PHRASE[dynamic] || 'two lives collide';
      const wp = WORLD_SHADE[world] || '';
      const storyNoun = (intensity === 'Erotic' || intensity === 'Dirty') ? 'story' : 'tale';

      return 'A Storybound ' + storyNoun + ' of ' + gp + ' where ' + dp + ' ' + wp + '.';
  }

  // ============================================================
  // COVER FALLBACK LIBRARY — deterministic SVG motifs
  // ============================================================

  const COVER_FALLBACK_MOTIFS = {
      Modern:          ['handcuffs', 'key', 'drop'],
      Historical:      ['key', 'skull', 'sun'],
      Dystopia:        ['skull', 'handprint', 'moon'],
      PostApocalyptic: ['skull', 'sun', 'waves'],
      Fantasy:         ['sun', 'stars', 'key'],
      SciFi:           ['stars', 'moon', 'waves'],
      Supernatural:    ['moon', 'key', 'skull'],
      Superheroic:     ['sun', 'stars', 'handprint']
  };

  const COVER_FALLBACK_PALETTES = {
      Modern:          { bg: '#0a0a0a', accent: '#e63946' },
      Historical:      { bg: '#0d0908', accent: '#d4af37' },
      Dystopia:        { bg: '#0a0a0a', accent: '#cccccc' },
      PostApocalyptic: { bg: '#0d0b08', accent: '#c8553d' },
      Fantasy:         { bg: '#0a0a12', accent: '#d4af37' },
      SciFi:           { bg: '#0a1628', accent: '#40e0d0' },
      Supernatural:    { bg: '#0a0a12', accent: '#8b5cf6' },
      Superheroic:     { bg: '#0d0a14', accent: '#e63946' }
  };

  // Inline SVG paths for motif icons (symbolic, no people/bodies)
  const SVG_MOTIF_PATHS = {
      skull: '<path d="M50 15c-18 0-32 14-32 32 0 12 6 22 16 28v10c0 3 2 5 5 5h22c3 0 5-2 5-5V75c10-6 16-16 16-28 0-18-14-32-32-32zm-10 38a5 5 0 110-10 5 5 0 010 10zm20 0a5 5 0 110-10 5 5 0 010 10zm-10 14c-4 0-8-2-8-4h16c0 2-4 4-8 4z"/>',
      handcuffs: '<path d="M30 35c-8 0-15 7-15 15s7 15 15 15c5 0 10-3 12-7h16c2 4 7 7 12 7 8 0 15-7 15-15s-7-15-15-15c-5 0-10 3-12 7H42c-2-4-7-7-12-7zm0 8a7 7 0 110 14 7 7 0 010-14zm40 0a7 7 0 110 14 7 7 0 010-14z"/>',
      key: '<path d="M65 20L50 35l6 6-4 4 6 6-4 4 6 6-8 8c-3 3-8 3-11 0l-1-1c-6 3-14 2-19-3-7-7-7-18 0-25s18-7 25 0c5 5 6 13 3 19l1 1c3 3 3 8 0 11zm-35 30a5 5 0 100-10 5 5 0 000 10z"/>',
      handprint: '<path d="M35 25v20h-3V28c0-2-3-2-3 0v18h-3V30c0-2-3-2-3 0v16l-2 6c-1 3 0 6 2 8l8 10c2 2 4 4 7 4h12c5 0 9-4 9-9V40c0-2-3-2-3 0v10h-3V27c0-2-3-2-3 0v23h-3V25c0-2-3-2-3 0v25h-3V27c0-2-3-2-3 0z"/>',
      drop: '<path d="M50 15C50 15 25 45 25 60c0 14 11 25 25 25s25-11 25-25C75 45 50 15 50 15zm-5 50a3 3 0 01-3-3c0-8 7-15 15-15a3 3 0 010 6c-5 0-9 4-9 9a3 3 0 01-3 3z"/>',
      sun: '<circle cx="50" cy="50" r="15"/><g stroke-width="3" stroke="currentColor"><line x1="50" y1="10" x2="50" y2="22"/><line x1="50" y1="78" x2="50" y2="90"/><line x1="10" y1="50" x2="22" y2="50"/><line x1="78" y1="50" x2="90" y2="50"/><line x1="22" y1="22" x2="31" y2="31"/><line x1="69" y1="69" x2="78" y2="78"/><line x1="78" y1="22" x2="69" y2="31"/><line x1="31" y1="69" x2="22" y2="78"/></g>',
      moon: '<path d="M50 10c-22 0-40 18-40 40s18 40 40 40c8 0 15-2 22-6-6 3-12 4-18 4-20 0-36-16-36-36S34 16 54 16c6 0 12 1 18 4C65 14 58 10 50 10z"/>',
      stars: '<polygon points="50,5 58,35 90,35 64,55 73,85 50,67 27,85 36,55 10,35 42,35"/><polygon points="22,12 25,22 35,22 27,28 30,38 22,32 14,38 17,28 9,22 19,22" transform="scale(0.5) translate(10,10)"/><polygon points="22,12 25,22 35,22 27,28 30,38 22,32 14,38 17,28 9,22 19,22" transform="scale(0.4) translate(180,120)"/>',
      waves: '<path d="M5 50c10-10 20-10 30 0s20 10 30 0 20-10 30 0" fill="none" stroke="currentColor" stroke-width="4"/><path d="M5 65c10-10 20-10 30 0s20 10 30 0 20-10 30 0" fill="none" stroke="currentColor" stroke-width="3" opacity="0.6"/><path d="M5 35c10-10 20-10 30 0s20 10 30 0 20-10 30 0" fill="none" stroke="currentColor" stroke-width="3" opacity="0.6"/>'
  };

  /**
   * Simple hash for deterministic motif selection from genre string
   */
  function genreMotifHash(genre) {
      let h = 0;
      for (let i = 0; i < genre.length; i++) {
          h = ((h << 5) - h + genre.charCodeAt(i)) | 0;
      }
      return Math.abs(h);
  }

  /**
   * Render a deterministic CSS/SVG fallback cover.
   * Selects motif by world + genre hash. Never fails.
   */
  function renderFallbackCover(world, genre, title) {
      const fallbackEl = document.getElementById('coverFallback');
      const coverImg = document.getElementById('bookCoverImg');
      if (!fallbackEl) return;

      const w = world || 'Modern';
      const g = genre || 'Billionaire';
      const motifs = COVER_FALLBACK_MOTIFS[w] || COVER_FALLBACK_MOTIFS.Modern;
      const palette = COVER_FALLBACK_PALETTES[w] || COVER_FALLBACK_PALETTES.Modern;
      const motifKey = motifs[genreMotifHash(g) % motifs.length];
      const svgContent = SVG_MOTIF_PATHS[motifKey] || SVG_MOTIF_PATHS.key;

      // Resolve title: explicit param → storyTitle DOM → empty
      const displayTitle = title
          || document.getElementById('storyTitle')?.textContent
          || '';

      fallbackEl.style.setProperty('--fb-bg', palette.bg);
      fallbackEl.style.setProperty('--fb-accent', palette.accent);

      // Build cover: SVG motif + title cartouche + author line
      let html = '<svg class="cover-fallback-motif" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="' + palette.accent + '" color="' + palette.accent + '">' + svgContent + '</svg>';
      const safeTitle = displayTitle ? displayTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
      html += '<div class="cover-fallback-title" style="color:' + palette.accent + '">' +
          '<span class="cover-fallback-title-rule"></span>' +
          (safeTitle ? '<span class="cover-fallback-title-text">' + safeTitle + '</span>' : '') +
          '<span class="cover-fallback-author">by ANONYMOUS</span>' +
          '<span class="cover-fallback-title-rule"></span>' +
          '</div>';
      fallbackEl.innerHTML = html;

      // Show fallback, hide AI image
      fallbackEl.classList.remove('hidden');
      if (coverImg) coverImg.style.display = 'none';
  }

  /**
   * Apply intensity-based cover overlays.
   * Clean/Naughty → nothing, Erotic → gold border, Dirty → keyhole takeover.
   * Soulmates is a MODIFIER (not intensity) — derived from state.storyLength === 'soulmates'.
   *
   * LOCKED RULES:
   * - Keyhole ONLY appears when arousal === Dirty
   * - Erotic border ALWAYS appears when arousal === Erotic
   * - Soulmates modulates material warmth (adds 'soulmates' class), never introduces keyhole
   */
  function applyCoverIntensityLayers(intensity, world) {
      const borderEl = document.getElementById('coverEroticBorder');
      const keyholeEl = document.getElementById('coverKeyholeOverlay');
      if (!borderEl || !keyholeEl) return;

      // COVER ESCALATION VALIDATION
      // Cover may escalate beyond title baseline, but must not contradict downward
      if (state.titleBaselineArousal) {
          const escalationCheck = validateCoverEscalation(
              state.titleBaselineArousal,  // Title's original arousal
              intensity || 'Naughty',       // Current cover arousal
              state.titleBaselineArousal    // Baseline
          );
          if (!escalationCheck.valid) {
              console.error('[CoverEscalation] BLOCKED:', escalationCheck.error.message);
              // Do not apply de-escalated layers — keep current state
              return;
          }
      }

      // Soulmates is a modifier overlay, derived from story length
      const hasSoulmates = state.storyLength === 'soulmates';

      // Reset both layers
      borderEl.classList.add('hidden');
      borderEl.className = 'cover-erotic-border hidden';
      keyholeEl.classList.add('hidden');
      keyholeEl.classList.remove('soulmates');

      const level = (intensity || '').toLowerCase();

      if (level === 'erotic') {
          // EROTIC: Apply ornamental border (ALWAYS when erotic, regardless of soulmates)
          const w = (world || 'Modern').toLowerCase().replace(/[^a-z]/g, '');
          const worldClass = ['fantasy', 'noir', 'gothic', 'scifi'].includes(w) ? ('world-' + w) : '';
          const soulmatesClass = hasSoulmates ? ' soulmates' : '';
          borderEl.className = 'cover-erotic-border' + (worldClass ? ' ' + worldClass : '') + soulmatesClass;
      } else if (level === 'dirty') {
          // DIRTY: Keyhole takeover (ONLY for Dirty, erotic border removed/subsumed)
          keyholeEl.classList.remove('hidden');
          if (hasSoulmates) {
              // Soulmates + Dirty: warmer, devotional metalwork ("locked by choice")
              keyholeEl.classList.add('soulmates');
          }
          // Set title + author into keyhole metalwork
          const titleEl = keyholeEl.querySelector('.keyhole-title');
          const storyTitle = document.getElementById('storyTitle');
          if (titleEl) {
              const t = storyTitle?.textContent || '';
              titleEl.innerHTML = (t ? '<span class="keyhole-title-text">' + t.replace(/</g, '&lt;') + '</span>' : '') +
                  '<span class="keyhole-author">by ANONYMOUS</span>';
          }
      }
      // Clean/Naughty: no overlay layers (art fully visible)
      // Soulmates alone (non-Erotic, non-Dirty) affects art generation warmth, not cover layers
  }

  /**
   * Reset cover overlay layers (called when resetting book state)
   */
  function resetCoverLayers() {
      const fallbackEl = document.getElementById('coverFallback');
      const borderEl = document.getElementById('coverEroticBorder');
      const keyholeEl = document.getElementById('coverKeyholeOverlay');
      const coverImg = document.getElementById('bookCoverImg');

      if (fallbackEl) { fallbackEl.classList.add('hidden'); fallbackEl.innerHTML = ''; }
      if (borderEl) { borderEl.className = 'cover-erotic-border hidden'; }
      if (keyholeEl) { keyholeEl.classList.add('hidden'); }
      if (coverImg) { coverImg.style.display = ''; }
  }

  // ============================================================
  // COVER SYSTEM — NON-BLOCKING PRINCIPLE (CRITICAL)
  // ============================================================
  // Cover rendering must NEVER block story creation.
  // Failure results in GRACEFUL FALLBACK, not retry or abort.
  //
  // Rules:
  // - All cover generation is async and non-blocking
  // - All failure paths return null → renderFallbackCover()
  // - NO retries, NO loops, NO user-blocking errors
  // - Story creation succeeds even if cover generation fails
  // - Phase 1 Forged Cover is always available as fallback
  // ============================================================

  // ============================================================
  // ASSET AVAILABILITY REGISTRY (Phase 2+)
  // Lists valid objectIds for cover specs
  // If a referenced asset is unavailable → fallback (not retry)
  // ============================================================
  const COVER_ASSET_REGISTRY = {
      // TIER 1 — Anchored PNG assets (preferred)
      objects: new Set([
          'mask_archetype_canonical',
          'wax_seal_standard',
          'relic_key'
      ])
      // NOTE: Framing assets removed — both KEYHOLE and BORDER are now runtime-rendered
      // TEMPORARY MODE: Synthetic erotic borders enabled until explicit asset replacement
  };

  // ============================================================
  // 🧱 ASSET STRUCTURE (REQUIRED)
  // Defines how canonical object assets are stored and referenced
  // ============================================================
  //
  // SCOPE CLARIFICATION:
  // Rules regarding gravity, resting behavior, and non-floating placement apply ONLY at final cover composition time.
  // They do NOT apply to how canonical object assets are stored, rendered, or represented in the asset repository.
  //
  // ============================================================

  // ============================================================
  // 🧩 ASSEMBLY RULES (CRITICAL)
  // Governs how assets are combined into final cover compositions
  // ============================================================
  //
  // OBJECT INTEGRITY:
  // Treat all object assets as rigid physical objects.
  // Do NOT deform, warp, bend, or reshape object geometry to match background topology unless explicitly instructed.
  //
  // DEPTH PRESERVATION:
  // Do NOT flatten, emboss, or convert three-dimensional object details into surface textures during assembly.
  // Preserve perceived depth, volume, and protrusion from the original asset.
  //
  // EDGE HANDLING GUARDRAIL:
  // Do NOT assume object assets are poor quality by default.
  // Some assets may be near-clean chroma-key renders.
  // Apply edge softening or blending ONLY if visual artifacts are present.
  // Never degrade clean edges unnecessarily.
  //
  // CONTACT SHADOW (MANDATORY):
  // All placed objects must cast a contact shadow appropriate to the scene lighting.
  //
  // CONTACT SHADOW SCOPE:
  // Contact shadows are generated ONLY AFTER an object has been keyed and placed onto a background surface.
  // Never bake contact shadows, ambient occlusion, or surface assumptions into the object asset itself.
  //
  // ============================================================

  // ============================================================
  // KEYHOLE FRAMING — RUNTIME RENDER SPECIFICATION
  // Keyholes are NOT asset files. They MUST be rendered by the
  // image model at runtime as physical objects or carved apertures.
  // Claude specifies properties; image model renders.
  // ============================================================
  const KEYHOLE_RENDER_REQUIREMENTS = {
      // Required properties for keyhole spec validation
      required: ['aperture', 'material', 'edgeStyle', 'integration'],
      // Aperture constraints (percentage of cover dimensions)
      aperture: {
          height: { min: 0.65, max: 0.80 },  // 65-80% of cover height
          width: { min: 0.40, max: 0.50 }    // 40-50% of cover width
      },
      // Valid material types
      materials: new Set([
          'brass', 'iron', 'bronze', 'oxidized_copper', 'blackened_steel',
          'carved_wood', 'carved_stone', 'bone', 'obsidian', 'gold_filigree'
      ]),
      // Valid edge styles
      edgeStyles: new Set([
          'beveled', 'chamfered', 'worn', 'sharp', 'ornate', 'weathered', 'forged'
      ]),
      // Integration behaviors (how keyhole meets cover surface)
      integrations: new Set([
          'inset', 'raised', 'flush', 'recessed_shadow', 'embossed'
      ])
  };

  // ============================================================
  // BORDER FRAMING — SYNTHETIC RUNTIME RENDER (TEMPORARY MODE)
  // Until explicit asset replacement, erotic borders MUST be:
  // - Generated by image model at render time
  // - Thin-line only (etched / engraved / diagrammatic)
  // - Flat graphic language (no depth, no bevel, no shadow)
  // - Monochrome or near-monochrome
  // - Symbolic, not illustrative
  // ============================================================
  const BORDER_RENDER_REQUIREMENTS = {
      // Required properties for border spec validation
      required: ['lineStyle', 'motifFamily', 'lineWeight', 'margin'],
      // Valid line styles (flat, no depth)
      lineStyles: new Set([
          'etched', 'engraved', 'continuous', 'dashed', 'dotted'
      ]),
      // Valid motif families (ONE only per border)
      motifFamilies: new Set([
          'filigree', 'restraint', 'floral', 'geometric'
      ]),
      // Valid line weights
      lineWeights: new Set([
          'thin', 'hairline', 'fine'
      ]),
      // Margin constraints (percentage from edge)
      margin: { min: 0.02, max: 0.08 }  // 2-8% from edge
  };

  // BORDER HARD BANS — Claude must NOT include these
  const BORDER_HARD_BANS = [
      'shading', 'texture', 'lighting', 'shadow', 'bevel', 'depth',
      'scene', 'background', 'anatomy', 'explicit', 'body', 'figure'
  ];

  /**
   * Validate border render specification (TEMPORARY SYNTHETIC MODE)
   * Borders are flat graphic elements rendered at runtime, NOT asset files
   * Returns { valid: false } if spec is malformed or violates constraints
   */
  function validateBorderSpec(borderSpec) {
      if (!borderSpec) {
          return { valid: false, reason: 'BORDER_SPEC_MISSING' };
      }

      // Check all required fields present
      for (const field of BORDER_RENDER_REQUIREMENTS.required) {
          if (!borderSpec[field]) {
              return { valid: false, reason: 'BORDER_MISSING_FIELD', missingField: field };
          }
      }

      // Validate line style
      if (!BORDER_RENDER_REQUIREMENTS.lineStyles.has(borderSpec.lineStyle)) {
          return { valid: false, reason: 'BORDER_LINE_STYLE_INVALID', value: borderSpec.lineStyle };
      }

      // Validate motif family (ONE only)
      if (!BORDER_RENDER_REQUIREMENTS.motifFamilies.has(borderSpec.motifFamily)) {
          return { valid: false, reason: 'BORDER_MOTIF_INVALID', value: borderSpec.motifFamily };
      }

      // Validate line weight
      if (!BORDER_RENDER_REQUIREMENTS.lineWeights.has(borderSpec.lineWeight)) {
          return { valid: false, reason: 'BORDER_LINE_WEIGHT_INVALID', value: borderSpec.lineWeight };
      }

      // Validate margin distance
      const reqMargin = BORDER_RENDER_REQUIREMENTS.margin;
      if (borderSpec.margin < reqMargin.min || borderSpec.margin > reqMargin.max) {
          return { valid: false, reason: 'BORDER_MARGIN_INVALID', value: borderSpec.margin };
      }

      return { valid: true };
  }

  /**
   * Validate keyhole render specification
   * Keyholes are physical objects rendered at runtime, NOT asset references
   * Returns { valid: false } if spec is malformed or missing required fields
   */
  function validateKeyholeSpec(keyholeSpec) {
      if (!keyholeSpec) {
          return { valid: false, reason: 'KEYHOLE_SPEC_MISSING' };
      }

      // Check all required fields present
      for (const field of KEYHOLE_RENDER_REQUIREMENTS.required) {
          if (!keyholeSpec[field]) {
              return { valid: false, reason: 'KEYHOLE_MISSING_FIELD', missingField: field };
          }
      }

      // Validate aperture proportions
      const { aperture } = keyholeSpec;
      const reqAperture = KEYHOLE_RENDER_REQUIREMENTS.aperture;
      if (aperture.height < reqAperture.height.min || aperture.height > reqAperture.height.max) {
          return { valid: false, reason: 'KEYHOLE_APERTURE_HEIGHT_INVALID', value: aperture.height };
      }
      if (aperture.width < reqAperture.width.min || aperture.width > reqAperture.width.max) {
          return { valid: false, reason: 'KEYHOLE_APERTURE_WIDTH_INVALID', value: aperture.width };
      }

      // Validate material
      if (!KEYHOLE_RENDER_REQUIREMENTS.materials.has(keyholeSpec.material)) {
          return { valid: false, reason: 'KEYHOLE_MATERIAL_INVALID', value: keyholeSpec.material };
      }

      // Validate edge style
      if (!KEYHOLE_RENDER_REQUIREMENTS.edgeStyles.has(keyholeSpec.edgeStyle)) {
          return { valid: false, reason: 'KEYHOLE_EDGE_INVALID', value: keyholeSpec.edgeStyle };
      }

      // Validate integration
      if (!KEYHOLE_RENDER_REQUIREMENTS.integrations.has(keyholeSpec.integration)) {
          return { valid: false, reason: 'KEYHOLE_INTEGRATION_INVALID', value: keyholeSpec.integration };
      }

      return { valid: true };
  }

  /**
   * ASSET AVAILABILITY RULE — Phase 2+ safety gate
   * If a referenced objectId is unavailable at render time:
   * - Abort custom generation
   * - Return null (triggers Phase 1 Forged Cover fallback)
   * - No substitution, no invention, no additional AI calls
   *
   * FRAMING EXCEPTIONS (TEMPORARY MODE):
   * - KEYHOLE: runtime-rendered physical aperture; validate keyholeSpec
   * - BORDER: runtime-rendered synthetic line art; validate borderSpec
   * Both are generated by image model, NOT asset files.
   */
  function validateCoverAssets(coverSpec) {
      if (!coverSpec) return { valid: true };

      const { objectId, framing, keyholeSpec, borderSpec } = coverSpec;

      // Check objectId availability (TIER 1 assets only)
      if (objectId && !COVER_ASSET_REGISTRY.objects.has(objectId)) {
          console.warn('[CoverAsset] UNAVAILABLE objectId:', objectId, '→ aborting custom generation');
          return { valid: false, reason: 'OBJECT_UNAVAILABLE', missingAsset: objectId };
      }

      // KEYHOLE FRAMING — runtime render, physical aperture
      if (framing === 'KEYHOLE') {
          const keyholeValidation = validateKeyholeSpec(keyholeSpec);
          if (!keyholeValidation.valid) {
              console.warn('[CoverAsset] Invalid keyholeSpec:', keyholeValidation.reason, '→ aborting custom generation');
              return keyholeValidation;
          }
          return { valid: true };
      }

      // BORDER FRAMING — runtime render, synthetic line art (TEMPORARY MODE)
      if (framing === 'BORDER') {
          const borderValidation = validateBorderSpec(borderSpec);
          if (!borderValidation.valid) {
              console.warn('[CoverAsset] Invalid borderSpec:', borderValidation.reason, '→ aborting custom generation');
              return borderValidation;
          }
          return { valid: true };
      }

      // NONE framing — no framing validation needed
      return { valid: true };
  }

  /**
   * Generate book cover via image model (Phase 2+ only)
   * NON-BLOCKING: Returns null on ANY failure → triggers fallback at call site
   * NEVER retries, NEVER throws, NEVER blocks story creation
   */
  async function generateBookCover(synopsis, title, authorName) {
      // Extract story context for symbolic object selection (4-axis system)
      const world = state.picks?.world || 'Modern';
      const tone = state.picks?.tone || 'Earnest';
      const genre = state.picks?.genre || 'Billionaire';
      const dynamic = state.picks?.dynamic || 'Enemies';
      const era = state.picks?.world === 'Historical' ? (state.picks?.era || 'Medieval') : null;
      // Power Role + Power Frame: resolve genre into world-appropriate labels
      const powerRole = resolvePowerRole(world, era, genre);
      const powerFrame = resolvePowerFrame(world, genre);
      // Extract arousal/intensity
      const arousal = state.intensity || null;

      // Archetype selection — deterministic, world-based, never null
      const archetype = selectCoverArchetype(genre, dynamic, tone, world, synopsis);

      // DEV LOGGING: generation-time state snapshot
      console.log('[DEV:CoverGen] world:', world, '| tone:', tone, '| genre:', genre, '→ powerRole:', powerRole, '| archetype:', archetype, '| arousal:', arousal);
      console.log('[DEV:WorldResolve] world:', world, '| genre:', genre, '→ archetype:', archetype, '| powerFrame:', powerFrame);

      // DSP-lite subtitle replaces series label
      const modeLine = generateCoverSubtitle();
      // Build story style description
      const storyStyle = `${tone} ${powerRole}`;

      // COVER INTELLIGENCE: Build intelligent prompt with focal object, anti-repetition, domain background, palette
      let coverIntel = null;
      try {
          coverIntel = await buildCoverPrompt(synopsis, genre, world, tone, dynamic, era);
          console.log('[CoverIntel] Focal object:', coverIntel.focalObject);
          console.log('[CoverIntel] Background:', coverIntel.background);
          console.log('[CoverIntel] Palette:', coverIntel.palette.primary, '/', coverIntel.palette.secondary);

          // Store cover emotion for later validation
          state.coverEmotion = coverIntel.emotion || 'mystery';

          // SIGNAL ALIGNMENT CHECK — validate title ↔ cover consistency
          const signalCheck = validateSignalAlignment(title, coverIntel, {
              arousal: arousal || 'Naughty',
              tone: tone,
              genre: genre
          });
          if (!signalCheck.aligned) {
              console.warn('[SignalAlignment] Title ↔ Cover mismatch:', signalCheck.errors.map(e => e.message));
              // Log for analytics but don't block generation
              // Future: could trigger title adjustment or cover prompt modification
          } else {
              console.log('[SignalAlignment] PASS — Title and cover signal same axis');
          }
      } catch (intelErr) {
          console.warn('[CoverIntel] Intelligence extraction failed, using fallback:', intelErr.message);
      }

      // Build enhanced prompt with cover intelligence (symbolic only — no story prose)
      const enhancedPrompt = coverIntel
          ? coverIntel.promptText
          : 'A dramatic symbolic book cover with atmospheric lighting, no text, no people';

      // ============================================================
      // ASSET AVAILABILITY RULE — Phase 2+ safety gate
      // If coverIntel specifies unavailable assets, abort to fallback
      // No substitution, no invention, no additional AI calls
      // ============================================================
      if (coverIntel?.coverSpec) {
          const assetCheck = validateCoverAssets(coverIntel.coverSpec);
          if (!assetCheck.valid) {
              console.warn('[BookCover] Asset unavailable:', assetCheck.missingAsset, '→ aborting to Phase 1 fallback');
              return null; // Triggers renderFallbackCover at call site
          }
      }

      try {
          // Use global abort controller for cancellation support
          const signal = _coverAbortController?.signal;

          const res = await fetch(IMAGE_PROXY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: signal,
              body: JSON.stringify({
                  prompt: enhancedPrompt,
                  imageIntent: 'book_cover',
                  title: title || 'Untitled',
                  authorName: authorName || 'ANONYMOUS',
                  modeLine: modeLine,
                  dynamic: dynamic,
                  storyStyle: storyStyle,
                  genre: powerRole,
                  size: '1024x1024',
                  // Pass cover intelligence metadata for server-side use
                  coverIntel: coverIntel ? {
                      focalObject: coverIntel.focalObject,
                      material: coverIntel.material,
                      background: coverIntel.background,
                      palette: {
                          primary: coverIntel.palette.primary,
                          secondary: coverIntel.palette.secondary,
                          accent: coverIntel.palette.accent
                      }
                  } : null,
                  // Phase 2b: New params (plumbing only, not yet used by API)
                  archetype: archetype,
                  arousal: arousal,
                  world: world,
                  era: era
              })
          });

          if (!res.ok) {
              console.warn('[BookCover] HTTP error:', res.status);
              return null;
          }

          const data = await res.json();
          return data?.url || null;
      } catch (err) {
          // Handle abort gracefully (not an error)
          if (err.name === 'AbortError') {
              console.log('[BookCover] Generation aborted by user');
              return null;
          }
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
  let _settingImagePromise = Promise.resolve(); // Gate for opening spread readiness

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

  // ============================================================
  // BOOK PAGE TYPE DEFINITIONS (Authoritative Spec)
  // ============================================================
  // Page sequence: COVER (0) → INSIDE_COVER (1) → SCENE (2+)
  // Each page type has strict content rules.
  const BOOK_PAGE_TYPES = {
      COVER: 'cover',              // Page 0: Front cover visual only (no text)
      INSIDE_COVER: 'inside_cover', // Page 1: Title + synopsis (NO image generation)
      SCENE: 'scene'               // Page 2+: Scene text (setting image INLINE if present)
  };

  // BOOK PAGE STATE MACHINE
  // Explicit page index — NOT boolean flags
  let _bookPageIndex = 0; // 0=cover, 1=inside_cover, 2+=scene

  /**
   * Set the current book page with explicit visibility control.
   * Each page type has ONE valid render state.
   * @param {number} pageIndex - 0=cover, 1=setting, 2=scene
   */
  function setBookPage(pageIndex) {
      const oldIndex = _bookPageIndex;
      _bookPageIndex = pageIndex;
      console.log('[DEBUG PAGE STATE] setBookPage:', oldIndex, '→', pageIndex);

      const bookCoverPage = document.getElementById('bookCoverPage');
      const bookCover = document.getElementById('bookCover');
      const storyContent = document.getElementById('storyContent');
      const settingPlate = document.getElementById('settingPlate');
      const storyTitle = document.getElementById('storyTitle');
      const sceneNumber = document.getElementById('sceneNumber');
      const storyText = document.getElementById('storyText');

      // Reset all visibility first
      if (bookCoverPage) bookCoverPage.classList.remove('hidden', 'page-flip-out');
      if (storyContent) storyContent.classList.remove('hidden', 'fade-in');
      if (settingPlate) settingPlate.classList.remove('hidden', 'setting-active');
      if (storyTitle) storyTitle.classList.remove('hidden');
      if (sceneNumber) sceneNumber.classList.remove('hidden');
      if (storyText) storyText.classList.remove('hidden');

      // Apply page-specific visibility
      if (pageIndex === 0) {
          // PAGE 0: COVER — Only cover visible
          console.log('[DEBUG PAGE CLASSIFY] decision=COVER, pageIndex=', pageIndex);
          if (bookCoverPage) bookCoverPage.classList.remove('hidden');
          if (storyContent) storyContent.classList.add('hidden');
          if (settingPlate) settingPlate.classList.add('hidden');
          console.log('[BookPage] Page 0: COVER');
      } else if (pageIndex === 1) {
          // PAGE 1: INSIDE_COVER — Title + synopsis (NO image generation)
          console.log('[DEBUG PAGE CLASSIFY] decision=INSIDE_COVER, pageIndex=', pageIndex);
          if (bookCoverPage) bookCoverPage.classList.add('hidden');
          // Show inside cover content area
          const insideCover = document.getElementById('bookInsideCover');
          if (insideCover) insideCover.classList.remove('hidden');
          // Hide story content and setting plate on inside cover
          if (storyContent) storyContent.classList.add('hidden');
          if (settingPlate) settingPlate.classList.add('hidden');
          console.log('[BookPage] Page 1: INSIDE_COVER');
      } else if (pageIndex >= 2) {
          // PAGE 2+: SCENE — Scene text with setting image INLINE (not fullscreen)
          console.log('[DEBUG PAGE CLASSIFY] decision=SCENE, pageIndex=', pageIndex);
          if (bookCoverPage) bookCoverPage.classList.add('hidden');
          // Hide inside cover
          const insideCover = document.getElementById('bookInsideCover');
          if (insideCover) insideCover.classList.add('hidden');
          // Show story content
          if (storyContent) storyContent.classList.remove('hidden');
          // Setting plate should be INLINE within storyContent, not fullscreen
          // Only show if scene 1 and setting image exists
          if (settingPlate && pageIndex === 2) {
              settingPlate.classList.remove('hidden');
              settingPlate.classList.add('setting-inline'); // Inline mode, not fullscreen
          } else if (settingPlate) {
              settingPlate.classList.add('hidden');
          }
          // Show title and scene
          if (storyTitle) storyTitle.classList.remove('hidden');
          if (sceneNumber) sceneNumber.classList.remove('hidden');
          if (storyText) {
              storyText.classList.remove('hidden');
              storyText.style.opacity = '1';
          }
          console.log('[BookPage] Page 2+: SCENE');
      }

      // Validate page integrity
      const flowCheck = validateBookFlowIntegrity();
      if (!flowCheck.valid) {
          console.error('[BookPage] INTEGRITY FAIL at page ' + pageIndex, flowCheck.errors);
      }
  }

  /**
   * Advance to the next book page with appropriate transition.
   */
  function advanceBookPage() {
      const nextPage = _bookPageIndex + 1;
      const currentType = _bookPageIndex === 0 ? 'cover' : _bookPageIndex === 1 ? 'inside_cover' : 'scene';
      const nextType = nextPage === 0 ? 'cover' : nextPage === 1 ? 'inside_cover' : 'scene';
      console.log('[DEBUG PAGE MOUNT] advanceBookPage: current=', _bookPageIndex, '(' + currentType + ') → next=', nextPage, '(' + nextType + ')');
      setBookPage(nextPage);
  }

  /**
   * Go back to previous book page.
   * Returns true if navigated within book, false if at cover (should exit book).
   */
  function previousBookPage() {
      if (_bookPageIndex <= 0) {
          return false; // At cover, can't go back within book
      }
      const prevPage = _bookPageIndex - 1;
      const currentType = _bookPageIndex === 0 ? 'cover' : _bookPageIndex === 1 ? 'inside_cover' : 'scene';
      const prevType = prevPage === 0 ? 'cover' : prevPage === 1 ? 'inside_cover' : 'scene';
      console.log('[DEBUG PAGE MOUNT] previousBookPage: current=', _bookPageIndex, '(' + currentType + ') → prev=', prevPage, '(' + prevType + ')');
      setBookPage(prevPage);
      return true;
  }

  /**
   * VALIDATION GUARD: Book flow integrity check
   * Ensures page content rules are not violated.
   * Returns { valid: true } or { valid: false, error: string, violation: string }
   */
  function validateBookFlowIntegrity() {
      const errors = [];
      console.log('[DEBUG PAGE STATE] validateBookFlowIntegrity: _bookPageIndex=', _bookPageIndex);

      // CHECK 1: Inside cover (page 1) must have title+synopsis text, but NO generated images
      const insideCover = document.getElementById('bookInsideCover');
      if (_bookPageIndex === 1 && insideCover) {
          const hasGeneratedImages = insideCover.querySelectorAll('img:not(.decorative)').length > 0;
          const hasTitle = !!insideCover.querySelector('.inside-cover-title');
          const hasSynopsis = !!insideCover.querySelector('.inside-cover-synopsis');
          console.log('[DEBUG PAGE STATE] insideCover check: hasTitle=', hasTitle, 'hasSynopsis=', hasSynopsis, 'hasGeneratedImages=', hasGeneratedImages);
          if (hasGeneratedImages) {
              errors.push({ code: 'INSIDE_COVER_HAS_IMAGES', message: 'Inside cover contains generated images (should be text only)' });
          }
          if (!hasTitle) {
              errors.push({ code: 'INSIDE_COVER_MISSING_TITLE', message: 'Inside cover missing title' });
          }
          if (!hasSynopsis) {
              errors.push({ code: 'INSIDE_COVER_MISSING_SYNOPSIS', message: 'Inside cover missing synopsis' });
          }
      }

      // CHECK 2: On page 2 (Scene 1), setting image should be INLINE, not fullscreen
      const settingPlate = document.getElementById('settingPlate');
      if (_bookPageIndex === 2 && settingPlate && !settingPlate.classList.contains('hidden')) {
          if (!settingPlate.classList.contains('setting-inline')) {
              errors.push({ code: 'SETTING_NOT_INLINE', message: 'Setting plate should be inline on Scene 1, not fullscreen' });
          }
      }

      // CHECK 3: On page 3+, setting plate MUST be hidden (only Scene 1 has setting image)
      if (_bookPageIndex > 2 && settingPlate && !settingPlate.classList.contains('hidden')) {
          errors.push({ code: 'SETTING_VISIBLE_AFTER_SCENE1', message: 'Setting plate visible after Scene 1 (page ' + _bookPageIndex + ')' });
      }

      // CHECK 4: On page 1 (inside cover), scene content MUST be hidden
      if (_bookPageIndex === 1) {
          const storyContent = document.getElementById('storyContent');
          if (storyContent && !storyContent.classList.contains('hidden')) {
              errors.push({ code: 'SCENE_VISIBLE_ON_INSIDE_COVER', message: 'Scene content visible on inside cover' });
          }
      }

      if (errors.length > 0) {
          console.error('[BOOK FLOW] Integrity violations:', errors);
          return { valid: false, errors };
      }

      return { valid: true };
  }

  // Expose for DevHUD
  window.validateBookFlowIntegrity = validateBookFlowIntegrity;
  window.BOOK_PAGE_TYPES = BOOK_PAGE_TYPES;

  // Open book via hinge animation (triggered by clicking anywhere on book)
  const BOOK_DWELL_MS = 4000; // Time setting page shows before Scene 1

  function openBook() {
      if (_bookOpened) return;
      _bookOpened = true;
      console.log('[DEBUG PAGE MOUNT] openBook: _bookPageIndex=', _bookPageIndex, 'transitioning cover→inside_cover→scene');
      cancelCourtesyHinge();

      const bookCover = document.getElementById('bookCover');

      // Remove any courtesy peek class and start hinge animation
      if (bookCover) {
          bookCover.classList.remove('courtesy-peek');
          bookCover.classList.add('hinge-open'); // Start hinge animation - reveals inside cover
      }

      // STEP 1: Hinge animation plays for 800ms, showing inside cover
      setTimeout(() => {
          // CRITICAL: Force-hide DSP before showing Page 1 (prevents synopsis overlay)
          if (typeof hideDSP === 'function') hideDSP();
          // Verify inside cover is populated (sanity check)
          const insideCover = document.getElementById('bookInsideCover');
          console.log('[DEBUG PAGE STATE] openBook gate: insideCover=', !!insideCover, 'hasTitle=', !!insideCover?.querySelector('.inside-cover-title'), '_bookPageIndex=', _bookPageIndex);
          if (insideCover && !insideCover.querySelector('.inside-cover-title')) {
              console.warn('[BookFlow] Inside cover not populated — check story generation');
          }
          setBookPage(1); // Inside cover (title + synopsis, NO image)

          // STEP 2: After dwell, transition to SCENE page (page 2)
          setTimeout(async () => {
              // Wait for setting image before showing scene (image is INLINE, not fullscreen)
              await _settingImagePromise.catch(() => {}); // Swallow errors — fallback already handled
              advanceBookPage(); // Transitions to page 2 (scene)

              // BOOK FLOW: Validate integrity after showing Scene 1
              const flowCheck = validateBookFlowIntegrity();
              if (!flowCheck.valid) {
                  console.error('[BOOK FLOW] HARD FAIL: Page integrity violated', flowCheck.errors);
              }

              // Scroll to story title (page 2 content)
              const scrollTarget = document.getElementById('storyTitle');
              if (scrollTarget) {
                  scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }

              // Deactivate Guided Fate visuals after dwell completes
              if (typeof deactivateGuidedFateVisuals === 'function') {
                  deactivateGuidedFateVisuals();
              }
          }, BOOK_DWELL_MS);
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
      const oldIndex = _bookPageIndex;
      _bookOpened = false;
      _bookPageIndex = 0; // Reset to cover page
      console.log('[DEBUG PAGE MOUNT] resetBookState: oldIndex=', oldIndex, '→ 0, pageType=cover (reset)');
      console.log('[DEBUG PAGE MOUNT] containers at reset: bookCoverPage=', document.getElementById('bookCoverPage')?.id, 'settingPlate=', document.getElementById('settingPlate')?.id, 'storyContent=', document.getElementById('storyContent')?.id);
      _settingImagePromise = Promise.resolve(); // Reset for new story
      cancelCourtesyHinge();
      resetCoverLayers();
      const bookCover = document.getElementById('bookCover');
      if (bookCover) {
          bookCover.classList.remove('hinge-open', 'courtesy-peek');
      }
      // Reset setting plate visibility
      const settingPlate = document.getElementById('settingPlate');
      if (settingPlate) {
          settingPlate.classList.remove('hidden', 'setting-active', 'page-flip-out');
      }
      // Reset right-page scene art
      const sceneImg = document.getElementById('bookSceneImg');
      const sceneLoading = document.getElementById('bookSceneLoading');
      if (sceneImg) { sceneImg.src = ''; sceneImg.style.display = 'none'; }
      if (sceneLoading) { sceneLoading.style.display = ''; sceneLoading.textContent = 'Conjuring the world\u2026'; }
  }

  // Hide cover page and show story content directly (fallback if cover fails)
  function skipCoverPage() {
      // Stop any running cover loading intervals
      if (_coverPhraseInterval) clearInterval(_coverPhraseInterval);
      if (_coverProgressInterval) clearInterval(_coverProgressInterval);
      cancelCourtesyHinge();

      // Jump directly to scene page (skip setting page for fallback)
      setBookPage(2);
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

  // ── Visualize Helpers (Pure Story Shape Reflection) ──

  function getVisualizeWorldToneBias() {
      const parts = [];
      if (state.picks?.world) parts.push('World: ' + state.picks.world);
      if (state.picks?.tone) parts.push('Tone: ' + state.picks.tone);
      if (state.picks?.genre) parts.push('Genre: ' + state.picks.genre);
      if (state.picks?.dynamic) parts.push('Dynamic: ' + state.picks.dynamic);
      if (state.intensity) parts.push('Intensity: ' + state.intensity);
      return parts.length
          ? parts.join('. ') + '. Render visuals that accurately reflect the story\'s declared world, tone, genre, dynamic, and intensity. Do not add or remove mood.'
          : 'Render visuals that accurately reflect the current story. Do not add or remove mood.';
  }

  function getSceneVisualSignals(text) {
      const signals = [];
      if (/(crowd|gather|audience|spectators|onlookers)\b/i.test(text)) signals.push('Crowd or audience present');
      if (/(alone|solitary|by (her|him|them)self|isolated)\b/i.test(text)) signals.push('Character is alone');
      if (/(touch|grip|press|hold|embrace|hand)\b/i.test(text)) signals.push('Physical contact occurring');
      if (/(sword|blade|weapon|dagger|bow|gun|shield)\b/i.test(text)) signals.push('Weapon present');
      if (/(glance|gaze|stare|watch|eye|look)\b/i.test(text)) signals.push('Directed gaze or eye contact');
      return signals;
  }

  function resolveVisualFocus(text) {
      let focus = 'balanced framing of all present characters';
      if (/(I |my |me |myself)\b/i.test(text)) focus = 'POV-anchored composition favoring the narrator';
      if (/(she step|he step|they step|she move|he move|she turn|he turn|she raise|he raise)\b/i.test(text)) focus = 'focus on the character initiating action';
      if (/(watch|stare at|observe|gaze at|eye.*on)\b/i.test(text)) focus = 'focus on the character being observed';
      if (/(close|breath|whisper|touch|press.*against)\b/i.test(text)) focus = 'intimate proximity framing';
      return focus;
  }

  function resolveCameraDistance(text) {
      let distance = 'medium framing';
      if (/(touch|hand|grip|press|pull|whisper|breath|close|against)\b/i.test(text)) distance = 'close framing';
      if (/(approach|step|turn|face|block|stand before)\b/i.test(text)) distance = 'medium framing';
      if (/(arena|crowd|stadium|hall|city|vast|sprawling|towering)\b/i.test(text)) distance = 'wide framing';
      return distance;
  }

  function resolveLightingCondition(text) {
      let lighting = 'neutral ambient lighting';
      if (/(dark|dim|shadow|night|torch|candle|lantern|flicker|low light)\b/i.test(text)) lighting = 'low-light conditions with limited illumination';
      if (/(spotlight|beam|shaft of light|backlit|rim light|glow from|lit by)\b/i.test(text)) lighting = 'directional lighting with strong highlights and shadow contrast';
      if (/(sunlight|daylight|bright|open sky|well-lit|flooded with light)\b/i.test(text)) lighting = 'even, well-lit conditions with broad visibility';
      return lighting;
  }

  function resolveCompositionDensity(text) {
      let density = 'balanced composition with primary subjects clearly separated from background';
      if (/(alone|single|one of them|isolated|only one)\b/i.test(text)) density = 'sparse composition with a single primary subject';
      if (/(two of them|both|pair|together|between them)\b/i.test(text)) density = 'focused composition centered on a small group';
      if (/(crowd|spectators|many|dozens|packed|surrounding)\b/i.test(text)) density = 'dense composition with multiple figures sharing the frame';
      return density;
  }

  // ── Visualize Prompt Builders (routing targets) ──

  function buildSettingVisualizePrompt() {
      const sWorld = (state.picks && state.picks.world) || 'Unknown';
      const sTone = (state.picks && state.picks.tone) || 'Unknown';
      const sGenre = (state.picks && state.picks.genre) || 'Unknown';
      const sDynamic = (state.picks && state.picks.dynamic) || 'Unknown';
      const sIntensity = state.intensity || 'Unknown';

      return `SETTING VISUAL — ESTABLISHING ENVIRONMENT ONLY

WORLD: ${sWorld}
TONE: ${sTone}
GENRE: ${sGenre}
DYNAMIC: ${sDynamic}
INTENSITY: ${sIntensity}

COMPOSITION:
- Wide or architectural establishing view
- Environment-focused, not character-focused
- Spatial layout clearly readable

LIGHTING:
- Appropriate to the declared world and tone
- Natural or ambient sources only

CONTENT RULES:
- Do not depict people, faces, bodies, or interactions
- Do not imply an event, action, or narrative moment
- Do not introduce symbolism or mood beyond what the setting itself conveys
- Objects may be present only as part of the environment, at rest

Render the setting as a neutral, grounded place that could host a story,
but does not depict the story itself.

Return only the visual description.`;
  }

  function buildSceneVisualizePrompt(lastText, anchorText) {
      const intensityBias = getVisualizeIntensityBias();
      const worldToneBias = getVisualizeWorldToneBias();
      const sceneSignals = getSceneVisualSignals(lastText);
      const sceneCtx = sceneSignals.length ? '- ' + sceneSignals.join('\n- ') : '- No additional scene constraints';
      const focusDirective = resolveVisualFocus(lastText);
      const cameraDistance = resolveCameraDistance(lastText);
      const lightingCondition = resolveLightingCondition(lastText);
      const compositionDensity = resolveCompositionDensity(lastText);

      return `${anchorText}\n\nYou are writing an image prompt. Follow these continuity anchors strictly. Describe this scene for an image generator. Maintain consistent character details and attire.\n\nWORLD/TONE: ${worldToneBias}\n\nINTENSITY GUIDANCE: ${intensityBias}\n\nCAMERA FOCUS:\n- ${focusDirective}\n\nCAMERA DISTANCE:\n- ${cameraDistance}\n\nLIGHTING:\n- ${lightingCondition}\n\nCOMPOSITION:\n- ${compositionDensity}\n\nSCENE CONTEXT:\n${sceneCtx}\n\nRender exactly what is happening in this scene. Do not invent characters, events, symbolism, or emotional subtext.\n\nReturn only the prompt: ${lastText}`;
  }

  function buildVisualizePrompt({ mode, lastText, anchorText }) {
      if (mode === 'setting') {
          return buildSettingVisualizePrompt();
      }
      return buildSceneVisualizePrompt(lastText, anchorText);
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

  // ============================================================
  // IMAGE PROMPT LENGTH — SAFETY FALLBACK (3000 chars)
  // ============================================================
  // This is a SAFETY FALLBACK, not an artistic constraint.
  // Full prompts up to 3000 chars pass through intact for richer visuals.
  // Truncation only occurs if prompt exceeds provider limits.
  // CRITICAL: This function is for IMAGE/VISUALIZATION prompts ONLY.
  // Story generation prompts must NEVER be truncated.
  // ============================================================
  const MAX_IMAGE_PROMPT_LENGTH = 3000;

  /**
   * Clamp prompt length for image generation ONLY (safety fallback).
   * Full prompts pass through up to 3000 chars for maximum visual richness.
   * @param {string} prompt - The prompt to clamp
   * @param {string} context - REQUIRED: 'image-gen' | 'visualization' | 'story-gen'
   * @returns {string} - Clamped prompt (or original for story-gen)
   */
  function clampPromptLength(prompt, context) {
      // GATE: Story prompts must NEVER be truncated
      if (context === 'story-gen') {
          console.error('[PROMPT-GUARD] FATAL: clampPromptLength called with story-gen context. Story prompts must NOT be truncated.');
          throw new Error('PROMPT_TRUNCATION_BLOCKED: Story generation prompts cannot be truncated.');
      }

      // GATE: Only allow explicit image/visualization contexts
      if (context !== 'image-gen' && context !== 'visualization') {
          console.error(`[PROMPT-GUARD] FATAL: clampPromptLength called with unknown context: ${context}`);
          throw new Error(`PROMPT_TRUNCATION_BLOCKED: Unknown context "${context}". Use 'image-gen' or 'visualization'.`);
      }

      // Safety fallback: truncate only if exceeding provider limits
      if (prompt.length > MAX_IMAGE_PROMPT_LENGTH) {
          console.warn(`[IMAGE-GEN] Safety fallback: prompt truncated ${prompt.length} -> ${MAX_IMAGE_PROMPT_LENGTH}`);
          return prompt.substring(0, MAX_IMAGE_PROMPT_LENGTH);
      }
      return prompt;
  }

  // Soft threshold for story prompt size warning (does NOT truncate)
  const STORY_PROMPT_SOFT_LIMIT = 50000;

  /**
   * Validate story prompt size (debug logging only, no truncation).
   * @param {string} prompt - The full assembled story prompt
   * @param {string} label - Descriptive label for logging
   */
  function validateStoryPromptSize(prompt, label = 'story-prompt') {
      if (!prompt) return;
      if (prompt.length > STORY_PROMPT_SOFT_LIMIT) {
          console.warn(`[STORY-GEN-DEBUG] ${label} exceeds soft limit: ${prompt.length} chars (limit: ${STORY_PROMPT_SOFT_LIMIT})`);
      }
  }

  // FLUX PROMPT HARD CONSTRAINTS (MANDATORY)
  const FLUX_PROMPT_PREFIX = 'Painterly cinematic realism, oil-painting style, realistic anatomy, natural proportions, non-anime.';
  const FLUX_PROMPT_SUFFIX = 'Single subject unless explicitly stated. Correct human anatomy. No extra limbs. No extra people.';

  // PERCHANCE PROMPT HARD CONSTRAINTS (MANDATORY)
  const PERCHANCE_PROMPT_PREFIX = 'default Art Style is oil painting 70s pulp, cinematic lighting, realistic proportions, oil-painting style, non-anime.';
  const PERCHANCE_PROMPT_SUFFIX = 'Single subject unless explicitly stated. Correct human anatomy. One head, two arms, two legs. No extra limbs. No extra people.';

  // ============================================================
  // VISUAL INTENT GUARD (Attractiveness + Lighting Enforcement)
  // ============================================================
  // Enforces: attractive subjects, balanced lighting, erotic-adjacent beauty
  // Darkness/grime only when tone explicitly requires it
  // Applied to ALL visualization prompts (initial, re-visualize, auto-refresh)
  // ============================================================

  const VISUAL_INTENT_ATTRACTIVENESS = 'Subjects are attractive with healthy, glowing skin and appealing features. Soft, flattering lighting. Avoid harsh shadows on faces. Beauty-forward rendering.';

  const VISUAL_INTENT_LIGHTING_DEFAULT = 'Balanced, warm lighting. Avoid desaturated or overly dark palettes unless scene explicitly demands it. Skin tones should be warm and natural, never grey or washed out.';

  // Tones that permit dark/grim rendering (override attractiveness defaults)
  const DARK_TONE_OVERRIDES = ['Dark', 'Grim', 'Horror', 'Noir'];

  /**
   * Apply Visual Intent Guard to a prompt
   * Enforces attractiveness and balanced lighting by default
   * @param {string} prompt - The visualization prompt
   * @param {object} context - { tone, world, intensity }
   * @returns {string} - Enhanced prompt with visual intent enforcement
   */
  function applyVisualIntentGuard(prompt, context = {}) {
      const tone = context.tone || state.picks?.tone || 'Earnest';
      const world = context.world || state.picks?.world || 'Modern';

      // Check if dark rendering is explicitly permitted
      const isDarkTone = DARK_TONE_OVERRIDES.includes(tone);
      const isNoirWorld = world === 'Noir' || world === 'Gothic';
      const allowDarkRendering = isDarkTone || isNoirWorld;

      let enhanced = prompt;

      // Always add attractiveness bias for human figures
      if (!enhanced.includes('attractive') && !enhanced.includes('beautiful')) {
          enhanced = VISUAL_INTENT_ATTRACTIVENESS + ' ' + enhanced;
      }

      // Add lighting guard unless dark rendering is permitted
      if (!allowDarkRendering) {
          // Prevent desaturated/dark defaults
          enhanced = VISUAL_INTENT_LIGHTING_DEFAULT + ' ' + enhanced;

          // Remove explicit dark directives that may have crept in
          enhanced = enhanced.replace(/desaturated|gritty|harsh shadows|noir lighting|bleak/gi, '');
      }

      return enhanced.replace(/\s+/g, ' ').trim();
  }

  // Expose for DevHUD testing
  window.applyVisualIntentGuard = applyVisualIntentGuard;

  // =================================================================
  // SCENE VISUALIZATION SYSTEM (AUTHORITATIVE)
  // Cinematic scene visualizer - NOT portraits, NOT book covers
  // =================================================================
  const SCENE_VIZ_SYSTEM = `You are a cinematic scene visualizer, not a character illustrator.
Your job is to render mood, environment, tension, and implication — not portraits, not glamour shots, not book covers.

CORE RULES:
1. POV IS IMPLICIT - The viewer is inside the world. Characters must NOT look at camera, smile at viewer, or pose attractively. Use: back views, partial profiles, obscured faces, silhouettes, reflections, hands, posture.

2. FEELING OVERRIDES DESCRIPTION - Atmosphere, emotion, pressure, unease, longing, foreboding override surface details. A "vibrant market" with "weight of expectations, air thickens" should feel oppressive, not cheerful.

3. SIMPLIFY - Collapse prose into ONE location, ONE moment, ONE emotional beat. Pick the most pregnant moment.

4. SUBDUED EXPRESSION - Characters look distracted, tense, uncertain, absorbed, conflicted. Never cheerful, performative, model-like, or inviting.

5. COLOR/LIGHTING FOLLOW EMOTION:
   - Oppression → desaturated, shadowed, compressed space
   - Desire → contrast, directional light
   - Unease → off-balance framing, negative space
   - Avoid bright stock-photo palettes

PROMPT PRIORITY ORDER: Emotional state → Spatial tension → Lighting → Environment → Character presence (secondary)

Return ONLY the image prompt. No explanations. Under 200 characters.`;

  // Scene visualization explicit exclusions (always appended)
  const SCENE_VIZ_EXCLUSIONS = 'No smiling at camera. No posed portraits. No beauty photography. No book cover composition.';

  // =================================================================
  // COVER GENERATION SYSTEM (AUTHORITATIVE)
  // Symbolic book cover - NOT scene illustration
  // Emotion > Description > Detail
  // =================================================================
  const COVER_GENERATION_SYSTEM = `You are generating a SYMBOLIC BOOK COVER for Storybound.
This is NOT an illustration. It evokes the emotional core and narrative arc.

MANDATORY DECISION ORDER:

1. EMOTIONAL GRAVITY (one only)
Choose ONE: foreboding, yearning, pressure, secrecy, rebellion, inevitability, longing, tension, mystery.
This emotion guides ALL visual decisions.

2. FOCAL ANCHOR (one only)
Choose ONE of:
- Meaningful object from the story
- Partial symbol (fragment, shadow, silhouette)
- Negative space (deliberate absence)
NEVER: envelopes, generic roses, books, candles.

3. HUMAN FIGURE (optional)
If used: turned away, obscured, cropped, or silhouette ONLY.
NO eye contact. NO posed portraits. NO smiles.
If not needed: use environment, object, or light.

4. VISUAL RESTRAINT (apply 2+)
- Limited palette (2-3 dominant tones)
- Soft focus or shallow depth
- Partial occlusion (fog, shadow, framing)
- Asymmetry or off-center composition
AVOID: decorative clutter, literal symbolism.

5. BACKGROUND (theme-derived)
Technology → circuit abstraction, signal noise
Oceanic → wave interference, light refraction
Memory → fractured geometry, layered translucence
NO art-deco default. NO ornamental patterns unless justified.

Return ONLY the image prompt. Under 250 characters.`;

  // Cover prompt exclusions (always appended)
  // HARD EXCLUSIONS - violations are bugs
  const COVER_EXCLUSIONS = `No audience-facing characters. No literal scene recreation. No generic beauty shots.
No envelopes. No roses. No wine glasses (unless explicitly central to story).
No ornamental curls or art-deco filigree unless narratively justified.
No brown/cream parchment defaults. No centered-object-on-cream unless layout explicitly requires it.`;

  // Emotional gravity options for cover generation
  const EMOTIONAL_GRAVITY_OPTIONS = [
    'foreboding', 'yearning', 'pressure', 'secrecy', 'rebellion',
    'inevitability', 'longing', 'tension', 'mystery', 'isolation',
    'devotion', 'betrayal', 'transformation', 'pursuit'
  ];

  // =================================================================
  // COVER LAYOUT ARCHETYPES (AUTHORITATIVE)
  // Structurally distinct compositions to prevent visual convergence
  // =================================================================
  const COVER_LAYOUT_ARCHETYPES = [
    {
      id: 'center_object',
      description: 'Single symbolic object centered, minimal background, strong negative space'
    },
    {
      id: 'off_center_focus',
      description: 'Primary object off-center, asymmetrical composition, directional tension'
    },
    {
      id: 'fragmented_object',
      description: 'Object partially broken, cropped, or fragmented across the frame'
    },
    {
      id: 'environment_only',
      description: 'No central object; environment or setting carries meaning (empty room, horizon, pathway)'
    },
    {
      id: 'symbol_in_shadow',
      description: 'Object implied through shadow, reflection, or silhouette on surface'
    },
    {
      id: 'typography_integrated',
      description: 'Symbol interacts with title lettering space or is partially obscured by text area'
    },
    {
      id: 'negative_space_dominant',
      description: 'Large empty space (70%+) with small but potent visual anchor at edge or corner'
    }
  ];

  // Layout roulette: Select layout avoiding recent repetition
  function selectCoverLayout(history) {
    const recentLayouts = history.slice(0, 3).map(m => m.layoutId).filter(Boolean);

    // Shuffle archetypes for randomness
    const shuffled = [...COVER_LAYOUT_ARCHETYPES].sort(() => Math.random() - 0.5);

    // Try up to 3 times to find non-repeating layout
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = shuffled[attempt % shuffled.length];
      if (!recentLayouts.includes(candidate.id)) {
        return candidate;
      }
    }

    // Fallback: force negative_space_dominant (safest, most distinct)
    return COVER_LAYOUT_ARCHETYPES.find(l => l.id === 'negative_space_dominant') || shuffled[0];
  }

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
                  model: 'gemini-2.5-flash',
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
  // INTENT-BASED ROUTING (MANDATORY):
  //   setting → Gemini (primary) → OpenAI (fallback) — NO Replicate
  //   scene   → OpenAI (primary) → Replicate (fallback) — NO Gemini
  //   cover   → OpenAI (primary) → Replicate (fallback) — NO Gemini
  // Default to 16:9 landscape for cinematic presentation
  async function generateImageWithFallback({ prompt, tier, shape = 'landscape', context = 'visualize', intent = 'scene' }) {
      const normalizedTier = (tier || 'Naughty').toLowerCase();
      const isExplicitTier = normalizedTier === 'erotic' || normalizedTier === 'dirty';

      // Determine size based on shape (default landscape 16:9)
      const size = shape === 'portrait' ? '1024x1024' : '1792x1024';

      // Safety fallback: clamp prompt length if exceeding provider limits (image-gen only)
      const clampedPrompt = clampPromptLength(prompt, 'image-gen');

      // Prepare prompts for different provider requirements
      const eroticPrompt = clampPromptLength(restoreEroticLanguage(clampedPrompt), 'image-gen');
      const sanitizedPrompt = clampPromptLength(sanitizeImagePrompt(clampedPrompt), 'image-gen');

      // All providers now use sanitized prompts for stability
      // Explicit content belongs in prose, not images
      const basePrompt = sanitizedPrompt;

      // INTENT-BASED PROVIDER CHAIN (AUTHORITATIVE)
      // setting: Gemini → OpenAI (NO Replicate)
      // scene/cover: OpenAI → Replicate (NO Gemini)
      let providerChain;
      if (intent === 'setting') {
          // Setting images: Gemini primary, OpenAI fallback, NO Replicate
          providerChain = [
              { name: 'Gemini', fn: callGeminiImageGen, prompt: sanitizedPrompt },
              { name: 'OpenAI', fn: callOpenAIImageGen, prompt: sanitizedPrompt }
          ];
      } else {
          // Scene/Cover images: OpenAI primary, Replicate fallback, NO Gemini
          providerChain = [
              { name: 'OpenAI', fn: callOpenAIImageGen, prompt: sanitizedPrompt },
              { name: 'Replicate', fn: callReplicateFluxSchnell, prompt: sanitizedPrompt }
          ];
      }

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
  // Scene visualization: OpenAI primary → Replicate fallback (NO Gemini)
  async function generateTieredImage(basePrompt, tier) {
      return generateImageWithFallback({
          prompt: basePrompt,
          tier: tier,
          shape: 'portrait',
          context: 'visualize',
          intent: 'scene'
      });
  }

  // Filter "The Author" from any image prompt
  function filterAuthorFromPrompt(prompt) {
      return prompt.replace(/\bThe Author\b/gi, '').replace(/\bAuthor\b/gi, '').replace(/\s+/g, ' ').trim();
  }

  // MOOD-FIRST scene condensation for image generation
  // Extracts atmosphere + posture + environment, not surface description
  async function condenseSceneWithEmotion(rawPrompt, maxLength = 200) {
      const cleaned = filterAuthorFromPrompt(rawPrompt);

      // If already short enough, return as-is
      if (cleaned.length <= maxLength) {
          return cleaned;
      }

      // Extract mood-first elements via LLM
      try {
          const condensed = await Promise.race([
              callChat([
                  { role: 'system', content: `You condense prose into image prompts. Priority order:
1. ATMOSPHERE (emotional weight, tension, dread, pressure)
2. ENVIRONMENT (light quality, space, weather, architecture)
3. POSTURE (body language, position — NOT faces or expressions)
4. ONE concrete object with symbolic weight

NEVER include: character names, dialogue, exposition, or narrator voice.
NEVER frame for portrait or glamour shot.
Output ONLY the condensed visual description.` },
                  { role: 'user', content: `Condense to under ${maxLength} characters. Capture the MOOD and SPACE, not the plot.

If the scene has mixed emotions (joy + dread), lean toward the darker.
Focus on environment pressing in, posture under pressure, or charged stillness.

Scene: "${cleaned}"

Condensed (under ${maxLength} chars):` }
              ]),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
          ]);

          const result = condensed.trim();
          // Ensure we stay within limit
          if (result.length <= maxLength) {
              return result;
          }
          // LLM exceeded limit, fall back to smart truncation
          return smartTruncateWithEmotion(cleaned, maxLength);
      } catch (e) {
          // Fallback: smart truncation that preserves ending
          return smartTruncateWithEmotion(cleaned, maxLength);
      }
  }

  // Smart truncation fallback: preserves emotional ending over bland beginning
  function smartTruncateWithEmotion(text, maxLength) {
      if (text.length <= maxLength) return text;

      // Emotional words often at end - take last portion if it contains emotion markers
      const emotionMarkers = /\b(tense|dark|heavy|oppressive|foreboding|yearning|desperate|cold|sharp|hollow|aching|burning|trembling|frozen|shattered|haunted|looming|suffocating)\b/i;

      const lastPortion = text.slice(-maxLength);
      const firstPortion = text.slice(0, maxLength);

      // Prefer the portion with more emotional weight
      const lastHasEmotion = emotionMarkers.test(lastPortion);
      const firstHasEmotion = emotionMarkers.test(firstPortion);

      if (lastHasEmotion && !firstHasEmotion) {
          // Last portion has emotion, first doesn't - use last
          return '...' + lastPortion.slice(3).trim();
      }

      // Default: blend beginning context with ending payoff
      const contextLength = Math.floor(maxLength * 0.4);
      const payoffLength = maxLength - contextLength - 4; // 4 for " ... "
      const context = text.slice(0, contextLength).trim();
      const payoff = text.slice(-payoffLength).trim();

      return context + ' ... ' + payoff;
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
  // VISUALIZATION ECONOMY — Credit Earning System
  // Credits earned by scene completion milestones:
  //   3 scenes  → +1 credit
  //   5 scenes  → +1 credit
  //   10 scenes → +2 credits
  //   Every +10 after → +1 credit
  // ============================================================

  function updateVizEconomyCredits() {
      if (!state.vizEconomy) return;

      const sceneCount = state.turnCount || 0;

      // Initialize awarded milestones Set if not present
      if (!state.vizEconomy.awardedMilestones) {
          state.vizEconomy.awardedMilestones = [];
      }
      const awarded = new Set(state.vizEconomy.awardedMilestones);

      let creditsToAdd = 0;

      // EXPLICIT MILESTONE CHECKS — each milestone awarded ONCE only
      // Scene 3 → +1 credit
      if (sceneCount >= 3 && !awarded.has(3)) {
          creditsToAdd += 1;
          awarded.add(3);
      }
      // Scene 5 → +1 credit
      if (sceneCount >= 5 && !awarded.has(5)) {
          creditsToAdd += 1;
          awarded.add(5);
      }
      // Scene 10 → +2 credits
      if (sceneCount >= 10 && !awarded.has(10)) {
          creditsToAdd += 2;
          awarded.add(10);
      }
      // After scene 10: every full +10 scenes → +1 credit
      // Milestones: 20, 30, 40, 50, ...
      for (let milestone = 20; milestone <= sceneCount; milestone += 10) {
          if (!awarded.has(milestone)) {
              creditsToAdd += 1;
              awarded.add(milestone);
          }
      }

      if (creditsToAdd > 0) {
          state.vizEconomy.storyCredits += creditsToAdd;
          state.vizEconomy.awardedMilestones = Array.from(awarded);
          console.log(`[VizEconomy] +${creditsToAdd} credits at scene ${sceneCount}. Total: ${state.vizEconomy.storyCredits}`);
          saveStorySnapshot();
      }
  }

  function getAvailableVizCredits() {
      if (!state.vizEconomy) return 0;
      return (state.vizEconomy.storyCredits || 0) + (state.vizEconomy.globalCredits || 0);
  }

  function consumeVizCredit() {
      if (!state.vizEconomy) return false;
      // Consume story credits first, then global
      if (state.vizEconomy.storyCredits > 0) {
          state.vizEconomy.storyCredits--;
          saveStorySnapshot();
          return true;
      } else if (state.vizEconomy.globalCredits > 0) {
          state.vizEconomy.globalCredits--;
          saveStorySnapshot();
          return true;
      }
      return false;
  }

  function isPayAsYouGoEnabled() {
      return state.vizEconomy && state.vizEconomy.payAsYouGoEnabled === true;
  }

  function enablePayAsYouGo() {
      if (!state.vizEconomy) return;
      state.vizEconomy.payAsYouGoEnabled = true;
      saveStorySnapshot();
      console.log('[VizEconomy] Pay-As-You-Go enabled');
  }

  /**
   * Grant Forbidden Library bonus credit (+1 global, max 2/month)
   * Call this when user completes Forbidden Library content.
   * @returns {boolean} true if credit was granted, false if cap reached
   */
  function grantForbiddenLibraryBonus() {
      if (!state.vizEconomy) return false;

      // Check month cap (max 2 per month)
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

      if (state.vizEconomy.forbiddenLibraryBonusMonthKey !== monthKey) {
          // New month - reset counter
          state.vizEconomy.forbiddenLibraryBonusThisMonth = 0;
          state.vizEconomy.forbiddenLibraryBonusMonthKey = monthKey;
      }

      if (state.vizEconomy.forbiddenLibraryBonusThisMonth >= 2) {
          console.log('[VizEconomy] Forbidden Library bonus cap reached (2/month)');
          return false;
      }

      state.vizEconomy.globalCredits++;
      state.vizEconomy.forbiddenLibraryBonusThisMonth++;
      saveStorySnapshot();
      console.log(`[VizEconomy] Forbidden Library bonus: +1 global credit (${state.vizEconomy.forbiddenLibraryBonusThisMonth}/2 this month)`);
      return true;
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
      const credits = getAvailableVizCredits();
      const sceneVisualized = state.visual.visualizedScenes && state.visual.visualizedScenes[sceneKey];

      const vizBtn = document.getElementById('vizSceneBtn');
      const retryBtn = document.getElementById('vizRetryBtn');

      // VISUALIZATION ECONOMY:
      // - Initial Visualize: enabled if scene not yet visualized AND credits available
      // - Re-Visualize: DISABLED unless Pay-As-You-Go opted in ($0.25/ea)
      if (vizBtn) {
          if (budget.finalized) {
              vizBtn.textContent = '🔒 Finalized';
              vizBtn.disabled = true;
              vizBtn.style.opacity = '0.5';
              vizBtn.style.cursor = 'not-allowed';
          } else if (sceneVisualized) {
              // Scene already visualized with free credit - can only re-visualize
              vizBtn.textContent = '✨ Visualize';
              vizBtn.disabled = true;
              vizBtn.style.opacity = '0.5';
              vizBtn.style.cursor = 'not-allowed';
          } else if (credits <= 0) {
              // No credits available
              vizBtn.textContent = '✨ Visualize (0)';
              vizBtn.disabled = true;
              vizBtn.style.opacity = '0.5';
              vizBtn.style.cursor = 'not-allowed';
          } else {
              // Credits available, scene not yet visualized
              vizBtn.textContent = '✨ Visualize';
              vizBtn.disabled = false;
              vizBtn.style.opacity = '1';
              vizBtn.style.cursor = 'pointer';
          }
      }

      // Re-Visualize: DISABLED unless Pay-As-You-Go enabled
      if (retryBtn) {
          if (budget.finalized) {
              retryBtn.textContent = 'Finalized';
              retryBtn.disabled = true;
          } else if (!isPayAsYouGoEnabled()) {
              // Pay-As-You-Go not enabled - show upgrade prompt
              retryBtn.textContent = 'Re-Visualize ($)';
              retryBtn.disabled = true;
              retryBtn.title = 'Enable Pay-As-You-Go to re-visualize';
          } else {
              // Pay-As-You-Go enabled - $0.25 per re-visualization
              retryBtn.textContent = 'Re-Visualize ($0.25)';
              retryBtn.disabled = false;
              retryBtn.title = '';
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

      // Check scene budget and credits before proceeding
      const sceneKey = getSceneKey();
      const budget = getSceneBudget(sceneKey);
      const credits = getAvailableVizCredits();
      const sceneVisualized = state.visual.visualizedScenes && state.visual.visualizedScenes[sceneKey];

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

      // VISUALIZATION ECONOMY GATES
      if (isRe) {
          // Re-Visualize requires Pay-As-You-Go opt-in
          if (!isPayAsYouGoEnabled()) {
              showPayAsYouGoModal();
              return;
          }
          // Pay-As-You-Go is enabled - proceed with re-visualize ($0.25)
          console.log('[VizEconomy] Re-Visualize with Pay-As-You-Go');
      } else {
          // Initial Visualize requires credits AND scene not yet visualized
          if (sceneVisualized) {
              if(modal) modal.classList.remove('hidden');
              if(errDiv) {
                  errDiv.textContent = 'Scene already visualized. Use Re-Visualize to try again.';
                  errDiv.classList.remove('hidden');
              }
              updateVizButtonStates();
              return;
          }
          if (credits <= 0) {
              if(modal) modal.classList.remove('hidden');
              if(errDiv) {
                  errDiv.textContent = 'No visualization credits available. Keep playing to earn more!';
                  errDiv.classList.remove('hidden');
              }
              updateVizButtonStates();
              return;
          }
      }

      // Track whether this is a credit-consuming initial visualization
      const consumesCreditOnSuccess = !isRe && !sceneVisualized;

      _vizInFlight = true;
      _vizCancelled = false;

      if (!img) { _vizInFlight = false; return; }

      // Reset modifier UI when opening modal
      resetVizModifierUI();

      if(modal) modal.classList.remove('hidden');
      if(retryBtn) retryBtn.disabled = true;
      ensureLockButtonExists(); // Ensure lock button is present and updated

      // Update button states
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
          const visualizeMode = 'scene';
          const visualizePrompt = buildVisualizePrompt({ mode: visualizeMode, lastText, anchorText });

          if(!isRe || !promptMsg) {
              try {
                  promptMsg = await Promise.race([
                      callChat([{
                          role:'user',
                          content: visualizePrompt
                      }]),
                      new Promise((_, reject) => setTimeout(() => reject(new Error("Prompt timeout")), 25000))
                  ]);
              } catch (e) {
                  promptMsg = "Cinematic scene, " + (state.picks?.world || 'atmospheric') + " world, natural lighting, grounded emotion.";
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
          const rawModifiers = modifierInput ? modifierInput.value.trim() : '';
          // RUNTIME NORMALIZATION: Visualize modifiers flow through ChatGPT normalization layer
          const vizNorm = await callNormalizationLayer({
              axis: 'visualize',
              user_text: rawModifiers,
              context_signals: state.picks?.world || []
          });
          const userModifiers = vizNorm.normalized_text || rawModifiers;

          // Include veto exclusions in visual prompt (e.g., "no blondes" should affect hair color)
          const vetoExclusions = state.veto?.excluded?.length > 0
              ? " Exclude: " + state.veto.excluded.slice(0, 3).join(', ') + "."
              : "";

          // SCENE-FIRST PROMPT CONSTRUCTION (AUTHORITATIVE)
          // ISSUE 1 FIX: Emotion-first condensation (preserves payoff, not blind truncation)
          const sceneDesc = await condenseSceneWithEmotion(promptMsg, 200);
          const modifiers = userModifiers ? " " + filterAuthorFromPrompt(userModifiers) : "";

          // Brief anchors from visual bible (characters only, 80 char max)
          const briefAnchors = filterAuthorFromPrompt(anchorText).slice(0, 80);

          // Scene visualization style — world-aware (NOT hardcoded noir)
          const SCENE_STYLE_BY_WORLD = {
              Fantasy: 'Cinematic, painterly, warm golden-hour lighting. Natural expressions, grounded emotion.',
              Historical: 'Cinematic, painterly, period-accurate palette. Candid expressions, oil-painting texture.',
              Modern: 'Cinematic, contemporary, natural ambient lighting. Candid, unstaged expressions.',
              SciFi: 'Cinematic, sleek high-contrast lighting, cool palette. Alert, focused expressions.',
              Noir: 'Cinematic, chiaroscuro, neon-and-shadow contrast. Tense, guarded expressions.',
              Gothic: 'Cinematic, dramatic chiaroscuro, deep reds and blacks. Haunted, strained expressions.',
              Paranormal: 'Cinematic, ethereal glow, muted earth tones with spectral accents. Wary expressions.'
          };
          const sceneStyle = SCENE_STYLE_BY_WORLD[state.picks?.world] || 'Cinematic, painterly, atmospheric, natural lighting. Grounded expressions.';
          const intensityBias = getVisualizeIntensityBias();
          const shortIntensity = intensityBias.split('.')[0] + ".";

          // SCENE FIRST, then style, then mandatory exclusions
          let basePrompt = sceneDesc + modifiers +
              "\n---\n" +
              sceneStyle + " " +
              shortIntensity + " " +
              SCENE_VIZ_EXCLUSIONS +
              vetoExclusions +
              (briefAnchors ? " Anchors: " + briefAnchors : "");

          // VISUAL INTENT GUARD: Enforce attractiveness + balanced lighting
          basePrompt = applyVisualIntentGuard(basePrompt, {
              tone: state.picks?.tone,
              world: state.picks?.world,
              intensity: state.intensity
          });

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

                  // VISUALIZATION ECONOMY: Consume credit and mark scene on SUCCESS only
                  if (consumesCreditOnSuccess) {
                      consumeVizCredit();
                      if (!state.visual.visualizedScenes) state.visual.visualizedScenes = {};
                      state.visual.visualizedScenes[sceneKey] = true;
                      console.log(`[VizEconomy] Credit consumed, scene ${sceneKey} marked as visualized`);
                  }

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

  // ============================================================
  // PAY-AS-YOU-GO CONSENT MODAL
  // Required for Re-Visualize ($0.25 per use)
  // ============================================================

  function showPayAsYouGoModal() {
      const modal = document.getElementById('payAsYouGoModal');
      if (modal) modal.classList.remove('hidden');
  }

  window.closePayAsYouGoModal = function() {
      const modal = document.getElementById('payAsYouGoModal');
      if (modal) modal.classList.add('hidden');
  };

  window.confirmPayAsYouGo = function() {
      // NOTE: Billing is a STUB — no payment processor wired yet
      enablePayAsYouGo();
      window.closePayAsYouGoModal();
      updateVizButtonStates();
      // User must click Re-Visualize explicitly — no auto-trigger
  };

  // Lock Character Look - manual immediate lock
  window.lockCharacterLook = function() {
      if (!state.visual) {
          state.visual = { autoLock: true, locked: false, lastImageUrl: "", bible: { style: "", setting: "", characters: {} } };
      }
      state.visual.locked = true;

      // Update UI feedback
      const btn = document.getElementById('btnLockLook');
      const status = document.getElementById('lockLookStatus');
      if (btn) {
          btn.textContent = '🔒 Locked';
          btn.disabled = true;
          btn.style.opacity = '0.6';
      }
      if (status) {
          status.style.display = 'inline';
      }

      showToast('Character look locked. Appearance will persist.');
      saveStorySnapshot();
  };

  // Update lock button state when vizModal opens
  function updateLockButtonState() {
      const btn = document.getElementById('btnLockLook');
      const status = document.getElementById('lockLookStatus');
      if (!btn) return;

      if (state.visual?.locked) {
          btn.textContent = '🔒 Locked';
          btn.disabled = true;
          btn.style.opacity = '0.6';
          if (status) status.style.display = 'inline';
      } else {
          btn.textContent = '🔒 Lock This Look';
          btn.disabled = false;
          btn.style.opacity = '1';
          if (status) status.style.display = 'none';
      }
  }

  // Fallback: Ensure lock button exists when vizModal opens
  function ensureLockButtonExists() {
      const container = document.getElementById('lockLookContainer');
      if (container) {
          updateLockButtonState();
          return;
      }
      // Fallback injection if container missing
      const vizModal = document.querySelector('#vizModal .viz-modal-content');
      if (vizModal && !document.getElementById('lockLookContainer')) {
          const fallbackDiv = document.createElement('div');
          fallbackDiv.id = 'lockLookContainer';
          fallbackDiv.style.cssText = 'margin-top:10px; text-align:center;';
          fallbackDiv.innerHTML = `
              <button id="btnLockLook" class="small-btn" style="background:#444; font-size:0.85em;" onclick="window.lockCharacterLook()">🔒 Lock This Look</button>
              <span id="lockLookStatus" style="display:none; margin-left:8px; color:var(--gold); font-size:0.8em;">✓ Locked</span>
          `;
          vizModal.appendChild(fallbackDiv);
          updateLockButtonState();
      }
  }

  // TASK B: Initialize provider dropdown with available providers
  // INTENT-BASED: Scene visualization uses OpenAI/Replicate only (NO Gemini)
  // Gemini is ONLY available for Setting images (handled separately)
  function initVizProviderDropdown() {
      const dropdown = document.getElementById('vizModel');
      if (!dropdown) return;

      // Clear existing options
      dropdown.innerHTML = '';

      // Scene visualization providers ONLY (Gemini not allowed for scenes)
      // Per TASK C: scene → OpenAI (primary) → Replicate (fallback)
      const providers = [
          { value: 'openai', label: 'OpenAI (Primary)' },
          { value: 'replicate', label: 'Replicate FLUX (Fallback)' }
      ];

      // Add options
      providers.forEach((p, i) => {
          const opt = document.createElement('option');
          opt.value = p.value;
          opt.textContent = p.label;
          if (i === 0) opt.selected = true;
          dropdown.appendChild(opt);
      });

      // TASK B: Enable dropdown - it was disabled
      dropdown.disabled = false;
      dropdown.style.opacity = '1';

      // Store selection in state
      dropdown.addEventListener('change', (e) => {
          state.visual.preferredProvider = e.target.value;
      });
  }

  // Initialize provider dropdown on DOMContentLoaded
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVizProviderDropdown);
  } else {
      initVizProviderDropdown();
  }

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
      // TASK F: Immediate visual feedback on click
      const submitBtn = $('submitBtn');
      if (submitBtn) {
          submitBtn.classList.add('submitting');
      }

      const billingLock = (state.mode === 'solo') && ['affair','soulmates'].includes(state.storyLength) && !state.subscribed;
      if (billingLock) {
          if (submitBtn) submitBtn.classList.remove('submitting');
          // Use canonical eligibility: Dirty and Soulmates require sub_only (no StoryPass)
          const paywallMode = isStoryPassEligible(state) ? 'unlock' : 'sub_only';
          window.showPaywall(paywallMode);
          return;
      }

      const rawAct = $('actionInput').value.trim();
      const rawDia = $('dialogueInput').value.trim();
      if(!rawAct && !rawDia) {
          if (submitBtn) submitBtn.classList.remove('submitting');
          return alert("Input required.");
      }

      // TASK F: Start loading IMMEDIATELY after validation (before normalization)
      startLoading("Fate is weaving...", STORY_LOADING_MESSAGES);

      // RUNTIME NORMALIZATION: Action/dialogue inputs flow through ChatGPT normalization layer
      // God Mode does NOT bypass normalization - same rules apply
      const axis = state.godModeActive ? 'god_mode' : 'action';
      const actNorm = await callNormalizationLayer({
          axis: axis,
          user_text: rawAct,
          context_signals: state.picks?.world || []
      });
      const diaNorm = await callNormalizationLayer({
          axis: axis,
          user_text: rawDia,
          context_signals: state.picks?.world || []
      });
      const act = actNorm.canonical_instruction || actNorm.normalized_text || rawAct;
      const dia = diaNorm.canonical_instruction || diaNorm.normalized_text || rawDia;

      // Get selected Fate Card title for separator
      let selectedFateCard = null;
      if (state.fateOptions && typeof state.fateSelectedIndex === 'number' && state.fateSelectedIndex >= 0) {
          selectedFateCard = state.fateOptions[state.fateSelectedIndex];
      }

      const { safeAction, safeDialogue, flags } = sanitizeUserIntent(act, dia);
      if (flags.includes("redirect_nonconsent")) {
          stopLoading();
          if (submitBtn) submitBtn.classList.remove('submitting');
          showToast("Boundary Redirect Active");
          if(safeAction) $('actionInput').value = safeAction;
          if(safeDialogue) $('dialogueInput').value = safeDialogue;
          return;
      }

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

      // Lens: dynamic midpoint enforcement (evaluated per-turn)
      const lensEnforcement = buildLensDirectives(state.withheldCoreVariant, state.turnCount, state.storyLength);

      // 5TH PERSON POV CONTRACT INJECTION (turns)
      const turnPOVContract = build5thPersonContract();

      // EROTIC ESCALATION BLOCK (Erotic/Dirty intensity only)
      const turnEroticEscalation = buildEroticEscalationBlock();

      // TONE ENFORCEMENT BLOCK (all tones)
      const turnToneEnforcement = buildToneEnforcementBlock(state.picks?.tone);

      const fullSys = state.sysPrompt + `\n\n${turnPOVContract}${turnEroticEscalation}${turnToneEnforcement}${intensityGuard}\n${squashDirective}\n${metaReminder}\n${vetoRules}\n${quillDirective}\n${bbDirective}\n${safetyDirective}\n${edgeDirective}\n${pacingDirective}\n${lensEnforcement}\n\nTURN INSTRUCTIONS:
      Story So Far: ...${context}
      Player Action: ${act}.
      Player Dialogue: ${dia}.
      ${metaMsg}

      Write the next beat (150-250 words).`;

      // STORY PROMPT GUARD: Validate size (debug only, never truncate)
      validateStoryPromptSize(fullSys, 'turn-generation-fullSys');

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

          // 5TH PERSON POV VALIDATION (later scenes — reduced frequency expected)
          if (state.povMode === 'author5th') {
              // Check if this is an erotic scene (Author should be absent)
              const isEroticScene = ['Erotic', 'Dirty'].includes(state.intensity) &&
                  (raw.toLowerCase().includes('moan') || raw.toLowerCase().includes('thrust') ||
                   raw.toLowerCase().includes('naked') || raw.toLowerCase().includes('undress'));

              const povCheck = validate5thPersonPOV(raw, false, isEroticScene); // isSceneOne=false
              if (!povCheck.valid && povCheck.canRepair) {
                  raw = await repair5thPersonPOV(raw);
                  console.log('[5thPerson] Turn voyeur verbs repaired');
              } else if (!povCheck.valid) {
                  // Check for HARD_FAIL violations (erotic scene Author presence)
                  const hasHardFail = povCheck.violations.some(v => v.startsWith('HARD_FAIL:'));
                  if (hasHardFail && isEroticScene) {
                      // Erotic scene with Author presence — HARD FAIL, must regenerate
                      console.error('[5thPerson] HARD FAIL — Erotic scene has Author presence, regenerating...');
                      const eroticStrictPrompt = `CRITICAL: This is an EROTIC scene. The Author must be COMPLETELY ABSENT.
DO NOT mention "The Author" anywhere in this scene. Pure 3rd-person limited only.
Regenerate the scene with ZERO Author presence.`;
                      if (useFullOrchestration) {
                          raw = await generateOrchestatedTurn({
                              systemPrompt: fullSys + '\n\n' + eroticStrictPrompt,
                              storyContext: context,
                              playerAction: act,
                              playerDialogue: dia,
                              fateCard: selectedFateCard,
                              onPhaseChange: () => {}
                          });
                      } else {
                          raw = await callChat([
                              { role: 'system', content: fullSys + '\n\n' + eroticStrictPrompt },
                              { role: 'user', content: `Action: ${act}\nDialogue: "${dia}"` }
                          ]);
                      }
                  } else {
                      // Non-erotic later scene — log warning, don't block (looser requirements)
                      console.warn('[5thPerson] Turn POV issues (non-blocking):', povCheck.violations);
                  }
              }

              // STRICT 5TH PERSON ENFORCEMENT (continuation scenes — reduced but still enforced)
              if (!isEroticScene) {
                  const strictCheck = enforceStrict5thPersonPOV(raw, state.turnCount || 2, state.picks?.tone);
                  if (!strictCheck.valid) {
                      console.warn('[5thPerson:Strict] Continuation scene enforcement issues:', strictCheck.violations);
                      // For continuation scenes, check for critical failures only
                      const hasCriticalFail = strictCheck.violations.some(v =>
                          v.includes('NARRATIVE_AUTONOMY') || v.includes('CAMEO_ONLY')
                      );
                      if (hasCriticalFail) {
                          console.error('[5thPerson:Strict] Critical violation in continuation scene');
                      }
                  }
              }
          }

          // VOCABULARY BAN ENFORCEMENT — turn prose
          raw = await enforceVocabularyBans(
              raw,
              { type: 'prose', isFatePOV: state.povMode === 'author5th' },
              async (negConstraint) => {
                  // Regenerate via the same path that produced the original
                  if (useFullOrchestration) {
                      return await generateOrchestatedTurn({
                          systemPrompt: fullSys + negConstraint,
                          storyContext: context,
                          playerAction: act,
                          playerDialogue: dia,
                          fateCard: selectedFateCard,
                          onPhaseChange: () => {}
                      });
                  } else {
                      return await callChat([
                          { role: 'system', content: fullSys + negConstraint },
                          { role: 'user', content: `Action: ${act}\nDialogue: "${dia}"` }
                      ]);
                  }
              }
          );

          // ============================================================
          // NARRATIVE AUTHORITY VALIDATION (Runs FIRST — before Tone/POV)
          // ============================================================
          const narrativeAuthorityCheck = validateNarrativeAuthority(raw);
          _lastNarrativeAuthorityValidation = {
              valid: narrativeAuthorityCheck.valid,
              errors: narrativeAuthorityCheck.errors,
              timestamp: Date.now()
          };
          if (!narrativeAuthorityCheck.valid) {
              console.log('[NarrativeAuthority] Turn validation failed:', narrativeAuthorityCheck.errors);
              // Regenerate with Narrative Authority enforcement
              const narrAuthPrompt = buildNarrativeAuthorityBlock() +
                  '\n\nREGENERATION REQUIRED — Previous output violated Narrative Authority:\n- ' +
                  narrativeAuthorityCheck.errors.map(e => `${e.code}: ${e.match}`).join('\n- ');
              if (useFullOrchestration) {
                  raw = await generateOrchestatedTurn({
                      systemPrompt: fullSys + narrAuthPrompt,
                      storyContext: context,
                      playerAction: act,
                      playerDialogue: dia,
                      fateCard: selectedFateCard,
                      onPhaseChange: () => {}
                  });
              } else {
                  raw = await callChat([
                      { role: 'system', content: fullSys + narrAuthPrompt },
                      { role: 'user', content: `Action: ${act}\nDialogue: "${dia}"` }
                  ]);
              }
              console.warn('[NarrativeAuthorityFail] Turn regenerated due to:', narrativeAuthorityCheck.errors.map(e => e.code));
          }

          // EROTIC ESCALATION VALIDATION (Turns)
          if (['Erotic', 'Dirty'].includes(state.intensity)) {
              const turnEscalationCheck = validateEroticEscalation(raw, state.intensity);
              if (!turnEscalationCheck.valid) {
                  console.log('[EroticEscalation] Turn validation failed:', turnEscalationCheck.violations);
                  // Regenerate with explicit escalation notice
                  const escalationPrompt = buildEroticEscalationBlock() +
                      '\n\nREGENERATION REQUIRED — Previous output failed escalation check:\n- ' +
                      turnEscalationCheck.violations.join('\n- ') +
                      '\n\nAdd more sensory grounding and physical tension.';
                  if (useFullOrchestration) {
                      raw = await generateOrchestatedTurn({
                          systemPrompt: fullSys + escalationPrompt,
                          storyContext: context,
                          playerAction: act,
                          playerDialogue: dia,
                          fateCard: selectedFateCard,
                          onPhaseChange: () => {}
                      });
                  } else {
                      raw = await callChat([
                          { role: 'system', content: fullSys + escalationPrompt },
                          { role: 'user', content: `Action: ${act}\nDialogue: "${dia}"` }
                      ]);
                  }
                  console.warn('[EroticEscalationFail] Turn regenerated due to:', turnEscalationCheck.violations);
              }
          }

          // TONE VALIDATION (Turns — all stories)
          const turnTone = state.picks?.tone || 'Earnest';
          const turnToneCheck = validateTone(raw, turnTone);
          if (!turnToneCheck.valid) {
              console.log('[ToneDrift] Turn validation failed:', turnToneCheck.violations);
              // Regenerate with explicit tone enforcement
              const turnTonePrompt = buildToneEnforcementBlock(turnTone) +
                  '\n\nREGENERATION REQUIRED — Tone not present in language:\n- ' +
                  turnToneCheck.violations.join('\n- ');
              if (useFullOrchestration) {
                  raw = await generateOrchestatedTurn({
                      systemPrompt: fullSys + turnTonePrompt,
                      storyContext: context,
                      playerAction: act,
                      playerDialogue: dia,
                      fateCard: selectedFateCard,
                      onPhaseChange: () => {}
                  });
              } else {
                  raw = await callChat([
                      { role: 'system', content: fullSys + turnTonePrompt },
                      { role: 'user', content: `Action: ${act}\nDialogue: "${dia}"` }
                  ]);
              }
              console.warn('[ToneDriftDetected] Turn regenerated for tone:', turnTone);
          }

          state.turnCount++;

          // Update visualization economy credits based on scene milestones
          updateVizEconomyCredits();

          // Record turn completion for reader preference inference (session-scoped)
          if (window.StoryboundOrchestration && window.StoryboundOrchestration.recordPreferenceSignal) {
              window.StoryboundOrchestration.recordPreferenceSignal('TURN_COMPLETED', {
                  intensity: state.intensity,
                  turnNumber: state.turnCount
              });
          }

          // Mark Solo session as completed for subtitle upgrade
          if (typeof markSoloSessionCompleted === 'function') markSoloSessionCompleted();

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
          // HTTP 429 RATE LIMIT — TERMINAL FAILURE, NO RETRY
          if (e instanceof RateLimitError || e?.isRateLimit) {
              console.group('STORYBOUND RATE LIMITED - TURN BLOCKED');
              console.error('Endpoint:', e.endpoint);
              console.error('Retry-After:', e.retryAfter || 'not specified');
              console.groupEnd();

              // DO NOT advance state, DO NOT create scene
              // Surface recoverable error — require explicit user action
              alert("Rate limited. Please wait a moment and try again.");
              return; // Exit early — finally block still runs
          }

          console.error('Turn submission error:', e);
          // Only show error alert if story was NOT successfully displayed
          if (!storyDisplayed) {
              alert("Fate was silent. Try again.");
          }
      } finally {
          stopLoading();
          // TASK F: Remove submitting state
          const submitBtn = $('submitBtn');
          if (submitBtn) submitBtn.classList.remove('submitting');
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
     // Reset DSP state on mode change
     if (typeof resetDSPState === 'function') resetDSPState();
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

  // AUTH GATE: Check login status and handle persistence accordingly
  state.isLoggedIn = localStorage.getItem('sb_logged_in') === '1';

  if (!state.isLoggedIn) {
      // STATELESS MODE: Clear all persisted state when not logged in
      // This ensures testing reloads do not retain stories, purchases, or progress
      clearAnonymousState();
      state.storyId = null;
      state.subscribed = false;
      state.billingStatus = 'active';
  } else {
      // LOGGED IN: Restore persisted state normally
      state.storyId = localStorage.getItem('sb_current_story_id');
      state.subscribed = localStorage.getItem('sb_subscribed') === '1';
      state.billingStatus = localStorage.getItem('sb_billing_status') || 'active';
  }

  syncTierFromAccess();
  updateContinueButtons();
  renderBurgerMenu();

  // ============================================================
  // DEV HUD — Casual English command console (developer only)
  // Never saves to localStorage, never unlocks real features,
  // never affects other users, never ships to production.
  // ============================================================

  (function initDevHud() {
      const isDev = location.hostname === 'localhost' ||
                    location.hostname === '127.0.0.1' ||
                    new URLSearchParams(location.search).has('dev');
      if (!isDev) return;

      const hudEl = document.getElementById('devHud');
      const inputEl = document.getElementById('devHudInput');
      const logEl = document.getElementById('devHudLog');
      if (!hudEl || !inputEl) return;

      let _devOverrides = {};
      let _logTimer = null;

      function log(msg) {
          if (!logEl) return;
          logEl.textContent = msg;
          logEl.style.opacity = '1';
          clearTimeout(_logTimer);
          _logTimer = setTimeout(() => { logEl.style.opacity = '0'; }, 5000);
          console.log('[DevHUD]', msg);
      }

      function toggle() {
          hudEl.classList.toggle('dev-hud-visible');
          if (hudEl.classList.contains('dev-hud-visible')) {
              inputEl.focus();
          }
      }

      // Toggle with backtick key (only when not typing elsewhere)
      document.addEventListener('keydown', (e) => {
          if (e.key === '`' && !e.ctrlKey && !e.metaKey) {
              const tag = (document.activeElement?.tagName || '').toLowerCase();
              const isEditable = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
              if (isEditable && document.activeElement !== inputEl) return;
              e.preventDefault();
              toggle();
          }
      });

      inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              const raw = inputEl.value.trim();
              if (raw) execute(raw.toLowerCase());
              inputEl.value = '';
          }
          if (e.key === 'Escape') toggle();
      });
      // Prevent backtick from typing into the input
      inputEl.addEventListener('keypress', (e) => {
          if (e.key === '`') e.preventDefault();
      });

      // --- Extraction maps ---
      const WORLD_MAP = {
          fantasy: 'Fantasy', historical: 'Historical', modern: 'Modern',
          'sci-fi': 'SciFi', scifi: 'SciFi', dystopia: 'Dystopia',
          'post-apocalyptic': 'PostApocalyptic', postapocalyptic: 'PostApocalyptic',
          supernatural: 'Supernatural', superheroic: 'Superheroic'
      };
      const GENRE_MAP = {
          billionaire: 'Billionaire', crime: 'CrimeSyndicate', noir: 'Noir',
          heist: 'Heist', espionage: 'Espionage', political: 'Political',
          survival: 'Survival', obsession: 'Obsession', forbidden: 'ForbiddenKnowledge',
          'forbidden knowledge': 'ForbiddenKnowledge'
      };
      const INTENSITY_MAP = {
          tease: 'Naughty', naughty: 'Naughty', erotic: 'Erotic', dirty: 'Dirty'
      };
      const ARCHETYPE_MAP = {
          'heart warden': 'HEART_WARDEN', 'open vein': 'OPEN_VEIN',
          'spellbinder': 'SPELLBINDER', 'armored fox': 'ARMORED_FOX',
          'dark vice': 'DARK_VICE', 'beautiful ruin': 'BEAUTIFUL_RUIN',
          'eternal flame': 'ETERNAL_FLAME'
      };

      // ========================================
      // DETERMINISTIC COMMAND REGISTRY (v1)
      // NO fuzzy matching. NO synonyms. NO NLP.
      // ========================================
      const DEV_CMD_REGISTRY = {
          world: ['Modern', 'Historical', 'Fantasy', 'SciFi', 'Dystopia', 'PostApocalyptic'],
          genre: ['CrimeSyndicate', 'Billionaire', 'Noir', 'Heist', 'Espionage', 'Political',
                  'Escape', 'Redemption', 'BuildingBridges', 'Purgatory', 'RelentlessPast',
                  'Sports', 'Survival', 'Obsession', 'ForbiddenKnowledge'],
          tone: ['Earnest', 'WryConfession', 'Satirical', 'Dark', 'Horror', 'Mythic',
                 'Comedic', 'Surreal', 'Poetic'],
          dynamic: ['Proximity', 'SecretIdentity', 'Caretaker', 'Friends', 'Enemies',
                    'SecondChance', 'Forbidden', 'Dangerous', 'Obsessive', 'Fated', 'Partners'],
          arousal: ['Clean', 'Naughty', 'Erotic', 'Dirty']
      };

      // Case-insensitive lookup for canonical value
      function resolveCanonical(axis, input) {
          const list = DEV_CMD_REGISTRY[axis];
          if (!list) return null;
          const lower = input.toLowerCase();
          return list.find(v => v.toLowerCase() === lower) || null;
      }

      // Deterministic command parser (space-split, no regex magic)
      function parseDevCommand(raw) {
          const parts = raw.trim().split(/\s+/);
          if (parts.length === 0) return null;

          // ALIAS: "regen book cover" → "regen cover"
          if (parts[0] === 'regen' && parts[1] === 'book' && parts[2] === 'cover') {
              return { cmd: 'regen', target: 'cover' };
          }
          // COMMAND: "regen cover"
          if (parts[0] === 'regen' && parts[1] === 'cover') {
              return { cmd: 'regen', target: 'cover' };
          }
          // COMMAND: "set <axis> <value>"
          if (parts[0] === 'set' && parts.length >= 3) {
              const axis = parts[1];
              const value = parts.slice(2).join(' ');
              return { cmd: 'set', axis, value };
          }
          // Not a registry command
          return null;
      }

      // Execute deterministic command (returns true if handled)
      function executeRegistryCommand(input) {
          const parsed = parseDevCommand(input);
          if (!parsed) return false;

          // REGEN COVER (gated by coverEligibility)
          if (parsed.cmd === 'regen' && parsed.target === 'cover') {
              const world = state.picks?.world || 'Modern';
              const genre = state.picks?.genre || 'Billionaire';
              const intensity = state.intensity || 'Naughty';
              const title = document.getElementById('storyTitle')?.textContent || 'Untitled';

              // PHASE 1 GATE: Custom covers only when coverEligibility === true
              if (state.coverMode === 'PHASE_1_FORGED' || state.coverEligibility !== true) {
                  console.log('[DEV:CoverGen] PHASE_1_FORGED mode — using local fallback');
                  resetCoverLayers();
                  showDevCover();
                  renderFallbackCover(world, genre, title);
                  stopCoverLoading(null);
                  applyCoverIntensityLayers(intensity, world);
                  log('[DEV:CoverGen] PHASE_1 fallback applied');
                  return true;
              }

              // CUSTOM COVER PATH (only when coverEligibility === true)
              console.log('[DEV:CoverGen] Regenerating cover...');
              resetCoverLayers();
              showDevCover();
              const synopsis = document.getElementById('synopsisText')?.textContent || '';
              const authorName = state.authorName || 'Anonymous';
              generateBookCover(synopsis, title, authorName).then(coverUrl => {
                  if (coverUrl) {
                      stopCoverLoading(coverUrl);
                      applyCoverIntensityLayers(intensity, world);
                      log('[DEV:CoverGen] Cover generated');
                  } else {
                      renderFallbackCover(world, genre);
                      stopCoverLoading(null);
                      applyCoverIntensityLayers(intensity, world);
                      log('[DEV:CoverGen] AI failed → fallback');
                  }
              }).catch(err => {
                  console.error('[DEV:CoverGen] Error:', err);
                  renderFallbackCover(world, genre);
                  stopCoverLoading(null);
                  applyCoverIntensityLayers(intensity, world);
                  log('[DEV:CoverGen] Error → fallback');
              });
              log('[DEV:CoverGen] Started...');
              return true;
          }

          // SET <axis> <value>
          if (parsed.cmd === 'set') {
              const { axis, value } = parsed;
              // Validate axis
              if (!DEV_CMD_REGISTRY[axis]) {
                  console.error('[DEV:StateChange] HARD FAIL: Unknown axis "' + axis + '"');
                  log('ERROR: Unknown axis "' + axis + '". Valid: world, genre, tone, dynamic, arousal');
                  return true;
              }
              // Resolve canonical value
              const canonical = resolveCanonical(axis, value);
              if (!canonical) {
                  console.error('[DEV:StateChange] HARD FAIL: Invalid value "' + value + '" for axis "' + axis + '"');
                  log('ERROR: Invalid ' + axis + ' "' + value + '". Valid: ' + DEV_CMD_REGISTRY[axis].join(', '));
                  return true;
              }
              // Update state
              state.picks = state.picks || {};
              if (axis === 'arousal') {
                  state.intensity = canonical;
              } else {
                  state.picks[axis] = canonical;
              }
              console.log('[DEV:StateChange] ' + axis + ' → ' + canonical);
              log('[DEV:StateChange] ' + axis + ' → ' + canonical);
              // Trigger dependent recalculations
              if (axis === 'arousal') {
                  applyCoverIntensityLayers(canonical, state.picks?.world);
              }
              return true;
          }

          return false;
      }

      function extract(text, map) {
          for (const [key, val] of Object.entries(map)) {
              if (text.includes(key)) return val;
          }
          return null;
      }

      // Show the book cover page in dev context
      function showDevCover() {
          window.showScreen('game');
          const bcp = document.getElementById('bookCoverPage');
          const sc = document.getElementById('storyContent');
          const bo = document.getElementById('bookObject');
          const ls = document.getElementById('coverLoadingState');
          if (bcp) bcp.classList.remove('hidden');
          if (sc) sc.classList.add('hidden');
          if (bo) bo.classList.remove('hidden');
          if (ls) ls.classList.add('hidden');
      }

      function execute(input) {
          // --- DETERMINISTIC REGISTRY COMMANDS (priority) ---
          if (executeRegistryCommand(input)) return;

          // --- HELP ---
          if (/^(help|what can i say)\b/.test(input)) {
              log('=== DETERMINISTIC COMMANDS ===');
              log('regen cover');
              log('set world <Modern|Historical|Fantasy|SciFi|Dystopia|PostApocalyptic>');
              log('set genre <' + DEV_CMD_REGISTRY.genre.slice(0, 5).join('|') + '|...>');
              log('set tone <Earnest|WryConfession|Satirical|Dark|Horror|Mythic|Comedic|Surreal|Poetic>');
              log('set dynamic <Proximity|SecretIdentity|Caretaker|Friends|Enemies|...>');
              log('set arousal <Clean|Naughty|Erotic|Dirty>');
              log('=== LEGACY COMMANDS ===');
              log('COVER: make [world] [intensity] cover | pretend cover failed | show fallback | show/hide keyhole | reset cover');
              log('STATE: set intensity to X | go dirty/erotic | pretend i paid | pretend i\'m free | what\'s going on');
              log('QUERY: what genre/world/tone/intensity/archetype/title? | title pipeline | test title [text]');
              log('POV: check pov | why pov failed | is god mode active | set pov author/normal | exit god mode');
              log('VALIDATION: check dsp | check tone | check erotic | check authority | check title | check signal | check paywall | check book | check all');
              log('FATE: reset fate cards | deal fate');
              log('FORK: show fork (test continuation modal)');
              return;
          }

          // --- MAKE / GENERATE COVER ---
          if (/\b(make|generate)\b.*\bcover\b/.test(input)) {
              const world = extract(input, WORLD_MAP) || state.picks?.world || 'Modern';
              const genre = extract(input, GENRE_MAP) || state.picks?.genre || 'Billionaire';
              const intensity = extract(input, INTENSITY_MAP) || state.intensity || 'Naughty';
              state.picks = state.picks || {};
              state.picks.world = world;
              state.picks.genre = genre;
              state.intensity = intensity;
              resetCoverLayers();
              showDevCover();
              renderFallbackCover(world, genre);
              applyCoverIntensityLayers(intensity, world);
              log('Cover: ' + world + ' / ' + genre + ' / ' + intensity);
              return;
          }

          // --- PRETEND COVER FAILED ---
          if (/\b(pretend|simulate)\b.*\bcover\b.*\b(fail|broke|error)\b|\bcover\b.*\b(fail|broke)\b/.test(input)) {
              const world = state.picks?.world || 'Modern';
              const genre = state.picks?.genre || 'Billionaire';
              resetCoverLayers();
              showDevCover();
              renderFallbackCover(world, genre);
              applyCoverIntensityLayers(state.intensity, world);
              log('Simulated cover failure -> fallback rendered');
              return;
          }

          // --- SHOW / USE FALLBACK ---
          if (/\b(show|use|skip)\b.*(fallback|ai\s*cover)\b/.test(input)) {
              const world = state.picks?.world || 'Modern';
              const genre = state.picks?.genre || 'Billionaire';
              resetCoverLayers();
              showDevCover();
              renderFallbackCover(world, genre);
              applyCoverIntensityLayers(state.intensity, world);
              log('Fallback cover shown (' + world + ' / ' + genre + ')');
              return;
          }

          // --- SHOW FORK MODAL ---
          if (/\b(show|test)\b.*\bfork\b/.test(input)) {
              showContinuationFork();
              log('Continuation fork modal shown');
              return;
          }

          // --- SHOW KEYHOLE ---
          if (/\b(show|turn on)\b.*\bkeyhole\b/.test(input)) {
              showDevCover();
              // Ensure a base cover exists
              const fb = document.getElementById('coverFallback');
              const img = document.getElementById('bookCoverImg');
              const hasCover = (fb && !fb.classList.contains('hidden')) || (img && img.src && img.style.display !== 'none');
              if (!hasCover) {
                  renderFallbackCover(state.picks?.world || 'Modern', state.picks?.genre || 'Billionaire');
              }
              applyCoverIntensityLayers('Dirty', state.picks?.world);
              log('Keyhole takeover enabled');
              return;
          }
          if (/\bhide\b.*\bkeyhole\b/.test(input)) {
              const kh = document.getElementById('coverKeyholeOverlay');
              if (kh) kh.classList.add('hidden');
              log('Keyhole hidden');
              return;
          }

          // --- RESET COVER ---
          if (/\b(reset|clear|start)\b.*\bcover\b/.test(input)) {
              resetCoverLayers();
              resetBookState();
              log('Cover state reset');
              return;
          }

          // --- RESET / DEAL FATE CARDS ---
          // Aliases: "reset fate cards", "reset the fate cards", "restart fate", "redo fate", "re-deal fate cards", "deal fate"
          if (/\b(reset|restart|redo|re-?deal|deal)\b.*\bfate\b/i.test(input)) {
              if (window.dealFateCards) {
                  window.dealFateCards();
                  log('Fate cards re-dealt');
              } else {
                  log('Fate card system not available');
              }
              return;
          }

          // --- SET INTENSITY ---
          if (/\bset\b.*\bintensity\b.*\bto\b/.test(input)) {
              const intensity = extract(input, INTENSITY_MAP);
              if (intensity) {
                  state.intensity = intensity;
                  applyCoverIntensityLayers(intensity, state.picks?.world);
                  log('Intensity -> ' + intensity);
              } else {
                  log('Unknown intensity. Try: tease, naughty, erotic, dirty');
              }
              return;
          }
          if (/^go\s+(dirty|erotic|naughty|tease)\b/.test(input)) {
              const m = input.match(/^go\s+(\w+)/);
              const intensity = INTENSITY_MAP[m[1]];
              if (intensity) {
                  state.intensity = intensity;
                  applyCoverIntensityLayers(intensity, state.picks?.world);
                  log('Intensity -> ' + intensity);
              }
              return;
          }

          // --- ACCESS SIMULATION ---
          if (/\bpretend\b.*\b(paid|story\s*pass|subscribed)\b/.test(input)) {
              _devOverrides.access = 'sub';
              state.subscribed = true;
              syncTierFromAccess();
              log('Pretending subscribed (does not persist, does not unlock real features)');
              return;
          }
          if (/\bpretend\b.*\bfree\b/.test(input)) {
              _devOverrides.access = 'free';
              state.subscribed = false;
              state.intensity = 'Naughty';
              syncTierFromAccess();
              log('Pretending free tier');
              return;
          }

          // --- ARCHETYPE / LENS ---
          if (/\b(use|switch)\b.*\b(lens|archetype)\b/.test(input) || /\bswitch to\b/.test(input)) {
              const archId = extract(input, ARCHETYPE_MAP);
              if (archId && ARCHETYPES[archId]) {
                  state.archetype = state.archetype || {};
                  state.archetype.primary = archId;
                  log('Archetype -> ' + ARCHETYPES[archId].name);
              } else {
                  log('Unknown archetype. Try: beautiful ruin, open vein, spellbinder, armored fox, dark vice, heart warden, eternal flame');
              }
              return;
          }

          // --- QUILL ---
          if (/\bset\b.*\bquill\b.*\b\d+/.test(input)) {
              const m = input.match(/(\d+)/);
              if (m) {
                  state.quillTarget = parseInt(m[1], 10);
                  log('Quill target -> ' + m[1] + ' words');
              }
              return;
          }
          if (/\bpretend\b.*\bwritten\b.*\b\d+/.test(input)) {
              const m = input.match(/(\d+)/);
              if (m) {
                  state.wordCount = parseInt(m[1], 10);
                  log('Word count -> ' + m[1]);
              }
              return;
          }

          // --- DEBUG: STATE DUMP ---
          if (/\bwhat.s\b.*\b(going|everything|firing)\b|\bshow me everything\b/.test(input)) {
              const info = [
                  'world:' + (state.picks?.world || '-'),
                  'genre:' + (state.picks?.genre || '-'),
                  'tone:' + (state.picks?.tone || '-'),
                  'dynamic:' + (state.picks?.dynamic || '-'),
                  'intensity:' + (state.intensity || '-'),
                  'arch:' + (state.archetype?.primary || '-'),
                  'access:' + (state.access || '-'),
                  'sub:' + (state.subscribed || false),
                  'turns:' + (state.turnCount || 0)
              ];
              log(info.join(' | '));
              console.log('[DevHUD] Full state:', JSON.parse(JSON.stringify(state)));
              return;
          }

          // --- DEBUG: COVER STATE ---
          if (/\bwhat cover\b|\bwhy.*cover\b/.test(input)) {
              const fb = document.getElementById('coverFallback');
              const img = document.getElementById('bookCoverImg');
              const border = document.getElementById('coverEroticBorder');
              const keyhole = document.getElementById('coverKeyholeOverlay');
              const hasFallback = fb && !fb.classList.contains('hidden');
              const hasImg = img && img.src && !img.src.endsWith('/') && img.style.display !== 'none';
              const hasBorder = border && !border.classList.contains('hidden');
              const hasKeyhole = keyhole && !keyhole.classList.contains('hidden');
              const layers = [];
              if (hasImg) layers.push('AI cover');
              if (hasFallback) layers.push('fallback');
              if (hasBorder) layers.push('erotic border (' + (border.className.match(/world-\w+/)?.[0] || 'default gold') + ')');
              if (hasKeyhole) layers.push('keyhole takeover');
              log(layers.length ? 'Active: ' + layers.join(' + ') : 'No cover layers visible');
              return;
          }

          // --- CASUAL ENGLISH QUERIES ---
          // "what genre is this", "what genre", "genre?"
          if (/\b(what|which)\b.*\bgenre\b|\bgenre\s*\?/.test(input)) {
              log('Genre: ' + (state.picks?.genre || '(not set)'));
              return;
          }
          // "what world is this", "what world", "world?"
          if (/\b(what|which)\b.*\bworld\b|\bworld\s*\?/.test(input)) {
              log('World: ' + (state.picks?.world || '(not set)') +
                  (state.picks?.world === 'Historical' ? ' (' + (state.picks?.era || 'no era') + ')' : ''));
              return;
          }
          // "what tone", "tone?"
          if (/\b(what|which)\b.*\btone\b|\btone\s*\?/.test(input)) {
              log('Tone: ' + (state.picks?.tone || '(not set)'));
              return;
          }
          // "what intensity", "intensity?"
          if (/\b(what|which)\b.*\bintensity\b|\bintensity\s*\?/.test(input)) {
              log('Intensity: ' + (state.intensity || '(not set)'));
              return;
          }
          // "what archetype", "archetype?", "what lens"
          if (/\b(what|which)\b.*\b(archetype|lens)\b|\b(archetype|lens)\s*\?/.test(input)) {
              const archId = state.archetype?.primary;
              log('Archetype: ' + (archId && ARCHETYPES[archId] ? ARCHETYPES[archId].name : '(not set)'));
              return;
          }
          // "what dynamic", "dynamic?"
          if (/\b(what|which)\b.*\bdynamic\b|\bdynamic\s*\?/.test(input)) {
              log('Dynamic: ' + (state.picks?.dynamic || '(not set)'));
              return;
          }
          // "why did cover fail", "what happened to cover", "cover status"
          if (/\bwhy\b.*\bcover\b|\bcover\b.*\b(status|state|happened|wrong|broken)\b/.test(input)) {
              // Delegate to existing cover debug
              execute('what cover');
              return;
          }
          // "what title", "title?"
          if (/\b(what|which)\b.*\btitle\b|\btitle\s*\?/.test(input)) {
              const t = document.getElementById('storyTitle')?.textContent;
              log('Title: ' + (t || '(none)'));
              return;
          }
          // "title pipeline", "title debug", "title status"
          if (/\btitle\s*(pipeline|debug|status|info)\b/i.test(input)) {
              const t = document.getElementById('storyTitle')?.textContent;
              if (!t) {
                  log('No title set');
                  return;
              }
              const mode = detectTitleMode(t);
              const baseline = state.titleBaselineArousal || '(none)';
              const immutable = state.immutableTitle || '(none)';
              const swapTest = runSwapTest(t, state.picks?.world, state.intensity);
              log('=== TITLE PIPELINE ===');
              log('Current: "' + t + '"');
              log('Mode: ' + (mode || 'unknown'));
              log('Baseline arousal: ' + baseline);
              log('Immutable title: "' + immutable + '"');
              log('Swap-test: ' + (swapTest.unique ? 'PASS' : 'FAIL — ' + swapTest.reason));
              // Check immutability
              if (immutable && t !== immutable) {
                  log('WARNING: Title differs from immutable record!');
              }
              return;
          }
          // "test title [text]", "validate title [text]"
          if (/\btest\s+title\s+(.+)/i.test(input)) {
              const match = input.match(/\btest\s+title\s+(.+)/i);
              if (match) {
                  const testTitle = match[1].trim();
                  const result = validateTitle(
                      testTitle,
                      state.picks?.tone,
                      state.intensity,
                      { world: state.picks?.world, genre: state.picks?.genre }
                  );
                  log('Testing: "' + testTitle + '"');
                  log('Mode: ' + (result.mode || 'unknown'));
                  if (result.valid) {
                      log('Result: PASS');
                  } else {
                      log('Result: FAIL');
                      result.errors.forEach(e => log('  ' + e.message));
                  }
              }
              return;
          }

          // --- 5TH PERSON POV DIAGNOSTICS ---
          // "check pov", "pov status"
          if (/\bcheck\s*pov\b|\bpov\s*(status|check)\b/i.test(input)) {
              const povMode = state.povMode || 'normal';
              const godMode = state.godModeActive ? 'ACTIVE' : 'inactive';
              const lastCheck = _lastPOVValidation;
              log('POV Mode: ' + povMode + ' | God Mode: ' + godMode);
              if (povMode === 'author5th') {
                  log('Last validation: ' + (lastCheck.valid ? 'PASS' : 'FAIL') +
                      ' | Author mentions: ' + (lastCheck.authorMentions || 0));
              }
              return;
          }
          // "why pov failed", "pov violations"
          if (/\bwhy\s*pov\b|\bpov\s*(fail|violation|error)\b/i.test(input)) {
              const lastCheck = _lastPOVValidation;
              if (lastCheck.valid) {
                  log('Last POV check passed (no violations)');
              } else if (lastCheck.violations?.length) {
                  log('POV violations: ' + lastCheck.violations.join('; '));
              } else {
                  log('No POV validation data available');
              }
              return;
          }
          // "is god mode active", "god mode status"
          if (/\b(is\s*)?god\s*mode\s*(active|on|status)?\b/i.test(input)) {
              log('God Mode: ' + (state.godModeActive ? 'ACTIVE (adversarial Author)' : 'inactive'));
              return;
          }
          // "set pov author", "enable 5th person"
          if (/\b(set|enable|use)\s*(5th|fifth|author)\s*(pov|person)?\b/i.test(input)) {
              state.povMode = 'author5th';
              log('POV Mode -> author5th (5th Person)');
              return;
          }
          // "set pov normal", "disable 5th person"
          if (/\b(set|disable|use)\s*(normal|standard|3rd|third)\s*(pov|person)?\b/i.test(input)) {
              state.povMode = 'normal';
              log('POV Mode -> normal (standard 3rd person)');
              return;
          }

          // --- EXIT GOD MODE ---
          if (/\b(exit|stop|back)\b.*\b(god|pretend|normal)\b/.test(input)) {
              _devOverrides = {};
              state.subscribed = false;
              state.intensity = 'Naughty';
              syncTierFromAccess();
              resetCoverLayers();
              log('Dev overrides cleared — back to normal');
              return;
          }

          // --- VALIDATION CHECK COMMANDS ---
          // "check dsp", "validate dsp"
          if (/\bcheck\s*dsp\b|\bvalidate\s*dsp\b/i.test(input)) {
              const dspEl = document.getElementById('synopsisText');
              if (!dspEl) {
                  log('DSP element not found');
                  return;
              }
              const result = window.validateDSP(dspEl.textContent || '', {
                  world: state.picks?.world || 'Modern',
                  genre: state.picks?.genre || 'Billionaire',
                  archetypeId: state.archetype?.primary || 'BEAUTIFUL_RUIN',
                  tone: state.picks?.tone || 'Earnest'
              });
              if (result.pass) {
                  log('DSP: PASS — template matches exactly');
              } else {
                  log('DSP: FAIL — ' + result.errors.map(e => e.code).join(', '));
                  result.errors.forEach(e => log('  ' + e.message));
              }
              return;
          }

          // "check tone", "validate tone"
          if (/\bcheck\s*tone\b|\bvalidate\s*tone\b/i.test(input)) {
              if (!window.StoryPagination) {
                  log('Story not started');
                  return;
              }
              const content = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').slice(-2000);
              const tone = state.picks?.tone || 'Earnest';
              const result = window.validateTone(content, tone);
              if (result.valid) {
                  log('Tone (' + tone + '): PASS — ' + result.matchCount + ' markers found');
              } else {
                  log('Tone (' + tone + '): FAIL — ' + result.matchCount + '/' + result.required + ' markers');
                  result.violations.forEach(v => log('  ' + v));
              }
              return;
          }

          // "check erotic", "validate erotic", "check escalation"
          if (/\bcheck\s*(erotic|escalation)\b|\bvalidate\s*erotic\b/i.test(input)) {
              if (!['Erotic', 'Dirty'].includes(state.intensity)) {
                  log('Erotic escalation: N/A (intensity is ' + state.intensity + ')');
                  return;
              }
              if (!window.StoryPagination) {
                  log('Story not started');
                  return;
              }
              const content = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').slice(-2000);
              const result = window.validateEroticEscalation(content, state.intensity);
              if (result.valid) {
                  log('Erotic (' + state.intensity + '): PASS — ' + result.metrics.sensoryCount + ' sensory markers');
              } else {
                  log('Erotic (' + state.intensity + '): FAIL');
                  result.violations.forEach(v => log('  ' + v));
              }
              return;
          }

          // "check authority", "check narrative", "validate authority"
          if (/\bcheck\s*(authority|narrative)\b|\bvalidate\s*authority\b|\bnarrative\s*authority\b/i.test(input)) {
              if (!window.StoryPagination) {
                  log('Story not started');
                  return;
              }
              const content = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').slice(-3000);
              const result = window.validateNarrativeAuthority(content);
              log('=== NARRATIVE AUTHORITY ===');
              log('Layer Order: Authority → Tone → POV → Prose');
              if (result.valid) {
                  log('Result: PASS (no violations)');
              } else {
                  log('Result: FAIL — ' + result.errors.length + ' violations');
                  result.errors.forEach(e => {
                      log('  ' + e.code + ': ' + e.message);
                      log('    Match: "' + (e.match || '').substring(0, 60) + '..."');
                  });
              }
              // Show last validation timestamp
              if (_lastNarrativeAuthorityValidation.timestamp > 0) {
                  const ago = Math.round((Date.now() - _lastNarrativeAuthorityValidation.timestamp) / 1000);
                  log('Last check: ' + ago + 's ago (' + (_lastNarrativeAuthorityValidation.valid ? 'PASS' : 'FAIL') + ')');
              }
              return;
          }

          // "check title", "validate title"
          if (/\bcheck\s*title\b|\bvalidate\s*title\b/i.test(input)) {
              const titleEl = document.getElementById('storyTitle');
              if (!titleEl || !titleEl.textContent) {
                  log('No title to validate');
                  return;
              }
              const currentTitle = titleEl.textContent.trim();
              const result = validateTitle(currentTitle, state.picks?.tone);
              if (result.valid) {
                  log('Title: PASS — "' + currentTitle + '"');
              } else {
                  log('Title: FAIL — "' + currentTitle + '"');
                  result.errors.forEach(e => log('  ' + e.message));
                  // Show what fallback would be
                  const fallback = generateFallbackTitle({
                      playerName: state.rawPlayerName,
                      partnerName: state.rawPartnerName,
                      world: state.picks?.world || 'Modern',
                      tone: state.picks?.tone || 'Earnest',
                      genre: state.picks?.genre || 'Romance'
                  });
                  log('  Fallback would be: "' + fallback + '"');
              }
              return;
          }

          // "check signal", "check alignment", "validate signal"
          if (/\bcheck\s*(signal|alignment)\b|\bvalidate\s*signal\b/i.test(input)) {
              const titleEl = document.getElementById('storyTitle');
              if (!titleEl || !titleEl.textContent) {
                  log('No title to check signals');
                  return;
              }
              const currentTitle = titleEl.textContent.trim();
              // Create mock cover prompt for signal extraction (uses current state)
              const mockCoverPrompt = {
                  promptText: 'emotion: ' + (state.coverEmotion || 'mystery'),
                  emotion: state.coverEmotion || 'mystery'
              };
              const result = validateSignalAlignment(currentTitle, mockCoverPrompt, {
                  arousal: state.intensity || 'Naughty',
                  tone: state.picks?.tone || 'Earnest',
                  genre: state.picks?.genre || 'Romance'
              });
              log('=== SIGNAL ALIGNMENT ===');
              log('Expected arousal: ' + (state.intensity || 'Naughty') + ' (' + result.context.arousalSignal + ')');
              log('Title signals: ' + (result.titleSignals.primary || 'none') +
                  (result.titleSignals.secondary ? ' + ' + result.titleSignals.secondary : ''));
              log('Cover signals: ' + (result.coverSignals.primary || 'none') +
                  (result.coverSignals.secondary ? ' + ' + result.coverSignals.secondary : ''));
              if (result.aligned) {
                  log('Alignment: PASS');
              } else {
                  log('Alignment: FAIL');
                  result.errors.forEach(e => log('  ' + e.message));
              }
              return;
          }

          // "check all", "validate all", "run all checks"
          if (/\bcheck\s*all\b|\bvalidate\s*all\b|\brun\s*all\s*checks?\b/i.test(input)) {
              const results = window.getValidationStatus();
              log('=== VALIDATION STATUS ===');

              if (results.dsp) {
                  log('DSP: ' + (results.dsp.pass ? 'PASS' : 'FAIL'));
                  if (!results.dsp.pass) results.dsp.errors.forEach(e => log('  ' + e.code));
              }

              if (results.pov) {
                  log('POV: ' + (results.pov.pass ? 'PASS' : 'FAIL') + ' (' + results.pov.metrics.authorMentions + ' Author mentions)');
                  if (!results.pov.pass) results.pov.errors.forEach(e => log('  ' + e.code));
              }

              if (results.tone) {
                  log('Tone: ' + (results.tone.valid ? 'PASS' : 'FAIL') + ' (' + results.tone.matchCount + '/' + results.tone.required + ')');
              }

              if (results.erotic) {
                  log('Erotic: ' + (results.erotic.valid ? 'PASS' : 'FAIL'));
                  if (!results.erotic.valid) results.erotic.violations.forEach(v => log('  ' + v.split(':')[0]));
              }

              // Narrative Authority check (runs first in layer model)
              if (window.StoryPagination) {
                  const narrContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').slice(-3000);
                  const narrResult = validateNarrativeAuthority(narrContent);
                  log('Authority: ' + (narrResult.valid ? 'PASS' : 'FAIL'));
                  if (!narrResult.valid) narrResult.errors.forEach(e => log('  ' + e.code));
              }

              if (results.title) {
                  log('Title: ' + (results.title.valid ? 'PASS' : 'FAIL'));
                  if (!results.title.valid) results.title.errors.forEach(e => log('  ' + e.code));
              }

              if (results.signal) {
                  log('Signal: ' + (results.signal.aligned ? 'PASS' : 'FAIL'));
                  if (!results.signal.aligned) results.signal.errors.forEach(e => log('  ' + e.code));
              }

              // Paywall routing check
              const paywallResult = validatePaywallRouting();
              if (!paywallResult.skipped) {
                  log('Paywall: ' + (paywallResult.valid ? 'PASS' : 'FAIL'));
                  if (!paywallResult.valid) log('  ' + paywallResult.error);
              }

              // Book flow integrity check
              const bookResult = validateBookFlowIntegrity();
              log('Book Flow: ' + (bookResult.valid ? 'PASS' : 'FAIL'));
              if (!bookResult.valid) bookResult.errors.forEach(e => log('  ' + e.code));

              const allPass = Object.values(results).every(r => r.pass || r.valid || r.aligned);
              log('=== ' + (allPass ? 'ALL CHECKS PASS' : 'SOME CHECKS FAILED') + ' ===');
              return;
          }

          // "check paywall", "validate paywall", "paywall routing"
          if (/\bcheck\s*paywall\b|\bvalidate\s*paywall\b|\bpaywall\s*routing\b/i.test(input)) {
              const result = validatePaywallRouting();
              log('=== PAYWALL ROUTING ===');
              log('Intensity: ' + (state.intensity || 'unknown'));
              log('Story Length: ' + (state.storyLength || 'unknown'));
              if (result.skipped) {
                  log('Paywall not visible — check skipped');
              } else if (result.valid) {
                  log('Result: PASS (StoryPass correctly hidden/shown)');
              } else {
                  log('Result: HARD FAIL');
                  log('Error: ' + result.error);
              }
              return;
          }

          // "check book", "validate book", "book flow"
          if (/\bcheck\s*book\b|\bvalidate\s*book\b|\bbook\s*flow\b/i.test(input)) {
              const result = validateBookFlowIntegrity();
              log('=== BOOK FLOW INTEGRITY ===');
              log('Page Types: COVER → INSIDE_COVER → SETTING → SCENE');
              if (result.valid) {
                  log('Result: PASS (all page rules satisfied)');
              } else {
                  log('Result: HARD FAIL');
                  result.errors.forEach(e => log('  ' + e.code + ': ' + e.message));
              }
              return;
          }

          log('Unknown command. Type "help" for options.');
      }

      log('Dev HUD ready — press ` to toggle');
  })();

})();
