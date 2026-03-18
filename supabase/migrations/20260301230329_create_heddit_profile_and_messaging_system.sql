/*
  # Create Heddit User Profile and Messaging System

  ## Overview
  This migration creates a comprehensive user profile system for Heddit including:
  - User interests/tags selection
  - Bidirectional user following
  - Private messaging between users
  - Quality-based karma calculation
  - Profile customization (photos, bio, location, website)

  ## New Tables

  ### heddit_user_interests
  - Links users to their selected interest tags (up to 20)
  - Uses existing heddit_custom_tags for consistency
  - Enables interest-based user discovery

  ### heddit_follows
  - Bidirectional following system (like Twitter)
  - No approval required, instant follow
  - Tracks follower/following counts

  ### heddit_conversations
  - Tracks private message threads between users
  - Maintains unread counts for both participants
  - Optimizes message inbox queries

  ### heddit_messages
  - Stores individual messages in conversations
  - Supports read receipts
  - Enables real-time messaging

  ### heddit_quality_signals
  - Tracks quality indicators for posts
  - Calculates karma based on content quality, not just engagement
  - Rewards meaningful discussions and sustained relevance

  ## Schema Changes

  ### heddit_accounts additions
  - cover_photo_url: Banner image for profile
  - location: User's location (optional)
  - website: Personal website/social link (optional)
  - follower_count: Cached count for performance
  - following_count: Cached count for performance
  - post_count: Total posts created
  - quality_score: Calculated quality rating (0-100)

  ## Security
  - All tables have RLS enabled
  - Users can only edit their own data
  - Messages are only visible to participants
  - Profile data is publicly viewable
*/

-- Add profile customization columns to heddit_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'cover_photo_url'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN cover_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'location'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'website'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'follower_count'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN follower_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN following_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'post_count'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN post_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN quality_score numeric DEFAULT 50;
  END IF;
END $$;

-- Create heddit_user_interests table
CREATE TABLE IF NOT EXISTS heddit_user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES heddit_custom_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tag_id)
);

ALTER TABLE heddit_user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all user interests"
  ON heddit_user_interests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own interests"
  ON heddit_user_interests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own interests"
  ON heddit_user_interests FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_heddit_user_interests_user_id ON heddit_user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_heddit_user_interests_tag_id ON heddit_user_interests(tag_id);

-- Create heddit_follows table
CREATE TABLE IF NOT EXISTS heddit_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE heddit_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON heddit_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON heddit_follows FOR INSERT
  TO authenticated
  WITH CHECK (
    follower_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can unfollow"
  ON heddit_follows FOR DELETE
  TO authenticated
  USING (
    follower_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_heddit_follows_follower ON heddit_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_heddit_follows_following ON heddit_follows(following_id);

-- Create heddit_conversations table
CREATE TABLE IF NOT EXISTS heddit_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  participant_two_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  last_message_content text,
  unread_count_one integer DEFAULT 0,
  unread_count_two integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_one_id, participant_two_id),
  CHECK (participant_one_id < participant_two_id)
);

