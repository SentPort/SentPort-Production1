import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Upload, Save, Loader2, MapPin, Tag, Link as LinkIcon, X, Camera, Bell, CheckCircle2, XCircle, AlertCircle, Lock, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';

interface Channel {
  id: string;
  handle: string;
  display_name: string;
  description: string;
  profile_photo_url: string | null;
  location: string | null;
  category: string | null;
  social_links: any;
  switter_handle: string | null;
  hinsta_username: string | null;
  hubook_user_id: string | null;
  social_links_privacy: any;
  social_links_verification: any;
}

interface VerificationStatus {
  loading: boolean;
  verified: boolean;
  exists: boolean;
  error: string | null;
  is_private?: boolean;
  profile_visibility?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState({
    display_name: '',
    handle: '',
    description: '',
    location: '',
    category: '',
    social_links: {
      website: ''
    },
    switter_handle: '',
    hinsta_username: '',
    hubook_user_id: null as string | null,
    social_links_privacy: {
      show_switter: true,
      show_hinsta: true,
      show_hubook: true
    }
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [handleError, setHandleError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verificationStatus, setVerificationStatus] = useState({
    switter: { loading: false, verified: false, exists: false, error: null } as VerificationStatus,
    hinsta: { loading: false, verified: false, exists: false, error: null, is_private: false } as VerificationStatus,
    hubook: { loading: false, verified: false, exists: false, error: null, profile_visibility: 'public' } as VerificationStatus
  });
  const [autoDetectedAccounts, setAutoDetectedAccounts] = useState({
    switter: null as string | null,
    hinsta: null as string | null,
    hubook: null as string | null
  });
  const verificationTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const categories = [
    'Education',
    'Entertainment',
    'Gaming',
    'Music',
    'News & Politics',
    'Science & Technology',
    'Sports',
    'Travel & Events',
    'Vlogging',
    'Other'
  ];

  useEffect(() => {
    if (user) {
      loadProfile();
      autoDetectAccounts();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      Object.values(verificationTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: channelData, error } = await supabase
        .from('hutube_channels')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (channelData) {
        setChannel(channelData);
        setFormData({
          display_name: channelData.display_name || '',
          handle: channelData.handle || '',
          description: channelData.description || '',
          location: channelData.location || '',
          category: channelData.category || '',
          social_links: {
            website: channelData.social_links?.website || ''
          },
          switter_handle: channelData.switter_handle || '',
          hinsta_username: channelData.hinsta_username || '',
          hubook_user_id: channelData.hubook_user_id || null,
          social_links_privacy: channelData.social_links_privacy || {
            show_switter: true,
            show_hinsta: true,
            show_hubook: true
          }
        });

        if (channelData.switter_handle) {
          verifyLink('switter', channelData.switter_handle);
        }
        if (channelData.hinsta_username) {
          verifyLink('hinsta', channelData.hinsta_username);
        }
        if (channelData.hubook_user_id) {
          verifyLink('hubook', channelData.hubook_user_id);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoDetectAccounts = async () => {
    if (!user) return;

    try {
      const { data: switterData } = await supabase
        .from('switter_accounts')
        .select('handle')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: hinstaData } = await supabase
        .from('hinsta_accounts')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: hubookData } = await supabase
        .from('hubook_profiles')
        .select('id, display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      setAutoDetectedAccounts({
        switter: switterData?.handle || null,
        hinsta: hinstaData?.username || null,
        hubook: hubookData?.id || null
      });
    } catch (error) {
      console.error('Error auto-detecting accounts:', error);
    }
  };

  const verifyLink = async (platform: 'switter' | 'hinsta' | 'hubook', identifier: string) => {
    if (!identifier || !user) return;

    setVerificationStatus(prev => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true, error: null }
    }));

    try {
      let result;

      if (platform === 'switter') {
        const { data, error } = await supabase.rpc('verify_switter_link', {
          p_channel_user_id: user.id,
          p_switter_handle: identifier.replace('@', '')
        });
        if (error) throw error;
        result = data;
      } else if (platform === 'hinsta') {
        const { data, error } = await supabase.rpc('verify_hinsta_link', {
          p_channel_user_id: user.id,
          p_hinsta_username: identifier
        });
        if (error) throw error;
        result = data;
      } else if (platform === 'hubook') {
        const { data, error } = await supabase.rpc('verify_hubook_link', {
          p_channel_user_id: user.id,
          p_hubook_user_id: identifier
        });
        if (error) throw error;
        result = data;
      }

      setVerificationStatus(prev => ({
        ...prev,
        [platform]: {
          loading: false,
          verified: result.is_owned_by_user && result.exists,
          exists: result.exists,
          error: result.error,
          is_private: result.is_private,
          profile_visibility: result.profile_visibility
        }
      }));

      if (result.is_private && platform === 'hinsta') {
        setFormData(prev => ({
          ...prev,
          social_links_privacy: {
            ...prev.social_links_privacy,
            show_hinsta: false
          }
        }));
      }

      if (result.profile_visibility !== 'public' && platform === 'hubook') {
        setFormData(prev => ({
          ...prev,
          social_links_privacy: {
            ...prev.social_links_privacy,
            show_hubook: false
          }
        }));
      }

    } catch (error: any) {
      console.error(`Error verifying ${platform} link:`, error);
      setVerificationStatus(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          loading: false,
          error: error.message || 'Verification failed'
        }
      }));
    }
  };

  const handleSocialLinkChange = (platform: 'switter' | 'hinsta', value: string) => {
    const cleanValue = platform === 'switter' ? value.replace('@', '') : value;

    setFormData(prev => ({
      ...prev,
      [platform === 'switter' ? 'switter_handle' : 'hinsta_username']: cleanValue
    }));

    if (verificationTimeouts.current[platform]) {
      clearTimeout(verificationTimeouts.current[platform]);
    }

    if (cleanValue.trim()) {
      verificationTimeouts.current[platform] = setTimeout(() => {
        verifyLink(platform, cleanValue);
      }, 500);
    } else {
      setVerificationStatus(prev => ({
        ...prev,
        [platform]: { loading: false, verified: false, exists: false, error: null }
      }));
    }
  };

  const quickLinkAccount = (platform: 'switter' | 'hinsta' | 'hubook') => {
    const account = autoDetectedAccounts[platform];
    if (!account) return;

    if (platform === 'switter') {
      setFormData(prev => ({ ...prev, switter_handle: account }));
      verifyLink('switter', account);
    } else if (platform === 'hinsta') {
      setFormData(prev => ({ ...prev, hinsta_username: account }));
      verifyLink('hinsta', account);
    } else if (platform === 'hubook') {
      setFormData(prev => ({ ...prev, hubook_user_id: account }));
      verifyLink('hubook', account);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !channel) return;

    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      console.log('Starting upload for channel:', channel.id);

      const fileExt = file.name.split('.').pop();
      const fileName = `${channel.id}/profile.${fileExt}`;

      console.log('Uploading to:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('hutube-channels')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('hutube-channels')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      const { error: updateError } = await supabase
        .from('hutube_channels')
        .update({ profile_photo_url: publicUrl })
        .eq('id', channel.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log('Profile photo updated successfully');

      setChannel({ ...channel, profile_photo_url: publicUrl });
      setMessage({ type: 'success', text: 'Profile photo updated successfully!' });

      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Profile photo upload error:', error);
      const errorMessage = error.message || 'Failed to upload photo. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!channel) return;

    try {
      const { error } = await supabase
        .from('hutube_channels')
        .update({ profile_photo_url: null })
        .eq('id', channel.id);

      if (error) throw error;

      setChannel({ ...channel, profile_photo_url: null });
      setMessage({ type: 'success', text: 'Profile photo removed' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove photo' });
    }
  };

  const checkHandleAvailability = async (handle: string) => {
    if (handle === channel?.handle) {
      setHandleError('');
      return true;
    }

    const { data } = await supabase
      .from('hutube_channels')
      .select('handle')
      .eq('handle', handle.toLowerCase())
      .maybeSingle();

    if (data) {
      setHandleError('This handle is already taken');
      return false;
    }

    setHandleError('');
    return true;
  };

  const handleSave = async () => {
    if (!channel) return;

    if (!formData.display_name.trim()) {
      setMessage({ type: 'error', text: 'Display name is required' });
      return;
    }

    if (!formData.handle.trim()) {
      setMessage({ type: 'error', text: 'Handle is required' });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(formData.handle)) {
      setMessage({ type: 'error', text: 'Handle can only contain letters, numbers, underscores, and hyphens' });
      return;
    }

    const isHandleAvailable = await checkHandleAvailability(formData.handle);
    if (!isHandleAvailable) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('hutube_channels')
        .update({
          display_name: formData.display_name.trim(),
          handle: formData.handle.toLowerCase().trim(),
          description: formData.description.trim(),
          location: formData.location.trim() || null,
          category: formData.category || null,
          social_links: formData.social_links,
          switter_handle: formData.switter_handle.trim() || null,
          hinsta_username: formData.hinsta_username.trim() || null,
          hubook_user_id: formData.hubook_user_id || null,
          social_links_privacy: formData.social_links_privacy
        })
        .eq('id', channel.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });

      setTimeout(() => {
        navigate(`/hutube/channel/${formData.handle.toLowerCase()}`);
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const getProfileCompletion = () => {
    let completed = 0;
    const total = 7;

    if (formData.display_name) completed++;
    if (formData.handle) completed++;
    if (formData.description) completed++;
    if (channel?.profile_photo_url) completed++;
    if (formData.location) completed++;
    if (formData.category) completed++;
    if (formData.social_links.website || formData.switter_handle ||
        formData.hinsta_username || formData.hubook_user_id) completed++;

    return Math.round((completed / total) * 100);
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

  const completion = getProfileCompletion();

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout showBackButton={true} backButtonPath="/hutube">
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-8 h-8 text-red-600" />
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              </div>
              <p className="text-gray-600">Manage your channel information and appearance</p>
            </div>

            <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Profile Completion</h3>
                <span className="text-2xl font-bold text-red-600">{completion}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-red-600 to-pink-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Complete your profile to help viewers discover your channel
              </p>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Photo</h2>

                <div className="flex items-center gap-6">
                  <div className="relative group">
                    {channel?.profile_photo_url ? (
                      <img
                        src={channel.profile_photo_url}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center border-4 border-gray-200">
                        <User className="w-16 h-16 text-white" />
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center transition-all"
                    >
                      <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 mb-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Photo
                        </>
                      )}
                    </button>
                    {channel?.profile_photo_url && (
                      <button
                        onClick={handleRemovePhoto}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Remove Photo
                      </button>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Recommended: Square image, at least 400x400px. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Channel Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="Your channel name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Handle * <span className="text-gray-500">(@{formData.handle || 'yourchannel'})</span>
                    </label>
                    <input
                      type="text"
                      value={formData.handle}
                      onChange={(e) => {
                        setFormData({ ...formData, handle: e.target.value });
                        setHandleError('');
                      }}
                      onBlur={(e) => checkHandleAvailability(e.target.value)}
                      placeholder="yourchannel"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                        handleError ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {handleError && (
                      <p className="mt-1 text-sm text-red-600">{handleError}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Letters, numbers, underscores, and hyphens only
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tell viewers about your channel"
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.description.length}/500 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="City, Country"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Tag className="inline w-4 h-4 mr-1" />
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <LinkIcon className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Connect Your Sentient Portal Accounts</h2>
                </div>

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Link your other Sentient Portal accounts to help viewers discover your content across all platforms.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.social_links.website}
                      onChange={(e) => setFormData({
                        ...formData,
                        social_links: { ...formData.social_links, website: e.target.value }
                      })}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Switter</h3>
                    {autoDetectedAccounts.switter && !formData.switter_handle && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <p className="text-sm text-green-800">
                          We found your Switter account @{autoDetectedAccounts.switter}
                        </p>
                        <button
                          onClick={() => quickLinkAccount('switter')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Link It
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Switter Handle
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.switter_handle}
                          onChange={(e) => handleSocialLinkChange('switter', e.target.value)}
                          placeholder="yourhandle"
                          className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            verificationStatus.switter.loading ? 'border-blue-300' :
                            verificationStatus.switter.verified ? 'border-green-300' :
                            verificationStatus.switter.error ? 'border-red-300' :
                            'border-gray-300'
                          }`}
                        />
                        <div className="absolute right-3 top-2.5">
                          {verificationStatus.switter.loading && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                          {!verificationStatus.switter.loading && verificationStatus.switter.verified && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          {!verificationStatus.switter.loading && verificationStatus.switter.error && <XCircle className="w-5 h-5 text-red-600" />}
                        </div>
                      </div>
                      {verificationStatus.switter.error && (
                        <p className="mt-1 text-sm text-red-600">{verificationStatus.switter.error}</p>
                      )}
                      {verificationStatus.switter.verified && (
                        <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Account verified!
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        Enter your Switter handle without the @ symbol
                      </p>
                      {formData.switter_handle && verificationStatus.switter.verified && (
                        <div className="mt-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.social_links_privacy.show_switter}
                              onChange={(e) => setFormData({
                                ...formData,
                                social_links_privacy: {
                                  ...formData.social_links_privacy,
                                  show_switter: e.target.checked
                                }
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Show Switter link on my channel</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hinsta</h3>
                    {autoDetectedAccounts.hinsta && !formData.hinsta_username && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <p className="text-sm text-green-800">
                          We found your Hinsta account @{autoDetectedAccounts.hinsta}
                        </p>
                        <button
                          onClick={() => quickLinkAccount('hinsta')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Link It
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hinsta Username
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.hinsta_username}
                          onChange={(e) => handleSocialLinkChange('hinsta', e.target.value)}
                          placeholder="yourusername"
                          className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                            verificationStatus.hinsta.loading ? 'border-pink-300' :
                            verificationStatus.hinsta.verified ? 'border-green-300' :
                            verificationStatus.hinsta.error ? 'border-red-300' :
                            'border-gray-300'
                          }`}
                        />
                        <div className="absolute right-3 top-2.5">
                          {verificationStatus.hinsta.loading && <Loader2 className="w-5 h-5 text-pink-600 animate-spin" />}
                          {!verificationStatus.hinsta.loading && verificationStatus.hinsta.verified && !verificationStatus.hinsta.is_private && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          {!verificationStatus.hinsta.loading && verificationStatus.hinsta.verified && verificationStatus.hinsta.is_private && <Lock className="w-5 h-5 text-gray-600" />}
                          {!verificationStatus.hinsta.loading && verificationStatus.hinsta.error && <XCircle className="w-5 h-5 text-red-600" />}
                        </div>
                      </div>
                      {verificationStatus.hinsta.error && (
                        <p className="mt-1 text-sm text-red-600">{verificationStatus.hinsta.error}</p>
                      )}
                      {verificationStatus.hinsta.verified && !verificationStatus.hinsta.is_private && (
                        <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Account verified!
                        </p>
                      )}
                      {verificationStatus.hinsta.verified && verificationStatus.hinsta.is_private && (
                        <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                          <Lock className="w-4 h-4" /> This account is private
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        Enter your Hinsta username
                      </p>
                      {formData.hinsta_username && verificationStatus.hinsta.verified && (
                        <div className="mt-3">
                          {verificationStatus.hinsta.is_private ? (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Lock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm text-gray-700 font-medium">Link hidden due to privacy settings</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Your Hinsta account is private. Change your privacy settings in Hinsta to show this link publicly.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.social_links_privacy.show_hinsta}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  social_links_privacy: {
                                    ...formData.social_links_privacy,
                                    show_hinsta: e.target.checked
                                  }
                                })}
                                className="w-4 h-4 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                              />
                              <span className="text-sm text-gray-700">Show Hinsta link on my channel</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">HuBook</h3>
                    {autoDetectedAccounts.hubook && !formData.hubook_user_id && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <p className="text-sm text-green-800">
                          We found your HuBook profile
                        </p>
                        <button
                          onClick={() => quickLinkAccount('hubook')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Link It
                        </button>
                      </div>
                    )}
                    {formData.hubook_user_id ? (
                      <div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-gray-700">HuBook profile linked!</span>
                          </div>
                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, hubook_user_id: null }));
                              setVerificationStatus(prev => ({
                                ...prev,
                                hubook: { loading: false, verified: false, exists: false, error: null }
                              }));
                            }}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                          >
                            Unlink
                          </button>
                        </div>
                        {verificationStatus.hubook.profile_visibility !== 'public' ? (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Lock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-700 font-medium">Link hidden due to privacy settings</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Your HuBook profile is not public. Change your privacy settings in HuBook to show this link.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.social_links_privacy.show_hubook}
                              onChange={(e) => setFormData({
                                ...formData,
                                social_links_privacy: {
                                  ...formData.social_links_privacy,
                                  show_hubook: e.target.checked
                                }
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Show HuBook link on my channel</span>
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600 mb-3">
                          Link your HuBook profile to connect with your HuTube viewers
                        </p>
                        {autoDetectedAccounts.hubook ? (
                          <p className="text-sm text-gray-500">
                            Click the "Link It" button above to connect your account
                          </p>
                        ) : (
                          <a
                            href="/hubook/join"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Globe className="w-4 h-4" />
                            Create HuBook Account
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                </div>
                <button
                  onClick={() => navigate('/hutube/notification-settings')}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Notification Settings</h3>
                      <p className="text-sm text-gray-500">Configure which notifications you want to receive</p>
                    </div>
                    <span className="text-red-600">→</span>
                  </div>
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => navigate(`/hutube/channel/${channel?.handle}`)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !!handleError}
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
                      Save Profile
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
