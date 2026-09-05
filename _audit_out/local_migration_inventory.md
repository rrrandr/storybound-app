# Local artifact inventory — what was committed, what was not, and how to move it

Companion to `_audit_out/migration_handoff_2026-09-04.md`. **Contains no secrets** — no keys,
tokens, hosts or values, only file paths and variable names.

Written while sorting a working tree that held **1,706 untracked files (115.6 MB)** plus 8,372
ignored ones. Nothing was added blindly; every candidate was classified, and every commit was
secrets-scanned before it was made.

---

## 1 · Committed during this pass

| commit | what | files |
|---|---|---|
| `fab02f7` | `_drafts/` — Ministral routing patches recovered from `/private/tmp` | 3 |
| `86ccb25` | `public/starter-scenes.js` — **live production code, never tracked** | 1 |
| `e81dc33` | probe / validation / audit harnesses | 471 |
| `efdade8` | audit reports and evidence artifacts | 101 |
| `9751d17` | in-flight edits to tracked files, incl. `vercel` ^56.3.2 → ^59.5.0 | 11 |

**Secrets scanning.** Every staged set was scanned for JWTs, OpenAI/xAI/Anthropic/Stripe/Replicate
key shapes, `Bearer` literals, generic `key|secret|token|password` assignments, and Supabase
project hosts, with matches in `process.env` / documented-dummy / placeholder contexts allowed.
**The scanner was first verified against planted samples** — it detected both a fake `sk-` key and
a fake JWT — so a clean result means the scan works, not that it is blind. No unexplained match
was found in any of the 587 committed files.

---

## 2 · NOT committed, and why

### 2.1 Bulk generated output — 110 MB

| path | files | size |
|---|---|---|
| `_validate_out/` | 1000 | 68.52 MB |
| `_frozen/` | 20 | 20.18 MB |
| `_quarantine/` | 69 | 17.22 MB |
| root `*.json` over 250 KB (2) | 2 | 1.34 MB |
| `public/assets/test-mouths/*.png` and other binaries | 4 | 0.90 MB |
| `_audit_out/routing_audit.json` | 1 | 0.63 MB |
| per-run capture dirs (`_grok_isolated*`, `_paid_scene1_*`, `_contwindow_out`) | 4 | 1.35 MB |
| root `*.log` | 32 | 0.32 MB |
| root `*.bak` | 1 | small |

These are **reproducible outputs of committed harnesses**, not inputs to anything. `_frozen/app.js`
(19.96 MB) and `_quarantine/uncommitted-tracker-code-2026-06-11/app.js.with-tracker.bak`
(15.69 MB) are whole-file snapshots of `public/app.js` at past moments — git already holds that
history better than a copy does.

**If you want them anyway** (they are evidence for past runs and cannot be regenerated identically,
because model output is not deterministic):

```
# from the OLD Mac, before wiping — adjust the destination
tar -czf ~/Desktop/storybound-local-artifacts.tgz \
    -C ~/storybound-app _validate_out _quarantine _frozen \
    _grok_isolated _grok_isolated_dry _paid_scene1_v2 _paid_scene1_compliance \
    _contwindow_out _audit_out/routing_audit.json

# on the NEW Mac
tar -xzf ~/Desktop/storybound-local-artifacts.tgz -C ~/storybound-app
```
Expect ~110 MB before compression. Nothing in the repo depends on them; they are read only by
the reports that already cite their numbers.

### 2.2 Never copy through the repo — credentials

| path | contents | how to restore |
|---|---|---|
| `.env.local` | provider and Supabase credentials | **Password manager only.** Never commit, never email, never paste into a chat. Recreate by hand on the new Mac. |
| `.vercel/` | linked-project metadata and tokens | Recreate with `npx vercel link`; do not copy. |

The variable *names* the code reads are discoverable from `api/config.js` and the proxy handlers —
those names are not secrets, the values are. Regenerate any key you are unsure about from its
provider dashboard rather than moving it.

### 2.3 Machine state — do not move

`node_modules/` (8,363 ignored files) — rebuild with `npm install`.
`.vercel/`, editor state, OS caches — recreate on demand.

### 2.4 QUARANTINED — decisions I would not make for you

Three **pending deletions** were staged by nobody and committed by nobody:

```
D  public/assets/Fatelands/The_Answer_Anchor_v1.jpg     ← a committed production asset
D  _planner_probe_corridor/EVIDENCE_ROUND3.md
D  _planner_probe_corridor/EVIDENCE_ROUND4.md
```

They are deleted in the working tree but still in `HEAD`. Committing that would remove a shipped
image and two evidence documents; discarding it would resurrect files you may have removed on
purpose. **Either is a decision, and a migration is the worst moment to guess.** They survive in
git regardless, so nothing is lost by leaving them pending.

- to keep the deletions: `git rm public/assets/Fatelands/The_Answer_Anchor_v1.jpg _planner_probe_corridor/EVIDENCE_ROUND3.md _planner_probe_corridor/EVIDENCE_ROUND4.md && git commit`
- to undo them: `git checkout -- public/assets/Fatelands/The_Answer_Anchor_v1.jpg _planner_probe_corridor/`

No file was found to contain a secret, so nothing was quarantined on those grounds.

---

## 3 · The one thing to do before wiping the old Mac

Everything needed is now in git **except** `.env.local` and, if you want them, the bulk artifacts
in §2.1. In order:

1. Confirm the branch travelled: on the new Mac, `git log --oneline -8` should show `9751d17`
   at the top and `9b82320` (the quota governor) below it.
2. Recreate `.env.local` from your password manager.
3. Optionally restore the artifact tarball from §2.1.
4. Work through the setup checklist in `_audit_out/migration_handoff_2026-09-04.md` §9.

**This branch has not been pushed.** If the new Mac clones from a remote instead of copying the
working tree, none of these commits will be there. Either push it first, or copy
`~/storybound-app` wholesale — the `.git` directory included.
