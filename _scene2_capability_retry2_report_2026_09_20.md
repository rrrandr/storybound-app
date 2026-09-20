# Scene 2 Capability Retry #2 — Real Result (2026-09-20)

Authorized retry (both root causes fixed and dry-proven beforehand — see
`_scene2_capability_test_root_causes_2026_09_20.md`), run once, foreground, same Boundary
card/Say-Do input as the original failed sample. This is capability evidence about the generator,
**not** a claim that the prose is approved or ready to ship.

## Real cost and usage

| Call | Model | Real? | Cost |
|---|---|---|---|
| scene2-planner | ministral-8b-2512 | new spend | $0.00056325 |
| scene2-structural-author | grok-4.3 (requested grok-4-1-fast-reasoning) | new spend | $0.08054465 |
| emotional-gravity audit | ministral-8b-2512 | new spend | $0.00062805 |
| image-style extraction | gpt-4o | new spend | $0.03868 |
| **Total new spend** | | | **$0.120416** |

4 physical requests — well under the $0.45 / ≤8-request ceiling. The OAS turn-reply and Fate-Card
calls in the log (`oas-turn-reply-replay`, `fate-card-replay`) are marked `"real":false` — replayed
from the already-paid original run, zero new cost, per the authorization sheet's scope.

Author call: `finish_reason:"stop"`, `prompt_tokens:53453`, `completion_tokens:4912`
(`reasoning_tokens:660`) — real headroom left unused, not a token-budget failure.

Full raw log (untouched, unique filename): `_scene2_repair_replay_sample_out/run_1789930729650.jsonl`.
Raw author response text, extracted to its own non-conflicting filename (does **not** overwrite the
original failed sample's fixed-name fixture files, which 4 committed dry controls still depend on
as their red fixture): `_scene2_repair_replay_sample_out/scene2_raw_response_retry2.txt`.

## Confirmed: both fixes fired correctly in the real live prompt

Grepped directly against the real dispatch (not assumed): the system prompt contained the full
"WORLD FACTS... HARD — BINDING" block with all 4 real `aftermathTruths` (including the Answer's
institutional-ownership text) plus 2 reserved constraints, and the user prompt contained the new
"CONTINUATION — AFTERMATH/CONSEQUENCE PACE" density line with zero occurrences of
`"LENGTH CEILING (HARD"` — correctly suppressed.

## `_detectSceneAdequacyFailure` verdict — FAILED

```json
{
  "failed": true,
  "reasons": [
    "no aftermath/procedure/consequence-movement signal found anywhere in the scene — reads as a single extended reaction beat, not scene progression"
  ],
  "checks": {
    "aftermath": { "present": false },
    "relicViolations": [],
    "ending": { "suspensionVocabPresent": true, "movementVerbPresent": true, "tailBeatCount": 5 }
  }
}
```

Root cause A's fix held: `relicViolations` is empty — the Answer is treated as a rite-object the
role requires her to hold ("I hold the Answer against my chest because that is what the rite
requires"), never framed as personal property or "my sacrifice." The ending also clears the
suspension-only check — beat 26 poses a real two-option forced choice ("I can let them believe the
interference was mine or name the one who truly directed it"), not just suspended mood.

But the aftermath/procedure check fails, honestly: 27 beats, 3 phases, and the scene never leaves
the immediate ritual-burn moment — no family reaction, no institutional procedure-setting (no
tribunal date, no summons, no formal accusation), no argument over authority. All 27 beats are
still `kind:"narration"` — zero `exposition`, zero `dialogue` — the beat-kind-diversity gap
disclosed (not fixed) in the root-causes doc. That gap looks causally connected to this specific
failure: aftermath/procedure in a scene like this is typically *delivered* through someone speaking
(a Dohkar naming a tribunal date, a family member accusing her outright) — with zero dialogue
beats, the model had no vehicle to deliver it even once it had the room and the facts to do so.

## Reading on the two fixes

Both fixes worked exactly as designed — they removed real structural obstacles (the binding-facts
gap, the setup-pace ceiling) and both are confirmed firing in the live prompt. The model used the
freed-up room to write *more* of the same kind of extended reaction sequence, not to move the scene
into aftermath/procedure territory. That is a real, disclosed result, not a soft one: two genuine
root causes are fixed, and a third gap (beat-kind diversity, specifically the total absence of
dialogue as a delivery vehicle for consequence) is the strongest remaining candidate — already
named, not newly discovered.

## Process note — a caught-and-fixed overwrite

Running `_scene2_repair_replay_sample.mjs` for this retry overwrote the FIXED-filename
`scene2_raw_response.txt` / `report.json` that 4 committed dry controls
(`_li_presence_dominance_repair_control.mjs`, `_scene2_continuation_adequacy_control.mjs`,
`_planner_author_contract_authority_control.mjs`, `_cg_continuation_pacing_control.mjs`) reference
as the original failed sample's unchanging red fixture. Caught immediately via `git status`/`git
diff --stat` before anything else was done; nothing had been committed in the overwritten state;
restored cleanly via `git checkout -- <those two files>`; confirmed via a follow-up `git diff
--stat` (empty). This retry's own content was then extracted from its own uniquely-timestamped
`.jsonl` log and written to a new, non-conflicting filename (above) instead. The script itself still
has this overwrite behavior — a real, disclosed gap worth fixing before any future replay run, not
addressed in this pass since it wasn't the specific ask.

## Status

Not shipped, not patched, not hand-authored. Preserved as a second real, failed capability sample
alongside the first. No further provider or image calls made beyond the authorized retry.
