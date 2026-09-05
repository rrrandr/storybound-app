// AST instrumenter for the Lane-2 continuation chain. Never regex. Fails closed on unsupported contexts.
import fs from 'fs'; import * as acorn from 'acorn'; import crypto from 'crypto';
const SRC='/tmp/pristine_with_endpoint.js', LO=284100;
const src=fs.readFileSync(SRC,'utf8');
const HI=src.slice(0,src.indexOf("site:'FINAL_PROSE'")).split('\n').length;   // derived, never hand-chosen
console.log('endpoint-derived span: %d..%d', LO, HI);
const ast=acorn.parse(src,{ecmaVersion:'latest',locations:true,ranges:true,allowReturnOutsideFunction:true});
// ── parent map ──
const parent=new Map();
(function walk(n,p){ if(!n||typeof n.type!=='string') return; parent.set(n,p);
  for(const k of Object.keys(n)){ if(k==='loc'||k==='range') continue; const v=n[k];
    if(Array.isArray(v)) v.forEach(c=>c&&typeof c.type==='string'&&walk(c,n));
    else if(v&&typeof v.type==='string') walk(v,n); } })(ast,null);
// ── locate authoritative `raw = …` assignments in the window ──
const targets=[]; const seen={};
(function find(n){ if(!n||typeof n.type!=='string') return;
  if(n.type==='AssignmentExpression'&&n.left.type==='Identifier'&&n.left.name==='raw'
     &&n.loc.start.line>=LO&&n.loc.start.line<=HI){
    let s=n; while(s&&s.type!=='ExpressionStatement') s=parent.get(s);
    const stmtText=src.slice((s||n).range[0],(s||n).range[1]);
    const norm=stmtText.replace(/\s+/g,' ').trim();
    const h=crypto.createHash('sha256').update(norm).digest('hex').slice(0,8);
    seen[h]=(seen[h]||0)+1;
    targets.push({node:n, stmt:s, sid:`${h}#${seen[h]}`, line:n.loc.start.line, parentType:(parent.get(s)||{}).type});
  }
  for(const k of Object.keys(n)){ if(k==='loc'||k==='range') continue; const v=n[k];
    if(Array.isArray(v)) v.forEach(c=>c&&typeof c.type==='string'&&find(c));
    else if(v&&typeof v.type==='string') find(v); } })(ast);
console.log('AST targets found:', targets.length);
const byParent={}; targets.forEach(t=>byParent[t.parentType]=(byParent[t.parentType]||0)+1);
console.log('parent contexts:', JSON.stringify(byParent));
const SUPPORTED=new Set(['BlockStatement','Program','IfStatement','SwitchCase']);
const bad=targets.filter(t=>!t.stmt||!SUPPORTED.has(t.parentType));
if(bad.length){ console.log('UNSUPPORTED contexts:', bad.map(b=>`${b.line}:${b.parentType}`).slice(0,8)); process.exit(2); }
fs.writeFileSync('/tmp/ast_targets.json', JSON.stringify(targets.map(t=>({sid:t.sid,line:t.line,parentType:t.parentType})),null,1));
console.log('✅ all targets in supported contexts — classification saved');

