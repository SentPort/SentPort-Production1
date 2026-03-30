# Language Backfill Bypass Setup

## Setup Instructions

The code has been updated to support an admin bypass for the language backfill edge function. To complete the setup, you need to add one secret to your Supabase Edge Functions.

### Add the Bypass Secret

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/uvlpxcbgakmmmmntayko
2. Navigate to **Edge Functions** → **backfill-language-detection**
3. Click on **Secrets** or **Environment Variables**
4. Add a new secret:
   - **Name**: `ADMIN_BYPASS_KEY`
   - **Value**: `a8f7c2e9-4d5b-4a1c-9f3e-7b6d8c2a1e4f`

### How It Works

The bypass system allows the backfill to run without requiring a valid session token:

1. The Edge Function checks for two special headers:
   - `X-Admin-Bypass-Key`: Must match the secret value
   - `X-Admin-User-ID`: Must match your user ID (7a8fc53d-ce80-4964-8544-4614d7c0e975)

2. If both headers are present and valid, authentication is bypassed
3. Otherwise, normal session-based authentication is used

### Testing the Bypass

After adding the secret:

1. Go to the Admin Dashboard → Language Backfill section
2. Click "Start Backfill"
3. The backfill should now work without session expiration issues

### Cleanup After Backfill Completes

Once the backfill is finished, you can remove the bypass functionality:

#### 1. Remove the secret from Supabase
- Delete the `ADMIN_BYPASS_KEY` secret from the Edge Function

#### 2. Remove from code
In `/supabase/functions/backfill-language-detection/index.ts`:
- Remove line 9: `const ADMIN_USER_ID = '7a8fc53d-ce80-4964-8544-4614d7c0e975';`
- Remove `X-Admin-Bypass-Key, X-Admin-User-ID` from corsHeaders (line 7)
- Remove lines 48-51 (the bypass check block)
- Keep only the normal authentication flow (lines 53-104)

In `src/components/admin/LanguageBackfillSection.tsx`:
- Revert the `callBackfillFunction` method to use only session-based auth
- Remove the bypass key and user ID handling

In `.env`:
- Remove `VITE_ADMIN_BYPASS_KEY` and `VITE_ADMIN_USER_ID` lines

#### 3. Redeploy the Edge Function
After removing the bypass code, redeploy the function to clean it up completely.

---

**Note**: This bypass is hardcoded to only work with your specific user ID for security purposes.
