// ONE PROVIDER-BLOCKED REPLAY OF SCENE 4 THROUGH THE REAL EDITOR PATH (Roman 2026-11-18)
//
// The handoff fix was proven by lifting cpEditorDue and driving it directly. That shows the
// scheduler behaves; it does NOT show that the request the editor actually posts carries the
// obligations. This runs the browser's normal path — page -> /api/cplus-editor -> the real
// handler -> its own outbound fetch — with that fetch redirected to a capture server, and reads
// the obligations off the body that was really sent.
//
// Scene 4's prose and planning are REPLAYED from its own saved responses, so nothing is
// regenerated and no provider is contacted.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/romantsukerman/storybound-app';
const OUT = '_ft_scene4_replay';
const BASE = ROOT + '/_ft_scene3_published/RESUMABLE_STATE.json';
const COPY = ROOT + '/_ft_fixtures/scene4_replay.json';
const CAP = ROOT + '/_ft_scene4_replay_capture.json';
const PORT = 3988;
const DO = 'Push the entrance cards back across the counter and tell him to fix the broadcast himself.';
const SAY = 'Call the station and retract it. Then I’ll think about your gala.';

let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 300)) : '')); } else console.log('  ✓ ' + nm); };

// Resume from the Scene 3 baseline with Scene 3's physical beat recorded, so Scene 4's turn
// raises SOCIAL and CAPABILITY exactly as the paid run did.
const PAGE3 = fs.readFileSync(ROOT + '/_FT_SCENE3_PUBLISHED.txt', 'utf8');
const s3 = PAGE3.indexOf('I had prepared myself to dislike');
const e3 = PAGE3.indexOf('finish the thought.', s3);
const PHYS = PAGE3.slice(s3, e3 + 'finish the thought.'.length);
const dump = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const saved = JSON.parse(String(dump.storage.sb_saved_story));
saved.stateSnapshot._liAdmirationLedger = {
  storyId: String(saved.stateSnapshot.storyId || ''),
  issue: saved.stateSnapshot.issueIndexInRun || 1, issueKey: 'issueIndexInRun',
  areas: {
    physical: { status: 'delivered', beats: [{ scene: 3, passage: PHYS, why: 'recorded baseline',
      via: 'author-passage', semanticallyVerified: false, recordedAt: new Date().toISOString() }] },
    social: { status: 'owed', beats: [] },
    capability: { status: 'owed', beats: [] },
  },
};
dump.storage.sb_saved_story = JSON.stringify(saved);
fs.writeFileSync(COPY, JSON.stringify(dump, null, 2));
try { fs.unlinkSync(CAP); } catch (_) {}

console.log('SCENE 4 — PROVIDER-BLOCKED REPLAY THROUGH THE REAL EDITOR PATH');
console.log('  prose + planning replayed from Scene 4’s own saved responses');
console.log('  coverage at the start: physical delivered, SOCIAL and CAPABILITY owed\n');

const appLog = ROOT + '/' + OUT + '_static.log';
try { fs.unlinkSync(appLog); } catch (_) {}
const app = spawn('node', [ROOT + '/_ft_static_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: '3999' }) });
const al = fs.createWriteStream(appLog); app.stdout.pipe(al); app.stderr.pipe(al);
let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(appLog, 'utf8'); } catch (_) {}
  if (/listening|serving/i.test(t)) up = true; else if (/CANNOT BIND|EADDRINUSE/i.test(t)) break;
}
if (!up) { console.error('the app origin did not come up on 3999'); process.exit(2); }

