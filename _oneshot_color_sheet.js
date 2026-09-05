// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ONE-SHOT COLOUR SHEET — can four FINISHED panels come out of a single generation?
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Everything this session has generated was either line art (Stage A) or a second colour pass
// (Stage B). This collapses them. The staged split assumed "cheap sketch, expensive render", but
// Gemini prices by RESOLUTION TIER, not content — a 4K line-art sheet and a 4K finished sheet both
// cost $0.151. So staging doubles the floor cost, and the sketch stage additionally throws away every
// non-geometric instruction at the handoff (Stage B turned underwater coral ruins into a sunlit sky,
// because line art cannot encode ambient light or water column).
//
// Deliberately identical to canon_sheet v2 — same cast, same four emotional beats — so the two are
// directly comparable. Differences: finished Ender Bond rendering instead of line art, the setting
// carried all the way into the generation, and a THIRD reference (the style golden master) which must
// be scoped to STYLE ONLY so it does not fight the two anatomy references.
//
// PASS LOOKS LIKE: four panels, clean grid, canon anatomy per species, ONE consistent Kesh and ONE
// consistent Vael across quadrants, underwater setting intact, Ender Bond rendering, legible emotion.
// The identity drift that broke Stage B (blonde→brunette, black→orange) is the thing to watch.
//
// PAID — 1 image @ 4K (~$0.15). RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/oneshot_colour';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

const CAST = [
  { name: 'Vael', species: 'Kwisheen',      gender: 'male',   position: 'left' },
  { name: 'Kesh', species: 'First Favored', gender: 'female', position: 'right' }
];

const BEATS = [
  'Kesh rounds on Vael in fury — jaw set, brows driven down, teeth bared, one hand thrown out in ' +
    'accusation. MEDIUM CLOSE, head and shoulders and the accusing hand.',
  'Vael recoils in terror from something off-frame — eyes stretched wide with the whites showing all ' +
    'round, mouth open, shoulders hunched, one arm flung up to shield his head. MEDIUM, upper body and ' +
    'the top of the tentacle mantle.',
  // WORRY via SPECIFIC PHYSICAL CUES, not the word. Naming "concern" gave a bearded male a glare four ' +
  // runs running; the fix is anatomical direction. The distress signal that reads on any face is the ' +
  // INNER brow raised (the inner ends of the eyebrows pulled UP and together, forehead pinched above the ' +
  // nose) — the opposite of anger, where the WHOLE brow drops. Roman: it is fine if it still reads ' +
  // slightly harder on the male, as long as the inner-brow cue is present.
  'The two close together, both worried: Kesh stares off-frame, the INNER ends of her eyebrows raised UP ' +
    'and drawn together so the skin above her nose pinches into vertical creases, her upper eyelids lifted, ' +
    'her lower lip pulled inward between her teeth. Vael watches HER face with the same expression — the ' +
    'INNER corners of his brows lifted and knitted (NOT the flat downward scowl of anger), his forehead ' +
    'furrowed above the nose, his lips pressed thin and slightly turned down, his eyes soft and fixed on her. ' +
    'MEDIUM CLOSE two-shot. This is fearful concern FOR someone, not anger AT someone — the raised inner ' +
    'brow is the key cue and must be present on both faces.',
  'Both laughing, genuinely and without guard: Kesh head tipped back, eyes crinkled shut, mouth wide open ' +
    'mid-laugh; Vael grinning broadly, eyes creased to slits. MEDIUM CLOSE two-shot.'
];

