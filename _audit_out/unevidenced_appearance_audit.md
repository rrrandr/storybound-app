# THE SEVEN due_without_owned_evidence APPEARANCES — AUDIT

Each checked against what the seed ACTUALLY authors for that scene. The test is not "is this
character present" — presence was never the qualification — but "does the authored material
give this character an attributable ACT that a camera could record".

| # | scene | character | authored material | verdict |
|---|---|---|---|---|
| 1 | 1  | Julian (IN_PERSON) | beats (A)–(F) name the Dohkar, Seren, the assembly, an omen, Lirael. **Julian appears in none of them.** | **no fact** — present, given nothing to do |
| 2 | 2  | Julian (IN_PERSON) | beat **(D) "Julian challenges Lirael — testing, not hostile"**, stated unconditionally | **FACT AUTHORED** |
| 3 | 2  | the presiding Dohkar | beat (C) is "a witness reacts" — deliberately unnamed | **no fact** — naming him would be choosing for the author |
| 4 | 3  | Julian (IN_PERSON) | beat (C) "Julian's position shifts — a constraint, a knowledge, **or** a limit" | **no fact** — a menu of three, not an act. Picking one is inventing behaviour |
| 5 | 3  | the presiding Dohkar | not named in any beat | **no fact** |
| 6 | 9  | Julian (RECALLED) | "She begins suspecting Julian"; requiredTruth "Julian is still innocent in the reader's eyes" | **no fact** — the material describes HER suspicion. He performs no remembered act |
| 7 | 14 | Julian (IN_PERSON) | "The investigation closes in on Julian" — he is the OBJECT; the Chayr acts, already authored | **no fact** — he is a target, and a target does not ground |

## Result: 1 of 7

Six of the seven are present with nothing authored for them to do. Adding facts there would
require inventing behaviour, choosing between alternatives the author deliberately left open, or
inferring an act from a name — the three things this contract exists to prevent. A scene where a
character stands in the room and does nothing attributable is a scene where C+ correctly skips
them, and manufacturing coverage would make the number better and the story worse.

## Branch-dependence

Scene 2 is player-shaped, but beat (D) is stated UNCONDITIONALLY — only beat (A) is written with
"if she moved / if she held". So the Julian fact is branch-independent and needs no branch key.
Nothing here required `eventFactsByBranch`; when a genuinely branch-dependent fact is wanted it
must be keyed to a finalized choice id, never merged across mutually exclusive branches.
