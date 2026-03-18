import { useState, useEffect, useRef } from 'react';
import { Bookmark, Plus, Check, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CreatePlaylistModal from './CreatePlaylistModal';

interface SaveToPlaylistDropdownProps {
  videoId: string;
}

interface Playlist {
  id: string;
  title: string;
  privacy: string;
  video_count: number;
  hasVideo: boolean;
}

export default function SaveToPlaylistDropdown({ videoId }: SaveToPlaylistDropdownProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPlaylists = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: channelData, error: channelError } = await supabase
        .from('hutube_channels')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (channelError) throw channelError;

      // Check watch later status
      const { data: watchLaterData } = await supabase
        .from('hutube_watch_later')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      setIsWatchLater(!!watchLaterData);

      // Load playlists
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

  const handleToggleWatchLater = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('toggle_watch_later', {
        p_video_id: videoId
      });

      if (error) throw error;
      setIsWatchLater(data);
    } catch (error) {
      console.error('Error toggling watch later:', error);
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

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-900"
        >
          <Bookmark size={18} />
          <span className="font-medium">Save</span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl overflow-hidden z-50 border border-gray-200">
            <div className="py-2">
              <div className="px-4 py-2 text-sm font-semibold text-gray-600 border-b border-gray-200">
                Save to...
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Watch Later Option */}
                  <button
                    onClick={handleToggleWatchLater}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isWatchLater
                        ? 'bg-red-600 border-red-600'
                        : 'border-gray-300'
                    }`}>
                      {isWatchLater && <Check className="text-white" size={14} />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-gray-900 font-medium">Watch later</div>
                      <div className="text-xs text-gray-500">Private</div>
                    </div>
                  </button>

                  {/* User Playlists */}
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleTogglePlaylist(playlist.id, playlist.hasVideo)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        playlist.hasVideo
                          ? 'bg-red-600 border-red-600'
                          : 'border-gray-300'
                      }`}>
                        {playlist.hasVideo && <Check className="text-white" size={14} />}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-gray-900 font-medium truncate">{playlist.title}</div>
                        <div className="text-xs text-gray-500">
                          {playlist.privacy === 'private' ? 'Private' : 'Public'}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Create New Playlist */}
                  <div className="border-t border-gray-200 mt-2">
                    <button
                      onClick={() => {
                        setShowCreateModal(true);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={20} className="text-gray-900" />
                      <span className="text-gray-900 font-medium">New playlist</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
