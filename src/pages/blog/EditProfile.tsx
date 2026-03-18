import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, Loader2, Camera, Image as ImageIcon, Link as LinkIcon, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import DraggableImageUpload from '../../components/shared/DraggableImageUpload';
import { compressImage } from '../../lib/imageCompression';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function EditProfile() {
  return (
    <PlatformGuard platform="blog">
      <EditProfileContent />
    </PlatformGuard>
  );
}

function EditProfileContent() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [myAccount, setMyAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'media'>('profile');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    tagline: '',
    avatar_url: '',
    theme_color: '#E07B39',
    website: ''
  });

  const [interests, setInterests] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      loadMyAccount();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadMyAccount = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('blog_accounts')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setMyAccount(data);
      setFormData({
        username: data.username || '',
        display_name: data.display_name || '',
        bio: data.bio || '',
        tagline: data.tagline || '',
        avatar_url: data.avatar_url || '',
        theme_color: data.theme_color || '#E07B39',
        website: data.social_links?.website || ''
      });
      setInterests(data.interests || []);
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    setUploadingAvatar(true);
    setError('');
    setSuccess('');

    try {
      const compressed = await compressImage(file, 400, 85);
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('blog-avatars')
        .upload(fileName, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setSuccess('Profile photo uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile photo');
    }
    setUploadingAvatar(false);
  };

  const saveProfile = async () => {
    if (!myAccount) return;

    if (!formData.username.trim() || !formData.display_name.trim()) {
      setError('Username and display name are required');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const socialLinks = formData.website ? { website: formData.website } : null;

      const { error: updateError } = await supabase
        .from('blog_accounts')
        .update({
          username: formData.username.toLowerCase(),
          display_name: formData.display_name,
          bio: formData.bio,
          tagline: formData.tagline,
          avatar_url: formData.avatar_url,
          theme_color: formData.theme_color,
          interests: interests.length > 0 ? interests : ['general'],
          social_links: socialLinks,
          updated_at: new Date().toISOString()
        })
        .eq('id', myAccount.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
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
      <BlogLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </BlogLayout>
    );
  }

  if (!myAccount) {
    return null;
  }

  return (
    <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate(-1)}
                disabled={loading}
                className="p-2 rounded-lg bg-slate-700/50 text-gray-300 hover:bg-slate-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg flex items-center gap-2 text-emerald-400">
                <Check className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-3xl shadow-xl overflow-hidden">
              <div className="border-b border-slate-600/50">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
                      activeTab === 'profile'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    Profile Info
                  </button>
                  <button
                    onClick={() => setActiveTab('media')}
                    className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${
                      activeTab === 'media'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <ImageIcon className="w-5 h-5" />
                    Media
                  </button>
                </div>
              </div>

              <div className="p-8">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        placeholder="yourusername"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        placeholder="Your Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tagline
                      </label>
                      <input
                        type="text"
                        value={formData.tagline}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        placeholder="A brief description of your blog"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                        placeholder="Tell readers about yourself..."
                      />
                      <p className="text-sm text-gray-400 mt-1">{formData.bio.length} characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Website
                      </label>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-gray-400" />
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://yourwebsite.com"
                          className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Interests
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {interests.map((interest) => (
                          <span
                            key={interest}
                            className="px-3 py-1.5 rounded-full text-sm flex items-center gap-2 font-medium"
                            style={{
                              backgroundColor: `${formData.theme_color}20`,
                              color: formData.theme_color
                            }}
                          >
                            {interest}
                            <button
                              onClick={() => removeInterest(interest)}
                              className="hover:opacity-70 transition-opacity"
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
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Theme Color
                      </label>
                      <div className="flex gap-4 items-center">
                        <input
                          type="color"
                          value={formData.theme_color}
                          onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                          className="w-16 h-12 rounded-lg border-2 border-slate-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.theme_color}
                          onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                          className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-semibold shadow-lg hover:shadow-emerald-500/50"
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

                {activeTab === 'media' && (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-4">
                        Profile Photo
                      </label>
                      <div className="max-w-xs mx-auto">
                        <DraggableImageUpload
                          currentImageUrl={formData.avatar_url}
                          onFileSelect={handleAvatarUpload}
                          uploading={uploadingAvatar}
                          label="Drag & drop or click to upload"
                          shape="circle"
                          aspectRatio={1}
                        />
                      </div>
                    </div>

                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-semibold shadow-lg hover:shadow-emerald-500/50"
                    >
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Save Changes
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </BlogLayout>
  );
}
