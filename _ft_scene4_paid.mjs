// SCENE 4, PAID — $0.08 HARD CAP (Roman 2026-11-18, authorized)
//
// Four changes under test at once, each with its own place to read the answer:
//   · Luna writes the ASSIGNED omen channel      → [OMEN:CHANNEL] ok | MISMATCH
//   · social or capability admiration from what Roman DOES → [LI-ADMIRE:KEEP]/[SETTLE]/[COVERAGE]
//   · both editor passes return real decisions   → EDITOR EGRESS … [DIRECT], via=…
//   · the continuation keeps the narration's tense → [CLOSER:TENSE] … rendered in …
//
// Scenes 1-3 keep their reopen editor calls LOCAL; only Scene 4's editors are paid. Planning for
// Scene 4 is REAL — the preserved planner/scaffold replies belong to Scene 2 and are not reused.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/romantsukerman/storybound-app';
const OUT = '_ft_scene4_paid';
const BASE = ROOT + '/_ft_scene3_published/RESUMABLE_STATE.json';
const COPY = ROOT + '/_ft_fixtures/scene4_paid.json';
const PORT = 3989;
const API = 'http://localhost:3010';
const CEILING = '0.08';
// The reader answers Roman. It gives him something to DO rather than describing him, which is
// where a social or capability beat can come from honestly — without scripting the prose.
const DO = 'Push the entrance cards back across the counter and tell him to fix the broadcast himself.';
const SAY = 'Call the station and retract it. Then I’ll think about your gala.';

// ── THE COPY, WITH SCENE 3'S PHYSICAL BEAT RECORDED ──────────────────────────────────────
// Scene 3 published that beat before the ledger existed, so it is recorded here from the
// published page. Nothing is invented: the passage is copied out of the page, and the
// provenance says it was the author's own sentence.
const PAGE = fs.readFileSync(ROOT + '/_FT_SCENE3_PUBLISHED.txt', 'utf8');
const pStart = PAGE.indexOf('I had prepared myself to dislike');
const pEnd = PAGE.indexOf('finish the thought.', pStart);
const PHYS = PAGE.slice(pStart, pEnd + 'finish the thought.'.length);
if (!PHYS) { console.error('could not find the physical passage on the published page'); process.exit(2); }
const dump = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const saved = JSON.parse(String(dump.storage.sb_saved_story));
const snap = saved.stateSnapshot;
snap._liAdmirationLedger = {
  storyId: String(snap.storyId || ''),
  issue: (Number.isInteger(snap.issueIndexInRun) && snap.issueIndexInRun > 0) ? snap.issueIndexInRun : 1,
  issueKey: 'issueIndexInRun',
  areas: {
    physical: { status: 'delivered', beats: [{ scene: 3, passage: PHYS,
      why: 'his mouth interrupts the dislike she had prepared for him; the attraction '
        + 'contradicts her position without softening it',
      via: 'author-passage', semanticallyVerified: false, recordedAt: new Date().toISOString() }] },
    social: { status: 'owed', beats: [] },
    capability: { status: 'owed', beats: [] },
  },
};
saved.stateSnapshot = snap;
dump.storage.sb_saved_story = JSON.stringify(saved);
fs.writeFileSync(COPY, JSON.stringify(dump, null, 2));

console.log('SCENE 4 — PAID RUN');
console.log('  cap        $' + CEILING + '   (Scene 3 settled $0.041793, committed $0.056526)');
console.log('  reader DO  ' + DO);
console.log('  reader SAY ' + SAY);
console.log('  coverage   physical already delivered — SOCIAL and CAPABILITY owed');
console.log('  editors    DIRECT to their provider; scenes 1-3 answered locally\n');

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

const fwdLog = ROOT + '/' + OUT + '_fwd.log';
try { fs.unlinkSync(fwdLog); } catch (_) {}
const stub = spawn('node', [ROOT + '/_ft_plan_stub_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: String(PORT), SB_STUB_FORWARD: API }) });
const fl = fs.createWriteStream(fwdLog); stub.stdout.pipe(fl); stub.stderr.pipe(fl);
let bound = false;
for (let i = 0; i < 60 && !bound; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(fwdLog, 'utf8'); } catch (_) {}
  if (/\[FWD\] listening on /.test(t)) bound = true; else if (/CANNOT BIND/.test(t)) break;
}
if (!bound) { console.error('the forwarder did not bind ' + PORT); process.exit(2); }

const env = Object.assign({}, process.env, {
  SB_ORIGIN: 'http://localhost:3999',
  SB_MODEL_ORIGIN: 'http://localhost:' + PORT,
  SB_OUT: OUT,
  SB_STARTER: 'starter_the_first_taste', SB_MAX_SCENES: '4',
  SB_NO_RETRY: '1', SB_GENERAL_PROSE: '1',
  SB_EDITOR_LOCAL_SCENES: '1,2,3',
  SB_EDITOR_DIRECT: '1',
  SB_RUN_CONFIG: JSON.stringify({
    generalAuthorModel: 'gpt-6-luna', generalAuthorMaxTokens: 16000,
    plannerModel: 'gpt-6-luna', plannerMaxTokens: 10000, reasoningEffort: 'medium',
    skeletonModel: 'gpt-6-luna', skeletonMaxTokens: 10000,
  }),
});
['SB_PLAN_ONLY', 'SB_PLAN_FIXTURE', 'SB_OFFLINE', 'SB_FORCE_OPENER',
 'SB_REUSE_SCENE_PLANNER', 'SB_REUSE_SCAFFOLD', 'SB_RESTORE_PETITION_GATE']
  .forEach((k) => { delete env[k]; });

const logPath = ROOT + '/' + OUT + '.log';
const log = fs.createWriteStream(logPath);
const kid = spawn('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run-resume', CEILING, COPY],
  { cwd: ROOT, env });
