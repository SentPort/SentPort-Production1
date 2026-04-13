/*
  # Fix Collaboration Notifications and Add DB-Level Constraints

  ## Summary
  This migration fixes several critical bugs in the HuBlog collaboration system and
  adds missing notification infrastructure.

  ## Changes

  ### 1. Extend blog_notification_type enum
  - Adds `collaboration_proposal` - sent when you are invited to a collaboration
  - Adds `collaboration_published` - sent when a collaboration is published
  - Adds `proposal_rescinded` - sent when an initiator rescinds a proposal
  - Adds `proposal_approved` - sent when all members approve a proposal

  ### 2. Fix publish_collaboration_to_blog RPC
  - Was inserting into blog_notifications with wrong column names
    (`user_id`, `content`, `related_user_id`, `related_post_id`)
  - Correct columns are: `recipient_id`, `actor_id`, `type`, `post_id`, `message`
  - Also fixes the member loop which referenced `user_id` from wrong context

  ### 3. Fix rescind_collaboration_proposal RPC
  - Was inserting into blog_notifications with wrong column names
    (`user_id`, `content`, `related_user_id`)
  - Correct columns are: `recipient_id`, `actor_id`, `type`, `message`
  - Also fixes the member loop which referenced `user_id` instead of `invitee_id`

  ### 4. Add DB-level max_participants constraint
  - Adds CHECK constraint: max_participants BETWEEN 2 AND 5
    (minimum 1 initiator + 1 collaborator, max 1 initiator + 4 collaborators)

  ### 5. Add check_proposal_approval notification
  - When all members approve, notify all members with collaboration_published type
  - Also sends proposal_approved notification to all participants

  ### Security
  - All functions remain SECURITY DEFINER
  - RLS policies unchanged
*/

-- 1. Add new enum values to blog_notification_type
ALTER TYPE blog_notification_type ADD VALUE IF NOT EXISTS 'collaboration_proposal';
ALTER TYPE blog_notification_type ADD VALUE IF NOT EXISTS 'collaboration_published';
ALTER TYPE blog_notification_type ADD VALUE IF NOT EXISTS 'proposal_rescinded';
ALTER TYPE blog_notification_type ADD VALUE IF NOT EXISTS 'proposal_approved';

-- 2. Add DB-level constraint on max_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'blog_collaboration_proposals_max_participants_check'
    AND constraint_schema = 'public'
  ) THEN
    ALTER TABLE blog_collaboration_proposals
      ADD CONSTRAINT blog_collaboration_proposals_max_participants_check
      CHECK (max_participants BETWEEN 2 AND 5);
  END IF;
END $$;

-- 3. Fix publish_collaboration_to_blog with correct column names
CREATE OR REPLACE FUNCTION public.publish_collaboration_to_blog(
  p_collaboration_id uuid,
  p_title text,
  p_excerpt text,
  p_tags text[],
  p_cover_image_url text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content jsonb;
  v_initiator_id uuid;
  v_post_id uuid;
  v_member_row record;
  v_collaboration_status text;
  v_word_count integer;
  v_reading_time integer;
BEGIN
  -- Get collaboration details
  SELECT bc.status, bc.creator_id, wc.content
  INTO v_collaboration_status, v_initiator_id, v_content
  FROM blog_collaborations bc
  LEFT JOIN blog_collaboration_workspace_content wc ON wc.collaboration_id = bc.id
  WHERE bc.id = p_collaboration_id;

  IF v_collaboration_status IS NULL THEN
    RAISE EXCEPTION 'Collaboration not found';
  END IF;

  IF v_collaboration_status = 'published' THEN
    RAISE EXCEPTION 'Collaboration already published';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM blog_collaboration_members
    WHERE collaboration_id = p_collaboration_id
    AND user_id = auth.uid()
    AND status IN ('accepted', 'active')
  ) THEN
    RAISE EXCEPTION 'Only collaboration members can publish';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM blog_accounts WHERE id = v_initiator_id
  ) THEN
    RAISE EXCEPTION 'Initiator does not have a blog account';
  END IF;

  -- Calculate word count and reading time
  v_word_count := COALESCE(array_length(string_to_array(COALESCE(v_content->>'text', ''), ' '), 1), 0);
  v_reading_time := GREATEST(1, CEIL(v_word_count::numeric / 200));

  -- Create blog post
  INSERT INTO blog_posts (
    account_id,
    title,
    content,
    excerpt,
    tags,
    cover_image_url,
    status,
    published_at,
    word_count,
    reading_time_minutes,
    estimated_read_minutes,
    privacy
  ) VALUES (
    v_initiator_id,
    p_title,
    COALESCE(v_content->>'text', ''),
    p_excerpt,
    p_tags,
    p_cover_image_url,
    'published',
    now(),
    v_word_count,
    v_reading_time,
    v_reading_time,
    'public'
  ) RETURNING id INTO v_post_id;

  -- Add all collaboration members as co-authors (excluding initiator)
  FOR v_member_row IN
    SELECT user_id
    FROM blog_collaboration_members
    WHERE collaboration_id = p_collaboration_id
    AND status IN ('accepted', 'active')
    AND user_id != v_initiator_id
  LOOP
    INSERT INTO blog_post_authors (post_id, author_id, role)
    VALUES (v_post_id, v_member_row.user_id, 'contributor')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Update collaboration status
  UPDATE blog_collaborations
  SET status = 'published',
      published_post_id = v_post_id
  WHERE id = p_collaboration_id;

  -- Send notifications to all members (using correct column names)
  FOR v_member_row IN
    SELECT user_id
    FROM blog_collaboration_members
    WHERE collaboration_id = p_collaboration_id
    AND status IN ('accepted', 'active')
    AND user_id != auth.uid()
  LOOP
    INSERT INTO blog_notifications (
      recipient_id,
      actor_id,
      type,
      post_id,
      message
    ) VALUES (
      v_member_row.user_id,
      auth.uid(),
      'collaboration_published'::blog_notification_type,
      v_post_id,
      'Your collaborative blog post has been published!'
    );
  END LOOP;

  RETURN v_post_id;
