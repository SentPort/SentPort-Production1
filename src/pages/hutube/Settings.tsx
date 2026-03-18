import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Save, Loader2, Bell, Lock, Eye, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';

interface ChannelSettings {
  privacy_default: 'public' | 'unlisted' | 'private';
  comments_enabled: boolean;
  notifications_enabled: boolean;
  auto_play_next: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ChannelSettings>({
    privacy_default: 'public',
    comments_enabled: true,
    notifications_enabled: true,
    auto_play_next: true
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data: channel, error } = await supabase
        .from('hutube_channels')
        .select('id, privacy_default, comments_enabled, notifications_enabled, auto_play_next')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
        return;
      }

      if (channel) {
        setChannelId(channel.id);
        setSettings({
          privacy_default: channel.privacy_default || 'public',
          comments_enabled: channel.comments_enabled ?? true,
          notifications_enabled: channel.notifications_enabled ?? true,
          auto_play_next: channel.auto_play_next ?? true
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!channelId) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('hutube_channels')
        .update({
          privacy_default: settings.privacy_default,
          comments_enabled: settings.comments_enabled,
          notifications_enabled: settings.notifications_enabled,
          auto_play_next: settings.auto_play_next
        })
        .eq('id', channelId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Settings saved successfully!' });

      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout showBackButton={true} backButtonPath="/hutube">
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout showBackButton={true} backButtonPath="/hutube">
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <SettingsIcon className="w-8 h-8 text-red-600" />
                <h1 className="text-3xl font-bold text-gray-900">HuTube Settings</h1>
              </div>
              <p className="text-gray-600">Manage your HuTube channel preferences and settings</p>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {message.text}
                </p>
              </div>
            )}

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default video privacy
                    </label>
                    <select
                      value={settings.privacy_default}
                      onChange={(e) => setSettings({ ...settings, privacy_default: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="public">Public - Anyone can see your videos</option>
                      <option value="unlisted">Unlisted - Only people with the link</option>
                      <option value="private">Private - Only you can see</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      This will be the default privacy setting for new uploads
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Content Settings</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable comments</h3>
                      <p className="text-sm text-gray-500">Allow viewers to comment on your videos</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, comments_enabled: !settings.comments_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.comments_enabled ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.comments_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable notifications</h3>
                      <p className="text-sm text-gray-500">Get notified about comments, likes, and subscribers</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, notifications_enabled: !settings.notifications_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.notifications_enabled ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => navigate('/hutube/notification-settings')}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Advanced Notification Preferences</h3>
                        <p className="text-sm text-gray-500">Configure which notifications you want to receive</p>
                      </div>
                      <span className="text-red-600">→</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Playback Settings</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Auto-play next video</h3>
                      <p className="text-sm text-gray-500">Automatically play the next video when one ends. This is your choice to make, and we make it easy to change anytime.</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, auto_play_next: !settings.auto_play_next })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.auto_play_next ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.auto_play_next ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => navigate('/hutube')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
