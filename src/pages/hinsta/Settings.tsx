import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Bell, Eye, Loader2, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHinstaNotification } from '../../contexts/HinstaNotificationContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useHinstaNotification();
  const [myAccount, setMyAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications'>('profile');

  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    website: '',
    avatar_url: ''
  });

  const [privacySettings, setPrivacySettings] = useState({
    is_private: false,
    allow_comments: true,
    allow_mentions: true,
    show_activity_status: true
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  const loadMyAccount = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) {
      setMyAccount(data);
      setFormData({
        username: data.username || '',
        display_name: data.display_name || '',
        bio: data.bio || '',
        website: data.website || '',
        avatar_url: data.avatar_url || ''
      });

      const { data: settingsData } = await supabase
        .from('hinsta_settings')
        .select('*')
        .eq('account_id', data.id)
        .maybeSingle();

      if (settingsData) {
        setPrivacySettings({
          is_private: settingsData.is_private || false,
          allow_comments: settingsData.allow_comments !== false,
          allow_mentions: settingsData.allow_mentions !== false,
          show_activity_status: settingsData.show_activity_status !== false
        });
      }
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myAccount || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hinsta-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hinsta-avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      showSuccess('Profile photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showError('Failed to upload profile photo');
    }
    setUploadingAvatar(false);
  };

  const saveProfile = async () => {
    if (!myAccount) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('hinsta_accounts')
        .update({
          username: formData.username,
          display_name: formData.display_name,
          bio: formData.bio,
          website: formData.website,
          avatar_url: formData.avatar_url
        })
        .eq('id', myAccount.id);

      if (error) throw error;

      showSuccess('Profile updated successfully');
      setMyAccount({ ...myAccount, ...formData });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === '23505') {
        showError('Username is already taken');
      } else {
        showError('Failed to update profile');
      }
    }
    setSaving(false);
  };

  const savePrivacySettings = async () => {
    if (!myAccount) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('hinsta_settings')
        .upsert({
          account_id: myAccount.id,
          ...privacySettings
        });

      if (error) throw error;

      showSuccess('Privacy settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      showError('Failed to update privacy settings');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout showBackButton backButtonPath={`/hinsta/${myAccount?.username}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    activeTab === 'profile'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <User className="w-5 h-5" />
                  Edit Profile
                </button>
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    activeTab === 'privacy'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  Privacy
                </button>
              </div>
            </div>

            {activeTab === 'profile' && (
              <div className="p-6">
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-1">
                      <div className="w-full h-full rounded-full bg-white p-1">
                        {formData.avatar_url ? (
                          <img
                            src={formData.avatar_url}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-3xl">
                            {formData.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="absolute bottom-0 right-0 bg-pink-500 text-white p-2 rounded-full cursor-pointer hover:bg-pink-600 transition-colors">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{formData.username}</h2>
                    <p className="text-gray-600">Change your profile photo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Display Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                      rows={4}
                      placeholder="Tell us about yourself"
                      maxLength={150}
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {formData.bio.length}/150
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6">Privacy Settings</h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-semibold text-gray-900">Private Account</h3>
                      <p className="text-sm text-gray-600">Only approved followers can see your posts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.is_private}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, is_private: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-semibold text-gray-900">Allow Comments</h3>
                      <p className="text-sm text-gray-600">Let people comment on your posts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.allow_comments}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, allow_comments: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-semibold text-gray-900">Allow Mentions</h3>
                      <p className="text-sm text-gray-600">Let people mention you in posts and comments</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.allow_mentions}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, allow_mentions: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-semibold text-gray-900">Activity Status</h3>
                      <p className="text-sm text-gray-600">Show when you're active on Hinsta</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.show_activity_status}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, show_activity_status: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>

                  <button
                    onClick={savePrivacySettings}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? 'Saving...' : 'Save Privacy Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}
