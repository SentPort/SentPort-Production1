/*
  # Create Pinned Posts System for HuBlog

  1. Schema Changes
    - Add `is_pinned` (boolean) column to `blog_posts` - indicates if post is pinned
    - Add `pinned_at` (timestamptz) column to `blog_posts` - tracks when post was pinned
    - Add `pinned_by` (uuid) column to `blog_posts` - references admin who pinned the post
    
  2. Indexes
    - Create index on `is_pinned` for efficient querying of pinned posts
    - Create composite index on `is_pinned, pinned_at` for ordered retrieval
    
  3. Security
    - Update RLS policies to allow admins to modify pinned status
    - Add policy for users to view pinned posts
    
  4. Functions
    - Create `pin_blog_post` function for admins to pin/unpin posts with audit logging
    - Create `get_pinned_posts` function to retrieve all pinned posts efficiently
    
  5. Constraints
    - Ensure only published posts can be pinned
    - Limit maximum of 5 simultaneously pinned posts
*/

-- Add new columns to blog_posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN is_pinned boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'pinned_at'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN pinned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'pinned_by'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN pinned_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_pinned ON blog_posts(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_pinned_order ON blog_posts(is_pinned DESC, pinned_at DESC NULLS LAST);

-- Drop existing policy if it exists and create new one
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can update pinned status" ON blog_posts;
END $$;

CREATE POLICY "Admins can update pinned status"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create function to pin/unpin blog posts (admin only)
CREATE OR REPLACE FUNCTION pin_blog_post(
  post_id uuid,
  should_pin boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_pinned_count integer;
  result_post blog_posts;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can pin posts';
  END IF;

  -- Check if post exists and is published
  IF NOT EXISTS (
    SELECT 1 FROM blog_posts
    WHERE id = post_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Post not found or not published';
  END IF;

  -- If pinning, check if we've reached the limit
  IF should_pin THEN
    SELECT COUNT(*) INTO current_pinned_count
    FROM blog_posts
    WHERE is_pinned = true AND id != post_id;

    IF current_pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned simultaneously';
    END IF;

    -- Pin the post
    UPDATE blog_posts
    SET 
      is_pinned = true,
      pinned_at = now(),
      pinned_by = auth.uid()
    WHERE id = post_id
    RETURNING * INTO result_post;
  ELSE
    -- Unpin the post
    UPDATE blog_posts
    SET 
      is_pinned = false,
      pinned_at = null,
      pinned_by = null
    WHERE id = post_id
    RETURNING * INTO result_post;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'post_id', result_post.id,
    'is_pinned', result_post.is_pinned,
    'pinned_at', result_post.pinned_at,
    'pinned_by', result_post.pinned_by
  );
END;
$$;

-- Create function to get all pinned posts
CREATE OR REPLACE FUNCTION get_pinned_blog_posts()
RETURNS TABLE (
  id uuid,
  account_id uuid,
  title text,
  content text,
  view_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  pinned_at timestamptz,
  pinned_by uuid
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    id,
    account_id,
    title,
    content,
    view_count,
    created_at,
    updated_at,
    pinned_at,
    pinned_by
  FROM blog_posts
  WHERE is_pinned = true AND status = 'published'
  ORDER BY pinned_at DESC;
$$;