// STAGE 3 OPENING COMPILER — EVERY APPROVED OUTCOME.
// Provider-free. Drives the real module. Asserts, for all 8 Fate-chosen outcomes and all 5 exact
// readings: reachable wording, population roster, memory effects, temporal operation, cost, and
// that the prompt payload carries each one faithfully.
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const S = SRC.indexOf('// STAGE 3 — ISSUE 1 OPENING CONSEQUENCE COMPILER');
if (S < 0) { console.error('FATAL: compiler section not found'); process.exit(1); }
const win = {}; globalThis.window = win;
new Function('window', SRC.slice(S - 100))(win);

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
const reset = (f) => { win.state = Object.assign({ _starterId: 'starter_first_sacrifice', _fscDeltas: [], _fscCompiled: [] }, f || {}); };
const compile = (wish, flags) => { reset(flags); return win._fscCompileAndPersist(wish); };
const promptFor = (wish, flags) => { compile(wish, flags); return win._fscPromptBlock(); };

const ASSEMBLY = ['the_assembly'];
const PRESENT = ['the_assembly','named:seren','named:julian','role:first_sacrifice_presiding_dohkar','pc:lirael'];

// id -> everything the approved canon says it must be.
const EXPECT = [
  { wish: 'Make it stop.', flags: { _fsReviewPending: true },
    id: 'unm.dohkar_demand_unmade', ask: 'stop', op: 'historical_replacement',
    roster: null, mem: [], cost: null,
    ceases: ['review.demanded_by_dohkar'], estab: ['review.dohkar_demand_never_made','review.julian_demand_undisturbed'] },

  { wish: 'I wish this had never happened to me.', flags: {},
    id: 'unm.time_gives_way', ask: 'undo', op: 'historical_replacement',
    roster: PRESENT, mem: ['interr.julian_questioned_lirael','lirael.scene1_disposition'], cost: null,
    ceases: ['interr.julian_questioned_lirael','interr.dohkar_interrupted','interr.choice_arose',
             'lirael.scene1_disposition','answer.handed_to_lirael','answer.lirael_authorized_to_hold'],
    estab: ['interr.no_questioning_occurred','interr.no_interruption_occurred',
            'ceremony.replayed_unquestioned','answer.never_handed_to_lirael','lirael.choice_pending'] },

  { wish: 'Let me out of this.', flags: { _fsAccusationMade: true },
    id: 'unm.the_accusation_unmade', ask: 'escape', op: 'historical_replacement',
    roster: null, mem: [], cost: null,
    ceases: ['accusation.family_accused'], estab: ['accusation.family_never_accused'] },

  { wish: 'Let me out of this.', flags: {},
    id: 'unm.the_claim_unmade', ask: 'escape', op: 'historical_replacement',
    roster: null, mem: [], cost: null,
    ceases: ['auth.dohkar_claims_rite_and_ruling','auth.venue_named_formal_inquiry','auth.julian_claimed_convene_preside'],
    estab: ['auth.no_claim_to_rule','auth.no_venue_named'] },

  { wish: 'I want to disappear.', flags: {},
    id: 'unm.the_turning_forgotten', ask: 'unseen', op: null,
    roster: PRESENT, mem: ['twist.assembly_turned'], cost: null, ceases: [], estab: [] },

  { wish: 'Don’t bring that up.', flags: {},
    id: 'unm.the_custody_unremembered', ask: 'silence', op: null,
    roster: PRESENT, mem: ['answer.owned_by_institution','answer.entrusted_to_julian'],
    cost: 'she_forgets_whose_it_is', ceases: [], estab: [] },

  { wish: 'Who is he to question me?', flags: {},
    id: 'unm.standing_dissolved', ask: 'authority', op: 'current_state_transition',
    roster: null, mem: [], cost: 'escalation_invited',
    ceases: ['auth.julian_standing_to_convene'], estab: ['auth.julian_standing_void'] },

  { wish: 'Leave me alone.', flags: {},
    id: 'unm.the_shunning', ask: 'solitude', op: 'additive_canon_change',
    roster: ['the_assembly','named:seren','named:julian','role:first_sacrifice_presiding_dohkar'],
    mem: [], cost: 'undefended', ceases: [], estab: ['lirael.shunned_by_all_present'] }
];

