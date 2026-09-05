// VEILWOOD DUEL v2 — Veilweave First Favored vs TWO named Kwisheen (Orun + Threxa), one 2x2 sheet that
// is ONE continuous fight with a real ARC: ambush-from-the-trees → grapple + first blood → aerial
// reversal → decisive finish. Fixes from v1 review (Roman): (1) canon-correct VEILWOOD setting
// (spiralbound helix trunks, gossamer leaf-veils, drifting Lumenweave motes, RED spiralgrass — no
// generic trees/green grass); (2) LOCKED pair, no sex/arm swapping; (3) hood/garment state matches
// across all projections (wired in _veilweaveDirective now); (4) MOBILE acrobatic combat, flanking,
// varied FF position (not dead-center); (5) Kael stays cloaked in Q4 + visible injuries/defeat/progression.
// PAID — 1 image @ 4K (~$0.15). RUN=1 to spend.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/veilwood_duel';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('VEILWOOD DUEL v2 — Kael (Veilweave FF) vs Orun + Threxa (Kwisheen), continuous arc @ ' + SIZE);
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
    const orun    = await load('/assets/Fatelands/Kwisheen_Male_Solo_v2.jpg');
    const threxa  = await load('/assets/Fatelands/Kwisheen_Female_Solo_v2.jpg');
    let style=null; try { const st=window.RENDER_STYLE_SYSTEM.ender_bond; const gm=st.structured_anchors.anchors.find(a=>a.role==='golden_master'); if(gm) style=await load(gm.file); }catch(_){}
    const refs=[];
    if (ffHero) refs.push({ b64: ffHero, label: 'KAEL — the HERO, a MALE FIRST FAVORED (the ONLY First Favored present): luminous skin with Weave-Script glow, diamond pupils, silver hair, athletic HUMANOID build, TWO arms + TWO legs, NO tentacles, NO facial tattoos, NO mohawk. The SAME man in all four panels; keep his face identical panel to panel.' });
    if (veil)   refs.push({ b64: veil,   label: 'VEILWEAVE FABRIC + EFFECT SWATCH (style only, NOT a character) — how the transparent hooded leaf-vein garment looks and how the overlapping misregistered projections of ONE body read. Copy the EFFECT + transparency ONLY; Kael keeps his OWN face/build/weapon from his HERO ref; do not copy this swatch\'s figure or make it its own panel.' });
    if (orun)   refs.push({ b64: orun,   label: 'ORUN — a MALE Kwisheen opponent (bearded, heavier build): humanoid torso, EXACTLY six lower tentacles (no legs) + two tentacle-arms, coral cranial feelers, chromatophore skin. He is ALWAYS male and ALWAYS this same individual in every panel he appears.' });
    if (threxa) refs.push({ b64: threxa, label: 'THREXA — a FEMALE Kwisheen opponent, clearly distinct from Orun (leaner, no beard): humanoid torso, EXACTLY six lower tentacles + two tentacle-arms, coral cranial feelers, chromatophore skin. She is ALWAYS female and ALWAYS this same individual in every panel she appears.' });
    if (style)  refs.push({ b64: style,  label: 'STYLE AUTHORITY — Ender Bond ink-and-colour rendering ONLY.' });

    // Compose from the WIRED directives (validates the shipped canon incl. round-2/round-3 fixes).
    const ffCombat = window._firstFavoredCombatDirective();
    const ffVeil   = window._veilweaveDirective('first_favored');
    const kwCombat = window._kwisheenCombatDirective();

    // Canon VEILWOOD setting (from FATELANDS region canon: spiralbound helix trunks, gossamer leaf-veils,
    // drifting Lumenweave motes, RED spiralgrass, moonpetals) — NOT generic broadleaf trees or green grass.
    const SETTING = '\n\nSETTING — THE VEILWOOD at dusk (render it EXACTLY, this is not an ordinary forest): ' +
      'towering SPIRALBOUND, helix-BRAIDED tree trunks that twist like woven rope, hung with gossamer ' +
      'iridescent LEAF-VEILS that filter the light into shifting colour; luminous LUMENWEAVE motes drift ' +
      'through the air like slow sparks; the ground is a carpet of RED SPIRALGRASS (deep crimson, coiled ' +
      'blades — NOT green grass) dotted with pale glowing MOONPETALS. NO ordinary round-leaf/oak/birch trees, ' +
      'NO green lawn, NO generic woodland. Dark, cinematic, so the Veilweave refraction reads.';

    // Per-panel Veilweave reminder — mirrors shipped _quadVwReminder + the new hood/garment-state rule.
    const VW = ' VEILWEAVE ACTIVE IN THIS PANEL: Kael is refracted into several WHOLE overlapping ' +
      'semi-transparent bodies (each a complete figure, never extra limbs), all sharing his EXACT hood + ' +
      'garment state this instant (hood down on ALL if down on the real body; the shoulder tear shows on ALL ' +
      'once torn), staggered at different heights, some in front and some behind. Do not drop the effect here.';

    const beats = [
      'QUADRANT 1 — AMBUSH FROM THE TREES. Composition: LOW angle looking UP; Kael is at the LOWER-LEFT crossing ' +
        'a mossy spiral root, NOT centred. Orun and Threxa spring the trap from ABOVE — Orun LASHES down head-first ' +
        'from a high braided branch on his tentacles, Threxa SWINGS around a trunk by a coiled tentacle to cut off ' +
        'Kael\'s escape on the far side, both flanking him from two high angles. Kael\'s projection-cloud bursts as ' +
        'he twists to read the double threat. Everyone UNHURT, fresh — the fight is just beginning. HOOD UP on Kael.' + VW,
      'QUADRANT 2 — THE GRAPPLE & FIRST BLOOD. Composition: tight, pushed to the RIGHT; Kael pinned right-of-centre ' +
        'against a braided trunk. Threxa has coiled her lower tentacles around Kael\'s real weapon-arm and waist ' +
        '(continuous contact — the counter to Veilweave), his cloud collapsed tight around his true body; Orun drives ' +
        'an UNDERTIDE DAGGER in and OPENS A GASH across Kael\'s shoulder — the Veilweave is now TORN there with a line ' +
        'of luminous blood, and the tear + the knocked-DOWN HOOD show identically on every projection. Kael snarls, ' +
        'straining against the hold.' + VW,
      'QUADRANT 3 — THE REVERSAL. Composition: upward diagonal; Kael AIRBORNE at UPPER-LEFT among the Lumenweave motes, ' +
        'the two Kwisheen LOW and scattering. Kael has exploded off the trunk in a superhuman aerial spin — THE ANSWER ' +
        'polearm\'s crescent hook catches Threxa\'s tentacle and WHIPS her off her feet; she is flung sideways, a ' +
        'tentacle GASHED and bleeding, her attack-buckler spinning away. Orun lunges after Kael but is a beat too slow. ' +
        'Kael\'s Veilweave (still shoulder-torn, hood still down) trails his arc.' + VW,
      'QUADRANT 4 — THE FINISH. Composition: low HERO angle; Kael standing at the RIGHT over his beaten opponents in ' +
        'the red spiralgrass, NOT centred. Threxa is DOWN — sprawled among the crushed moonpetals, tentacles limp, ' +
        'beaten. Orun is on one knee, his buckler splintered, one arm raised in a reeling guard, bleeding from the ' +
        'brow. Kael stands over them, chest heaving, breathing hard, the AVOWAL BLADE lowered — his Veilweave STILL ON ' +
        '(the same translucent hooded garment, hood down, torn at the shoulder), his projection-storm settling to a few ' +
        'slow echoes around him. A clear victor and clearly beaten foes — the aftermath, not the opening.' + VW
    ];

    const prompt =
      'A SINGLE FINISHED COLOUR ILLUSTRATION in a 2x2 GRID of four equal panels, clean straight gutters, one ' +
      'vertical + one horizontal at the exact centre. Four equal quadrants; no figure crosses a gutter; do not ' +
      'make a decorative comic page. Reading order TL, TR, BL, BR. The four panels are ONE CONTINUOUS FIGHT that ' +
      'PROGRESSES — the same three combatants, the same Veilwood clearing, each panel a later moment with rising ' +
      'consequence (positions, injuries and the upper hand all CHANGE from panel to panel — never repeat the ' +
      'same standoff). This is a fight between two HIGHLY MOBILE, ACROBATIC species: the Kwisheen swing and ' +
      'lash from the braided branches and flank, the First Favored leaps and spins through the air — nobody just ' +
      'stands in place trading blows.\n' + beats.join('\n') +
      '\n\n══ APPLIES TO EVERY PANEL ══' + SETTING + ffCombat + ffVeil + kwCombat +
      '\nCAST LOCK: exactly THREE named individuals across all four panels and no others — KAEL (male First ' +
      'Favored, silver hair, luminous humanoid, two arms + two legs, always in the hooded translucent Veilweave, ' +
      'always refracted), ORUN (male bearded Kwisheen), THREXA (female Kwisheen). Orun stays MALE and Threxa stays ' +
      'FEMALE in every panel; they never swap sex, never merge, never change which is which. Each Kwisheen has ' +
      'EXACTLY eight limbs (two tentacle-arms from the shoulders + six lower tentacles from the waist) — never a ' +
      'third arm, never a limb from the back/spine/chest. Ender Bond ink-and-colour. No panel numbers, captions, ' +
      'or lettering anywhere.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, provider:'gemini', model:'gemini-3.1-flash-image-preview', imageSize:SIZE, aspect_ratio:'1:1', imageIntent:'scene', textFirst:true, n:1, reference_images_b64: refs }) });
    if (!r.ok) return { err:'HTTP '+r.status+' '+(await r.text()).slice(0,160) };
    const d = await r.json(); const u = d.image||d.url;
    return u ? { url: u.startsWith('data:')?u:'data:image/png;base64,'+u, refs: refs.length, promptLen: prompt.length } : { err:'no image' };
  }, { SIZE });

  if (res.err) { console.error('FAILED — '+res.err); await b.close(); process.exit(1); }
  fs.writeFileSync(path.join(OUT,'veilwood_duel_v2.png'), Buffer.from(res.url.split(',')[1],'base64'));
  const im = await p.evaluate(async ({u})=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});return i.width+'x'+i.height;},{u:res.url});
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s · ${im} · refs=${res.refs} · prompt=${res.promptLen} chars`);
  console.log('Saved → ' + OUT + '/veilwood_duel_v2.png');
  await b.close();
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
