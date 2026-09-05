// VEILWOOD DUEL v6 — v4 base (Ender Bond restored, legs+tentacles Kwisheen) + a WEAPON LOCK.
// Weapons were mutating/vanishing because the combat directives offer each species a MENU of weapons and the
// FF canon gives Kael two (polearm + sword). Fix: assign ONE fixed weapon per named character, distinctive
// silhouette, bound by name, invariant + in-hand every panel — and explicitly override the directive menu.
//   KAEL  → THE ANSWER (double-ended polearm: crescent hook + straight blade)   [also in every Veilweave echo]
//   ORUN  → a barbed TIDE-TRIDENT (long three-pronged spear)
//   THREXA→ a curved REEF-CUTLASS (hooked single-edged sword)
// PAID — 1 image @ 4K (~$0.15). RUN=1 to spend.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/veilwood_duel';
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('VEILWOOD DUEL v6 — v2 base + minimal fixes, Ender Bond locked @ ' + SIZE);
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
    if (style)  refs.push({ b64: style,  label: 'STYLE AUTHORITY (match this rendering above all) — Ender Bond: painterly ink-and-colour, luminous cinematic shading, refined elegant linework. Every panel must look like this.' });
    if (ffHero) refs.push({ b64: ffHero, label: 'KAEL — the hero, a male First Favored (the only First Favored): luminous Weave-Script skin, diamond pupils, silver hair, athletic humanoid build, two arms and two legs, no tentacles, no facial tattoos, no mohawk. The same man, identical face, in all four panels.' });
    if (veil)   refs.push({ b64: veil,   label: 'Veilweave fabric + effect swatch (style reference only, not a character) — the transparent hooded leaf-vein garment and how the overlapping misregistered echoes of one body read. Take the effect and transparency only; Kael keeps his own face and build; do not copy this figure or make it a separate panel.' });
    if (orun)   refs.push({ b64: orun,   label: 'ORUN — a male Kwisheen: a TALL, graceful, sensual humanoid — human-like bearded head, torso AND legs — distinguished by tentacles: tentacle-arms and additional fluid tentacles about his body. Fine coral cranial feelers. Mysterious and beautiful, never a squat octopus-monster, never a floating tentacle-head. Always male, the same individual every panel.' });
    if (threxa) refs.push({ b64: threxa, label: 'THREXA — a female Kwisheen, distinct from Orun (leaner, no beard, violet-toned tentacles): a TALL, graceful, sensual humanoid — human-like head, torso AND legs — distinguished by tentacle-arms and additional fluid tentacles about her body. Fine coral cranial feelers. Never a squat octopus-monster. Always female, the same individual every panel.' });

    const ffCombat = window._firstFavoredCombatDirective();
    const ffVeil   = window._veilweaveDirective('first_favored');   // carries the wired always-present / hood-match / one-weapon rules
    const kwCombat = window._kwisheenCombatDirective();

    // Setting in prose (not a shouting spec), so it colours the scene without triggering diagram/comic mode.
    const SETTING = '\n\nThe setting is the Veilwood at dusk: pale white trees with spiralled, braided trunks, ' +
      'crowned by thick drooping white weeping-willow canopies whose long fronds hang like veils and filter the ' +
      'light; slow luminous motes drift in the air; the ground is deep-crimson spiralgrass that coils and twists ' +
      'together like the trunks, scattered with pale glowing moonpetals. Dark and luminous so the refraction reads.';

    // The Kwisheen register, in canon terms — beauty, not creature-feature. (Roman: legs AND tentacles.)
    // Threxa is CLOTHED on her legs (Roman: "the female kwish has no pants").
    const KW_LOOK = '\n\nThe two Kwisheen are rendered as elegant, mysterious, sensual beings — tall and graceful, ' +
      'fully humanoid in build (human-like head, torso AND legs), distinguished by their tentacles: tentacle-arms ' +
      'and additional fluid tentacles about the body. Beautiful and uncanny, never squat, never a monstrous octopus, ' +
      'never a floating tentacle-head. Their tentacles are visible in every panel. Both are properly CLOTHED for ' +
      'battle: Orun in a scaled war-kilt and harness; Threxa in a fitted teal scale bodice with snug wrapped ' +
      'leggings/greaves over her legs — never bare-legged, never in just underwear.';

    // STRONGER Veilweave density (Roman v5: "effect super-weak, absent from 3/4 panels"). Reasserts a dense
    // storm in EVERY panel on top of the wired _veilweaveDirective.
    const VW_DENSITY = '\n\nVEILWEAVE PRESENCE (critical — must be strong in ALL FOUR panels, never faint or ' +
      'absent): in every panel Kael is a DENSE storm of SIX-TO-NINE heavily overlapping, semi-transparent ' +
      'misregistered echoes of his own body — the single most striking feature of every panel he is in. Even ' +
      'grappled or landing, the echoes crowd tight rather than thinning out. Never render Kael as one solid figure ' +
      'with only one or two faint ghosts.';

    // WEAPON LOCK — now from the WIRED production resolver (validates _weaponLockForScene end-to-end). Each
    // character carries an explicit .weapon (as the CG extractor would fill from prose); the resolver maps the
    // names to canonical Fatelands lore descriptors and emits the lock block.
    const WEAPON_LOCK = window._weaponLockForScene({ characters_present: [
      { name: 'Kael',   species: 'first_favored', weapon: { name: 'the answer' } },
      { name: 'Orun',   species: 'kwisheen',      weapon: { name: 'tide-trident' } },
      { name: 'Threxa', species: 'kwisheen',      weapon: { name: 'reef-cutlass' } }
    ] }, '');

    // De-titled beats — lowercase action, weapons named per the lock, EXPRESSIONS specified per panel
    // (Roman v5: faces were blank/wooden). Emotional acting is called out explicitly.
    const beats = [
      'Quadrant 1 (top-left): the ambush is sprung. Low camera angle looking up; Kael crosses a spiral root at the ' +
        'lower-left, not centred, hood up, his double-ended polearm in both hands, a dense storm of echoes around ' +
        'him. His face shows SURPRISE and sharp alarm — eyes wide, caught mid-turn as the trap closes. Orun lunges ' +
        'down from a high white willow branch with his three-pronged trident, teeth bared in a fierce battle-yell; ' +
        'Threxa swings in around a pale trunk with her curved cutlass, eyes bright with predatory glee. Nobody hurt yet.',
      'Quadrant 2 (top-right): the grapple and first blood. Threxa on the left, cutlass in hand, has coiled her ' +
        'violet tentacles around Kael\'s arm and waist, pinning him to a trunk, her face cold and focused; Orun on ' +
        'the right drives his three-pronged trident into Kael\'s shoulder, grim and intent, opening a gash through ' +
        'the Veilweave (a line of luminous blood). Kael\'s face is DOGGED DETERMINATION twisting into teeth-gritting ' +
        'PAIN — jaw clenched, brow furrowed, a snarl of effort — as he keeps his polearm gripped in one hand, hood ' +
        'knocked down, his echoes crowding tight around him.',
      'Quadrant 3 (bottom-left): the reversal. Kael has exploded free in a superhuman airborne spin at the upper-left, ' +
        'face set in ferocious focused resolve, swinging his double-ended polearm; its crescent hook catches ' +
        'Threxa\'s cutlass-arm and whips her off her feet — her expression breaking into FEAR and ALARM, eyes wide, ' +
        'mouth open, as she is flung low-right. Orun lunges after Kael a beat too slow at the lower-left, trident ' +
        'extended, frustration on his face. Kael\'s echoes trail his arc in a dense storm.',
      'Quadrant 4 (bottom-right): the finish. Kael stands at the right over his beaten foes in the twisting red grass, ' +
        'his double-ended polearm still in his hands, lowered — his face grimly spent, exhausted but resolute, ' +
        'chest heaving. Threxa is down and sprawled, her cutlass fallen beside her, her face stricken with ' +
        'defeated FEAR and pain; Orun is down low, reeling, bleeding, his trident fallen at his side, his face a ' +
        'grimace of pain and disbelief. Kael\'s Veilweave is still on, torn at the shoulder, a storm of echoes ' +
        'still around him. The aftermath.'
    ];

    const prompt =
      'A single finished colour illustration divided into a clean 2x2 grid of four equal rectangular panels, ' +
      'separated by one straight vertical gutter and one straight horizontal gutter at the exact centre. No figure ' +
      'crosses a gutter; not a decorative comic page. Reading order: top-left, top-right, bottom-left, bottom-right. ' +
      'The four panels are one continuous fight that progresses — the same three combatants, the same Veilwood ' +
      'clearing, each panel a later moment with changing positions and rising consequence. Two highly mobile, ' +
      'acrobatic species: the Kwisheen swing and lash from the willow branches and flank; the First Favored leaps ' +
      'and spins — nobody stands still trading blows.\n\n' + beats.join('\n\n') +
      '\n\nApplies to every panel:' + WEAPON_LOCK + SETTING + KW_LOOK + VW_DENSITY + ffCombat + ffVeil + kwCombat +
      '\n\nCast: exactly three individuals across all four panels — Kael (male First Favored, silver hair, luminous ' +
      'humanoid, two arms and two legs, always in the hooded translucent Veilweave, always refracted), Orun (male ' +
      'bearded Kwisheen), Threxa (female Kwisheen, violet tentacles). Orun stays male and Threxa stays female; they ' +
      'never swap. Each Kwisheen is a tall humanoid with legs, given character by tentacle-arms and additional ' +
      'tentacles about the body — coherent and elegant, not a chaotic tangle of random extra limbs. ' +
      '\n\nRendering: match the Ender Bond style reference exactly — painterly ink-and-colour with luminous ' +
      'cinematic shading and refined linework. This is NOT flat comic-book art, NOT a heavy-outline cartoon, NOT a ' +
      'captioned comic page. Absolutely NO text of any kind anywhere in the image — no captions, no caption boxes, ' +
      'no title bars, no panel labels, no words, no lettering.' +
      '\n\nFinal reminder — WEAPON LOCK holds across all four panels: Kael = the double-ended hook-and-blade polearm ' +
      '(in-hand every panel, in every echo, never a sword or empty hand), Orun = the three-pronged trident, ' +
      'Threxa = the curved hooked cutlass. These three weapons never change shape and never swap owners.';

    const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, provider:'gemini', model:'gemini-3.1-flash-image-preview', imageSize:SIZE, aspect_ratio:'1:1', imageIntent:'scene', textFirst:true, n:1, reference_images_b64: refs }) });
    if (!r.ok) return { err:'HTTP '+r.status+' '+(await r.text()).slice(0,160) };
    const d = await r.json(); const u = d.image||d.url;
    return u ? { url: u.startsWith('data:')?u:'data:image/png;base64,'+u, refs: refs.length, promptLen: prompt.length } : { err:'no image' };
  }, { SIZE });

  if (res.err) { console.error('FAILED — '+res.err); await b.close(); process.exit(1); }
  fs.writeFileSync(path.join(OUT,'veilwood_duel_v6.png'), Buffer.from(res.url.split(',')[1],'base64'));
  const im = await p.evaluate(async ({u})=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});return i.width+'x'+i.height;},{u:res.url});
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s · ${im} · refs=${res.refs} · prompt=${res.promptLen} chars`);
  console.log('Saved → ' + OUT + '/veilwood_duel_v6.png');
  await b.close();
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
