// ATTRIBUTION THROUGH THE CLEANUP PASS, tested on THE PAID RUN'S OWN CAPTURED RESPONSES. $0.
//
// The paid evaluation produced nine real model exchanges and my matcher credited only four,
// because production's auxiliary line editor (app.js:204930) rewrites the reply before it renders.
// All five unmatched turns had a SUCCESSFUL cleanup. No new model responses are needed to test the
// repair: the author replies and their cleanup edits were captured, and they are replayed here.
//
// The rule under test: author response -> cleanup request (must carry THAT turn's author text)
// -> accepted cleanup output -> rendered pair, all bound to the same encounter/turn. If cleanup
// was rejected, the ORIGINAL must be what rendered.
import fs from 'fs';

const src = fs.readFileSync('_fs_live_sequence.mjs', 'utf8');
const lines = src.split('\n');
const take = (startsWith) => {
  const a = lines.findIndex(l => l.startsWith(startsWith));
  if (a < 0) throw new Error('not found: ' + startsWith);
  let d = 0, b = -1;
  for (let i = a; i < lines.length; i++) {
    for (const ch of lines[i]) { if (ch === '{') d++; else if (ch === '}') d--; }
    if (d === 0 && i > a) { b = i; break; }
  }
  return lines.slice(a, b + 1).join('\n');
};
const block = [
  'const oasRepliesReceived = new Map();',
  'const oasCleanups = new Map();',
  take('function callFunction(sysPrompt) {'),
  take('function noteOasReplyReceived('),
  take('function noteOasCleanup('),
  take('function oasReplyRenderedFor(')
].join('\n');
const mod = new Function(block + `
  return { oasRepliesReceived, oasCleanups, noteOasReplyReceived, noteOasCleanup, oasReplyRenderedFor };
`)();
const { oasRepliesReceived, oasCleanups, noteOasReplyReceived, noteOasCleanup,
  oasReplyRenderedFor } = mod;

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const captured = JSON.parse(fs.readFileSync('_runner_fixtures/paid_capture.json', 'utf8'));
const authors = captured.filter(p => p.kind === 'author');
const cleanups = captured.filter(p => p.kind === 'cleanup');
console.log('replaying the paid run: ' + authors.length + ' author replies, '
  + cleanups.length + ' cleanup edits');

const AUTHOR_SYS = 'You are the LI (love interest) in an intensely intimate mouth-closeup. Return li_dialogue.';
const CLEAN_SYS = 'You are a line editor for adult intimate dialogue (explicit register permitted).';
const ident = (turn) => ({ encounter: 'opening OAS', turn, app: { turnCount: 0, oasBeat: turn } });
const contentOf = (res) => {
  try {
    const j = JSON.parse(res);
    return j?.choices?.[0]?.message?.content ?? j?.content ?? null;
  } catch (_) { return null; }
};
const parseAuthor = (res) => {
  const c = contentOf(res);
  try { return c ? JSON.parse(c) : null; } catch (_) { return null; }
};
const parseClean = (res) => {
  const c = contentOf(res);
  if (typeof c !== 'string') return null;
  try { return JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1)); } catch (_) { return null; }
};

console.log('');
console.log('=== 1. EVERY CAPTURED TURN, AUTHOR -> CLEANUP -> RENDERED ===');
let attributed = 0;
const usable = authors.filter(a => parseAuthor(a.res));
for (let i = 0; i < usable.length; i++) {
  const turn = i + 1;
  const a = parseAuthor(usable[i].res);
  noteOasReplyReceived(AUTHOR_SYS, usable[i].res, 100 + i, ident(turn));
  // production pairs the i-th cleanup with the turn whose author text it carries
  const cl = cleanups.find(c => (a.li_dialogue && c.user.indexOf(a.li_dialogue) !== -1)
    || (a.li_action && c.user.indexOf(a.li_action) !== -1));
  let rendered = { dialogue: a.li_dialogue || '', action: a.li_action || '' };
  if (cl) {
    noteOasCleanup(CLEAN_SYS, { messages: [{ content: CLEAN_SYS }, { content: cl.user }] },
      cl.res, 200 + i, ident(turn));
    const o = parseClean(cl.res);
    if (o && (o.line || o.beat)) {
      // production applies it exactly this way (app.js:204932-204933)
      rendered = { dialogue: o.line || a.li_dialogue || '', action: o.beat || a.li_action || '' };
    }
  }
  const m = oasReplyRenderedFor('opening OAS', turn, rendered);
  if (m) attributed++;
  console.log('  turn ' + String(turn).padEnd(2) + (cl ? ' [cleanup]' : ' [raw]    ')
    + (m ? ' ATTRIBUTED — ' + m.matchedOn : ' *** UNATTRIBUTED ***'));
}
t('EVERY captured turn is attributed, cleanup or not', attributed === usable.length,
  attributed + ' of ' + usable.length);
