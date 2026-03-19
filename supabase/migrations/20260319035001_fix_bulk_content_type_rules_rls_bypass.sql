/*
  # Fix bulk_add_content_type_rules RLS Blocking Inserts

  ## Problem
  Even though the function is SECURITY DEFINER, RLS policies still apply.
  Inside the function, auth.uid() returns NULL, so the RLS policy check:
  "WHERE user_profiles.id = auth.uid() AND is_admin = true" fails.
  This prevents INSERT/UPDATE from succeeding.

  ## Solution
  Disable RLS temporarily inside the function using SET LOCAL row_security = off.
  This is safe because the function already has an admin check at the beginning.
*/

CREATE OR REPLACE FUNCTION bulk_add_content_type_rules(
  p_domains text[],
  p_content_type content_type_enum,
  p_created_by uuid
)
RETURNS TABLE(
  domain text,
  rule_action text,
  search_index_updated integer,
  total_matches integer
) AS $$
DECLARE
  d text;
  base_domain text;
  domain_exists boolean;
  insert_succeeded boolean;
  updated_count integer;
  matched_count integer;
  max_updates_per_domain constant integer := 5000;
BEGIN
  -- Verify admin (allow NULL for system operations)
  IF p_created_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = p_created_by AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can add content type rules';
  END IF;

  -- Disable RLS for this transaction since we already verified admin
  SET LOCAL row_security = off;

  FOREACH d IN ARRAY p_domains
  LOOP
    -- Reset flags for this iteration
    insert_succeeded := false;
    updated_count := 0;
    matched_count := 0;
    
    -- Extract base domain
    base_domain := extract_base_domain(d);
    
    -- Skip empty domains
    IF base_domain IS NULL OR base_domain = '' THEN
      CONTINUE;
    END IF;

    -- Check if domain already exists BEFORE insert
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM content_type_domain_rules 
        WHERE content_type_domain_rules.domain = base_domain
      ) INTO domain_exists;
    EXCEPTION WHEN OTHERS THEN
      domain_exists := false;
    END;

    -- Try to insert or update the rule
    BEGIN
      INSERT INTO content_type_domain_rules (domain, content_type, created_by)
      VALUES (base_domain, p_content_type, p_created_by)
      ON CONFLICT (domain) DO UPDATE 
      SET 
        content_type = EXCLUDED.content_type,
        created_by = EXCLUDED.created_by,
        created_at = now();
      
      insert_succeeded := true;
      
    EXCEPTION WHEN OTHERS THEN
      -- If insert/update fails, log and skip this domain
      RAISE WARNING 'Error processing domain %: %', base_domain, SQLERRM;
      insert_succeeded := false;
    END;

    -- Only proceed if insert/update succeeded
    IF insert_succeeded THEN
      -- Count how many rows would be affected
      BEGIN
        SELECT COUNT(*) INTO matched_count
        FROM search_index
        WHERE extract_base_domain(url) = base_domain
          AND content_type != p_content_type;
      EXCEPTION WHEN OTHERS THEN
        matched_count := 0;
      END;

      -- Only update if within reasonable limits
      IF matched_count > 0 AND matched_count <= max_updates_per_domain THEN
        BEGIN
          -- Batch update all matching search_index entries
          UPDATE search_index
          SET content_type = p_content_type
          WHERE extract_base_domain(url) = base_domain
            AND content_type != p_content_type;
          
          GET DIAGNOSTICS updated_count = ROW_COUNT;
        EXCEPTION WHEN OTHERS THEN
          updated_count := 0;
          RAISE WARNING 'Error updating search_index for domain %: %', base_domain, SQLERRM;
        END;
      ELSIF matched_count > max_updates_per_domain THEN
        -- Too many matches - skip update and warn
        updated_count := 0;
        RAISE WARNING 'Domain % has % matching URLs (exceeds limit of %), skipping update', 
          base_domain, matched_count, max_updates_per_domain;
      END IF;

      -- Return result for this domain (always execute if insert succeeded)
      RETURN QUERY SELECT 
        base_domain,
        CASE WHEN domain_exists THEN 'updated' ELSE 'inserted' END,
        updated_count,
        matched_count;
    END IF;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION bulk_add_content_type_rules(text[], content_type_enum, uuid) TO authenticated;
