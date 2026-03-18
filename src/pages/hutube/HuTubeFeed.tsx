import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoCard from '../../components/hutube/VideoCard';
import HowWeRecommendModal from '../../components/hutube/HowWeRecommendModal';
import JuryPoolVolunteerButton from '../../components/shared/JuryPoolVolunteerButton';

interface VideoData {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  view_count: number;
  created_at: string;
  channel: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string;
  };
  is_pinned?: boolean;
}

export default function HuTubeFeed() {
  const location = useLocation();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);

  useEffect(() => {
    loadVideos();
    if (location.state?.justJoined) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [user]);

  const loadVideos = async () => {
    try {
      const { data: videosData, error } = await supabase
        .from('hutube_videos')
        .select(`
          id,
          title,
          thumbnail_url,
          duration,
          view_count,
          created_at,
          is_pinned,
          channel:hutube_channels(id, display_name, handle, avatar_url)
        `)
        .eq('status', 'active')
        .eq('privacy', 'public')
        .eq('is_draft', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedVideos = videosData?.map((v: any) => ({
        ...v,
        channel: Array.isArray(v.channel) ? v.channel[0] : v.channel
      })).filter((v: any) => v.channel) || [];

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        {showRecommendModal && (
          <HowWeRecommendModal onClose={() => setShowRecommendModal(false)} />
        )}
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          {showWelcome && (
            <div className="mb-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Welcome to HuTube!</h2>
              <p className="text-red-100">
                Start uploading videos and sharing your content with the verified human community.
              </p>
            </div>
          )}

          <div className="mb-6">
            <JuryPoolVolunteerButton variant="compact" requireVerified={false} />
          </div>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Recommended</h1>
            <button
              onClick={() => setShowRecommendModal(true)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              <Info size={16} />
              How we recommend videos
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10">
              {videos.map((video) => (
                <div key={video.id} className="relative">
                  {video.is_pinned && (
                    <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <span>Pinned</span>
                    </div>
                  )}
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-4xl font-bold">HT</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No videos yet</h3>
              <p className="text-gray-600 mb-4">
                Be the first to upload content to HuTube
              </p>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
