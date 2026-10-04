# CG register — three versions of one real passage

Provider-free. Passage taken verbatim from Scene 2 of the Issue 1 reading copy.
Version 3 is **hand-written by me as an editorial example** — it is NOT model output and is not
evidence of what the author would produce.

---

## 1. CURRENT OUTPUT (verbatim from the PDF)

> The Dohkar's voice rises over the crimson grass.
>
> THE PRESIDING DOHKAR "Lirael's conduct will now be subject to a preliminary review before the assembly."
>
> The words settle like a net.
>
> I keep my head down, the torn band hanging at my throat.
>
> The assembly watches.
>
> Julian has not moved from the edge.
>
> The Dohkar turns toward the gathering.
>
> THE PRESIDING DOHKAR "The rite and the ruling on the Sacrificiant's conduct are mine."

Eight blocks. Each reports one movement. Nothing connects them, nobody interprets anything, and
Lirael's voice is absent from her own point of view.

---

## 2. THE SAME WORDS, PARAGRAPHED ON NATURAL BOUNDARIES

Not a beat counter: breaks fall where focus, speaker or emphasis actually changes, and dialogue
sits with its speaker's action.

> The Dohkar's voice rises over the crimson grass. "Lirael's conduct will now be subject to a
> preliminary review before the assembly."
>
> The words settle like a net. I keep my head down, the torn band hanging at my throat. The
> assembly watches.
>
> Julian has not moved from the edge.
>
> The Dohkar turns toward the gathering. "The rite and the ruling on the Sacrificiant's conduct
> are mine."

Better to read — and THIS IS THE POINT: it is still a list of movements. Layout recovered the
rhythm and recovered nothing else. No amount of regrouping adds perception, interpretation or
voice, because none was written. That is why "group every 2–4 beats" was the wrong answer.

---

## 3. THE INTENDED REGISTER (editorial example, written by me — not generated)

Same events, same staging, same four beats of visual timing. What is added is what Scene 1 has
and Scene 2 lacks: perception, interpretation, and the PC's voice.

> The Dohkar's voice carries over the crimson grass, pitched for the assembly rather than for me.
> "Lirael's conduct will now be subject to a preliminary review before the assembly." He does not
> look at me while he says it, and that is the part that stings — not the ruling, but how little
> of his attention it costs him.
>
> The words settle like a net. I keep my head down and let the torn band hang at my throat where
> everyone can see it, because covering it now would be its own kind of confession.
>
> Julian has not moved from the edge.
>
> The Dohkar turns to the gathering, hands open, generous. "The rite and the ruling on the
> Sacrificiant's conduct are mine." Generous is how he always sounds when he is taking something.

Note what did NOT change: four visual units, the same staging, the same dialogue, one deliberate
one-line paragraph for impact. A short sentence still lands ("The words settle like a net.") —
it is just no longer the only move available.

Each of those paragraphs is still ONE SUSTAINED MOMENT, which is what a beat is supposed to be.
They are 2–4 sentences, not 1–2.

---

## What the three concerns actually are

| concern | where it lives | what the PDF shows |
|---|---|---|
| what the author writes | the CG beat contract, app.js:231814 TEXT RULES | **this is the problem** |
| how prose is segmented for visual timing | `plan.beats` — drives phase images, expression targets, closeups | working as intended |
| how segments reach the reader | TWO different surfaces, see below | not the problem |

**The reader surface is not one thing, and this matters more than the paragraph question:**

* **Staged (in-app):** `app.js:226198` — "Replace the text node entirely". The reader sees ONE
  BEAT AT A TIME, faded in and replaced, paged with the next-page control. Beats NEVER
  accumulate into paragraphs on screen. Paragraph grouping would change nothing here.
* **Plain-text projection (`_sbProjectFromBeats`, app.js:326187):** joins beats with `\n\n`. This
  is the reading copy / export — the PDF. It also builds `_sbTextHash(text)` and the attribution
  sidecar's `start`/`end` character offsets, which are computed FROM the separator length
  (app.js:326209-326213). Changing the separator shifts every offset and the hash. It is not
  cosmetic, and I was wrong to call it a rendering decision.

So the register break you read is an AUTHORING difference, surfaced by the export. Scene 1 is
hand-authored literary prose; Scenes 2+ are generated under a contract that forbids the thing
Scene 1 does.

---

## Smallest changes the comparison supports

**Author contract (the real fix).** app.js:231818 currently reads:

> `1–2 sentences per beat — HARD, no exceptions. NEVER 3+. A beat is ONE sustained moment
> (a glance, a line, a noticed detail, a breath), never a paragraph`

The sentence cap is what produces version 1. The smallest change that permits version 3:

* narration/exposition beats: **2–4 sentences**, still ONE sustained moment;
* each narration beat should carry at least one of perception, interpretation or judgement —
  not only what moved;
* dialogue beats may carry the speaker's action in the same beat, instead of the line floating
  alone;
* keep the existing rule that the FINAL beat is exactly one sentence;
* keep occasional one-sentence beats deliberately, for impact.

Nothing above changes beat COUNT, so the ~5 phase images, `expression_target`, `cut_to_closeup`
and `pc_proxy_action` mappings are untouched: one sustained moment still has one expression.

**Presentation.** No change recommended yet. The staged reader shows one beat at a time, so
paragraphing is an export-only question, and the projection carries hashes and attribution
offsets that must be re-verified before anything touches its separator.

**Scene 1.** Unchanged. It is the reference, not the outlier to be cut down.

**OAS.** Unchanged and deliberately brisk — responsive banter with a short beat beneath, then a
return to the scene register. It is a different instrument and should stay one.

---

## Retraction

My earlier "ACOTAR: median 30–40 words, 25–30% one-sentence paragraphs" was INVENTED. I measured
your PDF; I did not measure ACOTAR, and I presented fabricated figures beside real ones in the
same table. The craft description — developed paragraphs of action, sensory detail and interior
thought, alternating with short paragraphs for emphasis — stands on reading. The numbers do not,
and must not become design targets.
