import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomainCount?: number;
}

type Step = 'warning' | 'confirm' | 'verify';

export default function DeleteAccountModal({ isOpen, onClose, subdomainCount = 0 }: DeleteAccountModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('warning');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('warning');
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    onClose();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('request_account_deletion', {
        target_user_id: user.id,
      });

      if (rpcError) {
        console.error('Error requesting account deletion:', rpcError);
        setError('Failed to delete account. Please try again.');
        setLoading(false);
        return;
      }

      console.log('Account deletion requested:', data);

      await supabase.auth.signOut();

      handleClose();
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'warning' && 'Delete Account'}
            {step === 'confirm' && 'Confirm Account Deletion'}
            {step === 'verify' && 'Verify Your Identity'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'warning' && (
            <div className="space-y-6">
              <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Warning: This action has serious consequences</h3>
                  <p className="text-sm text-red-800">
                    Deleting your account will have immediate and lasting effects on your SentPort presence.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">What happens when you delete your account:</h3>

                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>Immediate sign-out:</strong> You will be automatically signed out as soon as you confirm deletion
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>All subdomains paused:</strong> {subdomainCount > 0 ? `Your ${subdomainCount} subdomain${subdomainCount !== 1 ? 's' : ''} will be immediately paused` : 'Any owned subdomains will be immediately paused'}
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>30-day grace period:</strong> You have 30 days to change your mind
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>Easy restoration:</strong> Simply sign back in within 30 days to restore your account and all subdomains
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>Permanent deletion after 30 days:</strong> After 30 days, all your data will be permanently deleted including:
                    </p>
                  </div>

                  <div className="ml-6 space-y-2 text-gray-600">
                    <p>• All posts, comments, and reactions across all platforms</p>
                    <p>• All owned subdomains (names will become available for others)</p>
                    <p>• Your profile and account information</p>
                    <p>• All uploaded content (photos, videos, etc.)</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Continue to Delete Account
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you absolutely sure you want to delete your account? This will:
                </p>

                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Sign you out immediately</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Pause {subdomainCount > 0 ? `${subdomainCount} subdomain${subdomainCount !== 1 ? 's' : ''}` : 'all your subdomains'}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Permanently delete everything after 30 days if you don't sign back in</span>
                  </li>
                </ul>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Remember:</strong> You can restore your account at any time within 30 days by simply signing back in with your email and password.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('warning')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('verify')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Yes, Delete My Account
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <p className="text-gray-700">
                For security, please enter your email and password to confirm account deletion.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || !email || !password}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm Deletion</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
