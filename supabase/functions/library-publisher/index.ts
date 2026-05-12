// ═══════════════════════════════════════════════════════════════════════════════
// LIBRARY PUBLISHER — Scheduled publishing job for the Forbidden Library
//
// Reads from story_snapshots (read-only). Writes to library_entries (upsert).
// Never modifies gameplay tables. Never exposes user identifiers.
// Idempotent: safe to invoke repeatedly.
//
// Eligibility: snapshot.stateSnapshot.turnCount >= 20
//
// Sanitization pipeline:
//   1. Strip HTML → plain text
//   2. Generate per-story world-appropriate replacement names (LLM,
//      cached on library_entries for stability across re-runs)
//   3. Replace player/partner character names with those replacements
//   4. LLM pass (OpenAI gpt-4o-mini) for context-aware scrubbing:
//      - Fantasy stories: scrub real-world cities, college names
//      - Modern/contemporary: keep cities and colleges intact
//      - Social media handles → in-universe synonyms
//      - Emails → subtly corrupted (still readable, won't deliver)
//      - Phone numbers → preserve plot-meaningful ones, scrub brand names
//      - Company names → creative fictional renames
//      - User-input-derived prose (say/do woven into narrative) is
//        PRESERVED — readers see a complete novel, not a player log
//   5. Collapse whitespace, normalize
//   6. Propagate issue_number / issue_flavor from story_library_versions
//      so the Forbidden Library entry carries the canonical badge.
//
// SQL prerequisites for this version (run once):
//   ALTER TABLE public.library_entries
//     ADD COLUMN IF NOT EXISTS issue_number INTEGER,
//     ADD COLUMN IF NOT EXISTS issue_flavor TEXT,
//     ADD COLUMN IF NOT EXISTS issue_claimed_at TIMESTAMPTZ,
//     ADD COLUMN IF NOT EXISTS replacement_player_name TEXT,
//     ADD COLUMN IF NOT EXISTS replacement_partner_name TEXT;
//   CREATE INDEX IF NOT EXISTS idx_library_entries_issue_flavor_number
//     ON public.library_entries(issue_flavor, issue_number);
// ═══════════════════════════════════════════════════════════════════════════════

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constants ────────────────────────────────────────────────────────────────

// Fallback names used ONLY when LLM name-generation fails. Real names are
// generated per-story via generateReplacementNames() and cached on the row.
const FALLBACK_PROTAGONIST_NAME = "Aurelia Vale";
const FALLBACK_LOVE_INTEREST_NAME = "Lucien Vale";

// Replacement-name schema version. Stamped on every library_entries row
// at publish time so future name-generation changes can be selectively
// migrated. Bump when the name-gen prompt or rules change in a way that
// would justify re-rolling existing entries.
//   v1: gpt-4o-mini name-gen with world-aware system prompt + JSON mode,
//       AI-trope blocklist, gender-matched output (2026-05-12).
const REPLACEMENT_NAME_VERSION = 1;

const MIN_TURN_COUNT = 20;
const BATCH_SIZE = 500;
const LLM_MAX_CHARS = 24000; // truncate very long stories before sending to LLM

// ── Basic text cleanup (pre-LLM) ────────────────────────────────────────────

function stripHTML(html: string): string {
  let text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026");
  return text;
}

function replaceCharacterNames(
  text: string,
  playerName: string | null,
  partnerName: string | null,
  displayPlayerName: string | null,
  displayPartnerName: string | null,
  replacementPlayerName: string,
  replacementPartnerName: string
): string {
  const names = [playerName, displayPlayerName, partnerName, displayPartnerName]
    .filter(Boolean)
    .map((n) => n!.trim())
    .filter((n) => n.length >= 2);

  const uniqueNames = [...new Set(names)].sort((a, b) => b.length - a.length);

  for (const name of uniqueNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`\\b${escaped}\\b`, "gi");
    const isPlayer = name === playerName || name === displayPlayerName;
    text = text.replace(rx, isPlayer ? replacementPlayerName : replacementPartnerName);
  }
  return text;
}

