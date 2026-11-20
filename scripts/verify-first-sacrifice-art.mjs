// Static approved artwork contract. No image or story provider is called.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function pkg(src){const c={window:{},console};vm.createContext(c);vm.runInContext(src,c);return c.window._bakedScene1For('starter_first_sacrifice');}
const baseline=pkg(execFileSync('git',['show','c86db5de:public/starter-scenes.js'],{cwd:root,encoding:'utf8'})),current=pkg(fs.readFileSync(root+'public/starter-scenes.js','utf8'));
assert.equal(JSON.stringify(current.beats.map(b=>b.text)),JSON.stringify(baseline.beats.map(b=>b.text)));console.log('PASS all 21 authored text beats remain byte-for-byte unchanged');
const record=JSON.parse(fs.readFileSync(root+'design/first-sacrifice/opening-assets.json','utf8'));
assert.equal(current.imageAssets.length,5);assert.equal(record.assetsV2.length,5);
for(const asset of current.imageAssets){assert.match(asset.url,/-v2\.png$/);const entry=record.assetsV2.find(x=>x.path==='public'+asset.url);assert.ok(entry,asset.id);assert.equal(sha(fs.readFileSync(root+entry.path)),entry.sha256,asset.id);}
assert.equal(sha(fs.readFileSync(root+'public/assets/First-Sacrifice/julian-v2.png')),record.approvedJulianSha256);console.log('PASS all five package assets match the reviewed artwork; Julian is exactly the approved waist crop');
for(const b of current.beats){const occ=current.imageOccurrences[b.image];assert.ok(occ,b.image);assert.ok(current.imageAssets.some(x=>x.id===occ.assetId));}
assert.equal(current.beats[11].image,'d3');assert.equal(current.beats[12].image,'d3');assert.equal(record.sceneReactions.d3,'covering removed; angry accusing crowd');assert.equal(record.sceneReactions.d4,'covering removed; crowd still angry and accusing; Julian protective');console.log('PASS artwork switches to the uncovered, accusing crowd when the covering is removed');
const visuals=JSON.parse(JSON.stringify((await import('../public/first-favored-visuals.js')).default));assert.match(visuals.attire,/ADULT FIRST FAVORED/);assert.match(visuals.attire,/fully OPAQUE/);assert.match(visuals.veilwood,/PAIRS of TWO slender stalks/);console.log('PASS wardrobe and paired botany directions retain their distinct adult and child requirements');
console.log('4/4 artwork groups passed. No provider called.');
