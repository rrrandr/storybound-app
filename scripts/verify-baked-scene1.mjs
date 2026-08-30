#!/usr/bin/env node
/**
 * verify-baked-scene1 — invariants for the baked Scene 1 feature.
 *
 * Every defect this guards against was an ORDERING or PLACEMENT bug, not a
 * logic bug: a gate placed after the API call it was supposed to precede, a
 * paid classifier reached before the override that suppresses it, story state
 * committed before the point where initialization still had to run. Those are
 * invisible to a syntax check and expensive to catch by hand, but they are
 * exactly what a static test can pin down.
 *
 * Run: node scripts/verify-baked-scene1.mjs   (npm run verify:baked)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(ROOT, 'public', 'app.js'), 'utf8');
const html = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');

let failures = 0;
let checks = 0;

function ok(cond, name, detail) {
  checks++;
  if (cond) { console.log(`  ok   ${name}`); return true; }
  failures++;
  console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`);
  return false;
}

/** Index of a needle, or -1. Reports both so ordering failures are debuggable. */
function at(hay, needle) { return hay.indexOf(needle); }

/** Assert `before` appears earlier in `text` than `after`. */
function ordered(text, before, after, name) {
  const i = at(text, before);
  const j = at(text, after);
  if (i === -1) return ok(false, name, `anchor not found: ${JSON.stringify(before.slice(0, 60))}`);
  if (j === -1) return ok(false, name, `anchor not found: ${JSON.stringify(after.slice(0, 60))}`);
  return ok(i < j, name, `expected earlier at ${i}, later at ${j}`);
}

/** The source of a top-level function: start of declaration to its closing
 *  2-space-indented brace. */
function fnBody(name) {
  const start = app.search(new RegExp(`\\n  (?:async )?function ${name}\\(`));
  if (start === -1) return null;
  const end = app.indexOf('\n  }\n', start);
  return end === -1 ? null : app.slice(start, end);
}

/**
 * Comments removed, so an assertion cannot be satisfied by prose.
 *
 * Mutation testing caught this twice: deleting a real call still passed, because
 * a nearby COMMENT mentioned the same identifier. Structural checks must look at
 * code. (This can only turn a would-be pass into a failure — never the reverse —
 * so a stripping mistake surfaces immediately rather than hiding a defect.)
 */
