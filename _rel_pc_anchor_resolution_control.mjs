// PC ANCHOR RESOLUTION CONTROL — the relationship ledger's protagonist anchor must read the
// app's ONE canonical PC-name resolver, not a private fallback chain.
//
// Roman, 2026-09-24: "Do not keep the nested First Sacrifice name fallback local to
// `_temptOutcomeSceneRosterDetailed`. Identify the app's authoritative protagonist-name
// resolver/fallback chain and make `_relEnsureAnchors` use that same source, just as its LI anchor
// already uses the nested identity state."
//
// The defect: _relEnsureAnchors resolved the PC through `state.name || state.playerName ||
// 'the protagonist'`. That chain never consulted the starter seed's own PC, never consulted the
// NESTED state.picks.identity.playerName, and had no placeholder test — so state.playerName
// holding the KERNEL ("the one who carries the story") beat the real name. First Sacrifice's PC
// anchor labelled itself "the protagonist", and every author-facing relational directive built
// from the ledger carried that instead of "Lirael".
//
// _resolvePcIdentity (app.js ~132700) is the canonical resolver and says so in its own header:
// "Every consumer reads this — never its own chain."
//
// Everything here runs against REAL exported production functions. Zero provider dispatches.
//
// usage: node _rel_pc_anchor_resolution_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_rel_pc_anchor_resolution_control_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  console.log('=== PC ANCHOR RESOLUTION CONTROL (dry; zero provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._relLedger && window._relEntityForName
    && window._resolvePcIdentity && window._isPlaceholderPcName && window._renderStageDirectiveText
    && window._temptOutcomeSceneRosterDetailed, { timeout: 30000 });

  // Forces the REAL ledger-creation path (_relLedger(true) → _relEnsureAnchors) through an
  // exported production entry point, rather than hand-building a ledger object here.
  const anchorsFor = (setup) => page.evaluate((cfg) => {
    const s = window.state;
    // Fresh story identity each time — _relLedger binds a ledger to its storyId.
    s.storyId = cfg.storyId;
    delete s._relationshipLedger;
    delete s._relLedgerCarryAdopt;
    delete s._starterId; delete s.name; delete s.playerName; delete s.identity;
    delete s.loveInterestName; delete s.partnerName;
    s.picks = { identity: {} };
    if (cfg.starterId) s._starterId = cfg.starterId;
    if (cfg.name) s.name = cfg.name;
    if (cfg.playerName) s.playerName = cfg.playerName;
    if (cfg.nestedPlayerName) s.picks.identity.playerName = cfg.nestedPlayerName;
    if (cfg.nestedPartnerName) s.picks.identity.partnerName = cfg.nestedPartnerName;
    if (cfg.preseed) s._relationshipLedger = cfg.preseed;
    window._relEntityForName('a passing scribe');   // real path; creates the ledger, ensures anchors
    const L = window._relLedger();
    const ents = (L && L.entities) || {};
    const pc = Object.keys(ents).map((k) => ents[k]).filter((e) => e && e.anchorRole === 'pc')[0] || null;
    const li = Object.keys(ents).map((k) => ents[k]).filter((e) => e && e.anchorRole === 'li')[0] || null;
    return {
      pcLabel: pc && pc.label, pcId: pc && pc.id, pcAliases: (pc && pc.aliases) || [],
      liLabel: li && li.label,
      pcCount: Object.keys(ents).filter((k) => ents[k] && ents[k].anchorRole === 'pc').length,
      entityIds: Object.keys(ents).sort(),
      edgeIds: Object.keys((L && L.edges) || {}).sort(),
      resolved: window._resolvePcIdentity(window.state)
    };
  }, setup);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. THE CANONICAL RESOLVER IS WHAT THE ANCHOR NOW READS');
  const fs1 = await anchorsFor({ storyId: 'pcanchor-fs-1', starterId: 'starter_first_sacrifice', nestedPartnerName: 'Julian' });
  console.log('    First Sacrifice resolved: ' + JSON.stringify(fs1.resolved));
  ok('FIRST SACRIFICE resolves the PC anchor to "Lirael", not "the protagonist"',
    fs1.pcLabel === 'Lirael', JSON.stringify(fs1));
  ok('...and it came from the starter seed\'s own PC entry, through _resolvePcIdentity',
    fs1.resolved && fs1.resolved.src === 'starterSeed.cast.PC.name', JSON.stringify(fs1.resolved));
  ok('the LI anchor still resolves through the nested identity state it already used',
    fs1.liLabel === 'Julian', JSON.stringify(fs1));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. A SYNTHETIC NON-FIRST-SACRIFICE STORY RESOLVES ITS OWN CONFIGURED NAME');
  const topLevel = await anchorsFor({ storyId: 'pcanchor-syn-1', playerName: 'Wren' });
  ok('a corridor-shaped story with a TOP-LEVEL configured name resolves it',
    topLevel.pcLabel === 'Wren', JSON.stringify(topLevel));
  const nested = await anchorsFor({ storyId: 'pcanchor-syn-2', nestedPlayerName: 'Sable' });
  ok('a story configured only through the NESTED picks.identity.playerName resolves it — the case the old chain could not see',
    nested.pcLabel === 'Sable', JSON.stringify(nested));
  // The old chain was `state.name || state.playerName`: with the kernel in playerName and the real
  // name only in the nested field, it returned the kernel as if it were a name.
  const kernel = await anchorsFor({ storyId: 'pcanchor-syn-3', playerName: 'the one who carries the story', nestedPlayerName: 'Ilse' });
  ok('a KERNEL in state.playerName no longer beats the real name — the placeholder filter the old chain lacked',
    kernel.pcLabel === 'Ilse', JSON.stringify(kernel));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. A STORY WITH NO CONFIGURED NAME KEEPS THE GENERIC FALLBACK');
  const anon = await anchorsFor({ storyId: 'pcanchor-anon-1' });
  ok('no configured name anywhere → the PC anchor stays "the protagonist"',
    anon.pcLabel === 'the protagonist', JSON.stringify(anon));
  ok('...and the canonical resolver honestly reports NO hit rather than inventing one',
    anon.resolved === null, JSON.stringify(anon.resolved));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. SAVE/RELOAD COMPATIBILITY — upgrade IN PLACE, never fork a second protagonist');
  // A ledger as it would arrive from a story saved BEFORE this fix: the placeholder label, plus a
  // real neighbour entity and a real edge that must survive untouched.
  const carried = await anchorsFor({
    storyId: 'pcanchor-carry-1', starterId: 'starter_first_sacrifice', nestedPartnerName: 'Julian',
    preseed: {
      v: 1, storyId: 'pcanchor-carry-1', processed: {}, seq: 7,
      entities: {
        pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'the protagonist', aliases: [] },
        li: { id: 'li', kind: 'named', anchorRole: 'li', label: 'Julian', aliases: [] },
        ent_seren: { id: 'ent_seren', kind: 'named', label: 'Seren', aliases: [] }
      },
      edges: { e1: { id: 'e1', from: 'pc', to: 'ent_seren', kind: 'knows' } }
    }
  });
  ok('a carried ledger\'s placeholder PC label is UPGRADED to the resolved name',
    carried.pcLabel === 'Lirael', JSON.stringify(carried));
  ok('...on the SAME entity id — no second protagonist was minted',
    carried.pcId === 'pc' && carried.pcCount === 1, JSON.stringify(carried));
  ok('...with the entity set otherwise untouched (the neighbour survives, nothing added)',
    JSON.stringify(carried.entityIds) === JSON.stringify(['ent_seren', 'li', 'pc']), JSON.stringify(carried.entityIds));
  ok('...and the existing edge preserved, so nothing already asserted about the PC was orphaned',
    JSON.stringify(carried.edgeIds) === JSON.stringify(['e1']), JSON.stringify(carried.edgeIds));
  ok('...keeping the old label as an ALIAS, so prior matches against "the protagonist" still resolve',
    carried.pcAliases.indexOf('the protagonist') !== -1, JSON.stringify(carried.pcAliases));
  ok('the upgrade announced itself in the log rather than changing canon silently',
    consoleLines.some((t) => /PC anchor label upgraded in place/.test(t)),
    consoleLines.filter((t) => /REL-LEDGER/.test(t)).slice(-2).join(' | '));

  // The other half of the contract: a label that is already a REAL name is never overwritten,
  // even when the resolver would produce something different.
  const named = await anchorsFor({
    storyId: 'pcanchor-carry-2', starterId: 'starter_first_sacrifice',
    preseed: {
      v: 1, storyId: 'pcanchor-carry-2', processed: {}, seq: 3,
      entities: { pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Mira', aliases: [] } },
      edges: {}
    }
  });
  ok('an existing REAL name is NEVER overwritten — the upgrade only replaces placeholders',
    named.pcLabel === 'Mira', JSON.stringify(named));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. AUTHOR-FACING RELATIONAL DIRECTIVES CARRY THE RESOLVED NAME');
  await anchorsFor({ storyId: 'pcanchor-directive-1', starterId: 'starter_first_sacrifice', nestedPartnerName: 'Julian' });
  const directive = await page.evaluate(() => window._renderStageDirectiveText({
    location: { label: 'the clearing' },
    present: ['pc', 'li'],
    issued_facts: [], issued_objects: [], affordances: []
  }));
  fs.writeFileSync(path.join(OUT_DIR, 'stage_directive.txt'), directive);
  ok('the REAL author-facing stage directive names "Lirael" in its PRESENT line',
    /PRESENT:[^\n]*Lirael/.test(directive), directive.slice(0, 300));
  ok('...and no longer says "the protagonist" anywhere in it',
    directive.indexOf('the protagonist') === -1, directive.slice(0, 300));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. THE TEMPT ROSTER CONSUMES THE SHARED ANCHOR — no second resolution rule');
  // DECISIVE: a story whose ledger already carries a REAL but DIFFERENT name ("Mira") while the
  // configured identity says "Sable". A roster with its own fallback chain would report "Sable";
  // one that reads the shared anchor must report "Mira".
  const single = await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'pcanchor-single-source';
    delete s._starterId; delete s.name; delete s.playerName;
    s.picks = { identity: { playerName: 'Sable', partnerName: 'Julian' } };
    s._relationshipLedger = {
      v: 1, storyId: 'pcanchor-single-source', processed: {}, seq: 1,
      entities: { pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Mira', aliases: [] } },
      edges: {}
    };
    window._relEntityForName('a passing scribe');
    const roster = window._temptOutcomeSceneRosterDetailed({ beats: [] }, 1);
    const L = window._relLedger();
    return { roster, anchorLabel: L.entities.pc.label, configured: s.picks.identity.playerName };
  });
  const invokerEntry = (single.roster || []).filter((r) => r.sources.includes('invoker'))[0] || null;
  ok('the roster\'s invoker is the SHARED ANCHOR label ("Mira"), not the configured identity ("Sable")',
    invokerEntry && invokerEntry.name === 'Mira' && single.anchorLabel === 'Mira', JSON.stringify(single));
  ok('...proving the roster kept NO private fallback chain of its own',
    invokerEntry && invokerEntry.name !== single.configured, JSON.stringify(invokerEntry));

  section('CONTAINMENT');
  ok('ZERO real provider dispatches across the whole control', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('PC ANCHOR RESOLUTION CONTROL: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
