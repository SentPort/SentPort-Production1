/*
  # Website Builder System - Visual Editor with Custom Code Support

  ## Overview
  This migration creates the complete database schema for a Wix/Squarespace-style visual
  website builder that supports drag-and-drop components and custom HTML/CSS/JS code blocks.

  ## 1. New Tables

  ### `website_builder_themes`
  Global styling and theme settings for each subdomain
  - `id` (uuid, primary key)
  - `subdomain_id` (uuid, references subdomains)
  - `theme_name` (text) - Name of the theme
  - `primary_color` (text) - Hex color code
  - `secondary_color` (text) - Hex color code
  - `accent_color` (text) - Hex color code
  - `font_family_heading` (text) - Font for headings
  - `font_family_body` (text) - Font for body text
  - `custom_css` (text) - User-provided CSS
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `website_builder_assets`
  Uploaded media files (images, videos, documents)
  - `id` (uuid, primary key)
  - `subdomain_id` (uuid, references subdomains)
  - `file_name` (text) - Original file name
  - `file_type` (text) - MIME type
  - `file_size` (integer) - Size in bytes
  - `storage_path` (text) - Path in Supabase Storage
  - `public_url` (text) - Public URL to access file
  - `thumbnail_url` (text, nullable) - Thumbnail for images/videos
  - `uploaded_by` (uuid, references user_profiles)
  - `created_at` (timestamptz)

  ### `website_builder_page_content`
  Stores the visual design of each page as JSON
  - `id` (uuid, primary key)
  - `page_id` (uuid, references subdomain_pages)
  - `version` (text) - 'draft' or 'published'
  - `components` (jsonb) - Array of component objects with positions and properties
  - `seo_title` (text, nullable) - SEO page title
  - `seo_description` (text, nullable) - SEO meta description
  - `seo_keywords` (text, nullable) - SEO keywords
  - `custom_head_code` (text, nullable) - Custom HTML for <head>
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `website_builder_component_library`
  Pre-built component templates users can drag onto pages
  - `id` (uuid, primary key)
  - `component_type` (text) - Type: header, hero, text, image, gallery, form, custom_code, etc.
  - `component_name` (text) - Display name
  - `category` (text) - Category: layout, content, navigation, forms
  - `is_system` (boolean) - System component vs user-saved component
  - `owner_id` (uuid, nullable, references user_profiles) - Null for system components
  - `template_data` (jsonb) - Default component structure and properties
  - `preview_image_url` (text, nullable) - Preview thumbnail
  - `created_at` (timestamptz)

  ## 2. Enhanced Tables

  ### Updates to `subdomain_pages`
  - Add `has_unpublished_changes` (boolean)
  - Add `is_homepage` (boolean)

  ## 3. Security
  - Enable RLS on all new tables
  - Users can only access their own subdomain's builder data
  - Admins can view all builder data
  - System components are readable by all authenticated users
  - Custom components only accessible by owner

  ## 4. Indexes
  - Performance indexes for page content lookups
  - Indexes for asset queries by subdomain
  - Indexes for component library filtering

  ## 5. Functions
  - Function to enforce 3-subdomain limit per user
  - Function to track unpublished changes
  - Function to auto-create default theme on subdomain creation
*/

-- Create website_builder_themes table
CREATE TABLE IF NOT EXISTS website_builder_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain_id uuid NOT NULL REFERENCES subdomains(id) ON DELETE CASCADE UNIQUE,
  theme_name text DEFAULT 'Default Theme',
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#1e40af',
  accent_color text DEFAULT '#f59e0b',
  font_family_heading text DEFAULT 'Inter, sans-serif',
  font_family_body text DEFAULT 'Inter, sans-serif',
  custom_css text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE website_builder_themes ENABLE ROW LEVEL SECURITY;

-- Create website_builder_assets table
CREATE TABLE IF NOT EXISTS website_builder_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain_id uuid NOT NULL REFERENCES subdomains(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  thumbnail_url text,
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_builder_assets ENABLE ROW LEVEL SECURITY;

-- Create website_builder_page_content table
CREATE TABLE IF NOT EXISTS website_builder_page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES subdomain_pages(id) ON DELETE CASCADE,
  version text NOT NULL CHECK (version IN ('draft', 'published')),
  components jsonb DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  seo_keywords text,
  custom_head_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_page_version UNIQUE (page_id, version)
);

