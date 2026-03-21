/*
  # Add Non-fiction and Screenplays Interests with Attribution System

  1. New Interests
    - Add "Non-fiction" interest category
    - Add "Screenplays" interest category

  2. New Tables
    - `blog_post_screenplay_inspirations`
      - Links screenplays to the stories that inspired them
      - Supports multiple attributions per screenplay
      - Includes optional attribution notes

  3. Changes
    - Add `is_screenplay` flag to blog_posts
    - Add `screenplay_format_data` jsonb field for screenplay formatting metadata
    
  4. Security
    - Enable RLS on screenplay inspirations table
    - Add policies for authenticated users to manage their screenplay attributions
    - Add policies for reading public attributions
    
  5. Notifications
    - Extend notification system to support screenplay_inspiration type
*/

-- Add new interests
INSERT INTO blog_interests (name, description)
VALUES 
  ('Non-fiction', 'True stories, memoirs, journalism, and factual narratives'),
  ('Screenplays', 'Scripts, dialogue, and screenwriting for film, television, and theater')
ON CONFLICT (name) DO NOTHING;

-- Add screenplay fields to blog_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'is_screenplay'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN is_screenplay boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'screenplay_format_data'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN screenplay_format_data jsonb DEFAULT NULL;
  END IF;
END $$;

-- Create screenplay inspirations table
CREATE TABLE IF NOT EXISTS blog_post_screenplay_inspirations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  inspired_by_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  attribution_note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(screenplay_post_id, inspired_by_post_id)
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_screenplay_inspirations_screenplay 
  ON blog_post_screenplay_inspirations(screenplay_post_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_inspirations_inspired_by 
  ON blog_post_screenplay_inspirations(inspired_by_post_id);

-- Enable RLS
ALTER TABLE blog_post_screenplay_inspirations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view screenplay attributions for published posts
CREATE POLICY "Anyone can view screenplay attributions"
  ON blog_post_screenplay_inspirations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = screenplay_post_id
      AND blog_posts.status = 'published'
    )
  );

-- Policy: Screenplay authors can insert attributions for their own posts
CREATE POLICY "Authors can add screenplay attributions"
  ON blog_post_screenplay_inspirations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = screenplay_post_id
      AND blog_posts.account_id = auth.uid()
    )
  );

-- Policy: Screenplay authors can delete their own attributions
CREATE POLICY "Authors can delete screenplay attributions"
  ON blog_post_screenplay_inspirations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = screenplay_post_id
      AND blog_posts.account_id = auth.uid()
    )
  );

-- Policy: Admins can manage all screenplay attributions
CREATE POLICY "Admins can manage all screenplay attributions"
  ON blog_post_screenplay_inspirations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Function to create screenplay inspiration notifications
CREATE OR REPLACE FUNCTION notify_screenplay_inspiration()
RETURNS TRIGGER AS $$
DECLARE
  inspiration_author_id uuid;
  screenplay_author_id uuid;
  screenplay_title text;
BEGIN
  -- Get the screenplay author and title
  SELECT account_id, title INTO screenplay_author_id, screenplay_title
  FROM blog_posts
  WHERE id = NEW.screenplay_post_id;

  -- Get the inspiration post author
  SELECT account_id INTO inspiration_author_id
  FROM blog_posts
  WHERE id = NEW.inspired_by_post_id;

  -- Don't notify if author is attributing their own work
  IF inspiration_author_id != screenplay_author_id THEN
    -- Create notification for the original story author
    INSERT INTO blog_notifications (
      recipient_id,
      actor_id,
      type,
      post_id,
      is_read,
      created_at
    ) VALUES (
      inspiration_author_id,
      screenplay_author_id,
      'screenplay_inspiration',
      NEW.screenplay_post_id,
      false,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for screenplay inspiration notifications
DROP TRIGGER IF EXISTS screenplay_inspiration_notification_trigger ON blog_post_screenplay_inspirations;
CREATE TRIGGER screenplay_inspiration_notification_trigger
  AFTER INSERT ON blog_post_screenplay_inspirations
  FOR EACH ROW
  EXECUTE FUNCTION notify_screenplay_inspiration();

-- Add comment for documentation
COMMENT ON TABLE blog_post_screenplay_inspirations IS 'Tracks which HuBlog stories inspired screenplays, supporting multiple attributions per screenplay';
COMMENT ON COLUMN blog_posts.is_screenplay IS 'Indicates if this post is formatted as a screenplay';
COMMENT ON COLUMN blog_posts.screenplay_format_data IS 'JSON data containing screenplay formatting metadata and structure';
