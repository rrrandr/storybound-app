# Arm 1 artifacts — what each file actually is

`ARM1_planner_response_raw.json`  — the OPENING PLANNER's response (the paid call,
receipt $0.027477, grok-4.3, in 18,775 / out 916). Coherent, but it did NOT pass validation.

`ARM1_repair_request.json`        — the REPAIR request production then assembled. NOT the
planner request. 6,323 bytes vs the planner's ~80KB.

`opening_planner_request.json`   — MISLABELLED BY THE HARNESS. It holds the REPAIR request:
the capture wrote on every prompt matching /scene-structure planner for the OPENING scene/,
and the repair prompt opens with that same sentence, so the second write overwrote the first.
THE ORIGINAL PLANNER REQUEST WAS LOST. Kept as-is rather than renamed, so nothing is
overwritten again; use ARM1_repair_request.json.

Repair is CONDITIONAL — triggered by this particular response's one fault. It is not a
mandatory second call for every opening.
