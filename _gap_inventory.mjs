import fs from 'fs'; import * as acorn from 'acorn';
const src=fs.readFileSync('public/app.js','utf8');
const ast=acorn.parse(src,{ecmaVersion:'latest',locations:true,ranges:true,allowReturnOutsideFunction:true});
// span between the AST-instrumented window end and the FINAL_PROSE endpoint
const fpLine=src.slice(0,src.indexOf("site:'FINAL_PROSE'")).split('\n').length;
const LO=285750, HI=fpLine;
console.log('gap span: lines %d..%d (FINAL_PROSE at %d)', LO, HI, fpLine);
const hits=[];
(function w(n){ if(!n||typeof n.type!=='string') return;
  if(n.type==='AssignmentExpression'&&n.left.type==='Identifier'&&n.left.name==='raw'
     &&n.loc.start.line>=LO&&n.loc.start.line<=HI){
    const line=src.split('\n')[n.loc.start.line-1];
    hits.push({line:n.loc.start.line, instrumented:/__rawPrev_|__rp_/.test(line)||/__rawPrev_|__rp_/.test(src.split('\n')[n.loc.start.line-2]||''),
               text:line.trim().slice(0,95)});
  }
  for(const k of Object.keys(n)){ if(k==='loc'||k==='range') continue; const v=n[k];
    if(Array.isArray(v)) v.forEach(c=>c&&typeof c.type==='string'&&w(c));
    else if(v&&typeof v.type==='string') w(v); } })(ast);
console.log('authoritative raw assignments in gap: %d  (uninstrumented: %d)',
  hits.length, hits.filter(h=>!h.instrumented).length);
hits.filter(h=>!h.instrumented).slice(0,10).forEach(h=>console.log('   ❌ %d: %s', h.line, h.text));
