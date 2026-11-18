// RECORD SCENE 4'S SOCIAL ADMIRATION FROM THE PUBLISHED PAGE (Roman 2026-11-18)
//
// Luna delivered it; the ledger never credited it, because the scheduler dropped the obligation
// before the editor saw it. The passage exists on the published page, so it is recorded from
// there rather than bought again. Provenance says exactly what this is: a retrospective
// assessment, not an editor KEEP, and no judge verified it.
import fs from 'node:fs';
const ROOT = '/Users/romantsukerman/storybound-app/';
const PAGE = fs.readFileSync(ROOT + '_FT_SCENE4_PUBLISHED.txt', 'utf8');

// The passage: Roman backs her refusal in front of the crew, and her shoulders ease.
const a = PAGE.indexOf('Roman fell silent beside the form.');
const b = PAGE.indexOf('though I kept my place at the counter.');
const PASSAGE = (a === -1 || b === -1) ? '' : PAGE.slice(a, b + 'though I kept my place at the counter.'.length);
if (!PASSAGE) { console.error('could not locate the social passage'); process.exit(2); }

const SAVE = ROOT + '_ft_scene4_paid/LATEST/RESUMABLE_STATE.json';
const dump = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
const saved = JSON.parse(String(dump.storage.sb_saved_story));
const snap = saved.stateSnapshot;
const L = snap._liAdmirationLedger;
if (!L) { console.error('the save carries no admiration ledger'); process.exit(2); }

L.areas.social = { status: 'delivered', beats: [{
  scene: 4, passage: PASSAGE,
  why: 'he states her refusal in front of the crew so the producer cannot later recast it as a '
    + 'private misunderstanding; she registers the protection in her body while giving no ground',
  via: 'retrospective assessment', semanticallyVerified: false,
  recordedAt: new Date().toISOString(),
}] };
saved.stateSnapshot = snap;
dump.storage.sb_saved_story = JSON.stringify(saved);
fs.writeFileSync(ROOT + '_ft_scene4_published/RESUMABLE_STATE.json', JSON.stringify(dump, null, 2));

console.log('RECORDED — social admiration, scene 4');
console.log('  passage : "' + PASSAGE.replace(/\s+/g, ' ') + '"');
console.log('  why     : ' + L.areas.social.beats[0].why);
console.log('  via     : ' + L.areas.social.beats[0].via);
console.log('\nCOVERAGE NOW');
['physical', 'social', 'capability'].forEach((k) => {
  const A = L.areas[k];
  console.log('  ' + k.padEnd(11) + A.status
    + (A.beats.length ? ('  scene ' + A.beats[A.beats.length - 1].scene
      + ' [' + A.beats[A.beats.length - 1].via + ']') : ''));
});
console.log('\n  the continuation save is _ft_scene4_published/RESUMABLE_STATE.json');
