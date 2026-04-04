/*
  # Create Album Media Reactions System

  1. New Tables
    - `album_media_reactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references hubook_profiles)
      - `media_id` (uuid, references album_media)
      - `reaction_type` (text, check constraint for valid types)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, media_id) - one reaction per user per media

  2. Indexes
    - Index on `media_id` for fast reaction lookups
    - Index on `user_id` for user reaction queries

  3. Security
    - Enable RLS on `album_media_reactions` table
    - Policy for users to view reactions on media they can access
    - Policy for authenticated users to add their own reactions
    - Policy for users to update/delete their own reactions

  4. Functions
    - `get_media_reaction_counts` - Get reaction counts for a media item
    - `get_user_media_reaction` - Get a user's reaction on a media item
*/

-- Create album_media_reactions table
CREATE TABLE IF NOT EXISTS album_media_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES album_media(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'care')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, media_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_album_media_reactions_media_id ON album_media_reactions(media_id);
CREATE INDEX IF NOT EXISTS idx_album_media_reactions_user_id ON album_media_reactions(user_id);

-- Enable RLS
ALTER TABLE album_media_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reactions on media they can access
CREATE POLICY "Users can view reactions on accessible media"
  ON album_media_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM album_media am
      JOIN albums a ON am.album_id = a.id
      WHERE am.id = album_media_reactions.media_id
      AND (
        a.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM friendships f
          WHERE ((f.requester_id = auth.uid() AND f.addressee_id = a.owner_id AND f.status = 'accepted')
             OR (f.requester_id = a.owner_id AND f.addressee_id = auth.uid() AND f.status = 'accepted'))
        )
      )
    )
  );

-- Policy: Authenticated users can add reactions to media they can view
CREATE POLICY "Users can add reactions to accessible media"
  ON album_media_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM album_media am
      JOIN albums a ON am.album_id = a.id
      WHERE am.id = media_id
      AND (
        a.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM friendships f
          WHERE ((f.requester_id = auth.uid() AND f.addressee_id = a.owner_id AND f.status = 'accepted')
             OR (f.requester_id = a.owner_id AND f.addressee_id = auth.uid() AND f.status = 'accepted'))
        )
      )
    )
  );

-- Policy: Users can update their own reactions
CREATE POLICY "Users can update own reactions"
  ON album_media_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON album_media_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get reaction counts for a media item
CREATE OR REPLACE FUNCTION get_media_reaction_counts(p_media_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_object_agg(reaction_type, count)
  INTO result
  FROM (
    SELECT reaction_type, COUNT(*)::int as count
    FROM album_media_reactions
    WHERE media_id = p_media_id
    GROUP BY reaction_type
  ) counts;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to get user's reaction on a media item
CREATE OR REPLACE FUNCTION get_user_media_reaction(p_user_id uuid, p_media_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_reaction text;
BEGIN
  SELECT reaction_type
  INTO user_reaction
  FROM album_media_reactions
  WHERE user_id = p_user_id AND media_id = p_media_id;
  
  RETURN user_reaction;
END;
$$;