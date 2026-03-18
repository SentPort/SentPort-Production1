/*
  # HuTube Video Search Indexing System

  1. Purpose
    - Automatically index all HuTube videos into search_index for discovery
    - Sync video metadata in real-time when videos are uploaded, updated, or deleted
    - Display videos in search results with green "Verified Human Internal" badge

  2. New Functions
    - `index_hutube_video(video_id uuid)`: Indexes a single HuTube video into search_index
    - `remove_hutube_video_from_search(video_id uuid)`: Removes video from search_index

  3. Triggers
    - AFTER INSERT on hutube_videos: Auto-index new videos
    - AFTER UPDATE on hutube_videos: Refresh index when metadata changes
    - AFTER DELETE on hutube_videos: Remove from search_index

  4. Search Index Fields Mapping
    - url: 'https://sentport.com/hutube/watch?v=' + video_id
    - title: video.title
    - description: video.description
    - content_snippet: video.description (first 500 chars)
    - thumbnail_url: video.thumbnail_url
    - media_duration: video.duration
    - view_count: video.view_count
    - publication_date: video.created_at
    - author_name: channel.display_name
    - is_internal: true
    - relevance_score: 10
    - content_type: 'video'
    - source_platform: 'hutube'
*/

-- Function to index a HuTube video into search_index
CREATE OR REPLACE FUNCTION index_hutube_video(video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_video RECORD;
  v_channel_name text;
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
    last_indexed_at = now();
END;
$$;

-- Function to remove a HuTube video from search_index
CREATE OR REPLACE FUNCTION remove_hutube_video_from_search(video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM search_index
  WHERE url = 'https://sentport.com/hutube/watch?v=' || video_id;
END;
$$;

-- Trigger function: Auto-index video after insert
CREATE OR REPLACE FUNCTION trigger_index_hutube_video()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM index_hutube_video(NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger function: Auto-update index after video update
CREATE OR REPLACE FUNCTION trigger_update_hutube_video_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only re-index if relevant fields changed
  IF OLD.title IS DISTINCT FROM NEW.title
     OR OLD.description IS DISTINCT FROM NEW.description
     OR OLD.thumbnail_url IS DISTINCT FROM NEW.thumbnail_url
     OR OLD.view_count IS DISTINCT FROM NEW.view_count
     OR OLD.duration IS DISTINCT FROM NEW.duration THEN
    PERFORM index_hutube_video(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Remove from index after delete
CREATE OR REPLACE FUNCTION trigger_remove_hutube_video_from_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM remove_hutube_video_from_search(OLD.id);
  RETURN OLD;
END;
$$;

-- Create triggers on hutube_videos table
DROP TRIGGER IF EXISTS hutube_video_insert_index ON hutube_videos;
CREATE TRIGGER hutube_video_insert_index
  AFTER INSERT ON hutube_videos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_index_hutube_video();

DROP TRIGGER IF EXISTS hutube_video_update_index ON hutube_videos;
CREATE TRIGGER hutube_video_update_index
  AFTER UPDATE ON hutube_videos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_hutube_video_index();

DROP TRIGGER IF EXISTS hutube_video_delete_index ON hutube_videos;
CREATE TRIGGER hutube_video_delete_index
  AFTER DELETE ON hutube_videos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_remove_hutube_video_from_search();
