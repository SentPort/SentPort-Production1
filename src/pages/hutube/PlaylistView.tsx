import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { List, Lock, Globe, Link as LinkIcon, CreditCard as Edit, Trash2, Loader2, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoCard from '../../components/hutube/VideoCard';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  privacy: string;
  video_count: number;
  channel: {
    id: string;
    display_name: string;
    handle: string;
    user_id: string;
  };
}

interface PlaylistVideo {
  id: string;
  position: number;
  video: {
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
  };
}

export default function PlaylistView() {
  const { playlistId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [confirmRemoveVideoId, setConfirmRemoveVideoId] = useState<string | null>(null);
  const [confirmDeletePlaylist, setConfirmDeletePlaylist] = useState(false);

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    try {
      const { data: playlistData, error: playlistError } = await supabase
        .from('hutube_playlists')
        .select(`
          *,
          channel:hutube_channels(id, display_name, handle, user_id)
        `)
        .eq('id', playlistId)
        .single();

      if (playlistError) throw playlistError;

      const channelData = Array.isArray(playlistData.channel) ? playlistData.channel[0] : playlistData.channel;
      setPlaylist({ ...playlistData, channel: channelData });
      setIsOwner(user?.id === channelData.user_id);

      const { data: videosData, error: videosError } = await supabase
        .from('hutube_playlist_videos')
        .select(`
          id,
          position,
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
        .eq('playlist_id', playlistId)
        .order('position');

      if (videosError) throw videosError;

      const formattedVideos = videosData.map((item: any) => ({
        ...item,
        video: {
          ...item.video,
          channel: Array.isArray(item.video.channel) ? item.video.channel[0] : item.video.channel
        }
      })).filter((item: any) => item.video.id);

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVideo = async (playlistVideoId: string) => {
    try {
      const { error } = await supabase
        .from('hutube_playlist_videos')
        .delete()
        .eq('id', playlistVideoId);

      if (error) throw error;

      setVideos(prev => prev.filter(v => v.id !== playlistVideoId));
      if (playlist) {
        setPlaylist({ ...playlist, video_count: playlist.video_count - 1 });
      }
    } catch (error) {
      console.error('Error removing video:', error);
      alert('Failed to remove video from playlist');
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      const { error } = await supabase
        .from('hutube_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      navigate('/hutube/playlists');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('Failed to delete playlist');
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private':
        return <Lock size={20} />;
      case 'unlisted':
        return <LinkIcon size={20} />;
      default:
        return <Globe size={20} />;
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout>
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  if (!playlist) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Playlist not found</h2>
              <p className="text-gray-600">This playlist may be private or doesn't exist.</p>
            </div>
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="bg-gradient-to-r from-red-500 to-red-700 rounded-lg p-6 mb-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <List size={24} />
                  <span className="text-sm font-medium">Playlist</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{playlist.title}</h1>
                {playlist.description && (
                  <p className="text-red-100 mb-4">{playlist.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <Link to={`/hutube/channel/${playlist.channel.handle}`} className="hover:underline">
                    {playlist.channel.display_name}
                  </Link>
                  <span>•</span>
                  <span>{playlist.video_count} videos</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    {getPrivacyIcon(playlist.privacy)}
                    <span className="capitalize">{playlist.privacy}</span>
                  </div>
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDeletePlaylist(true)}
                    className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
            {videos.length > 0 && (
              <Link
                to={`/hutube/watch/${videos[0].video.id}`}
                className="inline-flex items-center gap-2 mt-4 px-6 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <Play size={20} />
                Play All
              </Link>
            )}
          </div>

          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10">
              {videos.map((item, index) => (
                <div key={item.id} className="relative">
                  <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded pointer-events-none">
                    {index + 1}
                  </div>
                  <VideoCard
                    video={item.video}
                    showMenu={true}
                    onRemoveFromPlaylist={isOwner ? () => setConfirmRemoveVideoId(item.id) : undefined}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <List className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No videos in this playlist</h3>
              <p className="text-gray-600">
                {isOwner ? 'Add videos to this playlist from any video page' : 'This playlist is empty'}
              </p>
            </div>
          )}
        </div>

        {confirmRemoveVideoId && (
          <ConfirmationDialog
            isOpen={true}
            title="Remove video from playlist"
            message="Are you sure you want to remove this video from the playlist?"
            confirmText="Remove"
            cancelText="Cancel"
            onConfirm={() => {
              handleRemoveVideo(confirmRemoveVideoId);
              setConfirmRemoveVideoId(null);
            }}
            onCancel={() => setConfirmRemoveVideoId(null)}
            variant="danger"
          />
        )}

        {confirmDeletePlaylist && (
          <ConfirmationDialog
            isOpen={true}
            title="Delete playlist"
            message="Are you sure you want to delete this playlist? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={() => {
              handleDeletePlaylist();
              setConfirmDeletePlaylist(false);
            }}
            onCancel={() => setConfirmDeletePlaylist(false)}
            variant="danger"
          />
        )}
      </HuTubeLayout>
    </PlatformGuard>
  );
}
