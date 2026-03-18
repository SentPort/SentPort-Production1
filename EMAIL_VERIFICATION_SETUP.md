# Email Verification Setup Guide

## Overview

Email verification has been implemented as the first authentication gate. Users must verify their email address before they can access any platform features. The authentication flow is now:

1. **Sign Up** → Email sent
2. **Email Verification** → Click link in email
3. **Sign In** → Allowed after email verified
4. **Human Verification** → Get verified via Didit
5. **Platform Access** → Full access granted

## Supabase Configuration Required

To enable email verification, you need to configure Supabase:

### 1. Enable Email Confirmation

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Toggle ON: **Confirm email**
4. Save changes

### 2. Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Customize the email content (optional):
   - Subject: "Verify Your SentPort Email"
   - Update body to match your branding
4. Save template

### 3. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain (e.g., `https://yourdomain.com`)
3. Add **Redirect URLs**:
   - For production: `https://yourdomain.com/auth/callback`
   - For local dev: `http://localhost:5173/auth/callback`
4. Save configuration

### 4. Email Rate Limiting (Optional)

1. Go to **Authentication** → **Settings**
2. Set rate limits for email sending to prevent abuse
3. Recommended: 3-5 emails per hour per email address

## Implementation Details

### Files Modified

1. **src/contexts/AuthContext.tsx**
   - Added `isEmailVerified` property to track email confirmation status
   - Checks `user.email_confirmed_at` from Supabase auth

2. **src/pages/SignUp.tsx**
   - Shows "Check Your Email" screen after signup instead of auto-login
   - Provides "Resend Verification Email" functionality
   - 60-second cooldown between resend attempts

3. **src/pages/SignIn.tsx**
   - Detects "Email not confirmed" errors from Supabase
   - Shows custom email verification reminder
   - Allows resending verification email directly from sign-in page

4. **src/components/shared/PlatformGuard.tsx**
   - Added email verification check before human verification
   - Redirects to `/email-not-verified` if email not verified

5. **src/pages/hubook/HuBookRouter.tsx**
   - Added email verification check for HuBook platform
   - Follows same pattern for all platform routers

### Files Created

1. **src/pages/EmailVerificationCallback.tsx**
   - Handles the verification link clicked in email
   - Shows success/error states
   - Auto-redirects to sign-in after successful verification

2. **src/pages/EmailNotVerified.tsx**
   - Displayed when logged-in user tries to access platform without verified email
   - Provides resend email functionality
   - Real-time detection of email verification completion
   - Sign out option

### Routes Added

- `/auth/callback` - Email verification callback handler
- `/email-not-verified` - Email verification required page

## User Flow

### New User Signup

1. User fills signup form
2. Submits form
3. Sees "Check Your Email" screen with their email address
4. Receives verification email (usually within 1-2 minutes)
5. Clicks verification link in email
6. Redirected to `/auth/callback` for verification
7. After successful verification, redirected to sign-in page
8. Can now sign in successfully

### Returning User (Unverified Email)

1. User tries to sign in with unverified email
2. Sign-in blocked with custom error message
3. Error shows email address and "Resend Verification Email" button
4. User can resend email directly from sign-in page
5. After verifying, user can sign in

### Logged-In User (Unverified Email)

If somehow a user gets logged in without verified email:

1. Any platform access attempt redirects to `/email-not-verified`
2. Page explains email verification is required
3. Provides resend functionality
4. Real-time detection - auto-refreshes when email verified
5. Can sign out to try different account

## Testing the Flow

### Test Scenario 1: New Signup

1. Go to `/signup`
2. Enter a test email and password
3. Submit form
4. Verify you see "Check Your Email" screen
5. Check email inbox for verification link
6. Click verification link
7. Verify redirect to sign-in with success message
8. Sign in successfully

### Test Scenario 2: Unverified Sign-In Attempt

1. Sign up with new account but DON'T verify email
2. Go to `/signin`
3. Try to sign in with unverified email
4. Verify you see email verification error
5. Click "Resend Verification Email"
6. Check for cooldown timer (60 seconds)
7. Verify email arrives

### Test Scenario 3: Platform Access Block

1. Sign in with unverified email (if possible through direct DB manipulation)
2. Try to access `/hubook` or any platform
3. Verify redirect to `/email-not-verified`
4. Test resend email functionality
5. Verify sign out button works

### Test Scenario 4: Email Verification Callback

1. Click verification link in email
2. Verify `/auth/callback` page loads
3. Check for success message and countdown
4. Verify auto-redirect to sign-in page (3 seconds)
5. Test manual "Continue to Sign In" button

### Test Scenario 5: Resend Cooldown

1. Request verification email
2. Immediately try to resend
3. Verify cooldown timer shows (60 seconds)
4. Verify button is disabled during cooldown
5. After cooldown, verify button becomes active

## Admin Bypass

Admins bypass email verification checks:

- `isAdmin` users can access all platforms without email verification
- Useful for testing and admin account management
- Email verification still recommended for admin accounts

## Error Handling

### Expired Verification Links

- Links expire after 24 hours (Supabase default)
- Error page explains link expired
- Provides option to request new verification email

### Already Verified

- If user clicks verification link after already verified
- Shows appropriate message
- Redirects to sign-in

### Network Errors

- Proper error messages for network failures
- Retry functionality available
- User can request new verification email

## Security Considerations

1. **Rate Limiting**: Supabase handles email send rate limiting
2. **Token Expiration**: Verification links expire after 24 hours
3. **One-Time Use**: Verification tokens can only be used once
4. **Secure Links**: Tokens are cryptographically secure
5. **HTTPS Required**: Email links should use HTTPS in production

## Support and Troubleshooting

### User Can't Find Email

1. Check spam/junk folder
2. Wait 2-3 minutes for delivery
3. Verify email address was entered correctly
4. Use "Resend Verification Email" button
5. Contact support if still not received

### Verification Link Not Working

1. Check if link expired (24 hours)
2. Ensure entire link is copied (no truncation)
3. Try requesting new verification email
4. Clear browser cache and try again

### Still Getting "Email Not Verified" After Verifying

1. Sign out completely
2. Clear browser cache
3. Sign in again
4. Check Supabase dashboard to confirm `email_confirmed_at` is set

## Future Enhancements

Potential improvements for email verification:

1. Custom email templates with better branding
2. Shorter link expiration time (e.g., 1 hour)
3. Email verification progress indicator
4. Multiple resend attempt tracking
5. Admin panel to manually verify emails if needed
6. Email verification analytics dashboard
