# PRIMARY_AUTHOR — what it is, and what the paid run actually bought

Provider-free audit. No code changed.

## 1. What $0.372723 bought: no scenes

**Not one scene was authored.** All twelve large calls were OAS dialogue turns:

| # | requested | served | role | chars |
|---|---|---|---|---|
| 1 | mistral-small-latest | — (HTTP 429) | — | 4,969 |
| 2 | grok-4.20-0309-non-reasoning | **grok-4.3** | INTIMACY_SPECIALIST | 4,969 |
| 3–12, 14 | grok-4.20 / grok-4-1-fast | **grok-4.3** | **STRUCTURE_GENERATOR** | ~199–204k |
| 13, 15 | gpt-4o-mini | — | **PRIMARY_AUTHOR** | 609 / 639 |

So the money bought OAS dialogue from Grok 4.3. The "~9 cents a scene" figure never applied —
no scene was generated, and the warm OAS turns billed about $0.012 each.

## 2. PRIMARY_AUTHOR is not the prose-author role. It is a default.

`api/chatgpt-proxy.js:144` — `role = 'PRIMARY_AUTHOR'` is the **DEFAULT**, so any call that omits
a role inherits it. In `public/app.js` it appears at **51 call sites** across four models:

| model | sites |
|---|---|
| gpt-4o-mini | 15 |
| claude-sonnet-4-5 | 10 |
| gpt-4o | 9 |
| gemini-2.5-flash | 1 |

The two in the paid run were small utilities, not prose: `_auditPost` (app.js:6115) and
`_rewriteIdentityForImage` (app.js:49354, `max_tokens: 220`). At 609 and 639 characters they
could not have authored anything. **gpt-4o-mini is doing exactly the scaffold/utility work you
expected — it is the LABEL that reads as authorship.**

## 3. Two authoritative documents contradict each other

`api/chatgpt-proxy.js` header:
> "AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET … **ChatGPT is the PRIMARY AUTHOR and has
> EXCLUSIVE authority over: Plot progression, Character interiority, Dialogue intent, Whether
> intimacy occurs**"

`api/proxy.js:308`:
> `AUTHOR_ROLES = ['AUTHOR', 'PRIMARY_AUTHOR', …]` → rejected with
> "Role is AUTHOR-equivalent and must use /api/chatgpt-proxy, not Grok."

Your canon, repeatedly stated: **the prose author is Grok 4.3, and Sonnet-authored is a BUG.**

These cannot all be true. And the OAS resolves the conflict in practice by **dispatching Grok
under `STRUCTURE_GENERATOR`** — the plot-scaffold role — which is how a 200,000-character
flirtatious dialogue turn reaches Grok without tripping the author ban. `_authorFullScenePolicy`
hardcodes that role for every call it makes.

## 4. Why "fix the routing" has two opposite meanings

* **Reading A — the labels are wrong.** Grok 4.3 really is the author (your canon), the proxy's
  author-ban and its "ChatGPT is PRIMARY AUTHOR" header are stale, and the fix is to stop
  labelling utility calls PRIMARY_AUTHOR and stop smuggling prose through STRUCTURE_GENERATOR.
* **Reading B — the ban is right.** OpenAI is meant to hold plot/interiority authority, the OAS
  is violating that by routing creative work to Grok under a structured-output role, and the fix
  is to move OAS authorship back.

These produce opposite code. I am not choosing between them, because it decides which model
writes your prose and the two proxies disagree in writing.

## 5. Also worth knowing

Every Grok call served **grok-4.3** whatever was requested. `api/proxy.js:97` says so plainly:
"resolves to grok-4.3; 'non-reasoning' is NOT a cheaper SKU." The model names in those dispatches
are cosmetic, and cost reasoning should stop treating them as different models.
