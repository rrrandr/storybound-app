import fs from 'fs';
const s=fs.readFileSync('public/app.js','utf8');
// lift the two functions out of the IIFE and evaluate them standalone
const grab=(name)=>{const i=s.search(new RegExp('function\\s+'+name+'\\b')); let d=0,e=i;
  for(let k=s.indexOf('{',i);k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d){e=k+1;break;}}}
  return s.slice(i,e);};
const src=grab('_authorMode')+'\n'+grab('_buildAuthorFloorDirective');
const mk=new Function('window', src + '\nreturn [_authorMode,_buildAuthorFloorDirective];');
const [mode,floor]=mk({state:{}});
const cases=[
  ['Fatelands  (Fantasy/arcane_binding)', {picks:{world:'Fantasy',worldSubtype:'arcane_binding'}}],
  ['Modern     (billionaire_modern)',     {picks:{world:'billionaire',worldSubtype:'billionaire_modern'}}],
  ['override → CONTEMPORARY on Fantasy',  {picks:{world:'Fantasy'},_authorModeOverride:'CONTEMPORARY_ROMANCE'}],
  ['override → ROMANTASY on Modern',      {picks:{world:'billionaire'},_authorModeOverride:'ROMANTASY'}],
];
console.log('MODE ROUTING');
cases.forEach(([label,st])=>console.log('  '+label.padEnd(38)+mode(st)));
console.log('\nFLOOR CONTENT (Fatelands)');
const f=floor({picks:{world:'Fantasy',worldSubtype:'arcane_binding'}});
['INTERIORITY DECODES','ASSIGNED EVENT IS ACTION','THE SCENE ENDS SOMEWHERE ELSE','MODE: ROMANTASY']
  .forEach(k=>console.log('  '+(f.includes(k)?'present ':'ABSENT  ')+k));
console.log('  MODE: CONTEMPORARY leaked? '+(f.includes('CONTEMPORARY')?'YES ❌':'no ✅'));
console.log('  floor size: '+f.length+' chars (~'+Math.round(f.length/4)+' tokens)');
const m=floor({picks:{world:'billionaire',worldSubtype:'billionaire_modern'}});
console.log('\nFLOOR CONTENT (Modern)');
console.log('  MODE: CONTEMPORARY ROMANCE '+(m.includes('MODE: CONTEMPORARY ROMANCE')?'present ✅':'ABSENT ❌'));
console.log('  ROMANTASY leaked? '+(m.includes('MODE: ROMANTASY')?'YES ❌':'no ✅'));
console.log('  floor size: '+m.length+' chars');
