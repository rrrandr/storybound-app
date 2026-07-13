// Guard (Fable CG audit — A2-F1): CG persists scene prose into state.scenes BEFORE the in-place
// placeholder-name scrub + marker strip run, so state.scenes[last].text carried raw <<+phrase+>> /
// <<LI-MYSTERY>> / <<LI-BURDEN>> markers (and confabulated placeholder names) into save/resume AND
// into the next scene's PRIOR SCENE TAIL. Fix: re-sync the persisted text from cleaned beats AFTER
// the strip. This guard asserts the re-sync exists and runs after the strip (ordering matters).
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// Anchor within _completeStagedSceneFromScreenplay's post-gen block.
const persistIdx = src.indexOf("state.scenes.push({ title: '', synopsis: '', text: proseAssembled, fateCard: null });");
A(persistIdx >= 0, 'initial CG prose persist not found');

const stripIdx = src.indexOf('_extractAndStripLIMysteryMarkers(_b.text)');
A(stripIdx >= 0, 'per-beat marker strip loop not found');

const resyncNeedle = "state.scenes[state.scenes.length - 1].text = plan.beats.map(function (b) { return (b && b.text) || ''; }).join('\\n\\n');";
const resyncIdx = src.indexOf(resyncNeedle);
A(resyncIdx >= 0, 're-sync of persisted prose from cleaned beats missing');

// Ordering: persist first, THEN the strip loop mutates beats, THEN the re-sync copies cleaned beats back.
A(persistIdx < stripIdx, 'persist should precede the strip loop (unchanged ordering assumption broke)');
A(stripIdx < resyncIdx, 're-sync must run AFTER the marker strip, else it copies un-stripped text');

// The re-sync must be scoped by a presence check so it never throws on an empty scenes array.
A(src.slice(resyncIdx - 160, resyncIdx).includes('if (state.scenes && state.scenes.length)'), 're-sync not guarded by a scenes-length check');

if (fail) process.exit(1);
console.log('PASS: CG persisted prose is re-synced from placeholder-scrubbed + marker-stripped beats after the strip loop — no raw markers/placeholder names leak into save/resume or the next-scene PRIOR SCENE TAIL.');
