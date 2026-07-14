// Guard (Fable CG audit — A2-F8): the CG prompt shipped three colliding RIGID quotas — "28-45 beats,
// MORE welcome / MANY SMALL TIGHT beats NEVER longer" (system) vs ST3/4 "fewer beats, longer ones" (a
// direct beat-shape contradiction) vs "UNDER ~1000 words" (arithmetically incompatible with 45+ beats).
// Fix (per Roman): resolve via PRIORITY, not simultaneous rigid quotas — word ceiling wins when active,
// intimacy pace lowers the count, and the beat-count is a target that yields.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The rigid, collision-causing phrasings are gone.
A(!src.includes('MORE is welcome for a rich scene'), 'beat-count still says "MORE is welcome" (collides with the word ceiling)');
A(!src.includes('Richness comes from MANY SMALL TIGHT beats, NEVER from longer ones'), 'universal "NEVER from longer ones" still fights the ST3/4 breathe-guidance');
A(!src.includes('fewer beats, longer ones;'), 'ST3/4 density still says "fewer beats, longer ones" (contradicts the 1-2 sentence cap)');

// (2) The beat count is now a target that explicitly YIELDS to the priority bounds.
A(src.includes('BEAT COUNT (TARGET, not a rigid quota — it YIELDS to the two priority bounds below)'), 'beat count not reframed as a yielding target');
A(src.includes('if a LENGTH CEILING is active (see the user prompt), the CEILING WINS'), 'priority 1 (length ceiling wins) missing');
A(src.includes('on an INTIMACY-PACE scene (ST3/ST4, see SCENE DENSITY), run FEWER beats that breathe'), 'priority 2 (intimacy pace lowers count) missing');
A(src.includes('These are not simultaneous rigid quotas — when they conflict, the active bound governs'), 'explicit not-simultaneous-quotas framing missing');

// (3) The word ceiling is declared the PRIORITY bound over the beat-count target.
A(src.includes("PRIORITY BOUND — this takes PRECEDENCE over the system prompt\\'s beat-count target"), 'length ceiling not declared the priority bound');

// (4) ST3/4 "longer" reconciled to breath within the 1-2 sentence cap (no beat-shape contradiction).
A(src.includes('still within the 1–2-sentence-per-beat cap ("longer" here means more breath'), 'ST3/4 density not reconciled to the sentence cap');

// (5) The universal 1-2-sentence granularity cap is preserved (it is the invariant everything defers to).
A(src.includes('1–2 sentences per beat — HARD, no exceptions. NEVER 3+.'), 'universal 1-2 sentence granularity cap was lost');

if (fail) process.exit(1);
console.log('PASS: beat-count reframed as a target that yields to the length-ceiling (priority 1) and intimacy pace (priority 2); ST3/4 "longer" reconciled to breath within the 1-2 sentence cap; no simultaneous rigid quotas.');
