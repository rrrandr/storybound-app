import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const a = "    } catch (_fscPErr) { console.warn('[FSC] prompt block threw:', _fscPErr && _fscPErr.message); }";
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
const b = a + `
    // AFTERMATH BEAT — required for BOTH cards. A Fate consequence must land in the room, not
    // only in hidden state. Tempt gets an authored beat from its compiled outcome (above);
    // Petition has no compiled outcome table, so the obligation is stated generically here.
    // It is a RENDERING obligation: no new canon, no cost, no mechanism talk.
    lines.push('- AFTERMATH BEAT (REQUIRED): the people actually affected must VISIBLY react in-fiction. '
      + 'Show a specific observable response from each affected named party present, and a collective '
      + 'response from an affected group — confusion, a broken-off thought, déjà vu, an emotion detached '
      + 'from its lost reason, a changed social reflex, an interrupted accusation. Someone may keep the '
      + 'anger or the urge to accuse while being unable to name why. '
      + 'They FEEL the new reality; they never explain it. '
      + 'Do NOT give the reaction to anyone the change did not reach. '
      + 'Do NOT add a cost, a new durable fact, or any aura, glow, shimmer or visible wish-energy — '
      + 'this world has none.');`;
fs.writeFileSync(F, s.replace(a, b));
console.log('Petition + Tempt aftermath obligation added to the shared Fate weave');
