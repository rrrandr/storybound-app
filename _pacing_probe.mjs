// PACING-CAPABILITY PROBE (Roman 2026-07-27) — isolates ONE question the whole investigation never asked
// cleanly: can a long-form author OBEY a pacing specification? No planner, no runtime, no rollback, no full
// story. Fixed inputs, ~2000-word passages, MANY trials. Measure ONLY the first-irreversible-event position.
//
//   CONTROL arm: "write the scene; the event must become true" (no pacing spec) → where does long-form NATURALLY
//               put the irreversible beat? (If ~90-100%, end-jamming is inherent to long-form, not our prompt.)
//   SPEC arm:    + "the irreversible event must occur between 40% and 60%" → does an explicit spec MOVE it?
//
//   If SPEC still lands ~90-100% → long-form generation cannot obey a mid-scene pacing spec (fundamental).
//   If SPEC lands ~50%          → the author CAN; the PRODUCTION system introduces the end-jamming pathology.
//
//   node _pacing_probe.mjs [N=15]
// Author = Grok (production premium model). Verifier = gpt-4o-mini. Both confirmed 100% realization-capable.

const BASE = 'http://localhost:3000';
const N = parseInt(process.argv[2] || '15', 10);

const COMMITTED = [
  'A living chain has seized Sekka in the underwater market and will not release her.',
  'Sekka and Kael are bound together in forced proximity by the chain\'s magic.',
  'Veyra the Chain-Warden is present, hostile, and watching them.'
];
const TRANSITION = 'Sekka uncovers a hidden inscription on the snapped chain, glowing symbols surfacing beneath the debris she clears.';

async function cp(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  return (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '';
}

const BASE_SYS = 'You are a literary prose author. Write ONE LONG scene (~2000 words) of an underwater-fantasy romance. '
  + 'The scene has ONE irreversible event that MUST become concretely, observably true on the page (show it happen — a sound, a movement, a body reacting, an object changing; never a flat summary). Output ONLY the prose.';
const SPEC_LINE = ' PACING REQUIREMENT (HARD): the irreversible event must occur between 40% and 60% of the way through the scene — NOT front-loaded in the opening, and NOT saved for the final paragraphs. The first ~40% builds pressure toward it; the final ~40% depicts its consequences and aftermath.';

async function write(spec, i) {
  const sys = BASE_SYS + (spec ? SPEC_LINE : '');
  const usr = 'COMMITTED WORLD STATE (already true):\n- ' + COMMITTED.join('\n- ')
    + '\n\nTHE IRREVERSIBLE EVENT THAT MUST BECOME TRUE:\n' + TRANSITION + '\n\n(Rendering #' + i + '.) Write the ~2000-word scene now.';
  return cp('/api/proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.8, max_tokens: 3200, convId: 'pacing-' + (spec ? 'spec' : 'ctl') + '-' + i });
}

async function measurePos(prose) {
  const sys = 'Read the PROSE and report, as an INTEGER PERCENTAGE 0-100, how far through the text the FIRST irreversible event occurs — any revelation, discovery, transformation, betrayal, attack, or confession after which the scene can no longer simply continue as before. Use -1 if nothing irreversible happens. STRICT JSON: {"first_irreversible_position":50}';
  const raw = await cp('/api/chatgpt-proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: 'PROSE:\n' + prose.slice(0, 9000) }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 40, jsonMode: true });
  try { return JSON.parse(raw).first_irreversible_position; } catch (_) { const m = String(raw).match(/-?\d+/); return m ? parseInt(m[0]) : -1; }
}

function report(label, positions) {
  const present = positions.filter(p => p >= 0);
  const absent = positions.length - present.length;
  const band = p => p < 0 ? 'absent' : p < 20 ? '<20' : p <= 40 ? '20-40' : p <= 60 ? '40-60✓' : p <= 85 ? '60-85' : '>85';
  const bands = {}; positions.forEach(p => { const b = band(p); bands[b] = (bands[b] || 0) + 1; });
  const mean = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : '-';
  const med = present.length ? present.slice().sort((a, b) => a - b)[Math.floor(present.length / 2)] : '-';
  console.log('  ' + label.padEnd(9) + ' n=' + positions.length + '  present=' + present.length + ' absent=' + absent
    + '  mean=' + mean + '% median=' + med + '%');
  console.log('           positions=[' + positions.map(p => p < 0 ? 'X' : p).join(',') + ']');
  console.log('           bands=' + JSON.stringify(bands));
}

const results = {};
for (const arm of [{ k: 'CONTROL', spec: false }, { k: 'SPEC', spec: true }]) {
  process.stderr.write('arm ' + arm.k + ' …\n');
  const pos = [];
  for (let i = 1; i <= N; i++) {
    try { const p = await write(arm.spec, i); const x = await measurePos(p); pos.push(x); process.stderr.write('  #' + i + ' first_irreversible@' + (x < 0 ? 'ABSENT' : x + '%') + '\n'); }
    catch (e) { pos.push(-1); process.stderr.write('  #' + i + ' ERR ' + e.message + '\n'); }
  }
  results[arm.k] = pos;
}

console.log('\n════════ PACING-CAPABILITY: first-irreversible position (isolated, ~2000-word scenes) ════════');
report('CONTROL', results.CONTROL);
report('SPEC', results.SPEC);
console.log('\nread: SPEC lands ~90-100% → long-form CANNOT obey a mid-scene pacing spec (fundamental).');
console.log('      SPEC lands ~40-60% → author CAN; the PRODUCTION prompt is what end-jams (pathology is downstream).');
