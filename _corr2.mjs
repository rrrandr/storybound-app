import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

// ---- 5. Failed-replay recovery replaces A7 -------------------------------------------
sub('_choice_pending_contract_and_nine_audit.md',
`## A7. One edge the contract must name

**If replay generation fails after the revision is sealed**, \`choice_pending\` is active with no scene to show.
The revision seals at Tempt acceptance; the scene generates after. So: **a failed generation does not consume
\`choice_pending\`**, and the replay scene must be re-generatable against the same revision. The player returns
to an unresolved choice, which is exactly A5's behaviour — the state is already correct; only the scene is
missing.`,
`## A7. Failed replay presentation — a deterministic recovery path

**A surviving \`choice_pending\` is not sufficient.** The state being correct does not help a player who cannot
*reach* the choice. The revision seals at Tempt acceptance and the scene generates afterwards, so a generation
failure leaves an owed choice with nothing on screen — **and an owed choice that cannot be reached is a
stranded save.** This was under-specified and is now a blocker on \`unm.time_gives_way\`.

### Tier 1 — retryable replay generation

- **The replay scene is re-generatable against the same sealed delta**, on demand and without limit.
- **Retry appends nothing.** The delta is already in the log; regeneration produces a *scene*, never a second
  delta. Retrying twice must not revise the world twice.
- **No further charge.** The Fortune was spent at acceptance and the delta is sealed; generation is downstream
  of payment. **A failure the player did not cause may never be billed to them.**
- **No second Tempt is consumed or permitted** — the scope key is inherited per A6, retry or not.

### Tier 2 — authored, non-model choice presentation

**Tier 1 depends on a provider and therefore cannot be the guarantee.** So the floor is a presentation that
requires no model call at all:

- The renewed choice is presented from **authored, static text** — the Scene-1 choice itself, both options, as
  already authored.
- **It presents the choice and nothing else.** No prose, no recap, no continuation, no implied aftermath — A1
  and A2 bind here exactly as they do on the generated path.
- Because it makes no request, **it cannot fail for provider reasons**, which is what makes it a guarantee
  rather than another attempt.

### The invariant this establishes

> **The renewed choice is always reachable.** Tier 1 gives the intended experience; Tier 2 guarantees access
> when Tier 1 cannot run. A player is never stranded at an owed choice, never charged twice for one Tempt, and
> never handed a continuation the engine invented to paper over a failure.

**Choosing on the Tier 2 path is a real choice** — it seals exactly as A4 describes. The missing scene is a
presentation loss, not a canon loss.`);

// ---- 6. F4 restored explicitly in Part C ---------------------------------------------
sub('_choice_pending_contract_and_nine_audit.md',
`# Part C — Status

**All thirteen outcomes now carry atom targets, \`requiresActive[]\`, and a declared invalidation set.**

### Owed before ranking

1. **F2** — approve additive-only revisions (\`ceases: []\`).
2. **F3** — declare \`incoherent\` semantics, or re-author \`unm.witness_scattered\`.
3. **F5** — approve the \`lirael.shunned_by_all_present\` rename.
4. **F1** — re-scope \`mem.exact.assembly_forgets_twist\` to the crowd in the source documents.
5. Then: re-rank all thirteen complete packages, and compute revision-expanded coverage
   (states × ask-classes × active-canon configuration).

**No ranking. No coverage computation. No implementation.**`,
`# Part C — Status of every numbered finding

**All five findings are reported here, including the one that needs no further work.** F4 was recorded in
Part B and in the table above but was **omitted from my spoken summary** of this audit — the finding never
left the document, and reporting it was still incomplete. Listed explicitly from here on.

| # | finding | status |
|---|---|---|
| **F1** | \`mem.exact.assembly_forgets_twist\` reaches the crowd only; the sheet's flagship example overstates it | **CORRECTED** — example moved to \`all_present\` / \`population.scene_present\`; the crowd-only reading kept distinct |
| **F2** | additive-only outcomes had no channel | **MODEL AMENDED** — canonical deltas; a delta with \`ceases[]\` is a revision, a delta with only \`establishes[]\` is an additive/revelatory change. **No empty-cease "revision" is manufactured.** |
| **F3** | \`incoherent\` is an undeclared effect | **\`unm.witness_scattered\` BLOCKED** until each party's exact mistaken or fragmented proposition is authored, or the outcome is re-authored as a defined forgetting effect |
| **F4** | \`mem.exact.seren_forgets_price\` has **no target atom at all** in this phase | **STANDS, and is not closed.** \`price_identified\` is not active in the opening, so there is nothing to target and nothing in \`requiresActive[]\`. It is **not an exact reading in this phase**; its wording routes to Fate-chosen. **The opening exact-reading set is five, not six** — and that count must survive into every later document. |
| **F5** | \`unm.the_shunning\` excludes Lirael structurally, not by privilege | **APPROVED**; established fact renamed \`lirael.shunned_by_all_present\` |

### Blocked

- **\`unm.witness_scattered\`** — F3. May not be ranked, counted in coverage, or presented for approval.
- **\`unm.time_gives_way\`** — until the A7 recovery path is approved.

### Owed before ranking

1. Resolve F3 for \`unm.witness_scattered\` (an editorial choice between two authoring routes).
2. Approve the A7 recovery path.
3. Then: re-rank the complete packages, and compute revision-expanded coverage
   (states × ask-classes × active-canon configuration).

**No ranking. No coverage computation. No implementation.**`);

// ---- 4. F5 rename applied at the source ----------------------------------------------
sub('_first_sacrifice_tempt_outcomes_v2.md',
'| **establishes** | `shunned_by_assembly` |',
'| **establishes** | **`lirael.shunned_by_all_present`** *(renamed from `shunned_by_assembly`, 2026-09-28 — the assembly is narrower than this outcome\'s reach)* |');

// ---- 3. Block witness_scattered at the source ----------------------------------------
sub('_first_sacrifice_tempt_outcomes_v2.md',
'### `unm.witness_scattered` — rank 7 · ask-class `unseen`',
`### \`unm.witness_scattered\` — ask-class \`unseen\` — ⛔ **BLOCKED 2026-09-28**

> **\`incoherent\` is not an effect until its content is authored.** Every other memory effect in the design
> means a party no longer holds a fact; this one means they hold it **wrongly, and differently from each
> other** — a claim about content, and content is exactly what D2 requires an authored grant to name.
> **A vague label cannot alter minds.**
>
> Two routes, both editorial: author **each affected party's exact mistaken or fragmented proposition**
> (noting that \`population.assembly\` is a collective and cannot hold individual beliefs, so the outcome may
> not be expressible at that reach), or **re-author it as a defined forgetting effect**. Blocked meanwhile —
> not rankable, not countable in coverage, not presentable for approval.`);
console.log('A7 recovery specified; F4 restored to the report; F3 and F5 applied at source');
