import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Save, User, Tag, Shield, Palette, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import { ProfilePhotoUpload } from '../../components/heddit/ProfilePhotoUpload';
import { ProfileInterestsManager } from '../../components/heddit/ProfileInterestsManager';
import CoverDesignEditor from '../../components/shared/CoverDesignEditor';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  cover_photo_url: string | null;
  location: string | null;
  website: string | null;
  allow_messages_from_anyone: boolean;
  allow_follow_without_approval: boolean;
  allow_post_tagging: boolean;
  community_mentions_enabled: boolean;
  moderator_mentions_enabled: boolean;
}

interface Interest {
  id: string;
  tag_name: string;
  display_name: string;
}

type TabType = 'profile' | 'interests' | 'privacy';

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [showCoverDesignEditor, setShowCoverDesignEditor] = useState(false);

  const [allowMessagesFromAnyone, setAllowMessagesFromAnyone] = useState(true);
  const [allowFollowWithoutApproval, setAllowFollowWithoutApproval] = useState(true);
  const [allowPostTagging, setAllowPostTagging] = useState(true);
  const [communityMentionsEnabled, setCommunityMentionsEnabled] = useState(true);
  const [moderatorMentionsEnabled, setModeratorMentionsEnabled] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/heddit');
      return;
    }

    const { data, error } = await supabase
      .from('heddit_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      navigate('/heddit/join');
      return;
    }

    setProfile(data);
    setDisplayName(data.display_name);
    setBio(data.bio || '');
    setLocation(data.location || '');
    setWebsite(data.website || '');
    setProfilePhotoPreview(data.avatar_url);
    setCoverPhotoPreview(data.cover_photo_url);

    setAllowMessagesFromAnyone(data.allow_messages_from_anyone ?? true);
    setAllowFollowWithoutApproval(data.allow_follow_without_approval ?? true);
    setAllowPostTagging(data.allow_post_tagging ?? true);
    setCommunityMentionsEnabled(data.community_mentions_enabled ?? true);
    setModeratorMentionsEnabled(data.moderator_mentions_enabled ?? true);

    loadInterests(data.id);
    setLoading(false);
  };

  const loadInterests = async (accountId: string) => {
    const { data } = await supabase
      .from('heddit_user_interests')
      .select(`
        heddit_custom_tags(id, tag_name, display_name)
      `)
      .eq('user_id', accountId);

    if (data) {
      const interestsList = data
        .map((item: any) => item.heddit_custom_tags)
        .filter(Boolean);
      setInterests(interestsList);
    }
  };

  const handleSaveCoverDesign = async (designData: any) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('heddit_accounts')
        .update({ cover_design_data: designData })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, cover_design_data: designData } as any);
      setShowCoverDesignEditor(false);
    } catch (error) {
      console.error('Error saving cover design:', error);
      alert('Failed to save cover design. Please try again.');
      throw error;
    }
  };

  const handleSavePrivacy = async () => {
    if (!profile) return;

    setSavingPrivacy(true);

    const { error } = await supabase
      .from('heddit_accounts')
      .update({
        allow_messages_from_anyone: allowMessagesFromAnyone,
        allow_follow_without_approval: allowFollowWithoutApproval,
        allow_post_tagging: allowPostTagging,
        community_mentions_enabled: communityMentionsEnabled,
        moderator_mentions_enabled: moderatorMentionsEnabled
      })
      .eq('id', profile.id);

    if (!error) {
      setProfile({
        ...profile,
        allow_messages_from_anyone: allowMessagesFromAnyone,
        allow_follow_without_approval: allowFollowWithoutApproval,
        allow_post_tagging: allowPostTagging,
        community_mentions_enabled: communityMentionsEnabled,
        moderator_mentions_enabled: moderatorMentionsEnabled
      });
    }

    setSavingPrivacy(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);

    let avatarUrl = profile.avatar_url;
    let coverUrl = profile.cover_photo_url;

    if (profilePhoto) {
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('heddit-profile-media')
        .upload(`avatars/${fileName}`, profilePhoto, {
          cacheControl: '3600',
          upsert: true
        });

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('heddit-profile-media')
          .getPublicUrl(data.path);
        avatarUrl = publicUrl;
      }
    }

    if (coverPhoto) {
      const fileExt = coverPhoto.name.split('.').pop();
      const fileName = `${profile.id}-cover-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('heddit-profile-media')
        .upload(`covers/${fileName}`, coverPhoto, {
          cacheControl: '3600',
          upsert: true
        });

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('heddit-profile-media')
          .getPublicUrl(data.path);
        coverUrl = publicUrl;
      }
    }

    const { error } = await supabase
      .from('heddit_accounts')
      .update({
        display_name: displayName,
        bio: bio,
        location: location || null,
        website: website || null,
        avatar_url: avatarUrl,
        cover_photo_url: coverUrl
      })
      .eq('id', profile.id);

    if (!error) {
      navigate(`/heddit/u/${profile.username}`);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-gray-500">Loading settings...</div>
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  if (!profile) {
    return null;
  }

  if (showCoverDesignEditor) {
    return (
      <CoverDesignEditor
        platform="heddit"
        currentCoverData={profile.cover_design_data}
        onSave={handleSaveCoverDesign}
        onClose={() => setShowCoverDesignEditor(false)}
      />
    );
  }

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100">
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
              <p className="text-gray-600">Manage your Heddit profile and preferences</p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {[
                  { id: 'profile' as TabType, label: 'Profile', icon: User },
                  { id: 'interests' as TabType, label: 'Interests', icon: Tag },
                  { id: 'privacy' as TabType, label: 'Privacy', icon: Shield }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Profile Photo</h3>
                      <ProfilePhotoUpload
                        currentPhotoUrl={profilePhotoPreview || undefined}
                        onPhotoChange={(file) => {
                          setProfilePhoto(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProfilePhotoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setProfilePhotoPreview(profile.avatar_url);
                          }
                        }}
                        type="profile"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Cover Photo</h3>
                      <div className="mb-4">
                        <button
                          onClick={() => setShowCoverDesignEditor(true)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg hover:from-orange-700 hover:to-red-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Palette className="w-5 h-5" />
                          Design Custom Cover
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Create a custom cover with photos, filters, and text
                        </p>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">or upload a simple photo</span>
                          </div>
                        </div>
                      </div>
                      <ProfilePhotoUpload
                        currentPhotoUrl={coverPhotoPreview || undefined}
                        onPhotoChange={(file) => {
                          setCoverPhoto(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCoverPhotoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setCoverPhotoPreview(profile.cover_photo_url);
                          }
                        }}
                        type="cover"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Your display name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        maxLength={500}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                        placeholder="Tell us about yourself..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {bio.length} / 500 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="City, Country"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => navigate(`/heddit/u/${profile.username}`)}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'interests' && (
                  <div>
                    <ProfileInterestsManager
                      accountId={profile.id}
                      selectedInterests={interests}
                      onInterestsChange={setInterests}
                    />
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                      <Bell className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm text-orange-900 font-medium mb-1">
                          Looking for notification settings?
                        </p>
                        <p className="text-sm text-orange-800">
                          Manage when and how you receive notifications in{' '}
                          <Link
                            to="/heddit/notification-settings"
                            className="underline font-semibold hover:text-orange-900"
                          >
                            Notification Settings
                          </Link>
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Messaging</h3>
                      <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                          checked={allowMessagesFromAnyone}
                          onChange={(e) => setAllowMessagesFromAnyone(e.target.checked)}
                        />
                        <div>
                          <div className="font-medium text-gray-900">Allow messages from anyone</div>
                          <div className="text-sm text-gray-600">
                            Anyone can send you private messages. Unchecking limits messages to users you follow.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Following</h3>
                      <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                          checked={allowFollowWithoutApproval}
                          onChange={(e) => setAllowFollowWithoutApproval(e.target.checked)}
                        />
                        <div>
                          <div className="font-medium text-gray-900">Allow anyone to follow you</div>
                          <div className="text-sm text-gray-600">
                            Other users can follow you without approval. Unchecking requires approval for new followers.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Mentions and Tagging</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            checked={allowPostTagging}
                            onChange={(e) => setAllowPostTagging(e.target.checked)}
                          />
                          <div>
                            <div className="font-medium text-gray-900">Allow users to mention you</div>
                            <div className="text-sm text-gray-600">
                              Users can mention you in posts and comments using @username
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            checked={communityMentionsEnabled}
                            onChange={(e) => setCommunityMentionsEnabled(e.target.checked)}
                          />
                          <div>
                            <div className="font-medium text-gray-900">Allow community mentions</div>
                            <div className="text-sm text-gray-600">
                              Users can mention communities (subheddits) you moderate using h/communityname
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            checked={moderatorMentionsEnabled}
                            onChange={(e) => setModeratorMentionsEnabled(e.target.checked)}
                          />
                          <div>
                            <div className="font-medium text-gray-900">Allow moderator mentions</div>
                            <div className="text-sm text-gray-600">
                              Users can ping you as a moderator in communities you moderate
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSavePrivacy}
                        disabled={savingPrivacy}
                        className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {savingPrivacy ? 'Saving...' : 'Save Privacy Settings'}
                      </button>
                      <button
                        onClick={() => navigate(`/heddit/u/${profile.username}`)}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
