/*
  # Fix HuBook Albums Storage Upload Policies

  1. Problem
    - The storage policy for `hubook-albums` bucket is too restrictive
    - The `storage.foldername()` check is failing for drag-and-drop uploads
    - Users are getting "failed to upload" errors when trying to add media to albums

  2. Solution
    - Simplify the INSERT policy to match the `hubook-media` bucket approach
    - Allow any authenticated user to upload to the albums bucket
    - Keep the DELETE policy with folder ownership check for security

  3. Changes
    - Replace the INSERT policy with a simpler one that doesn't check folder paths
    - This matches the pattern used successfully in `hubook-media` bucket
*/

-- Drop the existing restrictive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload album media" ON storage.objects;

-- Create a simpler, more permissive upload policy
CREATE POLICY "Authenticated users can upload album media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hubook-albums');