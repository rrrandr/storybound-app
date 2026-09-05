import fs from 'fs'; import * as acorn from 'acorn';
const src=fs.readFileSync('/tmp/oc_before_earlyexit.js','utf8');
const ast=acorn.parse(src,{ecmaVersion:'latest',locations:true,ranges:true,allowReturnOutsideFunction:true});
const FN=/Function/;
let target=null;
(function w(n,fnChain){
  if(!n||typeof n.type!=='string') return;
  const chain = FN.test(n.type) ? fnChain.concat([{type:n.type,name:(n.id&&n.id.name)||'(anon)',line:n.loc.start.line}]) : fnChain;
  if(n.type==='ReturnStatement' && n.loc.start.line===2576) target=chain.slice();
  for(const k of Object.keys(n)){ if(k==='loc'||k==='range') continue; const v=n[k];
    if(Array.isArray(v)) v.forEach(c=>c&&typeof c.type==='string'&&w(c,chain));
    else if(v&&typeof v.type==='string') w(v,chain); }
})(ast,[]);
console.log('lexical owner chain for the return at 2576:');
(target||[]).slice(-4).forEach(f=>console.log('   '+f.type+' '+f.name+' @'+f.line));
const own=(target||[]).slice(-1)[0];
console.log('\nDIRECT owner: '+(own?own.name+' @'+own.line:'none'));
console.log(own && own.name==='_grokLiteraryAuthor' ? '→ genuine outer exit' : '→ NESTED: not an exit of _grokLiteraryAuthor');
