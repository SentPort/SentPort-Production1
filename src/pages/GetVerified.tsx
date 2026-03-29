import { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface VerificationSession {
  id: string;
  session_id: string;
  status: string;
  created_at: string;
}

export default function GetVerified() {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [recentSession, setRecentSession] = useState<VerificationSession | null>(null);

  useEffect(() => {
    if (user) {
      checkRecentSession();
    }
  }, [user]);

  const checkRecentSession = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('didit_verification_sessions')
        .select('id, session_id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setRecentSession(data);
      }
    } catch (err) {
      console.error('Error fetching recent session:', err);
    }
  };

  const handleStartVerification = async () => {
    setLoading(true);
    setError(null);
    setSessionError(false);

    try {
      console.log('Attempting to refresh session before verification...');

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        setError('Your session has expired. Please sign in again to continue.');
        setSessionError(true);
        setLoading(false);
        return;
      }

      const session = refreshData.session;

      if (!session) {
        console.error('No session after refresh');
        setError('Unable to establish a valid session. Please sign out and sign in again.');
        setSessionError(true);
        setLoading(false);
        return;
      }

      console.log('Session refreshed successfully. Starting verification for user:', session.user.id);

      const { data, error } = await supabase.functions.invoke('create-didit-session', {
        body: { initiated_by: 'user' },
      });

      console.log('Edge Function response:', { data, error });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to create verification session');
      }

      const verificationUrl = data?.verification_url || data?.url;
      if (!verificationUrl) {
        console.error('No verification URL in response:', data);
        throw new Error('No verification URL received from server');
      }

      console.log('Redirecting to:', verificationUrl);
      window.location.href = verificationUrl;
    } catch (err) {
      console.error('Error starting verification:', err);
      setError(err instanceof Error ? err.message : 'Failed to start verification. Please try again.');
      setLoading(false);
    }
  };

  const handleSignInAgain = async () => {
    await signOut();
    navigate('/signin');
  };

  const getSessionStatusInfo = () => {
    if (!recentSession) return null;

    const ageMinutes = (Date.now() - new Date(recentSession.created_at).getTime()) / 60000;
    const ageHours = ageMinutes / 60;

    switch (recentSession.status) {
      case 'pending':
        if (ageHours < 24) {
          return {
            color: 'blue',
            text: 'Your verification is currently under review by Didit\'s verification team. Manual reviews typically take 24-48 hours. You\'ll be notified automatically when complete. No action needed from you.',
            disableNewSession: true,
          };
        } else if (ageHours < 72) {
          return {
            color: 'yellow',
            text: 'Your verification is still under review by Didit\'s team. This is taking longer than usual, but rest assured it\'s being processed. We appreciate your patience.',
            disableNewSession: true,
          };
        } else {
          return {
            color: 'gray',
            text: 'Your previous verification session has expired after 72 hours. Please start a new verification.',
            disableNewSession: false,
          };
        }
      case 'declined':
        return {
          color: 'red',
          text: 'Your previous verification was not approved by Didit\'s review team. Please ensure you provide valid government-issued ID and try again.',
          disableNewSession: false,
        };
      case 'abandoned':
        return {
          color: 'gray',
          text: 'Your previous verification was not completed. You can start a new verification anytime.',
          disableNewSession: false,
        };
      default:
        return null;
    }
  };

  const statusInfo = getSessionStatusInfo();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verification Required
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            This is a verified-humans-only social network. To access any of our free platforms (HuBook, Heddit, HuTube, Hinsta, Switter, or HuBlog), you need to complete the human verification process. Preserving and distributing high-quality, authentic human-curated content is more important than ever.
          </p>

          {statusInfo && (
            <div className={`mb-6 p-4 rounded-lg ${
              statusInfo.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
              statusInfo.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' :
              statusInfo.color === 'red' ? 'bg-red-50 border border-red-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <p className={`text-sm ${
                statusInfo.color === 'blue' ? 'text-blue-800' :
                statusInfo.color === 'yellow' ? 'text-yellow-800' :
                statusInfo.color === 'red' ? 'text-red-800' :
                'text-gray-800'
              }`}>
                {statusInfo.text}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 text-left">{error}</p>
            </div>
          )}

          {sessionError ? (
            <button
              onClick={handleSignInAgain}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign In Again
            </button>
          ) : (
            <button
              onClick={handleStartVerification}
              disabled={loading || (statusInfo?.disableNewSession ?? false)}
              className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting Verification...
                </>
              ) : statusInfo?.disableNewSession ? (
                'Verification Under Review'
              ) : (
                'Start Free Verification Process'
              )}
            </button>
          )}

          {userProfile?.last_verification_at && (
            <p className="mt-4 text-sm text-gray-500">
              Last verified: {new Date(userProfile.last_verification_at).toLocaleDateString()}
            </p>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Why we verify</h3>
            <ul className="text-sm text-gray-600 space-y-2 text-left">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>No bots or fake accounts</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Safer community interactions</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>More authentic connections</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Access to all platform features</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
