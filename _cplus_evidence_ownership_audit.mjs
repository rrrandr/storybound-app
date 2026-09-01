// ══════════════════════════════════════════════════════════════════════════════════════════
//  EVIDENCE OWNERSHIP AUDIT — what a fact can and cannot establish
//
//  A fact that lets an ACT belong in a room is not automatically evidence that a PSYCHOLOGICAL
//  condition is active. The grounding gate currently makes no such distinction: it asks only
//  whether a pressure's words appear in some fact's text. This audits what that actually permits.
//
//  Audit only. No production change, no dispatch.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
let R = null;
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await installSession(page);
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/config\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
    if (isAuthOrigin(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._cpBuildGroundedOptions && window._cpEvidenceEstablishes, { timeout:120000 });

  R = await page.evaluate(() => {
    // The exact manifest shape the customs-house scene produces, reproduced from production's own
    // corpus builder fields: setting · present · about-to-happen · narrator.
    const FACTS = [
      { evidence_id: 'E1', field: 'setting',         text: 'the customs house' },
      { evidence_id: 'E2', field: 'present',         text: 'Lirael, Seren' },
      { evidence_id: 'E3', field: 'about-to-happen', text: 'She counts what she has already signed for' },
    ];
    const opts = (facets, facts, label) => window._cpBuildGroundedOptions(
      [{ label: label || 'Seren', id: 'named:x', facets }], facts || FACTS);

    // A pressure that is genuinely about the SUBJECT's psychology, worded against E3's vocabulary.
    const F = (pid, text, requires) => ({ facet_id: 'F1', category: 'habit',
      canonical_truth: 'She withholds her help until someone states plainly what they want.',
      possible_pressures: [{ pressure_id: pid, text, evidence_requires: requires }] });

    return {
      FACTS,
      // 1 · what grounds against a fact that is ABOUT ANOTHER CHARACTER (the PC)
      crossCharacter: opts([F('p_counts', 'when a count is already signed for', 'signed|counts')], FACTS, 'Seren'),
      // 2 · what grounds against the CAST LIST alone
      castListOnly: opts([F('p_seren', 'when Seren is present', 'seren')], FACTS, 'Seren'),
      // 3 · what grounds against the SETTING alone
      settingOnly: opts([F('p_house', 'when she is in the customs house', 'customs|house')], FACTS, 'Seren'),
      // 4 · NAME-SUBSTITUTION CONTROL: the same pressure keyed on the candidate's own name
      nameOnly: opts([F('p_name', 'when she is named', 'seren')], FACTS, 'Seren'),
      // 5 · a scene that carries a genuinely subject-specific behavioural fact
      withBehavioural: (() => {
        const rich = FACTS.concat([
          { evidence_id: 'E4', field: 'about-to-happen',
            text: 'Seren asks twice for a receipt she has already been given' }]);
        return { facts: rich,
          opts: opts([F('p_asks', 'when she has to ask twice for what she is owed', 'receipt|asks')], rich, 'Seren') };
      })(),
      // 6 · does production record WHO a fact is about?
      factKeys: Object.keys(FACTS[0]),
      corpusFields: [...new Set(FACTS.map(f => f.field))],
    };
  });
} finally { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); }

const show = (o) => o.map(x => `${x.pressure_id}←${x.evidence_ids.join(',')}`).join('  ') || '(none)';

console.log(`\n${'═'.repeat(88)}\nC+ EVIDENCE OWNERSHIP AUDIT — audit only, nothing dispatched\n${'═'.repeat(88)}\n`);

console.log(' A · THE MANIFEST, FACT BY FACT');
console.log('   id  field             ownership recorded   text');
for (const f of R.FACTS) {
  const owner = /^[A-Z][a-z]+(, [A-Z][a-z]+)*$/.test(f.text) ? 'cast list (names only)'
              : f.field === 'setting' ? 'none — a place'
              : 'NONE RECORDED';
  console.log(`   ${f.evidence_id}  ${f.field.padEnd(16)}  ${owner.padEnd(20)} ${f.text}`);
}
console.log(`\n   fields production stamps : ${R.corpusFields.join(' · ')}`);
console.log(`   per-fact keys            : ${R.factKeys.join(', ')}`);

console.log('\n B · WHAT THE CURRENT GATE PERMITS');
console.log('   cross-character (E3 is about the PC) : ' + show(R.crossCharacter));
console.log('   cast-list alone                      : ' + show(R.castListOnly));
console.log('   setting alone                        : ' + show(R.settingOnly));
console.log('   name-substitution control            : ' + show(R.nameOnly));
console.log('   with a subject-specific behavioural fact (E4): ' + show(R.withBehavioural.opts));

console.log('\n C · FINDINGS');
t('C1: a fact carries NO subject ownership — production stamps only an id, a field and text, so ' +
  'nothing in the model can say who a fact is about',
  R.factKeys.indexOf('subject') === -1 && R.factKeys.indexOf('owner') === -1,
  JSON.stringify(R.factKeys));
t('C2: DEFECT — a fact about the PROTAGONIST grounds another character\'s pressure by lexical ' +
  'overlap alone. "She counts what she has already signed for" is Lirael\'s, and it establishes ' +
  'a condition for Seren',
  R.crossCharacter.length > 0,
  'cross-character grounding: ' + show(R.crossCharacter));
t('C3: DEFECT — the CAST LIST alone establishes a psychological pressure. Being named in the ' +
  'room is presence, not evidence that any condition is active',
  R.castListOnly.length > 0, show(R.castListOnly));
t('C4: DEFECT — the SETTING alone establishes a pressure. A place can host an act; it cannot ' +
  'make a psychological condition true of a person',
  R.settingOnly.length > 0, show(R.settingOnly));
t('C5: NAME-SUBSTITUTION CONTROL FAILS — a pressure keyed on nothing but the candidate\'s own ' +
  'name grounds, so a portfolio can manufacture its own evidence by naming the subject',
  R.nameOnly.length > 0, show(R.nameOnly));
t('C6: a genuinely subject-specific behavioural fact DOES ground — the evidence model is not ' +
  'wrong about what should pass, only about what it lets through',
  R.withBehavioural.opts.length > 0, show(R.withBehavioural.opts));

console.log('\n D · THE TWO QUESTIONS, SEPARATED');
console.log('   1 · PRESSURE GROUNDING — why this condition is ACTIVE for THIS person.');
console.log('       Currently answered by: does any fact contain the pressure\'s words.');
console.log('       Not asked: is that fact about this person, and is it behavioural at all.');
console.log('   2 · ACTION ENGAGEMENT — why the act belongs in this room.');
console.log('       Currently answered by: object/person ids, or shared words with the ground text.');
console.log('       This one is correct: a setting fact SHOULD let an act engage the scene.');
console.log('\n   The gate uses ONE test for both. Every defect above is that conflation.');

fs.writeFileSync('_cplus_evidence_ownership_audit.json', JSON.stringify(R, null, 2));
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed  (audit — $0.00, nothing dispatched)\n`);
process.exit(fail ? 1 : 0);
