/*
  # Add Foreign Key Constraint for Post Album Relationship

  1. Changes
    - Add foreign key constraint from `posts.source_album_id` to `albums.id`
    - Use ON DELETE SET NULL to handle album deletions gracefully
    - This enables PostgREST to resolve the relationship properly

  2. Security
    - No RLS changes needed (existing policies remain in effect)
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_source_album_id_fkey'
    AND table_name = 'posts'
  ) THEN
    ALTER TABLE posts
    ADD CONSTRAINT posts_source_album_id_fkey
    FOREIGN KEY (source_album_id)
    REFERENCES albums(id)
    ON DELETE SET NULL;
  END IF;
END $$;
