/*
  # Rewrite Bulk Content Type Rules - Fix Admin Check

  ## Problem
  The function does an admin check with:
  SELECT 1 FROM user_profiles WHERE id = p_created_by AND is_admin = true
  
  Even with permissive RLS policies, this fails inside SECURITY DEFINER because
  the query context doesn't have proper auth.uid() set.

  ## Solution
  Use a direct column query without relying on RLS policies:
  SELECT is_admin FROM user_profiles WHERE id = p_created_by
  
  This bypasses RLS entirely and checks the column value directly.
  Since the function is SECURITY DEFINER, it has permission to read user_profiles.

  ## Changes
  - Rewrite admin verification to use direct column check
  - Remove debug RAISE NOTICE statements for cleaner execution
  - Simplify the logic to ensure RETURN QUERY always executes
*/

-- Drop and recreate the function with fixed admin check
DROP FUNCTION IF EXISTS bulk_add_content_type_rules(text[], content_type_enum, uuid);

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
  is_user_admin boolean;
  domain_exists boolean;
  updated_count integer;
  matched_count integer;
  max_updates_per_domain constant integer := 5000;
BEGIN
  -- Verify admin (allow NULL for system operations)
  IF p_created_by IS NOT NULL THEN
    -- Direct check without RLS dependency
    SELECT is_admin INTO is_user_admin
    FROM user_profiles 
    WHERE id = p_created_by;
    
    IF is_user_admin IS NULL OR is_user_admin = false THEN
      RAISE EXCEPTION 'Only admins can add content type rules';
    END IF;
  END IF;

  FOREACH d IN ARRAY p_domains
  LOOP
    -- Extract base domain
    base_domain := extract_base_domain(d);
    
    -- Skip empty domains
    IF base_domain IS NULL OR base_domain = '' THEN
      CONTINUE;
    END IF;

    -- Check if domain already exists
    SELECT EXISTS(
      SELECT 1 FROM content_type_domain_rules 
      WHERE content_type_domain_rules.domain = base_domain
    ) INTO domain_exists;

    -- Insert or update the rule
    BEGIN
      INSERT INTO content_type_domain_rules (domain, content_type, created_by)
      VALUES (base_domain, p_content_type, p_created_by)
      ON CONFLICT (domain) DO UPDATE 
      SET 
        content_type = EXCLUDED.content_type,
        created_by = EXCLUDED.created_by,
        created_at = now();
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing domain %: %', base_domain, SQLERRM;
      CONTINUE;
    END;

    -- Count how many search_index rows would be affected
    BEGIN
      SELECT COUNT(*) INTO matched_count
      FROM search_index
      WHERE extract_base_domain(url) = base_domain
        AND content_type != p_content_type;
    EXCEPTION WHEN OTHERS THEN
      matched_count := 0;
    END;

    -- Update search_index entries if within limits
    IF matched_count > 0 AND matched_count <= max_updates_per_domain THEN
      BEGIN
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
      updated_count := 0;
      RAISE WARNING 'Domain % has % matching URLs (exceeds limit of %), skipping update', 
        base_domain, matched_count, max_updates_per_domain;
    ELSE
      updated_count := 0;
    END IF;

    -- Return result for this domain
    RETURN QUERY SELECT 
      base_domain,
      CASE WHEN domain_exists THEN 'updated' ELSE 'inserted' END,
      updated_count,
      matched_count;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bulk_add_content_type_rules(text[], content_type_enum, uuid) TO authenticated;
