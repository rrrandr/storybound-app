import fs from 'fs';
const F = 'public/app.js';
const sub = (a, b) => {
  let s = fs.readFileSync(F, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70));
  if (s.split(a).length > 2) throw new Error('NOT UNIQUE: ' + a.slice(0, 70));
  fs.writeFileSync(F, s.replace(a, b));
};

// ── 1. "the assembly" means EVERYONE IN IT. Withdraw the crowd-only mapping. ────────────────
sub(
`    'population.assembly': {
      label: 'the assembly',
      members: ['the_assembly']            // the crowd of First Favored family and guests
      // excludes pc:lirael, named:seren, named:julian, role:first_sacrifice_presiding_dohkar
    },`,
`    // CORRECTED 2026-09-29. "The assembly" means EVERY PERSON IN IT. The prior mapping to an
    // unnamed crowd — excluding Lirael, Seren, Julian and the Dohkar — was OUR distinction, not
    // the player's. A player who says "the assembly should forget" has named a body that those
    // four stand inside; nothing in the wording exempts them, and no invoker exemption exists.
    // WITHDRAWN: the crowd-only reading of this word.
    'population.assembly': {
      label: 'the assembly',
      members: ['the_assembly', 'named:seren', 'named:julian',
                'role:first_sacrifice_presiding_dohkar', 'pc:lirael']
    },
    // "Crowd only" survives ONLY behind its own unambiguous wording. It may never again hide
    // behind the ordinary word "assembly".
    'population.guests': {
      label: 'the guests and onlookers',
      members: ['the_assembly']
    },`);

// ── 2. turning_forgotten now reaches everyone in the assembly. ──────────────────────────────
sub(
`    { id: 'unm.the_turning_forgotten', ask: 'unseen',
      cls: 'memory_perception', temporalOperation: null,
      requiresActive: ['twist.assembly_turned'], requiresInactive: [],
      ceases: [], establishes: [],
      population: 'population.assembly',`,
`    { id: 'unm.the_turning_forgotten', ask: 'unseen',
      cls: 'memory_perception', temporalOperation: null,
      requiresActive: ['twist.assembly_turned'], requiresInactive: [],
      ceases: [], establishes: [],
      // population.assembly is now everyone in it — Lirael, Seren, Julian and the Dohkar
      // included. invokerScope resolves to in_population; no named person is spared.
      population: 'population.assembly',`);

// ── 3. DEDUPLICATE. assembly and scene_present are now coextensive, so the two exact readings
//      anchored to them are the same outcome under two wordings. One id, both wordings.
sub(
`    { id: 'mem.exact.assembly_forgets_twist',
      propRx: /\\b(wish twisted|twisted|the twist|went wrong)\\b/i,
      scopeRx: /\\bthe assembly\\b/i,
      population: 'population.assembly',
      memoryEffects: [{ atom: 'twist.wish_misaligned', disposition: 'forgot' },
                      { atom: 'twist.intent_failed', disposition: 'forgot' }],
      cost: null },
    { id: 'mem.exact.all_present_forget_twist',
      propRx: /\\b(wish twisted|twisted|the twist|went wrong|the ceremony|what happened)\\b/i,
      scopeRx: /\\b(everyone here|everyone present|everybody here|all of them here)\\b/i,
      population: 'population.scene_present',
      memoryEffects: [{ atom: 'twist.wish_misaligned', disposition: 'forgot' },
                      { atom: 'twist.intent_failed', disposition: 'forgot' }],
      cost: null },`,
`    // DEDUPLICATED 2026-09-29. With "the assembly" corrected to mean everyone in it,
    // population.assembly and population.scene_present are COEXTENSIVE — so
    // mem.exact.assembly_forgets_twist and mem.exact.all_present_forget_twist became the same
    // outcome reached by two wordings. Merged into one identity; the second id is retired.
    // Two ways to say it, one thing that happens.
    { id: 'mem.exact.assembly_forgets_twist',
      propRx: /\\b(wish twisted|twisted|the twist|went wrong|the ceremony|what happened)\\b/i,
      scopeRx: /\\b(the assembly|everyone here|everyone present|everybody here|all of them here)\\b/i,
      population: 'population.assembly',
      memoryEffects: [{ atom: 'twist.wish_misaligned', disposition: 'forgot' },
                      { atom: 'twist.intent_failed', disposition: 'forgot' }],
      cost: null },
    // "Crowd only" now requires its OWN wording and reaches only the unnamed onlookers.
    { id: 'mem.exact.guests_forget_twist',
      propRx: /\\b(wish twisted|twisted|the twist|went wrong|the ceremony|what happened)\\b/i,
      scopeRx: /\\b(the guests|the onlookers|the watchers)\\b/i,
      population: 'population.guests',
      memoryEffects: [{ atom: 'twist.wish_misaligned', disposition: 'forgot' },
                      { atom: 'twist.intent_failed', disposition: 'forgot' }],
      cost: null },`);

console.log('population semantics corrected; readings deduplicated; guests lexicon added');
