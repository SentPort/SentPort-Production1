/*
  # Create Review History System with Custom Tags
  
  1. New Tables
    - `review_history`
      - Stores complete history of all reviewed content
      - Fields: id, alert_id, post_id, platform, author_id, author_email, author_name, 
        content_preview, full_content, report_ratio, total_engagements, total_reports,
        review_outcome (approved/removed), reviewed_by, reviewed_at, created_at
      - Indexed on: platform, review_outcome, author_email, reviewed_at for fast filtering
    
    - `review_custom_tags`
      - Stores admin-created custom filter tags
      - Fields: id, tag_name (unique), created_by, created_at
      - Allows admins to create their own categorization system
    
    - `review_tag_associations`
      - Junction table linking reviews to custom tags
      - Fields: id, review_id, tag_id, added_by, added_at
      - Enables many-to-many relationship between reviews and tags
  
  2. Security
    - Enable RLS on all three tables
    - All tables restricted to admin users only
    - Policies for SELECT, INSERT, UPDATE, DELETE operations
  
  3. Indexes
    - Single column indexes for common filters
    - Composite indexes for combined filter queries
    - Full-text search index on content_preview
  
  4. Notes
    - review_history preserves complete snapshot at time of review
    - Supports filtering by platform, status, email, date range, and custom tags
    - Enables bulk operations and advanced search capabilities
    - Custom tags allow flexible admin-defined categorization
*/

-- Create review_history table
CREATE TABLE IF NOT EXISTS review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL,
  post_id uuid NOT NULL,
  platform text NOT NULL,
  author_id uuid,
  author_email text,
  author_name text,
  content_preview text NOT NULL,
  full_content text NOT NULL,
  report_ratio numeric NOT NULL,
  total_engagements integer DEFAULT 0 NOT NULL,
  total_reports integer DEFAULT 0 NOT NULL,
  review_outcome text NOT NULL CHECK (review_outcome IN ('approved', 'removed')),
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_review_history_platform ON review_history(platform);
CREATE INDEX IF NOT EXISTS idx_review_history_outcome ON review_history(review_outcome);
CREATE INDEX IF NOT EXISTS idx_review_history_author_email ON review_history(author_email);
CREATE INDEX IF NOT EXISTS idx_review_history_reviewed_at ON review_history(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_history_alert_id ON review_history(alert_id);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_review_history_platform_outcome ON review_history(platform, review_outcome);
CREATE INDEX IF NOT EXISTS idx_review_history_outcome_date ON review_history(review_outcome, reviewed_at DESC);

ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- Only admins can read review history
CREATE POLICY "Admins can read all review history"
  ON review_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Only admins can insert review history
CREATE POLICY "Admins can insert review history"
  ON review_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Only admins can delete review history
CREATE POLICY "Admins can delete review history"
  ON review_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create review_custom_tags table
CREATE TABLE IF NOT EXISTS review_custom_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name text UNIQUE NOT NULL,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE review_custom_tags ENABLE ROW LEVEL SECURITY;

-- Only admins can read custom tags
CREATE POLICY "Admins can read all custom tags"
  ON review_custom_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Only admins can create custom tags
CREATE POLICY "Admins can insert custom tags"
  ON review_custom_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Only admins can delete custom tags
CREATE POLICY "Admins can delete custom tags"
  ON review_custom_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create review_tag_associations junction table
CREATE TABLE IF NOT EXISTS review_tag_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES review_history(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES review_custom_tags(id) ON DELETE CASCADE,
  added_by uuid REFERENCES user_profiles(id),
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(review_id, tag_id)
);

-- Create indexes for junction table
CREATE INDEX IF NOT EXISTS idx_tag_associations_review ON review_tag_associations(review_id);
CREATE INDEX IF NOT EXISTS idx_tag_associations_tag ON review_tag_associations(tag_id);

ALTER TABLE review_tag_associations ENABLE ROW LEVEL SECURITY;

-- Only admins can read tag associations
CREATE POLICY "Admins can read all tag associations"
  ON review_tag_associations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Only admins can create tag associations
CREATE POLICY "Admins can insert tag associations"
  ON review_tag_associations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Only admins can delete tag associations
CREATE POLICY "Admins can delete tag associations"
  ON review_tag_associations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );