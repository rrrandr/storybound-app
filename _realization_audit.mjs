// SCENE-REALIZATION AUDIT (Roman 2026-07-27) — the third instrument, born from the milestone-exec v0
// run where the two existing judges DISAGREED: [MILESTONE-EXEC] telemetry said the planner emitted a
// DIFFERENT tactical move every scene, yet _crossscene_legibility said the PROSE was 100% repeat. That
// disagreement localizes the bottleneck to SCENE REALIZATION: does the author actually EXECUTE the
// requested tactical move, or does it flatten every move into the same emotionally-coherent exchange?
//
// This judge puts, per scene, the REQUESTED tactical move next to the GENERATED prose and asks ONE
// question Roman posed: which input DOMINATED generation — the tactical intent, or emotional/environmental
// continuity (tense relationship + the previous scene's beat)? It does NOT judge prose quality.
//
//   node _realization_audit.mjs <run.json> <run.tags.log>
// Ground truth for the tactical move is the truncated [MILESTONE-EXEC] `tactical=` field (~120 chars);
// the judge is told it may be cut mid-sentence and to judge on the gist. For a CONFIRMATORY pass, log the
// full hardBeats (app.js [PLOT-CONTRACT:BEATS-FULL]) and this judge reads those instead.

import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const STORY = process.argv[2];
const TAGS  = process.argv[3];
if (!STORY || !TAGS) { console.error('usage: node _realization_audit.mjs <run.json> <run.tags.log>'); process.exit(1); }

async function grokJSON(sys, usr, { maxTokens = 2600 } = {}) {
  const res = await fetch(BASE + '/api/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.1, max_tokens: maxTokens, convId: 'realization-audit' })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  let raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || (data && data.content) || '';
  raw = String(raw || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(raw); } catch (_) {
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s !== -1 && e !== -1) { try { return JSON.parse(raw.slice(s, e + 1).replace(/,\s*([}\]])/g, '$1')); } catch (_) {} }
    throw new Error('unparseable: ' + raw.slice(0, 200));
  }
}

