/*
  # Create HuBook Social Network Core Schema

  ## Overview
  This migration creates the complete database schema for HuBook, a Facebook-style social network
  with innovative engagement-based content moderation and multi-reaction system.

  ## New Tables

  ### 1. hubook_profiles
  User profiles for HuBook with mandatory fields (display_name, sex, age)
  - `id` (uuid, primary key) - Links to user_profiles.id
  - `display_name` (text, required) - User's display name
  - `sex` (text, required) - User's sex (male/female)
  - `age` (integer, required) - User's age
  - `bio` (text, optional) - User biography
  - `profile_photo_url` (text, optional) - Profile picture URL
  - `cover_photo_url` (text, optional) - Cover photo URL
  - `location` (text, optional) - User's location
  - `work` (text, optional) - Current work/job
  - `education` (text, optional) - Education background
  - `relationship_status` (text, optional) - Relationship status
  - `interests` (text[], optional) - Array of interests
  - `joined_at` (timestamptz) - When user joined HuBook
  - `updated_at` (timestamptz) - Last profile update

  ### 2. friendships
  Friend connections and requests
  - `id` (uuid, primary key)
  - `requester_id` (uuid) - User who sent friend request
  - `addressee_id` (uuid) - User who received friend request
  - `status` (text) - pending/accepted/blocked
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. posts
  User posts with privacy and moderation status
  - `id` (uuid, primary key)
  - `author_id` (uuid) - Post author
  - `content` (text) - Post text content
  - `privacy` (text) - public/friends/private
  - `status` (text) - active/paused/deleted
  - `moderation_status` (text) - clean/under_review/reviewed
  - `is_edited` (boolean) - Whether post was edited
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. post_media
  Media attachments for posts (images/videos)
  - `id` (uuid, primary key)
  - `post_id` (uuid) - Associated post
  - `media_url` (text) - URL to media file
  - `media_type` (text) - image/video
  - `file_size` (bigint) - File size in bytes
  - `display_order` (integer) - Order in post
  - `uploaded_at` (timestamptz)

  ### 5. albums
  Photo/video albums
  - `id` (uuid, primary key)
  - `owner_id` (uuid) - Album owner
  - `album_name` (text, required) - Album name
  - `description` (text, optional)
  - `privacy` (text) - public/friends/private
  - `cover_photo_url` (text, optional)
  - `created_at` (timestamptz)

  ### 6. album_media
  Media items in albums
  - `id` (uuid, primary key)
  - `album_id` (uuid) - Associated album
  - `media_url` (text) - URL to media file
  - `media_type` (text) - image/video
  - `caption` (text, optional)
  - `privacy_override` (text, optional) - Override album privacy
  - `display_order` (integer)
  - `uploaded_at` (timestamptz)

  ### 7. comments
  Comments on posts with nested reply support
  - `id` (uuid, primary key)
  - `post_id` (uuid) - Associated post
  - `author_id` (uuid) - Comment author
  - `content` (text) - Comment text
  - `parent_comment_id` (uuid, optional) - For nested replies
  - `is_edited` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. reactions
  Multi-reaction system for posts and comments (Like, Love, Dislike, Haha, Wow, Sad, Angry)
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User who reacted
  - `target_id` (uuid) - Post or comment ID
  - `target_type` (text) - post/comment
  - `reaction_type` (text) - like/love/dislike/haha/wow/sad/angry
  - `created_at` (timestamptz)

  ### 9. post_reports
  User reports of potentially fake/misleading content
  - `id` (uuid, primary key)
  - `post_id` (uuid) - Reported post
  - `reporter_user_id` (uuid) - User who reported
  - `report_reason` (text) - Reason for report
  - `reported_at` (timestamptz)

  ### 10. post_engagement_metrics
  Calculated engagement metrics for report ratio system
  - `post_id` (uuid, primary key)
  - `total_reactions` (integer) - Total reaction count
  - `total_comments` (integer) - Total comment count
  - `total_shares` (integer) - Total share count
  - `report_count` (integer) - Total unique reports
  - `report_ratio` (numeric) - Calculated ratio
  - `last_updated` (timestamptz)

  ### 11. moderation_queue
  Admin moderation queue for flagged content
  - `id` (uuid, primary key)
  - `post_id` (uuid) - Post under review
  - `flagged_at` (timestamptz)
  - `review_status` (text) - pending/approved/rejected
  - `reviewed_by` (uuid, optional) - Admin who reviewed
  - `reviewed_at` (timestamptz, optional)
  - `reviewer_notes` (text, optional)

  ### 12. shares
  Post sharing/reposting
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User who shared
  - `post_id` (uuid) - Shared post
  - `share_text` (text, optional) - User's comment on share
  - `shared_to` (text) - feed/profile
  - `created_at` (timestamptz)

  ### 13. notifications
  User notifications for activity
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Notification recipient
  - `type` (text) - Notification type
  - `related_user_id` (uuid, optional) - User who triggered notification
  - `related_content_id` (uuid, optional) - Related post/comment ID
  - `is_read` (boolean)
  - `created_at` (timestamptz)

  ### 14. admin_settings
  System configuration for moderation thresholds
  - `key` (text, primary key)
  - `value` (text)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data
  - Add policies for viewing content based on privacy settings
  - Add policies for admins to access moderation queue

  ## Indexes
  - Search optimization on hubook_profiles (display_name, work, location, education)
  - Performance indexes on foreign keys
  - Composite index on post_engagement_metrics for report_ratio queries
  - Index on posts for filtering by status and moderation_status
*/

