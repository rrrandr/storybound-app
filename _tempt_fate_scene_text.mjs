// Normalizes a state.scenes[] entry into plain text.
//
// Deliberately its OWN module: the live-run script's top-level IIFE starts a real, paid run at
// import time, so exporting this from there would mean any test importing it launches that run.
//
// Real shape, confirmed against the retained 2026-09-23 run: { title, synopsis, text, fateCard }.
// The live script previously passed that object straight to fs.writeFileSync and threw
// ERR_INVALID_ARG_TYPE *after* Scene A had settled, preempting the clean safeExit path.

export function sceneToText(scene) {
  if (scene == null) return '';
  if (typeof scene === 'string') return scene;
  if (typeof scene.text === 'string' && scene.text) return scene.text;
  if (Array.isArray(scene.beats)) return scene.beats.map((b) => (b && b.text) || '').filter(Boolean).join('\n\n');
  try { return JSON.stringify(scene, null, 2); } catch (_) { return String(scene); }
}
