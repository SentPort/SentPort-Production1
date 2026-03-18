import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Upload, Grid3x3, List, Loader2, Settings, Palette, User, Camera, CreditCard as Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import SubscribeButton from '../../components/hutube/SubscribeButton';
import VideoCard from '../../components/hutube/VideoCard';
import CoverDesignEditor from '../../components/shared/CoverDesignEditor';
import CoverRenderer from '../../components/shared/CoverRenderer';
import { compressImage, formatFileSize } from '../../lib/imageCompression';
import ChannelSocialLinks from '../../components/hutube/ChannelSocialLinks';

interface Channel {
  id: string;
  handle: string;
  display_name: string;
  description: string;
  avatar_url: string | null;
  banner_url: string | null;
  profile_photo_url: string | null;
  cover_type: string | null;
  cover_image_data: any;
  subscriber_count: number;
  video_count: number;
  user_id: string;
  location: string | null;
  category: string | null;
  social_links: any;
  switter_handle: string | null;
  hinsta_username: string | null;
  hubook_user_id: string | null;
  social_links_privacy: any;
  social_links_verification: any;
}

interface VideoType {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number;
  view_count: number;
  created_at: string;
}

export default function HuTubeChannel() {
  const { handle } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'about'>('videos');
  const [isOwnChannel, setIsOwnChannel] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [coverUploadType, setCoverUploadType] = useState<'image' | 'design'>('image');

  useEffect(() => {
    loadChannel();
  }, [handle]);

  const loadChannel = async () => {
    try {
      const { data: channelData, error: channelError } = await supabase
        .from('hutube_channels')
        .select('*')
        .eq('handle', handle)
        .single();

      if (channelError) throw channelError;

      setChannel(channelData);
      setIsOwnChannel(user?.id === channelData.user_id);

      const { data: videosData } = await supabase
        .from('hutube_videos')
        .select('id, title, thumbnail_url, duration, view_count, created_at, privacy, is_draft')
        .eq('channel_id', channelData.id)
        .order('created_at', { ascending: false });

      const filteredVideos = videosData?.filter(v =>
        user?.id === channelData.user_id ? true : (v.privacy === 'public' && !v.is_draft)
      ) || [];

      setVideos(filteredVideos);
    } catch (error) {
      console.error('Error loading channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !channel) return;

    const originalFile = e.target.files[0];

    try {
      const compressedFile = await compressImage(originalFile, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 400,
        quality: 0.85
      });

      console.log(`Avatar compressed: ${formatFileSize(originalFile.size)} → ${formatFileSize(compressedFile.size)}`);

      const fileName = `${channel.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('hutube-channels')
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hutube-channels')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('hutube_channels')
        .update({ avatar_url: publicUrl })
        .eq('id', channel.id);

      if (updateError) throw updateError;

      setChannel({ ...channel, avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !channel) return;

    const originalFile = e.target.files[0];

    try {
      const compressedFile = await compressImage(originalFile, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        quality: 0.85
      });

      console.log(`Banner compressed: ${formatFileSize(originalFile.size)} → ${formatFileSize(compressedFile.size)}`);

      const fileName = `${channel.id}/banner.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('hutube-channels')
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hutube-channels')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('hutube_channels')
        .update({
          banner_url: publicUrl,
          cover_type: 'image',
          cover_image_data: null
        })
        .eq('id', channel.id);

      if (updateError) throw updateError;

      setChannel({ ...channel, banner_url: publicUrl, cover_type: 'image', cover_image_data: null });
    } catch (error) {
      console.error('Error uploading banner:', error);
    }
  };

  const handleSaveCoverDesign = async (designData: any) => {
    if (!channel) return;

    try {
      const { error } = await supabase
        .from('hutube_channels')
        .update({
          cover_design_data: designData,
          banner_url: null
        })
        .eq('id', channel.id);

      if (error) throw error;

      setChannel({ ...channel, cover_design_data: designData, banner_url: null } as any);
      setShowCoverEditor(false);
    } catch (error) {
      console.error('Error saving cover design:', error);
      throw error;
    }
  };


  if (loading) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout showBackButton={true}>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  if (!channel) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout showBackButton={true}>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Channel not found</h2>
              <p className="text-gray-600">This channel does not exist.</p>
            </div>
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout showBackButton={true}>
        {showCoverEditor && (
          <CoverDesignEditor
            platform="hutube"
            currentCoverData={(channel as any).cover_design_data}
            onSave={handleSaveCoverDesign}
            onClose={() => setShowCoverEditor(false)}
          />
        )}

        <div className="min-h-screen bg-gray-50">
        <div className="relative">
          {(channel as any).cover_design_data ? (
            <div className="h-48 md:h-64 relative group">
              <CoverRenderer
                designData={(channel as any).cover_design_data}
                aspectRatio={25}
              />
              {isOwnChannel && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowCoverEditor(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                    Edit Design
                  </button>
                </div>
              )}
            </div>
          ) : channel.banner_url ? (
            <div className="h-48 md:h-64 bg-gray-300 relative group">
              <img
                src={channel.banner_url}
                alt="Channel banner"
                className="w-full h-full object-cover"
              />
              {isOwnChannel && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <Camera className="w-4 h-4" />
                    Change Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowCoverEditor(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                    Design Cover
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 md:h-64 bg-gradient-to-r from-red-500 to-red-700 relative group">
              {isOwnChannel && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all">
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="flex flex-col items-center gap-2 px-6 py-4 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <Camera size={32} />
                      <span className="font-semibold">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => setShowCoverEditor(true)}
                      className="flex flex-col items-center gap-2 px-6 py-4 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
                    >
                      <Palette size={32} />
                      <span className="font-semibold">Design Cover</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 pt-6 mb-6 relative">
            <div className="absolute -top-12 md:-top-16 left-0">
              <div className="relative group">
                {channel.profile_photo_url || channel.avatar_url ? (
                  <img
                    src={channel.profile_photo_url || channel.avatar_url}
                    alt={channel.display_name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                    <User className="text-white" size={48} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 mt-16 md:mt-20">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{channel.display_name}</h1>
              <p className="text-gray-600 text-sm md:text-base">@{channel.handle}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>{channel.subscriber_count.toLocaleString()} subscribers</span>
                <span>•</span>
                <span>{channel.video_count} videos</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isOwnChannel ? (
                <>
                  <button
                    onClick={() => navigate('/hutube/profile')}
                    className="flex items-center gap-2 px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 size={18} />
                    My Profile
                  </button>
                  <button
                    onClick={() => navigate('/hutube/settings')}
                    className="flex items-center gap-2 px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={18} />
                    Settings
                  </button>
                  <button
                    onClick={() => navigate('/hutube/upload')}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors"
                  >
                    <Upload size={18} />
                    Upload Video
                  </button>
                </>
              ) : (
                <SubscribeButton
                  channelId={channel.id}
                  channelName={channel.display_name}
                  size="large"
                />
              )}
            </div>
          </div>

          <div className="border-b border-gray-300 mb-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('videos')}
                className={`pb-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'videos'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 size={18} />
                Videos
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`pb-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'about'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={18} />
                About
              </button>
            </div>
          </div>

          {activeTab === 'videos' && (
            <div>
              {videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="mx-auto text-gray-400 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No videos yet</h3>
                  <p className="text-gray-600">
                    {isOwnChannel
                      ? 'Upload your first video to get started!'
                      : 'This channel hasn\'t uploaded any videos yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10 pb-8">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      showChannel={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h2 className="text-xl font-bold mb-4">Description</h2>
                {channel.description ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{channel.description}</p>
                ) : (
                  <p className="text-gray-500 italic">No description provided.</p>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <ChannelSocialLinks
                  website={channel.social_links?.website}
                  switterHandle={channel.switter_handle}
                  hinstaUsername={channel.hinsta_username}
                  hubookUserId={channel.hubook_user_id}
                  socialLinksPrivacy={channel.social_links_privacy}
                  socialLinksVerification={channel.social_links_verification}
                />
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Stats</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subscribers</span>
                    <span className="font-semibold">{channel.subscriber_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total videos</span>
                    <span className="font-semibold">{channel.video_count}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
