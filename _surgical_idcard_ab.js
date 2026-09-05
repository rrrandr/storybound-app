// SURGICAL IDENTITY-CARD A/B — isolates #4 perfectly: the SAME drifted-Kesh source + the SAME mask,
// repaired via the REAL Klein path (window.callBFLKontext + _BFL_KLEIN) BOTH ways — card OFF (text only)
// vs card ON (+ a clean canonical Kesh as the authoritative identity). Only the card differs.
// Question: does conditioning on the identity card pull the repair toward Kesh's canonical identity?
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const E2E = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/e2e';
const IDB = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/80c638ef-dc45-46dc-ad83-43ad5d0e1a40/scratchpad/idbench';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/80c638ef-dc45-46dc-ad83-43ad5d0e1a40/scratchpad';
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const TARGET = b64(path.join(IDB, 'B_on_panel0.png'));   // green, barbel-faced, drifted Kesh (repair target)
const CARD = b64(path.join(E2E, 'scene1_img2.png'));     // clean ember canonical Kesh (identity card)
// mask over the drifted Kwisheen's head + upper torso (right-center of the wide panel)
const BBOX = [0.46, 0.02, 0.36, 0.55];
const MODEL = 'flux-2-klein-9b-preview';
const PROMPT = 'Repaint ONLY the masked region so the Kwisheen has its canonical appearance: EMBER RED-ORANGE skin with a fine reticulated scale pattern; a scaled HUMANOID Kwisheen face — a clear brow, a nose, and a lipped mouth on a defined jaw, with NO barbels / tentacles / feelers around the mouth or chin; amber eyes with a horizontal capsule pupil; a mane of tentacle-dreadlocks. Keep the pose, gesture, framing, lighting, background, and the OTHER figure unchanged. Seamless edges, no visible boundary. Do NOT add or remove figures.';
const ID_CARD = ' The SECOND image shows THIS Kwisheen\'s AUTHORITATIVE IDENTITY — maintain that same individual\'s ember colouring, scaled humanoid face, mane and features while repainting only the masked region to conform to it. Do NOT copy the reference\'s pose, framing, or background — only the character\'s identity.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window.callBFLKontext === 'function' && typeof window._buildKleinMaskFromBbox === 'function', { timeout: 40000 });

  const res = await page.evaluate(async ({ TARGET, CARD, BBOX, MODEL, PROMPT, ID_CARD }) => {
    const mask = window._buildKleinMaskFromBbox(BBOX);
    if (!mask) return { err: 'mask build failed' };
    const norm = r => !r ? null : (r.startsWith('http') || r.startsWith('data:')) ? r : 'data:image/png;base64,' + r;
    let off = null, on = null, offErr = null, onErr = null;
    try { off = norm(await window.callBFLKontext(PROMPT, '1024x1024', 90000, null, null, null, [TARGET], MODEL, mask)); }
    catch (e) { offErr = e && e.message; }
    try { on = norm(await window.callBFLKontext(PROMPT + ID_CARD, '1024x1024', 90000, null, null, null, [TARGET, CARD], MODEL, mask)); }
    catch (e) { onErr = e && e.message; }
    return { off, on, offErr, onErr };
  }, { TARGET, CARD, BBOX, MODEL, PROMPT, ID_CARD });

  const save = (u, name) => { if (u && u.startsWith('data:')) { fs.writeFileSync(path.join(OUT, name), Buffer.from(u.split(',')[1], 'base64')); return 'saved'; } return 'MISSING'; };
  console.log('\n  SURGICAL IDENTITY-CARD A/B (same source + mask; only the card differs)');
  console.log('  ' + '─'.repeat(64));
  console.log('  card OFF (text only):        ' + (res.offErr ? 'ERR ' + res.offErr : save(res.off, 'surg_OFF.png')));
  console.log('  card ON  (+ identity card):  ' + (res.onErr ? 'ERR ' + res.onErr : save(res.on, 'surg_ON.png')));
  console.log('  reference card: e2e/scene1_img2.png (clean ember Kesh) | target: idbench/B_on_panel0.png (green drifted Kesh)');
  console.log('  → compare surg_OFF.png vs surg_ON.png against the reference: which restored Kesh\'s ember identity better?');
  console.log('  ' + '─'.repeat(64) + '\n');
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