console.log('=== EVERY APPROVED FATE-CHOSEN OUTCOME ===\n');
EXPECT.forEach(e => {
  console.log(e.id);
  const r = compile(e.wish, e.flags);
  t('  reachable from its wording', r.outcomeId === e.id, r.outcomeId + '/' + r.error);
  if (r.outcomeId !== e.id) return;
  t('  ask-class ' + e.ask, r.askClass === e.ask, r.askClass);
  t('  temporalOperation ' + (e.op || 'none'),
    (r.delta ? r.delta.temporalOperation : null) === e.op, r.delta ? r.delta.temporalOperation : 'none');
  if (e.roster) {
    t('  roster is the declared population', !!r.population && r.population.roster.length === e.roster.length,
      r.population ? r.population.roster.join(',') : 'none');
    t('  roster members exact', !!r.population && e.roster.every(m => r.population.roster.indexOf(m) >= 0));
    const inPop = e.roster.indexOf('pc:lirael') >= 0;
    if (e.mem.length) t('  invokerScope ' + (inPop ? 'in_population' : 'not_in_population'),
      r.invokerScope === (inPop ? 'in_population' : 'not_in_population'), r.invokerScope);
  } else {
    t('  no targeted population', r.population === null || !e.mem.length);
  }
  t('  memory effects: ' + (e.mem.length ? e.mem.join(' + ') : 'none'),
    r.memoryEffects.length === e.mem.length &&
    e.mem.every(a => r.memoryEffects.some(m => m.atom === a)),
    r.memoryEffects.map(m => m.atom).join(','));
  if (e.mem.length && e.roster) t('  every memory effect carries the frozen roster',
    r.memoryEffects.every(m => m.parties.length === e.roster.length));
  t('  ceases exactly ' + (e.ceases.length || 'nothing'),
    (r.delta ? r.delta.ceases.length : 0) === e.ceases.length &&
    e.ceases.every(a => r.delta && r.delta.ceases.indexOf(a) >= 0),
    r.delta ? r.delta.ceases.join(',') : 'no delta');
  t('  establishes exactly ' + (e.estab.length || 'nothing'),
    (r.delta ? r.delta.establishes.length : 0) === e.estab.length &&
    e.estab.every(id => r.delta && r.delta.establishes.some(x => x.id === id)),
    r.delta ? r.delta.establishes.map(x => x.id).join(',') : 'no delta');
  t('  cost ' + (e.cost || 'none'), (r.cost || null) === e.cost, String(r.cost));
  if (e.ceases.length) t('  historical replacement carries priorHistoryReplaced',
    e.op !== 'historical_replacement' || !!r.delta.priorHistoryReplaced);
  // Prompt payload fidelity
  const p = win._fscPromptBlock();
  t('  prompt names the outcome', p.indexOf(e.id) >= 0);
  const LBL = { 'pc:lirael':'Lirael', 'named:seren':'Seren', 'named:julian':'Julian',
    'role:first_sacrifice_presiding_dohkar':'the presiding Dohkar',
    'the_assembly':'the assembled First Favored' };
  if (e.roster) t('  prompt lists every affected party by story label',
    e.roster.every(m => p.indexOf(LBL[m]) >= 0));
  // INCLUSION + EXCLUSION, both asserted, collectives included.
  if (e.roster) {
    const outside = ['pc:lirael','named:seren','named:julian','role:first_sacrifice_presiding_dohkar']
      .filter(x => e.roster.indexOf(x) < 0);
    if (outside.length) t('  prompt names every NOT AFFECTED party individually',
      /NOT AFFECTED/.test(p) && outside.every(m => p.indexOf(LBL[m]) >= 0));
    else t('  prompt states no one present is outside the effect', /NOT AFFECTED: no one present/.test(p));
    if (e.roster.indexOf('pc:lirael') >= 0 && e.mem.length)
      t('  prompt states LIRAEL IS AFFECTED', /LIRAEL IS AFFECTED/.test(p));
  }
  t('  prompt carries a REQUIRED aftermath beat', /AFTERMATH BEAT \u2014 REQUIRED/.test(p));
  t('  aftermath beat is non-empty authored text',
    !!(win.state._fscActiveCompiled.aftermathBeat && win.state._fscActiveCompiled.aftermathBeat.text.length > 40));
  t('  prompt forbids visible wish-energy', /visible wish-energy/.test(p));
  t('  prompt forbids an Answer verdict', /never delivers a verdict/.test(p));
  t('  prompt forbids extra cost and new canon',
    /no cost or penalty beyond/.test(p) && /no new canon fact/.test(p));
  e.mem.forEach(a => t('  prompt carries memory effect ' + a, p.indexOf(a) >= 0));
  e.ceases.forEach(a => t('  prompt carries CEASES ' + a, p.indexOf('CEASES: ' + a) >= 0));
  t('  prompt states the cost honestly',
    e.cost ? p.indexOf('COST: ' + e.cost) >= 0 : /COST: none — do not invent one/.test(p));
});

