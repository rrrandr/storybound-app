# CROSS-STORY MEMORY — DECISION PROPOSAL v1

**STATUS: POLICY DECIDED 2026-09-03. Not built. No model calls. Build is not authorised.**
Written against `public/app.js` @ `9151da2`.

---

## 0 · Default: stories are isolated

This is already the behaviour and it stays the behaviour. `_relLedger()` rebuilds from empty
whenever `L.storyId !== sid`, and `_resetStoryState` now clears every C+ artifact. **No carry on
names, roles, appearance, or inferred similarity.** Two stories with a "Mara" do not share a Mara.

Inventing continuity between unrelated stories is worse than having none: a reader meets a
stranger who acts as though they have history, and nothing in the product explains why.

---

## 1 · Identity creation

Carry requires an explicit, durable **persona link** — a first-class record, not a match rule.

- Created **only** by deliberate user action on a character that already exists in a finished
  story ("carry ⟨character⟩ into a new story"). Never minted by the engine, never by a model.
- Shape: `persona:<uuid>` → `{ sourceStoryId, sourceCanonicalId, label, createdAt, scope, revokedAt }`.
- A new story that adopts a persona gets a **local** entity stamped with `personaId`. The story
  still owns its own ledger; the persona is the link, not a shared mutable store.
- One persona may seed many stories. A story never writes back into the persona automatically —
  promoting new canon into it is a second, separate user action.

---

## 2 · Consent and scope

Scope is chosen at link time and stored on the link. Proposed default, narrowest useful:

| carries | does not carry |
|---|---|
| facets the reader actually **saw** — `disclosureStatus: 'revealed'` with `verifiedCount ≥ 1` | latent truths the reader never met |
| the character's **label** and canonical facet ids | relationship edges to other characters |
| `continuityClass: 'recurring_signature'` markers | plot facts, event facts, scene history |
| — | anything marked `publishedWithConflict` |

Rationale: a persona is *who this person is*, established on the page. It is not *what happened*
— that belongs to the story it happened in. Carrying a contradiction forward would propagate a
known defect into a clean story.

The reader is told, in plain language, what carries before they confirm.

---

## 3 · Deletion and reset

- **Revoke** sets `revokedAt`. Future stories adopt nothing. Stories that already adopted keep
  their own local copy — pages the reader has read cannot be unwritten, and pretending otherwise
  would be a lie about what they saw.
- **Delete** removes the persona and its carried canon from the index. Same rule for already-told
  stories: their local ledgers are theirs.
- Both are reachable from the character's own surface, not buried in settings.
- No silent expiry. A persona that is never used stays until deleted.

---

## 4 · Generated versus seeded characters

They are not equally identifiable and must not be treated alike.

- **Seeded** (`role:first_sacrifice_presiding_dohkar`): canonical, authored, stable across
  stories that share the seed. Safe to link — the identity was authored by a person.
- **Generated** (`ent:mara dunn`, `named:mara_dunn`): the id is a **slug minted from prose**.
  It is not an identity; two people can answer to it. This is the codebase's existing rule
  ("a name is not a ref") and it holds harder across stories than within one.

**Proposal:** generated characters may be linked, but only by explicit user action naming *that*
character in *that* story, and the link stores `sourceStoryId + sourceCanonicalId` — never the
slug alone. A slug collision across stories must never resolve to the same persona.

---

## 5 · Acceptance tests (to be written only if this is approved)

Every one identity-pinned, through the real path, with a control observed to fail:

1. **Isolation holds by default** — a new story after a finished one adopts nothing; the prior
   `{canonicalId, facet_id}` is absent. Control: removing the story stamp check makes it appear.
2. **A persona carries only its scope** — a `revealed`+`verified` facet arrives; a `latent` one
   and a `publishedWithConflict` one do not, named individually.
3. **Slug collision does not link** — two stories each containing `named:mara_dunn`, with no
   persona, share nothing. Control: matching on slug makes them share.
4. **Revoke is forward-only** — after revoke, a new story adopts nothing while the already-told
   story still reads its own copy.
5. **Delete removes the carried canon** from the index, and no orphaned persona reference
   survives in any story that adopted it.
6. **No model call** is made by any of it.

---

## 6 · DECIDED — v1 scope

Deliberately narrow. Recorded 2026-09-03.

1. **Carry recurring signatures only, and only when `revealed` AND `verifiedCount ≥ 1`.**
   Narrower than the table in §2: an episodic revealed facet does NOT carry in v1. What crosses
   a story boundary is a standing signature the reader has actually seen more than once.
2. **Any character may be linked.** The explicit user action is the safeguard — not a whitelist
   of roles. A person choosing to carry someone is the consent.
3. **Linking lives on the finished-story character sheet.** Revocation gets a library view later;
   it is not required for the first version but the link must be revocable from day one.
4. **A persona is FROZEN at creation. No write-back in v1.** A later story may adopt it and may
   develop that character locally, but nothing flows back. Promotion, if it is ever wanted, is a
   separate feature with its own consent.

Everything in §5 remains the acceptance bar, with test 2 tightened to the rule in (1):
an episodic revealed facet must NOT carry, named individually alongside the latent and
conflicted cases.

**Cross-story work stops here.** No implementation is authorised.
