// CHARACTER ADMISSION — characters[].name must be earned, not asserted.
//
// Admission used to be "normalized key is non-empty and not the protagonist", so any
// string the model produced became a durable identity with appearances, revealedLayers
// and relationshipToPC — and since that ledger is resolution source #2 for relationship
// endpoints, it could anchor an edge too.
//
// Capitalisation cannot gate this ("Marshal" is capitalised) and neither can a name
// dictionary (fantasy names must survive). What gates it is EVIDENCE IN THE FINALIZED
// PROSE that the string is used as a person. The lexical extractor's >=2-mention floor
// is deliberately not reused: a real new character can appear exactly once.
//
// usage: node _char_admission_regression.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  attempts.push({ paid: PAID.test(route.request().url()) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._charAdmit, { timeout: 40000 });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};
const admit = (c, prose, ledger) => page.evaluate(({ c, prose, ledger }) => {
  const s = window.state;
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  return window._charAdmit(c, prose, ledger || {});
}, { c, prose, ledger });

console.log(`\n${'═'.repeat(82)}\nCHARACTER ADMISSION\n${'═'.repeat(82)}`);

// ── 1. rejections ──
console.log('\n 1. REJECTED WITH ZERO MUTATION');
const REJECT = [
  ['location, sentence-initial only', 'Veilwood', '"Veilwood is my father," Lirael said, and the hall went quiet.'],
  ['sentence-initial word',           'Winter',   'Winter is my father. He said it and the hall listened to every word.'],
  ['bare title',                      'Marshal',  '"Marshal is my father," Lirael said, and nobody contradicted her.'],
  ['descriptor',                      'the stranger', 'The stranger is my father, and the lamp guttered between them.'],
  ['pronoun',                         'He',       'He is my father and the hall went quiet at the words he chose.'],
  ['abstract noun',                   'Sorrow',   'Sorrow is my father. That is what the old rite says about the Fold.'],
  ['place-word',                      'Tower',    'Tower stood over the square and the bells rang out across the city.'],
];
for (const [label, name, prose] of REJECT) {
  const v = await admit({ name, present: true }, prose);
  t(`${label} "${name}" refused`, v.ok === false, `reason=${v.reason}`);
}

// ── 2. legitimate names admitted ──
console.log('\n 2. ADMITTED ON PERSON EVIDENCE');
const ACCEPT = [
  ['titled name',        'Lord Maren', '"You are late," Lord Maren said, and the ash moved across the stones.'],
  ['titled, first use',  'Lord Maren', 'Lord Maren is my father, and the hall went quiet at the words.'],
  ['fantasy one-word, speech', 'Kethren', 'Kethren said nothing at all, and the lamp guttered between them.'],
  ['fantasy one-word, action', 'Yshara', 'The gate opened and Yshara stepped through it without looking back.'],
  ['inverted dialogue tag', 'Corwin', '"Then we go," said Corwin, and the guards turned toward the north gate.'],
  ['direct address',     'Anjali',   'She set the cup down. "You knew, Anjali," and the room did not answer her.'],
  ['possessive + person noun', 'Vey', 'The wall was cold and Vey\'s hand did not leave the stone at all.'],
  ['mid-sentence relationship', 'Sera', 'I told him that Sera is my sister, and he did not believe one word.'],
];
for (const [label, name, prose] of ACCEPT) {
  const v = await admit({ name, present: true }, prose);
  t(`${label} "${name}" admitted`, v.ok === true, `reason=${v.reason}`);
}

// ── 3. single capitalized mention without person context ──
console.log('\n 3. SINGLE MENTION WITHOUT CONTEXT');
const bare = await admit({ name: 'Tessaly', present: true },
  'The road ran past Tessaly and the rain kept on until the lamps were lit again.');
t('capitalised mention with no person context refused', bare.ok === false, `reason=${bare.reason}`);
const once = await admit({ name: 'Tessaly', present: true },
  '"We should go," Tessaly said, and the rain kept on until the lamps were lit.');
t('ONE mention IS enough when evidence is strong', once.ok === true, `reason=${once.reason}`);

// ── 4. existing identity updates without recreation ──
console.log('\n 4. EXISTING IDENTITY');
const existing = await admit({ name: 'Marshal', present: true },
  'Nothing in this prose mentions that name at all, not even once in passing.',
  { marshal: { name: 'Marshal', appearances: 3 } });
t('known "Marshal" identity may still update', existing.ok === true && existing.existing === true,
  `reason=${existing.reason}`);

