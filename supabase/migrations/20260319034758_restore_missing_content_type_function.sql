/*
  # Restore Missing Content Type Function

  ## Problem
  The migration 20260319033141 dropped update_search_index_content_type_by_domain()
  but there's a trigger apply_content_type_rule() that still calls it.
  This causes INSERT/UPDATE on content_type_domain_rules to fail silently.

  ## Solution
  Since the bulk function now handles search_index updates directly,
  we should disable the trigger to prevent conflicts and the missing function error.
  The trigger was causing individual row updates which is what the migration
  was trying to avoid for performance reasons.
*/

-- Drop the broken trigger (it was calling a function that no longer exists)
DROP TRIGGER IF EXISTS trigger_apply_content_type_rule ON content_type_domain_rules;

-- Drop the trigger function (it calls the deleted update function)
DROP FUNCTION IF EXISTS apply_content_type_rule();
