/*
  # Update Message Visibility Trigger to Respect Permanent Blocks

  1. Updated Functions
    - `create_message_visibility()` - Now respects permanently_blocked status

  2. Logic Changes
    - Creates visibility for ALL participants where permanently_blocked = false
    - Includes participants with deleted_at set (they'll be restored by previous trigger)
    - Skips participants where permanently_blocked = true
    - This ensures blocked users never see messages, even if someone tries to send them

  3. Security
    - Uses SECURITY DEFINER to bypass RLS
    - Prevents message delivery to blocked participants

  4. Important Notes
    - This trigger runs AFTER the restoration trigger
    - By this point, deleted_at has already been cleared for non-blocked users
    - Permanently blocked users remain blocked and get no visibility
*/

-- Update function to create visibility records, respecting permanent blocks
CREATE OR REPLACE FUNCTION create_message_visibility()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create visibility for all participants who haven't permanently blocked this conversation
  -- This includes participants who had temporarily deleted it (they've been restored by now)
  INSERT INTO message_visibility (message_id, user_id)
  SELECT NEW.id, cp.user_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.permanently_blocked = false
  ON CONFLICT (message_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger is already created, but let's ensure it exists
DROP TRIGGER IF EXISTS create_message_visibility_trigger ON messages;
CREATE TRIGGER create_message_visibility_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_visibility();
