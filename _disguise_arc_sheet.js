// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DISGUISE-ARC SHEET — a 4-beat narrative that exercises the whole Kwisheen disguise canon at once,
// plus both new directives (emotion→anatomy, underwater atmosphere) in a MIXED-setting sheet.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//   1. TRUE FORM   — a crowd of Kwisheen swimming through their drowned city. Underwater.
//   2. TRANSITION  — one Kwisheen hauling out onto shore, mid-change: tentacles fusing into legs.
//   3. DISGUISED   — the same figure, now passing as human, in conversation with a human at a gala.
//   4. BETRAYAL    — a single tentacle slips from beneath her gown to strike the human from behind.
//
// The underwater directive is applied PER-PANEL (panels 1-2 only) rather than whole-sheet, because
// the story crosses from sea to land — a global "every panel underwater" would be wrong. Both
// directives' text is pulled from the REAL encoded helpers (window._underwaterDirective /
// _emotionDirective), so this tests the shipped wording, not hand-written copy.
//
// References: the true Kwisheen form (governs the crowd + the protagonist's real anatomy) and the
// disguised-human look (governs how she passes on land) — the two poles the transformation moves
// between — plus the Ender Bond style authority.
//
// NOTE: no dedicated "Kwisheen city crowd" reference exists. The crowd and city architecture are
// model-generated from the species anatomy anchor + description, not reference-backed.
//
// PAID — 1 image @ 4K (~$0.15). RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/disguise_arc';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('─'.repeat(74));
  console.log('DISGUISE-ARC SHEET — true form → transition → disguise → betrayal');
  console.log('─'.repeat(74));
  console.log('  directives: emotion→anatomy + underwater (per-panel, sea panels only)');
  console.log('  ESTIMATED : ~$0.15 (1 image @ ' + SIZE + ')');
  console.log('  output    : ' + OUT);
  console.log('─'.repeat(74));
  if (!RUN) { console.log('DRY RUN — no API calls. RUN=1 to spend.\n'); process.exit(0); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => { const t = m.text(); if (/imageConfig|IMAGE\]/i.test(t)) console.error('   >', t.slice(0,165)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._underwaterDirective === 'function'
    && typeof window._emotionDirective === 'function' && typeof window._loadStyleRefBase64 === 'function', { timeout: 40000 });

  console.log('\nGenerating…');
  const t0 = Date.now();
  const res = await page.evaluate(async ({ SIZE }) => {
    const strip = b => String(b || '').replace(/^data:image\/[^;]+;base64,/, '');
    const load = async p => { const b = await window._loadStyleRefBase64(p); return b ? strip(b) : null; };

    // References: true form (real anatomy) + disguised human (land pass) + Ender style.
    const trueForm = await load('/assets/Fatelands/Kwisheen_Female_Solo_v2.jpg');
    const disguised = await load('/assets/GN-Artists/EnderSBond/Octofolk_Disguised_Female_Anchor.png');
    let style = null;
    try { const st = window.RENDER_STYLE_SYSTEM.ender_bond;
      const gm = st.structured_anchors.anchors.find(a => a.role === 'golden_master');
      if (gm) style = await load(gm.file); } catch (_) {}

    const refs = [];
    if (trueForm) refs.push({ b64: trueForm, label: 'KWISHEEN TRUE FORM (the protagonist Neris\'s real anatomy): humanoid torso, coral-dreadlock hair, violet chromatophore skin with pattern-bloom, six-tentacle lower body replacing legs, finger-tentacles. This is what she IS beneath any disguise.' });
    if (disguised) refs.push({ b64: disguised, label: 'KWISHEEN PASSING AS HUMAN (the SAME character Neris with her camouflage UP): ordinary human skin, human legs, real hair, no visible tentacles — a seamless human disguise. Panels 3-4 use THIS look.' });
    if (style) refs.push({ b64: style, label: 'STYLE AUTHORITY — Ender Bond rendering technique ONLY (ink weight, cross-hatching, palette, lighting). NOT anatomy, NOT composition, NOT any character.' });

    // Pull the REAL directive text from the shipped helpers.
    const uw = window._underwaterDirective('render');   // full optical treatment
    const emo = k => window._emotionAnatomy(k);

    const beats = [
      'QUADRANT 1 — a CROWD of Kwisheen (true form: humanoid torsos, coral-dreadlock hair, six-tentacle ' +
        'lower bodies, NO legs) swim together through their drowned city — arched coral-and-shell ' +
        'architecture, bioluminescent windows, spires trailing kelp. Many figures at varied depths and ' +
        'angles, a shoal of people. WIDE establishing shot, deep space.' + uw,
      'QUADRANT 2 — ONE Kwisheen, Neris, hauls herself out of the surf onto a night shore, caught ' +
        'MID-TRANSFORMATION: her upper six tentacles have fused and are re-forming into two human LEGS ' +
        '(the change travelling downward — thighs already human, the lower limbs still half-tentacle, ' +
        'suckers fading into skin), coral hair darkening to ordinary wet hair, violet skin paling to human ' +
        'tone. Water sheets off her. Effortful. MEDIUM, full body at the waterline. ' + emo('determination'),
      'QUADRANT 3 — the SAME character Neris, now fully passing as HUMAN (human legs, human skin, real ' +
        'hair, no tentacles visible — use the disguised-human reference), in an elegant gown at a cand+lit ' +
        'GALA, standing close to a human nobleman in formal dress, the two in intimate conversation, her ' +
        'expression warm and disarming. MEDIUM CLOSE two-shot, dry, indoors. ' + emo('tenderness'),
      'QUADRANT 4 — the betrayal: Neris still faces the human with a pleasant human face, but from beneath ' +
        'the hem of her gown ONE violet sucker-lined TENTACLE has silently emerged and whips up behind the ' +
        'unsuspecting nobleman to strike him from behind. He does not see it. Her human face stays composed ' +
        'even as the tentacle attacks — the disguise has NOT dropped, only this one limb has slipped free. ' +
        'MEDIUM, both full-enough to show the gown-hem tentacle and his back. ' + emo('contempt')
    ];

    const prompt =
      'A SINGLE FINISHED COLOUR ILLUSTRATION divided into a 2 x 2 GRID of exactly FOUR equal rectangular ' +
      'panels of identical size, separated by clean straight gutters — one vertical gutter down the exact ' +
      'centre, one horizontal across the exact centre. Do NOT vary the panel sizes. Four equal quadrants only.\n' +
      'Each quadrant is a SEPARATE moment. Do NOT let any figure cross a gutter, and do NOT blend the ' +
      'quadrants. Reading order — top-left, top-right, bottom-left, bottom-right:\n' +
      beats.join('\n') +
      '\n\nTHIS IS ONE CHARACTER\'S STORY. Neris appears in panels 2, 3 and 4 and must be recognisably the ' +
      'SAME individual THROUGH her transformation — same face structure and features whether tentacled or ' +
      'human-legged, so a reader follows her from sea to gala. In panels 3-4 she passes COMPLETELY as human ' +
      'except, in panel 4 only, the single attacking tentacle.\n' +
      'SETTING crosses from SEA to LAND across the page: panels 1-2 are underwater / at the waterline; ' +
      'panels 3-4 are dry, indoors, at a warm candle-lit gala — no water in panels 3-4.\n' +
      'Ender Bond ink-and-colour rendering throughout. Do NOT write any words, panel numbers, captions, or ' +
      'lettering anywhere in the image.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview',
        imageSize: SIZE, aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1,
        reference_images_b64: refs })
    });
    if (!r.ok) return { err: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0,200) };
    const d = await r.json();
    const u = d.image || d.url;
    if (!u) return { err: 'no image' };
    return { url: u.startsWith('data:') ? u : 'data:image/png;base64,' + u,
             refCount: refs.length, uwLen: uw.length, promptChars: prompt.length };
  }, { SIZE });

  if (res.err) { console.error('FAILED — ' + res.err); await browser.close(); process.exit(1); }
  const buf = Buffer.from(res.url.split(',')[1], 'base64');
  fs.writeFileSync(path.join(OUT, 'disguise_arc.png'), buf);
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s`);
  console.log(`  references : ${res.refCount} (true form + disguise + style)`);
  console.log(`  underwater directive text: ${res.uwLen} chars (panels 1-2)`);
  console.log(`  prompt     : ${res.promptChars} chars`);

  // Grid check (colour: light-line gutter).
  const geo = await page.evaluate(async ({ url }) => {
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
    const W=900,H=Math.round(W*im.height/im.width);
    const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(im,0,0,W,H);
    const d=c.getContext('2d').getImageData(0,0,W,H).data;
    const lum=(x,y)=>{const p=(y*W+x)*4;return 0.299*d[p]+0.587*d[p+1]+0.114*d[p+2];};
    const uni=(isCol,i,len)=>{let e=0;for(let k=0;k<len;k++){const l=isCol?lum(i,k):lum(k,i);if(l>232||l<28)e++;}return e/len;};
    const scan=(isCol,n,len)=>{const o=[];let cur=null;for(let i=0;i<n;i++){if(uni(isCol,i,len)>=0.82){cur?cur.end=i:cur={start:i,end:i};}else if(cur){o.push(cur);cur=null;}}if(cur)o.push(cur);return o.filter(r=>r.start>n*0.10&&r.end<n*0.90);};
    const v=scan(true,W,H).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0]||null;
    const h=scan(false,H,W).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0]||null;
    return {width:im.width,height:im.height,
      vPct:v?+((((v.start+v.end)/2)/W)*100).toFixed(1):null,
      hPct:h?+((((h.start+h.end)/2)/H)*100).toFixed(1):null};
  }, { url: res.url });
  console.log(`\n  image   : ${geo.width}x${geo.height}`);
  console.log(`  gutters : v@${geo.vPct ?? 'none'}%  h@${geo.hPct ?? 'none'}%  ${geo.vPct&&geo.hPct?'GRID OK':'check by eye'}`);

  if (geo.vPct && geo.hPct) {
    const qs = await page.evaluate(async ({ url, vPct, hPct }) => {
      const im=new Image();await new Promise(r=>{im.onload=r;im.src=url;});
      const cut=(sx,sy,sw,sh)=>{const c=document.createElement('canvas');c.width=sw;c.height=sh;c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,sw,sh);return c.toDataURL('image/png');};
      const vx=Math.round(im.width*vPct/100),hy=Math.round(im.height*hPct/100);
      return [cut(0,0,vx,hy),cut(vx,0,im.width-vx,hy),cut(0,hy,vx,im.height-hy),cut(vx,hy,im.width-vx,im.height-hy)];
    }, { url: res.url, vPct: geo.vPct, hPct: geo.hPct });
    ['q1_city','q2_transform','q3_gala','q4_betrayal'].forEach((n,i)=>
      fs.writeFileSync(path.join(OUT,n+'.png'),Buffer.from(qs[i].split(',')[1],'base64')));
    console.log('  quadrants: q1_city, q2_transform, q3_gala, q4_betrayal');
  }
  console.log(`\nSaved → ${OUT}\n`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
