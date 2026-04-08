/*
  # Add Permanent Blocking for Conversations

  1. Schema Changes
    - Add `permanently_blocked` column to `conversation_participants`
    - Add `blocked_at` column to `conversation_participants`
    - Add indexes for query performance

  2. Important Notes
    - `permanently_blocked = false` means conversation can be restored when new messages arrive
    - `permanently_blocked = true` means conversation will NEVER be restored, even with new messages
    - This distinguishes between soft delete (hide) and hard delete (block forever)
    - When both users block a conversation, it effectively becomes permanently deleted
*/

-- Add permanent blocking columns to conversation_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'permanently_blocked'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN permanently_blocked boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'blocked_at'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN blocked_at timestamptz DEFAULT null;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_permanently_blocked
  ON conversation_participants(permanently_blocked);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conversation
  ON conversation_participants(user_id, conversation_id);

-- Update existing records to ensure they're not blocked
UPDATE conversation_participants
SET permanently_blocked = false
WHERE permanently_blocked IS NULL;
