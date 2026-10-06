// OAS REPLY EVIDENCE — the recorder and the rendered-match test. Provider-free, $0.
//
// Three defects Codex reproduced in my first version, each now a named negative case:
//   1. a LATE response credited to the CURRENT turn, because identity was read at response time
//      instead of captured at dispatch;
//   2. UNPARSEABLE content that merely MENTIONED li_dialogue accepted as reply evidence, via a
//      field-name regex fallback;
//   3. "some new reply rendered" treated as proof, rather than THIS response supplying THAT reply.
//
// The SHIPPED functions are lifted out of the runner, not copied.
import fs from 'fs';

const src = fs.readFileSync('_fs_live_sequence.mjs', 'utf8');
const lines = src.split('\n');
const start = lines.findIndex(l => l.startsWith('const oasRepliesReceived = new Map();'));
if (start < 0) throw new Error('could not locate the reply recorder');
// take through the end of oasReplyRenderedFor
let end = lines.findIndex((l, i) => i > start && l.startsWith('function oasReplyRenderedFor('));
let depth = 0, stop = -1;
for (let i = end; i < lines.length; i++) {
  for (const ch of lines[i]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
  if (depth === 0 && i > end) { stop = i; break; }
}
const block = lines.slice(start, stop + 1).join('\n');
// callFunction is referenced by the recorder; lift it too.
const cfStart = lines.findIndex(l => l.startsWith('function callFunction(sysPrompt) {'));
let d2 = 0, cfEnd = -1;
for (let i = cfStart; i < lines.length; i++) {
  for (const ch of lines[i]) { if (ch === '{') d2++; else if (ch === '}') d2--; }
  if (d2 === 0 && i > cfStart) { cfEnd = i; break; }
}
const cf = lines.slice(cfStart, cfEnd + 1).join('\n');
const mod = new Function(cf + '\n' + block
  + '\nreturn { oasRepliesReceived, noteOasReplyReceived, oasReplyRenderedFor };')();
const { oasRepliesReceived, noteOasReplyReceived, oasReplyRenderedFor } = mod;

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const OAS_SYS = 'You play Julian in an intensely intimate mouth-closeup opening an intimate scene. '
  + 'Return li_face_state and li_dialogue.';
const envelope = (content) => JSON.stringify({ choices: [{ message: { content } }] });
const reply = (dialogue, action) => envelope(JSON.stringify({
  li_dialogue: dialogue, li_action: action, scene_state: 'continue' }));
const DIA = 'Then say it where they can hear you.';
const ACT = 'He does not move.';
const ident = (turn) => ({ encounter: 'opening OAS', turn, app: { turnCount: 0, oasBeat: turn } });

console.log('=== 1. A GOOD REPLY, RENDERED ===');
oasRepliesReceived.clear();
noteOasReplyReceived(OAS_SYS, reply(DIA, ACT), 7, ident(1));
{
  const m = oasReplyRenderedFor('opening OAS', 1, { dialogue: DIA, action: ACT });
  t('the recorded response is matched to the rendered turn', !!m && m.callN === 7,
    JSON.stringify(m));
  t('and the match names which field matched', !!m && /dialogue|action/.test(m.matchedOn || ''));
}

console.log('');
console.log('=== 2. NEGATIVE: A LATE PRIOR-TURN RESPONSE ===');
// Dispatched for turn 1, lands after the runner reached turn 4. It must stay on turn 1.
{
  const m4 = oasReplyRenderedFor('opening OAS', 4, { dialogue: DIA, action: ACT });
  t('a turn-1 response does NOT count for turn 4', m4 === null, JSON.stringify(m4));
  const m1 = oasReplyRenderedFor('opening OAS', 1, { dialogue: DIA, action: ACT });
  t('and it still counts for the turn it was dispatched for', !!m1);
}
{
  // identity missing entirely -> untraceable, recorded for nothing
  oasRepliesReceived.clear();
  noteOasReplyReceived(OAS_SYS, reply(DIA, ACT), 9, null);
  t('a response with NO dispatch identity is not recorded at all',
    oasRepliesReceived.size === 0, 'size=' + oasRepliesReceived.size);
}

console.log('');
console.log('=== 3. NEGATIVE: MALFORMED CONTENT THAT MENTIONS THE FIELD NAMES ===');
oasRepliesReceived.clear();
{
  // the exact shape the removed regex fallback accepted
  noteOasReplyReceived(OAS_SYS, envelope('{"li_dialogue": "truncated mid-stri'), 11, ident(1));
  t('truncated JSON mentioning li_dialogue is NOT evidence', oasRepliesReceived.size === 0,
    'size=' + oasRepliesReceived.size);
  noteOasReplyReceived(OAS_SYS, envelope('here is my li_dialogue and li_action, as prose'), 12, ident(1));
  t('prose naming the fields is NOT evidence', oasRepliesReceived.size === 0,
    'size=' + oasRepliesReceived.size);
  noteOasReplyReceived(OAS_SYS, envelope(JSON.stringify({ li_dialogue: 42, li_action: null })), 13, ident(1));
  t('non-string typed fields are NOT evidence', oasRepliesReceived.size === 0,
    'size=' + oasRepliesReceived.size);
  noteOasReplyReceived(OAS_SYS, envelope(JSON.stringify({ li_dialogue: '   ', li_action: '' })), 14, ident(1));
  t('empty typed fields are NOT evidence', oasRepliesReceived.size === 0,
    'size=' + oasRepliesReceived.size);
  noteOasReplyReceived(OAS_SYS, 'not an envelope at all', 15, ident(1));
  t('an unparseable envelope is NOT evidence', oasRepliesReceived.size === 0,
    'size=' + oasRepliesReceived.size);
  noteOasReplyReceived(OAS_SYS, envelope(JSON.stringify({ li_dialogue: DIA })), 16, ident(1));
  t('but a well-formed reply with only dialogue IS evidence', oasRepliesReceived.size === 1);
}

console.log('');
console.log('=== 4. NEGATIVE: A REJECTED RESPONSE FOLLOWED BY APPLICATION FALLBACK ===');
// The response arrived and parsed, but production rejected it and rendered its OWN fallback text.
// The history count grows — which the old check accepted — yet the rendered text is not this
// response's, so it must not count.
oasRepliesReceived.clear();
noteOasReplyReceived(OAS_SYS, reply(DIA, ACT), 21, ident(2));
{
  const FALLBACK = 'Not yet. Not like this.';
  const m = oasReplyRenderedFor('opening OAS', 2,
    { dialogue: FALLBACK, action: 'Decide now what you will and won\'t permit.' });
  t('a rendered APPLICATION FALLBACK does not match the received response', m === null,
    JSON.stringify(m));
  const m2 = oasReplyRenderedFor('opening OAS', 2, { dialogue: DIA, action: ACT });
  t('while the real reply, when rendered, does match', !!m2 && m2.callN === 21);
  t('and no rendered entry at all is never a match',
    oasReplyRenderedFor('opening OAS', 2, null) === null);
  t('an empty rendered entry is never a match',
    oasReplyRenderedFor('opening OAS', 2, { dialogue: '', action: '' }) === null);
}

console.log('');
console.log('=== 5. A NON-OAS RESPONSE IS NOT OAS EVIDENCE ===');
oasRepliesReceived.clear();
noteOasReplyReceived('You are a screenplay-native cinematic-romance writer for a visual novel.',
  reply(DIA, ACT), 31, ident(1));
t('a scene-author response is not recorded as an OAS reply', oasRepliesReceived.size === 0,
  'size=' + oasRepliesReceived.size);

console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
