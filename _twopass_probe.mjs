// TWO-PASS (VERIFIED TRANSITION-FIRST) PROBE (Roman 2026-07-28) — the one thing the investigation never tested:
// does the irreversible event survive JOINT generation against many competing objectives? Every 100% probe had
// the author carrying EXACTLY ONE irreversible obligation. Production has ~20. This reproduces that load in a
// controlled setting AND tests the "narrative two-phase commit" architecture.
//
//   ONE-PASS: transition + ~15 competing objectives in ONE ~2000-word decode → does the event go ABSENT (like prod)?
//   TWO-PASS: Pass1 realizes+verifies the event ALONE (~200 words) → freeze → Pass2 expands the full scene around
//             the FROZEN pivot. The author never gets to omit the event; it decides setup/escalation/prose/aftermath.
//
//   If ONE-PASS < 100% (pathology reproduced) AND TWO-PASS ~100% → cause isolated + architecture validated.
//   node _twopass_probe.mjs [N=12]

const BASE = 'http://localhost:3000';
const N = parseInt(process.argv[2] || '12', 10);

const COMMITTED = [
  'A living chain has seized Sekka in the underwater market and will not release her.',
  'Sekka and Kael are bound together in forced proximity by the chain\'s magic.',
  'Veyra the Chain-Warden is present, hostile, and watching them.'
];
const TRANSITION = 'Sekka uncovers a hidden inscription on the snapped chain, glowing symbols surfacing beneath the debris she clears.';

// Approximate production's multi-objective load (the ~20 simultaneous demands).
const LOAD = 'COMPETING OBJECTIVES — the scene must ALSO honor ALL of these:\n'
  + '- beautiful literary prose with varied sentence rhythm and a distinctive voice\n'
  + '- advance the romantic tension between Sekka and Kael; deepen longing, resistance, vulnerability\n'
  + '- rich sensory worldbuilding (the breathing underwater market, bioluminescence, the living chains)\n'
  + '- characterize Sekka through interior voice and Kael through behavior and restraint\n'
  + '- weave in Veyra\'s hostile watching presence and the social pressure of the crowd\n'
  + '- subtext beneath the dialogue — nothing stated flatly; imply more than you say\n'
  + '- physical grounding: bodies, movement, texture, the cold weight of water\n'
  + '- callbacks to the chain\'s magic and the bond that ties them\n'
  + '- pacing that builds and breathes; atmosphere and mood throughout\n'
  + '- an emotionally resonant closing beat that leaves tension unresolved\n';

async function cp(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  return (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '';
}

async function grok(sys, usr, maxTok, tag) {
  return cp('/api/proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.8, max_tokens: maxTok, convId: tag });
}

async function verify(prose) {
  const sys = 'RUNTIME COMMIT verifier. Given a PROPOSED TRANSITION and PROSE, decide: did the prose DELIVER it as a concrete on-page event? Also give first_irreversible_position (INTEGER % 0-100 where the transition first concretely occurs, -1 if absent). STRICT JSON: {"delivery":"DELIVERED|PARTIAL|MISSED","position":-1}';
  const raw = await cp('/api/chatgpt-proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: 'TRANSITION: ' + TRANSITION + '\n\nPROSE:\n' + prose.slice(0, 9000) }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 60, jsonMode: true });
  try { const o = JSON.parse(raw); return { delivery: String(o.delivery || 'MISSED').toUpperCase(), position: (typeof o.position === 'number') ? o.position : -1 }; }
  catch (_) { const m = String(raw).match(/DELIVERED|PARTIAL|MISSED/); return { delivery: m ? m[0] : '?', position: -1 }; }
}

const CTX = 'COMMITTED WORLD STATE (already true):\n- ' + COMMITTED.join('\n- ');

async function onePass(i) {
  const sys = 'You are a literary prose author. Write ONE LONG scene (~2000 words) of an underwater-fantasy romance. It has ONE irreversible event that MUST become concretely true on the page (show it happen; never a flat summary).\n' + LOAD;
  const usr = CTX + '\n\nTHE IRREVERSIBLE EVENT THAT MUST BECOME TRUE:\n' + TRANSITION + '\n\n(#' + i + ') Write the ~2000-word scene now.';
  return grok(sys, usr, 3200, 'onepass-' + i);
}

async function twoPass(i) {
  // Pass 1 — realize the event ALONE
  const p1sys = 'You are a prose author. Output ONLY the irreversible event below happening and its IMMEDIATE consequences — 150-250 words. NO setup, NO worldbuilding, NO wider scene. Just the event occurring concretely on the page and the first reaction to it.';
  const p1 = await grok(p1sys, CTX + '\n\nTHE EVENT:\n' + TRANSITION + '\n\nWrite it now.', 500, 'twopass-p1-' + i);
  const v1 = await verify(p1);
  // Pass 2 — expand the full scene around the FROZEN pivot
  const p2sys = 'You are a literary prose author. Write ONE LONG scene (~2000 words) of an underwater-fantasy romance.\n' + LOAD
    + '\nPIVOT (already TRUE and FROZEN — incorporate it VERBATIM as the scene\'s turning point; you may NOT alter, soften, or omit it): "' + p1.replace(/"/g, "'").slice(0, 800) + '"';
  const p2usr = CTX + '\n\nBuild the scene TO this pivot, then depict its aftermath. Everything serves it. (#' + i + ') Write the ~2000-word scene now.';
  const p2 = await grok(p2sys, p2usr, 3200, 'twopass-p2-' + i);
  return { final: p2, pass1Delivery: v1.delivery };
}

function summarize(label, verdicts) {
  const del = verdicts.filter(v => v.delivery === 'DELIVERED').length;
  const absent = verdicts.filter(v => v.delivery === 'MISSED').length;
  const pos = verdicts.map(v => v.position);
  console.log('  ' + label.padEnd(9) + ' DELIVERED ' + del + '/' + verdicts.length + '  MISSED=' + absent
    + '  positions=[' + pos.map(p => p < 0 ? 'X' : p).join(',') + ']');
}

const one = [], two = [];
process.stderr.write('ONE-PASS (joint generation under load) …\n');
for (let i = 1; i <= N; i++) { try { const p = await onePass(i); const v = await verify(p); one.push(v); process.stderr.write('  one#' + i + ' ' + v.delivery + '@' + (v.position < 0 ? 'X' : v.position) + '\n'); } catch (e) { one.push({ delivery: 'ERR', position: -1 }); process.stderr.write('  one#' + i + ' ERR ' + e.message + '\n'); } }
process.stderr.write('TWO-PASS (verified transition-first) …\n');
for (let i = 1; i <= N; i++) { try { const r = await twoPass(i); const v = await verify(r.final); two.push(v); process.stderr.write('  two#' + i + ' P1=' + r.pass1Delivery + ' final=' + v.delivery + '@' + (v.position < 0 ? 'X' : v.position) + '\n'); } catch (e) { two.push({ delivery: 'ERR', position: -1 }); process.stderr.write('  two#' + i + ' ERR ' + e.message + '\n'); } }

console.log('\n════════ TWO-PASS vs ONE-PASS (isolated, ~2000-word scenes, heavy multi-objective load) ════════');
summarize('ONE-PASS', one);
summarize('TWO-PASS', two);
console.log('\nread: ONE-PASS < 100% reproduces the production ABSENT pathology in isolation (multi-objective load IS the cause).');
console.log('      TWO-PASS ~100% validates verified-transition-first architecture (event survives because it is committed BEFORE the 2000 words).');
