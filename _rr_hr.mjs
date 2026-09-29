import fs from 'fs';
const F = '_reality_revision_design_note.md';
let s = fs.readFileSync(F, 'utf8');
const a = '# 3. A revision is an appended record, never an edit';
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
s = s.split(a).join(`# 2a. The source-backed capability this note implements (recorded 2026-09-28)

This note was written from Tempt amplitude and a doctrine I had invented. **The actual licence is narrower,
older, and stronger**, and it was in the extractor schema the whole time:

> **\`app.js:191271\`, \`history_rewrite.priorHistoryReplaced\`:** *"what the history WAS, and what it now IS
> instead. **A rupture MAY make an event never have occurred when that is the wish and the scene delivers
> it.**"*

**Exact scope, and both conditions are load-bearing:**

| | |
|---|---|
| **what is permitted** | an event may be made **never to have occurred** |
| **condition 1** | **when that is the wish** — not when it would be convenient or favorable |
| **condition 2** | **and the scene delivers it** — the prose must carry it; intent is not enough |
| **required alongside** | \`survivingContradictions\` — *"residue that does not fit the rewritten history"*, an expected and declarable outcome rather than a failure |

**Two of this note's own rules turn out to be schema-enforced independently.** \`priorHistoryReplaced\` requires
saying what history now **is**, not merely what it no longer is — the no-inference-from-absence rule, already
in the source. And \`survivingContradictions\` anticipates precisely the RECORD-versus-CANON residue this note
was built to manage.

**What it does not license:** that anyone **perceives** the rewrite. \`survivingContradictions\` covers residue,
not witnessing. Full catalog: \`_mechanism_catalog.md\`.

---

` + a);
fs.writeFileSync(F, s);
console.log('history_rewrite capability recorded beside the reality-revision design');
