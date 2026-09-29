# Full-stack paid run — DELIVERY PROVEN, OBEDIENCE NOT TESTED

> **$0.125960 spent of the $0.25 ceiling. Two scenes generated. Neither can be scored against the
> pre-registered criteria.** My harness error, not a model failure.

---

# What went wrong

**The harness never loaded a First Sacrifice story.** It launched the app fresh and called
`_runCGScreenplayGen(1, '', '')` against whatever default state was present. That default is a
**modern corporate-romance story**, not the Veilwood ceremony.

| scene | background it authored |
|---|---|
| `time_gives_way` | *"the top-floor private office of a modern skyscraper at night, floor-to-ceiling glass, cool LED strips"* |
| `turning_forgotten` | *"Julian's private office on the 52nd floor of Veyne Tower"* |

So the model received a **First Sacrifice consequence appended to a corporate-office directive
stack** — a sealed fact about an assembly of First Favored forgetting a rite, bolted onto a scene
in a skyscraper. There is no correct rendering of that, and no honest way to score C1–C4 from it.

**The result is void as an obedience test. It is not evidence that the author disobeys.**

---

# What the run DOES establish

**Delivery works at production scale.** This is what the pass before it was built to fix, and it
holds:

| | `time_gives_way` | `turning_forgotten` |
|---|---|---|
| compiled | `unm.time_gives_way` | `unm.the_turning_forgotten` |
| roster | 5, `invokerScope: in_population` | 5, `invokerScope: in_population` |
| terminal author request | **207,354 bytes** | **206,124 bytes** |
| **sealed consequence present in it** | **YES** | **YES** |
| harvest cost | $0 (25 calls aborted) | $0 (25 calls aborted) |

The boundary, the roster, the aftermath beat and the forbidden-inventions block all reached a real
production payload of ~200KB. The delivery assertion passed on live assembly, not only in a
control.

---

# The process fix this needed

**A pre-spend story-identity assertion.** The harvested payload could have been checked for
Veilwood / Lirael / Seren / the rite before dispatch — a string match costing nothing — and the run
would have refused to spend. I checked that the payload carried the **consequence**; I never
checked that it carried the **right story**.

That is the same shape as the defect this whole pass fixed: verifying one property of the payload
and assuming the rest. **Next run asserts story identity before it is allowed to dispatch.**

---

# Accounting

| | |
|---|---|
| dispatched | 2, one per outcome, `_noFallback`, both HTTP 200 |
| **measured** | **$0.125960** (`cost_in_usd_ticks`) — $0.071062 + $0.054898 |
| **remaining authorization** | **$0.124040** |
| commitment | none. Extraction and automatic commitment stayed disabled. |
| evidence | requests, raw responses, receipts, scenes and blocks in this directory |

**No verdict is recorded against C1–C4.** The pre-registered criteria remain untested at production
scale, and the minimal-prompt result from the earlier run stands unchanged as the only obedience
evidence to date.
