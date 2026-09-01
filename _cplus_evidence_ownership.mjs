// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE EVIDENCE OWNERSHIP CONTRACT
//
//  Pressure grounding used to be lexical matching over an ownerless corpus, and the audit showed
//  what that permitted: the protagonist's goal grounding an NPC, the cast list grounding a
//  pressure, the setting grounding a pressure, and a portfolio manufacturing evidence by naming
//  its own subject. Every control below is one of those, plus the controls that prove the gate
//  did not simply become "reject everything".
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
let R = null;
try {
  const page = await ctx.newPage();
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._cpFactManifest && window._cpBuildGroundedOptions, { timeout:60000 });

  R = await page.evaluate(() => {
    // The real customs-house stage, in the shape production's own builder consumes.
    const STAGE = {
      setting: 'the customs house',
      presentText: 'Lirael, Seren',
      aboutToHappen: 'She counts what she has already signed for',
      narratorLens: 'she says the true thing before she has decided to',
      mentionedOnly: ['Tomas Reyne'],
      onStage: [ { id: 'pc:lirael', label: 'Lirael', kind: 'pc' },
                 { id: 'named:seren', label: 'Seren', kind: 'named' } ],
    };
    const corpus = window._cpFactManifest(STAGE, { storyId: 'own-audit' });

    // One pressure, worded so it matches the event sentence — the exact case that used to ground.
    const facet = (requires, truth) => ([{ facet_id: 'F1', category: 'habit',
      canonical_truth: truth || 'She withholds her help until someone states plainly what they want.',
      possible_pressures: [{ pressure_id: 'p', text: 'the condition', evidence_requires: requires }] }]);
    const opts = (requires, ref, label, facts) => window._cpBuildGroundedOptions(
      [{ label: label || 'Seren', id: ref || 'named:seren', facets: facet(requires) }],
      facts || corpus.facts);

    // A scene that DOES carry Seren-owned behaviour, through the structured attribution the
    // corpus reads when a source supplies it.
    const OWNED_STAGE = Object.assign({}, STAGE, {
      aboutToHappen: 'Seren asks twice for a receipt she has already been given',
      eventParticipants: [{ ref: 'named:seren', role: 'actor', label: 'Seren' }],
    });
    const ownedCorpus = window._cpFactManifest(OWNED_STAGE, { storyId: 'own-audit-2' });

    return {
      corpus,
      facts: corpus.facts.map(f => ({ id: f.evidence_id, type: f.type, provenance: f.provenance,
        owners: (f.participants || []).map(p => p.role + ':' + p.ref),
        groundable: f.groundableRefs, pressureEligible: f.pressureEligible, text: f.text })),
      pcFactVsSeren:  opts('signed|counts', 'named:seren', 'Seren'),
      pcFactVsPc:     opts('signed|counts', 'pc:lirael', 'Lirael'),
      settingOnly:    opts('customs|house', 'named:seren', 'Seren'),
      castOnly:       opts('seren', 'named:seren', 'Seren'),
      nameOnly:       opts('seren|lirael', 'named:seren', 'Seren'),
      mentionOnly:    opts('tomas|referred', 'named:tomas_reyne', 'Tomas Reyne'),
      narratorVsPc:   opts('decided|before', 'pc:lirael', 'Lirael'),
      narratorVsSeren:opts('decided|before', 'named:seren', 'Seren'),
      ownedFacts:     ownedCorpus.facts.map(f => ({ id: f.evidence_id, type: f.type,
                        groundable: f.groundableRefs, pressureEligible: f.pressureEligible })),
      ownedVsSeren:   opts('receipt|asks', 'named:seren', 'Seren', ownedCorpus.facts),
      ownedVsOther:   opts('receipt|asks', 'named:other', 'Someone Else', ownedCorpus.facts),
      // swapping which candidate asks, with the same corpus, must change nothing about who grounds
      swapped:        opts('receipt|asks', 'named:seren', 'Tomas Reyne', ownedCorpus.facts),
      fingerprints:   { v1Style: window._cpFactFingerprint([{ evidence_id:'E1', text:'the customs house' }]),
                        v2: corpus.fingerprint, version: corpus.corpusVersion },
      engagementText: corpus.facts.map(f => f.text).join(' '),
    };
  });
} finally { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); }