const repLog = ROOT + '/' + OUT + '_server.log';
try { fs.unlinkSync(repLog); } catch (_) {}
const rep = spawn('node', [ROOT + '/_ft_scene4_replay_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: String(PORT), SB_CAPTURE_OUT: CAP }) });
const rl = fs.createWriteStream(repLog); rep.stdout.pipe(rl); rep.stderr.pipe(rl);
let bound = false;
for (let i = 0; i < 60 && !bound; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(repLog, 'utf8'); } catch (_) {}
  if (/\[REPLAY\] listening on /.test(t)) bound = true; else if (/CANNOT BIND/.test(t)) break;
}
if (!bound) { console.error('the replay server did not bind ' + PORT); process.exit(2); }

const env = Object.assign({}, process.env, {
  SB_ORIGIN: 'http://localhost:3999',
  // Everything model-side goes to the replay server, and the editor's own egress is redirected
  // there too by the runner's guard. SB_EDITOR_DIRECT is deliberately NOT set.
  SB_MODEL_ORIGIN: 'http://localhost:' + PORT,
  SB_OUT: OUT,
  SB_STARTER: 'starter_the_first_taste', SB_MAX_SCENES: '4',
  SB_NO_RETRY: '1', SB_GENERAL_PROSE: '1',
  SB_RUN_CONFIG: JSON.stringify({
    generalAuthorModel: 'gpt-6-luna', generalAuthorMaxTokens: 16000,
    plannerModel: 'gpt-6-luna', plannerMaxTokens: 10000, reasoningEffort: 'medium',
    skeletonModel: 'gpt-6-luna', skeletonMaxTokens: 10000,
  }),
});
['SB_PLAN_ONLY', 'SB_PLAN_FIXTURE', 'SB_OFFLINE', 'SB_EDITOR_DIRECT', 'SB_EDITOR_LOCAL_SCENES',
 'SB_FORCE_OPENER', 'SB_REUSE_SCENE_PLANNER', 'SB_REUSE_SCAFFOLD', 'SB_RESTORE_PETITION_GATE']
  .forEach((k) => { delete env[k]; });

const logPath = ROOT + '/' + OUT + '.log';
const log = fs.createWriteStream(logPath);
// THE CEILING IS A HARNESS COUNTER HERE, NOT AN AUTHORIZATION. Replayed replies have their
// receipts stripped on purpose (a replayed receipt once settled $0.013944 that was never spent),
// so every call RESERVES and never settles. Those holds accumulate: at $0.05 the run halted
// before the author and therefore before the editors this test exists to observe. Nothing can
// reach a provider - SB_MODEL_ORIGIN is the replay server, which forwards nothing, and the
// editor's own egress is redirected to it as well.
const kid = spawn('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run-resume', '5.00', COPY],
  { cwd: ROOT, env });
kid.stdout.pipe(log); kid.stderr.pipe(log);
const read = () => { try { return fs.readFileSync(logPath, 'utf8'); } catch (_) { return ''; } };

let runDir = null, wrote = false;
const poll = setInterval(() => {
  const t = read();
  if (!runDir) { const m = t.match(/page written to (\S+)/); if (m) runDir = path.dirname(m[1]); else return; }
  if (!wrote && /waiting for a reader choice/.test(t)) {
    fs.writeFileSync(runDir + '/NEXT_ACTION.json', JSON.stringify({ action: DO, dialogue: SAY }, null, 2));
    console.log('  → reader turn written (the same one Scene 4 was written from)');
    wrote = true;
  }
}, 2000);
setTimeout(() => { try { kid.kill('SIGTERM'); } catch (_) {} }, 900000);
await new Promise((res) => kid.on('exit', res));
clearInterval(poll);
try { rep.kill('SIGTERM'); } catch (_) {}
try { app.kill('SIGTERM'); } catch (_) {}
await new Promise((r) => setTimeout(r, 1200));

const txt = read();
const srvTxt = (() => { try { return fs.readFileSync(repLog, 'utf8'); } catch (_) { return ''; } })();
let caps = [];
try { caps = JSON.parse(fs.readFileSync(CAP, 'utf8')); } catch (_) {}

