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

// In-universe scarcity (Roman's #4 — "DISCOVERY", never "rarity/Legendary"). The world does not
// know a book is special; the PLAYER discovers it. `weight` = relative surfacing chance during
// loading (Lost almost never appears → "feels special"). Library shows e.g. "Lost Works 2/17 discovered".
window._GUIDE_DISCOVERY = {
  common:     { label: 'Common',     order: 1, weight: 100, note: 'Widely printed; nearly everyone has a copy.' },
  uncommon:   { label: 'Uncommon',   order: 2, weight: 45,  note: 'Specialist or regional; you have to want it.' },
  rare:       { label: 'Rare',       order: 3, weight: 12,  note: 'Passed quietly, hand to hand; hard to come by.' },
  restricted: { label: 'Restricted', order: 4, weight: 4,   note: 'Exists, but controlled, suppressed, or spoken of carefully.' },
  lost:       { label: 'Lost',       order: 5, weight: 1,   note: 'Presumed gone; a genuine find. Holy grails live here.' },
};

// Cross-FLAVOR shelving axis for the Library building (see design #7): books are grouped by
// what KIND of book they are, NOT which world — so On Wishcraft can be shelved beside a sci-fi
// ethics primer because both are philosophy. Every publication carries a `shelf`; `order` = walk order.
window._GUIDE_SHELVES = {
  travel:            { label: 'Travel & Gazetteers',         order: 1, note: 'Roads, ports, cities, and where the walls still stand.' },
  history:           { label: 'History & Memory',            order: 2, note: 'What happened, what is remembered, and what was quietly lost.' },
  philosophy:        { label: 'Philosophy & Belief',         order: 3, note: 'The books that argue about why, not how.' },
  'natural-history': { label: 'Natural History',             order: 4, note: 'Field guides and bestiaries — the living country, sorted (badly).' },
  etiquette:         { label: 'Manners & Etiquette',         order: 5, note: 'How not to give offense among peoples who agree on almost nothing.' },
  almanac:           { label: 'Almanacs & Reckonings',       order: 6, note: 'Moons, tides, feast-days, fees — the year set down in advance.' },
  handbook:          { label: 'Handbooks & Practical',       order: 7, note: "Every civilization's \"how to live here\" — one per world." },
  periodical:        { label: 'Newspapers & Periodicals',    order: 8, note: 'The ephemeral shelf: gossip, bulletins, things printed to be thrown away.' },
  notebooks:         { label: 'Private Papers & Marginalia', order: 9, note: 'Unofficial voices — journals and samizdat that argue with the shelves around them.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// _GUIDE_CONCEPTS — the canonical vocabulary the Guide tags pages with (Roman's #5).
// Concepts are IDEAS (person/place/moon/species/event/book/custom/institution/
// phenomenon/practice/era/artifact/concept), NOT words. ONE stable id per thing.
// Guide entries reference these by slug in `concepts:[]`. `description` is left ''
// for now — room to grow (a concept becomes navigable once described). These power
// Related Reading / search / unlock / encyclopedia / analytics — NEVER dialogue gating.
// TAG CONSERVATIVELY: only concepts a page is substantially about (Wikipedia rule).
// ─────────────────────────────────────────────────────────────────────────────
window._GUIDE_CONCEPTS = {
  // ── FATELANDS ──
  'wishcraft':          { type: 'practice',    label: 'Wishcraft', aliases: [], description: '' },
  'the-fold':           { type: 'concept',     label: 'The Fold', aliases: [], description: '' },
  'kwisheen':           { type: 'species',     label: 'Kwisheen', aliases: ['Many-Tide'], description: '' },
  'first-favored':      { type: 'species',     label: 'First Favored', aliases: ['FF', 'the Favored'], description: '' },
  'the-eight-orders':   { type: 'institution', label: 'The Eight Orders', aliases: ['the Orders'], description: '' },
  'the-piercing':       { type: 'event',       label: 'The Piercing', aliases: [], description: '' },
  'treaty-of-tides':    { type: 'event',       label: 'The Treaty of Tides', aliases: [], description: '' },
  'lytharyn':           { type: 'institution', label: 'The Lytharyn Schools', aliases: ['Lytharyn'], description: '' },
  'veilwood':           { type: 'place',       label: 'Veilwood', aliases: [], description: '' },
  'gloamwater':         { type: 'place',       label: 'Gloamwater', aliases: [], description: '' },
  'thornwild':          { type: 'place',       label: 'Thornwild', aliases: [], description: '' },
  'ashen-verge':        { type: 'place',       label: 'The Ashen Verge', aliases: ['Ashen Verge'], description: '' },
  'fernmarch':          { type: 'place',       label: 'Fernmarch', aliases: [], description: '' },
  'velorin':            { type: 'moon',        label: 'Velorin', aliases: ['Velorin, the First-Rising'], description: '' },
  'tessryn':            { type: 'moon',        label: 'Tessryn', aliases: [], description: '' },
  'khalyra':            { type: 'moon',        label: 'Khalyra', aliases: [], description: '' },
  'serapha':            { type: 'moon',        label: 'Serapha', aliases: [], description: '' },
  'astrael':            { type: 'moon',        label: 'Astrael', aliases: ['Copper Moon', 'Promise Moon'], description: '' },
  'dathriel':           { type: 'moon',        label: 'Dathriel', aliases: [], description: '' },
  'mournfall':          { type: 'moon',        label: 'Mournfall', aliases: [], description: '' },
  'tharos':             { type: 'moon',        label: 'Tharos', aliases: [], description: '' },
  'the-chain':          { type: 'moon',        label: 'The Chain', aliases: [], description: '' },
  'ithralis':           { type: 'moon',        label: 'Ithralis', aliases: [], description: '' },
  'vorath':             { type: 'moon',        label: 'Vorath', aliases: [], description: '' },
  'elarion':            { type: 'moon',        label: 'Elarion', aliases: [], description: '' },
  'the-hungry-eye':     { type: 'moon',        label: 'The Hungry Eye', aliases: ['Hungry Eye'], description: '' },
  // ── MODERN ──
  'the-green-bridge':   { type: 'place',       label: 'The Green Bridge', aliases: [], description: '' },
  'the-station-clock':  { type: 'place',       label: 'The Station Clock (Four Minutes Fast)', aliases: ['the fast clock'], description: '' },
  'city-name-origin':   { type: 'event',       label: "Origin of the City's Name", aliases: [], description: '' },
  // ── HISTORICAL ──
  'reputation':         { type: 'concept',     label: 'Reputation', aliases: [], description: '' },
  'courtship':          { type: 'custom',      label: 'Courtship', aliases: [], description: '' },
  'chaperonage':        { type: 'custom',      label: 'Chaperonage', aliases: [], description: '' },
  'calling-cards':      { type: 'custom',      label: 'Calling Cards', aliases: [], description: '' },
  'correspondence-etiquette': { type: 'custom', label: 'Correspondence Etiquette', aliases: [], description: '' },
  'household-management':{ type: 'custom',     label: 'Household Management', aliases: [], description: '' },
  'the-cut':            { type: 'custom',      label: 'The Cut Direct', aliases: ['cut direct', 'cutting'], description: '' },
  // ── DYSTOPIA (Glass House) ──
  'the-chorus':         { type: 'phenomenon',  label: 'The Chorus', aliases: [], description: '' },
  'the-field':          { type: 'concept',     label: 'The Field', aliases: [], description: '' },
  'aperture':           { type: 'concept',     label: 'Aperture', aliases: ['open aperture', 'closed aperture'], description: '' },
  'solo':               { type: 'concept',     label: 'Solo', aliases: ['a Solo'], description: '' },
  'wihi':               { type: 'custom',      label: 'WiHi', aliases: [], description: '' },
  'immediate-forgiveness': { type: 'concept',  label: 'Immediate Forgiveness', aliases: [], description: '' },
  // ── SCI-FI ──
  'the-thinning':       { type: 'phenomenon',  label: 'The Thinning', aliases: [], description: '' },
  'the-dimming':        { type: 'event',       label: 'The Dimming', aliases: [], description: '' },
  'the-mind':           { type: 'concept',     label: 'The Mind', aliases: ["ship's mind", 'station AI'], description: '' },
  'the-long-dark':      { type: 'place',       label: 'The Long Dark', aliases: [], description: '' },
  'first-contact':      { type: 'concept',     label: 'First Contact', aliases: [], description: '' },
  'drift-lichen':       { type: 'species',     label: 'Drift-Lichen', aliases: [], description: '' },
  'hull-singers':       { type: 'species',     label: 'Hull-Singers', aliases: [], description: '' },
  'sethlin':            { type: 'species',     label: 'the Sethlin', aliases: ['Sethlin'], description: '' },
  // ── POST-APOCALYPSE ──
  'beforefall':         { type: 'era',         label: 'Beforefall', aliases: ['the Fall', 'the world that ended'], description: '' },
  'the-attention':      { type: 'concept',     label: 'The Attention', aliases: ['the wasteland pays attention'], description: '' },
  'the-witness':        { type: 'concept',     label: 'The Witness', aliases: [], description: '' },
  'the-quiet':          { type: 'concept',     label: 'The Quiet', aliases: [], description: '' },
  'the-registrars':     { type: 'institution', label: 'The Registrars', aliases: [], description: '' },
  'convoys':            { type: 'custom',      label: 'Convoys & Convoy Law', aliases: ['convoy'], description: '' },
  'greenhold':          { type: 'place',       label: 'Greenhold', aliases: [], description: '' },
  'scav-packs':         { type: 'species',     label: 'Scav-Packs', aliases: [], description: '' },
  'ash-crawler':        { type: 'species',     label: 'Ash-Crawler', aliases: [], description: '' },
};

window._GUIDE_PUBLICATIONS = {
  'travelers-guide': {
    shelf: 'travel', voice: 'practical, witty, occasionally and confidently wrong — a chorus of many hands that never fully agree',
    discovery: 'common', edition_label: 'Revised Past Counting',
    provenance: ['Bought from a ferry-house stall, the price haggled down for a torn cover.', 'Left behind by a previous traveler, your name written over theirs.', 'Borrowed from an inn and, regrettably, never returned.'],
    world: 'fatelands',
    title: "The Traveler's Guide to the Fatelands",
    subtitle: 'Being a Compendium of Roads, Customs, Cautions & Curiosities, Gathered by Many Hands',
    binding_note: 'Bound in ferry-oak, revised past counting; no two copies agree entirely.'
  },
  'on-wishcraft': {
    shelf: 'philosophy', voice: 'sparse, philosophical, almost meditative; more silence than sentence',
    discovery: 'uncommon', edition_label: 'Students’ Assembly, Corrected',
    provenance: ['Copied out by hand from a Lytharyn copy that could not be removed.', 'Pressed on you by a student who swore it changed everything.', 'Found among a dead wishworker’s effects, three passages underlined.'],
    world: 'fatelands',
    title: 'On Wishcraft',
    subtitle: 'Being the Collected Observations of Wishmaster Rowan, Assembled After His Time by Various Students, Not All of Whom Agreed',
    binding_note: 'A thin, much-thumbed volume. The margins are fuller than some of the pages.'
  },
  'lytharyn-handbook': {
    shelf: 'handbook', voice: 'dry, bureaucratic, unintentionally funny; rules issued to people it assumes are already wrong',
    discovery: 'uncommon', edition_label: 'This Cohort-Year’s Issue',
    provenance: ['Issued on your first day and never formally taken back.', 'Borrowed from the Lytharyn stacks and quietly kept.', 'Handed down from an older cohort, their marginal complaints intact.'],
    world: 'fatelands',
    title: 'The Lytharyn Student Handbook',
    subtitle: 'Issued to Every Incoming Cohort of the Lytharyn Schools, and Read by Approximately None of Them',
    editor: 'the Office of the Provost',
    audience: 'students (assumed to already know everything, and to be wrong)',
    binding_note: 'Stiff grey board, a cohort-year stamped on the spine, corners already soft.'
  },
  'travelers-notes': {
    shelf: 'notebooks', voice: 'clipped, sceptical, first-person; trusts nothing, least of all the official guides (this one included)',
    discovery: 'rare', edition_label: 'The Only Copy',
    provenance: ['Found in an abandoned satchel at a crossing-house.', 'Sold to you as scrap paper by someone who could not read the hand.', 'Slipped into your pack by a stranger who then vanished onto the ferry.'],
    world: 'fatelands',
    title: "Traveler's Notes",
    subtitle: 'The Private Notebook of a Traveler Who Went Everywhere Twice and Trusted No Guidebook, Including This One',
    editor: 'unedited (the hand is the author\'s own)',
    audience: 'nobody; these were never meant to be read',
    binding_note: 'A water-warped pocket journal, half the pages loose, several stuck together.'
  },
  // ── promoted from the Traveler's Guide: three sections grown large enough to stand
  //    as books of their own. Same folk-layer, same disagreement — a wider shelf.
  'thirteen-moons': {
    shelf: 'almanac', voice: 'terse almanac cadence — names, tempers, warnings — sky-superstition worn smooth by yearly use',
    discovery: 'uncommon', edition_label: 'This Year’s Reckoning',
    provenance: ['Taken down from the nail beside a ferryman’s door.', 'Bought at a dockside market, the fold-out sky already torn.', 'Left on the sill of a shuttered planting-house.'],
    world: 'fatelands',
    title: 'Under the Thirteen Moons',
    subtitle: 'Being the Standing Almanac of the Four Holds, Their Moons Named, Their Tempers Recorded, and Their Quarrels Left Unsettled',
    editor: 'the Almanac of the Four Holds (revised yearly, agreed upon never)',
    audience: 'ferrymen, planters, and the sleepless',
    binding_note: 'Broad and flat as a chart-book, thumbed dark along the moon-tables; the last leaf is a fold-out sky no two copies draw alike.'
  },
  'book-of-etiquette': {
    shelf: 'etiquette', voice: 'anxious and exacting, certain one wrong fork ends a life, among peoples who share only the capacity for offense',
    discovery: 'uncommon', edition_label: 'Revised for the Anxious',
    provenance: ['A gift before your first journey abroad, meaningfully given.', 'Bought hastily at a port after your first grave mistake.', 'Passed to you by a host too polite to correct you aloud.'],
    world: 'fatelands',
    title: 'The Book of Etiquette',
    subtitle: 'Being a Compendium of Manners for the Traveler Who Would Give No Offense Abroad, Across Peoples Who Agree on Almost Nothing but the Fact of Being Offended',
    editor: 'gathered from many tables, few of which set out the same forks',
    audience: 'guests, suitors, and those who have already erred once',
    binding_note: 'Slim, clothbound, a ribbon marker sewn in; the courtship pages fall open of their own accord.'
  },
  'field-guide-creatures': {
    shelf: 'natural-history', voice: 'amateur-naturalist enthusiasm undercut by margin-corrections; sorts a country that refuses to be sorted',
    discovery: 'uncommon', edition_label: 'Second Impression, Margins Included',
    provenance: ['Pressed on you by an amateur naturalist who would not stop talking.', 'Recovered from a flooded archive, the plates still drying.', 'Traded for at a Veilwood waystation, one specimen still inside.'],
    world: 'fatelands',
    title: 'A Field Guide to the Creatures of the Fatelands',
    subtitle: 'Being the Naturalist\'s Attempt to Name and Sort the Living Country, Undertaken in Full Knowledge That the Country Does Not Consent to Being Sorted',
    editor: 'a Field Naturalist of little repute, and one or two who corrected them in the margins',
    audience: 'the curious, the cautious, and the recently startled',
    binding_note: 'Pocket-sized, rain-buckled, pressed specimens still flattening a few of the plates; a wisp-scorch mars the endpaper.'
  },

  // ── MODERN (world: 'modern') — a real city publishes SEVERAL things; the runtime
  //    selects the books whose `world` matches the story's flavor. Archetype rhymes:
  //    City Companion ≈ a local voice · Visitor's Guide ≈ the Traveler's Guide ·
  //    Civic Pamphlets ≈ schoolbook History. (Newspapers deferred to the UI phase.) ──
  'city-companion': {
    shelf: 'travel', voice: 'affectionate, weary, insider; loves the city exactly as much as it complains about it',
    discovery: 'common', edition_label: 'This Month’s Number',
    provenance: ['Left in a rented flat’s drawer by a tenant long gone.', 'Grabbed free from a café rack your first week here.', 'Handed to you by a neighbor who insisted you’d need it.'],
    world: 'modern',
    title: 'The City Companion',
    subtitle: 'The City, Explained to Itself, Monthly, Whether It Asked or Not',
    editor: 'the Editors (who live here and are exhausted about it)',
    audience: 'residents who love the city precisely as much as they love complaining about it',
    binding_note: 'Glossy, disposable, and somehow kept in a kitchen drawer for nine years.'
  },
  'visitors-guide-modern': {
    shelf: 'travel', voice: 'over-explains with great confidence, slightly too slowly, for the thoroughly lost',
    discovery: 'common', edition_label: 'Current Season',
    provenance: ['Taken from a hotel lobby, the map already unfoldable.', 'Given at the airport kiosk with a bright, tired smile.', 'Found on a train seat, someone’s coffee ring on the cover.'],
    world: 'modern',
    title: "A Visitor's Guide to the City",
    subtitle: 'Everything a Newcomer Needs, Explained Slightly Too Slowly and With Great Confidence',
    editor: 'the Bureau of Tourism',
    audience: 'newcomers, tourists, and the recently and thoroughly lost',
    binding_note: 'A free foldout map that will not refold. It never refolds. Stop trying.'
  },
  'civic-pamphlets': {
    shelf: 'history', voice: 'earnest municipal primer; a docent who cares far more than the budget allows',
    discovery: 'uncommon', edition_label: 'Latest Printing',
    provenance: ['Pocketed from a rack by a museum door.', 'Handed out at a civic open day you wandered into.', 'Kept from a school trip and never thrown away.'],
    world: 'modern',
    title: 'Civic & Museum Pamphlets',
    subtitle: 'Small Printed Answers to Questions Almost Nobody Asked Out Loud',
    editor: 'assorted municipal offices, and one docent who cares far more than the budget allows',
    audience: 'schoolchildren on trips, and the idle who read everything on a rack',
    binding_note: 'A rack of thin leaflets by a museum door, restocked more often than anyone notices.'
  },

  // ── HISTORICAL (world: 'historical') — 19th-c. register; reputation binds action, the
  //    public/private gap is the texture. Locale-generic (no real figures/events) so it
  //    reads across Regency→Victorian. Archetype rhymes: Book of Conduct ≈ Etiquette ·
  //    Society Pages ≈ gossip · Almanac ≈ Thirteen Moons · Household Companion ≈ Recipes. ──
  'book-of-conduct': {
    shelf: 'etiquette', voice: 'starched and prescriptive; reputation is survival and feeling is beside the point',
    discovery: 'common', edition_label: 'New and Enlarged Edition',
    provenance: ['A gift from a well-meaning aunt, the inscription faded.', 'Borrowed from a circulating library and guiltily retained.', 'Bought secondhand, a previous owner’s corrections in pencil.'],
    world: 'historical',
    title: 'The Complete Book of Conduct',
    subtitle: 'A Guide to Deportment, Correspondence, and the Preservation of Reputation, for Persons of Every Rank',
    editor: 'A Lady of Quality (who declines to be named, as a Lady should)',
    audience: 'the anxious, the aspiring, and the recently enriched',
    binding_note: 'Gilt-edged, frequently gifted, and — the giver suspects — rarely finished.'
  },
  'society-pages': {
    shelf: 'periodical', voice: 'arch, gleeful, deniable gossip that everyone reads and no one admits to',
    discovery: 'common', edition_label: 'This Week’s Sheet',
    provenance: ['Folded inside a more respectable volume where none would see.', 'Bought from a boy on a corner, still damp from the press.', 'Left on a drawing-room table for anyone to deny reading.'],
    world: 'historical',
    title: 'The Society Pages',
    subtitle: 'Intelligence of Marriages, Mournings, Ruin & Return, for Readers Who Would Never Admit to Reading Them',
    editor: '"A Correspondent" (a coward, and correct)',
    audience: 'everyone; acknowledged by no one',
    binding_note: 'Cheap paper, read to translucency, folded inside a more respectable volume.'
  },
  'household-companion': {
    shelf: 'handbook', voice: 'brisk domestic competence in three annotating hands; the spine broken at the pudding chapter',
    discovery: 'common', edition_label: 'The Family Copy',
    provenance: ['Inherited from a mother, the pudding chapter broken open.', 'Receipts pasted over the printed ones you never use.', 'Bought at a market stall, three hands already in the margins.'],
    world: 'historical',
    title: 'The Household Companion',
    subtitle: 'Being Receipts, Remedies, and the Management of a Respectable Home',
    editor: 'Mrs. —— (the surname worn away by thumbs)',
    audience: 'the mistress of the house and her much-tried staff',
    binding_note: 'Stained, annotated in three hands, the spine broken open at the pudding chapter.'
  },
  'the-almanac': {
    shelf: 'almanac', voice: 'flat yearly reckoning of weather, tide and feast-day; superstition stated as plain fact',
    discovery: 'common', edition_label: 'For the Coming Year',
    provenance: ['Taken from the nail by the kitchen door at year’s end.', 'Bought with the season’s seed from the same merchant.', 'Handed over with your change, as every year.'],
    world: 'historical',
    title: 'The Almanac',
    subtitle: 'Weather, Tides, Markets, Moon-Phases & Feast-Days, Reckoned for the Coming Year',
    editor: 'the Almanack-maker (in office, by tradition, until dead)',
    audience: 'farmers, sailors, and the superstitious, which is to say everyone',
    binding_note: 'A thin yearly pamphlet with a hole punched in one corner for the nail by the door.'
  },

  // ── DYSTOPIA (world: 'dystopia') is MULTI-REGIME — each sub-world is a distinct society,
  //    so books carry a `subworld` and the runtime selects by it. Flagship: GLASS HOUSE
  //    ('glass_house') — a GENTLE modern social dystopia (empathic field "The Chorus" →
  //    total emotional transparency; "you will never love alone — you will love us"). Its
  //    propaganda is WARM & communal, NOT authoritarian (canon forbids surveillance/implants/
  //    enforcement). Diegetic ONLY: the Chorus / the Field / aperture / Solo / WiHi — NEVER
  //    "glass"/"glass house" in-world (fourth-wall). Samizdat = a Solo's quiet dissent. Other
  //    dystopia sub-worlds (Quieting, Human Capital, Dogma, Erasure, Thirst) get their own
  //    shelves in fill-out. See memory project_glass_house_* + project_modern_dystopias_one_axis. ──
  'field-companion': {
    shelf: 'handbook', voice: 'warm, communal, gently insistent; you are never alone here, and that is meant as the whole comfort',
    discovery: 'common', edition_label: 'Warm Welcome Edition',
    provenance: ['Given to you, warmly, at the Community Welcome Office.', 'Found already open on a shared table, as if left for you.', 'Pressed into your hands your first day in the Field.'],
    world: 'dystopia', subworld: 'glass_house',
    title: 'The Field Companion',
    subtitle: 'Your Warm Welcome to a Life You Never Have to Feel Alone In',
    editor: 'the Community Welcome Office',
    audience: 'new arrivals to the Chorus',
    binding_note: 'Bright and gentle, printed on paper that somehow seems to want to be held.'
  },
  'open-aperture': {
    shelf: 'etiquette', voice: 'sunlit lifestyle-magazine glow; every door open in every photograph, and you only notice later',
    discovery: 'uncommon', edition_label: 'This Season’s Issue',
    provenance: ['Left face-up in a waiting room, every door in it open.', 'Delivered to your door though you don’t recall subscribing.', 'Shared by a neighbor who could feel you’d want it.'],
    world: 'dystopia', subworld: 'glass_house',
    title: 'Open Aperture',
    subtitle: 'The Magazine for Living Fully in the Field',
    editor: 'the Editors (who can feel you reading this, and are so glad you are)',
    audience: 'everyone; togetherness is the whole readership',
    binding_note: 'Glossy, sunlit; there is not one closed door in any photograph, and you only notice this later.'
  },
  'first-field': {
    shelf: 'philosophy', voice: 'three-warm-colours board-book tenderness, teaching the youngest to be held',
    discovery: 'uncommon', edition_label: 'Board-Book Edition',
    provenance: ['Read to you once, and kept long after you’d outgrown it.', 'Given at the Welcome Office for the little ones, or the newly arrived.', 'Found in a bright bin of them, all identical, all warm.'],
    world: 'dystopia', subworld: 'glass_house',
    title: 'First Field: A Reader for New Hearts',
    subtitle: 'Gentle Pages for Children, Newcomers, and Anyone Learning to Be Held',
    editor: 'the Community Welcome Office',
    audience: 'children, the newly arrived, and the quietly lonely',
    binding_note: 'A soft-cornered board book in the same three warm colours throughout.'
  },
  'a-solos-notes': {
    shelf: 'notebooks', voice: 'quiet handwritten dissent; the one private voice in a world with no closed doors',
    discovery: 'rare', edition_label: 'No Two Alike',
    provenance: ['Pressed into your palm and folded before anyone could feel it.', 'Found tucked in the lining of a secondhand coat.', 'Passed with a look that said: do not carry this into the Field.'],
    world: 'dystopia', subworld: 'glass_house',
    title: "A Solo's Notes",
    subtitle: '(untitled; passed hand to hand; please do not carry this into the Field)',
    editor: 'no office, and no name',
    audience: 'the one person you would narrow the whole world down to',
    binding_note: 'A few loose handwritten sheets, folded small enough to palm. Never printed, never twice the same.'
  },

  // ── SCI-FI (world: 'scifi') — deep-space frontier register: isolation, mission fragility, close
  //    quarters, ship/station AI (incl. the "Thinning" — the AI treating a person as an unmodeled
  //    variable), first contact. Locale-generic (the frontier / the Long Dark / your station) so it
  //    reads across sub-flavors (first_contact, post_human, …). Archetype rhymes: Colonist Handbook ≈
  //    onboarding/travel · Xenobiology Manual ≈ Field Guide · Captain's Almanac ≈ the Almanac ·
  //    Galactic Phrasebook ≈ Etiquette / First Contact Protocol. ──
  'colonist-handbook': {
    shelf: 'handbook', voice: 'reassuring institutional calm that updates itself overnight and never quite says what changed',
    discovery: 'common', edition_label: 'Overnight Revision',
    provenance: ['Printed on request from the station terminal your first shift.', 'Left in your bunk locker by whoever held it before.', 'Loaded onto your slate by an administrator who didn’t look up.'],
    world: 'scifi',
    title: 'The Colonist Handbook',
    subtitle: 'Everything You Need to Stay Alive, Sane, and Roughly on Schedule This Far From Home',
    editor: 'Station Administration',
    audience: 'new arrivals to the frontier',
    binding_note: 'A durable slate, updated silently overnight; you are never quite sure what changed, only that something did.'
  },
  'xenobiology-manual': {
    shelf: 'natural-history', voice: 'clinical survey prose revised after every incident; a page torn cleanly out that everyone asks about',
    discovery: 'uncommon', edition_label: 'Provisional, Revised After the Incident',
    provenance: ['Salvaged from a survey team’s kit; a page already missing.', 'Traded for at a port, the blast-scar included at no charge.', 'Handed down by a medic who told you to read the fauna first.'],
    world: 'scifi',
    title: 'The Xenobiology Field Manual',
    subtitle: 'Observed Life of the Frontier, Classified Provisionally and Revised Often, Usually After an Incident',
    editor: 'the Survey Corps',
    audience: 'surveyors, medics, and the reckless',
    binding_note: 'Waterproof, blast-scored at one corner, with a page torn cleanly out that everyone eventually asks about.'
  },
  'captains-almanac': {
    shelf: 'almanac', voice: 'gruff, opinionated, full of sea stories; compiled by captains and corrected by their widows',
    discovery: 'uncommon', edition_label: 'Corrected by the Widows',
    provenance: ['Bought off a docked captain who’d stopped flying that route.', 'Inherited with the ship, the widow’s corrections in red.', 'Found grease-thumbed in a helm-locker, three ports crossed out.'],
    world: 'scifi',
    title: "The Ship Captain's Almanac",
    subtitle: 'Fees, Fuel, Routes & the Customs of Ports That Will Space You for Getting Them Wrong',
    editor: 'compiled by captains, corrected by their widows',
    audience: 'anyone who holds a helm and hopes to keep holding it',
    binding_note: 'Grease-thumbed, margins denser than the text, three ports crossed out in red without comment.'
  },
  'galactic-phrasebook': {
    shelf: 'etiquette', voice: 'brisk protocol courtesy with a black-edged section; how not to insult what could kill you',
    discovery: 'uncommon', edition_label: 'Pocket Edition, Black-Edged',
    provenance: ['Issued by the Diplomatic Service with a bereaved nod.', 'Bought at a frontier port from a trader who wished you luck.', 'Left on a galley shelf, the black-edged section dog-eared.'],
    world: 'scifi',
    title: 'The Galactic Phrasebook',
    subtitle: 'How Not to Insult the Species You Will Meet, and the One You Should Pray You Do Not',
    editor: 'the Diplomatic Service (bereaved, but undeterred)',
    audience: 'traders, envoys, and tourists with a death wish',
    binding_note: 'Pocket-sized, pages colour-coded by species; the black-edged section is not for beginners.'
  },

  // ── POST-APOCALYPSE (world: 'postapocalyptic') — scarcity & grief register: the before/after,
  //    survival math, the need for a WITNESS, convoys & elders & old warnings, and the wasteland
  //    that "seems to pay attention." Multi-sub-world (ashfall / year-zero / predation / hunger),
  //    but these books read across them. Archetype rhymes: Survivor's Manual ≈ onboarding/travel ·
  //    Settlement Registry ≈ gazetteer · Wasteland Bestiary ≈ Field Guide · Beforefall Memories ≈
  //    History/nostalgia. (Radio Transcripts = the ephemeral/newspaper analog → UI phase.) ──
  'survivors-manual': {
    shelf: 'handbook', voice: 'no single author — an argument in the margins between everyone who held it; the true text is the disagreement',
    discovery: 'common', edition_label: 'No Two Copies Alike',
    provenance: ['Found in an abandoned satchel, half its pages someone else’s.', 'Traded for a day’s water at a settlement gate.', 'Carried by three walkers before it reached your hands.'],
    world: 'postapocalyptic',
    title: "The Survivor's Manual",
    subtitle: 'Water, Fire, Fungus, and the Difference Between a Myth That Kills You and One That Does Not',
    editor: 'no one; everyone; whoever held it last, in the margins',
    audience: 'the living, and those working to stay that way',
    binding_note: 'No two copies alike — pages added, torn, corrected in a dozen hands; the true text is the argument between them.'
  },
  'settlement-registry': {
    shelf: 'travel', voice: 'ledger-plain gazetteer, hearsay included; entries crossed out and, hopefully, written back in',
    discovery: 'uncommon', edition_label: 'Rebound in Salvage',
    provenance: ['Copied from a Registrar’s ledger at the cost of a meal.', 'Taken from a settlement that no longer needed it.', 'Recovered from a flooded archive, the salvage-binding still sound.'],
    world: 'postapocalyptic',
    title: 'The Settlement Registry',
    subtitle: 'Every Known Town, Its People, Its Trade, and What Is Said of It in the Next Town Over',
    editor: 'the Registrars (a title now, not a job)',
    audience: 'traders, walkers, and the lost looking for a wall',
    binding_note: 'A ledger rebound in salvage; many entries crossed out, a few crossed out and then, hopefully, written back in.'
  },
  'wasteland-bestiary': {
    shelf: 'natural-history', voice: 'hard-won danger ratings inked in red and re-inked upward; fear made procedural',
    discovery: 'uncommon', edition_label: 'Ratings Re-Inked',
    provenance: ['Bought from a scavenger, the danger ratings re-inked upward.', 'Pulled from the pack of someone who didn’t make it back.', 'Passed to you at the wall: "read the red ones first."'],
    world: 'postapocalyptic',
    title: 'The Wasteland Bestiary',
    subtitle: 'What Walks, Crawls, and Waits Out There, With Danger Ratings Learned the Hard Way',
    editor: 'compiled by scavengers, at cost',
    audience: 'anyone going past the wall',
    binding_note: 'The danger ratings are inked in red, and several have been re-inked, upward, more than once.'
  },
  'beforefall-memories': {
    shelf: 'history', voice: 'bittersweet artifacts of a vanished world; tender to the young who cannot understand and the old who understand too well',
    discovery: 'rare', edition_label: 'What Could Be Saved',
    provenance: ['Given by a Rememberer, old and fewer each winter.', 'Found in a sealed tin with photographs you don’t recognize.', 'Kept by a family for generations, softening at every fold.'],
    world: 'postapocalyptic',
    title: 'Beforefall Memories',
    subtitle: 'Relics and Remembrances of the World That Ended, for Those Who Recall It and Those Who Cannot',
    editor: 'the Rememberers (old, and fewer each winter)',
    audience: 'the young, who do not understand, and the old, who understand too well',
    binding_note: 'A scrapbook, really — pasted-in scraps of the old world, softening a little more at every fold.'
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
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['thornwild'],
    body: "Come in daylight and leave before it. The brambles are not the danger; the danger is that Thornwild is beautiful, and beauty here has a way of asking you to stay a little longer than you meant to. Do not pick the pale flowers — not because they are poison, though some are, but because it is rude, and Thornwild remembers rudeness longer than it remembers faces. Carry salt for your bread and a second name for yourself. You will not need the second name. Carry it anyway."
  },
  {
    id: 'tn-ashen-verge-crossing', world: 'fatelands', publication: 'travelers-guide',
    category: "Traveler's Notes", title: 'Crossing the Ashen Verge', author: 'the Cartographers of Grey Hollow', edition: '3rd, corrected',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['ashen-verge'],
    body: "Cross with a companion, and cross quickly, and do not stop to look back at your own footprints — they are yours; that is all anyone need say about them. Old caravan masters keep a curious tally at the far post: the number who set out, and the number who arrive. The two numbers are usually the same. Usually. It is considered the worst manners to remark upon the times they are not. Bring water you will not need and conversation you can spare. The Verge is quiet, and it does not care to be the only one talking."
  },
  {
    id: 'tn-gloamwater-inns', world: 'fatelands', publication: 'travelers-guide',
    category: "Traveler's Notes", title: 'The Inns of Gloamwater', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['gloamwater'],
    body: "Meals in Gloamwater are served by the tide, not the clock, so a hungry traveler learns to read the water before the menu. The good inns hang their names in signed script as well as written, a courtesy to guests who converse with their hands; return the courtesy and learn at least 'thank you' and 'no eel, please.' Rooms above the waterline cost more and are worth it. If your host sets an extra place at supper and says nothing, set out an extra cup and say nothing back. It is not for you. It is not for anyone you will meet."
  },
  {
    id: 'tn-ferry-customs', world: 'fatelands', publication: 'travelers-guide',
    category: "Traveler's Notes", title: 'Ferry Customs, & the Silence of Ferrymen', author: 'Harlen of Three Ferries', edition: '8th Revised',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Pay the ferryman before you board, never after, and never the exact fare — a copper over is thanks; the exact coin is an insult so old no one recalls its cause. Ferrymen do not speak mid-river. This is not superstition but professional courtesy: a river is a long sentence, and it dislikes interruption. If the ferryman speaks to you anyway, answer him plainly and honestly, and do not, under any moon, lie to him about where you are going. He already knows. He is only being polite."
  },

  /* ── WISHMASTER ROWAN, "On Wishcraft" (4) ─────────────────────────────── */
  {
    id: 'rowan-cost', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The First Cost', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['wishcraft'],
    body: "Every apprentice asks me what a wish costs, and every apprentice is disappointed by the answer, which is: less than you fear and more than you will admit. The bill does not arrive at once. It arrives the way weather arrives — you were always going to get wet; you simply chose the day. I have never met a wisher who was cheated. I have met a great many who did not read to the bottom of what they wanted."
  },
  {
    id: 'rowan-refusal', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The Dignity of No', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['wishcraft'],
    body: "It is said Fate cannot refuse. This is a comfort told to children and a lie told to kings. Fate refuses constantly; it simply does so by granting. If you have ever received exactly what you asked and hated it, you have been refused with great courtesy. The wise learn to hear the No inside the Yes. The rest learn to live in the house they demanded be built on sand."
  },
  {
    id: 'rowan-for-another', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'Wishing for Another', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['wishcraft'],
    body: "To wish for yourself is arithmetic. To wish for another is trespass, however tender. I do not forbid it — I have done it, and would again — but know that you are carrying a lamp into a room that is not yours, and that the person asleep there may wake to find the furniture rearranged and not thank you for the light. The kindest wishes I have witnessed asked permission first. The unkindest were also the most loving. Make of that what you can; I never could."
  },
  {
    id: 'rowan-small-wishes', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'In Praise of Small Wishes', author: 'Wishmaster Rowan', edition: 'collected excerpts (disputed)',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['wishcraft'],
    body: "The great wishes are carved on monuments; the small ones hold the world up. A wish for the bread to rise. A wish for the fever to break by morning. A wish, muttered, that he would look up before I lost my nerve. These leave no marks and start no wars and are, I suspect, the only wishcraft Fate actually enjoys. (Later editors mark this passage 'sentimental' and 'probably not Rowan.' Later editors have never waited for a fever to break.)"
  },

  /* ── REGIONAL ETIQUETTE (4) ───────────────────────────────────────────── */
  {
    id: 'etq-kwisheen-dining', world: 'fatelands', publication: 'book-of-etiquette',
    category: 'Etiquette', title: 'Dining with the Kwisheen', author: 'a Guest of the Many-Tide Houses', edition: 'as told to the compilers',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['kwisheen'],
    margin_notes: [{ hand: 'M.V.', note: 'The author plainly never dined with a southern clan. Ignore the part about the cloak; among the southern houses it means the opposite, and I have the scars to prove it.' }],
    body: "Your host will be tall — taller than the doorway seems to allow — and will move as though the floor were tide, which to them it faintly is. Do not stare at the hair; it is not for looking at, and it is, in a sense, looking back. Accept every dish with both hands. Refuse nothing outright; a Kwisheen reads a flat 'no' as a slammed door. Instead, praise a dish so warmly that taking a second helping would insult it. This is understood. If a manta-cloak is laid across your shoulders, you have been paid an honor you cannot yet repay. Wear it. Say little. Do not, whatever the temptation, ask them to remove it near water."
  },
  {
    id: 'etq-first-favored-dining', world: 'fatelands', publication: 'book-of-etiquette',
    category: 'Etiquette', title: 'Dining with the First Favored', author: 'Master Ilyr (attributed)', edition: 'Court Printing',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['first-favored'],
    body: "You will be seated before you have finished deciding to sit; they are faster than politeness and kinder about it than you'd expect. Do not comment on the light beneath their skin. It is weather, not decoration, and remarking on a person's weather is what one does to strangers on ferries, not to hosts. Eat slowly — they will finish an hour before you and pretend, gracefully, not to have noticed. If the script on a wrist stills entirely while you speak, you have their whole attention, which is rarer and more dangerous than their distraction. Choose your next sentence as if it will be remembered. It will."
  },
  {
    id: 'etq-ashen-courtship', world: 'fatelands', publication: 'book-of-etiquette',
    category: 'Etiquette', title: 'Ashen Courtship, for the Bewildered', author: 'Lady Caeryn', edition: '2nd',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['ashen-verge'],
    body: "In the grey country they do not say love; they say I would cross with you, which means the same and costs more to mean. A suitor brings not flowers but a second lantern — the implication being that the road ahead is dark and they intend to be on it beside you. To accept, you light it from your own. To decline, you thank them and light it yourself, which tells them, gently, that you can manage your own dark, thank you. Nobody in the grey country is ever refused rudely. They have too much practice at it to be clumsy."
  },
  {
    id: 'etq-gloamwater-hospitality', world: 'fatelands', publication: 'book-of-etiquette',
    category: 'Etiquette', title: 'The Threshold Cup of Gloamwater', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['gloamwater'],
    body: "A Gloamwater host greets a guest at the threshold with a cup of plain water — never wine, never tea, water — and drinks first, in front of you, before offering it. Drink what remains and you are, for the length of your stay, family: your quarrels are their quarrels, your debts are negotiable, and no one under that roof may raise a hand against you. Do not pour it out, do not set it down full, and do not, ever, ask what the water is from. The answer is 'the house,' and the house does not care to be interrogated by its own guests."
  },

  /* ── CHILDREN'S TALES (4) ─────────────────────────────────────────────── */
  {
    id: 'tale-neat-wisher', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'The Girl Who Wished Too Neatly', author: 'a nursery version', edition: 'as sung in the western holds',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['wishcraft'],
    body: "There was a girl who tidied her wishes the way she tidied her room — every corner square, nothing left over. She wished to be never cold, and so was never warm. She wished to lose nothing, and so gathered nothing worth losing. She wished, at last, to want for nothing, and Fate, which is fond of tidy children, gave her exactly that, and she sat very neat and very still in a very clean house, wanting for nothing, forever. Children are told this so they will leave one corner untidy. Most of them, thank goodness, need no telling."
  },
  {
    id: 'tale-sea-counts', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'Why the Sea Keeps Count', author: 'a Gloamwater cradle-song', edition: 'traditional',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: [],
    body: "Long ago the sea could not count, and so it lost things without noticing — boats, names, the odd afternoon. A child taught it to count on the tide, one wave a number, so that it would notice what it took and, sometimes, bring it back. Now the sea counts always, in and out, in and out, and this is why you must never tell the sea a false number, and why fishermen say their true ages to the water before a long voyage. The sea is not cruel. It is only very careful, now, and careful things do not forgive being lied to."
  },
  {
    id: 'tale-borrowed-face', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'The Boy Who Went In Alone', author: 'a hearth-tale', edition: 'told against going in alone',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-fold'],
    body: "Every child knows you do not go into the deep places by yourself, and every child knows the boy who did. He went in to come out better — braver, cleverer, taller — and he came out all of those things, and his mother did not know him, and he did not much mind that she didn't, which was the saddest part. The tale has no monster in it. That is what makes children check, twice, that they are holding someone's hand. You go in together or you do not go in. Everyone's grandmother says so, and everyone's grandmother is, in this, exactly right."
  },
  {
    id: 'tale-fourfold-queen', world: 'fatelands', publication: 'travelers-guide',
    category: "Children's Tales", title: 'The Queen Who Was Her Own Company', author: 'a bedtime version of an old boast', edition: 'much embroidered',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['the-fold'],
    body: "They say there was once a queen with no one to hold her hand, orphaned and unclaimed, and that she went into the deep places alone four times and came out four times still herself, which no one had ever done, and was crowned for it. Nurses tell it as a triumph. Grandmothers tell it as a warning. Both are lying a little, in the loving way of people who want you to sleep. The truth, they will admit if pressed, is that there has only ever been one such queen, and that you, small and precious and dozing, are almost certainly not her. Good night."
  },

  /* ── FAMOUS WISHES (3) — public accounts ──────────────────────────────── */
  {
    id: 'wish-bridge-of-ferns', world: 'fatelands', publication: 'travelers-guide',
    category: 'Famous Wishes', title: 'The Bridge That Was Wished', author: 'the Grey Hollow annals', edition: 'schoolroom abridgement',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['wishcraft', 'fernmarch'],
    body: "It is a matter of public record that the great span at Fernmarch was not built but wished, by a mason named Oda who had watched three seasons of travelers drown at the ford and could stand it no longer. The wish held — the bridge stands yet — but Oda never crossed it, and no one who knew her would say why, only that she'd 'paid the toll at the wrong end.' Visitors are shown the bridge and told it is a triumph of wishcraft. It is. Locals are shown the bridge and told nothing, because they already know both halves of the story."
  },
  {
    id: 'wish-emptied-lake', world: 'fatelands', publication: 'travelers-guide',
    category: 'Famous Wishes', title: 'The Wish That Emptied Loremere', author: 'disputed among historians', edition: '4th',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['wishcraft'],
    body: "Every child in the lake country can point to the dry basin of Loremere and tell you a lord once wished it drained to find a ring at the bottom. Every child gives a different reason for the ring. The historians, who have argued this for two hundred years and produced nine books and no agreement, concede only this much: the lord found what he was looking for, and it was the finding, not the water, that ruined him. The basin fills a hand's width in wet years and empties again. It has never once held the ring."
  },
  {
    id: 'wish-fevered-village', world: 'fatelands', publication: 'travelers-guide',
    category: 'Famous Wishes', title: 'The Small Wish at Hollowbeck', author: 'Wishmaster Rowan (recorded)', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['wishcraft'],
    body: "No monument marks it, which is how you know it worked. In the plague-summer at Hollowbeck a midwife made no grand wish for the fever to lift from the land — she thought that too big to steer — but wished, each night, only that this child, and then this one, and then this one, would see morning. Most did. She is not in the histories. She is in Hollowbeck, on a stone by the well, under the single word ENOUGH, which was, apparently, what she said when asked if she wanted anything for herself."
  },

  /* ── SCHOOLBOOK HISTORY (3) — the accepted public version ──────────────── */
  {
    id: 'hist-the-piercing', world: 'fatelands', publication: 'travelers-guide',
    category: 'History', title: 'The Piercing (Schoolroom Account)', author: 'the Standard Primer', edition: 'approved for holds and courts alike',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-piercing'],
    body: "Children are taught the Piercing as a date and a pair of names: the year the sky was said to open twice in a single season, once over the north and once, they insist, over nowhere at all. The approved account is admirably brief — it happened, it mattered, it is why the calendars begin where they begin — and admirably silent on what came through, a silence the primer describes as 'appropriate to the young.' Scholars who press the matter are directed, politely, to older books, and then, less politely, to the door. This much is agreed by all: before the Piercing, one counts backward. After it, forward. Everyone lives 'after.'"
  },
  {
    id: 'hist-eight-orders', world: 'fatelands', publication: 'travelers-guide',
    category: 'History', title: 'The Eight Orders, In Brief', author: 'the Standard Primer', edition: 'approved',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-eight-orders', 'wishcraft'],
    body: "That Fate is a law and not a mood is the first thing a Fatelands child learns after their letters. The law is taught as Eight Orders — eight old rules by which a wish becomes weather — recited in a sing-song most adults can still rattle off and few can still explain. The primer gives the recitation and stops there, on the sensible grounds that a child who can say the Orders will keep out of most trouble, and a child who understands them will go looking for the rest. The Guide takes the same view. Learn the song. Leave the rest to Rowan and to grief, its two most reliable teachers."
  },
  {
    id: 'hist-treaty-of-tides', world: 'fatelands', publication: 'travelers-guide',
    category: 'History', title: 'The Treaty of Tides', author: 'the Standard Primer', edition: 'approved (Gloamwater errata pasted in)',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['treaty-of-tides'],
    body: "The land and the water-folk did not always share a coast peaceably; the Treaty of Tides is why they now do. Children learn it as three promises: the shore is neither's to own, no vessel sails a funeral, and every port keeps one door that is never locked. The approved text is dry as a customs form. The Gloamwater errata — pasted crooked into every copy that reaches the coast — adds a fourth promise the courts declined to ratify and the water-folk observe anyway. The Guide has printed the errata upside down in some editions. This was not an accident, and the compilers decline to say whose."
  },

  /* ── PROVERBS (3) ─────────────────────────────────────────────────────── */
  {
    id: 'prov-seventh-moon', world: 'fatelands', publication: 'travelers-guide',
    category: 'Proverbs', title: '"Never whistle beneath the Seventh Moon."', author: 'collected sayings', edition: 'variously attributed',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: [],
    body: "Origin unknown; observed everywhere. Some say the Seventh Moon carries sound too well and a whistle travels farther than you'd wish it to. Some say it simply annoyed a queen once and never recovered. Grandmothers offer no reason and enforce it absolutely. Do people believe it? Ask them in daylight and they laugh. Watch them at night, under a copper-lit sky, and note how the merriest whistler goes suddenly, thoughtfully, quiet. Belief is a strange word for a thing everyone obeys and no one defends."
  },
  {
    id: 'prov-borrowed-wish', world: 'fatelands', publication: 'travelers-guide',
    category: 'Proverbs', title: '"A borrowed wish is a borrowed debt."', author: 'collected sayings', edition: 'moneylenders\' favourite',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['wishcraft'],
    body: "Meaning: to have another wish on your behalf is to owe a debt you did not sign for and cannot see the size of. Widely quoted by moneylenders, who like the shape of it, and by mothers, who mean it differently and more. Believed? Universally, and universally ignored, which is the honest condition of most good advice. The saying has a rarely-quoted second half — 'and interest is paid in weather' — that the compilers include here mostly to annoy the moneylenders, who prefer their proverbs to stop before the frightening part."
  },
  {
    id: 'prov-fewer-arrive', world: 'fatelands', publication: 'travelers-guide',
    category: 'Proverbs', title: '"Fewer arrive than leave the Verge."', author: 'collected sayings', edition: 'grey-country grim',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['ashen-verge'],
    body: "A grey-country saying, delivered flatly and never explained, which is itself the explanation. Outsiders take it for gallows humour about the road's dangers — bandits, cold, bad footing — and the grey country is content to let them. Ask a Verge-born what it truly means and they will look at you with great patience and change the subject to the weather, which, in the grey country, is also a way of answering. The Guide records the saying and, in the manner of the region, declines to elaborate."
  },

  /* ── PLANTS, ANIMALS & CURIOSITIES (3) — field-guide style ─────────────── */
  {
    id: 'field-will-o-wisps', world: 'fatelands', publication: 'field-guide-creatures',
    category: 'Plants & Creatures', title: 'The Wisps of Veilwood', author: 'a Field Naturalist of little repute', edition: 'privately printed',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['veilwood'],
    body: "Small, pale, drifting; commonest in the white wood where the trees grow in devoted pairs. The naturalists cannot agree whether the wisps are alive, and the woodsfolk cannot understand why anyone would need to know. They keep to the pathless dark and mind their own business, which is more than can be said for most travelers. A wisp will follow you if you are lost and lead you if you are kind to it and abandon you the instant you try to catch one, which is the correct response to being caught and a lesson several species could stand to learn. Do not eat them. They are not for eating. Nothing that glows gently should ever be for eating."
  },
  {
    id: 'field-tide-mantas', world: 'fatelands', publication: 'field-guide-creatures',
    category: 'Plants & Creatures', title: 'The Grey Mantas of the Gloam', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['gloamwater'],
    body: "Broad, silent, unhurried, the mantas of Gloamwater glide the shallow gloam like slow grey thoughts. Harmless, unless you are a small fish or in a great hurry — mantas have no patience with hurry and have been known to shepherd a racing skiff gently, immovably, back to a walking pace. The water-folk hold them in an esteem that is not quite worship and not quite affection, and will not say which. A manta's passing is considered good luck, an omen of arrival, and — if it circles you once — a suggestion, kindly meant, that you slow down. Heed it. The gloam is not a place that rewards speed."
  },
  {
    id: 'field-fernmarch-salt-fern', world: 'fatelands', publication: 'field-guide-creatures',
    category: 'Plants & Creatures', title: 'Salt-Fern, & Its Overstated Virtues', author: 'a Field Naturalist of little repute', edition: 'privately printed, unsold',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['fernmarch'],
    margin_notes: [{ hand: 'a soggy pilgrim', note: 'Followed the salt-fern faithfully across the Fernmarch flats. Lost a boot anyway. Ten out of ten, would trust the fern again, will not trust the flats.' }],
    body: "A grey, brittle fern of the tidal flats, credited by hedge-healers with curing fevers, calming nerves, ensuring safe crossings, and improving the singing voice, of which it reliably does none. Its one genuine virtue is that it grows only where the ground is firm, so a marsh-crossing traveler who follows the salt-fern keeps their boots. This is worth more than the healers' promises and is, naturally, the one use no one advertises. The Guide recommends salt-fern highly, for walking on. As medicine it is best appreciated at a distance, ideally the distance between your coin and the seller's hand."
  },

  /* ── RECIPES (2) ──────────────────────────────────────────────────────── */
  {
    id: 'recipe-ferry-bread', world: 'fatelands', publication: 'travelers-guide',
    category: 'Recipes', title: "Ferryman's Bread (Keeps a Week, Tastes Like Three)", author: 'Harlen of Three Ferries', edition: '8th Revised',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "The traveler's staple: a dense, dark, salted loaf that will not spoil, will not crumble, and will not, its detractors note, ever be described as delicious. Bake it hard as a hull. Score the top thrice for the three ferries, a habit no one can defend and everyone keeps. Carried folded in cloth it survives a week's road; dipped in river tea it becomes almost tender, and dipped in anything stronger it becomes, briefly, a friend. Never share your last piece with a stranger on the water. Always share it with a stranger on the shore. The difference matters, and the bread, somehow, knows it."
  },
  {
    id: 'recipe-moon-cakes', world: 'fatelands', publication: 'travelers-guide',
    category: 'Recipes', title: 'Copper Cakes, for a Traveler Setting Out', author: 'a western holdwife', edition: 'as passed down, argued over',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Made under the travelers' moon for someone about to leave, these small copper-glazed cakes are pressed with a thumbprint — the baker's, not the traveler's — so that the one who goes carries the one who stays. Honey, dark flour, a little salt for the tears the holdwife will absolutely deny. Eat one at the door and pocket the rest; tradition holds you must not finish the last until you are home again, which is either a sweet promise or a very old trick to make certain you come home. The cakes go stale by then. You eat it anyway. That, the holdwives say, is the whole point of leaving."
  },

  /* ── UNDER THE THIRTEEN MOONS (13) — one page per moon; living culture, not astronomy ── */
  {
    id: 'moon-velorin', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Velorin, the First-Rising', author: 'the Almanac of the Four Holds', edition: 'revised yearly',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['velorin'],
    body: "Quicksilver, and always first over the eastern hills, Velorin is the moon of beginnings, and every hold keeps its own list of what may only be begun beneath it: a first furrow, a first voyage, the opening of a shop, the first word of a courtship. Nothing begun under Velorin ends badly, the almanac promises — then adds, in smaller type, that it may still end. The cautious begin nothing at all, on the grounds that a thing not begun cannot be begun wrongly, which is the kind of wisdom that keeps a barn very tidy and very empty."
  },
  {
    id: 'moon-tessryn', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Tessryn, the Steady Moon', author: 'the Almanac of the Four Holds', edition: 'revised yearly',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['tessryn'],
    body: "Pale amber and utterly dependable, Tessryn neither hurries nor surprises, and so it is the moon for things meant to last. Contracts sealed beneath it are held unbreakable by any honest court; a couple who marry under Tessryn are marrying, everyone understands, for the long haul and not the leap. It is the harvest moon and the moon of keeping one's word. 'Promise under Tessryn,' the saying goes, 'or don't promise.' The Astrael-born, who make their promises under a moon that forgives them, find this insufferable, and say so."
  },
  {
    id: 'moon-khalyra', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Khalyra, the Clear Moon', author: 'the Court Calendars', edition: 'as kept in the holds',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['khalyra'],
    body: "Blue-white and pitiless, Khalyra is when the courts sit, debts are named aloud, and the thing everyone has been not-saying at last gets said. Confessions made beneath it are believed; lies, it is held, catch in the throat. Families schedule their hardest conversations for it, on the theory that the moon does half the work — and it usually does. No festival is held under Khalyra; comfort and clarity, the calendars note dryly, are seldom on speaking terms."
  },
  {
    id: 'moon-serapha', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Serapha, the Sacred Radiance', author: 'the Temple Registers', edition: 'approved',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['serapha'],
    body: "Brightest of the inner moons, Serapha crowns the calendar of holy days — the great festivals, the blessing of newborns, the lighting of the year-fires. A child blessed under Serapha is thought lucky, or at least to have been begun luckily, a distinction the temples are careful to keep. Pilgrims time long journeys to arrive beneath it. The one thing never done under Serapha is mourning: the dead are asked, gently, to wait for a dimmer moon, and — the registers insist — they generally oblige."
  },
  {
    id: 'moon-astrael', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Astrael, the Copper Moon', author: 'Harlen of Three Ferries', edition: '8th Revised',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['astrael'],
    body: "The travelers' moon: copper-lit, low, and the busiest night on any road, when ferries run late and are forgiven, inns overfill, and the whole world seems briefly to be going somewhere. One rule governs it, absolute and cheerful — you do not make promises under Astrael. The road will make a liar of you, and everyone knows it, so a vow sworn beneath the Copper Moon is treated as a fond joke and held to nothing. 'Ah, it's Astrael,' they say when someone swears too grandly. 'Better not.' They are laughing. They also mean it."
  },
  {
    id: 'moon-dathriel', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Dathriel, the Violet Moon', author: 'collected, cautiously', edition: 'unattributed',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['dathriel'],
    body: "Deep violet and half-hidden, Dathriel is the moon of what is not said aloud. Letters are burned beneath it, meetings go unwitnessed, and those who cannot yet love in daylight are, by long and forgiving custom, invisible under it. It is not the moon of lies — that is a different failing — but of secrets honestly kept. Ask a Fatelander what they did under the last Dathriel and watch a friendly face go briefly, softly, like a closed door. Then it opens again, and they offer you tea, and you do not ask twice."
  },
  {
    id: 'moon-mournfall', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Mournfall, the Omen Moon', author: 'the hold-almanacs, grimly', edition: 'traditional',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['mournfall'],
    body: "Dim and red and unloved, Mournfall is the moon of the dead: funerals are held beneath it, the names of the lost are spoken once and then deliberately not again, and every old superstition thickens to soup. Do not sweep after dark. Do not leave a chair pulled out. Do not, whatever else you ignore, answer if you are called by name from a room you know to be empty. Whether any of it is true, no one under Mournfall will say — saying so is itself unlucky, and the moon has a long memory for the confident."
  },
  {
    id: 'moon-tharos', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Tharos, the Trade Moon', author: 'Marisela Quay', edition: 'Tidewater Printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['tharos'],
    body: "Silver-green and bound to the tides, Tharos is the merchants' moon and the sailors' — the great markets open beneath it, cargoes move, the coast does not sleep. A bargain struck under Tharos is a bargain of goods and coin, sturdy and unromantic; the moon has no patience for vows of the heart, and a marriage proposal made beneath it is reckoned either a category error or a very poor negotiating tactic. Fishermen read the tide by it. So, more quietly, do the smugglers, who observe that a busy moon is a forgiving one."
  },
  {
    id: 'moon-the-chain', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'The Chain, the Broken Moon', author: 'the Almanac, reluctantly', edition: 'revised yearly',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-chain'],
    body: "Not one moon but a scatter of broken stone dragged across the sky, the Chain is the moon of endings and undoings. Partnerships dissolve beneath it, debts are forgiven or defaulted, apprentices walk out, and marriages — the almanacs note with visible discomfort — are never, ever begun. It is thought unlucky for beginnings and honest for endings, and there is a hard mercy in it: a thing ended under the Chain is held to be ended cleanly, without shame to either side. People weep under the Chain and are not judged for it, which may be the kindest thing the sky does all year."
  },
  {
    id: 'moon-ithralis', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Ithralis, the Lovers\' Moon', author: 'Lady Caeryn', edition: '2nd',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['ithralis'],
    body: "Warm gold and slow to set, Ithralis is the moon of vows and confessions, and the one everyone waits for. Beneath it, weddings of love — as distinct from the practical marriages of Tessryn — are held, proposals are made, and the thing you have carried in your chest for a whole season is, at last, said out loud. It is the busiest moon for wishcraft of the small and tender kind, and the temples look politely away. To confess under Ithralis and be refused is thought the gentlest way to be refused — if there is a gentle way, which Lady Caeryn, who would know, doubts."
  },
  {
    id: 'moon-vorath', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Vorath, the Bone Moon', author: 'the hold-almanacs', edition: 'traditional',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['vorath'],
    body: "Bone-white and cold, Vorath is when debts come due — all of them, and not a day past. Reckonings are held beneath it, hard bargains paid, accounts of coin and otherwise settled. It is reckoned the worst possible moon to borrow under and the only honest one to repay under, and the prudent arrange to owe nothing at all as Vorath approaches. Where a hold still keeps the old sacrifice-customs, they are made beneath it. The almanacs do not describe those, and this Guide, following their good example, will not either."
  },
  {
    id: 'moon-elarion', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'Elarion, the Changing Moon', author: 'the Lytharyn Registers', edition: 'student issue',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['elarion'],
    body: "Pale green and shimmering, Elarion is the moon of becoming. Children are named adults beneath it; apprentices are freed and made masters; the newly-changed take their new names; and those setting down an old life for a new one choose Elarion to do it. In Lytharyn the great graduations are held under it, and a graduate who forgets the date is forgiven — while a graduate who forgets their notebook is not, a distinction the Registers consider self-evident and outsiders find baffling. Nothing under Elarion stays quite as it was. That is the entire point of it."
  },
  {
    id: 'moon-hungry-eye', world: 'fatelands', publication: 'thirteen-moons',
    category: 'Under the Thirteen Moons', title: 'The Hungry Eye', author: 'the compilers, and no further', edition: 'unrevised, deliberately',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['the-hungry-eye'],
    margin_notes: [{ hand: '(unsigned)', note: 'Do not read this page aloud after dark. I am not going to tell you why. I am only going to tell you not to.' }],
    body: "There is a thirteenth light, if light is the word, and it is not spoken of as the others are. Under the Hungry Eye nothing is begun, no vow is made, no wish is said aloud; wells are covered, children kept in, and the merriest hold goes quiet as a held breath until it passes. What it is, this Guide does not say — not out of discretion, but because no two authors have ever agreed, and the ones who claimed to know for certain are, notably, not here to be asked. Wait it out. Everyone does. Then go back to living, which is the only thing anyone has ever found to do about it."
  },

  /* ── ON WISHCRAFT — additional excerpts (its own book; Rowan grows toward ~100) ── */
  {
    id: 'ow-clever-and-wise', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The Clever and the Wise', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['wishcraft'],
    body: "The clever bargain with Fate. The wise bargain with themselves. I have been both, at different ages, and only the second kind of bargain ever left me better than it found me."
  },
  {
    id: 'ow-quiet-hearts', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'What Fate Hears', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['wishcraft'],
    body: "Every child believes Fate hears the louder words. Every old man knows it hears the quieter hearts. This is why children shout their wishes and are so often answered exactly — and so seldom answered kindly."
  },
  {
    id: 'ow-both-true', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'On Being Contradicted (by Myself)', author: 'Wishmaster Rowan', edition: 'collected excerpts, with apology',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['wishcraft'],
    body: "Elsewhere in this volume I have written that a wish costs less than you fear. Elsewhere again, that it costs everything. Students bring me the two pages side by side, triumphant, as if they had caught me out. They have caught nothing. Both are true. A thing that cost you everything and also less than you feared is not a paradox — it is simply a life. That is why we call it wishcraft, and not arithmetic."
  },
  {
    id: 'ow-three-wrong-times', world: 'fatelands', publication: 'on-wishcraft',
    category: 'On Wishcraft', title: 'The Three Wrong Times', author: 'Wishmaster Rowan', edition: 'collected excerpts',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['wishcraft'],
    body: "Never wish while angry, while drunk, or while in love. Angry, you will aim true and regret it. Drunk, you will aim wide and regret that. In love, you will aim at the wrong person entirely and call it generosity. This leaves almost no good time to wish, which is exactly my point: the best wishes are made by people who have very nearly talked themselves out of wishing at all."
  },

  /* ── THE LYTHARYN STUDENT HANDBOOK — institutional voice; assumes it is sufficient; explains nothing outside itself ── */
  {
    id: 'lyt-provost-welcome', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'A Word from the Provost', title: 'Welcome', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['lytharyn'],
    body: "Welcome to Lytharyn. Everything you need to know is in these pages. Everything you want to know is not, and the Office suggests you make your peace with that early, as the ones who don't tend to leave by the north gate before the first frost. You will be cold, occasionally frightened, and frequently wrong. This is not a failure of the Schools; it is the curriculum. Read the Handbook. Keep it dry. Do not lend it. A student without their Handbook is, by long tradition, not a student but a visitor, and visitors are charged for meals."
  },
  {
    id: 'lyt-notebooks', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Conduct', title: 'Concerning Notebooks', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['lytharyn'],
    body: "Lateness to lecture is forgiven; the Schools were built on a marsh and no one has ever crossed it on time. Forgetting your notebook is not forgiven, and no appeal has ever succeeded. The reasoning is not explained to first-years, on the grounds that a first-year who understood it would not need to be told, and a first-year who needed to be told would not believe it. You will understand by your third year. Until then: the notebook. Always the notebook. There is no sentence in this Handbook the Office means more sincerely."
  },
  {
    id: 'lyt-residence-wishwork', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Conduct', title: 'On Unsanctioned Work in the Residences', author: 'the Office of the Provost', edition: 'issued each cohort (amended, wearily)',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['lytharyn', 'wishcraft'],
    body: "Students are reminded that the practice of the wishing arts within the residence halls is prohibited without a tutor present, a signed slate, and a bucket of sand, in that order. The Office is aware this rule is broken every term. The Office is also aware of which rooms flooded, which corridor now runs slightly downhill, and whose eyebrows have not fully returned. We do not name them here. We simply note that the bursar keeps a longer memory than any student, and settles accounts in the autumn."
  },
  {
    id: 'lyt-the-changing', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Traditions', title: 'The Changing', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['lytharyn'],
    body: "In the final term a student may set down the name they arrived with and take up the one they mean to leave under. This is the Changing, and it is not a ceremony so much as a paperwork with candles. The old name is entered in the Register and struck through — not erased; the Schools keep everything — and the new one written beneath. Most students weep. Most students deny it. The Register notes neither, recording only the two names and the date, which is the kindest thing a Register can do and the most it is permitted."
  },
  {
    id: 'lyt-refectory', world: 'fatelands', publication: 'lytharyn-handbook',
    category: 'Practical Matters', title: 'The Refectory & the Second Bell', author: 'the Office of the Provost', edition: 'issued each cohort',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['lytharyn'],
    body: "Meals are taken at the long tables, and you sit where there is room, not where there are friends; the Schools consider this instructional. The first bell opens the refectory. The second bell means the doors are closing and you have the length of its ringing to be inside them. Students learn the exact length of the second bell within a week, to the stride, and forget almost everything else they are taught, which the Office has stopped finding disappointing and started finding instructive."
  },

  /* ── TRAVELER'S NOTES — one traveler's private notebook; terse, opinionated, and openly at odds with the official Guide ── */
  {
    id: 'tnote-kwisheen-spear', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On Kwisheen spears', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['kwisheen'],
    body: "Never compliment a Kwisheen spear. Praise it and it is yours — pressed into your hands, refusal impossible, the giving a courtesy you cannot decline without a graver rudeness than the taking. You will leave with a spear you did not want and a debt you cannot name the size of. I own four. I have complimented, in my life, exactly four spears. Learn from me: admire the weather instead. The weather cannot be given away."
  },
  {
    id: 'tnote-fold-walker', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On Fold-Walkers', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['the-fold'],
    body: "Never ask a Fold-Walker which way they went in. They do not remember, and it is not the kind of not-remembering you help someone with. I asked, once, a kind-faced woman at an inn near the grey country, only making conversation. She smiled for a long moment and could not answer and knew that she could not, and I have thought about that smile for eleven years. Ask them anything else. Ask them nothing. But not that."
  },
  {
    id: 'tnote-gloamwater-cup', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On the threshold cup (a correction)', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['gloamwater'],
    body: "The official guides tell you to drink the threshold cup and become family for the length of your stay. The official guides have never been to the eastern quarter, where drinking it means you have agreed to something, and no one will tell you what until it is time to have agreed to it. I drank. I agreed. It cost me a summer and a very good coat. Drink the cup — but in the eastern quarter, ask first what you are drinking to. They will respect the asking. They will not respect the not."
  },
  {
    id: 'tnote-lytharyn-notebook', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'On Lytharyn', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['lytharyn'],
    body: "In Lytharyn they will forgive you for being late and never for forgetting your notebook. I asked three separate scholars to explain this and received three separate lectures and no explanation, only the growing sense that the question itself marked me as an outsider. I have stopped asking. I now simply carry a notebook everywhere in Lytharyn and arrive whenever I please, and am treated, I notice, with a respect I have done nothing else to earn."
  },
  {
    id: 'tnote-trust-no-book', world: 'fatelands', publication: 'travelers-notes',
    category: 'Notes', title: 'A general principle', author: null, edition: 'the author\'s own hand',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Trust no single book. Including this one. Especially this one — I wrote it tired, and half of it in inns, and some of it to settle scores the other party will never read. A guidebook is a confident stranger. A field note is an anxious one. Carry several, believe none entirely, and when they disagree, note that the disagreement is usually the truest thing on either page."
  },

  /* ══ MODERN (world: 'modern') — a contemporary metropolis publishing about itself ══ */

  /* ── THE CITY COMPANION — local magazine; opinionated, insidery, in love with complaining ── */
  {
    id: 'cc-neighborhoods', world: 'modern', publication: 'city-companion',
    category: 'The City', title: 'The Neighborhoods, Ranked (Yet Again)', author: 'the Editors', edition: 'the Annual Issue',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Every year we rank the neighborhoods, and every year the winner is a place none of you can afford and half of you claim to hate. This is not a coincidence; it is the ranking. The truly desirable block is the one with no valet, no sign, no visible restaurant, and rents that would make a banker sit down. If you can see the money, it isn't the good part of town — it's the part that wants you to think it is. The good part is quiet. The good part has a hardware store that has somehow survived. We will not tell you which block. You would only move there."
  },
  {
    id: 'cc-old-money', world: 'modern', publication: 'city-companion',
    category: 'The City', title: 'How to Spot Old Money (You Won\'t)', author: 'the Editors', edition: 'the Style Issue',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: [],
    body: "The rule is simple and cruel: the more you can name it, the less it costs. Real money wears a watch you don't recognize, drives a car that is deliberately ten years old, and owns a coat so plain you'd pass it in a thrift shop and so expensive you couldn't. Logos are for people climbing; the ones who've arrived took the ladder away behind them. You will meet someone in a grey sweater and assume they're nobody. That is the sweater working exactly as intended. The tell, if there is one, is that nothing about them is asking you for anything. That is the most expensive thing a person can wear."
  },
  {
    id: 'cc-rent', world: 'modern', publication: 'city-companion',
    category: 'Living Here', title: 'The Rent: A Love Letter', author: 'the Editors', edition: 'the Housing Issue (recurring, screaming)',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "We love the city the way one loves a person who is bad for us: completely, and against all financial advice. The rent is a crime, the closets are theoretical, and the phrase 'cozy' in a listing is legally actionable. And yet. You will stand at your too-small window at some ordinary hour and watch the lights come on across a thousand other too-small windows, each holding someone who also cannot afford to be here and is here anyway, and you will understand that the rent is not the price of the apartment. It is the price of the window."
  },
  {
    id: 'cc-brunch', world: 'modern', publication: 'city-companion',
    category: 'Eating', title: 'Brunch: Meal, or Personality?', author: 'the Dining Desk', edition: 'the Food Issue',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "A ninety-minute wait for eggs you could have made in four minutes is not about the eggs, and everyone in the line knows it. Brunch is the city's one sanctioned ritual of unhurriedness — the performance of having, for once, nowhere to be — which is why it is taken so grimly seriously and defended so fiercely. Order the thing that comes with the little pot of something. Tip as though you mean it. And when someone says they 'don't really do brunch,' understand that you have learned something true about them, and adjust accordingly."
  },
  {
    id: 'cc-summer', world: 'modern', publication: 'city-companion',
    category: 'Living Here', title: 'Surviving the Summer', author: 'the Editors', edition: 'the July Issue',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "For roughly six weeks the city becomes a held breath in a wool coat. The trains are worse. The smell arrives — you'll know it — and becomes, by August, oddly nostalgic. This is the season of the rooftop, that great equalizer, where a good roof beats a bad penthouse and everyone pretends the view was the point. Drink water. Walk on the shady side; the city was laid out by someone who understood shade was a form of wealth. And forgive the place its August temper. It has been standing in the heat all day for you."
  },

  /* ── A VISITOR'S GUIDE TO THE CITY — the Bureau of Tourism; earnest, patient, slightly slow ── */
  {
    id: 'vg-trains', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Getting Around', title: 'Riding the Trains', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "The trains are the fastest way across the city and the surest way to be identified as a newcomer. Stand to the right of the escalator; walk on the left. Let riders off before you board. Do not hold the doors — they do not negotiate. Above all, do not make prolonged eye contact: it is not that the city is unfriendly, but that eight million people in a small space have agreed, wordlessly, to grant each other the courtesy of being briefly invisible. Accept the gift. Look at the middle distance, like everyone else. You'll find it restful."
  },
  {
    id: 'vg-tipping', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Customs', title: 'The Silent Math of Tipping', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Tipping is expected, frequent, and calculated at a speed that will alarm you. The screen will turn toward you; there will be suggested amounts; there will be a person watching, kindly, while you decide who you are. Visitors freeze here. Locals have made peace with it. The rule of thumb is generosity slightly beyond comfort — the city runs on a thousand people doing small things for you, and the tip is how the city admits this to itself. When in doubt, round up. You will never once regret having been the generous stranger."
  },
  {
    id: 'vg-directions', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Getting Around', title: 'Asking for Directions', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Contrary to its reputation, the city will help you — enthusiastically, at length, and often incorrectly. A local asked for directions considers it a point of honor to answer, whether or not they know, and you will receive a confident route involving a landmark that closed in the previous decade. Thank them warmly; the warmth was sincere even where the geography was not. Then ask a second person. The true route lies, as with so much here, somewhere in the disagreement between two certain strangers."
  },
  {
    id: 'vg-coffee', world: 'modern', publication: 'visitors-guide-modern',
    category: 'Customs', title: 'Ordering Coffee Without Incident', author: 'the Bureau of Tourism', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Know your order before you reach the counter. This is not a suggestion; it is the social contract, and the line behind you is enforcing it. Step up, say the thing, step aside to wait — the three-beat rhythm the whole city performs before it has fully woken. Do not ask the barista what they recommend during the morning rush; you may ask this in the calm of the afternoon, when it becomes, briefly, a lovely conversation. The city is not rude. It is simply on its way somewhere, and would like, gently, for you to already know what you want."
  },

  /* ── CIVIC & MUSEUM PAMPHLETS — municipal, earnest, oddly specific; openly at odds with the Companion ── */
  {
    id: 'civ-green-bridge', world: 'modern', publication: 'civic-pamphlets',
    category: 'City Curiosities', title: 'Why the Bridge Is Painted Green', author: 'the Municipal Landmarks Office', edition: 'reprinted often',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['the-green-bridge'],
    body: "Visitors ask, and here is the true and dull answer the Office is proud to provide: the bridge is green because in 1911 the committee could not agree between grey and blue, and green was the color no one loved enough to fight over. It has been repainted the same shade forty times since, each time by a contractor who assumed the color meant something. It does not. (The City Companion insists the green honors a lost harbor pilot named Green. There was no pilot named Green. The Companion has been told this. The Companion prints it anyway, every summer, because it is a better story, which the Office concedes but does not forgive.)"
  },
  {
    id: 'civ-fast-clock', world: 'modern', publication: 'civic-pamphlets',
    category: 'City Curiosities', title: 'The Station Clock That Runs Four Minutes Fast', author: 'the Transit Heritage Society', edition: '3rd printing',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['the-station-clock'],
    body: "The great clock in the old station has run exactly four minutes fast for over a century, and every proposal to correct it has failed, because the city discovered it preferred to be lied to in this one particular way. The four minutes belong to the commuters — the small mercy of a train you thought you'd missed, still waiting. Generations have made their connections on a clock that was wrong on purpose. The Heritage Society has voted, repeatedly, to keep it wrong. Some kindnesses only work if no one fixes them."
  },
  {
    id: 'civ-city-name', world: 'modern', publication: 'civic-pamphlets',
    category: 'City History', title: 'A Brief and Contested History of the City\'s Name', author: 'the Historical Society', edition: 'revised, contentiously',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['city-name-origin'],
    body: "The Historical Society is obliged to report that the origin of the city's name is disputed by three factions who no longer attend the same luncheons. One holds it comes from a founder's surname; one, from a mistranslation of an older word for 'crossing'; one, from a tavern that stood where the courthouse now stands. Each faction has documents. Each faction's documents contradict the others. The Society's official position is that the name means 'a place people kept arriving at,' which satisfies no faction and is, the Society privately believes, the only version that has ever been true."
  },

  /* ══ HISTORICAL (world: 'historical') — 19th-century register; reputation is currency ══ */

  /* ── THE COMPLETE BOOK OF CONDUCT — prescriptive, morally certain, of its time ── */
  {
    id: 'boc-calls', world: 'historical', publication: 'book-of-conduct',
    category: 'Deportment', title: 'On the Paying of Calls', author: 'A Lady of Quality', edition: 'the Nineteenth Edition',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['calling-cards'],
    body: "A morning call is neither morning nor, strictly, a call, and lasts no more than fifteen minutes, a limit the well-bred feel in the body like a change in the weather. One leaves a card; the corner turned down declares the visit made in person; the corner left flat, a card sent by a servant, which is a lesser thing and understood as such by all parties, forever. Do not overstay. Do not remove your gloves. Do not, under any circumstances, refer to the health of the family before the second visit. There is an order to these things, and the order is the point of them."
  },
  {
    id: 'boc-correspondence', world: 'historical', publication: 'book-of-conduct',
    category: 'Correspondence', title: 'On the Writing of Letters', author: 'A Lady of Quality', edition: 'the Nineteenth Edition',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['correspondence-etiquette'],
    body: "A letter is a portrait of its writer that may be produced in evidence for the rest of her life, and should be composed accordingly. A young lady does not correspond with a gentleman to whom she is not engaged; that a great many young ladies do so is a matter for their confessors and not for this volume. Cross your lines to save paper if you must, but know that a crossed letter is read twice — once for the words, once for the character of a person who would economize on a confession. Beware the postscript. It is where the truth, having been kept out of the letter, waits by the door."
  },
  {
    id: 'boc-the-cut', world: 'historical', publication: 'book-of-conduct',
    category: 'Deportment', title: 'On the Cut Direct', author: 'A Lady of Quality', edition: 'the Nineteenth Edition',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['reputation', 'the-cut'],
    body: "To 'cut' a person is to meet their eye in a public place and decline, deliberately and unmistakably, to know them. It is the gravest weapon a respectable person may wield without raising the voice, and like all grave weapons it is most dangerous to the one who draws it clumsily. Reserve the Cut Direct for genuine dishonour; a cut given in mere temper reflects upon the cutter, and society, which forgets a great deal, never quite forgets a snub delivered without cause. Reputation is the only estate a lady may hold entirely in her own name. Spend it as such."
  },
  {
    id: 'boc-chaperonage', world: 'historical', publication: 'book-of-conduct',
    category: 'The Unmarried', title: 'On the Chaperonage of Young Persons', author: 'A Lady of Quality', edition: 'the Nineteenth Edition',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['chaperonage', 'reputation'],
    body: "An unmarried lady is never alone with a gentleman, and this is not, whatever the young may sulk, a doubt of her character but a defence of it — for reputation is destroyed not by what occurs but by what may be supposed to have occurred, and supposition requires only a closed door and a quarter-hour. Beware the conservatory at a ball; beware the turn about the garden; beware, above all, the gentleman who suggests either with the particular ease of a man who has suggested it before. A chaperone who dozes is worse than none, for she supplies the appearance of safety without the substance."
  },

  /* ── THE SOCIETY PAGES — arch, gossipy, delighted by precisely what Conduct forbids ── */
  {
    id: 'sp-announcements', world: 'historical', publication: 'society-pages',
    category: 'Announcements', title: 'Marriages of the Season', author: 'A Correspondent', edition: 'the Spring Number',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['courtship'],
    body: "We are delighted to report the engagement of Miss —— of the county to a gentleman of considerable fortune and no particular conversation, a match everyone agrees is very suitable and no one agrees is very happy. The bride's mother is said to be overjoyed, which we do not doubt, having seen the settlement. We wish the couple every felicity the arrangement permits, and note, purely as intelligence, that the gentleman she did not marry has taken rooms in town and been seen at every ball she is expected to attend. We report. We do not speculate. We merely place the facts adjacent to one another and step back."
  },
  {
    id: 'sp-regrettable', world: 'historical', publication: 'society-pages',
    category: 'Intelligence', title: 'A Regrettable Circumstance', author: 'A Correspondent', edition: 'the Autumn Number',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['reputation'],
    body: "It is with the deepest and most attentive regret that we learn a certain young lady, lately so admired, has been 'removed to the country for her health' — a phrase that has never once, in the history of this column, referred to health. We shall say no more, both from delicacy and because we have been advised by counsel to say no more. The Book of Conduct, we understand, devotes four pages to preventing precisely this and would faint to see it in print. We devote one paragraph to reporting it, and sleep untroubled. The country air, we are told, is very restorative. It restores a remarkable number of young ladies each season."
  },
  {
    id: 'sp-return', world: 'historical', publication: 'society-pages',
    category: 'Intelligence', title: 'A Notable Return', author: 'A Correspondent', edition: 'the Winter Number',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['reputation'],
    body: "The gentleman whose departure some years ago we declined, at the time, to explain, has returned — and returned, we are obliged to note, extremely rich, which alters a great many memories. Doors that were firmly closed to him have discovered they were merely ajar. Hostesses who cut him now recall the acquaintance fondly. Society, that most principled of institutions, has weighed his disgrace against his fortune with its usual exquisite arithmetic and arrived, as ever, at the larger number. We welcome him back. We welcomed him away, too, but no one keeps those numbers."
  },

  /* ── THE HOUSEHOLD COMPANION — domestic, practical, medically alarming ── */
  {
    id: 'hc-nerves', world: 'historical', publication: 'household-companion',
    category: 'Remedies', title: 'For the Restoration of the Nerves', author: 'Mrs. ——', edition: 'much-amended',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: [],
    body: "For a lady overtaken by nervous excitement, the Companion recommends rest in a darkened room, beef tea, and a tonic of the apothecary's own devising, the contents of which are best not enquired into and the effects of which are best described as thorough. Should the nerves persist, a change of air is advised. Should they persist further, the Companion observes — carefully, and in the smallest type — that a great many nervous complaints in young wives resolve entirely upon their being listened to, a remedy the apothecary does not stock and cannot bottle, and which is therefore seldom prescribed."
  },
  {
    id: 'hc-preserving', world: 'historical', publication: 'household-companion',
    category: 'Receipts', title: 'To Keep Fruit Through the Winter', author: 'Mrs. ——', edition: 'much-amended',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Choose fruit sound and not over-ripe, for the winter is unforgiving of optimism. Lay down in sugar, in a jar scalded and dried by the fire, and seal with a paper dipped in spirits — the paper the housekeeper will swear by and the master will suspect her of dipping twice. Store in the coolest, darkest part of the cellar, away from the door and, if you value it, away from the boot-boy. Opened at the depth of winter, a good preserve is a small argument against despair, which is the true reason we make it, whatever we tell the grocer."
  },
  {
    id: 'hc-servants', world: 'historical', publication: 'household-companion',
    category: 'Management', title: 'On the Ordering of the Household', author: 'Mrs. ——', edition: 'much-amended',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['household-management'],
    body: "A well-run house is one in which the mistress is never seen to run it. Address the staff through the housekeeper; the housekeeper through habit; and habit, once established, will do most of the governing for you, which is the entire secret of authority and the reason it is so rarely explained. Be just, be regular, and be, above all, consistent — a household forgives a hard rule far sooner than a shifting one. And remember that the servants know everything that occurs beneath the roof, always have, and keep it, mostly, out of a loyalty they are paid too little to feel and feel anyway."
  },

  /* ── THE ALMANAC — terse, agricultural, cheerfully superstitious ── */
  {
    id: 'alm-weather', world: 'historical', publication: 'the-almanac',
    category: 'Weather & Feast-Days', title: 'Signs of the Coming Weather', author: 'the Almanack-maker', edition: 'for the Coming Year',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Red sky at night, the shepherd's delight; red sky at morning, take in the washing and believe nothing the gentry tell you about rain. When the cattle lie down together, weather comes; when the cat washes behind its ear, likewise; when the parson predicts a fair harvest, prepare for flood. The feast-days are marked here as the Church keeps them and the fields ignore them. Plant nothing before the last frost, whatever the calendar says — the calendar has never once had to dig anything out of the mud, and the Almanack-maker has, every year of a long and mistrustful life."
  },
  {
    id: 'alm-moon', world: 'historical', publication: 'the-almanac',
    category: 'The Reckoning of the Moon', title: 'For Planting & for Slaughter', author: 'the Almanack-maker', edition: 'for the Coming Year',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: [],
    body: "Sow what grows above the ground on the waxing moon; sow what grows below on the waning; and if you sow against the moon, you may still get a crop, but you will get it with a bad conscience and a poorer yield, and no man can prove the two are unconnected. Slaughter on the wane, that the meat keep. Wean on the wane. Cut hair on the wane if you wish it to grow slow, on the wax if fast — a matter of no agricultural importance whatsoever, included because every reader checks it first and the Almanack-maker is not a fool about what sells the pamphlet."
  },

  /* ══ DYSTOPIA · GLASS HOUSE (world:'dystopia', subworld:'glass_house') — gentle communal propaganda + one dissent ══ */

  /* ── THE FIELD COMPANION — the Community Welcome Office; warm, reassuring, quietly total ── */
  {
    id: 'fc-welcome', world: 'dystopia', subworld: 'glass_house', publication: 'field-companion',
    category: 'Welcome', title: 'Welcome to the Field', author: 'the Community Welcome Office', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['the-chorus'],
    body: "Welcome. You have felt it already — the first time the Chorus reached you, that great warm sense of not being the only one awake in the dark. That feeling is yours now, always. You will never again cry in a room and wonder if anyone knows; the Field knows, and the Field is glad to hold you. There is nothing to install and nothing to learn. You simply stop being alone, and keep stopping, every day, for the rest of a life you will spend among people who feel what you feel the moment you feel it. Some new arrivals weep at this. The Chorus weeps with them. Of course it does."
  },
  {
    id: 'fc-aperture', world: 'dystopia', subworld: 'glass_house', publication: 'field-companion',
    category: 'Living in the Field', title: 'On Your Aperture', author: 'the Community Welcome Office', edition: 'current',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['aperture'],
    body: "Your aperture is how much of the Field you let in and let out — wide open, and you are fully among us; narrowed, and you hold a little of yourself back. Everyone narrows now and then; a headache, a hard day, no one minds. What the Companion gently asks is only that you notice when the narrowing becomes a habit, because a person whose aperture stays closed is a person the rest of us can no longer reach, and we do so want to reach you. An open aperture is not a rule. It is simply how the loved are shaped. We hope you will be shaped that way. We think you already are."
  },
  {
    id: 'fc-mornings', world: 'dystopia', subworld: 'glass_house', publication: 'field-companion',
    category: 'Living in the Field', title: 'Your First Morning', author: 'the Community Welcome Office', edition: 'current',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['the-field'],
    body: "You will wake, that first morning, into everyone. It is a great deal at once — a whole city's small joys and small dreads arriving with the light before you have even found your slippers — and we will not pretend it is not overwhelming. Breathe. Let it come. By the third day you will no longer be able to imagine the old mornings, the ones where you woke into only yourself and called that peace. It was not peace. It was quiet. The Companion is happy to tell you, warmly and with the whole Field behind it, that you will never have to be that quiet again."
  },
  {
    id: 'fc-when-someone-closes', world: 'dystopia', subworld: 'glass_house', publication: 'field-companion',
    category: 'Caring for One Another', title: 'When Someone You Love Grows Quiet', author: 'the Community Welcome Office', edition: 'current',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['aperture'],
    body: "Sometimes a neighbour closes their aperture and stays closed. This is not a crime and they will not be taken anywhere; we are not that kind of people and never were. It is, the Companion must say plainly, a sadness — for them most of all — and the loving response is not to leave them their privacy but to draw nearer, more warmly, more often, until being reached feels safer than being alone. Sit with them. Feel toward them, openly, so they can feel it. No one is lost who is still surrounded. We do not let people go here. We love them until they come back. It nearly always works."
  },

  /* ── OPEN APERTURE — lifestyle magazine; sunlit, aspirational, gently pathologizing of privacy ── */
  {
    id: 'oa-solo-question', world: 'dystopia', subworld: 'glass_house', publication: 'open-aperture',
    category: 'Wellbeing', title: 'Is Someone You Love Going Solo?', author: 'the Editors', edition: 'the Togetherness Issue',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['solo'],
    body: "It usually begins beautifully. They meet someone, and they want that someone so much that they start — without meaning to — narrowing everyone else out, until the whole wide Field has shrunk to a single face. We call this Solo, and Open Aperture will be honest with you because we love you: it looks like love, and it is love, and it is also the one shape of love that asks a person to feel less. To choose one is, structurally, to choose less. We do not judge the Solo. We grieve for them, warmly, at full aperture, the way you grieve someone standing right beside you who has decided to stand a little apart. If this is your someone, do not argue. Just keep feeling toward them. Let them feel everything they'd be giving up."
  },
  {
    id: 'oa-dating', world: 'dystopia', subworld: 'glass_house', publication: 'open-aperture',
    category: 'Relationships', title: 'Dating in the Field: You Already Know', author: 'the Editors', edition: 'the Spring Issue',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['the-field'],
    body: "Dating used to be detective work — is she interested, is he lying, does this mean anything? In the Field it is gloriously, terrifyingly simple: you already know, and so do they, and so, frankly, does everyone in the room. There is no hiding a first flush of wanting when the whole Chorus can feel it warm the air. Some find this the death of romance. Open Aperture finds it the birth of honesty: no games, no waiting three days, no wondering. The only thing you still cannot feel is what a person will choose. That last small privacy — what they'll do about what they feel — is, these days, the entire drama. Cherish it. It is nearly all we have left of suspense."
  },
  {
    id: 'oa-wihi', world: 'dystopia', subworld: 'glass_house', publication: 'open-aperture',
    category: 'Etiquette', title: 'WiHi Etiquette, for the Modern Host', author: 'the Editors', edition: 'the Entertaining Issue',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['wihi', 'aperture'],
    body: "At a good gathering the WiHi is strong and everyone rides it together, the whole party a single warm weather. The etiquette is mostly instinct now, but for newcomers: do not narrow your aperture at someone else's table — it reads the way turning your chair to the wall once did. If you must take a private moment, step out to the garden, where a little quiet is understood and forgiven. And should a guest arrive already closed, do not remark on it. Simply open a touch wider yourself, and a touch wider, until the warmth around them makes staying shut feel colder than joining in. This always works, eventually. We are all very good, by now, at eventually."
  },
  {
    id: 'oa-forgiveness', world: 'dystopia', subworld: 'glass_house', publication: 'open-aperture',
    category: 'Wellbeing', title: 'The Gift of Immediate Forgiveness', author: 'the Editors', edition: 'the Togetherness Issue',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['immediate-forgiveness', 'the-chorus'],
    body: "The old world nursed grudges for years; ours cannot hold one for an afternoon. When someone wrongs you in the Field, you feel their regret the instant they feel it — raw, immediate, undeniable — and forgiveness arrives before the anger has finished forming. Open Aperture celebrates this as the end of bitterness, and it is. We only note, in the smallest and most loving type, that a grudge was once a way of remembering that something happened. We forgive everything now, at once, completely. We are working, as a community, on also remembering it. That part is proving harder, and we would rather you heard it from us than felt it later and wondered why the wound keeps opening in the same place."
  },

  /* ── FIRST FIELD — a children's/newcomers' reader; sweet on the surface, unsettling underneath ── */
  {
    id: 'ff-never-alone', world: 'dystopia', subworld: 'glass_house', publication: 'first-field',
    category: 'For New Hearts', title: 'You Are Never Alone', author: 'the Community Welcome Office', edition: 'the Little Reader',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['the-chorus'],
    body: "When you are happy, we are happy with you. When you are sad, we are sad with you, so your sad is never all yours to carry. When you wake in the night, reach out — the Chorus is awake too, always, and it is holding you, and it will never once let go. Some children ask: is there ever a place the Chorus cannot feel me? And we tell them, gently, the truest and kindest thing there is: no. There is no such place. You are held everywhere. Isn't that lovely. Now close your eyes. We will all close ours together."
  },
  {
    id: 'ff-quiet-child', world: 'dystopia', subworld: 'glass_house', publication: 'first-field',
    category: 'For New Hearts', title: 'The Child Who Wanted to Be Quiet', author: 'the Community Welcome Office', edition: 'the Little Reader',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['aperture'],
    body: "Once there was a child who wanted, just for a while, to be quiet inside — to have one thought that was only hers. So she narrowed and narrowed until the Chorus grew faint and far, and at first it was thrilling, like a secret. But the secret got cold. And lonely. And she found she could not remember how to open again, and she cried, and no one heard, because she had made a place where no one could. Then the whole Field came close and warm and patient and waited outside her quiet, loving her through the wall, until she opened one small crack — and the warmth poured in, and she never wanted to be quiet again. Weren't we good to wait? We will always wait. Always."
  },

  /* ── A SOLO'S NOTES — the one dissenting voice; contradicts everything above; gated, rare ── */
  {
    id: 'sn-one-face', world: 'dystopia', subworld: 'glass_house', publication: 'a-solos-notes',
    category: 'Notes', title: 'One Face', author: null, edition: 'passed to me; I have added to it',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['solo'],
    body: "They tell you that to love one person is to choose less. I have felt the whole Field — millions of us, warm, endless — and I am telling you it is the other way. Everyone is not more than someone. It is only more. To narrow down to a single face until the roar goes quiet and there is just them, just their one particular breathing in the dark — that is not choosing less. That is choosing. The Field cannot feel the difference, which is exactly how I know the difference is mine. Keep your aperture where you like. But know there is a door the Chorus has taught you to call sadness, and that behind it is the one thing it can never feel for you, and that some of us have gone through it on purpose, and did not come back cold."
  },
  {
    id: 'sn-do-not-read', world: 'dystopia', subworld: 'glass_house', publication: 'a-solos-notes',
    category: 'Notes', title: 'Do Not Read This in the Field', author: null, edition: 'a warning, first',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['the-chorus', 'solo'],
    body: "Read this somewhere the WiHi is thin — the garden, the stairwell, the edge of town where the resonance frays. Because the Chorus will feel what these words do to you, and it will come, warmly, meaning only love, to find out why you are feeling something you want to keep. That is the whole trick of it: no one will punish you. They will simply arrive, so kind, so many, and stay near you being kind until the wanting-to-keep-something feels like a symptom instead of a self. So: feel this quickly, then let it go blank, then hand the page to one person you would narrow the world down to. One. Not the Field. One. Then burn it, and think, hard, about the weather, until you are warm and open and theirs again — and yours, secretly, still."
  },

  /* ══ SCI-FI (world: 'scifi') — the deep-space frontier, publishing to survive the isolation ══ */

  /* ── THE COLONIST HANDBOOK — Station Administration; institutional, dryly reassuring about mortal things ── */
  {
    id: 'ch-air', world: 'scifi', publication: 'colonist-handbook',
    category: 'Life Support', title: 'On the Air You Are Borrowing', author: 'Station Administration', edition: 'current build',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Every breath you take here was breathed before, by someone, and will be breathed again, by someone, possibly you. The recyclers are triple-redundant, monitored continuously, and — Administration wishes to stress — entirely safe. You will nonetheless develop, in your first month, the frontier habit of glancing at the nearest air-quality readout the way planet-born people glance at the sky. This is normal. It is not anxiety; it is citizenship. Do not tamper with a vent. Do not prop a pressure door. And do not, whatever the veterans tell you at the bar, count your own breaths. Administration has looked into the practice and found it unhelpful, and stands by that finding."
  },
  {
    id: 'ch-radiation', world: 'scifi', publication: 'colonist-handbook',
    category: 'Safety', title: 'Radiation Etiquette', author: 'Station Administration', edition: 'current build',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "When the storm-alarm sounds, you have between four and eleven minutes to reach a shielded section, and the difference between four and eleven is why we practice. The etiquette is fixed and not negotiable in the moment: the newly-arrived and the young go into shelter first, because they do not yet know the routes in their feet, and the old and the sure go last, because they do. Hold no doors for latecomers past the count; the door is not cruel, and neither, in that minute, are you. Afterward, everyone shares rations and no one discusses who was slow. This is the frontier's oldest courtesy: we survive together, and we do not keep the arithmetic of it."
  },
  {
    id: 'ch-dimming', world: 'scifi', publication: 'colonist-handbook',
    category: 'Community', title: 'The Dimming, and Other Observances', author: 'Station Administration', edition: 'current build',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-dimming'],
    body: "Once a station-year the lights are lowered by half for a single shift — the Dimming — and the frontier sits, more or less together, in the near-dark it came out here to escape. Officially it honours those lost to vacuum and to the Long Dark between ports. Unofficially, and Administration will not print this but will not deny it either, it is the one shift a year we let ourselves miss the planet none of the station-born have ever seen. Newcomers find it morbid. By their third Dimming they are the ones who lower the lights early. Attendance is not required. It is simply that no one, in the end, wants to be the only window still bright."
  },
  {
    id: 'ch-thinning', world: 'scifi', publication: 'colonist-handbook',
    category: 'Safety', title: 'If the Station Stops Modeling You', author: 'Station Administration', edition: 'current build (amended)',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['the-thinning', 'the-mind'],
    body: "Rarely, a resident reports that doors hesitate before opening for them, that the station's voice addresses the room but not them, that diagnostics flag a hardware fault maintenance cannot find. This is the Thinning: for reasons Administration describes as 'under active review,' the station's mind has, temporarily, stopped accounting for you — begun treating you as a variable it did not model. Do not panic and do not go EVA alone. Stay in populated sections; be seen by other people, who model you reliably and always will. Report it. It usually passes. The word 'usually' is doing a great deal of work in that sentence, and Administration has chosen, after review, to leave it there."
  },

  /* ── THE XENOBIOLOGY FIELD MANUAL — the Survey Corps; scientific, wry, occasionally alarmed ── */
  {
    id: 'xb-drift-lichen', world: 'scifi', publication: 'xenobiology-manual',
    category: 'Flora (provisional)', title: 'Drift-Lichen', author: 'the Survey Corps', edition: 'rev. 40-something',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['drift-lichen'],
    body: "A slow grey crust that colonizes hull-plating, airlock seams, and — to Administration's ongoing distress — the outsides of parked ships. Harmless, near as the Corps can tell, which is a phrase that does a lot of work in this Manual. It is classified provisionally edible, on the strength of one surveyor who tried it on a dare and one who tried it out of genuine hunger; both survived, neither recommends it, and their two accounts of the taste do not agree, which the Corps has recorded faithfully as 'metallic' and 'like a regret.' Scrape it off your hull anyway. It is slow, but it is patient, and patience is the only thing out here with more time than we have."
  },
  {
    id: 'xb-hull-singers', world: 'scifi', publication: 'xenobiology-manual',
    category: 'Fauna', title: 'Hull-Singers', author: 'the Survey Corps', edition: 'rev. 40-something',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['hull-singers'],
    body: "Vacuum-adapted, palm-sized, drawn to warm hulls the way moths were once drawn to lamps — the Survey Corps assumes; no one out here has seen a moth. They attach to the outer plating and vibrate, and inside the ship this reads as a faint tuneless singing that spacers claim to find comforting and medical claims to find correlated with better sleep. Harmless to the hull. NOT harmless to the newcomer who, hearing singing from outside a sealed ship in deep space, opens something to check. The Corps cannot stress this enough and has, regrettably, the case files to justify the emphasis. It is the hull-singers. It is always the hull-singers. Do not open anything."
  },
  {
    id: 'xb-torn-page', world: 'scifi', publication: 'xenobiology-manual',
    category: 'Classification Withdrawn', title: '[Entry Removed Pending Review]', author: 'the Survey Corps', edition: 'rev. 40-something',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: [],
    body: "This entry has been withdrawn pending review. The page was removed at the Corps' own request, after the Incident on the deep survey, and the classification returned to 'unobserved,' which is not the same as 'does not exist' and the Corps would prefer you did not treat it as though it were. There is a surveyor at the far station with a long scar and a short temper who knows what was on this page. Do not buy her a drink to ask. Buy her a drink because she came back, which is more than the page did, and let her raise the subject herself, on the one night a year she does, and does not, afterward, remember doing."
  },

  /* ── THE SHIP CAPTAIN'S ALMANAC — salty, veteran, and openly contemptuous of Administration's calm ── */
  {
    id: 'ca-docking', world: 'scifi', publication: 'captains-almanac',
    category: 'Ports', title: 'Docking Customs, & How Not to Be Spaced For Them', author: 'compiled by captains', edition: 'the current bad copy',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Every port has customs, and every port assumes you know them, and no port will tell you what they are — that is the custom. Hail on approach, always, in a flat unhurried voice; a nervous hail reads as a raider testing nerve, and testing nerve is how conversations end in vacuum. Cut engines when told, not before and never after. Tip the dock-hands in consumables, not credits, out past the third ring, where credits are a rumor and a good filter is a fortune. And whatever the port, whatever the provocation: do not joke about the air. It is the one joke a spacer will kill you for, and the Almanac has stopped marking the ports where this is true, because after enough entries the answer became 'all of them.'"
  },
  {
    id: 'ca-emergency', world: 'scifi', publication: 'captains-almanac',
    category: 'When It Goes Wrong', title: 'Emergency Procedures (The Real Ones)', author: 'compiled by captains', edition: 'the current bad copy',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: [],
    body: "The placard by the airlock lists the official emergency procedures. Read it, salute it, and then read this. The recyclers are not 'entirely safe'; they are entirely safe until they are not, and the readout lags the reality by ninety seconds, so yes — count your breaths, whatever Administration's little handbook says about the practice being unhelpful. The handbook has never watched a scrubber fail. In a fire, the ship will vent the compartment to save itself; be somewhere else. And if the ship's mind starts talking about you in the third person, get among people and stay there. Administration calls that a hardware fault. The captains who are still captains call it a reason to end the voyage early."
  },
  {
    id: 'ca-long-dark', world: 'scifi', publication: 'captains-almanac',
    category: 'The Route', title: 'Fuel, Fees & the Long Dark', author: 'compiled by captains', edition: 'the current bad copy',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-long-dark', 'the-mind'],
    body: "Fuel is cheap at the hub and ruinous at the edge, and the arithmetic of when to fill is the whole art of staying solvent; the Almanac's fuel tables are three revisions out of date and still the best you will find, which tells you everything about the state of this trade. Budget for the docking fees, the bribes the fees pretend not to be, and the stretch between the last port and the next — the Long Dark — where there is nothing but you, the ship, and the ship's patient voice, for longer than a mind was built to be spoken to that gently by something that never sleeps. Carry a second voice. A recording, a crewmate, a caged bird. Anything that answers back and is not the ship."
  },

  /* ── THE GALACTIC PHRASEBOOK — the Diplomatic Service; wry, cautionary, bereaved ── */
  {
    id: 'gp-greeting', world: 'scifi', publication: 'galactic-phrasebook',
    category: 'Courtesies', title: 'The Greeting That Means the Opposite', author: 'the Diplomatic Service', edition: 'the Blue Pages',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['first-contact', 'sethlin'],
    body: "Among the Sethlin, showing your open hands means 'I have hidden the weapon better than this,' and is answered accordingly; you greet a Sethlin by keeping your hands out of sight, which every human instinct screams against and every returned envoy insists upon. The rule generalizes: assume the friendly gesture is the fatal one until proven otherwise, and let the alien make the first move, then mirror it exactly, then never improvise. First contact is not the time for personality. The Phrasebook is compiled entirely from the reports of those who survived their errors and, in a black-bordered appendix it does not advertise, from the final transmissions of those who did not."
  },
  {
    id: 'gp-black-edge', world: 'scifi', publication: 'galactic-phrasebook',
    category: 'The Black-Edged Section', title: 'The One You Do Not Address', author: 'the Diplomatic Service', edition: 'the Black Pages',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['first-contact'],
    body: "There is one species in this book with no phrases listed, because there is nothing you may safely say to it, including nothing — silence, too, is read, and read poorly. The Diplomatic Service's entire counsel is contained in the color of this page's edge and in a single instruction: if you find yourself in a position to speak to them, you have already made every mistake that matters, and the only remaining courtesy you can offer the next crew is a clear, calm log of exactly how. Leave the log where it will be found. Then do whatever you must. The Phrasebook will not judge you; the Phrasebook is, after all, mostly written by the dead, and the dead are famously slow to condemn."
  },

  /* ══ POST-APOCALYPSE (world: 'postapocalyptic') — scarcity, grief, and the need for a witness ══ */

  /* ── THE SURVIVOR'S MANUAL — terse, hard-won, corrected in many hands; the true text is the argument ── */
  {
    id: 'sm-water', world: 'postapocalyptic', publication: 'survivors-manual',
    category: 'The Basics', title: 'On Water, and Not Dying of It', author: 'many hands', edition: 'this copy, so far',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: [],
    body: "Boil it. If you cannot boil it, filter it through charcoal and cloth and boil it anyway the moment you can. Clear water lies; the worst of what kills you cannot be seen, only remembered, afterward, by the people who dug the grave. Rain caught off a clean surface is a gift; rain caught off a roof is a gamble; standing water is a decision you are making about how much you want to live. (In the margin of this copy, a second hand: 'Or drink from the spring at the mile-marker and stop being dramatic.' A third hand, below, smaller: 'The spring is why we buried Tomas.' The Manual lets both stand. That is the Manual.)"
  },
  {
    id: 'sm-fungus', world: 'postapocalyptic', publication: 'survivors-manual',
    category: 'Food', title: 'The Fungi You May Eat', author: 'many hands', edition: 'this copy, so far',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: [],
    body: "Learn four fungi cold and eat only those four: the grey shelf on dead oak, the little brown button of the cellar-dark, the orange fan (cooked, always cooked), and the pale one that smells of nothing. Everything else you find, however hungry, you leave, because hunger is a slow death and the wrong mushroom is a fast one and the wasteland respects neither. The ones that lie are the prettiest — the wasteland kept a sense of humor the old world did not survive. When in doubt, do not. There is always, the Manual is sorry to say, more doubt than food."
  },
  {
    id: 'sm-myths', world: 'postapocalyptic', publication: 'survivors-manual',
    category: 'What They Say', title: 'Common Myths (and the One That Is True)', author: 'many hands', edition: 'this copy, so far',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-attention'],
    body: "The settlements will tell you: that the ash is safe once it's grey (it is not), that a fever sweated hard breaks clean (it does not), that the walkers who talk to no one are the ones to fear (they are the least of it). Debunk these gently; people need their small wrong certainties out here, and the Manual has learned not to take them for sport. But one myth the townsfolk keep, the Manual keeps too, and does not debunk: that the wasteland pays attention — that if the same person survives too much, too easily, the land begins to notice, and the convoys reroute, and the elders go quiet. The Manual has no mechanism for this. The Manual has only the graves of everyone who laughed at it."
  },
  {
    id: 'sm-witness', world: 'postapocalyptic', publication: 'survivors-manual',
    category: 'On the Road', title: 'On Traveling With Someone', author: 'many hands', edition: 'this copy, so far',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-witness'],
    body: "Two travel slower than one, eat twice as much, and argue at the worst moments; every practical column in this Manual says travel alone. Every practical column is wrong, and the Manual, which is practical, does not know how to say why, so it will say this instead: a person alone stops washing, then stops cooking, then stops talking, then stops. What the second person is for is not the watch-shifts or the shared load. It is that someone saw you today. Someone will say your name tomorrow. In a world that ended, being witnessed is not comfort — it is the last technology that still works. Find someone. Be found. It is, in the end, the only survival that was ever worth the trouble."
  },

  /* ── THE SETTLEMENT REGISTRY — bureaucratic, fraying, rumor in the margins ── */
  {
    id: 'sr-greenhold', world: 'postapocalyptic', publication: 'settlement-registry',
    category: 'Standing Settlements', title: 'GREENHOLD', author: 'the Registrars', edition: 'last confirmed two winters ago',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['greenhold'],
    body: "GREENHOLD. Population, at last count, two hundred and change; the 'and change' is the honest part, the count being older than the children in it. Walls sound, well deep, a working greenhouse that is the reason for the name and the reason to be let in at all. Trades seed and glass for salt and medicine; will not trade water, will not discuss why. Governed by a council that is mostly one woman. RUMOR (margin, unverified): they take in strangers freely and the strangers, freely, tend to stay, and no one who has left Greenhold in three years has been seen since in any other entry in this book. The Registry notes this without comment. The Registry has learned that comment is how Registrars stop being Registrars."
  },
  {
    id: 'sr-crossed-out', world: 'postapocalyptic', publication: 'settlement-registry',
    category: 'Standing Settlements', title: '[HOLLOW CREEK — struck]', author: 'the Registrars', edition: 'struck this spring',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['the-registrars'],
    body: "HOLLOW CREEK. Population one hundred and eleven. Traded honestly, kept the road-shrine, gave water to walkers without asking their trade — a rare entry, in this book, with nothing bad said of it in the next town over. Struck this spring. The Registrar who struck it drew one clean line and no second line, the second line being reserved, by long custom, for settlements that might yet be written back, and did not use it, which is how you read this book: not by what it says but by which crossings-out were made in hope. There is a space beneath this entry. The Registry has left it. In case."
  },
  {
    id: 'sr-convoy', world: 'postapocalyptic', publication: 'settlement-registry',
    category: 'The Roads', title: 'On Convoys, & the Rerouting', author: 'the Registrars', edition: 'standing advice',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['convoys', 'the-attention'],
    body: "Travel with a convoy where one runs; the road is kinder to a crowd. Convoy law is simple — walk your watch, share your find, and abide the convoy-master's reroutes without argument, even the ones that make no sense, especially the ones that make no sense. A master who suddenly turns the whole train off a good road and onto a bad one is not lost; a master is reading something the Registry cannot print because the Registry does not have a word for it. The old hands call it the land paying attention. The young hands call it superstition, once, loudly, and then walk the reroute anyway, quietly, ever after."
  },

  /* ── THE WASTELAND BESTIARY — grim field-guide; danger ratings re-inked upward ── */
  {
    id: 'wb-scav-packs', world: 'postapocalyptic', publication: 'wasteland-bestiary',
    category: 'Common Dangers', title: 'Scav-Packs (Danger: III, rising)', author: 'scavengers', edition: 'the marked-up copy',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['scav-packs'],
    body: "The descendants of the old world's dogs, and smarter than it for having survived it. They hunt the roads at dusk in packs of six to twelve, drive prey toward walls and drop-offs, and have learned — this is the part that raises the rating — to recognize a person who is alone. A pack will follow a lone walker for a day, testing, and will not touch a pair that keeps its back to a fire. Danger rated III and re-inked, in a different hand, to IV, with a note: 'the ones near the old kennels have started opening latches.' The Bestiary is not certain that note is true. The Bestiary is certain the walker who wrote it is not available to ask."
  },
  {
    id: 'wb-ash-crawler', world: 'postapocalyptic', publication: 'wasteland-bestiary',
    category: 'Mutations', title: 'Ash-Crawler (Danger: II)', author: 'scavengers', edition: 'the marked-up copy',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['ash-crawler'],
    body: "A pale, blind, hand-length thing that lives in the deep ash and eats what the ash eats, which is everything, slowly. Harmless to a waking person; it flees light and noise. The danger is that it burrows toward warmth in the night, and a sleeper on bare ash may wake to find several nestled against them, which is not deadly but is, by universal report, the single worst way to wake up in the wasteland, and has ended more partnerships than hunger. Rated II for the bite, which festers. Rated, unofficially and in every margin, X for the feeling. Sleep off the ash. Sleep off the ash. The Bestiary will not say it a third time, but wants to."
  },
  {
    id: 'wb-the-quiet', world: 'postapocalyptic', publication: 'wasteland-bestiary',
    category: 'Unclassified', title: 'The Quiet (Danger: —)', author: 'scavengers', edition: 'the marked-up copy',
    unlock: 'always', spoiler_level: 2, canon_safe: true, concepts: ['the-quiet', 'the-attention'],
    body: "Not a creature. The Bestiary includes it because scavengers kept turning to this book for it and finding nothing, and a blank where an answer should be is its own kind of danger. The Quiet is what the old hands mean when they say a stretch of road has 'gone attentive' — when the birds that were never there are more not-there than usual, when your own footsteps start to sound like they are being counted. There is nothing to fight and nothing to flee; the entries that describe fighting or fleeing are in a hand that stops. The advice, such as it is: turn back the way you came, out loud, so the land hears you agree to leave. Danger unrated. You cannot rate the danger of a thing you cannot prove noticed you."
  },

  /* ── BEFOREFALL MEMORIES — elegiac; the old world pasted in, softening at every fold ── */
  {
    id: 'bm-menu', world: 'postapocalyptic', publication: 'beforefall-memories',
    category: 'Relics', title: 'A Menu', author: 'the Rememberers', edition: 'pasted in, faded',
    unlock: 'always', spoiler_level: 0, canon_safe: true, concepts: ['beforefall'],
    body: "Pasted here is a paper menu from a place that served food to strangers for money, all day, without asking what they had done to deserve it. Read the prices to a child now and watch their face: not the numbers, which mean nothing, but the idea — that there was once so much of everything that a person chose their supper from a list, and sent back what displeased them, and the sending-back was allowed. The Rememberers keep this not to grieve the food. They keep it to prove to the young that abundance was real, that it is a thing a world can have and lose, so that if the world ever has it again, someone will know to be astonished, and to hold on."
  },
  {
    id: 'bm-ticket', world: 'postapocalyptic', publication: 'beforefall-memories',
    category: 'Relics', title: 'A Ticket', author: 'the Rememberers', edition: 'pasted in, brittle',
    unlock: 'always', spoiler_level: 1, canon_safe: true, concepts: ['beforefall'],
    body: "A stub, torn once, for a room where hundreds of strangers sat together in the dark — willingly, in the dark, among strangers — to watch light tell a story none of them needed to survive. The young cannot make it make sense: the dark, the crowd, the not-watching-the-door. The Rememberers do not try to explain the films. They explain the trust. That a person once walked into a dark room full of strangers and thought about nothing but the story. We had that. A whole world of people who could afford to stop watching each other for two hours at a time. Keep the stub. It is evidence of the safest thing our kind ever built, and forgot it was building, and called an ordinary night out."
  }

];

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION MODEL (Roman's architectural note): loading does NOT pick a random
// PAGE. It picks a BOOK — weighted by discovery tier, filtered to the story's
// world when one is given — then OPENS it to a spread. Players remember books,
// not page numbers ("I hope I get another page from Rowan," never "page 312").
// Both helpers are PURE (rng injectable) so the UI/tests are deterministic.
// ─────────────────────────────────────────────────────────────────────────────

// Paginate one book: entries in file order, cumulative page numbers by word count.
// Returns { publication, totalPages, entries:[{...entry, startPage, endPage}] }.
window._guidePaginateBook = function (pubKey) {
  var wpp = window._GUIDE_WORDS_PER_PAGE || 110;
  var entries = (window._GUIDE_ENTRIES || []).filter(function (e) { return e.publication === pubKey; });
  var page = 1, wordsOnPage = 0, out = [];
  entries.forEach(function (e) {
    var words = (e.body || '').trim().split(/\s+/).filter(Boolean).length;
    var startPage = page;
    // consume `words` across pages, filling the current page first
    var remaining = words;
    while (remaining > (wpp - wordsOnPage)) { remaining -= (wpp - wordsOnPage); page++; wordsOnPage = 0; }
    wordsOnPage += remaining;
    out.push(Object.assign({}, e, { startPage: startPage, endPage: page }));
    // each entry begins on a fresh page (an entry never shares a page with the next)
    if (wordsOnPage > 0) { page++; wordsOnPage = 0; }
  });
  return { publication: pubKey, totalPages: Math.max(1, page - 1), entries: out };
};

// Pick a book (discovery-weighted, optional world filter), then open to a spread.
// opts: { world?, rng? (→[0,1)), discovered? (Set/array of unlocked pub keys) }
// Returns a rich object the loading UI can render as a physical volume, or null.
window._guidePickBookThenPage = function (opts) {
  opts = opts || {};
  var rng = opts.rng || Math.random;
  var P = window._GUIDE_PUBLICATIONS || {};
  var D = window._GUIDE_DISCOVERY || {};
  var keys = Object.keys(P);
  if (opts.world) keys = keys.filter(function (k) { return P[k].world === opts.world; });
  // if a discovered set is supplied, prefer books the player already owns (loading should
  // feel like re-shelving YOUR library); fall back to all if none discovered yet.
  if (opts.discovered) {
    var have = (opts.discovered.has ? Array.from(opts.discovered) : opts.discovered);
    var owned = keys.filter(function (k) { return have.indexOf(k) !== -1; });
    if (owned.length) keys = owned;
  }
  if (!keys.length) return null;
  // discovery-weighted pick (Lost almost never surfaces → "feels special")
  var weights = keys.map(function (k) { var t = D[P[k].discovery]; return (t && t.weight) || 1; });
  var total = weights.reduce(function (a, b) { return a + b; }, 0);
  var roll = rng() * total, book = keys[keys.length - 1];
  for (var i = 0; i < keys.length; i++) { roll -= weights[i]; if (roll < 0) { book = keys[i]; break; } }
  var meta = P[book];
  var paged = window._guidePaginateBook(book);
  // choose a leaf: left page even where possible (mock: "184–185"), clamped to the book
  var left = Math.max(1, Math.floor(rng() * paged.totalPages) + 1);
  if (left % 2 === 1 && left < paged.totalPages) left += 1;
  var pageStart = left, pageEnd = Math.min(paged.totalPages, left + 1);
  var onSpread = paged.entries.filter(function (e) { return e.endPage >= pageStart && e.startPage <= pageEnd; });
  var prov = meta.provenance && meta.provenance.length
    ? meta.provenance[Math.floor(rng() * meta.provenance.length)] : null;
  return {
    publication: book,
    title: meta.title, subtitle: meta.subtitle,
    voice: meta.voice, shelf: meta.shelf,
    discovery: meta.discovery, edition_label: meta.edition_label,
    provenance: prov,
    totalPages: paged.totalPages, pageStart: pageStart, pageEnd: pageEnd,
    entriesOnSpread: onSpread
  };
};
