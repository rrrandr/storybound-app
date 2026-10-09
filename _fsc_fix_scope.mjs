import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const a = `    // invokerScope is a memory_perception concern only; relationship_social has no population
    // to be in or out of.
    rec.invokerScope = (o.cls === 'memory_perception' && rec.population)
      ? _fscInvokerScope(rec.population, null) : null;`;
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
const b = `    // invokerScope is recorded wherever a POPULATION determines who is affected — which is
    // wherever the outcome carries memory effects, NOT wherever the class happens to be
    // memory_perception. unm.time_gives_way is history_rewrite and still targets
    // population.scene_present, so keying on class left its record silent about whether Lirael
    // is inside the population. D1 requires the record to say. A class with no targeted
    // population (relationship_social's affectedParties) correctly gets null.
    rec.invokerScope = (rec.population && (o.memoryEffects || []).length)
      ? _fscInvokerScope(rec.population, null) : null;`;
fs.writeFileSync(F, s.replace(a, b));
console.log('invokerScope now derives from a targeted population, not from the class');