// ── Per-story replacement name generation ────────────────────────────────────
// Generates two world-appropriate names per story so the Forbidden Library
// reads as a curated catalog of distinct novels (not as 1,000 stories all
// starring "Aurelia Vale"). Names are stable: cached on the library_entries
// row so re-runs of the publisher reuse them.
const NAME_GENERATION_SYSTEM_PROMPT = `You generate two character names for a published romance novel. Return ONLY a JSON object: {"playerName": "...", "partnerName": "..."}.

RULES:
- Names must fit the world type and tone provided. A Fantasy story gets evocative-fantasy names; a Modern story gets contemporary names; a Sci-Fi story gets names that suggest the era/setting.
- Use first name + last name format (e.g., "Mira Lansing", "Theo Vance"). One word names are acceptable for non-Modern worlds where culturally appropriate (e.g., "Kael of the Northwood").
- Match the character genders given.
- DO NOT use names from copyrighted fiction (no "Aurelia", "Lucien", "Lyra", "Elara", "Cassian", "Rhysand", "Geralt", "Yennefer", or any other obviously-AI-trope or popular-fiction names).
- DO NOT use names of real public figures or celebrities.
- DO NOT pick names that sound like the same person (different ethnicities/feels welcome).
- Names should sound like a literary novel's protagonists, not a paranormal-romance pulp.
- Vary your output. Avoid common patterns. Be specific to the world.

Examples of good output for different worlds:
- Modern (Billionaire): {"playerName": "Sloane Beckett", "partnerName": "Adrian Vossberg"}
- Fantasy (Cursed): {"playerName": "Nimue of the Reach", "partnerName": "Eithran Solm"}
- Sci-Fi (Cyberpunk): {"playerName": "Yuki Marsh", "partnerName": "Devin Aoki"}
- Dystopia (Glass House): {"playerName": "Mira Lansing", "partnerName": "Theo Reisner"}
- Post-Apocalyptic: {"playerName": "Cass Hollow", "partnerName": "Bram Sigurd"}`;

async function generateReplacementNames(
  worldType: string,
  worldSubtype: string | null,
  playerGender: string | null,
  partnerGender: string | null,
  openaiKey: string
): Promise<{ playerName: string; partnerName: string }> {
  if (!openaiKey) {
    return {
      playerName: FALLBACK_PROTAGONIST_NAME,
      partnerName: FALLBACK_LOVE_INTEREST_NAME,
    };
  }
  const userPrompt = `WORLD: ${worldType || "Modern"}${worldSubtype ? ` — ${worldSubtype}` : ""}
PLAYER CHARACTER GENDER: ${playerGender || "unspecified"}
LOVE INTEREST GENDER: ${partnerGender || "unspecified"}

Generate the two names now.`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: NAME_GENERATION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.95,        // high temperature for variety across stories
        max_tokens: 80,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      console.warn(`[library-publisher] Name-gen LLM failed (${resp.status}); using fallbacks.`);
      return {
        playerName: FALLBACK_PROTAGONIST_NAME,
        partnerName: FALLBACK_LOVE_INTEREST_NAME,
      };
    }
    const json = await resp.json();
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return {
        playerName: FALLBACK_PROTAGONIST_NAME,
        partnerName: FALLBACK_LOVE_INTEREST_NAME,
      };
    }
    const parsed = JSON.parse(raw);
    const playerName = typeof parsed.playerName === "string" && parsed.playerName.trim().length >= 2
      ? parsed.playerName.trim()
      : FALLBACK_PROTAGONIST_NAME;
    const partnerName = typeof parsed.partnerName === "string" && parsed.partnerName.trim().length >= 2
      ? parsed.partnerName.trim()
      : FALLBACK_LOVE_INTEREST_NAME;
    return { playerName, partnerName };
  } catch (err) {
    console.warn("[library-publisher] Name-gen threw:", err);
    return {
      playerName: FALLBACK_PROTAGONIST_NAME,
      partnerName: FALLBACK_LOVE_INTEREST_NAME,
    };
  }
}

// ── LLM-powered context-aware sanitization ───────────────────────────────────

