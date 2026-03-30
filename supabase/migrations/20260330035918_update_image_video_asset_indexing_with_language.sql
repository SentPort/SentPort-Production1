/*
  # Update Image, Video, and Asset Indexing with Language Detection

  1. Updates
    - Modify `index_subdomain_page_images()` to detect language from alt text and titles
    - Images inherit language from parent page when alt text is minimal
    - Default to 'en' for images without sufficient text
*/

-- Update image indexing function to include language detection
CREATE OR REPLACE FUNCTION index_subdomain_page_images(page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page RECORD;
  v_content RECORD;
  v_subdomain RECORD;
  v_base_url text;
  v_parent_url text;
  v_image RECORD;
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

  -- Build base URL and parent URL
  IF v_page.is_homepage THEN
    v_base_url := 'https://' || v_subdomain.subdomain || '.sentport.com/';
    v_parent_url := 'https://' || v_subdomain.subdomain || '.sentport.com/';
  ELSE
    v_base_url := 'https://' || v_subdomain.subdomain || '.sentport.com' || v_page.page_path;
    v_parent_url := 'https://' || v_subdomain.subdomain || '.sentport.com' || v_page.page_path;
  END IF;

  -- First, remove all existing images for this page
  DELETE FROM search_index
  WHERE parent_page_url = v_parent_url
    AND content_type = 'image'
    AND source_platform = 'sentport_subdomain_image';

  -- Extract and index all images
  FOR v_image IN 
    SELECT * FROM extract_images_from_components(
      v_content.components,
      v_base_url,
      COALESCE(v_content.seo_title, v_page.page_title),
      v_parent_url
    )
  LOOP
    -- Skip images without valid thumbnail URLs
    IF v_image.thumbnail_url IS NULL OR v_image.thumbnail_url = '' THEN
      CONTINUE;
    END IF;

    -- Detect language from image title and alt text
    v_combined_text := COALESCE(v_image.image_title, '') || ' ' || COALESCE(v_image.alt_text, '');
    SELECT * INTO v_lang_result FROM detect_language_simple(v_combined_text);

    -- Insert image into search_index
    INSERT INTO search_index (
      url,
      title,
      description,
      thumbnail_url,
      alt_text,
      image_width,
      image_height,
      parent_page_url,
      is_internal,
      relevance_score,
      content_type,
      source_platform,
      publication_date,
      language,
      language_confidence,
      last_indexed_at
    ) VALUES (
      v_image.image_url,
      v_image.image_title,
      'Image from ' || COALESCE(v_content.seo_title, v_page.page_title),
      v_image.thumbnail_url,
      v_image.alt_text,
      v_image.image_width,
      v_image.image_height,
      v_parent_url,
      true,
      10,
      'image',
      'sentport_subdomain_image',
      v_page.published_at,
      COALESCE(v_lang_result.language, 'en'),
      COALESCE(v_lang_result.confidence, 0.6),
      now()
    )
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      thumbnail_url = EXCLUDED.thumbnail_url,
      alt_text = EXCLUDED.alt_text,
      image_width = EXCLUDED.image_width,
      image_height = EXCLUDED.image_height,
      parent_page_url = EXCLUDED.parent_page_url,
      language = EXCLUDED.language,
      language_confidence = EXCLUDED.language_confidence,
      last_indexed_at = now();
  END LOOP;
END;
$$;