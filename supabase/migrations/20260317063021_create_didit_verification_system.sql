/*
  # Didit Identity Verification System

  1. New Tables
    - `didit_verification_sessions`
      - Tracks verification sessions initiated through Didit
      - Stores minimal data for privacy (no sensitive verification details)
      - Links sessions to users for status tracking
      - Records session lifecycle (pending, approved, declined, abandoned)

  2. Schema Updates
    - `user_profiles`
      - Add `last_verification_at` timestamp to track when user was last verified
      - Existing `is_verified` boolean is updated by webhook when verification completes

  3. Security
    - Enable RLS on `didit_verification_sessions`
    - Users can only view their own sessions
    - Admins can view all sessions
    - Webhook function uses service role to bypass RLS for updates

  4. Data Retention & Privacy
    - Auto-delete declined/abandoned sessions after 90 days
    - Keep approved sessions for audit trail
    - No sensitive verification data stored (IDs, documents, biometrics)

  5. Important Notes
    - Webhook secret validation happens in Edge Function, not database
    - Session IDs from Didit are stored for webhook correlation
    - Unlimited retries allowed (no rate limiting in schema)
*/

-- Add verification timestamp to user profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_verification_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_verification_at timestamptz;
  END IF;
END $$;

-- Create Didit verification sessions table
CREATE TABLE IF NOT EXISTS didit_verification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  workflow_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  initiated_by text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  webhook_received_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'declined', 'abandoned')),
  CONSTRAINT valid_initiated_by CHECK (initiated_by IN ('user', 'admin'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_didit_sessions_user_id ON didit_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_didit_sessions_session_id ON didit_verification_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_didit_sessions_status ON didit_verification_sessions(status);
CREATE INDEX IF NOT EXISTS idx_didit_sessions_created_at ON didit_verification_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE didit_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own verification sessions"
  ON didit_verification_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all verification sessions"
  ON didit_verification_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Users can insert their own sessions (via Edge Function)
CREATE POLICY "Users can create own verification sessions"
  ON didit_verification_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert sessions for any user (force reverification)
CREATE POLICY "Admins can create verification sessions for any user"
  ON didit_verification_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Function to automatically clean up old declined/abandoned sessions (90 day retention)
CREATE OR REPLACE FUNCTION cleanup_old_verification_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM didit_verification_sessions
  WHERE status IN ('declined', 'abandoned')
  AND created_at < now() - interval '90 days';
END;
$$;

-- Create a scheduled job placeholder comment
-- Note: Actual scheduled job would be set up via Supabase Edge Function or pg_cron
-- This function can be called periodically to maintain data retention policy
COMMENT ON FUNCTION cleanup_old_verification_sessions() IS 'Run this periodically (e.g., daily) to delete declined/abandoned sessions older than 90 days for GDPR compliance';
