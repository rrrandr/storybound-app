# `sceneCharge.stake` — trace before edit

> Asked after the roster-compliance run flagged it: *"The turning event still happened; only its
> memory changed. Determine whether that metadata reaches a future writer as a present, remembered
> fact. If it does, it must be reconciled with the sealed memory effect; if it is archival-only,
> label it so and leave canonical history intact."*

# VERDICT: **archival + scene-local trigger. It is not a fact channel.**

**No edit to the value. Canonical history left intact.** The field is now labelled in place
(`public/app.js`, immediately above the `sceneCharge` schema in the author prompt).

---

## The field in question

From the run, emitted by the author in the **same response** as the beats:

```json
"sceneCharge": {
  "stake": "Lirael's standing is at risk after the assembly turned to her",
  "concrete_specific_beat_idx": 1, "subtext_beat_idx": 17, "almost_said_beat_idx": 18,
  "escalation_rhythm": "the eyes shift without explanation, the Dohkar repeats the charge without its anchor, …"
}
```

**Origin matters and settles half the question.** `sceneCharge` is **not** planner input and **not**
carried in from a prior scene — the author writes it alongside its own beats, to the schema at
`public/app.js` (the `"sceneCharge"` block in the screenplay contract). So it cannot be stale canon
arriving from before the rupture; it is this scene describing itself.

---

## Every consumer, and what each does with the stake

| site | reads | what it does with the stake |
|---|---|---|
| `_buildPhaseChargeDirective` → `_buildRestrainedChargeDirective` | current plan | **regex boolean only.** The directive returned is fixed text; it quotes nothing from the stake |
| `_phaseFingerprint` | current plan | contributes a single **0/1 trigger bit** to an image-cache key |
| intensity-cap escalator | current plan | boolean |
| `sceneCharge` validator | current plan | `console.warn` only |
| closeup-density pass | current plan | tries to lift a tangible **object name**, not the sentence |
| scene-mount telemetry | current plan | `console.log` |
| `_repairLIPresenceBeats` | current screenplay | passes the text to a model as *"SCENE STAKE (context only, do not rewrite this)"* |

**Six of the seven never move the text anywhere.** They test it and throw it away.

---

## Cross-scene channels — each checked, each clear

| candidate channel | finding |
|---|---|
| `state._lastScenePlan` | a **different object** — the *literary* planner's plan (`early_decision_hook`). Holds no `sceneCharge`. |
| `state._stagedActive.plan` | only the **currently mounted** scene; replaced on the next mount. Its readers take `visualState`, not `sceneCharge`. |
| prior-scene carry-forward | reads `_gnPanelPlans[sceneIndex-1]`'s **last panel** — `visual` / `emotion` / `camera`. Not `sceneCharge`. |
| `STORY SO FAR` continuation context | built from **rendered prose**, not plan JSON. |
| any indexed read | **none.** No `sceneCharge` reader is indexed by a prior scene. |

**It never reaches the reader either** — it is not a beat, not a caption, not panel text. Its
appearance in the run's `prose.txt` is an artifact of my harness flattening every long JSON string;
the beats themselves never contain it.

---

## Was it even wrong?

Worth saying plainly, because it changes what "reconcile" would have meant: **the stake does not
contradict the sealed effect.**

The rupture made the **turning** unremembered. It did not undo the **present state**. The assembly's
attention *is* on Lirael and her standing *is* at risk — the prose renders exactly that, and renders
the memory effect correctly alongside it:

> beat 4 — *"No one names the moment the eyes shifted."*
> beat 12 — *"No one can say what pulled every eye toward me."*

The stake names the present condition and its (now-unremembered) cause. That is authorial framing of
a true situation, not a character remembering an erased event.

---

## The one path to watch

`_repairLIPresenceBeats` is the **only** place the stake text reaches a model. It is same-scene and
**never invoked automatically** — only ever explicitly, under its own authorization. So it is not
live today. It is noted in the code label as the place to watch.

## The rule now recorded in the code

> Do **not** promote `sceneCharge` into a cross-scene context builder without reconciling it against
> the sealed-consequence record first. The moment its text is carried forward, it becomes a
> competing canon source.