function codeOf(text) {
  return String(text || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

console.log('\n── packages ──');
const { STARTER_SCENE1 } = await import(
  'data:text/javascript,' +
  encodeURIComponent(
    'const window={};' +
    readFileSync(join(ROOT, 'public', 'starter-scenes.js'), 'utf8').replace('console.log', '(()=>{})') +
    ';export const STARTER_SCENE1 = window.STARTER_SCENE1;'
  )
);

const AMBIENT_TAGS = new Set(
  (readFileSync(join(ROOT, 'public', 'sound.js'), 'utf8')
    .match(/_SCENE_AMBIENT_FILES\s*=\s*\{([\s\S]*?)\n  \}/) || [, ''])[1]
    .match(/^\s{4}([a-z_]+):/gm)?.map(s => s.trim().replace(':', '')) || []
);

ok(Object.keys(STARTER_SCENE1).length === 3, 'three baked packages');
ok(!STARTER_SCENE1.starter_famous_fate,
  'Famous Fate has NO package (its world is named by the player — nothing to bake)');

for (const [id, p] of Object.entries(STARTER_SCENE1)) {
  ok(!!p.version && !!p.title && !!p.synopsis, `${id}: version / title / synopsis`);
  ok(!!p.ambient, `${id}: ships an ambient tag (or the mount fires a Grok classifier)`);
  ok(AMBIENT_TAGS.size === 0 || AMBIENT_TAGS.has(p.ambient),
    `${id}: ambient "${p.ambient}" is a real tag`, `known tags: ${[...AMBIENT_TAGS].join(', ')}`);
  ok(app.includes(`id: '${id}',`), `${id}: matches a STARTER_STORIES entry`);
  if (p.format === 'cg') {
    ok(Array.isArray(p.panels) && p.panels.length === 5, `${id}: 5 panels (gnPanelsPerScene is locked at 5)`);
    ok(p.endsAt === 'oas_interrupt', `${id}: declares its OAS ending`);
    ok(!!(p.oasHandoff && p.oasHandoff.openingFrame), `${id}: has an authored OAS opening frame`);
  } else {
    ok(typeof p.prose === 'string' && p.prose.length > 200, `${id}: prose present`);
  }
  for (const k of ['sceneSummary', 'openState', 'obligations', 'ledgerSeeds', 'calcification', 'axes', 'expansions']) {
    ok(p.emitted && p.emitted[k] != null, `${id}: emitted.${k}`);
  }
}

console.log('\n── zero-API guarantee ──');
// Opening a Book must not reach a paid call. Each of these fired a real request
// before it was guarded; the override has to come BEFORE the call it prevents.
const ambient = fnBody('_sceneAmbientClassifyPage');
ok(!!ambient, '_sceneAmbientClassifyPage found');
if (ambient) {
  ordered(codeOf(ambient), '_bakedFreeSceneActive()', 'callGrokSceneAmbientClassifier',
    'ambient: baked override precedes the Grok classifier call');
}
const reader = fnBody('showReaderPage');
ok(!!reader, 'showReaderPage found');
if (reader) {
  ordered(codeOf(reader), '_bakedFreeCover', 'generateCoverInGallery()',
    'cover: baked suppression precedes cover-stage generation');
}
ok(at(app, '[BAKED:ZERO-API VIOLATION]') !== -1 &&
   at(app, '[BAKED:ZERO-API VIOLATION]') < at(app, 'DEV TRACE (opt-in, off in production)'),
  'callChat carries the zero-API assertion, at the top');
ok(app.includes('!state._bakedSetupRunning'),
  'the assertion stands down while paid setup is legitimately running');

console.log('\n── gate reachability ──');
const ffHandler = app.slice(at(app, "$('famousFateBegin')?.addEventListener"));
ok(ffHandler.length > 0, 'famousFateBegin handler found');
// Anchor on the INVOCATION, not the identifier — the identifier also appears in
// the comments explaining why the gate sits above it.
ordered(codeOf(ffHandler), '[BAKED:GATE] Famous Fate blocked', 'await _ffFutureInstallmentClassify(',
  'Famous Fate: gate precedes the classifier call (the first API call)');
ordered(ffHandler, 'blocked pre-classifier — incomplete form', '[BAKED:GATE] Famous Fate blocked',
  'Famous Fate: world AND character validated before the gate shows');
ok(codeOf(ffHandler).includes('_ffEmbodyPre'),
  'Famous Fate: the character field is required, not just the world');

const mount = fnBody('_renderBakedScene1');
ok(!!mount, '_renderBakedScene1 found');
if (mount) {
  ok(codeOf(mount).includes('_mountBakedOASHandoff('),
    'CG: the baked mount installs the OAS handoff (the gate would be unreachable without it)');
  // The deferred-commit invariant. Committing here re-breaks Scene 2: entering
  // handleBeginStory with turnCount > 0 trips its Gap-2 guard, which wipes the story.
  ok(!/state\.turnCount\s*=\s*1/.test(codeOf(mount)),
    'commit deferred: the mount does not set turnCount');
  ok(!/state\.scenes\.push/.test(codeOf(mount)),
    'commit deferred: the mount does not push into scenes[]');
  ok(codeOf(mount).includes('_bakedPendingCommit'),
    'commit deferred: the scene is held in _bakedPendingCommit');
  ok(!/saveStorySnapshot/.test(codeOf(mount)),
    'no snapshot of an uncommitted story');
}

console.log('\n── Scene 2 initialization ──');
ok(app.includes('if (state._bakedSetupOnly) {'), 'handleBeginStory has a setup-only exit');
ordered(app, 'state._bakedSetupComplete = true;', '        let text;',
  'setup-only exit precedes the Scene-1 author dispatch');
const unlock = fnBody('_unlockBakedGenesis');
ok(!!unlock, '_unlockBakedGenesis found');
if (unlock) {
  ordered(codeOf(unlock), 'await handleBeginStory()', '_commitBakedScene()',
    'unlock: initialization runs BEFORE the scene is committed');
  ordered(codeOf(unlock), '_commitBakedScene()', 'state._bakedGenesisUnlocked = true',
    'unlock: the scene is committed before the gates release');
}

console.log('\n── wiring ──');
ok(html.includes('starter-scenes.js'), 'index.html loads starter-scenes.js');
ordered(html, 'starter-scenes.js', '/app.js?v=', 'starter-scenes.js loads before app.js');

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════
// Textual ordering cannot see control flow, and control flow is where the last
// two defects lived: a failed initialization that logged a warning and then
// committed anyway, and a sign-in that promised continuity it never delivered.
// So these tests EXECUTE the functions. Each is lifted from app.js by brace
// matching and run against stubs — no browser, no network, no cost.
console.log('\n── behavior: setup failure must abort ──');

/** Lift a top-level function's source out of app.js. */
function fnSource(name) {
  const m = app.search(new RegExp(`\\n  (?:async )?function ${name}\\(`));
  if (m === -1) throw new Error(`cannot find function ${name}`);
  const end = app.indexOf('\n  }\n', m);
  if (end === -1) throw new Error(`cannot find end of ${name}`);
  return app.slice(m + 1, end + 4);
}

/** Build a sandbox holding the real function bodies over stubbed dependencies. */
const BAKED_ENTRY_KEY = (app.match(/_BAKED_ENTRY_KEY\s*=\s*'([^']+)'/) || [, null])[1];
ok(!!BAKED_ENTRY_KEY, 'the sign-in stash key is discoverable in app.js');

function sandbox(overrides = {}) {
  const env = {
    state: { _starterId: 'starter_the_first_taste', _bakedPendingCommit: { title: 'T', synopsis: 'S', text: 'baked prose', fateCard: null } },
    calls: { launched: [], toasts: [], events: [], snapshots: 0, submits: 0 },
    STARTER_SCENE1,
    BAKED_ENTRY_KEY,
    ...overrides
  };
  const src = `
    const state = env.state, calls = env.calls;
    const console = { log(){}, warn(){}, error(){} };
    const STARTER_STORIES = [
      { id: 'starter_the_first_taste', title: 'The First Taste' },
      { id: 'starter_first_sacrifice', title: 'The First Sacrifice' }
    ];
    const window = {};
    const localStorage = env.localStorage;
    const document = env.document;
    // Module-scope constants the extracted functions close over. Pulled from
    // app.js rather than hardcoded, so the test cannot drift from the real key.
    const _BAKED_ENTRY_KEY = env.BAKED_ENTRY_KEY;
    function _bakedScene1For(id) { return env.STARTER_SCENE1[id] || null; }
    function logEvent(t, m) { calls.events.push({ t, m }); }
    function showToast(m) { calls.toasts.push(m); }
    function saveStorySnapshot() { calls.snapshots++; }
    function startLoading() {} function stopLoading() {}
    // Faithful to the real baked launch: it stamps the starter id and the mount
    // time synchronously (its only awaits are on the non-baked path). env.launchFails
    // models a launch that never mounts.
    function _launchStarterStory(def) {
      calls.launched.push(def && def.id);
      if (env.launchFails) return;
      state._starterId = def && def.id;
      state._bakedScene1MountedAt = Date.now();
    }
    // The stub receives the sandbox state, so a test can emulate the real
    // setup-only exit (which sets _bakedSetupComplete) without a sandbox handle.
    const handleBeginStory = env.handleBeginStory ? function () { return env.handleBeginStory(state); } : undefined;
    ${fnSource('_bakedPkgForActiveStory')}
    ${fnSource('_isSignedIn')}
    ${fnSource('_bakedGenesisLocked')}
    ${fnSource('_resetBakedLifecycle')}
    ${fnSource('_commitBakedScene')}
    ${fnSource('_unlockBakedGenesis')}
    ${fnSource('_clearBakedEntry')}
    ${fnSource('_stashBakedEntry')}
    ${fnSource('_restoreBakedEntryAfterAuth')}
    return { _unlockBakedGenesis, _commitBakedScene, _stashBakedEntry, _restoreBakedEntryAfterAuth, _resetBakedLifecycle };
  `;
  // eslint-disable-next-line no-new-func
  return { api: new Function('env', src)(env), env };
}

function fakeStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    _store: store
  };
}
function fakeDoc(values = {}) {
  return { getElementById: id => (id in values ? { value: values[id] } : null) };
}

