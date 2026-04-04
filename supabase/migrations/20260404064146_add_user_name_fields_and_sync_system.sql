/*
  # Add User Name Fields and Platform Name Synchronization System

  1. Schema Changes
    - Add `first_name` (text, nullable) to `user_profiles` - User-provided first name
    - Add `last_name` (text, nullable) to `user_profiles` - User-provided last name
    - Add `name_source` (text, nullable) to `user_profiles` - Tracks origin of full_name
      Possible values: 'manual', 'hubook', 'blog', 'heddit', 'hinsta', 'switter', 'hutube'

  2. Functions Created
    - `extract_display_name_from_platforms(user_id)` - Extracts name from platform profiles
    - `sync_user_full_name(user_id)` - Syncs full_name based on manual or platform data
    - `handle_platform_name_change()` - Trigger function for platform profile changes
    - `handle_user_name_change()` - Trigger function for user_profiles name changes

  3. Triggers
    - After INSERT/UPDATE on all 6 platform profile tables
    - Before UPDATE on user_profiles for name fields

  4. Data Migration
    - Backfills existing users with NULL full_name using platform display names
    - Sets name_source to 'manual' for users who already have full_name

  5. Priority Order
    - Manual names (first_name + last_name) always take precedence
    - Platform extraction order: HuBook > Blog > Heddit > Hinsta > Switter > HuTube
    - Only syncs from source platform when updating platform names
*/

-- Add new columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'name_source'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN name_source text;
  END IF;
END $$;