-- Create hubook_profiles table
CREATE TABLE IF NOT EXISTS hubook_profiles (
  id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  sex text NOT NULL CHECK (sex IN ('male', 'female')),
  age integer NOT NULL CHECK (age >= 13 AND age <= 120),
  bio text,
  profile_photo_url text,
  cover_photo_url text,
  location text,
  work text,
  education text,
  relationship_status text,
  interests text[] DEFAULT '{}',
  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  moderation_status text NOT NULL DEFAULT 'clean' CHECK (moderation_status IN ('clean', 'under_review', 'reviewed')),
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create post_media table
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  file_size bigint,
  display_order integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  album_name text NOT NULL,
  description text,
  privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  cover_photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Create album_media table
CREATE TABLE IF NOT EXISTS album_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  caption text,
  privacy_override text CHECK (privacy_override IN ('public', 'friends', 'private')),
  display_order integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'dislike', 'haha', 'wow', 'sad', 'angry')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_id, target_type)
);

-- Create post_reports table
CREATE TABLE IF NOT EXISTS post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  report_reason text NOT NULL,
  reported_at timestamptz DEFAULT now(),
  UNIQUE(post_id, reporter_user_id)
);

-- Create post_engagement_metrics table
CREATE TABLE IF NOT EXISTS post_engagement_metrics (
  post_id uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  total_reactions integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  report_count integer DEFAULT 0,
  report_ratio numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Create moderation_queue table
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  flagged_at timestamptz DEFAULT now(),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES hubook_profiles(id),
  reviewed_at timestamptz,
  reviewer_notes text
);

-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  share_text text,
  shared_to text NOT NULL DEFAULT 'feed' CHECK (shared_to IN ('feed', 'profile')),
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  related_user_id uuid REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  related_content_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert default admin settings
INSERT INTO admin_settings (key, value) VALUES
  ('report_ratio_threshold', '0.15'),
  ('min_engagements_before_check', '10')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hubook_profiles_display_name ON hubook_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_hubook_profiles_work ON hubook_profiles(work);
CREATE INDEX IF NOT EXISTS idx_hubook_profiles_location ON hubook_profiles(location);
CREATE INDEX IF NOT EXISTS idx_hubook_profiles_education ON hubook_profiles(education);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);

CREATE INDEX IF NOT EXISTS idx_albums_owner ON albums(owner_id);

CREATE INDEX IF NOT EXISTS idx_album_media_album ON album_media(album_id);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_id, target_type);

CREATE INDEX IF NOT EXISTS idx_post_reports_post ON post_reports(post_id);

CREATE INDEX IF NOT EXISTS idx_post_engagement_metrics_ratio ON post_engagement_metrics(report_ratio);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(review_status);

CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_post ON shares(post_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Enable Row Level Security
ALTER TABLE hubook_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hubook_profiles
CREATE POLICY "Users can view all HuBook profiles"
  ON hubook_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own HuBook profile"
  ON hubook_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own HuBook profile"
  ON hubook_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for friendships
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update friendships they're part of"
  ON friendships FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- RLS Policies for posts
CREATE POLICY "Users can view public posts"
  ON posts FOR SELECT
  TO authenticated
  USING (
    privacy = 'public' AND status = 'active'
    OR author_id = auth.uid()
    OR (privacy = 'friends' AND status = 'active' AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = posts.author_id)
        OR (addressee_id = auth.uid() AND requester_id = posts.author_id))
    ))
  );

CREATE POLICY "Users can create their own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- RLS Policies for post_media
CREATE POLICY "Users can view media for posts they can see"
  ON post_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND (
        posts.privacy = 'public' AND posts.status = 'active'
        OR posts.author_id = auth.uid()
        OR (posts.privacy = 'friends' AND posts.status = 'active' AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = posts.author_id)
            OR (addressee_id = auth.uid() AND requester_id = posts.author_id))
        ))
      )
    )
  );

CREATE POLICY "Users can add media to their own posts"
  ON post_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete media from their own posts"
  ON post_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- RLS Policies for albums
CREATE POLICY "Users can view albums based on privacy"
  ON albums FOR SELECT
  TO authenticated
  USING (
    privacy = 'public'
    OR owner_id = auth.uid()
    OR (privacy = 'friends' AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = albums.owner_id)
        OR (addressee_id = auth.uid() AND requester_id = albums.owner_id))
    ))
  );

CREATE POLICY "Users can create their own albums"
  ON albums FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own albums"
  ON albums FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own albums"
  ON albums FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for album_media
CREATE POLICY "Users can view album media based on album privacy"
  ON album_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_media.album_id
      AND (
        albums.privacy = 'public'
        OR albums.owner_id = auth.uid()
        OR (albums.privacy = 'friends' AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = albums.owner_id)
            OR (addressee_id = auth.uid() AND requester_id = albums.owner_id))
        ))
      )
    )
  );

CREATE POLICY "Users can add media to their own albums"
  ON album_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_media.album_id
      AND albums.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete media from their own albums"
  ON album_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_media.album_id
      AND albums.owner_id = auth.uid()
    )
  );

-- RLS Policies for comments
CREATE POLICY "Users can view comments on posts they can see"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND (
        posts.privacy = 'public' AND posts.status = 'active'
        OR posts.author_id = auth.uid()
        OR (posts.privacy = 'friends' AND posts.status = 'active' AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = posts.author_id)
            OR (addressee_id = auth.uid() AND requester_id = posts.author_id))
        ))
      )
    )
  );

CREATE POLICY "Users can create comments on posts they can see"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND (
        posts.privacy = 'public' AND posts.status = 'active'
        OR posts.author_id = auth.uid()
        OR (posts.privacy = 'friends' AND posts.status = 'active' AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = posts.author_id)
            OR (addressee_id = auth.uid() AND requester_id = posts.author_id))
        ))
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- RLS Policies for reactions
CREATE POLICY "Users can view all reactions"
  ON reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reactions"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reactions"
  ON reactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for post_reports
CREATE POLICY "Users can view their own reports"
  ON post_reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON post_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

-- RLS Policies for post_engagement_metrics
CREATE POLICY "Users can view engagement metrics"
  ON post_engagement_metrics FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for moderation_queue (admin only - will be enhanced later)
CREATE POLICY "Users can view moderation queue entries for their posts"
  ON moderation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = moderation_queue.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- RLS Policies for shares
CREATE POLICY "Users can view shares of posts they can see"
  ON shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = shares.post_id
      AND (
        posts.privacy = 'public' AND posts.status = 'active'
        OR posts.author_id = auth.uid()
        OR (posts.privacy = 'friends' AND posts.status = 'active' AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = posts.author_id)
            OR (addressee_id = auth.uid() AND requester_id = posts.author_id))
        ))
      )
    )
  );

CREATE POLICY "Users can create their own shares"
  ON shares FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own shares"
  ON shares FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for admin_settings
CREATE POLICY "Anyone can view admin settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);