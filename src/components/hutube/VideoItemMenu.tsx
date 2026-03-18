import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Share2, Bookmark, X, Plus, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CreatePlaylistModal from './CreatePlaylistModal';
import { useHuTubeNotification } from '../../contexts/HuTubeNotificationContext';

interface VideoItemMenuProps {
  videoId: string;
  videoTitle: string;
  onShare?: () => void;
  onRemoveFromLiked?: () => void;
  showRemoveFromLiked?: boolean;
  onRemoveFromWatchLater?: () => void;
  showRemoveFromWatchLater?: boolean;
  onRemoveFromPlaylist?: () => void;
  showRemoveFromPlaylist?: boolean;
}

interface Playlist {
  id: string;
  title: string;
  privacy: string;
  video_count: number;
  hasVideo: boolean;
}

export default function VideoItemMenu({
  videoId,
  videoTitle,
  onShare,
  onRemoveFromLiked,
  showRemoveFromLiked = false,
  onRemoveFromWatchLater,
  showRemoveFromWatchLater = false,
  onRemoveFromPlaylist,
  showRemoveFromPlaylist = false
}: VideoItemMenuProps) {
  const { user } = useAuth();
  const { showSuccess } = useHuTubeNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSaveDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showSaveDropdown && user) {
      loadPlaylists();
    }
  }, [showSaveDropdown, user]);

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

  const handleShareClick = () => {
    if (onShare) {
      onShare();
    } else {
      const url = `${window.location.origin}/hutube/watch/${videoId}`;
      navigator.clipboard.writeText(url);
      showSuccess('Link copied to clipboard!');
    }
    setIsOpen(false);
  };

  const handleRemoveFromLikedClick = () => {
    if (onRemoveFromLiked) {
      onRemoveFromLiked();
    }
    setIsOpen(false);
  };

  const handleRemoveFromWatchLaterClick = () => {
    if (onRemoveFromWatchLater) {
      onRemoveFromWatchLater();
    }
    setIsOpen(false);
  };

  const handleRemoveFromPlaylistClick = () => {
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist();
    }
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-2 rounded-full bg-black bg-opacity-70 hover:bg-opacity-90 text-white transition-all opacity-0 group-hover:opacity-100"
          aria-label="More options"
        >
          <MoreVertical size={18} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-2xl overflow-hidden z-50 border border-gray-200">
            <div className="py-1">
              {showSaveDropdown ? (
                <div>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Save to playlist</span>
                    <button
                      onClick={() => setShowSaveDropdown(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
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

                      {playlists.length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-500 text-sm">
                          No playlists yet
                        </div>
                      )}

                      {/* Create New Playlist */}
                      <div className="border-t border-gray-200">
                        <button
                          onClick={() => {
                            setShowCreateModal(true);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
                        >
                          <Plus size={20} className="text-gray-900" />
                          <span className="text-gray-900 font-medium">Create new playlist</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={handleShareClick}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                  >
                    <Share2 size={18} className="text-gray-700" />
                    <span className="text-gray-900 font-medium">Share</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSaveDropdown(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                  >
                    <Bookmark size={18} className="text-gray-700" />
                    <span className="text-gray-900 font-medium">Save to playlist</span>
                  </button>

                  {(showRemoveFromLiked || showRemoveFromWatchLater || showRemoveFromPlaylist) && (
                    <div className="border-t border-gray-200 my-1"></div>
                  )}

                  {showRemoveFromLiked && (
                    <button
                      onClick={handleRemoveFromLikedClick}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                    >
                      <X size={18} className="text-gray-700" />
                      <span className="text-gray-900 font-medium">Remove from Liked videos</span>
                    </button>
                  )}

                  {showRemoveFromWatchLater && (
                    <button
                      onClick={handleRemoveFromWatchLaterClick}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                    >
                      <X size={18} className="text-gray-700" />
                      <span className="text-gray-900 font-medium">Remove from Watch later</span>
                    </button>
                  )}

                  {showRemoveFromPlaylist && (
                    <button
                      onClick={handleRemoveFromPlaylistClick}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                    >
                      <X size={18} className="text-gray-700" />
                      <span className="text-gray-900 font-medium">Remove from playlist</span>
                    </button>
                  )}
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
