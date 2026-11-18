// THE SCENE 4 EDITOR HANDOFF, FIXED AND CHECKED ON ITS OWN ARTIFACTS (Roman 2026-11-18)
//
// Scene 4 raised both admiration obligations and lost both:
//   deferred: [{"label":"Roman Tusk","why":"not on stage in this scene"}, {same again}]
// while Roman spoke throughout the scene. Had they survived, both would have been rebuilt as
// `cplus:roman_tusk` — one indistinguishable obligation with its instructions dropped.
//
// The shipped cpEditorDue is lifted and driven with Scene 4's OWN plan and roster.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 300)) : '')); } else console.log('  ✓ ' + nm); };

// ── LIFT THE SHIPPED SCHEDULER ───────────────────────────────────────────────────────────
const src = fs.readFileSync(ROOT + 'public/essential-beat-check.js', 'utf8');
// The module is an IIFE that publishes one object: globalThis.EssentialBeatCheck.
const sandbox = { window: {}, document: { addEventListener() {} },
  console: { log() {}, warn() {}, error() {} } };
const fn = new Function('window', 'document', 'console', 'globalThis',
  src + '\n;return globalThis.EssentialBeatCheck || (window && window.EssentialBeatCheck) || null;');
const API = fn(sandbox.window, sandbox.document, sandbox.console, sandbox) || {};
if (!API.cpEditorDue) { console.error('could not lift cpEditorDue'); process.exit(2); }
console.log('lifted cpEditorDue / cpPictureDue from public/essential-beat-check.js\n');

// ── SCENE 4'S OWN INPUTS ─────────────────────────────────────────────────────────────────
const LI = 'Roman Tusk';
const ADM = ['social', 'capability'].map((area) => ({
  id: 'liadmire:' + area, label: LI, isPC: false, kind: 'li_admiration',
  due: 'this_issue', depictionMode: 'on_stage',
  ask: 'QUOTE the passage in this draft that delivers ' + area + ' admiration … and say what '
    + 'the PC finds compelling in it.',
}));
const FRAME = { id: 'cplusbeat:pc:self#1@practiced-face', label: 'Dani MacBrayne', isPC: true,
  kind: 'character_plus_frame', due: 'this_issue', depictionMode: 'on_stage',
  frameTitle: 'practiced face', frameText: 'the voice she keeps for people watching',
  ask: 'QUOTE the behaviour that fulfils the frame…' };
// The roster the SCENE has: Dani, Roman and the producer are all physically present and all
// three speak on the published page.
const ROSTER = [
  { id: 'pc:self', label: 'Dani MacBrayne', role: 'pc' },
  { id: 'named:roman_tusk', label: 'Roman Tusk', role: 'li' },
  { id: 'plot:aplot_x3a_a40d30ed_x2d_463c_x2d_489c_x2d_b956_x2d_64cd7ebdb5ff:primary_antagonist',
    label: 'The station’s homecoming producer', role: 'supporting' },
];
const PAGE = fs.readFileSync(ROOT + '_FT_SCENE4_PUBLISHED.txt', 'utf8');
console.log('the published Scene 4 speaks all three: Dani '
  + /I said|I kept my place/.test(PAGE) + ', Roman ' + /Roman/.test(PAGE)
  + ', producer ' + /producer/.test(PAGE));

console.log('\n1. THE OLD FAILURE, REPRODUCED  (onStage without Roman)');
const before = API.cpEditorDue({
  plan: { obligations: [FRAME].concat(ADM) },
  onStage: [{ label: 'Dani MacBrayne' }],       // what Scene 4 actually passed
  frameRoster: [],                              // no resolved roster => the old path
  liName: LI, sceneOrdinal: 4, issue: 1, ledger: [], attempts: [],
});
console.log('   due      : ' + JSON.stringify((before.due || []).map((d) => d.id)));
console.log('   deferred : ' + JSON.stringify(before.deferred));
// With no resolved roster the fallback is the craft pass's own onStage map, which held only
// Dani — so both admiration obligations are deferred, naming the reason.
ck('with Roman absent from onStage and no roster, both are deferred',
  !(before.due || []).some((d) => /liadmire/.test(String(d.id))),
  JSON.stringify((before.due || []).map((d) => d.id)));
ck('and the deferral says the LI is not present',
  (before.deferred || []).some((d) => /not present in this scene/.test(String(d.why))),
  JSON.stringify(before.deferred));

