// CROWD DIRECTIVE — does forcing heterogeneity fix the cloned-nude-female city? Single 2K image.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/crowd';
const RUN = process.env.RUN === '1';
(async () => {
  console.log('CROWD DIRECTIVE TEST — Kwisheen city thoroughfare @ 2K (~$0.10)');
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof window._crowdDirective === 'function'
    && typeof window._underwaterDirective === 'function' && typeof window._loadStyleRefBase64 === 'function', { timeout: 40000 });
  console.log('Generating…'); const t0 = Date.now();
  const res = await p.evaluate(async () => {
    const strip = x => String(x||'').replace(/^data:image\/[^;]+;base64,/, '');
    const load = async q => { const x = await window._loadStyleRefBase64(q); return x ? strip(x) : null; };
    const trueForm = await load('/assets/Fatelands/Kwisheen_Female_Solo_v2.jpg');
    const maleForm = await load('/assets/Fatelands/Kwisheen_Male_Solo_v2.jpg');
    let style = null; try { const st = window.RENDER_STYLE_SYSTEM.ender_bond;
      const gm = st.structured_anchors.anchors.find(a => a.role === 'golden_master'); if (gm) style = await load(gm.file); } catch(_){}
    const refs = [];
    if (trueForm) refs.push({ b64: trueForm, label: 'KWISHEEN FEMALE true form (body plan + female attire): humanoid torso, shell-scale bodice, coral-dreadlock hair, six-tentacle lower body.' });
    if (maleForm) refs.push({ b64: maleForm, label: 'KWISHEEN MALE true form (body plan + male attire): humanoid torso, BARE chest with scaled shoulder-pauldron, bearded, six-tentacle lower body. Males look like THIS, not like the female.' });
    if (style) refs.push({ b64: style, label: 'STYLE AUTHORITY — Ender Bond rendering ONLY (ink, hatching, palette, lighting). Not anatomy, not any single character.' });
    const swimPath = window._kwisheenSwimRef && window._kwisheenSwimRef();
    const swim = swimPath ? await load(swimPath) : null;
    if (swim) refs.push({ b64: swim, label: 'KWISHEEN SWIMMING MOTION (line-art reference, TWO states): LEFT figure — the six tentacles SPREAD and flexed wide while hovering/maneuvering; RIGHT figure — the same tentacles drawn TOGETHER into a streamlined bundle TRAILING behind as she surges forward. This is how a Kwisheen lower body moves. Swimmers trail a bundle of DISTINCT tentacles; NEVER a fish-tail. Governs motion/silhouette ONLY, not face or wardrobe.' });

    const crowd = window._crowdDirective({ speciesLabel: 'Kwisheen', underwater: true, marineLife: true, gendered: true, bodyPlan: 'a humanoid torso above the waist and a six-tentacle cephalopod lower body replacing legs (no human legs)' });
    const uw = window._underwaterDirective('render');

    const prompt =
      'A SINGLE FINISHED COLOUR ILLUSTRATION — a wide establishing shot of a crowd of KWISHEEN going about ' +
      'daily life in their drowned city: arched coral-and-shell architecture, bioluminescent windows, spires ' +
      'trailing kelp, a broad submerged plaza and thoroughfare.' +
      crowd + uw +
      '\nEnder Bond ink-and-colour rendering. A single image (NOT a grid, NOT panels). No words or lettering anywhere.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview', imageSize: '2K', aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1, reference_images_b64: refs }) });
    if (!r.ok) return { err: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0,180) };
    const d = await r.json(); const u = d.image || d.url;
    return u ? { url: u.startsWith('data:') ? u : 'data:image/png;base64,'+u, refs: refs.length, crowdLen: crowd.length } : { err: 'no image' };
  });
  if (res.err) { console.error('FAILED — ' + res.err); await b.close(); process.exit(1); }
  fs.writeFileSync(path.join(OUT,'crowd.png'), Buffer.from(res.url.split(',')[1],'base64'));
  const im = await p.evaluate(async ({u})=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});return i.width+'x'+i.height;},{u:res.url});
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s · ${im} · refs=${res.refs} · crowd directive=${res.crowdLen} chars`);
  console.log('Saved → ' + OUT);
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
