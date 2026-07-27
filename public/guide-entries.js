/* ============================================================================
 * THE TRAVELER'S GUIDE — in-world published encyclopedia (Roman 2026-07-26)
 * ============================================================================
 * This is NOT a codex, a database, a wiki, or developer notes. It is a BOOK —
 * a real in-universe publication with authors, editions, and biases, written
 * over centuries by many hands. The loading screen samples PAGES from it.
 *
 * THE AUTHORING LAW (read before writing any entry):
 *   1. OLDER THAN THE STORY. No entry may exist to serve the current romance or
 *      any single protagonist. Every page must read as though it existed
 *      decades — or centuries — before the protagonist arrived, and will be
 *      read long after they are gone. If an entry only makes sense because of
 *      "this story," it is exposition in disguise. Cut it.
 *   2. CANON-SAFE (authoring-review-only; NOT code-enforceable). Nothing here
 *      may spoil a regional mystery ladder, a cosmology answer, a capstone, or
 *      any hidden mechanic. Everything must be plausibly known to an ordinary
 *      educated resident or traveler. The DEEP truth and the FOLK version are
 *      the same truth at different depths — publish only the shallow layer. A
 *      Detective may think "that sounds important"; they must never be handed
 *      the solution. See project_fatelands_mystery_ladder before adding pages.
 *   3. THREE AUDIENCES AT ONCE. Traveler ("charming custom"), Detective ("wait,
 *      that sounds important"), Author (quietly true to how the world works).
 *   4. VOICE. Hitchhiker's Guide crossed with an old Baedeker: opinionated,
 *      occasionally funny, occasionally melancholy, always from INSIDE the
 *      world. Never RPG-codex, never neutral-wiki.
 *
 * HOW IT GROWS (authored like worlds, NOT a live pipeline): when new
 * worldbuilding is invented (a figure, landmark, custom, battle, holiday), file
 * a "Missing Guide Entry" task. Periodically an authoring batch writes ~30 new
 * entries; they are reviewed ONCE, then permanent. Guide entries are NEVER
 * generated live during loading (that would drift canon). Newspapers are the
 * ONLY ephemeral exception and live elsewhere.
 *
 * SCHEMA (per entry):
 *   id            kebab-case, publication-scoped, stable forever
 *   world         setting key ('fatelands'; modern settings get their own book)
 *   publication   the book this page is FROM ('travelers-guide')
 *   category      section within the book
 *   title         the page heading
 *   author        the in-world writer (invented; gives editions/bias flavor)
 *   edition       which printing (sells the "centuries of hands" feel)
 *   body          the entry prose (~60-150 words → paginates to 1-2 pages)
 *   unlock        'always' for now (future: gated unlocks)
 *   spoiler_level 0 anyone · 1 region-familiar · 2 after first visit · 3 after
 *                 region completed. Mostly 0-1. NEVER used to hide a solution —
 *                 only to time public knowledge to the player's journey.
 *   canon_safe    true only after a human/authoring review confirmed law #2.
 *   margin_notes  OPTIONAL. ~5% of pages carry handwritten marginalia in other
 *                 hands: [{ hand, note }] — a previous reader arguing with, or
 *                 testing, the text ("The author clearly never met a southern
 *                 clan. Ignore paragraph three. — M.V." / "Tested this. Lost a
 *                 boot."). This makes the book feel like YOUR copy, passed
 *                 between travelers for decades. Never on more than ~1 in 20.
 *
 * THINK IN EDITIONS / A LIVING LIBRARY, NOT ONE BOOK (Roman): the shelf holds
 * SEVERAL publications, each with its own author, voice, and page count — the
 * Traveler's Guide, Wishmaster Rowan's "On Wishcraft", the Lytharyn Student
 * Handbook, a Field Guide to the Thornwild, etc. The loading screen may pull a
 * DIFFERENT book off the shelf on different days. Each entry names its own
 * `publication`; the library metaphor already built (Vault/Forbidden Library)
 * makes the whole shelf feel like an institution rather than a single artifact.
 *
 * PAGES, NOT ENTRIES, ARE THE COLLECTIBLE UNIT. Phase-1 runtime paginates each
 * body at _GUIDE_WORDS_PER_PAGE and assigns global page numbers by array order,
 * so the player collects "Page 184-185", building toward "218 of 600 pages."
 * (Phase 0 is pure content; this file is not yet wired into index.html.)
 * ========================================================================== */

