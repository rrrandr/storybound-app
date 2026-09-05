// COMBAT SHOWCASE — a Veilweave First Favored across 4 opponents, one 2x2 sheet. Composes the prompt
// from the WIRED directives (_firstFavoredCombatDirective / _veilweaveDirective / _kwisheenCombatDirective)
// so it tests the shipped canon text, not hand-written copy. PAID — 1 image @ 4K (~$0.15). RUN=1.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/combat_showcase';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('COMBAT SHOWCASE — Veilweave First Favored vs Kwisheen / humans / FF-Veilweave / tiger @ ' + SIZE);
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('console', m => { const t = m.text(); if (/imageConfig|IMAGE\]/i.test(t)) console.error('   > ' + t.slice(0,150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof window._firstFavoredCombatDirective === 'function' && typeof window._veilweaveDirective === 'function' && typeof window._loadStyleRefBase64 === 'function', { timeout: 40000 });

  console.log('Rendering…'); const t0 = Date.now();
  const res = await p.evaluate(async ({ SIZE }) => {
    const strip = x => String(x||'').replace(/^data:image\/[^;]+;base64,/, '');
    const load = async q => { const x = await window._loadStyleRefBase64(q); return x ? strip(x) : null; };
    const ffHero = await load('/assets/Fatelands/FirstFavored_Male_Solo_v2.jpg');
    const veil   = await load(window._veilweaveRef());
    const kwOpp  = await load('/assets/Fatelands/Kwisheen_Male_Solo_v2.jpg');
    let style=null; try { const st=window.RENDER_STYLE_SYSTEM.ender_bond; const gm=st.structured_anchors.anchors.find(a=>a.role==='golden_master'); if(gm) style=await load(gm.file); }catch(_){}
    const refs=[];
    if (ffHero) refs.push({ b64: ffHero, label: 'HERO — Kael, a MALE FIRST FAVORED: luminous skin with Weave-Script glow, diamond pupils, silver hair, athletic build. Same individual in every panel.' });
    if (veil)   refs.push({ b64: veil,   label: 'VEILWEAVE EFFECT reference — transparent hooded leaf-vein garment + heavily overlapping misregistered projections of the SAME body. Copy the EFFECT + transparency ONLY, never this figure\'s exact face/pose.' });
    if (kwOpp)  refs.push({ b64: kwOpp,  label: 'KWISHEEN opponent anatomy (panel 1): humanoid torso, six-tentacle lower body, coral hair, bare chest + pauldron.' });
    if (style)  refs.push({ b64: style,  label: 'STYLE AUTHORITY — Ender Bond rendering ONLY.' });

    // Compose from the WIRED directives.
    const ffCombat = window._firstFavoredCombatDirective();
    const ffVeil   = window._veilweaveDirective('first_favored');   // 6-9 outward, superhuman
    const kwCombat = window._kwisheenCombatDirective();

    const beats = [
      'QUADRANT 1 — Kael (Veilweave First Favored) fights a KWISHEEN warrior in a drowned ruin. The Kwisheen ' +
        'grapples the Many-Tide way — tentacles coiling for his weapon-arm, an attack-buckler (armoured limb ' +
        'through its centre hole), a hidden dagger low — while Kael, wreathed in his overlapping Veilweave ' +
        'projections, twists explosively clear. WIDE.' + kwCombat,
      'QUADRANT 2 — Kael cuts through MULTIPLE HUMAN soldiers (four of them, ordinary humans in leather-and-' +
        'mail) at once: mid-air, the Answer polearm sweeping, his six-to-nine Veilweave projections making him ' +
        'impossible to pin as the humans stab at afterimages. WIDE, dynamic.',
      'QUADRANT 3 — Kael duels ANOTHER Veilweave-wearing FEMALE First Favored, Sera. TWO overlapping ' +
        'projection-storms clash, both figures superhuman and near-untargetable, their Answers locked, ' +
        'afterimages of both bodies bleeding through each other. MEDIUM two-shot.',
      'QUADRANT 4 — Kael vs a charging TIGER. He vaults over it in an explosive aerial reversal, Veilweave ' +
        'projections trailing his arc, the Avowal Blade coming down as the great cat twists beneath him. WIDE, ' +
        'low angle.'
    ];

    const prompt =
      'A SINGLE FINISHED COLOUR ILLUSTRATION in a 2x2 GRID of four equal panels, clean straight gutters, one ' +
      'vertical + one horizontal at the exact centre. Four equal quadrants; no figure crosses a gutter. ' +
      'Reading order TL, TR, BL, BR:\n' + beats.join('\n') +
      '\n\n══ APPLIES TO EVERY PANEL ══' + ffCombat + ffVeil +
      '\nKael is the SAME individual in all four panels (identical face, silver hair, luminous markings, the ' +
      'same transparent Veilweave). Dark, cinematic settings so the refraction reads. Ender Bond ink-and-colour. ' +
      'No panel numbers, captions, or lettering anywhere.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, provider:'gemini', model:'gemini-3.1-flash-image-preview', imageSize:SIZE, aspect_ratio:'1:1', imageIntent:'scene', textFirst:true, n:1, reference_images_b64: refs }) });
    if (!r.ok) return { err:'HTTP '+r.status+' '+(await r.text()).slice(0,160) };
    const d = await r.json(); const u = d.image||d.url;
    return u ? { url: u.startsWith('data:')?u:'data:image/png;base64,'+u, refs: refs.length, promptLen: prompt.length } : { err:'no image' };
  }, { SIZE });

  if (res.err) { console.error('FAILED — '+res.err); await b.close(); process.exit(1); }
  fs.writeFileSync(path.join(OUT,'showcase.png'), Buffer.from(res.url.split(',')[1],'base64'));
  const im = await p.evaluate(async ({u})=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});return i.width+'x'+i.height;},{u:res.url});
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s · ${im} · refs=${res.refs} · prompt=${res.promptLen} chars`);
  console.log('Saved → ' + OUT);
  await b.close();
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
