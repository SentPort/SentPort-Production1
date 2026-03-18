import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Image, Upload, Loader2 } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { ImageUploadField } from '../../components/hubook/ImageUploadField';
import WelcomeModal from '../../components/hubook/WelcomeModal';

export default function JoinHuBook() {
  const navigate = useNavigate();
  const { user, isVerified, isAdmin, loading: authLoading, isAuthTransitioning, refreshProfile, refreshPlatformAccounts } = useAuth();
  const { createHuBookProfile } = useHuBook();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (authLoading || isAuthTransitioning || hasCheckedRef.current) return;

    if (!user) {
      navigate('/signin?redirect=/hubook/join');
      hasCheckedRef.current = true;
    } else if (!isVerified && !isAdmin) {
      navigate('/get-verified');
      hasCheckedRef.current = true;
    }
  }, [user, isVerified, isAdmin, authLoading, isAuthTransitioning, navigate]);

  const [formData, setFormData] = useState({
    display_name: '',
    sex: '' as 'male' | 'female' | '',
    age: '',
    bio: '',
    profile_photo_url: '',
    cover_photo_url: '',
    location: '',
    work: '',
    education: '',
    relationship_status: '',
    interests: ''
  });

  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.display_name || !formData.sex || !formData.age) {
      setError('Please fill in all required fields');
      return;
    }

    const age = parseInt(formData.age);
    if (age < 13 || age > 120) {
      setError('Age must be between 13 and 120');
      return;
    }

    setLoading(true);

    try {
      let finalProfilePhotoUrl = formData.profile_photo_url;
      let finalCoverPhotoUrl = formData.cover_photo_url;

      if (profilePhotoFile) {
        if (profilePhotoFile.size > 5 * 1024 * 1024) {
          throw new Error('Profile photo must be less than 5MB');
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(profilePhotoFile.type)) {
          throw new Error('Profile photo must be a JPEG, PNG, or WebP image');
        }

        const fileExt = profilePhotoFile.name.split('.').pop();
        const fileName = `profile-${user?.id}-${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('hubook-profile-media')
          .upload(`profiles/${fileName}`, profilePhotoFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error('Profile photo upload error:', error);
          throw new Error(`Failed to upload profile photo: ${error.message}`);
        }

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('hubook-profile-media')
            .getPublicUrl(data.path);
          finalProfilePhotoUrl = publicUrl;
        }
      }

      if (coverPhotoFile) {
        if (coverPhotoFile.size > 5 * 1024 * 1024) {
          throw new Error('Cover photo must be less than 5MB');
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(coverPhotoFile.type)) {
          throw new Error('Cover photo must be a JPEG, PNG, or WebP image');
        }

        const fileExt = coverPhotoFile.name.split('.').pop();
        const fileName = `cover-${user?.id}-${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('hubook-profile-media')
          .upload(`covers/${fileName}`, coverPhotoFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error('Cover photo upload error:', error);
          throw new Error(`Failed to upload cover photo: ${error.message}`);
        }

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('hubook-profile-media')
            .getPublicUrl(data.path);
          finalCoverPhotoUrl = publicUrl;
        }
      }

      await createHuBookProfile({
        display_name: formData.display_name,
        sex: formData.sex as 'male' | 'female',
        age,
        bio: formData.bio || undefined,
        profile_photo_url: finalProfilePhotoUrl || undefined,
        cover_photo_url: finalCoverPhotoUrl || undefined,
        location: formData.location || undefined,
        work: formData.work || undefined,
        education: formData.education || undefined,
        relationship_status: formData.relationship_status || undefined,
        interests: formData.interests ? formData.interests.split(',').map(i => i.trim()) : []
      });

      await Promise.all([refreshProfile(), refreshPlatformAccounts()]);
      setShowWelcome(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const handleWelcomeClose = async () => {
    if (user) {
      await supabase
        .from('hubook_profiles')
        .update({ welcome_message_shown: true })
        .eq('id', user.id);
    }
    setShowWelcome(false);
    navigate('/hubook/profile');
  };

  return (
    <div className="min-h-screen bg-white">
      {showWelcome && (
        <WelcomeModal
          onClose={handleWelcomeClose}
          displayName={formData.display_name}
        />
      )}
      <Header />
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to HuBook</h1>
            <p className="text-blue-100">Create your profile to join the verified social network</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                Required Information
                <span className="ml-2 text-red-500">*</span>
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="How should we call you?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sex *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="male"
                      required
                      checked={formData.sex === 'male'}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'male' })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Male</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="female"
                      required
                      checked={formData.sex === 'female'}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'female' })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Female</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  required
                  min="13"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your age"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Optional Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work
                  </label>
                  <input
                    type="text"
                    value={formData.work}
                    onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your job or company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Education
                  </label>
                  <input
                    type="text"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="School or university"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship Status
                  </label>
                  <select
                    value={formData.relationship_status}
                    onChange={(e) => setFormData({ ...formData, relationship_status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select status</option>
                    <option value="single">Single</option>
                    <option value="in_relationship">In a relationship</option>
                    <option value="married">Married</option>
                    <option value="complicated">It's complicated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interests
                </label>
                <input
                  type="text"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sports, Music, Travel (comma separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple interests with commas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploadField
                  label="Profile Photo"
                  currentValue={formData.profile_photo_url}
                  onFileChange={setProfilePhotoFile}
                  onUrlChange={(url) => setFormData({ ...formData, profile_photo_url: url })}
                  type="profile"
                  icon={<Image className="w-4 h-4 mr-2" />}
                />

                <ImageUploadField
                  label="Cover Photo"
                  currentValue={formData.cover_photo_url}
                  onFileChange={setCoverPhotoFile}
                  onUrlChange={(url) => setFormData({ ...formData, cover_photo_url: url })}
                  type="cover"
                  icon={<Upload className="w-4 h-4 mr-2" />}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Profile...' : 'Join HuBook'}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
