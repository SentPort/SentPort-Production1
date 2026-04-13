/*
  # Add actor_channel_id and dismissed columns to hutube_notifications

  ## Problem
  The frontend queries hutube_notifications with a foreign key join on actor_channel_id:
    actor_channel:actor_channel_id (handle, display_name, profile_photo_url)
  
  It also filters on a `dismissed` column. Both columns are missing from the table,
  causing PostgREST to return a schema relationship error that breaks the HuTube
  watch page (videos fail to load because the notification request errors out).

  ## Changes
  1. New Columns
    - `actor_channel_id` (uuid, nullable) - FK to hutube_channels(id), identifies which
      channel performed the action that triggered the notification
    - `dismissed` (boolean, default false) - allows users to dismiss notifications
      without marking them as read

  2. Backfill
    - Copies `channel_id` into `actor_channel_id` for all existing rows, since for
      the existing "new_video" notification type the acting channel is the same as
      the referenced channel

  3. Trigger Update
    - Rewrites trigger_notify_subscribers_on_upload to populate actor_channel_id
      alongside channel_id
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hutube_notifications' AND column_name = 'actor_channel_id'
  ) THEN
    ALTER TABLE hutube_notifications ADD COLUMN actor_channel_id uuid REFERENCES hutube_channels(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hutube_notifications' AND column_name = 'dismissed'
  ) THEN
    ALTER TABLE hutube_notifications ADD COLUMN dismissed boolean DEFAULT false;
  END IF;
END $$;

UPDATE hutube_notifications
SET actor_channel_id = channel_id
WHERE actor_channel_id IS NULL AND channel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION trigger_notify_subscribers_on_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO hutube_notifications (user_id, type, video_id, channel_id, actor_channel_id, message)
  SELECT
    s.user_id,
    'new_video',
    NEW.id,
    NEW.channel_id,
    NEW.channel_id,
    c.display_name || ' uploaded a new video: ' || NEW.title
  FROM hutube_subscriptions s
  JOIN hutube_channels c ON c.id = NEW.channel_id
  WHERE s.channel_id = NEW.channel_id;

  RETURN NEW;
END;
$$;
