# Provider-free suite prerequisites

Everything the committed suites need from the repository is in Git. Two things they
need are **not** in Git, by intention, and this file records them so a clean checkout
fails with a clear reason rather than a confusing one.

## 1. A dev server on :3000

Every browser suite loads the application from `http://localhost:3000` and intercepts
each request from there. Override with `SB_ORIGIN`.

```
node _nf_local_api.mjs          # or the project's usual dev server
```

No suite reaches a provider: each one decides every request, serves the page and its
assets, fixtures only the model doors it needs, and aborts everything else — counting
both, so "zero provider dispatches" is a property of the interceptor rather than an
assumption about hosts.

## 2. The preserved RUN3 fixtures — EXTERNAL, not committed

Three suites read a preserved ten-scene paid run as their fixture. It lives outside the
repository and is **deliberately not committed**: it is bulk diagnostic output
(manuscripts, per-call request/response artifacts, console logs) and does not belong in
source control.

```
/Users/romantsukerman/storybound-diag/_nf_story_test_RUN3/run_2026-11-02T19-03-47-893Z_29351
```

Override the location with `SB_RUN_DIR`. The files actually read are:

| file | used for |
|---|---|
| `STATE_after_scene6.json` | the post-scene-6 checkpoint, installed as the browser's saved story |
| `STATE_after_scene10.json` | scene 6's own recorded verdict, copied verbatim |
| `requests.json` | per-door reservation and settlement figures, for cost arithmetic |

Consumers:

- `_nf_late_credit_accounting.mjs`
- `_nf_recovery_boundary.mjs`
- `_nf_comparison_prep.mjs`

Without the directory these three cannot run. They are not self-contained tests and
should not be read as such: they are regression checks against one preserved run.
`_nf_input_delivery_controls.mjs`, `_nf_author_setting_handoff.mjs` and
`_nf_reliability_controls.mjs` do not need it.

## 3. The pinned browser

```
node node_modules/playwright-core/cli.js install chromium    # npm run harness:browser
```

Not `npx` — see `project_playwright_pinned_install`.

## What these suites do and do not establish

They establish delivery, accounting and wiring: that a value reaches the payload, that a
record is produced by the real producer, that a consumer honours it. Every model reply in
them is a stub written by the suite itself, so **none of them says anything about story
quality**. Each one states that in its own output.
