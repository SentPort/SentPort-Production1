import { useState, useEffect } from 'react';
import { History as HistoryIcon, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoCard from '../../components/hutube/VideoCard';

interface VideoWithHistory {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number;
  view_count: number;
  created_at: string;
  viewed_at: string;
  channel: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function History() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('hutube_video_views')
        .select(`
          viewed_at,
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
        .order('viewed_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedVideos = data?.map((item: any) => ({
        ...item.video,
        viewed_at: item.viewed_at,
        channel: Array.isArray(item.video.channel) ? item.video.channel[0] : item.video.channel
      })).filter((v: any) => v.id) || [];

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear your watch history?')) return;

    try {
      const { error } = await supabase
        .from('hutube_video_views')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      setVideos([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <HistoryIcon className="text-red-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">Watch History</h1>
            </div>
            {videos.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
                Clear History
              </button>
            )}
          </div>

          <p className="text-gray-600 mb-6">
            Videos you've watched, newest first
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10">
              {videos.map((video) => (
                <VideoCard key={`${video.id}-${video.viewed_at}`} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HistoryIcon className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No watch history</h3>
              <p className="text-gray-600">
                Videos you watch will appear here
              </p>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
