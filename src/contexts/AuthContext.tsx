import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  is_verified: boolean;
  is_admin: boolean;
  subdomain: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  phone_number?: string | null;
  phone_verified?: boolean;
  last_password_change?: string | null;
}

interface PlatformAccounts {
  hubook: boolean;
  heddit: boolean;
  hutube: boolean;
  hinsta: boolean;
  switter: boolean;
  blog: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  isEmailVerified: boolean;
  platformAccounts: PlatformAccounts;
  isPlatformAccountsLoading: boolean;
  refreshProfile: () => Promise<void>;
  refreshPlatformAccounts: (force?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  sessionExpired: boolean;
  isRefreshingSession: boolean;
  adminModeEnabled: boolean;
  toggleAdminMode: () => void;
  isAuthTransitioning: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  isVerified: false,
  isEmailVerified: false,
  platformAccounts: {
    hubook: false,
    heddit: false,
    hutube: false,
    hinsta: false,
    switter: false,
    blog: false,
  },
  isPlatformAccountsLoading: false,
  refreshProfile: async () => {},
  refreshPlatformAccounts: async () => {},
  signOut: async () => {},
  sessionExpired: false,
  isRefreshingSession: false,
  adminModeEnabled: true,
  toggleAdminMode: () => {},
  isAuthTransitioning: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(true);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccounts>({
    hubook: false,
    heddit: false,
    hutube: false,
    hinsta: false,
    switter: false,
    blog: false,
  });
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
  const [isPlatformAccountsLoading, setIsPlatformAccountsLoading] = useState(false);

  const stableAdminRef = useRef<boolean>(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const platformFetchAbortControllerRef = useRef<AbortController | null>(null);
  const lastPlatformFetchRef = useRef<number>(0);
  const isFetchingPlatformAccountsRef = useRef(false);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const isAuthInitializedRef = useRef(false);
  const hasCompletedInitialLoadRef = useRef(false);

  const fetchUserProfile = async (userId: string, retainOnError = false) => {
    console.log('[AuthContext] fetchUserProfile called with userId:', userId, 'retainOnError:', retainOnError);
    setIsAuthTransitioning(true);

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    if (!userId) {
      console.error('[AuthContext] Cannot fetch profile: userId is null or undefined');
      setIsAuthTransitioning(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Profile fetch error:', error);
        // If it's an RLS/permission error and we want to retain state, just log and return
        if (retainOnError && (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS'))) {
          console.warn('Profile fetch failed (RLS/permission error), retaining current state:', error);
          transitionTimerRef.current = setTimeout(() => {
            setIsAuthTransitioning(false);
          }, 300);
          return;
        }
        throw error;
      }

      console.log('[AuthContext] Profile loaded successfully:', { userId, profileData: data, isAdmin: data?.is_admin, isVerified: data?.is_verified });

      if (data && data.account_status === 'pending_deletion') {
        console.log('Account pending deletion detected, attempting restoration...');

        try {
          const { data: restoreResult, error: restoreError } = await supabase.rpc('cancel_account_deletion', {
            target_user_id: userId,
          });

          if (restoreError) {
            console.error('Error restoring account:', restoreError);
          } else if (restoreResult?.admin_removed) {
            console.log('Account was removed by admin, blocking sign-in...');
            await supabase.auth.signOut();
            alert('Your account was removed by an administrator. You cannot sign in until an admin restores your account. Please contact support to appeal.');
            setUserProfile(null);
            return;
          } else if (restoreResult?.success) {
            console.log('Account restored successfully:', restoreResult.message);

            const { data: updatedProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            if (!profileError && updatedProfile) {
              setUserProfile(updatedProfile);
              return;
            }
          }
        } catch (restoreErr) {
          console.error('Unexpected error during account restoration:', restoreErr);
        }
      }

      setUserProfile(data);

      if (data?.is_admin) {
        stableAdminRef.current = true;
      }

      transitionTimerRef.current = setTimeout(() => {
        setIsAuthTransitioning(false);
      }, 300);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      // ALWAYS retain profile on errors to prevent flickering
      if (retainOnError) {
        console.warn('[AuthContext] Retaining profile despite error');
        transitionTimerRef.current = setTimeout(() => {
          setIsAuthTransitioning(false);
        }, 300);
        return;
      }
      // Only clear profile if it's a genuine auth error, not RLS/permission issues
      if (!error.code || error.code !== 'PGRST301') {
        setUserProfile(null);
        stableAdminRef.current = false;
      }
      transitionTimerRef.current = setTimeout(() => {
        setIsAuthTransitioning(false);
      }, 300);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const fetchPlatformAccounts = async (userId: string, force = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastPlatformFetchRef.current;

    if (isFetchingPlatformAccountsRef.current) {
      console.log('[AuthContext] Platform fetch already in progress, skipping');
      return;
    }

    if (!force && timeSinceLastFetch < 5000) {
      console.log('[AuthContext] Platform fetch debounced (last fetch was', timeSinceLastFetch, 'ms ago)');
      return;
    }

    console.log('[AuthContext] Fetching platform accounts for user:', userId, 'force:', force);

    if (platformFetchAbortControllerRef.current) {
      platformFetchAbortControllerRef.current.abort();
    }

    platformFetchAbortControllerRef.current = new AbortController();
    isFetchingPlatformAccountsRef.current = true;
    setIsPlatformAccountsLoading(true);
    lastPlatformFetchRef.current = now;

    try {
      const [hubookData, hedditData, hutubeData, hinstaData, switterData, blogData] = await Promise.all([
        supabase.from('hubook_profiles').select('id').eq('id', userId).maybeSingle(),
        supabase.from('heddit_accounts').select('id').eq('user_id', userId).maybeSingle(),
        supabase.from('hutube_channels').select('id').eq('user_id', userId).maybeSingle(),
        supabase.from('hinsta_accounts').select('id').eq('user_id', userId).maybeSingle(),
        supabase.from('switter_accounts').select('id').eq('user_id', userId).maybeSingle(),
        supabase.from('blog_accounts').select('id').eq('id', userId).maybeSingle(),
      ]);

      if (platformFetchAbortControllerRef.current?.signal.aborted) {
        console.log('[AuthContext] Platform fetch was aborted');
        return;
      }

      const newAccounts = {
        hubook: !!hubookData.data,
        heddit: !!hedditData.data,
        hutube: !!hutubeData.data,
        hinsta: !!hinstaData.data,
        switter: !!switterData.data,
        blog: !!blogData.data,
      };

      setPlatformAccounts(prev => {
        const hasChanged =
          prev.hubook !== newAccounts.hubook ||
          prev.heddit !== newAccounts.heddit ||
          prev.hutube !== newAccounts.hutube ||
          prev.hinsta !== newAccounts.hinsta ||
          prev.switter !== newAccounts.switter ||
          prev.blog !== newAccounts.blog;

        if (!hasChanged) {
          console.log('[AuthContext] Platform accounts unchanged, not updating state');
          return prev;
        }

        console.log('[AuthContext] Platform accounts updated:', newAccounts);
        return newAccounts;
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[AuthContext] Platform fetch aborted');
      } else {
        console.error('Error fetching platform accounts:', error);
      }
    } finally {
      isFetchingPlatformAccountsRef.current = false;
      setIsPlatformAccountsLoading(false);
      platformFetchAbortControllerRef.current = null;
    }
  };

  const refreshPlatformAccounts = async (force = false) => {
    if (user) {
      await fetchPlatformAccounts(user.id, force);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setSessionExpired(false);
      setAdminModeEnabled(true);
      setPlatformAccounts({
        hubook: false,
        heddit: false,
        hutube: false,
        hinsta: false,
        switter: false,
        blog: false,
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleAdminMode = () => {
    setAdminModeEnabled(prev => !prev);
  };

  const refreshSession = async () => {
    if (isRefreshingSession) return;

    try {
      setIsRefreshingSession(true);
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh failed:', error);
        if (error.message?.includes('refresh_token_not_found') ||
            error.message?.includes('Invalid Refresh Token')) {
          setSessionExpired(true);
        }
        return false;
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setSessionExpired(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Exception during session refresh:', error);
      return false;
    } finally {
      setIsRefreshingSession(false);
    }
  };


  useEffect(() => {
    let mounted = true;

    // Prevent duplicate initialization
    if (isAuthInitializedRef.current) {
      console.log('[AuthContext] Already initialized, skipping');
      return;
    }

    isAuthInitializedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      console.log('[AuthContext] Initial session loaded:', session ? 'Session exists' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        Promise.all([
          fetchUserProfile(session.user.id),
          fetchPlatformAccounts(session.user.id)
        ]).then(() => {
          if (mounted) {
            setLoading(false);
            hasCompletedInitialLoadRef.current = true;
          }
        });
      } else {
        setLoading(false);
        hasCompletedInitialLoadRef.current = true;
      }
    });

    // Prevent duplicate subscriptions
    if (authSubscriptionRef.current) {
      console.log('[AuthContext] Auth subscription already exists, skipping');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (!mounted) return;

      (async () => {
        const event = _event;
        const session = _session;

        console.log('[AuthContext] Auth state change:', event, session ? 'Session exists' : 'No session');

        // Only update session/user state on explicit sign out, sign in, or user updated
        // Don't clear session on token refresh or other events that maintain auth
        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out, clearing all state');
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setSessionExpired(false);
          setAdminModeEnabled(true);
          setPlatformAccounts({
            hubook: false,
            heddit: false,
            hutube: false,
            hinsta: false,
            switter: false,
            blog: false,
          });
        } else if (event === 'SIGNED_IN') {
          console.log('[AuthContext] User signed in, fetching profile and platforms');
          setSession(session);
          setUser(session?.user ?? null);
          setAdminModeEnabled(true);
          setSessionExpired(false);
          if (session?.user) {
            fetchUserProfile(session.user.id);
            fetchPlatformAccounts(session.user.id, true);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] Token refreshed, updating session silently');
          setSession(session);
          setUser(session?.user ?? null);
          setSessionExpired(false);
          // Don't re-fetch profile on token refresh - it hasn't changed
        } else if (event === 'USER_UPDATED') {
          console.log('[AuthContext] User updated, re-fetching profile');
          setSession(session);
          setUser(session?.user ?? null);
          setSessionExpired(false);
          if (session?.user) {
            fetchUserProfile(session.user.id);
          }
        } else if (!session && event !== 'SIGNED_OUT') {
          console.warn('[AuthContext] Session lost but not signed out, attempting recovery');
          // Don't immediately clear user state - try recovery first with multiple attempts
          let recoveryAttempts = 0;
          const maxRecoveryAttempts = 3;

          const attemptRecovery = () => {
            if (!mounted) return;

            recoveryAttempts++;
            console.log(`[AuthContext] Recovery attempt ${recoveryAttempts}/${maxRecoveryAttempts}`);

            supabase.auth.getSession().then(({ data: { session: recoveredSession }, error }) => {
              if (error) {
                console.error('[AuthContext] Session recovery error:', error);
                if (recoveryAttempts < maxRecoveryAttempts) {
                  setTimeout(attemptRecovery, 1000 * recoveryAttempts); // Exponential backoff
                } else {
                  console.error('[AuthContext] All recovery attempts failed, marking session as expired');
                  setSessionExpired(true);
                }
                return;
              }

              if (!recoveredSession) {
                if (recoveryAttempts < maxRecoveryAttempts) {
                  setTimeout(attemptRecovery, 1000 * recoveryAttempts); // Exponential backoff
                } else {
                  console.warn('[AuthContext] Session recovery failed after all attempts, marking as expired');
                  setSessionExpired(true);
                }
              } else {
                console.log('[AuthContext] Session recovered successfully on attempt', recoveryAttempts);
                setSession(recoveredSession);
                setUser(recoveredSession.user);
                setSessionExpired(false);
              }
            });
          };

          setTimeout(attemptRecovery, 1000);
        }
      })();
    });

    authSubscriptionRef.current = subscription;

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      mounted = false;
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
      // Don't reset isAuthInitializedRef - keep it initialized for the app lifetime
      // This prevents re-initialization on component remounts
    };
  }, []);


  const isAdmin = Boolean((userProfile?.is_admin || stableAdminRef.current) && adminModeEnabled);
  const isVerified = Boolean(userProfile?.is_verified);
  const isEmailVerified = Boolean(user?.email_confirmed_at);

  // Log computed admin status whenever it changes
  useEffect(() => {
    console.log('[AuthContext] Admin status computed:', {
      isAdmin,
      profileIsAdmin: userProfile?.is_admin,
      adminModeEnabled,
      userId: user?.id
    });
  }, [isAdmin, userProfile?.is_admin, adminModeEnabled, user?.id]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userProfile,
      loading,
      isAdmin,
      isVerified,
      isEmailVerified,
      platformAccounts,
      isPlatformAccountsLoading,
      refreshProfile,
      refreshPlatformAccounts,
      signOut,
      sessionExpired,
      isRefreshingSession,
      adminModeEnabled,
      toggleAdminMode,
      isAuthTransitioning
    }}>
      {children}
    </AuthContext.Provider>
  );
}
