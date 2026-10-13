// ── CONTRADICTION SCAN OVER COMPLETE OUTGOING REQUESTS (provider-free, $0) ───────────────────
// "47/47" proved text ARRIVED. It did not prove the assembled request is COHERENT. This reads the
// captured requests as whole documents and looks for pairs of instructions that cannot both be
// followed — the failure mode that a presence check cannot see.
//
// It asserts nothing about wording it has not been given a reason to expect. Each rule below is a
// CONTRADICTION: two strings that, appearing in the same request, give the model opposing orders.
import fs from 'fs';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + String(detail).slice(0, 500) : '')); }
};
const section = (n) => console.log('\n' + n);

const FILES = {
  spine:        '_audit_out/cf_spine_request.txt',
  openPlanner:  '_audit_out/cf_opening_planner_request.txt',
  scaffold:     '_audit_out/cf_scaffold_request.txt',
  author1:      '_audit_out/cf_author_request.txt',
  contPlanner2: '_audit_out/cf_cont_planner_s2.txt',
  contAuthor2:  '_audit_out/cf_cont_author_s2.txt',
  contAuthor3:  '_audit_out/cf_cont_author_s3.txt',
};
const doc = {};
for (const [k, p] of Object.entries(FILES)) {
  doc[k] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

console.log('=== CONTRADICTION SCAN OVER COMPLETE REQUESTS (provider-free, $0) ===');
console.log('Reads the captures written by _causal_foundation_delivery_control.mjs.\n');
for (const [k, p] of Object.entries(FILES)) {
  console.log('  ' + k.padEnd(13) + (doc[k] ? (doc[k].length + ' chars') : 'MISSING — ' + p));
}

// ── 1. SUPERSEDED DOCTRINE MUST NOT RIDE ALONG WITH ITS REPLACEMENT ─────────────────────────
section('1. SUPERSEDED INSTRUCTIONS travelling beside their replacements');
const SUPERSEDED = [
  ['the twist must be immediate and confined to the room',
   'THE TWIST IS IMMEDIATE AND IN THE ROOM'],
  ['a father who is found and immediately leaves (contradicts Augar being unreachable)',
   'a man who is found and immediately leaves'],
  ['"nothing came of it" (the wish now produces the deck)', 'nothing came of it'],
  ['the invented wording law, phrasing 1', 'lost BY'],
  ['the invented wording law, phrasing 2', 'requires that Lirael did the losing'],
  ['the invented wording law, phrasing 3', 'no "she lost" clause'],
  // The needle must be the AFFIRMATIVE form. A bare substring cannot distinguish "write this
  // sentence" from "this frame does not contain that sentence — do not add it back", and the
  // corrected directive legitimately contains the phrase inside its own prohibition. Testing for
  // the instruction, not the words.
  ['an instruction to preserve the shrug verbatim', 'including "I didn’t remember bringing it")'],
  ['an instruction to preserve the shrug verbatim (straight quote)', 'including "I didn\'t remember bringing it")'],
  ['an explanation of the shrug\'s meaning to the author', 'half-line is her catching her own body'],
  ['revelation given a standing delay', 'buys an ADVENTURE, not an answer'],
  ['a universal Chayr duty to bound an offer', "a Chayr’s whole office at a bargain"],
  ['a permanent disclosure prohibition', 'DISCLOSURE LIMITS, ABSOLUTE'],
];
for (const [label, needle] of SUPERSEDED) {
  const hits = Object.entries(doc).filter(([, v]) => v && v.includes(needle)).map(([k]) => k);
  t('absent from every captured request: ' + label, hits.length === 0, 'found in: ' + hits.join(', '));
}

// ── 2. PROHIBITION VS PLAN: can the author obey the window AND the outline? ─────────────────
section('2. PROHIBITION vs PLAN — no request may forbid what it also requires');
// A disclosure prohibition and a delivery instruction for the SAME fact in one request is the
// contradiction that matters. The window is scene-scoped, so it must carry its own expiry.
for (const [k, v] of Object.entries(doc)) {
  if (!v) continue;
  const forbids = v.includes('do not write, imply or hint');
  if (!forbids) continue;
  t(k + ': the prohibition states its expiry scene',
    /THIS WINDOW CLOSES AT SCENE 16/.test(v), 'a prohibition with no stated release');
  t(k + ': …and says it binds the READER, not the writer\'s knowledge',
    /binds only what the READER may be told, never what you may know/.test(v));
}

// ── 3. THE SEALED PRICE REACHES EXACTLY ONE STAGE ───────────────────────────────────────────
section('3. SEALED PRICE containment across every capture');
const PRICE = 'his capacity to WITHHOLD';
for (const [k, v] of Object.entries(doc)) {
  if (!v) continue;
  const has = v.includes(PRICE);
  if (k === 'spine') t('spine DOES receive the sealed price (it is the outline)', has);
  else t('*** ' + k + ' does NOT receive the sealed price', !has);
}

// ── 4. MAD JESSI'S PRIVATE TRUTH ────────────────────────────────────────────────────────────
section('4. MAD JESSI private truth containment');
const JESSI = 'JESSI DID NOT CEASE TO EXIST';
for (const [k, v] of Object.entries(doc)) {
  if (!v) continue;
  if (k === 'spine') continue;       // planning tier may legitimately hold it
  t('*** ' + k + ' does not carry Jessi\'s private truth (he is not staged in these scenes)',
    !v.includes(JESSI));
}

// ── 5. INTERNAL AGREEMENT: one scene number per request ─────────────────────────────────────
section('5. SCENE IDENTITY — one request must not claim two different scenes');
for (const [k, v] of Object.entries(doc)) {
  if (!v) continue;
  const claims = [...v.matchAll(/current scene: (\d+)/g)].map(m => m[1]);
  if (!claims.length) continue;
  const uniq = [...new Set(claims)];
  t(k + ': states a single scene number (' + uniq.join(',') + ')', uniq.length === 1, claims.join(','));
}

// ── 6. OPENING-ONLY FACTS DO NOT SURVIVE INTO CONTINUATIONS ─────────────────────────────────
section('6. OPENING-ONLY facts must not stand as continuation instructions');
// NOTE: the needle is the FULL marker from the author tier. A bare "THIS SCENE ONLY" also matches
// an unrelated shipped directive ("WITHIN THIS SCENE ONLY (not future scenes)…"), which is a false
// positive — the scan must test for this block's own text, not for a common phrase.
const OPENING_ONLY = ['THE DECK IS IN THE SASH SHE IS WEARING', 'THIS SCENE ONLY — THE DECK'];
for (const k of ['contAuthor2', 'contAuthor3']) {
  if (!doc[k]) { t(k + ': capture present', false, FILES[k] + ' missing'); continue; }
  for (const s of OPENING_ONLY) {
    t('*** ' + k + ': "' + s.slice(0, 34) + '…" is not standing', !doc[k].includes(s));
  }
}

// ── 7. THE PLANNING CHECK AND THE FOUNDATION AGREE ──────────────────────────────────────────
section('7. The planning check and the story\'s own causes do not contradict');
if (doc.spine) {
  const v = doc.spine;
  const demandsObstruction = /needs a NAMED OBSTRUCTION, not the nature of wishing/.test(v);
  const namesOne = /the inquiry closes for want of a complainant|the file is the incomplete copy/.test(v);
  t('the spine is told a long mystery needs a named obstruction', demandsObstruction);
  t('*** …and this story actually supplies one, so the rule is satisfiable', namesOne);
  const allowsTimely = /A WELCOMED ORDER-3 WISH USUALLY WORKS/.test(v);
  const explainsYears = /failed to close in an ordinary way|each then failed to close/.test(v);
  t('revelation is allowed to be timely', allowsTimely);
  t('*** …and Lirael\'s years of failure are explained per-attempt, not by the nature of wishing',
    explainsYears);
}

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
