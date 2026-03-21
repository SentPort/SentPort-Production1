import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Clock } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (user && user.email_confirmed_at) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!ageConfirmed) {
      setError('You must confirm that you are 18 years or older');
      setLoading(false);
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service to create an account');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSignupComplete(true);
      setResendCooldown(60);
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
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

  if (signupComplete) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4 pt-20">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                Check Your Email
              </h1>
              <p className="text-center text-gray-600 mb-6">
                We've sent a verification link to
              </p>
              <p className="text-center text-blue-600 font-medium mb-8">
                {email}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      Please verify your email to continue
                    </p>
                    <p className="text-sm text-blue-800">
                      Click the verification link in your email to activate your account. Check your spam folder if you don't see it within a few minutes.
                    </p>
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mb-4"
              >
                {resendLoading ? 'Sending...' : resendCooldown > 0 ? (
                  <span className="flex items-center justify-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Resend in {resendCooldown}s
                  </span>
                ) : 'Resend Verification Email'}
              </button>

              <a
                href="/signin"
                className="block text-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Back to Sign In
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4 pt-20">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Join the verified human-only community
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-5">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
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
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Re-enter your password"
              />
            </div>

            <div className="space-y-4 pt-2">
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                  I confirm that I am <strong>18 years of age or older</strong>
                </span>
              </label>

              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                  I have read and agree to the{' '}
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>
                </span>
              </label>
            </div>

            <div className="text-sm text-center">
              <span className="text-gray-600">Already have an account? </span>
              <a
                href={redirectTo !== '/' ? `/signin?redirect=${encodeURIComponent(redirectTo)}` : '/signin'}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </a>
            </div>

            <button
              type="submit"
              disabled={loading || !ageConfirmed || !termsAccepted}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
