# Corridor sample, round 5 — after `b5556dc` (generalised envelope reconciler)

One sequential corridor planner-only sample. **$0.00271 · 1 attempt, no retry · 0 Grok requests
dispatched · 0 escaped.**

**Result: REJECTED** — *staged character "Mateo" is not on the allowed roster [Lirael]*

## The structural problem is solved

The reconciler did its job. `envelope: NORMALISED (nested skeleton lifted)`, and
`staged_characters` was read successfully — `["Lirael:IN_PERSON","Mateo:IN_PERSON"]`. Placement
drift no longer blocks anything, and this is the first corridor sample to reach the roster
validator with its staging fully legible.

Everything else was also correct:

- `opening_setting`: `"abandoned infirmary"`
- `environment_elements`: `["rotting wooden beams", "shattered glass skylight", "dust-choked air", "half-collapsed wall"]` — four concrete, distinct, **none copied from the prompt**
- E+ `{shattered glass skylight, damage}` — a declared element
- fusion `{Lirael, shattered glass skylight, "she reaches toward it, fingers brushing the jagged edge, and pulls back with a hiss"}` — concrete
- C+: exactly one entry, for Lirael, `first_mention=true`, *"coughs into her sleeve, eyes locked on the skylight"*
- Julian excluded; zero angle-heuristic rejections
- Scorecard: `inline/product agreement: CONSISTENT`

## The planner invented an identity despite the exact enumeration

Verified in the dispatched request — the enumeration was delivered, unambiguously:

```
"name": "<EXACTLY one of: Lirael>"

ALLOWED CHARACTER ROSTER (1) — the ONLY people you may stage:
  • Lirael  (narrator (always staged))
```
plus *"You may NOT invent a person"*, *"these are the ONLY permitted identities"*, and the
presence-only rule.

The raw `staged_characters` returned:

```json
[
 { "name": "Lirael", "presence_mode": "IN_PERSON", "role_to_protagonist": "warden" },
 { "name": "Mateo",  "presence_mode": "IN_PERSON", "role_to_protagonist": "former groundskeeper" }
]
```

**The roster rule was not weakened, and the plan was rejected.**

One detail worth noting: the planner gave a C+ beat **only to Lirael**, not to Mateo. It followed
the "one C+ per staged IN_PERSON entry" rule imperfectly, but it did not try to use the invented
character as a C+ recipient — the invention is confined to staging.

## Assessment

This is the first failure in this series that is **not** ours. Every prior corridor rejection
traced to a container, a template omission, or a placement mismatch. This one is the model
declining an explicit, enumerated, single-name constraint — three separate statements of it, in the
template it fills.

The plausible reason is scene pressure rather than misunderstanding: the mission is a solitary
one ("waits alone… rehearsing what she will say to Julian"), the planner chose an abandoned
infirmary, and it appears to want a second body for the scene to have an interaction. A one-person
roster and a scene that wants two people are in tension, and the model resolves it by inventing.

I am not proposing a fix, per your instruction. The options I can see, for your decision:

1. **Accept it as a hard failure** — a one-person roster means a one-person scene, and a planner
   that invents is rejected. Costs some corridor openings.
2. **Give the corridor roster more legitimate candidates**, so the planner has a sanctioned way to
   populate a scene that needs one. This is a product question about where corridor side-cast comes
   from, not a prompt patch.
3. **Sample again** to establish a rate — one refusal is not a frequency. ~$0.003 per sample.

## Status

- Free suites: delivery **116/116** · universal **72/72** · compat **12/12**.
- Seeded First Sacrifice: **2/2 accepted** and untouched throughout.
- Corridor: all structural and template causes eliminated; one behavioural refusal remains.
- Total probe spend to date: **$0.0338**. Zero Grok requests ever dispatched.

No production code changed in response to this sample. No paid prose run. Nothing pushed.
