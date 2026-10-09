import fs from 'fs';
const F = 'public/app.js';
const sub = (a, b) => {
  let s = fs.readFileSync(F, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70));
  if (s.split(a).length > 2) throw new Error('ANCHOR NOT UNIQUE: ' + a.slice(0, 70));
  fs.writeFileSync(F, s.replace(a, b));
};

// ── 1. COMPILE AT ACCEPTANCE, before prose. Same seal point, seal order, synchronous. ──
sub(
  '          try {\n' +
  '            if (typeof _recordTemptFateEvent === \'function\') {\n' +
  '              var _tfLedgerEntry = _recordTemptFateEvent(wishText);',
  '          // ── STAGE 3 OPENING COMPILER: compile the consequence HERE, at acceptance, before any\n' +
  '          // prose is generated. The author must read preselected facts, never a raw wish it could\n' +
  '          // interpret for itself. Persisted synchronously; a throw is contained and logged, and\n' +
  '          // leaves no compiled consequence rather than a half-written one.\n' +
  '          try {\n' +
  '            if (typeof _fscCompileAndPersist === \'function\') _fscCompileAndPersist(wishText, { source: \'tempt_seal\' });\n' +
  '          } catch (_fscErr) { console.warn(\'[FSC] compile-at-seal threw:\', _fscErr && _fscErr.message); }\n' +
  '          try {\n' +
  '            if (typeof _recordTemptFateEvent === \'function\') {\n' +
  '              var _tfLedgerEntry = _recordTemptFateEvent(wishText);');

// ── 2. PROMPT CONSUMPTION: the compiled consequence goes to the author. ──
sub(
  "    lines.push('- ' + amplitude);",
  "    lines.push('- ' + amplitude);\n" +
  "    // STAGE 3: a compiled consequence REPLACES the author's latitude to interpret the wish.\n" +
  "    // When one exists, the directive carries preselected facts and the scene renders them.\n" +
  "    try {\n" +
  "      if (isTempt && typeof _fscPromptBlock === 'function') {\n" +
  "        var _fscBlock = _fscPromptBlock();\n" +
  "        if (_fscBlock) lines.push(_fscBlock);\n" +
  "      }\n" +
  "    } catch (_fscPErr) { console.warn('[FSC] prompt block threw:', _fscPErr && _fscPErr.message); }");

console.log('wired: compile-at-acceptance + prompt consumption');
