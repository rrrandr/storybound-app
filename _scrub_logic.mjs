import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._scrubAxisShapeQuestions==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    const S = window._scrubAxisShapeQuestions;
    const widget = "<<MICRO_EXPRESSION>>\nSay it plainly — or let it show without words?\n<<CONTINUE>>";
    const wgtGR = "<<MICRO_EXPRESSION>>\nIs this the work — or him?\n<<CONTINUE>>";
    return {
      leak1: S("She froze. Do I confront the rumor head-on or bury it deeper, pretending it doesn't hurt? The room waited."),
      leak2: S("Do I confront the laughter or retreat into the shadows?"),
      leak3: S("Is this duty or desire? She had no answer."),
      leak4: S("Should I name the desire or let it pass?"),
      keep_you: S('"Do you know who sent this?" she asked.'),
      keep_we:  S('"Should we run?" he whispered.'),
      keep_or_stmt: S("She could stay or leave; both frightened her."),
      widget_safe: S("Her pulse raced. " + widget + "\nShe waited."),
      widget_gr_safe: S("The choice pressed in. " + wgtGR + "\nThe music swelled."),
      widget_plus_leak: S("Do I run or stay? " + widget)
    };
  });
  ck('leak1 "Do I confront...or bury...?" removed', !/Do I confront the rumor/.test(out.leak1), out.leak1);
  ck('leak2 "Do I confront...or retreat?" removed', !/Do I confront the laughter/.test(out.leak2), out.leak2);
  ck('leak3 "Is this duty or desire?" removed', !/Is this duty or desire/.test(out.leak3), out.leak3);
  ck('leak4 "Should I name...or let it pass?" removed', !/Should I name the desire/.test(out.leak4), out.leak4);
  ck('KEEP "Do you know who sent this?" (2nd person)', /Do you know who sent this/.test(out.keep_you));
  ck('KEEP "Should we run?" (plural)', /Should we run/.test(out.keep_we));
  ck('KEEP "could stay or leave" (not a question)', /could stay or leave/.test(out.keep_or_stmt));
  ck('WIDGET intact (demand/hint question survives)', /Say it plainly — or let it show without words\?/.test(out.widget_safe) && /<<MICRO_EXPRESSION>>/.test(out.widget_safe), out.widget_safe.slice(0,120));
  ck('WIDGET GR-shaped question intact ("Is this the work — or him?")', /Is this the work — or him\?/.test(out.widget_gr_safe), out.widget_gr_safe.slice(0,120));
  ck('widget+leak: leak removed, widget kept', !/Do I run or stay/.test(out.widget_plus_leak) && /Say it plainly/.test(out.widget_plus_leak), out.widget_plus_leak.slice(0,120));
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== AXIS-SHAPE SCRUB LOGIC ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,90)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
