import { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
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
  channel: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function Subscriptions() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscriptionVideos();
    }
  }, [user]);

  const loadSubscriptionVideos = async () => {
    try {
      const { data: subscriptions } = await supabase
        .from('hutube_subscriptions')
        .select('channel_id')
        .eq('user_id', user?.id);

      if (!subscriptions || subscriptions.length === 0) {
        setLoading(false);
        return;
      }

      const channelIds = subscriptions.map(s => s.channel_id);

      const { data: videosData, error } = await supabase
        .from('hutube_videos')
        .select(`
          id,
          title,
          thumbnail_url,
          duration,
          view_count,
          created_at,
          channel:hutube_channels(id, display_name, handle, avatar_url)
        `)
        .in('channel_id', channelIds)
        .eq('privacy', 'public')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedVideos = videosData?.map((v: any) => ({
        ...v,
        channel: Array.isArray(v.channel) ? v.channel[0] : v.channel
      })) || [];

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading subscription videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-red-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
          </div>

          <p className="text-gray-600 mb-6">
            Latest videos from channels you subscribe to
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
              <Bell className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No subscription videos</h3>
              <p className="text-gray-600">
                Subscribe to channels to see their latest uploads here
              </p>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
