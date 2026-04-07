/*
  # Create Default Privacy Settings for Existing Users

  1. Purpose
    - Insert default privacy settings for all users who don't have them
    - Add trigger to auto-create privacy settings when HuBook profiles are created
    - Ensure backward compatibility by defaulting to most permissive settings

  2. Changes
    - Insert default privacy settings for existing users without records
    - Create trigger function to auto-insert privacy settings on HuBook profile creation
    - Create trigger to invoke the function

  3. Security
    - Maintains existing RLS policies
    - Uses security definer for trigger function to bypass RLS during auto-creation
*/

-- Insert default privacy settings for all users who have HuBook profiles but no privacy settings
INSERT INTO user_privacy_settings (
  user_id,
  profile_visibility,
  post_visibility_default,
  who_can_see_photos,
  friend_request_privacy,
  messaging_privacy,
  who_can_see_friends_list,
  tagging_privacy
)
SELECT 
  hp.user_id,
  'public',
  'public',
  'everyone',
  'everyone',
  'everyone',
  'everyone',
  'everyone'
FROM hubook_profiles hp
WHERE NOT EXISTS (
  SELECT 1 FROM user_privacy_settings ups 
  WHERE ups.user_id = hp.user_id
);

-- Create function to auto-create privacy settings when HuBook profile is created
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_privacy_settings (
    user_id,
    profile_visibility,
    post_visibility_default,
    who_can_see_photos,
    friend_request_privacy,
    messaging_privacy,
    who_can_see_friends_list,
    tagging_privacy
  )
  VALUES (
    NEW.user_id,
    'public',
    'public',
    'everyone',
    'everyone',
    'everyone',
    'everyone',
    'everyone'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create privacy settings on HuBook profile creation
DROP TRIGGER IF EXISTS create_privacy_settings_on_profile_creation ON hubook_profiles;
CREATE TRIGGER create_privacy_settings_on_profile_creation
  AFTER INSERT ON hubook_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_privacy_settings();
