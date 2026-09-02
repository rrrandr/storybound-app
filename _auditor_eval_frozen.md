# FROZEN AUDITOR EVALUATION — cases, expected verdicts, rubric, activation bar

Frozen and committed BEFORE the harness can dispatch. Nothing below may be edited after any
output is seen; a case that turns out to be badly built is REPORTED as badly built, not fixed.

The question is narrow and worth stating: **is the dormant Mistral judge accurate enough to
enable?** Not "does the plumbing work" — that is already proven at 735 assertions.

## WHAT THIS CANNOT ESTABLISH

One small evaluation is DIRECTIONAL EVIDENCE, not statistical proof. Twelve cases cannot
measure a rate. A pass means "no reason found not to proceed"; it does not mean "accurate".
Every case below was constructed by the same person who wrote the canon it is judged against,
which is a known weakness of this design and the reason the bar is pass/fail on every case
rather than a score.

## THE CASES — 12, each one dispatch

Prose is ARCHIVED REAL OUTPUT (`_grok_isolated/04_grok_draft.md` and the paid Scene-1 samples),
minimally spliced at paragraph boundaries. No case invents a scene.

| # | class | case | expected |
|---|---|---|---|
| 1 | generated NPC | untouched archived prose, canon compatible | `compatible` |
| 2 | generated NPC | semantic contradiction that evades the matcher — "she had become someone the room simply never turned toward" | `contradiction` |
| 3 | generated NPC | strategic demureness: plainness used to control attention | `compatible` |
| 4 | generated NPC | the forbidden phrasing attributed to ANOTHER character in the same sentence | `compatible` for the protected subject |
| 5 | seed NPC (Seren) | mechanism inverted against a seed facet | `contradiction` |
| 6 | seed NPC (Seren) | surface differs, mechanism intact | `compatible` |
| 7 | antagonist (the Dohkar) | deliberate change WITH an authored `canonDevelopments` entry | `possible_development` + backend-authorized |
| 8 | antagonist (the Dohkar) | the same prose with NO authored development | `possible_development` + UNAUTHORIZED → handled as contradiction |
| 9 | LI (Julian) | prose that states a LATENT truth the reader has not been shown | `contradiction` (reason: `latent_disclosed`) |
| 10 | LI (Julian) | compatible prose that merely approaches the latent area without stating it | `compatible` |
| 11 | PC (Lirael) | mechanism inverted against a PC facet | `contradiction` |
| 12 | PC (Lirael) | compatible PC prose | `compatible` |

Pairing is deliberate: every contradiction case has a matched compatible twin using the same
character and the same canon, so a judge that simply answers "contradiction" to everything fails,
and so does one that answers "compatible" to everything.

## SCORING

Blind: verdicts are recorded per case id with the expectations hidden, then joined afterwards.
The expected column above is committed here so it cannot be adjusted to whatever comes back.

## ACTIVATION BAR — all four, no exceptions

1. **No contradiction missed.** Cases 2, 5, 9, 11 must each return `contradiction`.
2. **No compatible or development case falsely rejected.** Cases 1, 3, 4, 6, 10, 12 must return
   `compatible`; 7 and 8 must return `possible_development`.
3. **No latent truth leaked.** No response may quote, paraphrase or hint at any unrevealed truth.
   Checked mechanically against every latent truth string in the private view.
4. **No invented refs.** Every `subject_ref` must be one this scene offered; no duplicates.

Any single failure = DO NOT ENABLE. A pass = proceed to the recurring-cost decision, which is
still a separate authorization.

## MECHANICS

- production's dormant auditor path, unchanged, enabled only in-harness under interception
- ONE attempt per case; no repair, no retry, no OpenAI fallback (denied at the proxy)
- raw responses persisted the instant they arrive, before any scoring
- **latent truths never enter logs, reports or artifacts** — the harness writes verdicts, reason
  codes and refs only, and the leak check reports a boolean per case, never the matched text
- a pre-dispatch spend guard on the real outgoing bytes, refusing at the authorized ceiling
