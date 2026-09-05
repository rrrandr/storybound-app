// GEMINI 4-panel v2 — Roman's corrections:
//  • PC ref cropped to FIGURE-ONLY (panel 2 had inherited FLUX's wrong trees from the ref background)
//  • use the TWISTED red wish-burst ref (jagged cracks + X's) for the twist (P1) and corruption (P3);
//    the CLEAN golden burst only for restoration (P4), CENTERED on the kid's face
//  • P2 reframed: OTS over Julian, PC lunging toward the KID (kid in frame), not toward camera/Julian
//  • P3 intensified: dire facial distortion + radiating comic line-bursts + red twisted burst around her
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';
const APP = '/Users/romantsukerman/storybound-app';
const BASE = 'http://localhost:3000';
const raw = f => fs.readFileSync(f).toString('base64');

const pcRef       = raw(OUT + '/pc_figure_crop.png');                                                          // PC — figure only
const veilwood    = raw(APP + '/public/assets/GN-Artists/EnderSBond/first_favored_anchor_female_hero_veilwood_v1.jpg');
const wishTwisted = raw(APP + '/public/assets/Fatelands/Wish_Burst_Twisted_v1.png');                           // red vortex + X's
const wishClean   = raw(APP + '/public/assets/Fatelands/Wish_Burst_Clean_v1.png');                             // golden starburst

const PROMPT = [
'A SINGLE 2x2 GRID PAGE — FOUR equal comic panels in two rows, thin clean gutters, one continuous dramatic sequence. Detailed colour graphic-novel art, consistent style and consistent characters across all four panels.',

'THE PC (reference image 1 — take ONLY THE CHARACTER from it, IGNORE its background): a young First Favored woman — luminous violet skin, long dark hair in high pigtails, rose-gold eyes, a sheer gossamer tunic and an ornate silver ceremonial SASH, faint rose Weave-Script swirls on her skin. In panels 2 and 3 her mouth still carries the Sacrificiant SEAL (a small clear glass bead between her parted lips with a fine gossamer band). Keep her EXACTLY consistent everywhere she appears.',
'OTHER CHARACTERS: the YOUTH — a different young First Favored initiate, AQUA skin and pale coral hair (clearly not the PC). JULIAN — a tall First Favored man, only ever seen from BEHIND, face NEVER visible. The CROWD — many-hued First Favored (blue, orange, gold, emerald skin; colourful hair; gossamer).',
'SETTING — EVERY panel is the same VEILWOOD clearing (reference image 2): pale braided MATED-PAIR trees (two trunks woven together), long cascading white WEEPING-WILLOW veil-curtains, deep-crimson braided spiralgrass. Do NOT use the trees from reference image 1 — its trees are wrong.',
'TWO DIFFERENT WISH EFFECTS: reference image 3 is the TWISTED/CORRUPTED wish — a violent RED spiral vortex with jagged red cracks and dark-red X marks radiating out (a wish going WRONG). reference image 4 is the CLEAN wish — a radiant GOLDEN starburst (a wish granted rightly).',

'PANEL 1 (top-left) — THE WISH TWISTING: the kneeling YOUTH in the clearing, mid-wish, as the TWISTED RED wish-burst (reference image 3 — red vortex, jagged cracks, dark-red X marks) erupts and warps around her where a blessing should be. The wish is going wrong. Dread rising in her face.',

'PANEL 2 (top-right) — OVER JULIAN\'S SHOULDER: framed from BEHIND Julian — his shoulder and the back of his head fill the FOREGROUND (his face NOT visible). BEYOND him, across the clearing, the PC (reference image 1) is LUNGING toward the kneeling YOUTH — the PC and the youth are both visible in the middle distance, the PC rushing ACROSS the frame toward the youth with her arm outstretched. Julian is watching THEM. The PC moves toward the youth, NOT toward the camera.',

'PANEL 3 (bottom-left) — THE FACE RUINS (MAXIMUM INTENSITY): an extreme close-up of the YOUTH\'s face in dire distress as her wish "to be more beautiful" corrupts and RUINS her — her features severely warping, contorting, collapsing wrongly, eyes and mouth stretched in horror. Sharp comic SPEED/IMPACT LINE-BURSTS radiate outward from her face. The TWISTED RED wish-burst (reference image 3 — jagged red cracks and dark-red X marks) frames and surrounds her head. Very high dramatic intensity. Fantasy corruption — NO blood or gore.',

'PANEL 4 (bottom-right) — RESTORED: the CLEAN GOLDEN wish-burst (reference image 4) blazing CENTERED DIRECTLY ON THE YOUTH\'S FACE, restoring it to whole and beautiful, exactly as the PC reaches her. The PC\'s mouth-seal is now REMOVED — she holds the small glass bead in her hand, her mouth free — reaching the youth with relief and urgency. Around them, an alarmed CROWD of many-hued First Favored fills the Veilwood clearing.',

'Keep the PC the same woman in every panel. No text, no captions, no speech balloons, no lettering.'
].join('\n\n');

(async () => {
  const r = await fetch(BASE + '/api/image', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({
      prompt: PROMPT, provider: 'gemini', model: 'gemini-3.1-flash-image-preview',
      imageIntent: 'scene', imageSize: '2K', aspect_ratio: '1:1', textFirst: true,
      reference_images_b64: [
        { b64: pcRef,       label: 'PC — the Sacrificiant woman; use ONLY the character, ignore her background; keep IDENTICAL across panels' },
        { b64: veilwood,    label: 'Veilwood setting — braided mated-pair trees, weeping veil, crimson braided spiralgrass (use for ALL panels)' },
        { b64: wishTwisted, label: 'TWISTED wish-burst — red spiral vortex, jagged cracks, dark-red X marks (panels 1 and 3)' },
        { b64: wishClean,   label: 'CLEAN wish-burst — golden radiant starburst (panel 4 only, centered on the youth)' }
      ]
    })
  });
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch (_) { data = null; }
  const url = data && (data.url || data.image);
  console.error('status=' + r.status + ' provider=' + (data && data.provider) + ' hasImage=' + !!url);
  if (!r.ok || !url) { console.error('FAILED: ' + txt.slice(0, 300)); process.exit(2); }
  const b64 = url.indexOf('base64,') >= 0 ? url.split('base64,')[1] : null;
  if (!b64) { console.error('no base64 in url: ' + url.slice(0, 80)); process.exit(3); }
  fs.writeFileSync(OUT + '/gemini_4panel_v2.png', Buffer.from(b64, 'base64'));
  console.error('SAVED gemini_4panel_v2.png (' + Math.round(fs.statSync(OUT + '/gemini_4panel_v2.png').size / 1024) + ' KB)');
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
