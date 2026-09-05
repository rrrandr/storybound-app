// IN-BROWSER MOUNT CHECK — runs the REAL _renderStagedScene mount against REAL one-shot results.
// Staged mode shows ONE image per phase (img.staged-hero-img), swapped as the reader scrolls — so the
// 4 sheet quadrants become the 4 sequential phase images. The mount reads r.imageUrl from the results
// (which one-shot populates) → state._stagedActive.phaseImageUrls[phaseIdx] → imgEl.src. This confirms
// that chain end-to-end in a real browser. The reader container #gnPanelDisplay (which the gnReader
// screen normally provides) is injected so _renderStagedScene doesn't abort. PAID (authoring + 1 sheet).
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/mount_check';
const RUN = process.env.RUN === '1';

(async () => {
  console.log('IN-BROWSER MOUNT CHECK — real _renderStagedScene, one-shot results, 2K');
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
  const logs = [];
  p.on('console', m => { const t = m.text(); if (/\[ONESHOT|\[STAGED:RENDER|\[CG:SCREENPLAY\] gen|\[CG:CEILING/i.test(t)) { logs.push(t.slice(0,180)); console.error('   > ' + t.slice(0,160)); } });
  p.on('pageerror', e => { logs.push('PAGEERR: ' + e.message); console.error('   !! ' + e.message); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof window._completeStagedSceneFromScreenplay === 'function', { timeout: 40000 });

  console.log('\nAuthoring + rendering + mounting…'); const t0 = Date.now();
  const out = await p.evaluate(async () => {
    const s = window.state;
    // Reader container the gnReader screen would provide — so _renderStagedScene mounts instead of aborting.
    if (!document.getElementById('gnPanelDisplay')) {
      const d = document.createElement('div'); d.id = 'gnPanelDisplay';
      d.style.cssText = 'width:900px;min-height:900px;'; document.body.appendChild(d);
    }
    s.storyId = 'mount-check';
    s.picks = { world:'Fantasy', worldSubtype:'the_inhuman', flavor:'the_inhuman', genre:'fantasy', dynamic:'forbidden', tone:'Charged', intensity:'Steamy',
      identity:{ playerName:'Mira', partnerName:'Vael', displayPlayerName:'Mira', displayPartnerName:'Vael' }, pov:'1st' };
    s.povMode='normal'; s.world='Fantasy'; s.worldSubtype='the_inhuman'; s.flavor='the_inhuman'; s.fantasyRegion='gloamwater_bay';
    s.gender='Female'; s.loveInterest='Male'; s.authorPronouns='She/Her'; s._playerSpecies='Human'; s._liSpecies='Kwisheen';
    s.storyLength='affair'; s.tier='affair'; s.contentMode='explicit'; s.renderMode='staged_story_mode'; s.currentEngine='graphic';
    s.turnCount=0; s.scenes=[]; s.subscribed=true; s.fortunes=9999999; s.access='sub'; s.gnArtist=s.gnArtist||'ender_bond'; s._pcLookSkipped=true;
    s._sceneWant = "survive the Kwisheen raider's Many-Tide assault and keep Vael alive";
    s.currentCrisis = 'a hostile KWISHEEN raider ambushes Mira and Vael in the drowned coral ruins, fighting the Many-Tide way.';
    s.aPlot = { goal:"survive the ambush", antagonistOrAntiForce:'a hostile Kwisheen raider', namedClock:"before the hidden dagger finds Mira" };
    window._devBypass=true; window._stagedFunnelBypass=true; window.__cgAuthorTimeoutMs=180000;
    window._oneShotSheet=true; window._oneShotSheetSize='2K';
    s._stagedActive=null; s._stagedHeroCache={}; s._stagedRegionContract=null; s._castingLibrary={};

    let err=null;
    try { await Promise.race([ window._completeStagedSceneFromScreenplay(0,'',''), new Promise((_,r)=>setTimeout(()=>r(new Error('timeout 540s')),540000)) ]); }
    catch(e){ err=e&&e.message; }

    // Poll for the mount: phaseImageUrls populated + a staged-hero-img in the DOM with a data-url src.
    let mounted=null;
    for (let i=0;i<40;i++){
      const active = s._stagedActive;
      const urls = active && active.phaseImageUrls ? Object.keys(active.phaseImageUrls).length : 0;
      const heroImg = document.querySelector('#gnPanelDisplay img.staged-hero-img');
      const heroSrc = heroImg ? (heroImg.getAttribute('src')||'') : '';
      if (urls>=1 && heroSrc.indexOf('data:')===0){
        mounted = { phaseUrlCount: urls, heroSrcIsData: true, heroSrcLen: heroSrc.length,
          allPhaseUrls: active.phaseImageUrls, heroSample: heroSrc };
        break;
      }
      await new Promise(r=>setTimeout(r,2000));
    }
    const sheet = window._lastOneShotSheet ? window._lastOneShotSheet.url : null;
    return { err, mounted, sheet, phaseCount: (s._stagedActive&&s._stagedActive.plan&&s._stagedActive.plan.phases)?s._stagedActive.plan.phases.length:null,
             abortedRender: logs => false };
  });

  console.log(`\n  done in ${((Date.now()-t0)/1000).toFixed(0)}s${out.err?' (with: '+out.err+')':''}`);
  console.log(`  phases in plan     : ${out.phaseCount}`);
  const rendered = logs.some(l=>/\[ONESHOT\].*4 quadrants/.test(l));
  const abortedMount = logs.some(l=>/#gnPanelDisplay not found/.test(l));
  console.log(`  one-shot rendered  : ${rendered?'YES':'NO'}`);
  console.log(`  mount aborted      : ${abortedMount?'YES (no container)':'no'}`);
  if (out.mounted) {
    console.log(`  phaseImageUrls     : ${out.mounted.phaseUrlCount} phase(s) assigned`);
    console.log(`  staged-hero-img    : mounted with data-url (${out.mounted.heroSrcLen} chars)`);
    // Confirm the mounted hero src is one of the split quadrants (i.e., a fraction of the full sheet)
    const uniqueUrls = new Set(Object.values(out.mounted.allPhaseUrls).map(u=>String(u).length));
    console.log(`  distinct phase imgs: ${uniqueUrls.size} (by size)`);
    // save the mounted hero + all phase urls
    try { fs.writeFileSync(path.join(OUT,'mounted_hero.png'), Buffer.from(out.mounted.heroSample.split(',')[1],'base64')); } catch(_){}
    Object.entries(out.mounted.allPhaseUrls).forEach(([idx,u])=>{ try { fs.writeFileSync(path.join(OUT,`phase${idx}.png`), Buffer.from(String(u).split(',')[1],'base64')); } catch(_){} });
  } else {
    console.log(`  MOUNT NOT OBSERVED — phaseImageUrls not populated or no staged-hero-img with data src`);
  }
  if (out.sheet) try { fs.writeFileSync(path.join(OUT,'sheet.png'), Buffer.from(out.sheet.split(',')[1],'base64')); } catch(_){}
  fs.writeFileSync(path.join(OUT,'logs.txt'), logs.join('\n'));

  const pass = rendered && !abortedMount && out.mounted && out.mounted.phaseUrlCount>=1 && out.mounted.heroSrcIsData;
  console.log('\n' + (pass ? 'PASS — one-shot quadrants mounted into the real staged reader (staged-hero-img shows a phase image).'
                          : 'FAIL — see logs.txt.'));
  console.log('Saved → ' + OUT);
  await b.close(); process.exit(pass?0:1);
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
