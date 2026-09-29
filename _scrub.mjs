import fs from 'fs';
const MEM = '/Users/romantsukerman/.claude/projects/-Users-romantsukerman-storybound-app/memory/project_tempt_outcome_extractor_provider_question.md';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,50));
  fs.writeFileSync(f, s.split(a).join(b)); };

// --- 1. MEMORY NOTE: the false attribution would otherwise be recalled as fact forever ----
sub(MEM,
`**DESIGN PRINCIPLE: an unmoored Tempt wish gets a CIRCUMSTANTIAL grant, not a memory edit** — because the player
named nothing to rewrite, and the seed's own doctrine ("Circumstances, Not Minds") plus the kernel-substitution
rule at \`:75601\` already say an impossible ask is granted as its plausible kernel.`,
`**~~DESIGN PRINCIPLE: an unmoored Tempt wish gets a CIRCUMSTANTIAL grant, not a memory edit~~ — WITHDRAWN
2026-09-28, FALSE ATTRIBUTION.** There is no seed doctrine called **"Circumstances, Not Minds"**. It appears
nowhere in \`public/\` — only in documents I wrote. I invented it and cited it as the seed's own. The
kernel-substitution rule is real but is at \`app.js:75596\`, gated \`!isTempt && vw.guaranteedFirst\`:
**Petition-only, onboarding-only**, and its own comment says it exists to "hold PETITION amplitude so it never
becomes a backdoor Tempt".

**What source actually says instead:** Tempt amplitude (\`app.js:75576\`) is *"MAY bend this world's own laws —
mythic, uncanny, impossible"*, and \`history_rewrite\` (\`app.js:191271\`) states *"A rupture MAY make an event
never have occurred when that is the wish and the scene delivers it."* **No replacement doctrine is
paraphrased here** — see \`_mechanism_catalog.md\` for the cited capabilities.`);

// --- 2. FEASIBILITY PACKET §7a: the origin of the error ---------------------------------
sub('_authoring_feasibility_packet_2026_09_27.md',
`Fate cannot un-happen canon, and the seed's own doctrine already says so — **"Circumstances, Not Minds"**, plus`,
`> ### ⛔ UNGROUNDED — FALSE ATTRIBUTION, withdrawn 2026-09-28
> **"Circumstances, Not Minds" is not a seed doctrine. It does not exist in \`public/\`. I invented it.** The
> kernel-substitution rule is real but Petition-only and onboarding-only (\`app.js:75596\`). **Every conclusion
> in §7 that rests on this premise is ungrounded**, including the design of the entire unmoored set as
> circumstantial rather than rupture-scale. **No replacement doctrine is supplied by paraphrase** — the cited
> capabilities are in \`_mechanism_catalog.md\`. Original text kept below for the record.

~~Fate cannot un-happen canon, and the seed's own doctrine already says so — **"Circumstances, Not Minds"**, plus`);

// --- 3. AMPLITUDE CORRECTION: it quotes §7a; mark what the quotation contains ------------
sub('_tempt_amplitude_correction.md',
`One defect produces every symptom in the review. \`_authoring_feasibility_packet_2026_09_27.md\` §7a opens:`,
`One defect produces every symptom in the review. \`_authoring_feasibility_packet_2026_09_27.md\` §7a opens:

> **Note added 2026-09-28:** the quotation below contains **two** faults, not one. The Petition-guard
> misapplication is diagnosed in this document. The phrase **"Circumstances, Not Minds" is an invented
> doctrine** that exists nowhere in \`public/\` — I attributed it to the seed. **This document did not catch
> that**, because it audited the rule I cited rather than the doctrine I quoted.`);

// --- 4. LEDGER: correct my own invoker-anchor claim --------------------------------------
sub('_mechanism_audit_ledger.md',
`**\`all_present_except_invoker\` is a schema *option*, not a rule** — which is why D1 was right to remove it as
an automatic default. It remains available when the wording names it.`,
`> ### ⚠ CORRECTION to this ledger, 2026-09-28 — I had this backwards
> I wrote that the invoker exemption is "a schema option, not a rule". **Source says the opposite.**
> \`app.js:191251\`: *"The wisher normally keeps an anchor to what they changed — without it they could not
> experience or navigate the consequence. **That exemption is the DEFAULT and the prose does NOT have to earn
> it.** It is removed only when the submitted wording targets the invoker, and **ambiguity that Fate exploits
> must be declared as a wording consequence rather than done silently.**"*
>
> The schema enforces it: \`invokerExemption {who, status: exempt|targeted, reason}\`, **default
> \`exempt\`/\`invoker_anchor\`**; \`targeted\` is valid only with \`wish_explicitly_includes_self\` or
> \`ambiguous_wording_consequence\`, **plus a mandatory note**.
>
> **D1 remains compatible with source — but only as a declared targeting, never a silent one.** *"I wish
> everyone here would forget"* may target Lirael under \`ambiguous_wording_consequence\`, and the schema
> **requires that be recorded with a note**. What source forbids is dropping the exemption quietly, which is
> what "no invoker filter anywhere" would produce if implemented literally.
>
> **And the rationale is a live editorial tension, not a formality:** the anchor exists so the invoker *"could
> not experience or navigate the consequence"* without it. Under D1 plus Option 2, \`unm.time_gives_way\` has
> Lirael forget the interrogation **and** make a fresh choice — navigating a consequence she cannot perceive.
> **Flagged for your decision; not resolved here.**`);

// --- 5. ORDINARY GRAMMAR: flag the borrowed phrase, do not overclaim --------------------
sub('_ordinary_consequence_grammar_design_note_2026_09_27.md',
`| **\`impossible\`** | \`attempted_partial\`, \`substituted\` | any | any | **none**, or \`world_fact\` only if a declared plausible kernel exists |`,
`| **\`impossible\`** | \`attempted_partial\`, \`substituted\` | any | any | **none**, or \`world_fact\` only if a declared plausible kernel exists ⚠ |

> ⚠ **Provenance flag, 2026-09-28.** "Plausible kernel" is borrowed from \`app.js:75596\`, which is scoped
> **Petition-only and onboarding-only**. This row is the **ordinary Say/Do** lane, a third context, and the
> borrowing has **not been grounded there**. It is not withdrawn — the row requires a *declared* kernel, so it
> asserts nothing on its own — but it needs its own source check before it governs anything.`);
console.log('scrub complete: 5 sites corrected');
