// C+ FACET SOURCE — free, no model calls. The psychological source, addressed by identity.
//
// The defect this exists to prevent: the planner receives NAMES and is asked for specific
// psychology, so it manufactures "her breath hitches". A facet record gives every C+ assignment
// a citable source — and a character with no authored facet must produce a DECLINE, never an
// invention.
//
// usage: node _cplus_facet_source.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nC+ FACET SOURCE — authored psychology, resolvable by canonical identity\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
await page.route('**/api/**', r => PASSTHROUGH.test(r.request().url()) ? r.continue() : r.abort());
await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await page.waitForFunction(() => window._seedFacetIndex && window._facetsForCharacter && window.STARTER_SEEDS, { timeout:120000 });

const R = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { _starterId:'starter_first_sacrifice', is_starter_story:true,
    playerName:'Lirael', name:'Lirael', loveInterestName:'Julian' });
  const idx = window._seedFacetIndex(s);
  const byLabel = (label, id, aliases) => window._facetsForCharacter({ id, label, aliases: aliases || [label] }, s);
  return { idx,
    seren:  byLabel('Seren', 'named:seren'),
    julian: byLabel('Julian', 'named:julian'),
    pc:     byLabel('Lirael', 'pc:lirael'),
    dohkar: byLabel('the presiding Dohkar', 'role:the_presiding_dohkar'),
    dohkarByAlias: byLabel('Dohkar', 'role:dohkar', ['Dohkar']),
    unknown: byLabel('a guest', 'named:a_guest'),
    cats: window._CPLUS_FACET_CATEGORIES };
});

// ── the tracer: the characterization that was authored and never delivered ──
t('1a: Seren resolves to authored facets', R.seren.length === 3, JSON.stringify(R.seren.map(f => f.facet_id)));
t('1b: her performative empathy is one of them, from canon',
  R.seren.some(f => f.facet_id === 'seren_goodness_needs_witness' && /needs her goodness to be seen/i.test(f.canonical_truth)),
  JSON.stringify(R.seren.map(f => f.canonical_truth.slice(0, 50))));
t('1c: her three facets are genuinely distinct, not one truth split three ways',
  new Set(R.seren.map(f => f.category)).size === 3,
  JSON.stringify(R.seren.map(f => [f.facet_id, f.category])));
t('1d: every facet carries its own source_character_id',
  R.seren.every(f => f.source_character_id === 'named:seren'));

// ── the role instance, and the scoping that keeps it out of the profession ──
t('2a: the presiding Dohkar resolves by canonical id', R.dohkar.length === 1, JSON.stringify(R.dohkar.map(f => f.facet_id)));
t('2b: his contempt is the authored facet',
  R.dohkar.some(f => f.facet_id === 'presiding_dohkar_ritual_contempt' && /cannot be bothered to pretend/i.test(f.canonical_truth)));
t('2c: he resolves by alias too ("Dohkar" as the planner spells it)',
  R.dohkarByAlias.length === 1 && R.dohkarByAlias[0].facet_id === 'presiding_dohkar_ritual_contempt');
t('2d: the record is a ROLE INSTANCE, not the Dohkar profession',
  Object.keys(R.idx).some(k => R.idx[k].role_instance_id === 'first_sacrifice_presiding_dohkar'));
t('2e: it carries NO characterization from the doctrine\'s other Dohkar (Raes)',
  !R.dohkar.some(f => /debt coming due|bad luck/i.test(f.canonical_truth)));

// ── LI and PC ──
t('3a: Julian resolves to his own facets, not Seren\'s',
  R.julian.length === 2 && R.julian.every(f => f.source_character_id === 'named:julian'),
  JSON.stringify(R.julian.map(f => f.facet_id)));
t('3b: the PC has facets too — she is the OBSERVED party elsewhere',
  R.pc.length === 2 && R.pc.every(f => f.source_character_id === 'pc:lirael'),
  JSON.stringify(R.pc.map(f => f.facet_id)));

// ── the decline path: no source means no C+, never an invention ──
t('4a: an unknown character resolves to NO facets', R.unknown.length === 0, JSON.stringify(R.unknown));
t('4b: no two characters share a facet_id',
  (() => { const all = [...R.seren, ...R.julian, ...R.pc, ...R.dohkar].map(f => f.facet_id);
           return all.length === new Set(all).size; })());
t('4c: every facet_id is unique across the whole seed index',
  (() => { const all = Object.values(R.idx).flatMap(e => e.facets.map(f => f.facet_id));
           return all.length === new Set(all).size; })());

// ── shape ──
t('5a: every category is from the doctrine\'s own ten',
  Object.values(R.idx).flatMap(e => e.facets).every(f => R.cats.includes(f.category)),
  JSON.stringify(R.cats));
t('5b: possible_pressures are applicability conditions, never prose to copy',
  Object.values(R.idx).flatMap(e => e.facets).every(f =>
    Array.isArray(f.possible_pressures) && f.possible_pressures.every(p => p.split(/\s+/).length <= 12)));
t('5c: every facet declares a canonical_truth', 
  Object.values(R.idx).flatMap(e => e.facets).every(f => f.canonical_truth && f.canonical_truth.length > 30));

await browser.close();
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
