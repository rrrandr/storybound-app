// FREE static enumeration: every site that REASSIGNS the scene-prose variable.
// Static scan = candidate list, not proof of delivery. Each row must still be
// confirmed at runtime via __rawSnap / __textSnap.
import fs from 'fs';
const src = fs.readFileSync('public/app.js','utf8');

const VARS = ['text','raw','prose','out','_currentText','_regenText','finalText','scene'];
const rx = new RegExp(String.raw`\b(${VARS.join('|')})\s*=\s*(await\s+)?([A-Za-z_$][\w$.]*)\s*\(`,'g');

const LLM = /_cheapLineEdit|_targetedSceneEdit|_proseLineEdit|_grokLineEdit|_cascadeLineEdit|_repairViaMistral|callChat|_surg|chatCompletion/;
const bodyOf = (name) => {
  const i = src.indexOf('function '+name); if (i < 0) return '';
  let d=0,k=src.indexOf('{',i);
  for (; k<src.length; k++){ if(src[k]==='{')d++; else if(src[k]==='}'){d--; if(!d) return src.slice(i,k+1);} }
  return '';
};

const owners = new Map();
let m;
while ((m = rx.exec(src))) {
  const fn = m[3];
  if (/^(String|Number|Boolean|Array|Object|JSON|Math|parseInt|parseFloat)$/.test(fn)) continue;
  if (!owners.has(fn)) owners.set(fn, { fn, sites: 0, vars: new Set() });
  const o = owners.get(fn); o.sites++; o.vars.add(m[1]);
}

const rows = [...owners.values()].map(o => {
  const b = bodyOf(o.fn.replace(/^window\./,''));
  // instrumented? a snap push naming this fn anywhere in the file
  const instrumented = new RegExp(`label:\\s*'${o.fn.replace(/^window\./,'').replace(/[$]/g,'\\$')}'`).test(src)
                    || new RegExp(`label:\\s*'window\\.${o.fn.replace(/^window\./,'')}'`).test(src);
  const isLLM = LLM.test(b) || /await\s+_/.test(b) && /Instruction|instr|prompt/i.test(b);
  const hasDetector = /_detect[A-Z]|_scan[A-Z]|_audit[A-Z]|gap\b|fails\b|hits\.length/.test(b);
  const hasKill = /window\._\w+\s*(!==|===)\s*(false|true)/.test(b);
  return { ...o, len: b.length, instrumented, isLLM, hasDetector, hasKill };
}).filter(r => r.len > 0).sort((a,b) => (b.isLLM - a.isLLM) || (b.len - a.len));

console.log('\n' + 'OWNER'.padEnd(34) + 'SITES  LLM  DETECT  SNAP  KILL   size');
console.log('─'.repeat(78));
for (const r of rows)
  console.log(r.fn.slice(0,33).padEnd(34) + String(r.sites).padEnd(7) +
    (r.isLLM?' ✓ ':' · ').padEnd(5) + (r.hasDetector?' ✓ ':' · ').padEnd(8) +
    (r.instrumented?' ✓ ':' · ').padEnd(6) + (r.hasKill?' ✓ ':' · ').padEnd(7) + r.len);
const llm = rows.filter(r=>r.isLLM);
console.log('\n' + rows.length + ' prose-mutating owners · ' + llm.length + ' make model calls · ' +
  llm.filter(r=>!r.instrumented).length + ' MODEL PASSES WITH NO SNAP RECORD · ' +
  llm.filter(r=>!r.hasKill).length + ' model passes with NO kill switch');
