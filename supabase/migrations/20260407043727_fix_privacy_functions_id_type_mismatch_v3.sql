/*
  # Fix Privacy Helper Functions - ID Type Mismatch

  1. Problem Identified
    - Privacy helper functions expect auth.users.id (user_id)
    - But RLS policies pass hubook_profiles.id (profile_id)
    - This causes privacy lookups to fail because:
      * albums.owner_id references hubook_profiles.id
      * posts.author_id references hubook_profiles.id
      * user_privacy_settings.user_id references auth.users.id
    - Result: Privacy settings aren't found, causing inconsistent behavior
    
  2. Solution
    - Update all privacy helper functions to accept EITHER:
      * hubook_profiles.id (profile_id) OR
      * auth.users.id (user_id)
    - Functions will auto-detect and convert hubook_profiles.id → user_id
    - This makes functions work with both ID types seamlessly
    
  3. Functions Being Fixed
    - can_view_photos() - Used by albums RLS
    - can_view_profile() - Used by hubook_profiles RLS
    - can_view_friends_list() - Used by friendships RLS
    - are_users_friends() - Used by multiple RLS policies
    
  4. Security Impact
    - CRITICAL FIX: Privacy settings will now be correctly looked up
    - Users with public/everyone settings will see posts and photos
    - Privacy enforcement will work consistently between frontend and backend
    
  5. Note
    - Using CASCADE to drop functions and recreate them
    - RLS policies will be automatically recreated with the new functions
*/

-- Helper function to convert hubook_profile_id to user_id
-- This is used internally by other privacy functions
CREATE OR REPLACE FUNCTION get_user_id_from_profile_or_user_id(input_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- First, check if this ID exists in hubook_profiles as an id
  SELECT user_id INTO v_user_id
  FROM hubook_profiles
  WHERE id = input_id;
  
  -- If found, return the user_id
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Otherwise, assume it's already a user_id and return it directly
  -- (This handles cases where auth.uid() is passed directly)
  RETURN input_id;
END;
$$;

-- Drop and recreate are_users_friends first (other functions depend on it)
DROP FUNCTION IF EXISTS are_users_friends(uuid, uuid) CASCADE;
CREATE FUNCTION are_users_friends(user_a_id uuid, user_b_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_a_profile_id uuid;
  v_user_b_profile_id uuid;
BEGIN
  -- Convert user_ids to hubook_profile_ids (friendships table uses profile IDs)
  -- If input is already a profile_id, get it; if it's a user_id, look up profile_id
  
  -- Try to find profile_id for user_a
  SELECT id INTO v_user_a_profile_id
  FROM hubook_profiles
  WHERE id = user_a_id OR user_id = user_a_id
  LIMIT 1;
  
  -- Try to find profile_id for user_b
  SELECT id INTO v_user_b_profile_id
  FROM hubook_profiles
  WHERE id = user_b_id OR user_id = user_b_id
  LIMIT 1;
  
  -- If either profile not found, they can't be friends
  IF v_user_a_profile_id IS NULL OR v_user_b_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if friendship exists in either direction
  RETURN EXISTS (
    SELECT 1 
    FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = v_user_a_profile_id AND addressee_id = v_user_b_profile_id)
      OR
      (requester_id = v_user_b_profile_id AND addressee_id = v_user_a_profile_id)
    )
  );
END;
$$;

