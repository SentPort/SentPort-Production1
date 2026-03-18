import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Palette, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import DraggableImageUpload from '../../components/shared/DraggableImageUpload';
import DeleteAccountModal from '../../components/shared/DeleteAccountModal';
import CoverDesignEditor from '../../components/shared/CoverDesignEditor';
import CoverRenderer from '../../components/shared/CoverRenderer';
import { compressImage } from '../../lib/imageCompression';

export default function SwitterSettings() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [coverDesignData, setCoverDesignData] = useState<any>(null);
  const [coverType, setCoverType] = useState<'photo' | 'design'>('photo');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('switter_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setHandle(data.handle || '');
      setDisplayName(data.display_name || '');
      setBio(data.bio || '');
      setLocation(data.location || '');
      setWebsite(data.website || '');
      setAvatarUrl(data.avatar_url || '');
      setCoverPhotoUrl(data.cover_photo_url || '');
      setCoverDesignData(data.cover_design_data || null);
      setCoverType(data.cover_design_data ? 'design' : 'photo');
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
        .from('switter-profile-media')
        .upload(fileName, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('switter-profile-media')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('switter_accounts')
        .update({
          handle: handle.toLowerCase(),
          display_name: displayName,
          bio,
          location,
          website,
          avatar_url: publicUrl,
          cover_photo_url: coverPhotoUrl,
          cover_design_data: coverDesignData
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await refreshProfile();
      setSuccess('Profile photo updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverPhotoUpload = async (file: File) => {
    if (!user) return;

    setUploadingCover(true);
    setError('');
    setSuccess('');

    try {
      const compressed = await compressImage(file, 1920, 85);
      const fileName = `${user.id}/cover-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('switter-profile-media')
        .upload(fileName, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('switter-profile-media')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('switter_accounts')
        .update({
          handle: handle.toLowerCase(),
          display_name: displayName,
          bio,
          location,
          website,
          avatar_url: avatarUrl,
          cover_photo_url: publicUrl,
          cover_design_data: null
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCoverPhotoUrl(publicUrl);
      setCoverDesignData(null);
      setCoverType('photo');
      await refreshProfile();
      setSuccess('Cover photo updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover photo');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveCoverDesign = async (designData: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('switter_accounts')
        .update({
          cover_design_data: designData,
          cover_photo_url: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCoverDesignData(designData);
      setCoverPhotoUrl('');
      setCoverType('design');
      setShowCoverEditor(false);
      await refreshProfile();
      setSuccess('Cover design saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save cover design');
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('switter_accounts')
        .update({
          handle: handle.toLowerCase(),
          display_name: displayName,
          bio,
          location,
          website,
          avatar_url: avatarUrl,
          cover_photo_url: coverPhotoUrl,
          cover_design_data: coverDesignData
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
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
        {showCoverEditor && (
          <CoverDesignEditor
            platform="switter"
            currentCoverData={coverDesignData}
            onSave={handleSaveCoverDesign}
            onClose={() => setShowCoverEditor(false)}
          />
        )}

        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo
                </label>
                {uploadingAvatar && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading profile photo...</span>
                  </div>
                )}
                <DraggableImageUpload
                  currentImageUrl={avatarUrl}
                  onUpload={handleAvatarUpload}
                  shape="circle"
                  aspectRatio={1}
                  maxWidth="128px"
                  label="Upload Profile Photo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Cover
                </label>

                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setCoverType('photo')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      coverType === 'photo'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverType('design')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      coverType === 'design'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    Design Cover
                  </button>
                </div>

                {coverType === 'photo' ? (
                  <>
                    {uploadingCover && (
                      <div className="flex items-center gap-2 mb-2 text-sm text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading cover photo...</span>
                      </div>
                    )}
                    <DraggableImageUpload
                      currentImageUrl={coverPhotoUrl}
                      onUpload={handleCoverPhotoUpload}
                      shape="rectangle"
                      aspectRatio={3}
                      label="Upload Cover Photo"
                    />
                  </>
                ) : (
                  <div className="space-y-3">
                    {coverDesignData && (
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <CoverRenderer
                          designData={coverDesignData}
                          aspectRatio={33.33}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCoverEditor(true)}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Palette className="w-5 h-5" />
                      {coverDesignData ? 'Edit Cover Design' : 'Create Cover Design'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handle
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    pattern="[a-z0-9_]+"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="yourhandle"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Tell people about yourself..."
                  maxLength={160}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/switter/notification-settings')}
                  className="flex-1 border border-gray-300 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Notification Settings
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full border border-red-300 text-red-600 font-semibold py-3 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Account
              </button>
            </form>
          </div>
        </div>

        {showDeleteModal && (
          <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
        )}
      </SwitterLayout>
    </PlatformGuard>
  );
}
