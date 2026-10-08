# Two continuity traces, diagnosed separately (2026-10-07)

Provider-free. No production change proposed yet beyond the reuse path named in each. Evidence is
the captured outgoing planner request `_audit_out/integrated/planner_2.txt` plus the code paths.

---

## Trace A — which baked-opening facts reach the next planner

**Measured in the captured request:**

| section | present? | content |
|---|---|---|
| `RECENT ONE-ON-ONE EXCHANGE` (line 16) | **yes** | the real OAS turns |
| `COMMITTED WORLD STATE` (line 135) | **yes** | `["The presiding Dohkar declares that Lirael's conduct will be reviewed and that she will answer for it."]` |
| `STORY LEDGER` | **no** | 0 occurrences |
| the opening's own facts (wish twisted / charge of shaping / inquiry venue) | **no** | absent in any wording |

**Why — two different channels, and the planner is on the narrower one.**

1. The opening's facts **are** recorded. `_renderBakedScene1` writes them to the scene ledger at
   `app.js:143207` — `_sceneLedgerCommit(state, { kind: 'baked', sceneNumber: 1, event: <the
   package's `emitted.ledgerLine`> })`. Nothing is lost at the source.
2. The **author** receives them. `_buildContinuitySpineBlock` (`app.js:133856`) renders the
   `STORY LEDGER` header at `133892` — described in the source as *"the ONE builder every real
   author path already calls"*.
3. The **planner** does not call that builder. Its payload renders `COMMITTED WORLD STATE` from
   `_ensureCommittedState().facts` (`app.js:102132`, emitted at `102179`) — a different, narrower
   source.
4. Those facts are appended by exactly one function: `_commitTransition` (`app.js:100189`,
   `cs.facts.push` at `100221`), called from one site (`101230`) after
   `_adjudicateSealedProposal` judges a **sealed proposal against generated prose**.

**So:** the baked opening has no sealed proposal — it is authored, not planned — and therefore
contributes nothing to committed state **by construction**, not through a forwarding bug. The one
fact that *is* there belongs to the OAS interruption, which did go through a proposal. This is why
`COMMITTED WORLD STATE` carries the review fact and nothing from Scene 1.

**Reuse path, no new store:** the opening's row already exists in the scene ledger and already has
a renderer in `_buildContinuitySpineBlock`. Giving the planner payload that same block (or just
its `STORY LEDGER` section) would carry the opening's facts across using machinery that is already
built and already proven for the author. Nothing needs to be re-recorded.

**Not yet decided:** whether the planner *should* receive the full ledger or a bounded subset. That
is a planning-payload decision, not a plumbing one, and it is not taken here.

---

## Trace B — does the selected card's identity travel alongside its action?

**No, and for a different reason than Trace A: the identity is never rendered into the request.**

**Measured in the captured request** (line 140):

```
Player action: The moment demands truth. Tell Julian what you've been holding back.
```

That is the card's **suggested action text** — the card's effect on what the reader submitted. The
payload at `app.js:102184` emits exactly two fields for this:

```js
'\nPlayer action: ' + String(act || '').slice(0, 250) +
'\nPlayer dialogue: ' + String(dia || '').slice(0, 200)
```

There is **no card field of any kind** in the planner payload — no title, no archetype, no
ordinary/Petition/Tempt distinction.

**The identity exists and is available at that moment.** `state.fateSelectedIndex` indexes
`state.fateOptions`, both live in story state (`app.js:19960`, `19513`), and the deck control's own
capture shows the pair recorded together at selection time:

```json
"after": {"selectedIndex": 2,
          "act": "I step close enough that the stone warms between us",
          "dia": "Ask me again, slower."}
```

So the planner could be told which card was played; it simply is not. The card reaches planning
only as text the reader may since have edited, which means a planner cannot distinguish "the
reader chose Silence" from "the reader happened to type something quiet".

**This is NOT a consequence of the missing `STORY LEDGER` heading.** Trace A is a missing *section*
fed by a different commit path; Trace B is a missing *field* next to one that is already emitted.
Two channels, two causes, two fixes.

**Reuse path, no new store:** render `state.fateOptions[state.fateSelectedIndex]`'s label (and its
ordinary/Petition/Tempt kind, which `_sceneLedgerCommit`'s `useKey` path already distinguishes)
beside the `Player action` line that is already there.

---

## Scope of what is claimed

Both traces are read off one captured outgoing planner request and the code paths that build it.
Neither fix is implemented. No memory store is proposed — both reuse machinery that already exists
and already works for another consumer.
