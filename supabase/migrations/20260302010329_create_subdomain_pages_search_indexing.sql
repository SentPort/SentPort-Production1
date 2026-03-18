/*
  # Subdomain Pages Search Indexing System

  1. Purpose
    - Automatically index all published subdomain pages into search_index
    - Extract text content from page components for content_snippet
    - Only index pages from active subdomains
    - Show pages in search results with green "Verified Human Internal" badge

  2. New Functions
    - `extract_text_from_components(components jsonb)`: Extract text from page components
    - `index_subdomain_page(page_id uuid)`: Index a single subdomain page
    - `remove_subdomain_page_from_search(page_id uuid)`: Remove page from search

  3. Triggers
    - AFTER INSERT on website_builder_page_content (when version='published'): Auto-index new pages
    - AFTER UPDATE on website_builder_page_content (when version='published'): Refresh index
    - AFTER UPDATE on subdomain_pages (when is_published changes to false): Remove from search
    - AFTER DELETE on subdomain_pages: Remove from search

  4. Search Index Fields Mapping
    - url: 'https://' + subdomain + '.sentport.com' + page_path (or '/' for homepage)
    - title: seo_title OR page_title
    - description: seo_description
    - content_snippet: Extracted text from components (first 500 chars)
    - is_internal: true
    - relevance_score: 10
    - content_type: 'web_page'
    - source_platform: 'sentport_subdomain'
    - publication_date: published_at
*/

