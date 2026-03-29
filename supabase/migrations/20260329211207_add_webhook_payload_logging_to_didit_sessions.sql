/*
  # Add Webhook Payload Logging to Didit Verification Sessions

  1. Schema Changes
    - Add `webhook_payload` jsonb column to `didit_verification_sessions`
    - Stores raw webhook data from Didit for debugging
    - Helps diagnose status mapping issues

  2. Purpose
    - Enables debugging of webhook processing
    - Captures exact status values sent by Didit
    - Maintains audit trail of webhook deliveries
*/

-- Add webhook payload column for debugging
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'didit_verification_sessions' AND column_name = 'webhook_payload'
  ) THEN
    ALTER TABLE didit_verification_sessions ADD COLUMN webhook_payload jsonb;
  END IF;
END $$;

COMMENT ON COLUMN didit_verification_sessions.webhook_payload IS 'Stores the raw webhook payload from Didit for debugging and audit purposes';
