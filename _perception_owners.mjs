// PERCEPTION OWNERSHIP MAP — who is allowed to tell the Author what to notice?
//
// A single payload carries 381 distinct ALL-CAPS directive headers, 51 of them touching
// prose or perception. Four systems were independently instructing the Author to "notice
// meaningful details", so the model heard four requests for four details and the conductor
// correctly answered "plainness". Adding a fifth voice was the mistake this map exists to
// prevent repeating.
//
// Reports each perception directive found in a real payload, its assigned owner, and
// flags DUPLICATES — two systems making the same claim — versus LAYERS, which are fine.
//
// usage: node _perception_owners.mjs [payload.txt]
import fs from 'fs';

const file = process.argv[2] || '_validate_out/payload_free/payload_1.txt';
const t = fs.readFileSync(file, 'utf8');

// tier 0 = conductor (governs everything below). tier 1 = allocator. tier 2 = instrument.
const MAP = [
  { tier: 0, owner: 'PROSE DENSITY (conductor)', probe: 'PROSE DENSITY — THE CONDUCTOR',
    claim: 'perception systems are INSTRUMENTS, not obligations; suppress interpreting, not seeing' },
  { tier: 0, owner: 'PROSE DENSITY (conductor)', probe: 'PLAINNESS IS NEGATIVE SPACE',
    claim: 'reserves beats where the prose stops interpreting' },
  { tier: 1, owner: 'SOFT DENSITY GOVERNOR', probe: 'SOFT DENSITY GOVERNOR',
    claim: 'how much interpretation, and who earns it' },
  { tier: 1, owner: 'SOFT DENSITY GOVERNOR', probe: 'COUNT PRESSURE, NOT PEOPLE',
    claim: 'allocation by dramatic pressure rather than headcount' },
  { tier: 1, owner: 'SOFT DENSITY GOVERNOR', probe: 'AGENCY, NOT LEAKAGE',
    claim: 'a stroke lands on a CHOSEN act, never an involuntary tell' },
  { tier: 1, owner: 'SOFT DENSITY GOVERNOR', probe: 'the SAME character reads DIFFERENTLY',
    claim: 'POV-relative interpretation (the lens)' },
  { tier: 2, owner: 'PSYCHOLOGICALLY DIAGNOSTIC', probe: 'PSYCHOLOGICALLY DIAGNOSTIC',
    claim: 'detail must predict behaviour under pressure' },
  { tier: 2, owner: 'CHARACTER PRESSURE REQUIREMENT', probe: 'CHARACTER PRESSURE REQUIREMENT',
    claim: 'someone must apply pressure to the protagonist' },
  { tier: 2, owner: 'CHARACTER VISIBILITY floor', probe: 'CHARACTER VISIBILITY',
    claim: 'every named character owns a physical description' },
  { tier: 2, owner: 'BEHAVIORAL DEMONSTRATION', probe: 'BEHAVIORAL DEMONSTRATION',
    claim: 'archetype is a verb — it must ACT on-page' },
  { tier: 2, owner: 'Storybound+ (Character+)', probe: 'CHARACTER+ REQUIRES AGENCY',
    claim: 'wound → performance → cost → the reading' },
  { tier: 2, owner: 'Storybound+ (Description+)', probe: 'DESCRIPTION+ CHAIN',
    claim: 'anchor → perception → archetype meaning' },
  { tier: 2, owner: 'Storybound+ (sensory)', probe: 'WORLD SENSORY CANON',
    claim: 'fixed sensory fingerprints for recurring places' },
];

// Claims that more than one system makes. Two owners for one job is the defect.
const OVERLAP = [
  { claim: 'the POV lens (same subject reads differently by observer)',
    owners: ['SOFT DENSITY GOVERNOR', 'Storybound+ (Character+)'] },
  { claim: 'behaviour reveals the person',
    owners: ['PSYCHOLOGICALLY DIAGNOSTIC', 'BEHAVIORAL DEMONSTRATION', 'Storybound+ (Character+)'] },
  { claim: 'scarcity / do not over-interpret',
    owners: ['PROSE DENSITY (conductor)', 'SOFT DENSITY GOVERNOR', 'Storybound+ (Character+)'] },
];

console.log(`\n${'═'.repeat(84)}`);
console.log(`PERCEPTION OWNERSHIP   ${file}`);
console.log('═'.repeat(84));
let present = 0;
for (const tier of [0, 1, 2]) {
  console.log(`\n  ── tier ${tier} ${tier === 0 ? '(conductor — governs all below)' : tier === 1 ? '(allocator)' : '(instrument)'}`);
  for (const d of MAP.filter(m => m.tier === tier)) {
    const here = t.includes(d.probe);
    if (here) present++;
    console.log(`     ${here ? 'present' : 'ABSENT '}  ${d.owner.padEnd(30)} ${d.claim}`);
  }
}
console.log(`\n  ${present}/${MAP.length} directives present in this payload.`);

console.log(`\n${'─'.repeat(84)}\nDUPLICATED CLAIMS — one job, several owners:`);
for (const o of OVERLAP) {
  const live = o.owners.filter(n => MAP.some(m => m.owner === n && t.includes(m.probe)));
  console.log(`\n  "${o.claim}"`);
  console.log(`     claimed by ${live.length}: ${live.join(' · ')}`);
  if (live.length > 1) console.log('     -> collapse to ONE owner; the others may reference it, never restate it.');
}
console.log('\n  RULE: a new perception idea is registered as an INSTRUMENT under the conductor,');
console.log('  or folded into an existing owner. It never becomes a parallel authority.\n');
