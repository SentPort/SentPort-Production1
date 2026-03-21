import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showEmailUnverified, setShowEmailUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (shouldRedirect && user) {
      navigate(redirectTo);
    }
  }, [shouldRedirect, user, navigate, redirectTo]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowEmailUnverified(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed') ||
          error.message.toLowerCase().includes('email confirmation')) {
        setShowEmailUnverified(true);
        setUnverifiedEmail(email);
        setResendCooldown(60);
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      setShouldRedirect(true);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unverifiedEmail,
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
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Sign in to access verified human-only content
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <RotateCcw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Recently deleted your account?
                </p>
                <p className="text-sm text-blue-800">
                  Signing in within 30 days will automatically restore your account and all your subdomains.
                </p>
              </div>
            </div>
          </div>

          {showEmailUnverified && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-orange-900 font-medium mb-1">
                    Email Not Verified
                  </p>
                  <p className="text-sm text-orange-800 mb-3">
                    Your email address has not been verified yet. Please check your inbox for the verification link we sent to <strong>{unverifiedEmail}</strong>
                  </p>

                  {resendSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded mb-3 text-sm">
                      Verification email sent successfully!
                    </div>
                  )}

                  <button
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                  >
                    {resendLoading ? 'Sending...' : resendCooldown > 0 ? (
                      <span className="flex items-center justify-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Resend in {resendCooldown}s
                      </span>
                    ) : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <a
                href={redirectTo !== '/' ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : '/signup'}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create an account
              </a>
              <a href="/reset-password" className="text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
