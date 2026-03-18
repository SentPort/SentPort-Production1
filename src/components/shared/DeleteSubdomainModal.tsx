import { useState } from 'react';
import { X, AlertTriangle, Trash2, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DeleteSubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: {
    id: string;
    subdomain: string;
    status: string;
  } | null;
  onDeleted: () => void;
}

type Step = 'warning' | 'confirm' | 'verify';

export default function DeleteSubdomainModal({
  isOpen,
  onClose,
  subdomain,
  onDeleted
}: DeleteSubdomainModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('warning');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !subdomain) return null;

  const isPublished = subdomain.status === 'active';

  const handleClose = () => {
    setStep('warning');
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    onClose();
  };

  const handleDeleteSubdomain = async () => {
    if (!user || !subdomain) return;

    setError('');
    setLoading(true);

    try {
      // First verify credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Call the deletion function
      const { data, error: rpcError } = await supabase.rpc('delete_individual_subdomain', {
        p_subdomain_id: subdomain.id,
        p_user_id: user.id,
      });

      if (rpcError) {
        console.error('Error deleting subdomain:', rpcError);
        setError('Failed to delete subdomain. Please try again.');
        setLoading(false);
        return;
      }

      // Check if deletion was successful
      if (data && data.length > 0 && data[0].success) {
        handleClose();
        onDeleted();
      } else {
        setError(data?.[0]?.message || 'Failed to delete subdomain.');
        setLoading(false);
      }
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
            {step === 'warning' && 'Delete Subdomain'}
            {step === 'confirm' && 'Confirm Subdomain Deletion'}
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
                  <h3 className="font-semibold text-red-900 mb-2">
                    Warning: This will permanently delete your subdomain
                  </h3>
                  <p className="text-sm text-red-800">
                    This action cannot be undone. There is no grace period for subdomain deletion.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Globe className="w-5 h-5 text-gray-600" />
                  <span className="font-mono font-semibold text-gray-900">
                    {subdomain.subdomain}.sentport.com
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                    isPublished
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isPublished ? 'Published & Live' : 'Unpublished'}
                  </span>
                </div>
              </div>

              {isPublished && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-900 mb-1">
                        This subdomain is currently live
                      </h4>
                      <p className="text-sm text-orange-800">
                        Your website is currently accessible to visitors. Deleting it will immediately take it offline.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">What will be permanently deleted:</h3>

                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>All website pages:</strong> Every page you've created in the website builder
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>All content and designs:</strong> Text, layouts, components, and styling
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>All uploaded assets:</strong> Images, files, and other media
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>All analytics data:</strong> Visitor stats, page views, and metrics
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>The subdomain name:</strong> "{subdomain.subdomain}" will become available for other users immediately
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> This only deletes this subdomain. Your SentPort account and other subdomains (if any) will remain active.
                </p>
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
                  Continue to Delete
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you absolutely sure you want to permanently delete this subdomain?
                </p>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="font-mono font-semibold text-gray-900 text-center text-lg">
                    {subdomain.subdomain}.sentport.com
                  </p>
                </div>

                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Immediate permanent deletion with no grace period</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>All pages, content, and assets will be deleted</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>All analytics data will be permanently removed</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Subdomain name becomes available for other users immediately</span>
                  </li>
                </ul>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900 font-semibold">
                    This action cannot be undone. All data will be lost forever.
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
                  Yes, Delete This Subdomain
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <p className="text-gray-700">
                For security, please enter your email and password to confirm subdomain deletion.
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
                  onClick={handleDeleteSubdomain}
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
