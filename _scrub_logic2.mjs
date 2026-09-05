import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._scrubAxisShapeQuestions==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    const S=window._scrubAxisShapeQuestions;
    const w="<<MICRO_EXPRESSION>>\nSay it plainly — or let it show without words?\n<<CONTINUE>>";
    return {
      will1: S("She froze. Will I confront the whispers or retreat into silence, hiding my shame? The music played on."),
      will2: S("Will I ask Margot what she already knows about the withdrawn favor or accept the silence?"),
      do1: S("Do I confront the laughter or retreat into silence and disappear?"),
      shall: S("Shall I speak now or hold my tongue forever?"),
      keepYou: S('"Do you know who sent this?" she asked.'),
      keepWe: S('"Should we run?" he whispered.'),
      widget: S("Her pulse raced. "+w+"\nShe waited.")
    };
  });
  ck('"Will I confront...or retreat?" removed', !/Will I confront the whispers/.test(out.will1), out.will1);
  ck('"Will I ask...or accept?" removed', !/Will I ask Margot/.test(out.will2), out.will2);
  ck('"Do I confront...or retreat?" removed', !/Do I confront the laughter/.test(out.do1), out.do1);
  ck('"Shall I speak...or hold?" removed', !/Shall I speak/.test(out.shall), out.shall);
  ck('KEEP "Do you know who sent this?"', /Do you know who sent this/.test(out.keepYou));
  ck('KEEP "Should we run?"', /Should we run/.test(out.keepWe));
  ck('WIDGET question intact', /Say it plainly — or let it show without words\?/.test(out.widget) && /<<MICRO_EXPRESSION>>/.test(out.widget));
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== SCRUB v2 (broadened) LOGIC ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,80)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
