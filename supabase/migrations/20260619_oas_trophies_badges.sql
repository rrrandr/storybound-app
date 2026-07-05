-- ── OAS endurance trophies: Silver Tongue + All Night Long (Roman 2026-06-19) ──
-- Seeds the two new badges into public.badges so user_badges FK + awardBadge() resolve.
-- Mirrors the 2026-06-17 badges seed. Idempotent: ON CONFLICT (key) DO NOTHING.
--
-- Trigger: app.js fires awardBadge(sb, profileId, key) when intimacyDialogue.beatCount
--   (exchanges within ONE continuous OAS encounter) crosses the threshold:
--     • silver_tongue  → 13 turns
--     • all_night_long  → 100 turns
-- Catalog copy lives in TROPHY_META (app.js); visuals are CSS placeholders
-- (.placeholder-star / .placeholder-triangle) until custom trophy art is rendered.
--
-- Rewards default to 0/0 (purely cosmetic). Bump reward_image_credits /
-- reward_god_mode_days here if you want these to grant perks.

INSERT INTO public.badges (key, name, description, reward_image_credits, reward_god_mode_days) VALUES
  ('silver_tongue',  'Silver Tongue',  'Hold a single intimate exchange for 13 unbroken turns.', 0, 0),
  ('all_night_long', 'All Night Long', 'Carry one encounter through 100 turns. Legendary stamina.', 0, 0)
ON CONFLICT (key) DO NOTHING;
