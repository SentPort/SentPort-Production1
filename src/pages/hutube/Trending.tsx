import { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoCard from '../../components/hutube/VideoCard';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number;
  view_count: number;
  created_at: string;
  channel_name: string;
  channel_avatar: string | null;
  channel_id: string;
  recent_views: number;
}

export default function Trending() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingVideos();
  }, []);

  const loadTrendingVideos = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trending_videos', {
        p_limit: 50
      });

      if (error) throw error;

      const formattedVideos = data.map((v: any) => ({
        ...v,
        channel: {
          id: v.channel_id,
          display_name: v.channel_name,
          handle: v.channel_name.toLowerCase().replace(/\s+/g, ''),
          avatar_url: v.channel_avatar
        }
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading trending videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-red-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Trending Videos</h1>
          </div>

          <p className="text-gray-600 mb-6">
            Most popular videos from the last 7 days
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No trending videos yet</h3>
              <p className="text-gray-600">
                Check back soon for popular content
              </p>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
