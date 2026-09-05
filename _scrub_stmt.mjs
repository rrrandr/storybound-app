import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._scrubAxisShapeQuestions==='function', {timeout:15000});
  const o = await p.evaluate(()=>{
    const S=window._scrubAxisShapeQuestions;
    const w="<<MICRO_EXPRESSION>>\nSay it plainly — or let it show without words?\n<<CONTINUE>>";
    return {
      leak: S("She scanned the crowd. The choice pressed now: speak and risk the room's full attention, or stay silent and watch the piece slide into Cassandra's hands. The quartet played on."),
      leak2: S("The decision: name the wound aloud, or bury it where no one could reach. She breathed."),
      keepDecideOrStay: S("The decision to leave or stay had already been made for her."),
      keepQuestionEmdash: S("The question—was it real or imagined—haunted her for weeks."),
      keepNoOr: S("The choice was hers alone, and she knew it."),
      keepChoiceProse: S("She weighed the choice: the ledger sat open, damning, on the table."),
      widget: S("Her pulse raced. "+w+"\nShe waited.")
    };
  });
  ck('statement leak removed ("The choice pressed now: X, or Y.")', !/The choice pressed now/.test(o.leak), o.leak.slice(0,90));
  ck('statement leak #2 removed ("The decision: X, or Y.")', !/The decision: name the wound/.test(o.leak2), o.leak2.slice(0,90));
  ck('surrounding prose preserved (leak case)', /scanned the crowd/.test(o.leak) && /quartet played on/.test(o.leak));
  ck('KEEP "The decision to leave or stay…" (no colon)', /The decision to leave or stay/.test(o.keepDecideOrStay));
  ck('KEEP "The question—real or imagined—…" (em-dash not colon)', /The question—was it real or imagined/.test(o.keepQuestionEmdash));
  ck('KEEP "The choice was hers alone" (no or)', /The choice was hers alone/.test(o.keepNoOr));
  ck('KEEP "the choice: the ledger…" (colon but no or-binary)', /the choice: the ledger sat open/.test(o.keepChoiceProse));
  ck('widget question still protected', /Say it plainly — or let it show without words\?/.test(o.widget) && /<<MICRO_EXPRESSION>>/.test(o.widget));
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== STATEMENT-FORM SCRUB (#4) ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,80)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
