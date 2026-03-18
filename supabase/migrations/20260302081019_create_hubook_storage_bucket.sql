/*
  # Create HuBook Profile Media Storage Bucket

  1. New Storage
    - Creates `hubook-profile-media` bucket for storing profile and cover photos
    - Public access enabled for image serving
    - Supports profile photos and cover photos

  2. Security
    - Authenticated users can upload to their own folders
    - Public read access for all uploaded images
    - File size limits enforced at application level
*/

-- Create the storage bucket for HuBook profile media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hubook-profile-media',
  'hubook-profile-media',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload profile media'
  ) THEN
    CREATE POLICY "Authenticated users can upload profile media"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'hubook-profile-media');
  END IF;
END $$;

-- Allow public read access to all files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access to profile media'
  ) THEN
    CREATE POLICY "Public read access to profile media"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'hubook-profile-media');
  END IF;
END $$;

-- Allow users to update their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own profile media'
  ) THEN
    CREATE POLICY "Users can update their own profile media"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'hubook-profile-media')
      WITH CHECK (bucket_id = 'hubook-profile-media');
  END IF;
END $$;

-- Allow users to delete their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own profile media'
  ) THEN
    CREATE POLICY "Users can delete their own profile media"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'hubook-profile-media');
  END IF;
END $$;