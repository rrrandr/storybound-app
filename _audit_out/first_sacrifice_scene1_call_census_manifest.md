# First Sacrifice Scene 1 — No-Provider Call Census: Final Manifest

Method: real browser drive of `handleBeginStory()` for `starter_first_sacrifice`, every outbound
`fetch` wrapped BEFORE app.js loads (`page.addInitScript`), each request's role captured from its
**real JS call stack** at the point of dispatch (never a prompt-text regex guess), reported to Node
via `page.exposeFunction`, then matched in `page.route()` against a declared role list. Known roles
get a minimal valid fixture so the dry run can continue; anything unmatched is blocked with a named
`UNDECLARED_MODEL_ROLE` (HTTP 599) and its full stack is captured. **Zero requests ever reached a
real provider.** app.js was not modified — a real regression it exposed (below) was fixed in place,
separately from the census instrumentation itself.

Final run: **Author reached: YES. Roles observed: 16 distinct. UNDECLARED blocked: 0.**
Two earlier rounds (12 then 7 UNDECLARED blocks) drove the role list to completion; each block's
stack was read, the real source function found in `app.js`/`orchestration-client.js`, and a
correctly-shaped fixture added — never guessed.

## Regression found and fixed during this census

`_buildScene1Scaffold`'s live-wired skeleton-repair refactor (this session, same day) nested the
declaration of `var plan = ...opening_spine...` inside the new `_tryValidateOpeningSkeletonFromRaw`
function. Every downstream read of `plan.*` (pressure source, hook object, opening/decision/rising
beats — ~30 reads) went `ReferenceError: plan is not defined` the instant validation returned,
silently caught by `_buildScene1Scaffold`'s own enclosing catch and reported as
`[SCENE1:ABORT] opening planner produced an unusable skeleton`. This is why Author never fired in
the prior round despite zero blocks — not a fixture problem, a real bug. `node --check` could not
catch it (valid syntax, runtime-only ReferenceError) and the earlier diff-parity proof did not catch
it (it only checked the validation body itself, not what the surrounding code still needed in
scope). Fixed by returning `plan` from the validation function and capturing it at the call site.
Full regression + fix write-up is in the commit-ready diff; not yet committed pending your review.

## Per-role manifest

Cost column: only xAI's `cost_in_usd_ticks` is a **sourced** $/token rate anywhere in this codebase
(confirmed earlier this session). Every Mistral-family model (`ministral-8b-2512`,
`mistral-small-latest`) and every OpenAI model (`gpt-4o-mini`, `gpt-4o`) has **no verified $/token
rate** in this codebase — marked unsourced below, not estimated.

### Pre-planner setup (fires before the opening planner, in parallel/sequence per handleBeginStory)

| Role | Required/Optional — condition | Max physical requests | When it can fire | Cost |
|---|---|---|---|---|
| **PC_BODY_BIBLE** | Required — unconditional | 3 (mistral→grok→openai tiers) | Pre-planner (Promise.all w/ LI bible) | mistral/openai unsourced; grok tier sourced if served |
| **PC_BODY_TELL_REROLL** | Optional — fires when body-tell family-diversity validation fails | 2 (bounded reroll passes, single-tier mistral-small each) | Inside PC bible generation | unsourced |
| **PC_PHYSICAL_CANON_DECALCIFY_GATE** | Declared unconditional in code (called with no gate) — never observed firing in 4 census rounds; open question why | 1 (single-tier mistral-small) | Inside PC bible generation | unsourced |
| **PC_BEHAVIORAL_CANON_DECALCIFY_GATE** | Same as above — new role this census found only via live stack trace, never observed firing | 1 | Inside PC bible generation | unsourced |
| **PC_CRISIS_REROLL** | Optional — gated on `_cfBillionaireRF && current_crisis && _instTrigger` (billionaire-flavor only) — near-certainly inert for Fantasy/First Sacrifice | 1 | Inside PC bible generation | unsourced |
| **LI_BODY_BIBLE** | Required — unconditional | 3 | Pre-planner (parallel w/ PC bible) | mistral/openai unsourced; grok sourced if served |
| LI physical/behavioral decalcify gates | **UNCONFIRMED** — same shared function exists for `role='li'` but never observed firing in any round; not yet distinguished from "genuinely conditional" vs "code path never reached" | unknown | unknown | unknown |
| **ANTAGONIST_BODY_BIBLE** | Optional — gated on an antagonist cast entry in the seed. First Sacrifice's seed has **none** → does not fire for this population | 0 (structurally inert here) | N/A for this population | N/A |
| **PAIR_BOND** | Required — unconditional | 3 | After both bibles | mistral/openai unsourced; grok sourced if served |
| **R_PLOT** | Required — unconditional | 3 | After Pair Bond | same |
| **WOUND_LI_INTEGRATION_AUDIT** | Required — unconditional ("genuine semantic judgment, not reducible to deterministic local logic") | 3 | After R-Plot | same |
| **CG_SCAFFOLD** | Required — unconditional, fires even for `renderMode:'literary'` (confirmed twice) | 3 | Before the opening planner | same |
| **EDITORIAL_PASS** | Optional — gated on `window._editorialPass && turnCount===0`, flag not set by default | 1 (single grok call) | Late pre-planner | sourced if served |

### Planner

| Role | Required/Optional — condition | Max physical requests | When | Cost |
|---|---|---|---|---|
| **OPENING_PLANNER** | Required — exactly once, no paid JSON retry (local deterministic repair only) | 1 (grok-4.3, /api/proxy) | After all pre-planner setup | sourced if served |
| **OPENING_PLANNER_REPAIR** | Optional — fires ONLY on a content-fault (never JSON-parse), only if every fault is confidently attributed (`_skeletonRepairEligible`). Exactly one attempt by design | 1 | After a failed first-pass skeleton validation | sourced if served |

