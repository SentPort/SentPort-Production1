/*
  # Create Photo Tagging System

  1. New Tables
    - album_media_tags
      - id (uuid, primary key)
      - media_id (uuid, references album_media)
      - tagged_user_id (uuid, references user_profiles)
      - tagger_id (uuid, references user_profiles)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on album_media_tags table
    - Add policies for viewing, creating, and deleting tags
    - Only media owner and tagger can delete tags
    - Everyone can view tags on visible media

  3. Notifications
    - Trigger creates notification when user is tagged
    - Respects user notification preferences
    - Includes photo tag notification type
*/

-- Create album_media_tags table
CREATE TABLE IF NOT EXISTS album_media_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES album_media(id) ON DELETE CASCADE,
  tagged_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tagger_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(media_id, tagged_user_id)
);

-- Enable RLS
ALTER TABLE album_media_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tags on media they can see
CREATE POLICY "Users can view tags on visible media"
  ON album_media_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM album_media am
      WHERE am.id = album_media_tags.media_id
    )
  );

-- Policy: Authenticated users can create tags
CREATE POLICY "Users can create tags"
  ON album_media_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = tagger_id
    AND EXISTS (
      SELECT 1 FROM album_media am
      WHERE am.id = media_id
    )
  );

-- Policy: Tagger and media owner can delete tags
CREATE POLICY "Tagger and media owner can delete tags"
  ON album_media_tags
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = tagger_id
    OR EXISTS (
      SELECT 1 FROM album_media am
      JOIN albums a ON am.album_id = a.id
      WHERE am.id = media_id AND a.owner_id = auth.uid()
    )
  );

-- Policy: Tagged user can delete their own tag
CREATE POLICY "Tagged user can remove tag"
  ON album_media_tags
  FOR DELETE
  TO authenticated
  USING (auth.uid() = tagged_user_id);

-- Trigger function to create photo tag notification
CREATE OR REPLACE FUNCTION notify_user_on_photo_tag()
RETURNS trigger AS $$
DECLARE
  v_tagger_name text;
  v_media_owner_id uuid;
BEGIN
  -- Get tagger's name
  SELECT display_name INTO v_tagger_name
  FROM user_profiles
  WHERE id = NEW.tagger_id;

  -- Get media owner through albums table
  SELECT a.owner_id INTO v_media_owner_id
  FROM album_media am
  JOIN albums a ON am.album_id = a.id
  WHERE am.id = NEW.media_id;

  -- Don't notify if user tagged themselves
  IF NEW.tagged_user_id != NEW.tagger_id THEN
    IF should_send_notification(NEW.tagged_user_id, 'tag') THEN
      INSERT INTO hubook_notifications (
        user_id,
        type,
        actor_id,
        message
      ) VALUES (
        NEW.tagged_user_id,
        'tag',
        NEW.tagger_id,
        v_tagger_name || ' tagged you in a photo'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for photo tag notifications
DROP TRIGGER IF EXISTS trigger_photo_tag_notification ON album_media_tags;
CREATE TRIGGER trigger_photo_tag_notification
  AFTER INSERT ON album_media_tags
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_photo_tag();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_album_media_tags_media_id ON album_media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_album_media_tags_tagged_user_id ON album_media_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_album_media_tags_tagger_id ON album_media_tags(tagger_id);