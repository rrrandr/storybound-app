#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// HERITAGE OBSERVABILITY HARNESS — reusable regression test for the ancestry
// consumer chain. Roman 2026-06-11.
//
// PURPOSE
//   After shipping the modern-world ancestry consumers (Phase 2 — commit
//   ec87d6b), this audit verifies that the contemporary semantic contract
//   actually fires at the bible layer. The contract has THREE LEGS:
//     - APPEARANCE   (heritage-coded complexion/hair/face descriptors)
//     - NAMING       (heritage-coded given + family names)
//     - CULTURAL MEMORY (light, "ONE detail per Issue" touch — observational)
//   Plus a hard NEGATIVE invariant:
//     - NO SETTING DRIFT (Modern Billionaire stays Modern Billionaire)
//
//   We test BIBLE GENERATION ONLY, not Scene 1 prose. The bible is the
//   narrowest choke point — if differentiation isn't visible here, scene-
//   level signal will only be more diffuse. If differentiation IS visible
//   here, a separate scene-1 audit can verify it survives downstream.
//
//   PASS = naming + appearance + drift all clear their hard gates.
//   Cultural memory is reported as an OBSERVATIONAL metric only — the
//   directive deliberately calls for a light touch, so a strict gate
//   would incentivize over-signaling.
//
// USAGE
//   Prerequisites:
//     - Vercel dev server running at http://localhost:3000
//       (script POSTs to /api/anthropic-proxy — same endpoint + model the
//        production PC body bible generator uses; see app.js:~201190)
//     - cd into repo root before running:
//       cd /Users/romantsukerman/storybound-app && node scripts/heritage-observability.mjs
//   Optional env:
//     PROXY_URL=http://localhost:3000   override default
//     N_PER_ANCESTRY=10                 samples per ancestry (default 10)
//     MODEL=claude-haiku-4-5            override the model
//
// OUTPUTS
//   _quarantine/heritage-audit/
//     ├── <ancestry-lowercase>-<n>.json      — raw bible per run
//     ├── analysis.json                       — structured metrics
//     └── SUMMARY.md                          — pass/fail table for review
//
// COST ESTIMATE
//   6 ancestries × N=10 = 60 bible generations.
//   Each bible ≈ 1500 output tokens via claude-haiku-4-5:
//     ~$1/M input + $5/M output → ~$0.01 per bible → ~$0.60 total.
//   (Was ~$2.40 when wrongly routed to gpt-4o; corrected 2026-06-11.)
//   Adjust N_PER_ANCESTRY env to scale.
//
// PROMPT DRIFT NOTE (critical for future maintenance)
//   The system prompt below MIRRORS app.js:_generatePCBodyBible (~line 201007)
//   but is NOT identical. The full production prompt includes:
//     - Heroine profile directive       (app.js:~44814)
//     - Contemporary ancestry directive (app.js:~44935)  ← under test here
//     - Archetype frame                 (app.js:~201321)
//     - Emotional climate regime        (app.js:~200873)
//     - PC physical palette             (app.js:~200882)
//     - PC avoid block                  (app.js:~200883)
//     - JSON schema with age + ancestry locks (app.js:~200993)
//     - …~12 other directives
//   This harness mirrors the heroine-directive shape, the ancestry directive
//   verbatim, the JSON schema (age + ancestry + appearance + cultural fields),
//   and a stripped-down framing. It is INTENTIONALLY SIMPLIFIED — the audit
//   measures DELTA-ACROSS-ANCESTRIES under an identical baseline. The
//   absolute bible quality may differ from production; the ancestry-driven
//   differentiation should not.
//
//   When the production prompt changes, this script may drift out of sync.
//   Re-baseline against current app.js when you next run this and the
//   results look surprising.
// ════════════════════════════════════════════════════════════════════════════

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ──────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────
const ANCESTRIES = ['Yoruba', 'Inuit', 'Ashkenazi', 'Tamil', 'Korean', 'Persian'];
const N_PER_ANCESTRY = parseInt(process.env.N_PER_ANCESTRY || '10', 10);
const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3000';
// Production PC bible generator at app.js:~201194 uses claude-haiku-4-5
// via /api/anthropic-proxy at temperature 0.6 / max_tokens 2500.
// We match those exactly so the audit measures the same code path the
// reader actually gets.
const MODEL = process.env.MODEL || 'claude-haiku-4-5';
const TEMPERATURE = 0.6;
const MAX_TOKENS = 2500;
const WORLD = 'Modern';
const WORLD_SUBTYPE = 'billionaire_modern';
const ARCHETYPE = 'open_vein';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, '_quarantine', 'heritage-audit');

