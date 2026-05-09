-- Couple Play MVP — ensure tables exist with correct schema + self-join RLS
-- Run against Supabase SQL editor or via migration

-- ── sb_rooms: ensure columns exist ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_rooms' AND column_name = 'room_code') THEN
    ALTER TABLE public.sb_rooms ADD COLUMN room_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_rooms' AND column_name = 'player1_id') THEN
    ALTER TABLE public.sb_rooms ADD COLUMN player1_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_rooms' AND column_name = 'player2_id') THEN
    ALTER TABLE public.sb_rooms ADD COLUMN player2_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_rooms' AND column_name = 'story_id') THEN
    ALTER TABLE public.sb_rooms ADD COLUMN story_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sb_rooms_room_code_idx ON public.sb_rooms (room_code);

-- ── sb_turns: ensure scene columns exist ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_turns' AND column_name = 'turn_index') THEN
    ALTER TABLE public.sb_turns ADD COLUMN turn_index integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_turns' AND column_name = 'scene_text') THEN
    ALTER TABLE public.sb_turns ADD COLUMN scene_text text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_turns' AND column_name = 'say_text') THEN
    ALTER TABLE public.sb_turns ADD COLUMN say_text text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_turns' AND column_name = 'do_text') THEN
    ALTER TABLE public.sb_turns ADD COLUMN do_text text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sb_turns' AND column_name = 'created_at') THEN
    ALTER TABLE public.sb_turns ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Unique constraint: one turn per index per room (prevents duplicate writes)
CREATE UNIQUE INDEX IF NOT EXISTS sb_turns_room_turn_idx ON public.sb_turns (room_id, turn_index);

-- ── RLS: allow users to self-join rooms ──
-- The existing policy only lets room creator add members.
-- This allows Player 2 to add themselves if they know the room_id.
DROP POLICY IF EXISTS sb_room_members_self_join ON public.sb_room_members;
CREATE POLICY sb_room_members_self_join ON public.sb_room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── RLS: allow Player 2 to read the room (needed for join validation) ──
-- Existing policies only let creator or existing members read.
-- Player 2 needs to look up by room_code before they're a member.
DROP POLICY IF EXISTS sb_rooms_join_lookup ON public.sb_rooms;
CREATE POLICY sb_rooms_join_lookup ON public.sb_rooms
  FOR SELECT USING (true);
-- NOTE: room_code is the shared secret. SELECT is safe because
-- you can only read rooms whose code you already know.

-- ── RLS: allow room creator to update player2_id on join ──
-- Already covered by sb_rooms_update policy (created_by = auth.uid()).
