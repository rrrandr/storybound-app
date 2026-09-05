// OVERCOMPENSATION as the primitive (Roman 2026-08-04). First OBSERVABLE (non-diagnostic) primitive. Test the
// pattern-to-preserve: generate the observable OVERCOMPENSATION (faintly embarrassing, common, NOT cinematic),
// then let the narrator compress it into an OPINION (décolletage-style), reader infers the wound. Inverted
// question (keeps OUTPUT behavioral, diagnosis stays hidden input). 5 masks — check: (a) faintly-embarrassing
// not cinematic, (b) DIFFERENTIATED by mask (unlike homogeneous wounds), (c) judgment hits décolletage register.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const MASKS = {
  SPELLBINDER:  'draws people in, makes everyone feel chosen and special',
  ARMORED_FOX:  'deflects with humor, keeps everyone at arm\'s length',
  DARK_VICE:    'reads every room as leverage, needs to feel in control',
  HEART_WARDEN: 'takes care of everyone, cannot let anyone take care of her',
  OPEN_VEIN:    'feels everything at full volume, terrible at hiding it',
};

const SYS = 'You build characters for commercial fiction. For the person below, answer TWO questions — keep BOTH answers strictly BEHAVIORAL: no diagnosis, no naming feelings, no "because".\n\n(a) OVERCOMPENSATION — ONE slightly embarrassing, completely COMMON habit this person has that quietly gives away what they are trying too hard NOT to be. A specific small thing they DO — the faintly pathetic kind everyone has seen (models: "reads every text twice before sending", "always volunteers to drive", "pretends they weren\'t hungry", "corrects tiny factual errors"). NOT a cinematic flaw ("never trusts anyone", "pushes everyone away").\n\n(b) JUDGMENT — the narrator\'s ONE-sentence introduction that compresses that habit into an OPINION: a verdict with attitude, letting the reader infer the rest (models: "She collected thank-yous the way other people collected money.", "Jess made her entrance, as always leading with her décolletage."). Do NOT state the psychology; the reader does that work.\n\nReturn EXACTLY:\nOVERCOMPENSATION: <one specific habit>\nJUDGMENT: <one sentence>';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const mask of Object.keys(MASKS)) {
    const user = 'The person: ' + MASKS[mask] + '.';
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 120 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 15 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS, user });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[mask] = o;
    console.error('\n===== ' + mask + ' =====\n' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync(DIR + '/overcompensation.json', JSON.stringify(out, null, 2));
  console.error('\nDONE overcompensation'); await browser.close(); process.exit(0);
})().catch(e => { console.error('OC-ERR', e.message); process.exit(1); });