// ── 5. present:false cannot create ──
console.log('\n 5. present:false');
const absentNew = await admit({ name: 'Corwin', present: false },
  '"Then we go," said Corwin, and the guards turned toward the north gate.');
t('present:false cannot mint a NEW identity', absentNew.ok === false, `reason=${absentNew.reason}`);
const absentKnown = await admit({ name: 'Corwin', present: false },
  'No mention of him here at all, only the rain and the shut west ledger.',
  { corwin: { name: 'Corwin', appearances: 2 } });
t('present:false may update a KNOWN identity', absentKnown.ok === true, `reason=${absentKnown.reason}`);

// ── 6/7. end-to-end: rejected char cannot anchor a relation; mixed batch ──
console.log('\n 6-7. END TO END');
const e2e = await page.evaluate(async ({ prose }) => {
  const s = window.state;
  s.storyId = 'admit_e2e'; s._characterDisclosureLedger = {}; s._relationshipLedger = null;
  s.pov = 'first_person'; s.name = 'Lirael'; s.playerName = 'Lirael';
  s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  // Mimic the extractor's post-parse path: admit, apply, then ingest relations.
  const parsed = {
    characters: [
      { name: 'Veilwood', present: true, newLayer: 'a place pretending to be a person' },
      { name: 'Corwin', present: true, newLayer: 'keeps the west ledger' }
    ],
    relations: [
      { quote: 'Veilwood is my father', from: 'Veilwood', to: 'my father', type: 'parent_of',
        basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null },
      { quote: 'Corwin is my brother', from: 'Corwin', to: 'my brother', type: 'sibling_of',
        basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null }
    ]
  };
  const ledger = s._characterDisclosureLedger;
  // Drives the REAL admission step (2026-08-28). This used to hand-write a v1 ledger row, which
  // skipped identity attachment entirely — so the fixture could pass while production behaved
  // differently. _charLedgerApplyVerified is what the extractor itself calls.
  parsed.characters.forEach(c => {
    if (window._charAdmit(c, prose, ledger).ok) window._charLedgerApplyVerified(c, 1);
  });
  window._relSeedFromState();
  const res = window._relIngestRelations(parsed.relations, { prose, sceneUid: 'pg:e2e', pcViewpoint: true });
  return { ledgerKeys: Object.keys(window._charLedger ? window._charLedger() : ledger),
    accepted: res.accepted, dropped: res.dropped,
    project: window._relProject('author'),
    named: Object.keys(s._relationshipLedger.entities).filter(k => k.indexOf('ent:') === 0) };
// The prose must attribute coherently: the earlier draft had the line spoken by
// "Corwin's sister" while the advisory named Lirael, and that disagreement correctly
// failed closed — a fixture bug, not a validator bug.
}, { prose: '"Veilwood is my father," Lirael said. "Corwin is my brother," Lirael said, and Corwin said nothing at all.' });
t('6. rejected character not in disclosure ledger', !e2e.ledgerKeys.includes('veilwood'), JSON.stringify(e2e.ledgerKeys));
t('6. rejected character anchors NO relation', !e2e.project.some(l => /Veilwood/i.test(l)) && !e2e.named.some(k => /veilwood/.test(k)),
  e2e.project.join(' | '));
t('7. valid character admitted', e2e.ledgerKeys.includes('corwin'));
t('7. valid relation committed', e2e.accepted === 1 && e2e.dropped === 1,
  `accepted=${e2e.accepted} dropped=${e2e.dropped}`);

// ── 8. legitimate existing fixtures still admitted ──
console.log('\n 8. EXISTING FIXTURES INTACT');
const FIXTURES = [
  ['Scene 1 (literary)', 'Lord Theron', 'Lord Theron waited by the shrine. "You are late," Theron said, and the ash moved.'],
  ['literary continuation', 'Anjali', 'Anjali said nothing at all, and then Anjali laughed once, which was worse.'],
  ['CG beat prose', 'Corwin', 'Corwin said the gate was open. "Then we go," Corwin said, and they went through.'],
  ['CG titled', 'Marshal Vey', 'Marshal Vey watched from the wall and Vey did not move at all while they argued.'],
];
for (const [label, name, prose] of FIXTURES) {
  const v = await admit({ name, present: true }, prose);
  t(`${label}: "${name}" still admitted`, v.ok === true, `reason=${v.reason}`);
}

await browser.close();
console.log(`\n COST — ${attempts.length} intercepted, 0 issued, ${attempts.filter(a => a.paid).length} paid blocked.`);
console.log(`\n${'─'.repeat(82)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