const n = (o) => (o || []).length;
console.log(`\n${'═'.repeat(88)}\nEVIDENCE OWNERSHIP CONTRACT\n${'═'.repeat(88)}\n`);
console.log(' A · THE CUSTOMS-HOUSE CORPUS, TYPED AND OWNED');
console.log('   id  type      provenance                        pressure?  groundable        text');
for (const f of R.facts) {
  console.log(`   ${f.id}  ${String(f.type).padEnd(8)}  ${String(f.provenance).padEnd(32)}  ${(f.pressureEligible?'yes':'NO ').padEnd(9)}  ${(f.groundable.join(',')||'—').padEnd(16)}  ${f.text.slice(0,46)}`);
}

console.log('\n B · CONTROLS');
t('B1: the PC\'s own goal cannot ground SEREN — the fact that started this audit',
  n(R.pcFactVsSeren) === 0, JSON.stringify(R.pcFactVsSeren));
t('B2: …and it cannot ground the PC either, because the assignment attributes its event to ' +
  'nobody. Unowned fails closed rather than guessing the obvious subject',
  n(R.pcFactVsPc) === 0, JSON.stringify(R.pcFactVsPc));
t('B3: SETTING-ONLY produces zero options — a place can host an act, never a psychology',
  n(R.settingOnly) === 0, JSON.stringify(R.settingOnly));
t('B4: CAST-LIST-ONLY produces zero options — being in the room is presence, not evidence',
  n(R.castOnly) === 0, JSON.stringify(R.castOnly));
t('B5: NAME-ONLY produces zero options — a portfolio can no longer manufacture evidence by ' +
  'naming its own subject',
  n(R.nameOnly) === 0, JSON.stringify(R.nameOnly));
t('B6: a MENTION grounds nothing — "Tomas is referred to" establishes that he is referable, ' +
  'not anything about how he works',
  n(R.mentionOnly) === 0, JSON.stringify(R.mentionOnly));
t('B7: the narrator lens grounds the PC — it is structurally her own mask description',
  n(R.narratorVsPc) === 1, JSON.stringify(R.narratorVsPc.map(o => o.evidence_ids)));
t('B8: …and grounds NOBODY else, on the same words',
  n(R.narratorVsSeren) === 0, JSON.stringify(R.narratorVsSeren));

console.log('\n C · THE GATE DID NOT SIMPLY BECOME "REJECT EVERYTHING"');
t('C1: correctly OWNED behaviour grounds its subject',
  n(R.ownedVsSeren) === 1, JSON.stringify(R.ownedVsSeren.map(o => o.evidence_ids)));
t('C2: …and grounds only its subject — the same fact does not ground another candidate',
  n(R.ownedVsOther) === 0, JSON.stringify(R.ownedVsOther));
t('C3: SWAP CONTROL — renaming the candidate while keeping its ref changes nothing; ownership ' +
  'is the ref, never the label',
  n(R.swapped) === n(R.ownedVsSeren), JSON.stringify({ swapped: n(R.swapped), original: n(R.ownedVsSeren) }));
t('C4: the same facts still support ENGAGEMENT — the setting text is present for an act to touch ' +
  'even though it can ground no pressure',
  /customs house/.test(R.engagementText), R.engagementText.slice(0, 80));

console.log('\n D · PRESENCE MODES AND VERSIONING');
t('D1: a mentioned-only person is recorded as MENTION, distinct from the roster — ANTICIPATED / ' +
  'RECALLED / REPORTED are not collapsed into IN_PERSON',
  R.facts.some(f => f.type === 'mention') && R.facts.some(f => f.type === 'roster')
    && R.facts.find(f => f.type === 'mention').groundable.length === 0,
  JSON.stringify(R.facts.filter(f => /mention|roster/.test(f.type)).map(f => [f.type, f.groundable])));
t('D2: the corpus is VERSIONED and an ownerless fingerprint is not equal to an owned one, so a ' +
  'package persisted under the old model cannot replay as equivalent',
  R.fingerprints.version === 2 && R.fingerprints.v1Style !== R.fingerprints.v2,
  JSON.stringify(R.fingerprints));

console.log('\n E · THE BLOCKING RESULT, STATED');
t('E1: the real three-fact customs-house scene yields ZERO Seren options — so no portfolio is ' +
  'parked and no planner is bought, which is the correct outcome and not a weakened gate',
  n(R.pcFactVsSeren) === 0 && n(R.settingOnly) === 0 && n(R.castOnly) === 0,
  'a control grounded where it should not');
t('E2: a fixture carrying genuine Seren-owned evidence restores the C+ path',
  n(R.ownedVsSeren) === 1, JSON.stringify(R.ownedFacts));

fs.writeFileSync('_cplus_evidence_ownership.json', JSON.stringify(R, null, 2));
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed  ($0.00 — nothing dispatched)\n`);
process.exit(fail ? 1 : 0);
