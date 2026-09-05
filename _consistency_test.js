// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TWO-SHEET CONSISTENCY — does a SECOND, independently generated sheet carry the character and place
// the FIRST established? The real comic-engine test.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SCENE 1: species anchor + style. Establishes Neris (a specific face) and a distinctive landmark
//          (a broken coral arch crowned by a spiral shell). One quadrant is a face close-up, one is a
//          wide establishing — the two HARVEST sources.
// HARVEST:  crop Neris's face from S1's close quadrant → identity reference.
//           crop the landmark from S1's establishing quadrant → location reference.
// SCENE 2: NO fresh species anchor. Feeds the two harvested crops + the same style master. If the loop
//          works, scene 2 is the SAME woman at the SAME arch, in new action. This is the casting-library
//          / face-master pattern (_deriveFromFrame → _canonicalReferenceFor) extended to sheets.
//
// JUDGE by eye: same face across two independent generations? same landmark + palette? Prior: character
// holds (identity card is a strong signal), environment drifts more (a "place" is diffuse).
//
// PAID — 2 images @ 4K (~$0.30). RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/consistency';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

const NERIS = 'Neris, a female Kwisheen: humanoid torso, VIOLET chromatophore skin with pale pattern-bloom, ' +
  'silver-white CORAL-dreadlock hair, a fitted teal shell-scale bodice, pink-glowing eyes with horizontal ' +
  'capsule pupils, a six-tentacle lower body.';
const ARCH = 'a distinctive landmark: a great BROKEN CORAL ARCHWAY crowned by one huge spiral nautilus ' +
  'shell, its cracks veined with violet bioluminescence, two carved eel-heads flanking the keystone.';

// helper: build a one-shot sheet prompt
function sheetPrompt(beats, extra) {
  return 'A SINGLE FINISHED COLOUR ILLUSTRATION divided into a 2 x 2 GRID of exactly FOUR equal ' +
    'rectangular panels of identical size, separated by clean straight gutters — one vertical down the ' +
    'exact centre, one horizontal across the exact centre. Four equal quadrants only. Each quadrant a ' +
    'SEPARATE moment; do NOT let figures cross a gutter; reading order top-left, top-right, bottom-left, ' +
    'bottom-right:\n' + beats.map((b,i)=>'QUADRANT '+(i+1)+': '+b).join('\n') +
    '\n\n' + (extra||'') +
    '\nUNDERWATER: deep blue-green water, god-ray shafts from far above, drifting particulate, rising ' +
    'bubbles, weightless drift. Ender Bond ink-and-colour rendering. No words, numbers, captions or lettering.';
}

