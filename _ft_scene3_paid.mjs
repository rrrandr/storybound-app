// SCENE 3, PAID — $0.10 HARD CAP (Roman 2026-11-18, authorized)
//
//   two reader inputs   the sealed Petition, then the typed Say/Do
//   planning            REAL for Scene 3 (no reuse: the Scene 2 replies are Scene 2's)
//   prose               gpt-6-luna, SB_NO_RETRY, no fallback author
//   editors             SB_EDITOR_DIRECT=1 — the C+ craft and picturability calls go to their
//                       provider untouched, instead of the loopback rewrite that 404'd on Scene 2
//   scenes 1 and 2      their reopen editor calls stay LOCAL; only Scene 3's editors are paid
//
// NO SB_OFFLINE here: this run is meant to spend. The estimate was $0.093200 against $0.10, so
// the margin is thin and the excluded fallback rung ($0.161340) must never fire.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/romantsukerman/storybound-app';
const OUT = '_ft_scene3_paid';
const SAVE = ROOT + '/_ft_scene2_published/RESUMABLE_STATE.json';
const PORT = 3991;
const API = 'http://localhost:3010';
const CEILING = '0.10';
const WISH = 'To hear Roman’s answer without the gala deciding what mine means.';
const DO = 'Hold my ground at the counter and ask for the footage.';
const SAY = 'Send me the uncut segment.';

fs.copyFileSync(SAVE, ROOT + '/_ft_fixtures/scene3_paid.json');
console.log('SCENE 3 — PAID RUN');
console.log('  cap      $' + CEILING + '   (estimate was $0.093200)');
console.log('  wish     ' + WISH);
console.log('  do/say   ' + DO + ' / ' + SAY);
console.log('  editors  DIRECT to their provider — real decisions required\n');

const appLog = ROOT + '/' + OUT + '_static.log';
try { fs.unlinkSync(appLog); } catch (_) {}
const app = spawn('node', [ROOT + '/_ft_static_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: '3999' }) });
const al = fs.createWriteStream(appLog); app.stdout.pipe(al); app.stderr.pipe(al);
let appUp = false;
for (let i = 0; i < 60 && !appUp; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(appLog, 'utf8'); } catch (_) {}
  if (/listening|serving/i.test(t)) appUp = true; else if (/CANNOT BIND|EADDRINUSE/i.test(t)) break;
}
if (!appUp) { console.error('the app origin did not come up on 3999'); process.exit(2); }

const stubLog = ROOT + '/' + OUT + '_fwd.log';
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
if (!bound) { console.error('the forwarder did not bind ' + PORT); process.exit(2); }

const env = Object.assign({}, process.env, {
  SB_ORIGIN: 'http://localhost:3999',
  SB_MODEL_ORIGIN: 'http://localhost:' + PORT,
  SB_OUT: OUT,
  SB_STARTER: 'starter_the_first_taste', SB_MAX_SCENES: '3',
  SB_NO_RETRY: '1', SB_GENERAL_PROSE: '1',
  SB_EDITOR_LOCAL_SCENES: '1,2',
  SB_EDITOR_DIRECT: '1',
  SB_RESTORE_PETITION_GATE: '1',
  SB_RUN_CONFIG: JSON.stringify({
    generalAuthorModel: 'gpt-6-luna', generalAuthorMaxTokens: 16000,
    plannerModel: 'gpt-6-luna', plannerMaxTokens: 10000, reasoningEffort: 'medium',
    skeletonModel: 'gpt-6-luna', skeletonMaxTokens: 10000,
  }),
});
['SB_PLAN_ONLY', 'SB_PLAN_FIXTURE', 'SB_OFFLINE', 'SB_FORCE_OPENER',
 'SB_REUSE_SCENE_PLANNER', 'SB_REUSE_SCAFFOLD'].forEach((k) => { delete env[k]; });

const logPath = ROOT + '/' + OUT + '.log';
const log = fs.createWriteStream(logPath);
const kid = spawn('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run-resume', CEILING,
  ROOT + '/_ft_fixtures/scene3_paid.json'], { cwd: ROOT, env });
kid.stdout.pipe(log); kid.stderr.pipe(log);
const read = () => { try { return fs.readFileSync(logPath, 'utf8'); } catch (_) { return ''; } };

