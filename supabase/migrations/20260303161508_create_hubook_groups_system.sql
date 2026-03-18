/*
  # Create HuBook Groups System

  1. New Tables
    - `hubook_groups`
      - `id` (uuid, primary key)
      - `name` (text, unique slug for URLs)
      - `display_name` (text, human-readable name)
      - `description` (text)
      - `creator_id` (uuid, references auth.users)
      - `member_count` (integer, default 1)
      - `post_count` (integer, default 0)
      - `cover_photo_url` (text, nullable)
      - `profile_photo_url` (text, nullable)
      - `privacy_setting` (text, 'public' or 'private')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `hubook_group_members`
      - `id` (uuid, primary key)
      - `group_id` (uuid, references hubook_groups)
      - `user_id` (uuid, references auth.users)
      - `role` (text, 'admin', 'moderator', or 'member')
      - `joined_at` (timestamptz)
      - Unique constraint on (group_id, user_id)

    - `hubook_group_posts`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `group_id` (uuid, references hubook_groups)
      - `posted_at` (timestamptz)
      - Unique constraint on (post_id, group_id)

  2. Security
    - Enable RLS on all tables
    - Groups: Anyone can view public groups, only admins can update
    - Members: Users can view memberships, only join/leave their own
    - Group Posts: Users can view posts in groups they're members of

  3. Functions
    - Auto-create creator as admin when group is created
    - Update member_count when members join/leave
    - Update post_count when posts are added/removed
*/

-- Create hubook_groups table
CREATE TABLE IF NOT EXISTS hubook_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_count integer DEFAULT 1,
  post_count integer DEFAULT 0,
  cover_photo_url text,
  profile_photo_url text,
  privacy_setting text DEFAULT 'public' CHECK (privacy_setting IN ('public', 'private')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create hubook_group_members table
CREATE TABLE IF NOT EXISTS hubook_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES hubook_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create hubook_group_posts table
CREATE TABLE IF NOT EXISTS hubook_group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES hubook_groups(id) ON DELETE CASCADE NOT NULL,
  posted_at timestamptz DEFAULT now(),
  UNIQUE(post_id, group_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hubook_groups_creator ON hubook_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_hubook_groups_privacy ON hubook_groups(privacy_setting);
CREATE INDEX IF NOT EXISTS idx_hubook_group_members_group ON hubook_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_hubook_group_members_user ON hubook_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hubook_group_posts_group ON hubook_group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_hubook_group_posts_post ON hubook_group_posts(post_id);

-- Enable RLS
ALTER TABLE hubook_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubook_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubook_group_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hubook_groups
CREATE POLICY "Anyone can view public groups"
  ON hubook_groups FOR SELECT
  USING (privacy_setting = 'public' OR creator_id = auth.uid() OR EXISTS (
    SELECT 1 FROM hubook_group_members 
    WHERE group_id = hubook_groups.id AND user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create groups"
  ON hubook_groups FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Group admins can update groups"
  ON hubook_groups FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM hubook_group_members 
      WHERE group_id = hubook_groups.id AND user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM hubook_group_members 
      WHERE group_id = hubook_groups.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete groups"
  ON hubook_groups FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- RLS Policies for hubook_group_members
CREATE POLICY "Users can view group memberships"
  ON hubook_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hubook_groups 
      WHERE id = group_id AND (privacy_setting = 'public' OR creator_id = auth.uid())
    ) OR user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM hubook_group_members m2
      WHERE m2.group_id = hubook_group_members.group_id AND m2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON hubook_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM hubook_groups 
      WHERE id = group_id AND privacy_setting = 'public'
    )
  );

CREATE POLICY "Users can leave groups"
  ON hubook_group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage members"
  ON hubook_group_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hubook_group_members m2
      WHERE m2.group_id = hubook_group_members.group_id 
      AND m2.user_id = auth.uid() 
      AND m2.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hubook_group_members m2
      WHERE m2.group_id = hubook_group_members.group_id 
      AND m2.user_id = auth.uid() 
      AND m2.role = 'admin'
    )
  );

-- RLS Policies for hubook_group_posts
CREATE POLICY "Members can view group posts"
  ON hubook_group_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hubook_groups g
      WHERE g.id = group_id AND (
        g.privacy_setting = 'public' OR EXISTS (
          SELECT 1 FROM hubook_group_members 
          WHERE group_id = g.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Members can add posts to groups"
  ON hubook_group_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hubook_group_members 
      WHERE group_id = hubook_group_posts.group_id AND user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM posts 
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "Post authors and admins can remove group posts"
  ON hubook_group_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE id = post_id AND author_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM hubook_group_members 
      WHERE group_id = hubook_group_posts.group_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Function to auto-add creator as admin when group is created
CREATE OR REPLACE FUNCTION add_creator_as_group_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO hubook_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_creator_as_admin ON hubook_groups;
CREATE TRIGGER trigger_add_creator_as_admin
  AFTER INSERT ON hubook_groups
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_group_admin();

-- Function to update member_count when members join/leave
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hubook_groups 
    SET member_count = member_count + 1, updated_at = now()
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hubook_groups 
    SET member_count = GREATEST(0, member_count - 1), updated_at = now()
    WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_member_count ON hubook_group_members;
CREATE TRIGGER trigger_update_member_count
  AFTER INSERT OR DELETE ON hubook_group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

-- Function to update post_count when posts are added/removed
CREATE OR REPLACE FUNCTION update_group_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hubook_groups 
    SET post_count = post_count + 1, updated_at = now()
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hubook_groups 
    SET post_count = GREATEST(0, post_count - 1), updated_at = now()
    WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_post_count ON hubook_group_posts;
CREATE TRIGGER trigger_update_post_count
  AFTER INSERT OR DELETE ON hubook_group_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_group_post_count();