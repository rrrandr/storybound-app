// _verifier_probe.mjs — Roman 2026-08-10: INSTRUMENT the verifier before changing the model.
// Test an EVIDENCE-GROUNDED verifier prompt OFFLINE against known cases (the captured false-PASS + a synthetic
// known-PASS control). Rule: every slot must cite a VERBATIM quote from the scene prose; empty quote → slot FALSE.
// Cheap (~4 gpt-4o-mini calls), no story gen, no production change. Answers: does grounding+evidence stop the
// rubber-stamp with the SAME cheap model — or is the failure deeper (model / inputs)?
import fs from 'fs';

const PROXY = 'http://localhost:3000/api/chatgpt-proxy';
const CV = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/channel_validation.json';
const MODEL = process.argv[2] || 'gpt-4o-mini';

const VSYS = 'You are the RUNTIME COMMIT verifier for an interactive story engine. You are given a SCENE PROSE and a PLANNED EVENT (four slots). For EACH slot you must find the LITERAL supporting text IN THE SCENE PROSE. Ground every judgment ONLY in the scene prose — NEVER in the planned event itself, NEVER in outside context or what "seems consistent". Output STRICT JSON only.\n'
  + 'Return: {"actor_evidence":"<exact verbatim quote from the SCENE PROSE showing this actor performs the action, else empty string>","action_evidence":"<verbatim quote showing the action occurs, else empty>","target_evidence":"<verbatim quote showing the target is present and receiving the action, else empty>","exit_state_evidence":"<verbatim quote showing the exit state became TRUE on the page, else empty>","occurred_this_scene":true|false}.\n'
  + 'HARD RULES: (1) Every evidence value MUST be a verbatim substring copied from the SCENE PROSE. If you cannot find supporting text in the prose, return "" — do NOT paraphrase, do NOT infer, do NOT write "the scene implies". (2) If the actor or target named in the slots does not literally appear and act in the prose, its evidence is "". (3) occurred_this_scene = did the event happen DURING this prose, not merely set up for later.';

async function verify(prose, slots) {
  const usr = 'SCENE PROSE (judge ONLY this text):\n' + String(prose).slice(0, 6000)
    + '\n\nPLANNED EVENT SLOTS:\n  ACTOR: ' + slots.actor + '\n  ACTION: ' + slots.action + '\n  TARGET: ' + slots.target + '\n  EXIT STATE: ' + slots.exit
    + '\n\nFor each slot, return the verbatim quote from the SCENE PROSE that supports it, or "" if none exists. Return the JSON now.';
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: VSYS }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: MODEL, temperature: 0.1, max_tokens: 420, jsonMode: true }) });
    if (!r.ok) return { error: 'http ' + r.status };
    const d = await r.json();
    const c = d.content || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    try { return JSON.parse(c); } catch (_) { const m = String(c || '').match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : { error: 'parse' }; }
  } catch (e) { return { error: String(e && e.message) }; }
}

function parseSlots(s) { const g = (k) => { const m = String(s).match(new RegExp(k + '="([^"]*)"')); return m ? m[1] : ''; }; return { actor: g('actor'), action: g('action'), target: g('target'), exit: g('exit') }; }

const D = JSON.parse(fs.readFileSync(CV, 'utf8'));
const cases = [];
// Known cases from the failed run (all should FAIL — planner events absent from prose)
for (let i = 0; i < Math.min(3, D.eventSlots.length); i++) cases.push({ name: 'run-scene-' + i, slots: parseSlots(D.eventSlots[i]), prose: (D.scenes || [])[i] || '', expect: 'FAIL' });
// Synthetic known-PASS control (the event clearly happens in the prose)
cases.push({ name: 'synthetic-PASS-control', expect: 'PASS',
  slots: { actor: 'Julian', action: 'confesses', target: 'the elders', exit: 'the elders now know Julian made the forbidden wish' },
  prose: 'The clearing went silent. Julian stepped past me and faced the circle of elders. "It was me," he said, his voice steady and clear. "I made the wish. The blame is mine, not hers." A gasp moved through the gathered elders. He had confessed openly, before them all, and there was no taking it back.' });

console.log('=== EVIDENCE-GROUNDED VERIFIER PROBE (model=' + MODEL + ') ===');
let correct = 0;
for (const c of cases) {
  const p = await verify(c.prose, c.slots);
  if (p.error) { console.log('\n' + c.name + ' → ERROR ' + p.error); continue; }
  const has = x => typeof x === 'string' && x.trim().length > 3;
  const aOk = has(p.actor_evidence), acOk = has(p.action_evidence), tOk = has(p.target_evidence), eOk = has(p.exit_state_evidence);
  const fail = (!eOk || !aOk || !acOk || !tOk || p.occurred_this_scene === false);
  const verdict = fail ? 'FAIL' : 'PASS';
  const ok = verdict === c.expect;
  if (ok) correct++;
  console.log('\n=== ' + c.name + ' (expect ' + c.expect + ') → ' + verdict + (ok ? ' ✓' : ' ✗ MISMATCH') + ' ===');
  console.log('  SLOTS: actor="' + c.slots.actor + '" action="' + c.slots.action + '" target="' + c.slots.target + '"');
  console.log('  actor_evidence : ' + (p.actor_evidence || '(EMPTY)'));
  console.log('  action_evidence: ' + (p.action_evidence || '(EMPTY)'));
  console.log('  target_evidence: ' + (p.target_evidence || '(EMPTY)'));
  console.log('  exit_evidence  : ' + (p.exit_state_evidence || '(EMPTY)'));
  console.log('  occurred_this_scene: ' + p.occurred_this_scene);
}
console.log('\n=== ACCURACY: ' + correct + '/' + cases.length + ' correct (model=' + MODEL + ') ===');
process.exit(0);
