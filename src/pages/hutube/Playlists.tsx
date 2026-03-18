import { useState, useEffect } from 'react';
import { List, Plus, Loader2, Lock, Globe, Link as LinkIcon, MoreVertical, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import CreatePlaylistModal from '../../components/hutube/CreatePlaylistModal';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  privacy: string;
  thumbnail_url: string | null;
  video_count: number;
  created_at: string;
  updated_at: string;
}

export default function Playlists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPlaylists();
    }
  }, [user]);

  const loadPlaylists = async () => {
    try {
      const { data: channelData, error: channelError } = await supabase
        .from('hutube_channels')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (channelError) throw channelError;

      const { data, error } = await supabase
        .from('hutube_playlists')
        .select('*')
        .eq('channel_id', channelData.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setPlaylists(data || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('hutube_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    } catch (error) {
      console.error('Error deleting playlist:', error);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private':
        return <Lock size={16} />;
      case 'unlisted':
        return <LinkIcon size={16} />;
      default:
        return <Globe size={16} />;
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <List className="text-red-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">My Playlists</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus size={20} />
              New Playlist
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : playlists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {playlists.map((playlist) => (
                <div key={playlist.id} className="relative group">
                  <Link
                    to={`/hutube/playlist/${playlist.id}`}
                    className="block cursor-pointer"
                  >
                    <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden mb-2">
                      {playlist.thumbnail_url ? (
                        <img
                          src={playlist.thumbnail_url}
                          alt={playlist.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                          <List className="text-white text-4xl opacity-50" size={48} />
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 bg-black bg-opacity-80 text-white text-sm px-2 py-1 rounded-tl">
                        {playlist.video_count} videos
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-red-600 transition-colors mb-1">
                        {playlist.title}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        {getPrivacyIcon(playlist.privacy)}
                        <span className="capitalize">{playlist.privacy}</span>
                      </div>
                      {playlist.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {playlist.description}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenMenuId(openMenuId === playlist.id ? null : playlist.id);
                      }}
                      className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === playlist.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setOpenMenuId(null);
                              setConfirmDeleteId(playlist.id);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Delete Playlist
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <List className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No playlists yet</h3>
              <p className="text-gray-600 mb-4">
                Create playlists to organize your favorite videos
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus size={20} />
                Create Your First Playlist
              </button>
            </div>
          )}
        </div>

        {showCreateModal && (
          <CreatePlaylistModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(playlist) => {
              setPlaylists(prev => [playlist, ...prev]);
              setShowCreateModal(false);
            }}
          />
        )}

        {confirmDeleteId && (
          <ConfirmationDialog
            isOpen={true}
            title="Delete Playlist"
            message="Are you sure you want to delete this playlist? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={() => handleDeletePlaylist(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
            variant="danger"
          />
        )}
      </HuTubeLayout>
    </PlatformGuard>
  );
}
