import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Mail, Loader } from 'lucide-react';
import Header from '../components/Header';

export default function EmailVerificationCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const verifyEmail = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!tokenHash || type !== 'email') {
        setStatus('error');
        setErrorMessage('Invalid verification link');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message || 'Verification failed');
      } else {
        setStatus('success');
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              navigate('/signin?verified=true');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4 pt-20">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {status === 'loading' && (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-blue-600 rounded-full p-3">
                    <Loader className="text-white animate-spin" size={32} />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                  Verifying Email
                </h1>
                <p className="text-center text-gray-600">
                  Please wait while we verify your email address...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-green-600 rounded-full p-3">
                    <CheckCircle className="text-white" size={32} />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                  Email Verified Successfully!
                </h1>
                <p className="text-center text-gray-600 mb-6">
                  Your email has been verified. You can now sign in to your account.
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-900 text-center">
                    Redirecting to sign in page in {countdown} seconds...
                  </p>
                </div>

                <button
                  onClick={() => navigate('/signin?verified=true')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Continue to Sign In
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-red-600 rounded-full p-3">
                    <XCircle className="text-white" size={32} />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                  Verification Failed
                </h1>
                <p className="text-center text-gray-600 mb-6">
                  {errorMessage || 'Unable to verify your email address'}
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-900 font-medium mb-1">
                        Common reasons for failure:
                      </p>
                      <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                        <li>Verification link has expired</li>
                        <li>Email already verified</li>
                        <li>Invalid or corrupted link</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mb-3"
                >
                  Request New Verification Email
                </button>

                <a
                  href="/signin"
                  className="block text-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to Sign In
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
