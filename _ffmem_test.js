const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._ffTrimStoryMemory === 'function' && typeof window._buildFamousFateContractDirective === 'function', { timeout: 40000 });
  const R = await p.evaluate(() => {
    const out = {};
    // 1) TIERING: 20 durable (objects) established long ago + 20 recent soft relationship notes
    const arr = [];
    for (let i = 0; i < 20; i++) arr.push({ subject: 'item' + i, kind: 'object', change: 'left object #' + i + ' in the cave' });
    for (let i = 0; i < 20; i++) arr.push({ subject: 'rel' + i, kind: 'relationship', change: 'small rapport note #' + i });
    const trimmed = window._ffTrimStoryMemory(arr);
    const durableKept = trimmed.filter(m => m.kind === 'object').length;
    const softKept = trimmed.filter(m => m.kind === 'relationship').length;
    out.durable_all_kept = (durableKept === 20);           // all 20 durable survive (old slice(-14) would drop them)
    out.oldest_durable_survives = trimmed.some(m => m.change === 'left object #0 in the cave');
    out.soft_capped_14 = (softKept === 14);
    // 2) INJECT: durable fact tagged [ESTABLISHED]; the header warns not to forget
    const s = window.state;
    s.fateMode = 'famous_fate';
    s.ffContract = s.ffContract || { canonBeatLedger: [], character: {}, world: {} };
    s.ffStoryMemory = [
      { subject: "Logan's skeleton", kind: 'state', change: 'is now VIBRANIUM, not adamantium' },
      { subject: 'the sword', kind: 'object', change: 'is left buried in the cave' },
      { subject: 'his followers', kind: 'order', change: 'were told to train until his return' },
      { subject: 'Sabretooth', kind: 'relationship', change: 'grudgingly respects Logan now' }
    ];
    let dir = '';
    try { dir = window._buildFamousFateContractDirective() || ''; } catch (e) { dir = 'ERR:' + e.message; }
    out.inject_has_established_tag = /\[ESTABLISHED\] Logan's skeleton: is now VIBRANIUM/.test(dir);
    out.inject_tags_object = /\[ESTABLISHED\] the sword: is left buried/.test(dir);
    out.inject_tags_order = /\[ESTABLISHED\] his followers: were told to train/.test(dir);
    out.inject_soft_untagged = /• Sabretooth: grudgingly respects/.test(dir) && !/\[ESTABLISHED\] Sabretooth/.test(dir);
    out.inject_header_warns = /must be honored\/paid off later; never quietly forget/.test(dir);
    return out;
  });
  console.log(JSON.stringify(R, null, 2));
  await b.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
