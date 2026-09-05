import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._extractScene1PrewrittenExpansions==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    const s=window.state=window.state||{}; s.playerName='Mara'; s.loveInterestName='Dorian';
    const scene = [
      "My hand tightened around the deck.",
      "<<MICRO_EXPRESSION>>",
      "Say it plainly — or let it show without words?",
      "<<CONTINUE>>",
      "Dorian watched me from across the room.",
      "",
      "The night ended, and nothing was resolved.",
      "",
      "<<EXPANSION_A>>",
      "\"I know what you did,\" I said, and the words landed flat and final between us.",
      "<<EXPANSION_B>>",
      "I said nothing. But Dorian read the stillness in me and his jaw tightened — he understood.",
      "<<END_EXPANSION>>"
    ].join("\n");
    const stripped = window._extractScene1PrewrittenExpansions(scene);
    return { stripped, pw: s._scene1PrewrittenExpansions,
             noMarkers: window._extractScene1PrewrittenExpansions("Just a plain scene with no markers.") };
  });
  ck('extracted direct payoff', !!(out.pw && /I know what you did/.test(out.pw.direct||'')), JSON.stringify(out.pw&&out.pw.direct));
  ck('extracted subtle payoff', !!(out.pw && /read the stillness/.test(out.pw.subtle||'')), JSON.stringify(out.pw&&out.pw.subtle));
  ck('EXPANSION block STRIPPED from display', !/EXPANSION_|I know what you did|read the stillness/.test(out.stripped), out.stripped.slice(-80));
  ck('MICRO_EXPRESSION widget marker PRESERVED', /<<MICRO_EXPRESSION>>/.test(out.stripped) && /Say it plainly/.test(out.stripped));
  ck('story prose preserved (closer intact)', /nothing was resolved/.test(out.stripped));
  ck('no-marker scene unchanged + clears prewritten', out.noMarkers==='Just a plain scene with no markers.');
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== LITERARY PREWRITE EXTRACTION LOGIC ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,90)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
