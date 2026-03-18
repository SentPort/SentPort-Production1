import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bird, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import SwitterLayout from '../../components/shared/SwitterLayout';
import PlatformWelcomeModal from '../../components/shared/PlatformWelcomeModal';

export default function JoinSwitter() {
  const { user, isVerified, isAdmin, loading: authLoading, isAuthTransitioning, refreshProfile, refreshPlatformAccounts } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (authLoading || isAuthTransitioning || hasCheckedRef.current) return;

    if (!user) {
      navigate('/signin?redirect=/switter/join');
      hasCheckedRef.current = true;
    } else if (!isVerified && !isAdmin) {
      navigate('/get-verified');
      hasCheckedRef.current = true;
    } else {
      setLoading(false);
    }
  }, [user, isVerified, isAdmin, authLoading, isAuthTransitioning, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      console.log('[JoinSwitter] Creating Switter account for user:', user?.id);
      const { error: insertError } = await supabase.from('switter_accounts').insert({
        user_id: user?.id,
        handle: handle.toLowerCase(),
        display_name: displayName,
        bio
      });

      if (insertError) {
        console.error('[JoinSwitter] Error creating account:', insertError);
        throw insertError;
      }

      console.log('[JoinSwitter] Account created successfully, refreshing profile and platform accounts');
      await Promise.all([refreshProfile(), refreshPlatformAccounts(true)]);

      console.log('[JoinSwitter] Refresh complete, showing welcome modal');
      setShowWelcome(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SwitterLayout showCreateButton={false}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
      </SwitterLayout>
    );
  }

  const handleWelcomeClose = async () => {
    if (user) {
      console.log('[JoinSwitter] Marking welcome message as shown');
      await supabase
        .from('switter_accounts')
        .update({ welcome_message_shown: true })
        .eq('user_id', user.id);
    }
    setShowWelcome(false);
    console.log('[JoinSwitter] Redirecting to Switter feed');
    navigate('/switter/feed');
  };

  return (
    <SwitterLayout showCreateButton={false}>
      {showWelcome && (
        <PlatformWelcomeModal
          onClose={handleWelcomeClose}
          displayName={displayName}
          platform="switter"
        />
      )}
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-500 p-8 text-center">
            <Bird className="w-16 h-16 text-white mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Join Switter</h1>
            <p className="text-white text-opacity-90">
              See what's happening with verified humans
            </p>
          </div>

          <div className="p-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Human-Only Microblogging
              </h3>
              <p className="text-sm text-blue-800">
                Switter is a verified microblogging platform where real humans share thoughts and ideas.
                Every user is manually verified to ensure authentic human conversation.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handle
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    pattern="[a-z0-9_]+"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="yourhandle"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Only lowercase letters, numbers, and underscores
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio (Optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Tell people about yourself..."
                  maxLength={160}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating Account...' : 'Create Switter Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    </SwitterLayout>
  );
}