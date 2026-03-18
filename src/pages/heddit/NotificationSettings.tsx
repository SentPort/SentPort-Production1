import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Save, Loader2, Bell, Mail, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';

interface NotificationPreferences {
  push_comment_enabled: boolean;
  push_reply_enabled: boolean;
  push_mention_enabled: boolean;
  push_upvote_milestone_enabled: boolean;
  push_message_enabled: boolean;
  push_follower_enabled: boolean;
  push_subreddit_update_enabled: boolean;
  email_comment_enabled: boolean;
  email_reply_enabled: boolean;
  email_mention_enabled: boolean;
  email_upvote_milestone_enabled: boolean;
  email_message_enabled: boolean;
  email_follower_enabled: boolean;
  email_subreddit_update_enabled: boolean;
  email_digest_frequency: 'instant' | 'hourly' | 'daily' | 'weekly' | 'never';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_comment_enabled: true,
  push_reply_enabled: true,
  push_mention_enabled: true,
  push_upvote_milestone_enabled: true,
  push_message_enabled: true,
  push_follower_enabled: true,
  push_subreddit_update_enabled: true,
  email_comment_enabled: false,
  email_reply_enabled: false,
  email_mention_enabled: false,
  email_upvote_milestone_enabled: false,
  email_message_enabled: false,
  email_follower_enabled: false,
  email_subreddit_update_enabled: false,
  email_digest_frequency: 'instant',
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hedditAccountId, setHedditAccountId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/signin?redirect=/heddit/notification-settings');
    } else {
      loadHedditAccount();
    }
  }, [user]);

  useEffect(() => {
    if (hedditAccountId) {
      loadPreferences();
    }
  }, [hedditAccountId]);

  const loadHedditAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setHedditAccountId(data.id);
    }
  };

  const loadPreferences = async () => {
    if (!hedditAccountId) return;

    try {
      const { data, error } = await supabase
        .from('heddit_notification_preferences')
        .select('*')
        .eq('user_id', hedditAccountId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          push_comment_enabled: data.push_comment_enabled,
          push_reply_enabled: data.push_reply_enabled,
          push_mention_enabled: data.push_mention_enabled,
          push_upvote_milestone_enabled: data.push_upvote_milestone_enabled,
          push_message_enabled: data.push_message_enabled,
          push_follower_enabled: data.push_follower_enabled,
          push_subreddit_update_enabled: data.push_subreddit_update_enabled,
          email_comment_enabled: data.email_comment_enabled,
          email_reply_enabled: data.email_reply_enabled,
          email_mention_enabled: data.email_mention_enabled,
          email_upvote_milestone_enabled: data.email_upvote_milestone_enabled,
          email_message_enabled: data.email_message_enabled,
          email_follower_enabled: data.email_follower_enabled,
          email_subreddit_update_enabled: data.email_subreddit_update_enabled,
          email_digest_frequency: data.email_digest_frequency,
          quiet_hours_enabled: data.quiet_hours_enabled,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end
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
    if (!hedditAccountId) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('heddit_notification_preferences')
        .upsert({
          user_id: hedditAccountId,
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
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100">
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SettingsIcon className="text-orange-600" size={32} />
                  <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
                </div>
                <button
                  onClick={() => navigate('/heddit/settings')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back to Settings
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 py-6">
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="text-orange-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Push Notifications</h2>
                </div>
                <p className="text-gray-600 mb-4">Choose which activities you want to be notified about</p>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Comments on your posts</div>
                      <div className="text-sm text-gray-600">Get notified when someone comments on your posts</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.push_comment_enabled}
                      onChange={(e) => updatePreference('push_comment_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Replies to your comments</div>
                      <div className="text-sm text-gray-600">Get notified when someone replies to your comments</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.push_reply_enabled}
                      onChange={(e) => updatePreference('push_reply_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Mentions</div>
                      <div className="text-sm text-gray-600">Get notified when someone mentions you in posts or comments</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.push_mention_enabled}
                      onChange={(e) => updatePreference('push_mention_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Upvote milestones</div>
                      <div className="text-sm text-gray-600">Get notified when your posts reach upvote milestones (100, 1000, etc.)</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.push_upvote_milestone_enabled}
                      onChange={(e) => updatePreference('push_upvote_milestone_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">Private messages</div>
                      <div className="text-sm text-gray-600">Get notified when you receive new private messages</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.push_message_enabled}
                      onChange={(e) => updatePreference('push_message_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">New followers</div>
                      <div className="text-sm text-gray-600">Get notified when someone follows you</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.push_follower_enabled}
                      onChange={(e) => updatePreference('push_follower_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">SubHeddit updates</div>
                      <div className="text-sm text-gray-600">Get notified about important updates in subheddits you moderate or joined</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.push_subreddit_update_enabled}
                      onChange={(e) => updatePreference('push_subreddit_update_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="text-orange-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Email Notifications</h2>
                </div>
                <p className="text-gray-600 mb-4">Choose which notifications you want to receive via email</p>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900">Comments on your posts</div>
                    <input
                      type="checkbox"
                      checked={preferences.email_comment_enabled}
                      onChange={(e) => updatePreference('email_comment_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900">Replies to your comments</div>
                    <input
                      type="checkbox"
                      checked={preferences.email_reply_enabled}
                      onChange={(e) => updatePreference('email_reply_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900">Mentions</div>
                    <input
                      type="checkbox"
                      checked={preferences.email_mention_enabled}
                      onChange={(e) => updatePreference('email_mention_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900">Upvote milestones</div>
                    <input
                      type="checkbox"
                      checked={preferences.email_upvote_milestone_enabled}
                      onChange={(e) => updatePreference('email_upvote_milestone_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900">Private messages</div>
                    <input
                      type="checkbox"
                      checked={preferences.email_message_enabled}
                      onChange={(e) => updatePreference('email_message_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900">New followers</div>
                    <input
                      type="checkbox"
                      checked={preferences.email_follower_enabled}
                      onChange={(e) => updatePreference('email_follower_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900">SubHeddit updates</div>
                    <input
                      type="checkbox"
                      checked={preferences.email_subreddit_update_enabled}
                      onChange={(e) => updatePreference('email_subreddit_update_enabled', e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </label>
                </div>

                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-orange-600" size={20} />
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
                        className="w-4 h-4 text-orange-600"
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
                        className="w-4 h-4 text-orange-600"
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
                        className="w-4 h-4 text-orange-600"
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
                        className="w-4 h-4 text-orange-600"
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
                        className="w-4 h-4 text-orange-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Never</div>
                        <div className="text-sm text-gray-600">Don't send any email notifications</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-orange-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Quiet Hours</h2>
                </div>
                <p className="text-gray-600 mb-4">Set times when you don't want to receive notifications</p>

                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.quiet_hours_enabled}
                    onChange={(e) => updatePreference('quiet_hours_enabled', e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="font-medium text-gray-900">Enable quiet hours</div>
                </label>

                {preferences.quiet_hours_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_start || ''}
                        onChange={(e) => updatePreference('quiet_hours_start', e.target.value || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_end || ''}
                        onChange={(e) => updatePreference('quiet_hours_end', e.target.value || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
                {preferences.quiet_hours_enabled && preferences.quiet_hours_start && preferences.quiet_hours_end && (
                  <p className="mt-3 text-sm text-gray-600">
                    Notifications will be paused from {preferences.quiet_hours_start} to {preferences.quiet_hours_end}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={resetToDefaults}
                  className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                >
                  <RotateCcw size={20} />
                  Reset to Defaults
                </button>
                <button
                  onClick={savePreferences}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
