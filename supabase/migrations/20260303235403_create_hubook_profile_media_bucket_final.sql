/*
  # Create HuBook Profile Media Storage Bucket

  1. New Storage Bucket
    - `hubook-profile-media` - Public bucket for profile and cover photos
    - File size limit: 5MB
    - Allowed types: JPEG, PNG, WebP
    
  2. Folder Structure
    - `profiles/` - For profile photos
    - `covers/` - For cover photos
    
  3. Storage Policies
    - Allow authenticated users to upload their own photos (INSERT)
    - Allow public read access to all photos (SELECT)
    - Allow users to update their own photos (UPDATE)
    - Allow users to delete their own photos (DELETE)
    
  4. Security
    - File size limits enforced at bucket level (5MB)
    - Allowed MIME types: image/jpeg, image/png, image/webp
    - Users can only modify their own files based on naming convention (profile-{user_id} or cover-{user_id})
*/

-- Create the public storage bucket for HuBook profile media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hubook-profile-media',
  'hubook-profile-media',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload own profile media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hubook-profile-media' AND
  (storage.foldername(name))[1] IN ('profiles', 'covers') AND
  (
    name LIKE 'profiles/profile-' || auth.uid()::text || '%' OR
    name LIKE 'covers/cover-' || auth.uid()::text || '%'
  )
);

-- Policy: Allow public read access to all photos
CREATE POLICY "Public read access to profile media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hubook-profile-media');

-- Policy: Allow users to update their own photos
CREATE POLICY "Users can update own profile media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hubook-profile-media' AND
  (
    name LIKE 'profiles/profile-' || auth.uid()::text || '%' OR
    name LIKE 'covers/cover-' || auth.uid()::text || '%'
  )
)
WITH CHECK (
  bucket_id = 'hubook-profile-media' AND
  (
    name LIKE 'profiles/profile-' || auth.uid()::text || '%' OR
    name LIKE 'covers/cover-' || auth.uid()::text || '%'
  )
);

-- Policy: Allow users to delete their own photos
CREATE POLICY "Users can delete own profile media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hubook-profile-media' AND
  (
    name LIKE 'profiles/profile-' || auth.uid()::text || '%' OR
    name LIKE 'covers/cover-' || auth.uid()::text || '%'
  )
);