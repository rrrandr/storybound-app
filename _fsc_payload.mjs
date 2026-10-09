import fs from 'fs';
const F = 'public/app.js';
const sub = (a, b) => {
  let s = fs.readFileSync(F, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70));
  if (s.split(a).length > 2) throw new Error('NOT UNIQUE: ' + a.slice(0, 70));
  fs.writeFileSync(F, s.replace(a, b));
};

// ── 1. Carry aftermathBeat onto the compiled record (exact readings). ──────────────────────
sub("      rec.cost = ex.cost || null;\n      rec.durability = 'persists';\n      return rec;",
    "      rec.cost = ex.cost || null;\n      rec.durability = 'persists';\n" +
    "      rec.aftermathBeat = ex.aftermathBeat || null;\n" +
    "      rec.notAffected = _fscNotAffected(roster);\n" +
    "      return rec;");

// ── 2. Carry it on the Fate-chosen path. ───────────────────────────────────────────────────
sub("    if (o.opensChoicePending) rec.opensChoicePending = true;\n    return rec;",
    "    if (o.opensChoicePending) rec.opensChoicePending = true;\n" +
    "    rec.aftermathBeat = o.aftermathBeat || null;\n" +
    "    rec.notAffected = _fscNotAffected(rec.population ? rec.population.roster : []);\n" +
    "    return rec;");

// ── 3. NOT AFFECTED is compiler-derived: every scene-present party outside the frozen roster.
sub("  function _fscInvokerScope(sealed, namedSubset) {",
`  // Every named scene-present party OUTSIDE the frozen roster, named individually. Derived from
  // the sealed data — never hand-written per outcome, so it cannot drift from the roster.
  // The live run failed because the payload named only the roster and left the author to infer
  // who was outside it. It no longer has to infer.
  var FSC_SCENE_PRESENT_NAMED = ['pc:lirael', 'named:seren', 'named:julian',
                                 'role:first_sacrifice_presiding_dohkar'];
  var FSC_STORY_LABEL = {
    'pc:lirael': 'Lirael', 'named:seren': 'Seren', 'named:julian': 'Julian',
    'role:first_sacrifice_presiding_dohkar': 'the presiding Dohkar',
    'the_assembly': 'the assembled First Favored \\u2014 family, guests and onlookers'
  };
  function _fscLabel(ref) { return FSC_STORY_LABEL[ref] || ref; }
  function _fscNotAffected(roster) {
    var r = roster || [];
    return FSC_SCENE_PRESENT_NAMED.filter(function (p) { return r.indexOf(p) < 0; });
  }
  function _fscInvokerScope(sealed, namedSubset) {`);

// ── 4. The writer-facing EFFECT BOUNDARY replaces the old prompt block. ────────────────────
let s = fs.readFileSync(F, 'utf8');
const pStart = s.indexOf('  function _fscPromptBlock() {');
const pEnd = s.indexOf('  // ── choice_pending gate');
if (pStart < 0 || pEnd < 0) throw new Error('PROMPT BLOCK BOUNDS NOT FOUND');
const NEW = `  function _fscPromptBlock() {
    var st = window.state; var rec = st && st._fscActiveCompiled;
    if (!rec || rec.error) return '';
    var L = [];
    var roster = rec.population ? rec.population.roster : [];
    L.push('\\nPRESELECTED CONSEQUENCE \\u2014 EFFECT BOUNDARY (compiled at acceptance; render it, do not infer or extend):');
    L.push('- READING: ' + (rec.mode === 'exact_reading'
      ? 'EXACT \\u2014 the player anchored both a fact and a scope. Deliver exactly this.'
      : 'FATE-CHOSEN \\u2014 the wording anchored nothing; Fate selected this interpretation.'));
    L.push('- OUTCOME: ' + rec.outcomeId);

    if (roster.length) {
      L.push('- AFFECTED \\u2014 exactly these people receive the effect, all of them:');
      roster.forEach(function (p) { L.push('    \\u2022 ' + _fscLabel(p)); });
      if (rec.invokerScope === 'in_population') {
        L.push('    LIRAEL IS AFFECTED. She is inside the named population and receives the same effect as');
        L.push('    everyone else. Do NOT spare her, and do NOT have her notice what the others lost.');
      }
    }
    var na = rec.notAffected || [];
    if (na.length) {
      L.push('- NOT AFFECTED \\u2014 these present people are OUTSIDE the effect and keep everything:');
      na.forEach(function (p) { L.push('    \\u2022 ' + _fscLabel(p)); });
    } else if (roster.length) {
      L.push('- NOT AFFECTED: no one present is outside this effect.');
    }

    if (rec.memoryEffects && rec.memoryEffects.length) {
      L.push('- EFFECT LIMITED TO:');
      rec.memoryEffects.forEach(function (m) {
        L.push('    \\u2022 ' + m.disposition + ': ' + m.atom);
      });
    }
    if (rec.delta) {
      L.push('- CANON CHANGE (' + rec.delta.temporalOperation + '):');
      rec.delta.ceases.forEach(function (a) { L.push('    CEASES: ' + a); });
      rec.delta.establishes.forEach(function (e) { L.push('    NOW TRUE: ' + e.text); });
      if (rec.delta.priorHistoryReplaced) L.push('    HISTORY: ' + rec.delta.priorHistoryReplaced);
    }

    L.push('- MUST REMAIN TRUE: every fact and every party not listed above is UNCHANGED.');
    if (rec.mode !== 'exact_reading' || rec.memoryEffects.length) {
      L.push('    The twist and the loose note remain known exactly as sealed unless listed above.');
    }
    L.push('- COST: ' + (rec.cost ? rec.cost : 'none \\u2014 do not invent one'));

    if (rec.aftermathBeat) {
      L.push('- AFTERMATH BEAT \\u2014 REQUIRED. The consequence must LAND IN THE ROOM. Show the affected');
      L.push('  people reacting in-fiction. They feel the new reality; they cannot explain it.');
      L.push('    ' + rec.aftermathBeat.text);
      L.push('  Scope it to the AFFECTED list only. Never spare an affected named person; never give');
      L.push('  the reaction to someone on the NOT AFFECTED list.');
    }

    L.push('- FORBIDDEN INVENTIONS:');
    L.push('    \\u2022 no cost or penalty beyond the one named above');
    L.push('    \\u2022 no new canon fact, standing, rule or relationship');
    L.push('    \\u2022 NO aura, glow, luminous cloth, shimmer, visible wish-energy or magical residue \\u2014');
    L.push('      this world has none and a rite leaves nothing to see');
    L.push('    \\u2022 the Answer never delivers a verdict about what is factually true, who is guilty,');
    L.push('      or what caused the twist; it responds only to its holder\\u2019s present alignment');
    L.push('    \\u2022 do not explain the mechanism, the wish, or that anything was altered');
    if (rec.opensChoicePending) {
      L.push('- END ON THE CHOICE. The scene reaches Lirael\\u2019s renewed decision and STOPS there.');
      L.push('  Author nothing past it and imply nothing about which way she goes.');
    }
    return L.join('\\n') + '\\n';
  }

`;
s = s.slice(0, pStart) + NEW + s.slice(pEnd);
fs.writeFileSync(F, s);
console.log('effect boundary payload written');
