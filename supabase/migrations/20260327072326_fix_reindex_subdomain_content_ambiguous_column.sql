/*
  # Fix Ambiguous Column Reference in Subdomain Reindex Function

  1. Changes
    - Fix ambiguous column reference in `reindex_all_subdomain_content` function
    - Use table aliases to disambiguate column references

  2. Notes
    - This fixes the error preventing subdomain status updates
*/

-- Drop and recreate the reindex function with proper column disambiguation
DROP FUNCTION IF EXISTS reindex_all_subdomain_content(uuid);
CREATE FUNCTION reindex_all_subdomain_content(subdomain_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page RECORD;
  v_asset RECORD;
  v_subdomain_id uuid;
BEGIN
  v_subdomain_id := subdomain_id;
  
  -- Re-index all published pages for this subdomain
  FOR v_page IN
    SELECT sp.id
    FROM subdomain_pages sp
    WHERE sp.subdomain_id = v_subdomain_id
      AND sp.is_published = true
  LOOP
    PERFORM index_subdomain_page(v_page.id);
  END LOOP;

  -- Re-index all assets for this subdomain (if used in published pages)
  FOR v_asset IN
    SELECT wba.id
    FROM website_builder_assets wba
    WHERE wba.subdomain_id = v_subdomain_id
      AND (wba.file_type LIKE 'image/%' OR wba.file_type LIKE 'video/%')
  LOOP
    PERFORM index_website_builder_asset(v_asset.id);
  END LOOP;
END;
$$;

-- Also fix the remove function for consistency
DROP FUNCTION IF EXISTS remove_all_subdomain_content_from_search(uuid);
CREATE FUNCTION remove_all_subdomain_content_from_search(subdomain_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subdomain RECORD;
  v_page RECORD;
  v_subdomain_id uuid;
BEGIN
  v_subdomain_id := subdomain_id;
  
  -- Get subdomain details
  SELECT * INTO v_subdomain
  FROM subdomains
  WHERE id = v_subdomain_id;

  IF v_subdomain.id IS NULL THEN
    RETURN;
  END IF;

  -- Remove all pages, images, videos, and assets for this subdomain
  DELETE FROM search_index
  WHERE url LIKE 'https://' || v_subdomain.subdomain || '.sentport.com%'
     OR parent_page_url LIKE 'https://' || v_subdomain.subdomain || '.sentport.com%';

  -- Also remove assets that belong to this subdomain
  DELETE FROM search_index
  WHERE url IN (
    SELECT wba.public_url || '#asset-' || wba.id
    FROM website_builder_assets wba
    WHERE wba.subdomain_id = v_subdomain_id
  );
END;
$$;
