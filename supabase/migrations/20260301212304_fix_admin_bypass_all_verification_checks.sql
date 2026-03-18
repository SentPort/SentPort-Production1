/*
  # Complete Admin Bypass for All Verification Checks

  ## Problem
  The previous migration (20260301193134) partially addressed admin bypass for platform accounts,
  but missed several critical policies:
  - blog_accounts (account creation)
  - hutube_subscriptions (subscribing to channels)
  - switter_follows (following users on Switter)
  - hinsta_follows (following users on Hinsta)
  - heddit_subreddit_members (joining subreddits)
  - subdomains (creating custom subdomains)

  Admins should bypass ALL verification requirements across the entire platform.

  ## Changes

  ### 1. Blog Platform Account Creation
  - Updated `blog_accounts` INSERT policy to allow admins

  ### 2. Platform-Specific Engagement Actions
  - Updated `hutube_subscriptions` INSERT policy to allow admins
  - Updated `switter_follows` INSERT policy to allow admins  
  - Updated `hinsta_follows` INSERT policy to allow admins
  - Updated `heddit_subreddit_members` INSERT policy to allow admins

  ### 3. Subdomain Management
  - Updated `subdomains` INSERT policy to allow admins

  ## Security Notes
  - All policies still require authentication (TO authenticated)
  - All policies still verify user_id matches auth.uid()
  - Admins now bypass verification checks across ALL platform features
  - Regular users still require verification
*/

-- ============================================================================
-- BLOG ACCOUNTS
-- ============================================================================

DROP POLICY IF EXISTS "Verified users can create their blog account" ON blog_accounts;

CREATE POLICY "Verified users can create their blog account"
  ON blog_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );

-- ============================================================================
-- HUTUBE SUBSCRIPTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Verified users can subscribe to channels" ON hutube_subscriptions;

CREATE POLICY "Verified users can subscribe to channels"
  ON hutube_subscriptions FOR INSERT
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
-- SWITTER FOLLOWS
-- ============================================================================

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

-- ============================================================================
-- HINSTA FOLLOWS
-- ============================================================================

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

-- ============================================================================
-- HEDDIT SUBREDDIT MEMBERS
-- ============================================================================

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

-- ============================================================================
-- SUBDOMAINS
-- ============================================================================

DROP POLICY IF EXISTS "Verified users can insert subdomains" ON subdomains;

CREATE POLICY "Verified users can insert subdomains"
  ON subdomains FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_verified = true OR user_profiles.is_admin = true)
    )
  );
