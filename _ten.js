// THE LAST HILL (Roman 2026-08-04). Generate TEN one-sentence intros to ONE character, then THROW AWAY every
// one that (a) explains psychology, (b) uses a simile, (c) wants applause, (d) couldn't sit in a commercial
// novel. Survivors teach the register: COMPRESSED OPINION, short, plain, inference-inviting — NOT literary simile.
// Generate NATURALLY (don't pre-teach the filter) so the full range appears and the filter has work to do.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';
const d = JSON.parse(fs.readFileSync(DIR + '/scene_Modern-armoredfox.json', 'utf8'));
const pc = d.pcBodyBible || {}, cr = pc.current_crisis || {};

const SYS = 'You are a novelist introducing a character. Write TEN different one-sentence introductions — the narrator\'s opinionated first impression of her, the sort of line a reader remembers. Vary them widely. Number them 1-10, one sentence each, nothing else.';
const KNOWN = 'The character (Clara): a woman who deflects with humor and keeps everyone at arm\'s length; carries a wound she will not name (a partner left her); right now her private diary is being read aloud in a boardroom by an anonymous source, exposing her; she refuses to ask anyone for help; a habit: she straightens her posture whenever she enters a new room.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  let out = null;
  for (let a = 0; a < 3 && !out; a++) {
    out = await page.evaluate(async ({ sys, user }) => {
      try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: 500 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 40 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS, user: KNOWN });
    if (!out) await new Promise(r => setTimeout(r, 3000));
  }
  fs.writeFileSync(DIR + '/ten.txt', out || '(FAIL)');
  console.error(out || 'FAIL');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('TEN-ERR', e.message); process.exit(1); });
