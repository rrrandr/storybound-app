# Catalog corrections — invoker scope, `testimony_closed`, unsupported costs, class mapping

> **Corrections and mapping only. No new class, no new outcome, no ranking, no coverage run, no
> implementation.**

---

# 1. Invoker exemption — the schema default is legacy, not authority

**Decision recorded (Roman, 2026-09-28).** `app.js:191251`'s default `exempt`/`invoker_anchor` is **legacy
behavior of the extractor schema. It is not authority for this design.**

### The compiler rule

1. **Expand every named population to its sealed roster.**
2. **If Lirael belongs to that roster, she receives the literal effect.**
3. **No extra phrase naming "self" is required** when ordinary set membership already includes her.
   *"Everyone here"* cannot silently mean *"everyone except the protagonist."*
4. **Exemption is allowed only when the authored outcome explicitly names it as part of the grant.**

### Why the schema's rationale does not override this

The schema justifies the default as: *"without it they could not experience or navigate the consequence."*
**That concern is real and is answered elsewhere, not by an exemption.** The reader retains the prior
timeline in RECORD and carries the dramatic knowledge; Lirael experiences the effect. **A protagonist who does
not know what the reader knows is a dramatic asset, not a defect** — it is the engine of the whole rewind.

Where an outcome genuinely needs her to keep an anchor, **the authored outcome says so**, and the exemption
becomes visible instead of automatic.

### What this does not change

The schema still requires targeting to be **recorded**, never silent — `status: targeted` with reason
`wish_explicitly_includes_self` or `ambiguous_wording_consequence`. **Membership-based targeting is declared,
not inferred**, which satisfies that requirement. The rule above removes a *default*, not the *record*.

---

# 2. `unm.testimony_closed` — **WITHDRAWN as a candidate**

**Not blocked. Withdrawn.** Retaining it as a precise-risk outcome "awaiting wording" would have implied it
was one authoring pass from viability. It is not.

**There is no procedural/institutional rupture carrier in the six-class vocabulary.** The nearest reach,
`identity_reputation.recordsChanged`, governs *what records say* — not what a proceeding may receive, hear, or
take. **`other` is a justification requirement, not a licence**, and using it here would assert a capability
the world has not been shown to have.

> **It requires a new product mechanism — a procedural/institutional rupture class — and therefore leaves the
> current six-class design.** That is a product decision, not an editorial one, and nothing in the opening set
> waits on it.

Everything specified for it (sealed roster, named channel, `endsWhen`, legible cost) is preserved in
`_unwitnessed_proposal.md` as a **record of a design that needs a mechanism**, not as a queued outcome.

---

# 3. Unsupported-consequence scrub

**The test:** does the cost or open fact assume a capability the catalog marks unproven?

## The sharpest line the catalog draws

**`relationship_social` has a `witnesses` field — *"who saw or now assumes it"*. `history_rewrite` has no such
field.** Public perception is licensed for social ruptures and **not** for history rewrites. That is the basis
for everything below, and it is a schema fact rather than a judgement.

| site | assumes | verdict |
|---|---|---|
| **`world_bent_in_public`** (cost of `unm.time_gives_way`) | *"the assembly watched Fate move around her"* — **public perception of a history rewrite** | ⛔ **BLOCKED.** `history_rewrite` licenses `priorHistoryReplaced` and `survivingContradictions`; **neither is witnessing.** Re-author through a cited class or drop the cost. |
| **`unm.time_gives_way` open:** *"whether any First Favored's alignment sense registers the bend"* | the same perception, softened into an open question | ⛔ **REMOVE.** An open fact that invites an author to assert an unlicensed capability is that capability with a question mark. Alignment-sense reads **wish misalignment** (16620), not ruptures. |
| `undefendable_by_witness` | institutional intake control | **withdrawn with §2** |
| `ward_implicated`, `own_account_unreliable` | — | **withdrawn with their blocked outcomes** |
| `escalation_invited` (`unm.standing_dissolved`) | that others treat Julian differently and factions react | ✅ **SUPPORTED.** `identity_reputation.recognitionChanges.howRecognized` is *"how others now recognise, name or treat them"* — public recognition **is** the field. Faction reaction cited at 231346. |
| `undefended` (`unm.the_shunning`) | others withhold support, witnessed | ✅ **SUPPORTED.** `relationship_social.affectedParties` carries `whatChanged` **and `witnesses`.** |
| `authority_vacuum`, `intimacy_unwitnessed`, `custody_unclaimed` (memory readings) | nothing beyond the grant | ✅ **SUPPORTED** — entailments of a licensed forgetting, not separate capability claims. |
| `custody_unclaimed` (`unm.custody_severed`) | as above, but the **outcome's own class is still unassigned** | ⚠ unchanged — see the ledger |

## One thing that survived the scrub, worth stating

**`ceremony.replayed_unquestioned` is not an extra capability.** `history_rewrite` licenses *"an event may be
made never to have occurred **when that is the wish and the scene delivers it**"* — the replay is **how the
scene delivers it**, and the established fact is the new history. Presentation and fact, correctly separated.

---

# 4. Class mapping for the two uncovered ask-classes

**Mapping only. No outcome is proposed, and the classes below are the only material any future draft may use.**

### `unseen` — *"I want to disappear"*, *"don't let them look at me"*

| | |
|---|---|
| **class** | **`memory_perception`** (`191220`) |
| **why it fits** | The ask is about **not being perceived**. The one licensed lever over perception is what parties know — `targetPopulation` + a disposition from the closed enum. |
| **available levers** | target `population.assembly` (kind `collective`) or `population.scene_present`; dispositions `forgot · retained · partial · suspects · resisted · exempt · absent` |
| **a target atom already exists** | **`twist.assembly_turned`** — *"the whole assembly turned to look at Lirael."* Forgetting **that** is forgetting the moment she became the thing everyone looked at, while the twist itself stays known. **The grammar and the atom line up without stretching either.** |
| **forbidden here** | `incoherent` or any effect outside the enum · fragmenting a collective into divergent versions (unproven, §1 of the catalog) · closing an intake (§2) |
| **secondary option** | `relationship_social` — but *"treated as absent"* is `solitude`'s territory and would collide with `unm.the_shunning` |

### `escape` — *"Let me out of this"*, *"I didn't do anything"*

| | |
|---|---|
| **primary class** | **`history_rewrite`** (`191271`) |
| **why it fits** | The ask is to be out from under a charge. The licence *"an event may be made never to have occurred"* reaches **the accusation or the demand itself** — the strongest cited answer available to this class. |
| **secondary class** | **`identity_reputation`** (`191277`) — `recordsChanged`, *"what social or institutional records now say"* about her conduct |
| **forbidden here** | the Answer proving anything about **Lirael's** conduct — `231513` prevents-clause, and `130922` makes the accusation *"procedural and cultural, not magical"*, i.e. exactly what the Answer cannot detect |
| **note** | `escape` and `stop` would both draw on `history_rewrite` with different targets. That is not a collision — ask-class selects first, and the targets differ. |

---

# 5. Standing position

| | |
|---|---|
| authorable | **6** |
| unfinished or blocked | **6** *(was 7; `testimony_closed` is withdrawn rather than blocked, and was never one of the thirteen)* |
| ask-classes uncovered | **2** — `unseen`, `escape`, both now **mapped to a cited class** |
| newly blocked | **`world_bent_in_public`**, the cost of `unm.time_gives_way` |

**No new class. No new outcome. No ranking. No coverage run. No implementation.**
