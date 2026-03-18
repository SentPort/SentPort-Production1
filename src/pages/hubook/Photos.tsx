import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AlbumCard from '../../components/hubook/AlbumCard';
import CreateAlbumModal from '../../components/hubook/CreateAlbumModal';
import EditAlbumModal from '../../components/hubook/EditAlbumModal';
import DeleteAlbumModal from '../../components/hubook/DeleteAlbumModal';

interface Album {
  id: string;
  album_name: string;
  description: string | null;
  privacy: string;
  cover_photo_url: string | null;
  created_at: string;
  media_count?: number;
}

export default function Photos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (albumsError) throw albumsError;

      const albumsWithCounts = await Promise.all(
        (albumsData || []).map(async (album) => {
          const { count } = await supabase
            .from('album_media')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', album.id);

          // Try to get the marked cover photo first
          const { data: coverMedia } = await supabase
            .from('album_media')
            .select('media_url')
            .eq('album_id', album.id)
            .eq('is_album_cover', true)
            .eq('media_type', 'image')
            .maybeSingle();

          // Fallback to first photo if no cover is set
          let coverUrl = coverMedia?.media_url || album.cover_photo_url;

          if (!coverUrl) {
            const { data: firstMedia } = await supabase
              .from('album_media')
              .select('media_url')
              .eq('album_id', album.id)
              .eq('media_type', 'image')
              .order('uploaded_at', { ascending: true })
              .limit(1)
              .maybeSingle();

            coverUrl = firstMedia?.media_url || null;
          }

          return {
            ...album,
            media_count: count || 0,
            cover_photo_url: coverUrl
          };
        })
      );

      setAlbums(albumsWithCounts);
    } catch (error) {
      console.error('Error fetching albums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlbumClick = (albumId: string) => {
    navigate(`/hubook/albums/${albumId}`);
  };

  const handleEditAlbum = (album: Album) => {
    setSelectedAlbum(album);
    setShowEditModal(true);
  };

  const handleDeleteAlbum = (album: Album) => {
    setSelectedAlbum(album);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Photos & Albums</h1>
          <p className="text-gray-600 mt-1">
            Upload and organize your photos and videos in beautiful albums
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Create Album
        </button>
      </div>

      {albums.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No albums yet</h2>
          <p className="text-gray-600 mb-6">Create your first album to start organizing your photos and videos</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Album
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onClick={() => handleAlbumClick(album.id)}
              onEdit={() => handleEditAlbum(album)}
              onDelete={() => handleDeleteAlbum(album)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateAlbumModal
          onClose={() => setShowCreateModal(false)}
          onAlbumCreated={() => {
            fetchAlbums();
            setShowCreateModal(false);
          }}
        />
      )}

      {showEditModal && selectedAlbum && (
        <EditAlbumModal
          album={selectedAlbum}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAlbum(null);
          }}
          onAlbumUpdated={() => {
            fetchAlbums();
            setShowEditModal(false);
            setSelectedAlbum(null);
          }}
        />
      )}

      {showDeleteModal && selectedAlbum && (
        <DeleteAlbumModal
          album={selectedAlbum}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedAlbum(null);
          }}
          onAlbumDeleted={() => {
            fetchAlbums();
            setShowDeleteModal(false);
            setSelectedAlbum(null);
          }}
        />
      )}
    </div>
  );
}