ALTER TABLE heddit_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON heddit_conversations FOR SELECT
  TO authenticated
  USING (
    participant_one_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
    OR participant_two_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create conversations"
  ON heddit_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_one_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
    OR participant_two_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own conversations"
  ON heddit_conversations FOR UPDATE
  TO authenticated
  USING (
    participant_one_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
    OR participant_two_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_heddit_conversations_participant_one ON heddit_conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_heddit_conversations_participant_two ON heddit_conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_heddit_conversations_last_message ON heddit_conversations(last_message_at DESC);

-- Create heddit_messages table
CREATE TABLE IF NOT EXISTS heddit_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES heddit_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES heddit_accounts(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE heddit_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON heddit_messages FOR SELECT
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages"
  ON heddit_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can mark messages as read"
  ON heddit_messages FOR UPDATE
  TO authenticated
  USING (
    recipient_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_heddit_messages_conversation ON heddit_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_heddit_messages_sender ON heddit_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_heddit_messages_recipient ON heddit_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_heddit_messages_read ON heddit_messages(recipient_id, read) WHERE NOT read;

-- Create heddit_quality_signals table
CREATE TABLE IF NOT EXISTS heddit_quality_signals (
  post_id uuid PRIMARY KEY REFERENCES heddit_posts(id) ON DELETE CASCADE,
  upvote_ratio numeric DEFAULT 0,
  engagement_depth_score numeric DEFAULT 0,
  sustained_relevance_score numeric DEFAULT 0,
  reply_quality_score numeric DEFAULT 0,
  saves_count integer DEFAULT 0,
  quality_reports_count integer DEFAULT 0,
  calculated_quality_score numeric DEFAULT 50,
  last_calculated timestamptz DEFAULT now()
);

ALTER TABLE heddit_quality_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quality signals"
  ON heddit_quality_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update quality signals"
  ON heddit_quality_signals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can modify quality signals"
  ON heddit_quality_signals FOR UPDATE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_heddit_quality_signals_score ON heddit_quality_signals(calculated_quality_score DESC);

-- Create function to update follower counts
CREATE OR REPLACE FUNCTION update_heddit_follower_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE heddit_accounts
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    -- Increment follower count for followed user
    UPDATE heddit_accounts
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE heddit_accounts
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
    
    -- Decrement follower count for followed user
    UPDATE heddit_accounts
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_heddit_follower_counts ON heddit_follows;
CREATE TRIGGER trigger_update_heddit_follower_counts
  AFTER INSERT OR DELETE ON heddit_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_heddit_follower_counts();

-- Create function to update conversation on new message
CREATE OR REPLACE FUNCTION update_heddit_conversation_on_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant_one_id uuid;
  v_participant_two_id uuid;
BEGIN
  -- Determine canonical order for participants
  IF NEW.sender_id < NEW.recipient_id THEN
    v_participant_one_id := NEW.sender_id;
    v_participant_two_id := NEW.recipient_id;
  ELSE
    v_participant_one_id := NEW.recipient_id;
    v_participant_two_id := NEW.sender_id;
  END IF;
  
  -- Update or create conversation
  INSERT INTO heddit_conversations (
    participant_one_id,
    participant_two_id,
    last_message_at,
    last_message_content,
    unread_count_one,
    unread_count_two
  )
  VALUES (
    v_participant_one_id,
    v_participant_two_id,
    NEW.created_at,
    NEW.content,
    CASE WHEN NEW.recipient_id = v_participant_one_id THEN 1 ELSE 0 END,
    CASE WHEN NEW.recipient_id = v_participant_two_id THEN 1 ELSE 0 END
  )
  ON CONFLICT (participant_one_id, participant_two_id)
  DO UPDATE SET
    last_message_at = NEW.created_at,
    last_message_content = NEW.content,
    unread_count_one = CASE 
      WHEN NEW.recipient_id = heddit_conversations.participant_one_id 
      THEN heddit_conversations.unread_count_one + 1 
      ELSE heddit_conversations.unread_count_one 
    END,
    unread_count_two = CASE 
      WHEN NEW.recipient_id = heddit_conversations.participant_two_id 
      THEN heddit_conversations.unread_count_two + 1 
      ELSE heddit_conversations.unread_count_two 
    END;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_heddit_conversation ON heddit_messages;
CREATE TRIGGER trigger_update_heddit_conversation
  AFTER INSERT ON heddit_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_heddit_conversation_on_message();

-- Create function to update post count
CREATE OR REPLACE FUNCTION update_heddit_post_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE heddit_accounts
    SET post_count = post_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE heddit_accounts
    SET post_count = GREATEST(0, post_count - 1)
    WHERE id = OLD.author_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_heddit_post_count ON heddit_posts;
CREATE TRIGGER trigger_update_heddit_post_count
  AFTER INSERT OR DELETE ON heddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_heddit_post_count();

-- Create function to calculate quality score for a post
CREATE OR REPLACE FUNCTION calculate_heddit_post_quality(p_post_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_upvote_ratio numeric := 0;
  v_engagement_depth numeric := 0;
  v_sustained_relevance numeric := 0;
  v_reply_quality numeric := 0;
  v_final_score numeric := 50;
  v_total_votes integer := 0;
  v_hours_old numeric;
  v_recent_engagement integer;
BEGIN
  -- Get post engagement data
  SELECT 
    like_count,
    dislike_count,
    comment_count,
    EXTRACT(EPOCH FROM (now() - created_at)) / 3600
  INTO 
    v_total_votes,
    v_total_votes,
    v_recent_engagement,
    v_hours_old
  FROM heddit_posts
  WHERE id = p_post_id;
  
  -- Calculate upvote ratio (0-30 points)
  SELECT like_count, dislike_count INTO v_total_votes, v_recent_engagement
  FROM heddit_posts WHERE id = p_post_id;
  
  IF (v_total_votes + v_recent_engagement) > 0 THEN
    v_upvote_ratio := (v_total_votes::numeric / (v_total_votes + v_recent_engagement)) * 30;
  END IF;
  
  -- Calculate engagement depth (0-25 points)
  -- Rewards posts with thoughtful comments
  SELECT COALESCE(AVG(LENGTH(content)), 0) INTO v_engagement_depth
  FROM platform_comments
  WHERE platform = 'heddit' 
    AND content_type = 'post'
    AND content_id = p_post_id;
  
  v_engagement_depth := LEAST(25, (v_engagement_depth / 200) * 25);
  
  -- Calculate sustained relevance (0-25 points)
  -- Rewards posts that remain relevant over time
  IF v_hours_old > 24 THEN
    SELECT COUNT(*) INTO v_recent_engagement
    FROM platform_comments
    WHERE platform = 'heddit'
      AND content_type = 'post'
      AND content_id = p_post_id
      AND created_at > now() - interval '24 hours';
    
    v_sustained_relevance := LEAST(25, v_recent_engagement * 5);
  END IF;
  
  -- Calculate reply quality (0-20 points)
  -- Rewards posts that spark back-and-forth discussions
  SELECT COUNT(DISTINCT parent_id) INTO v_recent_engagement
  FROM platform_comments
  WHERE platform = 'heddit'
    AND content_type = 'post'
    AND content_id = p_post_id
    AND parent_id IS NOT NULL;
  
  v_reply_quality := LEAST(20, v_recent_engagement * 2);
  
  -- Calculate final quality score
  v_final_score := v_upvote_ratio + v_engagement_depth + v_sustained_relevance + v_reply_quality;
  
  -- Store quality signals
  INSERT INTO heddit_quality_signals (
    post_id,
    upvote_ratio,
    engagement_depth_score,
    sustained_relevance_score,
    reply_quality_score,
    calculated_quality_score,
    last_calculated
  )
  VALUES (
    p_post_id,
    v_upvote_ratio,
    v_engagement_depth,
    v_sustained_relevance,
    v_reply_quality,
    v_final_score,
    now()
  )
  ON CONFLICT (post_id)
  DO UPDATE SET
    upvote_ratio = EXCLUDED.upvote_ratio,
    engagement_depth_score = EXCLUDED.engagement_depth_score,
    sustained_relevance_score = EXCLUDED.sustained_relevance_score,
    reply_quality_score = EXCLUDED.reply_quality_score,
    calculated_quality_score = EXCLUDED.calculated_quality_score,
    last_calculated = now();
  
  RETURN v_final_score;
END;
$$;