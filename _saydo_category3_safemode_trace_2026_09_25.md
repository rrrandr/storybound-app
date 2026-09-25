# Category 3 (sexually charged Say/Do) — the open question, resolved dry

The 2026-09-22 test plan left category 3 explicitly unresolved:

> *"Unresolved, neither verified nor inferred: whether CG's structured JSON beat output passes
> through `formatStory` at all before render, or has a separate render path with no equivalent
> filter. Resolve the `formatStory`-reaches-CG question dry (a source trace, not a paid call)
> before treating category 3 as covered or uncovered."*

**Answer: it does not. The Safe-Mode explicit filter is INERT for CG — which is First Sacrifice's
production route.** $0, no dispatches.

## The trace

`formatStory` (320765) carries the Safe-Mode render filter at **320841–320858**: when
`state.contentMode === 'safe'`, any paragraph matching `_explicitSignals`
(`thrust|moan|orgasm|climax|naked|nude|undress|strip|penetrat|arouse|erect|nipple|genital|groin|straddl`)
is replaced by a fade-to-black line, and subsequent explicit paragraphs are silently dropped.

Every caller of `formatStory` is a `StoryPagination.addPage` path — the **literary** renderer
(101883, 139783, 265874, 282812, 315890, 316007).

The CG/staged renderer is a different path entirely:

```
_displayText = beat.text          (221755)   ← raw model output
pEl.textContent = _displayText    (221808)   ← straight to the DOM
```

The typing variant writes the same string (221780, 221802). **Zero `formatStory` calls appear
anywhere in the 700-line staged render block (221200–221900)** — verified by count, not by eye.

An in-code comment at 33505 states the same thing from the other direction — *"CG has no page
record — staged mode skips the literary StoryPagination.addPage"* — but that comment was written
for a different purpose (UID minting), so it is corroboration, not the proof. The proof is the
render path above.

## What this means

| | Literary | CG / staged |
|---|---|---|
| Safe-Mode explicit fade at display | ✅ applies | ❌ **never runs** |

The filter's own comment says it exists to *"catch scenes generated in full mode but displayed
after switching to safe."* On CG, switching to Safe Mode **changes nothing about already-generated
prose**, and nothing about newly rendered beats either.

First Sacrifice is the CG/OAS book (`render_mode: 'staged_story_mode'`), so this is the live route,
not a hypothetical one.

**Scope limit, stated honestly:** this trace establishes that the *display-time* filter does not
run. It does NOT establish that CG output is unfiltered overall — `_sniffAndRouteExplicit` performs
model-routing, and generation-time directives may constrain content upstream. Those are separate
mechanisms I have not traced. The specific claim here is narrow and proven: **the Safe-Mode
display-time fade has no effect in CG.**

## The fix is a design decision, not an obvious patch

Extending the literary filter to CG looks like a two-line change. It is not, and I am not making it
unilaterally, because it collides with a standing rule of this codebase:

> `feedback_validators_never_write` — **a validator that can rewrite is a competing author.**

The Safe-Mode filter *rewrites displayed prose*: it substitutes a canned sentence and deletes
paragraphs. In literary that is a long-standing accepted trade. Porting it to CG would:

- **delete whole beats.** CG beats are structural units carrying `kind`, `speaker`, and beat ids
  the continuity ledger references. Dropping a beat at display time desynchronises what the reader
  saw from what the story believes happened — a failure literary prose does not have, because a
  paragraph is not a tracked entity.
- **fire on single words.** `strip`, `naked`, `erect` are ordinary English (*"strip the sash"*,
  *"the naked ledger"*). In a beat of 1–3 sentences, one false positive replaces the **entire
  beat**, where in literary it costs one paragraph of several.

Three options, in the order I'd rank them:

1. **Filter at generation, not display** — keep Safe Mode as a constraint the author obeys, and
   leave the rendered beat intact. Consistent with "validators never write", and with
   `feedback_constrain_generation_not_labels`. Needs a check on whether the CG author payload
   already carries a Safe-Mode directive.
2. **Beat-level fade that preserves the beat** — replace `beat.text` while keeping the beat, its
   id, kind and speaker. Contains the desync problem; keeps the false-positive problem.
3. **Port the literary filter as-is** — smallest diff, worst behaviour on both counts above.

## Status of category 3

| | |
|---|---|
| Open source question | **RESOLVED** — filter does not reach CG |
| Implemented | ❌ nothing for CG |
| Dry-proven | ❌ (this is a source trace, not a control) |
| Live-proven | ❌ |

The next step needs your call on which of the three options to pursue, because option 1 and option 3
are different products, not different implementations.
