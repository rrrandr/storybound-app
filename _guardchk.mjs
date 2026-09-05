import fs from 'fs';
const lines=fs.readFileSync('public/app.js','utf8').split('\n');
let bad=[];
lines.forEach((l,i)=>{
  const code=l.replace(/\/\/.*$/,'');                 // strip trailing comment
  if(/\)\s*var __rp_/.test(code)) bad.push(i+1);      // same-line only
  if(/\belse\s+var __rp_/.test(code)) bad.push(i+1);
});
console.log(bad.length ? '❌ GUARD DETACHMENT at lines '+bad.slice(0,6) : '✅ NO GUARD DETACHMENT (same-line, comment-stripped)');
