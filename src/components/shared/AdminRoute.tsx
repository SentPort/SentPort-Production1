import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import SessionExpiredModal from './SessionExpiredModal';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAdmin, loading, sessionExpired, isAuthTransitioning } = useAuth();
  const navigate = useNavigate();
  const [authCheckDelay, setAuthCheckDelay] = useState(true);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [stableAuth, setStableAuth] = useState<{ userId: string | null; isAdmin: boolean } | null>(null);
  const authStabilityTimer = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  const transitionCountRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthCheckDelay(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (sessionExpired) {
      setShowSessionExpired(true);
    }
  }, [sessionExpired]);

  // Track the user ID instead of the user object to avoid object reference changes
  const currentUserId = user?.id ?? null;

  // Stabilize auth state - only update after state remains consistent for 750ms
  // BUT: Don't reset the timer if we're just transitioning (token refresh)
  useEffect(() => {
    if (authStabilityTimer.current) {
      clearTimeout(authStabilityTimer.current);
    }

    // If auth is transitioning (token refresh), don't capture potentially bad state
    if (isAuthTransitioning) {
      transitionCountRef.current += 1;
      console.log('[AdminRoute] Auth transitioning, delaying stabilization (transition #' + transitionCountRef.current + ')');
      return;
    }

    // After transition completes, wait longer before making decisions
    const stabilizationDelay = transitionCountRef.current > 0 ? 750 : 500;

    authStabilityTimer.current = setTimeout(() => {
      const newUserId = currentUserId;
      const userIdChanged = userIdRef.current !== newUserId;

      // Only update stable auth if:
      // 1. We have a valid user (userId exists), OR
      // 2. User ID actually changed from valid to null (real sign out)
      if (newUserId || (userIdChanged && userIdRef.current !== null)) {
        console.log('[AdminRoute] Stabilizing auth state:', {
          userId: newUserId,
          isAdmin,
          userIdChanged,
          transitionCount: transitionCountRef.current,
          delay: stabilizationDelay
        });
        setStableAuth({ userId: newUserId, isAdmin });
        userIdRef.current = newUserId;
        // Reset transition counter after successful stabilization
        transitionCountRef.current = 0;
      }
    }, stabilizationDelay);

    return () => {
      if (authStabilityTimer.current) {
        clearTimeout(authStabilityTimer.current);
      }
    };
  }, [currentUserId, isAdmin, isAuthTransitioning]);

  useEffect(() => {
    // Only make redirect decisions when we have stable auth data AND auth is fully loaded
    // AND we're not in the middle of a transition AND session has truly expired
    if (!loading && !authCheckDelay && !isAuthTransitioning && stableAuth !== null) {
      // Only redirect if user is null AND session is confirmed expired (not just transitioning)
      if (!stableAuth.userId && sessionExpired) {
        console.log('[AdminRoute] Session expired and no user, redirecting to sign in');
        const currentPath = window.location.pathname + window.location.search;
        navigate(`/signin?redirect=${encodeURIComponent(currentPath)}`);
      } else if (!stableAuth.userId && !sessionExpired) {
        // User is null but session not expired - might be transient, log but don't redirect yet
        console.warn('[AdminRoute] No user but session not expired, waiting for stabilization');
      } else if (stableAuth.userId && !stableAuth.isAdmin) {
        console.warn('[AdminRoute] Access denied: User is not an admin');
      }
    }
  }, [loading, stableAuth, navigate, authCheckDelay, sessionExpired, isAuthTransitioning]);

  // Show loading while auth is being checked or stabilized
  if (loading || authCheckDelay || stableAuth === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-300">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (showSessionExpired || sessionExpired) {
    return (
      <SessionExpiredModal
        isOpen={true}
        onReauthenticate={() => setShowSessionExpired(false)}
      />
    );
  }

  // Use stable auth for rendering decisions - at this point stableAuth is guaranteed to be non-null
  if (!stableAuth.userId) {
    return null;
  }

  if (!stableAuth.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border-2 border-red-500/50 rounded-xl max-w-md w-full p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-500/20 p-3 rounded-full">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              You do not have administrator privileges to access this page.
            </p>
            <p className="text-sm text-gray-400">
              If you believe this is an error, please contact support.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
