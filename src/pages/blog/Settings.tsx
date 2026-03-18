import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Palette, Save, Loader2, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myAccount, setMyAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance'>('profile');

  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    tagline: '',
    avatar_url: '',
    cover_photo_url: '',
    theme_color: '#3b82f6'
  });

  const [interests, setInterests] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  const loadMyAccount = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('blog_accounts')
      .select('*')
      .eq('id', user?.id)
      .maybeSingle();

    if (data) {
      setMyAccount(data);
      setFormData({
        username: data.username || '',
        display_name: data.display_name || '',
        bio: data.bio || '',
        tagline: data.tagline || '',
        avatar_url: data.avatar_url || '',
        cover_photo_url: data.cover_photo_url || '',
        theme_color: data.theme_color || '#3b82f6'
      });
      setInterests(data.interests || []);
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
        .from('blog-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
    setUploadingAvatar(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myAccount || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-covers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-covers')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, cover_photo_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading cover:', error);
    }
    setUploadingCover(false);
  };

  const saveProfile = async () => {
    if (!myAccount) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('blog_accounts')
        .update({
          username: formData.username,
          display_name: formData.display_name,
          bio: formData.bio,
          tagline: formData.tagline,
          avatar_url: formData.avatar_url,
          cover_photo_url: formData.cover_photo_url,
          theme_color: formData.theme_color,
          interests: interests.length > 0 ? interests : ['general'],
          updated_at: new Date().toISOString()
        })
        .eq('id', myAccount.id);

      if (error) throw error;

      setMyAccount({ ...myAccount, ...formData, interests });
    } catch (error: any) {
      console.error('Error updating profile:', error);
    }
    setSaving(false);
  };

  const addInterest = (interest: string) => {
    if (interest && !interests.includes(interest)) {
      setInterests([...interests, interest]);
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  if (loading) {
    return (
      <PlatformGuard platform="blog" redirectTo="/blog/join">
        <BlogLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        </BlogLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="blog" redirectTo="/blog/join">
      <BlogLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Blog Settings</h1>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <User className="w-5 h-5" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    activeTab === 'appearance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Palette className="w-5 h-5" />
                  Appearance
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {formData.avatar_url ? (
                        <img
                          src={formData.avatar_url}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                          <User className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 border border-gray-200">
                        <Camera className="w-4 h-4 text-gray-600" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>
                    {uploadingAvatar && (
                      <p className="text-sm text-gray-500">Uploading...</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      placeholder="A brief description of your blog"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interests
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {interests.map((interest) => (
                        <span
                          key={interest}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                        >
                          {interest}
                          <button
                            onClick={() => removeInterest(interest)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add interest and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addInterest(e.currentTarget.value.trim());
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save Profile
                  </button>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Photo
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {formData.cover_photo_url ? (
                        <div className="relative">
                          <img
                            src={formData.cover_photo_url}
                            alt="Cover"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <label className="absolute bottom-2 right-2 bg-white rounded-lg px-3 py-2 shadow-lg cursor-pointer hover:bg-gray-50">
                            <Camera className="w-4 h-4 text-gray-600" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverUpload}
                              className="hidden"
                              disabled={uploadingCover}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-48 cursor-pointer">
                          <Camera className="w-12 h-12 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Click to upload cover photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            className="hidden"
                            disabled={uploadingCover}
                          />
                        </label>
                      )}
                    </div>
                    {uploadingCover && (
                      <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme Color
                    </label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="color"
                        value={formData.theme_color}
                        onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                        className="w-20 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.theme_color}
                        onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save Appearance
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </BlogLayout>
    </PlatformGuard>
  );
}
