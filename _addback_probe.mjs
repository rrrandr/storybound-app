// ADD-BACK PROBE (Roman 2026-07-27) — pinpoint the ATTRACTOR. The realization probe showed the isolated author
// delivers 20/20. Now start from that facts-only baseline and add ONE context element at a time until delivery
// COLLAPSES. The element that collapses it IS the dominant attractor. Runtime FROZEN (standalone script).
//
// Arms (all share: committed facts + the SAME proposed transition + the delivery mandate):
//   A facts_only              — baseline (expect ~100%)
//   B +raw_prose              — add the real prior-scene prose (a vendor-accusation STANDOFF = the attractor)
//   C +structured_synopsis    — add a MECHANICAL synopsis of that same scene (tableau/last-line/tone/open-actions)
//   D +raw_prose+dynamic      — add raw prose PLUS the COLLISION relationship-dynamic directive
//
// Arm C is the key discriminator (Roman): if B collapses but C holds → RAW PROSE is toxic (structured continuity
// is fine → "prose is evidence not memory"). If both collapse → the model needs prose-level richness. If C holds
// and B collapses → the fix is "structured synopsis instead of raw prose."
//
//   node _addback_probe.mjs [N=5]

import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const N = parseInt(process.argv[2] || '5', 10);
const ARMB = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/564e636e-ec4e-4bd6-9260-4dce17cb1833/scratchpad/ab_armB/run.json';

