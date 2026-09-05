import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => typeof window._characterWeaponLoadout === 'function' && typeof window._weaponLockForScene === 'function', { timeout: 40000 });
const r = await p.evaluate(() => {
  const out = {};
  // 1) Prose-established named weapon "Fatebane" with properties in the scene text, bound to Kael.
  window.state._weaponLedger = {};
  const scene1 = 'Kael raised the Fatebane — a black-bladed longsword whose edge weeps shadow — as the guards closed in. "He\'s wielding the Fatebane!" someone screamed.';
  const vs1 = { characters_present: [{ name: 'Kael', species: 'first_favored' }] };
  out.fatebane = window._characterWeaponLoadout(vs1, scene1);
  out.ledgerAfter = JSON.parse(JSON.stringify(window.state._weaponLedger));
  // 2) Species defaults (no named weapon): FF -> The Answer, Kwisheen -> tide-trident.
  window.state._weaponLedger = {};
  const vs2 = { characters_present: [{ name: 'Kael', species: 'first_favored' }, { name: 'Orun', species: 'kwisheen' }] };
  out.defaults = window._characterWeaponLoadout(vs2, 'a fight in the veilwood');
  // 3) Explicit extractor field pc_weapon (named "the Fatebane", descriptor from extractor).
  window.state._weaponLedger = {}; window.state.protagonistName = 'Mira';
  const vs3 = { pc_weapon: { name: 'the Fatebane', descriptor: 'a jagged crimson glass spear that hums' }, characters_present: [] };
  out.pcField = window._characterWeaponLoadout(vs3, '');
  // 4) Full lock block text (defaults case).
  out.lockText = window._weaponLockForScene(vs2, 'a fight in the veilwood');
  return out;
});
console.log(JSON.stringify(r, null, 2));
await b.close();