-- Function to extract display name from platforms in priority order
CREATE OR REPLACE FUNCTION extract_display_name_from_platforms(p_user_id uuid)
RETURNS TABLE(display_name text, source text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Priority 1: HuBook
  RETURN QUERY
  SELECT hp.display_name::text, 'hubook'::text
  FROM hubook_profiles hp
  WHERE hp.id = p_user_id AND hp.display_name IS NOT NULL
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 2: Blog
  RETURN QUERY
  SELECT ba.display_name::text, 'blog'::text
  FROM blog_accounts ba
  WHERE ba.id = p_user_id AND ba.display_name IS NOT NULL
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 3: Heddit
  RETURN QUERY
  SELECT ha.display_name::text, 'heddit'::text
  FROM heddit_accounts ha
  WHERE ha.id = p_user_id AND ha.display_name IS NOT NULL
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 4: Hinsta
  RETURN QUERY
  SELECT hia.display_name::text, 'hinsta'::text
  FROM hinsta_accounts hia
  WHERE hia.id = p_user_id AND hia.display_name IS NOT NULL
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 5: Switter
  RETURN QUERY
  SELECT sa.display_name::text, 'switter'::text
  FROM switter_accounts sa
  WHERE sa.id = p_user_id AND sa.display_name IS NOT NULL
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 6: HuTube
  RETURN QUERY
  SELECT hc.display_name::text, 'hutube'::text
  FROM hutube_channels hc
  WHERE hc.id = p_user_id AND hc.display_name IS NOT NULL
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- No platform name found
  RETURN QUERY SELECT NULL::text, NULL::text;
END;
$$;

-- Function to sync user full_name based on manual or platform data
CREATE OR REPLACE FUNCTION sync_user_full_name(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_platform_name text;
  v_platform_source text;
  v_new_full_name text;
  v_new_source text;
BEGIN
  -- Get current first_name and last_name
  SELECT first_name, last_name
  INTO v_first_name, v_last_name
  FROM user_profiles
  WHERE id = p_user_id;

  -- If user has provided first_name, use manual name
  IF v_first_name IS NOT NULL AND v_first_name != '' THEN
    -- Combine first and last name
    IF v_last_name IS NOT NULL AND v_last_name != '' THEN
      v_new_full_name := v_first_name || ' ' || v_last_name;
    ELSE
      v_new_full_name := v_first_name;
    END IF;
    v_new_source := 'manual';
  ELSE
    -- Extract from platforms
    SELECT display_name, source
    INTO v_platform_name, v_platform_source
    FROM extract_display_name_from_platforms(p_user_id);

    v_new_full_name := v_platform_name;
    v_new_source := v_platform_source;
  END IF;

  -- Update user_profiles
  UPDATE user_profiles
  SET
    full_name = v_new_full_name,
    name_source = v_new_source,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Trigger function for platform profile changes
CREATE OR REPLACE FUNCTION handle_platform_name_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_source text;
  v_platform_name text;
BEGIN
  -- Determine which platform and user_id
  IF TG_TABLE_NAME = 'hubook_profiles' THEN
    v_user_id := NEW.id;
    v_platform_name := 'hubook';
  ELSIF TG_TABLE_NAME = 'blog_accounts' THEN
    v_user_id := NEW.id;
    v_platform_name := 'blog';
  ELSIF TG_TABLE_NAME = 'heddit_accounts' THEN
    v_user_id := NEW.id;
    v_platform_name := 'heddit';
  ELSIF TG_TABLE_NAME = 'hinsta_accounts' THEN
    v_user_id := NEW.id;
    v_platform_name := 'hinsta';
  ELSIF TG_TABLE_NAME = 'switter_accounts' THEN
    v_user_id := NEW.id;
    v_platform_name := 'switter';
  ELSIF TG_TABLE_NAME = 'hutube_channels' THEN
    v_user_id := NEW.id;
    v_platform_name := 'hutube';
  ELSE
    RETURN NEW;
  END IF;

  -- Get current name_source from user_profiles
  SELECT name_source INTO v_current_source
  FROM user_profiles
  WHERE id = v_user_id;

  -- Only sync if:
  -- 1. This is an INSERT (new platform profile), OR
  -- 2. This is an UPDATE and the current source matches this platform, OR
  -- 3. There is no current source (NULL)
  IF TG_OP = 'INSERT' OR v_current_source IS NULL OR v_current_source = v_platform_name THEN
    PERFORM sync_user_full_name(v_user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for user_profiles name changes
CREATE OR REPLACE FUNCTION handle_user_name_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If first_name or last_name is being changed, recalculate full_name
  IF NEW.first_name IS DISTINCT FROM OLD.first_name OR
     NEW.last_name IS DISTINCT FROM OLD.last_name THEN

    -- Sync the full_name
    PERFORM sync_user_full_name(NEW.id);

    -- Reload the updated values
    SELECT full_name, name_source
    INTO NEW.full_name, NEW.name_source
    FROM user_profiles
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers on all platform profile tables
DROP TRIGGER IF EXISTS sync_hubook_name_to_profile ON hubook_profiles;
CREATE TRIGGER sync_hubook_name_to_profile
  AFTER INSERT OR UPDATE OF display_name ON hubook_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_platform_name_change();

DROP TRIGGER IF EXISTS sync_blog_name_to_profile ON blog_accounts;
CREATE TRIGGER sync_blog_name_to_profile
  AFTER INSERT OR UPDATE OF display_name ON blog_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_platform_name_change();

DROP TRIGGER IF EXISTS sync_heddit_name_to_profile ON heddit_accounts;
CREATE TRIGGER sync_heddit_name_to_profile
  AFTER INSERT OR UPDATE OF display_name ON heddit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_platform_name_change();

DROP TRIGGER IF EXISTS sync_hinsta_name_to_profile ON hinsta_accounts;
CREATE TRIGGER sync_hinsta_name_to_profile
  AFTER INSERT OR UPDATE OF display_name ON hinsta_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_platform_name_change();

DROP TRIGGER IF EXISTS sync_switter_name_to_profile ON switter_accounts;
CREATE TRIGGER sync_switter_name_to_profile
  AFTER INSERT OR UPDATE OF display_name ON switter_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_platform_name_change();

DROP TRIGGER IF EXISTS sync_hutube_name_to_profile ON hutube_channels;
CREATE TRIGGER sync_hutube_name_to_profile
  AFTER INSERT OR UPDATE OF display_name ON hutube_channels
  FOR EACH ROW
  EXECUTE FUNCTION handle_platform_name_change();

-- Create trigger on user_profiles for manual name changes
DROP TRIGGER IF EXISTS sync_manual_name_change ON user_profiles;
CREATE TRIGGER sync_manual_name_change
  BEFORE UPDATE OF first_name, last_name ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_name_change();

-- Backfill existing data
DO $$
DECLARE
  v_user record;
  v_platform_name text;
  v_platform_source text;
  v_backfill_count int := 0;
  v_manual_count int := 0;
BEGIN
  -- For users who already have full_name, mark it as manual
  UPDATE user_profiles
  SET name_source = 'manual'
  WHERE full_name IS NOT NULL AND name_source IS NULL;

  GET DIAGNOSTICS v_manual_count = ROW_COUNT;
  RAISE NOTICE 'Marked % existing users with full_name as manual', v_manual_count;

  -- For users with NULL full_name, extract from platforms
  FOR v_user IN
    SELECT id
    FROM user_profiles
    WHERE full_name IS NULL
  LOOP
    -- Extract platform name
    SELECT display_name, source
    INTO v_platform_name, v_platform_source
    FROM extract_display_name_from_platforms(v_user.id);

    -- Update if we found a name
    IF v_platform_name IS NOT NULL THEN
      UPDATE user_profiles
      SET
        full_name = v_platform_name,
        name_source = v_platform_source
      WHERE id = v_user.id;

      v_backfill_count := v_backfill_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfilled % users with platform display names', v_backfill_count;
END $$;
