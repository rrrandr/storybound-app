import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window.updateFortuneDisplay==='function' && document.getElementById('fortuneWidget'), {timeout:20000});
  const out = await p.evaluate(()=>{
    const s=window.state; s.storyId=null;
    ['setup','storyContent','gnReader','game','forbiddenLibraryScreen'].forEach(id=>{const el=document.getElementById(id); if(el)el.classList.add('hidden');});
    const lib=document.getElementById('vaultLibraryScreen'); const fw=document.getElementById('fortuneWidget');
    lib.classList.remove('hidden'); window.updateFortuneDisplay();
    const shownInLibrary = fw.classList.contains('fw-visible');
    lib.classList.add('hidden'); window.updateFortuneDisplay();
    const hiddenElsewhere = !fw.classList.contains('fw-visible');
    // and forbidden library too
    const flib=document.getElementById('forbiddenLibraryScreen'); flib.classList.remove('hidden'); window.updateFortuneDisplay();
    const shownInForbidden = fw.classList.contains('fw-visible');
    return { shownInLibrary, hiddenElsewhere, shownInForbidden };
  });
  ck('widget SHOWS in Private Library (vaultLibraryScreen)', out.shownInLibrary);
  ck('widget SHOWS in Forbidden Library', out.shownInForbidden);
  ck('widget still HIDES with no story/whitelisted screen', out.hiddenElsewhere);
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== WIDGET FIX SMOKE ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,70)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
