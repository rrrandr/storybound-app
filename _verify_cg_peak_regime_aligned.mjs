// Guard (Fable CG audit — A2-F3): the CG prompt carried a self-contradictory peak regime AND a stale
// cost claim. Klein/Kontext facial mutations were DISABLED 2026-05-22 (_renderBeatMutation early-returns
// klein_mutations_disabled), so "each peak fires a Klein mutation at $0.02" was false; and the last
// self-check the model reads told it to author only 1-2 peaks while the validator keeps 5 (flat-scene
// regression). Fix: align every peak claim to the validator's live behavior (keep strongest 5, spaced
// >=3, one family; peaks shape the emotional arc + vignette — no paid mutation).
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

const start = src.indexOf('function _buildCGScreenplaySystemPrompt()');
const end = src.indexOf('window._buildCGScreenplaySystemPrompt =', start);
const cg = start >= 0 ? src.slice(start, end > start ? end : start + 80000) : '';
A(!!cg, 'CG system prompt not found');

// (1) No stale Klein/cost framing anywhere in the CG prompt.
for (const bad of ['each peak fires a Klein', '$0.02', 'cost-cap', 'cost cap', 'fire small Kontext edits']) {
  A(!cg.includes(bad), `stale cost/Klein claim still present: "${bad}"`);
}

// (2) No stale 1-2 / 2-peak count claims.
for (const bad of ['caps at 2 peaks', 'mark 1–2 KEY', 'mark 1-2 KEY', 'exactly ONE non-neutral peak', 'otherwise 2).', 'demoted by the cost cap']) {
  A(!cg.includes(bad), `stale 1-2 peak claim still present: "${bad}"`);
}
A(!/MUST equal the number of peaks declared in expression_arc/.test(cg), 'self-check #1 still forces beats to match the 1-2 arc count');

// (3) The live 5-peak / validator framing is present and consistent.
A(cg.includes('SAFE TO AUTHOR 3-5 PEAKS PER SCENE'), 'author-3-5 guidance missing');
A(cg.includes('keeps the strongest-impact 5, spaced ≥3 beats apart'), 'validator keep-5/spacing framing missing');
A(cg.includes('Keep this to the 3-5 STRONGEST peaks'), 'self-check #1 not aligned to 3-5');
A(cg.includes('the validator keeps up to 5 non-neutral beats'), 'self-check #5 not aligned to 5');

// (4) Peaks are framed by what they actually drive now (arc + vignette), not paid mutations.
A(cg.includes('peak entries shape the expression_arc + the scene'), 'peak-purpose framing not updated to arc/vignette');

if (fail) process.exit(1);
console.log('PASS: CG peak regime aligned to the live validator (author 3-5, keep strongest 5 spaced >=3, one family); stale Klein $0.02 cost claim and 1-2 self-checks removed; peaks framed as emotional-arc + vignette drivers, not paid mutations.');
