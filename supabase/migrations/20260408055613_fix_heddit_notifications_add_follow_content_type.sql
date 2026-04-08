/*
  # Fix Heddit Notifications - Add 'follow' Content Type

  1. Changes
    - Drop existing check constraint on `heddit_notifications.content_type`
    - Add new check constraint that includes 'follow' as a valid content type
  
  2. Security
    - No RLS changes needed
    - Only modifies constraint to match actual usage
*/

-- Drop the existing constraint
ALTER TABLE heddit_notifications
DROP CONSTRAINT IF EXISTS heddit_notifications_content_type_check;

-- Add the updated constraint with 'follow' included
ALTER TABLE heddit_notifications
ADD CONSTRAINT heddit_notifications_content_type_check
CHECK (content_type = ANY (ARRAY['post'::text, 'comment'::text, 'subreddit'::text, 'badge'::text, 'kindness_gift'::text, 'follow'::text]));
