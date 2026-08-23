// _serial_report.mjs — run the repair pass across a serial IN ORDER, then tabulate.
//
// The pre-registered question is not "can repair add C+" (already answered) but "can repair
// build a character who accumulates identity without becoming a caricature?" That needs the
// scenes processed in sequence against ONE canon state, because every interesting behaviour —
// cooldown, the skip path, a mechanism returning to deepen — only exists across scenes.
//
// Emits the pre-registered table and a BLIND PACK: the beats in order with no mechanism
// labels, so the caricature judgement is made on the prose rather than on the bookkeeping.
//
// usage: node _serial_report.mjs [dir]        (default _validate_out/serial10)
import fs from 'fs';
import { execFileSync } from 'child_process';

// Per-scene generation facts, read from the harness ledger rather than inferred. A duplicate
// whose output was DISCARDED is waste; one whose output WON means the measured prose came from
// a path we did not know existed, and the scene's row should be discounted.
const gen = {};
try {
  for (const l of fs.readFileSync((process.argv[2] || '_validate_out/serial10') + '/author_calls.jsonl', 'utf8')
    .trim().split('\n').filter(Boolean).map(JSON.parse)) {
    const g = (gen[l.scene] ||= { calls: 0, dupes: 0, consumed: 0, seen: {} });
    g.calls++; if (l.consumed) g.consumed++;
    if (g.seen[l.inHash]) g.dupes++; g.seen[l.inHash] = 1;
  }
} catch (_) {}

const DIR = process.argv[2] || '_validate_out/serial10';
const scenes = fs.readdirSync(DIR).filter(f => /^scene\d+_final\.txt$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (!scenes.length) { console.error(`no scenes in ${DIR}`); process.exit(2); }

const rows = [], beats = [], notes = [];
for (const f of scenes) {
  const n = Number(f.match(/\d+/)[0]);
  let out = '';
  try {
    out = execFileSync('node', ['_storybound_pass.mjs', `${DIR}/${f}`, '--only=C+', '--lens=OPEN_VEIN', '--apply'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 240000 });
  } catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); }

  const slot = (out.match(/⟳ slot (\w+) spent for (\S+)/) || []);
  const skipped = [...out.matchAll(/\(skipping (\S+) — every mechanism spent/g)].map(m => m[1]);
  const rejects = [...out.matchAll(/⚠ REJECT: (.+)/g)].map(m => m[1].trim());
  const gaps = [...out.matchAll(/^   \[C\+\] (\S+)/gm)].map(m => m[1]);
  const now = (out.match(/^     now: (.+)$/m) || [])[1] || '';

  // Prose-level measurements, independent of whether repair fired.
  const raw = fs.readFileSync(`${DIR}/${f}`, 'utf8');
  let tells = '?';
  try {
    const o = execFileSync('node', ['_tell_causality.mjs', `${DIR}/${f}`], { encoding: 'utf8' });
    tells = (o.match(/(\d+) unlicensed/) || [])[1] ?? '?';
  } catch (_) {}
  const g = gen[n] || {};
  rows.push({ n, subject: slot[2] || (gaps[0] || '—'), slot: slot[1] || '—',
    applied: !!slot[1], skipped, rejects, gaps: gaps.length, tells,
    calls: g.calls ?? '?', dupes: g.dupes ?? 0, words: raw.split(/\s+/).length });
  if (slot[1] && now) beats.push({ n, subject: slot[2], text: now });
  if (skipped.length) notes.push(`scene ${n}: skipped ${skipped.join(', ')} — every mechanism on cooldown`);
  for (const r of rejects) notes.push(`scene ${n}: rejected — ${r.slice(0, 90)}`);
}

// A mechanism inside the cooldown window is the failure this whole system exists to prevent.
const seen = new Map();
for (const r of rows) {
  if (r.slot === '—') { r.repeat = '—'; continue; }
  const key = `${r.subject}:${r.slot}`;
  const last = seen.get(key);
  r.repeat = last !== undefined ? `YES (also scene ${last})` : 'no';
  r.gapSince = last !== undefined ? r.n - last : null;
  seen.set(key, r.n);
}

