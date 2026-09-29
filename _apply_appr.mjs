import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

// Packet: record the approvals.
sub('_first_sacrifice_editorial_packet_2026_09_28.md',
'# 1. The Issue 1 **opening** coverage matrix, completed',
`# 0. Editorial approvals recorded (Roman, 2026-09-28)

| # | approved |
|---|---|
| **A1** | the **native compiler contract**, including \`invokerScope\`. The extractor report contract stays **separate and legacy-read-only** for this design. |
| **A2** | the **source-backed atom set** — populations, \`twist.*\`, \`interr.*\`, \`answer.*\`, \`auth.*\`, \`lirael.scene1_disposition\`, the two demand atoms, the split accusation pair, the two challenge atoms. Bundles remain **unceaseable views**. |
| **A3** | **\`unm.the_turning_forgotten\`** — Fate-chosen \`unseen\`. **Costless.** Sealed \`population.assembly\`; the crowd forgets **\`twist.assembly_turned\` only**; **no residue suspicion, no physical invisibility, no named-non-member effect.** |
| **A4** | **\`unm.the_accusation_unmade\`** — Fate-chosen \`escape\`, **only when \`accusation.family_accused\` is active.** **Costless.** No conditional companion. **The remedy demand, the grievance, Julian's demand and all named minds are unchanged.** **No coverage is claimed for pre-accusation \`escape\`.** |
| **A5** | **\`unm.time_gives_way\` ships with no intrinsic cost**, unless a later source-backed class mechanism supplies one. **No substitute is to be invented**, and \`world_bent_in_public\` is not to be reinstated by paraphrase. Its complete authored package is the history revision and the genuinely renewed, unconstrained player choice. |

**Class/duration drafts for \`custody_severed\`, \`standing_dissolved\` and \`the_shunning\`:**
\`_approvals_and_three_class_drafts.md\`.

---

# 1. The Issue 1 **opening** coverage matrix, completed`);

// Sheet: reflect the approvals on the three rows.
const SH = '_first_sacrifice_opening_approval_sheet.md';
sub(SH,
`| *tbd* | \`unseen\` | **candidate \`unm.the_turning_forgotten\`** |`,
`| ✅ | \`unseen\` | **APPROVED \`unm.the_turning_forgotten\`** |`);
sub(SH,
`| *tbd* | \`escape\` | **candidate \`unm.the_accusation_unmade\`** |`,
`| ✅ | \`escape\` | **APPROVED \`unm.the_accusation_unmade\`** *(only when the family accusation is active)* |`);
sub(SH,
`| *tbd* | \`undo\` | \`unm.time_gives_way\` | **time gives way**; the ceremony plays again without the interrogation, and **Lirael's Scene-1 choice returns, live and free to go the other way** | ⛔ **none supported** — \`world_bent_in_public\` blocked |`,
`| ✅ | \`undo\` | **APPROVED \`unm.time_gives_way\`** | **time gives way**; the ceremony plays again without the interrogation, and **Lirael's Scene-1 choice returns, live and free to go the other way** | **none — approved costless.** The revision and the renewed unconstrained choice are the complete package. |`);
console.log('approvals recorded in the packet and the sheet');
