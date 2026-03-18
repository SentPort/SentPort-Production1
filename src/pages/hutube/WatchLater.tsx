import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoCard from '../../components/hutube/VideoCard';

interface VideoWithSaved {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number;
  view_count: number;
  created_at: string;
  added_at: string;
  channel: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function WatchLater() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithSaved[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWatchLater();
    }
  }, [user]);

  const loadWatchLater = async () => {
    try {
      const { data, error } = await supabase
        .from('hutube_watch_later')
        .select(`
          added_at,
          video:hutube_videos(
            id,
            title,
            thumbnail_url,
            duration,
            view_count,
            created_at,
            channel:hutube_channels(id, display_name, handle, avatar_url)
          )
        `)
        .eq('user_id', user?.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      const formattedVideos = data?.map((item: any) => ({
        ...item.video,
        added_at: item.added_at,
        channel: Array.isArray(item.video.channel) ? item.video.channel[0] : item.video.channel
      })).filter((v: any) => v.id) || [];

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading watch later:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchLater = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('hutube_watch_later')
        .delete()
        .eq('user_id', user?.id)
        .eq('video_id', videoId);

      if (error) throw error;

      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error removing from watch later:', error);
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-red-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Watch Later</h1>
          </div>

          <p className="text-gray-600 mb-6">
            Videos you saved to watch later
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  showMenu={true}
                  onRemoveFromWatchLater={() => handleRemoveFromWatchLater(video.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No videos saved</h3>
              <p className="text-gray-600">
                Save videos to watch them later
              </p>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
