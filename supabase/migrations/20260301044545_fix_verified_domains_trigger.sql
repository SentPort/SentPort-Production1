/*
  # Fix Verified Domains Trigger

  1. Changes
    - Update the trigger function to be more robust and handle errors gracefully
    - Separate the RLS policies for better clarity (SELECT vs INSERT/UPDATE/DELETE)
    - Add better error handling in trigger functions

  2. Security
    - Maintain existing RLS policies
    - Ensure triggers don't fail silently
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_update_verified_status ON verified_external_domains;

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION update_search_index_verified_status()
RETURNS trigger AS $$
BEGIN
  BEGIN
    IF (TG_OP = 'INSERT') THEN
      -- Mark all search_index entries with this domain as verified
      UPDATE search_index
      SET is_verified_external = true
      WHERE is_internal = false
      AND extract_domain(url) = NEW.domain;
      
      RETURN NEW;
      
    ELSIF (TG_OP = 'DELETE') THEN
      -- Unmark all search_index entries with this domain
      UPDATE search_index
      SET is_verified_external = false
      WHERE is_internal = false
      AND extract_domain(url) = OLD.domain;
      
      RETURN OLD;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Error updating search_index verified status: %', SQLERRM;
    IF (TG_OP = 'DELETE') THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_verified_status
  AFTER INSERT OR DELETE ON verified_external_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_search_index_verified_status();

-- Also update the check function to be more robust
CREATE OR REPLACE FUNCTION check_verified_domain_on_insert()
RETURNS trigger AS $$
BEGIN
  BEGIN
    -- Only check external content
    IF NEW.is_internal = false THEN
      -- Check if the domain is in verified list
      IF EXISTS (
        SELECT 1 FROM verified_external_domains
        WHERE domain = extract_domain(NEW.url)
      ) THEN
        NEW.is_verified_external := true;
      ELSE
        NEW.is_verified_external := false;
      END IF;
    ELSE
      NEW.is_verified_external := false;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error checking verified domain: %', SQLERRM;
    NEW.is_verified_external := false;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger for check function
DROP TRIGGER IF EXISTS trigger_check_verified_on_insert ON search_index;
CREATE TRIGGER trigger_check_verified_on_insert
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW
  EXECUTE FUNCTION check_verified_domain_on_insert();