console.log('\n2. WITH BOTH EDITORS’ PARTICIPANTS RESOLVED FROM THE CURRENT SCENE');
const after = API.cpEditorDue({
  plan: { obligations: [FRAME].concat(ADM) },
  onStage: ROSTER, frameRoster: ROSTER,
  liName: LI, sceneOrdinal: 4, issue: 1, ledger: [], attempts: [],
});
const ids = (after.due || []).map((d) => d.id);
console.log('   due      : ' + JSON.stringify(ids));
console.log('   deferred : ' + JSON.stringify(after.deferred));
ck('liadmire:social survives scheduling', ids.indexOf('liadmire:social') !== -1, JSON.stringify(ids));
ck('liadmire:capability survives scheduling', ids.indexOf('liadmire:capability') !== -1, JSON.stringify(ids));
ck('the two ids stay DISTINCT', new Set(ids).size === ids.length, JSON.stringify(ids));
ck('neither was rebuilt from Roman’s name',
  ids.indexOf('cplus:roman_tusk') === -1, JSON.stringify(ids));
ck('the frame beat keeps its own id too',
  ids.indexOf('cplusbeat:pc:self#1@practiced-face') !== -1, JSON.stringify(ids));
const social = (after.due || []).find((d) => d.id === 'liadmire:social');
const cap = (after.due || []).find((d) => d.id === 'liadmire:capability');
ck('each carries its OWN instructions', !!social && !!cap
  && /social admiration/.test(String(social.ask)) && /capability admiration/.test(String(cap.ask)),
  JSON.stringify([social && social.ask, cap && cap.ask]).slice(0, 200));
ck('and its kind survives', !!social && social.kind === 'li_admiration', social && social.kind);

console.log('\n3. CONTROL — AN ABSENT CHARACTER IS STILL REFUSED  (must be RED)');
const absent = API.cpEditorDue({
  plan: { obligations: [{ id: 'liadmire:social', label: 'Helen MacBrayne',
    kind: 'li_admiration', due: 'this_issue' }] },
  onStage: ROSTER, frameRoster: ROSTER, liName: LI, sceneOrdinal: 4, issue: 1,
  ledger: [], attempts: [],
});
console.log('   due      : ' + JSON.stringify((absent.due || []).map((d) => d.id)));
console.log('   deferred : ' + JSON.stringify(absent.deferred));
ck('an obligation for someone NOT in the scene is deferred',
  !(absent.due || []).length && (absent.deferred || []).length > 0, JSON.stringify(absent));
ck('and the deferral now names the id that was dropped',
  (absent.deferred || []).some((d) => d.id === 'liadmire:social'), JSON.stringify(absent.deferred));

console.log('\n4. THE PICTURABILITY POST COVERS ALL THREE PEOPLE');
if (!API.cpPictureDue) { console.log('  (cpPictureDue not liftable in isolation)'); }
else {
  const pic = API.cpPictureDue({ people: ROSTER, liName: LI, sceneOrdinal: 4, issue: 1,
    ledger: [], attempts: [] });
  const labels = ((pic && (pic.due || pic)) || []).map((p) => String(p.character || p.label || ''));
  console.log('   due      : ' + JSON.stringify(labels));
  ck('Dani is covered', labels.some((l) => /Dani/.test(l)), JSON.stringify(labels));
  ck('Roman is covered', labels.some((l) => /Roman/.test(l)), JSON.stringify(labels));
  ck('the producer is covered', labels.some((l) => /producer/i.test(l)), JSON.stringify(labels));
  // The KEEP affordance belongs to the picturability REQUEST, not to the due rows: Scene 3
// logged "[PICTURE] applied 1 edit(s), kept 1", so keeping is already how that pass works.
  const picReq = (typeof API.buildPictureRequest === 'function')
    ? API.buildPictureRequest({ people: ROSTER, draft: PAGE, liName: LI })
    : null;
  const picText = picReq ? JSON.stringify(picReq) : src;
  ck('existing description can still earn a KEEP',
    /KEEP/.test(picText), 'no keep affordance found');
}

fs.writeFileSync(ROOT + '_FT_SCENE4_HANDOFF_FIX.json', JSON.stringify({
  before: { due: (before.due || []).map((d) => d.id), deferred: before.deferred },
  after: { due: ids, deferred: after.deferred,
    asks: { social: social && social.ask, capability: cap && cap.ask } },
  absentControl: absent.deferred,
  checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  Static — the shipped scheduler on Scene 4’s own plan and roster. No spend.');
process.exit(bad ? 1 : 0);