(async () => {
  console.log('─'.repeat(72));
  console.log('TWO-SHEET CONSISTENCY TEST — does scene 2 carry scene 1\'s character + place?');
  console.log('  ESTIMATED : ~$0.30 (2 images @ ' + SIZE + ')');
  console.log('  output    : ' + OUT);
  console.log('─'.repeat(72));
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.\n'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._stageACanonRefs === 'function'
    && typeof window._loadStyleRefBase64 === 'function', { timeout: 40000 });

  const strip = s => String(s||'').replace(/^data:image\/[^;]+;base64,/, '');
  async function genSheet(prompt, refs) {
    return await page.evaluate(async ({ prompt, refs, SIZE }) => {
      const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview', imageSize: SIZE, aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1, reference_images_b64: refs }) });
      if (!r.ok) return { err: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0,180) };
      const d = await r.json(); const u = d.image || d.url;
      return u ? { url: u.startsWith('data:') ? u : 'data:image/png;base64,'+u } : { err: 'no image' };
    }, { prompt, refs, SIZE });
  }
  // crop a normalized box [x0,y0,x1,y1] from a data URL → raw b64
  async function cropB64(url, box) {
    return await page.evaluate(async ({ url, box }) => {
      const im = new Image(); await new Promise(r=>{im.onload=r;im.src=url;});
      const [x0,y0,x1,y1] = box;
      const sx=Math.round(im.width*x0), sy=Math.round(im.height*y0), sw=Math.round(im.width*(x1-x0)), sh=Math.round(im.height*(y1-y0));
      const c=document.createElement('canvas'); c.width=sw; c.height=sh; c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,sw,sh);
      return c.toDataURL('image/png').split(',')[1];
    }, { url, box });
  }
  const save = (name, url) => fs.writeFileSync(path.join(OUT,name), Buffer.from(url.split(',')[1],'base64'));

  // ── style + species anchor ────────────────────────────────────────────────────────────────────
  const setup = await page.evaluate(async () => {
    const strip = s => String(s||'').replace(/^data:image\/[^;]+;base64,/, '');
    const load = async p => { const b = await window._loadStyleRefBase64(p); return b ? strip(b) : null; };
    const species = await load('/assets/Fatelands/Kwisheen_Female_Solo_v2.jpg');
    const swim = await load('/assets/Fatelands/Octofolk_Swim_Motion_Ref_v1.png');
    let style=null; try { const st=window.RENDER_STYLE_SYSTEM.ender_bond; const gm=st.structured_anchors.anchors.find(a=>a.role==='golden_master'); if(gm) style=await load(gm.file);}catch(_){}
    return { species, swim, style };
  });

  // ── SCENE 1 ─────────────────────────────────────────────────────────────────────────────────
  console.log('\nSCENE 1 — establishing Neris + the Coral Gate…');
  const s1refs = [];
  if (setup.species) s1refs.push({ b64: setup.species, label: 'KWISHEEN FEMALE anatomy (body plan + female attire): humanoid torso, shell-scale bodice, coral hair, six-tentacle lower body.' });
  if (setup.swim) s1refs.push({ b64: setup.swim, label: 'KWISHEEN SWIM MOTION (line art): tentacles SPREAD when hovering, TRAILING in a bundle when surging. Never a fish-tail.' });
  if (setup.style) s1refs.push({ b64: setup.style, label: 'STYLE AUTHORITY — Ender Bond rendering ONLY (ink, hatching, palette, lighting). Not anatomy.' });
  const s1beats = [
    'WIDE ESTABLISHING — ' + NERIS + ' swims up toward ' + ARCH + ' Full scene, the whole landmark visible, she is small before it.',
    'MEDIUM CLOSE on Neris\'s FACE, lit from above, gazing up at the arch — determined. Her face fills the panel; violet skin, silver coral hair, pink capsule-pupil eyes clearly visible.',
    'Neris reaches out and lays one hand on the arch, tentacles curling beneath her. MEDIUM, full body.',
    'the spiral shell atop the arch BEGINS TO GLOW violet in response, light spilling down. WIDE, the arch and Neris below it.'
  ];
  const s1 = await genSheet(sheetPrompt(s1beats, 'Neris is the SAME individual in every panel — identical face, hair, skin, bodice.'), s1refs);
  if (s1.err) { console.error('SCENE 1 FAILED — ' + s1.err); await browser.close(); process.exit(1); }
  save('scene1.png', s1.url);
  console.log('  scene 1 saved.');

  // ── HARVEST ───────────────────────────────────────────────────────────────────────────────────
  // Q2 (top-right) = face close-up → identity. Q1 (top-left) = establishing → location.
  console.log('HARVEST — cropping Neris\'s face (Q2) and the Coral Gate (Q1) from scene 1…');
  const faceB64 = await cropB64(s1.url, [0.52, 0.03, 0.97, 0.47]);   // top-right, tight on the face panel
  const placeB64 = await cropB64(s1.url, [0.03, 0.03, 0.47, 0.47]);  // top-left, the establishing panel
  fs.writeFileSync(path.join(OUT,'harvest_face.png'), Buffer.from(faceB64,'base64'));
  fs.writeFileSync(path.join(OUT,'harvest_place.png'), Buffer.from(placeB64,'base64'));

  // ── SCENE 2 — harvested refs, NO fresh species anchor ──────────────────────────────────────────
  console.log('SCENE 2 — new action, fed ONLY the harvested Neris + Coral Gate + style…');
  const s2refs = [
    { b64: faceB64, label: 'THIS EXACT CHARACTER is Neris — reproduce her face, skin colour, coral hair, eyes and bodice EXACTLY as in this reference in every panel she appears. She is a female Kwisheen with a six-tentacle lower body.' },
    { b64: placeB64, label: 'THIS EXACT LOCATION is the Coral Gate — reproduce the same broken coral archway, the same spiral shell on top, the same violet-veined cracks and flanking eel-heads. Same landmark, same palette.' }
  ];
  if (setup.style) s2refs.push({ b64: setup.style, label: 'STYLE AUTHORITY — Ender Bond rendering ONLY.' });
  const s2beats = [
    'WIDE — Neris returns and swims back THROUGH the Coral Gate (same arch, same spiral shell), now with the shell dimmed and dark. Full landmark visible.',
    'MEDIUM CLOSE on Neris\'s FACE — now WORRIED (inner brows raised and drawn together, forehead pinched, lips pressed thin). Same face as the reference.',
    'Neris turns to look back over her shoulder at something off-frame, one hand raised. MEDIUM, full body.',
    'a dark shape surges out of the archway\'s shadow behind her. WIDE, the arch and Neris.'
  ];
  const s2 = await genSheet(sheetPrompt(s2beats, 'Neris must be the SAME individual as the reference — identical face, hair, skin, bodice. The Coral Gate must be the SAME landmark as the reference.'), s2refs);
  if (s2.err) { console.error('SCENE 2 FAILED — ' + s2.err); await browser.close(); process.exit(1); }
  save('scene2.png', s2.url);
  console.log('  scene 2 saved.');

  console.log('\n' + '═'.repeat(72));
  console.log('DONE. Compare by eye:');
  console.log('  scene1.png vs scene2.png — is it the same Neris? the same Coral Gate?');
  console.log('  harvest_face.png / harvest_place.png — what scene 2 was actually given.');
  console.log('Saved → ' + OUT);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