ALTER TABLE website_builder_page_content ENABLE ROW LEVEL SECURITY;

-- Create website_builder_component_library table
CREATE TABLE IF NOT EXISTS website_builder_component_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type text NOT NULL,
  component_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('layout', 'content', 'navigation', 'forms', 'custom')),
  is_system boolean DEFAULT false,
  owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_data jsonb NOT NULL,
  preview_image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_builder_component_library ENABLE ROW LEVEL SECURITY;

-- Add new columns to subdomain_pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subdomain_pages' AND column_name = 'has_unpublished_changes'
  ) THEN
    ALTER TABLE subdomain_pages ADD COLUMN has_unpublished_changes boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subdomain_pages' AND column_name = 'is_homepage'
  ) THEN
    ALTER TABLE subdomain_pages ADD COLUMN is_homepage boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_builder_themes_subdomain ON website_builder_themes(subdomain_id);
CREATE INDEX IF NOT EXISTS idx_builder_assets_subdomain ON website_builder_assets(subdomain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_page_content_page ON website_builder_page_content(page_id, version);
CREATE INDEX IF NOT EXISTS idx_builder_components_category ON website_builder_component_library(category) WHERE is_system = true;
CREATE INDEX IF NOT EXISTS idx_builder_components_owner ON website_builder_component_library(owner_id) WHERE is_system = false;

-- RLS Policies for website_builder_themes
CREATE POLICY "Users can view their subdomain themes"
  ON website_builder_themes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subdomains
      WHERE subdomains.id = subdomain_id
      AND subdomains.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their subdomain themes"
  ON website_builder_themes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subdomains
      WHERE subdomains.id = subdomain_id
      AND subdomains.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their subdomain themes"
  ON website_builder_themes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subdomains
      WHERE subdomains.id = subdomain_id
      AND subdomains.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all themes"
  ON website_builder_themes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- RLS Policies for website_builder_assets
CREATE POLICY "Users can view their subdomain assets"
  ON website_builder_assets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subdomains
      WHERE subdomains.id = subdomain_id
      AND subdomains.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assets to their subdomains"
  ON website_builder_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subdomains
      WHERE subdomains.id = subdomain_id
      AND subdomains.owner_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete their subdomain assets"
  ON website_builder_assets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subdomains
      WHERE subdomains.id = subdomain_id
      AND subdomains.owner_id = auth.uid()
    )
  );

-- RLS Policies for website_builder_page_content
CREATE POLICY "Users can view their page content"
  ON website_builder_page_content
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subdomain_pages sp
      JOIN subdomains s ON s.id = sp.subdomain_id
      WHERE sp.id = page_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their page content"
  ON website_builder_page_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subdomain_pages sp
      JOIN subdomains s ON s.id = sp.subdomain_id
      WHERE sp.id = page_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their page content"
  ON website_builder_page_content
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subdomain_pages sp
      JOIN subdomains s ON s.id = sp.subdomain_id
      WHERE sp.id = page_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can view published page content"
  ON website_builder_page_content
  FOR SELECT
  TO anon
  USING (version = 'published');

-- RLS Policies for website_builder_component_library
CREATE POLICY "Anyone can view system components"
  ON website_builder_component_library
  FOR SELECT
  TO authenticated
  USING (is_system = true);

CREATE POLICY "Users can view their custom components"
  ON website_builder_component_library
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert custom components"
  ON website_builder_component_library
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND is_system = false
  );

CREATE POLICY "Users can delete their custom components"
  ON website_builder_component_library
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Function to check subdomain limit per user
CREATE OR REPLACE FUNCTION check_subdomain_limit()
RETURNS TRIGGER AS $$
DECLARE
  subdomain_count integer;
BEGIN
  SELECT COUNT(*) INTO subdomain_count
  FROM subdomains
  WHERE owner_id = NEW.owner_id
  AND status = 'active';

  IF subdomain_count >= 3 THEN
    RAISE EXCEPTION 'You have reached the maximum limit of 3 subdomains per account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subdomain limit
