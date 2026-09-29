# CONTRACT v2 — GENERALIZATION AUDIT (free, no code, no calls) · 2026-09-06

Question: the 18-plan evidence is First Sacrifice only. Does the v2 contract apply where it should
and stay out of the way where it must, across the materially different stage shapes the codebase
already has? Evidence: the last green dry-suite run (`_stage0_out/dry_suite_v2_tight2.log`,
403 passed · 0 failed), the stage-contract code (`app.js` 126952–127730), the seed inventory, and
the resolver's activation rule.

## 0 · The activation rule, read from the code

The id contract (element ids, E+ by id, `{TARGET}` beats, derived opening act, derived single-fact
evidence, no realizations) is active iff **`_stage.environmentOwner !== 'planner'` AND the stage
offers a grounded object list** (`_cpContract.objects.length > 0`, which is populated only from
`seed.sceneOne.groundedObjects`). Everywhere else the request, normaliser and validators run the
pre-v2 free-text contract plus the validator repair. **Inventory: exactly one seed authors
`sceneOne` / `groundedObjects` / `owner_ref` / `roleInstances` — First Sacrifice.** First Taste,
Glass House and Famous Fate have no `sceneOne`; their Scene 1 resolves through an assignment row
or the planner, i.e. planner-owned environments.

## 1 · Generalization matrix

| stage shape (existing, exercised by the suite) | environment owner | objects | v2 id contract | multi-fact selection | single-fact derivation | owned prop + competing possessive | evidence it behaves |
|---|---|---|---|---|---|---|---|
| **First Sacrifice, seeded** (`sceneOne` + 7 grounded objects, O4/O5 owned by the PC) | seed | 7 | **ON** | Seren OPT-2/3/4 (E3,E4): planner must choose; wrong-option case rejected (`contemptOverJealousyEvidence`) | Dohkar OPT-6..10 (one fact each): derived, typed E6 replaced + logged (`v2EvidenceDerived`, V13) | "the Dohkar's sash" → fault; "his sash" **not** caught (see §2) | PART V 1–13, PART W 1–8, 7+4 hostile cases, 18-plan replay |
| **Seeded + injected Dohkar kindness fact** (`kindnessScene`) | seed | 7 | ON | Dohkar gains a second establishable facet; guardrails scoped per facet | derivation unchanged | same | `caringOnContemptFacet` rejected, kindness twin silent (X11/X12) |
| **Assignment-owned duo** (`test_duo`: fixed WHERE "customs house", Lirael+Seren, one eventFact, no objects) | planner (elements declared by the planner) | 0 | **OFF — free text, correctly** | n/a (one fact) | rule is generic code; no observable difference | no owner data → possessive check inert | S9 green: two-person stage keeps interlocutor_placement, offstage LI not staged |
| **Unseeded generated portfolio** (`test_genpf`: Marcus Vale from the `generated_cast` provider, one eventFact) | planner | 0 | **OFF — free text, correctly** | options composed from five generated facets, one fact each | derivation generic | none | PART X0a–X13b green end to end: one truth to Grok, no ids/evidence machinery leak |
| **Solo corridor** (no seed, `_scene1Mission`, narrator-only) | planner | 0 | **OFF — free text, correctly** | n/a | n/a | none | PART S1–S10 green: no second person demanded or accepted; memory/letter/wind ALLOWED; live voice/messenger REJECTED |
| *Hypothetical:* a future seed with `sceneOne` but no `groundedObjects` | seed | 0 | OFF by the objects clause | — | — | — | not a shipped shape; the clause exists so it cannot demand ids that do not exist |

Reading: the contract applies exactly where a seed has authored the ids it asks the planner to
select, and nowhere else. No shape regressed: the same 403/0 run contains the free-text parts
(S, X, duo) and the id parts (V, W, tables).

## 2 · The `his sash` leak — isolated

**Can it reach the author-visible directive under the current contract? Yes, through four fields.**
The planner still writes free prose in `opening_beat` (injected verbatim into the blueprint,
`app.js:265956`), `character_plus.visible_action` (rendered as "VISIBLE ACTION — MUST OCCUR",
`96546`), and the text around `{TARGET}` in `environment_plus.beat` and `pc_opening_fusion.beat`
("{TARGET} at his waist" → the substituted sash "at his waist"; or "his {TARGET}"). The current
ownership check matches only `<OtherLabel>'s <head>` / `<FirstName>'s <head>`; a pronoun
possessive is untouched. `_cpUngroundedProp` is irrelevant (its implement list is blades, pins and
the like; "sash" is not in it). The narrator now tells the author "the presiding Dohkar wears
none", which is persuasion, not enforcement. In retest #2, three of six plans put a sash on the
Dohkar in `visible_action` — all three would render today.

