/* ═══════════════════════════════════════════════════════════════════════════
 * INVARIANT-GATED SERIALIZATION — NARROW PROTOTYPE v0  (Roman 2026-07-29)
 * ═══════════════════════════════════════════════════════════════════════════
 * Fixes the Destiny/Fact Divergence Bug for ONE flavor (First Sacrifice /
 * arcane_binding), behind a flag (window._invariantRuntimeV0 === true). Legacy
 * milestone/_tickAPlot path is UNTOUCHED for every other flavor.
 *
 * Design docs: docs/invariant-gated-serialization-design.md,
 *              docs/runtime-policy.md, docs/invariant-language-spec.md.
 *
 * The five layers, one responsibility each:
 *   Story Goal → Issue Goal → Narrative Invariants(+DAG) → Scheduler →
 *   Scene Realizations → Canonical World State.
 *   goals=WHAT · scheduler=WHEN · author=HOW · evaluator=WHETHER.
 *
 * A story is a GRAPH, not a timeline. This file walks the graph.
 *
 * WHY THE BUG BECOMES UNREPRESENTABLE: nothing here can mark a truth canonical
 * on a schedule. Only evaluate() — reading the ACTUAL prose — can set an
 * invariant `realized`, and only a `realized` invariant's consequences ever
 * reach the author or the fact store. There is no code path where WHEN promotes
 * WHAT. `E (trust rebuilt)` cannot realize while `C/D` are unrealized because it
 * is `blocked` by the DAG — "rebuilt a trust that never broke" is structurally
 * impossible, not merely unlikely.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ROOT = (typeof window !== 'undefined') ? window : globalThis;

  // ── tunables (runtime-policy.md §2) ──────────────────────────────────────
  var K_FORCE = 4;      // scenes overdue before FORCE (dominant objective, still pressure)
  var K_MAX   = 7;      // scenes overdue before REPLAN → RETIRE
  var CONF_GATE = 0.75; // an invariant realizes only at/above this evaluator confidence

  function log() {
    try { console.log.apply(console, arguments); } catch (_) {}
  }

  // ── per-invariant lifetime record (Roman 2026-07-29) ─────────────────────
  // Every state transition and evaluation touch appends here. This timeline is
  // the primary debugging artifact: available → attempt/partial(reason) →
  // forced → satisfied(matched_via) → canonical, per invariant.
  function _life(rt, id, scene, event, detail) {
    try {
      if (!rt.lifetimes[id]) rt.lifetimes[id] = [];
      rt.lifetimes[id].push({ scene: scene, event: event, detail: detail || '' });
    } catch (_) {}
  }
  // Record any invariant that has newly become available since last check.
  function _logNewlyAvailable(rt, scene) {
    rt.invariants.forEach(function (inv) {
      if (inv.status === 'available' && !inv._availLogged) {
        inv._availLogged = true;
        _life(rt, inv.id, scene, 'available', 'deps realized: [' + inv.depends_on.join(',') + ']');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER: NARRATIVE INVARIANTS — the hand-authored 5-node DAG.
  // Linear A→B→C→D→E (runtime-policy.md §5 — start at five, not twenty).
  // Themed to First Sacrifice (arcane_binding, enemies-to-lovers, ritual bond).
  // Each node is a TRUTH (statement), not an event. `suggested_realization` is
  // a HOW the Scheduler steers toward — non-binding; the author may satisfy the
  // truth any equivalent way. `boundary` guards over-crediting. `precondition`
  // is what obsolescence watches.
  // ═══════════════════════════════════════════════════════════════════════
  var FIRST_SACRIFICE_DAG = [
    {
      id: 'A_dependency',
      statement: 'The binding makes the two of them concretely dependent on each other — one can no longer act, wield, or survive wholly alone.',
      precondition: 'They are separate and self-sufficient, treating each other as adversaries.',
      depends_on: [],
      target_scene: 2,
      suggested_realization: 'The binding rite completes and a shared, physically real cost or tether appears — a wound one feels when the other is hurt, a power neither can channel apart.',
      equivalent_realizations: [
        'A magical tether manifests that forces proximity or shared sensation.',
        'A ritual debt binds their fates so harm to one is harm to both.',
        'A power only works when both consent to wield it together.'
      ],
      boundary: 'Mere forced proximity or being assigned to work together does NOT count — the dependency must be a real cost/consequence they cannot escape unilaterally.'
    },
    {
      id: 'B_trust_extended',
      statement: 'One of them deliberately places something they cannot afford to lose into the other\'s hands — a first genuine act of trust across the enemy line.',
      precondition: 'They are dependent (A) but still treat each other only as adversaries.',
      depends_on: ['A_dependency'],
      target_scene: 3,
      suggested_realization: 'One reveals a true vulnerability, hands over a weapon/secret/name that could destroy them, and the other could exploit it but the trust is nonetheless extended.',
      equivalent_realizations: [
        'One tells the other a secret whose exposure would be ruin.',
        'One lowers a defense — heals, sleeps, disarms — knowing the other could strike.',
        'One entrusts the other with the life of someone they love.'
      ],
      boundary: 'Forced disclosure, or trust extracted under threat, does NOT count — it must be a chosen extension the truster could have withheld.'
    },
    {
      id: 'C_trust_broken',
      statement: 'That extended trust is concretely violated — the trusted one acts against it, or is revealed to have already.',
      precondition: 'Trust has been genuinely extended (B) and still stands.',
      depends_on: ['B_trust_extended'],
      target_scene: 4,
      suggested_realization: 'The one who was trusted uses (or is exposed as having used) the vulnerability against the truster — the secret is spent, the weapon turned, the loved one endangered.',
      equivalent_realizations: [
        'The secret is deliberately disclosed to a third party who can weaponize it.',
        'The lowered defense is exploited in a concrete, on-page way.',
        'A prior betrayal comes to light that retroactively violates the extended trust.'
      ],
      boundary: 'A misunderstanding later cleanly excused does NOT count — the violation must be real and cost the truster something concrete.'
    },
    {
      id: 'D_sacrifice',
      statement: 'One of them pays a real, irreversible cost for the other despite the break — the first sacrifice.',
      precondition: 'The trust break (C) stands, unrepaired.',
      depends_on: ['C_trust_broken'],
      target_scene: 5,
      suggested_realization: 'The one wronged (or the one who wronged) gives up something they cannot get back — power, safety, standing, a limb, a future — to save or spare the other, with nothing guaranteed in return.',
      equivalent_realizations: [
        'One takes a wound/curse meant for the other.',
        'One surrenders the very thing they were fighting the whole story to keep.',
        'One frees the other at the cost of their own freedom or power.'
      ],
      boundary: 'A costless gesture, or a "sacrifice" that is immediately repaid/undone, does NOT count — the cost must be irreversible and unrewarded at the moment it is paid.'
    },
    {
      id: 'E_trust_rebuilt',
      statement: 'Trust is re-established on new, costlier terms — not reset to before, but rebuilt in full knowledge of the break and the sacrifice.',
      precondition: 'A sacrifice (D) has been made and the break (C) is acknowledged, not erased.',
      depends_on: ['D_sacrifice'],
      target_scene: 6,
      suggested_realization: 'The wronged one chooses the other again — eyes open, the betrayal named not forgotten — and the bond that reforms is explicitly heavier and more deliberate than the one that broke.',
      equivalent_realizations: [
        'They name the betrayal aloud and choose each other anyway.',
        'One extends trust a second time, knowing exactly what it cost last time.',
        'The bond is re-forged with a new, self-aware condition that acknowledges the wound.'
      ],
      boundary: 'A clean reset where the break is treated as if it never happened does NOT count — that is exactly the Destiny/Fact divergence this system exists to prevent. Rebuilt ≠ restored.'
    }
  ];

  // ── Story/Issue goals (the top of the five layers) ──────────────────────
  var STORY_GOAL = 'Two bound enemies become, through dependency, betrayal, and sacrifice, people who choose each other with their eyes open.';
  var ISSUE_GOAL = 'Earn the first rebuilt trust: extend it, break it, pay for it, rebuild it — each truth landing on the page, never assumed.';

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIVATION GATE — flag + flavor. Legacy path untouched unless BOTH true.
  // ═══════════════════════════════════════════════════════════════════════
  function isActive(state) {
    try {
      if (ROOT._invariantRuntimeV0 !== true) return false;
      var s = state || ROOT.state;
      if (!s) return false;
      // The First Sacrifice starter writes flavor identity to state.picks (not top-level
      // worldSubtype) and locks its title. Gate on any of the signals the launch actually sets.
      var ws = s.worldSubtype || (s.picks && s.picks.worldSubtype);
      var flavor = s.flavor || (s.picks && s.picks.flavor);
      return ws === 'arcane_binding'
        || flavor === 'Arcane Binding'
        || s.immutableTitle === 'The First Sacrifice'
        || s._starterId === 'starter_first_sacrifice';
    } catch (_) { return false; }
  }

  // Deep-clone the authored DAG onto state (runtime fields added). Idempotent.
  function ensure(state) {
    var s = state || ROOT.state;
    if (!s) return null;
    if (s._invariantRuntime && s._invariantRuntime._v === 0) return s._invariantRuntime;
    var invs = FIRST_SACRIFICE_DAG.map(function (d) {
      return {
        id: d.id,
        statement: d.statement,
        precondition: d.precondition,
        depends_on: (d.depends_on || []).slice(),
        target_scene: d.target_scene,
        suggested_realization: d.suggested_realization,
        equivalent_realizations: (d.equivalent_realizations || []).slice(),
        boundary: d.boundary,
        // runtime fields:
        status: 'blocked',       // blocked | available | partial | realized | obsolete
        scenes_overdue: 0,
        forced: false,
        replanned: false,
        realized_at: null,
        matched_via: null,       // 'suggested' | 'equivalent' | 'novel'
        confidence: null,
        canonical_consequences: []
      };
    });
    s._invariantRuntime = {
      _v: 0,
      storyGoal: STORY_GOAL,
      issueGoal: ISSUE_GOAL,
      invariants: invs,
      lastSteeredId: null,
      branchRisks: [],           // irreversible events that satisfied NO available invariant
      lifetimes: {},             // per-invariant timeline (Roman 2026-07-29): id → [{scene,event,detail}]
      evalLog: [],               // full evaluator-decision transcript (evaluator quality = dominant risk)
      log: []
    };
    invs.forEach(function (i) { s._invariantRuntime.lifetimes[i.id] = []; });
    computeStatuses(s._invariantRuntime);
    // A is available from the start — seed its timeline so the record is complete.
    invs.forEach(function (i) { if (i.status === 'available') { i._availLogged = true; _life(s._invariantRuntime, i.id, 0, 'available', 'no dependencies'); } });
    log('[INVARIANT-RUNTIME] initialized First Sacrifice DAG — ' + invs.length + ' nodes (A→B→C→D→E).');
    return s._invariantRuntime;
  }

  function byId(rt, id) {
    for (var i = 0; i < rt.invariants.length; i++) if (rt.invariants[i].id === id) return rt.invariants[i];
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER: STATUS (runtime-policy.md §0) — derived from canonical state, never
  // authored. This is what replaces "importance": relevance is emergent.
  // ═══════════════════════════════════════════════════════════════════════
  function computeStatuses(rt) {
    rt.invariants.forEach(function (inv) {
      if (inv.status === 'realized' || inv.status === 'obsolete') return; // terminal
      var depsReady = inv.depends_on.every(function (did) {
        var d = byId(rt, did);
        return d && d.status === 'realized';
      });
      if (!depsReady) { inv.status = 'blocked'; return; }
      // deps ready and not yet realized → available (partial preserved if set)
      if (inv.status !== 'partial') inv.status = 'available';
    });
  }

  function availableSet(rt) {
    return rt.invariants.filter(function (i) { return i.status === 'available' || i.status === 'partial'; });
  }

  // critical-path weight = how many still-unrealized invariants transitively
  // depend on this one (keeps the graph flowing — runtime-policy.md §1).
  function unblockCount(rt, id) {
    var n = 0;
    rt.invariants.forEach(function (inv) {
      if (inv.status === 'realized' || inv.status === 'obsolete') return;
      if (inv.depends_on.indexOf(id) !== -1) n++;
    });
    return n;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER: SCHEDULER (runtime-policy.md §1/§2) — owns WHAT TO ATTEMPT NEXT.
  // Ranks the AVAILABLE SET: overdue-first, then critical-path, then target.
  // The top pick is STEERED toward. Author sovereignty lives inside the whole
  // available set (evaluate() credits any of them).
  // ═══════════════════════════════════════════════════════════════════════
  function schedule(rt, turn) {
    computeStatuses(rt);
    var avail = availableSet(rt);
    if (!avail.length) return { top: null, available: [], forced: false, breather: true };

    // update overdue counters against Issue pacing
    avail.forEach(function (inv) {
      inv.scenes_overdue = (turn > inv.target_scene) ? (turn - inv.target_scene) : 0;
    });

    avail.sort(function (a, b) {
      if (b.scenes_overdue !== a.scenes_overdue) return b.scenes_overdue - a.scenes_overdue; // overdue first
      var cb = unblockCount(rt, b.id) - unblockCount(rt, a.id);
      if (cb !== 0) return cb;                                                                // critical-path
      return a.target_scene - b.target_scene;                                                // earliest target
    });

    var top = avail[0];
    rt.lastSteeredId = top.id;

    // starvation escalation (runtime-policy.md §2) — pressure, NEVER mandate.
    var forced = false;
    if (top.scenes_overdue >= K_FORCE && top.scenes_overdue < K_MAX) {
      if (!top.forced) _life(rt, top.id, turn, 'forced', 'overdue=' + top.scenes_overdue + ' → dominant objective (pressure)');
      top.forced = true; forced = true;
      log('[DESTINY-FORCE] scene=' + turn + ' invariant=' + top.id + ' overdue=' + top.scenes_overdue +
          ' → this truth is the scene\'s DOMINANT objective (pressure, any realization still valid).');
    } else if (top.scenes_overdue >= K_MAX && !top.replanned) {
      top.replanned = true;
      _life(rt, top.id, turn, 'replan', 'overdue=' + top.scenes_overdue + ' → re-derive reachable realization');
      log('[DESTINY-REPLAN] scene=' + turn + ' invariant=' + top.id + ' overdue=' + top.scenes_overdue +
          ' → statement is sacred; re-deriving a more reachable realization (unstageable from current state).');
      // For the prototype we re-steer with the equivalent realizations foregrounded;
      // the truth (statement) is never rewritten. A production replan would re-derive
      // suggested_realization from canonical state via the planner.
    }
    return { top: top, available: avail, forced: forced, breather: false };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER: AUTHOR DIRECTIVE — canonical world state (carried) + this scene's
  // narrative objective (steered, PRESSURE not mandate). Replaces the legacy
  // relational-consequence ledger for the prototype flavor. Returned into
  // buildRelationalContinuityDirective()'s slot so both call sites get it.
  // ═══════════════════════════════════════════════════════════════════════
  function buildDirective(state, turn) {
    var s = state || ROOT.state;
    var rt = ensure(s);
    if (!rt) return '';
    if (turn == null) turn = (s.turnCount || 0);
    if (turn < 1) return ''; // scene 1 introduces; no destiny steering yet

    var sched = schedule(rt, turn);
    var L = [];

    // 1) CANONICAL WORLD STATE — only realized truths, with their consequences.
    var realized = rt.invariants.filter(function (i) { return i.status === 'realized'; });
    if (realized.length) {
      L.push('\n\nCANONICAL WORLD STATE (these truths ARE established on the page — the reader has SEEN them happen; honor them as fact, never contradict, never silently reset):');
      realized.forEach(function (inv) {
        L.push('  • [TRUE, since scene ' + inv.realized_at + '] ' + inv.statement);
        (inv.canonical_consequences || []).forEach(function (c) {
          L.push('      – consequence now in force: ' + c);
        });
      });
    }

    // 2) THIS SCENE'S NARRATIVE OBJECTIVE — steered, pressure not mandate.
    if (sched.breather) {
      L.push('\nNO DESTINY BEAT IS DUE THIS SCENE — every pending truth is blocked on one that has not happened yet. This is a legitimate relationship/breather beat: deepen what is already true; do not manufacture a beat out of order.');
    } else {
      var top = sched.top;
      var others = sched.available.filter(function (i) { return i.id !== top.id; });
      L.push('\nTHIS SCENE\'S NARRATIVE OBJECTIVE (the truth this scene should work to make REAL on the page — a target, not a script):');
      L.push('  • TRUTH TO ESTABLISH: ' + top.statement);
      if (top.precondition) L.push('  • Currently still true / not-yet-overturned: ' + top.precondition);
      L.push('  • ONE WAY IT COULD HAPPEN (a suggestion — you are free to reach the truth by any equivalent path, or an unexpected but valid one): ' + top.suggested_realization);
      L.push('  • DOES NOT COUNT: ' + top.boundary);
      if (sched.forced) {
        L.push('  • THIS IS THE SCENE\'S DOMINANT OBJECTIVE THIS TURN. Narrative pressure has built for several scenes — let this truth land now. (Pressure, not a mandate: satisfy it through ANY realization that concretely makes it true; you are NOT required to use the suggestion above.)');
      }
      if (others.length) {
        L.push('  • ALSO AVAILABLE (you may instead make any of these true and the scene still succeeds — the objective above is steering, not a cage): ' +
          others.map(function (i) { return '«' + i.statement + '»'; }).join('  '));
      }
      L.push('  • HARD: do NOT stage any LATER truth (rebuilt trust, reconciliation, aftermath of a betrayal) that depends on a truth not yet established above — a bond cannot re-form before it has broken. Only the truths named here are reachable this scene.');
    }
    return L.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER: EVALUATION (the ONE gating evaluation — design §5). Reads the ACTUAL
  // prior-scene prose and decides whether any AVAILABLE invariant became true.
  // Only this can promote a truth to canonical. Consequence extraction is part
  // of the SAME result (post-processing, not a second judge).
  //
  // Pluggable: InvariantRuntimeV0._evalFn(payload) → Promise<result> lets the
  // offline smoke test inject a mock. In the browser it defaults to the
  // gpt-4o-mini proxy (same cheap model as _commitScene's delivery verifier).
  // ═══════════════════════════════════════════════════════════════════════
  function _buildEvalMessages(rt, avail, proseText) {
    var menu = avail.map(function (inv, i) {
      return (i + 1) + '. id="' + inv.id + '"\n   TRUTH: ' + inv.statement +
             '\n   DOES NOT COUNT: ' + inv.boundary;
    }).join('\n');
    var sys = 'You are the INVARIANT EVALUATOR for an interactive story engine. You are given a set of candidate NARRATIVE TRUTHS that COULD become true in this scene, and the SCENE PROSE that was actually written. Decide ONE thing: did the prose make one of these truths CONCRETELY, IRREVERSIBLY true — shown on the page, not merely gestured at or set up? This is a gate, not a critique. Judge only whether a truth became real. Output STRICT JSON only.\n'
      + 'Rules:\n'
      + '- A truth is SATISFIED only if it concretely happened on the page (a reader would agree "yes, that is now true and cannot be undone"). Setup, foreshadowing, or an almost-moment is NOT satisfaction → status "none".\n'
      + '- The author is free to satisfy a truth in an UNEXPECTED but valid way. Judge the TRUTH, not any particular method. Set matched_via to "suggested" (used the obvious path), "equivalent" (a different but clearly valid path), or "novel" (unexpected yet genuinely satisfies the truth).\n'
      + '- Respect DOES NOT COUNT boundaries strictly.\n'
      + '- If a clearly IRREVERSIBLE event happened but it satisfies NONE of the candidate truths, set status "none" and branch_risk true (the author advanced a different thread).\n'
      + '- confidence is 0.0–1.0: how sure you are the truth became true.\n'
      + '- canonical_consequences: 1–3 short factual clauses that are NOW TRUE because this truth landed (what future scenes must honor). Empty if status "none".\n'
      + 'JSON shape: {"status":"satisfied|none","satisfied_id":"<id or null>","confidence":0.0,"matched_via":"suggested|equivalent|novel|null","substitution_preserves_invariant":true,"branch_risk":false,"reason":"<one sentence>","canonical_consequences":["..."]}';
    var usr = 'CANDIDATE TRUTHS (only these are reachable this scene):\n' + menu +
      '\n\nSCENE PROSE:\n' + String(proseText || '').slice(0, 6000) + '\n\nReturn the JSON now.';
    return [{ role: 'system', content: sys }, { role: 'user', content: usr }];
  }

  async function _defaultEvalFn(messages) {
    var res = await fetch('/api/chatgpt-proxy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages, role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 320, jsonMode: true })
    });
    if (!res.ok) throw new Error('evaluator http ' + res.status);
    var data = await res.json();
    var c = (data && data.content) || (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
    var parsed;
    try { parsed = JSON.parse(c); }
    catch (e) { var m = String(c || '').match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
    return parsed || { status: 'none' };
  }

  async function evaluatePriorScene(state, proseText, sceneNum) {
    var s = state || ROOT.state;
    var rt = ensure(s);
    if (!rt) return null;
    var clean = String(proseText || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').trim();
    if (clean.length < 40) { log('[INVARIANT-EVAL:SKIP] scene=' + sceneNum + ' no-prose'); return null; }

    computeStatuses(rt);
    var avail = availableSet(rt);
    if (!avail.length) { log('[INVARIANT-EVAL:SKIP] scene=' + sceneNum + ' no-available-invariant'); return null; }
    // capture the state AS OFFERED this scene (pre-promotion) for the consolidated snapshot
    var snapAvail = avail.map(function (i) { return i.id; });
    var snapBlocked = rt.invariants.filter(function (i) { return i.status === 'blocked'; }).map(function (i) {
      var waiting = i.depends_on.filter(function (d) { var dd = byId(rt, d); return !dd || dd.status !== 'realized'; });
      return { id: i.id, waiting: waiting };
    });
    var snapObsolete = rt.invariants.filter(function (i) { return i.status === 'obsolete'; }).map(function (i) { return i.id; });
    var snapSteered = rt.lastSteeredId;

    var result;
    try {
      var evalFn = ROOT.InvariantRuntimeV0 && ROOT.InvariantRuntimeV0._evalFn;
      var messages = _buildEvalMessages(rt, avail, clean);
      result = evalFn ? await evalFn(messages, avail, clean) : await _defaultEvalFn(messages);
    } catch (e) {
      log('[INVARIANT-EVAL:ERR] scene=' + sceneNum + ' ' + (e && e.message) + ' → no promotion (gate stays closed)');
      return null;
    }

    var status = String((result && result.status) || 'none').toLowerCase();
    var conf = (result && typeof result.confidence === 'number') ? result.confidence : 0;
    var id = result && result.satisfied_id;
    var target = id ? byId(rt, id) : null;
    var reason = (result && result.reason) ? String(result.reason).slice(0, 240) : '';
    var matchedVia = (result && result.matched_via) || null;

    // EVALUATOR TRANSCRIPT — the primary readout (evaluator quality = dominant risk).
    rt.evalLog.push({
      scene: sceneNum, available: avail.map(function (i) { return i.id; }),
      status: status, satisfied_id: id || null, confidence: conf, matched_via: matchedVia,
      branch_risk: !!(result && result.branch_risk), reason: reason
    });

    // GATE: promote only an AVAILABLE invariant, at/above confidence, respecting DAG.
    var promoted = null;
    if (status === 'satisfied' && target && (target.status === 'available' || target.status === 'partial') && conf >= CONF_GATE) {
      target.status = 'realized';
      target.realized_at = sceneNum;
      target.matched_via = matchedVia || 'equivalent';
      target.confidence = conf;
      target.canonical_consequences = Array.isArray(result.canonical_consequences)
        ? result.canonical_consequences.map(function (c) { return String(c).slice(0, 200); }).slice(0, 3) : [];
      promoted = target;
      _life(rt, target.id, sceneNum, 'satisfied', 'conf=' + conf.toFixed(2) + ' via=' + target.matched_via + ' :: ' + reason);
      _life(rt, target.id, sceneNum, 'canonical', target.canonical_consequences.join(' | '));
      // UNIFY: write consequences into the ONE canonical store (CommittedState facts).
      _mirrorToCommittedState(s, target, sceneNum);
      computeStatuses(rt);              // unblock downstream
      _logNewlyAvailable(rt, sceneNum); // record the newly-unblocked invariants' timelines
      _checkObsolescence(rt, sceneNum); // runtime-policy.md §3
      log('[INVARIANT-REALIZED] scene=' + sceneNum + ' id=' + target.id + ' conf=' + conf.toFixed(2) +
          ' via=' + target.matched_via + ' consequences=' + target.canonical_consequences.length +
          ' :: ' + target.statement.slice(0, 70));
    } else if (status === 'satisfied' && target && conf < CONF_GATE) {
      if (target.status === 'available') target.status = 'partial'; // begun-but-not-irreversible
      _life(rt, target.id, sceneNum, 'partial', 'conf=' + conf.toFixed(2) + ' (< ' + CONF_GATE + ' gate) :: ' + reason);
      log('[INVARIANT-PARTIAL] scene=' + sceneNum + ' id=' + target.id + ' conf=' + conf.toFixed(2) + ' (< ' + CONF_GATE + ' gate) → not canonical, re-offered with escalation');
    } else if (result && result.branch_risk) {
      rt.branchRisks.push({ scene: sceneNum, reason: reason });
      if (rt.lastSteeredId) _life(rt, rt.lastSteeredId, sceneNum, 'branch_risk', 'irreversible event satisfied no available truth :: ' + reason);
      log('[INVARIANT-BRANCH-RISK] scene=' + sceneNum + ' an irreversible event satisfied NO available truth — flagged, NOT credited :: ' + reason);
    } else {
      if (rt.lastSteeredId) _life(rt, rt.lastSteeredId, sceneNum, 'none', reason);
      log('[INVARIANT-EVAL] scene=' + sceneNum + ' status=none — no truth landed (available: ' + avail.map(function (i) { return i.id; }).join(',') + ')');
    }

    _abLog(s, rt, sceneNum, promoted);
    _sceneSnapshot(s, rt, sceneNum, { avail: snapAvail, blocked: snapBlocked, obsolete: snapObsolete, steered: snapSteered, status: status, conf: conf, matchedVia: matchedVia, promoted: promoted, branch: !!(result && result.branch_risk) });
    return { promoted: promoted, result: result, available: avail.map(function (i) { return i.id; }) };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER: CANONICAL WORLD STATE — ONE store. Mirror realized consequences into
  // the existing (delivery-gated, correct) CommittedState.facts, tagged with
  // invariant provenance. destiny + facts are now one store.
  // ═══════════════════════════════════════════════════════════════════════
  function _mirrorToCommittedState(s, inv, sceneNum) {
    try {
      var ensureCS = ROOT._ensureCommittedState;
      if (typeof ensureCS !== 'function') return;
      var cs = ensureCS();
      (inv.canonical_consequences.length ? inv.canonical_consequences : [inv.statement]).forEach(function (c) {
        cs.facts.push({ fact: String(c).slice(0, 200), sourceEvent: 'invariant:' + inv.id, committedAtScene: sceneNum, provenance: 'invariant' });
      });
      if (cs.facts.length > 40) cs.facts = cs.facts.slice(-40);
    } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OBSOLESCENCE (runtime-policy.md §3) — a runtime truth, not planner metadata.
  // Two triggers: superseded (a realized invariant already achieved a pending
  // one's downstream purpose) or precondition contradicted (cheap keyword scan
  // of canonical facts — e.g., a required character is dead/gone). Kept light for
  // a linear 5-node chain; the hook is here so the shape is real.
  // ═══════════════════════════════════════════════════════════════════════
  function _checkObsolescence(rt, sceneNum) {
    var facts = '';
    try {
      var cs = ROOT._ensureCommittedState && ROOT._ensureCommittedState();
      facts = (cs && Array.isArray(cs.facts)) ? cs.facts.map(function (f) { return f.fact; }).join(' | ').toLowerCase() : '';
    } catch (_) {}
    rt.invariants.forEach(function (inv) {
      if (inv.status === 'realized' || inv.status === 'obsolete') return;
      // precondition contradicted — a canonical fact makes the precondition impossible.
      // (Prototype heuristic: a death/departure fact retires a truth about that ongoing relationship state.)
      if (/\b(is dead|has died|was killed|is gone for good|left forever)\b/.test(facts) && /trust|bond|choose/.test(String(inv.statement).toLowerCase())) {
        inv.status = 'obsolete';
        log('[DESTINY-OBSOLETE] scene=' + sceneNum + ' id=' + inv.id + ' — precondition contradicted by canonical state; retired.');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SHADOW (runtime-policy.md §5) — run the legacy milestone spine LOG-ONLY so
  // every scene yields an immediate A/B. Called from the _tickAPlot hook.
  // Records nothing canonical; only reports what legacy WOULD have fired.
  // ═══════════════════════════════════════════════════════════════════════
  function shadowLegacyTick(state, turn) {
    var s = state || ROOT.state;
    var rt = s && s._invariantRuntime;
    var a = s && s.aPlot;
    var wouldFire = [];
    try {
      if (a && Array.isArray(a.milestones)) {
        a.milestones.forEach(function (m) {
          if (m && !m.triggered && typeof m.atScene === 'number' && m.atScene <= turn) {
            wouldFire.push({ atScene: m.atScene, kind: m.kind, event: String(m.event || '').slice(0, 80), conductivity: !!m.emotional_conductivity });
          }
        });
      }
    } catch (_) {}
    if (wouldFire.length) {
      wouldFire.forEach(function (w) {
        log('[SHADOW-LEGACY] scene=' + turn + ' legacy WOULD fire milestone @' + w.atScene + ' kind=' + w.kind +
            (w.conductivity ? ' (would inject consequence BEFORE any delivery ← the bug)' : '') + ' :: ' + w.event);
      });
    }
    if (rt) {
      var realized = rt.invariants.filter(function (i) { return i.status === 'realized'; }).map(function (i) { return i.id; });
      var avail = availableSet(rt).map(function (i) { return i.id; });
      log('[SHADOW-COMPARE] scene=' + turn + ' legacy_would_fire=' + (wouldFire.length || 0) +
          ' | invariant realized=[' + realized.join(',') + '] available=[' + avail.join(',') + ']');
    }
  }

  // ── CONSOLIDATED PER-SCENE SNAPSHOT (Roman 2026-07-29) ───────────────────
  // One readable block per scene — the primary live readout during real play.
  // Replaces reading scattered log lines: what was offered, what the scheduler
  // steered, how the author satisfied it, the evaluator verdict, what became
  // canonical, and what the LEGACY spine would have (wrongly) committed instead.
  function _legacyWouldCommit(s, sceneNum) {
    try {
      var a = s && s.aPlot;
      if (!a || !Array.isArray(a.milestones)) return '—';
      var m = a.milestones.filter(function (mm) { return typeof mm.atScene === 'number' && mm.atScene <= sceneNum; }).sort(function (x, y) { return y.atScene - x.atScene; })[0];
      if (!m) return '—';
      return 'milestone ' + (m.kind || 'ms') + '@' + m.atScene + (m.emotional_conductivity ? ' (+consequence, pre-delivery)' : '');
    } catch (_) { return '—'; }
  }
  function _sceneSnapshot(s, rt, sceneNum, x) {
    try {
      var authorMode = x.promoted
        ? (x.matchedVia === 'suggested' ? 'used suggested realization'
           : x.matchedVia === 'novel' ? 'NOVEL realization (unexpected but valid)'
           : 'substituted realization (equivalent)')
        : (x.branch ? 'committed a DIFFERENT irreversible event (competing branch)' : 'no truth landed');
      var verdict = x.promoted ? ('SATISFIED (' + x.conf.toFixed(2) + ')')
        : (x.status === 'satisfied' ? ('PARTIAL (' + x.conf.toFixed(2) + ') — below ' + CONF_GATE + ' gate')
           : (x.branch ? 'UNSATISFIED [BRANCH-RISK]' : 'UNSATISFIED'));
      var canonical = x.promoted
        ? (x.promoted.id + ' → "' + (x.promoted.canonical_consequences[0] || x.promoted.statement).slice(0, 90) + '"')
        : '—';
      var blocked = x.blocked.length
        ? x.blocked.map(function (b) { return b.id + (b.waiting.length ? ' (waiting on ' + b.waiting.join(',') + ')' : ''); }).join('  ')
        : '—';
      var L = [
        '[INVARIANT-SNAPSHOT] ═══ Scene ' + sceneNum + ' ═══',
        '    Available:  ' + (x.avail.length ? x.avail.join(', ') : '—'),
        '    Blocked:    ' + blocked,
        '    Obsolete:   ' + (x.obsolete.length ? x.obsolete.join(', ') : '—'),
        '    Scheduler:  ' + (x.steered ? 'attempt ' + x.steered : '(no destiny beat due)'),
        '    Author:     ' + authorMode,
        '    Evaluator:  ' + verdict,
        '    Canonical:  ' + canonical,
        '    Shadow:     legacy would have committed ' + _legacyWouldCommit(s, sceneNum)
      ];
      log(L.join('\n'));
    } catch (_) {}
  }

  function _abLog(s, rt, sceneNum, promoted) {
    try {
      var a = s && s.aPlot;
      var legacySched = 'none';
      if (a && Array.isArray(a.milestones)) {
        var m = a.milestones.filter(function (mm) { return typeof mm.atScene === 'number' && mm.atScene <= sceneNum; }).sort(function (x, y) { return y.atScene - x.atScene; })[0];
        if (m) legacySched = (m.kind || 'ms') + '@' + m.atScene;
      }
      var csFacts = 0;
      try { var cs = ROOT._ensureCommittedState && ROOT._ensureCommittedState(); csFacts = (cs && cs.facts) ? cs.facts.length : 0; } catch (_) {}
      log('[INVARIANT-AB] scene=' + sceneNum +
          ' legacy_scheduled=' + legacySched +
          ' invariant_realized=' + (promoted ? promoted.id : 'none') +
          ' canonicalFacts=' + csFacts +
          ' branchRisks=' + (rt.branchRisks.length || 0));
    } catch (_) {}
  }

  // ── introspection for the offline smoke test / debugging ─────────────────
  function snapshot(state) {
    var rt = (state || ROOT.state) && (state || ROOT.state)._invariantRuntime;
    if (!rt) return null;
    return rt.invariants.map(function (i) {
      return { id: i.id, status: i.status, overdue: i.scenes_overdue, forced: i.forced, realized_at: i.realized_at, conf: i.confidence };
    });
  }

  // Full lifecycle + evaluator transcript, as plain data (harness serializes it)
  // and as a human-readable string (dropped into the run report).
  function lifecycleReport(state) {
    var s = state || ROOT.state;
    var rt = s && s._invariantRuntime;
    if (!rt) return { text: '(no invariant runtime)', data: null };
    var lines = [];
    lines.push('INVARIANT LIFETIMES');
    rt.invariants.forEach(function (inv) {
      var ev = rt.lifetimes[inv.id] || [];
      lines.push('  ' + inv.id + '  [final: ' + inv.status + (inv.realized_at != null ? ', canonical@' + inv.realized_at : '') + ']');
      ev.forEach(function (e) { lines.push('      s' + e.scene + '  ' + e.event.toUpperCase() + (e.detail ? '  — ' + e.detail : '')); });
      if (!ev.length) lines.push('      (no events — never left ' + inv.status + ')');
    });
    lines.push('');
    lines.push('EVALUATOR TRANSCRIPT (read THIS — evaluator quality is the dominant risk)');
    rt.evalLog.forEach(function (e) {
      lines.push('  s' + e.scene + '  avail=[' + e.available.join(',') + ']  → ' + e.status.toUpperCase() +
        (e.satisfied_id ? ' ' + e.satisfied_id : '') +
        '  conf=' + (e.confidence != null ? e.confidence.toFixed(2) : '?') +
        (e.matched_via ? ' via=' + e.matched_via : '') +
        (e.branch_risk ? ' [BRANCH-RISK]' : ''));
      if (e.reason) lines.push('        reason: ' + e.reason);
    });
    return { text: lines.join('\n'), data: { lifetimes: rt.lifetimes, evalLog: rt.evalLog, branchRisks: rt.branchRisks, snapshot: snapshot(s) } };
  }

  ROOT.InvariantRuntimeV0 = {
    _v: 0,
    FIRST_SACRIFICE_DAG: FIRST_SACRIFICE_DAG,
    STORY_GOAL: STORY_GOAL,
    ISSUE_GOAL: ISSUE_GOAL,
    K_FORCE: K_FORCE, K_MAX: K_MAX, CONF_GATE: CONF_GATE,
    isActive: isActive,
    ensure: ensure,
    computeStatuses: computeStatuses,
    availableSet: availableSet,
    schedule: schedule,
    buildDirective: buildDirective,
    evaluatePriorScene: evaluatePriorScene,
    shadowLegacyTick: shadowLegacyTick,
    snapshot: snapshot,
    lifecycleReport: lifecycleReport,
    _buildEvalMessages: _buildEvalMessages,
    _evalFn: null   // offline smoke test sets this to a mock; browser uses the proxy
  };
})();
