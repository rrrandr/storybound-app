import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_answer_custody_canon.md',
'# 2. Re-authored — `unm.custody_severed` · ask-class `silence`',
`# 2. ⛔ \`unm.custody_severed\` — **WITHDRAWN IN FULL, 2026-09-29**

> **Everything in this section is void.** The grant ceased Julian's entrustment, and **that entrustment is
> office-bound** — it runs with his office, is a right of use rather than ownership, and **is not a revocable
> scene-local custody arrangement.** The outcome was built on a false premise about what kind of thing it was
> reaching.
>
> **Retired with it:** \`answer.entrustment_vacant\`, \`custody_unclaimed\`, and **every claim that Julian's
> charge ends, lapses, or becomes open** — including §2d's custody crisis, which **does not exist**: the
> handoff was always *within* a continuing entrustment, so when Lirael's authorization lapses the Answer is
> **Julian's to have back**.
>
> **No replacement outcome is drafted.** See \`_answer_lore_and_silence_reopened.md\`. Section retained for the
> record only.

# 2. ~~Re-authored — \`unm.custody_severed\` · ask-class \`silence\`~~ *(void)*`);

sub('_three_final_traces.md',
'# 2. `unm.custody_severed` — ⛔ **RE-AUTHORED 2026-09-29, see `_answer_custody_canon.md` §2**',
`# 2. \`unm.custody_severed\` — ⛔ **WITHDRAWN IN FULL, 2026-09-29**

> Julian's entrustment is **office-bound** and cannot be ceased by a scene-local grant. The outcome is
> withdrawn, not re-authored; \`answer.entrustment_vacant\` and \`custody_unclaimed\` are retired. The
> \`silence\` ask is reopened and **recommended uncovered**. See \`_answer_lore_and_silence_reopened.md\`.`);

sub('_atomic_fact_graph_proposal.md',
`> **Custody canon, 2026-09-29.**`,
`> **Answer lore, 2026-09-29.** The Answer is **not a lie detector** and **may not establish historical
> causation, factual guilt, or who caused the twist.** It **shape-responds to the present holder's alignment**:
> clear belief or purpose → a straight sharp blade; uncertainty → a scythe at one end and a mace at the other;
> evasiveness → a cat-o'-nine-tails or whip. **Julian's entrustment is office-bound** — a right of use, not
> ownership, not scene-local — and \`unm.custody_severed\` is **withdrawn** for trying to cease it.
>
> **Custody canon, 2026-09-29.**`);

sub('_first_sacrifice_opening_approval_sheet.md',
'| **6** | `silence` | `unm.custody_severed` | the Institution\'s claim on the Answer **ceases**; it belongs to no one | nobody is watching it |',
'| ⛔ | `silence` | ~~`unm.custody_severed`~~ | **WITHDRAWN** — Julian\'s entrustment is office-bound and cannot be ceased by a scene-local grant. **ASK-CLASS UNCOVERED**, recommended; no supported favorable effect found. | — |');
console.log('withdrawal applied');
