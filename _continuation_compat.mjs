// CONTINUATION COMPATIBILITY — Commit B part 2 must not move the continuation path.
//
// Part 2 introduced C+/E+/fusion into the OPENING and extracted _dedupeCastNames out of
// _selectSceneAssignment. Both are shared with continuations, so this pins the shared
// surfaces against the behaviour they had before.
//
// usage: node _continuation_compat.mjs
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
console.log(`\n${'═'.repeat(84)}\nCONTINUATION COMPATIBILITY\n${'═'.repeat(84)}\n`);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await page.waitForFunction(() => window.state && window._normalizeSceneAssignments, { timeout:120000 });

const R = await page.evaluate(() => {
  const N = window._normalizeSceneAssignments;
  const D = window._dedupeCastNames;
  // the rule _selectSceneAssignment used inline before extraction, reproduced verbatim
  const legacy = names => names
    .map(function (n) { return String(n || '').trim(); })
    .filter(function (n) { return !!n; })
    .filter(function (n, i, arr) {
      return arr.findIndex(function (m) { return m.toLowerCase() === n.toLowerCase(); }) === i;
    });
  const cases = [
    ['Mara','Dorian','Dorian'], ['  Ana ','ana','ANA'], [], ['', null, 'Kai'],
    ['Seren','Kesh','Maren','Seren'],
  ];
  return {
    dedupeMatches: cases.every(c => JSON.stringify(D(c)) === JSON.stringify(legacy(c))),
    dedupeSamples: cases.map(c => D(c)),
    // continuation-shaped skeleton assignment, unchanged expectations
    full: N({ character_plus: [{ character:'Ada', first_mention:true, angle:'holds the line' },
                               { character:'Bo', first_mention:false, angle:'wants out' }],
              environment_plus: { target:'the kettle', axis:'use' },
              fusion: { character:'Ada', target:'the kettle' } }, 7, 'continuation'),
    axisCoerced: N({ environment_plus: { target:'x', axis:'nonsense' } }, 7, 'continuation'),
    empty: N(null, 7, 'continuation'),
    dropsNameless: N({ character_plus: [{ character:'', angle:'x' }, { character:'Cy', angle:'y' }] }, 7, 'continuation'),
    hasGenerator: typeof window.__generateSceneSkeleton === 'function',
    hasValidity: typeof window.__isSkeletonValid === 'function',
  };
});
await browser.close();

t('_dedupeCastNames is byte-identical to the pre-extraction inline rule', R.dedupeMatches,
  JSON.stringify(R.dedupeSamples));
t('C+ array preserved in order, no cap, no truncation',
  R.full.character_plus.length === 2 && R.full.character_plus[0].character === 'Ada'
  && R.full.character_plus[1].character === 'Bo', JSON.stringify(R.full.character_plus));
t('C+ first_mention / angle preserved',
  R.full.character_plus[0].first_mention === true && R.full.character_plus[1].first_mention === false
  && R.full.character_plus[1].angle === 'wants out');
t('E+ target + valid axis preserved',
  R.full.environment_plus && R.full.environment_plus.target === 'the kettle'
  && R.full.environment_plus.axis === 'use', JSON.stringify(R.full.environment_plus));
t('fusion preserved', R.full.fusion && R.full.fusion.character === 'Ada' && R.full.fusion.target === 'the kettle');
t('sceneKey + source stamped', R.full.sceneKey === 7 && R.full.source === 'continuation');
t('status defaults to planned', R.full.status === 'planned');
t('UNCHANGED for continuations: an unknown axis still coerces to history',
  R.axisCoerced.environment_plus && R.axisCoerced.environment_plus.axis === 'history',
  'the opening validates the RAW axis separately; the shared salvage behaviour is untouched');
t('null input yields the empty shape, never a throw',
  Array.isArray(R.empty.character_plus) && R.empty.character_plus.length === 0
  && R.empty.environment_plus === null && R.empty.fusion === null);
t('nameless C+ entries dropped, named ones kept',
  R.dropsNameless.character_plus.length === 1 && R.dropsNameless.character_plus[0].character === 'Cy');
t('continuation skeleton generator still exposed', R.hasGenerator);
t('opening/continuation cache predicate still exposed', R.hasValidity);

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