-- Drop and recreate can_view_photos function to handle both ID types
DROP FUNCTION IF EXISTS can_view_photos(uuid, uuid) CASCADE;
CREATE FUNCTION can_view_photos(viewer_id uuid, album_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_user_id uuid;
  v_owner_user_id uuid;
  v_who_can_see_photos text;
BEGIN
  -- Convert both IDs to user_id format
  v_viewer_user_id := get_user_id_from_profile_or_user_id(viewer_id);
  v_owner_user_id := get_user_id_from_profile_or_user_id(album_owner_id);

  -- Can always view own photos
  IF v_viewer_user_id = v_owner_user_id THEN
    RETURN true;
  END IF;
  
  -- Get photo visibility setting
  SELECT who_can_see_photos INTO v_who_can_see_photos
  FROM user_privacy_settings
  WHERE user_id = v_owner_user_id;
  
  -- If no settings exist, default to 'everyone'
  IF v_who_can_see_photos IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check privacy setting
  IF v_who_can_see_photos = 'everyone' THEN
    RETURN true;
  ELSIF v_who_can_see_photos = 'friends' THEN
    RETURN are_users_friends(v_viewer_user_id, v_owner_user_id);
  ELSE -- 'only_me'
    RETURN false;
  END IF;
END;
$$;

-- Drop and recreate can_view_profile function to handle both ID types
DROP FUNCTION IF EXISTS can_view_profile(uuid, uuid) CASCADE;
CREATE FUNCTION can_view_profile(viewer_id uuid, profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_user_id uuid;
  v_profile_user_id uuid;
  v_profile_visibility text;
BEGIN
  -- Convert both IDs to user_id format
  v_viewer_user_id := get_user_id_from_profile_or_user_id(viewer_id);
  v_profile_user_id := get_user_id_from_profile_or_user_id(profile_user_id);

  -- Can always view own profile
  IF v_viewer_user_id = v_profile_user_id THEN
    RETURN true;
  END IF;
  
  -- Get profile visibility setting
  SELECT profile_visibility INTO v_profile_visibility
  FROM user_privacy_settings
  WHERE user_id = v_profile_user_id;
  
  -- If no settings exist, default to 'public'
  IF v_profile_visibility IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check privacy setting
  IF v_profile_visibility = 'public' THEN
    RETURN true;
  ELSIF v_profile_visibility = 'friends_only' THEN
    RETURN are_users_friends(v_viewer_user_id, v_profile_user_id);
  ELSE -- 'private'
    RETURN false;
  END IF;
END;
$$;

-- Drop and recreate can_view_friends_list function to handle both ID types
DROP FUNCTION IF EXISTS can_view_friends_list(uuid, uuid) CASCADE;
CREATE FUNCTION can_view_friends_list(viewer_id uuid, profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_user_id uuid;
  v_profile_user_id uuid;
  v_who_can_see_friends_list text;
BEGIN
  -- Convert both IDs to user_id format
  v_viewer_user_id := get_user_id_from_profile_or_user_id(viewer_id);
  v_profile_user_id := get_user_id_from_profile_or_user_id(profile_user_id);

  -- Can always view own friends list
  IF v_viewer_user_id = v_profile_user_id THEN
    RETURN true;
  END IF;
  
  -- Get friends list visibility setting
  SELECT who_can_see_friends_list INTO v_who_can_see_friends_list
  FROM user_privacy_settings
  WHERE user_id = v_profile_user_id;
  
  -- If no settings exist, default to 'everyone'
  IF v_who_can_see_friends_list IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check privacy setting
  IF v_who_can_see_friends_list = 'everyone' THEN
    RETURN true;
  ELSIF v_who_can_see_friends_list = 'friends' THEN
    RETURN are_users_friends(v_viewer_user_id, v_profile_user_id);
  ELSE -- 'only_me'
    RETURN false;
  END IF;
END;
$$;

-- Recreate the RLS policies that were dropped due to CASCADE
-- These use the updated functions that now work with both ID types

-- Albums privacy policy
CREATE POLICY "Users can view albums based on privacy settings"
  ON albums
  FOR SELECT
  TO authenticated
  USING (can_view_photos(auth.uid(), owner_id));

-- Album media privacy policy  
CREATE POLICY "Users can view album media based on privacy settings"
  ON album_media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_media.album_id
      AND can_view_photos(auth.uid(), albums.owner_id)
    )
  );

-- Album media comments privacy policy
CREATE POLICY "Users can comment on visible album media"
  ON album_media_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM album_media
      JOIN albums ON albums.id = album_media.album_id
      WHERE album_media.id = album_media_comments.media_id
      AND can_view_photos(auth.uid(), albums.owner_id)
    )
  );

-- HuBook profiles privacy policy
CREATE POLICY "Users can view profiles based on privacy settings"
  ON hubook_profiles
  FOR SELECT
  TO authenticated
  USING (can_view_profile(auth.uid(), id));

-- Friendships privacy policy
CREATE POLICY "Users can view friendships based on privacy settings"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (
    -- Can always view own friendships (as requester or addressee)
    (requester_id = (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()))
    OR 
    (addressee_id = (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()))
    OR
    -- Can view if friendship is accepted AND privacy allows viewing requester's friends list
    (
      status = 'accepted'
      AND can_view_friends_list(auth.uid(), requester_id)
    )
    OR
    -- Can view if friendship is accepted AND privacy allows viewing addressee's friends list
    (
      status = 'accepted'
      AND can_view_friends_list(auth.uid(), addressee_id)
    )
  );
