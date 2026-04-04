/*
  # Fix Album Media Reactions RLS Policies to Respect Public Privacy

  1. Problem
    - Current policies only allow reactions if user owns the album OR is friends with owner
    - This ignores the album's `privacy` setting
    - Users cannot react to PUBLIC albums unless they're friends with the owner
    - Users cannot see reactions from other users on PUBLIC albums

  2. Solution
    - Update SELECT policy to allow viewing reactions on PUBLIC albums (anyone)
    - Update INSERT policy to allow adding reactions to PUBLIC albums (anyone)
    - Match the logic from the `albums` table SELECT policy which correctly checks:
      - `privacy = 'public'` (anyone can access) OR
      - `owner_id = auth.uid()` (owner can access) OR
      - `privacy = 'friends'` AND friendship exists (friends can access)

  3. Changes
    - Drop and recreate SELECT policy with privacy check
    - Drop and recreate INSERT policy with privacy check
    - UPDATE and DELETE policies remain unchanged (users can only modify their own reactions)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view reactions on accessible media" ON album_media_reactions;
DROP POLICY IF EXISTS "Users can add reactions to accessible media" ON album_media_reactions;

-- Recreate SELECT policy with privacy check
CREATE POLICY "Users can view reactions on accessible media"
  ON album_media_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM album_media am
      JOIN albums a ON am.album_id = a.id
      WHERE am.id = album_media_reactions.media_id
      AND (
        a.privacy = 'public'  -- Anyone can view reactions on public albums
        OR a.owner_id = auth.uid()  -- Owner can view reactions on their own albums
        OR (
          a.privacy = 'friends' AND EXISTS (  -- Friends can view reactions on friends-only albums
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
            AND ((f.requester_id = auth.uid() AND f.addressee_id = a.owner_id)
              OR (f.requester_id = a.owner_id AND f.addressee_id = auth.uid()))
          )
        )
      )
    )
  );

-- Recreate INSERT policy with privacy check
CREATE POLICY "Users can add reactions to accessible media"
  ON album_media_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id  -- User can only create their own reactions
    AND EXISTS (
      SELECT 1 FROM album_media am
      JOIN albums a ON am.album_id = a.id
      WHERE am.id = media_id
      AND (
        a.privacy = 'public'  -- Anyone can react to public albums
        OR a.owner_id = auth.uid()  -- Owner can react to their own albums
        OR (
          a.privacy = 'friends' AND EXISTS (  -- Friends can react to friends-only albums
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
            AND ((f.requester_id = auth.uid() AND f.addressee_id = a.owner_id)
              OR (f.requester_id = a.owner_id AND f.addressee_id = auth.uid()))
          )
        )
      )
    )
  );
