// STAGE B ON A SHEET — does the Ender Bond render pass preserve a 2x2 grid and its figures?
//
// Structure-lock through colorize was validated n=3 on SINGLE panels ("≈0 new structural errors").
// It has never been run on anything sheet-shaped. Two things could break that single-panel result:
//   1. LAYOUT — a style-transfer model given four panels may merge them into one picture.
//   2. RESOLUTION — the default reference loader caps at 1280px, which would deliver each quadrant
//      to the renderer at ~640px. opts.fullRes + opts.imageSize exist for this.
//
// Judge by eye: grid intact? figures unchanged? Ender Bond cross-hatching actually applied?
// PAID — 1 image. RUN=1.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const SRC = process.env.SRC || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/canon_sheet_v2/canon_sheet.png';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/stage_b';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('─'.repeat(70));
  console.log('STAGE B ON A SHEET — colorize a 2x2, structure + layout locked');
  console.log('─'.repeat(70));
  console.log('  source   : ' + path.basename(SRC));
  console.log('  output   : ' + SIZE + ' → ' + OUT);
  console.log('  ESTIMATED: ~$' + (SIZE === '4K' ? '0.15' : '0.10'));
  console.log('─'.repeat(70));
  if (!RUN) { console.log('DRY RUN — no API calls. RUN=1 to spend.\n'); process.exit(0); }
  if (!fs.existsSync(SRC)) { console.error('source sheet not found: ' + SRC); process.exit(1); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => { const t = m.text(); if (/REVEAL|imageConfig|IMAGE\]/i.test(t)) console.error('   >', t.slice(0,165)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._styleTransferRevealPanel === 'function', { timeout: 40000 });

  const srcUrl = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');
  console.log('\nRendering…');
  const t0 = Date.now();
  const url = await page.evaluate(async ({ srcUrl, SIZE }) => {
    return await window._styleTransferRevealPanel(srcUrl, 'ender_bond',
      'Vael, a male Kwisheen: humanoid torso, bare chest with scaled shoulder pauldron, bearded, tentacle lower body. ' +
      'Kesh, a female First Favored: luminous skin with Weave-Script glow, sheer gossamer drape, pointed ears.',
      { fullRes: true, imageSize: SIZE, preserveGrid: true });
  }, { srcUrl, SIZE });

  if (!url) { console.error('FAILED — no image returned.'); await browser.close(); process.exit(1); }
  const buf = Buffer.from(url.split(',')[1], 'base64');
  fs.writeFileSync(path.join(OUT, 'stage_b_sheet.png'), buf);
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s`);

  const geo = await page.evaluate(async ({ url }) => {
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
    const W = 900, H = Math.round(W*im.height/im.width);
    const c = document.createElement('canvas'); c.width=W; c.height=H;
    c.getContext('2d').drawImage(im,0,0,W,H);
    const d = c.getContext('2d').getImageData(0,0,W,H).data;
    const dk = (isCol,i,f,t)=>{let n=0,tt=0;for(let k=f;k<t;k++){const x=isCol?i:k,y=isCol?k:i,p=(y*W+x)*4;
      if(0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]<170)n++;tt++;}return tt?n/tt:0;};
    const rl=(isCol,len,f,t)=>{const o=[];let cur=null;for(let i=0;i<len;i++){if(dk(isCol,i,f,t)>=0.60){cur?cur.end=i:cur={start:i,end:i};}
      else if(cur){o.push(cur);cur=null;}}if(cur)o.push(cur);return o;};
    const pk=(rs,sp)=>rs.filter(r=>r.start>sp*0.10&&r.end<sp*0.90).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0]||null;
    const v=pk(rl(true,W,0,H),W), h=pk(rl(false,H,0,W),H);
    return { width:im.width, height:im.height,
      vPct: v?+((((v.start+v.end)/2)/W)*100).toFixed(1):null,
      hPct: h?+((((h.start+h.end)/2)/H)*100).toFixed(1):null };
  }, { url });
  console.log(`\n  image   : ${geo.width}x${geo.height}`);
  console.log(`  gutters : v@${geo.vPct ?? 'NONE'}%  h@${geo.hPct ?? 'NONE'}%   ${geo.vPct&&geo.hPct?'GRID PRESERVED':'GRID LOST'}`);
  console.log(`\nSaved → ${OUT}\n`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
