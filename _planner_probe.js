// TIER 1 — PLANNER UNIT TESTS (Roman 2026-07-24). Tests the Scene-1 IR planner
// (_compressAPlotForScene1) in ISOLATION — NO prose gen, NO full pipeline. Feeds synthetic
// A-plots straight into the compressor and runs DETERMINISTIC validators on the returned IR
// (state_change external/observable/distinct? forces_choice non-generic? counterfactual proof
// real?). ~30-45 IRs in ~2 min at ~$0.05 (gpt-4o-mini compress calls only). Replaces the
// expensive 20-min end-to-end harness for planner-logic iterations.
//   node _planner_probe.js            → dashboard + /tmp/planner_ir.json
//   REPEATS=3 node _planner_probe.js  → 3 stochastic samples per plot
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/planner_ir.json';
const REPEATS = parseInt(process.env.REPEATS || '3', 10);
const log = (...a) => console.error(...a);

// Synthetic A-plots — varied domains, each with the fields _compressAPlotForScene1 reads.
// Chosen to TEMPT generic dilemmas (rumor/secret/betrayal plots) so the counterfactual gate is stressed.
const APLOTS = [
  { label: 'mentor-steals-work', goal: 'reclaim authorship of the research her mentor published under his own name', antagonistOrAntiForce: 'her celebrated mentor', stakesIfFail: 'her career is erased and his version becomes the record', stakesIfWin: 'her name is restored to her life\'s work', pcWound: 'she was taught her worth is her usefulness to powerful men', liWound: 'he once stayed silent while someone he loved was erased', woundSurfacingMechanism: 'being asked to stay quiet "for the good of the institute"' },
  { label: 'arranged-marriage', goal: 'stop the marriage his family arranged to a stranger for a merger', antagonistOrAntiForce: 'his mother, who controls the family', stakesIfFail: 'he is bound to a loveless dynastic marriage', stakesIfWin: 'he chooses his own life', pcWound: 'love has always been conditional on obedience', liWound: 'she was the "practical" choice someone settled for once', woundSurfacingMechanism: 'the engagement being announced before she is asked' },
  { label: 'will-dispute', goal: 'secure the inheritance her grandmother truly meant for her', antagonistOrAntiForce: 'her cousin Lena, contesting the will', stakesIfFail: 'she loses the house and her grandmother\'s legacy', stakesIfWin: 'she keeps the one place that ever felt like home', pcWound: 'she was the family\'s afterthought', liWound: 'he lost his own home to a relative\'s greed', woundSurfacingMechanism: 'the family gathering to "settle things"' },
  { label: 'journal-leak', goal: 'contain the private journal that was stolen from her studio', antagonistOrAntiForce: 'an anonymous leaker', stakesIfFail: 'her most private self is made public', stakesIfWin: 'she controls her own story', pcWound: 'being truly seen has always ended in betrayal', liWound: 'his own confession was once used against him', woundSurfacingMechanism: 'her words being read back to her by a stranger' },
  { label: 'sabotaged-gala', goal: 'save the gala her floristry business staked everything on', antagonistOrAntiForce: 'a rival who wants her contract', stakesIfFail: 'she is ruined and publicly humiliated', stakesIfWin: 'her name is made', pcWound: 'she believes she is one mistake from worthless', liWound: 'he built his empire on a rival\'s downfall and regrets it', woundSurfacingMechanism: 'her work failing in front of the people who matter' },
  { label: 'false-accusation', goal: 'clear her name of a theft she did not commit', antagonistOrAntiForce: 'the real thief, who framed her', stakesIfFail: 'she is disgraced and jailed', stakesIfWin: 'the truth is known', pcWound: 'no one has ever taken her word over a richer person\'s', liWound: 'he was once believed only because of his name', woundSurfacingMechanism: 'being accused in front of everyone she respects' },
  { label: 'hidden-debt', goal: 'keep her family\'s secret ruin from destroying them before she can fix it', antagonistOrAntiForce: 'a creditor calling in the debt', stakesIfFail: 'the family name collapses publicly', stakesIfWin: 'she saves them quietly', pcWound: 'she has always carried what others broke', liWound: 'his family hid their own fall until it was too late', woundSurfacingMechanism: 'the debt surfacing where others can see' },
  { label: 'rival-takeover', goal: 'stop the rival buying out the company her father built', antagonistOrAntiForce: 'a corporate raider', stakesIfFail: 'her father\'s legacy is dismantled', stakesIfWin: 'she proves she can hold it', pcWound: 'she was never the child he trusted with it', liWound: 'he sold his own family firm and never forgave himself', woundSurfacingMechanism: 'a board turning against her in the open' },
  { label: 'secret-identity', goal: 'keep her old identity buried long enough to finish what she came to do', antagonistOrAntiForce: 'someone from her past who recognizes her', stakesIfFail: 'her cover and her mission collapse', stakesIfWin: 'she finishes it and gets out', pcWound: 'she has never been allowed to just be herself', liWound: 'he loved someone who turned out to be a lie', woundSurfacingMechanism: 'being called by a name she buried' },
  { label: 'betrayal-by-ally', goal: 'expose the friend who has been feeding her secrets to her enemy', antagonistOrAntiForce: 'her trusted friend, secretly turned', stakesIfFail: 'she loses everything to someone she loved', stakesIfWin: 'she cuts the leak and survives', pcWound: 'the people she trusts always leave first', liWound: 'he was betrayed by a partner and stopped trusting', woundSurfacingMechanism: 'proof of the betrayal landing where she cannot ignore it' },
  { label: 'blackmail-threat', goal: 'refuse the blackmail without losing what it threatens', antagonistOrAntiForce: 'a blackmailer with real leverage', stakesIfFail: 'she is owned, or she is exposed', stakesIfWin: 'she is free of them', pcWound: 'she has always paid to keep the peace', liWound: 'he once paid a blackmailer and it never ended', woundSurfacingMechanism: 'the threat being made real in front of witnesses' },
  { label: 'custody-fight', goal: 'keep guardianship of the sister she raised', antagonistOrAntiForce: 'a relative with money and a claim', stakesIfFail: 'her sister is taken', stakesIfWin: 'they stay together', pcWound: 'everyone she loves gets taken by people with more power', liWound: 'he lost a sibling to a system that did not care', woundSurfacingMechanism: 'the claim being pressed openly at a family event' }
];

