/*
  # Add Real-Time Comment Count Tracking to Blog Posts

  1. Schema Changes
    - Add `comment_count` column to `blog_posts` table
    - Defaults to 0, tracks total number of comments for each post

  2. Functions
    - `update_blog_post_comment_count()` - Trigger function to update count on comment insert/delete
    - `recalculate_all_blog_comment_counts()` - One-time function to populate existing counts

  3. Triggers
    - Trigger on `blog_comments` INSERT to increment count
    - Trigger on `blog_comments` DELETE to decrement count

  4. Initial Data Population
    - Populates comment_count for all existing blog posts

  ## Important Notes
  - This provides real-time total comment counts (not just 30-day rolling counts)
  - Automatically maintains accuracy when comments are added or deleted
  - Includes all comments (parent and replies)
*/

-- 1. Add comment_count column to blog_posts
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0 NOT NULL;

-- 2. Create function to update comment count when comments are added/deleted
CREATE OR REPLACE FUNCTION update_blog_post_comment_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment comment count
    UPDATE blog_posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement comment count
    UPDATE blog_posts
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Create triggers on blog_comments table
DROP TRIGGER IF EXISTS blog_comments_count_insert ON blog_comments;
CREATE TRIGGER blog_comments_count_insert
  AFTER INSERT ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comment_count();

DROP TRIGGER IF EXISTS blog_comments_count_delete ON blog_comments;
CREATE TRIGGER blog_comments_count_delete
  AFTER DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comment_count();

-- 4. Create function to recalculate all comment counts (for initial population and maintenance)
CREATE OR REPLACE FUNCTION recalculate_all_blog_comment_counts()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE blog_posts
  SET comment_count = (
    SELECT COUNT(*)
    FROM blog_comments
    WHERE blog_comments.post_id = blog_posts.id
  );
END;
$$;

-- 5. Populate comment counts for all existing posts
SELECT recalculate_all_blog_comment_counts();

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_comment_count ON blog_posts(comment_count DESC);
