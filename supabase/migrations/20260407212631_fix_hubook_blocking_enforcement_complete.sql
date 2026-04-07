/*
  # Fix HuBook Blocking Enforcement - Complete System

  1. Problem
    - Users who block each other can still interact in many ways:
      * Blocked users appear in friend suggestions
      * Can send friend requests to blocked users
      * Can view each other's profiles
      * Can view each other's friend lists
      * Can tag/mention each other
      * Can view each other's photos
    - Root cause: Privacy helper functions don't check for blocking

  2. Solution
    - Add blocking checks to ALL 7 privacy helper functions
    - Blocking is bidirectional: if A blocks B, then BOTH lose access to each other
    - Uses existing is_hubook_blocked_either_way() function
    - Blocking check happens FIRST, before any other privacy logic
    - Properly handles user_id vs profile_id conversion

  3. Functions Updated
    - are_users_friends() - Returns false if blocked
    - can_view_profile() - Returns false if blocked
    - can_send_friend_request() - Returns false if blocked
    - can_view_friends_list() - Returns false if blocked
    - can_tag_user() - Returns false if blocked
    - can_mention_user() - Returns false if blocked
    - can_view_photos() - Returns false if blocked

  4. Security Impact
    - RLS policies that use these functions now automatically enforce blocking
    - Cascades to: profiles, friendships, posts, photos, tags, mentions
    - No direct RLS changes needed - centralized logic in helper functions
*/

