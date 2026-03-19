/*
  # Fix Bulk Content Type Rules - Rename Output Columns

  ## Problem
  RETURNS TABLE has column "domain" which creates ambiguity with
  the content_type_domain_rules.domain table column.

  ## Solution
  Rename output columns to avoid any conflicts:
  - domain -> result_domain
  - rule_action -> result_action
  - etc.

  ## Changes
  - Rename all RETURNS TABLE columns to avoid conflicts
  - Update assignments to use new names
*/

DROP FUNCTION IF EXISTS bulk_add_content_type_rules(text[], content_type_enum, uuid);

CREATE FUNCTION bulk_add_content_type_rules(
  p_domains text[],
  p_content_type content_type_enum,
  p_created_by uuid
)
RETURNS TABLE(
  result_domain text,
  result_action text,
  result_search_updated integer,
  result_total_matches integer
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
    SELECT COALESCE(up.is_admin, false) INTO v_is_admin
    FROM user_profiles up WHERE up.id = p_created_by;
    
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

    -- Return row with new column names
    result_domain := v_base_domain;
    result_action := CASE WHEN v_existed THEN 'updated' ELSE 'inserted' END;
    result_search_updated := v_updated;
    result_total_matches := v_matched;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_add_content_type_rules(text[], content_type_enum, uuid) TO authenticated;
