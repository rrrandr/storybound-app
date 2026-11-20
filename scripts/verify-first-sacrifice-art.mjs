// Restored original artwork plus the two edited reactions. No provider is called.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function pkg(src){const c={window:{},console};vm.createContext(c);vm.runInContext(src,c);return c.window._bakedScene1For('starter_first_sacrifice');}
const baseline=pkg(execFileSync('git',['show','c86db5de:public/starter-scenes.js'],{cwd:root,encoding:'utf8'})),current=pkg(fs.readFileSync(root+'public/starter-scenes.js','utf8'));
assert.equal(JSON.stringify(current.beats.map(b=>b.text)),JSON.stringify(baseline.beats.map(b=>b.text)));console.log('PASS all 21 authored text beats remain byte-for-byte unchanged');
const record=JSON.parse(fs.readFileSync(root+'design/first-sacrifice/opening-assets.json','utf8'));
assert.equal(current.imageAssets.length,6);assert.equal(record.activeAssets.length,6);
for(const asset of current.imageAssets){const entry=record.activeAssets.find(x=>x.path==='public'+asset.url);assert.ok(entry,asset.id);const bytes=fs.readFileSync(root+entry.path);assert.equal(sha(bytes),entry.sha256,asset.id);if(asset.kind==='intro'){assert.match(asset.url,/-v1\.png$/);assert.equal(sha(bytes),sha(execFileSync('git',['show','c86db5de:'+entry.path],{cwd:root,maxBuffer:8*1024*1024})),asset.id+' original bytes');}}
assert.equal(sha(fs.readFileSync(root+'public/assets/First-Sacrifice/julian-v1.png')),record.activeJulianSha256);console.log('PASS all four portraits are the exact original files and all six active assets match their manifest');
for(const b of current.beats){const occ=current.imageOccurrences[b.image];assert.ok(occ,b.image);assert.ok(current.imageAssets.some(x=>x.id===occ.assetId));}
for(const key of ['d1','d2'])assert.equal(current.imageOccurrences[key].assetId,'interaction_sheet_1');for(const key of ['d3','d4'])assert.equal(current.imageOccurrences[key].assetId,'interaction_sheet_reactions');
const originalSheet=current.imageAssets.find(x=>x.id==='interaction_sheet_1');assert.equal(sha(fs.readFileSync(root+'public'+originalSheet.url)),sha(execFileSync('git',['show','c86db5de:public'+originalSheet.url],{cwd:root,maxBuffer:8*1024*1024})));assert.equal(current.beats[11].image,'d3');assert.equal(current.beats[12].image,'d3');console.log('PASS the first two panels use the exact original sheet; only the uncovered final two use the angry-crowd edit');
const visuals=(await import('../public/first-favored-visuals.js')).default;assert.match(visuals.attire,/COVERED TORSO/);assert.match(visuals.attire,/fully OPAQUE/);assert.doesNotMatch(visuals.attire,/semi-transparent gossamer tunic/);console.log('PASS future wardrobe requests restore covered torsos and retain opaque child clothing');
console.log('4/4 artwork groups passed. No provider called.');
