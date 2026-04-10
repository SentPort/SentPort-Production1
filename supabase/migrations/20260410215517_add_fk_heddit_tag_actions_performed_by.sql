/*
  # Add foreign key from heddit_tag_actions.performed_by to user_profiles

  ## Problem
  The heddit_tag_actions table had no foreign key from performed_by to user_profiles.id.
  PostgREST requires an explicit FK constraint to resolve embedded resource joins
  (the `user_profiles(email)` syntax in Supabase queries). Without it, the join
  silently fails and the entire query returns no rows.

  ## Changes
  - Add FK constraint from heddit_tag_actions.performed_by -> user_profiles.id
  - Uses ON DELETE SET NULL so action history is preserved if a user is deleted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'heddit_tag_actions_performed_by_fkey'
      AND table_name = 'heddit_tag_actions'
  ) THEN
    ALTER TABLE heddit_tag_actions
      ADD CONSTRAINT heddit_tag_actions_performed_by_fkey
      FOREIGN KEY (performed_by) REFERENCES user_profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;
