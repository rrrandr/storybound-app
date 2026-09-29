# SCENE-AUTHOR ROUTING POLICY — v2 (no code, no calls) · 2026-09-06

Supersedes §3 of `author_routing_decision.md` on one point: **OpenAI (gpt-4o and gpt-4o-mini) is ruled out of the
scene-author chain on price.** The existing silent literary fallback to gpt-4o is a policy/cost defect, not a safety net.

## 1 · Scene authoring (full literary scene, full CG screenplay)
- **Grok is the only currently evidenced viable route** (the literary author already serves every scene through it
  today, via the fallback). Policy: Grok-primary on both engines.
- **Mistral Small is never attempted first on an author-sized payload.** Every measured author request (≥131 k bytes
  literary lower bound, ≈205 k bytes CG, ≈380 k chars live literary) exceeds the 20,000-token allowance by 6–20×; the
  attempt is a guaranteed pre-dispatch refusal that today costs a detour on literary and a broken scene on CG.
- **No OpenAI model anywhere in the scene-author chain**, primary or fallback.
- The CG ladder's "a governor refusal must not advance the provider loop" rule is correct and stays; what changes is
  that an impossible request is no longer placed first.

## 2 · On a Grok failure — honest terminal/retry behavior (a cost control is not a model fallback)
Today: `callGrokNarrativeAuthor` makes one attempt and throws on non-2xx or empty; the proxy walks its model-name chain
only on 400/404 and fails fast on 401/403/429/5xx; the client then escapes to Mistral (refused) and gpt-4o (policy
defect). The literary handler arms `_pendingSceneRefund` when it charges a scene and **never calls
`_refundPendingSceneFortune` on failure** (only staged/GN paths do); the CG path already has a "Try Again / Take Refund"
popup for paid first-of-issue scenes.
Policy:
1. **Bounded retry:** one automatic re-attempt of the identical Grok request on a transient failure (timeout, 5xx,
   empty content), after a short fixed wait. No second retry, no alternate model, no altered prompt.
2. **Terminal state, honest:** "The author is unavailable right now. Your Fortune for this scene has been returned."
   with **Try Again** (re-submits the same Say/Do; charged again only if it succeeds) — the existing CG popup pattern,
   extended to literary, and the pending-scene refund actually paid on the literary path. No silent regeneration,
   no substitute author.
3. **Retry exposure to price:** the bounded retry (≤ 2 author calls) plus the existing Scene-2+ validator's one
   re-author (a third call on a failed validation). Whether the two retry mechanisms may compound to 3 calls or are
   capped at 2 combined is a decision to take with the cost work in §5; the policy default here is **cap 2 combined**.
4. Quota/rate refusals from xAI (429) are not retried automatically; they surface as the terminal state with the
   retry-after time when the provider gives one.

## 3 · Mutual Grok ↔ Mistral fallback — allowed only where both are evidenced
Allowed for a call only if **(a)** its captured reservation (UTF-8 bytes + `max_tokens`) is within the target Mistral
allowance (20,000 for Small; 625,000 / 937,500 for Ministral 8B/14B if those routes are ever enabled) **and (b)** the
same output contract has a captured, validator-passing result on **both** providers.
Status from the captures: **no call meets (b) today.** Calls meeting (a) with Mistral evidence only: the continuation
stage-contract skeleton (18,777, ~6 % headroom), `_proseLineEdit` (2.5–4.7 k, governor-aware), mechanical-defect fix
(3.7 k), body-bible reroll, hot-open repair, reflow, glint grounding. Calls with Grok evidence only: the A-plot generator
(≈ 67 k reserve — fails (a) for Small anyway), the soundscape classifier (12.5 k). The line-editor "ruthless" pass has
Grok-fast-reasoning and gpt-4o-mini twins, not Mistral. ⇒ the mutual-fallback set starts **empty** and grows only by
evidence; the sub-20 k Mistral passes keep their present behavior (keep the original on refusal).

## 4 · A future high-capacity Mistral author is its own test
Ministral 8B/14B have governor limits on record but are not in the proxy allowlist; Mistral Medium/Large are allowlisted
but have no governor entry (refused as unconfigured). A Ministral **author** A/B needs: the allowlist entry, the
governor entry as already read from the account page, and a blind paired prose test against Grok on the same seed with
the shipped reasoning setting. **The 8B/14B planner NO-GOs (stage 0, retests 1–2) measured planner content, not
authoring, and do not decide it.**

