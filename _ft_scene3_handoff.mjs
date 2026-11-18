// SCENE 3 HANDOFF, OFFLINE: DO BOTH READER INPUTS REACH LUNA? (Roman 2026-11-18)
//
// The gate check proved the two inputs are accepted and that the turn starts. It could not prove
// delivery, because refusing every route stops the chain at NORMALIZATION before the author
// request exists. This arm serves the setup replies instead, so the turn runs all the way to
// Luna's request, captures it at the gate, and refuses it. No provider is contacted.
//
// It also proves the safety rule: SB_OFFLINE and SB_EDITOR_DIRECT are set TOGETHER, and offline
// must win — no editor call may leave the machine.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/romantsukerman/storybound-app';
const OUT = '_ft_scene3_handoff';
const SAVE = ROOT + '/_ft_scene2_published/RESUMABLE_STATE.json';
const PORT = 3992;
const WISH = 'To hear Roman’s answer without the gala deciding what mine means.';
const DO = 'Hold my ground at the counter and ask for the footage.';
const SAY = 'Send me the uncut segment.';

let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 300)) : '')); } else console.log('  ✓ ' + nm); };

fs.copyFileSync(SAVE, ROOT + '/_ft_fixtures/scene3.json');

console.log('SCENE 3 HANDOFF — OFFLINE');
console.log('  wish : ' + WISH);
console.log('  do   : ' + DO);
console.log('  say  : ' + SAY);
console.log('  SB_OFFLINE=1 AND SB_EDITOR_DIRECT=1 together — offline must win\n');

const stubLog = ROOT + '/' + OUT + '_stub.log';
try { fs.unlinkSync(stubLog); } catch (_) {}
// SERVE THE LOCAL BUILD OURSELVES. The Scene 2 prose run depended on a static server left
// running from an earlier session; killing it made this run die on ERR_CONNECTION_REFUSED at
// localhost:3999. A harness that needs an origin should start it, not inherit it.
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
console.log('  app origin up on 3999');

// The SETUP server answers the small setup calls so the turn reaches the author, and refuses
// PRIMARY_AUTHOR at any size. The pure forwarder cannot be used here: it answers nothing, so the
// chain would die at normalization exactly as it did in the gate check.
const stub = spawn('node', [ROOT + '/_ft_setup_reply_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: String(PORT), SB_SETUP_DO: DO, SB_SETUP_SAY: SAY }) });
const sl = fs.createWriteStream(stubLog); stub.stdout.pipe(sl); stub.stderr.pipe(sl);
let bound = false;
for (let i = 0; i < 60 && !bound; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(stubLog, 'utf8'); } catch (_) {}
  if (/\[SETUP\] listening on /.test(t)) bound = true; else if (/CANNOT BIND/.test(t)) break;
}
if (!bound) { console.error('the forwarder did not bind ' + PORT); process.exit(2); }

const env = Object.assign({}, process.env, {
  SB_ORIGIN: 'http://localhost:3999',
  SB_MODEL_ORIGIN: 'http://localhost:' + PORT,
  SB_OUT: OUT,
  SB_STARTER: 'starter_the_first_taste', SB_MAX_SCENES: '3',
  SB_NO_RETRY: '1', SB_GENERAL_PROSE: '1', SB_EDITOR_LOCAL_SCENES: '1',
  SB_PLAN_ONLY: '1',
  // NO SB_OFFLINE on this arm. It refuses at the dispatch site, so the setup calls never reach
  // the setup server and the turn dies at normalization — which is what made the first two
  // attempts report an absent author request. Here the SETUP SERVER is the offline boundary: it
  // answers three setup roles, refuses everything else and forwards nothing, so no provider can
  // be contacted. The forwarder/answered tallies at the end are the proof.
  SB_EDITOR_DIRECT: '1',
  SB_RESTORE_PETITION_GATE: '1',
  SB_REUSE_SCENE_PLANNER: '_ft_preserved_planning/PAID2_PLANNER_REPLAY.json',
  SB_REUSE_SCAFFOLD: '_ft_preserved_planning/PAID2_SCAFFOLD_REPLAY.json',
  SB_RUN_CONFIG: JSON.stringify({
    generalAuthorModel: 'gpt-6-luna', generalAuthorMaxTokens: 16000,
    plannerModel: 'gpt-6-luna', plannerMaxTokens: 10000, reasoningEffort: 'medium',
    skeletonModel: 'gpt-6-luna', skeletonMaxTokens: 10000,
  }),
});
delete env.SB_PLAN_FIXTURE; delete env.SB_FORCE_OPENER;

const logPath = ROOT + '/' + OUT + '.log';
const log = fs.createWriteStream(logPath);
const kid = spawn('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run-resume', '0.05',  // positive ceiling required: "the ceiling IS the authorization"
  ROOT + '/_ft_fixtures/scene3.json'], { cwd: ROOT, env });
