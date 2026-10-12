// ── HOW MUCH OF THE SCENE IS THE OUTLINE, TRANSCRIBED? (provider-free, $0) ──────────────────
// Traces the causal_outline entries in a SAVED request against the beats in its SAVED response.
// Not a gate and not a production change: a measurement, so "the author copied the outline" is a
// number rather than an impression.
//
// Reports, per beat: the index-aligned outline entry's token overlap, and the BEST-matching entry
// anywhere in the outline. Transcription shows up as high overlap on the index-aligned entry.
import fs from 'fs';

const REQ = process.env.SB_MAP_REQ;
const RES = process.env.SB_MAP_RES;
if (!REQ || !RES) { console.error('set SB_MAP_REQ and SB_MAP_RES'); process.exit(2); }

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const reqRaw = readJson(REQ);
const sys = String((reqRaw.body ? reqRaw.body : reqRaw).messages[0].content);

// The outline as the author received it: numbered lines under the CAUSAL OUTLINE heading.
const lines = sys.split('\n');
const start = lines.findIndex((l) => /CAUSAL OUTLINE/.test(l));
const outline = [];
if (start >= 0) {
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(\d+)\.\s*(.*)$/);
    if (!m) { if (outline.length) break; else continue; }
    // Strip the link preamble the renderer prepends, leaving the development itself.
    const dev = m[2]
      .replace(/^(THEREFORE|BUT)\s*—\s*this (happens BECAUSE of|is OBSTRUCTED by) what just happened:\s*/i, '')
      .trim();
    outline.push({ n: Number(m[1]), dev });
  }
}

const resRaw = readJson(RES);
const content = (((resRaw.choices || [])[0] || {}).message || {}).content || '';
let obj = null;
try { obj = JSON.parse(content.replace(/^```json\s*|\s*```$/g, '')); } catch (_) {
  const m = content.match(/\{[\s\S]*\}/); if (m) { try { obj = JSON.parse(m[0]); } catch (_) {} }
}
const beats = (obj && Array.isArray(obj.beats)) ? obj.beats : [];

// Content-word overlap, both directions, on a normalised token set. Deliberately crude and stated
// as such: it measures REUSE OF THE SAME WORDS, which is what transcription looks like.
const STOP = new Set(('the a an and or but of to in on at by for with from as is are was were be been'
  + ' her his its my our their he she they i it that this there then into over under between'
  + ' not no also still already just only own').split(/\s+/));
const toks = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ')
  .split(/\s+/).filter((w) => w && w.length > 2 && !STOP.has(w)));
function overlap(a, b) {
  const A = toks(a), B = toks(b);
  if (!A.size || !B.size) return 0;
  let hit = 0; A.forEach((w) => { if (B.has(w)) hit++; });
  return hit / Math.min(A.size, B.size);
}

console.log('=== OUTLINE -> BEAT MAPPING (provider-free, $0) ===');
console.log('request : ' + REQ);
console.log('response: ' + RES);
console.log('outline entries: ' + outline.length + '   beats: ' + beats.length);
// THE OFFSET IS DISCOVERED, NOT ASSUMED. The outline is 1-indexed, beats are 0-indexed, and an
// author may legitimately add an opening or closing beat, so beat i corresponds to entry i+OFF for
// some constant OFF. Scoring against the wrong offset reported 0% alignment on a scene that is in
// fact transcribed in order, so the offset that maximises total alignment is found first.
let OFF = 0, bestScore = -1;
for (let off = -3; off <= 3; off++) {
  let s = 0;
  beats.forEach((b, i) => {
    const o = outline[i + off];
    if (o) s += overlap(String(b.text || ''), o.dev);
  });
  if (s > bestScore) { bestScore = s; OFF = off; }
}
console.log('  best constant offset: beat i <-> outline entry i' + (OFF >= 0 ? '+' + OFF : OFF)
  + ' (discovered, not assumed)');
console.log('\n  beat | aligned | best | best@ | beat text (first 58 chars)');
let aligned = 0, high = 0;
const rows = [];
beats.forEach((b, i) => {
  const txt = String(b.text || '');
  const al = outline[i + OFF] ? overlap(txt, outline[i + OFF].dev) : 0;
  let best = 0, bestAt = null;
  outline.forEach((o) => { const v = overlap(txt, o.dev); if (v > best) { best = v; bestAt = o.n; } });
  if (al >= 0.6) aligned++;
  if (best >= 0.6) high++;
  rows.push({ beat: i, alignedOverlap: Math.round(al * 100) / 100, bestOverlap: Math.round(best * 100) / 100, bestAt });
  console.log('  ' + String(i).padStart(4) + ' | ' + al.toFixed(2).padStart(7) + ' | '
    + best.toFixed(2).padStart(4) + ' | ' + String(bestAt == null ? '-' : bestAt).padStart(5)
    + ' | ' + txt.slice(0, 58).replace(/\s+/g, ' '));
});

const words = beats.map((b) => String(b.text || '')).join(' ').trim().split(/\s+/).filter(Boolean).length;
console.log('\n── SUMMARY ──');
console.log('  beats whose INDEX-ALIGNED outline entry overlaps >=0.60 : ' + aligned + '/' + beats.length
  + '  (' + Math.round((aligned / Math.max(1, beats.length)) * 100) + '%)');
console.log('  beats matching SOME outline entry >=0.60               : ' + high + '/' + beats.length
  + '  (' + Math.round((high / Math.max(1, beats.length)) * 100) + '%)');
console.log('  beats : ' + beats.length + '   outline entries : ' + outline.length
  + '   words : ' + words + '   words/beat : ' + Math.round((words / Math.max(1, beats.length)) * 10) / 10);
console.log('\n  A high ALIGNED figure means beat N is outline entry N in other words:');
console.log('  the outline was transcribed in order, not developed.');
fs.writeFileSync('_ab_writing_out/outline_beat_mapping.json',
  JSON.stringify({ req: REQ, res: RES, offset: OFF, outlineEntries: outline.length, beats: beats.length,
    words, alignedGte60: aligned, bestGte60: high, rows }, null, 2));
console.log('\n  written: _ab_writing_out/outline_beat_mapping.json');
