// THE AUTHORITATIVE RECORD KEEPS THE WHOLE EVENT. Provider-free, $0.
//
// MEASURED: the authored Dohkar interruption committed a 688-character event against a
// 300-character field and lost 388 characters — including the clause stating the rite and the
// ruling are his and that a FORMAL INQUIRY is the venue. Authored canon vanished from the record
// the next scene reads.
//
// Raising 300 to another number moves the cliff; storing the long text elsewhere creates a second
// source of truth. So the entry keeps the event WHOLE in plannedEventFull while plannedEvent stays
// the bounded field every existing consumer already reads.
import { chromium } from 'playwright-core';
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
console.log('=== LEDGER KEEPS THE WHOLE EVENT (provider-free, $0) ===\n');
const b = await chromium.launch(); const page = await b.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._sceneLedgerCommit === 'function', { timeout: 30000 });

const LONG = 'The presiding Dohkar cut the interrogation off, and said: that is enough, Provast. '
  + 'This rite is mine to preside, and what the Sacrificiant did in it is mine to rule on — in a '
  + 'formal inquiry, before a Chayr and two Dohkars, where questions are put for the record. Not '
  + 'here, and not as your opportunity to flirt with the accused. Julian agreed, and claimed the '
  + 'inquiry: he would convene it, and preside, and said that was always where this was going.';
const SHORT = 'The clerk reads the demand aloud.';

const commit = (event) => page.evaluate((ev) => {
  window.state.storyId = window.state.storyId || 'ledger-control';
  window.state._sceneLedger = null;
  window._sceneLedgerCommit(window.state, { kind: 'oas_interrupt', sceneNumber: 1,
    event: ev, eventSource: 'control' });
  const L = window.state._sceneLedger || { entries: [] };
  const e = L.entries[L.entries.length - 1] || {};
  return { bounded: e.plannedEvent || '', full: e.plannedEventFull || null,
    losses: (window._sceneLedgerClipLosses ? window._sceneLedgerClipLosses().length : 0) };
}, event);

console.log('1. a long event is bounded for consumers AND kept whole on the record');
{
  const r = await commit(LONG);
  console.log('     source ' + LONG.length + ' chars → bounded ' + r.bounded.length
    + ', full ' + (r.full ? r.full.length : 'null'));
  t('the bounded field is still capped at 300', r.bounded.length === 300, 'len=' + r.bounded.length);
  t('the WHOLE event survives on the same entry',
    !!r.full && r.full.length === LONG.length, 'full len=' + (r.full ? r.full.length : 'null'));
  t('and the clause the clip was dropping is present in it',
    !!r.full && /formal inquiry, before a Chayr and two Dohkars/.test(r.full),
    'the inquiry clause is missing');
  t('the final clause survives too',
    !!r.full && /that was always where this was going/.test(r.full));
  t('the loss is still announced, so truncation stays diagnosable', r.losses > 0,
    'no clip warning recorded');
  t('the bounded field is a PREFIX of the whole — one text, not two',
    !!r.full && r.full.slice(0, 300) === r.bounded);
}

console.log('\n2. a short event gains no duplicate — no second source of truth');
{
  const r = await commit(SHORT);
  t('the bounded field holds it intact', r.bounded === SHORT, r.bounded);
  t('and plannedEventFull is NOT set', r.full === null, String(r.full));
}

console.log('\n3. existing consumers are unaffected');
{
  const r = await commit(LONG);
  t('plannedEvent remains the bounded field they already read',
    typeof r.bounded === 'string' && r.bounded.length === 300);
}
await b.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
