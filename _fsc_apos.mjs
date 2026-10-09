import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const start = s.indexOf('// STAGE 3 — ISSUE 1 OPENING CONSEQUENCE COMPILER');
if (start < 0) throw new Error('compiler section not found');
let head = s.slice(0, start), tail = s.slice(start);
const before = (tail.match(/'\?/g) || []).length;
// A player's apostrophe may be straight or curly — iOS autocorrect produces U+2019.
// Matching only the straight form silently drops real submissions.
tail = tail.replace(/'\?/g, "['\\u2019]?");
const after = (tail.match(/\['\\u2019\]\?/g) || []).length;
fs.writeFileSync(F, head + tail);
console.log('apostrophe classes widened: ' + before + ' -> ' + after);
