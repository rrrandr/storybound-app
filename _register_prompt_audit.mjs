// WHERE DOES THE CHOPPINESS COME FROM? Inspect the ACTUAL OUTGOING author request. $0, no provider.
import fs from 'fs';
const req = JSON.parse(fs.readFileSync('_fs_live_out/run_2026-10-06T16-50-01-923Z/wire/050_req.json','utf8'));
const msgs = req.messages || [];
const all = msgs.map(m => String(m.content||'')).join('\n');
const lines = all.split('\n');
const PAT = [
  ['ONE SENTENCE / SINGLE SENTENCE', /\b(one|a single|1)\s+sentence\b/i],
  ['SENTENCE CAP / MAX SENTENCES',   /\b(max|maximum|no more than|at most|limit)\b[^.\n]{0,40}\bsentence/i],
  ['WORD CAP ON A BEAT',             /\bbeat\b[^.\n]{0,60}\b(\d{1,3})\s*(words|word)\b/i],
  ['ONE LINE PER',                   /\bone\s+line\s+per\b/i],
  ['SHORT / TERSE / CLIPPED',        /\b(keep it (short|terse)|terse|clipped|staccato|economical)\b/i],
  ['SCREENPLAY SHORTHAND',           /\bscreenplay\b/i],
  ['PER-BEAT LENGTH IN SCHEMA',      /"(text|line|beat)"\s*:\s*"<[^>]{0,160}(sentence|short|brief|one)[^>]{0,160}>/i]
];
console.log('=== INSTRUCTIONS IN THE OUTGOING SCENE-6 REQUEST THAT PUSH TOWARD SHORT BEATS ===');
console.log('    (request is ' + all.length + ' chars across ' + msgs.length + ' messages)\n');
const seen = new Set();
for (const [label, rx] of PAT) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l || l.length > 400 || !rx.test(l)) continue;
    const k = l.slice(0, 70); if (seen.has(k)) continue; seen.add(k);
    hits.push(l.replace(/\s+/g,' '));
  }
  if (!hits.length) { console.log('[' + label + '] — none'); continue; }
  console.log('[' + label + '] ' + hits.length + ' hit(s)');
  hits.slice(0, 4).forEach(h => console.log('   • ' + h.slice(0, 290)));
  console.log('');
}