{ // setup throws
  const { api, env } = sandbox({ handleBeginStory: async () => { throw new Error('boom'); }, localStorage: fakeStorage(), document: fakeDoc() });
  const result = await api._unlockBakedGenesis('charged');
  ok(result === false, 'setup throws → returns false');
  ok(!env.state._bakedGenesisUnlocked, 'setup throws → does NOT unlock');
  ok(!env.state.scenes || env.state.scenes.length === 0, 'setup throws → does NOT commit the scene');
  ok(!(env.state.turnCount > 0), 'setup throws → turnCount stays 0');
  ok(!!env.state._bakedPendingCommit, 'setup throws → the scene is still pending, not lost');
  ok(env.calls.snapshots === 0, 'setup throws → no snapshot of a broken story');
  ok(env.calls.toasts.length === 1 && /won't be charged twice/.test(env.calls.toasts[0]),
    'setup throws → reader is told they can retry without paying twice');
}

{ // setup returns without reaching the exit
  const { api, env } = sandbox({ handleBeginStory: async () => { /* returns early */ }, localStorage: fakeStorage(), document: fakeDoc() });
  const result = await api._unlockBakedGenesis('charged');
  ok(result === false, 'setup bails early → returns false');
  ok(!env.state._bakedGenesisUnlocked, 'setup bails early → does NOT unlock');
  ok(!env.state.scenes || env.state.scenes.length === 0, 'setup bails early → does NOT commit');
  ok(env.calls.events.some(e => e.t === 'baked_setup_failed'), 'setup bails early → failure is recorded');
}

