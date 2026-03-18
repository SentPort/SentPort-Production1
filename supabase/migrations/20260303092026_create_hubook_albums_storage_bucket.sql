/*
  # HuBook Albums Storage Bucket

  1. Storage
    - Create `hubook-albums` storage bucket for photos and videos
    - Configure to accept images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM, MOV)
    - Set file size limit: 100MB
    - Enable public access for easier sharing
    
  2. Storage Policies
    - Allow authenticated users to upload media to their own folders
    - Allow public read access to all album media
    - Allow users to delete their own media

  3. Important Notes
    - File organization: user_id/album_id/filename
    - Public bucket for easier sharing of albums
*/

-- Create storage bucket for albums
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hubook-albums',
  'hubook-albums',
  true,
  104857600, -- 100MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

-- Drop existing policies if they exist to recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own media" ON storage.objects;
  DROP POLICY IF EXISTS "Public albums are readable by all" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload album media" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view album media" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their album media" ON storage.objects;
END $$;

-- Storage policies for hubook-albums bucket
CREATE POLICY "Authenticated users can upload album media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hubook-albums' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view album media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'hubook-albums');

CREATE POLICY "Users can delete their album media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hubook-albums' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
