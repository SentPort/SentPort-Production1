/*
  # Fix HuBook Notifications Comment Foreign Key

  ## Problem
  The hubook_notifications.comment_id foreign key points to platform_comments table,
  but HuBook comments are stored in the comments table. This causes foreign key
  constraint violations when creating comment notifications.

  ## Changes
  1. Drop the incorrect foreign key constraint to platform_comments
  2. Add the correct foreign key constraint to comments table
  
  ## Impact
  - Fixes "Failed to post comment" errors
  - Allows comment notifications to be created successfully
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE hubook_notifications
DROP CONSTRAINT IF EXISTS hubook_notifications_comment_id_fkey;

-- Add the correct foreign key constraint pointing to comments table
ALTER TABLE hubook_notifications
ADD CONSTRAINT hubook_notifications_comment_id_fkey 
FOREIGN KEY (comment_id) 
REFERENCES comments(id) 
ON DELETE CASCADE;
