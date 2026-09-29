import fs from 'fs';
const F = '_revision_outcomes_v3.md';
let s = fs.readFileSync(F, 'utf8');

const start = s.indexOf('# 4. Trace — `unm.time_gives_way` · ask-class `undo`');
const end   = s.indexOf('# 5. Trace — `unm.custody_severed` · ask-class `silence`');
if (start < 0 || end < 0) throw new Error('ANCHOR MISSING for section 4');

const NEW4 = `# 4. RESOLVED — \`unm.time_gives_way\` · ask-class \`undo\`

> **Sealed-choice decision: OPTION 2 (Roman, 2026-09-28).** A genuine new player choice, **with permission to
> choose differently.** That is what makes *"time gives way"* a real Fate power rather than bookkeeping or an
> unexplained alteration of Lirael's character. The old choice stays in RECORD as witnessed history; it no
> longer governs active canon. Option 1's authored replacement cause is **withdrawn.**

### \`requiresActive[]\`
\`interr.julian_questioned_lirael\` — there is no questioning to unmake if none governs.

### \`ceases[]\`
| atom | why it is named |
|---|---|
| \`interr.julian_questioned_lirael\` | the grant itself |
| \`interr.dohkar_interrupted\` | an interruption of a questioning that never happened is incoherent |
| \`interr.choice_arose\` | the juncture is reopened, so the prior arising no longer governs |
| **\`lirael.scene1_disposition\`** | **the active disposition ceases.** Named explicitly per the sealed-fact rule — never inferred from ceasing its cause. |

### \`establishes[]\`
| fact | text |
|---|---|
| \`interr.no_questioning_occurred\` | *Julian did not question Lirael before the assembly. No such questioning took place in active canon.* |
| \`interr.no_interruption_occurred\` | *The presiding Dohkar interrupted nothing.* |
| \`ceremony.replayed_unquestioned\` | *The rite played through a second time, and no questioning of the Sacrificiant's guide occurred in it.* |
| **\`lirael.choice_pending\`** | *A choice is required of Lirael and has not been made.* |

### \`lirael.choice_pending\` — the rules that make it safe

> **No prior value is copied, constrained, or silently inherited. The player may choose differently.**

- **Until the player chooses, active canon holds \`choice_pending\` and nothing else.** No author may infer
  **run, remain, shame, resolve, or motive** — not from the prior scene, not from tone, not from what the
  reader saw.
- **On choosing**, \`lirael.scene1_disposition\` is sealed anew, bound to the **replayed** scene's uid and its
  own choice record. The prior instance is historical only.
- **Future canon reads only the new choice**, once made.

### \`memoryEffects[]\` — stated, never defaulted
\`{ pc:lirael, interr.julian_questioned_lirael, not_retained }\` ·
\`{ pc:lirael, lirael.scene1_disposition, not_retained }\` ·
and the questioning \`not_retained\` across **\`population.scene_present\`**, expanded with **no invoker
filter** per D1.

**Lirael has no memory of the ceased interrogation or of the old choice.** Stated here because the rule is
that such memory exists only when an authored outcome **grants** it — silence means absence, and absence is
not a grant.

### RECORD and the Tempt scope key
**The reader keeps the old scene**, readable in the archive, marked as revised. Per the active-canon rule,
their memory of it never makes a ceased fact eligible.

**The replayed scene inherits the original Tempt scope key**, so the new choice **does not reopen Tempt Fate
for that causal moment.** A rewind buys a second decision, never a second Fate intervention.

### Invalidated while this revision governs
**\`mem.exact.julian_forgets_interrogation\`** — its target no longer governs, so it is ineligible and its
wording routes through the Fate-chosen path. Not deleted; unselectable.

### Explicitly unchanged
every \`twist.*\` · every \`auth.*\` · every \`answer.*\` · every \`review.*\`

### Open — not to be guessed
- **The new choice's value.** Pending is a state, not a placeholder for the old answer.
- Whether any First Favored's alignment sense registers the bend.
- What Julian does in a world where he never asked.
- Whether what passed between them exists at all now — the exact reading's \`intimacy_unwitnessed\` cost has
  no referent in the revised canon.

### New engine state, flagged not solved
\`choice_pending\` is **a state the engine has never had**: active canon asserting that a decision is owed and
refusing to supply one. Two questions follow and are **not** answered here — what happens if the player never
resolves it, and whether any scene may be authored at all while it stands. Owed with implementation.

---

`;

s = s.slice(0, start) + NEW4 + s.slice(end);
fs.writeFileSync(F, s);
console.log('section 4 resolved as Option 2');
