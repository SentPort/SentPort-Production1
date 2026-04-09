/*
  # Fix heddit_notifications type check constraint

  ## Problem
  The heddit_notifications_type_check constraint does not include 'new_follower'
  as a valid type. A database trigger (notify_new_heddit_follower) was added to
  insert notifications with type='new_follower' when a user follows another user,
  but the constraint was never updated to allow this value, causing a check
  constraint violation on every follow action.

  ## Changes
  - Drops the existing heddit_notifications_type_check constraint
  - Recreates it with 'new_follower' added to the allowed values

  ## Allowed types after this migration
  comment_reply, post_reply, mention, upvote_milestone, subreddit_update,
  moderation_action, like, share, badge_earned, kindness_received, new_follower
*/

ALTER TABLE heddit_notifications
DROP CONSTRAINT IF EXISTS heddit_notifications_type_check;

ALTER TABLE heddit_notifications
ADD CONSTRAINT heddit_notifications_type_check
CHECK (type = ANY (ARRAY[
  'comment_reply'::text,
  'post_reply'::text,
  'mention'::text,
  'upvote_milestone'::text,
  'subreddit_update'::text,
  'moderation_action'::text,
  'like'::text,
  'share'::text,
  'badge_earned'::text,
  'kindness_received'::text,
  'new_follower'::text
]));
