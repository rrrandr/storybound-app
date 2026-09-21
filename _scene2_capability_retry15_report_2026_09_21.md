# Scene 2 Capability Retry #15 (2026-09-21, quality retry after actor/pressure-source separation)

Authorized scope: same Boundary input, deterministic event-frame resolver active (Boundary →
`family_accusation`), actor/pressure-source separation active, LI PRESENCE FLOOR directive
active, all standing gates active, $0.45/8-request ceiling, no follow-up retry on failure.

## Result: the best real sample yet — AND a real harness capture bug that nearly hid it

The replay script's own tracking (`report.json`) recorded the author call as
`status: null, "no usage block returned"` and exited believing the scene was never captured.
**This was wrong.** The app's own browser console confirms the scene generated successfully
(`[CG:SCREENPLAY] generated via grok/grok-4-1-fast-reasoning`, cost `$0.0847`), and the raw
network-gate log (`run_1789975467864.jsonl`, entry 341) contains the complete, real, HTTP-200
response body — the script's own higher-level call-tracking simply failed to correlate it. The
real content was recovered directly from that raw log (not reconstructed, not hand-written) and
saved to `scene2_raw_response_retry15.txt`.

**Fully corrected total real cost: $0.13614335** — not the $0.0108684 the script's own
`report.json` claims. This figure was itself corrected TWICE: a first pass (immediately after this
run) found $0.0955956 by manually recovering the planner + author calls from the raw log; building
the dry regression control for this fix (`_e2e_network_gate_response_correlation_control.mjs`)
then surfaced that TWO MORE real calls that run — a `ministral-8b-2512` call ($0.0006303) and a
`gpt-4o` call ($0.0399175), both real post-processing steps — were ALSO missed by the same
in-memory tracking gap. The complete, reconciled total (4 real calls: planner $0.0108684 + author
$0.08472715 + ministral $0.0006303 + gpt-4o $0.0399175) is $0.13614335, still well under the $0.45
ceiling. This harness bug is a genuine, separate finding from the content evaluation below — see
"Harness bug" section.

## Evaluation against the six authorized questions

**1. Does the planner set the objective actor to Lirael, not Seren's family or the assembly?**
Yes, cleanly, first try: `"local_objective_actor": "Lirael"`.

**2. Does it preserve Seren's family as `pressure_source` / social pressure?** Yes:
`"pressure_source": "Seren's family"` — the new field, used exactly as designed, on the very
first real draw since the fix.

**3. Does it pass `_validateLocalObjective` and the planner gates?** Yes — one real planner
dispatch, no rejection, no retry needed; the plan reached the author on the first attempt.

