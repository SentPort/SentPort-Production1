/*
  # Create Mention Notification System

  1. New Function
    - `create_mention_notification()` - Trigger function that creates a notification
      when a user is mentioned in a post or comment

  2. New Trigger
    - Fires AFTER INSERT on `hubook_mentions` table
    - Automatically creates a notification for the mentioned user
    - Includes reference to the user who mentioned them and the content

  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS when creating notifications
    - Ensures notifications are created even when the mentioned user hasn't granted access

  4. Behavior
    - Creates one notification per mention
    - Sets notification type to 'mention'
    - Links to the mentioning user as related_user_id
    - Stores the content_type and content_id for future reference
*/

-- Create function to handle mention notifications
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification for the mentioned user
  INSERT INTO notifications (
    user_id,
    type,
    related_user_id,
    content_id,
    content_type,
    is_read
  ) VALUES (
    NEW.mentioned_user_id,
    'mention',
    NEW.mentioning_user_id,
    NEW.content_id,
    NEW.content_type,
    false
  );

  RETURN NEW;
END;
$$;

-- Create trigger on hubook_mentions table
DROP TRIGGER IF EXISTS on_mention_created ON hubook_mentions;

CREATE TRIGGER on_mention_created
  AFTER INSERT ON hubook_mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();