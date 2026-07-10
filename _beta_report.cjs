#!/usr/bin/env node
// Storybound BETA OBSERVATORY REPORT — aggregates sbLogBeta events → per-session summaries + daily
// GREEN/YELLOW/RED verdict + manual-review packets. No UI, no live watching. Zero API.
//   node _beta_report.cjs [events.json]      (default: /tmp/beta_events.json)
// events.json = window._sbBetaExport() output ({session, events:[...]}) OR a raw events array.
const fs = require('fs');
const IN = process.argv[2] || '/tmp/beta_events.json';

function load(p){ try{ const j=JSON.parse(fs.readFileSync(p,'utf8')); return Array.isArray(j)?j:(j.events||[]); }catch(e){ console.error('cannot read '+p+': '+e.message); process.exit(1); } }
const events = load(IN);
if(!events.length){ console.log('No beta events found in '+IN); process.exit(0); }

// group by session
const bySession = {};
for(const e of events){ (bySession[e.sid]=bySession[e.sid]||[]).push(e); }

function sceneExcerpt(text){ return String(text||'').replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim().slice(0,180); }

function summarize(sid, evs){
  const by=n=>evs.filter(e=>e.ev===n);
  const sceneFails=by('scene_generation_failed').length;
  const scenesGen=by('scene_generation_completed').length;
  // INFERRED debit/scene mismatch (the #1 money monitor): a SCENE-context debit that succeeded with NO scene
  // completion at-or-after it in the stream = user charged, no scene delivered. Temporal (not index-exact) so
  // it's robust to sceneIndex offset between the debit site and the completion site.
  const _sorted=evs.slice().sort((a,b)=>a.ts-b.ts);
  let inferredDebitAnom=0;
  by('fortune_debit_succeeded').filter(e=>(e.p&&e.p.context)==='scene').forEach(deb=>{
    const delivered=_sorted.some(e=>e.ts>=deb.ts && e.ev==='scene_generation_completed');
    if(!delivered) inferredDebitAnom++;
  });
  const s={
    sessionId:sid, userIdHash:(evs[0]&&evs[0].uh)||'?',
    startedAt:evs[0].ts, endedAt:evs[evs.length-1].ts,
    storyId:(evs.find(e=>e.p&&e.p.storyId)||{p:{}}).p.storyId||null,
    mode:(evs.find(e=>e.p&&e.p.fateMode)||{p:{}}).p.fateMode||'original',
    scenesGenerated:scenesGen,
    maxSceneReached:Math.max(0,...evs.map(e=>(e.p&&(e.p.sceneIndex||e.p.turnCount))||0)),
    generationFailures:sceneFails,
    stuckSpinnerCount:by('spinner_timeout').length,
    duplicateSubmitBlocked:by('duplicate_submit_blocked').length,
    refreshed:by('page_refreshed_resume_attempted').length>0||by('library_resume_clicked').length>0,
    resumedSuccessfully:by('story_resumed').length>0,
    resumeFailed:by('page_refreshed_resume_attempted').length>0,  // emitted only when load returned null
    previewStopReached:by('preview_stop_shown').length>0,
    continuationShown:by('continuation_prompt_shown').length>0,
    subscriptionLockShown:by('subscription_lock_shown').length>0,
    fortuneDebits:by('fortune_debit_succeeded').length,
    debitAnomalies:by('debit_without_scene_detected').length+by('scene_without_expected_debit_detected').length+inferredDebitAnom,
    modeLeakGuardTriggered:by('mode_leak_guard_triggered').length+by('stale_flag_suppressed').length,
    qualityWarnings:by('scene_quality_scan_warn').length,
    qualityFailures:by('scene_quality_scan_fail').length,
    inventedProperNouns:evs.filter(e=>/scene_quality_scan/.test(e.ev)).reduce((a,e)=>a.concat((e.p&&e.p.inventedProperNouns)||[]),[]),
    abandonedAt:evs[evs.length-1].ev,
    requiresManualReview:false, manualReviewReasons:[]
  };
  const R=s.manualReviewReasons;
  if(s.generationFailures) R.push('scene_generation_failed');
  if(s.stuckSpinnerCount) R.push('stuck_spinner');
  if(s.debitAnomalies) R.push('debit_anomaly');
  if(s.duplicateSubmitBlocked>1) R.push('duplicate_submit_blocked_multiple');
  if(s.resumeFailed) R.push('resume_failed');
  if(s.qualityFailures) R.push('scanner_fail');
  if(s.inventedProperNouns.length) R.push('invented_proper_nouns');
  s.requiresManualReview=R.length>0;
  return s;
}

const sessions = Object.entries(bySession).map(([sid,evs])=>summarize(sid,evs));

