// Isolate the delta classifier: does it flip an OBVIOUS state change? (no full scene gen — one Grok call)
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => window.state && typeof window._ffClassifyStateDelta === 'function' && window._FFCausal, { timeout: 40000 });

  const cases = [
    { name: 'unsheathe claws + kill gang (should flip claws_sheathed=false)',
      act: 'I unsheathe my adamantium claws and tear into the Hulk Gang, killing them all where they stand.', dia: 'No more running.' },
    { name: 'canon endure (should be none)',
      act: 'I stand still and take the beating, hands open.', dia: "Enough. You've made your point." },
    { name: 'pay the rent (should flip rent_deadline_active=false)',
      act: 'I hand over every credit we have and settle the rent in full.', dia: 'There. Paid. Now leave.' },
  ];

  for (const c of cases) {
    const r = await p.evaluate(async (c) => {
      const s = window.state;
      s.fateMode = 'famous_fate';
      s.famousFate = { period: 'canon' };
      s.ffContract = {
        causalStateVariables: [
          { id: 'claws_sheathed', kind: 'state', text: "Logan keeps his vow — his adamantium claws stay sheathed; he has not drawn them or killed anyone", initiallyTrue: true },
          { id: 'rent_deadline_active', kind: 'state', text: 'the Hulk Gang has imposed a rent deadline that is still pending / unpaid', initiallyTrue: false },
          { id: 'family_alive', kind: 'state', text: "Logan's family (Maureen and the kids) are alive", initiallyTrue: true },
        ],
        canonBeatLedger: [
          { beatIndex: 1, dependsOn: [{ variable: 'claws_sheathed' }, { variable: 'family_alive' }], produces: ['rent_deadline_active'] },
          { beatIndex: 2, dependsOn: [{ variable: 'claws_sheathed' }, { variable: 'rent_deadline_active' }], produces: [] },
          { beatIndex: 4, dependsOn: [{ variable: 'claws_sheathed' }], produces: [] },
        ],
      };
      s._ffCanonBeatIndex = 1;
      s._ffVarState = { claws_sheathed: true, rent_deadline_active: false, family_alive: true };
      const delta = await window._ffClassifyStateDelta(c.act, c.dia);
      return delta;
    }, c);
    console.error('  ' + c.name + '\n     → ' + JSON.stringify(r));
  }
  await b.close(); process.exit(0);
})().catch(e => { console.error('PROBE FATAL', e.message); process.exit(1); });
