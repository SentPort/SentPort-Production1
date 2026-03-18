/*
  # Embedded Image Extraction and Indexing System

  1. Purpose
    - Extract all embedded images from subdomain page components
    - Index each image separately in search_index for Images tab
    - Parse both image components and custom_code HTML img tags
    - Link images back to parent pages for context

  2. New Functions
    - `extract_images_from_components(components jsonb, base_url text, page_title text)`: Extract all images
    - `index_subdomain_page_images(page_id uuid)`: Index all images from a page
    - `remove_subdomain_page_images_from_search(page_id uuid)`: Remove all images from a page

  3. Triggers
    - Integrated with subdomain_pages indexing triggers

  4. Search Index Fields Mapping
    - url: base_url + '#image-' + component_id
    - title: alt text OR "Image from [page_title]"
    - description: Image from page description
    - thumbnail_url: props.src
    - alt_text: props.alt
    - image_width: parsed from props or styles
    - image_height: parsed from props or styles
    - parent_page_url: Full subdomain page URL
    - is_internal: true
    - relevance_score: 10
    - content_type: 'image'
    - source_platform: 'sentport_subdomain_image'
*/

-- Function to extract images from page components
CREATE OR REPLACE FUNCTION extract_images_from_components(
  components jsonb,
  base_url text,
  page_title text,
  parent_page_url text
)
RETURNS TABLE(
  image_url text,
  image_title text,
  thumbnail_url text,
  alt_text text,
  image_width integer,
  image_height integer
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  component jsonb;
  img_counter integer := 0;
  html_content text;
  img_match text;
BEGIN
  -- Iterate through all components
  FOR component IN SELECT jsonb_array_elements(components)
  LOOP
    -- Extract from image components
    IF component->>'type' = 'image' THEN
      img_counter := img_counter + 1;
      
      RETURN QUERY SELECT
        base_url || '#image-' || component->>'id' as image_url,
        COALESCE(
          component->'props'->>'alt',
          'Image from ' || page_title
        ) as image_title,
        component->'props'->>'src' as thumbnail_url,
        component->'props'->>'alt' as alt_text,
        CASE 
          WHEN component->'props'->>'width' IS NOT NULL 
          THEN (component->'props'->>'width')::integer
          ELSE NULL
        END as image_width,
        CASE 
          WHEN component->'props'->>'height' IS NOT NULL 
          THEN (component->'props'->>'height')::integer
          ELSE NULL
        END as image_height;
    
    -- Extract from custom_code components (parse HTML for img tags)
    ELSIF component->>'type' = 'custom_code' THEN
      html_content := component->'props'->>'html';
      
      -- Simple regex to find img tags (matches <img ... src="..." ...>)
      IF html_content IS NOT NULL AND html_content ~ '<img[^>]+>' THEN
        img_counter := img_counter + 1;
        
        -- Extract src attribute
        img_match := (regexp_matches(html_content, 'src=[''"]([^''"]+)[''"]', 'i'))[1];
        
        IF img_match IS NOT NULL THEN
          RETURN QUERY SELECT
            base_url || '#custom-image-' || img_counter::text as image_url,
            COALESCE(
              (regexp_matches(html_content, 'alt=[''"]([^''"]+)[''"]', 'i'))[1],
              'Image from ' || page_title
            ) as image_title,
            img_match as thumbnail_url,
            (regexp_matches(html_content, 'alt=[''"]([^''"]+)[''"]', 'i'))[1] as alt_text,
            NULL::integer as image_width,
            NULL::integer as image_height;
        END IF;
      END IF;
    
    -- Recursively extract from children
    ELSIF component->'children' IS NOT NULL THEN
      RETURN QUERY SELECT * FROM extract_images_from_components(
        component->'children',
        base_url,
        page_title,
        parent_page_url
      );
    END IF;
  END LOOP;
END;
$$;

-- Function to index all images from a subdomain page
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
      last_indexed_at = now();
  END LOOP;
END;
$$;

-- Function to remove all images from a subdomain page
CREATE OR REPLACE FUNCTION remove_subdomain_page_images_from_search(page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page RECORD;
  v_subdomain RECORD;
  v_parent_url text;
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

  -- Build parent URL
  IF v_page.is_homepage THEN
    v_parent_url := 'https://' || v_page.subdomain || '.sentport.com/';
  ELSE
    v_parent_url := 'https://' || v_page.subdomain || '.sentport.com' || v_page.page_path;
  END IF;

  -- Delete all images with this parent page URL
  DELETE FROM search_index
  WHERE parent_page_url = v_parent_url
    AND content_type = 'image'
    AND source_platform = 'sentport_subdomain_image';
END;
$$;

-- Update the subdomain page indexing function to also index images
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

  -- Insert or update search_index entry for the page
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

  -- Also index embedded images
  PERFORM index_subdomain_page_images(page_id);
END;
$$;

-- Update the remove function to also remove images
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

  -- Delete the page
  DELETE FROM search_index
  WHERE url = v_url;

  -- Also delete all embedded images
  PERFORM remove_subdomain_page_images_from_search(page_id);
END;
$$;
