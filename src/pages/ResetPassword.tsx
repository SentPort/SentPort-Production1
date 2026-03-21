import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound } from 'lucide-react';
import Header from '../components/Header';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset link has been sent to your email!');
      setEmail('');
    }
    setLoading(false);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4 pt-20">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/sentient-portal-logo.png"
              alt="Sentient Portal"
              className="h-24 w-auto"
            />
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Reset Password
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Enter your email to receive a password reset link
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-sm text-center space-y-2">
              <div>
                <a href="/signin" className="text-blue-600 hover:text-blue-700 font-medium">
                  Back to Sign In
                </a>
              </div>
              <div>
                <span className="text-gray-600">Don't have an account? </span>
                <a href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
