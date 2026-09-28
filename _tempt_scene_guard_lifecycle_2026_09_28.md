# Once-per-scene Tempt guard — lifecycle and dry-proof plan

Design only, before implementation. No code, no calls, no push. **Holding for implementation authorization.**

**Amendment 1 (2026-09-28).** Two corrections. **Opening a purchase or confirmation modal is a WAITING state, not a
release state** — releasing there reopens the race while the first Tempt is still awaiting the player's payment
decision. And the **bootstrap scope key** is defined for the case where no accepted prose scene exists yet.

**This is a concurrency boundary, not a boolean.** Two failures define it: two rapid attempts must not both pass
before either reaches the ledger, and a cancelled or failed payment must not permanently consume the scene's
allowance.

## The key: which `sceneUid`?

**The uid of the latest ACCEPTED prose scene** (`_sbLatestProseScene().record.uid`) — or, before any exists, the
**bootstrap sentinel** defined below.

This needs stating because the obvious answer is wrong: a Tempt is invoked **before** the scene it affects is
generated, so that scene's uid does not exist yet. Keying to the **last accepted** scene gives the right semantics —
*since the last accepted scene, one Tempt may seal* — and the allowance resets naturally when the next scene is
accepted and the latest uid changes.

It also delivers the required properties for free: it survives reload (part of the scene record), it is immune to
the OAS splice (identity, not position), and **a scene revision keeps the same uid, so the block is retained** —
which is exactly why the uid and not the projection hash is the key.

### The bootstrap key — no accepted prose scene yet

Rare but real: a story's very first turn, and any state where `state.scenes` holds only OAS archive entries (which
`_sbLatestProseScene` correctly skips, because an archive is not prose).

> **Key: a stable per-story initial-scene sentinel**, derived from the story's own identity — `scene:bootstrap:<storyId>`.

Three properties it must have, and one it must not:

- **Stable for the story**, so two attempts before the first scene resolve to the same key and the second declines.
- **Survives reload**, because it is derived from `storyId` rather than stored positionally.
- **Distinct per story**, so one story's bootstrap Tempt never blocks another's.
- **It is replaced by the first accepted scene's uid ONLY through the normal acceptance transition** — that is,
  because `_sbLatestProseScene()` begins returning a real record once a prose scene is accepted. **Never by array
  position**, never by a length check, never by "if scenes.length > 0". The key function has exactly one rule and
  the transition falls out of it.

A Tempt sealed under the sentinel stays sealed under the sentinel; once the first scene is accepted the key moves on
and the allowance is free again, which is the correct reading of "once per scene" for the opening turn.

## State

```
state._temptSceneGuard = {                       // keyed by sceneUid
  '<sceneUid>': { status: 'pending' | 'sealed', reservationId, at, invocationId? }
}
state._fateInvocationSeq = [                     // the SHARED, monotonic Fate sequence
  { seq, mechanic: 'tempt' | 'petition', sceneUid, invocationId, sealedAt }
]
```

Both are plain, serialisable state, so both survive the snapshot round trip.

## Lifecycle

| # | step | behaviour |
|---|---|---|
| **1** | **Entry check + acquire, atomically** | At `invokeTemptFate` entry, a **single synchronous** check-and-set: if the current key is `sealed` **or** `pending`, decline and return. Otherwise write `pending` with a fresh `reservationId`. Synchronous means atomic here — no `await` may sit between the read and the write, and that is the whole guard |
| **2** | **Acquire BEFORE any async cost path** | The reservation is taken before free-credit consumption, before `consumeFortuneFavorCharge()`, before the balance check, before the purchase modal, before the confirm dialog. Two rapid clicks cannot both pass, because the second reads `pending` |
| **3** | **Release on cancel or failure — but NOT on "modal opened"** | The reservation is released when the invocation **terminates before seal**: the player explicitly cancels, the modal is dismissed without authorization, payment fails, the fortunes balance is insufficient, or the path throws. **A cancelled payment must not consume the scene's allowance** — release is idempotent and matches on `reservationId`, so a late release cannot clear a newer reservation |
| **3a** | **"Modal opened" is a WAITING state** | **Opening a purchase or confirmation modal does NOT release.** The first Tempt is still live — it is awaiting the player's decision, not finished — and releasing there would **reopen the race for as long as the modal is up**, which is the longest window in the whole flow. The reservation is held for the modal's entire lifetime and resolved by its *outcome*: authorized → continue to seal; cancelled or dismissed → release |
| **4** | **Seal on acceptance** | On successful invocation, convert `pending` → `sealed`, record the `invocationId`, and **append one entry to the shared `_fateInvocationSeq`** with the next monotonic `seq` |
| **5** | **Second attempt while pending declines before payment** | Covered by step 1: `pending` declines exactly as `sealed` does, and no cost path has run. **This explicitly includes the modal-open window** — a second Tempt raised while the first player is mid-purchase declines without entering any cost path, and without disturbing the open modal |
| **6** | **Petition is unaffected, including while a Tempt is pending** | Petition is **not guarded** and remains available in the same scene **even while a Tempt reservation is pending or its modal is open**. It simply **does not treat an unsealed Tempt as a committed Fate consequence**: its selection reads only the **sealed** entries in `_fateInvocationSeq`. A pending Tempt is not yet a fact, and a cancelled one never becomes one |

