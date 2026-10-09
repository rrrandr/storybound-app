import fs from 'fs';
const F = '_fsc_all_outcomes_control.mjs';
let s = fs.readFileSync(F, 'utf8');
const up = (a, b) => { if (!s.includes(a)) throw new Error('MISSING: ' + a.slice(0,60)); s = s.split(a).join(b); };

// turning_forgotten now reaches everyone in the assembly.
up("    id: 'unm.the_turning_forgotten', ask: 'unseen', op: null,\n    roster: ASSEMBLY, mem: ['twist.assembly_turned'], cost: null, ceases: [], estab: [] },",
   "    id: 'unm.the_turning_forgotten', ask: 'unseen', op: null,\n    roster: PRESENT, mem: ['twist.assembly_turned'], cost: null, ceases: [], estab: [] },");

// Exact readings: merged identity, corrected rosters, new guests entry.
up(`  { wish: 'I wish the assembly would forget the wish twisted.',
    id: 'mem.exact.assembly_forgets_twist', roster: ASSEMBLY, scope: 'not_in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },
  { wish: 'I wish everyone here would forget the wish twisted.',
    id: 'mem.exact.all_present_forget_twist', roster: PRESENT, scope: 'in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },`,
`  { wish: 'I wish the assembly would forget the wish twisted.',
    id: 'mem.exact.assembly_forgets_twist', roster: PRESENT, scope: 'in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },
  { wish: 'I wish everyone here would forget the wish twisted.',
    id: 'mem.exact.assembly_forgets_twist', roster: PRESENT, scope: 'in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },
  { wish: 'I wish the guests would forget the wish twisted.',
    id: 'mem.exact.guests_forget_twist', roster: ASSEMBLY, scope: 'not_in_population',
    mem: ['twist.wish_misaligned','twist.intent_failed'], cost: null },`);

// The prompt now uses story labels, not refs. Assert by label.
up("  if (e.roster) t('  prompt lists the frozen roster', e.roster.every(m => p.indexOf(m) >= 0));",
   `  const LBL = { 'pc:lirael':'Lirael', 'named:seren':'Seren', 'named:julian':'Julian',
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
  t('  prompt carries a REQUIRED aftermath beat', /AFTERMATH BEAT \\u2014 REQUIRED/.test(p));
  t('  aftermath beat is non-empty authored text',
    !!(win.state._fscActiveCompiled.aftermathBeat && win.state._fscActiveCompiled.aftermathBeat.text.length > 40));
  t('  prompt forbids visible wish-energy', /visible wish-energy/.test(p));
  t('  prompt forbids an Answer verdict', /never delivers a verdict/.test(p));
  t('  prompt forbids extra cost and new canon',
    /no cost or penalty beyond/.test(p) && /no new canon fact/.test(p));`);

up("  t('  prompt says EXACT', /READING: EXACT/.test(p));",
   `  t('  prompt says EXACT', /READING: EXACT/.test(p));
  t('  prompt carries a REQUIRED aftermath beat', /AFTERMATH BEAT \\u2014 REQUIRED/.test(p));
  t('  prompt forbids visible wish-energy', /visible wish-energy/.test(p));
  const outsideX = ['pc:lirael','named:seren','named:julian','role:first_sacrifice_presiding_dohkar']
    .filter(x => e.roster.indexOf(x) < 0);
  if (outsideX.length) t('  prompt names the NOT AFFECTED individually', /NOT AFFECTED/.test(p));`);

fs.writeFileSync(F, s);
console.log('all-outcomes control updated');
