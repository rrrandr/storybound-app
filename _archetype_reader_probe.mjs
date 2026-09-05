// _archetype_reader_probe.mjs — Roman 2026-08-09: measure READER EXPERIENCE divergence across archetypes.
// Post-hoc + cheap (gpt-4o-mini via the local proxy). For each archetype's saved prose, after EACH scene it asks a
// first-time reader "what story do you think you're in?" — then compares across archetypes to find the SCENE OF
// MEANINGFUL DIVERGENCE and whether the four players would DESCRIBE THE STORY DIFFERENTLY (the real product metric).
// Optimizes for detecting different reader EXPERIENCES, not different planner outputs. Run AFTER _archetype_harness.mjs.
import fs from 'fs';

const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/archetype';
const PROXY = 'http://localhost:3000/api/chatgpt-proxy';
const SELECTED = ['follower', 'lover', 'hero', 'rebel'];

async function probe(proseSoFar) {
  const sys = 'You are a FIRST-TIME READER of an interactive story, reporting YOUR experience — not analyzing craft, not summarizing plot mechanics. Answer only what you, as a reader, would actually say after reading this far. Output STRICT JSON only.';
  const usr = 'STORY SO FAR:\n' + String(proseSoFar).slice(-11000) +
    '\n\nAnswer as a reader: {' +
    '"story_kind": "1-3 words for the KIND of story this feels like right now (romance / murder mystery / political conspiracy / redemption / revenge / coming-of-age / horror / etc.)", ' +
    '"about": "ONE sentence — what is this story ABOUT, in your own words", ' +
    '"dominant_question": "ONE sentence — the biggest thing you want to know next", ' +
    '"closest_npc": "which character feels closest / most important to the protagonist right now (name or role)"}';
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 220, jsonMode: true }) });
    if (!r.ok) return { error: 'http ' + r.status };
    const d = await r.json();
    const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    try { return JSON.parse(c); } catch (_) { const m = String(c || '').match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : { error: 'parse' }; }
  } catch (e) { return { error: String(e && e.message) }; }
}

function toks(s) { return new Set(String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4)); }
function jac(a, b) { const A = toks(a), B = toks(b); if (!A.size && !B.size) return 1; let i = 0; A.forEach(w => { if (B.has(w)) i++; }); return i / (A.size + B.size - i); }

const traj = {};   // archetype -> [{scene, story_kind, about, dominant_question, closest_npc}]
for (const name of SELECTED) {
  const path = `${DIR}/${name}.json`;
  if (!fs.existsSync(path)) { console.log(`SKIP ${name} — no ${path} (run _archetype_harness.mjs first)`); continue; }
  const scenes = (JSON.parse(fs.readFileSync(path, 'utf8')).scenes) || [];
  traj[name] = [];
  for (let k = 1; k <= scenes.length; k++) {
    const p = await probe(scenes.slice(0, k).join('\n\n---\n\n'));
    traj[name].push({ scene: k, ...p });
    console.log(`[${name}] scene ${k}: kind="${p.story_kind || p.error}" · about="${String(p.about || '').slice(0, 80)}"`);
  }
}

// ── SCENE OF MEANINGFUL DIVERGENCE: first scene where the archetypes' reader-perceptions genuinely differ ──
const names = Object.keys(traj);
const maxScene = Math.max(0, ...names.map(n => traj[n].length));
let divergenceScene = null;
const perScene = [];
for (let k = 1; k <= maxScene; k++) {
  const rows = names.map(n => traj[n][k - 1]).filter(Boolean);
  if (rows.length < 2) continue;
  const kinds = rows.map(r => String(r.story_kind || '').toLowerCase().trim());
  const kindsUnanimous = new Set(kinds).size === 1;
  // avg pairwise "about" overlap — low overlap = readers describe it differently
  let sum = 0, cnt = 0;
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) { sum += jac(rows[i].about, rows[j].about); cnt++; }
  const aboutOverlap = cnt ? +(sum / cnt).toFixed(3) : 1;
  const diverged = !kindsUnanimous || aboutOverlap < 0.34;
  perScene.push({ scene: k, kinds, kindsUnanimous, aboutOverlap, diverged });
  if (diverged && divergenceScene === null) divergenceScene = k;
}

const finalAbout = {}; const finalKind = {}; const finalNpc = {}; const finalQ = {};
for (const n of names) { const last = traj[n][traj[n].length - 1] || {}; finalAbout[n] = last.about; finalKind[n] = last.story_kind; finalNpc[n] = last.closest_npc; finalQ[n] = last.dominant_question; }

fs.writeFileSync(`${DIR}/_reader_experience.json`, JSON.stringify({ trajectory: traj, perScene, divergenceScene, finalAbout, finalKind, finalNpc, finalQ }, null, 1));

console.log('\n=== READER-EXPERIENCE DIVERGENCE ===');
console.log('SCENE OF MEANINGFUL DIVERGENCE:', divergenceScene === null ? 'NEVER (converged — the design fail)' : divergenceScene);
console.log('\nper-scene: scene | story_kinds | about-overlap | diverged?');
perScene.forEach(p => console.log(`  s${p.scene}: [${p.kinds.join(' / ')}] overlap=${p.aboutOverlap} ${p.diverged ? '← DIVERGED' : ''}`));
console.log('\nFINAL — "what is this story about?" per archetype (the biggest metric):');
for (const n of names) console.log(`  ${n.padEnd(9)} kind=${finalKind[n]} · closest=${finalNpc[n]}\n            about: ${finalAbout[n]}`);
console.log('\n→ different one-liners = Storybound is reactive; same one-liner = four players converged to one story.');
process.exit(0);
