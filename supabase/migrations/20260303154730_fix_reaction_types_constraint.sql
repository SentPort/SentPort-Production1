/*
  # Fix Reaction Types Constraint

  1. Changes
    - Drop the old reaction_type check constraint that only allowed 'like', 'love', 'dislike', 'haha', 'wow', 'sad', 'angry'
    - Add new constraint that includes all current frontend reaction types: 'like', 'love', 'laugh', 'wow', 'sad', 'angry', 'care'
    - This ensures the frontend ReactionPicker types match what the database accepts

  2. Security
    - Maintains data integrity by validating reaction_type values
    - No changes to RLS policies needed
*/

-- Drop the old constraint
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

-- Add new constraint with all current reaction types
ALTER TABLE reactions ADD CONSTRAINT reactions_reaction_type_check 
  CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'care'));
