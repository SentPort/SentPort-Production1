import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Save, Loader2, Bell, Mail, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';

interface NotificationPreferences {
  friend_requests_enabled: boolean;
  friend_accepted_enabled: boolean;
  comments_enabled: boolean;
  replies_enabled: boolean;
  reactions_enabled: boolean;
  shares_enabled: boolean;
  mentions_enabled: boolean;
  tags_enabled: boolean;
  email_friend_requests: boolean;
  email_comments: boolean;
  email_reactions: boolean;
  email_shares: boolean;
  email_mentions: boolean;
  email_digest_frequency: 'instant' | 'hourly' | 'daily' | 'weekly' | 'never';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  friend_requests_enabled: true,
  friend_accepted_enabled: true,
  comments_enabled: true,
  replies_enabled: true,
  reactions_enabled: true,
  shares_enabled: true,
  mentions_enabled: true,
  tags_enabled: true,
  email_friend_requests: true,
  email_comments: true,
  email_reactions: false,
  email_shares: true,
  email_mentions: true,
  email_digest_frequency: 'instant',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00'
};

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/signin?redirect=/hubook/notification-settings');
    } else {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('hubook_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          friend_requests_enabled: data.friend_requests_enabled,
          friend_accepted_enabled: data.friend_accepted_enabled,
          comments_enabled: data.comments_enabled,
          replies_enabled: data.replies_enabled,
          reactions_enabled: data.reactions_enabled,
          shares_enabled: data.shares_enabled,
          mentions_enabled: data.mentions_enabled,
          tags_enabled: data.tags_enabled,
          email_friend_requests: data.email_friend_requests,
          email_comments: data.email_comments,
          email_reactions: data.email_reactions,
          email_shares: data.email_shares,
          email_mentions: data.email_mentions,
          email_digest_frequency: data.email_digest_frequency,
          quiet_hours_enabled: data.quiet_hours_enabled,
          quiet_hours_start: data.quiet_hours_start || '22:00',
          quiet_hours_end: data.quiet_hours_end || '08:00'
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load notification preferences' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('hubook_notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Notification preferences saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setMessage({ type: 'success', text: 'Reset to default settings. Click Save to apply.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <PlatformGuard platform="hubook">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hubook">
      <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SettingsIcon className="text-blue-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
            </div>
            <button
              onClick={() => navigate('/hubook/notifications')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Notifications
            </button>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Push Notifications</h2>
              </div>
              <p className="text-gray-600 mb-4">Choose which activities you want to be notified about</p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Friend requests</div>
                    <div className="text-sm text-gray-600">Get notified when someone sends you a friend request</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.friend_requests_enabled}
                    onChange={(e) => updatePreference('friend_requests_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Friend requests accepted</div>
                    <div className="text-sm text-gray-600">Get notified when someone accepts your friend request</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.friend_accepted_enabled}
                    onChange={(e) => updatePreference('friend_accepted_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Comments on your posts</div>
                    <div className="text-sm text-gray-600">Get notified when someone comments on your posts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.comments_enabled}
                    onChange={(e) => updatePreference('comments_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Replies to your comments</div>
                    <div className="text-sm text-gray-600">Get notified when someone replies to your comments</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.replies_enabled}
                    onChange={(e) => updatePreference('replies_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Reactions to your posts</div>
                    <div className="text-sm text-gray-600">Get notified when someone reacts to your posts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.reactions_enabled}
                    onChange={(e) => updatePreference('reactions_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Shares of your posts</div>
                    <div className="text-sm text-gray-600">Get notified when someone shares your posts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.shares_enabled}
                    onChange={(e) => updatePreference('shares_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Mentions</div>
                    <div className="text-sm text-gray-600">Get notified when someone mentions you in a post or comment</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.mentions_enabled}
                    onChange={(e) => updatePreference('mentions_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Photo tags</div>
                    <div className="text-sm text-gray-600">Get notified when someone tags you in a photo</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.tags_enabled}
                    onChange={(e) => updatePreference('tags_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Email Notifications</h2>
              </div>
              <p className="text-gray-600 mb-4">Choose which notifications you want to receive via email</p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Friend requests</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_friend_requests}
                    onChange={(e) => updatePreference('email_friend_requests', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Comments</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_comments}
                    onChange={(e) => updatePreference('email_comments', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Reactions</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_reactions}
                    onChange={(e) => updatePreference('email_reactions', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Shares</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_shares}
                    onChange={(e) => updatePreference('email_shares', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Mentions</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_mentions}
                    onChange={(e) => updatePreference('email_mentions', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-blue-600" size={20} />
                  <h3 className="font-medium text-gray-900">Email Digest Frequency</h3>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="digest_frequency"
                      value="instant"
                      checked={preferences.email_digest_frequency === 'instant'}
                      onChange={(e) => updatePreference('email_digest_frequency', e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Instant</div>
                      <div className="text-sm text-gray-600">Receive emails immediately as notifications arrive</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="digest_frequency"
                      value="hourly"
                      checked={preferences.email_digest_frequency === 'hourly'}
                      onChange={(e) => updatePreference('email_digest_frequency', e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Hourly digest</div>
                      <div className="text-sm text-gray-600">Receive a summary of notifications once per hour</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="digest_frequency"
                      value="daily"
                      checked={preferences.email_digest_frequency === 'daily'}
                      onChange={(e) => updatePreference('email_digest_frequency', e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Daily digest</div>
                      <div className="text-sm text-gray-600">Receive a daily summary of notifications</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="digest_frequency"
                      value="weekly"
                      checked={preferences.email_digest_frequency === 'weekly'}
                      onChange={(e) => updatePreference('email_digest_frequency', e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Weekly digest</div>
                      <div className="text-sm text-gray-600">Receive a weekly summary of notifications</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="digest_frequency"
                      value="never"
                      checked={preferences.email_digest_frequency === 'never'}
                      onChange={(e) => updatePreference('email_digest_frequency', e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Never</div>
                      <div className="text-sm text-gray-600">Don't send email notifications</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Quiet Hours</h2>
              </div>
              <p className="text-gray-600 mb-4">Set times when you don't want to receive notifications</p>

              <label className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={preferences.quiet_hours_enabled}
                  onChange={(e) => updatePreference('quiet_hours_enabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Enable quiet hours</span>
              </label>

              {preferences.quiet_hours_enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_start}
                        onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_end}
                        onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Notifications will be paused from {preferences.quiet_hours_start} to {preferences.quiet_hours_end}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw size={20} />
                Reset to Defaults
              </button>
              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
    </PlatformGuard>
  );
}
