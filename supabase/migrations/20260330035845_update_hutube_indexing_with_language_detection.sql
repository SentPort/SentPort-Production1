/*
  # Update HuTube Video Indexing with Language Detection

  1. Updates
    - Modify `index_hutube_video()` to detect and store language
    - Analyze title + description to determine video language
*/

-- Update HuTube video indexing function to include language detection
CREATE OR REPLACE FUNCTION index_hutube_video(video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_video RECORD;
  v_channel_name text;
  v_lang_result RECORD;
  v_combined_text text;
BEGIN
  -- Get video details with channel info
  SELECT 
    v.*,
    c.display_name as channel_display_name
  INTO v_video
  FROM hutube_videos v
  LEFT JOIN hutube_channels c ON c.id = v.channel_id
  WHERE v.id = video_id;

  -- Skip if video doesn't exist
  IF v_video.id IS NULL THEN
    RETURN;
  END IF;

  -- Detect language from title + description
  v_combined_text := COALESCE(v_video.title, '') || ' ' || COALESCE(v_video.description, '');
  SELECT * INTO v_lang_result FROM detect_language_simple(v_combined_text);

  -- Insert or update search_index entry
  INSERT INTO search_index (
    url,
    title,
    description,
    content_snippet,
    thumbnail_url,
    media_duration,
    view_count,
    publication_date,
    author_name,
    is_internal,
    relevance_score,
    content_type,
    source_platform,
    language,
    language_confidence,
    last_indexed_at
  ) VALUES (
    'https://sentport.com/hutube/watch?v=' || v_video.id,
    v_video.title,
    v_video.description,
    LEFT(v_video.description, 500),
    v_video.thumbnail_url,
    v_video.duration,
    v_video.view_count,
    v_video.created_at,
    v_video.channel_display_name,
    true,
    10,
    'video',
    'hutube',
    COALESCE(v_lang_result.language, 'en'),
    COALESCE(v_lang_result.confidence, 0.8),
    now()
  )
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    content_snippet = EXCLUDED.content_snippet,
    thumbnail_url = EXCLUDED.thumbnail_url,
    media_duration = EXCLUDED.media_duration,
    view_count = EXCLUDED.view_count,
    publication_date = EXCLUDED.publication_date,
    author_name = EXCLUDED.author_name,
    language = EXCLUDED.language,
    language_confidence = EXCLUDED.language_confidence,
    last_indexed_at = now();
END;
$$;