/*
  # Create Homepage-Dependent Publish Constraints and Triggers

  1. Overview
    - Enforces homepage-dependent publish constraints for subdomain pages
    - Secondary pages cannot be published unless homepage is published
    - Unpublishing homepage automatically unpublishes all secondary pages

  2. Trigger Functions
    - `validate_secondary_page_publish()`: Validates publish constraints before UPDATE
    - `cascade_homepage_unpublish()`: Cascades unpublish to all secondary pages after homepage unpublish

  3. Triggers
    - BEFORE UPDATE trigger on subdomain_pages to validate secondary page publish
    - AFTER UPDATE trigger on subdomain_pages to cascade homepage unpublish

  4. Security
    - All functions use SECURITY DEFINER to bypass RLS for validation logic
    - Operations respect existing RLS policies for data access
*/

-- Function to validate secondary page publish constraints
CREATE OR REPLACE FUNCTION validate_secondary_page_publish()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_homepage_published boolean;
BEGIN
  -- Only validate if trying to publish a secondary page
  IF NEW.is_published = true AND OLD.is_published = false AND NEW.is_homepage = false THEN
    -- Check if homepage for this subdomain is published
    SELECT is_published INTO v_homepage_published
    FROM subdomain_pages
    WHERE subdomain_id = NEW.subdomain_id
      AND is_homepage = true
    LIMIT 1;

    -- If homepage not found or not published, prevent publish
    IF v_homepage_published IS NULL OR v_homepage_published = false THEN
      RAISE EXCEPTION 'Cannot publish secondary page: Homepage must be published first';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to cascade unpublish when homepage is unpublished
CREATE OR REPLACE FUNCTION cascade_homepage_unpublish()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only cascade if homepage is being unpublished
  IF NEW.is_homepage = true AND OLD.is_published = true AND NEW.is_published = false THEN
    -- Unpublish all secondary pages for this subdomain
    UPDATE subdomain_pages
    SET
      is_published = false,
      updated_at = now()
    WHERE subdomain_id = NEW.subdomain_id
      AND is_homepage = false
      AND is_published = true;
  END IF;

  RETURN NEW;
END;
$$;

-- Create BEFORE UPDATE trigger to validate secondary page publish
DROP TRIGGER IF EXISTS validate_secondary_page_publish_trigger ON subdomain_pages;
CREATE TRIGGER validate_secondary_page_publish_trigger
  BEFORE UPDATE ON subdomain_pages
  FOR EACH ROW
  EXECUTE FUNCTION validate_secondary_page_publish();

-- Create AFTER UPDATE trigger to cascade homepage unpublish
DROP TRIGGER IF EXISTS cascade_homepage_unpublish_trigger ON subdomain_pages;
CREATE TRIGGER cascade_homepage_unpublish_trigger
  AFTER UPDATE ON subdomain_pages
  FOR EACH ROW
  EXECUTE FUNCTION cascade_homepage_unpublish();

-- Add index for better performance on homepage queries
CREATE INDEX IF NOT EXISTS idx_subdomain_pages_subdomain_homepage
  ON subdomain_pages(subdomain_id, is_homepage)
  WHERE is_homepage = true;

-- Add index for publish status queries
CREATE INDEX IF NOT EXISTS idx_subdomain_pages_publish_status
  ON subdomain_pages(subdomain_id, is_published);
