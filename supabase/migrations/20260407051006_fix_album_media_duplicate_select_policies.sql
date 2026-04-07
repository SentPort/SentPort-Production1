/*
  # Fix Album Media Duplicate SELECT Policies

  This migration removes duplicate SELECT policies on the album_media table that were causing
  AND conditions to block public photo visibility.

  ## Issue
  - There were 3 SELECT policies on album_media table
  - PostgreSQL RLS requires ALL PERMISSIVE policies to pass (AND condition)
  - This was blocking public album media from being visible

  ## Changes
  - Drops the old/duplicate policies
  - Keeps only the new comprehensive policy created in the previous migration

  ## Impact
  - Public album media will now be visible to all users
  - Friends-only and private album media will still be protected
*/

-- Drop the old/duplicate SELECT policies, keeping only the new one
DROP POLICY IF EXISTS "Users can view album media based on album privacy" ON album_media;
DROP POLICY IF EXISTS "Users can view album media based on privacy settings" ON album_media;

-- The "Users can view media in albums they have access to" policy is the correct one
-- and was created in the previous migration, so we keep that one
