import fs from 'fs';
const F = '_fs_coverage_check.mjs';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

sub("  { id: 'unm.the_claim_unmade',         ask: 'escape',    requires: ['auth.dohkar_claims_rite_and_ruling'] },",
    "  { id: 'unm.the_claim_unmade',         ask: 'escape',    requires: ['auth.dohkar_claims_rite_and_ruling'], requiresInactive: ['accusation.family_accused'] },");

sub("const eligible = (o, c) => o.requires.every(a => isActive(a, c));",
`const eligible = (o, c) => o.requires.every(a => isActive(a, c)) &&
  (o.requiresInactive || []).every(a => !isActive(a, c));`);

sub(`function resolve(cell, ask, hops = 0) {
  const direct = OUTCOMES.filter(o => o.ask === ask && eligible(o, cell));
  if (direct.length) return { outcome: direct[0], viaFallback: hops > 0, alternatives: direct.length };`,
`// AMBIGUITY IS A FAILURE, NOT A TIE-BREAK. If more than one outcome in an ask-class is
// eligible in a state, selection would fall to array order — an invalid selection rule.
const AMBIGUOUS = [];
function resolve(cell, ask, hops = 0) {
  const direct = OUTCOMES.filter(o => o.ask === ask && eligible(o, cell));
  if (direct.length > 1) AMBIGUOUS.push(fmt(cell) + '  ask=' + ask + '  → ' + direct.map(o => o.id).join(' | '));
  if (direct.length) return { outcome: direct[0], viaFallback: hops > 0, alternatives: direct.length };`);

sub(`console.log('\\nCOVERAGE IS NOT APPROVAL.');
process.exit(gaps.length ? 1 : 0);`,
`console.log('\\n--- SELECTION DETERMINACY ---');
console.log('  (state, ask) pairs with more than one eligible outcome: ' + AMBIGUOUS.length);
AMBIGUOUS.slice(0, 12).forEach(a => console.log('    ' + a));
if (AMBIGUOUS.length === 0) {
  console.log('  Every covered pair resolves to EXACTLY ONE outcome under declared eligibility.');
  console.log('  No array-order winner. The coverage figure is FINAL, not provisional.');
} else {
  console.log('  ⚠ COVERAGE IS PROVISIONAL — selection would fall to array order in the pairs above.');
}

console.log('\\nCOVERAGE IS NOT APPROVAL.');
process.exit(gaps.length || AMBIGUOUS.length ? 1 : 0);`);
fs.writeFileSync(F, s);
console.log('gate + ambiguity check applied');
