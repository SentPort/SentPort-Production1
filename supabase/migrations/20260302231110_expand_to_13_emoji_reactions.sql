/*
  # Expand Reactions to 13 Emoji-Based Reaction Types

  1. Changes
    - Updates the `reactions` table to support 13 emoji-based reaction types
    - Migrates existing reaction data to new emoji reaction types
    - Provides richer emotional expression for users

  2. New Reaction Types (13 total)
    - `love` - Love and deep affection ❤️
    - `laugh` - Funny and hilarious 😂
    - `smile` - Happy and positive 😊
    - `grateful` - Thankful and appreciative 🙏
    - `insightful` - Thought-provoking wisdom 💡
    - `curious` - Interested and wondering 🤔
    - `wow` - Amazing and surprising 😮
    - `support` - Encouragement and solidarity 💪
    - `care` - Warmth and compassion 🤗
    - `sad` - Empathy for difficult moments 😢
    - `clap` - Applause and celebration 👏
    - `fire` - Exciting and impressive 🔥
    - `eyes` - Watching with interest 👀

  3. Data Migration Strategy
    - Maps old reaction types to closest new emoji equivalents
    - Preserves all user reaction history
    - Updates constraint to enforce new reaction types

  4. Security
    - Maintains existing RLS policies
    - No changes to permissions or access control
*/

-- Step 1: Drop the old constraint first
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

-- Step 2: Migrate existing reactions to new types
DO $$
BEGIN
  -- Map old reactions to new emoji-based reactions
  UPDATE reactions SET reaction_type = 'love' WHERE reaction_type IN ('verified', 'heart');
  UPDATE reactions SET reaction_type = 'insightful' WHERE reaction_type = 'think';
  UPDATE reactions SET reaction_type = 'laugh' WHERE reaction_type = 'cheer';
  UPDATE reactions SET reaction_type = 'curious' WHERE reaction_type = 'question';
  UPDATE reactions SET reaction_type = 'fire' WHERE reaction_type = 'spark';
  -- 'support' stays as 'support'
END $$;

-- Step 3: Add new constraint with 13 emoji-based reactions
ALTER TABLE reactions
  ADD CONSTRAINT reactions_reaction_type_check
  CHECK (reaction_type IN (
    'love', 'laugh', 'smile', 'grateful', 'insightful',
    'curious', 'wow', 'support', 'care', 'sad',
    'clap', 'fire', 'eyes'
  ));
