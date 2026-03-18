import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';

export default function SwitterNotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [likesEnabled, setLikesEnabled] = useState(true);
  const [retweetsEnabled, setRetweetsEnabled] = useState(true);
  const [repliesEnabled, setRepliesEnabled] = useState(true);
  const [followsEnabled, setFollowsEnabled] = useState(true);
  const [mentionsEnabled, setMentionsEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('switter_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setLikesEnabled(data.likes_enabled ?? true);
      setRetweetsEnabled(data.retweets_enabled ?? true);
      setRepliesEnabled(data.replies_enabled ?? true);
      setFollowsEnabled(data.follows_enabled ?? true);
      setMentionsEnabled(data.mentions_enabled ?? true);
      setQuietHoursStart(data.quiet_hours_start || '22:00');
      setQuietHoursEnd(data.quiet_hours_end || '08:00');
    } else {
      await supabase.from('switter_notification_preferences').insert({
        user_id: user.id
      });
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSuccess('');

    try {
      const { error } = await supabase
        .from('switter_notification_preferences')
        .upsert({
          user_id: user.id,
          likes_enabled: likesEnabled,
          retweets_enabled: retweetsEnabled,
          replies_enabled: repliesEnabled,
          follows_enabled: followsEnabled,
          mentions_enabled: mentionsEnabled,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd
        });

      if (error) throw error;

      setSuccess('Notification preferences saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Notification Settings</h1>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Notification Types</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Likes</p>
                      <p className="text-sm text-gray-600">When someone likes your sweet</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={likesEnabled}
                        onChange={(e) => setLikesEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Resweets</p>
                      <p className="text-sm text-gray-600">When someone resweets your sweet</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={retweetsEnabled}
                        onChange={(e) => setRetweetsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Replies</p>
                      <p className="text-sm text-gray-600">When someone replies to your sweet</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={repliesEnabled}
                        onChange={(e) => setRepliesEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Follows</p>
                      <p className="text-sm text-gray-600">When someone follows you</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={followsEnabled}
                        onChange={(e) => setFollowsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Mentions</p>
                      <p className="text-sm text-gray-600">When someone mentions you</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mentionsEnabled}
                        onChange={(e) => setMentionsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Quiet Hours</h2>
                <p className="text-sm text-gray-600 mb-4">
                  You won't receive notifications during these hours
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