const SANITIZATION_SYSTEM_PROMPT = `You are a text sanitization engine for a public fiction library. Your job is to modify story text to remove legally sensitive real-world references while keeping the prose natural and readable. Return ONLY the modified text, no commentary.

RULES BY STORY WORLD TYPE:

FANTASY stories:
- Remove all real-world city names, replace with fitting fantasy equivalents (e.g., "New York" → "Thornhaven", "London" → "Ashenmere")
- Remove all real-world college/university names, replace with fantasy equivalents (e.g., "Harvard" → "The Obsidian Academy")
- Remove all real-world country names if they break immersion

MODERN / CONTEMPORARY / SCI-FI stories:
- KEEP city names — they are part of the setting
- KEEP college/university names — they are part of the setting

ALL stories regardless of world:
- COMPANY NAMES: Rename to creative fictional equivalents that evoke the same feeling. Examples:
  - "Goldman Sachs" → "S.A.C. Silverman"
  - "McKinsey" → "Ashford & Hale"
  - "JPMorgan" → "Blackwell Morgan"
  - "Google" → "Nexus"
  - "Apple" → "Prism"
  - "Amazon" → "Titan Logistics"
  - "Tesla" → "Volta Motors"
  Keep the replacement consistent throughout the text (same company → same replacement).

- SOCIAL MEDIA HANDLES (@mentions):
  - If the handle uses a name (e.g., @MrBig), replace with a synonym handle (@SirLarge)
  - If the handle uses descriptive words, replace with synonyms (@DarkKnight → @ShadowGuard)
  - Keep the @ prefix and make it feel natural

- EMAIL ADDRESSES:
  - Do NOT redact. Instead, insert one extra character into the domain that would cause delivery failure but keeps readability (e.g., "john@gmail.com" → "john@gmaill.com", "sara@company.co" → "sara@commpany.co")

- PHONE NUMBERS:
  - If the number spells out something plot-relevant (e.g., "1-800-GET-JACKED" for a character's business), KEEP IT
  - Scrub obvious real brand vanity numbers (e.g., "1-800-MATTRESS", "1-800-FLOWERS", "1-800-GOT-JUNK")
  - For random phone numbers with no plot significance, shuffle 2 digits

- BRAND NAMES (Coke, Nike, Gucci, etc.):
  - Replace with evocative fictional equivalents ("Coke" → "Crimson Cola", "Nike" → "Stride", "Gucci" → "Aureli")
  - If a brand name is used generically (e.g., "googled it"), leave the verb form but lowercase it

NARRATIVE INTEGRITY (CRITICAL):
- This text comes from an interactive fiction engine that already converts player inputs into third-person narrative prose ("she said", "he leaned in", "they reached for", etc.). DO NOT strip, summarize, or remove any of this narrative — readers should experience a complete novel.
- Preserve all dialogue, all interior monologue, all action beats, all pacing.
- Do NOT skip or compress passages because they feel "lower-quality" — every paragraph stays unless it contains a real-world reference that must be replaced.
- Do NOT add transitional prose, chapter headings, or editorial framing the source did not include.
- If a passage contains user-input-derived material (a line of dialogue or an action that originated from a player's say/do entry), it remains as-is unless it contains a real-world reference. The provenance of how the prose was generated is invisible to the reader.

CRITICAL: Preserve the story's tone, pacing, and meaning. Changes should be invisible to a casual reader. Do NOT add commentary, headers, or explanations. Return only the modified story text.`;

