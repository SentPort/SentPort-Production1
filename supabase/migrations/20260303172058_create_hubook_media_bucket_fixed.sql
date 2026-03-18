/*
  # Create HuBook Media Storage Bucket (Fixed)
  
  This migration creates the missing `hubook-media` bucket and applies proper RLS policies.
  
  ## Problem
  The hubook-media bucket was never created despite the migration existing.
  This causes image upload failures in posts.
  
  ## Solution
  1. Create the hubook-media bucket with proper configuration
  2. Apply RLS policies for upload, read, and delete operations
  
  ## Changes
  1. Create storage bucket with 100MB file size limit
  2. Allow MIME types: images (jpeg, jpg, png, gif, webp) and videos (mp4, webm, quicktime, avi)
  3. Add INSERT policy for authenticated users
  4. Add SELECT policy for public read access
  5. Add DELETE policy for users to delete their own uploads
  6. Add UPDATE policy for users to update their own uploads
*/

-- Create the storage bucket for HuBook media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hubook-media',
  'hubook-media',
  true,
  104857600, -- 100MB max file size
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload media
CREATE POLICY "Authenticated users can upload to hubook-media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hubook-media');

-- Allow public read access to all files
CREATE POLICY "Public read access to hubook-media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'hubook-media');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own hubook-media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'hubook-media' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'hubook-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own hubook-media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'hubook-media' AND auth.uid()::text = (storage.foldername(name))[1]);
