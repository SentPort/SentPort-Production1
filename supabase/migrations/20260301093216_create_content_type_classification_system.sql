/*
  # Create Content Type Classification System for Filtered Search Results

  1. New Fields Added to search_index Table
    - `content_type` (enum): Classifies content as web_page, image, video, or news_article
    - `source_platform` (text): Identifies the originating platform (hutube, heddit, youtube, wikipedia, generic_web, etc.)
    - `thumbnail_url` (text): Optional thumbnail image URL for videos and images
    - `media_duration` (integer): Video duration in seconds
    - `publication_date` (timestamptz): Publication date for news articles and videos
    - `author_name` (text): Author or creator name
    - `view_count` (integer): View count for videos
    - `image_width` (integer): Image width in pixels
    - `image_height` (integer): Image height in pixels
    - `alt_text` (text): Alternative text for images
    - `parent_page_url` (text): For images extracted from pages, link back to source page

  2. New Indexes
    - Index on content_type for fast filtering by Images/Videos/News tabs
    - Index on source_platform for platform-specific queries
    - Composite index on (content_type, is_internal, is_verified_external) for optimized filtered searches

  3. Changes
    - Add content_type enum type
    - Alter search_index table to add new columns
    - Create indexes for performance
    - Set default content_type to 'web_page' for existing entries

  4. Important Notes
    - This enables the Images, Videos, and News tab filtering functionality
    - HuTube videos will be marked as content_type='video' and source_platform='hutube'
    - Heddit posts will be marked as content_type='news_article' and source_platform='heddit'
    - Images extracted from pages will have parent_page_url linking back to source
    - All SentPort.com content will have is_internal=true automatically
*/

-- Create content_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type_enum') THEN
    CREATE TYPE content_type_enum AS ENUM ('web_page', 'image', 'video', 'news_article');
  END IF;
END $$;

-- Add content_type column with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE search_index ADD COLUMN content_type content_type_enum DEFAULT 'web_page' NOT NULL;
  END IF;
END $$;

-- Add source_platform column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'source_platform'
  ) THEN
    ALTER TABLE search_index ADD COLUMN source_platform text;
  END IF;
END $$;

-- Add media metadata columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE search_index ADD COLUMN thumbnail_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'media_duration'
  ) THEN
    ALTER TABLE search_index ADD COLUMN media_duration integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'publication_date'
  ) THEN
    ALTER TABLE search_index ADD COLUMN publication_date timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'author_name'
  ) THEN
    ALTER TABLE search_index ADD COLUMN author_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE search_index ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- Add image metadata columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'image_width'
  ) THEN
    ALTER TABLE search_index ADD COLUMN image_width integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'image_height'
  ) THEN
    ALTER TABLE search_index ADD COLUMN image_height integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'alt_text'
  ) THEN
    ALTER TABLE search_index ADD COLUMN alt_text text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_index' AND column_name = 'parent_page_url'
  ) THEN
    ALTER TABLE search_index ADD COLUMN parent_page_url text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_index_content_type ON search_index(content_type);
CREATE INDEX IF NOT EXISTS idx_search_index_source_platform ON search_index(source_platform);
CREATE INDEX IF NOT EXISTS idx_search_index_content_filter ON search_index(content_type, is_internal, is_verified_external);
CREATE INDEX IF NOT EXISTS idx_search_index_publication_date ON search_index(publication_date DESC) WHERE publication_date IS NOT NULL;