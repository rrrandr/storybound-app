-- Track whether user has entered the Angry Room before (persistent consequence)
-- First entry is free; subsequent entries cost a Fortune.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_entered_angry_room_before BOOLEAN DEFAULT FALSE;
