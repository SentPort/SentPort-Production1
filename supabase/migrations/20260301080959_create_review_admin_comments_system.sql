/*
  # Create Review Admin Comments System

  1. New Tables
    - `review_admin_comments`
      - `id` (uuid, primary key)
      - `review_id` (uuid, references review_history)
      - `commenter_id` (uuid, references user_profiles)
      - `comment_text` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_edited` (boolean)

  2. Security
    - Enable RLS on `review_admin_comments` table
    - Add policies for admin-only access (select, insert, update, delete)
    
  3. Indexes
    - Index on review_id for fast comment retrieval
    - Index on commenter_id for user lookups
    - Index on created_at for sorting

  4. Notes
    - Comments are only accessible to admins
    - Supports editing with timestamp tracking
    - Linked to review_history for context
*/

-- Create review_admin_comments table
CREATE TABLE IF NOT EXISTS review_admin_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES review_history(id) ON DELETE CASCADE,
  commenter_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_edited boolean DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_admin_comments_review_id ON review_admin_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_admin_comments_commenter_id ON review_admin_comments(commenter_id);
CREATE INDEX IF NOT EXISTS idx_review_admin_comments_created_at ON review_admin_comments(created_at);

-- Enable RLS
ALTER TABLE review_admin_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all comments
CREATE POLICY "Admins can view all review comments"
  ON review_admin_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Policy: Admins can insert comments
CREATE POLICY "Admins can insert review comments"
  ON review_admin_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
    AND commenter_id = auth.uid()
  );

-- Policy: Admins can update their own comments
CREATE POLICY "Admins can update their own comments"
  ON review_admin_comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
    AND commenter_id = auth.uid()
  )
  WITH CHECK (
    commenter_id = auth.uid()
  );

-- Policy: Admins can delete their own comments
CREATE POLICY "Admins can delete their own comments"
  ON review_admin_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
    AND commenter_id = auth.uid()
  );

-- Function to automatically update updated_at and set is_edited
CREATE OR REPLACE FUNCTION update_review_admin_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.is_edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
DROP TRIGGER IF EXISTS trigger_update_review_admin_comment_timestamp ON review_admin_comments;
CREATE TRIGGER trigger_update_review_admin_comment_timestamp
  BEFORE UPDATE ON review_admin_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_review_admin_comment_timestamp();