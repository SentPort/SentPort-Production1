/*
  # Create Album Media Comments System

  1. New Tables
    - `album_media_comments`
      - `id` (uuid, primary key)
      - `media_id` (uuid, foreign key to album_media.id)
      - `author_id` (uuid, foreign key to hubook_profiles.id)
      - `content` (text, the comment text)
      - `parent_comment_id` (uuid, nullable, for nested replies)
      - `is_edited` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `album_media_comments` table
    - Allow users to view comments on media they can access (based on album privacy)
    - Allow authenticated users to create comments on accessible media
    - Allow users to update/delete their own comments
    - Admin bypass for all operations

  3. Indexes
    - Index on media_id for fast comment lookups
    - Index on parent_comment_id for nested replies
    - Index on author_id for user's comments
*/

-- Create album_media_comments table
CREATE TABLE IF NOT EXISTS album_media_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES album_media(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES album_media_comments(id) ON DELETE CASCADE,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_album_media_comments_media_id ON album_media_comments(media_id);
CREATE INDEX IF NOT EXISTS idx_album_media_comments_parent ON album_media_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_album_media_comments_author ON album_media_comments(author_id);

-- Enable RLS
ALTER TABLE album_media_comments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can access an album (same logic as viewing media)
CREATE OR REPLACE FUNCTION can_access_album_for_commenting(album_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  album_privacy text;
  album_owner_id uuid;
  are_friends boolean;
BEGIN
  -- Get album privacy and owner
  SELECT privacy, user_id INTO album_privacy, album_owner_id
  FROM albums
  WHERE id = album_uuid;

  -- Owner can always access
  IF album_owner_id = user_uuid THEN
    RETURN true;
  END IF;

  -- Public albums are accessible to all authenticated users
  IF album_privacy = 'public' THEN
    RETURN true;
  END IF;

  -- Friends-only albums require friendship
  IF album_privacy = 'friends' THEN
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE ((user_id = album_owner_id AND friend_id = user_uuid) OR
             (user_id = user_uuid AND friend_id = album_owner_id))
        AND status = 'accepted'
    ) INTO are_friends;
    RETURN are_friends;
  END IF;

  -- Private albums only accessible to owner
  RETURN false;
END;
$$;

-- RLS Policies for album_media_comments

-- SELECT: Users can view comments on media they can access
CREATE POLICY "Users can view comments on accessible media"
  ON album_media_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM album_media am
      JOIN albums a ON am.album_id = a.id
      WHERE am.id = album_media_comments.media_id
        AND can_access_album_for_commenting(a.id, auth.uid())
    )
  );

-- INSERT: Authenticated users can comment on accessible media
CREATE POLICY "Users can comment on accessible media"
  ON album_media_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM album_media am
      JOIN albums a ON am.album_id = a.id
      WHERE am.id = media_id
        AND can_access_album_for_commenting(a.id, auth.uid())
    )
  );

-- UPDATE: Users can edit their own comments
CREATE POLICY "Users can edit own comments"
  ON album_media_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- DELETE: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON album_media_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Admin bypass policies
CREATE POLICY "Admins can view all media comments"
  ON album_media_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete any media comment"
  ON album_media_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_album_media_comment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER album_media_comments_updated_at
  BEFORE UPDATE ON album_media_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_album_media_comment_updated_at();