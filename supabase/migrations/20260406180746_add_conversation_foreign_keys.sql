/*
  # Add Foreign Key Constraints to conversation_participants

  1. Problem
    - conversation_participants table has no foreign key constraints
    - Supabase PostgREST cannot perform automatic joins without foreign keys
    - Queries like .select('conversations(*)') fail silently
    - This causes "Failed to load conversation after retries" errors

  2. Changes
    - Add foreign key from conversation_participants.conversation_id to conversations.id
    - Add foreign key from conversation_participants.user_id to user_profiles.id
    - Add indexes on both foreign key columns for performance
    - Set CASCADE on conversation deletion, RESTRICT on user deletion
    - These enable PostgREST automatic relationship resolution

  3. Security
    - Foreign keys enforce referential integrity
    - Cannot create conversation_participants for non-existent conversations
    - Cannot create participants for non-existent users
    - Deleting a conversation automatically cleans up participants
*/

-- Add foreign key constraint from conversation_participants.conversation_id to conversations.id
-- CASCADE ensures that when a conversation is deleted, all participants are removed
ALTER TABLE conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_conversation_id_fkey;

ALTER TABLE conversation_participants
  ADD CONSTRAINT conversation_participants_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES conversations(id)
  ON DELETE CASCADE;

-- Add foreign key constraint from conversation_participants.user_id to user_profiles.id
-- RESTRICT prevents deleting a user who is still a participant in conversations
ALTER TABLE conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;

ALTER TABLE conversation_participants
  ADD CONSTRAINT conversation_participants_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(id)
  ON DELETE RESTRICT;

-- Add indexes for performance on foreign key columns (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id
  ON conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
  ON conversation_participants(user_id);
