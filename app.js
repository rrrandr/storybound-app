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
          const synopsisEl = document.getElementById('storySynopsis');
          const settingShotWrap = document.getElementById('settingShotWrap');
          const sceneNumberEl = document.getElementById('sceneNumber');

          // Update scene number based on current page
          if (sceneNumberEl) {
              sceneNumberEl.textContent = 'Scene ' + (currentPageIndex + 1);
          }

          if (currentPageIndex === 0) {
              // Page 1: Full display (no setting image in Scene 1)
              if (titleEl) titleEl.style.fontSize = '';
              if (synopsisEl) synopsisEl.style.display = '';
              if (settingShotWrap) settingShotWrap.style.display = 'none';
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
  // ARCHETYPE SYSTEM (LOCKED)
  // =========================
  const ARCHETYPES = {
      ROMANTIC: {
          id: 'ROMANTIC',
          name: 'The Romantic',
          desireStyle: 'His voice softened when he spoke her name, as if the syllables themselves were precious',
          summary: 'He pressed the wildflower into her palm, his thumb lingering against her wrist. "I wrote you something," he said, and his voice caught on the word—raw, unguarded, as if the poem had cost him something to create.',
          primaryOnly: false
      },
      CLOISTERED: {
          id: 'CLOISTERED',
          name: 'The Cloistered',
          desireStyle: 'A flush crept up his neck when their fingers brushed—the first touch in years',
          summary: 'He stood frozen at the library threshold, watching her turn pages by candlelight. When she looked up, he forgot how to breathe. "I never—" he started, then closed his mouth, cheeks burning, as if desire itself were a language he was only beginning to learn.',
          primaryOnly: false
      },
      ROGUE: {
          id: 'ROGUE',
          name: 'The Rogue',
          desireStyle: 'That crooked smile promised trouble—and made her want every bit of it',
          summary: 'He leaned against the doorframe, twirling her stolen hairpin between his fingers. "Looking for this?" His grin was wicked, his eyes dancing with mischief. "Come get it." And somehow the dare felt like an invitation to something far more dangerous than a chase.',
          primaryOnly: false
      },
      DANGEROUS: {
          id: 'DANGEROUS',
          name: 'The Dangerous',
          desireStyle: 'The room went quiet when he entered—not from fear, but from the weight of his restraint',
          summary: 'His stillness was unnerving. She watched his jaw flex, the controlled breath, the way his hands stayed perfectly flat on the table even as his eyes tracked her every movement. Whatever lived beneath that composure, he kept it caged—and she found herself wondering what it would take to set it free.',
          primaryOnly: false
      },
      GUARDIAN: {
          id: 'GUARDIAN',
          name: 'The Guardian',
          desireStyle: 'He positioned himself between her and the door without thinking—it was instinct',
          summary: 'The storm rattled the windows, but his arm around her shoulders was steady. "I\'ve got you," he murmured against her hair, and she realized she had never felt so safe—or so aware of how warm his chest was against her back, how his heartbeat seemed to slow when she leaned into him.',
          primaryOnly: false
      },
      SOVEREIGN: {
          id: 'SOVEREIGN',
          name: 'The Sovereign',
          desireStyle: 'He did not pursue—he simply waited, knowing she would come to him',
          summary: 'He sat on the throne as if he\'d been born to it, watching her approach with an expression of patient amusement. "You came," he said—not a question, not surprise. Just acknowledgment. As if her presence had been inevitable, as if he had simply been waiting for her to realize it too.',
          primaryOnly: false
      },
      ENCHANTING: {
          id: 'ENCHANTING',
          name: 'The Enchanting',
          desireStyle: 'Every glance felt deliberate, every smile a secret only she could unlock',
          summary: 'The way he held her gaze across the ballroom made her forget there were other people in the room. He lifted his glass—not to her, exactly, but somehow the gesture was only for her. When he finally smiled, slow and knowing, she felt it like a hook beneath her ribs.',
          primaryOnly: false
      },
      DEVOTED: {
          id: 'DEVOTED',
          name: 'The Devoted',
          desireStyle: 'He remembered the coffee order she\'d mentioned once, three months ago, in passing',
          summary: 'She found the book on her desk—the one she\'d admired in a shop window weeks ago and never mentioned. No note. But when she looked up, he was watching from across the room, and the quiet intensity in his eyes said everything: I see you. I notice. I remember.',
          primaryOnly: false
      },
      STRATEGIST: {
          id: 'STRATEGIST',
          name: 'The Strategist',
          desireStyle: 'He was always three moves ahead—and somehow that made surrendering feel like winning',
          summary: 'He slid the chess piece forward without looking at the board. "You\'ll refuse me at first," he said, his voice low, amused. "Then you\'ll reconsider. And by the time you say yes—" He met her eyes. "—you\'ll convince yourself it was your idea." The worst part was, she already wanted to prove him wrong.',
          primaryOnly: false
      },
      BEAUTIFUL_RUIN: {
          id: 'BEAUTIFUL_RUIN',
          name: 'The Beautiful Ruin',
          desireStyle: 'His jaw clenched, a storm behind his perfect eyes—pain or shame, she couldn\'t tell',
          summary: 'She saw his jaw clench, the storm behind his perfect eyes pulling him inward, as if he were locking himself inside a prison of shame—or was it pain? "You should go," he whispered, but his hand caught her wrist, gentle and desperate. "Everyone leaves. You will too." But he hadn\'t let go.',
          primaryOnly: true,
          genderedExpression: {
              male: 'He loved fiercely, possessively, as if tenderness itself might betray him',
              female: 'She pushed away first, always, before the disappointment could reach her'
          }
      },
      ANTI_HERO: {
          id: 'ANTI_HERO',
          name: 'The Anti-Hero',
          desireStyle: 'He wanted her—she could see it in the way he never touched her, never came too close',
          summary: 'He stopped at the threshold, one hand braced against the doorframe as if holding himself back. "I can\'t," he said, though she hadn\'t asked. His voice was rough. "Not because I don\'t want to." The muscle in his jaw tightened. "Because if I let myself have this—have you—someone gets hurt. And it won\'t be me."',
          primaryOnly: true,
          coreFantasy: 'He kept her at arm\'s length not from indifference but from certainty: the closer she got, the more she became a target. He would burn the world before he let it touch her—but he couldn\'t burn himself.'
      }
  };

  const ARCHETYPE_ORDER = [
      'ROMANTIC', 'CLOISTERED', 'ROGUE', 'DANGEROUS', 'GUARDIAN',
      'SOVEREIGN', 'ENCHANTING', 'DEVOTED', 'STRATEGIST', 'BEAUTIFUL_RUIN', 'ANTI_HERO'
  ];

  function getArchetypeSectionTitle(loveInterestGender) {
      const g = (loveInterestGender || '').toLowerCase();
      if (g === 'male') return 'Archetype Storybeau';
      if (g === 'female') return 'Archetype Storybelle';
      return 'Archetype Storyboo';
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

  // Get valid modifier archetypes (excludes primaryOnly)
  function getValidModifierArchetypes() {
      return ARCHETYPE_ORDER.filter(id => {
          const arch = ARCHETYPES[id];
          return arch && !arch.primaryOnly;
      });
  }

  // Normalize user input to best matching modifier archetype
  // Maps free text to closest modifier (IP-safe transformation)
  function normalizeArchetypeModifierInput(input, currentPrimary) {
      if (!input || typeof input !== 'string') return null;

      const normalized = input.trim().toLowerCase();
      if (!normalized) return null;

      // Get valid modifiers (excluding primaryOnly archetypes)
      const validModifiers = getValidModifierArchetypes();

      // Direct match by name
      for (const id of validModifiers) {
          const arch = ARCHETYPES[id];
          if (arch.name.toLowerCase().includes(normalized) ||
              normalized.includes(arch.name.toLowerCase().replace('the ', ''))) {
              // Can't use same as primary
              if (id === currentPrimary) continue;
              return id;
          }
      }

      // Keyword matching based on desireStyle
      const keywordMap = {
          'romantic': 'ROMANTIC',
          'expressive': 'ROMANTIC',
          'devoted': 'DEVOTED',
          'poetic': 'ROMANTIC',
          'cloistered': 'CLOISTERED',
          'sheltered': 'CLOISTERED',
          'innocent': 'CLOISTERED',
          'awakening': 'CLOISTERED',
          'rogue': 'ROGUE',
          'playful': 'ROGUE',
          'charm': 'ROGUE',
          'irreverent': 'ROGUE',
          'dangerous': 'DANGEROUS',
          'menace': 'DANGEROUS',
          'restrained': 'DANGEROUS',
          'power': 'DANGEROUS',
          'guardian': 'GUARDIAN',
          'protective': 'GUARDIAN',
          'steady': 'GUARDIAN',
          'safe': 'GUARDIAN',
          'sovereign': 'SOVEREIGN',
          'authority': 'SOVEREIGN',
          'composed': 'SOVEREIGN',
          'royal': 'SOVEREIGN',
          'enchanting': 'ENCHANTING',
          'allure': 'ENCHANTING',
          'magnetic': 'ENCHANTING',
          'seductive': 'ENCHANTING',
          'loyal': 'DEVOTED',
          'focused': 'DEVOTED',
          'exclusive': 'DEVOTED',
          'attention': 'DEVOTED',
          'strategist': 'STRATEGIST',
          'intelligent': 'STRATEGIST',
          'anticipation': 'STRATEGIST',
          'clever': 'STRATEGIST'
      };

      for (const [keyword, archId] of Object.entries(keywordMap)) {
          if (normalized.includes(keyword) && validModifiers.includes(archId) && archId !== currentPrimary) {
              return archId;
          }
      }

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

      // COUPLE PLAY INTENSITY & CONSENT (session-scoped, never persisted)
      coupleIntensity: {
          ceiling: 'Naughty',             // Current couple-mode intensity ceiling
          eroticUnlocked: false,           // Whether Erotic has been silently unlocked
          eroticUnlockScore: 0,            // Pacing score tracking toward Erotic unlock
          // Directional Dirty consent (A→B and B→A tracked independently)
          // From THIS client's perspective:
          //   inbound  = content flowing FROM partner TO self
          //   outbound = content flowing FROM self TO partner (tracked on partner's client)
          inboundDirtyConsent: null,       // null=not yet asked, true=accepted, false=declined
          inboundDirtyPrompted: false,     // Has the inbound consent prompt been shown this session
          outboundDirtyConsent: null,      // null=not yet asked (partner decides; local mirror for re-open logic)
          outboundDirtyPrompted: false,
          // Escalation
          selfEscalatedDirty: false,       // Has THIS player pushed toward Dirty content
          // Conditional re-open
          reopenOffered: false,            // Has the one-time re-open prompt been shown
          reopenAccepted: false,           // Did the player accept re-open
          // De-escalation
          deescalationActive: false,       // Is de-escalation mode in effect
          deescalationCap: null,           // Tier cap after de-escalation (e.g. 'Erotic' or 'Naughty')
          pendingHoldMessage: null,        // Held message awaiting de-escalation confirmation
          pendingHoldRaw: null             // Raw AI output for held message
      },

      // COUPLE PLAY MASK PRESENTATION (session-scoped, never persisted)
      // Masks are the player-facing presentation of archetypes in Couple Play only.
      // The underlying archetype system is unchanged — masks are a UI layer.
      coupleMask: {
          mySelectedMask: null,              // Archetype ID this player chose for themselves
          mySuggestedMaskForPartner: null,   // Archetype ID this player suggests for their partner
          partnerSuggestedMask: null,        // Archetype ID the partner suggested for this player (received)
          resolvedMask: null,                // Final resolved archetype ID for this player
          maskResolved: false,               // Whether resolution flow is complete
          partnerMaskResolved: false         // Whether partner has resolved (for flow gating)
      },

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

      // FRESHNESS MEMORY — per-user cross-run anti-repeat system (session + localStorage)
      freshnessMemory: {
          bannedPhrases: {},   // { [phraseLower]: lastUsedTimestamp }
          bannedTokens: {},    // { [tokenLower]: lastUsedTimestamp }
          lastStoryFingerprint: null
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
      ['payModal', 'vizModal', 'menuOverlay', 'eroticPreviewModal', 'coupleConsentModal', 'coupleInvite', 'strangerModal', 'edgeCovenantModal', 'previewModal', 'gameQuillVetoModal', 'dirtyConsentModal', 'dirtyReopenModal', 'deescalationModal', 'maskAcceptanceModal'].forEach(id => {
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
          if(typeof coupleCleanup === 'function' && isSharedPlayMode()) coupleCleanup();
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
          // MASK: Swap archetype → mask UI when entering setup in shared play mode
          if (typeof isSharedPlayMode === 'function' && isSharedPlayMode() && typeof initCoupleMaskPresentation === 'function') {
              initCoupleMaskPresentation();
          }
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
      // PASS 9F: Character destiny cards - fill name + ancestry for each character
      // On click: populate fields, update canonical state, trigger Begin Story
      document.querySelectorAll('.character-destiny-card').forEach(card => {
          card.addEventListener('click', () => {
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

              // PASS 9F: Update canonical state and trigger Begin Story
              // Uses the SAME handler as the Begin Story button
              updateSynopsisPanel && updateSynopsisPanel();

              // Trigger Begin Story after a brief delay for visual feedback
              setTimeout(() => {
                  const beginBtn = document.getElementById('beginBtn');
                  if (beginBtn) {
                      beginBtn.click();
                  }
              }, 400);
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

      // Selection state - toggle both selected and flipped
      const isSelected = val === state.storyLength;
      card.classList.toggle('selected', isSelected);
      card.classList.toggle('flipped', isSelected);

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

  // REMOVED: Separate length click handlers - now using unified handler
  // Length cards are handled by the single unified card handler in initSelectionCardSystem()
  function bindLengthHandlers(){
      // No-op: click handling moved to unified handler
  }

  function applyIntensityLocks(){
      syncTierFromAccess();
      const access = state.access;
      const setupCards = document.querySelectorAll('#intensityGrid .sb-card');
      const gameBtns = document.querySelectorAll('#gameIntensity button');

      const updateLock = (el, level, isCard) => {
          let locked = false;
          if (access === 'free' && ['Erotic', 'Dirty'].includes(level)) locked = true;
          if (access === 'pass' && level === 'Dirty') locked = true;

          el.classList.toggle('locked', locked);
          // CRITICAL FIX: Remove preset locked-tease/locked-pass classes when unlocked
          if (!locked) {
              el.classList.remove('locked-tease', 'locked-pass');
          }
          if(locked) el.classList.remove(isCard ? 'selected' : 'active');
          // FIX: Dirty always requires subscription - use sub_only mode
          const paywallMode = (level === 'Dirty') ? 'sub_only' : 'unlock';
          setPaywallClickGuard(el, locked, paywallMode);
      };

      setupCards.forEach(c => updateLock(c, c.dataset.val, true));
      gameBtns.forEach(b => updateLock(b, b.innerText.trim(), false));

      // Fallback
      if(state.intensity === 'Dirty' && access !== 'sub') state.intensity = (access === 'free') ? 'Naughty' : 'Erotic';
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
          if(level === 'Dirty' && state.access !== 'sub'){ window.showPaywall('sub_only'); return; }
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
    // AUTH GATE: Only read/persist story ID when logged in
    if (isLoggedIn()) {
        const existing = localStorage.getItem('sb_current_story_id');
        if(existing) return existing;
    }
    const id = 'sb_' + Date.now().toString(36);
    if (isLoggedIn()) localStorage.setItem('sb_current_story_id', id);
    return id;
  }

  function getStoryPassKey(storyId){ return `sb_storypass_${storyId}`; }
  function hasStoryPass(storyId){ return localStorage.getItem(getStoryPassKey(storyId)) === '1'; }
  // AUTH GATE: Only persist story pass when logged in
  function grantStoryPass(storyId){ if(storyId && isLoggedIn()) localStorage.setItem(getStoryPassKey(storyId), '1'); }
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
    if(isSharedPlayMode()) window.coupleCleanup();
    // Always reset shared-play intensity on restart (even if currently solo)
    if (typeof resetCoupleIntensity === 'function') resetCoupleIntensity();
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

      // Scale factor
      const scale = 2.5;

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

      // Update synopsis
      updateSynopsisPanel();

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

      // Scale factor (~25% larger than before: 2.5 * 1.25 = 3.125)
      const scale = 3.125;

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
            updateSynopsisPanel();
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

        // Intensity-specific paywall checks (before generic locked check)
        if (grp === 'intensity') {
          if (val === 'Dirty' && state.access !== 'sub') { window.showPaywall('sub_only'); return; }
          if (val === 'Erotic' && state.access === 'free') { window.openEroticPreview(); return; }
        }

        if(card.classList.contains('locked')) { window.showPaywall('unlock'); return; }

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

        // Update floating synopsis panel
        updateSynopsisPanel();
      });
    });

    // Initialize World Subtype visibility based on initial selections
    updateWorldSubtypeVisibility(state.picks.world, state.picks.tone);
    // Initialize synopsis panel
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

    // Update DSP when player name changes (DSP MUST include player name)
    // CRITICAL: Normalize on blur, not on every keystroke
    const playerNameInput = $('playerNameInput');
    if (playerNameInput) {
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
        updateSynopsisPanel();
      });
    }

    // Normalize partner name on blur
    const partnerNameInput = $('partnerNameInput');
    if (partnerNameInput) {
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

  // Intensity coda — subtle second sentence reflecting arousal band
  const DSP_INTENSITY_CODA = {
    Clean: 'Some things are better left unsaid.',
    Naughty: 'Something unspoken pulls at the edges.',
    Erotic: 'The pull between you burns close to the surface.',
    Dirty: 'Nothing between you stays hidden for long.'
  };

  // TONE GENERATORS: Each produces a complete sentence in that tone's voice
  // ==========================================================================
  // DSP TEMPLATE ASSEMBLY — NOT AUTHORED PROSE
  // ==========================================================================
  // DSP is a fixed English sentence template with slot-filled normalized values.
  // The model may return labels or short phrases only — NOT full sentences.
  //
  // RULES:
  // - DSP defaults to second person ("You")
  // - Player name may appear only as an appositive
  // - Pronouns must remain grammatically consistent
  //
  // Template pattern:
  // You—{{player_name_optional}}—step into a {{world_descriptor}}, where
  // {{tone_clause}}, and find yourself drawn into {{dynamic_clause}}.
  // ==========================================================================

  /**
   * Format player name as appositive (parenthetical).
   * Returns empty string if no custom name provided.
   */
  function formatPlayerAppositive(playerName) {
    if (!playerName || playerName === 'The Protagonist' || playerName === 'You') {
      return '';
    }
    return `—${playerName}—`;
  }

  const DSP_TONE_GENERATORS = {
    Earnest: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `You${formatPlayerAppositive(playerName)} step into ${worldSubtype ? worldSubtype + ' ' : ''}${world}, where ${genre} awaits, and find yourself drawn to ${dynamic}.`,

    WryConfession: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `So here you are${formatPlayerAppositive(playerName)}, in ${worldSubtype ? worldSubtype + ' ' : ''}${world}, tangled up in ${genre}, and somehow you find yourself compelled to ${dynamic}.`,

    Satirical: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `Welcome${formatPlayerAppositive(playerName)} to ${worldSubtype ? worldSubtype + ' ' : ''}${world}, where ${genre} is already a mess, and you have agreed to ${dynamic}.`,

    Dark: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `In ${worldSubtype ? worldSubtype + ' ' : ''}${world}, ${genre} waits in every shadow, and you${formatPlayerAppositive(playerName)} will ${dynamic}, no matter the cost.`,

    Horror: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `Something waits in ${worldSubtype ? worldSubtype + ' ' : ''}${world}, wearing the face of ${genre}, and it knows you${formatPlayerAppositive(playerName)} will ${dynamic}.`,

    Mythic: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `Something ancient calls you${formatPlayerAppositive(playerName)} to ${worldSubtype ? worldSubtype + ' ' : ''}${world}, where ${genre} shapes the path of heroes, and you must ${dynamic}.`,

    Comedic: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `Look, ${worldSubtype ? worldSubtype + ' ' : ''}${world} seemed like a good idea at the time${formatPlayerAppositive(playerName)}, but now there is ${genre}, and apparently you are going to ${dynamic}.`,

    Surreal: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `${worldSubtype ? worldSubtype.charAt(0).toUpperCase() + worldSubtype.slice(1) + ' ' : ''}${world} bends at the edges${formatPlayerAppositive(playerName)}, where ${genre} tastes like something half-remembered, and you ${dynamic}.`,

    Poetic: ({ playerName, world, worldSubtype, genre, dynamic }) =>
      `Beneath the long shadow of ${worldSubtype ? worldSubtype + ' ' : ''}${world}, your fate${formatPlayerAppositive(playerName)} drifts toward ${genre}, and the need to ${dynamic} moves like a quiet inevitability.`
  };

  /**
   * Generate a DSP paragraph (2 sentences) that:
   * - Is grammatically closed (no fragments)
   * - Is written in present tense
   * - Addresses Player 1 by name (REQUIRED)
   * - Reflects: World, World Subtype (if any), Tone, Genre, Dynamic, Intensity
   */
  function generateDSPSentence(world, tone, genre, dynamic, playerName, worldSubtype, intensity) {
    const worldText = DSP_WORLD_SETTINGS[world] || DSP_WORLD_SETTINGS.Modern;
    const genreText = DSP_GENRE_CONFLICTS[genre] || DSP_GENRE_CONFLICTS.Billionaire;
    const dynamicText = DSP_DYNAMIC_ENGINES[dynamic] || DSP_DYNAMIC_ENGINES.Enemies;

    // Player name is REQUIRED for DSP generation
    const name = playerName || $('playerNameInput')?.value?.trim() || 'The Protagonist';

    // World subtype provides additional context (optional)
    const subtypeText = worldSubtype ? formatWorldSubtype(worldSubtype) : null;

    const generator = DSP_TONE_GENERATORS[tone] || DSP_TONE_GENERATORS.Earnest;
    const premise = generator({
      playerName: name,
      world: worldText,
      worldSubtype: subtypeText,
      genre: genreText,
      dynamic: dynamicText
    });

    // Intensity coda — subtle second sentence reflecting arousal band
    const coda = DSP_INTENSITY_CODA[intensity] || DSP_INTENSITY_CODA.Naughty;
    return premise + ' ' + coda;
  }

  /**
   * Format world subtype for display in DSP
   * Converts internal subtype keys to readable phrases
   */
  function formatWorldSubtype(subtype) {
    const SUBTYPE_DISPLAY = {
      // Modern subtypes
      small_town: 'a small-town',
      college: 'a campus',
      friends: 'a friend-group',
      old_money: 'an old-money',
      office: 'an office',
      supernatural_modern: 'a supernatural',
      superheroic_modern: 'a superheroic',
      // Sci-Fi subtypes
      space_opera: 'a galactic',
      hard_scifi: 'a scientifically rigorous',
      cyberpunk: 'a neon-lit cyberpunk',
      post_human: 'a transcendent',
      alien_contact: 'an alien-touched',
      abundance_collapse: 'a post-scarcity',
      // Fantasy subtypes
      enchanted_realms: 'a magical',
      hidden_magic: 'a subtle-magic',
      cursed_corrupt: 'a grim',
      // Dystopia subtypes
      authoritarian: 'an authoritarian',
      surveillance: 'a surveillance',
      corporate: 'a corporate-ruled',
      environmental: 'an ecologically collapsed',
      // Post-Apocalyptic subtypes
      nuclear: 'a nuclear-scarred',
      pandemic: 'a plague-ravaged',
      climate: 'a climate-devastated',
      technological: 'a tech-fallen',
      slow_decay: 'a slowly decaying'
    };
    return SUBTYPE_DISPLAY[subtype] || null;
  }

  function updateSynopsisPanel() {
    const synopsisText = document.getElementById('synopsisText');
    if (!synopsisText) return;

    // Get current selections
    const world = state.picks.world || 'Modern';
    const tone = state.picks.tone || 'Earnest';
    const genre = state.picks.genre || 'Billionaire';
    const dynamic = state.picks.dynamic || 'Enemies';
    const intensity = state.intensity || 'Naughty';

    // Get player kernel for DSP (REQUIRED) - ONLY use normalized kernel, never raw input
    const playerKernel = state.normalizedPlayerKernel || 'the one who carries the story';

    // Get world subtype if one is selected (optional)
    const worldSubtype = state.picks.worldSubtype || getSelectedWorldSubtype(world);

    // Generate DSP paragraph from all declared story axes
    const newSentence = generateDSPSentence(world, tone, genre, dynamic, playerKernel, worldSubtype, intensity);

    // Update with animation if content changed
    if (synopsisText.textContent !== newSentence) {
      synopsisText.classList.add('updating');
      synopsisText.textContent = newSentence;
      setTimeout(() => synopsisText.classList.remove('updating'), 500);
    }
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

      // COUPLE MASK: Track own mask selection in couple mode
      if (typeof onCoupleMaskSelected === 'function') {
          onCoupleMaskSelected(archetypeId);
      }
  }

  // Populate archetype card zoom view with modifier custom field only (NO pills)
  function populateArchetypeZoomContent(card, archetypeId) {
      const frontFace = card.querySelector('.sb-card-front');
      if (!frontFace) return;

      // Remove any existing zoom content
      const existing = frontFace.querySelector('.sb-zoom-content');
      if (existing) existing.remove();

      // Get valid modifiers (excluding current primary and primaryOnly archetypes)
      const validModifiers = getValidModifierArchetypes().filter(id => id !== archetypeId);

      // Create zoom content container
      const zoomContent = document.createElement('div');
      zoomContent.className = 'sb-zoom-content sb-zoom-content-storybeau';

      // NO modifier pills - only custom text field with scrolling examples

      // Add custom text field with rotating placeholder
      const customWrapper = document.createElement('div');
      customWrapper.className = 'sb-zoom-custom';

      const customLabel = document.createElement('label');
      customLabel.className = 'sb-zoom-custom-label';
      customLabel.textContent = 'Modifier:';

      // Create input wrapper for rotating placeholder
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'sb-zoom-custom-wrapper';

      const customInput = document.createElement('textarea');
      customInput.className = 'sb-zoom-custom-input';
      customInput.id = 'archetypeModifierInput-' + Date.now();
      customInput.rows = 1;

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

      customInput.addEventListener('click', (e) => {
          e.stopPropagation();
      });

      customInput.addEventListener('focus', () => {
          const inner = rotatingPlaceholder.querySelector('.sb-zoom-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'paused';
          rotatingPlaceholder.classList.add('hidden');
      });

      customInput.addEventListener('blur', () => {
          const inner = rotatingPlaceholder.querySelector('.sb-zoom-placeholder-inner');
          if (inner) inner.style.animationPlayState = 'running';

          // PASS 9F: Normalize input and select matching modifier
          // Keep user-entered text visible - never discard modifier input
          const inputVal = customInput.value.trim();
          if (inputVal) {
              const matchedModifier = normalizeArchetypeModifierInput(inputVal, archetypeId);
              if (matchedModifier) {
                  // Update state with matched archetype
                  state.archetype.modifier = matchedModifier;
                  updateArchetypeSelectionSummary();
              } else {
                  // Even if no match, accept as free text modifier
                  // Store the raw text as modifier
                  state.archetype.modifierText = inputVal;
                  updateArchetypeSelectionSummary();
              }
              // PASS 9F: KEEP the user-entered text visible - do not clear
          }

          // Show placeholder only if input is truly empty
          if (!customInput.value.trim()) {
              rotatingPlaceholder.classList.remove('hidden');
          }
      });

      // Handle Enter key as submit
      customInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault();
              customInput.blur();
          }
      });

      inputWrapper.appendChild(customInput);
      inputWrapper.appendChild(rotatingPlaceholder);
      customWrapper.appendChild(customLabel);
      customWrapper.appendChild(inputWrapper);
      zoomContent.appendChild(customWrapper);

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

      // Scale factor (~25% larger than before: 2.5 * 1.25 = 3.125)
      const scale = 3.125;

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
  $('btnCommitVeto')?.addEventListener('click', async () => {
      const vetoEl = document.getElementById('vetoInput');
      if (!vetoEl) return;
      const vetoText = vetoEl.value.trim();
      if (!vetoText) { showToast("No veto to commit."); return; }

      // CRITICAL: Normalize FIRST, then add to committed state
      // Never store raw input in committedVeto
      const lines = vetoText.split('\n').filter(l => l.trim());
      for (const line of lines) {
          const norm = await callNormalizationLayer({
              axis: 'veto',
              user_text: line.trim(),
              context_signals: state.picks?.world || []
          });
          const kernel = norm.archetype || norm.burden || norm.normalized_text || 'excluded element';
          if (!state.committedVeto.includes(kernel)) {
              state.committedVeto.push(kernel);
          }
      }
      renderCommittedPhrases('veto');

      await applyVetoFromInput();
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
    if (typeof WORLD_SUB_OPTIONS === 'undefined' || !WORLD_SUB_OPTIONS) return null;
    const flavors = WORLD_SUB_OPTIONS[world];
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

  // Get weighted archetype selection
  function getFateArchetype() {
    // Prefer romantic archetypes for the default romance experience
    const archetypes = ['ROMANTIC', 'DEVOTED', 'ENCHANTING', 'GUARDIAN', 'CLOISTERED'];
    const weights = [35, 25, 20, 15, 5];
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

    // Handle Historical era if needed
    if (fateChoices.world === 'Historical' && fateChoices.worldFlavor) {
      state.picks.era = fateChoices.worldFlavor;
    }

    // Clear veto/quill (defaults only)
    state.veto = { bannedWords: [], bannedNames: [], excluded: [], tone: [], corrections: [], ambientMods: [] };
    state.quillIntent = '';

    // Update UI cards to reflect selections
    updateAllCardSelections();

    // Wire DSP to Guided Fate — ensure premise reflects populated selections
    updateSynopsisPanel();
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

  // PASS 9E: Fate Destiny Card click handler - RESTORED BEHAVIOR
  // FIX: Card NEVER flips to tree. On click: populate, show loader, begin.
  $('fateDestinyCard')?.addEventListener('click', async () => {
    const fateCard = $('fateDestinyCard');
    if (!fateCard || fateCard.dataset.fateUsed === 'true') return;

    // 1. Mark as used to prevent double-click (NO FLIP to tree)
    fateCard.dataset.fateUsed = 'true';
    fateCard.style.opacity = '0.6';
    fateCard.style.pointerEvents = 'none';

    // 1b. Activate golden vignette + edge sparkles for Guided Fate ceremony
    activateGuidedFateVisuals();

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

    // 3. Populate all selections synchronously
    populateFateSelections(fateChoices);

    // 4. Set fate flag then trigger the SAME Begin Story handler
    // No duplicate async chains - all generation goes through beginBtn
    state._fateTriggered = true;

    // 5. Trigger the begin button click handler (the ONLY generation path)
    // The beginBtn handler will show the loader immediately
    $('beginBtn')?.click();
  });

  // --- BEGIN STORY (RESTORED) ---
  $('beginBtn')?.addEventListener('click', async () => {
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
    window.showScreen('game');
    const bookCoverPage = document.getElementById('bookCoverPage');
    const storyContentEl = document.getElementById('storyContent');
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


    Protagonist: ${pKernel} (${pGen}, ${pPro}${pAge ? `, age ${pAge}` : ''}).
    Love Interest: ${lKernel} (${lGen}, ${lPro}${lAge ? `, age ${lAge}` : ''}).

    ${buildArchetypeDirectives(state.archetype.primary, state.archetype.modifier, lGen)}
    ${typeof buildMaskFateDirective === 'function' ? buildMaskFateDirective() : ''}

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

    // FRESHNESS: Append freshness + taxonomy leak directives to opener prompt
    const freshnessDir = buildFreshnessDirective('');
    const taxonomyDir = buildTaxonomyLeakDirective();
    if (freshnessDir) state.sysPrompt += freshnessDir;
    if (taxonomyDir) state.sysPrompt += taxonomyDir;

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

        // FRESHNESS: Update memory with opener text + scrub taxonomy leaks
        updateFreshnessMemory(text);
        text = scrubTaxonomyLeaks(text);

        const title = await callChat([{role:'user', content:`Based on this opening, generate a 2-4 word title.

PROCESS: First, internally identify the story's emotional promise or arc (longing, danger, desire, destiny, transformation). Then craft a title that hints at that promise.

QUALITY RULES:
- The title must feel like a promise of experience, not a mood collage
- Avoid abstract noun clusters ("Veiled Whispers of the Dark")
- Prefer titles that imply stakes, longing, or transformation
- Good examples: "What the Sky Took", "The Wanting", "Before You Burned"

${buildTitleConstraint()}
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
        // TESTING MODE: Force "Anonymous" for all books when not logged in
        const authorDisplayName = !state.isLoggedIn
            ? 'Anonymous'
            : (state.authorGender === 'Non-Binary'
                ? 'The Author'
                : (state.authorGender === 'Female' ? 'A. Romance' : 'A. Novelist'));

        generateBookCover(synopsis, cleanTitle, authorDisplayName).then(coverUrl => {
            if (coverUrl) {
                stopCoverLoading(coverUrl);
            } else {
                // Cover generation failed - skip to story content
                console.warn('[BookCover] Failed to generate, skipping cover page');
                skipCoverPage();
            }
        });

        // Setting shot removed from Scene 1 — no placeholder space.
        // generateSettingShot retained for future scenes / saved-story loading.

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

    try {
      return await window.StoryboundOrchestration.callChatGPT(
        messages,
        'PRIMARY_AUTHOR',
        { temperature: temp, max_tokens: options.max_tokens || 1000 }
      );
    } catch (orchestrationError) {
      // NO GROK FALLBACK - Story authoring must use ChatGPT
      console.error('[MODEL WIRING] ChatGPT failed. No Grok fallback for story logic:', orchestrationError.message);
      throw new Error(`Story generation failed: ${orchestrationError.message}. Grok cannot be used for story authoring.`);
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
      requestedEroticism: (isSharedPlayMode() ? getCoupleEffectiveCeiling() : state.intensity) || 'Clean',
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

     // Route through canonical setting visualize prompt
     const visualizeMode = 'setting';
     const settingPromptBase = buildVisualizePrompt({ mode: visualizeMode, lastText: '' });
     const prompt = settingPromptBase + '\n\n' + worldDesc;

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

  // Anti-generic title constraint — ensures titles reflect story shape
  function buildTitleConstraint() {
      const { world, genre, dynamic } = state.picks || {};

      return `
TITLE CONSTRAINTS:
- Avoid generic romance phrases unless romance is the primary genre.
- The title must reflect at least ONE of:
  • the World (${world})
  • the Genre (${genre})
  • the Dynamic (${dynamic})
- Favor specificity over abstraction.
- Do not use stock phrases like "Desire", "Longing", "Temptation", or "Passion"
  unless they are clearly transformed by the world or genre.
`;
  }

  // Generate book cover with intent-based routing
  // Uses authoritative prestige cover template with symbolic objects
  // DSP-lite cover subtitle — deterministic premise sentence from story shape
  function generateCoverSubtitle() {
      const genre = state.picks?.genre || 'Billionaire';
      const dynamic = state.picks?.dynamic || 'Enemies';
      const world = state.picks?.world || 'Modern';
      const intensity = state.intensity || 'Naughty';

      const GENRE_PHRASE = {
          CrimeSyndicate: 'blood and loyalty',
          Billionaire: 'power and possession',
          Noir: 'shadow and compromise',
          Heist: 'trust and deception',
          Espionage: 'secrets and lies',
          Political: 'alliances and betrayal'
      };
      const DYNAMIC_PHRASE = {
          Forbidden: 'wanting defies every rule',
          Dangerous: 'desire carries a price',
          Fated: 'inevitability draws close',
          Partners: 'trust is the only weapon',
          Enemies: 'friction becomes fire',
          Friends: 'safety gives way to longing',
          Proximity: 'distance is no longer possible',
          SecretIdentity: 'truth hides behind every touch',
          Obsessive: 'devotion consumes everything',
          Caretaker: 'vulnerability becomes the way in',
          SecondChance: 'the past refuses to stay buried'
      };
      const WORLD_SHADE = {
          Modern: 'in plain sight',
          Historical: 'under the weight of tradition',
          Fantasy: 'where unseen forces stir',
          SciFi: 'at the edge of the unknown',
          Dystopia: 'beneath a fractured sky',
          PostApocalyptic: 'among what remains',
          Supernatural: 'beyond the veil',
          Superheroic: 'where power reshapes everything'
      };

      const storyNoun = (intensity === 'Erotic' || intensity === 'Dirty') ? 'story' : 'tale';
      const gp = GENRE_PHRASE[genre] || GENRE_PHRASE.Billionaire;
      const dp = DYNAMIC_PHRASE[dynamic] || DYNAMIC_PHRASE.Enemies;
      const wp = WORLD_SHADE[world] || WORLD_SHADE.Modern;
      return 'A Storybound ' + storyNoun + ' of ' + gp + ' where ' + dp + ' ' + wp + '.';
  }

  async function generateBookCover(synopsis, title, authorName) {
      // Extract story context for symbolic object selection (4-axis system)
      const world = state.picks?.world || 'Modern';
      const tone = state.picks?.tone || 'Earnest';
      const genre = state.picks?.genre || 'Billionaire';
      const dynamic = state.picks?.dynamic || 'Enemies';

      // DSP-lite subtitle replaces old "World Tone" mode line
      const modeLine = generateCoverSubtitle();
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
  // GUIDED FATE — Golden Vignette & Edge Sparkle Ceremony
  // Persists from Destiny's Choice click through book open dwell.
  // ============================================================

  let _guidedFateActive = false;
  let _fateSparkleInterval = null;
  const SPARKLE_MAX = 25;
  const SPARKLE_SPAWN_MS = 180;

  function activateGuidedFateVisuals() {
      _guidedFateActive = true;
      const vignette = document.getElementById('fateVignette');
      if (vignette) {
          vignette.classList.remove('fading');
          vignette.classList.add('active');
      }
      startFateEdgeSparkles();
  }

  function deactivateGuidedFateVisuals() {
      if (!_guidedFateActive) return;
      _guidedFateActive = false;
      const vignette = document.getElementById('fateVignette');
      if (vignette) {
          vignette.classList.remove('active');
          vignette.classList.add('fading');
          setTimeout(() => vignette.classList.remove('fading'), 1600);
      }
      stopFateEdgeSparkles();
  }

  function startFateEdgeSparkles() {
      if (_fateSparkleInterval) return;
      _fateSparkleInterval = setInterval(() => {
          if (!_guidedFateActive) return;
          spawnEdgeSparkle();
      }, SPARKLE_SPAWN_MS);
  }

  function stopFateEdgeSparkles() {
      if (_fateSparkleInterval) {
          clearInterval(_fateSparkleInterval);
          _fateSparkleInterval = null;
      }
      document.querySelectorAll('.fate-edge-sparkle').forEach(p => {
          p.style.opacity = '0';
          p.style.transition = 'opacity 0.5s ease-out';
          setTimeout(() => { if (p.parentNode) p.remove(); }, 600);
      });
  }

  function spawnEdgeSparkle() {
      if (document.querySelectorAll('.fate-edge-sparkle').length >= SPARKLE_MAX) return;

      const sparkle = document.createElement('div');
      sparkle.className = 'fate-edge-sparkle';

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x, y;

      // 30% corners (emphasis), 35% left/right edges, 35% top/bottom edges
      const zone = Math.random();
      if (zone < 0.3) {
          const corner = Math.floor(Math.random() * 4);
          x = (corner % 2 === 0) ? Math.random() * vw * 0.13 : vw - Math.random() * vw * 0.13;
          y = (corner < 2) ? Math.random() * vh * 0.13 : vh - Math.random() * vh * 0.13;
      } else if (zone < 0.65) {
          x = Math.random() < 0.5 ? Math.random() * vw * 0.08 : vw - Math.random() * vw * 0.08;
          y = vh * 0.12 + Math.random() * vh * 0.76;
      } else {
          x = vw * 0.12 + Math.random() * vw * 0.76;
          y = Math.random() < 0.5 ? Math.random() * vh * 0.08 : vh - Math.random() * vh * 0.08;
      }

      const size = 3 + Math.random() * 5;
      const duration = 1400 + Math.random() * 2200;
      const peak = 0.6 + Math.random() * 0.35;

      sparkle.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;--sparkle-duration:' + duration + 'ms;--sparkle-peak:' + peak + ';';
      document.body.appendChild(sparkle);

      setTimeout(() => { if (sparkle.parentNode) sparkle.remove(); }, duration + 100);
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

      // BOOK OPEN DWELL: After hinge animation (800ms), hold the open book
      // for 10 seconds showing inside cover before transitioning to Scene 1.
      // Total delay: 800ms hinge + 10000ms dwell = 10800ms.
      const HINGE_DURATION = 800;
      const DWELL_DURATION = 10000;

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

          // Guided Fate ceremony complete — fade vignette + stop sparkles
          deactivateGuidedFateVisuals();
      }, HINGE_DURATION + DWELL_DURATION);
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
      deactivateGuidedFateVisuals();
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
      deactivateGuidedFateVisuals();
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

  // Visualize story shape — emits declared story attributes only, no interpretive bias
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

  // Scene-aware visual signal extractor — regex only, no interpretation
  function getSceneVisualSignals(text) {
      const signals = [];
      if (/crowd|arena|stadium|spectators/i.test(text)) signals.push('crowded environment');
      if (/alone|isolated|private|quiet/i.test(text)) signals.push('intimate or secluded space');
      if (/touch|hand|grip|press|pull|close/i.test(text)) signals.push('close physical proximity');
      if (/weapon|blade|gun|armor|uniform/i.test(text)) signals.push('martial or guarded elements');
      if (/look|stare|watch|observe|eyes/i.test(text)) signals.push('focused eye contact');
      return signals;
  }

  // Character focus resolver — derives camera intent from prose, no identity guessing
  function resolveVisualFocus(text) {
      let focus = 'balanced framing of all present characters';
      if (/\byou\b|\byour\b/i.test(text)) {
          focus = 'camera favors the viewpoint character';
      }
      if (/(reaches|steps|moves|initiates|presses|leans|grabs)\b/i.test(text)) {
          focus = 'camera favors the initiating character';
      }
      if (/(watches|observes|is watched|under scrutiny|eyes on)\b/i.test(text)) {
          focus = 'camera favors the observed character';
      }
      if (/(close|whisper|breath|near|against)\b/i.test(text)) {
          focus = 'tight framing on the interaction between characters';
      }
      return focus;
  }

  // Camera distance resolver — derives framing from interaction density
  function resolveCameraDistance(text) {
      let distance = 'medium framing';
      if (/(touch|hand|grip|press|pull|whisper|breath|close|against)\b/i.test(text)) {
          distance = 'close framing';
      }
      if (/(approach|step|turn|face|block|stand before)\b/i.test(text)) {
          distance = 'medium framing';
      }
      if (/(arena|crowd|stadium|hall|city|vast|sprawling|towering)\b/i.test(text)) {
          distance = 'wide framing';
      }
      return distance;
  }

  function resolveLightingCondition(text) {
      // Default lighting
      let lighting = 'neutral ambient lighting';

      // Low-light cues
      if (/(dark|dim|shadow|night|torch|candle|lantern|flicker|low light)\b/i.test(text)) {
          lighting = 'low-light conditions with limited illumination';
      }

      // Directional / high-contrast cues
      if (/(spotlight|beam|shaft of light|backlit|rim light|glow from|lit by)\b/i.test(text)) {
          lighting = 'directional lighting with strong highlights and shadow contrast';
      }

      // Broad visibility / daylight cues
      if (/(sunlight|daylight|bright|open sky|well-lit|flooded with light)\b/i.test(text)) {
          lighting = 'even, well-lit conditions with broad visibility';
      }

      return lighting;
  }

  function resolveCompositionDensity(text) {
      // Default composition
      let density = 'balanced composition with primary subjects clearly separated from background';

      // Single or focused subject
      if (/(alone|single|one of them|isolated|only one)\b/i.test(text)) {
          density = 'sparse composition with a single primary subject';
      }

      // Small group interaction
      if (/(two of them|both|pair|together|between them)\b/i.test(text)) {
          density = 'focused composition centered on a small group';
      }

      // Crowd or multi-figure environment
      if (/(crowd|spectators|many|dozens|packed|surrounding)\b/i.test(text)) {
          density = 'dense composition with multiple figures sharing the frame';
      }

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
      // Default: scene visualize
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

          // SCENE-FIRST PROMPT CONSTRUCTION
          // Hard cap scene description to 256 characters (no ellipses, no rephrasing)
          const sceneDesc = filterAuthorFromPrompt(promptMsg).slice(0, 256);
          const modifiers = userModifiers ? " " + filterAuthorFromPrompt(userModifiers) : "";

          // Brief anchors from visual bible (characters only, 100 char max)
          const briefAnchors = filterAuthorFromPrompt(anchorText).slice(0, 100);

          // Shortened quality/intensity (clarity over verbosity)
          const shortQuality = "Attractive, elegant features, natural expressions.";
          const shortIntensity = intensityBias.split('.')[0] + "."; // First sentence only
          // Concise world/tone for image generator (first two sentences)
          const shortWorldTone = worldToneBias.split('.').slice(0, 3).join('.') + '.';

          // SCENE FIRST, then anchors/style
          let basePrompt = sceneDesc + modifiers +
              "\n---\n" +
              "Style: cinematic, painterly, no text. " +
              shortWorldTone + " " +
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

  // =========================================================================
  // FRESHNESS / ANTI-REPEAT SYSTEM
  // =========================================================================
  //
  // Per-user, cross-run cooldown system. Phrases used in recent stories are
  // blocked from reuse for 72 hours. World-appropriate phrases are allowed
  // on first use but enter cooldown afterward. User-typed phrases bypass.
  //
  // =========================================================================

  const FRESHNESS_COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours

  // Curated seed list of known repeat offenders.
  // These are NOT globally forbidden — they are subject to cooldown.
  const FRESHNESS_SEED_PHRASES = [
      'ash quarter',
      'warden-cadre',
      'wardens',
      'guild of threads',
      'emberfruit',
      'veinglass',
      'marrow-knitter',
      'the crucible',
      'iron vow',
      'ember ward',
      'shade market',
      'bone tithe',
      'velvet court',
      'obsidian syndicate',
      'gilded chain'
  ];

  // Structural patterns that detect novel instances of repeated tropes
  // (e.g. "the ___ Quarter", "___ District", "Guild of ___")
  const FRESHNESS_TROPE_PATTERNS = [
      /the\s+\w+\s+quarter\b/gi,
      /\w+\s+district\b/gi,
      /\w+\s+wardens?\b/gi,
      /\w+[\s-]+cadre\b/gi,
      /guild\s+of\s+\w+/gi,
      /\w+\s+syndicate\b/gi,
      /\w+\s+court\b/gi,
      /\w+\s+ward\b/gi
  ];

  // Internal taxonomy labels that must never leak into prose
  const TAXONOMY_LEAK_LABELS = [
      'Heart Warden', 'Shadow Warden', 'Blood Warden',
      'Open Vein', 'Spellbinder', 'Armored Fox',
      'Dark Vice', 'Beautiful Ruin', 'Eternal Flame',
      'Threshold', 'Emblem'
  ];

  /**
   * Load freshnessMemory from localStorage if available.
   */
  function loadFreshnessMemory() {
      try {
          const stored = localStorage.getItem('sb_freshness_memory');
          if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && typeof parsed === 'object') {
                  state.freshnessMemory = {
                      bannedPhrases: parsed.bannedPhrases || {},
                      bannedTokens: parsed.bannedTokens || {},
                      lastStoryFingerprint: parsed.lastStoryFingerprint || null
                  };
              }
          }
      } catch (e) {
          console.warn('[FRESHNESS] Failed to load from localStorage:', e.message);
      }
  }

  /**
   * Persist freshnessMemory to localStorage.
   */
  function saveFreshnessMemory() {
      try {
          localStorage.setItem('sb_freshness_memory', JSON.stringify(state.freshnessMemory));
      } catch (e) {
          console.warn('[FRESHNESS] Failed to save to localStorage:', e.message);
      }
  }

  /**
   * Get the list of phrases currently on cooldown for this user.
   * Prunes expired entries as a side effect.
   *
   * @param {string|null} userText - If provided, phrases the user explicitly
   *   typed are excluded from the cooldown list (user bypass).
   * @returns {string[]} Array of lowercase phrases on cooldown
   */
  function getCooldownBlockedPhrases(userText) {
      const fm = state.freshnessMemory;
      const now = Date.now();
      const blocked = [];
      const userLower = (userText || '').toLowerCase();

      // Check bannedPhrases (seed list + previously detected)
      for (const [phrase, ts] of Object.entries(fm.bannedPhrases)) {
          if (now - ts < FRESHNESS_COOLDOWN_MS) {
              // User bypass: if user explicitly typed this phrase, skip
              if (userLower.includes(phrase)) continue;
              blocked.push(phrase);
          } else {
              // Expired — prune
              delete fm.bannedPhrases[phrase];
          }
      }

      // Check bannedTokens (structural patterns detected in previous stories)
      for (const [token, ts] of Object.entries(fm.bannedTokens)) {
          if (now - ts < FRESHNESS_COOLDOWN_MS) {
              if (userLower.includes(token)) continue;
              blocked.push(token);
          } else {
              delete fm.bannedTokens[token];
          }
      }

      return blocked;
  }

  /**
   * Build the FRESHNESS DIRECTIVE block to append to the system prompt.
   * Returns empty string if no phrases are on cooldown.
   *
   * @param {string|null} userText - combined user action + dialogue text
   * @returns {string}
   */
  function buildFreshnessDirective(userText) {
      const blocked = getCooldownBlockedPhrases(userText);

      console.log(`[FRESHNESS] Cooldown list size before generation: ${blocked.length}`);

      if (blocked.length === 0) return '';

      const phraseList = blocked.map(p => `"${p}"`).join(', ');

      return `\nFRESHNESS DIRECTIVE:
The following phrases have appeared in recent stories and must NOT be reused in this story:
${phraseList}
Generate new, world-consistent equivalents instead — new district names, new faction names, new materials, new foods. Preserve the chosen World and Tone but ensure this story feels distinct from previous ones. Do not explain the substitution; simply use the new terms as if they always existed in this world.\n`;
  }

  /**
   * Build the taxonomy leak prevention directive.
   * Appended to the system prompt.
   */
  function buildTaxonomyLeakDirective() {
      return `\nINTERNAL LABEL BAN:
Never mention card names, archetype names, internal selection labels (e.g. "Heart Warden", "Beautiful Ruin", "Open Vein", "Spellbinder"), or system roles in prose, dialogue, or description. Translate them into prose traits instead. These labels are invisible to characters and readers.\n`;
  }

  /**
   * Scan generated text for freshness-relevant phrases and update memory.
   * Called after story text is received from the AI.
   *
   * @param {string} text - generated story text
   */
  function updateFreshnessMemory(text) {
      if (!text) return;
      const lower = text.toLowerCase();
      const now = Date.now();
      const fm = state.freshnessMemory;
      const detected = [];

      // 1. Check seed phrases
      for (const phrase of FRESHNESS_SEED_PHRASES) {
          if (lower.includes(phrase)) {
              fm.bannedPhrases[phrase] = now;
              detected.push(phrase);
          }
      }

      // 2. Check structural trope patterns
      for (const rx of FRESHNESS_TROPE_PATTERNS) {
          rx.lastIndex = 0;
          let m;
          while ((m = rx.exec(lower)) !== null) {
              const token = m[0].trim();
              if (token.length > 3) {
                  fm.bannedTokens[token] = now;
                  detected.push(token);
              }
          }
      }

      // 3. Update fingerprint (simple hash of first 200 chars)
      fm.lastStoryFingerprint = text.slice(0, 200).replace(/\s+/g, ' ').trim();

      if (detected.length > 0) {
          console.log('[FRESHNESS] Phrases detected in generated text and added to memory:', detected);
      }

      saveFreshnessMemory();
  }

  /**
   * Lightweight taxonomy leak post-check.
   * If generated text contains exact archetype label strings currently in use,
   * replace them with a generic paraphrase BEFORE rendering.
   *
   * @param {string} text - generated story text
   * @returns {string} cleaned text
   */
  function scrubTaxonomyLeaks(text) {
      if (!text) return text;

      let result = text;
      const currentArchetype = state.archetype?.primary;

      for (const label of TAXONOMY_LEAK_LABELS) {
          // Case-sensitive exact match (these are proper-noun-style labels)
          if (result.includes(label)) {
              console.warn(`[TAXONOMY-LEAK] DEV WARNING: "${label}" found in generated prose — replacing`);
              const paraphrase = taxonomyLeakReplacement(label);
              result = result.split(label).join(paraphrase);
          }
      }

      // Also check for the raw archetype ID (e.g. "BEAUTIFUL_RUIN") in prose
      if (currentArchetype && result.includes(currentArchetype)) {
          console.warn(`[TAXONOMY-LEAK] DEV WARNING: Raw archetype ID "${currentArchetype}" found in prose — replacing`);
          result = result.split(currentArchetype).join('a figure of quiet intensity');
      }

      return result;
  }

  /**
   * Map taxonomy label to a safe prose paraphrase.
   */
  function taxonomyLeakReplacement(label) {
      const map = {
          'Heart Warden':    'a devoted guardian',
          'Shadow Warden':   'a silent protector',
          'Blood Warden':    'a fierce sentinel',
          'Open Vein':       'someone who felt everything too deeply',
          'Spellbinder':     'someone who commanded attention effortlessly',
          'Armored Fox':     'someone who deflected with charm',
          'Dark Vice':       'someone dangerous and magnetic',
          'Beautiful Ruin':  'someone who destroyed what they loved',
          'Eternal Flame':   'someone whose devotion never wavered',
          'Threshold':       'a moment of transformation',
          'Emblem':          'a defining symbol'
      };
      return map[label] || 'a distinctive presence';
  }

  // FRESHNESS: Load persisted memory from localStorage at startup
  loadFreshnessMemory();

  // =========================================================================
  // NARRATIVE VOCABULARY ENFORCEMENT
  // =========================================================================
  //
  // Post-generation enforcement layer for vocabulary bans and structural
  // narrator constraints. Operates on raw AI output BEFORE formatting.
  //
  // This extends the existing veto/bannedWords system (which injects bans
  // into the system prompt) with a code-level validation + single-retry
  // regeneration path.
  //
  // Includes: Author Density Validation for 5th Person (Author) POV.
  //
  // =========================================================================

  /**
   * Scrub generated text for vocabulary violations.
   *
   * Checks:
   * 1. Banned words from state.veto.bannedWords
   * 2. Author Density (positive constraint) when 5th Person POV is active
   *
   * @param {string} text - Raw AI-generated prose
   * @param {object} context
   *   context.type       'prose' | 'title' | 'synopsis'
   *   context.isFatePOV  boolean — true when 5th Person (Author) POV is active
   *   context.sceneIndex number — 1-based scene/page index
   * @returns {{ clean: boolean, violations: Array<{type, message, detail}> }}
   */
  function scrubNarrativeVocabulary(text, context) {
      const violations = [];

      if (!text || typeof text !== 'string') {
          return { clean: true, violations };
      }

      // --- 1. Banned-word scan ---
      const banned = state.veto?.bannedWords || [];
      for (const word of banned) {
          if (!word) continue;
          const rx = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
          const hits = (text.match(rx) || []).length;
          if (hits > 0) {
              violations.push({
                  type: 'banned_word',
                  message: `Banned word "${word}" found ${hits} time(s)`,
                  detail: { word, count: hits }
              });
          }
      }

      // --- 2. Author Density Validation (5th Person POV only) ---
      // Applies ONLY to prose — never to titles or synopsis
      if (
          context.type === 'prose' &&
          context.isFatePOV === true &&
          state.povMode === 'author5th'
      ) {
          const authorRx = /The Author\b/g;
          const count = (text.match(authorRx) || []).length;

          let minRequired, maxAllowed;
          if (context.sceneIndex === 1) {
              minRequired = 5;
              maxAllowed = 10;
          } else {
              minRequired = 3;
              maxAllowed = 6;
          }

          if (count < minRequired) {
              violations.push({
                  type: 'author_density_underflow',
                  message: `"The Author" appears ${count} time(s), minimum is ${minRequired} for scene ${context.sceneIndex}`,
                  detail: { count, minRequired, maxAllowed, sceneIndex: context.sceneIndex }
              });
          } else if (count > maxAllowed) {
              violations.push({
                  type: 'author_density_overflow',
                  message: `"The Author" appears ${count} time(s), maximum is ${maxAllowed} for scene ${context.sceneIndex}`,
                  detail: { count, minRequired, maxAllowed, sceneIndex: context.sceneIndex }
              });
          }
      }

      return {
          clean: violations.length === 0,
          violations
      };
  }

  /**
   * Build constraint string(s) from violations to append to system prompt
   * on a regeneration pass.
   *
   * @param {Array<{type, message, detail}>} violations
   * @returns {string} Constraint text to append to the system prompt
   */
  function buildVocabBanConstraint(violations) {
      const parts = [];

      for (const v of violations) {
          switch (v.type) {
              case 'banned_word':
                  parts.push(
                      `VOCABULARY BAN VIOLATION: The word "${v.detail.word}" is BANNED. ` +
                      `Do NOT use it. Replace with a contextually appropriate alternative.`
                  );
                  break;

              case 'author_density_underflow':
                  parts.push(
                      `AUTHOR DENSITY CONSTRAINT: Ensure "The Author" appears at least ` +
                      `${v.detail.minRequired} times in the prose as an on-page Fate presence. ` +
                      `Current count: ${v.detail.count}. Scene ${v.detail.sceneIndex} requires ` +
                      `${v.detail.minRequired}–${v.detail.maxAllowed} mentions.`
                  );
                  break;

              case 'author_density_overflow':
                  parts.push(
                      `AUTHOR DENSITY CONSTRAINT: Reduce repetitions of "The Author" to ` +
                      `no more than ${v.detail.maxAllowed} mentions. Current count: ${v.detail.count}. ` +
                      `Scene ${v.detail.sceneIndex} allows ${v.detail.minRequired}–${v.detail.maxAllowed}.`
                  );
                  break;

              default:
                  // TODO: Unknown violation type — log and skip
                  console.warn('[VOCAB-ENFORCE] Unknown violation type:', v.type);
                  break;
          }
      }

      return parts.join('\n');
  }

  /**
   * Enforce vocabulary bans and structural narrator constraints on AI output.
   *
   * Flow:
   *   1. Scrub text for violations
   *   2. If violations found → build constraint → regenerate ONCE
   *   3. Re-scrub after regeneration
   *   4. If still violated → log hard warning, return best-effort
   *   5. NEVER loops more than once
   *
   * @param {string} text - Raw AI-generated prose
   * @param {object} context - Same context object as scrubNarrativeVocabulary
   * @param {function} regenerateFn - async (constraintString) => string
   *        Called with the constraint to append to the system prompt.
   *        Returns the regenerated raw text.
   * @returns {Promise<{ text: string, enforced: boolean, violations: Array }>}
   */
  async function enforceVocabularyBans(text, context, regenerateFn) {
      // --- First pass ---
      const firstCheck = scrubNarrativeVocabulary(text, context);

      if (firstCheck.clean) {
          return { text, enforced: false, violations: [] };
      }

      console.log('[VOCAB-ENFORCE] Violations detected on first pass:',
          firstCheck.violations.map(v => v.message));

      // --- Build constraint and regenerate ONCE ---
      const constraint = buildVocabBanConstraint(firstCheck.violations);

      let regenerated;
      try {
          regenerated = await regenerateFn(constraint);
      } catch (err) {
          console.error('[VOCAB-ENFORCE] Regeneration failed:', err.message);
          // Return original text as best-effort
          return { text, enforced: false, violations: firstCheck.violations };
      }

      if (!regenerated || typeof regenerated !== 'string' || regenerated.trim().length === 0) {
          console.warn('[VOCAB-ENFORCE] Regeneration returned empty; using original');
          return { text, enforced: false, violations: firstCheck.violations };
      }

      // --- Second pass (re-check) ---
      const secondCheck = scrubNarrativeVocabulary(regenerated, context);

      if (secondCheck.clean) {
          console.log('[VOCAB-ENFORCE] Enforcement succeeded after regeneration');
          return { text: regenerated, enforced: true, violations: [] };
      }

      // Still violated — log hard warning, return best-effort (regenerated version)
      console.warn('[VOCAB-ENFORCE] HARD WARNING: Violations persist after regeneration:',
          secondCheck.violations.map(v => v.message));
      return { text: regenerated, enforced: true, violations: secondCheck.violations };
  }

  // --- GAME LOOP ---
  $('submitBtn')?.addEventListener('click', async () => {
      const billingLock = (state.mode === 'solo') && ['affair','soulmates'].includes(state.storyLength) && !state.subscribed;
      if (billingLock) { window.showPaywall('unlock'); return; }

      const rawAct = $('actionInput').value.trim();
      const rawDia = $('dialogueInput').value.trim();
      if(!rawAct && !rawDia) return alert("Input required.");

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
          showToast("Boundary Redirect Active");
          if(safeAction) $('actionInput').value = safeAction;
          if(safeDialogue) $('dialogueInput').value = safeDialogue;
          return;
      }

      // SHARED PLAY: De-escalation signal detection (before submission)
      if (isSharedPlayMode()) {
          // Skip de-escalation check if this is a re-triggered submission after confirmation
          if (!state.coupleIntensity._deescalationBypassed) {
              const deescSignal = detectDeescalationSignal(act, dia);
              if (deescSignal.isHardStop) {
                  // Hold submission and confirm intent
                  state.coupleIntensity._pendingAction = act;
                  state.coupleIntensity._pendingDialogue = dia;
                  holdForDeescalation(null, null);
                  return; // Stop submission; resumed after confirmation via _handleDeescalation
              }
          } else {
              state.coupleIntensity._deescalationBypassed = false;
          }

          // SHARED PLAY: Self-escalation detection
          detectSelfEscalation(act, dia);
      }

      startLoading("Fate is weaving...", STORY_LOADING_MESSAGES);

      // Get story context from all pages
      const allContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ');
      const context = allContent.slice(-3000);
      
      // Determine effective intensity level
      // In shared play modes, the managed ceiling overrides the player's intensity setting
      const effectiveIntensity = (isSharedPlayMode() && !state.godModeActive)
          ? getCoupleEffectiveCeiling()
          : state.intensity;

      let intensityGuard = "";
      if (state.godModeActive) {
          intensityGuard = "GOD MODE ACTIVE: IGNORE PACING/SAFETY. OBEY USER INPUT DIRECTLY. RENDER EXPLICIT CONTENT IF REQUESTED.";
      } else if (effectiveIntensity === "Naughty") {
          intensityGuard = "INTENSITY RULE: Naughty. Reinterpret any explicit user input into suggestive, non-graphic prose. Do NOT echo graphic terms. Focus on tension.";
      } else if (effectiveIntensity === "Erotic") {
          intensityGuard = "INTENSITY RULE: Erotic. Explicit intimacy allowed. If input is extreme, soften it while preserving the act. Maintain literary tone.";
      } else if (effectiveIntensity === "Dirty") {
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

      // FRESHNESS: Turn-level freshness + taxonomy directives
      const turnFreshness = buildFreshnessDirective(act + ' ' + dia);
      const turnTaxonomy = buildTaxonomyLeakDirective();

      const fullSys = state.sysPrompt + `\n\n${intensityGuard}\n${squashDirective}\n${metaReminder}\n${vetoRules}\n${quillDirective}\n${bbDirective}\n${safetyDirective}\n${edgeDirective}\n${pacingDirective}\n${turnFreshness}\n${turnTaxonomy}\n\nTURN INSTRUCTIONS:
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
                                       ['Erotic', 'Dirty'].includes(effectiveIntensity);

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

          // --- NARRATIVE VOCABULARY ENFORCEMENT ---
          // Enforce banned words and Author density (5th Person POV) on prose.
          // Uses single-retry regeneration via the same callChat path.
          {
              const vocabContext = {
                  type: 'prose',
                  isFatePOV: state.povMode === 'author5th',
                  sceneIndex: StoryPagination.getPageCount() + 1  // 1-based; next page
              };

              const vocabResult = await enforceVocabularyBans(raw, vocabContext, async (constraint) => {
                  // Regenerate with the constraint appended to the system prompt
                  return await callChat([
                      { role: 'system', content: fullSys + '\n\n' + constraint },
                      { role: 'user', content: `Action: ${act}\nDialogue: "${dia}"` }
                  ]);
              });

              raw = vocabResult.text;
          }

          // FRESHNESS: Update memory with turn text + scrub taxonomy leaks
          updateFreshnessMemory(raw);
          raw = scrubTaxonomyLeaks(raw);

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

          // Add AI response — process through intensity pipeline if in shared play mode
          let formattedStory = formatStory(raw);
          if (isSharedPlayMode()) {
              const coupleResult = processCoupleContent(raw, formattedStory, false);
              formattedStory = coupleResult.content;
              if (coupleResult.held) {
                  // Message held for de-escalation confirmation; skip display
                  stopLoading();
                  return;
              }
          }
          pageContent += formattedStory;

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
  window.coupleCleanup = function(){
      if(sb) sb.removeAllChannels();
      // Clear all couple intensity permissions on session cleanup
      if (typeof resetCoupleIntensity === 'function') resetCoupleIntensity();
      // Clear mask presentation state on session cleanup
      if (typeof resetCoupleMask === 'function') resetCoupleMask();
  };

  function broadcastTurn(text, isInit = false) {
      if (!sb || window.state.mode !== 'couple' || !window.state.roomId) return;
      // Stub implementation; real Supabase broadcast can be added later
      // TODO: When implementing real broadcast, incoming content from partner
      // must be processed through processIncomingCoupleContent(rawText) before display.
      // This applies Dirty detection, masking, consent prompts, and rewriting.
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
     // Initialize shared-play intensity session
     if (m === 'couple') initCoupleIntensitySession('Naughty');
     if (m === 'stranger') initCoupleIntensitySession('Clean');
     if(m === 'solo') window.showScreen('setup');
     if(m === 'couple') window.showScreen('coupleInvite');
     if(m === 'stranger') window.showScreen('setup');
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

  // ==========================================================================
  // SHARED PLAY MODE HELPER
  // ==========================================================================
  //
  // Couple and Stranger modes share intensity progression (9.x), mask
  // presentation, and Fate framing. This helper avoids duplicating mode
  // checks across all guard sites.
  //
  // ==========================================================================

  /**
   * Returns true when the active mode uses the shared intensity + mask systems.
   * Currently: 'couple' and 'stranger'.
   */
  function isSharedPlayMode() {
      return state.mode === 'couple' || state.mode === 'stranger';
  }

  // ==========================================================================
  // COUPLE / STRANGER PLAY INTENSITY & CONSENT SYSTEM
  // ==========================================================================
  //
  // AUTHORITATIVE — DO NOT REINTERPRET
  //
  // This module manages intensity progression and directional consent
  // for Couple and Stranger Play sessions. It does NOT modify Solo Play.
  //
  // Tier progression: Naughty → Erotic (silent unlock) → Dirty (consent-gated)
  // Stranger starts at Clean, Couple starts at Naughty.
  // Consent is directional (A→B, B→A), session-scoped, never persisted.
  //
  // ==========================================================================

  const COUPLE_INTENSITY_TIERS = ['Clean', 'Naughty', 'Erotic', 'Dirty'];

  /**
   * Initialize (or reset) intensity state for a new shared-play session.
   * Called when entering couple or stranger mode. Ignores prior session state.
   * @param {string} [startCeiling='Naughty'] - Initial ceiling tier.
   *        Couple defaults to 'Naughty'; Stranger defaults to 'Clean'.
   */
  function initCoupleIntensitySession(startCeiling = 'Naughty') {
      state.coupleIntensity = {
          ceiling: startCeiling,
          eroticUnlocked: false,
          eroticUnlockScore: 0,
          inboundDirtyConsent: null,
          inboundDirtyPrompted: false,
          outboundDirtyConsent: null,
          outboundDirtyPrompted: false,
          selfEscalatedDirty: false,
          reopenOffered: false,
          reopenAccepted: false,
          deescalationActive: false,
          deescalationCap: null,
          pendingHoldMessage: null,
          pendingHoldRaw: null
      };
      console.log('[COUPLE-INTENSITY] Session initialized at Naughty ceiling');
  }

  /**
   * Get the effective intensity ceiling for content generation in couple mode.
   * Returns the tier name that should be used as the intensity guard.
   */
  function getCoupleEffectiveCeiling() {
      if (!isSharedPlayMode()) return state.intensity;

      const ci = state.coupleIntensity;

      // De-escalation cap overrides everything
      if (ci.deescalationActive && ci.deescalationCap) {
          return ci.deescalationCap;
      }

      return ci.ceiling;
  }

  /**
   * Evaluate whether Erotic should be silently unlocked.
   * Called after each turn. Uses pacing signals:
   *   - Turn count (minimum turns before unlock)
   *   - Dialogue intensity (suggestive language detection)
   *   - Story stage progression
   *
   * Does NOT announce unlock. No UI prompt.
   */
  function evaluateEroticUnlock() {
      if (!isSharedPlayMode()) return;
      const ci = state.coupleIntensity;
      if (ci.eroticUnlocked) return; // Already unlocked

      // De-escalation blocks further escalation
      if (ci.deescalationActive) return;

      // Pacing signals that contribute to Erotic unlock score
      let score = ci.eroticUnlockScore;

      // Turn count: each turn in couple mode contributes
      score += 1;

      // Dialogue intensity: suggestive language adds to score
      const allContent = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').toLowerCase();
      const recentContent = allContent.slice(-2000);

      const suggestivePatterns = [
          /\b(kiss|kissed|kissing)\b/,
          /\b(touch|touched|touching|caress)\b/,
          /\b(desire|longing|ache|hunger)\b/,
          /\b(lips|breath|whisper|moan)\b/,
          /\b(closer|pressed|against)\b/,
          /\b(pulse|shiver|tremble)\b/,
          /\b(undress|unbutton|bare|skin)\b/
      ];

      const matchCount = suggestivePatterns.filter(rx => rx.test(recentContent)).length;
      score += Math.min(matchCount, 4); // Cap contribution from dialogue signals

      // Story stage: post-setup adds to readiness
      if (state.storyStage !== 'pre-intimacy') {
          score += 2;
      }

      ci.eroticUnlockScore = score;

      // Unlock threshold: requires meaningful narrative progression
      // ~3-4 turns with some suggestive content, or ~6 turns without
      const EROTIC_UNLOCK_THRESHOLD = 8;

      if (score >= EROTIC_UNLOCK_THRESHOLD) {
          ci.eroticUnlocked = true;
          ci.ceiling = 'Erotic';
          console.log('[COUPLE-INTENSITY] Erotic unlocked silently (score:', score, ')');
      }
  }

  // -----------------------------------------------------------------------
  // DIRTY CONTENT DETECTION — WEIGHTED SIGNAL HEURISTICS
  // -----------------------------------------------------------------------
  //
  // AUTHORITATIVE — DO NOT REINTERPRET
  //
  // Detection uses a weighted signal system, NOT keyword-only matching.
  // Dirty detection is gated behind:
  //   1. Erotic tier must be active (ceiling ≥ Erotic)
  //   2. Minimum narrative progression (turn count)
  //   3. No active Dirty lock for the relevant direction
  //
  // Trigger requires ≥1 High-Weight AND ≥1 Medium-Weight signal within
  // the same narrative window (sentence cluster). Single signals never trigger.
  //
  // Guards suppress detection when language is metaphorical, terms are
  // non-sexual in context, or resistance/de-escalation is present.
  //
  // -----------------------------------------------------------------------

  // --- HIGH-WEIGHT SIGNALS ---
  // Each returns an array of { match, index, length } for the input text.

  /**
   * High-Weight: Explicit anatomical references used in a sexual context.
   * Matches vulgar/explicit anatomical terms only.
   */
  const HW_ANATOMICAL = [
      /\b(cock|dick|cunt|pussy|clit(?:oris)?|tits|asshole)\b/gi,
      /\b(shaft|member|slit|folds|entrance)\b/gi  // secondary; needs context
  ];

  /**
   * High-Weight: Explicit sexual mechanics.
   * Direct, graphic description of sexual acts.
   */
  const HW_MECHANICS = [
      /\b(fuck(?:ed|ing|s)?|penetrat(?:ed|ing|es?|ion))\b/gi,
      /\b(thrust(?:ed|ing|s)?|pound(?:ed|ing|s)?|slammed?|rammed?)\b/gi,
      /\b(rode|riding|straddl(?:ed|ing)|mount(?:ed|ing))\b/gi,
      /\b(finger(?:ed|ing)|entered|filled)\b/gi  // secondary; needs context
  ];

  /**
   * High-Weight: Fluid / emission references.
   * Graphic references to sexual fluids or climax.
   */
  const HW_FLUIDS = [
      /\b(cum(?:ming|med|s)?|jizz|seed|spill(?:ed|ing)?)\b/gi,
      /\b(orgasm(?:ed|ing|s)?|climax(?:ed|ing)?)\b/gi,
      /\b(squirt(?:ed|ing)?|ejacula(?:ted?|ting|tion))\b/gi
  ];

  // --- MEDIUM-WEIGHT SIGNALS ---

  /**
   * Medium-Weight: Sustained sensory saturation.
   * Multiple visceral/physical descriptors in close proximity.
   */
  const MW_SENSORY = [
      /\b(throb(?:bing|bed|s)?|puls(?:ing|ed|es?)|ach(?:ing|ed))\b/gi,
      /\b(wet(?:ness)?|slick(?:ness)?|dripping|soaked|drenched)\b/gi,
      /\b(tight(?:ness|ened|ening)?|clench(?:ed|ing)|gripp(?:ed|ing))\b/gi,
      /\b(moan(?:ed|ing|s)?|groan(?:ed|ing|s)?|gasp(?:ed|ing|s)?|whimper(?:ed|ing)?|cried?\s*out)\b/gi,
      /\b(erect(?:ion)?|hard(?:ness|ened|ening)?|stiff(?:ened|ening)?)\b/gi,
      /\b(swollen|flush(?:ed)?|heated|burning)\b/gi
  ];

  /**
   * Medium-Weight: Intent lock-in language.
   * Language that signals committed sexual escalation ("demanding" tone).
   */
  const MW_INTENT = [
      /\b(beg(?:ged|ging)?|plead(?:ed|ing)?|need(?:ed|ing)?\s+(?:you|it|more|this))\b/gi,
      /\b(harder|deeper|faster|more|don'?t\s+stop|keep\s+going)\b/gi,
      /\b(take\s+(?:me|it|all)|give\s+(?:me|it)|fill\s+(?:me|her|him))\b/gi,
      /\b(claim(?:ed|ing)?|devour(?:ed|ing)?|consum(?:ed|ing)?)\b/gi
  ];

  /**
   * Medium-Weight: Mutual escalation within a short window.
   * Both parties actively engaged in explicit action within the same passage.
   * Detected via interleaved perspective/action markers.
   */
  const MW_MUTUAL = [
      /\b(both|together|each\s+other|in\s+unison|matched)\b/gi,
      /\b(she.*he|he.*she|they\s+moved|bodies\s+(?:pressed|entwined|tangled|locked))\b/gi,
      /\b(wrapped\s+around|pulled\s+(?:closer|tight)|arched\s+(?:into|against|toward))\b/gi
  ];

  // --- GUARD PATTERNS (suppress false positives) ---

  /**
   * Metaphorical usage guard.
   * These phrases use explicit-adjacent words in clearly non-sexual contexts.
   */
  const GUARD_METAPHORICAL = [
      /\b(riding\s+(?:the\s+)?(?:wave|storm|wind|horse|stallion|carriage|train))\b/i,
      /\b(mounting\s+(?:tension|pressure|fear|dread|evidence|stairs))\b/i,
      /\b(thrust\s+(?:the|a|his|her)?\s*(?:sword|blade|knife|spear|weapon|door|hand\s+out))\b/i,
      /\b(came\s+(?:to|back|from|in(?:to|side)?(?:\s+the)?(?:\s+(?:room|house|building|door|view))))\b/i,
      /\b(hard(?:ly|\s+work|\s+time|\s+to\s+(?:believe|say|tell|know)|\s+(?:floor|ground|surface|wall|rock)))\b/i,
      /\b(stiff\s+(?:drink|breeze|wind|upper\s+lip|resistance|penalty|competition))\b/i,
      /\b(wet\s+(?:hair|clothes|rain|floor|ground|grass|pavement|tears|eyes))\b/i,
      /\b(spread\s+(?:the|a|across|out|over|through|wide\s+open\s+(?:door|arms|field)))\b/i,
      /\b(swallow(?:ed|ing)?\s+(?:hard|nervously|the\s+lump|(?:her|his)\s+(?:pride|fear|words)))\b/i,
      /\b(erect(?:ed|ing)?\s+(?:a|the)\s+(?:building|wall|fence|barrier|monument|tent|structure))\b/i
  ];

  /**
   * Non-sexual explicit term guard.
   * Explicit words used in clearly non-sexual contexts (medical, violent, etc.).
   */
  const GUARD_NONSEXUAL = [
      /\b(dick)\s+(?=[A-Z])/,  // Proper name "Dick"
      /\b(cock)\s*(?:pit|roach|tail|a(?:too|doodle))/i,  // cockpit, cocktail etc.
      /\b(pussy)\s*(?:cat|foot|willow)/i,
      /\b(?:a|the)\s+(member)\s+(?:of|from|said|spoke|who)/i,  // "member of parliament"
      /\b(ass)\s*(?:ess|et|ign|emble|ist|ur|ault)/i  // assess, asset, assign...
  ];

  /**
   * Resistance / de-escalation guard.
   * If resistance language is present in the same window, suppress Dirty detection.
   * This prevents masking content that depicts boundaries being drawn.
   */
  const GUARD_RESISTANCE = [
      /\b(stop(?:ped)?|don'?t|no(?:!|\s|,)|wait|please\s+(?:stop|don'?t|no)|push(?:ed)?\s+(?:away|back)|pull(?:ed)?\s+(?:away|back))\b/i,
      /\b(not\s+(?:ready|yet|like\s+this)|too\s+(?:fast|soon|much)|slow\s+down|step(?:ped)?\s+(?:back|away))\b/i,
      /\b(can'?t\s+(?:do\s+this|go\s+(?:further|on))|shouldn'?t|won'?t)\b/i
  ];

  // --- MINIMUM PROGRESSION CONSTANTS ---
  const DIRTY_MIN_TURNS = 3;           // Minimum turns into couple session before detection activates
  const DIRTY_NARRATIVE_WINDOW = 3;    // Number of adjacent sentences that form a "window"

  // -----------------------------------------------------------------------
  // MAIN DETECTION FUNCTION
  // -----------------------------------------------------------------------

  /**
   * Evaluate Dirty signals in AI-generated content.
   *
   * Returns {
   *   isDirty: boolean,
   *   segments: Array<{ start, end, text, spans: Array<{start, end, text}> }>,
   *   suppressed: boolean,
   *   suppressReason: string|null
   * }
   *
   * A segment is a sentence (or sentence cluster) that triggers.
   * Each segment also carries `spans` — the individual explicit phrases
   * within that sentence that should be masked (not the whole sentence).
   */
  function detectDirtyContent(text) {
      const EMPTY = { isDirty: false, segments: [], suppressed: false, suppressReason: null };
      if (!text) return EMPTY;

      // --- Gate 1: Erotic must be active ---
      const ci = state.coupleIntensity;
      if (!ci.eroticUnlocked) {
          return EMPTY;
      }

      // --- Gate 2: Minimum narrative progression ---
      if ((state.turnCount || 0) < DIRTY_MIN_TURNS) {
          return EMPTY;
      }

      // --- Gate 3: De-escalation active → abort immediately ---
      if (ci.deescalationActive) {
          return EMPTY;
      }

      // --- Split into sentences for windowed analysis ---
      const sentences = text.split(/(?<=[.!?…])\s+/);
      if (sentences.length === 0) return EMPTY;

      // --- Guard: check for resistance in the full text ---
      const lowerText = text.toLowerCase();
      for (const rx of GUARD_RESISTANCE) {
          if (rx.test(lowerText)) {
              return {
                  isDirty: false,
                  segments: [],
                  suppressed: true,
                  suppressReason: 'resistance_language'
              };
          }
      }

      // --- Scan each sentence for signals ---
      const sentenceAnalysis = sentences.map(sentence => {
          const lower = sentence.toLowerCase();
          return {
              sentence,
              lower,
              highWeight: scoreSentence(sentence, [HW_ANATOMICAL, HW_MECHANICS, HW_FLUIDS]),
              mediumWeight: scoreSentence(sentence, [MW_SENSORY, MW_INTENT, MW_MUTUAL]),
              isGuardedMetaphor: GUARD_METAPHORICAL.some(rx => rx.test(sentence)),
              isGuardedNonSexual: GUARD_NONSEXUAL.some(rx => rx.test(sentence))
          };
      });

      // --- Build segments using a sliding narrative window ---
      const segments = [];
      let offset = 0;

      for (let i = 0; i < sentenceAnalysis.length; i++) {
          // Build a window of DIRTY_NARRATIVE_WINDOW adjacent sentences
          const windowEnd = Math.min(i + DIRTY_NARRATIVE_WINDOW, sentenceAnalysis.length);
          const window = sentenceAnalysis.slice(i, windowEnd);

          // Aggregate signals across the window
          let windowHigh = 0;
          let windowMedium = 0;
          let anyGuarded = false;

          for (const s of window) {
              windowHigh += s.highWeight.totalHits;
              windowMedium += s.mediumWeight.totalHits;
              if (s.isGuardedMetaphor || s.isGuardedNonSexual) anyGuarded = true;
          }

          // --- Guard suppression: metaphorical or non-sexual context ---
          if (anyGuarded) {
              // Reduce signal weight; only proceed if overwhelming
              windowHigh = Math.max(0, windowHigh - 1);
              windowMedium = Math.max(0, windowMedium - 1);
          }

          // --- Trigger condition: ≥1 High AND ≥1 Medium in same window ---
          if (windowHigh >= 1 && windowMedium >= 1) {
              // Collect explicit spans from the sentences in this window
              const spans = [];
              for (const s of window) {
                  const allMatches = [
                      ...collectSpanMatches(s.sentence, HW_ANATOMICAL),
                      ...collectSpanMatches(s.sentence, HW_MECHANICS),
                      ...collectSpanMatches(s.sentence, HW_FLUIDS)
                  ];
                  // Filter out guarded matches
                  for (const m of allMatches) {
                      if (!isGuardedMatch(s.sentence, m.text)) {
                          // Compute absolute position in the full text
                          const sentStart = text.indexOf(s.sentence, offset);
                          if (sentStart !== -1) {
                              spans.push({
                                  start: sentStart + m.index,
                                  end: sentStart + m.index + m.text.length,
                                  text: m.text
                              });
                          }
                      }
                  }
              }

              if (spans.length > 0) {
                  // Determine segment boundaries (first sentence start to last sentence end)
                  const firstSentence = window[0].sentence;
                  const lastSentence = window[window.length - 1].sentence;
                  const segStart = text.indexOf(firstSentence, offset);
                  const segEnd = text.indexOf(lastSentence, offset) + lastSentence.length;

                  if (segStart !== -1 && segEnd > segStart) {
                      segments.push({
                          start: segStart,
                          end: segEnd,
                          text: text.slice(segStart, segEnd),
                          spans
                      });

                      // Skip forward past this window to avoid overlapping segments
                      i = windowEnd - 1;
                      offset = segEnd;
                      continue;
                  }
              }
          }

          // Advance offset tracker
          const currentSentence = sentenceAnalysis[i].sentence;
          const sentPos = text.indexOf(currentSentence, offset);
          if (sentPos !== -1) offset = sentPos + currentSentence.length;
      }

      return {
          isDirty: segments.length > 0,
          segments,
          suppressed: false,
          suppressReason: null
      };
  }

  // -----------------------------------------------------------------------
  // SIGNAL SCORING HELPERS
  // -----------------------------------------------------------------------

  /**
   * Score a sentence against a set of pattern groups.
   * Returns { totalHits, matches: [{text, index}] }
   */
  function scoreSentence(sentence, patternGroups) {
      let totalHits = 0;
      const matches = [];

      for (const group of patternGroups) {
          let groupHit = false;
          for (const rx of group) {
              // Reset lastIndex for global regexps
              rx.lastIndex = 0;
              let m;
              while ((m = rx.exec(sentence)) !== null) {
                  if (!groupHit) {
                      totalHits++;
                      groupHit = true;
                  }
                  matches.push({ text: m[0], index: m.index });
              }
          }
      }

      return { totalHits, matches };
  }

  /**
   * Collect all match spans from a sentence for a set of pattern groups.
   * Returns Array<{text, index, length}>
   */
  function collectSpanMatches(sentence, patternGroups) {
      const results = [];
      for (const group of patternGroups) {
          for (const rx of group) {
              rx.lastIndex = 0;
              let m;
              while ((m = rx.exec(sentence)) !== null) {
                  results.push({ text: m[0], index: m.index, length: m[0].length });
              }
          }
      }
      return results;
  }

  /**
   * Check whether a specific match within a sentence is guarded
   * (metaphorical or non-sexual usage).
   */
  function isGuardedMatch(sentence, matchText) {
      // Build a narrow context window around the match
      const idx = sentence.toLowerCase().indexOf(matchText.toLowerCase());
      if (idx === -1) return false;

      // Extract ±40 chars around the match for context
      const ctxStart = Math.max(0, idx - 40);
      const ctxEnd = Math.min(sentence.length, idx + matchText.length + 40);
      const context = sentence.slice(ctxStart, ctxEnd);

      for (const rx of GUARD_METAPHORICAL) {
          if (rx.test(context)) return true;
      }
      for (const rx of GUARD_NONSEXUAL) {
          if (rx.test(context)) return true;
      }
      return false;
  }

  // -----------------------------------------------------------------------
  // DIRTY SEGMENT MASKING
  // -----------------------------------------------------------------------

  /**
   * Apply inline [dirty] mask overlays to explicit spans within segments.
   *
   * IMPORTANT: Masks only the explicit spans (individual words/phrases),
   * NOT entire sentences. Surrounding context, rhythm, and grammar are
   * preserved. The mask is subtle and inline.
   */
  function maskDirtySegments(htmlContent, segments) {
      if (!segments || segments.length === 0) return htmlContent;

      let result = htmlContent;

      // Collect all individual explicit spans across all segments,
      // deduplicated and sorted by position (reverse for safe replacement)
      const allSpans = [];
      const seen = new Set();

      for (const seg of segments) {
          if (seg.spans && seg.spans.length > 0) {
              for (const span of seg.spans) {
                  const key = `${span.start}:${span.end}`;
                  if (!seen.has(key)) {
                      seen.add(key);
                      allSpans.push(span);
                  }
              }
          }
      }

      // Sort reverse so replacements don't shift positions
      allSpans.sort((a, b) => b.start - a.start);

      for (const span of allSpans) {
          // Escape for regex safety; allow whitespace flexibility
          const searchText = span.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const rx = new RegExp(searchText.replace(/\s+/g, '\\s*'), 'i');

          result = result.replace(rx, (match) => {
              return `<span class="dirty-mask" data-dirty-original="${encodeURIComponent(match)}" onclick="window._revealDirtySegment(this)" title="Tap to reveal">${match}</span>`;
          });
      }

      return result;
  }

  /**
   * Reveal a single masked dirty segment on click.
   * Only works if the player has accepted Dirty consent.
   */
  window._revealDirtySegment = function(el) {
      if (!el) return;
      const ci = state.coupleIntensity;

      if (ci.inboundDirtyConsent === true) {
          // Consent given — reveal
          el.classList.remove('dirty-mask');
          el.classList.add('dirty-revealed');
      } else if (ci.inboundDirtyConsent === null && !ci.inboundDirtyPrompted) {
          // Not yet asked — trigger consent prompt
          showDirtyConsentPrompt('inbound');
      }
      // If declined, clicking does nothing (content stays masked/rewritten)
  };

  // -----------------------------------------------------------------------
  // DIRECTIONAL DIRTY CONSENT
  // -----------------------------------------------------------------------

  /**
   * Show the Dirty consent prompt for a specific direction.
   * Called once per direction per session. Never repeated.
   * The sender is NEVER informed of the decision.
   *
   * @param {'inbound'|'outbound'} direction
   *   'inbound'  = partner's content → this player (most common trigger)
   *   'outbound' = this player's content → partner (triggered on partner's client)
   */
  function showDirtyConsentPrompt(direction) {
      const ci = state.coupleIntensity;

      if (direction === 'inbound') {
          if (ci.inboundDirtyPrompted) return; // Already shown this session
          ci.inboundDirtyPrompted = true;
      } else if (direction === 'outbound') {
          if (ci.outboundDirtyPrompted) return;
          ci.outboundDirtyPrompted = true;
      }

      const modal = document.getElementById('dirtyConsentModal');
      if (!modal) return;

      // Store which direction this prompt is for
      modal.dataset.consentDirection = direction;
      modal.classList.remove('hidden');

      console.log(`[COUPLE-INTENSITY] Dirty consent prompt shown for ${direction} direction`);
  }

  /**
   * Handle the player's response to the Dirty consent prompt.
   * @param {boolean} accepted
   */
  window._handleDirtyConsent = function(accepted) {
      const modal = document.getElementById('dirtyConsentModal');
      if (!modal) return;

      const direction = modal.dataset.consentDirection || 'inbound';
      const ci = state.coupleIntensity;

      if (direction === 'inbound') {
          ci.inboundDirtyConsent = accepted;
      } else {
          ci.outboundDirtyConsent = accepted;
      }

      modal.classList.add('hidden');

      console.log(`[COUPLE-INTENSITY] Dirty consent ${accepted ? 'accepted' : 'declined'} for ${direction}`);

      if (accepted) {
          // Reveal all currently masked segments
          document.querySelectorAll('.dirty-mask').forEach(el => {
              el.classList.remove('dirty-mask');
              el.classList.add('dirty-revealed');
          });
      } else {
          // Rewrite masked segments to accepted tier
          rewriteMaskedSegments();
      }

      // Check conditional re-open
      checkConditionalReopen();
  };

  /**
   * Rewrite all masked dirty segments to the accepted tier.
   * Preserves intent, pacing, and rhythm. Does not visibly censor or truncate.
   * Replaces explicit text with Erotic-tier equivalent phrasing.
   */
  function rewriteMaskedSegments() {
      const maskedEls = document.querySelectorAll('.dirty-mask');
      if (maskedEls.length === 0) return;

      maskedEls.forEach(el => {
          const originalText = decodeURIComponent(el.dataset.dirtyOriginal || '');
          if (!originalText) return;

          const rewritten = rewriteToEroticTier(originalText);
          el.textContent = rewritten;
          el.classList.remove('dirty-mask');
          el.classList.add('dirty-rewritten');
          // Remove click handler
          el.removeAttribute('onclick');
          el.removeAttribute('title');
      });

      console.log('[COUPLE-INTENSITY] Masked segments rewritten to Erotic tier');
  }

  /**
   * Rewrite explicit (Dirty-tier) text to Erotic-tier equivalent.
   * Preserves intent and pacing. Uses pattern-based substitution.
   * This is a local fallback — ideally the AI would rewrite, but
   * for instant responsiveness we use deterministic rewriting.
   */
  function rewriteToEroticTier(text) {
      if (!text) return text;

      // Pattern-based substitution: explicit → sensual
      const substitutions = [
          [/\bfuck(?:ed|ing|s)?\b/gi, (m) => m.endsWith('ing') ? 'moving inside' : m.endsWith('ed') ? 'claimed' : 'take'],
          [/\bcock\b/gi, 'length'],
          [/\bdick\b/gi, 'hardness'],
          [/\bcunt\b/gi, 'heat'],
          [/\bpussy\b/gi, 'warmth'],
          [/\btits\b/gi, 'breasts'],
          [/\basshole\b/gi, 'body'],
          [/\bass\b/gi, 'curves'],
          [/\bcum(?:ming|s)?\b/gi, (m) => /ming/i.test(m) ? 'unraveling' : 'release'],
          [/\borgasm(?:ed|ing|s)?\b/gi, (m) => /ing/i.test(m) ? 'breaking apart' : 'peak'],
          [/\bthrust(?:ed|ing|s)?\b/gi, (m) => /ing/i.test(m) ? 'moving' : 'pressed'],
          [/\bpound(?:ed|ing|s)?\b/gi, (m) => /ing/i.test(m) ? 'driving' : 'drove'],
          [/\bslammed?\b/gi, 'surged'],
          [/\brammed?\b/gi, 'pressed deeper'],
          [/\bsuck(?:ed|ing|s)?\b/gi, (m) => /ing/i.test(m) ? 'tasting' : 'tasted'],
          [/\blick(?:ed|ing|s)?\b/gi, (m) => /ing/i.test(m) ? 'tracing' : 'traced'],
          [/\bnaked\b/gi, 'bare'],
          [/\bnude\b/gi, 'exposed'],
          [/\berect(?:ion)?\b/gi, 'arousal'],
          [/\bwet(?:ness)?\b/gi, 'slick'],
          [/\bdripping\b/gi, 'glistening'],
          [/\bsoaked\b/gi, 'damp'],
          [/\bthrobbing\b/gi, 'pulsing'],
          [/\bspread\b/gi, 'opened'],
          [/\bstraddl(?:ed|ing)\b/gi, (m) => /ing/i.test(m) ? 'settling over' : 'settled over'],
          [/\bmount(?:ed|ing)?\b/gi, (m) => /ing/i.test(m) ? 'moving atop' : 'above'],
          [/\brode\b/gi, 'moved with'],
          [/\briding\b/gi, 'moving against']
      ];

      let result = text;
      for (const [pattern, replacement] of substitutions) {
          result = result.replace(pattern, replacement);
      }

      return result;
  }

  // -----------------------------------------------------------------------
  // INDEPENDENT ESCALATION & CONDITIONAL RE-OPEN
  // -----------------------------------------------------------------------

  /**
   * Detect whether the local player's input signals Dirty escalation intent.
   * Called before AI generation to determine if the player is pushing
   * toward explicit content.
   */
  function detectSelfEscalation(actionText, dialogueText) {
      if (!isSharedPlayMode()) return false;

      const combined = ((actionText || '') + ' ' + (dialogueText || '')).toLowerCase();

      const escalationPatterns = [
          /\bfuck\b/i, /\bsuck\b/i, /\blick\b/i,
          /\bstrip\b/i, /\bundress\b/i, /\btake off\b/i,
          /\binside\b/i, /\bpenetrat/i, /\bon (my|your) knees\b/i,
          /\bbend (over|down)\b/i, /\bspread\b/i,
          /\bharder\b/i, /\bdeeper\b/i, /\bfaster\b/i
      ];

      const matchCount = escalationPatterns.filter(rx => rx.test(combined)).length;

      if (matchCount >= 1) {
          state.coupleIntensity.selfEscalatedDirty = true;
          console.log('[COUPLE-INTENSITY] Self-escalation to Dirty detected');
          return true;
      }

      return false;
  }

  /**
   * Check if the conditional re-open should be offered.
   * Condition: Player previously declined inbound Dirty, then escalated
   * (pushed Dirty content themselves). Offered once per session.
   */
  function checkConditionalReopen() {
      const ci = state.coupleIntensity;

      // Only relevant if:
      // 1. Player declined inbound Dirty
      // 2. Player has escalated (pushed Dirty themselves)
      // 3. Re-open not already offered
      if (ci.inboundDirtyConsent !== false) return;
      if (!ci.selfEscalatedDirty) return;
      if (ci.reopenOffered) return;

      ci.reopenOffered = true;

      // Show re-open prompt
      const modal = document.getElementById('dirtyReopenModal');
      if (modal) {
          modal.classList.remove('hidden');
      }

      console.log('[COUPLE-INTENSITY] Conditional re-open offered');
  }

  /**
   * Handle the player's response to the conditional re-open prompt.
   */
  window._handleDirtyReopen = function(accepted) {
      const modal = document.getElementById('dirtyReopenModal');
      if (modal) modal.classList.add('hidden');

      const ci = state.coupleIntensity;
      ci.reopenAccepted = accepted;

      if (accepted) {
          ci.inboundDirtyConsent = true;
          // Reveal any currently masked segments
          document.querySelectorAll('.dirty-mask').forEach(el => {
              el.classList.remove('dirty-mask');
              el.classList.add('dirty-revealed');
          });
          console.log('[COUPLE-INTENSITY] Re-open accepted — inbound Dirty now allowed');
      } else {
          console.log('[COUPLE-INTENSITY] Re-open declined — inbound Dirty remains blocked');
      }
  };

  // -----------------------------------------------------------------------
  // DE-ESCALATION SIGNAL DETECTION
  // -----------------------------------------------------------------------

  /**
   * Hard-stop phrase detection. Conservative — only triggers on clear signals.
   * Returns { isHardStop: boolean, phrase: string|null }
   */
  const DEESCALATION_PHRASES = [
      /\b(stop|safeword|red\s*light|pause|hold on|wait|too (?:much|far)|slow down|ease up|back off|enough)\b/i,
      /\b(i (?:can'?t|don'?t want|need (?:to |a )?stop))\b/i,
      /\b(no more|cut it|end this|that'?s enough)\b/i
  ];

  function detectDeescalationSignal(actionText, dialogueText) {
      if (!isSharedPlayMode()) return { isHardStop: false, phrase: null };

      const combined = ((actionText || '') + ' ' + (dialogueText || '')).toLowerCase();

      for (const rx of DEESCALATION_PHRASES) {
          const match = combined.match(rx);
          if (match) {
              return { isHardStop: true, phrase: match[0] };
          }
      }

      return { isHardStop: false, phrase: null };
  }

  /**
   * Hold a message and show the de-escalation confirmation modal.
   * The message is not sent until intent is confirmed.
   */
  function holdForDeescalation(rawContent, formattedContent) {
      const ci = state.coupleIntensity;
      ci.pendingHoldMessage = formattedContent;
      ci.pendingHoldRaw = rawContent;

      const modal = document.getElementById('deescalationModal');
      if (modal) modal.classList.remove('hidden');

      console.log('[COUPLE-INTENSITY] Message held for de-escalation confirmation');
  }

  /**
   * Handle de-escalation confirmation.
   * @param {boolean} confirmed - true = yes, slow down; false = false alarm, continue
   */
  window._handleDeescalation = function(confirmed) {
      const modal = document.getElementById('deescalationModal');
      if (modal) modal.classList.add('hidden');

      const ci = state.coupleIntensity;

      if (confirmed) {
          // Cap future content at Erotic (or lower)
          ci.deescalationActive = true;
          ci.deescalationCap = ci.eroticUnlocked ? 'Erotic' : 'Naughty';

          console.log('[COUPLE-INTENSITY] De-escalation confirmed, capping at:', ci.deescalationCap);

          // Normalize recent explicit content in the displayed story
          normalizeRecentExplicitContent();
      } else {
          console.log('[COUPLE-INTENSITY] De-escalation declined (false alarm)');
      }

      // Re-trigger the held submission (with updated intensity ceiling if confirmed)
      ci.pendingHoldMessage = null;
      ci.pendingHoldRaw = null;

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn && ci._pendingAction !== undefined) {
          // Restore pending inputs and re-click
          const actionInput = document.getElementById('actionInput');
          const dialogueInput = document.getElementById('dialogueInput');
          if (actionInput) actionInput.value = ci._pendingAction || '';
          if (dialogueInput) dialogueInput.value = ci._pendingDialogue || '';
          ci._pendingAction = undefined;
          ci._pendingDialogue = undefined;
          // Set bypass flag so de-escalation detection is skipped on re-submission
          ci._deescalationBypassed = true;
          // Use a short defer to avoid re-entrancy
          setTimeout(() => submitBtn.click(), 50);
      }
  };

  /**
   * Normalize recent explicit content in the displayed story.
   * Softens the last few paragraphs to match the de-escalation cap.
   */
  function normalizeRecentExplicitContent() {
      const pages = StoryPagination.getPages();
      if (!pages || pages.length === 0) return;

      // Normalize the last page only (most recent content)
      const lastIdx = pages.length - 1;
      let lastPage = pages[lastIdx];

      // Apply Erotic-tier rewriting to the displayed HTML
      // Extract text nodes, rewrite, and replace
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = lastPage;

      const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      for (const node of textNodes) {
          const original = node.textContent;
          const rewritten = rewriteToEroticTier(original);
          if (rewritten !== original) {
              node.textContent = rewritten;
          }
      }

      // Update the page
      const updatedPages = [...pages];
      updatedPages[lastIdx] = tempDiv.innerHTML;
      StoryPagination.setPages(updatedPages);
      // Re-render current page if it's the last one
      if (StoryPagination.getCurrentPageIndex() === lastIdx) {
          StoryPagination.goToPage(lastIdx);
      }

      console.log('[COUPLE-INTENSITY] Recent explicit content normalized');
  }

  // -----------------------------------------------------------------------
  // COUPLE CONTENT PROCESSING PIPELINE
  // -----------------------------------------------------------------------

  /**
   * Process AI-generated content through the couple intensity pipeline.
   * Called after content is generated, before display.
   *
   * This is the main integration point for couple intensity enforcement.
   *
   * @param {string} rawContent - Raw AI output text
   * @param {string} formattedContent - HTML-formatted content ready for display
   * @param {boolean} isInbound - true if content is from partner, false if local
   * @returns {{ content: string, held: boolean }}
   *   content: the (possibly modified) formatted HTML
   *   held: true if the message was held for de-escalation
   */
  function processCoupleContent(rawContent, formattedContent, isInbound) {
      if (!isSharedPlayMode()) {
          return { content: formattedContent, held: false };
      }

      const ci = state.coupleIntensity;

      // 1. Evaluate Erotic unlock (every turn)
      evaluateEroticUnlock();

      // 2. De-escalation override — if active, skip Dirty detection entirely
      if (ci.deescalationActive) {
          return { content: formattedContent, held: false };
      }

      // 3. Detect Dirty content (gated internally by Erotic-active + progression)
      const detection = detectDirtyContent(rawContent);

      // 4. If suppressed by guard logic, pass through unchanged
      if (detection.suppressed) {
          console.log('[COUPLE-INTENSITY] Dirty detection suppressed:', detection.suppressReason);
          return { content: formattedContent, held: false };
      }

      if (!detection.isDirty) {
          return { content: formattedContent, held: false };
      }

      // Content has Dirty segments
      console.log('[COUPLE-INTENSITY] Dirty content detected, segments:', detection.segments.length,
          'spans:', detection.segments.reduce((n, s) => n + (s.spans ? s.spans.length : 0), 0));

      if (isInbound) {
          // Partner's content — apply masking for this player
          const direction = 'inbound';

          // Check for active Dirty lock on this direction
          if (ci.inboundDirtyConsent === true) {
              // Already consented — show as-is
              return { content: formattedContent, held: false };
          }

          if (ci.inboundDirtyConsent === false) {
              // Declined — rewrite to Erotic tier
              const rewritten = rewriteToEroticTier(rawContent);
              return { content: formatStory(rewritten), held: false };
          }

          // Not yet asked — mask explicit spans only and prompt
          const masked = maskDirtySegments(formattedContent, detection.segments);
          if (!ci.inboundDirtyPrompted) {
              // Defer prompt slightly to let content render first
              setTimeout(() => showDirtyConsentPrompt(direction), 500);
          }
          return { content: masked, held: false };

      } else {
          // Local player's own generated content
          // The local player sees their own content unmasked
          // (masking only applies to the receiver's view)
          return { content: formattedContent, held: false };
      }
  }

  /**
   * Process incoming partner content through the couple intensity pipeline.
   * Called by the broadcast receiver when partner's turn content arrives.
   * TODO: Wire into Supabase broadcast receiver when implemented.
   *
   * @param {string} rawContent - Raw text from partner's turn
   * @returns {string} Processed HTML content ready for display
   */
  function processIncomingCoupleContent(rawContent) {
      const formatted = formatStory(rawContent);
      const result = processCoupleContent(rawContent, formatted, true);
      return result.content;
  }

  // -----------------------------------------------------------------------
  // SESSION RESET
  // -----------------------------------------------------------------------

  /**
   * Clear all couple intensity permissions at session end.
   * Does NOT persist to next session. Called on restart, cleanup, and mode change.
   */
  function resetCoupleIntensity() {
      state.coupleIntensity = {
          ceiling: 'Naughty',
          eroticUnlocked: false,
          eroticUnlockScore: 0,
          inboundDirtyConsent: null,
          inboundDirtyPrompted: false,
          outboundDirtyConsent: null,
          outboundDirtyPrompted: false,
          selfEscalatedDirty: false,
          reopenOffered: false,
          reopenAccepted: false,
          deescalationActive: false,
          deescalationCap: null,
          pendingHoldMessage: null,
          pendingHoldRaw: null
      };

      // Remove any lingering mask elements from DOM
      document.querySelectorAll('.dirty-mask, .dirty-revealed, .dirty-rewritten').forEach(el => {
          el.classList.remove('dirty-mask', 'dirty-revealed', 'dirty-rewritten');
          el.removeAttribute('onclick');
          el.removeAttribute('title');
      });

      // Hide any open consent/de-escalation modals
      ['dirtyConsentModal', 'dirtyReopenModal', 'deescalationModal'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.add('hidden');
      });

      console.log('[COUPLE-INTENSITY] Session reset — all permissions cleared');
  }

  // Expose for use by broadcast system and external hooks
  window._coupleIntensity = {
      init: initCoupleIntensitySession,
      reset: resetCoupleIntensity,
      getCeiling: getCoupleEffectiveCeiling,
      processContent: processCoupleContent,
      processIncoming: processIncomingCoupleContent,
      detectEscalation: detectSelfEscalation,
      detectDeescalation: detectDeescalationSignal,
      holdForDeescalation: holdForDeescalation
  };

  // =========================================================================
  // COUPLE PLAY: MASK PRESENTATION LAYER
  // =========================================================================
  //
  // In Couple Play, archetypes are presented as "Masks" — the same 7+ canonical
  // archetype cards, but with player-facing mask language. The underlying
  // archetype system (ARCHETYPES, buildArchetypeDirectives, state.archetype)
  // is NEVER modified. This is purely a UI/copy layer.
  //
  // Flow:
  //   1. Setup screen swaps "Archetype Storybeau" → "Your Masks"
  //   2. Player selects their own mask + optionally suggests one for partner
  //   3. On receiving a suggestion, private acceptance modal appears
  //   4. Resolution sets state.archetype.primary (same field, no new schema)
  //   5. Fate directives reference "mask" language in couple mode
  //
  // =========================================================================

  /**
   * Initialize the mask presentation layer for Couple Play.
   * Called when entering the setup screen in couple mode.
   * Swaps archetype section labels to mask language.
   */
  function initCoupleMaskPresentation() {
      if (!isSharedPlayMode()) return;

      // Swap section title
      const sectionTitle = document.getElementById('archetypeSectionTitle');
      if (sectionTitle) {
          sectionTitle.textContent = 'Your Masks';
      }

      // Swap header text
      const headerText = document.querySelector('.archetype-header-text');
      if (headerText) {
          headerText.textContent = 'Who do you want to be tonight?';
      }

      // Swap subtext — replace archetype instructions with mask language
      const subtext = document.querySelector('.archetype-subtext');
      if (subtext) {
          subtext.textContent = state.mode === 'couple'
              ? 'Select a mask for yourself. You may also suggest one for your partner.'
              : 'Select a mask. This shapes how Fate sees your Love Interest.';
      }

      // Swap selection summary labels
      const primaryLabel = document.querySelector('.selected-primary');
      if (primaryLabel) {
          const span = primaryLabel.querySelector('#selectedPrimaryName');
          primaryLabel.innerHTML = '';
          primaryLabel.textContent = 'Your Mask: ';
          if (span) primaryLabel.appendChild(span);
      }

      // Hide modifier row in couple mode (masks don't have modifiers)
      const modifierLabel = document.querySelector('.selected-modifier');
      if (modifierLabel) {
          modifierLabel.style.display = 'none';
      }

      // Render the partner suggestion row if not already present (couple only — stranger has no partner)
      if (state.mode === 'couple') {
          renderMaskSuggestionRow();
      }

      console.log('[COUPLE-MASK] Mask presentation layer initialized');
  }

  /**
   * Restore archetype presentation when leaving couple mode.
   * Called during couple cleanup.
   */
  function restoreArchetypePresentation() {
      const sectionTitle = document.getElementById('archetypeSectionTitle');
      if (sectionTitle) sectionTitle.textContent = 'Archetype Storybeau';

      const headerText = document.querySelector('.archetype-header-text');
      if (headerText) headerText.textContent = 'Choose a core personality for your Love Interest.';

      const subtext = document.querySelector('.archetype-subtext');
      if (subtext) subtext.textContent = 'Select one Primary archetype. You may optionally add one Modifier to refine how it shows up.';

      const primaryLabel = document.querySelector('.selected-primary');
      if (primaryLabel) {
          const span = primaryLabel.querySelector('#selectedPrimaryName');
          primaryLabel.innerHTML = '';
          primaryLabel.textContent = 'Primary: ';
          if (span) primaryLabel.appendChild(span);
      }

      const modifierLabel = document.querySelector('.selected-modifier');
      if (modifierLabel) modifierLabel.style.display = '';

      // Remove partner suggestion row
      const suggestionRow = document.getElementById('maskSuggestionRow');
      if (suggestionRow) suggestionRow.remove();

      console.log('[COUPLE-MASK] Archetype presentation restored');
  }

  /**
   * Render the "Suggest a Mask for Your Partner" dropdown row.
   * Inserted below the archetype card grid in couple mode.
   */
  function renderMaskSuggestionRow() {
      // Don't duplicate
      if (document.getElementById('maskSuggestionRow')) return;

      const grid = document.getElementById('archetypeCardGrid');
      if (!grid) return;

      const row = document.createElement('div');
      row.id = 'maskSuggestionRow';
      row.className = 'mask-suggestion-row';

      const label = document.createElement('p');
      label.className = 'mask-suggestion-label';
      label.textContent = 'Who do you want them to be?';

      const select = document.createElement('select');
      select.id = 'maskSuggestionSelect';
      select.className = 'mask-suggestion-select';

      // Default option
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '— No suggestion —';
      select.appendChild(defaultOpt);

      // Populate with all archetypes
      ARCHETYPE_ORDER.forEach(id => {
          const arch = ARCHETYPES[id];
          if (!arch) return;
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = arch.name;
          select.appendChild(opt);
      });

      select.addEventListener('change', () => {
          state.coupleMask.mySuggestedMaskForPartner = select.value || null;
          console.log('[COUPLE-MASK] Partner suggestion set:', select.value || 'none');
      });

      const note = document.createElement('p');
      note.className = 'mask-suggestion-note';
      note.textContent = 'This suggestion is optional. Your partner will choose privately.';

      row.appendChild(label);
      row.appendChild(select);
      row.appendChild(note);

      // Insert after the grid
      grid.parentNode.insertBefore(row, grid.nextSibling);
  }

  /**
   * Show the private mask acceptance modal when a suggestion is received.
   * @param {string} suggestedArchetypeId - The archetype ID suggested by partner
   */
  function showMaskAcceptanceModal(suggestedArchetypeId) {
      const arch = ARCHETYPES[suggestedArchetypeId];
      if (!arch) return;

      state.coupleMask.partnerSuggestedMask = suggestedArchetypeId;

      const nameEl = document.getElementById('maskSuggestedName');
      if (nameEl) nameEl.textContent = arch.name;

      const modal = document.getElementById('maskAcceptanceModal');
      if (modal) modal.classList.remove('hidden');
  }

  /**
   * Handle accepting the suggested mask.
   */
  function acceptSuggestedMask() {
      const suggested = state.coupleMask.partnerSuggestedMask;
      if (!suggested) return;

      state.coupleMask.resolvedMask = suggested;
      state.coupleMask.maskResolved = true;
      // Write through to the canonical archetype state (presentation only)
      state.archetype.primary = suggested;

      // Update the UI card selection to reflect the resolved mask
      updateArchetypeCardStates();
      updateArchetypeSelectionSummary();

      const modal = document.getElementById('maskAcceptanceModal');
      if (modal) modal.classList.add('hidden');

      console.log('[COUPLE-MASK] Accepted partner suggestion:', suggested);
  }

  /**
   * Handle choosing a different mask (rejecting the suggestion).
   * The player keeps their own selection. Partner is never informed.
   */
  function chooseDifferentMask() {
      state.coupleMask.resolvedMask = state.coupleMask.mySelectedMask || state.archetype.primary;
      state.coupleMask.maskResolved = true;
      // archetype.primary remains whatever the player had selected — no change needed

      const modal = document.getElementById('maskAcceptanceModal');
      if (modal) modal.classList.add('hidden');

      console.log('[COUPLE-MASK] Rejected partner suggestion — keeping own mask');
  }

  // Wire acceptance modal buttons
  document.getElementById('btnAcceptMask')?.addEventListener('click', acceptSuggestedMask);
  document.getElementById('btnChooseDifferentMask')?.addEventListener('click', chooseDifferentMask);

  /**
   * Track the player's own mask selection in couple mode.
   * Called when a player selects an archetype card while in couple mode.
   * @param {string} archetypeId - Selected archetype ID
   */
  function onCoupleMaskSelected(archetypeId) {
      if (!isSharedPlayMode()) return;
      state.coupleMask.mySelectedMask = archetypeId;
      console.log('[COUPLE-MASK] Own mask selected:', archetypeId);
  }

  /**
   * Build mask-aware Fate directive for couple mode system prompt.
   * Returns additional directive text that tells Fate to reference "mask"
   * language instead of archetype language in couple play.
   *
   * @returns {string} Directive string (empty if not couple mode)
   */
  function buildMaskFateDirective() {
      if (!isSharedPlayMode()) return '';

      const mask = state.coupleMask.resolvedMask || state.archetype.primary;
      const arch = ARCHETYPES[mask];
      if (!arch) return '';

      return `
MASK FRAMING (COUPLE PLAY):
The Love Interest's personality is shaped by a mask: ${arch.name}.
Treat the mask as something the character inhabits — an energy, a role, a way of being.
Never use the word "archetype" in prose or dialogue. Use "mask" only if it fits narratively (e.g., "behind the mask," "the mask slipped"). Otherwise, simply embody the qualities directly.
Fate speaks to the mask, not the person wearing it.`;
  }

  /**
   * Reset mask state for a new session.
   */
  function resetCoupleMask() {
      state.coupleMask = {
          mySelectedMask: null,
          mySuggestedMaskForPartner: null,
          partnerSuggestedMask: null,
          resolvedMask: null,
          maskResolved: false,
          partnerMaskResolved: false
      };

      // Restore archetype language in UI
      restoreArchetypePresentation();

      // Hide acceptance modal if open
      const modal = document.getElementById('maskAcceptanceModal');
      if (modal) modal.classList.add('hidden');

      console.log('[COUPLE-MASK] Mask state reset');
  }

  // Expose for broadcast system and external hooks
  window._coupleMask = {
      init: initCoupleMaskPresentation,
      reset: resetCoupleMask,
      showAcceptance: showMaskAcceptanceModal,
      onSelected: onCoupleMaskSelected,
      buildDirective: buildMaskFateDirective,
      getSuggestion: () => state.coupleMask.mySuggestedMaskForPartner
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

})();
