import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');

const pStart = s.indexOf('  function _fscPromptBlock() {');
const pEnd = s.indexOf('  // ── choice_pending gate');
if (pStart < 0 || pEnd < 0) throw new Error('PROMPT BLOCK BOUNDS NOT FOUND');

const NEW = `  // ── SHARED EFFECT-BOUNDARY RENDERER. Tempt and Petition both render through this one
  //    function, so the two cards cannot drift apart and a fix to one reaches the other.
  function _fscRenderBoundary(rec, opts) {
    if (!rec || rec.error) return '';
    var o = opts || {};
    var L = [];
    var roster = rec.population ? rec.population.roster : [];
    L.push('\\nPRESELECTED CONSEQUENCE \\u2014 EFFECT BOUNDARY'
      + (o.cardLabel ? ' (' + o.cardLabel + ')' : '')
      + ' (compiled at acceptance; render it, do not infer or extend):');
    L.push('- ' + (o.readingLine || (rec.mode === 'exact_reading'
      ? 'READING: EXACT \\u2014 the player anchored both a fact and a scope. Deliver exactly this.'
      : 'READING: FATE-CHOSEN \\u2014 the wording anchored nothing; Fate selected this interpretation.')));
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
      rec.memoryEffects.forEach(function (m) { L.push('    \\u2022 ' + m.disposition + ': ' + m.atom); });
    }
    if (rec.changed && rec.changed.length) {
      L.push('- EFFECT LIMITED TO:');
      rec.changed.forEach(function (c) { L.push('    \\u2022 ' + c.text); });
    } else if (rec.changed && rec.changed.length === 0 && !rec.delta && !(rec.memoryEffects || []).length) {
      L.push('- EFFECT LIMITED TO: nothing changes. The ask does not land.');
    }
    if (rec.delta) {
      L.push('- CANON CHANGE (' + rec.delta.temporalOperation + '):');
      rec.delta.ceases.forEach(function (a) { L.push('    CEASES: ' + a); });
      rec.delta.establishes.forEach(function (e) { L.push('    NOW TRUE: ' + e.text); });
      if (rec.delta.priorHistoryReplaced) L.push('    HISTORY: ' + rec.delta.priorHistoryReplaced);
    }

    L.push('- MUST REMAIN TRUE: ' + (rec.unchangedNote
      || 'every fact and every party not listed above is UNCHANGED.'));
    if (!rec.unchangedNote && (rec.mode !== 'exact_reading' || (rec.memoryEffects || []).length)) {
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
  window._fscRenderBoundary = _fscRenderBoundary;

  function _fscPromptBlock() {
    var st = window.state; var rec = st && st._fscActiveCompiled;
    if (!rec || rec.error) return '';
    return _fscRenderBoundary(rec, { cardLabel: 'TEMPT FATE' });
  }

`;
s = s.slice(0, pStart) + NEW + s.slice(pEnd);
fs.writeFileSync(F, s);
console.log('shared boundary renderer factored out; Tempt routes through it');
