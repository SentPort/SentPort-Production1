/*
  # Asset Library Search Indexing System

  1. Purpose
    - Index uploaded images and videos from website_builder_assets table
    - Only index assets that are actually used in published pages
    - Detect asset usage in page components
    - Track which page an asset belongs to for context

  2. New Functions
    - `is_asset_used_in_page(asset_url text, page_id uuid)`: Check if asset is used
    - `get_pages_using_asset(asset_url text)`: Find all pages using an asset
    - `index_website_builder_asset(asset_id uuid)`: Index an asset if used
    - `remove_website_builder_asset_from_search(asset_id uuid)`: Remove asset from search

  3. Triggers
    - AFTER INSERT on website_builder_assets: Check if asset is used and index it
    - AFTER DELETE on website_builder_assets: Remove from search_index

  4. Search Index Fields Mapping
    - For images:
      - url: public_url + '#asset-' + asset_id
      - thumbnail_url: thumbnail_url or public_url
      - content_type: 'image'
    - For videos:
      - url: public_url + '#asset-' + asset_id
      - thumbnail_url: thumbnail_url
      - content_type: 'video'
    - Common fields:
      - title: file_name (without extension) or alt text from usage
      - parent_page_url: First published page that uses this asset
      - is_internal: true
      - relevance_score: 10
      - source_platform: 'sentport_subdomain_asset'
*/

-- Function to check if an asset is used in a page's components
CREATE OR REPLACE FUNCTION is_asset_used_in_page(
  asset_url text,
  page_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_content RECORD;
BEGIN
  -- Get published content for the page
  SELECT * INTO v_content
  FROM website_builder_page_content
  WHERE page_id = is_asset_used_in_page.page_id
    AND version = 'published'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_content.id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if asset URL appears anywhere in the components JSON
  -- This will match image src, video src, or any other URL reference
  RETURN v_content.components::text LIKE '%' || asset_url || '%';
END;
$$;

-- Function to get all published pages using an asset
CREATE OR REPLACE FUNCTION get_pages_using_asset(asset_url text)
RETURNS TABLE(
  page_id uuid,
  page_url text,
  page_title text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    CASE 
      WHEN p.is_homepage THEN 'https://' || s.subdomain || '.sentport.com/'
      ELSE 'https://' || s.subdomain || '.sentport.com' || p.page_path
    END as page_url,
    COALESCE(pc.seo_title, p.page_title) as page_title
  FROM subdomain_pages p
  JOIN subdomains s ON s.id = p.subdomain_id
  LEFT JOIN LATERAL (
    SELECT seo_title
    FROM website_builder_page_content
    WHERE page_id = p.id
      AND version = 'published'
    ORDER BY created_at DESC
    LIMIT 1
  ) pc ON true
  WHERE p.is_published = true
    AND s.status = 'active'
    AND is_asset_used_in_page(asset_url, p.id);
END;
$$;

-- Function to index a website builder asset
CREATE OR REPLACE FUNCTION index_website_builder_asset(asset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asset RECORD;
  v_page RECORD;
  v_asset_url text;
  v_title text;
  v_is_image boolean;
  v_is_video boolean;
BEGIN
  -- Get asset details
  SELECT * INTO v_asset
  FROM website_builder_assets
  WHERE id = asset_id;

  IF v_asset.id IS NULL THEN
    RETURN;
  END IF;

  -- Check if this is an image or video
  v_is_image := v_asset.file_type LIKE 'image/%';
  v_is_video := v_asset.file_type LIKE 'video/%';

  -- Skip if not an image or video
  IF NOT v_is_image AND NOT v_is_video THEN
    RETURN;
  END IF;

  -- Find the first published page using this asset
  SELECT * INTO v_page
  FROM get_pages_using_asset(v_asset.public_url)
  LIMIT 1;

  -- Skip if asset is not used in any published page
  IF v_page.page_id IS NULL THEN
    RETURN;
  END IF;

  -- Create unique URL for the asset
  v_asset_url := v_asset.public_url || '#asset-' || v_asset.id;

  -- Generate title from filename (remove extension)
  v_title := regexp_replace(v_asset.file_name, '\.[^.]*$', '');

  -- Insert into search_index
  INSERT INTO search_index (
    url,
    title,
    description,
    thumbnail_url,
    parent_page_url,
    is_internal,
    relevance_score,
    content_type,
    source_platform,
    last_indexed_at
  ) VALUES (
    v_asset_url,
    v_title,
    CASE 
      WHEN v_is_image THEN 'Image from ' || v_page.page_title
      WHEN v_is_video THEN 'Video from ' || v_page.page_title
    END,
    COALESCE(v_asset.thumbnail_url, v_asset.public_url),
    v_page.page_url,
    true,
    10,
    CASE 
      WHEN v_is_image THEN 'image'
      WHEN v_is_video THEN 'video'
    END::content_type_enum,
    'sentport_subdomain_asset',
    now()
  )
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    parent_page_url = EXCLUDED.parent_page_url,
    last_indexed_at = now();
END;
$$;

-- Function to remove a website builder asset from search
CREATE OR REPLACE FUNCTION remove_website_builder_asset_from_search(asset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asset RECORD;
  v_asset_url text;
BEGIN
  -- Get asset details (might be called from DELETE trigger, so use OLD values if available)
  SELECT * INTO v_asset
  FROM website_builder_assets
  WHERE id = asset_id;

  IF v_asset.id IS NULL THEN
    RETURN;
  END IF;

  -- Build asset URL
  v_asset_url := v_asset.public_url || '#asset-' || v_asset.id;

  -- Delete from search_index
  DELETE FROM search_index
  WHERE url = v_asset_url;
END;
$$;

-- Trigger function: Auto-index asset after insert
CREATE OR REPLACE FUNCTION trigger_index_website_builder_asset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only try to index if it's an image or video
  IF NEW.file_type LIKE 'image/%' OR NEW.file_type LIKE 'video/%' THEN
    PERFORM index_website_builder_asset(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Remove from index after delete
CREATE OR REPLACE FUNCTION trigger_remove_website_builder_asset_from_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Build asset URL from OLD values
  DELETE FROM search_index
  WHERE url = OLD.public_url || '#asset-' || OLD.id;
  RETURN OLD;
END;
$$;

-- Create triggers on website_builder_assets table
DROP TRIGGER IF EXISTS website_builder_asset_insert_index ON website_builder_assets;
CREATE TRIGGER website_builder_asset_insert_index
  AFTER INSERT ON website_builder_assets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_index_website_builder_asset();

DROP TRIGGER IF EXISTS website_builder_asset_delete_index ON website_builder_assets;
CREATE TRIGGER website_builder_asset_delete_index
  AFTER DELETE ON website_builder_assets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_remove_website_builder_asset_from_search();
