import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_choice_pending_contract_and_nine_audit.md',
`## A7. Failed replay presentation — a deterministic recovery path`,
`## A7. Failed replay presentation — a deterministic recovery path  ·  **APPROVED 2026-09-28**`);

sub('_choice_pending_contract_and_nine_audit.md',
`### Tier 1 — retryable replay generation

- **The replay scene is re-generatable against the same sealed delta**, on demand and without limit.`,
`### Tier 1 — retryable replay generation, **bounded**

- **Bounded by the app's normal retry / infrastructure-failure policy** — not a new allowance invented here.
  **It must never spin indefinitely, and must never hold the player at a loading state.** An owed choice
  behind a spinner is the stranded save in a different costume.
- **The replay scene is re-generatable against the same sealed delta** while that allowance lasts.`);

sub('_choice_pending_contract_and_nine_audit.md',
`### Tier 2 — authored, non-model choice presentation

**Tier 1 depends on a provider and therefore cannot be the guarantee.** So the floor is a presentation that
requires no model call at all:

- The renewed choice is presented from **authored, static text** — the Scene-1 choice itself, both options, as
  already authored.
- **It presents the choice and nothing else.** No prose, no recap, no continuation, no implied aftermath — A1
  and A2 bind here exactly as they do on the generated path.
- Because it makes no request, **it cannot fail for provider reasons**, which is what makes it a guarantee
  rather than another attempt.`,
`### Tier 2 — authored, non-model choice presentation

**Tier 1 depends on a provider and therefore cannot be the guarantee.** So the floor is a presentation that
requires no model call at all.

**Transition is automatic.** When the retry allowance is exhausted, or on an infrastructure failure that
cannot recover, the app **moves to Tier 2 by itself.** The player does not retry, choose to fall back, or
acknowledge anything.

- The renewed choice is presented through **the ordinary story choice presentation**, from authored static
  text — the Scene-1 choice itself, both options, as already authored.
- **It presents the choice and nothing else.** No prose, no recap, no continuation, no implied aftermath — A1
  and A2 bind here exactly as on the generated path.
- **The reader is told nothing about a model, a failure, a retry, or a recovery.** No error, no apology, no
  "generation failed", no degraded-mode banner. **They see the renewed choice, and that is all there is to
  see.** A technical explanation would be a worse outcome than the failure it explains: it breaks the fiction
  to describe plumbing the player cannot act on.
- **Tier 2 creates no canonical delta and spends no additional Fortune.**
- **It is available after a reload as well as immediately after a failure.** A player who closes the app and
  returns still reaches the choice — Tier 2 is a standing presentation path, not a one-shot catch.
- Because it makes no request, **it cannot fail for provider reasons**, which is what makes it a guarantee
  rather than another attempt.`);

sub('_choice_pending_contract_and_nine_audit.md',
`- **\`unm.time_gives_way\`** — until the A7 recovery path is approved.`,
`- ~~\`unm.time_gives_way\`~~ — **unblocked**; A7 approved with the Tier 1 bound, 2026-09-28.`);

sub('_choice_pending_contract_and_nine_audit.md',
`### Owed before ranking

1. Resolve F3 for \`unm.witness_scattered\` (an editorial choice between two authoring routes).
2. Approve the A7 recovery path.
3. Then: re-rank the complete packages, and compute revision-expanded coverage
   (states × ask-classes × active-canon configuration).`,
`### Owed before ranking

1. **Resolve F3** — a proposed replacement is in \`_unwitnessed_proposal.md\`. **The sole remaining editorial
   blocker.**
2. ~~Approve the A7 recovery path~~ — **approved with the Tier 1 bound.**
3. Then: re-rank the complete packages, and compute revision-expanded coverage
   (states × ask-classes × active-canon configuration).`);
console.log('A7 approved and bounded');