// ── DETERMINISTIC VALIDATORS (heuristics — flags for human review, not generation constraints) ──
const words = s => (String(s || '').toLowerCase().match(/\b[a-z']+\b/g) || []);
const overlap = (a, b) => { const A = new Set(words(a).filter(w => w.length > 3)), B = new Set(words(b).filter(w => w.length > 3)); if (!A.size) return 0; let c = 0; A.forEach(w => { if (B.has(w)) c++; }); return c / A.size; };
const EMOTIONAL = /\b(realiz|feels?|felt|feeling|emotions?|mood|the air|tension mount|grows? tense|stir(s|red|ring)?|senses?|dawns?|understand(s|ing)?|hope|dread|her heart|washes? over|settles? over|threatens? to spill)\b/i;
// A generic dilemma pairs an ACTIVE verb with an AVOIDANT escape-hatch option ("confront OR stay
// silent/retreat/do nothing") — the status-quo option that carries no NEW stakes from the event.
// (Fixed 2026-07-24: prior /\bconfront\b/ missed the -ing forms the planner actually emits.)
const AVOIDANT = /\b(stay(ing)? silent|retreat(ing)?|fle(e|eing)|hid(e|ing)( from)?|giv(e|ing) up|let(ting)? (go|it)|back(ing)? down|do(ing)? nothing|say(ing)? nothing|keep(ing)? quiet|walk(ing)? away|bury(ing)? (it|the|her)|remain(ing)? silent|shrink|accept(ing)? (the|her|defeat))\b/i;
const OFFSTAGE_LI = /\b(his smile|his gaze|his eyes|his voice|his grief|his pain|his silence falters|he (arrives|appears|walks in|reacts|looks))\b/i;

// A branch test FAILS if it admits the option survives event-deletion ("still possible / unchanged /
// either way") — an honest escape-hatch confession. Pairs with the AVOIDANT check on the choice.
const SURVIVES = /\b(still (stands|possible|holds|works|an option|the same)|unchanged|either way|same as before|could still|no different|remains? (possible|an option|unchanged)|always (could|possible)|regardless)\b/i;
function validateIR(ir) {
  const sc = ir.state_change || '', fc = ir.forces_choice || '', ba = ir.branch_a_delete_test || '', bb = ir.branch_b_delete_test || '', ps = ir.pressure_sentence || '';
  const checks = {
    sc_external: !EMOTIONAL.test(sc),                                    // event changes the world, not the mood
    sc_distinct: overlap(sc, ps) < 0.5,                                  // distinct from the opening pressure
    sc_onpage: !OFFSTAGE_LI.test(sc),                                    // not gated on the offstage LI
    fc_not_generic: !AVOIDANT.test(fc),                                 // choice offers no avoidant escape-hatch (two active options)
    branch_a_breaks: ba.length > 12 && !SURVIVES.test(ba),             // option A becomes impossible/different without the event
    branch_b_breaks: bb.length > 12 && !SURVIVES.test(bb)              // option B becomes impossible/different without the event
  };
  const pass = Object.values(checks).every(Boolean);
  const fails = Object.keys(checks).filter(k => !checks[k]);
  return { pass, fails };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._compressAPlotForScene1 === 'function', { timeout: 40000 });
  const results = [];
  for (const ap of APLOTS) {
    for (let r = 0; r < REPEATS; r++) {
      const ir = await page.evaluate(async (aplot) => {
        try { return await window._compressAPlotForScene1(Object.assign({}, aplot)); } catch (e) { return { error: String((e && e.message) || e) }; }
      }, ap);
      results.push({ plot: ap.label, ir: ir || { error: 'null' } });
      log('  ' + ap.label + ' #' + (r + 1) + (ir && ir.state_change ? ' ✓' : ' ✗ ' + JSON.stringify(ir).slice(0, 80)));
    }
  }
  await browser.close();

  // ── DASHBOARD ──
  const rows = results.map(x => {
    const ir = x.ir || {};
    const v = ir.state_change ? validateIR(ir) : { pass: false, fails: ['no_ir'] };
    return { plot: x.plot, ir, v };
  });
  fs.writeFileSync(OUT, JSON.stringify({ rows }, null, 1));
  const n = rows.length, passed = rows.filter(r => r.v.pass).length;
  log('\n═══════════════════ PLANNER DASHBOARD (' + passed + '/' + n + ' pass all checks) ═══════════════════');
  for (const r of rows) {
    const ir = r.ir;
    log('\n' + (r.v.pass ? '✅' : '❌ [' + r.v.fails.join(',') + ']') + ' ' + r.plot);
    log('   pressure : ' + (ir.pressure_sentence || '—'));
    log('   Δstate   : ' + (ir.state_change || '—'));
    log('   choice   : ' + (ir.forces_choice || '—'));
    log('   A∅test   : ' + (ir.branch_a_delete_test || '—'));
    log('   B∅test   : ' + (ir.branch_b_delete_test || '—'));
  }
  // per-check failure tally
  const tally = {};
  rows.forEach(r => r.v.fails.forEach(f => { tally[f] = (tally[f] || 0) + 1; }));
  log('\n── check failures (of ' + n + ') ──');
  Object.keys(tally).sort((a, b) => tally[b] - tally[a]).forEach(k => log('  ' + k + ': ' + tally[k]));
  log('\nPASS RATE: ' + passed + '/' + n + ' (' + Math.round(100 * passed / n) + '%)  → ' + OUT);
})().catch(e => { console.error('PLANNER-PROBE-ERR', e.message); process.exit(1); });
