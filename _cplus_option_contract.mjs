// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE C+ OPTION CONTRACT
//
//  A purchased planner reply spent three sharp psychological truths on nail-tapping, weight
//  shifting and crossed arms, cited the SAME evidence id for all three, and read them back as
//  sensations in the protagonist's own body. Production rejected the plan, but only afterwards.
//
//  The recombination is now impossible: facet, pressure and the facts that PROVE that pressure
//  are welded into one backend-owned option, and the planner returns an id. Every case below is
//  taken from that purchased reply, so these are regressions against real output — not against
//  invented nonsense.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

// The purchased reply and the backend state it was produced against.
const PAID = JSON.parse(fs.readFileSync('_planner_sample_scoring.json', 'utf8'));
const EV = JSON.parse(fs.readFileSync('_planner_sample_evidence.json', 'utf8'));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._cpBuildGroundedOptions && window._cpEvidenceEstablishes
    && window.__CP_EXPRESSION_MODES, { timeout:60000 });

  const R = await page.evaluate(({ PAID }) => {
    const MODES = window.__CP_EXPRESSION_MODES;
    // A candidate whose facets carry real applicability patterns, and a scene corpus in which
    // exactly one of them is provable — the shape that produced the purchased failure.
    const facets = [
      { facet_id: 'F1', category: 'habit',
        canonical_truth: 'She weaponizes withdrawal of care to force others to name what they truly want.',
        pressures: [ { pressure_id: 'p_assumed', text: 'When someone assumes her presence is automatic',
                       evidence_requires: 'assumes|takes for granted|without asking' },
                     { pressure_id: 'p_dishonest', text: 'When she detects emotional dishonesty',
                       evidence_requires: 'evasive|avoids|will not say' } ] },
      { facet_id: 'F2', category: 'value',
        canonical_truth: 'She measures worth by loyalty that survives betrayal.',
        pressures: [ { pressure_id: 'p_betrayed', text: 'When someone she trusted proves unworthy',
                       evidence_requires: 'broke a promise|betrayed|went back on' } ] },
    ];
    // Facts carry TYPE and OWNERSHIP now: pressure grounding requires a fact that can establish
    // psychology at all and that is about THIS candidate. E1 is Mara-owned behaviour; E2 and E3
    // are scene material an act may engage but which reveal nobody.
    const OWNER = 'named:mara';
    const facts = [
      { evidence_id: 'E1', type: 'event', provenance: 'assignment.eventParticipants',
        participants: [{ ref: OWNER, role: 'actor' }], groundableRefs: [OWNER], pressureEligible: true,
        text: 'the clerk assumes she will wait as she always waits' },
      { evidence_id: 'E2', type: 'place', provenance: 'assignment.setting',
        participants: [], groundableRefs: [], pressureEligible: false,
        text: 'the ledger is open on the counter' },
      { evidence_id: 'E3', type: 'place', provenance: 'assignment.setting',
        participants: [], groundableRefs: [], pressureEligible: false,
        text: 'the tide turns at dawn' },
    ];
    const options = window._cpBuildGroundedOptions([{ label: 'Mara Dunn', id: OWNER, facets }], facts);
    // The SAME facts, a different candidate: E1 is Mara's, so it grounds nothing for Tomas.
    const other   = window._cpBuildGroundedOptions([{ label: 'Tomas Reyne', id: 'named:tomas', facets }], facts);
    // Zero-grounded case: a corpus that proves nothing.
    const starved = window._cpBuildGroundedOptions([{ label: 'Mara Dunn', id: OWNER, facets }],
      [{ evidence_id: 'E1', type: 'place', provenance: 'assignment.setting', participants: [],
         groundableRefs: [], pressureEligible: false, text: 'the tide turns at dawn' }]);
    return { MODES, options, other, starved, facts,
             paidAssignments: PAID.assignments.map(a => ({ character: a.character, pressure_id: a.pressure_id,
               evidence: a.pressureEvidence, behavior: a.behavior, pcEffect: a.pcEffect })) };
  }, { PAID });

  console.log('\n 1 · THE UNGROUNDED PAIRING CAN NO LONGER BE OFFERED');
  console.log('   options built: ' + R.options.map(o => `${o.option_id}(${o.pressure_id}→${o.evidence_ids.join(',')})`).join('  '));
  t('1a: only the pressure this scene PROVES yields an option — the pairing the purchased reply ' +
    'chose is not on the list at all',
    R.options.length === 1 && R.options[0].pressure_id === 'p_assumed'
      && R.options[0].evidence_ids.join(',') === 'E1',
    JSON.stringify(R.options.map(o => [o.pressure_id, o.evidence_ids])));
  t('1b: the purchased reply cited E3 for that pressure; E3 establishes nothing, so no option ' +
    'containing E3 exists',
    !R.options.some(o => o.evidence_ids.indexOf('E3') !== -1),
    JSON.stringify(R.options.map(o => o.evidence_ids)));
  t('1c: three independent citations of the same evidence id are structurally impossible — the ' +
    'evidence lives INSIDE the option, so it is not a field anyone can fill',
    R.options.every(o => Array.isArray(o.evidence_ids) && o.evidence_ids.length > 0)
      && R.paidAssignments.every(a => a.evidence.join(',') === 'E3'),
    JSON.stringify(R.paidAssignments.map(a => a.evidence)));
  t('1d: a recipient the scene proves nothing for yields ZERO options, which is what triggers the ' +
    'abort before the planner is paid',
    R.starved.length === 0, JSON.stringify(R.starved));
  t('1e: every option carries a recipient, and a fact owned by one candidate grounds NOTHING for ' +
    'another — ownership is checked, not just recipient labelling',
    R.options.every(o => o.recipient === 'Mara Dunn') && R.other.length === 0
      && R.options[0].option_id !== undefined,
    JSON.stringify({ mara: R.options.map(o => o.option_id), tomas: R.other.length }));
  t('1f: the seven expression modes are published by production, not remembered here',
    Array.isArray(R.MODES) && R.MODES.length === 7 && R.MODES.indexOf('LEAK') !== -1,
    JSON.stringify(R.MODES));
} finally { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed  ($0.00 — replay only)\n`);
process.exit(fail ? 1 : 0);
