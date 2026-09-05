import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._reinjectScene1Micro==='function' && window.StoryPagination, {timeout:15000});
  const out = await p.evaluate(()=>{
    const res = {};
    window.StoryPagination.getCurrentPageIndex = () => 0;   // pretend Scene 1 is showing
    const cont = document.getElementById('storyPagesContainer') || (()=>{const d=document.createElement('div');d.id='storyPagesContainer';document.body.appendChild(d);return d;})();
    const mkPage = () => { cont.innerHTML = '<div class="story-page active"><p>Scene prose.</p>'
      + '<div class="scene1-micro-expr" data-q="Say it plainly — or let it show?">You could Say it plainly. Or let it show without words.</div>'
      + '<p>Closing.</p></div>'; };
    const persist = {
      page: 0,
      widgetHtml: '<div class="scene1-micro-expr sme-hydrated sme-resolved"><p class="sme-committed">I said it plainly.</p></div>',
      asideHtml: '<div class="axis-expansion"><p>I know about the records.</p></div>'
    };
    // CASE 1: reopen (generic flat micro, no aside) → reinject restores resolved widget + aside
    mkPage(); window.state._scene1MicroPersist = persist;
    window._reinjectScene1Micro();
    const w1 = cont.querySelector('.scene1-micro-expr');
    res.c1_resolved = !!(w1 && w1.classList.contains('sme-resolved') && /I said it plainly/.test(w1.textContent));
    res.c1_notFlat = !/You could Say it plainly/.test(cont.textContent);
    const a1 = cont.querySelector('.axis-expansion');
    res.c1_aside = !!(a1 && /I know about the records/.test(a1.textContent));
    res.c1_asideAfterWidget = !!(w1 && w1.nextElementSibling === a1);
    // CASE 2: idempotent — running again doesn't double the aside
    window._reinjectScene1Micro();
    res.c2_singleAside = cont.querySelectorAll('.axis-expansion').length === 1;
    // CASE 3: wrong page → no-op
    mkPage(); window.StoryPagination.getCurrentPageIndex = () => 3;
    window._reinjectScene1Micro();
    res.c3_noop = /You could Say it plainly/.test(cont.textContent) && !cont.querySelector('.axis-expansion');
    // CASE 4: no persist → no-op (no throw)
    window.StoryPagination.getCurrentPageIndex = () => 0; mkPage(); window.state._scene1MicroPersist = null;
    window._reinjectScene1Micro();
    res.c4_noop = /You could Say it plainly/.test(cont.textContent);
    return res;
  });
  ck('reopen: resolved widget re-applied (choice-specific line)', out.c1_resolved);
  ck('reopen: generic "You could…" flat text replaced', out.c1_notFlat);
  ck('reopen: payoff aside restored', out.c1_aside);
  ck('reopen: aside sits right after the widget', out.c1_asideAfterWidget);
  ck('idempotent: no double aside on second render', out.c2_singleAside);
  ck('wrong page → no-op (does not touch other scenes)', out.c3_noop);
  ck('no persist → clean no-op', out.c4_noop);
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== RESUME PERSISTENCE (#1) REINJECT LOGIC ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,70)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