-- Function to extract text content from page components
CREATE OR REPLACE FUNCTION extract_text_from_components(components jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  extracted_text text := '';
  component jsonb;
BEGIN
  -- Iterate through all components
  FOR component IN SELECT jsonb_array_elements(components)
  LOOP
    -- Extract text from heading components
    IF component->>'type' = 'heading' THEN
      extracted_text := extracted_text || ' ' || COALESCE(component->'props'->>'text', '');
    
    -- Extract text from text components
    ELSIF component->>'type' = 'text' THEN
      -- Remove HTML tags from content
      extracted_text := extracted_text || ' ' || COALESCE(
        regexp_replace(component->'props'->>'content', '<[^>]+>', '', 'g'),
        ''
      );
    
    -- Extract text from button components
    ELSIF component->>'type' = 'button' THEN
      extracted_text := extracted_text || ' ' || COALESCE(component->'props'->>'text', '');
    
    -- Extract text from navbar components
    ELSIF component->>'type' = 'navbar' THEN
      extracted_text := extracted_text || ' ' || COALESCE(component->'props'->>'brand', '');
    
    -- Extract text from footer components
    ELSIF component->>'type' = 'footer' THEN
      extracted_text := extracted_text || ' ' || COALESCE(component->'props'->>'content', '');
    
    -- Recursively extract from children
    ELSIF component->'children' IS NOT NULL THEN
      extracted_text := extracted_text || ' ' || extract_text_from_components(component->'children');
    END IF;
  END LOOP;

  RETURN TRIM(extracted_text);
END;
$$;

-- Function to index a subdomain page into search_index
CREATE OR REPLACE FUNCTION index_subdomain_page(page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page RECORD;
  v_content RECORD;
  v_subdomain RECORD;
  v_url text;
  v_content_text text;
BEGIN
  -- Get page details
  SELECT * INTO v_page
  FROM subdomain_pages
  WHERE id = page_id;

  -- Skip if page doesn't exist or is not published
  IF v_page.id IS NULL OR v_page.is_published = false THEN
    RETURN;
  END IF;

  -- Get subdomain details
  SELECT * INTO v_subdomain
  FROM subdomains
  WHERE id = v_page.subdomain_id;

  -- Skip if subdomain is not active
  IF v_subdomain.id IS NULL OR v_subdomain.status != 'active' THEN
    RETURN;
  END IF;

  -- Get published content
  SELECT * INTO v_content
  FROM website_builder_page_content
  WHERE page_id = v_page.id
    AND version = 'published'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Skip if no published content exists
  IF v_content.id IS NULL THEN
    RETURN;
  END IF;

  -- Build URL (use '/' for homepage, otherwise use page_path)
  IF v_page.is_homepage THEN
    v_url := 'https://' || v_subdomain.subdomain || '.sentport.com/';
  ELSE
    v_url := 'https://' || v_subdomain.subdomain || '.sentport.com' || v_page.page_path;
  END IF;

  -- Extract text content from components
  v_content_text := extract_text_from_components(v_content.components);

  -- Skip if content is too minimal (less than 20 characters)
  IF LENGTH(v_content_text) < 20 THEN
    RETURN;
  END IF;

  -- Insert or update search_index entry
  INSERT INTO search_index (
    url,
    title,
    description,
    content_snippet,
    is_internal,
    relevance_score,
    content_type,
    source_platform,
    publication_date,
    last_indexed_at
  ) VALUES (
    v_url,
    COALESCE(v_content.seo_title, v_page.page_title),
    v_content.seo_description,
    LEFT(v_content_text, 500),
    true,
    10,
    'web_page',
    'sentport_subdomain',
    v_page.published_at,
    now()
  )
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    content_snippet = EXCLUDED.content_snippet,
    publication_date = EXCLUDED.publication_date,
    last_indexed_at = now();
END;
$$;

-- Function to remove a subdomain page from search_index
CREATE OR REPLACE FUNCTION remove_subdomain_page_from_search(page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page RECORD;
  v_subdomain RECORD;
  v_url text;
BEGIN
  -- Get page and subdomain details
  SELECT p.*, s.subdomain
  INTO v_page
  FROM subdomain_pages p
  LEFT JOIN subdomains s ON s.id = p.subdomain_id
  WHERE p.id = page_id;

  IF v_page.id IS NULL THEN
    RETURN;
  END IF;

  -- Build URL to delete
  IF v_page.is_homepage THEN
    v_url := 'https://' || v_page.subdomain || '.sentport.com/';
  ELSE
    v_url := 'https://' || v_page.subdomain || '.sentport.com' || v_page.page_path;
  END IF;

  DELETE FROM search_index
  WHERE url = v_url;
END;
$$;

-- Trigger function: Auto-index page after content published
CREATE OR REPLACE FUNCTION trigger_index_subdomain_page()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only index if this is published content
  IF NEW.version = 'published' THEN
    PERFORM index_subdomain_page(NEW.page_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Remove from index when unpublished
CREATE OR REPLACE FUNCTION trigger_unpublish_subdomain_page()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If page was published and now is not, remove from search
  IF OLD.is_published = true AND NEW.is_published = false THEN
    PERFORM remove_subdomain_page_from_search(NEW.id);
  -- If page was not published and now is, index it
  ELSIF OLD.is_published = false AND NEW.is_published = true THEN
    PERFORM index_subdomain_page(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Remove from index after page delete
CREATE OR REPLACE FUNCTION trigger_delete_subdomain_page()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM remove_subdomain_page_from_search(OLD.id);
  RETURN OLD;
END;
$$;

-- Create triggers on website_builder_page_content table
DROP TRIGGER IF EXISTS subdomain_page_content_insert_index ON website_builder_page_content;
CREATE TRIGGER subdomain_page_content_insert_index
  AFTER INSERT ON website_builder_page_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_index_subdomain_page();

DROP TRIGGER IF EXISTS subdomain_page_content_update_index ON website_builder_page_content;
CREATE TRIGGER subdomain_page_content_update_index
  AFTER UPDATE ON website_builder_page_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_index_subdomain_page();

-- Create triggers on subdomain_pages table
DROP TRIGGER IF EXISTS subdomain_page_publish_status_change ON subdomain_pages;
CREATE TRIGGER subdomain_page_publish_status_change
  AFTER UPDATE ON subdomain_pages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_unpublish_subdomain_page();

DROP TRIGGER IF EXISTS subdomain_page_delete_index ON subdomain_pages;
CREATE TRIGGER subdomain_page_delete_index
  AFTER DELETE ON subdomain_pages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_delete_subdomain_page();
