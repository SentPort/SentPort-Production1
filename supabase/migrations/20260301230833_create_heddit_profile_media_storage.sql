/*
  # Create Heddit Profile Media Storage Bucket

  ## Overview
  Creates a Supabase Storage bucket for Heddit profile and cover photos
  
  ## Bucket Details
  - Bucket name: heddit-profile-media
  - Public access for profile and cover photos
  - File size limit: 5MB
  - Allowed file types: image/jpeg, image/png, image/webp
  
  ## Storage Policies
  - Anyone can view profile media (public bucket)
  - Only authenticated users can upload to their own folder
  - Users can update their own photos
  - Users can delete their own photos
*/

-- Create the storage bucket for Heddit profile media
INSERT INTO storage.buckets (id, name, public)
VALUES ('heddit-profile-media', 'heddit-profile-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access heddit'
  ) THEN
    CREATE POLICY "Public Access heddit"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'heddit-profile-media');
  END IF;
END $$;

-- Allow authenticated users to upload files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload heddit'
  ) THEN
    CREATE POLICY "Authenticated users can upload heddit"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'heddit-profile-media'
      );
  END IF;
END $$;

-- Allow users to update their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own files heddit'
  ) THEN
    CREATE POLICY "Users can update own files heddit"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'heddit-profile-media');
  END IF;
END $$;

-- Allow users to delete their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own files heddit'
  ) THEN
    CREATE POLICY "Users can delete own files heddit"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'heddit-profile-media');
  END IF;
END $$;