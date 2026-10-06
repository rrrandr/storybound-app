# Live run report — 2026-10-06

Authorized: explicit go, **existing cumulative $1.50 ceiling**. Nothing fixed; reporting as found.
Artefacts: `_fs_live_out/run_2026-10-06T01-17-51-250Z/` (requests and responses under `wire/`,
plus `calls.json`, `cards.json`, `console.log`, `after_oas.json`, `scene_ledger.json`).

---

## Outcome: the run stopped at the OAS handoff. No scenes were generated.

```
turns 9 · resolved=false · archive=0 · interruptionSubmitted=false
*** STOPPING BEFORE SCENE GENERATION — OAS handoff incomplete
    No further call will be labelled "scene 2".
scene ledger: scene 2  NOT accepted  <- opening branch "run"
```

**The cause is in the replies themselves: `scene_state` was `"continue"` on all ten.** Never
`resolve`. The authored Dohkar interruption mounts only inside the resolve path, so it never
mounted, the run-or-remain decision never appeared, and Scene 2 was never triggered.

Two things compound it, both of them consequences of earlier decisions rather than new bugs:

- the exit ramps at beats 6/13/17 are **suppressed** for this encounter (the afterglow fix), so the
  early exit that would have ended the OAS is deliberately gone;
- the runner's own OAS budget is **9 turns**, while the app's soft cap is 17 and hard cap 20. So the
  run ended before the app's own caps could force a resolution.

**It did not hit the ceiling.** It stopped on the handoff, with **$0.587 still available**.

---

## Cost

| | |
|---|---|
| This run | **$0.335911** ($0.328844 receipted over 11 calls + $0.007067 retained estimate over 9 receiptless) |
| Cumulative exposure | **$0.9126265 of $1.50** |
| **Remaining** | **$0.5873735** |
| Cached input | **217,728 of 426,865 tokens — 51.0%** |

20 calls: OAS 11 · OAS line-edit 5 · verifier/audit 3 · previews 1. Setup added **nothing** (bibles
already persisted), exactly as predicted.

**Per-turn OAS cost is the headline.** The Grok author calls ran **$0.060, $0.061, $0.026, $0.026,
$0.021** on ~46,000-token prompts — roughly **$0.02–0.06 per OAS reply**, nine turns ≈ $0.33. Roman's
expectation was "no way should cost more than a fraction of a cent per reply". Caching at 51% helped
(it was 0–10% before) and the prompt is still ~46k tokens per turn.

---

## Writing: Julian is going in circles, and the repairs did not fix it

Roman asked earlier whether the repetition was "prosecutorial style" or the model circling. This is a
fresh live run with every repair in place, and it is measured, not impressionistic:

```
turns  3 &  4 : 84.0% of the shorter reply's 6-word sequences are shared
turns  8 &  9 : 58.1%
turns  9 & 10 : 29.0%
```

Structural reuse across the ten replies:

| pattern | count |
|---|---|
| opens "Your/You <verb> … when the rite faltered / the wish twisted" | **6 of 10** |
| contains "Did you (call / summon / draw) me …?" | **7 of 10** |
| reuses one of five fixed images (thread you wove / hunger already / rite faltered / wish twisted / circle's edge) | **6 of 10** |
| "DO" field is his hand or fingers | **7 of 10** — 4 of them "on/over/against mine" |

Turns 3 and 4 are near-duplicates:

> *"You turned your **gaze** to me when the wish twisted, Lirael, your attention a thread you wove
> without knowing. Did you call for my rescue when you shaped Seren's desire?"*
> *"You turned your **eyes** to me when the wish twisted, Lirael, your attention a thread you wove
> without knowing. Did you call for my rescue when you shaped Seren's desire…"*

Mean pairwise 6-gram overlap is only 5.0%, which **understates** the problem: two short replies
("Speak it then…") dilute it. The defect is the **sentence template**, not literal n-grams — the same
shape with synonyms swapped.

**Continuity is sound within that template.** Julian stays on one line of questioning (did Lirael's
attention summon him while she shaped Seren's wish), he is consistently before the assembly, and The
Answer stays in play. He never resolves or concedes — which is both the writing problem and the
mechanical one.

---

## Provenance, labelled as required

| turn | verdict |
|---|---|
| 1 | **`template-fallback`** |
| 2–9 | **`matched-cache`** — "the complete pair is identical to the app's cached preview for this card, but no reply served in THIS run matches it" |

**Turn 1 submitted the card's own title as the player's words:** `SAY "Confession…"` /
`DO "Confession…"`. The reader's first live turn sent a placeholder to the author. That is the
preview-readiness race, confirmed live rather than inferred — and the runner's readiness wait did
not prevent it.

No turn reached `matched-response`: the only preview call in the run was call 3, and nothing it
returned matched a submitted pair. So **OAS suggestion provenance is unestablished for all nine
turns**, carried forward as the stated limitation.

---

## The two limitations, carried forward

- **OAS provenance is partly unknown** — here, entirely unknown, and worse than the fixture run.
- **Ten scenes would not have proven the production issue boundary.** Moot this time: no scenes were
  generated. `_isLastSceneOfIssue()` remains broken for baked openings, unapplied.

---

## Nothing fixed

Per instruction, no repair has been attempted. The three candidates the run exposes, for Roman to
rank:

1. **The OAS never signals `resolve`** — so the authored interruption is unreachable live. This is
   the blocker.
2. **Repetition in Julian's replies** — a reused sentence template, 84% overlap at worst.
3. **Turn 1 submits the card title** — the placeholder race, now confirmed live.
