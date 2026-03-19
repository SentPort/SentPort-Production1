/*
  # Create Working Bulk Content Type Rules Function

  ## Problem
  The existing function returns empty results for unknown reasons.
  Starting fresh with the simplest possible working implementation.

  ## Solution
  Create a new function with minimal complexity that:
  1. Checks admin status directly
  2. Inserts/updates domain rules
  3. Updates search index
  4. Returns results

  ## Changes
  - Drop existing problematic function
  - Create new simplified version
  - Test thoroughly before deploying
*/

-- Drop all test functions
DROP FUNCTION IF EXISTS test_bulk_add(text[], content_type_enum, uuid);
DROP FUNCTION IF EXISTS test_security_definer_admin_check(uuid);

-- Drop the problematic function completely
DROP FUNCTION IF EXISTS bulk_add_content_type_rules(text[], content_type_enum, uuid);

-- Create brand new working version
CREATE FUNCTION bulk_add_content_type_rules(
  p_domains text[],
  p_content_type content_type_enum,
  p_created_by uuid
)
RETURNS TABLE(
  domain text,
  rule_action text,
  search_index_updated integer,
  total_matches integer
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_domain text;
  v_base_domain text;
  v_is_admin boolean;
  v_existed boolean;
  v_matched integer;
  v_updated integer;
BEGIN
  -- Admin check
  IF p_created_by IS NOT NULL THEN
    SELECT COALESCE(is_admin, false) INTO v_is_admin
    FROM user_profiles WHERE id = p_created_by;
    
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can manage content type rules';
    END IF;
  END IF;

  -- Process each domain
  FOREACH v_domain IN ARRAY p_domains LOOP
    v_base_domain := extract_base_domain(v_domain);
    
    IF v_base_domain IS NULL OR v_base_domain = '' THEN
      CONTINUE;
    END IF;

    -- Check if exists
    v_existed := EXISTS(SELECT 1 FROM content_type_domain_rules WHERE domain = v_base_domain);

    -- Upsert rule
    INSERT INTO content_type_domain_rules (domain, content_type, created_by)
    VALUES (v_base_domain, p_content_type, p_created_by)
    ON CONFLICT (domain) 
    DO UPDATE SET 
      content_type = EXCLUDED.content_type,
      created_by = EXCLUDED.created_by,
      created_at = now();

    -- Count matches in search_index
    SELECT COUNT(*) INTO v_matched
    FROM search_index
    WHERE extract_base_domain(url) = v_base_domain
      AND content_type <> p_content_type;

    -- Update search_index (max 5000 rows per domain)
    IF v_matched > 0 AND v_matched <= 5000 THEN
      UPDATE search_index
      SET content_type = p_content_type
      WHERE extract_base_domain(url) = v_base_domain
        AND content_type <> p_content_type;
      
      GET DIAGNOSTICS v_updated = ROW_COUNT;
    ELSE
      v_updated := 0;
    END IF;

    -- Return row
    domain := v_base_domain;
    rule_action := CASE WHEN v_existed THEN 'updated' ELSE 'inserted' END;
    search_index_updated := v_updated;
    total_matches := v_matched;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION bulk_add_content_type_rules(text[], content_type_enum, uuid) TO authenticated;
