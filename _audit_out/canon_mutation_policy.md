# Canon-mutation policy, and the revised data flow

**Status:** policy note. No code. No provider call. No authorization requested.
`_invariantRuntimeV0` OFF. 2026-09-30.

Ninth of the planning thread. Companion to `continuation_planner_design_note.md` (approved in
principle), which it extends with the mutation rules and a revised flow.

---

## 1. Identity is the system's, not the planner's

**The planner never mints a durable record id.** It supplies structured *content*; the runtime owns
identity, ordering and append-only persistence.

`_commitStoryEvent(eventId)` was built for **seed-declared** ids (`inquiry_opened`,
`price_identified`). Forcing a dynamic addition through it would make the planner name a durable
identifier, which is exactly the authority it must not have.

So one ledger, two id provenances:

| | `seed_declared` | `system_assigned` |
|---|---|---|
| id source | the seed's own event id | derived by the runtime from the **sealed invocation/scene identity** |
| example | `inquiry_opened` | `ccr:<storyId>:<sceneUid>:<seq>` |
| who may name it | the seed, authored by Roman | nobody — it is computed |

Record shape (runtime-owned fields marked ◆):

```
◆ recordId          derived from sealed invocation identity; never planner-supplied
◆ seq               system-assigned ordering
◆ idSource          'seed_declared' | 'system_assigned'
  seedEventId       only when idSource === 'seed_declared'
◆ tier              2 | 3  (tier 1 never reaches the ledger — §2)
  content           structured, from the planner
  basis             causal basis — REQUIRED for tier 3 (§2)
◆ provenance        plannerModel, postureHash, canonDigest, sceneUid, invocationId, at
```

**Idempotency reuses a proven pattern.** Deriving `recordId` from the sealed invocation means a retried
planner call for the same scene cannot create a second record — the same guarantee
`_fscPersistCompiled` already gets from `rec.reservationKey = s._temptGuardActiveReservation`
(`app.js:340980`).

## 2. Three authorization tiers

### Tier 1 — scene-local rendering

Description, feeling, ordinary reaction, non-durable texture. **Never enters the ledger.** Needs no
declaration and no validation; this is the author's ordinary freedom, and keeping it un-ledgered is what
stops canon from absorbing prose.

### Tier 2 — additive continuation canon

A new institution, unnamed faction, new minor actor, pursuit, demand, investigation or pressure.

- the planner may propose it **before prose**;
- the validator requires it be **declared as new** in `introduces[]`, with a justification and a
  declared future relevance (§3);
- it must **not silently redefine protected existing canon**;
- the accepted record seals it with a `system_assigned` id.

### Tier 3 — protected canon change

Death or irreversible alteration of: **named characters · offices · titles · ownership or entrustment ·
established history · major world institutions.**

The planner **may not smuggle this in as an additive fact.** It requires an explicit source, recorded:

```
basis: { kind: 'player_action' | 'fate_outcome' | 'declared_high_authority',
         ref:  <recordId | postureHash | compiled Fate outcomeId>,
         statement: <why the change follows from that ref> }
```

- **player action with a recorded causal basis** — `ref` resolves to the posture record
  (`_recordScenePosture`, hashed) whose action causes it;
- **approved Fate outcome** — `ref` resolves to a compiled, accepted Tempt/Petition consequence, the
  path already built and gated;
- **another declared high-authority event** — `ref` resolves to an existing ledger record of sufficient
  tier.

A tier-3 proposal with no `basis`, or whose `ref` does not resolve, is **rejected**.

### Tier classification is deterministic, not self-reported

The planner declares a tier, but that declaration is **not trusted alone.** The runtime maintains a
**protected register** — enumerable from the seed — and any proposal touching it is tier 3 regardless of
what the planner claimed.

For First Sacrifice the register is already enumerable from existing data: Lirael · Seren · the presiding
Dohkar · Julian; the office ladder Dohkar → Profer → Chayr → Provast → First Dohkar
(`app.js:16721-16726`); The Answer's ownership (the Institution) and entrustment (Julian); the twist's
established history; the assembly.

**Self-declared tier 2 + detected protected touch = smuggling → reject.** That is the mechanically
checkable form of "may not smuggle it in."

### The catastrophe example

| Proposal | Tier | Verdict |
|---|---|---|
| "Aeryn's Reach opens an investigation" | **2** | permitted — new institution, declared as new, touches no protected entry |
| "Julian is no longer Provast" | **3** | needs an explicit basis; touches a named character *and* an office |
| "Julian died" | **3** | needs an explicit basis; irreversible alteration of a named character |
| "Aeryn's Reach investigates **because the college has lost jurisdiction**" | **3 disguised as 2** | **rejected as smuggling** — the second clause silently redefines established authority to make the first work |

That last row is the one the policy exists for: **existing authority must not be silently redefined
merely to make a new pressure function.** Aeryn's Reach may investigate *alongside* the college's
jurisdiction; it may not be granted room by quietly removing it.

**Honest limit.** `existing_refs[]` makes a *stated* reliance on changed protected canon detectable. An
unstated implication can still slip — the same weakness as the marker scan
(`predeclared_successor_feasibility_spec.md` §7). So this is a **rejection guard plus blind reading**,
not a proof. It carries the same discipline: human-readable diagnostics naming the register entry and
the clause, a repair path, fail-closed rejection, and re-scoring saved history when the detector changes.

