// _worldsim_misses_analysis.mjs — Roman 2026-08-10. DIAGNOSE the 20-graph misses BEFORE any fix.
// Q1 (physics): are the missing pressures RANDOM omissions, or CLUSTERED in whole world-systems the simulator never
// enumerated (regulator, market, press, …)? Clustered → fix = teach it to enumerate systems, NOT a critic pass.
// Q2 (noise): what fraction of critic "missing" is actually INTERPRETATION the simulator correctly excluded?
// No new simulation. Tags the already-collected misses. (Story-sufficiency = separate + Roman's judgment; not scored here.)
import fs from 'fs';
const PROXY = 'http://localhost:3000/api/chatgpt-proxy', MODEL = 'gpt-4o';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const report = JSON.parse(fs.readFileSync(DIR + '/pergraph_report.json', 'utf8'));

const SYSTEMS = ['government_regulator', 'market_finance', 'media_press', 'legal_courts', 'emergency_services', 'healthcare', 'competitors_rivals', 'community_public', 'family_personal', 'infrastructure_utilities', 'environment_geography', 'resources_supply', 'third_party_individual', 'other'];
const TAG_SYS = 'You classify world-simulation "missing consequence" items. For EACH item return: (a) "system" = the WORLD SYSTEM it belongs to, one of [' + SYSTEMS.join(', ') + ']; (b) "kind" = "physics" (an objective state/affordance/what-is-now-possible change) OR "interpretation" (psychology, emotion, morale, meaning, dramatic value — things a physics-only world model should NOT emit). Return STRICT JSON {"tags":[{"item":"...","system":"...","kind":"physics|interpretation"}]}.';

async function tag(items) {
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: TAG_SYS }, { role: 'user', content: 'ITEMS:\n' + items.map((x, i) => (i + 1) + '. ' + x).join('\n') + '\n\nReturn the JSON now.' }], role: 'PRIMARY_AUTHOR', model: MODEL, temperature: 0, max_tokens: 700, jsonMode: true }) });
    const d = await r.json(); const c = (d && d.content) || (d.choices && d.choices[0].message.content); return JSON.parse(c.match(/\{[\s\S]*\}/)[0]).tags || [];
  } catch (e) { return []; }
}

// also record which systems the simulator ALREADY covered (from its own pressures), to contrast covered vs missed
const sysMissEvents = {}; // system -> Set of event tags where it appears in MISSING (physics only)
const sysCovEvents = {};  // system -> Set of event tags where it appears in the simulator's OWN pressures
let totalMiss = 0, physMiss = 0, interpMiss = 0;

const rows = Object.entries(report).filter(([, v]) => v && !v.error);
for (const [etag, g] of rows) {
  const miss = (g.critic && g.critic.missing) || [];
  if (miss.length) {
    const tags = await tag(miss);
    for (const t of tags) {
      totalMiss++;
      if (t.kind === 'interpretation') { interpMiss++; continue; }
      physMiss++;
      const s = SYSTEMS.includes(t.system) ? t.system : 'other';
      (sysMissEvents[s] = sysMissEvents[s] || new Set()).add(etag);
    }
  }
  // tag the simulator's OWN pressures for coverage contrast
  const own = (g.pressures || []);
  if (own.length) {
    const otags = await tag(own);
    for (const t of otags) { if (t.kind === 'interpretation') continue; const s = SYSTEMS.includes(t.system) ? t.system : 'other'; (sysCovEvents[s] = sysCovEvents[s] || new Set()).add(etag); }
  }
}

const N = rows.length;
console.log('=== MISS DIAGNOSIS across ' + N + ' events ===\n');
console.log('CRITIC NOISE: ' + interpMiss + '/' + totalMiss + ' (' + Math.round(100 * interpMiss / totalMiss) + '%) of "missing" flags were INTERPRETATION the simulator correctly excluded.\n');
console.log('CLUSTERING — how many of the ' + N + ' events had a PHYSICS pressure MISSING from each system,');
console.log('vs how many the simulator already COVERED that system (higher miss-share across many events = a systemic blind spot):\n');
const all = [...new Set([...Object.keys(sysMissEvents), ...Object.keys(sysCovEvents)])];
const tbl = all.map(s => ({ system: s, missed: (sysMissEvents[s] || new Set()).size, covered: (sysCovEvents[s] || new Set()).size })).sort((a, b) => b.missed - a.missed);
console.log('  SYSTEM'.padEnd(28) + 'MISSED-in'.padEnd(12) + 'COVERED-in');
tbl.forEach(r => console.log('  ' + r.system.padEnd(26) + (r.missed + '/' + N).padEnd(12) + (r.covered + '/' + N)));
const bigBlind = tbl.filter(r => r.missed >= N * 0.4);
console.log('\nSYSTEMIC BLIND SPOTS (missing in ≥40% of events): ' + (bigBlind.length ? bigBlind.map(r => r.system + ' (' + r.missed + '/' + N + ')').join(', ') : 'none — misses look RANDOM, not clustered'));
console.log('\nREAD: if a few systems are missing across MOST events → the simulator never ENUMERATES those systems →');
console.log('fix = enumerate relevant world-systems before propagating (Roman), NOT a Missing/Invalid critic pass.');
fs.writeFileSync(DIR + '/miss_diagnosis.json', JSON.stringify({ noise: { interpMiss, totalMiss }, table: tbl, bigBlind }, null, 1));
process.exit(0);
