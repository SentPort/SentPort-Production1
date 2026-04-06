/*
  # Add Privacy Helper Functions

  1. Functions Created
    - `are_users_friends(user_a, user_b)` - Check if two users are friends
    - `can_tag_user(tagger_id, target_user_id)` - Check tagging permission
    - `can_send_friend_request(requester_id, target_user_id)` - Check friend request permission
    - `can_message_user(sender_id, recipient_id)` - Check messaging permission
    - `can_mention_user(mentioner_id, target_user_id)` - Check mention permission
    - `can_view_profile(viewer_id, profile_user_id)` - Check profile visibility
    - `can_view_photos(viewer_id, album_owner_id)` - Check photo visibility
    - `can_view_friends_list(viewer_id, profile_user_id)` - Check friends list visibility

  2. Purpose
    - Centralize privacy permission logic
    - Enable RLS policies and triggers to enforce privacy settings
    - Ensure consistent privacy checks across the application
*/

-- Helper function to check if two users are friends
CREATE OR REPLACE FUNCTION are_users_friends(user_a uuid, user_b uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE (
      (requester_id = user_a AND addressee_id = user_b AND status = 'accepted')
      OR
      (requester_id = user_b AND addressee_id = user_a AND status = 'accepted')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can tag another user
CREATE OR REPLACE FUNCTION can_tag_user(tagger_id uuid, target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_tagging_privacy text;
BEGIN
  -- Allow tagging yourself
  IF tagger_id = target_user_id THEN
    RETURN true;
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can send friend request
CREATE OR REPLACE FUNCTION can_send_friend_request(requester_id uuid, target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_friend_request_privacy text;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can message another user
CREATE OR REPLACE FUNCTION can_message_user(sender_id uuid, recipient_id uuid)
RETURNS boolean AS $$
DECLARE
  v_messaging_privacy text;
BEGIN
  -- Get recipient's messaging privacy setting
  SELECT messaging_privacy INTO v_messaging_privacy
  FROM user_privacy_settings
  WHERE user_id = recipient_id;

  -- If no settings exist, default to 'everyone'
  IF v_messaging_privacy IS NULL THEN
    RETURN true;
  END IF;

  -- Check privacy setting
  IF v_messaging_privacy = 'everyone' THEN
    RETURN true;
  ELSIF v_messaging_privacy = 'friends' THEN
    RETURN are_users_friends(sender_id, recipient_id);
  ELSE -- 'no_one'
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can mention another user
CREATE OR REPLACE FUNCTION can_mention_user(mentioner_id uuid, target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_tagging_privacy text;
BEGIN
  -- Allow mentioning yourself
  IF mentioner_id = target_user_id THEN
    RETURN true;
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can view profile
CREATE OR REPLACE FUNCTION can_view_profile(viewer_id uuid, profile_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_profile_visibility text;
BEGIN
  -- Can always view own profile
  IF viewer_id = profile_user_id THEN
    RETURN true;
  END IF;

  -- Get profile visibility setting
  SELECT profile_visibility INTO v_profile_visibility
  FROM user_privacy_settings
  WHERE user_id = profile_user_id;

  -- If no settings exist, default to 'public'
  IF v_profile_visibility IS NULL THEN
    RETURN true;
  END IF;

  -- Check privacy setting
  IF v_profile_visibility = 'public' THEN
    RETURN true;
  ELSIF v_profile_visibility = 'friends_only' THEN
    RETURN are_users_friends(viewer_id, profile_user_id);
  ELSE -- 'private'
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can view photos
CREATE OR REPLACE FUNCTION can_view_photos(viewer_id uuid, album_owner_id uuid)
RETURNS boolean AS $$
DECLARE
  v_who_can_see_photos text;
BEGIN
  -- Can always view own photos
  IF viewer_id = album_owner_id THEN
    RETURN true;
  END IF;

  -- Get photo visibility setting
  SELECT who_can_see_photos INTO v_who_can_see_photos
  FROM user_privacy_settings
  WHERE user_id = album_owner_id;

  -- If no settings exist, default to 'everyone'
  IF v_who_can_see_photos IS NULL THEN
    RETURN true;
  END IF;

  -- Check privacy setting
  IF v_who_can_see_photos = 'everyone' THEN
    RETURN true;
  ELSIF v_who_can_see_photos = 'friends' THEN
    RETURN are_users_friends(viewer_id, album_owner_id);
  ELSE -- 'only_me'
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can view friends list
CREATE OR REPLACE FUNCTION can_view_friends_list(viewer_id uuid, profile_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_who_can_see_friends_list text;
BEGIN
  -- Can always view own friends list
  IF viewer_id = profile_user_id THEN
    RETURN true;
  END IF;

  -- Get friends list visibility setting
  SELECT who_can_see_friends_list INTO v_who_can_see_friends_list
  FROM user_privacy_settings
  WHERE user_id = profile_user_id;

  -- If no settings exist, default to 'everyone'
  IF v_who_can_see_friends_list IS NULL THEN
    RETURN true;
  END IF;

  -- Check privacy setting
  IF v_who_can_see_friends_list = 'everyone' THEN
    RETURN true;
  ELSIF v_who_can_see_friends_list = 'friends' THEN
    RETURN are_users_friends(viewer_id, profile_user_id);
  ELSE -- 'only_me'
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;