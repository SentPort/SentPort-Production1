import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Clock, AlertCircle, LogOut, CheckCircle } from 'lucide-react';
import Header from '../components/Header';

export default function EmailNotVerified() {
  const { user, signOut } = useAuth();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && session?.user?.email_confirmed_at) {
        window.location.reload();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });

    if (error) {
      setError(error.message);
    } else {
      setResendSuccess(true);
      setResendCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    }

    setResendLoading(false);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4 pt-20">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-orange-600 rounded-full p-3">
                <Mail className="text-white" size={32} />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
              Please Verify Your Email
            </h1>
            <p className="text-center text-gray-600 mb-6">
              You need to verify your email to continue
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-orange-900 font-medium mb-1">
                    Email verification required
                  </p>
                  <p className="text-sm text-orange-800 mb-2">
                    We sent a verification link to:
                  </p>
                  <p className="text-sm font-semibold text-orange-900">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    What happens next?
                  </p>
                  <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                    <li>Check your email inbox and spam folder</li>
                    <li>Click the verification link</li>
                    <li>Sign in with your verified email</li>
                    <li>Complete human verification to access platforms</li>
                  </ol>
                </div>
              </div>
            </div>

            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                Verification email sent successfully!
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || resendLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mb-3"
            >
              {resendLoading ? 'Sending...' : resendCooldown > 0 ? (
                <span className="flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Resend in {resendCooldown}s
                </span>
              ) : 'Resend Verification Email'}
            </button>

            <button
              onClick={signOut}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Need help? Contact support if you're having trouble verifying your email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
