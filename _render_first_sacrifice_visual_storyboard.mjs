#!/usr/bin/env node
// FIRST SACRIFICE — HUMAN-REVIEWABLE VISUAL STORYBOARD (Roman, 2026-09-19)
//
// Renders the LOCKED scene1_visual_storyboard (packet v9.1.0+) as a Markdown document for Roman's
// review of the actual visual RHYTHM — the "13/13 passed" consistency control proves the mapping
// doesn't drift from the real renderer data, it says nothing about whether the sequence itself reads
// well. This is the human-judgment artifact that check can't replace.
//
// NO provider/image calls — pure data rendering from the packet + starter-scenes.js, both read-only.
//
// usage: node _render_first_sacrifice_visual_storyboard.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const starterSrc = fs.readFileSync(path.join(__dirname, 'public/starter-scenes.js'), 'utf8');

// Real starter package, evaluated (not hand-copied) — same brace-matching technique as the
// consistency control, so this document is generated from the actual runtime data.
const keyIdx = starterSrc.indexOf('starter_first_sacrifice:');
const braceStart = starterSrc.indexOf('{', keyIdx);
let depth = 0, i = braceStart, braceEnd = -1;
for (; i < starterSrc.length; i++) { if (starterSrc[i] === '{') depth++; else if (starterSrc[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } } }
const REAL_PKG = new Function('return ' + starterSrc.slice(braceStart, braceEnd + 1))();

const sb = PACKET.scene1_visual_storyboard;
const bnt = PACKET.scene1_beat_number_template;
const realOcc = REAL_PKG.imageOccurrences;
const realAssets = {}; (REAL_PKG.imageAssets || []).forEach(a => { realAssets[a.id] = a; });

function assetKindLabel(beat) {
  if (beat.treatment === 'full') return 'intro';
  if (beat.treatment === 'quadrant') return 'quadrant ' + beat.quadrant + ' of interaction_sheet_1';
  return 'reuse (' + beat.treatment + ' crop of an existing asset)';
}
function kindLabel(beat, fn) {
  if (beat.kind === 'dialogue') return 'dialogue';
  if (beat.kind === 'narration_or_dialogue') return 'narration or dialogue (either)';
  // narration beats: distinguish plain establishing narration from explicit interiority
  if (/^Free interiority/i.test(fn) || /interiority/i.test(fn.slice(0, 40))) return 'narration — interiority';
  return 'narration';
}

const L = [];
L.push('# First Sacrifice — Locked Visual Storyboard (for review)');
L.push('');
L.push('**Packet:** `_first_sacrifice_source_packet.json` v' + PACKET.version + ' — `scene1_visual_storyboard` section');
L.push('**Runtime source cross-checked:** `public/starter-scenes.js` `starter_first_sacrifice.imageAssets` / `imageOccurrences` (real evaluation, not restated by hand)');
L.push('**Consistency proof:** `_first_sacrifice_visual_storyboard_control.mjs` — 13/13 (structural agreement only; does NOT judge visual rhythm — that is this document\'s purpose)');
L.push('**Generated:** ' + new Date().toISOString().slice(0, 10) + ' — no provider or image call made to produce this document');
L.push('');
L.push('## Asset roster (5 real assets)');
L.push('');
L.push('| Asset ID | Kind | Label | Used by occurrence(s) |');
L.push('|---|---|---|---|');
Object.keys(realAssets).forEach(aid => {
  const occKeys = Object.keys(realOcc).filter(k => realOcc[k].assetId === aid);
  L.push('| `' + aid + '` | ' + realAssets[aid].kind + ' | ' + realAssets[aid].label + ' | ' + occKeys.map(k => '`' + k + '`').join(', ') + ' |');
});
L.push('');
L.push('9 occurrences resolve across those 5 assets: 4 solo intros (full), 4 quadrants of the ONE shared interaction sheet, and 1 reuse (the Dohkar reprise, below). **No ninth asset is ever created.**');
L.push('');