// ── TRANSFORM: edits by character range, applied end-first so offsets stay valid ──
const edits=[];
for(const t of targets){
  const v=t.sid.replace('#','_'), s=t.stmt;
  const before=`var __rp_${v} = raw; `;
  const lm=/raw\s*=\s*\(?await\s+([A-Za-z_][\w$.]*)/.exec(src.slice(s.range[0],s.range[1])) || /raw\s*=\s*([A-Za-z_][\w$.]*)/.exec(src.slice(s.range[0],s.range[1]));
  const lbl=(lm&&lm[1])||'assign';
  const after =` try { if (window.__rawSnap) window.__rawSnap.push({ sid: '${t.sid}', label: '${lbl}', mutationClass: 'model',`
             + ` before: String(__rp_${v}||''), after: String(raw||''),`
             + ` changed: String(raw||'')!==String(__rp_${v}||'') }); } catch (_) {}`;
  if(t.parentType==='IfStatement'){
    // unbraced consequent/alternate → REPLACE with a block; never insert a sibling here
    edits.push({s:s.range[0], e:s.range[1], text:`{ ${before}${src.slice(s.range[0],s.range[1])}${after} }`});
  } else {
    edits.push({s:s.range[0], e:s.range[0], text:before});
    edits.push({s:s.range[1], e:s.range[1], text:after});
  }
}
let out=src;
for(const ed of edits.sort((a,b)=>b.s-a.s || b.e-a.e)) out = out.slice(0,ed.s) + ed.text + out.slice(ed.e);
fs.writeFileSync('/tmp/app_ast_instrumented.js', out);
// ── ROUND-TRIP: strip instrumentation, compare structure + control-flow PARENTAGE ──
let stripped = out
  .replace(/var __rp_[0-9a-f]+_\d+ = raw; /g,'')
  .replace(/ try \{ if \(window\.__rawSnap\) window\.__rawSnap\.push\(\{ sid: '[^']+',[\s\S]*?\}\); \} catch \(_\) \{\}/g,'');
const a2=(()=>{try{return acorn.parse(stripped,{ecmaVersion:'latest',locations:true,ranges:true,allowReturnOutsideFunction:true});}catch(e){console.log('❌ stripped source does not parse:',e.message);return null;}})();
if(!a2) process.exit(2);
function sig(tree){
  const acc=[];
  (function w(n,chain){
    if(!n||typeof n.type!=='string') return;
    if(n.type==='AssignmentExpression'&&n.left.type==='Identifier'&&n.left.name==='raw'){
      acc.push(chain.filter(c=>/If|Try|Switch|Block/.test(c)).join('>'));
    }
    for(const k of Object.keys(n)){
      if(k==='loc'||k==='range') continue;
      const v=n[k];
      if(Array.isArray(v)) v.forEach(c=>{ if(c&&typeof c.type==='string') w(c,chain.concat(n.type)); });
      else if(v&&typeof v.type==='string') w(v,chain.concat(n.type));
    }
  })(tree,[]);
  return acc;
}
const p1=sig(ast), p2=sig(a2);
// Whitelist ONLY the 3 known unbraced-if conversions: each may gain exactly one BlockStatement level.
// Every other chain must be byte-identical. This is an enumerated exception, not a relaxed rule.
const WHITELIST = targets.filter(t=>t.parentType==='IfStatement').map(t=>t.sid);
let exceptionsUsed=0, chainOk = p1.length===p2.length;
if(chainOk){
  for(let i=0;i<p1.length;i++){
    if(p1[i]===p2[i]) continue;
    // permitted: stripped chain equals pristine chain plus one inserted BlockStatement
    // permitted EXACTLY: an unbraced if-consequent gained one BlockStatement level at the tail
    if(p1[i].endsWith('IfStatement') && p2[i]===p1[i]+'>BlockStatement') { exceptionsUsed++; continue; }
    chainOk=false; console.log('  chain mismatch at #'+i+':\n    pristine: '+p1[i]+'\n    stripped: '+p2[i]); break;
  }
}
const cntOf=(t,name)=>(JSON.stringify(t).match(new RegExp('"'+name+'"','g'))||[]).length;
console.log('\n──── ROUND-TRIP VERIFICATION ────');
console.log('  raw-assignment chains : pristine='+p1.length+' stripped='+p2.length
  +'  exceptions-used='+exceptionsUsed+'/'+WHITELIST.length+'  '+(chainOk?'PASS':'FAIL'));
let countsOk=true;
for(const n of ['IfStatement','TryStatement','AwaitExpression','CallExpression']){
  const a=cntOf(ast,n), b=cntOf(a2,n); if(a!==b) countsOk=false;
  console.log(('  '+n).padEnd(24)+': pristine='+a+' stripped='+b+'  '+(a===b?'PASS':'FAIL'));
}
const ok = chainOk && countsOk && exceptionsUsed<=WHITELIST.length;
console.log('\n  '+(ok?'✅ ROUND-TRIP PASS — safe to install':'❌ ROUND-TRIP FAIL — not installing'));
