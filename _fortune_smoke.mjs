import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> window.state && typeof window.updateFortuneDisplay==="function" && typeof window.grantTasteBookFortune==="function", {timeout:45000});
  const out = await p.evaluate(()=>{
    const s=window.state=window.state||{};
    // ── WIDGET: show the vault library screen, hide others, then update ──
    ['setup','storyContent','gnReader','game','forbiddenLibraryScreen'].forEach(id=>{const el=document.getElementById(id); if(el)el.classList.add('hidden');});
    s.storyId=null;
    const lib=document.getElementById('vaultLibraryScreen'); if(lib) lib.classList.remove('hidden');
    window.updateFortuneDisplay();
    const fw=document.getElementById('fortuneWidget');
    const widgetShownInLibrary = !!(fw && fw.classList.contains('fw-visible'));
    // now hide the library → widget should hide again (no storyId, no whitelisted screen)
    if(lib) lib.classList.add('hidden');
    window.updateFortuneDisplay();
    const widgetHiddenElsewhere = !!(fw && !fw.classList.contains('fw-visible'));
    // ── GRANT: taste-book grant should NOT add fortunes now ──
    try { localStorage.removeItem('sb_taste_book_grants'); } catch(_){}
    s._tasteBookGrants = {};
    s.fortunes = 60;
    const g = window.grantTasteBookFortune('first_taste');
    const balAfter = s.fortunes;
    return { widgetShownInLibrary, widgetHiddenElsewhere, grantResult:g, balAfter };
  });
  ck('widget SHOWS in the Private Library (vaultLibraryScreen)', out.widgetShownInLibrary);
  ck('widget still hides when no story/whitelisted screen', out.widgetHiddenElsewhere);
  ck('taste-book grant adds 0F (was +20) — balance stays 60', out.balAfter===60, 'bal='+out.balAfter);
  ck('grant returns granted:false / amount:0', out.grantResult && out.grantResult.granted===false && out.grantResult.amount===0, JSON.stringify(out.grantResult));
  ck('grant still records the book (idempotency preserved)', out.grantResult && out.grantResult.reason==='granted');
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== FORTUNE FIXES SMOKE ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,80)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
