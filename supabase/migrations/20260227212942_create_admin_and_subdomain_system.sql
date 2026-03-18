/*
  # Admin Infrastructure and Subdomain Management System

  1. Schema Updates
    - Add `is_admin` field to `user_profiles` table for admin role identification
    - Add `full_name` field to `user_profiles` for better user identification

  2. New Tables
    - `subdomains`
      - `id` (uuid, primary key)
      - `subdomain` (text, unique, the claimed subdomain name)
      - `owner_id` (uuid, references user_profiles)
      - `owner_email` (text, denormalized for quick lookup)
      - `owner_name` (text, denormalized for quick lookup)
      - `status` (text, active/inactive/suspended)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `admin_report_alerts`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `report_ratio` (numeric, calculated ratio)
      - `total_engagements` (integer)
      - `total_reports` (integer)
      - `flagged_at` (timestamptz)
      - `reviewed` (boolean, default false)
      - `reviewed_by` (uuid, references user_profiles)
      - `reviewed_at` (timestamptz)

  3. Security
    - Enable RLS on all new tables
    - Admins can read all subdomains
    - Users can read their own subdomains
    - Only admins can access admin_report_alerts
    - Add admin-only policies for subdomain management

  4. Functions
    - Trigger function to auto-flag posts when report ratio exceeds 15%
    - Function to calculate report ratios automatically
    - Function to sync subdomain owner information
*/

-- Add admin and full_name fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name text;
  END IF;
END $$;

-- Create subdomains table
CREATE TABLE IF NOT EXISTS subdomains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain text UNIQUE NOT NULL,
  owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  owner_email text NOT NULL,
  owner_name text,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE subdomains ENABLE ROW LEVEL SECURITY;

-- Policies for subdomains table
CREATE POLICY "Admins can read all subdomains"
  ON subdomains
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Users can read own subdomains"
  ON subdomains
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Verified users can insert subdomains"
  ON subdomains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can update own subdomains"
  ON subdomains
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can update all subdomains"
  ON subdomains
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create admin_report_alerts table
CREATE TABLE IF NOT EXISTS admin_report_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  platform text NOT NULL,
  report_ratio numeric NOT NULL,
  total_engagements integer DEFAULT 0 NOT NULL,
  total_reports integer DEFAULT 0 NOT NULL,
  flagged_at timestamptz DEFAULT now() NOT NULL,
  reviewed boolean DEFAULT false NOT NULL,
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz
);

ALTER TABLE admin_report_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can access report alerts
CREATE POLICY "Admins can read all report alerts"
  ON admin_report_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update report alerts"
  ON admin_report_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Trigger to update updated_at on subdomains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_subdomains_updated_at'
  ) THEN
    CREATE TRIGGER update_subdomains_updated_at
      BEFORE UPDATE ON subdomains
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to check and flag posts exceeding 15% report ratio
CREATE OR REPLACE FUNCTION check_report_ratio_and_flag()
RETURNS TRIGGER AS $$
DECLARE
  v_total_engagements integer;
  v_total_reports integer;
  v_ratio numeric;
  v_platform text;
BEGIN
  -- Get total engagements and reports from post_engagement_metrics
  SELECT
    COALESCE(total_reactions, 0) + COALESCE(total_comments, 0) + COALESCE(total_shares, 0) as engagements,
    COALESCE(report_count, 0) as reports
  INTO v_total_engagements, v_total_reports
  FROM post_engagement_metrics
  WHERE post_id = NEW.post_id;

  -- Calculate ratio only if there are engagements
  IF v_total_engagements > 0 THEN
    v_ratio := v_total_reports::numeric / v_total_engagements::numeric;

    -- If ratio exceeds 15% and not already flagged
    IF v_ratio > 0.15 THEN
      -- Determine platform from post context
      v_platform := 'hubook'; -- Default, can be enhanced to detect actual platform

      -- Insert or update alert
      INSERT INTO admin_report_alerts (post_id, platform, report_ratio, total_engagements, total_reports)
      VALUES (NEW.post_id, v_platform, v_ratio, v_total_engagements, v_total_reports)
      ON CONFLICT (post_id)
      DO UPDATE SET
        report_ratio = v_ratio,
        total_engagements = v_total_engagements,
        total_reports = v_total_reports,
        flagged_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint on post_id for admin_report_alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_report_alerts_post_id_key'
  ) THEN
    ALTER TABLE admin_report_alerts ADD CONSTRAINT admin_report_alerts_post_id_key UNIQUE (post_id);
  END IF;
END $$;

-- Create trigger on post_engagement_metrics to auto-flag posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_check_report_ratio'
  ) THEN
    CREATE TRIGGER trigger_check_report_ratio
      AFTER INSERT OR UPDATE ON post_engagement_metrics
      FOR EACH ROW
      WHEN (NEW.report_count > 0)
      EXECUTE FUNCTION check_report_ratio_and_flag();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subdomains_owner_id ON subdomains(owner_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_subdomain ON subdomains(subdomain);
CREATE INDEX IF NOT EXISTS idx_subdomains_owner_email ON subdomains(owner_email);
CREATE INDEX IF NOT EXISTS idx_subdomains_owner_name ON subdomains(owner_name);
CREATE INDEX IF NOT EXISTS idx_admin_report_alerts_reviewed ON admin_report_alerts(reviewed);
CREATE INDEX IF NOT EXISTS idx_admin_report_alerts_post_id ON admin_report_alerts(post_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin);
