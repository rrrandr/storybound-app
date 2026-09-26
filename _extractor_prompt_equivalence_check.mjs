// Exact comparison: the CURRENT builder's messages vs the RETAINED original request. $0, no dispatch.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const D = path.join(__dirname, '_tempt_fate_fixtures', 'extractor_only_2026-09-24_08-00-42');

let orig = null;
for (const line of fs.readFileSync(path.join(D, 'gate.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const e = JSON.parse(line);
  if (e.kind === 'dispatch' && e.requestBody) { orig = e.requestBody; break; }
}
if (!orig) { console.error('no retained request body'); process.exit(2); }
const oMsgs = orig.messages || [];
const oSys = String((oMsgs.find((m) => m.role === 'system') || {}).content || '');
const oUsr = String((oMsgs.find((m) => m.role === 'user') || {}).content || '');
console.log('ORIGINAL request fields:');
for (const k of Object.keys(orig)) if (k !== 'messages') console.log('  ' + k + ' = ' + JSON.stringify(orig[k]));
console.log('  messages: ' + oMsgs.length + '  sysLen=' + oSys.length + '  usrLen=' + oUsr.length);

const ctxFile = JSON.parse(fs.readFileSync(path.join(D, 'extraction_context.json'), 'utf8'));
const ctx = ctxFile.ctx || ctxFile;

const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
await p.waitForFunction(() => window._tfoBuildExtractorPrompt, { timeout: 25000 });
const cur = await p.evaluate((c) => { const x = window._tfoBuildExtractorPrompt(c); return { sys: x.sys, usr: x.usr }; }, ctx);
await b.close();

const firstDiff = (a, c) => { const n = Math.min(a.length, c.length); for (let i = 0; i < n; i++) if (a[i] !== c[i]) return i; return a.length === c.length ? -1 : n; };
for (const [name, o, n] of [['SYSTEM', oSys, cur.sys], ['USER', oUsr, cur.usr]]) {
  const same = o === n;
  console.log('\n' + name + ': ' + (same ? 'IDENTICAL' : 'DIFFERENT') + '   original=' + o.length + '  current=' + n.length);
  if (!same) {
    const i = firstDiff(o, n);
    console.log('  first divergence at char ' + i);
    console.log('  original: …' + JSON.stringify(o.slice(Math.max(0, i - 60), i + 90)));
    console.log('  current : …' + JSON.stringify(n.slice(Math.max(0, i - 60), i + 90)));
  }
}
process.exit(0);
