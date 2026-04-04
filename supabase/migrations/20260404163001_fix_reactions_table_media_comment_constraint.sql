/*
  # Fix Reactions Table to Support Media Comments

  ## Summary
  This migration fixes the reactions table CHECK constraint to allow 'media_comment' 
  as a valid target_type, enabling reactions on album media comments.

  ## Changes Made
  1. Drop the existing target_type CHECK constraint
  2. Recreate it with 'media_comment' added to the allowed values
  3. Update reaction_type constraint to include all 15 custom reaction types used in HuBook

  ## Target Types Supported
  - post: Reactions on posts
  - comment: Reactions on post comments
  - media_comment: Reactions on album media comments (NEW)

  ## Reaction Types Supported
  All 15 custom HuBook reactions:
  - like, love, laugh, smile, grateful, insightful, curious, wow, support, care, sad, angry, clap, fire, eyes

  ## Why This Fix Is Needed
  - MediaComment component was attempting to insert reactions with target_type='media_comment'
  - The old constraint only allowed 'post' and 'comment', causing database rejections
  - This prevented users from reacting to media comments entirely
*/

-- Drop the old target_type constraint
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_target_type_check;

-- Add new target_type constraint with media_comment included
ALTER TABLE reactions ADD CONSTRAINT reactions_target_type_check 
  CHECK (target_type IN ('post', 'comment', 'media_comment'));

-- Drop the old reaction_type constraint
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

-- Add new reaction_type constraint with all 15 HuBook reactions
ALTER TABLE reactions ADD CONSTRAINT reactions_reaction_type_check 
  CHECK (reaction_type IN (
    'like', 'love', 'laugh', 'smile', 'grateful', 'insightful', 
    'curious', 'wow', 'support', 'care', 'sad', 'angry', 'clap', 'fire', 'eyes'
  ));
