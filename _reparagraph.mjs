// _reparagraph.mjs — restore paragraph breaks in captures taken before the pageText fix.
//
// The break information is not recoverable from the captured scene (it was never stored), but
// the raw author response for the same scene still has it. Post-passes edit wording, so the
// paragraph OPENERS are matched loosely and the break is reinserted at the best anchor found.
// Lossy by nature: a paragraph whose opening was rewritten downstream will not be recovered.
//
// usage: node _reparagraph.mjs <dir>
import fs from 'fs';
const dir = process.argv[2];
const raws = fs.readdirSync(dir).filter(f => /^raw_author_\d+\.txt$/.test(f))
  .map(f => ({ f, t: fs.readFileSync(`${dir}/${f}`, 'utf8') }));
const norm = x => x.replace(/\s+/g, ' ').replace(/[“”"’']/g, '').toLowerCase();

for (const sf of fs.readdirSync(dir).filter(f => /^scene\d+_final\.txt$/.test(f))) {
  const scene = fs.readFileSync(`${dir}/${sf}`, 'utf8');
  if (/\n\s*\n/.test(scene)) { console.log(`  ${sf}: already paragraphed`); continue; }
  const N = norm(scene);
  // Pick the raw response that actually produced this scene.
  const best = raws.map(r => {
    const paras = r.t.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    const hits = paras.filter(p => N.includes(norm(p).slice(0, 40))).length;
    return { ...r, paras, hits };
  }).sort((a, b) => b.hits - a.hits)[0];
  if (!best || best.hits < 2) { console.log(`  ${sf}: no matching raw (${best ? best.hits : 0} anchors) — left as is`); continue; }

  let out = scene, inserted = 0;
  for (const p of best.paras.slice(1)) {
    const key = norm(p).slice(0, 40);
    if (!key) continue;
    // Locate the opener in the (differently-cased, differently-spaced) final text.
    const idx = norm(out).indexOf(key);
    if (idx <= 0) continue;
    // Map the normalised index back by counting non-space chars.
    let seen = 0, real = 0;
    const target = norm(out).slice(0, idx).replace(/ /g, '').length;
    for (; real < out.length && seen < target; real++) if (!/[\s“”"’']/.test(out[real])) seen++;
    while (real < out.length && /\s/.test(out[real])) real++;
    // A closing quote belongs to the sentence that ENDED, not the paragraph that begins.
    // The index map skips quote glyphs, so a break can land before the ” and orphan it:
    //   …now is the time.\n\n”My hand rose…
    while (real < out.length && /[”"’']/.test(out[real])
           && /[.!?]/.test(out.slice(0, real).replace(/\s+$/, '').slice(-1))) real++;
    if (real > 0 && real < out.length) { out = out.slice(0, real).trimEnd() + '\n\n' + out.slice(real); inserted++; }
  }
  fs.writeFileSync(`${dir}/${sf}`, out);
  console.log(`  ${sf}: ${inserted} break(s) restored from ${best.f} (${best.paras.length} raw paragraphs)`);
}
