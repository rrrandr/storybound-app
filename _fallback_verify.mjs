import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext({ viewport:{width:1100,height:800} })).newPage();
let served = null, fell = false;
p.on('console', m => { const t=m.text(); if(/AUTHOR-FALLBACK|GROK-LIT\] author|forced Grok/.test(t)){ console.log('  · '+t.slice(0,150)); if(/AUTHOR-FALLBACK\] served=/.test(t)){ served=(t.match(/served=(\w+)/)||[])[1]; fell=true; } } });
await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
await p.waitForFunction(()=>window.state && typeof window.handleBeginStory==='function', {timeout:30000});
await p.evaluate(()=>{ const s=window.state; s.subscribed=true; s.fortunes=9999999; s.access='sub'; window._devBypass=true; window.__forceHeavyBuild=true; window.__disableSpeculativePreload=true; window._forceDeckMandate=false; window.__forceGrokAuthorFail=true; try{window.generateImageWithFallback=async()=>'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';}catch(_){} window.__capturedPages=[]; const SP=window.StoryPagination; if(SP&&SP.addPage&&!SP.__wrapped){const r=SP.addPage.bind(SP); SP.addPage=function(h,n){try{window.__capturedPages.push(String(h||''));window.__lastPageAt=Date.now();}catch(_){}return r(h,n);};SP.__wrapped=true;} });
console.log('[boot] First Sacrifice with Grok author FORCED TO FAIL — expect Mistral fallback …');
try{ await p.evaluate(async()=>{ const def=(window.STARTER_STORIES||[]).find(d=>d.id==='starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_,r)=>setTimeout(()=>r(new Error('to')),300000))]); }); }catch(e){ console.log('[boot] '+e.message); }
try{ await p.waitForFunction(()=>(window.__capturedPages||[]).length>=1 && (Date.now()-(window.__lastPageAt||0))>10000, {timeout:120000, polling:2000}); }catch(_){}
const pages = await p.evaluate(()=>(window.__capturedPages||[]).length);
console.log('\nVERDICT: fallback fired='+fell+' servedBy='+served+' scenesRendered='+pages+'  → '+((fell && served==='Mistral' && pages>=1)?'✓ Grok failure → Mistral finished the scene. Backup WORKS.':'⚠ check above'));
await b.close(); process.exit(0);
