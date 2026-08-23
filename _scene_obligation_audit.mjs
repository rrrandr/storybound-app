// SCENE OBLIGATION AUDIT — does the Author know WHERE IN THE CAUSAL TIMELINE it is?
//
// Delivery is solved: the wish physics reaches the Author when the spine says it should
// (see _verify_twist_layer.mjs Part 2). This audits the next layer, which is a different
// question from "does the Author know what happened before?" — it does, verbatim.
//
// The three dimensions must be DISTINCT in the payload:
//   WORLD RULE   — what is always true            ("a wish twists literally")
//   STORY STATE  — what has already happened      ("the wish was already spoken")
//   SCENE TASK   — what happens now               ("manifest the twist")
//   CONSUMED     — what must NOT be replayed      ("do not re-stage the invocation")
//
// A model shown "here is what happened before" treats it as inspiration. A model shown
// "these states are already true" treats it as a constraint. Recap prose is the former.
//
// usage: node _scene_obligation_audit.mjs <payload.txt>
import fs from 'fs';

const file = process.argv[2] || '_validate_out/branch_causality/branch_A_payload.txt';
const t = fs.readFileSync(file, 'utf8');
const has = (...ps) => ps.filter(p => new RegExp(p, 'i').test(t));

const DIMENSIONS = [
  { name: 'WORLD RULE (always true)', kind: 'structured',
    probes: ['THE WISH-TWIST SEQUENCE', 'EXACTING, NOT MALICIOUS', 'THREE CHANNELS, NEVER MIXED'] },
  { name: 'STORY STATE — recap prose', kind: 'prose',
    probes: ['Story So Far'] },
  { name: 'STORY STATE — structured facts', kind: 'structured',
    probes: ['ESTABLISHED FACTS:', 'FACTS ALREADY TRUE', 'COMMITTED FACTS', 'STATE LEDGER'] },
  { name: 'SCENE TASK (what happens now)', kind: 'structured',
    probes: ['SCENE SPINE . THE EVENT', 'THE EVENT — stage THIS EXACT event'] },
  { name: 'SCENE PRECONDITION (still false)', kind: 'structured',
    probes: ['BEFORE \\(still FALSE'] },
  { name: 'CONSUMED BEATS (already spent)', kind: 'structured',
    probes: ['ALREADY (?:OCCURRED|SPENT|DELIVERED|STAGED)', 'BEATS COMPLETED', 'STEPS ALREADY', 'CONSUMED BEATS'] },
  { name: 'FORBIDDEN REPLAY (do not re-stage)', kind: 'structured',
    probes: ['do NOT re-?stage', 'do NOT replay', 'never re-?stage', 'DO NOT REPEAT THE'] },
  { name: 'OPENING STATE (emotional/relational carry)', kind: 'structured',
    probes: ['emotional state and all established facts carry over', 'SCENE START STATE'] },
];

console.log(`\n${'═'.repeat(78)}`);
console.log(`SCENE OBLIGATION AUDIT   ${file} (${t.length} chars)`);
console.log('═'.repeat(78));
let missing = 0;
for (const d of DIMENSIONS) {
  const hits = has(...d.probes);
  const ok = hits.length > 0;
  if (!ok) missing++;
  console.log(`  ${ok ? 'present' : 'ABSENT '}  ${d.name.padEnd(44)} ${ok ? `(${hits.length}/${d.probes.length} probes)` : ''}`);
}
console.log('─'.repeat(78));
console.log(`${missing} dimension(s) absent.`);
console.log('\nThe distinction that matters: recap PROSE tells the Author what happened and');
console.log('lets it infer; a structured ledger tells it what is already true and constrains.');
console.log('A sequence rule that spans scenes ("openings carry steps 1-4") is a WORLD RULE.');
console.log('Nothing states which steps THIS story has already spent — so the Author can');
console.log('satisfy the rule by staging all of them again.\n');
process.exit(missing ? 1 : 0);