async function llmSanitize(
  text: string,
  worldType: string,
  openaiKey: string
): Promise<string> {
  // Truncate very long texts to stay within token limits
  const truncated = text.length > LLM_MAX_CHARS ? text.slice(0, LLM_MAX_CHARS) : text;

  const userPrompt = `STORY WORLD TYPE: ${worldType || "Modern"}

TEXT TO SANITIZE:
${truncated}`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SANITIZATION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[library-publisher] OpenAI API error ${resp.status}:`, errBody);
      return text; // Fall back to unsanitized-by-LLM text
    }

    const json = await resp.json();
    const result = json.choices?.[0]?.message?.content?.trim();
    if (!result) {
      console.warn("[library-publisher] OpenAI returned empty content, using original text");
      return text;
    }

    // If text was truncated, append the remainder unsanitized
    if (text.length > LLM_MAX_CHARS) {
      return result + text.slice(LLM_MAX_CHARS);
    }
    return result;
  } catch (err) {
    console.error("[library-publisher] OpenAI call failed:", err);
    return text; // Graceful fallback
  }
}

// ── Full sanitization pipeline ───────────────────────────────────────────────

async function sanitizeText(
  html: string,
  playerName: string | null,
  partnerName: string | null,
  displayPlayerName: string | null,
  displayPartnerName: string | null,
  replacementPlayerName: string,
  replacementPartnerName: string,
  worldType: string,
  openaiKey: string
): Promise<string> {
  // Step 1: Strip HTML
  let text = stripHTML(html);

  // Step 2: Replace character names (deterministic, no LLM needed)
  text = replaceCharacterNames(
    text,
    playerName,
    partnerName,
    displayPlayerName,
    displayPartnerName,
    replacementPlayerName,
    replacementPartnerName
  );

  // Step 3: LLM context-aware scrubbing
  if (openaiKey) {
    text = await llmSanitize(text, worldType, openaiKey);
  } else {
    console.warn("[library-publisher] No OPENAI_API_KEY — skipping LLM sanitization pass");
  }

  // Step 4: Collapse whitespace
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!openaiKey) {
    console.warn("[library-publisher] OPENAI_API_KEY not set — LLM sanitization will be skipped");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let processed = 0;
  let created = 0;
  let updated = 0;

  try {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: rows, error } = await supabase
        .from("story_snapshots")
        .select("story_id, snapshot")
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error("[library-publisher] Query error:", error.message);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!rows || rows.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of rows) {
        const snap = row.snapshot;
        if (!snap) continue;

        const stateSnap = snap.stateSnapshot;
        if (!stateSnap) continue;

        const turnCount = Number(stateSnap.turnCount || 0);
        if (turnCount < MIN_TURN_COUNT) continue;

        const storyHTML = snap.storyHTML || "";
        if (!storyHTML) continue;

        // Extract names for sanitization (originals — these are what we
        // search for and replace in the source text)
        const playerName = stateSnap.picks?.identity?.playerName || null;
        const partnerName = stateSnap.picks?.identity?.partnerName || null;
        const displayPlayerName = stateSnap.displayPlayerName || null;
        const displayPartnerName = stateSnap.displayPartnerName || null;

        // Extract world metadata for context-aware scrubbing + name gen.
        const worldType = stateSnap.fantasyRegionLabel || stateSnap.world || "Modern";
        const worldSubtype = stateSnap.picks?.worldSubtype || stateSnap.worldSubtype || null;
        const playerGender = stateSnap.gender || stateSnap.picks?.identity?.playerGender || null;
        const partnerGender = stateSnap.loveInterest || stateSnap.picks?.identity?.partnerGender || null;

        const storyId = snap.storyId || row.story_id;

        // ── Load existing library_entries row (if any) for cached
        //    replacement names and existing issue metadata ──
        // Stable names: once a story has been published with replacement
        // names, those names persist across re-runs. We never re-roll
        // and rename a story that has already entered the public library.
        const { data: existing } = await supabase
          .from("library_entries")
          .select("story_id, replacement_player_name, replacement_partner_name")
          .eq("story_id", storyId)
          .maybeSingle();

        const isNew = !existing;

        // ── Resolve replacement names ──
        // Use cached if present; otherwise generate fresh and persist.
        let replacementPlayerName: string;
        let replacementPartnerName: string;
        if (existing && existing.replacement_player_name && existing.replacement_partner_name) {
          replacementPlayerName = existing.replacement_player_name;
          replacementPartnerName = existing.replacement_partner_name;
        } else {
          const generated = await generateReplacementNames(
            worldType,
            worldSubtype,
            playerGender,
            partnerGender,
            openaiKey
          );
          replacementPlayerName = generated.playerName;
          replacementPartnerName = generated.partnerName;
          console.log(`[library-publisher] Generated names for ${storyId}: ${replacementPlayerName} / ${replacementPartnerName}`);
        }

        // ── Pull issue number + playthrough credit from story_library_versions ──
        // Both live there from the claim-issue-number endpoint that fires
        // at story completion. Propagated here so the Forbidden Library
        // row shows the badge AND the optional playthrough credit line:
        //   "Glass House / No. 4 / by S. Tory Bound / as played by @NyxMarauder"
        // Credit may be null (Anonymous Canon Edition) — that's fine,
        // the badge just omits the "as played by" line.
        const { data: versionRow } = await supabase
          .from("story_library_versions")
          .select("issue_number, issue_flavor, issue_claimed_at, playthrough_credit, playthrough_credit_normalized")
          .eq("id", storyId)
          .maybeSingle();

        const issueNumber = versionRow?.issue_number ?? null;
        const issueFlavor = versionRow?.issue_flavor ?? null;
        const issueClaimedAt = versionRow?.issue_claimed_at ?? null;
        const playthroughCredit = versionRow?.playthrough_credit ?? null;
        // Normalized canonical handle — computed by the immutability
        // trigger on story_library_versions. Library_entries doesn't have
        // its own trigger, so we propagate the already-computed value
        // rather than re-deriving (avoids drift if normalization rules
        // change in one place but not the other).
        const playthroughCreditNormalized = versionRow?.playthrough_credit_normalized ?? null;

        const sanitizedText = await sanitizeText(
          storyHTML,
          playerName,
          partnerName,
          displayPlayerName,
          displayPartnerName,
          replacementPlayerName,
          replacementPartnerName,
          worldType,
          openaiKey
        );

        const title = snap.title || "Untitled";
        const wordCount = countWords(sanitizedText);

        // Cinegraphic-mode metadata — propagated from the snapshot JSONB
        // so the Forbidden Library shelf can render saved cinegraphic
        // novels with the working-cover identity (cream + Lust title +
        // gold credit band) instead of the dark generic fallback.
        const renderMode = snap.render_mode || stateSnap.renderMode || null;
        const graphicStyle = snap.graphic_style || stateSnap.graphicStyle || stateSnap.gnArtist || null;
        const backCoverSynopsis = snap.backCoverSynopsis || stateSnap.backCoverSynopsis || null;
        // Evolving cover image — cinegraphic (gnCoverUrl) takes precedence,
        // literary (coverImage) is the fallback.
        const coverUrl = stateSnap.gnCoverUrl || stateSnap.coverImage || null;

        const { error: upsertErr } = await supabase
          .from("library_entries")
          .upsert({
            story_id: storyId,
            title: title,
            author: "S. Tory Bound",
            scene_count: turnCount,
            snapshot_scene_count: turnCount,
            word_count: wordCount,
            sanitized_text: sanitizedText,
            render_mode: renderMode,
            graphic_style: graphicStyle,
            back_cover_synopsis: backCoverSynopsis,
            cover_url: coverUrl,
            // Per-story stable replacement names (cached so re-runs don't
            // rename the protagonist mid-life of the entry).
            replacement_player_name: replacementPlayerName,
            replacement_partner_name: replacementPartnerName,
            // Schema version stamped on each row — bump constant above
            // (and add a migration to re-roll v < N rows) when the name-
            // generation prompt or rules change in a meaningful way.
            replacement_name_version: REPLACEMENT_NAME_VERSION,
            // Issue number provenance propagated from story_library_versions.
            // Once the story has cliffed/finished and the claim has fired,
            // these become the Forbidden Library entry's permanent badge.
            issue_number: issueNumber,
            issue_flavor: issueFlavor,
            issue_claimed_at: issueClaimedAt,
            // Playthrough credit — null = Anonymous Canon Edition.
            // String = appears on the public cover as "as played by X".
            // Normalized form propagated from the trigger-computed value
            // on story_library_versions so library_entries lookup/filter
            // by handle (case-insensitive) works consistently.
            playthrough_credit: playthroughCredit,
            playthrough_credit_normalized: playthroughCreditNormalized,
            eligible: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "story_id" });

        if (upsertErr) {
          console.error(
            `[library-publisher] Upsert failed for ${storyId}:`,
            upsertErr.message
          );
        } else {
          processed++;
          if (isNew) created++;
          else updated++;
        }
      }

      if (rows.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }
  } catch (err) {
    console.error("[library-publisher] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(
    `[library-publisher] Done: processed=${processed}, created=${created}, updated=${updated}`
  );

  return new Response(
    JSON.stringify({ processed, created, updated }),
    { headers: { "Content-Type": "application/json" } }
  );
});
