/*
  # Fix Heddit Follower Notification Function Overload Conflict

  1. Problem
    - Two versions of `should_create_heddit_notification` exist in the database
    - Version 1: (p_user_id uuid, p_notification_type text)
    - Version 2: (p_user_id uuid, p_notification_type text, p_current_time timestamptz)
    - PostgreSQL cannot determine which function to call, causing "function is not unique" error
    - This breaks the follow functionality on Heddit

  2. Solution
    - Drop the older 2-parameter version of the function
    - Keep only the 3-parameter version which has a default value for p_current_time
    - This resolves the ambiguity and allows the trigger to work correctly

  3. Impact
    - Fixes the "Follow" button functionality on Heddit profiles
    - Ensures notification preference checks work properly
*/

-- Drop the old 2-parameter version of the function
DROP FUNCTION IF EXISTS should_create_heddit_notification(uuid, text);

-- The 3-parameter version with default remains and will be used by all triggers
-- No need to recreate it as it already exists from migration 20260408053820
