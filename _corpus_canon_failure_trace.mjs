// WHY DID NOTHING REACH CANON IN TEN SCENES? Provider-free, $0. Reads saved artifacts only.
//
// THE OBSERVATION. The full FS issue generated nine scenes and every one of them sealed a
// state_change proposal, received a verdict, and ended with `delivery: null,
// reason: "incomplete_rendering"`. facts 0, activated 0, for the whole issue.
//
// WHAT THIS TRACE SETTLES, and deliberately nothing more:
//   1. the projection against the FULL author response — is the captured prose a complete scene,
//      an excerpt, or something else?
//   2. the RAW verifier reply against the PARSED verdict — did the model return null, omit the
//      field, answer in an unexpected shape, or did our own parsing/downgrading produce the null?
//      A reason string cannot settle that; only the raw body can.
//   3. what the NEXT planner actually received — zero committed facts proves the ledger got
//      nothing, NOT that the planner was told nothing.
import fs from 'fs';

const RUN = process.argv[2]
  || '_fs_issue_corpus_out/run_2026-10-02T22-42-28-298Z';
const S = RUN + '/scenes';
if (!fs.existsSync(S)) { console.error('REFUSED: no scenes dir at ' + S); process.exit(2); }

const body = (f) => {
  const raw = fs.readFileSync(S + '/' + f, 'utf8');
  let j = null; try { j = JSON.parse(raw); } catch (_) { return { raw, content: raw, usage: null }; }
  const content = j.content
    || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  return { raw, content: String(content), usage: j.usage || null, parsed: j };
};
const scenes = fs.readdirSync(S).filter(f => /^s\d+_author\.json$/.test(f))
  .map(f => Number(f.match(/^s(\d+)_/)[1])).sort((a, b) => a - b);

console.log('=== CANON-LOOP FAILURE TRACE (provider-free, $0) ===');
console.log('run: ' + RUN + '\n');

// ── 1. THE PROJECTION AGAINST THE FULL AUTHOR RESPONSE ──────────────────────
console.log('1. IS THE CAPTURED PROSE THE WHOLE SCENE?');
console.log('   scene | author chars | projection | ratio | author shape');
const shapes = [];
for (const n of scenes) {
  const a = body('s' + n + '_author.json');
  const projFile = S + '/scene_' + String(n).padStart(2, '0') + '_prose.txt';
  const proj = fs.existsSync(projFile) ? fs.readFileSync(projFile, 'utf8') : '';
  // What shape did the author answer in? A CG screenplay reply is JSON with beats; a literary one
  // is prose. Knowing which decides whether a short projection is a truncation or a rendering.
  let shape = 'prose';
  let beats = null;
  try {
    const t = a.content.trim();
    const i = t.indexOf('{');
    if (i >= 0) {
      const o = JSON.parse(t.slice(i, t.lastIndexOf('}') + 1));
      if (Array.isArray(o.beats)) { shape = 'json:beats(' + o.beats.length + ')'; beats = o.beats; }
      else shape = 'json:' + Object.keys(o).slice(0, 5).join(',');
    }
  } catch (_) { shape = 'prose/unparsed'; }
  const ratio = a.content.length ? (proj.length / a.content.length) : 0;
  shapes.push({ n, authorLen: a.content.length, projLen: proj.length, ratio, shape, beats });
  console.log('   ' + String(n).padStart(5) + ' | ' + String(a.content.length).padStart(12)
    + ' | ' + String(proj.length).padStart(10) + ' | ' + ratio.toFixed(2).padStart(5)
    + ' | ' + shape);
}
// If every projection is a similar fraction of its author reply, the projection is a RENDERING of
// it (beats joined, directives dropped), not a truncation at a fixed limit.
const ratios = shapes.map(s => s.ratio).filter(r => r > 0);
const minR = Math.min(...ratios), maxR = Math.max(...ratios);
console.log('   ratio spread: ' + minR.toFixed(2) + ' – ' + maxR.toFixed(2)
  + (maxR - minR < 0.35 ? '  (consistent — a rendering, not a cut-off)'
    : '  (wide — worth a closer look)'));
// Does the projection text actually appear in the author reply? If the beats' text is present in
// the projection, nothing was lost but structure.
for (const s of shapes.slice(0, 3)) {
  if (!s.beats) continue;
  const projFile = S + '/scene_' + String(s.n).padStart(2, '0') + '_prose.txt';
  const proj = fs.readFileSync(projFile, 'utf8');
  const texts = s.beats.map(b => String((b && (b.text || b.line || b.dialogue)) || ''))
    .filter(x => x.length > 12);
  const present = texts.filter(x => proj.includes(x)).length;
  console.log('   scene ' + s.n + ': ' + present + '/' + texts.length
    + ' author beat texts appear verbatim in the projection');
}

