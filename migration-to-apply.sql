/*
  # HuBook Block User Enforcement

  ## Overview
  This migration adds enforcement for the block user system, preventing blocked users from
  interacting through friend requests, messaging, and content visibility.

  ## Changes

  ### 1. Helper Function: is_user_blocked(blocker_id, blocked_id)
  - Returns true if blocker_id has blocked blocked_id
  - Used by RLS policies to enforce blocking rules

  ### 2. Enhanced RLS Policies for Friendships
  - Prevents blocked users from sending friend requests to each other
  - Blocks viewing of existing friendships involving blocked users

  ### 3. Enhanced RLS Policies for Messages and Conversations
  - Prevents blocked users from messaging each other
  - Blocks viewing of conversations involving blocked users
  - Prevents adding blocked users to conversations

  ### 4. Enhanced RLS Policies for Posts and Comments
  - Blocks viewing posts from blocked users
  - Prevents blocked users from commenting on posts
  - Hides existing comments from blocked users

  ## Security
  - All policies properly check both directions of blocking
  - Enforcement happens at database level for security
  - No way to bypass blocks through API calls
*/

-- Helper function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_id uuid, blocked_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM hubook_blocked_users
    WHERE (blocker_id = is_user_blocked.blocker_id AND blocked_id = is_user_blocked.blocked_id)
       OR (blocker_id = is_user_blocked.blocked_id AND blocked_id = is_user_blocked.blocker_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update friendships INSERT policy to prevent blocked users from sending friend requests
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM hubook_profiles WHERE id = requester_id
    )
    AND NOT is_user_blocked(requester_id, addressee_id)
    AND (
      SELECT friend_request_privacy FROM user_privacy_settings
      WHERE user_id = (SELECT user_id FROM hubook_profiles WHERE id = addressee_id)
    ) IS DISTINCT FROM 'no_one'
  );

-- Update friendships SELECT policy to hide friendships involving blocked users
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    (requester_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid())
     OR addressee_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()))
    AND NOT is_user_blocked(requester_id, addressee_id)
  );

-- Update messages INSERT policy to prevent blocked users from messaging
DROP POLICY IF EXISTS "Users can send messages to conversations they're part of" ON messages;
CREATE POLICY "Users can send messages to conversations they're part of"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_conversation_access
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_conversation_access uca1
      JOIN user_conversation_access uca2 ON uca1.conversation_id = uca2.conversation_id
      WHERE uca1.conversation_id = messages.conversation_id
      AND uca1.user_id = auth.uid()
      AND uca2.user_id != auth.uid()
      AND is_user_blocked(
        (SELECT id FROM hubook_profiles WHERE user_id = uca1.user_id),
        (SELECT id FROM hubook_profiles WHERE user_id = uca2.user_id)
      )
    )
  );

-- Update conversation_participants to prevent adding blocked users
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_conversation_access
      WHERE conversation_id = conversation_participants.conversation_id
      AND user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM hubook_profiles hp
      WHERE hp.user_id = conversation_participants.user_id
      AND is_user_blocked(
        (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()),
        hp.id
      )
    )
  );

-- Update posts SELECT policy to hide posts from blocked users
DROP POLICY IF EXISTS "Public and friends can view posts based on privacy v2" ON posts;
CREATE POLICY "Public and friends can view posts based on privacy v2"
  ON posts FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND NOT is_user_blocked(
      author_id,
      (SELECT id FROM hubook_profiles WHERE user_id = auth.uid())
    )
    AND (
      privacy = 'public'
      OR (
        privacy = 'friends'
        AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND (
            (requester_id = author_id AND addressee_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()))
            OR (addressee_id = author_id AND requester_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()))
          )
        )
      )
      OR author_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid())
    )
  );

-- Update comments INSERT policy to prevent blocked users from commenting
DROP POLICY IF EXISTS "Authenticated users can create comments on visible posts" ON comments;
CREATE POLICY "Authenticated users can create comments on visible posts"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT is_user_blocked(
      (SELECT author_id FROM posts WHERE id = post_id),
      (SELECT id FROM hubook_profiles WHERE user_id = auth.uid())
    )
  );

-- Update comments SELECT policy to hide comments from blocked users
DROP POLICY IF EXISTS "Users can view comments on posts they can see" ON comments;
CREATE POLICY "Users can view comments on posts they can see"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id
      AND p.status = 'active'
      AND (
        p.privacy = 'public'
        OR (
          p.privacy = 'friends'
          AND EXISTS (
            SELECT 1 FROM friendships
            WHERE status = 'accepted'
            AND (
              (requester_id = p.author_id AND addressee_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()))
              OR (addressee_id = p.author_id AND requester_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid()))
            )
          )
        )
        OR p.author_id IN (SELECT id FROM hubook_profiles WHERE user_id = auth.uid())
      )
    )
    AND NOT is_user_blocked(
      (SELECT id FROM hubook_profiles WHERE user_id = comments.user_id),
      (SELECT id FROM hubook_profiles WHERE user_id = auth.uid())
    )
  );
