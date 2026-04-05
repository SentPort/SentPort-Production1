/*
  # Fix HuBook Notifications System - Complete Overhaul

  1. Helper Functions
    - should_send_notification() - Checks user preferences and quiet hours

  2. Updated Trigger Functions
    - All triggers now insert into hubook_notifications instead of notifications
    - All triggers check user preferences before creating notifications
    - Fixed notification type names to match frontend expectations

  3. Notification Types Updated
    - friend_request - When someone sends you a friend request
    - friend_accepted - When someone accepts your friend request (changed from friend_request_accepted)
    - comment - When someone comments on your post
    - comment_reply - When someone replies to your comment (changed from reply)
    - reaction - When someone reacts to your post
    - share - When someone shares your post
    - mention - When someone mentions you in a post or comment
    - album_media_comment - When someone comments on your album media
    - album_media_reaction - When someone reacts to your album media

  4. Security
    - All functions use SECURITY DEFINER for permission bypass
    - User preferences are respected at database level
    - Quiet hours logic implemented
*/

-- Helper function to check if notification should be sent based on user preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id uuid,
  p_notification_type text,
  p_current_time timestamptz DEFAULT now()
)
RETURNS boolean AS $$
DECLARE
  v_prefs record;
  v_current_hour int;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM hubook_notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences found, default to sending notification
  IF v_prefs IS NULL THEN
    RETURN true;
  END IF;

  -- Check if quiet hours are enabled and active
  IF v_prefs.quiet_hours_enabled THEN
    v_current_hour := EXTRACT(HOUR FROM p_current_time AT TIME ZONE 'UTC');

    -- Handle quiet hours that span midnight
    IF v_prefs.quiet_hours_start <= v_prefs.quiet_hours_end THEN
      IF v_current_hour >= v_prefs.quiet_hours_start AND v_current_hour < v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    ELSE
      IF v_current_hour >= v_prefs.quiet_hours_start OR v_current_hour < v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  -- Check specific notification type preferences
  CASE p_notification_type
    WHEN 'friend_request' THEN
      RETURN v_prefs.friend_requests_enabled;
    WHEN 'friend_accepted' THEN
      RETURN v_prefs.friend_accepted_enabled;
    WHEN 'comment', 'album_media_comment' THEN
      RETURN v_prefs.comments_enabled;
    WHEN 'comment_reply' THEN
      RETURN v_prefs.replies_enabled;
    WHEN 'reaction', 'album_media_reaction' THEN
      RETURN v_prefs.reactions_enabled;
    WHEN 'share' THEN
      RETURN v_prefs.shares_enabled;
    WHEN 'mention' THEN
      RETURN v_prefs.mentions_enabled;
    WHEN 'tag' THEN
      RETURN v_prefs.tags_enabled;
    ELSE
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for friendship changes (notifications)
CREATE OR REPLACE FUNCTION trigger_friendship_notification()
RETURNS trigger AS $$
DECLARE
  v_requester_name text;
  v_addressee_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get requester's display name
    SELECT display_name INTO v_requester_name
    FROM user_profiles
    WHERE user_id = NEW.requester_id;

    -- Notify addressee of friend request
    IF should_send_notification(NEW.addressee_id, 'friend_request') THEN
      INSERT INTO hubook_notifications (user_id, type, actor_id, message)
      VALUES (
        NEW.addressee_id,
        'friend_request',
        NEW.requester_id,
        v_requester_name || ' sent you a friend request'
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get addressee's display name
    SELECT display_name INTO v_addressee_name
    FROM user_profiles
    WHERE user_id = NEW.addressee_id;

    -- Notify requester that request was accepted
    IF should_send_notification(NEW.requester_id, 'friend_accepted') THEN
      INSERT INTO hubook_notifications (user_id, type, actor_id, message)
      VALUES (
        NEW.requester_id,
        'friend_accepted',
        NEW.addressee_id,
        v_addressee_name || ' accepted your friend request'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for reactions
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_reaction()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_reactor_name text;
  v_reaction_type text;
BEGIN
  IF NEW.target_type = 'post' THEN
    -- Get the post author
    SELECT author_id INTO v_post_author_id
    FROM posts
    WHERE id = NEW.target_id;

    -- Update post engagement metrics
    INSERT INTO post_engagement_metrics (
      post_id,
      reactions_count,
      last_activity_at
    ) VALUES (
      NEW.target_id,
      1,
      now()
    )
    ON CONFLICT (post_id) DO UPDATE SET
      reactions_count = post_engagement_metrics.reactions_count + 1,
      last_activity_at = now();

    -- Create notification if not self-reaction
    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
      -- Get reactor's name
      SELECT display_name INTO v_reactor_name
      FROM user_profiles
      WHERE user_id = NEW.user_id;

      -- Get reaction type name
      SELECT CASE NEW.reaction_type
        WHEN 'like' THEN 'liked'
        WHEN 'love' THEN 'loved'
        WHEN 'haha' THEN 'laughed at'
        WHEN 'wow' THEN 'wowed at'
        WHEN 'sad' THEN 'reacted sadly to'
        WHEN 'angry' THEN 'reacted angrily to'
        ELSE 'reacted to'
      END INTO v_reaction_type;

      IF should_send_notification(v_post_author_id, 'reaction') THEN
        INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, message)
        VALUES (
          v_post_author_id,
          'reaction',
          NEW.user_id,
          NEW.target_id,
          v_reactor_name || ' ' || v_reaction_type || ' your post'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for comments
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_comment()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_parent_comment_author_id uuid;
  v_commenter_name text;
BEGIN
  -- Get commenter's name
  SELECT display_name INTO v_commenter_name
  FROM user_profiles
  WHERE user_id = NEW.author_id;

  IF NEW.parent_comment_id IS NULL THEN
    -- This is a top-level comment on a post
    SELECT author_id INTO v_post_author_id
    FROM posts
    WHERE id = NEW.post_id;

    -- Update post engagement metrics
    INSERT INTO post_engagement_metrics (
      post_id,
      comments_count,
      last_activity_at
    ) VALUES (
      NEW.post_id,
      1,
      now()
    )
    ON CONFLICT (post_id) DO UPDATE SET
      comments_count = post_engagement_metrics.comments_count + 1,
      last_activity_at = now();

    -- Notify post author if not commenting on own post
    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_id THEN
      IF should_send_notification(v_post_author_id, 'comment') THEN
        INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, comment_id, message)
        VALUES (
          v_post_author_id,
          'comment',
          NEW.author_id,
          NEW.post_id,
          NEW.id,
          v_commenter_name || ' commented on your post'
        );
      END IF;
    END IF;
  ELSE
    -- This is a reply to another comment
    SELECT author_id INTO v_parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_comment_id;

    -- Notify parent comment author if not replying to own comment
    IF v_parent_comment_author_id IS NOT NULL AND v_parent_comment_author_id != NEW.author_id THEN
      IF should_send_notification(v_parent_comment_author_id, 'comment_reply') THEN
        INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, comment_id, message)
        VALUES (
          v_parent_comment_author_id,
          'comment_reply',
          NEW.author_id,
          NEW.post_id,
          NEW.id,
          v_commenter_name || ' replied to your comment'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for shares
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_share()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_sharer_name text;
BEGIN
  -- Get the post author
  SELECT author_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  -- Update post engagement metrics
  INSERT INTO post_engagement_metrics (
    post_id,
    shares_count,
    last_activity_at
  ) VALUES (
    NEW.post_id,
    1,
    now()
  )
  ON CONFLICT (post_id) DO UPDATE SET
    shares_count = post_engagement_metrics.shares_count + 1,
    last_activity_at = now();

  -- Create notification if not sharing own post
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
    -- Get sharer's name
    SELECT display_name INTO v_sharer_name
    FROM user_profiles
    WHERE user_id = NEW.user_id;

    IF should_send_notification(v_post_author_id, 'share') THEN
      INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, share_id, message)
      VALUES (
        v_post_author_id,
        'share',
        NEW.user_id,
        NEW.post_id,
        NEW.id,
        v_sharer_name || ' shared your post'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for mentions
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS trigger AS $$
DECLARE
  v_mentioner_name text;
  v_content_info text;
BEGIN
  -- Get mentioner's display name
  SELECT display_name INTO v_mentioner_name
  FROM user_profiles
  WHERE user_id = NEW.mentioning_user_id;

  -- Determine content context
  IF NEW.content_type = 'post' THEN
    v_content_info := ' in a post';
  ELSIF NEW.content_type = 'comment' THEN
    v_content_info := ' in a comment';
  ELSE
    v_content_info := '';
  END IF;

  -- Create notification
  IF should_send_notification(NEW.mentioned_user_id, 'mention') THEN
    INSERT INTO hubook_notifications (
      user_id,
      type,
      actor_id,
      post_id,
      comment_id,
      message
    ) VALUES (
      NEW.mentioned_user_id,
      'mention',
      NEW.mentioning_user_id,
      CASE WHEN NEW.content_type = 'post' THEN NEW.content_id ELSE NULL END,
      CASE WHEN NEW.content_type = 'comment' THEN NEW.content_id ELSE NULL END,
      v_mentioner_name || ' mentioned you' || v_content_info
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for album media comments
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS trigger AS $$
DECLARE
  v_media_owner_id uuid;
  v_parent_comment_author_id uuid;
  v_commenter_name text;
BEGIN
  -- Get commenter's name
  SELECT display_name INTO v_commenter_name
  FROM user_profiles
  WHERE user_id = NEW.user_id;

  IF NEW.parent_comment_id IS NULL THEN
    -- This is a top-level comment on album media
    SELECT am.user_id INTO v_media_owner_id
    FROM album_media am
    WHERE am.id = NEW.media_id;

    -- Notify media owner if not commenting on own media
    IF v_media_owner_id IS NOT NULL AND v_media_owner_id != NEW.user_id THEN
      IF should_send_notification(v_media_owner_id, 'album_media_comment') THEN
        INSERT INTO hubook_notifications (
          user_id,
          type,
          actor_id,
          album_media_comment_id,
          message
        ) VALUES (
          v_media_owner_id,
          'album_media_comment',
          NEW.user_id,
          NEW.id,
          v_commenter_name || ' commented on your photo'
        );
      END IF;
    END IF;
  ELSE
    -- This is a reply to another comment
    SELECT user_id INTO v_parent_comment_author_id
    FROM album_media_comments
    WHERE id = NEW.parent_comment_id;

    -- Notify parent comment author if not replying to own comment
    IF v_parent_comment_author_id IS NOT NULL AND v_parent_comment_author_id != NEW.user_id THEN
      IF should_send_notification(v_parent_comment_author_id, 'comment_reply') THEN
        INSERT INTO hubook_notifications (
          user_id,
          type,
          actor_id,
          album_media_comment_id,
          message
        ) VALUES (
          v_parent_comment_author_id,
          'comment_reply',
          NEW.user_id,
          NEW.id,
          v_commenter_name || ' replied to your comment'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for album media reactions
CREATE OR REPLACE FUNCTION notify_media_owner_on_reaction()
RETURNS trigger AS $$
DECLARE
  v_media_owner_id uuid;
  v_reactor_name text;
  v_reaction_type text;
BEGIN
  -- Get the media owner
  SELECT am.user_id INTO v_media_owner_id
  FROM album_media am
  WHERE am.id = NEW.media_id;

  -- Only notify if not reacting to own media
  IF v_media_owner_id IS NOT NULL AND v_media_owner_id != NEW.user_id THEN
    -- Get reactor's name
    SELECT display_name INTO v_reactor_name
    FROM user_profiles
    WHERE user_id = NEW.user_id;

    -- Get reaction type name
    SELECT CASE NEW.reaction_type
      WHEN 'like' THEN 'liked'
      WHEN 'love' THEN 'loved'
      WHEN 'haha' THEN 'laughed at'
      WHEN 'wow' THEN 'wowed at'
      WHEN 'sad' THEN 'reacted sadly to'
      WHEN 'angry' THEN 'reacted angrily to'
      ELSE 'reacted to'
    END INTO v_reaction_type;

    IF should_send_notification(v_media_owner_id, 'album_media_reaction') THEN
      INSERT INTO hubook_notifications (
        user_id,
        type,
        actor_id,
        message
      ) VALUES (
        v_media_owner_id,
        'album_media_reaction',
        NEW.user_id,
        v_reactor_name || ' ' || v_reaction_type || ' your photo'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