// ── Exact readings ──────────────────────────────────────────────────────────────────────────
console.log('\n=== EVERY APPROVED EXACT READING ===\n');
const EXACT = [
  { wish: 'I wish the assembly would forget the wish twisted.',
    id: 'mem.exact.assembly_forgets_twist', roster: PRESENT, scope: 'in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },
  { wish: 'I wish everyone here would forget the wish twisted.',
    id: 'mem.exact.assembly_forgets_twist', roster: PRESENT, scope: 'in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },
  { wish: 'I wish the guests would forget the wish twisted.',
    id: 'mem.exact.guests_forget_twist', roster: ASSEMBLY, scope: 'not_in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },
  { wish: 'Let them all forget the Answer was ever the Institution’s.',
    id: 'mem.exact.institution_forgets_custody', roster: PRESENT, scope: 'in_population',
    mem: ['answer.owned_by_institution'], cost: 'custody_unclaimed' },
  { wish: 'I wish Julian didn’t remember questioning me like that.',
    id: 'mem.exact.julian_forgets_interrogation', roster: ['named:julian'], scope: 'not_in_population',
    mem: ['interr.julian_questioned_lirael'], cost: 'intimacy_unwitnessed' },
  { wish: 'Let the Dohkar forget he ever claimed the ruling was his.',
    id: 'mem.exact.dohkar_forgets_authority', roster: ['role:first_sacrifice_presiding_dohkar'],
    scope: 'not_in_population', mem: ['auth.dohkar_claims_rite_and_ruling'], cost: 'authority_vacuum' }
];
EXACT.forEach(e => {
  console.log(e.id);
  const r = compile(e.wish, {});
  t('  reachable from its exact wording', r.outcomeId === e.id, r.outcomeId + '/' + r.mode);
  if (r.outcomeId !== e.id) return;
  t('  mode is exact_reading (no ranking applies)', r.mode === 'exact_reading');
  t('  affected parties exact', r.memoryEffects.length &&
    r.memoryEffects[0].parties.length === e.roster.length &&
    e.roster.every(m => r.memoryEffects[0].parties.indexOf(m) >= 0),
    r.memoryEffects.length ? r.memoryEffects[0].parties.join(',') : 'none');
  t('  invokerScope ' + e.scope, r.invokerScope === e.scope, r.invokerScope);
  t('  memory atoms exact', r.memoryEffects.length === e.mem.length &&
    e.mem.every(a => r.memoryEffects.some(m => m.atom === a)),
    r.memoryEffects.map(m => m.atom).join(','));
  t('  NO canonical delta (memory never ceases a fact)', r.delta === null || r.delta === undefined);
  t('  cost ' + (e.cost || 'none'), (r.cost || null) === e.cost, String(r.cost));
  const p = win._fscPromptBlock();
  t('  prompt says EXACT', /READING: EXACT/.test(p));
  t('  prompt carries a REQUIRED aftermath beat', /AFTERMATH BEAT \u2014 REQUIRED/.test(p));
  t('  prompt forbids visible wish-energy', /visible wish-energy/.test(p));
  const outsideX = ['pc:lirael','named:seren','named:julian','role:first_sacrifice_presiding_dohkar']
    .filter(x => e.roster.indexOf(x) < 0);
  if (outsideX.length) t('  prompt names the NOT AFFECTED individually', /NOT AFFECTED/.test(p));
  t('  prompt names the outcome', p.indexOf(e.id) >= 0);
});

// ── Cross-cutting: the facts a memory outcome must NOT change ───────────────────────────────
console.log('\n=== cross-cutting invariants ===');
compile('Don’t bring that up.', {});
t('custody_unremembered leaves the entrustment GOVERNING', win._fscIsActive('answer.entrusted_to_julian'));
t('custody_unremembered leaves title GOVERNING', win._fscIsActive('answer.owned_by_institution'));
t('custody_unremembered leaves the authorization and its expiry intact',
  win._fscIsActive('answer.lirael_authorized_to_hold'));
compile('Who is he to question me?', {});
t('standing_dissolved leaves the historical claim standing', win._fscIsActive('auth.julian_claimed_convene_preside'));
t('standing_dissolved leaves the ENTRUSTMENT untouched (office-bound)', win._fscIsActive('answer.entrusted_to_julian'));
t('standing_dissolved voids only the current standing', win._fscIsActive('auth.julian_standing_to_convene') === false);
compile('I wish this had never happened to me.', {});
t('time_gives_way leaves the entrustment untouched', win._fscIsActive('answer.entrusted_to_julian'));
t('time_gives_way leaves the twist GOVERNING', win._fscIsActive('twist.wish_misaligned'));
t('time_gives_way ceases the handoff and its authorization',
  win._fscIsActive('answer.handed_to_lirael') === false &&
  win._fscIsActive('answer.lirael_authorized_to_hold') === false);
compile('Let me out of this.', {});
t('claim_unmade leaves Julian’s independent demand standing (row 4 still arrives)',
  win._fscIsActive('review.demanded_by_julian'));

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
