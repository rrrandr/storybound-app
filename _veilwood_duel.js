// VEILWOOD DUEL — a Veilweave First Favored fights TWO Kwisheen in the Veilwood, one 2x2 sheet whose
// four panels are a CONTINUOUS fight sequence (each panel continues the action from the one before).
// Composes from the WIRED directives so it tests the shipped canon (incl. the 2026-07-20 round-2 fixes:
// Veilweave depth/pose/height variation + all-panels reminder + Kwisheen 8-limb anatomy budget).
// PAID — 1 image @ 4K (~$0.15). RUN=1 to spend.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/veilwood_duel';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('VEILWOOD DUEL — Veilweave First Favored vs TWO Kwisheen, continuous 4-beat fight @ ' + SIZE);
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('console', m => { const t = m.text(); if (/imageConfig|IMAGE\]/i.test(t)) console.error('   > ' + t.slice(0,150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof window._firstFavoredCombatDirective === 'function' && typeof window._veilweaveDirective === 'function' && typeof window._kwisheenCombatDirective === 'function' && typeof window._loadStyleRefBase64 === 'function', { timeout: 40000 });

  console.log('Rendering…'); const t0 = Date.now();
  const res = await p.evaluate(async ({ SIZE }) => {
    const strip = x => String(x||'').replace(/^data:image\/[^;]+;base64,/, '');
    const load = async q => { const x = await window._loadStyleRefBase64(q); return x ? strip(x) : null; };
    const ffHero  = await load('/assets/Fatelands/FirstFavored_Male_Solo_v2.jpg');
    const veil    = await load(window._veilweaveRef());
    const kwMale  = await load('/assets/Fatelands/Kwisheen_Male_Solo_v2.jpg');
    const kwFemale= await load('/assets/Fatelands/Kwisheen_Female_Solo_v2.jpg');
    let style=null; try { const st=window.RENDER_STYLE_SYSTEM.ender_bond; const gm=st.structured_anchors.anchors.find(a=>a.role==='golden_master'); if(gm) style=await load(gm.file); }catch(_){}
    const refs=[];
    if (ffHero) refs.push({ b64: ffHero, label: 'HERO — Kael, a MALE FIRST FAVORED (the ONLY First Favored here): luminous skin with Weave-Script glow, diamond pupils, silver hair, athletic HUMANOID build with TWO arms and TWO legs, NO tentacles. Same individual in every panel.' });
    if (veil)   refs.push({ b64: veil,   label: 'VEILWEAVE FABRIC + EFFECT SWATCH (style only, NOT a character) — how the transparent hooded leaf-vein garment looks and how the overlapping misregistered projections of ONE body read. Copy the EFFECT + transparency ONLY; the wearer keeps his OWN face/build/weapon/pose from the HERO ref; do not copy this swatch\'s figure or reproduce it as its own panel.' });
    if (kwMale)   refs.push({ b64: kwMale,   label: 'KWISHEEN OPPONENT A (male) — for the TWO Kwisheen opponents ONLY, never the First Favored hero: humanoid torso, SIX lower tentacles (no legs), TWO tentacle-arms, coral cranial feelers, chromatophore skin.' });
    if (kwFemale) refs.push({ b64: kwFemale, label: 'KWISHEEN OPPONENT B (female) — the second Kwisheen opponent, visually distinct from opponent A: humanoid torso, SIX lower tentacles, TWO tentacle-arms, coral cranial feelers, chromatophore skin.' });
    if (style)  refs.push({ b64: style,  label: 'STYLE AUTHORITY — Ender Bond ink-and-colour rendering ONLY.' });

    // Compose from the WIRED directives (tests the shipped round-2 canon text).
    const ffCombat = window._firstFavoredCombatDirective();
    const ffVeil   = window._veilweaveDirective('first_favored');   // 6-9 outward, superhuman, depth/pose staggered
    const kwCombat = window._kwisheenCombatDirective();             // 8-limb anatomy budget

    // Per-panel Veilweave reminder — mirrors the shipped _quadVwReminder so the effect holds in ALL FOUR panels.
    const VW = ' VEILWEAVE ACTIVE IN THIS PANEL: Kael is refracted into several WHOLE overlapping semi-transparent ' +
      'bodies (each a COMPLETE figure — own head/torso/two arms/two legs — never extra limbs on one body), all ' +
      'copies in the SAME full hooded translucent Veilweave, staggered at different heights and poses, some in ' +
      'front and some behind. Do not let this panel drop the effect.';

    const beats = [
      'QUADRANT 1 — AMBUSH. Deep in the VEILWOOD at dusk (dark iridescent leaf-canopy, shafts of low light). The ' +
        'TWO Kwisheen close on Kael from both sides among the pale trunks, tentacles uncoiling to strike, each ' +
        'raising an attack-buckler (an armoured limb through the shield\'s centre hole). Kael, wreathed in his ' +
        'overlapping Veilweave projections, is impossible to pin — both Kwisheen commit toward drifting ' +
        'afterimages. WIDE establishing shot.' + VW,
      'QUADRANT 2 — THE GRAPPLE (continues directly from panel 1). Kwisheen A has caught a REAL limb — continuous ' +
        'contact, the counter to Veilweave — coiling its lower tentacles around Kael\'s weapon-arm and waist so ' +
        'his true position is suddenly exposed and his projection-cloud collapses tight around him; Kwisheen B ' +
        'drives an UNDERTIDE DAGGER up from a low angle on a rising lower tentacle. Kael twists against the hold. ' +
        'MEDIUM, tight and knotted.' + VW,
      'QUADRANT 3 — THE REVERSAL (continues from panel 2). Kael explodes free in an aerial superhuman reversal — ' +
        'THE ANSWER polearm\'s crescent hook catching Kwisheen A\'s tentacle and flinging it off balance, his ' +
        'Veilweave projections trailing his arc in a storm of positions; Kwisheen B throws up its attack-buckler ' +
        'to block, other tentacles anchoring to a Veilwood root. WIDE, upward diagonal motion.' + VW,
      'QUADRANT 4 — THE FINISH (continues from panel 3). Kael lands BETWEEN the two Kwisheen, the AVOWAL BLADE ' +
        'mid-strike — Kwisheen A reeling back, tentacles recoiling, Kwisheen B bracing low against a root and ' +
        'raising its buckler. Kael\'s projection-storm is at its widest, still fully in the translucent ' +
        'Veilweave. WIDE, low hero angle, dusk Veilwood behind.' + VW
    ];

    const prompt =
      'A SINGLE FINISHED COLOUR ILLUSTRATION in a 2x2 GRID of four equal panels, clean straight gutters, one ' +
      'vertical + one horizontal at the exact centre. Four equal quadrants; no figure crosses a gutter; do not ' +
      'make a decorative comic page. Reading order TL, TR, BL, BR. The four panels are ONE CONTINUOUS FIGHT — ' +
      'each panel is the next moment of the same action, same three combatants, same Veilwood clearing:\n' +
      beats.join('\n') +
      '\n\n══ APPLIES TO EVERY PANEL ══' + ffCombat + ffVeil + kwCombat +
      '\nKael is the SAME individual in all four panels (identical face, silver hair, luminous markings, the same ' +
      'transparent Veilweave, humanoid with two arms + two legs, NO tentacles). The two Kwisheen stay the same ' +
      'two individuals throughout (each EXACTLY eight limbs — two tentacle-arms from the shoulders + six lower ' +
      'tentacles from the waist; never a third arm, never a limb from the back/spine/chest). Dark Veilwood ' +
      'setting so the refraction reads. Ender Bond ink-and-colour. No panel numbers, captions, or lettering anywhere.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, provider:'gemini', model:'gemini-3.1-flash-image-preview', imageSize:SIZE, aspect_ratio:'1:1', imageIntent:'scene', textFirst:true, n:1, reference_images_b64: refs }) });
    if (!r.ok) return { err:'HTTP '+r.status+' '+(await r.text()).slice(0,160) };
    const d = await r.json(); const u = d.image||d.url;
    return u ? { url: u.startsWith('data:')?u:'data:image/png;base64,'+u, refs: refs.length, promptLen: prompt.length } : { err:'no image' };
  }, { SIZE });

  if (res.err) { console.error('FAILED — '+res.err); await b.close(); process.exit(1); }
  fs.writeFileSync(path.join(OUT,'veilwood_duel.png'), Buffer.from(res.url.split(',')[1],'base64'));
  const im = await p.evaluate(async ({u})=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});return i.width+'x'+i.height;},{u:res.url});
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s · ${im} · refs=${res.refs} · prompt=${res.promptLen} chars`);
  console.log('Saved → ' + OUT);
  await b.close();
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