window._GUIDE_PUBLICATIONS = {
  'travelers-guide': {
    world: 'fatelands',
    title: "The Traveler's Guide to the Fatelands",
    subtitle: 'Being a Compendium of Roads, Customs, Cautions & Curiosities, Gathered by Many Hands',
    binding_note: 'Bound in ferry-oak, revised past counting; no two copies agree entirely.'
  },
  'on-wishcraft': {
    world: 'fatelands',
    title: 'On Wishcraft',
    subtitle: 'Being the Collected Observations of Wishmaster Rowan, Assembled After His Time by Various Students, Not All of Whom Agreed',
    binding_note: 'A thin, much-thumbed volume. The margins are fuller than some of the pages.'
  }
  // PLANNED (own books, own voices — future authoring batches):
  //   'lytharyn-handbook'    → "The Lytharyn Student Handbook"
  //   'thornwild-field-guide'→ "A Field Guide to the Thornwild"
  //   modern settings each get their own: "The City Companion", "CitizenNet",
  //   "Employee Orientation", "Student Handbook", "Visitor's Guide", "Frontier Almanac".
};

window._GUIDE_WORDS_PER_PAGE = 110; // Phase-1 pagination hook (collectible = the page)

window._GUIDE_ENTRIES = [

  /* ── TRAVELER'S NOTES (4) ─────────────────────────────────────────────── */
  {
    id: 'tn-thornwild-approach', world: 'fatelands', publication: 'travelers-guide',
    category: "Traveler's Notes", title: 'On Visiting Thornwild', author: 'Harlen of Three Ferries', edition: '8th Revised',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Come in daylight and leave before it. The brambles are not the danger; the danger is that Thornwild is beautiful, and beauty here has a way of asking you to stay a little longer than you meant to. Do not pick the pale flowers — not because they are poison, though some are, but because it is rude, and Thornwild remembers rudeness longer than it remembers faces. Carry salt for your bread and a second name for yourself. You will not need the second name. Carry it anyway."
  },
  {
    id: 'tn-ashen-verge-crossing', world: 'fatelands', publication: 'travelers-guide',
    category: "Traveler's Notes", title: 'Crossing the Ashen Verge', author: 'the Cartographers of Grey Hollow', edition: '3rd, corrected',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Cross with a companion, and cross quickly, and do not stop to look back at your own footprints — they are yours; that is all anyone need say about them. Old caravan masters keep a curious tally at the far post: the number who set out, and the number who arrive. The two numbers are usually the same. Usually. It is considered the worst manners to remark upon the times they are not. Bring water you will not need and conversation you can spare. The Verge is quiet, and it does not care to be the only one talking."
  },
  {
    id: 'tn-gloamwater-inns', world: 'fatelands', publication: 'travelers-guide',
    category: "Traveler's Notes", title: 'The Inns of Gloamwater', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Meals in Gloamwater are served by the tide, not the clock, so a hungry traveler learns to read the water before the menu. The good inns hang their names in signed script as well as written, a courtesy to guests who converse with their hands; return the courtesy and learn at least 'thank you' and 'no eel, please.' Rooms above the waterline cost more and are worth it. If your host sets an extra place at supper and says nothing, set out an extra cup and say nothing back. It is not for you. It is not for anyone you will meet."
  },
  {
    id: 'tn-ferry-customs', world: 'fatelands', publication: 'travelers-guide',
    category: "Traveler's Notes", title: 'Ferry Customs, & the Silence of Ferrymen', author: 'Harlen of Three Ferries', edition: '8th Revised',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Pay the ferryman before you board, never after, and never the exact fare — a copper over is thanks; the exact coin is an insult so old no one recalls its cause. Ferrymen do not speak mid-river. This is not superstition but professional courtesy: a river is a long sentence, and it dislikes interruption. If the ferryman speaks to you anyway, answer him plainly and honestly, and do not, under any moon, lie to him about where you are going. He already knows. He is only being polite."
  },

  /* ── WISHMASTER ROWAN, "On Wishcraft" (4) ─────────────────────────────── */
  {
    id: 'rowan-cost', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The First Cost', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Every apprentice asks me what a wish costs, and every apprentice is disappointed by the answer, which is: less than you fear and more than you will admit. The bill does not arrive at once. It arrives the way weather arrives — you were always going to get wet; you simply chose the day. I have never met a wisher who was cheated. I have met a great many who did not read to the bottom of what they wanted."
  },
  {
    id: 'rowan-refusal', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The Dignity of No', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "It is said Fate cannot refuse. This is a comfort told to children and a lie told to kings. Fate refuses constantly; it simply does so by granting. If you have ever received exactly what you asked and hated it, you have been refused with great courtesy. The wise learn to hear the No inside the Yes. The rest learn to live in the house they demanded be built on sand."
  },
  {
    id: 'rowan-for-another', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'Wishing for Another', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "To wish for yourself is arithmetic. To wish for another is trespass, however tender. I do not forbid it — I have done it, and would again — but know that you are carrying a lamp into a room that is not yours, and that the person asleep there may wake to find the furniture rearranged and not thank you for the light. The kindest wishes I have witnessed asked permission first. The unkindest were also the most loving. Make of that what you can; I never could."
  },
  {
    id: 'rowan-small-wishes', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'In Praise of Small Wishes', author: 'Wishmaster Rowan', edition: 'collected excerpts (disputed)',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "The great wishes are carved on monuments; the small ones hold the world up. A wish for the bread to rise. A wish for the fever to break by morning. A wish, muttered, that he would look up before I lost my nerve. These leave no marks and start no wars and are, I suspect, the only wishcraft Fate actually enjoys. (Later editors mark this passage 'sentimental' and 'probably not Rowan.' Later editors have never waited for a fever to break.)"
  },

  /* ── REGIONAL ETIQUETTE (4) ───────────────────────────────────────────── */
  {
    id: 'etq-kwisheen-dining', world: 'fatelands', publication: 'travelers-guide',
    category: 'Etiquette', title: 'Dining with the Kwisheen', author: 'a Guest of the Many-Tide Houses', edition: 'as told to the compilers',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    margin_notes: [{ hand: 'M.V.', note: 'The author plainly never dined with a southern clan. Ignore the part about the cloak; among the southern houses it means the opposite, and I have the scars to prove it.' }],
    body: "Your host will be tall — taller than the doorway seems to allow — and will move as though the floor were tide, which to them it faintly is. Do not stare at the hair; it is not for looking at, and it is, in a sense, looking back. Accept every dish with both hands. Refuse nothing outright; a Kwisheen reads a flat 'no' as a slammed door. Instead, praise a dish so warmly that taking a second helping would insult it. This is understood. If a manta-cloak is laid across your shoulders, you have been paid an honor you cannot yet repay. Wear it. Say little. Do not, whatever the temptation, ask them to remove it near water."
  },
  {
    id: 'etq-first-favored-dining', world: 'fatelands', publication: 'travelers-guide',
    category: 'Etiquette', title: 'Dining with the First Favored', author: 'Master Ilyr (attributed)', edition: 'Court Printing',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "You will be seated before you have finished deciding to sit; they are faster than politeness and kinder about it than you'd expect. Do not comment on the light beneath their skin. It is weather, not decoration, and remarking on a person's weather is what one does to strangers on ferries, not to hosts. Eat slowly — they will finish an hour before you and pretend, gracefully, not to have noticed. If the script on a wrist stills entirely while you speak, you have their whole attention, which is rarer and more dangerous than their distraction. Choose your next sentence as if it will be remembered. It will."
  },
  {
    id: 'etq-ashen-courtship', world: 'fatelands', publication: 'travelers-guide',
    category: 'Etiquette', title: 'Ashen Courtship, for the Bewildered', author: 'Lady Caeryn', edition: '2nd',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "In the grey country they do not say love; they say I would cross with you, which means the same and costs more to mean. A suitor brings not flowers but a second lantern — the implication being that the road ahead is dark and they intend to be on it beside you. To accept, you light it from your own. To decline, you thank them and light it yourself, which tells them, gently, that you can manage your own dark, thank you. Nobody in the grey country is ever refused rudely. They have too much practice at it to be clumsy."
  },
  {
    id: 'etq-gloamwater-hospitality', world: 'fatelands', publication: 'travelers-guide',
    category: 'Etiquette', title: 'The Threshold Cup of Gloamwater', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "A Gloamwater host greets a guest at the threshold with a cup of plain water — never wine, never tea, water — and drinks first, in front of you, before offering it. Drink what remains and you are, for the length of your stay, family: your quarrels are their quarrels, your debts are negotiable, and no one under that roof may raise a hand against you. Do not pour it out, do not set it down full, and do not, ever, ask what the water is from. The answer is 'the house,' and the house does not care to be interrogated by its own guests."
  },

  /* ── CHILDREN'S TALES (4) ─────────────────────────────────────────────── */
  {
    id: 'tale-neat-wisher', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'The Girl Who Wished Too Neatly', author: 'a nursery version', edition: 'as sung in the western holds',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "There was a girl who tidied her wishes the way she tidied her room — every corner square, nothing left over. She wished to be never cold, and so was never warm. She wished to lose nothing, and so gathered nothing worth losing. She wished, at last, to want for nothing, and Fate, which is fond of tidy children, gave her exactly that, and she sat very neat and very still in a very clean house, wanting for nothing, forever. Children are told this so they will leave one corner untidy. Most of them, thank goodness, need no telling."
  },
  {
    id: 'tale-sea-counts', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'Why the Sea Keeps Count', author: 'a Gloamwater cradle-song', edition: 'traditional',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Long ago the sea could not count, and so it lost things without noticing — boats, names, the odd afternoon. A child taught it to count on the tide, one wave a number, so that it would notice what it took and, sometimes, bring it back. Now the sea counts always, in and out, in and out, and this is why you must never tell the sea a false number, and why fishermen say their true ages to the water before a long voyage. The sea is not cruel. It is only very careful, now, and careful things do not forgive being lied to."
  },
  {
    id: 'tale-borrowed-face', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'The Boy Who Went In Alone', author: 'a hearth-tale', edition: 'told against going in alone',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Every child knows you do not go into the deep places by yourself, and every child knows the boy who did. He went in to come out better — braver, cleverer, taller — and he came out all of those things, and his mother did not know him, and he did not much mind that she didn't, which was the saddest part. The tale has no monster in it. That is what makes children check, twice, that they are holding someone's hand. You go in together or you do not go in. Everyone's grandmother says so, and everyone's grandmother is, in this, exactly right."
  },
  {
    id: 'tale-fourfold-queen', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'The Queen Who Was Her Own Company', author: 'a bedtime version of an old boast', edition: 'much embroidered',
    unlock: 'always', spoiler_level: 2, canon_safe: true,
    body: "They say there was once a queen with no one to hold her hand, orphaned and unclaimed, and that she went into the deep places alone four times and came out four times still herself, which no one had ever done, and was crowned for it. Nurses tell it as a triumph. Grandmothers tell it as a warning. Both are lying a little, in the loving way of people who want you to sleep. The truth, they will admit if pressed, is that there has only ever been one such queen, and that you, small and precious and dozing, are almost certainly not her. Good night."
  },

  /* ── FAMOUS WISHES (3) — public accounts ──────────────────────────────── */
  {
    id: 'wish-bridge-of-ferns', world: 'fatelands', publication: 'travelers-guide',
    category: 'Famous Wishes', title: 'The Bridge That Was Wished', author: 'the Grey Hollow annals', edition: 'schoolroom abridgement',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "It is a matter of public record that the great span at Fernmarch was not built but wished, by a mason named Oda who had watched three seasons of travelers drown at the ford and could stand it no longer. The wish held — the bridge stands yet — but Oda never crossed it, and no one who knew her would say why, only that she'd 'paid the toll at the wrong end.' Visitors are shown the bridge and told it is a triumph of wishcraft. It is. Locals are shown the bridge and told nothing, because they already know both halves of the story."
  },
  {
    id: 'wish-emptied-lake', world: 'fatelands', publication: 'travelers-guide',
    category: 'Famous Wishes', title: 'The Wish That Emptied Loremere', author: 'disputed among historians', edition: '4th',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Every child in the lake country can point to the dry basin of Loremere and tell you a lord once wished it drained to find a ring at the bottom. Every child gives a different reason for the ring. The historians, who have argued this for two hundred years and produced nine books and no agreement, concede only this much: the lord found what he was looking for, and it was the finding, not the water, that ruined him. The basin fills a hand's width in wet years and empties again. It has never once held the ring."
  },
  {
    id: 'wish-fevered-village', world: 'fatelands', publication: 'travelers-guide',
    category: 'Famous Wishes', title: 'The Small Wish at Hollowbeck', author: 'Wishmaster Rowan (recorded)', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "No monument marks it, which is how you know it worked. In the plague-summer at Hollowbeck a midwife made no grand wish for the fever to lift from the land — she thought that too big to steer — but wished, each night, only that this child, and then this one, and then this one, would see morning. Most did. She is not in the histories. She is in Hollowbeck, on a stone by the well, under the single word ENOUGH, which was, apparently, what she said when asked if she wanted anything for herself."
  },

  /* ── SCHOOLBOOK HISTORY (3) — the accepted public version ──────────────── */
  {
    id: 'hist-the-piercing', world: 'fatelands', publication: 'travelers-guide',
    category: 'History', title: 'The Piercing (Schoolroom Account)', author: 'the Standard Primer', edition: 'approved for holds and courts alike',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Children are taught the Piercing as a date and a pair of names: the year the sky was said to open twice in a single season, once over the north and once, they insist, over nowhere at all. The approved account is admirably brief — it happened, it mattered, it is why the calendars begin where they begin — and admirably silent on what came through, a silence the primer describes as 'appropriate to the young.' Scholars who press the matter are directed, politely, to older books, and then, less politely, to the door. This much is agreed by all: before the Piercing, one counts backward. After it, forward. Everyone lives 'after.'"
  },
  {
    id: 'hist-eight-orders', world: 'fatelands', publication: 'travelers-guide',
    category: 'History', title: 'The Eight Orders, In Brief', author: 'the Standard Primer', edition: 'approved',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "That Fate is a law and not a mood is the first thing a Fatelands child learns after their letters. The law is taught as Eight Orders — eight old rules by which a wish becomes weather — recited in a sing-song most adults can still rattle off and few can still explain. The primer gives the recitation and stops there, on the sensible grounds that a child who can say the Orders will keep out of most trouble, and a child who understands them will go looking for the rest. The Guide takes the same view. Learn the song. Leave the rest to Rowan and to grief, its two most reliable teachers."
  },
  {
    id: 'hist-treaty-of-tides', world: 'fatelands', publication: 'travelers-guide',
    category: 'History', title: 'The Treaty of Tides', author: 'the Standard Primer', edition: 'approved (Gloamwater errata pasted in)',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "The land and the water-folk did not always share a coast peaceably; the Treaty of Tides is why they now do. Children learn it as three promises: the shore is neither's to own, no vessel sails a funeral, and every port keeps one door that is never locked. The approved text is dry as a customs form. The Gloamwater errata — pasted crooked into every copy that reaches the coast — adds a fourth promise the courts declined to ratify and the water-folk observe anyway. The Guide has printed the errata upside down in some editions. This was not an accident, and the compilers decline to say whose."
  },

  /* ── PROVERBS (3) ─────────────────────────────────────────────────────── */
  {
    id: 'prov-seventh-moon', world: 'fatelands', publication: 'travelers-guide',
    category: 'Proverbs', title: '"Never whistle beneath the Seventh Moon."', author: 'collected sayings', edition: 'variously attributed',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Origin unknown; observed everywhere. Some say the Seventh Moon carries sound too well and a whistle travels farther than you'd wish it to. Some say it simply annoyed a queen once and never recovered. Grandmothers offer no reason and enforce it absolutely. Do people believe it? Ask them in daylight and they laugh. Watch them at night, under a copper-lit sky, and note how the merriest whistler goes suddenly, thoughtfully, quiet. Belief is a strange word for a thing everyone obeys and no one defends."
  },
  {
    id: 'prov-borrowed-wish', world: 'fatelands', publication: 'travelers-guide',
    category: 'Proverbs', title: '"A borrowed wish is a borrowed debt."', author: 'collected sayings', edition: 'moneylenders\' favourite',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Meaning: to have another wish on your behalf is to owe a debt you did not sign for and cannot see the size of. Widely quoted by moneylenders, who like the shape of it, and by mothers, who mean it differently and more. Believed? Universally, and universally ignored, which is the honest condition of most good advice. The saying has a rarely-quoted second half — 'and interest is paid in weather' — that the compilers include here mostly to annoy the moneylenders, who prefer their proverbs to stop before the frightening part."
  },
  {
    id: 'prov-fewer-arrive', world: 'fatelands', publication: 'travelers-guide',
    category: 'Proverbs', title: '"Fewer arrive than leave the Verge."', author: 'collected sayings', edition: 'grey-country grim',
    unlock: 'always', spoiler_level: 2, canon_safe: true,
    body: "A grey-country saying, delivered flatly and never explained, which is itself the explanation. Outsiders take it for gallows humour about the road's dangers — bandits, cold, bad footing — and the grey country is content to let them. Ask a Verge-born what it truly means and they will look at you with great patience and change the subject to the weather, which, in the grey country, is also a way of answering. The Guide records the saying and, in the manner of the region, declines to elaborate."
  },

  /* ── PLANTS, ANIMALS & CURIOSITIES (3) — field-guide style ─────────────── */
  {
    id: 'field-will-o-wisps', world: 'fatelands', publication: 'travelers-guide',
    category: 'Plants & Creatures', title: 'The Wisps of Veilwood', author: 'a Field Naturalist of little repute', edition: 'privately printed',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Small, pale, drifting; commonest in the white wood where the trees grow in devoted pairs. The naturalists cannot agree whether the wisps are alive, and the woodsfolk cannot understand why anyone would need to know. They keep to the pathless dark and mind their own business, which is more than can be said for most travelers. A wisp will follow you if you are lost and lead you if you are kind to it and abandon you the instant you try to catch one, which is the correct response to being caught and a lesson several species could stand to learn. Do not eat them. They are not for eating. Nothing that glows gently should ever be for eating."
  },
  {
    id: 'field-tide-mantas', world: 'fatelands', publication: 'travelers-guide',
    category: 'Plants & Creatures', title: 'The Grey Mantas of the Gloam', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Broad, silent, unhurried, the mantas of Gloamwater glide the shallow gloam like slow grey thoughts. Harmless, unless you are a small fish or in a great hurry — mantas have no patience with hurry and have been known to shepherd a racing skiff gently, immovably, back to a walking pace. The water-folk hold them in an esteem that is not quite worship and not quite affection, and will not say which. A manta's passing is considered good luck, an omen of arrival, and — if it circles you once — a suggestion, kindly meant, that you slow down. Heed it. The gloam is not a place that rewards speed."
  },
  {
    id: 'field-fernmarch-salt-fern', world: 'fatelands', publication: 'travelers-guide',
    category: 'Plants & Creatures', title: 'Salt-Fern, & Its Overstated Virtues', author: 'a Field Naturalist of little repute', edition: 'privately printed, unsold',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    margin_notes: [{ hand: 'a soggy pilgrim', note: 'Followed the salt-fern faithfully across the Fernmarch flats. Lost a boot anyway. Ten out of ten, would trust the fern again, will not trust the flats.' }],
    body: "A grey, brittle fern of the tidal flats, credited by hedge-healers with curing fevers, calming nerves, ensuring safe crossings, and improving the singing voice, of which it reliably does none. Its one genuine virtue is that it grows only where the ground is firm, so a marsh-crossing traveler who follows the salt-fern keeps their boots. This is worth more than the healers' promises and is, naturally, the one use no one advertises. The Guide recommends salt-fern highly, for walking on. As medicine it is best appreciated at a distance, ideally the distance between your coin and the seller's hand."
  },

  /* ── RECIPES (2) ──────────────────────────────────────────────────────── */
  {
    id: 'recipe-ferry-bread', world: 'fatelands', publication: 'travelers-guide',
    category: 'Recipes', title: "Ferryman's Bread (Keeps a Week, Tastes Like Three)", author: 'Harlen of Three Ferries', edition: '8th Revised',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "The traveler's staple: a dense, dark, salted loaf that will not spoil, will not crumble, and will not, its detractors note, ever be described as delicious. Bake it hard as a hull. Score the top thrice for the three ferries, a habit no one can defend and everyone keeps. Carried folded in cloth it survives a week's road; dipped in river tea it becomes almost tender, and dipped in anything stronger it becomes, briefly, a friend. Never share your last piece with a stranger on the water. Always share it with a stranger on the shore. The difference matters, and the bread, somehow, knows it."
  },
  {
    id: 'recipe-moon-cakes', world: 'fatelands', publication: 'travelers-guide',
    category: 'Recipes', title: 'Copper Cakes, for a Traveler Setting Out', author: 'a western holdwife', edition: 'as passed down, argued over',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Made under the travelers' moon for someone about to leave, these small copper-glazed cakes are pressed with a thumbprint — the baker's, not the traveler's — so that the one who goes carries the one who stays. Honey, dark flour, a little salt for the tears the holdwife will absolutely deny. Eat one at the door and pocket the rest; tradition holds you must not finish the last until you are home again, which is either a sweet promise or a very old trick to make certain you come home. The cakes go stale by then. You eat it anyway. That, the holdwives say, is the whole point of leaving."
  },

  /* ── UNDER THE THIRTEEN MOONS (13) — one page per moon; living culture, not astronomy ── */
  {
    id: 'moon-velorin', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Velorin, the First-Rising', author: 'the Almanac of the Four Holds', edition: 'revised yearly',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Quicksilver, and always first over the eastern hills, Velorin is the moon of beginnings, and every hold keeps its own list of what may only be begun beneath it: a first furrow, a first voyage, the opening of a shop, the first word of a courtship. Nothing begun under Velorin ends badly, the almanac promises — then adds, in smaller type, that it may still end. The cautious begin nothing at all, on the grounds that a thing not begun cannot be begun wrongly, which is the kind of wisdom that keeps a barn very tidy and very empty."
  },
  {
    id: 'moon-tessryn', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Tessryn, the Steady Moon', author: 'the Almanac of the Four Holds', edition: 'revised yearly',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Pale amber and utterly dependable, Tessryn neither hurries nor surprises, and so it is the moon for things meant to last. Contracts sealed beneath it are held unbreakable by any honest court; a couple who marry under Tessryn are marrying, everyone understands, for the long haul and not the leap. It is the harvest moon and the moon of keeping one's word. 'Promise under Tessryn,' the saying goes, 'or don't promise.' The Astrael-born, who make their promises under a moon that forgives them, find this insufferable, and say so."
  },
  {
    id: 'moon-khalyra', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Khalyra, the Clear Moon', author: 'the Court Calendars', edition: 'as kept in the holds',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Blue-white and pitiless, Khalyra is when the courts sit, debts are named aloud, and the thing everyone has been not-saying at last gets said. Confessions made beneath it are believed; lies, it is held, catch in the throat. Families schedule their hardest conversations for it, on the theory that the moon does half the work — and it usually does. No festival is held under Khalyra; comfort and clarity, the calendars note dryly, are seldom on speaking terms."
  },
  {
    id: 'moon-serapha', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Serapha, the Sacred Radiance', author: 'the Temple Registers', edition: 'approved',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Brightest of the inner moons, Serapha crowns the calendar of holy days — the great festivals, the blessing of newborns, the lighting of the year-fires. A child blessed under Serapha is thought lucky, or at least to have been begun luckily, a distinction the temples are careful to keep. Pilgrims time long journeys to arrive beneath it. The one thing never done under Serapha is mourning: the dead are asked, gently, to wait for a dimmer moon, and — the registers insist — they generally oblige."
  },
  {
    id: 'moon-astrael', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Astrael, the Copper Moon', author: 'Harlen of Three Ferries', edition: '8th Revised',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "The travelers' moon: copper-lit, low, and the busiest night on any road, when ferries run late and are forgiven, inns overfill, and the whole world seems briefly to be going somewhere. One rule governs it, absolute and cheerful — you do not make promises under Astrael. The road will make a liar of you, and everyone knows it, so a vow sworn beneath the Copper Moon is treated as a fond joke and held to nothing. 'Ah, it's Astrael,' they say when someone swears too grandly. 'Better not.' They are laughing. They also mean it."
  },
  {
    id: 'moon-dathriel', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Dathriel, the Violet Moon', author: 'collected, cautiously', edition: 'unattributed',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Deep violet and half-hidden, Dathriel is the moon of what is not said aloud. Letters are burned beneath it, meetings go unwitnessed, and those who cannot yet love in daylight are, by long and forgiving custom, invisible under it. It is not the moon of lies — that is a different failing — but of secrets honestly kept. Ask a Fatelander what they did under the last Dathriel and watch a friendly face go briefly, softly, like a closed door. Then it opens again, and they offer you tea, and you do not ask twice."
  },
  {
    id: 'moon-mournfall', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Mournfall, the Omen Moon', author: 'the hold-almanacs, grimly', edition: 'traditional',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Dim and red and unloved, Mournfall is the moon of the dead: funerals are held beneath it, the names of the lost are spoken once and then deliberately not again, and every old superstition thickens to soup. Do not sweep after dark. Do not leave a chair pulled out. Do not, whatever else you ignore, answer if you are called by name from a room you know to be empty. Whether any of it is true, no one under Mournfall will say — saying so is itself unlucky, and the moon has a long memory for the confident."
  },
  {
    id: 'moon-tharos', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Tharos, the Trade Moon', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Silver-green and bound to the tides, Tharos is the merchants' moon and the sailors' — the great markets open beneath it, cargoes move, the coast does not sleep. A bargain struck under Tharos is a bargain of goods and coin, sturdy and unromantic; the moon has no patience for vows of the heart, and a marriage proposal made beneath it is reckoned either a category error or a very poor negotiating tactic. Fishermen read the tide by it. So, more quietly, do the smugglers, who observe that a busy moon is a forgiving one."
  },
  {
    id: 'moon-the-chain', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'The Chain, the Broken Moon', author: 'the Almanac, reluctantly', edition: 'revised yearly',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Not one moon but a scatter of broken stone dragged across the sky, the Chain is the moon of endings and undoings. Partnerships dissolve beneath it, debts are forgiven or defaulted, apprentices walk out, and marriages — the almanacs note with visible discomfort — are never, ever begun. It is thought unlucky for beginnings and honest for endings, and there is a hard mercy in it: a thing ended under the Chain is held to be ended cleanly, without shame to either side. People weep under the Chain and are not judged for it, which may be the kindest thing the sky does all year."
  },
  {
    id: 'moon-ithralis', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Ithralis, the Lovers\' Moon', author: 'Lady Caeryn', edition: '2nd',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Warm gold and slow to set, Ithralis is the moon of vows and confessions, and the one everyone waits for. Beneath it, weddings of love — as distinct from the practical marriages of Tessryn — are held, proposals are made, and the thing you have carried in your chest for a whole season is, at last, said out loud. It is the busiest moon for wishcraft of the small and tender kind, and the temples look politely away. To confess under Ithralis and be refused is thought the gentlest way to be refused — if there is a gentle way, which Lady Caeryn, who would know, doubts."
  },
  {
    id: 'moon-vorath', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Vorath, the Bone Moon', author: 'the hold-almanacs', edition: 'traditional',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Bone-white and cold, Vorath is when debts come due — all of them, and not a day past. Reckonings are held beneath it, hard bargains paid, accounts of coin and otherwise settled. It is reckoned the worst possible moon to borrow under and the only honest one to repay under, and the prudent arrange to owe nothing at all as Vorath approaches. Where a hold still keeps the old sacrifice-customs, they are made beneath it. The almanacs do not describe those, and this Guide, following their good example, will not either."
  },
  {
    id: 'moon-elarion', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'Elarion, the Changing Moon', author: 'the Lytharyn Registers', edition: 'student issue',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Pale green and shimmering, Elarion is the moon of becoming. Children are named adults beneath it; apprentices are freed and made masters; the newly-changed take their new names; and those setting down an old life for a new one choose Elarion to do it. In Lytharyn the great graduations are held under it, and a graduate who forgets the date is forgiven — while a graduate who forgets their notebook is not, a distinction the Registers consider self-evident and outsiders find baffling. Nothing under Elarion stays quite as it was. That is the entire point of it."
  },
  {
    id: 'moon-hungry-eye', world: 'fatelands', publication: 'travelers-guide',
    category: 'Under the Thirteen Moons', title: 'The Hungry Eye', author: 'the compilers, and no further', edition: 'unrevised, deliberately',
    unlock: 'always', spoiler_level: 2, canon_safe: true,
    margin_notes: [{ hand: '(unsigned)', note: 'Do not read this page aloud after dark. I am not going to tell you why. I am only going to tell you not to.' }],
    body: "There is a thirteenth light, if light is the word, and it is not spoken of as the others are. Under the Hungry Eye nothing is begun, no vow is made, no wish is said aloud; wells are covered, children kept in, and the merriest hold goes quiet as a held breath until it passes. What it is, this Guide does not say — not out of discretion, but because no two authors have ever agreed, and the ones who claimed to know for certain are, notably, not here to be asked. Wait it out. Everyone does. Then go back to living, which is the only thing anyone has ever found to do about it."
  },

  /* ── ON WISHCRAFT — additional excerpts (its own book; Rowan grows toward ~100) ── */
  {
    id: 'ow-clever-and-wise', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The Clever and the Wise', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "The clever bargain with Fate. The wise bargain with themselves. I have been both, at different ages, and only the second kind of bargain ever left me better than it found me."
  },
  {
    id: 'ow-quiet-hearts', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'What Fate Hears', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Every child believes Fate hears the louder words. Every old man knows it hears the quieter hearts. This is why children shout their wishes and are so often answered exactly — and so seldom answered kindly."
  },
  {
    id: 'ow-both-true', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'On Being Contradicted (by Myself)', author: 'Wishmaster Rowan', edition: 'collected excerpts, with apology',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Elsewhere in this volume I have written that a wish costs less than you fear. Elsewhere again, that it costs everything. Students bring me the two pages side by side, triumphant, as if they had caught me out. They have caught nothing. Both are true. A thing that cost you everything and also less than you feared is not a paradox — it is simply a life. That is why we call it wishcraft, and not arithmetic."
  },
  {
    id: 'ow-three-wrong-times', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The Three Wrong Times', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Never wish while angry, while drunk, or while in love. Angry, you will aim true and regret it. Drunk, you will aim wide and regret that. In love, you will aim at the wrong person entirely and call it generosity. This leaves almost no good time to wish, which is exactly my point: the best wishes are made by people who have very nearly talked themselves out of wishing at all."
  }

];