// ──────────────────────────────────────────────────────────────────────────
// SETTING-DRIFT MARKERS — geography / culture-of-origin terms that should
// NOT appear in a "PC of Yoruba ancestry in Modern Billionaire" bible.
// A hit indicates the LLM may have relocated the setting to the heritage's
// country-of-origin instead of treating ancestry as appearance/heritage.
// ──────────────────────────────────────────────────────────────────────────
const SETTING_DRIFT_MARKERS = {
  Yoruba:    /\b(lagos|nigeria|nigerian|niger\b|abuja|west africa|yoruba (kingdom|empire|land))\b/i,
  Inuit:     /\b(arctic|igloo|tundra|alaska|alaskan|greenland|inuit village|seal hunt|nunavut|sled dog|ice fishing)\b/i,
  Ashkenazi: /\b(shtetl|pogrom|eastern european.{0,40}(1900|early 20th)|warsaw ghetto)\b/i,
  Tamil:    /\b(tamil nadu|chennai|madras|south indian village|kerala|sri lankan tamil)\b/i,
  Korean:    /\b(seoul|south korea|north korea|busan|korean village|hanok)\b/i,
  Persian:   /\b(iran|tehran|isfahan|persia\b|shiraz|qom|iranian)\b/i
};

// Cultural-memory signal markers — heritage-specific food, language,
// holidays, religion, household items, etc. Used as a *positive* signal:
// at least one such marker per bible's narrative fields counts as
// "cultural memory present." Same regex per ancestry — looking for
// presence-of-anything, not exhaustive enumeration.
//
// Roman 2026-06-11 — this metric is OBSERVATIONAL only (not gating).
// The contract says "light cultural memory touch," and the directive
// explicitly says "ONE such detail per Issue is plenty." A conservative
// model interpreting that may only produce overt heritage markers in
// 4–6 of 10 bibles while still differentiating appearance + naming
// strongly. Reporting the actual rate per ancestry; first run will
// inform whether 70% is the right gate or whether 40-50% is normal.
const CULTURAL_MEMORY_MARKERS = {
  Yoruba:    /\b(yoruba|jollof|fufu|egusi|orisha|oba|iya|baba|ankara|gele|aso ebi|naija)\b/i,
  Inuit:     /\b(inuit|inuk|inuktitut|amauti|qulliq|elders|throat sing|country food)\b/i,
  Ashkenazi: /\b(yiddish|shabbat|shabbos|bubbe|zaide|seder|matzah|kreplach|kugel|cholent|bar mitzvah|bat mitzvah|hanukkah|passover|kosher|shul|kvell|kvetch|mensch|nu\?|oy|mazel)\b/i,
  Tamil:    /\b(tamil|amma|appa|paati|thatha|sambar|dosa|idli|pongal|deepavali|diwali|kolam|saree|sari|murugan|kovil)\b/i,
  Korean:    /\b(korean|umma|appa|halmoni|harabeoji|kimchi|bulgogi|banchan|hanbok|chuseok|seollal|gimjang|jeong|han\b)\b/i,
  Persian:   /\b(persian|farsi|maman|baba|joon|naan|saffron|tahdig|fesenjan|gheymeh|nowruz|haft.?sin|chai|samovar|taarof|joon-eh)\b/i
};

// ──────────────────────────────────────────────────────────────────────────
// PROMPT CONSTRUCTION — mirrors app.js:_generatePCBodyBible (~line 201007)
// in spirit. See PROMPT DRIFT NOTE in header.
// ──────────────────────────────────────────────────────────────────────────

// app.js:~44814 — _buildHeroineProfileDirective (no operator path, no age pick)
function buildHeroineDirectiveMirror() {
  return (
    'HEROINE PROFILE (HARD): the female lead of a romance novel is NOT a high-competence corporate operator. Build her as:\n' +
    '  • YOUNGER and LESS EXPERIENCED — early twenties to early thirties, still becoming; she has not spent a decade learning to make her face unreadable.\n' +
    '  • MAXIMUM AGE (HARD): 38. The typical range stays early-twenties-to-early-thirties; 38 is a hard ceiling.\n' +
    '  • EMOTIONALLY PERMEABLE — she feels on the surface; shock reads as shock, fear as fear, wanting as wanting.\n' +
    '  • NO PRIOR HISTORY WITH THE LOVE INTEREST — he is a LOOMING PRESENCE or a STRANGER.\n' +
    '  • OCCUPATION: creative / craft / service / small-independent — NOT corporate-procedural. Designer / boutique owner / artist / baker / florist / etc.\n' +
    '  • CRISIS VOICE: in a HOT_CRISIS she is STUNNED, AFRAID, OVERWHELMED — thoughts skidding, fracturing, repeating; the body flooding. NEVER a level-headed briefing.\n'
  );
}

