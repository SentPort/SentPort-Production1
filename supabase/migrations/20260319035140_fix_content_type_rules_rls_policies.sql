/*
  # Fix Content Type Rules RLS Policies

  ## Problem
  Multiple "ALL" command policies exist on content_type_domain_rules.
  By default, RLS requires ALL policies to pass (AND logic).
  - "Admins can manage" checks auth.uid() = admin user
  - "Allow function operations" checks created_by = admin user
  
  Inside SECURITY DEFINER functions, auth.uid() is NULL, so the first policy always fails.
  This blocks the function even though the second policy would pass.

  ## Solution
  Drop the auth.uid() based policy and keep only the created_by based policy.
  This allows the function to work while still ensuring only admins can add rules.
*/

-- Drop the restrictive policy that checks auth.uid()
DROP POLICY IF EXISTS "Admins can manage content type rules" ON content_type_domain_rules;

-- Keep the policy that checks created_by (works inside SECURITY DEFINER functions)
-- This policy already exists from the previous migration