-- Helper function to get profile_id from user_id or profile_id
CREATE OR REPLACE FUNCTION get_profile_id_from_user_or_profile_id(input_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- First, check if this ID exists in hubook_profiles as a profile id
  SELECT id INTO v_profile_id
  FROM hubook_profiles
  WHERE id = input_id;
  
  -- If found, return it
  IF v_profile_id IS NOT NULL THEN
    RETURN v_profile_id;
  END IF;
  
  -- Otherwise, treat it as a user_id and look up the profile_id
  SELECT id INTO v_profile_id
  FROM hubook_profiles
  WHERE user_id = input_id;
  
  RETURN v_profile_id;
END;
$$;

-- 1. Update are_users_friends to check blocking first
CREATE OR REPLACE FUNCTION are_users_friends(user_a_id uuid, user_b_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_a_profile_id uuid;
  v_user_b_profile_id uuid;
BEGIN
  -- Convert user_ids to hubook_profile_ids
  v_user_a_profile_id := get_profile_id_from_user_or_profile_id(user_a_id);
  v_user_b_profile_id := get_profile_id_from_user_or_profile_id(user_b_id);
  
  -- If either profile not found, they can't be friends
  IF v_user_a_profile_id IS NULL OR v_user_b_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- BLOCKING CHECK: If either user has blocked the other, return false
  IF is_hubook_blocked_either_way(v_user_a_profile_id, v_user_b_profile_id) THEN
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

-- 2. Update can_view_profile to check blocking first
CREATE OR REPLACE FUNCTION can_view_profile(viewer_id uuid, profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_viewer_user_id uuid;
  v_profile_user_id uuid;
  v_viewer_profile_id uuid;
  v_target_profile_id uuid;
  v_profile_visibility text;
BEGIN
  -- Convert both IDs to user_id format
  v_viewer_user_id := get_user_id_from_profile_or_user_id(viewer_id);
  v_profile_user_id := get_user_id_from_profile_or_user_id(profile_user_id);
  
  -- Can always view own profile
  IF v_viewer_user_id = v_profile_user_id THEN
    RETURN true;
  END IF;
  
  -- BLOCKING CHECK: Convert to profile IDs and check for blocks
  v_viewer_profile_id := get_profile_id_from_user_or_profile_id(viewer_id);
  v_target_profile_id := get_profile_id_from_user_or_profile_id(profile_user_id);
  
  IF v_viewer_profile_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
    IF is_hubook_blocked_either_way(v_viewer_profile_id, v_target_profile_id) THEN
      RETURN false;
    END IF;
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

-- 3. Update can_send_friend_request to check blocking first
CREATE OR REPLACE FUNCTION can_send_friend_request(requester_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_requester_profile_id uuid;
  v_target_profile_id uuid;
  v_friend_request_privacy text;
BEGIN
  -- BLOCKING CHECK: Convert to profile IDs and check for blocks
  v_requester_profile_id := get_profile_id_from_user_or_profile_id(requester_id);
  v_target_profile_id := get_profile_id_from_user_or_profile_id(target_user_id);
  
  IF v_requester_profile_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
    IF is_hubook_blocked_either_way(v_requester_profile_id, v_target_profile_id) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Get target user's friend request privacy setting
  SELECT friend_request_privacy INTO v_friend_request_privacy
  FROM user_privacy_settings
  WHERE user_id = target_user_id;
  
  -- If no settings exist, default to 'everyone'
  IF v_friend_request_privacy IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check privacy setting
  IF v_friend_request_privacy = 'everyone' THEN
    RETURN true;
  ELSIF v_friend_request_privacy = 'friends_of_friends' THEN
    -- Check if they have mutual friends
    RETURN EXISTS (
      SELECT 1
      FROM friendships f1
      JOIN friendships f2 ON (
        (f1.addressee_id = f2.requester_id OR f1.addressee_id = f2.addressee_id OR f1.requester_id = f2.requester_id OR f1.requester_id = f2.addressee_id)
      )
      WHERE (
        (f1.requester_id = requester_id OR f1.addressee_id = requester_id)
        AND (f2.requester_id = target_user_id OR f2.addressee_id = target_user_id)
        AND f1.status = 'accepted'
        AND f2.status = 'accepted'
        AND f1.id != f2.id
      )
    );
  ELSE -- 'no_one'
    RETURN false;
  END IF;
END;
$$;

-- 4. Update can_view_friends_list to check blocking first
CREATE OR REPLACE FUNCTION can_view_friends_list(viewer_id uuid, profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_viewer_user_id uuid;
  v_profile_user_id uuid;
  v_viewer_profile_id uuid;
  v_target_profile_id uuid;
  v_who_can_see_friends_list text;
BEGIN
  -- Convert both IDs to user_id format
  v_viewer_user_id := get_user_id_from_profile_or_user_id(viewer_id);
  v_profile_user_id := get_user_id_from_profile_or_user_id(profile_user_id);
  
  -- Can always view own friends list
  IF v_viewer_user_id = v_profile_user_id THEN
    RETURN true;
  END IF;
  
  -- BLOCKING CHECK: Convert to profile IDs and check for blocks
  v_viewer_profile_id := get_profile_id_from_user_or_profile_id(viewer_id);
  v_target_profile_id := get_profile_id_from_user_or_profile_id(profile_user_id);
  
  IF v_viewer_profile_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
    IF is_hubook_blocked_either_way(v_viewer_profile_id, v_target_profile_id) THEN
      RETURN false;
    END IF;
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

-- 5. Update can_tag_user to check blocking first
CREATE OR REPLACE FUNCTION can_tag_user(tagger_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tagger_profile_id uuid;
  v_target_profile_id uuid;
  v_tagging_privacy text;
BEGIN
  -- Allow tagging yourself
  IF tagger_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- BLOCKING CHECK: Convert to profile IDs and check for blocks
  v_tagger_profile_id := get_profile_id_from_user_or_profile_id(tagger_id);
  v_target_profile_id := get_profile_id_from_user_or_profile_id(target_user_id);
  
  IF v_tagger_profile_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
    IF is_hubook_blocked_either_way(v_tagger_profile_id, v_target_profile_id) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Get target user's tagging privacy setting
  SELECT tagging_privacy INTO v_tagging_privacy
  FROM user_privacy_settings
  WHERE user_id = target_user_id;
  
  -- If no settings exist, default to 'everyone'
  IF v_tagging_privacy IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check privacy setting
  IF v_tagging_privacy = 'everyone' THEN
    RETURN true;
  ELSIF v_tagging_privacy = 'friends' THEN
    RETURN are_users_friends(tagger_id, target_user_id);
  ELSE -- 'no_one'
    RETURN false;
  END IF;
END;
$$;

-- 6. Update can_mention_user to check blocking first
CREATE OR REPLACE FUNCTION can_mention_user(mentioner_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_mentioner_profile_id uuid;
  v_target_profile_id uuid;
  v_tagging_privacy text;
BEGIN
  -- Allow mentioning yourself
  IF mentioner_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- BLOCKING CHECK: Convert to profile IDs and check for blocks
  v_mentioner_profile_id := get_profile_id_from_user_or_profile_id(mentioner_id);
  v_target_profile_id := get_profile_id_from_user_or_profile_id(target_user_id);
  
  IF v_mentioner_profile_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
    IF is_hubook_blocked_either_way(v_mentioner_profile_id, v_target_profile_id) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Get target user's tagging privacy setting (mentions use same privacy as tags)
  SELECT tagging_privacy INTO v_tagging_privacy
  FROM user_privacy_settings
  WHERE user_id = target_user_id;
  
  -- If no settings exist, default to 'everyone'
  IF v_tagging_privacy IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check privacy setting
  IF v_tagging_privacy = 'everyone' THEN
    RETURN true;
  ELSIF v_tagging_privacy = 'friends' THEN
    RETURN are_users_friends(mentioner_id, target_user_id);
  ELSE -- 'no_one'
    RETURN false;
  END IF;
END;
$$;

-- 7. Update can_view_photos to check blocking first
CREATE OR REPLACE FUNCTION can_view_photos(viewer_id uuid, album_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_viewer_user_id uuid;
  v_owner_user_id uuid;
  v_viewer_profile_id uuid;
  v_owner_profile_id uuid;
  v_who_can_see_photos text;
BEGIN
  -- Convert both IDs to user_id format
  v_viewer_user_id := get_user_id_from_profile_or_user_id(viewer_id);
  v_owner_user_id := get_user_id_from_profile_or_user_id(album_owner_id);
  
  -- Can always view own photos
  IF v_viewer_user_id = v_owner_user_id THEN
    RETURN true;
  END IF;
  
  -- BLOCKING CHECK: Convert to profile IDs and check for blocks
  v_viewer_profile_id := get_profile_id_from_user_or_profile_id(viewer_id);
  v_owner_profile_id := get_profile_id_from_user_or_profile_id(album_owner_id);
  
  IF v_viewer_profile_id IS NOT NULL AND v_owner_profile_id IS NOT NULL THEN
    IF is_hubook_blocked_either_way(v_viewer_profile_id, v_owner_profile_id) THEN
      RETURN false;
    END IF;
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_profile_id_from_user_or_profile_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION are_users_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_profile(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_send_friend_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_friends_list(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_tag_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_mention_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_photos(uuid, uuid) TO authenticated;
