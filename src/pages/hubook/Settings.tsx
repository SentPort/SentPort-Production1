import { useState, useEffect } from 'react';
import { useHuBook } from '../../contexts/HuBookContext';
import { Save, User, MapPin, Briefcase, GraduationCap, Heart, Tag, Camera, Shield, Ban, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ProfilePhotoModal from '../../components/hubook/ProfilePhotoModal';

export default function Settings() {
  const { hubookProfile, updateHuBookProfile } = useHuBook();
  const [saving, setSaving] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [showCoverPhotoModal, setShowCoverPhotoModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    display_name: hubookProfile?.display_name || '',
    bio: hubookProfile?.bio || '',
    location: hubookProfile?.location || '',
    work: hubookProfile?.work || '',
    education: hubookProfile?.education || '',
    relationship_status: hubookProfile?.relationship_status || '',
    interests: hubookProfile?.interests?.join(', ') || ''
  });

  const [privacySettings, setPrivacySettings] = useState({
    messaging_privacy: 'everyone',
    friend_request_privacy: 'everyone',
    profile_visibility: 'public',
    post_visibility_default: 'public',
    tagging_privacy: 'everyone',
    who_can_see_friends_list: 'everyone',
    who_can_see_photos: 'everyone'
  });

  // Load privacy settings
  useEffect(() => {
    const loadPrivacySettings = async () => {
      if (!hubookProfile) return;

      try {
        const { data, error } = await supabase
          .from('user_privacy_settings')
          .select('*')
          .eq('user_id', hubookProfile.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPrivacySettings({
            messaging_privacy: data.messaging_privacy,
            friend_request_privacy: data.friend_request_privacy,
            profile_visibility: data.profile_visibility,
            post_visibility_default: data.post_visibility_default,
            tagging_privacy: data.tagging_privacy,
            who_can_see_friends_list: data.who_can_see_friends_list,
            who_can_see_photos: data.who_can_see_photos
          });
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      }
    };

    loadPrivacySettings();
  }, [hubookProfile]);

  useEffect(() => {
    loadBlockedUsers();
  }, [hubookProfile]);

  const loadBlockedUsers = async () => {
    if (!hubookProfile) return;

    setLoadingBlocked(true);
    try {
      const { data, error } = await supabase
        .from('hubook_blocked_users')
        .select(`
          id,
          blocked_id,
          created_at,
          hubook_profiles!hubook_blocked_users_blocked_id_fkey (
            id,
            display_name,
            profile_photo_url
          )
        `)
        .eq('blocker_id', hubookProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (blockId: string, displayName: string) => {
    setUnblockingId(blockId);
    try {
      const { error } = await supabase
        .from('hubook_blocked_users')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
      setNotification({ type: 'success', message: `${displayName} has been unblocked` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error unblocking user:', error);
      setNotification({ type: 'error', message: 'Failed to unblock user. Please try again.' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setUnblockingId(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrivacyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPrivacySettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubookProfile) return;

    setSaving(true);
    try {
      const interestsArray = formData.interests
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      const updates = {
        display_name: formData.display_name.trim(),
        bio: formData.bio.trim() || null,
        location: formData.location.trim() || null,
        work: formData.work.trim() || null,
        education: formData.education.trim() || null,
        relationship_status: formData.relationship_status || null,
        interests: interestsArray.length > 0 ? interestsArray : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('hubook_profiles')
        .update(updates)
        .eq('id', hubookProfile.id);

      if (error) throw error;

      await updateHuBookProfile(updates);
      setNotification({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setNotification({ type: 'error', message: 'Failed to update profile. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubookProfile) return;

    setSavingPrivacy(true);
    try {
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: hubookProfile.id,
          ...privacySettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setNotification({ type: 'success', message: 'Privacy settings updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      setNotification({ type: 'error', message: 'Failed to update privacy settings. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSavingPrivacy(false);
    }
  };

  if (!hubookProfile) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {notification && (
        <div className={`mb-6 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your personal information and profile appearance</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photos
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                <div className="relative group cursor-pointer" onClick={() => setShowProfilePhotoModal(true)}>
                  {hubookProfile.profile_photo_url ? (
                    <img
                      src={hubookProfile.profile_photo_url}
                      alt={hubookProfile.display_name}
                      className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-2 border-gray-200 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-3xl">
                      {hubookProfile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg">
                      <Camera className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
                <div className="relative h-32 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-lg group cursor-pointer" onClick={() => setShowCoverPhotoModal(true)}>
                  {hubookProfile.cover_photo_url && (
                    <img
                      src={hubookProfile.cover_photo_url}
                      alt="Cover"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center rounded-lg">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg">
                      <Camera className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </h2>

            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                placeholder="Tell people about yourself..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">About Hu</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="work" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Work
                </label>
                <input
                  type="text"
                  id="work"
                  name="work"
                  value={formData.work}
                  onChange={handleChange}
                  placeholder="Your job or company"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Education
                </label>
                <input
                  type="text"
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="Your school or degree"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="relationship_status" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Relationship Status
                </label>
                <select
                  id="relationship_status"
                  name="relationship_status"
                  value={formData.relationship_status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Prefer not to say</option>
                  <option value="single">Single</option>
                  <option value="in_relationship">In a Relationship</option>
                  <option value="engaged">Engaged</option>
                  <option value="married">Married</option>
                  <option value="complicated">It's Complicated</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Interests
              </label>
              <input
                type="text"
                id="interests"
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                placeholder="Music, Travel, Photography (comma-separated)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Separate interests with commas</p>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Privacy Settings
          </h1>
          <p className="text-gray-600 mt-1">Control who can interact with you and see your content</p>
        </div>

        <form onSubmit={handlePrivacySubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="messaging_privacy" className="block text-sm font-medium text-gray-700 mb-2">
                Who can send me messages
              </label>
              <select
                id="messaging_privacy"
                name="messaging_privacy"
                value={privacySettings.messaging_privacy}
                onChange={handlePrivacyChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="everyone">Everyone</option>
                <option value="friends_only">Friends Only</option>
                <option value="no_one">No One</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Control who can start a conversation with you</p>
            </div>

            <div>
              <label htmlFor="friend_request_privacy" className="block text-sm font-medium text-gray-700 mb-2">
                Who can send me friend requests
              </label>
              <select
                id="friend_request_privacy"
                name="friend_request_privacy"
                value={privacySettings.friend_request_privacy}
                onChange={handlePrivacyChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="everyone">Everyone</option>
                <option value="friends_of_friends">Friends of Friends</option>
                <option value="no_one">No One</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Control who can send you friend requests</p>
            </div>

            <div>
              <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 mb-2">
                Profile visibility
              </label>
              <select
                id="profile_visibility"
                name="profile_visibility"
                value={privacySettings.profile_visibility}
                onChange={handlePrivacyChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="public">Public - Anyone can view my full profile</option>
                <option value="friends_only">Friends Only - Only friends can view my profile</option>
                <option value="private">Private - Hide my profile from everyone</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Control who can view your profile information</p>
            </div>

            <div>
              <label htmlFor="tagging_privacy" className="block text-sm font-medium text-gray-700 mb-2">
                Who can tag me in posts
              </label>
              <select
                id="tagging_privacy"
                name="tagging_privacy"
                value={privacySettings.tagging_privacy}
                onChange={handlePrivacyChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="everyone">Everyone</option>
                <option value="friends_only">Friends Only</option>
                <option value="no_one">No One</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Control who can mention you in their posts</p>
            </div>

            <div>
              <label htmlFor="who_can_see_friends_list" className="block text-sm font-medium text-gray-700 mb-2">
                Who can see my friends list
              </label>
              <select
                id="who_can_see_friends_list"
                name="who_can_see_friends_list"
                value={privacySettings.who_can_see_friends_list}
                onChange={handlePrivacyChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="everyone">Everyone</option>
                <option value="friends_only">Friends Only</option>
                <option value="only_me">Only Me</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Control who can see your list of friends</p>
            </div>

            <div>
              <label htmlFor="who_can_see_photos" className="block text-sm font-medium text-gray-700 mb-2">
                Who can see my photos
              </label>
              <select
                id="who_can_see_photos"
                name="who_can_see_photos"
                value={privacySettings.who_can_see_photos}
                onChange={handlePrivacyChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="everyone">Everyone</option>
                <option value="friends_only">Friends Only</option>
                <option value="only_me">Only Me</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Control who can view your photo albums</p>
            </div>

            <div>
              <label htmlFor="post_visibility_default" className="block text-sm font-medium text-gray-700 mb-2">
                Default post visibility
              </label>
              <select
                id="post_visibility_default"
                name="post_visibility_default"
                value={privacySettings.post_visibility_default}
                onChange={handlePrivacyChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="public">Public - Anyone can see</option>
                <option value="friends">Friends - Only friends can see</option>
                <option value="private">Private - Only me</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">This sets the initial privacy level when creating new posts. You can change it for individual posts using the dropdown next to the Post button.</p>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={savingPrivacy}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {savingPrivacy ? 'Saving...' : 'Save Privacy Settings'}
            </button>
          </div>
        </form>
      </div>

      {showProfilePhotoModal && (
        <ProfilePhotoModal
          onClose={() => setShowProfilePhotoModal(false)}
          currentPhotoUrl={hubookProfile.profile_photo_url || undefined}
          photoType="profile"
        />
      )}

      {showCoverPhotoModal && (
        <ProfilePhotoModal
          onClose={() => setShowCoverPhotoModal(false)}
          currentPhotoUrl={hubookProfile.cover_photo_url || undefined}
          photoType="cover"
        />
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ban className="w-6 h-6" />
            Blocked Users
          </h1>
          <p className="text-gray-600 mt-1">Manage users you've blocked</p>
        </div>

        <div className="p-6">
          {loadingBlocked ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8">
              <Ban className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">You haven't blocked anyone yet</p>
              <p className="text-sm text-gray-500 mt-1">Blocked users can't see your profile, message you, or interact with your content</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blocked) => {
                const profile = blocked.hubook_profiles;
                return (
                  <div key={blocked.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {profile?.profile_photo_url ? (
                        <img
                          src={profile.profile_photo_url}
                          alt={profile.display_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-lg">
                          {profile?.display_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{profile?.display_name || 'Unknown User'}</p>
                        <p className="text-sm text-gray-500">
                          Blocked {new Date(blocked.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(blocked.id, profile?.display_name || 'this user')}
                      disabled={unblockingId === blocked.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {unblockingId === blocked.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Unblocking...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Unblock
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
