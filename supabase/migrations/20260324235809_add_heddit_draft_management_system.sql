/*
  # Heddit Draft Management System

  ## Overview
  Adds comprehensive draft management features to Heddit posts including:
  - Auto-expiration after 30 days (resets on each save)
  - 5 draft limit per user
  - Automatic cleanup of expired drafts
  - Draft editing and management capabilities

  ## Changes

  1. New Columns
    - `expires_at` (timestamp) - When draft will be auto-deleted (30 days from last save)
    - `draft_updated_at` (timestamp) - Tracks last draft modification time

  2. New Functions
    - `check_draft_limit()` - Enforces 5 draft maximum per user
    - `cleanup_expired_drafts()` - Removes drafts past expiration date
    - `set_draft_expiration()` - Automatically sets 30-day expiration

  3. Triggers
    - Automatically set expires_at to 30 days when draft is saved
    - Validate draft limit before insert

  4. Indexes
    - Index on (author_id, is_draft) for faster draft queries
    - Index on expires_at for efficient cleanup

  5. RLS Policies
    - Users can view, update, and delete their own drafts

  ## Notes
  - Expires_at is automatically updated to +30 days on every draft save
  - Publishing a draft removes the expiration date
  - Existing drafts will have expires_at set to 30 days from updated_at
*/

-- Add new columns for draft management
ALTER TABLE heddit_posts 
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz DEFAULT now();

-- Create index for faster draft queries
CREATE INDEX IF NOT EXISTS idx_heddit_posts_drafts 
ON heddit_posts(author_id, is_draft) 
WHERE is_draft = true;

-- Create index for efficient expiration cleanup
CREATE INDEX IF NOT EXISTS idx_heddit_posts_expires_at 
ON heddit_posts(expires_at) 
WHERE expires_at IS NOT NULL;

-- Function to check draft limit (5 drafts per user)
CREATE OR REPLACE FUNCTION check_heddit_draft_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check limit for new drafts (not updates)
  IF NEW.is_draft = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_draft = false)) THEN
    -- Count existing drafts for this author
    IF (
      SELECT COUNT(*) 
      FROM heddit_posts 
      WHERE author_id = NEW.author_id 
      AND is_draft = true 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) >= 5 THEN
      RAISE EXCEPTION 'Draft limit reached. Maximum 5 drafts allowed per user.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for draft limit check
DROP TRIGGER IF EXISTS check_draft_limit_trigger ON heddit_posts;
CREATE TRIGGER check_draft_limit_trigger
  BEFORE INSERT OR UPDATE ON heddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_heddit_draft_limit();

-- Function to set expiration date for drafts (30 days from save)
CREATE OR REPLACE FUNCTION set_heddit_draft_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expires_at for drafts to 30 days from now
  IF NEW.is_draft = true THEN
    NEW.expires_at := now() + interval '30 days';
    NEW.draft_updated_at := now();
  ELSE
    -- Clear expiration when publishing
    NEW.expires_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting draft expiration
DROP TRIGGER IF EXISTS set_draft_expiration_trigger ON heddit_posts;
CREATE TRIGGER set_draft_expiration_trigger
  BEFORE INSERT OR UPDATE ON heddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_heddit_draft_expiration();

-- Function to cleanup expired drafts (can be called manually or scheduled)
CREATE OR REPLACE FUNCTION cleanup_expired_heddit_drafts()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  count_deleted bigint;
BEGIN
  -- Delete expired drafts
  WITH deleted AS (
    DELETE FROM heddit_posts
    WHERE is_draft = true 
    AND expires_at IS NOT NULL 
    AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO count_deleted FROM deleted;
  
  RETURN QUERY SELECT count_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set expires_at for existing drafts (30 days from their updated_at or created_at)
UPDATE heddit_posts 
SET expires_at = COALESCE(updated_at, created_at) + interval '30 days',
    draft_updated_at = COALESCE(updated_at, created_at)
WHERE is_draft = true 
AND expires_at IS NULL;

-- Drop existing draft policies if they exist
DROP POLICY IF EXISTS "Users can view own drafts" ON heddit_posts;
DROP POLICY IF EXISTS "Users can update own drafts" ON heddit_posts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON heddit_posts;

-- Add RLS policy for users to view their own drafts
CREATE POLICY "Users can view own drafts"
  ON heddit_posts
  FOR SELECT
  TO authenticated
  USING (
    is_draft = true AND 
    author_id IN (
      SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
    )
  );

-- Add RLS policy for users to update their own drafts
CREATE POLICY "Users can update own drafts"
  ON heddit_posts
  FOR UPDATE
  TO authenticated
  USING (
    is_draft = true AND 
    author_id IN (
      SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_draft = true AND 
    author_id IN (
      SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
    )
  );

-- Add RLS policy for users to delete their own drafts
CREATE POLICY "Users can delete own drafts"
  ON heddit_posts
  FOR DELETE
  TO authenticated
  USING (
    is_draft = true AND 
    author_id IN (
      SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
    )
  );