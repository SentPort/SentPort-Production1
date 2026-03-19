/*
  # Fix Bulk Content Type Rules NULL Variable Bug

  ## Problem
  The bulk_add_content_type_rules function is returning empty results because:
  - Line 87 uses `RETURNING (xmax = 0) INTO rule_inserted`
  - When ON CONFLICT DO UPDATE executes, this doesn't properly set the variable
  - rule_inserted becomes NULL instead of true/false
  - The CASE statement on line 122 fails with NULL, causing no rows to return
  - Frontend receives empty array, so no success message or UI update occurs

  ## Solution
  Replace the xmax approach with a reliable method:
  1. Check if domain exists BEFORE the INSERT/UPDATE
  2. Use that result to determine if it was an insert or update
  3. Ensure rule_inserted is always a proper boolean value
  4. Guarantee RETURN QUERY always executes for each domain

  ## Changes
  - Add EXISTS check before INSERT to detect if domain already exists
  - Set rule_inserted based on pre-check instead of RETURNING clause
  - Remove unreliable xmax pattern
  - Ensure function always returns results for successfully processed domains
*/

-- Replace the broken function with a working version
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

  FOREACH d IN ARRAY p_domains
  LOOP
    -- Extract base domain
    base_domain := extract_base_domain(d);
    
    -- Skip empty domains
    IF base_domain IS NULL OR base_domain = '' THEN
      CONTINUE;
    END IF;

    -- Check if domain already exists BEFORE insert
    SELECT EXISTS(
      SELECT 1 FROM content_type_domain_rules 
      WHERE domain = base_domain
    ) INTO domain_exists;

    -- Try to insert or update the rule
    BEGIN
      INSERT INTO content_type_domain_rules (domain, content_type, created_by)
      VALUES (base_domain, p_content_type, p_created_by)
      ON CONFLICT (domain) DO UPDATE 
      SET 
        content_type = EXCLUDED.content_type,
        created_by = EXCLUDED.created_by,
        created_at = now();
      
    EXCEPTION WHEN OTHERS THEN
      -- If there's any error, log it and continue
      RAISE WARNING 'Error processing domain %: %', base_domain, SQLERRM;
      CONTINUE;
    END;

    -- Count how many rows would be affected
    SELECT COUNT(*) INTO matched_count
    FROM search_index
    WHERE extract_base_domain(url) = base_domain
      AND content_type != p_content_type;

    -- Only update if within reasonable limits
    IF matched_count <= max_updates_per_domain THEN
      -- Batch update all matching search_index entries
      UPDATE search_index
      SET content_type = p_content_type
      WHERE extract_base_domain(url) = base_domain
        AND content_type != p_content_type;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
    ELSE
      -- Too many matches - skip update and warn
      updated_count := 0;
      RAISE WARNING 'Domain % has % matching URLs (exceeds limit of %), skipping update', 
        base_domain, matched_count, max_updates_per_domain;
    END IF;

    -- Return result for this domain
    -- domain_exists was checked BEFORE insert, so if it was true, we updated; if false, we inserted
    RETURN QUERY SELECT 
      base_domain,
      CASE WHEN domain_exists THEN 'updated' ELSE 'inserted' END,
      updated_count,
      matched_count;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION bulk_add_content_type_rules(text[], content_type_enum, uuid) TO authenticated;
