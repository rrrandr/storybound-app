#!/usr/bin/env node
// _stage_fact_participant_attribution_control.mjs
//
// OFFLINE control suite for the corrected issued_facts participant-attribution rule (Roman,
// 2026-09-14): the earlier blanket "every present participant is a participant in every issued
// fact" rule was semantically wrong and is withdrawn. This proves the REPLACEMENT validation:
// a fact is either a plain string (no participants, never C+-eligible) or a structured
// {text, participants:[{ref, role}]} record whose EVERY ref must be a present, issued entity in
// THIS proposal — never inferred, never merely "some existing entity" — or the whole proposal is
// rejected (control 4). Loaded by anchor-bounded slice of public/app.js. No server, no browser,
// no network, no provider call. Live end-to-end proof (controls 1/2/3/5, which need the real
// _cpFactCorpus/_cpBuildGroundedOptions/_cpSchedule pipeline) lives in
// _cplus_eplus_fusion_live_proof.mjs.

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

const spineConstantsSrc = sliceByAnchor('spine-constants',
  'var _SPINE_RECENT = 6, _SPINE_MAX_CHARS = 2200;',
  "return t ? t.slice(0, n) : null; }");

const spineBlockSrc = sliceByAnchor('continuity-spine-block',
  'function _buildContinuitySpineBlock(s, opts) {',
  'window._buildContinuitySpineBlock = _buildContinuitySpineBlock;\n  } } catch (_) {}');

const stageSubstrateSrc = sliceByAnchor('stage-state-substrate',
  '// GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)',
  'window._issueStageFromPlannerReply = _issueStageFromPlannerReply;');

// Stubs for dependencies this control deliberately does not extract (unrelated to what's proven).
const stubsSrc = `
  var __durableStub = '';
  function _buildDurableFateConsequenceDirective() { return __durableStub; }
  function _sceneLedgerGet(s, create) { return { entries: [] }; }
  function _sceneLedgerStamp() {} function _sceneLedgerCommit() {} function _sceneLedgerRestamp() {}
  function _resolvePcIdentity(s) { return { v: 'Lirael' }; }
  function _currentSceneNumber(s) { return 5; }
`;

const body = stubsSrc + '\n' + relLedgerSrc + '\n' + spineConstantsSrc + '\n' + spineBlockSrc + '\n' + stageSubstrateSrc;
const factory = new Function('window', body);

function freshSandbox() {
  const win = { state: { storyId: 's1' } };
  factory(win);
  return win;
}
function makeLedger(entities) { return { v: 1, storyId: 's1', processed: {}, seq: Object.keys(entities).length, entities, edges: {} }; }

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

const entities = {
  pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
  julian: { id: 'julian', kind: 'named', label: 'Julian', aliases: [] },
  seren: { id: 'seren', kind: 'named', label: 'Seren', aliases: [] },
  dohkar: { id: 'dohkar', kind: 'named', label: 'the presiding Dohkar', aliases: [] },
  bystander: { id: 'bystander', kind: 'named', label: 'an usher not on this stage', aliases: [] } // NEVER in present
};

section('CONTROL — a plain string fact carries no participants (never C+-eligible), accepted as-is');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger(entities);
  const check = win._validateStageProposal({ present: ['julian'], issued_facts: ['The assembly had already begun to gather.'] });
  ok('accepted', check.ok === true, JSON.stringify(check.why));
}

section('CONTROL 4a — a fact participant ref that is not an issued entity at all rejects the whole proposal');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger(entities);
  const check = win._validateStageProposal({ present: ['julian'], issued_facts: [{ text: 'Julian defends the order.', participants: [{ ref: 'ent:does-not-exist', role: 'subject' }] }] });
  ok('rejected', check.ok === false, JSON.stringify(check));
  ok('reason names the unissued ref', check.why.some(w => /unissued entity/.test(w) && /does-not-exist/.test(w)), JSON.stringify(check.why));
}

section('CONTROL 4b — a fact participant ref that IS an issued entity but is NOT present in this proposal rejects it too');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger(entities);
  // "bystander" is a real, issued entity — but not present in THIS proposal.
  const check = win._validateStageProposal({ present: ['julian'], issued_facts: [{ text: 'An usher notices something.', participants: [{ ref: 'bystander', role: 'witness' }] }] });
  ok('rejected', check.ok === false, JSON.stringify(check));
  ok('reason distinguishes "not present" from "not issued"', check.why.some(w => /is not present in this proposal/.test(w)), JSON.stringify(check.why));
}

section('CONTROL — a structured fact whose participant IS present and issued is accepted');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger(entities);
  const check = win._validateStageProposal({ present: ['julian', 'seren'], issued_facts: [{ text: 'Julian defends the order without hesitation.', participants: [{ ref: 'julian', role: 'subject' }] }] });
  ok('accepted', check.ok === true, JSON.stringify(check.why));
}

section('CONTROL — a genuinely multi-party fact (two present, issued subjects) is accepted, both refs preserved');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger(entities);
  const proposal = { present: ['julian', 'seren'], issued_facts: [{ text: 'Julian and Seren argue openly before the assembly.', participants: [{ ref: 'julian', role: 'subject' }, { ref: 'seren', role: 'subject' }] }] };
  const check = win._validateStageProposal(proposal);
  ok('accepted', check.ok === true, JSON.stringify(check.why));
  const accepted = win._acceptStageProposal('2', proposal);
  ok('commit succeeds', accepted.ok === true);
  ok('both participant refs and roles are preserved verbatim in the committed record', JSON.stringify(accepted.record.issued_facts[0].participants) === JSON.stringify([{ ref: 'julian', role: 'subject' }, { ref: 'seren', role: 'subject' }]), JSON.stringify(accepted.record.issued_facts[0]));
}

section('CONTROL — the author-facing directive renders a structured fact\'s TEXT, never "[object Object]"');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger(entities);
  const proposal = { present: ['julian'], issued_facts: [{ text: 'Julian defends the order without hesitation.', participants: [{ ref: 'julian', role: 'subject' }] }] };
  win._acceptStageProposal('2', proposal);
  const rendered = win._buildCurrentStageDirective(win.state);
  ok('renders the fact text', rendered.indexOf('Julian defends the order without hesitation.') !== -1, rendered);
  ok('never renders [object Object]', rendered.indexOf('[object Object]') === -1, rendered);
}

section('CONTROL — a mix of plain-string and structured facts in one proposal is accepted and both render');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger(entities);
  const proposal = { present: ['julian'], issued_facts: ['The colonnade was still cold from the night.', { text: 'Julian defends the order without hesitation.', participants: [{ ref: 'julian', role: 'subject' }] }] };
  const check = win._validateStageProposal(proposal);
  ok('accepted', check.ok === true, JSON.stringify(check.why));
  win._acceptStageProposal('2', proposal);
  const rendered = win._buildCurrentStageDirective(win.state);
  ok('both fact texts render', rendered.indexOf('The colonnade was still cold from the night.') !== -1 && rendered.indexOf('Julian defends the order without hesitation.') !== -1, rendered);
}

console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
process.exit(0);
