// WHAT IS ACTUALLY ON LUNA'S SCENE 3 REQUEST (Roman 2026-11-18)
//
// Reads the captured request out of REQUESTS.jsonl, which the runner writes incrementally, so a
// run that was stopped at its idle point still leaves usable evidence. The earlier audit read
// requests.json, written only at a clean exit, and reported an absent author request that had in
// fact been built and refused at 408,139 chars.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
const base = ROOT + '_ft_scene3_handoff';
const run = fs.readdirSync(base).filter((f) => /^run_/.test(f))
  .map((f) => ({ f, t: fs.statSync(base + '/' + f).mtimeMs }))
  .sort((a, b) => b.t - a.t)[0];
const dir = base + '/' + run.f + '/';
console.log('run: ' + run.f);

const rows = [];
for (const line of fs.readFileSync(dir + 'REQUESTS.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { rows.push(JSON.parse(line)); } catch (_) {}
}
console.log('captured dispatches: ' + rows.length);

// The prose author: the largest gpt-6-luna PRIMARY_AUTHOR dispatch. Size alone is not the
// selector (an 8,706-char finishing call once won that contest, and a 2,200-token grok rung
// once looked like a routing defect); model + role + size together are.
const authors = rows.filter((r) => /PRIMARY_AUTHOR/.test(String(r.role || ''))
  && /gpt-6-luna/.test(JSON.stringify(r).slice(0, 4000)));
const luna = authors.sort((a, b) => Number(b.chars || b.requestChars || 0) - Number(a.chars || a.requestChars || 0))[0];
if (!luna) { console.error('no Luna author dispatch in the ledger'); process.exit(2); }
const A = String(luna.bodyText || luna.body || '');
console.log('author dispatch: #' + (luna.reqId || '?') + '  '
  + (luna.chars || luna.requestChars) + ' chars  body captured: ' + A.length + ' chars');
if (!A) {
  console.log('\nthe ledger row carries no body text; falling back to the saved request artifact');
}
const BODY = A || (() => {
  for (const f of fs.readdirSync(dir)) {
    if (/AUTHOR_REQUEST/.test(f)) return fs.readFileSync(dir + f, 'utf8');
  }
  return '';
})();
console.log('analysing ' + BODY.length + ' chars\n');
fs.writeFileSync(ROOT + '_FT_SCENE3_AUTHOR_REQUEST.txt', BODY);

let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 200)) : '')); } else console.log('  ✓ ' + nm); };
const quote = (rx) => { const m = BODY.match(rx); return m ? ('…' + String(m[0]).replace(/\s+/g, ' ').slice(0, 170)) : null; };
const show = (nm, rx) => { const q = quote(rx); ck(nm, !!q, 'not found'); if (q) console.log('        ' + q); return !!q; };

console.log('THE TWO READER INPUTS');
show('the sealed WISH is on the request', /without the gala deciding what mine means[^\n]{0,80}/);
show('the DO is on the request', /Hold my ground at the counter[^\n]{0,80}/);
show('the SAY is on the request', /Send me the uncut segment[^\n]{0,80}/);

console.log('\nIS THE WISH CARRIED AS A WISH?');
show('a petition/wish frame around it', /(PETITION|WISH|petitioned Fate)[^\n]{0,160}/);

console.log('\nTHE FATE RULES, AS DELIVERED');
show('the wish is to be VOICED', /(give|gives|giving)\s+voice[^\n]{0,120}|voice[sd]?\s+(the|her)\s+(wish|petition)[^\n]{0,120}|aloud[^\n]{0,100}/i);
show('a subtle OMEN follows', /omen[^\n]{0,140}/i);
show('the wish MANIFESTS rather than being promised', /(manifest|fulfil|comes true|actually)[^\n]{0,140}/i);
show('a PROMISE does not count as fulfilment', /promise[^\n]{0,160}/i);
console.log('\nTHE CLOSE');
show('Petition Fate slides back into the deck', /Petition Fate\s+(slid|slides|back)[^\n]{0,140}|back (in|among)[^\n]{0,120}/);
show('the red Tempt Fate card surfaces', /Tempt Fate[^\n]{0,140}/);
show('the static shock lands', /static shock[^\n]{0,140}/i);
show('the thought stops at the ellipsis so the card can continue it', /past the ellipsis[^\n]{0,140}|DO NOT continue the thought[^\n]{0,140}/i);
console.log('\nAND THE READER’S NEXT CHOICE');
show('the next choice is left to the reader', /(do NOT resolve|leave[^\n]{0,30}open|reader (chooses|decides)|open choice)[^\n]{0,130}/i);

console.log('\nTHE PICTURABILITY ROSTER ON THIS REQUEST');
const pic = BODY.match(/PICTURAB[\s\S]{0,1400}/);
if (pic) console.log('  ' + pic[0].replace(/\s+/g, ' ').slice(0, 900));
else console.log('  (no picturability block on the AUTHOR request — it is the editor’s own call)');

fs.writeFileSync(ROOT + '_FT_SCENE3_REQUEST_AUDIT.json', JSON.stringify({
  run: run.f, authorReqId: luna.reqId, chars: luna.chars || luna.requestChars,
  bodyChars: BODY.length, checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' present');
console.log('  full request: _FT_SCENE3_AUTHOR_REQUEST.txt');
