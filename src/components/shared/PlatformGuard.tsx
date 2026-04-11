import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PlatformGuardProps {
  platform: 'hubook' | 'heddit' | 'hutube' | 'hinsta' | 'switter' | 'blog';
  children: React.ReactNode;
}

export default function PlatformGuard({ platform, children }: PlatformGuardProps) {
  const { user, isVerified, isEmailVerified, isAdmin, platformAccounts, loading, isAuthTransitioning, isPlatformAccountsLoading } = useAuth();
  const navigate = useNavigate();
  const hasVerifiedRef = useRef(false);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlatformAccountStatusRef = useRef<boolean | null>(null);

  const hasPlatformAccount = useMemo(() => platformAccounts[platform], [platformAccounts[platform]]);

  if (lastPlatformAccountStatusRef.current !== null && lastPlatformAccountStatusRef.current !== hasPlatformAccount) {
    console.log('[PlatformGuard] Platform account status changed for', platform, ':', lastPlatformAccountStatusRef.current, '->', hasPlatformAccount);
    hasVerifiedRef.current = false;
  }
  lastPlatformAccountStatusRef.current = hasPlatformAccount;

  useEffect(() => {
    if (loading || isAuthTransitioning) {
      return;
    }

    if (hasVerifiedRef.current) {
      return;
    }

    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
    }

    stabilityTimerRef.current = setTimeout(() => {
      if (!user) {
        console.log('[PlatformGuard] No user found, redirecting to signin');
        navigate(`/signin?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      if (!isEmailVerified && !isAdmin) {
        console.log('[PlatformGuard] Email not verified, redirecting to email verification');
        navigate('/email-not-verified');
        return;
      }

      if (!isVerified && !isAdmin) {
        console.log('[PlatformGuard] User not verified, redirecting to get-verified');
        navigate('/get-verified');
        return;
      }

      if (isPlatformAccountsLoading) {
        return;
      }

      if (!hasPlatformAccount) {
        console.log('[PlatformGuard] No', platform, 'account found, redirecting to join page');
        navigate(`/${platform}/join`);
        return;
      }

      console.log('[PlatformGuard]', platform, 'access granted');
      hasVerifiedRef.current = true;
    }, 500);

    return () => {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
    };
  }, [user, isVerified, isEmailVerified, isAdmin, hasPlatformAccount, platform, loading, isAuthTransitioning, isPlatformAccountsLoading, navigate]);

  if (loading || isAuthTransitioning) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || (!isEmailVerified && !isAdmin) || (!isVerified && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isPlatformAccountsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!hasPlatformAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}