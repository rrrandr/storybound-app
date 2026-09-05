// VEILWOOD DUEL v3 — fixes from v2 review (Roman):
// 1. VEILWOOD look: WHITE trees with thick drooping WHITE weeping-willow canopies; RED spiralgrass that
//    TWISTS/braids together like the trunks (not a flat red lawn).
// 2. Both Kwisheen UNDISGUISED — six free lower tentacles visible in EVERY panel, never legs/pants/boots.
// 3. Veilweave echoes present in ALL FOUR panels (wired: _veilweaveDirective ALWAYS-PRESENT clause),
//    matching his hood state (bare-headed when hood down), and ONE weapon throughout — no halberd->sword.
// 4. Q2 rewritten so BOTH Kwisheen are fully in frame (the tentacles that bind Kael belong to a visible body).
// PAID — 1 image @ 4K (~$0.15). RUN=1 to spend.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/veilwood_duel';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('VEILWOOD DUEL v3 — white weeping-willow Veilwood, tentacles-always, one weapon @ ' + SIZE);
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
    if (ffHero) refs.push({ b64: ffHero, label: 'KAEL — the HERO, a MALE FIRST FAVORED (the ONLY First Favored): luminous Weave-Script skin, diamond pupils, silver hair, athletic HUMANOID build, TWO arms + TWO legs, NO tentacles, NO facial tattoos, NO mohawk. The SAME man, identical face, in all four panels.' });
    if (veil)   refs.push({ b64: veil,   label: 'VEILWEAVE FABRIC + EFFECT SWATCH (style only, NOT a character) — the transparent hooded leaf-vein garment and how the overlapping misregistered echoes of ONE body read. Copy the EFFECT + transparency ONLY; Kael keeps his OWN face/build/weapon; do not copy this swatch\'s figure or make it its own panel.' });
    if (orun)   refs.push({ b64: orun,   label: 'ORUN — a MALE Kwisheen (bearded, heavier). UNDISGUISED: torso above, EXACTLY six FREE lower tentacles below (NOT legs — ignore any pants/boots in this reference) + two tentacle-arms, coral cranial feelers, chromatophore skin. ALWAYS male, ALWAYS this same individual, six tentacles VISIBLE in every panel.' });
    if (threxa) refs.push({ b64: threxa, label: 'THREXA — a FEMALE Kwisheen, distinct from Orun (leaner, no beard), her tentacles a VIOLET/purple hue. UNDISGUISED: torso above, EXACTLY six FREE lower tentacles below (NOT legs) + two tentacle-arms, coral cranial feelers. ALWAYS female, ALWAYS this same individual, six tentacles VISIBLE in every panel she appears.' });
    if (style)  refs.push({ b64: style,  label: 'STYLE AUTHORITY — Ender Bond ink-and-colour rendering ONLY.' });

    const ffCombat = window._firstFavoredCombatDirective();
    const ffVeil   = window._veilweaveDirective('first_favored');
    const kwCombat = window._kwisheenCombatDirective();

    // Canon VEILWOOD look (Roman v2 note): WHITE weeping-willow trees + twisting red spiralgrass.
    const SETTING = '\n\nSETTING — THE VEILWOOD at dusk (render EXACTLY): the trees are WHITE — pale white bark ' +
      'on spiralled, helix-braided trunks, crowned with thick DROOPING WHITE WEEPING-WILLOW canopies whose long ' +
      'pale fronds hang like gossamer veils and filter the light; luminous LUMENWEAVE motes drift through the air ' +
      'like slow sparks. The ground is RED SPIRALGRASS — deep crimson blades that COIL AND TWIST TOGETHER like ' +
      'braided rope, echoing the spiral of the trunks (NOT a flat red lawn — the grass visibly intertwines and ' +
      'spirals), dotted with pale glowing MOONPETALS. NO dark forest, NO ordinary green grass, NO oak/birch. ' +
      'Dark, luminous, cinematic so the Veilweave refraction reads.';

    // ONE weapon everywhere: THE ANSWER (double-ended polearm). No sword swap.
    const WEAPON = ' Kael carries THE ANSWER — his double-ended POLEARM (crescent hook one end, killing blade the ' +
      'other) — the SAME polearm in every panel and in every echo; he never switches to a sword.';

    // Per-panel reminder: echoes ALWAYS present, hood-matched, same weapon.
    const VW = ' VEILWEAVE ACTIVE HERE: Kael shows FIVE-TO-EIGHT whole overlapping semi-transparent echoes in THIS ' +
      'panel — they never vanish while he wears the garment (even grappled they only crowd tighter), every echo ' +
      'matching his CURRENT hood state (bare-headed if his hood is down, hooded only if his real head is hooded) ' +
      'and holding the SAME polearm.';

    const beats = [
      'QUADRANT 1 — AMBUSH FROM THE TREES. LOW angle up; Kael at LOWER-LEFT on a mossy spiral root, hood UP, ' +
        'THE ANSWER in hand, his echoes bursting around him (all HOODED, matching him). Orun LASHES down head-first ' +
        'from a high white weeping-willow branch on his six tentacles; Threxa SWINGS in around a white trunk by a ' +
        'violet tentacle to flank the far side. Both Kwisheen fully tentacled. Everyone UNHURT, fresh.' + VW,
      'QUADRANT 2 — THE GRAPPLE & FIRST BLOOD. BOTH Kwisheen fully in frame. On the LEFT, THREXA (female, VIOLET ' +
        'tentacles, her whole body visible) has coiled her lower tentacles around Kael\'s weapon-arm and waist, ' +
        'pinning him. On the RIGHT, ORUN (male, bearded, braced on his own six tentacles) drives an UNDERTIDE DAGGER ' +
        'into Kael\'s shoulder — the Veilweave TORN there with luminous blood. Kael\'s hood is knocked DOWN, so all ' +
        'his echoes are now BARE-HEADED, crowded tight around him, still gripping THE ANSWER. Kael centre, pinned.' + VW,
      'QUADRANT 3 — THE REVERSAL. Upward diagonal; Kael AIRBORNE at UPPER-LEFT among the Lumenweave motes, hood ' +
        'still down (echoes bare-headed, trailing his arc). THE ANSWER\'s crescent hook catches Threxa\'s violet ' +
        'tentacle and WHIPS her off her feet — she is flung low-right, a tentacle gashed, her buckler spinning away. ' +
        'Orun (full tentacles) lunges after him a beat too slow at lower-left.' + VW,
      'QUADRANT 4 — THE FINISH. Low hero angle; Kael standing at the RIGHT, hood down, echoes bare-headed and ' +
        'settling to a few slow overlaps, THE ANSWER lowered (still the polearm). THREXA is DOWN — sprawled in the ' +
        'twisting red spiralgrass among crushed moonpetals, her six violet tentacles limp, beaten. ORUN is on the ' +
        'ground braced on his six tentacles (NOT kneeling on legs), one arm raised reeling, bleeding from the brow. ' +
        'Kael\'s Veilweave still on, torn at the shoulder. The aftermath — a clear victor over beaten foes.' + VW
    ];

    const prompt =
      'A SINGLE FINISHED COLOUR ILLUSTRATION in a 2x2 GRID of four equal panels, clean straight gutters, one ' +
      'vertical + one horizontal at the exact centre. Four equal quadrants; no figure crosses a gutter; do not ' +
      'make a decorative comic page. Reading order TL, TR, BL, BR. The four panels are ONE CONTINUOUS FIGHT that ' +
      'PROGRESSES — same three combatants, same Veilwood clearing, each panel a later moment with rising ' +
      'consequence (positions, injuries, upper hand all CHANGE; never repeat the same standoff). Two HIGHLY ' +
      'MOBILE, ACROBATIC species: the Kwisheen swing and lash from the white weeping-willow branches and flank; ' +
      'the First Favored leaps and spins. Nobody just stands trading blows.\n' + beats.join('\n') +
      '\n\n══ APPLIES TO EVERY PANEL ══' + SETTING + WEAPON + ffCombat + ffVeil + kwCombat +
      '\nCAST LOCK: exactly THREE named individuals across all four panels and no others — KAEL (male First ' +
      'Favored, silver hair, luminous humanoid, two arms + two legs, always in the hooded translucent Veilweave, ' +
      'always refracted into 5-8 echoes, THE ANSWER polearm), ORUN (male bearded Kwisheen), THREXA (female ' +
      'Kwisheen, violet tentacles). BOTH Kwisheen are UNDISGUISED and openly fighting: their SIX FREE lower ' +
      'tentacles are fully visible in EVERY panel — never bundled into legs, never pants/boots, never a single ' +
      'tail. Orun stays MALE and Threxa stays FEMALE throughout; they never swap. Each Kwisheen has EXACTLY eight ' +
      'limbs (two tentacle-arms from the shoulders + six lower tentacles from the waist) — never a third arm, ' +
      'never a limb from the back/spine/chest. Ender Bond ink-and-colour. No panel numbers, captions, or lettering.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, provider:'gemini', model:'gemini-3.1-flash-image-preview', imageSize:SIZE, aspect_ratio:'1:1', imageIntent:'scene', textFirst:true, n:1, reference_images_b64: refs }) });
    if (!r.ok) return { err:'HTTP '+r.status+' '+(await r.text()).slice(0,160) };
    const d = await r.json(); const u = d.image||d.url;
    return u ? { url: u.startsWith('data:')?u:'data:image/png;base64,'+u, refs: refs.length, promptLen: prompt.length } : { err:'no image' };
  }, { SIZE });

  if (res.err) { console.error('FAILED — '+res.err); await b.close(); process.exit(1); }
  fs.writeFileSync(path.join(OUT,'veilwood_duel_v3.png'), Buffer.from(res.url.split(',')[1],'base64'));
  const im = await p.evaluate(async ({u})=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});return i.width+'x'+i.height;},{u:res.url});
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s · ${im} · refs=${res.refs} · prompt=${res.promptLen} chars`);
  console.log('Saved → ' + OUT + '/veilwood_duel_v3.png');
  await b.close();
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
