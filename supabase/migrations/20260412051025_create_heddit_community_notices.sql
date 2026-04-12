/*
  # Create Heddit Community Notices System

  ## Overview
  This migration creates a notice board system for Heddit community pages.
  Moderators can post, edit, and delete notices that appear as a persistent 
  sidebar panel visible to all community members on every page.

  ## New Tables

  ### heddit_community_notices
  - `id` (uuid, primary key) - Unique notice identifier
  - `subreddit_id` (uuid, FK to heddit_subreddits) - Which community this notice belongs to
  - `author_id` (uuid, FK to heddit_accounts) - The moderator who posted the notice
  - `content` (text) - The notice message body
  - `created_at` (timestamptz) - When the notice was posted
  - `updated_at` (timestamptz) - When the notice was last edited

  ## Security
  - RLS enabled on heddit_community_notices
  - Anyone can read notices (public view)
  - Only moderators/creators of a community can insert notices (enforced via function check)
  - Only moderators/creators of a community can update or delete notices
  - Cap of 15 notices per community enforced at application level

  ## Indexes
  - Index on subreddit_id + created_at for fast ordered retrieval per community
*/

CREATE TABLE IF NOT EXISTS heddit_community_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id uuid NOT NULL REFERENCES heddit_subreddits(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_heddit_community_notices_subreddit_created
  ON heddit_community_notices(subreddit_id, created_at ASC);

ALTER TABLE heddit_community_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community notices"
  ON heddit_community_notices FOR SELECT
  USING (true);

CREATE POLICY "Moderators can insert community notices"
  ON heddit_community_notices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators
      WHERE heddit_subreddit_moderators.subreddit_id = heddit_community_notices.subreddit_id
        AND heddit_subreddit_moderators.account_id = heddit_community_notices.author_id
    )
    AND
    heddit_community_notices.author_id IN (
      SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Moderators can update community notices"
  ON heddit_community_notices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators
      WHERE heddit_subreddit_moderators.subreddit_id = heddit_community_notices.subreddit_id
        AND heddit_subreddit_moderators.account_id IN (
          SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators
      WHERE heddit_subreddit_moderators.subreddit_id = heddit_community_notices.subreddit_id
        AND heddit_subreddit_moderators.account_id IN (
          SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Moderators can delete community notices"
  ON heddit_community_notices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators
      WHERE heddit_subreddit_moderators.subreddit_id = heddit_community_notices.subreddit_id
        AND heddit_subreddit_moderators.account_id IN (
          SELECT id FROM heddit_accounts WHERE user_id = auth.uid()
        )
    )
  );

CREATE OR REPLACE FUNCTION update_heddit_community_notice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_heddit_community_notices_updated_at
  BEFORE UPDATE ON heddit_community_notices
  FOR EACH ROW EXECUTE FUNCTION update_heddit_community_notice_updated_at();
