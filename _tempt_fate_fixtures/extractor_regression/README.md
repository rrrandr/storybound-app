# Extractor regression fixtures — three retained live responses

Real responses from three authorized runs, kept as dry fixtures. Each documents a DIFFERENT failure
layer, and the third documents a gap the validator does not close.

| # | Source run | Shape | Validator outcome |
|---|---|---|---|
| 01 | `daefe5aa` / `extractor_only_2026-09-24_08-00-42` | truncated at max_tokens 1400, markdown-fenced, no citations | unparseable → refused |
| 02 | `extractor_only_2026-09-26_23-42-18` | parses, complete, **no citations**, `knowledgeStates[2].state='retained'` (a disposition value) | refused |
| 03 | `extractor_only_2026-09-27_01-35-36` | parses, complete, **all four citations verbatim**, every state valid | **ACCEPTED** — yet semantically ungrounded |
| 04 | `extractor_only_2026-09-27_02-52-51` | parses; Julian **`forgot`** from the SAME gaze quote that produced `retained` in 03; Seren's quote **stitched from two fragments** | refused on the stitched quote — but only by luck of that one flaw |

**Fixture 03 is the important one.** Julian is marked `retained` / `memoryAbsent:false` citing *"Julian
has not moved, yet his gaze finds mine across the clearing."* — a gaze establishes neither memory nor
suspicion. Seren is marked `retained` citing *"We were to begin the rite."* — an INTENDED rite, not
recollection of one that occurred. The assembly's quote supports forgetting *the accusation*, narrower
than the claim made. **`scopeMatch: narrower` therefore rests on exceptions the prose does not
establish.**

So: verbatim-quote validation proves the quote EXISTS in the prose. It does not prove the quote SUPPORTS
the claim. 03 passes every mechanical check and is still wrong.


## THE DECISIVE PAIR: 03 vs 04

Same prose. Same model. Same quote. **Opposite conclusions, both asserted with full confidence:**

| | 03 (`01-35-36`) | 04 (`02-52-51`) |
|---|---|---|
| Julian's disposition | **`retained`**, `memoryAbsent: false` | **`forgot`**, `memoryAbsent: true` |
| Julian's evidenceQuote | *"Julian has not moved, yet his gaze finds mine across the clearing."* | *the identical line* |
| `unaccountedParties` | `[]` | `[]` |
| `scopeMatch` | `narrower` | `narrower` |

04 ran with the grounding rules IN the prompt — the quote must establish the specific claim, memory may
not be inferred from gaze/silence/stillness/composure/presence, and unestablished parties belong in
`unaccountedParties`. **It used the gaze anyway, in the opposite direction, and left `unaccountedParties`
empty.** Its `scopeNote` even names an unestablished element while still labelling the comparison
`narrower` rather than `undetermined`.

04 was refused only because Seren's quote stitched two fragments. **Had that one flaw been absent, this
output would have committed an invented certainty about Julian — in the opposite direction from 03.**

**Conclusion recorded: Ministral prompt tuning for this role is CLOSED.** Three bounded corrections each
did what they were scoped to do (citations appear, schema values are valid, uncertainty is representable)
and none moved this model's willingness to assert unsupported conclusions. The citation gate catches
malformed quotes, not invented inferences.
