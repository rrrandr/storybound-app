import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._revealPrewrittenAxisExpansion==='function', {timeout:15000});
  const s = await p.evaluate(()=>{
    const st=window.state=window.state||{}; st.playerName='Mara'; st.loveInterestName='Dorian';
    const cont=document.getElementById('storyPagesContainer')||document.getElementById('storyText')||document.body;
    // give the container a known dark prose color to prove color:inherit works
    cont.style.color='#ecdfc2';
    const node=document.createElement('p'); node.textContent='prev'; cont.appendChild(node);
    const ok = window._revealPrewrittenAxisExpansion('She said it plainly, and the words changed the air between them.', node);
    const box=document.querySelector('.axis-expansion');
    if(!box) return {ok, found:false};
    const cs=getComputedStyle(box); const p2=box.querySelector('p'); const pcs=p2?getComputedStyle(p2):null;
    return { ok, found:true,
      hasAxisClass: box.classList.contains('axis-expansion'),
      hasReverieClass: box.classList.contains('reverie-expansion'),
      borderLeft: cs.borderLeftWidth+' '+cs.borderLeftColor,
      borderLeftPresent: parseFloat(cs.borderLeftWidth)>=1.5,
      fullBox: parseFloat(cs.borderTopWidth)>1.5,  // reverie has full 1px+ all around; axis has hairline top
      fontFamily: cs.fontFamily,
      fontStyle: cs.fontStyle,                     // reverie is italic; axis should be normal (upright)
      proseColor: pcs?pcs.color:'',                // should inherit #ecdfc2-ish (theme-adaptive)
      text: (p2?p2.textContent:'').slice(0,40)
    };
  });
  ck('reveal returned true', s.ok);
  ck('.axis-expansion box rendered', s.found && s.hasAxisClass);
  ck('does NOT carry .reverie-expansion (distinct)', !s.hasReverieClass);
  ck('gold left-accent present (>=2px)', s.borderLeftPresent, s.borderLeft);
  ck('left-accent is gold', /201,\s*162,\s*78/.test(s.borderLeft), s.borderLeft);
  ck('upright roman (not reverie italic)', s.fontStyle==='normal', s.fontStyle);
  ck('Lora serif family', /Lora|serif/i.test(s.fontFamily), s.fontFamily);
  ck('prose color INHERITS reader theme (not hardcoded)', /236,\s*223,\s*194|#ecdfc2/i.test(s.proseColor), s.proseColor);
  ck('payoff text rendered', /She said it plainly/.test(s.text));
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== .axis-expansion DOM/STYLE SMOKE ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,70)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