kid.stdout.pipe(log); kid.stderr.pipe(log);
const read = () => { try { return fs.readFileSync(logPath, 'utf8'); } catch (_) { return ''; } };

let runDir = null, wrote = false;
const poll = setInterval(() => {
  const t = read();
  if (!runDir) { const m = t.match(/page written to (\S+)/); if (m) runDir = path.dirname(m[1]); else return; }
  if (!wrote && /waiting for a reader choice/.test(t)) {
    fs.writeFileSync(runDir + '/NEXT_ACTION.json', JSON.stringify({ action: DO, dialogue: SAY }, null, 2));
    console.log('  → reader turn written (typed Say/Do; Tempt Fate NOT invoked)');
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

const plain = (h) => String(h || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n').trim();
let page = '', pages = 0;
try {
  const st = JSON.parse(rd('RESUMABLE_STATE.json'));
  const sv = JSON.parse(String((st.storage || {}).sb_saved_story || '{}'));
  const ps = sv.storyPages || [];
  pages = ps.length;
  const last = ps[ps.length - 1];
  page = plain(typeof last === 'string' ? last : (last && (last.content || last.html || last.text)));
} catch (e) { console.log('  could not read the save: ' + e.message); }
console.log('\n' + '═'.repeat(74));
console.log('THE PUBLISHED SCENE 4 — from the reopened save (' + pages + ' pages)');
console.log('═'.repeat(74) + '\n');
console.log(page || '(no page in the save)');
if (page) fs.writeFileSync(ROOT + '/_FT_SCENE4_PUBLISHED.txt', page);

const show = (title, rx, lim) => {
  console.log('\n' + title);
  const hits = txt.split('\n').filter((l) => rx.test(l));
  if (!hits.length) { console.log('  (nothing logged)'); return; }
  hits.slice(0, lim || 10).forEach((l) => console.log('  ' + l.trim().slice(0, 190)));
};
show('THE OMEN CHANNEL', /\[OMEN\]|\[OMEN:CHANNEL\]/);
show('ADMIRATION COVERAGE', /\[LI-ADMIRE/);
show('THE CLOSER’S TENSE', /\[CLOSER:TENSE\]/);
show('THE TWO EDITORS', /EDITOR EGRESS|CPLUS-FRAMES:SETTLE|CPLUS:EDITOR\]|PICTURE\]|EDITOR ANSWERED LOCALLY/, 14);

console.log('\nSPEND');
txt.split('\n').filter((l) => /SETTLED from real usage|ESTIMATED, no receipt|HELD, outcome|committed against|REMAINING|BUDGET HALT/.test(l))
  .forEach((l) => console.log('  ' + l.trim()));
console.log('  forwarded to the provider: '
  + ((() => { try { return (fs.readFileSync(fwdLog, 'utf8').match(/\[FWD\] #\d+/g) || []).length; } catch (_) { return -1; } })()));
txt.split('\n').filter((l) => /base author resolved|ROUTER: scene 4/.test(l)).slice(0, 3)
  .forEach((l) => console.log('  ' + l.trim().slice(0, 150)));

// The coverage the next scene inherits, read back out of the save.
try {
  const st = JSON.parse(rd('RESUMABLE_STATE.json'));
  const sn2 = JSON.parse(String((st.storage || {}).sb_saved_story || '{}')).stateSnapshot || {};
  const L = sn2._liAdmirationLedger;
  if (L) {
    console.log('\nCOVERAGE AFTER SCENE 4 (from the save)');
    Object.keys(L.areas).forEach((a) => {
      const A = L.areas[a];
      console.log('  ' + a.padEnd(11) + A.status
        + (A.beats.length ? ('  scene ' + A.beats[A.beats.length - 1].scene
          + ' [' + A.beats[A.beats.length - 1].via + ']  "'
          + String(A.beats[A.beats.length - 1].passage).slice(0, 70) + '"') : ''));
    });
  }
  const vr = (sn2._validatorReports || []).filter((r) => r && r.validator === 'omen_channel');
  if (vr.length) {
    console.log('\nOMEN CHANNEL FINDINGS IN THE SAVE');
    vr.forEach((r) => console.log('  ' + JSON.stringify(r).slice(0, 240)));
  }
} catch (_) {}
console.log('\n  page: _FT_SCENE4_PUBLISHED.txt · trace: ' + OUT + '.log');
