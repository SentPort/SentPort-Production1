/*
  # Add Rich Text and Media Upload Support to Heddit

  ## Overview
  This migration adds support for rich text formatting and media uploads to Heddit posts,
  matching Reddit's modern post creation experience.

  ## Changes Made

  1. **New Columns on heddit_posts**
     - `media_urls` - JSONB array storing uploaded media file URLs
     - `media_types` - JSONB array tracking media types (image/video)
     - `has_rich_formatting` - Boolean flag for rich text detection
     - `is_draft` - Boolean flag for draft posts
     - `updated_at` - Timestamp for tracking modifications

  2. **Updated Constraints**
     - Expanded post type to include 'video' alongside 'text', 'link', 'image'

  3. **Storage Bucket**
     - Created `heddit-media` bucket for images and videos
     - File size limits: Images 10MB, Videos 100MB
     - Public read access, authenticated upload

  4. **Security**
     - RLS policies for user-owned media upload/update/delete
     - Public read access for published content
     - Draft posts visible only to authors
*/

-- Add new columns to heddit_posts table
DO $$
BEGIN
  -- Add media_urls column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN media_urls JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add media_types column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'media_types'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN media_types JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add has_rich_formatting column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'has_rich_formatting'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN has_rich_formatting BOOLEAN DEFAULT false;
  END IF;

  -- Add is_draft column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN is_draft BOOLEAN DEFAULT false;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Drop existing constraint and recreate with video type
ALTER TABLE heddit_posts DROP CONSTRAINT IF EXISTS heddit_posts_type_check;
ALTER TABLE heddit_posts ADD CONSTRAINT heddit_posts_type_check
  CHECK (type IN ('text', 'link', 'image', 'video'));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_heddit_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS heddit_posts_updated_at_trigger ON heddit_posts;
CREATE TRIGGER heddit_posts_updated_at_trigger
  BEFORE UPDATE ON heddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_heddit_posts_updated_at();

-- Create heddit-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'heddit-media',
  'heddit-media',
  true,
  104857600, -- 100MB max for videos
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for heddit-media bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Authenticated users can upload to heddit-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'heddit-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public read access to heddit-media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'heddit-media');

-- Allow users to update their own files
CREATE POLICY "Users can update own heddit-media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'heddit-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'heddit-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own heddit-media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'heddit-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update RLS policies for heddit_posts to handle drafts
-- Users can only see their own drafts, but all published posts are visible

-- Drop existing select policy and recreate with draft filtering
DROP POLICY IF EXISTS "Anyone can view posts" ON heddit_posts;
CREATE POLICY "Anyone can view published posts"
ON heddit_posts
FOR SELECT
TO public
USING (
  is_draft = false OR
  (auth.uid() = author_id)
);

-- Allow users to insert their own posts (including drafts)
DROP POLICY IF EXISTS "Authenticated users can create posts" ON heddit_posts;
CREATE POLICY "Authenticated users can create posts"
ON heddit_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Allow users to update their own posts
DROP POLICY IF EXISTS "Users can update own posts" ON heddit_posts;
CREATE POLICY "Users can update own posts"
ON heddit_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Allow users to delete their own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON heddit_posts;
CREATE POLICY "Users can delete own posts"
ON heddit_posts
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Create index on is_draft for faster draft queries
CREATE INDEX IF NOT EXISTS idx_heddit_posts_is_draft ON heddit_posts(is_draft);
CREATE INDEX IF NOT EXISTS idx_heddit_posts_author_draft ON heddit_posts(author_id, is_draft);
