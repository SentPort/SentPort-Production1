import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type VerificationStatus = 'checking' | 'approved' | 'pending' | 'declined' | 'abandoned' | 'error';

export default function VerificationCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('checking');
  const [message, setMessage] = useState('Processing your verification...');
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 15;

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('error');
        setMessage('Session expired. Please sign in again.');
        return;
      }

      const { data: sessions } = await supabase
        .from('didit_verification_sessions')
        .select('session_id, status, webhook_received_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) {
        setStatus('error');
        setMessage('No verification session found.');
        return;
      }

      const latestSession = sessions[0];

      if (latestSession.webhook_received_at) {
        handleFinalStatus(latestSession.status);
      } else {
        pollForWebhook(latestSession.session_id, session.access_token);
      }
    } catch (err) {
      console.error('Error checking verification status:', err);
      setStatus('error');
      setMessage('Failed to check verification status. Please contact support.');
    }
  };

  const pollForWebhook = async (sessionId: string, accessToken: string) => {
    const pollInterval = setInterval(async () => {
      setPollCount(prev => {
        const newCount = prev + 1;

        if (newCount >= maxPolls) {
          clearInterval(pollInterval);
          setStatus('pending');
          setMessage('Verification is being processed. We will notify you when it is complete.');
          setTimeout(() => navigate('/dashboard'), 5000);
          return newCount;
        }

        return newCount;
      });

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-verification-status?session_id=${sessionId}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.webhook_received) {
            clearInterval(pollInterval);
            handleFinalStatus(data.status);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const handleFinalStatus = async (verificationStatus: string) => {
    await refreshProfile();

    switch (verificationStatus) {
      case 'approved':
        setStatus('approved');
        setMessage('Verification successful! You now have full access to all platforms.');
        setTimeout(() => navigate('/dashboard'), 3000);
        break;
      case 'declined':
        setStatus('declined');
        setMessage('Verification was not approved. Please try again with valid identification.');
        break;
      case 'abandoned':
        setStatus('abandoned');
        setMessage('Verification was not completed. Please try again when ready.');
        break;
      default:
        setStatus('pending');
        setMessage('Verification is under review. We will notify you when complete.');
        setTimeout(() => navigate('/dashboard'), 5000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />;
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'declined':
        return <XCircle className="w-16 h-16 text-red-600" />;
      case 'abandoned':
        return <AlertCircle className="w-16 h-16 text-yellow-600" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-blue-600" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
      case 'pending':
        return 'from-blue-50 to-blue-100';
      case 'approved':
        return 'from-green-50 to-green-100';
      case 'declined':
      case 'error':
        return 'from-red-50 to-red-100';
      case 'abandoned':
        return 'from-yellow-50 to-yellow-100';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getStatusColor()} flex items-center justify-center px-4`}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'checking' && 'Checking Verification Status'}
          {status === 'approved' && 'Verification Approved!'}
          {status === 'declined' && 'Verification Declined'}
          {status === 'abandoned' && 'Verification Incomplete'}
          {status === 'pending' && 'Verification Pending'}
          {status === 'error' && 'Error Occurred'}
        </h1>

        <p className="text-gray-600 mb-8">
          {message}
        </p>

        {status === 'checking' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-500">
              This usually takes just a few seconds...
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(pollCount / maxPolls) * 100}%` }}
              />
            </div>
          </div>
        )}

        {(status === 'declined' || status === 'abandoned' || status === 'error') && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/get-verified')}
              className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        )}

        {status === 'approved' && (
          <div className="text-sm text-gray-500">
            Redirecting to dashboard...
          </div>
        )}

        {status === 'pending' && (
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
