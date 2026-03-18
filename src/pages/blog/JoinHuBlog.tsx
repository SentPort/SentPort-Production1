import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformWelcomeModal from '../../components/shared/PlatformWelcomeModal';

export default function JoinHuBlog() {
  const { user, isVerified, isAdmin, loading: authLoading, isAuthTransitioning, refreshProfile, refreshPlatformAccounts } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (authLoading || isAuthTransitioning || hasCheckedRef.current) return;

    if (!user) {
      navigate('/signin?redirect=/blog/join');
      hasCheckedRef.current = true;
    } else if (!isVerified && !isAdmin) {
      navigate('/get-verified');
      hasCheckedRef.current = true;
    } else {
      loadInterests();
      setLoading(false);
    }
  }, [user, isVerified, isAdmin, authLoading, isAuthTransitioning, navigate]);

  const loadInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_interests')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableInterests(data || []);
    } catch (err) {
      console.error('Error loading interests:', err);
    }
  };

  const toggleInterest = (interestName: string) => {
    setInterests(prev =>
      prev.includes(interestName)
        ? prev.filter(i => i !== interestName)
        : [...prev, interestName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (interests.length === 0) {
      setError('Please select at least one interest');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const { error: insertError } = await supabase.from('blog_accounts').insert({
        id: user?.id,
        username,
        display_name: displayName,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        interests
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
      <BlogLayout showCreateButton={false}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </BlogLayout>
    );
  }

  const handleWelcomeClose = async () => {
    if (user) {
      await supabase
        .from('blog_accounts')
        .update({ welcome_message_shown: true })
        .eq('id', user.id);
    }
    setShowWelcome(false);
    navigate('/blog/feed');
  };

  return (
    <BlogLayout showCreateButton={false}>
      {showWelcome && (
        <PlatformWelcomeModal
          onClose={handleWelcomeClose}
          displayName={displayName}
          platform="blog"
        />
      )}
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center">
              <BookOpen className="w-16 h-16 text-white mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Join HuBlog</h1>
              <p className="text-white text-opacity-90">
                Share your stories with the world
              </p>
            </div>

            <div className="p-8">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                  Human-Verified Writing Platform
                </h3>
                <p className="text-sm text-emerald-800">
                  HuBlog is where verified humans share authentic stories, insights, and experiences.
                  Join our community of writers and readers.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="yourusername"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                    placeholder="Tell readers about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Avatar URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Your Interests (at least one)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {availableInterests.map((interest) => (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleInterest(interest.name)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          interests.includes(interest.name)
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {interests.includes(interest.name) && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm">{interest.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Selected: {interests.length} interest{interests.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || interests.length === 0}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating Account...' : 'Create HuBlog Account'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </BlogLayout>
  );
}