L.push('## Compact occurrence timeline');
L.push('');
L.push('The actual visual sequence a reader moves through, at a glance:');
L.push('');
L.push('```');
L.push('  INTRODUCTIONS (beats 1-8)              INTERACTION SHEET (beats 9-20)            REPRISE');
L.push('  ────────────────────────────           ──────────────────────────────            ───────');
L.push('  [1] Lirael   (intro_lirael, full)       [9-10]  d1 — quadrant 0                   ');
L.push('  [2] Lirael   (intro_lirael, full)       [11-14] d2 — quadrant 1                   ');
L.push('  [3] Seren    (intro_seren,  full)       [15-17] d3 — quadrant 2                   [reprise] Dohkar');
L.push('  [4] Seren    (intro_seren,  full)       [18-20] d4 — quadrant 3                     (intro_dohkar,');
L.push('  [5] Dohkar   (intro_dohkar, full)                                                    close crop —');
L.push('  [6] Dohkar   (intro_dohkar, full)       one shared 2x2 sheet asset                   SAME asset as');
L.push('  [7] Julian   (intro_julian, full)       (interaction_sheet_1), split into              beats 5-6,');
L.push('  [8] Julian   (intro_julian, full)       4 quadrants — ONE generation call             reused, not');
L.push('                                          covers all 12 of these beats                  regenerated)');
L.push('```');
L.push('');
L.push('Rhythm: 4 characters introduced solo (2 beats each) → one 12-beat, 4-quadrant dramatic sequence (the rite, the wish, the twist, the charge, The Answer) → the OAS handoff → live one-on-one → Dohkar\'s interruption reprises his OWN intro portrait at a tighter crop, not a new image.');
L.push('');

L.push('## Beat-by-beat (all 20)');
L.push('');
L.push('| # | Dramatic function | Coverage id | Occurrence | Asset | Type | Treatment | Text kind |');
L.push('|---|---|---|---|---|---|---|---|');
sb.beats.forEach(b => {
  const tmpl = bnt.slots[b.n - 1];
  const fn = (tmpl && tmpl.fn) || '';
  L.push('| ' + b.n + ' | ' + fn.replace(/\|/g, '/') + ' | ' + (b.id ? '`' + b.id + '`' : '_(free)_') + ' | `' + b.occurrence + '` | `' + b.assetId + '` | ' + assetKindLabel(b) + ' | ' + b.treatment + (b.quadrant != null ? ' (q' + b.quadrant + ')' : '') + ' | ' + kindLabel(b, fn) + ' (' + b.wordRange[0] + '-' + b.wordRange[1] + 'w) |');
});
L.push('');

L.push('## OAS handoff');
L.push('');
const oh = REAL_PKG.oasHandoff;
L.push('After beat 20, the scene hands off to the LIVE one-on-one (`endsAt: \'oas_interrupt\'`). Cue: *"' + oh.cue + '"* — no image occurrence of its own; the reader is already looking at the d4 quadrant (beat 18-20\'s asset) when this fires.');
L.push('');
L.push('The live OAS exchange is player-driven — not authored, not part of this storyboard.');
L.push('');

L.push('## The Dohkar reprise (explicit)');
L.push('');
const reprise = sb.dohkar_reprise;
L.push('When the Dohkar interrupts the live interrogation, the scene shows him again — **this is the SAME `intro_dohkar` asset used at beats 5-6, cropped to a tighter `close` treatment.** It is occurrence `dohkar_interruption`, the 9th and final occurrence — there is no 9th generated image anywhere in this scene.');
L.push('');
L.push('| Field | Value |');
L.push('|---|---|');
L.push('| Occurrence id | `' + reprise.occurrence + '` |');
L.push('| Asset id | `' + reprise.assetId + '` (identical asset to beats 5-6, not regenerated) |');
L.push('| Treatment | `' + reprise.treatment + '` (a zero-cost crop, not a new generation) |');
L.push('| Placement | ' + reprise.placement + ' |');
L.push('| Real wiring | `starter-scenes.js` → `oasHandoff.interruptionPortrait = \'' + reprise.occurrence + '\'`, mounted by `_mountIntimateInterruption` through the structured renderer (`_mountImageOccurrence`) — never markup in the interruption\'s authored prose. |');
L.push('');
L.push('Also present alongside the reprise (unchanged, pre-existing): the `d3` plate — the wide "assembly turns / charge" quadrant — as the establishing image for the interruption moment. The Dohkar close-up is additive, not a replacement.');
L.push('');
L.push('---');
L.push('*This document is generated, not authored — `_render_first_sacrifice_visual_storyboard.mjs`. Re-run after any packet or starter-scenes.js change to this scene.*');

const out = L.join('\n');
fs.writeFileSync(path.join(__dirname, '_first_sacrifice_visual_storyboard_review.md'), out, 'utf8');
console.log('Rendered ' + out.split('\n').length + ' lines to _first_sacrifice_visual_storyboard_review.md');
console.log('No provider/image calls made.');
