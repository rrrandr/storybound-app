import fs from 'fs';
const F = '_revision_outcomes_v3.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

sub(`### New engine state, flagged not solved
\`choice_pending\` is **a state the engine has never had**: active canon asserting that a decision is owed and
refusing to supply one. Two questions follow and are **not** answered here — what happens if the player never
resolves it, and whether any scene may be authored at all while it stands. Owed with implementation.`,
`### \`choice_pending\` — RESOLVED as an interaction contract (2026-09-28)
Both open questions are answered in \`_choice_pending_contract_and_nine_audit.md\` Part A. In brief: the replay
generates **up to** the choice and no further; while pending, **no continuation scene may be generated and no
planner may infer disposition, motive or aftermath**; both original options stay genuinely available; on
choosing, the disposition seals against the replayed scene uid and the gate clears; and on close, reload or
inaction the player **returns to the same unresolved choice** — never auto-selected, expired, or defaulted.

**Durability needs no new mechanism:** \`choice_pending\` is established by an appended revision and active
canon is derived by folding that log, so it survives a reload like any other revision. A stored flag would be
a second source of truth and would drift.

**\`player_decision_required\` does not conflict** — it is prompt text appended to the author's constraints
(\`app.js:100482\`), persisted nowhere and blocking nothing. \`choice_pending\` is the enforcement layer that
directive never had.`);

sub(`2. **The remaining nine outcomes** are still in their v2 form and need the same discipline — including two
   requirements the traces produced: every outcome declares \`requiresActive[]\`, and **every exact reading
   must name atoms rather than bundles** (§6).`,
`2. ~~The remaining nine outcomes~~ — **audited 2026-09-28**, atoms and \`requiresActive[]\` declared for all
   thirteen. Five findings raised there (F1–F5) are owed before ranking; see
   \`_choice_pending_contract_and_nine_audit.md\` Part B.`);
fs.writeFileSync(F, s);
console.log('v3 status updated');
