/*
  # Create Heddit Community Pins Table

  ## Summary
  Replaces the global is_pinned flag on heddit_posts with a per-community pin system.
  A post can now be pinned independently in each SubHeddit community it was posted to.

  ## New Tables
  - `heddit_community_pins`
    - `id` (uuid, primary key)
    - `post_id` (uuid, FK to heddit_posts) - the post being pinned
    - `subreddit_id` (uuid, FK to heddit_subreddits) - the community it is pinned in
    - `pinned_by` (uuid, FK to auth.users) - who pinned it
    - `pinned_at` (timestamptz) - when it was pinned
    - Unique constraint on (post_id, subreddit_id) - a post can only be pinned once per community

  ## Security
  - RLS enabled
  - SELECT: any authenticated user can read pins (needed to render pinned posts in feeds)
  - INSERT/DELETE: handled via SECURITY DEFINER RPC only; direct table writes are blocked

  ## Important Notes
  1. The existing is_pinned, pinned_at, pinned_by columns on heddit_posts are left in place
     but are no longer used by the application logic going forward.
  2. The pin_heddit_post RPC function is replaced in a subsequent migration.
  3. The 5-pin limit is now enforced per community, not globally.
*/

CREATE TABLE IF NOT EXISTS heddit_community_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES heddit_posts(id) ON DELETE CASCADE,
  subreddit_id uuid NOT NULL REFERENCES heddit_subreddits(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT heddit_community_pins_unique UNIQUE (post_id, subreddit_id)
);

CREATE INDEX IF NOT EXISTS idx_heddit_community_pins_subreddit
  ON heddit_community_pins(subreddit_id, pinned_at DESC);

CREATE INDEX IF NOT EXISTS idx_heddit_community_pins_post
  ON heddit_community_pins(post_id);

ALTER TABLE heddit_community_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view community pins"
  ON heddit_community_pins
  FOR SELECT
  TO authenticated
  USING (true);
