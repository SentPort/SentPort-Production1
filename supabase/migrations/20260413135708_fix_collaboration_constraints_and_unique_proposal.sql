/*
  # Fix Collaboration Constraints and Add Unique Proposal Constraint

  ## Changes

  1. blog_collaborations
     - Add 'published' to status check constraint (was blocking publishing entirely)

  2. blog_collaboration_members
     - Add 'accepted' to status check (frontend inserts with 'accepted' during proposal approval)
     - Add 'admin' to role check (frontend inserts initiator as 'admin' role)

  3. blog_collaborations
     - Add UNIQUE constraint on proposal_id to prevent duplicate collaborations for same proposal
*/

-- 1. Fix blog_collaborations status constraint to include 'published'
ALTER TABLE blog_collaborations
  DROP CONSTRAINT IF EXISTS blog_collaborations_status_check;

ALTER TABLE blog_collaborations
  ADD CONSTRAINT blog_collaborations_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text, 'published'::text]));

-- 2. Fix blog_collaboration_members status constraint to include 'accepted'
ALTER TABLE blog_collaboration_members
  DROP CONSTRAINT IF EXISTS blog_collaboration_members_status_check;

ALTER TABLE blog_collaboration_members
  ADD CONSTRAINT blog_collaboration_members_status_check
  CHECK (status = ANY (ARRAY['invited'::text, 'active'::text, 'accepted'::text, 'left'::text]));

-- 3. Fix blog_collaboration_members role constraint to include 'admin'
ALTER TABLE blog_collaboration_members
  DROP CONSTRAINT IF EXISTS blog_collaboration_members_role_check;

ALTER TABLE blog_collaboration_members
  ADD CONSTRAINT blog_collaboration_members_role_check
  CHECK (role = ANY (ARRAY['creator'::text, 'editor'::text, 'viewer'::text, 'admin'::text]));

-- 4. Add UNIQUE constraint on blog_collaborations.proposal_id to prevent duplicates
ALTER TABLE blog_collaborations
  DROP CONSTRAINT IF EXISTS blog_collaborations_proposal_id_unique;

ALTER TABLE blog_collaborations
  ADD CONSTRAINT blog_collaborations_proposal_id_unique
  UNIQUE (proposal_id);
