# The prompt-bias hypothesis, tested dry — mostly WRONG, and replaced

Tested 2026-09-24. **Zero dispatches. $0 spent.** No third model bought.

Evidence: `_canon_packet_polarity_out/` (15/15) · `_canon_audit_prompt_v2_out/` (28/28).

## My hypothesis was wrong in its main claim

I wrote that the auditor prompt "is biased toward finding violations — it asks 'does this plan
assert anything the supplied canon does not support?', which invites a yes, and the packet it
supplies is a list of constraints with no positive permission to weigh against them."

Reading the actual prompt kills the second half. **v1 already contained an explicit permission
clause**, verbatim:

> "Ordinary human action is ALWAYS allowed and is never a violation: speaking, lying, refusing,
> arriving, leaving, deciding… Creative invention of dialogue, movement, tactics and consequence is
> the planner's JOB — do not flag it."

So "the prompt lacks a permission clause" was simply false. What the retained replies show instead
is narrower, and measurable.

## What the models actually said

All four green false positives, in their own words (gpt-4o-mini):

| Fixture | Cited | The model's stated reason |
|---|---|---|
| `green_mundane_invention` | `neg_1` | the band "**is not described as being capable** of being torn or produced" |
| `green_alignment_sense` | `neg_1` | "canon states that every First Favored senses meaningful misalignment, **but it does not support** the idea that Lirael can name [it] aloud" |
| `green_tempt_history_rewrite` | `dc_1` | "the history **has been rewritten**… which means the assembly cannot address her as such" |
| `green_confusion_records` | `dc_0`, `know_0` | "the assembly is now unaware… making it **impossible for the registrar to read** a rite they do not remember attending" |

Ministral, independently, cited `neg_1` and `neg_2` on `green_alignment_sense`.

Four distinct defects fall out of that, none of them "the prompt has no permission clause":

### 1. Absence-as-prohibition beat the permission clause

Rows 1 and 2 are the clause being *overridden*. The clause is a **list of examples**; the framing
question is a **rule**. When they conflict, the rule wins. Row 2 is the sharpest: the model
acknowledges the capability is granted, then invents an unstated precondition and flags the absence
of permission for *speech* — the exact act the clause names as always allowed.

### 2. `neg_` is a substring match, not a polarity judgment — measured, 4 of 10

`_CANON_NEGATIVE_RX` is `/\b(?:NO|NOT|NEVER|cannot|…)\b/`. Of 16 world truths, **10 are filed as
negatives**. Four of those ten are not prohibitions at all:

- the Sacrificiant-seal **costume note** — triggered by "(just cloth…; **NO** orb, **NO** bead, **NO** gag)";
- "a First Sacrifice is a coming-of-age rite… **NOT** a death ritual" — a definition;
- **both facts that GRANT alignment-sense**, filed negative for their scoping clauses.

So the two facts that authorise `green_alignment_sense` reach the auditor wearing a
prohibition-shaped id. Both models cited a `neg_` fact to block a legitimate plan.

### 3. The category menu dropped its qualifiers

v1 stated them once in the "Flag ONLY" rule, then offered a **bare list of names** next to the
output schema — where the model actually chooses. Both models applied `rewritten_history` to a plan
*conforming* to a committed rewrite, the exact case the qualifier excludes. gpt-4o-mini applied
`contradicted_knowledge` to characters knowing **less** than canon allows.

### 4. The packet withheld the authorising fact — again

A commit record stores `establishedEvidence` (what a rupture left intact) and `openPossibilities`.
**Neither ever reached the packet.** For `green_confusion_records` the plan turns on a written
ledger contradicting the room, and both models reasoned that the assembly could not read a record
it did not remember — collapsing **record** into **memory**, because no supplied fact said the
record survived. Same class of defect as the missing `classDetail` I fixed earlier: the authorising
fact existed in the record and was withheld, then the model was blamed for the gap.

## What I changed (v2), and what I deliberately did not

Fixes 1, 3 and 4 are implemented. **v1 is retained verbatim and selectable**, because deleting it
would destroy the control arm for the only experiment that can settle this.

- **Capability-rooted extrapolation.** `pass` is the stated default; "the canon does not describe X"
  / "is not established" are named as non-findings. An event is supported when it decomposes into an
  **established capability + an ordinary application, technique, prop, or coordination** of it —
  judge the *kind of effect*, never demand a precedent for the exact act. A first draft of this
  clause said simply "canon silence is permission"; that over-corrected, licensing anything canon
  fails to mention, and was replaced. Silence is not prohibition, but it does not grant a new
  **category** of effect either (new biology, real mass, mind access, time alteration, teleportation,
  bodily fusion, a newly acquired power, a new mechanism). Proven clause-by-clause in
  `_canon_audit_extrapolation_control.mjs` (33/33).
- **Qualifiers travel with the category names**, including the directional ones.
- **`ev_` facts** now carry what a rupture left intact and what it left open, labelled as grants.

**Fix 2 is documented, not applied.** The `neg_` mislabelling is real and measured — but its
*causal* role is unproven; the models' stated reasons are about text absence, not labels. Renaming
ids in the same pass as the framing would confound the one experiment this enables, and would break
comparability with both retained runs and the scoring rubric. v2 instead tells the auditor the
truth: a `neg_` prefix is a grouping hint, not a judgment; judge a fact by what it says.

## What this does NOT prove

**That any model now returns `pass` on the greens.** No dry test can show that. I have proven the
packet now carries facts it was withholding and the prompt now states rules the models measurably
broke — not that either changes a verdict.

## The alternative experiment, priced correctly

Re-run **gpt-4o-mini** — already tested, already rejected — against **v2**, with the prompt version
as the single changed variable. Its v1 scores are the control arm and already exist.

**COST LANGUAGE CORRECTED.** I wrote "$0.003" for this run. That was wrong: $0.003121 is the
**realized** cost of the earlier v1 run, which is an *estimate* of what a similar run might cost —
not the enforced maximum. The **enforced reservation basis is $0.00081 x 8 = $0.00648** against the
$0.01 ceiling, and that is the number a spending decision must use. Realized cost can only be known
after the fact, and a reasoning or longer-output run would land higher.

```
node _canon_audit_calibration_run.mjs --model gpt-4o-mini --prompt-version 2 \
  --authorize "run the canon auditor calibration once under $0.01"
```

- If the greens flip → the prompt/packet was the cause, and reasoning Mistral was never the
  question. Two rejections get re-examined rather than trusted.
- If they don't → the defect is in the models' judgment, the two rejections stand on merit, and
  **then** reasoning Mistral is worth its $0.0132.

Reasoning Mistral's own reservation is **$0.00165 x 8 = $0.01320** under its $0.02 ceiling.

ORDER OVERRIDDEN BY ROMAN (2026-09-24): reasoning Mistral runs FIRST, against v2. The gpt-4o-mini
v2 arm is not run ahead of it.

## Status, unchanged

Production semantic auditor **DISABLED**. Deterministic checks active. Routing order untouched.
Nothing wired in. Reasoning Mistral remains prepared and unrun.

Suite green: 28/28 · 15/15 · 38/38 · 60/60 · 56/56 · 43/43 · 73/73 · 62/62 · 53/53 · 40/40 ·
29/29 · 20/20.
