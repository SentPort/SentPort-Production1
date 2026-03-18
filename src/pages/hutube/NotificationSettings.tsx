import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Save, Loader2, Bell, Mail, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';

interface NotificationPreferences {
  new_video_enabled: boolean;
  new_comment_enabled: boolean;
  comment_reply_enabled: boolean;
  new_subscriber_enabled: boolean;
  video_liked_enabled: boolean;
  email_new_video: boolean;
  email_new_comment: boolean;
  email_comment_reply: boolean;
  email_new_subscriber: boolean;
  email_video_liked: boolean;
  digest_frequency: 'instant' | 'hourly' | 'daily';
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_video_enabled: true,
  new_comment_enabled: true,
  comment_reply_enabled: true,
  new_subscriber_enabled: true,
  video_liked_enabled: true,
  email_new_video: false,
  email_new_comment: false,
  email_comment_reply: false,
  email_new_subscriber: false,
  email_video_liked: false,
  digest_frequency: 'instant',
  quiet_hours_start: null,
  quiet_hours_end: null
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('hutube_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          new_video_enabled: data.new_video_enabled,
          new_comment_enabled: data.new_comment_enabled,
          comment_reply_enabled: data.comment_reply_enabled,
          new_subscriber_enabled: data.new_subscriber_enabled,
          video_liked_enabled: data.video_liked_enabled,
          email_new_video: data.email_new_video,
          email_new_comment: data.email_new_comment,
          email_comment_reply: data.email_comment_reply,
          email_new_subscriber: data.email_new_subscriber,
          email_video_liked: data.email_video_liked,
          digest_frequency: data.digest_frequency,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end
        });
      } else {
        // No preferences saved yet - use defaults (no error)
        setPreferences(DEFAULT_PREFERENCES);
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
        .from('hutube_notification_preferences')
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
      <PlatformGuard platform="hutube">
        <HuTubeLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SettingsIcon className="text-red-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
            </div>
            <button
              onClick={() => navigate('/hutube/notifications')}
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
                <Bell className="text-red-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Push Notifications</h2>
              </div>
              <p className="text-gray-600 mb-4">Choose which activities you want to be notified about</p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">New videos from subscriptions</div>
                    <div className="text-sm text-gray-600">Get notified when channels you subscribe to upload new videos</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.new_video_enabled}
                    onChange={(e) => updatePreference('new_video_enabled', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">New comments on your videos</div>
                    <div className="text-sm text-gray-600">Get notified when someone comments on your videos</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.new_comment_enabled}
                    onChange={(e) => updatePreference('new_comment_enabled', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Replies to your comments</div>
                    <div className="text-sm text-gray-600">Get notified when someone replies to your comments</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.comment_reply_enabled}
                    onChange={(e) => updatePreference('comment_reply_enabled', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">New subscribers</div>
                    <div className="text-sm text-gray-600">Get notified when someone subscribes to your channel</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.new_subscriber_enabled}
                    onChange={(e) => updatePreference('new_subscriber_enabled', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Video likes</div>
                    <div className="text-sm text-gray-600">Get notified when someone likes your videos</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.video_liked_enabled}
                    onChange={(e) => updatePreference('video_liked_enabled', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="text-red-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Email Notifications</h2>
              </div>
              <p className="text-gray-600 mb-4">Choose which notifications you want to receive via email</p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">New videos from subscriptions</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_new_video}
                    onChange={(e) => updatePreference('email_new_video', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">New comments</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_new_comment}
                    onChange={(e) => updatePreference('email_new_comment', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Comment replies</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_comment_reply}
                    onChange={(e) => updatePreference('email_comment_reply', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">New subscribers</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_new_subscriber}
                    onChange={(e) => updatePreference('email_new_subscriber', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Video likes</div>
                  <input
                    type="checkbox"
                    checked={preferences.email_video_liked}
                    onChange={(e) => updatePreference('email_video_liked', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
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
                      checked={preferences.digest_frequency === 'instant'}
                      onChange={(e) => updatePreference('digest_frequency', e.target.value)}
                      className="w-4 h-4 text-red-600"
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
                      checked={preferences.digest_frequency === 'hourly'}
                      onChange={(e) => updatePreference('digest_frequency', e.target.value)}
                      className="w-4 h-4 text-red-600"
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
                      checked={preferences.digest_frequency === 'daily'}
                      onChange={(e) => updatePreference('digest_frequency', e.target.value)}
                      className="w-4 h-4 text-red-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Daily digest</div>
                      <div className="text-sm text-gray-600">Receive a daily summary of notifications</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="text-red-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Quiet Hours</h2>
              </div>
              <p className="text-gray-600 mb-4">Set times when you don't want to receive notifications</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start time</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_start || ''}
                    onChange={(e) => updatePreference('quiet_hours_start', e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End time</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_end || ''}
                    onChange={(e) => updatePreference('quiet_hours_end', e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              {preferences.quiet_hours_start && preferences.quiet_hours_end && (
                <p className="mt-3 text-sm text-gray-600">
                  Notifications will be paused from {preferences.quiet_hours_start} to {preferences.quiet_hours_end}
                </p>
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
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      </HuTubeLayout>
    </PlatformGuard>
  );
}
