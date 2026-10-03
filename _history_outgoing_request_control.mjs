// DOES ESTABLISHED HISTORY REACH THE ACTUAL OUTGOING PLANNER REQUEST? Provider-free, $0.
//
// Storage checks and headings cannot close this. The assertion reads the REQUEST BODY the app
// would have sent, and it must distinguish "the content is absent" from "no request was made".
// A negative arm disables the forwarding and REQUIRES the assertion to go red, because a check
// that cannot fail proves nothing (Roman's controls_must_bite rule).
import fs from 'fs';
import { chromium } from 'playwright-core';
import { isProviderEndpoint } from './_replay_fixtures.mjs';

const PROSE = 'The chamber was quiet for a long moment. Julian took the sealed writ from his '
  + 'sleeve and put it into Lirael\'s hands, and she closed her fingers around it. The Dohkar '
  + 'did not look up from the table. Outside, the second bell was being rung.';

async function arm(label, { disableForwarding }) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const captured = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
    let raw = null; try { raw = req.postData(); } catch (_) {}
    captured.push(raw || '');
    try { await route.abort(); } catch (_) {}
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!window.state && typeof window._sbPersistSceneProjection === 'function',
    { timeout: 30000 });

  await page.evaluate(({ prose, disable }) => {
    window.state.scenes = [];
    window._sbPersistSceneProjection({
      kind: 'body', input: prose, uid: 'lit:req-control',
      historyNote: {
        transfers: [{ text: 'The sealed writ passed from Julian to Lirael.',
          quote: 'put it into Lirael\'s hands' }],                       // QUOTE-BACKED
        events: [{ text: 'Julian handed Lirael the sealed writ in the chamber.' }], // summary only
        disclosures: [{ text: 'Julian admitted he spent his own wish to stop the twist.' }], // SEALED
        obligations: [{ id: 'ob-req', text: 'Lirael must answer for her conduct at the inquiry.' }],
        decisions: [], consequences: []
      }
    });
    // THE NEGATIVE ARM: silence the forwarding and nothing else.
    if (disable) window._historyContinuityKill = true;   // the production kill switch, not an alias swap
  }, { prose: PROSE, disable: disableForwarding });

  let dispatched = false;
  try {
    await page.evaluate(() => window._generateLiteraryPlotContract
      ? window._generateLiteraryPlotContract('I wait.', '') : null);
    dispatched = true;
  } catch (_) { dispatched = true; }
  await page.waitForTimeout(2500);
  await browser.close();
  const body = captured.join('\n');
  return { label, requests: captured.length, body, dispatched };
}

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== ESTABLISHED HISTORY IN THE OUTGOING REQUEST (provider-free, $0) ===\n');

console.log('POSITIVE ARM — forwarding enabled');
const on = await arm('on', { disableForwarding: false });
console.log('     provider requests captured: ' + on.requests + '  (' + on.body.length + ' chars)');
// ABSENT CONTENT vs ABSENT REQUEST are different failures and are reported differently.
t('A REQUEST WAS ACTUALLY ASSEMBLED (otherwise every check below is vacuous)',
  on.requests > 0, 'no provider request was captured — the checks below prove nothing');
if (on.requests > 0) {
  t('the quoted-text heading reached the request',
    /WHAT THE SCENES THEMSELVES SAY/.test(on.body));
  t('THE SCENE\'S VERBATIM WORDS reached it, not just the heading',
    /put it into Lirael's hands/.test(on.body));
  t('the author\'s summary reached it, under its own unverified heading',
    /UNVERIFIED, NOT CANON/.test(on.body) && /handed Lirael the sealed writ/.test(on.body));
  t('the still-open obligation reached it, labelled as proposed',
    /PROPOSED OBLIGATIONS/.test(on.body) && /answer for her conduct at the inquiry/.test(on.body));
  t('A SEALED CLAIM NEVER REACHED IT — Julian\'s secret cannot ride in on a note',
    !/spent his own wish/.test(on.body),
    'a sealed secret entered the planning context through the history channel');
}

console.log('\nNEGATIVE ARM — forwarding disabled, the same assertions MUST go red');
const off = await arm('off', { disableForwarding: true });
console.log('     provider requests captured: ' + off.requests + '  (' + off.body.length + ' chars)');
t('a request was still assembled with forwarding off', off.requests > 0);
t('THE CHECK BITES: the history heading is GONE when forwarding is disabled',
  off.requests > 0 && !/WHAT THE SCENES THEMSELVES SAY/.test(off.body),
  'the assertion cannot fail, so it proves nothing');
t('and the quoted text is gone with it',
  off.requests > 0 && !/put it into Lirael's hands/.test(off.body));

fs.mkdirSync('_audit_out/history_req', { recursive: true });
fs.writeFileSync('_audit_out/history_req/on.txt', on.body);
fs.writeFileSync('_audit_out/history_req/off.txt', off.body);
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
