import fs from 'fs';
const upd = (f, pairs) => {
  let s = fs.readFileSync(f, 'utf8');
  pairs.forEach(([a, b]) => {
    if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0, 60));
    s = s.split(a).join(b);
  });
  fs.writeFileSync(f, s);
};

// ── slice-1 control: assembly now means everyone; the two readings deduplicated. ───────────
upd('_fsc_slice1_control.mjs', [
  ["t('exact-reading table has 5 approved entries', win._FSC_EXACT.length === 5,\n  'got ' + win._FSC_EXACT.length);",
   "t('exact-reading table has 5 entries (all_present merged into assembly; guests added)',\n  win._FSC_EXACT.length === 5, 'got ' + win._FSC_EXACT.length);"],

  ["t('assembly is the crowd alone', asm.roster.length === 1 && asm.roster[0] === 'the_assembly');\nt('assembly EXCLUDES pc:lirael', asm.roster.indexOf('pc:lirael') < 0);\nt('assembly EXCLUDES the three other named',\n  ['named:seren','named:julian','role:first_sacrifice_presiding_dohkar']\n    .every(r => asm.roster.indexOf(r) < 0));",
   "// CORRECTED 2026-09-29: \"the assembly\" means EVERY PERSON IN IT. The crowd-only reading was\n// ours, not the player's, and is withdrawn. No named person is spared; no invoker exemption.\nt('assembly INCLUDES every person in it', asm.roster.length === 5);\nt('assembly INCLUDES pc:lirael', asm.roster.indexOf('pc:lirael') >= 0);\nt('assembly INCLUDES the three other named',\n  ['named:seren','named:julian','role:first_sacrifice_presiding_dohkar']\n    .every(r => asm.roster.indexOf(r) >= 0));\nconst gst = win._fscExpandPopulation('population.guests');\nt('crowd-only survives ONLY behind its own wording', gst.roster.length === 1 && gst.roster[0] === 'the_assembly');"],

  ["t('exact: population is the crowd only', exA.population.populationId === 'population.assembly');\nt('exact: invokerScope not_in_population', exA.invokerScope === 'not_in_population', exA.invokerScope);\nt('exact: Lirael NOT in the affected parties',\n  exA.memoryEffects.every(m => m.parties.indexOf('pc:lirael') < 0));",
   "t('exact: population is the assembly', exA.population.populationId === 'population.assembly');\nt('exact: invokerScope IS in_population', exA.invokerScope === 'in_population', exA.invokerScope);\nt('exact: Lirael IS among the affected parties \\u2014 no named person spared',\n  exA.memoryEffects.every(m => m.parties.indexOf('pc:lirael') >= 0));"],

  ["const exB = win._fscCompile('I wish everyone here would forget the wish twisted.');\nt('exact: \"everyone here\" selects all_present', exB.outcomeId === 'mem.exact.all_present_forget_twist', exB.outcomeId);\nt('exact: all_present INCLUDES Lirael', exB.invokerScope === 'in_population', exB.invokerScope);\nt('exact: the two readings are NOT co-extensive',\n  exA.memoryEffects[0].parties.length !== exB.memoryEffects[0].parties.length);",
   "const exB = win._fscCompile('I wish everyone here would forget the wish twisted.');\nt('DEDUPLICATED: \"everyone here\" reaches the SAME outcome as \"the assembly\"',\n  exB.outcomeId === exA.outcomeId, exB.outcomeId);\nt('two wordings, one thing that happens',\n  exB.memoryEffects[0].parties.length === exA.memoryEffects[0].parties.length);\nconst exG = win._fscCompile('I wish the guests would forget the wish twisted.');\nt('\"the guests\" reaches the crowd-only reading', exG.outcomeId === 'mem.exact.guests_forget_twist', exG.outcomeId);\nt('guests reading spares the four named', exG.memoryEffects[0].parties.length === 1);"],

  ["t('unseen -> the_turning_forgotten', turn.outcomeId === 'unm.the_turning_forgotten', turn.outcomeId);",
   "t('unseen -> the_turning_forgotten', turn.outcomeId === 'unm.the_turning_forgotten', turn.outcomeId);\nt('turning_forgotten now reaches everyone in the assembly', turn.population.roster.length === 5);\nt('turning_forgotten does NOT spare Lirael', turn.invokerScope === 'in_population', turn.invokerScope);"],

  ["t('exact prompt names Lirael as in_population', /in_population/.test(block2));\nt('exact prompt spells out that she receives the same effect',\n  /receives the same effect as every other member/.test(block2));",
   "t('exact prompt states LIRAEL IS AFFECTED', /LIRAEL IS AFFECTED/.test(block2));\nt('exact prompt forbids sparing her', /Do NOT spare her/.test(block2));"],

  ["t('exact prompt lists the sealed roster', /AFFECTED \\(sealed roster/.test(block2));",
   "t('exact prompt lists the sealed roster', /AFFECTED \\u2014 exactly these people/.test(block2));"],

  ["t('prompt carries the canon change', /CANON CHANGE \\(historical_replacement\\)/.test(block));",
   "t('prompt carries the canon change', /CANON CHANGE \\(historical_replacement\\)/.test(block));\nt('prompt carries an AFTERMATH BEAT', /AFTERMATH BEAT \\u2014 REQUIRED/.test(block));\nt('prompt forbids visible wish-energy', /NO aura, glow, luminous cloth, shimmer, visible wish-energy/.test(block));\nt('prompt forbids a verdict from the Answer', /never delivers a verdict/.test(block));\nt('prompt states MUST REMAIN TRUE', /MUST REMAIN TRUE/.test(block));"],

  ["t('prompt closes the door on unlisted effects', /Everything not listed above is UNCHANGED/.test(block));",
   "t('prompt closes the door on unlisted effects', /every fact and every party not listed above is UNCHANGED/.test(block));"]
]);
console.log('slice-1 control updated for the corrected semantics');
