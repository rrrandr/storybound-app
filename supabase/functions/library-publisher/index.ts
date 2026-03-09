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
//   2. Replace player/partner character names with fixed pseudonyms
//   3. LLM pass (OpenAI gpt-4o-mini) for context-aware scrubbing:
//      - Fantasy stories: scrub real-world cities, college names
//      - Modern/contemporary: keep cities and colleges intact
//      - Social media handles → in-universe synonyms
//      - Emails → subtly corrupted (still readable, won't deliver)
//      - Phone numbers → preserve plot-meaningful ones, scrub brand names
//      - Company names → creative fictional renames
//   4. Collapse whitespace, normalize
// ═══════════════════════════════════════════════════════════════════════════════

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constants ────────────────────────────────────────────────────────────────

const PROTAGONIST_NAME = "Aurelia Vale";
const LOVE_INTEREST_NAME = "Lucien Vale";

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
  displayPartnerName: string | null
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
    text = text.replace(rx, isPlayer ? PROTAGONIST_NAME : LOVE_INTEREST_NAME);
  }
  return text;
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
  worldType: string,
  openaiKey: string
): Promise<string> {
  // Step 1: Strip HTML
  let text = stripHTML(html);

  // Step 2: Replace character names (deterministic, no LLM needed)
  text = replaceCharacterNames(text, playerName, partnerName, displayPlayerName, displayPartnerName);

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

        // Extract names for sanitization
        const playerName = stateSnap.picks?.identity?.playerName || null;
        const partnerName = stateSnap.picks?.identity?.partnerName || null;
        const displayPlayerName = stateSnap.displayPlayerName || null;
        const displayPartnerName = stateSnap.displayPartnerName || null;

        // Extract world type for context-aware scrubbing
        const worldType = stateSnap.fantasyRegionLabel || stateSnap.world || "Modern";

        const sanitizedText = await sanitizeText(
          storyHTML,
          playerName,
          partnerName,
          displayPlayerName,
          displayPartnerName,
          worldType,
          openaiKey
        );

        const title = snap.title || "Untitled";
        const wordCount = countWords(sanitizedText);
        const storyId = snap.storyId || row.story_id;

        // Check existence for created/updated counting
        const { data: existing } = await supabase
          .from("library_entries")
          .select("story_id")
          .eq("story_id", storyId)
          .maybeSingle();

        const isNew = !existing;

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
