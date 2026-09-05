// _invariant_report.mjs — reads the raw harvest (all_stories.json) and computes Roman's FOUR metrics,
// the serialization-integrity audit, the evaluator transcript, and dumps prose for a blind read.
// Pure analysis, NO API — safe to re-run against a completed harvest.
import fs from 'fs';
import vm from 'node:vm';

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/invariant_out';
const stories = JSON.parse(fs.readFileSync(`${OUT}/all_stories.json`, 'utf8'));

// id ↔ statement map from the authored DAG
vm.runInThisContext(fs.readFileSync(new URL('./public/invariant-runtime-v0.js', import.meta.url), 'utf8'));
const DAG = globalThis.InvariantRuntimeV0.FIRST_SACRIFICE_DAG;
// expected relationship-delta sign per beat (analysis metadata, not runtime): the fidelity report
// compares what the AUTHOR actually delivered (observed delta) against what the beat SHOULD do.
const EXPECTED_DELTA = { A_dependency: +2, B_trust_extended: +3, C_trust_broken: -4, D_sacrifice: +1, E_trust_rebuilt: +4 };
const stmtToId = DAG.map(d => ({ id: d.id, stmt: d.statement, key: d.statement.slice(0, 40) }));
const depsOf = Object.fromEntries(DAG.map(d => [d.id, d.depends_on]));
const findIdByStatement = (text) => { const hit = stmtToId.find(s => text.includes(s.key)); return hit ? hit.id : null; };

const P = [];
const out = (...a) => { P.push(a.join(' ')); console.log(...a); };

out('\n╔══════════════════════════════════════════════════════════════════╗');
out('║  INVARIANT RUNTIME v0 — VALIDATION REPORT (First Sacrifice ×' + stories.length + ')       ║');
out('╚══════════════════════════════════════════════════════════════════╝');

const agg = { integrityViolations: 0, storiesClean: 0, realizedTotals: [], retriesTotal: 0, branchTotal: 0 };

