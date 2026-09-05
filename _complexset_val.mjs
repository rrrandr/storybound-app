import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newContext().then(c => c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d===undefined?'':String(d)});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._isComplexAuthorMode==='function'
    && typeof window._isPremiumAuthorScene==='function'
    && typeof window._sceneEditorialTier==='function', {timeout:15000});

  const out = await p.evaluate(()=>{
    const s = window.state = window.state || {};
    // Force a CONNECTING scene: not scene 1, not a tentpole/premium beat.
    // turnCount>0 avoids scene-1 premium; clear climax/cliffhanger/tempt signals.
    const setConnecting = ()=>{
      s.turnCount = 4; s.turn = 4;
      s.isClimax=false; s.isCliffhanger=false; s.temptFate=false; s._temptActive=false;
      s.sceneRole='connecting'; s.beatType='connecting';
    };
    // Complex detection reads resolvedWorldFlavors (active-only) — the canonical channel.
    const withFlavor = (val, world)=>{
      s.metaWorld=null; s.worldSubtype=world||null; s.picks={worldSubtype:world||null};
      s.resolvedWorldFlavors = val ? [{ val }] : [];
      setConnecting();
      const tier = window._sceneEditorialTier();
      const premiumScene = window._isPremiumAuthorScene();
      const complex = window._isComplexAuthorMode();
      // Literary path replicates: _premium = _isPremiumAuthorScene() || _isComplexAuthorMode()
      const literaryPremium = premiumScene || complex;
      // CG path replicates: complexMode → Grok-first; else premiumScene → Grok; else Mistral-Small
      const cgAuthor = complex ? 'grok' : (premiumScene ? 'grok' : 'mistral_small');
      const litAuthor = literaryPremium ? 'grok' : 'mistral_small';
      return { val, tier, premiumScene, complex, litAuthor, cgAuthor };
    };
    return {
      // three newly-added complex flavors (connecting scene → must be Grok both paths)
      galactic: withFlavor('galactic_civilizations','galactic_civilizations'),
      quieting: withFlavor('quieting_event','dystopia'),
      erasure:  withFlavor('endless_edit','dystopia'),
      // regression: existing complex still complex
      thirst:   withFlavor('thirst','thirst'),
      cursed:   withFlavor('cursed','cursed'),
      // nearby NON-complex siblings per world (connecting → must be Mistral Small)
      dogma:    withFlavor('dogma','dystopia'),          // Dystopia sibling
      humancap: withFlavor('human_capital','dystopia'),  // Dystopia sibling
      cyberpunk:withFlavor('cyberpunk','scifi'),         // SciFi sibling
      firstcon: withFlavor('first_contact','scifi'),     // SciFi sibling
      // sanity: no flavor at all → not complex
      none:     withFlavor(null,'modern_core'),
    };
  });

  const complexCase = (label, o)=>{
    ck(`${label}: _isComplexAuthorMode → true`, o.complex===true, JSON.stringify(o));
    ck(`${label}: Literary connecting → grok`, o.litAuthor==='grok', o.litAuthor);
    ck(`${label}: CG connecting → grok`, o.cgAuthor==='grok', o.cgAuthor);
  };
  const nonComplexCase = (label, o)=>{
    ck(`${label}: _isComplexAuthorMode → false`, o.complex===false, JSON.stringify(o));
    ck(`${label}: connecting scene is NOT premium (isolates author from tier)`, o.premiumScene===false, 'premiumScene='+o.premiumScene);
    ck(`${label}: Literary connecting → mistral_small`, o.litAuthor==='mistral_small', o.litAuthor);
    ck(`${label}: CG connecting → mistral_small`, o.cgAuthor==='mistral_small', o.cgAuthor);
  };

  complexCase('galactic_civilizations', out.galactic);
  complexCase('quieting_event', out.quieting);
  complexCase('endless_edit', out.erasure);
  complexCase('thirst (regression)', out.thirst);
  complexCase('cursed (regression)', out.cursed);

  nonComplexCase('dogma (Dystopia sibling)', out.dogma);
  nonComplexCase('human_capital (Dystopia sibling)', out.humancap);
  nonComplexCase('cyberpunk (SciFi sibling)', out.cyberpunk);
  nonComplexCase('first_contact (SciFi sibling)', out.firstcon);
  nonComplexCase('no-flavor (modern_core sanity)', out.none);
} catch(e){ ck('HARNESS',false,e.message+'\n'+(e.stack||'')); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== COMPLEX-MODE FLAVOR SET ROUTING ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → got '+r.d}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗ FAILURES'}`);
process.exit(pass===R.length?0:1);