t('and at least one went through an accepted cleanup', cleanups.length > 0);
t('ENOUGH TURNS ATTRIBUTE TO TRIGGER THE SCRIPTED EXIT (needs 6)', attributed >= 6,
  'attributed=' + attributed + ' — below six the exit never fires and the handoff is lost');

console.log('');
console.log('=== 2. NEGATIVES THAT MUST STILL FAIL ===');
oasRepliesReceived.clear(); oasCleanups.clear();
const A = { li_dialogue: 'Then say it where they can hear you.', li_action: 'He does not move.' };
const envelope = (o) => JSON.stringify({ choices: [{ message: { content: JSON.stringify(o) } }] });
noteOasReplyReceived(AUTHOR_SYS, envelope(A), 7, ident(1));
{
  // a cleanup whose INPUT is some other turn's text must not license the rendered pair
  noteOasCleanup(CLEAN_SYS, { messages: [{ content: CLEAN_SYS },
    { content: 'line: "a completely different line from another turn"' }] },
    envelope({ line: 'Edited text that never came from this turn.', beat: 'He steps back.' }),
    8, ident(1));
  const m = oasReplyRenderedFor('opening OAS', 1,
    { dialogue: 'Edited text that never came from this turn.', action: 'He steps back.' });
  t('a cleanup whose INPUT is not this turn\'s author text does NOT attribute', m === null,
    JSON.stringify(m));
}
oasRepliesReceived.clear(); oasCleanups.clear();
noteOasReplyReceived(AUTHOR_SYS, envelope(A), 7, ident(1));
{
  // cleanup REJECTED (no usable line/beat) -> the ORIGINAL must be what rendered
  noteOasCleanup(CLEAN_SYS, { messages: [{ content: CLEAN_SYS },
    { content: 'line: "' + A.li_dialogue + '"' }] }, envelope({}), 8, ident(1));
  const orig = oasReplyRenderedFor('opening OAS', 1,
    { dialogue: A.li_dialogue, action: A.li_action });
  t('cleanup rejected -> the ORIGINAL reply attributes', !!orig,
    orig ? orig.matchedOn : 'null');
  const other = oasReplyRenderedFor('opening OAS', 1,
    { dialogue: 'Something the editor never produced.', action: A.li_action });
  t('and unrelated rendered text still does NOT', other === null, JSON.stringify(other));
}
oasRepliesReceived.clear(); oasCleanups.clear();
noteOasReplyReceived(AUTHOR_SYS, envelope(A), 7, ident(1));
{
  noteOasCleanup(CLEAN_SYS, { messages: [{ content: CLEAN_SYS },
    { content: 'line: "' + A.li_dialogue + '"' }] },
    envelope({ line: 'Say it where they can hear.', beat: 'He stays still.' }), 8, ident(1));
  const half = oasReplyRenderedFor('opening OAS', 1,
    { dialogue: 'Say it where they can hear.', action: A.li_action });
  t('a HALF-APPLIED cleanup (edited dialogue, stale action) does NOT attribute', half === null,
    JSON.stringify(half));
  const full = oasReplyRenderedFor('opening OAS', 1,
    { dialogue: 'Say it where they can hear.', action: 'He stays still.' });
  t('the fully applied cleanup DOES attribute', !!full && full.chain.cleanupAccepted === true);
  const wrongTurn = oasReplyRenderedFor('opening OAS', 4,
    { dialogue: 'Say it where they can hear.', action: 'He stays still.' });
  t('and it does not attribute to a DIFFERENT turn', wrongTurn === null);
}

console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