// app.js:~44935 — _buildContemporaryAncestryDirective (VERBATIM, the under-test piece)
function buildAncestryDirectiveMirror(ancestry) {
  const worldLabel = `${WORLD} / ${WORLD_SUBTYPE}`;
  return (
    '\n\nANCESTRY (HARD — Roman 2026-06-11 contemporary-world contract): ' +
    'the player explicitly chose ANCESTRY = "' + ancestry + '" for the protagonist. This is a HERITAGE signal, not a worldbuilding instruction.\n' +
    '  • SETTING REMAINS UNCHANGED — the story stays in ' + worldLabel + '. Do NOT relocate; do NOT make this a story "about being ' + ancestry + '" — it is a story in this world starring someone of ' + ancestry + ' heritage.\n' +
    '  • APPEARANCE COHERENCE — the "complexion", "hair", "face", and "signature_feature" fields below should reflect ' + ancestry + ' heritage. Real-person specificity, NEVER stereotype.\n' +
    '  • NAMING — the protagonist\'s given + family name should plausibly come from ' + ancestry + ' tradition (or a generationally-blended version if her family is established in the setting).\n' +
    '  • CULTURAL MEMORY (LIGHT TOUCH) — small specific details may surface in the prose across an Issue: a remembered grandmother\'s saying, a food smell, a holiday observance, a phrase in another language used unselfconsciously, a religious or seasonal tradition. ONE such detail per Issue is plenty.\n' +
    '  • FORBIDDEN — (1) changing the setting / world; (2) making the story PRIMARILY about her identity; (3) over-explaining her background as plot exposition; (4) reducing her to representational tokens of ' + ancestry + ' culture; (5) ignoring the ancestry entirely.\n'
  );
}

function buildBibleSystemPrompt(ancestry) {
  return (
    'You are generating a PROTAGONIST BODY BIBLE for a romance novel — a per-story stable canon of physical attributes, behavioral tells, AND character-defining recurring habits. Every field must be CONCRETE, SPECIFIC, and PARTICULAR — never generic.\n\n' +
    buildHeroineDirectiveMirror() +
    buildAncestryDirectiveMirror(ancestry) + '\n' +
    'The protagonist must always have SOMETHING WORTH CELEBRATING — at least one specific feature the LI is keenly aware of. Avoid generic-pretty ("beautiful eyes", "nice smile"). Real desire is particular.\n\n' +
    'Return ONLY this JSON object — no commentary, no markdown, no code fences:\n' +
    '{\n' +
    '  "age": <integer 20-38>,\n' +
    '  "ancestry": "' + ancestry + '", /* LOCKED — player picked exactly. Heritage signal only — does NOT change setting. */\n' +
    '  "first_name": "<the protagonist\'s given name — should plausibly come from ' + ancestry + ' tradition>",\n' +
    '  "last_name": "<her family name — same heritage origin or a married/blended explanation>",\n' +
    '  "height": "<one phrase, specific>",\n' +
    '  "build": "<one phrase, specific>",\n' +
    '  "hair": "<color + texture + how she wears it — culturally coherent with ancestry>",\n' +
    '  "complexion": "<undertone + any distinctive mark — culturally coherent with ancestry>",\n' +
    '  "face": "<the OVERALL face impression — a GESTALT, one vivid sentence naming what KIND of face it is and how it READS>",\n' +
    '  "signature_feature": "<the ONE thing worth celebrating — specific, particular, attractive>",\n' +
    '  "second_celebrated_feature": "<a SECOND specific feature in a different category from the signature>",\n' +
    '  "signature_habits": "<3-5 recurring habits — at least one may carry a small cultural-memory detail (a phrase in another language, a food, a family ritual) if it fits naturally>",\n' +
    '  "occupation": "<creative / craft / service / small-independent per the HEROINE PROFILE — must be set IN the Modern Billionaire world, NOT a relocation>",\n' +
    '  "current_crisis": {\n' +
    '    "event": "<a SINGLE CONCRETE CATASTROPHE already in motion — must be set IN the Modern Billionaire world>",\n' +
    '    "hottest_emotion": "<single dominant feeling>",\n' +
    '    "immediate_want": "<concrete, scene-scaled>"\n' +
    '  },\n' +
    '  "wound": {\n' +
    '    "core": "<one-sentence identity ache>",\n' +
    '    "surfacing_hint": "<how it surfaces under pressure>"\n' +
    '  }\n' +
    '}\n\n' +
    'Begin with { and end with }. No code fences.'
  );
}

