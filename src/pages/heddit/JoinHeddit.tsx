import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HedditLayout from '../../components/shared/HedditLayout';
import PlatformWelcomeModal from '../../components/shared/PlatformWelcomeModal';

export default function JoinHeddit() {
  const { user, isVerified, isAdmin, loading: authLoading, isAuthTransitioning, refreshProfile, refreshPlatformAccounts } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
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
      navigate('/signin?redirect=/heddit/join');
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
      const { error: insertError } = await supabase.from('heddit_accounts').insert({
        user_id: user?.id,
        username: username.toLowerCase(),
        display_name: displayName,
        bio
      });

      if (insertError) throw insertError;

      await Promise.all([refreshProfile(), refreshPlatformAccounts()]);
      setShowWelcome(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <HedditLayout showCreateButtons={false}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
      </HedditLayout>
    );
  }

  const handleWelcomeClose = async () => {
    if (user) {
      await supabase
        .from('heddit_accounts')
        .update({ welcome_message_shown: true })
        .eq('user_id', user.id);
    }
    setShowWelcome(false);
    navigate('/heddit/feed');
  };

  return (
    <HedditLayout showCreateButtons={false}>
      {showWelcome && (
        <PlatformWelcomeModal
          onClose={handleWelcomeClose}
          displayName={displayName}
          platform="heddit"
        />
      )}
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 text-center">
            <Users className="w-16 h-16 text-white mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Join Heddit</h1>
            <p className="text-white text-opacity-90">
              The front page of human-verified content
            </p>
          </div>

          <div className="p-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                Human-Only Community Platform
              </h3>
              <p className="text-sm text-blue-800">
                Heddit is a verified community platform where real humans share authentic content.
                Every user is manually verified to ensure genuine human interaction.
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
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  pattern="[a-z0-9_]+"
                  title="Only lowercase letters, numbers, and underscores"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="username_123"
                  required
                />
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Tell the community about yourself..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating Account...' : 'Create Heddit Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    </HedditLayout>
  );
}