## 5 · Direct-Grok scene-author cost — existing records only, no cache assumptions
| item | figure | source |
|---|---|---|
| one author call, input, uncached | 86,904 prompt tokens × $1.25/M = **$0.1086** | archived real payload 385,347 chars; rates re-verified against docs.x.ai 2026-09-01 (`project_grok_cost_levers`); **rates double at ≥ 200 k prompt tokens** |
| one author call, completion | ≤ 3,000 × $2.50/M = **≤ $0.0075** | client `max_tokens` 3000 |
| one author call, reasoning tokens | **UNKNOWN per call** — counted nowhere in-app; `max_tokens` does not cap them | xAI console Aug 11–12: reasoning 2.1 M tokens = $5.30 of $22.25 across 8,130 mixed-role requests (24 %); not attributable per author call |
| per scene, worst case under §2 (cap 2 combined) | input ≤ $0.217 + completion ≤ $0.015 + reasoning unknown | arithmetic on the rows above |
| per scene, worst case if the two retry mechanisms compound (3 calls) | input ≤ $0.326 + completion ≤ $0.0225 + reasoning unknown | arithmetic |
| only console-derived per-scene figure on record | **$0.12 mean per continuation** (early ~$0.06, late ~$0.15) — **includes ~38 % cache hits and reasoning**, so it is not a no-cache number | `project_scene_cost_breakdown` (xAI console reconciliation 2026-08-12) |
| Scene 1 | ~$0.31 measured, of which gpt-4o-mini setup passes ~$0.22 (69 %) and Grok ~$0.10 | 2026-07-24 probe (audits forced on; inflated ceiling) |

**No launch cost conclusion is possible yet.** Required prompt-size work first: (1) block-level inventory of one real
continuation author payload with the ledger block on (tooling exists: `_sysPromptAudit` / `[DIRECTIVE-SIZES]` /
`[PROMPT-TIER:MASS]`); (2) dedupe or removal decisions on the repeated-instruction slice (measured 35–45 % of the payload,
uncached, in the rolling-context audit) — decisions, not estimates; (3) re-measure tokens after that and confirm a full
20-scene issue stays under the 200 k-token rate doubling (per-scene cost rises late in an issue); (4) add reasoning-token
telemetry (`completion_tokens_details`) so per-call cost becomes measurable; (5) only then price a scene and an issue.

## 6 · The CG fallback toast (not changed now)
The current toast "Screenplay gen timed out — using literary path" is false on a quota refusal. When it is changed it
must say that the quota governor refused the comic author for this scene and that a prose page was substituted; the
literary fallback inside a CG story is a **deliberately temporary** behavior until §1 is implemented, and must be
labeled as such in the UI, not disguised as a timeout.

## 7 · Scene-1 corridor planner — the exact preflight still required (free)
1. Drive `handleBeginStory` for the pilot configuration (Modern / small_town / Billionaire / Enemies / Earnest /
   first_person / `low`) through the shape-faithful role mocks of `_scene1_skeleton_delivery.mjs`, so the setup passes
   succeed and the planner request is actually built (the `{content:'{}'}` stub aborted before it).
2. Capture the `/api/mistral-proxy` POST with `role: 'PROMPT_PREPROCESSOR'`: UTF-8 bytes of system + user,
   `_SCAFFOLD_MAX_TOKENS` (the `chars=… → max_tokens=…` log line), reservation = bytes + max_tokens.
3. Admitted iff reservation ≤ 20,000. Repeat for the seeded starter (known: 92,980 → refused) and Famous Fate.
4. If refused: the reader's Scene 1 does not mount; the existing message offers a retry-after only when the governor
   gives one, and an oversized reservation is terminal (no retry-after) → the planner must leave Mistral Small — a
   route decision with its own admission (the xAI proxy has no reservation governor) and its own content bar.
5. Report bytes, max_tokens, reserve, verdict, and the reader-facing message text verbatim.

## 7a · Scene-1 corridor planner — MEASURED (2026-09-06)
Reserve **80,783** (Modern corridor with a seeded mission) and **84,392** (seeded First Sacrifice) against 20,000 →
refused before dispatch on Mistral Small in every form. And a second, upstream finding: on committed code an
**unseeded Scene 1 aborts at the stage contract before the planner is built** (the only corridor-mission source is
the planner's own reply). Both in `scene1_planner_reserve_and_corridor_stage.md`.

## 8 · Pilot status
NO-GO until §1 is implemented as decided, the Scene-1 planner is measured (§7), and the cost work in §5 has produced a
measured, not estimated, per-scene figure. Nothing dispatched, routed, prompted, or changed here.
