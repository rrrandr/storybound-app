import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const a = s.indexOf("    // AFTERMATH BEAT — required for BOTH cards.");
const b = s.indexOf("this world has none.');", a);
if (a < 0 || b < 0) throw new Error('GENERIC BLOCK NOT FOUND');
const end = s.indexOf('\n', b) + 1;
const NEW = `    // PETITION: the compiled consequence carrier, NOT a generic instruction.
    // WITHDRAWN 2026-09-29: a generic "show the affected reacting" line cannot satisfy the
    // aftermath requirement, because with no sealed roster and no authored reaction it hands the
    // model the decision about WHO CHANGED — the exact defect the Tempt boundary removed. The
    // carrier compiles the verdict into structured facts first; the author renders them.
    try {
      if (!isTempt && typeof _fpcPromptBlock === 'function') {
        var _fpcBlock = _fpcPromptBlock();
        if (_fpcBlock) {
          lines.push(_fpcBlock);
        } else {
          // No compiled petition consequence. Say so rather than substituting a generic
          // obligation that would look satisfied while leaving the author in charge.
          lines.push('- AFTERMATH: no compiled consequence is available for this petition. Do NOT '
            + 'invent who was affected, what changed, or how anyone reacts. Deliver the verdict above '
            + 'and assert no consequence beyond it.');
        }
      }
    } catch (_fpcErr) { console.warn('[FPC] petition prompt block threw:', _fpcErr && _fpcErr.message); }
`;
s = s.slice(0, a) + NEW + s.slice(end);
fs.writeFileSync(F, s);
console.log('generic Petition obligation replaced by the compiled carrier');
