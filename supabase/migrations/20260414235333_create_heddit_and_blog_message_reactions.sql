/*
  # Create Message Reactions for Heddit and HuBlog

  ## Summary
  Adds message reaction support to the Heddit and HuBlog messaging systems,
  mirroring the existing HuBook message reactions feature.

  ## New Tables

  ### `heddit_message_reactions`
  - `id` (uuid, primary key)
  - `message_id` (uuid, FK to heddit_messages, CASCADE delete)
  - `account_id` (uuid, FK to heddit_accounts, CASCADE delete) - the reacting user's Heddit account
  - `emoji` (text, constrained to 8 supported emojis)
  - `created_at` (timestamptz)
  - Unique constraint on (message_id, account_id, emoji)

  ### `blog_message_reactions`
  - `id` (uuid, primary key)
  - `message_id` (uuid, FK to blog_messages, CASCADE delete)
  - `account_id` (uuid, FK to blog_accounts, CASCADE delete) - the reacting user's blog account
  - `emoji` (text, constrained to 8 supported emojis)
  - `created_at` (timestamptz)
  - Unique constraint on (message_id, account_id, emoji)

  ## Security
  - RLS enabled on both tables
  - SELECT: only conversation participants can view reactions
  - INSERT: users can only insert their own reactions (account_id must match their account)
  - DELETE: users can only delete their own reactions

  ## Notes
  - Emoji set matches HuBook: ❤️ 👍 😂 😮 😢 😡 🎉 🔥
  - heddit_accounts.id is looked up via heddit_accounts.user_id = auth.uid()
  - blog_accounts.id = auth.uid() (blog_accounts.id is a FK to user_profiles.id which equals auth.uid())
*/

-- ============================================================
-- HEDDIT MESSAGE REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS heddit_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES heddit_messages(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🔥')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, account_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_heddit_message_reactions_message_id ON heddit_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_heddit_message_reactions_account_id ON heddit_message_reactions(account_id);

ALTER TABLE heddit_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view heddit message reactions"
  ON heddit_message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_messages m
      JOIN heddit_conversations c ON c.id = m.conversation_id
      JOIN heddit_accounts a ON a.user_id = auth.uid()
      WHERE m.id = message_id
        AND (c.participant_one_id = a.id OR c.participant_two_id = a.id)
    )
  );

CREATE POLICY "Users can add heddit message reactions for their own account"
  ON heddit_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM heddit_messages m
      JOIN heddit_conversations c ON c.id = m.conversation_id
      JOIN heddit_accounts a ON a.user_id = auth.uid()
      WHERE m.id = message_id
        AND (c.participant_one_id = a.id OR c.participant_two_id = a.id)
    )
  );

CREATE POLICY "Users can delete their own heddit message reactions"
  ON heddit_message_reactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()
    )
  );

-- ============================================================
-- BLOG MESSAGE REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES blog_messages(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES blog_accounts(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🔥')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, account_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_blog_message_reactions_message_id ON blog_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_blog_message_reactions_account_id ON blog_message_reactions(account_id);

ALTER TABLE blog_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view blog message reactions"
  ON blog_message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_messages m
      JOIN blog_conversation_participants p ON p.conversation_id = m.conversation_id
      WHERE m.id = message_id
        AND p.account_id = auth.uid()
    )
  );

CREATE POLICY "Users can add blog message reactions for their own account"
  ON blog_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM blog_messages m
      JOIN blog_conversation_participants p ON p.conversation_id = m.conversation_id
      WHERE m.id = message_id
        AND p.account_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own blog message reactions"
  ON blog_message_reactions FOR DELETE
  TO authenticated
  USING (account_id = auth.uid());
