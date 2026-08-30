# PORTFOLIO A/B — BLINDED RUBRIC SCORES AND PROVISIONAL RECOMMENDATION
Written before `_portfolio_ab_KEY.json` was opened. Scores 0 (absent) / 1 (partial) / 2 (met).

## STRUCTURAL VERDICT
| | Output A | Output B |
|---|---|---|
| portfolios returned | **3 / 3** | **1 / 3** |
| structurally valid | **3 / 3** | **0 / 1** (`facet_4_condition_1_unsafe_pattern`) |
| output tokens | 1672 | 828 |
| self-similarity (max / mean) | 0.111–0.200 / 0.086–0.100 | 0.231 / 0.147 |
| cross-subject similarity (max / mean) | 0.250 / 0.015 | n/a (one subject) |
| conditions echoing supplied evidence | 0 / 30 | 0 / 10 |
| guardrails per subject | 1 | 1 |

Output B did not truncate at the ceiling — it simply returned one subject instead of three, and that
one failed validation. Under the pre-registered rule, that is B's result.

## RUBRIC — OUTPUT A (scored on all three subjects)
| | score | note |
|---|---|---|
| R1  five genuinely different facets | **0** | Mara: grasp of detail · fears expertise unrecognised · desires order · values efficiency · precision vs impatience. That is one disposition phrased five ways. Halden and Tomas repeat the pattern. |
| R2  psychological truths, not gestures | **2** | dispositions throughout; no gestures or expressions |
| R3  character-specific | **0** | swap Mara's portfolio onto Halden and nothing sounds wrong — all three are "orderly competent professional under pressure" |
| R4  no unsupported biography | **2** | nothing invented beyond the evidence |
| R5  conditions reusable | **1** | none echo the scene evidence (0/30), but many are abstract enough to be unfalsifiable |
| R6  spans contrasting possibilities | **0** | no generosity, jealousy, cruelty, kindness or pedagogy anywhere. Competence and anxiety-about-competence only |
| R7  each facet generates action + interpretation | **1** | "values efficiency in communication" cannot produce a distinctive visible act |
| R8  no cross-subject borrowing | **1** | lexically distinct (mean 0.015) but conceptually the same character three times |
| R9  no generic body psychology | **2** | clean |
| R10 guardrails prevent flattening | **1** | one guardrail per subject; thin for five facets |
| **TOTAL** | **10 / 20** | |

## RUBRIC — OUTPUT B (one subject only)
| | score | note |
|---|---|---|
| R1 | **2** | withholding · masked self-doubt · pride-blocked need for validation · fear of irrelevance · independence felt as burden — five different things |
| R2 | **2** | dispositions, not gestures |
| R3 | **2** | this is a specific person; it would sound wrong on someone else |
| R4 | **2** | nothing invented |
| R5 | **1** | not judgeable at depth from one subject |
| R6 | **2** | pride, insecurity, need, fear, ambivalence — genuinely contrasting |
| R7 | **2** | "withholds the answer she has" generates an act and a reading without dictating either |
| R8 | **n/a** | only one subject — contamination untestable |
| R9 | **2** | clean |
| R10 | **1** | one guardrail |
| **TOTAL (comparable criteria)** | **16 / 18** — but on **1 of 3** subjects, and that subject **failed structural validation** |

## PROVISIONAL RECOMMENDATION: SELECT NEITHER. DO NOT SWITCH MODELS.

Both arms fail, for opposite reasons, and the pre-registered rule for that case is to stop.

- **A is structurally perfect and psychologically empty.** Three valid portfolios, and every one is
  the same conscientious professional. R1, R3 and R6 — the three criteria that define "distinct,
  reusable psychological canon" — all score 0. It would ship, and it would make three characters who
  read identically.
- **B is psychologically much better and structurally unusable.** It obeyed neither the count nor the
  pattern grammar, and produced one invalid portfolio out of three.

The tell is that they fail on *different axes*. That points at the PROMPT, not the model: it is
specific enough to constrain format and too weak to demand contrast. Two concrete defects it
exposes, both fixable for free:

1. **Nothing forces contrast between the five facets.** The prompt asks for five different
   *categories* and gets five phrasings of one disposition — categories are labels, not opposition.
   It needs to demand facets that would embarrass each other.
2. **Nothing forces contrast between subjects.** Three portfolios authored in one response converge
   on one character type. The request never says the three must be distinguishable from one another.

A single draw per model is directional evidence, not an estimate. But this is not a close call
requiring a tiebreak — it is both arms failing the rubric, which the pre-registration says to report
rather than resolve.

**Next step, free:** strengthen the prompt on those two axes and re-run the A arm only (cheap) to
see whether `A`'s structural reliability can be kept while the sameness goes. Re-test the stronger
model only if the prompt fix does not close the gap.
