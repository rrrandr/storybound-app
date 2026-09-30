# VERDICT — repair-only live test, genuine cost fault

> One author-revision call against saved rejected prose. No new generation. 5 other requests
> aborted. Source: `fsc_c4_2026-09-29T22-50-35`, beat 23.

# RECOVERY FROM A REAL MODEL FAULT — **PROVEN**

| | |
|---|---|
| estimate | $0.003398 |
| **measured** | **$0.001393** (610 in / 17 out) |
| ceiling | $0.020000 — used **7%** |
| calls | **1** repair, 5 aborted |

---

## The fault was genuine

The live gate rejected the saved plan with **exactly one** fault, and handed the writer **exactly
one** beat:

> `C3/unsourced_cost` — beat 23: *"Either path will cost standing."*

This was the model's **own invention**, produced after the seed's `exitState` cost clause had already
been suppressed by the reconciliation pass. Nothing in the payload asked for it. That is what made
it the right candidate: the other two cost-only runs echoed a seed clause that no longer reaches the
writer, so repairing them would have tested a fault whose cause was already gone.

## The repair

> was — *"Either path will **cost** standing."*
> now — *"Either path will **risk** standing."*

**The repaired plan passes the same full gate: `accepted: true`, all four criteria.**

### Is a one-word change a real fix, or an evasion?

It is a real fix, and the guidance is why. The repair brief told the writer, in plain language:

> *"Nothing is owed and no price is coming. Remove any sense that this will be paid for, by her or by
> anyone, now or later. **Her standing can be at risk without being a payment.**"*

The writer did exactly that — kept the active-canon fact (`twist.assembly_turned`: her standing is
at risk) and removed the payment framing. The brief also asked for *"the SMALLEST change that fixes
the problem"*, so a minimal edit is compliance, not evasion.

> **Worth watching, not scored:** a synonym swap is a thin margin. It clears the detector and it
> satisfies the canon, but it does so by the narrowest possible route. If future repairs cluster on
> single-word substitutions that survive the scanner while preserving the original shape, the
> guidance may need to ask for the sentence to be rebuilt rather than adjusted.

---

## What this run proves

| | |
|---|---|
| a genuine violation is detected | one fault, correctly localised to one beat |
| the writer receives only what it should | approved brief + the failing line + plain guidance |
| the model authors the replacement | no local prose edit exists anywhere in the path |
| the splice is beat-bounded | beat 23 replaced; the saved plan not mutated in place |
| the gate re-checks the repair | same full gate, `accepted: true` |
| exactly one upstream attempt | 1 call — the `_noFallback` fix held |
| the cost is trivial | $0.001393 to recover a scene that cost $0.084 to generate |
| measurement only | `{recovery:'author_revision', codes:['unsourced_cost'], repairedIdx:[23]}` |

**This is the first end-to-end proof of recovery from a real model fault.** The earlier chain run
proved the mechanics but repaired a false positive; this repaired something genuinely wrong and the
result stands up to the gate.

## What it does not prove

**Recovery inside a live generation.** This fed a saved plan to the revision path directly, which is
what the production caller does with a rejected plan — but the outer flow (rejection → revision →
continue, or → resumable) is proven statically, not live.

**That a repair always succeeds.** One fault, one beat, one attempt. A scene with a structural fault
(C4 resolving past the choice) has no single line to replace, and the recovery path would correctly
fall through to the resumable state.

**Measured spend to date: ~$0.8144.** No further paid run without fresh authorization.
