import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
const BLOCK = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/79822a26-4953-4e0a-b337-9520e623604d/scratchpad/coverage_block.md';
let s = fs.readFileSync(F, 'utf8');
const anchor = '---\n\n# Part 1 — The agency difference, in two wishes';
if (!s.includes(anchor)) throw new Error('ANCHOR MISSING');
s = s.split(anchor).join(fs.readFileSync(BLOCK, 'utf8').trimEnd());
fs.writeFileSync(F, s);
console.log('coverage status block spliced into the handoff sheet');