console.log(`\n${'═'.repeat(76)}\nSERIAL C+ ROTATION   ${DIR}   ${scenes.length} scenes\n${'═'.repeat(76)}`);
console.log('\n scene words calls dup  C+mech repeated?      unlicensed-tells  outcome');
console.log(' ' + '─'.repeat(84));
for (const r of rows) {
  const outcome = r.applied ? 'applied'
    : r.skipped.length ? 'skipped(spent)'
    : r.rejects.length ? `refused(${r.rejects.length})`
    : r.gaps ? 'no patch' : 'no gap';
  console.log(` ${String(r.n).padEnd(5)} ${String(r.words).padStart(5)} ${String(r.calls).padStart(5)}`
    + ` ${String(r.dupes || '').padStart(3)}  ${r.slot.padEnd(6)} ${String(r.repeat).padEnd(15)}`
    + ` ${String(r.tells).padStart(14)}  ${outcome}`);
}
// Cross-scene motif recurrence — the failure the mechanism ledger cannot see, because the
// same pathology can wear a new surface each time (heel→ring→hand becomes jaw→sleeve→cup).
const texts = scenes.map(f => fs.readFileSync(`${DIR}/${f}`, 'utf8'));
const BODY = '(?:hand|fingers?|thumb|palm|heel|foot|jaw|shoulders?|throat|chest|mouth|eyes?|wrist)';
const motif = {};
texts.forEach((t, i) => {
  const seen = new Set();
  const rx = new RegExp(`\\b${BODY}\\b[^.]{0,30}?\\b(\\w+(?:ed|ing))\\b`, 'gi');
  let m; while ((m = rx.exec(t))) { const k = m[0].toLowerCase().replace(/\s+/g, ' ');
    const key = k.split(' ').filter(w => /^(?:hand|fingers?|thumb|palm|heel|foot|jaw|shoulders?|throat|chest|mouth|eyes?|wrist)$/.test(w)).concat(m[1].toLowerCase()).join(' ');
    if (seen.has(key)) continue; seen.add(key); (motif[key] = motif[key] || []).push(i + 1); }
});
const motifRepeats = Object.entries(motif).filter(([, v]) => v.length >= 3);
console.log('\n MOTIF RECURRENCE (same body+verb in 3+ scenes — mechanism ledger is blind to this):');
if (!motifRepeats.length) console.log('   none');
for (const [k, v] of motifRepeats.sort((a, b) => b[1].length - a[1].length).slice(0, 8)) console.log(`   ✗ "${k}" — scenes ${v.join(',')}`);

const applied = rows.filter(r => r.applied);
const repeats = rows.filter(r => /YES/.test(String(r.repeat)));
console.log('\n ' + '─'.repeat(73));
console.log(` applied ${applied.length}/${rows.length} · distinct mechanisms ${new Set(applied.map(r => r.slot)).size}`
  + ` · within-cooldown repeats ${repeats.length}`);
console.log(` skips ${rows.filter(r => r.skipped.length).length} · refusals ${rows.reduce((a, r) => a + r.rejects.length, 0)}`);
if (notes.length) { console.log('\n NOTES'); for (const x of notes) console.log('   · ' + x); }

fs.writeFileSync(`${DIR}/_blind_pack.txt`,
  'Read these in order. They are one character\'s revealing beats across a single issue.\n'
  + 'Question: does this read as a person accumulating identity, or as a caricature —\n'
  + 'the same trait restated in fresh words? No mechanism labels are given on purpose.\n\n'
  + beats.map(b => `[scene ${b.n}] ${b.text}`).join('\n\n') + '\n');
console.log(`\n blind pack → ${DIR}/_blind_pack.txt (${beats.length} beats, unlabelled)\n`);
