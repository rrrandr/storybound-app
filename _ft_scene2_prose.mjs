// ONE SCENE 2 PROSE-AND-FINALIZATION RUN — $0.06 HARD CAP (Roman 2026-11-18)
//
// Authorized at $0.06. Zero paid planning: both planning legs are answered from the PAID replies
// already on disk — the planner reply byte for byte, and the paid scaffold grounded on the
// ledger's issued refs. Everything else (prose, the finishing passes, both editors) goes to the
// real API through the stub's forwarding mode.
//
//   SB_PLAN_ONLY is OFF            prose must run
//   SB_NO_RETRY=1                  no author retry, no replan
//   SB_EDITOR_LOCAL_SCENES=1       Scene 1's reopen editor calls stay local
//   generalAuthorModel gpt-6-luna  prose and creative edits
//
// Then the save is reopened and the published page is read back from it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/romantsukerman/storybound-app';
const OUT = '_ft_scene2_prose';
const PORT = 3994;
const API = 'http://localhost:3010';
const CEILING = '0.06';
const WANT = {
  action: 'Escalate it — say the worst true thing in the room and let it land.',
  dialogue: 'You want the version where I’m the difficult one, Helen? Give them that one.',
};
const nz = (x) => String(x || '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

// THE TWO PLANNING LEGS ARE REPLAYED IN THE RUNNER, by operation, before any reservation.
// The stub no longer answers anything; it only forwards.
fs.copyFileSync(ROOT + '/_ft_scene2_carryin/RESUMABLE_STATE.json', ROOT + '/_ft_fixtures/prose.json');

console.log('SCENE 2 — PROSE AND FINALIZATION');
console.log('  ceiling   $' + CEILING + '  (hard cap)');
console.log('  planning  reused from the paid replies — zero paid planning calls');
console.log('  prose     gpt-6-luna, no retry, no fallback author');
console.log('  forward   everything but the two planning legs → ' + API + '\n');

const stubLog = ROOT + '/' + OUT + '_stub.log';
try { fs.unlinkSync(stubLog); } catch (_) {}
const stub = spawn('node', [ROOT + '/_ft_plan_stub_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: String(PORT), SB_STUB_FORWARD: API }) });
const sl = fs.createWriteStream(stubLog); stub.stdout.pipe(sl); stub.stderr.pipe(sl);
let bound = false;
for (let i = 0; i < 60 && !bound; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(stubLog, 'utf8'); } catch (_) {}
  if (/\[FWD\] listening on /.test(t)) bound = true; else if (/CANNOT BIND/.test(t)) break;
}
if (!bound) { console.error('the stub could not bind ' + PORT + ' — refusing to run'); process.exit(2); }

const env = Object.assign({}, process.env, {
  SB_ORIGIN: 'http://localhost:3999',
  SB_MODEL_ORIGIN: 'http://localhost:' + PORT,
  SB_OUT: OUT,
  SB_STARTER: 'starter_the_first_taste', SB_MAX_SCENES: '2',
  SB_NO_RETRY: '1', SB_GENERAL_PROSE: '1', SB_EDITOR_LOCAL_SCENES: '1',
  // THE PLANNING LEGS, BY OPERATION, ANSWERED BEFORE ANY RESERVATION. Receipts stripped from
  // both files so a replay cannot be settled as real usage.
  SB_REUSE_SCENE_PLANNER: '_ft_preserved_planning/PAID2_PLANNER_REPLAY.json',
  SB_REUSE_SCAFFOLD: '_ft_preserved_planning/PAID2_SCAFFOLD_REPLAY.json',
  SB_RUN_CONFIG: JSON.stringify({
    architectureModel: 'gpt-6.1-sol', architectureMaxTokens: 14250,
    generalAuthorModel: 'gpt-6-luna', generalAuthorMaxTokens: 16000,
    plannerModel: 'gpt-6-luna', plannerMaxTokens: 10000, reasoningEffort: 'medium',
    skeletonModel: 'gpt-6-luna', skeletonMaxTokens: 10000,
  }),
});
['SB_PLAN_ONLY', 'SB_PLAN_FIXTURE', 'SB_OFFLINE', 'SB_CPLUS_ACCEPT', 'SB_FORCE_OPENER',
 'SB_STAGE_PRESENT', 'SB_STAGE_LOCATION', 'SB_PLAN_TEST_SKIP_OBSERVE'].forEach((k) => { delete env[k]; });

const logPath = ROOT + '/' + OUT + '.log';
const log = fs.createWriteStream(logPath);
const kid = spawn('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run-resume', CEILING,
  ROOT + '/_ft_fixtures/prose.json'], { cwd: ROOT, env });
kid.stdout.pipe(log); kid.stderr.pipe(log);
const read = () => { try { return fs.readFileSync(logPath, 'utf8'); } catch (_) { return ''; } };

let runDir = null, step = 'p', picked = null;
const poll = setInterval(() => {
  const t = read();
  if (!runDir) { const m = t.match(/page written to (\S+)/); if (m) runDir = path.dirname(m[1]); else return; }
  if (step === 'p' && /waiting for a reader choice/.test(t)) {
    fs.writeFileSync(runDir + '/NEXT_ACTION.json', JSON.stringify({ readHand: true }, null, 2));
    console.log('  → examine the deck'); step = 'h'; return;
  }
  if (step === 'h') {
    const f = runDir + '/FATE_HAND_scene1.json';
    if (!fs.existsSync(f)) return;
    let hand; try { hand = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return; }
    const i = (hand.cards || []).findIndex((c) => String(c.id || c.title || '').toLowerCase() === 'temptation');
    const o = (hand.stateFateOptions || []).filter((x) => String(x.id || '').toLowerCase() === 'temptation')[0] || {};
    if (i === -1 || nz(o.action) !== nz(WANT.action) || nz(o.dialogue) !== nz(WANT.dialogue)) {
      console.log('  ✗ the dealt Temptation pair is not the authorized one — not submitting');
      console.log('      DO : ' + String(o.action || '(none)'));
      console.log('      SAY: ' + String(o.dialogue || '(none)'));
      step = 'refused'; clearInterval(poll); setTimeout(() => kid.kill('SIGTERM'), 400); return;
    }
    picked = { index: i, action: o.action, dialogue: o.dialogue };
    console.log('  ✓ authorized Temptation pair on the table (index ' + i + ')');
    console.log('  → submitting; prose follows');
    fs.writeFileSync(runDir + '/NEXT_ACTION.json', JSON.stringify({ fateCardIndex: i }, null, 2));
    step = 'x';
  }
}, 2000);
setTimeout(() => { try { kid.kill('SIGTERM'); } catch (_) {} }, 1500000);
await new Promise((res) => kid.on('exit', res));
clearInterval(poll);
try { stub.kill('SIGTERM'); } catch (_) {}
await new Promise((r) => setTimeout(r, 1200));

const dir = ROOT + '/' + OUT + '/LATEST';
const rd = (f) => { try { return fs.readFileSync(dir + '/' + f, 'utf8'); } catch (_) { return ''; } };
const txt = read();
const plain = (s) => String(s).replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n').trim();

// ── THE PUBLISHED PAGE, FROM THE REOPENED SAVE ───────────────────────────────────────────
let page = rd('scene02.txt');
if (!page) {
  const man = plain(rd('MANUSCRIPT.txt'));
  const carry = plain(fs.readFileSync(ROOT + '/_ft_scene2_carryin/scene01.txt', 'utf8'));
  const cut = carry ? man.indexOf(carry.slice(-120)) : -1;
  page = cut !== -1 ? man.slice(cut + 120).trim() : man;
}
console.log('\n' + '═'.repeat(72));
console.log('THE PUBLISHED SCENE 2');
console.log('═'.repeat(72));
plain(page).split('\n').map((x) => x.trim()).filter(Boolean).forEach((p) => console.log(p + '\n'));

console.log('═'.repeat(72));
console.log('THE SERVED AUTHOR MODEL');
txt.split('\n').filter((l) => /base author resolved|ROUTER: scene 2|served by|AUTHOR_ROUTING/.test(l))
  .slice(0, 6).forEach((l) => console.log('  ' + l.trim().slice(0, 175)));
try {
  const ar = JSON.parse(rd('AUTHOR_ROUTING.json'));
  console.log('  AUTHOR_ROUTING.json: ' + JSON.stringify(ar).slice(0, 400));
} catch (_) {}

console.log('\nSPEND');
txt.split('\n').filter((l) => /SETTLED from real usage|ESTIMATED, no receipt|HELD, outcome|committed against|REMAINING|outstanding/.test(l))
  .forEach((l) => console.log('  ' + l.trim()));
const local = (txt.match(/EDITOR ANSWERED LOCALLY for scene 1/g) || []).length;
console.log('  scene 1 editor calls kept local: ' + local);
console.log('  planning legs served from the paid replies: '
  + ((fs.readFileSync(stubLog, 'utf8').match(/\[STUB\] (planner|scaffold) #/g) || []).length));

console.log('\nDID THE PROSE ACTUALLY GO LIVE?');
const stubTxt = (() => { try { return fs.readFileSync(stubLog, 'utf8'); } catch (_) { return ''; } })();
const fwd = (stubTxt.match(/\[FWD\] #\d+/g) || []).length;
console.log('  forwarded to the live API: ' + fwd + ' call(s)');
stubTxt.split('\n').filter((l) => /\[FWD\] #/.test(l)).slice(0, 8)
  .forEach((l) => console.log('    ' + l.trim().slice(0, 140)));
if (!fwd) console.log('  \u2717 NOTHING WAS FORWARDED \u2014 no prose can have been generated.');
console.log('  planning legs replayed (reserve nothing):');
txt.split('\n').filter((l) => /CONTINUATION (SCENE PLANNER|SCAFFOLD)/.test(l)).slice(0, 4)
  .forEach((l) => console.log('    ' + l.trim().slice(0, 150)));

console.log('\nUNRESOLVED HOLD');
const held = (txt.match(/HELD, outcome unknown\s*:\s*\$([0-9.]+)\s*\((\d+) calls\)/) || []);
console.log('  ' + (held[1] ? ('$' + held[1] + ' across ' + held[2] + ' call(s)') : 'none reported'));
txt.split('\n').filter((l) => /unresolved|HOLD-/.test(l)).slice(0, 4).forEach((l) => console.log('  ' + l.trim().slice(0, 170)));

fs.writeFileSync(ROOT + '/_FT_SCENE2_PROSE.json', JSON.stringify({
  ceiling: CEILING, picked, pageChars: plain(page).length,
}, null, 2));
fs.writeFileSync(ROOT + '/_FT_SCENE2_PUBLISHED.txt', plain(page));
console.log('\n  full page: _FT_SCENE2_PUBLISHED.txt · trace: ' + OUT + '.log');
