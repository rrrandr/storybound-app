import fs from 'fs';
const s=fs.readFileSync('public/app.js','utf8');
const grab=(n)=>{const i=s.search(new RegExp('function\\s+'+n+'\\b')); if(i<0)return null;
  let d=0,e=i; for(let k=s.indexOf('{',i);k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d){e=k+1;break;}}}
  return s.slice(i,e);};
const src=grab('_authorMode')+'\n'+grab('buildLiteraryCraftDirective');
// stub the globals buildLiteraryCraftDirective touches
const run=(state)=>{
  const fn=new Function('window','state','navigator','_state', src+
    '\nreturn buildLiteraryCraftDirective();');
  try { return fn({state},state,{language:'en-US',languages:['en-US']},state).length; }
  catch(e){ return 'ERR: '+e.message.slice(0,60); }
};
const fantasy={picks:{world:'Fantasy',worldSubtype:'arcane_binding'},turnCount:5};
const modern ={picks:{world:'billionaire',worldSubtype:'billionaire_modern'},turnCount:5};
console.log('literaryCraft output size:');
console.log('  ROMANTASY (Fatelands)          : '+run(fantasy));
console.log('  CONTEMPORARY_ROMANCE (Modern)  : '+run(modern));
