/*
  # Add Drafts System to HuBlog

  1. New Columns
    - `blog_posts.is_draft` (boolean, default false)
      - Indicates whether the post is a draft or published
    - `blog_posts.draft_updated_at` (timestamp)
      - Tracks when drafts were last auto-saved
    - `blog_posts.expires_at` (timestamp)
      - Set to 60 days from creation for drafts

  2. Indexes
    - Create index on (account_id, is_draft, draft_updated_at) for efficient draft queries
    - Create index on (is_draft, expires_at) for cleanup queries

  3. Security
    - RLS policies automatically apply to new columns
    - Drafts are only visible to the owner via existing policies

  4. Notes
    - Draft expiration set to 60 days for writers
    - Maximum 10 drafts per user (enforced at application level)
    - Auto-save updates draft_updated_at every 30 seconds
*/

-- Add draft-related columns to blog_posts
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Create indexes for efficient draft queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_drafts 
  ON blog_posts(account_id, is_draft, draft_updated_at DESC) 
  WHERE is_draft = true;

CREATE INDEX IF NOT EXISTS idx_blog_posts_draft_expiration 
  ON blog_posts(is_draft, expires_at) 
  WHERE is_draft = true AND expires_at IS NOT NULL;

-- Create function to automatically set expires_at for new drafts
CREATE OR REPLACE FUNCTION set_draft_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new draft, set expiration to 60 days from now
  IF NEW.is_draft = true AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '60 days';
  END IF;
  
  -- If draft is being published, clear expiration
  IF NEW.is_draft = false THEN
    NEW.expires_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set draft expiration
DROP TRIGGER IF EXISTS trigger_set_draft_expiration ON blog_posts;
CREATE TRIGGER trigger_set_draft_expiration
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_draft_expiration();

-- Update draft_updated_at when content is modified
CREATE OR REPLACE FUNCTION update_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update draft_updated_at for drafts when content changes
  IF NEW.is_draft = true AND (
    NEW.title IS DISTINCT FROM OLD.title OR 
    NEW.content IS DISTINCT FROM OLD.content
  ) THEN
    NEW.draft_updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update draft timestamp
DROP TRIGGER IF EXISTS trigger_update_draft_timestamp ON blog_posts;
CREATE TRIGGER trigger_update_draft_timestamp
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_timestamp();