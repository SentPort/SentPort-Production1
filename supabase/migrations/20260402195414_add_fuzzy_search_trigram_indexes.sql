/*
  # Add Fuzzy Search Support with Trigram Indexes

  1. Changes
    - Add GIN trigram indexes on search_index table for fuzzy matching
    - Indexes on title, description, and content_snippet columns
    - Enables typo-tolerant searches using PostgreSQL trigram similarity

  2. Performance
    - GIN indexes allow fast similarity searches
    - Supports queries like "adma smith" finding "Adam Smith"
    - Works efficiently even with large datasets

  3. Notes
    - Requires pg_trgm extension (already enabled in custom_tags_system migration)
    - Similarity threshold can be adjusted per query
    - Does not affect existing indexes or queries
*/

-- Create trigram indexes for fuzzy search on key searchable fields
CREATE INDEX IF NOT EXISTS idx_search_index_title_trgm 
  ON search_index USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_index_description_trgm 
  ON search_index USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_index_content_snippet_trgm 
  ON search_index USING gin (content_snippet gin_trgm_ops);
