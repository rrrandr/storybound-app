# `_drafts/` — reviewable, uncommitted-to-production work

Patches here are **not applied**. They exist so that work which was deliberately kept out of a
scoped commit is preserved in the repository and reviewable in a diff, instead of surviving only
in a machine-local temp directory that a laptop migration would erase.

Each patch applies to the commit named in its header. To inspect one:

```
git apply --check _drafts/<name>.patch     # verify it still applies
git apply         _drafts/<name>.patch     # apply to the working tree (do NOT commit blindly)
git checkout -- <files>                    # undo
```

Applying any of these is a **routing decision**, not a cleanup step. Read
`_audit_out/migration_handoff_2026-09-04.md` §7 for the prerequisites and the gate.