{ // setup succeeds
  const box = sandbox({
    handleBeginStory: (st) => { st._bakedSetupComplete = true; },   // emulates the setup-only exit
    localStorage: fakeStorage(), document: fakeDoc()
  });
  const result = await box.api._unlockBakedGenesis('charged');
  ok(result === true, 'setup succeeds → returns true');
  ok(box.env.state._bakedGenesisUnlocked === true, 'setup succeeds → unlocks');
  ok(box.env.state.scenes && box.env.state.scenes.length === 1, 'setup succeeds → commits exactly one scene');
  ok(box.env.state.scenes[0].text === 'baked prose', 'setup succeeds → commits the BAKED scene');
  ok(box.env.state.turnCount === 1, 'setup succeeds → turnCount becomes 1');
  ok(box.env.state._bakedPendingCommit === null, 'setup succeeds → pending commit is consumed');
  ok(box.env.calls.snapshots === 1, 'setup succeeds → the story is snapshotted');
}

{ // commit is idempotent
  const box = sandbox({ localStorage: fakeStorage(), document: fakeDoc(), handleBeginStory: async () => {} });
  box.api._commitBakedScene();
  box.api._commitBakedScene();
  ok(box.env.state.scenes.length === 1, 'commit twice → still one scene (idempotent)');
}

console.log('\n── behavior: a second Book must not inherit the first ──');

