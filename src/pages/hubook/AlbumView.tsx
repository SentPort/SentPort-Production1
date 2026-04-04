import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, Image as ImageIcon, Video, Lock, Users, Globe, MoreVertical, Pencil, Trash2, Download, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHuBook } from '../../contexts/HuBookContext';
import UploadMediaModal from '../../components/hubook/UploadMediaModal';
import MediaViewer from '../../components/hubook/MediaViewer';
import EditAlbumModal from '../../components/hubook/EditAlbumModal';
import DeleteAlbumModal from '../../components/hubook/DeleteAlbumModal';

interface Album {
  id: string;
  owner_id: string;
  album_name: string;
  description: string | null;
  privacy: string;
  cover_photo_url: string | null;
  created_at: string;
}

interface Media {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  uploaded_at: string;
  is_album_cover: boolean;
  reaction_count?: number;
  top_reaction?: string;
}

export default function AlbumView() {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hubookProfile } = useHuBook();
  const [searchParams, setSearchParams] = useSearchParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null);
  const [friendship, setFriendship] = useState<any>(null);
  const [canAccess, setCanAccess] = useState(true);

  useEffect(() => {
    if (albumId) {
      fetchAlbum();
    }
  }, [albumId]);

  useEffect(() => {
    if (album) {
      checkAccess();
    }
  }, [album, friendship]);

  // Handle direct media viewing via URL parameter
  useEffect(() => {
    const mediaId = searchParams.get('mediaId');
    if (mediaId && media.length > 0) {
      const mediaIndex = media.findIndex(item => item.id === mediaId);
      if (mediaIndex !== -1) {
        setSelectedMediaIndex(mediaIndex);
        setShowMediaViewer(true);
        // Clean up URL parameter after opening viewer
        setSearchParams({});
      }
    }
  }, [media, searchParams, setSearchParams]);

  const fetchAlbum = async () => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single();

      if (error) throw error;
      setAlbum(data);

      if (data && hubookProfile && data.owner_id !== hubookProfile.id) {
        const { data: friendshipData } = await supabase
          .from('friendships')
          .select('*')
          .or(`and(requester_id.eq.${hubookProfile.id},addressee_id.eq.${data.owner_id}),and(requester_id.eq.${data.owner_id},addressee_id.eq.${hubookProfile.id})`)
          .maybeSingle();

        setFriendship(friendshipData);
      }
    } catch (error) {
      console.error('Error fetching album:', error);
      navigate('/hubook/photos');
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = () => {
    if (!album) return;

    const isOwner = user?.id === album.owner_id;
    if (isOwner) {
      setCanAccess(true);
      fetchMedia();
      return;
    }

    if (album.privacy === 'public') {
      setCanAccess(true);
      fetchMedia();
      return;
    }

    if (album.privacy === 'friends' && friendship?.status === 'accepted') {
      setCanAccess(true);
      fetchMedia();
      return;
    }

    setCanAccess(false);
  };

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('album_media')
        .select('*')
        .eq('album_id', albumId)
        .order('display_order', { ascending: true })
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const mediaWithReactions = await Promise.all(
        (data || []).map(async (item) => {
          const { data: reactions } = await supabase
            .from('album_media_reactions')
            .select('reaction_type')
            .eq('media_id', item.id);

          const reactionCount = reactions?.length || 0;
          let topReaction = '';

          if (reactions && reactions.length > 0) {
            const counts: Record<string, number> = {};
            reactions.forEach((r) => {
              counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
            });
            topReaction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          }

          return {
            ...item,
            reaction_count: reactionCount,
            top_reaction: topReaction
          };
        })
      );

      setMedia(mediaWithReactions);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      const mediaItem = media.find(m => m.id === mediaId);
      if (!mediaItem) return;

      const url = new URL(mediaItem.media_url);
      const filePath = url.pathname.split('/').slice(-3).join('/');

      await supabase.storage
        .from('hubook-albums')
        .remove([filePath]);

      const { error } = await supabase
        .from('album_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setShowMediaViewer(false);
      fetchMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  const handleDownloadAll = async () => {
    for (const item of media) {
      try {
        const response = await fetch(item.media_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${album?.album_name}-${item.id}.${item.media_type === 'video' ? 'mp4' : 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error downloading media:', error);
      }
    }
  };

  const handleSetAsAlbumCover = async (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!album) return;

    setSettingCoverId(mediaId);
    try {
      // First, clear is_album_cover from all other photos in this album
      const { error: clearError } = await supabase
        .from('album_media')
        .update({ is_album_cover: false })
        .eq('album_id', album.id)
        .neq('id', mediaId);

      if (clearError) throw clearError;

      // Then set this photo as the album cover
      const { error: setError } = await supabase
        .from('album_media')
        .update({ is_album_cover: true })
        .eq('id', mediaId);

      if (setError) throw setError;

      fetchMedia();
    } catch (error) {
      console.error('Error setting album cover:', error);
      alert('Failed to set album cover. Please try again.');
    } finally {
      setSettingCoverId(null);
    }
  };

  const getPrivacyIcon = () => {
    switch (album?.privacy) {
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'friends':
        return <Users className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getPrivacyLabel = () => {
    switch (album?.privacy) {
      case 'private':
        return 'Private';
      case 'friends':
        return 'Friends';
      default:
        return 'Public';
    }
  };

  const isOwner = user?.id === album?.owner_id;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Album not found</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">This album is private</h3>
          <p className="text-gray-600">
            {album.privacy === 'friends'
              ? 'Only friends can view this album.'
              : 'This album is not available for viewing.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => {
            if (isOwner) {
              navigate('/hubook/photos');
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          {isOwner ? 'Back to Albums' : 'Back'}
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{album.album_name}</h1>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                  {getPrivacyIcon()}
                  <span>{getPrivacyLabel()}</span>
                </div>
              </div>
              {album.description && (
                <p className="text-gray-600 mb-4">{album.description}</p>
              )}
              <p className="text-sm text-gray-500">
                {media.length} {media.length === 1 ? 'item' : 'items'} · Created {new Date(album.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              )}

              {media.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
              )}

              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            setShowEditModal(true);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Album
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            setShowDeleteModal(true);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Album
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No media yet</h3>
          <p className="text-gray-600 mb-6">Upload photos and videos to this album</p>
          {isOwner && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload Media
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item, index) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedMediaIndex(index);
                setShowMediaViewer(true);
              }}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
            >
              {item.media_type === 'video' ? (
                <div className="relative w-full h-full">
                  <video
                    src={item.media_url}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-opacity">
                    <Video className="w-12 h-12 text-white" />
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={item.media_url}
                    alt={item.caption || ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isOwner && !item.is_album_cover && (
                    <button
                      onClick={(e) => handleSetAsAlbumCover(item.id, e)}
                      disabled={settingCoverId === item.id}
                      className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Set as album cover"
                    >
                      {settingCoverId === item.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                          <span>Setting...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3 h-3" />
                          <span>Set as Cover</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              {(item.reaction_count ?? 0) > 0 && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 shadow-lg">
                  <span>
                    {item.top_reaction === 'like' && '👍'}
                    {item.top_reaction === 'love' && '❤️'}
                    {item.top_reaction === 'laugh' && '😂'}
                    {item.top_reaction === 'wow' && '😮'}
                    {item.top_reaction === 'sad' && '😢'}
                    {item.top_reaction === 'angry' && '😠'}
                    {item.top_reaction === 'care' && '🤗'}
                  </span>
                  <span>{item.reaction_count}</span>
                </div>
              )}
              {item.is_album_cover && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 shadow-lg">
                  <Check className="w-3 h-3" />
                  Cover
                </div>
              )}
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                  <p className="text-white text-sm line-clamp-2">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadMediaModal
          albumId={album.id}
          albumName={album.album_name}
          onClose={() => setShowUploadModal(false)}
          onMediaUploaded={fetchMedia}
        />
      )}

      {showEditModal && (
        <EditAlbumModal
          album={album}
          onClose={() => setShowEditModal(false)}
          onAlbumUpdated={() => {
            fetchAlbum();
            setShowEditModal(false);
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteAlbumModal
          album={{ ...album, media_count: media.length }}
          onClose={() => setShowDeleteModal(false)}
          onAlbumDeleted={() => navigate('/hubook/photos')}
        />
      )}

      {showMediaViewer && media.length > 0 && (
        <MediaViewer
          media={media}
          initialIndex={selectedMediaIndex}
          albumId={album.id}
          onClose={() => setShowMediaViewer(false)}
          onDelete={handleDeleteMedia}
          onUpdate={fetchMedia}
          canEdit={isOwner}
          canComment={canAccess}
        />
      )}
    </div>
  );
}