**Narrowest generic enforcement (design only, not implemented):** *owner-scoped possessive
resolution* — a check that fires only on owned heads, only in author-visible planner fields, and
only when the pronoun resolves to a person who is not the owner.

1. **Scope.** Heads of objects with `owner_ref` ≠ `all` (today: band, sash). Fields: the four
   above plus `pc_interpretation`. Nothing else is scanned — no global pronoun matching.
2. **Possession patterns.** (a) `\b(his|her|their|my)\b(?:\s+\w+){0,2}\s+<head>\b`;
   (b) `<head>\b[^.;]{0,30}\b(?:at|on|around|across)\s+(his|her|their|my)\s+(waist|hip|neck|
   shoulder|mouth|arm|wrist|hand)s?\b` (attachment to a body). For (a), the 0–2 token window must
   not contain a verb of transfer (`gave|handed|passed|offered|showed|tied|tugged|pulled`) so that
   "handed her the sash" is not read as possession; `his`/`their`/`my` are unambiguous possessives,
   `her` is checked only with that exclusion.
3. **Resolution — by field subject first, gender second, never by proximity.**
   `visible_action` → the entry's character. `opening_beat` → `opening_actor_id` (null →
   unresolved). `pc_opening_fusion.beat` and `pc_interpretation` → the PC for `my`; `his/her` →
   gender step. `environment_plus.beat` → gender step only. Gender step: if exactly one on-stage
   person other than the owner has the pronoun's gender, attribute to them; otherwise
   **unresolved → log, no fault**. Gender comes from the stage roster (PC and LI genders are
   already in state; seed `roleInstances` would need a `gender` field — the Dohkar has none
   today, so until it is authored his pronouns resolve only through field subject).
4. **Fault** only when the attributed person ≠ owner: `"<field>" gives the <head> to <person>
   ("his sash") — the seed says it is <owner>'s`. Ownership by the owner ("my sash" in the PC's
   fusion) and handling by others ("her fingers on the sash", "handed her the sash") pass.
5. **Cost.** Validator-only, 0 prompt bytes; seed data: one `gender` per role instance for the
   gender step. Controls: hostile "his sash" in a Dohkar `visible_action` (rejected via subject),
   "handed her the sash" (accepted), "my sash" in the PC fusion (accepted), "his {TARGET}" in the
   E+ beat with the Dohkar the only male on stage (rejected via gender), same with two males
   (unresolved → logged, accepted).

## 3 · Is the current contract safe for generic rollout?

**Safe in the narrow sense: yes.** Activation is data-gated, every free-text shape the codebase
ships (starter without `sceneOne`, assignment-owned, generated, corridor) runs the unchanged
free-text contract plus the repaired validators, and the suite proves it. The valve is opt-in and
the default abort is unchanged everywhere.

**Complete in the generic sense: no, and it is worth saying plainly.** The v2 *benefits* exist
only where a seed authors `groundedObjects` (with `owner_ref`/`head`) and per-beat `eventFacts` —
today, one seed. A second seed adopting v2 needs those three authored blocks and nothing else;
the code paths are generic, the data is not. The `his sash` class is open on every shape that has
owned props, which is again only First Sacrifice today.

## 4 · Exact remaining prerequisites for authorizing the six-call 14B retest

1. **Decide the `his sash` question:** either (a) implement the owner-scoped possessive rule above
   with its five controls before the run (free; recommended — an accepted plan with a wrong-owner
   pronoun would otherwise count toward the bar with a canon error inside it), or (b) run without
   it and have the blind readers flag wrong-owner pronouns explicitly, treating any such plan as a
   rejection for the bar. One of the two must be chosen; the run should not proceed with neither.
2. If (a): the Dohkar's `roleInstances` entry gets `gender: 'male'` (seed data, one field) so the
   gender step can resolve him in the E+ beat; without it only field-subject resolution works.
3. Fresh blinded readers identified — nobody who has read `retest_14b_result.md`,
   `retest2_14b_v2_result.md`, or `planner_contract_v2_tightening.md` §4.
4. Procedural, unchanged: six calls, $0.05 ceiling, valve off, drafts applied for the run and
   reversed, bar ≥ 4/6 with no genuine fault class on > 2/6, and the act-gate rate and the
   OPT-10 selection rate reported separately.

Nothing here changes a file under `public/`, `api/` or the seed; no provider was called.
