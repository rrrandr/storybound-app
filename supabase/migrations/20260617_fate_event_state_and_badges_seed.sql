-- Fix two Supabase write failures observed on Tempt Fate invoke (Roman 2026-06-17).
-- Both are pre-existing schema/seed gaps, non-fatal (the client catches + warns),
-- but they prevent fate-event state from persisting server-side and prevent any
-- badge from ever being earned. Both statements are idempotent / safe to re-run.
--
--   1) profiles PATCH 400 — _syncFateEventToSupabase (app.js) does
--      profiles.update({ fate_event_state: JSON.stringify(state) }) but the column
--      was never added. The client stores a JSON STRING, so the column is text.
--
--   2) user_badges FK 23503 ("user_badges_badge_key_fkey") — the badge catalog
--      (TROPHY_META, app.js:110529) was never seeded into public.badges, so every
--      earned badge violates the FK from user_badges.badge_id. Seed the 12 badges.

-- ── 1. profiles.fate_event_state ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fate_event_state text;

-- ── 2. seed public.badges ────────────────────────────────────────────────────
-- Schema CONFIRMED (Roman 2026-06-17): public.badges is
-- (key, name, description, reward_image_credits, reward_god_mode_days).
-- reward_* default to 0 here; production was seeded with its real reward values
-- and ON CONFLICT (key) DO NOTHING makes this a safe no-op there — these defaults
-- only matter when standing up a fresh DB (adjust rewards if a fresh env needs them).
INSERT INTO public.badges (key, name, description, reward_image_credits, reward_god_mode_days) VALUES
  ('tempt_first',              'First Temptation',          'Invoke Tempt Fate for the first time.',          0, 0),
  ('story_1',                  'First Chapter',             'Complete your first story.',                      0, 0),
  ('story_10',                 'Prolific Author',           'Complete 10 stories.',                            0, 0),
  ('story_100',                'Literary Legend',           'Complete 100 stories.',                           0, 0),
  ('fifth_person',             'Voice of Fate',             'Select 5th Person POV.',                          0, 0),
  ('tempt_disturb_fate',       'Fate Disturbed',            'Tempt Fate 3 times in a single story.',           0, 0),
  ('mastery_modern',           'Modern Mastery',            'Completed a story in every Modern flavor.',       0, 0),
  ('mastery_fantasy',          'Fantasy Mastery',           'Completed a story in every Fantasy flavor.',      0, 0),
  ('mastery_historical',       'Historical Mastery',        'Completed a story in every Historical flavor.',   0, 0),
  ('mastery_sci_fi',           'Sci-Fi Mastery',            'Completed a story in every Sci-Fi flavor.',       0, 0),
  ('mastery_dystopia',         'Dystopia Mastery',          'Completed a story in every Dystopia flavor.',     0, 0),
  ('mastery_post_apocalyptic', 'Post-Apocalyptic Mastery',  'Completed a story in every Post-Apocalyptic flavor.', 0, 0)
ON CONFLICT (key) DO NOTHING;
