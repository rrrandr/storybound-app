# Submission guard, interruption routes, and a timing decision for approval — 2026-10-06

No paid dispatch, no fixture issue, no counter or charging change. The live run is preserved.
Controls: submission guard 23/23 · replay cap arm 10/10 · replay no-preview arm 5/5.

---

## 1. The submission guard, narrowed

**The defect Codex reproduced:** the first fix accepted *either* field as usable and then submitted
*both*, so `DO "I step back." / SAY "Confession…"` passed with a placeholder still in the payload.

The rule is now one shared module, `_oas_submission_guard.mjs`, used by **both** the live runner and
the replay — not two copies that can drift:

> **At least one field must be usable, and no non-empty field may be a placeholder.**
> An intentionally empty field stays allowed.

| case | verdict |
|---|---|
| `DO "I step back."` + `SAY "Confession…"` | **refused**, naming `SAY=` |
| `DO "Reversal…"` + valid SAY | **refused**, naming `DO=` |
| valid DO + empty SAY · empty DO + valid SAY | allowed |
| the SILENCE pair (`"I go still." / "mm"`) | allowed |
| both empty | refused |

**And a defect the timeout test exposed that I had missed.** With no preview served, the app
supplies a real fallback SAY but the DO field receives the literal string **`"{}"`** — an unparsed
JSON object — which my first gate happily passed. Degenerate values (`{}`, `[]`, `null`,
punctuation-only, anything with no letter or digit) are now rejected too. That was found by *running*
the timeout case, not by reading it.

**The replay no longer submits unconditionally.** It stops on timeout, exercising the same
predicate as the live runner:

```
*** BLOCKED at turn 1 — a non-empty field holds a placeholder or degenerate value (DO="{}")
    — it would be sent to the author as the reader's words ***
OAS author calls served: 1   (the opener only — none spent on a placeholder)
```

---

## 2. The live runner is still limited to nine turns

`_fs_live_sequence.mjs:752` — `for (let i = 0; i < 9 && !halted; i++)`. **Unchanged, deliberately.**
Only the separate replay reaches twenty, and it says so. A live rerun today would reproduce the
same nine-turn stop. I have not extended it and have not spent toward the cap.

## 3. Every route to the authored interruption, and which were available

| route | trigger | reader-controlled? | available in the live run? |
|---|---|---|---|
| `llmSaysResolve` | model says `resolve` at beat ≥ 6 | no | **no** — all ten replies said `continue` |
| `disengagedThreshold` | two model-classified `disengaged` signals | partly — the reader writes, the model classifies | **no** — all ten were neutral/positive |
| `user_pivot_end` — the **"Wrap up"** button | offered only when `boredomScore >= 2` (`app.js:205835`) | **yes, once offered** | **no** — boredom never reached 2 |
| exit ramp at beats 6/13/17 | ramp offer | yes | **suppressed by design** for this encounter |
| `hardCapHit` | `beatCount >= 20` | no — a safety cap | **yes** |

**So when Grok keeps saying `continue` and the reader stays engaged, the only route left is the
beat-20 safety cap.** Every reader-controlled route is gated behind disengagement or boredom — the
reader has no way to say *"this interrogation has gone on long enough"* while still engaged.

The hard-cap replay is evidence that **a fallback ending exists**. It is not evidence that twenty
exchanges is the approved opening design.

---

## 4. THE DECISION I NEED, not a change I have made

**Should First Sacrifice's opening require twenty exchanges before the Dohkar interrupts, when the
model keeps saying `continue`?**

This is encounter-specific — the package already declares `endsAt: 'oas_interrupt'`, so the story
says this exchange ends by interruption; what it does not say is *when*. Options, none implemented:

1. **An authored interrupt beat for this encounter** — the package names a beat (say 6–8) at which
   the Dohkar cuts in regardless of `scene_state`. Matches "an interrogation interrupted in public",
   and is the only option that makes the timing *authored* rather than emergent.
2. **Surface "Wrap up" for interrupt-ending encounters** without the boredom gate, so an engaged
   reader can choose to end it. Reader-controlled, but it makes the ending the reader's call rather
   than the story's.
3. **Lower the hard cap for this encounter only.** Smallest change; still a safety cap doing an
   authoring job.
4. **Leave it at twenty** and accept that a live opening runs twenty exchanges — roughly
   $0.02–0.06 per reply at the measured rate.

I recommend (1): the interruption is authored, so its timing should be too. But it changes what a
reader experiences in the showcase opening, so it is yours to approve.

---

## 5. Two corrections

**Repetition — the causal claims are withdrawn.** I said input duplication was "ruled out" as the
cause. That overstates it: different replies to identical inputs show input repetition is **not
sufficient** to explain the pattern, not that it contributes nothing — and the turn-1 placeholder
remains a possible contributing factor too. Feeding prior dialogue back is **normal conversational
memory**, not evidence that memory causes repetition; I am not removing prior replies from the
prompt, and I have added no anti-repetition instruction. What stands is the measurement: overlap was
84% / 58% / 29% between consecutive turns with different inputs, and 0% across the three pairs with
identical inputs. **The cause is not established.**

**Cost — the comparison is corrected.** The **$0.33 covered nine reader turns, not twenty.** And
nine generated scenes alone, at the old measured average of $0.09195 each, come to about
**$0.8275 — already above the remaining $0.5873735**, before any OAS, verifier or setup traffic.
"Thin margin" was wrong: on that average the scenes alone do not fit. Neither figure predicts the
next bill — the average is history, not a forecast — but the arithmetic runs the other way from how
I described it.
