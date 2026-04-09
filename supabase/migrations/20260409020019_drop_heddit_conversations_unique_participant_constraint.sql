/*
  # Drop unique constraint on heddit_conversations participant pair

  ## Summary
  Removes the UNIQUE constraint on (participant_one_id, participant_two_id) in the
  heddit_conversations table. This allows two users to have multiple simultaneous
  conversations, which is the intended HuBook-style behavior. The "Start New
  Conversation" button should always create a fresh conversation rather than
  redirecting to an existing one.

  ## Changes
  - heddit_conversations: DROP UNIQUE(participant_one_id, participant_two_id)

  ## Notes
  - Existing conversations are unaffected
  - Application logic in Messages.tsx is updated separately to always INSERT a new row
*/

ALTER TABLE heddit_conversations
  DROP CONSTRAINT IF EXISTS heddit_conversations_participant_one_id_participant_two_id_key;
