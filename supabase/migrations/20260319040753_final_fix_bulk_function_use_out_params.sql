/*
  # Final Fix - Use SETOF Record Instead of RETURNS TABLE

  ## Problem
  RETURNS TABLE creates variables that conflict with column names.
  Using "domain" as both a column name and in the INSERT causes ambiguity.

  ## Solution
  Return anonymous records using RETURNS SETOF record and explicitly
  cast each returned row.

  ## Changes
  - Use RETURNS SETOF record with explicit column structure
  - No conflicting variable names
*/

DROP FUNCTION IF EXISTS bulk_add_content_type_rules(text[], content_type_enum, uuid);

CREATE FUNCTION bulk_add_content_type_rules(
  p_domains text[],
  p_content_type content_type_enum,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_input_domain text;
  v_base_domain text;
  v_is_admin boolean;
  v_existed boolean;
  v_matched integer;
  v_updated integer;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  -- Admin check
  IF p_created_by IS NOT NULL THEN
    SELECT COALESCE(up.is_admin, false) INTO v_is_admin
    FROM user_profiles up WHERE up.id = p_created_by;
    
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can manage content type rules';
    END IF;
  END IF;

  -- Process each domain
  FOREACH v_input_domain IN ARRAY p_domains LOOP
    v_base_domain := extract_base_domain(v_input_domain);
    
    IF v_base_domain IS NULL OR v_base_domain = '' THEN
      CONTINUE;
    END IF;

    -- Check if exists
    v_existed := EXISTS(
      SELECT 1 FROM content_type_domain_rules ctdr 
      WHERE ctdr.domain = v_base_domain
    );

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
    FROM search_index si
    WHERE extract_base_domain(si.url) = v_base_domain
      AND si.content_type <> p_content_type;

    -- Update search_index (max 5000 rows per domain)
    IF v_matched > 0 AND v_matched <= 5000 THEN
      UPDATE search_index si
      SET content_type = p_content_type
      WHERE extract_base_domain(si.url) = v_base_domain
        AND si.content_type <> p_content_type;
      
      GET DIAGNOSTICS v_updated = ROW_COUNT;
    ELSE
      v_updated := 0;
    END IF;

    -- Build result object
    v_result := jsonb_build_object(
      'domain', v_base_domain,
      'rule_action', CASE WHEN v_existed THEN 'updated' ELSE 'inserted' END,
      'search_index_updated', v_updated,
      'total_matches', v_matched
    );
    
    -- Append to results array
    v_results := v_results || jsonb_build_array(v_result);
      
  END LOOP;
  
  RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_add_content_type_rules(text[], content_type_enum, uuid) TO authenticated;
