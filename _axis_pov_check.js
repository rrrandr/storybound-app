const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**','**/api/bfl-kontext**','**/api/gemini-proxy**','**/api/chatgpt-proxy**','**/api/anthropic-proxy**','**/api/mistral-proxy**','**/api/grok-image**','**/api/visualize-flux**'];
(async () => {
  const b = await chromium.launch({ headless: true });
  const pg = await (await b.newContext()).newPage();
  for (const p of BLOCK) await pg.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await pg.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pg.waitForFunction(() => typeof window._validateAndNormalizeCGPlan === 'function' && typeof window._povNormalizeAxis === 'function', { timeout: 40000 });
  const R = await pg.evaluate(() => {
    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male'; s.picks = { pov: '1st', identity:{playerName:'Mira',partnerName:'Vael'} };
    s.archetype = { liGender: 'male' }; s.liGender = 'male';
    // direct normalizer on the leaked 3rd-person axis
    const before = 'She meets the raider’s eyes and says she won’t die here — or lets her drawn knife say it?';
    const after = window._povNormalizeAxis(before, s);
    // through the plan validator (author-emitted 3rd-person microDecision)
    const beats = []; for (let i=0;i<20;i++) beats.push({idx:i,kind:'narration',speaker:null,text:'b'+i,cut_to_closeup:false,expression_target:'neutral'});
    const plan = { beats, phases:[{phaseIdx:0,startBeat:0,characters_present:['protagonist'],li_visibility_phase:'absent'}], visualState:{background:'x',li_visibility:'absent',_phaseLIAbsent:true}, decisionGateBeatIdx:18,
      microDecision: { afterBeat: 5, prompt: 'She says she is done — or lets her silence say it?', options:[{text:'She says it',signal:'direct+'},{text:'She lets it show',signal:'subtle+'}] },
      phaseForBeat: function(){return this.phases[0];} };
    const np = window._validateAndNormalizeCGPlan(plan,0)||plan;
    const md = np.microDecision||{};
    return { after, mdPrompt: md.prompt, optA: md.options&&md.options[0]&&md.options[0].text };
  });
  await b.close();
  const checks = [
    ['direct axis normalized to first person (no "She/her" self-ref)', /\bI\b|\bmy\b/i.test(R.after) && !/\bShe\b/.test(R.after)],
    ['author microDecision.prompt normalized to first person', /\bI\b/.test(R.mdPrompt) && !/\bShe\b/.test(R.mdPrompt)],
    ['option text normalized ("She says it" -> "I say it")', /\bI\b/.test(R.optA) && !/\bShe\b/.test(R.optA)],
  ];
  let pass=0,fail=0;
  console.log('\n  AXIS POV NORMALIZE ($0)\n  ' + '-'.repeat(50));
  for (const [n,ok] of checks){ ok?pass++:fail++; console.log('  '+(ok?'✓':'✗')+' '+n); }
  console.log('  · after: ' + R.after);
  console.log('  · md.prompt: ' + R.mdPrompt);
  console.log('  ' + '-'.repeat(50) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
