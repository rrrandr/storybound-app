# VERDICT — live rejection-and-repair chain

> One scene call + one author-revision call, $0.15 hard ceiling, no fallback beyond the single
> repair. 11 other requests aborted.

# THE CHAIN MACHINERY IS PROVEN. THE GATE IS OVER-REJECTING.

The writer did nothing wrong in this run. **All three rejections were defects in my gate**, and
between them they would have blocked an acceptable scene from the reader.

---

## Financial control — exactly as designed

| | |
|---|---|
| reserved: initial | $0.128888 |
| reserved: one repair | $0.007350 |
| **chain reservation** | **$0.136238** vs ceiling $0.150000 |
| measured: scene call | $0.085462 (56,253 in / 5,584 out) |
| measured: repair call | **$0.002527** (611 in / 19 out) |
| **measured total** | **$0.087989** — inside the reservation and the ceiling |

The repair estimated **$0.003401 against $0.007350 reserved** and came in at $0.002527. Exactly two
requests reached the network; 11 were aborted. Nothing was mounted, and the DOM carried no trace.

---

## The writer's repair was CORRECT

It was handed one line and returned canon-perfect prose:

> was — *"The object does not glow or speak."*
> now — *"**Julian keeps the Answer in his hands.**"*

Its own reasoning shows it understood the task: *"The rewrite must remove any glow or shine from the
Answer… drop the phrase 'does not glow or speak' from line 2."* Physical presence only, no
negation, no residue. **That is the behaviour the recovery path exists to produce, and it produced
it on the first attempt.**

---

## Three defects in the gate, all mine

### 1. SCOPE — the gate scans app-injected art directives as if they were author prose

> *"a subtle cold glow bleeding from the discovery"*

This string **is not in the model's reply at all** — `grep` finds zero occurrences in the raw
response. It comes from **`public/app.js:179511`**, an entry in a comic-panel style table:

```
Revelation: { focus: [...], energy: ['low', 'a subtle cold glow bleeding from the discovery'] }
```

An app-chosen **image** directive, attached to the normalized plan. It is never author prose and
never reaches the reader as text. `_proseOf` flattens every string over 25 chars in the whole
normalized plan, so it swept this up.

**This made the rejection structurally unfixable.** The repair path replaces *beats*; a violation in
a panel directive cannot be repaired by definition. The gate rejected on something the recovery
path can never address.

### 2. NEGATION BLINDNESS — the author obeying was scored as violating

> *"The object does not glow or speak."*

The magical-residue scan matches the word `glow` regardless of negation. The author was **stating
the rule** and got flagged for it. Then the repair "fixed" a line that was never wrong — wasting the
one allowed repair call on a false positive.

### 3. C4 PARAPHRASE GAP, the fourth

The scene DID present the choice and hold it open:

> *"Stay silent and the assumption hardens into fact before the grass cools."*
> *"The choice is here now. **Speak or let the assumption stand.**"*

`CHOICE_ANCHORS` recognises *claim / say it / tell the truth / admit / confess / speak up / speak
out / speak through the seal* — but not the **bare imperative "Speak"**. Fourth paraphrase variant
after exact wording, split presentation, and the pending phrasing.

---

# What this run establishes

**Established:** the chained reservation, the two-call ceiling, the abort-everything-else routing,
the repair brief, the bounded splice, the gate recheck, non-persistence and reader-invisibility all
work under live conditions — for $0.087989 against a $0.15 ceiling. And the writer can repair its
own line correctly when asked properly.

**Established, unwelcome:** my gate currently produces false rejections on (a) app-injected art
directives, (b) negated prohibition words, and (c) an unrecognised choice paraphrase. In this run it
produced **three false rejections and zero true ones.** A gate that blocks good scenes is worse than
no gate — it makes the reader pay for the validator's mistakes instead of the model's.

**The fix is provider-free and clear:**
1. Scope `_proseOf` to **reader-facing prose only** — beats and captions — never art, panel, camera
   or style directives.
2. Make the residue and cost scans **negation-aware**, so stating a prohibition is not violating it.
3. Add the bare imperative to the choice anchors.

Not fixed. Reported first, per standing rule. **No further paid run without fresh authorization.**
