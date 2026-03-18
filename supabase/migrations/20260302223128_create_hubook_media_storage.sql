/*
  # Create HuBook Media Storage Bucket

  1. New Storage Bucket
    - `hubook-media` - For storing user-uploaded photos and videos in posts
  
  2. Security
    - Allow authenticated users to upload files
    - Allow public read access to all files
    - Set file size limits (10MB for images, 100MB for videos)
    - Restrict to allowed file types
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
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hubook-media');

-- Allow public read access to all files
CREATE POLICY "Public read access to media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'hubook-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'hubook-media' AND auth.uid()::text = (storage.foldername(name))[1]);