console.log('\nWHAT THE REPLAY SERVER DID');
console.log('  ' + (srvTxt.match(/\[REPLAY\] captured [^\n]*/) || ['(no tally)'])[0]);
console.log('  replayed: ' + (srvTxt.match(/\[REPLAY\] [A-Z_]+ #\d+/g) || []).length + ' saved reply(ies)');
console.log('  captured editor requests: ' + caps.length);
caps.forEach((c) => console.log('    ' + c.kind + '  ' + c.chars + ' chars  model=' + c.model));
// ── NO PROVIDER WAS CONTACTED: THE EVIDENCE IS THE DESTINATIONS ────────────────────────
// Zero settled spend does NOT establish this. Every replayed reply has its receipt stripped, so
// a call that genuinely left the machine would ALSO settle $0 — the figure is silent on where a
// request went. What answers it is the recorded destination of every request the server handled,
// plus the fact that the server has no outbound path to use.
const settled = (txt.match(/SETTLED from real usage\s*:\s*\$([0-9.]+)/) || [])[1];
let dests = [];
try { dests = JSON.parse(fs.readFileSync(ROOT + '/_ft_scene4_replay_destinations.json', 'utf8')); } catch (_) {}
const offMachine = dests.filter((d) => !/^(disk:|answered-in-process|refused-503)/.test(String(d.dest)));
const serverSrc = fs.readFileSync(ROOT + '/_ft_scene4_replay_server.mjs', 'utf8');
// Count real fetch calls, not the two mentions inside the comment and the log line.
// Strip line comments and string literals before looking, so the phrase "no fetch()" inside a
// comment or a log message cannot read as an outbound call. The previous form counted one.
const realFetches = (serverSrc
  .replace(/\/\/[^\n]*/g, '')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""')
  .match(/\bfetch\s*\(/g) || []).length;
console.log('  recorded destinations: ' + dests.length + ' request(s), '
  + offMachine.length + ' off-machine');
const byHow = {};
dests.forEach((d) => { byHow[d.how] = (byHow[d.how] || 0) + 1; });
console.log('  how each was answered: ' + JSON.stringify(byHow));
console.log('  outbound calls in the replay server source: ' + realFetches);
ck('every request was answered from disk or in process',
  dests.length > 0 && offMachine.length === 0,
  JSON.stringify(offMachine.slice(0, 3)));
ck('the replay server has no outbound path at all', realFetches === 0,
  realFetches + ' fetch call(s) in the server');
ck('both editor requests were captured and answered, not relayed',
  dests.filter((d) => d.how === 'captured-and-answered').length === 2,
  JSON.stringify(byHow));
ck('and settled spend agrees at $0 (corroboration, not the proof)',
  settled === '0.000000', 'settled $' + settled);
ck('Scene 4’s prose came from the saved reply, not a new generation',
  (srvTxt.match(/\[REPLAY\] PRIMARY_AUTHOR #/g) || []).length > 0);

const craft = caps.filter((c) => c.kind === 'craft');
const pic = caps.filter((c) => c.kind === 'picturability');
const bodyText = (c) => JSON.stringify(c && c.body || '');

console.log('\nTHE CRAFT REQUEST THAT WAS ACTUALLY SENT');
ck('a craft request was captured', craft.length > 0);
const C = craft.map(bodyText).join('\n');
ck('it carries liadmire:social', /liadmire:social/.test(C));
ck('it carries liadmire:capability', /liadmire:capability/.test(C));
ck('the two ids are DISTINCT in the request', /liadmire:social/.test(C) && /liadmire:capability/.test(C));
ck('neither was rebuilt as cplus:roman_tusk', !/cplus:roman_tusk/.test(C), 'the name-derived id is present');
ck('the social instructions survived',
  /social admiration/.test(C) && /what the PC[^"]{0,40}finds compelling/.test(C));
ck('the capability instructions survived',
  /capability admiration/.test(C) && /demonstrated in action/.test(C));
ck('each still demands a verbatim quote', /QUOTE the passage/.test(C));
ck('and still refuses to keep when the draft does not deliver it', /do NOT keep/.test(C));
['social', 'capability'].forEach((a) => {
  const m = C.match(new RegExp('QUOTE the passage in this draft that delivers ' + a + '[^"\\\\]{0,170}'));
  if (m) console.log('    ' + a + ': ' + m[0].replace(/\\n/g, ' ').slice(0, 165));
});

console.log('\nTHE PICTURABILITY REQUEST THAT WAS ACTUALLY SENT');
ck('a picturability request was captured', pic.length > 0);
const P = pic.map(bodyText).join('\n');
ck('Dani is covered', /Dani/.test(P));
ck('Roman is covered', /Roman/.test(P));
ck('the producer is covered', /producer/i.test(P), 'the producer is absent from the picturability POST');
ck('existing description can earn a KEEP', /KEEP/.test(P));

console.log('\nTHE PAGE-SIDE LOGS  (these live in the run dir, not the runner log)');
const dir = (() => {
  try {
    const base = ROOT + '/' + OUT;
    const runs = fs.readdirSync(base).filter((f) => /^run_/.test(f))
      .map((f) => ({ f, t: fs.statSync(base + '/' + f).mtimeMs })).sort((a, b) => b.t - a.t);
    return runs.length ? base + '/' + runs[0].f + '/' : base + '/';
  } catch (_) { return ROOT + '/' + OUT + '/'; }
})();
const pageLog = (() => { try { return fs.readFileSync(dir + 'console.log', 'utf8'); } catch (_) { return ''; } })();
pageLog.split('\n').filter((l) => /LI-ADMIRE|PICTURE:ELIGIBLE|CPLUS:EDITOR\]/.test(l))
  .slice(0, 8).forEach((l) => console.log('  ' + l.trim().slice(0, 170)));
ck('the obligations were raised on the craft plan',
  /\[LI-ADMIRE:OBLIGATION\]/.test(pageLog), 'no obligation log');
ck('and they were NOT deferred as off-stage this time',
  !/not on stage in this scene/.test(pageLog)
  && !/is not present in this scene/.test(pageLog),
  (pageLog.match(/not (on stage|present) in this scene/g) || []).join(', '));

// ── THE STAGE FALLBACK'S PROVENANCE, AND ITS GUARDS ──────────────────────────────────────
console.log('\nTHE STAGE FALLBACK');
const obsLines = pageLog.split('\n').filter((l) => /\[STAGE:OBSERVED\]|STAGE-CONTRACT\] scene/.test(l));
obsLines.slice(0, 4).forEach((l) => console.log('  ' + l.trim().slice(0, 200)));
ck('the 900-byte stage-contract rejection is still VISIBLE, not suppressed',
  /STAGE-CONTRACT\] scene \d+ \u2014 REJECTED \(over_size_bound\)/.test(pageLog)
  || /REJECTED \(over_size_bound\)/.test(pageLog), 'the rejection is no longer logged');
ck('the fallback recorded explicit provenance for what it supplied',
  /\[STAGE:OBSERVED\][^\n]*the authored stage \([^)]*\) named nobody but the narrator/.test(pageLog),
  obsLines.join(' | ').slice(0, 200));
// THE REF IN THE REQUEST IS THE EVIDENCE, not a log string: the per-entry source is recorded on
// the stage object, which never reaches the console. Before the registry resolution the craft
// POST carried `cplusbeat:named:homecoming_producer#1@unasked-favor` — a ref minted from the
// observed label. It must now carry the ledger's own plot: ref.
ck('the producer kept his CANONICAL identity from the cast registry',
  /plot:[a-z0-9_]*:primary_antagonist/.test(C),
  'the craft request has no plot: ref for the producer');
ck('and he is NOT re-minted from the observed label',
  !/named:homecoming_producer/.test(C), 'a minted named: ref is still present');
ck('the roster shows his ledger label, not the probe\u2019s short form',
  /The station\u2019s homecoming producer|station's homecoming producer/.test(pageLog),
  (pageLog.match(/PICTURE:ELIGIBLE[^\n]{0,120}/) || [''])[0]);
ck('nobody was staged as unregistered',
  !/unregistered/.test(pageLog), (pageLog.match(/unregistered[^\n]{0,80}/) || [''])[0]);

// A PREVIOUS SCENE'S CAST MUST NOT POPULATE A NEW ONE. The stamp is what prevents it, so it is
// tested directly against the shipped resolver rather than argued from the code.
console.log('\nCONTROL \u2014 A PREVIOUS SCENE\u2019S CAST CANNOT POPULATE A NEW SCENE');
const stamps = pageLog.split('\n').filter((l) => /\[STAGE:OBSERVED\][^\n]*REFUSED/.test(l));
stamps.slice(0, 3).forEach((l) => console.log('  ' + l.trim().slice(0, 180)));
const appSrc = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
ck('the fallback requires a stamp naming THIS story',
  /belongs to story /.test(appSrc) && /_stamp\.storyId/.test(appSrc));
ck('and a stamp naming THIS scene',
  /belongs to scene /.test(appSrc) && /Number\(_stamp\.scene\) !== Number\(_sceneN\)/.test(appSrc));
ck('an unstamped observation is refused outright',
  /carries no story\/scene stamp/.test(appSrc));
ck('the probe is stamped wherever it is written',
  (appSrc.match(/_lastProbeStamp = \{/g) || []).length === 3,
  (appSrc.match(/_lastProbeStamp = \{/g) || []).length + ' stamp site(s)');

console.log('\nSPEND');
txt.split('\n').filter((l) => /SETTLED from real usage|committed against|REMAINING/.test(l))
  .forEach((l) => console.log('  ' + l.trim()));

fs.writeFileSync(ROOT + '/_FT_SCENE4_REPLAY.json', JSON.stringify({
  captured: caps.map((c) => ({ kind: c.kind, chars: c.chars, model: c.model })),
  checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  captures: _ft_scene4_replay_capture.json · trace: ' + OUT + '.log');
process.exit(bad ? 1 : 0);