// ── aggregate ──
const N=sessions.length;
const users=new Set(sessions.map(s=>s.userIdHash)).size;
const stories=sessions.filter(s=>s.scenesGenerated>0||s.storyId).length;
const scenes=sessions.reduce((a,s)=>a+s.scenesGenerated,0);
const genFail=sessions.reduce((a,s)=>a+s.generationFailures,0);
const genTotal=scenes+genFail;
const failRate=genTotal?(genFail/genTotal):0;
const resumeAttempts=sessions.filter(s=>s.refreshed).length;
const resumeOk=sessions.filter(s=>s.resumedSuccessfully).length;
const resumeFail=sessions.filter(s=>s.resumeFailed).length;
const dupBlocked=sessions.reduce((a,s)=>a+s.duplicateSubmitBlocked,0);
const debitAnom=sessions.reduce((a,s)=>a+s.debitAnomalies,0);
const previewStops=sessions.filter(s=>s.previewStopReached).length;
const contShown=sessions.filter(s=>s.continuationShown).length;
const stuck=sessions.reduce((a,s)=>a+s.stuckSpinnerCount,0);
const qWarn=sessions.reduce((a,s)=>a+s.qualityWarnings,0);
const qFail=sessions.reduce((a,s)=>a+s.qualityFailures,0);
const manual=sessions.filter(s=>s.requiresManualReview);
const abandon={}; sessions.forEach(s=>{ abandon[s.abandonedAt]=(abandon[s.abandonedAt]||0)+1; });
const topAbandon=Object.entries(abandon).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>k+' ('+v+')').join(', ');

// ── verdict ──
let verdict='GREEN', reasons=[];
if(debitAnom>0){ verdict='RED'; reasons.push(debitAnom+' debit anomaly(ies)'); }
if(resumeFail>0){ verdict='RED'; reasons.push(resumeFail+' resume failure(s)'); }
if(stuck>0){ verdict='RED'; reasons.push(stuck+' stuck spinner(s)'); }
if(genFail>=2 || failRate>0.15){ verdict='RED'; reasons.push('scene failure rate '+(failRate*100).toFixed(1)+'% ('+genFail+')'); }
if(verdict!=='RED'){
  if(qWarn>0||qFail>0||genFail>0||dupBlocked>0||manual.length>0){ verdict='YELLOW';
    if(qFail) reasons.push(qFail+' scanner fail(s)');
    if(qWarn) reasons.push(qWarn+' scanner warn(s)');
    if(genFail) reasons.push(genFail+' recoverable gen failure');
    if(dupBlocked) reasons.push(dupBlocked+' duplicate-submit(s) blocked (handled)');
    if(manual.length) reasons.push(manual.length+' session(s) need manual review');
  }
}

const pad=(l,v)=>((l+' ..........................').slice(0,28))+' '+v;
console.log('\nBETA OBSERVATORY REPORT');
console.log('='.repeat(48));
console.log(pad('Window', new Date(Math.min(...sessions.map(s=>s.startedAt))).toISOString().slice(0,16)+' → '+new Date(Math.max(...sessions.map(s=>s.endedAt))).toISOString().slice(11,16)));
console.log(pad('Sessions', N));
console.log(pad('Unique users', users));
console.log(pad('Stories started', stories));
console.log(pad('Scenes generated', scenes));
console.log(pad('Scene failure rate', (failRate*100).toFixed(1)+'% ('+genFail+'/'+genTotal+')'));
console.log(pad('Avg scenes/story', stories?(scenes/stories).toFixed(1):'0'));
console.log(pad('Refresh/resume attempts', resumeAttempts+ ' (ok '+resumeOk+', failed '+resumeFail+')'));
console.log(pad('Duplicate submits blocked', dupBlocked));
console.log(pad('Debit anomalies', debitAnom));
console.log(pad('Preview stops shown', previewStops));
console.log(pad('Continuation prompts', contShown));
console.log(pad('Stuck spinners', stuck));
console.log(pad('Mode-leak guard fired', sessions.reduce((a,s)=>a+s.modeLeakGuardTriggered,0)+' (suppressed = good)'));
console.log(pad('Quality warnings', qWarn));
console.log(pad('Quality failures', qFail));
console.log(pad('Top abandonment', topAbandon||'—'));
console.log(pad('Manual-review sessions', manual.length));
console.log('\nVerdict: '+verdict+(reasons.length?('  —  '+reasons.join('; ')):''));

// ── manual-review packets ──
if(manual.length){
  console.log('\n'+'─'.repeat(48)+'\nMANUAL-REVIEW PACKETS ('+manual.length+')');
  manual.forEach(s=>{
    const evs=bySession[s.sessionId];
    const rel=evs.filter(e=>/fail|anomaly|blocked|leak|resume|scan_(warn|fail)|spinner_timeout/.test(e.ev)).slice(-6);
    console.log('\n• Session '+s.sessionId+'  user '+s.userIdHash);
    console.log('  Story: '+(s.storyId||'—')+'  Mode: '+s.mode+'  Scenes: '+s.scenesGenerated+'  Abandoned@: '+s.abandonedAt);
    console.log('  Reasons: '+s.manualReviewReasons.join(', '));
    if(s.inventedProperNouns.length) console.log('  Invented nouns: '+JSON.stringify(s.inventedProperNouns.slice(0,8)));
    console.log('  Events: '+rel.map(e=>e.ev+(e.p&&e.p.sceneIndex?('#'+e.p.sceneIndex):'')).join(' · '));
    const likely = s.debitAnomalies?'BILLING (debit/scene mismatch)': s.resumeFailed?'PERSISTENCE (resume)': s.stuckSpinnerCount?'GENERATION (timeout)': s.qualityFailures?'PROSE QUALITY (scanner)':'REVIEW';
    console.log('  Likely root: '+likely);
  });
}
console.log('');
process.exit(verdict==='RED'?2:0);
