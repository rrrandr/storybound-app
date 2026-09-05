// VEILWOOD DUEL v8 — v4 base (Ender Bond restored, legs+tentacles Kwisheen) + a WEAPON LOCK.
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
  console.log('VEILWOOD DUEL v8 — v2 base + minimal fixes, Ender Bond locked @ ' + SIZE);
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
    if (style)  refs.push({ b64: style,  label: 'STYLE AUTHORITY (match this rendering above all) — Ender Bond: bold VARIED-WEIGHT ink outlines with thick INK-SPLATTER / spatter accents, dense cross-HATCHING and stippling for shadow and volume, high-contrast ink-and-colour. Every panel must show visible hatching and heavy inky linework, never smooth flat vector shading.' });
    if (ffHero) refs.push({ b64: ffHero, label: 'KAEL — the hero, a male First Favored (the only First Favored): luminous Weave-Script skin, diamond pupils, silver hair, athletic humanoid build, two arms and two legs, no tentacles, no facial tattoos, no mohawk. The same man, identical face, in all four panels.' });
    if (veil)   refs.push({ b64: veil,   label: 'Veilweave fabric + effect swatch (style reference only, not a character) — the transparent hooded leaf-vein garment and how the overlapping misregistered echoes of one body read. Take the effect and transparency only; Kael keeps his own face and build; do not copy this figure or make it a separate panel.' });
    if (orun)   refs.push({ b64: orun,   label: 'ORUN — a male Kwisheen: a TALL, graceful, sensual humanoid — human-like bearded head, torso AND legs — distinguished by tentacles: tentacle-arms and additional fluid tentacles about his body. Fine coral cranial feelers. Mysterious and beautiful, never a squat octopus-monster, never a floating tentacle-head. Always male, the same individual every panel.' });
    if (threxa) refs.push({ b64: threxa, label: 'THREXA — a female Kwisheen, distinct from Orun (leaner, no beard, violet-toned tentacles): a TALL, graceful, sensual humanoid — human-like head, torso AND legs — distinguished by tentacle-arms and additional fluid tentacles about her body. Fine coral cranial feelers. Never a squat octopus-monster. Always female, the same individual every panel.' });

    const ffCombat = window._firstFavoredCombatDirective();
    const ffVeil   = window._veilweaveDirective('first_favored');   // carries the wired always-present / hood-match / one-weapon rules
    const kwCombat = window._kwisheenCombatDirective();

    // Setting (Roman corrections): trees + grass TWIST TOGETHER IN MATED PAIRS (two strands wound around each
    // other), NOT spirals/curls/pigtails; the canopy leaves are WHITE, not green.
    const SETTING = '\n\nThe setting is the Veilwood at dusk. The trees are PALE WHITE, and each tree is TWO ' +
      'trunks that WIND AROUND EACH OTHER IN A MATED PAIR — like a rope twisted from two strands, or two vines ' +
      'grown together — climbing straight up. This is a paired TWIST only: NO spirals, NO curls, NO curly-cues, ' +
      'NO pigtails, NO coiled scrolls. Each tree is crowned by a thick drooping weeping-willow canopy whose long ' +
      'fronds are WHITE / pale silver — the leaves are WHITE, never green. The ground is deep-crimson grass whose ' +
      'blades likewise grow in MATED PAIRS, two blades wound around each other (again a paired twist, NOT curls ' +
      'or spirals). Pale glowing moonpetals dot the ground. Dark and luminous so the Veilweave refraction reads. ' +
      'IMPORTANT: do NOT paint any floating atmospheric light-motes, sparkles, fireflies, glowing orbs or ' +
      'wisps in the air — leave the air clear of floating lights (they are added afterwards as a live ' +
      'animation). Moonpetals on the ground are fine; no floating glints anywhere.';

    // The Kwisheen register + the LEG-COUNT LAW (Roman v6: female had an extra 3rd leg = hard fail; male had
    // NO tentacles). Both here use the SAME fixed config: exactly TWO legs PLUS FOUR tentacles.
    const KW_LOOK = '\n\nThe two Kwisheen are elegant, mysterious, sensual beings — tall and graceful, humanoid ' +
      'from the head through the torso, never squat, never a monstrous octopus, never a floating tentacle-head. ' +
      'LOWER-BODY LAW (HARD — both Kwisheen, every panel): each has EXACTLY TWO legs PLUS FOUR tentacles rooted ' +
      'at the hips — count the legs, it is ALWAYS exactly two, NEVER one and NEVER three or more (an extra or ' +
      'missing leg is a hard failure). The FOUR tentacles are always VISIBLE and in use. They are undisguised ' +
      'and about to LOSE, so every tentacle is OUT and working — gripping branches, bracing, lashing, coiling — ' +
      'never tucked away; a Kwisheen up off the ground is holding a branch with its tentacles, not floating. ' +
      'Both are CLOTHED for battle: Orun in a scaled war-kilt and harness (his four tentacles clearly visible ' +
      'below it); Threxa in a fitted teal scale bodice with snug leggings over her two legs — never bare-legged.';

    // STRONGER Veilweave density (Roman v5: "effect super-weak, absent from 3/4 panels"). Reasserts a dense
    // storm in EVERY panel on top of the wired _veilweaveDirective.
    const VW_DENSITY = '\n\nVEILWEAVE PRESENCE (critical — must be strong in ALL FOUR panels, never faint or ' +
      'absent): in every panel Kael is a DENSE storm of SIX-TO-NINE heavily overlapping, semi-transparent ' +
      'misregistered echoes of his own body — the single most striking feature of every panel he is in. Even ' +
      'grappled or landing, the echoes crowd tight rather than thinning out. Never render Kael as one solid figure ' +
      'with only one or two faint ghosts.';

    // INJURY CONTINUITY (Roman v6: "FF stabbed in panel 2 but the injury is gone in 3-4"). Wounds persist.
    const INJURY = '\n\nINJURY CONTINUITY (the four panels read in order — ambush, grapple, reversal, finish): ' +
      'once Kael is stabbed in the shoulder in the grapple panel, that SAME wound — the gash, the luminous blood, ' +
      'the tear in the Veilweave at that shoulder — stays clearly visible on him in the reversal AND the finish ' +
      'panels, and on his echoes. Injuries do not heal or vanish between panels; they persist and accumulate.';

    // WEAPON LOCK — now from the WIRED production resolver (validates _weaponLockForScene end-to-end). Each
    // character carries an explicit .weapon (as the CG extractor would fill from prose); the resolver maps the
    // names to canonical Fatelands lore descriptors and emits the lock block.
    const WEAPON_LOCK = window._weaponLockForScene({ characters_present: [
      { name: 'Kael',   species: 'first_favored', weapon: { name: 'the answer' } },
      { name: 'Orun',   species: 'kwisheen',      weapon: { name: 'tide-trident' } },
      { name: 'Threxa', species: 'kwisheen',      weapon: { name: 'reef-cutlass' } }
    ] }, '');

    // De-titled beats — lowercase action, weapons named per the lock, EXPRESSIONS per panel, and a DISTINCT
    // SHOT per panel (Roman: the camera never changed — no low/high/close, "tripod in the clearing"). Each
    // quadrant is a different distance AND angle.
    const beats = [
      'Quadrant 1 (top-left): the ambush is sprung. SHOT — a WIDE establishing shot from a LOW angle looking ' +
        'steeply UP into the canopy. Kael crosses a spiral root at the lower-left, not centred, hood up, his ' +
        'double-ended polearm in both hands, a dense storm of echoes around him. His face shows SURPRISE and sharp ' +
        'alarm — eyes wide, caught mid-turn as the trap closes. Orun drops from a high white willow branch, his ' +
        'three-pronged trident in one arm and his four tentacles gripping and releasing the branch to swing down ' +
        '(that is what holds him aloft), teeth bared in a fierce battle-yell; Threxa swings in around a pale trunk ' +
        'with her curved cutlass, her tentacles coiling the trunk, eyes bright with predatory glee. Nobody hurt yet.',
      'Quadrant 2 (top-right): the grapple and first blood. SHOT — a TIGHT medium-CLOSE three-shot pushed in at ' +
        'eye level, filling the frame with the struggle. Orun on the right has coiled his tentacles around Kael\'s ' +
        'arm and waist, pinning him to a trunk, grim and intent; Threxa on the left SLASHES her curved cutlass and ' +
        'cuts a gash across Kael\'s shoulder, slicing through the Veilweave (first blood, a line of luminous blood), ' +
        'her face cold and focused. Kael\'s face is DOGGED DETERMINATION twisting into teeth-gritting PAIN — jaw ' +
        'clenched, brow furrowed, a snarl of effort — as he keeps his polearm gripped in one hand, hood knocked ' +
        'down, his echoes crowding tight around him.',
      'Quadrant 3 (bottom-left): the reversal. SHOT — a dynamic WIDE action shot from a HIGH angle looking DOWN, ' +
        'slightly Dutch-tilted, the ground far below. Kael has exploded free in a superhuman airborne spin at the ' +
        'upper-left, face set in ferocious focused resolve — the shoulder gash from the previous panel STILL ' +
        'bleeding, his Veilweave STILL torn there. His polearm and Threxa\'s cutlass CLASH, steel locking as his ' +
        'crescent hook catches her blade and whips her off her feet — her expression breaking into FEAR and ALARM, ' +
        'eyes wide, mouth open — as she is flung low-right, her two legs and all four tentacles splayed out (exactly ' +
        'two legs, never a third). Orun lunges after Kael a beat too slow at the lower-left, trident extended, all ' +
        'four tentacles bracing the ground, frustration on his face. Kael\'s echoes trail his arc in a dense storm.',
      'Quadrant 4 (bottom-right): the finish. SHOT — a MEDIUM-CLOSE hero shot from a LOW angle. Kael SLAMS Orun ' +
        'back-first into the base of the white twin-trunk tree with the shaft of his polearm — a heavy bone-jarring ' +
        'impact at the point of contact, Orun\'s head snapping back, blood at his mouth, his four tentacles flailing. ' +
        'Kael\'s face is grim, spent, resolute, chest heaving, the shoulder gash and torn Veilweave from earlier ' +
        'STILL visible and bloodied, his echoes a dense storm around him. Threxa is already down in the twisting red ' +
        'grass at the lower foreground (exactly two legs, four tentacles limp), her cutlass fallen beside her, her ' +
        'face stricken with defeated pain. The decisive blow landing.'
    ];

    // COMIC PRODUCTION LAYER per quadrant — from the WIRED designer functions (validates the sheet
    // storyboard-doc + graphic-language IMPACT + $0 SFX designer). One SFX per panel, canonical word.
    const beatsFX = beats.map(function (bt, i) {
      var extra = '';
      try {
        var type = window._readerLearningType(bt, i === 0) || 'Threat';
        var doc = window._buildStoryboardDoc(type, bt, null);
        var gl = window._graphicLanguageToPrompt(doc.graphicLanguage);
        if (gl) extra += '\n' + gl;
        var cat = window._letterSfxCategory(bt);
        if (cat && window._LETTER_SFX_VOCAB[cat]) {
          var word = window._LETTER_SFX_VOCAB[cat][0];   // canonical: KLANG / SLICE / THUD
          var act = (window._TYPO_SFX_VISIBLE_ACTION && window._TYPO_SFX_VISIBLE_ACTION[cat]) || 'the action it names';
          extra += '\nSOUND EFFECT (exactly ONE in this panel, hand-lettered and integrated INTO the art at the ' +
            'point of action, never over a face, never in a balloon): ' + word + ' — render it only because this ' +
            'panel depicts ' + act + '.';
        }
      } catch (_) {}
      return bt + extra;
    });

    const prompt =
      'A single finished colour illustration divided into a clean 2x2 grid of four equal rectangular panels, ' +
      'separated by one straight vertical gutter and one straight horizontal gutter at the exact centre. No figure ' +
      'crosses a gutter; not a decorative comic page. Reading order: top-left, top-right, bottom-left, bottom-right. ' +
      'The four panels are one continuous fight that progresses — the same three combatants, the same Veilwood ' +
      'clearing, each panel a later moment with changing positions and rising consequence. Two highly mobile, ' +
      'acrobatic species: the Kwisheen swing and lash from the willow branches and flank; the First Favored leaps ' +
      'and spins — nobody stands still trading blows. Show hits actually LANDING with force — a blade cutting ' +
      'flesh, a body driven into a tree — with impact bursts, motion streaks and blood; not fighters posed near ' +
      'each other mid-swing.\n\n' + beatsFX.join('\n\n') +
      '\n\nApplies to every panel:' + WEAPON_LOCK + SETTING + KW_LOOK + VW_DENSITY + INJURY + ffCombat + ffVeil + kwCombat +
      '\n\nCast: exactly three individuals across all four panels — Kael (male First Favored, silver hair, luminous ' +
      'humanoid, two arms and two legs, always in the hooded translucent Veilweave, always refracted), Orun (male ' +
      'bearded Kwisheen), Threxa (female Kwisheen, violet tentacles). Orun stays male and Threxa stays female; they ' +
      'never swap. Each Kwisheen is a tall humanoid with legs, given character by tentacle-arms and additional ' +
      'tentacles about the body — coherent and elegant, not a chaotic tangle of random extra limbs. ' +
      '\n\nRendering: match the Ender Bond style reference exactly — bold VARIED-WEIGHT ink outlines with thick ' +
      'INK-SPLATTER / spatter accents, dense CROSS-HATCHING and stippling for shadow and volume, luminous ' +
      'high-contrast ink-and-colour. Every panel must carry visible hatching and heavy inky linework; this is NOT ' +
      'smooth flat vector art, NOT a soft airbrushed cartoon. ' +
      'TEXT RULE: no captions, caption boxes, title bars, panel labels, speech balloons, thought balloons, or any ' +
      'readable dialogue/narration anywhere. The ONLY lettering allowed is the single integrated SOUND EFFECT ' +
      'specified for a panel (where one is given) — hand-lettered into the art at the point of action, never in a ' +
      'balloon, never over a face, at most ONE per panel.' +
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
  fs.writeFileSync(path.join(OUT,'veilwood_duel_v8.png'), Buffer.from(res.url.split(',')[1],'base64'));
  const im = await p.evaluate(async ({u})=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});return i.width+'x'+i.height;},{u:res.url});
  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s · ${im} · refs=${res.refs} · prompt=${res.promptLen} chars`);
  console.log('Saved → ' + OUT + '/veilwood_duel_v8.png');
  await b.close();
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
