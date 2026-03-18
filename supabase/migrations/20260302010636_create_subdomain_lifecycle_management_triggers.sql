/*
  # Subdomain Status and Lifecycle Management

  1. Purpose
    - Remove all subdomain content from search when subdomain becomes inactive/suspended
    - Re-index all subdomain content when subdomain is reactivated
    - Handle scheduled deletion workflow
    - Ensure all pages, images, videos, and assets are properly managed

  2. New Functions
    - `remove_all_subdomain_content_from_search(subdomain_id uuid)`: Remove all content
    - `reindex_all_subdomain_content(subdomain_id uuid)`: Re-index all content

  3. Triggers
    - AFTER UPDATE on subdomains: Handle status changes
    - AFTER DELETE on subdomains: Cascade cleanup (handled by FK constraints)

  4. Lifecycle Events
    - Status changes to 'inactive' or 'suspended': Remove from search immediately
    - Status changes to 'active': Re-index all published pages and media
    - Scheduled deletion set: Remove from search but keep in database
    - Actual deletion: Automatic cleanup via CASCADE constraints
*/

-- Function to remove all content from a subdomain from search
CREATE OR REPLACE FUNCTION remove_all_subdomain_content_from_search(subdomain_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subdomain RECORD;
  v_page RECORD;
BEGIN
  -- Get subdomain details
  SELECT * INTO v_subdomain
  FROM subdomains
  WHERE id = subdomain_id;

  IF v_subdomain.id IS NULL THEN
    RETURN;
  END IF;

  -- Remove all pages, images, videos, and assets for this subdomain
  -- This includes:
  -- 1. Web pages (source_platform = 'sentport_subdomain')
  -- 2. Embedded images (source_platform = 'sentport_subdomain_image')
  -- 3. Embedded videos (source_platform = 'sentport_subdomain_video')
  -- 4. Asset library items (source_platform = 'sentport_subdomain_asset')

  DELETE FROM search_index
  WHERE url LIKE 'https://' || v_subdomain.subdomain || '.sentport.com%'
     OR parent_page_url LIKE 'https://' || v_subdomain.subdomain || '.sentport.com%';

  -- Also remove assets that belong to this subdomain
  DELETE FROM search_index
  WHERE url IN (
    SELECT public_url || '#asset-' || id
    FROM website_builder_assets
    WHERE subdomain_id = remove_all_subdomain_content_from_search.subdomain_id
  );
END;
$$;

-- Function to re-index all content from a subdomain
CREATE OR REPLACE FUNCTION reindex_all_subdomain_content(subdomain_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page RECORD;
  v_asset RECORD;
BEGIN
  -- Re-index all published pages for this subdomain
  FOR v_page IN
    SELECT id
    FROM subdomain_pages
    WHERE subdomain_id = reindex_all_subdomain_content.subdomain_id
      AND is_published = true
  LOOP
    PERFORM index_subdomain_page(v_page.id);
  END LOOP;

  -- Re-index all assets for this subdomain (if used in published pages)
  FOR v_asset IN
    SELECT id
    FROM website_builder_assets
    WHERE subdomain_id = reindex_all_subdomain_content.subdomain_id
      AND (file_type LIKE 'image/%' OR file_type LIKE 'video/%')
  LOOP
    PERFORM index_website_builder_asset(v_asset.id);
  END LOOP;
END;
$$;

-- Trigger function: Handle subdomain status changes
CREATE OR REPLACE FUNCTION trigger_subdomain_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If subdomain becomes inactive or suspended, remove all content from search
  IF OLD.status = 'active' AND NEW.status IN ('inactive', 'suspended') THEN
    PERFORM remove_all_subdomain_content_from_search(NEW.id);
  
  -- If subdomain becomes active again, re-index all content
  ELSIF OLD.status IN ('inactive', 'suspended') AND NEW.status = 'active' THEN
    PERFORM reindex_all_subdomain_content(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function: Handle scheduled deletion
CREATE OR REPLACE FUNCTION trigger_subdomain_scheduled_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If scheduled_deletion_at is set (and wasn't before), remove from search immediately
  IF OLD.scheduled_deletion_at IS NULL AND NEW.scheduled_deletion_at IS NOT NULL THEN
    PERFORM remove_all_subdomain_content_from_search(NEW.id);
  
  -- If scheduled deletion is cancelled, re-index if subdomain is active
  ELSIF OLD.scheduled_deletion_at IS NOT NULL AND NEW.scheduled_deletion_at IS NULL THEN
    IF NEW.status = 'active' THEN
      PERFORM reindex_all_subdomain_content(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers on subdomains table
DROP TRIGGER IF EXISTS subdomain_status_change ON subdomains;
CREATE TRIGGER subdomain_status_change
  AFTER UPDATE OF status ON subdomains
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_subdomain_status_change();

DROP TRIGGER IF EXISTS subdomain_scheduled_deletion_change ON subdomains;
CREATE TRIGGER subdomain_scheduled_deletion_change
  AFTER UPDATE OF scheduled_deletion_at ON subdomains
  FOR EACH ROW
  WHEN (OLD.scheduled_deletion_at IS DISTINCT FROM NEW.scheduled_deletion_at)
  EXECUTE FUNCTION trigger_subdomain_scheduled_deletion();