DROP TRIGGER IF EXISTS enforce_subdomain_limit ON subdomains;
CREATE TRIGGER enforce_subdomain_limit
  BEFORE INSERT ON subdomains
  FOR EACH ROW
  EXECUTE FUNCTION check_subdomain_limit();

-- Function to auto-create default theme when subdomain is created
CREATE OR REPLACE FUNCTION create_default_theme_for_subdomain()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO website_builder_themes (subdomain_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-creating theme
DROP TRIGGER IF EXISTS auto_create_theme ON subdomains;
CREATE TRIGGER auto_create_theme
  AFTER INSERT ON subdomains
  FOR EACH ROW
  EXECUTE FUNCTION create_default_theme_for_subdomain();

-- Function to track unpublished changes
CREATE OR REPLACE FUNCTION track_draft_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version = 'draft' THEN
    UPDATE subdomain_pages
    SET has_unpublished_changes = true,
        updated_at = now()
    WHERE id = NEW.page_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking draft changes
DROP TRIGGER IF EXISTS track_page_draft_changes ON website_builder_page_content;
CREATE TRIGGER track_page_draft_changes
  AFTER UPDATE ON website_builder_page_content
  FOR EACH ROW
  EXECUTE FUNCTION track_draft_changes();

-- Insert system component templates
INSERT INTO website_builder_component_library (component_type, component_name, category, is_system, template_data) VALUES
  ('section', 'Blank Section', 'layout', true, '{"type": "section", "styles": {"padding": "4rem 1rem", "backgroundColor": "#ffffff"}, "children": []}'),
  ('container', 'Container', 'layout', true, '{"type": "container", "styles": {"maxWidth": "1200px", "margin": "0 auto"}, "children": []}'),
  ('columns', 'Two Columns', 'layout', true, '{"type": "columns", "columns": 2, "styles": {"gap": "2rem"}, "children": []}'),
  ('grid', '3-Column Grid', 'layout', true, '{"type": "grid", "columns": 3, "styles": {"gap": "2rem"}, "children": []}'),
  ('heading', 'Heading', 'content', true, '{"type": "heading", "level": 1, "text": "Your Heading Here", "styles": {"fontSize": "3rem", "fontWeight": "bold", "color": "#000000"}}'),
  ('text', 'Text Block', 'content', true, '{"type": "text", "content": "<p>Your text content here</p>", "styles": {"fontSize": "1rem", "lineHeight": "1.6"}}'),
  ('image', 'Image', 'content', true, '{"type": "image", "src": "", "alt": "Image description", "styles": {"width": "100%", "height": "auto"}}'),
  ('video', 'Video', 'content', true, '{"type": "video", "src": "", "styles": {"width": "100%", "aspectRatio": "16/9"}}'),
  ('button', 'Button', 'content', true, '{"type": "button", "text": "Click Me", "url": "#", "styles": {"padding": "0.75rem 1.5rem", "backgroundColor": "#3b82f6", "color": "#ffffff", "borderRadius": "0.5rem"}}'),
  ('spacer', 'Spacer', 'content', true, '{"type": "spacer", "height": "2rem"}'),
  ('navbar', 'Navigation Bar', 'navigation', true, '{"type": "navbar", "brand": "Site Name", "links": [{"text": "Home", "url": "/"}, {"text": "About", "url": "/about"}], "styles": {"backgroundColor": "#ffffff", "padding": "1rem"}}'),
  ('footer', 'Footer', 'navigation', true, '{"type": "footer", "content": "© 2026 Your Site. All rights reserved.", "styles": {"backgroundColor": "#1f2937", "color": "#ffffff", "padding": "2rem", "textAlign": "center"}}'),
  ('form', 'Contact Form', 'forms', true, '{"type": "form", "fields": [{"type": "text", "label": "Name", "required": true}, {"type": "email", "label": "Email", "required": true}, {"type": "textarea", "label": "Message", "required": true}], "submitText": "Send Message"}'),
  ('input', 'Input Field', 'forms', true, '{"type": "input", "inputType": "text", "label": "Label", "placeholder": "Enter text"}'),
  ('custom_code', 'Custom HTML/CSS/JS', 'custom', true, '{"type": "custom_code", "html": "", "css": "", "javascript": ""}')
ON CONFLICT DO NOTHING;
