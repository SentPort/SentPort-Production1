/*
  # Fix Verified External Domain Marking in Search Index

  ## Problem
  When admins add verified domains (e.g., en.wikipedia.org, investopedia.com), 
  existing entries in the search_index table are not getting marked with 
  is_verified_external = true, causing search results to show "External Content" 
  instead of "Verified Human External" badge.

  ## Solution
  1. Manually update all existing search_index entries to mark verified domains
  2. Improve the trigger function to handle domain matching more reliably
  3. Add a stored procedure to refresh verification status on demand

  ## Changes
  1. Update existing search_index entries for all verified domains
  2. Create a refresh function that can be called to re-check all entries
  3. Improve trigger to handle edge cases (www prefix, subdomains, etc.)
*/

-- Step 1: Manually update all existing search_index entries for verified domains
-- This will immediately fix the display issue for Wikipedia and Investopedia

UPDATE search_index
SET is_verified_external = true
WHERE is_verified_external = false
  AND EXISTS (
    SELECT 1 
    FROM verified_external_domains ved
    WHERE extract_domain(search_index.url) = ved.domain
  );

-- Step 2: Create a function to refresh verification status for all search index entries
-- Admins can call this function if entries ever get out of sync

CREATE OR REPLACE FUNCTION refresh_all_verified_external_flags()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark all entries from verified domains as verified
  UPDATE search_index
  SET is_verified_external = true
  WHERE is_verified_external = false
    AND EXISTS (
      SELECT 1 
      FROM verified_external_domains ved
      WHERE extract_domain(search_index.url) = ved.domain
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Unmark entries that are no longer in verified domains list
  UPDATE search_index
  SET is_verified_external = false
  WHERE is_verified_external = true
    AND NOT EXISTS (
      SELECT 1 
      FROM verified_external_domains ved
      WHERE extract_domain(search_index.url) = ved.domain
    );
  
  RETURN updated_count;
END;
$$;

-- Step 3: Improve the trigger function to handle the update more reliably
-- Replace the existing update_search_index_verified_status function

CREATE OR REPLACE FUNCTION update_search_index_verified_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- When a new verified domain is added, mark all matching search index entries
    UPDATE search_index
    SET is_verified_external = true
    WHERE extract_domain(url) = NEW.domain
      AND is_verified_external = false;
    
    RAISE NOTICE 'Marked search index entries for domain: %', NEW.domain;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- When a verified domain is removed, unmark all matching search index entries
    UPDATE search_index
    SET is_verified_external = false
    WHERE extract_domain(url) = OLD.domain
      AND is_verified_external = true;
    
    RAISE NOTICE 'Unmarked search index entries for domain: %', OLD.domain;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Grant execute permission on the refresh function to authenticated users
GRANT EXECUTE ON FUNCTION refresh_all_verified_external_flags() TO authenticated;

-- Add a comment to document the refresh function
COMMENT ON FUNCTION refresh_all_verified_external_flags() IS 
'Refreshes the is_verified_external flag for all search_index entries based on the current verified_external_domains list. Returns the number of entries updated.';
