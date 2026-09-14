#!/usr/bin/env node
// _stage_issuer_delivery_control.mjs
//
// OFFLINE control suite for the DELIVERY half of the continuation-stage issuer (Roman,
// authorized 2026-09-14): _buildCurrentStageDirective, wired into the existing
// _buildContinuitySpineBlock (the ONE function already reaching every author assembly — grep
// "SCENE LEDGER + CONTINUITY SPINE"). Loads the REAL, unmodified source by anchor-bounded slice
// of public/app.js into a sandboxed `new Function('window', ...)` scope. No server, no browser,
// no network, no provider call.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, 'public/app.js');
const SRC = fs.readFileSync(APP_PATH, 'utf8');

function sliceByAnchor(label, startAnchor, endAnchor) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) throw new Error(`ANCHOR DRIFT (${label}): start anchor not found: "${startAnchor.slice(0, 80)}"`);
  const to = SRC.indexOf(endAnchor, from + startAnchor.length);
  if (to === -1) throw new Error(`ANCHOR DRIFT (${label}): end anchor not found after start: "${endAnchor.slice(0, 80)}"`);
  return SRC.slice(from, to + endAnchor.length);
}

const relLedgerSrc = sliceByAnchor('rel-ledger-primitives',
  'var REL_V = 1;',
  'return _relMatchByName(L, n, opts);\n  };');

const stageSubstrateSrc = sliceByAnchor('stage-state-substrate',
  '// GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)',
  'window._acceptStageProposal = _acceptStageProposal;');

const deliverySrc = sliceByAnchor('current-stage-directive',
  '// ── CURRENT ACCEPTED STAGE → AUTHOR DIRECTIVE (Roman, authorized 2026-09-14) ──',
  'window._buildCurrentStageDirective = _buildCurrentStageDirective;');

const body = relLedgerSrc + '\n' + stageSubstrateSrc + '\n' + deliverySrc;
const factory = new Function('window', body);

