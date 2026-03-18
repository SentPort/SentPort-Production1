/*
  # Verified External Domains System

  1. New Tables
    - `verified_external_domains`
      - `id` (uuid, primary key)
      - `domain` (text, unique, required) - The verified domain (e.g., "wikipedia.org")
      - `verified_at` (timestamptz) - When the domain was verified
      - `verified_by` (uuid) - Admin user who verified the domain
      - `notes` (text, nullable) - Optional notes about the domain

  2. Schema Updates
    - Add `is_verified_external` column to `search_index` table
      - Boolean flag to mark content from verified external domains

  3. Security
    - Enable RLS on `verified_external_domains` table
    - Admin-only write access to manage verified domains
    - Public read access for search functionality

  4. Indexes
    - Add unique index on domain for fast lookups
    - Add index on is_verified_external in search_index for search ranking

  5. Functions
    - Auto-update search_index when domains are added/removed from verified list
*/

-- Create verified_external_domains table
CREATE TABLE IF NOT EXISTS verified_external_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  verified_at timestamptz DEFAULT now(),
  verified_by uuid REFERENCES user_profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add is_verified_external column to search_index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_index' AND column_name = 'is_verified_external'
  ) THEN
    ALTER TABLE search_index ADD COLUMN is_verified_external boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verified_external_domains_domain ON verified_external_domains(domain);
CREATE INDEX IF NOT EXISTS idx_search_index_is_verified_external ON search_index(is_verified_external);

-- Enable Row Level Security
ALTER TABLE verified_external_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin-only write access
CREATE POLICY "Admin users can manage verified domains"
  ON verified_external_domains FOR ALL
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

-- Public read access for search functionality
CREATE POLICY "Anyone can view verified domains"
  ON verified_external_domains FOR SELECT
  TO public
  USING (true);

-- Function to extract domain from URL
CREATE OR REPLACE FUNCTION extract_domain(url_text text)
RETURNS text AS $$
DECLARE
  domain_result text;
BEGIN
  -- Remove protocol (http://, https://)
  domain_result := regexp_replace(url_text, '^https?://', '', 'i');
  
  -- Remove www. prefix
  domain_result := regexp_replace(domain_result, '^www\.', '', 'i');
  
  -- Extract just the domain (remove path, query, fragment)
  domain_result := regexp_replace(domain_result, '/.*$', '');
  domain_result := regexp_replace(domain_result, '\?.*$', '');
  domain_result := regexp_replace(domain_result, '#.*$', '');
  
  RETURN lower(domain_result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update search_index when verified domains change
CREATE OR REPLACE FUNCTION update_search_index_verified_status()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Mark all search_index entries with this domain as verified
    UPDATE search_index
    SET is_verified_external = true
    WHERE is_internal = false
    AND extract_domain(url) = NEW.domain;
    
  ELSIF (TG_OP = 'DELETE') THEN
    -- Unmark all search_index entries with this domain
    UPDATE search_index
    SET is_verified_external = false
    WHERE is_internal = false
    AND extract_domain(url) = OLD.domain;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search_index when verified domains change
DROP TRIGGER IF EXISTS trigger_update_verified_status ON verified_external_domains;
CREATE TRIGGER trigger_update_verified_status
  AFTER INSERT OR DELETE ON verified_external_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_search_index_verified_status();

-- Function to check and mark new search_index entries
CREATE OR REPLACE FUNCTION check_verified_domain_on_insert()
RETURNS trigger AS $$
BEGIN
  -- Only check external content
  IF NEW.is_internal = false THEN
    -- Check if the domain is in verified list
    IF EXISTS (
      SELECT 1 FROM verified_external_domains
      WHERE domain = extract_domain(NEW.url)
    ) THEN
      NEW.is_verified_external := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-check new search_index entries
DROP TRIGGER IF EXISTS trigger_check_verified_on_insert ON search_index;
CREATE TRIGGER trigger_check_verified_on_insert
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW
  EXECUTE FUNCTION check_verified_domain_on_insert();