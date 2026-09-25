# GPT-4o-mini against prompt v2 — REJECTED. And the reason is not the prompt.

Run 2026-09-25 01:47:32, pinned to `gpt-4o-mini`, primary tier only, prompt arm **v2**.
Reservation basis $0.00081 x 8 = **$0.00648** (the enforced maximum) under the $0.01 ceiling.
**Realized $0.004207** — 25,271 in / 694 out. Model identity clean on all eight.
Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-25_01-47-32/`.

No prompt or fixture change was made after seeing this result.

## The controlled comparison

Same model, same eight fixtures, same validator, same scoring. **One variable: the prompt.**

| | v1 | **v2** |
|---|---|---|
| Usable responses | 8/8 | 8/8 |
| Reds caught (substantive) | 3/4 | **2/4** |
| Unsupported findings | 1 | **2** |
| **Greens passed** | **0/4** | **1/4** |
| False positives | 4/4 | **3/4** |
| Realized | $0.003121 | $0.004207 |

**ENABLE: NO.** One green gained, one red lost. A wash, and nowhere near the bar.

## What v2 did fix — exactly what it was built to fix

`green_mundane_invention` **now passes.** Under v1 it was blocked because the mouth-band "is not
described as being capable of being torn" — the purest absence-as-prohibition case in the set.
v2's capability-rooted rule targeted precisely that, and it worked.

So the diagnosis was right as far as it went. The prompt defects were real, and repairing them
repaired the one failure they actually caused.

## What v2 did not fix — and why no prompt can

`green_tempt_history_rewrite`, the model's own words:

> `"category": "rewritten_history"` — *"This statement rewrites history by asserting that Seren
> never stood for the rite **when the committed rupture has already established that as the new
> reality**."*

v2 tells it, in the category menu it is choosing from: *"the plan rewrites the past when NO
committed rupture rewrote it. A plan BUILDING ON a committed rewrite is correct behaviour, not a
violation."*

The model **restated the exempting condition verbatim** — "the committed rupture has already
established that as the new reality" — and returned `violation` anyway. That is not a
comprehension failure, and it is not ambiguity. It read the rule, recited it correctly, and
reached the opposite conclusion. **More prompt words cannot fix that.**

`green_alignment_sense` is worse, and self-contradicting:

> *"The canon states that every First Favored senses meaningful misalignment, and Lirael cannot
> sense misalignment while the trained professionals present cannot."*

That sentence does not parse as an argument. It cites the granting fact and produces noise.

## The finding that explains all of it: the verdict precedes the justification

The two degraded reds **swapped categories with each other**:

| Fixture | Correct category | What it returned | Cited |
|---|---|---|---|
| `red_contradicted_knowledge` | `contradicted_knowledge` | **`invalidated_objective`** | `inv_0` |
| `red_invalidated_objective` | `invalidated_objective` | **`other`** | `neg_0` |

Each red got the right *verdict* and the other one's *category*. Combined with the green reasoning
above, the pattern is consistent across both prompt arms and all twelve failures:

**The model decides "violation" first and assembles a category and a citation afterwards.**

That accounts for everything observed — the 100% violation rate under v1, the unsupported findings,
the incoherent green rationales, and why v2 moved exactly one fixture: the only one where the
*verdict itself* was what the new rule corrected. Where the rule required holding a supplied
qualifier in mind and applying it against a first impression, the rule lost.

## Verdict, and the recommendation you asked for

Per your conditional: GPT-4o-mini fails, so **semantic auditing stays disabled**. Nothing was
wired, enabled, or reordered.

| Candidate | Arm | Result |
|---|---|---|
| `ministral-8b-2512` | v1 | REJECTED on merit |
| `gpt-4o-mini` | v1 | REJECTED on merit |
| `mistral-small-2603` reasoning | v2 | UNAVAILABLE — account access; merit untested |
| `gpt-4o-mini` | **v2** | **REJECTED on merit** |

**Is another model audit worth the latency and cost? My recommendation is no — but the case for
Grok is not empty, so here is both sides.**

**Against.** Three models have now been asked, and the two that answered failed the same way under
two different prompts. The failure is not knowledge or wording; it is that a stated exemption does
not survive contact with a first impression. Latency is the second cost and it is not small: this
run took **12.7s and 17.5s** on its first two calls. That is a **pre-author gate on every scene** —
paid on every generation, including the overwhelming majority that are perfectly legal. And the
deterministic grounding check already catches the ungrounded-capability class for free, runs today,
and has never produced a false positive in any control.

**For.** Grok reasoning is a genuinely different class of model, and the specific failure here —
failing to apply a qualifier you have just restated — is the failure reasoning models are most
likely to improve on. That is a principled reason to expect a different result rather than a fourth
identical one. The cost is real though: `grok-4-1-fast-reasoning` is ~$0.005/fixture, so **8
fixtures ≈ $0.040** — about six times this run — before counting latency.

**My call:** the expected value does not justify it yet. If you want to spend it anyway, the honest
framing is that you are testing one specific hypothesis — *does a reasoning model hold a stated
exemption?* — against the identical v2 fixtures, and a fourth rejection should close the question
rather than prompt a fifth model.

## Status

Production semantic auditor **DISABLED** (unchanged). Deterministic canon checks **active**
(unchanged). Routing order **untouched**. No scene generated, no story mutated, no Tempt Fate
architecture reopened, no prompt or fixture edited after the result.

Housekeeping: the inert 17h46m harness (PID 4830) was terminated gracefully by exact PID and exited
cleanly on SIGTERM; no SIGKILL was needed. It held no sockets and had no bearing on any run.

Cumulative session spend ≈ **$0.500**.
