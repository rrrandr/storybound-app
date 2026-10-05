// PLOT-DEFLECTION ELIGIBILITY + THE AUTHORED-INTERRUPTION OPENING. Provider-free, $0.
//
// ══ WHAT THIS IS AND IS NOT ════════════════════════════════════════════════════════════════
// The eligible() helper below RE-IMPLEMENTS the eligibility condition; it does NOT drive
// production's own _handleIntimacyTurn. So it is a SPECIFICATION CHECK of the rule, not proof
// that the shipped handler behaves this way. Codex caught me labelling it as the latter, and the
// prompt-building probe I wrote was never called.
//
// AND THE POSITIVE CASES MANUFACTURE THEIR STATE. physicalState.act_state HAS NO PRODUCTION
// WRITER — nothing anywhere sets it. So automatic plot deflection is currently DISABLED, not
// "implemented for imminent/active sex": the two CAN-FIRE rows below prove the rule would admit
// such a state if a producer existed, and nothing more. Writing act_state in a fixture is not
// evidence of a producer.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._buildIntimacyTurnPrompt === 'function', { timeout: 30000 });

// Force the coin to ALWAYS fire, so anything still OFF is off by ELIGIBILITY, not by luck.
await page.evaluate(() => { window.__realRandom = Math.random; Math.random = () => 0.0; });

const probe = (opts) => page.evaluate((o) => {
  const s = window.state;
  s.intimacyDialogue = { active: true, beatCount: o.beat, softCap: 17, hardCap: 20,
    temperature: o.temperature, userRegister: o.register,
    userSignals: { positive: 0, neutral: 1, disengaged: 0 }, liTurnHistory: [], _fateCardRevealed: {} };
  s.physicalState = o.physicalState || { location: '', mc_position: '', li_position: '',
    proximity: '', objects_notable: '' };
  // The runner-visible signal: does the assembled prompt carry the deflection directive?
  const p = window._buildIntimacyTurnPrompt(s.intimacyDialogue, o.say, o.do, !!o.explicit, false, false);
  return { hasDeflectDirective: /PLOT|deflect/i.test(p) && /brush|deflect/i.test(p) };
}, opts);

// Read the eligibility the handler itself computes, with the coin forced on.
const eligible = (opts) => page.evaluate((o) => {
  const s = window.state;
  s.physicalState = o.physicalState || {};
  s.intimacyDialogue = { active: true, beatCount: o.beat, softCap: 17, hardCap: 20,
    temperature: o.temperature, userRegister: o.register,
    userSignals: { positive: 0, neutral: 1, disengaged: 0 }, liTurnHistory: [], _fateCardRevealed: {} };
  const sniff = (typeof window._detectContextualEscalation === 'function')
    ? !!window._detectContextualEscalation(o.say, o.do) : null;
  const ps = s.physicalState || {};
  const act = (typeof ps.act_state === 'string' && ps.act_state) ? ps.act_state : null;
  const imminentOrActive = (act === 'imminent' || act === 'active');
  return { sniff, act, imminentOrActive,
    wouldDeflect: !!(imminentOrActive && sniff && o.beat !== 1 && Math.random() < 0.5) };
}, opts);

console.log('=== PLOT DEFLECTION — SPECIFICATION CHECK (coin forced ON) ===');
console.log('    Re-implements the condition; does NOT exercise _handleIntimacyTurn.');
console.log('    act_state has NO production writer, so deflection is DISABLED in practice.\n');

const CASES = [
  ['flirtation, high temperature, explicit register', { beat: 5, temperature: 'peaking',
    register: 'explicit', say: 'I want you.', do: 'I lean in.', explicit: true }, false],
  ['INTERROGATION — the First Sacrifice opening register', { beat: 5, temperature: 'curious',
    register: 'soft', say: 'Who signed the demand?', do: 'I hold his gaze.' }, false],
  ['plot-aware JEALOUSY outside imminent sex', { beat: 5, temperature: 'warming',
    register: 'direct', say: 'Were you with her before the rite?', do: 'I watch his hands.' }, false],
  ['DISCOVERY RISK outside imminent sex', { beat: 5, temperature: 'warming', register: 'direct',
    say: 'Someone is listening at the door.', do: 'I glance past him.' }, false],
  ['AFTERGLOW', { beat: 9, temperature: 'resolution', register: 'soft',
    say: 'What happens to Seren now?', do: 'I breathe out.',
    physicalState: { act_state: 'afterglow' } }, false],
  ['MISSING state', { beat: 5, temperature: 'peaking', register: 'explicit',
    say: 'Did the Dohkar see us?', do: 'I freeze.', physicalState: {} }, false],
  ['AMBIGUOUS state', { beat: 5, temperature: 'peaking', register: 'explicit',
    say: 'Did the Dohkar see us?', do: 'I freeze.',
    physicalState: { act_state: 'close' } }, false],
  ['ESTABLISHED IMMINENT sex', { beat: 5, temperature: 'peaking', register: 'explicit',
    say: 'Did the Dohkar see us?', do: 'I freeze.',
    physicalState: { act_state: 'imminent' } }, true],
  ['ESTABLISHED ACTIVE sex', { beat: 5, temperature: 'peaking', register: 'explicit',
    say: 'Did the Dohkar see us?', do: 'I freeze.',
    physicalState: { act_state: 'active' } }, true]
];
for (const [label, opts, want] of CASES) {
  const r = await eligible(opts);
  t((want ? 'CAN fire: ' : 'OFF: ') + label, r.wouldDeflect === want,
    'sniff=' + r.sniff + ' act=' + r.act + ' -> wouldDeflect=' + r.wouldDeflect);
}

