-- Denormalize cinegraphic-mode metadata onto library_entries so the
-- Forbidden Library shelf can render a saved cinegraphic novel with the
-- same working-cover identity (cream + Lust-script title + gold credit
-- band) it had during authoring, instead of falling back to the dark
-- generic book-front-text style.

ALTER TABLE public.library_entries
  ADD COLUMN IF NOT EXISTS render_mode          text,
  ADD COLUMN IF NOT EXISTS graphic_style        text,
  ADD COLUMN IF NOT EXISTS back_cover_synopsis  text;
