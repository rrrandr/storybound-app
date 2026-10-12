// Record an out-of-band author call in the real spend ledger.
// The A/B arms are dispatched outside _fs_live_sequence.mjs, so the runner never sees them and
// BUDGET.json would understate exposure. Receipts go to `receipted`; a reservation kept because
// no receipt came back goes to `unresolved` and is NEVER forgiven.
// Usage: SB_LEDGER_NOTE="..." SB_LEDGER_RECEIPTED=0.0 SB_LEDGER_UNRESOLVED=0.0 SB_LEDGER_RUN="..." node _ab_ledger_record.mjs
import fs from 'fs';
const P = '_fs_live_out/BUDGET.json';
const b = JSON.parse(fs.readFileSync(P, 'utf8'));
const rec = Number(process.env.SB_LEDGER_RECEIPTED || 0);
const unr = Number(process.env.SB_LEDGER_UNRESOLVED || 0);
const run = process.env.SB_LEDGER_RUN || 'out-of-band author call';
const note = process.env.SB_LEDGER_NOTE || '';
const before = b.receipted + b.unresolved;
b.receipted = Number((b.receipted + rec).toFixed(10));
b.unresolved = Number((b.unresolved + unr).toFixed(10));
(b.runs = b.runs || []).push({ run, receipted: rec, unresolved: unr, outstandingAtExit: 0, note });
fs.writeFileSync(P, JSON.stringify(b, null, 2));
console.log('before total $' + before.toFixed(7));
console.log('added    receipted $' + rec.toFixed(7) + '  unresolved $' + unr.toFixed(7));
console.log('after  receipted $' + b.receipted.toFixed(7) + '  unresolved $' + b.unresolved.toFixed(7)
  + '  total $' + (b.receipted + b.unresolved).toFixed(7));
