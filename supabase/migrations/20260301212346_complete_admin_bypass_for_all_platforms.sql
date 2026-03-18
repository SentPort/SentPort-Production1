/*
  # Complete Admin Bypass for All Platform Verification Checks

  ## Overview
  This migration ensures that ALL platform verification checks recognize admin status
  as equivalent to verified status. Admins should have full access to all platform
  features without needing to go through verification.

  ## Changes

  ### 1. Platform Account Creation (5 tables)
  - heddit_accounts
  - hinsta_accounts
  - hutube_channels
  - switter_accounts
  - blog_accounts (already updated in previous migration)

  ### 2. Cross-Platform Engagement (5 tables)
  - platform_comments
  - platform_likes
  - platform_dislikes
  - platform_shares
  - platform_reports

  ### 3. Platform-Specific Actions (3 tables)
  - switter_follows
  - hinsta_follows
  - heddit_subreddit_members

  ### 4. Other Features (1 table)
  - hutube_subscriptions (already updated in previous migration)
  - subdomains (already updated in previous migration)

  ## Security
  All policies still require:
  - Authentication (TO authenticated)
  - User ID verification (auth.uid() matches user_id/owner_id)
  - Admin status OR verified status for access
*/

-- ============================================================================
-- PLATFORM ACCOUNT CREATION
-- ============================================================================

-- HEDDIT ACCOUNTS
DROP POLICY IF EXISTS "Verified users can create Heddit account" ON heddit_accounts;

CREATE POLICY "Verified users can create Heddit account"
  ON heddit_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- HINSTA ACCOUNTS
DROP POLICY IF EXISTS "Verified users can create Hinsta account" ON hinsta_accounts;

CREATE POLICY "Verified users can create Hinsta account"
  ON hinsta_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- HUTUBE CHANNELS
DROP POLICY IF EXISTS "Verified users can create HuTube channel" ON hutube_channels;

CREATE POLICY "Verified users can create HuTube channel"
  ON hutube_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- SWITTER ACCOUNTS
DROP POLICY IF EXISTS "Verified users can create Switter account" ON switter_accounts;

CREATE POLICY "Verified users can create Switter account"
  ON switter_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- ============================================================================
-- CROSS-PLATFORM ENGAGEMENT
-- ============================================================================

-- PLATFORM COMMENTS
DROP POLICY IF EXISTS "Verified users can comment on content" ON platform_comments;

CREATE POLICY "Verified users can comment on content"
  ON platform_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- PLATFORM LIKES
DROP POLICY IF EXISTS "Verified users can like content" ON platform_likes;

CREATE POLICY "Verified users can like content"
  ON platform_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- PLATFORM DISLIKES
DROP POLICY IF EXISTS "Verified users can dislike content" ON platform_dislikes;

CREATE POLICY "Verified users can dislike content"
  ON platform_dislikes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- PLATFORM SHARES
DROP POLICY IF EXISTS "Verified users can share content" ON platform_shares;

CREATE POLICY "Verified users can share content"
  ON platform_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- PLATFORM REPORTS
DROP POLICY IF EXISTS "Verified users can report fake content" ON platform_reports;

CREATE POLICY "Verified users can report fake content"
  ON platform_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- ============================================================================
-- PLATFORM-SPECIFIC ENGAGEMENT
-- ============================================================================

-- SWITTER FOLLOWS
-- Note: This policy checks account existence, which works once admins can create accounts
DROP POLICY IF EXISTS "Verified Switter users can follow others" ON switter_follows;

CREATE POLICY "Verified Switter users can follow others"
  ON switter_follows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM switter_accounts
      WHERE switter_accounts.id = switter_follows.follower_id
      AND switter_accounts.user_id = auth.uid()
    )
  );

-- HINSTA FOLLOWS
-- Note: This policy checks account existence, which works once admins can create accounts
DROP POLICY IF EXISTS "Verified Hinsta users can follow others" ON hinsta_follows;

CREATE POLICY "Verified Hinsta users can follow others"
  ON hinsta_follows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hinsta_accounts
      WHERE hinsta_accounts.id = hinsta_follows.follower_id
      AND hinsta_accounts.user_id = auth.uid()
    )
  );

-- HEDDIT SUBREDDIT MEMBERS
-- Note: This policy checks account existence, which works once admins can create accounts
DROP POLICY IF EXISTS "Verified Heddit users can join subreddits" ON heddit_subreddit_members;

CREATE POLICY "Verified Heddit users can join subreddits"
  ON heddit_subreddit_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_accounts
      WHERE heddit_accounts.id = heddit_subreddit_members.user_id
      AND heddit_accounts.user_id = auth.uid()
    )
  );
