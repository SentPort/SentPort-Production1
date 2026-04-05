import { supabase } from './supabase';

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 200,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
};

/**
 * Checks if an error is a transient auth error that should be retried
 */
function isTransientAuthError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  const errorDetails = error.details || '';
  const errorHint = error.hint || '';

  // Empty error messages from HTTP 500 are likely PostgREST caching issues
  // Treat as transient to allow retry during schema updates or connection pool resets
  if (!errorMessage && !errorDetails && !errorHint && !errorCode) {
    console.warn('[databaseRetry] Empty error detected (likely PostgREST cache issue), treating as transient');
    return true;
  }

  // RLS/permission errors during token refresh
  if (errorCode === 'PGRST301') return true;

  // HTTP 500 errors are often transient (database restarts, schema updates, connection pool issues)
  if (errorCode === '500' || error.status === 500 || errorCode === 'PGRST000') {
    console.warn('[databaseRetry] HTTP 500 error detected, treating as transient');
    return true;
  }

  // Common transient auth errors
  const transientPatterns = [
    'permission',
    'rls',
    'jwt',
    'token',
    'authentication',
    'not authenticated',
    'session',
    'function does not exist',
    'connection',
    'timeout',
  ];

  return transientPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Checks if an error is a permanent session expiration
 */
export function isPermanentSessionError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';

  // Only treat these as permanent
  const permanentPatterns = [
    'refresh_token_not_found',
    'invalid refresh token',
    'refresh token expired',
    'session expired',
  ];

  return permanentPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Waits for authentication to stabilize before retrying
 */
async function waitForAuthStabilization(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 300);
  });
}

/**
 * Executes a Supabase query with automatic retry logic for transient auth errors
 */
export async function withRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // On retry attempts, wait for auth to stabilize first
      if (attempt > 0) {
        console.log(`[databaseRetry] Retry attempt ${attempt}/${opts.maxRetries}, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        await waitForAuthStabilization();
      }

      const result = await queryFn();

      // If query succeeded, return result
      if (!result.error) {
        if (attempt > 0) {
          console.log(`[databaseRetry] Query succeeded on attempt ${attempt + 1}`);
        }
        return result;
      }

      lastError = result.error;

      // Log detailed error information for debugging
      if (attempt === 0) {
        console.error('[databaseRetry] Query error details:', {
          message: result.error.message || '(empty)',
          code: result.error.code || '(none)',
          details: result.error.details || '(none)',
          hint: result.error.hint || '(none)',
          status: result.error.status || '(none)',
        });
      }

      // If it's a permanent error, don't retry
      if (isPermanentSessionError(result.error)) {
        console.error('[databaseRetry] Permanent session error, not retrying:', result.error);
        return result;
      }

      // If it's not a transient auth error, don't retry
      if (!isTransientAuthError(result.error)) {
        console.error('[databaseRetry] Non-transient error, not retrying:', result.error);
        return result;
      }

      // If this was our last attempt, return the error
      if (attempt === opts.maxRetries) {
        console.error(`[databaseRetry] Max retries (${opts.maxRetries}) reached, giving up`);
        return result;
      }

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);

    } catch (exception: any) {
      lastError = exception;

      // If it's a permanent error, don't retry
      if (isPermanentSessionError(exception)) {
        console.error('[databaseRetry] Permanent session exception, not retrying:', exception);
        return { data: null, error: exception };
      }

      // If this was our last attempt, throw
      if (attempt === opts.maxRetries) {
        console.error(`[databaseRetry] Max retries (${opts.maxRetries}) reached, giving up`);
        return { data: null, error: exception };
      }

      // Only retry transient errors
      if (!isTransientAuthError(exception)) {
        console.error('[databaseRetry] Non-transient exception, not retrying:', exception);
        return { data: null, error: exception };
      }

      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  return { data: null, error: lastError };
}

/**
 * Checks if the current session is valid and refreshes it if needed
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[databaseRetry] Session check failed:', error);
      return false;
    }

    if (!session) {
      console.warn('[databaseRetry] No active session');
      return false;
    }

    // Check if token is about to expire (within 60 seconds)
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry < 60) {
      console.log('[databaseRetry] Token expiring soon, refreshing...');
      const { data, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('[databaseRetry] Token refresh failed:', refreshError);
        return false;
      }

      if (data.session) {
        console.log('[databaseRetry] Token refreshed successfully');
        return true;
      }

      return false;
    }

    return true;
  } catch (error) {
    console.error('[databaseRetry] Exception during session check:', error);
    return false;
  }
}
