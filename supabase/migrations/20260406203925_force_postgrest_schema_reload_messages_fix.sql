/*
  # Force PostgREST Schema Cache Reload - Fix Message Sending

  1. Problem
    - Messages INSERT policy was updated to include user_conversation_access fallback
    - Conversations SELECT policy was updated to include user_conversation_access fallback
    - Policies exist correctly in database and pass direct SQL tests
    - BUT: PostgREST HTTP API still returns 403 errors when sending messages
    
  2. Root Cause
    - PostgREST caches schema information including RLS policies
    - When policies are updated, PostgREST continues using cached old versions
    - The cache is not automatically invalidated on policy changes
    - Result: HTTP API uses stale policies while direct SQL uses current ones
    
  3. Solution
    - Send NOTIFY signal on pgrst channel to force PostgREST schema reload
    - This triggers PostgREST to re-read all policies from database
    - Ensures HTTP API uses current policy definitions
    
  4. Changes
    - Execute NOTIFY pgrst to force immediate schema cache reload
    - Add comment documenting this pattern for future policy updates
*/

-- Force PostgREST to reload its schema cache
-- This is CRITICAL after any RLS policy changes to ensure the HTTP API 
-- uses the updated policies instead of stale cached versions
NOTIFY pgrst, 'reload schema';

-- Verify the current messages INSERT policy includes fallback
DO $$
DECLARE
  v_policy_check text;
BEGIN
  SELECT with_check INTO v_policy_check
  FROM pg_policies
  WHERE tablename = 'messages' 
    AND policyname = 'Users can send messages to their conversations'
    AND cmd = 'INSERT';
    
  -- Verify it contains the fallback logic
  IF v_policy_check NOT LIKE '%user_conversation_access%' THEN
    RAISE EXCEPTION 'Messages INSERT policy missing user_conversation_access fallback!';
  END IF;
  
  RAISE NOTICE 'Messages INSERT policy verified: contains fallback logic';
END $$;

-- Verify the conversations SELECT policy includes fallback  
DO $$
DECLARE
  v_policy_check text;
BEGIN
  SELECT qual INTO v_policy_check
  FROM pg_policies
  WHERE tablename = 'conversations' 
    AND policyname = 'Users can view their conversations'
    AND cmd = 'SELECT';
    
  -- Verify it contains the fallback logic
  IF v_policy_check NOT LIKE '%user_conversation_access%' THEN
    RAISE EXCEPTION 'Conversations SELECT policy missing user_conversation_access fallback!';
  END IF;
  
  RAISE NOTICE 'Conversations SELECT policy verified: contains fallback logic';
END $$;