**4. Does the scene preserve the `family_accusation` frame and continuity/canon/OAS history?**
Yes. Three unnamed family members step forward and, through the presiding Dohkar as
intermediary, formally demand remedy ("She has paid for another's desire. We ask for remedy.").
Continuity intact: mouth-band torn away (wardrobe), The Answer held (prop), Seren kneeling
composed (consistent with `twist_manifested`), the Dohkar asserting rite authority ("The rite
remains mine to preside" — consistent with `inquiry_authority_claimed`) while explicitly NOT
opening the inquiry itself ("I feel the path to the inquiry already forming" — movement toward
it, not the reserved event). No reserved id (`price_identified`, `inquiry_opened`,
`julian_counter_wish`, `julian_obscuring_wishes`) is touched.

**5. Does Julian get at least one meaningful moment without hijacking the scene?** Yes — and this
is the first real sample where the LI PRESENCE FLOOR directive clearly worked as intended. Julian
never speaks and never acts to resolve anything (no hijacking, no rescue), but:

- He gets his own panel with its own dramatic question: "Will Julian's stillness break into a
  visible reaction?"
- "Julian has not moved, but his stillness feels different now." (beat 14) — restrained, anchored.
- "His silver Weave-Script catches the light like a held breath." (beat 15) — a genuinely
  well-grounded craft choice: Weave-Script is this world's own established EMOTIONAL TELL
  mechanic (per Fatelands canon), so this is Julian's canon-consistent body registering something
  he won't say aloud — restraint made visible through world-native mechanics, not generic prose.
- "His gaze meets mine across the ring." (beat 21), paired with Lirael's own "my breath catches
  and holds" — a real charged beat between them, mid-scene, without derailing the family
  confrontation.
- "Julian has not spoken. / But his stillness asks the question anyway." (beats 25-26) — his
  restraint is treated as narratively meaningful pressure, not absence — precisely the "charged
  silence that changes the room" the directive asked for.

`_detectLIPresenceFloor(this scene, {liName:'Julian'})` would correctly NOT flag this scene
(anchored beat present via "stillness"). This is the LI PRESENCE FLOOR directive's first real,
positive confirmation.

**6. Does the scene end with a real player pressure/choice?** Yes: `decisionGateBeatIdx: 28`,
closing on "Claim the interference openly, or let the assembly keep its assumption." — matching
the row's own `decision_axis`, same shape as every prior accepted plan.

## One real, minor quality note (not a gate/architecture failure)

Beat 9's dialogue is attributed to `"speaker": "the presiding Dohkar"`, but its own narration text
reads `"The wish was meant for our daughter," one says, voice steady` — "one" implies a family
member is speaking, not the Dohkar. This is a small internal inconsistency between the beat's
prose and its structured speaker tag, worth noting honestly. It does not affect any gate or
validator (speaker attribution isn't checked there) and does not change the scene's overall
success — but it is a real, specific craft gap, not glossed over.

## Harness bug (separate finding, not a content or architecture problem)

`_scene2_repair_replay_sample.mjs`'s own call-tracking failed to correlate the author call's real
200 response — recording `status: null` and exiting via its "never settled" path even though the
response existed, in full, in the same run's raw network log. This is a **capture bug in the
replay script/network-gate layer**, not evidence about the app, the model, or any of this
session's prompt/gate changes. Practical consequences of this bug: (a) the script's own cost total
under-reported real spend, initially by $0.0847, then found to be $0.1253 once two more real calls
were located; (b) `scene2_raw_response.txt` was never written automatically; (c) recovering the
real content required manually reading the raw `run_*.jsonl` log entry-by-entry rather than
reading the script's own output. **Fixed in a follow-up dry pass** — see
`_scene2_repair_replay_sample_harness_fix_trace_2026_09_21.md` — root-caused to a URL-string-only
response correlation bug in `_e2e_network_gate.mjs` (fixed to match by Playwright request-object
identity) plus a persisted-log reconciliation safety net added to the replay script itself.

## Cost

$0.13614335 real total (fully corrected — see above) — 4 real calls, well under the $0.45
ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789975467864.jsonl` — full raw request/response log
  (contains the author's real response at entry 341, which the script's own report missed).
- `report_retry15.json`, `console_tail_retry15.txt`, `partial_tracked_calls_retry15.json` — the
  script's own (incomplete/misleading on cost) outputs, preserved as-is for the record.
- `scene2_raw_response_retry15.txt` — the real generated scene, recovered directly from the raw
  log (not reconstructed or hand-written).
- Fixed-name fixture files confirmed clean via `git status` before the run, restored via
  `git checkout --` immediately after (verified clean again).

## Honest classification

This is the strongest real sample this session: architecture held, actor/pressure-source
separation worked cleanly on the first draw, and Julian got a genuine, restrained, canon-grounded
moment — closing the specific gap retry 13 exposed. It is undercut only by a real, separate
harness bug in cost/capture tracking that has nothing to do with content quality, and one small,
honestly-noted speaker-attribution inconsistency in the prose itself. This sample is closer to
"finished content" than any prior one, but remains ONE sample — not yet proof the pipeline
performs this well reliably across draws.

## Status

No follow-up retry run, per standing instruction. Report written and committed. Stopping here.
