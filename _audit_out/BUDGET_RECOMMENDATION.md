# Budget recommendation for the live story evaluation — 2026-10-06

**Scope priced:** fixed Scene 1 → up to six completed OAS exchanges → scripted reader exit →
authored Dohkar interruption → recorded "run" → Scenes 2–10.

No new diagnostic runs were made for this. Every figure comes from the existing call inventory and
the receipts already on disk.

## The recommendation

| | |
|---|---:|
| **Additional headroom** | **$1.70** |
| **New cumulative ceiling** | **$3.75** |
| existing exposure, retained | $2.0381227 |

## How it is built

### Opener and setup — $0.012 expected

**Setup is reused, not freshly generated.** Both live runs today logged
`setup complete · exposure $0.000000` with zero priced calls: the bibles, plots and scaffold are
already persisted for this story. If a fresh story were ever used instead, this line would need
re-pricing from scratch — it is **not** covered by the figure above.

From today's capped check, calls 1–6 (opener, previews, cleanup, before the first author call):
$0.005980 receipted + $0.005718 retained ≈ **$0.012**.

### Six OAS exchanges — $0.255 expected, $0.18–$0.37 range

Taken from today's first live run, which reached **nine** OAS author calls **with receipts** — the
only six-turn-scale evidence available. The first six, measured:

```
turn 1 $0.060311   turn 2 $0.060773   turn 3 $0.025950
turn 4 $0.026397   turn 5 $0.021022   turn 6 $0.060182     sum $0.254635
```

**I am not multiplying the opening-plus-first-exchange figure by six.** Later turns do different
work and cache differently: three of those six ran cold (~$0.060) and three ran warm
(~$0.021–0.026) on a ~46,000-token prompt. The spread is real and is the main uncertainty:

- every turn cold, at the worst observed rate: **$0.365**
- turns 2–6 warm, at the best observed rate: **$0.174**

Plus per-turn preview/cleanup traffic: ~$0.009 across six turns, from the same run.

### Nine generated scenes — $1.012 expected

| component | source |
|---|---:|
| planner + author, receipted average | **$0.09195** per scene (2026-10-02, nine scenes) |
| pre-author scene stages — planner, verifier, memory | **$0.020540** (today, calls 8–12) |
| **expected per scene** | **$0.11249** |
| **× 9** | **$1.0124** |

The Oct-2 average covers planner and author receipts **only**. The second line is today's measured
cost for the scene stages that run *before* the author, which that average excluded — so this is
not the Oct-2 figure re-used unchanged.

### Expected total, reservations, and retries

| | |
|---|---:|
| opener + setup (reused) | $0.012 |
| six OAS exchanges | $0.255 |
| nine scenes | $1.012 |
| **expected spend** | **≈ $1.28** |
| retry allowance — one stale-retry per scene is configured; two author retries | **+ $0.19** |
| **expected with retries** | **≈ $1.47** |

**Reservations are a different number.** The guard holds `max_tokens × 1.5 × 1.2` with no cache
credit before each dispatch, then releases it when the receipt settles. The largest single
reservation observed is **$0.133815** — the scene author call the current ceiling refused. So the
ceiling must clear *expected cumulative exposure plus the next reservation at every step*, not just
the expected total. That is what the extra headroom above $1.47 is for:

```
$1.47 expected-with-retries  +  $0.134 peak single reservation  +  ~$0.10 margin  ≈  $1.70
```

## What a ceiling stop would leave

The guard refuses the **next** dispatch when `exposure + reservation > ceiling`, so a stop is
partial, never a lost run — and the artefacts are written as it goes:

| stopped during | what you keep |
|---|---|
| the OAS | the exchanges completed so far, with per-turn reply attribution, plus every request and response body |
| after the handoff | the resolved OAS, its archive, the submitted interruption and the recorded "run" |
| mid-scenes | every scene accepted up to that point, each with its history note and per-scene cost; `CLAIM A` reports how many of the nine were generated |

At **$3.75** the expected run finishes with roughly $0.28 of slack. If caching behaves at the worst
observed rate throughout, the overrun lands around $0.11 above expectation, which that slack
absorbs. **I am not promising completion** — a cold-cache run with repeated planner rejections could
still stop in the scenes, and the honest outcome then is a partial corpus reported as found.

## If you want a smaller commitment

**$1.00 additional ($3.04 cumulative)** funds the opening, six OAS exchanges and roughly five or six
scenes on these figures. That would answer the OAS repetition question and give a first read on
scene-to-scene continuity, without covering the full ten-scene corpus.

## During the evaluation

Preserved per the standing requirement: full requests and responses under `wire/`, prose and
history notes per scene, per-call tokens/cached/ticks/measured in `calls.json`, per-scene cost in
the scene ledger, and `_vercel_dev.log` copied aside immediately afterwards. **Results reported
before anything the run exposes is fixed.**
