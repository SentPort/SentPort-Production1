/*
  # Bulk Index Existing Content

  1. Purpose
    - One-time migration to index all existing HuTube videos
    - Index all existing published subdomain pages from active subdomains
    - Extract and index all embedded images and videos
    - Index all website builder assets used in published pages
    - Create stats tracking table for monitoring

  2. New Tables
    - `internal_content_stats`: Track indexed content counts by type

  3. Actions
    - Bulk index all HuTube videos
    - Bulk index all published subdomain pages
    - Bulk index all embedded media
    - Bulk index all used assets
    - Generate statistics report
*/

-- Create stats table to track indexed content
CREATE TABLE IF NOT EXISTS internal_content_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type content_type_enum NOT NULL,
  source_platform text NOT NULL,
  indexed_count integer DEFAULT 0,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_type, source_platform)
);

ALTER TABLE internal_content_stats ENABLE ROW LEVEL SECURITY;

-- Allow admins to read stats
CREATE POLICY "Admins can read content stats"
  ON internal_content_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
    )
  );

-- Function to update content stats
CREATE OR REPLACE FUNCTION update_content_stats(
  p_content_type content_type_enum,
  p_source_platform text,
  p_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO internal_content_stats (
    content_type,
    source_platform,
    indexed_count,
    last_updated_at
  ) VALUES (
    p_content_type,
    p_source_platform,
    p_count,
    now()
  )
  ON CONFLICT (content_type, source_platform) DO UPDATE SET
    indexed_count = EXCLUDED.indexed_count,
    last_updated_at = now();
END;
$$;

-- Bulk index all existing HuTube videos
DO $$
DECLARE
  v_video RECORD;
  v_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting bulk indexing of HuTube videos...';
  
  FOR v_video IN
    SELECT id FROM hutube_videos
  LOOP
    PERFORM index_hutube_video(v_video.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Indexed % HuTube videos', v_count;
  PERFORM update_content_stats('video', 'hutube', v_count);
END $$;

-- Bulk index all existing published subdomain pages
DO $$
DECLARE
  v_page RECORD;
  v_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting bulk indexing of subdomain pages...';
  
  FOR v_page IN
    SELECT p.id
    FROM subdomain_pages p
    JOIN subdomains s ON s.id = p.subdomain_id
    WHERE p.is_published = true
      AND s.status = 'active'
  LOOP
    -- This will also index embedded images and videos
    PERFORM index_subdomain_page(v_page.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Indexed % subdomain pages (including embedded media)', v_count;
  PERFORM update_content_stats('web_page', 'sentport_subdomain', v_count);
END $$;

-- Bulk index all website builder assets used in published pages
DO $$
DECLARE
  v_asset RECORD;
  v_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting bulk indexing of website builder assets...';
  
  FOR v_asset IN
    SELECT id
    FROM website_builder_assets
    WHERE file_type LIKE 'image/%' OR file_type LIKE 'video/%'
  LOOP
    PERFORM index_website_builder_asset(v_asset.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Processed % assets', v_count;
END $$;

-- Generate final statistics report
DO $$
DECLARE
  v_total_pages integer;
  v_total_images integer;
  v_total_videos integer;
  v_total_hutube integer;
BEGIN
  -- Count indexed content by type
  SELECT COUNT(*) INTO v_total_pages
  FROM search_index
  WHERE content_type = 'web_page' AND source_platform = 'sentport_subdomain';
  
  SELECT COUNT(*) INTO v_total_images
  FROM search_index
  WHERE content_type = 'image' AND source_platform IN ('sentport_subdomain_image', 'sentport_subdomain_asset');
  
  SELECT COUNT(*) INTO v_total_videos
  FROM search_index
  WHERE content_type = 'video' AND source_platform = 'sentport_subdomain_video';
  
  SELECT COUNT(*) INTO v_total_hutube
  FROM search_index
  WHERE content_type = 'video' AND source_platform = 'hutube';
  
  -- Update stats
  PERFORM update_content_stats('web_page', 'sentport_subdomain', v_total_pages);
  PERFORM update_content_stats('image', 'sentport_subdomain_image', v_total_images);
  PERFORM update_content_stats('video', 'sentport_subdomain_video', v_total_videos);
  PERFORM update_content_stats('video', 'hutube', v_total_hutube);
  
  RAISE NOTICE '=== BULK INDEXING COMPLETE ===';
  RAISE NOTICE 'Subdomain Pages: %', v_total_pages;
  RAISE NOTICE 'Embedded Images: %', v_total_images;
  RAISE NOTICE 'Embedded Videos: %', v_total_videos;
  RAISE NOTICE 'HuTube Videos: %', v_total_hutube;
  RAISE NOTICE 'Total Items: %', v_total_pages + v_total_images + v_total_videos + v_total_hutube;
END $$;
