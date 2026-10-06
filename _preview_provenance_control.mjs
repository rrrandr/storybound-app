// PREVIEW PROVENANCE — the classifier itself, including the stale-identity negative case.
// Provider-free, $0. No fixture issue is launched: this exercises the classifier directly.
//
// Three defects this locks down, each one previously real:
//   1. wording-based: "no ellipsis" was treated as model authorship
//   2. either-field: the SILENCE archetype's "mm" matched while the action differed completely
//   3. decorated identity: an OLD encounter's record matched and was REPORTED with the new
//      encounter/turn beside it (Codex exercised this and it passed when it should not have)
import fs from 'fs';

const src = fs.readFileSync('_fs_live_sequence.mjs', 'utf8');

// Lift the classifier and its helpers out of the runner so the real code is under test, rather
// than a copy of it. The runner is a top-level-await script, so it cannot simply be imported.
// Lift the real helpers out of the runner (lines 59-end of classifyPreview) so the SHIPPED code
// is under test rather than a copy. The runner is a top-level-await script and cannot be imported.
const lines = src.split('\n');
const start = lines.findIndex(l => l.startsWith('const previewResponses = new Map();'));
const clsStart = lines.findIndex(l => l.startsWith('function classifyPreview('));
if (start < 0 || clsStart < 0) throw new Error('could not locate the helper block');
let depth = 0, clsEnd = -1;
for (let i = clsStart; i < lines.length; i++) {
  for (const ch of lines[i]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
  if (depth === 0 && i > clsStart) { clsEnd = i; break; }
}
if (clsEnd < 0) throw new Error('could not find the end of classifyPreview');
const block = lines.slice(start, clsEnd + 1).join('\n');
const mod = new Function(block
  + '\nreturn { previewResponses, setPreviewContext, recordPreviewReply, classifyPreview,'
  + ' isPreviewPrompt, capturePreviewIdentity };')();
const { previewResponses, setPreviewContext, classifyPreview, recordPreviewReply,
  isPreviewPrompt, capturePreviewIdentity } = mod;

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const put = (cardId, action, dialogue, encounter, turn, callN) => {
  if (!previewResponses.has(cardId)) previewResponses.set(cardId, []);
  previewResponses.get(cardId).push({ action, dialogue, encounter, turn, callN, at: Date.now() });
};

const A = 'I set The Answer down between us and do not let go.';
const D = 'Ask me whose hands shaped it.';

console.log('=== IDENTITY IS ENFORCED, NOT DECORATED ===');
previewResponses.clear();
put('reversal', A, D, 'opening OAS', 2, 11);

{ // the matching identity
  const r = classifyPreview('reversal', A, D, null, { encounter: 'opening OAS', turn: 2 });
  t('a pair served in THIS encounter and turn is matched-response',
    r.provenance === 'matched-response', r.provenance + ' — ' + r.evidence);
}
{ // THE NEGATIVE CASE Codex exercised: same pair, different turn
  const r = classifyPreview('reversal', A, D, null, { encounter: 'opening OAS', turn: 5 });
  t('the SAME pair at a DIFFERENT TURN is NOT matched-response', r.provenance === 'UNKNOWN',
    r.provenance);
  t('and the evidence names the identity it really came from',
    /DIFFERENT identity/.test(r.evidence) && /turn=2/.test(r.evidence), r.evidence);
}
{ // different encounter, same turn number
  const r = classifyPreview('reversal', A, D, null, { encounter: 'scene 2 end', turn: 2 });
  t('the same pair in a DIFFERENT ENCOUNTER is NOT matched-response',
    r.provenance === 'UNKNOWN', r.provenance + ' — ' + r.evidence);
}

console.log('');
console.log('=== THE COMPLETE PAIR IS REQUIRED ===');
previewResponses.clear();
put('silence', 'I go still and let the clearing finish its noise', 'mm', 'opening OAS', 3, 9);
{
  const r = classifyPreview('silence', 'I go still and let the clearing finish its noise', 'mm',
    null, { encounter: 'opening OAS', turn: 3 });
  t('a legitimately tiny dialogue field still matches when the PAIR matches',
    r.provenance === 'matched-response', r.provenance);
}
{ // the either-field defect: dialogue matches, action is something else entirely
  const r = classifyPreview('silence', 'I slam the ledger shut and walk out', 'mm',
    null, { encounter: 'opening OAS', turn: 3 });
  t('dialogue alone matching does NOT establish authorship', r.provenance === 'UNKNOWN',
    r.provenance);
  t('and it is reported as a partial match', /ONE field matches/.test(r.evidence), r.evidence);
}

console.log('');
console.log('=== EMPTY FIELDS ARE PRESERVED, NOT COERCED ===');
previewResponses.clear();
put('silence', 'I go still', '', 'opening OAS', 4, 7);
{
  const r = classifyPreview('silence', 'I go still', '', null, { encounter: 'opening OAS', turn: 4 });
  t('empty matches empty', r.provenance === 'matched-response', r.provenance);
}
{
  const r = classifyPreview('silence', 'I go still', 'mm', null, { encounter: 'opening OAS', turn: 4 });
  t('empty does NOT match text', r.provenance === 'UNKNOWN', r.provenance);
}

console.log('');
console.log('=== WHAT CANNOT BE TRACED STAYS UNKNOWN ===');
previewResponses.clear();
{
  const r = classifyPreview('', A, D, null, { encounter: 'opening OAS', turn: 7 });
  t('no card id -> UNKNOWN', r.provenance === 'UNKNOWN', r.provenance);
}
{
  const r = classifyPreview('reversal', A, D, null, { encounter: 'opening OAS', turn: 1 });
  t('no record at all -> UNKNOWN', r.provenance === 'UNKNOWN', r.provenance);
}
{ // a cache hit is not model authorship
  const r = classifyPreview('reversal', A, D, { action: A, dialogue: D },
    { encounter: 'opening OAS', turn: 1 });
  t('a cache-only match is matched-cache, and says the model is not established',
    r.provenance === 'matched-cache' && /not established/.test(r.evidence),
    r.provenance + ' — ' + r.evidence);
}
{ // the deck's own placeholder
  const r = classifyPreview('reversal', 'Reversal…', 'Reversal…', null,
    { encounter: 'opening OAS', turn: 1 });
  t('the title placeholder is template-fallback, never a preview',
    r.provenance === 'template-fallback', r.provenance);
}

// ── THE RECORDER ITSELF, not hand-inserted records ──────────────────────────────────────────
// (Codex 2026-10-05.) The checks above inserted correctly-labelled records by hand, so they could
// not see the recording defect: the recorder stamped replies with the runner's context AT RETURN,
// so an OLD reply arriving after a turn change was credited to the NEW turn. These drive
// recordPreviewReply the way the runner does — identity captured at REQUEST time and passed in.
console.log('');
console.log('=== THE RECORDER: AN OLD REPLY ARRIVING LATE ===');
previewResponses.clear();
const BATCH = [
  'REVERSAL ||| redirect ||| ' + A + ' ||| ' + D,
  'SILENCE ||| ruin ||| I go still ||| mm'
].join('\n');
const reply = (content) => JSON.stringify({ choices: [{ message: { content } }] });

// The request is made at turn 2 (turnCount 4). Its identity is frozen HERE.
const idTurn2 = { encounter: 'opening OAS', turn: 2, app: { turnCount: 4, oasBeat: 2 } };
// The runner then moves on to turn 5 BEFORE the reply lands.
setPreviewContext('opening OAS', 5);
// The late reply is recorded with the identity it was REQUESTED under.
recordPreviewReply('You generate 5 contextual Say/Do previews, one per archetype', reply(BATCH),
  31, idTurn2);

{
  const rec = (previewResponses.get('reversal') || [])[0];
  t('the record keeps the REQUEST identity, not the context at return',
    rec && rec.turn === 2 && rec.app && rec.app.turnCount === 4,
    rec ? JSON.stringify({ turn: rec.turn, app: rec.app }) : 'no record');
}
{ // the defect: a late reply must NOT vouch for the turn the runner had moved to
  const r = classifyPreview('reversal', A, D, null,
    { encounter: 'opening OAS', turn: 5, app: { turnCount: 7, oasBeat: 5 } });
  t('a LATE reply cannot prove the NEW turn\'s provenance', r.provenance === 'UNKNOWN',
    r.provenance + ' — ' + r.evidence);
  t('and the evidence names the identity it was REQUESTED under',
    /DIFFERENT identity/.test(r.evidence) && /turn=2/.test(r.evidence), r.evidence);
}
{ // and it still vouches for the turn it was actually asked for
  const r = classifyPreview('reversal', A, D, null,
    { encounter: 'opening OAS', turn: 2, app: { turnCount: 4, oasBeat: 2 } });
  t('it DOES prove provenance for the turn it was requested under',
    r.provenance === 'matched-response', r.provenance + ' — ' + r.evidence);
}

console.log('');
console.log('=== A PREVIEW GENERATED AHEAD OF SELECTION ===');
previewResponses.clear();
// Generated during the runner's iteration 3 but for the app's turnCount 6; the selection happens
// in a later runner iteration while the app is STILL at turnCount 6. The app key must decide.
recordPreviewReply('amplify|ruin|redirect one per archetype', reply(BATCH), 44,
  { encounter: 'scene 6 end', turn: 3, app: { turnCount: 6, oasBeat: null } });
{
  const r = classifyPreview('reversal', A, D, null,
    { encounter: 'scene 6 end', turn: 99, app: { turnCount: 6, oasBeat: null } });
  t('a preview generated AHEAD of selection still matches on the app generation key',
    r.provenance === 'matched-response', r.provenance + ' — ' + r.evidence);
}
{
  const r = classifyPreview('reversal', A, D, null,
    { encounter: 'scene 7 end', turn: 4, app: { turnCount: 7, oasBeat: null } });
  t('but NOT once the app has moved to the next generation', r.provenance === 'UNKNOWN',
    r.provenance);
}
{ // a record with no identity at all never matches
  previewResponses.clear();
  recordPreviewReply('one per archetype', reply(BATCH), 50, null);
  const r = classifyPreview('reversal', A, D, null,
    { encounter: 'opening OAS', turn: 1, app: { turnCount: 1, oasBeat: 1 } });
  t('a record with NO request identity never establishes provenance',
    r.provenance === 'UNKNOWN', r.provenance + ' — ' + r.evidence);
}

console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
