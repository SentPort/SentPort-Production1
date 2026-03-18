/*
  # Add Subdomain Deletion Tracking System

  1. Schema Updates
    - Add `paused_at` (timestamptz) to track when subdomain was paused
    - Add `scheduled_deletion_at` (timestamptz) to track when subdomain should be deleted (30 days after pause)
    - Update status check constraint to include 'suspended' state

  2. Indexes
    - Add index on `scheduled_deletion_at` for efficient cleanup queries
    - Add index on `status` for filtering active/suspended subdomains

  3. Purpose
    - Track when user accounts are removed and their subdomains are paused
    - Enable 30-day appeal window before permanent deletion
    - Support automated cleanup process to free up subdomain names after 30 days
*/

-- Add paused_at column to track when subdomain was suspended
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subdomains' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE subdomains ADD COLUMN paused_at timestamptz;
  END IF;
END $$;

-- Add scheduled_deletion_at column to track when subdomain should be permanently deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subdomains' AND column_name = 'scheduled_deletion_at'
  ) THEN
    ALTER TABLE subdomains ADD COLUMN scheduled_deletion_at timestamptz;
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subdomains_status ON subdomains(status);
CREATE INDEX IF NOT EXISTS idx_subdomains_scheduled_deletion ON subdomains(scheduled_deletion_at) WHERE scheduled_deletion_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subdomains_paused_at ON subdomains(paused_at) WHERE paused_at IS NOT NULL;

-- Create function to pause all subdomains owned by a user
CREATE OR REPLACE FUNCTION pause_user_subdomains(p_user_id uuid)
RETURNS TABLE(subdomain_name text, paused_at timestamptz, deletion_date timestamptz) AS $$
BEGIN
  RETURN QUERY
  UPDATE subdomains
  SET 
    status = 'suspended',
    paused_at = now(),
    scheduled_deletion_at = now() + interval '30 days',
    updated_at = now()
  WHERE owner_id = p_user_id
    AND status = 'active'
  RETURNING subdomain, subdomains.paused_at, subdomains.scheduled_deletion_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore all subdomains owned by a user
CREATE OR REPLACE FUNCTION restore_user_subdomains(p_user_id uuid)
RETURNS TABLE(subdomain_name text, restored_at timestamptz) AS $$
BEGIN
  RETURN QUERY
  UPDATE subdomains
  SET 
    status = 'active',
    paused_at = NULL,
    scheduled_deletion_at = NULL,
    updated_at = now()
  WHERE owner_id = p_user_id
    AND status = 'suspended'
  RETURNING subdomain, now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get subdomain count for a user
CREATE OR REPLACE FUNCTION get_user_subdomain_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  subdomain_count integer;
BEGIN
  SELECT COUNT(*)
  INTO subdomain_count
  FROM subdomains
  WHERE owner_id = p_user_id;
  
  RETURN subdomain_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup expired subdomains (called by Edge Function)
CREATE OR REPLACE FUNCTION cleanup_expired_subdomains()
RETURNS TABLE(deleted_subdomain text, owner_email text, deletion_time timestamptz) AS $$
BEGIN
  RETURN QUERY
  DELETE FROM subdomains
  WHERE status = 'suspended'
    AND scheduled_deletion_at IS NOT NULL
    AND scheduled_deletion_at <= now()
  RETURNING subdomain, subdomains.owner_email, now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;