(async () => {
  console.log('─'.repeat(72));
  console.log('ONE-SHOT COLOUR SHEET — four finished panels, one generation');
  console.log('─'.repeat(72));
  console.log('  cast     : ' + CAST.map(c => c.name + ' (' + c.species + ')').join(' · '));
  console.log('  style    : Ender Bond golden master as STYLE-ONLY reference');
  console.log('  ESTIMATED: ~$0.15 (1 image @ ' + SIZE + ')  →  ~$0.038/panel if it works');
  console.log('  output   : ' + OUT);
  console.log('─'.repeat(72));
  if (!RUN) { console.log('DRY RUN — no API calls. RUN=1 to spend.\n'); process.exit(0); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => { const t = m.text(); if (/STAGE-A-REFS|imageConfig|IMAGE\]/i.test(t)) console.error('   >', t.slice(0,170)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._stageACanonRefs === 'function'
    && typeof window._verifyReferenceAssets === 'function', { timeout: 40000 });

  const assets = await page.evaluate(async () => await window._verifyReferenceAssets(['kwisheen','first_favored']));
  console.log(`\nASSET INTEGRITY: ${assets.ok ? 'OK' : 'FAILED'} (${assets.checked} checked, ${assets.missing.length} missing)`);
  if (!assets.ok) { console.error('ABORTED.'); await browser.close(); process.exit(1); }

  console.log('\nGenerating…');
  const t0 = Date.now();
  const res = await page.evaluate(async ({ CAST, BEATS, SIZE }) => {
    const s = window.state;
    s._playerSpecies = 'First Favored'; s._liSpecies = 'Kwisheen';
    window._stageARefs = true;

    // 1) SPECIES anatomy references (same path Stage A uses).
    // SOLO, GENDER-MATCHED anchors for this run. The duo anchors gave the model FOUR reference bodies
    // for TWO characters — ambiguity about which body belongs to whom, and the likeliest source of
    // Kesh acquiring a Kwisheen tentacle arm. One figure per reference, matched to that character's sex.
    const SOLO = [
      { path: '/assets/Fatelands/Kwisheen_Male_Solo_v2.jpg', governs: 'kwisheen',
        label: 'Kwisheen — SPECIES ANATOMY (male): humanoid torso, bare chest with scaled shoulder pauldron, bearded, six-tentacle lower body replacing legs, finger-tentacles' },
      { path: '/assets/Fatelands/FirstFavored_Female_Solo_v2.jpg', governs: 'first_favored',
        label: 'First Favored — SPECIES ANATOMY (female): fully humanoid with two ordinary legs, luminous skin with Weave-Script glow, sheer gossamer drape, pointed ears' }
    ];
    const speciesRefs = [];
    for (const r of SOLO) {
      const b = await window._loadStyleRefBase64(r.path);
      if (b) speciesRefs.push({ b64: String(b).replace(/^data:image\/[^;]+;base64,/, ''), src: r.path, governs: r.governs, label: r.label });
    }

    // 2) STYLE reference — the Ender Bond golden master, resolved the way colorize resolves it.
    let styleRef = null, stylePath = null;
    try {
      const st = window.RENDER_STYLE_SYSTEM && window.RENDER_STYLE_SYSTEM['ender_bond'];
      const gm = st && st.structured_anchors && st.structured_anchors.anchors &&
        st.structured_anchors.anchors.find(a => a.role === 'golden_master');
      if (gm) { stylePath = gm.file; const b = await window._loadStyleRefBase64(gm.file);
        if (b) styleRef = String(b).replace(/^data:image\/[^;]+;base64,/, ''); }
    } catch (_) {}

    const refs = speciesRefs.map(r => ({ b64: r.b64, label: r.label }));
    if (styleRef) refs.push({ b64: styleRef, label: 'STYLE AUTHORITY — rendering technique ONLY (line quality, ink weight, cross-hatching, palette, lighting). NOT anatomy, NOT composition, NOT any character.' });

    // 3) The prompt. Grid wording is the one proven at 10/10; setting carried all the way in.
    const speciesLines = speciesRefs.map((r, i) =>
      'Reference (' + (i + 1) + ') — ' + String(r.label).split(' — ')[0] + ' — is the anatomy of ' +
      (CAST.find(c => String(c.species).toLowerCase().replace(/[\s-]+/g,'_') === r.governs) || {}).name + ' ONLY.').join(' ');

    const prompt =
      'A SINGLE FINISHED COLOUR ILLUSTRATION divided into a 2 x 2 GRID of exactly FOUR equal rectangular ' +
      'panels of identical size, separated by clean straight gutters — one vertical gutter down the exact ' +
      'centre and one horizontal gutter across the exact centre. Do NOT vary the panel sizes. Do NOT make a ' +
      'decorative comic page layout. Four equal quadrants only.\n' +
      'Each quadrant is a SEPARATE moment. Do NOT let any figure cross a gutter, and do NOT blend the ' +
      'quadrants into one continuous picture. Reading order — top-left, top-right, bottom-left, bottom-right:\n' +
      BEATS.map((b, i) => 'QUADRANT ' + (i + 1) + ': ' + b).join('\n') +
      '\n\nSETTING (every quadrant): UNDERWATER in the drowned coral ruins of Gloamwater Bay. The characters ' +
      'are submerged — silt-lit green-blue water, light falling in shafts from far above, hair and cloth ' +
      'drifting and weightless, suspended particles in the water column, no sky, no horizon, no dry ground.\n' +
      'CHARACTER CONSISTENCY (CRITICAL): there is ONE Kesh and ONE Vael across all four panels. Identical hair ' +
      'colour, identical skin colour and markings, identical eyes, identical garments in every quadrant. A ' +
      'character whose colouring changes between panels is a FAILURE.\n' +
      'REFERENCE ASSIGNMENT: ' + speciesLines + ' These species are DIFFERENT and must not exchange traits. ' +
      'The STYLE AUTHORITY reference governs rendering technique ONLY — take ink weight, cross-hatching, ' +
      'palette and lighting from it, and take NOTHING else: not its characters, not its anatomy, not its ' +
      'composition.\n' +
      'EMOTION IS THE POINT OF THIS PAGE — faces must carry real, legible feeling. A blank face is a FAILURE. ' +
      'Do NOT write the name of any emotion, or any other word, anywhere in the image. No panel numbers, no ' +
      'captions, no lettering, no signature, no watermark.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview',
        imageSize: SIZE, aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1,
        reference_images_b64: refs })
    });
    if (!r.ok) return { err: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200) };
    const d = await r.json();
    const u = d.image || d.url;
    if (!u) return { err: 'no image in response' };
    return { url: u.startsWith('data:') ? u : 'data:image/png;base64,' + u,
             refCount: refs.length, stylePath, promptChars: prompt.length };
  }, { CAST, BEATS, SIZE });

  if (res.err) { console.error('FAILED — ' + res.err); await browser.close(); process.exit(1); }
  const buf = Buffer.from(res.url.split(',')[1], 'base64');
  fs.writeFileSync(path.join(OUT, 'oneshot_colour.png'), buf);
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s`);
  console.log(`  references : ${res.refCount} (2 species + style)`);
  console.log(`  style ref  : ${res.stylePath || 'NONE — style will be uncontrolled'}`);
  console.log(`  prompt     : ${res.promptChars} chars`);

  // Gutter check that works on COLOUR: a gutter in a rendered sheet is a LIGHT line between colour
  // blocks, not a dark rule. Detecting only dark rules is what mis-scored the Stage B output.
  const geo = await page.evaluate(async ({ url }) => {
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
    const W = 900, H = Math.round(W*im.height/im.width);
    const c = document.createElement('canvas'); c.width=W; c.height=H;
    c.getContext('2d').drawImage(im,0,0,W,H);
    const d = c.getContext('2d').getImageData(0,0,W,H).data;
    const lum = (x,y) => { const p=(y*W+x)*4; return 0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]; };
    // A gutter line is EXTREME (very light or very dark) and uniform down its whole span.
    const uniform = (isCol, i, len) => { let ex=0; for (let k=0;k<len;k++){ const l = isCol?lum(i,k):lum(k,i);
        if (l>232 || l<28) ex++; } return ex/len; };
    const scan = (isCol, n, len) => { const o=[]; let cur=null;
      for (let i=0;i<n;i++){ if (uniform(isCol,i,len)>=0.85){ cur?cur.end=i:cur={start:i,end:i}; } else if (cur){o.push(cur);cur=null;} }
      if(cur)o.push(cur); return o.filter(r=>r.start>n*0.10&&r.end<n*0.90); };
    const v = scan(true,W,H).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0]||null;
    const h = scan(false,H,W).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0]||null;
    return { width:im.width, height:im.height,
      vPct: v?+((((v.start+v.end)/2)/W)*100).toFixed(1):null,
      hPct: h?+((((h.start+h.end)/2)/H)*100).toFixed(1):null };
  }, { url: res.url });
  console.log(`\n  image   : ${geo.width}x${geo.height}`);
  console.log(`  gutters : v@${geo.vPct ?? 'none'}%  h@${geo.hPct ?? 'none'}%  ${geo.vPct&&geo.hPct ? 'GRID OK' : 'grid not detected — CHECK BY EYE'}`);

  if (geo.vPct && geo.hPct) {
    const qs = await page.evaluate(async ({ url, vPct, hPct }) => {
      const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
      const cut=(sx,sy,sw,sh)=>{const c=document.createElement('canvas');c.width=sw;c.height=sh;
        c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,sw,sh);return c.toDataURL('image/png');};
      const vx=Math.round(im.width*vPct/100), hy=Math.round(im.height*hPct/100);
      return [cut(0,0,vx,hy),cut(vx,0,im.width-vx,hy),cut(0,hy,vx,im.height-hy),cut(vx,hy,im.width-vx,im.height-hy)];
    }, { url: res.url, vPct: geo.vPct, hPct: geo.hPct });
    ['q1_anger','q2_fear','q3_worry','q4_joy'].forEach((n,i) =>
      fs.writeFileSync(path.join(OUT, n+'.png'), Buffer.from(qs[i].split(',')[1],'base64')));
    console.log('  quadrants: split into q1_anger, q2_fear, q3_worry, q4_joy');
  }
  console.log(`\nSaved → ${OUT}\n`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
