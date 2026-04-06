/*
  # Add Foreign Key Constraints to Messages Table

  1. Changes
    - Add foreign key from messages.sender_id to user_profiles.id
    - Add foreign key from messages.conversation_id to conversations.id (if missing)
    - Add indexes for better query performance
    - Use ON DELETE SET NULL for sender_id (preserve messages if user deleted)
    - Use ON DELETE CASCADE for conversation_id (delete messages when conversation deleted)

  2. Security
    - No RLS changes needed (existing policies remain)
    - Foreign keys ensure referential integrity
*/

-- Add index on sender_id for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Add index on conversation_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Add foreign key constraint from sender_id to user_profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_sender_id_fkey' 
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES user_profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint from conversation_id to conversations.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_conversation_id_fkey' 
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE;
  END IF;
END $$;