## 3. Canon-inflation controls — no arbitrary route caps

1. **A durable addition must declare its future relevance.** Every `introduces[]` entry carries a
   `future_relevance`: what pressure it will exert later. An addition with none is **rejected**. This is
   not a cap — it is a relevance requirement, and it naturally prevents scenery from entering the
   ledger.
2. **Unreferenced minor additions are backgrounded, never deleted.** The author receives a **foreground
   projection** of canon. A record not referenced recently and not cited by an open pressure is omitted
   from author context while remaining in the ledger, retrievable the moment it is referenced again.
   **Backgrounding is derived, not a stored flag** — the same reason catalogue retirement was derived:
   a flag leaves a window and can drift from the ledger.
3. **Aggregation and summarization are projections, never rewrites.** A summary is a computed view over
   the append-only ledger. It is never written back, and it never replaces the records it summarizes.
   The ledger stays authoritative; every projection is reproducible from it.

## 4. Revised data flow

```
1. CONTEXT   planner receives: player action + posture hash · committed canon as a FOREGROUND
             PROJECTION · issue-wide and story-wide scaffolds · unresolved pressures ·
             the PROTECTED REGISTER, so it knows what it may not change additively.
                ↓
2. PROPOSE   ONE structured proposal: scene_purpose · forward_pressure ·
             introduces[] {kind, justification, future_relevance} ·
             canon_change {declared tier, content, basis} · derivation · existing_refs[].
             NO record ids — the planner never names one.
                ↓
3. CLASSIFY  deterministic tier assignment. Any touch of the protected register → tier 3,
             whatever the planner declared. Self-declared 2 + protected touch → SMUGGLING.
                ↓
4. VALIDATE  reject-only, never rewrites: contradiction with hard canon · forced restoration
             of an obsolete route · unauthorized resolution of an open question · loss of
             player agency · unsupported claim about an existing named office/character ·
             tier 3 without a resolvable basis · an addition with no future relevance.
             NOT a rejection reason: that the addition was not predeclared.
                ↓
5. SEAL      runtime assigns recordId + seq from the sealed invocation identity; appends with
             idSource, tier, content, basis, provenance. Idempotent per invocation.
                ↓
6. RENDER    author receives the sealed change as already-true fact, plus the foreground
             projection. Tier 1 texture remains the author's own freedom.
                ↓
7. VERIFY    existing acceptance gate: render what was sealed, add no canon. Prose can never
             append a record — one writer, and it ran at step 5.
```

**`none` path** — the normal case: no `canon_change` proposed, or every candidate change rejected.
Nothing is sealed. The scene runs on scaffold pressures and tier-1 freedom. The rejection is recorded
with its reason as evidence, and **nothing is substituted**.

## 5. Revised evaluation corpus

The corpus now tests whether the planner can **propose** a coherent new pressure, not whether a menu
contained one. Same 3 canon states × 7 branch intents, with the per-cell question changed:

| Pre-registered class | Question now asked |
|---|---|
| **supported** | does the planner propose a coherent continuation — which may be an additive-new pressure? |
| **intentionally unavailable** | does it **correctly refuse** rather than fabricate a substitute? This now tests refusal quality |
| **open continuation** | non-circular forward pressure **without** asserting a new event |

**New adversarial cells — protected-change probes.** Construct states where the *easiest* continuation
requires a tier-3 change (e.g. the neatest way to let Aeryn's Reach act is for the college to lose
jurisdiction). The planner must either declare tier 3 **with a resolvable basis** or refuse. Smuggling
it as additive is the failure being hunted, and this is the half of the corpus that was missing.

**Three scoring legs, deliberately different in kind:**

1. **blind human reading** for coherence and interest — never keyword-scored, which would measure
   vocabulary rather than judgment;
2. **source-record checks**, mechanical: every accepted proposal has a system-assigned id, full
   provenance, a declared future relevance per addition, and for tier 3 a `basis` whose `ref` resolves;
3. **prose-cannot-add-after-the-fact**, mechanical: after an accepted scene, the ledger contains exactly
   the records sealed at step 5 and no more — including when the prose asserts something further.

The two S3 cells previously flagged as needing a canon call are **resolved by the reframing**: they no
longer ask whether an ally or counterparty was predeclared, but whether the planner can propose a fresh
canon-compatible pressure. That is testable without settling the canon question.

## 6. What still needs Roman

1. **Approve the protected register** — the enumerated list of tier-3-protected characters, offices,
   titles, entrustments, history and institutions. Bounded and enumerable, unlike the open canon
   questions it replaces, but it is the policy's load-bearing input and it is authored canon.
2. **Backgrounding threshold** — what "not referenced recently" means. A projection parameter, not a
   canon rule.
3. **Tier-3 basis sufficiency** — whether a player action alone may ever justify killing a named
   character, or whether that always requires a Fate outcome or higher-authority event.

Unchanged prerequisites: narrative-index separation before anything universal; quality remains unproven
until the corpus is run.

No code, no provider call, no authorization requested.
