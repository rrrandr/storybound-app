import { economics } from './_repair_planner.mjs';
const CASES=[
  // ---- real Benchmark A defects (class, confidence, severity) ----
  ['text-leak','high','high',  'A2 PHASE caption'],
  ['text-leak','high','high',  'A3 DANIEL name-leak'],
  ['text-leak','high','low',   'A3 garbled neon (DWOOOSE)'],
  ['anatomy',  'high','high',  'A4 malformed hand (focal)'],
  ['anatomy',  'high','medium','A3 hand p3 (borderline)'],
  // ---- SYNTHETIC structural (Benchmark A has none) — to exercise regen + escalation ----
  ['continuity','high','high',  'SYNTH twins — structural, HIGH sev'],
  ['continuity','high','medium','SYNTH twins — structural, MED sev'],
  ['species',   'high','high',  'SYNTH wrong-species — structural, HIGH sev'],
];
console.log('COMPONENT 3 — REPAIR ECONOMICS (pure cost-benefit; NO model call)');
console.log('gain = sev-value × conf-mult ; cost = method price × expected retries (incl. re-verify)\n');
console.log('  class        conf  sev     method  gain   cost   verdict  escalate');
for(const [cls,conf,sev,label] of CASES){
  const e=economics(cls,conf,sev);
  console.log(`  ${cls.padEnd(11)} ${conf.padEnd(4)} ${sev.padEnd(6)} ${e.method.padEnd(6)} ${String(e.gain).padStart(5)}  ${String(e.cost).padStart(5)}  ${(e.worth?'REPAIR':'skip').padEnd(7)} ${(e.escalate_to||'—').padEnd(6)}  ${label}`);
}
console.log('\nKEY RESULT — economics is a genuine THIRD axis:');
console.log('  same (conf=high, sev=medium): LOCALIZED→klein is WORTH (gain 6 ≥ cost 3.1),');
console.log('  but STRUCTURAL→regen is NOT (gain 6 < cost 11.3). Identical confidence+severity, opposite');
console.log('  decision — because the repair COST differs. Cannot be derived from Components 1+2.');
