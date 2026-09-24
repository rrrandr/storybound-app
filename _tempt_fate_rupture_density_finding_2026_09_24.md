# Why was the rupture scene 867 chars / 18 beats and romantically cold?

Dry investigation, 2026-09-24. No paid calls. Evidence:
`_tempt_fate_rupture_prompt_density_diagnostic.mjs` (browser, all providers stubbed, zero
dispatches) and `_rupture_output_budget_probe.mjs` (offline, reads retained paid artifacts only).

## Verdict: the precedence fix is EXONERATED. It discards nothing.

The hypothesis under test was that suppressing the scheduled event also stripped full-scene
density, relational pressure, dialogue, interiority and consequence requirements. It did not.

**The two real paid rupture prompts are structurally identical.**

| | pre-fix (2026-09-23) | post-fix (2026-09-24) |
|---|---|---|
| author prompt | 265,687 chars · **325 blocks** | 268,592 chars · **325 blocks** |
| blocks lost by the fix | — | **0** |
| blocks added by the fix | — | **0** |
| delivered | 38 beats · 2,264 ch prose | 18 beats · 796 ch prose |

Same 325 directive blocks before and after. The 1.1% size difference is text *within* shared
blocks — the scheduled-event framing changing, which is exactly what the fix was for.

**And rupture-vs-ordinary loses nothing either** (same scene, same stub, only the seal differs):

- **0** author blocks lost under rupture; **0** planner blocks lost.
- The rupture prompt is *larger*: 263,659 vs 236,446 chars, adding 42 Tempt-specific blocks.
- Layer-matched probe — every requirement present in ordinary, rupture, **and the real paid run**:
  dialogue ×7, interiority ×2, DRAMATIC STAKES ×1, BEAT DISTRIBUTION ×1, SCENE CHARGE ×3,
  EXPRESSION ARC ×2, intimacy ×3 (author layer); `li_pressure_actor` ×1, aftermath lane menu ×1
  (planner layer).

The paid run's own user prompt carried SCENE DENSITY in full, naming *"enough DIALOGUE and
INTERIORITY to carry it"*, aftermath, institutional process, plot direction, an explicit ban on
ending *"on suspended mood alone"*, and — verbatim — **"No word-count ceiling applies to this
scene — use the room a full scene actually needs."**

It also carried three separate, mutually reinforcing beat-count floors, including one written
specifically for this path:

> TARGET: 30-38 beats this scene. Tempt Fate is a force-multiplier moment; under-budgeting it
> produces a thin invocation followed by rushed plot. Take the room.

It delivered 18 beats and closed on *"The choice is mine to name or bury"* — a suspended mood.

## Where the output budget went

Of a 13,697-char response: **prose was 5.8%**.

| | chars | share |
|---|---|---|
| beats (total) | 7,300 | 53.3% |
| — of which beat **metadata** | 6,504 | 47.5% |
| — of which **prose** (`beat.text`) | **796** | **5.8%** |
| phases | 2,150 | 15.7% |
| visualState | 1,154 | 8.4% |
| temptFateOutcome | 908 | 6.6% |

Two things this rules out:

1. **Truncation.** The response was complete and well under the 8,000-token ceiling.
2. **The outcome report crowding out prose.** At 908 chars it is 6.6% of the response — roughly
   equal to *all* the prose, but not the dominant consumer. Per-beat metadata outweighs prose
   **8.2 : 1**. Worth noting anyway: the three fields added on 2026-09-24
   (`targetPopulation`, `invokerExemption`, `unaccountedParties`) make this section bigger, and it
   was already larger than the prose.

## What this leaves

The prompt asked for everything and got 5.8% prose. The cause is model-side, and the honest
position is that **n = 1 per side**: one pre-fix run at 38 beats, one post-fix run at 18. The
precedence fix cannot be blamed on prompt content — that is now measured, not assumed — but a
single post-fix run cannot exonerate it behaviourally either.

Ranked leads, none proven:

1. **Run-to-run compliance variance.** The same path produced 38 beats and 2,264 chars eight days
   earlier. Beat-count undershoot is already called out in the prompt as *"the #1 CG miss"*, which
   suggests this is a known failure mode of the author layer, not a rupture-specific one.
2. **Prompt length.** Rupture adds ~27k chars (+11.5%). The rupture-specific 30–38 beat target sits
   at line ~1571, competing with the general floors at ~363/384.
3. **Restraint vocabulary.** The 42 rupture-only blocks run 1 bounding word per 349 chars against
   1 per 451 for the base prompt — ~29% denser in ONLY/NEVER/DO NOT/LIMIT/PROHIBITION. A model told
   to be surgical about the miracle may generalise that restraint to the whole scene. Suggestive,
   weak.

## Recommended next experiment — NOT another Scene A under the same conditions

The missing measurement is a **baseline**, not another sample of the same cell. Two retained runs
are both rupture; there is no retained raw output from a successful *ordinary* continuation of this
scene, so "18 beats" has nothing to be abnormal against except one other rupture run.

The cheapest decisive spend is therefore **one paid ordinary continuation of the same scene**,
recording beats, `beat.text` chars, and chars/beat. If an ordinary continuation also lands near 18
beats, the problem is the author layer and has nothing to do with Tempt Fate. If it lands at 30+,
the rupture path is implicated and Scene A is worth re-running with a beat-count assertion.

Either way, **Scene B remains the wrong next purchase**: buying "does the story keep living with the
rupture?" on top of a Scene A whose density is unexplained would confound the two questions.
