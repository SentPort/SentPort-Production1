/*
  # Update Reactions to SentPort Custom Reaction Types

  1. Changes
    - Updates the `reactions` table to support new SentPort-branded reaction types
    - Migrates existing reaction data to new custom reaction types
    - Replaces generic social media reactions with authentic human connection reactions
  
  2. New Reaction Types
    - `verified` - Affirms authentic, trustworthy content from real humans (replaces 'like')
    - `heart` - Genuine emotional connection and appreciation (replaces 'love')
    - `think` - Thoughtful, insightful content that makes you think (replaces 'wow')
    - `cheer` - Joyful, uplifting, celebratory content (replaces 'haha')
    - `support` - Empathy, solidarity, human compassion (replaces 'sad')
    - `question` - Constructive skepticism, needs clarification (replaces 'dislike')
    - `spark` - Inspiring breakthrough moment or powerful truth (replaces 'angry')
  
  3. Data Migration Strategy
    - Maps old reaction types to new SentPort reactions
    - Preserves all user reaction history with updated types
    - Updates constraint to enforce new reaction types
  
  4. Security
    - Maintains existing RLS policies
    - No changes to permissions or access control
*/

-- Step 1: Create temporary migration mapping for existing reactions
DO $$
BEGIN
  -- Update existing reactions to new types
  UPDATE reactions SET reaction_type = 'verified' WHERE reaction_type = 'like';
  UPDATE reactions SET reaction_type = 'heart' WHERE reaction_type = 'love';
  UPDATE reactions SET reaction_type = 'think' WHERE reaction_type = 'wow';
  UPDATE reactions SET reaction_type = 'cheer' WHERE reaction_type = 'haha';
  UPDATE reactions SET reaction_type = 'support' WHERE reaction_type = 'sad';
  UPDATE reactions SET reaction_type = 'question' WHERE reaction_type = 'dislike';
  UPDATE reactions SET reaction_type = 'spark' WHERE reaction_type = 'angry';
END $$;

-- Step 2: Drop the old constraint
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

-- Step 3: Add new constraint with SentPort custom reactions
ALTER TABLE reactions 
  ADD CONSTRAINT reactions_reaction_type_check 
  CHECK (reaction_type IN ('verified', 'heart', 'think', 'cheer', 'support', 'question', 'spark'));