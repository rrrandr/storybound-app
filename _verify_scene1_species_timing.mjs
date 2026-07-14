// Guard: Scene-1 species-timing fix (2026-07-14 meta-audit e). LI species was resolved only in
// _runFatelandsLoupe (post-gen, reader nav), so a non-human LI shipped Scene 1 with no species canon —
// the Scene-1 injection (_buildFantasySpeciesIntimacyDirective @224959) reads state._liSpecies which was
// still undefined. Fix: resolve species pre-gen (right after ensureFantasyCoreEntropy), mirroring the
// loupe's own setup, gated to region-final so it can't cast off a region the loupe would re-route; the
// loupe's !_liSpecies/!_playerSpecies guards make its later calls no-ops (no clobber).
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The pre-gen resolve exists and is placed after ensureFantasyCoreEntropy (which binds the region).
const ensureIdx = src.indexOf('window.ensureFantasyCoreEntropy();');
const pregenIdx = src.indexOf('[SPECIES:PREGEN] LI species resolved pre-Scene-1');
A(ensureIdx >= 0 && pregenIdx >= 0 && pregenIdx > ensureIdx,
  'pre-gen species resolve missing or not placed after ensureFantasyCoreEntropy');

// (2) It calls the same resolvers the loupe uses (faithful, not a reimplementation).
const region = pregenIdx >= 0 ? src.slice(pregenIdx - 1200, pregenIdx + 400) : '';
A(region.includes('_resolveLISpecies()') && region.includes('_resolveRegionalSpecies('),
  'pre-gen resolve does not reuse the loupe resolvers (_resolveLISpecies / _resolveRegionalSpecies)');

// (3) It is region-final gated (no mis-cast on an ancestry-pending region).
A(region.includes('_fantasyRegionOverrideApplied || !state._cachedAncestryPlayer'),
  'pre-gen resolve is not gated on the region being final (mis-cast risk)');

// (4) It only fires when species is unresolved (idempotent with the loupe — no clobber).
A(region.includes('!state._liSpecies') && region.includes("state.picks.world === 'Fantasy'"),
  'pre-gen resolve not guarded by !state._liSpecies / Fantasy');

// (5) The loupe's own LI-resolve guard still exists (so its later call no-ops after our pre-gen resolve).
A(src.includes('if (!state._liSpecies && state.picks?.world === \'Fantasy\') {\n      _resolveLISpecies();'),
  'loupe !_liSpecies guard changed — pre-gen resolve could be clobbered/double-run');

// (6) The two false "reaches Scene-1 pre-gen" comments were corrected (meta-audit f, folded in).
A(!src.includes('itself only reaches the Scene-1 pre-gen sysPrompt (not literary continuations)'),
  'false buildPlayerSpeciesDirective "reaches Scene-1" comment not corrected');

if (fail) process.exit(1);
console.log('PASS: LI/PC species resolve pre-Scene-1 (region-final gated, loupe-faithful, no clobber); false species comments corrected.');
