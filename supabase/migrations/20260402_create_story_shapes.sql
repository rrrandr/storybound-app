-- Saved Story Shapes — reusable corridor configurations
CREATE TABLE IF NOT EXISTS story_shapes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL CHECK (char_length(name) <= 20),
    shape_data jsonb NOT NULL,
    shape_version integer DEFAULT 1,
    is_favorite boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_story_shapes_user_id ON story_shapes (user_id);

-- Limit enforcement: max 20 shapes per user (enforced at app level, not DB constraint)
-- RLS: users can only access their own shapes
ALTER TABLE story_shapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shapes"
    ON story_shapes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
