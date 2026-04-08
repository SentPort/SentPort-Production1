/*
  # Fix Message Notification Type Constraint

  1. Problem
    - The `hubook_notifications` table check constraint does not include 'message' as a valid type
    - The `notify_message_received()` trigger tries to insert notifications with type = 'message'
    - This causes a constraint violation error when users try to send messages

  2. Solution
    - Drop the existing check constraint
    - Create a new constraint that includes 'message' in the allowed notification types

  3. Allowed Notification Types (Updated)
    - friend_request
    - friend_accepted
    - comment
    - reply
    - reaction
    - share
    - mention
    - tag
    - message (NEW)

  4. Security
    - Maintains data integrity by enforcing valid notification types
    - Allows message notifications to be created properly
*/

-- Drop the existing check constraint
ALTER TABLE hubook_notifications DROP CONSTRAINT IF EXISTS hubook_notifications_type_check;

-- Create updated constraint with 'message' included
ALTER TABLE hubook_notifications ADD CONSTRAINT hubook_notifications_type_check 
  CHECK (type = ANY (ARRAY[
    'friend_request'::text,
    'friend_accepted'::text,
    'comment'::text,
    'reply'::text,
    'reaction'::text,
    'share'::text,
    'mention'::text,
    'tag'::text,
    'message'::text
  ]));