console.log('\n=== THE AUTHORED-INTERRUPTION OPENING ===');
console.log('    Package data + the live predicate. Exercising a real exit needs the deck');
console.log('    defect below to be fixed first.\n');
{
  const r = await page.evaluate(() => {
    const out = {};
    out.fnExists = typeof window._oasEndsInAuthoredInterruption === 'function';
    // First Sacrifice's package declares endsAt:'oas_interrupt'
    const all = window.STARTER_STORIES || [];
    const fs_ = all.find(d => d && d.id === 'starter_first_sacrifice');
    out.launched = !!fs_;
    return out;
  });
  t('the predicate exists', r.fnExists);

  const pkgs = await page.evaluate(() => {
    const plans = (typeof STARTER_PLANS !== 'undefined') ? STARTER_PLANS : {};
    const out = {};
    // The baked packages live on window.STARTER_SCENE1, not STARTER_SCENES.
    Object.keys(window.STARTER_SCENE1 || {}).forEach(k => {
      const pkg = window.STARTER_SCENE1[k] || {};
      const h = pkg.oasHandoff;
      out[k] = h ? { endsAt: pkg.endsAt || h.endsAt || null, hasInterruption: !!h.interruption,
        exchangeLines: (h.interruptionExchange || []).length } : null;
    });
    return out;
  });
  console.log('  packages: ' + JSON.stringify(pkgs));
  const fsPkg = pkgs['starter_first_sacrifice'];
  t('First Sacrifice declares endsAt=oas_interrupt', fsPkg && fsPkg.endsAt === 'oas_interrupt',
    JSON.stringify(fsPkg));
  t('and carries an authored interruption with a fixed exchange',
    fsPkg && fsPkg.hasInterruption && fsPkg.exchangeLines >= 3);
  const others = Object.keys(pkgs).filter(k => k !== 'starter_first_sacrifice' && pkgs[k]);
  t('an ordinary encounter does NOT declare it, so it keeps afterglow',
    others.every(k => pkgs[k].endsAt !== 'oas_interrupt'),
    'others: ' + JSON.stringify(others.map(k => [k, pkgs[k].endsAt])));
  // ONE VARIANT ONLY — flagged, not invented.
  const fsH = await page.evaluate(() => {
    const h = ((window.STARTER_SCENE1 || {})['starter_first_sacrifice'] || {}).oasHandoff || {};
    return { interruption: String(h.interruption || '').slice(0, 160),
      speakers: (h.interruptionExchange || []).map(x => x.speaker) };
  });
  console.log('  authored interruption: ' + JSON.stringify(fsH.interruption));
  console.log('  exchange speakers: ' + JSON.stringify(fsH.speakers));
  t('the authored interrupter is the presiding Dohkar',
    /Dohkar/.test(fsH.interruption) && fsH.speakers.some(x => /Dohkar/i.test(String(x))));

  // THE SHIPPED PREDICATE, exercised directly — encounter-scoped, not story-scoped.
  const scope = await page.evaluate(() => {
    const out = {};
    window.state.intimacyDialogue = { active: true, endsInAuthoredInterruption: true };
    out.opening = window._oasEndsInAuthoredInterruption();
    window.state.intimacyDialogue = { active: true, endsInAuthoredInterruption: false };
    out.later = window._oasEndsInAuthoredInterruption();
    window.state.intimacyDialogue = null;
    out.none = window._oasEndsInAuthoredInterruption();
    return out;
  });
  t('the OPENING encounter suppresses afterglow', scope.opening === true);
  t('a LATER encounter in the SAME STORY keeps afterglow', scope.later === false,
    'the first version suppressed it story-wide');
  t('no dialogue means no suppression', scope.none === false);
}

await page.evaluate(() => { if (window.__realRandom) Math.random = window.__realRandom; });
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
