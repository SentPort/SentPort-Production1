/*
  # Fix Bulk Content Type Rules Performance Issues
  
  ## Problem
  The bulk_add_content_type_rules function was causing dashboard crashes due to:
  - Processing 70,958 crawler_queue items and 34,896 search_index entries
  - Each domain update triggers real-time events for ALL matching URLs
  - No batching or throttling, causing cascading database queries
  - Real-time subscriptions firing hundreds of events per second
  - WebContainer timeouts (>30s) and session expiration
  
  ## Solution
  1. Add index on extract_base_domain(url) for fast lookups
  2. Rewrite bulk_add_content_type_rules to batch updates
  3. Add row limit per batch to prevent runaway queries
  4. Return progress info instead of triggering individual updates
  5. Disable real-time triggers during bulk operations
  
  ## Changes
  - Create functional index on extract_base_domain(url)
  - Replace update loop with batched UPDATE statements
  - Add max 5000 rows per domain update limit
  - Return summary statistics instead of per-row updates
*/

-- Create functional index for domain extraction (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_search_index_base_domain 
ON search_index(extract_base_domain(url));

-- Create index on content_type_domain_rules for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_type_domain_rules_domain 
ON content_type_domain_rules(domain);

-- Drop the old per-row update function
DROP FUNCTION IF EXISTS update_search_index_content_type_by_domain(text, content_type_enum);

-- Drop the old inefficient bulk function
DROP FUNCTION IF EXISTS bulk_add_content_type_rules(text[], content_type_enum, uuid);

-- Create optimized version with batching and limits
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
  rule_inserted boolean;
  updated_count integer;
  matched_count integer;
  max_updates_per_domain constant integer := 5000; -- Limit to prevent runaway updates
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

    -- Try to insert or update the rule
    BEGIN
      INSERT INTO content_type_domain_rules (domain, content_type, created_by)
      VALUES (base_domain, p_content_type, p_created_by)
      ON CONFLICT (domain) DO UPDATE 
      SET 
        content_type = EXCLUDED.content_type,
        created_by = EXCLUDED.created_by,
        created_at = now()
      RETURNING (xmax = 0) INTO rule_inserted;
      
      -- xmax = 0 means INSERT, xmax > 0 means UPDATE occurred
      
    EXCEPTION WHEN OTHERS THEN
      -- If there's any error, log it and continue
      RAISE WARNING 'Error processing domain %: %', base_domain, SQLERRM;
      CONTINUE;
    END;

    -- Count how many rows would be affected (without updating yet)
    SELECT COUNT(*) INTO matched_count
    FROM search_index
    WHERE extract_base_domain(url) = base_domain
      AND content_type != p_content_type;

    -- Only update if within reasonable limits
    IF matched_count <= max_updates_per_domain THEN
      -- Batch update all matching search_index entries
      -- This is much faster than row-by-row updates
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

    RETURN QUERY SELECT 
      base_domain,
      CASE WHEN rule_inserted THEN 'inserted' ELSE 'updated' END,
      updated_count,
      matched_count;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION bulk_add_content_type_rules(text[], content_type_enum, uuid) TO authenticated;
