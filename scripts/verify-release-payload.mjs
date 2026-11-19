// Verify Vercel's actual upload inventory, rather than assuming ignore rules work.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const input=process.argv[2];
assert.ok(input,'Usage: node scripts/verify-release-payload.mjs <vercel-deploy-dry.json>');
const payload=JSON.parse(fs.readFileSync(input,'utf8'));
const files=new Set(payload.files.map(x=>x.path));
const tracked=execFileSync('git',['ls-files','-z','public','api','lib','config','package.json','package-lock.json','vercel.json'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
for(const name of tracked)assert.ok(files.has(name),'Runtime file missing from upload: '+name);
for(const name of files){
 assert.ok(/^(public\/|api\/|lib\/|config\/|package(?:-lock)?\.json$|vercel\.json$|\.vercelignore$)/.test(name),'Unexpected upload: '+name);
 assert.ok(!/(^|\/)\.env(?:\.|$)|(?:^|\/)LATEST$|\.log$|\.bak(?:\.|-|$)/.test(name),'Local artifact in upload: '+name);
}
assert.equal(files.size,payload.fileCount);
console.log(`PASS ${files.size} production files, every tracked runtime dependency included, no local artifacts`);
