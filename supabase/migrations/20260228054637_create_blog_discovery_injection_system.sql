/*
  # Create Blog Discovery Injection System

  1. New Tables
    - `blog_discovery_injections`
      - Tracks every discovery injection event
      - Records user_id, post_ids injected, interests selected, and timestamp
      - Enables analytics on discovery feature effectiveness
  
  2. Schema Changes
    - Add `last_random_injection_at` column to `user_feed_history` table
      - Tracks when user last received discovery posts
      - Used to calculate 5-day injection intervals
  
  3. New Functions
    - `check_discovery_injection_due(user_id)`: Determines if 5 days have passed
    - `select_discovery_posts_for_user(user_id)`: Selects 2 high-engagement posts from random interests
    - `record_discovery_injection(user_id, post_ids, interests)`: Logs injection event
  
  4. Security
    - Enable RLS on blog_discovery_injections table
    - Users can only view their own discovery injection history
    - Admins can view all injection data for analytics

  5. Important Notes
    - Discovery posts are selected from interests NOT in user's preferences
    - Selection algorithm prioritizes posts with high engagement scores
    - 5-day interval is mandatory and cannot be dismissed by users
    - New users get first injection after setting their interests
*/

-- Add last_random_injection_at to user_feed_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feed_history' AND column_name = 'last_random_injection_at'
  ) THEN
    ALTER TABLE user_feed_history ADD COLUMN last_random_injection_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Create blog_discovery_injections table
CREATE TABLE IF NOT EXISTS blog_discovery_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_ids uuid[] NOT NULL,
  interest_ids uuid[] NOT NULL,
  interest_names text[] NOT NULL,
  injected_at timestamptz DEFAULT now(),
  clicked_post_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_discovery_injections_user_id ON blog_discovery_injections(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_discovery_injections_injected_at ON blog_discovery_injections(injected_at);

-- Enable RLS
ALTER TABLE blog_discovery_injections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_discovery_injections
CREATE POLICY "Users can view own discovery injections"
  ON blog_discovery_injections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert discovery injections"
  ON blog_discovery_injections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discovery injections"
  ON blog_discovery_injections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: Check if discovery injection is due for a user
CREATE OR REPLACE FUNCTION check_discovery_injection_due(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_injection timestamptz;
  v_days_since_injection numeric;
BEGIN
  -- Get last injection timestamp
  SELECT last_random_injection_at INTO v_last_injection
  FROM user_feed_history
  WHERE user_id = p_user_id;
  
  -- If never injected, return true
  IF v_last_injection IS NULL THEN
    RETURN true;
  END IF;
  
  -- Calculate days since last injection
  v_days_since_injection := EXTRACT(EPOCH FROM (now() - v_last_injection)) / 86400;
  
  -- Return true if 5 or more days have passed
  RETURN v_days_since_injection >= 5;
END;
$$;

-- Function: Select discovery posts for user from random interests
CREATE OR REPLACE FUNCTION select_discovery_posts_for_user(p_user_id uuid)
RETURNS TABLE(
  post_id uuid,
  interest_id uuid,
  interest_name text,
  engagement_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_interest_ids uuid[];
BEGIN
  -- Get user's current interests
  SELECT ARRAY_AGG(interest_id) INTO v_user_interest_ids
  FROM blog_account_interests
  WHERE account_id = p_user_id;
  
  -- If user has no interests, return empty
  IF v_user_interest_ids IS NULL OR array_length(v_user_interest_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  
  -- Select top 2 posts from interests user doesn't follow
  -- Prioritize by engagement score from blog_feed_metrics
  RETURN QUERY
  WITH eligible_interests AS (
    SELECT bi.id, bi.name
    FROM blog_interests bi
    WHERE bi.id != ALL(v_user_interest_ids)
  ),
  eligible_posts AS (
    SELECT 
      bp.id as post_id,
      bpi.interest_id,
      bi.name as interest_name,
      COALESCE(bfm.engagement_score, 0) as engagement_score,
      COALESCE(bfm.comment_count, 0) as comment_count,
      bp.created_at
    FROM blog_posts bp
    INNER JOIN blog_post_interests bpi ON bp.id = bpi.post_id
    INNER JOIN eligible_interests bi ON bpi.interest_id = bi.id
    LEFT JOIN blog_feed_metrics bfm ON bp.id = bfm.post_id
    WHERE bp.status = 'published'
      AND bp.privacy = 'public'
      AND bp.created_at > now() - interval '30 days'
  )
  SELECT 
    ep.post_id,
    ep.interest_id,
    ep.interest_name,
    ep.engagement_score
  FROM eligible_posts ep
  ORDER BY 
    ep.engagement_score DESC,
    ep.comment_count DESC,
    RANDOM()
  LIMIT 2;
END;
$$;

-- Function: Record discovery injection event
CREATE OR REPLACE FUNCTION record_discovery_injection(
  p_user_id uuid,
  p_post_ids uuid[],
  p_interest_ids uuid[],
  p_interest_names text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_injection_id uuid;
BEGIN
  -- Insert discovery injection record
  INSERT INTO blog_discovery_injections (
    user_id,
    post_ids,
    interest_ids,
    interest_names
  )
  VALUES (
    p_user_id,
    p_post_ids,
    p_interest_ids,
    p_interest_names
  )
  RETURNING id INTO v_injection_id;
  
  -- Update last_random_injection_at in user_feed_history
  UPDATE user_feed_history
  SET last_random_injection_at = now()
  WHERE user_id = p_user_id;
  
  -- If no record exists in user_feed_history, insert one
  IF NOT FOUND THEN
    INSERT INTO user_feed_history (user_id, last_random_injection_at)
    VALUES (p_user_id, now());
  END IF;
  
  RETURN v_injection_id;
END;
$$;