{
  // The lifecycle latches are PER-STORY. _bakedSetupComplete surviving into the
  // next Book makes its unlock skip handleBeginStory and generate against the
  // previous story's planning — a corruption that only appears on the SECOND
  // Book opened in a session.
  let setupRuns = [];
  const box = sandbox({
    localStorage: fakeStorage(), document: fakeDoc(),
    handleBeginStory: (st) => { setupRuns.push(st._starterId); st._bakedSetupComplete = true; }
  });

  // ── Book A: open, unlock ──
  box.env.state._starterId = 'starter_the_first_taste';
  box.env.state._bakedPendingCommit = { title: 'A', synopsis: '', text: 'scene from A', fateCard: null };
  const aOk = await box.api._unlockBakedGenesis('charged');
  ok(aOk === true, 'A: unlocks');
  ok(setupRuns.length === 1, 'A: runs initialization once');
  ok(box.env.state.scenes.length === 1 && box.env.state.scenes[0].text === 'scene from A', 'A: commits its own scene');

  // ── Book B: opening a different starter resets the lifecycle ──
  // This is what _launchStarterStory's baked branch does (and _resetStoryState
  // before it). Without it, everything below fails.
  box.api._resetBakedLifecycle();
  box.env.state.scenes = [];
  box.env.state.turnCount = 0;
  box.env.state._starterId = 'starter_first_sacrifice';
  box.env.state._bakedPendingCommit = { title: 'B', synopsis: '', text: 'scene from B', fateCard: null };

  ok(box.env.state._bakedSetupComplete === false, 'B: the setup latch was cleared by the reset');
  ok(box.env.state._bakedGenesisUnlocked === false, 'B: starts locked again');

  const bOk = await box.api._unlockBakedGenesis('charged');
  ok(bOk === true, 'B: unlocks');
  ok(setupRuns.length === 2, 'B: runs its OWN initialization (did not inherit A\'s)');
  ok(setupRuns[1] === 'starter_first_sacrifice', 'B: initialization ran for B, not A');
  ok(box.env.state.scenes.length === 1, 'B: commits exactly one scene');
  ok(box.env.state.scenes[0].text === 'scene from B', 'B: commits ITS OWN baked scene, not A\'s');
}

{
  // Guard the reset itself: every _baked* transient must be in the list.
  const box = sandbox({ localStorage: fakeStorage(), document: fakeDoc(), handleBeginStory: async () => {} });
  const st = box.env.state;
  st._bakedSetupComplete = true; st._bakedGenesisUnlocked = true; st._bakedSetupOnly = true;
  st._bakedSetupRunning = true;  st._bakedPendingCommit = { text: 'x' }; st._bakedPendingOASPlan = {};
  st._bakedEmitted = {}; st._bakedScene1Version = 'v'; st._bakedAmbientTag = 't'; st._bakedScene1MountedAt = 1;
  box.api._resetBakedLifecycle();
  const leaked = Object.keys(st).filter(k => k.startsWith('_baked') && st[k] !== false && st[k] !== null);
  ok(leaked.length === 0, 'reset clears every _baked* transient', `leaked: ${leaked.join(', ')}`);
}

console.log('\n── behavior: sign-in continuity ──');

{ // stash captures the Book and the reader's words
  const ls = fakeStorage();
  const box = sandbox({ localStorage: ls, document: fakeDoc({ actionInput: 'I turn around', dialogueInput: '"Who are you?"' }), handleBeginStory: async () => {} });
  box.api._stashBakedEntry();
  const saved = JSON.parse(ls.getItem(BAKED_ENTRY_KEY));
  ok(saved.starterId === 'starter_the_first_taste', 'stash records which Book the reader was in');
  ok(saved.act === 'I turn around' && saved.dia === '"Who are you?"', 'stash records what the reader typed');
}

{ // still logged out → keep the marker (they may not have finished signing in)
  const ls = fakeStorage({ [BAKED_ENTRY_KEY]: JSON.stringify({ starterId: 'starter_the_first_taste', savedAt: Date.now() }) });
  const box = sandbox({ localStorage: ls, document: fakeDoc(), handleBeginStory: async () => {} });
  const restored = box.api._restoreBakedEntryAfterAuth();
  ok(restored === false, 'still logged out → does not restore');
  ok(ls.getItem(BAKED_ENTRY_KEY) !== null, 'still logged out → marker survives for the next attempt');
  ok(box.env.calls.launched.length === 0, 'still logged out → no Book opened');
}

{ // signed in → the same Book reopens
  const ls = fakeStorage({ [BAKED_ENTRY_KEY]: JSON.stringify({ starterId: 'starter_first_sacrifice', act: 'a', dia: 'b', savedAt: Date.now() }) });
  const box = sandbox({ localStorage: ls, document: fakeDoc(), handleBeginStory: async () => {} });
  box.env.state.profileId = 'user-123';
  const restored = box.api._restoreBakedEntryAfterAuth();
  ok(restored === true, 'signed in → restores');
  ok(box.env.calls.launched[0] === 'starter_first_sacrifice', 'signed in → reopens the SAME Book');
  ok(ls.getItem(BAKED_ENTRY_KEY) === null, 'signed in → marker is one-shot');
  ok(box.env.calls.submits === 0, 'signed in → the attempted action is NOT auto-submitted (the reader decides when to spend)');
}

{ // the Book fails to mount → the reader keeps their recovery token
  const ls = fakeStorage({ [BAKED_ENTRY_KEY]: JSON.stringify({ starterId: 'starter_the_first_taste', savedAt: Date.now() }) });
  const box = sandbox({ localStorage: ls, document: fakeDoc(), handleBeginStory: async () => {}, launchFails: true });
  box.env.state.profileId = 'user-123';
  const restored = box.api._restoreBakedEntryAfterAuth();
  ok(restored === false, 'launch fails → restore reports failure');
  ok(ls.getItem(BAKED_ENTRY_KEY) !== null, 'launch fails → the one-shot marker is NOT consumed');
}

{ // stale marker
  const ls = fakeStorage({ [BAKED_ENTRY_KEY]: JSON.stringify({ starterId: 'starter_the_first_taste', savedAt: Date.now() - 90000000 }) });
  const box = sandbox({ localStorage: ls, document: fakeDoc(), handleBeginStory: async () => {} });
  box.env.state.profileId = 'user-123';
  ok(box.api._restoreBakedEntryAfterAuth() === false, 'a day-old marker does not hijack a later visit');
}

console.log('\n── lifecycle wiring ──');
const l3 = fnBody('_resetStoryState');
ok(l3 && codeOf(l3).includes('_resetBakedLifecycle('),
  'Layer-3 reset clears the baked lifecycle (resetForNewStory + performAuthReset both run it)');
const launch = fnBody('_launchStarterStory');
ok(launch && codeOf(launch).includes('_resetBakedLifecycle()'),
  'the baked launch resets the lifecycle before mounting');
const restore2 = fnBody('_restoreBakedEntryAfterAuth');
ok(restore2 && at(restore2, '_launchStarterStory(def)') < at(restore2, '_clearBakedEntry();\n    } else'),
  'the recovery marker is cleared only AFTER a confirmed mount');

console.log('\n── the modal promise is kept ──');
const gate = fnBody('_bakedGenesisGate');
ok(gate && codeOf(gate).includes('_stashBakedEntry()'),
  'the logged-out gate stashes before sending the reader to sign in');
ok(!codeOf(app).includes('_bakedResumeAfterUnlock'),
  'no in-memory resume handle left behind (it could never survive location.reload)');
const nav = fnBody('_navigateToVaultWithStarter');
ok(nav && codeOf(nav).includes('_restoreBakedEntryAfterAuth('),
  'the post-boot path consults the stash before landing on the shelf');
ordered(codeOf(nav || ''), '_restoreBakedEntryAfterAuth', "showScreen('vaultLibraryScreen')",
  'restore is attempted BEFORE navigating to the shelf');

console.log(`\n${failures ? `✗ ${failures} of ${checks} checks FAILED` : `✓ all ${checks} checks passed`}\n`);
process.exit(failures ? 1 : 0);
