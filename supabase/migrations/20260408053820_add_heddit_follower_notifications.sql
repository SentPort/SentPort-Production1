/*
  # Add Heddit Follower Notifications System

  This migration adds support for follower notifications in Heddit, allowing users to receive
  notifications in the bell icon when someone follows them.

  ## Changes

  1. Schema Changes
    - Add `following_id` column to `heddit_notifications` table to reference the follow relationship
    - Add index on `following_id` for performance

  2. Helper Functions
    - `should_create_heddit_notification()` - Checks user preferences and quiet hours
    - Validates notification type preferences (follower, comment, mention, etc.)
    - Handles quiet hours with midnight-spanning logic

  3. Notification Trigger
    - `notify_new_heddit_follower()` - Creates notification when someone follows a user
    - Respects user notification preferences (push_follower_enabled)
    - Respects quiet hours settings
    - Includes follower's display name or username in message

  ## Security
    - Functions use SECURITY DEFINER to bypass RLS for system operations
    - Existing RLS policies on heddit_notifications protect user data
*/

-- Add following_id column to track the follow relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_notifications' AND column_name = 'following_id'
  ) THEN
    ALTER TABLE heddit_notifications 
      ADD COLUMN following_id uuid REFERENCES heddit_follows(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_heddit_notifications_following_id 
  ON heddit_notifications(following_id);

-- Helper function to check if notification should be created based on user preferences
CREATE OR REPLACE FUNCTION should_create_heddit_notification(
  p_user_id uuid,
  p_notification_type text,
  p_current_time timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs record;
  v_current_hour int;
  v_quiet_start_hour int;
  v_quiet_end_hour int;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM heddit_notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences found, default to sending notification
  IF v_prefs IS NULL THEN
    RETURN true;
  END IF;

  -- Check quiet hours
  IF v_prefs.quiet_hours_enabled AND v_prefs.quiet_hours_start IS NOT NULL 
     AND v_prefs.quiet_hours_end IS NOT NULL THEN
    v_current_hour := EXTRACT(HOUR FROM p_current_time AT TIME ZONE 'UTC');
    v_quiet_start_hour := EXTRACT(HOUR FROM v_prefs.quiet_hours_start);
    v_quiet_end_hour := EXTRACT(HOUR FROM v_prefs.quiet_hours_end);
    
    -- Handle quiet hours that span midnight
    IF v_quiet_start_hour <= v_quiet_end_hour THEN
      -- Normal case: e.g., 22:00 to 08:00 next day
      IF v_current_hour >= v_quiet_start_hour AND v_current_hour < v_quiet_end_hour THEN
        RETURN false;
      END IF;
    ELSE
      -- Spans midnight: e.g., 22:00 to 08:00
      IF v_current_hour >= v_quiet_start_hour OR v_current_hour < v_quiet_end_hour THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  -- Check specific notification type preference
  CASE p_notification_type
    WHEN 'new_follower' THEN
      RETURN COALESCE(v_prefs.push_follower_enabled, true);
    WHEN 'comment_reply', 'post_reply' THEN
      RETURN COALESCE(v_prefs.push_comment_enabled, true);
    WHEN 'mention' THEN
      RETURN COALESCE(v_prefs.push_mention_enabled, true);
    WHEN 'upvote_milestone' THEN
      RETURN COALESCE(v_prefs.push_upvote_milestone_enabled, true);
    ELSE
      RETURN true;
  END CASE;
END;
$$;

-- Trigger function to create follower notification
CREATE OR REPLACE FUNCTION notify_new_heddit_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_name text;
  v_follower_display_name text;
  v_follower_username text;
BEGIN
  -- Get follower's display name and username
  SELECT display_name, username INTO v_follower_display_name, v_follower_username
  FROM heddit_accounts
  WHERE id = NEW.follower_id;

  -- Use display name if available, otherwise username, otherwise 'Someone'
  v_follower_name := COALESCE(v_follower_display_name, v_follower_username, 'Someone');

  -- Check if user wants follower notifications
  IF should_create_heddit_notification(NEW.following_id, 'new_follower') THEN
    INSERT INTO heddit_notifications (
      user_id,
      type,
      actor_id,
      content_type,
      content_id,
      following_id,
      message
    ) VALUES (
      NEW.following_id,
      'new_follower',
      NEW.follower_id,
      'follow',
      NEW.id,
      NEW.id,
      v_follower_name || ' started following you'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on heddit_follows
DROP TRIGGER IF EXISTS notify_new_heddit_follower_trigger ON heddit_follows;
CREATE TRIGGER notify_new_heddit_follower_trigger
  AFTER INSERT ON heddit_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_heddit_follower();