for (const s of stories) {
  const h = s.harvest || {};
  const life = (h.lifecycleData && h.lifecycleData.lifetimes) || {};
  const evalLog = (h.lifecycleData && h.lifecycleData.evalLog) || [];
  const snap = (h.lifecycleData && h.lifecycleData.snapshot) || [];
  const realizedAt = {}; // id → scene canonical (or undefined)
  DAG.forEach(d => {
    const ev = (life[d.id] || []).find(e => e.event === 'canonical');
    if (ev) realizedAt[d.id] = ev.scene;
  });
  const realizedIds = Object.keys(realizedAt);

  out('\n────────────────────────────────────────────────────────────────────');
  out(`STORY ${s.story}  · seed "${s.seed.act.slice(0, 46)}…"  · scenes rendered: ${h.prose ? h.prose.length : 0}  · turnCount ${h.turnCount}`);
  out('────────────────────────────────────────────────────────────────────');
  out('  final invariant states: ' + snap.map(x => `${x.id}=${x.status}${x.realized_at != null ? '@' + x.realized_at : ''}`).join('  '));

  // ── METRIC 1: SERIALIZATION INTEGRITY (target ZERO) ──────────────────────
  let viol = 0; const violDetail = [];
  // (a) DAG order — a truth canonical before a dependency was canonical
  DAG.forEach(d => {
    if (realizedAt[d.id] == null) return;
    (depsOf[d.id] || []).forEach(dep => {
      if (realizedAt[dep] == null || realizedAt[dep] > realizedAt[d.id]) {
        viol++; violDetail.push(`${d.id} canonical@${realizedAt[d.id]} but dep ${dep} ${realizedAt[dep] == null ? 'NEVER realized' : 'realized@' + realizedAt[dep]}`);
      }
    });
  });
  // (b) prompt leak — an author directive surfaced a truth as canonical (TRUE) before it was realized
  (h.directives || []).forEach(dobj => {
    const lines = String(dobj.out || '').split('\n');
    lines.forEach(ln => {
      const m = ln.match(/\[TRUE, since scene (\d+)\]\s*(.+)$/);
      if (m) {
        const claimScene = Number(m[1]); const id = findIdByStatement(m[2]);
        if (id && (realizedAt[id] == null || realizedAt[id] > dobj.turn)) {
          viol++; violDetail.push(`directive@turn${dobj.turn} surfaced ${id} as TRUE but it realized ${realizedAt[id] == null ? 'NEVER' : '@' + realizedAt[id]}`);
        }
      }
    });
  });
  agg.integrityViolations += viol;
  if (viol === 0) agg.storiesClean++;
  out(`\n  [1] SERIALIZATION INTEGRITY: ${viol === 0 ? '✓ ZERO violations — no prompt consumed an unrealized truth' : '✗ ' + viol + ' VIOLATION(S)'}`);
  violDetail.forEach(v => out('        ! ' + v));

  // ── METRIC 2: DELIVERY RATE ──────────────────────────────────────────────
  const evalScenes = evalLog.length;
  const satisfiedScenes = evalLog.filter(e => e.status === 'satisfied' && e.confidence >= 0.75).length;
  agg.realizedTotals.push(realizedIds.length);
  out(`\n  [2] DELIVERY RATE: ${realizedIds.length}/5 truths realized  ·  per-scene landing ${satisfiedScenes}/${evalScenes} eval scenes` +
      `  (${evalScenes ? Math.round(100 * satisfiedScenes / evalScenes) : 0}%)`);
  out('        realized order: ' + DAG.filter(d => realizedAt[d.id] != null).sort((a, b) => realizedAt[a.id] - realizedAt[b.id]).map(d => `${d.id}@${realizedAt[d.id]}`).join(' → '));

  // ── METRIC 3: RETRY BEHAVIOR (partial→…→satisfied) ───────────────────────
  const retries = [];
  DAG.forEach(d => {
    const ev = life[d.id] || [];
    const partials = ev.filter(e => e.event === 'partial');
    const sat = ev.find(e => e.event === 'satisfied');
    const forced = ev.filter(e => e.event === 'forced');
    if (partials.length || forced.length) retries.push({ id: d.id, partials, forced, satAt: sat ? sat.scene : null });
  });
  agg.retriesTotal += retries.length;
  out(`\n  [3] RETRY BEHAVIOR: ${retries.length} invariant(s) needed >1 attempt` + (retries.length ? ' (read the reason chain for pressure-vs-repetition):' : ''));
  retries.forEach(r => {
    out(`        ${r.id}${r.satAt != null ? ' (landed @' + r.satAt + ')' : ' (never landed)'}`);
    r.partials.forEach(p => out(`          · partial @s${p.scene}: ${p.detail}`));
    r.forced.forEach(f => out(`          · FORCED @s${f.scene}: ${f.detail}`));
  });

  // branch risks
  const branches = (h.lifecycleData && h.lifecycleData.branchRisks) || [];
  agg.branchTotal += branches.length;
  if (branches.length) { out(`\n  [~] BRANCH RISKS (irreversible events that matched no available truth): ${branches.length}`); branches.forEach(b => out(`        · s${b.scene}: ${b.reason}`)); }

  // ── EVALUATOR TRANSCRIPT (the dominant-risk readout) ─────────────────────
  out('\n  [EVALUATOR TRANSCRIPT] — read these decisions against the prose:');
  evalLog.forEach(e => {
    out(`        s${e.scene}  avail=[${e.available.join(',')}] → ${String(e.status).toUpperCase()}${e.satisfied_id ? ' ' + e.satisfied_id : ''} conf=${e.confidence != null ? e.confidence.toFixed(2) : '?'}${e.matched_via ? ' via=' + e.matched_via : ''}${e.branch_risk ? ' [BRANCH]' : ''}`);
    if (e.reason) out(`            reason: ${e.reason}`);
  });

  // ── AUTHOR REALIZATION FIDELITY (Workstream B): Target vs Actual + delta ──
  out('\n  [FIDELITY] Target beat vs what the author ACTUALLY delivered (the substitution pattern):');
  out('        scene | target        | verdict | actual beat            | Δrel (obs → expected)');
  evalLog.forEach(e => {
    const tgt = e.target_id || (e.available && e.available[0]) || '?';
    const exp = EXPECTED_DELTA[tgt];
    const obs = (e.relationship_delta != null) ? (e.relationship_delta > 0 ? '+' + e.relationship_delta : '' + e.relationship_delta) : '?';
    const expS = (exp != null) ? (exp > 0 ? '+' + exp : '' + exp) : '?';
    const v = e.status === 'satisfied' ? 'LAND ' : (e.branch_risk ? 'BRnch' : 'miss ');
    out(`        s${String(e.scene).padEnd(4)} | ${String(tgt).padEnd(13)} | ${v} | ${String(e.actual_beat || '—').padEnd(22)} | ${obs} → ${expS}`);
  });
  // substitution summary: for MISSED negative-beats, what did the author substitute?
  const negMiss = evalLog.filter(e => e.status !== 'satisfied' && EXPECTED_DELTA[e.target_id] < 0);
  if (negMiss.length) {
    const beats = {};
    negMiss.forEach(e => { const b = (e.actual_beat || 'unknown').toLowerCase(); beats[b] = (beats[b] || 0) + 1; });
    out('        SUBSTITUTION (negative beat asked, author delivered instead): ' + Object.entries(beats).map(([b, n]) => `${b}×${n}`).join(', '));
    const avgObs = negMiss.filter(e => e.relationship_delta != null).reduce((s, e) => s + e.relationship_delta, 0) / (negMiss.filter(e => e.relationship_delta != null).length || 1);
    out(`        → asked for negative beats (Δ<0); author's average observed Δrel = ${avgObs >= 0 ? '+' : ''}${avgObs.toFixed(1)} (the "constructive-beat gravity")`);
  }

  // ── AXES ──────────────────────────────────────────────────────────────────
  const af = h.axisFinal || {};
  const smeTotal = (s.sceneResults || []).reduce((n, r) => n + ((r.axis && r.axis.smeButtons) || 0), 0);
  const smeClicked = (s.sceneResults || []).filter(r => r.axis && r.axis.clicked).length;
  out('\n  [AXES] reader-preference axes:');
  out(`        demand/hint (directness): ${af.scene1Directness || 'NOT SET'}   ·   objective↔relationship tally: obj ${af.obj} / rel ${af.rel}   ·   storyGravity: ${af.storyGravity || 'unresolved'}`);
  out(`        microDecision forks surfaced across run: ${smeTotal} (resolved by harness: ${smeClicked})` + (smeTotal === 0 ? '  ⚠ NO axis forks surfaced — axes cannot land without them' : ''));

  // ── prose dump for the blind read (metric 4) ─────────────────────────────
  const proseFile = `${OUT}/story_${s.story}_prose.txt`;
  const proseTxt = (h.prose || []).map((p, i) => `\n───── SCENE ${i + 1} ─────\n${p}`).join('\n');
  fs.writeFileSync(proseFile, `STORY ${s.story} · seed: ${s.seed.act} / "${s.seed.dia}"\n\n${proseTxt}`);
  out(`\n  [4] NARRATIVE INEVITABILITY: prose → ${proseFile} (blind read)`);
}

out('\n╔══════════════════════════════════════════════════════════════════╗');
out('║  AGGREGATE                                                        ║');
out('╚══════════════════════════════════════════════════════════════════╝');
out(`  Serialization integrity: ${agg.storiesClean}/${stories.length} stories with ZERO violations (${agg.integrityViolations} total violations across all).`);
out(`  Delivery: truths realized per story = [${agg.realizedTotals.join(', ')}] of 5.`);
out(`  Retry: ${agg.retriesTotal} invariant-retries across all stories.  Branch risks: ${agg.branchTotal}.`);
out(`\n  VERDICT ON THE FRACTURE: ${agg.integrityViolations === 0 ? '✓ Across all ' + stories.length + ' stories, no downstream prompt EVER consumed an unrealized truth. The divergence did not occur.' : '✗ ' + agg.integrityViolations + ' integrity violation(s) — investigate.'}`);
out(`\n  (Delivery rate and inevitability are judgment calls — read the transcript + prose. Evaluator reliability is the thing to scrutinize.)`);

fs.writeFileSync(`${OUT}/REPORT.txt`, P.join('\n'));
console.log(`\nwrote ${OUT}/REPORT.txt`);
