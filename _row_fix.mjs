import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

sub('| **`unseen`** | ✅ **COVERED** | by **approved `unm.the_turning_forgotten`**, subject to the native compiler contract and its declared population and contact conditions. **Awaiting implementation, not authoring.** |',
    '| `unseen` | ✓ **covered** | Approved `unm.the_turning_forgotten`; **no further outcome authoring is owed**, only native-contract implementation and its declared population/contact conditions. |');

sub('| **`escape`** | ◐ **PARTIALLY COVERED** | by **approved `unm.the_accusation_unmade`**, **only when a family accusation is active**. **Pre-accusation `escape` remains uncovered** — it lacks an outcome in *some active-canon states*, not everywhere. |',
    '| `escape` | ◐ **partially covered** | Approved `unm.the_accusation_unmade`, **only when a family accusation is active**. Pre-accusation `escape` is uncovered — missing in *some* active-canon states, not all. |');

sub('| **`silence`** | ⛔ **UNCOVERED** | **no outcome at all.** `unm.custody_severed` is withdrawn, and no supported, genuinely favorable effect has been found. |',
    '| `silence` | ⛔ **uncovered** | **No outcome at all.** `unm.custody_severed` withdrawn; no supported, genuinely favorable effect found. |');

// Stale wording further down: silence is decided, not merely recommended.
sub('**ASK-CLASS UNCOVERED**, recommended; no supported favorable effect found.',
    '**ASK-CLASS UNCOVERED** (decided 2026-09-29); no supported favorable effect found.');
console.log('status rows rewritten short; stale "recommended" cleared');

fs.writeFileSync(F, s);
console.log("written");
