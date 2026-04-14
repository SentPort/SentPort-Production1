/*
  # Fix Blog Conversation RLS Infinite Recursion - Complete Fix

  ## Problem
  Two SELECT policies on blog_conversations and blog_conversation_participants
  form a mutual dependency cycle causing infinite recursion (PostgreSQL error 42P17).

  The existing user_conversation_access table belongs to HuBook (references conversations,
  not blog_conversations), so we need a dedicated blog helper table.

  ## Changes
  1. Create blog_conversation_access helper table (flat, no circular refs)
  2. Drop the three circular RLS policies
  3. Re-create them using blog_conversation_access
  4. Update find_or_create_blog_conversation to populate the helper table
  5. Create create_new_blog_conversation (always new, no lookup)
  6. Backfill blog_conversation_access for existing conversations
*/

-- Step 1: Create the blog_conversation_access helper table

CREATE TABLE IF NOT EXISTS blog_conversation_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES blog_conversations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

ALTER TABLE blog_conversation_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blog conversation access"
  ON blog_conversation_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 2: Drop the circular RLS policies

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON blog_conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON blog_conversations;
DROP POLICY IF EXISTS "Users can view co-participants via conversations" ON blog_conversation_participants;

-- Step 3: Re-create policies using blog_conversation_access (no circular reference)

CREATE POLICY "Users can view conversations they participate in"
  ON blog_conversations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM blog_conversation_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations they participate in"
  ON blog_conversations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM blog_conversation_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view co-participants via conversations"
  ON blog_conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM blog_conversation_access
      WHERE user_id = auth.uid()
    )
  );

-- Step 4: Replace find_or_create_blog_conversation to populate blog_conversation_access

CREATE OR REPLACE FUNCTION find_or_create_blog_conversation(
  p_user_a_id uuid,
  p_user_b_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_ids uuid[];
  v_id1 uuid;
  v_id2 uuid;
BEGIN
  v_ids := ARRAY[p_user_a_id, p_user_b_id];
  v_ids := ARRAY(SELECT unnest(v_ids) ORDER BY 1);
  v_id1 := v_ids[1];
  v_id2 := v_ids[2];

  -- Find existing conversation where neither participant has permanently blocked it
  SELECT bc.id INTO v_conversation_id
  FROM blog_conversations bc
  JOIN blog_conversation_participants bcp1
    ON bcp1.conversation_id = bc.id AND bcp1.account_id = p_user_a_id
  JOIN blog_conversation_participants bcp2
    ON bcp2.conversation_id = bc.id AND bcp2.account_id = p_user_b_id
  WHERE bcp1.permanently_blocked = false
    AND bcp2.permanently_blocked = false
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    -- Restore if caller had soft-deleted/hidden it
    UPDATE blog_conversation_participants
    SET deleted_at = NULL, is_hidden = false, hidden_at = NULL
    WHERE conversation_id = v_conversation_id
      AND account_id = p_user_a_id
      AND (deleted_at IS NOT NULL OR is_hidden = true);

    -- Ensure access rows exist
    INSERT INTO blog_conversation_access (user_id, conversation_id)
    VALUES (p_user_a_id, v_conversation_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO blog_conversation_access (user_id, conversation_id)
    VALUES (p_user_b_id, v_conversation_id)
    ON CONFLICT DO NOTHING;

    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO blog_conversations (participant_1_id, participant_2_id)
  VALUES (v_id1, v_id2)
  RETURNING id INTO v_conversation_id;

  INSERT INTO blog_conversation_participants (conversation_id, account_id)
  VALUES (v_conversation_id, p_user_a_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO blog_conversation_participants (conversation_id, account_id)
  VALUES (v_conversation_id, p_user_b_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO blog_conversation_access (user_id, conversation_id)
  VALUES (p_user_a_id, v_conversation_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO blog_conversation_access (user_id, conversation_id)
  VALUES (p_user_b_id, v_conversation_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

-- Step 5: Create create_new_blog_conversation (always creates new, no lookup)

CREATE OR REPLACE FUNCTION create_new_blog_conversation(
  p_user_a_id uuid,
  p_user_b_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_ids uuid[];
  v_id1 uuid;
  v_id2 uuid;
BEGIN
  v_ids := ARRAY[p_user_a_id, p_user_b_id];
  v_ids := ARRAY(SELECT unnest(v_ids) ORDER BY 1);
  v_id1 := v_ids[1];
  v_id2 := v_ids[2];

  INSERT INTO blog_conversations (participant_1_id, participant_2_id)
  VALUES (v_id1, v_id2)
  RETURNING id INTO v_conversation_id;

  INSERT INTO blog_conversation_participants (conversation_id, account_id)
  VALUES (v_conversation_id, p_user_a_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO blog_conversation_participants (conversation_id, account_id)
  VALUES (v_conversation_id, p_user_b_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO blog_conversation_access (user_id, conversation_id)
  VALUES (p_user_a_id, v_conversation_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO blog_conversation_access (user_id, conversation_id)
  VALUES (p_user_b_id, v_conversation_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

-- Step 6: Backfill blog_conversation_access for all existing conversations

INSERT INTO blog_conversation_access (user_id, conversation_id)
SELECT bcp.account_id, bcp.conversation_id
FROM blog_conversation_participants bcp
ON CONFLICT DO NOTHING;
