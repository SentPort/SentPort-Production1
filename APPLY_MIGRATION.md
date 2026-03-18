# How to Apply the Blog Comment Metrics Migration

The migration is ready in `migration-to-apply.sql` but needs to be applied with elevated privileges.

## Quick Steps (Recommended)

1. **Open your Supabase Dashboard**
   - Go to: https://uvlpxcbgakmmmmntayko.supabase.co
   - Log in to your account

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Copy and Paste the Migration**
   - Open `migration-to-apply.sql` from this project
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Cmd/Ctrl + Enter)
   - You should see "Success. No rows returned"

5. **Verify It Worked**
   - Try adding a comment to a blog post
   - The blog wheel should now show the updated count immediately!

## What This Migration Does

- ✅ Creates a database trigger function that automatically recalculates blog metrics
- ✅ Updates comment counts in real-time when comments are added or deleted
- ✅ Ensures the blog wheel always displays accurate comment counts
- ✅ Works seamlessly with the existing real-time subscription in BlogFeed.tsx

## Testing After Migration

1. Go to a blog post that has 0 comments showing in the wheel
2. Add a comment
3. Navigate back to the feed
4. The blog wheel should now show "1" for the comment count
5. Delete the comment
6. The count should update back to "0"

## Need Help?

If you encounter any errors:
1. Check that you're logged in to the correct Supabase project
2. Make sure you're using the SQL Editor (not the Table Editor)
3. Copy the exact error message and I can help troubleshoot
