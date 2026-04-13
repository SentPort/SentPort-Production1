/*
  # Fix blog_notifications INSERT RLS and Create Collaboration Notification RPC

  ## Problems Fixed

  1. blog_notifications has no INSERT policy -- all frontend inserts from ProposalReview.tsx
     and Collaborations.tsx silently fail or throw RLS errors

  2. Create a SECURITY DEFINER RPC `insert_blog_collaboration_notifications` that bypasses
     RLS entirely for notification inserts, accepting an array of notification rows

  ## Security Notes

  - The INSERT policy only allows inserting notifications where actor_id = auth.uid()
    (you cannot insert a notification pretending to be someone else)
  - The SECURITY DEFINER function validates actor_id = auth.uid() internally
*/

-- Add INSERT policy on blog_notifications so authenticated users can insert
-- notifications where they are the actor (sender)
DROP POLICY IF EXISTS "Users can insert notifications as actor" ON blog_notifications;

CREATE POLICY "Users can insert notifications as actor"
  ON blog_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Create SECURITY DEFINER RPC for inserting collaboration notifications
-- This is used as a fallback/alternative for cases where RLS is insufficient
CREATE OR REPLACE FUNCTION insert_blog_collaboration_notifications(
  p_notifications jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif jsonb;
BEGIN
  FOR notif IN SELECT * FROM jsonb_array_elements(p_notifications)
  LOOP
    -- Only allow inserting notifications where actor_id matches the calling user
    IF (notif->>'actor_id')::uuid = auth.uid() THEN
      INSERT INTO blog_notifications (recipient_id, actor_id, type, message)
      VALUES (
        (notif->>'recipient_id')::uuid,
        (notif->>'actor_id')::uuid,
        notif->>'type',
        notif->>'message'
      );
    END IF;
  END LOOP;
END;
$$;
