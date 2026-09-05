import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._sanitizeHiddenExpansion==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    const s=window.state=window.state||{}; s.playerName='Mara'; s.name='Mara'; s.loveInterestName='Dorian';
    s.picks=s.picks||{}; s.picks.identity={playerName:'Mara',partnerName:'Dorian'};
    const S=window._sanitizeHiddenExpansion;
    return {
      good: S("She said it — the thing she had circled all night — and the plain words changed the air between them."),
      withDorian: S("Dorian read the look, the held breath, and understood exactly what she would not name."),
      elias_poss: S("Elias's gaze lingered on the untouched ledger a moment too long before he closed it."),
      elias_said: S("Elias said nothing, but his jaw tightened."),
      tooLong: S("She said it and then she said more and then the room shifted and then he answered and then the whole thing unraveled across the table in a slow terrible cascade of consequence that neither of them could stop now that the words were finally out in the open air between them forever."),
      placeOk: S("The Aldridge doors held their silence; Mara let the moment stand."),
      empty: S("")
    };
  });
  ck('good payoff (no names) accepted', !!out.good);
  ck('payoff naming Dorian (known LI) accepted', !!out.withDorian);
  ck('"Elias\'s gaze…" (wrong name, possessive) REJECTED', out.elias_poss===null, JSON.stringify(out.elias_poss));
  ck('"Elias said…" (wrong name, dialogue verb) REJECTED', out.elias_said===null, JSON.stringify(out.elias_said));
  ck('too-long payoff REJECTED', out.tooLong===null);
  ck('single known place ("Aldridge") + Mara accepted', !!out.placeOk, JSON.stringify(out.placeOk));
  ck('empty REJECTED', out.empty===null);
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== PREWRITE SANITIZER LOGIC ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,80)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