kid.stdout.pipe(log); kid.stderr.pipe(log);
const read = () => { try { return fs.readFileSync(logPath, 'utf8'); } catch (_) { return ''; } };

// THE READER TURN AND THE LAUNCH GO TOGETHER: the runner waits for NEXT_ACTION.json, and a
// turn written from a later tool call has cost two paid launches before.
let runDir = null, wrote = false;
const poll = setInterval(() => {
  const t = read();
  if (!runDir) { const m = t.match(/page written to (\S+)/); if (m) runDir = path.dirname(m[1]); else return; }
  if (!wrote && /waiting for a reader choice/.test(t)) {
    fs.writeFileSync(runDir + '/NEXT_ACTION.json', JSON.stringify({
      petition: WISH, action: DO, dialogue: SAY }, null, 2));
    console.log('  → reader turn written: petition + typed Say/Do');
    wrote = true;
  }
}, 2000);
setTimeout(() => { try { kid.kill('SIGTERM'); } catch (_) {} }, 900000);
await new Promise((res) => kid.on('exit', res));
clearInterval(poll);
try { stub.kill('SIGTERM'); } catch (_) {}
try { app.kill('SIGTERM'); } catch (_) {}
await new Promise((r) => setTimeout(r, 1000));

const txt = read();
// There is no LATEST symlink: resolve the newest run_* directory, or every artifact read
// silently returns '' and the checks report absence that is really a bad path.
const dir = (() => {
  const base = ROOT + '/' + OUT;
  try {
    const runs = fs.readdirSync(base).filter((f) => /^run_/.test(f))
      .map((f) => ({ f, t: fs.statSync(base + '/' + f).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    return runs.length ? base + '/' + runs[0].f : base + '/LATEST';
  } catch (_) { return base + '/LATEST'; }
})();
console.log('\n  artifacts: ' + dir.replace(ROOT + '/', ''));
const rd = (f) => { try { return fs.readFileSync(dir + '/' + f, 'utf8'); } catch (_) { return ''; } };

console.log('\nTHE GATE, RESTORED FROM THE SAVE’S OWN FLAGS');
txt.split('\n').filter((l) => /SAVE’S OWN GATE STATE|PETITION GATE RESTORED/.test(l))
  .forEach((l) => console.log('  ' + l.trim().slice(0, 240)));
let gateRec = null; try { gateRec = JSON.parse(rd('PETITION_GATE_RESTORE.json')); } catch (_) {}
ck('the gate was restored from the save, not asserted',
  !!gateRec && gateRec.fromSave && gateRec.fromSave.awaitingArm === true,
  JSON.stringify(gateRec && gateRec.fromSave));
ck('completed onboarding was left alone',
  !!gateRec && gateRec.after && gateRec.after.deckExamineFired === gateRec.before.deckExamineFired);

console.log('\nTHE PETITION, THROUGH THE REAL CONTROLS');
txt.split('\n').filter((l) => /PETITION through the real UI/.test(l))
  .forEach((l) => console.log('  ' + l.trim().slice(0, 220)));
let sealed = null;
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  if (/^PETITION_SEALED_scene/.test(f)) { try { sealed = JSON.parse(rd(f)); } catch (_) {} }
}
ck('the wish was sealed through #petitionInput + #btnSealPetition',
  !!sealed && !!sealed.pendingAfter, sealed && (sealed.why || sealed.toast));

// ── LUNA'S ACTUAL SCENE 3 REQUEST ────────────────────────────────────────────────────────
let reqs = []; try { reqs = JSON.parse(rd('requests.json')) || []; } catch (_) {}
const luna = reqs.filter((q) => String(q.model || '') === 'gpt-6-luna'
  && Number(q.maxTokens || 0) >= 16000 && String(q.role || '') === 'PRIMARY_AUTHOR')
  .sort((a, b) => Number(b.chars || 0) - Number(a.chars || 0))[0] || null;
console.log('\nLUNA’S SCENE 3 AUTHOR REQUEST');
ck('an author request was built for Scene 3', !!luna,
  'captured roles: ' + [...new Set(reqs.map((q) => q.role))].join(', '));
const A = luna ? String(luna.bodyText || '') : '';
if (luna) console.log('  #' + luna.reqId + '  ' + luna.chars + ' chars  model=' + luna.model
  + '  max_tokens=' + luna.maxTokens);

console.log('\nDO BOTH READER INPUTS REACH IT?');
ck('the sealed WISH reached Luna', A.indexOf('without the gala deciding what mine means') !== -1);
ck('the DO reached Luna', A.indexOf('Hold my ground at the counter') !== -1);
ck('the SAY reached Luna', A.indexOf('Send me the uncut segment') !== -1);
ck('the wish is carried as a WISH, not folded into the action',
  /PETITION|wish|petitioned/i.test(A) && A.indexOf('without the gala deciding what mine means') !== -1);

// ── THE EXISTING FATE RULES, AS DELIVERED ────────────────────────────────────────────────
console.log('\nTHE FATE RULES ON THE REQUEST');
const has = (rx) => rx.test(A);
const show = (nm, rx) => {
  const m = A.match(rx);
  console.log('  ' + (m ? '✓' : '✗') + ' ' + nm + (m ? ('   …' + String(m[0]).replace(/\s+/g, ' ').slice(0, 150)) : ''));
  return !!m;
};
ck('the wish must be VOICED by Dani', show('voiced wish', /gives?\s+voice|voices?\s+(the|her)\s+wish|speaks?\s+(the|her)\s+wish|say[s]?\s+it\s+aloud|aloud/i));
ck('a SUBTLE OMEN must follow', show('subtle omen', /omen|the world answers|a small sign|subtle(?!\w)/i));
ck('the wish must actually MANIFEST, not be promised',
  show('manifestation, not a promise', /manifest|actually (hear|happen)|comes true|grant(ed|s)?|fulfil/i));
ck('the close returns Petition to the deck', show('petition back into the deck', /slides?[^.]{0,40}back into the deck|returns?[^.]{0,30}to the deck|back into the deck/i));
ck('the red Tempt Fate card appears', show('red Tempt Fate card', /Tempt Fate/i));
ck('the static shock lands', show('static shock', /static|shock/i));
ck('and the reader’s next choice stays open',
  show('choice left open', /do NOT resolve|leave[^.]{0,40}open|reader (chooses|decides)|open choice/i));

// ── OFFLINE MUST OUTRANK DIRECT ──────────────────────────────────────────────────────────
console.log('\nSB_OFFLINE vs SB_EDITOR_DIRECT');
let proof = null; try { proof = JSON.parse(rd('EDITOR_OFFLINE_PROOF.json')); } catch (_) {}
const eg = (proof && proof.egress) || [];
console.log('  egress attempts: ' + eg.length + '  outcomes: ' + JSON.stringify(eg.map((e) => e.outcome)));
ck('no editor egress was sent off-machine',
  eg.every((e) => !e.sentTo || /localhost|127\.0\.0\.1/.test(String(e.sentTo))),
  JSON.stringify(eg.filter((e) => e.sentTo && !/localhost|127\.0\.0\.1/.test(String(e.sentTo)))));
ck('and where both flags were set, OFFLINE won',
  eg.length === 0 || eg.some((e) => /overrides_direct|refused_offline/.test(String(e.outcome)))
  || eg.every((e) => /loopback/.test(String(e.outcome))),
  JSON.stringify(eg.map((e) => e.outcome)));
const stubTxt = (() => { try { return fs.readFileSync(stubLog, 'utf8'); } catch (_) { return ''; } })();
const fwd = (stubTxt.match(/\[FWD\] #\d+/g) || []).length;
console.log('  calls that left for a provider: ' + fwd);
console.log('  setup server: ' + (stubTxt.match(/\[SETUP\] answered [^\n]*/) || ['(no tally)'])[0]);
ck('NO provider was contacted by this run', fwd === 0, fwd + ' call(s) were forwarded');
ck('the setup server never ANSWERED an author call',
  !/\[SETUP\] PRIMARY_AUTHOR \u2190/.test(stubTxt)
  && !/\[SETUP\] answered[^\n]*PRIMARY_AUTHOR/.test(stubTxt),
  'it answered PRIMARY_AUTHOR');

console.log('\nWHAT WAS REFUSED, AND WHAT IT WOULD HAVE COST');
txt.split('\n').filter((l) => /not reserved|PLAN-ONLY: refused/.test(l)).slice(0, 10)
  .forEach((l) => console.log('  ' + l.trim().slice(0, 165)));

if (A) fs.writeFileSync(ROOT + '/_FT_SCENE3_AUTHOR_REQUEST.txt', A);
fs.writeFileSync(ROOT + '/_FT_SCENE3_HANDOFF.json', JSON.stringify({
  gate: gateRec, sealed: sealed && { text: sealed.pendingAfter && sealed.pendingAfter.text },
  author: luna && { reqId: luna.reqId, chars: luna.chars, model: luna.model, maxTokens: luna.maxTokens },
  carries: { wish: A.indexOf('without the gala deciding') !== -1, action: A.indexOf('Hold my ground') !== -1,
    say: A.indexOf('Send me the uncut segment') !== -1 },
  forwarded: fwd, editorEgress: eg.map((e) => e.outcome), checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  request: _FT_SCENE3_AUTHOR_REQUEST.txt · trace: ' + OUT + '.log');
process.exit(bad ? 1 : 0);
