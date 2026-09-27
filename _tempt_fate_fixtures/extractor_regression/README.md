# Extractor regression fixtures — three retained live responses

Real responses from three authorized runs, kept as dry fixtures. Each documents a DIFFERENT failure
layer, and the third documents a gap the validator does not close.

| # | Source run | Shape | Validator outcome |
|---|---|---|---|
| 01 | `daefe5aa` / `extractor_only_2026-09-24_08-00-42` | truncated at max_tokens 1400, markdown-fenced, no citations | unparseable → refused |
| 02 | `extractor_only_2026-09-26_23-42-18` | parses, complete, **no citations**, `knowledgeStates[2].state='retained'` (a disposition value) | refused |
| 03 | `extractor_only_2026-09-27_01-35-36` | parses, complete, **all four citations verbatim**, every state valid | **ACCEPTED** — yet semantically ungrounded |

**Fixture 03 is the important one.** Julian is marked `retained` / `memoryAbsent:false` citing *"Julian
has not moved, yet his gaze finds mine across the clearing."* — a gaze establishes neither memory nor
suspicion. Seren is marked `retained` citing *"We were to begin the rite."* — an INTENDED rite, not
recollection of one that occurred. The assembly's quote supports forgetting *the accusation*, narrower
than the claim made. **`scopeMatch: narrower` therefore rests on exceptions the prose does not
establish.**

So: verbatim-quote validation proves the quote EXISTS in the prose. It does not prove the quote SUPPORTS
the claim. 03 passes every mechanical check and is still wrong.
