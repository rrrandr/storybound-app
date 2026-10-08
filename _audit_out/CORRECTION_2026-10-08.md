# Two completion claims withdrawn (2026-10-08)

My consolidated report contradicted `_audit_out/replay_lifecycle4.log`. Both corrections below
come from that log, not from further inference.

## 1. Call 7 is not the entrance reply — withdrawn

```
line 41   turn 1 — author call 7 — exchange 1 of 6
line 42   rendered replies 2 vs MODEL-BACKED 1
line 104  rendered replies 7 vs MODEL-BACKED 6
```

A reply **already existed** before turn 1 (2 vs 1), and the run ends with **seven rendered replies
and six attributed**. So call 7 follows a new card submission and cannot be the entrance reply. My
"crediting it separately would double-count the same exchange" was inferred, not read. The entrance
reply is a **seventh rendered reply that nothing attributed.**

Where the entrance calls actually fall, from the same log:

```
entered via entrance submit (trusted click)
the gate asked for payment — confirming through its own control
call 1  grok-4-1-fast-reasoning  |  call 2  ministral-8b-2512     <- BEFORE the confirmation
after the confirmation: {"unlocked":true,"setupComplete":true,"dialogue":true}
call 3  gpt-4o-mini | call 4 ministral | call 5 grok-non-reasoning | call 6 gpt-4o-mini
```

Calls 1–2 sit between Submit and the gate confirmation, so they belong to the unlock's deferred
initialization, not to the reader's answer. The entrance reply therefore comes from calls 3–6, and
the runner's attribution never looks there — it begins at the loop. That is the unexplained gap. I
am not guessing which of 3–6 it is.

## 2. The handoff is reached — withdrawn

The same run prints **both**:

```
*** STOPPING AS PLANNED — ... resolved=true, archive=1, interruptionPresent=true ***
*** STOPPING BEFORE SCENE GENERATION — OAS handoff incomplete (resolved=true, archive=1,
    interruptionPresent=true, interruptionSubmitted=false) ***
```

Two predicates disagreeing inside one run, and I quoted the flattering one. A **mounted**
interruption is not a **completed** opening: the revised opening completes *without* a submission
and must then offer run/remain, and neither was verified. One authoritative completion predicate is
needed, built on production's completion-without-submission route where the package declares it —
not on the obsolete interruption-Submit requirement, and not on mere presence.

## 3. "The preload takes the process down" — withdrawn

I saw zero processes and `curl 000`, then named a cause. No exit code, signal or stderr was
captured, so nothing establishes *why* it vanished. The isolated test also needs the
**project-local** executable; the checked-in control still launches bare `vercel`, which is the
50.4.0 that was failing. Proper form: supervise the child and record executable, argv, pid, stderr,
exit code and termination signal, with provider access blocked.

## The acceptance target, unmet

| condition | state |
|---|---|
| six attributed exchanges **including the entrance** | **not met** — 7 rendered, 6 attributed |
| completed authored interruption | **not met** — mounted, not completed |
| run/remain available | **not verified** |
| repeated proxy reply-and-receipt round trips | **not attempted with evidence** |

No part of this is claimed as done.