function freshSandbox(overrides) {
  const win = { state: Object.assign({ storyId: 's1' }, overrides || {}) };
  factory(win);
  return win;
}

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ══════════════════════════════════════════════════════════════════════════
// STATIC CONTROL — the wiring itself: exactly one call site inside
// _buildContinuitySpineBlock, so every author assembly that already calls that one function
// gets the stage block with NO new per-site wiring (the "exactly once" guarantee).
// ══════════════════════════════════════════════════════════════════════════
section('STATIC — wiring into the single shared author-assembly function');
{
  const spineFnSrc = sliceByAnchor('spine-fn', 'function _buildContinuitySpineBlock(s, opts) {', "window._buildContinuitySpineBlock = _buildContinuitySpineBlock;");
  const occurrences = (spineFnSrc.match(/_buildCurrentStageDirective\(/g) || []).length;
  ok('_buildCurrentStageDirective is called exactly once inside _buildContinuitySpineBlock', occurrences === 1, 'found ' + occurrences);
  const callSites = (SRC.match(/_buildContinuitySpineBlock\(/g) || []).length;
  ok('_buildContinuitySpineBlock itself has multiple real author-assembly call sites (unaffected by this change)', callSites >= 5, 'found ' + callSites);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 1 — stage-less legacy story: no active stage → '' , exactly as before this slice.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — no active stage → empty directive, legacy behavior retained');
{
  const win = freshSandbox();
  const out = win._buildCurrentStageDirective(win.state);
  ok('returns empty string', out === '', JSON.stringify(out));
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 2 — a genuinely accepted stage renders location/present/facts/objects/affordances,
// exactly once, with ownership resolved to names.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — an accepted stage renders the full picture, once');
{
  const win = freshSandbox();
  win.state._relationshipLedger = {
    v: 1, storyId: 's1', processed: {}, seq: 3,
    entities: {
      pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
      'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
      'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'the presiding Dohkar', aliases: [] }
    }, edges: {}
  };
  win.state._stageState = {
    '3': {
      v: 1, storyId: 's1', issueId: 1, sceneKey: '3', status: 'accepted', postureHash: null,
      location: { label: 'a quiet corridor off the assembly hall' },
      present: ['pc', 'ent:stage:1'], present_disambiguators: {},
      issued_facts: ['the ledger of names still lies open on the table'],
      issued_objects: [
        { label: 'the sealed ledger', kind: 'object', owner_or_caretaker_ref: 'ent:stage:2', addressable_by: ['pc', 'ent:stage:1'] }
      ],
      affordances: ['the corridor door stands ajar'],
      exclusions: { locations: [], objects: ['the Open'] },
      provenance: { source: 'spine:issuer', reconciled_from: [] },
      lifecycle: { issuedAt: Date.now(), supersededAt: null, closedAt: null, closedReason: null }
    }
  };
  const out = win._buildCurrentStageDirective(win.state);
  ok('non-empty', !!out);
  const headerHits = (out.match(/CURRENT STAGE/g) || []).length;
  ok('the header appears exactly once', headerHits === 1, 'found ' + headerHits);
  ok('location present', out.indexOf('a quiet corridor off the assembly hall') !== -1);
  ok('present cast resolved to real names', out.indexOf('Lirael') !== -1 && out.indexOf('Julian') !== -1);
  ok('issued fact carried', out.indexOf('the ledger of names still lies open on the table') !== -1);
  ok('issued object label carried', out.indexOf('the sealed ledger') !== -1);
  ok('object ownership resolved to a real name, not a raw ledger id', out.indexOf('held/owned by the presiding Dohkar') !== -1, out);
  ok('object addressable-by resolved to real names', out.indexOf('addressable by Lirael, Julian') !== -1, out);
  ok('affordance carried', out.indexOf('the corridor door stands ajar') !== -1);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 3 — EXCLUSIONS: an excluded object/location never appears as issued, but IS named
// under NOT HERE.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — excluded/non-issued objects cannot enter the directive as present');
{
  const win = freshSandbox();
  win.state._relationshipLedger = { v: 1, storyId: 's1', processed: {}, seq: 1, entities: { pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] } }, edges: {} };
  win.state._stageState = {
    '2': {
      v: 1, storyId: 's1', issueId: 1, sceneKey: '2', status: 'accepted', postureHash: null,
      location: { label: 'the hearth room' }, present: ['pc'], present_disambiguators: {},
      issued_facts: [], issued_objects: [], affordances: [],
      exclusions: { locations: ['the Open'], objects: ['the Answer'] },
      provenance: { source: 'spine:issuer', reconciled_from: [] },
      lifecycle: { issuedAt: Date.now(), supersededAt: null, closedAt: null, closedReason: null }
    }
  };
  const out = win._buildCurrentStageDirective(win.state);
  ok('no ISSUED OBJECTS section when none were issued', out.indexOf('ISSUED OBJECTS') === -1, out);
  ok('excluded location is named under NOT HERE', out.indexOf('NOT HERE') !== -1 && out.indexOf('the Open') !== -1, out);
  ok('excluded object is named under NOT HERE', out.indexOf('the Answer') !== -1, out);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 4 — DISAMBIGUATION: two present entities sharing a raw label render their
// disambiguated text, never the bare duplicate name.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — two same-named present entities are disambiguated in the directive');
{
  const win = freshSandbox();
  win.state._relationshipLedger = {
    v: 1, storyId: 's1', processed: {}, seq: 2,
    entities: {
      'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
      'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'Julian', aliases: [] }
    }, edges: {}
  };
  win.state._stageState = {
    '5': {
      v: 1, storyId: 's1', issueId: 1, sceneKey: '5', status: 'accepted', postureHash: null,
      location: null, present: ['ent:stage:1', 'ent:stage:2'],
      present_disambiguators: { 'ent:stage:1': 'Julian (1)', 'ent:stage:2': 'Julian (2)' },
      issued_facts: [], issued_objects: [], affordances: [], exclusions: { locations: [], objects: [] },
      provenance: { source: 'spine:issuer', reconciled_from: [] },
      lifecycle: { issuedAt: Date.now(), supersededAt: null, closedAt: null, closedReason: null }
    }
  };
  const out = win._buildCurrentStageDirective(win.state);
  ok('both disambiguated forms present', out.indexOf('Julian (1)') !== -1 && out.indexOf('Julian (2)') !== -1, out);
  const bareHits = (out.match(/PRESENT: [^\n]*/)[0].match(/Julian(?!\s*\()/g) || []).length;
  ok('the bare undisambiguated name never appears in the PRESENT line', bareHits === 0, out.match(/PRESENT: [^\n]*/)[0]);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 5 — HISTORY ISOLATION: a prior Issue's CLOSED stage is never presented as current —
// only the truly active record's content appears.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — a closed/historical stage is never rendered as current');
{
  const win = freshSandbox();
  win.state._relationshipLedger = { v: 1, storyId: 's1', processed: {}, seq: 1, entities: { pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] } }, edges: {} };
  win.state._stageState = {
    's1': {
      v: 1, storyId: 's1', issueId: 1, sceneKey: 's1', status: 'superseded', postureHash: null,
      location: { label: 'THE OLD LOCATION — must never appear' }, present: ['pc'], present_disambiguators: {},
      issued_facts: [], issued_objects: [], affordances: [], exclusions: { locations: [], objects: [] },
      provenance: { source: 'spine:issuer', reconciled_from: [] },
      lifecycle: { issuedAt: Date.now() - 10000, supersededAt: Date.now(), closedAt: Date.now(), closedReason: 'scene_advanced' }
    },
    's2': {
      v: 1, storyId: 's1', issueId: 1, sceneKey: 's2', status: 'accepted', postureHash: null,
      location: { label: 'THE NEW LOCATION' }, present: ['pc'], present_disambiguators: {},
      issued_facts: [], issued_objects: [], affordances: [], exclusions: { locations: [], objects: [] },
      provenance: { source: 'spine:issuer', reconciled_from: [] },
      lifecycle: { issuedAt: Date.now(), supersededAt: null, closedAt: null, closedReason: null }
    }
  };
  const out = win._buildCurrentStageDirective(win.state);
  ok('the closed stage\'s content is ABSENT', out.indexOf('THE OLD LOCATION') === -1, out);
  ok('only the active stage\'s content appears', out.indexOf('THE NEW LOCATION') !== -1, out);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 6 — RAW/UNACCEPTED DATA CANNOT LEAK: a record written directly to state._stageState
// bypassing _acceptStageProposal (status not 'accepted', or closed) is never rendered — the
// directive only ever reads via _activeStageRecord's own accepted+open filter, never scanning
// raw entries itself.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — a non-accepted record can never leak into the directive');
{
  const win = freshSandbox();
  win.state._relationshipLedger = { v: 1, storyId: 's1', processed: {}, seq: 1, entities: {}, edges: {} };
  win.state._stageState = {
    '9': {
      v: 1, storyId: 's1', issueId: 1, sceneKey: '9', status: 'proposed',   // NEVER accepted — a raw proposal shape
      location: { label: 'RAW UNACCEPTED PROPOSAL DATA' }, present: [], present_disambiguators: {},
      issued_facts: [], issued_objects: [], affordances: [], exclusions: { locations: [], objects: [] },
      provenance: { source: 'raw_proposal' },
      lifecycle: { issuedAt: Date.now(), supersededAt: null, closedAt: null, closedReason: null }
    }
  };
  const out = win._buildCurrentStageDirective(win.state);
  ok('a status!=="accepted" record never renders', out === '', JSON.stringify(out));
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 7 — ADMISSION: a realistic First-Sacrifice-shaped directive stays small and bounded
// (the existing _SPINE_MAX_CHARS=2200 clamp on the whole continuity-spine block, unaffected by
// this change but re-measured against a real-shaped instance here).
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 7 — admission: realistic directive size, re-measured');
{
  const win = freshSandbox();
  win.state._relationshipLedger = {
    v: 1, storyId: 's1', processed: {}, seq: 3,
    entities: {
      pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
      'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
      'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'Seren', aliases: [] }
    }, edges: {}
  };
  win.state._stageState = {
    '3': {
      v: 1, storyId: 's1', issueId: 1, sceneKey: '3', status: 'accepted', postureHash: 'ph:abc',
      location: { label: 'the colonnade outside the assembly hall, rain just starting' },
      present: ['pc', 'ent:stage:1', 'ent:stage:2'], present_disambiguators: {},
      issued_facts: [
        'the crowd has not yet dispersed from the assembly',
        'Julian still holds the Answer, visible at his belt',
        'the presiding Dohkar has not yet been sent for'
      ],
      issued_objects: [
        { label: 'the Answer', kind: 'relic', owner_or_caretaker_ref: 'ent:stage:1', addressable_by: ['ent:stage:1'] },
        { label: 'a borrowed cloak', kind: 'object', held_by: 'pc', addressable_by: ['pc'] }
      ],
      affordances: ['the colonnade steps lead back toward the Veilwood', 'the side door into the assembly hall stands unlatched'],
      exclusions: { locations: ['the Open'], objects: [] },
      provenance: { source: 'spine:issuer', reconciled_from: [] },
      lifecycle: { issuedAt: Date.now(), supersededAt: null, closedAt: null, closedReason: null }
    }
  };
  const out = win._buildCurrentStageDirective(win.state);
  const bytes = Buffer.byteLength(out, 'utf8');
  const SPINE_MAX_CHARS = 2200; // api/../public/app.js: var _SPINE_RECENT = 6, _SPINE_MAX_CHARS = 2200; (shared clamp on the whole continuity-spine block, this directive is one contributor to it)
  console.log('  realistic directive size: ' + bytes + ' bytes (shared spine-block clamp: ' + SPINE_MAX_CHARS + ')');
  ok('a realistic First-Sacrifice-shaped stage directive leaves the shared spine clamp with real headroom for ledger/durable-consequence content', bytes < SPINE_MAX_CHARS * 0.5, bytes + ' bytes');
}

console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
process.exit(0);
