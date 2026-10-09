import fs from 'fs';
const F = 'public/app.js';
const sub = (a, b) => {
  let s = fs.readFileSync(F, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70));
  if (s.split(a).length > 2) throw new Error('NOT UNIQUE: ' + a.slice(0, 70));
  fs.writeFileSync(F, s.replace(a, b));
};
const B = (id, text) => "      aftermathBeat: { id: '" + id + "', text: '" + text.replace(/'/g, "\\'") + "' },";

// ── aftermathBeat on every Fate-chosen outcome ──────────────────────────────────────────────
const BEATS = [
  ['unm.dohkar_demand_unmade',
   "aftermath.demand_unspoken",
   "The presiding Dohkar draws breath as though to say something formal, and finds nothing there to say. He closes his mouth. The assembly waits for a pronouncement that does not come, and the pause goes on a beat too long before anyone moves."],
  ['unm.time_gives_way',
   "aftermath.second_telling",
   "Everyone present carries the faint, unplaceable sense of having stood here before. Seren looks at her own hands as if checking them. The Dohkar loses his place in a rite he has performed a hundred times. Julian's gaze finds Lirael a moment before there is any reason for it, and neither of them can say why."],
  ['unm.the_accusation_unmade',
   "aftermath.grievance_without_words",
   "Seren's family stand where they stood, still holding the shape of a thing they meant to do. One of them steps half a pace forward and stops, mouth open, the accusation gone from behind their teeth while the anger behind it stays exactly where it was."],
  ['unm.the_claim_unmade',
   "aftermath.no_one_presides",
   "The Dohkar reaches for an authority he is certain he holds and closes on nothing. Julian, who agreed to something, cannot locate what. The clearing has the particular silence of a room where everyone is waiting for whoever is in charge to speak, and no one is."],
  ['unm.the_turning_forgotten',
   "aftermath.a_look_without_cause",
   "Nobody can say what drew every eye to Lirael, only that something did. Seren frowns at her own certainty that she has wronged her guide. Julian keeps watching her with an attention he can no longer justify. The Dohkar's suspicion survives its reason. They are all still angry, or wary, or sorry, and not one of them can name the moment it began."],
  ['unm.the_custody_unremembered',
   "aftermath.a_thing_in_her_hands",
   "The Answer sits in Lirael's hands and no one thinks to ask why. Julian's glance passes over it the way it passes over the trees. She looks down at it herself with the mild puzzlement of someone holding an object they have no memory of picking up, and does not put it down."],
  ['unm.standing_dissolved',
   "aftermath.emptied_claim",
   "Julian says the words that made him the one to convene this and they land flat, in a clearing that does not receive them. Somebody near the back makes a small involuntary sound. He hears it. He does not look for who."],
  ['unm.the_shunning',
   "aftermath.a_space_that_opens",
   "The withdrawal is not announced. The gathering simply rearranges itself around an absence where Lirael is standing. Seren turns her face away and keeps it turned. The Dohkar addresses his next words to a point slightly past her shoulder. The space around her stays open, and no one steps into it."]
];
BEATS.forEach(([id, bid, text]) => {
  sub("    { id: '" + id + "', ask:", "    { id: '" + id + "', ask:");   // presence check
  let s = fs.readFileSync(F, 'utf8');
  const anchor = "    { id: '" + id + "', ask:";
  const i = s.indexOf(anchor);
  const insertAt = s.indexOf('\n', i) + 1;
  s = s.slice(0, insertAt) + B(bid, text) + '\n' + s.slice(insertAt);
  fs.writeFileSync(F, s);
});

// ── aftermathBeat on every exact reading ────────────────────────────────────────────────────
const EBEATS = [
  ['mem.exact.assembly_forgets_twist', 'aftermath.a_wrong_they_cannot_place',
   "Every person in that clearing keeps the feeling and loses the cause. Seren is ashamed without knowing of what. Julian's regard has an edge he cannot account for. The Dohkar's hand stays near the rite's order as though something in it needs guarding. Lirael feels it too, and has no more idea than they do."],
  ['mem.exact.guests_forget_twist', 'aftermath.the_crowd_goes_mild',
   "The onlookers' faces smooth over into ordinary ceremony interest while the four at the centre stay rigid with what they still remember. Someone in the crowd murmurs approval at exactly the wrong moment."],
  ['mem.exact.institution_forgets_custody', 'aftermath.unclaimed_in_plain_sight',
   "The Answer changes hands and no one marks it. Julian reaches for it once, mid-gesture, and lets the motion die without knowing what he was reaching for."],
  ['mem.exact.julian_forgets_interrogation', 'aftermath.he_cannot_place_her',
   "Julian looks at Lirael with the composure of a man who has never spoken to her intimately in his life, and cannot account for why the sight of her tightens something in his chest."],
  ['mem.exact.dohkar_forgets_authority', 'aftermath.the_rite_without_a_holder',
   "The Dohkar waits for someone to take charge of the ruling, and slowly realises the room is waiting for him. He cannot remember claiming it. He does not claim it again."]
];
EBEATS.forEach(([id, bid, text]) => {
  let s = fs.readFileSync(F, 'utf8');
  const anchor = "    { id: '" + id + "',";
  const i = s.indexOf(anchor);
  if (i < 0) throw new Error('EXACT ANCHOR MISSING: ' + id);
  const insertAt = s.indexOf('\n', i) + 1;
  s = s.slice(0, insertAt) + B(bid, text) + '\n' + s.slice(insertAt);
  fs.writeFileSync(F, s);
});

console.log('aftermathBeat authored for 8 Fate-chosen + 5 exact readings');