// ── 2. THE RAW VERIFIER REPLY VERSUS THE PARSED VERDICT ─────────────────────
console.log('\n2. DID THE MODEL SAY null, OR DID WE?');
const manifest = JSON.parse(fs.readFileSync(RUN + '/manifest.json', 'utf8'));
const verdictOf = (n) => {
  const ps = (manifest.perScene || []).filter(p => p.scene === n)[0];
  return (ps && ps.verdicts && ps.verdicts[0]) || null;
};
for (const n of scenes) {
  const f = 's' + n + '_verifier.json';
  if (!fs.existsSync(S + '/' + f)) continue;
  const v = body(f);
  let inner = null;
  try {
    const t = v.content.trim();
    inner = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  } catch (_) {}
  const parsedVerdict = verdictOf(n);
  const pp = inner && Array.isArray(inner.per_proposal) ? inner.per_proposal : null;
  console.log('   scene ' + n + ':');
  console.log('     RAW top-level delivery : ' + JSON.stringify(inner && inner.delivery));
  console.log('     RAW per_proposal       : ' + (pp ? JSON.stringify(pp).slice(0, 180) : 'ABSENT'));
  console.log('     RAW slots_check keys   : '
    + (inner && inner.slots_check ? Object.keys(inner.slots_check).join(',') : 'ABSENT'));
  console.log('     OUR parsed verdict     : ' + JSON.stringify(parsedVerdict));
  if (inner && inner.slots_check) {
    const sc = inner.slots_check;
    const empties = Object.keys(sc).filter(k => sc[k] === '' || sc[k] === null);
    console.log('     slots_check empties    : '
      + (empties.length ? empties.join(',') : 'none')
      + '   occurred_this_scene=' + JSON.stringify(sc.occurred_this_scene));
  }
}

// ── 3. WHAT THE NEXT PLANNER ACTUALLY RECEIVED ──────────────────────────────
// Zero committed facts says the LEDGER got nothing. The planner may still have been told plenty.
console.log('\n3. WHAT DID THE NEXT PLANNER ACTUALLY SEE?');
const probe = [
  ['prior scene prose / recap', /PREVIOUS SCENE|RECAP|WHAT HAPPENED|STORY SO FAR|PRIOR SCENE/i],
  ['committed world state', /COMMITTED (WORLD )?STATE|CANON FACTS|ESTABLISHED FACTS/i],
  ['seed truths', /WORLD TRUTH|SEED|AFTERMATH TRUTH|REQUIRED TRUTH/i],
  ['the reader\'s own choice', /run in shame|PLAYER ACTION|PLAYER DIALOGUE|FATE CARD/i],
  ['the obligation ledger', /OBLIGATION|RESERVED EVENT|unsealsAtScene/i],
  ['named cast', /Lirael|Julian|Seren/]
];
for (const n of scenes) {
  const f = 's' + n + '_planner.json';
  if (!fs.existsSync(S + '/' + f)) continue;
  // The REQUEST is what matters here, and the runner saved responses. The request is reconstructed
  // from what the planner was able to answer about — so this reports what the REPLY demonstrates
  // knowledge of, and says so rather than pretending to read the prompt.
  const p = body(f);
  let o = null;
  try { const t = p.content.trim(); o = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (_) {}
  if (!o) { console.log('   scene ' + n + ': reply unparsed'); continue; }
  const txt = JSON.stringify(o);
  const hits = probe.filter(([, rx]) => rx.test(txt)).map(([name]) => name);
  console.log('   scene ' + n + ': reply references ' + (hits.length ? hits.join(' · ') : 'none')
    + '   | lane=' + (o.chosen_aftermath_lane || '-'));
}
console.log('\n   NOTE: planner REQUESTS were not saved by this run — only responses. What a reply');
console.log('   demonstrates knowledge of is evidence the planner was told something, but it is');
console.log('   NOT the prompt. Capturing the request is a one-line harness change, listed as the');
console.log('   next step rather than guessed at here.');

// ── 4. THE SELECTED CARDS' ACTUAL CONTENT ───────────────────────────────────
// A repeated draw INDEX is not a repeated choice: the five cards are re-dealt each scene.
console.log('\n4. THE CARDS ACTUALLY PLAYED (index repetition is not choice repetition)');
(manifest.perScene || []).forEach((ps) => {
  if (!ps.selectedCard) return;
  const c = ps.selectedCard.card || {};
  console.log('   scene ' + ps.scene + '  #' + ps.selectedCard.drawIndex
    + '  "' + (c.title || '-') + '"');
  if (c.text) console.log('        ' + String(c.text).replace(/\s+/g, ' ').slice(0, 150));
  const set = (ps.cardSet || []).map(x => x.title).filter(Boolean);
  if (set.length) console.log('        offered: ' + set.join(' | '));
});

console.log('\n=== END TRACE — no provider calls, no changes made ===');
