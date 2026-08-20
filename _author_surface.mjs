// "Where can MODEL OUTPUT become reader-visible text?" — not "what functions edit prose?"
// A whole-scene regeneration is a TRANSFER OF AUTHORSHIP, not a large mutation.
import fs from 'fs';
const src = fs.readFileSync('public/app.js','utf8');
const GEN = /(_grokLiteraryAuthor|callChat|callOneProvider|_ffGrokJSON|_cheapLineEdit|_targetedSceneEdit|_proseLineEdit|_grokLineEdit|_repairViaMistral|_authorChatCapture)/;
const PROSE = /^(raw|text|scene|content|prose|out|_currentText|_regenText|finalText|_scaffold|_reauthored|_regen\w*|_surg\w*|_clr)$/;

const lines = src.split('\n');
const gen = new Map();               // variable  -> line index where it received model output
lines.forEach((l, i) => {
  const m = l.match(/\b(?:var\s+|let\s+|const\s+)?([A-Za-z_$][\w$]*)\s*=\s*(?:String\()?\s*\(?\s*await\s+([A-Za-z_$][\w$.]*)/);
  if (m && GEN.test(m[2])) gen.set(m[1], { line: i + 1, via: m[2] });
});

const findings = [];
lines.forEach((l, i) => {
  const m = l.match(/\b(raw|text|scene|content|prose)\s*=\s*([A-Za-z_$][\w$]*)\s*;/);
  if (!m) return;
  const g = gen.get(m[2]);
  if (g) findings.push({ target: m[1], from: m[2], via: g.via, assignedAt: i + 1, generatedAt: g.line });
});

console.log('MODEL OUTPUT → READER-BOUND PROSE\n');
console.log('  target   <- variable            via                        gen@   assign@');
for (const f of findings)
  console.log(`  ${f.target.padEnd(8)} <- ${f.from.padEnd(18)} ${f.via.padEnd(26)} ${String(f.generatedAt).padEnd(6)} ${f.assignedAt}`);
console.log(`\n  ${findings.length} authorship-transfer site(s).`);
const names = [...new Set(findings.map(f => f.from))];
console.log('  variables that carry a whole generated scene:', names.join(', ') || '(none)');
