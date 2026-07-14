// Guard (Fable CG audit — A2-F7 / A2-F10 / A3-F5): mark dead / misleading CG code so future work (and
// future audits) don't waste time on it or trust a false claim. These are annotations, not deletions —
// the underlying code is intentionally left runnable (revival/save-compat), so the guard also confirms
// the annotated code itself is unchanged.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (A2-F7) The dead CG signature-lens hook is marked dead + the hook itself is unchanged.
A(src.includes('DEAD ON THIS PATH (Fable CG audit A2-F7'), 'dead-lens annotation missing');
A(src.includes('if (plan && plan.panels && typeof window._applyCGSignatureLens === \'function\')'), 'lens hook changed (should be left as-is, just annotated)');

// (A2-F10) The misleading "also guaranteed by the mount-stage repair" claim is corrected for CG.
A(src.includes('NOTE — A2-F10') && src.includes('_isScene1Lit-gated and does NOT run in CG staged mode'), 'A2-F10 misleading-backstop correction missing');
A(!src.includes('cap named cast at one. Guaranteed by the mount-stage enforcement (repair) too.'), 'stale "guaranteed by mount-stage repair" claim still present');

// (A3-F5) The legacy graphic_novel planner is marked resume-only (kept for save-compat, not dead).
A(src.includes('LEGACY / RESUME-ONLY (Fable CG audit A3-F5'), 'legacy graphic_novel annotation missing');
A(src.includes('async function planGraphicNovelPanels(sceneText)'), 'planGraphicNovelPanels signature changed (should be kept for save-compat)');

if (fail) process.exit(1);
console.log('PASS: dead CG signature-lens hook + misleading mount-stage-backstop comment + legacy graphic_novel planner are annotated (dead / corrected / resume-only); underlying code left runnable for revival/save-compat.');
