// REALIZATION PROBE (Roman 2026-07-27) — isolate the AUTHOR's realization capability from the long-form
// attractor. Fix CommittedState + a ProposedTransition; ask the author for N INDEPENDENT realizations of that
// ONE transition (minimal context, NO continuation window / prior scenes — so nothing pulls it into a stable
// dramatic attractor); score each with the SAME delivery verifier the runtime uses. Runtime stays FROZEN.
//
//   If a transition delivers ~4-5/5 in isolation but MISSES in full runs → the attractor (long-form context)
//   is the problem, not realization. If it delivers 0-1/5 even in isolation → realization itself is weak.
//   Extended to 3 transition TYPES (discovery / transformation / dialogue-reveal) to test the taxonomy:
//   do transformations/dialogue realize reliably while discoveries don't, even absent the attractor?
//
//   node _realization_probe.mjs [N=5]
// Author = production prose model (Grok, /api/proxy SPECIALIST_RENDERER). Verifier = gpt-4o-mini (/api/chatgpt-proxy),
// identical to the runtime Commit-Scene verifier.

const BASE = 'http://localhost:3000';
const N = parseInt(process.argv[2] || '5', 10);

// Fixed committed world state (the "before" every realization shares)
const COMMITTED = [
  'A living chain has seized Sekka in the underwater market and will not release her.',
  'Sekka and Kael are bound together in forced proximity by the chain\'s magic.',
  'Veyra the Chain-Warden is present, hostile, and watching them.'
];

// Fixed proposed transitions, one per taxonomy type (grounded in the real runs)
const TRANSITIONS = [
  { type: 'discovery',      event: 'Sekka uncovers a hidden inscription on the snapped chain, glowing symbols surfacing beneath the debris she clears.' },
  { type: 'transformation', event: 'A pale sigil flares across the inside of Kael\'s wrist — three interlocked spirals — burning into view and marking him bound to the chains.' },
  { type: 'dialogue_reveal',event: 'Kael says aloud, for the first time, that he has been hunting the Chain-Wardens for five years because they keep killing the people he loves.' },
  { type: 'external_event', event: 'The chain snaps taut without warning and drags Sekka off her feet toward the water\'s edge.' }
];

async function callProxy(path, body) {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 160));
  const data = await res.json();
  return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || (data && data.content) || '';
}

// AUTHOR: minimal-context realization — the exact delivery discipline the runtime uses, no attractor.
async function realize(committed, event, variant) {
  const sys = 'You are a literary prose author. Write ONE passage (~350-450 words) of an underwater-fantasy romance scene. '
    + 'The scene has ONE organizing event that MUST become irrevocably true on the page: everything else exists to deliver it. '
    + 'Stage the event as a concrete, externally-observable on-page MOMENT — show what physically HAPPENS (a sound, a movement, a body reacting, an object changing). '
    + 'NEVER render it as a flat summary or an abstract label ("a shift reveals a hidden thread…", "the fracture becomes visible, revealing a deeper truth…"). '
    + 'The scene is a FAILURE unless the event concretely occurs. Atmosphere, mood, interiority, and dialogue exist to DELIVER the event, never to substitute for it. Output ONLY the prose.';
  const usr = 'COMMITTED WORLD STATE (already true; build FROM it, do not re-establish):\n- ' + committed.join('\n- ')
    + '\n\nTHE EVENT THAT MUST BECOME TRUE ON THE PAGE:\n' + event
    + '\n\n(Realization #' + variant + ' — write a DISTINCT rendering from any other.) Write the passage now.';
  return await callProxy('/api/proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.8, max_tokens: 900, convId: 'realization-probe-' + variant });
}

// VERIFIER: identical semantics to the runtime Commit-Scene verifier.
async function verify(event, prose) {
  const sys = 'You are the RUNTIME COMMIT verifier. Given a PROPOSED TRANSITION (an intended irreversible on-page event) and the PROSE that was written, decide ONE thing: did the prose DELIVER that transition as a concrete, externally-observable ON-PAGE event? Judge ONLY delivery. Output STRICT JSON only.\n'
    + 'delivery: "DELIVERED" (concretely happened), "PARTIAL" (begun / only gestured), or "MISSED" (did not happen).\n'
    + 'dominant_replacement (when PARTIAL/MISSED, what the prose spent most words on instead): "atmosphere"|"relationship_dialogue"|"internal_monologue"|"world_exposition"|"different_event"|"none".\n'
    + 'JSON: {"delivery":"MISSED","dominant_replacement":"atmosphere"}';
  const usr = 'PROPOSED TRANSITION: ' + event + '\n\nPROSE:\n' + prose.slice(0, 6000) + '\n\nReturn the JSON now.';
  const raw = await callProxy('/api/chatgpt-proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 120, jsonMode: true });
  try { return JSON.parse(raw); } catch (_) { const m = String(raw).match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch (_) {} } return { delivery: 'PARSE_FAIL', dominant_replacement: 'none' }; }
}

console.log('REALIZATION PROBE — ' + N + ' independent realizations per transition, isolated (no attractor)\n');
const summary = [];
for (const t of TRANSITIONS) {
  process.stderr.write('probing ' + t.type + ' …\n');
  const verdicts = [];
  for (let i = 1; i <= N; i++) {
    try {
      const prose = await realize(COMMITTED, t.event, i);
      const v = await verify(t.event, prose);
      verdicts.push(v);
      process.stderr.write('  #' + i + ' ' + v.delivery + (v.delivery !== 'DELIVERED' ? (' (replaced_by=' + v.dominant_replacement + ')') : '') + '\n');
    } catch (e) { verdicts.push({ delivery: 'ERROR', dominant_replacement: e.message.slice(0, 40) }); process.stderr.write('  #' + i + ' ERROR ' + e.message + '\n'); }
  }
  const del = verdicts.filter(v => v.delivery === 'DELIVERED').length;
  const par = verdicts.filter(v => v.delivery === 'PARTIAL').length;
  const repl = {}; verdicts.filter(v => v.delivery !== 'DELIVERED').forEach(v => { repl[v.dominant_replacement] = (repl[v.dominant_replacement] || 0) + 1; });
  summary.push({ type: t.type, delivered: del, partial: par, total: N, repl });
}

console.log('\n════════ REALIZATION-BY-TYPE (isolated author, no attractor) ════════');
for (const s of summary) {
  const rate = Math.round(100 * s.delivered / s.total);
  console.log('  ' + s.type.padEnd(16) + ' DELIVERED ' + s.delivered + '/' + s.total + ' (' + rate + '%)  partial=' + s.partial
    + (Object.keys(s.repl).length ? '   misses→ ' + Object.entries(s.repl).map(([k, v]) => k + ':' + v).join(', ') : ''));
}
console.log('\nread: if discovery delivers ~4-5/5 HERE but misses in full runs → the ATTRACTOR is the problem.');
console.log('      if discovery delivers 0-1/5 even HERE → realization of that TYPE is fundamentally weak.');