// THE READER TURN IS WRITTEN THE MOMENT THE RUN ASKS FOR IT, in this same process: the runner
// waits 30 minutes for NEXT_ACTION.json, and splitting that across tool calls has cost two paid
// launches before.
let runDir = null, wrote = false;
const poll = setInterval(() => {
  const t = read();
  if (!runDir) { const m = t.match(/page written to (\S+)/); if (m) runDir = path.dirname(m[1]); else return; }
  if (!wrote && /waiting for a reader choice/.test(t)) {
    fs.writeFileSync(runDir + '/NEXT_ACTION.json', JSON.stringify({
      petition: WISH, action: DO, dialogue: SAY }, null, 2));
    console.log('  → reader turn written: sealed Petition + typed Say/Do');
    wrote = true;
  }
}, 2000);
setTimeout(() => { try { kid.kill('SIGTERM'); } catch (_) {} }, 1500000);
await new Promise((res) => kid.on('exit', res));
clearInterval(poll);
try { stub.kill('SIGTERM'); } catch (_) {}
try { app.kill('SIGTERM'); } catch (_) {}
await new Promise((r) => setTimeout(r, 1200));

const txt = read();
const base = ROOT + '/' + OUT;
const dir = (() => {
  try {
    const runs = fs.readdirSync(base).filter((f) => /^run_/.test(f))
      .map((f) => ({ f, t: fs.statSync(base + '/' + f).mtimeMs })).sort((a, b) => b.t - a.t);
    return runs.length ? base + '/' + runs[0].f + '/' : base + '/';
  } catch (_) { return base + '/'; }
})();
const rd = (f) => { try { return fs.readFileSync(dir + f, 'utf8'); } catch (_) { return ''; } };
console.log('\n  artifacts: ' + dir.replace(ROOT + '/', ''));

// ── THE PUBLISHED PAGE, FROM THE REOPENED SAVE ───────────────────────────────────────────
const plain = (h) => String(h || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n').trim();
let page = '', pageCount = 0;
try {
  const st = JSON.parse(rd('RESUMABLE_STATE.json'));
  const saved = JSON.parse(String((st.storage || {}).sb_saved_story || '{}'));
  const pages = saved.storyPages || [];
  pageCount = pages.length;
  const last = pages[pages.length - 1];
  page = plain(typeof last === 'string' ? last : (last && (last.content || last.html || last.text)));
} catch (e) { console.log('  could not read the save: ' + e.message); }
console.log('\n' + '═'.repeat(74));
console.log('THE PUBLISHED SCENE 3 — from the reopened save (' + pageCount + ' pages)');
console.log('═'.repeat(74) + '\n');
console.log(page || '(no page in the save)');
if (page) fs.writeFileSync(ROOT + '/_FT_SCENE3_PUBLISHED.txt', page);

// ── BOTH EDITOR VERDICTS ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(74));
console.log('THE TWO EDITORS — WHAT EACH KEPT OR CHANGED');
console.log('═'.repeat(74));
let proof = null; try { proof = JSON.parse(rd('EDITOR_OFFLINE_PROOF.json')); } catch (_) {}
const eg = (proof && proof.egress) || [];
console.log('  egress attempts: ' + eg.length);
eg.forEach((e, i) => console.log('    #' + (i + 1) + ' ' + String(e.requested).slice(0, 52)
  + '  [' + e.outcome + ']'));
txt.split('\n').filter((l) => /EDITOR|CPLUS|C\+|PICTURE|PICTURAB/i.test(l)
  && /verdict|kept|changed|accepted|rejected|ANSWERED|HELD|status|decision|eligible|\bno\b/i.test(l))
  .slice(0, 24).forEach((l) => console.log('  ' + l.trim().slice(0, 180)));
['CPLUS_EDITOR.json', 'CPLUS_VERDICT.json', 'EDITOR_DECISIONS.json', 'PICTURABILITY.json']
  .forEach((f) => { const c = rd(f); if (c) console.log('\n  ' + f + ':\n  ' + c.slice(0, 1500)); });

// ── SPEND ────────────────────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(74));
console.log('SPEND');
txt.split('\n').filter((l) => /SETTLED from real usage|ESTIMATED, no receipt|HELD, outcome|committed against|REMAINING|BUDGET HALT/.test(l))
  .forEach((l) => console.log('  ' + l.trim()));
const fwd = (() => { try { return (fs.readFileSync(stubLog, 'utf8').match(/\[FWD\] #\d+/g) || []).length; } catch (_) { return -1; } })();
console.log('  calls forwarded to the provider: ' + fwd);
console.log('  scene 1/2 editor calls kept local: '
  + (txt.match(/EDITOR ANSWERED LOCALLY/g) || []).length);
console.log('\n  author routing: ');
txt.split('\n').filter((l) => /base author resolved|ROUTER: scene 3/.test(l)).slice(0, 4)
  .forEach((l) => console.log('    ' + l.trim().slice(0, 150)));
console.log('\n  page: _FT_SCENE3_PUBLISHED.txt · trace: ' + OUT + '.log');
