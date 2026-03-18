/*
  # Fix Admin Bypass for Platform Account Creation

  ## Problem
  RLS policies for platform account creation only check `is_verified = true`,
  but the application logic treats admins as automatically verified.
  This causes admins to fail account creation with RLS policy violations.

  ## Changes
  
  ### 1. Updated Platform Account INSERT Policies
  Modified RLS policies to allow both verified users AND admins to create accounts:
  - `heddit_accounts` - "Verified users can create Heddit account"
  - `hutube_channels` - "Verified users can create HuTube channel"  
  - `hinsta_accounts` - "Verified users can create Hinsta account"
  - `switter_accounts` - "Verified users can create Switter account"

  ### 2. Updated Engagement Table INSERT Policies
  Modified RLS policies to allow both verified users AND admins to engage with content:
  - `platform_likes` - "Verified users can like content"
  - `platform_dislikes` - "Verified users can dislike content"
  - `platform_comments` - "Verified users can comment on content"
  - `platform_shares` - "Verified users can share content"
  - `platform_reports` - "Verified users can report fake content"

  ## Security Notes
  - Still requires authentication (TO authenticated)
  - Still checks user_id matches auth.uid()
  - Now properly recognizes admin status from user_profiles table
  - Maintains "verified-humans-only" principle while allowing admin access
*/

-- ============================================================================
-- HEDDIT ACCOUNTS
-- ============================================================================

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

-- ============================================================================
-- HUTUBE CHANNELS
-- ============================================================================

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

-- ============================================================================
-- HINSTA ACCOUNTS
-- ============================================================================

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

-- ============================================================================
-- SWITTER ACCOUNTS
-- ============================================================================

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
-- ENGAGEMENT TABLES - PLATFORM LIKES
-- ============================================================================

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

-- ============================================================================
-- ENGAGEMENT TABLES - PLATFORM DISLIKES
-- ============================================================================

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

-- ============================================================================
-- ENGAGEMENT TABLES - PLATFORM COMMENTS
-- ============================================================================

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

-- ============================================================================
-- ENGAGEMENT TABLES - PLATFORM SHARES
-- ============================================================================

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

-- ============================================================================
-- ENGAGEMENT TABLES - PLATFORM REPORTS
-- ============================================================================

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