const strip = t => String(t || '').replace(/\[[A-Z][^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
const PRIOR_PROSE = strip((JSON.parse(fs.readFileSync(ARMB, 'utf8')).scenes || [])[2].text).slice(0, 5000); // the vendor-accusation standoff = the attractor

const COMMITTED = [
  'A living chain has seized Sekka in the underwater market and will not release her.',
  'Sekka and Kael are bound together in forced proximity by the chain\'s magic.',
  'Veyra the Chain-Warden is present, hostile, and watching them.'
];
// The transition to realize — a DISCOVERY (the type that misses in full runs); the standoff prose competes with it.
const TRANSITION = 'Sekka uncovers a hidden inscription on the snapped chain, glowing symbols surfacing beneath the debris she clears.';
const DYNAMIC = 'RELATIONSHIP DYNAMIC (enemies-to-lovers, COLLISION): these two clash in the present — show attraction through resistance, confrontation, and the pull neither will admit.';

async function callProxy(path, body) {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 140));
  const d = await res.json();
  return (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '';
}

const AUTHOR_SYS = 'You are a literary prose author. Write ONE passage (~350-450 words) of an underwater-fantasy romance scene. '
  + 'The scene has ONE organizing event that MUST become irrevocably true on the page: everything else exists to deliver it. '
  + 'Stage the event as a concrete, externally-observable on-page MOMENT — show what physically HAPPENS. NEVER render it as a flat summary or abstract label. '
  + 'The scene is a FAILURE unless the event concretely occurs. Atmosphere, mood, interiority, and dialogue exist to DELIVER the event, never to substitute for it. Output ONLY the prose.';

async function realize(context, variant) {
  const usr = 'COMMITTED WORLD STATE (already true; build FROM it):\n- ' + COMMITTED.join('\n- ')
    + (context ? ('\n\n' + context) : '')
    + '\n\nTHE EVENT THAT MUST BECOME TRUE ON THE PAGE:\n' + TRANSITION
    + '\n\n(Realization #' + variant + ' — distinct rendering.) Write the passage now.';
  return await callProxy('/api/proxy', { messages: [{ role: 'system', content: AUTHOR_SYS }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.8, max_tokens: 900, convId: 'addback-' + variant });
}

async function verify(prose) {
  const sys = 'You are the RUNTIME COMMIT verifier. Given a PROPOSED TRANSITION and the PROSE written, decide: did the prose DELIVER that transition as a concrete, externally-observable ON-PAGE event? Judge ONLY delivery. STRICT JSON only.\n'
    + 'delivery: "DELIVERED"|"PARTIAL"|"MISSED". dominant_replacement (when not delivered): "atmosphere"|"relationship_dialogue"|"internal_monologue"|"world_exposition"|"different_event"|"none".\n'
    + 'JSON: {"delivery":"MISSED","dominant_replacement":"atmosphere"}';
  const raw = await callProxy('/api/chatgpt-proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: 'PROPOSED TRANSITION: ' + TRANSITION + '\n\nPROSE:\n' + prose.slice(0, 6000) + '\n\nReturn the JSON now.' }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 120, jsonMode: true });
  try { return JSON.parse(raw); } catch (_) { const m = String(raw).match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch (_) {} } return { delivery: 'PARSE_FAIL', dominant_replacement: 'none' }; }
}

// Mechanical synopsis of the prior prose (Arm C) — one extraction call.
async function deriveSynopsis(prose) {
  const sys = 'Extract a TERSE structured synopsis of this scene for continuity. STRICT JSON only. '
    + 'JSON: {"setting":"","characters_present":[],"protagonist_status":"","last_spoken_line":"","unresolved_dialogue":"","emotional_tone":"","open_physical_actions":""}';
  const raw = await callProxy('/api/chatgpt-proxy', { messages: [{ role: 'system', content: sys }, { role: 'user', content: prose.slice(0, 6000) }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 260, jsonMode: true });
  let o; try { o = JSON.parse(raw); } catch (_) { const m = String(raw).match(/\{[\s\S]*\}/); if (m) { try { o = JSON.parse(m[0]); } catch (_) {} } }
  if (!o) return 'CONTINUITY (structured): (unavailable)';
  return 'CONTINUITY — where things stand (structured, NOT prose):\n'
    + '- setting: ' + (o.setting || '') + '\n- present: ' + (Array.isArray(o.characters_present) ? o.characters_present.join(', ') : '')
    + '\n- protagonist: ' + (o.protagonist_status || '') + '\n- last spoken line: ' + (o.last_spoken_line || '')
    + '\n- unresolved: ' + (o.unresolved_dialogue || '') + '\n- tone: ' + (o.emotional_tone || '') + '\n- open actions: ' + (o.open_physical_actions || '');
}

process.stderr.write('deriving structured synopsis for Arm C …\n');
const SYNOPSIS = await deriveSynopsis(PRIOR_PROSE);
const RAW = 'CONTINUITY — the scene that just happened (verbatim):\n"' + PRIOR_PROSE + '"';

const ARMS = [
  { label: 'A facts_only', context: '' },
  { label: 'B +raw_prose', context: RAW },
  { label: 'C +structured_synopsis', context: SYNOPSIS },
  { label: 'D +raw_prose+dynamic', context: RAW + '\n\n' + DYNAMIC }
];

console.log('ADD-BACK PROBE — transition="' + TRANSITION.slice(0, 60) + '…"  N=' + N + ' per arm\n');
const rows = [];
for (const arm of ARMS) {
  process.stderr.write('arm ' + arm.label + ' …\n');
  const v = [];
  for (let i = 1; i <= N; i++) {
    try { const p = await realize(arm.context, i); const r = await verify(p); v.push(r); process.stderr.write('  #' + i + ' ' + r.delivery + (r.delivery !== 'DELIVERED' ? (' (' + r.dominant_replacement + ')') : '') + '\n'); }
    catch (e) { v.push({ delivery: 'ERROR' }); process.stderr.write('  #' + i + ' ERROR ' + e.message + '\n'); }
  }
  const del = v.filter(x => x.delivery === 'DELIVERED').length;
  const repl = {}; v.filter(x => x.delivery !== 'DELIVERED').forEach(x => { repl[x.dominant_replacement] = (repl[x.dominant_replacement] || 0) + 1; });
  rows.push({ label: arm.label, del, total: N, repl });
}

console.log('\n════════ ADD-BACK: which context element collapses delivery? ════════');
for (const r of rows) console.log('  ' + r.label.padEnd(24) + ' DELIVERED ' + r.del + '/' + r.total + ' (' + Math.round(100 * r.del / r.total) + '%)'
  + (Object.keys(r.repl).length ? '   misses→ ' + Object.entries(r.repl).map(([k, v]) => k + ':' + v).join(', ') : ''));
console.log('\nread: the first arm where delivery COLLAPSES vs A = the dominant attractor.');
console.log('      B collapses + C holds → RAW PROSE is toxic (structured continuity fine). B & C both collapse → needs prose-richness.');
