#!/usr/bin/env node
// _stage_issuer_admission_measure.mjs
//
// Guardrail requested by Roman (2026-09-14, mid-build): the scene-spine planner was already
// close to Mistral Small's admission ceiling before this slice. This measures the REAL,
// currently-shipped _scSys construction (both branches: OPEN-ROW and corridor) against the REAL
// governor math (api/_mistral-governor.js: reservationFor = utf8(sys)+utf8(usr)+maxTokens,
// admitted iff reserve <= MODEL_LIMITS[model].tpm) for mistral-small-latest (20000 TPM) — the
// model the scene-spine planner's default (non-Grok) route actually calls. Every string measured
// below is extracted VERBATIM from public/app.js by plain literal-anchor slicing (never a
// hand-retyped copy, never a regex that could silently mismatch), so this cannot drift from what
// ships. If the reservation exceeds the ceiling, this exits non-zero and names it a BLOCKER —
// never truncates anything to make the number smaller.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

function utf8Len(s) { return Buffer.byteLength(String(s == null ? '' : s), 'utf8'); }
function slice(label, startAnchor, endAnchor) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) { console.error('ANCHOR DRIFT (' + label + '): start anchor not found'); process.exit(1); }
  const to = SRC.indexOf(endAnchor, from + startAnchor.length);
  if (to === -1) { console.error('ANCHOR DRIFT (' + label + '): end anchor not found'); process.exit(1); }
  return SRC.slice(from, to + endAnchor.length);
}

const MODEL = 'mistral-small-latest';
const TPM = 20000; // api/_mistral-governor.js MODEL_LIMITS['mistral-small-latest'].tpm

// ── Static system-prompt template (paid by EVERY scene-spine call, before any addition) ──
const scSysTemplate = slice('sys-template',
  "var _scSys = 'You are the SCENE-SPINE planner",
  "Return ONLY JSON: { \"tactical_move\":\"\", \"state_change_precondition\":\"\", \"state_change\":\"\", \"forces_choice\":\"\", \"branch_a\":\"\", \"branch_b\":\"\" }';");

// ── OPEN-ROW branch: required schema line + the issuer's stage-packet addition ──
const openRowRequired = slice('open-row-required',
  "_scSys += '\\n\\nOPEN ROW (REQUIRED",
  "Your state_change realizes the local_objective.';");
const openRowIssuerAddition = slice('open-row-issuer-addition',
  "_scSys += ' Also add, same JSON, all optional",
  "with what\\'s here).';");

// ── Corridor/non-OPEN-ROW branch: the issuer's standalone STAGE PACKET addition ──
const corridorAddition = slice('corridor-stage-packet',
  "_scSys += '\\n\\nSTAGE PACKET (optional",
  "array of short strings).';");

const _scMaxTok = 320; // the shipped default (no richer-contract flag set) — the common case this route serves

console.log('=== STAGE ISSUER ADMISSION MEASUREMENT — REAL SOURCE, ' + MODEL + ' (' + TPM + ' TPM) ===\n');

function reportRoute(label, sysBytes, usrApprox) {
  const reserve = sysBytes + usrApprox + _scMaxTok;
  const admitted = reserve <= TPM;
  console.log(label);
  console.log('  sys bytes: ' + sysBytes + '  usr (approx, seed-derived) bytes: ' + usrApprox + '  maxTokens: ' + _scMaxTok);
  console.log('  reserve: ' + reserve + ' / ' + TPM + ' -> ' + (admitted ? 'ADMITTED (headroom ' + (TPM - reserve) + ')' : 'OVERSIZED (NAMED BLOCKER, over by ' + (reserve - TPM) + ')'));
  console.log('');
  return admitted;
}

const staticSysLen = utf8Len(scSysTemplate);
const openRowSchemaLen = utf8Len(openRowRequired) + utf8Len(openRowIssuerAddition);
const corridorSchemaLen = utf8Len(corridorAddition);

// Real First Sacrifice Scene 2 OPEN-ROW usr-content ceiling: the seed's own authored
// aftermathTruths + vectors blocks (extracted verbatim), plus a conservative flat allowance for
// the roster/reserved/posture/aftermath-emitted lines the runtime prompt also assembles.
const aftermathBlock = slice('aftermath-truths', "aftermathTruths: [\n        { id: 'twist_manifested'", "],\n      participants:");
const vectorsBlock = slice('vectors', "vectors: [\n", "      ],\n      // AFTERMATH TRUTHS");
const openRowUsrApprox = utf8Len(aftermathBlock) + utf8Len(vectorsBlock) + 1800;

// Corridor usr-content: no seed roster/aftermath text exists — materially smaller. Same flat
// allowance used as a conservative over-estimate (never under-count on purpose).
const corridorUsrApprox = 1800;

let allAdmitted = true;
allAdmitted = reportRoute('OPEN-ROW route (e.g. First Sacrifice Scene 2) -- sys = static template + OPEN-ROW schema + issuer addition:',
  staticSysLen + openRowSchemaLen, openRowUsrApprox) && allAdmitted;
allAdmitted = reportRoute('Corridor/non-OPEN-ROW route -- sys = static template + STAGE PACKET addition:',
  staticSysLen + corridorSchemaLen, corridorUsrApprox) && allAdmitted;

console.log('Static template: ' + staticSysLen + ' bytes  |  OPEN-ROW addition: ' + openRowSchemaLen + ' bytes  |  corridor addition: ' + corridorSchemaLen + ' bytes');

if (!allAdmitted) {
  console.log('\nBLOCKER: at least one route exceeds the mistral-small-latest TPM ceiling. Named, not silently');
  console.log('truncated -- the issuer must not be called deployable on this route until resolved.');
  process.exit(1);
}
console.log('\nBoth routes ADMITTED on the real, currently-shipped strings. Deployable on this axis.');
process.exit(0);
