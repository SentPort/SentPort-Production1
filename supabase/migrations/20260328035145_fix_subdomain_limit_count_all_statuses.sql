/*
  # Fix Subdomain Limit to Count All Subdomains

  1. Changes
    - Update `check_subdomain_limit()` function to count both active AND inactive subdomains
    - Previously only counted 'active' subdomains, allowing users to claim more than 3 as long as they were unpublished
    - Now enforces true 3-subdomain limit regardless of publish status
  
  2. Security
    - Maintains existing trigger-based enforcement
    - Prevents users from exceeding 3 subdomains per account
*/

CREATE OR REPLACE FUNCTION check_subdomain_limit()
RETURNS TRIGGER AS $$
DECLARE
  subdomain_count integer;
BEGIN
  -- Count ALL subdomains (both active and inactive) for this user
  SELECT COUNT(*) INTO subdomain_count
  FROM subdomains
  WHERE owner_id = NEW.owner_id
  AND status IN ('active', 'inactive');

  IF subdomain_count >= 3 THEN
    RAISE EXCEPTION 'You have reached the maximum limit of 3 subdomains per account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;