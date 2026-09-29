# Uncommitted tracker code — 2026-06-11

## What this is

When I went to commit the **Save & Exit** feature on 2026-06-11, the working
tree contained ~1583 lines of uncommitted app.js code I didn't write this
turn. It looked like pre-existing in-progress work (likely from the pre-
compaction part of the session, or carried over from before this session).
I extracted it here so it isn't lost, isn't silently buried in an unrelated
commit, and is available for you to either re-apply, refine, or discard.

## What's in the patch

The diff spans 9 distinct insertion regions and adds these symbols:

- `window._testFatelandsLighthouseResolver` — Fatelands lighthouse-resolver
  debug helper (computes locked-bond outputs for {broken_vow_bond, wrong_wish,
  syzygy, fold} given a set of locks)
- `window._inspectFatelandsPressureMenu` — prints Fatelands pressure-menu
  data (precedence, First-Favored roles, sacrifice/marriage-vow conflicts,
  fate-secured institutions, alignment-failure / consequence-revelation
  examples, forbidden patterns)
- `_classifyPanelComposition(prompt)` + `window._classifyPanelComposition`
  — classifies CG panels by composition (uses PC/LI names from state)
- `window._cgPanelTracker` — per-story panel records with `recordPanel`,
  `clearStory`, `getRecords`. Keeps a rolling 200-record buffer at
  `state._cgPanelRecords` and reports per-scene subject/camera/composition/
  emotional-beat distributions on flush.
- 4 detector functions reading from `_cgPanelTracker.getRecords()` (cast-
  bleed, drift, etc.) — not fully traced.

## Files

- `tracker-code.patch` — unified diff (git apply -compatible) against the
  current HEAD of public/app.js. Adds the symbols above without touching
  anything else.
- `app.js.with-tracker.bak` — full backup of public/app.js as it was
  before reset (Save & Exit AND tracker code).

## How to apply (when you're ready)

```bash
# dry-run
git apply --check _quarantine/uncommitted-tracker-code-2026-06-11/tracker-code.patch
# actually apply
git apply _quarantine/uncommitted-tracker-code-2026-06-11/tracker-code.patch
```

## How to discard

Just delete the directory. The tracker code is not in any commit and not in
the working tree.

## Why this is here, not committed

`_quarantine/` is the project's gitignored scratch space. Saving uncommitted
in-progress code here surfaces it for review without polluting either the
working tree or the git history.
