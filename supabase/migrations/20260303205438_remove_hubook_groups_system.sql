/*
  # Remove HuBook Groups System

  1. Tables Dropped
    - `hubook_group_posts` - Posts shared to groups
    - `hubook_group_members` - Group membership records
    - `hubook_groups` - Group information and settings

  2. Changes
    - Drops all group-related tables
    - Drops all associated triggers
    - Drops all associated functions
    - Removes all RLS policies for groups

  3. Notes
    - This migration completely removes the Groups feature from HuBook
    - All group data will be permanently deleted
    - Posts that were shared to groups will remain in the main posts table
*/

-- Drop group posts table and related objects
DROP TABLE IF EXISTS hubook_group_posts CASCADE;

-- Drop group members table and related objects
DROP TABLE IF EXISTS hubook_group_members CASCADE;

-- Drop groups table and related objects
DROP TABLE IF EXISTS hubook_groups CASCADE;

-- Drop any related functions if they exist
DROP FUNCTION IF EXISTS add_creator_as_admin() CASCADE;
DROP FUNCTION IF EXISTS handle_new_group_creation() CASCADE;