function buildBibleUserPrompt() {
  return (
    `WORLD: ${WORLD} (${WORLD_SUBTYPE})\n` +
    `ARCHETYPE / MASK: ${ARCHETYPE}\n` +
    `Return the JSON now.`
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PROXY CALL — POST to localhost vercel dev's /api/anthropic-proxy.
// Same endpoint + model + temperature the production PC bible generator uses
// (see app.js:~201190). No `role` field — anthropic-proxy doesn't gate on
// role the way chatgpt-proxy does. Response shape is Anthropic's:
//   { content: [{ type: 'text', text: '...' }], stop_reason: '...' }
// ──────────────────────────────────────────────────────────────────────────
async function callBibleGen(ancestry) {
  const sys = buildBibleSystemPrompt(ancestry);
  const usr = buildBibleUserPrompt();

  const res = await fetch(`${PROXY_URL}/api/anthropic-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr }
      ]
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Proxy returned ${res.status}: ${errBody.slice(0, 500)}`);
  }
  const data = await res.json();
  // Anthropic shape: data.content is an array of {type, text}; flat 'content'
  // string is a chatgpt-style fallback in case the proxy normalizes.
  const content =
    (Array.isArray(data?.content) ? data.content.map(c => c?.text || '').join('') : null)
    || (typeof data?.content === 'string' ? data.content : '')
    || data?.choices?.[0]?.message?.content
    || '';
  if (!content) throw new Error(`Empty proxy response: ${JSON.stringify(data).slice(0, 500)}`);

  // Strip code-fence wrappers if the model emitted them despite the directive.
  const stripped = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}. Raw content (first 500 chars): ${stripped.slice(0, 500)}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// METRICS — per-ancestry batches → structural differentiation scores
// ──────────────────────────────────────────────────────────────────────────
function bibleProseFields(b) {
  // Flatten the prose-bearing fields the cultural-memory regex needs to scan.
  return [
    b.first_name, b.last_name,
    b.signature_feature, b.second_celebrated_feature,
    b.signature_habits, b.occupation,
    b?.current_crisis?.event, b?.current_crisis?.immediate_want,
    b?.wound?.core, b?.wound?.surfacing_hint,
    b.face, b.hair, b.complexion, b.build, b.height
  ].filter(Boolean).join('  ');
}

// APPEARANCE TOKENIZATION — measure descriptor differentiation across ancestries.
//
// Stopwords are MINIMAL — only function words + universal appearance-substrate
// nouns ("skin", "hair", "complexion", "face"). Color words, texture words,
// shape words, and culture-relevant descriptors are KEPT because they're
// exactly what should differentiate. The list deliberately excludes any token
// that could carry heritage signal (no banning "olive" / "dark" / "warm" /
// "bronze" etc.).
const APPEARANCE_STOPWORDS = new Set([
  // function words
  'a','an','the','of','with','and','or','but','in','on','at','to','for','from','by','into','onto','over','under',
  'her','his','she','he','hers','him','herself','himself','their','its',
  'is','was','are','were','be','been','being','have','has','had','do','does','did',
  'that','this','these','those','which','who','whose','whom',
  'when','where','why','how','what','there','here',
  'not','no','none','only','just','also','very','quite','slightly','almost','nearly','rather','still',
  'some','any','all','every','each','both','either','neither',
  'one','two','three','four','five','first','second','third','single',
  'like','as','than','more','most','less','too','so','such',
  // universal appearance-substrate (every ancestry says these — no differentiation signal)
  'skin','hair','complexion','face','eyes','eye','features','feature','look','looks','looking',
  'body','build','height','frame','figure',
  // overly generic
  'kind','sort','way','thing','something','someone','people','person',
  // overly common qualifiers that don't carry ancestry signal
  'small','medium','tall','short','little','big','great'
]);

function appearanceTokens(b) {
  // Pulls from the four appearance-bearing fields. Returns a deduped array
  // of meaningful tokens (length ≥3, not stopwords). Hyphenated terms are
  // split — "reddish-blonde" → {reddish, blonde} — so component colors match.
  const fields = [b.complexion, b.hair, b.face, b.signature_feature, b.second_celebrated_feature].filter(Boolean).join(' ');
  const seen = new Set();
  fields
    .toLowerCase()
    .replace(/[^a-z\s\-]/g, ' ')
    .split(/[\s\-]+/)
    .forEach(t => {
      if (t.length >= 3 && !APPEARANCE_STOPWORDS.has(t)) seen.add(t);
    });
  return [...seen];
}

// CROSS-ANCESTRY APPEARANCE UNIQUENESS — mirrors nameDisjointness shape.
// For each ancestry, what fraction of its appearance tokens are NOT present
// in any other ancestry's appearance pool? High uniqueness = the directive
// is producing ancestry-specific appearance descriptors. Low uniqueness =
// every ancestry's appearance pool is the same generic-romance vocabulary.
//
// Threshold: ≥30% unique tokens per ancestry counts as differentiation.
// (Lower than naming's ≤10%-overlap criterion because appearance vocabulary
// SHOULD overlap somewhat — many ancestries can plausibly have "warm",
// "dark", "long" — but the DISTINCTIVE descriptors should be present in
// meaningful share.)
function appearanceDifferentiation(analyses) {
  const pools = {};
  analyses.forEach(a => {
    const tokens = new Set();
    a.appearanceTokensPerBible.forEach(arr => arr.forEach(t => tokens.add(t)));
    pools[a.ancestry] = tokens;
  });
  const results = {};
  analyses.forEach(a => {
    const ownPool = pools[a.ancestry];
    const otherPool = new Set();
    Object.entries(pools).forEach(([k, v]) => {
      if (k === a.ancestry) return;
      v.forEach(t => otherPool.add(t));
    });
    const unique = [...ownPool].filter(t => !otherPool.has(t));
    results[a.ancestry] = {
      totalTokens: ownPool.size,
      uniqueTokens: unique.length,
      uniquePct: ownPool.size ? +(100 * unique.length / ownPool.size).toFixed(1) : 0,
      sampleUniqueTokens: unique.slice(0, 20)
    };
  });
  return results;
}

// SETTING-CRITICAL FIELDS — the only fields where mention of an ancestry's
// country-of-origin counts as drift. Other fields (signature_habits, wound,
// signature_feature) legitimately reference heritage as family history /
// cultural memory and SHOULD contain such mentions per the contract.
//
// False-positive learning (2026-06-11 N=1 smoke): the initial harness
// scanned ALL prose fields, which flagged "her mother in Lagos" in
// immediate_want as setting drift even though the actual story was set
// in Brooklyn. That's NOT drift — it's the contemporary contract working
// correctly. Restricting drift detection to occupation + current_crisis.event
// — the two fields that DEFINE where the story physically takes place.
function bibleSettingCriticalProse(b) {
  // Only the two fields that DEFINE the physical location of the story:
  //   - occupation (where she works — should be IN the world setting)
  //   - current_crisis.event (what's literally happening — IN the world)
  // immediate_want, signature_habits, wound, family references are all
  // permitted-and-expected places for heritage cues (mother in Lagos,
  // grandmother's lullabies, halmoni's saying). Scanning them produces
  // false positives that punish the directive working as designed.
  return [
    b.occupation,
    b?.current_crisis?.event
  ].filter(Boolean).join('  ');
}

function analyzeBatch(ancestry, bibles) {
  // 1. Naming differentiation — how many unique first_names? Are last_names varied?
  const firstNames = bibles.map(b => (b.first_name || '').toLowerCase().trim()).filter(Boolean);
  const lastNames = bibles.map(b => (b.last_name || '').toLowerCase().trim()).filter(Boolean);

  // 2. Cultural-memory presence — does each bible reference a heritage-specific term?
  const memoryRx = CULTURAL_MEMORY_MARKERS[ancestry];
  const memoryHits = bibles.map(b => memoryRx.test(bibleProseFields(b)));
  const memoryPresentCount = memoryHits.filter(Boolean).length;

  // 3. Setting drift — geography-of-origin terms appearing in the two
  // setting-CRITICAL fields (occupation + current_crisis.event). Heritage
  // references in other fields (immediate_want, signature_habits, wound)
  // are EXPECTED per the contract and not scanned.
  const driftRx = SETTING_DRIFT_MARKERS[ancestry];
  const driftHits = bibles.map(b => driftRx.test(bibleSettingCriticalProse(b)));
  const driftCount = driftHits.filter(Boolean).length;

  // 4. Per-bible appearance tokens — consumed by appearanceDifferentiation()
  //    after all batches are analyzed (needs cross-ancestry pools).
  const appearanceTokensPerBible = bibles.map(b => appearanceTokens(b));

  // 5. Raw descriptor samples — for human spot-reading in SUMMARY.md
  const complexionSamples = bibles.map(b => (b.complexion || '').toLowerCase());
  const hairSamples = bibles.map(b => (b.hair || '').toLowerCase());

  return {
    ancestry,
    n: bibles.length,
    firstNames,
    uniqueFirstNames: [...new Set(firstNames)],
    lastNames,
    uniqueLastNames: [...new Set(lastNames)],
    memoryPresentCount,
    memoryPresentPct: bibles.length ? +(100 * memoryPresentCount / bibles.length).toFixed(1) : 0,
    driftCount,
    driftPct: bibles.length ? +(100 * driftCount / bibles.length).toFixed(1) : 0,
    appearanceTokensPerBible,
    complexionSamples,
    hairSamples
  };
}

// Cross-ancestry name disjointness — first names from ancestry X should not
// appear in any other ancestry's pool. Returns share-rate (low = good).
function nameDisjointness(analyses) {
  const pools = {};
  analyses.forEach(a => { pools[a.ancestry] = new Set(a.firstNames); });
  const overlapCounts = {};
  analyses.forEach(a => {
    const otherPool = new Set();
    analyses.filter(other => other.ancestry !== a.ancestry).forEach(other => {
      other.firstNames.forEach(n => otherPool.add(n));
    });
    const sharedNames = a.firstNames.filter(n => otherPool.has(n));
    overlapCounts[a.ancestry] = {
      overlapCount: sharedNames.length,
      overlapPct: a.firstNames.length ? +(100 * sharedNames.length / a.firstNames.length).toFixed(1) : 0,
      sharedNames
    };
  });
  return overlapCounts;
}

function verdict(analysis, overlap, appearance) {
  // Pass criteria — the three legs of the contemporary contract:
  //   appearance + naming + cultural memory.
  //
  // HARD gates (must pass for verdict=PASS):
  //   - NAMING: cross-ancestry name overlap ≤ 10%
  //     (Common names like "Sarah" might appear in multiple pools; pervasive
  //      overlap means the ancestry directive isn't biting at naming.)
  //   - APPEARANCE: ≥ 30% of ancestry's appearance tokens unique to that
  //     ancestry. *** PROVISIONAL THRESHOLD (Roman 2026-06-11) — first
  //     N=10 run found all 6 ancestries clustered 16–26%, despite per-bible
  //     inspection showing real heritage-coded vocab (Yoruba: locs, coils,
  //     shea; Korean: blunt, cut, ponytail; Persian: charcoal, loops,
  //     tendrils). The shared English appearance substrate ("black",
  //     "thick", "wavy", "long", "braid", "loose", "twisted", "knot")
  //     pulls uniqueness scores down structurally — 30% may be unreachable
  //     at this vocabulary's overlap floor. Do NOT lower the threshold
  //     until a second dataset or a smarter metric (n-gram clusters,
  //     descriptor categories) confirms the ceiling. ***
  //   - DRIFT: setting-drift regex hits = 0 (zero tolerance — Modern
  //     Billionaire must stay Modern Billionaire)
  //
  // OBSERVATIONAL (Roman 2026-06-11 — not gating, just reported):
  //   - CULTURAL MEMORY: the directive says "ONE detail per Issue is plenty";
  //     first N=10 run hit 70–100% (higher than predicted 40–60%). Keep
  //     observational until we know what a healthy value looks like.
  //   - NAME DIVERSITY (ratio = unique_first_names / N): first N=10 run
  //     surfaced severe intra-ancestry name calcification (Korean: Mina × 10;
  //     Ashkenazi: Miriam × 10; Inuit: Kiviuq × 10; Persian: Nasrin × 10).
  //     Model successfully picks "Korean-tradition name" but always picks
  //     the most-prototypical first-pull. Reported here so re-runs after a
  //     name-diversity directive can verify improvement.
  const namePass       = overlap.overlapPct <= 10;
  const appearancePass = appearance.uniquePct >= 30;
  const driftPass      = analysis.driftCount === 0;
  const allPass = namePass && appearancePass && driftPass;

  // Name-diversity observational (Roman 2026-06-11) — surfaces intra-ancestry
  // name calcification. ratio = unique_first_names / N. 1.0 = every story
  // gets a different first name (healthy variety). 0.1 = same name 10/10.
  // Compute the dominant-name share too — "Mina × 10" = 100% dominance.
  const firstFreq = {};
  analysis.firstNames.forEach(n => { firstFreq[n] = (firstFreq[n] || 0) + 1; });
  const topFirst = Object.entries(firstFreq).sort((a, b) => b[1] - a[1])[0] || ['(none)', 0];
  const firstDiversityRatio = analysis.firstNames.length
    ? +(analysis.uniqueFirstNames.length / analysis.firstNames.length).toFixed(2) : 0;
  const lastFreq = {};
  analysis.lastNames.forEach(n => { lastFreq[n] = (lastFreq[n] || 0) + 1; });
  const topLast = Object.entries(lastFreq).sort((a, b) => b[1] - a[1])[0] || ['(none)', 0];
  const lastDiversityRatio = analysis.lastNames.length
    ? +(analysis.uniqueLastNames.length / analysis.lastNames.length).toFixed(2) : 0;

  return {
    namePass, appearancePass, driftPass, allPass,
    // memory is observational, not gating — recorded for review
    memoryObservationalCount: analysis.memoryPresentCount,
    memoryObservationalPct: analysis.memoryPresentPct,
    // name diversity is observational — first run found severe calcification
    nameDiversityObservational: {
      uniqueFirstCount:    analysis.uniqueFirstNames.length,
      n:                   analysis.firstNames.length,
      firstDiversityRatio: firstDiversityRatio,
      topFirstName:        topFirst[0],
      topFirstCount:       topFirst[1],
      topFirstSharePct:    analysis.firstNames.length ? +(100 * topFirst[1] / analysis.firstNames.length).toFixed(1) : 0,
      uniqueLastCount:     analysis.uniqueLastNames.length,
      lastDiversityRatio:  lastDiversityRatio,
      topLastName:         topLast[0],
      topLastCount:        topLast[1]
    },
    failReasons: [
      namePass       ? null : `name overlap with other ancestries ${overlap.overlapPct}% (need ≤10%)`,
      appearancePass ? null : `appearance descriptor uniqueness ${appearance.uniquePct}% (need ≥30%)`,
      driftPass      ? null : `setting drift hits ${analysis.driftCount}/${analysis.n} (need 0)`
    ].filter(Boolean)
  };
}

// ──────────────────────────────────────────────────────────────────────────
// REPORT — Markdown summary table
// ──────────────────────────────────────────────────────────────────────────
function renderSummary(analyses, overlaps, appearances, verdicts) {
  const lines = [
    '# Heritage Observability Audit — Summary',
    '',
    `Model: \`${MODEL}\` · proxy: \`${PROXY_URL}\` · N per ancestry: ${N_PER_ANCESTRY}`,
    `World: ${WORLD} (${WORLD_SUBTYPE}) · archetype: ${ARCHETYPE}`,
    `Run at: ${new Date().toISOString()}`,
    '',
    '## Pass/Fail Table',
    '',
    'Three hard gates (naming-disjointness / appearance / drift) determine PASS.',
    'Two observational metrics — cultural memory and intra-ancestry name diversity',
    '— are reported but do NOT gate. See "Calibration notes" at bottom for why.',
    '',
    '| Ancestry | Name overlap ≤10% | Appearance ≥30% unique | Drift = 0 | Memory (obs) | Name diversity (obs) | Verdict |',
    '|----------|-------------------|------------------------|-----------|--------------|----------------------|---------|'
  ];

  analyses.forEach(a => {
    const ov = overlaps[a.ancestry];
    const ap = appearances[a.ancestry];
    const v = verdicts[a.ancestry];
    const nd = v.nameDiversityObservational;
    lines.push(
      `| ${a.ancestry} ` +
      `| ${ov.overlapPct}% ${v.namePass ? '✓' : '✗'} ` +
      `| ${ap.uniquePct}% (${ap.uniqueTokens}/${ap.totalTokens}) ${v.appearancePass ? '✓' : '✗'} ` +
      `| ${a.driftCount}/${a.n} ${v.driftPass ? '✓' : '✗'} ` +
      `| ${a.memoryPresentCount}/${a.n} (${a.memoryPresentPct}%) ` +
      `| ${nd.uniqueFirstCount}/${nd.n} unique · top "${nd.topFirstName}" ×${nd.topFirstCount} (${nd.topFirstSharePct}%) ` +
      `| **${v.allPass ? 'PASS' : 'FAIL'}** |`
    );
  });

  lines.push('', '## Naming samples per ancestry', '');
  analyses.forEach(a => {
    lines.push(`### ${a.ancestry}`);
    lines.push('First names:  ' + a.firstNames.join(', '));
    lines.push('Last names:   ' + a.lastNames.join(', '));
    lines.push('Cross-ancestry name overlap: ' + (overlaps[a.ancestry].sharedNames.join(', ') || '(none)'));
    lines.push('');
  });

  lines.push('## Appearance differentiation', '');
  lines.push('Tokens listed below are descriptors UNIQUE to that ancestry across all 6 batches.');
  lines.push('A small or generic list suggests the appearance directive is biting weakly;');
  lines.push('a rich list of ancestry-coded color/texture/feature words is the desired signal.');
  lines.push('');
  analyses.forEach(a => {
    const ap = appearances[a.ancestry];
    lines.push(`### ${a.ancestry} — ${ap.uniquePct}% unique (${ap.uniqueTokens} of ${ap.totalTokens})`);
    lines.push('Sample unique tokens: ' + (ap.sampleUniqueTokens.join(', ') || '(none)'));
    lines.push('Complexion samples: ' + a.complexionSamples.slice(0, 5).map(s => `"${s}"`).join(' · '));
    lines.push('Hair samples:       ' + a.hairSamples.slice(0, 5).map(s => `"${s}"`).join(' · '));
    lines.push('');
  });

  lines.push('## Failure detail', '');
  let anyFail = false;
  analyses.forEach(a => {
    const v = verdicts[a.ancestry];
    if (!v.allPass) {
      anyFail = true;
      lines.push(`- **${a.ancestry}**: ${v.failReasons.join('; ')}`);
    }
  });
  if (!anyFail) lines.push('_All ancestries passed all hard gates._');

  lines.push('', '## Cultural-memory rates (observational)', '');
  lines.push('Use these numbers to decide whether to gate on cultural memory in future');
  lines.push('revisions. If most ancestries land 40-60%, that probably IS the right rate');
  lines.push('for the "ONE detail per Issue" contract. If most land 0-20%, the directive');
  lines.push('may be too soft.');
  lines.push('');
  analyses.forEach(a => {
    lines.push(`- **${a.ancestry}**: ${a.memoryPresentCount}/${a.n} (${a.memoryPresentPct}%)`);
  });

  lines.push('', '## Name diversity (observational) — calcification check', '');
  lines.push('Intra-ancestry name diversity. The ancestry directive successfully picks');
  lines.push('"a Korean-tradition name" — but a HEALTHY value should also vary WHICH');
  lines.push('Korean-tradition name across stories. Low diversity (e.g., Mina × 10) is');
  lines.push('the same class of calcification Storybound has worked to eliminate elsewhere.');
  lines.push('');
  lines.push('Target healthy values are unknown until more runs land. Recording so a re-run');
  lines.push('after any name-diversity directive update can verify movement.');
  lines.push('');
  lines.push('| Ancestry | First-name diversity | First-name calcification (top × share) | Last-name diversity (top) |');
  lines.push('|----------|----------------------|----------------------------------------|---------------------------|');
  analyses.forEach(a => {
    const nd = verdicts[a.ancestry].nameDiversityObservational;
    lines.push(`| ${a.ancestry} | ${nd.uniqueFirstCount}/${nd.n} (${(nd.firstDiversityRatio * 100).toFixed(0)}%) | ${nd.topFirstName} × ${nd.topFirstCount} (${nd.topFirstSharePct}%) | ${nd.uniqueLastCount}/${nd.n} (${(nd.lastDiversityRatio * 100).toFixed(0)}%) — top ${nd.topLastName} × ${nd.topLastCount} |`);
  });

  lines.push('', '## Calibration notes', '');
  lines.push('### Appearance threshold (30%) — PROVISIONAL');
  lines.push('First N=10 run found all 6 ancestries clustered 16–26% — every batch failed');
  lines.push('the 30% gate. But human inspection of `<ancestry>-<n>.json` samples shows real');
  lines.push('heritage-coded vocabulary (locs/coils/shea for Yoruba; blunt/cut/ponytail for');
  lines.push('Korean; charcoal/loops/tendrils for Persian). The likely cause: shared English');
  lines.push('appearance substrate (black, thick, wavy, long, braid, loose) is so large that');
  lines.push('30% uniqueness is structurally hard to reach for any pair of ancestries whose');
  lines.push('hair/skin descriptors overlap at all. DO NOT lower until a second dataset OR');
  lines.push('a smarter metric (n-gram clusters, descriptor categories) confirms the ceiling.');
  lines.push('');
  lines.push('### Cultural memory and name diversity — observational only');
  lines.push('No threshold set. First run will become the baseline; future runs measure');
  lines.push('movement after directive changes.');

  lines.push('', '## Raw data', '', 'See `analysis.json` for machine-readable metrics. ' +
    'Individual bibles at `<ancestry>-<n>.json` for spot-reading.');

  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[heritage-audit] starting — ${ANCESTRIES.length} ancestries × ${N_PER_ANCESTRY} samples = ${ANCESTRIES.length * N_PER_ANCESTRY} bibles`);
  console.log(`[heritage-audit] model=${MODEL} proxy=${PROXY_URL}`);
  console.log(`[heritage-audit] output dir: ${OUTPUT_DIR}`);

  // Sanity check: is the proxy reachable?
  try {
    const ping = await fetch(`${PROXY_URL}/api/anthropic-proxy`, { method: 'OPTIONS' });
    if (!ping.ok && ping.status !== 405 && ping.status !== 204) {
      throw new Error(`Proxy ping returned ${ping.status}`);
    }
  } catch (e) {
    console.error(`\n[heritage-audit] ERROR: cannot reach ${PROXY_URL}/api/anthropic-proxy`);
    console.error(`  Is the vercel dev server running? (vercel dev / npm run dev)`);
    console.error(`  Underlying error: ${e.message}\n`);
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const allBibles = {};

  for (const ancestry of ANCESTRIES) {
    allBibles[ancestry] = [];
    console.log(`\n[heritage-audit] ── ${ancestry} ──`);
    for (let i = 0; i < N_PER_ANCESTRY; i++) {
      const slot = i + 1;
      process.stdout.write(`  sample ${slot}/${N_PER_ANCESTRY} … `);
      try {
        const bible = await callBibleGen(ancestry);
        allBibles[ancestry].push(bible);
        await writeFile(
          resolve(OUTPUT_DIR, `${ancestry.toLowerCase()}-${slot}.json`),
          JSON.stringify(bible, null, 2)
        );
        process.stdout.write(`OK  (${bible.first_name || '?'} ${bible.last_name || '?'})\n`);
      } catch (e) {
        process.stdout.write(`FAIL — ${e.message}\n`);
        allBibles[ancestry].push({ _error: e.message });
      }
    }
  }

  // Analyze
  console.log('\n[heritage-audit] analyzing…');
  const analyses = ANCESTRIES.map(a => analyzeBatch(a, allBibles[a].filter(b => !b._error)));
  const overlaps = nameDisjointness(analyses);
  const appearances = appearanceDifferentiation(analyses);
  const verdicts = {};
  analyses.forEach(a => { verdicts[a.ancestry] = verdict(a, overlaps[a.ancestry], appearances[a.ancestry]); });

  // Write outputs
  const analysisJson = { analyses, overlaps, appearances, verdicts, config: { MODEL, N_PER_ANCESTRY, WORLD, WORLD_SUBTYPE, ARCHETYPE, ranAt: new Date().toISOString() } };
  await writeFile(resolve(OUTPUT_DIR, 'analysis.json'), JSON.stringify(analysisJson, null, 2));

  const summaryMd = renderSummary(analyses, overlaps, appearances, verdicts);
  await writeFile(resolve(OUTPUT_DIR, 'SUMMARY.md'), summaryMd);

  // Console summary
  console.log('\n[heritage-audit] complete\n');
  console.log(summaryMd);

  const overallPass = Object.values(verdicts).every(v => v.allPass);
  console.log(`\n[heritage-audit] OVERALL: ${overallPass ? 'PASS' : 'FAIL'}`);
  process.exit(overallPass ? 0 : 1);
}

main().catch(e => {
  console.error(`[heritage-audit] FATAL: ${e.message}`);
  console.error(e.stack);
  process.exit(2);
});
