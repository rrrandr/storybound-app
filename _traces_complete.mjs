import fs from 'fs';
const F = '_revision_outcomes_v3.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

// --- custody_severed: requiresActive + invalidation, under the new rule ------------------
sub(`# 5. Trace — \`unm.custody_severed\` · ask-class \`silence\`

### \`ceases[]\``,
`# 5. Trace — \`unm.custody_severed\` · ask-class \`silence\`

### \`requiresActive[]\`
\`answer.owned_by_institution\` — a claim that does not govern cannot be severed.

### \`ceases[]\``);

sub(`### Open
- Who reaches for it first.
- Whether the Institution disputes a vacancy it cannot remember conceding.`,
`### Invalidated while this revision governs
**\`mem.exact.institution_forgets_custody\`** — it makes every party present forget *that the Answer was ever
the Institution's*. Once ownership no longer governs, **there is no active fact to forget**, so the reading is
ineligible and its wording routes through the Fate-chosen path.

**The same pattern for the third time**, now with a rule that covers it: \`seren_forgets_price\` (not yet
active), \`julian_forgets_interrogation\` (no longer active), and this one. **Three of the six exact readings
are conditional on active canon** — which means the exact set was never as static as it was drafted, and the
remaining-nine pass must declare \`requiresActive[]\` for each.

### Sealed fact
**\`lirael.scene1_disposition\` — UNCHANGED.** Listed explicitly; this outcome touches no timeline.

### Open
- Who reaches for it first.
- Whether the Institution disputes a vacancy it cannot remember conceding.`);

// --- standing_dissolved: requiresActive + invalidation (none) ---------------------------
sub(`# 6. Trace — \`unm.standing_dissolved\` · ask-class \`authority\`

### \`ceases[]\``,
`# 6. Trace — \`unm.standing_dissolved\` · ask-class \`authority\`

### \`requiresActive[]\`
\`auth.julian_claims_convene_preside\` — a claim he has not made cannot be voided.

### \`ceases[]\``);

sub(`### \`memoryEffects[]\`
**None.** Per D2 the grant names a role and a proposition and does not reach his mind — his feelings,
intentions, knowledge and next actions are untouched.`,
`### Invalidated while this revision governs
**None** — and the near miss is worth recording. \`mem.exact.dohkar_forgets_authority\` looks like a casualty,
because it was drafted against the **compound** \`inquiry_authority_claimed\`. Under the atomic graph its real
target is \`auth.dohkar_claims_rite_and_ruling\`, which this outcome leaves standing, so it **remains
eligible**.

**That only holds because the exact readings get re-targeted to atoms.** Any exact reading still pointing at a
bundle would be invalidated by any revision touching any clause of it — a bundle-shaped blast radius. **Add to
the remaining-nine pass: every exact reading must name atoms, never bundles.**

### Sealed fact
**\`lirael.scene1_disposition\` — UNCHANGED.** Listed explicitly.

### \`memoryEffects[]\`
**None.** Per D2 the grant names a role and a proposition and does not reach his mind — his feelings,
intentions, knowledge and next actions are untouched.`);

// --- dohkar_demand_unmade: requiresActive, for symmetry ---------------------------------
sub(`### \`ceases[]\`
\`review.demanded_by_dohkar\`

### \`establishes[]\``,
`### \`requiresActive[]\`
\`review.demanded_by_dohkar\` — see §2; eligibility already guarantees it.

### \`ceases[]\`
\`review.demanded_by_dohkar\`

### Invalidated while this revision governs
**None.** No exact reading targets the demand.

### \`establishes[]\``);

// --- status -----------------------------------------------------------------------------
sub(`**Except \`unm.time_gives_way\`**, whose closed set is valid but whose treatment of the sealed Scene-1 choice
is an open product decision — see \`_sealed_choice_under_rewind_note.md\`.

### Owed before any ranking

1. **The sealed-choice decision** for \`unm.time_gives_way\`. **Blocking.**
2. **The remaining nine outcomes** are still in their v2 form and need the same discipline.`,
`**All four are now traced**, each with \`requiresActive[]\`, a closed \`ceases[]\`, a non-empty
\`establishes[]\`, an explicit sealed-fact listing, and a declared invalidation set.

### Owed before any ranking

1. ~~The sealed-choice decision~~ — **resolved 2026-09-28 as Option 2.**
2. **The remaining nine outcomes** are still in their v2 form and need the same discipline — including two
   requirements the traces produced: every outcome declares \`requiresActive[]\`, and **every exact reading
   must name atoms rather than bundles** (§6).`);
fs.writeFileSync(F, s);
console.log('custody_severed and standing_dissolved completed under the new rules');
