// OFFLINE RESCORE of the saved probe artifacts — zero network, zero cost.
// The inline scorecard in _planner_probe3.mjs was stale: it read only plan.scene_skeleton (missing
// a lifted nested one) and grounded E+ against setting+present only (missing narrator). This
// rescores the SAME saved responses using the product's own stage contract and grounding rule.
import { chromium } from 'playwright-core';
import fs from 'fs';

const DIR = '_planner_probe3';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', r => /\/api\/(config|geo)\b/.test(r.request().url()) ? r.continue() : r.abort());
await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await page.waitForFunction(() => window.state && window._scene1StageContract, { timeout:120000 });

const stages = await page.evaluate(() => {
  const mk = (patch) => {
    const c = window._scene1StageContract(Object.assign({
      pov:'first_person', name:'Lirael', playerName:'Lirael', identity:{playerName:'Lirael'},
      loveInterestName:'Julian', partnerName:'Julian' }, patch));
    return { ok:c.ok, setting:c.setting, groundText:c.groundText,
             onStage:(c.onStage||[]).map(r => ({ id:r.id, label:r.label, aliases:r.aliases })),
             offStage:(c.offStage||[]).map(r => r.name) };
  };
  return {
    seeded: mk({ _starterId:'starter_first_sacrifice' }),
    corridor: mk({ _scene1Mission:'She waits alone in the customs house before the tide turns, rehearsing what she will say to Julian when he finally comes to collect the debt' }),
  };
});

// The product's own in-scene rule.
const inScene = await page.evaluate(() => (t, g) => window._targetInScene(t, g)) && null;
async function grounded(target, ground) {
  return await page.evaluate(([t, g]) => window._targetInScene(t, g), [target, ground]);
}

const MODES = ['seeded', 'seeded', 'corridor'];
const rows = [];
for (let i = 1; i <= 3; i++) {
  const raw = fs.readFileSync(`${DIR}/sample${i}_response.json`, 'utf8');
  const verdict = JSON.parse(fs.readFileSync(`${DIR}/sample${i}_verdict.json`, 'utf8'));
  const env = JSON.parse(raw);
  const c = env.choices[0].message.content;
  const plan = JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1));
  const spine = plan.opening_spine || plan;
  // Accept the skeleton wherever it legitimately is — the product lifts a nested one.
  const skel = plan.scene_skeleton || (plan.opening_spine && plan.opening_spine.scene_skeleton) || null;
  const st = stages[MODES[i - 1]];
  const lc = x => String(x || '').toLowerCase();

  const cp = (skel && Array.isArray(skel.character_plus)) ? skel.character_plus : [];
  // Resolve each recipient through the SAME alias sets the product uses.
  const resolve = (n) => (st.onStage.find(r => (r.aliases || [r.label]).some(a => lc(a) === lc(n))) || null);
  const resolved = cp.map(c2 => ({ given: c2.character, rec: resolve(c2.character) }));
  const offLc = st.offStage.map(lc);

  const settingKept = MODES[i-1] === 'corridor'
    ? !!(spine && spine.opening_setting)          // planner owns it; any coherent choice is valid
    : await grounded(String(spine.opening_setting || ''), st.groundText);
  const noOffstage = !resolved.some(r => !r.rec && offLc.includes(lc(r.given)))
    && !(skel && skel.fusion && skel.fusion.character && offLc.includes(lc(skel.fusion.character)));
  const coveredIds = new Set(resolved.filter(r => r.rec).map(r => r.rec.id));
  const oneEach = MODES[i-1] === 'corridor'
    ? null                                        // planner owns presence; roster not fixed up front
    : (st.onStage.every(r => coveredIds.has(r.id)) && resolved.every(r => r.rec) && cp.length === st.onStage.length);
  const epCanonical = skel && skel.environment_plus && skel.environment_plus.target
    ? await grounded(skel.environment_plus.target, st.groundText) : false;
  const fusionOk = !!(skel && skel.fusion && skel.fusion.character && skel.fusion.target && skel.fusion.beat);
  const angleRej = (verdict.angleRejections || []).length > 0;

  rows.push({ i, mode: MODES[i-1], settingKept, noOffstage, oneEach, epCanonical, fusionOk,
              angleRej, accepted: !verdict.fatal, fatal: verdict.fatal,
              aliasUsed: resolved.filter(r => r.rec && lc(r.given) !== lc(r.rec.label))
                                 .map(r => `${r.given}→${r.rec.label}`),
              usage: verdict.usage, cost: verdict.cost });
}
await browser.close();

const m = v => v === null ? ' n/a ' : (v ? '  ✓  ' : '  ✗  ');
console.log(`\n${'═'.repeat(96)}\nRESCORED (offline, product rules, zero cost)\n${'═'.repeat(96)}\n`);
console.log(' # | mode     | setting | no offstage | one C+ each | E+ grounded | fusion | angle rej | VALIDATION');
for (const r of rows) {
  console.log(` ${r.i} | ${r.mode.padEnd(8)} |  ${m(r.settingKept)}  |    ${m(r.noOffstage)}    |    ${m(r.oneEach)}    |    ${m(r.epCanonical)}    | ${m(r.fusionOk)} |   ${r.angleRej ? 'YES' : 'none'}    | ${r.accepted ? 'ACCEPTED' : 'REJECTED'}`);
}
console.log('');
for (const r of rows) {
  if (r.aliasUsed.length) console.log(` sample ${r.i} alias resolutions: ${r.aliasUsed.join(', ')}`);
  if (!r.accepted) console.log(` sample ${r.i} rejection: ${r.fatal}`);
}
const total = rows.reduce((a, r) => a + (r.cost || 0), 0);
console.log(`\n total tokens: ${rows.map(r => `${r.usage.prompt_tokens}/${r.usage.completion_tokens}`).join('  ')}`);
console.log(` total spend : $${total.toFixed(5)}\n`);
