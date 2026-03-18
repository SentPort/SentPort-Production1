import { useState, useEffect } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CreatePlaylistModal from './CreatePlaylistModal';

interface AddToPlaylistModalProps {
  videoId: string;
  onClose: () => void;
}

interface Playlist {
  id: string;
  title: string;
  privacy: string;
  video_count: number;
  hasVideo: boolean;
}

export default function AddToPlaylistModal({ videoId, onClose }: AddToPlaylistModalProps) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const { data: channelData, error: channelError } = await supabase
        .from('hutube_channels')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (channelError) throw channelError;

      const { data: playlistsData, error: playlistsError } = await supabase
        .from('hutube_playlists')
        .select('id, title, privacy, video_count')
        .eq('channel_id', channelData.id)
        .order('created_at', { ascending: false });

      if (playlistsError) throw playlistsError;

      const playlistsWithStatus = await Promise.all(
        playlistsData.map(async (playlist) => {
          const { data } = await supabase
            .from('hutube_playlist_videos')
            .select('id')
            .eq('playlist_id', playlist.id)
            .eq('video_id', videoId)
            .maybeSingle();

          return {
            ...playlist,
            hasVideo: !!data
          };
        })
      );

      setPlaylists(playlistsWithStatus);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlaylist = async (playlistId: string, hasVideo: boolean) => {
    try {
      if (hasVideo) {
        await supabase.rpc('remove_from_playlist', {
          p_playlist_id: playlistId,
          p_video_id: videoId
        });
      } else {
        await supabase.rpc('add_to_playlist', {
          p_playlist_id: playlistId,
          p_video_id: videoId
        });
      }

      setPlaylists(prev =>
        prev.map(p =>
          p.id === playlistId
            ? { ...p, hasVideo: !hasVideo, video_count: hasVideo ? p.video_count - 1 : p.video_count + 1 }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling playlist:', error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-2xl font-bold">Save to Playlist</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                    <Plus className="text-red-600" size={20} />
                  </div>
                  <span className="font-medium">Create new playlist</span>
                </button>

                {playlists.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">
                    You don't have any playlists yet
                  </p>
                ) : (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleTogglePlaylist(playlist.id, playlist.hasVideo)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors text-left"
                    >
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        playlist.hasVideo
                          ? 'bg-red-600 border-red-600'
                          : 'border-gray-300'
                      }`}>
                        {playlist.hasVideo && <Check className="text-white" size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{playlist.title}</div>
                        <div className="text-sm text-gray-600">
                          {playlist.privacy === 'private' ? 'Private' : 'Public'} • {playlist.video_count} videos
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreatePlaylistModal
          videoIdToAdd={videoId}
          onClose={() => setShowCreateModal(false)}
          onCreate={(playlist) => {
            setPlaylists(prev => [{
              id: playlist.id,
              title: playlist.title,
              privacy: playlist.privacy,
              video_count: 1,
              hasVideo: true
            }, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}
    </>
  );
}
