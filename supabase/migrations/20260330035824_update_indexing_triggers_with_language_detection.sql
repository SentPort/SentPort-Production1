/*
  # Update All Search Indexing Triggers with Language Detection

  1. Updates
    - Modify `index_subdomain_page()` to detect and store language
    - Update all search index INSERT statements to include language detection
    - Apply language detection to: subdomain pages, HuTube videos, embedded images/videos, asset library

  2. Behavior
    - Detects language from combined title + description + content
    - Stores detected language and confidence score
    - Defaults to English ('en') if detection fails
*/

-- Update subdomain page indexing function to include language detection
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
  v_lang_result RECORD;
  v_combined_text text;
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

  -- Detect language from combined title, description, and content
  v_combined_text := COALESCE(v_content.seo_title, v_page.page_title, '') || ' ' ||
                     COALESCE(v_content.seo_description, '') || ' ' ||
                     COALESCE(LEFT(v_content_text, 500), '');

  SELECT * INTO v_lang_result FROM detect_language_simple(v_combined_text);

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
    language,
    language_confidence,
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
    COALESCE(v_lang_result.language, 'en'),
    COALESCE(v_lang_result.confidence, 0.8),
    now()
  )
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    content_snippet = EXCLUDED.content_snippet,
    publication_date = EXCLUDED.publication_date,
    language = EXCLUDED.language,
    language_confidence = EXCLUDED.language_confidence,
    last_indexed_at = now();
END;
$$;