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
 *   5. NO PUBLICATION EXPLAINS ANOTHER. The Traveler's Guide never cites Rowan
 *      as an authority; the Student Handbook never references the Guide; the
 *      Book of Etiquette never explains WHY a custom exists. Every publication
 *      believes itself SUFFICIENT — that separation makes the world feel
 *      organically PUBLISHED, not centrally designed.
 *   6. PRESERVE DISAGREEMENT. Books may CONTRADICT one another on INTERPRETATION
 *      (never on objective fact): a traveler praises Kwisheen hospitality, an
 *      etiquette manual calls them impossible dinner guests, a children's tale
 *      says King Tolmen never laughed while a history says otherwise. The world
 *      has HISTORIANS, not a narrator. The friction is healthy.
 *   BREADTH BEFORE DEPTH (priority, not a per-entry law): build the SHELF — many
 *   books, each a distinct voice/editor/audience — before deepening any one. The
 *   Library will also live in the Storybound Library BUILDING (browse/search/
 *   reread), not only the loading screen. See memory project_travelers_guide.
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
  },
  'lytharyn-handbook': {
    world: 'fatelands',
    title: 'The Lytharyn Student Handbook',
    subtitle: 'Issued to Every Incoming Cohort of the Lytharyn Schools, and Read by Approximately None of Them',
    editor: 'the Office of the Provost',
    audience: 'students (assumed to already know everything, and to be wrong)',
    binding_note: 'Stiff grey board, a cohort-year stamped on the spine, corners already soft.'
  },
  'travelers-notes': {
    world: 'fatelands',
    title: "Traveler's Notes",
    subtitle: 'The Private Notebook of a Traveler Who Went Everywhere Twice and Trusted No Guidebook, Including This One',
    editor: 'unedited (the hand is the author\'s own)',
    audience: 'nobody; these were never meant to be read',
    binding_note: 'A water-warped pocket journal, half the pages loose, several stuck together.'
  },

  // ── MODERN (world: 'modern') — a real city publishes SEVERAL things; the runtime
  //    selects the books whose `world` matches the story's flavor. Archetype rhymes:
  //    City Companion ≈ a local voice · Visitor's Guide ≈ the Traveler's Guide ·
  //    Civic Pamphlets ≈ schoolbook History. (Newspapers deferred to the UI phase.) ──
  'city-companion': {
    world: 'modern',
    title: 'The City Companion',
    subtitle: 'The City, Explained to Itself, Monthly, Whether It Asked or Not',
    editor: 'the Editors (who live here and are exhausted about it)',
    audience: 'residents who love the city precisely as much as they love complaining about it',
    binding_note: 'Glossy, disposable, and somehow kept in a kitchen drawer for nine years.'
  },
  'visitors-guide-modern': {
    world: 'modern',
    title: "A Visitor's Guide to the City",
    subtitle: 'Everything a Newcomer Needs, Explained Slightly Too Slowly and With Great Confidence',
    editor: 'the Bureau of Tourism',
    audience: 'newcomers, tourists, and the recently and thoroughly lost',
    binding_note: 'A free foldout map that will not refold. It never refolds. Stop trying.'
  },
  'civic-pamphlets': {
    world: 'modern',
    title: 'Civic & Museum Pamphlets',
    subtitle: 'Small Printed Answers to Questions Almost Nobody Asked Out Loud',
    editor: 'assorted municipal offices, and one docent who cares far more than the budget allows',
    audience: 'schoolchildren on trips, and the idle who read everything on a rack',
    binding_note: 'A rack of thin leaflets by a museum door, restocked more often than anyone notices.'
  }
  // FILL-OUT ORDER (popularity): Modern → Fantasy(ahead) → Historical → Dystopia →
  //   Sci-Fi → Post-Apoc. Each flavor gets its own publishing ecosystem (see memory
  //   project_travelers_guide: archetype rhymes + how-info-spreads per civilization).
  // PROMOTE next (mechanical — change `publication` on existing entries): the
  // Traveler's Guide still CONTAINS these as sections; each is its own book on
  // the shelf → 'book-of-etiquette' (The Book of Etiquette), 'field-guide-creatures'
  // (A Field Guide to the Creatures of the Fatelands), 'thirteen-moons' (Under
  // the Thirteen Moons — an almanac). Then modern/sci-fi/etc. get their own
  // publishing ecosystems (see memory project_travelers_guide: archetype rhymes).
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
  },

  /* ── THE LYTHARYN STUDENT HANDBOOK — institutional voice; assumes it is sufficient; explains nothing outside itself ── */
  {
    id: 'lyt-provost-welcome', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'A Word from the Provost', title: 'Welcome', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Welcome to Lytharyn. Everything you need to know is in these pages. Everything you want to know is not, and the Office suggests you make your peace with that early, as the ones who don't tend to leave by the north gate before the first frost. You will be cold, occasionally frightened, and frequently wrong. This is not a failure of the Schools; it is the curriculum. Read the Handbook. Keep it dry. Do not lend it. A student without their Handbook is, by long tradition, not a student but a visitor, and visitors are charged for meals."
  },
  {
    id: 'lyt-notebooks', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Conduct', title: 'Concerning Notebooks', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Lateness to lecture is forgiven; the Schools were built on a marsh and no one has ever crossed it on time. Forgetting your notebook is not forgiven, and no appeal has ever succeeded. The reasoning is not explained to first-years, on the grounds that a first-year who understood it would not need to be told, and a first-year who needed to be told would not believe it. You will understand by your third year. Until then: the notebook. Always the notebook. There is no sentence in this Handbook the Office means more sincerely."
  },
  {
    id: 'lyt-residence-wishwork', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Conduct', title: 'On Unsanctioned Work in the Residences', author: 'the Office of the Provost', edition: 'issued each cohort (amended, wearily)',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Students are reminded that the practice of the wishing arts within the residence halls is prohibited without a tutor present, a signed slate, and a bucket of sand, in that order. The Office is aware this rule is broken every term. The Office is also aware of which rooms flooded, which corridor now runs slightly downhill, and whose eyebrows have not fully returned. We do not name them here. We simply note that the bursar keeps a longer memory than any student, and settles accounts in the autumn."
  },
  {
    id: 'lyt-the-changing', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Traditions', title: 'The Changing', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "In the final term a student may set down the name they arrived with and take up the one they mean to leave under. This is the Changing, and it is not a ceremony so much as a paperwork with candles. The old name is entered in the Register and struck through — not erased; the Schools keep everything — and the new one written beneath. Most students weep. Most students deny it. The Register notes neither, recording only the two names and the date, which is the kindest thing a Register can do and the most it is permitted."
  },
  {
    id: 'lyt-refectory', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Practical Matters', title: 'The Refectory & the Second Bell', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Meals are taken at the long tables, and you sit where there is room, not where there are friends; the Schools consider this instructional. The first bell opens the refectory. The second bell means the doors are closing and you have the length of its ringing to be inside them. Students learn the exact length of the second bell within a week, to the stride, and forget almost everything else they are taught, which the Office has stopped finding disappointing and started finding instructive."
  },

  /* ── TRAVELER'S NOTES — one traveler's private notebook; terse, opinionated, and openly at odds with the official Guide ── */
  {
    id: 'tnote-kwisheen-spear', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On Kwisheen spears', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "Never compliment a Kwisheen spear. Praise it and it is yours — pressed into your hands, refusal impossible, the giving a courtesy you cannot decline without a graver rudeness than the taking. You will leave with a spear you did not want and a debt you cannot name the size of. I own four. I have complimented, in my life, exactly four spears. Learn from me: admire the weather instead. The weather cannot be given away."
  },
  {
    id: 'tnote-fold-walker', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On Fold-Walkers', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 2, canon_safe: true,
    body: "Never ask a Fold-Walker which way they went in. They do not remember, and it is not the kind of not-remembering you help someone with. I asked, once, a kind-faced woman at an inn near the grey country, only making conversation. She smiled for a long moment and could not answer and knew that she could not, and I have thought about that smile for eleven years. Ask them anything else. Ask them nothing. But not that."
  },
  {
    id: 'tnote-gloamwater-cup', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On the threshold cup (a correction)', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "The official guides tell you to drink the threshold cup and become family for the length of your stay. The official guides have never been to the eastern quarter, where drinking it means you have agreed to something, and no one will tell you what until it is time to have agreed to it. I drank. I agreed. It cost me a summer and a very good coat. Drink the cup — but in the eastern quarter, ask first what you are drinking to. They will respect the asking. They will not respect the not."
  },
  {
    id: 'tnote-lytharyn-notebook', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On Lytharyn', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "In Lytharyn they will forgive you for being late and never for forgetting your notebook. I asked three separate scholars to explain this and received three separate lectures and no explanation, only the growing sense that the question itself marked me as an outsider. I have stopped asking. I now simply carry a notebook everywhere in Lytharyn and arrive whenever I please, and am treated, I notice, with a respect I have done nothing else to earn."
  },
  {
    id: 'tnote-trust-no-book', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'A general principle', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Trust no single book. Including this one. Especially this one — I wrote it tired, and half of it in inns, and some of it to settle scores the other party will never read. A guidebook is a confident stranger. A field note is an anxious one. Carry several, believe none entirely, and when they disagree, note that the disagreement is usually the truest thing on either page."
  },

  /* ══ MODERN (world: 'modern') — a contemporary metropolis publishing about itself ══ */

  /* ── THE CITY COMPANION — local magazine; opinionated, insidery, in love with complaining ── */
  {
    id: 'cc-neighborhoods', world: 'modern', publication: 'city-companion',
    category: 'The City', title: 'The Neighborhoods, Ranked (Yet Again)', author: 'the Editors', edition: 'the Annual Issue',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Every year we rank the neighborhoods, and every year the winner is a place none of you can afford and half of you claim to hate. This is not a coincidence; it is the ranking. The truly desirable block is the one with no valet, no sign, no visible restaurant, and rents that would make a banker sit down. If you can see the money, it isn't the good part of town — it's the part that wants you to think it is. The good part is quiet. The good part has a hardware store that has somehow survived. We will not tell you which block. You would only move there."
  },
  {
    id: 'cc-old-money', world: 'modern', publication: 'city-companion',
    category: 'The City', title: 'How to Spot Old Money (You Won\'t)', author: 'the Editors', edition: 'the Style Issue',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "The rule is simple and cruel: the more you can name it, the less it costs. Real money wears a watch you don't recognize, drives a car that is deliberately ten years old, and owns a coat so plain you'd pass it in a thrift shop and so expensive you couldn't. Logos are for people climbing; the ones who've arrived took the ladder away behind them. You will meet someone in a grey sweater and assume they're nobody. That is the sweater working exactly as intended. The tell, if there is one, is that nothing about them is asking you for anything. That is the most expensive thing a person can wear."
  },
  {
    id: 'cc-rent', world: 'modern', publication: 'city-companion',
    category: 'Living Here', title: 'The Rent: A Love Letter', author: 'the Editors', edition: 'the Housing Issue (recurring, screaming)',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "We love the city the way one loves a person who is bad for us: completely, and against all financial advice. The rent is a crime, the closets are theoretical, and the phrase 'cozy' in a listing is legally actionable. And yet. You will stand at your too-small window at some ordinary hour and watch the lights come on across a thousand other too-small windows, each holding someone who also cannot afford to be here and is here anyway, and you will understand that the rent is not the price of the apartment. It is the price of the window."
  },
  {
    id: 'cc-brunch', world: 'modern', publication: 'city-companion',
    category: 'Eating', title: 'Brunch: Meal, or Personality?', author: 'the Dining Desk', edition: 'the Food Issue',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "A ninety-minute wait for eggs you could have made in four minutes is not about the eggs, and everyone in the line knows it. Brunch is the city's one sanctioned ritual of unhurriedness — the performance of having, for once, nowhere to be — which is why it is taken so grimly seriously and defended so fiercely. Order the thing that comes with the little pot of something. Tip as though you mean it. And when someone says they 'don't really do brunch,' understand that you have learned something true about them, and adjust accordingly."
  },
  {
    id: 'cc-summer', world: 'modern', publication: 'city-companion',
    category: 'Living Here', title: 'Surviving the Summer', author: 'the Editors', edition: 'the July Issue',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "For roughly six weeks the city becomes a held breath in a wool coat. The trains are worse. The smell arrives — you'll know it — and becomes, by August, oddly nostalgic. This is the season of the rooftop, that great equalizer, where a good roof beats a bad penthouse and everyone pretends the view was the point. Drink water. Walk on the shady side; the city was laid out by someone who understood shade was a form of wealth. And forgive the place its August temper. It has been standing in the heat all day for you."
  },

  /* ── A VISITOR'S GUIDE TO THE CITY — the Bureau of Tourism; earnest, patient, slightly slow ── */
  {
    id: 'vg-trains', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Getting Around', title: 'Riding the Trains', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "The trains are the fastest way across the city and the surest way to be identified as a newcomer. Stand to the right of the escalator; walk on the left. Let riders off before you board. Do not hold the doors — they do not negotiate. Above all, do not make prolonged eye contact: it is not that the city is unfriendly, but that eight million people in a small space have agreed, wordlessly, to grant each other the courtesy of being briefly invisible. Accept the gift. Look at the middle distance, like everyone else. You'll find it restful."
  },
  {
    id: 'vg-tipping', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Customs', title: 'The Silent Math of Tipping', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Tipping is expected, frequent, and calculated at a speed that will alarm you. The screen will turn toward you; there will be suggested amounts; there will be a person watching, kindly, while you decide who you are. Visitors freeze here. Locals have made peace with it. The rule of thumb is generosity slightly beyond comfort — the city runs on a thousand people doing small things for you, and the tip is how the city admits this to itself. When in doubt, round up. You will never once regret having been the generous stranger."
  },
  {
    id: 'vg-directions', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Getting Around', title: 'Asking for Directions', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Contrary to its reputation, the city will help you — enthusiastically, at length, and often incorrectly. A local asked for directions considers it a point of honor to answer, whether or not they know, and you will receive a confident route involving a landmark that closed in the previous decade. Thank them warmly; the warmth was sincere even where the geography was not. Then ask a second person. The true route lies, as with so much here, somewhere in the disagreement between two certain strangers."
  },
  {
    id: 'vg-coffee', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Customs', title: 'Ordering Coffee Without Incident', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Know your order before you reach the counter. This is not a suggestion; it is the social contract, and the line behind you is enforcing it. Step up, say the thing, step aside to wait — the three-beat rhythm the whole city performs before it has fully woken. Do not ask the barista what they recommend during the morning rush; you may ask this in the calm of the afternoon, when it becomes, briefly, a lovely conversation. The city is not rude. It is simply on its way somewhere, and would like, gently, for you to already know what you want."
  },

  /* ── CIVIC & MUSEUM PAMPHLETS — municipal, earnest, oddly specific; openly at odds with the Companion ── */
  {
    id: 'civ-green-bridge', world: 'modern', publication: 'civic-pamphlets',
    category: 'City Curiosities', title: 'Why the Bridge Is Painted Green', author: 'the Municipal Landmarks Office', edition: 'reprinted often',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "Visitors ask, and here is the true and dull answer the Office is proud to provide: the bridge is green because in 1911 the committee could not agree between grey and blue, and green was the color no one loved enough to fight over. It has been repainted the same shade forty times since, each time by a contractor who assumed the color meant something. It does not. (The City Companion insists the green honors a lost harbor pilot named Green. There was no pilot named Green. The Companion has been told this. The Companion prints it anyway, every summer, because it is a better story, which the Office concedes but does not forgive.)"
  },
  {
    id: 'civ-fast-clock', world: 'modern', publication: 'civic-pamphlets',
    category: 'City Curiosities', title: 'The Station Clock That Runs Four Minutes Fast', author: 'the Transit Heritage Society', edition: '3rd printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true,
    body: "The great clock in the old station has run exactly four minutes fast for over a century, and every proposal to correct it has failed, because the city discovered it preferred to be lied to in this one particular way. The four minutes belong to the commuters — the small mercy of a train you thought you'd missed, still waiting. Generations have made their connections on a clock that was wrong on purpose. The Heritage Society has voted, repeatedly, to keep it wrong. Some kindnesses only work if no one fixes them."
  },
  {
    id: 'civ-city-name', world: 'modern', publication: 'civic-pamphlets',
    category: 'City History', title: 'A Brief and Contested History of the City\'s Name', author: 'the Historical Society', edition: 'revised, contentiously',
    unlock: 'always', spoiler_level: 1, canon_safe: true,
    body: "The Historical Society is obliged to report that the origin of the city's name is disputed by three factions who no longer attend the same luncheons. One holds it comes from a founder's surname; one, from a mistranslation of an older word for 'crossing'; one, from a tavern that stood where the courthouse now stands. Each faction has documents. Each faction's documents contradict the others. The Society's official position is that the name means 'a place people kept arriving at,' which satisfies no faction and is, the Society privately believes, the only version that has ever been true."
  }

];
