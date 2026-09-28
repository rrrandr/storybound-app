# Once-per-scene Tempt guard — lifecycle and dry-proof plan

Design only, before implementation. No code, no calls, no push.

**This is a concurrency boundary, not a boolean.** Two failures define it: two rapid attempts must not both pass
before either reaches the ledger, and a cancelled or failed payment must not permanently consume the scene's
allowance.

## The key: which `sceneUid`?

**The uid of the latest ACCEPTED prose scene** (`_sbLatestProseScene().record.uid`), with a declared sentinel
before the first scene exists.

This needs stating because the obvious answer is wrong: a Tempt is invoked **before** the scene it affects is
generated, so that scene's uid does not exist yet. Keying to the **last accepted** scene gives the right semantics —
*since the last accepted scene, one Tempt may seal* — and the allowance resets naturally when the next scene is
accepted and the latest uid changes.

It also delivers the required properties for free: it survives reload (part of the scene record), it is immune to
the OAS splice (identity, not position), and **a scene revision keeps the same uid, so the block is retained** —
which is exactly why the uid and not the projection hash is the key.

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
| **3** | **Release on cancel or failure** | Every early return between acquire and seal releases the reservation: insufficient fortunes, purchase modal opened, confirm declined, burn failed, or a throw. **A cancelled payment must not consume the scene's allowance** — release is idempotent and matches on `reservationId` so a late release cannot clear someone else's |
| **4** | **Seal on acceptance** | On successful invocation, convert `pending` → `sealed`, record the `invocationId`, and **append one entry to the shared `_fateInvocationSeq`** with the next monotonic `seq` |
| **5** | **Second attempt while pending declines before payment** | Covered by step 1: `pending` declines exactly as `sealed` does, and no cost path has run |
| **6** | **Petition is unaffected** | Petition is **not guarded** and remains available in the same scene. Its selection waits on **prior successfully SEALED** Fate entries — the `_fateInvocationSeq` — and **never on a cancelled Tempt reservation**, which by then has been released and appended nothing |

**Placement.** The seal (step 4) belongs with `_recordTemptFateEvent` (`:109431`), which is the existing seal point
and already assigns the monotonic `_temptFateLedgerSeq`. Acquire and release (steps 1–3) belong inside
`invokeTemptFate` (`:256889`), which owns every cost path.

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
| 5 | **Accepted Tempt + rejected second Tempt** | after a successful seal, a second attempt declines **before payment** — asserted by instrumenting the cost path and showing zero calls — and the guard reports `sealed`, not `pending` |
| 6 | **Save / reload after acceptance** | the guard and the sequence survive a real snapshot round trip; after reload the same `sceneUid` still declines, and the sequence's `seq` values are unchanged |
| 7 | **Scene revision retains the block** | revise the accepted scene through `_sbReviseSceneProjection` — `projectionRevision` bumps, `hash` changes, **`uid` does not** — and the guard still declines on that same uid. The pair that makes it non-vacuous: a **new** scene with a **new** uid is permitted |
| 8 | **Release is identity-matched** | a stale `reservationId` cannot release a newer reservation; asserted by acquiring, releasing with a wrong id, and showing the guard still `pending` |
| 9 | **Containment** | zero provider requests; no scene state mutated by a declined attempt (full-state diff, as the purity proof does) |

Proofs 1, 2 and 4 carry the weight: 1 is the concurrency boundary itself, 2 is the "a cancellation must not cost the
player their scene" guarantee, and 4 is the cross-mechanic independence that the decision's exception depends on.

## Not guard work

The **late-Issue-1 outcome set** and the **missing seventh matrix predicate** (`jurisdictionChallengeMade`) are
**editorial prerequisites**, tracked separately in the feasibility packet. Neither belongs in this implementation,
and neither blocks it.
