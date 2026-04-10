/*
  # Fix heddit_subreddit_custom_tags RLS policies

  ## Problem
  The INSERT and DELETE policies on heddit_subreddit_custom_tags check:
    `heddit_subreddits.creator_id = auth.uid()`
  
  But creator_id stores a heddit_accounts.id (secondary account UUID), while
  auth.uid() returns the Supabase auth user UUID. These never match, so every
  INSERT is silently blocked by RLS - meaning tag associations never get written,
  triggers never fire, and usage counts stay permanently at 0.

  ## Fix
  Replace both broken policies with correct versions that join through
  heddit_accounts to compare auth.uid() against heddit_accounts.user_id,
  matching the same pattern already used correctly in heddit_post_tags policies.
  Also allow community moderators to add/remove tags.

  ## Changes
  - DROP and recreate INSERT policy with correct auth.uid() -> heddit_accounts.user_id join
  - DROP and recreate DELETE policy with correct auth.uid() -> heddit_accounts.user_id join
  - Also allow moderators to insert/delete tags on their communities
*/

-- Drop broken INSERT policy
DROP POLICY IF EXISTS "SubHeddit creator can add tags" ON heddit_subreddit_custom_tags;

-- Drop broken DELETE policy
DROP POLICY IF EXISTS "SubHeddit creator can remove tags" ON heddit_subreddit_custom_tags;

-- Recreate INSERT policy with correct join through heddit_accounts
CREATE POLICY "SubHeddit creator or moderator can add tags"
  ON heddit_subreddit_custom_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM heddit_subreddits s
      JOIN heddit_accounts a ON (s.creator_id = a.id)
      WHERE s.id = heddit_subreddit_custom_tags.subreddit_id
        AND a.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM heddit_subreddit_moderators m
      JOIN heddit_accounts a ON (m.account_id = a.id)
      WHERE m.subreddit_id = heddit_subreddit_custom_tags.subreddit_id
        AND a.user_id = auth.uid()
    )
  );

-- Recreate DELETE policy with correct join through heddit_accounts
CREATE POLICY "SubHeddit creator or moderator can remove tags"
  ON heddit_subreddit_custom_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM heddit_subreddits s
      JOIN heddit_accounts a ON (s.creator_id = a.id)
      WHERE s.id = heddit_subreddit_custom_tags.subreddit_id
        AND a.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM heddit_subreddit_moderators m
      JOIN heddit_accounts a ON (m.account_id = a.id)
      WHERE m.subreddit_id = heddit_subreddit_custom_tags.subreddit_id
        AND a.user_id = auth.uid()
    )
  );