### Author pipeline (fires only after the skeleton validates — the sole "chain is committed" gate)

| Role | Required/Optional — condition | Max physical requests | When | Cost |
|---|---|---|---|---|
| **AUTHOR** (main draft) | Required | 3 (Grok primary → Mistral cross-provider fallback → gpt-4o terminal) | Immediately after skeleton commit | sourced if grok-served, else unsourced |
| **GROK_DECALC_EDITOR** | Required — unconditional post-draft step (up to 5 exact-quote repetition/cliché fixes, deterministic apply) | 2 (Grok primary → gpt-4o-mini fallback) | Right after the draft | sourced if grok-served, else unsourced |
| **MECHANICAL_REPAIR** | Required — unconditional post-edit step (fragments/fused-quotes/punctuation/marker pairing only) | 2 (mistral-small primary → gpt-4o-mini fallback) | Right after the de-calc editor | unsourced |

Author-pipeline worst case: **7 physical calls** for one finished Scene-1 draft.

### Post-author gated passes (fire after finished prose exists)

| Role | Required/Optional — condition | Max physical requests | When | Cost |
|---|---|---|---|---|
| **LI_DESC_PROSE_REPAIR** | Optional — fires only if the LI's physical description is absent/not desire-coded in the prose AND ≥2 canon details are available | 1 (single Haiku-tier edit, no fallback) | After the finished draft | unsourced |
| **VOCAB_BAN_PROSE_EDIT** | Optional — fires only if a banned-vocab violation is found in the finished prose (regenerate-once, no chain) | 1 | After the finished draft | unsourced |
| **INTIMACY_FAILSAFE_EDIT** | Optional — fires only if intimacy-consent validation flags a violation (regenerate-once) | 1 | After the finished draft | unsourced |
| **SIGNATURE_PHRASE_AUDIT** | Required — unconditional, fire-and-forget (`setTimeout 0`), does not block scene delivery | 1 (gpt-4o-mini, no fallback) | After the finished draft | unsourced |
| **CHARACTER_DISCLOSURE_EXTRACTION** | Required — unconditional; failures are silently swallowed (non-blocking analytics/ledger pass) | 3 (mistral→grok→openai tiers) | After the finished draft | mistral/openai unsourced; grok sourced if served |
| **VOICE_ANCHOR** | Fires once per story (gated on `!state.voiceAnchor`), fire-and-forget, does not block scene delivery | 1 (gpt-4o, no fallback) | After synopsis/title step | unsourced |
| **PREWRITE_HINT_EXPANSION** | Fires exactly twice (direct + subtle), gated on turnCount===0 AND no author-appendix AND a micro-decision exists; fire-and-forget | 2 (single-tier grok each, no fallback — empty on failure) | Inside `callChat`, concurrent with later steps | sourced if served |

### Confirmed NOT part of First Sacrifice's real path

**SYNOPSIS_GENERATION** (+ its own up-to-6-call retry/regen loop: vocab-ban regen, up to 3
validation retries, triad-consistency regen) and **TITLE_GENERATION** are both gated behind
`!_titlePreGenerated`. For a starter Book (First Sacrifice included), `def.title` LOCKS
`state.immutableTitle` **and** `state.story.title` together at story-start
(`app.js:136838-136841`, "LOCK the pre-written starter title... must NEVER change during play"),
so `_titlePreGenerated` is always `true` for this population — the entire block is skipped.

This was confirmed empirically, not just by reading the code: the census harness's synthetic state
initially set `immutableTitle` but not `state.story.title`, so it *incorrectly* fell into this
branch and surfaced 7 extra "undeclared" calls (synopsis gen + retries + a chatgpt title regen).
Setting `state.story.title` to match the real starter-lock code made all of them disappear on the
next run — the harness gap is now fixed and documented in the script, not silently left in.

## Call-count summary for a normal First Sacrifice Scene 1 attempt

- **Expected case** (everything succeeds on its primary/first tier, no repair, no conditional edits
  needed): **15 physical requests** — matches this census's own clean runs exactly.
- **Absolute worst-case ceiling** (every tiered role exhausts every fallback, the one permitted
  planner repair fires, and all three conditional prose edits fire): **~41 physical requests** —
  excludes ANTAGONIST_BODY_BIBLE (structurally inert — no antagonist in this seed), the LI decalcify
  gates (unconfirmed, not counted either way), and SYNOPSIS/TITLE (confirmed unreachable).

## What is still open, honestly

1. **LI decalcify gates** (physical + behavioral) — never observed firing in any of 4 census rounds.
   Not yet distinguished between "genuinely conditional and not triggered by this synthetic state"
   and "the flow never reaches that exact call for LI." Same open question for PC's two decalcify
   gates, which the code calls unconditionally yet also never fired.
2. Two roles (VOCAB_BAN_PROSE_EDIT, INTIMACY_FAILSAFE_EDIT) are traced from source, not observed
   firing in this run — their max_tokens/temperature are read from code, not confirmed against a
   live fixture, since this run's clean prose never tripped either check.
3. The `_scene1_paid_v2.mjs` role-allowlist/blocking work from the prior sub-pass is now superseded
   by this manifest as the authoritative accounting — not deleted, but should not be relied on for
   future paid-run budgeting.

No paid or live-provider call was made in this pass. This manifest is the deliverable requested
before any decision on whether a single Scene 1 operation is an acceptable spend.