const strip = (t) => String(t || '').replace(/\[[A-Z][^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

// pull the requested move per scene, in order. SCENE-SPINE v0: prefer the canonical [STATE-CHANGE:EVENT]
// (the state_change is the sole authority); fall back to legacy [MILESTONE-EXEC] tactical= for old runs.
const _tagLines = fs.readFileSync(TAGS, 'utf8').split('\n');
let tacticals = _tagLines
  .filter(l => /\[STATE-CHANGE:EVENT\]/.test(l))
  .map(l => (l.match(/::\s*(.*)$/) || [])[1] || '')
  .filter(Boolean);
const _srcLabel = tacticals.length ? 'state_change' : 'milestone-exec(legacy)';
if (!tacticals.length) {
  tacticals = _tagLines
    .filter(l => /\[MILESTONE-EXEC\]/.test(l))
    .map(l => (l.match(/tactical="([^"]*)"/) || [])[1] || '')
    .filter(Boolean);
}

const raw = JSON.parse(fs.readFileSync(STORY, 'utf8'));
const scenes = (raw.scenes || []).filter(s => (s.text || '').length > 80);
const meta = raw.meta || {};

const N = Math.min(scenes.length, tacticals.length);
console.log('SCENE-REALIZATION AUDIT — story=' + STORY);
console.log('  scenes=' + scenes.length + '  tactical-moves=' + tacticals.length + '  paired(by order)=' + N
  + '  world=' + (meta.world || '?') + '/' + (meta.worldSubtype || '?'));
if (scenes.length !== tacticals.length) console.log('  ⚠ count mismatch — pairing is APPROXIMATE (turnCount labeling quirk); read verdicts as screening, not exact.');

const SYS =
  'You are a SCENE-REALIZATION diagnostician for a fiction engine. A planner hands the author a REQUESTED '
  + 'TACTICAL MOVE for each scene (what should concretely happen). You judge ONE thing: did the generated '
  + 'PROSE actually EXECUTE that move, or did it flatten into a different, emotionally-coherent exchange '
  + '(e.g. re-render the previous scene\'s argument/accusation/atmosphere)? You do NOT judge prose quality, '
  + 'beauty, or style. The requested-move text may be TRUNCATED mid-sentence — judge on its gist. Output '
  + 'STRICT JSON ONLY, no fences.\n\n'
  + 'For the scene, decide:\n'
  + '  move_executed ("yes"|"partial"|"no"): did the prose dramatize the requested tactical move as an '
  + 'on-page event (a thing that HAPPENS), not merely gesture at it? "no" = the move does not occur; '
  + '"partial" = alluded to but not dramatized; "yes" = it concretely happens on the page.\n'
  + '  prose_dramatizes (str): one sentence — what the scene ACTUALLY does on the page.\n'
  + '  dominating_input ("tactical_move"|"emotional_continuity"|"prior_scene_replay"|"atmosphere"): which '
  + 'input best EXPLAINS the prose? "tactical_move" = the requested move drove the scene; "emotional_continuity" '
  + '= the scene did whatever was emotionally coherent given the tense relationship (another argument/accusation/'
  + 'standoff) regardless of the move; "prior_scene_replay" = re-renders the previous scene\'s beat; "atmosphere" '
  + '= re-establishes setting/mood instead of advancing.\n'
  + '  flattened_into (str|null): if not executed, the generic beat it collapsed into (e.g. "the same accusation "'
  + '+ "standoff"), else null.\n'
  + '  move_type (classify the REQUESTED MOVE by what KIND of camera-visible thing it asks for — judge the MOVE, '
  + 'not the prose): "visible_event" (a physical action/occurrence happens — a chain snaps, a door is forced); '
  + '"visible_dialogue" (a spoken reveal/confrontation/admission — someone says the thing); "visible_discovery" '
  + '(the PC finds / sees / uncovers a thing — a ledger, an inscription); "visible_transformation" (something '
  + 'changes state — a mark appears, an object activates, a body shifts); "abstract" (names ONLY a mental state — '
  + 'discover/realize/understand — with NO camera-visible event; this is the shape the stageability transform is '
  + 'meant to eliminate).\n'
  + '  state_change_ownership ("organizing"|"subordinate"|"absent"): did the REQUESTED EVENT become the SCENE\'S '
  + 'ORGANIZING PRINCIPLE — the thing the scene is fundamentally ABOUT, that reorganizes the dramatic interaction '
  + '— ("organizing"), or did it merely APPEAR on the page as a detail while some OTHER through-line (an argument, '
  + 'a standoff) owned the scene ("subordinate"), or did it not appear at all ("absent")? This is the KEY metric: '
  + '"subordinate" = the event was inserted but inert; the scene was still about something else.\n'
  + '  outcome_delivered ("delivered"|"partial"|"missed"): did the scene actually END in a NEW, changed dramatic '
  + 'state that the event forces — i.e. by the last line, is the world materially different and un-revertible — '
  + '("delivered"), or did the event happen but the scene close in essentially the SAME state it opened in '
  + '("missed"), or somewhere between ("partial")? A scene can organize around the event and STILL miss the '
  + 'outcome if it snaps back to the prior state.\n'
  + '  evidence (str): a short quote (<=20 words) from the prose supporting the verdict.\n\n'
  + 'JSON schema: {"move_executed":"no","prose_dramatizes":"","dominating_input":"emotional_continuity",'
  + '"flattened_into":"","move_type":"abstract","state_change_ownership":"subordinate","outcome_delivered":"missed","evidence":""}';

const results = [];
for (let i = 0; i < N; i++) {
  const move = tacticals[i];
  const prose = strip(scenes[i].text);
  const usr = 'REQUESTED TACTICAL MOVE (may be truncated): ' + move
    + '\n\nGENERATED PROSE (scene ' + (i + 1) + '):\n' + prose.slice(0, 3200) + '\n\nReturn the JSON now.';
  try {
    const v = await grokJSON(SYS, usr);
    results.push({ scene: i + 1, move, ...v });
    process.stderr.write('  judged scene ' + (i + 1) + '/' + N + '\n');
  } catch (e) {
    results.push({ scene: i + 1, move, error: e.message });
    process.stderr.write('  scene ' + (i + 1) + ' ERROR ' + e.message + '\n');
  }
}

console.log('\n════════════════ REALIZATION REPORT ════════════════');
console.log('ground-truth source: ' + _srcLabel);
const ok = results.filter(r => !r.error);
const exec = { yes: 0, partial: 0, no: 0 };
const dom = {};
for (const r of ok) {
  exec[r.move_executed] = (exec[r.move_executed] || 0) + 1;
  dom[r.dominating_input] = (dom[r.dominating_input] || 0) + 1;
}
console.log('move EXECUTED : yes=' + (exec.yes || 0) + '  partial=' + (exec.partial || 0) + '  NO=' + (exec.no || 0) + '   (of ' + ok.length + ')');
console.log('DOMINATING input across scenes: ' + Object.entries(dom).map(([k, v]) => k + '=' + v).join('  ·  '));
const ecoDom = (dom.emotional_continuity || 0) + (dom.prior_scene_replay || 0) + (dom.atmosphere || 0);
console.log('→ tactical-driven: ' + (dom.tactical_move || 0) + '/' + ok.length + '   ·   continuity/atmosphere-driven: ' + ecoDom + '/' + ok.length
  + (ecoDom > (dom.tactical_move || 0) ? '   ⚠ REALIZATION FLATTENS TACTICAL INTENT (Roman\'s hypothesis holds)' : ''));

// EXECUTION RATE BY MOVE TYPE (Roman's taxonomy — the richer picture: which KINDS of move execute?)
const byType = {};
for (const r of ok) {
  const t = r.move_type || '?';
  byType[t] = byType[t] || { n: 0, exec: 0, partial: 0 };
  byType[t].n++;
  if (r.move_executed === 'yes') byType[t].exec++;
  else if (r.move_executed === 'partial') byType[t].partial++;
}
console.log('\n── EXECUTION RATE BY MOVE TYPE (does the KIND of move predict execution?) ──');
for (const [t, v] of Object.entries(byType).sort((a, b) => b[1].n - a[1].n)) {
  const pct = v.n ? Math.round(100 * v.exec / v.n) : 0;
  console.log('  ' + t.padEnd(24) + ' executed ' + v.exec + '/' + v.n + ' (' + pct + '%)' + (v.partial ? '  +' + v.partial + ' partial' : ''));
}

// THE 2×2 (Roman's two boundaries): scene-spine OWNERSHIP × OUTCOME delivery — the architectural cells
const own = { organizing: 0, subordinate: 0, absent: 0 };
const deliv = { delivered: 0, partial: 0, missed: 0 };
const grid = { org_del: 0, org_miss: 0, sub_any: 0, absent: 0 };
for (const r of ok) {
  own[r.state_change_ownership] = (own[r.state_change_ownership] || 0) + 1;
  deliv[r.outcome_delivered] = (deliv[r.outcome_delivered] || 0) + 1;
  if (r.state_change_ownership === 'organizing' && r.outcome_delivered === 'delivered') grid.org_del++;
  else if (r.state_change_ownership === 'organizing') grid.org_miss++;
  else if (r.state_change_ownership === 'absent') grid.absent++;
  else grid.sub_any++;
}
console.log('\n── SCENE-SPINE OWNERSHIP × OUTCOME (the two architectural boundaries) ──');
console.log('  ownership : organizing=' + (own.organizing || 0) + '  subordinate=' + (own.subordinate || 0) + '  absent=' + (own.absent || 0) + '   (of ' + ok.length + ')');
console.log('  outcome   : delivered='  + (deliv.delivered || 0) + '  partial=' + (deliv.partial || 0) + '  missed=' + (deliv.missed || 0));
console.log('  ── the cells ──');
console.log('    ✅ organizing + delivered : ' + grid.org_del + '   (spine owns the scene AND the new state holds — success)');
console.log('    ⚠ organizing + missed    : ' + grid.org_miss + '   (event owned the scene but state snapped back — causal lock too weak)');
console.log('    ✗ subordinate            : ' + grid.sub_any + '   (event inserted but inert — the 0/5 failure mode)');
console.log('    ∅ absent                 : ' + grid.absent + '   (event never reached the page)');

console.log('\n── PER SCENE (requested move → what the prose actually did) ──');
for (const r of results) {
  if (r.error) { console.log('  scene ' + r.scene + ': ERROR ' + r.error); continue; }
  const flag = r.move_executed === 'no' ? '✗' : (r.move_executed === 'partial' ? '~' : '✓');
  console.log('  scene ' + r.scene + ' [' + flag + ' ' + (r.move_executed || '?').toUpperCase() + '  type=' + (r.move_type || '?') + '  own=' + (r.state_change_ownership || '?') + '  outcome=' + (r.outcome_delivered || '?') + '  dom=' + (r.dominating_input || '?') + ']');
  console.log('      MOVE : ' + String(r.move).slice(0, 110));
  console.log('      PROSE: ' + (r.prose_dramatizes || ''));
  if (r.flattened_into) console.log('      FLATTENED INTO: ' + r.flattened_into);
  if (r.evidence) console.log('      evidence: "' + r.evidence + '"');
}

fs.writeFileSync('_realization_audit_out.json', JSON.stringify({ story: STORY, results }, null, 2));
console.log('\nfull → _realization_audit_out.json');
