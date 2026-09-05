// EVERY MISTRAL CALL PATH — proof that a governor refusal cannot escalate.
// Source audit, no network, no page. Enumerates every dispatch site and classifies how it
// handles failure, so a new fallback added later fails this suite instead of quietly spending.
//   node _mistral_path_audit.mjs
import fs from 'fs';
const SRC = fs.readFileSync('public/app.js', 'utf8');
const L = SRC.split('\n');
let pass = 0, fail = 0;
const t = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok  ' : ' FAIL '} ${n}${d ? '   — ' + d : ''}`); };

const sites = [];
L.forEach((line, i) => { if (line.includes("fetch('/api/mistral-proxy'")) sites.push(i + 1); });

function enclosing(ln) {
  for (let j = ln - 2; j > Math.max(0, ln - 500); j--) {
    const m = L[j].match(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (m) return m[1];
  }
  return '?';
}
// The window in which a failure is handled. Generous on purpose: a fallback further away than
// this is not reading THIS call's failure.
const win = (ln, n = 45) => L.slice(ln - 1, ln - 1 + n).join('\n');

// A site ESCALATES if, within its failure-handling window, it reaches another provider.
const ESCALATION = /fetch\(['"]\/api\/(proxy|chatgpt-proxy|deepseek-proxy|gemini)['"]|callChatGPT\(/;
const GUARDED = /_isGovernorRefusal|_governorRefusal|_pleGovernorRefused|governor === true|\.governor\b/;

// ── REVIEWED EXEMPTIONS ──────────────────────────────────────────────────────
// A site where the window CONTAINS another provider call but cannot REACH it on failure. Each
// entry is a human judgement, recorded with the guard that makes it true — and the guard is
// asserted below, so deleting it fails this suite rather than silently opening a fallback.
// A looser regex would hide these; naming them keeps the judgement reviewable.
const UNREACHABLE_ON_FAILURE = {
  _repairHotOpening: {
    why: 'a failed Mistral call leaves `edited` empty and the function RETURNS before reaching '
       + 'the Grok call; that call is reached only when Mistral SUCCEEDED and returned too few '
       + 'words. Proven positionally below: an unconditional return sits between the two calls.',
    // The property is POSITIONAL, so it is checked positionally. An earlier version matched a
    // guard string against the whole file and had to assert the string was unique — it is not
    // (this function has two such guards), and uniqueness was never the property that mattered.
    returnBetween: /return text;/
  }
};

console.log(`\n════ MISTRAL DISPATCH SITES: ${sites.length} ════\n`);
const escalating = [], guarded = [], inert = [], unreachable = [];
for (const ln of sites) {
  const fn = enclosing(ln), w = win(ln);
  const esc = ESCALATION.test(w), grd = GUARDED.test(w);
  const exempt = UNREACHABLE_ON_FAILURE[fn];
  const bucket = !esc ? inert : (grd ? guarded : (exempt ? unreachable : escalating));
  bucket.push({ ln, fn, esc, grd, exempt: !!exempt });
  console.log(`  app.js:${String(ln).padEnd(7)} ${fn.slice(0, 34).padEnd(34) } ` +
    (!esc ? 'no cross-provider escalation'
          : grd ? 'escalates → GUARDED by governor check'
          : exempt ? 'escalation UNREACHABLE on failure (reviewed)'
          : '★ ESCALATES, UNGUARDED'));
}

console.log('\n════ ASSERTIONS ════');
t('every dispatch site is accounted for',
  sites.length === escalating.length + guarded.length + inert.length + unreachable.length, `${sites.length} sites`);
// The exemption is only valid while its guard is present.
for (const [fn, ex] of Object.entries(UNREACHABLE_ON_FAILURE)) {
  const site = [...inert, ...unreachable, ...guarded, ...escalating].find(x => x.fn === fn);
  const from = site ? site.ln : -1;
  const w = from > 0 ? win(from) : '';
  const escIdx = w.search(ESCALATION);
  const retIdx = w.search(ex.returnBetween);
  t(`exemption for ${fn}: an unconditional return sits BETWEEN the Mistral call and the escalation`,
    from > 0 && escIdx > 0 && retIdx > 0 && retIdx < escIdx,
    `mistral@${from} return@+${retIdx} escalation@+${escIdx} — ${ex.why}`);
}
t('★ NO site can escalate to another provider without a governor check',
  escalating.length === 0,
  escalating.length ? escalating.map(s => `app.js:${s.ln} ${s.fn}`).join(', ') : 'none unguarded');
t('the two known escalating paths are both guarded',
  guarded.length >= 2, guarded.map(s => s.fn).join(', '));
t('_proseLineEdit guards its Grok fallback',
  guarded.some(s => s.fn === '_proseLineEdit'), guarded.map(s => s.fn).join(','));
t('the CG screenplay provider loop breaks rather than advancing',
  /_governorRefusal\) \{[\s\S]{0,400}?break;/.test(SRC), 'break on _governorRefusal present');
t('the detector defaults to FALSE on an unreadable body — an outage still falls back',
  /catch \(_\) \{ return false; \}/.test(SRC.slice(SRC.indexOf('async function _isGovernorRefusal'),
                                                 SRC.indexOf('async function _isGovernorRefusal') + 900)));
t('the detector only treats 429/507 as candidate refusals',
  /res\.status !== 429 && res\.status !== 507/.test(SRC));
t('Scene 1 marks a governor refusal NON-retryable',
  /_htErr2\._retryable = _isGovernor \? false :/.test(SRC));
t('Scene 1 records a reader-visible busy state with a retry time',
  /_scene1QuotaBusy/.test(SRC) && /at capacity right now/.test(SRC));

console.log(`\n  guarded: ${guarded.length} · unreachable-on-failure: ${unreachable.length} · inert: ${inert.length} · UNGUARDED: ${escalating.length}`);
console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
