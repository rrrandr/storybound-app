// ═══════════════════════════════════════════════════════════════════════════════
// LIBRARY PUBLISHER — Scheduled publishing job for the Forbidden Library
//
// Reads from story_snapshots (read-only). Writes to library_entries (upsert).
// Never modifies gameplay tables. Never exposes user identifiers.
// Idempotent: safe to invoke repeatedly.
//
// Eligibility: snapshot.stateSnapshot.turnCount >= 20
// ═══════════════════════════════════════════════════════════════════════════════

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Sanitization constants ──────────────────────────────────────────────────

const PROTAGONIST_NAME = "Aurelia Vale";
const LOVE_INTEREST_NAME = "Lucien Vale";

const COMPANY_PATTERN =
  /\b(Goldman(?:\s+Sachs)?|JPMorgan|JP\s*Morgan|Morgan\s+Stanley|BlackRock|McKinsey|Deloitte|Bain)\b/gi;
const LOCATION_PATTERN =
  /\b(Brooklyn|Manhattan|Queens|Bronx|Staten\s+Island|Harlem|SoHo|Tribeca|Chelsea|Williamsburg|New\s+York(?:\s+City)?|Los\s+Angeles|San\s+Francisco|Chicago|Boston|Miami|Seattle|Portland|Austin|Denver|Atlanta|Houston|Dallas|Philadelphia|Phoenix|Washington\s+D\.?C\.?)\b/gi;
const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

const MIN_TURN_COUNT = 20;
const BATCH_SIZE = 500;

// ── Sanitization ────────────────────────────────────────────────────────────

function sanitizeText(
  html: string,
  playerName: string | null,
  partnerName: string | null,
  displayPlayerName: string | null,
  displayPartnerName: string | null
): string {
  // Strip HTML tags → plain text
  let text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  // Decode common HTML entities
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

  // Replace character names (longest first to avoid partial matches)
  const names = [
    playerName,
    displayPlayerName,
    partnerName,
    displayPartnerName,
  ]
    .filter(Boolean)
    .map((n) => n!.trim())
    .filter((n) => n.length >= 2);

  // Deduplicate and sort longest-first
  const uniqueNames = [...new Set(names)].sort(
    (a, b) => b.length - a.length
  );

  for (const name of uniqueNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`\\b${escaped}\\b`, "gi");
    // Determine replacement: is this a player name or partner name?
    const isPlayer =
      name === playerName || name === displayPlayerName;
    text = text.replace(rx, isPlayer ? PROTAGONIST_NAME : LOVE_INTEREST_NAME);
  }

  // Scrub real-world identifiers
  text = text.replace(COMPANY_PATTERN, "a private firm");
  text = text.replace(LOCATION_PATTERN, "the city");
  text = text.replace(EMAIL_PATTERN, "[redacted]");
  text = text.replace(PHONE_PATTERN, "[redacted]");

  // Collapse whitespace
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

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let processed = 0;
  let created = 0;
  let updated = 0;

  try {
    // Fetch eligible snapshots in batches
    // Service role bypasses RLS — reads all story_snapshots
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

        const sanitizedText = sanitizeText(
          storyHTML,
          playerName,
          partnerName,
          displayPlayerName,
          displayPartnerName
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
