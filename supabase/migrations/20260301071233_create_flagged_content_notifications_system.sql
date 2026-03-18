/*
  # Create Flagged Content Notifications System

  1. New Tables
    - `flagged_post_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users) - User who owns the flagged content
      - `post_id` (uuid) - ID of the flagged post/content
      - `platform` (text) - Which platform (hubook, heddit, hutube, hinsta, switter, hublog)
      - `content_preview` (text) - First 150 characters of the content
      - `notification_shown_at` (timestamptz) - When popup was first shown
      - `notification_dismissed_at` (timestamptz) - When user dismissed the popup
      - `review_completed_at` (timestamptz) - When admin completed review
      - `review_outcome` (text) - 'approved', 'removed', or null if pending
      - `created_at` (timestamptz) - When the content was flagged

  2. Security
    - Enable RLS on `flagged_post_notifications` table
    - Users can only view their own notifications
    - Users can update their own dismissal timestamps
    - Admins can update review outcomes

  3. Indexes
    - Create index on user_id for fast user lookups
    - Create composite index on (user_id, notification_shown_at) for unread checks
    - Create index on post_id for admin review updates

  4. Notes
    - This table tracks when users are notified about flagged content
    - Notifications persist until dismissed by user or review is completed
    - System shows popup for undismissed notifications with null review_completed_at
*/

-- Create flagged post notifications table
CREATE TABLE IF NOT EXISTS flagged_post_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('hubook', 'heddit', 'hutube', 'hinsta', 'switter', 'hublog')),
  content_preview text DEFAULT '',
  notification_shown_at timestamptz,
  notification_dismissed_at timestamptz,
  review_completed_at timestamptz,
  review_outcome text CHECK (review_outcome IN ('approved', 'removed', NULL)),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flagged_notifications_user_id 
  ON flagged_post_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_flagged_notifications_user_shown 
  ON flagged_post_notifications(user_id, notification_shown_at);

CREATE INDEX IF NOT EXISTS idx_flagged_notifications_post_id 
  ON flagged_post_notifications(post_id);

CREATE INDEX IF NOT EXISTS idx_flagged_notifications_pending
  ON flagged_post_notifications(user_id, review_completed_at)
  WHERE review_completed_at IS NULL;

-- Enable RLS
ALTER TABLE flagged_post_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own flagged content notifications"
  ON flagged_post_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own dismissal timestamps
CREATE POLICY "Users can update own notification dismissals"
  ON flagged_post_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all notifications
CREATE POLICY "Admins can view all flagged content notifications"
  ON flagged_post_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Admins can update review outcomes
CREATE POLICY "Admins can update review outcomes"
  ON flagged_post_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to create flagged content notification for HuBook posts
CREATE OR REPLACE FUNCTION create_flagged_hubook_notification(p_post_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_content_preview text;
BEGIN
  -- Get post author and content
  SELECT author_id, LEFT(COALESCE(content, ''), 150)
  INTO v_user_id, v_content_preview
  FROM posts
  WHERE id = p_post_id;

  -- Create notification record
  INSERT INTO flagged_post_notifications (
    user_id,
    post_id,
    platform,
    content_preview,
    created_at
  ) VALUES (
    v_user_id,
    p_post_id,
    'hubook',
    v_content_preview,
    now()
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create flagged content notification for other platforms
CREATE OR REPLACE FUNCTION create_flagged_platform_notification(
  p_post_id uuid,
  p_platform text,
  p_user_id uuid,
  p_content_preview text
)
RETURNS void AS $$
BEGIN
  -- Create notification record
  INSERT INTO flagged_post_notifications (
    user_id,
    post_id,
    platform,
    content_preview,
    created_at
  ) VALUES (
    p_user_id,
    p_post_id,
    p_platform,
    p_content_preview,
    now()
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;