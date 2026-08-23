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

  rows.push({ n, subject: slot[2] || (gaps[0] || '—'), slot: slot[1] || '—',
    applied: !!slot[1], skipped, rejects, gaps: gaps.length });
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
console.log('\n scene  subject       mechanism  repeated axis?        outcome');
console.log(' ' + '─'.repeat(73));
for (const r of rows) {
  const outcome = r.applied ? 'applied'
    : r.skipped.length ? 'skipped (slots spent)'
    : r.rejects.length ? `refused (${r.rejects.length})`
    : r.gaps ? 'no patch returned' : 'no gap';
  console.log(` ${String(r.n).padEnd(6)} ${String(r.subject).slice(0, 13).padEnd(13)} ${r.slot.padEnd(10)} `
    + `${String(r.repeat).padEnd(21)} ${outcome}`);
}

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
