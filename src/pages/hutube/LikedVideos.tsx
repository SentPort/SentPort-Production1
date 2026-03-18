import { useState, useEffect } from 'react';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoCard from '../../components/hutube/VideoCard';

interface VideoWithLiked {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number;
  view_count: number;
  created_at: string;
  liked_at: string;
  channel: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function LikedVideos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithLiked[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLikedVideos();
    }
  }, [user]);

  const loadLikedVideos = async () => {
    try {
      // First, get all liked video IDs and their like timestamps
      const { data: likes, error: likesError } = await supabase
        .from('platform_likes')
        .select('content_id, created_at')
        .eq('user_id', user?.id)
        .eq('platform', 'hutube')
        .eq('content_type', 'video')
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;
      if (!likes || likes.length === 0) {
        setVideos([]);
        return;
      }

      // Extract video IDs
      const videoIds = likes.map(like => like.content_id);

      // Then, get video details for those IDs
      const { data: videosData, error: videosError } = await supabase
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
        .in('id', videoIds);

      if (videosError) throw videosError;

      // Combine the data, preserving the like order
      const formattedVideos = likes
        .map((like) => {
          const video = videosData?.find((v) => v.id === like.content_id);
          if (!video) return null;
          return {
            ...video,
            liked_at: like.created_at,
            channel: Array.isArray(video.channel) ? video.channel[0] : video.channel
          };
        })
        .filter((v): v is VideoWithLiked => v !== null);

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading liked videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromLiked = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('platform_likes')
        .delete()
        .eq('user_id', user?.id)
        .eq('platform', 'hutube')
        .eq('content_type', 'video')
        .eq('content_id', videoId);

      if (error) throw error;

      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error removing from liked videos:', error);
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <ThumbsUp className="text-red-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Liked videos</h1>
          </div>

          <p className="text-gray-600 mb-6">
            Videos you've liked
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
                  onRemoveFromLiked={() => handleRemoveFromLiked(video.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ThumbsUp className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No liked videos</h3>
              <p className="text-gray-600">
                Videos you like will appear here
              </p>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
