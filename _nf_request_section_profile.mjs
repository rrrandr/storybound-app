// ══════════════════════════════════════════════════════════════════════════════════════════
// WHERE THE DELIVERED REQUEST'S CHARACTERS ACTUALLY ARE.
//
// The consolidation so far has been measured on _buildCharacterPlusShared alone (~68k of a
// ~367k continuation request). This profiles the captured request by its own ALL-CAPS section
// headings so the next batches are chosen by size and kind, not by which builder was already
// open. Each section is classified:
//
//   INSTRUCTION  — directive prose addressed to the author ("never", "must", "do not", tests,
//                  failure modes, exemplars). This is the material the consolidation targets.
//   CONTENT      — this story's own facts: bibles, rosters, appearance, lore, memory, history,
//                  the scene contract. NOT a reduction target however large.
//
// Reports sections largest-first with their classification and a repeat count, so a heading
// delivered twice in one request is visible.
//
// usage: node _nf_request_section_profile.mjs [capture.txt]
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';

const FILE = process.argv[2]
  || '/Users/romantsukerman/storybound-app/_nf_fresh_continuation_out/fresh_continuation_author__STRUCTURE_GENERATOR__1.txt';
const raw = fs.readFileSync(FILE, 'utf-8');

// A HEADING is a line that is predominantly capitals and reads as a section label. Narrow
// enough not to catch exemplar lines, wide enough to catch "X LAW:" / "Y (HARD):" forms.
const HEAD = /^[ \t]*([A-Z][A-Z0-9 ,.’'"()+/|—–:*\-]{13,}?)[:：]?\s*$/;

const lines = raw.split('\n');
const secs = [];
let cur = { head: '(preamble)', at: 1, chars: 0, body: [] };
lines.forEach((ln, i) => {
  const m = ln.match(HEAD);
  // Reject lines that are mostly punctuation rules or exemplar bullets.
  const looksHead = m && /[A-Z]{3}/.test(m[1]) && !/^[-=·✓✗ ]+$/.test(m[1]);
  if (looksHead) { secs.push(cur); cur = { head: m[1].trim(), at: i + 1, chars: 0, body: [] }; }
  else { cur.chars += ln.length + 1; cur.body.push(ln); }
});
secs.push(cur);

// CLASSIFY. Directive density decides: instruction prose is dense in modal verbs, bans,
// tests and worked exemplars; this story's own facts are dense in field names and values.
const INSTR = /\b(never|must|do not|don't|forbidden|required|mandatory|avoid|rewrite|failure|test|hard ban|✗|✓|instead of|not because)\b/gi;
const FACT = /^\s*[-•·]?\s*"?[a-z_]{3,30}"?\s*[:=]\s*\S/;
for (const s of secs) {
  const text = s.body.join('\n');
  const instr = (text.match(INSTR) || []).length;
  const factLines = s.body.filter((l) => FACT.test(l)).length;
  const per1k = s.chars ? (instr / (s.chars / 1000)) : 0;
  s.instr = instr; s.per1k = per1k;
  s.kind = (per1k >= 3 && instr >= 4) ? 'INSTRUCTION'
    : (factLines > s.body.length * 0.25) ? 'CONTENT'
    : (per1k >= 1.5 ? 'INSTRUCTION' : 'CONTENT');
}

const repeats = {};
secs.forEach((s) => { repeats[s.head] = (repeats[s.head] || 0) + 1; });

const total = secs.reduce((a, s) => a + s.chars, 0);
const byKind = { INSTRUCTION: 0, CONTENT: 0 };
secs.forEach((s) => { byKind[s.kind] += s.chars; });

const P = console.log;
P('REQUEST SECTION PROFILE');
P('  file   : ' + FILE.split('/').pop());
P('  chars  : ' + total.toLocaleString() + ' in ' + secs.length + ' sections');
P('  INSTRUCTION : ' + byKind.INSTRUCTION.toLocaleString()
  + ' (' + (100 * byKind.INSTRUCTION / total).toFixed(1) + '%)');
P('  CONTENT     : ' + byKind.CONTENT.toLocaleString()
  + ' (' + (100 * byKind.CONTENT / total).toFixed(1) + '%)');

P('\nLARGEST INSTRUCTION SECTIONS (the consolidation surface):');
secs.filter((s) => s.kind === 'INSTRUCTION').sort((a, b) => b.chars - a.chars).slice(0, 28)
  .forEach((s) => P(`  ${String(s.chars).padStart(7)}  L${String(s.at).padStart(5)}`
    + `  x${repeats[s.head]}  ${(s.per1k).toFixed(1)}/k  ${s.head.slice(0, 68)}`));

P('\nLARGEST CONTENT SECTIONS (preserved, not reduction targets):');
secs.filter((s) => s.kind === 'CONTENT').sort((a, b) => b.chars - a.chars).slice(0, 12)
  .forEach((s) => P(`  ${String(s.chars).padStart(7)}  L${String(s.at).padStart(5)}`
    + `  x${repeats[s.head]}  ${s.head.slice(0, 68)}`));

// ── SCENE-1-SCOPED INSTRUCTION INSIDE A CONTINUATION REQUEST ──
// app.js:333060 already strips ONE Scene-1-only block from continuation prompts
// (_ARCH_LAWS_SCENE1_STRIP, added 2026-08-15) for exactly this reason: state.sysPrompt is
// assembled once at story start, so every later scene re-reads laws written for the opening.
// This counts what else in that class is still being delivered, by heading scope alone.
if (/continuation/i.test(FILE)) {
  const s1 = secs.filter((s) => /\bSCENE 1\b|\bSCENE ONE\b|\bOPENING CONTRACT\b/.test(s.head));
  const bytes = s1.reduce((a, s) => a + s.chars, 0);
  P('\nSECTIONS SCOPED TO SCENE 1, DELIVERED IN THIS CONTINUATION REQUEST:');
  P('  ' + bytes.toLocaleString() + ' chars in ' + s1.length + ' sections ('
    + (100 * bytes / total).toFixed(1) + '% of the request)');
  s1.sort((a, b) => b.chars - a.chars).forEach((s) =>
    P(`  ${String(s.chars).padStart(7)}  L${String(s.at).padStart(5)}  ${s.head.slice(0, 72)}`));
  P('  NOT a reduction claim: whether each belongs on a continuation is an editorial call.');
}

const dup = Object.entries(repeats).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1]);
P('\nHEADINGS DELIVERED MORE THAN ONCE IN THIS ONE REQUEST: ' + dup.length);
dup.slice(0, 30).forEach(([k, v]) => {
  const bytes = secs.filter((s) => s.head === k).reduce((a, s) => a + s.chars, 0);
  P(`  x${v}  ${String(bytes).padStart(7)} chars total  ${k.slice(0, 72)}`);
});
