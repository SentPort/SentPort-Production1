/*
  # Embedded Video Extraction and Indexing System

  1. Purpose
    - Extract all embedded videos from subdomain page components
    - Index each video separately in search_index for Videos tab
    - Parse video components, custom_code HTML video tags, and iframe embeds
    - Support YouTube and Vimeo embed detection
    - Link videos back to parent pages for context

  2. New Functions
    - `extract_videos_from_components(components jsonb, base_url text, page_title text, parent_page_url text)`: Extract all videos
    - `index_subdomain_page_videos(page_id uuid)`: Index all videos from a page
    - `remove_subdomain_page_videos_from_search(page_id uuid)`: Remove all videos from a page

  3. Triggers
    - Integrated with subdomain_pages indexing triggers

  4. Search Index Fields Mapping
    - url: base_url + '#video-' + component_id
    - title: props.title OR "Video from [page_title]"
    - description: Video from page description
    - thumbnail_url: props.src or YouTube/Vimeo thumbnail
    - media_duration: parsed from props if available
    - parent_page_url: Full subdomain page URL
    - is_internal: true
    - relevance_score: 10
    - content_type: 'video'
    - source_platform: 'sentport_subdomain_video'
*/

-- Function to extract videos from page components
CREATE OR REPLACE FUNCTION extract_videos_from_components(
  components jsonb,
  base_url text,
  page_title text,
  parent_page_url text
)
RETURNS TABLE(
  video_url text,
  video_title text,
  video_description text,
  thumbnail_url text,
  media_duration integer
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  component jsonb;
  vid_counter integer := 0;
  html_content text;
  video_src text;
  youtube_id text;
  vimeo_id text;
BEGIN
  -- Iterate through all components
  FOR component IN SELECT jsonb_array_elements(components)
  LOOP
    -- Extract from video components
    IF component->>'type' = 'video' THEN
      vid_counter := vid_counter + 1;
      
      RETURN QUERY SELECT
        base_url || '#video-' || component->>'id' as video_url,
        COALESCE(
          component->'props'->>'title',
          'Video from ' || page_title
        ) as video_title,
        'Video from ' || page_title as video_description,
        component->'props'->>'src' as thumbnail_url,
        CASE 
          WHEN component->'props'->>'duration' IS NOT NULL 
          THEN (component->'props'->>'duration')::integer
          ELSE NULL
        END as media_duration;
    
    -- Extract from custom_code components (parse HTML for video tags and iframes)
    ELSIF component->>'type' = 'custom_code' THEN
      html_content := component->'props'->>'html';
      
      IF html_content IS NOT NULL THEN
        -- Check for video tags
        IF html_content ~ '<video[^>]+>' THEN
          vid_counter := vid_counter + 1;
          
          -- Extract src attribute
          video_src := (regexp_matches(html_content, 'src=[''"]([^''"]+)[''"]', 'i'))[1];
          
          IF video_src IS NOT NULL THEN
            RETURN QUERY SELECT
              base_url || '#custom-video-' || vid_counter::text as video_url,
              'Video from ' || page_title as video_title,
              'Video from ' || page_title as video_description,
              video_src as thumbnail_url,
              NULL::integer as media_duration;
          END IF;
        END IF;
        
        -- Check for YouTube embeds
        IF html_content ~* 'youtube\.com/embed/|youtu\.be/' THEN
          vid_counter := vid_counter + 1;
          
          -- Extract YouTube video ID
          youtube_id := (regexp_matches(
            html_content, 
            'youtube\.com/embed/([a-zA-Z0-9_-]+)|youtu\.be/([a-zA-Z0-9_-]+)', 
            'i'
          ))[1];
          
          IF youtube_id IS NULL THEN
            youtube_id := (regexp_matches(
              html_content, 
              'youtu\.be/([a-zA-Z0-9_-]+)', 
              'i'
            ))[1];
          END IF;
          
          IF youtube_id IS NOT NULL THEN
            RETURN QUERY SELECT
              base_url || '#youtube-' || youtube_id as video_url,
              'YouTube video from ' || page_title as video_title,
              'Embedded YouTube video from ' || page_title as video_description,
              'https://img.youtube.com/vi/' || youtube_id || '/hqdefault.jpg' as thumbnail_url,
              NULL::integer as media_duration;
          END IF;
        END IF;
        
        -- Check for Vimeo embeds
        IF html_content ~* 'vimeo\.com/video/' THEN
          vid_counter := vid_counter + 1;
          
          -- Extract Vimeo video ID
          vimeo_id := (regexp_matches(
            html_content, 
            'vimeo\.com/video/([0-9]+)', 
            'i'
          ))[1];
          
          IF vimeo_id IS NOT NULL THEN
            RETURN QUERY SELECT
              base_url || '#vimeo-' || vimeo_id as video_url,
              'Vimeo video from ' || page_title as video_title,
              'Embedded Vimeo video from ' || page_title as video_description,
              NULL::text as thumbnail_url, -- Vimeo thumbnails require API call
              NULL::integer as media_duration;
          END IF;
        END IF;
      END IF;
    
    -- Recursively extract from children
    ELSIF component->'children' IS NOT NULL THEN
      RETURN QUERY SELECT * FROM extract_videos_from_components(
        component->'children',
        base_url,
        page_title,
        parent_page_url
      );
    END IF;
  END LOOP;
END;
$$;

-- Function to index all videos from a subdomain page
CREATE OR REPLACE FUNCTION index_subdomain_page_videos(page_id uuid)
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
  v_video RECORD;
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

  -- First, remove all existing videos for this page
  DELETE FROM search_index
  WHERE parent_page_url = v_parent_url
    AND content_type = 'video'
    AND source_platform = 'sentport_subdomain_video';

  -- Extract and index all videos
  FOR v_video IN 
    SELECT * FROM extract_videos_from_components(
      v_content.components,
      v_base_url,
      COALESCE(v_content.seo_title, v_page.page_title),
      v_parent_url
    )
  LOOP
    -- Insert video into search_index
    INSERT INTO search_index (
      url,
      title,
      description,
      thumbnail_url,
      media_duration,
      parent_page_url,
      is_internal,
      relevance_score,
      content_type,
      source_platform,
      publication_date,
      last_indexed_at
    ) VALUES (
      v_video.video_url,
      v_video.video_title,
      v_video.video_description,
      v_video.thumbnail_url,
      v_video.media_duration,
      v_parent_url,
      true,
      10,
      'video',
      'sentport_subdomain_video',
      v_page.published_at,
      now()
    )
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      thumbnail_url = EXCLUDED.thumbnail_url,
      media_duration = EXCLUDED.media_duration,
      parent_page_url = EXCLUDED.parent_page_url,
      last_indexed_at = now();
  END LOOP;
END;
$$;

-- Function to remove all videos from a subdomain page
CREATE OR REPLACE FUNCTION remove_subdomain_page_videos_from_search(page_id uuid)
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

  -- Delete all videos with this parent page URL
  DELETE FROM search_index
  WHERE parent_page_url = v_parent_url
    AND content_type = 'video'
    AND source_platform = 'sentport_subdomain_video';
END;
$$;

-- Update the subdomain page indexing function to also index videos
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

  -- Also index embedded images and videos
  PERFORM index_subdomain_page_images(page_id);
  PERFORM index_subdomain_page_videos(page_id);
END;
$$;

-- Update the remove function to also remove videos
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

  -- Also delete all embedded images and videos
  PERFORM remove_subdomain_page_images_from_search(page_id);
  PERFORM remove_subdomain_page_videos_from_search(page_id);
END;
$$;
