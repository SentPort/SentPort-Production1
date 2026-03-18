/*
  # Create Notification Dismissals Tracking System

  1. New Tables
    - `user_notification_dismissals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `notification_type` (text) - Type of notification dismissed
      - `dismissed_at` (timestamptz) - When notification was dismissed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_notification_dismissals` table
    - Add policy for users to view their own dismissals
    - Add policy for users to insert their own dismissals
    - Add policy for users to delete their own dismissals (for testing/reset)

  3. Indexes
    - Create composite index on (user_id, notification_type) for fast lookups

  4. Notes
    - Notification types include: 'subdomain_dashboard_announcement'
    - This allows users to permanently dismiss notifications per type
    - Users can see the same notification again if they delete their dismissal
*/

-- Create notification dismissals table
CREATE TABLE IF NOT EXISTS user_notification_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  dismissed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_dismissals_user_type 
  ON user_notification_dismissals(user_id, notification_type);

-- Enable RLS
ALTER TABLE user_notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own dismissals
CREATE POLICY "Users can view own notification dismissals"
  ON user_notification_dismissals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own dismissals
CREATE POLICY "Users can insert own notification dismissals"
  ON user_notification_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own dismissals
CREATE POLICY "Users can delete own notification dismissals"
  ON user_notification_dismissals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);