**Placement.** The seal (step 4) belongs with `_recordTemptFateEvent` (`:109431`), which is the existing seal point
and already assigns the monotonic `_temptFateLedgerSeq`. Acquire and release (steps 1–3a) belong inside
`invokeTemptFate` (`:256889`), which owns every cost path — **including both awaited decision points**, the
confirmation dialog and `openFortunePurchaseModal`. Those are the two places where holding rather than releasing is
load-bearing, and they are the two places an implementation is most likely to get it wrong, because each looks like
a natural early return.

**Ordering.** `_fateInvocationSeq` is appended in **seal order**, synchronously, per the decision note's Requirement
A. A Petition sealed after a Tempt reads the Tempt's committed entry; a Tempt whose reservation was released
appended nothing, so there is nothing to read.

## Dry-proof plan

Zero provider calls. Each scenario is stated so it can go red.

| # | scenario | asserts |
|---|---|---|
| 1 | **Double-click / racing attempts** | two `invokeTemptFate` calls issued with no await between them: exactly **one** acquires, the second declines; exactly **one** ledger entry and **one** `_fateInvocationSeq` entry exist; **no cost path ran twice** |
| 2 | **Cancelled payment, then retry** | confirm declined → reservation **released**, guard back to free, no ledger entry; a retry in the **same scene** then **succeeds**. The allowance was not consumed by the cancellation |
| 3 | **Failed payment, then retry** | insufficient fortunes / burn failure → released, no ledger entry, no sequence entry; retry after the balance is restored succeeds in the same scene |
| 4 | **First Tempt pending + Petition** | with a Tempt reservation `pending`, a Petition in the same scene is **permitted**, seals, and appends its own sequence entry. Then the Tempt is **cancelled** and the Petition's entry is **unaffected** — it never waited on a reservation that appended nothing |
| 4b | **Modal-open double attempt, then cancel** | with the first Tempt's **purchase/confirm modal open**, a second attempt is **rejected before entering any cost path** and the modal is undisturbed; then the player **cancels**, the reservation **releases**, and a retry **in the same scene succeeds**. The pair matters: rejection while waiting AND release on cancel, in one sequence, so neither half can pass alone |
| 4c | **Bootstrap scope — no accepted prose scene** | with `state.scenes` empty (and again with it holding only an OAS archive), the key resolves to the per-story sentinel: **one Tempt is allowed, a second is rejected**. Then the first prose scene is accepted through the normal path and the allowance is **free again**, with the guard entry still recorded under the sentinel — and the transition is asserted to come from the key function, not from a length or index check |
| 5 | **Accepted Tempt + rejected second Tempt** | after a successful seal, a second attempt declines **before payment** — asserted by instrumenting the cost path and showing zero calls — and the guard reports `sealed`, not `pending` |
| 6 | **Save / reload after acceptance** | the guard and the sequence survive a real snapshot round trip; after reload the same `sceneUid` still declines, and the sequence's `seq` values are unchanged |
| 7 | **Scene revision retains the block** | revise the accepted scene through `_sbReviseSceneProjection` — `projectionRevision` bumps, `hash` changes, **`uid` does not** — and the guard still declines on that same uid. The pair that makes it non-vacuous: a **new** scene with a **new** uid is permitted |
| 8 | **Release is identity-matched** | a stale `reservationId` cannot release a newer reservation; asserted by acquiring, releasing with a wrong id, and showing the guard still `pending` |
| 9 | **Containment** | zero provider requests; no scene state mutated by a declined attempt (full-state diff, as the purity proof does) |

Proofs 1, 2, 4 and 4b carry the weight: **1** is the concurrency boundary itself, **2** is the "a cancellation must
not cost the player their scene" guarantee, **4** is the cross-mechanic independence the decision's exception depends
on, and **4b** is the longest-lived race window in the flow — the one an implementation is most likely to reopen by
treating a modal as an early return.

## Not guard work

The **late-Issue-1 outcome set** and the **missing seventh matrix predicate** (`jurisdictionChallengeMade`) are
**editorial prerequisites**, tracked separately in the feasibility packet. Neither belongs in this implementation,
and neither blocks it.