END;
$$;

-- 4. Fix rescind_collaboration_proposal with correct column names
CREATE OR REPLACE FUNCTION public.rescind_collaboration_proposal(
  p_proposal_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_initiator_id uuid;
  v_status text;
  v_member_row record;
BEGIN
  SELECT initiator_id, status
  INTO v_initiator_id, v_status
  FROM blog_collaboration_proposals
  WHERE id = p_proposal_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_initiator_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the proposal initiator can rescind it';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Only pending proposals can be rescinded';
  END IF;

  UPDATE blog_collaboration_proposals
  SET status = 'rescinded'
  WHERE id = p_proposal_id;

  UPDATE blog_collaboration_proposal_members
  SET status = 'rescinded'
  WHERE proposal_id = p_proposal_id;

  -- Notify invited members (using correct column names)
  FOR v_member_row IN
    SELECT invitee_id
    FROM blog_collaboration_proposal_members
    WHERE proposal_id = p_proposal_id
    AND invitee_id != auth.uid()
  LOOP
    INSERT INTO blog_notifications (
      recipient_id,
      actor_id,
      type,
      message
    ) VALUES (
      v_member_row.invitee_id,
      auth.uid(),
      'proposal_rescinded'::blog_notification_type,
      'A collaboration proposal you were invited to has been withdrawn'
    );
  END LOOP;

  RETURN true;
END;
$$;

-- 5. Fix check_proposal_approval to send notification to all when approved
CREATE OR REPLACE FUNCTION public.check_proposal_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_members integer;
  v_approved_members integer;
  v_proposal record;
  v_member_row record;
BEGIN
  SELECT COUNT(*) INTO v_total_members
  FROM blog_collaboration_proposal_members
  WHERE proposal_id = NEW.proposal_id;

  SELECT COUNT(*) INTO v_approved_members
  FROM blog_collaboration_proposal_members
  WHERE proposal_id = NEW.proposal_id
  AND status = 'approved';

  IF v_total_members = v_approved_members AND v_total_members > 1 THEN
    UPDATE blog_collaboration_proposals
    SET status = 'active', approved_at = now()
    WHERE id = NEW.proposal_id;

    -- Notify all members that the proposal is fully approved
    SELECT title INTO v_proposal
    FROM blog_collaboration_proposals
    WHERE id = NEW.proposal_id;

    FOR v_member_row IN
      SELECT invitee_id
      FROM blog_collaboration_proposal_members
      WHERE proposal_id = NEW.proposal_id
      AND invitee_id != NEW.invitee_id
    LOOP
      INSERT INTO blog_notifications (
        recipient_id,
        actor_id,
        type,
        message
      ) VALUES (
        v_member_row.invitee_id,
        NEW.invitee_id,
        'proposal_approved'::blog_notification_type,
        'All collaborators have approved the proposal! The workspace is now active.'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (drop and recreate to pick up SECURITY DEFINER)
DROP TRIGGER IF EXISTS trigger_check_proposal_approval ON blog_collaboration_proposal_members;
CREATE TRIGGER trigger_check_proposal_approval
  AFTER UPDATE ON blog_collaboration_proposal_members
  FOR EACH ROW
  EXECUTE FUNCTION check_proposal_approval();
